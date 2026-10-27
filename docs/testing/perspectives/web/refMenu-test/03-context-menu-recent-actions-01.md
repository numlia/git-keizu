# Test Perspectives: web/refMenu.ts

> Source: `web/refMenu.ts`
> Generated: 2026-08-03T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: context-menu-recent-actions

## S13: Context menu reorganization (032)

> Origin: Feature 032 (context-menu-reorg) Task 7
> Added: 2026-04-30
> Status: active
> Supersedes: -

**Signature**: `buildRefContextMenuItems(repo: string, refName: string, sourceElem: HTMLElement, isRemoteCombined: boolean, gitBranchHead: string | null, remotes?: string[], worktreeInfo?: { path: string; isMainWorktree: boolean } | null): ContextMenuElement[]`
**Target path**: `web/refMenu.ts`

| Case ID | Input / Precondition                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                        | Notes                         |
| ------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| TC-058  | Tag branch (`sourceElem.classList.contains("tag") === true`)            | Normal - unchanged branch type                                             | The return value stays the 4 elements `Delete Tag...`, `Push Tag...`, `null`, `Copy Tag Name to Clipboard`                                                             | Tags unchanged                |
| TC-059  | Remote branch (`refName = "origin/feature"`)                            | Normal - submenu layout                                                    | The top 2 items are `Checkout Branch...` and `Merge into current branch...`, index 3 is the `More...` submenu, and its only child is `Delete Remote Branch...`         | Remote reorganized            |
| TC-060  | Local HEAD branch, `worktreeInfo = null`                                | Normal - current branch layout                                             | Ordered as `Pull`, `Push`, `null`, `More...` (1 item: Rename), `null`, `Copy Branch Name to Clipboard`                                                                 | Rename moved into the submenu |
| TC-061  | Local HEAD branch, `worktreeInfo = { path, isMainWorktree: true }`      | Normal - current branch with worktree                                      | After `Pull` and `Push` come the 4 worktree items, then `More...` (1 item: Rename), and Copy at the end; `Remove Worktree...` is not included                          | Main worktree kept            |
| TC-062  | Local non-HEAD branch, `worktreeInfo = null`                            | Normal - non-head no worktree                                              | Ordered as `Checkout Branch`, `Merge into current branch...`, `Rebase current branch on Branch...`, `null`, `Create Worktree...`, `null`, `More...`, `null`, `Copy...` | Basic non-HEAD layout         |
| TC-063  | Local non-HEAD branch, `worktreeInfo = { path, isMainWorktree: false }` | Normal - non-head with worktree                                            | The `More...` submenu follows the 4 worktree items, and its child titles are `Rename Branch...`, `Delete Branch...`, `Remove Worktree...` in that order                | Dynamic submenu               |
| TC-064  | Each of the remote / local-HEAD / local-non-HEAD branches               | Validation - divider rules                                                 | No array has consecutive `null`s, and none starts or ends with `null`                                                                                                  | Divider rules                 |

## S14: Recent actions identifiers and save triggers

> Origin: Feature 034 (context-menu-recent-actions) Task 4
> Added: 2026-05-02
> Status: active
> Supersedes: -
> Signature: `buildRefContextMenuItems(...)` / `checkoutBranchAction(repo: string, sourceElem: HTMLElement, refName: string, isRemoteCombined?: boolean, recordAction?: boolean): void`
> Target Path: `web/refMenu.ts`

| Case ID | Input / Precondition                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                 | Notes                                      |
| ------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| TC-065  | Build the remote menu and the HEAD + worktree menu                | Normal - target ids                                                        | `recentActionId` is set on the items for `Checkout Branch...`, `Merge...`, `Pull`, `Push`, `Open in New Window`, `Reveal in File Manager`, `Open Terminal Here` | List of supported actions                  |
| TC-066  | Tag menu (`Delete Tag...`, `Push Tag...`)                         | Validation - excluded branch type                                          | Tag-specific actions get no `recentActionId`                                                                                                                    | Tags excluded                              |
| TC-067  | Call `checkoutBranchAction(repo, elem, "feature/local")` directly | Boundary - non-menu path                                                   | `sendMessage(RequestCheckoutBranch)` is sent but `recordRecentAction(...)` is not called                                                                        | Protects shared paths such as double click |
| TC-068  | Accept the confirmation dialog of `Pull` in the HEAD menu         | Normal - record before send                                                | Inside the confirmation callback, `recordRecentAction(repo, "ref.pull")` is called before `sendMessage({ command: "pull" })`                                    | Save order for a safe action               |
| TC-069  | Choose `Open Terminal Here` in the worktree menu                  | Normal - worktree action persistence                                       | `recordRecentAction(repo, "ref.openTerminal")` is called before `sendMessage(RequestOpenTerminal)`, and the payload keeps path / name                           | Worktree actions are also Recent targets   |

## S15: Recent actions for Delete Branch / Delete Remote Branch

> Origin: Feature 037 (delete-branch-recent-actions) Task 4
> Added: 2026-05-09
> Status: active
> Supersedes: -
> Signature: `showDeleteBranchDialog(repo, refName, remotes, worktreeInfo)` / `buildRefContextMenuItems(...)`
> Target Path: `web/refMenu.ts`

| Case ID | Input / Precondition                                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                              | Notes                                                        |
| ------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| TC-070  | Build the menu for a local non-HEAD branch and take `Delete Branch...` from the submenu       | Normal - target id                                                         | The item's `recentActionId === "ref.deleteBranch"`                                                                                                           | Property set                                                 |
| TC-071  | Take `Delete Remote Branch...` from the submenu of the remote menu                            | Normal - target id                                                         | The item's `recentActionId === "ref.deleteRemoteBranch"`                                                                                                     | Property set                                                 |
| TC-072  | Confirm the form in the with-remotes branch of `showDeleteBranchDialog`                       | Normal - record before send                                                | Inside the confirm callback, `recordRecentAction(repo, "ref.deleteBranch")` is called before `sendMessage({ command: "deleteBranch", ... })`                 | Save order in the with-remotes branch                        |
| TC-073  | Confirm the form in the no-remotes branch of `showDeleteBranchDialog`                         | Normal - record before send                                                | Inside the confirm callback, `recordRecentAction(repo, "ref.deleteBranch")` is called before `sendMessage({ command: "deleteBranch", deleteOnRemotes: [] })` | Save order in the no-remotes branch                          |
| TC-074  | Accept the confirm in `deleteRemoteBranchItem.onClick`                                        | Normal - record before send                                                | `recordRecentAction(repo, "ref.deleteRemoteBranch")` is called before `sendMessage({ command: "deleteRemoteBranch", ... })`                                  | Save order for remote deletion                               |
| TC-075  | Click `deleteBranchItem`, then cancel the dialog (callback not invoked)                       | Boundary - cancel path                                                     | `recordRecentAction(...)` is not called / `sendMessage(...)` is not called either                                                                            | No record on cancel                                          |
| TC-076  | Cancel the `deleteRemoteBranchItem` confirm dialog (confirm callback not invoked)             | Boundary - cancel path                                                     | `recordRecentAction(...)` is not called / `sendMessage(...)` is not called either                                                                            | No record on cancel                                          |
| TC-077  | `Delete Tag...` / `Push Tag...` in the tag branch                                             | Validation - excluded branch type                                          | Tag-specific actions get no `recentActionId` property                                                                                                        | Consistent with TC-066                                       |
| TC-078  | `"ref.deleteBranch"` / `"ref.deleteRemoteBranch"` can be passed to the `RecentActionId` union | Type - union extension                                                     | TypeScript compiles (no type errors)                                                                                                                         | Guaranteed by a successful `pnpm run typecheck` (type level) |

## S25: Remove Worktree recent action ID and no effect before confirmation

> Origin: Feature 060-03 (light-spec-plan)
> Added: 2026-09-29
> Status: active
> Supersedes: -
> Signature: `buildRefContextMenuItems(repo: string, refName: string, sourceElem: HTMLElement, isRemoteCombined: boolean, gitBranchHead: string | null, remotes?: string[], worktreeInfo?: { path: string; isMainWorktree: boolean } | null): ContextMenuElement[]`
> Target Path: `web/refMenu.ts:324-359` (`removeWorktreeItem`), `web/refMenu.ts:418-422` (More submenu) (line ranges after the Feature 060-03 implementation `3709547`)
> Test File: `tests/web/refMenu.test.ts`

Adds the branch-side removal to the Recent actions targets. Fixture: `REPO = "/test/repo"`, `WORKTREE_PATH = "/home/user/project-feature"`, `createMockElement(["head"])`, `refName = "feature/x"`, `gitBranchHead = "main"` (non-HEAD), `worktreeInfo = { path: WORKTREE_PATH, isMainWorktree: false }`. The removal item is found by searching the real builder output (inside `More...`), not written by hand. `showFormDialog`, `recordRecentAction` and `sendMessage` are mocks; "cancel" and "close" are represented by never invoking the captured action callback, and are kept as separate scenarios. Real-DOM Cancel and `hideDialog()` on the branch form are exercised through the composed menu in `web/contextMenu-test.md` S6 (Cancel in TC-031 / TC-033, `hideDialog()` in TC-031). The record and payload after confirmation are owned by `02-worktree-actions-01.md` S24. S13 (TC-061 / TC-063) and S14 TC-065 keep their expectations: TC-065 checks the remote and HEAD targets and is not an exhaustive ID list, and the HEAD and main-worktree menus still have no removal item.

| Case ID | Input / Precondition                                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                         | Notes                                                                                                                |
| ------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| TC-125  | Build the menu and take `Remove Worktree&#8230;` from the `More...` submenu                             | Normal - target id                                                         | That item's `recentActionId` is `"ref.removeWorktree"` (`toBe`)                         | Main regression (RED before implementation). Same value as the detached item in `web/worktreeMenu-test.md` S2 TC-027 |
| TC-126  | Call the removal item's `onClick()` only                                                                | Boundary - dialog opened, not answered                                     | `showFormDialog` is called once. `recordRecentAction` 0 times and `sendMessage` 0 times | Opening the dialog does not record                                                                                   |
| TC-127  | Call `onClick()`, then cancel the form (the captured action callback is never invoked)                  | Validation - cancelled                                                     | `recordRecentAction` 0 times and `sendMessage` 0 times                                  | Unit representation of Cancel                                                                                        |
| TC-128  | Call `onClick()`, then close the form without an answer (the captured action callback is never invoked) | Validation - closed without confirming                                     | `recordRecentAction` 0 times and `sendMessage` 0 times                                  | Unit representation of closing, for example `hideDialog()`                                                           |

### Failure source inventory (include-or-justify) - Feature 060-03 (S25)

| Failure source                                                                      | Covering case or reason for exclusion                                         |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Branch removal item missing the ID, or using an ID different from the detached item | TC-125                                                                        |
| Record or request when the menu item is chosen                                      | TC-126                                                                        |
| Record or request on cancel or close                                                | TC-127, TC-128                                                                |
| Removal item appearing for HEAD or main-worktree branches                           | excluded here (kept by S13 TC-061 and `02-worktree-actions-01.md` S23 TC-110) |

**Failure category coverage (diversity floor)**:

- Validation: TC-127, TC-128
- Exception: excluded (no throw path)
- External: excluded (dialogs and messaging are mocked)
- Boundary: TC-126
- Type: excluded (`RecentActionId` membership is checked by `pnpm run typecheck`)

### Feature 060-03 test mapping and execution evidence (S25)

Test file: `tests/web/refMenu.test.ts`, new describe `Remove Worktree recent action` with an `@see` to this shard. TC-127 and TC-128 capture the action callback of the mocked form and never invoke it; the real-DOM Cancel and `hideDialog()` are exercised in `web/contextMenu-test.md` S6 TC-031 / TC-033. S14 TC-065 (`assigns recentActionId to supported remote and HEAD actions only (TC-065)`) is unchanged. The describe column comes first because the perspectives index counts rows whose first cell is a Case ID.

| describe                        | Case ID | Test Method                                                                   | Result                                       |
| ------------------------------- | ------- | ----------------------------------------------------------------------------- | -------------------------------------------- |
| `Remove Worktree recent action` | TC-125  | assigns ref.removeWorktree to Remove Worktree in the More submenu (TC-125)    | pass (2026-09-29); RED before implementation |
| `Remove Worktree recent action` | TC-126  | records and sends nothing when Remove Worktree only opens the form (TC-126)   | pass (2026-09-29)                            |
| `Remove Worktree recent action` | TC-127  | records and sends nothing when the form is cancelled (TC-127)                 | pass (2026-09-29)                            |
| `Remove Worktree recent action` | TC-128  | records and sends nothing when the form is closed without confirming (TC-128) | pass (2026-09-29)                            |

- RED before implementation (2026-09-29): in the temporary copy of the base commit `2a3cc5f` described in `02-worktree-actions-01.md` (updated tests and `src/types.ts`, `web/refMenu.ts` at the base), `pnpm exec vitest run tests/web/refMenu.test.ts -t 'TC-(121|122|125)'` failed TC-125 with `AssertionError: expected undefined to be 'ref.removeWorktree'` (no ID on the branch removal item). No failure came from dependency resolution, DOM setup or types.
- GREEN after implementation (2026-09-29): the same command in the checkout gave `Tests 3 passed | 100 skipped (103)`.

## S26: Highlight path submenu (2 branch modes), tag exclusion and optional callback

> Origin: Feature 061-01 (light-spec-plan)
> Added: 2026-10-03
> Status: active
> Supersedes: -
> Signature: `buildRefContextMenuItems(repo: string, refName: string, sourceElem: HTMLElement, isRemoteCombined: boolean, gitBranchHead: string | null, remotes?: string[], worktreeInfo?: { path: string; isMainWorktree: boolean } | null, onHighlight?: (mode: BranchPathMode) => void): ContextMenuElement[]`
> Target Path: `web/refMenu.ts:66-77` (`BRANCH_PATH_MODES` / `buildHighlightPathSubmenu`), `web/refMenu.ts:158-473` (`buildRefContextMenuItems`; signature 158-167, tag check 170, submenu insertion 463-465)
> Test File: `tests/web/refMenu.test.ts`

Perspectives for the branch submenu in implementation plan §3.6. The `Highlight path` submenu (`All ancestors` → `First-parent ancestors`) is added only to the head / remote branches that receive the trailing optional callback `onHighlight`, and not to the tag branch. Resolving the target hash (in the row, in the overflow list, or for a combined remote) is the responsibility of `web/main-test/12-path-highlight-01.md` S68 and is not covered here. S13 / S14 / S15 / S25 stay active as the contract when the callback is omitted. Fixture: `REPO = "/test/repo"`, and `createMockElement([...])` creates the `head` / `remote` / `tag` `sourceElem`.

| Case ID | Input / Precondition                                                                                                                                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type)          | Expected Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Notes                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| TC-129  | `head` `sourceElem`, `onHighlight = vi.fn()`. Two variants: local HEAD (`gitBranchHead === refName`, `worktreeInfo = null`) and local non-HEAD (`worktreeInfo = { path, isMainWorktree: false }`) | Normal - 2 options for head                                                         | In both variants there is exactly 1 submenu with `title === "Highlight path"`, whose `submenu` has 2 items with `title` `All ancestors` / `First-parent ancestors` in that order and no `recentActionId`. The submenu comes before the trailing `Copy Branch Name to Clipboard`, the relative order of the existing items from S13 TC-060 / TC-063 is unchanged, there are no consecutive `null`s, and the list neither starts nor ends with `null`. Each `onClick` calls `onHighlight` once with `PathHighlightMode.AllAncestors` / `PathHighlightMode.FirstParent`, and the call counts of `sendMessage` and `recordRecentAction` are 0 | Does not include the commit modes                               |
| TC-130  | `remote` `sourceElem`, `refName = "origin/feature"`, `onHighlight = vi.fn()`. Two variants: `isRemoteCombined` `false` and `true`                                                                 | Normal - 2 options for remote                                                       | In both variants there is exactly 1 `Highlight path` submenu with the 2 items `All ancestors` / `First-parent ancestors`, the relative order of the existing items from S13 TC-059 is unchanged, and it comes before the trailing `Copy Branch Name to Clipboard`. Each `onClick` calls `onHighlight` once with the matching mode, and the call count of `sendMessage` is 0                                                                                                                                                                                                                                                               | Same options for the remote part of a combined remote           |
| TC-131  | `tag` `sourceElem`, `onHighlight = vi.fn()`                                                                                                                                                       | Validation - tag excluded                                                           | The return value is the same 4 elements as S13 TC-058 (`Delete Tag...`, `Push Tag...`, `null`, `Copy Tag Name to Clipboard`), there are 0 `Highlight path` items, and the call count of `onHighlight` is 0                                                                                                                                                                                                                                                                                                                                                                                                                                | No new action for tags                                          |
| TC-132  | Build without `onHighlight` in 3 variants: remote / local HEAD / local non-HEAD (with worktree)                                                                                                   | Boundary - existing order and recent actions unchanged when the callback is omitted | In all 3 variants, the `title` list and the positions of `null` match the arrays of S13 TC-059 / TC-060 / TC-063 with `toEqual`, and there are 0 `Highlight path` items. The set of items with `recentActionId` is the same as in S14 TC-065 / S25 TC-125                                                                                                                                                                                                                                                                                                                                                                                 | Keeps the contract for existing callers and existing unit tests |

### Failure-source inventory (include-or-justify) — added in Feature 061-01 (S26)

| Failure source                                                                       | Covering case or reason for exclusion                                                   |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Missing or extra mode options, wrong order, or commit modes mixed in                 | TC-129, TC-130                                                                          |
| Callback receiving the wrong mode, sending to the host, or recording a recent action | TC-129, TC-130                                                                          |
| Items added for tags or detached                                                     | TC-131 (the detached worktree menu is the responsibility of `web/worktreeMenu-test.md`) |
| Items or `recentActionId` changing when the callback is omitted                      | TC-132                                                                                  |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)                        | Callback omitted: TC-132. Others: excluded(no numeric thresholds)                       |
| Input validation × violation patterns                                                | TC-131 (branch exclusion)                                                               |
| External dependencies × failure modes                                                | excluded(dialogs and sending are mocked, and no failure paths are added)                |
| Exception / error paths                                                              | excluded(no throw path)                                                                 |
| Invalid types / formats                                                              | excluded(the `BranchPathMode` constraint is guaranteed by TypeScript type checking)     |

**Failure-category coverage (diversity floor)**:

- Validation: TC-131
- Exception: excluded(see the table above)
- External: excluded(see the table above)
- Boundary: TC-132
- Type: excluded(see the table above)
- Normal: TC-129, TC-130
