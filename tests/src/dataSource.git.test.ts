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
const DIFFERENT_BRANCH = "develop";

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

// S46 repository state cases (real Git integration)
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

  it("creates a tracking branch for an unused local name (TC-275)", async () => {
    // Case: TC-275
    // Given: origin/feature/new exists and no local branch of that name does
    const { repo } = fixture;
    const newBranch = "feature/new";
    git(repo, ["push", "origin", `${MAIN_BRANCH}:${newBranch}`]);
    git(repo, ["fetch", "origin"]);

    // When: the unused remote branch is checked out
    const result = await ds.checkoutBranch(repo, newBranch, {
      remoteName: "origin",
      branchName: newBranch
    });

    // Then: checkout creates the local branch with the expected tracking configuration
    expect(result).toEqual({ kind: "completed", status: null });
    expect(git(repo, ["branch", "--show-current"])).toBe(newBranch);
    expect(git(repo, ["config", `branch.${newBranch}.remote`])).toBe("origin");
    expect(git(repo, ["config", `branch.${newBranch}.merge`])).toBe(`refs/heads/${newBranch}`);
  });

  it("pulls the selected remote while preserving an existing upstream (TC-283)", async () => {
    // Case: TC-283
    // Given: local main tracks upstream/main while origin/main is one commit ahead
    const { repo } = fixture;
    git(repo, ["push", "origin", MAIN_BRANCH]);
    git(repo, ["push", "upstream", MAIN_BRANCH]);
    const baseHash = git(repo, ["rev-parse", MAIN_BRANCH]);
    git(repo, ["commit", "--allow-empty", "-m", "origin c2"]);
    git(repo, ["push", "origin", MAIN_BRANCH]);
    git(repo, ["reset", "--hard", baseHash]);
    git(repo, ["fetch", "origin"]);
    git(repo, ["config", `branch.${MAIN_BRANCH}.remote`, "upstream"]);
    git(repo, ["config", `branch.${MAIN_BRANCH}.merge`, `refs/heads/${MAIN_BRANCH}`]);
    const remoteBefore = git(repo, ["config", `branch.${MAIN_BRANCH}.remote`]);
    const mergeBefore = git(repo, ["config", `branch.${MAIN_BRANCH}.merge`]);

    // When: the selected origin/main target is checked out and pulled
    const result = await ds.checkoutBranch(repo, MAIN_BRANCH, {
      remoteName: "origin",
      branchName: MAIN_BRANCH
    });

    // Then: origin/main is integrated without changing the configured upstream
    expect(result).toEqual({ kind: "completed", status: null });
    expect(git(repo, ["rev-parse", MAIN_BRANCH])).toBe(
      git(repo, ["rev-parse", `refs/remotes/origin/${MAIN_BRANCH}`])
    );
    expect(git(repo, ["config", `branch.${MAIN_BRANCH}.remote`])).toBe(remoteBefore);
    expect(git(repo, ["config", `branch.${MAIN_BRANCH}.merge`])).toBe(mergeBefore);
  });

  it("fast-forwards a matching local branch to origin/main (TC-284)", async () => {
    // Case: TC-284
    // Given: local main is one commit behind origin/main and can fast-forward
    const { repo } = fixture;
    git(repo, ["push", "origin", MAIN_BRANCH]);
    const baseHash = git(repo, ["rev-parse", MAIN_BRANCH]);
    git(repo, ["commit", "--allow-empty", "-m", "origin c2"]);
    git(repo, ["push", "origin", MAIN_BRANCH]);
    git(repo, ["reset", "--hard", baseHash]);
    git(repo, ["fetch", "origin"]);

    // When: matching origin/main is checked out and pulled
    const result = await ds.checkoutBranch(repo, MAIN_BRANCH, {
      remoteName: "origin",
      branchName: MAIN_BRANCH
    });

    // Then: the local and remote hashes match, main is current, and the worktree is clean
    expect(result).toEqual({ kind: "completed", status: null });
    expect(git(repo, ["rev-parse", MAIN_BRANCH])).toBe(
      git(repo, ["rev-parse", `refs/remotes/origin/${MAIN_BRANCH}`])
    );
    expect(git(repo, ["branch", "--show-current"])).toBe(MAIN_BRANCH);
    expect(git(repo, ["status", "--porcelain"])).toBe("");
  });

  it("keeps diverged local state after ff-only pull rejection (TC-285)", async () => {
    // Case: TC-285
    // Given: local and origin/main diverge and pull.ff is configured to only
    const { root, repo, originBare } = fixture;
    git(repo, ["push", "origin", MAIN_BRANCH]);
    git(repo, ["commit", "--allow-empty", "-m", "local c2"]);
    const localHashBefore = git(repo, ["rev-parse", MAIN_BRANCH]);
    const remoteWork = path.join(root, "remote-work");
    git(root, ["clone", originBare, remoteWork]);
    git(remoteWork, ["config", "user.email", "remote@example.com"]);
    git(remoteWork, ["config", "user.name", "Remote User"]);
    git(remoteWork, ["commit", "--allow-empty", "-m", "remote c2"]);
    git(remoteWork, ["push", "origin", MAIN_BRANCH]);
    git(repo, ["fetch", "origin"]);
    git(repo, ["config", "pull.ff", "only"]);
    const worktreeBefore = git(repo, ["status", "--porcelain"]);

    // When: matching origin/main is checked out and the diverged pull is attempted
    const result = await ds.checkoutBranch(repo, MAIN_BRANCH, {
      remoteName: "origin",
      branchName: MAIN_BRANCH
    });

    // Then: pull fails without changing the current branch, local hash, or worktree
    expect(result.kind).toBe("pullFailed");
    if (result.kind === "pullFailed") expect(result.status.length).toBeGreaterThan(0);
    expect(git(repo, ["branch", "--show-current"])).toBe(MAIN_BRANCH);
    expect(git(repo, ["rev-parse", MAIN_BRANCH])).toBe(localHashBefore);
    expect(git(repo, ["status", "--porcelain"])).toBe(worktreeBefore);
  });

  it("refuses a differently named existing branch without repository changes (TC-286)", async () => {
    // Case: TC-286
    // Given: develop exists and tracks upstream/main while origin/main is also present
    const { repo } = fixture;
    git(repo, ["push", "origin", MAIN_BRANCH]);
    git(repo, ["branch", DIFFERENT_BRANCH]);
    git(repo, ["config", `branch.${DIFFERENT_BRANCH}.remote`, "upstream"]);
    git(repo, ["config", `branch.${DIFFERENT_BRANCH}.merge`, `refs/heads/${MAIN_BRANCH}`]);
    const mainHashBefore = git(repo, ["rev-parse", MAIN_BRANCH]);
    const differentHashBefore = git(repo, ["rev-parse", DIFFERENT_BRANCH]);
    const currentBefore = git(repo, ["branch", "--show-current"]);
    const remoteBefore = git(repo, ["config", `branch.${DIFFERENT_BRANCH}.remote`]);
    const mergeBefore = git(repo, ["config", `branch.${DIFFERENT_BRANCH}.merge`]);
    const worktreeBefore = git(repo, ["status", "--porcelain"]);

    // When: origin/main is requested using the differently named local feature/x branch
    const result = await ds.checkoutBranch(repo, DIFFERENT_BRANCH, {
      remoteName: "origin",
      branchName: MAIN_BRANCH
    });

    // Then: the request is refused and refs, upstream, current branch, and worktree are unchanged
    expect(result).toEqual({ kind: "branchExists" });
    expect(git(repo, ["rev-parse", MAIN_BRANCH])).toBe(mainHashBefore);
    expect(git(repo, ["rev-parse", DIFFERENT_BRANCH])).toBe(differentHashBefore);
    expect(git(repo, ["branch", "--show-current"])).toBe(currentBefore);
    expect(git(repo, ["config", `branch.${DIFFERENT_BRANCH}.remote`])).toBe(remoteBefore);
    expect(git(repo, ["config", `branch.${DIFFERENT_BRANCH}.merge`])).toBe(mergeBefore);
    expect(git(repo, ["status", "--porcelain"])).toBe(worktreeBefore);
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

  it("pushes the current local branch to a differently named non-origin upstream (TC-261)", async () => {
    // Case: TC-261
    // Given: feature/local tracks upstream/main while origin is registered but untouched
    const { repo, originBare, upstreamBare } = fixture;
    const localBranch = "feature/local";
    git(repo, ["checkout", "-b", localBranch]);
    git(repo, ["commit", "--allow-empty", "-m", "c2"]);
    git(repo, ["config", `branch.${localBranch}.remote`, "upstream"]);
    git(repo, ["config", `branch.${localBranch}.merge`, `refs/heads/${MAIN_BRANCH}`]);
    const originRefsBefore = listRefs(originBare);

    // When: the current branch and differently named upstream are resolved and pushed
    const preparation = await ds.preparePush(repo);
    expect(preparation).toEqual({
      kind: "upstream",
      target: {
        remoteName: "upstream",
        localBranchName: localBranch,
        upstreamBranchName: MAIN_BRANCH
      }
    });
    if (preparation.kind !== "upstream") {
      throw new Error("Expected an upstream push target.");
    }
    const status = await ds.pushToUpstream(repo, preparation.target);

    // Then: the local feature commit updates upstream/main and origin remains untouched
    expect(status).toBeNull();
    expect(git(upstreamBare, ["rev-parse", `refs/heads/${MAIN_BRANCH}`])).toBe(
      git(repo, ["rev-parse", "HEAD"])
    );
    expect(git(upstreamBare, ["branch", "--list", localBranch])).toBe("");
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
