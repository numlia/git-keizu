import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const MEDIA_DIR = join(process.cwd(), "media");

const mainCss = readFileSync(join(MEDIA_DIR, "main.css"), "utf8");
const findWidgetCss = readFileSync(join(MEDIA_DIR, "findwidget.css"), "utf8");
const dropdownCss = readFileSync(join(MEDIA_DIR, "dropdown.css"), "utf8");

// Canonical layer values fixed by the plan (§3.2). Tests compare values extracted from the
// CSS files against this table, never test constants against each other.
const Z_INDEX_VARIABLES: ReadonlyArray<{ readonly name: string; readonly value: string }> = [
  { name: "--git-keizu-z-index-commit-graph", value: "-1" },
  { name: "--git-keizu-z-index-table-header", value: "11" },
  { name: "--git-keizu-z-index-controls", value: "12" },
  { name: "--git-keizu-z-index-context-menu", value: "15" },
  { name: "--git-keizu-z-index-context-submenu", value: "16" },
  { name: "--git-keizu-z-index-find-widget", value: "100" },
  { name: "--git-keizu-z-index-scroll-shadow", value: "200" },
  { name: "--git-keizu-z-index-dialog-backing", value: "210" },
  { name: "--git-keizu-z-index-dialog", value: "211" },
  { name: "--git-keizu-local-z-index-dropdown-menu", value: "100" }
];

// The 9 global layers in their required ascending order; the local dropdown variable is
// deliberately excluded from this comparison chain (§3.2).
const GLOBAL_LAYER_ASCENDING_ORDER: readonly string[] = [
  "--git-keizu-z-index-commit-graph",
  "--git-keizu-z-index-table-header",
  "--git-keizu-z-index-controls",
  "--git-keizu-z-index-context-menu",
  "--git-keizu-z-index-context-submenu",
  "--git-keizu-z-index-find-widget",
  "--git-keizu-z-index-scroll-shadow",
  "--git-keizu-z-index-dialog-backing",
  "--git-keizu-z-index-dialog"
];

const GLOBAL_VARIABLE_PREFIX = "--git-keizu-z-index-";

const escapeForRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const variableDefinition = (cssText: string, name: string): string | null => {
  const match = cssText.match(new RegExp(`${escapeForRegExp(name)}\\s*:\\s*([^;]+);`));
  return match === null ? null : match[1].trim();
};

const variableDefinitionCount = (cssText: string, name: string): number =>
  [...cssText.matchAll(new RegExp(`${escapeForRegExp(name)}\\s*:`, "g"))].length;

const numericVariableDefinition = (cssText: string, name: string): number => {
  const value = variableDefinition(cssText, name);
  if (value === null) {
    throw new Error(`definition of ${name} was not found`);
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    throw new Error(`definition of ${name} is not numeric: ${value}`);
  }
  return numeric;
};

const ruleBlock = (cssText: string, selector: string): string => {
  const match = cssText.match(new RegExp(`(?:^|\\n)${escapeForRegExp(selector)}\\s*\\{([^}]*)\\}`));
  if (match === null) {
    throw new Error(`rule block for selector "${selector}" was not found`);
  }
  return match[1];
};

const zIndexDeclarationValues = (cssText: string): string[] =>
  [...cssText.matchAll(/z-index\s*:\s*([^;]+);/g)].map((match) => match[1].trim());

const numericZIndexDeclarations = (cssText: string): string[] =>
  zIndexDeclarationValues(cssText).filter((value) => !value.startsWith("var("));

describe("media/main.css overlay layers", () => {
  // TC-014 to TC-019 are manual-only webview verifications (elementFromPoint hit testing,
  // pointer blocking, width <= 320px, dialog kinds, menu and scroll shadow coexistence);
  // see the Notes column in docs/testing/perspectives/media/main-test.md.

  it("defines the 10 named z-index layers with the canonical values (TC-001)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-001
    // Given: media/main.css loaded as text
    // When: each :root custom property definition is extracted by name
    for (const { name, value } of Z_INDEX_VARIABLES) {
      const definition = variableDefinition(mainCss, name);
      // Then: the definition exists and exactly matches the canonical value from §3.2
      expect(definition, `definition of ${name}`).not.toBeNull();
      expect(definition, `value of ${name}`).toBe(value);
    }
  });

  it("defines each z-index variable exactly once (TC-002)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-002
    // Given: the full text of media/main.css
    // When: definition occurrences (`--name:`) are counted per variable
    for (const { name } of Z_INDEX_VARIABLES) {
      // Then: each variable is defined exactly once (no last-wins redefinition)
      expect(variableDefinitionCount(mainCss, name), `definition count of ${name}`).toBe(1);
    }
  });

  it("references the commit graph layer variable from #commitGraph (TC-003)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-003
    // Given: the #commitGraph rule block in media/main.css
    const block = ruleBlock(mainCss, "#commitGraph");
    // When: its z-index declarations are extracted
    const declarations = zIndexDeclarationValues(block);
    // Then: the single declaration exactly matches the commit graph layer reference
    expect(declarations).toEqual(["var(--git-keizu-z-index-commit-graph)"]);
  });

  it("references the table header layer variable from .tableColHeader (TC-004)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-004
    // Given: the .tableColHeader rule block in media/main.css
    const block = ruleBlock(mainCss, ".tableColHeader");
    // When: its z-index declarations are extracted
    const declarations = zIndexDeclarationValues(block);
    // Then: the single declaration exactly matches the table header layer reference
    expect(declarations).toEqual(["var(--git-keizu-z-index-table-header)"]);
  });

  it("references the controls layer variable from #controls (TC-005)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-005
    // Given: the #controls rule block in media/main.css (stacking context for the dropdown)
    const block = ruleBlock(mainCss, "#controls");
    // When: its z-index declarations are extracted
    const declarations = zIndexDeclarationValues(block);
    // Then: the single declaration exactly matches the controls layer reference
    expect(declarations).toEqual(["var(--git-keizu-z-index-controls)"]);
  });

  it("references the context menu layer variable from #contextMenu (TC-006)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-006
    // Given: the #contextMenu rule block in media/main.css
    const block = ruleBlock(mainCss, "#contextMenu");
    // When: its z-index declarations are extracted
    const declarations = zIndexDeclarationValues(block);
    // Then: the single declaration exactly matches the context menu layer reference
    expect(declarations).toEqual(["var(--git-keizu-z-index-context-menu)"]);
  });

  it("references the context submenu layer variable from ul.contextMenuSubmenu (TC-007)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-007
    // Given: the ul.contextMenuSubmenu rule block in media/main.css
    const block = ruleBlock(mainCss, "ul.contextMenuSubmenu");
    // When: its z-index declarations are extracted
    const declarations = zIndexDeclarationValues(block);
    // Then: the single declaration exactly matches the context submenu layer reference
    expect(declarations).toEqual(["var(--git-keizu-z-index-context-submenu)"]);
  });

  it("references the scroll shadow layer variable from #scrollShadow.active (TC-008)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-008
    // Given: the #scrollShadow.active rule block in media/main.css
    const block = ruleBlock(mainCss, "#scrollShadow.active");
    // When: its z-index declarations are extracted
    const declarations = zIndexDeclarationValues(block);
    // Then: the single declaration exactly matches the scroll shadow layer reference
    expect(declarations).toEqual(["var(--git-keizu-z-index-scroll-shadow)"]);
  });

  it("references the dialog backing layer variable from #dialogBacking.active (TC-009)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-009
    // Given: the #dialogBacking.active rule block in media/main.css
    const block = ruleBlock(mainCss, "#dialogBacking.active");
    // When: its z-index declarations are extracted
    const declarations = zIndexDeclarationValues(block);
    // Then: the single declaration exactly matches the dialog backing layer reference
    expect(declarations).toEqual(["var(--git-keizu-z-index-dialog-backing)"]);
  });

  it("references the dialog layer variable from #dialog.active (TC-010)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-010
    // Given: the #dialog.active rule block in media/main.css
    const block = ruleBlock(mainCss, "#dialog.active");
    // When: its z-index declarations are extracted
    const declarations = zIndexDeclarationValues(block);
    // Then: the single declaration exactly matches the dialog layer reference
    expect(declarations).toEqual(["var(--git-keizu-z-index-dialog)"]);
  });

  it("keeps the 9 global layers in strictly ascending order (TC-011)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-011
    // Given: the 9 global layer values extracted from media/main.css (local dropdown excluded)
    const values = GLOBAL_LAYER_ASCENDING_ORDER.map((name) =>
      numericVariableDefinition(mainCss, name)
    );
    // When: each adjacent pair is compared numerically in §3.2 order
    for (let index = 0; index + 1 < values.length; index += 1) {
      const lower = GLOBAL_LAYER_ASCENDING_ORDER[index];
      const upper = GLOBAL_LAYER_ASCENDING_ORDER[index + 1];
      // Then: every adjacent comparison satisfies strict less-than
      expect(values[index], `${lower} < ${upper}`).toBeLessThan(values[index + 1]);
    }
  });

  it("keeps the dialog boundary above the scroll shadow (TC-012)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-012
    // Given: the scroll shadow, dialog backing, and dialog values extracted from media/main.css
    const scrollShadow = numericVariableDefinition(mainCss, "--git-keizu-z-index-scroll-shadow");
    const dialogBacking = numericVariableDefinition(mainCss, "--git-keizu-z-index-dialog-backing");
    const dialog = numericVariableDefinition(mainCss, "--git-keizu-z-index-dialog");
    // When: the three layer values are compared
    // Then: the backing exceeds the scroll shadow and the dialog exceeds the backing
    expect(dialogBacking, "dialog backing above scroll shadow").toBeGreaterThan(scrollShadow);
    expect(dialog, "dialog above dialog backing").toBeGreaterThan(dialogBacking);
  });

  it("contains no hard-coded numeric z-index declarations (TC-013)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-013
    // Given: every z-index declaration in media/main.css
    // When: declarations whose value does not start with "var(" are collected
    const numericDeclarations = numericZIndexDeclarations(mainCss);
    // Then: no numeric literal declarations remain
    expect(numericDeclarations).toEqual([]);
  });
});

describe("media/findwidget.css overlay layer", () => {
  // TC-003 is a manual-only webview verification (find state preserved across showing and
  // closing a dialog); see the Notes column in docs/testing/perspectives/media/findwidget-test.md.

  it("references the find widget layer variable exactly once from .findWidget (TC-001)", () => {
    // @see docs/testing/perspectives/media/findwidget-test.md
    // Case: TC-001
    // Given: the .findWidget rule block in media/findwidget.css
    const block = ruleBlock(findWidgetCss, ".findWidget");
    // When: its z-index declarations are extracted
    const declarations = zIndexDeclarationValues(block);
    // Then: exactly one declaration exists and matches the global find widget layer reference
    expect(declarations).toEqual(["var(--git-keizu-z-index-find-widget)"]);
  });

  it("contains no hard-coded numeric z-index declarations (TC-002)", () => {
    // @see docs/testing/perspectives/media/findwidget-test.md
    // Case: TC-002
    // Given: every z-index declaration in media/findwidget.css
    // When: declarations whose value does not start with "var(" are collected
    const numericDeclarations = numericZIndexDeclarations(findWidgetCss);
    // Then: the former "z-index: 100" literal has neither survived nor returned
    expect(numericDeclarations).toEqual([]);
  });
});

describe("media/dropdown.css local overlay layer", () => {
  it("references the local dropdown variable exactly once from .dropdownMenu (TC-001)", () => {
    // @see docs/testing/perspectives/media/dropdown-test.md
    // Case: TC-001
    // Given: the .dropdownMenu rule block in media/dropdown.css
    const block = ruleBlock(dropdownCss, ".dropdownMenu");
    // When: its z-index declarations are extracted
    const declarations = zIndexDeclarationValues(block);
    // Then: exactly one declaration exists and matches the local dropdown layer reference
    expect(declarations).toEqual(["var(--git-keizu-local-z-index-dropdown-menu)"]);
  });

  it("never references a global layer variable (TC-002)", () => {
    // @see docs/testing/perspectives/media/dropdown-test.md
    // Case: TC-002
    // Given: the full text of media/dropdown.css
    // When: occurrences of the global prefix "--git-keizu-z-index-" are counted
    const globalReferenceCount = [
      ...dropdownCss.matchAll(new RegExp(escapeForRegExp(GLOBAL_VARIABLE_PREFIX), "g"))
    ].length;
    // Then: the local dropdown layer never joins the global comparison chain
    expect(globalReferenceCount).toBe(0);
  });

  it("contains no hard-coded numeric z-index declarations (TC-003)", () => {
    // @see docs/testing/perspectives/media/dropdown-test.md
    // Case: TC-003
    // Given: every z-index declaration in media/dropdown.css
    // When: declarations whose value does not start with "var(" are collected
    const numericDeclarations = numericZIndexDeclarations(dropdownCss);
    // Then: the former "z-index: 100" literal has neither survived nor returned
    expect(numericDeclarations).toEqual([]);
  });
});
