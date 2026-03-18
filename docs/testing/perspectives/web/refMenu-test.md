# テスト観点表: web/refMenu.ts

## S1: checkoutBranchAction() ブランチ名提案ロジック

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 2.2
> Added: 2026-02-25

**シグネチャ**: `checkoutBranchAction(repo: string, sourceElem: HTMLElement, refName: string, isRemoteCombined?: boolean): void`
**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition             | Perspective (Equivalence / Boundary) | Expected Result | Notes                                |
| ------- | -------------------------------- | ------------------------------------ | --------------- | ------------------------------------ |
| TC-001  | refName = "origin/feature/ebook" | Equivalence - normal (2階層)         | "feature/ebook" | 最初のスラッシュ以降を取得           |
| TC-002  | refName = "origin/main"          | Equivalence - normal (1階層)         | "main"          | リモート名のみ除去                   |
| TC-003  | refName = "origin/a/b/c"         | Equivalence - normal (3階層)         | "a/b/c"         | 深いネスト対応                       |
| TC-004  | refName = "upstream/feature/x"   | Equivalence - normal (別リモート)    | "feature/x"     | originではないリモート名             |
| TC-005  | refName = "origin"               | Boundary - スラッシュなし            | "" (空文字列)   | 仕様上通常は発生しないが防御的に処理 |
| TC-006  | refName = "o/x"                  | Boundary - min (最短パス)            | "x"             | 1文字リモート名 + 1文字ブランチ名    |

## S2: buildRefContextMenuItems() Pull/Pushメニュー項目

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 3.3
> Added: 2026-02-25

**シグネチャ**: `buildRefContextMenuItems(repo: string, refName: string, sourceElem: HTMLElement, isRemote: boolean, gitBranchHead: string | null): (ContextMenuElement | null)[]`
**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                           | Perspective (Equivalence / Boundary) | Expected Result                     | Notes                        |
| ------- | ---------------------------------------------- | ------------------------------------ | ----------------------------------- | ---------------------------- |
| TC-007  | gitBranchHead === refName (カレントブランチ)   | Equivalence - normal                 | メニューにPull/Push項目が含まれる   | メニュー先頭に配置           |
| TC-008  | Pull/Push項目のタイトル                        | Equivalence - normal                 | "Pull" と "Push"                    | 表示文言の確認               |
| TC-009  | gitBranchHead !== refName (非カレントブランチ) | Equivalence - exclusion              | メニューにPull/Push項目が含まれない | カレントブランチのみ表示     |
| TC-010  | refType === "remote" (リモートブランチ)        | Equivalence - exclusion              | メニューにPull/Push項目が含まれない | ローカルカレントブランチのみ |

## S3: parseRemoteRef() リモート名分離ユーティリティ

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01

**シグネチャ**: `parseRemoteRef(refName: string): { remoteName: string; branchName: string }`
**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                | Perspective (Equivalence / Boundary) | Expected Result                                                     | Notes                                   |
| ------- | ----------------------------------- | ------------------------------------ | ------------------------------------------------------------------- | --------------------------------------- |
| TC-011  | refName = "origin/feature/x"        | Equivalence - normal (2階層)         | { remoteName: "origin", branchName: "feature/x" }                   | 最初のスラッシュで分割                  |
| TC-012  | refName = "origin/main"             | Equivalence - normal (1階層)         | { remoteName: "origin", branchName: "main" }                        | リモート名のみ除去                      |
| TC-013  | refName = "upstream/a/b/c"          | Equivalence - normal (深いネスト)    | { remoteName: "upstream", branchName: "a/b/c" }                     | 2つ目以降のスラッシュはブランチ名に含む |
| TC-014  | refName = "o/x"                     | Boundary - min (最短パス)            | { remoteName: "o", branchName: "x" }                                | 1文字リモート + 1文字ブランチ           |
| TC-015  | refName = "origin" (スラッシュなし) | Boundary - no separator              | { remoteName: "origin", branchName: "" } または適切なフォールバック | 仕様上通常は発生しない                  |

## S4: buildRefContextMenuItems() リモートブランチメニュー項目

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01

**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition          | Perspective (Equivalence / Boundary) | Expected Result                                                   | Notes                           |
| ------- | ----------------------------- | ------------------------------------ | ----------------------------------------------------------------- | ------------------------------- |
| TC-016  | sourceElem がリモートブランチ | Equivalence - normal                 | メニューに "Delete Remote Branch..." 項目が含まれる               | -                               |
| TC-017  | sourceElem がリモートブランチ | Equivalence - normal                 | メニューに "Merge into current branch..." 項目が含まれる          | 既存 mergeBranch コマンド再利用 |
| TC-018  | sourceElem がローカルブランチ | Equivalence - exclusion              | メニューに "Delete Remote Branch..." が含まれない                 | ローカルには不要                |
| TC-019  | Delete Remote Branch 選択     | Equivalence - normal                 | 確認ダイアログが表示される                                        | showConfirmationDialog          |
| TC-020  | Merge (remote) 選択           | Equivalence - normal                 | チェックボックスダイアログ（fast-forward オプション）が表示される | showCheckboxDialog              |

## S5: buildRefContextMenuItems() Rebase メニュー項目

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01

**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                    | Perspective (Equivalence / Boundary) | Expected Result                                                | Notes                      |
| ------- | --------------------------------------- | ------------------------------------ | -------------------------------------------------------------- | -------------------------- |
| TC-021  | sourceElem がローカルブランチ（非HEAD） | Equivalence - normal                 | メニューに "Rebase current branch on Branch..." 項目が含まれる | gitBranchHead !== refName  |
| TC-022  | sourceElem が HEAD ブランチ             | Equivalence - exclusion              | メニューに "Rebase..." が含まれない                            | 自分自身へのリベースは不可 |
| TC-023  | sourceElem がリモートブランチ           | Equivalence - exclusion              | メニューに "Rebase..." が含まれない                            | ローカルブランチのみ       |
| TC-024  | Rebase 選択                             | Equivalence - normal                 | 確認ダイアログが表示される                                     | showConfirmationDialog     |

## S6: Delete Branch ダイアログ拡張（リモート同時削除）

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01

**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                | Perspective (Equivalence / Boundary) | Expected Result                                                                         | Notes               |
| ------- | ----------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------- | ------------------- |
| TC-025  | remotes = ["origin"] (リモートあり) | Equivalence - normal                 | showFormDialog: "Force Delete" + "Delete this branch on the remote" の2チェックボックス | showFormDialog 切替 |
| TC-026  | remotes = [] (リモートなし)         | Equivalence - normal (no remote)     | showCheckboxDialog: "Force Delete" のみ（既存動作維持）                                 | 後方互換            |
| TC-027  | リモート削除チェック ON             | Equivalence - normal                 | sendMessage に deleteOnRemotes: remotes が含まれる                                      | -                   |
| TC-028  | リモート削除チェック OFF            | Equivalence - normal                 | sendMessage に deleteOnRemotes: [] が含まれる                                           | デフォルト動作      |

## S7: Merge ダイアログ拡張（3 checkbox フォーム）

> Origin: Feature 014 (dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-09

**テスト対象パス**: `web/refMenu.ts:30-55`

| Case ID | Input / Precondition                 | Perspective (Equivalence / Boundary) | Expected Result                                                      | Notes                         |
| ------- | ------------------------------------ | ------------------------------------ | -------------------------------------------------------------------- | ----------------------------- |
| TC-029  | buildMergeBranchMenuItem 選択        | Equivalence - normal                 | showFormDialog が 3 checkbox（No FF / Squash / No Commit）で呼ばれる | showCheckboxDialog からの変更 |
| TC-030  | 3 checkbox のデフォルト値            | Equivalence - normal                 | viewState.dialogDefaults.merge の各フィールド値を反映                | commitMenu と同一構成         |
| TC-031  | callback で 3 値取得、確定ボタン押下 | Equivalence - normal                 | RequestMergeBranch に createNewCommit, squash, noCommit が含まれる   | sendMessage 検証              |
| TC-032  | Squash / No Commit checkbox の構成   | Equivalence - normal                 | info プロパティ（ツールチップテキスト）が設定されている              | commitMenu と同一テキスト     |

## S8: buildRefContextMenuItems() worktree 関連メニュー項目

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12

**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                                             | Perspective (Equivalence / Boundary) | Expected Result                                                                                | Notes            |
| ------- | ---------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------- | ---------------- |
| TC-033  | ローカルブランチ、worktreeInfo = null                            | Equivalence - normal                 | メニューに "Create Worktree..." が含まれる                                                     | REQ-2.3-TC1      |
| TC-034  | ローカルブランチ、worktreeInfo = { path, isMainWorktree: false } | Equivalence - normal                 | メニューに "Open Terminal Here" / "Copy Worktree Path" / "Remove Worktree" の 3 項目が含まれる | REQ-2.3-TC2      |
| TC-035  | ローカルブランチ、worktreeInfo = { path, isMainWorktree: true }  | Equivalence - normal (main wt)       | メニューに "Open Terminal Here" / "Copy Worktree Path" のみ（Remove Worktree なし）            | REQ-2.3-TC4      |
| TC-036  | リモートブランチ                                                 | Equivalence - exclusion              | worktree 関連メニュー項目が一切含まれない                                                      | REQ-2.3-TC3      |
| TC-037  | Create Worktree... 選択                                          | Equivalence - normal                 | showFormDialog が Path + Open Terminal の 2 フィールドで呼ばれる                               | REQ-3.2, REQ-3.3 |
| TC-038  | Create Worktree ダイアログの Path デフォルト値                   | Equivalence - normal                 | `../<repoName>-<branchName>` 形式                                                              | REQ-3.3-TC3      |
| TC-039  | Open Terminal Here 選択                                          | Equivalence - normal                 | sendMessage openTerminal に path と name が含まれる                                            | REQ-9.1          |
| TC-040  | Copy Worktree Path 選択                                          | Equivalence - normal                 | sendMessage copyToClipboard に type: "worktreePath" と data: path が含まれる                   | REQ-9.2          |
| TC-041  | Remove Worktree 選択                                             | Equivalence - normal                 | showConfirmationDialog が呼ばれ、確認メッセージにブランチ名とパスが含まれる                    | REQ-4.1          |

## S11: Create Worktree ダイアログ Open Terminal 設定反映

> Origin: Feature 019 (worktree-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-15
> Updated: 2026-03-17 (S9→S11, TC-ID renumbered to avoid collision with existing S9/S10)

**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                                       | Perspective (Equivalence / Boundary) | Expected Result                                                     | Notes       |
| ------- | ---------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------- | ----------- |
| TC-048  | viewState.dialogDefaults.createWorktree.openTerminal=true  | Equivalence - normal                 | showFormDialog の Open Terminal チェックボックスが checked で表示   | REQ-9.1-TC1 |
| TC-049  | viewState.dialogDefaults.createWorktree.openTerminal=false | Equivalence - normal                 | showFormDialog の Open Terminal チェックボックスが unchecked で表示 | REQ-9.1-TC2 |

## S12: Remove Worktree ブランチ同時削除ダイアログ

> Origin: Feature 019 (worktree-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-15
> Updated: 2026-03-17 (S10→S12, TC-ID renumbered to avoid collision with existing S9/S10)

**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                                       | Perspective (Equivalence / Boundary) | Expected Result                                                   | Notes                |
| ------- | ---------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------- | -------------------- |
| TC-050  | Remove Worktree 選択、非メインworktree                     | Equivalence - normal                 | showFormDialog がチェックボックス入力付きで呼ばれる               | REQ-4.1-TC1          |
| TC-051  | viewState.dialogDefaults.removeWorktree.deleteBranch=true  | Equivalence - normal                 | チェックボックスのデフォルトが checked                            | REQ-9.2-TC1          |
| TC-052  | viewState.dialogDefaults.removeWorktree.deleteBranch=false | Equivalence - normal                 | チェックボックスのデフォルトが unchecked                          | REQ-9.2-TC2          |
| TC-053  | チェックボックスの info プロパティ確認                     | Equivalence - normal                 | 安全な削除（git branch -d）の説明テキストが info に設定されている | REQ-4.1-TC2          |
| TC-054  | チェックON + Remove ボタン押下                             | Equivalence - normal                 | sendMessage に deleteBranch: true が含まれる                      | REQ-4.1              |
| TC-055  | チェックOFF + Remove ボタン押下                            | Equivalence - normal                 | sendMessage に deleteBranch: false が含まれる                     | REQ-4.1              |
| TC-056  | ダイアログのアクションボタン名                             | Equivalence - normal                 | ボタンテキストが "Remove" である                                  | REQ-4.1              |
| TC-057  | 確認メッセージの内容                                       | Equivalence - normal                 | メッセージにブランチ名と worktree パスが含まれる                  | REQ-4.1 既存動作維持 |
