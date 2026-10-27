# Test Perspectives: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Generated: 2026-05-02T01:45:44Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: state-lifecycle

## S6: createOrShow() rootUri handling

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: superseded
> Supersedes: -
> Superseded By: S36

**Target path**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                  | Notes                  |
| ------- | ------------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------- |
| TC-015  | rootUri given, no panel yet                            | Normal - new panel                                                         | viewState.lastActiveRepo is set to rootUri.fsPath                | First launch           |
| TC-016  | rootUri given, panel exists, repository registered     | Normal - existing panel                                                    | ResponseSelectRepo is sent after panel.reveal()                  | Repository switch      |
| TC-017  | rootUri given, panel exists, repository not registered | Normal - unregistered                                                      | registerRepoFromUri() is called, then ResponseSelectRepo is sent | New registration flow  |
| TC-018  | No rootUri (run from the Command Palette)              | Normal - no rootUri                                                        | Previous behavior kept (no selectRepo message sent)              | Backward compatibility |

## S7: Passing keybinding and auto-load settings in viewState

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**Target path**: `src/gitGraphView.ts`

| Case ID | Input / Precondition     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                 | Notes                        |
| ------- | ------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------- |
| TC-019  | Call getHtmlForWebview() | Normal - standard                                                          | viewState contains the keybindings object       | Checks the settings pipeline |
| TC-020  | Call getHtmlForWebview() | Normal - standard                                                          | viewState contains loadMoreCommitsAutomatically | Checks the settings pipeline |

## S12: loadCommits passes the branches/authors arrays through

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**Target path**: `src/gitGraphView.ts:279-291`

| Case ID | Input / Precondition                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                      | Notes              |
| ------- | -------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------ |
| TC-037  | msg.branches=["main","dev"], msg.authors=["Alice"] | Normal - standard                                                          | getCommits is called with branches=["main","dev"], authors=["Alice"] | Array pass-through |
| TC-038  | msg.branches=[], msg.authors=[]                    | Boundary - empty arrays                                                    | getCommits is called with branches=[], authors=[] (shows everything) | Empty arrays       |

## S14: Passing commitOrdering in viewState / loadCommits handler

> Origin: Feature 015 (commit-sort-order) (aidd-spec-tasks-test)
> Added: 2026-03-10
> Status: active
> Supersedes: -

**Target path**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                         | Notes                        |
| ------- | ----------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------- |
| TC-044  | Call getHtmlForWebview()                              | Normal - standard                                                          | viewState contains commitOrdering, equal to the return value of Config.commitOrdering() | Checks the settings pipeline |
| TC-045  | loadCommits message with commitOrdering="topo"        | Normal - standard                                                          | commitOrdering="topo" is passed to dataSource.getCommits()                              | -                            |
| TC-046  | loadCommits message with commitOrdering="author-date" | Normal - standard                                                          | commitOrdering="author-date" is passed to dataSource.getCommits()                       | -                            |
| TC-047  | loadCommits message with commitOrdering="date"        | Normal - default                                                           | commitOrdering="date" is passed to dataSource.getCommits()                              | Checks the default behavior  |

## S17: Variable generation with the CSS_COLOR_VAR_PREFIX constant

> Origin: Feature 020 (legacy-branding-cleanup) (aidd-spec-tasks-test)
> Added: 2026-03-20
> Status: active
> Supersedes: -

**Signature**: `private getHtmlForWebview(uri: vscode.Uri): string`
**Target path**: `src/gitGraphView.ts:553-560`

| Case ID | Input / Precondition                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                             | Notes                                              |
| ------- | ---------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| TC-059  | Call getHtmlForWebview() with colors in graphColours | Normal - standard                                                          | The style attribute of the generated HTML contains variable definitions with the `--git-keizu-color` prefix | Checks the CSS constant rename                     |
| TC-060  | Call getHtmlForWebview() with colors in graphColours | Normal - standard                                                          | The data-color selectors of the generated HTML contain variable references `var(--git-keizu-color`          | Checks that the definition-reference chain matches |

## S18: loadBranches watcher start orchestration

> Origin: Feature 033 (watch-refresh-scope) Task 3
> Added: 2026-05-02T01:45:44Z
> Status: active
> Supersedes: -
> Signature: `loadBranches`
> Target Path: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                       | Notes                                       |
| ------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| TC-061  | Receive `loadBranches` for a new repo, `getBranches.error=false` | Normal - repo change                                                       | `dataSource.getRepositoryStateWatchPaths(repo)` is called once, and `repoFileWatcher.start(...)` is called once with the returned array. `extensionState.setLastActiveRepo(repo)` is also called once | Repo switch                                 |
| TC-062  | Receive `loadBranches` repeatedly for the same repo              | Boundary - same repo                                                       | `getBranches` runs again, but `getRepositoryStateWatchPaths` and `repoFileWatcher.start` are not called again                                                                                         | Avoids needless restarts                    |
| TC-063  | `getBranches.error=true`, `isGitRepository=false`, repo switched | External - branch load failure                                             | `isGitRepository(repo)` is called once, and while `isRepo` in the `loadBranches` response becomes `false`, `repoFileWatcher.start(...)` is called once with the resolved watch roots                  | The watcher starts even on the error branch |
| TC-064  | panel.visible changes `true -> false`                            | Normal - hidden panel stop                                                 | `repoFileWatcher.stop()` is called once after the view state handler runs                                                                                                                             | Keeps stopping while hidden                 |

## S21: try/finally in the message handler guarantees unmute

> Origin: フェーズ2 修正 M5 (message-handler-try-finally-unmute)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: the body of the `onDidReceiveMessage` handler (`mute()` → `try { switch(msg.command) } finally { unmute() }`)
> Target Path: `src/gitGraphView.ts:154-770`

A fix that wraps the `switch` in `try` after `this.repoFileWatcher.mute()` and calls `this.repoFileWatcher.unmute()` in `finally`. Previously unmute was called directly after the switch, so when the handler threw, unmute never ran and the watcher stayed muted. With finally, `repoFileWatcher.unmute()` is reliably called once on both the normal and the failure path. It is observed through the call count of `repoFileWatcher.unmute` (the internal `muteCount` transitions belong to S11 on the repoFileWatcher side).

| Case ID | Input / Precondition                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                | Notes                                            |
| ------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| TC-076  | The handler completes normally for a registered repo (e.g. `addTag` succeeds) | Normal - normal path unmutes                                               | Processing runs after `repoFileWatcher.mute()`, and `repoFileWatcher.unmute()` is called once in `finally`     | Unmute on the normal path                        |
| TC-077  | A DataSource method in the switch throws                                      | Exception - handler throws still unmutes                                   | Even when an exception occurs, `repoFileWatcher.unmute()` is called once in `finally` (it does not stay muted) | Core of the fix (unmute guaranteed on exception) |
| TC-078  | `sendMessage` throws during processing                                        | Exception - send throws still unmutes                                      | `repoFileWatcher.unmute()` is called once in `finally`                                                         | Unmute also when sending throws                  |
| TC-079  | An unregistered repo hits the early-return guard before mute                  | Boundary - early return before mute                                        | Neither `repoFileWatcher.mute()` nor `repoFileWatcher.unmute()` is called (returns outside try)                | Consistent with S17/TC-073 (no extra unmute)     |

## S23: createOrShow() persists lastActiveRepo before revealing an existing panel

> Origin: フェーズ2 修正 M6 (reveal-persist-last-active-repo)
> Added: 2026-07-04T02:44:58Z
> Status: superseded
> Supersedes: -
> Superseded By: S36
> Signature: `public static createOrShow(...)` (the reveal path when `currentPanel` exists and `rootUri !== undefined`)
> Target Path: `src/gitGraphView.ts:52-58`

A fix that adds `extensionState.setLastActiveRepo(getPathFromUri(rootUri))` before `panel.reveal()` on the path that reveals an existing panel, when `rootUri !== undefined`. Previously lastActiveRepo was persisted only on the new-panel path (S6/TC-015), so the target repo was not recorded when an existing panel was revealed.

| Case ID | Input / Precondition                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                            | Notes                                      |
| ------- | --------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------ |
| TC-086  | `currentPanel` exists, `rootUri` given              | Normal - existing panel persists repo                                      | `extensionState.setLastActiveRepo(getPathFromUri(rootUri))` is called once | Persisted when revealing an existing panel |
| TC-087  | `currentPanel` exists, `rootUri === undefined`      | Boundary - no rootUri                                                      | `setLastActiveRepo` is not called, and only `panel.reveal()` runs          | Not recorded without rootUri               |
| TC-088  | `currentPanel` exists, `rootUri` given (call order) | Normal - persist before reveal                                             | `setLastActiveRepo` is called before `panel.reveal()` (call order)         | Guarantees persisting before reveal        |

## S25: getHtmlForWebview() waits for avatar storage initialization

> Origin: フェーズ3 修正 L8 (avatar-storage-init-await)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: -
> Signature: `private async getHtmlForWebview(): Promise<string>`
> Target Path: `src/gitGraphView.ts:604-614`

A fix that adds `await this.extensionState.waitForAvatarStorage()` in `getHtmlForWebview` before building viewState. It guarantees that `viewState.fetchAvatars = config.fetchAvatars() && this.extensionState.isAvatarStorageAvailable()` is evaluated after avatar storage initialization (async fs.stat/mkdir) completes, preventing the bug of picking up the interim value `false` during the initialization race.

| Case ID | Input / Precondition                                                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                    | Notes                                         |
| ------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| TC-096  | Call `getHtmlForWebview()`                                                                                                 | Normal - awaits before viewState                                           | `extensionState.waitForAvatarStorage()` is awaited once before viewState is built (before `isAvatarStorageAvailable` is evaluated) | Guarantees the wait comes first               |
| TC-097  | `config.fetchAvatars()` is `true`, and `isAvatarStorageAvailable()` returns `true` after the await completes               | Normal - fetchAvatars enabled after init                                   | The generated `viewState.fetchAvatars` is `true`                                                                                   | Reflects the final value after initialization |
| TC-098  | `config.fetchAvatars()` is `true`, and `isAvatarStorageAvailable()` is still `false` after the await (storage unavailable) | Boundary - storage unavailable                                             | `viewState.fetchAvatars` is `false`                                                                                                | Storage unavailable                           |
| TC-099  | `config.fetchAvatars()` is `false`, `isAvatarStorageAvailable()` is `true`                                                 | Boundary - config disabled                                                 | `viewState.fetchAvatars` is `false` (under the AND condition the config side wins with false)                                      | Setting OFF                                   |

## S27: `<`-escaping serializer for JSON embedded in scripts

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: private serializer (replaces `<` in the `JSON.stringify` result with the serialized literal `\u003c`; finalized at implementation)
> Target Path: `src/gitGraphView.ts:667-668`

A fix that routes the 3 values embedded in `<script>` elements (`locale` / `webviewMessages` / `viewState`) through a shared safe serializer. It replaces `<` in the `JSON.stringify` output with the JavaScript Unicode escape `\u003c` (the TypeScript replacement string is `"\\u003c"`), so that the script element is not split even if a repo path or similar contains `</script>` (fix for [17]). The input values themselves are not changed, keeping them recoverable. CSP, nonce and external script URIs are unchanged.

| Case ID | Input / Precondition                                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                    | Notes                                             |
| ------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| TC-106  | Run `getHtmlForWebview()` with normal locale / webviewMessages / viewState containing no `<`               | Normal - equivalence for normal values                                     | `JSON.parse` of the embedded JSON string is deep-equal to the original value (the viewState path of the existing TC-019/020/039/044/097 to 099 is kept)                                            | Same output as `JSON.stringify` for normal values |
| TC-107  | Put `</script><script>alert(1)</script>` in the viewState repo path (the `repos` key and `lastActiveRepo`) | Boundary - prevents splitting the script element                           | The number of nonce-bearing `<script>` elements in the generated HTML equals the normal count, and the literal substring `</script>` does not appear in the embedded JSON (replaced with `\u003c`) | Prevents a malfunction involving HTML injection   |
| TC-108  | Serialize a string value containing `</script>` with the serializer and restore the output                 | Normal - round-trip equivalence                                            | The string from `JSON.parse` of the serializer output (with `\u003c` replaced) strictly equals the original input, and the input object itself is not changed by the replacement                   | Non-destructive and reversible                    |
| TC-109  | Also put `</script>` in the locale and webviewMessages values and run `getHtmlForWebview()`                | Boundary - applied to all 3 embeddings                                     | The literal `</script>` appears in none of the 3 embeddings `locale` / `webviewMessages` / `viewState` (not handled for only some embeddings)                                                      | Detects a missed embedding                        |

### Failure-source inventory (include-or-justify) — added for Feature 045 (S27)

| Failure source                                                                   | Covering case or reason for exclusion                                                                                           |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| A value containing `</script>` splits the script element                         | TC-107                                                                                                                          |
| Applied to only some embeddings (locale / messages missed)                       | TC-109                                                                                                                          |
| The replacement breaks values (not recoverable, destructive change to the input) | TC-108                                                                                                                          |
| Regression in serializing normal values                                          | TC-106                                                                                                                          |
| Wrongly replacing `<` with a plain HTML entity or similar                        | TC-108 (detected by round-trip equivalence through `JSON.parse`)                                                                |
| Reaching script execution                                                        | excluded(already prevented by the nonce in the CSP `script-src` and out of scope for this fix. A premise of the finalized spec) |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(the serializer accepts any JSON-serializable value and has no rejection branch)
- Exception: excluded(no throw branch is added to `JSON.stringify` / the string replacement. Circular values do not occur under the viewState construction contract)
- External: excluded(no external dependencies; HTML generation is pure string processing)
- Boundary: TC-107, TC-109
- Type: excluded(the types of the 3 embedded values are guaranteed at TypeScript compile time)

Numeric and empty-value boundaries (0 / minimum / maximum / +/-1 / empty / NULL) are out of scope, because this section targets a string-escaping contract and they have no meaning in the spec (the meaningful boundary is covered by TC-107/TC-109 with the `</script>` substring).

**Failure/normal ratio (smoke detector)**: 2 normal cases (TC-106, TC-108), 2 failure cases (TC-107, TC-109). Since the counts are equal, the inventory was re-derived, confirming that every failure source of this change is covered by a case or an exclusion reason as in the table above and that no failure case needs to be added (because this is an escaping contract, the failure cases are Boundary only).

## S36: createOrShow() waiting for rootUri registration, and the final state of panel creation / reveal / sibling registration

> Origin: Feature 057 (multi-repo-single-folder-workspace) issue #49
> Added: 2026-09-12
> Status: active
> Supersedes: S6, S23
> Signature: `public static async createOrShow(extensionPath: string, dataSource: DataSource, extensionState: ExtensionState, avatarManager: AvatarManager, repoManager: RepoManager, rootUri?: vscode.Uri): Promise<void>`
> Target Path: `src/gitGraphView.ts` (`createOrShow()`; currently lines 59-110, to be updated after the fix)
> Test File: `tests/src/gitGraphView.test.ts`

When `rootUri` is given, it proceeds in the order `setLastActiveRepo()` → `await registerRepoFromUri()` → the `currentPanel` check. Completion of the `Promise` covers panel creation or `reveal`, and does not include the finished HTML. A sibling registration during the initial HTML generation is allowed to regenerate the HTML, and after it is finished only `loadRepos` is sent. The decisions inside `registerRepoFromUri()` belong to the repoManager owner, resolving `rootUri` in the `git-keizu.view` handler to the extension owner, and the initial selection on the webview side to the `web/main.ts` owner; they are not part of this table. Constants: `SCM_REPO = "/scm/repo/path"`, `TEST_REPO = "/test/repo"`, `SIBLING_REPO = "/scm/sibling"`.

| Case ID | Input / Precondition                                                                                                                                                                                                                                                                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                                                      | Notes                                             |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| TC-376  | No `currentPanel`, `getRepos()` returns `{}`, `rootUri` (`fsPath: SCM_REPO`) given. `registerRepoFromUri` returns a manually resolved deferred, and on resolve switches the return of `getRepos()` to `{ [SCM_REPO]: { columnWidths: null } }`                                                              | Boundary - panel creation before and after registration completes          | Before resolve, `createWebviewPanel` is called 0 times; after resolving and completing `await createOrShow()`, once. After waiting with `vi.waitFor` until `webview.html` is non-empty, the HTML does not contain `unableToLoad` and contains `id="repoSelect"`. The embedded `viewState.repos` has the key `SCM_REPO`, and `viewState.lastActiveRepo` is `SCM_REPO` | No panel before registration                      |
| TC-377  | Same conditions as TC-376                                                                                                                                                                                                                                                                                   | Normal - registration argument                                             | `registerRepoFromUri` is called once with the same reference as `rootUri` (`toBe`)                                                                                                                                                                                                                                                                                   | -                                                 |
| TC-378  | Same conditions as TC-376                                                                                                                                                                                                                                                                                   | Normal - order of recording lastActiveRepo                                 | `setLastActiveRepo` is called once with `SCM_REPO`, and its `invocationCallOrder` is smaller than that of `registerRepoFromUri`                                                                                                                                                                                                                                      | Recorded before registration                      |
| TC-379  | No `currentPanel`, no `rootUri`                                                                                                                                                                                                                                                                             | Boundary - no rootUri (first call)                                         | `registerRepoFromUri` 0 times, `setLastActiveRepo` 0 times, `createWebviewPanel` once after `await createOrShow()`                                                                                                                                                                                                                                                   | Launched from the Command Palette                 |
| TC-380  | `currentPanel` exists (created without `rootUri`), called again without `rootUri`                                                                                                                                                                                                                           | Boundary - no rootUri (existing panel)                                     | `registerRepoFromUri` 0 times, `setLastActiveRepo` 0 times, `reveal` once, 0 `selectRepo` messages, 0 extra calls to `createWebviewPanel`                                                                                                                                                                                                                            | Equivalent to old S6 TC-018 and S23 TC-087        |
| TC-381  | `currentPanel` exists, `getRepos()` returns `{ [TEST_REPO], [SCM_REPO] }` (registered), `rootUri` given. `registerRepoFromUri` returns a deferred                                                                                                                                                           | Normal - existing panel waits for registration, reveal order               | `setLastActiveRepo` once with `SCM_REPO`. `registerRepoFromUri` once (called even when registered). Before resolve, `reveal` 0 times and 0 `selectRepo`. After resolve, `reveal` once and 1 `{ command: "selectRepo", repo: SCM_REPO }`. The `invocationCallOrder` of `setLastActiveRepo` is smaller than that of `reveal`                                           | Equivalent to old S6 TC-016 and S23 TC-086/TC-088 |
| TC-382  | `currentPanel` exists, `getRepos()` returns `{ [TEST_REPO] }` (not registered), `rootUri` given. On resolve, `registerRepoFromUri` switches `getRepos()` to `{ [TEST_REPO], [SCM_REPO] }`                                                                                                                   | Normal - first registration of an unregistered repository                  | `registerRepoFromUri` once in total (no second call from `selectRepoFromUri()`), and 1 `{ command: "selectRepo", repo: SCM_REPO }`                                                                                                                                                                                                                                   | Equivalent to old S6 TC-017                       |
| TC-383  | No `currentPanel`, `getRepos()` stays `{}` (not a repository), `rootUri` given. `registerRepoFromUri` resolves without changing `getRepos()`                                                                                                                                                                | Boundary - rootUri not registered (0 repos)                                | `createWebviewPanel` once. After `vi.waitFor`, the HTML contains `unableToLoad`                                                                                                                                                                                                                                                                                      | 0 registered                                      |
| TC-384  | No `currentPanel`, call `createOrShow` twice in a row with the same `rootUri`, returning independent deferreds d1 and d2. Resolve d1 → d2 (each resolve switches `getRepos()` to `{ [SCM_REPO] }`)                                                                                                          | Boundary - rapid calls (completing in call order)                          | After both `Promise`s complete, `registerRepoFromUri` twice, `createWebviewPanel` once, `reveal` once                                                                                                                                                                                                                                                                | No duplicate panel                                |
| TC-385  | Same conditions as TC-384, resolving d2 → d1                                                                                                                                                                                                                                                                | Boundary - rapid calls (completing in reverse order)                       | `registerRepoFromUri` twice, `createWebviewPanel` once, `reveal` once                                                                                                                                                                                                                                                                                                | Does not depend on completion order               |
| TC-386  | No `currentPanel`, `rootUri` given. `registerRepoFromUri` rejects with `Error("register failed")`                                                                                                                                                                                                           | External - registration rejects (first call)                               | `createOrShow()` rejects with `"register failed"` (`rejects.toThrow`), `createWebviewPanel` 0 times                                                                                                                                                                                                                                                                  | Not caught                                        |
| TC-387  | `currentPanel` exists, `rootUri` given. `registerRepoFromUri` rejects with `Error("register failed")`                                                                                                                                                                                                       | External - registration rejects (existing panel)                           | `createOrShow()` rejects with `"register failed"`, `reveal` 0 times, 0 `selectRepo`                                                                                                                                                                                                                                                                                  | Not caught                                        |
| TC-388  | No `currentPanel`, `getRepos()` returns `{ [TEST_REPO] }`, a non-repository `rootUri` (`SCM_REPO`) given. `registerRepoFromUri` resolves without changing `getRepos()`                                                                                                                                      | Boundary - non-repository rootUri with 1 existing registration             | The HTML contains `id="repoSelect"`, the keys of the embedded `viewState.repos` are only `[TEST_REPO]`, and `viewState.lastActiveRepo` is `SCM_REPO`                                                                                                                                                                                                                 | The unregistered path remains in lastActiveRepo   |
| TC-389  | Same conditions as TC-376, with `loadWebviewMessages` held by a deferred. After `registerRepoFromUri` resolves, call the callback captured from `registerViewCallback` with `({ [SCM_REPO], [SIBLING_REPO] }, 2)` (also switching `getRepos()` to 2 repos), then resolve the `loadWebviewMessages` deferred | Normal - sibling registration during HTML generation                       | `loadWebviewMessages` is called twice, the keys of the embedded `viewState.repos` in the final HTML awaited with `vi.waitFor` are `[SCM_REPO, SIBLING_REPO]` (compared after `sort`), and `postMessage` has 0 `loadRepos`                                                                                                                                            | HTML regeneration allowed                         |
| TC-390  | Same conditions as TC-376; after waiting until the HTML is finished (`webview.html` non-empty), call the captured callback with `({ [SCM_REPO], [SIBLING_REPO] }, 2)`                                                                                                                                       | Normal - sibling registration after the HTML is finished                   | `postMessage` has 1 `{ command: "loadRepos", repos: { [SCM_REPO], [SIBLING_REPO] }, lastActiveRepo: SCM_REPO }`, and the call count of `loadWebviewMessages` stays at 1                                                                                                                                                                                              | No HTML regeneration                              |

### Failure-source inventory (include-or-justify) — added for Feature 057 (S36)

| Failure source                                                                                                        | Covering case or reason for exclusion                                               |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Panel created before registration (judged a non-repository, showing the unable-to-load page)                          | TC-376                                                                              |
| Wrong registration argument (passing something other than `rootUri`)                                                  | TC-377                                                                              |
| Order of recording `lastActiveRepo` (recorded after registration)                                                     | TC-378                                                                              |
| Registration or recording runs without `rootUri`                                                                      | TC-379, TC-380                                                                      |
| Missing registration or wrong reveal order for an existing panel (reveal or selectRepo before registration completes) | TC-381, TC-382                                                                      |
| Non-repository `rootUri`                                                                                              | TC-383, TC-388                                                                      |
| Rapid calls (duplicate panel, dependence on completion order)                                                         | TC-384, TC-385                                                                      |
| Registration rejects (swallowed, panel creation continues)                                                            | TC-386, TC-387                                                                      |
| Sibling registration during and after generation (final HTML, missing `loadRepos`)                                    | TC-389, TC-390                                                                      |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)                                                         | 0 repos: TC-383, not given: TC-379, TC-380, 1 repo: TC-388, 2 calls: TC-384, TC-385 |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(`rootUri` is of type `Uri` and has no rejection branch)
- Exception: excluded(no throw or catch is added in `createOrShow()`. Rejection is handled under External)
- External: TC-386, TC-387
- Boundary: TC-376, TC-379, TC-380, TC-383, TC-384, TC-385, TC-388
- Type: excluded(types are guaranteed at compile time)
- Normal: TC-377, TC-378, TC-381, TC-382, TC-389, TC-390

**Failure/normal ratio (smoke detector)**: 6 normal cases (TC-377, TC-378, TC-381, TC-382, TC-389, TC-390), 9 failure cases (7 Boundary + 2 External). Confirmed that the table above covers the 4 groups of failure sources: waiting for registration, panel creation, reveal and sibling registration. No cases are added just to adjust the ratio.

## S37: createOrShow() applies successive calls with different rootUris in call order

> Origin: Feature 057 (multi-repo-single-folder-workspace) issue #49 PR #60 レビュー指摘
> Added: 2026-09-12
> Status: active
> Supersedes: -
> Signature: `public static createOrShow(extensionPath: string, dataSource: DataSource, extensionState: ExtensionState, avatarManager: AvatarManager, repoManager: RepoManager, rootUri?: vscode.Uri): Promise<void>`
> Target Path: `src/gitGraphView.ts` (`createOrShow()` and `open()`)
> Test File: `tests/src/gitGraphView.test.ts`

Waiting for registration (`registerRepoFromUri()`) runs concurrently per call, and only the subsequent panel creation / `reveal` / `selectRepo` (applying) is serialized in call order. Even if an earlier call's registration rejects, later applications are not stopped (the rejection has already propagated to the earlier call's caller). The rapid-call cases in S36 (TC-384 / TC-385) only look at counts for the same `rootUri`; this section fixes that, with different `rootUri`s, the last repository clicked is the one selected and recorded. Constants are the same as S36.

| Case ID | Input / Precondition                                                                                                                                                                                                                                                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                     | Notes                                          |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| TC-391  | No `currentPanel`, `getRepos()` returns `{}`. Call `createOrShow` with the `rootUri` of `SCM_REPO` and then with the `rootUri` of `SIBLING_REPO`, returning independent deferreds d1 and d2. Resolve d2 first (switching `getRepos()` to `{ [SIBLING_REPO] }`), then d1 (to `{ [SCM_REPO], [SIBLING_REPO] }`) | Boundary - completing in reverse order (different rootUris)                | After both `Promise`s complete, `registerRepoFromUri` twice, `createWebviewPanel` once, `reveal` once, exactly 1 `selectRepo` message, `{ command: "selectRepo", repo: SIBLING_REPO }`, and `getLastActiveRepo()` is `SIBLING_REPO` | The last repository clicked is selected        |
| TC-392  | Same conditions as TC-391, resolving d1 → d2 (d1 to `{ [SCM_REPO] }`, d2 to `{ [SCM_REPO], [SIBLING_REPO] }`)                                                                                                                                                                                                 | Normal - completing in call order (different rootUris)                     | Same as TC-391                                                                                                                                                                                                                      | Does not depend on completion order            |
| TC-393  | Same conditions as TC-391, rejecting d1 with `Error("register failed")` and resolving d2 (to `{ [SIBLING_REPO] }`)                                                                                                                                                                                            | External - the earlier call's registration rejects                         | The first `Promise` rejects with `"register failed"`. The second completes, with `createWebviewPanel` once, `reveal` 0 times, and `getLastActiveRepo()` is `SIBLING_REPO`                                                           | An earlier rejection does not stop later calls |

### Failure-source inventory (include-or-justify) — PR #60 review follow-up (S37)

| Failure source                                                                      | Covering case or reason for exclusion                                    |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Applying in completion order, so the repository clicked first ends up selected last | TC-391                                                                   |
| Serialization changes the result when calls complete in call order                  | TC-392                                                                   |
| An earlier call's rejection stops later applications                                | TC-393                                                                   |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)                       | 2 calls: TC-391, TC-392. 0 and 1 calls are owned by S36 TC-379 to TC-383 |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(`rootUri` is of type `Uri` and has no rejection branch)
- Exception: excluded(the added catch keeps an earlier call's rejection from spreading to later ones, and is checked by TC-393 under External)
- External: TC-393
- Boundary: TC-391
- Type: excluded(types are guaranteed at compile time)
- Normal: TC-392

**Failure/normal ratio (smoke detector)**: 1 normal case (TC-392), 2 failure cases (1 Boundary + 1 External). No cases are added just to adjust the ratio.

## S38: createOrShow() does not recreate a panel closed while waiting for registration

> Origin: Feature 057 (multi-repo-single-folder-workspace) issue #49 PR #60 レビュー指摘
> Added: 2026-09-12
> Status: active
> Supersedes: -
> Signature: `public static createOrShow(extensionPath: string, dataSource: DataSource, extensionState: ExtensionState, avatarManager: AvatarManager, repoManager: RepoManager, rootUri?: vscode.Uri): Promise<void>`
> Target Path: `src/gitGraphView.ts` (`open()`)
> Test File: `tests/src/gitGraphView.test.ts`

The `currentPanel` at call time is recorded as the target panel, and if that panel is closed while waiting for registration (`dispose()` makes `currentPanel` no longer match the target), the `Promise` completes without panel creation, `reveal` or `selectRepo`. A call that starts after the close has no target panel, so it creates a panel as usual. Constants are the same as S36.

| Case ID | Input / Precondition                                                                                                                                                                                                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                 | Notes                                    |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| TC-394  | `currentPanel` exists (`getRepos()` returns `{ [TEST_REPO] }`), `rootUri` of `SCM_REPO` given, `registerRepoFromUri` returns a deferred. Close with `currentPanel.dispose()` before resolve, then resolve (switching `getRepos()` to `{ [TEST_REPO], [SCM_REPO] }`) | Boundary - panel closed while waiting for registration                     | After the `Promise` completes, `currentPanel` stays `undefined`, `createWebviewPanel` 0 times, `reveal` 0 times, 0 `selectRepo` | Does not recreate a closed tab           |
| TC-395  | Same conditions as TC-394, making a second call with the `rootUri` of `SIBLING_REPO` right after the close (deferred d2). Resolve d1 → d2 (d2 to `{ [TEST_REPO], [SCM_REPO], [SIBLING_REPO] }`)                                                                     | Normal - calling again after the close                                     | `createWebviewPanel` once (from the second call), `reveal` 0 times, `getLastActiveRepo()` is `SIBLING_REPO`                     | A stopped call does not block later ones |

### Failure-source inventory (include-or-justify) — PR #60 review follow-up (S38)

| Failure source                                                                          | Covering case or reason for exclusion                                |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Recreating a panel closed while waiting for registration                                | TC-394                                                               |
| A stopped call blocks later panel creation, or an old call runs `reveal` on a new panel | TC-395                                                               |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)                           | The normal path that completes before a close is owned by S36 TC-381 |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(`rootUri` is of type `Uri` and has no rejection branch)
- Exception: excluded(no throw or catch is added in `open()`)
- External: excluded(registration rejection is owned by S36 TC-386 / TC-387 and S37 TC-393)
- Boundary: TC-394
- Type: excluded(types are guaranteed at compile time)
- Normal: TC-395

**Failure/normal ratio (smoke detector)**: 1 normal case (TC-395), 1 failure case (1 Boundary). No cases are added just to adjust the ratio.

## S39: createOrShow() keeps the apply-order chain intact across a registration rejection

> Origin: Feature 057 (multi-repo-single-folder-workspace) issue #49 PR #60 レビュー指摘
> Added: 2026-09-12
> Status: active
> Supersedes: -
> Signature: `public static createOrShow(extensionPath: string, dataSource: DataSource, extensionState: ExtensionState, avatarManager: AvatarManager, repoManager: RepoManager, rootUri?: vscode.Uri): Promise<void>`
> Target Path: `src/gitGraphView.ts` (`createOrShow()` and `settled()`)
> Test File: `tests/src/gitGraphView.test.ts`

The apply-order chain (`lastOpen`) advances "when the earlier call has settled and this call has settled". A call whose registration rejects does not itself wait for the earlier call to finish, so using that call directly as a link in the chain would let a later call overtake an even earlier one. S37 fixes the order of 2 successive calls; this section fixes the order of 3 calls with a registration rejection in between. Constants are the same as S36.

| Case ID | Input / Precondition                                                                                                                                                                                                                                                                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                | Notes             |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| TC-396  | No `currentPanel`, `getRepos()` returns `{}`. Call `createOrShow` in the order A (`SCM_REPO`) → B (`SCM_REPO`) → C (`SIBLING_REPO`), returning independent deferreds d1, d2 and d3. Reject d2 with `Error("register failed")`, resolve d3 (to `{ [SIBLING_REPO] }`), and finally resolve d1 (to `{ [SCM_REPO], [SIBLING_REPO] }`) | External - a middle call's registration rejects                            | B's `Promise` rejects with `"register failed"`. After A and C complete, `createWebviewPanel` once, `reveal` once, exactly 1 `selectRepo` message, `{ command: "selectRepo", repo: SIBLING_REPO }`, and `getLastActiveRepo()` is `SIBLING_REPO` | C is applied last |

### Failure-source inventory (include-or-justify) — PR #60 review follow-up (S39)

| Failure source                                                                              | Covering case or reason for exclusion                     |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Using a rejected call as a link in the chain lets a later call overtake an even earlier one | TC-396                                                    |
| An earlier rejection stops later calls                                                      | Owned by S37 TC-393                                       |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)                               | 2 calls are owned by S37 TC-391 / TC-392. 3 calls: TC-396 |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(`rootUri` is of type `Uri` and has no rejection branch)
- Exception: excluded(the catch in `settled()` keeps this call's rejection from spreading into the chain, and is checked by TC-396 under External)
- External: TC-396
- Boundary: excluded(the order of 3 calls is handled by TC-396 under External)
- Type: excluded(types are guaranteed at compile time)
- Normal: excluded(the normal order is owned by S37 TC-392)

**Failure/normal ratio (smoke detector)**: 0 normal cases, 1 failure case (1 External). The normal cases are owned by S37, so no cases are added to adjust the ratio.
