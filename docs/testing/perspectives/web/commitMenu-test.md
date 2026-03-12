# テスト観点表: web/commitMenu.ts

> Source: `web/commitMenu.ts`
> Generated: 2026-03-07T00:00:00+09:00

## S1: Create Branch ダイアログ（checkout チェックボックス付き）

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07

**テスト対象パス**: `web/commitMenu.ts:59-75`

| Case ID | Input / Precondition                           | Perspective (Equivalence / Boundary) | Expected Result                                              | Notes                     |
| ------- | ---------------------------------------------- | ------------------------------------ | ------------------------------------------------------------ | ------------------------- |
| TC-001  | Create Branch メニュー項目選択                 | Equivalence - normal                 | showFormDialog が text-ref + checkbox の 2 要素で呼ばれる    | showRefInputDialog でない |
| TC-002  | ダイアログ表示時のチェックボックスデフォルト値 | Equivalence - normal                 | Check out チェックボックスのデフォルトが ON (true) である    | 設計仕様                  |
| TC-003  | 有効なブランチ名 + checkout=true で送信        | Equivalence - normal                 | RequestCreateBranch メッセージに checkout: true が含まれる   | -                         |
| TC-004  | 有効なブランチ名 + checkout=false で送信       | Equivalence - normal                 | RequestCreateBranch メッセージに checkout: false が含まれる  | -                         |
| TC-005  | ブランチ名が空で送信                           | Boundary - empty name                | ダイアログのバリデーションにより送信が阻止される             | 既存バリデーション維持    |
| TC-006  | ブランチ名に不正文字を含む（refInvalid）       | Boundary - invalid ref               | ダイアログのリアルタイム検証でエラーインジケータが表示される | 既存バリデーション維持    |

## S2: Merge ダイアログ拡張（3 checkbox フォーム）

> Origin: Feature 014 (dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-09

**テスト対象パス**: `web/commitMenu.ts:184-210`

| Case ID | Input / Precondition                     | Perspective (Equivalence / Boundary)    | Expected Result                                                                                | Notes                         |
| ------- | ---------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------- |
| TC-007  | Merge メニュー項目選択（コミット merge） | Equivalence - normal                    | showFormDialog が 3 checkbox で呼ばれる                                                        | showCheckboxDialog からの変更 |
| TC-008  | No FF checkbox デフォルト値              | Equivalence - normal                    | viewState.dialogDefaults.merge.noFastForward を反映                                            | -                             |
| TC-009  | Squash checkbox デフォルト値             | Equivalence - normal                    | viewState.dialogDefaults.merge.squashCommits を反映                                            | -                             |
| TC-010  | No Commit checkbox デフォルト値          | Equivalence - normal                    | viewState.dialogDefaults.merge.noCommit を反映                                                 | -                             |
| TC-011  | callback で 3 値取得、確定ボタン押下     | Equivalence - normal                    | RequestMergeCommit に createNewCommit, squash, noCommit が含まれる                             | sendMessage 検証              |
| TC-012  | Squash checkbox の構成                   | Equivalence - normal                    | Squash checkbox に info プロパティ（ツールチップテキスト）が設定されている                     | -                             |
| TC-013  | No Commit checkbox の構成                | Equivalence - normal                    | No Commit checkbox に info プロパティ（ツールチップテキスト）が設定されている                  | -                             |
| TC-014  | Squash ON に変更                         | Equivalence - normal (mutual exclusion) | No FF checkbox が disabled + unchecked になる                                                  | UI 排他制御                   |
| TC-015  | Squash ON → OFF に変更                   | Equivalence - normal (mutual exclusion) | No FF checkbox が enabled + デフォルト値（viewState.dialogDefaults.merge.noFastForward）に復元 | UI 排他制御復元               |

## S3: Cherry-pick ダイアログ拡張（2 checkbox フォーム）

> Origin: Feature 014 (dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-09

**テスト対象パス**: `web/commitMenu.ts:98-140`

| Case ID | Input / Precondition                                    | Perspective (Equivalence / Boundary) | Expected Result                                                        | Notes                             |
| ------- | ------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------- | --------------------------------- |
| TC-016  | Cherry Pick 通常コミット（parent 1 つ）                 | Equivalence - normal                 | showFormDialog が 2 checkbox で呼ばれる                                | showConfirmationDialog からの変更 |
| TC-017  | Cherry Pick マージコミット（parent 複数）               | Equivalence - normal                 | showFormDialog が select + 2 checkbox で呼ばれる                       | showSelectDialog からの変更       |
| TC-018  | Record Origin checkbox デフォルト値                     | Equivalence - normal                 | viewState.dialogDefaults.cherryPick.recordOrigin を反映                | -                                 |
| TC-019  | No Commit checkbox デフォルト値                         | Equivalence - normal                 | viewState.dialogDefaults.cherryPick.noCommit を反映                    | -                                 |
| TC-020  | callback で recordOrigin, noCommit 取得、確定ボタン押下 | Equivalence - normal                 | RequestCherrypickCommit に recordOrigin, noCommit が含まれる           | sendMessage 検証                  |
| TC-021  | Record Origin / No Commit checkbox の構成               | Equivalence - normal                 | 両 checkbox に info プロパティ（ツールチップテキスト）が設定されている | -                                 |

## S4: Create Worktree Here ダイアログ

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12

**テスト対象パス**: `web/commitMenu.ts`

| Case ID | Input / Precondition                  | Perspective (Equivalence / Boundary) | Expected Result                                                                                             | Notes            |
| ------- | ------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ---------------- |
| TC-022  | Create Worktree Here メニュー項目選択 | Equivalence - normal                 | showFormDialog が Branch Name (text-ref) + Path (text) + Open Terminal (checkbox) の 3 フィールドで呼ばれる | REQ-3.1, REQ-3.3 |
| TC-023  | Branch Name フィールドが空            | Boundary - empty name                | text-ref バリデーションにより送信ボタンが無効化される                                                       | REQ-3.1-TC3      |
| TC-024  | Path デフォルト値                     | Equivalence - normal                 | `../<repoName>-` 形式（ブランチ名入力前）                                                                   | REQ-3.3          |
| TC-025  | Open Terminal デフォルト値            | Equivalence - normal                 | チェック ON (checked)                                                                                       | REQ-3.3-TC4      |
| TC-026  | 有効入力で送信                        | Equivalence - normal                 | RequestCreateWorktree に repo, path, branchName, commitHash, openTerminal が含まれる                        | REQ-3.1          |
| TC-027  | Branch Name 入力時の Path 動的更新    | Equivalence - normal (dynamic)       | Branch Name 入力に連動して Path が `../<repoName>-<branchName>` に更新される                                | REQ-3.3          |
| TC-028  | Path 手動編集後に Branch Name を変更  | Boundary - manual edit               | ユーザーが Path を手動編集した後は Branch Name 変更時に Path が自動更新されない                             | UX: 手動編集優先 |
