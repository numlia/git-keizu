# テスト観点表: web/main.ts

> Source: `web/main.ts`
> Generated: 2026-03-22T14:25:09Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: state-response

## S4: フェッチボタン

> Origin: Feature 001 (menu-bar-enhancement) Task 6.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                          | Notes                        |
| ------- | ------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------- |
| TC-027  | フェッチボタンをクリック                    | Normal - standard                                                          | fetch メッセージが currentRepo を含んで送信される        | postMessage 呼び出し検証     |
| TC-028  | fetch レスポンス status === null            | Normal - standard                                                          | グラフが自動リフレッシュされる（refresh(true) 呼び出し） | -                            |
| TC-029  | fetch レスポンス status === "error message" | Exception - handled error                                                  | エラーダイアログが表示される                             | showErrorDialog 呼び出し検証 |

## S13: 自動読み込み（observeWebviewScroll 拡張）

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                       | Notes              |
| ------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------ |
| TC-092  | scrollTop+clientHeight >= scrollHeight-25, config=true, moreAvailable=true, isLoading=false | Normal - standard                                                          | 読み込み発火: isLoadingMoreCommits=true, maxCommits 増加, requestLoadCommits 呼び出し | 全ガード条件充足   |
| TC-093  | config.loadMoreCommitsAutomatically=false                                                   | Validation - config disabled                                               | 自動読み込みが発火しない                                                              | 設定無効時         |
| TC-094  | moreCommitsAvailable=false                                                                  | Boundary - no more commits                                                 | 自動読み込みが発火しない                                                              | 全コミット取得済み |
| TC-095  | isLoadingMoreCommits=true (読み込み中)                                                      | Boundary - already loading                                                 | 自動読み込みが発火しない（二重発火防止）                                              | ガード条件         |
| TC-096  | スクロール位置が末尾から26px以上離れている                                                  | Boundary - threshold not met                                               | 自動読み込みが発火しない                                                              | 閾値未達           |
| TC-097  | スクロール位置が末尾からちょうど25px                                                        | Boundary - exact threshold                                                 | 自動読み込みが発火する                                                                | 境界値一致         |
| TC-098  | 読み込み完了コールバック実行                                                                | Normal - completion                                                        | isLoadingMoreCommits が false にリセットされる                                        | 状態復帰           |

## S14: selectRepo() リポジトリ選択

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**シグネチャ**: `selectRepo(repo: string): void`
**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                             | Notes          |
| ------- | ----------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------- |
| TC-099  | repo が gitRepos に存在する   | Normal - standard                                                          | currentRepo 設定、repoDropdown 更新、refresh(true) 呼び出し | 正常選択       |
| TC-100  | repo が gitRepos に存在しない | Boundary - unknown repo                                                    | 何も起きない（サイレント）                                  | 不明リポジトリ |

## S16: Author Dropdown UI

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                | Notes          |
| ------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------- |
| TC-107  | loadCommits レスポンス受信（authorFilter 未設定）          | Normal - standard                                                          | commits[].author から一意の Author 名が抽出、ソートされ、Dropdown に設定される | 初回リスト構築 |
| TC-108  | Author "Alice" を選択                                      | Normal - standard                                                          | loadCommits メッセージが authorFilter: "Alice" を含んで送信される              | 絞り込み要求   |
| TC-109  | "All Authors" を選択                                       | Normal - standard                                                          | loadCommits メッセージが authorFilter なしで送信される（全コミット表示）       | 絞り込み解除   |
| TC-110  | authorFilter が設定済みの状態で loadCommits レスポンス受信 | Normal - filtered                                                          | Author Dropdown のリストが更新されない（初回リストを維持）                     | リスト安定性   |
| TC-111  | commits に Author が0人（空コミット配列）                  | Boundary - empty                                                           | Dropdown に "All Authors" のみ表示される                                       | 空リポジトリ等 |

## S21: loadCommits() サーバー提供 Author リスト対応

> Origin: Feature 011 (author-filter-fix) (aidd-spec-tasks-test)
> Added: 2026-03-05
> Status: active
> Supersedes: -

**シグネチャ**: `public loadCommits(commits, commitHead, moreAvailable, hard, authors?)`
**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                | Notes                                    |
| ------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------- |
| TC-129  | authorFilter=null, authors=["Alice","Bob"]                       | Normal - standard                                                          | ドロップダウンが authors リスト（サーバー提供）で更新される                    | サーバー側ソート済みリストをそのまま使用 |
| TC-130  | authorFilter=null, authors=undefined                             | Normal - fallback                                                          | commits から Author を抽出・重複排除・ソートしてドロップダウン更新（従来方式） | フォールバック動作の確認                 |
| TC-131  | authorFilter=null, authors=[]                                    | Boundary - empty authors                                                   | ドロップダウンに "All Authors" のみ表示される                                  | 空リポジトリ等のケース                   |
| TC-132  | authorFilter="Alice", authors=["Alice","Bob"]                    | Normal - filtered                                                          | ドロップダウン更新がスキップされる（authorFilter !== null のため）             | フィルタ選択時はリスト安定性を維持       |
| TC-133  | authorFilter=null, authors=["Charlie","Alice","Bob"]（順序付き） | Normal - order                                                             | authors がそのままドロップダウンに設定される（クライアント側で再ソートしない） | サーバー提供の順序を信頼する設計         |

## S22: Branch マルチセレクト状態管理

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                               | Notes           |
| ------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------- |
| TC-134  | 初期状態（selectedBranches 未設定）                            | Normal - standard                                                          | selectedBranches が空配列 []（"Show All" 相当）                               | デフォルト値    |
| TC-135  | Branch ドロップダウンコールバックに ["main", "dev"] が渡される | Normal - standard                                                          | selectedBranches が ["main", "dev"] に更新され、requestLoadCommits が呼ばれる | 複数選択        |
| TC-136  | Branch ドロップダウンコールバックに [] が渡される              | Normal - standard                                                          | selectedBranches が [] に更新され、requestLoadCommits が呼ばれる              | "Show All" 選択 |
| TC-137  | requestLoadCommits 呼び出し（selectedBranches=["main"]）       | Normal - standard                                                          | 送信メッセージに branches: ["main"] が含まれる                                | 配列パラメータ  |
| TC-138  | requestLoadCommits 呼び出し（selectedBranches=[]）             | Boundary - empty                                                           | 送信メッセージに branches: [] が含まれる                                      | 全ブランチ表示  |

## S23: Author マルチセレクト状態管理

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                               | Notes                  |
| ------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------- |
| TC-139  | 初期状態（selectedAuthors 未設定）                              | Normal - standard                                                          | selectedAuthors が空配列 []（"Show All" 相当）                                | デフォルト値           |
| TC-140  | Author ドロップダウンコールバックに ["Alice", "Bob"] が渡される | Normal - standard                                                          | selectedAuthors が ["Alice", "Bob"] に更新され、requestLoadCommits が呼ばれる | 複数選択               |
| TC-141  | Author ドロップダウンコールバックに [] が渡される               | Normal - standard                                                          | selectedAuthors が [] に更新され、requestLoadCommits が呼ばれる               | "Show All" 選択        |
| TC-142  | requestLoadCommits 呼び出し（selectedAuthors=["Alice"]）        | Normal - standard                                                          | 送信メッセージに authors: ["Alice"] が含まれる                                | 配列パラメータ         |
| TC-143  | loadCommits 受信（selectedAuthors=[]）                          | Normal - standard                                                          | Author ドロップダウンが受信した著者リストで更新される                         | 空配列 = フィルタなし  |
| TC-144  | loadCommits 受信（selectedAuthors=["Alice"]）                   | Normal - filtered                                                          | Author ドロップダウンが更新されない（リスト安定性維持）                       | フィルタ選択中は非更新 |

## S24: WebViewState 後方互換マイグレーション

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                  | Notes                |
| ------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------- |
| TC-145  | getState が旧フォーマット（currentBranch: "main"）を返す       | Normal - migration                                                         | selectedBranches が ["main"] に変換される                        | string → [string]    |
| TC-146  | getState が旧フォーマット（currentBranch: null）を返す         | Boundary - null migration                                                  | selectedBranches が [] に変換される                              | null → []            |
| TC-147  | getState が旧フォーマット（authorFilter: "Alice"）を返す       | Normal - migration                                                         | selectedAuthors が ["Alice"] に変換される                        | string → [string]    |
| TC-148  | getState が旧フォーマット（authorFilter: null）を返す          | Boundary - null migration                                                  | selectedAuthors が [] に変換される                               | null → []            |
| TC-149  | getState が新フォーマット（selectedBranches: ["a","b"]）を返す | Normal - new format                                                        | selectedBranches がそのまま ["a","b"] として使用される           | マイグレーション不要 |
| TC-150  | setState 呼び出し                                              | Normal - standard                                                          | selectedBranches と selectedAuthors が新フォーマットで保存される | -                    |

## S25: ブランチドロップダウン定数

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                 | Notes                     |
| ------- | ------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------- |
| TC-151  | ALL_BRANCHES_LABEL 定数              | Normal - standard                                                          | 値が "Show All" と一致する                                      | マジックストリング排除    |
| TC-152  | ALL_BRANCHES_VALUE 定数              | Normal - standard                                                          | 値が "" と一致する                                              | マジックストリング排除    |
| TC-153  | REMOTE_BRANCH_PREFIX 定数            | Normal - standard                                                          | 値が "remotes/" と一致する                                      | マジックストリング排除    |
| TC-154  | リモートブランチのサブストリング処理 | Normal - standard                                                          | REMOTE_BRANCH_PREFIX.length が substring の引数に使用されている | マジックナンバー 8 の排除 |

## S26: loadBranches レスポンスのブランチ整合性チェック

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                             | Notes            |
| ------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------- |
| TC-155  | selectedBranches=["main","dev"], gitBranches に両方存在             | Normal - standard                                                          | selectedBranches が ["main","dev"] のまま変化しない         | 整合性OK         |
| TC-156  | selectedBranches=["main","deleted-branch"], "deleted-branch" が不在 | Normal - removed                                                           | selectedBranches が ["main"] にフィルタリングされる         | 消滅ブランチ除去 |
| TC-157  | selectedBranches 全てが gitBranches に不在（全消滅）                | Boundary - all removed                                                     | showCurrentBranchByDefault に応じて HEAD ブランチ or 空配列 | フォールバック   |

## S27: saveState() scrollTop 保存

> Origin: Feature 013 (scroll-position-restore) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**シグネチャ**: `private saveState(): void`
**テスト対象パス**: `web/main.ts:526-542`

| Case ID | Input / Precondition                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                        | Notes      |
| ------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ | ---------- |
| TC-158  | scrollContainerElem.scrollTop = 500 の状態で saveState() 呼び出し | Normal - standard                                                          | 保存される状態オブジェクトに scrollTop: 500 が含まれる | -          |
| TC-159  | scrollContainerElem.scrollTop = 0 の状態で saveState() 呼び出し   | Boundary - zero                                                            | 保存される状態オブジェクトに scrollTop: 0 が含まれる   | トップ位置 |

## S28: prevState scrollTop 復元

> Origin: Feature 013 (scroll-position-restore) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts:222-260`

| Case ID | Input / Precondition                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                 | Notes          |
| ------- | ------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------- |
| TC-160  | prevState.scrollTop = 300, リポジトリが有効            | Normal - standard                                                          | scrollContainerElem.scrollTop が 300 に設定される               | -              |
| TC-161  | prevState.scrollTop が undefined（旧バージョンデータ） | Boundary - backward compat                                                 | scrollContainerElem.scrollTop が変更されない（0のまま）         | 後方互換       |
| TC-162  | prevState が null（初回表示）                          | Boundary - no prevState                                                    | scrollTop 復元処理がスキップされる                              | 新規ウィンドウ |
| TC-163  | prevState.scrollTop = 0                                | Boundary - zero value                                                      | scrollContainerElem.scrollTop が 0 に設定される（明示的にゼロ） | 保存値ゼロ     |
