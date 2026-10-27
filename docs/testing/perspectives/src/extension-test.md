# Test Perspectives: src/extension.ts

> Source: `src/extension.ts`
> Generated: 2026-03-22T15:15:20Z
> Language: TypeScript
> Test Framework: Vitest 4.x

## S1: activate initialisation and dependency registration

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `activate(context: vscode.ExtensionContext)`
**Target path**: `src/extension.ts:11-64`

| Case ID | Input / Precondition                                                                                                                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Notes   |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| TC-001  | The `vscode` API, `ExtensionState`, `DataSource`, `AvatarManager`, `StatusBarItem`, `RepoManager` and `DiffDocProvider` are all mocked, and `context.subscriptions.push` is available | Normal - standard                                                          | `createOutputChannel("Git Keizu")`, each dependency's constructor, `registerCommand("git-keizu.view", ...)`, `registerCommand("git-keizu.clearAvatarCache", ...)`, `registerTextDocumentContentProvider(DiffDocProvider.scheme, provider)` and `onDidChangeConfiguration(...)` are each called once. `context.subscriptions.push(...)` registers `outputChannel`, the 2 command disposables, the content provider disposable, the config listener disposable and `repoManager` together in one call, and finally `outputChannel.appendLine("Extension activated successfully")` is called | L12-L63 |
| TC-002  | `vscode.window.createOutputChannel` throws `Error("output failed")`                                                                                                                   | External - vscode.window.createOutputChannel failure                       | `activate(context)` throws the same `Error("output failed")`, and dependency initialisation and registration from `ExtensionState` on are not called                                                                                                                                                                                                                                                                                                                                                                                                                                      | L12     |
| TC-003  | `new RepoManager(...)` throws `Error("repo init failed")`                                                                                                                             | External - RepoManager constructor failure                                 | `AvatarManager` and `StatusBarItem` are created, but `context.subscriptions.push(...)` and `outputChannel.appendLine(...)` are not called, and `activate(context)` throws the same `Error("repo init failed")`                                                                                                                                                                                                                                                                                                                                                                            | L15-L17 |
| TC-004  | All initialisation succeeds but `context.subscriptions.push` throws `Error("push failed")`                                                                                            | External - ExtensionContext.subscriptions.push failure                     | `activate(context)` throws the same `Error("push failed")`, and the success log is not written. Dependency instances created before registration remain as they are                                                                                                                                                                                                                                                                                                                                                                                                                       | L19-L61 |
| TC-005  | Registration succeeds but `outputChannel.appendLine` throws `Error("log failed")`                                                                                                     | External - OutputChannel.appendLine failure                                | `activate(context)` throws the same `Error("log failed")`. Dependency registration is already complete, and the exception is not swallowed                                                                                                                                                                                                                                                                                                                                                                                                                                                | L63     |

## S2: activate rootUri resolution of the git-keizu.view command

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `(arg?: unknown) => Promise<void>`
**Target path**: `src/extension.ts:21-41`

| Case ID | Input / Precondition                                                                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                 | Notes            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| TC-006  | Capture the `handler` of `registerCommand("git-keizu.view", handler)` during `activate` and pass `vscode.Uri.file("/repo")` as `arg` | Normal - branch                                                            | `GitKeizuView.createOrShow(context.extensionPath, dataSource, extensionState, avatarManager, repoManager, uri)` is called once, and the same `Uri` instance is passed as the `rootUri` argument | L25-L26, L33-L40 |
| TC-007  | Pass `{ rootUri: vscode.Uri.file("/repo") }` to the captured `handler`                                                               | Normal - branch                                                            | It passes both the object shape guard and `candidate instanceof vscode.Uri`, and the `Uri` of the `rootUri` property is passed as the 6th argument of `createOrShow(...)`                       | L27-L30, L33-L40 |
| TC-008  | Pass `{ rootUri: "not-a-uri" }`, `{ rootUri: null }`, `{ rootUri: {} }` in turn to the captured `handler`                            | Boundary - invalid rootUri shape                                           | Even though `"rootUri" in arg` holds, `candidate instanceof vscode.Uri` is false, so the 6th argument of `createOrShow(...)` is `undefined` in each call                                        | L27-L32          |
| TC-009  | Pass `undefined`, `null`, `"repo"`, `0`, `false` in turn to the captured `handler`                                                   | Boundary - nullish or primitive arg                                        | Neither `arg instanceof vscode.Uri` nor the object shape guard passes, so the 6th argument of `createOrShow(...)` is `undefined` in each call                                                   | L25-L32          |
| TC-010  | Make `GitKeizuView.createOrShow` throw `Error("show failed")` and call `handler(vscode.Uri.file("/repo"))`                           | External - GitKeizuView.createOrShow failure                               | The command handler throws the same `Error("show failed")`. `activate` adds no try/catch                                                                                                        | L33-L40          |

## S3: activate git-keizu.clearAvatarCache command

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `() => void`
**Target path**: `src/extension.ts:42-44`

| Case ID | Input / Precondition                                                                                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                        | Notes   |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| TC-011  | Capture the `handler` of `registerCommand("git-keizu.clearAvatarCache", handler)` during `activate` and spy on `avatarManager.clearCache` | Normal - standard                                                          | Calling `handler()` calls `avatarManager.clearCache()` exactly once. The return value is not used, and there are no other side effects | L42-L44 |
| TC-012  | `avatarManager.clearCache` throws `Error("clear failed")` synchronously                                                                   | External - AvatarManager.clearCache failure                                | `handler()` throws the same `Error("clear failed")`. The command handler does not swallow the exception                                | L43     |

## S4: activate routing of configuration change events

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: superseded
> Superseded By: S7
> Supersedes: -

**Signature**: `(e: vscode.ConfigurationChangeEvent) => void`
**Target path**: `src/extension.ts:49-59`

| Case ID | Input / Precondition                                                                                                                                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                       | Notes   |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| TC-013  | Capture the `handler` of `onDidChangeConfiguration(handler)` during `activate` and pass an event where only `e.affectsConfiguration("git-keizu.showStatusBarItem")` returns `true` | Normal - branch                                                            | `statusBarItem.refresh()` is called once, and `dataSource.generateGitCommandFormats()`, `repoManager.maxDepthOfRepoSearchChanged()` and `dataSource.registerGitPath()` are not called | L50-L51 |
| TC-014  | Only the first branch is `false`, and only `e.affectsConfiguration("git-keizu.dateType")` returns `true`                                                                           | Normal - branch                                                            | `dataSource.generateGitCommandFormats()` is called once, and the other 3 handlers are not called                                                                                      | L52-L53 |
| TC-015  | The first 2 branches are `false`, and only `e.affectsConfiguration("git-keizu.maxDepthOfRepoSearch")` returns `true`                                                               | Normal - branch                                                            | `repoManager.maxDepthOfRepoSearchChanged()` is called once, and the other 3 handlers are not called                                                                                   | L54-L55 |
| TC-016  | The first 3 branches are `false`, and only `e.affectsConfiguration("git.path")` returns `true`                                                                                     | Normal - branch                                                            | `dataSource.registerGitPath()` is called once, and the other 3 handlers are not called                                                                                                | L56-L57 |
| TC-017  | `e.affectsConfiguration(...)` returns `false` for all 4 watched keys                                                                                                               | Normal - no-op                                                             | None of the 4 handlers is called, and the listener ends with no side effects                                                                                                          | L50-L57 |
| TC-018  | Both `e.affectsConfiguration("git-keizu.showStatusBarItem")` and `e.affectsConfiguration("git-keizu.dateType")` return `true`                                                      | Boundary - overlapping configuration matches                               | Because of the `else if` chain, only `statusBarItem.refresh()` is called and `dataSource.generateGitCommandFormats()` is not. Priority is fixed to the first condition                | L50-L53 |
| TC-019  | `e.affectsConfiguration("git-keizu.showStatusBarItem")` is `true` and `statusBarItem.refresh` throws `Error("refresh failed")`                                                     | External - configuration handler failure                                   | The configuration change listener throws the same `Error("refresh failed")`, and the following `else if` branches are not evaluated                                                   | L50-L51 |

## S6: activate notification of showRecentActions setting changes

> Origin: Feature 039 (show-recent-actions-runtime-sync) (light-spec-plan)
> Added: 2026-05-10
> Status: active
> Supersedes: -

**Signature**: `(e: vscode.ConfigurationChangeEvent) => void`
**Target path**: `src/extension.ts:60-62`

| Case ID | Input / Precondition                                                                                                                                                                                                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                 | Notes   |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| TC-021  | Capture the `handler` of `onDidChangeConfiguration(handler)` during `activate`, replace `GitKeizuView.currentPanel` with a mock panel, and pass an event where only `e.affectsConfiguration("git-keizu.menu.showRecentActions")` returns `true` | Normal - branch                                                            | `GitKeizuView.currentPanel.notifyShowRecentActionsChanged()` is called once. `statusBarItem.refresh()`, `dataSource.generateGitCommandFormats()`, `repoManager.maxDepthOfRepoSearchChanged()` and `dataSource.registerGitPath()` are not called | L60-L62 |
| TC-022  | Both `e.affectsConfiguration("git-keizu.showStatusBarItem")` and `e.affectsConfiguration("git-keizu.menu.showRecentActions")` return `true`, and `GitKeizuView.currentPanel` is replaced with a mock panel                                      | Boundary - overlapping configuration matches                               | Following the priority of the `else if` chain, `statusBarItem.refresh()` is called once, and the separate `if` after it also calls `notifyShowRecentActionsChanged()` once                                                                      | L50-L62 |
| TC-023  | With `GitKeizuView.currentPanel` set to `undefined`, pass an event where only `e.affectsConfiguration("git-keizu.menu.showRecentActions")` returns `true`                                                                                       | Boundary - panel not opened                                                | The `notifyShowRecentActionsChanged()` call short-circuits on `?.`, with no exception and no side effects                                                                                                                                       | L60-L62 |

## S5: deactivate no-op exit

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `deactivate()`
**Target path**: `src/extension.ts:66-66`

| Case ID | Input / Precondition                                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                         | Notes |
| ------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| TC-020  | Call `deactivate()` one or more times, either before or after `activate` | Normal - standard                                                          | `deactivate()` returns `undefined` and makes no further calls to the VS Code API or imported dependencies. Calling it several times throws no exception | L66   |

## S7: activate routing of configuration change events (split into independent ifs)

> Origin: フェーズ3 修正 L6 (config-change-independent-if)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: S4
> Signature: `(e: vscode.ConfigurationChangeEvent) => void`
> Target Path: `src/extension.ts:49-59`

A fix that splits the configuration change handlers for `showStatusBarItem` / `dateType` / `maxDepthOfRepoSearch` / `git.path` from an `else if` chain into a sequence of independent `if` statements. When several setting keys satisfy `affectsConfiguration` in the same change event, the old `else if` chain ran only the first matching handler; with independent `if`s, every matching handler runs. This replaces the `else if` exclusivity assumption of S4 (TC-018).

| Case ID | Input / Precondition                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                       | Notes                        |
| ------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| TC-024  | Only `e.affectsConfiguration("git-keizu.showStatusBarItem")` is `true`                     | Normal - single key statusBar                                              | `statusBarItem.refresh()` is called once, and the other 3 handlers are not called                                                                                     | L50-51                       |
| TC-025  | Only `e.affectsConfiguration("git-keizu.dateType")` is `true`                              | Normal - single key dateType                                               | `dataSource.generateGitCommandFormats()` is called once, and the other 3 handlers are not called                                                                      | L52-53                       |
| TC-026  | Only `e.affectsConfiguration("git-keizu.maxDepthOfRepoSearch")` is `true`                  | Normal - single key maxDepth                                               | `repoManager.maxDepthOfRepoSearchChanged()` is called once, and the other 3 handlers are not called                                                                   | L54-55                       |
| TC-027  | Only `e.affectsConfiguration("git.path")` is `true`                                        | Normal - single key gitPath                                                | `dataSource.registerGitPath()` is called once, and the other 3 handlers are not called                                                                                | L56-57                       |
| TC-028  | `affectsConfiguration` is `false` for all 4 watched keys                                   | Boundary - no matching key                                                 | None of the 4 handlers is called, and it ends with no side effects                                                                                                    | L50-57                       |
| TC-029  | Both `showStatusBarItem` and `dateType` are `true`                                         | Boundary - overlapping configuration matches                               | With independent `if`s, `statusBarItem.refresh()` and `dataSource.generateGitCommandFormats()` are **both** called once each (the old `else if` called only refresh)  | L50-53. Core behaviour of L6 |
| TC-030  | All 4 watched keys are `true`                                                              | Boundary - all keys match                                                  | All 4 handlers `refresh()` / `generateGitCommandFormats()` / `maxDepthOfRepoSearchChanged()` / `registerGitPath()` are called once each                               | L50-57                       |
| TC-031  | `showStatusBarItem` is `true` and `statusBarItem.refresh` throws `Error("refresh failed")` | Exception - handler failure propagates                                     | The listener throws the same `Error("refresh failed")`, and the following independent `if`s (`dateType` and so on) are not evaluated because the exception propagates | L50-51                       |

## S8: activate() made async and waits for the first git path resolution

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: `export async function activate(context: vscode.ExtensionContext): Promise<void>`
> Target Path: `src/extension.ts:10-61` (current implementation location; update after the fix)

A fix that makes `activate()` async and awaits the first `dataSource.registerGitPath()` to resolve before building dependent managers such as `AvatarManager` / `RepoManager`. It guarantees that `RepoManager` does not start Git commands before the resolver finishes (the activation boundary of [1]). The re-resolution call on a `git.path` setting change (TC-027) keeps the existing S7 perspective.

| Case ID | Input / Precondition                                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                       | Notes                                        |
| ------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| TC-032  | Await `activate(context)` with `dataSource.registerGitPath` mocked to return a Promise that resolves | Normal - dependencies built after resolution                               | The constructors of `RepoManager` / `AvatarManager` are called after `registerGitPath()` resolves (call order check), and the Promise returned by `activate` resolves | Awaits the first resolution                  |
| TC-033  | Call `activate(context)` with `dataSource.registerGitPath` returning a pending (unresolved) Promise  | Boundary - dependencies not built before resolution                        | Even after flushing microtasks, the `RepoManager` constructor is called 0 times (no manager that starts Git commands is built before the resolver finishes)           | Checks blocking while waiting for resolution |

## S9: DiffDocProvider / AvatarManager registered in subscriptions

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: provider creation and registration inside `activate()`
> Target Path: `src/extension.ts:45-48` (current provider registration location; update after the fix)

Keeps the `DiffDocProvider` instance in a variable and registers both the provider itself and the unregister Disposable returned by `registerTextDocumentContentProvider` in `context.subscriptions`. `AvatarManager` is also registered in subscriptions (the extension side of [12][13]). The dispose branches inside each manager belong to their owners (`src/diffDocProvider-test.md` / `src/avatarManager-test.md`).

| Case ID | Input / Precondition                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                      | Notes                                                    |
| ------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| TC-034  | `context.subscriptions` after `activate(context)` completes                   | Normal - the provider itself is registered                                 | subscriptions contains the created `DiffDocProvider` instance itself (strict match on the same reference)                            | Registering only the unregister Disposable is not enough |
| TC-035  | Same as above                                                                 | Normal - the unregister Disposable is registered                           | The Disposable returned by `registerTextDocumentContentProvider` is in subscriptions as an element separate from the provider itself | Both registered                                          |
| TC-036  | Same as above                                                                 | Normal - AvatarManager is registered                                       | subscriptions contains the `AvatarManager` instance (strict match on the same reference)                                             | -                                                        |
| TC-037  | After `activate` completes, run `dispose()` on every element of subscriptions | Normal - dispose propagates                                                | `DiffDocProvider.dispose()` and `AvatarManager.dispose()` are each called once                                                       | Release equivalent to deactivate                         |

### Failure-source inventory (include-or-justify) — added by Feature 045 (S8 to S9)

| Failure source                                                 | Covering cases or reason for exclusion                                                                          |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Activation does not wait for git path resolution (array crash) | TC-032, TC-033                                                                                                  |
| Git commands start before the resolver finishes                | TC-033                                                                                                          |
| The provider itself is not registered (subscription leak)      | TC-034, TC-037                                                                                                  |
| The unregister Disposable is not registered                    | TC-035                                                                                                          |
| AvatarManager is not registered (timer leak)                   | TC-036, TC-037                                                                                                  |
| Dependency initialisation fails during activation              | excluded(the existing S1 TC-002 to TC-005 already cover the External failure paths. This change adds no branch) |
| The resolver rejects                                           | excluded(the resolver's contract is to return the final fallback `git` and never reject. gitExecutable owner)   |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(S8 to S9 cover the initialisation order and the registration contract, and there is no input validation branch)
- Exception: excluded(no new throw branch. Existing exception propagation is covered by S1 TC-002 to TC-005)
- External: excluded(vscode API failures are covered by the existing External cases of S1. This change adds no failure mode)
- Boundary: TC-033
- Type: excluded(the types of registered elements are guaranteed by TypeScript at compile time, and there is no runtime type branch)

Numeric and empty boundaries (0 / minimum / maximum / +/-1 / empty / NULL) are out of scope because this section covers the contract of the initialisation order and the subscriptions makeup, where they have no meaning in the spec (the meaningful boundary, "before resolution", is covered by TC-033).

**Failure/normal ratio (smoke detector)**: 5 normal cases (TC-032, TC-034 to TC-037), 1 failure case (TC-033). The ratio of 0.2 is low, so the inventory was derived again. The failure sources of this change (missing await, missing registration, dispose not propagated) are all regressions detected by "checking that the normal contract exists", and the only independent failure branch is "before resolution" (TC-033). It was confirmed that the 4 existing External cases of S1 cover activation failures.

## S10: activate git-keizu.view command returns a Promise and propagates rejection

> Origin: Feature 057 (multi-repo-single-folder-workspace) issue #49
> Added: 2026-09-12
> Status: active
> Supersedes: -
> Signature: `(arg?: unknown) => Promise<void>` (the `git-keizu.view` handler)
> Target Path: `src/extension.ts:24-44` (update after the fix)
> Test File: `tests/src/extension.test.ts`

The handler does `return GitKeizuView.createOrShow(...)` and adds no try/catch. Both a synchronous throw and a rejection propagate unchanged to the VS Code command execution. S2 TC-010 (propagation of a synchronous throw) still holds after the `return`, so it is kept. Waiting for registration inside `createOrShow()` belongs to the gitGraphView owner and is not in this table.

| Case ID | Input / Precondition                                                                                                                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                           | Notes                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------- |
| TC-038  | With the `createOrShow` mock returning a specific instance `expectedPromise` of `Promise.resolve(undefined)`, call the captured `handler` with `vscode.Uri.file("/repo")` | Normal - returns the Promise                                               | The return value of `handler(...)` is identical to `expectedPromise` with `toBe`          | The caller can wait for completion |
| TC-039  | With the `createOrShow` mock returning `Promise.reject(new Error("show failed"))`, call `handler(vscode.Uri.file("/repo"))`                                               | External - rejection propagates                                            | `await expect(handler(...)).rejects.toThrow("show failed")`. `activate` adds no try/catch | Not swallowed                      |

### Failure-source inventory (include-or-justify) — added by Feature 057 (S10)

| Failure source                             | Covering cases or reason for exclusion |
| ------------------------------------------ | -------------------------------------- |
| Missing return value (forgetting `return`) | TC-038                                 |
| Swallowed rejection (try/catch added)      | TC-039                                 |
| Synchronous throw                          | S2 TC-010 (kept)                       |
| `rootUri` resolution                       | S2 TC-006 to TC-009 (kept)             |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(argument resolution is owned by S2)
- Exception: excluded(propagation of a synchronous throw is covered by S2 TC-010)
- External: TC-039
- Boundary: excluded(argument resolution is owned by S2)
- Type: excluded(argument resolution is owned by S2)
- Normal: TC-038

**Failure/normal ratio (smoke detector)**: 1 normal case (TC-038), 1 failure case (TC-039). This change only adds the return value contract of the handler, and it was confirmed that the table above covers the failure sources.

## S11: Configuration change for `worktreePathTemplate`

> Origin: Feature 062-01 (PR #114 follow-up)
> Added: 2026-10-27
> Status: active
> Supersedes: -
> Signature: the `onDidChangeConfiguration` handler registered by `activate()`
> Target Path: `src/extension.ts` (the `git-keizu.worktreePathTemplate` branch of the configuration change handler)
> Test File: `tests/src/extension.test.ts`

Extends the routing of S4. A change to `git-keizu.worktreePathTemplate` reaches only the open panel's `notifyWorktreePathChanged()` (`src/gitGraphView-test/03-worktree-actions-01.md` S44); it must not touch the status bar item or Recent actions. Fixture: S4's captured handler and `createConfigurationChangeEvent`, with `GitKeizuView.currentPanel` replaced by a mock that has `notifyWorktreePathChanged`.

| Case ID | Input / Precondition                                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                          | Notes                                    |
| ------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| TC-040  | `affectsConfiguration` is `true` only for `git-keizu.worktreePathTemplate`, panel open | Normal - routed to the panel only                                          | `notifyWorktreePathChanged` is called once; `notifyShowRecentActionsChanged` and the status bar `refresh` are not called | No-panel case shares S4 TC-023's pattern |

### Failure-source inventory (include-or-justify) — S11

| Failure source                                 | Case or reason for exclusion                                                                             |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Setting change not forwarded                   | TC-040                                                                                                   |
| Unrelated refresh (status bar, Recent actions) | TC-040                                                                                                   |
| No panel open                                  | not covered for this key (the same optional-chaining call is fixed for `showRecentActions` by S4 TC-023) |
| Exception / External / Type                    | excluded (the handler only calls into the panel)                                                         |

### Test mapping — S11

`tests/src/extension.test.ts`: TC-040 `TC-040: notifies the open panel when worktreePathTemplate changes`, next to S4's TC-021 to TC-023.
