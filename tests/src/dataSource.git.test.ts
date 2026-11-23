import * as cp from "node:child_process";
import { EventEmitter } from "node:events";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { PassThrough } from "node:stream";
import { pathToFileURL } from "node:url";

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

// Exercise several boundaries in a small repository regardless of the calibrated production size.
vi.mock("../../src/types", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/types")>()),
  HISTORY_SEARCH_BATCH_SIZE: 3
}));

import { getConfig } from "../../src/config";
import { DataSource } from "../../src/dataSource";
import type {
  BranchCleanupResult,
  CommitOrdering,
  FileHistoryEntry,
  RequestLoadCommits,
  RequestStartHistorySearch
} from "../../src/types";
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

// @see docs/testing/perspectives/src/dataSource-test/01-history-diff-01.md (S54)
describe("continuing ordinary Git history", () => {
  let fixture: GitFixture;
  let ds: DataSource;
  beforeEach(async () => {
    fixture = await createFixture();
    ds = new DataSource();
    for (const message of ["two", "three", "four", "five", "six"]) {
      git(fixture.repo, ["commit", "--allow-empty", "-m", message]);
    }
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    await fs.rm(fixture.root, { recursive: true, force: true });
  });

  function query(maxCommits: number, pageToken?: number): RequestLoadCommits {
    return {
      command: "loadCommits",
      repo: fixture.repo,
      branches: [],
      maxCommits,
      showRemoteBranches: true,
      authors: [],
      commitOrdering: "date",
      hard: true,
      pageToken
    };
  }
  function full(count: number, order: CommitOrdering = "date", authors: string[] = []) {
    return ds.getCommits(fixture.repo, [], count, true, authors, order);
  }

  function addLinearCommits(count: number) {
    const base = git(fixture.repo, ["rev-parse", "HEAD"]);
    const commits = Array.from({ length: count }, (_, i) => {
      const message = `row ${i}`;
      return [
        `commit refs/heads/${MAIN_BRANCH}`,
        "committer Test User <test@example.com> now",
        `data ${message.length}`,
        message,
        ...(i === 0 ? [`from ${base}`] : [])
      ].join("\n");
    });
    cp.execFileSync("git", ["fast-import", "--quiet", "--date-format=now"], {
      cwd: fixture.repo,
      input: `${commits.join("\n")}\n`
    });
  }

  // @see docs/testing/perspectives/src/dataSource-test/01-history-diff-02.md (S56)
  it("keeps the ordinary 300 positions while displaying pins, stashes and the working tree (TC-390, TC-391)", async () => {
    const { repo, root } = fixture;
    addLinearCommits(300);
    const pinned = path.join(root, "pinned");
    git(repo, ["worktree", "add", "--detach", pinned, "HEAD"]);
    git(pinned, ["commit", "--allow-empty", "-m", "pin"]);
    for (const message of ["one", "two"]) {
      await fs.writeFile(path.join(repo, "work"), message);
      git(repo, ["stash", "push", "--include-untracked", "-m", message]);
    }
    await fs.writeFile(path.join(repo, "work"), "uncommitted");
    const config = getConfig();
    vi.mocked(getConfig).mockReturnValue({ ...config, showUncommittedChanges: () => true });
    try {
      const hashes = git(repo, ["log", "--date-order", "--branches", "--format=%H"]).split("\n");
      for (const count of [300, 400]) {
        const result = await full(count);
        expect(result.history).toEqual({
          kind: "verified",
          snapshot: expect.any(String),
          hashes: hashes.slice(0, count),
          requestedCount: count
        });
        expect(result.commits.map((row) => row.hash)).toContain(git(pinned, ["rev-parse", "HEAD"]));
        expect(result.commits.filter((row) => row.stash !== null)).toHaveLength(2);
        expect(result.commits).toHaveLength(Math.min(hashes.length, count) + 4);
        expect(result.moreCommitsAvailable).toBe(count < hashes.length);
        expect(result.pageToken).toBeUndefined();
      }
    } finally {
      vi.mocked(getConfig).mockReturnValue(config);
    }
  });

  function interceptGit(intercept: (args: string[]) => cp.ChildProcess | void) {
    const spawn = actualSpawnRef.current as typeof cp.spawn;
    vi.mocked(cp.spawn).mockImplementation(
      ((command: string, args: string[], options: cp.SpawnOptions) =>
        intercept(args) ?? spawn(command, args, options)) as typeof cp.spawn
    );
  }

  // @see docs/testing/perspectives/src/dataSource-test/01-history-diff-02.md (S57)
  describe("streaming search", () => {
    afterEach(() => {
      vi.mocked(cp.spawn).mockImplementation(actualSpawnRef.current as typeof cp.spawn);
    });

    async function searchRequest(
      fields: Partial<RequestStartHistorySearch> = {}
    ): Promise<RequestStartHistorySearch> {
      const request = {
        command: "startHistorySearch" as const,
        viewId: "graph",
        generation: 1,
        requestId: 1,
        repo: fixture.repo,
        skip: 2,
        branches: [],
        authors: [],
        commitOrdering: "date" as const,
        showRemoteBranches: true,
        ...fields
      };
      const { history } = await ds.getCommits(
        request.repo,
        request.branches,
        request.skip,
        request.showRemoteBranches,
        request.authors,
        request.commitOrdering
      );
      if (history.kind !== "verified") throw new Error("Unverified fixture");
      return { ...request, snapshot: history.snapshot };
    }

    function controlledLog() {
      const events = new EventEmitter();
      const child = Object.assign(events, {
        pid: 123,
        exitCode: null as number | null,
        signalCode: null as string | null,
        stdin: new PassThrough(),
        stdout: new PassThrough(),
        stderr: new PassThrough(),
        kill: vi.fn(() => true)
      });
      const finish = (code: number) => {
        child.exitCode = code;
        child.emit("exit", code, null);
        child.emit("close", code, null);
      };
      return { child, finish, proc: child as unknown as cp.ChildProcess };
    }

    // Case: TC-395, TC-396, TC-399
    it("joins the graph prefix to one ordered multi-tip walk with the same parents and refs", async () => {
      const { repo } = fixture;
      git(repo, ["switch", "-c", "topic", "HEAD~3"]);
      git(repo, ["commit", "--allow-empty", "--author=Other <other@example.com>", "-m", "side"]);
      git(repo, ["switch", MAIN_BRANCH]);
      git(repo, ["merge", "--no-ff", "topic", "-m", "joined"]);
      git(repo, ["switch", "topic"]);
      git(repo, ["commit", "--allow-empty", "-m", "another tip"]);
      git(repo, ["tag", "v1", "main~2"]);
      git(repo, ["branch", "sibling", "main~2"]);
      git(repo, ["update-ref", "refs/remotes/origin/sibling", "main~2"]);
      git(repo, ["switch", MAIN_BRANCH]);
      addLinearCommits(300);
      for (const order of ["date", "topo", "author-date"] as const) {
        for (const [branches, authors, remotes] of [
          [[], [], true],
          [["main"], ["Test User"], false]
        ] as const) {
          const request = await searchRequest({
            skip: 300,
            commitOrdering: order,
            branches: [...branches],
            authors: [...authors],
            showRemoteBranches: remotes
          });
          const ordinary = await ds.getCommits(
            repo,
            request.branches,
            400,
            remotes,
            request.authors,
            order
          );
          vi.mocked(cp.spawn).mockClear();
          const scan = ds.createHistorySearch(request);
          let pos = request.skip;
          for (;;) {
            const batch = await scan.next();
            if (batch.kind !== "ok") throw new Error(JSON.stringify(batch));
            expect(batch.firstPosition).toBe(pos + 1);
            expect(batch.commits).toEqual(ordinary.commits.slice(pos, pos + 3));
            pos += batch.commits.length;
            if (!batch.hasMore) break;
          }
          expect(pos).toBe(ordinary.commits.length);
          const logs = vi.mocked(cp.spawn).mock.calls.filter(([, args]) => args?.[0] === "log");
          expect(logs).toHaveLength(1);
          expect(logs[0][1]).toContain("--skip=300");
          expect(logs[0][1]).not.toEqual(
            expect.arrayContaining([expect.stringContaining("--max-count")])
          );
          const selected = await ds.getCommits(
            repo,
            request.branches,
            302,
            remotes,
            request.authors,
            order
          );
          expect(selected.commits[301].hash).toBe(ordinary.commits[301].hash);
        }
      }
    });

    // Case: TC-397, TC-398
    it("matches Git's literal author filtering and decodes byte-split UTF-8, separators and CRs", async () => {
      const { repo } = fixture;
      for (const [author, subject] of [
        ["Build[bot]", "更新\r一"],
        ["Buildb", "other"],
        ["numlia 作者", "更新\r\r二"]
      ]) {
        git(repo, [
          "commit",
          "--allow-empty",
          "--cleanup=verbatim",
          `--author=${author} <a@example.com>`,
          "-m",
          subject
        ]);
      }
      git(repo, ["config", "i18n.logOutputEncoding", "EUC-JP"]);
      for (const [filter, subject] of [
        ["Build[bot]", "更新\r一"],
        ["numli", "更新\r\r二"]
      ]) {
        const request = await searchRequest({ skip: 0, authors: [filter] });
        const ordinary = await full(20, "date", [filter]);
        const log = controlledLog();
        interceptGit((args) => {
          if (!args.includes("--skip=0")) return;
          const bytes = cp.execFileSync("git", args, { cwd: repo });
          // setEncoding must carry incomplete code units between writes.
          setImmediate(async () => {
            for (const byte of bytes) {
              log.child.stdout.write(Buffer.from([byte]));
              await new Promise<void>((resolve) => setImmediate(resolve));
            }
            log.child.stdout.end();
            log.finish(0);
          });
          return log.proc;
        });
        expect(await ds.createHistorySearch(request).next()).toEqual({
          kind: "ok",
          commits: ordinary.commits,
          firstPosition: 1,
          hasMore: false
        });
        expect(ordinary.commits.map((row) => row.message)).toEqual([subject]);
      }
    });

    // Case: TC-400, TC-408
    it("leaves bytes after the lookahead on the paused stream and waits for cancellation cleanup before replacement", async () => {
      const request = await searchRequest({ skip: 0 });
      const first = controlledLog();
      const replacement = controlledLog();
      const logs = [first, replacement];
      const starts: number[] = [];
      interceptGit((args) => {
        if (!args.includes("--skip=0")) return;
        const index = starts.length;
        starts.push(index);
        const log = logs[index];
        if (index === 0) {
          const output = cp.execFileSync("git", args, { cwd: fixture.repo });
          setImmediate(() => log.child.stdout.write(output));
        }
        return log.proc;
      });
      const old = ds.createHistorySearch(request);
      expect(await old.next()).toMatchObject({ kind: "ok", firstPosition: 1, hasMore: true });
      expect(first.child.stdout.readableFlowing).toBe(false);
      expect(first.child.stdout.readableLength).toBeGreaterThan(0);
      const pending = ds.createHistorySearch(request).next();
      expect(first.child.kill).toHaveBeenCalledTimes(1);
      expect(first.child.stdout.destroyed).toBe(true);
      expect((await full(2)).commits).toHaveLength(2);
      expect(starts).toEqual([0]);
      first.finish(143);
      await vi.waitFor(() => expect(starts).toEqual([0, 1]));
      const newest = ds.createHistorySearch(request);
      expect(replacement.child.kill).toHaveBeenCalledTimes(1);
      expect(replacement.child.stdout.destroyed).toBe(true);
      replacement.finish(143);
      expect(await pending).toEqual({ kind: "error", message: expect.any(String) });
      await newest.close();
      expect(starts).toEqual([0, 1]);
    });

    // Case: TC-408
    it("reaps the real Git child when a search is cancelled with its pipe paused", async () => {
      addLinearCommits(3000);
      const request = await searchRequest({ skip: 0 });
      const scan = ds.createHistorySearch(request);
      const batch = await scan.next();
      expect(batch).toMatchObject({ kind: "ok", hasMore: true });
      const spawned = vi.mocked(cp.spawn);
      const index = spawned.mock.calls.findLastIndex(
        ([, args]) => Array.isArray(args) && args.includes("--skip=0")
      );
      expect(index).toBeGreaterThanOrEqual(0);
      const child = spawned.mock.results[index].value as cp.ChildProcessWithoutNullStreams;
      expect(child.exitCode).toBeNull();
      await scan.close();
      expect(child.signalCode).toBe("SIGTERM");
      expect(child.stdout.destroyed).toBe(true);
      expect((await full(2)).commits).toHaveLength(2);
    });

    // Case: TC-401, TC-406
    it.each(["empty", "valid", "exit", "malformed", "incomplete"])(
      "waits for Git close and discards an invalid batch (%s)",
      async (mode) => {
        const request = await searchRequest();
        const log = controlledLog();
        let ended!: () => void;
        const delivered = new Promise<void>((resolve) => {
          ended = resolve;
        });
        interceptGit((args) => {
          if (!args.includes("--skip=2")) return;
          const row = cp.execFileSync("git", [...args, "--max-count=1"], {
            cwd: fixture.repo,
            encoding: "utf8"
          });
          setImmediate(() => {
            log.child.stdout.end(
              mode === "empty"
                ? ""
                : `${row}${mode === "incomplete" ? "partial" : mode === "malformed" ? "bad\n" : ""}`
            );
            log.child.stderr.end(mode === "exit" ? "read failure" : "");
            ended();
          });
          return log.proc;
        });
        const report = vi.fn();
        const read = async () => {
          const result = await ds.createHistorySearch(request).next();
          report(result);
          return result;
        };
        const pending = read();
        await delivered;
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(report).not.toHaveBeenCalled();
        log.finish(mode === "exit" ? 128 : 0);
        const result = await pending;
        if (mode === "valid" || mode === "empty") {
          expect(result).toMatchObject({ kind: "ok", hasMore: false, firstPosition: 3 });
          if (result.kind === "ok") expect(result.commits).toHaveLength(mode === "valid" ? 1 : 0);
        } else {
          expect(result).toEqual({
            kind: "error",
            message: mode === "exit" ? "read failure" : "Git returned an invalid history record."
          });
        }
        expect(log.child.stdout.destroyed).toBe(true);
      }
    );

    // Case: TC-406
    it("discards a nonterminal batch if Git exits abnormally during postvalidation", async () => {
      const request = await searchRequest({ skip: 0 });
      const log = controlledLog();
      let checks = 0;
      interceptGit((args) => {
        if (args.includes("--skip=0")) {
          const bytes = cp.execFileSync("git", args, { cwd: fixture.repo });
          setImmediate(() => log.child.stdout.write(bytes));
          return log.proc;
        }
        if (args[0] === "show-ref" && ++checks === 2) {
          log.child.stderr.end("walk failed");
          log.finish(128);
        }
      });
      expect(await ds.createHistorySearch(request).next()).toEqual({
        kind: "error",
        message: "walk failed"
      });
      expect(log.child.stdout.destroyed).toBe(true);
    });

    // Case: TC-402, TC-404, TC-405, TC-407
    it("verifies before and after every batch and after EOF without starting another walk", async () => {
      const { repo } = fixture;
      const request = await searchRequest({ skip: 5, showRemoteBranches: false });
      const verify = () => ds.verifyHistorySearch(repo, false, request.snapshot);
      git(repo, ["update-ref", "refs/remotes/origin/topic", "HEAD~2"]);
      expect(await ds.createHistorySearch(request).next()).toMatchObject({
        kind: "ok",
        hasMore: false
      });
      vi.mocked(cp.spawn).mockClear();
      expect(await verify()).toEqual({ kind: "ok" });
      git(repo, ["tag", "incoming"]);
      expect(await verify()).toEqual({ kind: "historyChanged" });
      for (const phase of ["before", "after", "change"]) {
        git(repo, ["tag", "-d", "incoming"]);
        let checks = 0;
        interceptGit((args) => {
          if (args[0] === "show-ref" && ++checks === (phase === "before" ? 1 : 2)) {
            if (phase === "change") git(repo, ["tag", "incoming"]);
            else return createGitProcess({ stderr: "unavailable", exitCode: 128 });
          }
        });
        const result = await ds.createHistorySearch(request).next();
        expect(result).toEqual(
          phase === "change"
            ? { kind: "historyChanged" }
            : { kind: "error", message: expect.any(String) }
        );
        if (phase === "before")
          expect(
            vi.mocked(cp.spawn).mock.calls.filter(([, args]) => args?.[0] === "log")
          ).toHaveLength(0);
        if (phase !== "change") git(repo, ["tag", "incoming"]);
      }
      vi.mocked(cp.spawn).mockClear();
      await fs.writeFile(path.join(repo, ".git/refs/remotes/origin/topic"), `${"f".repeat(40)}\n`);
      expect(await verify()).toEqual({ kind: "error", message: expect.any(String) });
      expect(vi.mocked(cp.spawn).mock.calls.filter(([, args]) => args?.[0] === "log")).toHaveLength(
        0
      );
    });

    // Case: TC-403
    it.each([
      "shallow",
      "graft",
      "replacement",
      "core.useReplaceRefs",
      "worktree map",
      "mailmap.file",
      "file contents",
      "mailmap.blob",
      "blob contents",
      "log.mailmap"
    ])("discards the next batch if %s changes without moving a displayed ref", async (input) => {
      const { repo, root } = fixture;
      const mapFile = path.join(root, "authors");
      const indexMap = path.join(repo, "authors.map");
      await fs.writeFile(mapFile, "");
      await fs.writeFile(indexMap, "");
      git(repo, ["add", "authors.map"]);
      if (input === "file contents") git(repo, ["config", "mailmap.file", mapFile]);
      if (input === "blob contents") git(repo, ["config", "mailmap.blob", ":authors.map"]);
      const graft = path.join(root, "effective-grafts");
      vi.stubEnv("GIT_GRAFT_FILE", graft);
      const request = await searchRequest({ skip: 0 });
      const scan = ds.createHistorySearch(request);
      expect(await scan.next()).toMatchObject({ kind: "ok", hasMore: true });
      const hash = git(repo, ["rev-parse", "HEAD~4"]);
      const mapping = "Canonical <test@example.com>\n";
      switch (input) {
        case "shallow":
          await fs.writeFile(path.join(repo, ".git/shallow"), `${hash}\n`);
          break;
        case "graft":
          await fs.writeFile(graft, `${hash}\n`);
          break;
        case "replacement":
          git(repo, ["replace", "--graft", hash]);
          break;
        case "worktree map":
          await fs.writeFile(path.join(repo, ".mailmap"), mapping);
          break;
        case "mailmap.file":
          git(repo, ["config", input, mapFile]);
          break;
        case "mailmap.blob":
          git(repo, ["config", input, ":authors.map"]);
          break;
        case "file contents":
          await fs.writeFile(mapFile, mapping);
          break;
        case "blob contents":
          await fs.writeFile(indexMap, mapping);
          git(repo, ["add", "authors.map"]);
          break;
        default:
          git(repo, ["config", input, "false"]);
      }
      expect(await scan.next()).toEqual({ kind: "historyChanged" });
    });
  });

  it("distinguishes a visible ref change around a tokenless load from an unreadable input (TC-392, TC-393)", async () => {
    const { repo } = fixture;
    const original = await full(100);
    let reads = 0;
    interceptGit((args) => {
      if (args[0] === "show-ref" && ++reads === 2) git(repo, ["tag", "appeared"]);
    });
    try {
      const changed = await full(100);
      expect(changed.commits).toEqual(original.commits);
      expect(changed.history).toEqual({ kind: "historyChanged" });
      expect(reads).toBe(2);
      for (const phase of ["before", "after", "log"]) {
        reads = 0;
        interceptGit((args) => {
          if (
            (args[0] === "show-ref" &&
              ++reads === (phase === "before" ? 1 : 2) &&
              phase !== "log") ||
            (phase === "log" && args[0] === "log")
          ) {
            return createGitProcess({ stderr: "unreadable", exitCode: 128 });
          }
        });
        const failure = await full(100);
        expect(failure.history).toEqual({ kind: "unavailable" });
        expect(failure.commits.map((row) => row.hash)).toEqual(
          phase === "log" ? [] : original.commits.map((row) => row.hash)
        );
      }
    } finally {
      vi.mocked(cp.spawn).mockImplementation(actualSpawnRef.current as typeof cp.spawn);
    }
  });

  it("normalizes ref order and observes independently changed HEADs, names, kinds and targets (TC-394)", async () => {
    const { repo } = fixture;
    git(repo, ["tag", "named"]);
    git(repo, ["update-ref", "refs/remotes/origin/topic", "HEAD~2"]);
    const initial = await full(2);
    const listed = git(repo, ["show-ref", "-d", "--head"]).split("\n");
    const fullRead = async (lines: string[]) => {
      interceptGit((args) => {
        if (args[0] === "show-ref") return createGitProcess({ stdout: `${lines.join("\n")}\n` });
      });
      return (await full(2)).history;
    };
    try {
      expect(initial.history.kind).toBe("verified");
      expect(await fullRead([...listed].reverse())).toEqual(initial.history);
      const target = git(repo, ["rev-parse", "HEAD~3"]);
      for (const modified of [
        listed.map((line) => (line.endsWith(" HEAD") ? `${target} HEAD` : line)),
        listed.map((line) => line.replace("refs/tags/named", "refs/tags/renamed")),
        listed.map((line) => line.replace("refs/tags/named", "refs/heads/named")),
        listed.map((line) =>
          line.endsWith(" refs/tags/named") ? `${target} refs/tags/named` : line
        )
      ]) {
        const info = await fullRead(modified);
        expect(info.kind).toBe("verified");
        expect(info).not.toEqual(initial.history);
      }
    } finally {
      vi.mocked(cp.spawn).mockImplementation(actualSpawnRef.current as typeof cp.spawn);
    }
  });

  it("ignores only a successfully enumerated hidden remote for search (TC-393, TC-394)", async () => {
    const { repo } = fixture;
    const hidden = () => ds.getCommits(repo, [], 2, false, [], "date");
    const remote = "refs/remotes/origin/topic";
    git(repo, ["update-ref", remote, "HEAD~2"]);
    const first = await hidden();
    expect(first.history.kind).toBe("verified");
    git(repo, ["update-ref", remote, "HEAD~3"]);
    expect(
      await ds.getNextHistoryPage({ ...query(3, first.pageToken), showRemoteBranches: false })
    ).toBeUndefined();
    expect((await hidden()).history).toEqual(first.history);
    await fs.writeFile(path.join(repo, ".git", remote), `${"f".repeat(40)}\n`);
    const broken = await hidden();
    expect(broken.history).toEqual({ kind: "unavailable" });
    expect(broken.commits.map((row) => row.hash)).toEqual(first.commits.map((row) => row.hash));
  });

  // Case: TC-381
  it("preserves single and consecutive carriage returns and reads the following records (TC-381)", async () => {
    for (const subject of ["one\rreturn", "two\r\rreturns", "newest"]) {
      git(fixture.repo, ["commit", "--allow-empty", "--cleanup=verbatim", "-m", subject]);
    }
    const expected = git(fixture.repo, ["log", "-z", "--format=%H%x00%P%x00%s", "-4"]).split("\0");
    // The helper trims whitespace, but preserves Git's final NUL.
    expect(
      (await full(4)).commits.flatMap((row) => [row.hash, row.parentHashes.join(" "), row.message])
    ).toEqual(expected.slice(0, -1));
  });

  // Case: TC-382
  it.each(["EUC-JP", "UTF-8"])(
    "keeps Japanese history readable when Git's output encoding changes from %s (TC-382)",
    async (initialEncoding) => {
      const { repo } = fixture;
      const subjects = ["更新一", "更新二", "更新三", "更新四"];
      for (const subject of subjects) {
        git(repo, ["commit", "--allow-empty", "--author=作者 <author@example.com>", "-m", subject]);
      }
      git(repo, ["config", "i18n.logOutputEncoding", initialEncoding]);
      const first = await full(2);
      git(repo, [
        "config",
        "i18n.logOutputEncoding",
        initialEncoding === "UTF-8" ? "EUC-JP" : "UTF-8"
      ]);
      const page = await ds.getNextHistoryPage(query(4, first.pageToken));
      expect(page).toBeDefined();
      const combined = first.commits.concat(page!.commits);
      expect(combined.map((row) => row.message)).toEqual(subjects.toReversed());
      expect(combined.map((row) => row.author)).toEqual(subjects.map(() => "作者"));
      expect(first.authors).toContain("作者");
      expect(combined).toEqual((await full(4)).commits);
    }
  );

  // Case: TC-382
  it("reads Japanese subjects from stashes and detached worktree heads in UTF-8 (TC-382)", async () => {
    const { repo, root } = fixture;
    const detached = path.join(root, "detached");
    git(repo, ["worktree", "add", "--detach", detached, "HEAD"]);
    git(detached, ["commit", "--allow-empty", "-m", "別の履歴"]);
    const pinnedHash = git(detached, ["rev-parse", "HEAD"]);
    await fs.writeFile(path.join(repo, "work.txt"), "work");
    git(repo, ["stash", "push", "--include-untracked", "-m", "退避"]);
    git(repo, ["config", "i18n.logOutputEncoding", "EUC-JP"]);

    const { commits } = await full(2);
    expect(commits.find((row) => row.hash === pinnedHash)?.message).toBe("別の履歴");
    expect(commits.find((row) => row.stash !== null)?.message).toContain("退避");
  });

  // Case: TC-382
  it("preserves Git order, both merge parents and refs across multi-tip and author-filtered walks (TC-382)", async () => {
    const { repo } = fixture;
    git(repo, ["switch", "-c", "topic", "HEAD~3"]);
    git(repo, ["commit", "--allow-empty", "--author=Second <second@example.com>", "-m", "side"]);
    git(repo, ["switch", MAIN_BRANCH]);
    git(repo, ["merge", "--no-ff", "topic", "-m", "joined"]);
    git(repo, ["switch", "topic"]);
    git(repo, ["commit", "--allow-empty", "-m", "another tip"]);
    git(repo, ["tag", "older", "main~2"]);
    for (const order of ["date", "topo", "author-date"] as const) {
      for (const authors of [[], ["Test User"]]) {
        const expected = await full(100, order, authors);
        const first = await full(2, order, authors);
        const page = await ds.getNextHistoryPage({
          ...query(100, first.pageToken),
          authors,
          commitOrdering: order
        });
        expect(page?.baseCount).toBe(2);
        const rows = first.commits.concat(page!.commits);
        expect(rows).toEqual(expected.commits);
        expect(rows.map((row) => [row.hash, ...row.parentHashes].join(" "))).toEqual(
          git(repo, [
            "log",
            `--${order}-order`,
            ...authors.map((a) => `--author=${a}`),
            "--format=%H %P",
            "--branches",
            "--tags",
            "--remotes"
          ])
            .split("\n")
            .map((line) => line.trimEnd())
        );
      }
    }
  });

  // Case: TC-389
  it("keeps a literal author filter across a Git pattern mode change (TC-389)", async () => {
    const { repo, root } = fixture;
    const authors = ["Build[bot]"];
    const config = path.join(root, "author-filter.config");
    await fs.writeFile(config, "[grep]\n\tpatternType = basic\n");
    git(repo, ["config", "include.path", config]);
    for (const subject of ["bot 1", "bot 2", "bot 3", "bot 4", "bot 5"]) {
      git(repo, [
        "commit",
        "--allow-empty",
        "--author=Build[bot] <bot@example.com>",
        "-m",
        subject
      ]);
    }
    git(repo, ["commit", "--allow-empty", "--author=Buildb <other@example.com>", "-m", "other"]);

    const first = await full(2, "date", authors);
    expect(first.commits.map((row) => row.message)).toEqual(["bot 5", "bot 4"]);
    await fs.writeFile(config, "[grep]\n\tpatternType = fixed\n");
    expect(git(repo, ["config", "--get", "grep.patternType"])).toBe("fixed");
    const page = await ds.getNextHistoryPage({ ...query(4, first.pageToken), authors });
    const fresh = await full(4, "date", authors);

    expect(page?.commits.map((row) => row.message)).toEqual(["bot 3", "bot 2"]);
    expect(first.commits.concat(page!.commits)).toEqual(fresh.commits);
    expect(page!.moreCommitsAvailable).toBe(true);
    expect(fresh.moreCommitsAvailable).toBe(true);
  });

  // Case: TC-386
  it.each(["worktree", "external", "index blob"])(
    "invalidates the author-filtered page when the %s mailmap changes (TC-386)",
    async (source) => {
      const { repo, root } = fixture;
      const map =
        source === "external"
          ? path.join(root, "author map")
          : path.join(repo, source === "worktree" ? ".mailmap" : "authors.map");
      if (source === "external") git(repo, ["config", "mailmap.file", map]);
      if (source === "index blob") git(repo, ["config", "mailmap.blob", ":authors.map"]);
      const writeMapping = async (name: string) => {
        await fs.writeFile(map, `${name} <test@example.com>\n`);
        if (source === "index blob") git(repo, ["add", "authors.map"]);
      };
      const authors = ["Mapped User"];
      await writeMapping(authors[0]);
      const first = await full(2, "date", authors);
      expect(first.commits).toHaveLength(2);
      const stable = await ds.getNextHistoryPage({ ...query(3, first.pageToken), authors });
      expect(stable?.commits.map((c) => c.hash)).toEqual([git(repo, ["rev-parse", "HEAD~2"])]);
      expect(stable?.pageToken).toBeTypeOf("number");

      const refs = listRefs(repo);
      await writeMapping("Former User");
      expect(listRefs(repo)).toBe(refs);
      if (source === "external") expect(git(repo, ["status", "--porcelain"])).toBe("");
      expect(
        await ds.getNextHistoryPage({ ...query(4, stable!.pageToken), authors })
      ).toBeUndefined();
      expect((await full(4, "date", authors)).commits).toEqual([]);
    }
  );

  // @see docs/testing/perspectives/src/dataSource-test/01-history-diff-01.md (S54, S55)
  // Case: TC-386, TC-387
  it.each([
    { kind: "file", id: "TC-386" },
    { kind: "symlink", id: "TC-387" }
  ])(
    "refreshes unfiltered author choices after editing an external $kind ($id)",
    async ({ kind }) => {
      const { repo, root } = fixture;
      const map = path.join(root, "author map");
      await fs.writeFile(map, "");
      const configured = kind === "symlink" ? path.join(root, "linked map") : map;
      if (kind === "symlink") await fs.symlink(path.basename(map), configured, "file");
      git(repo, ["config", "mailmap.file", configured]);
      const first = await full(2);
      expect(first.authors).toEqual(["Test User"]);
      const stable = await ds.getNextHistoryPage(query(3, first.pageToken));
      expect(stable?.pageToken).toBeTypeOf("number");

      const refs = listRefs(repo);
      await fs.writeFile(map, "Canonical <test@example.com>\n");
      expect(listRefs(repo)).toBe(refs);
      expect(git(repo, ["status", "--porcelain"])).toBe("");
      expect(await ds.getNextHistoryPage(query(4, stable!.pageToken))).toBeUndefined();
      const refreshed = await full(4);
      expect(refreshed.authors).toEqual(["Canonical"]);
      expect(refreshed.commits.map((row) => row.hash)).toEqual(
        git(repo, ["log", "-4", "--format=%H"]).split("\n")
      );
    }
  );

  // Case: TC-388
  it("continues past a bare log.mailmap setting and detects a change to false (TC-388)", async () => {
    const { repo, root } = fixture;
    const config = path.join(root, "mailmap.config");
    await fs.writeFile(config, "[log]\n\tmailmap\n");
    git(repo, ["config", "include.path", config]);
    expect(git(repo, ["config", "--bool", "--get", "log.mailmap"])).toBe("true");

    const first = await full(2);
    const page = await ds.getNextHistoryPage(query(3, first.pageToken));
    expect(page?.commits.map((row) => row.hash)).toEqual([git(repo, ["rev-parse", "HEAD~2"])]);
    expect(page?.pageToken).toBeTypeOf("number");
    await fs.writeFile(config, "[log]\n\tmailmap = false\n");
    expect(await ds.getNextHistoryPage(query(4, page!.pageToken))).toBeUndefined();
  });

  // Case: TC-383
  it("resumes a linear walk from its saved parent and sends only the next 100 commits (TC-383)", async () => {
    addLinearCommits(100);
    const refs = git(fixture.repo, ["log", "--date-order", "--format=%H"]).split("\n");
    const first = await full(3);
    vi.mocked(cp.spawn).mockClear();
    const result = await ds.getNextHistoryPage(query(103, first.pageToken));
    const logs = vi
      .mocked(cp.spawn)
      .mock.calls.filter(([, args]) => Array.isArray(args) && args[0] === "log");
    expect(logs).toHaveLength(1);
    expect(logs[0][1]).toEqual(expect.arrayContaining(["--max-count=100", refs[4]]));
    expect(result?.commits.map((row) => row.hash)).toEqual(refs.slice(3, 103));
    expect(result?.moreCommitsAvailable).toBe(true);
    expect(result?.pageToken).toBeTypeOf("number");
  });

  // Case: TC-384
  it.each([4, 5])(
    "ends an exact or short final page after %i loaded commits (TC-384)",
    async (count) => {
      const first = await full(count);
      const page = await ds.getNextHistoryPage(query(count + 2, first.pageToken));
      expect(page?.commits.map((row) => row.hash)).toEqual(
        git(fixture.repo, ["log", `--skip=${count}`, "--format=%H"]).split("\n")
      );
      expect(page?.moreCommitsAvailable).toBe(false);
      expect(page?.pageToken).toBeUndefined();
      expect(await ds.getNextHistoryPage(query(count + 4, first.pageToken))).toBeUndefined();
    }
  );

  // Case: TC-385
  it.each(["create", "edit", "remove"])(
    "reloads history after a graft file %s with unchanged refs (TC-385)",
    async (change) => {
      const { repo, root } = fixture;
      const [six, five, four, three, two] = git(repo, ["rev-list", "HEAD"]).split("\n");
      git(repo, ["config", "advice.graftFileDeprecated", "false"]);
      const grafts =
        change === "edit"
          ? path.join(root, "external grafts")
          : path.join(repo, ".git", "info", "grafts");
      vi.stubEnv("GIT_GRAFT_FILE", change === "edit" ? grafts : undefined);
      if (change !== "create") await fs.writeFile(grafts, `${five} ${two}\n`);
      const refs = listRefs(repo);
      const first = await full(1);
      const second = await ds.getNextHistoryPage(query(2, first.pageToken));
      expect(second?.commits.map((row) => row.parentHashes)).toEqual([
        [change === "create" ? four : two]
      ]);
      expect(second?.pageToken).toBeTypeOf("number");

      if (change === "remove") await fs.unlink(grafts);
      else await fs.writeFile(grafts, `${five}\n`);
      expect(listRefs(repo)).toBe(refs);
      expect(await ds.getNextHistoryPage(query(4, second!.pageToken))).toBeUndefined();
      const refreshed = await full(4);
      expect(refreshed.commits.map((row) => [row.hash, ...row.parentHashes])).toEqual(
        change === "remove"
          ? [
              [six, five],
              [five, four],
              [four, three],
              [three, two]
            ]
          : [[six, five], [five]]
      );
      expect(refreshed.moreCommitsAvailable).toBe(change === "remove");
    }
  );

  // Case: TC-385
  it.each([true, false])(
    "reloads the full range when core.useReplaceRefs changes from %s (TC-385)",
    async (initialMode) => {
      const { repo, root } = fixture;
      const [five, four, , two] = git(repo, ["rev-list", "HEAD^"]).split("\n");
      git(repo, ["replace", "--graft", five, two]);
      const config = path.join(root, "replacement.config");
      git(repo, ["config", "--file", config, "core.useReplaceRefs", String(initialMode)]);
      git(repo, ["config", "include.path", config]);
      const refs = listRefs(repo);

      const first = await full(1);
      const second = await ds.getNextHistoryPage(query(2, first.pageToken));
      expect(second?.commits.map((row) => [row.hash, ...row.parentHashes])).toEqual([
        [five, initialMode ? two : four]
      ]);
      expect(second?.pageToken).toBeTypeOf("number");

      git(repo, ["config", "--file", config, "core.useReplaceRefs", String(!initialMode)]);
      expect(listRefs(repo)).toBe(refs);
      const requestedCount = 4;
      expect(await ds.getNextHistoryPage(query(requestedCount, second!.pageToken))).toBeUndefined();
      const refreshed = await full(requestedCount);
      const expected = git(repo, ["log", "--date-order", "--format=%H %P"]).split("\n");
      expect(refreshed.commits.map((row) => [row.hash, ...row.parentHashes])).toEqual(
        expected.slice(0, requestedCount).map((line) => line.trimEnd().split(" "))
      );
      expect(refreshed.moreCommitsAvailable).toBe(expected.length > requestedCount);
    }
  );

  // Case: TC-385
  it("replaces history when deepening a shallow clone changes parents without moving refs (TC-385)", async () => {
    const clone = path.join(fixture.root, "shallow");
    git(fixture.root, ["clone", "--depth=3", pathToFileURL(fixture.repo).href, clone]);
    const stable = await ds.getCommits(clone, [], 2, true, [], "date");
    expect(stable.pageToken).toBeTypeOf("number");
    const last = await ds.getNextHistoryPage({ ...query(3, stable.pageToken), repo: clone });
    expect(last?.commits.map((row) => row.hash)).toEqual([git(clone, ["rev-parse", "HEAD~2"])]);
    expect(last?.moreCommitsAvailable).toBe(false);
    const first = await ds.getCommits(clone, [], 2, true, [], "date");
    expect(first.pageToken).toBeTypeOf("number");
    const oldRefs = listRefs(clone);
    git(clone, ["fetch", "--deepen=2", "origin"]);
    expect(listRefs(clone)).toBe(oldRefs);
    expect(
      await ds.getNextHistoryPage({ ...query(4, first.pageToken), repo: clone })
    ).toBeUndefined();
    const replacement = await ds.getCommits(clone, [], 4, true, [], "date");
    expect(replacement.commits.map((row) => [row.hash, ...row.parentHashes])).toEqual(
      git(clone, ["log", "-4", "--date-order", "--format=%H %P"])
        .split("\n")
        .map((line) => line.trim().split(" "))
    );
  });

  // Case: TC-385
  it.each(["query", "filter", "token", "refs", "worktree", "dirty", "stash"])(
    "falls back to a fresh history after a %s change (TC-385)",
    async (change) => {
      const { repo, root } = fixture;
      const config = getConfig();
      vi.mocked(getConfig).mockReturnValue({
        ...config,
        showUncommittedChanges: () => true
      } as typeof config);
      try {
        const first = await full(2);
        expect(first.pageToken).toBeTypeOf("number");
        const request = query(4, first.pageToken);
        if (change === "query") request.commitOrdering = "topo";
        if (change === "filter") request.authors = ["missing author"];
        if (change === "token") request.pageToken = -1;
        if (change === "refs") git(repo, ["tag", "new-ref"]);
        if (change === "worktree")
          git(repo, ["worktree", "add", "--detach", path.join(root, "second"), "HEAD~4"]);
        if (change === "dirty" || change === "stash")
          await fs.writeFile(path.join(repo, "change"), "local");
        if (change === "stash") git(repo, ["stash", "push", "--include-untracked"]);
        expect(await ds.getNextHistoryPage(request)).toBeUndefined();
        if (change === "dirty") vi.spyOn(Date.prototype, "getTime").mockReturnValue(1700000000000);
        const fresh = await full(4, request.commitOrdering, request.authors);
        expect(fresh.commits).toEqual(
          (
            await new DataSource().getCommits(
              repo,
              [],
              4,
              true,
              request.authors,
              request.commitOrdering
            )
          ).commits
        );
      } finally {
        vi.mocked(getConfig).mockReturnValue(config);
      }
    }
  );
});

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
      let stdout: string | null = null;
      try {
        this.git(["merge", branch, "-m", subject]);
      } catch (error: unknown) {
        stdout = String((error as { stdout?: unknown }).stdout ?? "");
      }
      // execFileSync reports only "Command failed: ..." in the error message, so any
      // Git failure would satisfy a bare toThrow(). Git writes the conflict itself to
      // stdout (LC_ALL=C above keeps the wording fixed), and the unmerged index
      // entries confirm the fixture really stopped in the conflicted state.
      expect(stdout).not.toBeNull();
      expect(stdout).toContain("Automatic merge failed");
      expect(this.git(["ls-files", "--unmerged"])).not.toBe("");
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

  // @see docs/testing/perspectives/src/dataSource-test/07-file-history-01.md
  describe("rename chain (S53)", () => {
    it("follows a two-step rename chain behind a rename-undetected merge (TC-377)", async () => {
      // Case: TC-377
      // Given: base oldest -> edit -> unrelated main -> feature renames oldest -> legacy -> current
      //        and rewrites it -> --no-ff merge -> fix
      const OLDEST = "src/oldest-name.txt";
      const repo = await initFixture("rename-chain");
      await repo.write(OLDEST, numberedLines("line", 3));
      await repo.commitAll("base: add oldest file");
      await repo.append(OLDEST, "oldest");
      await repo.commitAll("feat: update oldest file");
      await repo.write("README.md", "readme\n");
      await repo.commitAll("docs: unrelated main change");
      repo.git(["branch", "feature", repo.hashOf("feat: update oldest file")]);
      repo.git(["checkout", "feature"]);
      repo.git(["mv", OLDEST, LEG]);
      await repo.commitAll("refactor: rename oldest to legacy");
      repo.git(["mv", LEG, CUR]);
      await repo.commitAll("refactor: rename legacy to current");
      await repo.write(CUR, numberedLines("different content", 8));
      await repo.commitAll("feat: update renamed file");
      repo.git(["checkout", MAIN_BRANCH]);
      repo.git(["merge", "feature", "-m", "merge: rename feature"]);
      await repo.append(CUR, "fix");
      await repo.commitAll("fix: update file after merge");

      // When/Then: both renames are followed down to the oldest path's birth
      await expectHistory(repo, "fix: update file after merge", CUR, [
        E("fix: update file after merge", "M", false, CUR),
        E("merge: rename feature", "A", true, CUR),
        E("feat: update renamed file", "M", false, CUR),
        E("refactor: rename legacy to current", "R", false, CUR),
        E("refactor: rename oldest to legacy", "R", false, LEG),
        E("feat: update oldest file", "M", false, OLDEST),
        E("base: add oldest file", "A", false, OLDEST)
      ]);
    });

    it("follows the renamed file when a later rename reuses its old path (TC-380)", async () => {
      // Case: TC-380
      // Given: base legacy + other -> edit legacy -> rename legacy -> current
      //        -> rename other -> legacy -> fix current
      const OTHER = "src/other-name.txt";
      const repo = await initFixture("reused-old-path");
      await repo.write(LEG, numberedLines("legacy", 4));
      await repo.write(OTHER, numberedLines("other", 4));
      await repo.commitAll("base: add legacy and other");
      await repo.append(LEG, "edit");
      await repo.commitAll("feat: update legacy file");
      repo.git(["mv", LEG, CUR]);
      await repo.commitAll("refactor: rename legacy to current");
      repo.git(["mv", OTHER, LEG]);
      await repo.commitAll("refactor: rename other to legacy");
      await repo.append(CUR, "fix");
      await repo.commitAll("fix: update current file");

      // When/Then: the legacy-path history is the renamed file's, not the other file's
      await expectHistory(repo, "fix: update current file", CUR, [
        E("fix: update current file", "M", false, CUR),
        E("refactor: rename legacy to current", "R", false, CUR),
        E("feat: update legacy file", "M", false, LEG),
        E("base: add legacy and other", "A", false, LEG)
      ]);
    });
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
