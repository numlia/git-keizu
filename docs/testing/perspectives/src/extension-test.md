# テスト観点表: src/extension.ts

> Source: `src/extension.ts`
> Generated: 2026-03-22T15:15:20Z
> Language: TypeScript
> Test Framework: Vitest 4.x

## S1: activate 初期化と依存登録

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `activate(context: vscode.ExtensionContext)`
**テスト対象パス**: `src/extension.ts:11-64`

| Case ID | Input / Precondition                                                                                                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Notes   |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| TC-001  | `vscode` API、`ExtensionState`、`DataSource`、`AvatarManager`、`StatusBarItem`、`RepoManager`、`DiffDocProvider` をすべてモックし、`context.subscriptions.push` が利用可能 | Normal - standard                                                          | `createOutputChannel("Git Keizu")`、各依存のコンストラクタ、`registerCommand("git-keizu.view", ...)`、`registerCommand("git-keizu.clearAvatarCache", ...)`、`registerTextDocumentContentProvider(DiffDocProvider.scheme, provider)`、`onDidChangeConfiguration(...)` が 1 回ずつ呼ばれる。`context.subscriptions.push(...)` は `outputChannel`、2 つのコマンド disposable、content provider disposable、config listener disposable、`repoManager` をまとめて 1 回登録し、最後に `outputChannel.appendLine("Extension activated successfully")` が呼ばれる | L12-L63 |
| TC-002  | `vscode.window.createOutputChannel` が `Error("output failed")` を送出する                                                                                                 | External - vscode.window.createOutputChannel failure                       | `activate(context)` が同じ `Error("output failed")` を送出し、`ExtensionState` 以降の依存初期化・登録処理は呼ばれない                                                                                                                                                                                                                                                                                                                                                                                                                                     | L12     |
| TC-003  | `new RepoManager(...)` が `Error("repo init failed")` を送出する                                                                                                           | External - RepoManager constructor failure                                 | `AvatarManager` と `StatusBarItem` までは生成されるが、`context.subscriptions.push(...)` と `outputChannel.appendLine(...)` は呼ばれず、`activate(context)` が同じ `Error("repo init failed")` を送出する                                                                                                                                                                                                                                                                                                                                                 | L15-L17 |
| TC-004  | すべての初期化は成功するが `context.subscriptions.push` が `Error("push failed")` を送出する                                                                               | External - ExtensionContext.subscriptions.push failure                     | `activate(context)` が同じ `Error("push failed")` を送出し、成功ログは出力されない。登録前に生成済みの依存インスタンスはそのまま残る                                                                                                                                                                                                                                                                                                                                                                                                                      | L19-L61 |
| TC-005  | 登録処理は成功するが `outputChannel.appendLine` が `Error("log failed")` を送出する                                                                                        | External - OutputChannel.appendLine failure                                | `activate(context)` が同じ `Error("log failed")` を送出する。依存登録は完了済みで、例外は握りつぶされない                                                                                                                                                                                                                                                                                                                                                                                                                                                 | L63     |

## S2: activate git-keizu.view コマンドの rootUri 解決

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `(arg?: unknown) => void`
**テスト対象パス**: `src/extension.ts:21-41`

| Case ID | Input / Precondition                                                                                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                  | Notes            |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| TC-006  | `activate` 実行時に `registerCommand("git-keizu.view", handler)` の `handler` を捕捉し、`arg` に `vscode.Uri.file("/repo")` を渡す | Normal - branch                                                            | `GitKeizuView.createOrShow(context.extensionPath, dataSource, extensionState, avatarManager, repoManager, uri)` が 1 回呼ばれ、`rootUri` 引数に同じ `Uri` インスタンスが渡される | L25-L26, L33-L40 |
| TC-007  | 捕捉した `handler` に `{ rootUri: vscode.Uri.file("/repo") }` を渡す                                                               | Normal - branch                                                            | object shape guard と `candidate instanceof vscode.Uri` の両方を通過し、`createOrShow(...)` の第 6 引数に `rootUri` プロパティの `Uri` が渡される                                | L27-L30, L33-L40 |
| TC-008  | 捕捉した `handler` に `{ rootUri: "not-a-uri" }`、`{ rootUri: null }`、`{ rootUri: {} }` を順に渡す                                | Boundary - invalid rootUri shape                                           | `"rootUri" in arg` は成立しても `candidate instanceof vscode.Uri` が偽のため、各呼び出しで `createOrShow(...)` の第 6 引数は `undefined` になる                                  | L27-L32          |
| TC-009  | 捕捉した `handler` に `undefined`、`null`、`"repo"`、`0`、`false` を順に渡す                                                       | Boundary - nullish or primitive arg                                        | `arg instanceof vscode.Uri` と object shape guard のどちらも通らず、各呼び出しで `createOrShow(...)` の第 6 引数は `undefined` になる                                            | L25-L32          |
| TC-010  | `GitKeizuView.createOrShow` が `Error("show failed")` を送出するようにして、`handler(vscode.Uri.file("/repo"))` を呼ぶ             | External - GitKeizuView.createOrShow failure                               | コマンドハンドラが同じ `Error("show failed")` を送出する。`activate` 側で追加の try/catch は行われない                                                                           | L33-L40          |

## S3: activate git-keizu.clearAvatarCache コマンド

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `() => void`
**テスト対象パス**: `src/extension.ts:42-44`

| Case ID | Input / Precondition                                                                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                 | Notes   |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------- |
| TC-011  | `activate` 実行時に `registerCommand("git-keizu.clearAvatarCache", handler)` の `handler` を捕捉し、`avatarManager.clearCache` を spy する | Normal - standard                                                          | `handler()` 呼び出しで `avatarManager.clearCache()` が 1 回だけ呼ばれる。戻り値は利用されず、追加の副作用はない | L42-L44 |
| TC-012  | `avatarManager.clearCache` が `Error("clear failed")` を同期送出する                                                                       | External - AvatarManager.clearCache failure                                | `handler()` が同じ `Error("clear failed")` を送出する。コマンドハンドラは例外を握りつぶさない                   | L43     |

## S4: activate 設定変更イベントのルーティング

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `(e: vscode.ConfigurationChangeEvent) => void`
**テスト対象パス**: `src/extension.ts:49-59`

| Case ID | Input / Precondition                                                                                                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                             | Notes   |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| TC-013  | `activate` 実行時に `onDidChangeConfiguration(handler)` の `handler` を捕捉し、`e.affectsConfiguration("git-keizu.showStatusBarItem")` のみ `true` を返すイベントを渡す | Normal - branch                                                            | `statusBarItem.refresh()` が 1 回呼ばれ、`dataSource.generateGitCommandFormats()`、`repoManager.maxDepthOfRepoSearchChanged()`、`dataSource.registerGitPath()` は呼ばれない | L50-L51 |
| TC-014  | 先頭分岐だけ `false`、`e.affectsConfiguration("git-keizu.dateType")` のみ `true` を返す                                                                                 | Normal - branch                                                            | `dataSource.generateGitCommandFormats()` が 1 回呼ばれ、他の 3 ハンドラは呼ばれない                                                                                         | L52-L53 |
| TC-015  | 先頭 2 分岐を `false`、`e.affectsConfiguration("git-keizu.maxDepthOfRepoSearch")` のみ `true` を返す                                                                    | Normal - branch                                                            | `repoManager.maxDepthOfRepoSearchChanged()` が 1 回呼ばれ、他の 3 ハンドラは呼ばれない                                                                                      | L54-L55 |
| TC-016  | 先頭 3 分岐を `false`、`e.affectsConfiguration("git.path")` のみ `true` を返す                                                                                          | Normal - branch                                                            | `dataSource.registerGitPath()` が 1 回呼ばれ、他の 3 ハンドラは呼ばれない                                                                                                   | L56-L57 |
| TC-017  | 監視対象 4 キーすべてに対して `e.affectsConfiguration(...)` が `false` を返す                                                                                           | Normal - no-op                                                             | 4 つのハンドラはいずれも呼ばれず、リスナーは副作用なしで終了する                                                                                                            | L50-L57 |
| TC-018  | `e.affectsConfiguration("git-keizu.showStatusBarItem")` と `e.affectsConfiguration("git-keizu.dateType")` の両方が `true` を返す                                        | Boundary - overlapping configuration matches                               | `else if` 連鎖のため `statusBarItem.refresh()` だけが呼ばれ、`dataSource.generateGitCommandFormats()` は呼ばれない。優先順位が先頭条件に固定される                          | L50-L53 |
| TC-019  | `e.affectsConfiguration("git-keizu.showStatusBarItem")` が `true` で、`statusBarItem.refresh` が `Error("refresh failed")` を送出する                                   | External - configuration handler failure                                   | 設定変更リスナーが同じ `Error("refresh failed")` を送出し、後続の `else if` 分岐は評価されない                                                                              | L50-L51 |

## S5: deactivate no-op 終了

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `deactivate()`
**テスト対象パス**: `src/extension.ts:66-66`

| Case ID | Input / Precondition                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                    | Notes |
| ------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----- |
| TC-020  | `activate` 実行前後のどちらでも `deactivate()` を 1 回以上呼ぶ | Normal - standard                                                          | `deactivate()` は `undefined` を返し、VS Code API や import 済み依存に対する追加呼び出しを行わない。複数回呼んでも例外は発生しない | L66   |
