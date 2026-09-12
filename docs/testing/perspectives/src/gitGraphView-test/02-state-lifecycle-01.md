# テスト観点表: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Generated: 2026-05-02T01:45:44Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: state-lifecycle

## S6: createOrShow() rootUri ハンドリング

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: superseded
> Supersedes: -
> Superseded By: S36

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
> Status: superseded
> Supersedes: -
> Superseded By: S36
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

## S36: createOrShow() rootUri 登録待ちとパネル生成 / reveal / 兄弟登録の最終状態

> Origin: Feature 057 (multi-repo-single-folder-workspace) issue #49
> Added: 2026-09-12
> Status: active
> Supersedes: S6, S23
> Signature: `public static async createOrShow(extensionPath: string, dataSource: DataSource, extensionState: ExtensionState, avatarManager: AvatarManager, repoManager: RepoManager, rootUri?: vscode.Uri): Promise<void>`
> Target Path: `src/gitGraphView.ts`（`createOrShow()`。現行59-110行。修正後に更新）
> Test File: `tests/src/gitGraphView.test.ts`

`rootUri`指定時は`setLastActiveRepo()`→`await registerRepoFromUri()`→`currentPanel`判定の順に進む。`Promise`完了はパネル生成または`reveal`までを表し、HTML完成を含まない。初回HTML生成中の兄弟登録はHTML再生成を許容し、完成後は`loadRepos`のみを送る。`registerRepoFromUri()`内部の判定はrepoManager owner、`git-keizu.view`ハンドラの`rootUri`解決はextension owner、webview側の初期選択は`web/main.ts` ownerの責務で本表には含めない。定数は`SCM_REPO = "/scm/repo/path"`、`TEST_REPO = "/test/repo"`、`SIBLING_REPO = "/scm/sibling"`とする。

| Case ID | Input / Precondition                                                                                                                                                                                                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                              | Notes                              |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| TC-376  | `currentPanel`なし、`getRepos()`が`{}`、`rootUri`（`fsPath: SCM_REPO`）指定。`registerRepoFromUri`は手動resolveのdeferredを返し、resolve時に`getRepos()`の戻りを`{ [SCM_REPO]: { columnWidths: null } }`へ切り替える                                                  | Boundary - 登録完了前後のパネル生成                                        | resolve前は`createWebviewPanel`が0回。resolveして`await createOrShow()`が完了した後に1回。`vi.waitFor`で`webview.html`が空でなくなるまで待ち、HTMLに`unableToLoad`を含まず`id="repoSelect"`を含む。埋め込み`viewState.repos`のキーに`SCM_REPO`があり、`viewState.lastActiveRepo`が`SCM_REPO` | 登録前にパネルを作らない           |
| TC-377  | TC-376と同条件                                                                                                                                                                                                                                                        | Normal - 登録引数                                                          | `registerRepoFromUri`が`rootUri`と同一参照（`toBe`）で1回呼ばれる                                                                                                                                                                                                                            | -                                  |
| TC-378  | TC-376と同条件                                                                                                                                                                                                                                                        | Normal - lastActiveRepo記録の順序                                          | `setLastActiveRepo`が`SCM_REPO`で1回、`invocationCallOrder`が`registerRepoFromUri`より小さい                                                                                                                                                                                                 | 登録より前に記録                   |
| TC-379  | `currentPanel`なし、`rootUri`未指定                                                                                                                                                                                                                                   | Boundary - rootUriなし（初回）                                             | `registerRepoFromUri`0回、`setLastActiveRepo`0回、`await createOrShow()`後に`createWebviewPanel`1回                                                                                                                                                                                          | コマンドパレット起動               |
| TC-380  | `currentPanel`あり（`rootUri`なしで生成）、`rootUri`未指定で再呼び出し                                                                                                                                                                                                | Boundary - rootUriなし（既存パネル）                                       | `registerRepoFromUri`0回、`setLastActiveRepo`0回、`reveal`1回、`selectRepo`メッセージ0件、`createWebviewPanel`の追加呼び出し0回                                                                                                                                                              | 旧S6 TC-018・S23 TC-087相当        |
| TC-381  | `currentPanel`あり、`getRepos()`が`{ [TEST_REPO], [SCM_REPO] }`（登録済み）、`rootUri`指定。`registerRepoFromUri`はdeferred                                                                                                                                           | Normal - 既存パネルの登録待ちとreveal順序                                  | `setLastActiveRepo`が`SCM_REPO`で1回。`registerRepoFromUri`が1回（登録済みでも呼ぶ）。resolve前は`reveal`0回・`selectRepo`0件。resolve後に`reveal`1回、`{ command: "selectRepo", repo: SCM_REPO }`が1件。`setLastActiveRepo`の`invocationCallOrder`が`reveal`より小さい                      | 旧S6 TC-016・S23 TC-086/TC-088相当 |
| TC-382  | `currentPanel`あり、`getRepos()`が`{ [TEST_REPO] }`（未登録）、`rootUri`指定。`registerRepoFromUri`はresolve時に`getRepos()`を`{ [TEST_REPO], [SCM_REPO] }`へ切り替える                                                                                               | Normal - 未登録リポジトリの初回登録                                        | `registerRepoFromUri`が合計1回（`selectRepoFromUri()`からの2回目が無い）、`{ command: "selectRepo", repo: SCM_REPO }`が1件                                                                                                                                                                   | 旧S6 TC-017相当                    |
| TC-383  | `currentPanel`なし、`getRepos()`が`{}`のまま（非リポジトリ）、`rootUri`指定。`registerRepoFromUri`はresolveしても`getRepos()`を変えない                                                                                                                               | Boundary - 登録されなかったrootUri（0件）                                  | `createWebviewPanel`1回。`vi.waitFor`後のHTMLに`unableToLoad`を含む                                                                                                                                                                                                                          | 登録0件                            |
| TC-384  | `currentPanel`なし、同じ`rootUri`で`createOrShow`を2回連続で呼び、独立したdeferred d1・d2を返す。d1→d2の順にresolve（各resolve時に`getRepos()`を`{ [SCM_REPO] }`へ）                                                                                                  | Boundary - 連打（呼び出し順の完了）                                        | 両`Promise`完了後、`registerRepoFromUri`2回、`createWebviewPanel`1回、`reveal`1回                                                                                                                                                                                                            | パネル二重生成なし                 |
| TC-385  | TC-384と同条件でd2→d1の順にresolve                                                                                                                                                                                                                                    | Boundary - 連打（逆順の完了）                                              | `registerRepoFromUri`2回、`createWebviewPanel`1回、`reveal`1回                                                                                                                                                                                                                               | 完了順に依存しない                 |
| TC-386  | `currentPanel`なし、`rootUri`指定。`registerRepoFromUri`が`Error("register failed")`でreject                                                                                                                                                                          | External - 登録reject（初回）                                              | `createOrShow()`が`"register failed"`でreject（`rejects.toThrow`）、`createWebviewPanel`0回                                                                                                                                                                                                  | catchしない                        |
| TC-387  | `currentPanel`あり、`rootUri`指定。`registerRepoFromUri`が`Error("register failed")`でreject                                                                                                                                                                          | External - 登録reject（既存パネル）                                        | `createOrShow()`が`"register failed"`でreject、`reveal`0回、`selectRepo`0件                                                                                                                                                                                                                  | catchしない                        |
| TC-388  | `currentPanel`なし、`getRepos()`が`{ [TEST_REPO] }`、非リポジトリの`rootUri`（`SCM_REPO`）指定。`registerRepoFromUri`はresolveしても`getRepos()`を変えない                                                                                                            | Boundary - 非リポジトリrootUriと既存登録1件                                | HTMLに`id="repoSelect"`を含み、埋め込み`viewState.repos`のキーが`[TEST_REPO]`のみ、`viewState.lastActiveRepo`が`SCM_REPO`                                                                                                                                                                    | 未登録パスがlastActiveRepoに残る   |
| TC-389  | TC-376と同条件で、`loadWebviewMessages`をdeferredで止める。`registerRepoFromUri`のresolve後、`registerViewCallback`で捕捉したcallbackを`({ [SCM_REPO], [SIBLING_REPO] }, 2)`で呼び（`getRepos()`も2件へ切り替え）、その後`loadWebviewMessages`のdeferredをresolveする | Normal - HTML生成中の兄弟登録                                              | `loadWebviewMessages`が2回呼ばれ、`vi.waitFor`で待った最終HTMLの埋め込み`viewState.repos`のキーが`[SCM_REPO, SIBLING_REPO]`（`sort`後の比較）、`postMessage`に`loadRepos`は0件                                                                                                               | HTML再生成を許容                   |
| TC-390  | TC-376と同条件でHTML完成（`webview.html`が空でない）まで待った後、捕捉したcallbackを`({ [SCM_REPO], [SIBLING_REPO] }, 2)`で呼ぶ                                                                                                                                       | Normal - HTML完成後の兄弟登録                                              | `postMessage`に`{ command: "loadRepos", repos: { [SCM_REPO], [SIBLING_REPO] }, lastActiveRepo: SCM_REPO }`が1件、`loadWebviewMessages`の呼び出し回数は1のまま                                                                                                                                | HTML再生成なし                     |

### 失敗源インベントリ（include-or-justify）— Feature 057 追加分（S36）

| 失敗源                                                                 | 対応ケースまたは除外理由                                              |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 登録前のパネル生成（非リポジトリ判定でunable-to-loadページになる）     | TC-376                                                                |
| 登録引数違い（`rootUri`以外を渡す）                                    | TC-377                                                                |
| `lastActiveRepo`の記録順序（登録後に記録する）                         | TC-378                                                                |
| `rootUri`なしで登録・記録が走る                                        | TC-379、TC-380                                                        |
| 既存パネルの登録漏れ・reveal順序（登録完了前にreveal・selectRepoする） | TC-381、TC-382                                                        |
| 非リポジトリ`rootUri`                                                  | TC-383、TC-388                                                        |
| 連打（パネル二重生成・完了順依存）                                     | TC-384、TC-385                                                        |
| 登録reject（握りつぶし・パネル生成の継続）                             | TC-386、TC-387                                                        |
| 生成中・完成後の兄弟登録（最終HTML・`loadRepos`の欠落）                | TC-389、TC-390                                                        |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL）                  | 0件: TC-383、未指定: TC-379、TC-380、1件: TC-388、2回: TC-384、TC-385 |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(`rootUri`は`Uri`型で、拒否分岐を持たない)
- Exception: excluded(`createOrShow()`内でthrow・catchを追加しない。rejectはExternalで扱う)
- External: TC-386、TC-387
- Boundary: TC-376、TC-379、TC-380、TC-383、TC-384、TC-385、TC-388
- Type: excluded(型はコンパイル時に保証)
- Normal: TC-377、TC-378、TC-381、TC-382、TC-389、TC-390

**失敗系/正常系比（煙感知器）**: 正常系6件（TC-377、TC-378、TC-381、TC-382、TC-389、TC-390）、失敗系9件（Boundary 7件 + External 2件）。失敗源は登録待ち・パネル生成・reveal・兄弟登録の4系統を上表で網羅したことを確認した。比率合わせのためのケース追加は行わない。

## S37: createOrShow() 異なる rootUri の連続呼び出しを呼び出し順に適用する

> Origin: Feature 057 (multi-repo-single-folder-workspace) issue #49 PR #60 レビュー指摘
> Added: 2026-09-12
> Status: active
> Supersedes: -
> Signature: `public static createOrShow(extensionPath: string, dataSource: DataSource, extensionState: ExtensionState, avatarManager: AvatarManager, repoManager: RepoManager, rootUri?: vscode.Uri): Promise<void>`
> Target Path: `src/gitGraphView.ts`（`createOrShow()`と`open()`）
> Test File: `tests/src/gitGraphView.test.ts`

登録待ち（`registerRepoFromUri()`）は呼び出しごとに並行して走らせ、その後のパネル生成 / `reveal` / `selectRepo`（適用）だけを呼び出し順に直列化する。先行呼び出しの登録がrejectしても後続の適用は止めない（rejectは先行呼び出しの呼び出し元へ伝播済み）。S36の連打ケース（TC-384 / TC-385）は同一`rootUri`の回数だけを見ており、本セクションは異なる`rootUri`で最後に押したリポジトリが選択・記録されることを固定する。定数はS36と同じ。

| Case ID | Input / Precondition                                                                                                                                                                                                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                            | Notes                              |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| TC-391  | `currentPanel`なし、`getRepos()`が`{}`。`SCM_REPO`の`rootUri`→`SIBLING_REPO`の`rootUri`の順に`createOrShow`を呼び、独立したdeferred d1・d2を返す。d2を先にresolve（`getRepos()`を`{ [SIBLING_REPO] }`へ）、次にd1をresolve（`{ [SCM_REPO], [SIBLING_REPO] }`へ） | Boundary - 逆順の完了（異なるrootUri）                                     | 両`Promise`完了後、`registerRepoFromUri`2回、`createWebviewPanel`1回、`reveal`1回、`selectRepo`メッセージが`{ command: "selectRepo", repo: SIBLING_REPO }`の1件のみ、`getLastActiveRepo()`が`SIBLING_REPO` | 最後に押したリポジトリが選択される |
| TC-392  | TC-391と同条件でd1→d2の順にresolve（d1で`{ [SCM_REPO] }`、d2で`{ [SCM_REPO], [SIBLING_REPO] }`へ）                                                                                                                                                               | Normal - 呼び出し順の完了（異なるrootUri）                                 | TC-391と同じ                                                                                                                                                                                               | 完了順に依存しない                 |
| TC-393  | TC-391と同条件でd1を`Error("register failed")`でreject、d2をresolve（`{ [SIBLING_REPO] }`へ）                                                                                                                                                                    | External - 先行呼び出しの登録reject                                        | 1回目の`Promise`が`"register failed"`でreject。2回目は完了し、`createWebviewPanel`1回、`reveal`0回、`getLastActiveRepo()`が`SIBLING_REPO`                                                                  | 先行のrejectで後続を止めない       |

### 失敗源インベントリ（include-or-justify）— PR #60 レビュー対応分（S37）

| 失敗源                                                 | 対応ケースまたは除外理由                                |
| ------------------------------------------------------ | ------------------------------------------------------- |
| 完了順で適用し、先に押したリポジトリが最後に選択される | TC-391                                                  |
| 直列化により呼び出し順の完了で結果が変わる             | TC-392                                                  |
| 先行呼び出しのrejectが後続の適用を止める               | TC-393                                                  |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL）  | 2回: TC-391、TC-392。0回・1回はS36 TC-379〜TC-383が所有 |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(`rootUri`は`Uri`型で、拒否分岐を持たない)
- Exception: excluded(追加したcatchは先行呼び出しのrejectを後続へ波及させないためのもので、Externalの TC-393 で検証する)
- External: TC-393
- Boundary: TC-391
- Type: excluded(型はコンパイル時に保証)
- Normal: TC-392

**失敗系/正常系比（煙感知器）**: 正常系1件（TC-392）、失敗系2件（Boundary 1件 + External 1件）。比率合わせのためのケース追加は行わない。

## S38: createOrShow() 登録待ち中に閉じられたパネルを作り直さない

> Origin: Feature 057 (multi-repo-single-folder-workspace) issue #49 PR #60 レビュー指摘
> Added: 2026-09-12
> Status: active
> Supersedes: -
> Signature: `public static createOrShow(extensionPath: string, dataSource: DataSource, extensionState: ExtensionState, avatarManager: AvatarManager, repoManager: RepoManager, rootUri?: vscode.Uri): Promise<void>`
> Target Path: `src/gitGraphView.ts`（`open()`）
> Test File: `tests/src/gitGraphView.test.ts`

呼び出し時点の`currentPanel`を対象パネルとして記録し、登録待ちの間にそのパネルが閉じられた（`dispose()`で`currentPanel`が対象と一致しなくなった）場合は、パネル生成・`reveal`・`selectRepo`のいずれも行わずに`Promise`を完了させる。閉じた後に始まった呼び出しは対象パネルを持たないため、通常どおりパネルを生成する。定数はS36と同じ。

| Case ID | Input / Precondition                                                                                                                                                                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                           | Notes                            |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------- |
| TC-394  | `currentPanel`あり（`getRepos()`が`{ [TEST_REPO] }`）、`SCM_REPO`の`rootUri`指定で`registerRepoFromUri`はdeferred。resolve前に`currentPanel.dispose()`で閉じ、その後resolve（`getRepos()`を`{ [TEST_REPO], [SCM_REPO] }`へ） | Boundary - 登録待ち中のパネル閉鎖                                          | `Promise`完了後、`currentPanel`が`undefined`のまま、`createWebviewPanel`0回、`reveal`0回、`selectRepo`0件 | 閉じたタブを作り直さない         |
| TC-395  | TC-394と同条件で閉じた直後に`SIBLING_REPO`の`rootUri`で2回目を呼ぶ（deferred d2）。d1→d2の順にresolve（d2で`{ [TEST_REPO], [SCM_REPO], [SIBLING_REPO] }`へ）                                                                 | Normal - 閉鎖後の再呼び出し                                                | `createWebviewPanel`1回（2回目の呼び出しによる）、`reveal`0回、`getLastActiveRepo()`が`SIBLING_REPO`      | 停止した呼び出しは後続を妨げない |

### 失敗源インベントリ（include-or-justify）— PR #60 レビュー対応分（S38）

| 失敗源                                                                                     | 対応ケースまたは除外理由                   |
| ------------------------------------------------------------------------------------------ | ------------------------------------------ |
| 登録待ち中に閉じたパネルを作り直す                                                         | TC-394                                     |
| 停止した呼び出しが後続のパネル生成を妨げる、または古い呼び出しが新しいパネルを`reveal`する | TC-395                                     |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL）                                      | 閉鎖前に完了する通常経路はS36 TC-381が所有 |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(`rootUri`は`Uri`型で、拒否分岐を持たない)
- Exception: excluded(`open()`内でthrow・catchを追加しない)
- External: excluded(登録rejectはS36 TC-386 / TC-387とS37 TC-393が所有)
- Boundary: TC-394
- Type: excluded(型はコンパイル時に保証)
- Normal: TC-395

**失敗系/正常系比（煙感知器）**: 正常系1件（TC-395）、失敗系1件（Boundary 1件）。比率合わせのためのケース追加は行わない。

## S39: createOrShow() 登録rejectを挟んでも適用順の鎖を切らない

> Origin: Feature 057 (multi-repo-single-folder-workspace) issue #49 PR #60 レビュー指摘
> Added: 2026-09-12
> Status: active
> Supersedes: -
> Signature: `public static createOrShow(extensionPath: string, dataSource: DataSource, extensionState: ExtensionState, avatarManager: AvatarManager, repoManager: RepoManager, rootUri?: vscode.Uri): Promise<void>`
> Target Path: `src/gitGraphView.ts`（`createOrShow()`と`settled()`）
> Test File: `tests/src/gitGraphView.test.ts`

適用順の鎖（`lastOpen`）は「先行呼び出しがsettleし、かつ自呼び出しがsettleした時点」で進める。登録がrejectした呼び出しは先行の完了を自分では待たないため、その呼び出しを鎖の要素にそのまま使うと、後続がさらに前の呼び出しを追い越してしまう。S37は連続する2呼び出しの順序、本セクションは間に登録rejectを挟んだ3呼び出しの順序を固定する。定数はS36と同じ。

| Case ID | Input / Precondition                                                                                                                                                                                                                                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                      | Notes               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| TC-396  | `currentPanel`なし、`getRepos()`が`{}`。A（`SCM_REPO`）→B（`SCM_REPO`）→C（`SIBLING_REPO`）の順に`createOrShow`を呼び、独立したdeferred d1・d2・d3を返す。d2を`Error("register failed")`でreject、d3をresolve（`{ [SIBLING_REPO] }`へ）、最後にd1をresolve（`{ [SCM_REPO], [SIBLING_REPO] }`へ） | External - 中間呼び出しの登録reject                                        | Bの`Promise`が`"register failed"`でreject。A・C完了後、`createWebviewPanel`1回、`reveal`1回、`selectRepo`メッセージが`{ command: "selectRepo", repo: SIBLING_REPO }`の1件のみ、`getLastActiveRepo()`が`SIBLING_REPO` | Cが最後に適用される |

### 失敗源インベントリ（include-or-justify）— PR #60 レビュー対応分（S39）

| 失敗源                                                               | 対応ケースまたは除外理由                                |
| -------------------------------------------------------------------- | ------------------------------------------------------- |
| rejectした呼び出しを鎖の要素にし、後続がさらに前の呼び出しを追い越す | TC-396                                                  |
| 先行rejectが後続を止める                                             | S37 TC-393が所有                                        |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL）                | 2呼び出しはS37 TC-391 / TC-392が所有。3呼び出し: TC-396 |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(`rootUri`は`Uri`型で、拒否分岐を持たない)
- Exception: excluded(`settled()`のcatchは自呼び出しのrejectを鎖へ波及させないためのもので、Externalの TC-396 で検証する)
- External: TC-396
- Boundary: excluded(3呼び出しの順序はExternalのTC-396で扱う)
- Type: excluded(型はコンパイル時に保証)
- Normal: excluded(正常順序はS37 TC-392が所有)

**失敗系/正常系比（煙感知器）**: 正常系0件、失敗系1件（External 1件）。正常系はS37が所有するため比率合わせのケース追加は行わない。
