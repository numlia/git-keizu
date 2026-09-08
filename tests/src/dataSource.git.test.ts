import * as cp from "node:child_process";
import { EventEmitter } from "node:events";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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
import type { BranchCleanupResult, FileHistoryEntry } from "../../src/types";
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

/* ------------------------------------------------------------------ */
/* S50: getFileHistory() against real repositories                    */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/src/dataSource-test/07-file-history-01.md
describe("getFileHistory against real repositories (S50)", () => {
  const CUR = "src/current-name.txt";
  const LEG = "src/legacy-name.txt";
  const F = "src/f.txt";
  const FIXED_DATE_BASE = 1_700_000_000;
  const roots: string[] = [];

  /**
   * Git driver for one fixture repository: every invocation goes through
   * execFileSync with an argument array, a fixed author / committer date that
   * advances by one second per call, and LC_ALL=C.
   */
  class FixtureRepo {
    private tick = 0;
    constructor(public readonly dir: string) {}

    git(args: string[]): string {
      this.tick++;
      const date = `${FIXED_DATE_BASE + this.tick} +0000`;
      return cp
        .execFileSync("git", args, {
          cwd: this.dir,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
          env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date, LC_ALL: "C" }
        })
        .trim();
    }

    async write(rel: string, content: string): Promise<void> {
      const full = path.join(this.dir, rel);
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, content);
    }

    async append(rel: string, line: string): Promise<void> {
      await fs.appendFile(path.join(this.dir, rel), `${line}\n`);
    }

    async commitAll(subject: string): Promise<void> {
      this.git(["add", "-A"]);
      this.git(["commit", "-m", subject]);
    }

    /** Merge that is expected to conflict; the caller resolves and commits. */
    mergeExpectingConflict(branch: string, subject: string): void {
      expect(() => this.git(["merge", branch, "-m", subject])).toThrow();
    }

    subjectOf(hash: string): string {
      return this.git(["log", "--format=%s", "-1", hash]);
    }

    hashOf(subject: string): string {
      const line = this.git(["log", "--all", "--format=%H %s"])
        .split("\n")
        .find((l) => l.substring(41) === subject);
      if (line === undefined) throw new Error(`no commit with subject ${subject}`);
      return line.substring(0, 40);
    }
  }

  async function initFixture(name: string): Promise<FixtureRepo> {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), `git-keizu-055-07-${name}-`));
    roots.push(root);
    const repo = new FixtureRepo(root);
    repo.git(["init", "-b", MAIN_BRANCH, "."]);
    repo.git(["config", "user.email", "test@example.com"]);
    repo.git(["config", "user.name", "Test User"]);
    repo.git(["config", "commit.gpgsign", "false"]);
    repo.git(["config", "merge.ff", "false"]);
    return repo;
  }

  afterAll(async () => {
    for (const root of roots) await fs.rm(root, { recursive: true, force: true });
  });

  const numberedLines = (prefix: string, count: number): string =>
    `${Array.from({ length: count }, (_, i) => `${prefix} ${i}`).join("\n")}\n`;

  interface ExpectedEntry {
    subject: string;
    type: string;
    isMerge: boolean;
    historicalPath: string;
  }

  const E = (
    subject: string,
    type: string,
    isMerge: boolean,
    historicalPath: string
  ): ExpectedEntry => ({ subject, type, isMerge, historicalPath });

  const bySubject = (a: ExpectedEntry, b: ExpectedEntry): number =>
    a.subject.localeCompare(b.subject);

  /** Resolve each entry's subject via git log and compare as an order-independent set. */
  async function expectHistory(
    repo: FixtureRepo,
    anchorSubject: string,
    filePath: string,
    expected: ExpectedEntry[]
  ): Promise<FileHistoryEntry[]> {
    const result = await new DataSource().getFileHistory(
      repo.dir,
      repo.hashOf(anchorSubject),
      filePath
    );
    expect(result).not.toBeNull();
    const actual = result!
      .map((e) => E(repo.subjectOf(e.hash), e.type, e.isMerge, e.historicalPath))
      .sort(bySubject);
    expect(actual).toEqual([...expected].sort(bySubject));
    expect(result).toHaveLength(expected.length);
    return result!;
  }

  function expectNotIncluded(
    repo: FixtureRepo,
    result: FileHistoryEntry[],
    subjects: string[]
  ): void {
    const hashes = result.map((e) => e.hash);
    for (const subject of subjects) {
      expect(hashes).not.toContain(repo.hashOf(subject));
    }
  }

  /** base -> update legacy -> unrelated main -> feature rename + edit -> --no-ff merge -> fix -> delete -> recreate */
  async function buildSimilarFamily(
    kind: "similar" | "dissimilar" | "conflict"
  ): Promise<FixtureRepo> {
    const repo = await initFixture(kind);
    await repo.write(LEG, numberedLines("line", 3));
    await repo.commitAll("base: add legacy file");
    await repo.append(LEG, "legacy");
    await repo.commitAll("feat: update legacy file");
    await repo.write("README.md", "readme\n");
    await repo.commitAll("docs: unrelated main change");
    repo.git(["branch", "feature", repo.hashOf("feat: update legacy file")]);
    repo.git(["checkout", "feature"]);
    repo.git(["mv", LEG, CUR]);
    await repo.commitAll("refactor: rename tracked file");
    if (kind === "similar") {
      await repo.append(CUR, "feature");
    } else {
      await repo.write(CUR, numberedLines("different content", 8));
    }
    await repo.commitAll("feat: update renamed file");
    repo.git(["checkout", MAIN_BRANCH]);
    if (kind === "conflict") {
      await repo.append(LEG, "main");
      await repo.commitAll("feat: main edits legacy before merge");
      repo.mergeExpectingConflict("feature", "merge: rename feature");
      repo.git(["rm", "-f", LEG]);
      await repo.write(CUR, "resolved\n");
      repo.git(["add", "-A"]);
      repo.git(["commit", "--no-edit", "-m", "merge: rename feature"]);
    } else {
      repo.git(["merge", "feature", "-m", "merge: rename feature"]);
    }
    await repo.append(CUR, "fix");
    await repo.commitAll("fix: update file after merge");
    repo.git(["rm", CUR]);
    await repo.commitAll("refactor: delete tracked file");
    await repo.write(CUR, "recreated\n");
    await repo.commitAll("feat: recreate same path");
    return repo;
  }

  /** init -> branch <b> unrelated -> main unrelated -> --no-commit merge with a tree edit. */
  async function unrelatedDiamond(
    repo: FixtureRepo,
    branch: string,
    branchSubject: string,
    mainSubject: string,
    edit: () => Promise<void>,
    mergeSubject: string
  ): Promise<void> {
    repo.git(["branch", branch]);
    repo.git(["checkout", branch]);
    await repo.write(`${branch}.txt`, `${branch}\n`);
    await repo.commitAll(branchSubject);
    repo.git(["checkout", MAIN_BRANCH]);
    await repo.write(`${mainSubject.replace(/[^a-z0-9]/g, "-")}.txt`, `${mainSubject}\n`);
    await repo.commitAll(mainSubject);
    repo.git(["merge", "--no-commit", branch]);
    await edit();
    repo.git(["add", "-A"]);
    repo.git(["commit", "-m", mergeSubject]);
  }

  const SIMILAR_TAIL: ExpectedEntry[] = [
    E("feat: update renamed file", "M", false, CUR),
    E("refactor: rename tracked file", "R", false, CUR),
    E("feat: update legacy file", "M", false, LEG),
    E("base: add legacy file", "A", false, LEG)
  ];
  const RECREATED_HEAD: ExpectedEntry[] = [E("feat: recreate same path", "A", false, CUR)];

  describe("similar fixture", () => {
    let repo: FixtureRepo;

    beforeAll(async () => {
      repo = await buildSimilarFamily("similar");
    });

    it("returns six entries with a rename merge for the anchor (TC-347)", async () => {
      // Case: TC-347
      // Given: the similar fixture
      // When: the history of src/current-name.txt is requested from fix: update file after merge
      const result = await expectHistory(repo, "fix: update file after merge", CUR, [
        E("fix: update file after merge", "M", false, CUR),
        E("merge: rename feature", "R", true, CUR),
        ...SIMILAR_TAIL
      ]);

      // Then: the rename entry carries the legacy -> current paths
      const rename = result.find(
        (e) => repo.subjectOf(e.hash) === "refactor: rename tracked file"
      )!;
      expect(rename.oldFilePath).toBe(LEG);
      expect(rename.newFilePath).toBe(CUR);
      expect(rename.historicalPath).toBe(CUR);
    });

    it("returns only the recreate commit for the recreated HEAD (TC-348)", async () => {
      // Case: TC-348
      // Given: the similar fixture whose HEAD recreates the path
      // When: the history is requested from feat: recreate same path
      const result = await expectHistory(repo, "feat: recreate same path", CUR, RECREATED_HEAD);

      // Then: the single entry is a non-merge A and nothing older than the delete is included
      expect(result[0].isMerge).toBe(false);
      expectNotIncluded(repo, result, [
        "refactor: delete tracked file",
        "fix: update file after merge",
        "base: add legacy file"
      ]);
    });

    it("includes the anchor's own D when the delete commit is the anchor (TC-349)", async () => {
      // Case: TC-349
      // Given: the similar fixture
      // When: the history is requested from refactor: delete tracked file
      // Then: seven entries: the D plus the six of TC-347
      await expectHistory(repo, "refactor: delete tracked file", CUR, [
        E("refactor: delete tracked file", "D", false, CUR),
        E("fix: update file after merge", "M", false, CUR),
        E("merge: rename feature", "R", true, CUR),
        ...SIMILAR_TAIL
      ]);
    });
  });

  describe("dissimilar fixture", () => {
    let repo: FixtureRepo;

    beforeAll(async () => {
      repo = await buildSimilarFamily("dissimilar");
    });

    it("returns the merge as A when the rename is not detected (TC-350)", async () => {
      // Case: TC-350
      // Given: the dissimilar fixture (8-line rewrite after the rename)
      // When: the history is requested from the anchor
      const result = await expectHistory(repo, "fix: update file after merge", CUR, [
        E("fix: update file after merge", "M", false, CUR),
        E("merge: rename feature", "A", true, CUR),
        ...SIMILAR_TAIL
      ]);

      // Then: the merge entry has old = new = current
      const merge = result.find((e) => e.isMerge)!;
      expect(merge.oldFilePath).toBe(CUR);
      expect(merge.newFilePath).toBe(CUR);
    });

    it("returns only the recreate commit for the recreated HEAD (TC-351)", async () => {
      // Case: TC-351
      // Given: the dissimilar fixture
      // When/Then: HEAD yields the single non-merge A
      await expectHistory(repo, "feat: recreate same path", CUR, RECREATED_HEAD);
    });
  });

  describe("conflict fixture", () => {
    let repo: FixtureRepo;

    beforeAll(async () => {
      repo = await buildSimilarFamily("conflict");
    });

    it("returns seven entries including the main-side legacy edit (TC-352)", async () => {
      // Case: TC-352
      // Given: the conflict fixture (both parents differ from the merge)
      // When/Then: seven entries with the merge folded into one A entry
      await expectHistory(repo, "fix: update file after merge", CUR, [
        E("fix: update file after merge", "M", false, CUR),
        E("merge: rename feature", "A", true, CUR),
        E("feat: main edits legacy before merge", "M", false, LEG),
        ...SIMILAR_TAIL
      ]);
    });

    it("returns only the recreate commit for the recreated HEAD (TC-353)", async () => {
      // Case: TC-353
      // Given: the conflict fixture
      // When/Then: HEAD yields the single non-merge A
      await expectHistory(repo, "feat: recreate same path", CUR, RECREATED_HEAD);
    });
  });

  it("returns six entries when rename detection and conflict resolution share the merge (TC-354)", async () => {
    // Case: TC-354
    // Given: base (6 lines) -> feature rename + edit -> main edits legacy -> conflict merge keeping both lines
    const repo = await initFixture("conflict-similar");
    await repo.write(LEG, numberedLines("line", 6));
    await repo.commitAll("base: add legacy file");
    repo.git(["checkout", "-b", "feature"]);
    repo.git(["mv", LEG, CUR]);
    await repo.commitAll("refactor: rename tracked file");
    await repo.append(CUR, "feature");
    await repo.commitAll("feat: update renamed file");
    repo.git(["checkout", MAIN_BRANCH]);
    await repo.append(LEG, "main");
    await repo.commitAll("feat: main edits legacy");
    repo.mergeExpectingConflict("feature", "merge: rename feature");
    await repo.write(CUR, `${numberedLines("line", 6)}feature\nmain\n`);
    repo.git(["add", "-A"]);
    repo.git(["commit", "--no-edit", "-m", "merge: rename feature"]);
    await repo.append(CUR, "fix");
    await repo.commitAll("fix: update file after merge");

    // When/Then: six entries with an R merge
    await expectHistory(repo, "fix: update file after merge", CUR, [
      E("fix: update file after merge", "M", false, CUR),
      E("merge: rename feature", "R", true, CUR),
      E("feat: update renamed file", "M", false, CUR),
      E("refactor: rename tracked file", "R", false, CUR),
      E("feat: main edits legacy", "M", false, LEG),
      E("base: add legacy file", "A", false, LEG)
    ]);
  });

  it("does not return a merge that never touches the historical paths (TC-355)", async () => {
    // Case: TC-355
    // Given: the unrelated-merge fixture with merge: unrelated other in the history
    const repo = await initFixture("unrelated-merge");
    await repo.write(LEG, numberedLines("line", 6));
    await repo.commitAll("base: add legacy file");
    repo.git(["checkout", "-b", "feature"]);
    repo.git(["mv", LEG, CUR]);
    await repo.commitAll("refactor: rename tracked file");
    await repo.append(CUR, "feature");
    await repo.commitAll("feat: update renamed file");
    repo.git(["checkout", MAIN_BRANCH]);
    repo.git(["merge", "feature", "-m", "merge: rename feature"]);
    repo.git(["checkout", "-b", "other"]);
    await repo.write("other.txt", "other\n");
    await repo.commitAll("other: add other file");
    repo.git(["checkout", MAIN_BRANCH]);
    await repo.write("main-only.txt", "main only\n");
    await repo.commitAll("main: add main-only file");
    repo.git(["merge", "other", "-m", "merge: unrelated other"]);
    await repo.append(CUR, "fix");
    await repo.commitAll("fix: update file after merge");

    // When: the history is requested from the anchor
    const result = await expectHistory(repo, "fix: update file after merge", CUR, [
      E("fix: update file after merge", "M", false, CUR),
      E("merge: rename feature", "R", true, CUR),
      E("feat: update renamed file", "M", false, CUR),
      E("refactor: rename tracked file", "R", false, CUR),
      E("base: add legacy file", "A", false, LEG)
    ]);

    // Then: the unrelated merge is absent
    expectNotIncluded(repo, result, ["merge: unrelated other"]);
  });

  describe("evil fixture", () => {
    let repo: FixtureRepo;

    beforeAll(async () => {
      repo = await initFixture("evil");
      await repo.write(F, "f 0\n");
      await repo.commitAll("old incarnation: add f");
      await repo.append(F, "f 1");
      await repo.commitAll("old incarnation: edit f");
      repo.git(["rm", F]);
      await repo.commitAll("old incarnation: delete f");
      repo.git(["branch", "feature"]);
      await repo.write("a.txt", "a\n");
      await repo.commitAll("main: unrelated a");
      repo.git(["checkout", "feature"]);
      await repo.write("b.txt", "b\n");
      await repo.commitAll("feature: unrelated b");
      repo.git(["checkout", MAIN_BRANCH]);
      repo.git(["merge", "--no-commit", "feature"]);
      await repo.write(F, "f 0\n");
      repo.git(["add", "-A"]);
      repo.git(["commit", "-m", "evil merge: creates f"]);
      await repo.append(F, "new");
      await repo.commitAll("edit new f");
    });

    it("excludes the old incarnation recreated by the evil merge (TC-356)", async () => {
      // Case: TC-356
      // Given: the evil fixture
      // When: the history is requested from edit new f
      const result = await expectHistory(repo, "edit new f", F, [
        E("edit new f", "M", false, F),
        E("evil merge: creates f", "A", true, F)
      ]);

      // Then: none of the old incarnation commits are present
      expectNotIncluded(repo, result, [
        "old incarnation: add f",
        "old incarnation: edit f",
        "old incarnation: delete f"
      ]);
    });

    it("returns the birth merge itself when it is the anchor (CE1) (TC-357)", async () => {
      // Case: TC-357
      // Given: the evil fixture with zero lineage entries for the merge anchor
      // When/Then: the merge query still runs and yields the single A* entry
      await expectHistory(repo, "evil merge: creates f", F, [
        E("evil merge: creates f", "A", true, F)
      ]);
    });
  });

  it("returns a birth merge for a path that never existed before (CE2) (TC-358)", async () => {
    // Case: TC-358
    // Given: init -> x: unrelated -> main: unrelated -> merge creating src/f.txt
    const repo = await initFixture("ce2");
    await repo.write("a.txt", "a\n");
    await repo.commitAll("init");
    await unrelatedDiamond(
      repo,
      "x",
      "x: unrelated",
      "main: unrelated",
      () => repo.write(F, "f 0\n"),
      "birth merge: creates f"
    );

    // When/Then: the single A* entry
    await expectHistory(repo, "birth merge: creates f", F, [
      E("birth merge: creates f", "A", true, F)
    ]);
  });

  describe("CE3 fixture", () => {
    let repo: FixtureRepo;

    beforeAll(async () => {
      repo = await initFixture("ce3");
      await repo.write("a.txt", "a\n");
      await repo.commitAll("init");
      await repo.write(F, "f 0\n");
      await repo.commitAll("old incarnation: add f");
      // One edit inside the old incarnation so TC-363 can observe its exclusion as well.
      await repo.append(F, "f 1");
      await repo.commitAll("old incarnation: edit f");
      await unrelatedDiamond(
        repo,
        "p",
        "p: unrelated",
        "main: unrelated 1",
        async () => {
          repo.git(["rm", F]);
        },
        "delete merge: removes f"
      );
      await unrelatedDiamond(
        repo,
        "q",
        "q: unrelated",
        "main: unrelated 2",
        () => repo.write(F, "f 0\n"),
        "recreate merge: creates f"
      );
      await repo.append(F, "new");
      await repo.commitAll("edit new f");
    });

    it("excludes the old incarnation deleted and recreated by merges (CE3) (TC-359)", async () => {
      // Case: TC-359
      // Given: the CE3 fixture
      // When: the history is requested from edit new f
      const result = await expectHistory(repo, "edit new f", F, [
        E("edit new f", "M", false, F),
        E("recreate merge: creates f", "A", true, F)
      ]);

      // Then: the old incarnation and the delete merge are excluded
      expectNotIncluded(repo, result, [
        "old incarnation: add f",
        "old incarnation: edit f",
        "delete merge: removes f"
      ]);
    });

    it("keeps the anchor when it is itself the valid birth candidate (CE7) (TC-363)", async () => {
      // Case: TC-363
      // Given: the CE3 fixture
      // When: the history is requested from recreate merge: creates f
      const result = await expectHistory(repo, "recreate merge: creates f", F, [
        E("recreate merge: creates f", "A", true, F)
      ]);

      // Then: the old incarnation and delete merge are excluded
      expectNotIncluded(repo, result, [
        "old incarnation: add f",
        "old incarnation: edit f",
        "delete merge: removes f"
      ]);
    });
  });

  it("returns a merge TREESAME to its first parent as an M* entry (CE4) (TC-360)", async () => {
    // Case: TC-360
    // Given: base -> feature edit / main edit -> conflict resolved with the main content
    const repo = await initFixture("ce4");
    await repo.write(F, numberedLines("line", 3));
    await repo.commitAll("base: add f");
    repo.git(["checkout", "-b", "feature"]);
    await repo.append(F, "feature");
    await repo.commitAll("feature: edit f");
    repo.git(["checkout", MAIN_BRANCH]);
    await repo.append(F, "main");
    await repo.commitAll("main: edit f");
    repo.mergeExpectingConflict("feature", "merge: keep main");
    repo.git(["checkout", "--ours", F]);
    repo.git(["add", "-A"]);
    repo.git(["commit", "--no-edit", "-m", "merge: keep main"]);
    await repo.append(F, "after");
    await repo.commitAll("edit f after merge");
    const merge = repo.hashOf("merge: keep main");

    // When: the first parent diff and the history are inspected
    const firstParentDiff = repo.git(["diff", `${merge}^`, merge, "--name-status"]);
    const result = await expectHistory(repo, "edit f after merge", F, [
      E("edit f after merge", "M", false, F),
      E("merge: keep main", "M", true, F),
      E("main: edit f", "M", false, F),
      E("feature: edit f", "M", false, F),
      E("base: add f", "A", false, F)
    ]);

    // Then: the CDV-style first parent diff is empty while the merge is still an M* entry
    expect(firstParentDiff).toBe("");
    const mergeEntry = result.find((e) => e.hash === merge)!;
    expect(mergeEntry.type).toBe("M");
    expect(mergeEntry.isMerge).toBe(true);
  });

  it("keeps an invalid candidate on a reused legacy path without excluding (CE5) (TC-361)", async () => {
    // Case: TC-361
    // Given: similar base -> rename merge -> merge that reuses the legacy path for a new file
    const repo = await initFixture("ce5");
    await repo.write(LEG, numberedLines("line", 3));
    await repo.commitAll("base: add legacy file");
    await repo.append(LEG, "legacy");
    await repo.commitAll("feat: update legacy file");
    repo.git(["checkout", "-b", "feature"]);
    repo.git(["mv", LEG, CUR]);
    await repo.commitAll("refactor: rename tracked file");
    await repo.append(CUR, "feature");
    await repo.commitAll("feat: update renamed file");
    repo.git(["checkout", MAIN_BRANCH]);
    repo.git(["merge", "feature", "-m", "merge: rename feature"]);
    await unrelatedDiamond(
      repo,
      "reuse",
      "reuse: unrelated x",
      "main: unrelated y",
      () => repo.write(LEG, "reuse 0\n"),
      "reuse merge: creates legacy path"
    );
    await repo.append(CUR, "fix");
    await repo.commitAll("fix: update current after reuse");

    // When/Then: seven entries, the reuse merge stays as A* and base A remains
    await expectHistory(repo, "fix: update current after reuse", CUR, [
      E("fix: update current after reuse", "M", false, CUR),
      E("merge: rename feature", "R", true, CUR),
      E("feat: update renamed file", "M", false, CUR),
      E("refactor: rename tracked file", "R", false, CUR),
      E("feat: update legacy file", "M", false, LEG),
      E("base: add legacy file", "A", false, LEG),
      E("reuse merge: creates legacy path", "A", true, LEG)
    ]);
  });

  it("accepts a rename source birth merge without a boundary (CE6) (TC-362)", async () => {
    // Case: TC-362
    // Given: init -> merge creating legacy -> git mv to current -> fix
    const repo = await initFixture("ce6");
    await repo.write("a.txt", "a\n");
    await repo.commitAll("init");
    await unrelatedDiamond(
      repo,
      "x",
      "x: unrelated",
      "main: unrelated",
      () => repo.write(LEG, numberedLines("line", 3)),
      "birth merge: creates legacy"
    );
    repo.git(["mv", LEG, CUR]);
    await repo.commitAll("refactor: rename tracked file");
    await repo.append(CUR, "fix");
    await repo.commitAll("fix: edit current");

    // When/Then: three entries with the birth merge on the legacy path
    await expectHistory(repo, "fix: edit current", CUR, [
      E("fix: edit current", "M", false, CUR),
      E("refactor: rename tracked file", "R", false, CUR),
      E("birth merge: creates legacy", "A", true, LEG)
    ]);
  });
});
