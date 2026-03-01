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

## S7: calculateCdvHeight() CDV高さ算出

> Origin: Feature 004 (webview-ux-polish) (aidd-spec-tasks-test)
> Added: 2026-02-26

**シグネチャ**: `private calculateCdvHeight(): number`
**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition               | Perspective (Equivalence / Boundary) | Expected Result                     | Notes                          |
| ------- | ---------------------------------- | ------------------------------------ | ----------------------------------- | ------------------------------ |
| TC-050  | innerHeight=800, controlsHeight=50 | Equivalence - normal                 | 250 (CDV_DEFAULT_HEIGHT)            | available=695 > 250            |
| TC-051  | innerHeight=355, controlsHeight=50 | Boundary - available == default      | 250                                 | available=250, 境界一致        |
| TC-052  | innerHeight=354, controlsHeight=50 | Boundary - available == default-1    | 249                                 | available=249 < 250            |
| TC-053  | innerHeight=205, controlsHeight=50 | Boundary - available == min          | 100 (CDV_MIN_HEIGHT)                | available=100, 最小境界一致    |
| TC-054  | innerHeight=204, controlsHeight=50 | Boundary - available == min-1        | 100 (CDV_MIN_HEIGHT)                | available=99 → 100にクランプ   |
| TC-055  | innerHeight=0                      | Boundary - zero viewport             | 100 (CDV_MIN_HEIGHT)                | 負の available → 100にクランプ |
| TC-056  | #controls要素が存在しない          | Boundary - missing element           | ビューポート全体 - マージンから算出 | controlsHeight=0フォールバック |

## S8: showCommitDetails() CDV高さ適用・スクロール制御

> Origin: Feature 004 (webview-ux-polish) (aidd-spec-tasks-test)
> Added: 2026-02-26

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                                                                    | Perspective (Equivalence / Boundary) | Expected Result                                                             | Notes                    |
| ------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------- | ------------------------ |
| TC-057  | CDVがビューポート内に完全に収まる (offsetTop > scrollTop, offsetTop + expandY < scrollTop + viewHeight) | Equivalence - normal                 | scrollTop が変化しない                                                      | スクロール位置維持       |
| TC-058  | CDV上端がビューポートより上 (offsetTop - CDV_SCROLL_PADDING < scrollTop)                                | Equivalence - top overflow           | scrollTop = offsetTop - CDV_SCROLL_PADDING                                  | 上方はみ出し時スクロール |
| TC-059  | CDV下端がビューポートより下 (offsetTop + expandY + CDV_SCROLL_BOTTOM_OFFSET > scrollTop + viewHeight)   | Equivalence - bottom overflow        | scrollTop = offsetTop + expandY - viewHeight + CDV_SCROLL_BOTTOM_OFFSET     | 下方はみ出し時スクロール |
| TC-060  | showCommitDetails() 呼び出し                                                                            | Equivalence - normal                 | CDV要素の style.height に calculateCdvHeight() の結果が px 単位で設定される | 動的高さ適用             |
| TC-061  | showCommitDetails() 呼び出し                                                                            | Equivalence - normal                 | renderGraph() が CDV高さ適用後に呼ばれる                                    | 描画座標更新             |

## S9: updateCommitDetailsHeight() リサイズ対応

> Origin: Feature 004 (webview-ux-polish) (aidd-spec-tasks-test)
> Added: 2026-02-26

**シグネチャ**: `private updateCommitDetailsHeight(): void`
**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                  | Perspective (Equivalence / Boundary) | Expected Result                                          | Notes                         |
| ------- | ----------------------------------------------------- | ------------------------------------ | -------------------------------------------------------- | ----------------------------- |
| TC-062  | CDV表示中 + resize イベント (outer dimensions change) | Equivalence - normal                 | CDV高さ再計算・style.height 更新、renderGraph() 呼び出し | -                             |
| TC-063  | CDV非表示 + resize イベント                           | Equivalence - no CDV                 | CDV高さ変更なし、既存動作維持                            | expandedCommit === null       |
| TC-064  | CDV表示中 + 内部リサイズ (outer unchanged)            | Equivalence - inner resize           | CDV高さ再計算・更新（パネル幅変更に対応）                | 既存renderGraph動作 + CDV更新 |

## S10: handleKeyboardShortcut() ショートカットキーマッチング

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27

**シグネチャ**: `handleKeyboardShortcut(e: KeyboardEvent): void`
**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                              | Perspective (Equivalence / Boundary)  | Expected Result                                               | Notes                  |
| ------- | ------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------- | ---------------------- |
| TC-065  | Ctrl+F (config find="f")                          | Equivalence - normal                  | findWidget.show(true) が呼ばれる                              | Find アクション        |
| TC-066  | Cmd+F (metaKey=true, config find="f")             | Equivalence - normal (macOS)          | findWidget.show(true) が呼ばれる                              | macOS対応              |
| TC-067  | Ctrl+R (config refresh="r")                       | Equivalence - normal                  | refresh(true) が呼ばれる                                      | Refresh アクション     |
| TC-068  | Ctrl+H (config scrollToHead="h"), commitHead 存在 | Equivalence - normal                  | scrollToCommit(commitHead, true, true) が呼ばれる             | HEAD スクロール        |
| TC-069  | Ctrl+H, commitHead が null                        | Boundary - no HEAD                    | 何も起きない                                                  | HEAD 不在時            |
| TC-070  | キー押下（Ctrl/Cmd なし）                         | Equivalence - abnormal (no modifier)  | 何も起きない                                                  | 修飾キーなし           |
| TC-071  | Ctrl + 設定に存在しないキー                       | Equivalence - abnormal (unmapped key) | 何も起きない                                                  | マッチなし             |
| TC-072  | isComposing=true の状態でCtrl+F                   | Boundary - IME composing              | 何も起きない                                                  | IME入力中は無視        |
| TC-073  | Shift+Ctrl+F (Shift修飾あり)                      | Equivalence - normal (with shift)     | e.key を toLowerCase して "f" にマッチ、findWidget.show(true) | Shift時の大文字対応    |
| TC-074  | Ctrl+F だが find 設定が null (UNASSIGNED)         | Boundary - disabled shortcut          | 何も起きない                                                  | ショートカット無効化時 |

## S11: scrollToStash() スタッシュナビゲーション

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27

**シグネチャ**: `scrollToStash(forward: boolean): void`
**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                              | Perspective (Equivalence / Boundary)     | Expected Result                                 | Notes                       |
| ------- | ------------------------------------------------- | ---------------------------------------- | ----------------------------------------------- | --------------------------- |
| TC-075  | forward=true, stash 3件, index=-1 (初期)          | Equivalence - normal (first nav)         | 最初の stash (index 0) にスクロール、フラッシュ | index=-1 → 0                |
| TC-076  | forward=true, stash 3件, index=0                  | Equivalence - normal                     | 次の stash (index 1) にスクロール               | 前方移動                    |
| TC-077  | forward=true, stash 3件, index=2 (末尾)           | Boundary - wrap forward                  | 最初の stash (index 0) に循環移動               | 末尾 → 先頭                 |
| TC-078  | forward=false (Shift), stash 3件, index=-1 (初期) | Equivalence - normal (reverse first nav) | 最後の stash (index 2) にスクロール             | 逆方向初期                  |
| TC-079  | forward=false, stash 3件, index=0 (先頭)          | Boundary - wrap backward                 | 最後の stash (index 2) に循環移動               | 先頭 → 末尾                 |
| TC-080  | stash コミットが 0 件                             | Boundary - no stashes                    | 何も起きない（サイレント）                      | stash 不在                  |
| TC-081  | stash 操作後、5秒タイムアウト経過                 | Boundary - timeout reset                 | stashNavigationIndex が -1 にリセットされる     | STASH_NAVIGATION_TIMEOUT_MS |
| TC-082  | stash 1件のみ, forward=true                       | Boundary - single stash                  | 同じ stash にスクロール（循環）                 | index 0 → 0                 |

## S12: handleEscape() 段階的UI解除チェーン

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27

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

## S13: 自動読み込み（observeWebviewScroll 拡張）

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                                                        | Perspective (Equivalence / Boundary)     | Expected Result                                                                       | Notes              |
| ------- | ------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------- | ------------------ |
| TC-092  | scrollTop+clientHeight >= scrollHeight-25, config=true, moreAvailable=true, isLoading=false | Equivalence - normal                     | 読み込み発火: isLoadingMoreCommits=true, maxCommits 増加, requestLoadCommits 呼び出し | 全ガード条件充足   |
| TC-093  | config.loadMoreCommitsAutomatically=false                                                   | Equivalence - abnormal (config disabled) | 自動読み込みが発火しない                                                              | 設定無効時         |
| TC-094  | moreCommitsAvailable=false                                                                  | Boundary - no more commits               | 自動読み込みが発火しない                                                              | 全コミット取得済み |
| TC-095  | isLoadingMoreCommits=true (読み込み中)                                                      | Boundary - already loading               | 自動読み込みが発火しない（二重発火防止）                                              | ガード条件         |
| TC-096  | スクロール位置が末尾から26px以上離れている                                                  | Boundary - threshold not met             | 自動読み込みが発火しない                                                              | 閾値未達           |
| TC-097  | スクロール位置が末尾からちょうど25px                                                        | Boundary - exact threshold               | 自動読み込みが発火する                                                                | 境界値一致         |
| TC-098  | 読み込み完了コールバック実行                                                                | Equivalence - normal (completion)        | isLoadingMoreCommits が false にリセットされる                                        | 状態復帰           |

## S14: selectRepo() リポジトリ選択

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27

**シグネチャ**: `selectRepo(repo: string): void`
**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition          | Perspective (Equivalence / Boundary) | Expected Result                                             | Notes          |
| ------- | ----------------------------- | ------------------------------------ | ----------------------------------------------------------- | -------------- |
| TC-099  | repo が gitRepos に存在する   | Equivalence - normal                 | currentRepo 設定、repoDropdown 更新、refresh(true) 呼び出し | 正常選択       |
| TC-100  | repo が gitRepos に存在しない | Boundary - unknown repo              | 何も起きない（サイレント）                                  | 不明リポジトリ |

## S15: ファイルリスト表示切替（Tree/List トグル）

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                            | Perspective (Equivalence / Boundary) | Expected Result                                                               | Notes              |
| ------- | ----------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------- | ------------------ |
| TC-101  | fileViewType="tree" の状態でトグルクリック      | Equivalence - normal                 | fileViewType が "list" に変更され、フラットリスト描画関数が呼ばれる           | tree → list        |
| TC-102  | fileViewType="list" の状態でトグルクリック      | Equivalence - normal                 | fileViewType が "tree" に変更され、ツリー描画関数が呼ばれる                   | list → tree        |
| TC-103  | トグルクリック後                                | Equivalence - normal                 | saveRepoState メッセージが新しい fileViewType を含んで送信される              | 永続化             |
| TC-104  | 初期表示: GitRepoState.fileViewType = "list"    | Equivalence - normal                 | リスト表示で初期描画される                                                    | 保存値の復元       |
| TC-105  | 初期表示: GitRepoState.fileViewType = undefined | Boundary - default                   | ツリー表示で初期描画される（現行動作と同一）                                  | デフォルト値       |
| TC-106  | トグルアイコンの表示                            | Equivalence - normal                 | 現在のモードに応じたアイコンが表示される（Tree アイコンまたは List アイコン） | 視覚フィードバック |

## S16: Author Dropdown UI

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                       | Perspective (Equivalence / Boundary) | Expected Result                                                                | Notes          |
| ------- | ---------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------ | -------------- |
| TC-107  | loadCommits レスポンス受信（authorFilter 未設定）          | Equivalence - normal                 | commits[].author から一意の Author 名が抽出、ソートされ、Dropdown に設定される | 初回リスト構築 |
| TC-108  | Author "Alice" を選択                                      | Equivalence - normal                 | loadCommits メッセージが authorFilter: "Alice" を含んで送信される              | 絞り込み要求   |
| TC-109  | "All Authors" を選択                                       | Equivalence - normal                 | loadCommits メッセージが authorFilter なしで送信される（全コミット表示）       | 絞り込み解除   |
| TC-110  | authorFilter が設定済みの状態で loadCommits レスポンス受信 | Equivalence - normal (filtered)      | Author Dropdown のリストが更新されない（初回リストを維持）                     | リスト安定性   |
| TC-111  | commits に Author が0人（空コミット配列）                  | Boundary - empty                     | Dropdown に "All Authors" のみ表示される                                       | 空リポジトリ等 |

## S17: コミット詳細表示改善

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                         | Perspective (Equivalence / Boundary) | Expected Result                                             | Notes             |
| ------- | -------------------------------------------- | ------------------------------------ | ----------------------------------------------------------- | ----------------- |
| TC-112  | コミット詳細表示                             | Equivalence - normal                 | 表示順: Commit → Parents → Author → Committer → Date        | 表示順変更        |
| TC-113  | Committer に committerEmail が設定されている | Equivalence - normal                 | "Committer: {name} <{email}>" 形式で表示。mailto リンク付き | Author 行と同形式 |
| TC-114  | committerEmail が空文字列                    | Boundary - empty email               | Committer 名のみ表示（メールアドレス部分は省略）            | 防御的表示        |

## S18: data-remotes 属性

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                           | Perspective (Equivalence / Boundary) | Expected Result                                                                   | Notes          |
| ------- | ---------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------- | -------------- |
| TC-115  | ブランチに remotes=["origin", "upstream"]      | Equivalence - normal                 | span 要素に data-remotes="origin,upstream" が設定される                           | カンマ区切り   |
| TC-116  | ブランチに remotes が空（リモートなし）        | Equivalence - normal (no remote)     | span 要素に data-remotes 属性が付与されない                                       | 属性自体を省略 |
| TC-117  | contextmenu ハンドラで data-remotes を読み取り | Equivalence - normal                 | data-remotes をカンマ分割し、buildRefContextMenuItems の remotes パラメータに渡す | 連携検証       |

## S19: Parents リンクナビゲーション

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                             | Perspective (Equivalence / Boundary) | Expected Result                                                                   | Notes                      |
| ------- | ------------------------------------------------ | ------------------------------------ | --------------------------------------------------------------------------------- | -------------------------- |
| TC-118  | コミットに parent hash が1つ                     | Equivalence - normal                 | parentHash クラスの span 要素として表示。data-hash 属性にフルハッシュが設定される | クリック可能               |
| TC-119  | parent hash の表示                               | Equivalence - normal                 | 8文字に短縮表示される                                                             | abbrevCommit() パターン    |
| TC-120  | parent hash クリック（該当コミットがロード済み） | Equivalence - normal                 | 該当コミット行にスクロールし、コミット詳細が表示される                            | loadCommitDetails 呼び出し |
| TC-121  | parent hash クリック（該当コミットが未ロード）   | Boundary - not found                 | 何も起きない（エラー表示なし）                                                    | 静かに失敗                 |
| TC-122  | マージコミット（parents が2つ）                  | Equivalence - normal (multiple)      | 両方の parent hash がリンクとして表示される                                       | 複数 parents 対応          |
