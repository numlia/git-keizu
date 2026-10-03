// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GitCommitNode } from "../../src/types";
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
