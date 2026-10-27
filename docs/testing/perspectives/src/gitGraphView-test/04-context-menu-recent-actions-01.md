# Test Perspectives: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Generated: 2026-05-02T14:08:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: context-menu-recent-actions

## S19: Passing viewState showRecentActions to the webview

> Origin: Feature 034 (context-menu-recent-actions) Task 1
> Added: 2026-05-02
> Status: active
> Supersedes: -
> Signature: `private getHtmlForWebview()`
> Target Path: `src/gitGraphView.ts`

| Case ID | Input / Precondition       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                        | Notes                          |
| ------- | -------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| TC-065  | Call `getHtmlForWebview()` | Normal - standard                                                          | `viewState.showRecentActions` in the generated HTML matches `true`, the value returned by `Config.showRecentActions()` | Verifies the settings pipeline |

## S20: notifyShowRecentActionsChanged() runtime sync

> Origin: Feature 039 (show-recent-actions-runtime-sync) (light-spec-plan)
> Added: 2026-05-10
> Status: active
> Supersedes: -
> Signature: `public notifyShowRecentActionsChanged()`
> Target Path: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                              | Notes                                               |
| ------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| TC-066  | Create `GitKeizuView` while `getConfig().showRecentActions()` returns `true`, then call `notifyShowRecentActionsChanged()` | Normal - standard                                                          | `panel.webview.postMessage` is called once with `{ command: "setShowRecentActions", showRecentActions: true }`. No `update()`, no reassignment of `panel.webview.html`, and no `refresh`-type messages occur | Runtime sync path (no HTML regeneration)            |
| TC-067  | Call `notifyShowRecentActionsChanged()` while `getConfig().showRecentActions()` returns `false`                            | Boundary - false setting                                                   | `panel.webview.postMessage` is called once with `{ command: "setShowRecentActions", showRecentActions: false }`                                                                                              | Switching to hidden is synced through the same path |
