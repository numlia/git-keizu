// @vitest-environment jsdom
import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as GG from "../../src/types";
import type { FindWidgetCallbacks } from "../../web/findWidget";
import {
  CLASS_FIND_CURRENT_COMMIT,
  CLASS_FIND_MATCH,
  FindWidget,
  SEARCH_DEBOUNCE_MS
} from "../../web/findWidget";
import { configureFocusContext, markFocusTarget } from "../../web/keyboardNavigation";

/* === Mocks === */

vi.mock("../../web/branchLabels", () => ({
  getBranchLabels: vi.fn(() => ({ heads: [], remotes: [], tags: [] }))
}));

vi.mock("../../web/dates", () => ({
  getCommitDate: vi.fn(() => ({ title: "24 Feb 2026 12:00", value: "24 Feb 2026 12:00" }))
}));

import { getBranchLabels } from "../../web/branchLabels";
import { getCommitDate } from "../../web/dates";

/* === Helpers === */

const ABBREV_LENGTH = 8;

function createMockCallbacks(): FindWidgetCallbacks {
  return {
    getCommits: vi.fn(() => []),
    scrollToCommit: vi.fn(),
    saveState: vi.fn(),
    loadCommitDetails: vi.fn(),
    getCommitId: vi.fn(() => null),
    isCdvOpen: vi.fn(() => false)
  };
}

function makeCommit(overrides: Partial<GG.GitCommitNode> & { hash: string }): GG.GitCommitNode {
  return {
    parentHashes: [],
    author: "Author",
    email: "author@example.com",
    date: 1708790400,
    message: "commit message",
    refs: [],
    stash: null,
    ...overrides
  };
}

function createCommitRow(id: number, texts: string[]): HTMLElement {
  const row = document.createElement("tr");
  row.className = "commit";
  row.dataset.id = id.toString();
  for (const text of texts) {
    const td = document.createElement("td");
    td.textContent = text;
    row.appendChild(td);
  }
  document.body.appendChild(row);
  return row;
}

function setupCommitsAndDom(commits: GG.GitCommitNode[], callbacks: FindWidgetCallbacks): void {
  (callbacks.getCommits as Mock).mockReturnValue(commits);
  for (let i = 0; i < commits.length; i++) {
    const c = commits[i];
    createCommitRow(i, [c.message, c.author, c.hash.substring(0, ABBREV_LENGTH)]);
  }
}

function triggerSearch(widget: FindWidget, text: string, options?: Partial<FindWidgetState>): void {
  widget.restoreState({
    text,
    currentHash: null,
    visible: true,
    caseSensitive: options?.caseSensitive ?? false,
    regex: options?.regex ?? false
  });
}

function getPositionText(): string {
  return document.getElementById("findPosition")!.textContent ?? "";
}

function getMatchSpans(): Element[] {
  return Array.from(document.getElementsByClassName(CLASS_FIND_MATCH));
}

function getHighlightedRows(): Element[] {
  return Array.from(document.getElementsByClassName(CLASS_FIND_CURRENT_COMMIT));
}

/* === Tests === */

describe("FindWidget", () => {
  let callbacks: FindWidgetCallbacks;
  let widget: FindWidget;

  beforeEach(() => {
    document.body.innerHTML = "";
    callbacks = createMockCallbacks();
    widget = new FindWidget(callbacks);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  /* --- DOM generation and visibility --- */

  describe("DOM generation and visibility", () => {
    it("generates correct DOM structure on construction (TC-001)", () => {
      // Given: FindWidget is constructed
      // When: DOM is inspected
      // Then: all required elements exist
      expect(document.querySelector(".findWidget")).not.toBeNull();
      expect(document.getElementById("findInput")).not.toBeNull();
      expect(document.getElementById("findCaseSensitive")).not.toBeNull();
      expect(document.getElementById("findRegex")).not.toBeNull();
      expect(document.getElementById("findPosition")).not.toBeNull();
      expect(document.getElementById("findPrev")).not.toBeNull();
      expect(document.getElementById("findNext")).not.toBeNull();
      expect(document.getElementById("findOpenCdv")).not.toBeNull();
      expect(document.getElementById("findClose")).not.toBeNull();
    });

    it("show() makes widget visible and focuses input (TC-002)", () => {
      // Given: widget is initially hidden
      // When: show() is called
      widget.show(false);

      // Then: widget has active class and input is focused
      const widgetElem = document.querySelector(".findWidget")!;
      expect(widgetElem.classList.contains("active")).toBe(true);
      expect(widget.isVisible()).toBe(true);
      expect(document.activeElement).toBe(document.getElementById("findInput"));
    });

    it("close() hides widget and clears highlights (TC-003)", () => {
      // Given: widget is visible with matches
      const commits = [makeCommit({ hash: "aaa1111100000000", message: "fix bug" })];
      setupCommitsAndDom(commits, callbacks);
      triggerSearch(widget, "fix");
      expect(widget.isVisible()).toBe(true);

      // When: close() is called
      widget.close();

      // Then: widget is hidden, matches are cleared, saveState is called
      const widgetElem = document.querySelector(".findWidget")!;
      expect(widgetElem.classList.contains("active")).toBe(false);
      expect(widget.isVisible()).toBe(false);
      expect(getMatchSpans()).toHaveLength(0);
      expect(callbacks.saveState).toHaveBeenCalled();
    });

    it("isVisible() returns true after show() (TC-004)", () => {
      // Given: widget is hidden
      // When: show() is called
      widget.show(false);
      // Then: isVisible() returns true
      expect(widget.isVisible()).toBe(true);
    });

    it("isVisible() returns false after close() (TC-005)", () => {
      // Given: widget is visible
      widget.show(false);
      // When: close() is called
      widget.close();
      // Then: isVisible() returns false
      expect(widget.isVisible()).toBe(false);
    });
  });

  /* --- Input control --- */

  describe("Input control", () => {
    it("setInputEnabled(false) disables input when visible (TC-006)", () => {
      // Given: widget is visible
      widget.show(false);
      // When: setInputEnabled(false)
      widget.setInputEnabled(false);
      // Then: input is disabled
      expect((document.getElementById("findInput") as HTMLInputElement).disabled).toBe(true);
    });

    it("setInputEnabled(true) enables input when visible (TC-007)", () => {
      // Given: widget is visible and input is disabled
      widget.show(false);
      widget.setInputEnabled(false);
      // When: setInputEnabled(true)
      widget.setInputEnabled(true);
      // Then: input is enabled
      expect((document.getElementById("findInput") as HTMLInputElement).disabled).toBe(false);
    });

    it("search on zero commits shows no results (TC-008)", () => {
      // Given: no commits exist
      (callbacks.getCommits as Mock).mockReturnValue([]);
      // When: search is triggered
      triggerSearch(widget, "anything");
      // Then: counter shows No Results
      expect(getPositionText()).toBe("No Results");
      expect(getMatchSpans()).toHaveLength(0);
    });
  });

  /* --- Search matching --- */

  describe("Search matching", () => {
    it("matches commit message text (TC-009)", () => {
      // Given: commit with message "fix bug" exists
      const commits = [
        makeCommit({ hash: "aaa1111100000000", message: "fix bug" }),
        makeCommit({ hash: "bbb2222200000000", message: "add feature" })
      ];
      setupCommitsAndDom(commits, callbacks);

      // When: search for "fix"
      triggerSearch(widget, "fix");

      // Then: one match found, counter shows "1 of 1"
      expect(getPositionText()).toBe("1 of 1");
    });

    it("matches author name (TC-010)", () => {
      // Given: commit with author "Alice" exists
      const commits = [
        makeCommit({ hash: "aaa1111100000000", author: "Alice", message: "some change" }),
        makeCommit({ hash: "bbb2222200000000", author: "Bob", message: "other change" })
      ];
      setupCommitsAndDom(commits, callbacks);

      // When: search for "Alice"
      triggerSearch(widget, "Alice");

      // Then: one match found
      expect(getPositionText()).toBe("1 of 1");
    });

    it("matches abbreviated commit hash (TC-011)", () => {
      // Given: commit with hash starting with "abc12345"
      const commits = [
        makeCommit({ hash: "abc1234567890abc", message: "change" }),
        makeCommit({ hash: "def4567890123def", message: "other" })
      ];
      setupCommitsAndDom(commits, callbacks);

      // When: search for "abc12345"
      triggerSearch(widget, "abc12345");

      // Then: one match found
      expect(getPositionText()).toBe("1 of 1");
    });

    it("matches branch and tag names (TC-012)", () => {
      // Given: commit with branch ref "main"
      const commits = [
        makeCommit({
          hash: "aaa1111100000000",
          message: "change",
          refs: [{ hash: "aaa1111100000000", name: "main", type: "head" }]
        }),
        makeCommit({ hash: "bbb2222200000000", message: "other" })
      ];
      setupCommitsAndDom(commits, callbacks);
      (getBranchLabels as Mock).mockImplementation((refs: GG.GitRef[]) => ({
        heads: refs.filter((r) => r.type === "head").map((r) => ({ name: r.name, remotes: [] })),
        remotes: refs.filter((r) => r.type === "remote"),
        tags: refs.filter((r) => r.type === "tag")
      }));

      // When: search for "main"
      triggerSearch(widget, "main");

      // Then: one match found
      expect(getPositionText()).toBe("1 of 1");
    });

    it("shows correct match count for multiple matches (TC-013)", () => {
      // Given: 3 commits matching "fix"
      const commits = [
        makeCommit({ hash: "aaa1111100000000", message: "fix bug A" }),
        makeCommit({ hash: "bbb2222200000000", message: "fix bug B" }),
        makeCommit({ hash: "ccc3333300000000", message: "fix bug C" })
      ];
      setupCommitsAndDom(commits, callbacks);

      // When: search for "fix"
      triggerSearch(widget, "fix");

      // Then: counter shows "1 of 3" (initial position is 1)
      expect(getPositionText()).toBe("1 of 3");
    });

    it("shows No Results for zero matches (TC-014)", () => {
      // Given: commits exist but none match
      const commits = [makeCommit({ hash: "aaa1111100000000", message: "add feature" })];
      setupCommitsAndDom(commits, callbacks);

      // When: search for "nonexistent"
      triggerSearch(widget, "nonexistent");

      // Then: counter shows "No Results"
      expect(getPositionText()).toBe("No Results");
      expect(getHighlightedRows()).toHaveLength(0);
    });

    it("shows 1 of 1 for single match (TC-015)", () => {
      // Given: exactly one matching commit
      const commits = [
        makeCommit({ hash: "aaa1111100000000", message: "unique text" }),
        makeCommit({ hash: "bbb2222200000000", message: "other" })
      ];
      setupCommitsAndDom(commits, callbacks);

      // When: search for "unique"
      triggerSearch(widget, "unique");

      // Then: counter shows "1 of 1"
      expect(getPositionText()).toBe("1 of 1");
    });

    it("clears highlights when search text is emptied (TC-016)", () => {
      vi.useFakeTimers();
      try {
        // Given: search active with matches
        const commits = [makeCommit({ hash: "aaa1111100000000", message: "fix bug" })];
        setupCommitsAndDom(commits, callbacks);
        triggerSearch(widget, "fix");
        expect(getPositionText()).toBe("1 of 1");

        // When: user clears the input text
        const inputElem = document.getElementById("findInput") as HTMLInputElement;
        inputElem.value = "";
        inputElem.dispatchEvent(new KeyboardEvent("keyup", { key: "Backspace" }));
        vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);

        // Then: all highlights removed, counter shows No Results
        expect(getMatchSpans()).toHaveLength(0);
        expect(getPositionText()).toBe("No Results");
      } finally {
        vi.useRealTimers();
      }
    });
  });

  /* --- Search options --- */

  describe("Search options", () => {
    it("case insensitive by default (TC-017)", () => {
      // Given: commit with message "Fix bug"
      const commits = [makeCommit({ hash: "aaa1111100000000", message: "Fix bug" })];
      setupCommitsAndDom(commits, callbacks);

      // When: search for "fix" (lowercase) with caseSensitive OFF
      triggerSearch(widget, "fix", { caseSensitive: false });

      // Then: matches "Fix" (case insensitive)
      expect(getPositionText()).toBe("1 of 1");
    });

    it("case sensitive when enabled (TC-018)", () => {
      // Given: commits with "Fix" and "fix"
      const commits = [
        makeCommit({ hash: "aaa1111100000000", message: "Fix bug" }),
        makeCommit({ hash: "bbb2222200000000", message: "fix issue" })
      ];
      setupCommitsAndDom(commits, callbacks);

      // When: search for "Fix" with caseSensitive ON
      triggerSearch(widget, "Fix", { caseSensitive: true });

      // Then: only "Fix" matches, not "fix"
      expect(getPositionText()).toBe("1 of 1");
    });

    it("regex mode matches patterns (TC-019)", () => {
      // Given: commits with "fix" and "feat" messages
      const commits = [
        makeCommit({ hash: "aaa1111100000000", message: "fix bug" }),
        makeCommit({ hash: "bbb2222200000000", message: "feat: new" }),
        makeCommit({ hash: "ccc3333300000000", message: "docs update" })
      ];
      setupCommitsAndDom(commits, callbacks);

      // When: search for "fix|feat" in regex mode
      triggerSearch(widget, "fix|feat", { regex: true });

      // Then: two matches found
      expect(getPositionText()).toBe("1 of 2");
    });

    it("invalid regex sets error attribute (TC-020)", () => {
      // Given: commits exist
      const commits = [makeCommit({ hash: "aaa1111100000000", message: "test" })];
      setupCommitsAndDom(commits, callbacks);

      // When: search with invalid regex "[invalid"
      triggerSearch(widget, "[invalid", { regex: true });

      // Then: widget has data-error attribute, no matches
      const widgetElem = document.querySelector(".findWidget")!;
      expect(widgetElem.hasAttribute("data-error")).toBe(true);
      expect(getPositionText()).toBe("No Results");
    });

    it("zero-length match sets error and clears matches (TC-021)", () => {
      // Given: commits exist
      const commits = [makeCommit({ hash: "aaa1111100000000", message: "test data" })];
      setupCommitsAndDom(commits, callbacks);

      // When: search with zero-length pattern "(?:)" in regex mode
      triggerSearch(widget, "(?:)", { regex: true });

      // Then: error attribute set, matches cleared
      const widgetElem = document.querySelector(".findWidget")!;
      expect(widgetElem.hasAttribute("data-error")).toBe(true);
      expect(getPositionText()).toBe("No Results");
    });

    it("potential ReDoS pattern does not crash (TC-022)", () => {
      // Given: commits exist
      const commits = [makeCommit({ hash: "aaa1111100000000", message: "aaaaaa" })];
      setupCommitsAndDom(commits, callbacks);

      // When: search with potential ReDoS pattern "(a+)+"
      // Then: no crash, search completes safely
      expect(() => {
        triggerSearch(widget, "(a+)+", { regex: true });
      }).not.toThrow();
    });
  });

  /* --- Navigation --- */

  describe("Navigation", () => {
    function setupThreeMatches(): void {
      const commits = [
        makeCommit({ hash: "aaa1111100000000", message: "fix A" }),
        makeCommit({ hash: "bbb2222200000000", message: "fix B" }),
        makeCommit({ hash: "ccc3333300000000", message: "fix C" })
      ];
      setupCommitsAndDom(commits, callbacks);
      triggerSearch(widget, "fix");
    }

    it("next() advances position (TC-023)", () => {
      // Given: 3 matches, position at 1
      setupThreeMatches();
      expect(getPositionText()).toBe("1 of 3");

      // When: click next button
      document.getElementById("findNext")!.click();

      // Then: position is 2
      expect(getPositionText()).toBe("2 of 3");
    });

    it("prev() wraps to last position (TC-024)", () => {
      // Given: 3 matches, position at 1
      setupThreeMatches();
      expect(getPositionText()).toBe("1 of 3");

      // When: click prev button
      document.getElementById("findPrev")!.click();

      // Then: position wraps to 3 (last)
      expect(getPositionText()).toBe("3 of 3");
    });

    it("next() wraps from last to first (TC-025)", () => {
      // Given: 3 matches, position at 3
      setupThreeMatches();
      document.getElementById("findPrev")!.click(); // go to 3
      expect(getPositionText()).toBe("3 of 3");

      // When: click next
      document.getElementById("findNext")!.click();

      // Then: wraps to 1
      expect(getPositionText()).toBe("1 of 3");
    });

    it("next() with zero matches does nothing (TC-026)", () => {
      // Given: no matches
      const commits = [makeCommit({ hash: "aaa1111100000000", message: "other" })];
      setupCommitsAndDom(commits, callbacks);
      triggerSearch(widget, "nonexistent");
      expect(getPositionText()).toBe("No Results");

      // When: click next
      document.getElementById("findNext")!.click();

      // Then: still No Results, no error
      expect(getPositionText()).toBe("No Results");
    });

    it("navigation triggers scrollToCommit (TC-027)", () => {
      // Given: matches exist
      setupThreeMatches();
      (callbacks.scrollToCommit as Mock).mockClear();

      // When: click next
      document.getElementById("findNext")!.click();

      // Then: scrollToCommit is called
      expect(callbacks.scrollToCommit).toHaveBeenCalledTimes(1);
      expect(callbacks.scrollToCommit).toHaveBeenCalledWith("bbb2222200000000", false);
    });
  });

  /* --- State persistence --- */

  describe("State persistence", () => {
    it("getState() returns current FindWidgetState (TC-028)", () => {
      // Given: widget is visible with specific settings
      widget.restoreState({
        text: "search term",
        currentHash: null,
        visible: true,
        caseSensitive: true,
        regex: false
      });

      // When: getState() is called
      const state = widget.getState();

      // Then: state contains all fields
      expect(state.text).toBe("search term");
      expect(state.visible).toBe(true);
      expect(state.caseSensitive).toBe(true);
      expect(state.regex).toBe(false);
    });

    it("restoreState() restores saved state correctly (TC-029)", () => {
      // Given: a saved state
      const savedState: FindWidgetState = {
        text: "restored",
        currentHash: null,
        visible: true,
        caseSensitive: true,
        regex: true
      };

      // When: restoreState() is called
      widget.restoreState(savedState);

      // Then: state is restored
      const state = widget.getState();
      expect(state.text).toBe("restored");
      expect(state.visible).toBe(true);
      expect(state.caseSensitive).toBe(true);
      expect(state.regex).toBe(true);
      expect(widget.isVisible()).toBe(true);
    });

    it("restoreState with non-visible state does not activate widget (TC-030)", () => {
      // Given: state with visible: false
      const state: FindWidgetState = {
        text: "test",
        currentHash: null,
        visible: false,
        caseSensitive: false,
        regex: false
      };

      // When: restoreState() is called
      widget.restoreState(state);

      // Then: widget remains hidden, no error
      expect(widget.isVisible()).toBe(false);
    });
  });

  /* --- Debounce --- */

  describe("Debounce", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("search executes after SEARCH_DEBOUNCE_MS delay (TC-031)", () => {
      // Given: widget is visible with commits
      const commits = [makeCommit({ hash: "aaa1111100000000", message: "fix bug" })];
      setupCommitsAndDom(commits, callbacks);
      widget.show(false);

      const inputElem = document.getElementById("findInput") as HTMLInputElement;
      inputElem.value = "fix";

      // When: keyup event is dispatched
      inputElem.dispatchEvent(new KeyboardEvent("keyup", { key: "f" }));

      // Then: search not executed immediately
      expect(getPositionText()).toBe("No Results");

      // When: SEARCH_DEBOUNCE_MS elapses
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);

      // Then: search is executed
      expect(getPositionText()).toBe("1 of 1");
    });

    it("rapid input resets debounce timer (TC-032)", () => {
      // Given: widget is visible with commits
      const commits = [
        makeCommit({ hash: "aaa1111100000000", message: "fix bug" }),
        makeCommit({ hash: "bbb2222200000000", message: "add feature" })
      ];
      setupCommitsAndDom(commits, callbacks);
      widget.show(false);

      const inputElem = document.getElementById("findInput") as HTMLInputElement;

      // When: first input "fi" then after 100ms change to "add"
      inputElem.value = "fi";
      inputElem.dispatchEvent(new KeyboardEvent("keyup", { key: "i" }));
      vi.advanceTimersByTime(100);

      inputElem.value = "add";
      inputElem.dispatchEvent(new KeyboardEvent("keyup", { key: "d" }));

      // Then: after another 100ms (200ms total), first search is not executed
      vi.advanceTimersByTime(100);
      expect(getPositionText()).toBe("No Results");

      // When: full SEARCH_DEBOUNCE_MS after second input
      vi.advanceTimersByTime(100);

      // Then: search executes with "add", not "fi"
      expect(getPositionText()).toBe("1 of 1");
    });
  });

  /* --- S8: stash セレクタ検索の表示文字列照合 --- */
  // @see docs/testing/perspectives/web/findWidget-test.md

  describe("stash selector display matching (S8)", () => {
    const STASH_HASH = "ccc3333300000000";
    const STASH_SELECTOR = "stash@{0}";
    const STASH_DISPLAY_SELECTOR = "@{0}";

    function setupStashCommitAndDom(): void {
      const stashCommit = makeCommit({
        hash: STASH_HASH,
        message: "work in progress",
        stash: { selector: STASH_SELECTOR } as unknown as GG.GitCommitNode["stash"]
      });
      (callbacks.getCommits as Mock).mockReturnValue([stashCommit]);
      createCommitRow(0, [
        STASH_DISPLAY_SELECTOR,
        stashCommit.message,
        stashCommit.author,
        STASH_HASH.substring(0, ABBREV_LENGTH)
      ]);
    }

    it("does not match the hidden stash prefix (TC-033)", () => {
      // Case: TC-033
      // Given: a stash row displayed with the short selector @{0} and no "stash" text elsewhere
      setupStashCommitAndDom();

      // When: searching for "stash"
      triggerSearch(widget, "stash");

      // Then: the stash row is not a match and no findMatch span is inserted
      expect(getPositionText()).toBe("No Results");
      expect(getMatchSpans()).toHaveLength(0);
    });

    it("matches and highlights the displayed short selector (TC-034)", () => {
      // Case: TC-034
      // Given: the same stash row
      setupStashCommitAndDom();

      // When: searching for the displayed selector "@{0}"
      triggerSearch(widget, STASH_DISPLAY_SELECTOR);

      // Then: the row matches with an in-row highlight span containing the selector text
      expect(getPositionText()).toBe("1 of 1");
      const matchSpans = getMatchSpans();
      expect(matchSpans).toHaveLength(1);
      expect(matchSpans[0].textContent).toBe(STASH_DISPLAY_SELECTOR);
      const highlightedBefore = getHighlightedRows();
      expect(highlightedBefore).toHaveLength(1);

      // When: navigating with next and prev
      (document.getElementById("findNext") as HTMLElement).click();
      (document.getElementById("findPrev") as HTMLElement).click();

      // Then: the same row stays the current match
      const highlightedAfter = getHighlightedRows();
      expect(highlightedAfter).toHaveLength(1);
      expect(highlightedAfter[0]).toBe(highlightedBefore[0]);
      expect(getPositionText()).toBe("1 of 1");
    });

    it("does not match the full stash selector (TC-035)", () => {
      // Case: TC-035
      // Given: the same stash row
      setupStashCommitAndDom();

      // When: searching for the full selector "stash@{0}"
      triggerSearch(widget, STASH_SELECTOR);

      // Then: nothing matches and no findMatch span is inserted
      expect(getPositionText()).toBe("No Results");
      expect(getMatchSpans()).toHaveLength(0);
    });
  });

  /* --- S9: openCdvEnabled の状態保存・復元 --- */
  // @see docs/testing/perspectives/web/findWidget-test.md

  describe("openCdvEnabled state save and restore (S9)", () => {
    const CLASS_ACTIVE = "active";

    function getOpenCdvElem(): HTMLElement {
      return document.getElementById("findOpenCdv") as HTMLElement;
    }

    function createState(overrides: Partial<FindWidgetState>): FindWidgetState {
      return {
        text: "",
        currentHash: null,
        visible: false,
        caseSensitive: false,
        regex: false,
        ...overrides
      };
    }

    it("saves openCdvEnabled as a boolean independent of visibility (TC-036)", () => {
      // Case: TC-036
      // Given: the open-CDV toggle is switched on while the widget stays hidden
      getOpenCdvElem().click();

      // When: getState is called
      const state = widget.getState();

      // Then: openCdvEnabled is the boolean true even though the widget is not visible
      expect(state.openCdvEnabled).toBe(true);
      expect(state.visible).toBe(false);
    });

    it("restores the value and active class before the hidden early return (TC-037)", () => {
      // Case: TC-037
      // Given: a saved state that is hidden but has openCdvEnabled true
      const state = createState({ visible: false, openCdvEnabled: true });

      // When: restoreState is called
      widget.restoreState(state);

      // Then: the internal value and #findOpenCdv active class are restored while staying hidden
      expect(widget.getState().openCdvEnabled).toBe(true);
      expect(getOpenCdvElem().classList.contains(CLASS_ACTIVE)).toBe(true);
      expect(widget.isVisible()).toBe(false);
    });

    it("restores the value, class, and visibility for a visible state (TC-038)", () => {
      // Case: TC-038
      // Given: a saved state that is visible with openCdvEnabled true
      const state = createState({ visible: true, openCdvEnabled: true });

      // When: restoreState is called
      widget.restoreState(state);

      // Then: the internal value, active class, and widget visibility are all restored
      expect(widget.getState().openCdvEnabled).toBe(true);
      expect(getOpenCdvElem().classList.contains(CLASS_ACTIVE)).toBe(true);
      expect(widget.isVisible()).toBe(true);
    });

    it("treats a legacy state without the field as false (TC-039)", () => {
      // Case: TC-039
      // Given: a legacy saved state that has no openCdvEnabled field
      const legacyState = createState({ visible: true });
      delete (legacyState as { openCdvEnabled?: boolean }).openCdvEnabled;

      // When: restoreState is called
      widget.restoreState(legacyState);

      // Then: the internal value falls back to false and no active class is applied
      expect(widget.getState().openCdvEnabled).toBe(false);
      expect(getOpenCdvElem().classList.contains(CLASS_ACTIVE)).toBe(false);
    });
  });
});

/* --- S10: ref overflow exclusion and highlight notification --- */

// @see docs/testing/perspectives/web/findWidget-test.md
describe("FindWidget ref overflow exclusion and highlight notification (S10)", () => {
  const HASH = "aaa1111100000000";
  const DEFAULT_DATE = { title: "24 Feb 2026 12:00", value: "24 Feb 2026 12:00" };
  let callbacks: FindWidgetCallbacks;
  let onHighlightsChanged: Mock<() => void>;
  let marksAtNotification: number[];
  let widget: FindWidget;

  function labelsFromRefs(refs: GG.GitRef[]) {
    return {
      heads: refs.filter((r) => r.type === "head").map((r) => ({ name: r.name, remotes: [] })),
      remotes: refs.filter((r) => r.type === "remote"),
      tags: refs.filter((r) => r.type === "tag")
    };
  }

  // One commit row whose description cell holds the given markup (mirrors web/main.ts).
  function setupRow(commit: GG.GitCommitNode, descriptionHtml: string): HTMLElement {
    (callbacks.getCommits as Mock).mockReturnValue([commit]);
    const row = document.createElement("tr");
    row.className = "commit";
    row.dataset.id = "0";
    row.innerHTML = `<td></td><td>${descriptionHtml}</td><td>${commit.author}</td><td>${commit.hash.substring(0, ABBREV_LENGTH)}</td>`;
    document.body.appendChild(row);
    return row;
  }

  function hiddenRef(name: string): string {
    return `<span class="gitRef head refOverflowHidden" data-name="${name}"><span class="gitRefName">${name}</span></span>`;
  }

  const COUNTER_HTML =
    '<button type="button" class="refOverflowCounter" data-ref-overflow-ignore="">+4</button>';

  function typeSearch(text: string): void {
    const input = document.getElementById("findInput") as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new KeyboardEvent("keyup", { key: "x" }));
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
  }

  function marksIn(root: ParentNode): number {
    return root.querySelectorAll(`.${CLASS_FIND_MATCH}`).length;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
    marksAtNotification = [];
    onHighlightsChanged = vi.fn(() => {
      marksAtNotification.push(marksIn(document));
    });
    callbacks = { ...createMockCallbacks(), onHighlightsChanged };
    widget = new FindWidget(callbacks);
    (getBranchLabels as Mock).mockImplementation(labelsFromRefs);
  });

  afterEach(() => {
    vi.useRealTimers();
    (getBranchLabels as Mock).mockImplementation(() => ({ heads: [], remotes: [], tags: [] }));
    vi.mocked(getCommitDate).mockImplementation(() => DEFAULT_DATE);
    document.body.innerHTML = "";
  });

  it("searches a hidden original ref (TC-040)", () => {
    // Case: TC-040 (AC-08)
    // Given: a row whose only match is a hidden ref
    const commit = makeCommit({
      hash: HASH,
      message: "plain",
      refs: [{ hash: HASH, name: "feature/hidden-only", type: "head" }]
    });
    const row = setupRow(commit, `${hiddenRef("feature/hidden-only")}${COUNTER_HTML}plain`);

    // When: the hidden branch name is searched
    triggerSearch(widget, "hidden-only");

    // Then: one commit and a mark inside the hidden ref
    expect(getPositionText()).toBe("1 of 1");
    const marks = row.querySelectorAll(`.refOverflowHidden .${CLASS_FIND_MATCH}`);
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe("hidden-only");
  });

  it("never searches the counter text (TC-041)", () => {
    // Case: TC-041 (AC-10)
    // Given: a +4 counter and no "4" in any searched field
    vi.mocked(getCommitDate).mockImplementation(() => ({
      title: "01 Jan 2026 12:00",
      value: "01 Jan 2026 12:00"
    }));
    const commit = makeCommit({ hash: HASH, message: "plain" });
    const row = setupRow(commit, `${COUNTER_HTML}plain`);

    // When: "4" is searched
    triggerSearch(widget, "4");

    // Then: no result and the counter button is untouched
    expect(getPositionText()).toBe("No Results");
    const counter = row.querySelector(".refOverflowCounter")!;
    expect(counter.tagName).toBe("BUTTON");
    expect(marksIn(counter)).toBe(0);
  });

  it("marks only outside the ignored subtrees (TC-042)", () => {
    // Case: TC-042 (AC-10)
    // Given: an ignored clone and counter holding the search word, and a matching message
    const commit = makeCommit({ hash: HASH, message: "fix typo" });
    const row = setupRow(
      commit,
      `${COUNTER_HTML}<span data-ref-overflow-ignore=""><span class="gitRef">fix-clone</span></span><span class="commitMessage">fix typo</span>`
    );

    // When: "fix" is searched
    triggerSearch(widget, "fix");

    // Then: one commit, the message is marked and the ignored subtrees are not
    expect(getPositionText()).toBe("1 of 1");
    expect(marksIn(row.querySelector(".commitMessage")!)).toBe(1);
    const ignored = Array.from(row.querySelectorAll("[data-ref-overflow-ignore]"));
    expect(ignored.map((elem) => marksIn(elem))).toEqual([0, 0]);
  });

  it("clears hidden-ref marks and leaves ignored subtrees as they were (TC-043)", () => {
    // Case: TC-043
    // Given: the TC-040 search, plus an ignored clone that already carries a copied mark
    const commit = makeCommit({
      hash: HASH,
      message: "plain",
      refs: [{ hash: HASH, name: "feature/hidden-only", type: "head" }]
    });
    const row = setupRow(
      commit,
      `${hiddenRef("feature/hidden-only")}${COUNTER_HTML}<span data-ref-overflow-ignore=""><span class="findMatch">hidden-only</span></span>plain`
    );
    const ignoredBefore = Array.from(row.querySelectorAll("[data-ref-overflow-ignore]")).map(
      (elem) => elem.innerHTML
    );
    widget.show(false);
    typeSearch("hidden-only");
    expect(marksIn(row.querySelector(".refOverflowHidden")!)).toBe(1);

    // When: the search text is emptied
    typeSearch("");

    // Then: the hidden ref is back to plain text; ignored subtrees are byte-identical
    const hidden = row.querySelector(".refOverflowHidden .gitRefName")!;
    expect(marksIn(hidden)).toBe(0);
    expect(hidden.innerHTML).toBe("feature/hidden-only");
    expect(
      Array.from(row.querySelectorAll("[data-ref-overflow-ignore]")).map((elem) => elem.innerHTML)
    ).toEqual(ignoredBefore);
    expect(row.querySelector(".refOverflowCounter")!.tagName).toBe("BUTTON");
  });

  it("notifies once per search after the marks are inserted (TC-044)", () => {
    // Case: TC-044 (AC-08)
    // Given: a hidden-ref match
    const commit = makeCommit({
      hash: HASH,
      message: "plain",
      refs: [{ hash: HASH, name: "feature/hidden-only", type: "head" }]
    });
    setupRow(commit, `${hiddenRef("feature/hidden-only")}plain`);

    // When: one search runs
    triggerSearch(widget, "hidden-only");

    // Then: one notification that already sees the mark
    expect(onHighlightsChanged).toHaveBeenCalledTimes(1);
    expect(marksAtNotification).toEqual([1]);
  });

  it.each([
    { operation: "empty text", run: () => typeSearch("") },
    { operation: "close()", run: () => widget.close() },
    {
      operation: "invalid regex [invalid",
      run: () => {
        (document.getElementById("findRegex") as HTMLElement).click();
        typeSearch("[invalid");
      }
    },
    {
      operation: "zero-length regex (?:)",
      run: () => {
        (document.getElementById("findRegex") as HTMLElement).click();
        typeSearch("(?:)");
      }
    }
  ])("notifies after clearing the marks on $operation (TC-045)", (entry) => {
    // Case: TC-045 (AC-09)
    // Given: an active hidden-ref match
    const commit = makeCommit({
      hash: HASH,
      message: "plain",
      refs: [{ hash: HASH, name: "feature/hidden-only", type: "head" }]
    });
    setupRow(commit, `${hiddenRef("feature/hidden-only")}plain`);
    widget.show(false);
    typeSearch("hidden-only");
    expect(marksIn(document)).toBe(1);
    onHighlightsChanged.mockClear();
    marksAtNotification = [];

    // When: the marks are removed by the operation
    entry.run();

    // Then: at least one notification, the last one seeing no mark
    expect(onHighlightsChanged).toHaveBeenCalled();
    expect(marksAtNotification.at(-1)).toBe(0);
    expect(marksIn(document)).toBe(0);
  });

  it("works without the optional callback (TC-046)", () => {
    // Case: TC-046
    // Given: callbacks without onHighlightsChanged
    const plainCallbacks = createMockCallbacks();
    document.body.innerHTML = "";
    const plainWidget = new FindWidget(plainCallbacks);
    (plainCallbacks.getCommits as Mock).mockReturnValue([
      makeCommit({ hash: HASH, message: "fix bug" })
    ]);
    createCommitRow(0, ["fix bug"]);
    plainWidget.show(false);

    // When: a search and its clearing run
    const input = document.getElementById("findInput") as HTMLInputElement;
    input.value = "fix";
    input.dispatchEvent(new KeyboardEvent("keyup", { key: "x" }));
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    const found = getPositionText();
    input.value = "";
    input.dispatchEvent(new KeyboardEvent("keyup", { key: "x" }));
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);

    // Then: both complete as before
    expect(found).toBe("1 of 1");
    expect(getPositionText()).toBe("No Results");
  });

  it("does not search again because of the notification (TC-047)", () => {
    // Case: TC-047
    // Given: a visible widget and a matching commit
    setupRow(makeCommit({ hash: HASH, message: "fix bug" }), "fix bug");
    widget.show(false);
    (callbacks.getCommits as Mock).mockClear();

    // When: one input is typed
    typeSearch("fix");

    // Then: one search and one notification
    expect(callbacks.getCommits).toHaveBeenCalledTimes(1);
    expect(onHighlightsChanged).toHaveBeenCalledTimes(1);
  });

  it("does not search a detached worktree label (TC-048)", () => {
    // Case: TC-048
    // Given: a detached worktree label /tmp/wt8 and no "wt8" in the searched fields
    setupRow(
      makeCommit({ hash: HASH, message: "plain" }),
      '<span class="gitRef worktree detachedWorktree" data-worktree-path="/tmp/wt8">wt8</span>plain'
    );

    // When: "wt8" is searched
    triggerSearch(widget, "wt8");

    // Then: no result
    expect(getPositionText()).toBe("No Results");
  });

  it.each([
    { options: { caseSensitive: true }, text: "feature/hidden", expected: "No Results" },
    { options: { regex: true }, text: "Feature/Hid.*", expected: "1 of 1" }
  ])("keeps the search options for hidden refs ($text) (TC-049)", (entry) => {
    // Case: TC-049 (AC-10)
    // Given: a hidden ref Feature/Hidden
    setupRow(
      makeCommit({
        hash: HASH,
        message: "plain",
        refs: [{ hash: HASH, name: "Feature/Hidden", type: "head" }]
      }),
      `${hiddenRef("Feature/Hidden")}plain`
    );

    // When: the search runs with the option
    triggerSearch(widget, entry.text, entry.options);

    // Then: the existing option semantics decide the result
    expect(getPositionText()).toBe(entry.expected);
  });
});

// S11: standard buttons, pressed / disabled state, Enter / Shift+Enter IME guard, span and focus
// @see docs/testing/perspectives/web/findWidget-test.md
describe("FindWidget standard controls, IME guard and focus survival (S11)", () => {
  const HASHES = ["aaa1111100000000", "bbb2222200000000", "ccc3333300000000"];
  const REF_NAME = "feature/keyboard";
  let callbacks: FindWidgetCallbacks;
  let widget: FindWidget;
  let disposeContext: () => void;

  function input(): HTMLInputElement {
    return document.getElementById("findInput") as HTMLInputElement;
  }

  function button(id: string): HTMLButtonElement {
    return document.getElementById(id) as HTMLButtonElement;
  }

  function key(type: string, init: KeyboardEventInit): KeyboardEvent {
    const event = new KeyboardEvent(type, { bubbles: true, cancelable: true, ...init });
    input().dispatchEvent(event);
    return event;
  }

  function threeMatches(): void {
    setupCommitsAndDom(
      HASHES.map((hash) => makeCommit({ hash, message: "fix bug" })),
      callbacks
    );
    triggerSearch(widget, "fix");
    expect(getPositionText()).toBe("1 of 3");
  }

  /** A commit row whose description holds a marked ref button, as web/main.ts renders it. */
  function rowWithRefButton(): HTMLButtonElement {
    const commit = makeCommit({
      hash: HASHES[0],
      message: "plain",
      refs: [{ hash: HASHES[0], name: REF_NAME, type: "head" }]
    });
    (callbacks.getCommits as Mock).mockReturnValue([commit]);
    (getBranchLabels as Mock).mockReturnValue({
      heads: [{ name: REF_NAME, remotes: [] }],
      remotes: [],
      tags: []
    });
    const row = document.createElement("tr");
    row.className = "commit";
    row.dataset.id = "0";
    row.innerHTML = `<td></td><td><span class="gitRef head" data-name="${REF_NAME}"><button type="button" class="gitRefButton" tabindex="0" aria-label="Branch ${REF_NAME}" data-name="${REF_NAME}"><span class="codicon codicon-git-branch"></span><span class="gitRefName">${REF_NAME}</span></button></span><span class="commitMessage">plain</span></td><td>Author</td><td>${HASHES[0].substring(0, ABBREV_LENGTH)}</td>`;
    document.body.appendChild(row);
    const refButton = row.querySelector<HTMLButtonElement>("button.gitRefButton")!;
    markFocusTarget(refButton, {
      kind: "ref",
      repo: "/repo",
      hash: HASHES[0],
      refType: "head",
      name: REF_NAME
    });
    return refButton;
  }

  beforeEach(() => {
    document.body.innerHTML = "";
    callbacks = createMockCallbacks();
    widget = new FindWidget(callbacks);
    disposeContext = configureFocusContext({
      getRepo: () => "/repo",
      getActiveRow: () => null,
      getTabStops: () => []
    });
  });

  afterEach(() => {
    disposeContext();
    (getBranchLabels as Mock).mockImplementation(() => ({ heads: [], remotes: [], tags: [] }));
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("renders every control as a named standard button and names the input (TC-493)", () => {
    // Case: TC-493 (K40 / A8.1-6)
    const expectedNames: Record<string, string> = {
      findCaseSensitive: "Match Case",
      findRegex: "Use Regular Expression",
      findPrev: "Previous match (Shift+Enter)",
      findNext: "Next match (Enter)",
      findOpenCdv: "Open the Commit Details View for the current match",
      findClose: "Close (Escape)"
    };
    for (const [id, name] of Object.entries(expectedNames)) {
      const control = button(id);
      expect(control.tagName).toBe("BUTTON");
      expect(control.getAttribute("type")).toBe("button");
      expect(control.getAttribute("aria-label")).toBe(name);
      expect(control.getAttribute("title")).toBe(name);
    }
    expect(input().getAttribute("aria-label")).toBe("Find");
  });

  it("keeps aria-pressed in sync with the toggle state and the search (TC-494)", () => {
    // Case: TC-494 (K40)
    setupCommitsAndDom(
      [
        makeCommit({ hash: HASHES[0], message: "Fix bug" }),
        makeCommit({ hash: HASHES[1], message: "fix bug" })
      ],
      callbacks
    );
    triggerSearch(widget, "Fix");
    expect(getPositionText()).toBe("1 of 2");
    for (const id of ["findCaseSensitive", "findRegex", "findOpenCdv"]) {
      expect(button(id).getAttribute("aria-pressed")).toBe("false");
      expect(button(id).classList.contains("active")).toBe(false);
    }

    button("findCaseSensitive").click();
    expect(button("findCaseSensitive").getAttribute("aria-pressed")).toBe("true");
    expect(button("findCaseSensitive").classList.contains("active")).toBe(true);
    expect(getPositionText()).toBe("1 of 1");

    button("findRegex").click();
    expect(button("findRegex").getAttribute("aria-pressed")).toBe("true");
    expect(widget.getState().regex).toBe(true);

    button("findOpenCdv").click();
    expect(button("findOpenCdv").getAttribute("aria-pressed")).toBe("true");
    expect(widget.getState().openCdvEnabled).toBe(true);

    button("findCaseSensitive").click();
    expect(button("findCaseSensitive").getAttribute("aria-pressed")).toBe("false");
    expect(getPositionText()).toBe("1 of 2");
  });

  it("disables previous / next without results or with a disabled input (TC-495)", () => {
    // Case: TC-495 (K40 / A8.3-1)
    widget.show(false);
    expect(button("findPrev").disabled).toBe(true);
    expect(button("findNext").disabled).toBe(true);
    button("findNext").click();
    key("keydown", { key: "Enter" });
    expect(callbacks.scrollToCommit).not.toHaveBeenCalled();

    threeMatches();
    expect(button("findPrev").disabled).toBe(false);
    expect(button("findNext").disabled).toBe(false);

    widget.setInputEnabled(false);
    expect(button("findPrev").disabled).toBe(true);
    expect(button("findNext").disabled).toBe(true);
    widget.setInputEnabled(true);
    expect(button("findNext").disabled).toBe(false);
  });

  it("moves once per Enter keydown: next, and previous with Shift (TC-496)", () => {
    // Case: TC-496 (K40 / A8.3-2)
    threeMatches();
    key("keydown", { key: "Enter" });
    key("keyup", { key: "Enter" });
    expect(getPositionText()).toBe("2 of 3");
    expect(callbacks.scrollToCommit).toHaveBeenCalledTimes(1);

    triggerSearch(widget, "fix");
    expect(getPositionText()).toBe("1 of 3");
    (callbacks.scrollToCommit as Mock).mockClear();
    key("keydown", { key: "Enter", shiftKey: true });
    key("keyup", { key: "Enter", shiftKey: true });
    expect(getPositionText()).toBe("3 of 3");
    expect(callbacks.scrollToCommit).toHaveBeenCalledTimes(1);
  });

  it("ignores the Enter of an IME commit and its keyup, then searches the committed text (TC-497)", () => {
    // Case: TC-497 (K40 / A8.3-2)
    vi.useFakeTimers();
    try {
      threeMatches();
      (callbacks.getCommits as Mock).mockClear();
      input().dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
      key("keydown", { key: "Enter", isComposing: true });
      input().value = "fix bug";
      input().dispatchEvent(new CompositionEvent("compositionend", { bubbles: true }));
      key("keyup", { key: "Enter" });

      expect(getPositionText()).toBe("1 of 3");
      expect(callbacks.scrollToCommit).not.toHaveBeenCalled();
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
      expect(callbacks.getCommits).toHaveBeenCalledTimes(1);
      expect(widget.getState().text).toBe("fix bug");
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not move on Enter repeat (TC-498)", () => {
    // Case: TC-498 (A8.3-2)
    threeMatches();
    for (let i = 0; i < 3; i++) key("keydown", { key: "Enter", repeat: true });
    expect(getPositionText()).toBe("1 of 3");
    expect(callbacks.scrollToCommit).not.toHaveBeenCalled();
  });

  it("returns focus to the launcher on close and hides its buttons from the tab order (TC-499)", () => {
    // Case: TC-499 (K40 / A8.1-6)
    const refButton = rowWithRefButton();
    const widgetElem = document.querySelector(".findWidget")!;
    for (const control of Array.from(widgetElem.querySelectorAll("button"))) {
      expect(control.getAttribute("tabindex")).toBe("-1");
    }
    expect(widgetElem.getAttribute("aria-hidden")).toBe("true");

    refButton.focus();
    widget.show(true);
    expect(document.activeElement).toBe(input());
    for (const control of Array.from(widgetElem.querySelectorAll("button"))) {
      expect(control.getAttribute("tabindex")).toBe("0");
    }
    expect(widgetElem.hasAttribute("aria-hidden")).toBe(false);

    button("findClose").click();
    expect(widget.isVisible()).toBe(false);
    expect(document.activeElement).toBe(refButton);

    // Programmatic close leaves focus alone; the Escape chain's close restores like the button.
    widget.show(false);
    input().blur();
    widget.close();
    expect(document.activeElement).toBe(document.body);
    refButton.focus();
    widget.show(false);
    widget.close("keyboard");
    expect(document.activeElement).toBe(refButton);
  });

  it("keeps the ref button and its attributes across highlight insertion and removal (TC-500)", () => {
    // Case: TC-500 (K40 / A8.3-3)
    const refButton = rowWithRefButton();
    const attributesBefore = {
      label: refButton.getAttribute("aria-label"),
      tabindex: refButton.getAttribute("tabindex"),
      name: refButton.dataset.name
    };
    const textBefore = refButton.textContent;

    triggerSearch(widget, "keyboard");
    expect(getPositionText()).toBe("1 of 1");
    expect(getMatchSpans().length).toBeGreaterThan(0);
    const highlighted = document.querySelector<HTMLButtonElement>("button.gitRefButton")!;
    expect(highlighted).toBe(refButton);
    expect(refButton.getAttribute("aria-label")).toBe(attributesBefore.label);
    expect(refButton.getAttribute("tabindex")).toBe(attributesBefore.tabindex);
    expect(refButton.dataset.name).toBe(attributesBefore.name);
    expect(refButton.querySelector(".codicon")).not.toBeNull();

    widget.close();
    expect(getMatchSpans()).toHaveLength(0);
    expect(document.querySelector("button.gitRefButton")).toBe(refButton);
    expect(refButton.textContent).toBe(textBefore);
  });

  it("searches once after the debounce and survives an invalid regex (TC-501)", () => {
    // Case: TC-501 (A8.2-3)
    vi.useFakeTimers();
    try {
      setupCommitsAndDom([makeCommit({ hash: HASHES[0], message: "fix bug" })], callbacks);
      widget.show(false);
      (callbacks.getCommits as Mock).mockClear();
      input().value = "fi";
      key("keyup", { key: "i" });
      input().value = "fix";
      key("keyup", { key: "x" });
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
      expect(callbacks.getCommits).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(callbacks.getCommits).toHaveBeenCalledTimes(1);
      expect(getPositionText()).toBe("1 of 1");

      button("findRegex").click();
      input().value = "[invalid";
      key("keyup", { key: "d" });
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
      expect(document.querySelector(".findWidget")!.hasAttribute("data-error")).toBe(true);
      expect(getPositionText()).toBe("No Results");
    } finally {
      vi.useRealTimers();
    }
  });

  it("leaves ArrowDown to the input caret (TC-502)", () => {
    // Case: TC-502 (K19)
    threeMatches();
    (callbacks.scrollToCommit as Mock).mockClear();
    const event = key("keydown", { key: "ArrowDown" });
    expect(event.defaultPrevented).toBe(false);
    expect(callbacks.scrollToCommit).not.toHaveBeenCalled();
    expect(getPositionText()).toBe("1 of 3");
  });
});

// S12: the origin of each search session, including one opened from the page body
// @see docs/testing/perspectives/web/findWidget-test.md
describe("FindWidget focus origin per search session (S12)", () => {
  const REF_NAME = "feature/keyboard";
  let widget: FindWidget;
  let activeRow: HTMLTableRowElement;
  let refButton: HTMLButtonElement;
  let disposeContext: () => void;

  function findInput(): HTMLInputElement {
    return document.getElementById("findInput") as HTMLInputElement;
  }

  function closeButton(): HTMLButtonElement {
    return document.getElementById("findClose") as HTMLButtonElement;
  }

  function focusBody(): void {
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.activeElement).toBe(document.body);
  }

  beforeEach(() => {
    document.body.innerHTML = "";
    widget = new FindWidget(createMockCallbacks());
    activeRow = document.createElement("tr");
    activeRow.tabIndex = 0;
    refButton = document.createElement("button");
    refButton.type = "button";
    markFocusTarget(refButton, {
      kind: "ref",
      repo: "/repo",
      hash: "aaa1111100000000",
      refType: "head",
      name: REF_NAME
    });
    activeRow.appendChild(refButton);
    document.body.appendChild(activeRow);
    disposeContext = configureFocusContext({
      getRepo: () => "/repo",
      getActiveRow: () => activeRow,
      getTabStops: () => []
    });
  });

  afterEach(() => {
    disposeContext();
    document.body.innerHTML = "";
  });

  it("returns a body-opened session to the active row, not the hidden close button (TC-503)", () => {
    // Case: TC-503
    focusBody();
    widget.show(true);
    closeButton().focus();

    closeButton().click();

    expect(widget.isVisible()).toBe(false);
    expect(document.activeElement).toBe(activeRow);
  });

  it("does not reuse the previous session's origin for a body-opened session (TC-504)", () => {
    // Case: TC-504
    refButton.focus();
    widget.show(true);
    widget.close("keyboard");
    expect(document.activeElement).toBe(refButton);

    focusBody();
    widget.show(true);
    widget.close("keyboard");

    expect(document.activeElement).toBe(activeRow);
  });

  it("keeps the launcher when show() runs again with focus inside the widget (TC-505)", () => {
    // Case: TC-505
    refButton.focus();
    widget.show(true);
    expect(document.activeElement).toBe(findInput());

    widget.show(true);
    widget.close("keyboard");

    expect(document.activeElement).toBe(refButton);
  });
});
