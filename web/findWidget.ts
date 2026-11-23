import type * as GG from "../src/types";
import { getBranchLabels } from "./branchLabels";
import { getCommitDate } from "./dates";
import {
  type CommitMatch,
  HistorySearch,
  type SearchEnd,
  type SearchStart,
  type UnreadMatch
} from "./historySearch";
import { t } from "./i18n";
import {
  captureFocusOrigin,
  type FocusCloseReason,
  type FocusOrigin,
  isKeyboardActionBlocked,
  restoreFocus
} from "./keyboardNavigation";
import { REF_OVERFLOW_IGNORE_ATTRIBUTE } from "./refOverflow";
import {
  abbrevCommit,
  buildStashSelectorDisplay,
  sendMessage,
  svgIcons,
  UNCOMMITTED_CHANGES_HASH
} from "./utils";

/* === Constants === */

export const SEARCH_DEBOUNCE_MS = 200;
export const CLASS_FIND_MATCH = "findMatch";
export const CLASS_FIND_CURRENT_COMMIT = "findCurrentCommit";
export const REGEX_META_CHARS = /[\\[\](){}|.*+?^$]/g;

const CLASS_ACTIVE = "active";
const CLASS_TRANSITION = "transition";
const CLASS_DISABLED = "disabled";
const ATTR_ERROR = "data-error";
const ATTR_PRESSED = "aria-pressed";
const ATTR_HIDDEN = "aria-hidden";
const ATTR_TRUE = "true";
const KEY_ENTER = "Enter";
const TAB_INDEX_STOP = 0;
const TAB_INDEX_PROGRAMMATIC = -1;
const REASON_KEYBOARD: FocusCloseReason = "keyboard";
const ZERO_LENGTH_MATCH_ERROR = "find.zeroLengthRegex";

/* === DOM Helpers === */

export function getCommitElems(): HTMLCollectionOf<HTMLElement> {
  return document.getElementsByClassName("commit") as HTMLCollectionOf<HTMLElement>;
}

function countLoadedCommits(commits: GG.GitCommitNode[]): number {
  return commits.reduce(
    (count, commit) => count + Number(commit.hash !== UNCOMMITTED_CHANGES_HASH),
    0
  );
}

// The ref overflow counter, list and measuring clones repeat or summarise row text, so their
// subtrees are neither marked nor unmarked; the hidden original refs are still searched.
function isSearchIgnored(node: Node): boolean {
  return node instanceof Element && node.hasAttribute(REF_OVERFLOW_IGNORE_ATTRIBUTE);
}

function getChildNodesWithTextContent(elem: Node): Node[] {
  const textChildren: Node[] = [];
  for (let i = 0; i < elem.childNodes.length; i++) {
    if (isSearchIgnored(elem.childNodes[i])) continue;
    if (elem.childNodes[i].childNodes.length > 0) {
      textChildren.push(...getChildNodesWithTextContent(elem.childNodes[i]));
    } else if (elem.childNodes[i].textContent !== null && elem.childNodes[i].textContent !== "") {
      textChildren.push(elem.childNodes[i]);
    }
  }
  return textChildren;
}

function getChildrenWithClassName(elem: Element, className: string): Element[] {
  const children: Element[] = [];
  for (let i = 0; i < elem.children.length; i++) {
    if (isSearchIgnored(elem.children[i])) continue;
    if (elem.children[i].children.length > 0) {
      children.push(...getChildrenWithClassName(elem.children[i], className));
    } else if (elem.children[i].className === className) {
      children.push(elem.children[i]);
    }
  }
  return children;
}

export function findCommitElemWithId(
  elems: HTMLCollectionOf<HTMLElement>,
  id: number | null
): HTMLElement | null {
  if (id === null) return null;
  const findIdStr = id.toString();
  for (let i = 0; i < elems.length; i++) {
    if (findIdStr === elems[i].dataset.id) return elems[i];
  }
  return null;
}

/* === Interfaces === */

export function matchesCommit(
  commit: GG.GitCommitNode,
  pattern: RegExp,
  globalRegex: RegExp | null,
  loaded: boolean
): CommitMatch {
  const labels = getBranchLabels(commit.refs);
  const fields = [
    commit.message,
    commit.author,
    abbrevCommit(commit.hash),
    getCommitDate(commit.date).value,
    ...labels.heads.flatMap((head) => [head.name, ...head.remotes]),
    ...labels.remotes.map((remote) => remote.name),
    ...labels.tags.map((tag) => tag.name)
  ];
  if (loaded && commit.stash !== null)
    fields.push(buildStashSelectorDisplay(commit.stash.selector));
  const hashMatch = pattern.exec(commit.hash);
  let matched = hashMatch?.index === 0;
  if (globalRegex === null)
    return matched || fields.some((field) => pattern.test(field)) ? "match" : "miss";
  // A zero-width match in an unmounted row must give the same error as one on screen.
  if (matched && hashMatch?.[0] === "") return "regexError";
  for (const field of fields) {
    for (const match of field.matchAll(globalRegex)) {
      if (!match[0].length) return "regexError";
      matched = true;
    }
  }
  return matched ? "match" : "miss";
}

export interface FindWidgetCallbacks {
  getSearchStart(): SearchStart | undefined;
  navigateToUnread?(match: UnreadMatch, owner: GG.SearchOwner): void;
  getCommits(): GG.GitCommitNode[];
  scrollToCommit(hash: string, alwaysCenterCommit: boolean): void;
  saveState(): void;
  loadCommitDetails(elem: HTMLElement): void;
  getCommitId(hash: string): number | null;
  isCdvOpen(hash: string): boolean;
  onHighlightsChanged?(): void;
}

/* === FindWidget === */

export class FindWidget {
  public readonly history: HistorySearch;
  private loadedCount = 0;
  private readonly callbacks: FindWidgetCallbacks;
  private text: string = "";
  private matches: string[] = [];
  private readonly matchHashes = new Set<string>();
  private mounted = new Map<string, HTMLElement>();
  private patterns: { single: RegExp; global: RegExp } | null = null;
  private position: number = -1;
  private visible: boolean = false;
  private caseSensitive: boolean = false;
  private regex: boolean = false;
  private openCdvEnabled: boolean = false;
  // Where focus came from when the widget was shown; a keyboard close returns there.
  private origin: FocusOrigin | null = null;

  private readonly widgetElem: HTMLElement;
  private readonly inputElem: HTMLInputElement;
  private readonly caseSensitiveElem: HTMLButtonElement;
  private readonly regexElem: HTMLButtonElement;
  private readonly positionElem: HTMLElement;
  private readonly prevElem: HTMLButtonElement;
  private readonly nextElem: HTMLButtonElement;
  private readonly openCdvElem: HTMLButtonElement;
  private readonly scopeElem: HTMLElement;
  private readonly statusElem: HTMLElement;
  private readonly startElem: HTMLButtonElement;
  private readonly continueElem: HTMLButtonElement;
  private readonly cancelElem: HTMLButtonElement;

  constructor(callbacks: FindWidgetCallbacks) {
    this.callbacks = callbacks;
    this.history = new HistorySearch(
      sendMessage,
      (row) =>
        this.patterns
          ? matchesCommit(
              row,
              this.patterns.single,
              this.regex ? this.patterns.global : null,
              false
            )
          : "miss",
      (hash) => this.callbacks.getCommitId(hash) !== null
    );

    this.widgetElem = document.createElement("div");
    this.widgetElem.className = "findWidget";
    this.widgetElem.innerHTML = [
      '<div class="findRow">',
      `<input id="findInput" type="text" placeholder="${t("find.placeholder")}" aria-label="${t("find.placeholder")}" disabled/>`,
      FindWidget.buttonHtml("findCaseSensitive", t("find.matchCase"), "findModifier", "Aa"),
      FindWidget.buttonHtml("findRegex", t("find.useRegex"), "findModifier", ".*"),
      '<span id="findPosition"></span>',
      FindWidget.buttonHtml("findPrev", t("find.previous"), "", svgIcons.arrowUp),
      FindWidget.buttonHtml("findNext", t("find.next"), "", svgIcons.arrowDown),
      FindWidget.buttonHtml("findOpenCdv", t("find.openCommitDetails"), "", svgIcons.cdv),
      FindWidget.buttonHtml("findClose", t("find.close"), "", svgIcons.close),
      '</div><div class="findRow findScopeRow"><span id="findScope"></span>',
      FindWidget.buttonHtml("findStart", t("find.start"), "findAction", t("find.start")),
      FindWidget.buttonHtml("findContinue", t("find.continue"), "findAction", t("find.continue")),
      FindWidget.buttonHtml("findCancel", t("find.cancel"), "findAction", t("find.cancel")),
      '</div><div id="findStatus" role="status"></div>'
    ].join("");
    document.body.appendChild(this.widgetElem);

    this.inputElem = document.getElementById("findInput") as HTMLInputElement;
    this.scopeElem = document.getElementById("findScope")!;
    this.statusElem = document.getElementById("findStatus")!;
    this.startElem = document.getElementById("findStart") as HTMLButtonElement;
    this.continueElem = document.getElementById("findContinue") as HTMLButtonElement;
    this.cancelElem = document.getElementById("findCancel") as HTMLButtonElement;
    this.startElem.addEventListener("click", () => {
      const query = this.callbacks.getSearchStart();
      if (
        !query ||
        this.startElem.disabled ||
        this.startElem.hidden ||
        !this.patterns ||
        this.inputElem.value !== this.text
      )
        return;
      this.history.start(query);
      this.renderStatus();
      this.callbacks.saveState();
    });
    this.continueElem.addEventListener("click", () => {
      this.history.resume();
      this.renderStatus();
    });
    this.cancelElem.addEventListener("click", () => this.endHistorySearch("cancelled"));
    // Enter runs on keydown behind the shared guard, so composition, repeat and keyup never move.
    this.inputElem.addEventListener("keydown", (e) => {
      if (e.key !== KEY_ENTER || isKeyboardActionBlocked(e) || this.text === "") return;
      if (e.shiftKey) {
        this.prev();
      } else {
        this.next();
      }
      e.stopPropagation();
    });
    let keyupTimeout: ReturnType<typeof setTimeout> | null = null;
    const scheduleSearch = () => {
      if (this.inputElem.value !== this.text && this.history.owner) {
        this.endHistorySearch("idle");
      }
      this.startElem.disabled = this.startElem.disabled || this.inputElem.value !== this.text;
      if (keyupTimeout !== null) clearTimeout(keyupTimeout);
      keyupTimeout = setTimeout(() => {
        keyupTimeout = null;
        if (this.text !== this.inputElem.value) {
          this.text = this.inputElem.value;
          this.onQueryChanged();
        }
        this.renderStatus();
      }, SEARCH_DEBOUNCE_MS);
    };
    this.inputElem.addEventListener("input", scheduleSearch);
    this.inputElem.addEventListener("keyup", scheduleSearch);

    this.caseSensitiveElem = document.getElementById("findCaseSensitive") as HTMLButtonElement;
    this.setPressed(this.caseSensitiveElem, this.caseSensitive);
    this.caseSensitiveElem.addEventListener("click", () => {
      this.caseSensitive = !this.caseSensitive;
      this.setPressed(this.caseSensitiveElem, this.caseSensitive);
      this.onQueryChanged();
    });

    this.regexElem = document.getElementById("findRegex") as HTMLButtonElement;
    this.setPressed(this.regexElem, this.regex);
    this.regexElem.addEventListener("click", () => {
      this.regex = !this.regex;
      this.setPressed(this.regexElem, this.regex);
      this.onQueryChanged();
    });

    this.positionElem = document.getElementById("findPosition")!;

    this.prevElem = document.getElementById("findPrev") as HTMLButtonElement;
    this.prevElem.addEventListener("click", () => this.prev());

    this.nextElem = document.getElementById("findNext") as HTMLButtonElement;
    this.nextElem.addEventListener("click", () => this.next());
    this.syncNavigationState();

    this.openCdvElem = document.getElementById("findOpenCdv") as HTMLButtonElement;
    this.setPressed(this.openCdvElem, this.openCdvEnabled);
    this.openCdvElem.addEventListener("click", () => {
      this.openCdvEnabled = !this.openCdvEnabled;
      this.setPressed(this.openCdvElem, this.openCdvEnabled);
      this.openCommitDetailsViewForCurrentMatchIfEnabled();
    });

    // The close button disappears with the widget, so its activation returns like Escape does.
    const findCloseElem = document.getElementById("findClose")!;
    findCloseElem.addEventListener("click", () => this.close(REASON_KEYBOARD));
    this.setControlsReachable(false);
  }

  /* === Public Methods === */

  public show(transition: boolean) {
    this.rememberOrigin();
    if (!this.visible) {
      this.visible = true;
      this.loadedCount = countLoadedCommits(this.callbacks.getCommits());
      this.inputElem.value = this.text;
      this.inputElem.disabled = false;
      this.setControlsReachable(true);
      this.updatePosition(-1, false);
      this.toggleClass(this.widgetElem, CLASS_TRANSITION, transition);
      this.widgetElem.classList.add(CLASS_ACTIVE);
    }
    this.inputElem.focus();
    this.inputElem.select();
  }

  // "keyboard" returns focus to where the widget was opened from; a programmatic close leaves it.
  public close(reason?: FocusCloseReason) {
    if (!this.visible) return;
    this.visible = false;
    this.history.end("idle");
    this.widgetElem.classList.add(CLASS_TRANSITION);
    this.widgetElem.classList.remove(CLASS_ACTIVE);
    this.clearMatches();
    this.callbacks.onHighlightsChanged?.();
    this.text = "";
    this.matchHashes.clear();
    this.mounted.clear();
    this.patterns = null;
    this.matches = [];
    this.position = -1;
    this.inputElem.value = this.text;
    this.inputElem.disabled = true;
    this.widgetElem.removeAttribute(ATTR_ERROR);
    this.syncNavigationState();
    this.setControlsReachable(false);
    this.callbacks.saveState();
    if (reason === REASON_KEYBOARD) restoreFocus(this.origin, REASON_KEYBOARD);
  }

  public refresh() {
    if (this.visible) {
      this.history.mergeLoaded();
      this.clearMatches();
      this.findMatches(this.getCurrentHash(), false);
    }
  }

  public receiveHistorySearch(
    response: GG.ResponseHistorySearchBatch | GG.ResponseHistorySearchValidation
  ) {
    if (!this.history.receive(response)) return;
    if (this.history.status === "regexError") {
      this.setRegexError(t(ZERO_LENGTH_MATCH_ERROR));
      this.callbacks.onHighlightsChanged?.();
      this.callbacks.saveState();
    }
    if (this.history.status === "historyChanged") this.refresh();
    this.renderStatus();
  }

  public endHistorySearch(reason: SearchEnd) {
    this.history.end(reason);
    this.renderStatus();
  }

  public selectLoadedMatch(hash: string): boolean {
    const position = this.matches.indexOf(hash);
    if (position < 0) return false;
    this.updatePosition(position, true);
    this.openCommitDetailsViewForCurrentMatchIfEnabled();
    return true;
  }

  public isVisible() {
    return this.visible;
  }

  public setInputEnabled(enabled: boolean) {
    if (!this.visible) return;
    this.inputElem.disabled = !enabled;
    this.renderStatus();
  }

  /* === State === */

  public getState(): FindWidgetState {
    return {
      text: this.text,
      currentHash: this.history.owner ? null : this.getCurrentHash(),
      visible: this.visible,
      caseSensitive: this.caseSensitive,
      regex: this.regex,
      openCdvEnabled: this.openCdvEnabled
    };
  }

  public getCurrentHash(): string | null {
    return this.position > -1 ? this.matches[this.position] : null;
  }

  public restoreState(state: FindWidgetState) {
    this.openCdvEnabled = state.openCdvEnabled === true;
    this.setPressed(this.openCdvElem, this.openCdvEnabled);
    if (!state.visible) return;
    this.text = state.text;
    this.caseSensitive = state.caseSensitive;
    this.regex = state.regex;
    this.setPressed(this.caseSensitiveElem, this.caseSensitive);
    this.setPressed(this.regexElem, this.regex);
    this.show(false);
    if (this.text !== "") this.findMatches(state.currentHash, false);
  }

  /* === Matching === */

  private onQueryChanged() {
    this.history.end("idle");
    this.widgetElem.removeAttribute(ATTR_ERROR);
    this.clearMatches();
    this.findMatches(this.getCurrentHash(), true);
    this.openCommitDetailsViewForCurrentMatchIfEnabled();
  }

  private setRegexError(message: string) {
    if (this.history.status !== "regexError") this.history.end("regexError");
    this.clearMatches();
    this.matches = [];
    this.matchHashes.clear();
    this.mounted.clear();
    this.patterns = null;
    this.position = -1;
    this.widgetElem.setAttribute(ATTR_ERROR, message);
  }

  private findMatches(goToCommitHash: string | null, scrollToCommit: boolean) {
    const commits = this.callbacks.getCommits();
    this.loadedCount = countLoadedCommits(commits);
    this.matches = [];
    this.matchHashes.clear();
    this.mounted.clear();
    this.patterns = null;
    this.position = -1;

    if (this.text !== "" && this.history.status !== "regexError") {
      const regexText = this.regex ? this.text : this.text.replace(REGEX_META_CHARS, "\\$&");
      const flags = `u${this.caseSensitive ? "" : "i"}`;

      let findPattern: RegExp | null;
      let findGlobalPattern: RegExp | null;
      try {
        findPattern = new RegExp(regexText, flags);
        findGlobalPattern = new RegExp(regexText, `g${flags}`);
        this.widgetElem.removeAttribute(ATTR_ERROR);
      } catch (e) {
        findPattern = null;
        findGlobalPattern = null;
        this.setRegexError(e instanceof Error ? e.message : String(e));
      }

      if (findPattern !== null && findGlobalPattern !== null) {
        this.patterns = { single: findPattern, global: findGlobalPattern };

        for (let i = 0; i < commits.length; i++) {
          const commit = commits[i];
          if (commit.hash === UNCOMMITTED_CHANGES_HASH) continue;
          const matched = matchesCommit(
            commit,
            findPattern,
            this.regex ? findGlobalPattern : null,
            true
          );
          if (matched === "regexError") {
            this.setRegexError(t(ZERO_LENGTH_MATCH_ERROR));
            break;
          }
          if (matched === "match") {
            this.matches.push(commit.hash);
            this.matchHashes.add(commit.hash);
          }
        }
        this.repaintMountedMatches(commits);
      }
    } else if (this.text === "") {
      this.widgetElem.removeAttribute(ATTR_ERROR);
    }

    let newPos = -1;
    if (this.matches.length > 0) {
      newPos = 0;
      if (goToCommitHash !== null) {
        const pos = this.matches.indexOf(goToCommitHash);
        if (pos > -1) newPos = pos;
      }
    }
    this.updatePosition(newPos, scrollToCommit);
    // Every search, including empty, invalid and zero-length patterns, ends here after its marks
    // are cleared or inserted, so one notification per search covers all of them.
    this.callbacks.onHighlightsChanged?.();
  }

  public repaintMountedMatches(commits = this.callbacks.getCommits()) {
    const previous = this.mounted;
    this.mounted = new Map();
    if (!this.visible || !this.patterns || !this.matchHashes.size) return;
    for (const row of Array.from(getCommitElems())) {
      const hash = commits[Number(row.dataset.id)]?.hash;
      if (!hash || !this.matchHashes.has(hash)) continue;
      this.mounted.set(hash, row);
      if (previous.get(hash) !== row)
        this.markRow(row, hash, this.patterns.single, this.patterns.global);
      row.classList.toggle(CLASS_FIND_CURRENT_COMMIT, hash === this.getCurrentHash());
    }
  }

  private markRow(row: HTMLElement, hash: string, findPattern: RegExp, findGlobalPattern: RegExp) {
    const textElems = getChildNodesWithTextContent(row);
    for (let k = 0; k < textElems.length; k++) {
      const textElem = textElems[k];
      let matchStart = 0;
      let matchEnd = 0;
      const text = textElem.textContent!;
      for (const match of text.matchAll(findGlobalPattern)) {
        if (match[0].length === 0 || match.index === undefined) continue;
        if (matchEnd !== match.index) {
          if (matchStart !== matchEnd) {
            textElem.parentNode!.insertBefore(
              FindWidget.createMatchElem(text.substring(matchStart, matchEnd)),
              textElem
            );
          }
          textElem.parentNode!.insertBefore(
            document.createTextNode(text.substring(matchEnd, match.index)),
            textElem
          );
          matchStart = match.index;
        }
        matchEnd = match.index + match[0].length;
      }
      if (matchEnd > 0) {
        if (matchStart !== matchEnd) {
          textElem.parentNode!.insertBefore(
            FindWidget.createMatchElem(text.substring(matchStart, matchEnd)),
            textElem
          );
        }
        if (matchEnd !== text.length) {
          textElem.textContent = text.substring(matchEnd);
        } else {
          textElem.parentNode!.removeChild(textElem);
        }
      }
    }

    if (
      hash.search(findPattern) === 0 &&
      !findPattern.test(abbrevCommit(hash)) &&
      textElems.length > 0
    ) {
      const commitNode = textElems[textElems.length - 1];
      commitNode.parentNode!.replaceChild(
        FindWidget.createMatchElem(commitNode.textContent!),
        commitNode
      );
    }
  }

  private clearMatches() {
    for (const row of this.mounted.values()) {
      row.classList.remove(CLASS_FIND_CURRENT_COMMIT);
      const matchElems = getChildrenWithClassName(row, CLASS_FIND_MATCH);
      for (let j = 0; j < matchElems.length; j++) {
        const matchElem = matchElems[j];
        let text = matchElem.childNodes[0].textContent!;

        let node = matchElem.previousSibling;
        const prevElementSibling = matchElem.previousElementSibling;
        while (node !== null && node !== prevElementSibling && node.textContent !== null) {
          text = `${node.textContent}${text}`;
          matchElem.parentNode!.removeChild(node);
          node = matchElem.previousSibling;
        }

        node = matchElem.nextSibling;
        const nextElementSibling = matchElem.nextElementSibling;
        while (node !== null && node !== nextElementSibling && node.textContent !== null) {
          text = `${text}${node.textContent}`;
          matchElem.parentNode!.removeChild(node);
          node = matchElem.nextSibling;
        }

        matchElem.parentNode!.replaceChild(document.createTextNode(text), matchElem);
      }
    }
  }

  private updatePosition(position: number, scrollToCommit: boolean) {
    if (this.position > -1) {
      this.mounted.get(this.matches[this.position])?.classList.remove(CLASS_FIND_CURRENT_COMMIT);
    }
    this.position = position;
    if (this.position > -1) {
      this.mounted.get(this.matches[this.position])?.classList.add(CLASS_FIND_CURRENT_COMMIT);
      if (scrollToCommit) {
        this.callbacks.scrollToCommit(this.matches[position], false);
      }
    }
    this.renderStatus();
    this.callbacks.saveState();
  }

  private prev() {
    this.navigate(
      this.position > 0 ? this.position - 1 : this.matches.length + this.history.unreadCount - 1
    );
  }

  private next() {
    this.navigate(
      this.position < this.matches.length + this.history.unreadCount - 1 ? this.position + 1 : 0
    );
  }

  private navigate(index: number) {
    if (this.inputElem.disabled || index < 0) return;
    if (index < this.matches.length) {
      this.selectLoadedMatch(this.matches[index]);
      return;
    }
    const match = this.history.unread[index - this.matches.length];
    if (match && this.history.owner) this.callbacks.navigateToUnread?.(match, this.history.owner);
  }

  private openCommitDetailsViewForCurrentMatchIfEnabled() {
    if (!this.openCdvEnabled) return;
    const commitHash = this.getCurrentHash();
    if (commitHash === null || this.callbacks.isCdvOpen(commitHash)) return;
    if (!this.mounted.has(commitHash)) this.callbacks.scrollToCommit(commitHash, false);
    const commitElem = findCommitElemWithId(
      getCommitElems(),
      this.callbacks.getCommitId(commitHash)
    );
    if (commitElem !== null) {
      this.callbacks.loadCommitDetails(commitElem);
    }
  }

  private static createMatchElem(text: string): HTMLSpanElement {
    const span = document.createElement("span");
    span.className = CLASS_FIND_MATCH;
    span.textContent = text;
    return span;
  }

  /* === Helpers === */

  private renderStatus() {
    const { status, unreadCount, owner } = this.history;
    const total = this.matches.length + unreadCount;
    const suffix = status === "paused" ? "+" : "";
    this.scopeElem.textContent = owner
      ? t("find.fullScope")
      : t("find.loadedScope", this.loadedCount);
    this.positionElem.textContent =
      total === 0
        ? t("find.noResults")
        : owner
          ? t(
              "find.fullPosition",
              this.position + 1,
              `${total}${suffix}`,
              `${unreadCount}${suffix}`
            )
          : t("find.position", this.position + 1, total);
    const canStart = this.callbacks.getSearchStart() !== undefined;
    let message = "";
    if (status === "regexError") message = this.widgetElem.getAttribute(ATTR_ERROR) ?? "";
    else if (status === "running") message = t("find.running", this.history.examined);
    else if (status === "readError") message = t("find.readError", this.history.errorMessage);
    else if (status !== "idle") message = t(`find.${status}`);
    else if (!canStart) message = t("find.reloadFirst");
    this.statusElem.textContent = owner ? `${message} ${t("find.excludeStashes")}` : message;
    this.startElem.hidden = !!owner && status !== "readError";
    this.startElem.disabled =
      !canStart || !this.patterns || this.inputElem.disabled || this.inputElem.value !== this.text;
    this.continueElem.hidden = status !== "paused";
    this.cancelElem.hidden = !owner;
    this.syncNavigationState();
  }

  private static buttonHtml(id: string, name: string, className: string, content: string): string {
    const classAttr = className === "" ? "" : ` class="${className}"`;
    return `<button type="button" id="${id}"${classAttr} title="${name}" aria-label="${name}">${content}</button>`;
  }

  private toggleClass(elem: HTMLElement, className: string, condition: boolean) {
    if (condition) {
      elem.classList.add(className);
    } else {
      elem.classList.remove(className);
    }
  }

  private setPressed(elem: HTMLButtonElement, pressed: boolean) {
    this.toggleClass(elem, CLASS_ACTIVE, pressed);
    elem.setAttribute(ATTR_PRESSED, String(pressed));
  }

  // Previous / next need results and an enabled input (results are stale while the list reloads).
  private syncNavigationState() {
    const disabled =
      this.inputElem.disabled || (this.matches.length === 0 && this.history.unreadCount === 0);
    for (const elem of [this.prevElem, this.nextElem]) {
      this.toggleClass(elem, CLASS_DISABLED, disabled);
      elem.disabled = disabled;
    }
  }

  // A new session never reuses an earlier origin. Opened from the page body, only the repository
  // is kept, so a keyboard close falls through to the context chain (active row → list container).
  private rememberOrigin() {
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      active !== document.body &&
      !this.widgetElem.contains(active)
    ) {
      this.origin = captureFocusOrigin(active);
    } else if (!this.visible) {
      const contextOrigin = captureFocusOrigin(document.body);
      this.origin = contextOrigin === null ? null : { ...contextOrigin, source: null };
    }
  }

  // The hidden widget is only translated off-screen, so its buttons must leave the tab order and
  // the accessibility tree explicitly.
  private setControlsReachable(reachable: boolean) {
    const tabIndex = reachable ? TAB_INDEX_STOP : TAB_INDEX_PROGRAMMATIC;
    this.widgetElem.querySelectorAll("button").forEach((button) => {
      button.tabIndex = tabIndex;
    });
    if (reachable) {
      this.widgetElem.removeAttribute(ATTR_HIDDEN);
    } else {
      this.widgetElem.setAttribute(ATTR_HIDDEN, ATTR_TRUE);
    }
  }
}
