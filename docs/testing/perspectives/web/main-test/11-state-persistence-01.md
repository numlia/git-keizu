# Test Perspectives: web/main.ts

> Source: `web/main.ts`
> Generated: 2026-09-12T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: state-persistence

## S53: Saving worktrees in saveState() and suppressing redraw on soft refresh after restore

> Origin: Feature 056 (retain-context-when-hidden) issue #48
> Added: 2026-09-12
> Status: active
> Supersedes: -
> Signature: private `saveState(): void` / restoring `prevState` in the constructor (`loadCommits(..., prevState.worktrees)`) / the change check in `public loadCommits()`
> Target Path: `web/main.ts` (restoring `prevState` in the constructor, `saveState()`), `web/global.d.ts` (`WebViewState.worktrees?`)
> Test File: `tests/web/main.test.ts`

Perspectives for including the `worktrees` received in the `loadCommits` response in `vscode.setState` and passing them to `loadCommits` when the state is restored. When `this.worktrees` stayed empty right after restore, `worktreeCollectionsEqual` with the soft refresh response (which includes the main worktree) was false and caused a full redraw every time (confirmed by the Feature 056 measurements). `WebViewState.worktrees` is optional, and a state saved by an old build is restored as empty, as before. Whether a redraw happens is observed through the call count of `Graph.render`.

| Case ID | Input / Precondition                                                                                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                               | Notes                                              |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| TC-369  | After initializing with `prevState = null`, receive `loadBranches` and a `loadCommits` response with `worktrees`                                           | Normal - saving worktrees                                                  | The `worktrees` in the last `setState` argument equals the response's collection by `toEqual` | A collection with 1 main worktree                  |
| TC-370  | After initializing with a `prevState` that includes `worktrees` (1 restore render), receive a soft response with the same commits and the same `worktrees` | Normal - suppressing redraw after restore                                  | The `Graph.render` call count stays 1 (no redraw on the soft response)                        | The change check recognizes that `worktrees` match |
| TC-371  | After initializing with a `prevState` with `worktrees: undefined` (saved by an old build), receive a soft response that includes the main worktree         | Boundary - restore from an old state                                       | The `Graph.render` call count becomes 2 (redraws only once as before, and matches afterwards) | Backward compatible. Restored as empty             |

### Failure-source inventory (include-or-justify) — added by Feature 056 (S53)

| Failure source                                                                                  | Covering case or exclusion reason                                                                                                       |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `saveState()` drops `worktrees`                                                                 | TC-369                                                                                                                                  |
| The saved `worktrees` are not passed to `loadCommits` on restore                                | TC-370 (if not passed, it is compared with empty and the call count becomes 2)                                                          |
| Restoring an old state (missing `worktrees`) throws or is treated as something other than empty | TC-371                                                                                                                                  |
| The match check after restore misses differences other than worktrees                           | excluded(the comparison of commits / head / moreAvailable in `loadCommits` is covered by S24, S28 and the existing request-queue table) |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)                                   | empty: TC-371 (treated as an empty collection). NULL: excluded(`WebViewState.worktrees` is only `undefined` or a collection)            |
| External dependency x failure mode                                                              | excluded(`vscode.setState` / `getState` are mocks, and no failure path is added)                                                        |
| Exception / error paths                                                                         | excluded(restore and save have no throw branch)                                                                                         |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(type validation of the state is handled by the backward-compatible migration in the existing S24)
- Exception: excluded(as in the table above)
- External: excluded(as in the table above)
- Boundary: TC-371
- Type: excluded(as in the table above)
- Normal: TC-369, TC-370

**Failure/normal ratio (smoke detector)**: 2 normal cases, 1 failure case. It was confirmed that the table above covers the failure sources on the 3 paths of save, restore and backward compatibility. No cases are added just to adjust the ratio.
