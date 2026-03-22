# テスト観点表: web/main.ts

> Source: `web/main.ts`
> Generated: 2026-03-22T14:25:09Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: compare-find

## S5: 比較モード状態遷移

> Origin: Feature 002 (menubar-search-diff) Task 4.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

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
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                              | Perspective (Equivalence / Boundary) | Expected Result                                               | Notes    |
| ------- | ------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------- | -------- |
| TC-045  | Ctrl/Cmd+F キー押下                               | Equivalence - normal                 | FindWidget.show() が呼ばれる                                  | -        |
| TC-046  | 検索ボタンクリック                                | Equivalence - normal                 | FindWidget.show() が呼ばれる                                  | -        |
| TC-047  | saveState() 呼び出し                              | Equivalence - normal                 | findWidgetState が WebViewState に含まれる                    | -        |
| TC-048  | restoreState (findWidgetState あり)               | Equivalence - normal                 | FindWidget.restoreState() が呼ばれる                          | -        |
| TC-049  | restoreState (findWidgetState なし、旧バージョン) | Boundary - backward compat           | FindWidget がデフォルト状態で初期化される（エラーにならない） | 後方互換 |

## S19: Parents リンクナビゲーション

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                             | Perspective (Equivalence / Boundary) | Expected Result                                                                   | Notes                      |
| ------- | ------------------------------------------------ | ------------------------------------ | --------------------------------------------------------------------------------- | -------------------------- |
| TC-118  | コミットに parent hash が1つ                     | Equivalence - normal                 | parentHash クラスの span 要素として表示。data-hash 属性にフルハッシュが設定される | クリック可能               |
| TC-119  | parent hash の表示                               | Equivalence - normal                 | 8文字に短縮表示される                                                             | abbrevCommit() パターン    |
| TC-120  | parent hash クリック（該当コミットがロード済み） | Equivalence - normal                 | 該当コミット行にスクロールし、コミット詳細が表示される                            | loadCommitDetails 呼び出し |
| TC-121  | parent hash クリック（該当コミットが未ロード）   | Boundary - not found                 | 何も起きない（エラー表示なし）                                                    | 静かに失敗                 |
| TC-122  | マージコミット（parents が2つ）                  | Equivalence - normal (multiple)      | 両方の parent hash がリンクとして表示される                                       | 複数 parents 対応          |
