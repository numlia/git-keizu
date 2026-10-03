// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { beforeAll, describe, expect, it, vi } from "vitest";

import { FileHistoryController } from "../../web/fileHistory";
import { PathHighlightController } from "../../web/pathHighlightController";

/*
 * The real media/main.css is parsed into rules and resolved per element by specificity and
 * source order, because jsdom neither lays out SVG nor resolves custom properties. TC-099 and
 * TC-100 (themes, narrow width, keyboard) stay manual in the real VS Code webview; see the
 * perspectives Notes.
 */

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const CSS_PATH = resolve(process.cwd(), "media/main.css");
const CLASS_MODE = "pathHighlightMode";
const CLASS_HISTORY_MODE = "fileHistoryMode";
const CLASS_SELECTED = "pathHighlightSelected";
const CLASS_RING = "pathHighlightRing";
const CLASS_BOUNDARY = "pathHighlightBoundary";
const SELECTED_LINE_WIDTH = "4px";
const SELECTED_SHADOW_WIDTH = "6px";
const SELECTED_OPACITY = "1";
const DIM_OPACITY = "0.35";
const HISTORY_DIM_OPACITY = "0.45";
const MARK_STROKE_WIDTH = "2px";
const FOCUS_BORDER = "var(--vscode-focusBorder)";
const EDITOR_BACKGROUND = "var(--vscode-editor-background)";
// Pre-existing graph declarations that the feature must not change.
const BASE_LINE_WIDTH = "2";
const BASE_SHADOW_WIDTH = "4";
const BASE_SHADOW_STROKE_OPACITY = "0.75";
const BASE_CURRENT_WIDTH = "2";
const PLAIN_CIRCLE_RULE =
  "#commitGraph circle:not(.current):not(.stashInner):not(.pathHighlightRing)";
const BAR_ID = "pathHighlightBar";
const BAR_SELECTOR = `#${BAR_ID}`;
const BAR_ACTIVE_SELECTOR = `#${BAR_ID}.active`;
const NAME_SELECTOR = "#pathHighlightName";
const CLEAR_SELECTOR = "#pathHighlightClear";

/* ------------------------------------------------------------------ */
/* Minimal cascade over the stylesheet text                           */
/* ------------------------------------------------------------------ */

interface CssRule {
  readonly selector: string;
  readonly declarations: ReadonlyMap<string, string>;
  readonly order: number;
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function parseDeclarations(block: string): Map<string, string> {
  const declarations = new Map<string, string>();
  for (const declaration of block.split(";")) {
    const colon = declaration.indexOf(":");
    if (colon === -1) continue;
    declarations.set(declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim());
  }
  return declarations;
}

/** Top-level `selector { declarations }` rules; at-rule blocks (keyframes) are skipped. */
function parseRules(css: string): CssRule[] {
  const rules: CssRule[] = [];
  const text = stripComments(css);
  let index = 0;
  let order = 0;
  while (index < text.length) {
    const open = text.indexOf("{", index);
    if (open === -1) break;
    const prelude = text.slice(index, open).trim();
    const close = findBlockEnd(text, open);
    if (prelude.startsWith("@")) {
      index = close + 1;
      continue;
    }
    const declarations = parseDeclarations(text.slice(open + 1, close));
    for (const selector of prelude.split(",")) {
      rules.push({ selector: selector.trim(), declarations, order });
      order++;
    }
    index = close + 1;
  }
  return rules;
}

function findBlockEnd(text: string, open: number): number {
  let depth = 0;
  for (let index = open; index < text.length; index++) {
    if (text[index] === "{") depth++;
    if (text[index] === "}") {
      depth--;
      if (depth === 0) return index;
    }
  }
  return text.length;
}

/** (ids, classes/attributes/pseudo-classes, types); `:not(...)` counts its argument. */
function specificity(selector: string): [number, number, number] {
  const flattened = selector.replace(/:not\(([^)]*)\)/g, " $1 ");
  const ids = (flattened.match(/#[\w-]+/g) ?? []).length;
  const classes = (flattened.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) ?? []).length;
  const types = (flattened.match(/(^|[\s>+~(])[a-zA-Z][\w-]*/g) ?? []).length;
  return [ids, classes, types];
}

function compareSpecificity(a: [number, number, number], b: [number, number, number]): number {
  for (let index = 0; index < a.length; index++) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

let rules: CssRule[] = [];
let customProperties = new Map<string, string>();

function matchingRules(elem: Element): CssRule[] {
  return rules.filter((rule) => elem.matches(rule.selector));
}

function resolveVariables(value: string): string {
  return value.replace(/var\((--git-keizu-[\w-]+)\)/g, (_match, name: string) => {
    const resolved = customProperties.get(name);
    expect(resolved, name).toBeDefined();
    return resolved!;
  });
}

/** Effective declaration of `property` for the element, or undefined when no rule declares it. */
function effective(elem: Element, property: string): string | undefined {
  let winner: { rule: CssRule; value: string } | null = null;
  for (const rule of matchingRules(elem)) {
    const value = rule.declarations.get(property);
    if (value === undefined) continue;
    if (
      winner === null ||
      compareSpecificity(specificity(rule.selector), specificity(winner.rule.selector)) >= 0
    ) {
      winner = { rule, value };
    }
  }
  return winner === null ? undefined : resolveVariables(winner.value);
}

function declarationsOf(selector: string): Map<string, string> {
  const rule = rules.find((candidate) => candidate.selector === selector);
  expect(rule, selector).toBeDefined();
  return new Map(rule!.declarations);
}

/* ------------------------------------------------------------------ */
/* Fixture DOM                                                        */
/* ------------------------------------------------------------------ */

interface GraphElements {
  svg: Element;
  group: Element;
  line: Element;
  shadow: Element;
  selectedLine: Element;
  selectedShadow: Element;
  ring: Element;
  boundary: Element;
  current: Element;
  plain: Element;
}

function graphWith(svgClasses: string[]): GraphElements {
  const host = document.createElement("div");
  host.id = "commitGraph";
  host.innerHTML = `<svg class="${svgClasses.join(" ")}"><g>
    <path class="shaddow"></path><path class="line"></path>
    <path class="shaddow ${CLASS_SELECTED}"></path><path class="line ${CLASS_SELECTED}"></path>
    <circle class="current"></circle><circle></circle>
    <circle class="${CLASS_RING}"></circle><rect class="${CLASS_BOUNDARY}"></rect>
  </g></svg>`;
  document.body.append(host);
  const pick = (selector: string): Element => {
    const elem = host.querySelector(selector);
    expect(elem, selector).not.toBeNull();
    return elem!;
  };
  return {
    svg: pick("svg"),
    group: pick("g"),
    shadow: pick(`path.shaddow:not(.${CLASS_SELECTED})`),
    line: pick(`path.line:not(.${CLASS_SELECTED})`),
    selectedShadow: pick(`path.shaddow.${CLASS_SELECTED}`),
    selectedLine: pick(`path.line.${CLASS_SELECTED}`),
    current: pick("circle.current"),
    plain: pick("circle:not([class])"),
    ring: pick(`circle.${CLASS_RING}`),
    boundary: pick(`rect.${CLASS_BOUNDARY}`)
  };
}

beforeAll(() => {
  const css = readFileSync(CSS_PATH, "utf-8");
  rules = parseRules(css);
  for (const rule of rules) {
    if (rule.selector !== ":root") continue;
    for (const [name, value] of rule.declarations) {
      if (name.startsWith("--")) customProperties.set(name, value);
    }
  }
});

/* ------------------------------------------------------------------ */
/* S8: graph emphasis, marks and bar layout                           */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/media/main-test.md
describe("path highlight graph and bar styles (S8)", () => {
  it("draws selected lines at 4px / 6px with full opacity and keeps the plain values (TC-095)", () => {
    // Case: TC-095
    // Given: a graph in path highlight mode and a plain graph
    const mode = graphWith([CLASS_MODE]);
    const plain = graphWith([]);

    // Then: selected line / shadow use the plan widths and opacity 1
    expect(effective(mode.selectedLine, "stroke-width")).toBe(SELECTED_LINE_WIDTH);
    expect(effective(mode.selectedLine, "opacity")).toBe(SELECTED_OPACITY);
    expect(effective(mode.selectedShadow, "stroke-width")).toBe(SELECTED_SHADOW_WIDTH);
    expect(effective(mode.selectedShadow, "opacity")).toBe(SELECTED_OPACITY);

    // Then: without the mode class the pre-existing declarations are in effect
    expect(effective(plain.line, "stroke-width")).toBe(BASE_LINE_WIDTH);
    expect(effective(plain.line, "opacity")).toBeUndefined();
    expect(effective(plain.shadow, "stroke-width")).toBe(BASE_SHADOW_WIDTH);
    expect(effective(plain.shadow, "stroke-opacity")).toBe(BASE_SHADOW_STROKE_OPACITY);
    expect(effective(plain.shadow, "opacity")).toBeUndefined();
    expect(effective(plain.selectedLine, "stroke-width")).toBe(BASE_LINE_WIDTH);
    expect(effective(plain.selectedShadow, "stroke-width")).toBe(BASE_SHADOW_WIDTH);
  });

  it.each([
    ["path highlight only", [CLASS_MODE], DIM_OPACITY],
    ["file history and path highlight", [CLASS_HISTORY_MODE, CLASS_MODE], DIM_OPACITY],
    ["file history only", [CLASS_HISTORY_MODE], HISTORY_DIM_OPACITY]
  ])("dims unselected lines to the mode value for %s (TC-096)", (_label, classes, expected) => {
    // Case: TC-096
    const graph = graphWith(classes);

    // Then: unselected line and shadow opacity per mode; no opacity on svg / g
    expect(effective(graph.line, "opacity")).toBe(expected);
    expect(effective(graph.shadow, "opacity")).toBe(expected);
    expect(effective(graph.svg, "opacity")).toBeUndefined();
    expect(effective(graph.group, "opacity")).toBeUndefined();
    if (classes.includes(CLASS_MODE)) {
      expect(effective(graph.selectedLine, "opacity")).toBe(SELECTED_OPACITY);
      expect(effective(graph.selectedLine, "stroke-width")).toBe(SELECTED_LINE_WIDTH);
      expect(effective(graph.selectedShadow, "opacity")).toBe(SELECTED_OPACITY);
    }
  });

  it.each([
    ["path highlight only", [CLASS_MODE]],
    ["file history and path highlight", [CLASS_HISTORY_MODE, CLASS_MODE]]
  ])("styles ring and square without the plain circle rule for %s (TC-097)", (_label, classes) => {
    // Case: TC-097
    const graph = graphWith(classes);

    // Then: ring and square are hollow focusBorder outlines, 2px wide
    for (const mark of [graph.ring, graph.boundary]) {
      expect(effective(mark, "fill")).toBe("none");
      expect(effective(mark, "stroke")).toBe(FOCUS_BORDER);
      expect(effective(mark, "stroke-width")).toBe(MARK_STROKE_WIDTH);
      expect(effective(mark, "stroke-opacity")).toBeUndefined();
      expect(effective(mark, "opacity")).toBeUndefined();
    }

    // Then: the plain circle rule excludes the ring and still applies to plain circles
    expect(graph.ring.matches(PLAIN_CIRCLE_RULE)).toBe(false);
    expect(graph.plain.matches(PLAIN_CIRCLE_RULE)).toBe(true);
    expect(declarationsOf(PLAIN_CIRCLE_RULE)).toEqual(
      new Map([
        ["stroke", EDITOR_BACKGROUND],
        ["stroke-width", "1"],
        ["stroke-opacity", "0.75"]
      ])
    );
    expect(effective(graph.plain, "stroke")).toBe(EDITOR_BACKGROUND);

    // Then: the HEAD circle declarations are the pre-existing ones
    expect(declarationsOf("#commitGraph circle.current")).toEqual(
      new Map([
        ["fill", EDITOR_BACKGROUND],
        ["stroke-width", BASE_CURRENT_WIDTH]
      ])
    );
    expect(effective(graph.current, "stroke-width")).toBe(BASE_CURRENT_WIDTH);
  });

  it("lays out the bar as a wrapping flex row between the controls and the history bar (TC-098)", () => {
    // Case: TC-098
    // Given: the bar declarations
    const hidden = declarationsOf(BAR_SELECTOR);
    const active = declarationsOf(BAR_ACTIVE_SELECTOR);
    const name = declarationsOf(NAME_SELECTOR);
    const clear = declarationsOf(CLEAR_SELECTOR);

    // Then: hidden by default, a wrapping flex row when active, no fixed height
    expect(hidden.get("display")).toBe("none");
    expect(active.get("display")).toBe("flex");
    expect(active.get("flex-wrap")).toBe("wrap");
    expect(active.get("align-items")).toBe("center");
    expect(active.get("flex-shrink")).toBe("0");
    expect(active.has("height")).toBe(false);
    expect(active.has("min-height")).toBe(false);
    expect(name.get("overflow-wrap")).toBe("anywhere");
    expect(name.get("min-width")).toBe("0");
    expect(clear.get("flex-shrink")).toBe("0");

    // Given: both real controllers constructed in the order main.ts uses
    document.body.innerHTML = '<div id="controls"></div><div id="scrollContainer"></div>';
    new FileHistoryController({
      getCommits: vi.fn(() => []),
      getCommitId: vi.fn(() => null),
      getCurrentRepo: vi.fn(() => "/repo"),
      getExpandedCommit: vi.fn(() => null),
      getScrollTop: vi.fn(() => 0),
      setScrollTop: vi.fn(),
      hideCommitDetails: vi.fn(),
      restoreExpandedCommit: vi.fn(() => true),
      scrollToCommit: vi.fn(),
      closeFindWidget: vi.fn(),
      setGraphHighlight: vi.fn()
    });
    new PathHighlightController({
      getCommits: () => [],
      getCurrentRepo: () => "/repo",
      setGraphHighlight: vi.fn()
    });

    // Then: controls -> pathHighlightBar -> fileHistoryBar -> scrollContainer
    const controls = document.getElementById("controls")!;
    expect(controls.nextElementSibling!.id).toBe(BAR_ID);
    expect(controls.nextElementSibling!.nextElementSibling!.id).toBe("fileHistoryBar");
    expect(controls.nextElementSibling!.nextElementSibling!.nextElementSibling!.id).toBe(
      "scrollContainer"
    );
  });
});
