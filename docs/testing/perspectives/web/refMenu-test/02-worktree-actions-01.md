# Test Perspectives: web/refMenu.ts

> Source: `web/refMenu.ts`
> Generated: 2026-08-03T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: worktree-actions

## S8: buildRefContextMenuItems() worktree menu items

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: superseded
> Superseded By: S23
> Supersedes: -

**Target path**: `web/refMenu.ts`

| Case ID | Input / Precondition                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                  | Notes            |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------- |
| TC-033  | Local branch, worktreeInfo = null                            | Normal - standard                                                          | The menu contains "Create Worktree..."                                                           | REQ-2.3-TC1      |
| TC-034  | Local branch, worktreeInfo = { path, isMainWorktree: false } | Normal - standard                                                          | The menu contains the 3 items "Open Terminal Here" / "Copy Worktree Path" / "Remove Worktree"    | REQ-2.3-TC2      |
| TC-035  | Local branch, worktreeInfo = { path, isMainWorktree: true }  | Normal - main wt                                                           | The menu contains only "Open Terminal Here" / "Copy Worktree Path" (no Remove Worktree)          | REQ-2.3-TC4      |
| TC-036  | Remote branch                                                | Normal - exclusion                                                         | The menu contains no worktree-related items at all                                               | REQ-2.3-TC3      |
| TC-037  | Select Create Worktree...                                    | Normal - standard                                                          | showFormDialog is called with 2 fields, Path and Open Terminal                                   | REQ-3.2, REQ-3.3 |
| TC-038  | Path default of the Create Worktree dialog                   | Normal - standard                                                          | In the form `../<repoName>-<sanitize(branchName)>`                                               | REQ-3.3-TC3      |
| TC-039  | Select Open Terminal Here                                    | Normal - standard                                                          | The sendMessage openTerminal contains path and name                                              | REQ-9.1          |
| TC-040  | Select Copy Worktree Path                                    | Normal - standard                                                          | The sendMessage copyToClipboard contains type: "worktreePath" and data: path                     | REQ-9.2          |
| TC-041  | Select Remove Worktree                                       | Normal - standard                                                          | showConfirmationDialog is called, and the confirmation message contains the branch name and path | REQ-4.1          |

## S11: Create Worktree dialog reflects the Open Terminal setting

> Origin: Feature 019 (worktree-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-15
> Status: active
> Supersedes: -

**Target path**: `web/refMenu.ts`

| Case ID | Input / Precondition                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                 | Notes       |
| ------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------- |
| TC-048  | viewState.dialogDefaults.createWorktree.openTerminal=true  | Normal - standard                                                          | The Open Terminal checkbox of showFormDialog is shown checked   | REQ-9.1-TC1 |
| TC-049  | viewState.dialogDefaults.createWorktree.openTerminal=false | Normal - standard                                                          | The Open Terminal checkbox of showFormDialog is shown unchecked | REQ-9.1-TC2 |

## S12: Remove Worktree dialog with branch deletion

> Origin: Feature 019 (worktree-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-15
> Status: superseded
> Superseded By: S24
> Supersedes: -

**Target path**: `web/refMenu.ts`

| Case ID | Input / Precondition                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                              | Notes                          |
| ------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------ |
| TC-050  | Select Remove Worktree, non-main worktree                  | Normal - standard                                                          | showFormDialog is called with a checkbox input               | REQ-4.1-TC1                    |
| TC-051  | viewState.dialogDefaults.removeWorktree.deleteBranch=true  | Normal - standard                                                          | The checkbox defaults to checked                             | REQ-9.2-TC1                    |
| TC-052  | viewState.dialogDefaults.removeWorktree.deleteBranch=false | Normal - standard                                                          | The checkbox defaults to unchecked                           | REQ-9.2-TC2                    |
| TC-053  | Check the checkbox's info property                         | Normal - standard                                                          | info holds the text explaining safe deletion (git branch -d) | REQ-4.1-TC2                    |
| TC-054  | Checkbox ON + press the Remove button                      | Normal - standard                                                          | sendMessage contains deleteBranch: true                      | REQ-4.1                        |
| TC-055  | Checkbox OFF + press the Remove button                     | Normal - standard                                                          | sendMessage contains deleteBranch: false                     | REQ-4.1                        |
| TC-056  | The dialog's action button name                            | Normal - standard                                                          | The button text is "Remove"                                  | REQ-4.1                        |
| TC-057  | The confirmation message content                           | Normal - standard                                                          | The message contains the branch name and the worktree path   | REQ-4.1 existing behavior kept |

## S16: Passing the raw Remove Worktree checkbox name (single escaping boundary)

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: the `showFormDialog` call of `removeWorktreeItem` in `buildRefContextMenuItems()`
> Target Path: `web/refMenu.ts:402-420`

A fix that passes the raw `refName` to the `name` of the "Also delete branch" checkbox in the Remove Worktree dialog, making the checkbox rendering of `showFormDialog` (`escapeHtml` in `web/dialogs.ts`) the only HTML escaping boundary. Removing the caller's prior `escapeHtml` resolves [7], where `feature/login` was shown double-escaped as `feature&#x2F;login`. The shared escaping implementation on the dialog side itself belongs to the `web/dialogs-test.md` owner (S6 TC-034).

| Case ID | Input / Precondition                                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                  | Notes                        |
| ------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| TC-079  | Run the Remove Worktree onClick on a branch with a worktree and `refName = "feature/a&b"` | Normal - passing the raw name                                              | The `name` argument of the `showFormDialog` checkbox element receives the raw `feature/a&b` without `&amp;` / `&#x2F;` (inside the string after the translation template is applied). Mock check: call arguments | Prior escaping removed       |
| TC-080  | Render the dialog for real under the same conditions                                      | Boundary - double escaping resolved                                        | The checkbox label's `textContent` shows `feature/a&b` as is, and the literal strings `&amp;` / `&#x2F;` do not appear (escaping happens only once, at the dialogs.ts boundary)                                  | Observation condition of [7] |

### Failure-source inventory (include-or-justify) — added for Feature 045 (S16)

| Failure source                                               | Covering case or reason for exclusion                                                              |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Double-escaped display caused by the caller's prior escaping | TC-079, TC-080                                                                                     |
| Missing escaping (the raw name is expanded as HTML)          | excluded(escaping at the rendering boundary is already covered by `web/dialogs-test.md` S6 TC-034) |
| Escaping of the dialog body (message)                        | excluded(the body's `escapeHtml` is out of scope and keeps its existing behavior)                  |
| Passing refName to the git operation                         | excluded(the sent payload uses the raw refName as before; this change affects only the display)    |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(this change only concerns the argument-passing contract and adds no validation branch)
- Exception: excluded(there is no throw path)
- External: excluded(no external dependencies; the dialog is observed through a mock or jsdom rendering)
- Boundary: TC-080
- Type: excluded(`name` is of type `string`, guaranteed at TypeScript compile time)

Numeric and empty-value boundaries (0 / minimum / maximum / +/-1 / empty / NULL) are out of scope, because this section targets the contract on how many times escaping happens and they have no meaning in the spec (the meaningful boundary is covered by TC-079/TC-080 with a refName containing `&` / `/`).

**Failure/normal ratio (smoke detector)**: 1 normal case (TC-079), 1 failure case (TC-080). Since the counts are equal, the inventory was re-derived, confirming that the only failure source of this change is double escaping and that the other failure sources are covered by the exclusion reasons in the table above (separate owners).

## S22: Keeping the menu contract for worktrees with a branch after extracting the shared builder

> Origin: Feature 053 (detached-worktree-menu) (light-spec-plan)
> Added: 2026-09-13
> Status: active
> Supersedes: -
> Signature: `buildRefContextMenuItems(repo, refName, sourceElem, isRemoteCombined, gitBranchHead, remotes?, worktreeInfo?): ContextMenuElement[]`
> Target Path: `web/refMenu.ts:309-312` (worktreeItems)
> Test File: `tests/web/refMenu.test.ts`

S8's TC-034 / TC-039 / TC-040 check only whether items exist, with `toContain`. This section fixes the order and where the terminal name comes from. `WORKTREE_PATH = "/home/user/project-feature"`, `REPO = "/test/repo"`.

| Case ID | Input / Precondition                                                                                                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Notes |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| TC-106  | `createMockElement(["head"])`, `refName = "feature/x"`, `gitBranchHead = "feature/x"`, `worktreeInfo = { path: WORKTREE_PATH, isMainWorktree: false }` | Normal - HEAD branch menu order                                            | The sequence of `title` / `null` is `Pull`, `Push`, `null`, `Open in New Window`, `Reveal in File Manager`, `Open Terminal Here`, `Copy Worktree Path`, `null`, `More...`, `null`, `Copy Branch Name to Clipboard`. The `recentActionId` at index 3 to 5 is `ref.openWorktreeInNewWindow` / `ref.revealWorktreeInOS` / `ref.openTerminal`. `onClick()` at index 5 calls `sendMessage` once with `{ command: "openTerminal", repo: REPO, path: WORKTREE_PATH, name: "Worktree: feature/x" }`      | -     |
| TC-107  | Same conditions with `gitBranchHead = "main"`                                                                                                          | Normal - non-HEAD local branch menu order                                  | The sequence is `Checkout Branch`, `Merge into current branch&#8230;`, `Rebase current branch on Branch&#8230;`, `null`, the 4 shared items, `null`, `More...`, `null`, `Copy Branch Name to Clipboard`. The `title` values in the `submenu` of `More...` are `Rename Branch&#8230;`, `Delete Branch&#8230;`, `Remove Worktree&#8230;` in that order. `onClick()` of `Remove Worktree&#8230;` calls `showFormDialog` once, with an input array (2nd argument) of length 1 and `type: "checkbox"` | -     |

### Failure-source inventory (include-or-justify) — added for Feature 053 (S22)

| Failure source                                  | Covering case or reason for exclusion |
| ----------------------------------------------- | ------------------------------------- |
| Order changes from sharing the builder          | TC-106, TC-107                        |
| The terminal name becomes the last path segment | TC-106                                |
| Replaced by the Remove for detached worktrees   | TC-107                                |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(this section fixes an existing contract and adds no branch)
- Exception: excluded(same as above)
- External: excluded(same as above)
- Boundary: excluded(same as above)
- Type: excluded(same as above)

## S23: buildRefContextMenuItems() worktree menu items

> Origin: Feature 060-03 (light-spec-plan)
> Added: 2026-09-29
> Status: active
> Supersedes: S8
> Signature: `buildRefContextMenuItems(repo: string, refName: string, sourceElem: HTMLElement, isRemoteCombined: boolean, gitBranchHead: string | null, remotes?: string[], worktreeInfo?: { path: string; isMainWorktree: boolean } | null): ContextMenuElement[]`
> Target Path: `web/refMenu.ts:254-297` (`worktreeItems`, `createWorktreeItem`), `web/refMenu.ts:324-359` (`removeWorktreeItem`), `web/refMenu.ts:398-440` (placement) (line ranges after the Feature 060-03 implementation `3709547`)
> Test File: `tests/web/refMenu.test.ts`

Replaces S8 so that the Remove Worktree selection case matches the implemented and tested form dialog. TC-108 to TC-116 carry over S8's TC-033 to TC-041 in the same order (old ID in Notes). Only TC-116 is corrected: S8 TC-041 named `showConfirmationDialog`, while the item opens `showFormDialog`. Other expectations are unchanged. Fixture: `REPO = "/test/repo"`, `WORKTREE_PATH = "/home/user/project-feature"`, `createMockElement(["head"])` as `sourceElem`, `refName = "feature/x"` and `gitBranchHead = "main"` unless stated, `viewState.dialogDefaults.createWorktree.openTerminal = true` and `removeWorktree.deleteBranch = true`. Titles are read from the menu flattened through submenus. The removal ID and the record after confirmation are owned by S24 / S25; the order and More placement stay with S22 TC-107 and `03-context-menu-recent-actions-01.md` S13.

| Case ID | Input / Precondition                                                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                         | Notes                                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| TC-108  | Local branch, `worktreeInfo = null`                                                                          | Normal - standard                                                          | The menu contains `Create Worktree&#8230;`                                                                                              | Successor of TC-033 (REQ-2.3-TC1)                                                                      |
| TC-109  | Local branch, `worktreeInfo = { path: WORKTREE_PATH, isMainWorktree: false }`                                | Normal - standard                                                          | The menu contains `Open Terminal Here`, `Copy Worktree Path` and `Remove Worktree&#8230;`                                               | Successor of TC-034 (REQ-2.3-TC2)                                                                      |
| TC-110  | `refName = "main"`, `gitBranchHead = "main"`, `worktreeInfo = { path: WORKTREE_PATH, isMainWorktree: true }` | Normal - main wt                                                           | The menu contains `Open Terminal Here` and `Copy Worktree Path` but not `Remove Worktree&#8230;`                                        | Successor of TC-035 (REQ-2.3-TC4)                                                                      |
| TC-111  | Remote branch (`createMockElement(["remote"])`, `refName = "origin/feature"`, `worktreeInfo = null`)         | Normal - exclusion                                                         | The menu contains none of `Create Worktree&#8230;`, `Open Terminal Here`, `Copy Worktree Path`, `Remove Worktree&#8230;`                | Successor of TC-036 (REQ-2.3-TC3)                                                                      |
| TC-112  | `worktreeInfo = null`, select `Create Worktree&#8230;`                                                       | Normal - standard                                                          | `showFormDialog` is called once with 2 inputs: a text input named `Path: ` and a checkbox named `Open Terminal` whose `value` is `true` | Successor of TC-037 (REQ-3.2, REQ-3.3)                                                                 |
| TC-113  | Path default of the Create Worktree dialog                                                                   | Normal - standard                                                          | The text input's `default` is `/test/repo-feature-x`, the default `worktreePathTemplate` resolved beside `REPO` for branch `feature/x`  | Successor of TC-038 (REQ-3.3-TC3)                                                                      |
| TC-114  | Non-main worktree, select `Open Terminal Here`                                                               | Normal - standard                                                          | `sendMessage` is called once with `{ command: "openTerminal", repo: REPO, path: WORKTREE_PATH, name: "Worktree: feature/x" }`           | Successor of TC-039 (REQ-9.1)                                                                          |
| TC-115  | Non-main worktree, select `Copy Worktree Path`                                                               | Normal - standard                                                          | `sendMessage` is called once with `{ command: "copyToClipboard", type: "worktreePath", data: WORKTREE_PATH }`                           | Successor of TC-040 (REQ-9.2)                                                                          |
| TC-116  | Non-main worktree, select `Remove Worktree&#8230;`                                                           | Normal - standard                                                          | `showFormDialog` is called once and its message (first argument) contains `feature/x` and `WORKTREE_PATH`                               | Successor of TC-041 (REQ-4.1). Corrected: the dialog is `showFormDialog`, not `showConfirmationDialog` |

## S24: Remove Worktree dialog with branch deletion, recorded in Recent actions on confirmation

> Origin: Feature 060-03 (light-spec-plan)
> Added: 2026-09-29
> Status: active
> Supersedes: S12
> Signature: `buildRefContextMenuItems(repo: string, refName: string, sourceElem: HTMLElement, isRemoteCombined: boolean, gitBranchHead: string | null, remotes?: string[], worktreeInfo?: { path: string; isMainWorktree: boolean } | null): ContextMenuElement[]` (the `removeWorktreeItem` form and its confirm callback)
> Target Path: `web/refMenu.ts:324-359` (line range after the Feature 060-03 implementation `3709547`)
> Test File: `tests/web/refMenu.test.ts`

Replaces S12 because confirming the form with Remove now records `ref.removeWorktree` once before the unchanged removal request. TC-117 to TC-124 carry over S12's TC-050 to TC-057 in the same order (old ID in Notes). Only TC-121 and TC-122 change expectations. Fixture: `REPO = "/test/repo"`, `WORKTREE_PATH = "/home/user/project-feature"`, `createMockElement(["head"])`, `refName = "feature/x"`, `gitBranchHead = "main"`, `worktreeInfo = { path: WORKTREE_PATH, isMainWorktree: false }`; the item is selected from the built menu and the dialog is the mocked `showFormDialog`. "Confirm" means invoking the captured action callback (fourth argument) with the checkbox values. `recordRecentAction` and `sendMessage` are mocks, so each is counted separately and their order is compared with `mock.invocationCallOrder`. Not recording on open, cancel or close is owned by S25; the raw checkbox name by S16.

| Case ID | Input / Precondition                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                                                                                                                 | Notes                                                                                                                              |
| ------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| TC-117  | Select `Remove Worktree&#8230;`, non-main worktree             | Normal - standard                                                          | `showFormDialog` is called once with an input array of length 1 whose element has `type: "checkbox"`                                                                                                                                                                                                                                                                                                                            | Successor of TC-050 (REQ-4.1-TC1)                                                                                                  |
| TC-118  | `viewState.dialogDefaults.removeWorktree.deleteBranch = true`  | Normal - standard                                                          | The checkbox `value` is `true` (checked)                                                                                                                                                                                                                                                                                                                                                                                        | Successor of TC-051 (REQ-9.2-TC1)                                                                                                  |
| TC-119  | `viewState.dialogDefaults.removeWorktree.deleteBranch = false` | Normal - standard                                                          | The checkbox `value` is `false` (unchecked)                                                                                                                                                                                                                                                                                                                                                                                     | Successor of TC-052 (REQ-9.2-TC2)                                                                                                  |
| TC-120  | The checkbox `info` property                                   | Normal - standard                                                          | `info` is defined and explains safe deletion (`git branch -d`; contains `unmerged`)                                                                                                                                                                                                                                                                                                                                             | Successor of TC-053 (REQ-4.1-TC2)                                                                                                  |
| TC-121  | Confirm with `["checked"]` (Also delete branch ON, Remove)     | Normal - record once before send, branch deletion requested                | `recordRecentAction` is called exactly once, with `(REPO, "ref.removeWorktree")` (so `ref.deleteBranch` is not recorded). `sendMessage` is called once and its argument equals (`toStrictEqual`) `{ command: "removeWorktree", repo: REPO, worktreePath: WORKTREE_PATH, branchName: "feature/x", deleteBranch: true }`. `recordRecentAction.mock.invocationCallOrder[0]` is less than `sendMessage.mock.invocationCallOrder[0]` | Successor of TC-054 (REQ-4.1). Changed: record once before the request, whole payload. Main regression (RED before implementation) |
| TC-122  | Confirm with `["unchecked"]` (Also delete branch OFF, Remove)  | Normal - record once before send, worktree only                            | Same as TC-121 except the payload's `deleteBranch` is `false`: `recordRecentAction` exactly once with `(REPO, "ref.removeWorktree")`, `sendMessage` once with `toStrictEqual({ command: "removeWorktree", repo: REPO, worktreePath: WORKTREE_PATH, branchName: "feature/x", deleteBranch: false })`, record before send                                                                                                         | Successor of TC-055 (REQ-4.1). Changed: record once before the request, whole payload. Main regression (RED before implementation) |
| TC-123  | The dialog's action button name                                | Normal - standard                                                          | The third argument of `showFormDialog` is `"Remove"`                                                                                                                                                                                                                                                                                                                                                                            | Successor of TC-056 (REQ-4.1)                                                                                                      |
| TC-124  | The confirmation message                                       | Normal - standard                                                          | The message contains the branch name `feature/x` and `WORKTREE_PATH`                                                                                                                                                                                                                                                                                                                                                            | Successor of TC-057 (REQ-4.1, existing behavior kept)                                                                              |

### Failure source inventory (include-or-justify) - Feature 060-03 (S23 / S24)

| Failure source                                                          | Covering case or reason for exclusion                                                                               |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| No record, duplicate record, or record after the request on Remove      | TC-121, TC-122                                                                                                      |
| `ref.deleteBranch` recorded in addition when Also delete branch is ON   | TC-121                                                                                                              |
| Request payload changed (path, branch name, `deleteBranch`, extra keys) | TC-121, TC-122                                                                                                      |
| Dialog kind, inputs, defaults, button or message regressed              | TC-116 to TC-120, TC-123, TC-124                                                                                    |
| Removal offered for the main worktree or a remote branch                | TC-110, TC-111                                                                                                      |
| Record or request before confirmation                                   | excluded here (owned by `03-context-menu-recent-actions-01.md` S25 TC-126 to TC-128)                                |
| Git removal or branch deletion failure after a confirmed record         | excluded (the menu does not observe Git results; covered on screen by `web/contextMenu-test.md` S8 TC-059 / TC-060) |

**Failure category coverage (diversity floor)**:

- Validation: excluded (no rejection branch in these sections; unconfirmed paths are S25)
- Exception: excluded (no throw path)
- External: excluded (dialogs and messaging are mocked; Git outcomes are host-owned)
- Boundary: TC-119 (default OFF)
- Type: excluded (`RecentActionId` membership is checked by `pnpm run typecheck`)

### Feature 060-03 test mapping and execution evidence (S23 / S24)

Test file: `tests/web/refMenu.test.ts`. The existing S8 and S12 tests were renamed to their successor IDs, given `// Case:` comments and an `@see` to this shard; only TC-121 and TC-122 changed assertions (record exactly once with `(REPO, "ref.removeWorktree")`, which also rules out an extra `ref.deleteBranch`; `mock.invocationCallOrder` record before send; the whole request with `toStrictEqual`). The describe column comes first because the perspectives index counts rows whose first cell is a Case ID.

| describe                                             | Case ID | Test Method                                                                                                      | Result                                       |
| ---------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `buildRefContextMenuItems worktree menu items (S23)` | TC-108  | includes 'Create Worktree...' for local branch with worktreeInfo=null (TC-108)                                   | pass (2026-09-29)                            |
| `buildRefContextMenuItems worktree menu items (S23)` | TC-109  | includes 3 worktree items for local branch with worktreeInfo (non-main) (TC-109)                                 | pass (2026-09-29)                            |
| `buildRefContextMenuItems worktree menu items (S23)` | TC-110  | excludes Remove Worktree for main worktree (TC-110)                                                              | pass (2026-09-29)                            |
| `buildRefContextMenuItems worktree menu items (S23)` | TC-111  | does not include worktree items for remote branch (TC-111)                                                       | pass (2026-09-29)                            |
| `buildRefContextMenuItems worktree menu items (S23)` | TC-112  | showFormDialog is called with 2 fields when Create Worktree is selected (TC-112)                                 | pass (2026-09-29)                            |
| `buildRefContextMenuItems worktree menu items (S23)` | TC-113  | Path default value uses the normalized branch name (TC-113)                                                      | pass (2026-09-29)                            |
| `buildRefContextMenuItems worktree menu items (S23)` | TC-114  | Open Terminal Here sends openTerminal message (TC-114)                                                           | pass (2026-09-29)                            |
| `buildRefContextMenuItems worktree menu items (S23)` | TC-115  | Copy Worktree Path sends copyToClipboard message (TC-115)                                                        | pass (2026-09-29)                            |
| `buildRefContextMenuItems worktree menu items (S23)` | TC-116  | Remove Worktree shows form dialog with branch name and path (TC-116)                                             | pass (2026-09-29)                            |
| `Remove Worktree branch deletion dialog (S24)`       | TC-117  | showFormDialog is called with checkbox input for Remove Worktree (TC-117)                                        | pass (2026-09-29)                            |
| `Remove Worktree branch deletion dialog (S24)`       | TC-118  | checkbox default is checked when deleteBranch=true (TC-118)                                                      | pass (2026-09-29)                            |
| `Remove Worktree branch deletion dialog (S24)`       | TC-119  | checkbox default is unchecked when deleteBranch=false (TC-119)                                                   | pass (2026-09-29)                            |
| `Remove Worktree branch deletion dialog (S24)`       | TC-120  | checkbox has info property with safe delete explanation (TC-120)                                                 | pass (2026-09-29)                            |
| `Remove Worktree branch deletion dialog (S24)`       | TC-121  | records only Remove Worktree before sending the request with deleteBranch=true when checkbox is checked (TC-121) | pass (2026-09-29); RED before implementation |
| `Remove Worktree branch deletion dialog (S24)`       | TC-122  | records Remove Worktree before sending the request with deleteBranch=false when checkbox is unchecked (TC-122)   | pass (2026-09-29); RED before implementation |
| `Remove Worktree branch deletion dialog (S24)`       | TC-123  | action button name is 'Remove' (TC-123)                                                                          | pass (2026-09-29)                            |
| `Remove Worktree branch deletion dialog (S24)`       | TC-124  | dialog message contains branch name and worktree path (TC-124)                                                   | pass (2026-09-29)                            |

- RED before implementation (2026-09-29): the base commit `2a3cc5f` was extracted with `git archive` into a temporary directory outside the checkout, the updated test files and the `src/types.ts` union were copied in, and `web/refMenu.ts` stayed at the base. `pnpm exec vitest run tests/web/refMenu.test.ts -t 'TC-(121|122|125)'` gave `Tests 3 failed | 100 skipped (103)`; TC-121 and TC-122 failed with `AssertionError: expected "vi.fn()" to be called 1 times, but got 0 times` (no record on confirmation; TC-125 is in `03-context-menu-recent-actions-01.md` S25). No failure came from dependency resolution, DOM setup or types. The temporary copy was removed afterwards.
- GREEN after implementation (2026-09-29): the same command in the checkout gave `Tests 3 passed | 100 skipped (103)`.

## S27: Create Worktree suggested path from `worktreePathTemplate` and the main worktree

> Origin: Feature 062-01 (PR #114 follow-up)
> Added: 2026-10-27
> Status: active
> Supersedes: -
> Signature: `buildRefContextMenuItems(repo, refName, sourceElem, isRemoteCombined, gitBranchHead, remotes?, worktreeInfo?)` with `viewState.worktreePath` and `viewState.mainWorktreePaths`
> Target Path: `web/refMenu.ts` (`showCreateWorktreeDialog`), `web/worktreeSuggestion.ts` (`suggestedWorktreePath`)
> Test File: `tests/web/refMenu.test.ts`

The Create Worktree dialog fills its Path input from `viewState.worktreePath` (template, home directory and platform from the extension host), resolved by `src/worktreePath.ts` (`src/worktreePath-test.md` S2 / S3). `${repoPath}` is the main worktree recorded in `viewState.mainWorktreePaths` for the open repository, so a graph opened on a linked worktree does not nest new worktrees inside it. The default template case is S23 TC-113. Fixture: S23's `viewState.dialogDefaults`, `homeDir = "/home/dev"`, `platform: "posix"`, branch `createMockElement(["head"])`, `worktreeInfo = null`; select `Create Worktree&#8230;` and read the `default` of the first `showFormDialog` input.

| Case ID | Input / Precondition                                                                                                                                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                             | Notes                                       |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------- |
| TC-133  | `repo = "/test/repo"`, `refName = "feature/x"`, template `~/.worktrees/${repoName}/${branch}`                                                                                                | Normal - template from viewState                                           | Path default is `/home/dev/.worktrees/repo/feature-x`                       | -                                           |
| TC-134  | `repo` is the linked worktree `/test/repo/.worktrees/feat-slot-candidate-band`, `mainWorktreePaths` maps it to `/test/repo`, `refName = "main"`, template `${repoPath}/.worktrees/${branch}` | Normal - linked worktree uses the main worktree                            | Path default is `/test/repo/.worktrees/main`, not under the linked worktree | Deliberate difference from Better Worktrees |
| TC-135  | `repo = "/test/repo"`, `mainWorktreePaths` maps it to `""`, `refName = "feature/x"`, template `${repoPath}/.worktrees/${branch}`                                                             | Boundary - empty main worktree recorded                                    | Path default is `/test/repo/.worktrees/feature-x` (the open repository)     | -                                           |

### Failure-source inventory (include-or-justify) — S27

| Failure source                                            | Case or reason for exclusion                                                                                   |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Setting ignored (default template used)                   | TC-133                                                                                                         |
| `${repoPath}` taken from the linked worktree that is open | TC-134                                                                                                         |
| Empty main worktree recorded for the repository           | TC-135                                                                                                         |
| No main worktree recorded for the repository              | excluded (`web/main-test/05-state-response-02.md` S86 TC-787 records the open checkout itself as the fallback) |
| Template expansion rules                                  | excluded (`src/worktreePath-test.md` S1 to S3)                                                                 |
| Create Worktree Here (commit menu)                        | excluded (`web/commitMenu-test.md` S4 TC-024 / TC-027 and S6 follow the resolved default template)             |
| Exception / External / Type                               | excluded (dialogs are mocked; `viewState` shape is typed by `GitKeizuViewState`)                               |

### Test mapping — S27

`tests/web/refMenu.test.ts` describe `buildRefContextMenuItems worktree menu items (S23)`: TC-133 `uses worktreePathTemplate from viewState for the suggested path (TC-133)`, TC-134 `uses the main worktree as repoPath when the graph is a linked worktree (TC-134)`, TC-135 `falls back to the open repository when its recorded main worktree is empty (TC-135)`.
