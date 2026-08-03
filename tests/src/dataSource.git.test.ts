import * as cp from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn()
    }))
  }
}));

vi.mock("../../src/config", () => ({
  getConfig: vi.fn(() => ({
    gitPath: () => ["git"],
    dateType: () => "Author Date",
    showUncommittedChanges: () => false
  }))
}));

import { DataSource } from "../../src/dataSource";

const MAIN_BRANCH = "main";
const FEATURE_BRANCH = "feature/x";

/**
 * Run git without a shell so that every argument stays a single token, and
 * return the trimmed stdout for direct comparison against expected values.
 */
function git(cwd: string, args: string[]): string {
  return cp.execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function listRefs(gitDir: string): string {
  return git(gitDir, ["for-each-ref", "--format=%(refname) %(objectname)"]);
}

interface GitFixture {
  root: string;
  repo: string;
  originBare: string;
  upstreamBare: string;
}

async function createFixture(): Promise<GitFixture> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "git-keizu-047-"));
  const repo = path.join(root, "repo");
  const originBare = path.join(root, "origin.git");
  const upstreamBare = path.join(root, "upstream.git");

  await fs.mkdir(repo);
  git(root, ["init", "--bare", "-b", MAIN_BRANCH, originBare]);
  git(root, ["init", "--bare", "-b", MAIN_BRANCH, upstreamBare]);
  git(repo, ["init", "-b", MAIN_BRANCH, "."]);
  git(repo, ["config", "user.email", "test@example.com"]);
  git(repo, ["config", "user.name", "Test User"]);
  git(repo, ["config", "commit.gpgsign", "false"]);
  git(repo, ["remote", "add", "origin", originBare]);
  git(repo, ["remote", "add", "upstream", upstreamBare]);
  git(repo, ["commit", "--allow-empty", "-m", "c1"]);

  return { root, repo, originBare, upstreamBare };
}

// S41 / S43 の repository state case（実 Git integration）
// @see docs/testing/perspectives/src/dataSource-test/02-branch-worktree-02.md
describe("checkoutBranch against a real repository", () => {
  let fixture: GitFixture;
  let ds: DataSource;

  beforeEach(async () => {
    fixture = await createFixture();
    ds = new DataSource();
  });

  afterEach(async () => {
    await fs.rm(fixture.root, { recursive: true, force: true });
  });

  it("leaves an existing branch and the worktree untouched (TC-240)", async () => {
    // Case: TC-240
    // Given: feature/x points at the first commit while origin/feature/x points at a later one
    const { repo } = fixture;
    git(repo, ["branch", FEATURE_BRANCH]);
    git(repo, ["commit", "--allow-empty", "-m", "c2"]);
    git(repo, ["push", "origin", `${MAIN_BRANCH}:${FEATURE_BRANCH}`]);
    git(repo, ["fetch", "origin"]);
    const branchHashBefore = git(repo, ["rev-parse", `refs/heads/${FEATURE_BRANCH}`]);
    const remoteHash = git(repo, ["rev-parse", `refs/remotes/origin/${FEATURE_BRANCH}`]);
    const currentBranchBefore = git(repo, ["branch", "--show-current"]);
    const worktreeBefore = git(repo, ["status", "--porcelain"]);
    expect(branchHashBefore).not.toBe(remoteHash);

    // When: the remote branch is checked out under the existing local name
    const result = await ds.checkoutBranch(repo, FEATURE_BRANCH, `origin/${FEATURE_BRANCH}`);

    // Then: the operation is refused and the repository state is unchanged
    expect(result).toEqual({ kind: "branchExists" });
    expect(git(repo, ["rev-parse", `refs/heads/${FEATURE_BRANCH}`])).toBe(branchHashBefore);
    expect(git(repo, ["branch", "--show-current"])).toBe(currentBranchBefore);
    expect(git(repo, ["status", "--porcelain"])).toBe(worktreeBefore);
  });

  it("creates a tracking branch for an unused name (TC-241)", async () => {
    // Case: TC-241
    // Given: origin/feature/new exists and no local branch of that name does
    const { repo } = fixture;
    const newBranch = "feature/new";
    git(repo, ["push", "origin", `${MAIN_BRANCH}:${newBranch}`]);
    git(repo, ["fetch", "origin"]);

    // When: the remote branch is checked out
    const result = await ds.checkoutBranch(repo, newBranch, `origin/${newBranch}`);

    // Then: the branch is created, checked out and tracks the remote branch
    expect(result).toEqual({ kind: "completed", status: null });
    expect(git(repo, ["branch", "--show-current"])).toBe(newBranch);
    expect(git(repo, ["config", `branch.${newBranch}.remote`])).toBe("origin");
    expect(git(repo, ["config", `branch.${newBranch}.merge`])).toBe(`refs/heads/${newBranch}`);
  });

  it("keeps the upstream configuration of the existing branch (TC-242)", async () => {
    // Case: TC-242
    // Given: the existing feature/x already tracks upstream/feature/x
    const { repo } = fixture;
    git(repo, ["branch", FEATURE_BRANCH]);
    git(repo, ["config", `branch.${FEATURE_BRANCH}.remote`, "upstream"]);
    git(repo, ["config", `branch.${FEATURE_BRANCH}.merge`, `refs/heads/${FEATURE_BRANCH}`]);
    git(repo, ["commit", "--allow-empty", "-m", "c2"]);
    git(repo, ["push", "origin", `${MAIN_BRANCH}:${FEATURE_BRANCH}`]);
    git(repo, ["fetch", "origin"]);

    // When: the same-named remote branch is checked out
    const result = await ds.checkoutBranch(repo, FEATURE_BRANCH, `origin/${FEATURE_BRANCH}`);

    // Then: the upstream of the existing branch is not repointed at origin
    expect(result).toEqual({ kind: "branchExists" });
    expect(git(repo, ["config", `branch.${FEATURE_BRANCH}.remote`])).toBe("upstream");
    expect(git(repo, ["config", `branch.${FEATURE_BRANCH}.merge`])).toBe(
      `refs/heads/${FEATURE_BRANCH}`
    );
  });
});

describe("push against a real repository", () => {
  let fixture: GitFixture;
  let ds: DataSource;

  beforeEach(async () => {
    fixture = await createFixture();
    ds = new DataSource();
  });

  afterEach(async () => {
    await fs.rm(fixture.root, { recursive: true, force: true });
  });

  it("pushes only to the non-origin upstream remote (TC-261)", async () => {
    // Case: TC-261
    // Given: main tracks the upstream remote while origin is registered but untouched
    const { repo, originBare, upstreamBare } = fixture;
    git(repo, ["config", `branch.${MAIN_BRANCH}.remote`, "upstream"]);
    git(repo, ["config", `branch.${MAIN_BRANCH}.merge`, `refs/heads/${MAIN_BRANCH}`]);
    const originRefsBefore = listRefs(originBare);

    // When: the resolved upstream target is pushed
    const status = await ds.pushToUpstream(repo, {
      remoteName: "upstream",
      branchName: MAIN_BRANCH
    });

    // Then: only the upstream repository receives the branch
    expect(status).toBeNull();
    expect(git(upstreamBare, ["rev-parse", `refs/heads/${MAIN_BRANCH}`])).toBe(
      git(repo, ["rev-parse", "HEAD"])
    );
    expect(listRefs(originBare)).toBe(originRefsBefore);
  });

  it("registers the upstream of a branch that had none (TC-262)", async () => {
    // Case: TC-262
    // Given: a branch without any upstream configuration
    const { repo } = fixture;
    const soloBranch = "solo";
    git(repo, ["checkout", "-b", soloBranch]);

    // When: the branch is pushed to the explicitly selected remote
    const status = await ds.pushWithUpstream(repo, "upstream");

    // Then: the upstream is recorded for that branch
    expect(status).toBeNull();
    expect(git(repo, ["config", `branch.${soloBranch}.remote`])).toBe("upstream");
    expect(git(repo, ["config", `branch.${soloBranch}.merge`])).toBe(`refs/heads/${soloBranch}`);
  });
});
