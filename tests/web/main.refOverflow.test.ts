// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { GitCommitNode, GitRef, WorktreeCollection } from "../../src/types";
import { vscode } from "../../web/utils";

/*
 * Integration tests for web/main.ts with the real RefOverflowController, the real FindWidget and
 * the real contextMenu / dialogs modules (wrapped in call-through spies). They live apart from
 * tests/web/main.test.ts because that file replaces FindWidget and contextMenu with stubs for the
 * whole module graph. This file imports nothing from web/refOverflow.ts so the regression case
 * (TC-475) also runs against the commit before the feature and fails there for a missing counter.
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

// The real handler runs; the spy only exposes the view instance it receives (S61 guard cases).
vi.mock("../../web/messageHandler", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../web/messageHandler")>();
  return { ...actual, handleMessage: vi.fn(actual.handleMessage) };
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
type MessageHandlerModule = typeof import("../../web/messageHandler");

let contextMenu: ContextMenuModule;
let dialogs: DialogsModule;
let refMenu: RefMenuModule;
let worktreeMenu: WorktreeMenuModule;
let stashMenu: StashMenuModule;
let findWidgetModule: FindWidgetModule;
let messageHandler: MessageHandlerModule;
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
  messageHandler = await import("../../web/messageHandler");
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
/* S60: rendering connection and description minimum width            */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/main-test/01-rendering-03.md
describe("ref overflow rendering and the description column width (S60)", () => {
  beforeEach(async () => {
    await resetView(null);
  });

  it("folds the AC-01 row to the first two badges and +4 and lists the other four (TC-475)", () => {
    // Case: TC-475 (AC-01, main regression)
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

  it("never lets existing ref listeners reach the measuring clones (TC-476)", () => {
    // Case: TC-476
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

  it("keeps the in-row dblclick checkout on a visible badge (TC-477)", () => {
    // Case: TC-477 (AC-14)
    // Given: the folded AC-01 row
    const badge = descriptionCell(0).querySelector<HTMLElement>('.gitRef[data-name="main"]')!;

    // When: the visible combined badge body is double-clicked
    fire(badge.querySelector(".gitRefName")!, "dblclick");

    // Then: checkout runs once with the raw local name
    expect(refMenu.checkoutBranchAction).toHaveBeenCalledTimes(1);
    expect(refMenu.checkoutBranchAction).toHaveBeenCalledWith(TEST_REPO, badge, "main");
  });

  it("adds nothing to a table without badges (TC-478)", () => {
    // Case: TC-478 (AC-13, onMinimumWidth(null) path)
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

  it("keeps a row whose badges all fit without a counter (TC-479)", () => {
    // Case: TC-479 (AC-13, full-fit row; the minimum still comes from the counter candidates, §3.4)
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

  it("applies other columns + M to #content and the table (TC-480)", () => {
    // Case: TC-480 (AC-11, AC-12)
    // Given: counter candidates 35px wide → M = ceil(8 + 15 + 35 / 0.6) = 82
    layout.counterOuter = 35;

    // When: the table is rendered
    loadCommits();

    // Then: 40 + 80 + 120 + 90 + 82 = 412px on both
    expect(contentElem().style.minWidth).toBe("412px");
    expect(tableElem().style.minWidth).toBe("412px");
  });

  it("distinguishes a valid 64 from null (TC-481)", () => {
    // Case: TC-481
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

  it("keeps the applied minimum while the cell cannot be measured (TC-482)", () => {
    // Case: TC-482
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

  it("pins the other columns for display only in auto layout (TC-489)", () => {
    // Case: TC-489
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
  ])("releases the pinned widths and schedules a layout on resize ($branch) (TC-490)", (entry) => {
    // Case: TC-490
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

  it("keeps the minimum without saving when the window shrinks (TC-487)", () => {
    // Case: TC-487 (AC-11)
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

  it("uses a single controller across re-renders (TC-493)", () => {
    // Case: TC-493 (AC-17)
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

  it("wires the real FindWidget to the counter highlight (TC-492)", async () => {
    // Case: TC-492 (AC-08)
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

    it("stops case 0 at the description inner width − M (TC-483)", () => {
      // Case: TC-483 (AC-11)
      // Given: M = 82 and a description cell inner width of 120
      // When: the graph / description boundary is dragged 100px right and released
      const header = drag(0, 100, 200);
      fire(header, "mouseup");

      // Then: the delta is limited to 120 − 82 = 38
      expect(headerWidths()[0]).toBe("138px");
      expect(savedColumnWidths()).toEqual([[138, 100, 100, 100]]);
    });

    it("stops case 1 at the description inner width − M (TC-484)", () => {
      // Case: TC-484 (AC-11)
      // When: the description / date boundary is dragged 100px left and released
      const header = drag(1, 200, 100);
      fire(header, "mouseup");

      // Then: the delta is limited to −38 and the date column grows by 38
      expect(headerWidths()[2]).toBe("138px");
      expect(savedColumnWidths()).toEqual([[100, 138, 100, 100]]);
    });

    it("keeps the 40px floor between the other columns (TC-485)", () => {
      // Case: TC-485
      // When: the date / author boundary is dragged 100px left and released
      const header = drag(2, 200, 100);
      fire(header, "mouseup");

      // Then: the date column stops at 40 and the author column takes the rest
      expect(headerWidths()[2]).toBe("40px");
      expect(headerWidths()[3]).toBe("160px");
      expect(savedColumnWidths()).toEqual([[100, 40, 160, 100]]);
    });

    it("applies the minimum to a narrow saved width without saving (TC-486)", async () => {
      // Case: TC-486 (AC-11)
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

    it("saves only the user's drag, not the automatic correction (TC-488)", () => {
      // Case: TC-488 (AC-11)
      // Given/When: a user drag of case 0 (+20) followed by a resize and another layout
      const header = drag(0, 100, 120);
      fire(header, "mouseup");
      window.dispatchEvent(new Event("resize"));
      flushFrames();

      // Then: exactly one save carrying the dragged widths
      expect(savedColumnWidths()).toEqual([[120, 100, 100, 100]]);
    });

    it("schedules a layout during and after a drag, once per frame (TC-491)", () => {
      // Case: TC-491 (AC-11)
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

    it("falls back to the header 64px limit when M is null (TC-481)", () => {
      // Case: TC-481 (null path of the drag limit)
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

  it("opens the stash menu from the stash badge in the row and in the list (TC-453)", () => {
    // Case: TC-453 (AC-14)
    // Given: the stash row (hashOf(2), stash@{0}) and its in-row stash badge
    const row = commitRow(1);
    const rowBadge = descriptionCell(1).querySelector<HTMLElement>(":scope > .gitRef.stash")!;
    expect(rowBadge.getAttribute("data-stash-hash")).toBe(hashOf(2));
    expect(inRow("stash-side", 1).getAttribute("data-stash-hash")).toBeNull();

    // When: the in-row badge is right-clicked
    fire(rowBadge, "contextmenu");

    // Then: the stash builder gets the original row and the badge is the menu source
    expect(stashMenu.buildStashContextMenuItems).toHaveBeenCalledTimes(1);
    const rowBuilderArgs = vi.mocked(stashMenu.buildStashContextMenuItems).mock.calls[0];
    expect(rowBuilderArgs[0]).toBe(TEST_REPO);
    expect(rowBuilderArgs[1]).toBe(hashOf(2));
    expect(rowBuilderArgs[2]).toBe("stash@{0}");
    expect(rowBuilderArgs[3]).toBe(row);
    expect(contextMenu.showContextMenu).toHaveBeenCalledTimes(1);
    const rowShowArgs = vi.mocked(contextMenu.showContextMenu).mock.calls[0];
    expect(rowShowArgs[2]).toBe(rowBadge);
    expect(rowShowArgs[3]).toEqual(RECENT_ACTIONS);
    expect(refMenu.buildRefContextMenuItems).not.toHaveBeenCalled();
    expect(worktreeMenu.buildDetachedWorktreeContextMenuItems).not.toHaveBeenCalled();

    // When: the listed clone of the same badge is right-clicked
    vi.mocked(stashMenu.buildStashContextMenuItems).mockClear();
    vi.mocked(contextMenu.showContextMenu).mockClear();
    const list = openList(1);
    const clone = list.querySelector<HTMLElement>(".gitRef.stash")!;
    expect(clone).not.toBe(rowBadge);
    expect(clone.getAttribute("data-stash-hash")).toBe(hashOf(2));
    fire(clone, "contextmenu");

    // Then: the builder still gets the original row while the clone is the menu source
    expect(stashMenu.buildStashContextMenuItems).toHaveBeenCalledTimes(1);
    const listBuilderArgs = vi.mocked(stashMenu.buildStashContextMenuItems).mock.calls[0];
    expect(listBuilderArgs[0]).toBe(TEST_REPO);
    expect(listBuilderArgs[1]).toBe(hashOf(2));
    expect(listBuilderArgs[2]).toBe("stash@{0}");
    expect(listBuilderArgs[3]).toBe(row);
    expect(contextMenu.showContextMenu).toHaveBeenCalledTimes(1);
    const listShowArgs = vi.mocked(contextMenu.showContextMenu).mock.calls[0];
    expect(listShowArgs[2]).toBe(clone);
    expect(listShowArgs[3]).toEqual(RECENT_ACTIONS);
    expect(refMenu.buildRefContextMenuItems).not.toHaveBeenCalled();
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

/* ------------------------------------------------------------------ */
/* S61: stash label right-click, operations and lifecycle             */
/* ------------------------------------------------------------------ */

interface StashFixture {
  readonly name: string;
  readonly index: number;
  readonly hash: string;
  readonly selector: string;
  readonly rowIndex: number;
}

// Two stashes whose numbers match neither their row index nor each other (plan §3.6).
const STASH_A: StashFixture = {
  name: "A",
  index: 11,
  hash: hashOf(11),
  selector: "stash@{2}",
  rowIndex: 0
};
const STASH_B: StashFixture = {
  name: "B",
  index: 22,
  hash: hashOf(22),
  selector: "stash@{7}",
  rowIndex: 1
};
const STASHES = [STASH_A, STASH_B];
const NORMAL_COMMIT_ROW = 2;
const STASH_HASH_ATTRIBUTE = "data-stash-hash";
const STASH_LABEL_SELECTOR = ".gitRef.stash";
const ROW_BODY_SELECTOR = ".commitMessage";
const HIDDEN_CLASS = "refOverflowHidden";
const CONTEXT_MENU_ACTIVE_CLASS = "contextMenuActive";
const DIALOG_ACTIVE_CLASS = "dialogActive";
const FIND_MATCH_CLASS = "findMatch";
const UNKNOWN_HASH = hashOf(99);
const OUT_OF_RANGE_INDEX = 99;
const OVERSIZED_BADGE_OUTER = 900;
const CREATE_BRANCH_NAME = "from-stash-test";
const SIBLING_WORKTREE_PATH = "/tmp/wtx";
const DETACHED_WORKTREE_PATH = "/tmp/wt8";
const FIND_TERM = `message ${STASH_A.index}`;
const STASH_WORKTREES: WorktreeCollection = {
  branches: { "feature/wt": { path: SIBLING_WORKTREE_PATH, isMain: false } },
  detached: [{ path: DETACHED_WORKTREE_PATH, isMain: false, head: STASH_A.hash }]
};
// Rendered texts: the stash keys fall back to themselves, "context.more" comes from the catalogue.
const MENU_APPLY = "Apply Stash…";
const MENU_POP = "Pop Stash…";
const MENU_MORE = "More...";
const MENU_CREATE_BRANCH = "Create Branch from Stash…";
const MENU_DROP = "Drop Stash…";
const MENU_COPY_NAME = "Copy Stash Name to Clipboard";
const MENU_COPY_HASH = "Copy Stash Hash to Clipboard";
const MENU_COPY_COMMIT_HASH = "Copy Commit Hash to Clipboard";
const STASH_MENU_STRUCTURE = [
  { kind: "item", text: MENU_APPLY },
  { kind: "item", text: MENU_POP },
  { kind: "divider" },
  { kind: "parent", text: MENU_MORE, children: [MENU_CREATE_BRANCH, MENU_DROP] },
  { kind: "divider" },
  { kind: "item", text: MENU_COPY_NAME },
  { kind: "item", text: MENU_COPY_HASH }
];

type Placement = "row" | "list";
const PLACEMENTS: Placement[] = ["row", "list"];
type LabelPart = "icon" | "search mark" | "body";
type MenuPath = "row body" | "in-row label" | "list clone";
const MENU_PATHS: MenuPath[] = ["row body", "in-row label", "list clone"];

// Narrow structural view of the instance handed to handleMessage; only the guard cases replace
// its lookup / commits with copies and restore the originals afterwards.
interface ViewInternals {
  commitLookup: Record<string, unknown>;
  commits: Array<GitCommitNode | undefined>;
}
let view: ViewInternals;

function stashCommit(stash: StashFixture, refs: [string, GitRef["type"]][]): GitCommitNode {
  return commitOf(stash.index, refs, {
    parentHashes: [hashOf(1)],
    stash: { selector: stash.selector, baseHash: hashOf(1), untrackedFilesHash: null }
  });
}

// Row A carries every non-stash label kind next to its stash label (TC-515 – TC-520).
function stashCommits(): GitCommitNode[] {
  return [
    stashCommit(STASH_A, [
      ["main", "head"],
      ["origin/main", "remote"],
      ["feature/x", "head"],
      ["origin/dev", "remote"],
      ["v1.0", "tag"],
      ["feature/wt", "head"]
    ]),
    stashCommit(STASH_B, []),
    commitOf(1, [], { parentHashes: [] })
  ];
}

function stashDisplay(stash: StashFixture): string {
  return stash.selector.substring("stash".length);
}

function latestView(): ViewInternals {
  const calls = vi.mocked(messageHandler.handleMessage).mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1][1] as unknown as ViewInternals;
}

// folded: the stash label is oversized, so it and every label behind it move into the list.
function loadStashCommits(folded: boolean): void {
  layout.badgeOuter = folded
    ? {
        [stashDisplay(STASH_A)]: OVERSIZED_BADGE_OUTER,
        [stashDisplay(STASH_B)]: OVERSIZED_BADGE_OUTER
      }
    : {};
  loadCommits({ commits: stashCommits(), worktrees: STASH_WORKTREES });
  view = latestView();
  vi.clearAllMocks();
}

function requireElement<T extends Element>(elem: T | null | undefined, description: string): T {
  if (elem === null || elem === undefined) throw new Error(`${description} is not rendered`);
  return elem;
}

function rowBody(stash: StashFixture): HTMLElement {
  return requireElement(
    commitRow(stash.rowIndex).querySelector<HTMLElement>(ROW_BODY_SELECTOR),
    `row body of stash ${stash.name}`
  );
}

function rowStashLabel(stash: StashFixture): HTMLElement {
  const label = requireElement(
    descriptionCell(stash.rowIndex).querySelector<HTMLElement>(`:scope > ${STASH_LABEL_SELECTOR}`),
    `in-row stash label ${stash.name}`
  );
  expect(label.classList.contains(HIDDEN_CLASS)).toBe(false);
  return label;
}

function listedStashClone(stash: StashFixture): HTMLElement {
  const hidden = requireElement(
    descriptionCell(stash.rowIndex).querySelector<HTMLElement>(`:scope > ${STASH_LABEL_SELECTOR}`),
    `folded stash label ${stash.name}`
  );
  expect(hidden.classList.contains(HIDDEN_CLASS)).toBe(true);
  const clone = requireElement(
    openList(stash.rowIndex).querySelector<HTMLElement>(STASH_LABEL_SELECTOR),
    `listed stash clone ${stash.name}`
  );
  expect(clone).not.toBe(hidden);
  return clone;
}

function stashLabelAt(stash: StashFixture, placement: Placement): HTMLElement {
  return placement === "row" ? rowStashLabel(stash) : listedStashClone(stash);
}

// Replaces the label's text node with a search mark, as the real FindWidget does for a match.
function wrapTextInFindMatch(label: HTMLElement): HTMLElement {
  const text = Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
  if (text === undefined) throw new Error("stash label has no text node");
  const mark = document.createElement("span");
  mark.className = FIND_MATCH_CLASS;
  mark.textContent = text.textContent;
  label.replaceChild(mark, text);
  return mark;
}

// The label body stands in for its padding; real padding coordinates are a manual check.
function labelTarget(label: HTMLElement, part: LabelPart): Element {
  if (part === "icon") return requireElement(label.querySelector(".codicon"), "stash icon");
  if (part === "search mark") return wrapTextInFindMatch(label);
  return label;
}

// A listener that throws is reported by jsdom as a window error instead of from dispatchEvent.
function fireCountingWindowErrors(target: Element, type: string): number {
  const onError = vi.fn();
  window.addEventListener("error", onError);
  try {
    fire(target, type);
  } finally {
    window.removeEventListener("error", onError);
  }
  return onError.mock.calls.length;
}

function postedPayloads(): unknown[] {
  return vi.mocked(vscode.postMessage).mock.calls.map((call) => call[0]);
}

function expectStashMenuFrom(stash: StashFixture, source: HTMLElement): void {
  const row = commitRow(stash.rowIndex);
  expect(row.dataset.hash).toBe(stash.hash);
  expect(stashMenu.buildStashContextMenuItems).toHaveBeenCalledTimes(1);
  const builder = vi.mocked(stashMenu.buildStashContextMenuItems).mock;
  expect(builder.calls[0][0]).toBe(TEST_REPO);
  expect(builder.calls[0][1]).toBe(stash.hash);
  expect(builder.calls[0][2]).toBe(stash.selector);
  expect(builder.calls[0][3]).toBe(row);
  expect(contextMenu.showContextMenu).toHaveBeenCalledTimes(1);
  const showArgs = vi.mocked(contextMenu.showContextMenu).mock.calls[0];
  expect(showArgs[1]).toBe(builder.results[0].value);
  expect(showArgs[2]).toBe(source);
  expect(showArgs[3]).toEqual(RECENT_ACTIONS);
  expect(refMenu.buildRefContextMenuItems).not.toHaveBeenCalled();
  expect(worktreeMenu.buildDetachedWorktreeContextMenuItems).not.toHaveBeenCalled();
}

function expectNotAimedAt(other: StashFixture): void {
  const builderArgs = vi.mocked(stashMenu.buildStashContextMenuItems).mock.calls[0];
  expect(builderArgs[1]).not.toBe(other.hash);
  expect(builderArgs[2]).not.toBe(other.selector);
  expect(builderArgs[3]).not.toBe(commitRow(other.rowIndex));
}

function expectNothingOpened(windowErrors: number): void {
  expect(windowErrors).toBe(0);
  expect(contextMenu.showContextMenu).not.toHaveBeenCalled();
  expect(contextMenu.isContextMenuActive()).toBe(false);
  expect(stashMenu.buildStashContextMenuItems).not.toHaveBeenCalled();
  expect(refMenu.buildRefContextMenuItems).not.toHaveBeenCalled();
  expect(worktreeMenu.buildDetachedWorktreeContextMenuItems).not.toHaveBeenCalled();
  expect(vscode.postMessage).not.toHaveBeenCalled();
}

function commitsWithStash(
  stash: StashFixture,
  value: GitCommitNode["stash"] | undefined
): Array<GitCommitNode | undefined> {
  return view.commits.map((commit) =>
    commit !== undefined && commit.hash === stash.hash
      ? ({ ...commit, stash: value } as GitCommitNode)
      : commit
  );
}

function commitsWithSelector(
  stash: StashFixture,
  selector: string
): Array<GitCommitNode | undefined> {
  return view.commits.map((commit) =>
    commit !== undefined && commit.hash === stash.hash && commit.stash !== null
      ? { ...commit, stash: { ...commit.stash, selector } }
      : commit
  );
}

/* --- Real menu and dialog DOM ---------------------------------------- */

function menuItems(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("#contextMenu > li"));
}

function openMore(): HTMLElement {
  const more = requireElement(
    document.querySelector<HTMLElement>("#contextMenu li.contextMenuParent"),
    "More item"
  );
  more.dispatchEvent(new MouseEvent("mouseenter"));
  return requireElement(
    document.querySelector<HTMLElement>("ul.contextMenuSubmenu.active"),
    "More submenu"
  );
}

// Reads the rendered menu: item texts, dividers and the More children once it is opened.
function menuStructure(): unknown[] {
  return menuItems().map((item) => {
    if (item.classList.contains("contextMenuDivider")) return { kind: "divider" };
    if (item.classList.contains("contextMenuParent")) {
      const children = Array.from(openMore().querySelectorAll("li"));
      return {
        kind: "parent",
        text: item.childNodes[0].textContent,
        children: children.map((child) => child.textContent)
      };
    }
    return { kind: "item", text: item.textContent };
  });
}

function clickMenuItem(text: string): void {
  const item = menuItems().find((entry) => entry.textContent === text);
  fire(requireElement(item, `menu item ${text}`), "click");
}

function clickMoreItem(text: string): void {
  const item = Array.from(openMore().querySelectorAll<HTMLElement>("li.contextMenuItem")).find(
    (entry) => entry.textContent === text
  );
  fire(requireElement(item, `More item ${text}`), "click");
}

function dialogElem(): HTMLElement {
  return requireElement(document.getElementById("dialog"), "dialog");
}

function dialogInput(): HTMLInputElement {
  return requireElement(document.querySelector<HTMLInputElement>("#dialogInput0"), "dialog input");
}

function clickDialogButton(id: "dialogAction" | "dialogDismiss"): void {
  fire(requireElement(document.getElementById(id), id), "click");
}

function confirmCheckboxDialog(reinstateIndex: boolean): void {
  const box = dialogInput();
  expect(box.type).toBe("checkbox");
  expect(box.checked).toBe(false);
  box.checked = reinstateIndex;
  clickDialogButton("dialogAction");
}

function submitRefInputDialog(name: string): void {
  const input = dialogInput();
  expect(input.type).toBe("text");
  expect(input.value).toBe("");
  input.value = name;
  input.dispatchEvent(new Event("input"));
  clickDialogButton("dialogAction");
}

function confirmDeleteDialog(selector: string): void {
  expect(dialogs.isDialogActive()).toBe(true);
  expect(document.getElementById("dialogInput0")).toBeNull();
  expect(dialogElem().textContent).toContain(selector);
  clickDialogButton("dialogAction");
}

function applyStashPayload(stash: StashFixture, reinstateIndex: boolean): Record<string, unknown> {
  return { command: "applyStash", repo: TEST_REPO, selector: stash.selector, reinstateIndex };
}

function popStashPayload(stash: StashFixture, reinstateIndex: boolean): Record<string, unknown> {
  return { command: "popStash", repo: TEST_REPO, selector: stash.selector, reinstateIndex };
}

function branchFromStashPayload(stash: StashFixture): Record<string, unknown> {
  return {
    command: "branchFromStash",
    repo: TEST_REPO,
    branchName: CREATE_BRANCH_NAME,
    selector: stash.selector
  };
}

function dropStashPayload(stash: StashFixture): Record<string, unknown> {
  return { command: "dropStash", repo: TEST_REPO, selector: stash.selector };
}

function copyPayload(type: string, data: string): Record<string, unknown> {
  return { command: "copyToClipboard", type, data };
}

interface StashOperation {
  readonly id: string;
  readonly operation: string;
  readonly run: (stash: StashFixture) => void;
  readonly expected: (stash: StashFixture) => Record<string, unknown>;
}

const STASH_OPERATIONS: StashOperation[] = [
  {
    id: "TC-522",
    operation: "Apply Stash with Reinstate Index off",
    run: () => {
      clickMenuItem(MENU_APPLY);
      confirmCheckboxDialog(false);
    },
    expected: (stash) => applyStashPayload(stash, false)
  },
  {
    id: "TC-523",
    operation: "Apply Stash with Reinstate Index on",
    run: () => {
      clickMenuItem(MENU_APPLY);
      confirmCheckboxDialog(true);
    },
    expected: (stash) => applyStashPayload(stash, true)
  },
  {
    id: "TC-524",
    operation: "Pop Stash with Reinstate Index off",
    run: () => {
      clickMenuItem(MENU_POP);
      confirmCheckboxDialog(false);
    },
    expected: (stash) => popStashPayload(stash, false)
  },
  {
    id: "TC-525",
    operation: "Pop Stash with Reinstate Index on",
    run: () => {
      clickMenuItem(MENU_POP);
      confirmCheckboxDialog(true);
    },
    expected: (stash) => popStashPayload(stash, true)
  },
  {
    id: "TC-526",
    operation: "More > Create Branch from Stash",
    run: () => {
      clickMoreItem(MENU_CREATE_BRANCH);
      submitRefInputDialog(CREATE_BRANCH_NAME);
    },
    expected: branchFromStashPayload
  },
  {
    id: "TC-527",
    operation: "More > Drop Stash",
    run: (stash) => {
      clickMoreItem(MENU_DROP);
      confirmDeleteDialog(stash.selector);
    },
    expected: dropStashPayload
  },
  {
    id: "TC-528",
    operation: "Copy Stash Name",
    run: () => {
      clickMenuItem(MENU_COPY_NAME);
      expect(dialogs.isDialogActive()).toBe(false);
    },
    expected: (stash) => copyPayload("Stash Name", stash.selector)
  },
  {
    id: "TC-529",
    operation: "Copy Stash Hash",
    run: () => {
      clickMenuItem(MENU_COPY_HASH);
      expect(dialogs.isDialogActive()).toBe(false);
    },
    expected: (stash) => copyPayload("Stash Hash", stash.hash)
  }
];

const OPERATION_CASES = STASH_OPERATIONS.flatMap((operation) =>
  STASHES.flatMap((stash) =>
    MENU_PATHS.map((path) => ({
      id: operation.id,
      operationName: operation.operation,
      command: operation.expected(stash).command,
      stashName: stash.name,
      selector: stash.selector,
      operation,
      stash,
      path
    }))
  )
);

function menuTarget(stash: StashFixture, path: MenuPath): Element {
  if (path === "row body") return rowBody(stash);
  return path === "in-row label" ? rowStashLabel(stash) : listedStashClone(stash);
}

// Opens the real menu from the target, runs the operation and returns every message it posted.
function runStashOperation(
  target: Element,
  operation: StashOperation,
  stash: StashFixture
): unknown[] {
  fire(target, "contextmenu");
  expect(contextMenu.isContextMenuActive()).toBe(true);
  vi.mocked(vscode.postMessage).mockClear();
  operation.run(stash);
  expect(dialogs.isDialogActive()).toBe(false);
  return postedPayloads();
}

/* --- Routing ----------------------------------------------------------- */

interface RoutingInput {
  readonly id: string;
  readonly stash: StashFixture;
  readonly stashName: string;
  readonly selector: string;
  readonly placement: Placement;
  readonly part: LabelPart;
}

function routingInput(
  id: string,
  stash: StashFixture,
  placement: Placement,
  part: LabelPart
): RoutingInput {
  return { id, stash, stashName: stash.name, selector: stash.selector, placement, part };
}

const ROUTING_INPUTS: RoutingInput[] = [
  routingInput("TC-494", STASH_A, "row", "icon"),
  routingInput("TC-495", STASH_A, "row", "search mark"),
  routingInput("TC-496", STASH_A, "row", "body"),
  routingInput("TC-497", STASH_A, "list", "icon"),
  routingInput("TC-498", STASH_A, "list", "search mark"),
  routingInput("TC-499", STASH_A, "list", "body"),
  routingInput("TC-500", STASH_B, "row", "icon"),
  routingInput("TC-501", STASH_B, "row", "search mark"),
  routingInput("TC-502", STASH_B, "row", "body"),
  routingInput("TC-503", STASH_B, "list", "icon"),
  routingInput("TC-504", STASH_B, "list", "search mark"),
  routingInput("TC-505", STASH_B, "list", "body")
];

interface InvalidStateContext {
  readonly label: HTMLElement;
  readonly row: HTMLTableRowElement;
  readonly placement: Placement;
}

interface InvalidState {
  readonly id: string;
  readonly state: string;
  readonly apply: (context: InvalidStateContext) => void;
}

const INVALID_STATES: InvalidState[] = [
  {
    id: "TC-506",
    state: "the hash attribute is removed",
    apply: ({ label }) => label.removeAttribute(STASH_HASH_ATTRIBUTE)
  },
  {
    id: "TC-507",
    state: "the hash attribute is empty",
    apply: ({ label }) => label.setAttribute(STASH_HASH_ATTRIBUTE, "")
  },
  {
    id: "TC-508",
    state: "the hash attribute is unknown",
    apply: ({ label }) => label.setAttribute(STASH_HASH_ATTRIBUTE, UNKNOWN_HASH)
  },
  {
    id: "TC-509",
    state: "the lookup value is a string",
    apply: () => {
      view.commitLookup = { ...view.commitLookup, [STASH_A.hash]: "0" };
    }
  },
  {
    id: "TC-510",
    state: "the lookup index is out of range",
    apply: () => {
      view.commitLookup = { ...view.commitLookup, [STASH_A.hash]: OUT_OF_RANGE_INDEX };
    }
  },
  {
    id: "TC-511",
    state: "the lookup points at another hash",
    apply: () => {
      view.commitLookup = { ...view.commitLookup, [STASH_A.hash]: view.commitLookup[STASH_B.hash] };
    }
  },
  {
    id: "TC-512",
    state: "the commit has a null stash",
    apply: () => {
      view.commits = commitsWithStash(STASH_A, null);
    }
  },
  {
    id: "TC-513",
    state: "the commit has an undefined stash",
    apply: () => {
      // Test-only invalid input: the product type never carries an undefined stash.
      view.commits = commitsWithStash(STASH_A, undefined);
    }
  },
  {
    id: "TC-514",
    state: "the original row is gone",
    apply: ({ row, placement }) => {
      if (placement === "row") {
        row.dataset.hash = UNKNOWN_HASH;
      } else {
        row.remove();
      }
    }
  }
];

const INVALID_CASES = INVALID_STATES.flatMap((entry) =>
  PLACEMENTS.map((placement) => ({ ...entry, placement }))
);

interface SiblingLabel {
  readonly id: string;
  readonly kind: string;
  readonly selector: string;
  readonly builder: "ref" | "detached";
  readonly expectedArgs: (badge: HTMLElement) => unknown[];
}

const SIBLING_LABELS: SiblingLabel[] = [
  {
    id: "TC-515",
    kind: "local branch",
    selector: '.gitRef[data-name="feature/x"]',
    builder: "ref",
    expectedArgs: (badge) => [TEST_REPO, "feature/x", badge, false, "main", undefined, null]
  },
  {
    id: "TC-516",
    kind: "combined remote",
    selector: '.gitRef[data-name="main"] > .gitRefHeadRemote',
    builder: "ref",
    expectedArgs: (badge) => [TEST_REPO, "origin/main", badge, true, "main", ["origin"], null]
  },
  {
    id: "TC-517",
    kind: "standalone remote",
    selector: '.gitRef[data-name="origin/dev"]',
    builder: "ref",
    expectedArgs: (badge) => [TEST_REPO, "origin/dev", badge, false, "main", undefined, null]
  },
  {
    id: "TC-518",
    kind: "tag",
    selector: '.gitRef[data-name="v1.0"]',
    builder: "ref",
    expectedArgs: (badge) => [TEST_REPO, "v1.0", badge, false, "main", undefined, null]
  },
  {
    id: "TC-519",
    kind: "worktree branch",
    selector: '.gitRef[data-name="feature/wt"]',
    builder: "ref",
    expectedArgs: (badge) => [
      TEST_REPO,
      "feature/wt",
      badge,
      false,
      "main",
      undefined,
      { path: SIBLING_WORKTREE_PATH, isMainWorktree: false }
    ]
  },
  {
    id: "TC-520",
    kind: "detached worktree",
    selector: `.gitRef[data-worktree-path="${DETACHED_WORKTREE_PATH}"]`,
    builder: "detached",
    expectedArgs: () => [TEST_REPO, DETACHED_WORKTREE_PATH]
  }
];

const SIBLING_CASES = SIBLING_LABELS.flatMap((entry) =>
  PLACEMENTS.map((placement) => ({ ...entry, placement }))
);

// @see docs/testing/perspectives/web/main-test/02-context-menu-02.md
describe("stash label routing (S61)", () => {
  beforeEach(async () => {
    await resetView(null);
  });

  it.each(ROUTING_INPUTS)(
    "opens the stash menu of stash $stashName ($selector) from the $placement label $part ($id)",
    (input) => {
      // Case: TC-494 – TC-505 (input.id)
      // Given: both stashes rendered; the label is visible in the row or cloned into the list
      loadStashCommits(input.placement === "list");
      const label = stashLabelAt(input.stash, input.placement);

      // When: the icon, the search mark or the label body is right-clicked
      fire(labelTarget(label, input.part), "contextmenu");

      // Then: the stash builder gets this stash and its original row; the label is the menu source
      expectStashMenuFrom(input.stash, label);
      expect(label.getAttribute(STASH_HASH_ATTRIBUTE)).toBe(input.stash.hash);
      if (input.stash === STASH_B) expectNotAimedAt(STASH_A);
    }
  );

  it.each(INVALID_CASES)("opens nothing from the $placement label when $state ($id)", (entry) => {
    // Case: TC-506 – TC-514 (entry.id), in the row and in the list
    // Given: stash A's label, then the invalid state injected right before the event
    loadStashCommits(entry.placement === "list");
    const label = stashLabelAt(STASH_A, entry.placement);
    const original = { commitLookup: view.commitLookup, commits: view.commits };
    try {
      entry.apply({ label, row: commitRow(STASH_A.rowIndex), placement: entry.placement });

      // When: the label is right-clicked
      const windowErrors = fireCountingWindowErrors(label, "contextmenu");

      // Then: no menu, no builder, no request and no exception
      expectNothingOpened(windowErrors);
    } finally {
      view.commitLookup = original.commitLookup;
      view.commits = original.commits;
    }
  });

  it.each(SIBLING_CASES)(
    "routes the $kind next to the stash label to its own builder in the $placement ($id)",
    (entry) => {
      // Case: TC-515 – TC-520 (entry.id), in the row and in the list
      // Given: the non-stash label on stash A's row, visible or listed
      loadStashCommits(entry.placement === "list");
      const scope: ParentNode =
        entry.placement === "row" ? descriptionCell(STASH_A.rowIndex) : openList(STASH_A.rowIndex);
      const target = requireElement(scope.querySelector<HTMLElement>(entry.selector), entry.kind);
      const badge = requireElement(target.closest<HTMLElement>(".gitRef"), `${entry.kind} badge`);

      // When: it is right-clicked
      fire(target, "contextmenu");

      // Then: only its own builder runs with the pre-existing arguments
      const [own, other] =
        entry.builder === "ref"
          ? [refMenu.buildRefContextMenuItems, worktreeMenu.buildDetachedWorktreeContextMenuItems]
          : [worktreeMenu.buildDetachedWorktreeContextMenuItems, refMenu.buildRefContextMenuItems];
      expect(own).toHaveBeenCalledTimes(1);
      expect(own).toHaveBeenCalledWith(...entry.expectedArgs(badge));
      expect(other).not.toHaveBeenCalled();
      expect(stashMenu.buildStashContextMenuItems).not.toHaveBeenCalled();
      expect(contextMenu.showContextMenu).toHaveBeenCalledTimes(1);
      expect(vi.mocked(contextMenu.showContextMenu).mock.calls[0][2]).toBe(badge);
    }
  );

  it("keeps the commit menu for a normal commit row (TC-543)", () => {
    // Case: TC-543
    // Given: the normal commit row
    loadStashCommits(false);
    const row = commitRow(NORMAL_COMMIT_ROW);
    expect(row.dataset.hash).toBe(hashOf(1));

    // When: its body is right-clicked
    fire(requireElement(row.querySelector(ROW_BODY_SELECTOR), "normal row body"), "contextmenu");

    // Then: the commit menu opens from the row and the stash builder is not used
    expect(stashMenu.buildStashContextMenuItems).not.toHaveBeenCalled();
    expect(contextMenu.showContextMenu).toHaveBeenCalledTimes(1);
    expect(vi.mocked(contextMenu.showContextMenu).mock.calls[0][2]).toBe(row);
    const texts = menuItems().map((item) => item.textContent);
    expect(texts).toContain(MENU_COPY_COMMIT_HASH);
    expect(texts).not.toContain(MENU_APPLY);
  });

  it("keeps the stash menu from the stash row body (TC-544)", () => {
    // Case: TC-544
    // Given: stash A's row
    loadStashCommits(false);

    // When: the row body is right-clicked
    fire(rowBody(STASH_A), "contextmenu");

    // Then: the stash builder runs once and the row is the menu source
    expectStashMenuFrom(STASH_A, commitRow(STASH_A.rowIndex));
  });

  it("uses the selector current at menu build time, not at render or confirm time (TC-545)", () => {
    // Case: TC-545
    // Given: stash A rendered with @{2}, then its selector replaced by stash@{3} in the data
    loadStashCommits(false);
    const label = rowStashLabel(STASH_A);
    expect(label.textContent).toBe(stashDisplay(STASH_A));
    const originalCommits = view.commits;
    try {
      view.commits = commitsWithSelector(STASH_A, "stash@{3}");

      // When: the menu is opened from the label
      fire(label, "contextmenu");

      // Then: the builder receives the current selector, not the rendered text
      expect(stashMenu.buildStashContextMenuItems).toHaveBeenCalledTimes(1);
      expect(vi.mocked(stashMenu.buildStashContextMenuItems).mock.calls[0][2]).toBe("stash@{3}");

      // When: the selector changes again after the menu was built and Apply is confirmed
      view.commits = commitsWithSelector(STASH_A, "stash@{4}");
      vi.mocked(vscode.postMessage).mockClear();
      clickMenuItem(MENU_APPLY);
      confirmCheckboxDialog(false);

      // Then: the request carries the value captured at build time
      expect(postedPayloads()).toEqual([
        { command: "applyStash", repo: TEST_REPO, selector: "stash@{3}", reinstateIndex: false }
      ]);
      expect(label.textContent).toBe(stashDisplay(STASH_A));
    } finally {
      view.commits = originalCommits;
    }
  });
});

/* --- Operations -------------------------------------------------------- */

// @see docs/testing/perspectives/web/main-test/02-context-menu-02.md
describe("stash label operations (S61)", () => {
  beforeEach(async () => {
    await resetView(null);
  });

  afterEach(() => {
    if (dialogs.isDialogActive()) dialogs.hideDialog();
  });

  it.each(MENU_PATHS.map((path) => ({ path })))(
    "renders the same seven-element stash menu from the $path (TC-521)",
    ({ path }) => {
      // Case: TC-521
      // Given: stash A's menu opened from the row body, the in-row label or the list clone
      loadStashCommits(path === "list clone");
      fire(menuTarget(STASH_A, path), "contextmenu");
      expect(contextMenu.showContextMenu).toHaveBeenCalledTimes(1);

      // When: the menu is read and More is opened with mouseenter
      // Then: Apply, Pop, divider, More (Create Branch, Drop), divider, Copy Name, Copy Hash
      expect(menuStructure()).toEqual(STASH_MENU_STRUCTURE);
    }
  );

  it.each(OPERATION_CASES)(
    "sends $command for stash $stashName ($selector) from the $path via $operationName ($id)",
    (entry) => {
      // Case: TC-522 – TC-529 (entry.id), stash A / B × row body, in-row label, list clone
      // Given: the stash rendered for the path
      loadStashCommits(entry.path === "list clone");

      // When: the operation is chosen from the real menu and confirmed in the real dialog
      const fromPath = runStashOperation(
        menuTarget(entry.stash, entry.path),
        entry.operation,
        entry.stash
      );

      // Then: exactly the §3.5 payload for this stash
      expect(fromPath).toEqual([entry.operation.expected(entry.stash)]);

      // And: the row body produces the identical message
      if (entry.path !== "row body") {
        const fromRowBody = runStashOperation(rowBody(entry.stash), entry.operation, entry.stash);
        expect(fromRowBody).toEqual(fromPath);
      }
    }
  );
});

/* --- Lifecycle and clicks ---------------------------------------------- */

interface ListDialogOperation {
  readonly id: string;
  readonly operation: string;
  readonly open: () => void;
  readonly confirm: (stash: StashFixture) => void;
  readonly expected: (stash: StashFixture) => Record<string, unknown>;
}

const LIST_DIALOG_OPERATIONS: ListDialogOperation[] = [
  {
    id: "TC-532",
    operation: "Apply Stash",
    open: () => clickMenuItem(MENU_APPLY),
    confirm: () => confirmCheckboxDialog(false),
    expected: (stash) => applyStashPayload(stash, false)
  },
  {
    id: "TC-533",
    operation: "Pop Stash",
    open: () => clickMenuItem(MENU_POP),
    confirm: () => confirmCheckboxDialog(false),
    expected: (stash) => popStashPayload(stash, false)
  },
  {
    id: "TC-534",
    operation: "Create Branch from Stash",
    open: () => clickMoreItem(MENU_CREATE_BRANCH),
    confirm: () => submitRefInputDialog(CREATE_BRANCH_NAME),
    expected: branchFromStashPayload
  },
  {
    id: "TC-535",
    operation: "Drop Stash",
    open: () => clickMoreItem(MENU_DROP),
    confirm: (stash) => confirmDeleteDialog(stash.selector),
    expected: dropStashPayload
  }
];

// Opens the operation's dialog from the listed clone of stash A, then closes the list.
function openListDialogAndCloseList(operation: ListDialogOperation): {
  row: HTMLTableRowElement;
  clone: HTMLElement;
} {
  loadStashCommits(true);
  const row = commitRow(STASH_A.rowIndex);
  const clone = listedStashClone(STASH_A);
  fire(clone, "contextmenu");
  operation.open();
  expect(dialogs.isDialogActive()).toBe(true);
  expect(row.classList.contains(DIALOG_ACTIVE_CLASS)).toBe(true);
  expect(clone.classList.contains(DIALOG_ACTIVE_CLASS)).toBe(false);
  expect(clone).not.toBe(row);
  vi.mocked(vscode.postMessage).mockClear();
  fire(document.body, "click");
  expect(popups()).toHaveLength(0);
  expect(dialogs.isDialogActive()).toBe(true);
  return { row, clone };
}

// @see docs/testing/perspectives/web/main-test/02-context-menu-02.md
describe("stash label lifecycle and clicks (S61)", () => {
  beforeEach(async () => {
    await resetView(null);
  });

  afterEach(() => {
    if (dialogs.isDialogActive()) dialogs.hideDialog();
  });

  it("closes the menu and its More submenu when the list is closed without a choice (TC-530)", () => {
    // Case: TC-530
    // Given: the list, a menu opened from stash A's clone and its More submenu
    loadStashCommits(true);
    const clone = listedStashClone(STASH_A);
    const list = popups()[0];
    fire(clone, "contextmenu");
    expect(clone.classList.contains(CONTEXT_MENU_ACTIVE_CLASS)).toBe(true);
    openMore();
    expect(popups()).toEqual([list]);
    vi.mocked(vscode.postMessage).mockClear();

    // When: the body is clicked without choosing an item
    fire(document.body, "click");

    // Then: the list, the menu and the submenu are gone and nothing was requested
    expect(popups()).toHaveLength(0);
    expect(contextMenu.isContextMenuActive()).toBe(false);
    expect(menuItems()).toHaveLength(0);
    expect(document.querySelectorAll("ul.contextMenuSubmenu")).toHaveLength(0);
    expect(vscode.postMessage).not.toHaveBeenCalled();
  });

  it("closes the list menu when a find update regenerates the clones (TC-531)", async () => {
    // Case: TC-531
    // Given: the real find widget open, the list and a menu opened from stash A's clone
    loadStashCommits(true);
    pressShortcut("f");
    const clone = listedStashClone(STASH_A);
    const list = popups()[0];
    fire(clone, "contextmenu");
    expect(clone.classList.contains(CONTEXT_MENU_ACTIVE_CLASS)).toBe(true);
    vi.clearAllMocks();

    // When: a search term is typed and the debounce elapses
    const input = document.getElementById("findInput") as HTMLInputElement;
    input.value = FIND_TERM;
    input.dispatchEvent(new KeyboardEvent("keyup", { key: "1", bubbles: true }));
    await new Promise((resolveSearch) =>
      setTimeout(resolveSearch, findWidgetModule.SEARCH_DEBOUNCE_MS + 50)
    );

    // Then: the old clone and the menu are gone, the list holds a new clone, nothing was requested
    expect(clone.isConnected).toBe(false);
    expect(contextMenu.isContextMenuActive()).toBe(false);
    expect(popups()).toEqual([list]);
    const regenerated = requireElement(
      list.querySelector<HTMLElement>(STASH_LABEL_SELECTOR),
      "regenerated clone"
    );
    expect(regenerated).not.toBe(clone);
    expect(regenerated.getAttribute(STASH_HASH_ATTRIBUTE)).toBe(STASH_A.hash);
    expect(vscode.postMessage).not.toHaveBeenCalled();
  });

  it.each(LIST_DIALOG_OPERATIONS)(
    "confirms $operation for the original row after the list is closed ($id)",
    (entry) => {
      // Case: TC-532 – TC-535 (entry.id)
      // Given: the dialog opened from the listed clone, the list closed afterwards
      const { row } = openListDialogAndCloseList(entry);

      // When: the dialog is confirmed
      entry.confirm(STASH_A);

      // Then: one request for the stash captured at build time, the row released
      expect(postedPayloads()).toEqual([entry.expected(STASH_A)]);
      expect(dialogs.isDialogActive()).toBe(false);
      expect(row.classList.contains(DIALOG_ACTIVE_CLASS)).toBe(false);
    }
  );

  it.each(LIST_DIALOG_OPERATIONS)(
    "sends nothing when $operation is dismissed after the list is closed (TC-536)",
    (entry) => {
      // Case: TC-536 (each of the four operations)
      // Given: the dialog opened from the listed clone, the list closed afterwards
      const { row } = openListDialogAndCloseList(entry);

      // When: the dialog is dismissed
      clickDialogButton("dialogDismiss");

      // Then: no request, the dialog closed and the row released
      expect(vscode.postMessage).not.toHaveBeenCalled();
      expect(dialogs.isDialogActive()).toBe(false);
      expect(row.classList.contains(DIALOG_ACTIVE_CLASS)).toBe(false);
    }
  );

  it("keeps a left click on the in-row stash label away from the row (TC-537)", () => {
    // Case: TC-537
    // Given: stash A's in-row label
    loadStashCommits(false);
    const label = rowStashLabel(STASH_A);

    // When: it is left-clicked
    fire(label, "click");

    // Then: no details request, no request at all and no menu
    expect(vscode.postMessage).not.toHaveBeenCalled();
    expect(contextMenu.showContextMenu).not.toHaveBeenCalled();
    expect(document.getElementById("commitDetails")).toBeNull();
    expect(commitRow(STASH_A.rowIndex).classList.contains("commitDetailsOpen")).toBe(false);
  });

  it("closes the menu and dialog on an in-row stash label dblclick without a checkout (TC-538)", async () => {
    // Case: TC-538
    // Given: a menu opened from stash A's label and a dialog on top, the real checkout action
    loadStashCommits(false);
    const label = rowStashLabel(STASH_A);
    fire(label, "contextmenu");
    expect(contextMenu.isContextMenuActive()).toBe(true);
    dialogs.showConfirmationDialog("Confirm?", () => {}, null);
    expect(dialogs.isDialogActive()).toBe(true);
    const actual = await vi.importActual<RefMenuModule>("../../web/refMenu");
    vi.mocked(refMenu.checkoutBranchAction).mockImplementation(actual.checkoutBranchAction);
    vi.mocked(vscode.postMessage).mockClear();

    try {
      // When: the label is double-clicked
      fire(label, "dblclick");

      // Then: the existing handler ran with the label and requested no checkout
      expect(refMenu.checkoutBranchAction).toHaveBeenCalledTimes(1);
      expect(vi.mocked(refMenu.checkoutBranchAction).mock.calls[0][1]).toBe(label);
    } finally {
      vi.mocked(refMenu.checkoutBranchAction).mockReset();
    }
    expect(contextMenu.isContextMenuActive()).toBe(false);
    expect(dialogs.isDialogActive()).toBe(false);
    expect(vscode.postMessage).not.toHaveBeenCalled();
    expect(document.getElementById("commitDetails")).toBeNull();
  });

  it.each([{ type: "click" }, { type: "dblclick" }])(
    "stops a $type on the listed stash clone inside the list (TC-539, TC-540)",
    ({ type }) => {
      // Case: TC-539 (click) / TC-540 (dblclick)
      // Given: stash A's clone in the list and a bubbling listener on the document
      loadStashCommits(true);
      const clone = listedStashClone(STASH_A);
      const list = popups()[0];
      const reachedDocument = vi.fn();
      document.addEventListener(type, reachedDocument);

      // When: the clone receives the event
      try {
        fire(clone, type);
      } finally {
        document.removeEventListener(type, reachedDocument);
      }

      // Then: the event stopped in the list; no checkout, no details, no request
      expect(reachedDocument).not.toHaveBeenCalled();
      expect(popups()).toEqual([list]);
      expect(refMenu.checkoutBranchAction).not.toHaveBeenCalled();
      expect(vscode.postMessage).not.toHaveBeenCalled();
      expect(document.getElementById("commitDetails")).toBeNull();
    }
  );

  it("requests the stash details from a left click on the row body (TC-541)", () => {
    // Case: TC-541
    // Given: stash A's row
    loadStashCommits(false);

    // When: the row body is left-clicked
    fire(rowBody(STASH_A), "click");

    // Then: exactly one commitDetails request for the stash
    expect(postedPayloads()).toEqual([
      {
        command: "commitDetails",
        repo: TEST_REPO,
        commitHash: STASH_A.hash,
        hasParents: true,
        isStash: true
      }
    ]);
    expect(document.getElementById("commitDetails")).not.toBeNull();
  });

  it("sends nothing for a dblclick alone on the row body (TC-542)", () => {
    // Case: TC-542
    // Given: stash A's row
    loadStashCommits(false);

    // When: only a dblclick reaches the row body
    fire(rowBody(STASH_A), "dblclick");

    // Then: no request and no details view
    expect(vscode.postMessage).not.toHaveBeenCalled();
    expect(document.getElementById("commitDetails")).toBeNull();
  });
});
