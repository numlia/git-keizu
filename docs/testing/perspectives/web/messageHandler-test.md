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

## S11: openWorktreeInNewWindow / revealWorktreeInOS レスポンスのエラー表示

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: `handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void`（`case "openWorktreeInNewWindow"` / `case "revealWorktreeInOS"` を追加）
> Target Path: `web/messageHandler.ts`（handleMessage switch。実装後に行範囲へ更新）

`handleMessage` の switch に両 command の case を追加し、`status !== null`（文字列）のときだけ操作別の翻訳キーで `showErrorDialog` を1回呼ぶ修正。成功時（`status === null`）は何も表示しない（[2] の webview 側。status の必須化により成功応答の `undefined` は到達しない。host 側の送出は `src/gitGraphView-test/` owner の責務）。

| Case ID | Input / Precondition                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                             | Notes                |
| ------- | -------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------- |
| TC-032  | `{ command: "openWorktreeInNewWindow", status: null }`   | Normal - open 成功は無表示                                                 | `showErrorDialog` が呼ばれず、`gitKeizu` の API も呼ばれない（ノーオペレーション）          | 成功時は何もしない   |
| TC-033  | `{ command: "openWorktreeInNewWindow", status: "boom" }` | Exception - open 失敗の表示                                                | `showErrorDialog` が `(t("error.openWorktreeInNewWindow"), "boom", null)` で1回だけ呼ばれる | 操作別の専用翻訳キー |
| TC-034  | `{ command: "revealWorktreeInOS", status: null }`        | Normal - reveal 成功は無表示                                               | `showErrorDialog` が呼ばれず、`gitKeizu` の API も呼ばれない                                | -                    |
| TC-035  | `{ command: "revealWorktreeInOS", status: "no" }`        | Exception - reveal 失敗の表示                                              | `showErrorDialog` が `(t("error.revealWorktreeInOS"), "no", null)` で1回だけ呼ばれる        | 操作別の専用翻訳キー |

### 失敗源インベントリ（include-or-justify）— Feature 045 追加分（S11）

| 失敗源                                        | 対応ケースまたは除外理由                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 応答が switch で未処理（エラーの握りつぶし）  | TC-033、TC-035                                                                                            |
| 成功応答の誤エラー表示                        | TC-032、TC-034                                                                                            |
| 操作別翻訳キーの取り違え・他 command との混同 | TC-033、TC-035（`showErrorDialog` の第1引数で検証）                                                       |
| 成功応答の `undefined` status                 | excluded(`status: GitCommandStatus` の必須化により型で防止。`src/types-test.md` TC-008/TC-009 で担保)     |
| 翻訳キーの欠落                                | excluded(`l10n/web/web.l10n.en.json-test.md` TC-001〜002 / `web.l10n.ja.json-test.md` TC-003〜004 で担保) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(handler は status の null / string 判定のみで、他の検証分岐を持たない)
- Exception: TC-033、TC-035
- External: excluded(外部依存なし。応答メッセージはテスト側で直接構築する)
- Boundary: excluded(`null` は成功契約値として TC-032/TC-034 で検証済み。空文字 status は host が送らない契約で、`""` は文字列としてエラー表示経路に含まれる)
- Type: excluded(応答型は TypeScript コンパイル時に保証される)

**失敗系/正常系比（煙感知器）**: 正常系2件（TC-032、TC-034）、失敗系2件（TC-033、TC-035）。件数が同数のためインベントリを再導出したが、本変更（2 command × 成功/失敗の4分岐）の失敗源は上表のとおりすべて対応ケースまたは除外理由で充足されており、追加すべき失敗系ケースはないことを確認した。
