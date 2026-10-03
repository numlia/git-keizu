import type { GitCommitNode } from "../src/types";
import { t } from "./i18n";
import {
  type BranchPathMode,
  type CommitPathMode,
  computePathHighlight,
  type PathBoundary,
  PathHighlightMode,
  type PathHighlightResult,
  type PathHighlightSelection
} from "./pathHighlight";
import { abbrevCommit, insertAfter } from "./utils";

/* === Constants === */

export const PATH_HIGHLIGHT_BAR_ID = "pathHighlightBar";

const NAME_ELEMENT_ID = "pathHighlightName";
const KIND_ELEMENT_ID = "pathHighlightKind";
const HASH_ELEMENT_ID = "pathHighlightHash";
const MODE_SELECT_ID = "pathHighlightMode";
const SCOPE_ELEMENT_ID = "pathHighlightScope";
const STATUS_ELEMENT_ID = "pathHighlightStatus";
const CLEAR_BUTTON_ID = "pathHighlightClear";
const BOUNDARIES_ELEMENT_ID = "pathHighlightBoundaries";
const CONTROLS_ELEMENT_ID = "controls";
const CLASS_ACTIVE = "active";
const CLASS_ROUNDED_BTN = "roundedBtn";
const CLASS_BOUNDARY_HASH = "pathHighlightBoundaryHash";
const BOUNDARY_SEPARATOR = " → ";

/** Menu and select order for a commit target. */
const COMMIT_MODES: readonly CommitPathMode[] = [
  PathHighlightMode.Direct,
  PathHighlightMode.AncestorsAndDescendants,
  PathHighlightMode.FirstParent
];

/** Menu and select order for a branch target. */
const BRANCH_MODES: readonly BranchPathMode[] = [
  PathHighlightMode.AllAncestors,
  PathHighlightMode.FirstParent
];

/* === Types === */

export interface PathHighlightCallbacks {
  getCommits(): readonly GitCommitNode[];
  getCurrentRepo(): string | undefined;
  setGraphHighlight(highlight: PathHighlightResult | null): void;
}

/* === Helpers === */

function allowedModes(selection: PathHighlightSelection): readonly PathHighlightMode[] {
  return selection.kind === "commit" ? COMMIT_MODES : BRANCH_MODES;
}

/** Returns a new selection with the mode from the DOM, or null when the value is not allowed. */
function replaceMode(
  selection: PathHighlightSelection,
  value: string
): PathHighlightSelection | null {
  if (selection.kind === "commit") {
    const mode = COMMIT_MODES.find((candidate) => candidate === value);
    return mode === undefined ? null : { ...selection, mode };
  }
  const mode = BRANCH_MODES.find((candidate) => candidate === value);
  return mode === undefined ? null : { ...selection, mode };
}

function createSpan(id: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.id = id;
  return span;
}

function createHashSpan(hash: string, className: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = abbrevCommit(hash);
  span.title = hash;
  return span;
}

function createBoundaryItem(boundary: PathBoundary): HTMLLIElement {
  const item = document.createElement("li");
  item.append(
    createHashSpan(boundary.childHash, CLASS_BOUNDARY_HASH),
    document.createTextNode(BOUNDARY_SEPARATOR),
    createHashSpan(boundary.parentHash, CLASS_BOUNDARY_HASH)
  );
  return item;
}

/** Shows the text, or hides the element so an empty item does not take flex gap space. */
function setOptionalText(elem: HTMLElement, text: string): void {
  elem.textContent = text;
  elem.hidden = text === "";
}

/* === Controller === */

export class PathHighlightController {
  private readonly callbacks: PathHighlightCallbacks;
  private readonly barElem: HTMLDivElement;
  private readonly nameElem: HTMLSpanElement;
  private readonly kindElem: HTMLSpanElement;
  private readonly hashElem: HTMLSpanElement;
  private readonly modeSelect: HTMLSelectElement;
  private readonly statusElem: HTMLSpanElement;
  private readonly boundariesElem: HTMLDetailsElement;
  private readonly boundaryList: HTMLUListElement;
  private selection: PathHighlightSelection | null = null;

  constructor(callbacks: PathHighlightCallbacks) {
    this.callbacks = callbacks;
    this.barElem = document.createElement("div");
    this.barElem.id = PATH_HIGHLIGHT_BAR_ID;
    this.nameElem = createSpan(NAME_ELEMENT_ID);
    this.kindElem = createSpan(KIND_ELEMENT_ID);
    this.hashElem = createSpan(HASH_ELEMENT_ID);
    const modeLabel = document.createElement("label");
    modeLabel.htmlFor = MODE_SELECT_ID;
    modeLabel.textContent = t("pathHighlight.mode");
    this.modeSelect = document.createElement("select");
    this.modeSelect.id = MODE_SELECT_ID;
    this.modeSelect.addEventListener("change", () => this.onModeChange());
    const scopeElem = createSpan(SCOPE_ELEMENT_ID);
    scopeElem.textContent = t("pathHighlight.loadedOnly");
    this.statusElem = createSpan(STATUS_ELEMENT_ID);
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.id = CLEAR_BUTTON_ID;
    clearBtn.className = CLASS_ROUNDED_BTN;
    clearBtn.textContent = t("pathHighlight.clear");
    clearBtn.addEventListener("click", () => this.clear());
    this.boundariesElem = document.createElement("details");
    this.boundariesElem.id = BOUNDARIES_ELEMENT_ID;
    const summary = document.createElement("summary");
    summary.textContent = t("pathHighlight.outside");
    this.boundaryList = document.createElement("ul");
    this.boundariesElem.append(summary, this.boundaryList);
    this.barElem.append(
      this.nameElem,
      this.kindElem,
      this.hashElem,
      modeLabel,
      this.modeSelect,
      scopeElem,
      this.statusElem,
      clearBtn
    );
    this.renderEmpty();
    insertAfter(this.barElem, document.getElementById(CONTROLS_ELEMENT_ID)!);
  }

  /* === Public API === */

  public select(selection: PathHighlightSelection): void {
    if (selection.repo !== this.callbacks.getCurrentRepo()) return;
    this.selection = selection;
    this.render();
  }

  public onCommitsChanged(): void {
    if (this.selection === null) return;
    this.render();
  }

  public onRepositoryChanged(): void {
    this.clear();
  }

  public clear(): void {
    if (this.selection === null) return;
    this.selection = null;
    this.renderEmpty();
    this.callbacks.setGraphHighlight(null);
  }

  /* === State transitions === */

  private onModeChange(): void {
    const selection = this.selection;
    if (selection === null) return;
    const next = replaceMode(selection, this.modeSelect.value);
    if (next === null) {
      this.modeSelect.value = selection.mode;
      return;
    }
    this.selection = next;
    this.render();
  }

  /* === Rendering === */

  private render(): void {
    const selection = this.selection;
    if (selection === null) return;
    const result = computePathHighlight(
      this.callbacks.getCommits(),
      selection.hash,
      selection.mode
    );
    this.nameElem.textContent = selection.name;
    setOptionalText(
      this.kindElem,
      selection.kind === "branch" ? t("pathHighlight.branchAtSelection") : ""
    );
    this.hashElem.textContent = abbrevCommit(selection.hash);
    this.hashElem.title = selection.hash;
    this.renderModeOptions(allowedModes(selection));
    this.modeSelect.value = selection.mode;
    setOptionalText(this.statusElem, result.targetFound ? "" : t("pathHighlight.targetOutside"));
    this.renderBoundaries(result.boundaries);
    this.barElem.classList.add(CLASS_ACTIVE);
    this.callbacks.setGraphHighlight(result.targetFound ? result : null);
  }

  private renderEmpty(): void {
    this.barElem.classList.remove(CLASS_ACTIVE);
    this.nameElem.textContent = "";
    setOptionalText(this.kindElem, "");
    this.hashElem.textContent = "";
    this.hashElem.removeAttribute("title");
    this.renderModeOptions([]);
    setOptionalText(this.statusElem, "");
    this.renderBoundaries([]);
  }

  /** Rebuilds the options only when the allowed set changes, so the focused select is kept as is. */
  private renderModeOptions(modes: readonly PathHighlightMode[]): void {
    const current = Array.from(this.modeSelect.options, (option) => option.value);
    if (
      current.length === modes.length &&
      current.every((value, index) => value === modes[index])
    ) {
      return;
    }
    this.modeSelect.replaceChildren(
      ...modes.map((mode) => {
        const option = document.createElement("option");
        option.value = mode;
        option.textContent = t(mode);
        return option;
      })
    );
  }

  private renderBoundaries(boundaries: readonly PathBoundary[]): void {
    if (boundaries.length === 0) {
      this.boundariesElem.remove();
      this.boundaryList.replaceChildren();
      return;
    }
    this.boundaryList.replaceChildren(...boundaries.map(createBoundaryItem));
    if (this.boundariesElem.parentNode === null) {
      this.barElem.append(this.boundariesElem);
    }
  }
}
