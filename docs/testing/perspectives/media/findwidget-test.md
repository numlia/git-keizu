# Test Perspectives: media/findwidget.css

> Source: `media/findwidget.css`
> Generated: 2026-08-24T22:27:13+09:00
> Language: CSS
> Test Framework: Vitest
> Storage Mode: single-file

## S1: z-index variable reference of `.findWidget`

> Origin: Feature 055-02 (light-spec-plan)
> Added: 2026-08-24
> Status: active
> Supersedes: -
> Signature: the `z-index: var(--git-keizu-z-index-find-widget)` declaration of the `.findWidget` rule
> Target Path: `media/findwidget.css` (`.findWidget`; line numbers fixed after the Task 2 implementation)
> Test File: `tests/web/overlayLayers.test.ts`

Checks the static contract that `.findWidget` refers only to the variable of the global find widget layer and that no hard-coded numeric z-index remains in the same file. The source of truth and check of the defined value 100 of the variable `--git-keizu-z-index-find-widget` belong to `media/main-test.md` S1 TC-001, and the global order and the dropdown local layer are not in this table either.

| Case ID | Input / Precondition                                                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                 | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-001  | Read `media/findwidget.css` as a string and extract the z-index declarations of the `.findWidget` rule              | Normal - variable reference of the find widget layer                       | There is exactly 1 z-index declaration, and its value exactly matches `var(--git-keizu-z-index-find-widget)`                                                                                                    | Detects a missing, duplicated or wrong reference (a variable of another layer) by the count of 1 and the exact match. Keeping the effective value 100 is covered by the pair of the reference to this variable, whose value was fixed at 100 in §3.2, and the value check in `media/main-test.md` TC-001                                                                                                                                                                                                                                    |
| TC-002  | Extract every z-index declaration in the whole of `media/findwidget.css`                                            | Validation - hard-coded numbers slip back in                               | 0 `z-index:` declaration values that do not start with `var(` (hard-coded numbers)                                                                                                                              | Detects the old `z-index: 100` remaining or slipping back in                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| TC-003  | In a real VS Code Webview, run a search so that results, input and options are set, then show a dialog and close it | Normal - manual: search state matches before and after the dialog          | After closing the dialog, the visibility of the find widget, the input string, the result position and the options (such as match case) match the state before, and the input and buttons can be operated again | Manual check. Reason: whether the search state matches before and after and remains usable can be judged only by the rendering and event handling of a real Webview, not in jsdom. Steps: type a search term and move the result position, show an error dialog and close it, visually compare the widget visibility, input value, result position and options, and operate the input. Expected: exactly matches the state before and is usable. Evidence: keep screenshots before and after and a check record with the execution evidence |

### Failure-source inventory (include-or-justify) — added by Feature 055-02 (S1)

| Failure source                                                         | Covering cases or reason for exclusion                                                                                                                                  |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wrong reference (to a global or local variable of another layer)       | TC-001 (detected by exact match of `var(...)`)                                                                                                                          |
| Missing declaration (the z-index declaration itself is deleted)        | TC-001 (includes checking the count of 1)                                                                                                                               |
| Duplicated declaration (several declarations in the same rule)         | TC-001 (detected by checking exactly 1)                                                                                                                                 |
| Hard-coded numbers slip back in (including missed replacements)        | TC-002                                                                                                                                                                  |
| Wrong variable value, duplicate variable definition                    | excluded(the variable definition belongs to `media/main.css :root`, and this file has no definition. The value is checked in `media/main-test.md` TC-001 / TC-002)      |
| Order boundaries (global ascending order, dialog boundary)             | excluded(comparing the global order belongs to `media/main-test.md` TC-011 / TC-012, and this file owns only the reference)                                             |
| Drift of the search state before and after showing a dialog            | TC-003 (manual check)                                                                                                                                                   |
| Input validation × violation patterns                                  | excluded(a static CSS contract with no path that receives user input or arguments)                                                                                      |
| External dependency × failure mode                                     | excluded(a failure to read the CSS file is detected by the test infrastructure as an exception from `readFileSync`, and the contract itself has no external dependency) |
| Exception and error paths                                              | excluded(CSS declarations have no throw path)                                                                                                                           |
| Numeric input boundaries (0 / minimum / maximum / +/-1 / empty / NULL) | excluded(there is no runtime numeric input. Boundaries of layer values belong to the main owner)                                                                        |
| Invalid type or format                                                 | excluded(declaration values are static text with no type branch, and format drift is detected by the exact match of TC-001)                                             |

**Failure-category coverage (diversity floor)**:

- Validation: TC-002
- Exception: excluded(no throw path, as in the table above)
- External: excluded(no external dependency, as in the table above)
- Boundary: excluded(there is no numeric boundary, and the boundaries of the layer order belong to `media/main-test.md` TC-011 / TC-012)
- Type: excluded(no type branch, as in the table above)

**Failure/normal ratio (smoke detector)**: 2 normal cases (TC-001, TC-003), 1 failure case (TC-002). With a difference of 1 the inventory was derived again, but the static contract this file owns is limited to "the reference of one declaration" and "no hard-coded numbers", and the failure sources of value, order and state management are covered by the owner-responsibility exclusions in the table above. No cases are added to adjust the ratio.

## S2: Display contract of find buttons: look, focus and pressed state

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: the reset, `:focus-visible`, `[aria-pressed="true"]` (the existing `.active`) and `:disabled` declarations of `.findWidget button` (`#findCaseSensitive` / `#findRegex` / `#findOpenCdv` / `#findPrev` / `#findNext` / `#findClose`)
> Target Path: `media/findwidget.css:37-61, 64-82, 96-131` (`#findInput:focus-visible` / the reset of `.findWidget button` / `:focus-visible` / `:disabled` / `#findInput:disabled`, `.findModifier` and `.active` / `[aria-pressed="true"]`, `:disabled` of the action buttons and `#findPrev` / `#findNext`, `#findOpenCdv[aria-pressed="true"]`)
> Test File: `tests/web/keyboardStyles.test.ts` (TC-013 to TC-015), real VS Code Webview (TC-016; not done as of Task 12)

Perspectives for item 2 of the Task 11 implementation in the implementation plan. The z-index contract of S1 is kept.

| Case ID | Input / Precondition                                                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                              | Notes                |
| ------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| TC-013  | Rules for `.findWidget button`                                                                               | Normal - native buttons look like the existing spans                       | There are declarations for `font: inherit`, `background` / `border` / `padding` / `color`, with the same dimensions as the existing `.findModifier`          | K45                  |
| TC-014  | The rule for `.findWidget button:focus-visible`                                                              | Normal - focus frame                                                       | `outline: 2px solid var(--vscode-focusBorder)`                                                                                                               | K45                  |
| TC-015  | Rules for `.findModifier.active` and `.findModifier[aria-pressed="true"]`, and `.findWidget button:disabled` | Normal - pressed / disabled display                                        | The pressed state declarations have the same values for both the `active` class and `aria-pressed`, and `:disabled` has a disabled look (`opacity` or color) | K40 / K45            |
| TC-016  | In a real VS Code Webview, open find, cycle through each button with Tab, and toggle Aa / .\* with Space     | Normal - frame and pressed look of find buttons (manual)                   | A frame is visible on each button, and the pressed state can be told apart by something other than the frame. Record: VS Code version, OS, theme             | K45 / A8.3-6. Manual |

### Failure-source inventory (include-or-justify) — added by Feature 061-05 (S2)

| Failure source                          | Covering cases or reason for exclusion |
| --------------------------------------- | -------------------------------------- |
| The look breaks when changed to buttons | TC-013                                 |
| Missing frame                           | TC-014, TC-016                         |
| Missing pressed / disabled look         | TC-015                                 |
| External dependencies, exceptions       | excluded(static CSS contract)          |

### Task 12 test mapping (Feature 061-05) — S2

- Tests: `tests/web/keyboardStyles.test.ts` describe `media/findwidget.css button look, focus and pressed / disabled states (S2)`. TC-013 `resets the native buttons to the former span look` / TC-014 `outlines every find button and the input with the focus frame` / TC-015 `shows pressed state from aria-pressed as from .active and dims disabled buttons`
- Manual Case TC-016: **not done** (reason, impact, alternative check and remaining steps are in the manual list at the top of `web/main-test/13-keyboard-accessibility-01.md`. Open find, cycle through each button with Tab, toggle Aa / .* with Space, and check the frame and the pressed look)
- Execution result (2026-10-07): 3 passed
