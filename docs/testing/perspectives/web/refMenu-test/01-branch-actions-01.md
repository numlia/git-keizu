# Test Perspectives: web/refMenu.ts

> Source: `web/refMenu.ts`
> Generated: 2026-08-03T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: branch-actions

## S1: checkoutBranchAction() branch name suggestion logic

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 2.2
> Added: 2026-02-25
> Status: superseded
> Supersedes: -
> Superseded By: S20

**Signature**: `checkoutBranchAction(repo: string, sourceElem: HTMLElement, refName: string, isRemoteCombined?: boolean): void`
**Target path**: `web/refMenu.ts`

| Case ID | Input / Precondition             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result   | Notes                                                      |
| ------- | -------------------------------- | -------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------- |
| TC-001  | refName = "origin/feature/ebook" | Normal - 2 levels                                                          | "feature/ebook"   | Takes everything after the first slash                     |
| TC-002  | refName = "origin/main"          | Normal - 1 level                                                           | "main"            | Removes only the remote name                               |
| TC-003  | refName = "origin/a/b/c"         | Normal - 3 levels                                                          | "a/b/c"           | Handles deep nesting                                       |
| TC-004  | refName = "upstream/feature/x"   | Normal - another remote                                                    | "feature/x"       | A remote name other than origin                            |
| TC-005  | refName = "origin"               | Boundary - no slash                                                        | "" (empty string) | Does not normally happen per the spec, handled defensively |
| TC-006  | refName = "o/x"                  | Boundary - min (shortest path)                                             | "x"               | 1-character remote name + 1-character branch name          |

## S2: buildRefContextMenuItems() Pull/Push menu items

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 3.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Signature**: `buildRefContextMenuItems(repo: string, refName: string, sourceElem: HTMLElement, isRemote: boolean, gitBranchHead: string | null): (ContextMenuElement | null)[]`
**Target path**: `web/refMenu.ts`

| Case ID | Input / Precondition                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                           | Notes                             |
| ------- | -------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------- |
| TC-007  | gitBranchHead === refName (current branch)         | Normal - standard                                                          | The menu contains Pull/Push items         | Placed at the top of the menu     |
| TC-008  | Titles of the Pull/Push items                      | Normal - standard                                                          | "Pull" and "Push"                         | Checks the display text           |
| TC-009  | gitBranchHead !== refName (not the current branch) | Normal - exclusion                                                         | The menu does not contain Pull/Push items | Shown only for the current branch |
| TC-010  | refType === "remote" (remote branch)               | Normal - exclusion                                                         | The menu does not contain Pull/Push items | Only for the local current branch |

## S3: parseRemoteRef() utility that splits off the remote name

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**Signature**: `parseRemoteRef(refName: string): { remoteName: string; branchName: string }`
**Target path**: `web/refMenu.ts`

| Case ID | Input / Precondition          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                 | Notes                                                    |
| ------- | ----------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------- |
| TC-011  | refName = "origin/feature/x"  | Normal - 2 levels                                                          | { remoteName: "origin", branchName: "feature/x" }               | Splits at the first slash                                |
| TC-012  | refName = "origin/main"       | Normal - 1 level                                                           | { remoteName: "origin", branchName: "main" }                    | Removes only the remote name                             |
| TC-013  | refName = "upstream/a/b/c"    | Normal - deep nesting                                                      | { remoteName: "upstream", branchName: "a/b/c" }                 | The second and later slashes are part of the branch name |
| TC-014  | refName = "o/x"               | Boundary - min (shortest path)                                             | { remoteName: "o", branchName: "x" }                            | 1-character remote + 1-character branch                  |
| TC-015  | refName = "origin" (no slash) | Boundary - no separator                                                    | { remoteName: "origin", branchName: "" } or a suitable fallback | Does not normally happen per the spec                    |

## S4: buildRefContextMenuItems() remote branch menu items

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**Target path**: `web/refMenu.ts`

| Case ID | Input / Precondition             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                         | Notes                                   |
| ------- | -------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------- |
| TC-016  | sourceElem is a remote branch    | Normal - standard                                                          | The menu contains a "Delete Remote Branch..." item      | -                                       |
| TC-017  | sourceElem is a remote branch    | Normal - standard                                                          | The menu contains a "Merge into current branch..." item | Reuses the existing mergeBranch command |
| TC-018  | sourceElem is a local branch     | Normal - exclusion                                                         | The menu does not contain "Delete Remote Branch..."     | Not needed for local branches           |
| TC-019  | Delete Remote Branch is selected | Normal - standard                                                          | A confirmation dialog is shown                          | showConfirmationDialog                  |
| TC-020  | Merge (remote) is selected       | Normal - standard                                                          | A checkbox dialog (fast-forward option) is shown        | showCheckboxDialog                      |

## S5: buildRefContextMenuItems() Rebase menu item

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**Target path**: `web/refMenu.ts`

| Case ID | Input / Precondition                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                               | Notes                     |
| ------- | --------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------- |
| TC-021  | sourceElem is a local branch (not HEAD) | Normal - standard                                                          | The menu contains a "Rebase current branch on Branch..." item | gitBranchHead !== refName |
| TC-022  | sourceElem is the HEAD branch           | Normal - exclusion                                                         | The menu does not contain "Rebase..."                         | Cannot rebase onto itself |
| TC-023  | sourceElem is a remote branch           | Normal - exclusion                                                         | The menu does not contain "Rebase..."                         | Local branches only       |
| TC-024  | Rebase is selected                      | Normal - standard                                                          | A confirmation dialog is shown                                | showConfirmationDialog    |

## S6: Delete Branch dialog extension (delete on the remote at the same time)

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**Target path**: `web/refMenu.ts`

| Case ID | Input / Precondition               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                   | Notes                      |
| ------- | ---------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------- |
| TC-025  | remotes = ["origin"] (has remotes) | Normal - standard                                                          | showFormDialog: 2 checkboxes, "Force Delete" + "Delete this branch on the remote" | Switches to showFormDialog |
| TC-026  | remotes = [] (no remotes)          | Normal - no remote                                                         | showCheckboxDialog: "Force Delete" only (keeps the existing behavior)             | Backward compatible        |
| TC-027  | Remote delete checkbox ON          | Normal - standard                                                          | sendMessage contains deleteOnRemotes: remotes                                     | -                          |
| TC-028  | Remote delete checkbox OFF         | Normal - standard                                                          | sendMessage contains deleteOnRemotes: []                                          | Default behavior           |

## S7: Merge dialog extension (3-checkbox form)

> Origin: Feature 014 (dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-09
> Status: active
> Supersedes: -

**Target path**: `web/refMenu.ts:30-55`

| Case ID | Input / Precondition                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                         | Notes                           |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------- |
| TC-029  | buildMergeBranchMenuItem is selected                         | Normal - standard                                                          | showFormDialog is called with 3 checkboxes (No FF / Squash / No Commit) | Changed from showCheckboxDialog |
| TC-030  | Default values of the 3 checkboxes                           | Normal - standard                                                          | Reflect each field value of viewState.dialogDefaults.merge              | Same structure as commitMenu    |
| TC-031  | The callback gets 3 values and the confirm button is pressed | Normal - standard                                                          | RequestMergeBranch contains createNewCommit, squash, noCommit           | Checks sendMessage              |
| TC-032  | Structure of the Squash / No Commit checkboxes               | Normal - standard                                                          | The info property (tooltip text) is set                                 | Same text as commitMenu         |

## S17: Push operationId generation and the remote selection dialog

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-03
> Status: active
> Supersedes: -
> Signature: `onClick` of the Push item in `buildRefContextMenuItems()` / `showPushRemoteDialog(repo: string, operationId: string, remotes: string[], defaultRemote: string): void`
> Target Path: `web/refMenu.ts` (the Push menu item and `showPushRemoteDialog()`; update to a line range after implementation)
> Test File: `tests/web/refMenu.test.ts`

Perspectives for the change that generates `operationId` once with `crypto.randomUUID()` when the Push confirmation is accepted and sends the first Request with `selectedRemote: null`, and for `showPushRemoteDialog()`, which presents the `selectRemote` phase from the host with the existing `showSelectDialog()`. Only when a choice is confirmed does it send a second message with the same `operationId` and the selected value; on cancel, the callback does not fire per the existing dialog contract, so nothing is sent or recorded. Phase handling and delegation of the Response belong to `web/messageHandler-test.md` S12, and host-side revalidation belongs to `src/gitGraphView-test/01-message-routing-03.md` S28.

| Case ID | Input / Precondition                                                                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                            | Notes                             |
| ------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| TC-081  | Select `Push` in the HEAD menu and accept the confirmation dialog (`crypto.randomUUID()` stubbed to return `"op-1"`)              | Normal - first Request                                                     | `crypto.randomUUID()` is called once, and `sendMessage` is called once with `{ command: "push", repo, operationId: "op-1", selectedRemote: null }`                                                         | Assigns a unique ID               |
| TC-082  | Same conditions                                                                                                                   | Normal - keeping the record order                                          | `recordRecentAction(repo, "ref.push")` is called once, before `sendMessage`                                                                                                                                | Keeps the existing contract       |
| TC-083  | Cancel the `Push` confirmation dialog (callback not called)                                                                       | Boundary - cancel path                                                     | The call counts of `sendMessage` / `crypto.randomUUID` / `recordRecentAction` are all 0                                                                                                                    | Does not send                     |
| TC-084  | Call `showPushRemoteDialog(repo, "op-1", ["origin", "upstream"], "upstream")`                                                     | Normal - selection dialog structure                                        | `showSelectDialog` is called once with options `[{ name: "origin", value: "origin" }, { name: "upstream", value: "upstream" }]`, defaultValue `"upstream"` and action label `t("push.selectRemoteAction")` | Matches the host Response exactly |
| TC-085  | `"upstream"` is passed to the callback of the same dialog                                                                         | Normal - second Request                                                    | `sendMessage` is called once with `{ command: "push", repo, operationId: "op-1", selectedRemote: "upstream" }`                                                                                             | Carries over operationId          |
| TC-086  | Cancel the same dialog (callback not called)                                                                                      | Boundary - cancel path                                                     | The `sendMessage` call count is 0 (no second message is sent)                                                                                                                                              | No Push on cancel                 |
| TC-087  | Call `showPushRemoteDialog(repo, "op-1", ["origin"], "origin")` without firing the callback                                       | Boundary - 1 option                                                        | Showing the default alone does not call `sendMessage` (call count 0)                                                                                                                                       | Does not auto-confirm             |
| TC-088  | Call `showPushRemoteDialog(repo, "op-1", ...)`, then `showPushRemoteDialog(repo, "op-2", ...)`, and confirm the latter's callback | Normal - carrying over the correlation ID                                  | The `operationId` of `sendMessage` is `"op-2"` (does not reuse `"op-1"`)                                                                                                                                   | Consecutive operations            |
| TC-089  | Confirm the selection dialog's callback                                                                                           | Validation - preventing double recording                                   | The `recordRecentAction` call count is 0 (recorded only once, when the confirmation is accepted)                                                                                                           | Recorded only the first time      |

### Failure-source inventory (include-or-justify) - added by Feature 047 (S17)

| Failure source                                                         | Covering cases or reason for exclusion                                                                                                                                                                                  |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sending on cancel (confirmation dialog / selection dialog)             | TC-083, TC-086                                                                                                                                                                                                          |
| Mistaking the default display for a confirmed choice and sending early | TC-087                                                                                                                                                                                                                  |
| Missing, regenerated or mixed-up operationId                           | TC-081, TC-085, TC-088                                                                                                                                                                                                  |
| Double recording of the recent action / reversed record order          | TC-082, TC-089                                                                                                                                                                                                          |
| Mixed-up options / default (mismatch with the host Response)           | TC-084                                                                                                                                                                                                                  |
| Negative side of each branch (sent only on confirm)                    | TC-081, TC-085                                                                                                                                                                                                          |
| Boundary value (1 option)                                              | TC-087                                                                                                                                                                                                                  |
| Boundary value (0 options)                                             | excluded (for an empty list the host returns the `noRemotes` phase, so the dialog is not called. The display belongs to `web/messageHandler-test.md` S12 TC-041)                                                        |
| Boundary values (0 / minimum / maximum / +/-1 / NULL / empty string)   | excluded (the arguments are only strings and arrays, with no numeric boundaries. That the host does not pass an empty remote name to Push is guaranteed by `src/gitGraphView-test/01-message-routing-03.md` S28 TC-119) |
| External dependency failure                                            | excluded (only function calls inside the webview, no external dependencies. Displaying the Git result belongs to `web/messageHandler-test.md` S12)                                                                      |
| Thrown exceptions                                                      | excluded (menu callbacks have no throw path, and the dialog base belongs to the `web/dialogs-test.md` owner)                                                                                                            |
| Invalid type / format                                                  | excluded (the required fields of `RequestPush` are guaranteed by type checks in `src/types-test.md` S3 TC-015 to TC-018)                                                                                                |
| Selecting an unregistered or unsafe remote                             | excluded (the options come from the host Response, and revalidation of membership and format belongs to S28 TC-116 / TC-119)                                                                                            |

**Failure-category coverage (diversity floor)**:

- Validation: TC-089
- Exception: excluded (no throw path exists)
- External: excluded (no external dependencies)
- Boundary: TC-083, TC-086, TC-087
- Type: excluded (the type contract belongs to `src/types-test.md` S3)

**Failure/normal ratio (smoke detector)**: 5 normal cases (TC-081, TC-082, TC-084, TC-085, TC-088), 4 failure cases (TC-083, TC-086, TC-087, TC-089). Because the counts are close, the inventory was re-derived. The failure sources of this section are limited to the cancel path, auto-confirm, double recording and mixed-up IDs, and the Git execution and type failure sources are all assigned to other owners (S28 / S12 / `src/types-test.md` S3).

## S18: getPendingPushRepo() carrying over the repository in the two-step Push

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-04
> Status: superseded
> Supersedes: -
> Superseded By: S19
> Signature: `getPendingPushRepo(): string`
> Target Path: `web/refMenu.ts` (the module-level `pendingPushRepo` and `getPendingPushRepo()`)
> Test File: `tests/web/refMenu.test.ts`

Because `ResponsePush` has no repository path, the design keeps the repository of the first Request in the module-level `pendingPushRepo` and reads it with `getPendingPushRepo()` (an implementation deviation in Task 5). `web/messageHandler-test.md` S12 TC-040 replaces this function with a mock, so the wiring "Push confirmation accepted → repository kept → read back" itself is not checked by any existing case. If it breaks, the second Push Request goes to a different repository, so this pins the wiring of the real module, not a mock. The payload and operationId of the first Request belong to S17, and delegation of the Request after selection belongs to `web/messageHandler-test.md` S12.

| Case ID | Input / Precondition                                                                                                                                                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                      | Notes                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| TC-090  | Select `Push` in the HEAD menu with repo = `/test/other-repo` (a value different from `/test/repo` used by other cases), accept the confirmation dialog, then call `getPendingPushRepo()` of the real module | Normal - carrying over the repository                                      | Returns `/test/other-repo`, which matches the `repo` field of the first Request sent by the same confirmation (module state left by other cases cannot satisfy this) | Checks the wiring of the real module, not a mock |

### Failure-source inventory (include-or-justify) - Feature 047 addendum (S18)

| Failure source                                                    | Covering cases or reason for exclusion                                                                                                                                                              |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mixing up the repository between the two Push steps               | TC-090                                                                                                                                                                                              |
| The repository is updated on cancel                               | excluded (it is stored in the same branch inside the confirm callback, and S17 TC-083 guarantees with call count 0 that the callback does not fire on the cancel path)                              |
| An old repository remains after consecutive Pushes                | excluded (a single branch that overwrites unconditionally on every confirm, the same path as TC-090. Consecutive operations on the operationId side are guaranteed by S17 TC-088)                   |
| Boundary value (initial value is an empty string before any Push) | excluded (it depends on the run order of other cases that share module state, so the observation cannot be made stable. A Request with an empty repository is rejected by the host-side repo guard) |
| Boundary values (0 / minimum / maximum / +/-1 / NULL)             | excluded (the value is only a repository path string, with no numeric boundaries)                                                                                                                   |
| External dependency failure                                       | excluded (only reads module state inside the webview, no external dependencies)                                                                                                                     |
| Thrown exceptions                                                 | excluded (the getter has no throw path)                                                                                                                                                             |
| Invalid type / format                                             | excluded (the return value is `string`, with no type branches)                                                                                                                                      |
| Push to an unregistered or unsafe remote                          | excluded (revalidation of membership and format belongs to `src/gitGraphView-test/01-message-routing-03.md` S28 TC-116 / TC-119)                                                                    |

**Failure-category coverage (diversity floor)**:

- Validation: excluded (the getter has no validation branch. Detecting a mix-up is part of the value-equality check in TC-090)
- Exception: excluded (no throw path exists)
- External: excluded (no external dependencies)
- Boundary: excluded (no numeric boundaries, and observing the initial value is excluded because it depends on run order)
- Type: excluded (the type contract belongs to `src/types-test.md` S3)

**Failure/normal ratio (smoke detector)**: 1 normal case (TC-090), 0 failure cases. This section is an addendum covering only the one piece of wiring that existing cases had replaced with a mock, and the failure sources such as cancel, consecutive operations and membership revalidation are all assigned to S17 / S28.

## S19: showPushRemoteDialog() passes its repository argument to the second Request

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-04
> Status: active
> Supersedes: S18
> Signature: `showPushRemoteDialog(repo: string, operationId: string, remotes: string[], defaultRemote: string): void`
> Target Path: `web/refMenu.ts` (the select dialog callback of `showPushRemoteDialog()`)
> Test File: `tests/web/refMenu.test.ts`

Replacement perspectives after `repo` became a required field of `ResponsePush` and the module-level `pendingPushRepo` and `getPendingPushRepo()` were removed. S18 targeted the wiring of the removed `getPendingPushRepo()`, so this section supersedes it. The repository now only travels as an argument from the host Response through `web/messageHandler.ts`, so this pins with the real module that no module state is involved, that is, each callback sends its own argument even when dialogs for different repositories are opened one after another. The callback payload of a single dialog belongs to S17 TC-085, and that the caller passes `msg.repo` belongs to `web/messageHandler-test.md` S14 TC-050.

| Case ID | Input / Precondition                                                                                                                                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                       | Notes                                       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| TC-091  | Call `showPushRemoteDialog("/test/repo", "op-1", ["origin"], "origin")`, then right after it `showPushRemoteDialog("/test/other-repo", "op-2", ["origin"], "origin")`, and confirm both callbacks | Normal - carrying over the repository                                      | The `repo` of the 2 `sendMessage` calls are `"/test/repo"` and `"/test/other-repo"` respectively, and the dialog opened later does not overwrite the earlier repository (`operationId` also keeps the matching value) | Directly checks the removal of module state |

### Failure-source inventory (include-or-justify) - Feature 047 P3 fix (S19)

| Failure source                                        | Covering cases or reason for exclusion                                                                                                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mixing up the repository between consecutive dialogs  | TC-091                                                                                                                                                                       |
| The caller passes another repository                  | excluded (`web/messageHandler-test.md` S14 TC-050 guarantees passing `msg.repo`)                                                                                             |
| Wrong callback payload in a single dialog             | excluded (S17 TC-085 guarantees `repo` / `operationId` / `selectedRemote`)                                                                                                   |
| Sending on cancel                                     | excluded (S17 TC-086 and TC-087 guarantee call count 0)                                                                                                                      |
| Boundary values (0 / minimum / maximum / +/-1 / NULL) | excluded (the arguments are only strings and arrays, with no numeric boundaries)                                                                                             |
| Boundary value (empty repository string)              | excluded (`repo` is a required field from the host Response, and empty values are prevented by the required type in `src/types-test.md` S4 TC-041 and the host's repo guard) |
| External dependency failure / thrown exceptions       | excluded (only function calls inside the webview, with no external dependencies or throw paths)                                                                              |
| Invalid type / format                                 | excluded (the type contract belongs to `src/types-test.md` S4)                                                                                                               |

**Failure-category coverage (diversity floor)**:

- Validation: excluded (the dialog side has no validation branch, and detecting a mix-up is part of the value-equality check in TC-091)
- Exception: excluded (no throw path exists)
- External: excluded (no external dependencies)
- Boundary: excluded (no numeric boundaries; cancel and 1 option are guaranteed by S17 TC-086 / TC-087)
- Type: excluded (the type contract belongs to `src/types-test.md` S4)

**Failure/normal ratio (smoke detector)**: 1 normal case (TC-091), 0 failure cases. This section is an addendum covering only the one piece of wiring that replaces the removed module state, and the failure sources for cancel, auto-confirm and types are all assigned to S17 and `src/types-test.md` S4.

## S20: checkoutBranchAction() remote target, initial value and prompt

> Origin: Feature 051 (remote-checkout-pull) (light-spec-plan)
> Added: 2026-08-06
> Status: active
> Supersedes: S1
> Signature: `checkoutBranchAction(repo: string, sourceElem: HTMLElement, refName: string, isRemoteCombined?: boolean, recordAction?: boolean): void`
> Target Path: `web/refMenu.ts` (`checkoutBranchAction()`)
> Test File: `tests/web/refMenu.test.ts`

Keeps the S1 contract of suggesting the branch part of a remote ref as the initial value, and the callback sends the parsed remote name / branch name as a structured target. It uses a new prompt explaining that if a branch with the same name exists, the selected remote branch is pulled after checkout. Host routing and Git execution belong to each backend owner.

| Case ID | Input / Precondition                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                | Notes                                                |
| ------- | ------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| TC-092  | remote ref `origin/feature/ebook`                       | Normal - initial value with 2 levels                                       | `showRefInputDialog` is called once with default value `"feature/ebook"`                                                                                                                                                                                                                                       | Carried over from S1/TC-001                          |
| TC-093  | remote ref `origin/main`                                | Normal - initial value with 1 level                                        | `showRefInputDialog` is called once with default value `"main"`                                                                                                                                                                                                                                                | Carried over from S1/TC-002                          |
| TC-094  | remote ref `origin/a/b/c`                               | Normal - initial value with 3 levels                                       | `showRefInputDialog` is called once with default value `"a/b/c"`                                                                                                                                                                                                                                               | Carried over from S1/TC-003                          |
| TC-095  | remote ref `upstream/feature/x`                         | Normal - initial value for another remote                                  | `showRefInputDialog` is called once with default value `"feature/x"`                                                                                                                                                                                                                                           | Carried over from S1/TC-004                          |
| TC-096  | remote ref `origin` (no slash)                          | Boundary - no slash                                                        | `showRefInputDialog` is called once with the fallback default value `"origin"`                                                                                                                                                                                                                                 | An empty parse result does not make input impossible |
| TC-097  | remote ref `o/x`                                        | Boundary - minimum ref parts                                               | `showRefInputDialog` is called once with default value `"x"`                                                                                                                                                                                                                                                   | Carried over from S1/TC-006                          |
| TC-098  | Pass `"main"` to the dialog callback for `origin/main`  | Normal - structured remote payload                                         | `sendMessage` is called once with `{ command: "checkoutBranch", repo, branchName: "main", remoteBranch: { remoteName: "origin", branchName: "main" } }`                                                                                                                                                        | object payload                                       |
| TC-099  | Check out local HEAD `main` directly                    | Normal - local payload                                                     | `sendMessage` is called once with `{ command: "checkoutBranch", repo, branchName: "main", remoteBranch: null }`, and the dialog is not called                                                                                                                                                                  | Keeps the local path                                 |
| TC-100  | Open the dialog for remote ref `origin/main`            | Normal - checkout + pull prompt                                            | The prompt of `showRefInputDialog` equals the return value of `t("Enter the local branch name for checking out {0}. If a branch with the same name already exists, the selected remote branch will be pulled after checkout:", "<b><i>origin/main</i></b>")`. The old "create a new branch" prompt is not used | Explains the pull when the same name exists          |
| TC-101  | Cancel the remote checkout dialog (callback not called) | Boundary - cancel path                                                     | The call counts of `sendMessage` and `recordRecentAction` are 0                                                                                                                                                                                                                                                | Does not send unless confirmed                       |

### Failure-source inventory (include-or-justify) - added by Feature 051 (S20)

| Failure source                                          | Covering cases or reason for exclusion                                                                                        |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Missing initial branch name / truncated levels          | TC-092 to TC-097                                                                                                              |
| Remote target turned into a string / fields mixed up    | TC-098                                                                                                                        |
| A remote object mixed into a local checkout             | TC-099                                                                                                                        |
| The old prompt, which reads as new-branch only, remains | TC-100                                                                                                                        |
| Wrong remote ref in the prompt placeholder              | TC-100                                                                                                                        |
| Sending or recording a recent action on cancel          | TC-101                                                                                                                        |
| Host routing / Git execution branches                   | excluded (owned by `src/gitGraphView-test/01-message-routing-03.md` S32 / `src/dataSource-test/02-branch-worktree-02.md` S46) |
| Response refresh / error display                        | excluded (owned by `web/messageHandler-test/03-git-operation-responses-01.md` S15)                                            |
| Boundary values (0 / maximum / +/-1 / NULL / empty)     | excluded (no numeric boundaries. The shortest ref is checked in TC-097, no slash in TC-096 and cancel in TC-101)              |
| Invalid type / missing payload field                    | excluded (owned by `src/types-test.md` S6)                                                                                    |
| External dependency failure / thrown exceptions         | excluded (only dialog / message calls inside the webview, with no external dependencies or throw paths)                       |

**Failure-category coverage (diversity floor)**:

- Validation: excluded (the callback has no runtime validation branch, and payload values are checked in TC-098 / TC-099)
- Exception: excluded (no throw path)
- External: excluded (no external dependencies)
- Boundary: TC-096, TC-097, TC-101
- Type: excluded (owned by `src/types-test.md` S6)

**Failure/normal ratio (smoke detector)**: 7 normal cases (TC-092 to TC-095, TC-098 to TC-100), 3 failure cases (TC-096, TC-097, TC-101). UI input boundaries are limited to the ref structure and cancel, and runtime validation and Git failure are mapped as outside this owner.

## S21: showDeleteBranchDialog() keeps the existing dialog contract after being exported

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `export function showDeleteBranchDialog(repo: string, refName: string, remotes: string[], worktreeInfo?: { path: string; isMainWorktree: boolean } | null): void`
> Target Path: `web/refMenu.ts` (`showDeleteBranchDialog()`; update to a line range after implementation)
> Test File: `tests/web/refMenu.test.ts`

The change only adds export to `showDeleteBranchDialog()` so that the branch cleanup panel can reuse it. These perspectives pin that the function body, dialog text, initial checkboxes (both force and remote delete are false), `recordRecentAction` and the `deleteBranch` payload stay the same as before (implementation plan §4 Task 5 implementation item 6). Eligibility checks on the panel side belong to `web/branchCleanupPanel-test.md` S4 and are not covered in this table.

| Case ID | Input / Precondition                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                | Notes                                                 |
| ------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| TC-102  | Call the exported `showDeleteBranchDialog("/repo", "feature/x", ["origin"])` directly | Normal - existing dialog with remotes                                      | `showFormDialog` is called once with 2 checkboxes, Force Delete and remote delete (both initially `false`), and the existing text (same structure as S6 TC-025)                                | Text and initial values are unchanged even via export |
| TC-103  | Call the exported `showDeleteBranchDialog("/repo", "feature/x", [])` directly         | Boundary - 0 remotes                                                       | `showCheckboxDialog` is called once with Force Delete only (initially `false`) (the same existing behavior as S6 TC-026)                                                                       | Backward compatible                                   |
| TC-104  | Confirm the TC-102 dialog with the default values                                     | Normal - existing deleteBranch payload                                     | `sendMessage` is called once with `{ command: "deleteBranch", repo: "/repo", branchName: "feature/x", forceDelete: false, deleteOnRemotes: [] }`, and `recordRecentAction` is called as before | Payload contract unchanged                            |
| TC-105  | Open the same dialog through the Delete Branch path of the context menu               | Normal - regression via the menu                                           | After the export, `showFormDialog` is still called once via the menu with the same arguments as TC-102 (the same function and structure regardless of call path)                               | No regression on the existing path                    |

### Failure-source inventory (include-or-justify) - added by Feature 055-03 (S21)

| Failure source                                                | Covering cases or reason for exclusion                                                                                                   |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Text or initial checkboxes change because of the export       | TC-102, TC-103                                                                                                                           |
| `deleteBranch` payload or recordRecentAction changes          | TC-104                                                                                                                                   |
| The existing path via the menu breaks                         | TC-105                                                                                                                                   |
| Whether the panel may call it (eligibility)                   | excluded (owned by `web/branchCleanupPanel-test.md` S4)                                                                                  |
| Sending on cancel                                             | excluded (under the existing dialog contract the callback does not fire on cancel. The behavior of the existing owner S6 is not changed) |
| Exception / error paths                                       | excluded (only adds export, no new throw path)                                                                                           |
| External dependency x failure mode                            | excluded (Git execution belongs to the host owner)                                                                                       |
| Boundary values (0 / minimum / maximum / +/-1 / NULL / empty) | excluded (no numeric boundaries. 0 remotes is covered by TC-103)                                                                         |
| Invalid type / format                                         | excluded (the argument types keep the existing TypeScript signature, with no new type branches)                                          |

**Failure-category coverage (diversity floor)**:

- Validation: excluded (only adds export, no new validation branch)
- Exception: excluded (no throw path)
- External: excluded (no external dependencies)
- Boundary: TC-103
- Type: excluded (no change to the type contract)
- Normal: TC-102, TC-104, TC-105

**Failure/normal ratio (smoke detector)**: 3 normal cases (TC-102, TC-104, TC-105), 1 failure case (TC-103). This is a regression section for the export only, with no new branches, and the inventory confirms that the failure sources are limited to detecting changes to the existing contract.
