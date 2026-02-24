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

/* === Mocks === */

vi.mock("../../web/branchLabels", () => ({
  getBranchLabels: vi.fn(() => ({ heads: [], remotes: [], tags: [] }))
}));

vi.mock("../../web/dates", () => ({
  getCommitDate: vi.fn(() => ({ title: "24 Feb 2026 12:00", value: "24 Feb 2026 12:00" }))
}));

import { getBranchLabels } from "../../web/branchLabels";

/* === Helpers === */

const ABBREV_LENGTH = 8;

function createMockCallbacks(): FindWidgetCallbacks {
  return {
    getCommits: vi.fn(() => []),
    getColumnVisibility: vi.fn(() => ({ author: true, date: true, commit: true })),
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
    it("generates correct DOM structure on construction (TC-FW-N-01)", () => {
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

    it("show() makes widget visible and focuses input (TC-FW-N-02)", () => {
      // Given: widget is initially hidden
      // When: show() is called
      widget.show(false);

      // Then: widget has active class and input is focused
      const widgetElem = document.querySelector(".findWidget")!;
      expect(widgetElem.classList.contains("active")).toBe(true);
      expect(widget.isVisible()).toBe(true);
      expect(document.activeElement).toBe(document.getElementById("findInput"));
    });

    it("close() hides widget and clears highlights (TC-FW-N-03)", () => {
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

    it("isVisible() returns true after show() (TC-FW-N-04)", () => {
      // Given: widget is hidden
      // When: show() is called
      widget.show(false);
      // Then: isVisible() returns true
      expect(widget.isVisible()).toBe(true);
    });

    it("isVisible() returns false after close() (TC-FW-N-05)", () => {
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
    it("setInputEnabled(false) disables input when visible (TC-FW-N-06)", () => {
      // Given: widget is visible
      widget.show(false);
      // When: setInputEnabled(false)
      widget.setInputEnabled(false);
      // Then: input is disabled
      expect((document.getElementById("findInput") as HTMLInputElement).disabled).toBe(true);
    });

    it("setInputEnabled(true) enables input when visible (TC-FW-N-07)", () => {
      // Given: widget is visible and input is disabled
      widget.show(false);
      widget.setInputEnabled(false);
      // When: setInputEnabled(true)
      widget.setInputEnabled(true);
      // Then: input is enabled
      expect((document.getElementById("findInput") as HTMLInputElement).disabled).toBe(false);
    });

    it("search on zero commits shows no results (TC-FW-B-01)", () => {
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
    it("matches commit message text (TC-FW-N-08)", () => {
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

    it("matches author name (TC-FW-N-09)", () => {
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

    it("matches abbreviated commit hash (TC-FW-N-10)", () => {
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

    it("matches branch and tag names (TC-FW-N-11)", () => {
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

    it("shows correct match count for multiple matches (TC-FW-N-12)", () => {
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

    it("shows No Results for zero matches (TC-FW-B-02)", () => {
      // Given: commits exist but none match
      const commits = [makeCommit({ hash: "aaa1111100000000", message: "add feature" })];
      setupCommitsAndDom(commits, callbacks);

      // When: search for "nonexistent"
      triggerSearch(widget, "nonexistent");

      // Then: counter shows "No Results"
      expect(getPositionText()).toBe("No Results");
      expect(getHighlightedRows()).toHaveLength(0);
    });

    it("shows 1 of 1 for single match (TC-FW-B-03)", () => {
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

    it("clears highlights when search text is emptied (TC-FW-B-04)", () => {
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
    it("case insensitive by default (TC-FW-N-13)", () => {
      // Given: commit with message "Fix bug"
      const commits = [makeCommit({ hash: "aaa1111100000000", message: "Fix bug" })];
      setupCommitsAndDom(commits, callbacks);

      // When: search for "fix" (lowercase) with caseSensitive OFF
      triggerSearch(widget, "fix", { caseSensitive: false });

      // Then: matches "Fix" (case insensitive)
      expect(getPositionText()).toBe("1 of 1");
    });

    it("case sensitive when enabled (TC-FW-N-14)", () => {
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

    it("regex mode matches patterns (TC-FW-N-15)", () => {
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

    it("invalid regex sets error attribute (TC-FW-A-01)", () => {
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

    it("zero-length match sets error and clears matches (TC-FW-A-02)", () => {
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

    it("potential ReDoS pattern does not crash (TC-FW-A-03)", () => {
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

    it("next() advances position (TC-FW-N-16)", () => {
      // Given: 3 matches, position at 1
      setupThreeMatches();
      expect(getPositionText()).toBe("1 of 3");

      // When: click next button
      document.getElementById("findNext")!.click();

      // Then: position is 2
      expect(getPositionText()).toBe("2 of 3");
    });

    it("prev() wraps to last position (TC-FW-N-17)", () => {
      // Given: 3 matches, position at 1
      setupThreeMatches();
      expect(getPositionText()).toBe("1 of 3");

      // When: click prev button
      document.getElementById("findPrev")!.click();

      // Then: position wraps to 3 (last)
      expect(getPositionText()).toBe("3 of 3");
    });

    it("next() wraps from last to first (TC-FW-B-05)", () => {
      // Given: 3 matches, position at 3
      setupThreeMatches();
      document.getElementById("findPrev")!.click(); // go to 3
      expect(getPositionText()).toBe("3 of 3");

      // When: click next
      document.getElementById("findNext")!.click();

      // Then: wraps to 1
      expect(getPositionText()).toBe("1 of 3");
    });

    it("next() with zero matches does nothing (TC-FW-B-06)", () => {
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

    it("navigation triggers scrollToCommit (TC-FW-N-18)", () => {
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
    it("getState() returns current FindWidgetState (TC-FW-N-19)", () => {
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

    it("restoreState() restores saved state correctly (TC-FW-N-20)", () => {
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

    it("restoreState with non-visible state does not activate widget (TC-FW-B-07)", () => {
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

    it("search executes after SEARCH_DEBOUNCE_MS delay (TC-FW-N-21)", () => {
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

    it("rapid input resets debounce timer (TC-FW-B-08)", () => {
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
});
