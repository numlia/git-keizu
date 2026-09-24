// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const MEDIA_DIR = join(process.cwd(), "media");

const mainCss = readFileSync(join(MEDIA_DIR, "main.css"), "utf8");
const findWidgetCss = readFileSync(join(MEDIA_DIR, "findwidget.css"), "utf8");
const dropdownCss = readFileSync(join(MEDIA_DIR, "dropdown.css"), "utf8");

// Canonical layer values fixed by the plans (055-02 §3.2, plus the ref list layer 13 of 059-02
// §3.5). Tests compare values extracted from the CSS files against this table, never test
// constants against each other.
const Z_INDEX_VARIABLES: ReadonlyArray<{ readonly name: string; readonly value: string }> = [
  { name: "--git-keizu-z-index-commit-graph", value: "-1" },
  { name: "--git-keizu-z-index-table-header", value: "11" },
  { name: "--git-keizu-z-index-controls", value: "12" },
  { name: "--git-keizu-z-index-ref-overflow", value: "13" },
  { name: "--git-keizu-z-index-context-menu", value: "15" },
  { name: "--git-keizu-z-index-context-submenu", value: "16" },
  { name: "--git-keizu-z-index-find-widget", value: "100" },
  { name: "--git-keizu-z-index-scroll-shadow", value: "200" },
  { name: "--git-keizu-z-index-dialog-backing", value: "210" },
  { name: "--git-keizu-z-index-dialog", value: "211" },
  { name: "--git-keizu-local-z-index-dropdown-menu", value: "100" }
];

// The 10 global layers in their required ascending order; the local dropdown variable is
// deliberately excluded from this comparison chain (§3.2).
const GLOBAL_LAYER_ASCENDING_ORDER: readonly string[] = [
  "--git-keizu-z-index-commit-graph",
  "--git-keizu-z-index-table-header",
  "--git-keizu-z-index-controls",
  "--git-keizu-z-index-ref-overflow",
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

// S4 supersedes S1 (ref list layer 13 added); the S1 cases TC-001 to TC-013 continue as
// TC-043 to TC-057 below.
describe("media/main.css overlay layers (S4)", () => {
  // TC-058 to TC-064 are manual-only webview verifications (elementFromPoint hit testing,
  // pointer blocking, width <= 320px, dialog kinds, menu and scroll shadow coexistence, the
  // ref list over the header and controls); see docs/testing/perspectives/media/main-test.md.

  it("defines the 11 named z-index layers with the canonical values (TC-043)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-043
    // Given: media/main.css loaded as text
    // When: each :root custom property definition is extracted by name
    for (const { name, value } of Z_INDEX_VARIABLES) {
      const definition = variableDefinition(mainCss, name);
      // Then: the definition exists and exactly matches the canonical value (13 added, others kept)
      expect(definition, `definition of ${name}`).not.toBeNull();
      expect(definition, `value of ${name}`).toBe(value);
    }
  });

  it("defines each z-index variable exactly once (TC-044)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-044
    // Given: the full text of media/main.css
    // When: definition occurrences (`--name:`) are counted per variable
    for (const { name } of Z_INDEX_VARIABLES) {
      // Then: each variable is defined exactly once (no last-wins redefinition)
      expect(variableDefinitionCount(mainCss, name), `definition count of ${name}`).toBe(1);
    }
  });

  it("references the commit graph layer variable from #commitGraph (TC-045)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-045
    // Given: the #commitGraph rule block in media/main.css
    const block = ruleBlock(mainCss, "#commitGraph");
    // When: its z-index declarations are extracted
    const declarations = zIndexDeclarationValues(block);
    // Then: the single declaration exactly matches the commit graph layer reference
    expect(declarations).toEqual(["var(--git-keizu-z-index-commit-graph)"]);
  });

  it("references the table header layer variable from .tableColHeader (TC-046)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-046
    // Given: the .tableColHeader rule block in media/main.css
    const block = ruleBlock(mainCss, ".tableColHeader");
    // When: its z-index declarations are extracted
    const declarations = zIndexDeclarationValues(block);
    // Then: the single declaration exactly matches the table header layer reference
    expect(declarations).toEqual(["var(--git-keizu-z-index-table-header)"]);
  });

  it("references the controls layer variable from #controls (TC-047)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-047
    // Given: the #controls rule block in media/main.css (stacking context for the dropdown)
    const block = ruleBlock(mainCss, "#controls");
    // When: its z-index declarations are extracted
    const declarations = zIndexDeclarationValues(block);
    // Then: the single declaration exactly matches the controls layer reference
    expect(declarations).toEqual(["var(--git-keizu-z-index-controls)"]);
  });

  it("references the context menu layer variable from #contextMenu (TC-048)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-048
    // Given: the #contextMenu rule block in media/main.css
    const block = ruleBlock(mainCss, "#contextMenu");
    // When: its z-index declarations are extracted
    const declarations = zIndexDeclarationValues(block);
    // Then: the single declaration exactly matches the context menu layer reference
    expect(declarations).toEqual(["var(--git-keizu-z-index-context-menu)"]);
  });

  it("references the context submenu layer variable from ul.contextMenuSubmenu (TC-049)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-049
    // Given: the ul.contextMenuSubmenu rule block in media/main.css
    const block = ruleBlock(mainCss, "ul.contextMenuSubmenu");
    // When: its z-index declarations are extracted
    const declarations = zIndexDeclarationValues(block);
    // Then: the single declaration exactly matches the context submenu layer reference
    expect(declarations).toEqual(["var(--git-keizu-z-index-context-submenu)"]);
  });

  it("references the scroll shadow layer variable from #scrollShadow.active (TC-050)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-050
    // Given: the #scrollShadow.active rule block in media/main.css
    const block = ruleBlock(mainCss, "#scrollShadow.active");
    // When: its z-index declarations are extracted
    const declarations = zIndexDeclarationValues(block);
    // Then: the single declaration exactly matches the scroll shadow layer reference
    expect(declarations).toEqual(["var(--git-keizu-z-index-scroll-shadow)"]);
  });

  it("references the dialog backing layer variable from #dialogBacking.active (TC-051)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-051
    // Given: the #dialogBacking.active rule block in media/main.css
    const block = ruleBlock(mainCss, "#dialogBacking.active");
    // When: its z-index declarations are extracted
    const declarations = zIndexDeclarationValues(block);
    // Then: the single declaration exactly matches the dialog backing layer reference
    expect(declarations).toEqual(["var(--git-keizu-z-index-dialog-backing)"]);
  });

  it("references the dialog layer variable from #dialog.active (TC-052)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-052
    // Given: the #dialog.active rule block in media/main.css
    const block = ruleBlock(mainCss, "#dialog.active");
    // When: its z-index declarations are extracted
    const declarations = zIndexDeclarationValues(block);
    // Then: the single declaration exactly matches the dialog layer reference
    expect(declarations).toEqual(["var(--git-keizu-z-index-dialog)"]);
  });

  it("references the ref list layer variable from .refOverflowPopup (TC-053)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-053
    // Given: the .refOverflowPopup rule block in media/main.css
    const block = ruleBlock(mainCss, ".refOverflowPopup");
    // When: its z-index declarations are extracted
    const declarations = zIndexDeclarationValues(block);
    // Then: the single declaration exactly matches the ref list layer reference
    expect(declarations).toEqual(["var(--git-keizu-z-index-ref-overflow)"]);
  });

  it("keeps the 10 global layers in strictly ascending order (TC-054)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-054
    // Given: the 10 global layer values extracted from media/main.css (local dropdown excluded)
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

  it("places the ref list above the controls and below the context menu (TC-055)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-055
    // Given: the controls, ref list and context menu values extracted from media/main.css
    const controls = numericVariableDefinition(mainCss, "--git-keizu-z-index-controls");
    const refOverflow = numericVariableDefinition(mainCss, "--git-keizu-z-index-ref-overflow");
    const contextMenu = numericVariableDefinition(mainCss, "--git-keizu-z-index-context-menu");
    // When/Then: 12 < 13 < 15
    expect(refOverflow, "ref list above controls").toBeGreaterThan(controls);
    expect(refOverflow, "ref list below context menu").toBeLessThan(contextMenu);
  });

  it("keeps the dialog boundary above the scroll shadow (TC-056)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-056
    // Given: the scroll shadow, dialog backing, and dialog values extracted from media/main.css
    const scrollShadow = numericVariableDefinition(mainCss, "--git-keizu-z-index-scroll-shadow");
    const dialogBacking = numericVariableDefinition(mainCss, "--git-keizu-z-index-dialog-backing");
    const dialog = numericVariableDefinition(mainCss, "--git-keizu-z-index-dialog");
    // When: the three layer values are compared
    // Then: the backing exceeds the scroll shadow and the dialog exceeds the backing
    expect(dialogBacking, "dialog backing above scroll shadow").toBeGreaterThan(scrollShadow);
    expect(dialog, "dialog above dialog backing").toBeGreaterThan(dialogBacking);
  });

  it("contains no hard-coded numeric z-index declarations (TC-057)", () => {
    // @see docs/testing/perspectives/media/main-test.md
    // Case: TC-057
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

// S2: branch cleanup panel のレイアウト契約（40vh・縦横 scroll・flex 縮退）
// @see docs/testing/perspectives/media/main-test.md
describe("media/main.css branch cleanup panel layout (S2)", () => {
  // TC-026 and TC-027 are manual-only webview verifications (flex layout heights at a
  // width <= 320px and real scroll behavior are not resolved by jsdom); see the Notes
  // column in docs/testing/perspectives/media/main-test.md.

  it("caps the panel height at 40vh (TC-020)", () => {
    // Case: TC-020
    // Given: the #branchCleanupPanel rule block in media/main.css
    const block = ruleBlock(mainCss, "#branchCleanupPanel");

    // When/Then: the max-height declaration exists with the 40vh cap
    expect(block).toContain("max-height: 40vh;");
  });

  it("declares scrolling on both axes of the panel (TC-021)", () => {
    // Case: TC-021
    // Given: the #branchCleanupPanel rule block in media/main.css
    const block = ruleBlock(mainCss, "#branchCleanupPanel");

    // When/Then: both overflow axes are declared as auto
    expect(block).toContain("overflow-x: auto;");
    expect(block).toContain("overflow-y: auto;");
  });

  it("allows the panel to shrink inside the vertical flex column (TC-022)", () => {
    // Case: TC-022
    // Given: the #branchCleanupPanel rule block in media/main.css
    const block = ruleBlock(mainCss, "#branchCleanupPanel");

    // When/Then: the min-height: 0 declaration exists
    expect(block).toContain("min-height: 0;");
  });

  it("keeps the table cells on one line for horizontal scrolling (TC-023)", () => {
    // Case: TC-023
    // Given: the panel th / td rule block in media/main.css
    const block = ruleBlock(mainCss, "#branchCleanupPanel th,\n#branchCleanupPanel td");

    // When/Then: the white-space: nowrap declaration exists
    expect(block).toContain("white-space: nowrap;");
  });

  it("declares sticky header and action column with theme colors (TC-024)", () => {
    // Case: TC-024
    // Given: the header and action column rule blocks in media/main.css
    const headerBlock = ruleBlock(mainCss, "#branchCleanupPanel th");
    const actionBlock = ruleBlock(
      mainCss,
      "#branchCleanupPanel th.branchCleanupActionCell,\n#branchCleanupPanel td.branchCleanupActionCell"
    );

    // When/Then: both are sticky and use an existing theme color variable as background
    expect(headerBlock).toContain("position: sticky;");
    expect(headerBlock).toContain("background-color: var(--vscode-");
    expect(actionBlock).toContain("position: sticky;");
    expect(actionBlock).toContain("background-color: var(--vscode-");
  });

  it("keeps the 055-02 z-index layer contract untouched (TC-025)", () => {
    // Case: TC-025
    // Given: every z-index declaration and layer variable in media/main.css
    // When: numeric literals and the canonical layer definitions are checked again
    const numericDeclarations = numericZIndexDeclarations(mainCss);

    // Then: no numeric z-index literal was introduced and every layer value is unchanged
    expect(numericDeclarations).toEqual([]);
    for (const { name, value } of Z_INDEX_VARIABLES) {
      expect(variableDefinition(mainCss, name), `value of ${name}`).toBe(value);
    }
  });
});

// Comment-free CSS text so selector lists can be matched without commentary noise.
const mainCssWithoutComments = mainCss.replace(/\/\*[\s\S]*?\*\//g, "");

/** Bodies of every rule whose selector list contains `selector` as one entry. */
const ruleBodiesFor = (selector: string): string[] => {
  const bodies: string[] = [];
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = rulePattern.exec(mainCssWithoutComments)) !== null) {
    const selectors = match[1].split(",").map((s) => s.trim());
    if (selectors.includes(selector)) bodies.push(match[2]);
  }
  return bodies;
};

const hasDeclarationFor = (selector: string, declaration: string): boolean =>
  ruleBodiesFor(selector).some((body) => body.includes(`${declaration};`));

// @see docs/testing/perspectives/media/main-test.md
describe("media/main.css file history declarations (S3)", () => {
  it("hides the file history bar by default (TC-028)", () => {
    // Case: TC-028
    // Given: the #fileHistoryBar rule
    // When/Then: display: none exists
    expect(hasDeclarationFor("#fileHistoryBar", "display: none")).toBe(true);
  });

  it("shows the active bar as a wrapping flex row that does not shrink (TC-029)", () => {
    // Case: TC-029
    // Given: the #fileHistoryBar.active rule
    // When/Then: display: flex, flex-wrap: wrap and flex-shrink: 0 exist
    expect(hasDeclarationFor("#fileHistoryBar.active", "display: flex")).toBe(true);
    expect(hasDeclarationFor("#fileHistoryBar.active", "flex-wrap: wrap")).toBe(true);
    expect(hasDeclarationFor("#fileHistoryBar.active", "flex-shrink: 0")).toBe(true);
  });

  it("lets the path element shrink and wrap anywhere (TC-030)", () => {
    // Case: TC-030
    // Given: the #fileHistoryPath rule
    // When/Then: min-width: 0 and overflow-wrap: anywhere exist
    expect(hasDeclarationFor("#fileHistoryPath", "min-width: 0")).toBe(true);
    expect(hasDeclarationFor("#fileHistoryPath", "overflow-wrap: anywhere")).toBe(true);
  });

  it("disables prev / next while loading (TC-031)", () => {
    // Case: TC-031
    // Given: the loading selectors for both buttons
    // When/Then: pointer-events: none and opacity: 0.4 exist on both
    for (const selector of [
      "#fileHistoryBar.loading #fileHistoryPrev",
      "#fileHistoryBar.loading #fileHistoryNext"
    ]) {
      expect(hasDeclarationFor(selector, "pointer-events: none")).toBe(true);
      expect(hasDeclarationFor(selector, "opacity: 0.4")).toBe(true);
    }
  });

  it("groups the match row with the find match declaration (TC-032)", () => {
    // Case: TC-032
    // Given: the findMatch and fileHistoryMatch td selectors
    const matchBodies = ruleBodiesFor("#commitTable tr.commit.fileHistoryMatch td");

    // When/Then: they share one block with the 0.1 alpha background
    expect(matchBodies).toHaveLength(1);
    expect(matchBodies).toEqual(ruleBodiesFor("#commitTable tr.commit.findMatch td"));
    expect(matchBodies[0]).toContain("background-color: rgba(234, 92, 0, 0.1);");
  });

  it("groups the current row with the find current declaration and adds a focus ring (TC-033)", () => {
    // Case: TC-033
    // Given: the findCurrentCommit and fileHistoryCurrent td selectors
    const currentBodies = ruleBodiesFor("#commitTable tr.commit.fileHistoryCurrent td");

    // When/Then: they share one block with the 0.25 alpha background and the first cell has the ring
    expect(currentBodies).toHaveLength(1);
    expect(currentBodies).toEqual(ruleBodiesFor("#commitTable tr.commit.findCurrentCommit td"));
    expect(currentBodies[0]).toContain("background-color: rgba(234, 92, 0, 0.25);");
    expect(
      hasDeclarationFor(
        "#commitTable tr.commit.fileHistoryCurrent td:first-child",
        "box-shadow: inset 2px 0 var(--vscode-focusBorder)"
      )
    ).toBe(true);
  });

  it("dims non-match rows to opacity 0.3 (TC-034)", () => {
    // Case: TC-034
    // Given: the dim row cell selectors
    // When/Then: opacity: 0.3 exists on the message cell and the remaining cells
    expect(
      hasDeclarationFor("#commitTable tr.commit.fileHistoryDim td:nth-child(2)", "opacity: 0.3")
    ).toBe(true);
    expect(
      hasDeclarationFor("#commitTable tr.commit.fileHistoryDim td:nth-child(n + 3)", "opacity: 0.3")
    ).toBe(true);
  });

  it("restores muted match rows to opacity 1 in the existing mute block (TC-035)", () => {
    // Case: TC-035
    // Given: the existing mute restore block (commitDetailsOpen)
    const muteRestore = ruleBodiesFor(
      "#commitTable tr.commit.mute:not(.fileHistoryDim).commitDetailsOpen td:nth-child(n + 3)"
    );

    // When/Then: both fileHistoryMatch selectors are in that same opacity: 1 block
    expect(muteRestore).toHaveLength(1);
    expect(muteRestore[0]).toContain("opacity: 1;");
    expect(
      ruleBodiesFor("#commitTable tr.commit.mute.fileHistoryMatch td:nth-child(2) .commitMessage")
    ).toEqual(muteRestore);
    expect(
      ruleBodiesFor("#commitTable tr.commit.mute.fileHistoryMatch td:nth-child(n + 3)")
    ).toEqual(muteRestore);
  });

  it("declares the graph opacity and focus ring under svg.fileHistoryMode (TC-036)", () => {
    // Case: TC-036
    // Given: the mode-scoped graph selectors
    // When/Then: paths and dim circles are 0.45, matches are 1, the current circle has the ring
    for (const selector of [
      "#commitGraph svg.fileHistoryMode path.shaddow",
      "#commitGraph svg.fileHistoryMode path.line",
      "#commitGraph svg.fileHistoryMode circle.fileHistoryDim"
    ]) {
      expect(hasDeclarationFor(selector, "opacity: 0.45")).toBe(true);
    }
    expect(
      hasDeclarationFor("#commitGraph svg.fileHistoryMode circle.fileHistoryMatch", "opacity: 1")
    ).toBe(true);
    expect(
      hasDeclarationFor(
        "#commitGraph svg.fileHistoryMode circle.fileHistoryCurrent",
        "stroke: var(--vscode-focusBorder)"
      )
    ).toBe(true);
    expect(
      hasDeclarationFor(
        "#commitGraph svg.fileHistoryMode circle.fileHistoryCurrent",
        "stroke-width: 2px"
      )
    ).toBe(true);
  });

  it("highlights the matching file row in the commit details view (TC-037)", () => {
    // Case: TC-037
    // Given: the .gitFile.fileHistoryCurrent rule
    // When/Then: the 0.25 alpha background exists
    expect(
      hasDeclarationFor(".gitFile.fileHistoryCurrent", "background-color: rgba(234, 92, 0, 0.25)")
    ).toBe(true);
  });

  it("styles the first parent diff note as italic and slightly faded (TC-038)", () => {
    // Case: TC-038
    // Given: the .fileHistoryNote rule
    // When/Then: font-style: italic and opacity: 0.8 exist
    expect(hasDeclarationFor(".fileHistoryNote", "font-style: italic")).toBe(true);
    expect(hasDeclarationFor(".fileHistoryNote", "opacity: 0.8")).toBe(true);
  });

  it("keeps the existing find, mute and z-index contracts unchanged (TC-039)", () => {
    // Case: TC-039
    // Given: the pre-existing find / mute declarations and the layer variables
    // When/Then: their values are unchanged and no numeric z-index literal appeared
    expect(
      hasDeclarationFor(
        "#commitTable tr.commit.findMatch td",
        "background-color: rgba(234, 92, 0, 0.1)"
      )
    ).toBe(true);
    expect(
      hasDeclarationFor(
        "#commitTable tr.commit.findCurrentCommit td",
        "background-color: rgba(234, 92, 0, 0.25)"
      )
    ).toBe(true);
    expect(
      hasDeclarationFor(
        "#commitTable tr.commit.mute:not(.fileHistoryDim) td:nth-child(n + 3)",
        "opacity: 0.5"
      )
    ).toBe(true);
    expect(numericZIndexDeclarations(mainCss)).toEqual([]);
    for (const { name, value } of Z_INDEX_VARIABLES) {
      expect(variableDefinition(mainCss, name), `value of ${name}`).toBe(value);
    }
  });
});

// @see docs/testing/perspectives/media/main-test.md
describe("media/main.css mute and file history applicability (S3)", () => {
  const createFixture = () => {
    const style = document.createElement("style");
    style.textContent = mainCss;
    document.head.replaceChildren(style);
    const container = document.createElement("div");
    container.id = "commitTable";
    const table = document.createElement("table");
    const row = table.insertRow();
    const cells = Array.from({ length: 5 }, () => row.insertCell());
    const message = document.createElement("span");
    message.className = "commitMessage";
    const label = document.createElement("span");
    label.className = "gitRef";
    cells[1].append(label, message);
    container.append(table);
    document.body.replaceChildren(container);
    if (style.sheet === null) throw new Error("main.css stylesheet was not loaded");
    const rules = Array.from(style.sheet.cssRules).filter(
      (rule): rule is CSSStyleRule => rule.type === CSSRule.STYLE_RULE
    );

    // Inspect selector applicability, not jsdom's incomplete cascade implementation.
    const opacityDeclarations = (element: Element): string[] =>
      rules
        .filter((rule) => element.matches(rule.selectorText))
        .map((rule) => rule.style.getPropertyValue("opacity"))
        .filter((value) => value !== "");

    return { row, cells, message, label, opacityDeclarations };
  };

  it("applies only cell dimming regardless of mute or active row state (TC-040)", () => {
    // Case: TC-040
    // Given: dim rows with optional mute and detail / defensive Find state
    const { row, cells, message, label, opacityDeclarations } = createFixture();
    for (const mute of ["", "mute"]) {
      for (const active of ["", "commitDetailsOpen", "findCurrentCommit"]) {
        // When: the actual CSS selectors are matched against each row state
        row.className = `commit fileHistoryDim ${mute} ${active}`;
        // Then: no competing or child opacity can override or multiply the dim value
        for (const cell of cells.slice(1)) {
          expect(opacityDeclarations(cell), row.className).toEqual(["0.3"]);
        }
        for (const element of [cells[0], message, label]) {
          expect(opacityDeclarations(element), row.className).toEqual([]);
        }
      }
    }
  });

  it("preserves ordinary mute and detail, Find, and match restoration (TC-041)", () => {
    // Case: TC-041
    // Given: non-dim muted rows, optionally restored by an active state
    const { row, cells, message, label, opacityDeclarations } = createFixture();
    for (const active of [
      "",
      "commitDetailsOpen",
      "findCurrentCommit",
      "fileHistoryMatch",
      "fileHistoryMatch fileHistoryCurrent"
    ]) {
      // When: the actual CSS selectors are matched against the state
      row.className = `commit mute ${active}`;
      // Then: restoration follows ordinary mute and never dims the label or graph cell
      const expected = active === "" ? ["0.5"] : ["0.5", "1"];
      for (const element of [message, ...cells.slice(2)]) {
        expect(opacityDeclarations(element), row.className).toEqual(expected);
      }
      for (const element of [cells[0], cells[1], label]) {
        expect(opacityDeclarations(element), row.className).toEqual([]);
      }
    }
  });

  it("restores mute automatically when file history classes are removed (TC-042)", () => {
    // Case: TC-042
    // Given: muted dim, matching, or current rows with optional open details
    const { row, cells, message, opacityDeclarations } = createFixture();
    for (const history of [
      "fileHistoryDim",
      "fileHistoryMatch",
      "fileHistoryMatch fileHistoryCurrent"
    ]) {
      for (const active of ["", "commitDetailsOpen"]) {
        row.className = `commit mute ${history} ${active}`;
        // When: file history exits while mute and detail state remain
        row.classList.remove("fileHistoryDim", "fileHistoryMatch", "fileHistoryCurrent");
        // Then: normal mute applies again, with restoration only for open details
        const expected = active === "" ? ["0.5"] : ["0.5", "1"];
        for (const element of [message, ...cells.slice(2)]) {
          expect(opacityDeclarations(element), row.className).toEqual(expected);
        }
        expect(opacityDeclarations(cells[1]), row.className).toEqual([]);
      }
    }
  });
});

/** Declarations of one rule block as property → value (comments removed). */
const declarationsOf = (block: string): Map<string, string> =>
  new Map(
    block
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split(";")
      .map((declaration) => declaration.trim())
      .filter((declaration) => declaration.includes(":"))
      .map((declaration) => {
        const colon = declaration.indexOf(":");
        return [declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim()];
      })
  );

// S5: ref折り畳みのcounter・一覧・計測領域・横スクロールの表示契約
// @see docs/testing/perspectives/media/main-test.md
describe("media/main.css ref overflow declarations (S5)", () => {
  // TC-073 to TC-076 are manual real-browser verifications (folding, horizontal scroll, list
  // scrolling at the viewport edges, re-measurement after resize / zoom / font / theme / reload);
  // the text checks below are not a substitute. See docs/testing/perspectives/media/main-test.md.

  it("removes hidden original refs from the layout (TC-065)", () => {
    // Case: TC-065
    // Given/When: the .refOverflowHidden rule
    const declarations = declarationsOf(ruleBlock(mainCss, ".refOverflowHidden"));

    // Then: display none
    expect(declarations.get("display")).toBe("none");
  });

  it("mirrors the .gitRef box metrics on the counter (TC-066)", () => {
    // Case: TC-066 (AC-16)
    // Given: the .refOverflowCounter and .gitRef rules
    const counter = declarationsOf(ruleBlock(mainCss, ".refOverflowCounter"));
    const gitRef = declarationsOf(ruleBlock(mainCss, ".gitRef"));
    const mirrored = [
      "height",
      "line-height",
      "font-size",
      "margin-top",
      "margin-right",
      "border",
      "border-radius",
      "vertical-align"
    ];

    // When/Then: each mirrored property has the same value, and the button defaults are reset
    for (const property of mirrored) {
      expect(gitRef.get(property), `.gitRef ${property}`).toBeDefined();
      expect(counter.get(property), `.refOverflowCounter ${property}`).toBe(gitRef.get(property));
    }
    expect(counter.get("font-family")).toBe("inherit");
    expect(counter.get("padding")).toBe("0 5px");
  });

  it("highlights a hidden match with the find match orange (TC-067)", () => {
    // Case: TC-067 (AC-08)
    // Given/When: the .refOverflowCounter.refOverflowMatch rule
    const declarations = declarationsOf(ruleBlock(mainCss, ".refOverflowCounter.refOverflowMatch"));

    // Then: background and border use the existing rgba(234, 92, 0, …) family
    expect(declarations.get("background-color")).toMatch(/^rgba\(234, 92, 0, /);
    expect(declarations.get("border-color")).toMatch(/^rgba\(234, 92, 0, /);
  });

  it("keeps the list fixed inside the viewport and scrollable (TC-068)", () => {
    // Case: TC-068 (AC-15)
    // Given/When: the .refOverflowPopup rule
    const declarations = declarationsOf(ruleBlock(mainCss, ".refOverflowPopup"));

    // Then: fixed, scrollable on both axes and capped by the viewport
    expect(declarations.get("position")).toBe("fixed");
    expect(declarations.get("overflow")).toBe("auto");
    expect(declarations.get("max-width")).toBe("100vw");
    expect(declarations.get("max-height")).toBe("100vh");
  });

  it("lays out one full-width badge per line in the list (TC-069)", () => {
    // Case: TC-069 (AC-15)
    // Given: the list rule and the rule for refs inside it
    const list = declarationsOf(ruleBlock(mainCss, ".refOverflowPopup"));
    const item = declarationsOf(ruleBodiesFor(".refOverflowPopup .gitRef").join(";"));

    // When/Then: a vertical flex column of unwrapped, max-content badges
    expect(list.get("display")).toBe("flex");
    expect(list.get("flex-direction")).toBe("column");
    expect(item.get("white-space")).toBe("nowrap");
    expect(item.get("width")).toBe("max-content");
  });

  it("keeps the measuring area invisible and inert (TC-070)", () => {
    // Case: TC-070
    // Given/When: the .refOverflowMeasure rule
    const declarations = declarationsOf(ruleBlock(mainCss, ".refOverflowMeasure"));

    // Then: hidden, not interactive, out of flow and at its natural width
    expect(declarations.get("visibility")).toBe("hidden");
    expect(declarations.get("pointer-events")).toBe("none");
    expect(["absolute", "fixed"]).toContain(declarations.get("position"));
    expect(declarations.get("width")).toBe("max-content");
    expect(declarations.get("white-space")).toBe("nowrap");
  });

  it("scrolls the table area horizontally while keeping the vertical contract (TC-071)", () => {
    // Case: TC-071 (AC-12)
    // Given/When: the #scrollContainer rule
    const declarations = declarationsOf(ruleBlock(mainCss, "#scrollContainer"));

    // Then: horizontal auto scroll plus the existing vertical scroll and min-height
    expect(declarations.get("overflow-x")).toBe("auto");
    expect(declarations.get("overflow-y")).toBe("auto");
    expect(declarations.get("min-height")).toBe("0");
  });

  it("keeps the 24px row line height and the 18px badge height (TC-072)", () => {
    // Case: TC-072
    // Given/When: the table cell and .gitRef rules
    // Then: both heights are unchanged
    expect(hasDeclarationFor("#commitTable td", "line-height: 24px")).toBe(true);
    expect(declarationsOf(ruleBlock(mainCss, ".gitRef")).get("height")).toBe("18px");
  });
});

// S6: 一覧内の検索一致マークの表示契約
// @see docs/testing/perspectives/media/main-test.md
describe("media/main.css search marks in the ref list (S6)", () => {
  // TC-079 is a manual real-webview verification of the visible mark; see the perspectives file.

  it("paints matched text in the list with the find match orange (TC-077)", () => {
    // Case: TC-077 (AC-08)
    // Given/When: the .refOverflowPopup .findMatch rule
    const declarations = declarationsOf(ruleBlock(mainCss, ".refOverflowPopup .findMatch"));

    // Then: the background uses the existing rgba(234, 92, 0, …) family
    expect(declarations.get("background-color")).toMatch(/^rgba\(234, 92, 0, /);
  });

  it("does not style search marks outside the list (TC-078)", () => {
    // Case: TC-078
    // Given/When: rules selecting the inline mark without the list scope
    // Then: none exist, so the table keeps its row-level match highlight only
    expect(ruleBodiesFor(".findMatch")).toEqual([]);
    expect(ruleBodiesFor("span.findMatch")).toEqual([]);
  });
});
