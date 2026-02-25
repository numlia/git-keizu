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
    gitPath: () => "git",
    dateType: () => "Author Date",
    showUncommittedChanges: () => false
  }))
}));

vi.mock("node:child_process", () => ({
  spawn: vi.fn()
}));

import { DataSource } from "../../src/dataSource";
import { type GitStash, UNCOMMITTED_CHANGES_HASH } from "../../src/types";

const SEP = "XX7Nal-YARtTpjCikii9nJxER19D6diSyk-AWkPb";
const REPO = "/test/repo";

type DataSourceWithPrivate = DataSource & {
  getStashes: (repo: string) => Promise<GitStash[]>;
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
    const result = await ds.getCommits(REPO, "", 10, false);

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
    const result = await ds.getCommits(REPO, "", 10, false);

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
    const result = await ds.getCommits(REPO, "", 10, false);

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
    const result = await ds.getCommits(REPO, "", 10, false);

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
    const result = await ds.getCommits(REPO, "", 10, false);

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
    const result = await ds.getCommits(REPO, "", 10, false);

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
    expect(spawnMock).toHaveBeenCalledWith("git", ["show", "abc123def456:src/file.ts"], {
      cwd: REPO
    });
  });

  it("returns file content for commit hash with ^ suffix (TC-014)", async () => {
    // Given: git show succeeds for parent commit
    const fileContent = "parent version content";
    spawnMock.mockImplementation(() => createMockProcess(fileContent));

    // When: getCommitFile is called with hash^ (parent commit syntax)
    const result = await ds.getCommitFile(REPO, "abc123def456^", "src/file.ts");

    // Then: passes the ^ suffix through to git show
    expect(result).toBe(fileContent);
    expect(spawnMock).toHaveBeenCalledWith("git", ["show", "abc123def456^:src/file.ts"], {
      cwd: REPO
    });
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
    expect(spawnMock).toHaveBeenCalledWith("git", ["show", "HEAD:src/file.ts"], {
      cwd: REPO
    });
  });

  it("returns file content for HEAD^ ref (TC-020)", async () => {
    // Given: git show HEAD^:path succeeds with file content
    const fileContent = "content at HEAD parent";
    spawnMock.mockImplementation(() => createMockProcess(fileContent));

    // When: getCommitFile is called with "HEAD^"
    const result = await ds.getCommitFile(REPO, "HEAD^", "src/file.ts");

    // Then: returns the file content with HEAD^ passed through to git
    expect(result).toBe(fileContent);
    expect(spawnMock).toHaveBeenCalledWith("git", ["show", "HEAD^:src/file.ts"], {
      cwd: REPO
    });
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
    expect(spawnMock).toHaveBeenCalledWith("git", ["stash", "apply", "stash@{0}"], { cwd: REPO });
  });

  it("applyStash passes --index flag when reinstateIndex is true (TC-022)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: applyStash(repo, "stash@{0}", true)
    const result = await ds.applyStash(REPO, "stash@{0}", true);

    // Then: spawn is called with --index flag
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["stash", "apply", "--index", "stash@{0}"], {
      cwd: REPO
    });
  });

  it("popStash passes correct args without --index (TC-023)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: popStash(repo, "stash@{1}", false)
    const result = await ds.popStash(REPO, "stash@{1}", false);

    // Then: spawn is called with ["stash", "pop", "stash@{1}"]
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["stash", "pop", "stash@{1}"], { cwd: REPO });
  });

  it("popStash passes --index flag when reinstateIndex is true (TC-024)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: popStash(repo, "stash@{1}", true)
    const result = await ds.popStash(REPO, "stash@{1}", true);

    // Then: spawn is called with --index flag
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["stash", "pop", "--index", "stash@{1}"], {
      cwd: REPO
    });
  });

  it("dropStash passes correct args (TC-025)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: dropStash(repo, "stash@{2}")
    const result = await ds.dropStash(REPO, "stash@{2}");

    // Then: spawn is called with ["stash", "drop", "stash@{2}"]
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["stash", "drop", "stash@{2}"], { cwd: REPO });
  });

  it("branchFromStash passes correct args (TC-026)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: branchFromStash(repo, "my-branch", "stash@{0}")
    const result = await ds.branchFromStash(REPO, "my-branch", "stash@{0}");

    // Then: spawn is called with ["stash", "branch", "my-branch", "stash@{0}"]
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["stash", "branch", "my-branch", "stash@{0}"], {
      cwd: REPO
    });
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
      { cwd: REPO }
    );
  });

  it("pushStash passes message only when includeUntracked is false (TC-030)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: pushStash(repo, "WIP message", false)
    const result = await ds.pushStash(REPO, "WIP message", false);

    // Then: spawn is called with ["stash", "push", "--message", "WIP message"]
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["stash", "push", "--message", "WIP message"], {
      cwd: REPO
    });
  });

  it("pushStash passes --include-untracked only when message is empty (TC-031)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: pushStash(repo, "", true)
    const result = await ds.pushStash(REPO, "", true);

    // Then: spawn is called with ["stash", "push", "--include-untracked"] (no --message flag)
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["stash", "push", "--include-untracked"], {
      cwd: REPO
    });
  });

  it("pushStash passes minimal args when message is empty and includeUntracked is false (TC-032)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: pushStash(repo, "", false)
    const result = await ds.pushStash(REPO, "", false);

    // Then: spawn is called with ["stash", "push"] only
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["stash", "push"], { cwd: REPO });
  });

  // --- resetUncommitted ---

  it("resetUncommitted passes correct args for mixed mode (TC-033)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: resetUncommitted(repo, "mixed")
    const result = await ds.resetUncommitted(REPO, "mixed");

    // Then: spawn is called with ["reset", "--mixed", "HEAD"]
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["reset", "--mixed", "HEAD"], { cwd: REPO });
  });

  it("resetUncommitted passes correct args for hard mode (TC-034)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: resetUncommitted(repo, "hard")
    const result = await ds.resetUncommitted(REPO, "hard");

    // Then: spawn is called with ["reset", "--hard", "HEAD"]
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["reset", "--hard", "HEAD"], { cwd: REPO });
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
    expect(spawnMock).toHaveBeenCalledWith("git", ["clean", "-f"], { cwd: REPO });
  });

  it("cleanUntrackedFiles passes -f -d when directories is true (TC-039)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: cleanUntrackedFiles(repo, true)
    const result = await ds.cleanUntrackedFiles(REPO, true);

    // Then: spawn is called with ["clean", "-f", "-d"]
    expect(result).toBeNull();
    expect(spawnMock).toHaveBeenCalledWith("git", ["clean", "-f", "-d"], { cwd: REPO });
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
    expect(spawnMock).toHaveBeenCalledWith("git", ["fetch", "--all", "--prune"], { cwd: REPO });
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

  it("returns file changes for two valid commit hashes (TC-046)", async () => {
    // Given: Two valid commit hashes with modified and added files in diff output
    const nameStatus = "M\tsrc/modified.ts\nA\tsrc/added.ts\n";
    const numStat = "10\t5\tsrc/modified.ts\n20\t0\tsrc/added.ts\n";
    setupSpawnForComparison(nameStatus, numStat);

    // When: getCommitComparison is called with two valid hashes
    const result = await ds.getCommitComparison(REPO, "abc123def456", "def456abc123");

    // Then: Returns GitFileChange[] with correct oldFilePath, newFilePath, type, additions, deletions
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result![0]).toEqual({
      oldFilePath: "src/modified.ts",
      newFilePath: "src/modified.ts",
      type: "M",
      additions: 10,
      deletions: 5
    });
    expect(result![1]).toEqual({
      oldFilePath: "src/added.ts",
      newFilePath: "src/added.ts",
      type: "A",
      additions: 20,
      deletions: 0
    });
    // Verify nameStatus and numStat are executed in parallel (2 spawn calls)
    expect(spawnMock).toHaveBeenCalledTimes(2);
  });

  it("returns different oldFilePath and newFilePath for renamed files (TC-047)", async () => {
    // Given: Diff contains a renamed file (R100 status with old and new paths)
    const nameStatus = "R100\tsrc/old-name.ts\tsrc/new-name.ts\n";
    const numStat = "8\t3\tsrc/{old-name.ts => new-name.ts}\n";
    setupSpawnForComparison(nameStatus, numStat);

    // When: getCommitComparison is called
    const result = await ds.getCommitComparison(REPO, "abc123def456", "def456abc123");

    // Then: oldFilePath and newFilePath differ, type is "R", additions/deletions are parsed
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].oldFilePath).toBe("src/old-name.ts");
    expect(result![0].newFilePath).toBe("src/new-name.ts");
    expect(result![0].type).toBe("R");
    expect(result![0].additions).toBe(8);
    expect(result![0].deletions).toBe(3);
  });

  it("correctly classifies all change types A/M/D/R (TC-048)", async () => {
    // Given: Diff contains all 4 change types (Added, Modified, Deleted, Renamed)
    const nameStatus = [
      "A\tsrc/added.ts",
      "M\tsrc/modified.ts",
      "D\tsrc/deleted.ts",
      "R100\tsrc/old.ts\tsrc/renamed.ts",
      ""
    ].join("\n");
    const numStat = [
      "10\t0\tsrc/added.ts",
      "5\t3\tsrc/modified.ts",
      "0\t15\tsrc/deleted.ts",
      "2\t1\tsrc/{old.ts => renamed.ts}",
      ""
    ].join("\n");
    setupSpawnForComparison(nameStatus, numStat);

    // When: getCommitComparison is called
    const result = await ds.getCommitComparison(REPO, "abc123def456", "def456abc123");

    // Then: Each change type is correctly identified
    expect(result).not.toBeNull();
    expect(result).toHaveLength(4);
    expect(result![0].type).toBe("A");
    expect(result![1].type).toBe("M");
    expect(result![2].type).toBe("D");
    expect(result![3].type).toBe("R");
  });

  it("parses numStat additions and deletions as numbers (TC-049)", async () => {
    // Given: numStat output with specific addition/deletion counts
    const nameStatus = "M\tsrc/file.ts\n";
    const numStat = "42\t17\tsrc/file.ts\n";
    setupSpawnForComparison(nameStatus, numStat);

    // When: getCommitComparison is called
    const result = await ds.getCommitComparison(REPO, "abc123def456", "def456abc123");

    // Then: additions and deletions are parsed as numbers (not strings)
    expect(result).not.toBeNull();
    expect(result![0].additions).toBe(42);
    expect(result![0].deletions).toBe(17);
  });

  it("omits toHash from git args when toHash is empty string (TC-050)", async () => {
    // Given: toHash is empty string (working tree comparison)
    const nameStatus = "M\tsrc/file.ts\n";
    const numStat = "5\t2\tsrc/file.ts\n";
    setupSpawnForComparison(nameStatus, numStat);

    // When: getCommitComparison is called with empty toHash
    const result = await ds.getCommitComparison(REPO, "abc123def456", "");

    // Then: git diff args end with fromHash only (toHash not appended)
    expect(result).not.toBeNull();
    const nameStatusCall = spawnMock.mock.calls.find((call) =>
      (call[1] as string[]).includes("--name-status")
    );
    expect(nameStatusCall).toBeDefined();
    const args = nameStatusCall![1] as string[];
    expect(args).toEqual([
      "-c",
      "core.quotePath=false",
      "diff",
      "--name-status",
      "--find-renames",
      "--diff-filter=AMDR",
      "abc123def456"
    ]);
  });

  it("uses toHash as diff base when fromHash is UNCOMMITTED_CHANGES_HASH (TC-051)", async () => {
    // Given: fromHash is UNCOMMITTED_CHANGES_HASH ("*")
    const nameStatus = "M\tsrc/file.ts\n";
    const numStat = "3\t1\tsrc/file.ts\n";
    setupSpawnForComparison(nameStatus, numStat);

    // When: getCommitComparison is called with UNCOMMITTED_CHANGES_HASH as fromHash
    const result = await ds.getCommitComparison(REPO, UNCOMMITTED_CHANGES_HASH, "abc123def456");

    // Then: toHash is used as the single diff base (comparing toHash against working tree)
    expect(result).not.toBeNull();
    const nameStatusCall = spawnMock.mock.calls.find((call) =>
      (call[1] as string[]).includes("--name-status")
    );
    const args = nameStatusCall![1] as string[];
    expect(args).toContain("abc123def456");
    expect(args).not.toContain(UNCOMMITTED_CHANGES_HASH);
    // toHash should be the only commit arg (no second commit = working tree comparison)
    const diffIndex = args.indexOf("diff");
    const commitArgs = args.slice(diffIndex + 1).filter((a) => !a.startsWith("-"));
    expect(commitArgs).toEqual(["abc123def456"]);
  });

  it("returns empty array when no changes exist (TC-052)", async () => {
    // Given: git diff returns empty output (identical commits or no changes)
    setupSpawnForComparison("", "");

    // When: getCommitComparison is called
    const result = await ds.getCommitComparison(REPO, "abc123def456", "def456abc123");

    // Then: Returns empty array (not null)
    expect(result).toEqual([]);
    expect(result).not.toBeNull();
  });

  it("returns null when git spawn throws an exception (TC-053)", async () => {
    // Given: cp.spawn throws synchronously (e.g., binary not found)
    spawnMock.mockImplementation(() => {
      throw new Error("spawn ENOENT");
    });

    // When: getCommitComparison is called
    const result = await ds.getCommitComparison(REPO, "abc123def456", "def456abc123");

    // Then: Returns null (caught by try-catch block)
    expect(result).toBeNull();
  });

  it("returns file changes with null additions/deletions when numStat has no matching entry (TC-054)", async () => {
    // Given: nameStatus has 2 entries but numStat output references a different file
    const nameStatus = "M\tsrc/file1.ts\nA\tsrc/file2.ts\n";
    const numStat = "10\t5\tsrc/unrelated.ts\n";
    setupSpawnForComparison(nameStatus, numStat);

    // When: getCommitComparison is called
    const result = await ds.getCommitComparison(REPO, "abc123def456", "def456abc123");

    // Then: File changes are returned but additions/deletions remain null (no numStat match)
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result![0].additions).toBeNull();
    expect(result![0].deletions).toBeNull();
    expect(result![1].additions).toBeNull();
    expect(result![1].deletions).toBeNull();
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

  it("includes untracked files when fromHash is UNCOMMITTED_CHANGES_HASH (TC-055)", async () => {
    // Given: fromHash is UNCOMMITTED_CHANGES_HASH, diff has 1 modified file, ls-files has 1 untracked file
    const nameStatus = "M\tsrc/existing.ts\n";
    const numStat = "5\t2\tsrc/existing.ts\n";
    const untracked = "src/newfile.ts\n";
    setupSpawnForComparisonWithUntracked(nameStatus, numStat, untracked);

    // When: getCommitComparison is called with UNCOMMITTED_CHANGES_HASH
    const result = await ds.getCommitComparison(REPO, UNCOMMITTED_CHANGES_HASH, "abc123def456");

    // Then: result includes both the diff file and the untracked file
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result![0]).toEqual({
      oldFilePath: "src/existing.ts",
      newFilePath: "src/existing.ts",
      type: "M",
      additions: 5,
      deletions: 2
    });
    expect(result![1]).toEqual({
      oldFilePath: "src/newfile.ts",
      newFilePath: "src/newfile.ts",
      type: "A",
      additions: null,
      deletions: null
    });
  });

  it("includes untracked files when toHash is empty string (TC-056)", async () => {
    // Given: toHash is empty string (working tree comparison), ls-files has untracked files
    const nameStatus = "M\tsrc/file.ts\n";
    const numStat = "3\t1\tsrc/file.ts\n";
    const untracked = "src/untracked.ts\n";
    setupSpawnForComparisonWithUntracked(nameStatus, numStat, untracked);

    // When: getCommitComparison is called with empty toHash
    const result = await ds.getCommitComparison(REPO, "abc123def456", "");

    // Then: result includes both the diff file and the untracked file
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result![1]).toEqual({
      oldFilePath: "src/untracked.ts",
      newFilePath: "src/untracked.ts",
      type: "A",
      additions: null,
      deletions: null
    });
  });

  it("does not run ls-files for two-commit comparison (TC-057)", async () => {
    // Given: both fromHash and toHash are valid commit hashes
    const nameStatus = "M\tsrc/file.ts\n";
    const numStat = "3\t1\tsrc/file.ts\n";
    setupSpawnForComparison(nameStatus, numStat);

    // When: getCommitComparison is called with two valid hashes
    const result = await ds.getCommitComparison(REPO, "abc123def456", "def456abc123");

    // Then: only 2 spawn calls (nameStatus + numStat), no ls-files
    expect(result).not.toBeNull();
    expect(spawnMock).toHaveBeenCalledTimes(2);
    const lsFilesCall = spawnMock.mock.calls.find((call) =>
      (call[1] as string[]).includes("ls-files")
    );
    expect(lsFilesCall).toBeUndefined();
  });

  it("deduplicates untracked files already present in diff output (TC-058)", async () => {
    // Given: working tree comparison, untracked file has same name as a file in diff output
    const nameStatus = "M\tsrc/file.ts\n";
    const numStat = "3\t1\tsrc/file.ts\n";
    const untracked = "src/file.ts\n";
    setupSpawnForComparisonWithUntracked(nameStatus, numStat, untracked);

    // When: getCommitComparison is called with UNCOMMITTED_CHANGES_HASH
    const result = await ds.getCommitComparison(REPO, UNCOMMITTED_CHANGES_HASH, "abc123def456");

    // Then: file appears only once (fileLookup skips duplicate)
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].type).toBe("M");
  });

  it("returns diff-only results when ls-files output is empty (TC-059)", async () => {
    // Given: working tree comparison, ls-files returns empty output
    const nameStatus = "M\tsrc/file.ts\n";
    const numStat = "3\t1\tsrc/file.ts\n";
    const untracked = "";
    setupSpawnForComparisonWithUntracked(nameStatus, numStat, untracked);

    // When: getCommitComparison is called with UNCOMMITTED_CHANGES_HASH
    const result = await ds.getCommitComparison(REPO, UNCOMMITTED_CHANGES_HASH, "abc123def456");

    // Then: only diff result is returned, no extra entries
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].type).toBe("M");
  });

  it("skips empty lines in ls-files output (TC-060)", async () => {
    // Given: working tree comparison, ls-files output has empty lines mixed in
    const nameStatus = "M\tsrc/file.ts\n";
    const numStat = "3\t1\tsrc/file.ts\n";
    const untracked = "src/new1.ts\n\nsrc/new2.ts\n";
    setupSpawnForComparisonWithUntracked(nameStatus, numStat, untracked);

    // When: getCommitComparison is called with UNCOMMITTED_CHANGES_HASH
    const result = await ds.getCommitComparison(REPO, UNCOMMITTED_CHANGES_HASH, "abc123def456");

    // Then: empty lines are skipped, only valid file paths are added
    expect(result).not.toBeNull();
    expect(result).toHaveLength(3);
    expect(result![1].newFilePath).toBe("src/new1.ts");
    expect(result![2].newFilePath).toBe("src/new2.ts");
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

  it("returns diff changes plus untracked files (TC-061)", async () => {
    // Given: diff has 1 modified file, ls-files has 1 untracked file
    const nameStatus = "M\tsrc/modified.ts\n";
    const numStat = "10\t3\tsrc/modified.ts\n";
    const untracked = "src/newfile.ts\n";
    setupSpawnForUncommitted(nameStatus, numStat, untracked);

    // When: getUncommittedDetails is called
    const result = await ds.getUncommittedDetails(REPO);

    // Then: fileChanges contains both the diff file and untracked file
    expect(result).not.toBeNull();
    expect(result!.hash).toBe(UNCOMMITTED_CHANGES_HASH);
    expect(result!.fileChanges).toHaveLength(2);
    expect(result!.fileChanges[0]).toEqual({
      oldFilePath: "src/modified.ts",
      newFilePath: "src/modified.ts",
      type: "M",
      additions: 10,
      deletions: 3
    });
    expect(result!.fileChanges[1]).toEqual({
      oldFilePath: "src/newfile.ts",
      newFilePath: "src/newfile.ts",
      type: "A",
      additions: null,
      deletions: null
    });
  });

  it("returns diff changes only when no untracked files exist (TC-062)", async () => {
    // Given: diff has changes but ls-files returns empty output
    const nameStatus = "M\tsrc/file.ts\n";
    const numStat = "5\t2\tsrc/file.ts\n";
    const untracked = "";
    setupSpawnForUncommitted(nameStatus, numStat, untracked);

    // When: getUncommittedDetails is called
    const result = await ds.getUncommittedDetails(REPO);

    // Then: fileChanges contains only the diff file
    expect(result).not.toBeNull();
    expect(result!.fileChanges).toHaveLength(1);
    expect(result!.fileChanges[0].type).toBe("M");
  });

  it("returns only untracked files when diff output is empty (TC-063)", async () => {
    // Given: no diff output, ls-files has 2 untracked files
    const nameStatus = "";
    const numStat = "";
    const untracked = "src/new1.ts\nsrc/new2.ts\n";
    setupSpawnForUncommitted(nameStatus, numStat, untracked);

    // When: getUncommittedDetails is called
    const result = await ds.getUncommittedDetails(REPO);

    // Then: fileChanges contains only untracked files with type "A" and null additions/deletions
    expect(result).not.toBeNull();
    expect(result!.fileChanges).toHaveLength(2);
    expect(result!.fileChanges[0]).toEqual({
      oldFilePath: "src/new1.ts",
      newFilePath: "src/new1.ts",
      type: "A",
      additions: null,
      deletions: null
    });
    expect(result!.fileChanges[1]).toEqual({
      oldFilePath: "src/new2.ts",
      newFilePath: "src/new2.ts",
      type: "A",
      additions: null,
      deletions: null
    });
  });

  it("deduplicates untracked files already present in diff output (TC-064)", async () => {
    // Given: diff has a file, ls-files also lists the same file
    const nameStatus = "A\tsrc/file.ts\n";
    const numStat = "10\t0\tsrc/file.ts\n";
    const untracked = "src/file.ts\n";
    setupSpawnForUncommitted(nameStatus, numStat, untracked);

    // When: getUncommittedDetails is called
    const result = await ds.getUncommittedDetails(REPO);

    // Then: file appears only once (fileLookup prevents duplicate)
    expect(result).not.toBeNull();
    expect(result!.fileChanges).toHaveLength(1);
    expect(result!.fileChanges[0].type).toBe("A");
    expect(result!.fileChanges[0].additions).toBe(10);
  });

  it("skips empty lines in ls-files output (TC-065)", async () => {
    // Given: ls-files output has empty lines mixed in
    const nameStatus = "";
    const numStat = "";
    const untracked = "src/a.ts\n\nsrc/b.ts\n";
    setupSpawnForUncommitted(nameStatus, numStat, untracked);

    // When: getUncommittedDetails is called
    const result = await ds.getUncommittedDetails(REPO);

    // Then: empty lines are skipped, only valid paths are added
    expect(result).not.toBeNull();
    expect(result!.fileChanges).toHaveLength(2);
    expect(result!.fileChanges[0].newFilePath).toBe("src/a.ts");
    expect(result!.fileChanges[1].newFilePath).toBe("src/b.ts");
  });

  it("returns null when spawn throws an exception (TC-066)", async () => {
    // Given: cp.spawn throws synchronously
    spawnMock.mockImplementation(() => {
      throw new Error("spawn ENOENT");
    });

    // When: getUncommittedDetails is called
    const result = await ds.getUncommittedDetails(REPO);

    // Then: Returns null (caught by try-catch block)
    expect(result).toBeNull();
  });

  it("parses renamed files correctly in diff output (TC-067)", async () => {
    // Given: diff has a renamed file with R status
    const nameStatus = "R100\tsrc/old.ts\tsrc/new.ts\n";
    const numStat = "2\t1\tsrc/{old.ts => new.ts}\n";
    const untracked = "";
    setupSpawnForUncommitted(nameStatus, numStat, untracked);

    // When: getUncommittedDetails is called
    const result = await ds.getUncommittedDetails(REPO);

    // Then: GitCommitDetails is returned with correct hash and file change data
    expect(result).not.toBeNull();
    expect(result!.hash).toBe(UNCOMMITTED_CHANGES_HASH);
    expect(result!.fileChanges).toHaveLength(1);
    expect(result!.fileChanges[0].oldFilePath).toBe("src/old.ts");
    expect(result!.fileChanges[0].newFilePath).toBe("src/new.ts");
    expect(result!.fileChanges[0].type).toBe("R");
    expect(result!.fileChanges[0].additions).toBe(2);
    expect(result!.fileChanges[0].deletions).toBe(1);
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
    expect(spawnMock).toHaveBeenCalledWith("git", ["pull"], { cwd: REPO });
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

  it("push passes correct args: ['push'] (TC-074)", async () => {
    // Given: DataSource instance
    spawnMock.mockImplementation(() => createCommandMockProcess());

    // When: push(repo) is called
    const result = await ds.push(REPO);

    // Then: spawn is called with ["push"] and correct cwd
    expect(spawnMock).toHaveBeenCalledWith("git", ["push"], { cwd: REPO });
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
