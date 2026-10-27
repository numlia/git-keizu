# Test Perspectives: media/dropdown.css

> Source: `media/dropdown.css`
> Generated: 2026-08-24T22:27:13+09:00
> Language: CSS
> Test Framework: Vitest
> Storage Mode: single-file

## S1: `.dropdownMenu` references the local z-index variable

> Origin: Feature 055-02 (light-spec-plan)
> Added: 2026-08-24
> Status: active
> Supersedes: -
> Signature: the `z-index: var(--git-keizu-local-z-index-dropdown-menu)` declaration in the `.dropdownMenu` rule
> Target Path: `media/dropdown.css` (`.dropdownMenu`; line numbers are fixed after the Task 2 implementation)
> Test File: `tests/web/overlayLayers.test.ts`

Verifies the static contract that `.dropdownMenu` references only the variable for the local layer inside `#controls`, does not reference global layer variables, and that no hard-coded numeric z-index remains in the file. The source of truth and the check for the defined value 100 of the variable `--git-keizu-local-z-index-dropdown-menu` belong to `media/main-test.md` S1 TC-001; the order comparison of the 9 global layers and the contracts specific to the find widget are not in this table either.

| Case ID | Input / Precondition                                                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                             | Notes                                                                                                                                                                                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-001  | Read `media/dropdown.css` as a string and extract the z-index declarations of the `.dropdownMenu` rule | Normal - dropdown references the local layer variable                      | There is exactly 1 z-index declaration, and its value exactly equals `var(--git-keizu-local-z-index-dropdown-menu)`         | Detects a missing, duplicated or wrong declaration through the count of 1 and the exact match. Keeping the value 100 is covered by the reference to this local variable, fixed at 100 in §3.2, together with the value check in `media/main-test.md` TC-001 |
| TC-002  | Search all of `media/dropdown.css` for the global layer prefix `--git-keizu-z-index-`                  | Validation - wrong reference to a global layer variable                    | `--git-keizu-z-index-` appears 0 times (dropdown references only the local layer `--git-keizu-local-z-index-dropdown-menu`) | Detects a wrong reference that would put dropdown's 100 into the global comparison sequence (counterexample scenario in §3.1)                                                                                                                               |
| TC-003  | Extract every z-index declaration in `media/dropdown.css`                                              | Validation - hard-coded numbers coming back                                | Among the values of `z-index:` declarations, 0 do not start with `var(` (hard-coded numbers)                                | Detects the pre-change `z-index: 100` remaining or coming back                                                                                                                                                                                              |

### Failure-source inventory (include-or-justify) — added by Feature 055-02 (S1)

| Failure source                                                         | Covering case or reason for exclusion                                                                                                                                                                |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wrong reference (another variable)                                     | TC-001 (detected by an exact match of `var(...)`)                                                                                                                                                    |
| Wrong reference (mixed into a global layer variable)                   | TC-002                                                                                                                                                                                               |
| Missing declaration (the z-index declaration itself is removed)        | TC-001 (includes the count of 1)                                                                                                                                                                     |
| Duplicated declaration (several declarations in the same rule)         | TC-001 (detected by the check for exactly 1)                                                                                                                                                         |
| Hard-coded numbers coming back (including missed replacements)         | TC-003                                                                                                                                                                                               |
| Wrong variable value, duplicated variable definition                   | excluded(variable definitions belong to `media/main.css :root`, and this file has none. The value is checked in `media/main-test.md` TC-001 / TC-002)                                                |
| Order boundaries (global ascending order, dialog boundary)             | excluded(dropdown is a local layer inside the stacking context of `#controls` and is not in the global comparison sequence (§3.2). The global order belongs to `media/main-test.md` TC-011 / TC-012) |
| Input validation × violation patterns                                  | excluded(a static CSS contract with no path that takes user input or arguments)                                                                                                                      |
| External dependency × failure mode                                     | excluded(a failure to read the CSS file is detected by the test infrastructure as an exception from `readFileSync`, and the contract itself has no external dependency)                              |
| Exception and error paths                                              | excluded(CSS declarations have no throw path)                                                                                                                                                        |
| Numeric input boundaries (0 / minimum / maximum / +/-1 / empty / NULL) | excluded(no numeric input at runtime. Boundaries of layer values belong to the main owner)                                                                                                           |
| Invalid type or format                                                 | excluded(the declared value is static text with no type branch, and format drift is detected by the exact match in TC-001)                                                                           |

**Failure-category coverage (diversity floor)**:

- Validation: TC-002, TC-003
- Exception: excluded(no throw path; see the table above)
- External: excluded(no external dependency; see the table above)
- Boundary: excluded(no numeric boundary exists, and boundaries of the layer order belong to `media/main-test.md` TC-011 / TC-012)
- Type: excluded(no type branch; see the table above)

**Failure/normal ratio (smoke detector)**: 1 normal case (TC-001), 2 failure cases (TC-002, TC-003). Because the difference is 1, the inventory was re-derived; the static contract this file owns is limited to "the target of one declaration", "separation from the global layers" and "no hard-coded numbers", and the failure sources about values and order are covered by the owner-responsibility exclusions in the table above. No cases are added just to adjust the ratio.

## S2: Display contract of the trigger button, options, decorative checkbox and disabled state

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: declarations for `.dropdownCurrentValue` (now a `button`) / `:focus-visible` and `[aria-selected="true"]` of `.dropdownOption[role="option"]` / the decorative checkbox (equivalent to `.dropdownOptionCheck`) / `.dropdownCurrentValue:disabled` / `.dropdownHintBtn` (now a `button`)
> Target Path: `media/dropdown.css:19-58, 87-108, 128-131, 168-170, 200-216` (reset / `:disabled` / `:focus-visible` / `:after` of `.dropdownCurrentValue`, the decorative check / `:focus-visible` of `.dropdownOption` and `[aria-selected]`, the trigger button in the open state, `.dropdownFilterInput:focus-visible`, reset / `:focus-visible` of `.dropdownHintBtn`)
> Test File: `tests/web/keyboardStyles.test.ts` (TC-013 to TC-016), real VS Code Webview (TC-017; not done as of Task 12)

Perspectives for implementation plan Task 11, implementation items 1 to 2. Turning these into `button` elements brings in the UA default font / color / border / padding, so this verifies the reset declarations that match the existing look and the declarations that leave no hidden tab stop (`input[type=checkbox]`).

| Case ID | Input / Precondition                                                                                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type)                   | Expected Result                                                                                                                                                                                                                          | Notes                                                 |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| TC-013  | The rules of `.dropdownCurrentValue` and `.dropdownHintBtn`                                                                    | Normal - native buttons match the existing look                                              | There are `font: inherit` (or inherited `font-family` / `font-size`) and `color` / `background` / `border` / `padding` declarations, `text-align` is left, and the width matches the existing `div` with the equivalent of `width: 100%` | K45                                                   |
| TC-014  | The rules of `.dropdownCurrentValue:focus-visible` and `.dropdownOption:focus-visible`                                         | Normal - focus frame                                                                         | Both have `outline: 2px solid var(--vscode-focusBorder)`, and `outline-offset` is negative or inset so that the `.dropdownOption` frame is not clipped by `overflow`                                                                     | K45                                                   |
| TC-015  | Scan the decorative checkbox selector and `.dropdownOption input[type="checkbox"]`                                             | Validation - no hidden tab stops remain                                                      | There is no declaration for `input[type="checkbox"]` inside an option (assuming the element is not created at all), and the decorative selector switches its display with `[aria-selected="true"]`                                       | K45 / A8.1-3 "do not duplicate independent Tab stops" |
| TC-016  | The rule of `.dropdownCurrentValue:disabled`                                                                                   | Normal - disabled look                                                                       | There are `cursor: default` and `opacity` (or a disabled color) declarations                                                                                                                                                             | Display side of K26                                   |
| TC-017  | In a real VS Code Webview, narrow the width, open the branch multi-select with Tab / Enter and move through the options with ↓ | Normal - the frames of the trigger button and options are visible at a narrow width (manual) | The frames of the trigger button and the options are not clipped, and Tab reaches the apply / cancel buttons with a visible frame. Record: VS Code version, OS, theme                                                                    | K45 / A8.3-6. Manual                                  |

### Failure-source inventory (include-or-justify) — added by Feature 061-05 (S2)

| Failure source                          | Covering case or reason for exclusion |
| --------------------------------------- | ------------------------------------- |
| Broken look after turning into a button | TC-013                                |
| Missing or clipped frame                | TC-014, TC-017                        |
| Tab stop on a hidden checkbox           | TC-015                                |
| Missing disabled look                   | TC-016                                |
| External dependency, exception          | excluded(static CSS contract)         |

### Task 12 test mapping (Feature 061-05) — S2

- Tests: `tests/web/keyboardStyles.test.ts` describe `media/dropdown.css trigger, options, decorative checkbox and disabled state (S2)`. TC-013 `resets the native button look of the trigger and hint buttons` / TC-014 `outlines the trigger and the options with the inset focus frame` / TC-015 `drives the decorative check mark from aria-selected without a hidden input` / TC-016 `dims the disabled trigger and drops its pointer cursor`
- Manual case TC-017: **not done** (reason, impact, alternative checks and remaining steps are in the manual list at the top of `web/main-test/13-keyboard-accessibility-01.md`. At a narrow width, open the branch multi-select with Tab / Enter, move through the options with ↓, and check the frames of apply / cancel)
- Execution result (2026-10-07): 4 passed
