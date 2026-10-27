# Test Perspectives: web/commitMenu.ts

> Source: `web/commitMenu.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: Create Branch dialog (with a checkout checkbox)

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**Target path**: `web/commitMenu.ts:59-75`

| Case ID | Input / Precondition                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                               | Notes                    |
| ------- | -------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------ |
| TC-001  | Select the Create Branch menu item                       | Normal - standard                                                          | showFormDialog is called with 2 elements: text-ref + checkbox | Not showRefInputDialog   |
| TC-002  | Default value of the checkbox when the dialog opens      | Normal - standard                                                          | The Check out checkbox defaults to ON (true)                  | Design spec              |
| TC-003  | Submit with a valid branch name + checkout=true          | Normal - standard                                                          | The RequestCreateBranch message contains checkout: true       | -                        |
| TC-004  | Submit with a valid branch name + checkout=false         | Normal - standard                                                          | The RequestCreateBranch message contains checkout: false      | -                        |
| TC-005  | Submit with an empty branch name                         | Boundary - empty name                                                      | The dialog's validation blocks the submit                     | Existing validation kept |
| TC-006  | The branch name contains invalid characters (refInvalid) | Boundary - invalid ref                                                     | The dialog's live validation shows the error indicator        | Existing validation kept |

## S2: Merge dialog extension (form with 3 checkboxes)

> Origin: Feature 014 (dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-09
> Status: active
> Supersedes: -

**Target path**: `web/commitMenu.ts:184-210`

| Case ID | Input / Precondition                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                              | Notes                           |
| ------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| TC-007  | Select the Merge menu item (commit merge)                     | Normal - standard                                                          | showFormDialog is called with 3 checkboxes                                                                   | Changed from showCheckboxDialog |
| TC-008  | Default value of the No FF checkbox                           | Normal - standard                                                          | Reflects viewState.dialogDefaults.merge.noFastForward                                                        | -                               |
| TC-009  | Default value of the Squash checkbox                          | Normal - standard                                                          | Reflects viewState.dialogDefaults.merge.squashCommits                                                        | -                               |
| TC-010  | Default value of the No Commit checkbox                       | Normal - standard                                                          | Reflects viewState.dialogDefaults.merge.noCommit                                                             | -                               |
| TC-011  | Get the 3 values in the callback and press the confirm button | Normal - standard                                                          | RequestMergeCommit contains createNewCommit, squash, noCommit                                                | Verified via sendMessage        |
| TC-012  | Configuration of the Squash checkbox                          | Normal - standard                                                          | The Squash checkbox has an info property (tooltip text)                                                      | -                               |
| TC-013  | Configuration of the No Commit checkbox                       | Normal - standard                                                          | The No Commit checkbox has an info property (tooltip text)                                                   | -                               |
| TC-014  | Turn Squash ON                                                | Normal - mutual exclusion                                                  | The No FF checkbox becomes disabled + unchecked                                                              | UI mutual exclusion             |
| TC-015  | Turn Squash ON → OFF                                          | Normal - mutual exclusion                                                  | The No FF checkbox becomes enabled and returns to its default (viewState.dialogDefaults.merge.noFastForward) | UI mutual exclusion restored    |

## S3: Cherry-pick dialog extension (form with 2 checkboxes)

> Origin: Feature 014 (dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-09
> Status: active
> Supersedes: -

**Target path**: `web/commitMenu.ts:98-140`

| Case ID | Input / Precondition                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                           | Notes                               |
| ------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------- |
| TC-016  | Cherry Pick a normal commit (1 parent)                                     | Normal - standard                                                          | showFormDialog is called with 2 checkboxes                | Changed from showConfirmationDialog |
| TC-017  | Cherry Pick a merge commit (several parents)                               | Normal - standard                                                          | showFormDialog is called with select + 2 checkboxes       | Changed from showSelectDialog       |
| TC-018  | Default value of the Record Origin checkbox                                | Normal - standard                                                          | Reflects viewState.dialogDefaults.cherryPick.recordOrigin | -                                   |
| TC-019  | Default value of the No Commit checkbox                                    | Normal - standard                                                          | Reflects viewState.dialogDefaults.cherryPick.noCommit     | -                                   |
| TC-020  | Get recordOrigin and noCommit in the callback and press the confirm button | Normal - standard                                                          | RequestCherrypickCommit contains recordOrigin, noCommit   | Verified via sendMessage            |
| TC-021  | Configuration of the Record Origin / No Commit checkboxes                  | Normal - standard                                                          | Both checkboxes have an info property (tooltip text)      | -                                   |

## S4: Create Worktree Here dialog

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: active
> Supersedes: -

**Target path**: `web/commitMenu.ts`

| Case ID | Input / Precondition                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                             | Notes                |
| ------- | --------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| TC-022  | Select the Create Worktree Here menu item     | Normal - standard                                                          | showFormDialog is called with 3 fields: Branch Name (text-ref) + Path (text) + Open Terminal (checkbox)                     | REQ-3.1, REQ-3.3     |
| TC-023  | The Branch Name field is empty                | Boundary - empty name                                                      | The text-ref validation disables the submit button                                                                          | REQ-3.1-TC3          |
| TC-024  | Default value of Path                         | Normal - standard                                                          | An empty branch name becomes `worktree`, and the default template resolves to `/test/repo-worktree`                         | REQ-3.3              |
| TC-025  | Default value of Open Terminal                | Normal - standard                                                          | Reflects dialogDefaults.createWorktree.openTerminal (verified in detail in S5 TC-029)                                       | REQ-3.3-TC4, → S5    |
| TC-026  | Submit with valid input                       | Normal - standard                                                          | RequestCreateWorktree contains repo, path, branchName, commitHash, openTerminal                                             | REQ-3.1              |
| TC-027  | Path updates as Branch Name is typed          | Normal - dynamic                                                           | Path follows the Branch Name input and is updated to the resolved default template (`/test/repo-my-branch` for `my-branch`) | REQ-3.3              |
| TC-028  | Change Branch Name after editing Path by hand | Boundary - manual edit                                                     | After the user edits Path by hand, changing Branch Name does not update Path automatically                                  | UX: manual edits win |

## S5: Create Worktree Here reads the openTerminal setting (from a commit)

> Origin: Feature 023 (worktree-dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-25
> Status: active
> Supersedes: -

**Signature**: `commitMenu item onClick → showFormDialog (Create Worktree Here)`
**Target path**: `web/commitMenu.ts:85-89`

| Case ID | Input / Precondition                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                        | Notes                                      |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------ |
| TC-029  | viewState.dialogDefaults.createWorktree.openTerminal = true  | Normal - standard                                                          | The value of the checkbox element at index 2 of showFormDialog's 2nd argument is true  | Extends TC-025 to the setting-read pattern |
| TC-030  | viewState.dialogDefaults.createWorktree.openTerminal = false | Normal - standard                                                          | The value of the checkbox element at index 2 of showFormDialog's 2nd argument is false | New: adds the false pattern                |

> **Why boundary candidates are omitted**: the extension host always sets `viewState.dialogDefaults.createWorktree.openTerminal` to a boolean through `config.ts`, so null / undefined / empty cannot occur by spec. The full boolean domain (true / false) is covered by the Normal cases.

## S6: Create Worktree Here path normalization

> Origin: Feature 024 (worktree-path-normalize) (aidd-spec-tasks-test)
> Added: 2026-03-27
> Status: active
> Supersedes: -

**Target path**: `web/commitMenu.ts:106-113`

| Case ID | Input / Precondition                                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                            | Notes                                               |
| ------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| TC-031  | Branch Name input "feature/x", Path not edited                                         | Normal - standard                                                          | Path is updated to `/test/repo-feature-x`                                  | REQ-9.3: normalization applied                      |
| TC-032  | Branch Name input "a/b/c", Path not edited                                             | Normal - standard                                                          | Path is updated to `/test/repo-a-b-c`                                      | REQ-9.3: normalizing several slashes                |
| TC-033  | Branch Name changes "a/b" → "c/d", Path not edited                                     | Normal - dynamic                                                           | Path matches the previous suggestion, so it is updated to `/test/repo-c-d` | REQ-9.3: lastBranchName keeps the raw value         |
| TC-034  | After typing Branch Name "feature/x", edit Path by hand, then change Branch Name again | Boundary - manual edit                                                     | The hand-edited Path is kept (not updated automatically)                   | REQ-9.3: detecting manual edits under normalization |

> **Why boundary candidates are omitted**: the value of the path input field is built by string concatenation, and null / undefined cannot occur in the normalization chain. Detecting manual edits (TC-034) is the main boundary case under normalization.

## S7: Context menu reorganization (032)

> Origin: Feature 032 (context-menu-reorg) Task 7
> Added: 2026-04-30
> Status: active
> Supersedes: -

**Signature**: `buildCommitContextMenuItems(repo: string, hash: string, parentHashes: string[], commits: GitCommitNode[], commitLookup: { [hash: string]: number }, sourceElem: HTMLElement): ContextMenuElement[]`
**Target path**: `web/commitMenu.ts`

| Case ID | Input / Precondition               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                    | Notes                                     |
| ------- | ---------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| TC-035  | A normal commit with 1 parentHash  | Normal - ordered layout                                                    | The return value has 8 elements, and index 0-3 are `Create Branch...`, `Create Worktree Here...`, `Cherry Pick...`, `Merge into current branch...` | Frequent items at the top                 |
| TC-036  | Same as above                      | Validation - submenu contents                                              | Index 5 is a submenu with `title === "More..."`, and the child titles are `Add Tag...`, `Checkout...`, `Revert...`, `Reset...` in this order       | Groups infrequent and destructive actions |
| TC-037  | A merge commit with 2 parentHashes | Normal - moved action path                                                 | The `onClick` of `Revert...` under `More...` and of `Cherry Pick...` at the top call the merge commit dialog path as before                        | Existing behavior kept                    |
| TC-038  | A normal commit                    | Boundary - divider placement                                               | No consecutive `null`, the first and last elements are not `null`, and the last is `Copy Commit Hash to Clipboard`                                 | Divider rule                              |

## S8: Recent action IDs and save triggers

> Origin: Feature 034 (context-menu-recent-actions) Task 4
> Added: 2026-05-02
> Status: active
> Supersedes: -
> Signature: `buildCommitContextMenuItems(repo: string, hash: string, parentHashes: string[], commits: GitCommitNode[], commitLookup: { [hash: string]: number }, sourceElem: HTMLElement): ContextMenuElement[]`
> Target Path: `web/commitMenu.ts`

| Case ID | Input / Precondition                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                             | Notes                           |
| ------- | --------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| TC-039  | Build the menu for a normal commit                        | Normal - recent ids on top-level                                           | Each of the items `Create Branch...`, `Create Worktree Here...`, `Cherry Pick...`, `Merge into current branch...` gets its `recentActionId` | The top 4 commit items          |
| TC-040  | Check the `More...` submenu of a normal commit menu       | Validation - target-only tagging                                           | Only `Add Tag...` has `recentActionId = "commit.addTag"`; `Checkout...` / `Revert...` / `Reset...` stay out of recent actions               | Destructive / detached excluded |
| TC-041  | Submit the `Create Branch...` dialog                      | Normal - record before send                                                | When the submit callback runs, `recordRecentAction(repo, "commit.createBranch")` is called once before `sendMessage(RequestCreateBranch)`   | Call order guaranteed           |
| TC-042  | Press the `Add Tag...` menu item and only show the dialog | Boundary - dialog cancel                                                   | `showFormDialog` opens, but `recordRecentAction(...)` is not called while the submit callback has not run                                   | Cancel does not add history     |

## S9: Translation key of the Create Branch dialog (Feature 040)

> Origin: Feature 040 (settings-and-copy-polish) (light-spec-plan)
> Added: 2026-05-17
> Status: active
> Supersedes: -
> Signature: `buildCommitContextMenuItems(...)`
> Target Path: `web/commitMenu.ts`

Verifies that the Create Branch dialog prompt opened from a commit uses a different translation key from the one opened from a stash.

| Case ID | Input / Precondition                                                                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                          | Notes                                         |
| ------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| TC-043  | With the commit-origin translation injected into webviewMessages, Create Branch onClick → check showFormDialog | Normal - localized prompt                                                  | The prompt string is the Japanese translation containing 「コミット」 ("commit") and 「作成するブランチ名を入力してください」 ("enter the name of the branch to create") | Guarantees that the commit-origin key is used |

## S10: Plain text generation of merge parent options (Feature 041)

> Origin: Feature 041 (refresh-contention-and-dialog-escape) (light-spec-plan)
> Added: 2026-05-22
> Status: active
> Supersedes: -
> Signature: `buildMergeParentOptions(parentHashes: string[], commits: GitCommitNode[], commitLookup: { [hash: string]: number }): { name: string; value: string }[]`
> Target Path: `web/commitMenu.ts`

A shared helper builds the options passed to the merge parent selection dialog of cherry-pick / revert, and parent commit messages are passed to `DialogSelectInput.options[].name` as plain text. The helper includes no HTML. Escaping happens at the rendering boundary in `web/dialogs.ts`, so the helper does not escape (prevents double encoding).

| Case ID | Input / Precondition                                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                 | Notes                                      |
| ------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| TC-044  | 2 parentHashes; both parents exist in commitLookup and have a message                                   | Normal - dual parent labels                                                | Option names have the form `<abbrevHash>: <message>`, and values are `"1"` / `"2"`                                                                              | Shared by cherry-pick / revert             |
| TC-045  | 1 of the parentHashes is not registered in commitLookup                                                 | Boundary - missing commitLookup entry                                      | That option name is only `<abbrevHash>` (no message part, no `: ` suffix)                                                                                       | Plain form when the lookup is missing      |
| TC-046  | A parent message contains dangerous characters such as `<img onerror=alert(1)>` and `</option><script>` | Boundary - hostile parent message                                          | The message is passed as plain text, not as an HTML-escaped string, in the options array of both cherry-pick's `showFormDialog` and revert's `showSelectDialog` | The helper does not escape                 |
| TC-047  | Pass the same parentHashes / commits / commitLookup to cherry-pick and revert                           | Normal - helper reuse                                                      | The option arrays of both paths are deep-equal                                                                                                                  | Confirms both go through the shared helper |

## S11: Root commit branch of Cherry Pick / Revert (parentHashes.length <= 1)

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: the onClick branches of Cherry Pick / Revert in `buildCommitContextMenuItems()`
> Target Path: `web/commitMenu.ts:190, 247`

A fix that changes the normal-commit check of Cherry Pick / Revert from `parentHashes.length === 1` to `parentHashes.length <= 1`. It resolves [9], where a root commit without parents (`length === 0`) went into the merge branch and rendered a `<select>` with zero options from `buildMergeParentOptions([])`. Building merge parent options for 2 or more parents is unchanged.

| Case ID | Input / Precondition                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                | Notes                                                    |
| ------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| TC-048  | Run Cherry Pick's onClick with `parentHashes = []` (root commit) and confirm | Boundary - normal form for a root commit (cherry pick)                     | `showFormDialog` is called with only 2 checkboxes (no `select` element), and the sent `RequestCherrypickCommit` has `parentIndex` `0`                          | No empty select is rendered                              |
| TC-049  | Run Revert's onClick with `parentHashes = []` (root commit) and confirm      | Boundary - confirmation dialog for a root commit (revert)                  | `showConfirmationDialog` is called (the form dialog with a `select` is not), and the sent `RequestRevertCommit` has `parentIndex` `0`                          | Fixes sending `parseInt("") = NaN`                       |
| TC-050  | Run Cherry Pick's onClick on a merge commit with 2 `parentHashes`            | Normal - the merge branch is kept                                          | `showFormDialog` is called with a `select` holding the 2 options from `buildMergeParentOptions` + 2 checkboxes, and the selected value goes into `parentIndex` | No regression of the existing path for 2 or more parents |

### Failure-source inventory (include-or-justify) — added by Feature 045 (S11)

| Failure source                                                     | Covering case or reason for exclusion                                                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| An empty parent selection `<select>` is rendered for a root commit | TC-048 (cherry pick), TC-049 (revert)                                                                              |
| Sending `parentIndex` as `parseInt("", 10) = NaN`                  | TC-048, TC-049 (verify that `parentIndex` is `0`)                                                                  |
| Losing the parentIndex selection for merge commits (NO-GO)         | TC-050                                                                                                             |
| The extension host's `Invalid parent index.` check                 | excluded(the host-side `Number.isInteger` check is existing behavior and belongs to the `src/dataSource.ts` owner) |
| The branch for normal commits with 1 parent                        | excluded(already covered by S3 TC-016 / S10. The behavior for `length === 1` does not change)                      |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(this change only moves a branch condition boundary and adds no input validation branch)
- Exception: excluded(no throw path exists)
- External: excluded(no external dependency. sendMessage is observed through a mock)
- Boundary: TC-048, TC-049
- Type: excluded(`parentHashes` is typed `string[]` and guaranteed at TypeScript compile time)

The numeric boundaries that matter for this change are `parentHashes.length` of `0` (TC-048/TC-049), `1` (covered by the existing S3/S10) and `2` (TC-050); other maximum / +/-1 values take the same branch and are out of scope.

**Failure/normal ratio (smoke detector)**: 1 normal case (TC-050), 2 failure cases (TC-048, TC-049), ratio 2.0.

## S12: Highlight path submenu (3 commit modes) and the optional callback

> Origin: Feature 061-01 (light-spec-plan)
> Added: 2026-10-03
> Status: active
> Supersedes: -
> Signature: `buildCommitContextMenuItems(repo: string, hash: string, parentHashes: string[], commits: GitCommitNode[], commitLookup: { [hash: string]: number }, sourceElem: HTMLElement, onHighlight?: (mode: CommitPathMode) => void): ContextMenuElement[]`
> Target Path: `web/commitMenu.ts:16-29` (`COMMIT_PATH_MODES` / `buildHighlightPathSubmenu`), `web/commitMenu.ts:45-363` (`buildCommitContextMenuItems`; signature 45-53, submenu insertion 349-362)
> Test File: `tests/web/commitMenu.test.ts`

Perspectives for the normal-commit submenu in implementation plan §3.6. Only when the optional trailing callback `onHighlight` is passed is the `Highlight path` (`t("pathHighlight.menu")`) submenu added, keeping the relative order of existing items, their `recentActionId`, and the trailing `Copy Commit Hash to Clipboard`. Resolving the target repo / hash and building the selection belong to `web/main-test/12-path-highlight-01.md` S68 and are not in this table. S7 (TC-035 to TC-038) and S8 stay active as the contract when the callback is omitted.

| Case ID | Input / Precondition                                                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Notes                                                                                   |
| ------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| TC-051  | Build with `onHighlight = vi.fn()`, for 3 variants: `parentHashes` with 1, 2 and 0 items | Normal - 3 candidates and relative order of existing items                 | In all 3 variants there is exactly 1 submenu item with `title === "Highlight path"`, and the `title` values of its `submenu` are the 3 items `Direct parents and children` / `Ancestors and descendants` / `First-parent ancestors` in this order and without `recentActionId`. The submenu item comes before the trailing `Copy Commit Hash to Clipboard`, and the relative order `Create Branch...` → `Create Worktree Here...` → `Cherry Pick...` → `Merge into current branch...` → `More...` is the same as in S7 TC-035 / TC-036. No consecutive `null`, and the first and last elements are not `null` | Mode candidates do not depend on the number of parents. `All ancestors` is not included |
| TC-052  | Call each `onClick` of the TC-051 submenu once in order                                  | Normal - mode argument of the callback and 0 host sends                    | `onHighlight` is called 3 times in total, with `PathHighlightMode.Direct` / `PathHighlightMode.AncestorsAndDescendants` / `PathHighlightMode.FirstParent` (once each, in click order). The call count of `sendMessage` (`acquireVsCodeApi().postMessage`) is 0, and the call counts of `showFormDialog` / `showConfirmationDialog` / `recordRecentAction` are 0                                                                                                                                                                                                                                               | Parameterized (3 modes). No recent action is recorded                                   |
| TC-053  | Build without `onHighlight` (1 `parentHashes` item)                                      | Boundary - compatibility when the callback is omitted                      | The return value's `title` sequence and `null` positions equal the 8-element array of S7 TC-035 / TC-038 with `toEqual`, and there are 0 `Highlight path` items                                                                                                                                                                                                                                                                                                                                                                                                                                               | Keeps the contract of existing callers and existing unit tests                          |

### Failure-source inventory (include-or-justify) — added by Feature 061-01 (S12)

| Failure source                                                            | Covering case or reason for exclusion                                                            |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Missing or extra mode candidates, wrong order, branch-only modes mixed in | TC-051                                                                                           |
| Changes to existing item order, dividers or the trailing Copy             | TC-051, TC-053                                                                                   |
| Wrong mode passed to the callback, host sends, recent action recorded     | TC-052                                                                                           |
| Items are added when the callback is omitted                              | TC-053                                                                                           |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)             | Callback omitted: TC-053. 0 and 2 `parentHashes`: TC-051. Others: excluded(no numeric threshold) |
| Input validation × violation patterns                                     | excluded(the builder does not validate input; resolving the target belongs to main)              |
| External dependency × failure mode                                        | excluded(dialogs and sending are mocked, and no failure path is added)                           |
| Exception and error paths                                                 | excluded(no throw path)                                                                          |
| Invalid type or format                                                    | excluded(the constraint of `CommitPathMode` is covered by TypeScript type checking)              |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(see the table above)
- Exception: excluded(see the table above)
- External: excluded(see the table above)
- Boundary: TC-053
- Type: excluded(see the table above)
- Normal: TC-051, TC-052
