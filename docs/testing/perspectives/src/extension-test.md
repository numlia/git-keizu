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
> Status: superseded
> Superseded By: S7
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

## S6: activate showRecentActions 設定変更通知

> Origin: Feature 039 (show-recent-actions-runtime-sync) (light-spec-plan)
> Added: 2026-05-10
> Status: active
> Supersedes: -

**シグネチャ**: `(e: vscode.ConfigurationChangeEvent) => void`
**テスト対象パス**: `src/extension.ts:60-62`

| Case ID | Input / Precondition                                                                                                                                                                                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                             | Notes   |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| TC-021  | `activate` 実行時に `onDidChangeConfiguration(handler)` の `handler` を捕捉し、`GitKeizuView.currentPanel` をモック panel に差し替えた上で、`e.affectsConfiguration("git-keizu.menu.showRecentActions")` のみ `true` を返すイベントを渡す | Normal - branch                                                            | `GitKeizuView.currentPanel.notifyShowRecentActionsChanged()` が 1 回呼ばれる。`statusBarItem.refresh()`、`dataSource.generateGitCommandFormats()`、`repoManager.maxDepthOfRepoSearchChanged()`、`dataSource.registerGitPath()` は呼ばれない | L60-L62 |
| TC-022  | `e.affectsConfiguration("git-keizu.showStatusBarItem")` と `e.affectsConfiguration("git-keizu.menu.showRecentActions")` の両方が `true` を返し、`GitKeizuView.currentPanel` がモック panel に差し替えられている                           | Boundary - overlapping configuration matches                               | `else if` 連鎖の優先順位通り `statusBarItem.refresh()` が 1 回呼ばれ、その後段の独立 `if` で `notifyShowRecentActionsChanged()` も 1 回呼ばれる                                                                                             | L50-L62 |
| TC-023  | `GitKeizuView.currentPanel` が `undefined` の状態で `e.affectsConfiguration("git-keizu.menu.showRecentActions")` のみ `true` を返すイベントを渡す                                                                                         | Boundary - panel not opened                                                | `notifyShowRecentActionsChanged()` 呼び出しは `?.` でショートサーキットされ、例外は発生せず副作用もない                                                                                                                                     | L60-L62 |

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

## S7: activate 設定変更イベントのルーティング（独立 if 分解）

> Origin: フェーズ3 修正 L6 (config-change-independent-if)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: S4
> Signature: `(e: vscode.ConfigurationChangeEvent) => void`
> Target Path: `src/extension.ts:49-59`

`showStatusBarItem` / `dateType` / `maxDepthOfRepoSearch` / `git.path` の設定変更ハンドラを `else if` 連鎖から独立した `if` 文の並びへ分解する修正。複数の設定キーが同一の変更イベントで同時に `affectsConfiguration` を満たす場合に、旧 `else if` 連鎖では先頭一致のハンドラのみ実行されていたが、独立 `if` により該当する全ハンドラが実行される。S4 の `else if` 排他前提（TC-018）を置き換える。

| Case ID | Input / Precondition                                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                    | Notes                 |
| ------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| TC-024  | `e.affectsConfiguration("git-keizu.showStatusBarItem")` のみ `true`                          | Normal - single key statusBar                                              | `statusBarItem.refresh()` が1回呼ばれ、他3ハンドラは呼ばれない                                                                                     | L50-51                |
| TC-025  | `e.affectsConfiguration("git-keizu.dateType")` のみ `true`                                   | Normal - single key dateType                                               | `dataSource.generateGitCommandFormats()` が1回呼ばれ、他3ハンドラは呼ばれない                                                                      | L52-53                |
| TC-026  | `e.affectsConfiguration("git-keizu.maxDepthOfRepoSearch")` のみ `true`                       | Normal - single key maxDepth                                               | `repoManager.maxDepthOfRepoSearchChanged()` が1回呼ばれ、他3ハンドラは呼ばれない                                                                   | L54-55                |
| TC-027  | `e.affectsConfiguration("git.path")` のみ `true`                                             | Normal - single key gitPath                                                | `dataSource.registerGitPath()` が1回呼ばれ、他3ハンドラは呼ばれない                                                                                | L56-57                |
| TC-028  | 監視対象4キーすべてに対し `affectsConfiguration` が `false`                                  | Boundary - no matching key                                                 | 4ハンドラいずれも呼ばれず、副作用なしで終了する                                                                                                    | L50-57                |
| TC-029  | `showStatusBarItem` と `dateType` の両方が `true`                                            | Boundary - overlapping configuration matches                               | 独立 `if` により `statusBarItem.refresh()` と `dataSource.generateGitCommandFormats()` が**両方**1回ずつ呼ばれる（旧 `else if` では refresh のみ） | L50-53。L6 の中核挙動 |
| TC-030  | 監視対象4キーすべてが `true`                                                                 | Boundary - all keys match                                                  | `refresh()` / `generateGitCommandFormats()` / `maxDepthOfRepoSearchChanged()` / `registerGitPath()` の4ハンドラすべてが1回ずつ呼ばれる             | L50-57                |
| TC-031  | `showStatusBarItem` が `true` で `statusBarItem.refresh` が `Error("refresh failed")` を送出 | Exception - handler failure propagates                                     | リスナが同じ `Error("refresh failed")` を送出し、後続の独立 `if`（`dateType` 等）は例外伝播により評価されない                                      | L50-51                |

## S8: activate() 非同期化と初回 git path 解決の待機

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: `export async function activate(context: vscode.ExtensionContext): Promise<void>`
> Target Path: `src/extension.ts:10-61`（現行実装位置。修正後に更新）

`activate()` を async 化し、初回 `dataSource.registerGitPath()` の resolve 完了を await してから `AvatarManager` / `RepoManager` 等の依存 manager を構築する修正。resolver 完了前に `RepoManager` が Git command を開始しないことを保証する（[1] の activation 境界）。`git.path` 設定変更時の再解決呼び出し（TC-027）は既存 S7 の観点を維持する。

| Case ID | Input / Precondition                                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                            | Notes                      |
| ------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| TC-032  | `dataSource.registerGitPath` が resolve する Promise を返すモックで `activate(context)` を await    | Normal - 解決後の依存構築                                                  | `registerGitPath()` の resolve 後に `RepoManager` / `AvatarManager` のコンストラクタが呼ばれ（call order 検証）、`activate` の戻り Promise が resolve する | 初回解決の await           |
| TC-033  | `dataSource.registerGitPath` が pending（未解決）の Promise を返す状態で `activate(context)` を呼ぶ | Boundary - 解決前は依存未構築                                              | マイクロタスク flush 後も `RepoManager` コンストラクタの呼び出しが 0 回である（resolver 完了前に Git command を開始する manager が構築されない）           | 解決待ちのブロッキング検証 |

## S9: DiffDocProvider / AvatarManager の subscriptions 登録

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: `activate()` 内の provider 生成・登録処理
> Target Path: `src/extension.ts:45-48`（現行 provider 登録位置。修正後に更新）

`DiffDocProvider` インスタンスを変数に保持し、provider 本体と `registerTextDocumentContentProvider` が返す登録解除 Disposable の両方を `context.subscriptions` へ登録する。`AvatarManager` も subscriptions へ登録する（[12][13] の extension 側）。manager 内部の dispose 分岐は各 owner（`src/diffDocProvider-test.md` / `src/avatarManager-test.md`）の責務。

| Case ID | Input / Precondition                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                     | Notes                                |
| ------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| TC-034  | `activate(context)` 完了後の `context.subscriptions`           | Normal - provider 本体の登録                                               | subscriptions に生成された `DiffDocProvider` インスタンスそのもの（同一参照の厳密一致）が含まれる                   | 登録解除 Disposable だけの登録は不可 |
| TC-035  | 同上                                                           | Normal - 登録解除 Disposable の登録                                        | `registerTextDocumentContentProvider` が返した Disposable が provider 本体とは別要素として subscriptions に含まれる | 両方の登録                           |
| TC-036  | 同上                                                           | Normal - AvatarManager の登録                                              | subscriptions に `AvatarManager` インスタンス（同一参照の厳密一致）が含まれる                                       | -                                    |
| TC-037  | `activate` 完了後、subscriptions の全要素の `dispose()` を実行 | Normal - dispose 伝播                                                      | `DiffDocProvider.dispose()` と `AvatarManager.dispose()` が各1回呼ばれる                                            | deactivate 相当での解放              |

### 失敗源インベントリ（include-or-justify）— Feature 045 追加分（S8〜S9）

| 失敗源                                                  | 対応ケースまたは除外理由                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| activation が git path 解決を待たない（配列クラッシュ） | TC-032、TC-033                                                                              |
| resolver 完了前の Git command 開始                      | TC-033                                                                                      |
| provider 本体の登録漏れ（購読リーク）                   | TC-034、TC-037                                                                              |
| 登録解除 Disposable の登録漏れ                          | TC-035                                                                                      |
| AvatarManager の登録漏れ（timer リーク）                | TC-036、TC-037                                                                              |
| activation 中の依存初期化失敗                           | excluded(既存 S1 TC-002〜TC-005 が External 失敗経路を担保済み。本変更で分岐を追加しない)   |
| resolver の reject                                      | excluded(resolver は最終フォールバック `git` を返し reject しない契約。gitExecutable owner) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(S8〜S9 の対象は初期化順序と登録の契約であり、入力検証分岐が存在しない)
- Exception: excluded(新規 throw 分岐なし。既存の例外伝播は S1 TC-002〜TC-005 で担保済み)
- External: excluded(vscode API 失敗は既存 S1 の External ケースで担保済み。本変更で失敗モードを追加しない)
- Boundary: TC-033
- Type: excluded(登録要素の型は TypeScript コンパイル時に保証され、実行時の型分岐が存在しない)

数値・空値境界（0 / minimum / maximum / +/-1 / empty / NULL）は、本セクションの対象が初期化順序と subscriptions 構成の契約であり仕様上意味を持たないため対象外とする（意味のある境界は「解決前」の TC-033 で充足）。

**失敗系/正常系比（煙感知器）**: 正常系5件（TC-032、TC-034〜TC-037）、失敗系1件（TC-033）。比0.2 と低いためインベントリを再導出したが、本変更の失敗源（await 漏れ・登録漏れ・dispose 未伝播）はいずれも「正常契約の存在検証」で検出される退行であり、独立した失敗分岐は「解決前」（TC-033）のみである。activation 失敗系は既存 S1 の External 4件が担保していることを確認した。
