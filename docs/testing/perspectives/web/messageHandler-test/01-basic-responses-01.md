# Test Perspectives: web/messageHandler.ts

> Source: `web/messageHandler.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: basic-responses

## S1: handleMessage() pull/push response handling

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 3.3
> Added: 2026-02-25
> Status: superseded
> Supersedes: -
> Superseded By: S12

**Signature**: `handleMessage(msg: ResponseMessage, gitGraph: GitGraphViewAPI): void`
**Target path**: `web/messageHandler.ts`

| Case ID | Input / Precondition                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                            | Notes                  |
| ------- | -------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------ | ---------------------- |
| TC-001  | ResponsePull: status = null            | Normal - success                                                           | The graph refresh is called                | refreshOrError pattern |
| TC-002  | ResponsePush: status = null            | Normal - success                                                           | The graph refresh is called                | refreshOrError pattern |
| TC-003  | ResponsePull: status = "error message" | Exception - handled error                                                  | The error dialog "Unable to Pull" is shown | Shows the git message  |
| TC-004  | ResponsePush: status = "error message" | Exception - handled error                                                  | The error dialog "Unable to Push" is shown | Shows the git message  |

## S2: refreshOrError() soft refresh argument check

> Origin: Feature 004 (webview-ux-polish) (aidd-spec-tasks-test)
> Added: 2026-02-26
> Status: superseded
> Supersedes: -
> Superseded By: S16

**Signature**: `refreshOrError(gitGraph: GitGraphViewAPI, status: string | null, errorMessage: string): void`
**Target path**: `web/messageHandler.ts:142-144`

| Case ID | Input / Precondition                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                              | Notes                              |
| ------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------- |
| TC-005  | A command routed through refreshOrError (e.g. deleteBranch), status = null            | Normal - standard                                                          | `gitGraph.refresh("soft")` is called                         | REQ-2.1: soft mode is what matters |
| TC-006  | A command routed through refreshOrError (e.g. deleteBranch), status = "error message" | Exception - handled error                                                  | showErrorDialog is called and gitGraph.refresh is not called | REQ-2.2: no refresh on error       |

## S3: handleMessage() selectRepo response handling

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**Signature**: `handleMessage(msg: ResponseMessage, gitGraph: GitGraphViewAPI): void`
**Target path**: `web/messageHandler.ts`

| Case ID | Input / Precondition                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                         | Notes                        |
| ------- | ------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------- | ---------------------------- |
| TC-007  | ResponseSelectRepo: repo = "/path/to/repo" | Normal - standard                                                          | gitGraph.selectRepo(msg.repo) is called | Normal routing               |
| TC-008  | Handling a ResponseSelectRepo message      | Normal - standard                                                          | Handling completes without errors       | Checks the added switch case |

## S4: handleMessage() deleteRemoteBranch/rebaseBranch response handling

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**Signature**: `handleMessage(msg: ResponseMessage, gitGraph: GitGraphViewAPI): void`
**Target path**: `web/messageHandler.ts`

| Case ID | Input / Precondition                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                            | Notes                  |
| ------- | ---------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------- |
| TC-009  | ResponseDeleteRemoteBranch: status = null            | Normal - success                                                           | The graph refresh is called                                | refreshOrError pattern |
| TC-010  | ResponseDeleteRemoteBranch: status = "error message" | Exception - handled error                                                  | The error dialog "Unable to Delete Remote Branch" is shown | Shows the git message  |
| TC-011  | ResponseRebaseBranch: status = null                  | Normal - success                                                           | The graph refresh is called                                | refreshOrError pattern |
| TC-012  | ResponseRebaseBranch: status = "error message"       | Exception - handled error                                                  | The error dialog "Unable to Rebase Branch" is shown        | Shows the git message  |

## S5: handleMessage() passing authors on loadCommits

> Origin: Feature 011 (author-filter-fix) (aidd-spec-tasks-test)
> Added: 2026-03-05
> Status: active
> Supersedes: -

**Signature**: `handleMessage(msg: ResponseMessage, gitGraph: GitGraphViewAPI): void`
**Target path**: `web/messageHandler.ts`

| Case ID | Input / Precondition                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                   | Notes                                      |
| ------- | ------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------ |
| TC-013  | ResponseLoadCommits: authors=["Alice","Bob"]      | Normal - standard                                                          | gitGraph.loadCommits is called with parameters containing authors=["Alice","Bob"] | Checks that the authors field is forwarded |
| TC-014  | ResponseLoadCommits: no authors field (undefined) | Normal - no authors                                                        | gitGraph.loadCommits is called with authors=undefined                             | When the optional field is not set         |

## S16: handleMessage() not-fully-merged classification and explanation for deleteBranch

> Origin: Feature 055-01 (light-spec-plan)
> Added: 2026-08-23
> Status: active
> Supersedes: S2
> Signature: `handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void` (`case "deleteBranch"`, going through the module-internal `isDeleteBranchNotFullyMergedStatus(rawStatus: string): boolean`)
> Target Path: `web/messageHandler.ts` (`case "deleteBranch"` in the handleMessage switch; to be updated to a line range after implementation)
> Test File: `tests/web/messageHandler.test.ts`

A change that classifies the `deleteBranch` failure string by matching fixed fragments on each line (the line starts with `error: the branch '`, ends with `' is not fully merged.`, and has at least 1 character in between), and passes the explanation data (the 4 values of `ErrorDialogExplanation`) as the 4th argument of `showErrorDialog` only on a match. It does no case conversion, trim, ANSI stripping, whole-text match or exit-code check, and unknown input falls back to the existing 3-argument display (fail-closed). Success (`status === null`) is not classified and runs `refresh("soft")` once. The old S2 observed `deleteBranch` on the assumption that it goes through the generic `refreshOrError()`, so it is superseded. The DOM contract of the explanation dialog belongs to `web/dialogs-test.md` S7, and the locale values to `l10n/web/web.l10n.en.json-test.md` S4 / `web.l10n.ja.json-test.md` S5.

| Case ID | Input / Precondition                                                                                                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                                                                                             | Notes                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| TC-064  | `{ command: "deleteBranch", status: "error: the branch 'feature' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D feature'" }` | Exception - known error shown with an explanation (canonical)              | `showErrorDialog` is called once with `(t("error.deleteBranch"), status全文, null, { summary: t("error.deleteBranchNotFullyMerged.summary"), reason: t("error.deleteBranchNotFullyMerged.reason"), guidance: t("error.deleteBranchNotFullyMerged.guidance"), rawOutputLabel: t("dialog.originalGitOutput") })`, the 2nd argument exactly equals the received `status`, and `gitKeizu.refresh` is not called | memo finalized spec §8.1.1                                                         |
| TC-065  | `{ command: "deleteBranch", status: "error: the branch 'x' is not fully merged." }`                                                                           | Boundary - middle part at the minimum of 1 character                       | `showErrorDialog` is called once with 4 arguments including the explanation data, and `gitKeizu.refresh` is not called                                                                                                                                                                                                                                                                                      | The +1 boundary of `length > prefix + suffix`                                      |
| TC-066  | `{ command: "deleteBranch", status: "error: the branch 'feature/it's' is not fully merged." }`                                                                | Boundary - `'` inside the branch name                                      | `showErrorDialog` is called once with 4 arguments including the explanation data, and `gitKeizu.refresh` is not called                                                                                                                                                                                                                                                                                      | Because of the line-start and line-end contract, a `'` in the middle has no effect |
| TC-067  | `{ command: "deleteBranch", status: "warning: before\nerror: the branch 'feature' is not fully merged.\nIf you are sure..." }`                                | Exception - scanning multiple lines with lines before and after            | `showErrorDialog` is called once with 4 arguments including the explanation data, and the 2nd argument exactly equals the full 3-line `status`                                                                                                                                                                                                                                                              | Matches as long as one line matches, even a middle line                            |
| TC-068  | `{ command: "deleteBranch", status: "error: the branch '' is not fully merged." }`                                                                            | Boundary - middle part of 0 characters (empty branch name)                 | `showErrorDialog` is called once with the 3 arguments `(t("error.deleteBranch"), status, null)` (4th argument undefined), and `gitKeizu.refresh` is not called                                                                                                                                                                                                                                              | The -1 boundary of the length condition. Falls back to the existing display        |
| TC-069  | `{ command: "deleteBranch", status: "error: the branch 'feature' is fully merged." }`                                                                         | Validation - suffix mismatch (`fully merged`)                              | `showErrorDialog` is called once with 3 arguments (4th argument undefined), and `gitKeizu.refresh` is not called                                                                                                                                                                                                                                                                                            | Does not end with `' is not fully merged.`                                         |
| TC-070  | `{ command: "deleteBranch", status: "ERROR: THE BRANCH 'feature' IS NOT FULLY MERGED." }`                                                                     | Validation - uppercase text (case-sensitive)                               | `showErrorDialog` is called once with 3 arguments (4th argument undefined), and `gitKeizu.refresh` is not called                                                                                                                                                                                                                                                                                            | No case conversion                                                                 |
| TC-071  | `{ command: "deleteBranch", status: "エラー: ブランチは完全にマージされていません" }`                                                                         | Validation - localized output                                              | `showErrorDialog` is called once with 3 arguments (4th argument undefined), and `gitKeizu.refresh` is not called                                                                                                                                                                                                                                                                                            | Unknown input that does not match the fixed fragments                              |
| TC-072  | `{ command: "deleteBranch", status: " error: the branch 'feature' is not fully merged." }`                                                                    | Validation - leading whitespace (no trim)                                  | `showErrorDialog` is called once with 3 arguments (4th argument undefined), and `gitKeizu.refresh` is not called                                                                                                                                                                                                                                                                                            | Leading and trailing whitespace is not removed                                     |
| TC-073  | `{ command: "deleteBranch", status: "\u001b[31merror: the branch 'feature' is not fully merged.\u001b[0m" }`                                                  | Validation - with ANSI escapes                                             | `showErrorDialog` is called once with 3 arguments (4th argument undefined), and `gitKeizu.refresh` is not called                                                                                                                                                                                                                                                                                            | No ANSI stripping                                                                  |
| TC-074  | `{ command: "deleteBranch", status: "fatal: branch not found" }`                                                                                              | Exception - existing fallback for unknown errors                           | `showErrorDialog` is called once with the 3 arguments `(t("error.deleteBranch"), "fatal: branch not found", null)`, and `gitKeizu.refresh` is not called                                                                                                                                                                                                                                                    | memo finalized spec §8.2.2                                                         |
| TC-075  | `{ command: "deleteBranch", status: null }`                                                                                                                   | Normal - delete succeeds                                                   | `gitKeizu.refresh("soft")` is called once, and `showErrorDialog` is not called                                                                                                                                                                                                                                                                                                                              | Success does not go through the classifier                                         |
| TC-076  | `{ command: "pull", status: "error: the branch 'feature' is not fully merged." }`                                                                             | Validation - operation boundary (pull)                                     | `showErrorDialog` is called once with the 3 arguments `(t("error.pull"), status, null)` (4th argument undefined), and no explanation data is passed                                                                                                                                                                                                                                                         | The same string is out of scope when `command` differs                             |
| TC-077  | `{ command: "removeWorktree", status: null, branchStatus: "error: the branch 'feature' is not fully merged." }`                                               | Validation - operation boundary (removeWorktree.branchStatus)              | `gitKeizu.refresh` is called once, and `showErrorDialog` is called once with the 3 arguments `(t("error.deleteBranch"), branchStatus, null)` (4th argument undefined)                                                                                                                                                                                                                                       | Keeps the existing behavior of S7 TC-022 and does not explain it                   |
| TC-078  | `{ command: "deleteBranch", status: "" }`                                                                                                                     | Boundary - empty status string                                             | `showErrorDialog` is called once with the 3 arguments `(t("error.deleteBranch"), "", null)` (4th argument undefined), and `gitKeizu.refresh` is not called                                                                                                                                                                                                                                                  | Empty boundary. A single empty line does not match the fixed fragments             |

### Failure-source inventory (include-or-justify) — added for Feature 055-01 (S16)

| Failure source                                                                    | Covering case or reason for exclusion                                                                                            |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| A known error is not classified (explanation missing)                             | TC-064, TC-065, TC-066, TC-067                                                                                                   |
| Wrong decision at the middle-part length boundary (0 / 1 character)               | TC-065, TC-068                                                                                                                   |
| Unknown input classified as known (breaks fail-closed)                            | TC-069, TC-070, TC-071, TC-072, TC-073, TC-078                                                                                   |
| The existing 3-argument display for unknown errors breaks                         | TC-074                                                                                                                           |
| Misclassification, a wrong dialog or a missing refresh on success                 | TC-075                                                                                                                           |
| Breaking the operation boundary (explaining the same string for another command)  | TC-076, TC-077                                                                                                                   |
| Part of the original text dropped or altered (rewriting `status` when explaining) | TC-064, TC-067 (covered by the 2nd argument exactly equaling the received `status`)                                              |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)                     | TC-065 / TC-068 (middle part ±1), TC-078 (empty), TC-075 (null). The payload has no numeric boundaries, so the rest do not apply |
| Missing or mismatched locale values                                               | excluded(belongs to `l10n/web/web.l10n.en.json-test.md` S4 / `web.l10n.ja.json-test.md` S5)                                      |
| Missing dialog DOM structure or escaping                                          | excluded(belongs to `web/dialogs-test.md` S7)                                                                                    |
| External dependency failure                                                       | excluded(no external dependencies; the tests build the response messages directly)                                               |
| Invalid type or format                                                            | excluded(the response types are guaranteed by the TypeScript compiler and the type contracts in `src/types-test.md`)             |

**Failure-category coverage (diversity floor)**:

- Validation: TC-069, TC-070, TC-071, TC-072, TC-073, TC-076, TC-077
- Exception: TC-064, TC-067, TC-074
- External: excluded(no external dependencies; the tests build the response messages directly)
- Boundary: TC-065, TC-066, TC-068, TC-078
- Type: excluded(the response types are guaranteed at TypeScript compile time)

**Failure/normal ratio (smoke detector)**: 1 normal case (TC-075), 14 failure cases. The ratio is 14, derived from the counterexample inventory for fixed-fragment matching (no normalization, fail-closed, operation boundary). Against the 14 items listed in plan §4 Task 1, the empty-string `status` (TC-078) that satisfies the empty boundary of the test strategy was added from the inventory, for 15 cases in total.
