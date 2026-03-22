# テスト観点表: src/statusBarItem.ts

> Source: `src/statusBarItem.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest 4.x

## S1: constructor

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `constructor(context: vscode.ExtensionContext)`
**テスト対象パス**: `src/statusBarItem.ts:9-15`

| Case ID | Input / Precondition                                                                              | Perspective (Equivalence / Boundary)                 | Expected Result                                                                                                                                                                                                                                                             | Notes   |
| ------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| TC-001  | `createStatusBarItem` がモック `StatusBarItem` を返し、`context.subscriptions.push` が利用可能    | Equivalence - normal                                 | `vscode.window.createStatusBarItem` が `(vscode.StatusBarAlignment.Left, 1)` で 1 回呼ばれる。返却された項目の `text` が `"Git Keizu"`、`tooltip` が `"View Git Keizu"`、`command` が `"git-keizu.view"` に設定され、`context.subscriptions.push` が同じ項目で 1 回呼ばれる | L10-L14 |
| TC-002  | `vscode.window.createStatusBarItem` が `Error("create failed")` を送出する                        | External - vscode.window.createStatusBarItem failure | コンストラクタ呼び出しが同じ `Error("create failed")` を送出する。`context.subscriptions.push` は呼ばれない                                                                                                                                                                 | L10     |
| TC-003  | `createStatusBarItem` は成功し、`context.subscriptions.push` が `Error("push failed")` を送出する | External - ExtensionContext.subscriptions failure    | コンストラクタ呼び出しが同じ `Error("push failed")` を送出する。`text` / `tooltip` / `command` の設定は実行済みで、エラーは握りつぶされない                                                                                                                                 | L11-L14 |

## S2: setNumRepos

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public setNumRepos(numRepos: number)`
**テスト対象パス**: `src/statusBarItem.ts:17-20`

| Case ID | Input / Precondition                                                | Perspective (Equivalence / Boundary) | Expected Result                                                                                                 | Notes                     |
| ------- | ------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------- |
| TC-004  | `numRepos = 3`、`refresh` を `vi.spyOn(instance, "refresh")` で監視 | Equivalence - normal                 | 内部状態 `numRepos` が `3` に更新され、`refresh()` が引数なしで 1 回呼ばれる                                    | L18-L19                   |
| TC-005  | `numRepos = 0`、`refresh` を監視                                    | Boundary - zero                      | 内部状態 `numRepos` が `0` に更新され、`refresh()` が 1 回呼ばれる                                              | L18-L19。`> 0` 判定の閾値 |
| TC-006  | `numRepos = -1`、`refresh` を監視                                   | Boundary - min-1                     | 内部状態 `numRepos` が `-1` に更新され、`refresh()` が 1 回呼ばれる。負値に対する追加バリデーションは行われない | L18-L19                   |

## S3: refresh

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public refresh()`
**テスト対象パス**: `src/statusBarItem.ts:22-28`

| Case ID | Input / Precondition                                                                                                           | Perspective (Equivalence / Boundary)         | Expected Result                                                                                                   | Notes                       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------- |
| TC-007  | `getConfig().showStatusBarItem()` が `true` を返し、内部 `numRepos = 1`                                                        | Equivalence - normal (branch)                | `statusBarItem.show()` が 1 回呼ばれ、`statusBarItem.hide()` は呼ばれない                                         | L23-L24。最小の表示側境界値 |
| TC-008  | `getConfig().showStatusBarItem()` が `true` を返し、内部 `numRepos = 0`                                                        | Boundary - zero                              | `statusBarItem.hide()` が 1 回呼ばれ、`statusBarItem.show()` は呼ばれない                                         | L23-L26。閾値ちょうど       |
| TC-009  | `getConfig().showStatusBarItem()` が `false` を返し、内部 `numRepos = 5`                                                       | Equivalence - normal (config disabled)       | `statusBarItem.hide()` が 1 回呼ばれ、`statusBarItem.show()` は呼ばれない。リポジトリ数が正でも設定値が優先される | L23-L26                     |
| TC-010  | `getConfig().showStatusBarItem()` が `true` を返し、内部 `numRepos = -1`                                                       | Boundary - min-1                             | `statusBarItem.hide()` が 1 回呼ばれ、`statusBarItem.show()` は呼ばれない。負値は `numRepos > 0` を満たさない     | L23-L26                     |
| TC-011  | `getConfig().showStatusBarItem()` が `Error("config failed")` を送出する                                                       | External - config read failure               | `refresh()` が同じ `Error("config failed")` を送出する。`statusBarItem.show()` / `hide()` はどちらも呼ばれない    | L23                         |
| TC-012  | `getConfig().showStatusBarItem()` が `true`、内部 `numRepos = 2`、`statusBarItem.show()` が `Error("show failed")` を送出する  | External - vscode.StatusBarItem.show failure | `refresh()` が同じ `Error("show failed")` を送出する。`statusBarItem.hide()` は呼ばれない                         | L24                         |
| TC-013  | `getConfig().showStatusBarItem()` が `false`、内部 `numRepos = 2`、`statusBarItem.hide()` が `Error("hide failed")` を送出する | External - vscode.StatusBarItem.hide failure | `refresh()` が同じ `Error("hide failed")` を送出する。分岐は false 側へ進んだうえで例外が伝播する                 | L25-L26                     |
