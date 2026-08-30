import * as cp from "node:child_process";
import { EventEmitter } from "node:events";
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

// spawn is wrapped in a vi.fn that keeps the real implementation by default, so the
// real-repository tests above stay untouched while the S48 orchestration tests can
// replace the implementation per test and restore the original afterwards.
const actualSpawnRef = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  actualSpawnRef.current = actual.spawn;
  return { ...actual, spawn: vi.fn(actual.spawn) };
});

vi.mock("../../src/worktree", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/worktree")>();
  return { ...actual, parseWorktreeList: vi.fn(actual.parseWorktreeList) };
});

import { DataSource } from "../../src/dataSource";
import type { BranchCleanupResult } from "../../src/types";
import { parseWorktreeList } from "../../src/worktree";

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

/* ------------------------------------------------------------------ */
/* S48: getBranchCleanup() Git orchestration・失敗分離・3 並列          */
/* ------------------------------------------------------------------ */

const CLEANUP_REPO = "/cleanup/repo";
const SNAPSHOT_FORMAT_ARG =
  "--format=%(refname)%00%(HEAD)%00%(upstream)%00%(upstream:track)%00%(committerdate:unix)%00%(objectname)%00%(tree)";
const REMOTE_REFS_FORMAT_ARG = "--format=%(refname)%00%(symref)";
const OID_ALPHA = "a".repeat(40);
const OID_BETA = "b".repeat(40);
const OID_GAMMA = "c".repeat(40);
const OID_DELTA = "d".repeat(40);
const TREE_ALPHA = "1".repeat(40);
const TREE_BETA = "2".repeat(40);
const TREE_GAMMA = "3".repeat(40);
const TREE_DELTA = "4".repeat(40);

interface MockGitResult {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  delayMs?: number;
}

interface CleanupSpawnConfig {
  snapshot?: MockGitResult;
  worktree?: MockGitResult;
  remote?: MockGitResult;
  remoteRefs?: MockGitResult;
  revList?: (revspec: string) => MockGitResult;
  onRevListSpawn?: () => void;
  onRevListClose?: () => void;
}

function cleanupSnapshotLine(
  refname: string,
  head: string,
  upstream: string,
  track: string,
  date: string,
  objectName: string,
  tree: string
): string {
  return [refname, head, upstream, track, date, objectName, tree].join("\0");
}

function createGitProcess(result: MockGitResult, onClose?: () => void): cp.ChildProcess {
  const stdoutEmitter = new EventEmitter();
  const stderrEmitter = new EventEmitter();
  const proc = new EventEmitter();
  Object.assign(proc, { stdout: stdoutEmitter, stderr: stderrEmitter });
  const emitClose = () => {
    if (result.stdout !== undefined && result.stdout !== "") {
      stdoutEmitter.emit("data", result.stdout);
    }
    if (result.stderr !== undefined && result.stderr !== "") {
      stderrEmitter.emit("data", result.stderr);
    }
    onClose?.();
    proc.emit("close", result.exitCode ?? 0);
  };
  if (result.delayMs === undefined) {
    queueMicrotask(emitClose);
  } else {
    setTimeout(emitClose, result.delayMs);
  }
  return proc as unknown as cp.ChildProcess;
}

describe("getBranchCleanup Git orchestration (S48)", () => {
  // @see docs/testing/perspectives/src/dataSource-test/06-branch-cleanup-01.md
  const spawnMock = vi.mocked(cp.spawn);
  const parseWorktreeListMock = vi.mocked(parseWorktreeList);
  let ds: DataSource;

  beforeEach(() => {
    spawnMock.mockClear();
    parseWorktreeListMock.mockClear();
    ds = new DataSource();
  });

  afterEach(() => {
    spawnMock.mockImplementation(actualSpawnRef.current as typeof cp.spawn);
  });

  function installCleanupSpawn(config: CleanupSpawnConfig): void {
    spawnMock.mockImplementation(((_cmd: string, args: string[]) => {
      if (args[0] === "for-each-ref" && args.includes("refs/heads")) {
        return createGitProcess(config.snapshot ?? { stdout: "" });
      }
      if (args[0] === "worktree") {
        return createGitProcess(config.worktree ?? { stdout: "" });
      }
      if (args[0] === "remote") {
        return createGitProcess(config.remote ?? { stdout: "" });
      }
      if (args[0] === "for-each-ref" && args.includes("refs/remotes")) {
        return createGitProcess(config.remoteRefs ?? { stdout: "" });
      }
      if (args[0] === "rev-list") {
        config.onRevListSpawn?.();
        return createGitProcess(
          config.revList?.(args[3]) ?? { stdout: "0\t0" },
          config.onRevListClose
        );
      }
      return createGitProcess({ stdout: "" });
    }) as typeof cp.spawn);
  }

  function callsWithArgs(filter: (args: string[]) => boolean): [string, string[], object][] {
    return spawnMock.mock.calls.filter((call) => filter(call[1] as string[])) as [
      string,
      string[],
      object
    ][];
  }

  function expectOkRows(result: BranchCleanupResult) {
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("Expected an ok result.");
    return result;
  }

  it("takes the snapshot with the fixed for-each-ref arguments (TC-313)", async () => {
    // Case: TC-313
    // Given: a repository whose snapshot has two branches
    installCleanupSpawn({
      snapshot: {
        stdout: [
          cleanupSnapshotLine("refs/heads/alpha", "*", "", "", "1700000100", OID_ALPHA, TREE_ALPHA),
          cleanupSnapshotLine("refs/heads/beta", " ", "", "", "1700000200", OID_BETA, TREE_BETA)
        ].join("\n")
      }
    });

    // When: the branch cleanup facts are collected
    await ds.getBranchCleanup(CLEANUP_REPO, null);

    // Then: exactly one refs/heads for-each-ref runs with the sorted NUL format,
    // cwd = repo and LC_ALL=C
    const snapshotCalls = callsWithArgs(
      (args) => args[0] === "for-each-ref" && args.includes("refs/heads")
    );
    expect(snapshotCalls).toHaveLength(1);
    const [, args, options] = snapshotCalls[0];
    expect(args).toContain("--sort=refname");
    expect(args).toContain(SNAPSHOT_FORMAT_ARG);
    expect(options).toEqual(
      expect.objectContaining({
        cwd: CLEANUP_REPO,
        env: expect.objectContaining({ LC_ALL: "C" })
      })
    );
  });

  it("passes only snapshot OIDs to the rev-list comparison (TC-314)", async () => {
    // Case: TC-314
    // Given: a single current branch that resolves as its own comparison target
    installCleanupSpawn({
      snapshot: {
        stdout: cleanupSnapshotLine(
          "refs/heads/feature/x",
          "*",
          "",
          "",
          "1700000100",
          OID_ALPHA,
          TREE_ALPHA
        )
      }
    });

    // When: the branch cleanup facts are collected
    await ds.getBranchCleanup(CLEANUP_REPO, null);

    // Then: the rev-list arguments consist of the OID revspec only, without the branch name
    const revListCalls = callsWithArgs((args) => args[0] === "rev-list");
    expect(revListCalls).toHaveLength(1);
    expect(revListCalls[0][1]).toEqual([
      "rev-list",
      "--left-right",
      "--count",
      `${OID_ALPHA}...${OID_ALPHA}`
    ]);
    expect(revListCalls[0][1].join(" ")).not.toContain("feature/x");
  });

  it("collects worktrees, remote names and remote refs independently (TC-315)", async () => {
    // Case: TC-315
    // Given: a snapshot with one branch and a worktree listing
    const worktreeStdout = `worktree /cleanup/repo\nHEAD ${OID_ALPHA}\nbranch refs/heads/alpha\n`;
    installCleanupSpawn({
      snapshot: {
        stdout: cleanupSnapshotLine(
          "refs/heads/alpha",
          "*",
          "",
          "",
          "1700000100",
          OID_ALPHA,
          TREE_ALPHA
        )
      },
      worktree: { stdout: worktreeStdout }
    });

    // When: the branch cleanup facts are collected
    await ds.getBranchCleanup(CLEANUP_REPO, null);

    // Then: the three independent collections run exactly once each and the successful
    // worktree stdout is handed to parseWorktreeList exactly once
    expect(callsWithArgs((args) => args[0] === "worktree")).toHaveLength(1);
    expect(callsWithArgs((args) => args[0] === "worktree")[0][1]).toEqual([
      "worktree",
      "list",
      "--porcelain"
    ]);
    expect(callsWithArgs((args) => args[0] === "remote")).toHaveLength(1);
    expect(callsWithArgs((args) => args[0] === "remote")[0][1]).toEqual(["remote"]);
    const remoteRefCalls = callsWithArgs(
      (args) => args[0] === "for-each-ref" && args.includes("refs/remotes")
    );
    expect(remoteRefCalls).toHaveLength(1);
    expect(remoteRefCalls[0][1]).toContain(REMOTE_REFS_FORMAT_ARG);
    expect(parseWorktreeListMock).toHaveBeenCalledTimes(1);
    expect(parseWorktreeListMock).toHaveBeenCalledWith(worktreeStdout);
  });

  it("returns a whole-result error when the snapshot command fails (TC-316)", async () => {
    // Case: TC-316
    // Given: the refs/heads for-each-ref exits non-zero
    installCleanupSpawn({
      snapshot: { exitCode: 128, stderr: "fatal: not a git repository" }
    });

    // When: the branch cleanup facts are collected
    const result = await ds.getBranchCleanup(CLEANUP_REPO, null);

    // Then: the failure is a whole-result error and no comparison or worktree process runs
    expect(result).toEqual({ kind: "error", status: "fatal: not a git repository" });
    expect(callsWithArgs((args) => args[0] === "rev-list")).toHaveLength(0);
    expect(callsWithArgs((args) => args[0] === "worktree")).toHaveLength(0);
  });

  it("degrades only the failed row's comparison facts (TC-317)", async () => {
    // Case: TC-317
    // Given: three branches where only gamma's rev-list fails
    installCleanupSpawn({
      snapshot: {
        stdout: [
          cleanupSnapshotLine("refs/heads/alpha", "*", "", "", "1700000100", OID_ALPHA, TREE_ALPHA),
          cleanupSnapshotLine("refs/heads/beta", " ", "", "", "1700000200", OID_BETA, TREE_BETA),
          cleanupSnapshotLine("refs/heads/gamma", " ", "", "", "1700000300", OID_GAMMA, TREE_GAMMA)
        ].join("\n")
      },
      revList: (revspec) => {
        if (revspec === `${OID_ALPHA}...${OID_GAMMA}`) {
          return { exitCode: 128, stderr: "fatal: bad object" };
        }
        if (revspec === `${OID_ALPHA}...${OID_BETA}`) {
          return { stdout: "1\t2" };
        }
        return { stdout: "0\t0" };
      }
    });

    // When: the branch cleanup facts are collected
    const result = expectOkRows(await ds.getBranchCleanup(CLEANUP_REPO, null));

    // Then: only gamma's ancestry / aheadBehind become unknown while every tree
    // difference stays derived from the snapshot tree OIDs
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0].ancestry).toBe("ancestor");
    expect(result.rows[0].aheadBehind).toEqual({ kind: "known", ahead: 0, behind: 0 });
    expect(result.rows[0].treeDifference).toBe("same");
    expect(result.rows[1].ancestry).toBe("notAncestor");
    expect(result.rows[1].aheadBehind).toEqual({ kind: "known", ahead: 2, behind: 1 });
    expect(result.rows[1].treeDifference).toBe("different");
    expect(result.rows[2].ancestry).toBe("unknown");
    expect(result.rows[2].aheadBehind).toEqual({ kind: "unknown" });
    expect(result.rows[2].treeDifference).toBe("different");
  });

  it("keeps a failed worktree listing as unknown on every row (TC-318)", async () => {
    // Case: TC-318
    // Given: the worktree listing exits non-zero
    installCleanupSpawn({
      snapshot: {
        stdout: [
          cleanupSnapshotLine("refs/heads/alpha", "*", "", "", "1700000100", OID_ALPHA, TREE_ALPHA),
          cleanupSnapshotLine("refs/heads/beta", " ", "", "", "1700000200", OID_BETA, TREE_BETA)
        ].join("\n")
      },
      worktree: { exitCode: 128, stderr: "fatal: worktree failed" }
    });

    // When: the branch cleanup facts are collected
    const result = expectOkRows(await ds.getBranchCleanup(CLEANUP_REPO, null));

    // Then: the failure stays unknown (never an empty collection), parseWorktreeList is
    // not called, and the other facts stay known
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].worktree).toEqual({ kind: "unknown" });
    expect(result.rows[1].worktree).toEqual({ kind: "unknown" });
    expect(parseWorktreeListMock).not.toHaveBeenCalled();
    expect(result.rows[0].lastCommit).toEqual({ kind: "known", unixSeconds: 1700000100 });
    expect(result.rows[0].ancestry).toBe("ancestor");
  });

  it("keeps a failed remote name listing as null remotes on every row (TC-319)", async () => {
    // Case: TC-319
    // Given: git remote exits non-zero
    installCleanupSpawn({
      snapshot: {
        stdout: [
          cleanupSnapshotLine("refs/heads/alpha", "*", "", "", "1700000100", OID_ALPHA, TREE_ALPHA),
          cleanupSnapshotLine("refs/heads/beta", " ", "", "", "1700000200", OID_BETA, TREE_BETA)
        ].join("\n")
      },
      remote: { exitCode: 128, stderr: "fatal: remote failed" }
    });

    // When: the branch cleanup facts are collected
    const result = expectOkRows(await ds.getBranchCleanup(CLEANUP_REPO, null));

    // Then: remotes stays null (never []) while the other facts survive
    expect(result.rows[0].remotes).toBeNull();
    expect(result.rows[1].remotes).toBeNull();
    expect(result.rows[0].worktree).toEqual({ kind: "unused" });
    expect(result.rows[0].lastCommit).toEqual({ kind: "known", unixSeconds: 1700000100 });
  });

  it("keeps failed remote refs as null remotes even when names succeeded (TC-320)", async () => {
    // Case: TC-320
    // Given: remote names succeed while the refs/remotes listing exits non-zero
    installCleanupSpawn({
      snapshot: {
        stdout: cleanupSnapshotLine(
          "refs/heads/alpha",
          "*",
          "",
          "",
          "1700000100",
          OID_ALPHA,
          TREE_ALPHA
        )
      },
      remote: { stdout: "origin\n" },
      remoteRefs: { exitCode: 128, stderr: "fatal: refs failed" }
    });

    // When: the branch cleanup facts are collected
    const result = expectOkRows(await ds.getBranchCleanup(CLEANUP_REPO, null));

    // Then: without the ref set no exact matching is possible, so remotes stays null
    expect(result.rows[0].remotes).toBeNull();
    expect(result.rows[0].lastCommit).toEqual({ kind: "known", unixSeconds: 1700000100 });
  });

  it("limits comparisons to 3 in flight and keeps the snapshot order (TC-321)", async () => {
    // Case: TC-321
    // Given: four branches whose comparisons complete in reverse order
    let inFlight = 0;
    let maxInFlight = 0;
    const delays: Record<string, number> = {
      [`${OID_ALPHA}...${OID_ALPHA}`]: 40,
      [`${OID_ALPHA}...${OID_BETA}`]: 30,
      [`${OID_ALPHA}...${OID_GAMMA}`]: 20,
      [`${OID_ALPHA}...${OID_DELTA}`]: 10
    };
    installCleanupSpawn({
      snapshot: {
        stdout: [
          cleanupSnapshotLine("refs/heads/alpha", "*", "", "", "1700000100", OID_ALPHA, TREE_ALPHA),
          cleanupSnapshotLine("refs/heads/beta", " ", "", "", "1700000200", OID_BETA, TREE_BETA),
          cleanupSnapshotLine("refs/heads/gamma", " ", "", "", "1700000300", OID_GAMMA, TREE_GAMMA),
          cleanupSnapshotLine("refs/heads/delta", " ", "", "", "1700000400", OID_DELTA, TREE_DELTA)
        ].join("\n")
      },
      revList: (revspec) => ({ stdout: "0\t0", delayMs: delays[revspec] ?? 5 }),
      onRevListSpawn: () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
      },
      onRevListClose: () => {
        inFlight -= 1;
      }
    });

    // When: the branch cleanup facts are collected
    const result = expectOkRows(await ds.getBranchCleanup(CLEANUP_REPO, null));

    // Then: at most (and exactly) 3 rev-list processes overlapped and the rows keep the
    // --sort=refname snapshot order despite reversed completion
    expect(maxInFlight).toBe(3);
    expect(callsWithArgs((args) => args[0] === "rev-list")).toHaveLength(4);
    expect(result.rows.map((row) => row.branchName)).toEqual(["alpha", "beta", "gamma", "delta"]);
  });

  it("returns a successful empty result for an empty snapshot (TC-322)", async () => {
    // Case: TC-322
    // Given: the snapshot succeeds with no branches
    installCleanupSpawn({ snapshot: { stdout: "" } });

    // When: the branch cleanup facts are collected
    const result = await ds.getBranchCleanup(CLEANUP_REPO, null);

    // Then: the empty state is a success and no comparison runs
    expect(result).toEqual({ kind: "ok", compareBranch: null, rows: [] });
    expect(callsWithArgs((args) => args[0] === "rev-list")).toHaveLength(0);
  });

  it("makes a single current branch its own comparison target (TC-323)", async () => {
    // Case: TC-323
    // Given: a snapshot with only the current branch
    installCleanupSpawn({
      snapshot: {
        stdout: cleanupSnapshotLine(
          "refs/heads/solo",
          "*",
          "",
          "",
          "1700000100",
          OID_ALPHA,
          TREE_ALPHA
        )
      }
    });

    // When: the branch cleanup facts are collected
    const result = expectOkRows(await ds.getBranchCleanup(CLEANUP_REPO, null));

    // Then: the row count is 1 and the branch is its own comparison target
    expect(result.rows).toHaveLength(1);
    expect(result.compareBranch).toBe("solo");
  });

  it("re-evaluates the fallback on the same snapshot for a vanished target (TC-324)", async () => {
    // Case: TC-324
    // Given: the requested branch is absent while origin/HEAD points at local main
    installCleanupSpawn({
      snapshot: {
        stdout: [
          cleanupSnapshotLine("refs/heads/main", " ", "", "", "1700000100", OID_ALPHA, TREE_ALPHA),
          cleanupSnapshotLine("refs/heads/topic", "*", "", "", "1700000200", OID_BETA, TREE_BETA)
        ].join("\n")
      },
      remoteRefs: {
        stdout: [
          ["refs/remotes/origin/HEAD", "refs/remotes/origin/main"].join("\0"),
          ["refs/remotes/origin/main", ""].join("\0")
        ].join("\n")
      }
    });

    // When: the vanished branch is requested
    const result = expectOkRows(await ds.getBranchCleanup(CLEANUP_REPO, "vanished"));

    // Then: the fallback resolves to main on the same snapshot without re-running it
    expect(result.compareBranch).toBe("main");
    expect(
      callsWithArgs((args) => args[0] === "for-each-ref" && args.includes("refs/heads"))
    ).toHaveLength(1);
  });

  it("never passes special branch names to a shell or revspec (TC-325)", async () => {
    // Case: TC-325
    // Given: a requested a;b branch and a snapshot containing feat/$(date)
    installCleanupSpawn({
      snapshot: {
        stdout: [
          cleanupSnapshotLine(
            "refs/heads/feat/$(date)",
            " ",
            "",
            "",
            "1700000200",
            OID_BETA,
            TREE_BETA
          ),
          cleanupSnapshotLine("refs/heads/main", "*", "", "", "1700000100", OID_ALPHA, TREE_ALPHA)
        ].join("\n")
      }
    });

    // When: the branch cleanup facts are collected for the special name
    await ds.getBranchCleanup(CLEANUP_REPO, "a;b");

    // Then: no spawn call uses a shell and no rev-list argument carries either name
    for (const call of spawnMock.mock.calls) {
      const options = call[2] as { shell?: unknown };
      expect(options.shell).toBeUndefined();
    }
    const revListCalls = callsWithArgs((args) => args[0] === "rev-list");
    expect(revListCalls.length).toBeGreaterThan(0);
    for (const [, args] of revListCalls) {
      expect(args.join(" ")).not.toContain("a;b");
      expect(args.join(" ")).not.toContain("feat/$(date)");
      expect(args[3]).toMatch(/^[0-9a-f]{40}\.\.\.[0-9a-f]{40}$/);
    }
  });

  it("returns notSelected rows without comparisons when detached with no fallback (TC-326)", async () => {
    // Case: TC-326
    // Given: no current branch and none of the fallback names exist
    installCleanupSpawn({
      snapshot: {
        stdout: [
          cleanupSnapshotLine("refs/heads/alpha", " ", "", "", "1700000100", OID_ALPHA, TREE_ALPHA),
          cleanupSnapshotLine("refs/heads/beta", " ", "", "", "1700000200", OID_BETA, TREE_BETA)
        ].join("\n")
      }
    });

    // When: the branch cleanup facts are collected
    const result = expectOkRows(await ds.getBranchCleanup(CLEANUP_REPO, null));

    // Then: no target is fabricated, every row is notSelected, and no rev-list runs
    expect(result.compareBranch).toBeNull();
    for (const row of result.rows) {
      expect(row.ancestry).toBe("notSelected");
      expect(row.treeDifference).toBe("notSelected");
      expect(row.aheadBehind).toEqual({ kind: "notSelected" });
    }
    expect(callsWithArgs((args) => args[0] === "rev-list")).toHaveLength(0);
  });
});
