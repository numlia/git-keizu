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
> Status: superseded
> Supersedes: -
> Superseded By: S16

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

## S16: handleMessage() deleteBranch の not fully merged 分類と説明表示

> Origin: Feature 055-01 (light-spec-plan)
> Added: 2026-08-23
> Status: active
> Supersedes: S2
> Signature: `handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void`（`case "deleteBranch"`。module 内部の `isDeleteBranchNotFullyMergedStatus(rawStatus: string): boolean` を経由）
> Target Path: `web/messageHandler.ts`（handleMessage switch の `case "deleteBranch"`。実装後に行範囲へ更新）
> Test File: `tests/web/messageHandler.test.ts`

`deleteBranch` の失敗文字列を各行の固定断片照合（行が `error: the branch '` で始まり `' is not fully merged.` で終わり、中間が1文字以上）で分類し、一致時だけ説明データ（`ErrorDialogExplanation` の4値）を `showErrorDialog` の第4引数へ渡す変更。大文字小文字変換・trim・ANSI 除去・全文一致・終了コード判定は行わず、未知入力は既存の3引数表示へ倒す（fail-closed）。成功（`status === null`）は分類せず `refresh("soft")` を1回実行する。旧 S2 は `deleteBranch` が汎用 `refreshOrError()` を通る前提の観測点だったため supersede する。説明ダイアログの DOM 契約は `web/dialogs-test.md` S7、locale 値は `l10n/web/web.l10n.en.json-test.md` S4 / `web.l10n.ja.json-test.md` S5 の責務。

| Case ID | Input / Precondition                                                                                                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                                                                 | Notes                                         |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| TC-064  | `{ command: "deleteBranch", status: "error: the branch 'feature' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D feature'" }` | Exception - 既知エラーの説明付き表示（canonical）                          | `showErrorDialog` が `(t("error.deleteBranch"), status全文, null, { summary: t("error.deleteBranchNotFullyMerged.summary"), reason: t("error.deleteBranchNotFullyMerged.reason"), guidance: t("error.deleteBranchNotFullyMerged.guidance"), rawOutputLabel: t("dialog.originalGitOutput") })` で1回呼ばれ、第2引数が受信 `status` と完全一致し、`gitKeizu.refresh` は呼ばれない | memo-確定仕様 §8.1.1                          |
| TC-065  | `{ command: "deleteBranch", status: "error: the branch 'x' is not fully merged." }`                                                                           | Boundary - 中間部が最小の1文字                                             | `showErrorDialog` が説明データ付きの4引数で1回呼ばれ、`gitKeizu.refresh` は呼ばれない                                                                                                                                                                                                                                                                                           | `length > prefix + suffix` の +1 境界         |
| TC-066  | `{ command: "deleteBranch", status: "error: the branch 'feature/it's' is not fully merged." }`                                                                | Boundary - ブランチ名内の `'`                                              | `showErrorDialog` が説明データ付きの4引数で1回呼ばれ、`gitKeizu.refresh` は呼ばれない                                                                                                                                                                                                                                                                                           | 行頭・行末契約により中間の `'` は影響しない   |
| TC-067  | `{ command: "deleteBranch", status: "warning: before\nerror: the branch 'feature' is not fully merged.\nIf you are sure..." }`                                | Exception - 前後行つき複数行の行走査                                       | `showErrorDialog` が説明データ付きの4引数で1回呼ばれ、第2引数が3行の `status` 全文と完全一致する                                                                                                                                                                                                                                                                                | 対象行が中間行でも1行あれば一致               |
| TC-068  | `{ command: "deleteBranch", status: "error: the branch '' is not fully merged." }`                                                                            | Boundary - 中間部0文字（空のブランチ名）                                   | `showErrorDialog` が `(t("error.deleteBranch"), status, null)` の3引数（第4引数 undefined）で1回呼ばれ、`gitKeizu.refresh` は呼ばれない                                                                                                                                                                                                                                         | length 条件の -1 境界。既存表示へ fallback    |
| TC-069  | `{ command: "deleteBranch", status: "error: the branch 'feature' is fully merged." }`                                                                         | Validation - suffix 不一致（`fully merged`）                               | `showErrorDialog` が3引数（第4引数 undefined）で1回呼ばれ、`gitKeizu.refresh` は呼ばれない                                                                                                                                                                                                                                                                                      | `' is not fully merged.` と後方一致しない     |
| TC-070  | `{ command: "deleteBranch", status: "ERROR: THE BRANCH 'feature' IS NOT FULLY MERGED." }`                                                                     | Validation - 大文字表記（case-sensitive）                                  | `showErrorDialog` が3引数（第4引数 undefined）で1回呼ばれ、`gitKeizu.refresh` は呼ばれない                                                                                                                                                                                                                                                                                      | 大文字小文字変換を行わない                    |
| TC-071  | `{ command: "deleteBranch", status: "エラー: ブランチは完全にマージされていません" }`                                                                         | Validation - ローカライズ済み出力                                          | `showErrorDialog` が3引数（第4引数 undefined）で1回呼ばれ、`gitKeizu.refresh` は呼ばれない                                                                                                                                                                                                                                                                                      | 固定断片が一致しない未知入力                  |
| TC-072  | `{ command: "deleteBranch", status: " error: the branch 'feature' is not fully merged." }`                                                                    | Validation - 先頭空白（trim しない）                                       | `showErrorDialog` が3引数（第4引数 undefined）で1回呼ばれ、`gitKeizu.refresh` は呼ばれない                                                                                                                                                                                                                                                                                      | 前後空白の除去を行わない                      |
| TC-073  | `{ command: "deleteBranch", status: "\u001b[31merror: the branch 'feature' is not fully merged.\u001b[0m" }`                                                  | Validation - ANSI エスケープ付き                                           | `showErrorDialog` が3引数（第4引数 undefined）で1回呼ばれ、`gitKeizu.refresh` は呼ばれない                                                                                                                                                                                                                                                                                      | ANSI 除去を行わない                           |
| TC-074  | `{ command: "deleteBranch", status: "fatal: branch not found" }`                                                                                              | Exception - 未知エラーの既存 fallback                                      | `showErrorDialog` が `(t("error.deleteBranch"), "fatal: branch not found", null)` の3引数で1回呼ばれ、`gitKeizu.refresh` は呼ばれない                                                                                                                                                                                                                                           | memo-確定仕様 §8.2.2                          |
| TC-075  | `{ command: "deleteBranch", status: null }`                                                                                                                   | Normal - 削除成功                                                          | `gitKeizu.refresh("soft")` が1回呼ばれ、`showErrorDialog` は呼ばれない                                                                                                                                                                                                                                                                                                          | 成功時は分類関数を経由しない                  |
| TC-076  | `{ command: "pull", status: "error: the branch 'feature' is not fully merged." }`                                                                             | Validation - 操作境界（pull）                                              | `showErrorDialog` が `(t("error.pull"), status, null)` の3引数（第4引数 undefined）で1回呼ばれ、説明データが渡されない                                                                                                                                                                                                                                                          | 同一文字列でも `command` が異なれば対象外     |
| TC-077  | `{ command: "removeWorktree", status: null, branchStatus: "error: the branch 'feature' is not fully merged." }`                                               | Validation - 操作境界（removeWorktree.branchStatus）                       | `gitKeizu.refresh` が1回呼ばれ、`showErrorDialog` が `(t("error.deleteBranch"), branchStatus, null)` の3引数（第4引数 undefined）で1回呼ばれる                                                                                                                                                                                                                                  | S7 TC-022 の既存挙動を維持し説明対象にしない  |
| TC-078  | `{ command: "deleteBranch", status: "" }`                                                                                                                     | Boundary - 空文字 status                                                   | `showErrorDialog` が `(t("error.deleteBranch"), "", null)` の3引数（第4引数 undefined）で1回呼ばれ、`gitKeizu.refresh` は呼ばれない                                                                                                                                                                                                                                             | empty 境界。空行1件のみで固定断片に一致しない |

### 失敗源インベントリ（include-or-justify）— Feature 055-01 追加分（S16）

| 失敗源                                                    | 対応ケースまたは除外理由                                                                              |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 既知エラーを分類できない（説明の表示漏れ）                | TC-064、TC-065、TC-066、TC-067                                                                        |
| 中間部 length 境界の誤判定（0文字 / 1文字）               | TC-065、TC-068                                                                                        |
| 未知入力を既知分類へ倒す（fail-closed 破り）              | TC-069、TC-070、TC-071、TC-072、TC-073、TC-078                                                        |
| 未知エラーの既存3引数表示の破壊                           | TC-074                                                                                                |
| 成功時の誤分類・誤ダイアログ・refresh 漏れ                | TC-075                                                                                                |
| 操作境界の破り（同一文字列の他 command を説明対象にする） | TC-076、TC-077                                                                                        |
| 原文の一部欠落・加工（説明時に `status` を書き換える）    | TC-064、TC-067（第2引数と受信 `status` の完全一致で担保）                                             |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL）     | TC-065 / TC-068（中間部 ±1）、TC-078（empty）、TC-075（null）。payload に数値境界はないため他は対象外 |
| locale 値の欠落・不一致                                   | excluded(`l10n/web/web.l10n.en.json-test.md` S4 / `web.l10n.ja.json-test.md` S5 の責務)               |
| ダイアログ DOM 構造・escape の欠落                        | excluded(`web/dialogs-test.md` S7 の責務)                                                             |
| 外部依存の失敗                                            | excluded(外部依存なし。応答メッセージはテスト側で直接構築する)                                        |
| 不正な型・フォーマット                                    | excluded(応答型は TypeScript コンパイルと `src/types-test.md` の型契約で保証される)                   |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-069、TC-070、TC-071、TC-072、TC-073、TC-076、TC-077
- Exception: TC-064、TC-067、TC-074
- External: excluded(外部依存なし。応答メッセージはテスト側で直接構築する)
- Boundary: TC-065、TC-066、TC-068、TC-078
- Type: excluded(応答型は TypeScript コンパイル時に保証される)

**失敗系/正常系比（煙感知器）**: 正常系1件（TC-075）、失敗系14件。比は14で、固定断片照合の反例 inventory（正規化なし・fail-closed・操作境界）から導出した結果である。なおプラン §4 Task 1 の列挙14項目に対し、テスト戦略の empty 境界を充足する空文字 `status`（TC-078）を inventory から補完して15件とした。
