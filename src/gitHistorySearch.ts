import type { ChildProcessWithoutNullStreams } from "node:child_process";

import {
  type GitCommit,
  type GitRef,
  HISTORY_SEARCH_BATCH_SIZE,
  type HistorySearchBatch,
  type HistorySearchValidation
} from "./types";

export type SearchRefs =
  | { kind: "ok"; refs: GitRef[] }
  | Exclude<HistorySearchValidation, { kind: "ok" }>;

const CANCELLED = "History search was cancelled.";
const INVALID_RECORD = "Git returned an invalid history record.";
const MAX_ERROR_LENGTH = 4096;

/** A paused readable holds the pipe's bounded buffer, including bytes after the lookahead. */
class HistoryLogReader {
  private lookahead?: GitCommit;
  private wake?: () => void;
  private failure?: Error;
  private ended = false;
  private failedExit = false;
  private stopping = false;
  private readonly closed: Promise<void>;

  constructor(
    private readonly child: ChildProcessWithoutNullStreams,
    private readonly parse: (line: string) => GitCommit | undefined
  ) {
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr = `${stderr}${chunk}`.slice(-MAX_ERROR_LENGTH);
    });
    child.stdout.on("readable", () => this.wake?.());
    child.stdout.on("end", () => this.wake?.());
    child.stdout.on("close", () => {
      if (!child.stdout.readableEnded && !this.stopping && !this.failedExit) {
        this.fail(new Error("Git history output closed unexpectedly."));
      }
    });
    child.stdout.on("error", (error) => this.fail(error));
    child.stderr.on("error", (error) => this.fail(error));
    child.on("error", (error) => this.fail(error));
    child.once("exit", (code) => {
      if (code !== 0) {
        // A failed child may exit with unread output while the webview is paused.
        this.failedExit = true;
        child.stdout.destroy();
        this.wake?.();
      }
    });
    this.closed = new Promise((resolve) => {
      child.once("close", (code, signal) => {
        this.ended = true;
        if (code !== 0) {
          this.failure ??= new Error(stderr.trim() || `Git log failed (${signal ?? code}).`);
        }
        this.wake?.();
        resolve();
      });
    });
  }

  private fail(error: Error) {
    this.failure ??= error;
    this.stop();
  }

  private stop() {
    if (this.stopping) return;
    this.stopping = true;
    this.lookahead = undefined;
    if (
      !this.ended &&
      this.child.pid &&
      this.child.exitCode === null &&
      this.child.signalCode === null
    ) {
      this.child.kill();
    }
    this.child.stdout.destroy();
    this.child.stderr.destroy();
    this.child.stdin.destroy();
    this.wake?.();
  }

  public async close() {
    this.stop();
    await this.closed;
  }

  public async checkFailure() {
    if (this.failedExit) await this.closed;
    if (this.failure) throw this.failure;
    if (this.stopping) throw new Error(CANCELLED);
  }

  public async readBatch() {
    const commits = this.lookahead ? [this.lookahead] : [];
    this.lookahead = undefined;
    let partial = "";
    const stdout = this.child.stdout;
    for (;;) {
      await this.checkFailure();
      const chunk: string | null = stdout.read();
      if (chunk === null) {
        if (stdout.readableEnded || this.ended) {
          await this.closed;
          if (this.failure) throw this.failure;
          if (partial !== "") throw new Error(INVALID_RECORD);
          return { commits, hasMore: false };
        }
        await new Promise<void>((resolve) => {
          this.wake = resolve;
        });
        this.wake = undefined;
        continue;
      }
      let start = 0;
      for (let end = chunk.indexOf("\n"); end !== -1; end = chunk.indexOf("\n", start)) {
        const line = `${partial}${chunk.slice(start, end)}`;
        const commit = this.parse(line.endsWith("\r") ? line.slice(0, -1) : line);
        if (!commit) throw new Error(INVALID_RECORD);
        partial = "";
        start = end + 1;
        if (commits.length === HISTORY_SEARCH_BATCH_SIZE) {
          this.lookahead = commit;
          if (start < chunk.length) stdout.unshift(chunk.slice(start), "utf8");
          return { commits, hasMore: true };
        }
        commits.push(commit);
      }
      partial = `${partial}${chunk.slice(start)}`;
    }
  }
}

export class GitHistorySearch {
  private reader?: HistoryLogReader;
  private stopped = false;
  private closing?: Promise<void>;

  constructor(
    private position: number,
    private readonly previousClose: Promise<void> | undefined,
    private readonly getRefs: () => Promise<SearchRefs>,
    private readonly spawn: () => ChildProcessWithoutNullStreams,
    private readonly parse: (line: string) => GitCommit | undefined
  ) {}

  public close(): Promise<void> {
    this.stopped = true;
    // A replacement can itself be cancelled before its predecessor has finished exiting.
    this.closing ??= this.reader?.close() ?? this.previousClose ?? Promise.resolve();
    this.reader = undefined;
    return this.closing;
  }

  public async next(): Promise<HistorySearchBatch> {
    try {
      await this.previousClose;
      if (this.stopped) throw new Error(CANCELLED);
      const before = await this.getRefs();
      if (this.stopped) throw new Error(CANCELLED);
      if (before.kind !== "ok") {
        await this.close();
        return before;
      }
      this.reader ??= new HistoryLogReader(this.spawn(), this.parse);
      const { commits, hasMore } = await this.reader.readBatch();
      if (this.stopped) throw new Error(CANCELLED);
      const after = await this.getRefs();
      if (this.stopped) throw new Error(CANCELLED);
      await this.reader.checkFailure();
      if (!hasMore || after.kind !== "ok") await this.close();
      if (after.kind !== "ok") return after;
      const byHash = new Map<string, GitRef[]>();
      for (const ref of after.refs) {
        const refs = byHash.get(ref.hash);
        if (refs) refs.push(ref);
        else byHash.set(ref.hash, [ref]);
      }
      const firstPosition = this.position + 1;
      this.position += commits.length;
      return {
        kind: "ok",
        firstPosition,
        hasMore,
        commits: commits.map((commit) => ({
          ...commit,
          refs: byHash.get(commit.hash) ?? [],
          stash: null
        }))
      };
    } catch (error) {
      await this.close();
      return { kind: "error", message: error instanceof Error ? error.message : String(error) };
    }
  }
}
