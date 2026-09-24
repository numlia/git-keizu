// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { GitCommitNode, GitRef, WorktreeCollection } from "../../src/types";
import { vscode } from "../../web/utils";

/*
 * Integration tests for web/main.ts with the real RefOverflowController, the real FindWidget and
 * the real contextMenu / dialogs modules (wrapped in call-through spies). They live apart from
 * tests/web/main.test.ts because that file replaces FindWidget and contextMenu with stubs for the
 * whole module graph. This file imports nothing from web/refOverflow.ts so the regression case
 * (TC-427) also runs against the commit before the feature and fails there for a missing counter.
 */

/* ------------------------------------------------------------------ */
/* Hoisted mock state                                                 */
/* ------------------------------------------------------------------ */

const { dropdowns, MENU_ITEMS } = vi.hoisted(() => ({
  dropdowns: {} as Record<
    string,
    {
      callback: ((value: never) => void) | undefined;
      open: boolean;
      close: ReturnType<typeof vi.fn>;
    }
  >,
  // Identity of the builder result forwarded to showContextMenu.
  MENU_ITEMS: [] as unknown[]
}));

/* ------------------------------------------------------------------ */
/* Mocks: collaborators outside the scope of these tests              */
/* ------------------------------------------------------------------ */

vi.mock("../../web/fileHistory", () => ({
  CLASS_FILE_HISTORY_CURRENT: "fileHistoryCurrent",
  CLASS_FILE_HISTORY_NOTE: "fileHistoryNote",
  FileHistoryController: vi.fn(function () {
    return {
      request: vi.fn(),
      handleResponse: vi.fn(),
      onCommitsRendered: vi.fn(),
      onRepositoryChanged: vi.fn(),
      handleCommitRowClick: vi.fn(),
      exit: vi.fn(),
      isActive: vi.fn(() => false),
      isPending: vi.fn(() => false),
      getCurrentHash: vi.fn(() => null),
      getHistoricalPathFor: vi.fn(() => null)
    };
  })
}));

vi.mock("../../web/graph", () => ({
  Graph: vi.fn(function () {
    return {
      loadCommits: vi.fn(),
      render: vi.fn(),
      clear: vi.fn(),
      getVertexColour: vi.fn(() => 0),
      getMutedCommits: vi.fn(() => []),
      getFirstParentIndex: vi.fn(() => -1),
      getFirstChildIndex: vi.fn(() => -1),
      getAlternativeParentIndex: vi.fn(() => -1),
      getAlternativeChildIndex: vi.fn(() => -1),
      getWidth: vi.fn(() => 100),
      getHeight: vi.fn(() => 500),
      limitMaxWidth: vi.fn(),
      setFileHistoryHighlight: vi.fn()
    };
  })
}));

vi.mock("../../web/dropdown", () => ({
  Dropdown: vi.fn(function (id: string, _showInfo: boolean, _label: string, callback?: never) {
    const entry = { callback, open: false, close: vi.fn() };
    dropdowns[id] = entry;
    return {
      setOptions: vi.fn(),
      refresh: vi.fn(),
      isOpen: vi.fn(() => entry.open),
      close: entry.close
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

vi.mock("../../web/dates", () => ({
  getCommitDate: vi.fn(() => ({ title: "2026-01-01", value: "2026-01-01" }))
}));

vi.mock("../../web/fileTree", () => ({
  alterGitFileTree: vi.fn(),
  generateGitFileTree: vi.fn(() => ({
    type: "folder",
    name: "",
    folderPath: "",
    contents: {},
    open: true
  })),
  generateGitFileTreeHtml: vi.fn(() => "<table></table>"),
  generateGitFileListHtml: vi.fn(() => '<ul class="gitFolderContents"></ul>')
}));

/* ------------------------------------------------------------------ */
/* Mocks: menu builders (argument capture) and call-through spies     */
/* ------------------------------------------------------------------ */

vi.mock("../../web/refMenu", () => ({
  buildRefContextMenuItems: vi.fn(() => MENU_ITEMS),
  checkoutBranchAction: vi.fn(),
  showDeleteBranchDialog: vi.fn()
}));

vi.mock("../../web/worktreeMenu", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../web/worktreeMenu")>();
  return { ...actual, buildDetachedWorktreeContextMenuItems: vi.fn(() => MENU_ITEMS) };
});

vi.mock("../../web/stashMenu", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../web/stashMenu")>();
  return {
    ...actual,
    buildStashContextMenuItems: vi.fn(actual.buildStashContextMenuItems)
  };
});

// The real menu keeps its DOM behaviour; the spies only record calls made from other modules.
vi.mock("../../web/contextMenu", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../web/contextMenu")>();
  return {
    ...actual,
    showContextMenu: vi.fn(actual.showContextMenu),
    hideContextMenu: vi.fn(actual.hideContextMenu),
    hideContextMenuListener: vi.fn(actual.hideContextMenuListener),
    isContextMenuActive: vi.fn(actual.isContextMenuActive)
  };
});

vi.mock("../../web/dialogs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../web/dialogs")>();
  return {
    ...actual,
    showConfirmationDialog: vi.fn(actual.showConfirmationDialog),
    showFormDialog: vi.fn(actual.showFormDialog),
    hideDialog: vi.fn(actual.hideDialog),
    isDialogActive: vi.fn(actual.isDialogActive)
  };
});

/* ------------------------------------------------------------------ */
/* Constants and fixtures                                             */
/* ------------------------------------------------------------------ */

const TEST_REPO = "/test/repo";
const OTHER_REPO = "/test/other";
const RECENT_ACTIONS = ["ref.openTerminal"];

// Five long linked-worktree branch names (AC-01).
const LONG_WORKTREES = [
  "worktree-branch-with-a-long-name-amber",
  "worktree-branch-with-a-long-name-birch",
  "worktree-branch-with-a-long-name-cedar",
  "worktree-branch-with-a-long-name-dune",
  "worktree-branch-with-a-long-name-elm"
];
// Outer widths of AC-01: combined main | origin, then the five worktree branches (plan §3.6).
const AC01_OUTER: Readonly<Record<string, number>> = {
  main: 96.4,
  [LONG_WORKTREES[0]]: 232.8,
  [LONG_WORKTREES[1]]: 284.1,
  [LONG_WORKTREES[2]]: 232.8,
  [LONG_WORKTREES[3]]: 284.1,
  [LONG_WORKTREES[4]]: 232.8
};
const AC01_COUNTER = 30.7;
// Description cell border-box for W = 700: padding 4 + 4 and HEAD dot 10 + margin 5.
const AC01_CELL_WIDTH = 723;
// Header outer widths of the graph, date, author and commit columns (sum 330).
const OTHER_HEADER_WIDTHS = [40, 80, 120, 90];
const BADGE_MARGIN = 5;
const DEFAULT_BADGE_OUTER = 50;
const ORIGINAL_REF_WIDTH = 9999;

const FIXTURE_CSS = [
  "#commitTable td { padding-left: 4px; padding-right: 4px; border-left-width: 0px; border-right-width: 0px; }",
  "#commitTable th { padding-left: 12px; padding-right: 12px; border-left-width: 0px; border-right-width: 0px; }",
  "#commitTable table { border-left-width: 0px; border-right-width: 0px; }",
  ".gitRef, .refOverflowCounter, .commitHeadDot { margin-right: 5px; }",
  ".commitMessage { font-size: 13px; }"
].join("\n");

interface MainLayoutFixture {
  cellWidth: number;
  headerClientWidth: number;
  otherHeaderWidths: number[];
  badgeOuter: Record<string, number>;
  counterOuter: number;
  zero: boolean;
  onMeasureRef: ((clone: HTMLElement) => void) | null;
}

const layout: MainLayoutFixture = {
  cellWidth: AC01_CELL_WIDTH,
  headerClientWidth: 200,
  otherHeaderWidths: OTHER_HEADER_WIDTHS,
  badgeOuter: { ...AC01_OUTER },
  counterOuter: AC01_COUNTER,
  zero: false,
  onMeasureRef: null
};

function resetLayout(): void {
  layout.cellWidth = AC01_CELL_WIDTH;
  layout.headerClientWidth = 200;
  layout.otherHeaderWidths = OTHER_HEADER_WIDTHS;
  layout.badgeOuter = { ...AC01_OUTER };
  layout.counterOuter = AC01_COUNTER;
  layout.zero = false;
  layout.onMeasureRef = null;
}

function makeRect(width: number): DOMRect {
  return {
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width,
    height: 18,
    right: width,
    bottom: 18,
    toJSON: () => ({})
  } as DOMRect;
}

function badgeKey(elem: HTMLElement): string {
  return elem.dataset.name ?? elem.dataset.worktreePath ?? elem.textContent ?? "";
}

function fixtureWidth(elem: Element): number {
  if (layout.zero || !(elem instanceof HTMLElement)) return 0;
  const inMeasure = elem.closest(".refOverflowMeasure") !== null;
  if (elem instanceof HTMLTableCellElement && elem.closest("#commitTable") !== null) {
    if (elem.tagName === "TH") {
      return elem.cellIndex === 1
        ? layout.cellWidth
        : layout.otherHeaderWidths[elem.cellIndex === 0 ? 0 : elem.cellIndex - 1];
    }
    return elem.cellIndex === 1 ? layout.cellWidth : 0;
  }
  if (elem.classList.contains("commitHeadDot")) return 10;
  if (elem.classList.contains("gitRef")) {
    if (!inMeasure) return ORIGINAL_REF_WIDTH;
    layout.onMeasureRef?.(elem);
    return (layout.badgeOuter[badgeKey(elem)] ?? DEFAULT_BADGE_OUTER) - BADGE_MARGIN;
  }
  if (elem.classList.contains("refOverflowCounter") && inMeasure) {
    return layout.counterOuter - BADGE_MARGIN;
  }
  return 0;
}

/* --- Frames and observers ------------------------------------------ */

const frames = { queue: new Map<number, FrameRequestCallback>(), nextId: 1, requested: 0 };

function flushFrames(): void {
  const pending = [...frames.queue.values()];
  frames.queue.clear();
  for (const callback of pending) callback(0);
}

class FakeResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

type SavedProperty = [object, string, PropertyDescriptor | undefined];
// File-wide stubs (frames, observers) and per-test stubs (window size) are restored separately.
const fileStubs: SavedProperty[] = [];
const testStubs: SavedProperty[] = [];
function stubProperty(
  target: object,
  key: string,
  value: unknown,
  store: SavedProperty[] = testStubs
): void {
  store.push([target, key, Object.getOwnPropertyDescriptor(target, key)]);
  Object.defineProperty(target, key, { configurable: true, writable: true, value });
}
function restoreProperties(store: SavedProperty[] = testStubs): void {
  for (const [target, key, descriptor] of store.splice(0).reverse()) {
    if (descriptor === undefined) {
      delete (target as Record<string, unknown>)[key];
    } else {
      Object.defineProperty(target, key, descriptor);
    }
  }
}

/* --- Commits ---------------------------------------------------------- */

function hashOf(index: number): string {
  return index.toString(16).padStart(40, "0");
}

function commitOf(
  index: number,
  refs: [string, GitRef["type"]][],
  overrides: Partial<GitCommitNode> = {}
): GitCommitNode {
  return {
    hash: hashOf(index),
    parentHashes: [hashOf(index + 1)],
    author: "Author",
    email: "author@example.com",
    date: 1700000000,
    message: `message ${index}`,
    refs: refs.map(([name, type]) => ({ hash: hashOf(index), name, type })),
    stash: null,
    ...overrides
  };
}

// AC-01: main with origin/main (one combined badge) and five long worktree branches.
function ac01Commits(): GitCommitNode[] {
  return [
    commitOf(1, [
      ["main", "head"],
      ["origin/main", "remote"],
      ...LONG_WORKTREES.map((name): [string, GitRef["type"]] => [name, "head"])
    ]),
    commitOf(2, [], { parentHashes: [] })
  ];
}

const AC01_WORKTREES: WorktreeCollection = {
  branches: Object.fromEntries(
    LONG_WORKTREES.map((name, index) => [name, { path: `/worktrees/${index + 1}`, isMain: false }])
  ),
  detached: []
};

interface LoadOptions {
  readonly commits?: GitCommitNode[];
  readonly worktrees?: WorktreeCollection;
  readonly hard?: boolean;
  readonly flush?: boolean;
}

function dispatchMessage(data: Record<string, unknown>): void {
  window.dispatchEvent(new MessageEvent("message", { data }));
}

function loadCommits(options: LoadOptions = {}): void {
  dispatchMessage({
    command: "loadCommits",
    commits: options.commits ?? ac01Commits(),
    head: hashOf(1),
    moreCommitsAvailable: false,
    hard: options.hard ?? true,
    worktrees: options.worktrees ?? AC01_WORKTREES
  });
  if (options.flush ?? true) flushFrames();
}

function loadRepos(columnWidths: number[] | null, repos: string[] = [TEST_REPO, OTHER_REPO]): void {
  dispatchMessage({
    command: "loadRepos",
    repos: Object.fromEntries(
      repos.map((repo) => [
        repo,
        {
          columnWidths: repo === TEST_REPO ? columnWidths : null,
          recentActions: repo === TEST_REPO ? RECENT_ACTIONS : []
        }
      ])
    ),
    lastActiveRepo: TEST_REPO
  });
}

function currentRepoState(): { columnWidths: number[] | null } {
  return (globalThis as unknown as { viewState: { repos: Record<string, never> } }).viewState.repos[
    TEST_REPO
  ];
}

/* --- DOM queries --------------------------------------------------- */

function commitRow(index = 0): HTMLTableRowElement {
  return document.querySelectorAll<HTMLTableRowElement>("#commitTable tr.commit")[index];
}

function descriptionCell(index = 0): HTMLTableCellElement {
  return commitRow(index).cells[1];
}

function directRefs(cell: HTMLElement): HTMLElement[] {
  return Array.from(cell.querySelectorAll<HTMLElement>(":scope > .gitRef"));
}

function counters(): HTMLButtonElement[] {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>("#commitTable button.refOverflowCounter")
  );
}

function popups(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(".refOverflowPopup"));
}

function tableElem(): HTMLTableElement {
  return document.querySelector<HTMLTableElement>("#commitTable table")!;
}

function contentElem(): HTMLElement {
  return document.getElementById("content")!;
}

function otherHeaders(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("#tableColHeaders > th")).filter(
    (_header, index) => index !== 1
  );
}

function fire(target: Element | Document, type: string, init: MouseEventInit = {}): MouseEvent {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

function openList(rowIndex = 0): HTMLElement {
  const counter = descriptionCell(rowIndex).querySelector(":scope > button.refOverflowCounter")!;
  fire(counter, "click");
  const list = popups();
  expect(list).toHaveLength(1);
  return list[0];
}

function pressEscape(): void {
  document.dispatchEvent(new KeyboardEvent("keyup", { key: "Escape", bubbles: true }));
}

function pressShortcut(key: string): void {
  document.dispatchEvent(new KeyboardEvent("keydown", { key, ctrlKey: true, bubbles: true }));
}

function postedMessages(command: string): Record<string, unknown>[] {
  return vi
    .mocked(vscode.postMessage)
    .mock.calls.map((call) => call[0] as unknown as Record<string, unknown>)
    .filter((message) => message.command === command);
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolveTask) => setTimeout(resolveTask, 0));
}

/* --- Modules loaded after the webview DOM exists -------------------- */

type ContextMenuModule = typeof import("../../web/contextMenu");
type DialogsModule = typeof import("../../web/dialogs");
type RefMenuModule = typeof import("../../web/refMenu");
type WorktreeMenuModule = typeof import("../../web/worktreeMenu");
type StashMenuModule = typeof import("../../web/stashMenu");
type FindWidgetModule = typeof import("../../web/findWidget");

let contextMenu: ContextMenuModule;
let dialogs: DialogsModule;
let refMenu: RefMenuModule;
let worktreeMenu: WorktreeMenuModule;
let stashMenu: StashMenuModule;
let findWidgetModule: FindWidgetModule;
let findWidgetClose: ReturnType<typeof vi.spyOn>;
let styleElem: HTMLStyleElement;

function setupWebviewDom(): void {
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
      [TEST_REPO]: { columnWidths: null, recentActions: RECENT_ACTIONS },
      [OTHER_REPO]: { columnWidths: null, recentActions: [] }
    },
    lastActiveRepo: TEST_REPO,
    dateFormat: "Date & Time",
    fetchAvatars: false,
    graphColours: ["#0085d9"],
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
}

// Closes whatever a previous test left open, then renders the given commits again.
async function resetView(columnWidths: number[] | null, options: LoadOptions = {}): Promise<void> {
  await flushMicrotasks();
  flushFrames();
  for (const entry of Object.values(dropdowns)) entry.open = false;
  if (contextMenu.isContextMenuActive()) contextMenu.hideContextMenu();
  if (dialogs.isDialogActive()) dialogs.hideDialog();
  if (popups().length > 0) fire(document.body, "click");
  const findInput = document.getElementById("findInput") as HTMLInputElement | null;
  if (findInput !== null && document.querySelector(".findWidget.active") !== null) {
    fire(document.getElementById("findClose")!, "click");
  }
  if (document.getElementById("commitDetails") !== null) pressEscape();
  resetLayout();
  loadRepos(columnWidths);
  loadCommits(options);
  await flushMicrotasks();
  flushFrames();
  vi.clearAllMocks();
  frames.requested = 0;
}

beforeAll(async () => {
  styleElem = document.createElement("style");
  styleElem.textContent = FIXTURE_CSS;
  document.head.appendChild(styleElem);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    return makeRect(fixtureWidth(this));
  });
  const clientWidthGetter = Object.getOwnPropertyDescriptor(Element.prototype, "clientWidth")!.get!;
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (
    this: HTMLElement
  ) {
    return this instanceof HTMLTableCellElement && this.tagName === "TH" && this.cellIndex === 1
      ? layout.headerClientWidth
      : clientWidthGetter.call(this);
  });
  stubProperty(
    globalThis,
    "requestAnimationFrame",
    (callback: FrameRequestCallback) => {
      const id = frames.nextId++;
      frames.queue.set(id, callback);
      frames.requested++;
      return id;
    },
    fileStubs
  );
  stubProperty(
    globalThis,
    "cancelAnimationFrame",
    (id: number) => {
      frames.queue.delete(id);
    },
    fileStubs
  );
  stubProperty(globalThis, "ResizeObserver", FakeResizeObserver, fileStubs);
  setupWebviewDom();

  await import("../../web/main");
  contextMenu = await import("../../web/contextMenu");
  dialogs = await import("../../web/dialogs");
  refMenu = await import("../../web/refMenu");
  worktreeMenu = await import("../../web/worktreeMenu");
  stashMenu = await import("../../web/stashMenu");
  findWidgetModule = await import("../../web/findWidget");
  findWidgetClose = vi.spyOn(findWidgetModule.FindWidget.prototype, "close");

  dispatchMessage({
    command: "loadBranches",
    branches: ["main"],
    head: "main",
    hard: false,
    isRepo: true
  });
});

afterEach(() => {
  restoreProperties(testStubs);
});

afterAll(() => {
  restoreProperties(fileStubs);
  vi.restoreAllMocks();
  styleElem.remove();
});

/* ------------------------------------------------------------------ */
/* S56: rendering connection and description minimum width            */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/main-test/01-rendering-02.md
describe("ref overflow rendering and the description column width (S56)", () => {
  beforeEach(async () => {
    await resetView(null);
  });

  it("folds the AC-01 row to the first two badges and +4 and lists the other four (TC-427)", () => {
    // Case: TC-427 (AC-01, main regression)
    // Given: W = 700, outer widths [96.4, 232.8, 284.1, 232.8, 284.1, 232.8] and counter 30.7
    // When: the commits were loaded and the layout frame ran (resetView)
    const cell = descriptionCell(0);
    const refs = directRefs(cell);

    // Then: exactly one +4 counter in the row
    const rowCounters = Array.from(cell.querySelectorAll(":scope > button.refOverflowCounter"));
    expect(rowCounters.map((counter) => counter.textContent)).toEqual(["+4"]);
    // The combined badge and the first worktree stay; the other four keep their order hidden
    expect(refs.map((ref) => ref.dataset.name)).toEqual(["main", ...LONG_WORKTREES]);
    expect(refs.map((ref) => ref.classList.contains("refOverflowHidden"))).toEqual([
      false,
      false,
      true,
      true,
      true,
      true
    ]);

    // When: +4 is clicked
    const list = openList(0);

    // Then: all four hidden worktree branches are listed in order
    const clones = Array.from(list.children) as HTMLElement[];
    expect(clones.map((clone) => clone.dataset.name)).toEqual(LONG_WORKTREES.slice(1));

    // When: the third listed badge is right-clicked
    fire(clones[2], "contextmenu");

    // Then: the menu builder receives the hidden branch and its worktree
    expect(refMenu.buildRefContextMenuItems).toHaveBeenCalledTimes(1);
    expect(refMenu.buildRefContextMenuItems).toHaveBeenCalledWith(
      TEST_REPO,
      LONG_WORKTREES[3],
      clones[2],
      false,
      "main",
      undefined,
      { path: "/worktrees/4", isMainWorktree: false }
    );
  });

  it("never lets existing ref listeners reach the measuring clones (TC-428)", () => {
    // Case: TC-428
    // Given: contextmenu and dblclick dispatched on every clone while it is being measured
    let measuredClones = 0;
    layout.onMeasureRef = (clone) => {
      measuredClones++;
      fire(clone, "contextmenu");
      fire(clone, "dblclick");
    };

    // When: the table is rendered and measured
    loadCommits();

    // Then: neither the menu nor a checkout was triggered
    expect(measuredClones).toBe(6);
    expect(contextMenu.showContextMenu).not.toHaveBeenCalled();
    expect(refMenu.checkoutBranchAction).not.toHaveBeenCalled();
  });

  it("keeps the in-row dblclick checkout on a visible badge (TC-429)", () => {
    // Case: TC-429 (AC-14)
    // Given: the folded AC-01 row
    const badge = descriptionCell(0).querySelector<HTMLElement>('.gitRef[data-name="main"]')!;

    // When: the visible combined badge body is double-clicked
    fire(badge.querySelector(".gitRefName")!, "dblclick");

    // Then: checkout runs once with the raw local name
    expect(refMenu.checkoutBranchAction).toHaveBeenCalledTimes(1);
    expect(refMenu.checkoutBranchAction).toHaveBeenCalledWith(TEST_REPO, badge, "main");
  });

  it("adds nothing to a table without badges (TC-430)", () => {
    // Case: TC-430 (AC-13, onMinimumWidth(null) path)
    // Given/When: only rows without refs are rendered
    loadCommits({ commits: [commitOf(1, []), commitOf(2, [], { parentHashes: [] })] });

    // Then: no counter, unchanged markup and no extra min-width
    expect(counters()).toHaveLength(0);
    expect(descriptionCell(0).innerHTML).toBe(
      '<span class="commitHeadDot"></span><span class="commitMessage"><b>message 1</b></span>'
    );
    expect(contentElem().style.minWidth).toBe("");
    expect(tableElem().style.minWidth).toBe("");
  });

  it("keeps a row whose badges all fit without a counter (TC-430)", () => {
    // Case: TC-430 (AC-13, full-fit row; the minimum still comes from the counter candidates, §3.4)
    // Given/When: a row with two small badges that fit B = 420
    loadCommits({
      commits: [
        commitOf(1, [
          ["main", "head"],
          ["dev", "head"]
        ]),
        commitOf(2, [], { parentHashes: [] })
      ],
      worktrees: { branches: {}, detached: [] }
    });

    // Then: no counter and no hidden ref; the numeric minimum is applied (§3.4 / TC-046)
    expect(counters()).toHaveLength(0);
    expect(descriptionCell(0).querySelectorAll(".refOverflowHidden")).toHaveLength(0);
    expect(directRefs(descriptionCell(0)).map((ref) => ref.dataset.name)).toEqual(["main", "dev"]);
    expect(tableElem().style.minWidth).toBe("405px");
  });

  it("applies other columns + M to #content and the table (TC-431)", () => {
    // Case: TC-431 (AC-11, AC-12)
    // Given: counter candidates 35px wide → M = ceil(8 + 15 + 35 / 0.6) = 82
    layout.counterOuter = 35;

    // When: the table is rendered
    loadCommits();

    // Then: 40 + 80 + 120 + 90 + 82 = 412px on both
    expect(contentElem().style.minWidth).toBe("412px");
    expect(tableElem().style.minWidth).toBe("412px");
  });

  it("distinguishes a valid 64 from null (TC-432)", () => {
    // Case: TC-432
    // Given: counter 20px → 8 + 15 + max(33.3, 32.5) = 56.3 → floor 64
    layout.counterOuter = 20;
    loadCommits();
    // Then: 330 + 64 = 394px
    expect(contentElem().style.minWidth).toBe("394px");
    expect(tableElem().style.minWidth).toBe("394px");

    // When: a table without badges is rendered (null)
    loadCommits({ commits: [commitOf(1, []), commitOf(2, [], { parentHashes: [] })] });
    // Then: both are cleared
    expect(contentElem().style.minWidth).toBe("");
    expect(tableElem().style.minWidth).toBe("");
  });

  it("keeps the applied minimum while the cell cannot be measured (TC-433)", () => {
    // Case: TC-433
    // Given: M = 82 applied
    layout.counterOuter = 35;
    loadCommits();
    expect(tableElem().style.minWidth).toBe("412px");

    // When: every size drops to 0 and a resize triggers a layout
    layout.zero = true;
    window.dispatchEvent(new Event("resize"));
    flushFrames();

    // Then: the previous minimum stays
    expect(contentElem().style.minWidth).toBe("412px");
    expect(tableElem().style.minWidth).toBe("412px");
  });

  it("pins the other columns for display only in auto layout (TC-440)", () => {
    // Case: TC-440
    // Given/When: the auto layout table was rendered and measured (resetView)
    // Then: the other headers are pinned to their content widths (outer − padding 24)
    expect(document.getElementById("commitTable")!.className).toBe("autoLayout");
    expect(otherHeaders().map((header) => header.style.width)).toEqual([
      "16px",
      "56px",
      "96px",
      "66px"
    ]);
    expect(currentRepoState().columnWidths).toBeNull();
    expect(postedMessages("saveRepoState")).toHaveLength(0);
  });

  it.each([
    { branch: "unchanged outer size", outerWidth: null },
    { branch: "changed outer size", outerWidth: 1500 }
  ])("releases the pinned widths and schedules a layout on resize ($branch) (TC-441)", (entry) => {
    // Case: TC-441
    // Given: the pinned auto layout
    if (entry.outerWidth !== null) stubProperty(globalThis, "outerWidth", entry.outerWidth);

    // When: the window is resized
    window.dispatchEvent(new Event("resize"));

    // Then: the pins are released before the layout frame runs, which pins them again
    expect(frames.requested).toBe(1);
    expect(otherHeaders().map((header) => header.style.width)).toEqual(["", "", "", ""]);
    flushFrames();
    expect(otherHeaders().map((header) => header.style.width)).toEqual([
      "16px",
      "56px",
      "96px",
      "66px"
    ]);
  });

  it("keeps the minimum without saving when the window shrinks (TC-438)", () => {
    // Case: TC-438 (AC-11)
    // Given: M = 82 applied
    layout.counterOuter = 35;
    loadCommits();
    vi.mocked(vscode.postMessage).mockClear();

    // When: the window shrinks and the layout runs again
    layout.cellWidth = 300;
    stubProperty(globalThis, "outerWidth", 600);
    window.dispatchEvent(new Event("resize"));
    flushFrames();

    // Then: 412px stays and nothing is saved
    expect(tableElem().style.minWidth).toBe("412px");
    expect(contentElem().style.minWidth).toBe("412px");
    expect(postedMessages("saveRepoState")).toHaveLength(0);
  });

  it("uses a single controller across re-renders (TC-444)", () => {
    // Case: TC-444 (AC-17)
    // Given: the table re-rendered three times
    loadCommits();
    loadCommits();
    loadCommits();
    frames.requested = 0;

    // When: the window is resized once
    window.dispatchEvent(new Event("resize"));

    // Then: one layout frame
    expect(frames.requested).toBe(1);
  });

  it("wires the real FindWidget to the counter highlight (TC-443)", async () => {
    // Case: TC-443 (AC-08)
    // Given: the folded AC-01 row and the real find widget opened with Ctrl+F
    pressShortcut("f");
    const input = document.getElementById("findInput") as HTMLInputElement;

    // When: a term only found in a hidden worktree branch is searched
    input.value = "dune";
    input.dispatchEvent(new KeyboardEvent("keyup", { key: "e", bubbles: true }));
    await new Promise((resolveSearch) =>
      setTimeout(resolveSearch, findWidgetModule.SEARCH_DEBOUNCE_MS + 50)
    );

    // Then: one commit matches, the counter is highlighted and the list stays closed
    expect(document.getElementById("findPosition")!.textContent).toBe("1 of 1");
    const counter = counters()[0];
    expect(counter.classList.contains("refOverflowMatch")).toBe(true);
    expect(counter.textContent).toBe("+4");
    expect(popups()).toHaveLength(0);
    const hidden = descriptionCell(0).querySelector(`[data-name="${LONG_WORKTREES[3]}"]`)!;
    expect(hidden.classList.contains("refOverflowHidden")).toBe(true);
    expect(hidden.querySelectorAll(".findMatch")).toHaveLength(1);
  });

  describe("fixed layout column resizing", () => {
    const SAVED_WIDTHS = [100, 100, 100, 100];

    beforeEach(async () => {
      await resetView([...SAVED_WIDTHS]);
      layout.counterOuter = 35;
      layout.cellWidth = 120;
      loadCommits();
      vi.clearAllMocks();
      frames.requested = 0;
    });

    function drag(col: number, from: number, to: number): HTMLElement {
      const handle = document.querySelector<HTMLElement>(`.resizeCol[data-col="${col}"]`)!;
      fire(handle, "mousedown", { clientX: from });
      const header = document.getElementById("tableColHeaders")!;
      fire(header, "mousemove", { clientX: to });
      return header;
    }

    function savedColumnWidths(): number[][] {
      return postedMessages("saveRepoState").map(
        (message) => (message.state as { columnWidths: number[] }).columnWidths
      );
    }

    function headerWidths(): string[] {
      return Array.from(document.querySelectorAll<HTMLElement>("#tableColHeaders > th")).map(
        (header) => header.style.width
      );
    }

    it("stops case 0 at the description inner width − M (TC-434)", () => {
      // Case: TC-434 (AC-11)
      // Given: M = 82 and a description cell inner width of 120
      // When: the graph / description boundary is dragged 100px right and released
      const header = drag(0, 100, 200);
      fire(header, "mouseup");

      // Then: the delta is limited to 120 − 82 = 38
      expect(headerWidths()[0]).toBe("138px");
      expect(savedColumnWidths()).toEqual([[138, 100, 100, 100]]);
    });

    it("stops case 1 at the description inner width − M (TC-435)", () => {
      // Case: TC-435 (AC-11)
      // When: the description / date boundary is dragged 100px left and released
      const header = drag(1, 200, 100);
      fire(header, "mouseup");

      // Then: the delta is limited to −38 and the date column grows by 38
      expect(headerWidths()[2]).toBe("138px");
      expect(savedColumnWidths()).toEqual([[100, 138, 100, 100]]);
    });

    it("keeps the 40px floor between the other columns (TC-436)", () => {
      // Case: TC-436
      // When: the date / author boundary is dragged 100px left and released
      const header = drag(2, 200, 100);
      fire(header, "mouseup");

      // Then: the date column stops at 40 and the author column takes the rest
      expect(headerWidths()[2]).toBe("40px");
      expect(headerWidths()[3]).toBe("160px");
      expect(savedColumnWidths()).toEqual([[100, 40, 160, 100]]);
    });

    it("applies the minimum to a narrow saved width without saving (TC-437)", async () => {
      // Case: TC-437 (AC-11)
      // Given: narrow saved widths [400, 100, 100, 100] whose headers are 424 / 124 / 124 / 124
      await resetView([400, 100, 100, 100]);
      layout.counterOuter = 35;
      layout.cellWidth = 120;
      layout.otherHeaderWidths = [424, 124, 124, 124];

      // When: the table is rendered with M = 82
      loadCommits();

      // Then: 796 + 82 = 878px keeps the description cell ≥ 82 while the saved widths stay
      expect(tableElem().style.minWidth).toBe("878px");
      expect(contentElem().style.minWidth).toBe("878px");
      expect(document.getElementById("commitTable")!.className).toBe("fixedLayout");
      expect(currentRepoState().columnWidths).toEqual([400, 100, 100, 100]);
      expect(postedMessages("saveRepoState")).toHaveLength(0);
    });

    it("saves only the user's drag, not the automatic correction (TC-439)", () => {
      // Case: TC-439 (AC-11)
      // Given/When: a user drag of case 0 (+20) followed by a resize and another layout
      const header = drag(0, 100, 120);
      fire(header, "mouseup");
      window.dispatchEvent(new Event("resize"));
      flushFrames();

      // Then: exactly one save carrying the dragged widths
      expect(savedColumnWidths()).toEqual([[120, 100, 100, 100]]);
    });

    it("schedules a layout during and after a drag, once per frame (TC-442)", () => {
      // Case: TC-442 (AC-11)
      // When: mousemove twice and mouseup happen in one frame
      const header = drag(0, 100, 110);
      fire(header, "mousemove", { clientX: 115 });
      fire(header, "mouseup");

      // Then: one frame was requested
      expect(frames.requested).toBe(1);

      // When: that frame ran and another drag ends with mouseup alone
      flushFrames();
      frames.requested = 0;
      fire(document.querySelector('.resizeCol[data-col="0"]')!, "mousedown", { clientX: 100 });
      fire(header, "mouseup");

      // Then: mouseup schedules its own layout
      expect(frames.requested).toBe(1);
    });

    it("falls back to the header 64px limit when M is null (TC-432)", () => {
      // Case: TC-432 (null path of the drag limit)
      // Given: a table without badges (M = null) and a description header clientWidth of 200
      loadCommits({ commits: [commitOf(1, []), commitOf(2, [], { parentHashes: [] })] });
      expect(tableElem().style.minWidth).toBe("");

      // When: the description / date boundary is dragged 300px left and released
      const header = drag(1, 400, 100);
      fire(header, "mouseup");

      // Then: the delta stops at −(200 − 64) = −136
      expect(headerWidths()[2]).toBe("236px");
    });
  });
});

/* ------------------------------------------------------------------ */
/* S57: right-click from the row and from the list                    */
/* ------------------------------------------------------------------ */

// Row 1: every kind below an oversized checked-out branch, so all of them are in the list.
function menuCommits(): GitCommitNode[] {
  return [
    commitOf(1, [
      ["main", "head"],
      ["origin/main", "remote"],
      ["feature/x", "head"],
      ["origin/feature/x", "remote"],
      ["origin/dev", "remote"],
      ["v1.0", "tag"],
      ["feat&x", "head"]
    ]),
    commitOf(2, [["stash-side", "head"]], {
      parentHashes: [],
      stash: { selector: "stash@{0}", baseHash: hashOf(3), untrackedFilesHash: null }
    })
  ];
}

const MENU_WORKTREES: WorktreeCollection = {
  branches: { "feature/x": { path: "/tmp/wtx", isMain: false } },
  detached: [{ path: "/tmp/wt8", isMain: false, head: hashOf(1) }]
};

function loadMenuCommits(): void {
  layout.badgeOuter = { main: 900, "@{0}": 900 };
  loadCommits({ commits: menuCommits(), worktrees: MENU_WORKTREES });
  vi.clearAllMocks();
}

function inRow(name: string, rowIndex = 0): HTMLElement {
  return descriptionCell(rowIndex).querySelector<HTMLElement>(
    `:scope > .gitRef[data-name="${name}"]`
  )!;
}

function lastBuilderArgs(): unknown[] {
  const calls = vi.mocked(refMenu.buildRefContextMenuItems).mock.calls;
  expect(calls).toHaveLength(1);
  return calls[0];
}

function withoutSource(args: unknown[]): unknown[] {
  return args.filter((_arg, index) => index !== 2);
}

function rightClickInRowAndInList(
  pickRow: () => Element,
  pickClone: (list: HTMLElement) => Element,
  rowIndex = 0
): { row: unknown[]; list: unknown[]; clone: Element } {
  fire(pickRow(), "contextmenu");
  const row = lastBuilderArgs();
  vi.clearAllMocks();
  const list = openList(rowIndex);
  const target = pickClone(list);
  fire(target, "contextmenu");
  return { row, list: lastBuilderArgs(), clone: target.closest(".gitRef")! };
}

// @see docs/testing/perspectives/web/main-test/02-context-menu-01.md
describe("ref badge right-click from the row and the list (S57)", () => {
  beforeEach(async () => {
    await resetView(null);
    loadMenuCommits();
  });

  it("passes the existing arguments for an in-row worktree branch (TC-445)", () => {
    // Case: TC-445
    // Given: the in-row badge of feature/x (worktree /tmp/wtx, remote origin)
    const badge = inRow("feature/x");

    // When: its body is right-clicked
    fire(badge, "contextmenu");

    // Then: the builder and showContextMenu receive the pre-existing arguments
    expect(refMenu.buildRefContextMenuItems).toHaveBeenCalledTimes(1);
    expect(refMenu.buildRefContextMenuItems).toHaveBeenCalledWith(
      TEST_REPO,
      "feature/x",
      badge,
      false,
      "main",
      ["origin"],
      { path: "/tmp/wtx", isMainWorktree: false }
    );
    const showArgs = vi.mocked(contextMenu.showContextMenu).mock.calls[0];
    expect(showArgs[1]).toBe(MENU_ITEMS);
    expect(showArgs[2]).toBe(badge);
  });

  it("selects the remote of a combined badge (TC-446)", () => {
    // Case: TC-446
    // When: the combined remote label of main is right-clicked
    fire(inRow("main").querySelector(".gitRefHeadRemote")!, "contextmenu");

    // Then: origin/main is handled as a remote without worktree info
    const args = lastBuilderArgs();
    expect([args[1], args[3], args[6]]).toEqual(["origin/main", true, null]);
  });

  it("selects the remote through a search mark inside the remote label (TC-447)", () => {
    // Case: TC-447 (AC-09)
    // Given: the remote label text wrapped in a search mark
    const remote = inRow("main").querySelector(".gitRefHeadRemote")!;
    remote.innerHTML = '<span class="findMatch">ori</span>gin';

    // When: the mark itself is right-clicked
    fire(remote.querySelector(".findMatch")!, "contextmenu");

    // Then: the same arguments as TC-446
    const args = lastBuilderArgs();
    expect([args[1], args[3], args[6]]).toEqual(["origin/main", true, null]);
  });

  it.each([
    { part: "icon", selector: ".codicon" },
    { part: "name", selector: ".gitRefName" }
  ])("selects the local branch for the $part of a combined badge (TC-448)", (entry) => {
    // Case: TC-448
    // When: a non-remote child of the combined badge is right-clicked
    fire(inRow("main").querySelector(entry.selector)!, "contextmenu");

    // Then: the local branch main is used
    const args = lastBuilderArgs();
    expect([args[1], args[3]]).toEqual(["main", false]);
  });

  it("passes the in-row arguments for the listed worktree branch (TC-449)", () => {
    // Case: TC-449 (AC-03)
    // When: feature/x is right-clicked in the row and then in the list
    const result = rightClickInRowAndInList(
      () => inRow("feature/x"),
      (list) => list.querySelector('[data-name="feature/x"]')!
    );

    // Then: every argument but the source element matches, and the clone is the menu source
    expect(withoutSource(result.list)).toEqual(withoutSource(result.row));
    expect(result.list[2]).toBe(result.clone);
    expect(vi.mocked(contextMenu.showContextMenu).mock.calls[0][2]).toBe(result.clone);
  });

  it("selects the remote of a listed combined badge (TC-450)", () => {
    // Case: TC-450 (AC-03)
    // When: the remote label of the listed feature/x | origin clone is right-clicked
    openList(0);
    fire(popups()[0].querySelector('[data-name="feature/x"] .gitRefHeadRemote')!, "contextmenu");

    // Then: origin/feature/x as a remote
    const args = lastBuilderArgs();
    expect([args[1], args[3]]).toEqual(["origin/feature/x", true]);
  });

  it("uses the detached worktree builder for a listed detached worktree (TC-451)", () => {
    // Case: TC-451 (AC-03)
    // When: the listed detached worktree is right-clicked
    const list = openList(0);
    fire(list.querySelector('[data-worktree-path="/tmp/wt8"]')!, "contextmenu");

    // Then: only the detached worktree builder runs with the repo and the path
    expect(worktreeMenu.buildDetachedWorktreeContextMenuItems).toHaveBeenCalledTimes(1);
    expect(worktreeMenu.buildDetachedWorktreeContextMenuItems).toHaveBeenCalledWith(
      TEST_REPO,
      "/tmp/wt8"
    );
    expect(refMenu.buildRefContextMenuItems).not.toHaveBeenCalled();
  });

  it.each(["v1.0", "origin/dev"])("passes the in-row arguments for listed %s (TC-452)", (name) => {
    // Case: TC-452 (AC-03)
    // When: the ref is right-clicked in the row and then in the list
    const result = rightClickInRowAndInList(
      () => inRow(name),
      (list) => list.querySelector(`[data-name="${name}"]`)!
    );

    // Then: identical arguments apart from the source element
    expect(result.list[1]).toBe(name);
    expect(withoutSource(result.list)).toEqual(withoutSource(result.row));
  });

  it("uses the existing ref handling for a stash badge in the row and the list (TC-453)", () => {
    // Case: TC-453 (AC-14)
    // When: the stash badge is right-clicked in the row and then in its list
    const result = rightClickInRowAndInList(
      () => descriptionCell(1).querySelector(":scope > .gitRef.stash")!,
      (list) => list.querySelector(".gitRef.stash")!,
      1
    );

    // Then: the same builder and arguments; no stash-specific builder was involved
    expect(withoutSource(result.list)).toEqual(withoutSource(result.row));
    expect(stashMenu.buildStashContextMenuItems).not.toHaveBeenCalled();
    expect(worktreeMenu.buildDetachedWorktreeContextMenuItems).not.toHaveBeenCalled();
  });

  it("passes a raw special-character name from the list (TC-454)", () => {
    // Case: TC-454
    // When: the listed feat&x is right-clicked
    const list = openList(0);
    fire(list.querySelector('[data-name="feat&x"]')!, "contextmenu");

    // Then: the builder receives the raw name
    expect(lastBuilderArgs()[1]).toBe("feat&x");
  });

  it("forwards the recent actions for a listed badge (TC-456)", () => {
    // Case: TC-456
    // When: a listed badge is right-clicked
    const list = openList(0);
    fire(list.querySelector('[data-name="v1.0"]')!, "contextmenu");

    // Then: showContextMenu receives the repository's recent actions
    expect(vi.mocked(contextMenu.showContextMenu).mock.calls[0][3]).toEqual(RECENT_ACTIONS);
  });
});

// @see docs/testing/perspectives/web/main-test/02-context-menu-01.md
describe("listed badge operations through the real context menu (S57)", () => {
  beforeEach(async () => {
    await resetView(null);
    const actual = await vi.importActual<RefMenuModule>("../../web/refMenu");
    vi.mocked(refMenu.buildRefContextMenuItems).mockImplementation(actual.buildRefContextMenuItems);
    loadMenuCommits();
  });

  afterEach(() => {
    vi.mocked(refMenu.buildRefContextMenuItems).mockImplementation(() => MENU_ITEMS as never);
    if (dialogs.isDialogActive()) dialogs.hideDialog();
  });

  function runRemoveWorktree(badge: Element): { dialogHtml: string; payload: unknown } {
    fire(badge, "contextmenu");
    const more = Array.from(
      document.querySelectorAll<HTMLElement>("#contextMenu li.contextMenuParent")
    ).find((item) => item.textContent?.startsWith("More"))!;
    more.dispatchEvent(new MouseEvent("mouseenter"));
    const item = Array.from(
      document.querySelectorAll<HTMLElement>("ul.contextMenuSubmenu li.contextMenuItem")
    ).find((entry) => entry.textContent?.startsWith("Remove Worktree"))!;
    const listOpenWithMenu = popups().length;
    fire(item, "click");
    const listOpenAfterItem = popups().length;
    const dialogHtml = document.getElementById("dialog")!.innerHTML;
    vi.mocked(vscode.postMessage).mockClear();
    fire(document.getElementById("dialogAction")!, "click");
    const payload = postedMessages("removeWorktree")[0];
    return { dialogHtml, payload: { payload, listOpenWithMenu, listOpenAfterItem } };
  }

  it("runs More › Remove Worktree from the list exactly like from the row (TC-455)", () => {
    // Case: TC-455 (AC-03)
    // Given: the same worktree branch in the row and in the list
    // When: More › Remove Worktree… is chosen and confirmed from the row
    const fromRow = runRemoveWorktree(inRow("feature/x"));
    // When: the same is done from the listed clone
    const list = openList(0);
    const fromList = runRemoveWorktree(list.querySelector('[data-name="feature/x"]')!);

    // Then: the same confirmation dialog and the same message
    expect(fromList.dialogHtml).toBe(fromRow.dialogHtml);
    expect(fromRow.dialogHtml).toContain("/tmp/wtx");
    expect(fromList.payload).toEqual({
      payload: {
        command: "removeWorktree",
        repo: TEST_REPO,
        worktreePath: "/tmp/wtx",
        branchName: "feature/x",
        deleteBranch: true
      },
      listOpenWithMenu: 1,
      listOpenAfterItem: 1
    });
    expect((fromRow.payload as { payload: unknown }).payload).toEqual(
      (fromList.payload as { payload: unknown }).payload
    );
  });
});

/* ------------------------------------------------------------------ */
/* S58: Escape closes the list step by step                           */
/* ------------------------------------------------------------------ */

function expandCommitDetails(): void {
  fire(commitRow(1), "click");
  dispatchMessage({
    command: "commitDetails",
    commitDetails: {
      hash: hashOf(2),
      parents: [],
      author: "",
      email: "",
      date: 0,
      committer: "",
      committerEmail: "",
      body: "",
      fileChanges: []
    }
  });
  expect(document.getElementById("commitDetails")).not.toBeNull();
}

// @see docs/testing/perspectives/web/main-test/04-keyboard-selection-01.md
describe("handleEscape with the ref list (S58)", () => {
  beforeEach(async () => {
    await resetView(null);
  });

  it("closes the list-origin menu first, then only the list (TC-457, TC-458)", () => {
    // Case: TC-457 / TC-458 (AC-04)
    // Given: details expanded, find open, the list open and a menu opened from a clone
    expandCommitDetails();
    pressShortcut("f");
    const list = openList(0);
    fire(list.children[0], "contextmenu");
    expect(contextMenu.isContextMenuActive()).toBe(true);
    vi.clearAllMocks();

    // When: Escape is pressed once (TC-457)
    pressEscape();
    // Then: only the menu closes
    expect(contextMenu.hideContextMenu).toHaveBeenCalledTimes(1);
    expect(dialogs.hideDialog).not.toHaveBeenCalled();
    expect(popups()).toHaveLength(1);

    // When: Escape is pressed again (TC-458)
    pressEscape();
    // Then: only the list closes; find and details stay
    expect(popups()).toHaveLength(0);
    expect(findWidgetClose).not.toHaveBeenCalled();
    expect(document.getElementById("commitDetails")).not.toBeNull();
  });

  it("closes an open dialog before the list (TC-459)", () => {
    // Case: TC-459
    // Given: the list and a dialog
    openList(0);
    dialogs.showConfirmationDialog("Confirm?", () => {}, null);
    vi.clearAllMocks();

    // When: Escape is pressed
    pressEscape();

    // Then: only the dialog closes
    expect(dialogs.hideDialog).toHaveBeenCalledTimes(1);
    expect(popups()).toHaveLength(1);
  });

  it.each(["repoSelect", "branchSelect", "authorSelect"])(
    "closes the open %s dropdown before the list (TC-460)",
    (id) => {
      // Case: TC-460
      // Given: the list and one open dropdown
      openList(0);
      dropdowns[id].open = true;

      // When: Escape is pressed
      pressEscape();

      // Then: only that dropdown closes
      expect(dropdowns[id].close).toHaveBeenCalledTimes(1);
      expect(popups()).toHaveLength(1);
    }
  );

  it("closes the list before find and details (TC-461)", () => {
    // Case: TC-461 (AC-04)
    // Given: details expanded, find open and the list open
    expandCommitDetails();
    pressShortcut("f");
    openList(0);

    // When: Escape is pressed
    pressEscape();

    // Then: only the list closes
    expect(popups()).toHaveLength(0);
    expect(findWidgetClose).not.toHaveBeenCalled();
    expect(document.getElementById("commitDetails")).not.toBeNull();
  });

  it("falls through to find when no list is open (TC-462)", () => {
    // Case: TC-462
    // Given: find open and no list
    pressShortcut("f");

    // When: Escape is pressed
    pressEscape();

    // Then: find closes
    expect(findWidgetClose).toHaveBeenCalledTimes(1);
  });

  it("does nothing when nothing is open (TC-463)", () => {
    // Case: TC-463
    // When: Escape is pressed with everything closed
    pressEscape();

    // Then: no hide / close call and no list
    expect(contextMenu.hideContextMenu).not.toHaveBeenCalled();
    expect(dialogs.hideDialog).not.toHaveBeenCalled();
    for (const entry of Object.values(dropdowns)) expect(entry.close).not.toHaveBeenCalled();
    expect(findWidgetClose).not.toHaveBeenCalled();
    expect(popups()).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* S59: list and controller lifecycle                                 */
/* ------------------------------------------------------------------ */

function openListWithMenu(): { list: HTMLElement; clone: HTMLElement } {
  const list = openList(0);
  const clone = list.children[0] as HTMLElement;
  fire(clone, "contextmenu");
  expect(clone.classList.contains("contextMenuActive")).toBe(true);
  vi.clearAllMocks();
  return { list, clone };
}

async function restoreTestRepo(): Promise<void> {
  dispatchMessage({ command: "selectRepo", repo: TEST_REPO });
  dispatchMessage({
    command: "loadBranches",
    branches: ["main"],
    head: "main",
    hard: true,
    isRepo: true
  });
  await resetView(null);
}

// @see docs/testing/perspectives/web/main-test/05-state-response-02.md
describe("ref list lifecycle on replacement, switching and scrolling (S59)", () => {
  beforeEach(async () => {
    await resetView(null);
  });

  it("closes the list and its menu when changed refs replace the table (TC-464)", () => {
    // Case: TC-464 (AC-06)
    // Given: the list and a list-origin menu
    const { list, clone } = openListWithMenu();

    // When: commits with a new tag are loaded
    const commits = ac01Commits();
    commits[0].refs.push({ hash: hashOf(1), name: "v2.0", type: "tag" });
    loadCommits({ commits });

    // Then: the menu was hidden, the old list is gone and the new table has its counter
    expect(contextMenu.hideContextMenu).toHaveBeenCalled();
    expect(list.isConnected).toBe(false);
    expect(clone.isConnected).toBe(false);
    expect(counters().map((counter) => counter.textContent)).toEqual(["+5"]);
  });

  it("keeps the list on an unchanged update (TC-465)", () => {
    // Case: TC-465 (AC-07)
    // Given: the list open and the applied minimum
    const list = openList(0);
    const minWidth = tableElem().style.minWidth;
    vi.clearAllMocks();

    // When: the same commits arrive without forceRender
    loadCommits({ hard: false });

    // Then: the same list stays and the minimum is untouched
    expect(popups()).toEqual([list]);
    expect(contextMenu.hideContextMenu).not.toHaveBeenCalled();
    expect(minWidth).toBe("405px");
    expect(tableElem().style.minWidth).toBe(minWidth);
    expect(contentElem().style.minWidth).toBe(minWidth);
  });

  it("closes the list when more commits are loaded (TC-466)", () => {
    // Case: TC-466 (AC-06)
    // Given: the list open
    const list = openList(0);
    const clone = list.children[0];

    // When: more commits arrive
    const commits = ac01Commits();
    commits[1].parentHashes = [hashOf(3)];
    commits.push(commitOf(3, [], { parentHashes: [] }));
    loadCommits({ commits });

    // Then: the old list and clones are gone
    expect(popups()).toHaveLength(0);
    expect(clone.isConnected).toBe(false);
  });

  it("closes and detaches before the repository dropdown requests data (TC-467)", async () => {
    // Case: TC-467 (AC-06)
    // Given: the list open; every posted message records the UI state at that moment
    openList(0);
    const states: string[] = [];
    vi.mocked(vscode.postMessage).mockImplementation((message: unknown) => {
      const command = (message as { command: string }).command;
      states.push(`${command}:${popups().length}:${contentElem().style.minWidth}`);
    });

    // When: another repository is chosen
    dropdowns.repoSelect.callback!(OTHER_REPO as never);

    // Then: the load request is sent with no list and no minimum
    expect(states).toContain("loadBranches:0:");
    expect(states.every((state) => state.endsWith(":0:"))).toBe(true);
    vi.mocked(vscode.postMessage).mockImplementation(() => {});
    dropdowns.repoSelect.callback!(TEST_REPO as never);
    await restoreTestRepo();
  });

  it("closes and detaches on selectRepo for a known repository (TC-468)", async () => {
    // Case: TC-468 (AC-06)
    // Given: the list open
    openList(0);

    // When: another known repository is selected
    dispatchMessage({ command: "selectRepo", repo: OTHER_REPO });

    // Then: no list; the controller is detached (minimum cleared, no layout on resize)
    expect(popups()).toHaveLength(0);
    expect(contentElem().style.minWidth).toBe("");
    frames.requested = 0;
    window.dispatchEvent(new Event("resize"));
    expect(frames.requested).toBe(0);
    await restoreTestRepo();
  });

  it("keeps the list when selectRepo names an unknown repository (TC-469)", () => {
    // Case: TC-469
    // Given: the list open
    const list = openList(0);

    // When: an unknown repository is selected
    dispatchMessage({ command: "selectRepo", repo: "/test/unknown" });

    // Then: the early return keeps the list
    expect(popups()).toEqual([list]);
  });

  it("closes and detaches when loadRepos drops the current repository (TC-470)", async () => {
    // Case: TC-470 (AC-06)
    // Given: the list open
    openList(0);

    // When: the repository list no longer contains the current repository
    loadRepos(null, [OTHER_REPO]);

    // Then: no list and no minimum
    expect(popups()).toHaveLength(0);
    expect(contentElem().style.minWidth).toBe("");
    loadRepos(null);
    await restoreTestRepo();
  });

  it("keeps the list when loadRepos still contains the current repository (TC-471)", () => {
    // Case: TC-471
    // Given: the list open
    const list = openList(0);

    // When: the repository list is reloaded with the current repository
    loadRepos(null);

    // Then: the list stays
    expect(popups()).toEqual([list]);
  });

  it("closes and detaches when a hard refresh shows the loading header (TC-472)", async () => {
    // Case: TC-472
    // Given: the list open
    openList(0);

    // When: a hard refresh is requested with Ctrl+R
    pressShortcut("r");

    // Then: the loading header replaced the table with no list and no minimum
    expect(document.getElementById("loadingHeader")).not.toBeNull();
    expect(popups()).toHaveLength(0);
    expect(contentElem().style.minWidth).toBe("");
    await restoreTestRepo();
  });

  it("closes the list and its menu when the table scrolls (TC-473)", () => {
    // Case: TC-473 (AC-06)
    // Given: the list and a list-origin menu
    openListWithMenu();

    // When: the scroll container scrolls
    document.getElementById("scrollContainer")!.dispatchEvent(new Event("scroll"));

    // Then: the list closes and the menu was hidden once
    expect(popups()).toHaveLength(0);
    expect(contextMenu.hideContextMenu).toHaveBeenCalledTimes(1);
  });

  it("keeps the list when the list itself scrolls (TC-474)", () => {
    // Case: TC-474 (AC-07)
    // Given: the list open
    const list = openList(0);

    // When: the list scrolls
    list.dispatchEvent(new Event("scroll"));

    // Then: the list stays
    expect(popups()).toEqual([list]);
  });
});
