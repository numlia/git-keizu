# Test Perspectives: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Generated: 2026-09-12T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: state-lifecycle

## S40: createOrShow() stops a waiting call when the panel created by an earlier call is closed

> Origin: Feature 057 (multi-repo-single-folder-workspace) issue #49 PR #60 レビュー指摘
> Added: 2026-09-12
> Status: active
> Supersedes: -
> Signature: `public static createOrShow(extensionPath: string, dataSource: DataSource, extensionState: ExtensionState, avatarManager: AvatarManager, repoManager: RepoManager, rootUri?: vscode.Uri): Promise<void>`
> Target Path: `src/gitGraphView.ts` (`open()` and `dispose()`)
> Test File: `tests/src/gitGraphView.test.ts`

S38 (`02-state-lifecycle-01.md`) only detected the closing of a panel that existed at call time. This section fixes the following: a counter that advances on every panel close (`panelCloseCount`, incremented in `dispose()`) is recorded at call time, and if it has advanced while waiting, the `Promise` completes without creating a panel, calling `reveal` or calling `selectRepo`. This also covers the case where no panel existed at call time and the user closed the panel created by an earlier call. Constants are the same as in S36.

| Case ID | Input / Precondition                                                                                                                                                                                                                                                                                                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type)  | Expected Result                                                                                                                                                                                                                   | Notes                          |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| TC-397  | No `currentPanel`, `getRepos()` returns `{}`. Call `createOrShow` with the `rootUri` of `SCM_REPO` and then the `rootUri` of `SIBLING_REPO`, returning independent deferreds d1 and d2. Resolve d1 (to `{ [SCM_REPO] }`) and wait for the first `Promise` to complete, close it with `currentPanel.dispose()`, then resolve d2 (to `{ [SCM_REPO], [SIBLING_REPO] }`) | Boundary - completion after the panel created by the earlier call is closed | `createWebviewPanel` is called once when the first call completes. After the second call completes, `createWebviewPanel` is still called once, `currentPanel` is `undefined`, `reveal` is called 0 times and `selectRepo` 0 times | Does not recreate a closed tab |

### Failure-source inventory (include-or-justify) — PR #60 review fixes (S40)

| Failure source                                                       | Covering case or reason for exclusion                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| A waiting call made when no panel existed recreates the closed panel | TC-397                                                                    |
| Closing a panel that existed at call time                            | Owned by S38 TC-394 / TC-395                                              |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)        | Zero closes (normal completion) is owned by S36 TC-376. One close: TC-397 |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(`rootUri` is of type `Uri` and has no rejection branch)
- Exception: excluded(no throw or catch is added in `open()`)
- External: excluded(registration rejects are owned by S36 / S37 / S39)
- Boundary: TC-397
- Type: excluded(types are guaranteed at compile time)
- Normal: excluded(normal completion without a close is owned by S36 / S37)

**Failure/normal ratio (smoke detector)**: 0 normal cases, 1 failure case (1 Boundary). Normal cases are owned by existing sections, so no cases are added just to balance the ratio.
