import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/*
 * The three stylesheets are read as text and their rules are indexed by selector. Only static
 * declarations are asserted here; theme rendering, narrow widths and real Tab movement (main-test
 * S9 TC-107 to TC-109, dropdown-test S2 TC-017, findwidget-test S2 TC-016) are manual webview
 * checks.
 */

const MEDIA_DIR = join(process.cwd(), "media");
const mainCss = readFileSync(join(MEDIA_DIR, "main.css"), "utf8");
const dropdownCss = readFileSync(join(MEDIA_DIR, "dropdown.css"), "utf8");
const findWidgetCss = readFileSync(join(MEDIA_DIR, "findwidget.css"), "utf8");

const FOCUS_OUTLINE = "2px solid var(--vscode-focusBorder)";
const INSIDE_ROW_OFFSET = "-2px";
const FIXED_COLOUR = /#[0-9a-f]{3,8}\b|rgba?\(/i;
const FOCUS_SELECTOR = /:focus/;
const FOCUS_PROPERTIES = /^(outline|box-shadow|border)/;

interface CssRule {
  readonly selectors: readonly string[];
  readonly declarations: ReadonlyMap<string, string>;
}

function parseRules(css: string): CssRule[] {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  // Keyframe blocks hold nested braces; they carry no focus declarations and are dropped.
  const withoutKeyframes = withoutComments.replace(
    /@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g,
    ""
  );
  return [...withoutKeyframes.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selectors: match[1]
      .split(",")
      .map((selector) => selector.trim())
      .filter((selector) => selector !== ""),
    declarations: new Map(
      match[2]
        .split(";")
        .map((declaration) => declaration.trim())
        .filter((declaration) => declaration !== "")
        .map((declaration) => {
          const colon = declaration.indexOf(":");
          return [declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim()];
        })
    )
  }));
}

const mainRules = parseRules(mainCss);
const dropdownRules = parseRules(dropdownCss);
const findWidgetRules = parseRules(findWidgetCss);

function rulesFor(rules: readonly CssRule[], selector: string): CssRule[] {
  return rules.filter((rule) => rule.selectors.includes(selector));
}

/** The winning value among same-selector rules (last declaration in source order). */
function declaration(rules: readonly CssRule[], selector: string, property: string): string | null {
  const matching = rulesFor(rules, selector);
  expect(matching.length, `rule for ${selector}`).toBeGreaterThan(0);
  const values = matching
    .map((rule) => rule.declarations.get(property))
    .filter((value): value is string => value !== undefined);
  return values.length === 0 ? null : values[values.length - 1];
}

function expectFocusOutline(rules: readonly CssRule[], selector: string): void {
  expect(declaration(rules, selector, "outline"), `outline of ${selector}`).toBe(FOCUS_OUTLINE);
}

describe("media/main.css focus frame, target marker, row states and focus-within (S9)", () => {
  // @see docs/testing/perspectives/media/main-test.md
  const ROW_FOCUS_SELECTOR = "#commitTable tr[tabindex]:focus-visible";
  const TARGET_MARKER_SELECTOR = "#commitTable tr.keyboardTarget td:first-child::before";
  const OPERABLE_FOCUS_SELECTORS = [
    "#commitTable:focus-visible",
    ".gitRefButton:focus-visible",
    ".refOverflowCounter:focus-visible",
    ".gitFileDiff:focus-visible",
    ".gitFileAction:focus-visible",
    ".gitFolder:focus-visible",
    "li.gitFile[tabindex]:focus-visible",
    ".parentHash:focus-visible",
    "#commitDetailsClose:focus-visible",
    "#commitDetails #fileViewToggle:focus-visible",
    "#branchCleanupBtn:focus-visible",
    "#searchBtn:focus-visible",
    "#fetchBtn:focus-visible",
    "#currentBtn:focus-visible",
    "#refreshBtn:focus-visible",
    '#contextMenu li[role="menuitem"]:focus-visible',
    'ul.contextMenuSubmenu li[role="menuitem"]:focus-visible',
    ".roundedBtn:focus-visible",
    ".tableColHeaderMenuBtn:focus-visible",
    "#pathHighlightClear:focus-visible",
    "#pathHighlightMode:focus-visible",
    "#pathHighlightBoundaries summary:focus-visible",
    '#dialog > table.dialogForm input[type="text"]:focus-visible',
    "#dialog > table.dialogForm select:focus-visible",
    'label > input[type="checkbox"]:focus-visible ~ .customCheckbox'
  ];
  const STATE_BACKGROUND_SELECTORS = [
    "#commitTable tr.commit.commitDetailsOpen td",
    "#commitTable tr.commit.compareTarget td",
    "#commitTable tr.commit.findMatch td",
    "#commitTable tr.commit.fileHistoryCurrent td"
  ];

  it("draws a 2px focusBorder outline on the row box and every operable control (TC-101)", () => {
    // Case: TC-101 (K45 / R4.8)
    // Given: media/main.css loaded as text
    // When: the :focus-visible outline declarations are read per operable selector
    // Then: the row frame is one continuous outline inset into the row (not per-cell boxes)
    expectFocusOutline(mainRules, ROW_FOCUS_SELECTOR);
    expect(declaration(mainRules, ROW_FOCUS_SELECTOR, "outline-offset")).toBe(INSIDE_ROW_OFFSET);
    // Then: refs, counters, files, folders, details, toolbar, bars, cleanup and menu items share it
    for (const selector of OPERABLE_FOCUS_SELECTORS) expectFocusOutline(mainRules, selector);
  });

  it("uses only the theme focusBorder variable in focus declarations (TC-102)", () => {
    // Case: TC-102 (Task 11 implementation item 2)
    // Given: every rule whose selector mentions focus
    const focusRules = mainRules.filter((rule) =>
      rule.selectors.some((selector) => FOCUS_SELECTOR.test(selector))
    );
    expect(focusRules.length).toBeGreaterThan(0);
    // When: their outline / box-shadow / border values are scanned
    for (const rule of focusRules) {
      for (const [property, value] of rule.declarations) {
        if (!FOCUS_PROPERTIES.test(property)) continue;
        // Then: no fixed hex / rgb colour appears in a focus declaration
        expect(value, `${rule.selectors.join(", ")} { ${property} }`).not.toMatch(FIXED_COLOUR);
      }
    }
  });

  it("marks the target row head with an arrow and keeps the description readable (TC-103)", () => {
    // Case: TC-103 (K45 / R4.8)
    // Given: the target row marker and the visually hidden description class
    // When: their declarations are read
    // Then: the first cell gets generated arrow content
    expect(declaration(mainRules, TARGET_MARKER_SELECTOR, "content")).toBe('"\\25B8"');
    // Then: the description is clipped to a 1px box, never removed from the accessibility tree
    expect(declaration(mainRules, ".visuallyHidden", "position")).toBe("absolute");
    expect(declaration(mainRules, ".visuallyHidden", "width")).toBe("1px");
    expect(declaration(mainRules, ".visuallyHidden", "height")).toBe("1px");
    expect(declaration(mainRules, ".visuallyHidden", "overflow")).toBe("hidden");
    expect(declaration(mainRules, ".visuallyHidden", "clip")).not.toBeNull();
    expect(declaration(mainRules, ".visuallyHidden", "display")).toBeNull();
    expect(declaration(mainRules, ".visuallyHidden", "visibility")).toBeNull();
  });

  it("keeps the existing state classes on properties the target marker does not use (TC-104)", () => {
    // Case: TC-104 (R4.8 "show several states at once")
    // Given: the details / compare / HEAD / find / history selectors from S3, S6 and S7
    // When: their declarations are read next to the target marker and the focus frame
    for (const selector of STATE_BACKGROUND_SELECTORS) {
      // Then: each state keeps its background declaration
      expect(declaration(mainRules, selector, "background-color"), selector).not.toBeNull();
    }
    expect(declaration(mainRules, "#commitGraph circle.current", "stroke-width")).toBe("2");
    // Then: the marker and the frame use content / outline, so all can show on one row
    expect(declaration(mainRules, TARGET_MARKER_SELECTOR, "background-color")).toBeNull();
    expect(declaration(mainRules, ROW_FOCUS_SELECTOR, "background-color")).toBeNull();
  });

  it("shows the file actions on focus-within exactly as on hover (TC-105)", () => {
    // Case: TC-105 (K45 / R4.3)
    // Given: the hover and focus-within file action selectors
    const hover = rulesFor(mainRules, ".gitFile:hover .gitFileActions");
    const focusWithin = rulesFor(mainRules, ".gitFile:focus-within .gitFileActions");
    // When: both rule sets are compared
    // Then: each exists and carries the same display declarations
    expect(hover).toHaveLength(1);
    expect(focusWithin).toHaveLength(1);
    expect([...focusWithin[0].declarations]).toEqual([...hover[0].declarations]);
    expect(hover[0].declarations.get("opacity")).toBe("1");
  });

  it("backs hidden, disabled and measuring elements with matching display rules (TC-106)", () => {
    // Case: TC-106 (Task 11 implementation item 2)
    // Given: the hidden panel, disabled controls and the ref measuring area
    // When: their declarations are read
    // Then: hidden is display none; disabled controls are dimmed; the measure is out of layout
    expect(declaration(mainRules, "#branchCleanupPanel[hidden]", "display")).toBe("none");
    expect(declaration(mainRules, ".refOverflowHidden", "display")).toBe("none");
    for (const selector of [
      "#currentBtn:disabled",
      ".branchCleanupActionBtn:disabled",
      "#fileHistoryBar button:disabled",
      "#dialog .roundedBtn:disabled"
    ]) {
      expect(declaration(mainRules, selector, "opacity"), selector).not.toBeNull();
    }
    expect(declaration(mainRules, ".gitFileDiff:disabled", "cursor")).toBe("default");
    expect(declaration(mainRules, ".refOverflowMeasure", "visibility")).toBe("hidden");
    expect(declaration(mainRules, ".refOverflowMeasure", "pointer-events")).toBe("none");
    expect(declaration(mainRules, ".refOverflowMeasure", "position")).toBe("fixed");
  });
});

describe("media/dropdown.css trigger, options, decorative checkbox and disabled state (S2)", () => {
  // @see docs/testing/perspectives/media/dropdown-test.md
  const TRIGGER = ".dropdownCurrentValue";
  const HINT_BUTTON = ".dropdownHintBtn";

  it("resets the native button look of the trigger and hint buttons (TC-013)", () => {
    // Case: TC-013 (K45)
    // Given: the trigger and hint button rules
    // When: their reset declarations are read
    // Then: font / colour inherit and the trigger keeps the former div's block box
    for (const selector of [TRIGGER, HINT_BUTTON]) {
      expect(declaration(dropdownRules, selector, "font"), selector).toBe("inherit");
      expect(declaration(dropdownRules, selector, "color"), selector).toBe("inherit");
      expect(declaration(dropdownRules, selector, "background-color"), selector).not.toBeNull();
      expect(declaration(dropdownRules, selector, "border"), selector).not.toBeNull();
      expect(declaration(dropdownRules, selector, "padding"), selector).not.toBeNull();
    }
    expect(declaration(dropdownRules, TRIGGER, "text-align")).toBe("left");
    expect(declaration(dropdownRules, TRIGGER, "display")).toBe("block");
    expect(declaration(dropdownRules, TRIGGER, "width")).toBe("100%");
  });

  it("outlines the trigger and the options with the inset focus frame (TC-014)", () => {
    // Case: TC-014 (K45)
    // Given: the trigger, option, hint button and filter input focus rules
    // When: outline declarations are read
    // Then: all use the 2px focusBorder; the clipped option draws it inside
    expectFocusOutline(dropdownRules, `${TRIGGER}:focus-visible`);
    expectFocusOutline(dropdownRules, ".dropdownOption:focus-visible");
    expectFocusOutline(dropdownRules, `${HINT_BUTTON}:focus-visible`);
    expectFocusOutline(dropdownRules, ".dropdownFilterInput:focus-visible");
    expect(declaration(dropdownRules, ".dropdownOption:focus-visible", "outline-offset")).toBe(
      INSIDE_ROW_OFFSET
    );
  });

  it("drives the decorative check mark from aria-selected without a hidden input (TC-015)", () => {
    // Case: TC-015 (K45 / A8.1-3)
    // Given: both stylesheets
    const allRules = [...dropdownRules, ...mainRules];
    // When: option checkbox selectors are scanned
    const hiddenInputRules = allRules.filter((rule) =>
      rule.selectors.some((selector) =>
        /\.dropdownOption[^,]*input\[type="checkbox"\]/.test(selector)
      )
    );
    // Then: no option-scoped checkbox input is styled and the mark follows aria-selected
    expect(hiddenInputRules).toEqual([]);
    expect(
      declaration(
        allRules,
        '.dropdownOption[aria-selected="true"] .customCheckbox:after',
        "display"
      )
    ).toBe("block");
    expect(
      declaration(allRules, ".dropdownOption:hover .customCheckbox", "background-color")
    ).not.toBeNull();
    expect(declaration(dropdownRules, ".dropdownCheckbox", "pointer-events")).toBe("none");
  });

  it("dims the disabled trigger and drops its pointer cursor (TC-016)", () => {
    // Case: TC-016 (K26 display side)
    // Given: the disabled trigger rule
    // When: its declarations are read
    // Then: cursor default and a dimmed opacity
    expect(declaration(dropdownRules, `${TRIGGER}:disabled`, "cursor")).toBe("default");
    expect(declaration(dropdownRules, `${TRIGGER}:disabled`, "opacity")).not.toBeNull();
  });
});

describe("media/findwidget.css button look, focus and pressed / disabled states (S2)", () => {
  // @see docs/testing/perspectives/media/findwidget-test.md
  const WIDGET_BUTTON = ".findWidget button";
  const ACTION_BUTTONS = ["#findPrev", "#findNext", "#findOpenCdv", "#findClose"];

  it("resets the native buttons to the former span look (TC-013)", () => {
    // Case: TC-013 (K45)
    // Given: the shared button reset and the modifier / action rules
    // When: their declarations are read
    // Then: the font and colour inherit, background and padding are reset
    expect(declaration(findWidgetRules, WIDGET_BUTTON, "font-family")).toBe("inherit");
    expect(declaration(findWidgetRules, WIDGET_BUTTON, "color")).toBe("inherit");
    expect(declaration(findWidgetRules, WIDGET_BUTTON, "background")).toBe("none");
    expect(declaration(findWidgetRules, WIDGET_BUTTON, "padding")).toBe("0");
    // Then: the modifier keeps its 22px box and transparent border; actions keep 22px and no border
    expect(declaration(findWidgetRules, ".findModifier", "width")).toBe("22px");
    expect(declaration(findWidgetRules, ".findModifier", "height")).toBe("22px");
    expect(declaration(findWidgetRules, ".findModifier", "border")).toBe("1px solid transparent");
    for (const selector of ACTION_BUTTONS) {
      expect(declaration(findWidgetRules, selector, "width"), selector).toBe("22px");
      expect(declaration(findWidgetRules, selector, "height"), selector).toBe("22px");
      expect(declaration(findWidgetRules, selector, "border"), selector).toBe("0");
    }
  });

  it("outlines every find button and the input with the focus frame (TC-014)", () => {
    // Case: TC-014 (K45)
    // Given: the button and input focus rules
    // When: outline declarations are read
    // Then: both use the 2px focusBorder
    expectFocusOutline(findWidgetRules, `${WIDGET_BUTTON}:focus-visible`);
    expectFocusOutline(findWidgetRules, "#findInput:focus-visible");
  });

  it("shows pressed state from aria-pressed as from .active and dims disabled buttons (TC-015)", () => {
    // Case: TC-015 (K40 / K45)
    // Given: the modifier pressed rules and the disabled rules
    const active = rulesFor(findWidgetRules, ".findModifier.active");
    const pressed = rulesFor(findWidgetRules, '.findModifier[aria-pressed="true"]');
    // When: both selectors are compared
    // Then: they share one rule, so either form gives the same look
    expect(active).toHaveLength(1);
    expect(pressed).toEqual(active);
    expect(active[0].declarations.get("background-color")).not.toBeUndefined();
    expect(rulesFor(findWidgetRules, '#findOpenCdv[aria-pressed="true"]')).toEqual(
      rulesFor(findWidgetRules, "#findOpenCdv.active")
    );
    // Then: disabled buttons are dimmed through the native state as well as the class
    expect(declaration(findWidgetRules, `${WIDGET_BUTTON}:disabled`, "opacity")).not.toBeNull();
    expect(declaration(findWidgetRules, "#findPrev:disabled", "opacity")).toBe(
      declaration(findWidgetRules, "#findPrev.disabled", "opacity")
    );
  });
});
