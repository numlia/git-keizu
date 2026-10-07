import * as GG from "../src/types";
import { showErrorDialog } from "./dialogs";
import {
  CLASS_FILE_HISTORY_CURRENT,
  CLASS_FILE_HISTORY_DIM,
  CLASS_FILE_HISTORY_MATCH,
  CLASS_FILE_HISTORY_NOTE
} from "./fileHistoryClasses";
import { t } from "./i18n";
import {
  captureFocusOrigin,
  type FocusCloseReason,
  type FocusOrigin,
  markFocusTarget,
  restoreFocus
} from "./keyboardNavigation";
import { insertAfter, sendMessage, svgIcons } from "./utils";

export {
  CLASS_FILE_HISTORY_CURRENT,
  CLASS_FILE_HISTORY_DIM,
  CLASS_FILE_HISTORY_MATCH,
  CLASS_FILE_HISTORY_MODE,
  CLASS_FILE_HISTORY_NOTE
} from "./fileHistoryClasses";

/* === Constants === */

export const FILE_HISTORY_BAR_ID = "fileHistoryBar";

const PATH_ELEMENT_ID = "fileHistoryPath";
const POSITION_ELEMENT_ID = "fileHistoryPosition";
const PREV_BUTTON_ID = "fileHistoryPrev";
const NEXT_BUTTON_ID = "fileHistoryNext";
const EXIT_BUTTON_ID = "fileHistoryExit";
const CONTROLS_ELEMENT_ID = "controls";
const CLASS_ACTIVE = "active";
const CLASS_LOADING = "loading";
const CLASS_ROUNDED_BTN = "roundedBtn";
const ATTR_ARIA_LABEL = "aria-label";
const ATTR_ARIA_HIDDEN = "aria-hidden";
const ATTR_ROLE = "role";
const ATTR_ARIA_LIVE = "aria-live";
const ROLE_STATUS = "status";
const LIVE_POLITE = "polite";
const ATTR_TRUE = "true";
/** Joins an action label and the file path into the button's accessible name. */
const ACTION_NAME_SEPARATOR = ": ";
const REASON_KEYBOARD: FocusCloseReason = "keyboard";
const COMMIT_ROW_SELECTOR = ".commit[data-hash]";
const FILE_ROW_CURRENT_SELECTOR = `.gitFile.${CLASS_FILE_HISTORY_CURRENT}`;
const NOTE_SELECTOR = `.${CLASS_FILE_HISTORY_NOTE}`;
const FIRST_REQUEST_ID = 1;
const HIGHLIGHT_CLASSES = [
  CLASS_FILE_HISTORY_MATCH,
  CLASS_FILE_HISTORY_CURRENT,
  CLASS_FILE_HISTORY_DIM
];

/* === Types === */

export interface FileHistoryCallbacks {
  getCommits(): GG.GitCommitNode[];
  getCommitId(hash: string): number | null;
  getCurrentRepo(): string;
  getExpandedCommit(): ExpandedCommit | null;
  getScrollTop(): number;
  setScrollTop(scrollTop: number): void;
  hideCommitDetails(): void;
  restoreExpandedCommit(snapshot: FileHistoryExpandedSnapshot): boolean;
  scrollToCommit(hash: string, alwaysCenterCommit: boolean): void;
  closeFindWidget(): void;
  setGraphHighlight(highlight: GraphFileHistoryHighlight | null): void;
}

interface PendingRequest {
  requestId: number;
  repo: string;
  anchorHash: string;
  filePath: string;
}

interface FileHistoryState {
  repo: string;
  anchorHash: string;
  filePath: string;
  entryByHash: ReadonlyMap<string, GG.FileHistoryEntry>;
  snapshot: FileHistoryRestoreSnapshot;
  visibleHashes: readonly string[];
  currentHash: string;
}

/* === DOM Helpers === */

/** Interim accessible name until the shared `a11y.actionFor` text exists. */
function actionName(action: string, filePath: string | null): string {
  return filePath === null ? action : `${action}${ACTION_NAME_SEPARATOR}${filePath}`;
}

function createButton(id: string, title: string | null, content: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.id = id;
  button.className = CLASS_ROUNDED_BTN;
  if (title !== null) button.title = title;
  button.innerHTML = content;
  // An icon child is decorative: the button is named through its aria-label.
  for (const icon of Array.from(button.children)) icon.setAttribute(ATTR_ARIA_HIDDEN, ATTR_TRUE);
  markFocusTarget(button, { kind: "control", id });
  return button;
}

function createSpan(id: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.id = id;
  return span;
}

function getCommitRows(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(COMMIT_ROW_SELECTOR));
}

function clearHighlightClasses(): void {
  for (const row of getCommitRows()) {
    row.classList.remove(...HIGHLIGHT_CLASSES);
  }
  for (const fileRow of Array.from(document.querySelectorAll(FILE_ROW_CURRENT_SELECTOR))) {
    fileRow.classList.remove(CLASS_FILE_HISTORY_CURRENT);
  }
  for (const note of Array.from(document.querySelectorAll(NOTE_SELECTOR))) {
    note.remove();
  }
}

function buildEntryMap(entries: readonly GG.FileHistoryEntry[]): Map<string, GG.FileHistoryEntry> {
  return new Map(entries.map((entry) => [entry.hash, entry]));
}

function findAdjacentMatch(
  loadedHashes: readonly string[],
  matchHashes: readonly string[],
  originHash: string,
  delta: -1 | 1
): string | null {
  const originIndex = loadedHashes.indexOf(originHash);
  if (originIndex === -1) return null;
  for (let index = originIndex + delta; index >= 0 && index < loadedHashes.length; index += delta) {
    const hash = loadedHashes[index];
    if (hash !== undefined && matchHashes.includes(hash)) return hash;
  }
  return null;
}

/* === Controller === */

export class FileHistoryController {
  private readonly callbacks: FileHistoryCallbacks;
  private readonly barElem: HTMLDivElement;
  private readonly pathElem: HTMLSpanElement;
  private readonly positionElem: HTMLSpanElement;
  private readonly prevBtn: HTMLButtonElement;
  private readonly nextBtn: HTMLButtonElement;
  private readonly exitBtn: HTMLButtonElement;
  private nextRequestId: number = FIRST_REQUEST_ID;
  private latestRequestId: number | null = null;
  private pending: PendingRequest | null = null;
  private state: FileHistoryState | null = null;
  private origin: FocusOrigin | null = null;

  constructor(callbacks: FileHistoryCallbacks) {
    this.callbacks = callbacks;
    this.barElem = document.createElement("div");
    this.barElem.id = FILE_HISTORY_BAR_ID;
    this.pathElem = createSpan(PATH_ELEMENT_ID);
    this.positionElem = createSpan(POSITION_ELEMENT_ID);
    // Only the position text is live: loading and the current position are announced politely
    // without re-reading the whole bar.
    this.positionElem.setAttribute(ATTR_ROLE, ROLE_STATUS);
    this.positionElem.setAttribute(ATTR_ARIA_LIVE, LIVE_POLITE);
    this.prevBtn = createButton(PREV_BUTTON_ID, t("fileHistory.previous"), svgIcons.arrowUp);
    this.nextBtn = createButton(NEXT_BUTTON_ID, t("fileHistory.next"), svgIcons.arrowDown);
    this.exitBtn = createButton(EXIT_BUTTON_ID, null, t("fileHistory.exit"));
    this.prevBtn.addEventListener("click", () => this.prev());
    this.nextBtn.addEventListener("click", () => this.next());
    this.exitBtn.addEventListener("click", () => this.exit(true));
    this.barElem.append(this.pathElem, this.positionElem, this.prevBtn, this.nextBtn, this.exitBtn);
    this.renderBar();
    insertAfter(this.barElem, document.getElementById(CONTROLS_ELEMENT_ID)!);
  }

  /* === Public API === */

  public request(anchorHash: string, filePath: string): void {
    if (this.nextRequestId >= Number.MAX_SAFE_INTEGER) return;
    const requestId = this.nextRequestId;
    this.nextRequestId = requestId + 1;
    this.latestRequestId = requestId;
    const repo = this.callbacks.getCurrentRepo();
    this.pending = { requestId, repo, anchorHash, filePath };
    this.rememberOrigin();
    this.callbacks.closeFindWidget();
    this.renderBar();
    sendMessage({ command: "fileHistory", repo, requestId, anchorHash, filePath });
  }

  public handleResponse(msg: GG.ResponseFileHistory): void {
    if (
      this.pending === null ||
      msg.requestId !== this.latestRequestId ||
      msg.repo !== this.callbacks.getCurrentRepo()
    ) {
      return;
    }
    this.pending = null;
    if (msg.entries === null) {
      this.renderBar();
      showErrorDialog(t("error.fileHistory"), null, null);
      return;
    }
    const entryByHash = buildEntryMap(msg.entries);
    if (msg.entries.length === 0 || !entryByHash.has(msg.anchorHash)) {
      this.renderBar();
      showErrorDialog(t("error.fileHistory"), t("fileHistory.noResults"), null);
      return;
    }
    if (this.callbacks.getCommitId(msg.anchorHash) === null) {
      this.renderBar();
      return;
    }
    this.accept(msg, entryByHash);
  }

  public onCommitsRendered(): void {
    if (this.pending !== null && !this.isAnchorLoaded(this.pending)) {
      this.pending = null;
      this.renderBar();
    }
    if (this.state === null) return;
    if (!this.isAnchorLoaded(this.state)) {
      this.exit(false);
      return;
    }
    if (this.recomputeVisible()) this.applyClasses();
  }

  public onRepositoryChanged(): void {
    this.pending = null;
    if (this.state !== null) {
      this.exit(false);
    } else {
      this.renderBar();
    }
  }

  public handleCommitRowClick(hash: string): void {
    if (this.state === null || !this.state.visibleHashes.includes(hash)) return;
    this.state = { ...this.state, currentHash: hash };
    this.applyClasses();
  }

  public navigate(delta: -1 | 1, useExpandedCommit: boolean = false): string | null {
    if (this.pending !== null || this.state === null) return null;
    const state = this.state;
    // Read directly instead of recomputing: recomputing exits the mode when current is unloaded.
    const loadedHashes = this.callbacks.getCommits().map((commit) => commit.hash);
    if (
      !state.visibleHashes.includes(state.currentHash) ||
      !loadedHashes.includes(state.currentHash)
    ) {
      return null;
    }
    const originHash = this.resolveOrigin(state, loadedHashes, useExpandedCommit);
    if (originHash === null) return null;
    const hash = findAdjacentMatch(loadedHashes, state.visibleHashes, originHash, delta);
    // The row is confirmed before the state changes so a missing row leaves nothing half-updated.
    if (hash === null || !getCommitRows().some((row) => row.dataset.hash === hash)) return null;
    this.state = { ...state, currentHash: hash };
    this.applyClasses();
    this.callbacks.scrollToCommit(hash, true);
    return hash;
  }

  public exit(restore: boolean): void {
    const state = this.state;
    // Focus on the disappearing bar returns to where the history started once the snapshot
    // (whose details may hold that origin) is back; a programmatic exit leaves focus alone.
    const returnFocus = restore && this.barElem.contains(document.activeElement);
    this.pending = null;
    // Cleared before the restore callbacks run so a re-render they trigger sees inactive state.
    this.state = null;
    this.renderBar();
    clearHighlightClasses();
    this.callbacks.setGraphHighlight(null);
    this.restoreSnapshot(restore, state);
    if (returnFocus) restoreFocus(this.origin, REASON_KEYBOARD);
  }

  public isActive(): boolean {
    return this.state !== null;
  }

  public isPending(): boolean {
    return this.pending !== null;
  }

  public getCurrentHash(): string | null {
    return this.state === null ? null : this.state.currentHash;
  }

  public getHistoricalPathFor(hash: string): string | null {
    if (this.state === null) return null;
    const entry = this.state.entryByHash.get(hash);
    return entry === undefined ? null : entry.historicalPath;
  }

  /* === State transitions === */

  private restoreSnapshot(restore: boolean, state: FileHistoryState | null): void {
    if (!restore || state === null || state.repo !== this.callbacks.getCurrentRepo()) return;
    const expanded = state.snapshot.expanded;
    if (expanded !== null) {
      if (this.callbacks.getCommitId(expanded.hash) === null) return;
      this.callbacks.restoreExpandedCommit(expanded);
    }
    this.callbacks.setScrollTop(state.snapshot.scrollTop);
  }

  // The element focused when a history starts is where a keyboard exit from the bar returns to.
  private rememberOrigin(): void {
    const active = document.activeElement;
    if (active instanceof HTMLElement && !this.barElem.contains(active)) {
      this.origin = captureFocusOrigin(active);
    }
  }

  private isAnchorLoaded(target: { repo: string; anchorHash: string }): boolean {
    return (
      target.repo === this.callbacks.getCurrentRepo() &&
      this.callbacks.getCommitId(target.anchorHash) !== null
    );
  }

  private accept(
    msg: GG.ResponseFileHistory,
    entryByHash: ReadonlyMap<string, GG.FileHistoryEntry>
  ): void {
    const snapshot = this.captureSnapshot();
    this.callbacks.hideCommitDetails();
    this.state = {
      repo: msg.repo,
      anchorHash: msg.anchorHash,
      filePath: msg.filePath,
      entryByHash,
      snapshot,
      visibleHashes: [],
      currentHash: msg.anchorHash
    };
    if (!this.recomputeVisible()) return;
    this.applyClasses();
    this.callbacks.scrollToCommit(msg.anchorHash, true);
  }

  private captureSnapshot(): FileHistoryRestoreSnapshot {
    const expanded = this.callbacks.getExpandedCommit();
    const expandedSnapshot: FileHistoryExpandedSnapshot | null =
      expanded !== null && expanded.commitDetails !== null && expanded.fileTree !== null
        ? {
            hash: expanded.hash,
            compareWithHash: expanded.compareWithHash,
            commitDetails: expanded.commitDetails,
            fileTree: expanded.fileTree
          }
        : null;
    return { expanded: expandedSnapshot, scrollTop: this.callbacks.getScrollTop() };
  }

  private recomputeVisible(): boolean {
    if (this.state === null) return false;
    const entryByHash = this.state.entryByHash;
    const visibleHashes = this.callbacks
      .getCommits()
      .map((commit) => commit.hash)
      .filter((hash) => entryByHash.has(hash));
    if (!visibleHashes.includes(this.state.currentHash)) {
      this.exit(false);
      return false;
    }
    this.state = { ...this.state, visibleHashes };
    return true;
  }

  private resolveOrigin(
    state: FileHistoryState,
    loadedHashes: readonly string[],
    useExpandedCommit: boolean
  ): string | null {
    const expanded = useExpandedCommit ? this.callbacks.getExpandedCommit() : null;
    if (expanded === null) return state.currentHash;
    if (!loadedHashes.includes(expanded.hash)) return null;
    // Details of a match can stay open after the buttons move current, so only a dim row overrides.
    const isDimRowDetails =
      expanded.compareWithHash === null && !state.visibleHashes.includes(expanded.hash);
    return isDimRowDetails ? expanded.hash : state.currentHash;
  }

  private prev(): void {
    this.navigate(-1);
  }

  private next(): void {
    this.navigate(1);
  }

  /* === Rendering === */

  private applyClasses(): void {
    if (this.state === null) return;
    const { visibleHashes, currentHash } = this.state;
    const matchHashes: ReadonlySet<string> = new Set(visibleHashes);
    for (const row of getCommitRows()) {
      row.classList.remove(...HIGHLIGHT_CLASSES);
      const hash = row.dataset.hash;
      if (hash !== undefined && matchHashes.has(hash)) {
        row.classList.add(CLASS_FILE_HISTORY_MATCH);
        if (hash === currentHash) row.classList.add(CLASS_FILE_HISTORY_CURRENT);
      } else {
        row.classList.add(CLASS_FILE_HISTORY_DIM);
      }
    }
    this.callbacks.setGraphHighlight({ matchHashes, currentHash });
    this.renderBar();
  }

  private renderBar(): void {
    if (this.pending !== null) {
      this.pathElem.textContent = this.pending.filePath;
      this.positionElem.textContent = t("fileHistory.loading");
      this.barElem.classList.add(CLASS_ACTIVE, CLASS_LOADING);
      this.renderControls(this.pending.filePath, true);
    } else if (this.state !== null) {
      const index = this.state.visibleHashes.indexOf(this.state.currentHash);
      this.pathElem.textContent = this.state.filePath;
      this.positionElem.textContent = t(
        "fileHistory.position",
        index + 1,
        this.state.visibleHashes.length
      );
      this.barElem.classList.remove(CLASS_LOADING);
      this.barElem.classList.add(CLASS_ACTIVE);
      this.renderControls(this.state.filePath, false);
    } else {
      this.barElem.classList.remove(CLASS_ACTIVE, CLASS_LOADING);
      this.renderControls(null, false);
    }
  }

  // Names carry the path the bar is about. Prev / next are disabled while a request is pending;
  // a focused one hands focus to the exit button instead of dropping it on body (R4.3). The
  // hidden attribute keeps an inactive bar's controls out of the tab order.
  private renderControls(filePath: string | null, loading: boolean): void {
    this.prevBtn.setAttribute(ATTR_ARIA_LABEL, actionName(t("fileHistory.previous"), filePath));
    this.nextBtn.setAttribute(ATTR_ARIA_LABEL, actionName(t("fileHistory.next"), filePath));
    this.exitBtn.setAttribute(ATTR_ARIA_LABEL, actionName(t("fileHistory.exit"), filePath));
    const active = document.activeElement;
    this.prevBtn.disabled = loading;
    this.nextBtn.disabled = loading;
    if (loading && (active === this.prevBtn || active === this.nextBtn)) this.exitBtn.focus();
    this.barElem.hidden = filePath === null;
  }
}
