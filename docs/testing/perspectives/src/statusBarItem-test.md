# Test Perspectives: src/statusBarItem.ts

> Source: `src/statusBarItem.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest 4.x

## S1: constructor

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `constructor(context: vscode.ExtensionContext)`
**Target path**: `src/statusBarItem.ts:9-15`

| Case ID | Input / Precondition                                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                           | Notes   |
| ------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| TC-001  | `createStatusBarItem` returns a mock `StatusBarItem`, and `context.subscriptions.push` is available | Normal - standard                                                          | `vscode.window.createStatusBarItem` is called once with `(vscode.StatusBarAlignment.Left, 1)`. The returned item has `text` set to `"Git Keizu"`, `tooltip` to `"View Git Keizu"` and `command` to `"git-keizu.view"`, and `context.subscriptions.push` is called once with the same item | L10-L14 |
| TC-002  | `vscode.window.createStatusBarItem` throws `Error("create failed")`                                 | External - vscode.window.createStatusBarItem failure                       | The constructor call throws the same `Error("create failed")`. `context.subscriptions.push` is not called                                                                                                                                                                                 | L10     |
| TC-003  | `createStatusBarItem` succeeds, and `context.subscriptions.push` throws `Error("push failed")`      | External - ExtensionContext.subscriptions failure                          | The constructor call throws the same `Error("push failed")`. `text` / `tooltip` / `command` have already been set, and the error is not swallowed                                                                                                                                         | L11-L14 |

## S2: setNumRepos

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `public setNumRepos(numRepos: number)`
**Target path**: `src/statusBarItem.ts:17-20`

| Case ID | Input / Precondition                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                   | Notes                                 |
| ------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| TC-004  | `numRepos = 3`, `refresh` watched with `vi.spyOn(instance, "refresh")` | Normal - standard                                                          | The internal state `numRepos` is updated to `3`, and `refresh()` is called once without arguments                                 | L18-L19                               |
| TC-005  | `numRepos = 0`, `refresh` watched                                      | Boundary - zero                                                            | The internal state `numRepos` is updated to `0`, and `refresh()` is called once                                                   | L18-L19. Threshold of the `> 0` check |
| TC-006  | `numRepos = -1`, `refresh` watched                                     | Boundary - min-1                                                           | The internal state `numRepos` is updated to `-1`, and `refresh()` is called once. No extra validation is done for negative values | L18-L19                               |

## S3: refresh

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `public refresh()`
**Target path**: `src/statusBarItem.ts:22-28`

| Case ID | Input / Precondition                                                                                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                         | Notes                                             |
| ------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| TC-007  | `getConfig().showStatusBarItem()` returns `true`, internal `numRepos = 1`                                                       | Normal - branch                                                            | `statusBarItem.show()` is called once and `statusBarItem.hide()` is not called                                                                          | L23-L24. Smallest boundary value on the show side |
| TC-008  | `getConfig().showStatusBarItem()` returns `true`, internal `numRepos = 0`                                                       | Boundary - zero                                                            | `statusBarItem.hide()` is called once and `statusBarItem.show()` is not called                                                                          | L23-L26. Exactly at the threshold                 |
| TC-009  | `getConfig().showStatusBarItem()` returns `false`, internal `numRepos = 5`                                                      | Normal - config disabled                                                   | `statusBarItem.hide()` is called once and `statusBarItem.show()` is not called. The setting takes precedence even when the repository count is positive | L23-L26                                           |
| TC-010  | `getConfig().showStatusBarItem()` returns `true`, internal `numRepos = -1`                                                      | Boundary - min-1                                                           | `statusBarItem.hide()` is called once and `statusBarItem.show()` is not called. A negative value does not satisfy `numRepos > 0`                        | L23-L26                                           |
| TC-011  | `getConfig().showStatusBarItem()` throws `Error("config failed")`                                                               | External - config read failure                                             | `refresh()` throws the same `Error("config failed")`. Neither `statusBarItem.show()` nor `hide()` is called                                             | L23                                               |
| TC-012  | `getConfig().showStatusBarItem()` is `true`, internal `numRepos = 2`, and `statusBarItem.show()` throws `Error("show failed")`  | External - vscode.StatusBarItem.show failure                               | `refresh()` throws the same `Error("show failed")`. `statusBarItem.hide()` is not called                                                                | L24                                               |
| TC-013  | `getConfig().showStatusBarItem()` is `false`, internal `numRepos = 2`, and `statusBarItem.hide()` throws `Error("hide failed")` | External - vscode.StatusBarItem.hide failure                               | `refresh()` throws the same `Error("hide failed")`. The branch goes to the false side and then the exception propagates                                 | L25-L26                                           |
