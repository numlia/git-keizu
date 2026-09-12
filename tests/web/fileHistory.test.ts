// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

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
/* S6: prev() / next() and handleCommitRowClick()                     */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/fileHistory-test.md
describe("FileHistoryController prev / next / row click (S6)", () => {
  it("moves to the older match on next (TC-031)", () => {
    // Case: TC-031
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

  it("wraps from the last match to the first on next (TC-032)", () => {
    // Case: TC-032
    // Given: current at h1 (the last match)
    const h = setup();
    activate(h);
    h.click(NEXT_ID);

    // When: next is clicked again
    h.click(NEXT_ID);

    // Then: back to h0 with a centered scroll and position "1 of 2"
    expect(h.rowsWith(CLASS_FILE_HISTORY_CURRENT)).toEqual(["h0"]);
    expect(h.callbacks.scrollToCommit).toHaveBeenLastCalledWith("h0", true);
    expect(h.text(POSITION_ID)).toBe("1 of 2");
  });

  it("wraps from the first match to the last on prev (TC-033)", () => {
    // Case: TC-033
    // Given: current at h0 (the first match)
    const h = setup();
    activate(h);

    // When: prev is clicked
    h.click(PREV_ID);

    // Then: h1 is current with one centered scroll for the move
    expect(h.controller.getCurrentHash()).toBe("h1");
    expect(h.callbacks.scrollToCommit).toHaveBeenCalledTimes(2);
    expect(h.callbacks.scrollToCommit).toHaveBeenLastCalledWith("h1", true);
  });

  it("moves to the newer match on prev (TC-034)", () => {
    // Case: TC-034
    // Given: current at h1
    const h = setup();
    activate(h);
    h.click(PREV_ID);
    expect(h.controller.getCurrentHash()).toBe("h1");

    // When: prev is clicked
    h.click(PREV_ID);

    // Then: h0 is current and the last scroll targets h0
    expect(h.controller.getCurrentHash()).toBe("h0");
    expect(h.callbacks.scrollToCommit).toHaveBeenCalledTimes(3);
    expect(h.callbacks.scrollToCommit).toHaveBeenLastCalledWith("h0", true);
  });

  it("stays on the anchor with a single visible match (TC-035)", () => {
    // Case: TC-035
    // Given: only the anchor visible
    const h = setup(["h0", "x1"]);
    activate(h);

    // When: next is clicked
    h.click(NEXT_ID);

    // Then: current unchanged, one more centered scroll to the anchor, "1 of 1"
    expect(h.controller.getCurrentHash()).toBe(ANCHOR);
    expect(h.callbacks.scrollToCommit).toHaveBeenCalledTimes(2);
    expect(h.callbacks.scrollToCommit).toHaveBeenLastCalledWith(ANCHOR, true);
    expect(h.text(POSITION_ID)).toBe("1 of 1");
  });

  it("does not open commit details when moving (TC-036)", () => {
    // Case: TC-036
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

  it("syncs current to a clicked match row without scrolling (TC-037)", () => {
    // Case: TC-037
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

  it("ignores a click on a non-match row (TC-038)", () => {
    // Case: TC-038
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

  it("ignores a row click while inactive (TC-039)", () => {
    // Case: TC-039
    // Given: a fresh controller
    const h = setup();

    // When: a row is clicked
    h.controller.handleCommitRowClick("h0");

    // Then: no callback and no classes
    expectNoCallbackCalled(h);
    expectNoHighlightClasses(h);
  });

  it("ignores next while only pending (TC-040)", () => {
    // Case: TC-040
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
