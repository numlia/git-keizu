# テスト観点表: web/main.ts

> Source: `web/main.ts`
> Generated: 2026-03-22T14:25:09Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: context-menu

## S2: スタッシュコンテキストメニュー

> Origin: Feature 001 (menu-bar-enhancement) Task 4.4
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                              | Notes                            |
| ------- | -------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| TC-006  | stash !== null のコミット行を右クリック            | Normal - standard                                                          | スタッシュ専用コンテキストメニューが表示される（Apply, Branch, Pop, Drop, セパレータ, Copy Name, Copy Hash） | 通常コミットメニューではないこと |
| TC-007  | メニューから "Apply Stash..." を選択               | Normal - standard                                                          | チェックボックスダイアログ（"Reinstate Index"、デフォルト false）が表示される                                | -                                |
| TC-008  | Apply ダイアログで Reinstate Index ON で確認       | Normal - with option                                                       | applyStash メッセージが reinstateIndex: true で送信される                                                    | -                                |
| TC-009  | Apply ダイアログで Reinstate Index OFF で確認      | Normal - standard                                                          | applyStash メッセージが reinstateIndex: false で送信される                                                   | -                                |
| TC-010  | メニューから "Pop Stash..." を選択して確認         | Normal - standard                                                          | popStash メッセージが送信される                                                                              | Apply と同一ダイアログパターン   |
| TC-011  | メニューから "Drop Stash..." を選択                | Normal - standard                                                          | 確認ダイアログ（削除確認）が表示される                                                                       | -                                |
| TC-012  | Drop 確認ダイアログで確認                          | Normal - standard                                                          | dropStash メッセージが送信される                                                                             | -                                |
| TC-013  | メニューから "Create Branch from Stash..." を選択  | Normal - standard                                                          | 参照名入力ダイアログ（バリデーション付き）が表示される                                                       | refInvalid バリデーション        |
| TC-014  | Branch ダイアログで有効なブランチ名を入力して確認  | Normal - standard                                                          | branchFromStash メッセージが送信される                                                                       | -                                |
| TC-015  | メニューから "Copy Stash Name to Clipboard" を選択 | Normal - standard                                                          | copyToClipboard メッセージが type: "Stash Name", data: selector で送信される                                 | ダイアログなし                   |
| TC-016  | メニューから "Copy Stash Hash to Clipboard" を選択 | Normal - standard                                                          | copyToClipboard メッセージが type: "Stash Hash", data: hash で送信される                                     | ダイアログなし                   |

## S3: Uncommitted Changes コンテキストメニュー

> Origin: Feature 001 (menu-bar-enhancement) Task 5.4
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                           | Notes                |
| ------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------- |
| TC-017  | Uncommitted Changes 行を右クリック                              | Normal - standard                                                          | Uncommitted 専用コンテキストメニューが表示される（Stash, Reset, Clean）                   | -                    |
| TC-018  | メニューから "Stash uncommitted changes..." を選択              | Normal - standard                                                          | フォームダイアログ（メッセージ入力 + Include Untracked チェックボックス）が表示される     | -                    |
| TC-019  | Stash ダイアログでメッセージ入力 + Include Untracked ON で確認  | Normal - standard                                                          | pushStash メッセージが message と includeUntracked: true で送信される                     | -                    |
| TC-020  | Stash ダイアログでメッセージ空欄 + Include Untracked OFF で確認 | Boundary - empty message                                                   | pushStash メッセージが message: "" と includeUntracked: false で送信される                | --message フラグなし |
| TC-021  | メニューから "Reset uncommitted changes..." を選択              | Normal - standard                                                          | 選択ダイアログ（Mixed / Hard の2択）が表示される                                          | -                    |
| TC-022  | Reset ダイアログで Mixed を選択して確認                         | Normal - standard                                                          | resetUncommitted メッセージが mode: "mixed" で送信される                                  | -                    |
| TC-023  | Reset ダイアログで Hard を選択して確認                          | Normal - standard                                                          | resetUncommitted メッセージが mode: "hard" で送信される                                   | -                    |
| TC-024  | メニューから "Clean untracked files..." を選択                  | Normal - standard                                                          | チェックボックスダイアログ（"Clean untracked directories"、デフォルト false）が表示される | -                    |
| TC-025  | Clean ダイアログで directories ON で確認                        | Normal - with option                                                       | cleanUntrackedFiles メッセージが directories: true で送信される                           | -                    |
| TC-026  | Clean ダイアログで directories OFF で確認                       | Normal - standard                                                          | cleanUntrackedFiles メッセージが directories: false で送信される                          | -                    |

## S12: handleEscape() 段階的UI解除チェーン

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**シグネチャ**: `handleEscape(): void`
**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                   | Notes          |
| ------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------- | -------------- |
| TC-083  | コンテキストメニュー表示中                                  | Normal - priority 1                                                        | hideContextMenu() のみ呼ばれる                    | 最高優先       |
| TC-084  | ダイアログ表示中（コンテキストメニューなし）                | Normal - priority 2                                                        | hideDialog() のみ呼ばれる                         | -              |
| TC-085  | repoDropdown 展開中（メニュー/ダイアログなし）              | Normal - priority 3                                                        | repoDropdown.close() のみ呼ばれる                 | -              |
| TC-086  | branchDropdown 展開中（repoDropdown 閉じ）                  | Normal - priority 3 alt                                                    | branchDropdown.close() のみ呼ばれる               | repo→branch 順 |
| TC-087  | 両方のドロップダウン展開中                                  | Normal - both open                                                         | repoDropdown.close() のみ呼ばれる（先にチェック） | repo 優先      |
| TC-088  | FindWidget 表示中（メニュー/ダイアログ/ドロップダウンなし） | Normal - priority 4                                                        | findWidget.close() のみ呼ばれる                   | -              |
| TC-089  | コミット詳細展開中（他すべて閉じ）                          | Normal - priority 5                                                        | hideCommitDetails() のみ呼ばれる                  | 最低優先       |
| TC-090  | 全UIコンポーネントが閉じている                              | Boundary - nothing active                                                  | 何も起きない                                      | -              |
| TC-091  | コンテキストメニュー閉じ後に再度Escape                      | Normal - chain progression                                                 | 次の優先のコンポーネントが閉じる                  | 連続Escape     |

## S18: data-remotes 属性

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                   | Notes          |
| ------- | ---------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------- |
| TC-115  | ブランチに remotes=["origin", "upstream"]      | Normal - standard                                                          | span 要素に data-remotes="origin,upstream" が設定される                           | カンマ区切り   |
| TC-116  | ブランチに remotes が空（リモートなし）        | Normal - no remote                                                         | span 要素に data-remotes 属性が付与されない                                       | 属性自体を省略 |
| TC-117  | contextmenu ハンドラで data-remotes を読み取り | Normal - standard                                                          | data-remotes をカンマ分割し、buildRefContextMenuItems の remotes パラメータに渡す | 連携検証       |

## S34: コミット表示順序 ソート順解決・コンテキストメニュー

> Origin: Feature 015 (commit-sort-order) (aidd-spec-tasks-test)
> Added: 2026-03-10
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                    | Notes                      |
| ------- | --------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------- |
| TC-184  | repoState.commitOrdering="topo", グローバル="date"        | Normal - standard                                                          | 有効ソート順は "topo"（リポジトリ設定優先）                                        | REQ-9.2 オーバーライド     |
| TC-185  | repoState.commitOrdering="default", グローバル="topo"     | Normal - fallback                                                          | 有効ソート順は "topo"（グローバルにフォールバック）                                | "default" はグローバル使用 |
| TC-186  | repoState.commitOrdering=undefined, グローバル="date"     | Normal - unset                                                             | 有効ソート順は "date"（グローバルにフォールバック）                                | 未設定時のフォールバック   |
| TC-187  | repoState.commitOrdering="author-date", グローバル="date" | Normal - standard                                                          | 有効ソート順は "author-date"（リポジトリ設定優先）                                 | 3番目の選択肢確認          |
| TC-188  | viewState.commitOrdering="topo" で初期化                  | Normal - init                                                              | グローバルデフォルトが "topo" に設定される                                         | viewState からの初期化     |
| TC-189  | requestLoadCommits() 呼び出し                             | Normal - standard                                                          | リクエストメッセージに有効ソート順が commitOrdering フィールドとして含まれる       | メッセージプロトコル       |
| TC-190  | テーブルヘッダー右クリック                                | Normal - standard                                                          | コンテキストメニューに "Date", "Author Date", "Topological" の 3 項目が表示される  | REQ-2.2 メニュー構成       |
| TC-191  | 現在の有効ソート順が "topo"                               | Normal - checkmark                                                         | "Topological" にチェックマーク（"✓ " プレフィックス）が表示される                  | 視覚的識別                 |
| TC-192  | コンテキストメニューで "Author Date" を選択               | Normal - select                                                            | repoState.commitOrdering が "author-date" に更新され、saveRepoState メッセージ送信 | 永続化                     |
| TC-193  | コンテキストメニューでソート順を選択                      | Normal - refresh                                                           | requestLoadCommits がハードリフレッシュ（hard=true）で呼ばれる                     | 即時反映                   |

## S44: gitRef contextmenu/checkout の dataset.name 生値読み取り

> Origin: フェーズ3 修正 L16 (ref-dataset-raw-read)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: -
> Signature: `.gitRef` の contextmenu ハンドラ / checkout ハンドラ（`worktrees` ルックアップ含む）
> Target Path: `web/main.ts:937-982`

`.gitRef` の contextmenu ハンドラおよび checkout ハンドラで、`dataset.name`（ref 名）の読み取りから `unescapeHtml(...)` を除去し生値をそのまま使う修正（計5箇所）。`dataset.name` は生 ref 名で格納されるため、旧 `unescapeHtml` 適用は特殊文字を含む ref 名を二重デコードして破壊していた。対象は (1) contextmenu の `refName`（`isRemoteCombined` 時 `target.dataset.name`／それ以外 `sourceElem.dataset.name`）、(2) `worktrees[sourceElem.dataset.name]` ルックアップ、(3) checkout の remote-combined／local 両分岐の ref 名。

| Case ID | Input / Precondition                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                     | Notes                |
| ------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------- |
| TC-246  | `.gitRef`（非 remote-combined）を右クリック、`sourceElem.dataset.name="main"`              | Normal - plain ref name context menu                                       | `refName` が生値 `"main"` として `buildRefContextMenuItems` へ渡される              | 通常 ref 名          |
| TC-247  | ref 名に特殊文字を含む（例 `dataset.name="feat&x"`）要素を右クリック                       | Boundary - special-char ref raw                                            | `refName` が生値 `"feat&x"` のまま渡される（旧 `unescapeHtml` の二重デコードなし）  | L16 の中核回帰       |
| TC-248  | `head` かつ非 remote-combined、`worktrees` に `sourceElem.dataset.name` の生キーで登録あり | Boundary - worktree raw-key lookup                                         | `worktrees[生ref名]` がヒットし `worktreeInfo`（path / isMainWorktree）が構築される | 生キー突合           |
| TC-249  | remote-combined（`gitRefHeadRemote`）ラベルをダブルクリックで checkout                     | Normal - checkout remote raw name                                          | `checkoutBranchAction` が `target.dataset.name` の生値と `true` で呼ばれる          | remote-combined 分岐 |
| TC-250  | 非 remote-combined の gitRef をダブルクリックで checkout                                   | Normal - checkout local raw name                                           | `checkoutBranchAction` が `sourceElem.dataset.name` の生値で呼ばれる                | local 分岐           |
| TC-251  | `head` かつ `worktrees` に該当キーが存在しない ref を右クリック                            | Boundary - worktree lookup miss                                            | `worktrees[生ref名]` が undefined で `worktreeInfo` が `null` のまま（例外なし）    | 非ヒット境界         |

## S57: refバッジ右クリックの共通化と一覧からの受渡し

> Origin: Feature 059-02 (light-spec-plan)
> Added: 2026-09-24
> Status: active
> Supersedes: -
> Signature: `showRefBadgeContextMenu(event: MouseEvent, badge: HTMLElement): void`（行内 `.gitRef` のcontextmenuと `RefOverflowOptions.onRefContextMenu` の共通処理）
> Target Path: `web/main.ts`（`addListenerToClass("gitRef", "contextmenu", ...)` から切り出す共通処理とcontroller生成時の接続。実装後に行範囲へ更新）
> Test File: `tests/web/main.test.ts`

行内refと一覧の複製の右クリックが同じ共通処理を通り、既存menu builderへ同じ値を渡すことを検証する。builder内の項目分岐は `web/refMenu-test/`・`web/worktreeMenu-test.md` の責務。TC-445〜TC-454は既存menuモックで引数の同値を確認し、TC-455は別describeで実contextMenuを使う。`TEST_REPO = "/test/repo"`。

| Case ID | Input / Precondition                                                                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                         | Notes                                                                  |
| ------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| TC-445  | worktree付きlocal branch `feature/x`（remotes `["origin"]`）の行内バッジ本体でcontextmenu                      | Normal - 行内refの既存引数                                                 | `buildRefContextMenuItems` が1回 `(TEST_REPO, "feature/x", バッジ, false, gitBranchHead, ["origin"], { path, isMainWorktree })` で呼ばれ、`showContextMenu` の第2引数がbuilderの戻り値、第3引数がバッジ | 共通化前と同じ引数                                                     |
| TC-446  | 結合バッジの `.gitRefHeadRemote`（`data-name="origin/main"`）でcontextmenu                                     | Normal - 結合remoteの選択                                                  | builderの第2引数が `origin/main`、第4引数が `true`、第7引数が `null`                                                                                                                                    | -                                                                      |
| TC-447  | 検索で `.gitRefHeadRemote` 内の文字列が `span.findMatch` に囲まれ、その `span.findMatch` をtargetにcontextmenu | Boundary - 検索マーク内のremote                                            | TC-446と同じ引数でbuilderが呼ばれる（local名 `main` にならない）                                                                                                                                        | 最寄りの `.gitRefHeadRemote` がバッジ内にある場合だけremote扱い。AC-09 |
| TC-448  | 結合バッジのアイコン要素、または `.gitRefName` をtargetにcontextmenu                                           | Boundary - remote以外の子要素                                              | builderの第2引数がlocal名 `main`、第4引数が `false`                                                                                                                                                     | -                                                                      |
| TC-449  | TC-445と同じrefを折り畳み、一覧の複製でcontextmenu                                                             | Normal - 一覧から同じbuilder引数                                           | 第3引数（複製要素）以外の引数がTC-445と `toEqual` で一致し、`showContextMenu` の第3引数が複製要素                                                                                                       | AC-03                                                                  |
| TC-450  | 一覧の結合バッジ複製の `.gitRefHeadRemote` でcontextmenu                                                       | Normal - 一覧の結合remote                                                  | builderの第2引数が `origin/main`、第4引数が `true`                                                                                                                                                      | AC-03                                                                  |
| TC-451  | 一覧のブランチなしworktree複製（`data-worktree-path="/tmp/wt8"`）でcontextmenu                                 | Normal - 一覧のdetached worktree                                           | `buildDetachedWorktreeContextMenuItems` が1回 `(TEST_REPO, "/tmp/wt8")`、`buildRefContextMenuItems` が0回                                                                                               | AC-03                                                                  |
| TC-452  | 一覧のtag複製 `v1.0` とremote複製 `origin/dev` でそれぞれcontextmenu                                           | Normal - 一覧のtag・remote                                                 | builderの第2引数がそれぞれ `v1.0` / `origin/dev` で、行内から同じrefを右クリックした場合と引数が一致する                                                                                                | AC-03                                                                  |
| TC-453  | stashバッジを行内と一覧の複製の両方でcontextmenu                                                               | Normal - スタッシュは既存処理のまま                                        | 行内と一覧で呼ばれるmenu builderと引数（第3引数を除く）が一致し、stash専用の分岐・builderが追加されていない                                                                                             | 059-01の修正は含めない。AC-14                                          |
| TC-454  | 一覧の複製 `data-name="feat&x"` でcontextmenu                                                                  | Boundary - 特殊文字の生値                                                  | builderの第2引数が `feat&x` と `toBe` で一致                                                                                                                                                            | S44 TC-247 と同じ生値契約                                              |
| TC-455  | 実contextMenuで、一覧のworktree付きbranch複製を右クリックし、Moreサブメニュー内の項目を実行                    | Normal - 実メニュー経由の操作                                              | 行内の同じrefから同じ項目を実行した場合と同一の `postMessage` payload（または同一の確認ダイアログ）になり、メニューとサブメニューの操作中に一覧が開いたまま                                             | AC-03                                                                  |
| TC-456  | `recentActions = ["ref.openTerminal"]` のリポジトリで一覧の複製を右クリック                                    | Normal - recent actionsの受渡し                                            | `showContextMenu` の第4引数が `["ref.openTerminal"]` と `toEqual` で一致                                                                                                                                | -                                                                      |

### 失敗源インベントリ（include-or-justify）— Feature 059-02 追加分（S57）

| 失敗源                                         | 対応ケースまたは除外理由                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| 共通化による行内引数の変化                     | TC-445、TC-446                                                                 |
| 検索マーク・子要素targetでのremote/local取違え | TC-447、TC-448、TC-450                                                         |
| 一覧から渡す値の不一致                         | TC-449、TC-451、TC-452、TC-456                                                 |
| スタッシュ専用分岐の混入                       | TC-453                                                                         |
| 特殊文字の二重復号                             | TC-454                                                                         |
| 実メニュー操作で一覧が閉じる・payloadが変わる  | TC-455                                                                         |
| builder内の業務分岐                            | excluded(`web/refMenu-test/`・`web/worktreeMenu-test.md` の責務)               |
| 外部依存・例外                                 | excluded(builderはモックまたは既存実装を使い、共通処理にthrow経路を追加しない) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(入力を拒否する分岐を追加しない。target判定の境界はBoundaryで扱う)
- Exception: excluded(throw経路なし)
- External: excluded(上表のとおり)
- Boundary: TC-447、TC-448、TC-454
- Type: excluded(event targetのElement判定はTC-447・TC-448の境界で扱う)

**失敗系/正常系比（煙感知器）**: 正常系9件、失敗系3件。共通化は既存引数の同値性の確認が主で、失敗源は上表で充足した。
