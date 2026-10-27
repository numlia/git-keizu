# Test Perspectives: web/main.ts

> Source: `web/main.ts`
> Generated: 2026-08-25T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: branch-cleanup

## S49: Lifecycle wiring of the branch cleanup panel, 1-branch filter, and scroll by exact dataset match

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: Panel creation in the `GitKeizuView` constructor / `refresh(mode)` / `selectRepo()`, `loadRepos()` / `showBranchInGraph(branchName: string): void`
> Target Path: `web/main.ts` (panel wiring and graph navigation; update to line ranges after implementation)
> Test File: `tests/web/main.test.ts`

Perspectives for the wiring that creates the panel once in the constructor, injects the graph callback and the delete dialog callback, and connects repository changes and refresh to the panel, and for the 1-branch filter of `showBranchInGraph()` and the scroll by exact dataset match after rendering (implementation plan §3.3 / §4 Task 5). Row validation and rendering inside the panel are owned by `web/branchCleanupPanel-test.md`, and delegating the response by `web/messageHandler-test/04-branch-cleanup-01.md` S17.

| Case ID | Input / Precondition                                                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                       | Notes                                          |
| ------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| TC-305  | Initialize `GitKeizuView` and click `#branchCleanupBtn`                                                                 | Normal - panel creation and toggle wiring                                  | The `BranchCleanupPanel` constructor is called exactly once, and a button click calls `panel.toggle(currentRepo)` once                                                | One instance is created                        |
| TC-306  | Call `refresh("soft")` while `panel.isOpen()` is `true`                                                                 | Normal - refresh wiring while open                                         | `panel.refresh(currentRepo)` is called once, and the existing `loadBranches` / `loadCommits` requests are sent as before (existing payloads unchanged)                | Keeps the existing refresh contract            |
| TC-307  | Call `refresh("soft")` while `panel.isOpen()` is `false`                                                                | Boundary - refresh while closed                                            | The call count of `panel.refresh` is 0, and there are 0 `sendMessage` calls for `loadBranchCleanup`                                                                   | 0 additional messages while closed             |
| TC-308  | Switch from A to B in the repository dropdown                                                                           | Normal - repository switch wiring                                          | `panel.selectRepository("B")` is called once                                                                                                                          | Counterexample: repo switch                    |
| TC-309  | Repeat `refresh("soft")` on the same repository                                                                         | Normal - selectRepository not called for the same repository               | The call count of `panel.selectRepository` stays 0 (selection kept)                                                                                                   | Notified only on a real change                 |
| TC-310  | Call `showBranchInGraph("feature/x")`                                                                                   | Normal - 1-branch filter and hard refresh                                  | `selectedBranches` is replaced with `["feature/x"]`, the dropdown's selection state is synced, and the `loadCommits` request of the hard refresh is sent exactly once | The filter has 1 target                        |
| TC-311  | After `showBranchInGraph("feature/x")` finishes rendering, a `.gitRef.head` label (`dataset.name = "feature/x"`) exists | Normal - scroll by exact dataset match after rendering                     | Scanning all `.gitRef.head`, the hash of the commit row that owns the label with `dataset.name === "feature/x"` is passed to `scrollToCommit()`, called once          | Scanned after rendering                        |
| TC-312  | `showBranchInGraph("a;b")` with a label whose `dataset.name` is `a;b` (same for `x<img>`)                               | Type - no selector for special names                                       | The branch name is not concatenated into a `querySelector()` selector string; the label is found by exact dataset comparison and `scrollToCommit()` is called once    | Counterexample: special name                   |
| TC-313  | After rendering for `showBranchInGraph("feature/x")`, no label with a matching `dataset.name` exists                    | Validation - no matching label                                             | The call count of `scrollToCommit()` is 0 and no exception is thrown                                                                                                  | Safe side after the ref moves                  |
| TC-314  | The only label after rendering has `dataset.name = "feature/x-suffix"`                                                  | Boundary - prefix match excluded                                           | The call count of `scrollToCommit()` is 0 (no scroll on a partial or prefix match)                                                                                    | Exact match only                               |
| TC-315  | `("/repo", "feature/x", ["origin"])` is passed to the panel's delete callback                                           | Normal - delete dialog wiring                                              | The exported `showDeleteBranchDialog` is called once with exactly `("/repo", "feature/x", ["origin"])`                                                                | The dialog itself belongs to the refMenu owner |

### Failure-source inventory (include-or-justify) — added by Feature 055-03 (S49)

| Failure source                                                                     | Case or reason for exclusion                                                                         |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| A refresh while closed triggers a diagnostic message                               | TC-307                                                                                               |
| Missing or excess notification of a real repository change                         | TC-308, TC-309                                                                                       |
| Filter not replaced with 1 entry / existing requests broken                        | TC-306, TC-310                                                                                       |
| Branch name concatenated into a selector                                           | TC-312                                                                                               |
| Wrong scroll with no matching label or on a prefix match                           | TC-313, TC-314                                                                                       |
| Panel created multiple times / callback not injected                               | TC-305, TC-315                                                                                       |
| Scanning before rendering completes (scroll fails because labels do not exist yet) | TC-311 (verifies the hash is passed by scanning after rendering)                                     |
| Row validation and rendering inside the panel                                      | excluded(owned by `web/branchCleanupPanel-test.md` S2 to S4)                                         |
| Delegating the response                                                            | excluded(owned by `web/messageHandler-test/04-branch-cleanup-01.md` S17)                             |
| Dialog text, payload and defaults                                                  | excluded(owned by `web/refMenu-test/01-branch-actions-01.md` S21)                                    |
| Exception / error paths                                                            | excluded(the wiring methods have no throw branch; the safe side with no label is verified by TC-313) |
| External dependency x failure mode                                                 | excluded(only function calls inside the webview, with no external dependency)                        |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)                      | excluded(no numeric boundary; 0 matches is covered by TC-313 / TC-314 and 1 selection by TC-310)     |
| Invalid type / format                                                              | excluded(the type contract is owned by `src/types-test.md` S8)                                       |

**Failure-category coverage (diversity floor)**:

- Validation: TC-313
- Exception: excluded(no throw path)
- External: excluded(no external dependency)
- Boundary: TC-307, TC-314
- Type: TC-312
- Normal: TC-305, TC-306, TC-308 to TC-311, TC-315

**Failure/normal ratio (smoke detector)**: 7 normal cases (TC-305, TC-306, TC-308 to TC-311, TC-315), 4 failure cases (TC-307, TC-312 to TC-314). As a wiring section it is structured around normal cases (verifying that connections exist), and the inventory confirmed that the failure sources are limited to triggering while closed, selector concatenation and scroll on a mismatch.

## S87: Branch Cleanup Create Worktree callback wiring

> Origin: Feature 062-01 (PR #114 follow-up)
> Added: 2026-10-27
> Status: active
> Supersedes: -
> Signature: the `showCreateWorktreeDialog` action injected into `BranchCleanupPanel` by the `GitKeizuView` constructor
> Target Path: `web/main.ts` (panel actions passed to `new BranchCleanupPanel(...)`)
> Test File: `tests/web/main.test.ts`

The panel's Create Worktree button (`web/branchCleanupPanel-test.md` S8) calls this action, which must open the same dialog as the branch context menu (`web/refMenu-test/02-worktree-actions-01.md` S23 / S27). Fixture: S49's `capturedPanelActions` and the mocked export `showCreateWorktreeDialog` of `web/refMenu.ts` (`freshShowCreateWorktreeDialog`).

| Case ID | Input / Precondition                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                 | Notes                    |
| ------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------ |
| TC-788  | The injected action fires with `("/repo", "feature/x", <button>)` | Normal - callback forwarded unchanged                                      | The exported dialog runs once with exactly `("/repo", "feature/x", <button>)`, the same element | Same shape as S49 TC-315 |

### Failure-source inventory (include-or-justify) — S87

| Failure source                        | Case or reason for exclusion                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| Action not wired or arguments changed | TC-788                                                                              |
| Source element lost (dialog position) | TC-788 (the same element is passed through)                                         |
| Dialog contents                       | excluded (`web/refMenu-test/02-worktree-actions-01.md` S23 / S27)                   |
| Exception / External / Type           | excluded (the dialog is mocked; arguments are typed by `BranchCleanupPanelActions`) |

### Test mapping — S87

`tests/web/main.test.ts` describe `Branch cleanup panel wiring (S49)`: TC-788 `forwards the create-worktree callback to the exported dialog unchanged (TC-788)`.
