import * as cp from "node:child_process";
import { EventEmitter } from "node:events";

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

vi.mock("node:child_process", () => ({
  spawn: vi.fn()
}));

const resolveGitExecutableMock = vi.hoisted(() => vi.fn());

vi.mock("../../src/gitExecutable", () => ({
  DEFAULT_GIT_PATH: "git",
  resolveGitExecutable: resolveGitExecutableMock
}));

import { COMMIT_ORDER_FLAGS, DataSource } from "../../src/dataSource";
import { type CommitOrdering, type GitStash, UNCOMMITTED_CHANGES_HASH } from "../../src/types";

const SEP = "XX7Nal-YARtTpjCikii9nJxER19D6diSyk-AWkPb";
const REPO = "/test/repo";
const SPAWN_OPTS = { cwd: REPO, env: { ...process.env, LC_ALL: "C" } };

type DataSourceWithPrivate = DataSource & {
  getStashes: (repo: string) => Promise<GitStash[]>;
  getAuthors: (repo: string) => Promise<string[]>;
};

function createMockProcess(stdoutData: string, exitCode = 0, emitError = false) {
  const stdoutEmitter = new EventEmitter();
  const stderrEmitter = new EventEmitter();
  const proc = new EventEmitter();
  Object.assign(proc, { stdout: stdoutEmitter, stderr: stderrEmitter });

  queueMicrotask(() => {
    if (emitError) {
      proc.emit("error", new Error("spawn error"));
      return;
    }
    if (stdoutData) {
      stdoutEmitter.emit("data", stdoutData);
    }
    proc.emit("close", exitCode);
  });

  return proc as unknown as cp.ChildProcess;
}

function makeStashLine(
  hash: string,
  baseHash: string,
  indexHash: string,
  untrackedHash: string | null,
  selector: string,
  author: string,
  email: string,
  date: number,
  message: string
): string {
  const parents = untrackedHash
    ? `${baseHash} ${indexHash} ${untrackedHash}`
    : `${baseHash} ${indexHash}`;
  return [hash, parents, selector, author, email, String(date), message].join(SEP);
}

function makeCommitLine(
  hash: string,
  parentHash: string,
  author: string,
  email: string,
  date: number,
  message: string
): string {
  return [hash, parentHash, author, email, String(date), message].join(SEP);
}

function setupSpawnForStash(stdoutData: string, exitCode = 0, emitError = false) {
  const mock = cp.spawn as unknown as ReturnType<typeof vi.fn>;
  mock.mockImplementation(() => createMockProcess(stdoutData, exitCode, emitError));
}

function setupSpawnForCommits(options: {
  logOutput: string;
  refOutput?: string;
  stashOutput: string;
  authorsOutput?: string;
}) {
  const mock = cp.spawn as unknown as ReturnType<typeof vi.fn>;
  mock.mockImplementation((_cmd: unknown, args: unknown) => {
    const argArray = args as string[];
    const subcommand = argArray[0];
    if (subcommand === "log") {
      return createMockProcess(options.logOutput);
    }
    if (subcommand === "show-ref") {
      return createMockProcess(options.refOutput ?? "");
    }
    if (subcommand === "reflog") {
      return createMockProcess(options.stashOutput);
    }
    if (subcommand === "shortlog") {
      return createMockProcess(options.authorsOutput ?? "");
    }
    return createMockProcess("");
  });
}

describe("getStashes", () => {
  let ds: DataSourceWithPrivate;

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource() as DataSourceWithPrivate;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses 3 stash entries from git reflog output (TC-001)", async () => {
    // Given: Repository has 3 stashes (mocked reflog output)
    const output = [
      makeStashLine(
        "aaa111",
        "base111",
        "idx111",
        "utr111",
        "stash@{0}",
        "Alice",
        "alice@test.com",
        1700000003,
        "WIP: feature A"
      ),
      makeStashLine(
        "aaa222",
        "base222",
        "idx222",
        null,
        "stash@{1}",
        "Bob",
        "bob@test.com",
        1700000002,
        "WIP: feature B"
      ),
      makeStashLine(
        "aaa333",
        "base333",
        "idx333",
        "utr333",
        "stash@{2}",
        "Alice",
        "alice@test.com",
        1700000001,
        "WIP: feature C"
      ),
      ""
    ].join("\n");
    setupSpawnForStash(output);

    // When: getStashes(repo) is called
    const result = await ds.getStashes(REPO);

    // Then: 3 GitStash objects are returned with all required fields
    expect(result).toHaveLength(3);

    expect(result[0]).toEqual({
      hash: "aaa111",
      baseHash: "base111",
      untrackedFilesHash: "utr111",
      selector: "stash@{0}",
      author: "Alice",
      email: "alice@test.com",
      date: 1700000003,
      message: "WIP: feature A"
    });

    expect(result[1]).toEqual({
      hash: "aaa222",
      baseHash: "base222",
      untrackedFilesHash: null,
      selector: "stash@{1}",
      author: "Bob",
      email: "bob@test.com",
      date: 1700000002,
      message: "WIP: feature B"
    });

    expect(result[2]).toEqual({
      hash: "aaa333",
      baseHash: "base333",
      untrackedFilesHash: "utr333",
      selector: "stash@{2}",
      author: "Alice",
      email: "alice@test.com",
      date: 1700000001,
      message: "WIP: feature C"
    });
  });

  it("returns empty array when no stashes exist (TC-002)", async () => {
    // Given: refs/stash does not exist (git exits with code 128)
    setupSpawnForStash("", 128);

    // When: getStashes(repo) is called
    const result = await ds.getStashes(REPO);

    // Then: Empty array is returned (not an error)
    expect(result).toEqual([]);
  });

  it("parses single stash entry (TC-003)", async () => {
    // Given: Repository has exactly 1 stash (minimum valid count)
    const output = [
      makeStashLine(
        "sss111",
        "base111",
        "idx111",
        null,
        "stash@{0}",
        "Alice",
        "alice@test.com",
        1700000001,
        "single stash"
      ),
      ""
    ].join("\n");
    setupSpawnForStash(output);

    // When: getStashes(repo) is called
    const result = await ds.getStashes(REPO);

    // Then: 1 GitStash object is returned
    expect(result).toHaveLength(1);
    expect(result[0].hash).toBe("sss111");
    expect(result[0].selector).toBe("stash@{0}");
    expect(result[0].message).toBe("single stash");
  });

  it("returns empty array when git command fails (TC-004)", async () => {
    // Given: spawn emits an error event (simulating process spawn failure)
    setupSpawnForStash("", 0, true);

    // When: getStashes(repo) is called
    const result = await ds.getStashes(REPO);

    // Then: Empty array is returned (graceful fallback)
    expect(result).toEqual([]);
  });

  it("skips malformed lines with incorrect field count (TC-005)", async () => {
    // Given: Output contains a malformed line (3 fields) mixed with a valid line
    const malformedLine = ["hash_only", "parents", "selector"].join(SEP);
    const validLine = makeStashLine(
      "aaa111",
      "base111",
      "idx111",
      null,
      "stash@{0}",
      "Alice",
      "alice@test.com",
      1700000001,
      "valid stash"
    );
    const output = [malformedLine, validLine, ""].join("\n");
    setupSpawnForStash(output);

    // When: getStashes(repo) is called
    const result = await ds.getStashes(REPO);

    // Then: Only the valid line is parsed; malformed line is skipped
    expect(result).toHaveLength(1);
    expect(result[0].hash).toBe("aaa111");
  });

  it("skips lines with empty parent hashes (TC-006)", async () => {
    // Given: Output contains a line with empty parent hashes (line[1] === "")
    const emptyParentLine = [
      "hash111",
      "",
      "stash@{0}",
      "Author",
      "a@t.com",
      "1700000001",
      "msg"
    ].join(SEP);
    const validLine = makeStashLine(
      "aaa222",
      "base222",
      "idx222",
      null,
      "stash@{1}",
      "Bob",
      "bob@test.com",
      1700000002,
      "valid stash"
    );
    const output = [emptyParentLine, validLine, ""].join("\n");
    setupSpawnForStash(output);

    // When: getStashes(repo) is called
    const result = await ds.getStashes(REPO);

    // Then: Only the line with non-empty parents is parsed
    expect(result).toHaveLength(1);
    expect(result[0].hash).toBe("aaa222");
  });
});

describe("stash integration in getCommits", () => {
  let ds: DataSource;

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("attaches stash info when stash hash matches commit hash (TC-007)", async () => {
    // Given: Commit array has a commit whose hash matches a stash hash
    const commitHash = "abc123def456";
    const baseHash = "000111222333";
    const logOutput = [
      makeCommitLine(commitHash, baseHash, "Author", "a@t.com", 1700000002, "stash commit"),
      makeCommitLine(baseHash, "root000", "Author", "a@t.com", 1700000001, "base commit"),
      ""
    ].join("\n");
    const stashOutput = [
      makeStashLine(
        commitHash,
        baseHash,
        "idx111",
        null,
        "stash@{0}",
        "Author",
        "a@t.com",
        1700000002,
        "WIP"
      ),
      ""
    ].join("\n");
    setupSpawnForCommits({ logOutput, stashOutput });

    // When: getCommits is called
    const result = await ds.getCommits(REPO, [], 10, false, [], "date");

    // Then: The matching commit node has stash info attached
    const stashCommit = result.commits.find((c) => c.hash === commitHash);
    expect(stashCommit).toBeDefined();
    expect(stashCommit!.stash).toEqual({
      selector: "stash@{0}",
      baseHash: baseHash,
      untrackedFilesHash: null
    });
  });

  it("inserts stash node before base commit when baseHash matches (TC-008)", async () => {
    // Given: Stash's baseHash matches a commit, but stash hash is not in commits
    const baseHash = "base111222333";
    const stashHash = "sss111222333";
    const logOutput = [
      makeCommitLine("newer111", baseHash, "Author", "a@t.com", 1700000003, "newer"),
      makeCommitLine(baseHash, "root000", "Author", "a@t.com", 1700000001, "base"),
      ""
    ].join("\n");
    const stashOutput = [
      makeStashLine(
        stashHash,
        baseHash,
        "idx111",
        null,
        "stash@{0}",
        "Author",
        "a@t.com",
        1700000002,
        "WIP on main"
      ),
      ""
    ].join("\n");
    setupSpawnForCommits({ logOutput, stashOutput });

    // When: getCommits is called
    const result = await ds.getCommits(REPO, [], 10, false, [], "date");

    // Then: Stash node is inserted before the base commit
    expect(result.commits).toHaveLength(3);
    const stashIdx = result.commits.findIndex((c) => c.hash === stashHash);
    const baseIdx = result.commits.findIndex((c) => c.hash === baseHash);
    expect(stashIdx).toBeGreaterThanOrEqual(0);
    expect(stashIdx).toBeLessThan(baseIdx);
    expect(result.commits[stashIdx].stash).toEqual({
      selector: "stash@{0}",
      baseHash: baseHash,
      untrackedFilesHash: null
    });
    expect(result.commits[stashIdx].parentHashes).toEqual([baseHash]);
    expect(result.commits[stashIdx].message).toBe("WIP on main");
  });

  it("skips stash when neither hash nor baseHash is in commits (TC-009)", async () => {
    // Given: Stash hash and baseHash are both absent from the commit array
    const logOutput = [
      makeCommitLine("commit111", "root000", "Author", "a@t.com", 1700000001, "only commit"),
      ""
    ].join("\n");
    const stashOutput = [
      makeStashLine(
        "sss999",
        "notincommits",
        "idx111",
        null,
        "stash@{0}",
        "Author",
        "a@t.com",
        1700000002,
        "orphan stash"
      ),
      ""
    ].join("\n");
    setupSpawnForCommits({ logOutput, stashOutput });

    // When: getCommits is called
    const result = await ds.getCommits(REPO, [], 10, false, [], "date");

    // Then: Commit array is unchanged (stash is skipped)
    expect(result.commits).toHaveLength(1);
    expect(result.commits[0].hash).toBe("commit111");
    expect(result.commits[0].stash).toBeNull();
  });

  it("orders stashes with same baseHash by date descending (TC-010)", async () => {
    // Given: Two stashes with the same baseHash (newer date > older date)
    const baseHash = "base111";
    const newerHash = "stash_new";
    const olderHash = "stash_old";
    const logOutput = [
      makeCommitLine(baseHash, "root000", "Author", "a@t.com", 1700000001, "base commit"),
      ""
    ].join("\n");
    const stashOutput = [
      makeStashLine(
        olderHash,
        baseHash,
        "idx111",
        null,
        "stash@{1}",
        "Author",
        "a@t.com",
        1700000002,
        "older stash"
      ),
      makeStashLine(
        newerHash,
        baseHash,
        "idx222",
        null,
        "stash@{0}",
        "Author",
        "a@t.com",
        1700000003,
        "newer stash"
      ),
      ""
    ].join("\n");
    setupSpawnForCommits({ logOutput, stashOutput });

    // When: getCommits is called
    const result = await ds.getCommits(REPO, [], 10, false, [], "date");

    // Then: Newer stash appears before older stash (date descending)
    expect(result.commits).toHaveLength(3);
    const newerIdx = result.commits.findIndex((c) => c.hash === newerHash);
    const olderIdx = result.commits.findIndex((c) => c.hash === olderHash);
    expect(newerIdx).toBeLessThan(olderIdx);
  });

  it("returns commits unchanged when zero stashes exist (TC-011)", async () => {
    // Given: getStashes returns empty array (no stashes)
    const logOutput = [
      makeCommitLine("commit111", "root000", "Author", "a@t.com", 1700000002, "first"),
      makeCommitLine("commit222", "commit111", "Author", "a@t.com", 1700000001, "second"),
      ""
    ].join("\n");
    setupSpawnForCommits({ logOutput, stashOutput: "" });

    // When: getCommits is called
    const result = await ds.getCommits(REPO, [], 10, false, [], "date");

    // Then: Commits are returned as-is with no stash info
    expect(result.commits).toHaveLength(2);
    expect(result.commits[0].stash).toBeNull();
    expect(result.commits[1].stash).toBeNull();
  });

  it("inserts stashes at correct positions for different baseHashes (TC-012)", async () => {
    // Given: 3 stashes with different baseHashes matching different commits
    const commitA = "commit_aaa";
    const commitB = "commit_bbb";
    const commitC = "commit_ccc";
    const stashA = "stash_for_a";
    const stashB = "stash_for_b";
    const stashC = "stash_for_c";

    const logOutput = [
      makeCommitLine(commitA, commitB, "Author", "a@t.com", 1700000003, "commit A"),
      makeCommitLine(commitB, commitC, "Author", "a@t.com", 1700000002, "commit B"),
      makeCommitLine(commitC, "root000", "Author", "a@t.com", 1700000001, "commit C"),
      ""
    ].join("\n");
    const stashOutput = [
      makeStashLine(
        stashA,
        commitA,
        "idx111",
        null,
        "stash@{0}",
        "Author",
        "a@t.com",
        1700000006,
        "stash for A"
      ),
      makeStashLine(
        stashB,
        commitB,
        "idx222",
        null,
        "stash@{1}",
        "Author",
        "a@t.com",
        1700000005,
        "stash for B"
      ),
      makeStashLine(
        stashC,
        commitC,
        "idx333",
        null,
        "stash@{2}",
        "Author",
        "a@t.com",
        1700000004,
        "stash for C"
      ),
      ""
    ].join("\n");
    setupSpawnForCommits({ logOutput, stashOutput });

    // When: getCommits is called
    const result = await ds.getCommits(REPO, [], 10, false, [], "date");

    // Then: Each stash is inserted before its respective base commit
    expect(result.commits).toHaveLength(6);

    const idxStashA = result.commits.findIndex((c) => c.hash === stashA);
    const idxCommitA = result.commits.findIndex((c) => c.hash === commitA);
    const idxStashB = result.commits.findIndex((c) => c.hash === stashB);
    const idxCommitB = result.commits.findIndex((c) => c.hash === commitB);
    const idxStashC = result.commits.findIndex((c) => c.hash === stashC);
    const idxCommitC = result.commits.findIndex((c) => c.hash === commitC);

    expect(idxStashA).toBeLessThan(idxCommitA);
    expect(idxStashB).toBeLessThan(idxCommitB);
    expect(idxStashC).toBeLessThan(idxCommitC);

    expect(result.commits[idxStashA].stash).not.toBeNull();
    expect(result.commits[idxStashB].stash).not.toBeNull();
    expect(result.commits[idxStashC].stash).not.toBeNull();
  });
});

describe("root commit parentHashes parsing", () => {
  let ds: DataSource;

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty parentHashes array for root commit (TC-120)", async () => {
    // Given: A root commit with no parent (empty parentHash field from git log %P)
    const logOutput =
      makeCommitLine("abc111", "", "Alice", "a@t.com", 1700000001, "initial commit") + "\n";
    setupSpawnForCommits({ logOutput, stashOutput: "" });

    // When: getCommits is called
    const result = await ds.getCommits(REPO, [], 10, false, [], "date");

    // Then: Root commit has empty parentHashes array (not [""])
    expect(result.commits).toHaveLength(1);
    expect(result.commits[0].parentHashes).toEqual([]);
  });

  it("returns single-element parentHashes for normal commit (TC-121)", async () => {
    // Given: A normal commit with one parent
    const logOutput = [
      makeCommitLine("abc222", "abc111", "Alice", "a@t.com", 1700000002, "second commit"),
      makeCommitLine("abc111", "", "Alice", "a@t.com", 1700000001, "initial commit"),
      ""
    ].join("\n");
    setupSpawnForCommits({ logOutput, stashOutput: "" });

    // When: getCommits is called
    const result = await ds.getCommits(REPO, [], 10, false, [], "date");

    // Then: Normal commit has single parent, root commit has empty array
    expect(result.commits).toHaveLength(2);
    expect(result.commits[0].parentHashes).toEqual(["abc111"]);
    expect(result.commits[1].parentHashes).toEqual([]);
  });
});

describe("getCommitFile", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns file content for a valid commit hash (TC-013)", async () => {
    // Given: git show succeeds with file content
    const fileContent = "@extends('layouts.default')\n@section('title')";
    spawnMock.mockImplementation(() => createMockProcess(fileContent));

    // When: getCommitFile is called with a valid hash
    const result = await ds.getCommitFile(REPO, "abc123def456", "src/file.ts");

    // Then: returns the file content and passes correct args to git
    expect(result).toBe(fileContent);
    expect(spawnMock).toHaveBeenCalledWith("git", ["show", "abc123def456:src/file.ts"], SPAWN_OPTS);
  });

  it("returns file content for commit hash with ^ suffix (TC-014)", async () => {
    // Given: git show succeeds for parent commit
    const fileContent = "parent version content";
    spawnMock.mockImplementation(() => createMockProcess(fileContent));

    // When: getCommitFile is called with hash^ (parent commit syntax)
    const result = await ds.getCommitFile(REPO, "abc123def456^", "src/file.ts");

    // Then: passes the ^ suffix through to git show
    expect(result).toBe(fileContent);
    expect(spawnMock).toHaveBeenCalledWith(
      "git",
      ["show", "abc123def456^:src/file.ts"],
      SPAWN_OPTS
    );
  });

  it("returns empty string for invalid commit hash (TC-015)", async () => {
    // Given: an invalid commit hash containing non-hex characters
    // When: getCommitFile is called
    const result = await ds.getCommitFile(REPO, "not-a-valid-hash!", "src/file.ts");

    // Then: returns empty without spawning git
    expect(result).toBe("");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns empty string for path with .. traversal (TC-016)", async () => {
    // Given: a file path containing directory traversal
    // When: getCommitFile is called
    const result = await ds.getCommitFile(REPO, "abc123def456", "src/../../etc/passwd");

    // Then: returns empty without spawning git
    expect(result).toBe("");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns empty string when git show fails (TC-017)", async () => {
    // Given: git show exits with non-zero code (file doesn't exist at commit)
    spawnMock.mockImplementation(() => createMockProcess("", 128));

    // When: getCommitFile is called
    const result = await ds.getCommitFile(REPO, "abc123def456", "nonexistent/file.ts");

    // Then: returns empty string
    expect(result).toBe("");
  });

  it("rejects hash with only ^ (no base hash) (TC-018)", async () => {
    // Given: commit hash is just "^" (stripping ^ leaves empty string)
    // When: getCommitFile is called
    const result = await ds.getCommitFile(REPO, "^", "src/file.ts");

    // Then: returns empty without spawning git (empty string fails validation)
    expect(result).toBe("");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns file content for HEAD ref (TC-019)", async () => {
    // Given: git show HEAD:path succeeds with file content
    const fileContent = "content at HEAD";
    spawnMock.mockImplementation(() => createMockProcess(fileContent));

    // When: getCommitFile is called with "HEAD"
    const result = await ds.getCommitFile(REPO, "HEAD", "src/file.ts");

    // Then: returns the file content and passes correct args to git
    expect(result).toBe(fileContent);
    expect(spawnMock).toHaveBeenCalledWith("git", ["show", "HEAD:src/file.ts"], SPAWN_OPTS);
  });

  it("returns file content for HEAD^ ref (TC-020)", async () => {
    // Given: git show HEAD^:path succeeds with file content
    const fileContent = "content at HEAD parent";
    spawnMock.mockImplementation(() => createMockProcess(fileContent));

    // When: getCommitFile is called with "HEAD^"
    const result = await ds.getCommitFile(REPO, "HEAD^", "src/file.ts");

    // Then: returns the file content with HEAD^ passed through to git
    expect(result).toBe(fileContent);
    expect(spawnMock).toHaveBeenCalledWith("git", ["show", "HEAD^:src/file.ts"], SPAWN_OPTS);
  });
});

function createCommandMockProcess(
  options: {
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    emitError?: boolean;
  } = {}
) {
  const { stdout = "", stderr = "", exitCode = 0, emitError = false } = options;
  const stdoutEmitter = new EventEmitter();
  const stderrEmitter = new EventEmitter();
  const proc = new EventEmitter();
  Object.assign(proc, { stdout: stdoutEmitter, stderr: stderrEmitter });

  queueMicrotask(() => {
    if (emitError) {
      proc.emit("error", new Error("spawn error"));
      return;
    }
    if (stdout) stdoutEmitter.emit("data", stdout);
    if (stderr) stderrEmitter.emit("data", stderr);
    proc.emit("close", exitCode);
  });

  return proc as unknown as cp.ChildProcess;
}

describe("stash commands", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("applyStash passes correct args without --index (TC-021)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: applyStash(repo, "stash@{0}", false)
    const result = await ds.applyStash(REPO, "stash@{0}", false);

    // Then: spawn is called with ["stash", "apply", "stash@{0}"]
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["stash", "apply", "stash@{0}"], SPAWN_OPTS);
  });

  it("applyStash passes --index flag when reinstateIndex is true (TC-022)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: applyStash(repo, "stash@{0}", true)
    const result = await ds.applyStash(REPO, "stash@{0}", true);

    // Then: spawn is called with --index flag
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith(
      "git",
      ["stash", "apply", "--index", "stash@{0}"],
      SPAWN_OPTS
    );
  });

  it("popStash passes correct args without --index (TC-023)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: popStash(repo, "stash@{1}", false)
    const result = await ds.popStash(REPO, "stash@{1}", false);

    // Then: spawn is called with ["stash", "pop", "stash@{1}"]
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["stash", "pop", "stash@{1}"], SPAWN_OPTS);
  });

  it("popStash passes --index flag when reinstateIndex is true (TC-024)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: popStash(repo, "stash@{1}", true)
    const result = await ds.popStash(REPO, "stash@{1}", true);

    // Then: spawn is called with --index flag
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith(
      "git",
      ["stash", "pop", "--index", "stash@{1}"],
      SPAWN_OPTS
    );
  });

  it("dropStash passes correct args (TC-025)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: dropStash(repo, "stash@{2}")
    const result = await ds.dropStash(REPO, "stash@{2}");

    // Then: spawn is called with ["stash", "drop", "stash@{2}"]
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["stash", "drop", "stash@{2}"], SPAWN_OPTS);
  });

  it("branchFromStash passes correct args (TC-026)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: branchFromStash(repo, "my-branch", "stash@{0}")
    const result = await ds.branchFromStash(REPO, "my-branch", "stash@{0}");

    // Then: spawn is called with ["stash", "branch", "my-branch", "stash@{0}"]
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith(
      "git",
      ["stash", "branch", "my-branch", "stash@{0}"],
      SPAWN_OPTS
    );
  });

  it("returns error message when applyStash encounters a conflict (TC-027)", async () => {
    // Given: spawn outputs conflict message on stderr with non-zero exit
    spawnMock.mockImplementation(() =>
      createCommandMockProcess({
        stderr: "CONFLICT (content): Merge conflict in file.txt\n",
        exitCode: 1
      })
    );

    // When: applyStash is executed
    const result = await ds.applyStash(REPO, "stash@{0}", false);

    // Then: Error message string is returned (not null)
    expect(result).not.toBeNull();
    expect(result).toContain("CONFLICT");
  });

  it("returns error message when dropStash receives invalid selector (TC-028)", async () => {
    // Given: spawn outputs error on stderr with non-zero exit
    spawnMock.mockImplementation(() =>
      createCommandMockProcess({
        stderr: "error: stash@{99} is not a valid reference\n",
        exitCode: 1
      })
    );

    // When: dropStash is executed
    const result = await ds.dropStash(REPO, "stash@{99}");

    // Then: Error message string is returned
    expect(result).not.toBeNull();
    expect(result).toContain("error");
  });
});

describe("uncommitted commands", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- pushStash ---

  it("pushStash passes full options: message + includeUntracked (TC-029)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: pushStash(repo, "WIP message", true)
    const result = await ds.pushStash(REPO, "WIP message", true);

    // Then: spawn is called with ["stash", "push", "--message", "WIP message", "--include-untracked"]
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith(
      "git",
      ["stash", "push", "--message", "WIP message", "--include-untracked"],
      SPAWN_OPTS
    );
  });

  it("pushStash passes message only when includeUntracked is false (TC-030)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: pushStash(repo, "WIP message", false)
    const result = await ds.pushStash(REPO, "WIP message", false);

    // Then: spawn is called with ["stash", "push", "--message", "WIP message"]
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith(
      "git",
      ["stash", "push", "--message", "WIP message"],
      SPAWN_OPTS
    );
  });

  it("pushStash passes --include-untracked only when message is empty (TC-031)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: pushStash(repo, "", true)
    const result = await ds.pushStash(REPO, "", true);

    // Then: spawn is called with ["stash", "push", "--include-untracked"] (no --message flag)
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith(
      "git",
      ["stash", "push", "--include-untracked"],
      SPAWN_OPTS
    );
  });

  it("pushStash passes minimal args when message is empty and includeUntracked is false (TC-032)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: pushStash(repo, "", false)
    const result = await ds.pushStash(REPO, "", false);

    // Then: spawn is called with ["stash", "push"] only
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["stash", "push"], SPAWN_OPTS);
  });

  // --- resetUncommitted ---

  it("resetUncommitted passes correct args for mixed mode (TC-033)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: resetUncommitted(repo, "mixed")
    const result = await ds.resetUncommitted(REPO, "mixed");

    // Then: spawn is called with ["reset", "--mixed", "HEAD"]
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["reset", "--mixed", "HEAD"], SPAWN_OPTS);
  });

  it("resetUncommitted passes correct args for hard mode (TC-034)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: resetUncommitted(repo, "hard")
    const result = await ds.resetUncommitted(REPO, "hard");

    // Then: spawn is called with ["reset", "--hard", "HEAD"]
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["reset", "--hard", "HEAD"], SPAWN_OPTS);
  });

  it("resetUncommitted rejects soft mode (TC-035)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: resetUncommitted(repo, "soft")
    const result = await ds.resetUncommitted(REPO, "soft");

    // Then: Error is returned and git command is NOT executed
    expect(result).toBe("Invalid reset mode.");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("resetUncommitted rejects arbitrary invalid mode (TC-036)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: resetUncommitted(repo, "invalid")
    const result = await ds.resetUncommitted(REPO, "invalid");

    // Then: Error is returned and git command is NOT executed
    expect(result).toBe("Invalid reset mode.");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("resetUncommitted rejects empty string mode (TC-037)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: resetUncommitted(repo, "")
    const result = await ds.resetUncommitted(REPO, "");

    // Then: Error is returned and git command is NOT executed
    expect(result).toBe("Invalid reset mode.");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  // --- cleanUntrackedFiles ---

  it("cleanUntrackedFiles passes -f without -d when directories is false (TC-038)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: cleanUntrackedFiles(repo, false)
    const result = await ds.cleanUntrackedFiles(REPO, false);

    // Then: spawn is called with ["clean", "-f"]
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["clean", "-f"], SPAWN_OPTS);
  });

  it("cleanUntrackedFiles passes -f -d when directories is true (TC-039)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: cleanUntrackedFiles(repo, true)
    const result = await ds.cleanUntrackedFiles(REPO, true);

    // Then: spawn is called with ["clean", "-f", "-d"]
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["clean", "-f", "-d"], SPAWN_OPTS);
  });

  // --- Error handling ---

  it("pushStash returns error message when git command fails (TC-040)", async () => {
    // Given: spawn outputs error on stderr with non-zero exit
    spawnMock.mockImplementation(() =>
      createCommandMockProcess({
        stderr: "error: no local changes to save\n",
        exitCode: 1
      })
    );

    // When: pushStash is executed
    const result = await ds.pushStash(REPO, "", false);

    // Then: Error message string is returned (not null)
    expect(result).not.toBeNull();
    expect(result).toContain("no local changes to save");
  });

  it("cleanUntrackedFiles returns error message when git command fails (TC-041)", async () => {
    // Given: spawn outputs error on stderr with non-zero exit
    spawnMock.mockImplementation(() =>
      createCommandMockProcess({
        stderr: "fatal: clean.requireForce defaults to true\n",
        exitCode: 128
      })
    );

    // When: cleanUntrackedFiles is executed
    const result = await ds.cleanUntrackedFiles(REPO, false);

    // Then: Error message string is returned (not null)
    expect(result).not.toBeNull();
    expect(result).toContain("clean.requireForce");
  });
});

describe("fetch command", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetch passes correct args: ['fetch', '--all', '--prune'] (TC-042)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: fetch(repo) is called
    const result = await ds.fetch(REPO);

    // Then: spawn is called with ["fetch", "--all", "--prune"]
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["fetch", "--all", "--prune"], SPAWN_OPTS);
  });

  it("fetch returns null on success (TC-043)", async () => {
    // Given: spawn completes successfully (exit code 0)
    spawnMock.mockImplementation(() => createCommandMockProcess({ stdout: "From origin\n" }));

    // When: fetch(repo) is called
    const result = await ds.fetch(REPO);

    // Then: null is returned (GitCommandStatus success)
    expect(result).toBeNull();
  });

  it("fetch returns error message when network error occurs (TC-044)", async () => {
    // Given: spawn outputs error on stderr with non-zero exit
    spawnMock.mockImplementation(() =>
      createCommandMockProcess({
        stderr: "fatal: unable to access 'https://github.com/repo.git/': Could not resolve host\n",
        exitCode: 128
      })
    );

    // When: fetch is executed
    const result = await ds.fetch(REPO);

    // Then: Error message string is returned (not null)
    expect(result).not.toBeNull();
    expect(result).toContain("Could not resolve host");
  });

  it("fetch returns error message when spawn emits error event (TC-045)", async () => {
    // Given: spawn emits an error event (process spawn failure)
    spawnMock.mockImplementation(() => createCommandMockProcess({ emitError: true }));

    // When: fetch is executed
    const result = await ds.fetch(REPO);

    // Then: Error message string is returned (not null)
    expect(result).not.toBeNull();
  });
});

describe("getCommitComparison", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setupSpawnForComparison(nameStatusOutput: string, numStatOutput: string) {
    spawnMock.mockImplementation((_cmd: unknown, args: unknown) => {
      const argArray = args as string[];
      if (argArray.includes("--name-status")) {
        return createMockProcess(nameStatusOutput);
      }
      if (argArray.includes("--numstat")) {
        return createMockProcess(numStatOutput);
      }
      return createMockProcess("");
    });
  }

  // Case: TC-201
  it("parses a single modified file from NUL-delimited diff output (TC-201)", async () => {
    // Given: NUL-delimited name-status and numstat for one modified file
    const nameStatus = "M\0src/a.ts\0";
    const numStat = "3\t1\tsrc/a.ts\0";
    setupSpawnForComparison(nameStatus, numStat);

    // When: getCommitComparison is called with two valid hashes
    const result = await ds.getCommitComparison(REPO, "abc123def456", "def456abc123");

    // Then: the -z option is present and the file change is parsed via +2 / +1 cursors
    expect(result).toEqual([
      {
        oldFilePath: "src/a.ts",
        newFilePath: "src/a.ts",
        type: "M",
        additions: 3,
        deletions: 1
      }
    ]);
    const nameStatusCall = spawnMock.mock.calls.find((call) =>
      (call[1] as string[]).includes("--name-status")
    );
    expect((nameStatusCall![1] as string[]).includes("-z")).toBe(true);
  });

  // Case: TC-202
  it("parses a rename as a NUL triple-token in name-status and numstat (TC-202)", async () => {
    // Given: rename tokens R\0old\0new and numstat with an empty path field then old/new tokens
    const nameStatus = "R\0old.ts\0new.ts\0";
    const numStat = "2\t2\t\0old.ts\0new.ts\0";
    setupSpawnForComparison(nameStatus, numStat);

    // When: getCommitComparison is called
    const result = await ds.getCommitComparison(REPO, "abc123def456", "def456abc123");

    // Then: name-status advances +3 and numstat reads old/new via +3
    expect(result).toEqual([
      {
        oldFilePath: "old.ts",
        newFilePath: "new.ts",
        type: "R",
        additions: 2,
        deletions: 2
      }
    ]);
  });

  // Case: TC-203
  it("classifies all change types A/M/D/R from NUL tokens (TC-203)", async () => {
    // Given: one entry of each change type with matching numstat tokens
    const nameStatus = "A\0a.ts\0M\0m.ts\0D\0d.ts\0R\0o.ts\0r.ts\0";
    const numStat = "1\t0\ta.ts\0" + "2\t3\tm.ts\0" + "0\t5\td.ts\0" + "4\t4\t\0o.ts\0r.ts\0";
    setupSpawnForComparison(nameStatus, numStat);

    // When: getCommitComparison is called
    const result = await ds.getCommitComparison(REPO, "abc123def456", "def456abc123");

    // Then: each type is classified and counts come from numstat
    expect(result).toEqual([
      { oldFilePath: "a.ts", newFilePath: "a.ts", type: "A", additions: 1, deletions: 0 },
      { oldFilePath: "m.ts", newFilePath: "m.ts", type: "M", additions: 2, deletions: 3 },
      { oldFilePath: "d.ts", newFilePath: "d.ts", type: "D", additions: 0, deletions: 5 },
      { oldFilePath: "o.ts", newFilePath: "r.ts", type: "R", additions: 4, deletions: 4 }
    ]);
  });

  // Case: TC-204
  it("sets additions/deletions null for a non-numeric (binary) numstat row (TC-204)", async () => {
    // Given: a binary file whose numstat counts are "-" (non-numeric)
    const nameStatus = "M\0binary.png\0";
    const numStat = "-\t-\tbinary.png\0";
    setupSpawnForComparison(nameStatus, numStat);

    // When: getCommitComparison is called
    const result = await ds.getCommitComparison(REPO, "abc123def456", "def456abc123");

    // Then: parseInt("-") is NaN so additions/deletions become null
    expect(result).toEqual([
      {
        oldFilePath: "binary.png",
        newFilePath: "binary.png",
        type: "M",
        additions: null,
        deletions: null
      }
    ]);
  });

  // Case: TC-206
  it("breaks the parse loop on an invalid name-status status char (TC-206)", async () => {
    // Given: the first name-status token has a status char outside VALID_FILE_CHANGE_TYPES
    const nameStatus = "X\0src/x.ts\0M\0src/after.ts\0";
    const numStat = "";
    setupSpawnForComparison(nameStatus, numStat);

    // When: getCommitComparison is called
    const result = await ds.getCommitComparison(REPO, "abc123def456", "def456abc123");

    // Then: the cursor loop breaks immediately and no later entries are parsed
    expect(result).toEqual([]);
  });

  // Case: TC-207
  it("leaves additions/deletions null when numstat has no matching path (TC-207)", async () => {
    // Given: two name-status entries but numstat references an unrelated file
    const nameStatus = "M\0src/file1.ts\0A\0src/file2.ts\0";
    const numStat = "10\t5\tsrc/unrelated.ts\0";
    setupSpawnForComparison(nameStatus, numStat);

    // When: getCommitComparison is called
    const result = await ds.getCommitComparison(REPO, "abc123def456", "def456abc123");

    // Then: entries come from name-status with null counts (numstat orphan is ignored)
    expect(result).toEqual([
      {
        oldFilePath: "src/file1.ts",
        newFilePath: "src/file1.ts",
        type: "M",
        additions: null,
        deletions: null
      },
      {
        oldFilePath: "src/file2.ts",
        newFilePath: "src/file2.ts",
        type: "A",
        additions: null,
        deletions: null
      }
    ]);
  });

  // Case: TC-209
  it("returns null when git spawn throws an exception (TC-209)", async () => {
    // Given: cp.spawn throws synchronously (e.g., binary not found)
    spawnMock.mockImplementation(() => {
      throw new Error("spawn ENOENT");
    });

    // When: getCommitComparison is called
    const result = await ds.getCommitComparison(REPO, "abc123def456", "def456abc123");

    // Then: null is returned (caught by the try-catch block)
    expect(result).toBeNull();
  });

  it("returns null for invalid fromHash (non-hex characters)", async () => {
    // Given: fromHash contains invalid characters (not a valid commit hash)
    // When: getCommitComparison is called with invalid fromHash
    const result = await ds.getCommitComparison(REPO, "not-valid!", "abc123def456");

    // Then: Returns null without spawning git
    expect(result).toBeNull();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns null for invalid toHash (non-hex characters)", async () => {
    // Given: toHash contains invalid characters (not a valid commit hash)
    // When: getCommitComparison is called with invalid toHash
    const result = await ds.getCommitComparison(REPO, "abc123def456", "not-valid!");

    // Then: Returns null without spawning git
    expect(result).toBeNull();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  /* ---------------------------------------------------------------- */
  /* Untracked files integration (bugfix 27d2b61)                     */
  /* ---------------------------------------------------------------- */

  function setupSpawnForComparisonWithUntracked(
    nameStatusOutput: string,
    numStatOutput: string,
    untrackedOutput: string
  ) {
    spawnMock.mockImplementation((_cmd: unknown, args: unknown) => {
      const argArray = args as string[];
      if (argArray.includes("--name-status")) {
        return createMockProcess(nameStatusOutput);
      }
      if (argArray.includes("--numstat")) {
        return createMockProcess(numStatOutput);
      }
      if (argArray.includes("ls-files")) {
        return createMockProcess(untrackedOutput);
      }
      return createMockProcess("");
    });
  }

  // Case: TC-205
  it("runs ls-files and includes untracked files for a working-tree comparison (TC-205)", async () => {
    // Given: toHash is empty (working tree) with one modified file and one untracked file
    const nameStatus = "M\0src/a.ts\0";
    const numStat = "3\t1\tsrc/a.ts\0";
    const untracked = "src/new.ts\0";
    setupSpawnForComparisonWithUntracked(nameStatus, numStat, untracked);

    // When: getCommitComparison is called with an empty toHash
    const result = await ds.getCommitComparison(REPO, "abc123def456", "");

    // Then: 3 spawns run and the result includes the diff file plus the untracked file
    expect(result).toEqual([
      {
        oldFilePath: "src/a.ts",
        newFilePath: "src/a.ts",
        type: "M",
        additions: 3,
        deletions: 1
      },
      {
        oldFilePath: "src/new.ts",
        newFilePath: "src/new.ts",
        type: "A",
        additions: null,
        deletions: null
      }
    ]);
    expect(spawnMock).toHaveBeenCalledTimes(3);
  });

  // Case: TC-208
  it("deduplicates an untracked file already present in the diff output (TC-208)", async () => {
    // Given: working-tree comparison where an untracked file matches a diff newFilePath
    const nameStatus = "M\0src/file.ts\0";
    const numStat = "3\t1\tsrc/file.ts\0";
    const untracked = "src/file.ts\0";
    setupSpawnForComparisonWithUntracked(nameStatus, numStat, untracked);

    // When: getCommitComparison is called with UNCOMMITTED_CHANGES_HASH
    const result = await ds.getCommitComparison(REPO, UNCOMMITTED_CHANGES_HASH, "abc123def456");

    // Then: the file appears only once (fileLookup skips the duplicate)
    expect(result).toHaveLength(1);
    expect(result![0].type).toBe("M");
  });
});

/* ------------------------------------------------------------------ */
/* Tests: getUncommittedDetails (bugfix 27d2b61)                      */
/* ------------------------------------------------------------------ */

describe("getUncommittedDetails", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setupSpawnForUncommitted(
    nameStatusOutput: string,
    numStatOutput: string,
    untrackedOutput: string
  ) {
    spawnMock.mockImplementation((_cmd: unknown, args: unknown) => {
      const argArray = args as string[];
      if (argArray.includes("--name-status")) {
        return createMockProcess(nameStatusOutput);
      }
      if (argArray.includes("--numstat")) {
        return createMockProcess(numStatOutput);
      }
      if (argArray.includes("ls-files")) {
        return createMockProcess(untrackedOutput);
      }
      return createMockProcess("");
    });
  }

  // Case: TC-210
  it("parses NUL-delimited diff plus untracked files with 3 parallel spawns (TC-210)", async () => {
    // Given: staged/unstaged change and an untracked file (name-status/numstat are NUL-delimited)
    const nameStatus = "M\0src/modified.ts\0";
    const numStat = "10\t3\tsrc/modified.ts\0";
    const untracked = "src/newfile.ts\0";
    setupSpawnForUncommitted(nameStatus, numStat, untracked);

    // When: getUncommittedDetails is called
    const result = await ds.getUncommittedDetails(REPO);

    // Then: fileChanges holds the parsed diff file and the untracked file; 3 spawns ran
    expect(result).not.toBeNull();
    expect(result!.hash).toBe(UNCOMMITTED_CHANGES_HASH);
    expect(result!.fileChanges).toEqual([
      {
        oldFilePath: "src/modified.ts",
        newFilePath: "src/modified.ts",
        type: "M",
        additions: 10,
        deletions: 3
      },
      {
        oldFilePath: "src/newfile.ts",
        newFilePath: "src/newfile.ts",
        type: "A",
        additions: null,
        deletions: null
      }
    ]);
    expect(spawnMock).toHaveBeenCalledTimes(3);
  });

  // Case: TC-211
  it("parses a rename as a NUL triple-token in both name-status and numstat (TC-211)", async () => {
    // Given: a renamed file, numstat rename form has an empty path field then old/new tokens
    const nameStatus = "R\0a/old\0a/new\0";
    const numStat = "5\t0\t\0a/old\0a/new\0";
    const untracked = "";
    setupSpawnForUncommitted(nameStatus, numStat, untracked);

    // When: getUncommittedDetails is called
    const result = await ds.getUncommittedDetails(REPO);

    // Then: the rename entry carries distinct old/new paths and numstat counts
    expect(result).not.toBeNull();
    expect(result!.fileChanges).toEqual([
      {
        oldFilePath: "a/old",
        newFilePath: "a/new",
        type: "R",
        additions: 5,
        deletions: 0
      }
    ]);
  });

  // Case: TC-212
  it("returns diff changes only when there are no untracked files (TC-212)", async () => {
    // Given: NUL-delimited diff with no untracked files
    const nameStatus = "M\0src/file.ts\0";
    const numStat = "5\t2\tsrc/file.ts\0";
    const untracked = "";
    setupSpawnForUncommitted(nameStatus, numStat, untracked);

    // When: getUncommittedDetails is called
    const result = await ds.getUncommittedDetails(REPO);

    // Then: fileChanges contains only the diff file
    expect(result).not.toBeNull();
    expect(result!.fileChanges).toEqual([
      {
        oldFilePath: "src/file.ts",
        newFilePath: "src/file.ts",
        type: "M",
        additions: 5,
        deletions: 2
      }
    ]);
  });

  // Case: TC-213
  it("sets additions/deletions null for a binary rename with non-numeric numstat (TC-213)", async () => {
    // Given: a binary rename whose numstat counts are "-" (non-numeric)
    const nameStatus = "R\0old\0new\0";
    const numStat = "-\t-\t\0old\0new\0";
    const untracked = "";
    setupSpawnForUncommitted(nameStatus, numStat, untracked);

    // When: getUncommittedDetails is called
    const result = await ds.getUncommittedDetails(REPO);

    // Then: the rename is read via +3 and additions/deletions are null (NaN -> null)
    expect(result).not.toBeNull();
    expect(result!.fileChanges).toEqual([
      {
        oldFilePath: "old",
        newFilePath: "new",
        type: "R",
        additions: null,
        deletions: null
      }
    ]);
  });

  // Case: TC-214
  it("deduplicates an untracked file already present in the diff output (TC-214)", async () => {
    // Given: diff has a file, ls-files also lists the same file
    const nameStatus = "A\0src/file.ts\0";
    const numStat = "10\t0\tsrc/file.ts\0";
    const untracked = "src/file.ts\0";
    setupSpawnForUncommitted(nameStatus, numStat, untracked);

    // When: getUncommittedDetails is called
    const result = await ds.getUncommittedDetails(REPO);

    // Then: the file appears only once (fileLookup prevents the duplicate)
    expect(result).not.toBeNull();
    expect(result!.fileChanges).toHaveLength(1);
    expect(result!.fileChanges[0].type).toBe("A");
    expect(result!.fileChanges[0].additions).toBe(10);
  });

  // Case: TC-215
  it("breaks the parse loop on an invalid name-status status char (TC-215)", async () => {
    // Given: the first name-status token has a status char outside VALID_FILE_CHANGE_TYPES
    const nameStatus = "X\0foo\0";
    const numStat = "";
    const untracked = "";
    setupSpawnForUncommitted(nameStatus, numStat, untracked);

    // When: getUncommittedDetails is called
    const result = await ds.getUncommittedDetails(REPO);

    // Then: the cursor loop breaks and no file changes are parsed
    expect(result).not.toBeNull();
    expect(result!.fileChanges).toEqual([]);
  });

  // Case: TC-216
  it("skips empty tokens in ls-files output (TC-216)", async () => {
    // Given: ls-files output contains an empty token between valid paths
    const nameStatus = "M\0src/a.ts\0";
    const numStat = "1\t0\tsrc/a.ts\0";
    const untracked = "src/new1.ts\0\0src/new2.ts\0";
    setupSpawnForUncommitted(nameStatus, numStat, untracked);

    // When: getUncommittedDetails is called
    const result = await ds.getUncommittedDetails(REPO);

    // Then: the empty path is skipped, only valid untracked files are added
    expect(result).not.toBeNull();
    expect(result!.fileChanges).toHaveLength(3);
    expect(result!.fileChanges[1].newFilePath).toBe("src/new1.ts");
    expect(result!.fileChanges[2].newFilePath).toBe("src/new2.ts");
  });

  // Case: TC-217
  it("returns null when spawn throws an exception (TC-217)", async () => {
    // Given: cp.spawn throws synchronously
    spawnMock.mockImplementation(() => {
      throw new Error("spawn ENOENT");
    });

    // When: getUncommittedDetails is called
    const result = await ds.getUncommittedDetails(REPO);

    // Then: null is returned (caught by the try-catch block)
    expect(result).toBeNull();
  });
});

describe("checkoutBranch", () => {
  let ds: DataSource;

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses -B flag when checking out remote branch (TC-068)", async () => {
    // Given: A remote branch "origin/feature/x" and local branch name "feature/x"
    const mock = cp.spawn as unknown as ReturnType<typeof vi.fn>;
    mock.mockImplementation(() => createMockProcess("", 0));

    // When: checkoutBranch is called with a remote branch
    const result = await ds.checkoutBranch(REPO, "feature/x", "origin/feature/x");

    // Then: git is spawned with -B flag (uppercase) for force-create
    expect(mock).toHaveBeenCalledTimes(1);
    const args = mock.mock.calls[0][1];
    expect(args).toEqual(["checkout", "-B", "feature/x", "origin/feature/x"]);
    expect(result).toBeNull();
  });

  it("does not use -B flag when checking out local branch (TC-069)", async () => {
    // Given: A local branch "main" with remoteBranch = null
    const mock = cp.spawn as unknown as ReturnType<typeof vi.fn>;
    mock.mockImplementation(() => createMockProcess("", 0));

    // When: checkoutBranch is called with remoteBranch = null
    const result = await ds.checkoutBranch(REPO, "main", null);

    // Then: git is spawned with just "checkout main" (no -B flag)
    expect(mock).toHaveBeenCalledTimes(1);
    const args = mock.mock.calls[0][1];
    expect(args).toEqual(["checkout", "main"]);
    expect(result).toBeNull();
  });

  it("returns error message when git fails for invalid branch name (TC-070)", async () => {
    // Given: git spawn returns non-zero exit code with stderr message
    const mock = cp.spawn as unknown as ReturnType<typeof vi.fn>;
    mock.mockImplementation(() => {
      const stdoutEmitter = new EventEmitter();
      const stderrEmitter = new EventEmitter();
      const proc = new EventEmitter();
      Object.assign(proc, { stdout: stdoutEmitter, stderr: stderrEmitter });

      queueMicrotask(() => {
        stderrEmitter.emit("data", "fatal: 'origin/invalid..branch' is not a valid branch name\n");
        proc.emit("close", 128);
      });
      return proc as unknown as cp.ChildProcess;
    });

    // When: checkoutBranch is called with an invalid remote branch
    const result = await ds.checkoutBranch(REPO, "invalid..branch", "origin/invalid..branch");

    // Then: Error message string from git stderr is returned
    expect(result).toBe("fatal: 'origin/invalid..branch' is not a valid branch name");
  });
});

describe("pull command", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pull passes correct args: ['pull'] (TC-071)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: pull(repo) is called
    const result = await ds.pull(REPO);

    // Then: spawn is called with ["pull"] and correct cwd
    expect(spawnMock).toHaveBeenCalledWith("git", ["pull"], SPAWN_OPTS);
    expect(result).toBeNull();
  });

  it("pull returns null on success (TC-072)", async () => {
    // Given: spawn completes successfully (exit code 0)
    spawnMock.mockImplementation(() =>
      createCommandMockProcess({ stdout: "Already up to date.\n" })
    );

    // When: pull(repo) is called
    const result = await ds.pull(REPO);

    // Then: null is returned (GitCommandStatus success)
    expect(result).toBeNull();
  });

  it("pull returns error message on merge conflict (TC-073)", async () => {
    // Given: spawn outputs error on stderr with non-zero exit
    spawnMock.mockImplementation(() =>
      createCommandMockProcess({
        stderr: "error: Your local changes would be overwritten by merge.\n",
        exitCode: 1
      })
    );

    // When: pull is executed
    const result = await ds.pull(REPO);

    // Then: Error message string is returned (not null)
    expect(result).not.toBeNull();
    expect(result).toContain("Your local changes would be overwritten by merge");
  });
});

describe("push command", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("push passes correct args: ['push', '--set-upstream', 'origin', 'HEAD'] (TC-074)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: push(repo) is called
    const result = await ds.push(REPO);

    // Then: spawn is called with --set-upstream args and correct cwd
    expect(spawnMock).toHaveBeenCalledWith(
      "git",
      ["push", "--set-upstream", "origin", "HEAD"],
      SPAWN_OPTS
    );
    expect(result).toBeNull();
  });

  it("push returns null on success (TC-075)", async () => {
    // Given: spawn completes successfully (exit code 0)
    spawnMock.mockImplementation(() =>
      createCommandMockProcess({ stdout: "Everything up-to-date\n" })
    );

    // When: push(repo) is called
    const result = await ds.push(REPO);

    // Then: null is returned (GitCommandStatus success)
    expect(result).toBeNull();
  });

  it("push returns error message on rejection (TC-076)", async () => {
    // Given: spawn outputs error on stderr with non-zero exit
    spawnMock.mockImplementation(() =>
      createCommandMockProcess({
        stderr: "error: failed to push some refs to 'origin'\n",
        exitCode: 1
      })
    );

    // When: push is executed
    const result = await ds.push(REPO);

    // Then: Error message string is returned (not null)
    expect(result).not.toBeNull();
    expect(result).toContain("failed to push some refs");
  });

  it("push returns error message when upstream is not set (TC-077)", async () => {
    // Given: spawn outputs upstream error on stderr with non-zero exit
    spawnMock.mockImplementation(() =>
      createCommandMockProcess({
        stderr: "fatal: The current branch feature has no upstream branch.\n",
        exitCode: 128
      })
    );

    // When: push is executed
    const result = await ds.push(REPO);

    // Then: Error message about no upstream branch is returned
    expect(result).not.toBeNull();
    expect(result).toContain("has no upstream branch");
  });
});

describe("deleteRemoteBranch", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deletes remote branch with correct args: git push origin --delete feature/x (TC-078)", async () => {
    // Given: spawn completes successfully
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: deleteRemoteBranch is called with origin and feature/x
    const result = await ds.deleteRemoteBranch(REPO, "origin", "feature/x");

    // Then: spawn is called with correct args and returns null (success)
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith(
      "git",
      ["push", "origin", "--delete", "feature/x"],
      SPAWN_OPTS
    );
  });

  it("returns error message when git push --delete fails (TC-079)", async () => {
    // Given: spawn outputs error on stderr with non-zero exit
    spawnMock.mockImplementation(() =>
      createCommandMockProcess({
        stderr: "error: unable to delete 'feature/x': remote ref does not exist\n",
        exitCode: 1
      })
    );

    // When: deleteRemoteBranch is called
    const result = await ds.deleteRemoteBranch(REPO, "origin", "feature/x");

    // Then: error message string is returned (not null)
    expect(result).not.toBeNull();
    expect(result).toContain("remote ref does not exist");
  });

  it("deletes branch on non-origin remote: git push upstream --delete fix/bug-123 (TC-080)", async () => {
    // Given: spawn completes successfully
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: deleteRemoteBranch is called with upstream remote
    const result = await ds.deleteRemoteBranch(REPO, "upstream", "fix/bug-123");

    // Then: spawn is called with upstream as remote name and returns null
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith(
      "git",
      ["push", "upstream", "--delete", "fix/bug-123"],
      SPAWN_OPTS
    );
  });
});

describe("rebaseBranch", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rebases with correct args: git rebase main (TC-081)", async () => {
    // Given: spawn completes successfully
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: rebaseBranch is called with main
    const result = await ds.rebaseBranch(REPO, "main");

    // Then: spawn is called with correct args and returns null (success)
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["rebase", "main"], SPAWN_OPTS);
  });

  it("returns error message with abort hint on conflict (TC-082)", async () => {
    // Given: rebase encounters a conflict
    spawnMock.mockImplementation(() =>
      createCommandMockProcess({
        stderr:
          'CONFLICT (content): Merge conflict in src/file.ts\nerror: could not apply abc1234... commit message\nhint: Resolve all conflicts manually, mark them as resolved with\nhint: "git add/rm <conflicted_files>", then run "git rebase --continue".\nhint: You can instead skip this commit: "git rebase --skip"\nhint: To abort and get back to the state before "git rebase", run "git rebase --abort".\n',
        exitCode: 1
      })
    );

    // When: rebaseBranch is called
    const result = await ds.rebaseBranch(REPO, "main");

    // Then: error message contains conflict and abort guidance
    expect(result).not.toBeNull();
    expect(result).toContain("CONFLICT");
  });

  it("returns error message when working tree is dirty (TC-083)", async () => {
    // Given: working tree has uncommitted changes
    spawnMock.mockImplementation(() =>
      createCommandMockProcess({
        stderr:
          "error: cannot rebase: You have unstaged changes.\nerror: Please commit or stash them.\n",
        exitCode: 1
      })
    );

    // When: rebaseBranch is called
    const result = await ds.rebaseBranch(REPO, "main");

    // Then: error message about unstaged changes is returned
    expect(result).not.toBeNull();
    expect(result).toContain("unstaged changes");
  });
});

describe("getCommits authorFilter", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes --author=John Doe when authorFilter is specified (TC-084)", async () => {
    // Given: authorFilter is "John Doe"
    const logOutput = [
      makeCommitLine("abc123def456", "parent1aaa", "John Doe", "j@t.com", 1700000000, "msg"),
      ""
    ].join("\n");
    setupSpawnForCommits({ logOutput, stashOutput: "" });

    // When: getCommits is called with authorFilter
    await ds.getCommits(REPO, [], 10, false, ["John Doe"], "date");

    // Then: git log args include --author=John Doe
    const logCall = spawnMock.mock.calls.find((c) => (c[1] as string[])[0] === "log");
    expect(logCall).toBeDefined();
    const logArgs = logCall![1] as string[];
    expect(logArgs).toContain("--author=John Doe");
  });

  it("does not include --author when authorFilter is undefined (TC-085)", async () => {
    // Given: authorFilter is not specified
    const logOutput = [
      makeCommitLine("abc123def456", "parent1aaa", "Author", "a@t.com", 1700000000, "msg"),
      ""
    ].join("\n");
    setupSpawnForCommits({ logOutput, stashOutput: "" });

    // When: getCommits is called without authorFilter
    await ds.getCommits(REPO, [], 10, false, [], "date");

    // Then: git log args do not include --author
    const logCall = spawnMock.mock.calls.find((c) => (c[1] as string[])[0] === "log");
    expect(logCall).toBeDefined();
    const logArgs = logCall![1] as string[];
    expect(logArgs.some((a) => a.startsWith("--author"))).toBe(false);
  });

  it("does not include --author when authorFilter is empty string (TC-086)", async () => {
    // Given: authorFilter is an empty string
    const logOutput = [
      makeCommitLine("abc123def456", "parent1aaa", "Author", "a@t.com", 1700000000, "msg"),
      ""
    ].join("\n");
    setupSpawnForCommits({ logOutput, stashOutput: "" });

    // When: getCommits is called with empty authorFilter
    await ds.getCommits(REPO, [], 10, false, [], "date");

    // Then: git log args do not include --author
    const logCall = spawnMock.mock.calls.find((c) => (c[1] as string[])[0] === "log");
    expect(logCall).toBeDefined();
    const logArgs = logCall![1] as string[];
    expect(logArgs.some((a) => a.startsWith("--author"))).toBe(false);
  });

  it("safely passes special characters in authorFilter via spawnGit (TC-087)", async () => {
    // Given: authorFilter contains special characters
    const logOutput = [
      makeCommitLine("abc123def456", "parent1aaa", "Jane O'Brien", "j@t.com", 1700000000, "msg"),
      ""
    ].join("\n");
    setupSpawnForCommits({ logOutput, stashOutput: "" });

    // When: getCommits is called with special character authorFilter
    await ds.getCommits(REPO, [], 10, false, ["Jane O'Brien"], "date");

    // Then: --author flag contains the exact string (no escaping needed with spawn)
    const logCall = spawnMock.mock.calls.find((c) => (c[1] as string[])[0] === "log");
    expect(logCall).toBeDefined();
    const logArgs = logCall![1] as string[];
    expect(logArgs).toContain("--author=Jane O'Brien");
  });
});

describe("commitDetails stash diff handling", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses stash show -u for stash commits and returns untracked diff (TC-100)", async () => {
    // Given: commitHash exists in refs/stash and stash has untracked files
    const stashHash = "abc123def456";
    const detailsLine = [
      stashHash,
      "parent111 parent222 parent333",
      "Author Name",
      "author@example.com",
      "1700000000",
      "Committer Name",
      "committer@example.com"
    ].join(SEP);
    const detailsOutput = `${detailsLine}\nWIP on main: abc message\n`;
    const nameStatusOutput = "A\0untracked.txt\0";
    const numStatOutput = "1\t0\tuntracked.txt\0";

    spawnMock.mockImplementation((_cmd: unknown, args: unknown) => {
      const argArray = args as string[];
      if (argArray[0] === "show") return createMockProcess(detailsOutput);
      if (argArray[0] === "stash" && argArray.includes("--name-status")) {
        return createMockProcess(nameStatusOutput);
      }
      if (argArray[0] === "stash" && argArray.includes("--numstat")) {
        return createMockProcess(numStatOutput);
      }
      return createMockProcess("");
    });

    // When: commitDetails is called for a stash hash
    const result = await ds.commitDetails(REPO, stashHash, true, true);

    // Then: stash show output is parsed (single untracked file only)
    expect(result).not.toBeNull();
    expect(result!.fileChanges).toEqual([
      {
        oldFilePath: "untracked.txt",
        newFilePath: "untracked.txt",
        type: "A",
        additions: 1,
        deletions: 0
      }
    ]);

    const stashShowCalls = spawnMock.mock.calls.filter((call) => {
      const argArray = call[1] as string[];
      return argArray[0] === "stash" && argArray[1] === "show";
    });
    expect(stashShowCalls).toHaveLength(2);
    expect(stashShowCalls[0][1] as string[]).toContain("-u");
    expect(stashShowCalls[0][1] as string[]).toContain("-z");
    expect(stashShowCalls[1][1] as string[]).toContain("-u");
    expect(stashShowCalls[1][1] as string[]).toContain("-z");

    const diffTreeCalls = spawnMock.mock.calls.filter((call) => {
      const argArray = call[1] as string[];
      return argArray[0] === "diff-tree";
    });
    expect(diffTreeCalls).toHaveLength(0);
  });

  it("uses diff-tree for non-stash commits and ignores commit hash header lines (TC-101)", async () => {
    // Given: commitHash is not in refs/stash
    const commitHash = "def456abc123";
    const detailsLine = [
      commitHash,
      "parent111",
      "Author Name",
      "author@example.com",
      "1700000000",
      "Committer Name",
      "committer@example.com"
    ].join(SEP);
    const detailsOutput = `${detailsLine}\nregular commit\n`;
    const nameStatusOutput = commitHash + "\0M\0tracked.txt\0";
    const numStatOutput = commitHash + "\x001\t1\ttracked.txt\0";

    spawnMock.mockImplementation((_cmd: unknown, args: unknown) => {
      const argArray = args as string[];
      if (argArray[0] === "show") return createMockProcess(detailsOutput);
      if (argArray[0] === "diff-tree" && argArray.includes("--name-status")) {
        return createMockProcess(nameStatusOutput);
      }
      if (argArray[0] === "diff-tree" && argArray.includes("--numstat")) {
        return createMockProcess(numStatOutput);
      }
      return createMockProcess("");
    });

    // When: commitDetails is called for a regular (root) commit
    const result = await ds.commitDetails(REPO, commitHash, false, false);

    // Then: diff-tree output is parsed, while hash header is skipped
    expect(result).not.toBeNull();
    expect(result!.fileChanges).toEqual([
      {
        oldFilePath: "tracked.txt",
        newFilePath: "tracked.txt",
        type: "M",
        additions: 1,
        deletions: 1
      }
    ]);

    const diffTreeCalls = spawnMock.mock.calls.filter((call) => {
      const argArray = call[1] as string[];
      return argArray[0] === "diff-tree";
    });
    expect(diffTreeCalls).toHaveLength(2);
    expect(diffTreeCalls[0][1] as string[]).toContain("-z");
    expect(diffTreeCalls[1][1] as string[]).toContain("-z");

    const stashShowCalls = spawnMock.mock.calls.filter((call) => {
      const argArray = call[1] as string[];
      return argArray[0] === "stash" && argArray[1] === "show";
    });
    expect(stashShowCalls).toHaveLength(0);
  });

  it("returns empty parents array for root commit in commitDetails (TC-122)", async () => {
    // Given: A root commit with no parent (empty parents field from git show %P)
    const commitHash = "aaa111bbb222";
    const detailsLine = [
      commitHash,
      "", // empty parents field for root commit
      "Author Name",
      "author@example.com",
      "1700000000",
      "Committer Name",
      "committer@example.com"
    ].join(SEP);
    const detailsOutput = `${detailsLine}\ninitial commit\n`;
    const nameStatusOutput = commitHash + "\0A\0README.md\0";
    const numStatOutput = commitHash + "\x001\t0\tREADME.md\0";

    spawnMock.mockImplementation((_cmd: unknown, args: unknown) => {
      const argArray = args as string[];
      if (argArray[0] === "show") return createMockProcess(detailsOutput);
      if (argArray[0] === "diff-tree") {
        if (argArray.includes("--name-status")) return createMockProcess(nameStatusOutput);
        if (argArray.includes("--numstat")) return createMockProcess(numStatOutput);
      }
      return createMockProcess("");
    });

    // When: commitDetails is called for a root commit (hasParents=false)
    const result = await ds.commitDetails(REPO, commitHash, false, false);

    // Then: parents is empty array (not [""])
    expect(result).not.toBeNull();
    expect(result!.parents).toEqual([]);
  });
});

describe("commitDetails committerEmail", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setupSpawnForDetails(detailsOutput: string) {
    spawnMock.mockImplementation((_cmd: unknown, args: unknown) => {
      const argArray = args as string[];
      if (argArray[0] === "show") {
        return createMockProcess(detailsOutput);
      }
      return createMockProcess("");
    });
  }

  it("parses committerEmail from %ce field at index 6 (TC-088)", async () => {
    // Given: git show output includes committer email at index 6
    const detailsLine = [
      "abc123def456",
      "parent111bbb",
      "Author Name",
      "author@example.com",
      "1700000000",
      "Committer Name",
      "committer@example.com"
    ].join(SEP);
    const detailsOutput = `${detailsLine}\nCommit body message\n`;
    setupSpawnForDetails(detailsOutput);

    // When: commitDetails is called
    const result = await ds.commitDetails(REPO, "abc123def456", false, false);

    // Then: committerEmail is correctly parsed
    expect(result).not.toBeNull();
    expect(result!.committerEmail).toBe("committer@example.com");
  });

  it("sets committerEmail to empty string when field is empty (TC-089)", async () => {
    // Given: git show output has empty committer email
    const detailsLine = [
      "abc123def456",
      "parent111bbb",
      "Author Name",
      "author@example.com",
      "1700000000",
      "Committer Name",
      ""
    ].join(SEP);
    const detailsOutput = `${detailsLine}\nCommit body\n`;
    setupSpawnForDetails(detailsOutput);

    // When: commitDetails is called
    const result = await ds.commitDetails(REPO, "abc123def456", false, false);

    // Then: committerEmail is an empty string
    expect(result).not.toBeNull();
    expect(result!.committerEmail).toBe("");
  });

  it("preserves existing fields while adding committerEmail (TC-090)", async () => {
    // Given: git show output with all 7 fields
    const detailsLine = [
      "abc123def456",
      "parent111bbb parent222ccc",
      "Author Name",
      "author@example.com",
      "1700000000",
      "Committer Name",
      "committer@example.com"
    ].join(SEP);
    const detailsOutput = `${detailsLine}\nCommit body message\nSecond line\n`;
    setupSpawnForDetails(detailsOutput);

    // When: commitDetails is called
    const result = await ds.commitDetails(REPO, "abc123def456", false, false);

    // Then: all fields are correctly parsed including committerEmail
    expect(result).not.toBeNull();
    expect(result!.hash).toBe("abc123def456");
    expect(result!.parents).toEqual(["parent111bbb", "parent222ccc"]);
    expect(result!.author).toBe("Author Name");
    expect(result!.email).toBe("author@example.com");
    expect(result!.date).toBe(1700000000);
    expect(result!.committer).toBe("Committer Name");
    expect(result!.committerEmail).toBe("committer@example.com");
    expect(result!.body).toContain("Commit body message");
  });
});

describe("getAuthors", () => {
  let ds: DataSourceWithPrivate;

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource() as DataSourceWithPrivate;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 5 authors in alphabetical order (TC-091)", async () => {
    // Given: Repository has 5 authors in git shortlog output (unsorted)
    const output = "     3\tCharlie\n    12\tAlice\n     1\tEve\n     5\tBob\n     2\tDave\n";
    setupSpawnForStash(output);

    // When: getAuthors is called
    const result = await ds.getAuthors(REPO);

    // Then: 5 author names are returned in alphabetical order
    expect(result).toEqual(["Alice", "Bob", "Charlie", "Dave", "Eve"]);
  });

  it("returns empty array when HEAD is absent (TC-092)", async () => {
    // Given: Empty repository where git shortlog fails (exit code 128)
    setupSpawnForStash("", 128);

    // When: getAuthors is called
    const result = await ds.getAuthors(REPO);

    // Then: Empty array is returned via spawnGit errorValue fallback
    expect(result).toEqual([]);
  });

  it("returns single-element array for 1 author (TC-093)", async () => {
    // Given: Repository has only 1 author
    const output = "    42\tAlice\n";
    setupSpawnForStash(output);

    // When: getAuthors is called
    const result = await ds.getAuthors(REPO);

    // Then: 1-element array is returned
    expect(result).toEqual(["Alice"]);
  });

  it("returns empty array when git shortlog command fails (TC-094)", async () => {
    // Given: git shortlog command exits with non-zero code
    setupSpawnForStash("", 1);

    // When: getAuthors is called
    const result = await ds.getAuthors(REPO);

    // Then: Empty array is returned via spawnGit errorValue fallback
    expect(result).toEqual([]);
  });

  it("parses tab-separated count and author name correctly (TC-095)", async () => {
    // Given: shortlog output with tab-separated count and name
    const output = "     5\tAlice\n    12\tBob\n";
    setupSpawnForStash(output);

    // When: getAuthors is called
    const result = await ds.getAuthors(REPO);

    // Then: Count prefix is removed, only author names returned
    expect(result).toEqual(["Alice", "Bob"]);
  });

  it("returns empty array when shortlog output is empty (TC-096)", async () => {
    // Given: shortlog output is empty string (zero commits)
    setupSpawnForStash("");

    // When: getAuthors is called
    const result = await ds.getAuthors(REPO);

    // Then: Empty array is returned
    expect(result).toEqual([]);
  });

  it("preserves special characters in author names (TC-097)", async () => {
    // Given: Author names contain spaces and special characters
    const output = "     3\tJane O'Brien\n     1\tJohn Doe Jr.\n     2\tName With  Extra Spaces\n";
    setupSpawnForStash(output);

    // When: getAuthors is called
    const result = await ds.getAuthors(REPO);

    // Then: Special characters are preserved in author names
    expect(result).toEqual(["Jane O'Brien", "John Doe Jr.", "Name With  Extra Spaces"]);
  });

  it("returns empty array when spawn emits error event (TC-094 variant)", async () => {
    // Given: spawn emits an error event (e.g., git binary not found)
    setupSpawnForStash("", 0, true);

    // When: getAuthors is called
    const result = await ds.getAuthors(REPO);

    // Then: Empty array is returned via spawnGit errorValue fallback
    expect(result).toEqual([]);
  });

  it("calls spawnGit with correct arguments (TC-095 variant)", async () => {
    // Given: A valid repository path
    const spawnMock = cp.spawn as unknown as ReturnType<typeof vi.fn>;
    setupSpawnForStash("");

    // When: getAuthors is called
    await ds.getAuthors(REPO);

    // Then: spawn is called with ["shortlog", "-s", "HEAD"] and correct cwd
    expect(spawnMock).toHaveBeenCalledWith("git", ["shortlog", "-s", "HEAD"], SPAWN_OPTS);
  });
});

describe("getCommits authors integration", () => {
  let ds: DataSource;

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("includes authors field in getCommits return value (TC-098)", async () => {
    // Given: getAuthors returns a list of authors via shortlog output
    const logOutput =
      makeCommitLine("abc111", "", "Alice", "alice@test.com", 1700000001, "initial") + "\n";
    const authorsOutput = "     3\tAlice\n     1\tBob\n     2\tCharlie\n";
    setupSpawnForCommits({ logOutput, stashOutput: "", authorsOutput });

    // When: getCommits is called
    const result = await ds.getCommits(REPO, [], 10, false, [], "date");

    // Then: Return value contains authors field with sorted author list
    expect(result.authors).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("returns empty authors without affecting other results (TC-099)", async () => {
    // Given: getAuthors returns empty array (error fallback) while other data is valid
    const logOutput =
      makeCommitLine("abc111", "", "Alice", "alice@test.com", 1700000001, "initial") + "\n";
    const spawnMock = cp.spawn as unknown as ReturnType<typeof vi.fn>;
    spawnMock.mockImplementation((_cmd: unknown, args: unknown) => {
      const argArray = args as string[];
      const subcommand = argArray[0];
      if (subcommand === "log") {
        return createMockProcess(logOutput);
      }
      if (subcommand === "shortlog") {
        // Simulate error: non-zero exit code
        return createMockProcess("", 128);
      }
      return createMockProcess("");
    });

    // When: getCommits is called
    const result = await ds.getCommits(REPO, [], 10, false, [], "date");

    // Then: commits/head/moreCommitsAvailable are normal, authors is empty array
    expect(result.commits).toHaveLength(1);
    expect(result.commits[0].hash).toBe("abc111");
    expect(result.moreCommitsAvailable).toBe(false);
    expect(result.authors).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* S17: getGitLog branches array parameter                             */
/* ------------------------------------------------------------------ */

describe("getGitLog branches array parameter (S17)", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes multiple branch names as git log arguments (TC-100)", async () => {
    // Given: branches=["main","dev"]
    const logOutput = makeCommitLine("abc111", "", "Alice", "a@t.com", 1700000001, "msg") + "\n";
    setupSpawnForCommits({ logOutput, stashOutput: "" });

    // When: getCommits is called with multiple branches
    await ds.getCommits(REPO, ["main", "dev"], 10, false, [], "date");

    // Then: git log args contain "main" and "dev" but not --branches/--tags
    const logCall = spawnMock.mock.calls.find((c) => (c[1] as string[])[0] === "log");
    expect(logCall).toBeDefined();
    const logArgs = logCall![1] as string[];
    expect(logArgs).toContain("main");
    expect(logArgs).toContain("dev");
    expect(logArgs).not.toContain("--branches");
    expect(logArgs).not.toContain("--tags");
  });

  it("uses --branches --tags for empty branches array (TC-101)", async () => {
    // Given: branches=[]
    const logOutput = makeCommitLine("abc111", "", "Alice", "a@t.com", 1700000001, "msg") + "\n";
    setupSpawnForCommits({ logOutput, stashOutput: "" });

    // When: getCommits is called with empty branches
    await ds.getCommits(REPO, [], 10, false, [], "date");

    // Then: git log args contain --branches --tags
    const logCall = spawnMock.mock.calls.find((c) => (c[1] as string[])[0] === "log");
    expect(logCall).toBeDefined();
    const logArgs = logCall![1] as string[];
    expect(logArgs).toContain("--branches");
    expect(logArgs).toContain("--tags");
  });

  it("passes single branch name as git log argument (TC-102)", async () => {
    // Given: branches=["feature/x"]
    const logOutput = makeCommitLine("abc111", "", "Alice", "a@t.com", 1700000001, "msg") + "\n";
    setupSpawnForCommits({ logOutput, stashOutput: "" });

    // When: getCommits is called with single branch
    await ds.getCommits(REPO, ["feature/x"], 10, false, [], "date");

    // Then: git log args contain "feature/x"
    const logCall = spawnMock.mock.calls.find((c) => (c[1] as string[])[0] === "log");
    expect(logCall).toBeDefined();
    const logArgs = logCall![1] as string[];
    expect(logArgs).toContain("feature/x");
  });

  it("does not include --remotes when branches are specified (TC-103)", async () => {
    // Given: branches=["main","dev"], showRemoteBranches=true
    const logOutput = makeCommitLine("abc111", "", "Alice", "a@t.com", 1700000001, "msg") + "\n";
    setupSpawnForCommits({ logOutput, stashOutput: "" });

    // When: getCommits is called with branches and showRemoteBranches=true
    await ds.getCommits(REPO, ["main", "dev"], 10, true, [], "date");

    // Then: git log args contain branch names but NOT --remotes
    const logCall = spawnMock.mock.calls.find((c) => (c[1] as string[])[0] === "log");
    expect(logCall).toBeDefined();
    const logArgs = logCall![1] as string[];
    expect(logArgs).toContain("main");
    expect(logArgs).toContain("dev");
    expect(logArgs).not.toContain("--remotes");
  });

  it("includes --remotes for empty branches with showRemoteBranches=true (TC-104)", async () => {
    // Given: branches=[], showRemoteBranches=true
    const logOutput = makeCommitLine("abc111", "", "Alice", "a@t.com", 1700000001, "msg") + "\n";
    setupSpawnForCommits({ logOutput, stashOutput: "" });

    // When: getCommits is called with empty branches and showRemoteBranches=true
    await ds.getCommits(REPO, [], 10, true, [], "date");

    // Then: git log args contain --branches --tags --remotes
    const logCall = spawnMock.mock.calls.find((c) => (c[1] as string[])[0] === "log");
    expect(logCall).toBeDefined();
    const logArgs = logCall![1] as string[];
    expect(logArgs).toContain("--branches");
    expect(logArgs).toContain("--tags");
    expect(logArgs).toContain("--remotes");
  });

  it("does not include --remotes for empty branches with showRemoteBranches=false (TC-105)", async () => {
    // Given: branches=[], showRemoteBranches=false
    const logOutput = makeCommitLine("abc111", "", "Alice", "a@t.com", 1700000001, "msg") + "\n";
    setupSpawnForCommits({ logOutput, stashOutput: "" });

    // When: getCommits is called with empty branches and showRemoteBranches=false
    await ds.getCommits(REPO, [], 10, false, [], "date");

    // Then: git log args contain --branches --tags but NOT --remotes
    const logCall = spawnMock.mock.calls.find((c) => (c[1] as string[])[0] === "log");
    expect(logCall).toBeDefined();
    const logArgs = logCall![1] as string[];
    expect(logArgs).toContain("--branches");
    expect(logArgs).toContain("--tags");
    expect(logArgs).not.toContain("--remotes");
  });
});

/* ------------------------------------------------------------------ */
/* S18: getGitLog/getCommits authors array parameter                   */
/* ------------------------------------------------------------------ */

describe("getGitLog/getCommits authors array parameter (S18)", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes multiple --author flags for multiple authors (TC-106)", async () => {
    // Given: authors=["Alice","Bob"]
    const logOutput = makeCommitLine("abc111", "", "Alice", "a@t.com", 1700000001, "msg") + "\n";
    setupSpawnForCommits({ logOutput, stashOutput: "" });

    // When: getCommits is called with multiple authors
    await ds.getCommits(REPO, [], 10, false, ["Alice", "Bob"], "date");

    // Then: git log args contain both --author=Alice and --author=Bob
    const logCall = spawnMock.mock.calls.find((c) => (c[1] as string[])[0] === "log");
    expect(logCall).toBeDefined();
    const logArgs = logCall![1] as string[];
    expect(logArgs).toContain("--author=Alice");
    expect(logArgs).toContain("--author=Bob");
  });

  it("does not include --author when authors is empty (TC-107)", async () => {
    // Given: authors=[]
    const logOutput = makeCommitLine("abc111", "", "Alice", "a@t.com", 1700000001, "msg") + "\n";
    setupSpawnForCommits({ logOutput, stashOutput: "" });

    // When: getCommits is called with empty authors
    await ds.getCommits(REPO, [], 10, false, [], "date");

    // Then: git log args do not contain --author
    const logCall = spawnMock.mock.calls.find((c) => (c[1] as string[])[0] === "log");
    expect(logCall).toBeDefined();
    const logArgs = logCall![1] as string[];
    expect(logArgs.some((a) => a.startsWith("--author"))).toBe(false);
  });

  it("safely passes special characters via spawnGit (TC-108)", async () => {
    // Given: authors=["Jane O'Brien"]
    const logOutput =
      makeCommitLine("abc111", "", "Jane O'Brien", "j@t.com", 1700000001, "msg") + "\n";
    setupSpawnForCommits({ logOutput, stashOutput: "" });

    // When: getCommits is called with special character author
    await ds.getCommits(REPO, [], 10, false, ["Jane O'Brien"], "date");

    // Then: --author flag contains exact string (no shell injection via spawn)
    const logCall = spawnMock.mock.calls.find((c) => (c[1] as string[])[0] === "log");
    expect(logCall).toBeDefined();
    const logArgs = logCall![1] as string[];
    expect(logArgs).toContain("--author=Jane O'Brien");
  });

  it("passes single --author flag for single author (TC-109)", async () => {
    // Given: authors=["Alice"]
    const logOutput = makeCommitLine("abc111", "", "Alice", "a@t.com", 1700000001, "msg") + "\n";
    setupSpawnForCommits({ logOutput, stashOutput: "" });

    // When: getCommits is called with single author
    await ds.getCommits(REPO, [], 10, false, ["Alice"], "date");

    // Then: git log args contain exactly one --author=Alice
    const logCall = spawnMock.mock.calls.find((c) => (c[1] as string[])[0] === "log");
    expect(logCall).toBeDefined();
    const logArgs = logCall![1] as string[];
    expect(logArgs).toContain("--author=Alice");
    expect(logArgs.filter((a) => a.startsWith("--author")).length).toBe(1);
  });
});

describe("mergeBranch/mergeCommit squash/noCommit", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);
  const BRANCH = "feature/test";

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mergeBranch: createNewCommit=true, squash=false, noCommit=false → --no-ff (TC-110)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: mergeBranch with createNewCommit=true, no squash, no noCommit
    const result = await ds.mergeBranch(REPO, BRANCH, true, false, false);

    // Then: git merge --no-ff <branch>
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["merge", BRANCH, "--no-ff"], SPAWN_OPTS);
  });

  it("mergeBranch: createNewCommit=false, squash=false, noCommit=false → no flags (TC-111)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: mergeBranch with all flags false
    const result = await ds.mergeBranch(REPO, BRANCH, false, false, false);

    // Then: git merge <branch> (no flags)
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["merge", BRANCH], SPAWN_OPTS);
  });

  it("mergeBranch: createNewCommit=true, squash=true → --squash overrides --no-ff (TC-112)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: mergeBranch with squash=true overriding createNewCommit=true
    const result = await ds.mergeBranch(REPO, BRANCH, true, true, false);

    // Then: git merge --squash <branch> (no --no-ff)
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["merge", BRANCH, "--squash"], SPAWN_OPTS);
  });

  it("mergeBranch: createNewCommit=false, squash=true → --squash only (TC-113)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: mergeBranch with squash=true, createNewCommit=false
    const result = await ds.mergeBranch(REPO, BRANCH, false, true, false);

    // Then: git merge --squash <branch>
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["merge", BRANCH, "--squash"], SPAWN_OPTS);
  });

  it("mergeBranch: createNewCommit=true, noCommit=true → --no-ff --no-commit (TC-114)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: mergeBranch with createNewCommit=true, noCommit=true
    const result = await ds.mergeBranch(REPO, BRANCH, true, false, true);

    // Then: git merge --no-ff --no-commit <branch>
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith(
      "git",
      ["merge", BRANCH, "--no-ff", "--no-commit"],
      SPAWN_OPTS
    );
  });

  it("mergeBranch: createNewCommit=false, noCommit=true → --no-commit only (TC-115)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: mergeBranch with noCommit=true only
    const result = await ds.mergeBranch(REPO, BRANCH, false, false, true);

    // Then: git merge --no-commit <branch>
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["merge", BRANCH, "--no-commit"], SPAWN_OPTS);
  });

  it("mergeBranch: createNewCommit=true, squash=true, noCommit=true → --squash --no-commit (TC-116)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: mergeBranch with all flags true
    const result = await ds.mergeBranch(REPO, BRANCH, true, true, true);

    // Then: git merge --squash --no-commit <branch> (no --no-ff)
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith(
      "git",
      ["merge", BRANCH, "--squash", "--no-commit"],
      SPAWN_OPTS
    );
  });

  it("mergeBranch: squash=true, noCommit=true, createNewCommit=false → --squash --no-commit (TC-117)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: mergeBranch with squash + noCommit, createNewCommit=false
    const result = await ds.mergeBranch(REPO, BRANCH, false, true, true);

    // Then: git merge --squash --no-commit <branch>
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith(
      "git",
      ["merge", BRANCH, "--squash", "--no-commit"],
      SPAWN_OPTS
    );
  });

  it("mergeCommit: invalid commit hash with squash=true returns error (TC-118)", async () => {
    // Given: DataSource instance with invalid commit hash
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: mergeCommit with invalid hash
    const result = await ds.mergeCommit(REPO, "not-a-valid-hash!", true, true, true);

    // Then: Returns INVALID_COMMIT_HASH_MESSAGE without calling spawn
    expect(result).toBe("Invalid commit hash.");
    expect(spawnMock).not.toHaveBeenCalled();
  });
});

describe("cherrypickCommit recordOrigin/noCommit", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);
  const COMMIT = "abc123def456";

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parentIndex=0, recordOrigin=false, noCommit=false → basic cherry-pick (TC-119)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: cherrypickCommit with all defaults
    const result = await ds.cherrypickCommit(REPO, COMMIT, 0, false, false);

    // Then: git cherry-pick <hash>
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["cherry-pick", COMMIT], SPAWN_OPTS);
  });

  it("parentIndex=0, recordOrigin=true → -x flag (TC-120)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: cherrypickCommit with recordOrigin=true
    const result = await ds.cherrypickCommit(REPO, COMMIT, 0, true, false);

    // Then: git cherry-pick -x <hash>
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["cherry-pick", COMMIT, "-x"], SPAWN_OPTS);
  });

  it("parentIndex=0, noCommit=true → --no-commit flag (TC-121)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: cherrypickCommit with noCommit=true
    const result = await ds.cherrypickCommit(REPO, COMMIT, 0, false, true);

    // Then: git cherry-pick --no-commit <hash>
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith(
      "git",
      ["cherry-pick", COMMIT, "--no-commit"],
      SPAWN_OPTS
    );
  });

  it("parentIndex=0, recordOrigin=true, noCommit=true → both flags (TC-122)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: cherrypickCommit with both flags true
    const result = await ds.cherrypickCommit(REPO, COMMIT, 0, true, true);

    // Then: git cherry-pick -x --no-commit <hash>
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith(
      "git",
      ["cherry-pick", COMMIT, "-x", "--no-commit"],
      SPAWN_OPTS
    );
  });

  it("parentIndex=2, recordOrigin=true, noCommit=true → merge commit full flags (TC-123)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: cherrypickCommit with merge commit (parentIndex=2) and all flags
    const result = await ds.cherrypickCommit(REPO, COMMIT, 2, true, true);

    // Then: git cherry-pick -m 2 -x --no-commit <hash>
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith(
      "git",
      ["cherry-pick", COMMIT, "-m", "2", "-x", "--no-commit"],
      SPAWN_OPTS
    );
  });

  it("invalid commit hash with recordOrigin=true returns error (TC-124)", async () => {
    // Given: DataSource instance with invalid commit hash
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: cherrypickCommit with invalid hash
    const result = await ds.cherrypickCommit(REPO, "not-valid!", 0, true, false);

    // Then: Returns INVALID_COMMIT_HASH_MESSAGE without calling spawn
    expect(result).toBe("Invalid commit hash.");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("parentIndex=-1 returns invalid parent index error (TC-125)", async () => {
    // Given: DataSource instance with negative parentIndex
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: cherrypickCommit with parentIndex=-1
    const result = await ds.cherrypickCommit(REPO, COMMIT, -1, false, false);

    // Then: Returns "Invalid parent index." without calling spawn
    expect(result).toBe("Invalid parent index.");
    expect(spawnMock).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/* S21: getGitLog() コミット表示順序（commitOrdering パラメータ）      */
/* ------------------------------------------------------------------ */

describe("getGitLog() commit ordering parameter (S21)", () => {
  let ds: DataSource;

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  it('commitOrdering="date" passes --date-order to git log (TC-126)', async () => {
    // Given: DataSource with commitOrdering="date"
    const commitLine = makeCommitLine("abc1234", "", "Alice", "alice@test.com", 1000, "commit 1");
    setupSpawnForCommits({
      logOutput: `${commitLine}\n`,
      stashOutput: ""
    });

    // When: getCommits is called with commitOrdering="date"
    await ds.getCommits(REPO, [], 10, false, [], "date");

    // Then: spawn is called with --date-order in args
    const spawnMock = cp.spawn as unknown as ReturnType<typeof vi.fn>;
    const logCall = spawnMock.mock.calls.find(
      (call: unknown[]) => (call[1] as string[])[0] === "log"
    );
    expect(logCall).toBeDefined();
    expect(logCall![1] as string[]).toContain("--date-order");
  });

  it('commitOrdering="topo" passes --topo-order to git log (TC-127)', async () => {
    // Given: DataSource with commitOrdering="topo"
    const commitLine = makeCommitLine("abc1234", "", "Alice", "alice@test.com", 1000, "commit 1");
    setupSpawnForCommits({
      logOutput: `${commitLine}\n`,
      stashOutput: ""
    });

    // When: getCommits is called with commitOrdering="topo"
    await ds.getCommits(REPO, [], 10, false, [], "topo");

    // Then: spawn is called with --topo-order in args
    const spawnMock = cp.spawn as unknown as ReturnType<typeof vi.fn>;
    const logCall = spawnMock.mock.calls.find(
      (call: unknown[]) => (call[1] as string[])[0] === "log"
    );
    expect(logCall).toBeDefined();
    expect(logCall![1] as string[]).toContain("--topo-order");
  });

  it('commitOrdering="author-date" passes --author-date-order to git log (TC-128)', async () => {
    // Given: DataSource with commitOrdering="author-date"
    const commitLine = makeCommitLine("abc1234", "", "Alice", "alice@test.com", 1000, "commit 1");
    setupSpawnForCommits({
      logOutput: `${commitLine}\n`,
      stashOutput: ""
    });

    // When: getCommits is called with commitOrdering="author-date"
    await ds.getCommits(REPO, [], 10, false, [], "author-date");

    // Then: spawn is called with --author-date-order in args
    const spawnMock = cp.spawn as unknown as ReturnType<typeof vi.fn>;
    const logCall = spawnMock.mock.calls.find(
      (call: unknown[]) => (call[1] as string[])[0] === "log"
    );
    expect(logCall).toBeDefined();
    expect(logCall![1] as string[]).toContain("--author-date-order");
  });

  it("COMMIT_ORDER_FLAGS covers all CommitOrdering values (TC-129)", () => {
    // Given: All valid CommitOrdering values
    const allOrderings: CommitOrdering[] = ["date", "topo", "author-date"];

    // When: Checking COMMIT_ORDER_FLAGS keys
    // Then: All CommitOrdering values are present as keys with correct flag values
    expect(Object.keys(COMMIT_ORDER_FLAGS).sort()).toEqual(allOrderings.sort());
    expect(COMMIT_ORDER_FLAGS["date"]).toBe("--date-order");
    expect(COMMIT_ORDER_FLAGS["topo"]).toBe("--topo-order");
    expect(COMMIT_ORDER_FLAGS["author-date"]).toBe("--author-date-order");
  });

  it("getCommits passes commitOrdering to getGitLog (TC-130)", async () => {
    // Given: DataSource instance
    const commitLine = makeCommitLine("abc1234", "", "Alice", "alice@test.com", 1000, "commit 1");
    setupSpawnForCommits({
      logOutput: `${commitLine}\n`,
      stashOutput: ""
    });

    // When: getCommits is called with commitOrdering="topo"
    await ds.getCommits(REPO, [], 10, false, [], "topo");

    // Then: git log spawn args contain --topo-order (proving passthrough)
    const spawnMock = cp.spawn as unknown as ReturnType<typeof vi.fn>;
    const logCall = spawnMock.mock.calls.find(
      (call: unknown[]) => (call[1] as string[])[0] === "log"
    );
    expect(logCall).toBeDefined();
    expect(logCall![1] as string[]).toContain("--topo-order");
    expect(logCall![1] as string[]).not.toContain("--date-order");
  });

  it('commitOrdering="date" produces same args as previous hardcoded --date-order (TC-131)', async () => {
    // Given: DataSource with default commitOrdering="date"
    const commitLine = makeCommitLine("abc1234", "", "Alice", "alice@test.com", 1000, "commit 1");
    setupSpawnForCommits({
      logOutput: `${commitLine}\n`,
      stashOutput: ""
    });

    // When: getCommits is called with commitOrdering="date"
    await ds.getCommits(REPO, [], 10, false, [], "date");

    // Then: git log args include --date-order (backward compatible with v0.5.4)
    const spawnMock = cp.spawn as unknown as ReturnType<typeof vi.fn>;
    const logCall = spawnMock.mock.calls.find(
      (call: unknown[]) => (call[1] as string[])[0] === "log"
    );
    expect(logCall).toBeDefined();
    const logArgs = logCall![1] as string[];
    expect(logArgs).toContain("--date-order");
    expect(logArgs).not.toContain("--topo-order");
    expect(logArgs).not.toContain("--author-date-order");
  });
});

describe("getWorktrees", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed worktree map on spawnGit success (TC-132)", async () => {
    // Given: spawnGit succeeds with porcelain output containing main + feature branch
    const porcelainOutput = [
      "worktree /home/user/project",
      "HEAD abc1234",
      "branch refs/heads/main",
      "",
      "worktree /home/user/project-feature",
      "HEAD def5678",
      "branch refs/heads/feature/x",
      ""
    ].join("\n");
    spawnMock.mockImplementation(() => createMockProcess(porcelainOutput));

    // When: getWorktrees(repo) is called
    const result = await ds.getWorktrees(REPO);

    // Then: parseWorktreeList result is returned with correct args
    expect(result).toEqual({
      main: { path: "/home/user/project", isMain: true },
      "feature/x": { path: "/home/user/project-feature", isMain: false }
    });
    expect(spawnMock).toHaveBeenCalledWith("git", ["worktree", "list", "--porcelain"], SPAWN_OPTS);
  });

  it("returns empty map when spawnGit fails (TC-133)", async () => {
    // Given: spawnGit fails with non-zero exit code
    spawnMock.mockImplementation(() => createMockProcess("", 1));

    // When: getWorktrees(repo) is called
    const result = await ds.getWorktrees(REPO);

    // Then: empty map is returned as fallback
    expect(result).toEqual({});
  });

  it("returns single entry map for main worktree only (TC-134)", async () => {
    // Given: Repository has only the main worktree (no additional worktrees)
    const porcelainOutput = [
      "worktree /home/user/project",
      "HEAD abc1234",
      "branch refs/heads/main",
      ""
    ].join("\n");
    spawnMock.mockImplementation(() => createMockProcess(porcelainOutput));

    // When: getWorktrees(repo) is called
    const result = await ds.getWorktrees(REPO);

    // Then: single entry with isMain=true
    expect(result).toEqual({
      main: { path: "/home/user/project", isMain: true }
    });
  });
});

describe("getRepositoryStateWatchPaths", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  type RevParsePlan = {
    emitError?: boolean;
    exitCode?: number;
    stdout?: string;
  };

  function setupRevParse(plans: { gitCommonDir?: RevParsePlan; gitDir?: RevParsePlan }) {
    spawnMock.mockImplementation((_cmd, args) => {
      const argList = args as string[];
      if (argList[0] !== "rev-parse") {
        return createMockProcess("");
      }
      if (argList[1] === "--git-dir") {
        const plan = plans.gitDir ?? { stdout: "" };
        return createMockProcess(plan.stdout ?? "", plan.exitCode ?? 0, plan.emitError ?? false);
      }
      if (argList[1] === "--git-common-dir") {
        const plan = plans.gitCommonDir ?? { stdout: "" };
        return createMockProcess(plan.stdout ?? "", plan.exitCode ?? 0, plan.emitError ?? false);
      }
      return createMockProcess("");
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns one absolute watch path for a main worktree with duplicate relative git dirs (TC-150)", async () => {
    // Case: TC-150
    // Given: rev-parse returns the same relative .git path for git-dir and git-common-dir
    setupRevParse({
      gitDir: { stdout: ".git\n" },
      gitCommonDir: { stdout: ".git\n" }
    });

    // When: getRepositoryStateWatchPaths(repo) is called
    const result = await ds.getRepositoryStateWatchPaths(REPO);

    // Then: One deduplicated absolute watch path is returned and both rev-parse commands are executed once
    expect(result).toEqual([`${REPO}/.git`]);
    expect(spawnMock).toHaveBeenCalledTimes(2);
    expect(spawnMock).toHaveBeenNthCalledWith(1, "git", ["rev-parse", "--git-dir"], SPAWN_OPTS);
    expect(spawnMock).toHaveBeenNthCalledWith(
      2,
      "git",
      ["rev-parse", "--git-common-dir"],
      SPAWN_OPTS
    );
  });

  it("returns both linked worktree git-dir and shared common-dir in call order (TC-151)", async () => {
    // Case: TC-151
    // Given: rev-parse returns distinct absolute paths for linked worktree and shared common-dir
    setupRevParse({
      gitDir: { stdout: "/main/.git/worktrees/feature-x\n" },
      gitCommonDir: { stdout: "/main/.git\n" }
    });

    // When: getRepositoryStateWatchPaths(repo) is called
    const result = await ds.getRepositoryStateWatchPaths(REPO);

    // Then: Both absolute paths are returned with the worktree-specific git-dir first
    expect(result).toEqual(["/main/.git/worktrees/feature-x", "/main/.git"]);
  });

  it("normalises mixed relative and absolute rev-parse outputs to absolute paths (TC-152)", async () => {
    // Case: TC-152
    // Given: rev-parse returns a relative git-dir and an absolute git-common-dir
    setupRevParse({
      gitDir: { stdout: "./.git/worktrees/feature-x\n" },
      gitCommonDir: { stdout: "/shared/repo/.git\n" }
    });

    // When: getRepositoryStateWatchPaths(repo) is called
    const result = await ds.getRepositoryStateWatchPaths(REPO);

    // Then: The relative value is resolved from repo and the absolute value is preserved
    expect(result).toEqual([`${REPO}/.git/worktrees/feature-x`, "/shared/repo/.git"]);
  });

  it("falls back to the git-dir path when git-common-dir resolution fails (TC-153)", async () => {
    // Case: TC-153
    // Given: git-dir succeeds and git-common-dir exits non-zero
    setupRevParse({
      gitDir: { stdout: ".git\n" },
      gitCommonDir: { exitCode: 128, stdout: "" }
    });

    // When: getRepositoryStateWatchPaths(repo) is called
    const result = await ds.getRepositoryStateWatchPaths(REPO);

    // Then: Only the resolved git-dir path is returned
    expect(result).toEqual([`${REPO}/.git`]);
  });

  it("falls back to the git-common-dir path when git-dir resolution fails (TC-154)", async () => {
    // Case: TC-154
    // Given: git-dir emits an error and git-common-dir succeeds
    setupRevParse({
      gitDir: { emitError: true },
      gitCommonDir: { stdout: "/main/.git\n" }
    });

    // When: getRepositoryStateWatchPaths(repo) is called
    const result = await ds.getRepositoryStateWatchPaths(REPO);

    // Then: Only the git-common-dir path is returned
    expect(result).toEqual(["/main/.git"]);
  });

  it("returns an empty array when both rev-parse commands fail (TC-155)", async () => {
    // Case: TC-155
    // Given: Both rev-parse commands fail to resolve watch paths
    setupRevParse({
      gitDir: { exitCode: 128 },
      gitCommonDir: { emitError: true }
    });

    // When: getRepositoryStateWatchPaths(repo) is called
    const result = await ds.getRepositoryStateWatchPaths(REPO);

    // Then: An empty watch root array is returned as the fallback
    expect(result).toEqual([]);
  });
});

describe("addWorktree", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes ["worktree", "add", path, branchName] when commitHash is undefined (TC-135)', async () => {
    // Given: addWorktree called with existing branch (no commitHash)
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: addWorktree(repo, path, branchName) is called without commitHash
    const result = await ds.addWorktree(REPO, "/tmp/wt", "feature/x");

    // Then: spawn is called with correct args for existing branch
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith(
      "git",
      ["worktree", "add", "/tmp/wt", "feature/x"],
      SPAWN_OPTS
    );
  });

  it('passes ["worktree", "add", "-b", branchName, path, commitHash] when commitHash is provided (TC-136)', async () => {
    // Given: addWorktree called with new branch from commit
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: addWorktree(repo, path, branchName, commitHash) is called
    const result = await ds.addWorktree(REPO, "/tmp/wt", "new-branch", "abc1234");

    // Then: spawn is called with -b flag and commitHash
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith(
      "git",
      ["worktree", "add", "-b", "new-branch", "/tmp/wt", "abc1234"],
      SPAWN_OPTS
    );
  });

  it("returns null on success (TC-137)", async () => {
    // Given: spawn completes successfully (exit code 0)
    spawnMock.mockImplementation(() =>
      createCommandMockProcess({ stdout: "Preparing worktree\n" })
    );

    // When: addWorktree is called
    const result = await ds.addWorktree(REPO, "/tmp/wt", "feature/y");

    // Then: null is returned (GitCommandStatus success)
    expect(result).toBeNull();
  });

  it("returns error message for duplicate branch name (TC-138)", async () => {
    // Given: git worktree add fails because branch already exists
    spawnMock.mockImplementation(() =>
      createCommandMockProcess({
        stderr: "fatal: a branch named 'feature/x' already exists\n",
        exitCode: 128
      })
    );

    // When: addWorktree is called with an existing branch name
    const result = await ds.addWorktree(REPO, "/tmp/wt", "feature/x", "abc1234");

    // Then: error message string is returned
    expect(result).not.toBeNull();
    expect(result).toContain("already exists");
  });

  it("returns error message for existing path (TC-139)", async () => {
    // Given: git worktree add fails because path already exists
    spawnMock.mockImplementation(() =>
      createCommandMockProcess({
        stderr: "fatal: '/tmp/wt' already exists\n",
        exitCode: 128
      })
    );

    // When: addWorktree is called with an existing path
    const result = await ds.addWorktree(REPO, "/tmp/wt", "feature/z");

    // Then: error message string is returned
    expect(result).not.toBeNull();
    expect(result).toContain("already exists");
  });
});

describe("removeWorktree", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes ["worktree", "remove", worktreePath] and returns null on success (TC-140)', async () => {
    // Given: removeWorktree called with a valid worktree path
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: removeWorktree(repo, worktreePath) is called
    const result = await ds.removeWorktree(REPO, "/tmp/wt");

    // Then: spawn is called with correct args and null is returned
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["worktree", "remove", "/tmp/wt"], SPAWN_OPTS);
  });

  it("returns error message when worktree has uncommitted changes (TC-141)", async () => {
    // Given: git worktree remove fails due to uncommitted changes
    spawnMock.mockImplementation(() =>
      createCommandMockProcess({
        stderr: "fatal: '/tmp/wt' contains modified or untracked files, use --force to delete it\n",
        exitCode: 128
      })
    );

    // When: removeWorktree is called on a dirty worktree
    const result = await ds.removeWorktree(REPO, "/tmp/wt");

    // Then: error message string is returned
    expect(result).not.toBeNull();
    expect(result).toContain("modified or untracked");
  });
});

// S27: getNewPathOfRenamedFile() リネーム追跡（pathspec 除去 + name-status カーソルパース）
describe("getNewPathOfRenamedFile (S27)", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);
  const VALID_HASH = "abc123def456";

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the new path for a single matching rename record (TC-156)", async () => {
    // Case: TC-156
    // Given: name-status output with one R record whose old path matches
    spawnMock.mockImplementation(() =>
      createCommandMockProcess({ stdout: "R100\0old.ts\0new.ts\0" })
    );

    // When: getNewPathOfRenamedFile is called for old.ts
    const result = await ds.getNewPathOfRenamedFile(REPO, VALID_HASH, "old.ts");

    // Then: the new path from fields[2] is returned
    expect(result).toBe("new.ts");
  });

  it("invokes git diff with --name-status and no pathspec (TC-157)", async () => {
    // Case: TC-157
    // Given: valid inputs and empty git diff output
    spawnMock.mockImplementation(() => createCommandMockProcess({ stdout: "" }));

    // When: getNewPathOfRenamedFile is called
    await ds.getNewPathOfRenamedFile(REPO, VALID_HASH, "old.ts");

    // Then: spawn is called with name-status args and no trailing "--"/oldFilePath pathspec
    expect(spawnMock).toHaveBeenCalledWith(
      "git",
      ["diff", "--name-status", "--diff-filter=R", "--find-renames", "-z", VALID_HASH, "HEAD"],
      SPAWN_OPTS
    );
    const passedArgs = spawnMock.mock.calls[0][1] as string[];
    expect(passedArgs).not.toContain("--");
    expect(passedArgs).not.toContain("old.ts");
  });

  it("advances the cursor past non-matching records to find a later match (TC-158)", async () => {
    // Case: TC-158
    // Given: two R records where only the second one matches oldFilePath
    spawnMock.mockImplementation(() =>
      createCommandMockProcess({ stdout: "R100\0a.ts\0b.ts\0R100\0old.ts\0new.ts\0" })
    );

    // When: getNewPathOfRenamedFile is called for old.ts
    const result = await ds.getNewPathOfRenamedFile(REPO, VALID_HASH, "old.ts");

    // Then: the cursor advances past a.ts and returns the second record's new path
    expect(result).toBe("new.ts");
  });

  it("returns null when no record's old path matches (TC-159)", async () => {
    // Case: TC-159
    // Given: an R record whose old path does not match oldFilePath
    spawnMock.mockImplementation(() =>
      createCommandMockProcess({ stdout: "R100\0other.ts\0renamed.ts\0" })
    );

    // When: getNewPathOfRenamedFile is called for old.ts
    const result = await ds.getNewPathOfRenamedFile(REPO, VALID_HASH, "old.ts");

    // Then: the cursor reaches the end with no match and null is returned
    expect(result).toBeNull();
  });

  it("returns null for empty git diff output (TC-160)", async () => {
    // Case: TC-160
    // Given: empty stdout so fields is [""] and the while condition is false
    spawnMock.mockImplementation(() => createCommandMockProcess({ stdout: "" }));

    // When: getNewPathOfRenamedFile is called
    const result = await ds.getNewPathOfRenamedFile(REPO, VALID_HASH, "old.ts");

    // Then: null is returned
    expect(result).toBeNull();
  });

  it("breaks and returns null on an unexpected status char (TC-161)", async () => {
    // Case: TC-161
    // Given: a status char "X" that is not in VALID_FILE_CHANGE_TYPES
    spawnMock.mockImplementation(() => createCommandMockProcess({ stdout: "X\0a.ts\0b.ts\0" }));

    // When: getNewPathOfRenamedFile is called for a.ts
    const result = await ds.getNewPathOfRenamedFile(REPO, VALID_HASH, "a.ts");

    // Then: the loop breaks defensively and null is returned
    expect(result).toBeNull();
  });

  it("returns null for an invalid commit hash without spawning git (TC-162)", async () => {
    // Case: TC-162
    // Given: a commit hash containing non-hex characters
    // When: getNewPathOfRenamedFile is called with the invalid hash
    const result = await ds.getNewPathOfRenamedFile(REPO, "not-a-hex-hash", "old.ts");

    // Then: null is returned and git is never invoked
    expect(result).toBeNull();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns null for a path-traversal old path without spawning git (TC-163)", async () => {
    // Case: TC-163
    // Given: an old file path containing a ".." segment
    // When: getNewPathOfRenamedFile is called with the traversal path
    const result = await ds.getNewPathOfRenamedFile(REPO, VALID_HASH, "../secret.ts");

    // Then: null is returned and git is never invoked
    expect(result).toBeNull();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns null via error fallback when git diff exits non-zero (TC-164)", async () => {
    // Case: TC-164
    // Given: git diff exits with a non-zero code
    spawnMock.mockImplementation(() => createCommandMockProcess({ exitCode: 128 }));

    // When: getNewPathOfRenamedFile is called
    const result = await ds.getNewPathOfRenamedFile(REPO, VALID_HASH, "old.ts");

    // Then: the spawnGit errorValue (null) is returned
    expect(result).toBeNull();
  });

  it("returns an empty string when the new path field is missing (TC-165)", async () => {
    // Case: TC-165
    // Given: a truncated R record missing the new-path field
    spawnMock.mockImplementation(() => createCommandMockProcess({ stdout: "R100\0old.ts\0" }));

    // When: getNewPathOfRenamedFile is called for the matching old path
    const result = await ds.getNewPathOfRenamedFile(REPO, VALID_HASH, "old.ts");

    // Then: the missing field falls back to "" via getPathFromStr("" ?? "")
    expect(result).toBe("");
  });
});

function createChunkedMockProcess(
  options: {
    stdoutChunks?: (Buffer | string)[];
    stderrChunks?: (Buffer | string)[];
    exitCode?: number;
    emitError?: boolean;
  } = {}
) {
  const { stdoutChunks = [], stderrChunks = [], exitCode = 0, emitError = false } = options;
  const stdoutEmitter = new EventEmitter();
  const stderrEmitter = new EventEmitter();
  const proc = new EventEmitter();
  Object.assign(proc, { stdout: stdoutEmitter, stderr: stderrEmitter });

  queueMicrotask(() => {
    if (emitError) {
      proc.emit("error", new Error("spawn error"));
      return;
    }
    for (const chunk of stdoutChunks) {
      stdoutEmitter.emit("data", chunk);
    }
    for (const chunk of stderrChunks) {
      stderrEmitter.emit("data", chunk);
    }
    proc.emit("close", exitCode);
  });

  return proc as unknown as cp.ChildProcess;
}

// S28: runGitCommandSpawn() / spawnGit() 出力バッファの結合デコード
describe("spawn output buffer concat decoding (S28)", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);
  const VALID_HASH = "abc123def456";
  const REPLACEMENT_CHAR = "�";

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("restores a multibyte char split across chunk boundaries in spawnGit (TC-166)", async () => {
    // Case: TC-166
    // Given: the UTF-8 bytes of "あ" (E3 81 82) emitted as [E3,81] then [82]
    spawnMock.mockImplementation(() =>
      createChunkedMockProcess({
        stdoutChunks: [Buffer.from([0xe3, 0x81]), Buffer.from([0x82])]
      })
    );

    // When: getCommitFile drives spawnGit with an identity successValue
    const result = await ds.getCommitFile(REPO, VALID_HASH, "file.ts");

    // Then: Buffer.concat restores "あ" with no U+FFFD replacement char
    expect(result).toBe("あ");
    expect(result).not.toContain(REPLACEMENT_CHAR);
  });

  it("decodes a single ASCII chunk in spawnGit (TC-167)", async () => {
    // Case: TC-167
    // Given: ASCII "abc" emitted in a single data event
    spawnMock.mockImplementation(() => createChunkedMockProcess({ stdoutChunks: ["abc"] }));

    // When: getCommitFile drives spawnGit
    const result = await ds.getCommitFile(REPO, VALID_HASH, "file.ts");

    // Then: the identity successValue receives "abc"
    expect(result).toBe("abc");
  });

  it("yields an empty string in spawnGit when no data events fire (TC-168)", async () => {
    // Case: TC-168
    // Given: exit 0 with no stdout data events
    spawnMock.mockImplementation(() => createChunkedMockProcess({ stdoutChunks: [] }));

    // When: getCommitFile drives spawnGit
    const result = await ds.getCommitFile(REPO, VALID_HASH, "file.ts");

    // Then: Buffer.concat([]) decodes to "" and successValue receives ""
    expect(result).toBe("");
  });

  it("resolves errorValue and skips successValue on non-zero exit in spawnGit (TC-169)", async () => {
    // Case: TC-169
    // Given: stdout "abc" is emitted but the process exits with code 1
    spawnMock.mockImplementation(() =>
      createChunkedMockProcess({ stdoutChunks: ["abc"], exitCode: 1 })
    );

    // When: getCommitFile drives spawnGit
    const result = await ds.getCommitFile(REPO, VALID_HASH, "file.ts");

    // Then: the errorValue "" is returned, proving successValue was not applied to "abc"
    expect(result).toBe("");
  });

  it("restores multibyte stdout across chunks in runGitCommandSpawn error path (TC-170)", async () => {
    // Case: TC-170
    // Given: non-zero exit with "あ\n" (E3 81 82 0A) split as [E3,81] then [82,0A]
    spawnMock.mockImplementation(() =>
      createChunkedMockProcess({
        stdoutChunks: [Buffer.from([0xe3, 0x81]), Buffer.from([0x82, 0x0a])],
        exitCode: 1
      })
    );

    // When: fetch drives runGitCommandSpawn
    const result = await ds.fetch(REPO);

    // Then: the concat-decoded stdout minus the trailing line resolves as "あ" without U+FFFD
    expect(result).toBe("あ");
    expect(result).not.toContain(REPLACEMENT_CHAR);
  });

  it("falls back to concat-decoded stderr when stdout is empty in runGitCommandSpawn (TC-171)", async () => {
    // Case: TC-171
    // Given: non-zero exit, empty stdout, and stderr "err\n" split across two chunks
    spawnMock.mockImplementation(() =>
      createChunkedMockProcess({ stderrChunks: ["er", "r\n"], exitCode: 1 })
    );

    // When: fetch drives runGitCommandSpawn
    const result = await ds.fetch(REPO);

    // Then: the stderr-derived "err" is resolved because stdout is empty
    expect(result).toBe("err");
  });

  it("resolves null on a successful exit in runGitCommandSpawn (TC-172)", async () => {
    // Case: TC-172
    // Given: the process exits with code 0
    spawnMock.mockImplementation(() => createChunkedMockProcess({ exitCode: 0 }));

    // When: fetch drives runGitCommandSpawn
    const result = await ds.fetch(REPO);

    // Then: null is resolved (success)
    expect(result).toBeNull();
  });
});

describe("getGitLog --author regex meta character escaping (S29)", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function getLogAuthorArgs(): string[] {
    const logCall = spawnMock.mock.calls.find((c) => (c[1] as string[])[0] === "log");
    expect(logCall).toBeDefined();
    return logCall![1] as string[];
  }

  it("escapes bracket meta characters in a bot author (TC-173)", async () => {
    // Case: TC-173
    // Given: authors contains a bracketed bot name
    setupSpawnForCommits({ logOutput: "\n", stashOutput: "" });

    // When: getCommits is called with authors=["dependabot[bot]"]
    await ds.getCommits(REPO, [], 10, false, ["dependabot[bot]"], "date");

    // Then: git log args include --author with [ and ] backslash-escaped
    expect(getLogAuthorArgs()).toContain("--author=dependabot\\[bot\\]");
  });

  it("leaves an author without meta characters unchanged (TC-174)", async () => {
    // Case: TC-174
    // Given: authors contains only apostrophe and space (outside the meta set)
    setupSpawnForCommits({ logOutput: "\n", stashOutput: "" });

    // When: getCommits is called with authors=["Jane O'Brien"]
    await ds.getCommits(REPO, [], 10, false, ["Jane O'Brien"], "date");

    // Then: git log args include the exact --author string
    expect(getLogAuthorArgs()).toContain("--author=Jane O'Brien");
  });

  it("escapes dot and star meta characters (TC-175)", async () => {
    // Case: TC-175
    // Given: authors contains a dot and star
    setupSpawnForCommits({ logOutput: "\n", stashOutput: "" });

    // When: getCommits is called with authors=["a.b*c"]
    await ds.getCommits(REPO, [], 10, false, ["a.b*c"], "date");

    // Then: . and * are backslash-escaped
    expect(getLogAuthorArgs()).toContain("--author=a\\.b\\*c");
  });

  it("doubles a backslash in the author (TC-176)", async () => {
    // Case: TC-176
    // Given: authors contains a single backslash
    setupSpawnForCommits({ logOutput: "\n", stashOutput: "" });

    // When: getCommits is called with authors=["a\\b"]
    await ds.getCommits(REPO, [], 10, false, ["a\\b"], "date");

    // Then: the backslash is doubled to \\
    expect(getLogAuthorArgs()).toContain("--author=a\\\\b");
  });

  it("passes an empty author as --author= without throwing (TC-177)", async () => {
    // Case: TC-177
    // Given: authors contains an empty string
    setupSpawnForCommits({ logOutput: "\n", stashOutput: "" });

    // When: getCommits is called with authors=[""]
    await ds.getCommits(REPO, [], 10, false, [""], "date");

    // Then: git log args include --author= (empty value) with no meta replacement
    expect(getLogAuthorArgs()).toContain("--author=");
  });

  it("escapes group and alternation meta characters (TC-178)", async () => {
    // Case: TC-178
    // Given: authors contains parentheses and a pipe
    setupSpawnForCommits({ logOutput: "\n", stashOutput: "" });

    // When: getCommits is called with authors=["(a|b)"]
    await ds.getCommits(REPO, [], 10, false, ["(a|b)"], "date");

    // Then: (, ) and | are backslash-escaped
    expect(getLogAuthorArgs()).toContain("--author=\\(a\\|b\\)");
  });
});

describe("getBranches detached HEAD pseudo-branch detection (S30)", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setupBranchOutput(output: string) {
    spawnMock.mockImplementation(() => createMockProcess(output));
  }

  it("skips a 'detached at <hash>' pseudo-branch line (TC-179)", async () => {
    // Case: TC-179
    // Given: git branch output has a detached-at line and a real branch
    setupBranchOutput("* (HEAD detached at 1a2b3c4)\n  main\n");

    // When: getBranches parses the output
    const result = await ds.getBranches(REPO, false);

    // Then: the detached line is not added; only main remains
    expect(result).toEqual({ branches: ["main"], head: null, error: false });
  });

  it("skips a 'detached from <ref>' pseudo-branch line (TC-180)", async () => {
    // Case: TC-180
    // Given: git branch output uses the "from" detached variant
    setupBranchOutput("* (HEAD detached from origin/main)\n  main\n");

    // When: getBranches parses the output
    const result = await ds.getBranches(REPO, false);

    // Then: the detached-from line is skipped; only main remains
    expect(result).toEqual({ branches: ["main"], head: null, error: false });
  });

  it("skips a detached line whose ref contains non-alphanumeric chars (TC-181)", async () => {
    // Case: TC-181
    // Given: the detached ref contains . and -
    setupBranchOutput("* (HEAD detached at v1.0-rc.1)\n  main\n");

    // When: getBranches parses the output
    const result = await ds.getBranches(REPO, false);

    // Then: .+ matches the ref so the line is skipped
    expect(result).toEqual({ branches: ["main"], head: null, error: false });
  });

  it("retains a normal branch name (TC-182)", async () => {
    // Case: TC-182
    // Given: git branch output has only a normal branch
    setupBranchOutput("  main\n");

    // When: getBranches parses the output
    const result = await ds.getBranches(REPO, false);

    // Then: main is added to branches
    expect(result).toEqual({ branches: ["main"], head: null, error: false });
  });

  it("does not over-match a real branch containing the detached phrase (TC-183)", async () => {
    // Case: TC-183
    // Given: a real branch name embeds the detached phrase but does not start with (
    setupBranchOutput("  feature/(HEAD detached at x)\n");

    // When: getBranches parses the output
    const result = await ds.getBranches(REPO, false);

    // Then: the ^ anchor prevents a match, so the branch is retained
    expect(result).toEqual({
      branches: ["feature/(HEAD detached at x)"],
      head: null,
      error: false
    });
  });
});

describe("spawn options locale env LC_ALL=C (S31)", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);
  let originalPath: string | undefined;
  let originalLcAll: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
    originalPath = process.env.PATH;
    originalLcAll = process.env.LC_ALL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalPath === undefined) {
      delete process.env.PATH;
    } else {
      process.env.PATH = originalPath;
    }
    if (originalLcAll === undefined) {
      delete process.env.LC_ALL;
    } else {
      process.env.LC_ALL = originalLcAll;
    }
  });

  it("passes LC_ALL=C env to runGitCommandSpawn spawn (TC-184)", async () => {
    // Case: TC-184
    // Given: pull drives runGitCommandSpawn
    spawnMock.mockImplementation(() => createMockProcess("", 0));

    // When: pull is called for the repo
    await ds.pull(REPO);

    // Then: cp.spawn is called with cwd=repo and env.LC_ALL="C"
    expect(spawnMock).toHaveBeenCalledWith("git", ["pull"], {
      cwd: REPO,
      env: expect.objectContaining({ LC_ALL: "C" })
    });
  });

  it("passes LC_ALL=C env to spawnGit spawn (TC-185)", async () => {
    // Case: TC-185
    // Given: getBranches drives spawnGit
    spawnMock.mockImplementation(() => createMockProcess("  main\n"));

    // When: getBranches is called for the repo
    await ds.getBranches(REPO, false);

    // Then: the branch spawn options carry cwd=repo and env.LC_ALL="C"
    const branchCall = spawnMock.mock.calls.find((c) => (c[1] as string[])[0] === "branch");
    expect(branchCall).toBeDefined();
    const opts = branchCall![2] as { cwd: string; env: NodeJS.ProcessEnv };
    expect(opts.cwd).toBe(REPO);
    expect(opts.env.LC_ALL).toBe("C");
  });

  it("preserves existing env variables alongside LC_ALL (TC-186)", async () => {
    // Case: TC-186
    // Given: PATH is set before spawning
    process.env.PATH = "/usr/bin";
    spawnMock.mockImplementation(() => createMockProcess("  main\n"));

    // When: getBranches drives spawnGit
    await ds.getBranches(REPO, false);

    // Then: env.PATH is preserved and env.LC_ALL is "C"
    const branchCall = spawnMock.mock.calls.find((c) => (c[1] as string[])[0] === "branch");
    expect(branchCall).toBeDefined();
    const opts = branchCall![2] as { cwd: string; env: NodeJS.ProcessEnv };
    expect(opts.env.PATH).toBe("/usr/bin");
    expect(opts.env.LC_ALL).toBe("C");
  });

  it("overrides an inherited LC_ALL with C (TC-187)", async () => {
    // Case: TC-187
    // Given: LC_ALL is pre-set to a non-C locale
    process.env.LC_ALL = "ja_JP.UTF-8";
    spawnMock.mockImplementation(() => createMockProcess("  main\n"));

    // When: getBranches drives spawnGit
    await ds.getBranches(REPO, false);

    // Then: env.LC_ALL is overridden to "C" (not the inherited value)
    const branchCall = spawnMock.mock.calls.find((c) => (c[1] as string[])[0] === "branch");
    expect(branchCall).toBeDefined();
    const opts = branchCall![2] as { cwd: string; env: NodeJS.ProcessEnv };
    expect(opts.env.LC_ALL).toBe("C");
  });
});

/* ------------------------------------------------------------------ */
/* S32: spawnGit() stderr stream drain                                */
/* ------------------------------------------------------------------ */

describe("spawnGit stderr drain", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createDrainMockProcess(options: {
    stdout?: string;
    stderrChunks?: string[];
    exitCode?: number;
  }): { proc: cp.ChildProcess; stderrEmitter: EventEmitter } {
    const stdoutEmitter = new EventEmitter();
    const stderrEmitter = new EventEmitter();
    const proc = new EventEmitter();
    Object.assign(proc, { stdout: stdoutEmitter, stderr: stderrEmitter });

    queueMicrotask(() => {
      for (const chunk of options.stderrChunks ?? []) {
        stderrEmitter.emit("data", chunk);
      }
      if (options.stdout) stdoutEmitter.emit("data", options.stdout);
      proc.emit("close", options.exitCode ?? 0);
    });

    return { proc: proc as unknown as cp.ChildProcess, stderrEmitter };
  }

  // Case: TC-188
  it("registers exactly one data listener on the stderr stream (TC-188)", async () => {
    // Given: a spawned process whose stderr emitter is observable
    const handle = createDrainMockProcess({ stdout: "abc123\n", exitCode: 0 });
    spawnMock.mockReturnValue(handle.proc);

    // When: a spawnGit-backed method runs to completion
    await ds.resolveRefToHash(REPO, "HEAD");

    // Then: spawnGit registered a single "data" listener that drains stderr
    expect(handle.stderrEmitter.listenerCount("data")).toBe(1);
  });

  // Case: TC-189
  it("resolves without hanging when large stderr is emitted before close (TC-189)", async () => {
    // Given: several large stderr chunks emitted before a successful close(0)
    const largeChunk = "x".repeat(100_000);
    const handle = createDrainMockProcess({
      stdout: "abc123\n",
      stderrChunks: [largeChunk, largeChunk, largeChunk],
      exitCode: 0
    });
    spawnMock.mockReturnValue(handle.proc);

    // When: the spawnGit-backed method runs
    const result = await ds.resolveRefToHash(REPO, "HEAD");

    // Then: the promise resolves with the stdout-derived value (stderr did not stall it)
    expect(result).toBe("abc123");
  });

  // Case: TC-190
  it("uses stdout for the success value and ignores drained stderr (TC-190)", async () => {
    // Given: both stderr and stdout are emitted before a successful close(0)
    const handle = createDrainMockProcess({
      stdout: "def4567\n",
      stderrChunks: ["warning: some noise\n"],
      exitCode: 0
    });
    spawnMock.mockReturnValue(handle.proc);

    // When: the spawnGit-backed method runs
    const result = await ds.resolveRefToHash(REPO, "HEAD");

    // Then: the resolved value derives from stdout only, not from stderr
    expect(result).toBe("def4567");
  });
});

/* ------------------------------------------------------------------ */
/* S33: runGitCommandSpawn() conditional trailing-line removal        */
/* ------------------------------------------------------------------ */

describe("runGitCommandSpawn trailing line handling", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Case: TC-191
  it("pops only the trailing empty line when output ends with a newline (TC-191)", async () => {
    // Given: a non-zero exit whose stdout ends with a trailing newline
    spawnMock.mockReturnValue(createCommandMockProcess({ stdout: "error line\n", exitCode: 1 }));

    // When: a runGitCommandSpawn-backed command runs
    const result = await ds.deleteTag(REPO, "v1");

    // Then: the resolved string drops only the trailing empty line
    expect(result).toBe("error line");
  });

  // Case: TC-192
  it("preserves the last line when output has no trailing newline (TC-192)", async () => {
    // Given: a non-zero exit whose stdout has no trailing newline
    spawnMock.mockReturnValue(
      createCommandMockProcess({ stdout: "fatal: bad revision", exitCode: 1 })
    );

    // When: a runGitCommandSpawn-backed command runs
    const result = await ds.deleteTag(REPO, "v1");

    // Then: the whole message is preserved (old unconditional slice dropped it)
    expect(result).toBe("fatal: bad revision");
  });

  // Case: TC-193
  it("keeps intermediate lines while removing only the trailing empty one (TC-193)", async () => {
    // Given: a non-zero exit with multiple lines and a trailing newline
    spawnMock.mockReturnValue(createCommandMockProcess({ stdout: "line1\nline2\n", exitCode: 1 }));

    // When: a runGitCommandSpawn-backed command runs
    const result = await ds.deleteTag(REPO, "v1");

    // Then: intermediate lines are kept and only the trailing empty line is removed
    expect(result).toBe("line1\nline2");
  });

  // Case: TC-194
  it("resolves to an empty string when both stdout and stderr are empty (TC-194)", async () => {
    // Given: a non-zero exit with empty stdout and empty stderr
    spawnMock.mockReturnValue(createCommandMockProcess({ stdout: "", stderr: "", exitCode: 1 }));

    // When: a runGitCommandSpawn-backed command runs
    const result = await ds.deleteTag(REPO, "v1");

    // Then: split yields [""], the empty element is popped, and the join is ""
    expect(result).toBe("");
  });
});

/* ------------------------------------------------------------------ */
/* S34: addTag()/createBranch() leading-hyphen ref name rejection     */
/* ------------------------------------------------------------------ */

describe("ref name option-injection guard", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);
  const INVALID_REF_NAME_MESSAGE = "Invalid ref name.";
  const VALID_HASH = "abc123def456";

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Case: TC-195
  it("runs git tag for a valid tag name (TC-195)", async () => {
    // Given: spawn succeeds for a normal (non-hyphen) tag name
    spawnMock.mockReturnValue(createCommandMockProcess({ exitCode: 0 }));

    // When: addTag is called with a valid tag name
    const result = await ds.addTag(REPO, "v1.0.0", VALID_HASH, true, "");

    // Then: the git tag command runs and the ref-name error is not returned
    expect(result).not.toBe(INVALID_REF_NAME_MESSAGE);
    const tagCall = spawnMock.mock.calls.find((c) => (c[1] as string[])[0] === "tag");
    expect(tagCall).toBeDefined();
  });

  // Case: TC-196
  it("runs git branch for a valid branch name (TC-196)", async () => {
    // Given: spawn succeeds for a normal branch name
    spawnMock.mockReturnValue(createCommandMockProcess({ exitCode: 0 }));

    // When: createBranch is called with a valid branch name and hash
    const result = await ds.createBranch(REPO, "feature/x", VALID_HASH);

    // Then: the git branch command runs and the ref-name error is not returned
    expect(result).not.toBe(INVALID_REF_NAME_MESSAGE);
    const branchCall = spawnMock.mock.calls.find((c) => (c[1] as string[])[0] === "branch");
    expect(branchCall).toBeDefined();
  });

  // Case: TC-197
  it("rejects a tag name starting with a hyphen without spawning git (TC-197)", async () => {
    // Given: a tag name that would be parsed as an option
    // When: addTag is called with "--delete"
    const result = await ds.addTag(REPO, "--delete", VALID_HASH, true, "");

    // Then: the ref-name error is returned and git is not spawned
    expect(result).toBe(INVALID_REF_NAME_MESSAGE);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  // Case: TC-198
  it("rejects a hyphen branch name before the commit-hash check (TC-198)", async () => {
    // Given: a hyphen branch name paired with an invalid commit hash
    // When: createBranch is called with "-D" and a non-hash value
    const result = await ds.createBranch(REPO, "-D", "not-a-hash");

    // Then: the ref-name guard short-circuits (not the commit-hash message) and git is not spawned
    expect(result).toBe(INVALID_REF_NAME_MESSAGE);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  // Case: TC-199
  it("rejects a lone hyphen tag name (TC-199)", async () => {
    // Given: the minimal invalid input "-"
    // When: addTag is called with "-"
    const result = await ds.addTag(REPO, "-", VALID_HASH, true, "");

    // Then: the ref-name error is returned
    expect(result).toBe(INVALID_REF_NAME_MESSAGE);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  // Case: TC-200
  it("passes an empty branch name through the hyphen guard to the hash check (TC-200)", async () => {
    // Given: spawn succeeds and the branch name is empty (not hyphen-prefixed)
    spawnMock.mockReturnValue(createCommandMockProcess({ exitCode: 0 }));

    // When: createBranch is called with an empty name and a valid hash
    const result = await ds.createBranch(REPO, "", VALID_HASH);

    // Then: the hyphen guard is bypassed and the command reaches spawn (not the ref-name error)
    expect(result).not.toBe(INVALID_REF_NAME_MESSAGE);
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });
});

/* ------------------------------------------------------------------ */
/* S37: registerGitPath() 解決完了後の単一 path 一括代入               */
/* @see docs/testing/perspectives/src/dataSource-test/05-git-path-01.md */
/* ------------------------------------------------------------------ */

describe("registerGitPath resolved path assignment (S37)", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Case: TC-218
  it("spawns later git commands with the resolved single path (TC-218)", async () => {
    // Given: the resolver resolves to a concrete executable path
    resolveGitExecutableMock.mockResolvedValue("/opt/git/bin/git");
    await ds.registerGitPath();
    spawnMock.mockImplementation(() => createMockProcess(""));

    // When: a git command runs after registerGitPath has been awaited
    await ds.getBranches(REPO, false);

    // Then: the spawn command is the resolved single string
    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnMock.mock.calls[0][0]).toBe("/opt/git/bin/git");
  });

  // Case: TC-219
  it("keeps the safe single-string default while the resolver is pending (TC-219)", async () => {
    // Given: the resolver returns a promise that stays pending
    resolveGitExecutableMock.mockReturnValue(new Promise<string>(() => {}));
    void ds.registerGitPath();
    spawnMock.mockImplementation(() => createMockProcess(""));

    // When: a git command runs before the resolution completes
    await ds.getBranches(REPO, false);

    // Then: the spawn command is the pre-resolution single-string default, never an array or undefined
    expect(spawnMock).toHaveBeenCalledTimes(1);
    const spawnCommand = spawnMock.mock.calls[0][0];
    expect(typeof spawnCommand).toBe("string");
    expect(spawnCommand).toBe("git");
  });

  // Case: TC-220
  it("resolves registerGitPath and falls back to git when all candidates failed (TC-220)", async () => {
    // Given: the resolver reports the final fallback "git" after every candidate failed
    resolveGitExecutableMock.mockResolvedValue("git");

    // When: registerGitPath is awaited and a git command runs
    await expect(ds.registerGitPath()).resolves.toBeUndefined();
    spawnMock.mockImplementation(() => createMockProcess(""));
    await ds.getBranches(REPO, false);

    // Then: no rejection occurred and the spawn command is "git"
    expect(spawnMock.mock.calls[0][0]).toBe("git");
  });
});

/* ------------------------------------------------------------------ */
/* S38: ls-files -z による未追跡ファイルの NUL 区切り取得              */
/* S39: numstat 共通パーサー（第1・第2 TAB 区切りと残余 path 保持）    */
/* S40: renameBranch() 新ブランチ名の isRefNameSafe ガード             */
/* @see docs/testing/perspectives/src/dataSource-test/04-spawn-refname-diff-01.md */
/* ------------------------------------------------------------------ */

describe("ls-files -z untracked file parsing (S38)", () => {
  const SPECIAL_UNTRACKED_NAMES = [
    'quote"name.txt',
    "tab\tname.txt",
    "new\nline.txt",
    "back\\slash.txt"
  ];
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setupSpawnWithUntracked(untrackedOutput: string) {
    spawnMock.mockImplementation((_cmd: unknown, args: unknown) => {
      const argArray = args as string[];
      if (argArray.includes("ls-files")) {
        return createMockProcess(untrackedOutput);
      }
      return createMockProcess("");
    });
  }

  function getLsFilesArgs(): string[] {
    const lsFilesCall = spawnMock.mock.calls.find((call) =>
      (call[1] as string[]).includes("ls-files")
    );
    expect(lsFilesCall).toBeDefined();
    return lsFilesCall![1] as string[];
  }

  // Case: TC-221
  it("returns raw special-character untracked names via getUncommittedDetails (TC-221)", async () => {
    // Given: NUL-delimited ls-files output with quote/TAB/newline/backslash names
    const untrackedOutput = `${SPECIAL_UNTRACKED_NAMES.join("\0")}\0`;
    setupSpawnWithUntracked(untrackedOutput);

    // When: getUncommittedDetails is called
    const result = await ds.getUncommittedDetails(REPO);

    // Then: ls-files was spawned with -z and every name survives as a raw string
    expect(getLsFilesArgs()).toContain("-z");
    expect(result).not.toBeNull();
    expect(result!.fileChanges.map((change) => change.newFilePath)).toEqual(
      SPECIAL_UNTRACKED_NAMES
    );
  });

  // Case: TC-222
  it("returns raw special-character untracked names via getCommitComparison (TC-222)", async () => {
    // Given: a working-tree comparison (empty toHash) with the same special-character names
    const untrackedOutput = `${SPECIAL_UNTRACKED_NAMES.join("\0")}\0`;
    setupSpawnWithUntracked(untrackedOutput);

    // When: getCommitComparison is called with an empty toHash
    const result = await ds.getCommitComparison(REPO, "abc123def456", "");

    // Then: ls-files was spawned with -z and the untracked names are raw in the result
    expect(getLsFilesArgs()).toContain("-z");
    expect(result).not.toBeNull();
    expect(result!.map((change) => change.newFilePath)).toEqual(SPECIAL_UNTRACKED_NAMES);
  });
});

describe("numstat shared record parser (S39)", () => {
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setupSpawnForCommitDetails(nameStatusOutput: string, numStatOutput: string) {
    const detailsLine = [
      "abc123def456",
      "parent111",
      "Author Name",
      "author@example.com",
      "1700000000",
      "Committer Name",
      "committer@example.com"
    ].join(SEP);
    spawnMock.mockImplementation((_cmd: unknown, args: unknown) => {
      const argArray = args as string[];
      if (argArray[0] === "show") {
        return createMockProcess(`${detailsLine}\ncommit message\n`);
      }
      if (argArray.includes("--name-status")) {
        return createMockProcess(nameStatusOutput);
      }
      if (argArray.includes("--numstat")) {
        return createMockProcess(numStatOutput);
      }
      return createMockProcess("");
    });
  }

  function setupSpawnForDiff(nameStatusOutput: string, numStatOutput: string) {
    spawnMock.mockImplementation((_cmd: unknown, args: unknown) => {
      const argArray = args as string[];
      if (argArray.includes("--name-status")) {
        return createMockProcess(nameStatusOutput);
      }
      if (argArray.includes("--numstat")) {
        return createMockProcess(numStatOutput);
      }
      return createMockProcess("");
    });
  }

  // Case: TC-223
  it("applies a normal numstat record via commitDetails (TC-223)", async () => {
    // Given: a single modified file whose numstat record uses the first and second TAB
    setupSpawnForCommitDetails("M\0src/a.ts\0", "3\t1\tsrc/a.ts\0");

    // When: commitDetails is called for a commit with parents
    const result = await ds.commitDetails(REPO, "abc123def456", true, false);

    // Then: the additions/deletions from the record land on the matching path
    expect(result).not.toBeNull();
    expect(result!.fileChanges).toEqual([
      { oldFilePath: "src/a.ts", newFilePath: "src/a.ts", type: "M", additions: 3, deletions: 1 }
    ]);
  });

  // Case: TC-224
  it("keeps a TAB-containing path intact and continues to later records (TC-224)", async () => {
    // Given: a numstat record whose path contains a TAB, followed by a normal record
    const nameStatus = "M\0src/a\tb.ts\0M\0src/c.ts\0";
    const numStat = "2\t5\tsrc/a\tb.ts\0" + "1\t1\tsrc/c.ts\0";
    setupSpawnForDiff(nameStatus, numStat);

    // When: getUncommittedDetails is called
    const result = await ds.getUncommittedDetails(REPO);

    // Then: the full TAB-containing remainder matches the path and the later record is not cut off
    expect(result).not.toBeNull();
    expect(result!.fileChanges).toEqual([
      {
        oldFilePath: "src/a\tb.ts",
        newFilePath: "src/a\tb.ts",
        type: "M",
        additions: 2,
        deletions: 5
      },
      { oldFilePath: "src/c.ts", newFilePath: "src/c.ts", type: "M", additions: 1, deletions: 1 }
    ]);
  });

  // Case: TC-225
  it("keeps a TAB-containing path intact in the comparison path (TC-225)", async () => {
    // Given: the same TAB-containing numstat shape driven through getCommitComparison
    const nameStatus = "M\0src/a\tb.ts\0M\0src/c.ts\0";
    const numStat = "2\t5\tsrc/a\tb.ts\0" + "1\t1\tsrc/c.ts\0";
    setupSpawnForDiff(nameStatus, numStat);

    // When: getCommitComparison is called between two commits
    const result = await ds.getCommitComparison(REPO, "abc123def456", "def456abc123");

    // Then: the shared helper preserves the path remainder and later counts in this path too
    expect(result).toEqual([
      {
        oldFilePath: "src/a\tb.ts",
        newFilePath: "src/a\tb.ts",
        type: "M",
        additions: 2,
        deletions: 5
      },
      { oldFilePath: "src/c.ts", newFilePath: "src/c.ts", type: "M", additions: 1, deletions: 1 }
    ]);
  });

  // Case: TC-226
  it("keeps the rename empty-path plus two-token contract via commitDetails (TC-226)", async () => {
    // Given: a rename record with an empty path field followed by old/new NUL tokens
    setupSpawnForCommitDetails("R\0old.ts\0new.ts\0", "5\t0\t\0old.ts\0new.ts\0");

    // When: commitDetails is called for a commit with parents
    const result = await ds.commitDetails(REPO, "abc123def456", true, false);

    // Then: the empty path triggers the +3 cursor advance and the counts land on the rename
    expect(result).not.toBeNull();
    expect(result!.fileChanges).toEqual([
      { oldFilePath: "old.ts", newFilePath: "new.ts", type: "R", additions: 5, deletions: 0 }
    ]);
  });

  // Case: TC-227
  it("ignores a malformed record alone and keeps parsing later records (TC-227)", async () => {
    // Given: a TAB-less malformed record directly before a valid record
    const nameStatus = "M\0src/bad.ts\0M\0src/ok.ts\0";
    const numStat = "garbage\0" + "2\t2\tsrc/ok.ts\0";
    setupSpawnForDiff(nameStatus, numStat);

    // When: getUncommittedDetails is called
    const result = await ds.getUncommittedDetails(REPO);

    // Then: the unmatched file keeps null counts while the later record is applied (no loop break)
    expect(result).not.toBeNull();
    expect(result!.fileChanges).toEqual([
      {
        oldFilePath: "src/bad.ts",
        newFilePath: "src/bad.ts",
        type: "M",
        additions: null,
        deletions: null
      },
      { oldFilePath: "src/ok.ts", newFilePath: "src/ok.ts", type: "M", additions: 2, deletions: 2 }
    ]);
  });
});

describe("renameBranch ref name guard (S40)", () => {
  const INVALID_REF_NAME_MESSAGE = "Invalid ref name.";
  let ds: DataSource;
  const spawnMock = vi.mocked(cp.spawn);

  beforeEach(() => {
    vi.clearAllMocks();
    ds = new DataSource();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Case: TC-228
  it("rejects a hyphen-prefixed new branch name without spawning git (TC-228)", async () => {
    // Given: a new name that would be parsed as a git option
    // When: renameBranch is called with "-D"
    const result = await ds.renameBranch(REPO, "old", "-D", false);

    // Then: the ref-name error is returned and no git process is started
    expect(result).toBe(INVALID_REF_NAME_MESSAGE);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  // Case: TC-229
  it("rejects a lone hyphen new branch name (TC-229)", async () => {
    // Given: the minimal invalid input "-"
    // When: renameBranch is called with "-"
    const result = await ds.renameBranch(REPO, "old", "-", false);

    // Then: the ref-name error is returned and no git process is started
    expect(result).toBe(INVALID_REF_NAME_MESSAGE);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  // Case: TC-230
  it("runs the unchanged branch -m command for a valid new name (TC-230)", async () => {
    // Given: spawn succeeds for the rename command
    spawnMock.mockReturnValue(createCommandMockProcess({ exitCode: 0 }));

    // When: renameBranch is called with a valid new name
    const result = await ds.renameBranch(REPO, "old", "feature/renamed", false);

    // Then: git branch -m runs exactly once with the existing argument structure
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnMock.mock.calls[0][1]).toEqual(["branch", "-m", "old", "feature/renamed"]);
  });
});
