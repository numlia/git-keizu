# Test Perspectives: web/main.ts

> Source: `web/main.ts`
> Generated: 2026-05-22T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: request-queue

## S40: Holding and resending load requests (Feature 041)

> Origin: Feature 041 (refresh-contention-and-dialog-escape) (light-spec-plan)
> Added: 2026-05-22
> Status: active
> Supersedes: -
> Signature: `GitKeizuView.requestLoadBranchesAndCommits(forceRender) / requestLoadCommits(forceRender, loadedCallback)`
> Target Path: `web/main.ts`
> Test File: `tests/web/main.test.ts`

Verifies that later requests made while waiting for a `loadBranches` / `loadCommits` response are held and resent with the latest state after the callback of the response being processed completes. `loadBranchesCallback` / `loadCommitsCallback` are set to null before the callback runs, so the resend decision inside the callback and inside the flush is not blocked by a stale in-flight state.

| Case ID | Input / Precondition                                                                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                       | Notes                             |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| TC-221  | Call `refresh("hard")` while `loadBranches` is in flight, then the `loadBranches` response arrives                                    | Normal - refresh during loadBranches                                       | After the current `loadBranches` response is processed, `sendMessage` is called to resend `loadBranches`                                              | Resent with forceRender=true      |
| TC-222  | Change the branch filter to `["main"]` while `loadCommits` is in flight, then the `loadCommits` response arrives                      | Normal - filter change during loadCommits                                  | After the current `loadCommits` response is processed, `loadCommits` is resent and the payload's `branches` uses the latest `["main"]`                | Resent with the latest state      |
| TC-223  | While an automatic Load More is in flight, a filter change queues a resend, and finally the callback of the resent response completes | Normal - auto Load More callback queue                                     | The queued Load More callback runs on the resent response, `isLoadingMoreCommits` returns to `false`, and the next automatic Load More can fire again | No callback lost                  |
| TC-224  | While `loadCommits` is in flight, queue `requestLoadCommits(false, cb1)` and then `requestLoadCommits(true, cb2)`                     | Boundary - forceRender OR merge                                            | The resent `loadCommits` payload uses `hard=true`, and both `cb1` and `cb2` are called once each                                                      | OR merge and callback aggregation |
| TC-225  | While `loadCommits` is in flight, change the branch filter `["a"]` → `["b"]` in a row, then the `loadCommits` response arrives        | Boundary - latest state at resend                                          | The resent payload's `branches` uses the last `["b"]`, and no payload with `["a"]` is sent                                                            | Intermediate state discarded      |
| TC-226  | Call `triggerLoadCommitsCallback` with `pendingLoadCommits === null`                                                                  | Boundary - empty queue flush                                               | No additional `sendMessage` call occurs, and `pendingLoadCommits` stays `null`                                                                        | no-op                             |
| TC-227  | Call `requestLoadCommits(true, cb)` again from inside `loadCommitsCallback` (`loadCommitsCallback` is null when the callback runs)    | Boundary - re-entrant request                                              | On re-entry it is not queued by the in-flight check, and a new `loadCommits` `sendMessage` is sent immediately                                        | Timing of setting to null         |

## S47: Forced re-render of the active branch after a successful checkout

> Origin: 回帰修正 (checkout-active-branch-force-render)
> Added: 2026-08-04
> Status: active
> Supersedes: -
> Signature: `GitKeizuView.refresh(mode) / requestLoadBranchesAndCommits(forceRender)`
> Target Path: `web/main.ts`
> Test File: `tests/web/main.test.ts`

On a successful checkout, `forceRender` re-renders the graph even when the fetched branches and commits match the internal cache, and re-applies `.active` to the checked-out branch. The loading view and the immediate reset of the expanded state, which are specific to a hard refresh, are not done. Even when a checkout completes while waiting for a soft refresh response, the queued `forceRender` is guaranteed to be kept by OR merge. `hard` in host communication is kept as the forced re-render flag for compatibility.

| Case ID | Input / Precondition                                                                                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                   | Notes                                   |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| TC-270  | Receive a successful checkout response while the internal cache's HEAD is `feature/checkout` and only the DOM's `.active` is on `main` | Normal - stale DOM recovery                                                | Fetches with `hard=true` while keeping the current graph displayed, and `.active` moves to `feature/checkout` without a manual reload             | Also verifies no loading view           |
| TC-271  | Receive a successful checkout response while waiting for a soft `loadBranches` response                                                | Boundary - checkout during in-flight load                                  | The request following the checkout is queued and resent as a forced re-render, and after the final response `.active` moves to `feature/checkout` | forceRender kept under contention       |
| TC-272  | A commit that remains in the graph after the checkout is expanded                                                                      | Normal - expanded commit preservation                                      | No loading view is shown, and the expanded commit details are kept                                                                                | The target exists in the new graph      |
| TC-273  | A commit that disappears from the graph after the checkout is expanded                                                                 | Boundary - missing expanded commit                                         | The expanded state that can no longer be referenced is closed                                                                                     | No stale details left                   |
| TC-274  | Comparing 2 commits that remain in the graph after the checkout                                                                        | Normal - comparison preservation                                           | Both the comparison base and target exist, so the comparison details are kept                                                                     | Verifies both commits exist             |
| TC-275  | The comparison base or target disappears from the graph after the checkout                                                             | Boundary - missing comparison commit                                       | The whole comparison details are closed                                                                                                           | No partially stale display left         |
| TC-276  | Run a manual refresh while a commit is expanded                                                                                        | Normal - hard refresh compatibility                                        | As before, the expanded state closes immediately, the loading view is shown, and it fetches with `hard=true`                                      | Protects hard-refresh-specific behavior |

### Failure-source inventory (include-or-justify)

| Failure source                                                          | Case or reason for exclusion                                                                                                        |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Re-render skipped because the branch and commit data are the same       | TC-270                                                                                                                              |
| forceRender lost when queued while a load is in flight                  | TC-271                                                                                                                              |
| forceRender shows the loading view                                      | TC-270, TC-272                                                                                                                      |
| Expanded commit closed unnecessarily, or left in a stale state          | TC-272, TC-273                                                                                                                      |
| Existence check of the comparison base and target done on one side only | TC-274, TC-275                                                                                                                      |
| Regression of the hard refresh loading view and expanded-state reset    | TC-276                                                                                                                              |
| forceRender runs even when the checkout fails                           | `web/messageHandler-test.md` S14 TC-049 ensures no refresh runs                                                                     |
| forceRender runs even when the checkout is rejected                     | `web/messageHandler-test.md` S14 TC-046 / TC-047 ensure no refresh runs                                                             |
| Rendering with different commit lists per branch                        | excluded(identical data is the strict boundary for the early return, and different data is covered by the existing rendering tests) |

## S67: Refresh-driven closing keeps error dialogs open

> Origin: Feature 060-03 addendum (light-spec-plan)
> Added: 2026-09-29
> Status: active
> Supersedes: -
> Signature: `GitKeizuView.refresh(mode) / requestLoadBranchesAndCommits(forceRender) / renderShowLoading()`
> Target Path: `web/main.ts:661-673, 720-736, 1151-1158` (line ranges after the Feature 060-03 addendum implementation, unchanged by it; the close condition is line 729)
> Test File: `tests/web/main.refOverflow.test.ts` (runs the real `web/main.ts`, `web/messageHandler.ts` and `web/dialogs.ts`; `tests/web/main.test.ts` replaces `web/dialogs` with stubs)

When a soft or forceRender refresh finds branch or commit changes, the load callback closes the open dialog and the context menu. Error dialogs are now excluded from that close; confirmation, input, form, checkbox and select dialogs and the context menu still close (spec addendum `追補（2026-09-29）再読み込みでエラーダイアログを閉じない`). A forceRender response always counts as a change (`loadBranches` / `loadCommits` skip the equality check). A hard refresh still closes every dialog immediately through the loading view, and Esc keeps its order in `04-keyboard-selection-02.md`. The error-dialog-active state itself is `web/dialogs-test.md` S8; the response-to-refresh integration is `web/messageHandler-test/02-worktree-and-details-01.md` S20 and `03-git-operation-responses-01.md` S21. S47 stays active.

| Case ID | Input / Precondition                                                                                                                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                        | Notes                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| TC-623  | An error dialog is open (error-dialog-active and dialog-active both true), then `refresh("soft")` receives a `loadBranches` or `loadCommits` response with changes | Normal - error dialog kept on soft refresh with changes                    | `hideDialog()` is not called and the error dialog stays open after the `loadCommits` callback; the graph is rendered with the new data | Acceptance 2 of the spec addendum. Main regression (RED before Task 5) |
| TC-624  | An error dialog is open, then `refresh("forceRender")` receives its `loadBranches` and `loadCommits` responses                                                     | Normal - error dialog kept on forceRender refresh                          | `hideDialog()` is not called, the error dialog stays open, and no loading view is shown                                                | The pull-failed path refreshes this way                                |
| TC-625  | A confirmation dialog is open (dialog-active true, error-dialog-active false), then `refresh("soft")` receives a response with changes                             | Normal - non-error dialog still closes                                     | `hideDialog()` is called once after the `loadCommits` callback and the dialog is closed                                                | Existing behavior kept                                                 |
| TC-626  | An error dialog is open and the context menu is active, then `refresh("soft")` receives a response with changes                                                    | Normal - context menu closes independently of the kept error dialog        | `hideContextMenu()` is called once and `hideDialog()` is not called                                                                    | Guards against skipping the context menu close with the dialog         |
| TC-627  | An error dialog is shown, then a confirmation dialog replaces it, then `refresh("soft")` receives a response with changes                                          | Normal - dialog opened after an error dialog closes                        | The confirmation dialog is closed (`hideDialog()` once)                                                                                | Acceptance 3 of the spec addendum                                      |
| TC-628  | An error dialog is open, then `refresh("hard")` is called                                                                                                          | Normal - hard refresh still closes error dialogs                           | The loading view is shown and `hideDialog()` is called once before any load response arrives, so the error dialog is closed            | `renderShowLoading()` unchanged                                        |
| TC-629  | A confirmation dialog is open, then `refresh("soft")` receives `loadBranches` and `loadCommits` responses identical to the current data                            | Boundary - refresh without changes                                         | Neither `hideDialog()` nor `hideContextMenu()` is called and the dialog stays open                                                     | Existing behavior kept                                                 |

### Failure source inventory (include-or-justify) - Feature 060-03 addendum (S67)

| Failure source                                                    | Case or reason                                                                                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Error dialog closed by a soft or forceRender refresh with changes | TC-623, TC-624                                                                                                                        |
| Non-error dialogs no longer closed                                | TC-625, TC-627                                                                                                                        |
| Context menu close skipped together with the dialog close         | TC-626                                                                                                                                |
| Hard refresh leaves an error dialog over the loading view         | TC-628                                                                                                                                |
| Dialogs closed although nothing changed                           | TC-629                                                                                                                                |
| Esc no longer closes an error dialog                              | excluded (Esc chain unchanged; `04-keyboard-selection-02.md` TC-595 closes any active dialog)                                         |
| Queued refreshes (load in flight) close the kept error dialog     | covered at the integration level by `web/messageHandler-test/02-worktree-and-details-01.md` S20 TC-088; the queue itself is S40 / S47 |
| Invalid types or malformed responses                              | excluded (no new input; the load response types are checked by the TypeScript compiler)                                               |

### Feature 060-03 addendum test mapping and execution evidence (S67)

Test file: `tests/web/main.refOverflow.test.ts`, describe `refresh-driven closing keeps error dialogs open (S67)` (`@see` this file). The real dialogs and context menu run behind call-through spies, so each case checks both the `hideDialog` / `hideContextMenu` calls and the `#dialog` DOM. Every case starts idle: any load left in flight is answered with the current data, and a soft refresh must post exactly one `loadBranches` request. A soft refresh is started by the `refresh` response, a forceRender refresh by `checkoutBranch` with kind `completed` and status `null`, and a hard refresh by clicking `#refreshBtn`. "With changes" adds one commit on top of the loaded commits. The section column comes first because the perspectives index counts rows whose first cell is a Case ID.

| Section | Case ID | Test Method                                                                 | Result                                 |
| ------- | ------- | --------------------------------------------------------------------------- | -------------------------------------- |
| S67     | TC-623  | keeps an error dialog open on a soft refresh with changes (TC-623)          | pass (2026-09-29); RED before the fix  |
| S67     | TC-624  | keeps an error dialog open on a forceRender refresh (TC-624)                | pass (2026-09-29); RED before the fix  |
| S67     | TC-625  | still closes a confirmation dialog on a soft refresh with changes (TC-625)  | pass (2026-09-29); also passes at base |
| S67     | TC-626  | closes the context menu while keeping the error dialog open (TC-626)        | pass (2026-09-29); RED before the fix  |
| S67     | TC-627  | closes a confirmation dialog opened after an error dialog (TC-627)          | pass (2026-09-29); also passes at base |
| S67     | TC-628  | closes an error dialog on a hard refresh before any response (TC-628)       | pass (2026-09-29); also passes at base |
| S67     | TC-629  | keeps a confirmation dialog open when the refresh finds no changes (TC-629) | pass (2026-09-29); also passes at base |

- RED before the fix (2026-09-29): the base `1339842` was extracted with `git archive` into a temporary directory outside the checkout, the updated `tests/web/main.refOverflow.test.ts`, `tests/web/dialogs.test.ts` and `web/dialogs.ts` (so the new query exists) were copied in, `web/main.ts` stayed at the base, and `node_modules` was a symlink to the checkout. `vitest run tests/web/main.refOverflow.test.ts -t "TC-62[3-9]|TC-08[7-9]"` gave `Tests 6 failed | 4 passed | 166 skipped (176)`. TC-623, TC-624 and TC-626 failed with `AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times` on `hideDialog`, after the commit load response; S20 TC-087 / TC-088 and S21 TC-089 failed with `expected false to be true` on the dialog `active` class right after the commit load response. No failure came from dependency resolution, DOM setup or types. TC-625, TC-627, TC-628 and TC-629 pass at the base because they keep existing behavior. The temporary copy was removed afterwards.
- GREEN after the fix (2026-09-29): the same command in the checkout gave `Tests 10 passed | 166 skipped (176)`.
