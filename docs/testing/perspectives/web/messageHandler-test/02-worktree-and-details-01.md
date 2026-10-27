# Test Perspectives: web/messageHandler.ts

> Source: `web/messageHandler.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: worktree-and-details

## S6: Handling createWorktree/removeWorktree/openTerminal responses

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: active
> Supersedes: -

**Signature**: `handleMessage(msg: ResponseMessage, gitGraph: GitGraphViewAPI): void`
**Target path**: `web/messageHandler.ts`

| Case ID | Input / Precondition                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                       | Notes            |
| ------- | ------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------- |
| TC-015  | ResponseCreateWorktree: status = null            | Normal - success                                                           | refreshOrError is called and the graph refreshes      | REQ-3.1, REQ-3.2 |
| TC-016  | ResponseCreateWorktree: status = "error message" | Exception - handled error                                                  | The error dialog "Unable to Create Worktree" is shown | -                |
| TC-017  | ResponseRemoveWorktree: status = null            | Normal - success                                                           | refreshOrError is called and the graph refreshes      | REQ-4.1          |
| TC-018  | ResponseRemoveWorktree: status = "error message" | Exception - handled error                                                  | The error dialog "Unable to Remove Worktree" is shown | -                |
| TC-019  | ResponseOpenTerminal                             | Normal - standard                                                          | No-op (completes without errors)                      | REQ-9.1          |

## S7: Showing the branch deletion result of removeWorktree

> Origin: Feature 019 (worktree-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-15
> Status: active
> Supersedes: -

**Signature**: `handleMessage(msg: ResponseMessage, gitGraph: GitGraphViewAPI): void`
**Target path**: `web/messageHandler.ts`

| Case ID | Input / Precondition                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                          | Notes       |
| ------- | ------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------- |
| TC-020  | status=null, branchStatus=undefined        | Normal - standard                                                          | Graph refresh (same as existing behavior; branch deletion not requested) | REQ-4.2     |
| TC-021  | status=null, branchStatus=null             | Normal - standard                                                          | Graph refresh (both the worktree and the branch were deleted)            | REQ-4.2-TC1 |
| TC-022  | status=null, branchStatus="error msg"      | Normal - partial success                                                   | Graph refresh + error display for the failed branch deletion             | REQ-4.2-TC2 |
| TC-023  | status="error msg", branchStatus=undefined | Exception - handled error                                                  | Error dialog "Unable to Remove Worktree" (existing behavior)             | REQ-4.2-TC5 |

## S8: handleMessage() handling the openFile response

> Origin: Feature 026 (commit-detail-open-file) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: active
> Supersedes: -

**Signature**: `handleMessage(msg: ResponseMessage, gitGraph: GitGraphViewAPI): void`
**Target path**: `web/messageHandler.ts`

| Case ID | Input / Precondition                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                               | Notes                              |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------- |
| TC-024  | ResponseOpenFile: command="openFile", status=null            | Normal - success                                                           | showErrorDialog is not called. No gitGraph method is called either (no-op)    | Nothing happens on success         |
| TC-025  | ResponseOpenFile: command="openFile", status="error message" | Exception - error display                                                  | showErrorDialog is called with ("Unable to open file", "error message", null) | Same as the removeWorktree pattern |

## S9: handleMessage() handling the setShowRecentActions response

> Origin: Feature 039 (show-recent-actions-runtime-sync) (light-spec-plan)
> Added: 2026-05-10
> Status: active
> Supersedes: -

**Signature**: `handleMessage(msg: ResponseMessage, gitGraph: GitGraphViewAPI): void`
**Target path**: `web/messageHandler.ts`

| Case ID | Input / Precondition                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                  | Notes                                                 |
| ------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| TC-026  | ResponseSetShowRecentActions: command="setShowRecentActions", showRecentActions=true  | Normal - standard                                                          | `gitKeizu.setShowRecentActions(true)` is called once. `refresh` / `showErrorDialog` / other APIs are not called  | Verifies the routing of the runtime sync path         |
| TC-027  | ResponseSetShowRecentActions: command="setShowRecentActions", showRecentActions=false | Normal - standard                                                          | `gitKeizu.setShowRecentActions(false)` is called once. `refresh` / `showErrorDialog` / other APIs are not called | The setting value `false` takes the same routing path |

## S10: try/catch around building the fileTree for the commitDetails response

> Origin: フェーズ2 修正 M13 (commit-details-file-tree-guard)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: `handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void` (`case "commitDetails"`)
> Target Path: `web/messageHandler.ts:55-75`

A fix that wraps `generateGitFileTree(msg.commitDetails.fileChanges)` in `try/catch` in the `else` branch (`msg.commitDetails !== null`) of the `commitDetails` response. When building the tree throws, `hideCommitDetails()` ends the loading state and `showErrorDialog(t("error.commitDetails"), error instanceof Error ? error.message : null, null)` is shown.

| Case ID | Input / Precondition                                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                       | Notes                                     |
| ------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| TC-028  | `msg.commitDetails` is valid and `generateGitFileTree` returns a tree normally               | Normal - success                                                           | `gitKeizu.showCommitDetails(msg.commitDetails, fileTree)` is called once. `hideCommitDetails` and `showErrorDialog` are not called                    | Success path                              |
| TC-029  | `msg.commitDetails` is valid and `generateGitFileTree` throws `Error("dup")`                 | Exception - handled error                                                  | `gitKeizu.hideCommitDetails()` is called once + `showErrorDialog(t("error.commitDetails"), "dup", null)` is called. `showCommitDetails` is not called | catch path (Error instance)               |
| TC-030  | `msg.commitDetails` is valid and `generateGitFileTree` throws a non-Error (the string `"x"`) | Type - non-Error thrown                                                    | `showErrorDialog(t("error.commitDetails"), null, null)` is called (the message is `null` because `error instanceof Error` is false)                   | message is null for a non-Error exception |
| TC-031  | `msg.commitDetails === null`                                                                 | Validation - null commit details                                           | `gitKeizu.hideCommitDetails()` + `showErrorDialog(t("error.commitDetails"), null, null)` are called, and `generateGitFileTree` is not called          | null guard (does not enter catch)         |

## S11: Error display for openWorktreeInNewWindow / revealWorktreeInOS responses

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: `handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void` (adds `case "openWorktreeInNewWindow"` / `case "revealWorktreeInOS"`)
> Target Path: `web/messageHandler.ts` (handleMessage switch; to be updated to a line range after implementation)

A fix that adds cases for both commands to the `handleMessage` switch and calls `showErrorDialog` once with a per-action translation key only when `status !== null` (a string). Nothing is shown on success (`status === null`) (the webview side of [2]. Because status is now required, `undefined` in a success response cannot arrive. Sending on the host side belongs to the `src/gitGraphView-test/` owner).

| Case ID | Input / Precondition                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                    | Notes                                |
| ------- | -------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------ |
| TC-032  | `{ command: "openWorktreeInNewWindow", status: null }`   | Normal - nothing shown on a successful open                                | `showErrorDialog` is not called, and no `gitKeizu` API is called either (no-op)                    | Nothing happens on success           |
| TC-033  | `{ command: "openWorktreeInNewWindow", status: "boom" }` | Exception - display of an open failure                                     | `showErrorDialog` is called exactly once with `(t("error.openWorktreeInNewWindow"), "boom", null)` | Dedicated per-action translation key |
| TC-034  | `{ command: "revealWorktreeInOS", status: null }`        | Normal - nothing shown on a successful reveal                              | `showErrorDialog` is not called, and no `gitKeizu` API is called either                            | -                                    |
| TC-035  | `{ command: "revealWorktreeInOS", status: "no" }`        | Exception - display of a reveal failure                                    | `showErrorDialog` is called exactly once with `(t("error.revealWorktreeInOS"), "no", null)`        | Dedicated per-action translation key |

### Failure-source inventory (include-or-justify) — added by Feature 045 (S11)

| Failure source                                                        | Covering case or reason for exclusion                                                                                        |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| The response is not handled in the switch (error swallowed)           | TC-033, TC-035                                                                                                               |
| An error is wrongly shown for a success response                      | TC-032, TC-034                                                                                                               |
| Per-action translation keys mixed up, or confused with other commands | TC-033, TC-035 (verified by the 1st argument of `showErrorDialog`)                                                           |
| `undefined` status in a success response                              | excluded(prevented by the type because `status: GitCommandStatus` is required. Covered by `src/types-test.md` TC-008/TC-009) |
| Missing translation keys                                              | excluded(covered by `l10n/web/web.l10n.en.json-test.md` TC-001 to 002 / `web.l10n.ja.json-test.md` TC-003 to 004)            |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(the handler only checks whether status is null or a string and has no other validation branch)
- Exception: TC-033, TC-035
- External: excluded(no external dependency. The tests build the response messages directly)
- Boundary: excluded(`null` is verified as the success contract value in TC-032/TC-034. An empty status is not sent by the host by contract, and `""` as a string goes through the error display path)
- Type: excluded(response types are guaranteed at TypeScript compile time)

**Failure/normal ratio (smoke detector)**: 2 normal cases (TC-032, TC-034), 2 failure cases (TC-033, TC-035). Because the counts are equal, the inventory was re-derived; every failure source of this change (4 branches: 2 commands × success/failure) is covered by a case or a reason for exclusion in the table above, and no failure case needs to be added.

## S19: Call counts for success / failure of the removeWorktree response

> Origin: Feature 053 (detached-worktree-menu) (light-spec-plan)
> Added: 2026-09-13
> Status: active
> Supersedes: -
> Signature: `handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void` (`case "removeWorktree"`)
> Target Path: `web/messageHandler.ts:218-227`
> Test File: `tests/web/messageHandler.test.ts`

S6 TC-017 / TC-018 and S7 TC-020 to TC-023 are kept. This section pins the call counts.

| Case ID | Input / Precondition                                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                       | Notes |
| ------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----- |
| TC-085  | `{ command: "removeWorktree", status: null }`                                                     | Normal - soft refresh once                                                 | `gitKeizu.refresh` is called once with `("soft")`, and `showErrorDialog` 0 times                                      | -     |
| TC-086  | `{ command: "removeWorktree", status: "fatal: '/tmp/wt8' contains modified or untracked files" }` | External - Git reason shown once                                           | `showErrorDialog` is called once with `("Unable to Remove Worktree", <status>, null)`, and `gitKeizu.refresh` 0 times | -     |

### Failure-source inventory (include-or-justify) — added by Feature 053 (S19)

| Failure source     | Covering case or reason for exclusion |
| ------------------ | ------------------------------------- |
| Refresh on failure | TC-086                                |
| Dialog on success  | TC-085                                |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(S7 covers the `branchStatus` combinations)
- External: TC-086
- Boundary: excluded(same as above)
- Type: excluded(same as above)

## S20: Branch deletion error after worktree removal stays open across the refresh

> Origin: Feature 060-03 addendum (light-spec-plan)
> Added: 2026-09-29
> Status: active
> Supersedes: -
> Signature: `handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void` (`case "removeWorktree"`), with the real `GitKeizuView.refresh(mode)` and `web/dialogs.ts`
> Target Path: `web/messageHandler.ts:218-227`, integrated with `web/main.ts:720-736` and `web/dialogs.ts:7, 203-259` (line ranges after the Feature 060-03 addendum implementation)
> Test File: `tests/web/main.refOverflow.test.ts` (runs the real `web/main.ts`, `web/messageHandler.ts` and `web/dialogs.ts` together)

Integration of the TC-052 path (spec addendum `追補（2026-09-29）再読み込みでエラーダイアログを閉じない`). A successful removal starts a soft refresh and then shows the branch deletion error; the refresh result arrives after the error dialog is open. The response order, the error title and text, and the call counts of S7 TC-022 and S19 TC-085 / TC-086 are unchanged. Which dialogs a refresh closes is owned by `web/main-test/08-request-queue-01.md` S67.

| Case ID | Input / Precondition                                                                                                                                                                                                                                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                             | Notes                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| TC-087  | Graph loaded and no load in flight. `{ command: "removeWorktree", status: null, branchStatus: "error: the branch 'feature' is not fully merged." }` is received, then the `loadBranches` and `loadCommits` responses of the refresh arrive with changes (the removed worktree is gone from the commits) | External - branch deletion failure after worktree removal                  | One `loadBranches` request with `hard: false` is posted. `#dialog` shows `Unable to Delete Branch` with the `branchStatus` text before the responses, and after both responses it still has the `active` class with the same text. Clicking `#dialogDismiss` then closes it | Automated counterpart of S8 TC-060 in `web/contextMenu-test.md` |
| TC-088  | Same response as TC-087 while an earlier soft `loadBranches` is still in flight, so the refresh is queued; the in-flight and the queued loads both return with changes                                                                                                                                  | Boundary - queued refresh after the error is shown                         | After every load response, `#dialog` still has the `active` class and shows `Unable to Delete Branch` with the `branchStatus` text                                                                                                                                          | A host-triggered refresh can overlap with the removal response  |

### Failure source inventory (include-or-justify) - Feature 060-03 addendum (S20)

| Failure source                                  | Case or reason                                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Refresh result closes the branch deletion error | TC-087                                                                                      |
| Queued or overlapping refresh closes the error  | TC-088                                                                                      |
| Error no longer closable by the user            | TC-087 (Dismiss)                                                                            |
| Removal failure (`status` string) path          | excluded (no refresh runs; S19 TC-086 keeps the call counts)                                |
| Success without branch error                    | excluded (no error dialog is shown; S19 TC-085)                                             |
| Malformed response fields                       | excluded (`branchStatus` typing is checked by the TypeScript compiler; S7 keeps the values) |

### Feature 060-03 addendum test mapping and execution evidence (S20)

Test file: `tests/web/main.refOverflow.test.ts`, describe `branch deletion error after worktree removal across the refresh (S20)` (`@see` this file). The file runs the real `web/main.ts`, `web/messageHandler.ts` and `web/dialogs.ts`; the responses are dispatched as window `message` events. "Without the removed worktree" drops the last linked worktree from the worktree collection while its branch stays. The section column comes first because the perspectives index counts rows whose first cell is a Case ID.

| Section | Case ID | Test Method                                                               | Result                                |
| ------- | ------- | ------------------------------------------------------------------------- | ------------------------------------- |
| S20     | TC-087  | keeps the branch deletion error open after the refresh responses (TC-087) | pass (2026-09-29); RED before the fix |
| S20     | TC-088  | keeps the branch deletion error open across a queued refresh (TC-088)     | pass (2026-09-29); RED before the fix |

- RED and GREEN (2026-09-29): recorded with the main regression in `web/main-test/08-request-queue-01.md` S67. At the base `web/main.ts`, both cases failed with `expected false to be true` on the dialog `active` class right after the first commit load response with changes.

## S22: handleMessage() setWorktreePath routing

> Origin: Feature 062-01 (PR #114 follow-up)
> Added: 2026-10-27
> Status: active
> Supersedes: -
> Signature: `handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void` for `ResponseSetWorktreePath`
> Target Path: `web/messageHandler.ts` (`case "setWorktreePath"`)
> Test File: `tests/web/messageHandler.test.ts`

Routes the host's `setWorktreePath` (`src/gitGraphView-test/03-worktree-actions-01.md` S44) to `GitKeizuView.setWorktreePath` (`web/main-test/05-state-response-02.md` S86), the same way S9 routes `setShowRecentActions`. Fixture: `createMockGitKeizuView()` of the test file.

| Case ID | Input / Precondition                                                                                                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                 | Notes |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----- |
| TC-090  | `{ command: "setWorktreePath", worktreePath: { template: "~/.worktrees/${repoName}/${branch}", homeDir: "/home/dev", platform: "posix" } }` | Normal - routed without refresh                                            | `gitKeizu.setWorktreePath` is called once with the same `worktreePath`; `refresh` is not called | -     |

### Failure-source inventory (include-or-justify) — S22

| Failure source                     | Case or reason for exclusion                                            |
| ---------------------------------- | ----------------------------------------------------------------------- |
| Message not routed or payload lost | TC-090                                                                  |
| Unneeded refresh                   | TC-090                                                                  |
| Exception / External / Type        | excluded (a single delegating call; the message type is a union member) |

### Test mapping — S22

`tests/web/messageHandler.test.ts` describe `handleMessage setShowRecentActions response (S9)`: TC-090 `routes a worktree path template update to gitKeizu.setWorktreePath (TC-090)`.
