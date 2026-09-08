import * as GG from "../src/types";
import { showErrorDialog } from "./dialogs";
import { t } from "./i18n";
import { insertAfter, sendMessage, svgIcons } from "./utils";

/* === Constants === */

export const CLASS_FILE_HISTORY_MATCH = "fileHistoryMatch";
export const CLASS_FILE_HISTORY_CURRENT = "fileHistoryCurrent";
export const CLASS_FILE_HISTORY_DIM = "fileHistoryDim";
export const CLASS_FILE_HISTORY_MODE = "fileHistoryMode";
export const CLASS_FILE_HISTORY_NOTE = "fileHistoryNote";
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

function createButton(id: string, title: string | null, content: string): HTMLSpanElement {
  const button = document.createElement("span");
  button.id = id;
  button.className = CLASS_ROUNDED_BTN;
  if (title !== null) button.title = title;
  button.innerHTML = content;
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

/* === Controller === */

export class FileHistoryController {
  private readonly callbacks: FileHistoryCallbacks;
  private readonly barElem: HTMLDivElement;
  private readonly pathElem: HTMLSpanElement;
  private readonly positionElem: HTMLSpanElement;
  private nextRequestId: number = FIRST_REQUEST_ID;
  private latestRequestId: number | null = null;
  private pending: PendingRequest | null = null;
  private state: FileHistoryState | null = null;

  constructor(callbacks: FileHistoryCallbacks) {
    this.callbacks = callbacks;
    this.barElem = document.createElement("div");
    this.barElem.id = FILE_HISTORY_BAR_ID;
    this.pathElem = createSpan(PATH_ELEMENT_ID);
    this.positionElem = createSpan(POSITION_ELEMENT_ID);
    const prevBtn = createButton(PREV_BUTTON_ID, t("fileHistory.previous"), svgIcons.arrowUp);
    const nextBtn = createButton(NEXT_BUTTON_ID, t("fileHistory.next"), svgIcons.arrowDown);
    const exitBtn = createButton(EXIT_BUTTON_ID, null, t("fileHistory.exit"));
    prevBtn.addEventListener("click", () => this.prev());
    nextBtn.addEventListener("click", () => this.next());
    exitBtn.addEventListener("click", () => this.exit(true));
    this.barElem.append(this.pathElem, this.positionElem, prevBtn, nextBtn, exitBtn);
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

  public exit(restore: boolean): void {
    const state = this.state;
    this.pending = null;
    // Cleared before the restore callbacks run so a re-render they trigger sees inactive state.
    this.state = null;
    this.renderBar();
    clearHighlightClasses();
    this.callbacks.setGraphHighlight(null);
    if (!restore || state === null || state.repo !== this.callbacks.getCurrentRepo()) return;
    const expanded = state.snapshot.expanded;
    if (expanded !== null) {
      if (this.callbacks.getCommitId(expanded.hash) === null) return;
      this.callbacks.restoreExpandedCommit(expanded);
    }
    this.callbacks.setScrollTop(state.snapshot.scrollTop);
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

  private step(delta: number): void {
    if (this.state === null) return;
    const { visibleHashes, currentHash } = this.state;
    const count = visibleHashes.length;
    if (count === 0) return;
    const index = (visibleHashes.indexOf(currentHash) + delta + count) % count;
    const hash = visibleHashes[index];
    if (hash === undefined) return;
    this.state = { ...this.state, currentHash: hash };
    this.applyClasses();
    this.callbacks.scrollToCommit(hash, true);
  }

  private prev(): void {
    this.step(-1);
  }

  private next(): void {
    this.step(1);
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
    } else {
      this.barElem.classList.remove(CLASS_ACTIVE, CLASS_LOADING);
    }
  }
}
