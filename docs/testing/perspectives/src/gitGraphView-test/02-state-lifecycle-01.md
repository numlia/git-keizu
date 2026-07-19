# テスト観点表: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Generated: 2026-05-02T01:45:44Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: state-lifecycle

## S6: createOrShow() rootUri ハンドリング

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                        | Notes          |
| ------- | ------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------- |
| TC-015  | rootUri 指定あり、パネル未作成                   | Normal - new panel                                                         | viewState.lastActiveRepo が rootUri.fsPath に設定される                | 初回起動時     |
| TC-016  | rootUri 指定あり、パネル既存、リポジトリ登録済み | Normal - existing panel                                                    | panel.reveal() 後に ResponseSelectRepo が送信される                    | リポジトリ切替 |
| TC-017  | rootUri 指定あり、パネル既存、リポジトリ未登録   | Normal - unregistered                                                      | registerRepoFromUri() が呼ばれ、その後 ResponseSelectRepo が送信される | 新規登録フロー |
| TC-018  | rootUri 指定なし（コマンドパレットから実行）     | Normal - no rootUri                                                        | 従来動作維持（selectRepo メッセージ送信なし）                          | 後方互換       |

## S7: viewState キーバインド・自動読み込み設定の受け渡し

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                      | Notes                |
| ------- | ---------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------- |
| TC-019  | getHtmlForWebview() 呼び出し | Normal - standard                                                          | viewState に keybindings オブジェクトが含まれる      | 設定パイプライン検証 |
| TC-020  | getHtmlForWebview() 呼び出し | Normal - standard                                                          | viewState に loadMoreCommitsAutomatically が含まれる | 設定パイプライン検証 |

## S12: loadCommits branches/authors 配列パススルー

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**テスト対象パス**: `src/gitGraphView.ts:279-291`

| Case ID | Input / Precondition                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                     | Notes          |
| ------- | -------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------- |
| TC-037  | msg.branches=["main","dev"], msg.authors=["Alice"] | Normal - standard                                                          | getCommits が branches=["main","dev"], authors=["Alice"] で呼ばれる | 配列パススルー |
| TC-038  | msg.branches=[], msg.authors=[]                    | Boundary - empty arrays                                                    | getCommits が branches=[], authors=[] で呼ばれる（全件表示）        | 空配列         |

## S14: viewState commitOrdering 受け渡し / loadCommits ハンドラ

> Origin: Feature 015 (commit-sort-order) (aidd-spec-tasks-test)
> Added: 2026-03-10
> Status: active
> Supersedes: -

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                  | Notes                |
| ------- | ----------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------- |
| TC-044  | getHtmlForWebview() 呼び出し                          | Normal - standard                                                          | viewState に commitOrdering が含まれ、Config.commitOrdering() の返却値と一致する | 設定パイプライン検証 |
| TC-045  | loadCommits メッセージに commitOrdering="topo"        | Normal - standard                                                          | dataSource.getCommits() に commitOrdering="topo" が渡される                      | -                    |
| TC-046  | loadCommits メッセージに commitOrdering="author-date" | Normal - standard                                                          | dataSource.getCommits() に commitOrdering="author-date" が渡される               | -                    |
| TC-047  | loadCommits メッセージに commitOrdering="date"        | Normal - default                                                           | dataSource.getCommits() に commitOrdering="date" が渡される                      | デフォルト動作確認   |

## S17: CSS_COLOR_VAR_PREFIX 定数による変数生成

> Origin: Feature 020 (legacy-branding-cleanup) (aidd-spec-tasks-test)
> Added: 2026-03-20
> Status: active
> Supersedes: -

**シグネチャ**: `private getHtmlForWebview(uri: vscode.Uri): string`
**テスト対象パス**: `src/gitGraphView.ts:553-560`

| Case ID | Input / Precondition                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                  | Notes                       |
| ------- | --------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------- |
| TC-059  | getHtmlForWebview() 呼び出し、graphColours に色あり | Normal - standard                                                          | 生成 HTML の style 属性に `--git-keizu-color` プレフィックスの変数定義が含まれる | CSS 定数リネーム検証        |
| TC-060  | getHtmlForWebview() 呼び出し、graphColours に色あり | Normal - standard                                                          | 生成 HTML の data-color セレクタに `var(--git-keizu-color` の変数参照が含まれる  | 定義-参照チェーン一致の検証 |

## S18: loadBranches watcher 起動オーケストレーション

> Origin: Feature 033 (watch-refresh-scope) Task 3
> Added: 2026-05-02T01:45:44Z
> Status: active
> Supersedes: -
> Signature: `loadBranches`
> Target Path: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                           | Notes                       |
| ------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| TC-061  | `loadBranches` を新規 repo で受信、`getBranches.error=false`     | Normal - repo change                                                       | `dataSource.getRepositoryStateWatchPaths(repo)` が1回呼ばれ、その戻り値配列で `repoFileWatcher.start(...)` が1回呼ばれる。あわせて `extensionState.setLastActiveRepo(repo)` が1回呼ばれる | repo 切替                   |
| TC-062  | 同一 repo で `loadBranches` を連続受信                           | Boundary - same repo                                                       | `getBranches` は再実行されるが、`getRepositoryStateWatchPaths` と `repoFileWatcher.start` は追加で呼ばれない                                                                              | 不要再起動抑止              |
| TC-063  | `getBranches.error=true`, `isGitRepository=false`, repo 切替あり | External - branch load failure                                             | `isGitRepository(repo)` が1回呼ばれ、`loadBranches` 応答の `isRepo` が `false` になりつつ、watch root 解決結果で `repoFileWatcher.start(...)` が1回呼ばれる                               | error 分岐でも watcher 起動 |
| TC-064  | panel.visible が `true -> false` に変化                          | Normal - hidden panel stop                                                 | view state handler 実行後に `repoFileWatcher.stop()` が1回呼ばれる                                                                                                                        | 非表示時停止維持            |

## S21: メッセージハンドラ try/finally による unmute 保証

> Origin: フェーズ2 修正 M5 (message-handler-try-finally-unmute)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: `onDidReceiveMessage` ハンドラ本体（`mute()` → `try { switch(msg.command) } finally { unmute() }`）
> Target Path: `src/gitGraphView.ts:154-770`

`this.repoFileWatcher.mute()` の後に `switch` を `try` で包み、`finally` で `this.repoFileWatcher.unmute()` を呼ぶよう変更する修正。従来は switch 後に unmute を直呼びしていたため、ハンドラが例外を投げると unmute されず watcher がミュートに固定されていた。finally 化により正常・異常いずれの経路でも `repoFileWatcher.unmute()` が確実に1回呼ばれる。観測は `repoFileWatcher.unmute` の呼び出し回数で行う（`muteCount` 内部遷移は repoFileWatcher 側 S11 の責務）。

| Case ID | Input / Precondition                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                  | Notes                                 |
| ------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------- |
| TC-076  | 登録済み repo でハンドラが正常完了する（例: `addTag` 成功） | Normal - normal path unmutes                                               | `repoFileWatcher.mute()` の後に処理が走り、`finally` で `repoFileWatcher.unmute()` が1回呼ばれる | 正常経路の unmute                     |
| TC-077  | switch 内の DataSource メソッドが例外を throw する          | Exception - handler throws still unmutes                                   | 例外が発生しても `finally` で `repoFileWatcher.unmute()` が1回呼ばれる（ミュート固定にならない） | 修正の肝（例外時の unmute 保証）      |
| TC-078  | 処理中の `sendMessage` が例外を throw する                  | Exception - send throws still unmutes                                      | `finally` で `repoFileWatcher.unmute()` が1回呼ばれる                                            | 送信例外時も unmute                   |
| TC-079  | 未登録 repo で mute 前の早期 return ガードに掛かる          | Boundary - early return before mute                                        | `repoFileWatcher.mute()` も `repoFileWatcher.unmute()` も呼ばれない（try の外で return）         | S17/TC-073 と整合（過剰 unmute なし） |

## S23: createOrShow() 既存パネル reveal 前の lastActiveRepo 永続化

> Origin: フェーズ2 修正 M6 (reveal-persist-last-active-repo)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: `public static createOrShow(...)`（`currentPanel` 既存かつ `rootUri !== undefined` の reveal 経路）
> Target Path: `src/gitGraphView.ts:52-58`

既存パネルを reveal する経路で、`rootUri !== undefined` のときに `panel.reveal()` の前へ `extensionState.setLastActiveRepo(getPathFromUri(rootUri))` を追加する修正。従来は新規パネル生成経路（S6/TC-015）でのみ lastActiveRepo を永続化しており、既存パネルの reveal 時に対象 repo が記録されなかった。

| Case ID | Input / Precondition                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                           | Notes                        |
| ------- | ------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------- |
| TC-086  | `currentPanel` 既存、`rootUri` 指定あり                 | Normal - existing panel persists repo                                      | `extensionState.setLastActiveRepo(getPathFromUri(rootUri))` が1回呼ばれる | 既存パネル reveal 時の永続化 |
| TC-087  | `currentPanel` 既存、`rootUri === undefined`            | Boundary - no rootUri                                                      | `setLastActiveRepo` は呼ばれず、`panel.reveal()` のみ実行される           | rootUri 無し時は記録しない   |
| TC-088  | `currentPanel` 既存、`rootUri` 指定あり（呼び出し順序） | Normal - persist before reveal                                             | `setLastActiveRepo` が `panel.reveal()` より前に呼ばれる（呼び出し順序）  | reveal 前永続化の順序保証    |

## S25: getHtmlForWebview() アバターストレージ初期化の完了待ち

> Origin: フェーズ3 修正 L8 (avatar-storage-init-await)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: -
> Signature: `private async getHtmlForWebview(): Promise<string>`
> Target Path: `src/gitGraphView.ts:604-614`

`getHtmlForWebview` で viewState を構築する前に `await this.extensionState.waitForAvatarStorage()` を追加する修正。`viewState.fetchAvatars = config.fetchAvatars() && this.extensionState.isAvatarStorageAvailable()` の評価がアバターストレージ初期化（非同期の fs.stat/mkdir）の完了後に行われることを保証し、初期化レース中の暫定値 `false` を掴む不具合を防ぐ。

| Case ID | Input / Precondition                                                                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                      | Notes                    |
| ------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| TC-096  | `getHtmlForWebview()` 呼び出し                                                                                  | Normal - awaits before viewState                                           | `extensionState.waitForAvatarStorage()` が viewState 構築（`isAvatarStorageAvailable` 評価）より前に1回 await される | 完了待ちの順序保証       |
| TC-097  | `config.fetchAvatars()` が `true`、await 完了後に `isAvatarStorageAvailable()` が `true` を返す                 | Normal - fetchAvatars enabled after init                                   | 生成された `viewState.fetchAvatars` が `true` になる                                                                 | 初期化完了後の確定値反映 |
| TC-098  | `config.fetchAvatars()` が `true`、await 完了後も `isAvatarStorageAvailable()` が `false`（ストレージ利用不可） | Boundary - storage unavailable                                             | `viewState.fetchAvatars` が `false` になる                                                                           | ストレージ不可時         |
| TC-099  | `config.fetchAvatars()` が `false`、`isAvatarStorageAvailable()` が `true`                                      | Boundary - config disabled                                                 | `viewState.fetchAvatars` が `false`（AND 条件で config 側が優先的に false）                                          | 設定 OFF 時              |

## S27: script 埋め込み JSON の `<` エスケープ serializer

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: private serializer（`JSON.stringify` 結果中の `<` を serialized literal `\u003c` へ置換。実装時に確定）
> Target Path: `src/gitGraphView.ts:667-668`

`<script>` 要素へ埋め込む3値（`locale` / `webviewMessages` / `viewState`）を共通の安全な serializer 経由へ変更する修正。`JSON.stringify` の出力中の `<` を JavaScript Unicode escape `\u003c`（TypeScript の置換文字列は `"\\u003c"`）へ置換し、repo path 等に `</script>` を含んでも script 要素が分断されないようにする（[17] の修正）。入力値そのものは変更せず、復元可能性を維持する。CSP・nonce・外部 script URI は変更しない。

| Case ID | Input / Precondition                                                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                    | Notes                                  |
| ------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| TC-106  | `<` を含まない通常の locale / webviewMessages / viewState で `getHtmlForWebview()` を実行                 | Normal - 通常値の等価性                                                    | 埋め込み JSON 文字列を `JSON.parse` した結果が元の値と deep-equal（既存 TC-019/020/039/044/097〜099 の viewState 経路が維持される）                | 通常値では `JSON.stringify` と同一出力 |
| TC-107  | viewState の repo path（`repos` キーと `lastActiveRepo`）に `</script><script>alert(1)</script>` を含める | Boundary - script 要素の分断防止                                           | 生成 HTML の nonce 付き `<script>` 要素数が通常時と同数で、埋め込み JSON 内に literal な部分文字列 `</script>` が現れない（`\u003c` へ置換される） | HTML 注入を伴う機能不全の防止          |
| TC-108  | `</script>` を含む文字列値を serializer で直列化し、出力を復元                                            | Normal - 復元同値性                                                        | serializer 出力（`\u003c` 置換済み）を `JSON.parse` した文字列が元の入力と厳密一致し、入力オブジェクト自体は置換で変更されていない                 | 非破壊・可逆性                         |
| TC-109  | locale と webviewMessages の値にも `</script>` を含めて `getHtmlForWebview()` を実行                      | Boundary - 3埋め込みすべてへの適用                                         | `locale` / `webviewMessages` / `viewState` の3埋め込みすべてで literal `</script>` が現れない（一部の埋め込みだけの処理でない）                    | 適用漏れの検出                         |

### 失敗源インベントリ（include-or-justify）— Feature 045 追加分（S27）

| 失敗源                                                 | 対応ケースまたは除外理由                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `</script>` を含む値による script 要素の分断           | TC-107                                                                                      |
| 一部の埋め込みだけへの適用（locale / messages の漏れ） | TC-109                                                                                      |
| 置換による値の破壊（復元不能・入力の破壊的変更）       | TC-108                                                                                      |
| 通常値の直列化退行                                     | TC-106                                                                                      |
| `<` の単純な HTML エンティティ等への誤置換             | TC-108（`JSON.parse` での復元同値性で検出）                                                 |
| script 実行への到達                                    | excluded(CSP の nonce 指定 `script-src` により防止済みで本修正の対象外。仕様確定済みの前提) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(serializer は任意の JSON 化可能値を受け入れ、拒否分岐を持たない)
- Exception: excluded(`JSON.stringify` / 文字列置換に throw 分岐を追加しない。循環参照値は viewState 構築契約上発生しない)
- External: excluded(外部依存なし。HTML 生成は純粋な文字列処理)
- Boundary: TC-107、TC-109
- Type: excluded(埋め込み3値の型は TypeScript コンパイル時に保証される)

数値・空値境界（0 / minimum / maximum / +/-1 / empty / NULL）は、本セクションの対象が文字列エスケープ契約であり仕様上意味を持たないため対象外とする（意味のある境界は `</script>` 部分文字列の TC-107/TC-109 で充足）。

**失敗系/正常系比（煙感知器）**: 正常系2件（TC-106、TC-108）、失敗系2件（TC-107、TC-109）。件数が同数のためインベントリを再導出したが、本変更の失敗源は上表のとおりすべて対応ケースまたは除外理由で充足されており、追加すべき失敗系ケースはないことを確認した（エスケープ契約のため失敗系は Boundary のみとなる）。
