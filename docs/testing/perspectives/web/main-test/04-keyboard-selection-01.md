# Test Perspectives: web/main.ts

> Source: `web/main.ts`
> Generated: 2026-03-22T14:25:09Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: keyboard-selection

## S10: handleKeyboardShortcut() shortcut key matching

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: superseded
> Superseded By: S72（[13-keyboard-accessibility-01.md](13-keyboard-accessibility-01.md)）
> Supersedes: -

**Signature**: `handleKeyboardShortcut(e: KeyboardEvent): void`
**Target path**: `web/main.ts`

| Case ID | Input / Precondition                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                            | Notes                        |
| ------- | --------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------- |
| TC-065  | Ctrl+F (config find="f")                            | Normal - standard                                                          | findWidget.show(true) is called                            | Find action                  |
| TC-066  | Cmd+F (metaKey=true, config find="f")               | Normal - macOS                                                             | findWidget.show(true) is called                            | macOS support                |
| TC-067  | Ctrl+R (config refresh="r")                         | Normal - standard                                                          | refresh(true) is called                                    | Refresh action               |
| TC-068  | Ctrl+H (config scrollToHead="h"), commitHead exists | Normal - standard                                                          | scrollToCommit(commitHead, true, true) is called           | Scroll to HEAD               |
| TC-069  | Ctrl+H, commitHead is null                          | Boundary - no HEAD                                                         | Nothing happens                                            | No HEAD                      |
| TC-070  | Key press (no Ctrl/Cmd)                             | Validation - no modifier                                                   | Nothing happens                                            | No modifier key              |
| TC-071  | Ctrl + a key not in the config                      | Validation - unmapped key                                                  | Nothing happens                                            | No match                     |
| TC-072  | Ctrl+F with isComposing=true                        | Boundary - IME composing                                                   | Nothing happens                                            | Ignored during IME input     |
| TC-073  | Shift+Ctrl+F (with the Shift modifier)              | Normal - with shift                                                        | e.key is lowercased and matches "f"; findWidget.show(true) | Handles uppercase with Shift |
| TC-074  | Ctrl+F, but the find config is null (UNASSIGNED)    | Boundary - disabled shortcut                                               | Nothing happens                                            | Shortcut disabled            |

## S11: scrollToStash() stash navigation

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**Signature**: `scrollToStash(forward: boolean): void`
**Target path**: `web/main.ts`

| Case ID | Input / Precondition                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                     | Notes                       |
| ------- | ---------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------- |
| TC-075  | forward=true, 3 stashes, index=-1 (initial)          | Normal - first nav                                                         | Scrolls to the first stash (index 0) and flashes it | index=-1 → 0                |
| TC-076  | forward=true, 3 stashes, index=0                     | Normal - standard                                                          | Scrolls to the next stash (index 1)                 | Forward move                |
| TC-077  | forward=true, 3 stashes, index=2 (last)              | Boundary - wrap forward                                                    | Wraps around to the first stash (index 0)           | Last → first                |
| TC-078  | forward=false (Shift), 3 stashes, index=-1 (initial) | Normal - reverse first nav                                                 | Scrolls to the last stash (index 2)                 | Initial reverse move        |
| TC-079  | forward=false, 3 stashes, index=0 (first)            | Boundary - wrap backward                                                   | Wraps around to the last stash (index 2)            | First → last                |
| TC-080  | 0 stash commits                                      | Boundary - no stashes                                                      | Nothing happens (silent)                            | No stashes                  |
| TC-081  | The 5-second timeout passes after a stash action     | Boundary - timeout reset                                                   | stashNavigationIndex is reset to -1                 | STASH_NAVIGATION_TIMEOUT_MS |
| TC-082  | Only 1 stash, forward=true                           | Boundary - single stash                                                    | Scrolls to the same stash (wrap-around)             | index 0 → 0                 |

## S29: handleKeyboardShortcut() Arrow key navigation in table order

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08
> Status: superseded
> Superseded By: S70（[13-keyboard-accessibility-01.md](13-keyboard-accessibility-01.md)）
> Supersedes: -

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                    | Notes        |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------ |
| TC-164  | expandedCommit set, index=2, ArrowDown (no modifier)         | Normal - standard                                                          | Shows the commit details at index=3 (calls loadCommitDetails)      | REQ-2.1      |
| TC-165  | expandedCommit set, index=2, ArrowUp (no modifier)           | Normal - standard                                                          | Shows the commit details at index=1 (calls loadCommitDetails)      | REQ-2.1      |
| TC-166  | expandedCommit set, index=0 (first), ArrowUp                 | Boundary - table start                                                     | Nothing happens (loadCommitDetails not called, event not consumed) | newIndex=-1  |
| TC-167  | expandedCommit set, index=commits.length-1 (last), ArrowDown | Boundary - table end                                                       | Nothing happens (loadCommitDetails not called, event not consumed) | Out of range |

## S30: handleKeyboardShortcut() Arrow key navigation following the branch

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08
> Status: superseded
> Superseded By: S70（[13-keyboard-accessibility-01.md](13-keyboard-accessibility-01.md)）
> Supersedes: -

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                    | Notes   |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------- |
| TC-168  | expandedCommit set, Ctrl+ArrowDown                           | Normal - standard                                                          | Moves to the parent on the same branch via getFirstParentIndex     | REQ-2.2 |
| TC-169  | expandedCommit set, Ctrl+ArrowUp                             | Normal - standard                                                          | Moves to the child on the same branch via getFirstChildIndex       | REQ-2.2 |
| TC-170  | End of the branch, Ctrl+ArrowDown (getFirstParentIndex → -1) | Boundary - branch end                                                      | Nothing happens (loadCommitDetails not called, event not consumed) | -       |
| TC-171  | Start of the branch, Ctrl+ArrowUp (getFirstChildIndex → -1)  | Boundary - branch start                                                    | Nothing happens (loadCommitDetails not called, event not consumed) | -       |

## S31: handleKeyboardShortcut() Arrow key navigation to alternative branches

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08
> Status: superseded
> Superseded By: S70（[13-keyboard-accessibility-01.md](13-keyboard-accessibility-01.md)）
> Supersedes: -

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                  | Notes   |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------- |
| TC-172  | A merge commit is expanded, Ctrl+Shift+ArrowDown                     | Normal - standard                                                          | Moves to the alternative parent commit via getAlternativeParentIndex             | REQ-2.3 |
| TC-173  | A commit is expanded, Ctrl+Shift+ArrowUp                             | Normal - standard                                                          | Moves to the alternative child commit via getAlternativeChildIndex               | REQ-2.3 |
| TC-174  | No alternative branch (at most 1 parent/child), Ctrl+Shift+ArrowDown | Normal - fallback                                                          | Fallback behavior (the single parent if there is one, otherwise nothing happens) | -       |

## S32: handleKeyboardShortcut() Arrow key precondition checks

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08
> Status: superseded
> Superseded By: S64（[04-keyboard-selection-02.md](04-keyboard-selection-02.md)）
> Supersedes: -

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                    | Notes            |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------- |
| TC-175  | ArrowDown with expandedCommit null                           | Validation - rejected precondition                                         | Arrow key handling is skipped (loadCommitDetails not called)       | REQ-2.4          |
| TC-176  | ArrowDown with expandedCommit.compareWithHash non-null       | Validation - rejected precondition                                         | Arrow key handling is skipped (in compare mode)                    | REQ-2.4          |
| TC-177  | ArrowDown with expandedCommit.hash missing from commitLookup | Boundary - unknown hash                                                    | Navigation handling is skipped                                     | -                |
| TC-178  | ArrowDown with isComposing=true                              | Validation - rejected precondition                                         | handleKeyboardShortcut returns immediately as a whole              | During IME input |
| TC-179  | expandedCommit set, ArrowLeft key                            | Validation - rejected precondition                                         | Arrow key handling is skipped (only ArrowUp/ArrowDown are handled) | -                |

## S33: handleKeyboardShortcut() Arrow key event control

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08
> Status: superseded
> Superseded By: S64（[04-keyboard-selection-02.md](04-keyboard-selection-02.md)）
> Supersedes: -

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                 | Notes                |
| ------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------- |
| TC-180  | Navigation succeeds (valid newIndex and the DOM element exists) | Normal - standard                                                          | preventDefault() and stopPropagation() are called               | REQ-2.5              |
| TC-181  | Navigation fails (newIndex=-1 or no DOM element)                | Normal - no nav                                                            | preventDefault() and stopPropagation() are not called           | Event passes through |
| TC-182  | Shift only + ArrowUp (no Ctrl/Cmd)                              | Validation - rejected precondition                                         | Arrow key handling is skipped (modifier pattern does not match) | Fall-through         |
| TC-183  | Alt + ArrowUp (no Ctrl/Cmd)                                     | Validation - rejected precondition                                         | Arrow key handling is skipped (modifier pattern does not match) | Fall-through         |

## S40: handleEscape() priority chain

> Origin: test-plan (既存コード網羅)
> Added: 2026-05-17
> Status: superseded
> Superseded By: S65（[04-keyboard-selection-02.md](04-keyboard-selection-02.md)）
> Supersedes: -
> Signature: `handleEscape(): void`
> Target Path: `web/main.ts`

The dismissal chain when Escape is pressed: `contextMenu → dialog → repoDropdown → branchDropdown → authorDropdown → findWidget → expandedCommit`. At each level, if the matching UI is active, it calls hide / close and returns early, and later levels do not run.

| Case ID | Input / Precondition                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                   | Notes                                        |
| ------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| TC-221  | `isContextMenuActive()` is true                                 | Normal - first priority                                                    | `hideContextMenu()` is called once, and the later hide calls (dialog/dropdown/findWidget) are not | Closes the context menu first                |
| TC-222  | contextMenu inactive, `isDialogActive()` true                   | Normal - second priority                                                   | `hideDialog()` is called once, and the dropdowns / findWidget / expandedCommit are untouched      | Dialog takes priority                        |
| TC-223  | contextMenu/dialog inactive, `repoDropdown.isOpen()` true       | Normal - third priority                                                    | `repoDropdown.close()` is called, and the later branch/author dropdowns are not closed            | Closes only the repo dropdown                |
| TC-224  | The repo dropdown is also closed, `findWidget.isVisible()` true | Normal - findWidget priority                                               | `findWidget.close()` is called, and `hideCommitDetails` is not                                    | findWidget comes next                        |
| TC-225  | findWidget is also hidden, `expandedCommit !== null`            | Normal - last fallback                                                     | `hideCommitDetails()` is called                                                                   | Last step of the chain                       |
| TC-226  | All of the above inactive                                       | Boundary - no active UI                                                    | No hide/close API is called, and Escape passes through as a no-op                                 | No side effects on the DOM state             |
| TC-227  | `contextMenu` and `dialog` both active                          | Validation - priority order                                                | Only `hideContextMenu()` is called, and `hideDialog()` is not                                     | contextMenu takes priority over dialog       |
| TC-228  | `repoDropdown` and `branchDropdown` both open                   | Validation - priority order                                                | Only `repoDropdown.close()` is called, and `branchDropdown.close()` is not                        | The first open one in declaration order wins |

## S46: handleKeyboardShortcut() editable-element guard on the Arrow navigation branch

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: superseded
> Superseded By: S70（[13-keyboard-accessibility-01.md](13-keyboard-accessibility-01.md)）
> Supersedes: -
> Signature: the Arrow branch of `handleKeyboardShortcut(e: KeyboardEvent): void` + the editable-element predicate
> Target Path: `web/main.ts:1226-1263`

A fix that adds a small predicate to the ArrowUp/ArrowDown commit-move branch to check whether the event target is an editable element (`input` / `textarea` / `select` / contenteditable), and returns without moving the commit when the event comes from an editable element. The predicate is used only inside the Arrow branch and does not return at the top of the function (keeping global shortcuts such as Ctrl/Cmd+F while typing, and the existing Arrow navigation on non-editable elements). Fix for [4]. The existing Arrow navigation perspectives in S29 to S33 are unchanged.

| Case ID | Input / Precondition                                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                     | Notes                                           |
| ------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| TC-257  | CDV expanded (at a movable index), dispatch an ArrowDown keydown targeting an `<input>` element   | Validation - suppression for an input target                               | `loadCommitDetails` called 0 times, `preventDefault()` / `stopPropagation()` called 0 times (caret movement is not taken over)      | Represents the search field and dialog inputs   |
| TC-258  | CDV expanded, dispatch an ArrowUp keydown targeting a `<textarea>` element                        | Validation - suppression for a textarea target                             | `loadCommitDetails` 0 times, `preventDefault()` / `stopPropagation()` 0 times                                                       | -                                               |
| TC-259  | CDV expanded, dispatch an ArrowDown keydown targeting a `<select>` element                        | Validation - suppression for a select target                               | `loadCommitDetails` 0 times, `preventDefault()` / `stopPropagation()` 0 times                                                       | Keeps dropdown operation                        |
| TC-260  | CDV expanded, dispatch an ArrowDown keydown targeting a `contenteditable` element                 | Validation - suppression for a contenteditable target                      | `loadCommitDetails` 0 times, `preventDefault()` / `stopPropagation()` 0 times                                                       | Does not depend on `document.activeElement`     |
| TC-261  | CDV expanded, dispatch an ArrowDown keydown targeting `document.body` (an adjacent commit exists) | Normal - existing navigation kept for non-editable elements                | `loadCommitDetails` is called once, and `preventDefault()` / `stopPropagation()` are each called once (same behavior as S29 TC-164) | No regression from adding the guard             |
| TC-262  | Dispatch a Ctrl+F keydown targeting an `<input>` element (config find="f")                        | Normal - global shortcut kept while typing                                 | `findWidget.show(true)` is called once (there is no blanket return at the top of the function)                                      | Detects the NO-GO condition (return at the top) |

### Failure-source inventory (include-or-justify) — added for Feature 045 (S46)

| Failure source                                                                 | Covering case or reason for exclusion                                                           |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Arrow from an `input` moves the commit (input is hijacked)                     | TC-257                                                                                          |
| Arrow from a `textarea`                                                        | TC-258                                                                                          |
| Arrow from a `select`                                                          | TC-259                                                                                          |
| Arrow from contenteditable                                                     | TC-260                                                                                          |
| A blanket return at the top of the function disables existing global shortcuts | TC-262                                                                                          |
| Regression of Arrow navigation on non-editable elements                        | TC-261                                                                                          |
| Firing during IME input                                                        | excluded(already covered by the existing S32 TC-178; this change does not alter that behavior)  |
| Branches on modifier patterns and boundary indexes                             | excluded(already covered by the existing S29 to S33; this change only targets the target check) |

**Failure-category coverage (diversity floor)**:

- Validation: TC-257, TC-258, TC-259, TC-260
- Exception: excluded(the predicate only reads DOM properties and has no throw branch)
- External: excluded(no external dependencies; the tests dispatch keydown directly)
- Boundary: excluded(the spec has no numeric or empty-value boundaries. The 4 target kinds are the boundary of this change and are covered by the 4 Validation cases)
- Type: excluded(the event target is a DOM type, and the runtime type branch is the element-kind check included in the 4 Validation cases)

**Failure/normal ratio (smoke detector)**: 2 normal cases (TC-261, TC-262), 4 failure cases (TC-257 to TC-260), ratio 2.0.

## S58: handleEscape() closing the ref list step by step

> Origin: Feature 059-02 (light-spec-plan)
> Added: 2026-09-24
> Status: superseded
> Superseded By: S72（[13-keyboard-accessibility-01.md](13-keyboard-accessibility-01.md)）
> Supersedes: -
> Signature: `handleEscape(): void` (adds the call to `RefOverflowController.closePopup(): boolean` after the existing dropdowns and before findWidget)
> Target Path: `web/main.ts` (`handleEscape()`; to be updated to a line range after implementation)
> Test File: `tests/web/main.refOverflow.test.ts`

The Esc order becomes `contextMenu → dialog → repoDropdown → branchDropdown → authorDropdown → ref一覧 → findWidget → expandedCommit`, and if `closePopup()` returns `true`, that Esc ends there. The existing S40 order still holds as is when the list is closed, so this section is additive. The list is opened by clicking the counter with the real controller.

| Case ID | Input / Precondition                                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                        | Notes                                                       |
| ------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| TC-457  | First Esc with the list open and a context menu opened from one of its copies                | Normal - closes the menu first                                             | Only `hideContextMenu()` is called, and there is still 1 `.refOverflowPopup`                           | AC-04                                                       |
| TC-458  | After TC-457, second Esc with findWidget still shown and commit details still expanded       | Normal - the next Esc closes only the list                                 | There are 0 `.refOverflowPopup`, and `findWidget.close()` and `hideCommitDetails()` are called 0 times | AC-04                                                       |
| TC-459  | Esc with a dialog shown and the list shown                                                   | Validation - dialog takes priority                                         | Only `hideDialog()` is called, and the list stays at 1                                                 | -                                                           |
| TC-460  | Esc with each of the repo / branch / author dropdowns opened in turn and the list also shown | Validation - existing dropdowns take priority                              | Only `close()` of the open dropdown is called, and the list stays at 1                                 | The order among the existing dropdowns stays as in S40      |
| TC-461  | Esc with the list shown, findWidget shown and commit details expanded                        | Normal - the list before search and details                                | The list goes to 0, and `findWidget.close()` and `hideCommitDetails()` are called 0 times              | The Esc that closes the list does not close other UI. AC-04 |
| TC-462  | Esc with the list not open (`closePopup()` returns `false`) and findWidget shown             | Boundary - no list, continues in the existing order                        | `findWidget.close()` is called once                                                                    | Keeps S40 TC-224                                            |
| TC-463  | Esc with the menu, dialog, dropdowns, list, findWidget and commit details all inactive       | Boundary - nothing is open                                                 | No hide / close call is made, and no `.refOverflowPopup` is created                                    | Keeps S40 TC-226                                            |

### Failure-source inventory (include-or-justify) — added for Feature 059-02 (S58)

| Failure source                                              | Covering case or reason for exclusion                                        |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------- |
| The menu and the list close on the same Esc                 | TC-457, TC-458                                                               |
| The Esc that closes the list also closes search and details | TC-458, TC-461                                                               |
| Breaking the existing priority of dialogs and dropdowns     | TC-459, TC-460                                                               |
| Not moving on to later steps when there is no list          | TC-462, TC-463                                                               |
| Parsing the search pattern                                  | excluded(belongs to `web/findWidget-test.md`)                                |
| External dependencies and exceptions                        | excluded(only checks DOM state, with no external dependencies or throw path) |

**Failure-category coverage (diversity floor)**:

- Validation: TC-459, TC-460
- Exception: excluded(no throw path)
- External: excluded(no external dependencies)
- Boundary: TC-462, TC-463
- Type: excluded(key matching belongs to the existing S10)

**Failure/normal ratio (smoke detector)**: 3 normal cases (TC-457, TC-458, TC-461), 4 failure cases.

### Feature 059-02 test mapping and execution evidence (S58)

- Test file: describe `handleEscape with the ref list (S58)` in `tests/web/main.refOverflow.test.ts`. The list is opened by clicking the counter with the real controller; the menu is the real contextMenu (calls recorded with a spy), the dialog is the real dialogs, search is the real FindWidget (spy on `FindWidget.prototype.close`), and commit details are judged by whether `#commitDetails` exists
- Case mapping: TC-457/TC-458 check the first and second Esc in order in the same `it`. TC-459, TC-460 (`it.each` over the 3 dropdowns), TC-461, TC-462 and TC-463 each have their own `it`
- Real browser check (Chromium headless, real key input): with a menu opened from the list, Esc closes only the menu and keeps the list, and the next Esc closes the list. With a confirmation dialog shown, Esc closes only the dialog and keeps the list
