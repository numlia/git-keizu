# Test Perspectives: web/messageHandler.ts

> Source: `web/messageHandler.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: git-operation-responses

## S12: Showing and delegating by checkout kind and Push phase

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-03
> Status: superseded
> Supersedes: S1
> Superseded By: S14
> Signature: `handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void` (`case "checkoutBranch"` / `case "push"`)
> Target Path: `web/messageHandler.ts` (handleMessage switch; to be updated to a line range after implementation)
> Test File: `tests/web/messageHandler.test.ts`

A change that branches `ResponseCheckoutBranch` by `kind` and `ResponsePush` by `phase`: `branchExists` / `invalidRef` / `noRemotes` show a dedicated reason per locale, `selectRemote` delegates to `showPushRemoteDialog()`, and `completed` goes to the existing `refreshOrError()`. The old S1 fixed single-step handling of `ResponsePush.status` as the expected result, so it is superseded; the pull response handling, which this change does not touch, is kept as S13. The existence of translation keys belongs to the l10n owners (`l10n/web/web.l10n.en.json-test.md` S2 / `web.l10n.ja.json-test.md` S3), and the dialog contents to `web/refMenu-test/01-branch-actions-01.md` S17.

| Case ID | Input / Precondition                                                                                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                            | Notes                                |
| ------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| TC-036  | `{ command: "checkoutBranch", kind: "branchExists" }`                                                                       | Validation - showing an existing branch                                    | `showErrorDialog` is called once with `(t("error.checkoutBranch"), t("error.checkoutBranchExists"), null)`, and `gitKeizu.refresh` is not called           | Does not show the raw English status |
| TC-037  | `{ command: "checkoutBranch", kind: "invalidRef" }`                                                                         | Validation - showing an invalid ref                                        | `showErrorDialog` is called once with `(t("error.checkoutBranch"), t("error.checkoutInvalidRef"), null)`, and `gitKeizu.refresh` is not called             | Dedicated reason                     |
| TC-038  | `{ command: "checkoutBranch", kind: "completed", status: null }`                                                            | Normal - checkout succeeds                                                 | `gitKeizu.refresh(false)` is called once, and `showErrorDialog` is not called                                                                              | Existing refreshOrError path         |
| TC-039  | `{ command: "checkoutBranch", kind: "completed", status: "fatal: pathspec" }`                                               | Exception - checkout fails                                                 | `showErrorDialog` is called once with `(t("error.checkoutBranch"), "fatal: pathspec", null)`, and `gitKeizu.refresh` is not called                         | Shows the Git message                |
| TC-040  | `{ command: "push", operationId: "op-1", phase: "selectRemote", remotes: ["origin", "upstream"], defaultRemote: "origin" }` | Normal - selection delegated                                               | `showPushRemoteDialog` is called once with `(repo, "op-1", ["origin", "upstream"], "origin")`, and `gitKeizu.refresh` and `showErrorDialog` are not called | Arguments are not modified           |
| TC-041  | `{ command: "push", operationId: "op-1", phase: "noRemotes" }`                                                              | Validation - showing no registered remote                                  | `showErrorDialog` is called once with `(t("error.push"), t("error.pushNoRemotes"), null)`, and `showPushRemoteDialog` is not called                        | Dedicated reason                     |
| TC-042  | `{ command: "push", operationId: "op-1", phase: "completed", status: null }`                                                | Normal - Push succeeds                                                     | `gitKeizu.refresh(false)` is called once, and `showErrorDialog` is not called                                                                              | soft refresh                         |
| TC-043  | `{ command: "push", operationId: "op-1", phase: "completed", status: "fatal: rejected" }`                                   | Exception - Push fails                                                     | `showErrorDialog` is called once with `(t("error.push"), "fatal: rejected", null)`, and `gitKeizu.refresh` is not called                                   | Existing Push error title kept       |

## S13: Pull response handling kept

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-03
> Status: active
> Supersedes: -
> Signature: `handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void` (`case "pull"`)
> Target Path: `web/messageHandler.ts` (`case "pull"` of the handleMessage switch)
> Test File: `tests/web/messageHandler.test.ts`

The old S1 handled pull and push in one section, so superseding the push side would make the pull observation points historical too. Pull response handling is outside this change and its behavior does not change, so it is carried over as active to confirm the existing behavior is kept.

| Case ID | Input / Precondition                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                | Notes                                                |
| ------- | ----------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------- |
| TC-044  | `{ command: "pull", status: null }`       | Normal - pull succeeds                                                     | `gitKeizu.refresh("soft")` is called once, and `showErrorDialog` is not called | Carried over from old S1/TC-001 (behavior unchanged) |
| TC-045  | `{ command: "pull", status: "CONFLICT" }` | Exception - pull fails                                                     | `showErrorDialog` is called once with `(t("error.pull"), "CONFLICT", null)`    | Carried over from old S1/TC-003                      |

### Failure-source inventory (include-or-justify) - added by Feature 047 (S12, S13)

| Failure source                                                    | Covering cases or reason for exclusion                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guard rejection not shown (branchExists / invalidRef / noRemotes) | TC-036, TC-037, TC-041                                                                                                                                                                                                                                                     |
| Raw English status shown as is (no reason per locale)             | TC-036, TC-037, TC-041                                                                                                                                                                                                                                                     |
| Git failure swallowed (checkout / Push)                           | TC-039, TC-043                                                                                                                                                                                                                                                             |
| Refresh runs on failure                                           | TC-036, TC-037, TC-039, TC-043, TC-045                                                                                                                                                                                                                                     |
| phase / kind mixed up (wrong delegation target)                   | TC-040, TC-041, TC-042                                                                                                                                                                                                                                                     |
| Negative side of each branch (no error on success)                | TC-038, TC-042, TC-044                                                                                                                                                                                                                                                     |
| Choices or default modified (mismatch with the host Response)     | TC-040                                                                                                                                                                                                                                                                     |
| Boundary value (`remotes` is an empty array)                      | excluded(the host sends an empty list as the `noRemotes` phase, so an empty array never reaches `selectRemote`. `noRemotes` is verified by TC-041)                                                                                                                         |
| Boundary values (0 / minimum / maximum / +/-1 / NULL)             | excluded(the payload has only strings and arrays and no numeric boundary. `status: null` is verified as the success contract value by TC-038 / TC-042 / TC-044)                                                                                                            |
| Failure of an external dependency                                 | excluded(no external dependency. The test builds the response messages directly)                                                                                                                                                                                           |
| Missing translation keys                                          | excluded(covered by `l10n/web/web.l10n.en.json-test.md` S2 and `web.l10n.ja.json-test.md` S3)                                                                                                                                                                              |
| Invalid type or format                                            | excluded(response types are guaranteed by the type contract in `src/types-test.md` S3 and TypeScript compilation)                                                                                                                                                          |
| operationId missing or mixed up                                   | excluded(the handler only passes operationId through to the dialog and does not use it for decisions. Correlation is the responsibility of `src/gitGraphView-test/01-message-routing-03.md` S28 TC-120 and `web/refMenu-test/01-branch-actions-01.md` S17 TC-085 / TC-088) |

**Failure-category coverage (diversity floor)**:

- Validation: TC-036, TC-037, TC-041
- Exception: TC-039, TC-043, TC-045
- External: excluded(no external dependency)
- Boundary: excluded(no numeric boundary, and an empty list is already verified as the `noRemotes` phase by TC-041)
- Type: excluded(the type contract belongs to `src/types-test.md` S3)

**Failure/normal ratio (smoke detector)**: 4 normal cases (TC-038, TC-040, TC-042, TC-044), 6 failure cases (TC-036, TC-037, TC-039, TC-041, TC-043, TC-045). The ratio is 1.5:1.

## S14: Showing and delegating by checkout kind and Push phase (using the repo of the Response)

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-04
> Status: superseded
> Supersedes: S12
> Superseded By: S15
> Signature: `handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void` (`case "checkoutBranch"` / `case "push"`)
> Target Path: `web/messageHandler.ts` (handleMessage switch)
> Test File: `tests/web/messageHandler.test.ts`

Because `repo` was added to `ResponsePush` as a required field, the repository passed to the delegation target of the `selectRemote` phase now comes from `msg.repo` instead of the module state of `web/refMenu.ts` (`getPendingPushRepo()`). S12 expected the repository from `getPendingPushRepo()` as an argument, so it is superseded. On checkout success, `refresh("forceRender")` forces a re-render so that the old active branch DOM does not remain even when the Git result equals the internal cache. Unlike a hard refresh, this mode does not show loading or reset the expanded state immediately. On Push success, `refresh("soft")` is kept as before. The existence of translation keys belongs to the l10n owners (`l10n/web/web.l10n.en.json-test.md` S2 / `web.l10n.ja.json-test.md` S3), and the dialog contents to `web/refMenu-test/01-branch-actions-01.md` S17 / S19.

| Case ID | Input / Precondition                                                                                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                              | Notes                                 |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| TC-046  | `{ command: "checkoutBranch", kind: "branchExists" }`                                                                                               | Validation - showing an existing branch                                    | `showErrorDialog` is called once with `(t("error.checkoutBranch"), t("error.checkoutBranchExists"), null)`, and `gitKeizu.refresh` is not called                                                                             | Carried over from S12/TC-036          |
| TC-047  | `{ command: "checkoutBranch", kind: "invalidRef" }`                                                                                                 | Validation - showing an invalid ref                                        | `showErrorDialog` is called once with `(t("error.checkoutBranch"), t("error.checkoutInvalidRef"), null)`, and `gitKeizu.refresh` is not called                                                                               | Carried over from S12/TC-037          |
| TC-048  | `{ command: "checkoutBranch", kind: "completed", status: null }`                                                                                    | Normal - checkout succeeds                                                 | `gitKeizu.refresh("forceRender")` is called once, and `showErrorDialog` is not called                                                                                                                                        | Forced re-render of the active branch |
| TC-049  | `{ command: "checkoutBranch", kind: "completed", status: "fatal: pathspec" }`                                                                       | Exception - checkout fails                                                 | `showErrorDialog` is called once with `(t("error.checkoutBranch"), "fatal: pathspec", null)`, and `gitKeizu.refresh` is not called                                                                                           | Carried over from S12/TC-039          |
| TC-050  | `{ command: "push", repo: "/response/repo", operationId: "op-1", phase: "selectRemote", remotes: ["origin", "upstream"], defaultRemote: "origin" }` | Normal - selection delegated                                               | `showPushRemoteDialog` is called once with `("/response/repo", "op-1", ["origin", "upstream"], "origin")`. The first argument equals the `repo` of the Response, and `gitKeizu.refresh` and `showErrorDialog` are not called | Does not read the module state        |
| TC-051  | `{ command: "push", repo: "/r", operationId: "op-1", phase: "noRemotes" }`                                                                          | Validation - showing no registered remote                                  | `showErrorDialog` is called once with `(t("error.push"), t("error.pushNoRemotes"), null)`, and `showPushRemoteDialog` is not called                                                                                          | Carried over from S12/TC-041          |
| TC-052  | `{ command: "push", repo: "/r", operationId: "op-1", phase: "completed", status: null }`                                                            | Normal - Push succeeds                                                     | `gitKeizu.refresh("soft")` is called once, and `showErrorDialog` is not called                                                                                                                                               | Carried over from S12/TC-042          |
| TC-053  | `{ command: "push", repo: "/r", operationId: "op-1", phase: "completed", status: "fatal: rejected" }`                                               | Exception - Push fails                                                     | `showErrorDialog` is called once with `(t("error.push"), "fatal: rejected", null)`, and `gitKeizu.refresh` is not called                                                                                                     | Existing Push error title kept        |

### Failure-source inventory (include-or-justify) - Feature 047 P3 fix (S14)

| Failure source                                                                 | Covering cases or reason for exclusion                                                                                                                                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A different repository passed to the delegation target (module state mixed in) | TC-050 (asserts that the first argument equals the `repo` of the Response, fixing that no other value gets mixed in)                                                                             |
| Guard rejection not shown (branchExists / invalidRef / noRemotes)              | TC-046, TC-047, TC-051                                                                                                                                                                           |
| Raw English status shown as is (no reason per locale)                          | TC-046, TC-047, TC-051                                                                                                                                                                           |
| Git failure swallowed (checkout / Push)                                        | TC-049, TC-053                                                                                                                                                                                   |
| Refresh runs on failure                                                        | TC-046, TC-047, TC-049, TC-053                                                                                                                                                                   |
| phase / kind mixed up (wrong delegation target)                                | TC-050, TC-051, TC-052                                                                                                                                                                           |
| Negative side of each branch (no error on success)                             | TC-048, TC-052                                                                                                                                                                                   |
| Active branch DOM not updated after checkout because of an equality check      | TC-048 (requests forceRender). DOM, expanded state and re-rendering under contention are covered by `web/main-test/08-request-queue-01.md` S47 TC-270 to TC-276                                  |
| Choices or default modified (mismatch with the host Response)                  | TC-050                                                                                                                                                                                           |
| Boundary value (`remotes` is an empty array)                                   | excluded(the host sends an empty list as the `noRemotes` phase, so an empty array never reaches `selectRemote`. `noRemotes` is verified by TC-051)                                               |
| Boundary values (0 / minimum / maximum / +/-1 / NULL)                          | excluded(the payload has only strings and arrays and no numeric boundary. `status: null` is verified as the success contract value by TC-048 / TC-052)                                           |
| Failure of an external dependency                                              | excluded(no external dependency. The test builds the response messages directly)                                                                                                                 |
| Missing translation keys                                                       | excluded(covered by `l10n/web/web.l10n.en.json-test.md` S2 and `web.l10n.ja.json-test.md` S3)                                                                                                    |
| Invalid type or format (including a missing `repo`)                            | excluded(response types are guaranteed by the type contract in `src/types-test.md` S4 TC-041 and TypeScript compilation)                                                                         |
| operationId missing or mixed up                                                | excluded(the handler only passes operationId through to the dialog and does not use it for decisions. Correlation is the responsibility of `src/gitGraphView-test/01-message-routing-03.md` S31) |
| Pull response handling changed along with it                                   | excluded(S13 TC-044 / TC-045 cover that the behavior is unchanged)                                                                                                                               |

**Failure-category coverage (diversity floor)**:

- Validation: TC-046, TC-047, TC-051
- Exception: TC-049, TC-053
- External: excluded(no external dependency)
- Boundary: excluded(no numeric boundary, and an empty list is already verified as the `noRemotes` phase by TC-051)
- Type: excluded(the type contract belongs to `src/types-test.md` S4)

**Failure/normal ratio (smoke detector)**: 3 normal cases (TC-048, TC-050, TC-052), 5 failure cases (TC-046, TC-047, TC-049, TC-051, TC-053). The ratio is about 1.7:1.

## S15: Showing the 5 checkout kinds and keeping the Push phases

> Origin: Feature 051 (remote-checkout-pull) (light-spec-plan)
> Added: 2026-08-06
> Status: active
> Supersedes: S14
> Signature: `handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void` (`case "checkoutBranch"` / `case "push"`)
> Target Path: `web/messageHandler.ts` (checkout / Push responses in the handleMessage switch)
> Test File: `tests/web/messageHandler.test.ts`

Carries over the checkout / Push display contract of S14. A missing remote stops with a dedicated locale reason, and a pull failure after checkout re-renders the repository state before showing the pull error. The menu callback and building the host result belong to other owners.

| Case ID | Input / Precondition                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                      | Notes                                   |
| ------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| TC-054  | `{ command: "checkoutBranch", kind: "branchExists" }`                         | Validation - showing branchExists                                          | `showErrorDialog` once with `(t("error.checkoutBranch"), t("error.checkoutBranchExists"), null)`, `refresh` 0 times                                                  | Carried over from S14/TC-046            |
| TC-055  | `{ command: "checkoutBranch", kind: "invalidRef" }`                           | Validation - showing invalidRef                                            | `showErrorDialog` once with `(t("error.checkoutBranch"), t("error.checkoutInvalidRef"), null)`, `refresh` 0 times                                                    | Carried over from S14/TC-047            |
| TC-056  | `{ command: "checkoutBranch", kind: "remoteNotFound" }`                       | Validation - showing remoteNotFound                                        | `showErrorDialog` once with `(t("error.checkoutBranch"), t("error.checkoutRemoteNotFound"), null)`, `refresh` 0 times                                                | Dedicated locale reason                 |
| TC-057  | `{ command: "checkoutBranch", kind: "completed", status: null }`              | Normal - checkout succeeds                                                 | `gitKeizu.refresh("forceRender")` once, `showErrorDialog` 0 times                                                                                                    | Carried over from S14/TC-048            |
| TC-058  | `{ command: "checkoutBranch", kind: "completed", status: "fatal: pathspec" }` | Exception - checkout fails                                                 | `showErrorDialog` once with `(t("error.checkoutBranch"), "fatal: pathspec", null)`, `refresh` 0 times                                                                | Carried over from S14/TC-049            |
| TC-059  | `{ command: "checkoutBranch", kind: "pullFailed", status: "CONFLICT" }`       | Exception - pull partly succeeds                                           | `gitKeizu.refresh("forceRender")` and `showErrorDialog(t("error.pull"), "CONFLICT", null)` are each called once, in this order. The checkout error title is not used | The current branch is re-rendered first |
| TC-060  | Push `selectRemote` response with repo                                        | Normal - Push selection delegated                                          | `showPushRemoteDialog` once with `(msg.repo, msg.operationId, msg.remotes, msg.defaultRemote)`, `refresh` / error dialog 0 times                                     | Carried over from S14/TC-050            |
| TC-061  | Push `noRemotes` response with repo                                           | Validation - no Push remote registered                                     | `showErrorDialog` once with `(t("error.push"), t("error.pushNoRemotes"), null)`, dialog 0 times                                                                      | Carried over from S14/TC-051            |
| TC-062  | Push completed/null response with repo                                        | Normal - Push succeeds                                                     | `gitKeizu.refresh("soft")` once, error dialog 0 times                                                                                                                | Carried over from S14/TC-052            |
| TC-063  | Push completed/`"fatal: rejected"` response with repo                         | Exception - Push fails                                                     | `showErrorDialog` once with `(t("error.push"), "fatal: rejected", null)`, `refresh` 0 times                                                                          | Carried over from S14/TC-053            |

### Failure-source inventory (include-or-justify) - added by Feature 051 (S15)

| Failure source                                                | Covering cases or reason for exclusion                                                                                     |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| A checkout guard kind not shown                               | TC-054 to TC-056                                                                                                           |
| remoteNotFound refreshes or shows the Git status              | TC-056                                                                                                                     |
| Completed failure swallowed / wrong refresh                   | TC-058                                                                                                                     |
| pullFailed skips re-rendering the current branch              | TC-059                                                                                                                     |
| Wrong error title / status / call order for pullFailed        | TC-059                                                                                                                     |
| Existing Push phase paths changed along with it               | TC-060 to TC-063                                                                                                           |
| Negative side of each branch (error shown on success)         | TC-057, TC-062                                                                                                             |
| Missing locale key                                            | excluded(belongs to `l10n/web/web.l10n.en.json-test.md` S3 / `web.l10n.ja.json-test.md` S4)                                |
| Missing payload field, unknown kind                           | excluded(belongs to `src/types-test.md` S6)                                                                                |
| Menu callback / building the host result                      | excluded(belongs to `web/refMenu-test/01-branch-actions-01.md` S20 / `src/gitGraphView-test/01-message-routing-03.md` S32) |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL) | excluded(the payload has only strings and unions and no numeric boundary. `status: null` is verified by TC-057 / TC-062)   |
| Failure of an external dependency                             | excluded(the test builds the response message directly, and Git failures belong to the DataSource owner)                   |

**Failure-category coverage (diversity floor)**:

- Validation: TC-054, TC-055, TC-056, TC-061
- Exception: TC-058, TC-059, TC-063
- External: excluded(no external dependency)
- Boundary: excluded(no numeric boundary, and `null` is verified as a normal contract by TC-057 / TC-062)
- Type: excluded(belongs to `src/types-test.md` S6)

**Failure/normal ratio (smoke detector)**: 3 normal cases (TC-057, TC-060, TC-062), 7 failure cases (the rest). The ratio is about 2.3:1, derived from the branches of the 5 checkout kinds and the existing Push phases.

## S21: Pull error after checkout stays open across the forceRender refresh

> Origin: Feature 060-03 addendum (light-spec-plan)
> Added: 2026-09-29
> Status: active
> Supersedes: -
> Signature: `handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void` (`case "checkoutBranch"`, kind `pullFailed`), with the real `GitKeizuView.refresh(mode)` and `web/dialogs.ts`
> Target Path: `web/messageHandler.ts:63-66`, integrated with `web/main.ts:720-736` and `web/dialogs.ts:7, 203-259` (line ranges after the Feature 060-03 addendum implementation)
> Test File: `tests/web/main.refOverflow.test.ts` (same test file as `02-worktree-and-details-01.md` S20)

Side effect of the spec addendum: the pull-failed response is built the same way as the worktree removal (refresh first, then the error), so the same rule keeps its error open. A forceRender response always counts as a change, so before the fix the pull error closed whenever the refresh completed. Not checked on screen. S15 TC-059 (call order and arguments) stays active.

| Case ID | Input / Precondition                                                                                                                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                 | Notes                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| TC-089  | Graph loaded and no load in flight. `{ command: "checkoutBranch", kind: "pullFailed", status: "CONFLICT" }` is received, then the forced `loadBranches` and `loadCommits` responses arrive | External - pull failure after checkout (side effect)                       | The load requests are posted with `hard: true`, and after both responses `#dialog` still has the `active` class and shows the `t("error.pull")` title with `CONFLICT`; no loading view is shown | Side effect of the addendum; not checked on screen |

### Feature 060-03 addendum test mapping and execution evidence (S21)

Test file: `tests/web/main.refOverflow.test.ts`, describe `pull error after checkout across the forceRender refresh (S21)` (`@see` this file). The file runs the real `web/main.ts`, `web/messageHandler.ts` and `web/dialogs.ts`; the forced responses carry the current data with `hard: true`. The section column comes first because the perspectives index counts rows whose first cell is a Case ID.

| Section | Case ID | Test Method                                                        | Result                                |
| ------- | ------- | ------------------------------------------------------------------ | ------------------------------------- |
| S21     | TC-089  | keeps the pull error open after the forced load responses (TC-089) | pass (2026-09-29); RED before the fix |

- RED and GREEN (2026-09-29): recorded with the main regression in `web/main-test/08-request-queue-01.md` S67. At the base `web/main.ts`, the case failed with `expected false to be true` on the dialog `active` class right after the forced commit load response.
