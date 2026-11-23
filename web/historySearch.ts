import type * as GG from "../src/types";

export const HISTORY_SEARCH_MATCH_LIMIT = 1000;

export type CommitMatch = "match" | "miss" | "regexError";
export interface UnreadMatch {
  hash: string;
  position: number;
}

export type SearchStart = Omit<
  GG.RequestStartHistorySearch,
  "command" | "generation" | "requestId"
>;
export type SearchEnd =
  | "idle"
  | "cancelled"
  | "historyChanged"
  | "unavailable"
  | "regexError"
  | "targetMissing"
  | "targetChanged";
type Status = SearchEnd | "running" | "paused" | "complete" | "readError";
type Request =
  | GG.RequestStartHistorySearch
  | GG.RequestNextHistorySearch
  | GG.RequestCancelHistorySearch
  | GG.RequestVerifyHistorySearch;
type Batch = Extract<GG.HistorySearchBatch, { kind: "ok" }>;

export class HistorySearch {
  public status: Status = "idle";
  public owner: GG.SearchOwner | null = null;
  public examined = 0;
  public errorMessage = "";
  private unreadMatches: UnreadMatch[] = [];
  // A worktree can pin or unpin a scanned commit without changing the ordinary history prefix.
  private readonly scannedMatches = new Map<string, UnreadMatch>();
  private generation = 0;
  private requestId = 0;
  private waiting: "historySearchBatch" | "historySearchValidation" | null = null;
  private startQuery: SearchStart | null = null;
  private added = 0;
  private tail: Batch | null = null;

  constructor(
    private readonly send: (message: Request) => void,
    private readonly match: (row: GG.GitCommitNode) => CommitMatch,
    private readonly isLoaded: (hash: string) => boolean,
    private readonly onEnd?: (reason: SearchEnd) => void
  ) {}

  public get unreadCount() {
    return this.unreadMatches.length;
  }

  public get unread(): readonly UnreadMatch[] {
    return this.unreadMatches;
  }

  public mergeLoaded() {
    this.unreadMatches = [];
    for (const match of this.scannedMatches.values()) {
      if (!this.isLoaded(match.hash)) this.unreadMatches.push(match);
    }
  }

  public start(query: SearchStart) {
    this.end("idle");
    this.owner = { viewId: query.viewId, repo: query.repo, generation: ++this.generation };
    this.startQuery = query;
    this.status = "running";
    this.requestId = 1;
    this.waiting = "historySearchBatch";
    this.send({
      ...query,
      ...this.owner,
      command: "startHistorySearch",
      requestId: this.requestId
    });
  }

  public resume() {
    if (this.status !== "paused" || !this.owner || !this.startQuery) return;
    this.status = "running";
    this.added = 0;
    if (this.tail) {
      this.waiting = "historySearchValidation";
      this.send({
        ...this.owner,
        command: "verifyHistorySearch",
        requestId: ++this.requestId,
        snapshot: this.startQuery.snapshot,
        showRemoteBranches: this.startQuery.showRemoteBranches
      });
    } else {
      this.next();
    }
  }

  public end(status: SearchEnd) {
    if (this.owner) this.send({ ...this.owner, command: "cancelHistorySearch" });
    this.owner = null;
    this.waiting = null;
    this.startQuery = null;
    this.tail = null;
    this.unreadMatches = [];
    this.scannedMatches.clear();
    this.examined = 0;
    this.added = 0;
    this.errorMessage = "";
    this.status = status;
    this.onEnd?.(status);
  }

  public receive(
    response: GG.ResponseHistorySearchBatch | GG.ResponseHistorySearchValidation
  ): boolean {
    const owner = this.owner;
    if (
      !owner ||
      this.waiting !== response.command ||
      response.viewId !== owner.viewId ||
      response.repo !== owner.repo ||
      response.generation !== owner.generation ||
      response.requestId !== this.requestId
    )
      return false;
    this.waiting = null;
    if (response.kind === "historyChanged") {
      this.end("historyChanged");
    } else if (response.kind === "error") {
      this.tail = null;
      this.errorMessage = response.message;
      this.status = "readError";
    } else if (response.command === "historySearchBatch") {
      this.consume(response);
    } else if (this.tail) {
      const tail = this.tail;
      this.tail = null;
      this.consume(tail);
    }
    return true;
  }

  private consume(batch: Batch) {
    for (const [index, commit] of batch.commits.entries()) {
      this.examined++;
      const result = this.match(commit);
      if (result === "regexError") {
        this.end("regexError");
        return;
      }
      if (result !== "match" || this.scannedMatches.has(commit.hash)) continue;
      const match = { hash: commit.hash, position: batch.firstPosition + index };
      this.scannedMatches.set(commit.hash, match);
      if (this.isLoaded(commit.hash)) continue;
      this.unreadMatches.push(match);
      this.added++;
      if (this.added === HISTORY_SEARCH_MATCH_LIMIT) {
        const next = index + 1;
        if (next < batch.commits.length) {
          this.tail = {
            kind: "ok",
            commits: batch.commits.slice(next),
            firstPosition: batch.firstPosition + next,
            hasMore: batch.hasMore
          };
        }
        this.status = this.tail || batch.hasMore ? "paused" : "complete";
        return;
      }
    }
    if (batch.hasMore) this.next();
    else this.status = "complete";
  }

  private next() {
    if (!this.owner) return;
    this.waiting = "historySearchBatch";
    this.send({ ...this.owner, command: "nextHistorySearch", requestId: ++this.requestId });
  }
}
