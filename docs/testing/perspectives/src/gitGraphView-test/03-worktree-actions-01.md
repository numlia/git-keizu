# テスト観点表: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Generated: 2026-05-02T01:45:44Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: worktree-actions

## S13: merge/cherry-pick ハンドラ拡張 + viewState dialogDefaults

> Origin: Feature 014 (dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-09
> Status: active
> Supersedes: -

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                  | Notes            |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------- |
| TC-039  | getHtmlForWebview() 呼び出し                                 | Normal - standard                                                          | viewState に dialogDefaults が含まれ、Config.dialogDefaults() の返却値と一致する | 設定パイプライン |
| TC-040  | RequestMergeBranch (squash=true, noCommit=false)             | Normal - standard                                                          | DataSource.mergeBranch に squash=true, noCommit=false が渡される                 | -                |
| TC-041  | RequestMergeCommit (squash=false, noCommit=true)             | Normal - standard                                                          | DataSource.mergeCommit に squash=false, noCommit=true が渡される                 | -                |
| TC-042  | RequestCherrypickCommit (recordOrigin=true, noCommit=true)   | Normal - standard                                                          | DataSource.cherrypickCommit に recordOrigin=true, noCommit=true が渡される       | -                |
| TC-043  | RequestCherrypickCommit (recordOrigin=false, noCommit=false) | Normal - standard                                                          | DataSource.cherrypickCommit に recordOrigin=false, noCommit=false が渡される     | 従来互換         |

## S15: createWorktree/removeWorktree/openTerminal メッセージハンドラ

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: active
> Supersedes: -

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                      | Notes                |
| ------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------- |
| TC-048  | RequestCreateWorktree（commitHash なし, openTerminal=false）                  | Normal - standard                                                          | DataSource.addWorktree が正しい引数で呼ばれ、ResponseCreateWorktree が送信される。ターミナル起動なし | REQ-3.2              |
| TC-049  | RequestCreateWorktree（commitHash あり, openTerminal=true）、addWorktree 成功 | Normal - with terminal                                                     | addWorktree 呼出後、createTerminal が name + cwd 付きで呼ばれ、terminal.show() 実行                  | REQ-3.1, REQ-3.1-TC6 |
| TC-050  | RequestCreateWorktree、addWorktree 失敗（エラー文字列返却）                   | Exception - handled error                                                  | ResponseCreateWorktree に status（エラー文字列）が含まれ、ターミナル起動なし                         | -                    |
| TC-051  | RequestRemoveWorktree                                                         | Normal - standard                                                          | DataSource.removeWorktree が呼ばれ、ResponseRemoveWorktree が送信される                              | REQ-4.1              |
| TC-052  | RequestOpenTerminal                                                           | Normal - standard                                                          | createTerminal が name + cwd 付きで呼ばれ、terminal.show() 実行。ResponseOpenTerminal 送信           | REQ-9.1              |

## S16: removeWorktree ハンドラ ブランチ同時削除

> Origin: Feature 019 (worktree-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-15
> Status: active
> Supersedes: -

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                  | Notes            |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------- |
| TC-053  | deleteBranch=true, worktree 削除成功(null), branch 削除成功(null)    | Normal - standard                                                          | ResponseRemoveWorktree: status=null, branchStatus=null                           | REQ-4.2-TC1      |
| TC-054  | deleteBranch=true, worktree 削除成功(null), branch 削除失敗("error") | Normal - partial success                                                   | ResponseRemoveWorktree: status=null, branchStatus="error message"                | REQ-4.2-TC2      |
| TC-055  | deleteBranch=true, worktree 削除失敗("error")                        | Exception - handled error                                                  | ResponseRemoveWorktree: status="error", branchStatus 未設定。deleteBranch 未呼出 | REQ-4.2-TC5      |
| TC-056  | deleteBranch=false, worktree 削除成功(null)                          | Normal - standard                                                          | ResponseRemoveWorktree: status=null, branchStatus 未設定。deleteBranch 未呼出    | REQ-4.2-TC3      |
| TC-057  | deleteBranch=undefined (旧 webview 互換)                             | Boundary - legacy compat                                                   | deleteBranch 未呼出、false としてフォールバック                                  | REQ-4.2 後方互換 |
| TC-058  | deleteBranch=true 時の forceDelete パラメータ検証                    | Normal - constraint                                                        | dataSource.deleteBranch の第3引数が false（安全な削除）固定                      | REQ-4.2-TC4      |

## S22: openWorktreeInNewWindow / revealWorktreeInOS の個別 try/catch と status 応答

> Origin: フェーズ2 修正 M5 (worktree-command-error-response)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: `case "openWorktreeInNewWindow"` / `case "revealWorktreeInOS"`（`onDidReceiveMessage`）
> Target Path: `src/gitGraphView.ts:638-665`

`openWorktreeInNewWindow`（`vscode.openFolder`）と `revealWorktreeInOS`（`revealFileInOS`）の `executeCommand` を個別の `try/catch` で包む修正。成功時は `sendMessage({ command })`（status なし）、失敗時は `sendMessage({ command, status: error instanceof Error ? error.message : String(error) })` を返す。`types.ts` の両レスポンスに optional `status?` を追加済み。

| Case ID | Input / Precondition                                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                 | Notes                         |
| ------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------- |
| TC-080  | `openWorktreeInNewWindow`、`executeCommand("vscode.openFolder", ...)` が成功    | Normal - open success                                                      | `sendMessage({ command: "openWorktreeInNewWindow" })` が呼ばれる（`status` フィールド無し）     | 成功時は status 無し          |
| TC-081  | `openWorktreeInNewWindow`、`executeCommand` が `Error("boom")` で reject        | Exception - open command failure                                           | `sendMessage({ command: "openWorktreeInNewWindow", status: "boom" })` が呼ばれる                | Error インスタンス時 message  |
| TC-082  | `openWorktreeInNewWindow`、`executeCommand` が非 Error（文字列 `"x"`）で reject | Type - non-Error rejection                                                 | `sendMessage({ command: "openWorktreeInNewWindow", status: "x" })`（`String(error)`）が呼ばれる | 非 Error 時は `String(error)` |
| TC-083  | `revealWorktreeInOS`、`executeCommand("revealFileInOS", ...)` が成功            | Normal - reveal success                                                    | `sendMessage({ command: "revealWorktreeInOS" })` が呼ばれる（`status` フィールド無し）          | 成功時は status 無し          |
| TC-084  | `revealWorktreeInOS`、`executeCommand` が `Error("no")` で reject               | Exception - reveal command failure                                         | `sendMessage({ command: "revealWorktreeInOS", status: "no" })` が呼ばれる                       | Error インスタンス時 message  |
| TC-085  | `revealWorktreeInOS`、`executeCommand` が非 Error（文字列 `"y"`）で reject      | Type - non-Error rejection                                                 | `sendMessage({ command: "revealWorktreeInOS", status: "y" })`（`String(error)`）が呼ばれる      | 非 Error 時は `String(error)` |
