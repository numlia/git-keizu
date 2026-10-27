# Test Perspectives: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Generated: 2026-09-12T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: retain-context

## S35: Passing the retainContextWhenHidden setting to the panel option and branching on re-show

> Origin: Feature 056 (retain-context-when-hidden) issue #48
> Added: 2026-09-12
> Status: active
> Supersedes: -
> Signature: the `createWebviewPanel` option in `public static createOrShow()` / the visible branch of the `onDidChangeViewState` handler
> Target Path: `src/gitGraphView.ts` (`createOrShow()` and the view-state handler in the constructor)
> Test File: `tests/src/gitGraphView.test.ts`

Covers reading `getConfig().retainContextWhenHidden()` once when the panel is created and using the same value for both the `retainContextWhenHidden` option of `createWebviewPanel` and the branch on re-show. When retention is on, re-showing only sends `{ command: "refresh" }` to the webview and does not regenerate the HTML; when it is off, `update()` regenerates the HTML as before. However, a retained webview keeps the `viewState` from creation time (setting values and the repo set), so a re-show after the `git-keizu` settings changed, or after the repo count crossed the boundary with 0, falls back to `update()`; when only the repo set changed while hidden, `loadRepos` is sent before `refresh` (addresses Codex review P1 / P2). The handling on hide (resetting `currentRepo` and stopping the watcher) belongs to S18 / TC-064 and is not part of this table.

| Case ID | Input / Precondition                                                                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                            | Notes                                                      |
| ------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| TC-364  | Call `createOrShow()` with the setting `true`                                                                                     | Normal - passing the option (enabled)                                      | `createWebviewPanel` is called once with an option containing `retainContextWhenHidden: true`                                                                                              | Default value                                              |
| TC-365  | Call `createOrShow()` with the setting `false`                                                                                    | Normal - passing the option (disabled)                                     | `createWebviewPanel` is called with an option containing `retainContextWhenHidden: false`                                                                                                  | Choosing the previous behavior                             |
| TC-366  | With the setting `true`, create the panel, let the initial HTML load, then call the handler with `visible=false` → `visible=true` | Normal - re-show with retention                                            | `postMessage` is called exactly once with `{ command: "refresh" }`, and the call count of `loadWebviewMessages` stays at 1 from the initial creation (no HTML regeneration)                | Re-show does only a soft refresh                           |
| TC-367  | Do the same transition with the setting `false`                                                                                   | Normal - re-show without retention                                         | Wait until the call count of `loadWebviewMessages` reaches 2 (HTML regenerated); `postMessage` is not called in the meantime                                                               | Does not send `refresh`                                    |
| TC-372  | With the setting `true`, fire `onDidChangeConfiguration` for the `git-keizu` section while hidden, then re-show                   | Normal - re-show after a settings change                                   | Wait until the call count of `loadWebviewMessages` reaches 2 (HTML regenerated); `postMessage` is not called                                                                               | Setting values can only be read when the HTML is generated |
| TC-373  | With the setting `true`, fire a settings change for the `editor` section only while hidden, then re-show                          | Validation - ignoring unrelated sections                                   | `postMessage` is called exactly once with `{ command: "refresh" }`, and `loadWebviewMessages` stays at 1                                                                                   | Narrowed by `affectsConfiguration("git-keizu")`            |
| TC-374  | With the setting `true`, fire the repo callback with 2 repos while hidden (no `postMessage` at that point), then re-show          | Normal - repos discovered while hidden                                     | `postMessage` is called twice, in this order: first `{ command: "loadRepos", repos: <現在の集合>, lastActiveRepo: null }`, then `{ command: "refresh" }`; `loadWebviewMessages` stays at 1 | Order is fixed                                             |
| TC-375  | With the setting `true`, the repo count drops to 0 while hidden and the callback fires with `({}, 0)`, then re-show               | Boundary - transition to 0 repos                                           | Wait until the call count of `loadWebviewMessages` reaches 2 (HTML regenerated); `postMessage` is not called                                                                               | The graph page cannot represent 0 repos                    |

### Failure-source inventory (include-or-justify) — added for Feature 056 (S35)

| Failure source                                                                          | Covering case or reason for exclusion                                                                                                         |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| The setting value is not passed to the panel option                                     | TC-364, TC-365                                                                                                                                |
| Regenerating the HTML while retention is on, defeating retention                        | TC-366                                                                                                                                        |
| Sending only `refresh` while retention is off, which never reaches the disposed webview | TC-367                                                                                                                                        |
| `refresh` is sent twice on re-show                                                      | TC-366 (call count 1)                                                                                                                         |
| `git-keizu` settings changed while retained keep their old values after re-show         | TC-372                                                                                                                                        |
| An unrelated settings change triggers an unneeded HTML regeneration                     | TC-373                                                                                                                                        |
| Repos discovered while hidden do not appear in the dropdown                             | TC-374                                                                                                                                        |
| The graph page keeps being used after the transition to 0 repos                         | TC-375                                                                                                                                        |
| The `retainContextWhenHidden` option itself changes after creation                      | excluded(by design, the value at creation is fixed as a constructor argument; a changed option takes effect the next time a panel is created) |
| Missing watcher stop or `currentRepo` reset on hide                                     | excluded(already covered by S18 TC-064)                                                                                                       |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)                           | 0: TC-375 (0 repos). Others are excluded(the setting input is boolean only, and both `true` / `false` are covered by TC-364 to TC-367)        |
| External dependency × failure mode                                                      | excluded(a `createWebviewPanel` failure is on the VS Code API side, and this change adds no exception path)                                   |
| Exception / error paths                                                                 | excluded(the branch adds no throw)                                                                                                            |

**Failure-category coverage (diversity floor)**:

- Validation: TC-373
- Exception: excluded(see the table above)
- External: excluded(see the table above)
- Boundary: TC-375
- Type: excluded(the boolean default-value contract is in `src/config-test/05-feature-056-retain-context-01.md` S20)
- Normal: TC-364 to TC-367, TC-372, TC-374

**Failure/normal ratio (smoke detector)**: 6 normal cases, 2 failure cases. The inputs that can go stale while retained come from two sources, the setting values and the repo set, and the table above was confirmed to cover "fall back to regeneration", "send the difference" and "ignore" for each. No cases are added just to adjust the ratio.
