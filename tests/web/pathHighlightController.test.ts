// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GitCommitNode } from "../../src/types";
import { configureFocusContext } from "../../web/keyboardNavigation";
import { PathHighlightMode } from "../../web/pathHighlight";
import {
  type PathHighlightCallbacks,
  PathHighlightController
} from "../../web/pathHighlightController";
import { vscode } from "../../web/utils";

/* ------------------------------------------------------------------ */
/* Constants and fixtures                                             */
/* ------------------------------------------------------------------ */

const REPO = "/repo";
const OTHER_REPO = "/other";
const BAR_ID = "pathHighlightBar";
const NAME_ID = "pathHighlightName";
const KIND_ID = "pathHighlightKind";
const HASH_ID = "pathHighlightHash";
const MODE_ID = "pathHighlightMode";
const CLEAR_ID = "pathHighlightClear";
const CLASS_ACTIVE = "active";
const MERGE_SUBJECT = "Merge branch";
const COMMIT_MODE_VALUES = [
  "Direct parents and children",
  "Ancestors and descendants",
  "First-parent ancestors"
];
const BRANCH_MODE_VALUES = ["All ancestors", "First-parent ancestors"];
const TARGET_OUTSIDE_TEXT = "Target is outside loaded history";
const HTML_LOOKING_SUBJECT = '<img src=x onerror="x()">&amp;<b>bold</b>';
const HTML_LOOKING_BRANCH = "<b>feat</b>";

const ENGLISH_MESSAGES = JSON.parse(
  readFileSync(resolve(process.cwd(), "l10n/web/web.l10n.en.json"), "utf-8")
) as Record<string, string>;

function edge(childHash: string, parentHash: string): string {
  return `["${childHash}","${parentHash}"]`;
}

function node(
  hash: string,
  parentHashes: string[],
  extra: Partial<GitCommitNode> = {}
): GitCommitNode {
  return {
    hash,
    parentHashes,
    author: "a",
    email: "e",
    date: 0,
    message: `m ${hash}`,
    refs: [],
    stash: null,
    ...extra
  };
}

function standard(): GitCommitNode[] {
  return [
    node("N", ["M"]),
    node("M", ["A", "B"], {
      message: MERGE_SUBJECT,
      refs: [{ type: "head", name: "feature", hash: "M" }]
    }),
    node("A", ["R"]),
    node("B", ["R"]),
    node("U", ["R"]),
    node("R", []),
    node("X", [])
  ];
}

function boundaryFixture(): GitCommitNode[] {
  return [node("C3", ["C1", "C2"]), node("C2", ["C1", "g1"]), node("C1", ["g2", "g1"])];
}

/* ------------------------------------------------------------------ */
/* Harness                                                            */
/* ------------------------------------------------------------------ */

interface Harness {
  controller: PathHighlightController;
  setGraphHighlight: ReturnType<typeof vi.fn>;
  state: { commits: GitCommitNode[]; repo: string | undefined };
  bar(): HTMLElement;
  name(): HTMLElement;
  kind(): HTMLElement;
  hash(): HTMLElement;
  select(): HTMLSelectElement;
  button(): HTMLButtonElement;
}

function setup(): Harness {
  document.body.innerHTML =
    '<div id="controls"></div><div id="fileHistoryBar"></div><div id="scrollContainer"></div>';
  const state = { commits: standard(), repo: REPO as string | undefined };
  const setGraphHighlight = vi.fn();
  const callbacks: PathHighlightCallbacks = {
    getCommits: () => state.commits,
    getCurrentRepo: () => state.repo,
    setGraphHighlight
  };
  const controller = new PathHighlightController(callbacks);
  return {
    controller,
    setGraphHighlight,
    state,
    bar: () => document.getElementById(BAR_ID)!,
    name: () => document.getElementById(NAME_ID)!,
    kind: () => document.getElementById(KIND_ID)!,
    hash: () => document.getElementById(HASH_ID)!,
    select: () => document.getElementById(MODE_ID) as HTMLSelectElement,
    button: () => document.getElementById(CLEAR_ID) as HTMLButtonElement
  };
}

function selectMerge(h: Harness): void {
  h.controller.select({
    kind: "commit",
    repo: REPO,
    hash: "M",
    name: MERGE_SUBJECT,
    mode: PathHighlightMode.Direct
  });
}

function selectFeature(h: Harness): void {
  h.controller.select({
    kind: "branch",
    refType: "head",
    repo: REPO,
    hash: "M",
    name: "feature",
    mode: PathHighlightMode.AllAncestors
  });
}

function optionValues(h: Harness): string[] {
  return Array.from(h.select().options, (option) => option.value);
}

function lastHighlight(h: Harness): unknown {
  return h.setGraphHighlight.mock.lastCall![0];
}

function changeMode(h: Harness, value: string): void {
  h.select().value = value;
  h.select().dispatchEvent(new Event("change"));
}

const DIRECT_RESULT = {
  targetFound: true,
  hashes: new Set(["N", "M", "A", "B"]),
  edgeKeys: new Set([edge("N", "M"), edge("M", "A"), edge("M", "B")]),
  boundaries: []
};

beforeEach(() => {
  globalThis.webviewMessages = ENGLISH_MESSAGES;
  vi.mocked(vscode.postMessage).mockClear();
  vi.mocked(vscode.setState).mockClear();
  vi.mocked(vscode.getState).mockClear();
});

afterEach(() => {
  // Common condition of S1: the controller never talks to the host or the saved state.
  expect(vscode.postMessage).toHaveBeenCalledTimes(0);
  expect(vscode.setState).toHaveBeenCalledTimes(0);
  expect(vscode.getState).toHaveBeenCalledTimes(0);
});

/* ------------------------------------------------------------------ */
/* S1: selection, bar and graph callback                              */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/pathHighlightController-test.md
describe("PathHighlightController selection, bar and callback (S1)", () => {
  it("inserts a hidden bar after #controls and calls no callback on construction (TC-001)", () => {
    // Case: TC-001
    // When: only the constructor runs
    const h = setup();

    // Then: the bar follows #controls, is inactive, and the graph callback was not called
    expect(document.getElementById("controls")!.nextElementSibling).toBe(h.bar());
    expect(h.bar().classList.contains(CLASS_ACTIVE)).toBe(false);
    expect(h.setGraphHighlight).toHaveBeenCalledTimes(0);
  });

  it("shows a commit target with its three modes and renders the Direct result (TC-002)", () => {
    // Case: TC-002
    const h = setup();

    // When: a commit is selected in Direct mode
    selectMerge(h);

    // Then: the bar shows the subject, abbreviated hash with full title, three options, label, scope, button
    expect(h.bar().classList.contains(CLASS_ACTIVE)).toBe(true);
    expect(h.name().textContent).toBe(MERGE_SUBJECT);
    expect(h.hash().textContent).toBe("M");
    expect(h.hash().title).toBe("M");
    expect(optionValues(h)).toEqual(COMMIT_MODE_VALUES);
    expect(h.select().value).toBe("Direct parents and children");
    expect(h.bar().querySelector("label")!.textContent).toBe("Mode");
    expect(h.bar().querySelector("label")!.htmlFor).toBe(MODE_ID);
    expect(h.bar().textContent).toContain("Loaded history only");
    expect(h.button().tagName).toBe("BUTTON");
    expect(h.button().textContent).toBe("Clear path highlight");
    expect(h.bar().textContent).not.toContain("Branch at selection");
    expect(h.setGraphHighlight).toHaveBeenCalledTimes(1);
    expect(lastHighlight(h)).toEqual(DIRECT_RESULT);
  });

  it("shows a branch target with its two modes and the selection-time label (TC-003)", () => {
    // Case: TC-003
    const h = setup();

    // When: a branch is selected in AllAncestors mode
    selectFeature(h);

    // Then: two options, branch name, selection-time label, all-ancestors result
    expect(optionValues(h)).toEqual(BRANCH_MODE_VALUES);
    expect(h.select().value).toBe("All ancestors");
    expect(h.name().textContent).toBe("feature");
    expect(h.kind().textContent).toBe("Branch at selection");
    expect(h.kind().hidden).toBe(false);
    expect(h.setGraphHighlight).toHaveBeenCalledTimes(1);
    expect(lastHighlight(h)).toEqual({
      targetFound: true,
      hashes: new Set(["M", "A", "B", "R"]),
      edgeKeys: new Set([edge("M", "A"), edge("M", "B"), edge("A", "R"), edge("B", "R")]),
      boundaries: []
    });
  });

  it("replaces the previous target completely (TC-004)", () => {
    // Case: TC-004
    const h = setup();
    selectMerge(h);

    // When: another commit is selected
    h.controller.select({
      kind: "commit",
      repo: REPO,
      hash: "A",
      name: "Add A",
      mode: PathHighlightMode.AncestorsAndDescendants
    });

    // Then: only the new target is shown and rendered
    expect(h.name().textContent).toBe("Add A");
    expect(h.bar().textContent).not.toContain(MERGE_SUBJECT);
    expect(h.hash().title).toBe("A");
    expect(h.select().value).toBe("Ancestors and descendants");
    expect(h.setGraphHighlight).toHaveBeenCalledTimes(2);
    expect((lastHighlight(h) as { hashes: Set<string> }).hashes).toEqual(
      new Set(["N", "M", "A", "R"])
    );
  });

  it("keeps the selection while the target is missing and recovers (TC-005)", () => {
    // Case: TC-005
    const h = setup();
    selectMerge(h);
    const select = h.select();
    const button = h.button();

    // When: the commits no longer contain M
    h.state.commits = standard().filter((commit) => commit.hash !== "M");
    h.controller.onCommitsChanged();

    // Then: graph cleared with null, bar shows the reason and keeps the selection, controls usable
    expect(h.setGraphHighlight).toHaveBeenCalledTimes(2);
    expect(lastHighlight(h)).toBeNull();
    expect(h.bar().classList.contains(CLASS_ACTIVE)).toBe(true);
    expect(h.bar().textContent).toContain(TARGET_OUTSIDE_TEXT);
    expect(h.name().textContent).toBe(MERGE_SUBJECT);
    expect(h.hash().title).toBe("M");
    expect(h.select().value).toBe("Direct parents and children");
    expect(h.select().disabled).toBe(false);
    expect(h.button().disabled).toBe(false);

    // When: M is loaded again
    h.state.commits = standard();
    h.controller.onCommitsChanged();

    // Then: the Direct result is rendered again, the reason disappears, the controls are the same nodes
    expect(h.setGraphHighlight).toHaveBeenCalledTimes(3);
    expect(lastHighlight(h)).toEqual(DIRECT_RESULT);
    expect(h.bar().textContent).not.toContain(TARGET_OUTSIDE_TEXT);
    expect(h.select()).toBe(select);
    expect(h.button()).toBe(button);
  });

  it("rejects a selection whose repo differs from the current one (TC-006)", () => {
    // Case: TC-006
    const h = setup();

    // When: an unselected controller receives a selection from another repo
    h.controller.select({
      kind: "commit",
      repo: OTHER_REPO,
      hash: "M",
      name: MERGE_SUBJECT,
      mode: PathHighlightMode.Direct
    });

    // Then: nothing is shown or rendered
    expect(h.bar().classList.contains(CLASS_ACTIVE)).toBe(false);
    expect(h.setGraphHighlight).toHaveBeenCalledTimes(0);

    // When: a selected controller receives one
    selectMerge(h);
    h.controller.select({
      kind: "commit",
      repo: OTHER_REPO,
      hash: "A",
      name: "Other",
      mode: PathHighlightMode.Direct
    });

    // Then: the existing selection and render are unchanged
    expect(h.name().textContent).toBe(MERGE_SUBJECT);
    expect(h.setGraphHighlight).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["clear()", (h: Harness) => h.controller.clear()],
    ["onRepositoryChanged()", (h: Harness) => h.controller.onRepositoryChanged()],
    ["the clear button", (h: Harness) => h.button().dispatchEvent(new MouseEvent("click"))]
  ])("clears the selection, bar and graph once through %s (TC-007)", (_label, act) => {
    // Case: TC-007
    const h = setup();
    selectMerge(h);

    // When: the selection is cleared
    act(h);

    // Then: one null notification, the bar is reset
    expect(h.setGraphHighlight).toHaveBeenCalledTimes(2);
    expect(lastHighlight(h)).toBeNull();
    expect(h.bar().classList.contains(CLASS_ACTIVE)).toBe(false);
    expect(h.name().textContent).toBe("");
    expect(h.hash().textContent).toBe("");
    expect(h.hash().hasAttribute("title")).toBe(false);

    // When: commits change afterwards
    h.controller.onCommitsChanged();

    // Then: nothing is rendered
    expect(h.setGraphHighlight).toHaveBeenCalledTimes(2);
  });

  it("recomputes on an allowed mode and reverts a mode outside the kind (TC-008)", () => {
    // Case: TC-008
    const h = setup();
    selectFeature(h);

    // When: the mode select changes to the other branch mode
    changeMode(h, "First-parent ancestors");

    // Then: the first-parent result is rendered
    expect(h.setGraphHighlight).toHaveBeenCalledTimes(2);
    expect(lastHighlight(h)).toEqual({
      targetFound: true,
      hashes: new Set(["M", "A", "R"]),
      edgeKeys: new Set([edge("M", "A"), edge("A", "R")]),
      boundaries: []
    });
    expect(h.select().value).toBe("First-parent ancestors");

    // When: a commit-only option is injected and chosen
    const rogue = document.createElement("option");
    rogue.value = "Direct parents and children";
    h.select().append(rogue);
    changeMode(h, "Direct parents and children");

    // Then: the value reverts, nothing is rendered, the target is unchanged
    expect(h.select().value).toBe("First-parent ancestors");
    expect(h.setGraphHighlight).toHaveBeenCalledTimes(2);
    expect(h.name().textContent).toBe("feature");
    expect(h.hash().title).toBe("M");
  });

  it("renders HTML-looking names as text (TC-009)", () => {
    // Case: TC-009
    const h = setup();

    // When: a commit subject with markup is selected
    h.controller.select({
      kind: "commit",
      repo: REPO,
      hash: "M",
      name: HTML_LOOKING_SUBJECT,
      mode: PathHighlightMode.Direct
    });

    // Then: the text is shown verbatim and no element was created from it
    expect(h.name().textContent).toBe(HTML_LOOKING_SUBJECT);
    expect(h.bar().querySelector("img, b")).toBeNull();

    // When: a branch name with markup is selected
    h.controller.select({
      kind: "branch",
      refType: "head",
      repo: REPO,
      hash: "M",
      name: HTML_LOOKING_BRANCH,
      mode: PathHighlightMode.AllAncestors
    });

    // Then: same
    expect(h.name().textContent).toBe(HTML_LOOKING_BRANCH);
    expect(h.bar().querySelector("img, b")).toBeNull();
  });

  it("lists boundaries in result order with full-hash titles, and none without boundaries (TC-010)", () => {
    // Case: TC-010
    const h = setup();
    h.state.commits = boundaryFixture();

    // When: a branch at C3 is selected
    h.controller.select({
      kind: "branch",
      refType: "head",
      repo: REPO,
      hash: "C3",
      name: "topic",
      mode: PathHighlightMode.AllAncestors
    });

    // Then: details with the summary and three items in result order, full hashes as titles
    const details = h.bar().querySelector("details");
    expect(details).not.toBeNull();
    expect(details!.querySelector("summary")!.textContent).toBe("Outside loaded history");
    const items = Array.from(details!.querySelectorAll("li"));
    expect(
      items.map((item) => Array.from(item.querySelectorAll("span"), (span) => span.title))
    ).toEqual([
      ["C2", "g1"],
      ["C1", "g2"],
      ["C1", "g1"]
    ]);
    expect(
      items.map((item) => Array.from(item.querySelectorAll("span"), (span) => span.textContent))
    ).toEqual([
      ["C2", "g1"],
      ["C1", "g2"],
      ["C1", "g1"]
    ]);
    expect((lastHighlight(h) as { boundaries: unknown }).boundaries).toEqual([
      { childHash: "C2", parentHash: "g1" },
      { childHash: "C1", parentHash: "g2" },
      { childHash: "C1", parentHash: "g1" }
    ]);
    expect(
      Array.from(h.bar().querySelectorAll("select, button, summary"), (elem) => elem.tagName)
    ).toEqual(["SELECT", "BUTTON", "SUMMARY"]);

    // When: a target without boundaries is selected
    h.state.commits = standard();
    selectMerge(h);

    // Then: no details element
    expect(h.bar().querySelector("details")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* S2: reachable controls, names, clear / boundary focus, fixed target */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/pathHighlightController-test.md
describe("PathHighlightController bar controls and focus (S2)", () => {
  const TARGET_HASH = "M";
  let disposeContext: () => void;

  function targetRow(): HTMLElement {
    return document.querySelector<HTMLElement>(`tr[data-hash="${TARGET_HASH}"]`)!;
  }

  /** The S1 harness plus a commit table whose row target is M, as main keeps it. */
  function setupWithList(): Harness {
    const h = setup();
    document.body.insertAdjacentHTML(
      "beforeend",
      `<table id="commitTable"><tbody><tr data-hash="${TARGET_HASH}" tabindex="0"><td>M</td></tr></tbody></table>`
    );
    return h;
  }

  function selectTopic(h: Harness): void {
    h.controller.select({
      kind: "branch",
      refType: "head",
      repo: REPO,
      hash: "C3",
      name: "topic",
      mode: PathHighlightMode.AllAncestors
    });
  }

  function key(target: HTMLElement, type: "keydown" | "keyup", keyName: string): KeyboardEvent {
    const event = new KeyboardEvent(type, { key: keyName, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
  }

  beforeEach(() => {
    disposeContext = configureFocusContext({
      getRepo: () => REPO,
      getActiveRow: () => targetRow(),
      getTabStops: () => []
    });
  });

  afterEach(() => {
    disposeContext();
  });

  it("keeps the target hash and the control nodes when the list changes (TC-019)", () => {
    // Case: TC-019 (K43 / A8.2-2 / A8.3-5)
    // Given: M selected in Direct mode
    const h = setupWithList();
    selectMerge(h);
    const select = h.select();
    const button = h.button();

    // When: the list is reordered, then M disappears from it
    h.state.commits = standard().reverse();
    h.controller.onCommitsChanged();
    const afterReorder = { name: h.name().textContent, title: h.hash().title };
    h.state.commits = standard().filter((commit) => commit.hash !== TARGET_HASH);
    h.controller.onCommitsChanged();

    // Then: the name and hash never changed, the controls are the same nodes, and the unloaded
    // target is reported
    expect(afterReorder).toEqual({ name: MERGE_SUBJECT, title: TARGET_HASH });
    expect(h.name().textContent).toBe(MERGE_SUBJECT);
    expect(h.hash().title).toBe(TARGET_HASH);
    expect(h.select()).toBe(select);
    expect(h.button()).toBe(button);
    expect(h.bar().textContent).toContain(TARGET_OUTSIDE_TEXT);
    expect(h.bar().classList.contains(CLASS_ACTIVE)).toBe(true);
  });

  it("recomputes only on change, never on a keydown of the select (TC-020)", () => {
    // Case: TC-020 (K43)
    // Given: M selected and the mode select focused
    const h = setupWithList();
    selectMerge(h);
    const calls = h.setGraphHighlight.mock.calls.length;
    h.select().focus();

    // When: ArrowDown is pressed without a change event
    const keydown = key(h.select(), "keydown", "ArrowDown");

    // Then: nothing recomputed and the key keeps its default
    expect(h.setGraphHighlight).toHaveBeenCalledTimes(calls);
    expect(keydown.defaultPrevented).toBe(false);

    // When: the value changes
    changeMode(h, PathHighlightMode.FirstParent);

    // Then: one recalculation with the new mode
    expect(h.setGraphHighlight).toHaveBeenCalledTimes(calls + 1);
    expect(h.select().value).toBe(PathHighlightMode.FirstParent);
  });

  it("clears once from the focused button and lands focus on the row target (TC-021)", () => {
    // Case: TC-021 (K43 / A8.1-6)
    // Given: M selected and the clear button focused
    const h = setupWithList();
    selectMerge(h);
    h.button().focus();
    expect(document.activeElement).toBe(h.button());

    // When: Enter is pressed (keydown, the click standing in for the native activation, keyup)
    key(h.button(), "keydown", "Enter");
    h.button().click();
    key(h.button(), "keyup", "Enter");

    // Then: one clear, the bar inactive, focus on the connected row target rather than body
    expect(h.setGraphHighlight).toHaveBeenCalledTimes(2);
    expect(h.setGraphHighlight).toHaveBeenLastCalledWith(null);
    expect(h.bar().classList.contains(CLASS_ACTIVE)).toBe(false);
    expect(document.activeElement).toBe(targetRow());
    expect(document.activeElement).not.toBe(document.body);
  });

  it("does not clear on Escape (TC-022)", () => {
    // Case: TC-022 (K43 / A8.2-2)
    // Given: M selected and the select focused
    const h = setupWithList();
    selectMerge(h);
    h.select().focus();

    // When: Escape is pressed and released
    key(h.select(), "keydown", "Escape");
    key(h.select(), "keyup", "Escape");

    // Then: no clear, the bar active, the selection unchanged
    expect(h.setGraphHighlight).toHaveBeenCalledTimes(1);
    expect(h.setGraphHighlight).not.toHaveBeenCalledWith(null);
    expect(h.bar().classList.contains(CLASS_ACTIVE)).toBe(true);
    expect(h.name().textContent).toBe(MERGE_SUBJECT);
    expect(h.hash().title).toBe(TARGET_HASH);
  });

  it("names the select through its label and the clear button through its text (TC-023)", () => {
    // Case: TC-023 (R4.3)
    // Given: a boundary selection so the details element is rendered
    const h = setupWithList();
    h.state.commits = boundaryFixture();
    selectTopic(h);

    // Then: label / select association, a type="button" clear with its name, a summary text
    const label = h.bar().querySelector("label")!;
    expect(label.htmlFor).toBe(h.select().id);
    expect(label.textContent).toBe("Mode");
    expect(h.button().type).toBe("button");
    expect(h.button().textContent).toBe("Clear path highlight");
    expect(h.bar().querySelector("details summary")!.textContent).toBe("Outside loaded history");
    expect(h.bar().hidden).toBe(false);
  });

  it("offers the boundary summary as a stop only when boundaries exist (TC-024)", () => {
    // Case: TC-024 (A8.3-1)
    // Given: M selected without boundaries
    const h = setupWithList();
    selectMerge(h);

    // Then: no details element and the hidden inactive state is never a stop
    expect(h.bar().querySelector("details")).toBeNull();

    // When: a selection with boundaries is made
    h.state.commits = boundaryFixture();
    selectTopic(h);

    // Then: the summary is reachable and its activation toggles the details
    const details = h.bar().querySelector<HTMLDetailsElement>("details")!;
    const summary = details.querySelector<HTMLElement>("summary")!;
    summary.focus();
    expect(document.activeElement).toBe(summary);
    expect(details.open).toBe(false);
    summary.click();
    expect(details.open).toBe(true);
    summary.click();
    expect(details.open).toBe(false);
  });

  it("moves focus from a vanishing boundary list to the select (TC-025)", () => {
    // Case: TC-025 (A8.3-5)
    // Given: a boundary selection with focus on the summary
    const h = setupWithList();
    h.state.commits = boundaryFixture();
    selectTopic(h);
    const summary = h.bar().querySelector<HTMLElement>("summary")!;
    summary.focus();
    expect(document.activeElement).toBe(summary);

    // When: the boundary parents get loaded so no boundary remains
    h.state.commits = [...boundaryFixture(), node("g1", []), node("g2", [])];
    h.controller.onCommitsChanged();

    // Then: the details element is gone, focus is on the bar's select, selection unchanged
    expect(h.bar().querySelector("details")).toBeNull();
    expect(document.activeElement).toBe(h.select());
    expect(h.select().isConnected).toBe(true);
    expect(h.name().textContent).toBe("topic");
    expect(h.hash().title).toBe("C3");
    expect(h.bar().classList.contains(CLASS_ACTIVE)).toBe(true);
  });

  it("keeps an inactive bar hidden so its controls are not tab stops", () => {
    // Case: TC-023 / TC-024 (hidden state of the bar; main's getTabStops reads `.active`)
    // Given: a fresh controller
    const h = setupWithList();

    // Then: hidden while inactive, shown on select, hidden again after clear
    expect(h.bar().hidden).toBe(true);
    selectMerge(h);
    expect(h.bar().hidden).toBe(false);
    h.controller.clear();
    expect(h.bar().hidden).toBe(true);
  });
});
