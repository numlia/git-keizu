import * as GG from "../src/types";
import { getBranchLabels } from "./branchLabels";
import { getCommitDate } from "./dates";
import { t } from "./i18n";
import {
  captureFocusOrigin,
  type FocusCloseReason,
  type FocusOrigin,
  isKeyboardActionBlocked,
  restoreFocus
} from "./keyboardNavigation";
import { REF_OVERFLOW_IGNORE_ATTRIBUTE } from "./refOverflow";
import { buildStashSelectorDisplay, svgIcons, UNCOMMITTED_CHANGES_HASH } from "./utils";

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
const ABBREV_COMMIT_LENGTH = 8;
const ZERO_LENGTH_MATCH_ERROR = "find.zeroLengthRegex";

/* === DOM Helpers === */

export function getCommitElems(): HTMLCollectionOf<HTMLElement> {
  return document.getElementsByClassName("commit") as HTMLCollectionOf<HTMLElement>;
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

function abbrevCommit(commitHash: string): string {
  return commitHash.substring(0, ABBREV_COMMIT_LENGTH);
}

/* === Interfaces === */

export interface FindWidgetCallbacks {
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
  private readonly callbacks: FindWidgetCallbacks;
  private text: string = "";
  private matches: { hash: string; elem: HTMLElement }[] = [];
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

  constructor(callbacks: FindWidgetCallbacks) {
    this.callbacks = callbacks;

    this.widgetElem = document.createElement("div");
    this.widgetElem.className = "findWidget";
    this.widgetElem.innerHTML = [
      `<input id="findInput" type="text" placeholder="${t("find.placeholder")}" aria-label="${t("find.placeholder")}" disabled/>`,
      FindWidget.buttonHtml("findCaseSensitive", t("find.matchCase"), "findModifier", "Aa"),
      FindWidget.buttonHtml("findRegex", t("find.useRegex"), "findModifier", ".*"),
      '<span id="findPosition"></span>',
      FindWidget.buttonHtml("findPrev", t("find.previous"), "", svgIcons.arrowUp),
      FindWidget.buttonHtml("findNext", t("find.next"), "", svgIcons.arrowDown),
      FindWidget.buttonHtml("findOpenCdv", t("find.openCommitDetails"), "", svgIcons.cdv),
      FindWidget.buttonHtml("findClose", t("find.close"), "", svgIcons.close)
    ].join("");
    document.body.appendChild(this.widgetElem);

    this.inputElem = document.getElementById("findInput") as HTMLInputElement;
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
    this.inputElem.addEventListener("keyup", () => {
      if (keyupTimeout !== null) clearTimeout(keyupTimeout);
      keyupTimeout = setTimeout(() => {
        keyupTimeout = null;
        if (this.text !== this.inputElem.value) {
          this.text = this.inputElem.value;
          this.clearMatches();
          this.findMatches(this.getCurrentHash(), true);
          this.openCommitDetailsViewForCurrentMatchIfEnabled();
        }
      }, SEARCH_DEBOUNCE_MS);
    });

    this.caseSensitiveElem = document.getElementById("findCaseSensitive") as HTMLButtonElement;
    this.setPressed(this.caseSensitiveElem, this.caseSensitive);
    this.caseSensitiveElem.addEventListener("click", () => {
      this.caseSensitive = !this.caseSensitive;
      this.setPressed(this.caseSensitiveElem, this.caseSensitive);
      this.clearMatches();
      this.findMatches(this.getCurrentHash(), true);
      this.openCommitDetailsViewForCurrentMatchIfEnabled();
    });

    this.regexElem = document.getElementById("findRegex") as HTMLButtonElement;
    this.setPressed(this.regexElem, this.regex);
    this.regexElem.addEventListener("click", () => {
      this.regex = !this.regex;
      this.setPressed(this.regexElem, this.regex);
      this.clearMatches();
      this.findMatches(this.getCurrentHash(), true);
      this.openCommitDetailsViewForCurrentMatchIfEnabled();
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
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      active !== document.body &&
      !this.widgetElem.contains(active)
    ) {
      this.origin = captureFocusOrigin(active);
    }
    if (!this.visible) {
      this.visible = true;
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
    this.widgetElem.classList.add(CLASS_TRANSITION);
    this.widgetElem.classList.remove(CLASS_ACTIVE);
    this.clearMatches();
    this.callbacks.onHighlightsChanged?.();
    this.text = "";
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
      this.findMatches(this.getCurrentHash(), false);
    }
  }

  public isVisible() {
    return this.visible;
  }

  public setInputEnabled(enabled: boolean) {
    if (!this.visible) return;
    this.inputElem.disabled = !enabled;
    this.syncNavigationState();
  }

  /* === State === */

  public getState(): FindWidgetState {
    return {
      text: this.text,
      currentHash: this.getCurrentHash(),
      visible: this.visible,
      caseSensitive: this.caseSensitive,
      regex: this.regex,
      openCdvEnabled: this.openCdvEnabled
    };
  }

  public getCurrentHash(): string | null {
    return this.position > -1 ? this.matches[this.position].hash : null;
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

  private findMatches(goToCommitHash: string | null, scrollToCommit: boolean) {
    this.matches = [];
    this.position = -1;

    if (this.text !== "") {
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
        this.widgetElem.setAttribute(ATTR_ERROR, e instanceof Error ? e.message : String(e));
      }

      if (findPattern !== null && findGlobalPattern !== null) {
        const commitElems = getCommitElems();
        let j = 0;
        let zeroLengthMatch = false;

        const commits = this.callbacks.getCommits();
        for (let i = 0; i < commits.length; i++) {
          const commit = commits[i];
          const branchLabels = getBranchLabels(commit.refs);

          if (
            commit.hash !== UNCOMMITTED_CHANGES_HASH &&
            (findPattern.test(commit.message) ||
              findPattern.test(commit.author) ||
              commit.hash.search(findPattern) === 0 ||
              findPattern.test(abbrevCommit(commit.hash)) ||
              branchLabels.heads.some(
                (head) =>
                  findPattern!.test(head.name) ||
                  head.remotes.some((remote) => findPattern!.test(remote))
              ) ||
              branchLabels.remotes.some((remote) => findPattern!.test(remote.name)) ||
              branchLabels.tags.some((tag) => findPattern!.test(tag.name)) ||
              findPattern.test(getCommitDate(commit.date).value) ||
              (commit.stash !== null &&
                findPattern.test(buildStashSelectorDisplay(commit.stash.selector))))
          ) {
            const idStr = i.toString();
            while (j < commitElems.length && commitElems[j].dataset.id !== idStr) j++;
            if (j === commitElems.length) continue;

            this.matches.push({ hash: commit.hash, elem: commitElems[j] });

            const textElems = getChildNodesWithTextContent(commitElems[j]);
            for (let k = 0; k < textElems.length; k++) {
              const textElem = textElems[k];
              let matchStart = 0;
              let matchEnd = 0;
              const text = textElem.textContent!;
              findGlobalPattern.lastIndex = 0;
              let match: RegExpExecArray | null;
              while ((match = findGlobalPattern.exec(text)) !== null) {
                if (match[0].length === 0) {
                  zeroLengthMatch = true;
                  break;
                }
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
                matchEnd = findGlobalPattern.lastIndex;
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
              if (zeroLengthMatch) break;
            }

            if (
              commit.hash.search(findPattern) === 0 &&
              !findPattern.test(abbrevCommit(commit.hash)) &&
              textElems.length > 0
            ) {
              const commitNode = textElems[textElems.length - 1];
              commitNode.parentNode!.replaceChild(
                FindWidget.createMatchElem(commitNode.textContent!),
                commitNode
              );
            }

            if (zeroLengthMatch) break;
          }
        }

        if (zeroLengthMatch) {
          this.widgetElem.setAttribute(ATTR_ERROR, t(ZERO_LENGTH_MATCH_ERROR));
          this.clearMatches();
          this.matches = [];
        }
      }
    } else {
      this.widgetElem.removeAttribute(ATTR_ERROR);
    }

    this.syncNavigationState();

    let newPos = -1;
    if (this.matches.length > 0) {
      newPos = 0;
      if (goToCommitHash !== null) {
        const pos = this.matches.findIndex((m) => m.hash === goToCommitHash);
        if (pos > -1) newPos = pos;
      }
    }
    this.updatePosition(newPos, scrollToCommit);
    // Every search, including empty, invalid and zero-length patterns, ends here after its marks
    // are cleared or inserted, so one notification per search covers all of them.
    this.callbacks.onHighlightsChanged?.();
  }

  private clearMatches() {
    for (let i = 0; i < this.matches.length; i++) {
      if (i === this.position) {
        this.matches[i].elem.classList.remove(CLASS_FIND_CURRENT_COMMIT);
      }
      const matchElems = getChildrenWithClassName(this.matches[i].elem, CLASS_FIND_MATCH);
      for (let j = 0; j < matchElems.length; j++) {
        const matchElem = matchElems[j];
        let text = matchElem.childNodes[0].textContent!;

        let node = matchElem.previousSibling;
        const prevElementSibling = matchElem.previousElementSibling;
        while (node !== null && node !== prevElementSibling && node.textContent !== null) {
          text = node.textContent + text;
          matchElem.parentNode!.removeChild(node);
          node = matchElem.previousSibling;
        }

        node = matchElem.nextSibling;
        const nextElementSibling = matchElem.nextElementSibling;
        while (node !== null && node !== nextElementSibling && node.textContent !== null) {
          text = text + node.textContent;
          matchElem.parentNode!.removeChild(node);
          node = matchElem.nextSibling;
        }

        matchElem.parentNode!.replaceChild(document.createTextNode(text), matchElem);
      }
    }
  }

  private updatePosition(position: number, scrollToCommit: boolean) {
    if (this.position > -1) {
      this.matches[this.position].elem.classList.remove(CLASS_FIND_CURRENT_COMMIT);
    }
    this.position = position;
    if (this.position > -1) {
      this.matches[this.position].elem.classList.add(CLASS_FIND_CURRENT_COMMIT);
      if (scrollToCommit) {
        this.callbacks.scrollToCommit(this.matches[position].hash, false);
      }
    }
    this.positionElem.textContent =
      this.matches.length > 0
        ? t("find.position", this.position + 1, this.matches.length)
        : t("find.noResults");
    this.callbacks.saveState();
  }

  private prev() {
    if (this.matches.length === 0) return;
    this.updatePosition(this.position > 0 ? this.position - 1 : this.matches.length - 1, true);
    this.openCommitDetailsViewForCurrentMatchIfEnabled();
  }

  private next() {
    if (this.matches.length === 0) return;
    this.updatePosition(this.position < this.matches.length - 1 ? this.position + 1 : 0, true);
    this.openCommitDetailsViewForCurrentMatchIfEnabled();
  }

  private openCommitDetailsViewForCurrentMatchIfEnabled() {
    if (!this.openCdvEnabled) return;
    const commitHash = this.getCurrentHash();
    if (commitHash === null || this.callbacks.isCdvOpen(commitHash)) return;
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
    const disabled = this.inputElem.disabled || this.matches.length === 0;
    for (const elem of [this.prevElem, this.nextElem]) {
      this.toggleClass(elem, CLASS_DISABLED, disabled);
      elem.disabled = disabled;
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
