// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { GitCommitNode, GitFileChange, GitRef } from "../../src/types";
import { vscode } from "../../web/utils";

/*
 * Integration of web/main.ts with the real Graph, both menu builders, the real context menu,
 * the real FileHistoryController and the real path highlight modules. Only the host API is
 * captured. The file imports nothing from web/pathHighlight*.ts so the main regression
 * (TC-630) also boots on the commit before the feature and fails there for the missing
 * "Highlight path" submenu rather than for a missing module.
 */

/* ------------------------------------------------------------------ */
/* Hoisted mocks: collaborators outside the scope of these tests      */
/* ------------------------------------------------------------------ */

const { dropdowns } = vi.hoisted(() => ({
  dropdowns: {} as Record<string, { callback: ((value: never) => void) | undefined }>
}));

vi.mock("../../web/dropdown", () => ({
  Dropdown: vi.fn(function (id: string, _showInfo: boolean, _label: string, callback?: never) {
    dropdowns[id] = { callback };
    return {
      setOptions: vi.fn(),
      refresh: vi.fn(),
      isOpen: vi.fn(() => false),
      close: vi.fn(),
      cancelAndClose: vi.fn()
    };
  })
}));

vi.mock("../../web/branchCleanupPanel", () => ({
  BranchCleanupPanel: vi.fn(function () {
    return {
      toggle: vi.fn(),
      refresh: vi.fn(),
      selectRepository: vi.fn(),
      handleResponse: vi.fn(),
      isOpen: vi.fn(() => false)
    };
  })
}));

/* ------------------------------------------------------------------ */
/* Constants and fixtures                                             */
/* ------------------------------------------------------------------ */

const REPO = "/test/repo";
const OTHER_REPO = "/test/other";
const MERGE_SUBJECT = "Merge branch";
const HIGHLIGHT_TITLE = "Highlight path";
const DIRECT_TITLE = "Direct parents and children";
const CLASS_MODE = "pathHighlightMode";
const CLASS_HISTORY_MODE = "fileHistoryMode";
const CLASS_SELECTED = "pathHighlightSelected";
const CLASS_RING = "pathHighlightRing";
const CLASS_ACTIVE = "active";
const BAR_ID = "pathHighlightBar";
const CLEAR_ID = "pathHighlightClear";
const HISTORY_BAR_ID = "fileHistoryBar";
const HISTORY_EXIT_ID = "fileHistoryExit";
const HISTORY_POSITION_ID = "fileHistoryPosition";
const FILE_PATH = "src/a.txt";
const HISTORY_ENTRY_HASHES = ["M", "R"];
// Table layout stub: header 11px (+1 border) and 24px rows give grid.y 24 and offsetY 24.
const HEADER_CLIENT_HEIGHT = 11;
const HEADER_HEIGHT = HEADER_CLIENT_HEIGHT + 1;
const ROW_HEIGHT = 24;

/*
 * Expected paths are derived from the grid (x 16, offsetX 8; y 24, offsetY 24; rounded curve
 * control offset 19.2) and the lane placement of each fixture, not from the renderer.
 * Standard fixture rows: N 24, M 48, A 72, B 96, U 120, R 144, X 168 (lane 0 x 8, lane 1 x 24,
 * lane 2 x 40).
 */
const STANDARD_SELECTED = ["M8,24.0L8,72.0", "M8,48.0C8,67.2 24,52.8 24,72.0L24,96.0"];
const STANDARD_UNSELECTED = [
  "M8,72.0L8,144.0",
  "M24,96.0L24,120.0C24,139.2 8,124.8 8,144.0",
  "M40,120.0C40,139.2 8,124.8 8,144.0",
  ""
];
const STANDARD_RING_CENTRES = [
  ["8", "24"],
  ["8", "48"],
  ["8", "72"],
  ["24", "96"]
];
/*
 * Merge fixture rows: m 24, n 48, a 72, c 96, b 120, r 144. n's second parent b joins the
 * point (24,72) registered by the m -> b line, so the shared part down to b is selected while
 * the part of m -> b before the join is not.
 */
const MERGE_SELECTED = [
  "M24,72.0C24,91.2 8,76.8 8,96.0L8,120.0",
  "M40,48.0C40,67.2 24,52.8 24,72.0",
  "M40,48.0L40,72.0C40,91.2 24,76.8 24,96.0"
];
const MERGE_UNSELECTED = [
  "M8,24.0L8,72.0",
  "M8,24.0C8,43.2 24,28.8 24,48.0L24,72.0",
  "M8,120.0L8,144.0"
];

const ENGLISH_MESSAGES = JSON.parse(
  readFileSync(resolve(process.cwd(), "l10n/web/web.l10n.en.json"), "utf-8")
) as Record<string, string>;

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
    date: 1700000000,
    message: `m ${hash}`,
    refs: [],
    stash: null,
    ...extra
  };
}

function ref(hash: string, name: string, type: GitRef["type"]): GitRef {
  return { hash, name, type };
}

function standardCommits(): GitCommitNode[] {
  return [
    node("N", ["M"]),
    node("M", ["A", "B"], {
      message: MERGE_SUBJECT,
      refs: [
        ref("M", "feature", "head"),
        ref("M", "hotfix", "head"),
        ref("M", "origin/feature", "remote")
      ]
    }),
    node("A", ["R"]),
    node("B", ["R"]),
    node("U", ["R"]),
    node("R", []),
    node("X", [])
  ];
}

function mergeCommits(): GitCommitNode[] {
  return [
    node("m", ["a", "b"]),
    node("n", ["c", "b"]),
    node("a", []),
    node("c", []),
    node("b", ["r"]),
    node("r", [])
  ];
}

const FILE_CHANGE: GitFileChange = {
  oldFilePath: FILE_PATH,
  newFilePath: FILE_PATH,
  type: "M",
  additions: 1,
  deletions: 1
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function dispatch(data: Record<string, unknown>): void {
  window.dispatchEvent(new MessageEvent("message", { data }));
}

function loadCommits(commits: GitCommitNode[]): void {
  dispatch({ command: "loadCommits", commits, head: "N", moreCommitsAvailable: false, hard: true });
}

function loadRepos(repos: string[]): void {
  dispatch({
    command: "loadRepos",
    repos: Object.fromEntries(
      repos.map((repo) => [repo, { columnWidths: null, recentActions: [] }])
    ),
    lastActiveRepo: REPO
  });
}

function fire(target: Element, type: string): void {
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
}

/** The list keys apply from the focused row target (13-keyboard-accessibility-01.md S71). */
function pressKey(key: string): void {
  const target = document.querySelector<HTMLElement>('#commitTable tr[tabindex="0"]');
  expect(target, "row target").not.toBeNull();
  target!.focus();
  target!.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

/** main.ts closes one layer per Escape keydown (13-keyboard-accessibility-01.md S72). */
function pressEscape(): void {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
  );
}

function row(hash: string): HTMLElement {
  const elem = document.querySelector<HTMLElement>(`#commitTable tr.commit[data-hash="${hash}"]`);
  expect(elem, `row ${hash}`).not.toBeNull();
  return elem!;
}

function menuParents(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("#contextMenu li.contextMenuParent"));
}

function highlightParent(): HTMLElement | null {
  return menuParents().find((item) => item.textContent?.startsWith(HIGHLIGHT_TITLE)) ?? null;
}

function submenuItems(parent: HTMLElement): HTMLElement[] {
  const submenu = document.getElementById(`contextSubmenu_${parent.dataset.submenuIndex}`);
  expect(submenu).not.toBeNull();
  return Array.from(submenu!.querySelectorAll<HTMLElement>("li"));
}

/** Opens the row menu, requires the submenu, and clicks the mode item. */
function highlightThroughMenu(hash: string, modeTitle: string): void {
  fire(row(hash), "contextmenu");
  const parent = highlightParent();
  expect(parent, `"${HIGHLIGHT_TITLE}" submenu in the commit context menu`).not.toBeNull();
  const item = submenuItems(parent!).find((candidate) => candidate.textContent === modeTitle);
  expect(item, modeTitle).toBeDefined();
  fire(item!, "click");
}

function bar(): HTMLElement | null {
  return document.getElementById(BAR_ID);
}

function barState(): {
  active: boolean;
  name: string | null;
  hashTitle: string | null;
  mode: string;
} {
  const elem = bar();
  expect(elem, `#${BAR_ID}`).not.toBeNull();
  return {
    active: elem!.classList.contains(CLASS_ACTIVE),
    name: document.getElementById("pathHighlightName")!.textContent,
    hashTitle: document.getElementById("pathHighlightHash")!.getAttribute("title"),
    mode: (document.getElementById("pathHighlightMode") as HTMLSelectElement).value
  };
}

function clearPathHighlight(): void {
  const button = document.getElementById(CLEAR_ID);
  expect(button).not.toBeNull();
  fire(button!, "click");
}

function svg(): SVGSVGElement {
  const elem = document.querySelector<SVGSVGElement>("#commitGraph svg");
  expect(elem).not.toBeNull();
  return elem!;
}

function svgClasses(): string[] {
  return (svg().getAttribute("class") ?? "").split(" ").filter((name) => name !== "");
}

function linePaths(): SVGPathElement[] {
  return Array.from(svg().querySelectorAll<SVGPathElement>("path.line"));
}

function dOf(path: SVGPathElement): string {
  return path.getAttribute("d") ?? "";
}

function selectedLines(): string[] {
  return linePaths()
    .filter((path) => path.classList.contains(CLASS_SELECTED))
    .map(dOf)
    .sort();
}

function unselectedLines(): string[] {
  return linePaths()
    .filter((path) => !path.classList.contains(CLASS_SELECTED))
    .map(dOf)
    .sort();
}

function ringCentres(): string[][] {
  return Array.from(svg().querySelectorAll(`circle.${CLASS_RING}`), (ring) => [
    ring.getAttribute("cx") ?? "",
    ring.getAttribute("cy") ?? ""
  ]);
}

function circleClasses(): Record<string, string> {
  const classes: Record<string, string> = {};
  for (const circle of Array.from(svg().querySelectorAll("circle[data-hash]"))) {
    classes[circle.getAttribute("data-hash")!] = circle.getAttribute("class") ?? "";
  }
  return classes;
}

/** Point sequence of the line paths in document order, with vertical runs merged. */
function pointSequence(paths: SVGPathElement[]): string {
  const tokens =
    paths
      .map(dOf)
      .join("")
      .match(/[MLC][^MLC]*/g) ?? [];
  const segments: { command: string; coords: string; startX: string | null; endX: string }[] = [];
  let current: [string, string] | null = null;
  for (const token of tokens) {
    const command = token[0];
    const coords = token.slice(1).trim();
    const [endX, endY] = (coords.split(" ").pop() ?? "").split(",");
    if (command === "M" && current !== null && endX === current[0] && endY === current[1]) continue;
    const previous = segments[segments.length - 1];
    if (
      command === "L" &&
      current !== null &&
      endX === current[0] &&
      previous !== undefined &&
      previous.command === "L" &&
      previous.startX === endX &&
      previous.endX === endX
    ) {
      previous.coords = `${endX},${endY}`;
      current = [endX, endY];
      continue;
    }
    segments.push({ command, coords, startX: current === null ? null : current[0], endX });
    current = [endX, endY];
  }
  return segments.map((segment) => `${segment.command}${segment.coords}`).join("");
}

function postedCommands(): string[] {
  return vi
    .mocked(vscode.postMessage)
    .mock.calls.map((call) => (call[0] as { command: string }).command);
}

function postCount(): number {
  return vi.mocked(vscode.postMessage).mock.calls.length;
}

function rowsWith(className: string): string[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(`#commitTable tr.commit.${className}`)
  ).map((elem) => elem.dataset.hash!);
}

function historyState(): {
  barActive: boolean;
  position: string;
  match: string[];
  current: string[];
  dim: string[];
  svgHistoryMode: boolean;
} {
  return {
    barActive: document.getElementById(HISTORY_BAR_ID)!.classList.contains(CLASS_ACTIVE),
    position: document.getElementById(HISTORY_POSITION_ID)!.textContent ?? "",
    match: rowsWith("fileHistoryMatch"),
    current: rowsWith("fileHistoryCurrent"),
    dim: rowsWith("fileHistoryDim"),
    svgHistoryMode: svgClasses().includes(CLASS_HISTORY_MODE)
  };
}

/** Expands M, requests the history of its file through the real icon, and accepts the response. */
function startFileHistory(): void {
  fire(row("M"), "click");
  dispatch({
    command: "commitDetails",
    commitDetails: {
      hash: "M",
      parents: ["A", "B"],
      author: "",
      email: "",
      date: 0,
      committer: "",
      committerEmail: "",
      body: "",
      fileChanges: [FILE_CHANGE]
    }
  });
  const icon = document.querySelector<HTMLElement>("#commitDetails .highlightFileHistory");
  expect(icon, "file history icon in the details view").not.toBeNull();
  const postsBefore = postCount();
  fire(icon!, "click");
  const request = vi
    .mocked(vscode.postMessage)
    .mock.calls.slice(postsBefore)
    .map((call) => call[0])
    .find((message) => (message as { command: string }).command === "fileHistory") as
    | { requestId: number }
    | undefined;
  expect(request, "fileHistory request").toBeDefined();
  dispatch({
    command: "fileHistory",
    repo: REPO,
    requestId: request!.requestId,
    anchorHash: "M",
    filePath: FILE_PATH,
    entries: HISTORY_ENTRY_HASHES.map((hash) => ({
      hash,
      parentHashes: [],
      type: "M",
      oldFilePath: FILE_PATH,
      newFilePath: FILE_PATH,
      historicalPath: FILE_PATH,
      isMerge: false
    }))
  });
  expect(historyState().current).toEqual(["M"]);
}

function exitFileHistory(): void {
  fire(document.getElementById(HISTORY_EXIT_ID)!, "click");
}

function closeDetailsIfOpen(): void {
  if (document.getElementById("commitDetails") !== null) pressEscape();
}

/* ------------------------------------------------------------------ */
/* Boot                                                               */
/* ------------------------------------------------------------------ */

const clientHeightGetter = Object.getOwnPropertyDescriptor(Element.prototype, "clientHeight")!.get!;

beforeAll(async () => {
  document.body.innerHTML = [
    '<div id="controls">',
    '<span id="repoControl"><div id="repoSelect" class="dropdown"></div></span>',
    '<div id="branchSelect" class="dropdown"></div>',
    '<div id="authorSelect" class="dropdown"></div>',
    '<input type="checkbox" id="showRemoteBranchesCheckbox" value="1" checked>',
    '<div id="branchCleanupBtn"></div><div id="searchBtn"></div><div id="fetchBtn"></div>',
    '<div id="currentBtn"></div><div id="refreshBtn"></div>',
    "</div>",
    '<div id="branchCleanupPanel" hidden></div>',
    '<div id="scrollContainer"><div id="scrollShadow"></div>',
    '<div id="content"><div id="commitGraph"></div><div id="commitTable"></div></div>',
    '<div id="footer"></div></div>',
    '<ul id="contextMenu"></ul><div id="dialogBacking"></div><div id="dialog"></div>'
  ].join("");
  (globalThis as Record<string, unknown>).viewState = {
    repos: {
      [REPO]: { columnWidths: null, recentActions: [] },
      [OTHER_REPO]: { columnWidths: null, recentActions: [] }
    },
    lastActiveRepo: REPO,
    dateFormat: "Date & Time",
    fetchAvatars: false,
    graphColours: ["#0085d9", "#d9534f"],
    graphStyle: "rounded",
    initialLoadCommits: 300,
    keybindings: { find: "f", refresh: "r", scrollToHead: "h", scrollToStash: "s" },
    loadMoreCommits: 100,
    loadMoreCommitsAutomatically: false,
    showCurrentBranchByDefault: false,
    showRecentActions: true,
    commitOrdering: "date",
    mute: { mergeCommits: false, commitsNotAncestorsOfHead: false },
    dialogDefaults: {
      merge: { noFastForward: true, squashCommits: false, noCommit: false },
      cherryPick: { recordOrigin: false, noCommit: false },
      stashUncommittedChanges: { includeUntracked: false },
      createWorktree: { openTerminal: true },
      removeWorktree: { deleteBranch: true }
    }
  };
  globalThis.webviewMessages = ENGLISH_MESSAGES;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
  );
  // jsdom has no layout: give the header and the commit rows the heights renderGraph() reads.
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (
    this: HTMLElement
  ) {
    if (this.id === "tableColHeaders") return HEADER_CLIENT_HEIGHT;
    if (this.tagName === "TABLE" && this.parentElement?.id === "commitTable") {
      return HEADER_HEIGHT + ROW_HEIGHT * this.querySelectorAll("tr.commit").length;
    }
    return clientHeightGetter.call(this);
  });

  await import("../../web/main");
  dispatch({
    command: "loadBranches",
    branches: ["feature", "hotfix"],
    head: "feature",
    hard: false,
    isRepo: true
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  closeDetailsIfOpen();
  if (document.getElementById(HISTORY_BAR_ID)?.classList.contains(CLASS_ACTIVE)) exitFileHistory();
  closeDetailsIfOpen();
  loadRepos([REPO, OTHER_REPO]);
  dispatch({ command: "selectRepo", repo: REPO });
  loadCommits(standardCommits());
  if (bar()?.classList.contains(CLASS_ACTIVE)) clearPathHighlight();
  vi.mocked(vscode.postMessage).mockClear();
});

/* ------------------------------------------------------------------ */
/* S68: real menu to real SVG                                         */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/main-test/12-path-highlight-01.md
describe("path highlighting through the real commit menu (S68)", () => {
  it("highlights the Direct connections of M from the context menu without a host request (TC-630)", () => {
    // Case: TC-630
    // Given: the standard fixture drawn by the real Graph
    const sequenceBefore = pointSequence(linePaths());
    const postsBefore = postCount();

    // When: the Direct mode is chosen from the real submenu of M's row
    highlightThroughMenu("M", DIRECT_TITLE);

    // Then: the bar shows M, the svg emphasises N->M, M->A, M->B and rings N, M, A, B
    expect(barState()).toEqual({
      active: true,
      name: MERGE_SUBJECT,
      hashTitle: "M",
      mode: DIRECT_TITLE
    });
    expect(svgClasses()).toContain(CLASS_MODE);
    expect(selectedLines()).toEqual([...STANDARD_SELECTED].sort());
    expect(unselectedLines()).toEqual([...STANDARD_UNSELECTED].sort());
    expect(ringCentres()).toEqual(STANDARD_RING_CENTRES);
    expect(pointSequence(linePaths())).toBe(sequenceBefore);
    expect(postCount() - postsBefore).toBe(0);
  });

  it("emphasises the shared trailing part when the selected connection joins an existing line (TC-630)", () => {
    // Case: TC-630 (merge fixture of web/graph-test.md S21)
    // Given: the merge fixture where n -> b joins the m -> b line
    loadCommits(mergeCommits());
    const sequenceBefore = pointSequence(linePaths());
    const postsBefore = postCount();

    // When: the Direct mode is chosen for n
    highlightThroughMenu("n", DIRECT_TITLE);

    // Then: the merge line, the shared part down to b and n -> c are selected; m -> b before the join is not
    expect(barState()).toEqual({ active: true, name: "m n", hashTitle: "n", mode: DIRECT_TITLE });
    expect(selectedLines()).toEqual([...MERGE_SELECTED].sort());
    expect(unselectedLines()).toEqual([...MERGE_UNSELECTED].sort());
    expect(pointSequence(linePaths())).toBe(sequenceBefore);
    expect(postCount() - postsBefore).toBe(0);
  });

  it.each([
    ["history then path", "path first"],
    ["history then path", "history first"],
    ["path then history", "path first"],
    ["path then history", "history first"]
  ])(
    "keeps both highlights independent when started %s and cleared %s (TC-644)",
    (startOrder, clearOrder) => {
      // Case: TC-644
      // Given: file history (match M / R, current M) and the Direct path of M, in the given order
      let pathPosts = 0;
      if (startOrder === "history then path") {
        startFileHistory();
        const historyOnly = { ...historyState(), circles: circleClasses() };
        const postsBefore = postCount();
        highlightThroughMenu("M", DIRECT_TITLE);
        pathPosts += postCount() - postsBefore;
        // Then: the history rows and circles are exactly as without the path highlight
        expect({ ...historyState(), circles: circleClasses() }).toEqual(historyOnly);
      } else {
        const postsBefore = postCount();
        highlightThroughMenu("M", DIRECT_TITLE);
        pathPosts += postCount() - postsBefore;
        startFileHistory();
      }

      // Then: both mode classes, the TC-630 connections, and the history classes coexist
      expect(svgClasses()).toEqual(expect.arrayContaining([CLASS_HISTORY_MODE, CLASS_MODE]));
      expect(selectedLines()).toEqual([...STANDARD_SELECTED].sort());
      expect(ringCentres()).toEqual(STANDARD_RING_CENTRES);
      expect(historyState()).toMatchObject({
        barActive: true,
        match: ["M", "R"],
        current: ["M"],
        dim: ["N", "A", "B", "U", "X"],
        svgHistoryMode: true
      });
      expect(circleClasses()["M"]).toContain("fileHistoryCurrent");
      expect(circleClasses()["N"]).toContain("fileHistoryDim");

      if (clearOrder === "path first") {
        // When: the path highlight is cleared first
        const postsBefore = postCount();
        clearPathHighlight();
        pathPosts += postCount() - postsBefore;

        // Then: the history stays, the path emphasis is gone
        expect(svgClasses()).toEqual([CLASS_HISTORY_MODE]);
        expect(ringCentres()).toEqual([]);
        expect(selectedLines()).toEqual([]);
        expect(historyState()).toMatchObject({
          barActive: true,
          current: ["M"],
          svgHistoryMode: true
        });
      } else {
        // When: the file history is exited first (its snapshot reopens M's details)
        exitFileHistory();

        // Then: the path emphasis stays, the history is gone
        expect(svgClasses()).toEqual([CLASS_MODE]);
        expect(barState()).toMatchObject({ active: true, hashTitle: "M" });
        expect(historyState()).toMatchObject({ barActive: false, match: [], current: [], dim: [] });
        expect(ringCentres()).toEqual(STANDARD_RING_CENTRES);
        closeDetailsIfOpen();
        expect(selectedLines()).toEqual([...STANDARD_SELECTED].sort());
      }
      expect(pathPosts).toBe(0);
    }
  );
});

/* ------------------------------------------------------------------ */
/* fileHistory S11: history contract while a path is highlighted      */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/fileHistory-test.md
describe("file history state while a path is highlighted (S11)", () => {
  it("keeps the history position and movement after the path is cleared first (TC-103)", () => {
    // Case: TC-103
    // Given: an active file history and the Direct path of M
    startFileHistory();
    highlightThroughMenu("M", DIRECT_TITLE);
    const circlesBefore = circleClasses();

    // When: only the path highlight is cleared
    clearPathHighlight();

    // Then: current, position and bar are unchanged and the graph keeps the history classes
    expect(historyState()).toMatchObject({ barActive: true, position: "1 of 2", current: ["M"] });
    expect(circleClasses()).toEqual(circlesBefore);

    // When: the next match is requested with the arrow key
    vi.mocked(vscode.postMessage).mockClear();
    pressKey("ArrowDown");

    // Then: current moves to R, the position follows, and R's details are requested
    expect(historyState()).toMatchObject({ barActive: true, position: "2 of 2", current: ["R"] });
    expect(postedCommands()).toEqual(["commitDetails"]);
    expect(
      (vi.mocked(vscode.postMessage).mock.calls[0][0] as { commitHash: string }).commitHash
    ).toBe("R");
  });

  it("exits the history the same way whether or not a path is highlighted (TC-104)", () => {
    // Case: TC-104
    const observe = (): Record<string, unknown> => ({
      ...historyState(),
      detailsHash: document.getElementById("commitDetails")?.closest("tr")?.previousElementSibling
        ? (
            document.getElementById("commitDetails")!.closest("tr")!
              .previousElementSibling as HTMLElement
          ).dataset.hash
        : null,
      posts: postedCommands()
    });

    // Given: a history exited without any path highlight
    startFileHistory();
    vi.mocked(vscode.postMessage).mockClear();
    exitFileHistory();
    const withoutPath = observe();
    closeDetailsIfOpen();

    // When: the same history is exited while M's path is highlighted
    startFileHistory();
    highlightThroughMenu("M", DIRECT_TITLE);
    vi.mocked(vscode.postMessage).mockClear();
    exitFileHistory();

    // Then: the observable exit record is identical and the history is inactive
    expect(observe()).toEqual(withoutPath);
    expect(historyState()).toMatchObject({ barActive: false, current: [], match: [], dim: [] });
    expect(svgClasses()).toEqual([CLASS_MODE]);
  });
});
