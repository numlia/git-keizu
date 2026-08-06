# テスト観点表: web/messageHandler.ts

> Source: `web/messageHandler.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: basic-responses

## S1: handleMessage() pull/pushレスポンス処理

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 3.3
> Added: 2026-02-25
> Status: superseded
> Supersedes: -
> Superseded By: S12

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

| Case ID | Input / Precondition                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                         | Notes                                 |
| ------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------- |
| TC-005  | refreshOrError経由コマンド (例: deleteBranch), status = null            | Normal - standard                                                          | `gitGraph.refresh("soft")` が呼ばれる                   | REQ-2.1: soft モードであることが重要  |
| TC-006  | refreshOrError経由コマンド (例: deleteBranch), status = "error message" | Exception - handled error                                                  | showErrorDialog が呼ばれ、gitGraph.refresh は呼ばれない | REQ-2.2: エラー時はリフレッシュしない |

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
