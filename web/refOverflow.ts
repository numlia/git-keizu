import { hideContextMenu } from "./contextMenu";
import { t } from "./i18n";

export const REF_BADGE_WIDTH_RATIO = 0.6;
export const DESCRIPTION_MIN_WIDTH = 64;
// Marks the counter, the list and the measuring area so text search skips their duplicated text.
export const REF_OVERFLOW_IGNORE_ATTRIBUTE = "data-ref-overflow-ignore";

const DESCRIPTION_WIDTH_RATIO = 1 - REF_BADGE_WIDTH_RATIO;

export interface RefMinimumWidthInput {
  readonly paddingWidth: number;
  readonly headWidth: number;
  readonly emWidth: number;
  readonly maxCounterWidth: number;
}

function isPositiveFinite(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}

function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function getPrefixSums(widths: readonly number[]): number[] {
  const sums = [0];
  for (let i = 0; i < widths.length; i++) {
    sums.push(sums[i] + widths[i]);
  }
  return sums;
}

export function selectVisibleRefCount(
  badgeWidths: readonly number[],
  budget: number,
  counterWidths: ReadonlyMap<number, number>
): number | null {
  const badgeCount = badgeWidths.length;
  if (badgeCount === 0) return 0;
  if (!isPositiveFinite(budget) || !badgeWidths.every(isPositiveFinite)) return null;

  const prefixSums = getPrefixSums(badgeWidths);
  if (prefixSums[badgeCount] <= budget) return badgeCount;

  const requiredCounterWidths: number[] = [];
  for (let hiddenCount = 1; hiddenCount <= badgeCount; hiddenCount++) {
    const counterWidth = counterWidths.get(hiddenCount);
    if (!isPositiveFinite(counterWidth)) return null;
    requiredCounterWidths[hiddenCount] = counterWidth;
  }

  // Keeping only a leading run preserves ref order; skipping a long badge to fit a later short one would not.
  for (let visibleCount = badgeCount - 1; visibleCount >= 0; visibleCount--) {
    const hiddenCount = badgeCount - visibleCount;
    if (prefixSums[visibleCount] + requiredCounterWidths[hiddenCount] <= budget) {
      return visibleCount;
    }
  }
  return null;
}

function isValidMinimumWidthInput(row: RefMinimumWidthInput): boolean {
  return (
    isNonNegativeFinite(row.paddingWidth) &&
    isNonNegativeFinite(row.headWidth) &&
    isPositiveFinite(row.emWidth) &&
    isPositiveFinite(row.maxCounterWidth)
  );
}

export function calculateMinimumDescriptionWidth(
  rows: readonly RefMinimumWidthInput[]
): number | null {
  let minimumWidth = DESCRIPTION_MIN_WIDTH;
  for (const row of rows) {
    if (!isValidMinimumWidthInput(row)) return null;
    const refAreaWidth = Math.max(
      row.maxCounterWidth / REF_BADGE_WIDTH_RATIO,
      row.emWidth / DESCRIPTION_WIDTH_RATIO
    );
    minimumWidth = Math.max(minimumWidth, row.paddingWidth + row.headWidth + refAreaWidth);
  }
  // Rounding only the final value keeps fractional sub-pixel widths from undershooting the 60/40 split.
  return Math.ceil(minimumWidth);
}

const CLASS_GIT_REF = "gitRef";
const CLASS_HIDDEN = "refOverflowHidden";
const CLASS_COUNTER = "refOverflowCounter";
const CLASS_MEASURE = "refOverflowMeasure";
const CLASS_HEAD_DOT = "commitHeadDot";
const CLASS_MESSAGE = "commitMessage";
const CLASS_POPUP = "refOverflowPopup";
const CLASS_CONTEXT_MENU_ACTIVE = "contextMenuActive";
const CLASS_SEARCH_MATCH = "refOverflowMatch";
// FindWidget's inline mark class; not imported because findWidget already depends on this module.
const CLASS_FIND_MATCH = "findMatch";
// Transient state classes do not describe the badge itself, so clones drop them.
const CLONE_EXCLUDED_CLASSES = [CLASS_HIDDEN, CLASS_CONTEXT_MENU_ACTIVE, "dialogActive"];
// Clicks inside these stay "inside": menus opened from the list must not dismiss it.
const POPUP_INSIDE_SELECTOR = `.${CLASS_COUNTER}, #contextMenu, ul.contextMenuSubmenu`;
const ATTR_COLOR = "data-color";
const DESCRIPTION_COLUMN_INDEX = 1;
const TABLE_CELL_TAG = "TD";
const HEADER_CELL_TAG = "TH";
const COUNTER_PREFIX = "+";
const MEASURE_FONT_PROPERTIES = [
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "font-stretch",
  "letter-spacing"
];
const OBSERVED_ROOT_ATTRIBUTES = ["style", "class"];
const OBSERVED_BODY_ATTRIBUTES = ["class"];
const FONT_LOADING_DONE_EVENT = "loadingdone";

export interface RefOverflowOptions {
  readonly onMinimumWidth: (minimum: number | null) => void;
  readonly onRefContextMenu: (event: MouseEvent, badge: HTMLElement) => void;
}

interface RefOverflowRow {
  readonly cell: HTMLTableCellElement;
  readonly refs: readonly HTMLElement[];
  readonly head: HTMLElement | null;
  readonly message: HTMLElement | null;
  readonly counter: HTMLButtonElement | null;
}

interface RefOverflowProbe {
  readonly badges: readonly HTMLElement[];
  readonly counters: readonly HTMLElement[];
}

interface RefOverflowMeasurement {
  readonly badgeWidths: readonly number[];
  readonly counterWidths: ReadonlyMap<number, number>;
  readonly minimumInput: RefMinimumWidthInput;
  readonly borderWidth: number;
}

function getHorizontalSum(style: CSSStyleDeclaration, left: string, right: string): number {
  return parseFloat(style.getPropertyValue(left)) + parseFloat(style.getPropertyValue(right));
}

// Outer width keeps fractional pixels: rounded offsetWidth values can flip the fit decision.
function getOuterWidth(elem: HTMLElement): number {
  const width = elem.getBoundingClientRect().width;
  // An unrendered box (e.g. inside a hidden webview) still reports its margin; that is not a width.
  if (!(width > 0)) return NaN;
  return width + parseFloat(getComputedStyle(elem).marginRight);
}

function getCounterText(hiddenCount: number): string {
  return `${COUNTER_PREFIX}${hiddenCount}`;
}

function createCounterElement(hiddenCount: number): HTMLButtonElement {
  const counter = document.createElement("button");
  counter.type = "button";
  counter.className = CLASS_COUNTER;
  counter.setAttribute(REF_OVERFLOW_IGNORE_ATTRIBUTE, "");
  updateCounterElement(counter, hiddenCount);
  return counter;
}

function updateCounterElement(counter: HTMLButtonElement, hiddenCount: number): void {
  const text = getCounterText(hiddenCount);
  const label = t("refs.showHidden", hiddenCount);
  if (counter.textContent !== text) counter.textContent = text;
  if (counter.title !== label) counter.title = label;
  if (counter.getAttribute("aria-label") !== label) counter.setAttribute("aria-label", label);
}

function collectRows(table: HTMLTableElement): RefOverflowRow[] {
  const rows: RefOverflowRow[] = [];
  for (let i = 0; i < table.rows.length; i++) {
    const cell = table.rows[i].cells[DESCRIPTION_COLUMN_INDEX];
    if (cell === undefined || cell.tagName !== TABLE_CELL_TAG) continue;
    const refs: HTMLElement[] = [];
    let head: HTMLElement | null = null;
    let message: HTMLElement | null = null;
    let counter: HTMLButtonElement | null = null;
    for (let j = 0; j < cell.children.length; j++) {
      const child = cell.children[j];
      if (!(child instanceof HTMLElement)) continue;
      if (child.classList.contains(CLASS_GIT_REF)) refs.push(child);
      else if (child.classList.contains(CLASS_HEAD_DOT)) head = child;
      else if (child.classList.contains(CLASS_MESSAGE)) message = child;
      else if (child instanceof HTMLButtonElement && child.classList.contains(CLASS_COUNTER)) {
        counter = child;
      }
    }
    if (refs.length > 0) rows.push({ cell, refs, head, message, counter });
  }
  return rows;
}

function cloneRef(ref: HTMLElement): HTMLElement {
  const clone = <HTMLElement>ref.cloneNode(true);
  clone.classList.remove(...CLONE_EXCLUDED_CLASSES);
  clone.removeAttribute("id");
  const descendantsWithId = clone.querySelectorAll("[id]");
  for (let i = 0; i < descendantsWithId.length; i++) {
    descendantsWithId[i].removeAttribute("id");
  }
  return clone;
}

// Clones live outside the row, so its colour variable and inherited font are copied explicitly.
function copyRowAppearance(elem: HTMLElement, cell: HTMLTableCellElement): void {
  const color = cell.parentElement?.getAttribute(ATTR_COLOR) ?? null;
  if (color !== null) elem.setAttribute(ATTR_COLOR, color);
  const cellStyle = getComputedStyle(cell);
  for (const property of MEASURE_FONT_PROPERTIES) {
    elem.style.setProperty(property, cellStyle.getPropertyValue(property));
  }
}

function createMeasureRow(row: RefOverflowRow): { elem: HTMLElement; probe: RefOverflowProbe } {
  const elem = document.createElement("div");
  copyRowAppearance(elem, row.cell);
  const badges = row.refs.map(cloneRef);
  const counters = row.refs.map((_ref, index) => createCounterElement(index + 1));
  elem.append(...badges, ...counters);
  return { elem, probe: { badges, counters } };
}

function readMeasurement(row: RefOverflowRow, probe: RefOverflowProbe): RefOverflowMeasurement {
  const cellStyle = getComputedStyle(row.cell);
  const counterWidths = new Map<number, number>();
  probe.counters.forEach((counter, index) => counterWidths.set(index + 1, getOuterWidth(counter)));
  return {
    badgeWidths: probe.badges.map(getOuterWidth),
    counterWidths,
    minimumInput: {
      paddingWidth: getHorizontalSum(cellStyle, "padding-left", "padding-right"),
      headWidth: row.head === null ? 0 : getOuterWidth(row.head),
      emWidth: row.message === null ? NaN : parseFloat(getComputedStyle(row.message).fontSize),
      maxCounterWidth: Math.max(...counterWidths.values())
    },
    borderWidth: getHorizontalSum(cellStyle, "border-left-width", "border-right-width")
  };
}

function measureRows(rows: readonly RefOverflowRow[]): RefOverflowMeasurement[] {
  const measureElem = document.createElement("div");
  measureElem.className = CLASS_MEASURE;
  measureElem.setAttribute("aria-hidden", "true");
  measureElem.setAttribute(REF_OVERFLOW_IGNORE_ATTRIBUTE, "");
  const probes = rows.map((row) => {
    const measureRow = createMeasureRow(row);
    measureElem.appendChild(measureRow.elem);
    return measureRow.probe;
  });
  document.body.appendChild(measureElem);
  try {
    return rows.map((row, index) => readMeasurement(row, probes[index]));
  } finally {
    measureElem.remove();
  }
}

function getAvailableWidth(row: RefOverflowRow, measurement: RefOverflowMeasurement): number {
  const { paddingWidth, headWidth } = measurement.minimumInput;
  return (
    row.cell.getBoundingClientRect().width - measurement.borderWidth - paddingWidth - headWidth
  );
}

function getDescriptionHeader(table: HTMLTableElement): HTMLTableCellElement | null {
  const header = table.rows[0]?.cells[DESCRIPTION_COLUMN_INDEX];
  return header !== undefined && header.tagName === HEADER_CELL_TAG ? header : null;
}

function getHiddenRefs(cell: HTMLElement): HTMLElement[] {
  const refs: HTMLElement[] = [];
  for (let i = 0; i < cell.children.length; i++) {
    const child = cell.children[i];
    if (
      child instanceof HTMLElement &&
      child.classList.contains(CLASS_GIT_REF) &&
      child.classList.contains(CLASS_HIDDEN)
    ) {
      refs.push(child);
    }
  }
  return refs;
}

// The counter keeps showing every hidden ref; the highlight only says one of them matched.
function syncCounterHighlight(counter: Element): void {
  const cell = counter.parentElement;
  const matched =
    cell !== null &&
    getHiddenRefs(cell).some((ref) => ref.querySelector(`.${CLASS_FIND_MATCH}`) !== null);
  if (counter.classList.contains(CLASS_SEARCH_MATCH) !== matched) {
    counter.classList.toggle(CLASS_SEARCH_MATCH, matched);
  }
}

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(value, max));
}

// Below the counter and left-aligned by default; flipped upward when the bottom would overflow,
// then clamped so every edge stays inside the viewport.
function positionPopup(popup: HTMLElement, counter: HTMLElement): void {
  const counterRect = counter.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();
  const top =
    counterRect.bottom + popupRect.height > window.innerHeight
      ? counterRect.top - popupRect.height
      : counterRect.bottom;
  popup.style.left = `${clamp(counterRect.left, window.innerWidth - popupRect.width)}px`;
  popup.style.top = `${clamp(top, window.innerHeight - popupRect.height)}px`;
}

export class RefOverflowController {
  private readonly options: RefOverflowOptions;
  private table: HTMLTableElement | null = null;
  private header: HTMLTableCellElement | null = null;
  private headerObserver: ResizeObserver | null = null;
  private lastHeaderWidth: number | null = null;
  private generation = 0;
  private frameId: number | null = null;
  private disposed = false;
  private popup: HTMLElement | null = null;
  private popupCounter: HTMLButtonElement | null = null;
  private readonly styleObserver: MutationObserver;
  private readonly fonts: FontFaceSet | undefined;
  private readonly handleLayoutTrigger = () => this.scheduleLayout();
  // Row selection, details and checkout listen for bubbling clicks; the counter and list stop them.
  private readonly stopPropagation = (event: Event) => event.stopPropagation();
  private readonly handleCounterClick = (event: MouseEvent) => this.toggleCounterPopup(event);
  private readonly handleDocumentClick = (event: MouseEvent) =>
    this.closePopupOnOutsideClick(event);

  constructor(options: RefOverflowOptions) {
    this.options = options;
    window.addEventListener("resize", this.handleLayoutTrigger);
    this.styleObserver = new MutationObserver(this.handleLayoutTrigger);
    this.styleObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: OBSERVED_ROOT_ATTRIBUTES
    });
    this.styleObserver.observe(document.body, {
      attributes: true,
      attributeFilter: OBSERVED_BODY_ATTRIBUTES
    });
    // jsdom and older hosts lack FontFaceSet; font-driven re-measurement is then skipped.
    this.fonts = document.fonts;
    if (this.fonts !== undefined) {
      this.fonts.addEventListener(FONT_LOADING_DONE_EVENT, this.handleLayoutTrigger);
      void this.scheduleLayoutWhenFontsReady(this.fonts);
    }
  }

  public attachTable(table: HTMLTableElement): void {
    this.releaseTable();
    this.table = table;
    this.header = getDescriptionHeader(table);
    if (this.header !== null && typeof ResizeObserver === "function") {
      this.headerObserver = new ResizeObserver(() => this.handleHeaderResize());
      this.headerObserver.observe(this.header);
    }
    this.scheduleLayout();
  }

  public detachTable(): void {
    const hadTable = this.table !== null;
    this.releaseTable();
    if (hadTable) this.options.onMinimumWidth(null);
  }

  public scheduleLayout(): void {
    if (this.disposed || this.table === null || this.frameId !== null) return;
    const generation = this.generation;
    this.frameId = window.requestAnimationFrame(() => {
      this.frameId = null;
      if (generation === this.generation) this.layout();
    });
  }

  public closePopup(): boolean {
    const popup = this.popup;
    if (popup === null) return false;
    this.hidePopupContextMenu();
    popup.remove();
    this.popup = null;
    this.popupCounter = null;
    document.removeEventListener("click", this.handleDocumentClick, true);
    return true;
  }

  // Reads only the current marks and never schedules a layout, so a search refresh keeps the list.
  public syncSearchHighlights(): void {
    if (this.table !== null) {
      const counters = this.table.querySelectorAll(`button.${CLASS_COUNTER}`);
      for (let i = 0; i < counters.length; i++) syncCounterHighlight(counters[i]);
    }
    if (this.popup !== null && !this.renderPopupItems()) this.closePopup();
  }

  public dispose(): void {
    this.detachTable();
    this.disposed = true;
    window.removeEventListener("resize", this.handleLayoutTrigger);
    this.styleObserver.disconnect();
    this.fonts?.removeEventListener(FONT_LOADING_DONE_EVENT, this.handleLayoutTrigger);
  }

  private releaseTable(): void {
    this.closePopup();
    this.generation++;
    if (this.frameId !== null) {
      window.cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    this.headerObserver?.disconnect();
    this.headerObserver = null;
    this.table = null;
    this.header = null;
    this.lastHeaderWidth = null;
  }

  private async scheduleLayoutWhenFontsReady(fonts: FontFaceSet): Promise<void> {
    await fonts.ready;
    this.scheduleLayout();
  }

  private handleHeaderResize(): void {
    if (this.header === null) return;
    // Our own writes keep the column width unchanged; only a real size change needs another pass.
    if (this.header.getBoundingClientRect().width === this.lastHeaderWidth) return;
    this.closePopup();
    this.scheduleLayout();
  }

  private isCurrent(table: HTMLTableElement, generation: number): boolean {
    return this.table === table && generation === this.generation && table.isConnected;
  }

  private layout(): void {
    const table = this.table;
    const generation = this.generation;
    if (table === null || !table.isConnected) return;

    const rows = collectRows(table);
    if (rows.length === 0) {
      this.recordHeaderWidth();
      this.options.onMinimumWidth(null);
      return;
    }

    const measurements = measureRows(rows);
    const minimum = calculateMinimumDescriptionWidth(measurements.map((m) => m.minimumInput));
    if (minimum !== null) {
      this.options.onMinimumWidth(minimum);
      if (!this.isCurrent(table, generation)) return;
    }

    const visibleCounts = rows.map((row, index) => {
      const measurement = measurements[index];
      const budget = getAvailableWidth(row, measurement) * REF_BADGE_WIDTH_RATIO;
      return selectVisibleRefCount(measurement.badgeWidths, budget, measurement.counterWidths);
    });
    if (this.isPopupStale(rows, visibleCounts)) this.closePopup();
    this.recordHeaderWidth();

    let foldingChanged = false;
    rows.forEach((row, index) => {
      const visibleCount = visibleCounts[index];
      // null means the row could not be measured; keep whatever it currently shows.
      if (visibleCount !== null && this.applyVisibleCount(row, visibleCount)) {
        foldingChanged = true;
      }
    });
    // Refs moving in or out of the hidden set change which matches the counters stand for.
    if (foldingChanged) this.syncSearchHighlights();
  }

  // The list mirrors one row's hidden refs, so it closes once the column is really re-laid out or
  // that row's folding changes; a pass that reproduces the same widths and counts keeps it open.
  private isPopupStale(
    rows: readonly RefOverflowRow[],
    visibleCounts: readonly (number | null)[]
  ): boolean {
    if (this.popup === null) return false;
    const headerWidth = this.header === null ? null : this.header.getBoundingClientRect().width;
    if (headerWidth !== this.lastHeaderWidth) return true;
    const index = rows.findIndex((row) => row.counter === this.popupCounter);
    if (index < 0) return true;
    const visibleCount = visibleCounts[index];
    const shownCount = rows[index].refs.filter((ref) => !ref.classList.contains(CLASS_HIDDEN));
    return visibleCount !== null && visibleCount !== shownCount.length;
  }

  private recordHeaderWidth(): void {
    this.lastHeaderWidth = this.header === null ? null : this.header.getBoundingClientRect().width;
  }

  // Returns whether the row's folding (hidden refs or counter placement) was rewritten.
  private applyVisibleCount(row: RefOverflowRow, visibleCount: number): boolean {
    let changed = false;
    row.refs.forEach((ref, index) => {
      const hidden = index >= visibleCount;
      if (ref.classList.contains(CLASS_HIDDEN) !== hidden) {
        ref.classList.toggle(CLASS_HIDDEN, hidden);
        changed = true;
      }
    });

    const hiddenCount = row.refs.length - visibleCount;
    if (hiddenCount === 0) {
      if (row.counter === null) return changed;
      row.counter.remove();
      return true;
    }
    const counter = row.counter ?? this.createCounter(hiddenCount);
    updateCounterElement(counter, hiddenCount);
    const firstHiddenRef = row.refs[visibleCount];
    if (counter.nextSibling !== firstHiddenRef) {
      row.cell.insertBefore(counter, firstHiddenRef);
      changed = true;
    }
    return changed;
  }

  private createCounter(hiddenCount: number): HTMLButtonElement {
    const counter = createCounterElement(hiddenCount);
    counter.addEventListener("click", this.handleCounterClick);
    counter.addEventListener("dblclick", this.stopPropagation);
    return counter;
  }

  private toggleCounterPopup(event: MouseEvent): void {
    event.stopPropagation();
    const counter = event.currentTarget;
    if (!(counter instanceof HTMLButtonElement)) return;
    const isSameCounter = counter === this.popupCounter;
    this.closePopup();
    if (!isSameCounter) this.openPopup(counter);
  }

  private openPopup(counter: HTMLButtonElement): void {
    const cell = counter.parentElement;
    if (!(cell instanceof HTMLTableCellElement) || this.table === null) return;
    if (!this.table.contains(cell)) return;
    const popup = document.createElement("div");
    popup.className = CLASS_POPUP;
    popup.setAttribute(REF_OVERFLOW_IGNORE_ATTRIBUTE, "");
    copyRowAppearance(popup, cell);
    popup.addEventListener("click", this.stopPropagation);
    popup.addEventListener("dblclick", this.stopPropagation);
    this.popup = popup;
    this.popupCounter = counter;
    // The same sync as a search refresh fills the list, so it opens with the current marks.
    this.syncSearchHighlights();
    if (this.popup !== popup) return;
    document.body.appendChild(popup);
    positionPopup(popup, counter);
    document.addEventListener("click", this.handleDocumentClick, true);
  }

  // Rebuilt from the row's current hidden refs, so names and search marks always match it.
  private renderPopupItems(): boolean {
    const popup = this.popup;
    const cell = this.popupCounter?.parentElement ?? null;
    if (popup === null || cell === null) return false;
    const clones = getHiddenRefs(cell).map(cloneRef);
    if (clones.length === 0) return false;
    this.hidePopupContextMenu();
    for (const clone of clones) {
      clone.addEventListener("contextmenu", (event) => this.options.onRefContextMenu(event, clone));
    }
    popup.replaceChildren(...clones);
    return true;
  }

  // Only a menu opened from the list belongs to it; menus opened elsewhere are left alone.
  private hidePopupContextMenu(): void {
    const popup = this.popup;
    if (popup !== null && popup.querySelector(`.${CLASS_CONTEXT_MENU_ACTIVE}`) !== null) {
      hideContextMenu();
    }
  }

  // Capture phase sees the original target even if a menu item's own handler later removes it.
  private closePopupOnOutsideClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Node) || this.popup === null) return;
    if (this.popup.contains(target)) return;
    const elem = target instanceof Element ? target : target.parentElement;
    if (elem !== null && elem.closest(POPUP_INSIDE_SELECTOR) !== null) return;
    this.closePopup();
  }
}
