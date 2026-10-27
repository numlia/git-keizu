# Test Perspectives: web/findWidget.ts

> Source: `web/findWidget.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: FindWidget DOM creation and visibility

> Origin: Feature 002 (menubar-search-diff) Task 3.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `web/findWidget.ts`

| Case ID | Input / Precondition           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                | Notes |
| ------- | ------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----- |
| TC-001  | Run the FindWidget constructor | Normal - standard                                                          | The DOM structure is created: input field, Aa toggle, .\* toggle, counter, previous/next buttons, close button | -     |
| TC-002  | Call show()                    | Normal - standard                                                          | The widget becomes visible, and focus moves to the input field                                                 | -     |
| TC-003  | Call close()                   | Normal - standard                                                          | The widget is hidden, and all highlights are cleared                                                           | -     |
| TC-004  | isVisible() after show()       | Normal - standard                                                          | Returns true                                                                                                   | -     |
| TC-005  | isVisible() after close()      | Normal - standard                                                          | Returns false                                                                                                  | -     |

## S2: FindWidget input control

> Origin: Feature 002 (menubar-search-diff) Task 3.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `web/findWidget.ts`

| Case ID | Input / Precondition                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                  | Notes                        |
| ------- | ----------------------------------- | -------------------------------------------------------------------------- | -------------------------------- | ---------------------------- |
| TC-006  | setInputEnabled(false)              | Normal - standard                                                          | The input field becomes disabled | Before data is loaded        |
| TC-007  | setInputEnabled(true)               | Normal - standard                                                          | The input field becomes enabled  | After data loading completes |
| TC-008  | Type text while there are 0 commits | Boundary - zero commits                                                    | No matches, counter hidden       | May be in the disabled state |

## S3: FindWidget search matching

> Origin: Feature 002 (menubar-search-diff) Task 3.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `web/findWidget.ts`

| Case ID | Input / Precondition                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                            | Notes                 |
| ------- | ------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------- |
| TC-009  | Type "fix"; a commit has a message containing "fix bug" | Normal - standard                                                          | That commit row is highlighted, and the counter is updated | -                     |
| TC-010  | Type text; a commit's author name matches               | Normal - standard                                                          | The author name field is highlighted                       | -                     |
| TC-011  | Type text; it matches a commit hash (short form)        | Normal - standard                                                          | The hash field is highlighted                              | -                     |
| TC-012  | Type text; it matches a branch name or tag name         | Normal - standard                                                          | The branch/tag label field is highlighted                  | -                     |
| TC-013  | Typed text matches 3 commits                            | Normal - standard                                                          | The counter shows "1 of 3"                                 | Initial position is 1 |
| TC-014  | Typed text matches 0 commits                            | Boundary - no matches                                                      | The counter shows "No Results", with no highlights         | -                     |
| TC-015  | Typed text matches 1 commit                             | Boundary - single match                                                    | The counter shows "1 of 1"                                 | -                     |
| TC-016  | Clear the search text                                   | Boundary - empty text                                                      | All highlights are removed, and the counter is hidden      | -                     |

## S4: FindWidget search options

> Origin: Feature 002 (menubar-search-diff) Task 3.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `web/findWidget.ts`

| Case ID | Input / Precondition                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                   | Notes                        |
| ------- | ----------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------- |
| TC-017  | caseSensitive OFF, text "Fix"             | Normal - standard                                                          | Matches all of "fix", "Fix" and "FIX"                             | Default behaviour            |
| TC-018  | caseSensitive ON, text "Fix"              | Normal - standard                                                          | Matches only "Fix", not "fix"                                     | No RegExp i flag             |
| TC-019  | regex ON, text "fix\|feat"                | Normal - standard                                                          | Matches commits containing "fix" or "feat"                        | Regular expression pattern   |
| TC-020  | regex ON, text "[invalid"                 | Exception - handled error                                                  | The error attribute is set (red border), and there are no matches | RegExp constructor exception |
| TC-021  | regex ON, text "(?:)" (zero-length match) | Boundary - zero-length                                                     | The error attribute is set, and the matches are cleared           | ReDoS prevention             |
| TC-022  | regex ON, text "(a+)+" (potential ReDoS)  | Boundary - backtracking                                                    | Handled safely with try-catch (does not crash)                    | ReDoS prevention             |

## S5: FindWidget navigation

> Origin: Feature 002 (menubar-search-diff) Task 3.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `web/findWidget.ts`

| Case ID | Input / Precondition          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                           | Notes         |
| ------- | ----------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------- | ------------- |
| TC-023  | 3 matches, position 1, next() | Normal - standard                                                          | The position moves to 2, and the counter becomes "2 of 3" | -             |
| TC-024  | 3 matches, position 1, prev() | Normal - standard                                                          | The position wraps to 3, and the counter becomes "3 of 3" | Backward wrap |
| TC-025  | 3 matches, position 3, next() | Boundary - wrap forward                                                    | The position wraps to 1, and the counter becomes "1 of 3" | Forward wrap  |
| TC-026  | next() with 0 matches         | Boundary - no matches                                                      | Nothing happens (no error)                                | -             |
| TC-027  | Scrolling after navigation    | Normal - standard                                                          | scrollToCommit() is called                                | -             |

## S6: FindWidget state persistence

> Origin: Feature 002 (menubar-search-diff) Task 3.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `web/findWidget.ts`

| Case ID | Input / Precondition          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                     | Notes |
| ------- | ----------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----- |
| TC-028  | Call getState()               | Normal - standard                                                          | Returns a FindWidgetState object (text, currentHash, visible, caseSensitive, regex) | -     |
| TC-029  | Call restoreState(savedState) | Normal - standard                                                          | The saved state is restored correctly (text, toggles, visibility)                   | -     |
| TC-030  | restoreState(null)            | Boundary - null state                                                      | The default state is applied (no error)                                             | -     |

## S7: FindWidget debounce

> Origin: Feature 002 (menubar-search-diff) Task 3.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `web/findWidget.ts`

| Case ID | Input / Precondition                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                              | Notes              |
| ------- | ------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------ |
| TC-031  | 200ms pass after typing text          | Normal - standard                                                          | The search runs                                                              | SEARCH_DEBOUNCE_MS |
| TC-032  | Another input 100ms after typing text | Boundary - debounce reset                                                  | The first search is cancelled, and the search runs 200ms after the new input | -                  |

## S8: Matching stash selector searches against the displayed text

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: stash selector matching inside `findMatches()` (uses `buildStashSelectorDisplay(commit.stash.selector)`)
> Target Path: `web/findWidget.ts:300-315`

A fix that changes the value matched for a stash from the full `commit.stash.selector` (e.g. `stash@{0}`) to the short selector shown on screen, `buildStashSelectorDisplay(selector)` (e.g. `@{0}`). It aligns the search target with the in-row highlight target and resolves [15], "counted as a hit but not highlighted". The hidden `stash` prefix is excluded from the search target, and searching all stashes at once with `"stash"` is dropped. The display of stash rows (icon + short selector) is not changed.

| Case ID | Input / Precondition                                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                          | Notes                                                     |
| ------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| TC-033  | A stash is shown (selector `stash@{0}`; its message etc. do not contain `stash`), search term `stash` | Validation - hidden prefix does not match                                  | The stash row is not in the matches (counter "No Results"), and no `findMatch` span is inserted in that row                                                              | Searching all stashes at once is dropped (finalized spec) |
| TC-034  | Same conditions, search term `@{0}`                                                                   | Normal - displayed text matches and is highlighted                         | The stash row matches (counter "1 of 1"), a `findMatch` span is inserted in the row's stash selector display, and `next()` / `prev()` keep that row as the current match | Count + highlight + navigation                            |
| TC-035  | Same conditions, search term `stash@{0}` (full selector)                                              | Validation - full selector does not match                                  | 0 matches (counter "No Results"), and no `findMatch` span is inserted                                                                                                    | The full selector is not displayed (finalized spec)       |

## S9: Saving and restoring openCdvEnabled

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: `getState(): FindWidgetState` / `restoreState(state: FindWidgetState)` (adds `openCdvEnabled`)
> Target Path: `web/findWidget.ts:236-259` + `web/global.d.ts:123-129`

A fix that adds an optional, backward-compatible `openCdvEnabled` to `FindWidgetState` and saves it as a boolean in `getState()`. `restoreState()` restores the internal value with `state.openCdvEnabled === true` before the early return `if (!state.visible) return`, and syncs the active class of the `#findOpenCdv` element. A state saved by an older version (field missing) is treated as false (fix for [16]). The type addition in `web/global.d.ts` is covered by typecheck.

| Case ID | Input / Precondition                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                  | Notes                                              |
| ------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| TC-036  | Call `getState()` with the open-CDV toggle ON                              | Normal - state saved                                                       | `openCdvEnabled` in the returned state is `true` (boolean), regardless of whether the widget is visible or hidden                                | Added to what is saved                             |
| TC-037  | Call `restoreState()` with `{ visible: false, openCdvEnabled: true, ... }` | Boundary - restoring a hidden state                                        | The internal value `true` is restored before the visible early return, and `#findOpenCdv` gets the active class (the widget itself stays hidden) | Sync before the early return (the core of the fix) |
| TC-038  | Call `restoreState()` with `{ visible: true, openCdvEnabled: true, ... }`  | Normal - restoring a visible state                                         | The internal value `true` is restored, `#findOpenCdv` gets the active class, and the widget is shown                                             | Visible path                                       |
| TC-039  | Call `restoreState()` with an old-format state (no `openCdvEnabled` field) | Boundary - missing value in a legacy state                                 | The internal value becomes `false`, and `#findOpenCdv` does not get the active class (`undefined` is treated as false)                           | Backward compatibility                             |

### Failure-source inventory (include-or-justify) — added by Feature 045 (S8 to S9)

| Failure source                                                    | Covering case or reason for exclusion                                                                          |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Search target and display do not match (hit but no highlight)     | TC-033, TC-034, TC-035                                                                                         |
| `openCdvEnabled` not saved (goes back to OFF on rebuild)          | TC-036                                                                                                         |
| Restoration missed because of the early return for a hidden state | TC-037                                                                                                         |
| Internal value and CSS class out of sync                          | TC-037, TC-038 (verified up to the class being set)                                                            |
| Field missing in an old state                                     | TC-039                                                                                                         |
| Regression in building the displayed text of stash rows           | excluded(display building belongs to the owners of `web/main-test/` (table rendering) and `web/utils-test.md`) |
| Regular expression errors, ReDoS                                  | excluded(already covered by the existing S4 TC-020 to TC-022. This change does not alter that behaviour)       |

**Failure-category coverage (diversity floor)**:

- Validation: TC-033, TC-035
- Exception: excluded(this change has no throw branch)
- External: excluded(no external dependencies. The state is built directly in the test)
- Boundary: TC-037, TC-039
- Type: excluded(the type of `openCdvEnabled` is guaranteed at TypeScript compile time; at run time, TC-039 verifies `undefined` with the `=== true` check)

Numeric boundaries (0 / minimum / maximum / +/-1) are out of scope because the spec has none for what this change covers (string matching and a boolean state); the meaningful boundaries are covered by the missing value (TC-039) and restoration while hidden (TC-037).

**Failure/normal ratio (smoke detector)**: 3 normal cases (TC-034, TC-036, TC-038), 4 failure cases (TC-033, TC-035, TC-037, TC-039), ratio 1.3.

## S10: Excluding ref collapse elements from scanning, and notifying highlight updates

> Origin: Feature 059-02 (light-spec-plan)
> Added: 2026-09-24
> Status: active
> Supersedes: -
> Signature: `FindWidgetCallbacks.onHighlightsChanged?(): void`, text scanning and highlight removal in `findMatches()` / `clearMatches()` (excluding the subtree of elements with `data-ref-overflow-ignore`)
> Target Path: `web/findWidget.ts` (`getChildNodesWithTextContent` / `getChildrenWithClassName`, `findMatches`, `clearMatches`, `close`; update to a line range after implementation)
> Test File: `tests/web/findWidget.test.ts`

Without changing how the search target is decided (the commit's source data), the regular expression and case settings, the per-commit count, result navigation, or the open-details option, this excludes the counter and the clones (`data-ref-overflow-ignore`) from text scanning and highlight removal, and notifies after highlights have been added or removed. Highlighting the counter and syncing the list belong to `web/refOverflow-test.md` S5. List coordinates are not covered.

| Case ID | Input / Precondition                                                                                                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                    | Notes                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| TC-040  | A commit row with branch `feature/hidden-only`, whose ref has `.refOverflowHidden` (hidden). Search term `hidden-only`                                                  | Normal - scanning the hidden original ref                                  | The counter is `1 of 1` (1 commit), and a `span.findMatch` is inserted inside the hidden ref                                                                                                                                       | AC-08                                  |
| TC-041  | A commit whose row has a `button.refOverflowCounter` (text `+4`) with `data-ref-overflow-ignore`, and whose other searchable fields do not contain `4`. Search term `4` | Validation - counter text is not searched                                  | The counter is `No Results`, there are 0 `.findMatch` among the counter's descendants, and the counter stays a `BUTTON` element                                                                                                    | AC-10                                  |
| TC-042  | The row has a counter and clones with `data-ref-overflow-ignore`, and the commit message matches the search term                                                        | Normal - only outside the excluded subtree is highlighted                  | The match count stays at 1 commit, `span.findMatch` exists only on the message side, and there are 0 `.findMatch` inside the `data-ref-overflow-ignore` subtree                                                                    | AC-10                                  |
| TC-043  | After the search in TC-040, clear the search term                                                                                                                       | Normal - highlights removed, excluded subtree kept                         | The `span.findMatch` inside the hidden ref drops to 0 and the original text is restored. The `innerHTML` of the `data-ref-overflow-ignore` subtree matches what it was before the search, and the counter stays a `BUTTON` element | -                                      |
| TC-044  | Make `onHighlightsChanged` a spy and search with a matching term                                                                                                        | Normal - notification after highlights are added                           | 1 notification per search, and `span.findMatch` exists in the DOM at the time of notification                                                                                                                                      | AC-08                                  |
| TC-045  | After a match, do one of: clear the search term / `close()` / `[invalid` with regex ON / `(?:)` with regex ON                                                           | Boundary - notification on removal paths                                   | Each operation notifies at least once, and at the last notification the table has 0 `span.findMatch`                                                                                                                               | AC-09                                  |
| TC-046  | Search and clear with callbacks that have no `onHighlightsChanged`                                                                                                      | Boundary - notification is optional                                        | Search and clearing complete without exceptions, and the counter is updated as before                                                                                                                                              | optional callback                      |
| TC-047  | Make `onHighlightsChanged` a spy and search with a single input                                                                                                         | Validation - no re-search from the notification                            | `getCommits` is called once and the notification fires once; no re-search is triggered by the notification                                                                                                                         | No search → sync → search cycle        |
| TC-048  | A row with the label of a branchless worktree (path `/tmp/wt8`), whose other searchable fields do not contain `wt8`. Search term `wt8`                                  | Validation - worktree name/path is not added to the search target          | The counter is `No Results`                                                                                                                                                                                                        | Accepts the search scope limit in §3.6 |
| TC-049  | A row with the hidden ref `Feature/Hidden`; search term `feature/hidden` with caseSensitive ON, and search term `Feature/Hid.*` with regex ON                           | Normal - existing search conditions kept                                   | `No Results` with caseSensitive ON, `1 of 1` with regex ON                                                                                                                                                                         | Decided on the source data. AC-10      |

### Failure-source inventory (include-or-justify) — added by Feature 059-02 (S10)

| Failure source                                                         | Covering case or reason for exclusion                                                                                       |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Hidden original refs are not scanned                                   | TC-040                                                                                                                      |
| Counter text or clones leak into the count or replacement              | TC-041, TC-042                                                                                                              |
| Highlight removal replaces the counter with text                       | TC-041, TC-043                                                                                                              |
| Missing notification after adding or removing highlights               | TC-044, TC-045                                                                                                              |
| Exception when the optional callback is missing                        | TC-046                                                                                                                      |
| Re-search loop caused by the notification                              | TC-047                                                                                                                      |
| Change in search scope (adding worktree name/path, changed conditions) | TC-048, TC-049                                                                                                              |
| List coordinates                                                       | excluded(belongs to `web/refOverflow-test.md` S4)                                                                           |
| External dependency failure                                            | excluded(the callbacks are spies in the test, and the search uses only received commits)                                    |
| Throwing an exception                                                  | excluded(invalid regex stays with the existing exception handling of S4 TC-020. The notification path is checked by TC-045) |

**Failure-category coverage (diversity floor)**:

- Validation: TC-041, TC-047, TC-048
- Exception: excluded(as in the table above)
- External: excluded(as in the table above)
- Boundary: TC-045, TC-046
- Type: excluded(the callback type is guaranteed by TypeScript)

**Failure/normal ratio (smoke detector)**: 5 normal cases (TC-040, TC-042 to TC-044, TC-049), 5 failure cases. The counts are equal, so the inventory was re-derived, and the failure sources for scan exclusion and notification are covered by the table above.

### Feature 059-02 test mapping and execution evidence (S10)

- Test file: describe `FindWidget ref overflow exclusion and highlight notification (S10)` in `tests/web/findWidget.test.ts`. TC-040 to TC-049 are verified in separate `it` blocks (TC-045 covers 4 removal paths and TC-049 covers 2 search conditions with `it.each`). TC-043 places an already cloned `span.findMatch` in the in-row excluded subtree and checks that the `innerHTML` of the excluded subtree matches its pre-search value after searching and clearing, which also confirms the scan exclusion during highlight removal
- Mutation check: confirmed that removing the text scan exclusion fails TC-042/TC-043, removing the scan exclusion during highlight removal fails TC-043, and removing the notification after `close()` fails TC-045 (the mutations were reverted afterwards)
- The wiring between the real FindWidget and main is checked by `web/main-test/01-rendering-03.md` TC-492. In a real browser (Chromium headless): a match only on a hidden ref name gives `1 of 1`, the counter is highlighted (background rgba(234, 92, 0, 0.35)) and the list stays closed; a match only on the description does not highlight the counter; searching for `+4` gives No Results and the counter stays a BUTTON; clearing and an invalid regex (`[inv`) leave 0 marks in the table

## S11: Standard buttons for search controls, pressed state, IME protection for Enter / Shift + Enter, and keeping search spans and focus

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: `new FindWidget(callbacks)` (public signature unchanged; `#findCaseSensitive` / `#findRegex` / `#findOpenCdv` / `#findPrev` / `#findNext` / `#findClose` become `button type="button"` with `aria-pressed` / `disabled` synced) / `keydown` on `#findInput` (`Enter` / Shift + `Enter` go to `next()` / `prev()` after `isKeyboardActionBlocked`) / `show(focus?: boolean)` / `close()` / `findMatches()` / `clearMatches()`
> Target Path: `web/findWidget.ts:125-271, 302-471, 490-501, 524-563` (DOM creation in the constructor and the input keydown, `show` / `close` / `refresh` / `isVisible` / `setInputEnabled`, `findMatches` / `clearMatches`, `prev` / `next`, `buttonHtml` / `toggleClass` / `setPressed` / `syncNavigationState` / `setControlsReachable`)
> Test File: `tests/web/findWidget.test.ts`

Perspectives for R4.3 and R4.6 of the implementation plan and Task 9. The search semantics, debounce, regex handling and scan exclusion of S1 to S10 are kept, so those sections stay active and this one is additive (the parts in S1 TC-001 exist as `button` elements). Currently they are `span` modifiers and Enter is detected on `keyup`, so `next()` runs on the keyup that confirms IME input. The fixture is jsdom with the same callbacks as S1 (`vi.fn()`) and a `#commitTable` containing `tr.commit` and ref `button`s.

| Case ID | Input / Precondition                                                                                                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type)              | Expected Result                                                                                                                                                                                                                                                                                          | Notes                                                                            |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| TC-493  | Each control after the constructor runs                                                                                                                               | Normal - all controls are named buttons                                                 | `#findCaseSensitive` / `#findRegex` / `#findOpenCdv` / `#findPrev` / `#findNext` / `#findClose` are `button` elements with `type="button"`, their names (`aria-label`) match the existing `title` text (`find.matchCase`, etc.), and `#findInput` has an `aria-label` (equivalent to `find.placeholder`) | K40 / A8.1-6                                                                     |
| TC-494  | Toggle `#findCaseSensitive` / `#findRegex` / `#findOpenCdv` with `click`                                                                                              | Normal - pressed state synced                                                           | Each button's `aria-pressed` is synced with `"true"` / `"false"` and the `active` class, and the search result (`caseSensitive` / regex handling) changes as in S4                                                                                                                                       | K40                                                                              |
| TC-495  | State with 0 matches, and state after `setInputEnabled(false)`                                                                                                        | Boundary - disabled with 0 matches or disabled input                                    | `#findPrev` / `#findNext` are `disabled`, and `click` / `Enter` call `scrollToCommit` 0 times. With 3 matches, `disabled` is removed                                                                                                                                                                     | K40 / A8.3-1                                                                     |
| TC-496  | With 3 matches at position 1, `Enter` keydown → keyup on `#findInput`; in a separate try, Shift + `Enter` keydown → keyup                                             | Normal - Enter is next, Shift + Enter is previous                                       | `Enter` goes to position 2 (`"2 of 3"`), Shift + `Enter` to position 3 (wraps). Each moves only once, with 0 additional moves on keyup                                                                                                                                                                   | K40 / A8.3-2. Keeps the semantics of S5                                          |
| TC-497  | `compositionstart` → `Enter` keydown (`isComposing: true`) → `compositionend` → `Enter` keyup                                                                         | Validation - no move on the Enter / keyup that confirms IME input                       | The position is unchanged (0 `scrollToCommit` calls equivalent to `next`). The confirmed text is reflected in the search string after the debounce (`findMatches` is called)                                                                                                                             | K40 / A8.3-2. Contract change from the current `keyup` detection                 |
| TC-498  | `Enter` keydown (`repeat: true`) × 3                                                                                                                                  | Validation - no continuous moves on repeat                                              | The position changes 0 times                                                                                                                                                                                                                                                                             | A8.3-2                                                                           |
| TC-499  | With real focus on a ref button in row `M`, `show(true)`, then `click` / `Enter` on `#findClose`. Separately, the tab stops of each button while the widget is hidden | Normal - close returns to the origin, and hidden controls leave the tab order           | After `show(true)`, `activeElement` is `#findInput`. After closing, `activeElement` is the original ref button (`restoreFocus(origin, "keyboard")`). While hidden, no button inside `.findWidget` is a tab stop (`hidden` or `tabindex="-1"`)                                                            | K40 / A8.1-6                                                                     |
| TC-500  | `findMatches()` → `clearMatches()` with a string that matches a ref button in row `M` (with a FocusKey and an `aria-label`)                                           | Validation - adding / removing search spans does not break the button or its attributes | After inserting the span, the ref `button` element is the same (`toBe`) and `aria-label` / `tabindex` / `data-name` are unchanged; after `clearMatches()` there are 0 `span.findMatch` and `textContent` is back to the original                                                                         | K40 / A8.3-3. "Replacing matched text does not break buttons or aria attributes" |
| TC-501  | Debounce after typing (`SEARCH_DEBOUNCE_MS`) and entering an invalid regex                                                                                            | Normal - search semantics kept                                                          | `findMatches` runs only once after the debounce, and an invalid regex gives 0 matches without an exception (same as S3 / S7)                                                                                                                                                                             | A8.2-3                                                                           |
| TC-502  | `ArrowDown` keydown with real focus on `#findInput`                                                                                                                   | Validation - arrows are not taken over while typing                                     | `defaultPrevented === false`, `scrollToCommit` called 0 times                                                                                                                                                                                                                                            | Component side of K19                                                            |

### Failure-source inventory (include-or-justify) — added by Feature 061-05 (S11)

| Failure source                                                        | Covering case or reason for exclusion                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Controls are not buttons or have no name                              | TC-493                                                                         |
| Pressed / disabled state mismatch                                     | TC-494, TC-495                                                                 |
| Meaning of Enter / Shift + Enter, wrong moves on IME / repeat / keyup | TC-496 to TC-498                                                               |
| Where focus returns on close, tab stops while hidden                  | TC-499                                                                         |
| Search spans break buttons / attributes                               | TC-500                                                                         |
| Regression of debounce / regex, arrows taken over                     | TC-501, TC-502                                                                 |
| External dependencies, exceptions                                     | excluded(callbacks are spies, with no external dependencies and no throw path) |

### Task 12 test mapping (Feature 061-05) — S11

- Tests: describe `FindWidget standard controls, IME guard and focus survival (S11)` in `tests/web/findWidget.test.ts`. The fixture registers `configureFocusContext` in `beforeEach` and disposes of it in `afterEach`. `installKeyboardGuards` is not registered; TC-497 / TC-498 are verified by checks on the event's own values (`isComposing` / `repeat`) (tracking the composition state is covered by `keyboardNavigation-test.md` S2 TC-013 to TC-024). TC-493 to TC-502 each have one `it` with the same number
- Manual case (not done) TC-497 (Enter / keyup right after IME confirmation): the manual list at the top of `web/main-test/13-keyboard-accessibility-01.md` (IME row). In jsdom it is substituted with a synthetic sequence `compositionstart → keydown → compositionend → keyup`
- Execution result (2026-10-07): 10 pass

## S12: Recording the origin for each search session (including opening from body)

> Origin: Feature 061-05 (PR #105 review)
> Added: 2026-10-08
> Status: active
> Supersedes: -
> Signature: `show(transition: boolean)` / `close(reason?: FocusCloseReason)`
> Target Path: `web/findWidget.ts:212-245, 544-558` (`show` / `close`, `rememberOrigin`)
> Test File: `tests/web/findWidget.test.ts`

The search side of finalized spec §4.7, "closing with the keyboard returns focus to the origin. The restore order is … → the target row → the empty list container". S11 TC-499 only covers opening from a ref button; when opened from body, no origin was recorded, so after closing, focus either stayed on the off-screen `#findClose` or went back to the origin of the previous session. A new session (`show` from hidden) records the origin again, and when opened from body it keeps only the repository and leaves the rest to the context's restore order (target row → `#commitTable` → repository button). The fixture is a `configureFocusContext` whose `getActiveRow` returns a `tr` (`tabindex="0"`), and a ref button with a FocusKey inside that row. S11 is kept, so this section is additive.

| Case ID | Input / Precondition                                                                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                 | Notes                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| TC-503  | `show(true)` while `activeElement` is body, then focus `#findClose` and `click`                                                     | Boundary - session with no origin (body)                                   | The widget is hidden, and `activeElement` is the target row. Focus does not stay on the off-screen `#findClose` | Devin finding. RED before the fix      |
| TC-504  | `show(true)` from a ref button → `close("keyboard")` (returns to the ref button), then `show(true)` from body → `close("keyboard")` | Validation - the origin of the previous session is not reused              | After the second close, `activeElement` is the target row, not the ref button from the first time               | CodeRabbit finding. RED before the fix |
| TC-505  | `show(true)` from a ref button, then `show(true)` again with focus on `#findInput` → `close("keyboard")`                            | Normal - re-`show` while visible keeps the origin                          | `activeElement` is the ref button (a re-`show` from inside the widget does not overwrite the origin)            | Keeps existing behaviour               |

### Failure-source inventory (include-or-justify) — added by PR #105 review (S12)

| Failure source                                    | Covering case or reason for exclusion                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------ |
| No restore target for a session opened from body  | TC-503                                                                         |
| Reusing the origin of the previous session        | TC-504                                                                         |
| Overwriting the origin by re-`show` while visible | TC-505                                                                         |
| External dependencies, exceptions                 | excluded(callbacks are spies, with no external dependencies and no throw path) |

### Test mapping (PR #105 review) — S12

- Tests: describe `FindWidget focus origin per search session (S12)` in `tests/web/findWidget.test.ts`. TC-503 to TC-505 each have one `it` with the same number
- RED → GREEN: with `show()` before the fix, TC-503 (`activeElement` is `#findClose`) and TC-504 (`activeElement` is the ref button from the first time) fail, and TC-505 passes. After the fix, all 3 pass
- Execution result (2026-10-08): 66 pass in `tests/web/findWidget.test.ts`
