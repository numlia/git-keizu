// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* ------------------------------------------------------------------ */
/* Mock: contextMenu (only the hide call made for list-origin menus)  */
/* ------------------------------------------------------------------ */

vi.mock("../../web/contextMenu", () => ({
  hideContextMenu: vi.fn()
}));

import { hideContextMenu } from "../../web/contextMenu";
import {
  calculateMinimumDescriptionWidth,
  type RefMinimumWidthInput,
  RefOverflowController,
  selectVisibleRefCount
} from "../../web/refOverflow";
import { escapeHtml, svgIcons, vscode } from "../../web/utils";

/* ------------------------------------------------------------------ */
/* Fixtures                                                           */
/* ------------------------------------------------------------------ */

const ENGLISH_MESSAGES = JSON.parse(
  readFileSync(resolve(process.cwd(), "l10n/web/web.l10n.en.json"), "utf-8")
) as Record<string, string>;

// Right margin shared by refs, counters and the HEAD dot in the injected CSS fixture below.
const BADGE_MARGIN = 5;
// Width reported for the original (possibly hidden) refs: it must never reach the fit decision.
const ORIGINAL_REF_WIDTH = 9999;
// Width reported for a combined remote label inside a measuring clone; it must not be added.
const COMBINED_REMOTE_WIDTH = 500;
// CSS fixture: jsdom resolves these declarations through getComputedStyle.
const FIXTURE_CSS = [
  "td, th { padding-left: 4px; padding-right: 4px; border-left-width: 0px; border-right-width: 0px; }",
  ".gitRef, .refOverflowCounter, .commitHeadDot { margin-right: 5px; }",
  ".commitMessage { font-size: 13px; }"
].join("\n");

// AC-01 (plan §3.6): the combined `main | origin` badge and five long worktree branches.
const AC01_WIDTHS: Readonly<Record<string, number>> = {
  main: 96.4,
  "wt-1": 232.8,
  "wt-2": 284.1,
  "wt-3": 232.8,
  "wt-4": 284.1,
  "wt-5": 232.8
};
const AC01_COUNTER = 30.7;
// Border-box width of the description cell that yields W = 700 (padding 4 + 4, HEAD outer 15).
const AC01_CELL_WIDTH = 723;

interface LayoutFixture {
  cellWidth: number;
  headerWidth: number | null;
  headBoxWidth: number;
  badgeOuter: Record<string, number>;
  counterOuter: (text: string) => number;
  zero: boolean;
  counterRect: { left: number; top: number; bottom: number };
  popupSize: { width: number; height: number };
}

let fixture: LayoutFixture;
const measuredCounterTexts: string[] = [];
let measureRoots: Element[] = [];

function makeRect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({})
  } as DOMRect;
}

function badgeKey(elem: HTMLElement): string {
  return elem.dataset.name ?? elem.dataset.worktreePath ?? elem.textContent ?? "";
}

function fixtureWidth(elem: HTMLElement): number {
  if (fixture.zero) return 0;
  const measureRoot = elem.closest(".refOverflowMeasure");
  const inMeasure = measureRoot !== null;
  if (measureRoot !== null && !measureRoots.includes(measureRoot)) measureRoots.push(measureRoot);
  if (elem instanceof HTMLTableCellElement && elem.cellIndex === 1) {
    return elem.tagName === "TH" ? (fixture.headerWidth ?? fixture.cellWidth) : fixture.cellWidth;
  }
  if (elem.classList.contains("commitHeadDot")) return fixture.headBoxWidth;
  if (elem.classList.contains("gitRefHeadRemote")) return COMBINED_REMOTE_WIDTH;
  if (elem.classList.contains("gitRef")) {
    if (!inMeasure) return ORIGINAL_REF_WIDTH;
    const outer = fixture.badgeOuter[badgeKey(elem)];
    if (outer === undefined) throw new Error(`no fixture width for ${badgeKey(elem)}`);
    return outer - BADGE_MARGIN;
  }
  if (elem.classList.contains("refOverflowCounter") && inMeasure) {
    measuredCounterTexts.push(elem.textContent ?? "");
    return fixture.counterOuter(elem.textContent ?? "") - BADGE_MARGIN;
  }
  return 0;
}

function fixtureRect(this: Element): DOMRect {
  if (!(this instanceof HTMLElement)) return makeRect(0, 0, 0, 0);
  if (
    this.classList.contains("refOverflowCounter") &&
    this.closest(".refOverflowMeasure") === null
  ) {
    const { left, top, bottom } = fixture.counterRect;
    return makeRect(left, top, 30, bottom - top);
  }
  if (this.classList.contains("refOverflowPopup")) {
    return makeRect(0, 0, fixture.popupSize.width, fixture.popupSize.height);
  }
  return makeRect(0, 0, fixtureWidth(this), 18);
}

/* --- requestAnimationFrame / ResizeObserver / document.fonts ------- */

const frames = {
  queue: new Map<number, FrameRequestCallback>(),
  nextId: 1,
  requested: 0,
  cancelled: [] as number[]
};

function flushFrames(): void {
  const pending = [...frames.queue.values()];
  frames.queue.clear();
  for (const callback of pending) callback(0);
}

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  readonly observed: Element[] = [];
  disconnected = false;
  private readonly callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    FakeResizeObserver.instances.push(this);
  }
  observe(target: Element): void {
    this.observed.push(target);
  }
  unobserve(): void {}
  disconnect(): void {
    this.disconnected = true;
  }
  notify(): void {
    this.callback([], this as unknown as ResizeObserver);
  }
}

function latestObserver(): FakeResizeObserver {
  const observer = FakeResizeObserver.instances.at(-1);
  if (observer === undefined) throw new Error("no ResizeObserver was created");
  return observer;
}

const savedGlobals = new Map<string, PropertyDescriptor | undefined>();
function stubProperty(target: object, key: string, value: unknown): void {
  if (!savedGlobals.has(key)) {
    savedGlobals.set(key, Object.getOwnPropertyDescriptor(target, key));
  }
  Object.defineProperty(target, key, { configurable: true, writable: true, value });
}
function restoreProperties(): void {
  for (const [key, descriptor] of savedGlobals) {
    if (descriptor === undefined) {
      delete (globalThis as Record<string, unknown>)[key];
    } else {
      Object.defineProperty(globalThis, key, descriptor);
    }
  }
  savedGlobals.clear();
}

/* --- Markup builders (mirroring web/main.ts renderTable) ----------- */

function headRef(
  name: string,
  options: { active?: boolean; worktreePath?: string; remotes?: string[] } = {}
): string {
  const escaped = escapeHtml(name);
  const classes = `gitRef head${options.active === true ? " active" : ""}${
    options.worktreePath !== undefined ? " worktree" : ""
  }`;
  const remotes = options.remotes ?? [];
  const remotesAttr = remotes.length > 0 ? ` data-remotes="${remotes.join(",")}"` : "";
  const worktreeAttr =
    options.worktreePath !== undefined
      ? ` data-worktree-path="${escapeHtml(options.worktreePath)}" title="Worktree: ${escapeHtml(options.worktreePath)}"`
      : "";
  const icon = options.worktreePath !== undefined ? svgIcons.worktree : svgIcons.branch;
  const remoteHtml = remotes
    .map(
      (remote) =>
        `<span class="gitRefHeadRemote" data-remote="${remote}" data-name="${remote}/${escaped}">${remote}</span>`
    )
    .join("");
  return `<span class="${classes}" data-name="${escaped}"${remotesAttr}${worktreeAttr}>${icon}<span class="gitRefName">${escaped}</span>${remoteHtml}</span>`;
}

function remoteRef(name: string): string {
  return `<span class="gitRef remote" data-name="${escapeHtml(name)}">${svgIcons.branch}${escapeHtml(name)}</span>`;
}

function tagRef(name: string): string {
  return `<span class="gitRef tag" data-name="${escapeHtml(name)}">${svgIcons.tag}${escapeHtml(name)}</span>`;
}

function stashRef(display: string): string {
  return `<span class="gitRef stash">${svgIcons.stash}${escapeHtml(display)}</span>`;
}

function detachedRef(path: string, label: string): string {
  return `<span class="gitRef worktree detachedWorktree" data-worktree-path="${escapeHtml(path)}" title="Worktree: ${escapeHtml(path)}">${svgIcons.worktree}${escapeHtml(label)}</span>`;
}

function ac01Refs(): string {
  return [
    headRef("main", { active: true, remotes: ["origin"] }),
    ...[1, 2, 3, 4, 5].map((i) => headRef(`wt-${i}`, { worktreePath: `/wt/${i}` }))
  ].join("");
}

interface RowSpec {
  readonly refs: string;
  readonly head?: boolean;
  readonly color?: number;
  readonly message?: string;
}

function buildTable(rows: readonly RowSpec[]): HTMLTableElement {
  const container = document.createElement("div");
  const header =
    '<tr id="tableColHeaders"><th>Graph</th><th>Description</th><th>Date</th><th>Author</th><th>Commit</th></tr>';
  const body = rows
    .map(
      (row, index) =>
        `<tr class="commit" data-id="${index}" data-color="${row.color ?? 0}"><td></td><td>${
          row.head === true ? '<span class="commitHeadDot"></span>' : ""
        }${row.refs}<span class="commitMessage">${row.message ?? "message"}</span></td><td>date</td><td>author</td><td>hash</td></tr>`
    )
    .join("");
  container.innerHTML = `<table>${header}${body}</table>`;
  document.body.appendChild(container);
  return container.querySelector("table")!;
}

/* --- Controller lifecycle and observations ------------------------ */

const controllers: RefOverflowController[] = [];

function createController(): {
  controller: RefOverflowController;
  onMinimumWidth: ReturnType<typeof vi.fn>;
  onRefContextMenu: ReturnType<typeof vi.fn>;
} {
  const onMinimumWidth = vi.fn();
  const onRefContextMenu = vi.fn();
  const controller = new RefOverflowController({ onMinimumWidth, onRefContextMenu });
  controllers.push(controller);
  return { controller, onMinimumWidth, onRefContextMenu };
}

function setupTable(rows: readonly RowSpec[]) {
  const created = createController();
  const table = buildTable(rows);
  created.controller.attachTable(table);
  flushFrames();
  return { ...created, table };
}

function descriptionCell(table: HTMLTableElement, rowIndex = 0): HTMLTableCellElement {
  return table.rows[rowIndex + 1].cells[1];
}

function directRefs(cell: HTMLElement): HTMLElement[] {
  return Array.from(cell.querySelectorAll<HTMLElement>(":scope > .gitRef"));
}

function visibleNames(cell: HTMLElement): string[] {
  return directRefs(cell)
    .filter((ref) => !ref.classList.contains("refOverflowHidden"))
    .map(badgeKey);
}

function hiddenNames(cell: HTMLElement): string[] {
  return directRefs(cell)
    .filter((ref) => ref.classList.contains("refOverflowHidden"))
    .map(badgeKey);
}

function counters(cell: HTMLElement): HTMLButtonElement[] {
  return Array.from(cell.querySelectorAll<HTMLButtonElement>(":scope > button.refOverflowCounter"));
}

function popups(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(".refOverflowPopup"));
}

function click(target: Element, type = "click"): void {
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolveTask) => setTimeout(resolveTask, 0));
}

// Available width W → description cell border-box width with the default padding (8) and HEAD (15).
function cellWidthFor(availableWidth: number): number {
  return availableWidth + 8 + 15;
}

let styleElem: HTMLStyleElement;

beforeEach(() => {
  document.body.innerHTML = "";
  styleElem = document.createElement("style");
  styleElem.textContent = FIXTURE_CSS;
  document.head.appendChild(styleElem);
  fixture = {
    cellWidth: AC01_CELL_WIDTH,
    headerWidth: null,
    headBoxWidth: 10,
    badgeOuter: { ...AC01_WIDTHS },
    counterOuter: () => AC01_COUNTER,
    zero: false,
    counterRect: { left: 100, top: 200, bottom: 220 },
    popupSize: { width: 200, height: 150 }
  };
  measuredCounterTexts.length = 0;
  measureRoots = [];
  frames.queue.clear();
  frames.nextId = 1;
  frames.requested = 0;
  frames.cancelled = [];
  FakeResizeObserver.instances = [];
  globalThis.webviewMessages = ENGLISH_MESSAGES;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(fixtureRect);
  stubProperty(globalThis, "requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = frames.nextId++;
    frames.queue.set(id, callback);
    frames.requested++;
    return id;
  });
  stubProperty(globalThis, "cancelAnimationFrame", (id: number) => {
    frames.queue.delete(id);
    frames.cancelled.push(id);
  });
  stubProperty(globalThis, "ResizeObserver", FakeResizeObserver);
  stubProperty(globalThis, "innerWidth", 800);
  stubProperty(globalThis, "innerHeight", 600);
  vi.mocked(hideContextMenu).mockReset();
  vi.mocked(vscode.postMessage).mockClear();
});

afterEach(() => {
  for (const controller of controllers.splice(0)) controller.dispose();
  restoreProperties();
  delete (document as unknown as Record<string, unknown>).fonts;
  vi.restoreAllMocks();
  styleElem.remove();
  document.documentElement.removeAttribute("style");
  document.documentElement.className = "";
  document.body.className = "";
  document.body.innerHTML = "";
});

/* ------------------------------------------------------------------ */
/* S1: selectVisibleRefCount()                                        */
/* ------------------------------------------------------------------ */

function uniformCounters(count: number, width: number): Map<number, number> {
  return new Map(Array.from({ length: count }, (_value, index) => [index + 1, width]));
}

// Counter widths by hidden count: 1-9 → 20, 10-99 → 30, 100+ → 40 (plan §3.6 rows 5-6).
function digitCounters(count: number): Map<number, number> {
  return new Map(
    Array.from({ length: count }, (_value, index) => {
      const hidden = index + 1;
      return [hidden, hidden < 10 ? 20 : hidden < 100 ? 30 : 40];
    })
  );
}

// @see docs/testing/perspectives/web/refOverflow-test.md
describe("selectVisibleRefCount", () => {
  it.each([
    { caseId: "TC-001", widths: [20, 30], budget: 50, expected: 2 },
    { caseId: "TC-002", widths: [20, 30], budget: 40, expected: 1 },
    { caseId: "TC-003", widths: [80, 5, 5], budget: 40, expected: 0 },
    { caseId: "TC-004", widths: [20.25, 30.5], budget: 35.1, expected: 0 }
  ])("returns $expected for $widths within budget $budget and counter 15 ($caseId)", (entry) => {
    // Case: TC-001 / TC-002 / TC-003 / TC-004 (plan §3.6 rows 1-4)
    // Given: badge outer widths and a single counter width of 15 for every hidden count
    const counterWidths = uniformCounters(entry.widths.length, 15);

    // When: the visible count is selected
    const result = selectVisibleRefCount(entry.widths, entry.budget, counterWidths);

    // Then: the leading count from the plan is returned (0 is a valid fold, not null)
    expect(result).toBe(entry.expected);
  });

  it.each([
    { caseId: "TC-005", budget: 35, expected: 0 },
    { caseId: "TC-006", budget: 40, expected: 2 }
  ])("selects the counter width by hidden-count digits at budget $budget ($caseId)", (entry) => {
    // Case: TC-005 / TC-006 (plan §3.6 rows 5-6)
    // Given: eleven 10px badges; counters 1-9 are 20px and 10-11 are 30px
    const widths = Array.from({ length: 11 }, () => 10);

    // When: the visible count is selected
    const result = selectVisibleRefCount(widths, entry.budget, digitCounters(11));

    // Then: +11 (0 visible) at 35 and two badges with +9 at 40
    expect(result).toBe(entry.expected);
  });

  it("returns null when not even the counter fits (TC-007)", () => {
    // Case: TC-007 (plan §3.6 row 7)
    // Given: one 100px badge, budget 10 and a 20px counter
    // When: the visible count is selected
    const result = selectVisibleRefCount([100], 10, new Map([[1, 20]]));

    // Then: the state is unmeasurable, distinct from a valid 0
    expect(result).toBeNull();
  });

  it("keeps the first two AC-01 badges within B = 420 (TC-008)", () => {
    // Case: TC-008 (AC-01)
    // Given: the AC-01 badge widths, budget 60% of W = 700 and a 30.7px counter
    const widths = [96.4, 232.8, 284.1, 232.8, 284.1, 232.8];

    // When: the visible count is selected
    const result = selectVisibleRefCount(widths, 420, uniformCounters(6, 30.7));

    // Then: the first two stay visible and +4 is shown
    expect(result).toBe(2);
  });

  it("returns 0 for an empty badge list (TC-009)", () => {
    // Case: TC-009
    // Given/When: no badges and no counter widths
    const result = selectVisibleRefCount([], 50, new Map());

    // Then: 0 is returned (not null)
    expect(result).toBe(0);
  });

  it("does not need counter widths when every badge fits (TC-010)", () => {
    // Case: TC-010
    // Given: badges fitting the budget and an empty counter map
    // When: the visible count is selected
    const result = selectVisibleRefCount([20, 30], 50, new Map());

    // Then: every badge is shown
    expect(result).toBe(2);
  });

  it.each([
    { caseId: "TC-011", widths: [20, 0] },
    { caseId: "TC-012", widths: [20, -5] },
    { caseId: "TC-013", widths: [20, Number.NaN] },
    { caseId: "TC-013", widths: [20, Number.POSITIVE_INFINITY] }
  ])("returns null for badge widths $widths ($caseId)", (entry) => {
    // Case: TC-011 / TC-012 / TC-013
    // Given: a zero, negative or non-finite badge width
    // When: the visible count is selected
    const result = selectVisibleRefCount(entry.widths, 50, uniformCounters(2, 15));

    // Then: the row is unmeasurable
    expect(result).toBeNull();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "returns null for budget %s (TC-014)",
    (budget) => {
      // Case: TC-014
      // Given: an invalid budget for a non-empty badge list
      // When: the visible count is selected
      const result = selectVisibleRefCount([20, 30], budget, uniformCounters(2, 15));

      // Then: the row is unmeasurable
      expect(result).toBeNull();
    }
  );

  it("returns null when the counter width for one hidden badge is missing (TC-015)", () => {
    // Case: TC-015
    // Given: the badges overflow and only the counter for two hidden badges is known
    // When: the visible count is selected
    const result = selectVisibleRefCount([20, 30], 40, new Map([[2, 15]]));

    // Then: the missing width makes the row unmeasurable
    expect(result).toBeNull();
  });

  it("validates every counter width even if a later count would fit (TC-016)", () => {
    // Case: TC-016
    // Given: only the counter for one hidden badge is known although two may be hidden
    // When: the visible count is selected
    const result = selectVisibleRefCount([20, 30], 40, new Map([[1, 15]]));

    // Then: null instead of 1
    expect(result).toBeNull();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "returns null when the counter width for two hidden badges is %s (TC-017)",
    (width) => {
      // Case: TC-017
      // Given: a valid counter for one hidden badge and an invalid one for two
      const counterWidths = new Map([
        [1, 15],
        [2, width]
      ]);

      // When: the visible count is selected
      const result = selectVisibleRefCount([20, 30], 40, counterWidths);

      // Then: the row is unmeasurable
      expect(result).toBeNull();
    }
  );

  it.each([
    { caseId: "TC-018", budget: 45, expected: 0 },
    { caseId: "TC-019", budget: 35, expected: null }
  ])("handles the 99 → 100 counter digit change at budget $budget ($caseId)", (entry) => {
    // Case: TC-018 / TC-019 (auxiliary fixture computed by hand from §3.4)
    // Given: a 50px badge followed by ninety-nine 1px badges; counter 100 is 40px wide
    const widths = [50, ...Array.from({ length: 99 }, () => 1)];

    // When: the visible count is selected
    const result = selectVisibleRefCount(widths, entry.budget, digitCounters(100));

    // Then: +100 at 45, and null at 35 (the 30px width of 99 is not reused)
    expect(result).toBe(entry.expected);
  });

  it("does not mutate the frozen widths or the counter map (TC-020)", () => {
    // Case: TC-020
    // Given: the TC-006 input with a frozen array and a snapshot of the map entries
    const widths = Object.freeze(Array.from({ length: 11 }, () => 10));
    const counterWidths = digitCounters(11);
    const entriesBefore = [...counterWidths.entries()];

    // When: the visible count is selected
    const result = selectVisibleRefCount(widths, 40, counterWidths);

    // Then: the result is unchanged and neither input was modified
    expect(result).toBe(2);
    expect([...widths]).toEqual(Array.from({ length: 11 }, () => 10));
    expect([...counterWidths.entries()]).toEqual(entriesBefore);
  });
});

/* ------------------------------------------------------------------ */
/* S2: calculateMinimumDescriptionWidth()                             */
/* ------------------------------------------------------------------ */

function minimumRow(
  paddingWidth: number,
  headWidth: number,
  emWidth: number,
  maxCounterWidth: number
): RefMinimumWidthInput {
  return { paddingWidth, headWidth, emWidth, maxCounterWidth };
}

// @see docs/testing/perspectives/web/refOverflow-test.md
describe("calculateMinimumDescriptionWidth", () => {
  const FIXTURE_ROW = minimumRow(8, 15, 13, 35);
  const NARROW_ROW = minimumRow(4, 0, 10, 20);

  it("returns 82 for the plan fixture (TC-021)", () => {
    // Case: TC-021 (plan §3.6: ceil(8 + 15 + max(35 / 0.6, 13 / 0.4)) = 82)
    // When: the minimum is calculated for the fixture row
    const result = calculateMinimumDescriptionWidth([FIXTURE_ROW]);

    // Then: 82 (rounding in the middle would give 81)
    expect(result).toBe(82);
  });

  it.each([
    { order: "fixture first", rows: [FIXTURE_ROW, NARROW_ROW] },
    { order: "fixture last", rows: [NARROW_ROW, FIXTURE_ROW] }
  ])("takes the largest row regardless of order ($order) (TC-022)", (entry) => {
    // Case: TC-022
    // Given: the fixture row (82) and a narrower row (38 on its own)
    // When: the minimum is calculated
    const result = calculateMinimumDescriptionWidth(entry.rows);

    // Then: the maximum 82 is returned in either order
    expect(result).toBe(82);
  });

  it("returns 64 for an empty row list (TC-023)", () => {
    // Case: TC-023
    // When/Then: no rows keep the existing 64px floor
    expect(calculateMinimumDescriptionWidth([])).toBe(64);
  });

  it("clamps a smaller formula value to the 64px floor (TC-024)", () => {
    // Case: TC-024
    // Given: 8 + 0 + max(20 / 0.6, 13 / 0.4) = 41.33
    // When/Then: 64 is returned as a number
    expect(calculateMinimumDescriptionWidth([minimumRow(8, 0, 13, 20)])).toBe(64);
  });

  it("uses the 40% description share when it dominates (TC-025)", () => {
    // Case: TC-025
    // Given: 8 + 15 + max(20 / 0.6, 21 / 0.4) = 75.5
    // When/Then: ceil gives 76
    expect(calculateMinimumDescriptionWidth([minimumRow(8, 15, 21, 20)])).toBe(76);
  });

  it("accepts zero padding and HEAD widths (TC-026)", () => {
    // Case: TC-026
    // Given: 0 + 0 + max(50 / 0.6, 13 / 0.4) = 83.33
    // When/Then: ceil gives 84
    expect(calculateMinimumDescriptionWidth([minimumRow(0, 0, 13, 50)])).toBe(84);
  });

  it.each([
    { field: "paddingWidth -1", row: minimumRow(-1, 15, 13, 35) },
    { field: "headWidth NaN", row: minimumRow(8, Number.NaN, 13, 35) },
    { field: "headWidth -1", row: minimumRow(8, -1, 13, 35) },
    { field: "emWidth 0", row: minimumRow(8, 15, 0, 35) },
    { field: "emWidth -1", row: minimumRow(8, 15, -1, 35) },
    { field: "maxCounterWidth 0", row: minimumRow(8, 15, 13, 0) },
    { field: "maxCounterWidth Infinity", row: minimumRow(8, 15, 13, Number.POSITIVE_INFINITY) }
  ])("returns null when $field (TC-027)", (entry) => {
    // Case: TC-027
    // When/Then: one invalid field makes the whole calculation unmeasurable
    expect(calculateMinimumDescriptionWidth([entry.row])).toBeNull();
  });

  it("returns null when a valid row is mixed with an invalid row (TC-028)", () => {
    // Case: TC-028
    // Given: the valid fixture row and a row with emWidth 0
    // When/Then: null, not the valid-only maximum 82
    expect(calculateMinimumDescriptionWidth([FIXTURE_ROW, minimumRow(8, 15, 0, 35)])).toBeNull();
  });

  it("does not mutate frozen rows (TC-029)", () => {
    // Case: TC-029
    // Given: the TC-022 rows frozen deeply
    const rows = Object.freeze([
      Object.freeze(minimumRow(8, 15, 13, 35)),
      Object.freeze(minimumRow(4, 0, 10, 20))
    ]);

    // When: the minimum is calculated
    const result = calculateMinimumDescriptionWidth(rows);

    // Then: 82 without an exception, and the rows are unchanged
    expect(result).toBe(82);
    expect(rows).toEqual([minimumRow(8, 15, 13, 35), minimumRow(4, 0, 10, 20)]);
  });
});

/* ------------------------------------------------------------------ */
/* S3: RefOverflowController measuring and in-row folding             */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/refOverflow-test.md
describe("RefOverflowController measuring and folding", () => {
  it("keeps the first two AC-01 badges and shows +4 before the message (TC-030)", () => {
    // Case: TC-030 (AC-01)
    // Given: W = 700 (border-box 723 − padding 8 − HEAD 15) and the AC-01 widths
    const { table } = setupTable([{ refs: ac01Refs(), head: true }]);
    const cell = descriptionCell(table);

    // Then: main and wt-1 stay visible and wt-2..wt-5 are hidden in order
    expect(visibleNames(cell)).toEqual(["main", "wt-1"]);
    expect(hiddenNames(cell)).toEqual(["wt-2", "wt-3", "wt-4", "wt-5"]);
    const counterElems = counters(cell);
    expect(counterElems).toHaveLength(1);
    expect(counterElems[0].textContent).toBe("+4");
    // The counter follows the last visible ref and is the last displayed item before the message
    expect(counterElems[0].previousElementSibling).toBe(directRefs(cell)[1]);
    const displayed = Array.from(cell.children).filter(
      (child) => !child.classList.contains("refOverflowHidden")
    );
    expect(displayed.map((child) => child.className)).toEqual([
      "commitHeadDot",
      "gitRef head active",
      "gitRef head worktree",
      "refOverflowCounter",
      "commitMessage"
    ]);
    // Visible outer widths + counter (96.4 + 232.8 + 30.7 = 359.9) fit B = 420; W − B = 280
    expect(96.4 + 232.8 + AC01_COUNTER).toBeLessThanOrEqual(700 * 0.6);
    expect(700 - 700 * 0.6).toBeCloseTo(280, 10);
  });

  it("uses fractional outer widths instead of offsetWidth (TC-031)", () => {
    // Case: TC-031
    // Given: border-box widths 15.25 / 25.5 (+ margin 5), integer offsetWidth 15 / 25, W = 58.5
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (
      this: HTMLElement
    ) {
      return Math.floor(fixtureWidth(this));
    });
    fixture.badgeOuter = { a: 20.25, b: 30.5 };
    fixture.counterOuter = () => 15;
    fixture.cellWidth = cellWidthFor(58.5);

    // When: the table is laid out
    const { table } = setupTable([{ refs: headRef("a") + headRef("b"), head: true }]);
    const cell = descriptionCell(table);

    // Then: B = 35.1 < 20.25 + 15, so no badge stays visible (integers would keep one)
    expect(visibleNames(cell)).toEqual([]);
    expect(hiddenNames(cell)).toEqual(["a", "b"]);
    expect(counters(cell).map((counter) => counter.textContent)).toEqual(["+2"]);
  });

  it("subtracts border, padding and the HEAD outer width from the cell (TC-032)", () => {
    // Case: TC-032
    // Given: border-box 107, border 1 + 1, padding 4 + 4, HEAD 10 + margin 5 → W = 82, B = 49.2
    fixture.badgeOuter = { a: 20, b: 30 };
    fixture.counterOuter = () => 15;
    fixture.cellWidth = 107;
    const created = createController();
    const table = buildTable([{ refs: headRef("a") + headRef("b"), head: true }]);
    const cell = descriptionCell(table);
    cell.style.borderLeftWidth = "1px";
    cell.style.borderRightWidth = "1px";
    cell.style.borderStyle = "solid";

    // When: the table is laid out
    created.controller.attachTable(table);
    flushFrames();

    // Then: 50 > 49.2, so one badge and +1 are shown
    expect(visibleNames(cell)).toEqual(["a"]);
    expect(counters(cell).map((counter) => counter.textContent)).toEqual(["+1"]);
  });

  it("counts a combined remote badge once and hides only the badge (TC-033)", () => {
    // Case: TC-033
    // Given: a, the combined main | origin badge, b (50 each), counter 20, W = 150 (B = 90)
    fixture.badgeOuter = { a: 50, main: 50, b: 50 };
    fixture.counterOuter = () => 20;
    fixture.cellWidth = cellWidthFor(150);

    // When: the table is laid out
    const refs = headRef("a") + headRef("main", { remotes: ["origin"] }) + headRef("b");
    const { table } = setupTable([{ refs, head: true }]);
    const cell = descriptionCell(table);

    // Then: +2 (not +3); the combined remote label is neither measured nor hidden on its own
    expect(visibleNames(cell)).toEqual(["a"]);
    expect(hiddenNames(cell)).toEqual(["main", "b"]);
    expect(counters(cell)[0].textContent).toBe("+2");
    expect(cell.querySelector(".gitRefHeadRemote")!.classList.contains("refOverflowHidden")).toBe(
      false
    );
  });

  it("follows width changes 2300 → 400 → 700 (TC-034)", () => {
    // Case: TC-034 (AC-05; 2300 / 400 computed by hand from §3.4)
    // Given: the AC-01 row laid out at W = 2300
    fixture.cellWidth = cellWidthFor(2300);
    const { table } = setupTable([{ refs: ac01Refs(), head: true }]);
    const cell = descriptionCell(table);
    const observer = latestObserver();

    // Then: every badge fits (sum 1363 ≤ 1380)
    expect(counters(cell)).toHaveLength(0);
    expect(hiddenNames(cell)).toEqual([]);

    // When: W shrinks to 400 (B = 240)
    fixture.cellWidth = cellWidthFor(400);
    observer.notify();
    flushFrames();
    // Then: one badge and +5
    expect(visibleNames(cell)).toEqual(["main"]);
    expect(counters(cell).map((counter) => counter.textContent)).toEqual(["+5"]);

    // When: W grows to 700
    fixture.cellWidth = cellWidthFor(700);
    observer.notify();
    flushFrames();
    // Then: two badges and +4
    expect(visibleNames(cell)).toEqual(["main", "wt-1"]);
    expect(counters(cell).map((counter) => counter.textContent)).toEqual(["+4"]);
  });

  it("leaves a row without badges untouched (TC-035)", () => {
    // Case: TC-035 (AC-13)
    // Given: a row with only the HEAD dot and the message
    const created = createController();
    const table = buildTable([{ refs: "", head: true }]);
    const cell = descriptionCell(table);
    const before = cell.innerHTML;

    // When: the table is laid out
    created.controller.attachTable(table);
    flushFrames();

    // Then: the markup is identical and nothing was folded
    expect(cell.innerHTML).toBe(before);
    expect(cell.querySelectorAll(".refOverflowCounter, .refOverflowHidden")).toHaveLength(0);
  });

  it("shows every badge without a counter when all fit (TC-036)", () => {
    // Case: TC-036 (AC-13)
    // Given: badges [20, 30], W = 100 (B = 60), counter 15
    fixture.badgeOuter = { a: 20, b: 30 };
    fixture.counterOuter = () => 15;
    fixture.cellWidth = cellWidthFor(100);

    // When: the table is laid out
    const { table } = setupTable([{ refs: headRef("a") + headRef("b"), head: true }]);
    const cell = descriptionCell(table);

    // Then: no counter and no hidden ref
    expect(counters(cell)).toHaveLength(0);
    expect(cell.querySelectorAll(".refOverflowHidden")).toHaveLength(0);
  });

  it.each([
    { width: 66.67, visible: 2, counter: "+9" },
    { width: 58.34, visible: 0, counter: "+11" }
  ])("measures real counter candidates and picks $counter at W = $width (TC-037)", (entry) => {
    // Case: TC-037 (plan §3.6 rows 5-6 through the DOM)
    // Given: eleven 10px refs; counters +1..+9 are 20px and +10 / +11 are 30px
    const names = Array.from({ length: 11 }, (_value, index) => `r${index + 1}`);
    fixture.badgeOuter = Object.fromEntries(names.map((name) => [name, 10]));
    fixture.counterOuter = (text) => (text.length <= 2 ? 20 : 30);
    fixture.cellWidth = cellWidthFor(entry.width);

    // When: the table is laid out
    const { table } = setupTable([
      { refs: names.map((name) => headRef(name)).join(""), head: true }
    ]);
    const cell = descriptionCell(table);

    // Then: the expected leading count and counter; +1..+11 were measured as counter buttons
    expect(visibleNames(cell)).toHaveLength(entry.visible);
    expect(counters(cell).map((counter) => counter.textContent)).toEqual([entry.counter]);
    expect(measuredCounterTexts).toEqual(names.map((_name, index) => `+${index + 1}`));
  });

  it("folds a stash row in render order (TC-038)", () => {
    // Case: TC-038 (AC-14)
    // Given: stash, checked-out branch, other branch, remote, tag, detached worktree (50 each)
    fixture.badgeOuter = {
      "@{0}": 50,
      main: 50,
      dev: 50,
      "origin/dev": 50,
      "v1.0": 50,
      "/tmp/wt8": 50
    };
    fixture.counterOuter = () => 20;
    fixture.cellWidth = cellWidthFor(250);
    const refs = [
      stashRef("@{0}"),
      headRef("main", { active: true }),
      headRef("dev"),
      remoteRef("origin/dev"),
      tagRef("v1.0"),
      detachedRef("/tmp/wt8", "wt8")
    ].join("");

    // When: the table is laid out (B = 150)
    const { table } = setupTable([{ refs, head: true }]);
    const cell = descriptionCell(table);

    // Then: the stash and the checked-out branch stay; the rest are hidden in order
    expect(visibleNames(cell)).toEqual(["@{0}", "main"]);
    expect(hiddenNames(cell)).toEqual(["dev", "origin/dev", "v1.0", "/tmp/wt8"]);
    expect(counters(cell)[0].textContent).toBe("+4");
  });

  it("folds every badge when the first one exceeds the budget (TC-039)", () => {
    // Case: TC-039 (AC-16)
    // Given: first badge 500, then [20, 20], counter 30, W = 700 (B = 420)
    fixture.badgeOuter = { long: 500, a: 20, b: 20 };
    fixture.counterOuter = () => 30;

    // When: the table is laid out
    const refs = headRef("long") + headRef("a") + headRef("b");
    const { table } = setupTable([{ refs, head: true }]);
    const cell = descriptionCell(table);

    // Then: no badge remains; nothing is truncated with an inline width
    expect(visibleNames(cell)).toEqual([]);
    expect(counters(cell)[0].textContent).toBe("+3");
    expect(directRefs(cell).map((ref) => ref.getAttribute("style"))).toEqual([null, null, null]);
  });

  it("builds an ignored button counter with translated labels (TC-040)", () => {
    // Case: TC-040 (AC-18)
    // Given: the AC-01 row with the real English dictionary
    const { table } = setupTable([{ refs: ac01Refs(), head: true }]);
    const counter = counters(descriptionCell(table))[0];

    // Then: a typed button carrying the ignore marker and the fixed English label
    expect(counter.tagName).toBe("BUTTON");
    expect(counter.getAttribute("type")).toBe("button");
    expect(counter.hasAttribute("data-ref-overflow-ignore")).toBe(true);
    expect(counter.classList.contains("gitRef")).toBe(false);
    expect(counter.classList.contains("findMatch")).toBe(false);
    expect(counter.title).toBe("Show 4 hidden badges");
    expect(counter.getAttribute("aria-label")).toBe("Show 4 hidden badges");
  });

  it("stops counter click and dblclick from reaching the row (TC-041)", () => {
    // Case: TC-041
    // Given: the folded AC-01 row with click / dblclick listeners on the row
    const { table } = setupTable([{ refs: ac01Refs(), head: true }]);
    const row = table.rows[1];
    const rowListener = vi.fn();
    row.addEventListener("click", rowListener);
    row.addEventListener("dblclick", rowListener);

    // When: the counter is clicked and double-clicked
    const counter = counters(descriptionCell(table))[0];
    click(counter);
    click(counter, "dblclick");

    // Then: the row never hears either event
    expect(rowListener).not.toHaveBeenCalled();
  });

  it("keeps the original refs, their order and names (TC-042)", () => {
    // Case: TC-042
    // Given: the AC-01 row before layout
    const created = createController();
    const table = buildTable([{ refs: ac01Refs(), head: true }]);
    const cell = descriptionCell(table);
    const before = directRefs(cell).map((ref) => [ref.dataset.name, ref.textContent]);

    // When: the row is folded
    created.controller.attachTable(table);
    flushFrames();

    // Then: every original ref is still there with the same name and text
    expect(directRefs(cell).map((ref) => [ref.dataset.name, ref.textContent])).toEqual(before);
    expect(hiddenNames(cell)).toHaveLength(4);
  });

  it("measures clean clones in an ignored, hidden area (TC-043)", () => {
    // Case: TC-043
    // Given: a folded AC-01 row whose hidden wt-3 is menu-active and wt-4 holds a search mark
    const { controller, table } = setupTable([{ refs: ac01Refs(), head: true }]);
    const cell = descriptionCell(table);
    cell.querySelector<HTMLElement>('[data-name="wt-3"]')!.classList.add("contextMenuActive");
    cell.querySelector('[data-name="wt-4"] .gitRefName')!.innerHTML =
      '<span class="findMatch">wt</span>-4';
    measureRoots = [];

    // When: the row is measured again
    controller.scheduleLayout();
    flushFrames();

    // Then: exactly one measuring area was used and removed afterwards
    expect(measureRoots).toHaveLength(1);
    const measure = measureRoots[0] as HTMLElement;
    expect(document.querySelector(".refOverflowMeasure")).toBeNull();
    expect(measure.getAttribute("aria-hidden")).toBe("true");
    expect(measure.hasAttribute("data-ref-overflow-ignore")).toBe(true);
    expect(measure.querySelectorAll(".commit, [data-id], [id]")).toHaveLength(0);
    expect(measure.classList.contains("commit")).toBe(false);
    const clones = Array.from(measure.querySelectorAll<HTMLElement>(".gitRef"));
    expect(clones.map((clone) => clone.dataset.name)).toEqual(Object.keys(AC01_WIDTHS));
    expect(measure.querySelectorAll(".refOverflowHidden, .contextMenuActive")).toHaveLength(0);
    expect(measure.querySelector('[data-name="wt-4"] .findMatch')!.textContent).toBe("wt");
    // Originals report 9999px; using them would hide every badge
    expect(visibleNames(cell)).toEqual(["main", "wt-1"]);
  });

  it("does not rewrite anything when the same sizes are laid out twice (TC-044)", () => {
    // Case: TC-044 (AC-17)
    // Given: the AC-01 row laid out once
    const { controller, table, onMinimumWidth } = setupTable([{ refs: ac01Refs(), head: true }]);
    const recorder = new MutationObserver(() => {});
    recorder.observe(table, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true
    });

    // When: the same sizes are laid out again
    controller.scheduleLayout();
    flushFrames();

    // Then: identical fold and minimum; no mutation of refs or the counter
    // (8 + 15 + max(30.7 / 0.6, 13 / 0.4) = 74.17 → 75)
    expect(onMinimumWidth.mock.calls).toEqual([[75], [75]]);
    expect(recorder.takeRecords()).toEqual([]);
    expect(counters(descriptionCell(table))[0].textContent).toBe("+4");
    recorder.disconnect();
  });

  it("notifies the fixture minimum 82 (TC-045)", () => {
    // Case: TC-045 (AC-11)
    // Given: padding 4 + 4, HEAD outer 15, message 13px, every counter candidate 35px wide
    fixture.counterOuter = () => 35;

    // When: the AC-01 row is laid out
    const { onMinimumWidth } = setupTable([{ refs: ac01Refs(), head: true }]);

    // Then: ceil(8 + 15 + max(35 / 0.6, 13 / 0.4)) = 82
    expect(onMinimumWidth).toHaveBeenCalledTimes(1);
    expect(onMinimumWidth).toHaveBeenCalledWith(82);
  });

  it("derives the minimum from counter candidates even when nothing folds (TC-046)", () => {
    // Case: TC-046
    // Given: the TC-045 sizes with a cell wide enough for every badge
    fixture.counterOuter = () => 35;
    fixture.cellWidth = cellWidthFor(2300);

    // When: the row is laid out
    const { table, onMinimumWidth } = setupTable([{ refs: ac01Refs(), head: true }]);

    // Then: no counter is shown, but the minimum is still 82
    expect(counters(descriptionCell(table))).toHaveLength(0);
    expect(onMinimumWidth).toHaveBeenCalledWith(82);
  });

  it("notifies a valid 64 instead of null (TC-047)", () => {
    // Case: TC-047
    // Given: no HEAD dot, message 13px, counters 20px → 8 + max(33.33, 32.5) = 41.33
    fixture.counterOuter = () => 20;

    // When: a badge row without HEAD is laid out
    const { onMinimumWidth } = setupTable([{ refs: ac01Refs(), head: false }]);

    // Then: the existing floor 64 is reported as a number
    expect(onMinimumWidth.mock.calls).toEqual([[64]]);
  });

  it("notifies null once when no row has badges (TC-048)", () => {
    // Case: TC-048
    // When: a table without badge rows is laid out
    const { onMinimumWidth } = setupTable([{ refs: "" }, { refs: "", head: true }]);

    // Then: null is notified exactly once
    expect(onMinimumWidth.mock.calls).toEqual([[null]]);
  });

  it("releases observers, measuring DOM and the pending frame on detach (TC-049)", () => {
    // Case: TC-049
    // Given: a folded table with a pending layout frame
    const { controller, onMinimumWidth } = setupTable([{ refs: ac01Refs(), head: true }]);
    const observer = latestObserver();
    controller.scheduleLayout();
    const pendingIds = [...frames.queue.keys()];
    onMinimumWidth.mockClear();

    // When: the table is detached and later frames run
    controller.detachTable();
    flushFrames();

    // Then: null is notified, the observer is released and the frame was cancelled
    expect(onMinimumWidth.mock.calls).toEqual([[null]]);
    expect(observer.disconnected).toBe(true);
    expect(document.querySelector(".refOverflowMeasure")).toBeNull();
    expect(pendingIds).toHaveLength(1);
    expect(frames.cancelled).toEqual(pendingIds);
  });

  it("keeps a new unmeasurable row fully visible without retrying (TC-050)", () => {
    // Case: TC-050
    // Given: every box reports width 0 (e.g. a hidden webview)
    fixture.zero = true;

    // When: a new badge row is laid out
    const { table, onMinimumWidth } = setupTable([{ refs: ac01Refs(), head: true }]);
    const cell = descriptionCell(table);

    // Then: nothing is folded, nothing is notified and no frame is re-requested
    expect(cell.querySelectorAll(".refOverflowHidden, .refOverflowCounter")).toHaveLength(0);
    expect(onMinimumWidth).not.toHaveBeenCalled();
    expect(frames.requested).toBe(1);
    expect(frames.queue.size).toBe(0);
  });

  it("keeps the current fold when widths drop to 0 (TC-051)", () => {
    // Case: TC-051
    // Given: the folded AC-01 row
    const { table, onMinimumWidth } = setupTable([{ refs: ac01Refs(), head: true }]);
    const cell = descriptionCell(table);
    onMinimumWidth.mockClear();
    const requestedBefore = frames.requested;

    // When: every width becomes 0 and the header observer fires
    fixture.zero = true;
    latestObserver().notify();
    flushFrames();

    // Then: the fold stays, nothing is notified and no frame requeues itself
    expect(hiddenNames(cell)).toEqual(["wt-2", "wt-3", "wt-4", "wt-5"]);
    expect(counters(cell)[0].textContent).toBe("+4");
    expect(onMinimumWidth).not.toHaveBeenCalled();
    expect(frames.requested).toBe(requestedBefore + 1);
    expect(frames.queue.size).toBe(0);
  });

  it("recovers when widths come back (TC-052)", () => {
    // Case: TC-052 (AC-17)
    // Given: the TC-051 state with zero widths
    const { table } = setupTable([{ refs: ac01Refs(), head: true }]);
    const cell = descriptionCell(table);
    const observer = latestObserver();
    fixture.zero = true;
    observer.notify();
    flushFrames();

    // When: W = 700 returns and the observer fires
    fixture.zero = false;
    observer.notify();
    flushFrames();

    // Then: two badges and +4
    expect(visibleNames(cell)).toEqual(["main", "wt-1"]);
    expect(counters(cell).map((counter) => counter.textContent)).toEqual(["+4"]);
  });

  it("coalesces triggers in one frame into a single layout (TC-053)", () => {
    // Case: TC-053 (AC-17)
    // Given: a laid-out table
    const { controller, onMinimumWidth } = setupTable([{ refs: ac01Refs(), head: true }]);
    frames.requested = 0;
    onMinimumWidth.mockClear();

    // When: scheduleLayout ×3, window resize and a header resize with a new width happen
    controller.scheduleLayout();
    controller.scheduleLayout();
    controller.scheduleLayout();
    window.dispatchEvent(new Event("resize"));
    fixture.headerWidth = 800;
    latestObserver().notify();
    flushFrames();

    // Then: one frame and one measurement
    expect(frames.requested).toBe(1);
    expect(onMinimumWidth).toHaveBeenCalledTimes(1);
  });

  it("ignores a header resize with the width of the last layout (TC-054)", () => {
    // Case: TC-054
    // Given: a laid-out table
    setupTable([{ refs: ac01Refs(), head: true }]);
    frames.requested = 0;

    // When: the header observer fires without a width change
    latestObserver().notify();

    // Then: no frame is requested
    expect(frames.requested).toBe(0);
  });

  it("schedules one frame per external trigger (TC-055)", async () => {
    // Case: TC-055 (AC-17)
    // Given: a font set whose ready promise is still pending when the table is attached
    let resolveReady: () => void = () => {};
    const fonts = Object.assign(new EventTarget(), {
      ready: new Promise<void>((resolveFonts) => {
        resolveReady = resolveFonts;
      })
    });
    Object.defineProperty(document, "fonts", { configurable: true, value: fonts });
    setupTable([{ refs: ac01Refs(), head: true }]);
    const triggers: [string, () => Promise<void> | void][] = [
      ["window resize", () => void window.dispatchEvent(new Event("resize"))],
      [
        "html style",
        async () => {
          document.documentElement.style.setProperty("--vscode-font-size", "14px");
          await flushMicrotasks();
        }
      ],
      [
        "html class",
        async () => {
          document.documentElement.classList.toggle("vscode-dark");
          await flushMicrotasks();
        }
      ],
      [
        "body class",
        async () => {
          document.body.classList.toggle("vscode-high-contrast");
          await flushMicrotasks();
        }
      ],
      [
        "fonts.ready",
        async () => {
          resolveReady();
          await flushMicrotasks();
        }
      ],
      ["fonts loadingdone", () => void fonts.dispatchEvent(new Event("loadingdone"))]
    ];

    for (const [name, trigger] of triggers) {
      // When: one trigger fires in its own frame
      frames.requested = 0;
      await trigger();

      // Then: exactly one layout frame is requested
      expect(frames.requested, name).toBe(1);
      flushFrames();
    }
  });

  it("switches tables without touching the previous one (TC-056)", () => {
    // Case: TC-056
    // Given: table A attached with its first frame still pending
    const { controller } = createController();
    const tableA = buildTable([{ refs: ac01Refs(), head: true }]);
    controller.attachTable(tableA);
    const observerA = latestObserver();

    // When: table B is attached and the frames run
    const tableB = buildTable([{ refs: ac01Refs(), head: true }]);
    controller.attachTable(tableB);
    flushFrames();

    // Then: A was released and left untouched; only B is folded
    expect(observerA.disconnected).toBe(true);
    expect(tableA.querySelectorAll(".refOverflowCounter, .refOverflowHidden")).toHaveLength(0);
    expect(document.querySelector(".refOverflowMeasure")).toBeNull();
    expect(counters(descriptionCell(tableB)).map((counter) => counter.textContent)).toEqual(["+4"]);
  });

  it("skips a frame whose table has left the document (TC-057)", () => {
    // Case: TC-057
    // Given: a pending frame for an attached table
    const { controller, onMinimumWidth } = createController();
    const table = buildTable([{ refs: ac01Refs(), head: true }]);
    controller.attachTable(table);
    table.parentElement!.remove();
    const recorder = new MutationObserver(() => {});
    recorder.observe(table, { attributes: true, childList: true, subtree: true });

    // When: the frame runs
    expect(() => flushFrames()).not.toThrow();

    // Then: the detached table was not modified and nothing was notified
    expect(recorder.takeRecords()).toEqual([]);
    expect(onMinimumWidth).not.toHaveBeenCalled();
    recorder.disconnect();
  });

  it("removes long-lived listeners on dispose (TC-058)", async () => {
    // Case: TC-058
    // Given: a controller with a font set and an attached table
    const fonts = Object.assign(new EventTarget(), { ready: new Promise<void>(() => {}) });
    Object.defineProperty(document, "fonts", { configurable: true, value: fonts });
    const { controller } = setupTable([{ refs: ac01Refs(), head: true }]);
    const observer = latestObserver();

    // When: it is disposed and the triggers fire afterwards
    controller.dispose();
    frames.requested = 0;
    window.dispatchEvent(new Event("resize"));
    document.documentElement.style.setProperty("--vscode-font-size", "15px");
    await flushMicrotasks();
    fonts.dispatchEvent(new Event("loadingdone"));

    // Then: nothing is scheduled and the header observer was disconnected
    expect(frames.requested).toBe(0);
    expect(observer.disconnected).toBe(true);
  });

  it("does not duplicate listeners across re-attachments (TC-059)", () => {
    // Case: TC-059 (AC-17)
    // Given: the same table attached three times
    const { controller } = createController();
    const table = buildTable([{ refs: ac01Refs(), head: true }]);
    controller.attachTable(table);
    controller.attachTable(table);
    controller.attachTable(table);
    flushFrames();
    frames.requested = 0;

    // When: the window is resized once
    window.dispatchEvent(new Event("resize"));

    // Then: one frame
    expect(frames.requested).toBe(1);
  });

  // TC-060 (300 / 1,000 / 3,000 row performance) is a manual real-browser record; see the
  // Notes of docs/testing/perspectives/web/refOverflow-test.md.
});

/* ------------------------------------------------------------------ */
/* S4: hidden-badge list                                              */
/* ------------------------------------------------------------------ */

function openCounter(table: HTMLTableElement, rowIndex = 0): HTMLElement {
  click(counters(descriptionCell(table, rowIndex))[0]);
  const list = popups();
  expect(list).toHaveLength(1);
  return list[0];
}

function listNames(popup: HTMLElement): string[] {
  return Array.from(popup.children).map((child) => badgeKey(child as HTMLElement));
}

function withoutTransientClasses(elem: Element): string[] {
  return Array.from(elem.classList).filter(
    (name) => name !== "refOverflowHidden" && name !== "contextMenuActive"
  );
}

// @see docs/testing/perspectives/web/refOverflow-test.md
describe("RefOverflowController hidden-badge list", () => {
  it("opens the hidden refs one per line in the original order (TC-061)", () => {
    // Case: TC-061 (AC-02)
    // Given: the folded AC-01 row
    const { table } = setupTable([{ refs: ac01Refs(), head: true }]);

    // When: +4 is clicked
    const popup = openCounter(table);

    // Then: a body-level ignored list holds the four hidden clones in order
    expect(popup.parentElement).toBe(document.body);
    expect(popup.hasAttribute("data-ref-overflow-ignore")).toBe(true);
    expect(listNames(popup)).toEqual(["wt-2", "wt-3", "wt-4", "wt-5"]);
    expect(Array.from(popup.children).every((child) => child.classList.contains("gitRef"))).toBe(
      true
    );
    expect(popup.classList.contains("commit")).toBe(false);
    expect(popup.hasAttribute("data-id")).toBe(false);
  });

  it("clones every ref kind with its attributes, icon and text (TC-062)", () => {
    // Case: TC-062 (AC-03, AC-14)
    // Given: a first badge too wide for B, so every kind below it is hidden
    fixture.badgeOuter = {
      "@{0}": 900,
      main: 50,
      "feature/x": 50,
      "origin/dev": 50,
      "v1.0": 50,
      "/tmp/wt8": 50,
      dev: 50
    };
    const refs = [
      stashRef("@{0}"),
      headRef("main", { active: true }),
      headRef("feature/x", { worktreePath: "/tmp/wtx", remotes: ["origin"] }),
      remoteRef("origin/dev"),
      tagRef("v1.0"),
      detachedRef("/tmp/wt8", "wt8"),
      headRef("dev", { remotes: ["origin", "upstream"] })
    ].join("");
    const { table } = setupTable([{ refs, head: true }]);
    const originals = directRefs(descriptionCell(table));

    // When: the list is opened
    const popup = openCounter(table);
    const clones = Array.from(popup.children) as HTMLElement[];

    // Then: each clone equals its original apart from the transient state classes
    expect(clones).toHaveLength(originals.length);
    clones.forEach((clone, index) => {
      const original = originals[index];
      expect(Array.from(clone.classList)).toEqual(withoutTransientClasses(original));
      expect(clone.dataset.name).toBe(original.dataset.name);
      expect(clone.dataset.remotes).toBe(original.dataset.remotes);
      expect(clone.dataset.worktreePath).toBe(original.dataset.worktreePath);
      expect(clone.title).toBe(original.title);
      expect(clone.innerHTML).toBe(original.innerHTML);
    });
    expect(
      Array.from(popup.querySelectorAll<HTMLElement>(".gitRefHeadRemote")).map(
        (remote) => remote.dataset.name
      )
    ).toEqual(["origin/feature/x", "origin/dev", "upstream/dev"]);
    expect(popup.querySelectorAll(".codicon")).toHaveLength(originals.length);
  });

  it("keeps special characters as raw values (TC-063)", () => {
    // Case: TC-063
    // Given: a hidden ref named feat/<b>&"'x
    const special = `feat/<b>&"'x`;
    fixture.badgeOuter = { long: 900, [special]: 50 };
    const { table } = setupTable([{ refs: headRef("long") + headRef(special), head: true }]);

    // When: the list is opened
    const popup = openCounter(table);
    const clone = popup.children[1] as HTMLElement;

    // Then: the raw name survives and no markup was interpreted
    expect(clone.dataset.name).toBe(special);
    expect(clone.textContent).toBe(special);
    expect(popup.querySelectorAll("b, script")).toHaveLength(0);
  });

  it("drops menu state and ids from clones (TC-064)", () => {
    // Case: TC-064
    // Given: a hidden original that is menu-active and contains an element with an id
    const { table } = setupTable([{ refs: ac01Refs(), head: true }]);
    const original = descriptionCell(table).querySelector<HTMLElement>('[data-name="wt-3"]')!;
    original.classList.add("contextMenuActive");
    original.id = "refWithId";
    original.querySelector(".gitRefName")!.id = "nameWithId";

    // When: the list is opened
    const popup = openCounter(table);

    // Then: neither the class nor any id is copied
    expect(popup.querySelector('[data-name="wt-3"]')!.classList.contains("contextMenuActive")).toBe(
      false
    );
    expect(popup.querySelectorAll("[id]")).toHaveLength(0);
    expect(popup.id).toBe("");
  });

  it("keeps the search marks of the hidden refs (TC-065)", () => {
    // Case: TC-065 (AC-08)
    // Given: a hidden ref whose name contains a search mark
    const { table } = setupTable([{ refs: ac01Refs(), head: true }]);
    descriptionCell(table).querySelector('[data-name="wt-4"] .gitRefName')!.innerHTML =
      'w<span class="findMatch">t-4</span>';

    // When: the list is opened
    const popup = openCounter(table);

    // Then: the clone holds the same mark
    const marks = popup.querySelectorAll('[data-name="wt-4"] span.findMatch');
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe("t-4");
  });

  it("copies the row colour to the list (TC-066)", () => {
    // Case: TC-066
    // Given: a folded row with data-color="3"
    const { table } = setupTable([{ refs: ac01Refs(), head: true, color: 3 }]);

    // When: the list is opened
    const popup = openCounter(table);

    // Then: the list resolves --git-keizu-color from the same colour index
    expect(popup.getAttribute("data-color")).toBe("3");
  });

  it("closes when the same counter is clicked again (TC-067)", () => {
    // Case: TC-067 (AC-04)
    // Given: an open list
    const { controller, table } = setupTable([{ refs: ac01Refs(), head: true }]);
    openCounter(table);

    // When: the same counter is clicked again
    click(counters(descriptionCell(table))[0]);

    // Then: the list is gone and there is nothing left to close
    expect(popups()).toHaveLength(0);
    expect(controller.closePopup()).toBe(false);
  });

  it("switches to another row's counter (TC-068)", () => {
    // Case: TC-068 (AC-04)
    // Given: two folded rows and the first row's list open
    fixture.badgeOuter = { ...AC01_WIDTHS, x1: 380, x2: 50, x3: 50 };
    const second = headRef("x1") + headRef("x2") + headRef("x3");
    const { table } = setupTable([{ refs: ac01Refs(), head: true }, { refs: second }]);
    openCounter(table, 0);

    // When: the second row's counter is clicked
    click(counters(descriptionCell(table, 1))[0]);

    // Then: one list shows the second row's hidden refs
    const list = popups();
    expect(list).toHaveLength(1);
    expect(listNames(list[0])).toEqual(hiddenNames(descriptionCell(table, 1)));
    expect(listNames(list[0])).toEqual(["x2", "x3"]);
  });

  it("does not let the counter click select the row (TC-069)", () => {
    // Case: TC-069 (AC-02)
    // Given: a row click listener
    const { table } = setupTable([{ refs: ac01Refs(), head: true }]);
    const rowListener = vi.fn();
    table.rows[1].addEventListener("click", rowListener);

    // When: the counter is clicked
    click(counters(descriptionCell(table))[0]);

    // Then: the list opens and the row stays unaware
    expect(popups()).toHaveLength(1);
    expect(rowListener).not.toHaveBeenCalled();
  });

  it("ignores click and dblclick on list items (TC-070)", () => {
    // Case: TC-070 (AC-15)
    // Given: an open list and bubbling listeners on the document and the row
    const { table, onRefContextMenu } = setupTable([{ refs: ac01Refs(), head: true }]);
    const popup = openCounter(table);
    const documentListener = vi.fn();
    const rowListener = vi.fn();
    document.addEventListener("click", documentListener);
    document.addEventListener("dblclick", documentListener);
    table.rows[1].addEventListener("click", rowListener);
    table.rows[1].addEventListener("dblclick", rowListener);

    // When: a clone is clicked and double-clicked
    const clone = popup.children[0];
    click(clone);
    click(clone, "dblclick");

    // Then: nothing handles them and the list stays open
    expect(documentListener).not.toHaveBeenCalled();
    expect(rowListener).not.toHaveBeenCalled();
    expect(onRefContextMenu).not.toHaveBeenCalled();
    expect(vscode.postMessage).not.toHaveBeenCalled();
    expect(popups()).toHaveLength(1);
    document.removeEventListener("click", documentListener);
    document.removeEventListener("dblclick", documentListener);
  });

  it.each([
    { part: "icon", selector: '[data-name="main"] .codicon' },
    { part: "search mark", selector: '[data-name="main"] .findMatch' },
    { part: "combined remote", selector: '[data-name="main"] .gitRefHeadRemote' }
  ])("passes the event and the clone badge for a $part target (TC-071)", (entry) => {
    // Case: TC-071 (AC-03, AC-09)
    // Given: a hidden combined badge with a search mark inside the remote label
    fixture.badgeOuter = { long: 900, main: 50 };
    const { table, onRefContextMenu } = setupTable([
      { refs: headRef("long") + headRef("main", { remotes: ["origin"] }), head: true }
    ]);
    descriptionCell(table).querySelector('[data-name="main"] .gitRefHeadRemote')!.innerHTML =
      '<span class="findMatch">ori</span>gin';
    const popup = openCounter(table);
    const target = popup.querySelector(entry.selector)!;
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });

    // When: the target is right-clicked
    target.dispatchEvent(event);

    // Then: the handler gets the same event and the clone's .gitRef element
    expect(onRefContextMenu).toHaveBeenCalledTimes(1);
    expect(onRefContextMenu.mock.calls[0][0]).toBe(event);
    expect(onRefContextMenu.mock.calls[0][1]).toBe(popup.querySelector('[data-name="main"]'));
  });

  it("registers one right-click listener after reopening (TC-072)", () => {
    // Case: TC-072
    // Given: the list opened and closed three times, then opened again
    const { table, onRefContextMenu } = setupTable([{ refs: ac01Refs(), head: true }]);
    for (let i = 0; i < 3; i++) {
      openCounter(table);
      click(counters(descriptionCell(table))[0]);
    }
    const popup = openCounter(table);

    // When: a clone is right-clicked once
    click(popup.children[0], "contextmenu");

    // Then: one call
    expect(onRefContextMenu).toHaveBeenCalledTimes(1);
  });

  it("closes on an outside click (TC-073)", () => {
    // Case: TC-073 (AC-04)
    // Given: an open list
    const { table } = setupTable([{ refs: ac01Refs(), head: true }]);
    openCounter(table);

    // When: the body is clicked
    click(document.body);

    // Then: the list is gone
    expect(popups()).toHaveLength(0);
  });

  it.each([
    { area: "the list", pick: () => popups()[0].children[0] },
    { area: "#contextMenu", pick: () => document.querySelector("#contextMenu li")! },
    {
      area: "ul.contextMenuSubmenu",
      pick: () => document.querySelector("ul.contextMenuSubmenu li")!
    }
  ])("stays open for a click inside $area (TC-074)", (entry) => {
    // Case: TC-074 (AC-03)
    // Given: an open list and existing menu elements
    const { table } = setupTable([{ refs: ac01Refs(), head: true }]);
    document.body.insertAdjacentHTML(
      "beforeend",
      '<ul id="contextMenu"><li>item</li></ul><ul class="contextMenuSubmenu"><li>sub</li></ul>'
    );
    openCounter(table);

    // When: the area is clicked
    click(entry.pick());

    // Then: the list stays
    expect(popups()).toHaveLength(1);
  });

  it("decides inside-ness before a menu item removes the menu (TC-075)", () => {
    // Case: TC-075 (AC-03)
    // Given: a menu item whose bubbling click handler removes #contextMenu
    const { table } = setupTable([{ refs: ac01Refs(), head: true }]);
    document.body.insertAdjacentHTML("beforeend", '<ul id="contextMenu"><li>item</li></ul>');
    const menu = document.getElementById("contextMenu")!;
    menu.querySelector("li")!.addEventListener("click", () => menu.remove());
    openCounter(table);

    // When: the item is clicked
    click(menu.querySelector("li")!);

    // Then: the list stays open
    expect(menu.isConnected).toBe(false);
    expect(popups()).toHaveLength(1);
  });

  it("reports whether closePopup closed a list (TC-076)", () => {
    // Case: TC-076
    // Given: an open list
    const { controller, table } = setupTable([{ refs: ac01Refs(), head: true }]);
    openCounter(table);

    // When/Then: true while open (and it closes), false afterwards
    expect(controller.closePopup()).toBe(true);
    expect(popups()).toHaveLength(0);
    expect(controller.closePopup()).toBe(false);
  });

  it.each([
    { origin: "a list clone", fromList: true, expected: 1 },
    { origin: "an in-row ref", fromList: false, expected: 0 }
  ])("hides the context menu only when it came from $origin (TC-077)", (entry) => {
    // Case: TC-077 (AC-06)
    // Given: an open list and a menu opened from a clone or from a visible in-row ref
    const { controller, table } = setupTable([{ refs: ac01Refs(), head: true }]);
    const popup = openCounter(table);
    const source = entry.fromList
      ? popup.children[0]
      : descriptionCell(table).querySelector('[data-name="main"]')!;
    source.classList.add("contextMenuActive");

    // When: the list closes
    controller.closePopup();

    // Then: only a list-origin menu is hidden
    expect(hideContextMenu).toHaveBeenCalledTimes(entry.expected);
  });

  it.each([
    {
      caseId: "TC-078",
      viewport: [800, 600],
      counter: { left: 100, top: 200, bottom: 220 },
      popup: [200, 150],
      expected: { left: "100px", top: "220px" }
    },
    {
      caseId: "TC-079",
      viewport: [800, 600],
      counter: { left: 100, top: 480, bottom: 500 },
      popup: [200, 150],
      expected: { left: "100px", top: "330px" }
    },
    {
      caseId: "TC-080",
      viewport: [800, 600],
      counter: { left: 700, top: 200, bottom: 220 },
      popup: [200, 150],
      expected: { left: "600px", top: "220px" }
    },
    {
      caseId: "TC-081",
      viewport: [800, 600],
      counter: { left: -20, top: 200, bottom: 220 },
      popup: [200, 150],
      expected: { left: "0px", top: "220px" }
    },
    {
      caseId: "TC-082",
      viewport: [800, 300],
      counter: { left: 100, top: 100, bottom: 120 },
      popup: [200, 250],
      expected: { left: "100px", top: "0px" }
    }
  ])("positions the list inside the viewport ($caseId)", (entry) => {
    // Case: TC-078 / TC-079 / TC-080 / TC-081 / TC-082 (AC-15)
    // Given: the viewport, the counter rectangle and the list size
    stubProperty(globalThis, "innerWidth", entry.viewport[0]);
    stubProperty(globalThis, "innerHeight", entry.viewport[1]);
    fixture.counterRect = entry.counter;
    fixture.popupSize = { width: entry.popup[0], height: entry.popup[1] };
    const { table } = setupTable([{ refs: ac01Refs(), head: true }]);

    // When: the list is opened
    const popup = openCounter(table);

    // Then: below and left-aligned by default, flipped and clamped at the edges
    expect({ left: popup.style.left, top: popup.style.top }).toEqual(entry.expected);
    expect(parseFloat(popup.style.top) + entry.popup[1]).toBeLessThanOrEqual(entry.viewport[1]);
  });

  it("lists 200 hidden refs including a 300-character name (TC-083)", () => {
    // Case: TC-083 (AC-15)
    // Given: a leading badge wider than B followed by 199 refs, one with a 300-character name
    const longName = "n".repeat(300);
    const names = [
      "lead",
      ...Array.from({ length: 198 }, (_value, index) => `ref-${index}`),
      longName
    ];
    fixture.badgeOuter = Object.fromEntries(
      names.map((name) => [name, name === "lead" ? 900 : 40])
    );
    fixture.counterOuter = () => 40;
    const { table } = setupTable([
      { refs: names.map((name) => headRef(name)).join(""), head: true }
    ]);

    // When: the list is opened
    const popup = openCounter(table);

    // Then: all 200 clones are present and the long name is complete
    expect(popup.children).toHaveLength(200);
    expect(popup.lastElementChild!.textContent).toBe(longName);
  });

  it("closes before re-layout on a real width change and stays for the same width (TC-084)", () => {
    // Case: TC-084 (AC-06, AC-07)
    // Given: an open list
    const { table } = setupTable([{ refs: ac01Refs(), head: true }]);
    openCounter(table);
    const observer = latestObserver();

    // When: the header observer fires with the same width
    observer.notify();
    // Then: the list stays
    expect(popups()).toHaveLength(1);

    // When: the description column really changes width
    fixture.headerWidth = 900;
    observer.notify();
    // Then: the list closes before the new layout runs
    expect(frames.queue.size).toBe(1);
    expect(popups()).toHaveLength(0);
  });

  it.each([
    { action: "detachTable", replace: false },
    { action: "attachTable with another table", replace: true }
  ])("closes the list and its menu on $action (TC-085)", (entry) => {
    // Case: TC-085 (AC-06)
    // Given: an open list whose clone owns the context menu
    const { controller, table } = setupTable([{ refs: ac01Refs(), head: true }]);
    const popup = openCounter(table);
    const clone = popup.children[0] as HTMLElement;
    clone.classList.add("contextMenuActive");

    // When: the table is detached or replaced
    if (entry.replace) {
      controller.attachTable(buildTable([{ refs: ac01Refs(), head: true }]));
    } else {
      controller.detachTable();
    }

    // Then: the list and the old clones are gone and the menu was hidden once
    expect(popups()).toHaveLength(0);
    expect(hideContextMenu).toHaveBeenCalledTimes(1);
    expect(clone.isConnected).toBe(false);
  });

  it("cleans up on dispose (TC-086)", () => {
    // Case: TC-086
    // Given: an open list
    const { controller, table, onRefContextMenu, onMinimumWidth } = setupTable([
      { refs: ac01Refs(), head: true }
    ]);
    openCounter(table);
    onMinimumWidth.mockClear();

    // When: the controller is disposed and the body is clicked
    controller.dispose();
    expect(() => click(document.body)).not.toThrow();

    // Then: no list remains and no callback other than the detach notification ran
    expect(popups()).toHaveLength(0);
    expect(onRefContextMenu).not.toHaveBeenCalled();
    expect(onMinimumWidth.mock.calls).toEqual([[null]]);
  });
});

/* ------------------------------------------------------------------ */
/* S5: syncSearchHighlights()                                         */
/* ------------------------------------------------------------------ */

function markName(cell: HTMLElement, name: string): void {
  const label = cell.querySelector(`[data-name="${name}"] .gitRefName`)!;
  label.innerHTML = `<span class="findMatch">${label.textContent}</span>`;
}

function unmarkAll(root: ParentNode): void {
  root.querySelectorAll(".findMatch").forEach((mark) => mark.replaceWith(mark.textContent ?? ""));
}

// @see docs/testing/perspectives/web/refOverflow-test.md
describe("RefOverflowController.syncSearchHighlights", () => {
  it("highlights the counter for a hidden match and keeps N (TC-087)", () => {
    // Case: TC-087 (AC-08)
    // Given: the +4 row with a mark in hidden wt-3
    const { controller, table } = setupTable([{ refs: ac01Refs(), head: true }]);
    const cell = descriptionCell(table);
    markName(cell, "wt-3");

    // When: highlights are synchronised
    controller.syncSearchHighlights();

    // Then: the counter is highlighted and still reads +4
    const counter = counters(cell)[0];
    expect(counter.classList.contains("refOverflowMatch")).toBe(true);
    expect(counter.textContent).toBe("+4");
  });

  it.each([
    { place: "a visible ref", mark: (cell: HTMLElement) => markName(cell, "wt-1") },
    {
      place: "the message",
      mark: (cell: HTMLElement) => {
        cell.querySelector(".commitMessage")!.innerHTML = '<span class="findMatch">message</span>';
      }
    }
  ])("does not highlight for a match in $place (TC-088)", (entry) => {
    // Case: TC-088 (AC-10)
    // Given: a mark outside the hidden refs
    const { controller, table } = setupTable([{ refs: ac01Refs(), head: true }]);
    const cell = descriptionCell(table);
    entry.mark(cell);

    // When: highlights are synchronised
    controller.syncSearchHighlights();

    // Then: the counter is not highlighted
    expect(counters(cell)[0].classList.contains("refOverflowMatch")).toBe(false);
  });

  it("never creates a counter for a row where everything fits (TC-089)", () => {
    // Case: TC-089 (AC-10)
    // Given: a fitting row with a mark on one ref
    fixture.cellWidth = cellWidthFor(2300);
    const { controller, table } = setupTable([{ refs: ac01Refs(), head: true }]);
    const cell = descriptionCell(table);
    markName(cell, "wt-3");

    // When: highlights are synchronised
    controller.syncSearchHighlights();

    // Then: still no counter
    expect(cell.querySelectorAll(".refOverflowCounter")).toHaveLength(0);
  });

  it("removes the highlight when the hidden mark is cleared (TC-090)", () => {
    // Case: TC-090 (AC-09)
    // Given: a highlighted counter
    const { controller, table } = setupTable([{ refs: ac01Refs(), head: true }]);
    const cell = descriptionCell(table);
    markName(cell, "wt-3");
    controller.syncSearchHighlights();

    // When: the mark is removed and highlights are synchronised
    unmarkAll(cell);
    controller.syncSearchHighlights();

    // Then: the highlight is gone
    expect(counters(cell)[0].classList.contains("refOverflowMatch")).toBe(false);
  });

  it("does not open a closed list (TC-091)", () => {
    // Case: TC-091 (AC-08)
    // Given: a hidden match and a closed list
    const { controller, table } = setupTable([{ refs: ac01Refs(), head: true }]);
    markName(descriptionCell(table), "wt-3");

    // When: highlights are synchronised
    controller.syncSearchHighlights();

    // Then: no list appears
    expect(popups()).toHaveLength(0);
  });

  it("re-clones an open list after hiding its menu (TC-092)", () => {
    // Case: TC-092 (AC-09)
    // Given: an open list with wt-3 marked and a menu opened from its clone
    const { controller, table } = setupTable([{ refs: ac01Refs(), head: true }]);
    const cell = descriptionCell(table);
    markName(cell, "wt-3");
    controller.syncSearchHighlights();
    const popup = openCounter(table);
    const oldClone = popup.querySelector<HTMLElement>('[data-name="wt-3"]')!;
    oldClone.classList.add("contextMenuActive");
    let cloneAttachedWhenHidden: boolean | null = null;
    vi.mocked(hideContextMenu).mockImplementation(() => {
      cloneAttachedWhenHidden = oldClone.isConnected;
    });

    // When: the mark moves from wt-3 to wt-5 and highlights are synchronised
    unmarkAll(cell);
    markName(cell, "wt-5");
    controller.syncSearchHighlights();

    // Then: the menu was hidden before the old clones were replaced; the same list shows new marks
    expect(hideContextMenu).toHaveBeenCalledTimes(1);
    expect(cloneAttachedWhenHidden).toBe(true);
    expect(popups()).toEqual([popup]);
    expect(popup.querySelectorAll('[data-name="wt-3"] .findMatch')).toHaveLength(0);
    expect(popup.querySelectorAll('[data-name="wt-5"] .findMatch')).toHaveLength(1);
    expect(popup.querySelectorAll(".findMatch")).toHaveLength(1);
  });

  it("does not duplicate right-click listeners across syncs (TC-093)", () => {
    // Case: TC-093
    // Given: an open list synchronised three times
    const { controller, table, onRefContextMenu } = setupTable([{ refs: ac01Refs(), head: true }]);
    const popup = openCounter(table);
    controller.syncSearchHighlights();
    controller.syncSearchHighlights();
    controller.syncSearchHighlights();

    // When: a clone is right-clicked once
    click(popup.children[0], "contextmenu");

    // Then: one call
    expect(onRefContextMenu).toHaveBeenCalledTimes(1);
  });

  it("never schedules a layout from a sync (TC-094)", () => {
    // Case: TC-094
    // Given: an open list
    const { controller, table } = setupTable([{ refs: ac01Refs(), head: true }]);
    openCounter(table);
    frames.requested = 0;

    // When: highlights are synchronised
    controller.syncSearchHighlights();

    // Then: no frame and the list stays
    expect(frames.requested).toBe(0);
    expect(popups()).toHaveLength(1);
  });

  it("never marks the counter itself (TC-095)", () => {
    // Case: TC-095
    // Given: a hidden ref whose text matches the counter text
    fixture.badgeOuter = { ...AC01_WIDTHS, "+4": 232.8 };
    const refs = ac01Refs() + headRef("+4");
    const { controller, table } = setupTable([{ refs, head: true }]);
    const cell = descriptionCell(table);
    markName(cell, "+4");

    // When: highlights are synchronised
    controller.syncSearchHighlights();

    // Then: the counter carries only the dedicated class, no findMatch at all
    const counter = counters(cell)[0];
    expect(counter.classList.contains("refOverflowMatch")).toBe(true);
    expect(counter.classList.contains("findMatch")).toBe(false);
    expect(counter.querySelectorAll(".findMatch")).toHaveLength(0);
  });

  it("shows every hidden ref with the current marks when opened (TC-096)", () => {
    // Case: TC-096 (AC-08)
    // Given: a hidden match
    const { table } = setupTable([{ refs: ac01Refs(), head: true }]);
    markName(descriptionCell(table), "wt-4");

    // When: the list is opened
    const popup = openCounter(table);

    // Then: all four clones are present and the matching one keeps its mark
    expect(listNames(popup)).toEqual(["wt-2", "wt-3", "wt-4", "wt-5"]);
    expect(popup.querySelectorAll('[data-name="wt-4"] span.findMatch')).toHaveLength(1);
  });

  it("re-syncs after a layout makes the matching ref visible (TC-097)", () => {
    // Case: TC-097
    // Given: a highlighted +4 row whose third ref (wt-2) carries the only mark
    const { controller, table } = setupTable([{ refs: ac01Refs(), head: true }]);
    const cell = descriptionCell(table);
    markName(cell, "wt-2");
    controller.syncSearchHighlights();
    expect(counters(cell)[0].classList.contains("refOverflowMatch")).toBe(true);

    // When: W widens to 1200 (B = 720: 613.3 + 30.7 fits, 846.1 + 30.7 does not)
    fixture.cellWidth = cellWidthFor(1200);
    latestObserver().notify();
    flushFrames();

    // Then: wt-2 is visible, +3 remains and the counter is no longer highlighted
    expect(visibleNames(cell)).toEqual(["main", "wt-1", "wt-2"]);
    const counter = counters(cell)[0];
    expect(counter.textContent).toBe("+3");
    expect(counter.classList.contains("refOverflowMatch")).toBe(false);
  });
});
