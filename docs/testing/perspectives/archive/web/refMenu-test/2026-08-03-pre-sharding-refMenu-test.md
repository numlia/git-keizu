# テスト観点表: web/refMenu.ts

> Source: `web/refMenu.ts`
> Generated: 2026-03-27T15:56:04Z
> Language: TypeScript
> Test Framework: Vitest

## S1: checkoutBranchAction() ブランチ名提案ロジック

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 2.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**シグネチャ**: `checkoutBranchAction(repo: string, sourceElem: HTMLElement, refName: string, isRemoteCombined?: boolean): void`
**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes                                |
| ------- | -------------------------------- | -------------------------------------------------------------------------- | --------------- | ------------------------------------ |
| TC-001  | refName = "origin/feature/ebook" | Normal - 2階層                                                             | "feature/ebook" | 最初のスラッシュ以降を取得           |
| TC-002  | refName = "origin/main"          | Normal - 1階層                                                             | "main"          | リモート名のみ除去                   |
| TC-003  | refName = "origin/a/b/c"         | Normal - 3階層                                                             | "a/b/c"         | 深いネスト対応                       |
| TC-004  | refName = "upstream/feature/x"   | Normal - 別リモート                                                        | "feature/x"     | originではないリモート名             |
| TC-005  | refName = "origin"               | Boundary - スラッシュなし                                                  | "" (空文字列)   | 仕様上通常は発生しないが防御的に処理 |
| TC-006  | refName = "o/x"                  | Boundary - min (最短パス)                                                  | "x"             | 1文字リモート名 + 1文字ブランチ名    |

## S2: buildRefContextMenuItems() Pull/Pushメニュー項目

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 3.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

**シグネチャ**: `buildRefContextMenuItems(repo: string, refName: string, sourceElem: HTMLElement, isRemote: boolean, gitBranchHead: string | null): (ContextMenuElement | null)[]`
**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                     | Notes                        |
| ------- | ---------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------- | ---------------------------- |
| TC-007  | gitBranchHead === refName (カレントブランチ)   | Normal - standard                                                          | メニューにPull/Push項目が含まれる   | メニュー先頭に配置           |
| TC-008  | Pull/Push項目のタイトル                        | Normal - standard                                                          | "Pull" と "Push"                    | 表示文言の確認               |
| TC-009  | gitBranchHead !== refName (非カレントブランチ) | Normal - exclusion                                                         | メニューにPull/Push項目が含まれない | カレントブランチのみ表示     |
| TC-010  | refType === "remote" (リモートブランチ)        | Normal - exclusion                                                         | メニューにPull/Push項目が含まれない | ローカルカレントブランチのみ |

## S3: parseRemoteRef() リモート名分離ユーティリティ

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**シグネチャ**: `parseRemoteRef(refName: string): { remoteName: string; branchName: string }`
**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                     | Notes                                   |
| ------- | ----------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------- |
| TC-011  | refName = "origin/feature/x"        | Normal - 2階層                                                             | { remoteName: "origin", branchName: "feature/x" }                   | 最初のスラッシュで分割                  |
| TC-012  | refName = "origin/main"             | Normal - 1階層                                                             | { remoteName: "origin", branchName: "main" }                        | リモート名のみ除去                      |
| TC-013  | refName = "upstream/a/b/c"          | Normal - 深いネスト                                                        | { remoteName: "upstream", branchName: "a/b/c" }                     | 2つ目以降のスラッシュはブランチ名に含む |
| TC-014  | refName = "o/x"                     | Boundary - min (最短パス)                                                  | { remoteName: "o", branchName: "x" }                                | 1文字リモート + 1文字ブランチ           |
| TC-015  | refName = "origin" (スラッシュなし) | Boundary - no separator                                                    | { remoteName: "origin", branchName: "" } または適切なフォールバック | 仕様上通常は発生しない                  |

## S4: buildRefContextMenuItems() リモートブランチメニュー項目

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                   | Notes                           |
| ------- | ----------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------- |
| TC-016  | sourceElem がリモートブランチ | Normal - standard                                                          | メニューに "Delete Remote Branch..." 項目が含まれる               | -                               |
| TC-017  | sourceElem がリモートブランチ | Normal - standard                                                          | メニューに "Merge into current branch..." 項目が含まれる          | 既存 mergeBranch コマンド再利用 |
| TC-018  | sourceElem がローカルブランチ | Normal - exclusion                                                         | メニューに "Delete Remote Branch..." が含まれない                 | ローカルには不要                |
| TC-019  | Delete Remote Branch 選択     | Normal - standard                                                          | 確認ダイアログが表示される                                        | showConfirmationDialog          |
| TC-020  | Merge (remote) 選択           | Normal - standard                                                          | チェックボックスダイアログ（fast-forward オプション）が表示される | showCheckboxDialog              |

## S5: buildRefContextMenuItems() Rebase メニュー項目

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                | Notes                      |
| ------- | --------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------- |
| TC-021  | sourceElem がローカルブランチ（非HEAD） | Normal - standard                                                          | メニューに "Rebase current branch on Branch..." 項目が含まれる | gitBranchHead !== refName  |
| TC-022  | sourceElem が HEAD ブランチ             | Normal - exclusion                                                         | メニューに "Rebase..." が含まれない                            | 自分自身へのリベースは不可 |
| TC-023  | sourceElem がリモートブランチ           | Normal - exclusion                                                         | メニューに "Rebase..." が含まれない                            | ローカルブランチのみ       |
| TC-024  | Rebase 選択                             | Normal - standard                                                          | 確認ダイアログが表示される                                     | showConfirmationDialog     |

## S6: Delete Branch ダイアログ拡張（リモート同時削除）

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                         | Notes               |
| ------- | ----------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------- |
| TC-025  | remotes = ["origin"] (リモートあり) | Normal - standard                                                          | showFormDialog: "Force Delete" + "Delete this branch on the remote" の2チェックボックス | showFormDialog 切替 |
| TC-026  | remotes = [] (リモートなし)         | Normal - no remote                                                         | showCheckboxDialog: "Force Delete" のみ（既存動作維持）                                 | 後方互換            |
| TC-027  | リモート削除チェック ON             | Normal - standard                                                          | sendMessage に deleteOnRemotes: remotes が含まれる                                      | -                   |
| TC-028  | リモート削除チェック OFF            | Normal - standard                                                          | sendMessage に deleteOnRemotes: [] が含まれる                                           | デフォルト動作      |

## S7: Merge ダイアログ拡張（3 checkbox フォーム）

> Origin: Feature 014 (dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-09
> Status: active
> Supersedes: -

**テスト対象パス**: `web/refMenu.ts:30-55`

| Case ID | Input / Precondition                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                      | Notes                         |
| ------- | ------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------- |
| TC-029  | buildMergeBranchMenuItem 選択        | Normal - standard                                                          | showFormDialog が 3 checkbox（No FF / Squash / No Commit）で呼ばれる | showCheckboxDialog からの変更 |
| TC-030  | 3 checkbox のデフォルト値            | Normal - standard                                                          | viewState.dialogDefaults.merge の各フィールド値を反映                | commitMenu と同一構成         |
| TC-031  | callback で 3 値取得、確定ボタン押下 | Normal - standard                                                          | RequestMergeBranch に createNewCommit, squash, noCommit が含まれる   | sendMessage 検証              |
| TC-032  | Squash / No Commit checkbox の構成   | Normal - standard                                                          | info プロパティ（ツールチップテキスト）が設定されている              | commitMenu と同一テキスト     |

## S8: buildRefContextMenuItems() worktree 関連メニュー項目

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: active
> Supersedes: -

**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                | Notes            |
| ------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------- |
| TC-033  | ローカルブランチ、worktreeInfo = null                            | Normal - standard                                                          | メニューに "Create Worktree..." が含まれる                                                     | REQ-2.3-TC1      |
| TC-034  | ローカルブランチ、worktreeInfo = { path, isMainWorktree: false } | Normal - standard                                                          | メニューに "Open Terminal Here" / "Copy Worktree Path" / "Remove Worktree" の 3 項目が含まれる | REQ-2.3-TC2      |
| TC-035  | ローカルブランチ、worktreeInfo = { path, isMainWorktree: true }  | Normal - main wt                                                           | メニューに "Open Terminal Here" / "Copy Worktree Path" のみ（Remove Worktree なし）            | REQ-2.3-TC4      |
| TC-036  | リモートブランチ                                                 | Normal - exclusion                                                         | worktree 関連メニュー項目が一切含まれない                                                      | REQ-2.3-TC3      |
| TC-037  | Create Worktree... 選択                                          | Normal - standard                                                          | showFormDialog が Path + Open Terminal の 2 フィールドで呼ばれる                               | REQ-3.2, REQ-3.3 |
| TC-038  | Create Worktree ダイアログの Path デフォルト値                   | Normal - standard                                                          | `../<repoName>-<sanitize(branchName)>` 形式                                                    | REQ-3.3-TC3      |
| TC-039  | Open Terminal Here 選択                                          | Normal - standard                                                          | sendMessage openTerminal に path と name が含まれる                                            | REQ-9.1          |
| TC-040  | Copy Worktree Path 選択                                          | Normal - standard                                                          | sendMessage copyToClipboard に type: "worktreePath" と data: path が含まれる                   | REQ-9.2          |
| TC-041  | Remove Worktree 選択                                             | Normal - standard                                                          | showConfirmationDialog が呼ばれ、確認メッセージにブランチ名とパスが含まれる                    | REQ-4.1          |

## S11: Create Worktree ダイアログ Open Terminal 設定反映

> Origin: Feature 019 (worktree-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-15
> Status: active
> Supersedes: -

**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                     | Notes       |
| ------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------- |
| TC-048  | viewState.dialogDefaults.createWorktree.openTerminal=true  | Normal - standard                                                          | showFormDialog の Open Terminal チェックボックスが checked で表示   | REQ-9.1-TC1 |
| TC-049  | viewState.dialogDefaults.createWorktree.openTerminal=false | Normal - standard                                                          | showFormDialog の Open Terminal チェックボックスが unchecked で表示 | REQ-9.1-TC2 |

## S12: Remove Worktree ブランチ同時削除ダイアログ

> Origin: Feature 019 (worktree-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-15
> Status: active
> Supersedes: -

**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                   | Notes                |
| ------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------- |
| TC-050  | Remove Worktree 選択、非メインworktree                     | Normal - standard                                                          | showFormDialog がチェックボックス入力付きで呼ばれる               | REQ-4.1-TC1          |
| TC-051  | viewState.dialogDefaults.removeWorktree.deleteBranch=true  | Normal - standard                                                          | チェックボックスのデフォルトが checked                            | REQ-9.2-TC1          |
| TC-052  | viewState.dialogDefaults.removeWorktree.deleteBranch=false | Normal - standard                                                          | チェックボックスのデフォルトが unchecked                          | REQ-9.2-TC2          |
| TC-053  | チェックボックスの info プロパティ確認                     | Normal - standard                                                          | 安全な削除（git branch -d）の説明テキストが info に設定されている | REQ-4.1-TC2          |
| TC-054  | チェックON + Remove ボタン押下                             | Normal - standard                                                          | sendMessage に deleteBranch: true が含まれる                      | REQ-4.1              |
| TC-055  | チェックOFF + Remove ボタン押下                            | Normal - standard                                                          | sendMessage に deleteBranch: false が含まれる                     | REQ-4.1              |
| TC-056  | ダイアログのアクションボタン名                             | Normal - standard                                                          | ボタンテキストが "Remove" である                                  | REQ-4.1              |
| TC-057  | 確認メッセージの内容                                       | Normal - standard                                                          | メッセージにブランチ名と worktree パスが含まれる                  | REQ-4.1 既存動作維持 |

## S13: Context menu 整理対応 (032)

> Origin: Feature 032 (context-menu-reorg) Task 7
> Added: 2026-04-30
> Status: active
> Supersedes: -

**シグネチャ**: `buildRefContextMenuItems(repo: string, refName: string, sourceElem: HTMLElement, isRemoteCombined: boolean, gitBranchHead: string | null, remotes?: string[], worktreeInfo?: { path: string; isMainWorktree: boolean } | null): ContextMenuElement[]`
**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                  | Notes                    |
| ------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| TC-058  | tag 分岐 (`sourceElem.classList.contains("tag") === true`)            | Normal - unchanged branch type                                             | 戻り値が `Delete Tag...`, `Push Tag...`, `null`, `Copy Tag Name to Clipboard` の 4 要素のままである                                                              | tag は現状維持           |
| TC-059  | remote 分岐 (`refName = "origin/feature"`)                            | Normal - submenu layout                                                    | 上段 2 件が `Checkout Branch...`, `Merge into current branch...`、index 3 が `More...` submenu、child は `Delete Remote Branch...` 1 件                          | remote 整理              |
| TC-060  | local HEAD 分岐、`worktreeInfo = null`                                | Normal - current branch layout                                             | `Pull`, `Push`, `null`, `More...`(Rename 1 件), `null`, `Copy Branch Name to Clipboard` の順で並ぶ                                                               | Rename は submenu へ移動 |
| TC-061  | local HEAD 分岐、`worktreeInfo = { path, isMainWorktree: true }`      | Normal - current branch with worktree                                      | `Pull`, `Push` の後に worktree 4 項目、次に `More...`(Rename 1 件)、末尾に Copy が入り、`Remove Worktree...` は含まれない                                        | main worktree 維持       |
| TC-062  | local non-HEAD 分岐、`worktreeInfo = null`                            | Normal - non-head no worktree                                              | `Checkout Branch`, `Merge into current branch...`, `Rebase current branch on Branch...`, `null`, `Create Worktree...`, `null`, `More...`, `null`, `Copy...` の順 | 非 HEAD の基本構成       |
| TC-063  | local non-HEAD 分岐、`worktreeInfo = { path, isMainWorktree: false }` | Normal - non-head with worktree                                            | worktree 4 項目の後に `More...` submenu があり、child titles が `Rename Branch...`, `Delete Branch...`, `Remove Worktree...` の順になる                          | 動的 submenu             |
| TC-064  | remote / local-HEAD / local-non-HEAD の各分岐                         | Validation - divider rules                                                 | いずれの配列でも連続 `null` が無く、先頭・末尾が `null` でない                                                                                                   | 区切り線ルール           |

## S14: Recent actions 識別子と保存トリガー

> Origin: Feature 034 (context-menu-recent-actions) Task 4
> Added: 2026-05-02
> Status: active
> Supersedes: -
> Signature: `buildRefContextMenuItems(...)` / `checkoutBranchAction(repo: string, sourceElem: HTMLElement, refName: string, isRemoteCombined?: boolean, recordAction?: boolean): void`
> Target Path: `web/refMenu.ts`

| Case ID | Input / Precondition                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                           | Notes                           |
| ------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| TC-065  | remote menu と HEAD + worktree menu を構築                     | Normal - target ids                                                        | `Checkout Branch...`, `Merge...`, `Pull`, `Push`, `Open in New Window`, `Reveal in File Manager`, `Open Terminal Here` に対応する `recentActionId` が付く | supported action 一覧           |
| TC-066  | tag menu (`Delete Tag...`, `Push Tag...`)                      | Validation - excluded branch type                                          | tag 固有 action には `recentActionId` が付与されない                                                                                                      | tag は対象外                    |
| TC-067  | `checkoutBranchAction(repo, elem, "feature/local")` を直接呼ぶ | Boundary - non-menu path                                                   | `sendMessage(RequestCheckoutBranch)` は送るが `recordRecentAction(...)` は呼ばれない                                                                      | double click など共有経路の保護 |
| TC-068  | HEAD menu の `Pull` で確認ダイアログを承認                     | Normal - record before send                                                | 確認 callback 内で `recordRecentAction(repo, "ref.pull")` が `sendMessage({ command: "pull" })` より先に呼ばれる                                          | safe action の保存順            |
| TC-069  | worktree menu の `Open Terminal Here` を選択                   | Normal - worktree action persistence                                       | `recordRecentAction(repo, "ref.openTerminal")` が `sendMessage(RequestOpenTerminal)` より先に呼ばれ、payload は path / name を保持する                    | worktree action も Recent 対象  |

## S15: Delete Branch / Delete Remote Branch の Recent actions 連携

> Origin: Feature 037 (delete-branch-recent-actions) Task 4
> Added: 2026-05-09
> Status: active
> Supersedes: -
> Signature: `showDeleteBranchDialog(repo, refName, remotes, worktreeInfo)` / `buildRefContextMenuItems(...)`
> Target Path: `web/refMenu.ts`

| Case ID | Input / Precondition                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                          | Notes                                       |
| ------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| TC-070  | local non-HEAD ブランチで menu を構築、submenu 内 `Delete Branch...` を取得           | Normal - target id                                                         | 該当 menu item の `recentActionId === "ref.deleteBranch"`                                                                                                | プロパティ付与                              |
| TC-071  | remote menu の submenu 内 `Delete Remote Branch...` を取得                            | Normal - target id                                                         | 該当 menu item の `recentActionId === "ref.deleteRemoteBranch"`                                                                                          | プロパティ付与                              |
| TC-072  | `showDeleteBranchDialog` remotes あり分岐の form を確定                               | Normal - record before send                                                | confirm callback 内で `recordRecentAction(repo, "ref.deleteBranch")` が `sendMessage({ command: "deleteBranch", ... })` より先に呼ばれる                 | remotes あり分岐の保存順                    |
| TC-073  | `showDeleteBranchDialog` remotes なし分岐の form を確定                               | Normal - record before send                                                | confirm callback 内で `recordRecentAction(repo, "ref.deleteBranch")` が `sendMessage({ command: "deleteBranch", deleteOnRemotes: [] })` より先に呼ばれる | remotes なし分岐の保存順                    |
| TC-074  | `deleteRemoteBranchItem.onClick` で confirm を承認                                    | Normal - record before send                                                | `recordRecentAction(repo, "ref.deleteRemoteBranch")` が `sendMessage({ command: "deleteRemoteBranch", ... })` より先に呼ばれる                           | remote 削除の保存順                         |
| TC-075  | `deleteBranchItem` を click したのちダイアログを cancel する（callback 未呼び出し）   | Boundary - cancel path                                                     | `recordRecentAction(...)` が呼ばれない / `sendMessage(...)` も呼ばれない                                                                                 | キャンセル時は記録しない                    |
| TC-076  | `deleteRemoteBranchItem` confirm dialog を cancel する（confirm callback 未呼び出し） | Boundary - cancel path                                                     | `recordRecentAction(...)` が呼ばれない / `sendMessage(...)` も呼ばれない                                                                                 | キャンセル時は記録しない                    |
| TC-077  | tag 分岐の `Delete Tag...` / `Push Tag...`                                            | Validation - excluded branch type                                          | tag 固有 action には `recentActionId` プロパティが付与されない                                                                                           | TC-066 と整合                               |
| TC-078  | `RecentActionId` 共用体に `"ref.deleteBranch"` / `"ref.deleteRemoteBranch"` を渡せる  | Type - union extension                                                     | TypeScript コンパイルが通る（型エラーなし）                                                                                                              | `pnpm run typecheck` 成功で担保（型レベル） |

## S16: Remove Worktree チェックボックス名の raw 引き渡し（単一エスケープ境界）

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: `buildRefContextMenuItems()` 内 `removeWorktreeItem` の `showFormDialog` 呼び出し
> Target Path: `web/refMenu.ts:402-420`

Remove Worktree ダイアログの「Also delete branch」チェックボックスの `name` へ raw の `refName` を渡し、`showFormDialog` の checkbox 描画（`web/dialogs.ts` の `escapeHtml`）を唯一の HTML エスケープ境界とする修正。呼び出し側の事前 `escapeHtml` を外すことで、`feature/login` が `feature&#x2F;login` と二重エスケープ表示される [7] を解消する。dialog 側の共通エスケープ実装自体は `web/dialogs-test.md` owner（S6 TC-034）の責務。

| Case ID | Input / Precondition                                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                          | Notes                |
| ------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| TC-079  | `refName = "feature/a&b"` の worktree 付きブランチで Remove Worktree の onClick を実行 | Normal - raw name の引き渡し                                               | `showFormDialog` の checkbox 要素の `name` 引数に `&amp;` / `&#x2F;` を含まない raw の `feature/a&b`（翻訳テンプレート適用後の文字列内）が渡る。モック検証: 呼び出し引数 | 事前エスケープの除去 |
| TC-080  | 同条件で dialog を実際に描画する                                                       | Boundary - 二重エスケープの解消                                            | checkbox label の `textContent` に `feature/a&b` がそのまま表示され、`&amp;` / `&#x2F;` の literal 文字列が現れない（エスケープは dialogs.ts 境界の1回のみ）             | [7] の観測条件       |

### 失敗源インベントリ（include-or-justify）— Feature 045 追加分（S16）

| 失敗源                                             | 対応ケースまたは除外理由                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------ |
| 呼び出し側の事前エスケープによる二重エスケープ表示 | TC-079、TC-080                                                                 |
| エスケープの欠落（raw 名が HTML として展開される） | excluded(描画境界のエスケープは `web/dialogs-test.md` S6 TC-034 で担保済み)    |
| ダイアログ本文（message）のエスケープ              | excluded(本文の `escapeHtml` は変更対象外で既存挙動を維持)                     |
| git 操作への refName 引き渡し                      | excluded(送信 payload は raw refName を使う既存挙動で、本変更は表示のみに影響) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(本変更は引数の受け渡し契約のみで、検証分岐を追加しない)
- Exception: excluded(throw 経路が存在しない)
- External: excluded(外部依存なし。dialog はモックまたは jsdom 描画で観測)
- Boundary: TC-080
- Type: excluded(`name` は `string` 型で TypeScript コンパイル時に保証される)

数値・空値境界（0 / minimum / maximum / +/-1 / empty / NULL）は、本セクションの対象がエスケープ回数の契約であり仕様上意味を持たないため対象外とする（意味のある境界は `&` / `/` を含む refName の TC-079/TC-080 で充足）。

**失敗系/正常系比（煙感知器）**: 正常系1件（TC-079）、失敗系1件（TC-080）。件数が同数のためインベントリを再導出したが、本変更の失敗源は二重エスケープのみで、他の失敗源は上表の除外理由（owner 分離）により充足されていることを確認した。
