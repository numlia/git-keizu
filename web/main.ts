import { BranchCleanupPanel } from "./branchCleanupPanel";
import { getBranchLabels } from "./branchLabels";
import { buildCommitContextMenuItems } from "./commitMenu";
import {
  hideContextMenu,
  hideContextMenuListener,
  isContextMenuActive,
  showContextMenu
} from "./contextMenu";
import { getCommitDate } from "./dates";
import { hideDialog, isDialogActive, isErrorDialogActive, showErrorDialog } from "./dialogs";
import { Dropdown } from "./dropdown";
import {
  CLASS_FILE_HISTORY_CURRENT,
  CLASS_FILE_HISTORY_NOTE,
  FILE_HISTORY_BAR_ID,
  FileHistoryController
} from "./fileHistory";
import {
  buildFileContextMenuItems,
  canHighlightFileHistory,
  type FileHistoryMenuContext,
  resolveFileRow,
  sendHighlightFileHistoryAction,
  sendOpenFileAction
} from "./fileMenu";
import {
  alterGitFileTree,
  type FileHistoryActionPredicate,
  generateGitFileListHtml,
  generateGitFileTree,
  generateGitFileTreeHtml
} from "./fileTree";
import { FindWidget } from "./findWidget";
import { Graph } from "./graph";
import { t } from "./i18n";
import {
  beginFocusUpdate,
  captureFocusOrigin,
  configureFocusContext,
  finishFocusUpdate,
  type FocusKey,
  type FocusUpdate,
  installKeyboardGuards,
  isKeyboardActionBlocked,
  markFocusTarget,
  moveFocusPast,
  reconcileRowTarget,
  type RowTarget
} from "./keyboardNavigation";
import { handleMessage, type RefreshMode } from "./messageHandler";
import type { BranchPathMode, PathHighlightSelection } from "./pathHighlight";
import { PATH_HIGHLIGHT_BAR_ID, PathHighlightController } from "./pathHighlightController";
import { buildRefContextMenuItems, checkoutBranchAction, showDeleteBranchDialog } from "./refMenu";
import { DESCRIPTION_MIN_WIDTH, RefOverflowController } from "./refOverflow";
import { buildStashContextMenuItems } from "./stashMenu";
import { buildUncommittedContextMenuItems } from "./uncommittedMenu";
import {
  abbrevCommit,
  addListenerToClass,
  arraysEqual,
  buildCommitRowAttributes,
  buildStashSelectorDisplay,
  escapeHtml,
  getVSCodeStyle,
  insertAfter,
  sendMessage,
  svgIcons,
  UNCOMMITTED_CHANGES_HASH,
  vscode,
  worktreeCollectionsEqual
} from "./utils";
import { buildDetachedWorktreeContextMenuItems, getWorktreeLabelName } from "./worktreeMenu";

const FLASH_ANIMATION_DURATION_MS = 850;
export const MIN_COMMIT_LOAD_COUNT = 1;

export function normalizeCommitLoadCount(value: number, defaultValue: number): number {
  const count = Number.isFinite(value) ? value : defaultValue;
  return Math.max(MIN_COMMIT_LOAD_COUNT, count);
}

const SCROLL_PADDING_TOP = 8;
const SCROLL_ROW_HEIGHT = 32;
const SCROLL_CENTER_OFFSET = 12;

const CDV_DEFAULT_HEIGHT = 250;
const CDV_MIN_HEIGHT = 100;
const CDV_SCROLL_PADDING = 8;

const STASH_NAVIGATION_TIMEOUT_MS = 5000;
const SCROLL_AUTO_LOAD_THRESHOLD = 25;
const COMMIT_DETAILS_COLSPAN = 4;
const SECONDS_TO_MS = 1000;
const ALL_AUTHORS_LABEL = t("toolbar.allAuthors");
const ALL_AUTHORS_VALUE = "";
const ALL_BRANCHES_LABEL = t("toolbar.showAll");
const ALL_BRANCHES_VALUE = "";
const REMOTE_BRANCH_PREFIX = "remotes/";
const GRAPH_AUTO_LAYOUT_MAX_RATIO = 0.4;
const GRAPH_COL_MIN_WIDTH = 64;
const DESCRIPTION_COLUMN_INDEX = 1;
const TABLE_COLUMN_COUNT = 5;
const REF_BADGE_CLASS = "gitRef";
const REF_BADGE_SELECTOR = `.${REF_BADGE_CLASS}`;
// Each operable part of a badge is a native button inside the measured `.gitRef` wrapper.
const REF_BUTTON_CLASS = "gitRefButton";
const REF_BUTTON_SELECTOR = `.${REF_BUTTON_CLASS}`;
const REF_BUTTON_OPEN_TAG = `<button type="button" class="${REF_BUTTON_CLASS}">`;
const COMBINED_REMOTE_CLASS = "gitRefHeadRemote";
const COMBINED_REMOTE_SELECTOR = `.${COMBINED_REMOTE_CLASS}`;
const REF_CLASS_HEAD = "head";
const REF_CLASS_REMOTE = "remote";
const REF_CLASS_TAG = "tag";
type BranchRefType = Extract<PathHighlightSelection, { kind: "branch" }>["refType"];
const COMMIT_ORDERING_MENU_ITEMS: { label: string; value: GG.RepoCommitOrdering }[] = [
  { label: t("commitOrdering.default"), value: "default" },
  { label: t("commitOrdering.date"), value: "date" },
  { label: t("commitOrdering.authorDate"), value: "author-date" },
  { label: t("commitOrdering.topological"), value: "topo" }
];
const FILE_VIEW_LIST = "list" as const;
const FILE_VIEW_TREE = "tree" as const;
type FileViewType = typeof FILE_VIEW_LIST | typeof FILE_VIEW_TREE;
const DEFAULT_FILE_VIEW_TYPE: FileViewType = FILE_VIEW_TREE;

function buildDetailsCloseHtml(): string {
  return `<button type="button" id="${COMMIT_DETAILS_CLOSE_ID}" ${ATTRIBUTE_ARIA_LABEL}="${t("find.close")}">${svgIcons.close}</button>`;
}

function getFileViewToggle(mode: FileViewType): { icon: string; title: string } {
  return mode === FILE_VIEW_LIST
    ? { icon: svgIcons.treeView, title: t("toolbar.switchToTreeView") }
    : { icon: svgIcons.listView, title: t("toolbar.switchToListView") };
}

/** Tags and detached worktree labels have no branch ref type, so they get no path highlight. */
function resolveRefType(badge: HTMLElement, isRemoteCombined: boolean): BranchRefType | null {
  if (isRemoteCombined || badge.classList.contains(REF_CLASS_REMOTE)) return REF_CLASS_REMOTE;
  if (badge.classList.contains(REF_CLASS_HEAD)) return REF_CLASS_HEAD;
  return null;
}

// The part under the pointer or holding focus (also through a search mark) is the menu source;
// a badge-level hit falls back to its first part, so the wrapper itself never takes focus.
function resolveRefSource(event: ContextMenuTrigger, badge: HTMLElement): HTMLElement {
  const part =
    event.target instanceof Element ? event.target.closest<HTMLElement>(REF_BUTTON_SELECTOR) : null;
  if (part !== null && badge.contains(part)) return part;
  return badge.querySelector<HTMLElement>(REF_BUTTON_SELECTOR) ?? badge;
}

const EMPTY_WORKTREE_COLLECTION: GG.WorktreeCollection = { branches: {}, detached: [] };
const DETACHED_WORKTREE_CLASS = "detachedWorktree";
const STASH_HASH_ATTRIBUTE = "data-stash-hash";
const STASH_BADGE_CLASS = "stash";
const COMMIT_ROW_SELECTOR = ".commit";

type PendingCommitLoad = {
  forceRender: boolean;
  callbacks: ((changes: boolean) => void)[];
};

const EDITABLE_TAG_NAMES = ["INPUT", "TEXTAREA", "SELECT"];

const CONTENT_EDITABLE_ATTRIBUTE = "contenteditable";
const CONTENT_EDITABLE_SELECTOR = `[${CONTENT_EDITABLE_ATTRIBUTE}]`;

function isEditableEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (EDITABLE_TAG_NAMES.includes(target.tagName) || target.isContentEditable) return true;
  // jsdom and detached hosts do not propagate isContentEditable to descendants.
  const host = target.closest(CONTENT_EDITABLE_SELECTOR);
  return host !== null && host.getAttribute(CONTENT_EDITABLE_ATTRIBUTE) !== "false";
}

const KEY_CONTEXT_MENU = "ContextMenu";
const KEY_F10 = "F10";
const KEY_ARROW_UP = "ArrowUp";
const KEY_ARROW_DOWN = "ArrowDown";
const KEY_ENTER = "Enter";
const KEY_SPACE = " ";
const KEY_ESCAPE = "Escape";
const KEY_TAB = "Tab";
const TAB_INDEX_STOP = 0;
const TAB_INDEX_PROGRAMMATIC = -1;
const COMMIT_DETAILS_ID = "commitDetails";
const COMMIT_DETAILS_CLOSE_ID = "commitDetailsClose";
const COMMIT_DETAILS_FILES_ID = "commitDetailsFiles";
const FILE_VIEW_TOGGLE_ID = "fileViewToggle";
const FILE_ROW_SELECTOR = ".gitFile";
const FILE_DIFF_BUTTON_CLASS = "gitFileDiff";
const FILE_OPEN_BUTTON_CLASS = "openFile";
const FILE_HISTORY_BUTTON_CLASS = "highlightFileHistory";
const FOLDER_BUTTON_CLASS = "gitFolder";
const FOLDER_CONTENTS_SELECTOR = ":scope > .gitFolderContents";
const FOLDER_ICON_SELECTOR = ".gitFolderIcon";
const FOLDER_CLOSED_CLASS = "closed";
const FOLDER_CONTENTS_HIDDEN_CLASS = "hidden";
const PARENT_HASH_CLASS = "parentHash";
// Parent links have no element id; their control key is derived from the hash they open.
const PARENT_HASH_KEY_PREFIX = "parentHash:";
const ATTRIBUTE_ARIA_EXPANDED = "aria-expanded";
const ATTRIBUTE_ARIA_LABEL = "aria-label";
type FileActionKind = Extract<FocusKey, { kind: "file" }>["action"];
const FILE_ACTION_BUTTONS: readonly (readonly [string, FileActionKind])[] = [
  [FILE_DIFF_BUTTON_CLASS, "diff"],
  [FILE_OPEN_BUTTON_CLASS, "open"],
  [FILE_HISTORY_BUTTON_CLASS, "history"]
];
const LOAD_MORE_BUTTON_ID = "loadMoreCommitsBtn";
const TABLE_HEADERS_ID = "tableColHeaders";
const COMMIT_ORDERING_BUTTON_ID = "commitOrderingBtn";
const COMMIT_ORDERING_BUTTON_CLASS = "tableColHeaderMenuBtn";
const COMMIT_ORDERING_BUTTON_GLYPH = "\u25BE";
const STATUS_NOTICE_ID = "statusNotice";
const STATUS_KEY_COMMITS_LOADED = "a11y.commitsLoaded";
const STATUS_KEY_NO_COMMITS = "a11y.noCommits";
const BRANCH_CLEANUP_PANEL_ID = "branchCleanupPanel";
const FIND_WIDGET_ACTIVE_SELECTOR = ".findWidget.active";
const CLASS_ACTIVE = "active";
const ROW_SELECTOR = "tr[data-hash]";
const ROW_COUNTER_SELECTOR = ".refOverflowCounter";
const ROW_LABEL_SELECTOR = `${REF_BADGE_SELECTOR} ${REF_BUTTON_SELECTOR}, ${ROW_COUNTER_SELECTOR}`;
// Labels folded away by the layout keep tabindex -1 until the layout shows them again.
const ROW_LABEL_STOP_SELECTOR = `${REF_BADGE_SELECTOR}:not(.refOverflowHidden) ${REF_BUTTON_SELECTOR}, ${ROW_COUNTER_SELECTOR}`;
const TAB_STOP_SELECTOR = "button, input, select, textarea, summary, a[href], [tabindex]";
const TAB_STOP_EXCLUDED_SELECTOR =
  '[hidden], [disabled], [aria-hidden="true"], .refOverflowHidden, .refOverflowMeasure';
const DISPLAY_NONE = "none";
const VISIBILITY_HIDDEN = "hidden";
// Toolbar order of plan R4.3: repo, branch, author, remote, cleanup, find, fetch, current, refresh.
const TOOLBAR_STOP_SELECTORS: readonly string[] = [
  "#repoSelect > .dropdownCurrentValue",
  "#branchSelect > .dropdownCurrentValue",
  "#authorSelect > .dropdownCurrentValue",
  "#showRemoteBranchesCheckbox",
  "#branchCleanupBtn",
  "#searchBtn",
  "#fetchBtn",
  "#currentBtn",
  "#refreshBtn"
];

function consumeKey(e: KeyboardEvent): void {
  e.preventDefault();
  e.stopPropagation();
}

function isDisplayed(element: HTMLElement): boolean {
  if (getComputedStyle(element).visibility === VISIBILITY_HIDDEN) return false;
  for (let node: HTMLElement | null = element; node !== null; node = node.parentElement) {
    if (getComputedStyle(node).display === DISPLAY_NONE) return false;
  }
  return true;
}

// A normal tab stop: connected, tabbable, enabled and not inside a hidden or measuring subtree.
function isTabStop(element: HTMLElement): boolean {
  return (
    element.isConnected &&
    element.tabIndex >= TAB_INDEX_STOP &&
    element.closest(TAB_STOP_EXCLUDED_SELECTOR) === null &&
    isDisplayed(element)
  );
}

function collectTabStops(container: Element | null): HTMLElement[] {
  if (container === null) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(TAB_STOP_SELECTOR)).filter(isTabStop);
}

// The highlight bars and the find widget are shown by their "active" class, not by `hidden`.
function activeContainer(element: Element | null): Element | null {
  return element !== null && element.classList.contains(CLASS_ACTIVE) ? element : null;
}

// ContextMenu / Shift+F10 open the target's own menu; inputs keep the browser's edit menu and
// repeat / keyup / IME presses never launch. A consumed launch stops at the innermost target.
function consumeContextMenuLaunch(e: Event): e is KeyboardEvent {
  if (!(e instanceof KeyboardEvent) || e.defaultPrevented) return false;
  if (e.key !== KEY_CONTEXT_MENU && !(e.key === KEY_F10 && e.shiftKey)) return false;
  if (isEditableEventTarget(e.target) || isKeyboardActionBlocked(e)) return false;
  e.preventDefault();
  e.stopPropagation();
  return true;
}

function getHorizontalSum(style: CSSStyleDeclaration, left: string, right: string): number {
  return parseFloat(style.getPropertyValue(left)) + parseFloat(style.getPropertyValue(right));
}

function getHorizontalBorderWidth(elem: HTMLElement): number {
  return getHorizontalSum(getComputedStyle(elem), "border-left-width", "border-right-width");
}

function setMinWidth(elems: (HTMLElement | null)[], value: string) {
  for (const elem of elems) {
    if (elem !== null && elem.style.minWidth !== value) elem.style.minWidth = value;
  }
}

function buildAuthorOptions(
  authors: string[],
  selectedAuthors: string[]
): { options: { name: string; value: string }[]; selected: string[] } {
  const mergedAuthors = [
    ...authors,
    ...selectedAuthors.filter((author) => !authors.includes(author))
  ];
  const options = [
    { name: ALL_AUTHORS_LABEL, value: ALL_AUTHORS_VALUE },
    ...mergedAuthors.map((author) => ({ name: author, value: author }))
  ];
  return { options, selected: selectedAuthors };
}

class GitKeizuView {
  private gitRepos: GG.GitRepoSet;
  private gitBranches: string[] = [];
  private gitBranchHead: string | null = null;
  private commits: GG.GitCommitNode[] = [];
  private commitHead: string | null = null;
  private commitLookup: { [hash: string]: number } = {};
  private avatars: AvatarImageCollection = {};
  private selectedBranches: string[] = [];
  private currentRepo!: string;

  private graph: Graph;
  private refOverflow: RefOverflowController;
  private descriptionMinimumWidth: number | null = null;
  private displayFixedColumns: HTMLElement[] = [];
  private findWidget: FindWidget;
  private fileHistory: FileHistoryController;
  private pathHighlight: PathHighlightController;
  private config: Config;
  private moreCommitsAvailable: boolean = false;
  private showRemoteBranches: boolean = true;
  private expandedCommit: ExpandedCommit | null = null;
  private maxCommits: number;

  private tableElem: HTMLElement;
  private footerElem: HTMLElement;
  private scrollContainerElem: HTMLElement;
  private repoDropdown: Dropdown;
  private branchDropdown: Dropdown;
  private authorDropdown: Dropdown;
  private showRemoteBranchesElem: HTMLInputElement;
  private scrollShadowElem: HTMLElement;
  private branchCleanupPanel: BranchCleanupPanel;
  private pendingBranchScroll: string | null = null;

  private loadBranchesCallback: ((changes: boolean, isRepo: boolean) => void) | null = null;
  private loadCommitsCallback: ((changes: boolean) => void) | null = null;
  private pendingLoadBranchesAndCommitsForceRender: boolean | null = null;
  private pendingLoadCommits: PendingCommitLoad | null = null;
  private worktrees: GG.WorktreeCollection = EMPTY_WORKTREE_COLLECTION;

  private commitOrdering: GG.CommitOrdering;
  private selectedAuthors: string[] = [];

  private stashNavigationIndex: number = -1;
  private stashNavigationTimer: ReturnType<typeof setTimeout> | null = null;
  private isLoadingMoreCommits: boolean = false;
  // The row the next key acts on: separate from the details, compare, HEAD and history states.
  private rowTarget: RowTarget | null = null;
  private readonly keydownListener = (e: KeyboardEvent) => this.handleKeyboardShortcut(e);
  private readonly disposeFocusContext: () => void;

  constructor(
    repos: GG.GitRepoSet,
    lastActiveRepo: string | null,
    config: Config,
    prevState: WebViewState | null
  ) {
    this.gitRepos = repos;
    this.commitOrdering = viewState.commitOrdering;
    this.config = config;
    this.maxCommits = config.initialLoadCommits;
    this.graph = new Graph("commitGraph", this.config);
    this.tableElem = document.getElementById("commitTable")!;
    this.footerElem = document.getElementById("footer")!;
    this.scrollContainerElem = document.getElementById("scrollContainer")!;
    this.disposeFocusContext = configureFocusContext({
      getRepo: () => this.currentRepo ?? null,
      getActiveRow: () => this.getRowTargetElem(),
      getTabStops: () => this.getTabStops()
    });
    this.tableElem.tabIndex = TAB_INDEX_PROGRAMMATIC;
    this.tableElem.addEventListener("focusin", (e) => this.syncRowTargetFromFocus(e.target));
    this.repoDropdown = new Dropdown("repoSelect", true, t("toolbar.repos"), (value) => {
      this.leaveRepository();
      this.refOverflow.detachTable();
      this.fileHistory.onRepositoryChanged();
      this.pathHighlight.onRepositoryChanged();
      this.currentRepo = value;
      this.branchCleanupPanel.selectRepository(value);
      this.maxCommits = this.config.initialLoadCommits;
      this.expandedCommit = null;
      this.selectedBranches = [];
      this.saveState();
      this.refresh("hard");
    });
    this.branchDropdown = new Dropdown(
      "branchSelect",
      false,
      t("toolbar.branches"),
      (values: string[]) => {
        this.selectedBranches = values;
        this.resetFilterAndReload();
      },
      true
    );
    this.authorDropdown = new Dropdown(
      "authorSelect",
      false,
      t("toolbar.authors"),
      (values: string[]) => {
        this.selectedAuthors = values;
        this.resetFilterAndReload();
      },
      true
    );
    this.showRemoteBranchesElem = <HTMLInputElement>(
      document.getElementById("showRemoteBranchesCheckbox")!
    );
    this.showRemoteBranchesElem.addEventListener("change", () => {
      this.showRemoteBranches = this.showRemoteBranchesElem.checked;
      this.saveState();
      this.refresh("hard");
    });
    this.scrollShadowElem = <HTMLInputElement>document.getElementById("scrollShadow")!;
    const refreshBtnElem = document.getElementById("refreshBtn")!;
    refreshBtnElem.innerHTML = svgIcons.refresh;
    refreshBtnElem.addEventListener("click", () => {
      this.refresh("hard");
    });
    this.branchCleanupPanel = new BranchCleanupPanel({
      showBranch: (branchName) => this.showBranchInGraph(branchName),
      showDeleteDialog: (repo, branchName, remotes) =>
        showDeleteBranchDialog(repo, branchName, remotes)
    });
    const branchCleanupBtnElem = document.getElementById("branchCleanupBtn");
    if (branchCleanupBtnElem !== null) {
      branchCleanupBtnElem.innerHTML = svgIcons.branch;
      branchCleanupBtnElem.addEventListener("click", () => {
        this.branchCleanupPanel.toggle(this.currentRepo);
        branchCleanupBtnElem.classList.toggle("active", this.branchCleanupPanel.isOpen());
      });
    }
    const fetchBtnElem = document.getElementById("fetchBtn")!;
    fetchBtnElem.innerHTML = svgIcons.fetch;
    fetchBtnElem.addEventListener("click", () => {
      sendMessage({ command: "fetch", repo: this.currentRepo });
    });
    const currentBtnElem = document.getElementById("currentBtn")!;
    currentBtnElem.innerHTML = svgIcons.current;
    currentBtnElem.addEventListener("click", () => {
      if (this.commitHead !== null && typeof this.commitLookup[this.commitHead] === "number") {
        this.scrollToCommit(this.commitHead, true, true);
      }
    });
    const searchBtnElem = document.getElementById("searchBtn")!;
    searchBtnElem.innerHTML = svgIcons.search;
    searchBtnElem.addEventListener("click", () => {
      this.openFindWidget();
    });
    // Fixed toolbar controls restore by id after the UI they launched closes from the keyboard.
    for (const control of [
      branchCleanupBtnElem,
      searchBtnElem,
      fetchBtnElem,
      currentBtnElem,
      refreshBtnElem
    ]) {
      if (control !== null) markFocusTarget(control, { kind: "control", id: control.id });
    }
    this.refOverflow = new RefOverflowController({
      onMinimumWidth: (minimum) => this.applyDescriptionMinimumWidth(minimum),
      onRefContextMenu: (event, badge, focusOptions) =>
        this.showRefBadgeContextMenu(event, badge, focusOptions),
      onRefCloned: (original, clone) => {
        const key = this.resolveRefKey(original);
        if (key !== null) markFocusTarget(clone, key);
      }
    });
    this.findWidget = new FindWidget({
      getCommits: () => this.commits,
      scrollToCommit: (hash, alwaysCenterCommit) => this.scrollToCommit(hash, alwaysCenterCommit),
      saveState: () => this.saveState(),
      loadCommitDetails: (elem) => this.loadCommitDetails(elem),
      getCommitId: (hash) =>
        typeof this.commitLookup[hash] === "number" ? this.commitLookup[hash] : null,
      isCdvOpen: (hash) =>
        this.expandedCommit !== null &&
        this.expandedCommit.hash === hash &&
        this.expandedCommit.compareWithHash === null,
      onHighlightsChanged: () => this.refOverflow.syncSearchHighlights()
    });
    this.fileHistory = new FileHistoryController({
      getCommits: () => this.commits,
      getCommitId: (hash) =>
        typeof this.commitLookup[hash] === "number" ? this.commitLookup[hash] : null,
      getCurrentRepo: () => this.currentRepo,
      getExpandedCommit: () => this.expandedCommit,
      getScrollTop: () => this.scrollContainerElem.scrollTop,
      setScrollTop: (scrollTop) => {
        this.scrollContainerElem.scrollTop = scrollTop;
      },
      hideCommitDetails: () => this.hideCommitDetails(),
      restoreExpandedCommit: (snapshot) => this.restoreExpandedCommit(snapshot),
      scrollToCommit: (hash, alwaysCenterCommit) => this.scrollToCommit(hash, alwaysCenterCommit),
      closeFindWidget: () => this.findWidget.close(),
      setGraphHighlight: (highlight) => {
        this.graph.setFileHistoryHighlight(highlight);
        this.renderGraph();
      }
    });
    this.pathHighlight = new PathHighlightController({
      getCommits: () => this.commits,
      getCurrentRepo: () => this.currentRepo,
      setGraphHighlight: (highlight) => {
        this.graph.setPathHighlight(highlight);
        this.renderGraph();
      }
    });
    document.addEventListener("keydown", this.keydownListener);
    this.observeWindowSizeChanges();
    this.observeWebviewStyleChanges();
    this.observeWebviewScroll();

    this.renderShowLoading();
    if (prevState) {
      // Backward compatibility: convert legacy single-value format to array format
      const legacyState = prevState as unknown as Record<string, unknown>;
      this.selectedBranches = Array.isArray(prevState.selectedBranches)
        ? prevState.selectedBranches
        : typeof legacyState["currentBranch"] === "string"
          ? [legacyState["currentBranch"] as string]
          : [];
      this.selectedAuthors = Array.isArray(prevState.selectedAuthors)
        ? prevState.selectedAuthors
        : typeof legacyState["authorFilter"] === "string"
          ? [legacyState["authorFilter"] as string]
          : [];
      this.showRemoteBranches = prevState.showRemoteBranches;
      this.showRemoteBranchesElem.checked = this.showRemoteBranches;
      if (this.gitRepos[prevState.currentRepo] !== undefined) {
        this.currentRepo = prevState.currentRepo;
        this.maxCommits = normalizeCommitLoadCount(
          prevState.maxCommits,
          this.config.initialLoadCommits
        );
        this.expandedCommit = prevState.expandedCommit;
        this.avatars = prevState.avatars;
        this.loadBranches(prevState.gitBranches, prevState.gitBranchHead, true, true);
        this.loadCommits(
          prevState.commits,
          prevState.commitHead,
          prevState.moreCommitsAvailable,
          true,
          undefined,
          prevState.worktrees
        );
        if (typeof prevState.scrollTop === "number") {
          this.scrollContainerElem.scrollTop = prevState.scrollTop;
        }
      }
      if (prevState.findWidgetState !== null && prevState.findWidgetState !== undefined) {
        this.findWidget.restoreState(prevState.findWidgetState);
      }
      if (this.selectedAuthors.length > 0) {
        const { options, selected } = buildAuthorOptions(
          this.selectedAuthors,
          this.selectedAuthors
        );
        this.authorDropdown.setOptions(options, selected);
      }
    }
    const refreshedDuringLoadRepos = this.loadRepos(this.gitRepos, lastActiveRepo);
    if (!refreshedDuringLoadRepos) {
      this.requestLoadBranchesAndCommits(false);
    }
  }

  /* Loading Data */
  public loadRepos(repos: GG.GitRepoSet, lastActiveRepo: string | null): boolean {
    viewState.repos = repos;
    this.gitRepos = repos;
    this.saveState();

    let repoPaths = Object.keys(repos),
      changedRepo = false;
    if (repos[this.currentRepo] === undefined) {
      this.leaveRepository();
      this.refOverflow.detachTable();
      this.fileHistory.onRepositoryChanged();
      this.pathHighlight.onRepositoryChanged();
      this.currentRepo =
        lastActiveRepo !== null && repos[lastActiveRepo] !== undefined
          ? lastActiveRepo
          : repoPaths[0];
      this.branchCleanupPanel.selectRepository(this.currentRepo);
      this.saveState();
      changedRepo = true;
    }

    let options = [],
      repoComps,
      i;
    for (i = 0; i < repoPaths.length; i++) {
      repoComps = repoPaths[i].split("/");
      options.push({ name: repoComps[repoComps.length - 1], value: repoPaths[i] });
    }
    document.body.classList.toggle("singleRepo", repoPaths.length <= 1);
    this.repoDropdown.setOptions(options, this.currentRepo);

    if (changedRepo) {
      this.refresh("hard");
      return true;
    }
    return false;
  }

  public selectRepo(repo: string) {
    if (this.gitRepos[repo] === undefined) {
      return;
    }

    this.refOverflow.detachTable();
    this.fileHistory.onRepositoryChanged();
    if (repo !== this.currentRepo) {
      this.pathHighlight.onRepositoryChanged();
      this.leaveRepository();
    }
    this.currentRepo = repo;
    this.branchCleanupPanel.selectRepository(repo);
    const repoPaths = Object.keys(this.gitRepos);
    const options = repoPaths.map((path) => {
      const comps = path.split("/");
      return { name: comps[comps.length - 1], value: path };
    });
    this.repoDropdown.setOptions(options, this.currentRepo);
    this.refresh("hard");
  }

  private getCurrentRepoRecentActions(): GG.RecentActionId[] {
    return this.gitRepos[this.currentRepo]?.recentActions ?? [];
  }

  private buildFileHistoryMenuContext(): FileHistoryMenuContext {
    const commit =
      this.expandedCommit !== null
        ? this.commits[this.commitLookup[this.expandedCommit.hash]]
        : undefined;
    return {
      isStash: commit !== undefined && commit.stash !== null,
      onHighlightFileHistory: (anchorHash, filePath) =>
        this.fileHistory.request(anchorHash, filePath)
    };
  }

  private openFindWidget() {
    if (this.fileHistory.isActive() || this.fileHistory.isPending()) {
      this.fileHistory.exit(true);
    }
    this.findWidget.show(true);
  }

  public loadBranches(
    branchOptions: string[],
    branchHead: string | null,
    forceRender: boolean,
    isRepo: boolean
  ) {
    if (!isRepo) {
      this.triggerLoadBranchesCallback(false, isRepo);
      return;
    }
    if (
      !forceRender &&
      arraysEqual(this.gitBranches, branchOptions, (a, b) => a === b) &&
      this.gitBranchHead === branchHead
    ) {
      this.triggerLoadBranchesCallback(false, isRepo);
      return;
    }

    this.gitBranches = branchOptions;
    this.gitBranchHead = branchHead;

    // Filter out branches that no longer exist
    const validBranches = this.selectedBranches.filter((b) => this.gitBranches.includes(b));
    if (validBranches.length === 0 && this.selectedBranches.length > 0) {
      // All selected branches disappeared — fallback
      this.selectedBranches =
        this.config.showCurrentBranchByDefault && this.gitBranchHead !== null
          ? [this.gitBranchHead]
          : [];
    } else {
      this.selectedBranches = validBranches;
    }
    this.saveState();

    this.syncBranchDropdownOptions();

    this.triggerLoadBranchesCallback(true, isRepo);
  }
  private syncBranchDropdownOptions() {
    const options = [{ name: ALL_BRANCHES_LABEL, value: ALL_BRANCHES_VALUE }];
    for (let i = 0; i < this.gitBranches.length; i++) {
      options.push({
        name: this.gitBranches[i].startsWith(REMOTE_BRANCH_PREFIX)
          ? this.gitBranches[i].substring(REMOTE_BRANCH_PREFIX.length)
          : this.gitBranches[i],
        value: this.gitBranches[i]
      });
    }
    this.branchDropdown.setOptions(options, this.selectedBranches);
  }
  private triggerLoadBranchesCallback(changes: boolean, isRepo: boolean) {
    const callback = this.loadBranchesCallback;
    this.loadBranchesCallback = null;
    if (callback !== null) {
      callback(changes, isRepo);
    }
    this.flushPendingLoadBranchesAndCommits();
  }

  public loadCommits(
    commits: GG.GitCommitNode[],
    commitHead: string | null,
    moreAvailable: boolean,
    forceRender: boolean,
    authors?: string[],
    worktrees?: GG.WorktreeCollection
  ) {
    if (
      !forceRender &&
      this.moreCommitsAvailable === moreAvailable &&
      this.commitHead === commitHead &&
      worktreeCollectionsEqual(this.worktrees, worktrees ?? EMPTY_WORKTREE_COLLECTION) &&
      arraysEqual(
        this.commits,
        commits,
        (a, b) =>
          a.hash === b.hash &&
          arraysEqual(a.refs, b.refs, (a, b) => a.name === b.name && a.type === b.type) &&
          arraysEqual(a.parentHashes, b.parentHashes, (a, b) => a === b)
      )
    ) {
      if (this.commits.length > 0 && this.commits[0].hash === UNCOMMITTED_CHANGES_HASH) {
        this.commits[0] = commits[0];
        this.saveState();
        this.renderUncommitedChanges();
      }
      this.triggerLoadCommitsCallback(false);
      this.updateCurrentBtnState();
      return;
    }

    this.moreCommitsAvailable = moreAvailable;
    this.commits = commits;
    this.commitHead = commitHead;
    this.worktrees = worktrees ?? EMPTY_WORKTREE_COLLECTION;
    this.commitLookup = {};
    this.saveState();

    let i: number,
      avatarsNeeded: { [email: string]: string[] } = {};
    for (i = 0; i < this.commits.length; i++) {
      this.commitLookup[this.commits[i].hash] = i;
      if (
        this.config.fetchAvatars &&
        typeof this.avatars[this.commits[i].email] !== "string" &&
        this.commits[i].email !== ""
      ) {
        if (avatarsNeeded[this.commits[i].email] === undefined) {
          avatarsNeeded[this.commits[i].email] = [this.commits[i].hash];
        } else {
          avatarsNeeded[this.commits[i].email].push(this.commits[i].hash);
        }
      }
    }

    this.rowTarget = reconcileRowTarget(
      this.rowTarget,
      this.currentRepo,
      this.commits.map((commit) => commit.hash),
      this.commitHead
    );
    this.graph.loadCommits(this.commits, this.commitHead, this.commitLookup);

    const expandedCommitVisible =
      this.expandedCommit !== null &&
      typeof this.commitLookup[this.expandedCommit.hash] === "number" &&
      (this.expandedCommit.compareWithHash === null ||
        typeof this.commitLookup[this.expandedCommit.compareWithHash] === "number");
    if (this.expandedCommit !== null && !expandedCommitVisible) {
      this.expandedCommit = null;
      this.saveState();
    }
    this.pathHighlight.onCommitsChanged();
    this.render();
    this.announceStatus(
      this.commits.length === 0
        ? t(STATUS_KEY_NO_COMMITS)
        : t(STATUS_KEY_COMMITS_LOADED, this.commits.length)
    );

    const authorList =
      authors !== undefined ? authors : [...new Set(this.commits.map((c) => c.author))].sort();
    const { options, selected } = buildAuthorOptions(authorList, this.selectedAuthors);
    this.authorDropdown.setOptions(options, selected);

    this.consumePendingBranchScroll();
    this.triggerLoadCommitsCallback(true);
    this.fetchAvatars(avatarsNeeded);
    this.updateCurrentBtnState();
  }
  private triggerLoadCommitsCallback(changes: boolean) {
    const callback = this.loadCommitsCallback;
    this.loadCommitsCallback = null;
    if (callback !== null) {
      callback(changes);
    }
    this.flushPendingLoadCommits();
  }

  public loadAvatar(email: string, image: string) {
    this.avatars[email] = image;
    this.saveState();
    let avatarsElems = <HTMLCollectionOf<HTMLElement>>document.getElementsByClassName("avatar");
    for (let i = 0; i < avatarsElems.length; i++) {
      if (avatarsElems[i].dataset.email === email) {
        avatarsElems[i].innerHTML = `<img class="avatarImg" src="${escapeHtml(image)}">`;
      }
    }
  }

  public setShowRecentActions(showRecentActions: boolean) {
    viewState.showRecentActions = showRecentActions;
  }

  public loadBranchCleanup(response: GG.ResponseLoadBranchCleanup) {
    this.branchCleanupPanel.handleResponse(response);
  }

  public loadFileHistory(response: GG.ResponseFileHistory) {
    this.fileHistory.handleResponse(response);
  }

  /* Branch Cleanup Panel */
  private showBranchInGraph(branchName: string) {
    this.selectedBranches = [branchName];
    this.maxCommits = this.config.initialLoadCommits;
    this.syncBranchDropdownOptions();
    this.saveState();
    this.pendingBranchScroll = branchName;
    this.refresh("hard");
  }

  private consumePendingBranchScroll() {
    if (this.pendingBranchScroll === null) return;
    const branchName = this.pendingBranchScroll;
    this.pendingBranchScroll = null;
    const labels = document.querySelectorAll<HTMLElement>(".gitRef.head");
    for (let i = 0; i < labels.length; i++) {
      if (labels[i].dataset.name !== branchName) continue;
      const commitElem = labels[i].closest<HTMLElement>(".commit");
      const hash = commitElem?.dataset.hash;
      if (hash !== undefined) {
        this.scrollToCommit(hash, true, true);
      }
      return;
    }
  }

  /* Refresh */
  public refresh(mode: RefreshMode) {
    if (mode === "hard") {
      if (this.expandedCommit !== null) {
        this.expandedCommit = null;
        this.saveState();
      }
      this.renderShowLoading();
    }
    this.requestLoadBranchesAndCommits(mode !== "soft");
    if (this.branchCleanupPanel.isOpen()) {
      this.branchCleanupPanel.refresh(this.currentRepo);
    }
  }

  /* Requests */
  private requestLoadBranches(
    forceRender: boolean,
    loadedCallback: (changes: boolean, isRepo: boolean) => void
  ) {
    this.loadBranchesCallback = loadedCallback;
    sendMessage({
      command: "loadBranches",
      repo: this.currentRepo!,
      showRemoteBranches: this.showRemoteBranches,
      hard: forceRender
    });
  }
  private resetFilterAndReload() {
    this.maxCommits = this.config.initialLoadCommits;
    this.expandedCommit = null;
    this.saveState();
    this.renderShowLoading();
    this.requestLoadCommits(true, () => {});
  }

  private requestLoadCommits(forceRender: boolean, loadedCallback: (changes: boolean) => void) {
    if (this.loadCommitsCallback !== null) {
      this.queueLoadCommits(forceRender, loadedCallback);
      return;
    }
    this.loadCommitsCallback = loadedCallback;
    sendMessage({
      command: "loadCommits",
      repo: this.currentRepo!,
      branches: this.selectedBranches,
      maxCommits: normalizeCommitLoadCount(this.maxCommits, this.config.initialLoadCommits),
      showRemoteBranches: this.showRemoteBranches,
      hard: forceRender,
      authors: this.selectedAuthors,
      commitOrdering: this.getEffectiveCommitOrdering()
    });
  }
  private getEffectiveCommitOrdering(): GG.CommitOrdering {
    const repoOrdering = this.gitRepos[this.currentRepo]?.commitOrdering;
    if (repoOrdering !== undefined && repoOrdering !== "default") {
      return repoOrdering;
    }
    return this.commitOrdering;
  }
  private requestLoadBranchesAndCommits(forceRender: boolean) {
    if (this.loadBranchesCallback !== null) {
      this.queueLoadBranchesAndCommits(forceRender);
      return;
    }
    this.requestLoadBranches(forceRender, (branchChanges: boolean, isRepo: boolean) => {
      if (isRepo) {
        this.requestLoadCommits(forceRender || branchChanges, (commitChanges: boolean) => {
          if (branchChanges || commitChanges) {
            if (isDialogActive() && !isErrorDialogActive()) hideDialog();
            if (isContextMenuActive()) hideContextMenu();
          }
        });
      } else {
        sendMessage({ command: "loadRepos", check: true });
      }
    });
  }
  private queueLoadBranchesAndCommits(forceRender: boolean) {
    if (this.pendingLoadBranchesAndCommitsForceRender === null) {
      this.pendingLoadBranchesAndCommitsForceRender = forceRender;
      return;
    }
    this.pendingLoadBranchesAndCommitsForceRender =
      this.pendingLoadBranchesAndCommitsForceRender || forceRender;
  }
  private flushPendingLoadBranchesAndCommits() {
    if (this.pendingLoadBranchesAndCommitsForceRender === null) return;
    const forceRender = this.pendingLoadBranchesAndCommitsForceRender;
    this.pendingLoadBranchesAndCommitsForceRender = null;
    this.requestLoadBranchesAndCommits(forceRender);
  }
  private queueLoadCommits(forceRender: boolean, loadedCallback: (changes: boolean) => void) {
    if (this.pendingLoadCommits === null) {
      this.pendingLoadCommits = { forceRender, callbacks: [loadedCallback] };
      return;
    }
    this.pendingLoadCommits.forceRender = this.pendingLoadCommits.forceRender || forceRender;
    this.pendingLoadCommits.callbacks.push(loadedCallback);
  }
  private flushPendingLoadCommits() {
    if (this.pendingLoadCommits === null) return;
    const pending = this.pendingLoadCommits;
    this.pendingLoadCommits = null;
    this.requestLoadCommits(pending.forceRender, (changes: boolean) => {
      for (const cb of pending.callbacks) {
        cb(changes);
      }
    });
  }
  private fetchAvatars(avatars: { [email: string]: string[] }) {
    let emails = Object.keys(avatars);
    for (let i = 0; i < emails.length; i++) {
      sendMessage({
        command: "fetchAvatar",
        repo: this.currentRepo!,
        email: emails[i],
        commits: avatars[emails[i]]
      });
    }
  }

  /* State */
  private saveState() {
    vscode.setState({
      gitRepos: this.gitRepos,
      gitBranches: this.gitBranches,
      gitBranchHead: this.gitBranchHead,
      commits: this.commits,
      commitHead: this.commitHead,
      avatars: this.avatars,
      selectedBranches: this.selectedBranches,
      currentRepo: this.currentRepo,
      moreCommitsAvailable: this.moreCommitsAvailable,
      maxCommits: this.maxCommits,
      showRemoteBranches: this.showRemoteBranches,
      expandedCommit: this.expandedCommit,
      findWidgetState: this.findWidget.getState(),
      selectedAuthors: this.selectedAuthors,
      scrollTop: this.scrollContainerElem.scrollTop,
      worktrees: this.worktrees
    });
  }

  /* CDV Height Helpers */
  private calculateCdvHeight(): number {
    const viewportHeight = window.innerHeight;
    const controlsHeight = document.getElementById("controls")?.clientHeight ?? 0;
    const headerHeight = (document.getElementById("tableColHeaders")?.clientHeight ?? 0) + 1;
    const commitRowHeight = this.config.grid.y;
    const availableHeight = viewportHeight - controlsHeight - headerHeight - commitRowHeight;
    return Math.max(Math.min(CDV_DEFAULT_HEIGHT, availableHeight), CDV_MIN_HEIGHT);
  }

  private updateCommitDetailsHeight() {
    if (this.expandedCommit === null) return;
    const cdvElem = document.getElementById("commitDetails");
    if (!cdvElem) return;
    const height = this.calculateCdvHeight();
    cdvElem.style.height = `${height}px`;
    this.renderGraph();
  }

  /* Renderers */
  private render() {
    this.renderTable();
    this.renderGraph();
    this.findWidget.setInputEnabled(true);
    this.findWidget.refresh();
    this.fileHistory.onCommitsRendered();
  }
  private renderGraph() {
    let colHeadersElem = document.getElementById("tableColHeaders");
    if (colHeadersElem === null) return;
    let headerHeight = colHeadersElem.clientHeight + 1,
      expandedCommitElem =
        this.expandedCommit !== null ? document.getElementById("commitDetails") : null;
    this.config.grid.expandY =
      expandedCommitElem !== null
        ? expandedCommitElem.getBoundingClientRect().height
        : this.config.grid.expandY;
    this.config.grid.y =
      this.commits.length > 0
        ? (this.tableElem.children[0].clientHeight -
            headerHeight -
            (this.expandedCommit !== null ? this.config.grid.expandY : 0)) /
          this.commits.length
        : this.config.grid.y;
    this.config.grid.offsetY = headerHeight + this.config.grid.y / 2;
    this.graph.render(this.expandedCommit);
  }
  private renderTable() {
    const focusUpdate = this.beginListFocusUpdate();
    // Close first: the ref listeners below are bound by class name across the whole document.
    // The ticket above already captured focus inside the list, so the list restores nothing.
    this.refOverflow.closePopup("replace");
    const savedScrollTop = this.scrollContainerElem.scrollTop;
    let html = `<tr id="tableColHeaders"><th id="tableHeaderGraphCol" class="tableColHeader">${t("table.graph")}</th><th class="tableColHeader">${t("table.description")}${this.buildCommitOrderingButtonHtml()}</th><th class="tableColHeader">${t("table.date")}</th><th class="tableColHeader">${t("table.author")}</th><th class="tableColHeader">${t("table.commit")}</th></tr>`,
      i,
      currentHash =
        this.commits.length > 0 && this.commits[0].hash === UNCOMMITTED_CHANGES_HASH
          ? UNCOMMITTED_CHANGES_HASH
          : this.commitHead;
    const muted = this.graph.getMutedCommits(this.commitHead);
    for (i = 0; i < this.commits.length; i++) {
      let refs = "",
        message = escapeHtml(this.commits[i].message),
        date = getCommitDate(this.commits[i].date),
        j,
        refName,
        refActive,
        refHtml;
      let branchLabels = getBranchLabels(this.commits[i].refs);
      for (j = 0; j < branchLabels.heads.length; j++) {
        refName = escapeHtml(branchLabels.heads[j].name);
        refActive = branchLabels.heads[j].name === this.gitBranchHead;
        const headRemotes = branchLabels.heads[j].remotes;
        const remotesAttr =
          headRemotes.length > 0 ? ` data-remotes="${headRemotes.map(escapeHtml).join(",")}"` : "";
        const wtEntry = this.worktrees.branches[branchLabels.heads[j].name];
        const isLinkedWorktree = wtEntry !== undefined && !wtEntry.isMain;
        const wtClass = isLinkedWorktree ? " worktree" : "";
        const wtAttr = isLinkedWorktree ? ` data-worktree-path="${escapeHtml(wtEntry.path)}"` : "";
        const wtTitle = isLinkedWorktree ? ` title="Worktree: ${escapeHtml(wtEntry.path)}"` : "";
        const branchIcon = isLinkedWorktree ? svgIcons.worktree : svgIcons.branch;
        refHtml = `<span class="gitRef head${refActive ? " active" : ""}${wtClass}" data-name="${refName}"${remotesAttr}${wtAttr}${wtTitle}>${REF_BUTTON_OPEN_TAG}${branchIcon}<span class="gitRefName">${refName}</span></button>`;
        for (let k = 0; k < branchLabels.heads[j].remotes.length; k++) {
          let remoteName = escapeHtml(branchLabels.heads[j].remotes[k]);
          refHtml += `<button type="button" class="${REF_BUTTON_CLASS} ${COMBINED_REMOTE_CLASS}" data-remote="${remoteName}" data-name="${escapeHtml(`${branchLabels.heads[j].remotes[k]}/${branchLabels.heads[j].name}`)}">${remoteName}</button>`;
        }
        refHtml += "</span>";
        refs = refActive ? refHtml + refs : refs + refHtml;
      }
      for (j = 0; j < branchLabels.remotes.length; j++) {
        refName = escapeHtml(branchLabels.remotes[j].name);
        refs += `<span class="gitRef remote" data-name="${refName}">${REF_BUTTON_OPEN_TAG}${svgIcons.branch}${refName}</button></span>`;
      }
      for (j = 0; j < branchLabels.tags.length; j++) {
        refName = escapeHtml(branchLabels.tags[j].name);
        refs += `<span class="gitRef tag" data-name="${refName}">${REF_BUTTON_OPEN_TAG}${svgIcons.tag}${refName}</button></span>`;
      }
      const commitHash: string = this.commits[i].hash;
      const detachedWorktrees = this.worktrees.detached
        .filter((entry) => !entry.isMain && entry.head === commitHash)
        .sort((a, b) => a.path.localeCompare(b.path));
      for (const detachedWorktree of detachedWorktrees) {
        const worktreePath = escapeHtml(detachedWorktree.path);
        const worktreeName = escapeHtml(getWorktreeLabelName(detachedWorktree.path));
        refs += `<span class="gitRef worktree ${DETACHED_WORKTREE_CLASS}" data-worktree-path="${worktreePath}" title="Worktree: ${worktreePath}">${REF_BUTTON_OPEN_TAG}${svgIcons.worktree}${worktreeName}</button></span>`;
      }
      if (this.commits[i].stash !== null) {
        let selectorDisplay = escapeHtml(
          buildStashSelectorDisplay(this.commits[i].stash!.selector)
        );
        refs = `<span class="gitRef stash" ${STASH_HASH_ATTRIBUTE}="${escapeHtml(commitHash)}">${REF_BUTTON_OPEN_TAG}${svgIcons.stash}${selectorDisplay}</button></span>${refs}`;
      }
      let rowClass = buildCommitRowAttributes(
        this.commits[i].hash,
        this.commits[i].stash,
        muted[i]
      );
      html += `<tr ${rowClass} data-id="${i}" data-color="${this.graph.getVertexColour(i)}"><td></td><td>${this.commits[i].hash === this.commitHead ? '<span class="commitHeadDot"></span>' : ""}${refs}<span class="commitMessage">${this.commits[i].hash === currentHash ? `<b>${message}</b>` : message}</span></td><td title="${date.title}">${date.value}</td><td title="${escapeHtml(`${this.commits[i].author} <${this.commits[i].email}>`)}">${
        this.config.fetchAvatars
          ? `<span class="avatar" data-email="${escapeHtml(this.commits[i].email)}">${
              typeof this.avatars[this.commits[i].email] === "string"
                ? `<img class="avatarImg" src="${escapeHtml(this.avatars[this.commits[i].email])}">`
                : ""
            }</span>`
          : ""
      }${escapeHtml(this.commits[i].author)}</td><td title="${escapeHtml(this.commits[i].hash)}">${escapeHtml(abbrevCommit(this.commits[i].hash))}</td></tr>`;
    }
    this.tableElem.innerHTML = `<table>${html}</table>`;
    this.footerElem.innerHTML = this.moreCommitsAvailable
      ? `<button type="button" id="${LOAD_MORE_BUTTON_ID}" class="roundedBtn">${t("table.loadMoreCommits")}</button>`
      : "";
    this.applyRowTargets();
    this.makeTableResizable();
    this.setupColumnHeaderContextMenu();

    if (this.moreCommitsAvailable) {
      const loadMoreElem = document.getElementById(LOAD_MORE_BUTTON_ID)!;
      markFocusTarget(loadMoreElem, { kind: "control", id: LOAD_MORE_BUTTON_ID });
      loadMoreElem.addEventListener("click", () => {
        const loadMoreFocusUpdate = beginFocusUpdate(this.footerElem);
        (<HTMLElement>(
          document.getElementById(LOAD_MORE_BUTTON_ID)!.parentNode!
        )).innerHTML = `<h2 id="loadingHeader">${svgIcons.loading}${t("loading.label")}</h2>`;
        this.maxCommits = normalizeCommitLoadCount(
          this.maxCommits + this.config.loadMoreCommits,
          this.config.initialLoadCommits
        );
        this.hideCommitDetails();
        this.saveState();
        this.requestLoadCommits(true, () => {});
        this.finishListFocusUpdate(loadMoreFocusUpdate);
      });
    }

    if (this.expandedCommit !== null) {
      let elem = null;
      const commitElems = document.querySelectorAll<HTMLElement>(".commit, .unsavedChanges");
      for (i = 0; i < commitElems.length; i++) {
        if (this.expandedCommit.hash === commitElems[i].dataset.hash) {
          elem = commitElems[i];
          break;
        }
      }
      if (elem === null) {
        this.expandedCommit = null;
        this.saveState();
      } else {
        this.expandedCommit.id = parseInt(elem.dataset.id!, 10);
        this.expandedCommit.srcElem = elem;
        if (this.expandedCommit.compareWithHash !== null) {
          this.expandedCommit.compareWithSrcElem = null;
          for (let ci = 0; ci < commitElems.length; ci++) {
            if (this.expandedCommit.compareWithHash === commitElems[ci].dataset.hash) {
              this.expandedCommit.compareWithSrcElem = commitElems[ci];
              commitElems[ci].classList.add("compareTarget");
              break;
            }
          }
        }
        this.saveState();
        if (this.expandedCommit.commitDetails !== null && this.expandedCommit.fileTree !== null) {
          this.showCommitDetails(this.expandedCommit.commitDetails, this.expandedCommit.fileTree);
        } else if (this.expandedCommit.loading) {
          elem.classList.add("commitDetailsOpen");
          this.renderCommitDetailsView();
          const commit = this.commits[this.commitLookup[this.expandedCommit.hash]];
          sendMessage({
            command: "commitDetails",
            repo: this.currentRepo!,
            commitHash: this.expandedCommit.hash,
            hasParents: commit !== undefined && commit.parentHashes.length > 0,
            isStash: commit !== undefined && commit.stash !== null
          });
        } else {
          this.loadCommitDetails(elem);
        }
      }
    }

    addListenerToClass("commit", "contextmenu", (e: Event) => {
      e.stopPropagation();
      this.showCommitRowContextMenu(
        <MouseEvent>e,
        <HTMLElement>(<Element>e.target).closest(".commit")!
      );
    });
    addListenerToClass("commit", "keydown", (e: Event) => {
      if (!consumeContextMenuLaunch(e)) return;
      this.showCommitRowContextMenu(e, <HTMLElement>e.currentTarget);
    });
    addListenerToClass("commit", "click", (e: Event) => {
      const mouseEvent = <MouseEvent>e;
      let sourceElem = <HTMLElement>(<Element>e.target).closest(".commit")!;
      const clickedHash = sourceElem.dataset.hash!;
      this.setRowTarget(clickedHash);
      this.fileHistory.handleCommitRowClick(clickedHash);
      this.handleCommitRowActivation(
        clickedHash,
        sourceElem,
        mouseEvent.ctrlKey || mouseEvent.metaKey
      );
    });
    addListenerToClass("unsavedChanges", "click", (e: Event) => {
      const mouseEvent = <MouseEvent>e;
      let sourceElem = <HTMLElement>(<Element>e.target).closest(".unsavedChanges")!;
      this.setRowTarget(sourceElem.dataset.hash!);
      this.handleCommitRowActivation(
        sourceElem.dataset.hash!,
        sourceElem,
        mouseEvent.ctrlKey || mouseEvent.metaKey
      );
    });
    addListenerToClass("unsavedChanges", "contextmenu", (e: Event) => {
      e.stopPropagation();
      this.showUncommittedContextMenu(
        <MouseEvent>e,
        <HTMLElement>(<Element>e.target).closest(".unsavedChanges")!
      );
    });
    addListenerToClass("unsavedChanges", "keydown", (e: Event) => {
      if (!consumeContextMenuLaunch(e)) return;
      this.showUncommittedContextMenu(e, <HTMLElement>e.currentTarget);
    });
    addListenerToClass("gitRef", "contextmenu", (e: Event) => {
      this.showRefBadgeContextMenu(<MouseEvent>e, <HTMLElement>e.currentTarget);
    });
    // Enter / Space open the part's menu like ContextMenu / Shift+F10; checkout stays on dblclick.
    addListenerToClass("gitRef", "keydown", (e: Event) => {
      if (consumeContextMenuLaunch(e)) {
        this.showRefBadgeContextMenu(e, <HTMLElement>e.currentTarget);
        return;
      }
      if (!(e instanceof KeyboardEvent) || e.defaultPrevented) return;
      if (e.key !== KEY_ENTER && e.key !== KEY_SPACE) return;
      if (isKeyboardActionBlocked(e)) return;
      const part = e.target instanceof Element ? e.target.closest(REF_BUTTON_SELECTOR) : null;
      if (part === null) return;
      consumeKey(e);
      this.showRefBadgeContextMenu(e, <HTMLElement>e.currentTarget);
    });
    addListenerToClass("gitRef", "click", (e: Event) => e.stopPropagation());
    addListenerToClass("gitRef", "dblclick", (e: Event) => {
      e.stopPropagation();
      if (isDialogActive()) hideDialog();
      if (isContextMenuActive()) hideContextMenu();
      let target = <HTMLElement>e.target;
      let sourceElem = <HTMLElement>target.closest(REF_BADGE_SELECTOR)!;
      if (sourceElem.classList.contains(DETACHED_WORKTREE_CLASS)) return;
      const remoteElem = target.closest<HTMLElement>(COMBINED_REMOTE_SELECTOR);
      if (remoteElem !== null && sourceElem.contains(remoteElem)) {
        checkoutBranchAction(this.currentRepo, sourceElem, remoteElem.dataset.name!, true);
      } else {
        checkoutBranchAction(this.currentRepo, sourceElem, sourceElem.dataset.name!);
      }
    });
    // Attach after the listeners above so measurement clones never receive them.
    const tableElem = this.tableElem.querySelector("table");
    if (tableElem !== null) this.refOverflow.attachTable(tableElem);

    this.finishListFocusUpdate(focusUpdate);
    this.scrollContainerElem.scrollTop = savedScrollTop;
  }
  // Pointer and keyboard launches share these builders, so a row's menu is the same either way.
  private showCommitRowContextMenu(event: ContextMenuTrigger, sourceElem: HTMLElement): void {
    let hash = sourceElem.dataset.hash!;
    let commit = this.commits[this.commitLookup[hash]];
    if (commit.stash !== null) {
      let selector = commit.stash.selector;
      showContextMenu(
        event,
        buildStashContextMenuItems(this.currentRepo, hash, selector, sourceElem),
        sourceElem,
        this.getCurrentRepoRecentActions()
      );
      return;
    }
    const repo = this.currentRepo;
    const subject = commit.message;
    showContextMenu(
      event,
      buildCommitContextMenuItems(
        repo,
        hash,
        commit.parentHashes,
        this.commits,
        this.commitLookup,
        sourceElem,
        (mode) => this.pathHighlight.select({ kind: "commit", repo, hash, name: subject, mode })
      ),
      sourceElem,
      this.getCurrentRepoRecentActions()
    );
  }
  private showUncommittedContextMenu(event: ContextMenuTrigger, sourceElem: HTMLElement): void {
    showContextMenu(
      event,
      buildUncommittedContextMenuItems(this.currentRepo, sourceElem),
      sourceElem,
      this.getCurrentRepoRecentActions()
    );
  }
  private showFileRowContextMenu(event: ContextMenuTrigger): void {
    if (!(event.target instanceof Element)) return;
    const target = event.target;
    const fileRow = resolveFileRow(target);
    if (fileRow === null) return;
    const items = buildFileContextMenuItems(
      fileRow,
      this.expandedCommit,
      this.currentRepo,
      this.buildFileHistoryMenuContext()
    );
    if (items.length === 0) return;
    // The builder keeps the row (its dataset); the menu is anchored to and restores focus to the
    // child button that launched it, or to the row when the row itself is the tab stop.
    const source = target.closest<HTMLElement>("button") ?? fileRow;
    showContextMenu(event, items, source, this.getCurrentRepoRecentActions());
  }
  private showRefBadgeContextMenu(
    event: ContextMenuTrigger,
    badge: HTMLElement,
    focusOptions?: ContextMenuFocusOptions
  ): void {
    event.stopPropagation();
    // The builders keep the badge (its dataset and dialog / checkout marks); the menu itself is
    // anchored to and restores focus to the operable part that launched it.
    const source = resolveRefSource(event, badge);
    if (badge.classList.contains(STASH_BADGE_CLASS)) {
      this.showStashBadgeContextMenu(event, badge, source, focusOptions);
      return;
    }
    if (badge.classList.contains(DETACHED_WORKTREE_CLASS)) {
      const worktreePath = badge.dataset.worktreePath;
      if (worktreePath === undefined) return;
      showContextMenu(
        event,
        buildDetachedWorktreeContextMenuItems(this.currentRepo, worktreePath),
        source,
        this.getCurrentRepoRecentActions(),
        focusOptions
      );
      return;
    }
    const isRemoteCombined = source.classList.contains(COMBINED_REMOTE_CLASS);
    const refName = isRemoteCombined ? source.dataset.name! : badge.dataset.name!;
    const remotes = badge.dataset.remotes ? badge.dataset.remotes.split(",") : undefined;
    let worktreeInfo: { path: string; isMainWorktree: boolean } | null = null;
    if (badge.classList.contains("head") && !isRemoteCombined) {
      const wtEntry = this.worktrees.branches[badge.dataset.name!];
      if (wtEntry) {
        worktreeInfo = { path: wtEntry.path, isMainWorktree: wtEntry.isMain };
      }
    }
    const onHighlight = this.buildRefHighlightHandler(
      resolveRefType(badge, isRemoteCombined),
      refName
    );
    // Labels without a highlight target keep the builder's existing argument list.
    const highlightArgs: [] | [(mode: BranchPathMode) => void] =
      onHighlight === undefined ? [] : [onHighlight];
    showContextMenu(
      event,
      buildRefContextMenuItems(
        this.currentRepo,
        refName,
        badge,
        isRemoteCombined,
        this.gitBranchHead,
        remotes,
        worktreeInfo,
        ...highlightArgs
      ),
      source,
      this.getCurrentRepoRecentActions(),
      focusOptions
    );
  }
  // The target is bound at menu time by exact ref type and name, so listed clones and shared tips resolve the same way.
  private buildRefHighlightHandler(
    refType: BranchRefType | null,
    refName: string
  ): ((mode: BranchPathMode) => void) | undefined {
    if (refType === null) return undefined;
    const target = this.commits.find((commit) =>
      commit.refs.some((ref) => ref.type === refType && ref.name === refName)
    );
    if (target === undefined) return undefined;
    const selection = {
      kind: "branch",
      refType,
      repo: this.currentRepo,
      hash: target.hash,
      name: refName
    } as const;
    return (mode) => this.pathHighlight.select({ ...selection, mode });
  }
  // A listed clone lives outside its row, so the stash is resolved from the badge's hash attribute.
  private showStashBadgeContextMenu(
    event: ContextMenuTrigger,
    badge: HTMLElement,
    source: HTMLElement,
    focusOptions?: ContextMenuFocusOptions
  ): void {
    const hash = badge.getAttribute(STASH_HASH_ATTRIBUTE);
    if (hash === null || hash === "") return;
    const index = this.commitLookup[hash];
    if (typeof index !== "number") return;
    const commit = this.commits[index];
    if (commit === undefined || commit.hash !== hash) return;
    if (commit.stash === null || commit.stash === undefined) return;
    const originalRow = Array.from(
      this.tableElem.querySelectorAll<HTMLElement>(COMMIT_ROW_SELECTOR)
    ).find((row) => row.dataset.hash === hash);
    if (originalRow === undefined) return;
    showContextMenu(
      event,
      buildStashContextMenuItems(this.currentRepo, hash, commit.stash.selector, originalRow),
      source,
      this.getCurrentRepoRecentActions(),
      focusOptions
    );
  }
  private renderUncommitedChanges() {
    let date = getCommitDate(this.commits[0].date);
    const rowElem = <HTMLElement>document.getElementsByClassName("unsavedChanges")[0];
    const focusUpdate = beginFocusUpdate(rowElem);
    rowElem.innerHTML = `<td></td><td><b>${escapeHtml(this.commits[0].message)}</b></td><td title="${date.title}">${date.value}</td><td title="* <>">*</td><td title="*">*</td>`;
    finishFocusUpdate(focusUpdate);
  }
  // A same-repository loading view keeps the menu (its action context is captured at open time);
  // repository changes close it explicitly in leaveRepository().
  private renderShowLoading() {
    const focusUpdate = this.beginListFocusUpdate();
    this.refOverflow.detachTable();
    if (isDialogActive()) hideDialog();
    this.graph.clear();
    this.tableElem.innerHTML = `<h2 id="loadingHeader">${svgIcons.loading}${t("loading.label")}</h2>`;
    this.footerElem.innerHTML = "";
    this.findWidget.setInputEnabled(false);
    this.finishListFocusUpdate(focusUpdate);
  }
  private makeTableResizable() {
    const colHeadersElem = document.getElementById("tableColHeaders");
    if (colHeadersElem === null) return;
    const cols = <HTMLCollectionOf<HTMLElement>>document.getElementsByClassName("tableColHeader");
    let columnWidths = this.gitRepos[this.currentRepo].columnWidths,
      mouseX = -1,
      col = -1;
    this.displayFixedColumns = [];

    const makeTableFixedLayout = () => {
      if (columnWidths !== null) {
        // Fixed layout owns the header widths from here on, so they are no longer display-only.
        this.displayFixedColumns = [];
        cols[0].style.width = `${columnWidths[0]}px`;
        cols[0].style.padding = "";
        cols[2].style.width = `${columnWidths[1]}px`;
        cols[3].style.width = `${columnWidths[2]}px`;
        cols[4].style.width = `${columnWidths[3]}px`;
        this.tableElem.className = "fixedLayout";
        this.graph.limitMaxWidth(columnWidths[0] + 16);
      }
    };
    const stopResizing = () => {
      if (col > -1 && columnWidths !== null) {
        col = -1;
        mouseX = -1;
        colHeadersElem.classList.remove("resizing");
        this.refOverflow.scheduleLayout();
        this.gitRepos[this.currentRepo].columnWidths = columnWidths;
        sendMessage({
          command: "saveRepoState",
          repo: this.currentRepo,
          state: this.gitRepos[this.currentRepo]
        });
      }
    };

    for (let i = 0; i < cols.length; i++) {
      cols[i].innerHTML +=
        (i > 0 ? `<span class="resizeCol left" data-col="${i - 1}"></span>` : "") +
        (i < cols.length - 1 ? `<span class="resizeCol right" data-col="${i}"></span>` : "");
    }
    if (columnWidths !== null) {
      makeTableFixedLayout();
    } else {
      this.tableElem.className = "autoLayout";
      const graphTargetWidth = Math.max(this.graph.getWidth() + 16, GRAPH_COL_MIN_WIDTH);
      const graphMaxWidth = Math.floor(document.body.clientWidth * GRAPH_AUTO_LAYOUT_MAX_RATIO);
      const graphCappedWidth = Math.min(graphTargetWidth, graphMaxWidth);
      if (graphCappedWidth < graphTargetWidth) {
        this.graph.limitMaxWidth(graphCappedWidth);
      } else {
        this.graph.limitMaxWidth(-1);
      }
      const col0Width = cols[0]?.offsetWidth ?? 0;
      const graphPadding = Math.max(0, Math.round((graphCappedWidth - (col0Width - 24)) / 2));
      if (cols[0]) cols[0].style.padding = `0 ${graphPadding}px`;
    }

    addListenerToClass("resizeCol", "mousedown", (e) => {
      col = parseInt((<HTMLElement>e.target).dataset.col!, 10);
      mouseX = (<MouseEvent>e).clientX;
      if (columnWidths === null) {
        columnWidths = [
          cols[0].clientWidth - 24,
          cols[2].clientWidth - 24,
          cols[3].clientWidth - 24,
          cols[4].clientWidth - 24
        ];
        makeTableFixedLayout();
      }
      colHeadersElem.classList.add("resizing");
    });
    colHeadersElem.addEventListener("mousemove", (e) => {
      if (col > -1 && columnWidths !== null) {
        let mouseEvent = <MouseEvent>e;
        let mouseDeltaX = mouseEvent.clientX - mouseX;
        switch (col) {
          case 0:
            if (columnWidths[0] + mouseDeltaX < 40) mouseDeltaX = -columnWidths[0] + 40;
            mouseDeltaX = Math.min(mouseDeltaX, this.getDescriptionShrinkLimit(cols[1]));
            columnWidths[0] += mouseDeltaX;
            cols[0].style.width = `${columnWidths[0]}px`;
            this.graph.limitMaxWidth(columnWidths[0] + 16);
            break;
          case 1:
            mouseDeltaX = Math.max(mouseDeltaX, -this.getDescriptionShrinkLimit(cols[1]));
            if (columnWidths[1] - mouseDeltaX < 40) mouseDeltaX = columnWidths[1] - 40;
            columnWidths[1] -= mouseDeltaX;
            cols[2].style.width = `${columnWidths[1]}px`;
            break;
          default:
            if (columnWidths[col - 1] + mouseDeltaX < 40) mouseDeltaX = -columnWidths[col - 1] + 40;
            if (columnWidths[col] - mouseDeltaX < 40) mouseDeltaX = columnWidths[col] - 40;
            columnWidths[col - 1] += mouseDeltaX;
            columnWidths[col] -= mouseDeltaX;
            cols[col].style.width = `${columnWidths[col - 1]}px`;
            cols[col + 1].style.width = `${columnWidths[col]}px`;
        }
        mouseX = mouseEvent.clientX;
        this.refOverflow.scheduleLayout();
      }
    });
    colHeadersElem.addEventListener("mouseup", stopResizing);
    colHeadersElem.addEventListener("mouseleave", stopResizing);
  }
  private setupColumnHeaderContextMenu() {
    const colHeadersElem = document.getElementById("tableColHeaders");
    if (colHeadersElem === null) return;
    colHeadersElem.addEventListener("contextmenu", (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this.showCommitOrderingContextMenu(e, colHeadersElem);
    });
    colHeadersElem.addEventListener("keydown", (e: KeyboardEvent) => {
      if (!consumeContextMenuLaunch(e)) return;
      this.showCommitOrderingContextMenu(e, colHeadersElem);
    });
    this.bindCommitOrderingButton();
  }
  // Bound after makeTableResizable(), whose innerHTML append re-creates the header children.
  // Enter / Space are handled on keydown so the menu is placed by the button and focuses its first
  // item; the consumed keydown suppresses the native click that would otherwise open it twice.
  private bindCommitOrderingButton() {
    const button = document.getElementById(COMMIT_ORDERING_BUTTON_ID);
    if (button === null) return;
    markFocusTarget(button, { kind: "control", id: COMMIT_ORDERING_BUTTON_ID });
    button.addEventListener("click", (e: MouseEvent) => {
      e.stopPropagation();
      this.showCommitOrderingContextMenu(e, button);
    });
    button.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.defaultPrevented || (e.key !== KEY_ENTER && e.key !== KEY_SPACE)) return;
      if (isKeyboardActionBlocked(e)) return;
      consumeKey(e);
      this.showCommitOrderingContextMenu(e, button);
    });
  }
  private getRepoCommitOrdering(): GG.RepoCommitOrdering {
    return this.gitRepos[this.currentRepo]?.commitOrdering ?? "default";
  }
  private buildCommitOrderingButtonHtml(): string {
    const ordering = this.getRepoCommitOrdering();
    const current = COMMIT_ORDERING_MENU_ITEMS.find((item) => item.value === ordering);
    const name = escapeHtml(current === undefined ? "" : current.label);
    return `<button type="button" id="${COMMIT_ORDERING_BUTTON_ID}" class="${COMMIT_ORDERING_BUTTON_CLASS}" aria-haspopup="menu" title="${name}" aria-label="${name}">${COMMIT_ORDERING_BUTTON_GLYPH}</button>`;
  }
  private showCommitOrderingContextMenu(event: ContextMenuTrigger, sourceElem: HTMLElement) {
    const repoOrdering = this.getRepoCommitOrdering();
    const items: ContextMenuElement[] = COMMIT_ORDERING_MENU_ITEMS.map(({ label, value }) => ({
      title: value === repoOrdering ? `\u2713 ${label}` : label,
      onClick: () => {
        const updatedRepo: GG.GitRepoState = {
          ...this.gitRepos[this.currentRepo],
          commitOrdering: value
        };
        this.gitRepos[this.currentRepo] = updatedRepo;
        sendMessage({
          command: "saveRepoState",
          repo: this.currentRepo,
          state: updatedRepo
        });
        this.requestLoadCommits(true, () => {});
      }
    }));
    showContextMenu(event, items, sourceElem, this.getCurrentRepoRecentActions());
  }

  /* Description Column Minimum Width */
  private getDescriptionShrinkLimit(descriptionHeader: HTMLElement): number {
    const headerLimit = descriptionHeader.clientWidth - DESCRIPTION_MIN_WIDTH;
    const cell = this.tableElem.querySelector<HTMLElement>("td:nth-child(2)");
    if (this.descriptionMinimumWidth === null || cell === null) return headerLimit;
    // Compare the data cell's inner width (border-box minus borders) with M, never the padded header.
    const innerWidth = cell.getBoundingClientRect().width - getHorizontalBorderWidth(cell);
    const limit = innerWidth - this.descriptionMinimumWidth;
    return Number.isFinite(limit) ? limit : headerLimit;
  }
  private applyDescriptionMinimumWidth(minimum: number | null) {
    this.descriptionMinimumWidth = minimum;
    const table = this.tableElem.querySelector<HTMLElement>("table");
    const contentElem = document.getElementById("content");
    this.releaseDisplayColumnWidths();
    const headers = table?.querySelectorAll<HTMLElement>("#tableColHeaders > th") ?? [];
    if (minimum === null || table === null || headers.length !== TABLE_COLUMN_COUNT) {
      setMinWidth([table, contentElem], "");
      return;
    }
    const otherHeaders = Array.from(headers).filter(
      (_header, index) => index !== DESCRIPTION_COLUMN_INDEX
    );
    const otherWidths = otherHeaders.map((header) => header.getBoundingClientRect().width);
    if (this.tableElem.classList.contains("autoLayout")) {
      this.fixDisplayColumnWidths(otherHeaders, otherWidths);
    }
    const cell = table.querySelector<HTMLElement>("td:nth-child(2)");
    const minWidth =
      otherWidths.reduce((sum, width) => sum + width, 0) +
      minimum +
      (cell === null ? 0 : getHorizontalBorderWidth(cell)) +
      getHorizontalBorderWidth(table);
    if (!Number.isFinite(minWidth)) return;
    setMinWidth([table, contentElem], `${minWidth}px`);
  }
  // Auto layout pins the other columns at their natural widths so folding cannot shift them.
  // These widths are display-only and never reach columnWidths or saveRepoState.
  private fixDisplayColumnWidths(headers: HTMLElement[], outerWidths: number[]) {
    const contentWidths = headers.map((header, index) => {
      const style = getComputedStyle(header);
      return (
        outerWidths[index] -
        getHorizontalSum(style, "padding-left", "padding-right") -
        getHorizontalSum(style, "border-left-width", "border-right-width")
      );
    });
    headers.forEach((header, index) => {
      if (Number.isFinite(contentWidths[index])) {
        header.style.width = `${contentWidths[index]}px`;
      }
    });
    this.displayFixedColumns = headers;
  }
  private releaseDisplayColumnWidths() {
    for (const header of this.displayFixedColumns) {
      header.style.width = "";
    }
    this.displayFixedColumns = [];
  }

  /* Observers */
  private observeWindowSizeChanges() {
    let windowWidth = window.outerWidth,
      windowHeight = window.outerHeight;
    window.addEventListener("resize", () => {
      this.releaseDisplayColumnWidths();
      this.refOverflow.scheduleLayout();
      if (windowWidth === window.outerWidth && windowHeight === window.outerHeight) {
        if (this.expandedCommit !== null) {
          this.updateCommitDetailsHeight();
        } else {
          this.renderGraph();
        }
      } else {
        windowWidth = window.outerWidth;
        windowHeight = window.outerHeight;
        if (this.expandedCommit !== null) {
          this.updateCommitDetailsHeight();
        }
      }
    });
  }
  private observeWebviewStyleChanges() {
    let fontFamily = getVSCodeStyle("--vscode-editor-font-family");
    new MutationObserver(() => {
      let ff = getVSCodeStyle("--vscode-editor-font-family");
      if (ff !== fontFamily) {
        fontFamily = ff;
        this.repoDropdown.refresh();
        this.branchDropdown.refresh();
        this.authorDropdown.refresh();
      }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
  }
  private observeWebviewScroll() {
    let active = this.scrollContainerElem.scrollTop > 0;
    this.scrollShadowElem.className = active ? "active" : "";
    this.scrollContainerElem.addEventListener("scroll", () => {
      this.refOverflow.closePopup();
      if (active !== this.scrollContainerElem.scrollTop > 0) {
        active = this.scrollContainerElem.scrollTop > 0;
        this.scrollShadowElem.className = active ? "active" : "";
      }

      const { scrollTop, clientHeight, scrollHeight } = this.scrollContainerElem;
      if (
        this.config.loadMoreCommitsAutomatically &&
        this.moreCommitsAvailable &&
        !this.isLoadingMoreCommits &&
        scrollTop + clientHeight >= scrollHeight - SCROLL_AUTO_LOAD_THRESHOLD
      ) {
        this.isLoadingMoreCommits = true;
        this.maxCommits = normalizeCommitLoadCount(
          this.maxCommits + this.config.loadMoreCommits,
          this.config.initialLoadCommits
        );
        this.requestLoadCommits(true, () => {
          this.isLoadingMoreCommits = false;
        });
      }
    });
  }

  /* Scroll to Commit */
  private scrollToCommit(hash: string, alwaysCenterCommit: boolean, flash: boolean = false) {
    const elem = document.querySelector<HTMLElement>(`.commit[data-hash="${hash}"]`);
    if (elem === null) return;

    const elemTop = elem.offsetTop;
    const scrollTop = this.scrollContainerElem.scrollTop;
    const viewHeight = this.scrollContainerElem.clientHeight;
    if (
      alwaysCenterCommit ||
      elemTop - SCROLL_PADDING_TOP < scrollTop ||
      elemTop + SCROLL_ROW_HEIGHT > scrollTop + viewHeight
    ) {
      this.scrollContainerElem.scrollTop = elemTop + SCROLL_CENTER_OFFSET - viewHeight / 2;
    }

    if (flash && !elem.classList.contains("flash")) {
      elem.classList.add("flash");
      setTimeout(() => {
        elem.classList.remove("flash");
      }, FLASH_ANIMATION_DURATION_MS);
    }
  }

  // Polite notices live outside the graph, so a re-render never re-reads the whole list (R4.8).
  private announceStatus(text: string) {
    const notice = document.getElementById(STATUS_NOTICE_ID);
    if (notice !== null) notice.textContent = text;
  }

  private updateCurrentBtnState() {
    const currentBtn = document.getElementById("currentBtn");
    if (currentBtn === null) return;
    const isHeadVisible =
      this.commitHead !== null && typeof this.commitLookup[this.commitHead] === "number";
    if (isHeadVisible) {
      currentBtn.classList.remove("disabled");
    } else {
      currentBtn.classList.add("disabled");
    }
    currentBtn.toggleAttribute("disabled", !isHeadVisible);
  }

  /* Keyboard Shortcuts */
  // Local UIs (menu, dialog, dropdowns) stop their keys before they reach here; a consumed or
  // composition-bound key is never handled twice (R4.6).
  private handleKeyboardShortcut(e: KeyboardEvent) {
    if (e.defaultPrevented || isKeyboardActionBlocked(e)) return;
    if (e.key === KEY_TAB) {
      this.handleListTab(e);
      return;
    }
    const focused = this.resolveFocusedRow(e.target);
    if (focused !== null && this.handleRowKey(e, focused.row, focused.onRow)) return;
    this.handleConfiguredShortcut(e, focused !== null || this.isListScopeTarget(e.target));
  }

  // The list keys apply only to a row or to one of its ref labels; inputs, buttons, file actions
  // and the details view keep their own keys (R4.2).
  private resolveFocusedRow(
    target: EventTarget | null
  ): { row: HTMLElement; onRow: boolean } | null {
    if (!(target instanceof HTMLElement) || !this.tableElem.contains(target)) return null;
    if (isEditableEventTarget(target)) return null;
    const row = target.closest<HTMLElement>(ROW_SELECTOR);
    if (row === null) return null;
    if (target === row) return { row, onRow: true };
    const label = target.closest<HTMLElement>(ROW_LABEL_SELECTOR);
    return label !== null && row.contains(label) ? { row, onRow: false } : null;
  }

  private isListScopeTarget(target: EventTarget | null): boolean {
    return target === document.body || target === document || target === this.tableElem;
  }

  // Returns true when the key belonged to the list, whether or not it moved anything.
  private handleRowKey(e: KeyboardEvent, row: HTMLElement, onRow: boolean): boolean {
    if (e.altKey) return false;
    const hash = row.dataset.hash;
    const index = hash === undefined ? undefined : this.commitLookup[hash];
    if (hash === undefined || typeof index !== "number") return false;
    const ctrlOrCmd = e.ctrlKey || e.metaKey;
    if (e.key === KEY_ENTER) {
      // Ref labels and the overflow counter own their Enter; Shift / Alt + Enter are unassigned.
      if (!onRow || e.shiftKey) return false;
      consumeKey(e);
      if (ctrlOrCmd) {
        this.handleCommitRowActivation(hash, row, true);
      } else {
        this.openRowDetails(row, hash);
      }
      return true;
    }
    if (e.key !== KEY_ARROW_UP && e.key !== KEY_ARROW_DOWN) return false;
    const delta: -1 | 1 = e.key === KEY_ARROW_UP ? -1 : 1;
    if (this.isComparing()) {
      if (ctrlOrCmd || e.shiftKey) return false;
      return this.moveRowTarget(index + delta, e, false);
    }
    if (this.fileHistory.isActive() || this.fileHistory.isPending()) {
      return this.handleFileHistoryArrowKey(e, delta, ctrlOrCmd);
    }
    if (!ctrlOrCmd) {
      if (e.shiftKey) return false;
      return this.moveRowTarget(index + delta, e, this.expandedCommit !== null);
    }
    const graphIndex = e.shiftKey
      ? delta < 0
        ? this.graph.getAlternativeChildIndex(index)
        : this.graph.getAlternativeParentIndex(index)
      : delta < 0
        ? this.graph.getFirstChildIndex(index)
        : this.graph.getFirstParentIndex(index);
    return this.moveRowTarget(graphIndex, e, this.expandedCommit !== null);
  }

  // The history edge, a pending request and Ctrl/Cmd arrows are consumed without moving, so the
  // key never falls through to the table order or the graph (A8.2-1).
  private handleFileHistoryArrowKey(e: KeyboardEvent, delta: -1 | 1, ctrlOrCmd: boolean): boolean {
    if (!ctrlOrCmd && e.shiftKey) return false;
    consumeKey(e);
    if (ctrlOrCmd || this.fileHistory.isPending()) return true;
    const hash = this.fileHistory.navigate(delta, true);
    if (hash === null) return true;
    const destination = this.findRowByHash(hash);
    if (destination === null) return true;
    this.setRowTarget(hash);
    destination.focus({ preventScroll: true });
    this.loadCommitDetails(destination);
    return true;
  }

  // Table-order and graph moves share this: the row gets real focus and the details follow only
  // while a single details view is open. An out-of-range destination is left unconsumed, so the
  // list never wraps and never fetches unloaded commits.
  private moveRowTarget(index: number, e: KeyboardEvent, followDetails: boolean): boolean {
    const commit = this.commits[index];
    const row = commit === undefined ? null : this.findRowByHash(commit.hash);
    if (commit === undefined || row === null) return false;
    consumeKey(e);
    this.setRowTarget(commit.hash);
    row.focus({ preventScroll: true });
    if (followDetails && !this.hasSingleDetailsFor(commit.hash)) {
      this.loadCommitDetails(row);
    } else {
      this.scrollRowIntoView(row);
    }
    return true;
  }

  // Enter opens; unlike the click path it never closes the same single details (R4.2).
  private openRowDetails(row: HTMLElement, hash: string): void {
    if (this.hasSingleDetailsFor(hash)) return;
    this.loadCommitDetails(row);
  }

  private isComparing(): boolean {
    return this.expandedCommit !== null && this.expandedCommit.compareWithHash !== null;
  }

  private hasSingleDetailsFor(hash: string): boolean {
    return (
      this.expandedCommit !== null &&
      this.expandedCommit.compareWithHash === null &&
      this.expandedCommit.hash === hash
    );
  }

  // Manual moves scroll by the smallest amount that shows the row below the sticky header.
  private scrollRowIntoView(row: HTMLElement): void {
    const container = this.scrollContainerElem;
    const headerHeight = (document.getElementById(TABLE_HEADERS_ID)?.clientHeight ?? 0) + 1;
    const rowTop = row.offsetTop;
    const rowBottom = rowTop + row.offsetHeight;
    if (rowTop < container.scrollTop + headerHeight + SCROLL_PADDING_TOP) {
      container.scrollTop = Math.max(0, rowTop - headerHeight - SCROLL_PADDING_TOP);
    } else if (rowBottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = rowBottom - container.clientHeight;
    }
  }

  private handleConfiguredShortcut(e: KeyboardEvent, inListScope: boolean): void {
    if (!(e.ctrlKey || e.metaKey) || !inListScope || isDialogActive()) return;

    const key = e.key.toLowerCase();
    const { keybindings } = this.config;

    if (key === keybindings.find) {
      e.preventDefault();
      this.openFindWidget();
    } else if (key === keybindings.refresh) {
      e.preventDefault();
      this.refresh("hard");
    } else if (key === keybindings.scrollToHead) {
      e.preventDefault();
      if (this.commitHead !== null && typeof this.commitLookup[this.commitHead] === "number") {
        this.scrollToCommit(this.commitHead, true, true);
      }
    } else if (key === keybindings.scrollToStash) {
      e.preventDefault();
      this.scrollToStash(!e.shiftKey);
    }
  }

  /* Row Target and Tab Stops */
  private leaveRepository(): void {
    if (isContextMenuActive()) hideContextMenu("repository");
    this.rowTarget = null;
  }

  private beginListFocusUpdate(): FocusUpdate | null {
    return beginFocusUpdate(this.tableElem) ?? beginFocusUpdate(this.footerElem);
  }

  // Focus dropped by a replacement returns by key, else to the row target; while no row exists
  // (loading view, repository change) it parks on the named list container instead of body.
  private finishListFocusUpdate(update: FocusUpdate | null): void {
    if (update === null || finishFocusUpdate(update)) return;
    const active = document.activeElement;
    if (active === null || active === document.body) {
      this.tableElem.focus({ preventScroll: true });
    }
  }

  // Rows are re-marked on every render; only the target row and its labels are tab stops and
  // the empty list exposes the container itself (R4.1).
  private applyRowTargets(): void {
    const rows = this.tableElem.querySelectorAll<HTMLElement>(ROW_SELECTOR);
    const targetHash = this.rowTarget === null ? null : this.rowTarget.hash;
    rows.forEach((row) => {
      const hash = row.dataset.hash;
      if (hash === undefined) return;
      markFocusTarget(row, this.rowKey(hash));
      row.querySelectorAll<HTMLElement>(REF_BUTTON_SELECTOR).forEach((part) => {
        const key = this.resolveRefKey(part);
        if (key !== null) markFocusTarget(part, key);
      });
      this.setRowTabIndex(row, hash === targetHash ? TAB_INDEX_STOP : TAB_INDEX_PROGRAMMATIC);
    });
    this.tableElem.tabIndex = rows.length === 0 ? TAB_INDEX_STOP : TAB_INDEX_PROGRAMMATIC;
  }

  private rowKey(hash: string): FocusKey {
    return { kind: "row", repo: this.currentRepo, hash };
  }

  // A part is identified by its row and by the full name of what it operates on: the head or
  // remote name, the tag, the stash hash or the worktree path (plan §3.4).
  private resolveRefKey(part: HTMLElement): FocusKey | null {
    const badge = part.closest<HTMLElement>(REF_BADGE_SELECTOR);
    const hash = part.closest<HTMLElement>(ROW_SELECTOR)?.dataset.hash;
    if (badge === null || hash === undefined) return null;
    const base = { kind: "ref", repo: this.currentRepo, hash } as const;
    if (badge.classList.contains(STASH_BADGE_CLASS)) {
      const stashHash = badge.getAttribute(STASH_HASH_ATTRIBUTE);
      return stashHash === null || stashHash === ""
        ? null
        : { ...base, refType: "stash", name: stashHash };
    }
    if (badge.classList.contains(DETACHED_WORKTREE_CLASS)) {
      const path = badge.dataset.worktreePath;
      return path === undefined ? null : { ...base, refType: "worktree", name: path };
    }
    if (part.classList.contains(COMBINED_REMOTE_CLASS)) {
      const name = part.dataset.name;
      return name === undefined ? null : { ...base, refType: REF_CLASS_REMOTE, name };
    }
    const name = badge.dataset.name;
    if (name === undefined) return null;
    if (badge.classList.contains(REF_CLASS_TAG)) return { ...base, refType: REF_CLASS_TAG, name };
    const refType = badge.classList.contains(REF_CLASS_REMOTE) ? REF_CLASS_REMOTE : REF_CLASS_HEAD;
    return { ...base, refType, name };
  }

  private setRowTabIndex(row: HTMLElement, tabIndex: number): void {
    row.tabIndex = tabIndex;
    row.querySelectorAll<HTMLElement>(ROW_LABEL_STOP_SELECTOR).forEach((label) => {
      label.tabIndex = tabIndex;
    });
  }

  private setRowTarget(hash: string): void {
    const index = this.commitLookup[hash];
    if (typeof index !== "number") return;
    const previous = this.rowTarget;
    if (previous !== null && previous.hash === hash) return;
    this.rowTarget = { repo: this.currentRepo, hash, index };
    const previousRow = previous === null ? null : this.findRowByHash(previous.hash);
    if (previousRow !== null) this.setRowTabIndex(previousRow, TAB_INDEX_PROGRAMMATIC);
    const row = this.findRowByHash(hash);
    if (row !== null) this.setRowTabIndex(row, TAB_INDEX_STOP);
  }

  // Real focus on a row or one of its labels only syncs the target; it never requests anything.
  private syncRowTargetFromFocus(target: EventTarget | null): void {
    const row = target instanceof Element ? target.closest<HTMLElement>(ROW_SELECTOR) : null;
    const hash = row === null ? undefined : row.dataset.hash;
    if (hash !== undefined) this.setRowTarget(hash);
  }

  private findRowByHash(hash: string): HTMLElement | null {
    const index = this.commitLookup[hash];
    if (typeof index !== "number") return null;
    const row = this.tableElem.querySelector<HTMLElement>(`${ROW_SELECTOR}[data-id="${index}"]`);
    return row !== null && row.dataset.hash === hash ? row : null;
  }

  private getRowTargetElem(): HTMLElement | null {
    return this.rowTarget === null || this.rowTarget.repo !== this.currentRepo
      ? null
      : this.findRowByHash(this.rowTarget.hash);
  }

  private getRowLabelStops(row: HTMLElement): HTMLElement[] {
    return Array.from(row.querySelectorAll<HTMLElement>(ROW_LABEL_STOP_SELECTOR)).filter(isTabStop);
  }

  // Logical order of plan R4.3: toolbar, path bar, history bar, cleanup panel, column headers,
  // the target row, its labels left to right, the open details, load more, find widget.
  private getTabStops(): readonly HTMLElement[] {
    const toolbar = TOOLBAR_STOP_SELECTORS.map((selector) =>
      document.querySelector<HTMLElement>(selector)
    ).filter((element): element is HTMLElement => element !== null && isTabStop(element));
    const row = this.getRowTargetElem();
    const listEntry =
      row !== null ? [row, ...this.getRowLabelStops(row)] : [this.tableElem].filter(isTabStop);
    return [
      ...toolbar,
      ...collectTabStops(activeContainer(document.getElementById(PATH_HIGHLIGHT_BAR_ID))),
      ...collectTabStops(activeContainer(document.getElementById(FILE_HISTORY_BAR_ID))),
      ...collectTabStops(document.getElementById(BRANCH_CLEANUP_PANEL_ID)),
      ...collectTabStops(document.getElementById(TABLE_HEADERS_ID)),
      ...listEntry,
      ...collectTabStops(document.getElementById(COMMIT_DETAILS_ID)),
      ...[document.getElementById(LOAD_MORE_BUTTON_ID)].filter(
        (element): element is HTMLElement => element !== null && isTabStop(element)
      ),
      ...collectTabStops(document.querySelector(FIND_WIDGET_ACTIVE_SELECTOR))
    ];
  }

  // Only the boundary between the target row's labels and a details view inserted at another
  // row needs explicit moves; everything else follows the native Tab order (plan §3.6).
  private handleListTab(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target;
    if (!(target instanceof HTMLElement) || !this.tableElem.contains(target)) return;
    const row = this.getRowTargetElem();
    const details = document.getElementById(COMMIT_DETAILS_ID);
    if (row === null || details === null) return;
    const rowStops = [row, ...this.getRowLabelStops(row)];
    const detailStops = collectTabStops(details);
    if (detailStops.length === 0) return;
    const anchor = target.closest<HTMLElement>(ROW_LABEL_SELECTOR) ?? target;
    const atBoundary = e.shiftKey
      ? anchor === detailStops[0]
      : anchor === rowStops[rowStops.length - 1];
    if (!atBoundary) return;
    if (moveFocusPast(captureFocusOrigin(anchor), e.shiftKey ? -1 : 1)) consumeKey(e);
  }

  public dispose(): void {
    document.removeEventListener("keydown", this.keydownListener);
    this.disposeFocusContext();
  }

  /* Stash Navigation */
  private getStashCommitIndices(): number[] {
    const indices: number[] = [];
    for (let i = 0; i < this.commits.length; i++) {
      if (this.commits[i].stash !== null) {
        indices.push(i);
      }
    }
    return indices;
  }

  private scrollToStash(forward: boolean) {
    const stashIndices = this.getStashCommitIndices();
    if (stashIndices.length === 0) return;

    if (forward) {
      this.stashNavigationIndex =
        this.stashNavigationIndex < stashIndices.length - 1 ? this.stashNavigationIndex + 1 : 0;
    } else {
      this.stashNavigationIndex =
        this.stashNavigationIndex > 0 ? this.stashNavigationIndex - 1 : stashIndices.length - 1;
    }

    const commitIndex = stashIndices[this.stashNavigationIndex];
    this.scrollToCommit(this.commits[commitIndex].hash, true, true);
    this.resetStashNavigationTimer();
  }

  private resetStashNavigationTimer() {
    if (this.stashNavigationTimer !== null) {
      clearTimeout(this.stashNavigationTimer);
    }
    this.stashNavigationTimer = setTimeout(() => {
      this.stashNavigationIndex = -1;
      this.stashNavigationTimer = null;
    }, STASH_NAVIGATION_TIMEOUT_MS);
  }

  /* Escape Chain */
  // One layer per Escape keydown; dropdowns cancel (close() would apply the selection).
  public handleEscape() {
    if (isContextMenuActive()) {
      hideContextMenu("keyboard");
      return;
    }
    if (isDialogActive()) {
      hideDialog("keyboard");
      return;
    }
    if (this.repoDropdown.isOpen()) {
      this.repoDropdown.cancelAndClose("keyboard");
      return;
    }
    if (this.branchDropdown.isOpen()) {
      this.branchDropdown.cancelAndClose("keyboard");
      return;
    }
    if (this.authorDropdown.isOpen()) {
      this.authorDropdown.cancelAndClose("keyboard");
      return;
    }
    if (this.refOverflow.closePopup("keyboard")) return;
    if (this.findWidget.isVisible()) {
      this.findWidget.close("keyboard");
      return;
    }
    if (this.expandedCommit !== null) {
      this.hideCommitDetails();
      return;
    }
    if (this.fileHistory.isActive() || this.fileHistory.isPending()) {
      this.fileHistory.exit(true);
      return;
    }
  }

  /* Commit Details */
  private handleCommitRowActivation(
    clickedHash: string,
    sourceElem: HTMLElement,
    isModifierClick: boolean
  ) {
    if (isModifierClick && this.expandedCommit !== null) {
      // Compare mode: Ctrl/Cmd+click while a commit is expanded
      if (this.expandedCommit.compareWithHash === clickedHash) {
        // Same compare target clicked again → cancel comparison
        this.clearCompareTarget();
        this.expandedCommit.compareWithHash = null;
        this.expandedCommit.compareWithSrcElem = null;
        this.saveState();
        if (this.expandedCommit.commitDetails !== null && this.expandedCommit.fileTree !== null) {
          this.showCommitDetails(this.expandedCommit.commitDetails, this.expandedCommit.fileTree);
        }
      } else if (clickedHash !== this.expandedCommit.hash) {
        // Different commit → enter/change compare target
        this.clearCompareTarget();
        this.expandedCommit.compareWithHash = clickedHash;
        this.expandedCommit.compareWithSrcElem = sourceElem;
        sourceElem.classList.add("compareTarget");
        this.saveState();
        const order = this.getCommitOrder(this.expandedCommit.hash, clickedHash);
        sendMessage({
          command: "compareCommits",
          repo: this.currentRepo,
          fromHash: order.from,
          toHash: order.to
        });
      }
    } else if (this.expandedCommit !== null && this.expandedCommit.hash === clickedHash) {
      this.hideCommitDetails();
    } else {
      this.loadCommitDetails(sourceElem);
    }
  }

  private loadCommitDetails(sourceElem: HTMLElement) {
    const previousDetails = document.getElementById(COMMIT_DETAILS_ID);
    const focusWasInDetails =
      previousDetails !== null && previousDetails.contains(document.activeElement);
    this.hideCommitDetails();
    const hash = sourceElem.dataset.hash!;
    const commit = this.commits[this.commitLookup[hash]];
    this.expandedCommit = {
      id: parseInt(sourceElem.dataset.id!, 10),
      hash: hash,
      srcElem: sourceElem,
      compareWithHash: null,
      compareWithSrcElem: null,
      commitDetails: null,
      fileTree: null,
      loading: true
    };
    sourceElem.classList.add("commitDetailsOpen");
    this.saveState();
    this.renderCommitDetailsView();
    // A switch started from inside the old details (parent link) lands on the new origin row.
    if (focusWasInDetails) sourceElem.focus({ preventScroll: true });
    sendMessage({
      command: "commitDetails",
      repo: this.currentRepo!,
      commitHash: hash,
      hasParents: commit !== undefined && commit.parentHashes.length > 0,
      isStash: commit !== undefined && commit.stash !== null
    });
  }
  private renderCommitDetailsView() {
    if (this.expandedCommit === null || this.expandedCommit.srcElem === null) return;

    let elem = document.getElementById(COMMIT_DETAILS_ID);
    const focusUpdate = elem === null ? null : beginFocusUpdate(elem);
    if (elem === null) {
      elem = document.createElement("tr");
      elem.id = COMMIT_DETAILS_ID;
      insertAfter(elem, this.expandedCommit.srcElem);
    }
    // Focus lost inside the details resolves to the origin row (plan §3.4 restore order).
    markFocusTarget(elem, this.rowKey(this.expandedCommit.hash));

    const cdvHeight = this.calculateCdvHeight();
    elem.style.height = `${cdvHeight}px`;

    if (this.expandedCommit.loading) {
      const loadingLabel =
        this.expandedCommit.hash === UNCOMMITTED_CHANGES_HASH
          ? t("commitDetails.uncommittedChanges")
          : t("commitDetails.label");
      elem.innerHTML =
        `<td></td><td colspan="${COMMIT_DETAILS_COLSPAN}">` +
        `<div id="cdvLoading">${svgIcons.loading} ${t("loading.commitDetails", loadingLabel)}</div>` +
        buildDetailsCloseHtml() +
        "</td>";
      this.bindDetailsClose();
    }

    this.renderGraph();
    this.scrollToExpandedCommit(elem);
    finishFocusUpdate(focusUpdate);
  }
  private getCommitOrder(hash1: string, hash2: string): { from: string; to: string } {
    // Backend expects UNCOMMITTED_CHANGES_HASH in fromHash to trigger working tree diff
    if (hash1 === UNCOMMITTED_CHANGES_HASH) return { from: hash1, to: hash2 };
    if (hash2 === UNCOMMITTED_CHANGES_HASH) return { from: hash2, to: hash1 };

    const idx1 = this.commitLookup[hash1] ?? -1;
    const idx2 = this.commitLookup[hash2] ?? -1;
    // Higher index = older commit in the table; diff should go from older → newer
    if (idx1 > idx2) {
      return { from: hash1, to: hash2 };
    } else {
      return { from: hash2, to: hash1 };
    }
  }
  private clearCompareTarget() {
    if (this.expandedCommit !== null && this.expandedCommit.compareWithSrcElem !== null) {
      this.expandedCommit.compareWithSrcElem.classList.remove("compareTarget");
    }
  }
  public hideCommitDetails() {
    if (this.expandedCommit !== null) {
      this.clearCompareTarget();
      let elem = document.getElementById(COMMIT_DETAILS_ID);
      const focusUpdate = elem === null ? null : beginFocusUpdate(elem);
      if (typeof elem === "object" && elem !== null) elem.remove();
      if (typeof this.expandedCommit.srcElem === "object" && this.expandedCommit.srcElem !== null)
        this.expandedCommit.srcElem.classList.remove("commitDetailsOpen");
      this.expandedCommit = null;
      this.saveState();
      this.renderGraph();
      finishFocusUpdate(focusUpdate);
    }
  }
  public showCommitDetails(commitDetails: GG.GitCommitDetails, fileTree: GitFolder) {
    if (
      this.expandedCommit === null ||
      this.expandedCommit.srcElem === null ||
      this.expandedCommit.hash !== commitDetails.hash
    )
      return;

    const isCompareMode = this.expandedCommit.compareWithHash !== null;
    this.expandedCommit.commitDetails = commitDetails;
    this.expandedCommit.fileTree = fileTree;
    this.expandedCommit.loading = false;
    this.expandedCommit.srcElem.classList.add("commitDetailsOpen");
    this.saveState();

    const summaryHtml = isCompareMode
      ? this.buildCompareSummaryHtml(this.expandedCommit.compareWithHash!)
      : commitDetails.hash === UNCOMMITTED_CHANGES_HASH
        ? this.buildUncommittedSummaryHtml(commitDetails)
        : this.buildCommitSummaryHtml(commitDetails);

    const fileViewType = this.getRepoFileViewType();
    const filesSectionHtml = this.buildFilesSectionHtml(
      fileViewType,
      commitDetails.fileChanges,
      fileTree
    );

    const html =
      `<td></td><td colspan="${COMMIT_DETAILS_COLSPAN}">` +
      `<div id="commitDetailsSummary">${summaryHtml}</div>` +
      filesSectionHtml +
      buildDetailsCloseHtml() +
      "</td>";

    let elem = document.getElementById(COMMIT_DETAILS_ID);
    const focusUpdate = elem === null ? null : beginFocusUpdate(elem);
    if (elem !== null) {
      elem.innerHTML = html;
    } else {
      elem = document.createElement("tr");
      elem.id = COMMIT_DETAILS_ID;
      elem.innerHTML = html;
      insertAfter(elem, this.expandedCommit.srcElem);
    }
    markFocusTarget(elem, this.rowKey(this.expandedCommit.hash));

    const cdvHeight = this.calculateCdvHeight();
    elem.style.height = `${cdvHeight}px`;

    this.renderGraph();
    this.scrollToExpandedCommit(elem);

    this.bindDetailsClose();
    const toggleElem = document.getElementById(FILE_VIEW_TOGGLE_ID);
    if (toggleElem !== null) {
      markFocusTarget(toggleElem, { kind: "control", id: FILE_VIEW_TOGGLE_ID });
      toggleElem.addEventListener("click", () => this.handleFileViewToggle());
    }
    this.bindFileViewListeners();
    this.applyFileHistoryToFileRows();
    this.bindParentHashListeners();
    finishFocusUpdate(focusUpdate);
  }
  private bindDetailsClose(): void {
    const closeElem = document.getElementById(COMMIT_DETAILS_CLOSE_ID);
    if (closeElem === null) return;
    markFocusTarget(closeElem, { kind: "control", id: COMMIT_DETAILS_CLOSE_ID });
    closeElem.addEventListener("click", () => this.hideCommitDetails());
  }
  private findCommitRowByHash(hash: string): HTMLElement | null {
    return document.querySelector<HTMLElement>(`.commit[data-hash="${hash}"]`);
  }
  private restoreExpandedCommit(snapshot: FileHistoryExpandedSnapshot): boolean {
    const srcElem = this.findCommitRowByHash(snapshot.hash);
    if (srcElem === null) return false;
    const compareWithSrcElem =
      snapshot.compareWithHash !== null ? this.findCommitRowByHash(snapshot.compareWithHash) : null;
    this.expandedCommit = {
      id: parseInt(srcElem.dataset.id!, 10),
      hash: snapshot.hash,
      srcElem,
      compareWithHash: snapshot.compareWithHash,
      compareWithSrcElem,
      commitDetails: snapshot.commitDetails,
      fileTree: snapshot.fileTree,
      loading: false
    };
    if (compareWithSrcElem !== null) compareWithSrcElem.classList.add("compareTarget");
    this.showCommitDetails(snapshot.commitDetails, snapshot.fileTree);
    return true;
  }
  private applyFileHistoryToFileRows() {
    if (
      !this.fileHistory.isActive() ||
      this.expandedCommit === null ||
      this.expandedCommit.compareWithHash !== null
    )
      return;
    const historicalPath = this.fileHistory.getHistoricalPathFor(this.expandedCommit.hash);
    if (historicalPath === null) return;
    const detailsElem = document.getElementById("commitDetails");
    if (detailsElem === null) return;
    const fileRows = Array.from(detailsElem.querySelectorAll<HTMLElement>(".gitFile"));
    const matchedRow = fileRows.find(
      (row) =>
        row.dataset.newfilepath !== undefined &&
        decodeURIComponent(row.dataset.newfilepath) === historicalPath
    );
    if (matchedRow !== undefined) {
      matchedRow.classList.add(CLASS_FILE_HISTORY_CURRENT);
      return;
    }
    const filesElem = document.getElementById("commitDetailsFiles");
    if (filesElem === null) return;
    const noteElem = document.createElement("div");
    noteElem.className = CLASS_FILE_HISTORY_NOTE;
    noteElem.textContent = t("fileHistory.notInFirstParentDiff");
    filesElem.insertBefore(noteElem, filesElem.firstChild);
  }
  private buildCompareSummaryHtml(compareWithHash: string): string {
    const order = this.getCommitOrder(this.expandedCommit!.hash, compareWithHash);
    const fromLabel = escapeHtml(order.from);
    const toLabel = escapeHtml(order.to);
    return (
      `<span class="commitDetailsSummaryTop"><span class="commitDetailsSummaryTopRow"><span class="commitDetailsSummaryKeyValues">` +
      t("commitDetails.displayingChanges", fromLabel, toLabel) +
      "</span></span></span>"
    );
  }
  private buildUncommittedSummaryHtml(commitDetails: GG.GitCommitDetails): string {
    const fileCount = commitDetails.fileChanges.length;
    const fileLabel = t(fileCount === 1 ? "commitDetails.file.one" : "commitDetails.file.other");
    return (
      `<span class="commitDetailsSummaryTop"><span class="commitDetailsSummaryTopRow"><span class="commitDetailsSummaryKeyValues">` +
      `<b>${t("commitDetails.uncommittedChanges")}</b> (${fileCount} ${fileLabel})` +
      "</span></span></span>"
    );
  }
  private buildCommitSummaryHtml(commitDetails: GG.GitCommitDetails): string {
    const parentLinks = this.buildParentLinksHtml(commitDetails.parents);
    const committerHtml = this.buildCommitterHtml(
      commitDetails.committer,
      commitDetails.committerEmail
    );
    const hasAvatar = typeof this.avatars[commitDetails.email] === "string";
    const avatarClass = hasAvatar ? " withAvatar" : "";
    const avatarHtml = hasAvatar
      ? `<span class="commitDetailsSummaryAvatar"><img src="${escapeHtml(this.avatars[commitDetails.email])}"></span>`
      : "";

    return (
      `<span class="commitDetailsSummaryTop${avatarClass}"><span class="commitDetailsSummaryTopRow"><span class="commitDetailsSummaryKeyValues">` +
      `<b>${t("commitDetails.commit")} </b>${escapeHtml(commitDetails.hash)}<br>` +
      `<b>${t("commitDetails.parents")} </b>${parentLinks}<br>` +
      `<b>${t("commitDetails.author")} </b>${escapeHtml(commitDetails.author)} &lt;<a href="mailto:${encodeURIComponent(commitDetails.email)}">${escapeHtml(commitDetails.email)}</a>&gt;<br>` +
      `<b>${t("commitDetails.committer")} </b>${committerHtml}<br>` +
      `<b>${t("commitDetails.date")} </b>${new Date(commitDetails.date * SECONDS_TO_MS).toString()}</span>` +
      avatarHtml +
      "</span></span><br><br>" +
      escapeHtml(commitDetails.body).replace(/\n/g, "<br>")
    );
  }
  private buildParentLinksHtml(parents: string[]): string {
    if (parents.length === 0) return t("commitDetails.none");
    return parents
      .map((hash) => {
        const escapedHash = escapeHtml(hash);
        return typeof this.commitLookup[hash] === "number"
          ? `<button type="button" class="${PARENT_HASH_CLASS}" data-hash="${escapedHash}">${escapedHash}</button>`
          : escapedHash;
      })
      .join(", ");
  }
  private buildCommitterHtml(committer: string, committerEmail: string): string {
    if (!committerEmail) return escapeHtml(committer);
    return `${escapeHtml(committer)} &lt;<a href="mailto:${encodeURIComponent(committerEmail)}">${escapeHtml(committerEmail)}</a>&gt;`;
  }
  private getRepoFileViewType(): FileViewType {
    if (this.currentRepo === null) return DEFAULT_FILE_VIEW_TYPE;
    return this.gitRepos[this.currentRepo]?.fileViewType ?? DEFAULT_FILE_VIEW_TYPE;
  }
  private buildFilesSectionHtml(
    fileViewType: FileViewType,
    fileChanges: GG.GitFileChange[],
    fileTree: GitFolder
  ): string {
    const innerHtml = this.buildFilesSectionInnerHtml(fileViewType, fileChanges, fileTree);
    const { icon, title } = getFileViewToggle(fileViewType);
    return `<div id="${COMMIT_DETAILS_FILES_ID}">${innerHtml}</div><button type="button" id="${FILE_VIEW_TOGGLE_ID}" class="fileViewToggleBtn" title="${title}" ${ATTRIBUTE_ARIA_LABEL}="${title}">${icon}</button>`;
  }
  private scrollToExpandedCommit(detailsElem: HTMLElement) {
    if (this.expandedCommit === null || this.expandedCommit.srcElem === null) return;
    const scrollTop = this.scrollContainerElem.scrollTop;
    const viewHeight = this.scrollContainerElem.clientHeight;
    const headerHeight = (document.getElementById("tableColHeaders")?.clientHeight ?? 0) + 1;
    const srcElemTop = this.expandedCommit.srcElem.offsetTop;
    if (srcElemTop < scrollTop + headerHeight + CDV_SCROLL_PADDING) {
      this.scrollContainerElem.scrollTop = srcElemTop - headerHeight - CDV_SCROLL_PADDING;
    } else if (detailsElem.offsetTop + this.config.grid.expandY - viewHeight > scrollTop) {
      const desiredScroll = detailsElem.offsetTop + this.config.grid.expandY - viewHeight;
      const maxScroll = srcElemTop - headerHeight;
      this.scrollContainerElem.scrollTop = Math.min(desiredScroll, maxScroll);
    }
  }
  private bindParentHashListeners() {
    document
      .querySelectorAll<HTMLElement>(`#${COMMIT_DETAILS_ID} .${PARENT_HASH_CLASS}`)
      .forEach((link) => {
        const hash = link.dataset.hash;
        if (hash !== undefined) {
          markFocusTarget(link, { kind: "control", id: `${PARENT_HASH_KEY_PREFIX}${hash}` });
        }
      });
    addListenerToClass(PARENT_HASH_CLASS, "click", (e: Event) => {
      const target = <HTMLElement>e.currentTarget;
      const parentHash = target.dataset.hash;
      if (parentHash && typeof this.commitLookup[parentHash] === "number") {
        this.scrollToCommit(parentHash, true, true);
        const commitElem = document.querySelector<HTMLElement>(
          `.commit[data-hash="${parentHash}"]`
        );
        if (commitElem) {
          this.loadCommitDetails(commitElem);
        }
      }
    });
  }
  private handleFileViewToggle() {
    if (this.expandedCommit === null || this.currentRepo === null) return;
    const repo = this.gitRepos[this.currentRepo];
    if (repo === undefined) return;
    const currentMode = repo.fileViewType ?? DEFAULT_FILE_VIEW_TYPE;
    const newMode: FileViewType = currentMode === FILE_VIEW_TREE ? FILE_VIEW_LIST : FILE_VIEW_TREE;
    const updatedRepo: GG.GitRepoState = { ...repo, fileViewType: newMode };
    this.gitRepos[this.currentRepo] = updatedRepo;
    const filesDiv = document.getElementById(COMMIT_DETAILS_FILES_ID);
    if (filesDiv !== null && this.expandedCommit.commitDetails !== null) {
      const focusUpdate = beginFocusUpdate(filesDiv);
      filesDiv.innerHTML = this.buildFilesSectionInnerHtml(
        newMode,
        this.expandedCommit.commitDetails.fileChanges,
        this.expandedCommit.fileTree!
      );
      const toggleElem = document.getElementById(FILE_VIEW_TOGGLE_ID);
      if (toggleElem !== null) {
        const { icon, title } = getFileViewToggle(newMode);
        toggleElem.innerHTML = icon;
        toggleElem.title = title;
        toggleElem.setAttribute(ATTRIBUTE_ARIA_LABEL, title);
      }
      this.bindFileViewListeners();
      this.applyFileHistoryToFileRows();
      finishFocusUpdate(focusUpdate);
    }
    sendMessage({
      command: "saveRepoState",
      repo: this.currentRepo,
      state: updatedRepo
    });
    this.saveState();
  }
  private buildFileHistoryActionPredicate(): FileHistoryActionPredicate {
    const expandedCommit = this.expandedCommit;
    if (expandedCommit === null) return () => false;
    const isStash = this.buildFileHistoryMenuContext().isStash;
    return (gitFile) => canHighlightFileHistory(expandedCommit, isStash, gitFile.type);
  }
  private buildFilesSectionInnerHtml(
    fileViewType: FileViewType,
    fileChanges: GG.GitFileChange[],
    fileTree: GitFolder
  ): string {
    const canHighlight = this.buildFileHistoryActionPredicate();
    return fileViewType === FILE_VIEW_LIST
      ? generateGitFileListHtml(fileChanges, canHighlight)
      : generateGitFileTreeHtml(fileTree, fileChanges, canHighlight);
  }
  // Every control is a native button: Enter / Space run the same click handler as the mouse,
  // and the child buttons stop propagation so neither the row wrapper nor the commit row acts.
  private bindFileViewListeners() {
    this.markFileViewTargets();
    addListenerToClass(FOLDER_BUTTON_CLASS, "click", (e) => {
      e.stopPropagation();
      this.toggleFolder(<HTMLElement>e.currentTarget);
    });
    addListenerToClass(FILE_DIFF_BUTTON_CLASS, "click", (e) => {
      e.stopPropagation();
      this.sendViewDiffAction(resolveFileRow(<Element>e.currentTarget));
    });
    addListenerToClass(FILE_OPEN_BUTTON_CLASS, "click", (e) => {
      e.stopPropagation();
      sendOpenFileAction(resolveFileRow(<Element>e.target), this.expandedCommit, this.currentRepo);
    });
    addListenerToClass(FILE_HISTORY_BUTTON_CLASS, "click", (e) => {
      e.stopPropagation();
      sendHighlightFileHistoryAction(
        resolveFileRow(<Element>e.target),
        this.expandedCommit,
        this.currentRepo,
        this.buildFileHistoryMenuContext()
      );
    });
    addListenerToClass("gitFile", "contextmenu", (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      this.showFileRowContextMenu(<MouseEvent>e);
    });
    addListenerToClass("gitFile", "keydown", (e: Event) => {
      if (consumeContextMenuLaunch(e)) {
        this.showFileRowContextMenu(e);
        return;
      }
      this.handleFileRowActivationKey(e);
    });
  }
  // File and folder keys carry the details' displayed hashes (origin and compare target), which
  // differ from the time-ordered from / to hashes of the requests (plan §3.4).
  private markFileViewTargets(): void {
    const filesElem = document.getElementById(COMMIT_DETAILS_FILES_ID);
    if (filesElem === null || this.expandedCommit === null) return;
    const base = {
      repo: this.currentRepo,
      hash: this.expandedCommit.hash,
      compareWithHash: this.expandedCommit.compareWithHash
    } as const;
    filesElem.querySelectorAll<HTMLElement>(`.${FOLDER_BUTTON_CLASS}`).forEach((button) => {
      const path = button.dataset.folderpath;
      if (path !== undefined) {
        markFocusTarget(button, { kind: "folder", ...base, path: decodeURIComponent(path) });
      }
    });
    filesElem.querySelectorAll<HTMLElement>(FILE_ROW_SELECTOR).forEach((fileRow) => {
      const oldPath = fileRow.dataset.oldfilepath;
      const newPath = fileRow.dataset.newfilepath;
      if (oldPath === undefined || newPath === undefined) return;
      const fileBase = {
        kind: "file",
        ...base,
        oldPath: decodeURIComponent(oldPath),
        newPath: decodeURIComponent(newPath)
      } as const;
      // A row that is itself the tab stop (no enabled child button) stands for its diff target.
      if (fileRow.hasAttribute("tabindex"))
        markFocusTarget(fileRow, { ...fileBase, action: "diff" });
      FILE_ACTION_BUTTONS.forEach(([className, action]) => {
        fileRow.querySelectorAll<HTMLElement>(`.${className}`).forEach((button) => {
          markFocusTarget(button, { ...fileBase, action });
        });
      });
    });
  }
  private toggleFolder(button: HTMLElement): void {
    const item = button.parentElement;
    const contents = item?.querySelector<HTMLElement>(FOLDER_CONTENTS_SELECTOR) ?? null;
    const folderPath = button.dataset.folderpath;
    if (
      item === null ||
      contents === null ||
      folderPath === undefined ||
      this.expandedCommit === null ||
      this.expandedCommit.fileTree === null
    ) {
      return;
    }
    const isOpen = !item.classList.toggle(FOLDER_CLOSED_CLASS);
    const iconElem = button.querySelector<HTMLElement>(FOLDER_ICON_SELECTOR);
    if (iconElem !== null)
      iconElem.innerHTML = isOpen ? svgIcons.openFolder : svgIcons.closedFolder;
    button.setAttribute(ATTRIBUTE_ARIA_EXPANDED, String(isOpen));
    contents.classList.toggle(FOLDER_CONTENTS_HIDDEN_CLASS, !isOpen);
    contents.hidden = !isOpen;
    alterGitFileTree(this.expandedCommit.fileTree, decodeURIComponent(folderPath), isOpen);
    this.saveState();
  }
  private sendViewDiffAction(fileRow: HTMLElement | null): void {
    if (
      fileRow === null ||
      this.expandedCommit === null ||
      !fileRow.classList.contains("gitDiffPossible")
    ) {
      return;
    }
    // When in comparison mode, normalize order so diff always shows old → new
    let diffCommitHash = this.expandedCommit.hash;
    let diffCompareWithHash = this.expandedCommit.compareWithHash;
    if (diffCompareWithHash !== null) {
      const order = this.getCommitOrder(diffCommitHash, diffCompareWithHash);
      diffCommitHash = order.from;
      diffCompareWithHash = order.to;
    }
    sendMessage({
      command: "viewDiff",
      repo: this.currentRepo,
      commitHash: diffCommitHash,
      oldFilePath: decodeURIComponent(fileRow.dataset.oldfilepath!),
      newFilePath: decodeURIComponent(fileRow.dataset.newfilepath!),
      type: <GG.GitFileChangeType>fileRow.dataset.type,
      ...(diffCompareWithHash !== null ? { compareWithHash: diffCompareWithHash } : {})
    });
  }
  // A row that is its own tab stop (no enabled child button) opens its menu on Enter / Space;
  // keys bubbling up from a child button are that button's own.
  private handleFileRowActivationKey(e: Event): void {
    if (!(e instanceof KeyboardEvent) || e.defaultPrevented || e.target !== e.currentTarget) return;
    if (e.key !== KEY_ENTER && e.key !== KEY_SPACE) return;
    if (!(e.currentTarget instanceof HTMLElement) || !e.currentTarget.hasAttribute("tabindex")) {
      return;
    }
    e.preventDefault();
    if (isKeyboardActionBlocked(e)) return;
    e.stopPropagation();
    this.showFileRowContextMenu(e);
  }
  public showCompareResult(fileChanges: GG.GitFileChange[], fromHash: string, toHash: string) {
    if (this.expandedCommit === null || this.expandedCommit.compareWithHash === null) return;
    // fromHash/toHash may be reordered by getCommitOrder, so validate as a set
    const hashes = new Set([fromHash, toHash]);
    if (!hashes.has(this.expandedCommit.hash) || !hashes.has(this.expandedCommit.compareWithHash))
      return;
    const syntheticDetails: GG.GitCommitDetails = {
      hash: this.expandedCommit.hash,
      parents: [],
      author: "",
      email: "",
      date: 0,
      committer: "",
      committerEmail: "",
      body: "",
      fileChanges
    };
    try {
      const fileTree = generateGitFileTree(fileChanges);
      this.showCommitDetails(syntheticDetails, fileTree);
    } catch (error: unknown) {
      this.hideCommitDetails();
      showErrorDialog(
        t("error.compareCommits"),
        error instanceof Error ? error.message : null,
        null
      );
    }
  }
}

/* Initialization */
// Guards are installed before any other listener so composition and repeat state is tracked first.
const disposeKeyboardGuards = installKeyboardGuards(document);
let gitKeizu = new GitKeizuView(
  viewState.repos,
  viewState.lastActiveRepo,
  {
    fetchAvatars: viewState.fetchAvatars,
    graphColours: viewState.graphColours,
    graphStyle: viewState.graphStyle,
    grid: { x: 16, y: 24, offsetX: 8, offsetY: 12, expandY: CDV_DEFAULT_HEIGHT },
    initialLoadCommits: viewState.initialLoadCommits,
    keybindings: viewState.keybindings,
    loadMoreCommits: viewState.loadMoreCommits,
    loadMoreCommitsAutomatically: viewState.loadMoreCommitsAutomatically,
    mute: viewState.mute,
    showCurrentBranchByDefault: viewState.showCurrentBranchByDefault
  },
  vscode.getState()
);

/* Command Processing */
const LISTENER_CLEANUP_KEY = "__gitKeizuMessageCleanup";
const _win = window as unknown as Record<string, unknown>;
const prevCleanup = _win[LISTENER_CLEANUP_KEY];
if (typeof prevCleanup === "function") (prevCleanup as () => void)();
const messageHandler = (event: MessageEvent) => handleMessage(event.data, gitKeizu);
window.addEventListener("message", messageHandler);
// Escape closes one layer per keydown in the bubble phase; a key a local UI already consumed, a
// repeat or a composition-bound press never reaches the chain (R4.6).
const escapeHandler = (e: KeyboardEvent) => {
  if (e.key !== KEY_ESCAPE || e.defaultPrevented || isKeyboardActionBlocked(e)) return;
  gitKeizu.handleEscape();
};
document.addEventListener("keydown", escapeHandler);
_win[LISTENER_CLEANUP_KEY] = () => {
  window.removeEventListener("message", messageHandler);
  document.removeEventListener("keydown", escapeHandler);
  gitKeizu.dispose();
  disposeKeyboardGuards();
};

/* Global Listeners */
document.addEventListener("click", hideContextMenuListener);
document.addEventListener("contextmenu", hideContextMenuListener);
document.addEventListener("mouseleave", hideContextMenuListener);
