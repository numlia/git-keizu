# テスト観点表: web/messageHandler.ts

> Source: `web/messageHandler.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: handleMessage() pull/pushレスポンス処理

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 3.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

**シグネチャ**: `handleMessage(msg: ResponseMessage, gitGraph: GitGraphViewAPI): void`
**テスト対象パス**: `web/messageHandler.ts`

| Case ID | Input / Precondition                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                | Notes                   |
| ------- | -------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------- |
| TC-001  | ResponsePull: status = null            | Normal - success                                                           | グラフリフレッシュが呼ばれる                   | refreshOrError パターン |
| TC-002  | ResponsePush: status = null            | Normal - success                                                           | グラフリフレッシュが呼ばれる                   | refreshOrError パターン |
| TC-003  | ResponsePull: status = "error message" | Exception - handled error                                                  | エラーダイアログ "Unable to Pull" が表示される | gitメッセージ表示       |
| TC-004  | ResponsePush: status = "error message" | Exception - handled error                                                  | エラーダイアログ "Unable to Push" が表示される | gitメッセージ表示       |

## S2: refreshOrError() ソフトリフレッシュ引数検証

> Origin: Feature 004 (webview-ux-polish) (aidd-spec-tasks-test)
> Added: 2026-02-26
> Status: active
> Supersedes: -

**シグネチャ**: `refreshOrError(gitGraph: GitGraphViewAPI, status: string | null, errorMessage: string): void`
**テスト対象パス**: `web/messageHandler.ts:142-144`

| Case ID | Input / Precondition                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                       | Notes                                             |
| ------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------- |
| TC-005  | refreshOrError経由コマンド (例: deleteBranch), status = null            | Normal - standard                                                          | gitGraph.refresh(false) が呼ばれる（hard=false でソフトリフレッシュ） | REQ-2.1: hard パラメータが false であることが重要 |
| TC-006  | refreshOrError経由コマンド (例: deleteBranch), status = "error message" | Exception - handled error                                                  | showErrorDialog が呼ばれ、gitGraph.refresh は呼ばれない               | REQ-2.2: エラー時はリフレッシュしない             |

## S3: handleMessage() selectRepo レスポンス処理

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**シグネチャ**: `handleMessage(msg: ResponseMessage, gitGraph: GitGraphViewAPI): void`
**テスト対象パス**: `web/messageHandler.ts`

| Case ID | Input / Precondition                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                          | Notes                |
| ------- | ------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------- | -------------------- |
| TC-007  | ResponseSelectRepo: repo = "/path/to/repo" | Normal - standard                                                          | gitGraph.selectRepo(msg.repo) が呼ばれる | 正常ルーティング     |
| TC-008  | ResponseSelectRepo メッセージ処理          | Normal - standard                                                          | エラーなく処理が完了する                 | switch case 追加検証 |

## S4: handleMessage() deleteRemoteBranch/rebaseBranch レスポンス処理

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**シグネチャ**: `handleMessage(msg: ResponseMessage, gitGraph: GitGraphViewAPI): void`
**テスト対象パス**: `web/messageHandler.ts`

| Case ID | Input / Precondition                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                | Notes                   |
| ------- | ---------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------- |
| TC-009  | ResponseDeleteRemoteBranch: status = null            | Normal - success                                                           | グラフリフレッシュが呼ばれる                                   | refreshOrError パターン |
| TC-010  | ResponseDeleteRemoteBranch: status = "error message" | Exception - handled error                                                  | エラーダイアログ "Unable to Delete Remote Branch" が表示される | git メッセージ表示      |
| TC-011  | ResponseRebaseBranch: status = null                  | Normal - success                                                           | グラフリフレッシュが呼ばれる                                   | refreshOrError パターン |
| TC-012  | ResponseRebaseBranch: status = "error message"       | Exception - handled error                                                  | エラーダイアログ "Unable to Rebase Branch" が表示される        | git メッセージ表示      |

## S5: handleMessage() loadCommits authors 受け渡し

> Origin: Feature 011 (author-filter-fix) (aidd-spec-tasks-test)
> Added: 2026-03-05
> Status: active
> Supersedes: -

**シグネチャ**: `handleMessage(msg: ResponseMessage, gitGraph: GitGraphViewAPI): void`
**テスト対象パス**: `web/messageHandler.ts`

| Case ID | Input / Precondition                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                            | Notes                        |
| ------- | -------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------- |
| TC-013  | ResponseLoadCommits: authors=["Alice","Bob"]             | Normal - standard                                                          | gitGraph.loadCommits が authors=["Alice","Bob"] を含むパラメータで呼ばれる | authors フィールドの転送検証 |
| TC-014  | ResponseLoadCommits: authors フィールドなし（undefined） | Normal - no authors                                                        | gitGraph.loadCommits が authors=undefined で呼ばれる                       | optional フィールド未設定時  |

## S6: createWorktree/removeWorktree/openTerminal レスポンス処理

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: active
> Supersedes: -

**シグネチャ**: `handleMessage(msg: ResponseMessage, gitGraph: GitGraphViewAPI): void`
**テスト対象パス**: `web/messageHandler.ts`

| Case ID | Input / Precondition                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                           | Notes            |
| ------- | ------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------- |
| TC-015  | ResponseCreateWorktree: status = null            | Normal - success                                                           | refreshOrError が呼ばれ、グラフリフレッシュ               | REQ-3.1, REQ-3.2 |
| TC-016  | ResponseCreateWorktree: status = "error message" | Exception - handled error                                                  | エラーダイアログ "Unable to Create Worktree" が表示される | -                |
| TC-017  | ResponseRemoveWorktree: status = null            | Normal - success                                                           | refreshOrError が呼ばれ、グラフリフレッシュ               | REQ-4.1          |
| TC-018  | ResponseRemoveWorktree: status = "error message" | Exception - handled error                                                  | エラーダイアログ "Unable to Remove Worktree" が表示される | -                |
| TC-019  | ResponseOpenTerminal                             | Normal - standard                                                          | ノーオペレーション（エラーなく処理完了）                  | REQ-9.1          |

## S7: removeWorktree ブランチ削除結果の表示

> Origin: Feature 019 (worktree-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-15
> Status: active
> Supersedes: -

**シグネチャ**: `handleMessage(msg: ResponseMessage, gitGraph: GitGraphViewAPI): void`
**テスト対象パス**: `web/messageHandler.ts`

| Case ID | Input / Precondition                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                          | Notes       |
| ------- | ------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------- | ----------- |
| TC-020  | status=null, branchStatus=undefined        | Normal - standard                                                          | グラフリフレッシュ（既存動作同等、ブランチ削除未要求）   | REQ-4.2     |
| TC-021  | status=null, branchStatus=null             | Normal - standard                                                          | グラフリフレッシュ（worktree + ブランチ両方削除成功）    | REQ-4.2-TC1 |
| TC-022  | status=null, branchStatus="error msg"      | Normal - partial success                                                   | グラフリフレッシュ + ブランチ削除失敗エラー表示          | REQ-4.2-TC2 |
| TC-023  | status="error msg", branchStatus=undefined | Exception - handled error                                                  | エラーダイアログ "Unable to Remove Worktree"（既存動作） | REQ-4.2-TC5 |

## S8: handleMessage() openFile レスポンス処理

> Origin: Feature 026 (commit-detail-open-file) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: active
> Supersedes: -

**シグネチャ**: `handleMessage(msg: ResponseMessage, gitGraph: GitGraphViewAPI): void`
**テスト対象パス**: `web/messageHandler.ts`

| Case ID | Input / Precondition                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                     | Notes                         |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------- |
| TC-024  | ResponseOpenFile: command="openFile", status=null            | Normal - success                                                           | showErrorDialog が呼ばれない。gitGraph のメソッドも呼ばれない（ノーオペレーション） | 成功時は何もしない            |
| TC-025  | ResponseOpenFile: command="openFile", status="error message" | Exception - error display                                                  | showErrorDialog が ("Unable to open file", "error message", null) で呼ばれる        | removeWorktree パターンと同一 |

## S9: handleMessage() setShowRecentActions レスポンス処理

> Origin: Feature 039 (show-recent-actions-runtime-sync) (light-spec-plan)
> Added: 2026-05-10
> Status: active
> Supersedes: -

**シグネチャ**: `handleMessage(msg: ResponseMessage, gitGraph: GitGraphViewAPI): void`
**テスト対象パス**: `web/messageHandler.ts`

| Case ID | Input / Precondition                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                               | Notes                                |
| ------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| TC-026  | ResponseSetShowRecentActions: command="setShowRecentActions", showRecentActions=true  | Normal - standard                                                          | `gitKeizu.setShowRecentActions(true)` が 1 回呼ばれる。`refresh` / `showErrorDialog` / 他の API は呼ばれない  | runtime 同期経路の routing を検証    |
| TC-027  | ResponseSetShowRecentActions: command="setShowRecentActions", showRecentActions=false | Normal - standard                                                          | `gitKeizu.setShowRecentActions(false)` が 1 回呼ばれる。`refresh` / `showErrorDialog` / 他の API は呼ばれない | 設定値 `false` でも routing は同経路 |

## S10: commitDetails レスポンスの fileTree 生成 try/catch

> Origin: フェーズ2 修正 M13 (commit-details-file-tree-guard)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: `handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void`（`case "commitDetails"`）
> Target Path: `web/messageHandler.ts:55-75`

`commitDetails` レスポンスの `else`（`msg.commitDetails !== null`）分岐で `generateGitFileTree(msg.commitDetails.fileChanges)` を `try/catch` で包む修正。ツリー構築が例外を投げた場合に `hideCommitDetails()` でローディングを解除し、`showErrorDialog(t("error.commitDetails"), error instanceof Error ? error.message : null, null)` を表示する。

| Case ID | Input / Precondition                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                              | Notes                             |
| ------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| TC-028  | `msg.commitDetails` が有効、`generateGitFileTree` が正常にツリーを返す               | Normal - success                                                           | `gitKeizu.showCommitDetails(msg.commitDetails, fileTree)` が1回呼ばれる。`hideCommitDetails` と `showErrorDialog` は呼ばれない               | 成功経路                          |
| TC-029  | `msg.commitDetails` が有効、`generateGitFileTree` が `Error("dup")` を throw         | Exception - handled error                                                  | `gitKeizu.hideCommitDetails()` が1回 + `showErrorDialog(t("error.commitDetails"), "dup", null)` が呼ばれる。`showCommitDetails` は呼ばれない | catch 経路（Error インスタンス）  |
| TC-030  | `msg.commitDetails` が有効、`generateGitFileTree` が非 Error（文字列 `"x"`）を throw | Type - non-Error thrown                                                    | `showErrorDialog(t("error.commitDetails"), null, null)` が呼ばれる（`error instanceof Error` が false のため message が `null`）             | 非 Error 例外時の message null    |
| TC-031  | `msg.commitDetails === null`                                                         | Validation - null commit details                                           | `gitKeizu.hideCommitDetails()` + `showErrorDialog(t("error.commitDetails"), null, null)` が呼ばれ、`generateGitFileTree` は呼ばれない        | null ガード（catch には入らない） |
