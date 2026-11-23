import { describe, expect, it, vi } from "vitest";

import type * as GG from "../../src/types";
import { HistorySearch, type SearchStart } from "../../web/historySearch";

const query: SearchStart = {
  viewId: "graph",
  repo: "/repo",
  branches: ["main"],
  authors: [],
  showRemoteBranches: true,
  commitOrdering: "date",
  skip: 300,
  snapshot: "refs"
};

function row(hash: string, message = "hit"): GG.GitCommitNode {
  return { hash, message, parentHashes: [], refs: [], stash: null, date: 0, author: "", email: "" };
}
function rows(first: number, count: number) {
  return Array.from({ length: count }, (_, index) => row(String(first + index)));
}
function start() {
  const send = vi.fn();
  const loaded = new Set<string>();
  const search = new HistorySearch(
    send,
    (commit) => {
      if (commit.message === "error") return "regexError";
      return commit.message === "hit" ? "match" : "miss";
    },
    (hash) => loaded.has(hash)
  );
  search.start(query);
  function batch(
    commits: GG.GitCommitNode[],
    firstPosition: number,
    hasMore: boolean
  ): GG.ResponseHistorySearchBatch {
    return {
      ...send.mock.lastCall![0],
      command: "historySearchBatch",
      kind: "ok",
      commits,
      firstPosition,
      hasMore
    };
  }
  function validate(result: GG.HistorySearchValidation): GG.ResponseHistorySearchValidation {
    return { ...send.mock.lastCall![0], command: "historySearchValidation", ...result };
  }
  return { send, loaded, search, batch, validate };
}

// @see docs/testing/perspectives/web/historySearch-test.md
describe("full history search", () => {
  // Case: TC-001, TC-002
  it("retains only hit positions, accepts each awaited batch once and ignores competing requests (TC-001, TC-002)", () => {
    const { search, send, batch } = start();
    expect(send).toHaveBeenCalledWith({
      ...query,
      generation: 1,
      requestId: 1,
      command: "startHistorySearch"
    });
    const first = batch([row("miss", "other"), row("first")], 301, true);
    search.resume();
    expect(send).toHaveBeenCalledTimes(1);
    expect(search.receive(first)).toBe(true);
    expect(search.receive(first)).toBe(false);
    expect(send).toHaveBeenLastCalledWith({
      ...search.owner,
      requestId: 2,
      command: "nextHistorySearch"
    });
    search.receive(batch([row("second")], 303, false));
    expect(search.examined).toBe(3);
    expect(search.unread).toEqual([
      { hash: "first", position: 302 },
      { hash: "second", position: 303 }
    ]);
    expect(search.status).toBe("complete");
  });

  // Case: TC-003
  it.each([true, false])(
    "resumes from the third of four buffered records with host lookahead %s (TC-003)",
    (hasMore) => {
      const { search, send, batch, validate } = start();
      search.receive(batch(rows(1, 998), 301, true));
      search.receive(batch(rows(999, 4), 1299, hasMore));
      expect(search.status).toBe("paused");
      expect(search.unreadCount).toBe(1000);
      expect(search.examined).toBe(1000);
      search.resume();
      expect(send).toHaveBeenLastCalledWith({
        ...search.owner,
        requestId: 3,
        command: "verifyHistorySearch",
        snapshot: query.snapshot,
        showRemoteBranches: true
      });
      const ok = validate({ kind: "ok" });
      expect(search.receive(batch([], 1301, false))).toBe(false);
      search.resume();
      expect(send).toHaveBeenCalledTimes(3);
      expect(search.examined).toBe(1000);
      expect(search.receive(ok)).toBe(true);
      expect(search.receive(ok)).toBe(false);
      expect(search.examined).toBe(1002);
      expect(search.unread.slice(-2)).toEqual([
        { hash: "1001", position: 1301 },
        { hash: "1002", position: 1302 }
      ]);
      expect(search.status).toBe(hasMore ? "running" : "complete");
      if (hasMore)
        expect(send).toHaveBeenLastCalledWith({
          ...search.owner,
          requestId: 4,
          command: "nextHistorySearch"
        });
    }
  );

  // Case: TC-004, TC-005
  it.each([
    [{ kind: "historyChanged" }, "historyChanged", 0],
    [{ kind: "error", message: "graft unreadable" }, "readError", 1000]
  ] as const)(
    "rejects an invalid buffered final tail, including after host EOF (TC-004, TC-005)",
    (result, status, count) => {
      const { search, batch, validate } = start();
      search.receive(batch(rows(1, 998), 301, true));
      search.receive(batch(rows(999, 4), 1299, false));
      search.resume();
      search.receive(validate(result));
      expect(search.status).toBe(status);
      expect(search.unreadCount).toBe(count);
      expect(search.unread.some((hit) => hit.hash === "1001")).toBe(false);
    }
  );

  // Case: TC-006
  it("completes at an exact limit and accepts an empty terminal batch (TC-006)", () => {
    for (const count of [0, 1000]) {
      const { search, send, batch } = start();
      search.receive(batch(rows(1, count), 301, false));
      expect(search.status).toBe("complete");
      expect(search.unreadCount).toBe(count);
      search.resume();
      expect(send).toHaveBeenCalledTimes(1);
    }
  });

  // Case: TC-007
  it("resumes host-only tails and collects 2001 matches over three operations (TC-007)", () => {
    const { search, send, batch } = start();
    for (const first of [1, 1001]) {
      search.receive(batch(rows(first, 1000), first + query.skip, true));
      expect(search.status).toBe("paused");
      expect(search.unreadCount).toBe(first + 999);
      search.resume();
      expect(send.mock.lastCall![0].command).toBe("nextHistorySearch");
    }
    search.receive(batch([row("2001")], 2301, false));
    expect(search.status).toBe("complete");
    expect(search.unreadCount).toBe(2001);
    expect(search.examined).toBe(2001);
  });

  // Case: TC-008, TC-009
  it("merges by actual hash and preserves additions already spent in the operation (TC-008, TC-009)", () => {
    const { search, loaded, batch } = start();
    loaded.add("pinned");
    search.receive(batch([...rows(1, 998), row("pinned")], 301, true));
    loaded.add("2");
    loaded.add("newly loaded");
    search.mergeLoaded();
    search.receive(batch([row("3"), row("2"), row("newly loaded"), ...rows(999, 3)], 1300, false));
    expect(search.status).toBe("paused");
    expect(search.examined).toBe(1004);
    expect(search.unreadCount).toBe(999);
    expect(search.unread.slice(-2)).toEqual([
      { hash: "999", position: 1303 },
      { hash: "1000", position: 1304 }
    ]);
  });

  // Case: TC-010
  it("retains verified hits on read failure and restarts with a fresh generation (TC-010)", () => {
    const { search, send, batch } = start();
    search.receive(batch([row("first")], 301, true));
    const failed = {
      ...send.mock.lastCall![0],
      command: "historySearchBatch",
      kind: "error",
      message: "Git failed"
    };
    search.receive(failed);
    search.resume();
    expect(search.unread).toEqual([{ hash: "first", position: 301 }]);
    expect(search.errorMessage).toBe("Git failed");
    expect(search.status).toBe("readError");
    expect(send).toHaveBeenCalledTimes(2);
    search.start(query);
    expect(search.owner?.generation).toBe(2);
    expect(search.unread).toEqual([]);
    expect(search.receive(failed)).toBe(false);
  });

  // Case: TC-011, TC-012
  it("clears earlier hits on a later regex error or changed snapshot (TC-011, TC-012)", () => {
    for (const reason of ["regexError", "historyChanged"]) {
      const { search, send, batch } = start();
      search.receive(batch([row("first")], 301, true));
      search.receive(
        reason === "regexError"
          ? batch([row("next"), row("late", "error")], 302, true)
          : { ...send.mock.lastCall![0], command: "historySearchBatch", kind: "historyChanged" }
      );
      expect(search.status).toBe(reason);
      expect(search.unread).toEqual([]);
      expect(send.mock.lastCall![0].command).toBe("cancelHistorySearch");
    }
  });

  // Case: TC-013, TC-014
  it("rejects obsolete views, repositories, generations and request IDs even after cancellation (TC-013, TC-014)", () => {
    const { search, batch, validate } = start();
    const old = batch([row("old")], 301, true);
    search.end("cancelled");
    search.start(query);
    expect(search.receive(old)).toBe(false);
    const current = batch(rows(1, 1001), 301, false);
    for (const mismatch of [
      { viewId: "other" },
      { repo: "/other" },
      { generation: 1 },
      { requestId: 5 }
    ]) {
      expect(search.receive({ ...current, ...mismatch })).toBe(false);
    }
    expect(search.examined).toBe(0);
    search.receive(current);
    search.resume();
    const check = validate({ kind: "ok" });
    expect(search.receive({ ...check, viewId: "other" })).toBe(false);
    expect(search.unreadCount).toBe(1000);
    expect(search.receive(check)).toBe(true);
    expect(search.unreadCount).toBe(1001);
  });
});
