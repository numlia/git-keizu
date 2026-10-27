# Test Perspectives: web/dropdown.ts

> Source: `web/dropdown.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: isOpen() open state check

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**Signature**: `isOpen(): boolean`
**Target path**: `web/dropdown.ts`

| Case ID | Input / Precondition            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes                  |
| ------- | ------------------------------- | -------------------------------------------------------------------------- | --------------- | ---------------------- |
| TC-001  | Initial dropdown state (closed) | Normal - closed                                                            | Returns false   | Initial state          |
| TC-002  | After the dropdown is opened    | Normal - open                                                              | Returns true    | After open()           |
| TC-003  | close() called after opening    | Normal - re-closed                                                         | Returns false   | State transition check |

## S2: Making close() public

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**Signature**: `close(): void`
**Target path**: `web/dropdown.ts`

| Case ID | Input / Precondition               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                              | Notes      |
| ------- | ---------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------- | ---------- |
| TC-004  | close() while the dropdown is open | Normal - standard                                                          | The dropdown is hidden and isOpen() is false | -          |
| TC-005  | close() when already closed        | Boundary - already closed                                                  | No error, isOpen() stays false               | Idempotent |

## S3: escapeHtml XSS fix

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**Target path**: `web/dropdown.ts`

| Case ID | Input / Precondition                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                   | Notes                             |
| ------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------- |
| TC-006  | The option name contains HTML special characters (e.g. `<script>alert(1)</script>`) | Validation - XSS attempt                                                   | Escaped text is set in the selected value display | Checks that escapeHtml is applied |
| TC-007  | The option name is plain text (e.g. `main`)                                         | Normal - standard                                                          | The text is shown as is                           | Normal behavior kept              |
| TC-008  | The option name contains `&`, `<`, `>`, `"`, `'`                                    | Boundary - all HTML entities                                               | All special characters are escaped correctly      | Checks each entity                |

## S4: Setting the title attribute

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**Target path**: `web/dropdown.ts`

| Case ID | Input / Precondition                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                          | Notes                              |
| ------- | ------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------- |
| TC-009  | The selected value display element after render() | Normal - standard                                                          | The title attribute is set to the option name (raw text) | The browser escapes it             |
| TC-010  | Rendering the dropdown option elements            | Normal - standard                                                          | Each option div has a title attribute                    | For tooltips                       |
| TC-011  | Long option name (100 characters or more)         | Boundary - long text                                                       | The title attribute holds the full text                  | Shows the full name when truncated |

## S5: Magic numbers turned into constants

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**Target path**: `web/dropdown.ts`

| Case ID | Input / Precondition         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes                               |
| ------- | ---------------------------- | -------------------------------------------------------------------------- | --------------- | ----------------------------------- |
| TC-012  | MIN_DROPDOWN_WIDTH constant  | Normal - standard                                                          | Value is 130    | Minimum width                       |
| TC-013  | SCROLLBAR_THRESHOLD constant | Normal - standard                                                          | Value is 272    | Threshold for showing the scrollbar |
| TC-014  | SCROLLBAR_WIDTH constant     | Normal - standard                                                          | Value is 12     | Scrollbar width                     |
| TC-015  | MAX_DROPDOWN_HEIGHT constant | Normal - standard                                                          | Value is 297    | Maximum height                      |

## S6: Multi-select mode initialization

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: superseded
> Superseded By: S11
> Supersedes: -

**Target path**: `web/dropdown.ts`

| Case ID | Input / Precondition                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                | Notes                  |
| ------- | --------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------- |
| TC-016  | Constructor called with multipleAllowed=true  | Normal - standard                                                          | Multi-select mode is enabled                   | -                      |
| TC-017  | Constructor called with multipleAllowed=false | Normal - standard                                                          | Single-select mode (existing behavior) is kept | Backward compatibility |
| TC-018  | render() with multipleAllowed=true            | Normal - standard                                                          | A checkbox element is rendered for each option | input type="checkbox"  |
| TC-019  | render() with multipleAllowed=false           | Normal - no checkbox                                                       | No checkbox elements are rendered              | Existing behavior kept |

## S7: Multi-select "Show All" exclusivity

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**Target path**: `web/dropdown.ts`

| Case ID | Input / Precondition                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                       | Notes             |
| ------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------- |
| TC-020  | Click "Show All" (index 0)                                     | Normal - standard                                                          | All individual checkboxes are cleared                                 | -                 |
| TC-021  | Click an individual option                                     | Normal - standard                                                          | "Show All" is cleared and the clicked option toggles                  | -                 |
| TC-022  | Clear every individual selection one by one                    | Boundary - all deselected                                                  | "Show All" automatically returns to selected                          | Automatic restore |
| TC-023  | Click one individual option while "Show All" is selected       | Normal - standard                                                          | "Show All" is cleared and the individual option is checked            | Exclusive switch  |
| TC-024  | Click "Show All" while several individual options are selected | Normal - standard                                                          | All individual selections are cleared and only "Show All" is selected | Bulk reset        |

## S8: Multi-select close and callback behavior

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**Target path**: `web/dropdown.ts`

| Case ID | Input / Precondition                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                      | Notes                        |
| ------- | ------------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------- |
| TC-025  | Open the dropdown → change the selection → close       | Normal - standard                                                          | The callback fires with the array of selected values | -                            |
| TC-026  | Open the dropdown → no selection change → close        | Boundary - no change                                                       | The callback does not fire                           | Prevents unnecessary reloads |
| TC-027  | Close with "Show All" selected                         | Normal - standard                                                          | An empty array is passed to the callback             | Empty array = Show All       |
| TC-028  | Close with only 1 item selected                        | Normal - single                                                            | An array with 1 element is passed to the callback    | -                            |
| TC-029  | Close with 3 items selected                            | Normal - multiple                                                          | An array with 3 elements is passed to the callback   | -                            |
| TC-030  | Record the selection on open → toggle → revert → close | Boundary - revert to original                                              | The callback does not fire (treated as no change)    | Change detection             |

## S9: Multi-select display label

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**Target path**: `web/dropdown.ts`

| Case ID | Input / Precondition              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                       | Notes           |
| ------- | --------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------- | --------------- |
| TC-031  | "Show All" is selected            | Normal - standard                                                          | The display label is the name of "Show All"           | -               |
| TC-032  | 1 individual option is selected   | Normal - single                                                            | The display label is that option's name               | -               |
| TC-033  | 2 individual options are selected | Normal - multi                                                             | The display label shows the count (e.g. "2 selected") | -               |
| TC-034  | 5 individual options are selected | Boundary - many selections                                                 | The display label shows the count (e.g. "5 selected") | Many selections |

## S10: Multi-select event handling

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**Target path**: `web/dropdown.ts`

| Case ID | Input / Precondition                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                               | Notes                         |
| ------- | ----------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------- |
| TC-035  | Multi-select: option click                      | Normal - standard                                                          | The dropdown does not close (stopPropagation) | Differs from single select    |
| TC-036  | Single select: option click                     | Normal - standard                                                          | The dropdown closes (existing behavior kept)  | Backward compatibility        |
| TC-037  | Multi-select: type a string in the filter input | Normal - standard                                                          | Options are narrowed by the filter text       | Existing filter feature kept  |
| TC-038  | Multi-select: no match in the filter input      | Boundary - no match                                                        | All options are hidden                        | Existing filter behavior kept |

## S11: Opener button, open/close, option movement, internal Tab order and re-resolving options

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: S6
> Signature: `new Dropdown(id, showInfo, label, callback, multipleAllowed?)` (existing overload kept) / `setOptions(options, selected)` / the opener `button` (name, `aria-expanded`, `aria-controls`) / keydown on the search `input` and on `listbox` / `option`
> Target Path: `web/dropdown.ts:69-178, 209-294, 315-386, 407-474, 490-511` (the constructor and `createHintButton`, `setOptions` / `refresh` / `render`, `filter` and re-resolving options, `handleTriggerKeydown` / `handleFilterKeydown` / `handleOptionKeydown`, `handleTab`)
> Test File: `tests/web/dropdown.test.ts`

Perspectives for §3.7.2 R4.5 and Task 4 of the implementation plan. S6 (multi-select initialization) was a contract that rendered `input type="checkbox"` inside each option (TC-018); it is replaced because the checkbox becomes a decorative display and the state is expressed with `listbox` / `option` / `aria-multiselectable` / `aria-selected`. The meaning of the single / multiple mode checks of S6 (TC-016 / TC-017 / TC-019) carries over to this section. The fixture gives a `div.dropdown` like `#branchSelect` the options `[Show All, feature, hotfix, main]` (multi-select) and `[/a, /b]` (single select), and observes `document.activeElement`, the `aria-*` attributes and the number of change callbacks. The focused option is held by `value`, separately from the selection, and only one of the visible options is a Tab stop. Measured before implementation: the current value element is a `div` (`tabIndex -1`), and after `focus()` `activeElement` is `body`.

| Case ID | Input / Precondition                                                                                                                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type)    | Expected Result                                                                                                                                                                                                                                                                                                  | Notes                                                                                                                                                      |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-039  | Real focus on the opener button, then each of `Enter`, `Space`, `ArrowDown` (keydown → keyup)                                                                                           | Normal - opener button opens and focuses the search                           | In all 3 cases `dropdownOpen` is added and `aria-expanded="true"`, `activeElement` is the search `input`, the opener is a `button` element with `type="button"`, a name (the `label` text via `aria-label` or `aria-labelledby`) and `aria-controls` matching the menu `id`. keyup does not toggle a second time | K23 / A8.1-3. Measured before implementation: `div.dropdownCurrentValue` cannot take focus                                                                 |
| TC-040  | While open, type `f`, `e`, ` ` (Space) in the search input (`filter()` on `keyup`)                                                                                                      | Normal - characters and Space are search text                                 | `input.value` is equivalent to `"fe "` and options are narrowed, Space does not toggle a selection (`aria-selected` unchanged), callback 0 times                                                                                                                                                                 | R4.5 "Treat typed characters and Space as search text"                                                                                                     |
| TC-041  | Real focus on the search input, `ArrowDown`, and separately `ArrowUp`                                                                                                                   | Normal - Down from the input goes to the first, Up to the last visible option | `ArrowDown` moves `activeElement` to the first visible `option` (the first after filtering), `ArrowUp` to the last visible `option`. The keydown is consumed                                                                                                                                                     | R4.5                                                                                                                                                       |
| TC-042  | Real focus on the first option and `ArrowUp`, `ArrowDown` on the last, `ArrowDown` in the middle                                                                                        | Boundary - stops at the ends of the options                                   | `↑` on the first / `↓` on the last leaves `activeElement` unchanged (does not return to the search input or wrap). `↓` in the middle goes to the next visible option. Hidden options (filtered out) are skipped                                                                                                  | R4.5 "Move only between visible options and stop at the ends"                                                                                              |
| TC-043  | `Home`, `End` on an option                                                                                                                                                              | Normal - to the first / last                                                  | `activeElement` is the first / last visible `option`                                                                                                                                                                                                                                                             | R4.5                                                                                                                                                       |
| TC-044  | Attributes of the render result for multi-select and single select                                                                                                                      | Normal - roles and selection state                                            | The option group has `role="listbox"`, each option `role="option"`, multi-select has `aria-multiselectable="true"`, selected options have `aria-selected="true"`. There is no focusable `input` inside an option (decorative display), and Tab stops are not duplicated                                          | Contract change of S6 TC-018. R4.5                                                                                                                         |
| TC-045  | First entry into the options (1 stop in `getTabStops`, equivalent to `Tab`), with and without the selected `hotfix`. Move to option `main`, go back to the search input and enter again | Normal - one stop for the options and re-entry                                | Exactly 1 visible option has `tabindex="0"`. On first entry it is the first selected (`hotfix`), or the first option if none is selected. On re-entry it is the previous `main`                                                                                                                                  | R4.5 "On first entry into the options use the first visible selected option, or the first option if none, and after that keep the previous visible option" |
| TC-046  | `ArrowDown`, `Enter` with search text `zzz` and 0 visible options                                                                                                                       | Boundary - 0 search results                                                   | `activeElement` stays the search input, `input.value` keeps `"zzz"`, the `dropdown.noResults` text is shown and announced with `role="status"` etc., the dropdown does not close, callback 0 times                                                                                                               | K26 / A8.3-1                                                                                                                                               |
| TC-047  | render with `setOptions([], [])` (0 data items)                                                                                                                                         | Boundary - 0 data items                                                       | The opener button is `disabled`, it is not a stop in `getTabStops`, and `click` / `Enter` do not open it (no `dropdownOpen`)                                                                                                                                                                                     | K26 / A8.3-1. "The opener is disabled with 0 items"                                                                                                        |
| TC-048  | While open, `setOptions` updates to 1 option (Show All + 1, or a single 1 item)                                                                                                         | Boundary - closes when updated to 1 item or fewer                             | `dropdownOpen` is removed, `activeElement` is the opener button (restored), callback 0 times. `options[0]` is not read unconditionally, so no exception even if the display name options are empty                                                                                                               | K26 / A8.3-1. Keeps the current "close when there is 1 option or fewer"                                                                                    |
| TC-049  | Open multi-select and repeat `Tab` from the search input (`getTabStops` and internal keydown)                                                                                           | Normal - internal Tab order                                                   | The order is search input → the one stop of the options → apply `button` → cancel `button`. Single select has no apply / cancel, so it is search input → options. Shift + `Tab` goes back from the options to the search input                                                                                   | K27 / A8.3-4                                                                                                                                               |
| TC-050  | After changing options in multi-select, `Tab` (outward) from the cancel button. In single select, `Tab` outward after focusing an option                                                | Normal - leaving with Tab                                                     | Multi-select applies the change (callback 1 time), single select discards the unconfirmed option (callback 0 times, value unchanged). Both close but do not move `activeElement` back to the opener button (do not steal the `Tab` destination; `restoreFocus(origin, "tab")` is `false`)                        | K27 / A8.3-4                                                                                                                                               |
| TC-051  | After changing options in multi-select, `click` on an empty area of `document.body` (outside)                                                                                           | Normal - an outside click applies and the destination wins                    | Callback 1 time, `dropdownOpen` removed, `activeElement` is not the opener button (does not steal the destination)                                                                                                                                                                                               | K27 / A8.2-3                                                                                                                                               |
| TC-052  | While open, `click` / `Enter` on the opener button                                                                                                                                      | Normal - the opener button closes                                             | Multi-select calls the callback once if there are changes (apply), single select discards. `aria-expanded="false"`, `activeElement` is the opener button                                                                                                                                                         | K27                                                                                                                                                        |

### Failure-source inventory (include-or-justify) — added by Feature 061-05 (S11)

| Failure source                                                             | Covering case or reason for exclusion                                       |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| The opener cannot take focus, has no name / state                          | TC-039                                                                      |
| Space toggles, characters move between options                             | TC-040                                                                      |
| Wrong Up/Down from the input, at option ends, Home / End                   | TC-041 to TC-043                                                            |
| Checkboxes remain as stops, roles missing                                  | TC-044                                                                      |
| Several stops in the options, wrong first / re-entry target                | TC-045                                                                      |
| 0 results / 1 option / 0 data items                                        | TC-046 to TC-048                                                            |
| Internal Tab order, apply / discard when leaving, stealing the destination | TC-049 to TC-052                                                            |
| External dependencies, exceptions                                          | excluded(only DOM and callbacks, with no external dependency or throw path) |

### Task 12 test mapping (Feature 061-05) — S11

- Tests: `tests/web/dropdown.test.ts` describe `S11: Trigger button, option movement, internal Tab order and re-resolution`. TC-039 to TC-052 each have one `it` with the same number (the `it` name ends with the Case ID). For TC-044, `renders decorative checkboxes without focusable inputs in multi-select mode (TC-018)` in describe `S6 (superseded by S11)` also refers to this section as the contract change of S6 TC-018
- Interpretation of TC-046 (Task 4 handoff): "does not close on `Enter` with 0 visible options" is the **single select** contract. In multi-select, Enter on the search input applies the change and closes per R4.5 (S12 TC-059). The TC-046 test checks it by creating 0 results in single select
- Interpretation of TC-048 (Task 4 handoff): "1 option or fewer" means `options.length <= 1` (the number of all options including Show All). Multi-select closes with Show All + 0 items, single select with 1 item, and focus is restored to the opener button
- Execution result (2026-10-07): 14 pass. The pre-implementation measurement (`div.dropdownCurrentValue` cannot take focus) is GREEN in TC-039

## S12: Apply, cancel, IME / repeat / keyup guards and the close / cancelAndClose contract

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: `public close(reason?: FocusCloseReason): void` / `public cancelAndClose(reason?: FocusCloseReason): void` (made public) / `Enter` / `Space` / `Escape` keydown on options and the search input / use of `isKeyboardActionBlocked(event)` / updating the cancel baseline in `setOptions()`
> Target Path: `web/dropdown.ts:188-208, 387-406, 475-489, 519-597` (`toggleMultiSelectOption` / `confirmSingleOption`, `handleKeydown`, `activateOption`, `toggleFromTrigger` / `open` / `leave` / `isOpen` / `close` / `cancelAndClose` / `hideMenu` / `fireMultiSelectCallbackIfChanged`)
> Test File: `tests/web/dropdown.test.ts`

Perspectives for §3.5 of the implementation plan ("Dropdown close applies and cancelAndClose cancels; do not merge them into one meaning") and R4.5 / R4.6. The document capture Enter / Escape listeners are replaced by keydown inside the component. S8 (close and callback) and S10 (events) stay active because the meaning of apply does not change. Measured before implementation (real Dropdown, with the details of `M` open): `Escape` keydown after changing options cancels, but the keyup of the same press closes the details behind it. `Enter` keydown with `isComposing: true` closes and runs the callback once (applies on IME commit).

| Case ID | Input / Precondition                                                                                                                                                                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type)                         | Expected Result                                                                                                                                                                                                                                                                         | Notes                                                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| TC-053  | Open multi-select with `Enter` on the opener button, type `h` in the search → `ArrowDown` (option `hotfix`) → `Space` → `Enter` (keydown → keyup)                                                                         | Normal - apply the option change once and return to the opener button                              | After `Space`, `hotfix` has `aria-selected="true"` (callback still 0 times). `Enter` calls the callback once with `["hotfix"]`, removes `dropdownOpen`, and `activeElement` is the opener button. keyup adds 0 calls                                                                    | K23 / A8.1-3                                                                                                                |
| TC-054  | Open multi-select, toggle `hotfix` with `Space`, then send `Escape` keydown → keyup in sequence (with a bubble listener registered on document)                                                                           | Normal - Escape keydown cancels back to the starting selection                                     | On keydown the selection returns to its state at open (`aria-selected` restored), callback 0 times, `activeElement` is the opener button. The keydown is `defaultPrevented` and the bubble listener is called 0 times (not passed to the upper Escape chain). Nothing happens on keyup  | K24 / A8.1-3 / A8.3-4. Measured before implementation: keyup closes the details behind it (TC-690 on the main side)         |
| TC-055  | Send only the `keyup` of `Escape` from TC-054 with `isComposing: false` (no keydown)                                                                                                                                      | Validation - keyup alone does not cancel                                                           | Stays `dropdownOpen`, selection unchanged, callback 0 times                                                                                                                                                                                                                             | R4.6 "Do not close on keyup". Confirms the premise that a pseudo operation sending only one half does not count as verified |
| TC-056  | Open multi-select, toggle `main`, then `setOptions([Show All, feature, hotfix], ["feature"])` (`main` removed, selection received) → `Escape`                                                                             | Normal - an options update becomes the new cancel baseline                                         | The selection after cancel is the received `["feature"]` (not the selection at open, and the removed `main` does not come back), callback 0 times                                                                                                                                       | K25 / A8.3-1                                                                                                                |
| TC-057  | Single select (`[/a, /b]`, currently `/a`), real focus on option `/b` and `Enter`, and in a separate attempt `Space`                                                                                                      | Normal - single select confirms with Enter / Space on an option                                    | Callback once with `"/b"`, `dropdownOpen` removed, the current value shows `/b`, `activeElement` is the opener button                                                                                                                                                                   | R4.5                                                                                                                        |
| TC-058  | Single select, search `b` → `Enter` on the search input. Separately search `zzz` (0 results) and `Enter`                                                                                                                  | Normal / Boundary - Enter in the input confirms the first visible option, 0 results does not close | The former calls the callback once with `"/b"` and closes. The latter calls the callback 0 times, stays `dropdownOpen` and keeps `input.value`                                                                                                                                          | R4.5 "Do not close with 0 results"                                                                                          |
| TC-059  | Multi-select, toggle `hotfix`, then `Enter` on the search input                                                                                                                                                           | Normal - Enter in the input applies in multi-select                                                | Callback once with `["hotfix"]`, closes, `activeElement` is the opener button                                                                                                                                                                                                           | R4.5                                                                                                                        |
| TC-060  | Multi-select with `feature` and `hotfix` selected, `Space` on option `Show All`. Then `Space` on `feature`                                                                                                                | Normal - Show All exclusivity also kept with the keyboard                                          | `Space` on `Show All` clears the individual selections (only Show All has `aria-selected`). `Space` on `feature` clears Show All                                                                                                                                                        | Keeps the S7 contract                                                                                                       |
| TC-061  | Multi-select, toggle `hotfix`, then `compositionstart` → `Enter` keydown (`isComposing: true`) → `compositionend` → `Enter` keyup                                                                                         | Validation - Enter during IME composition does not apply                                           | Stays `dropdownOpen`, callback 0 times (also 0 on keyup)                                                                                                                                                                                                                                | K34 / A8.3-2. Measured before implementation: closes with callback 1 time (RED)                                             |
| TC-062  | Multi-select, toggle an option, then `Enter` keydown (`repeat: false`) → `Enter` keydown (`repeat: true`) × 2                                                                                                             | Validation - repeat does not apply twice                                                           | Callback 1 time in total                                                                                                                                                                                                                                                                | A8.3-2                                                                                                                      |
| TC-063  | `Space` keydown → `Space` keyup, and `Enter` keydown → `Enter` keyup on an option                                                                                                                                         | Validation - keyup does not toggle / apply twice                                                   | `Space` toggles once (keyup does not revert it), `Enter` calls the callback once                                                                                                                                                                                                        | A8.3-2. jsdom does not generate the default click of a standard button, so this goes to the real Webview check of Task 12   |
| TC-064  | Multi-select, change options, then `close("keyboard")`; in a separate attempt `cancelAndClose("keyboard")`; in separate attempts `close()` / `cancelAndClose()` without arguments. Real focus on `#refreshBtn` beforehand | Normal - close applies, cancelAndClose cancels, no argument does not steal focus                   | `close("keyboard")` calls the callback once and `activeElement` is the opener button. `cancelAndClose("keyboard")` calls it 0 times, restores the selection and focuses the opener button. Without arguments they apply / cancel respectively while `activeElement` stays `#refreshBtn` | §3.5. `cancelAndClose` is public                                                                                            |
| TC-065  | Only move focus from option `hotfix` to `main` with `ArrowDown`, then `Escape`                                                                                                                                            | Validation - moving focus alone does not change the value                                          | `aria-selected` is unchanged before and after the move, callback 0 times                                                                                                                                                                                                                | R4.5 "Moving focus alone does not change the value"                                                                         |
| TC-066  | With the dropdown closed, fire `Enter` keydown on an unrelated `<input>` and `Escape` keydown on document                                                                                                                 | Validation - does not intercept document Enter / Escape while closed                               | Both have `defaultPrevented === false`, and the dropdown callback is called 0 times (no document capture listener remains)                                                                                                                                                              | Task 4 "Replace the document capture Enter/Escape with keydown inside the component"                                        |

### Failure-source inventory (include-or-justify) — added by Feature 061-05 (S12)

| Failure source                                                      | Covering case or reason for exclusion                                    |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Applied more than once / does not return to the opener button       | TC-053, TC-059                                                           |
| Escape applies, keyup closes, passed upward                         | TC-054, TC-055                                                           |
| Cancel baseline after an options update, removed values coming back | TC-056                                                                   |
| Single select confirmation, closing on Enter with 0 results         | TC-057, TC-058                                                           |
| Regression of Show All exclusivity                                  | TC-060                                                                   |
| Double apply via IME / repeat / keyup                               | TC-061 to TC-063                                                         |
| close and cancelAndClose confused, stealing focus without arguments | TC-064                                                                   |
| Moving focus changes the value                                      | TC-065                                                                   |
| A document capture listener remains                                 | TC-066                                                                   |
| External dependencies, exceptions                                   | excluded(only callback calls, with no external dependency or throw path) |

### Task 12 test mapping (Feature 061-05) — S12

- Tests: `tests/web/dropdown.test.ts` describe `S12: Apply / cancel, input guards and the close / cancelAndClose contract`. TC-053 to TC-066 each have one `it` with the same number. The fixture does not register `installKeyboardGuards`, and IME, repeat and keyup are verified by checks on the event's own values (`isComposing` / `repeat` / `type`) (tracking the composition state is covered by `keyboardNavigation-test.md` S2 TC-013 to TC-024)
- RED → GREEN: the pre-implementation measurement "Enter with `isComposing: true` closes with callback 1 time" is GREEN in TC-061, and "keyup closes the details behind it" is GREEN in TC-054 (this table) and in `web/main-test/13-keyboard-accessibility-01.md` S72 TC-690 (main)
- The part of TC-063 that is not automated: jsdom does not generate the default click of a standard button (options are `div[role=option]` and out of scope; this concerns the Apply / Cancel `button.dropdownHintBtn` and the opener button). Manual case (not run): in a real Webview, open the branch multi-select with Tab / Enter, press Space → Enter on an option, and in separate attempts press Enter / Space on the Apply button once, with repeat, and right after an IME commit. Expected: applied once in total (1 `loadCommits` request). Impact: double apply sends 2 requests. Alternative check: the callback counts of TC-062 / TC-063 (jsdom). Manual cases in a real Webview are recorded in the format of "Task 12 manual checks in a real Webview (not yet done)" at the top of `web/main-test/13-keyboard-accessibility-01.md` and are not counted in the automated test pass
- Execution result (2026-10-07): 14 pass
