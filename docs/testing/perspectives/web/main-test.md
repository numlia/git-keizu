# テスト観点表: web/main.ts

## S1: スタッシュ行描画（行構成・ラベル）

> Origin: Feature 001 (menu-bar-enhancement) Task 3.4
> Added: 2026-02-25

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                       | Perspective (Equivalence / Boundary) | Expected Result                                              | Notes                 |
| ------- | ------------------------------------------ | ------------------------------------ | ------------------------------------------------------------ | --------------------- |
| TC-001  | commit.stash !== null のコミットノード     | Equivalence - normal                 | 行要素の CSS クラスに `"commit"` と `"stash"` が両方含まれる | -                     |
| TC-002  | commit.stash.selector が `"stash@{0}"`     | Equivalence - normal                 | ラベルに `"@{0}"` が表示される（"stash" プレフィックス除去） | selector.substring(5) |
| TC-003  | commit.stash.selector が `"stash@{12}"`    | Boundary - multi-digit index         | ラベルに `"@{12}"` が表示される                              | 2桁インデックス       |
| TC-004  | commit.stash !== null のコミットノード     | Equivalence - normal                 | data-hash 属性にスタッシュのコミットハッシュが設定される     | -                     |
| TC-005  | commit.stash === null の通常コミットノード | Equivalence - normal (non-stash)     | 行要素の CSS クラスに `"stash"` が含まれない                 | 既存動作が維持される  |

## S2: スタッシュコンテキストメニュー

> Origin: Feature 001 (menu-bar-enhancement) Task 4.4
> Added: 2026-02-25

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

## S4: フェッチボタン

> Origin: Feature 001 (menu-bar-enhancement) Task 6.2
> Added: 2026-02-25

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                        | Perspective (Equivalence / Boundary) | Expected Result                                          | Notes                        |
| ------- | ------------------------------------------- | ------------------------------------ | -------------------------------------------------------- | ---------------------------- |
| TC-027  | フェッチボタンをクリック                    | Equivalence - normal                 | fetch メッセージが currentRepo を含んで送信される        | postMessage 呼び出し検証     |
| TC-028  | fetch レスポンス status === null            | Equivalence - normal                 | グラフが自動リフレッシュされる（refresh(true) 呼び出し） | -                            |
| TC-029  | fetch レスポンス status === "error message" | Equivalence - error                  | エラーダイアログが表示される                             | showErrorDialog 呼び出し検証 |

## S5: 比較モード状態遷移

> Origin: Feature 002 (menubar-search-diff) Task 4.3
> Added: 2026-02-25

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                                               | Perspective (Equivalence / Boundary) | Expected Result                                                                                  | Notes                                                |
| ------- | ---------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| TC-030  | 通常クリック（修飾キーなし）                                                       | Equivalence - normal                 | コミット詳細表示（既存動作維持）                                                                 | -                                                    |
| TC-031  | expandedCommit あり + 別コミットをCtrl+クリック                                    | Equivalence - normal                 | 比較モードに遷移。古いコミットがfromHash、新しいコミットがtoHashでcompareCommits送信             | 不具合修正52a5aa8: 順序保証追加                      |
| TC-032  | 比較モード + 同じ比較対象をCtrl+クリック                                           | Equivalence - normal                 | 比較モード解除、compareWithHash が null に戻る                                                   | -                                                    |
| TC-033  | 比較モード + 別のコミットをCtrl+クリック                                           | Equivalence - normal                 | 比較対象が変更される。古いコミットがfromHashでcompareCommits送信                                 | 不具合修正52a5aa8: 順序保証追加                      |
| TC-034  | 比較モード + 通常クリック（修飾キーなし）                                          | Equivalence - normal                 | 比較解除 + 新しいコミットの詳細表示                                                              | -                                                    |
| TC-035  | expandedCommit なし + Ctrl+クリック                                                | Boundary - no expanded               | 通常の詳細表示（比較モードにならない）                                                           | REQ-2.7制約                                          |
| TC-036  | 未コミット変更行展開中 + コミット行をCtrl+クリック                                 | Boundary - uncommitted expanded      | compareCommitsメッセージがfromHash=UNCOMMITTED_CHANGES_HASH, toHash=コミットハッシュで送信される | getCommitOrderがUNCOMMITTED_CHANGES_HASHをfromに固定 |
| TC-037  | ResponseCompareCommits 受信（fileChanges あり）                                    | Equivalence - normal                 | 比較ヘッダー表示、ファイル一覧表示                                                               | -                                                    |
| TC-038  | ResponseCompareCommits 受信（fileChanges: null）                                   | Equivalence - error                  | showErrorDialog が呼ばれる                                                                       | -                                                    |
| TC-039  | 比較モードでファイルクリック                                                       | Equivalence - normal                 | viewDiff メッセージに compareWithHash が含まれる                                                 | -                                                    |
| TC-040  | ResponseCompareCommitsのfromHash/toHashがexpandedCommit.hash/compareWithHashと逆順 | Equivalence - reorder tolerance      | 正しく表示される（セット比較で順序不問）                                                         | 不具合修正52a5aa8: getCommitOrderによる順序変更対応  |
| TC-041  | 未コミット変更行展開中にloadCommits受信（テーブル再描画）                          | Equivalence - re-render              | srcElemが再取得され、展開状態が維持される                                                        | 不具合修正27d2b61: セレクタ拡張                      |
| TC-042  | コミット展開中 + 未コミット変更行をCtrl+クリック                                   | Equivalence - normal                 | 比較モードに遷移。fromHash=UNCOMMITTED_CHANGES_HASH, toHash=展開中コミットで送信                 | getCommitOrderがUNCOMMITTED_CHANGES_HASHをfromに固定 |
| TC-043  | 未コミット変更行と比較中 + 同じ未コミット行をCtrl+クリック                         | Equivalence - toggle off             | 比較モード解除。元のコミット詳細が再表示される                                                   | -                                                    |
| TC-044  | 未コミット変更行の通常クリック（展開済みコミットなし）                             | Equivalence - normal (non-modifier)  | 通常のcommitDetails要求が送信される（比較モードにならない）                                      | 既存動作維持                                         |

## S6: FindWidget統合

> Origin: Feature 002 (menubar-search-diff) Task 4.3
> Added: 2026-02-25

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                              | Perspective (Equivalence / Boundary) | Expected Result                                               | Notes    |
| ------- | ------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------- | -------- |
| TC-045  | Ctrl/Cmd+F キー押下                               | Equivalence - normal                 | FindWidget.show() が呼ばれる                                  | -        |
| TC-046  | 検索ボタンクリック                                | Equivalence - normal                 | FindWidget.show() が呼ばれる                                  | -        |
| TC-047  | saveState() 呼び出し                              | Equivalence - normal                 | findWidgetState が WebViewState に含まれる                    | -        |
| TC-048  | restoreState (findWidgetState あり)               | Equivalence - normal                 | FindWidget.restoreState() が呼ばれる                          | -        |
| TC-049  | restoreState (findWidgetState なし、旧バージョン) | Boundary - backward compat           | FindWidget がデフォルト状態で初期化される（エラーにならない） | 後方互換 |
