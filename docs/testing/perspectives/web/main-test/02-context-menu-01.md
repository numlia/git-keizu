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

| Case ID | Input / Precondition                               | Perspective (Equivalence / Boundary) | Expected Result                                                                                              | Notes                            |
| ------- | -------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| TC-006  | stash !== null のコミット行を右クリック            | Equivalence - normal                 | スタッシュ専用コンテキストメニューが表示される（Apply, Branch, Pop, Drop, セパレータ, Copy Name, Copy Hash） | 通常コミットメニューではないこと |
| TC-007  | メニューから "Apply Stash..." を選択               | Equivalence - normal                 | チェックボックスダイアログ（"Reinstate Index"、デフォルト false）が表示される                                | -                                |
| TC-008  | Apply ダイアログで Reinstate Index ON で確認       | Equivalence - with option            | applyStash メッセージが reinstateIndex: true で送信される                                                    | -                                |
| TC-009  | Apply ダイアログで Reinstate Index OFF で確認      | Equivalence - normal                 | applyStash メッセージが reinstateIndex: false で送信される                                                   | -                                |
| TC-010  | メニューから "Pop Stash..." を選択して確認         | Equivalence - normal                 | popStash メッセージが送信される                                                                              | Apply と同一ダイアログパターン   |
| TC-011  | メニューから "Drop Stash..." を選択                | Equivalence - normal                 | 確認ダイアログ（削除確認）が表示される                                                                       | -                                |
| TC-012  | Drop 確認ダイアログで確認                          | Equivalence - normal                 | dropStash メッセージが送信される                                                                             | -                                |
| TC-013  | メニューから "Create Branch from Stash..." を選択  | Equivalence - normal                 | 参照名入力ダイアログ（バリデーション付き）が表示される                                                       | refInvalid バリデーション        |
| TC-014  | Branch ダイアログで有効なブランチ名を入力して確認  | Equivalence - normal                 | branchFromStash メッセージが送信される                                                                       | -                                |
| TC-015  | メニューから "Copy Stash Name to Clipboard" を選択 | Equivalence - normal                 | copyToClipboard メッセージが type: "Stash Name", data: selector で送信される                                 | ダイアログなし                   |
| TC-016  | メニューから "Copy Stash Hash to Clipboard" を選択 | Equivalence - normal                 | copyToClipboard メッセージが type: "Stash Hash", data: hash で送信される                                     | ダイアログなし                   |

## S3: Uncommitted Changes コンテキストメニュー

> Origin: Feature 001 (menu-bar-enhancement) Task 5.4
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                            | Perspective (Equivalence / Boundary) | Expected Result                                                                           | Notes                |
| ------- | --------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------- | -------------------- |
| TC-017  | Uncommitted Changes 行を右クリック                              | Equivalence - normal                 | Uncommitted 専用コンテキストメニューが表示される（Stash, Reset, Clean）                   | -                    |
| TC-018  | メニューから "Stash uncommitted changes..." を選択              | Equivalence - normal                 | フォームダイアログ（メッセージ入力 + Include Untracked チェックボックス）が表示される     | -                    |
| TC-019  | Stash ダイアログでメッセージ入力 + Include Untracked ON で確認  | Equivalence - normal                 | pushStash メッセージが message と includeUntracked: true で送信される                     | -                    |
| TC-020  | Stash ダイアログでメッセージ空欄 + Include Untracked OFF で確認 | Boundary - empty message             | pushStash メッセージが message: "" と includeUntracked: false で送信される                | --message フラグなし |
| TC-021  | メニューから "Reset uncommitted changes..." を選択              | Equivalence - normal                 | 選択ダイアログ（Mixed / Hard の2択）が表示される                                          | -                    |
| TC-022  | Reset ダイアログで Mixed を選択して確認                         | Equivalence - normal                 | resetUncommitted メッセージが mode: "mixed" で送信される                                  | -                    |
| TC-023  | Reset ダイアログで Hard を選択して確認                          | Equivalence - normal                 | resetUncommitted メッセージが mode: "hard" で送信される                                   | -                    |
| TC-024  | メニューから "Clean untracked files..." を選択                  | Equivalence - normal                 | チェックボックスダイアログ（"Clean untracked directories"、デフォルト false）が表示される | -                    |
| TC-025  | Clean ダイアログで directories ON で確認                        | Equivalence - with option            | cleanUntrackedFiles メッセージが directories: true で送信される                           | -                    |
| TC-026  | Clean ダイアログで directories OFF で確認                       | Equivalence - normal                 | cleanUntrackedFiles メッセージが directories: false で送信される                          | -                    |

## S12: handleEscape() 段階的UI解除チェーン

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**シグネチャ**: `handleEscape(): void`
**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                        | Perspective (Equivalence / Boundary)     | Expected Result                                   | Notes          |
| ------- | ----------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------- | -------------- |
| TC-083  | コンテキストメニュー表示中                                  | Equivalence - normal (priority 1)        | hideContextMenu() のみ呼ばれる                    | 最高優先       |
| TC-084  | ダイアログ表示中（コンテキストメニューなし）                | Equivalence - normal (priority 2)        | hideDialog() のみ呼ばれる                         | -              |
| TC-085  | repoDropdown 展開中（メニュー/ダイアログなし）              | Equivalence - normal (priority 3)        | repoDropdown.close() のみ呼ばれる                 | -              |
| TC-086  | branchDropdown 展開中（repoDropdown 閉じ）                  | Equivalence - normal (priority 3 alt)    | branchDropdown.close() のみ呼ばれる               | repo→branch 順 |
| TC-087  | 両方のドロップダウン展開中                                  | Equivalence - normal (both open)         | repoDropdown.close() のみ呼ばれる（先にチェック） | repo 優先      |
| TC-088  | FindWidget 表示中（メニュー/ダイアログ/ドロップダウンなし） | Equivalence - normal (priority 4)        | findWidget.close() のみ呼ばれる                   | -              |
| TC-089  | コミット詳細展開中（他すべて閉じ）                          | Equivalence - normal (priority 5)        | hideCommitDetails() のみ呼ばれる                  | 最低優先       |
| TC-090  | 全UIコンポーネントが閉じている                              | Boundary - nothing active                | 何も起きない                                      | -              |
| TC-091  | コンテキストメニュー閉じ後に再度Escape                      | Equivalence - normal (chain progression) | 次の優先のコンポーネントが閉じる                  | 連続Escape     |

## S18: data-remotes 属性

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                           | Perspective (Equivalence / Boundary) | Expected Result                                                                   | Notes          |
| ------- | ---------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------- | -------------- |
| TC-115  | ブランチに remotes=["origin", "upstream"]      | Equivalence - normal                 | span 要素に data-remotes="origin,upstream" が設定される                           | カンマ区切り   |
| TC-116  | ブランチに remotes が空（リモートなし）        | Equivalence - normal (no remote)     | span 要素に data-remotes 属性が付与されない                                       | 属性自体を省略 |
| TC-117  | contextmenu ハンドラで data-remotes を読み取り | Equivalence - normal                 | data-remotes をカンマ分割し、buildRefContextMenuItems の remotes パラメータに渡す | 連携検証       |

## S34: コミット表示順序 ソート順解決・コンテキストメニュー

> Origin: Feature 015 (commit-sort-order) (aidd-spec-tasks-test)
> Added: 2026-03-10
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                      | Perspective (Equivalence / Boundary) | Expected Result                                                                    | Notes                      |
| ------- | --------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------- | -------------------------- |
| TC-184  | repoState.commitOrdering="topo", グローバル="date"        | Equivalence - normal                 | 有効ソート順は "topo"（リポジトリ設定優先）                                        | REQ-9.2 オーバーライド     |
| TC-185  | repoState.commitOrdering="default", グローバル="topo"     | Equivalence - normal (fallback)      | 有効ソート順は "topo"（グローバルにフォールバック）                                | "default" はグローバル使用 |
| TC-186  | repoState.commitOrdering=undefined, グローバル="date"     | Equivalence - normal (unset)         | 有効ソート順は "date"（グローバルにフォールバック）                                | 未設定時のフォールバック   |
| TC-187  | repoState.commitOrdering="author-date", グローバル="date" | Equivalence - normal                 | 有効ソート順は "author-date"（リポジトリ設定優先）                                 | 3番目の選択肢確認          |
| TC-188  | viewState.commitOrdering="topo" で初期化                  | Equivalence - normal (init)          | グローバルデフォルトが "topo" に設定される                                         | viewState からの初期化     |
| TC-189  | requestLoadCommits() 呼び出し                             | Equivalence - normal                 | リクエストメッセージに有効ソート順が commitOrdering フィールドとして含まれる       | メッセージプロトコル       |
| TC-190  | テーブルヘッダー右クリック                                | Equivalence - normal                 | コンテキストメニューに "Date", "Author Date", "Topological" の 3 項目が表示される  | REQ-2.2 メニュー構成       |
| TC-191  | 現在の有効ソート順が "topo"                               | Equivalence - normal (checkmark)     | "Topological" にチェックマーク（"✓ " プレフィックス）が表示される                  | 視覚的識別                 |
| TC-192  | コンテキストメニューで "Author Date" を選択               | Equivalence - normal (select)        | repoState.commitOrdering が "author-date" に更新され、saveRepoState メッセージ送信 | 永続化                     |
| TC-193  | コンテキストメニューでソート順を選択                      | Equivalence - normal (refresh)       | requestLoadCommits がハードリフレッシュ（hard=true）で呼ばれる                     | 即時反映                   |
