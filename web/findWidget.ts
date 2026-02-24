import * as GG from "../src/types";
import { getBranchLabels } from "./branchLabels";
import { getCommitDate } from "./dates";
import { svgIcons, UNCOMMITTED_CHANGES_HASH } from "./utils";

/* === Constants === */

export const SEARCH_DEBOUNCE_MS = 200;
export const CLASS_FIND_MATCH = "findMatch";
export const CLASS_FIND_CURRENT_COMMIT = "findCurrentCommit";
export const REGEX_META_CHARS = /[\\[\](){}|.*+?^$]/g;

const CLASS_ACTIVE = "active";
const CLASS_TRANSITION = "transition";
const CLASS_DISABLED = "disabled";
const ATTR_ERROR = "data-error";
const ABBREV_COMMIT_LENGTH = 8;
const ZERO_LENGTH_MATCH_ERROR = "Cannot use a regular expression which has zero length matches";

/* === DOM Helpers === */

function getCommitElems(): HTMLCollectionOf<HTMLElement> {
  return document.getElementsByClassName("commit") as HTMLCollectionOf<HTMLElement>;
}

function getChildNodesWithTextContent(elem: Node): Node[] {
  const textChildren: Node[] = [];
  for (let i = 0; i < elem.childNodes.length; i++) {
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
    if (elem.children[i].children.length > 0) {
      children.push(...getChildrenWithClassName(elem.children[i], className));
    } else if (elem.children[i].className === className) {
      children.push(elem.children[i]);
    }
  }
  return children;
}

function findCommitElemWithId(
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
  getColumnVisibility(): { author: boolean; date: boolean; commit: boolean };
  scrollToCommit(hash: string, alwaysCenterCommit: boolean): void;
  saveState(): void;
  loadCommitDetails(elem: HTMLElement): void;
  getCommitId(hash: string): number | null;
  isCdvOpen(hash: string, compareWithHash: string | null): boolean;
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

  private readonly widgetElem: HTMLElement;
  private readonly inputElem: HTMLInputElement;
  private readonly caseSensitiveElem: HTMLElement;
  private readonly regexElem: HTMLElement;
  private readonly positionElem: HTMLElement;
  private readonly prevElem: HTMLElement;
  private readonly nextElem: HTMLElement;
  private readonly openCdvElem: HTMLElement;

  constructor(callbacks: FindWidgetCallbacks) {
    this.callbacks = callbacks;

    this.widgetElem = document.createElement("div");
    this.widgetElem.className = "findWidget";
    this.widgetElem.innerHTML = [
      '<input id="findInput" type="text" placeholder="Find" disabled/>',
      '<span id="findCaseSensitive" class="findModifier" title="Match Case">Aa</span>',
      '<span id="findRegex" class="findModifier" title="Use Regular Expression">.*</span>',
      '<span id="findPosition"></span>',
      '<span id="findPrev" title="Previous match (Shift+Enter)"></span>',
      '<span id="findNext" title="Next match (Enter)"></span>',
      '<span id="findOpenCdv" title="Open the Commit Details View for the current match"></span>',
      '<span id="findClose" title="Close (Escape)"></span>'
    ].join("");
    document.body.appendChild(this.widgetElem);

    this.inputElem = document.getElementById("findInput") as HTMLInputElement;
    let keyupTimeout: ReturnType<typeof setTimeout> | null = null;
    this.inputElem.addEventListener("keyup", (e) => {
      if (e.key === "Enter" && this.text !== "") {
        if (e.shiftKey) {
          this.prev();
        } else {
          this.next();
        }
        e.stopPropagation();
      } else {
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
      }
    });

    this.caseSensitiveElem = document.getElementById("findCaseSensitive")!;
    this.toggleClass(this.caseSensitiveElem, CLASS_ACTIVE, this.caseSensitive);
    this.caseSensitiveElem.addEventListener("click", () => {
      this.caseSensitive = !this.caseSensitive;
      this.toggleClass(this.caseSensitiveElem, CLASS_ACTIVE, this.caseSensitive);
      this.clearMatches();
      this.findMatches(this.getCurrentHash(), true);
      this.openCommitDetailsViewForCurrentMatchIfEnabled();
    });

    this.regexElem = document.getElementById("findRegex")!;
    this.toggleClass(this.regexElem, CLASS_ACTIVE, this.regex);
    this.regexElem.addEventListener("click", () => {
      this.regex = !this.regex;
      this.toggleClass(this.regexElem, CLASS_ACTIVE, this.regex);
      this.clearMatches();
      this.findMatches(this.getCurrentHash(), true);
      this.openCommitDetailsViewForCurrentMatchIfEnabled();
    });

    this.positionElem = document.getElementById("findPosition")!;

    this.prevElem = document.getElementById("findPrev")!;
    this.prevElem.classList.add(CLASS_DISABLED);
    this.prevElem.innerHTML = svgIcons.arrowUp;
    this.prevElem.addEventListener("click", () => this.prev());

    this.nextElem = document.getElementById("findNext")!;
    this.nextElem.classList.add(CLASS_DISABLED);
    this.nextElem.innerHTML = svgIcons.arrowDown;
    this.nextElem.addEventListener("click", () => this.next());

    this.openCdvElem = document.getElementById("findOpenCdv")!;
    this.openCdvElem.innerHTML = svgIcons.cdv;
    this.toggleClass(this.openCdvElem, CLASS_ACTIVE, this.openCdvEnabled);
    this.openCdvElem.addEventListener("click", () => {
      this.openCdvEnabled = !this.openCdvEnabled;
      this.toggleClass(this.openCdvElem, CLASS_ACTIVE, this.openCdvEnabled);
      this.openCommitDetailsViewForCurrentMatchIfEnabled();
    });

    const findCloseElem = document.getElementById("findClose")!;
    findCloseElem.innerHTML = svgIcons.close;
    findCloseElem.addEventListener("click", () => this.close());
  }

  /* === Public Methods === */

  public show(transition: boolean) {
    if (!this.visible) {
      this.visible = true;
      this.inputElem.value = this.text;
      this.inputElem.disabled = false;
      this.updatePosition(-1, false);
      this.toggleClass(this.widgetElem, CLASS_TRANSITION, transition);
      this.widgetElem.classList.add(CLASS_ACTIVE);
    }
    this.inputElem.focus();
    this.inputElem.select();
  }

  public close() {
    if (!this.visible) return;
    this.visible = false;
    this.widgetElem.classList.add(CLASS_TRANSITION);
    this.widgetElem.classList.remove(CLASS_ACTIVE);
    this.clearMatches();
    this.text = "";
    this.matches = [];
    this.position = -1;
    this.inputElem.value = this.text;
    this.inputElem.disabled = true;
    this.widgetElem.removeAttribute(ATTR_ERROR);
    this.prevElem.classList.add(CLASS_DISABLED);
    this.nextElem.classList.add(CLASS_DISABLED);
    this.callbacks.saveState();
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
  }

  /* === State === */

  public getState(): FindWidgetState {
    return {
      text: this.text,
      currentHash: this.getCurrentHash(),
      visible: this.visible,
      caseSensitive: this.caseSensitive,
      regex: this.regex
    };
  }

  public getCurrentHash(): string | null {
    return this.position > -1 ? this.matches[this.position].hash : null;
  }

  public restoreState(state: FindWidgetState) {
    if (!state.visible) return;
    this.text = state.text;
    this.caseSensitive = state.caseSensitive;
    this.regex = state.regex;
    this.toggleClass(this.caseSensitiveElem, CLASS_ACTIVE, this.caseSensitive);
    this.toggleClass(this.regexElem, CLASS_ACTIVE, this.regex);
    this.show(false);
    if (this.text !== "") this.findMatches(state.currentHash, false);
  }

  /* === Matching === */

  private findMatches(goToCommitHash: string | null, scrollToCommit: boolean) {
    this.matches = [];
    this.position = -1;

    if (this.text !== "") {
      const colVisibility = this.callbacks.getColumnVisibility();
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
              (colVisibility.author && findPattern.test(commit.author)) ||
              (colVisibility.commit &&
                (commit.hash.search(findPattern) === 0 ||
                  findPattern.test(abbrevCommit(commit.hash)))) ||
              branchLabels.heads.some(
                (head) =>
                  findPattern!.test(head.name) ||
                  head.remotes.some((remote) => findPattern!.test(remote))
              ) ||
              branchLabels.remotes.some((remote) => findPattern!.test(remote.name)) ||
              branchLabels.tags.some((tag) => findPattern!.test(tag.name)) ||
              (colVisibility.date && findPattern.test(getCommitDate(commit.date).value)) ||
              (commit.stash !== null && findPattern.test(commit.stash.selector)))
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
              colVisibility.commit &&
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
          this.widgetElem.setAttribute(ATTR_ERROR, ZERO_LENGTH_MATCH_ERROR);
          this.clearMatches();
          this.matches = [];
        }
      }
    } else {
      this.widgetElem.removeAttribute(ATTR_ERROR);
    }

    this.toggleClass(this.prevElem, CLASS_DISABLED, this.matches.length === 0);
    this.toggleClass(this.nextElem, CLASS_DISABLED, this.matches.length === 0);

    let newPos = -1;
    if (this.matches.length > 0) {
      newPos = 0;
      if (goToCommitHash !== null) {
        const pos = this.matches.findIndex((m) => m.hash === goToCommitHash);
        if (pos > -1) newPos = pos;
      }
    }
    this.updatePosition(newPos, scrollToCommit);
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
      this.matches.length > 0 ? `${this.position + 1} of ${this.matches.length}` : "No Results";
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
    if (commitHash === null || this.callbacks.isCdvOpen(commitHash, null)) return;
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

  private toggleClass(elem: HTMLElement, className: string, condition: boolean) {
    if (condition) {
      elem.classList.add(className);
    } else {
      elem.classList.remove(className);
    }
  }
}
