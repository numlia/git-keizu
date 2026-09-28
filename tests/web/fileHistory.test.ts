// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../web/dialogs", () => ({
  showErrorDialog: vi.fn()
}));

import type * as GG from "../../src/types";
import { showErrorDialog } from "../../web/dialogs";
import {
  CLASS_FILE_HISTORY_CURRENT,
  CLASS_FILE_HISTORY_DIM,
  CLASS_FILE_HISTORY_MATCH,
  type FileHistoryCallbacks,
  FileHistoryController
} from "../../web/fileHistory";
import { svgIcons, vscode } from "../../web/utils";

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const REPO = "/r";
const OTHER_REPO = "/other";
const ANCHOR = "h0";
const FILE_PATH = "src/a.txt";
const OTHER_FILE_PATH = "src/b.txt";
const ENTRY_HASHES = ["h0", "h1", "h2"];
const DEFAULT_COMMITS = ["h0", "h1", "x1", "x2"];
// Names describe table positions, not commit dates.
const FIXTURE_A_COMMITS = ["h0", "x1", "h1", "x2", "h2"];
const FIXTURE_B_COMMITS = ["before", "h0", "after"];
const UP: -1 | 1 = -1;
const DOWN: -1 | 1 = 1;
const UNLOADED_MATCH = "h3";
const UNKNOWN_HASH = "zz";
const SWITCH_ANCHOR = "x1";
const SWITCH_ENTRY_HASHES = ["x1", "x2"];
const SWITCH_REQUEST_ID = 2;
const SNAPSHOT_HASH = "x2";
const POSITION_MESSAGE_KEY = "fileHistory.position";
const OFFSCREEN_ROW_TOP = 5000;
const ROW_WIDTH = 100;
const ROW_HEIGHT = 20;
const REQUEST_TIME_SCROLL_TOP = 40;
const LATER_SCROLL_TOP = 300;
const SCROLL_TOP = 120;
const EXPANDED_HASH = "e1";
const ERROR_TITLE = "Unable to load file history";
const NO_RESULTS_MESSAGE = "No history was found for this file.";
const LOADING_TEXT = "Loading file history ...";
const HIGHLIGHT_CLASSES = [
  CLASS_FILE_HISTORY_MATCH,
  CLASS_FILE_HISTORY_CURRENT,
  CLASS_FILE_HISTORY_DIM
];
const BAR_ID = "fileHistoryBar";
const PATH_ID = "fileHistoryPath";
const POSITION_ID = "fileHistoryPosition";
const PREV_ID = "fileHistoryPrev";
const NEXT_ID = "fileHistoryNext";
const EXIT_ID = "fileHistoryExit";

const DETAILS = { hash: EXPANDED_HASH } as unknown as GG.GitCommitDetails;
const TREE: GitFolder = { type: "folder", name: "", folderPath: "", contents: {}, open: true };

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function commit(hash: string): GG.GitCommitNode {
  return {
    hash,
    parentHashes: [],
    author: "a",
    email: "e",
    date: 0,
    message: "m",
    refs: [],
    stash: null
  };
}

function entry(hash: string, overrides: Partial<GG.FileHistoryEntry> = {}): GG.FileHistoryEntry {
  return {
    hash,
    parentHashes: [],
    type: "M",
    oldFilePath: FILE_PATH,
    newFilePath: FILE_PATH,
    historicalPath: FILE_PATH,
    isMerge: false,
    ...overrides
  };
}

function response(overrides: Partial<GG.ResponseFileHistory> = {}): GG.ResponseFileHistory {
  return {
    command: "fileHistory",
    repo: REPO,
    requestId: 1,
    anchorHash: ANCHOR,
    filePath: FILE_PATH,
    entries: ENTRY_HASHES.map((h) => entry(h)),
    ...overrides
  };
}

function expandedLoaded(): ExpandedCommit {
  return {
    id: 1,
    hash: EXPANDED_HASH,
    srcElem: null,
    compareWithHash: null,
    compareWithSrcElem: null,
    commitDetails: DETAILS,
    fileTree: TREE,
    loading: false
  };
}

type MockCallbacks = { [K in keyof FileHistoryCallbacks]: ReturnType<typeof vi.fn> };

interface Harness {
  controller: FileHistoryController;
  callbacks: MockCallbacks;
  setCommits(hashes: string[]): void;
  rowsWith(cls: string): string[];
  bar(): HTMLElement;
  text(id: string): string;
  click(id: string): void;
}

function renderRows(hashes: string[]): void {
  document.getElementById("commitTable")!.innerHTML = hashes
    .map((h) => `<tr class="commit" data-hash="${h}"><td>${h}</td></tr>`)
    .join("");
}

function setup(commitHashes: string[] = DEFAULT_COMMITS): Harness {
  document.body.innerHTML =
    '<div id="controls"></div><div id="after"></div><table id="commitTable"></table><ul id="files"></ul>';
  const state = { commits: commitHashes.map(commit), repo: REPO };
  renderRows(commitHashes);
  const callbacks: MockCallbacks = {
    getCommits: vi.fn(() => state.commits),
    getCommitId: vi.fn((hash: string) => {
      const index = state.commits.findIndex((c) => c.hash === hash);
      return index === -1 ? null : index;
    }),
    getCurrentRepo: vi.fn(() => state.repo),
    getExpandedCommit: vi.fn(() => expandedLoaded()),
    getScrollTop: vi.fn(() => SCROLL_TOP),
    setScrollTop: vi.fn(),
    hideCommitDetails: vi.fn(),
    restoreExpandedCommit: vi.fn(() => true),
    scrollToCommit: vi.fn(),
    closeFindWidget: vi.fn(),
    setGraphHighlight: vi.fn()
  };
  const controller = new FileHistoryController(callbacks as unknown as FileHistoryCallbacks);
  return {
    controller,
    callbacks,
    setCommits(hashes) {
      state.commits = hashes.map(commit);
      renderRows(hashes);
    },
    rowsWith: (cls) =>
      Array.from(document.querySelectorAll<HTMLElement>(`.commit.${cls}`)).map(
        (row) => row.dataset.hash!
      ),
    bar: () => document.getElementById(BAR_ID)!,
    text: (id) => document.getElementById(id)!.textContent ?? "",
    click: (id) => document.getElementById(id)!.dispatchEvent(new MouseEvent("click"))
  };
}

/** request() followed by the matching successful response. */
function activate(h: Harness, requestId = 1): void {
  h.controller.request(ANCHOR, FILE_PATH);
  h.controller.handleResponse(response({ requestId }));
}

function expectNoHighlightClasses(h: Harness): void {
  for (const cls of HIGHLIGHT_CLASSES) {
    expect(h.rowsWith(cls)).toEqual([]);
  }
}

function expectNoCallbackCalled(h: Harness): void {
  for (const [name, fn] of Object.entries(h.callbacks)) {
    expect(fn, name).toHaveBeenCalledTimes(0);
  }
}

function postedMessages(): Record<string, unknown>[] {
  return vi.mocked(vscode.postMessage).mock.calls.map((call) => call[0] as Record<string, unknown>);
}

function lastHighlight(h: Harness): GraphFileHistoryHighlight {
  return h.callbacks.setGraphHighlight.mock.lastCall![0] as GraphFileHistoryHighlight;
}

interface ObservedState {
  currentHash: string | null;
  matchRows: string[];
  currentRows: string[];
  dimRows: string[];
  position: string;
  path: string;
  barClasses: string[];
  scrollToCommitCalls: number;
  setGraphHighlightCalls: number;
  hideCommitDetailsCalls: number;
  restoreExpandedCommitCalls: number;
  setScrollTopCalls: number;
  postMessageCalls: number;
  showErrorDialogCalls: number;
}

/** Everything a rejected move must leave untouched, captured for a before / after comparison. */
function observe(h: Harness): ObservedState {
  return {
    currentHash: h.controller.getCurrentHash(),
    matchRows: h.rowsWith(CLASS_FILE_HISTORY_MATCH),
    currentRows: h.rowsWith(CLASS_FILE_HISTORY_CURRENT),
    dimRows: h.rowsWith(CLASS_FILE_HISTORY_DIM),
    position: h.text(POSITION_ID),
    path: h.text(PATH_ID),
    barClasses: Array.from(h.bar().classList),
    scrollToCommitCalls: h.callbacks.scrollToCommit.mock.calls.length,
    setGraphHighlightCalls: h.callbacks.setGraphHighlight.mock.calls.length,
    hideCommitDetailsCalls: h.callbacks.hideCommitDetails.mock.calls.length,
    restoreExpandedCommitCalls: h.callbacks.restoreExpandedCommit.mock.calls.length,
    setScrollTopCalls: h.callbacks.setScrollTop.mock.calls.length,
    postMessageCalls: vi.mocked(vscode.postMessage).mock.calls.length,
    showErrorDialogCalls: vi.mocked(showErrorDialog).mock.calls.length
  };
}

function expandedAt(hash: string, overrides: Partial<ExpandedCommit> = {}): ExpandedCommit {
  return { ...expandedLoaded(), hash, ...overrides };
}

/** Fixture A accepted without details: current h0, position "1 of 3". */
function activateFixtureA(): Harness {
  const h = setup(FIXTURE_A_COMMITS);
  h.callbacks.getExpandedCommit.mockReturnValue(null);
  activate(h);
  return h;
}

/** Fixture B accepted without details: h0 is the only match, position "1 of 1". */
function activateFixtureB(): Harness {
  const h = setup(FIXTURE_B_COMMITS);
  h.callbacks.getExpandedCommit.mockReturnValue(null);
  h.controller.request(ANCHOR, FILE_PATH);
  h.controller.handleResponse(response({ entries: [entry(ANCHOR)] }));
  return h;
}

/** Requests another file while active and returns the response that would accept it. */
function requestSwitch(h: Harness): GG.ResponseFileHistory {
  h.controller.request(SWITCH_ANCHOR, OTHER_FILE_PATH);
  return response({
    requestId: SWITCH_REQUEST_ID,
    anchorHash: SWITCH_ANCHOR,
    filePath: OTHER_FILE_PATH,
    entries: SWITCH_ENTRY_HASHES.map((hash) => entry(hash))
  });
}

/** A successful move: state, row class, graph and position agree, with one centered scroll. */
function expectMovedTo(h: Harness, before: ObservedState, hash: string, position: string): void {
  expect(h.controller.getCurrentHash()).toBe(hash);
  expect(h.rowsWith(CLASS_FILE_HISTORY_CURRENT)).toEqual([hash]);
  expect(lastHighlight(h).currentHash).toBe(hash);
  expect(h.text(POSITION_ID)).toBe(position);
  expect(h.callbacks.scrollToCommit).toHaveBeenCalledTimes(before.scrollToCommitCalls + 1);
  expect(h.callbacks.scrollToCommit).toHaveBeenLastCalledWith(hash, true);
}

beforeEach(() => {
  vi.mocked(vscode.postMessage).mockClear();
  vi.mocked(showErrorDialog).mockClear();
});

/* ------------------------------------------------------------------ */
/* S1: constructor and bar DOM                                        */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/fileHistory-test.md
describe("FileHistoryController constructor and bar DOM (S1)", () => {
  it("inserts the hidden bar with five children right after #controls (TC-001)", () => {
    // Case: TC-001
    // Given: a document with #controls
    // When: the controller is constructed
    const h = setup();

    // Then: the bar follows #controls, holds the five ids, and is neither active nor loading
    expect(document.getElementById("controls")!.nextElementSibling).toBe(h.bar());
    expect(Array.from(h.bar().children).map((child) => child.id)).toEqual([
      PATH_ID,
      POSITION_ID,
      PREV_ID,
      NEXT_ID,
      EXIT_ID
    ]);
    expect(h.bar().classList.contains("active")).toBe(false);
    expect(h.bar().classList.contains("loading")).toBe(false);
  });

  it("resolves button titles, icons and the exit label through t() (TC-002)", () => {
    // Case: TC-002
    // Given: the constructed bar
    setup();
    const prev = document.getElementById(PREV_ID)!;
    const next = document.getElementById(NEXT_ID)!;
    const exit = document.getElementById(EXIT_ID)!;

    // When/Then: titles, svg icons, exit text and the roundedBtn class are set
    expect(prev.title).toBe("Previous match");
    expect(next.title).toBe("Next match");
    expect(prev.innerHTML).toBe(svgIcons.arrowUp);
    expect(next.innerHTML).toBe(svgIcons.arrowDown);
    expect(exit.textContent).toBe("Exit");
    for (const button of [prev, next, exit]) {
      expect(button.classList.contains("roundedBtn")).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ */
/* S2: request()                                                      */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/fileHistory-test.md
describe("FileHistoryController.request() (S2)", () => {
  it("posts the first request with requestId 1 (TC-003)", () => {
    // Case: TC-003
    // Given: a fresh controller whose current repo is /r
    const h = setup();

    // When: a request is made
    h.controller.request("abc", FILE_PATH);

    // Then: exactly one fileHistory message with the four fields and requestId 1
    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: "fileHistory",
      repo: REPO,
      requestId: 1,
      anchorHash: "abc",
      filePath: FILE_PATH
    });
  });

  it("closes the find widget on request (TC-004)", () => {
    // Case: TC-004
    // Given: a fresh controller
    const h = setup();

    // When: a request is made
    h.controller.request("abc", FILE_PATH);

    // Then: closeFindWidget runs once
    expect(h.callbacks.closeFindWidget).toHaveBeenCalledTimes(1);
  });

  it("shows the loading bar with the requested path (TC-005)", () => {
    // Case: TC-005
    // Given: a fresh controller
    const h = setup();

    // When: a request is made
    h.controller.request("abc", FILE_PATH);

    // Then: the bar is active + loading, shows the path and the loading text
    expect(h.bar().classList.contains("active")).toBe(true);
    expect(h.bar().classList.contains("loading")).toBe(true);
    expect(h.text(PATH_ID)).toBe(FILE_PATH);
    expect(h.bar().textContent).toContain(LOADING_TEXT);
  });

  it("numbers consecutive requests sequentially (TC-006)", () => {
    // Case: TC-006
    // Given: one request already sent
    const h = setup();
    h.controller.request("abc", FILE_PATH);

    // When: a second request is made
    h.controller.request("abc", OTHER_FILE_PATH);

    // Then: the second message has requestId 2 and the controller is pending
    expect(vscode.postMessage).toHaveBeenCalledTimes(2);
    expect(postedMessages()[1].requestId).toBe(2);
    expect(h.controller.isPending()).toBe(true);
  });

  it("keeps the current highlight while requesting another file during active mode (TC-007)", () => {
    // Case: TC-007
    // Given: an accepted response
    const h = setup();
    activate(h);
    const matchRows = h.rowsWith(CLASS_FILE_HISTORY_MATCH);
    const currentRows = h.rowsWith(CLASS_FILE_HISTORY_CURRENT);

    // When: another file is requested
    h.controller.request(ANCHOR, OTHER_FILE_PATH);

    // Then: the message is posted, rows keep their classes, and both states hold
    expect(vscode.postMessage).toHaveBeenCalledTimes(2);
    expect(h.rowsWith(CLASS_FILE_HISTORY_MATCH)).toEqual(matchRows);
    expect(h.rowsWith(CLASS_FILE_HISTORY_CURRENT)).toEqual(currentRows);
    expect(h.controller.isActive()).toBe(true);
    expect(h.controller.isPending()).toBe(true);
  });

  it("drops the request when the id counter reached MAX_SAFE_INTEGER (TC-008)", () => {
    // Case: TC-008
    // Given: the private counter forced to the upper bound
    const h = setup();
    (h.controller as unknown as { nextRequestId: number }).nextRequestId = Number.MAX_SAFE_INTEGER;

    // When: a request is made
    h.controller.request("abc", FILE_PATH);

    // Then: nothing is posted, nothing is pending, the bar stays hidden
    expect(vscode.postMessage).toHaveBeenCalledTimes(0);
    expect(h.controller.isPending()).toBe(false);
    expect(h.bar().classList.contains("active")).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* S3: handleResponse() discard conditions and error dialog           */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/fileHistory-test.md
describe("FileHistoryController.handleResponse() discard and error (S3)", () => {
  it("ignores a response when nothing is pending (TC-009)", () => {
    // Case: TC-009
    // Given: no request was made
    const h = setup();

    // When: a successful response arrives
    h.controller.handleResponse(response());

    // Then: no dialog, no callbacks, no classes, inactive
    expect(showErrorDialog).toHaveBeenCalledTimes(0);
    expect(h.callbacks.hideCommitDetails).toHaveBeenCalledTimes(0);
    expect(h.callbacks.scrollToCommit).toHaveBeenCalledTimes(0);
    expectNoHighlightClasses(h);
    expect(h.controller.isActive()).toBe(false);
  });

  it("ignores a stale requestId (TC-010)", () => {
    // Case: TC-010
    // Given: two requests sent (latest id 2)
    const h = setup();
    h.controller.request(ANCHOR, FILE_PATH);
    h.controller.request(ANCHOR, OTHER_FILE_PATH);

    // When: the response for requestId 1 arrives
    h.controller.handleResponse(response({ requestId: 1 }));

    // Then: nothing happens and the controller stays pending
    expect(showErrorDialog).toHaveBeenCalledTimes(0);
    expect(h.callbacks.hideCommitDetails).toHaveBeenCalledTimes(0);
    expect(h.controller.isActive()).toBe(false);
    expect(h.controller.isPending()).toBe(true);
  });

  it("ignores a response from another repository (TC-011)", () => {
    // Case: TC-011
    // Given: a pending request for /r
    const h = setup();
    h.controller.request(ANCHOR, FILE_PATH);

    // When: a response tagged with /other arrives
    h.controller.handleResponse(response({ repo: OTHER_REPO }));

    // Then: nothing happens and the mode does not start
    expect(showErrorDialog).toHaveBeenCalledTimes(0);
    expect(h.callbacks.hideCommitDetails).toHaveBeenCalledTimes(0);
    expect(h.controller.isActive()).toBe(false);
  });

  it("shows the error dialog with a null reason for entries: null (TC-012)", () => {
    // Case: TC-012
    // Given: a pending request
    const h = setup();
    h.controller.request(ANCHOR, FILE_PATH);

    // When: a failure response arrives
    h.controller.handleResponse(response({ entries: null }));

    // Then: one dialog with the null reason, pending cleared, inactive, bar hidden
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(ERROR_TITLE, null, null);
    expect(h.controller.isPending()).toBe(false);
    expect(h.controller.isActive()).toBe(false);
    expect(h.bar().classList.contains("active")).toBe(false);
  });

  it("shows the no results dialog for entries: [] (TC-013)", () => {
    // Case: TC-013
    // Given: a pending request
    const h = setup();
    h.controller.request(ANCHOR, FILE_PATH);

    // When: an empty response arrives
    h.controller.handleResponse(response({ entries: [] }));

    // Then: one dialog with the no results reason and the bar hidden
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(ERROR_TITLE, NO_RESULTS_MESSAGE, null);
    expect(h.bar().classList.contains("active")).toBe(false);
  });

  it("shows the no results dialog when the anchor is not among the entries (TC-014)", () => {
    // Case: TC-014
    // Given: a pending request
    const h = setup();
    h.controller.request(ANCHOR, FILE_PATH);

    // When: a response without the anchor hash arrives
    h.controller.handleResponse(response({ entries: [entry("h1"), entry("h2")] }));

    // Then: one dialog with the no results reason and no mode
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(ERROR_TITLE, NO_RESULTS_MESSAGE, null);
    expect(h.controller.isActive()).toBe(false);
  });

  it("drops the pending request silently when the anchor is not loaded (TC-015)", () => {
    // Case: TC-015
    // Given: the anchor is not in the loaded commits
    const h = setup(["h1", "x1"]);
    h.controller.request(ANCHOR, FILE_PATH);

    // When: a successful response arrives
    h.controller.handleResponse(response());

    // Then: no dialog / details / scroll, pending cleared, bar hidden, rows unchanged
    expect(showErrorDialog).toHaveBeenCalledTimes(0);
    expect(h.callbacks.hideCommitDetails).toHaveBeenCalledTimes(0);
    expect(h.callbacks.scrollToCommit).toHaveBeenCalledTimes(0);
    expect(h.controller.isPending()).toBe(false);
    expect(h.bar().classList.contains("active")).toBe(false);
    expectNoHighlightClasses(h);
  });

  it("keeps the old mode and snapshot when another file's request fails (TC-016)", () => {
    // Case: TC-016
    // Given: an active mode, then a request for another file with a later scroll position
    const h = setup(["h0", "h1", EXPANDED_HASH, "x1", "x2"]);
    activate(h);
    h.callbacks.getScrollTop.mockReturnValue(999);
    h.controller.request(ANCHOR, OTHER_FILE_PATH);

    // When: the second request fails
    h.controller.handleResponse(
      response({ requestId: 2, filePath: OTHER_FILE_PATH, entries: null })
    );

    // Then: one dialog, rows unchanged, still active, bar active without loading
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(h.rowsWith(CLASS_FILE_HISTORY_MATCH)).toEqual(["h0", "h1"]);
    expect(h.rowsWith(CLASS_FILE_HISTORY_CURRENT)).toEqual(["h0"]);
    expect(h.controller.isActive()).toBe(true);
    expect(h.bar().classList.contains("active")).toBe(true);
    expect(h.bar().classList.contains("loading")).toBe(false);

    // Then: a later exit(true) restores the original snapshot scroll position
    h.controller.exit(true);
    expect(h.callbacks.setScrollTop).toHaveBeenCalledTimes(1);
    expect(h.callbacks.setScrollTop).toHaveBeenCalledWith(SCROLL_TOP);
  });
});

/* ------------------------------------------------------------------ */
/* S4: handleResponse() acceptance                                    */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/fileHistory-test.md
describe("FileHistoryController.handleResponse() acceptance (S4)", () => {
  it("applies match, current and dim classes to the rows (TC-017)", () => {
    // Case: TC-017
    // Given: entries h0 / h1 / h2 with h0 and h1 loaded
    const h = setup();

    // When: the response is accepted
    activate(h);

    // Then: details hidden once, two matches, h0 current, the rest dim, no row both match and dim
    expect(h.callbacks.hideCommitDetails).toHaveBeenCalledTimes(1);
    expect(h.rowsWith(CLASS_FILE_HISTORY_MATCH)).toEqual(["h0", "h1"]);
    expect(h.rowsWith(CLASS_FILE_HISTORY_CURRENT)).toEqual(["h0"]);
    expect(h.rowsWith(CLASS_FILE_HISTORY_DIM)).toEqual(["x1", "x2"]);
    const bothClasses = Array.from(document.querySelectorAll(".commit[data-hash]")).filter(
      (row) =>
        row.classList.contains(CLASS_FILE_HISTORY_MATCH) &&
        row.classList.contains(CLASS_FILE_HISTORY_DIM)
    );
    expect(bothClasses).toHaveLength(0);
  });

  it("passes the visible match set and the anchor to the graph (TC-018)", () => {
    // Case: TC-018
    // Given: the base fixture
    const h = setup();

    // When: the response is accepted
    activate(h);

    // Then: one highlight call with a Set of size 2 and the anchor as current
    expect(h.callbacks.setGraphHighlight).toHaveBeenCalledTimes(1);
    const highlight = lastHighlight(h);
    expect(highlight.matchHashes).toBeInstanceOf(Set);
    expect(highlight.matchHashes.size).toBe(2);
    expect(highlight.matchHashes.has("h0")).toBe(true);
    expect(highlight.matchHashes.has("h1")).toBe(true);
    expect(highlight.currentHash).toBe(ANCHOR);
  });

  it("centers the anchor commit (TC-019)", () => {
    // Case: TC-019
    // Given: the base fixture
    const h = setup();

    // When: the response is accepted
    activate(h);

    // Then: scrollToCommit(anchor, true) once
    expect(h.callbacks.scrollToCommit).toHaveBeenCalledTimes(1);
    expect(h.callbacks.scrollToCommit).toHaveBeenCalledWith(ANCHOR, true);
  });

  it("shows the active bar with position and path (TC-020)", () => {
    // Case: TC-020
    // Given: the base fixture
    const h = setup();

    // When: the response is accepted
    activate(h);

    // Then: active without loading, "1 of 2", requested path
    expect(h.bar().classList.contains("active")).toBe(true);
    expect(h.bar().classList.contains("loading")).toBe(false);
    expect(h.text(POSITION_ID)).toBe("1 of 2");
    expect(h.text(PATH_ID)).toBe(FILE_PATH);
  });

  it("reports 1 of 1 for a single visible match (TC-021)", () => {
    // Case: TC-021
    // Given: only the anchor is loaded
    const h = setup(["h0", "x1"]);

    // When: the response is accepted
    activate(h);

    // Then: position "1 of 1" and one match row
    expect(h.text(POSITION_ID)).toBe("1 of 1");
    expect(h.rowsWith(CLASS_FILE_HISTORY_MATCH)).toEqual(["h0"]);
  });

  it("replaces the state and snapshot when another file's response is accepted (TC-022)", () => {
    // Case: TC-022
    // Given: an active mode and a request for another file with a new scroll position
    const h = setup(["h0", "h1", EXPANDED_HASH, "x1", "x2"]);
    activate(h);
    h.controller.request("x1", OTHER_FILE_PATH);
    h.callbacks.getScrollTop.mockReturnValue(300);

    // When: the second response is accepted
    h.controller.handleResponse(
      response({
        requestId: 2,
        anchorHash: "x1",
        filePath: OTHER_FILE_PATH,
        entries: [entry("x1"), entry("x2"), entry("zz")]
      })
    );

    // Then: details hidden twice, current moved, bar updated, and exit restores the new snapshot
    expect(h.callbacks.hideCommitDetails).toHaveBeenCalledTimes(2);
    expect(h.rowsWith(CLASS_FILE_HISTORY_CURRENT)).toEqual(["x1"]);
    expect(h.rowsWith(CLASS_FILE_HISTORY_MATCH)).toEqual(["x1", "x2"]);
    expect(h.text(PATH_ID)).toBe(OTHER_FILE_PATH);
    expect(h.text(POSITION_ID)).toBe("1 of 2");
    h.controller.exit(true);
    expect(h.callbacks.setScrollTop).toHaveBeenCalledTimes(1);
    expect(h.callbacks.setScrollTop).toHaveBeenCalledWith(300);
  });
});

/* ------------------------------------------------------------------ */
/* S5: onCommitsRendered()                                            */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/fileHistory-test.md
describe("FileHistoryController.onCommitsRendered() (S5)", () => {
  it("recomputes the visible set after more commits are loaded (TC-023)", () => {
    // Case: TC-023
    // Given: an active mode, then h2 appears in the commit list
    const h = setup();
    activate(h);
    h.setCommits(["h0", "h1", "x1", "x2", "h2"]);

    // When: the render hook fires
    h.controller.onCommitsRendered();

    // Then: denominator 3, h2 marked, graph highlight size 3
    expect(h.text(POSITION_ID)).toBe("1 of 3");
    expect(h.rowsWith(CLASS_FILE_HISTORY_MATCH)).toEqual(["h0", "h1", "h2"]);
    expect(lastHighlight(h).matchHashes.size).toBe(3);
  });

  it("exits without restoring when the anchor disappears (TC-024)", () => {
    // Case: TC-024
    // Given: an active mode, then a commit list without the anchor
    const h = setup();
    activate(h);
    h.setCommits(["h1", "x1"]);

    // When: the render hook fires
    h.controller.onCommitsRendered();

    // Then: inactive, classes and bar gone, no restore callbacks
    expect(h.controller.isActive()).toBe(false);
    expectNoHighlightClasses(h);
    expect(h.bar().classList.contains("active")).toBe(false);
    expect(h.callbacks.setScrollTop).toHaveBeenCalledTimes(0);
    expect(h.callbacks.restoreExpandedCommit).toHaveBeenCalledTimes(0);
  });

  it("exits without restoring when the current commit disappears (TC-025)", () => {
    // Case: TC-025
    // Given: current moved to h1, then a list that keeps the anchor but drops h1
    const h = setup();
    activate(h);
    h.click(NEXT_ID);
    expect(h.controller.getCurrentHash()).toBe("h1");
    h.setCommits(["h0", "x1"]);

    // When: the render hook fires
    h.controller.onCommitsRendered();

    // Then: inactive, classes and bar gone, no restore callbacks
    expect(h.controller.isActive()).toBe(false);
    expectNoHighlightClasses(h);
    expect(h.bar().classList.contains("active")).toBe(false);
    expect(h.callbacks.setScrollTop).toHaveBeenCalledTimes(0);
    expect(h.callbacks.restoreExpandedCommit).toHaveBeenCalledTimes(0);
  });

  it("exits without restoring when the repository no longer matches (TC-026)", () => {
    // Case: TC-026
    // Given: an active mode, then the current repo changes
    const h = setup();
    activate(h);
    h.callbacks.getCurrentRepo.mockReturnValue(OTHER_REPO);

    // When: the render hook fires
    h.controller.onCommitsRendered();

    // Then: inactive, classes and bar gone, no restore callbacks
    expect(h.controller.isActive()).toBe(false);
    expectNoHighlightClasses(h);
    expect(h.bar().classList.contains("active")).toBe(false);
    expect(h.callbacks.restoreExpandedCommit).toHaveBeenCalledTimes(0);
    expect(h.callbacks.setScrollTop).toHaveBeenCalledTimes(0);
  });

  it("drops a pending request whose anchor is not loaded (TC-027)", () => {
    // Case: TC-027
    // Given: a pending request and a commit list without the anchor
    const h = setup();
    h.controller.request(ANCHOR, FILE_PATH);
    h.setCommits(["h1", "x1"]);

    // When: the render hook fires
    h.controller.onCommitsRendered();

    // Then: not pending and the loading bar removed
    expect(h.controller.isPending()).toBe(false);
    expect(h.bar().classList.contains("active")).toBe(false);

    // Then: the late response for the same id is ignored
    h.setCommits(["h0", "h1"]);
    h.controller.handleResponse(response());
    expect(h.callbacks.hideCommitDetails).toHaveBeenCalledTimes(0);
    expect(showErrorDialog).toHaveBeenCalledTimes(0);
  });

  it("drops a pending request when the repository changed (TC-028)", () => {
    // Case: TC-028
    // Given: a pending request and a different current repo
    const h = setup();
    h.controller.request(ANCHOR, FILE_PATH);
    h.callbacks.getCurrentRepo.mockReturnValue(OTHER_REPO);

    // When: the render hook fires
    h.controller.onCommitsRendered();

    // Then: not pending, loading bar removed, later response ignored
    expect(h.controller.isPending()).toBe(false);
    expect(h.bar().classList.contains("active")).toBe(false);
    h.callbacks.getCurrentRepo.mockReturnValue(REPO);
    h.controller.handleResponse(response());
    expect(h.controller.isActive()).toBe(false);
  });

  it("keeps a pending request whose anchor is loaded in the same repository (TC-029)", () => {
    // Case: TC-029
    // Given: a pending request with the anchor loaded
    const h = setup();
    h.controller.request(ANCHOR, FILE_PATH);

    // When: the render hook fires (same repository refresh)
    h.controller.onCommitsRendered();

    // Then: still pending with the loading bar, and the response is accepted afterwards
    expect(h.controller.isPending()).toBe(true);
    expect(h.bar().classList.contains("active")).toBe(true);
    expect(h.bar().classList.contains("loading")).toBe(true);
    h.controller.handleResponse(response());
    expect(h.controller.isActive()).toBe(true);
  });

  it("does nothing when inactive and not pending (TC-030)", () => {
    // Case: TC-030
    // Given: a fresh controller
    const h = setup();

    // When: the render hook fires
    h.controller.onCommitsRendered();

    // Then: no callback and no classes
    expectNoCallbackCalled(h);
    expectNoHighlightClasses(h);
  });
});

/* ------------------------------------------------------------------ */
/* S10: bounded prev() / next() and handleCommitRowClick()            */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/fileHistory-test.md
describe("FileHistoryController bounded prev / next / row click (S10)", () => {
  it("file history regression: prev stops at the first match without wrapping (TC-070)", () => {
    // Case: TC-070
    // Given: fixture A without details, current at h0 (the first match)
    const h = setup(FIXTURE_A_COMMITS);
    h.callbacks.getExpandedCommit.mockReturnValue(null);
    activate(h);
    const before = observe(h);
    expect(before.position).toBe("1 of 3");

    // When: prev is clicked
    h.click(PREV_ID);

    // Then: current does not wrap to h2 and nothing observable changes
    expect(h.controller.getCurrentHash()).toBe("h0");
    expect(h.callbacks.scrollToCommit).toHaveBeenCalledTimes(before.scrollToCommitCalls);
    expect(observe(h)).toEqual(before);
  });

  it("file history regression: next stops at the last match without wrapping (TC-072)", () => {
    // Case: TC-072
    // Given: fixture A without details, current moved to h2 (the last match)
    const h = setup(FIXTURE_A_COMMITS);
    h.callbacks.getExpandedCommit.mockReturnValue(null);
    activate(h);
    h.controller.handleCommitRowClick("h2");
    const before = observe(h);
    expect(before.currentHash).toBe("h2");
    expect(before.position).toBe("3 of 3");

    // When: next is clicked
    h.click(NEXT_ID);

    // Then: current does not wrap to h0 and nothing observable changes
    expect(h.controller.getCurrentHash()).toBe("h2");
    expect(h.callbacks.scrollToCommit).toHaveBeenCalledTimes(before.scrollToCommitCalls);
    expect(observe(h)).toEqual(before);
  });

  it("file history regression: prev and next do not scroll again with a single match (TC-074)", () => {
    // Case: TC-074
    // Given: fixture B without details, h0 is the only match
    const h = setup(FIXTURE_B_COMMITS);
    h.callbacks.getExpandedCommit.mockReturnValue(null);
    h.controller.request(ANCHOR, FILE_PATH);
    h.controller.handleResponse(response({ entries: [entry(ANCHOR)] }));
    const before = observe(h);
    expect(before.currentHash).toBe(ANCHOR);
    expect(before.position).toBe("1 of 1");

    for (const buttonId of [PREV_ID, NEXT_ID]) {
      // When: the button is clicked
      h.click(buttonId);

      // Then: no scroll to the same row and nothing observable changes
      expect(h.callbacks.scrollToCommit, buttonId).toHaveBeenCalledTimes(
        before.scrollToCommitCalls
      );
      expect(h.text(POSITION_ID), buttonId).toBe("1 of 1");
      expect(observe(h), buttonId).toEqual(before);
    }
  });

  it("moves to the older match on next (TC-089)", () => {
    // Case: TC-089
    // Given: visible [h0, h1] with h0 current
    const h = setup();
    activate(h);

    // When: next is clicked
    h.click(NEXT_ID);

    // Then: h1 is current, centered, position "2 of 2", graph current h1
    expect(h.rowsWith(CLASS_FILE_HISTORY_CURRENT)).toEqual(["h1"]);
    expect(h.callbacks.scrollToCommit).toHaveBeenCalledTimes(2);
    expect(h.callbacks.scrollToCommit).toHaveBeenLastCalledWith("h1", true);
    expect(h.text(POSITION_ID)).toBe("2 of 2");
    expect(lastHighlight(h).currentHash).toBe("h1");
  });

  it("moves to the newer match on prev (TC-090)", () => {
    // Case: TC-090
    // Given: current moved to h1 (the last match) by next
    const h = setup();
    activate(h);
    h.click(NEXT_ID);
    expect(h.controller.getCurrentHash()).toBe("h1");
    const scrollsBefore = h.callbacks.scrollToCommit.mock.calls.length;

    // When: prev is clicked
    h.click(PREV_ID);

    // Then: h0 is current and this click scrolls once to h0
    expect(h.controller.getCurrentHash()).toBe("h0");
    expect(h.callbacks.scrollToCommit).toHaveBeenCalledTimes(scrollsBefore + 1);
    expect(h.callbacks.scrollToCommit).toHaveBeenLastCalledWith("h0", true);
  });

  it("does not open commit details when moving (TC-091)", () => {
    // Case: TC-091
    // Given: an active mode (hideCommitDetails ran once on accept)
    const h = setup();
    activate(h);

    // When: next is clicked
    h.click(NEXT_ID);

    // Then: no extra hide / restore and no commitDetails request
    expect(h.callbacks.hideCommitDetails).toHaveBeenCalledTimes(1);
    expect(h.callbacks.restoreExpandedCommit).toHaveBeenCalledTimes(0);
    expect(postedMessages().filter((m) => m.command === "commitDetails")).toHaveLength(0);
  });

  it("syncs current to a clicked match row without scrolling (TC-092)", () => {
    // Case: TC-092
    // Given: an active mode
    const h = setup();
    activate(h);

    // When: a visible match row is clicked
    h.controller.handleCommitRowClick("h1");

    // Then: h1 current, position "2 of 2", no extra scroll
    expect(h.rowsWith(CLASS_FILE_HISTORY_CURRENT)).toEqual(["h1"]);
    expect(h.text(POSITION_ID)).toBe("2 of 2");
    expect(h.callbacks.scrollToCommit).toHaveBeenCalledTimes(1);
  });

  it("ignores a click on a non-match row (TC-093)", () => {
    // Case: TC-093
    // Given: an active mode
    const h = setup();
    activate(h);
    const highlightCalls = h.callbacks.setGraphHighlight.mock.calls.length;

    // When: a dim row is clicked
    h.controller.handleCommitRowClick("x1");

    // Then: current, classes, position and highlight calls unchanged
    expect(h.controller.getCurrentHash()).toBe("h0");
    expect(h.rowsWith(CLASS_FILE_HISTORY_CURRENT)).toEqual(["h0"]);
    expect(h.text(POSITION_ID)).toBe("1 of 2");
    expect(h.callbacks.setGraphHighlight).toHaveBeenCalledTimes(highlightCalls);
  });

  it("ignores a row click while inactive (TC-094)", () => {
    // Case: TC-094
    // Given: a fresh controller
    const h = setup();

    // When: a row is clicked
    h.controller.handleCommitRowClick("h0");

    // Then: no callback and no classes
    expectNoCallbackCalled(h);
    expectNoHighlightClasses(h);
  });

  it("ignores next while only pending (TC-095)", () => {
    // Case: TC-095
    // Given: a pending request without an accepted response
    const h = setup();
    h.controller.request(ANCHOR, FILE_PATH);

    // When: next is clicked
    h.click(NEXT_ID);

    // Then: no scroll and no current hash
    expect(h.callbacks.scrollToCommit).toHaveBeenCalledTimes(0);
    expect(h.controller.getCurrentHash()).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* S10: navigate() origin, boundaries and guards                      */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/fileHistory-test.md
describe("FileHistoryController.navigate() bounded movement (S10)", () => {
  it("skips the dim row and moves down to the next match (TC-058)", () => {
    // Case: TC-058
    // Given: fixture A without details, current at h0
    const h = activateFixtureA();
    const before = observe(h);

    // When: the key path moves down
    const result = h.controller.navigate(DOWN, true);

    // Then: h1 is returned (not x1) and state, classes, graph, position and one scroll agree
    expect(result).toBe("h1");
    expectMovedTo(h, before, "h1", "2 of 3");
    expect(h.rowsWith(CLASS_FILE_HISTORY_MATCH)).toEqual(ENTRY_HASHES);
    expect(h.rowsWith(CLASS_FILE_HISTORY_DIM)).toEqual(["x1", "x2"]);
  });

  it.each([
    { caseId: "TC-059", direction: "up", delta: UP, hash: "h0", position: "1 of 3" },
    { caseId: "TC-060", direction: "down", delta: DOWN, hash: "h2", position: "3 of 3" }
  ])("moves $direction from the middle match to $hash ($caseId)", ({ delta, hash, position }) => {
    // Case: TC-059 (up), TC-060 (down)
    // Given: fixture A without details, current moved to h1
    const h = activateFixtureA();
    h.controller.handleCommitRowClick("h1");
    const before = observe(h);
    expect(before.currentHash).toBe("h1");

    // When: the key path moves in the direction
    const result = h.controller.navigate(delta, true);

    // Then: the adjacent match is returned and everything agrees on it with one scroll
    expect(result).toBe(hash);
    expectMovedTo(h, before, hash, position);
  });

  describe("translated position", () => {
    const originalMessages = globalThis.webviewMessages;

    afterEach(() => {
      globalThis.webviewMessages = originalMessages;
    });

    it.each([
      { caseId: "TC-058", language: "English", template: "{0} of {1}", position: "2 of 3" },
      { caseId: "TC-061", language: "Japanese", template: "{0} / {1}", position: "2 / 3" }
    ])("shows the $language position after a move ($caseId)", ({ template, position }) => {
      // Case: TC-058 (English template), TC-061 (Japanese template)
      // Given: only the position template is replaced, then fixture A is accepted
      globalThis.webviewMessages = { ...originalMessages, [POSITION_MESSAGE_KEY]: template };
      const h = activateFixtureA();

      // When: the key path moves down to the second of three matches
      const result = h.controller.navigate(DOWN, true);

      // Then: the position uses the template while the other messages are kept
      expect(result).toBe("h1");
      expect(h.text(POSITION_ID)).toBe(position);
      expect(h.controller.getCurrentHash()).toBe("h1");
      expect(h.rowsWith(CLASS_FILE_HISTORY_CURRENT)).toEqual(["h1"]);
      expect(document.getElementById(PREV_ID)!.title).toBe("Previous match");
    });
  });

  it.each([
    { caseId: "TC-062", direction: "up", delta: UP, current: "h0", hash: "h0", position: "1 of 3" },
    { caseId: "TC-062", direction: "up", delta: UP, current: "h2", hash: "h0", position: "1 of 3" },
    {
      caseId: "TC-063",
      direction: "down",
      delta: DOWN,
      current: "h0",
      hash: "h1",
      position: "2 of 3"
    },
    {
      caseId: "TC-063",
      direction: "down",
      delta: DOWN,
      current: "h2",
      hash: "h1",
      position: "2 of 3"
    }
  ])(
    "moves $direction from the dim details x1 to $hash while current is $current ($caseId)",
    ({ delta, current, hash, position }) => {
      // Case: TC-062 (up), TC-063 (down)
      // Given: fixture A with the details of the dim row x1 open and current at either end
      const h = activateFixtureA();
      h.controller.handleCommitRowClick(current);
      h.callbacks.getExpandedCommit.mockReturnValue(expandedAt("x1"));
      const before = observe(h);
      expect(before.currentHash).toBe(current);

      // When: the key path moves in the direction
      const result = h.controller.navigate(delta, true);

      // Then: the nearest match from x1 is returned, regardless of the kept current
      expect(result).toBe(hash);
      expectMovedTo(h, before, hash, position);
    }
  );

  it("prefers current over the details of a match left open by the buttons (TC-064)", () => {
    // Case: TC-064
    // Given: fixture A with the details of the match h0 open, and next moved current to h1
    const h = activateFixtureA();
    h.callbacks.getExpandedCommit.mockReturnValue(expandedAt("h0"));
    const before = observe(h);
    h.click(NEXT_ID);
    expect(h.controller.getCurrentHash()).toBe("h1");

    // When: the key path moves down
    const result = h.controller.navigate(DOWN, true);

    // Then: h2 is returned (not h1 from the stale details) after the two scrolls in order
    expect(result).toBe("h2");
    expect(h.controller.getCurrentHash()).toBe("h2");
    expect(h.text(POSITION_ID)).toBe("3 of 3");
    expect(h.callbacks.scrollToCommit.mock.calls.slice(before.scrollToCommitCalls)).toEqual([
      ["h1", true],
      ["h2", true]
    ]);
  });

  it.each([
    { button: "next", buttonId: NEXT_ID, details: "x2", current: "h0" },
    { button: "prev", buttonId: PREV_ID, details: "x1", current: "h2" }
  ])(
    "$button ignores the dim details $details and starts from current $current (TC-065)",
    ({ buttonId, details, current }) => {
      // Case: TC-065
      // Given: fixture A with the details of a dim row open beyond the adjacent match
      const h = activateFixtureA();
      h.controller.handleCommitRowClick(current);
      h.callbacks.getExpandedCommit.mockReturnValue(expandedAt(details));
      const before = observe(h);

      // When: the button is clicked
      h.click(buttonId);

      // Then: current moves to h1, the match next to current (not the one next to the details)
      expectMovedTo(h, before, "h1", "2 of 3");
    }
  );

  it("starts from current when the second argument is omitted (TC-066)", () => {
    // Case: TC-066
    // Given: fixture A with the details of the dim row x2 open and current at h0
    const h = activateFixtureA();
    h.callbacks.getExpandedCommit.mockReturnValue(expandedAt("x2"));

    // When: navigate is called with the default origin
    const result = h.controller.navigate(DOWN);

    // Then: h1 is returned (not h2 from the details)
    expect(result).toBe("h1");
    expect(h.controller.getCurrentHash()).toBe("h1");
  });

  it("next does not read the details even when their hash is not loaded (TC-067)", () => {
    // Case: TC-067
    // Given: fixture A with the details of a hash that is not in the loaded commits
    const h = activateFixtureA();
    h.callbacks.getExpandedCommit.mockReturnValue(expandedAt(UNKNOWN_HASH));
    const before = observe(h);
    const detailReadsBefore = h.callbacks.getExpandedCommit.mock.calls.length;

    // When: next is clicked
    h.click(NEXT_ID);

    // Then: current moves to h1 with one scroll and the details are never read
    expectMovedTo(h, before, "h1", "2 of 3");
    expect(h.callbacks.getExpandedCommit).toHaveBeenCalledTimes(detailReadsBefore);
  });

  it("does not start from dim details that are being compared (TC-068)", () => {
    // Case: TC-068
    // Given: fixture A with the dim row x2 open in comparison mode and current at h0
    const h = activateFixtureA();
    h.callbacks.getExpandedCommit.mockReturnValue(expandedAt("x2", { compareWithHash: "h0" }));

    // When: the key path moves down
    const result = h.controller.navigate(DOWN, true);

    // Then: h1 is returned from current (not h2 from x2)
    expect(result).toBe("h1");
    expect(h.controller.getCurrentHash()).toBe("h1");
  });

  it.each([
    { caseId: "TC-069", edge: "first", current: "h0", delta: UP, position: "1 of 3" },
    { caseId: "TC-071", edge: "last", current: "h2", delta: DOWN, position: "3 of 3" }
  ])(
    "stops at the $edge match without wrapping or scrolling ($caseId)",
    ({ current, delta, position }) => {
      // Case: TC-069 (first match, up), TC-071 (last match, down)
      // Given: fixture A without details, current at the edge
      const h = activateFixtureA();
      h.controller.handleCommitRowClick(current);
      const before = observe(h);
      expect(before.currentHash).toBe(current);
      expect(before.position).toBe(position);

      // When: the key path moves past the edge
      const result = h.controller.navigate(delta, true);

      // Then: null is returned and nothing observable changes, including posted requests
      expect(result).toBeNull();
      expect(observe(h)).toEqual(before);
    }
  );

  it.each([
    { direction: "up", delta: UP },
    { direction: "down", delta: DOWN }
  ])("does not move $direction from the only match (TC-073)", ({ delta }) => {
    // Case: TC-073
    // Given: fixture B without details, h0 is the only match
    const h = activateFixtureB();
    const before = observe(h);
    expect(before.position).toBe("1 of 1");

    // When: the key path moves in the direction
    const result = h.controller.navigate(delta, true);

    // Then: null is returned and nothing observable changes
    expect(result).toBeNull();
    expect(observe(h)).toEqual(before);
  });

  it.each([
    { caseId: "TC-075", details: "before", direction: "down", delta: DOWN },
    { caseId: "TC-076", details: "after", direction: "up", delta: UP }
  ])(
    "moves $direction from the dim details $details to the only match ($caseId)",
    ({ details, delta }) => {
      // Case: TC-075 (from the row above), TC-076 (from the row below)
      // Given: fixture B with the details of a dim row next to the only match
      const h = activateFixtureB();
      h.callbacks.getExpandedCommit.mockReturnValue(expandedAt(details));
      const before = observe(h);

      // When: the key path moves toward the match
      const result = h.controller.navigate(delta, true);

      // Then: h0 is returned with one scroll
      expect(result).toBe(ANCHOR);
      expectMovedTo(h, before, ANCHOR, "1 of 1");
    }
  );

  it.each([
    { caseId: "TC-077", details: "before", direction: "up", delta: UP },
    { caseId: "TC-078", details: "after", direction: "down", delta: DOWN }
  ])(
    "does not move $direction from the dim details $details without a match ahead ($caseId)",
    ({ details, delta }) => {
      // Case: TC-077 (up from the row above), TC-078 (down from the row below)
      // Given: fixture B with the details of a dim row at the table edge
      const h = activateFixtureB();
      h.callbacks.getExpandedCommit.mockReturnValue(expandedAt(details));
      const before = observe(h);

      // When: the key path moves away from the match
      const result = h.controller.navigate(delta, true);

      // Then: null is returned and nothing observable changes
      expect(result).toBeNull();
      expect(observe(h)).toEqual(before);
    }
  );

  it("returns null without any callback while inactive (TC-079)", () => {
    // Case: TC-079
    // Given: a fresh controller that never requested a history
    const h = setup(FIXTURE_A_COMMITS);

    // When: the key path moves in both directions
    const results = [h.controller.navigate(UP, true), h.controller.navigate(DOWN, true)];

    // Then: both return null, no callback runs and no class is applied
    expect(results).toEqual([null, null]);
    expectNoCallbackCalled(h);
    expectNoHighlightClasses(h);
  });

  it("returns null while the first request is pending (TC-080)", () => {
    // Case: TC-080
    // Given: a pending request without an accepted response
    const h = setup(FIXTURE_A_COMMITS);
    h.controller.request(ANCHOR, FILE_PATH);
    const before = observe(h);

    // When: the key path moves down
    const result = h.controller.navigate(DOWN, true);

    // Then: null, no current, the loading bar is kept and nothing scrolls or highlights
    expect(result).toBeNull();
    expect(h.controller.getCurrentHash()).toBeNull();
    expect(h.bar().classList.contains("active")).toBe(true);
    expect(h.bar().classList.contains("loading")).toBe(true);
    expect(h.callbacks.scrollToCommit).toHaveBeenCalledTimes(0);
    expect(h.callbacks.setGraphHighlight).toHaveBeenCalledTimes(0);
    expect(observe(h)).toEqual(before);
  });

  it("rejects the key path and next while a switch is pending (TC-081)", () => {
    // Case: TC-081
    // Given: fixture A with a pending request for another file
    const h = activateFixtureA();
    requestSwitch(h);
    const before = observe(h);
    expect(before.currentHash).toBe("h0");
    expect(before.barClasses).toContain("loading");

    // When: the key path moves down
    const result = h.controller.navigate(DOWN, true);

    // Then: null is returned and nothing observable changes
    expect(result).toBeNull();
    expect(observe(h)).toEqual(before);

    // When: next is clicked without relying on the CSS that disables it
    h.click(NEXT_ID);

    // Then: nothing observable changes either
    expect(observe(h)).toEqual(before);
  });

  it("returns null without exiting when current is not loaded (TC-082)", () => {
    // Case: TC-082
    // Given: fixture A with current at h1, then h1 drops out of the loaded commits before any
    // render hook runs
    const h = activateFixtureA();
    h.controller.handleCommitRowClick("h1");
    h.callbacks.getCommits.mockReturnValue(["h0", "x1", "x2", "h2"].map(commit));
    const before = observe(h);

    // When: the key path moves down
    const result = h.controller.navigate(DOWN, true);

    // Then: null, still active at h1, and nothing observable changes
    expect(result).toBeNull();
    expect(h.controller.isActive()).toBe(true);
    expect(h.controller.getCurrentHash()).toBe("h1");
    expect(observe(h)).toEqual(before);
  });

  it("returns null when the details origin is not loaded (TC-083)", () => {
    // Case: TC-083
    // Given: fixture A with the details of a hash that is not in the loaded commits
    const h = activateFixtureA();
    h.callbacks.getExpandedCommit.mockReturnValue(expandedAt(UNKNOWN_HASH));
    const before = observe(h);

    // When: the key path moves down
    const result = h.controller.navigate(DOWN, true);

    // Then: null (no fallback to h1 from current) and nothing observable changes
    expect(result).toBeNull();
    expect(observe(h)).toEqual(before);
  });

  it("returns null without a partial update when the destination row is missing (TC-084)", () => {
    // Case: TC-084
    // Given: fixture A whose h1 row left the DOM while the loaded commits still hold h1
    const h = activateFixtureA();
    document.querySelector('.commit[data-hash="h1"]')!.remove();
    const before = observe(h);

    // When: the key path moves down
    const result = h.controller.navigate(DOWN, true);

    // Then: null, current stays at h0 and nothing observable changes
    expect(result).toBeNull();
    expect(h.controller.getCurrentHash()).toBe("h0");
    expect(observe(h)).toEqual(before);
  });

  it("reaches a later match only after it is loaded and rendered (TC-085, TC-086)", () => {
    // Case: TC-085 / TC-086
    // Given: entries include h3 that is not loaded, and current is at h2
    const h = setup(FIXTURE_A_COMMITS);
    h.callbacks.getExpandedCommit.mockReturnValue(null);
    h.controller.request(ANCHOR, FILE_PATH);
    h.controller.handleResponse(
      response({ entries: [...ENTRY_HASHES, UNLOADED_MATCH].map((hash) => entry(hash)) })
    );
    h.controller.handleCommitRowClick("h2");
    const beforeLoad = observe(h);
    expect(beforeLoad.position).toBe("3 of 3");

    // When: the key path moves down before h3 is loaded (TC-085)
    const resultBeforeLoad = h.controller.navigate(DOWN, true);

    // Then: null, nothing changes and no request asks for more commits
    expect(resultBeforeLoad).toBeNull();
    expect(observe(h)).toEqual(beforeLoad);

    // When: h3 is loaded, the render hook runs, and the key path moves down again (TC-086)
    h.setCommits([...FIXTURE_A_COMMITS, UNLOADED_MATCH]);
    h.controller.onCommitsRendered();
    const afterLoad = observe(h);
    expect(afterLoad.position).toBe("3 of 4");
    const resultAfterLoad = h.controller.navigate(DOWN, true);

    // Then: h3 is returned with one scroll
    expect(resultAfterLoad).toBe(UNLOADED_MATCH);
    expectMovedTo(h, afterLoad, UNLOADED_MATCH, "4 of 4");
  });

  it("moves to a loaded match that is outside the viewport (TC-087)", () => {
    // Case: TC-087
    // Given: fixture A whose h1 row is laid out far below the visible area
    const h = activateFixtureA();
    const row = document.querySelector<HTMLElement>('.commit[data-hash="h1"]')!;
    vi.spyOn(row, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, OFFSCREEN_ROW_TOP, ROW_WIDTH, ROW_HEIGHT)
    );
    const before = observe(h);

    // When: the key path moves down
    const result = h.controller.navigate(DOWN, true);

    // Then: h1 is returned with one scroll
    expect(result).toBe("h1");
    expectMovedTo(h, before, "h1", "2 of 3");
  });

  it("keeps moving while the details of the previous move are loading (TC-088)", () => {
    // Case: TC-088
    // Given: fixture A without details
    const h = activateFixtureA();
    const before = observe(h);

    // When: the key path moves down twice, with the details of h1 still loading in between
    const first = h.controller.navigate(DOWN, true);
    const currentAfterFirst = h.controller.getCurrentHash();
    h.callbacks.getExpandedCommit.mockReturnValue(
      expandedAt("h1", { commitDetails: null, fileTree: null, loading: true })
    );
    const second = h.controller.navigate(DOWN, true);

    // Then: current advances h0 -> h1 -> h2 with one scroll per move
    expect(before.currentHash).toBe("h0");
    expect(first).toBe("h1");
    expect(currentAfterFirst).toBe("h1");
    expect(second).toBe("h2");
    expect(h.controller.getCurrentHash()).toBe("h2");
    expect(h.text(POSITION_ID)).toBe("3 of 3");
    expect(h.callbacks.scrollToCommit.mock.calls.slice(before.scrollToCommitCalls)).toEqual([
      ["h1", true],
      ["h2", true]
    ]);
  });
});

/* ------------------------------------------------------------------ */
/* S10: navigate() around request outcomes and exit                   */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/fileHistory-test.md
describe("FileHistoryController.navigate() around requests and exit (S10)", () => {
  const SNAPSHOT = {
    hash: SNAPSHOT_HASH,
    compareWithHash: null,
    commitDetails: DETAILS,
    fileTree: TREE
  };

  it("stays inactive after the first request fails (TC-096)", () => {
    // Case: TC-096
    // Given: the first request failed
    const h = setup(FIXTURE_A_COMMITS);
    h.controller.request(ANCHOR, FILE_PATH);
    h.controller.handleResponse(response({ entries: null }));

    // When: the key path moves down
    const result = h.controller.navigate(DOWN, true);

    // Then: null, inactive, the bar is hidden and nothing scrolls
    expect(result).toBeNull();
    expect(h.controller.isActive()).toBe(false);
    expect(h.bar().classList.contains("active")).toBe(false);
    expect(h.callbacks.scrollToCommit).toHaveBeenCalledTimes(0);
  });

  it("resumes within the old matches after a switch fails (TC-097)", () => {
    // Case: TC-097
    // Given: fixture A with current at h1, and a request for another file that failed
    const h = activateFixtureA();
    h.controller.handleCommitRowClick("h1");
    requestSwitch(h);
    h.controller.handleResponse(
      response({ requestId: SWITCH_REQUEST_ID, filePath: OTHER_FILE_PATH, entries: null })
    );
    const before = observe(h);

    // When: the key path moves down
    const result = h.controller.navigate(DOWN, true);

    // Then: h2 of the old matches is returned with one scroll and the old path is kept
    expect(result).toBe("h2");
    expectMovedTo(h, before, "h2", "3 of 3");
    expect(h.text(PATH_ID)).toBe(FILE_PATH);
  });

  it("uses the new matches after a switch is accepted (TC-098)", () => {
    // Case: TC-098
    // Given: fixture A, then another file anchored at x1 with entries x1 / x2 is accepted
    const h = activateFixtureA();
    h.controller.handleResponse(requestSwitch(h));

    // When: the key path moves down twice
    const first = h.controller.navigate(DOWN, true);
    const positionAfterFirst = h.text(POSITION_ID);
    const second = h.controller.navigate(DOWN, true);

    // Then: x2 of the new matches (not h1 of the old ones), then the end of the new matches
    expect(first).toBe("x2");
    expect(positionAfterFirst).toBe("2 of 2");
    expect(second).toBeNull();
    expect(h.controller.getCurrentHash()).toBe("x2");
  });

  it("cancels a pending-only request without restoring or replaying the move (TC-099)", () => {
    // Case: TC-099
    // Given: a pending request and a key move rejected while it is pending
    const h = setup(FIXTURE_A_COMMITS);
    h.controller.request(ANCHOR, FILE_PATH);
    expect(h.controller.navigate(DOWN, true)).toBeNull();

    // When: exit(true) runs
    h.controller.exit(true);

    // Then: not pending and nothing is restored
    expect(h.controller.isPending()).toBe(false);
    expect(h.callbacks.restoreExpandedCommit).toHaveBeenCalledTimes(0);
    expect(h.callbacks.setScrollTop).toHaveBeenCalledTimes(0);

    // When: the response for the cancelled request arrives
    h.controller.handleResponse(response());

    // Then: it is ignored and the rejected move is not replayed
    expect(h.controller.isActive()).toBe(false);
    expect(h.controller.getCurrentHash()).toBeNull();
    expect(h.callbacks.hideCommitDetails).toHaveBeenCalledTimes(0);
    expect(h.callbacks.scrollToCommit).toHaveBeenCalledTimes(0);
  });

  it("cancels a pending switch and restores the accepted snapshot (TC-100)", () => {
    // Case: TC-100
    // Given: fixture A accepted with the details of x2 and scrollTop 120, a pending switch, and a
    // key move rejected while it is pending
    const h = setup(FIXTURE_A_COMMITS);
    h.callbacks.getExpandedCommit.mockReturnValue(expandedAt(SNAPSHOT_HASH));
    activate(h);
    const switchResponse = requestSwitch(h);
    const scrollsAfterAccept = h.callbacks.scrollToCommit.mock.calls.length;
    expect(h.controller.navigate(DOWN, true)).toBeNull();

    // When: exit(true) runs
    h.controller.exit(true);

    // Then: both states end and the accepted snapshot is restored before the scroll position
    expect(h.controller.isActive()).toBe(false);
    expect(h.controller.isPending()).toBe(false);
    expect(h.callbacks.restoreExpandedCommit).toHaveBeenCalledTimes(1);
    expect(h.callbacks.restoreExpandedCommit).toHaveBeenCalledWith(SNAPSHOT);
    expect(h.callbacks.setScrollTop).toHaveBeenCalledTimes(1);
    expect(h.callbacks.setScrollTop).toHaveBeenCalledWith(SCROLL_TOP);
    expect(h.callbacks.restoreExpandedCommit.mock.invocationCallOrder[0]).toBeLessThan(
      h.callbacks.setScrollTop.mock.invocationCallOrder[0]
    );

    // When: the response for the cancelled switch arrives
    h.controller.handleResponse(switchResponse);

    // Then: it is ignored and the rejected move is not replayed
    expect(h.controller.isActive()).toBe(false);
    expect(h.callbacks.scrollToCommit).toHaveBeenCalledTimes(scrollsAfterAccept);
  });

  it("restores the state captured at acceptance, not at request time (TC-101)", () => {
    // Case: TC-101
    // Given: the details of x2 are open when the request is sent
    const h = setup(FIXTURE_A_COMMITS);
    h.callbacks.getExpandedCommit.mockReturnValue(expandedAt(SNAPSHOT_HASH));
    h.callbacks.getScrollTop.mockReturnValue(REQUEST_TIME_SCROLL_TOP);
    h.controller.request(ANCHOR, FILE_PATH);

    // Given: the details are closed and the view is at scrollTop 120 when the response is accepted
    h.callbacks.getExpandedCommit.mockReturnValue(null);
    h.callbacks.getScrollTop.mockReturnValue(SCROLL_TOP);
    h.controller.handleResponse(response());

    // When: exit(true) runs
    h.controller.exit(true);

    // Then: the details seen at request time are not reopened and only scrollTop 120 is restored
    expect(h.callbacks.restoreExpandedCommit).toHaveBeenCalledTimes(0);
    expect(h.callbacks.setScrollTop).toHaveBeenCalledTimes(1);
    expect(h.callbacks.setScrollTop).toHaveBeenCalledWith(SCROLL_TOP);
  });

  it("restores the accepted snapshot when a pending switch is cancelled later (TC-102)", () => {
    // Case: TC-102
    // Given: fixture A accepted with the details of x2 and scrollTop 120, then a pending switch
    const h = setup(FIXTURE_A_COMMITS);
    h.callbacks.getExpandedCommit.mockReturnValue(expandedAt(SNAPSHOT_HASH));
    activate(h);
    requestSwitch(h);

    // Given: the details are closed and the view scrolled to 300 while the switch is pending
    h.callbacks.getExpandedCommit.mockReturnValue(null);
    h.callbacks.getScrollTop.mockReturnValue(LATER_SCROLL_TOP);

    // When: exit(true) runs
    h.controller.exit(true);

    // Then: the snapshot of the accepted history is restored (x2 and 120, not 300)
    expect(h.callbacks.restoreExpandedCommit).toHaveBeenCalledTimes(1);
    expect(h.callbacks.restoreExpandedCommit).toHaveBeenCalledWith(SNAPSHOT);
    expect(h.callbacks.setScrollTop).toHaveBeenCalledTimes(1);
    expect(h.callbacks.setScrollTop).toHaveBeenCalledWith(SCROLL_TOP);
    expect(h.callbacks.restoreExpandedCommit.mock.invocationCallOrder[0]).toBeLessThan(
      h.callbacks.setScrollTop.mock.invocationCallOrder[0]
    );
  });
});

/* ------------------------------------------------------------------ */
/* S7: onRepositoryChanged()                                          */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/fileHistory-test.md
describe("FileHistoryController.onRepositoryChanged() (S7)", () => {
  it("drops the pending request but keeps numbering (TC-041)", () => {
    // Case: TC-041
    // Given: a pending request with id 1
    const h = setup();
    h.controller.request(ANCHOR, FILE_PATH);

    // When: the repository changes
    h.controller.onRepositoryChanged();

    // Then: not pending, bar hidden, the next request is id 2, and the id 1 response is ignored
    expect(h.controller.isPending()).toBe(false);
    expect(h.bar().classList.contains("active")).toBe(false);
    h.controller.request(ANCHOR, FILE_PATH);
    expect(postedMessages()[1].requestId).toBe(2);
    h.controller.handleResponse(response({ requestId: 1 }));
    expect(h.controller.isActive()).toBe(false);
  });

  it("exits without restoring during active mode (TC-042)", () => {
    // Case: TC-042
    // Given: an active mode
    const h = setup();
    activate(h);

    // When: the repository changes
    h.controller.onRepositoryChanged();

    // Then: inactive, classes gone, graph highlight cleared, no restore callbacks
    expect(h.controller.isActive()).toBe(false);
    expectNoHighlightClasses(h);
    expect(h.callbacks.setGraphHighlight).toHaveBeenLastCalledWith(null);
    expect(h.callbacks.setScrollTop).toHaveBeenCalledTimes(0);
    expect(h.callbacks.restoreExpandedCommit).toHaveBeenCalledTimes(0);
  });

  it("does nothing when inactive and not pending (TC-043)", () => {
    // Case: TC-043
    // Given: a fresh controller
    const h = setup();

    // When: the repository changes
    h.controller.onRepositoryChanged();

    // Then: no callback is called
    expectNoCallbackCalled(h);
  });
});

/* ------------------------------------------------------------------ */
/* S8: exit(restore)                                                  */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/fileHistory-test.md
describe("FileHistoryController.exit() (S8)", () => {
  const LOADED_WITH_EXPANDED = ["h0", "h1", EXPANDED_HASH, "x1"];

  it("restores the expanded commit before the scroll position (TC-044)", () => {
    // Case: TC-044
    // Given: an active mode captured with a loaded expanded commit and scrollTop 120
    const h = setup(LOADED_WITH_EXPANDED);
    activate(h);

    // When: exit(true) runs
    h.controller.exit(true);

    // Then: restoreExpandedCommit with the DOM-free snapshot, then setScrollTop(120)
    expect(h.callbacks.restoreExpandedCommit).toHaveBeenCalledTimes(1);
    expect(h.callbacks.restoreExpandedCommit).toHaveBeenCalledWith({
      hash: EXPANDED_HASH,
      compareWithHash: null,
      commitDetails: DETAILS,
      fileTree: TREE
    });
    expect(h.callbacks.setScrollTop).toHaveBeenCalledTimes(1);
    expect(h.callbacks.setScrollTop).toHaveBeenCalledWith(SCROLL_TOP);
    expect(h.callbacks.restoreExpandedCommit.mock.invocationCallOrder[0]).toBeLessThan(
      h.callbacks.setScrollTop.mock.invocationCallOrder[0]
    );
  });

  it("removes every highlight, file row class, note and the bar (TC-045)", () => {
    // Case: TC-045
    // Given: an active mode with a highlighted file row and a note in the DOM
    const h = setup(LOADED_WITH_EXPANDED);
    activate(h);
    document.getElementById("files")!.innerHTML =
      `<li class="gitFile ${CLASS_FILE_HISTORY_CURRENT}"></li><div class="fileHistoryNote"></div>`;

    // When: exit(true) runs
    h.controller.exit(true);

    // Then: classes, file row class and note gone, graph cleared, bar hidden, inactive
    expectNoHighlightClasses(h);
    expect(document.querySelectorAll(`.gitFile.${CLASS_FILE_HISTORY_CURRENT}`)).toHaveLength(0);
    expect(document.querySelectorAll(".fileHistoryNote")).toHaveLength(0);
    expect(h.callbacks.setGraphHighlight).toHaveBeenCalledTimes(2);
    expect(h.callbacks.setGraphHighlight).toHaveBeenLastCalledWith(null);
    expect(h.bar().classList.contains("active")).toBe(false);
    expect(h.controller.isActive()).toBe(false);
  });

  it("only restores the scroll position when no details were loaded (TC-046)", () => {
    // Case: TC-046
    // Given: no expanded commit, or one whose details are still loading, at accept time
    const loadingExpanded = { ...expandedLoaded(), commitDetails: null, loading: true };
    for (const expanded of [null, loadingExpanded]) {
      const h = setup(LOADED_WITH_EXPANDED);
      h.callbacks.getExpandedCommit.mockReturnValue(expanded);
      activate(h);

      // When: exit(true) runs
      h.controller.exit(true);

      // Then: no restoreExpandedCommit but one setScrollTop with the saved value
      expect(h.callbacks.restoreExpandedCommit).toHaveBeenCalledTimes(0);
      expect(h.callbacks.setScrollTop).toHaveBeenCalledTimes(1);
      expect(h.callbacks.setScrollTop).toHaveBeenCalledWith(SCROLL_TOP);
    }
  });

  it("restores nothing when the snapshot commit is unloaded (TC-047)", () => {
    // Case: TC-047
    // Given: an active mode whose expanded commit e1 is not in the commit list
    const h = setup(["h0", "h1", "x1"]);
    activate(h);

    // When: exit(true) runs
    h.controller.exit(true);

    // Then: no restore callbacks while classes and bar are still removed
    expect(h.callbacks.restoreExpandedCommit).toHaveBeenCalledTimes(0);
    expect(h.callbacks.setScrollTop).toHaveBeenCalledTimes(0);
    expectNoHighlightClasses(h);
    expect(h.bar().classList.contains("active")).toBe(false);
  });

  it("restores nothing when the repository changed (TC-048)", () => {
    // Case: TC-048
    // Given: an active mode and a different current repo
    const h = setup(LOADED_WITH_EXPANDED);
    activate(h);
    h.callbacks.getCurrentRepo.mockReturnValue(OTHER_REPO);

    // When: exit(true) runs
    h.controller.exit(true);

    // Then: no restore callbacks
    expect(h.callbacks.restoreExpandedCommit).toHaveBeenCalledTimes(0);
    expect(h.callbacks.setScrollTop).toHaveBeenCalledTimes(0);
  });

  it("never restores on exit(false) (TC-049)", () => {
    // Case: TC-049
    // Given: an active mode with a restorable snapshot
    const h = setup(LOADED_WITH_EXPANDED);
    activate(h);

    // When: exit(false) runs
    h.controller.exit(false);

    // Then: no restore callbacks, classes and bar removed, inactive
    expect(h.callbacks.restoreExpandedCommit).toHaveBeenCalledTimes(0);
    expect(h.callbacks.setScrollTop).toHaveBeenCalledTimes(0);
    expectNoHighlightClasses(h);
    expect(h.bar().classList.contains("active")).toBe(false);
    expect(h.controller.isActive()).toBe(false);
  });

  it("drops a pending-only request on exit(true) (TC-050)", () => {
    // Case: TC-050
    // Given: a pending request without an accepted response
    const h = setup();
    h.controller.request(ANCHOR, FILE_PATH);

    // When: exit(true) runs
    h.controller.exit(true);

    // Then: not pending, bar hidden, no restore, and the late response is ignored
    expect(h.controller.isPending()).toBe(false);
    expect(h.bar().classList.contains("active")).toBe(false);
    expect(h.callbacks.restoreExpandedCommit).toHaveBeenCalledTimes(0);
    expect(h.callbacks.setScrollTop).toHaveBeenCalledTimes(0);
    h.controller.handleResponse(response());
    expect(h.controller.isActive()).toBe(false);
  });

  it("wires the Exit button to exit(true) (TC-051)", () => {
    // Case: TC-051
    // Given: an active mode with a restorable snapshot
    const h = setup(LOADED_WITH_EXPANDED);
    activate(h);

    // When: the Exit button is clicked
    h.click(EXIT_ID);

    // Then: restoreExpandedCommit runs once, then setScrollTop once, in that order
    expect(h.callbacks.restoreExpandedCommit).toHaveBeenCalledTimes(1);
    expect(h.callbacks.setScrollTop).toHaveBeenCalledTimes(1);
    expect(h.callbacks.restoreExpandedCommit.mock.invocationCallOrder[0]).toBeLessThan(
      h.callbacks.setScrollTop.mock.invocationCallOrder[0]
    );
    expect(h.controller.isActive()).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* S9: getters                                                        */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/fileHistory-test.md
describe("FileHistoryController getters (S9)", () => {
  it("reports pending right after request() (TC-052)", () => {
    // Case: TC-052
    // Given: a fresh controller
    const h = setup();

    // When: a request is made
    h.controller.request(ANCHOR, FILE_PATH);

    // Then: pending, not active, no current hash
    expect(h.controller.isPending()).toBe(true);
    expect(h.controller.isActive()).toBe(false);
    expect(h.controller.getCurrentHash()).toBeNull();
  });

  it("reports active after a successful response (TC-053)", () => {
    // Case: TC-053
    // Given: a request
    const h = setup();

    // When: the response is accepted
    activate(h);

    // Then: active, not pending, current is the anchor
    expect(h.controller.isActive()).toBe(true);
    expect(h.controller.isPending()).toBe(false);
    expect(h.controller.getCurrentHash()).toBe(ANCHOR);
  });

  it("reports both active and pending while requesting another file (TC-054)", () => {
    // Case: TC-054
    // Given: an active mode
    const h = setup();
    activate(h);

    // When: another request is made
    h.controller.request("x1", OTHER_FILE_PATH);

    // Then: active and pending, current still the old anchor
    expect(h.controller.isActive()).toBe(true);
    expect(h.controller.isPending()).toBe(true);
    expect(h.controller.getCurrentHash()).toBe(ANCHOR);
  });

  it("returns the historical path (rename target) of an R entry (TC-055)", () => {
    // Case: TC-055
    // Given: an accepted response whose h1 entry is a rename
    const h = setup();
    h.controller.request(ANCHOR, FILE_PATH);
    h.controller.handleResponse(
      response({
        entries: [
          entry("h0"),
          entry("h1", {
            type: "R",
            oldFilePath: "src/old.txt",
            newFilePath: FILE_PATH,
            historicalPath: FILE_PATH
          }),
          entry("h2")
        ]
      })
    );

    // When: the historical path of h1 is requested
    const result = h.controller.getHistoricalPathFor("h1");

    // Then: the new file path, not the old one
    expect(result).toBe(FILE_PATH);
    expect(result).not.toBe("src/old.txt");
  });

  it("returns null for a hash that is not an entry (TC-056)", () => {
    // Case: TC-056
    // Given: an active mode
    const h = setup();
    activate(h);

    // When/Then: an unknown hash resolves to null
    expect(h.controller.getHistoricalPathFor("zz")).toBeNull();
  });

  it("returns null for every getter while inactive (TC-057)", () => {
    // Case: TC-057
    // Given: a fresh controller
    const h = setup();

    // When/Then: no historical path and no current hash
    expect(h.controller.getHistoricalPathFor(ANCHOR)).toBeNull();
    expect(h.controller.getCurrentHash()).toBeNull();
  });
});
