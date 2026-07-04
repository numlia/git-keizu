# テスト観点表: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Generated: 2026-05-02T01:45:44Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: message-routing

## S1: スタッシュメッセージルーティング

> Origin: Feature 001 (menu-bar-enhancement) Task 4.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                   | Notes                |
| ------- | ------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------- | -------------------- |
| TC-001  | RequestApplyStash メッセージ受信      | Normal - standard                                                          | DataSource.applyStash が正しい引数で呼ばれる      | mute/unmute パターン |
| TC-002  | RequestPopStash メッセージ受信        | Normal - standard                                                          | DataSource.popStash が正しい引数で呼ばれる        | mute/unmute パターン |
| TC-003  | RequestDropStash メッセージ受信       | Normal - standard                                                          | DataSource.dropStash が正しい引数で呼ばれる       | mute/unmute パターン |
| TC-004  | RequestBranchFromStash メッセージ受信 | Normal - standard                                                          | DataSource.branchFromStash が正しい引数で呼ばれる | mute/unmute パターン |

## S2: Uncommittedメッセージルーティング

> Origin: Feature 001 (menu-bar-enhancement) Task 5.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                       | Notes                |
| ------- | ----------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------- |
| TC-005  | RequestPushStash メッセージ受信           | Normal - standard                                                          | DataSource.pushStash が正しい引数で呼ばれる           | mute/unmute パターン |
| TC-006  | RequestResetUncommitted メッセージ受信    | Normal - standard                                                          | DataSource.resetUncommitted が正しい引数で呼ばれる    | mute/unmute パターン |
| TC-007  | RequestCleanUntrackedFiles メッセージ受信 | Normal - standard                                                          | DataSource.cleanUntrackedFiles が正しい引数で呼ばれる | mute/unmute パターン |

## S3: compareCommitsメッセージルーティング

> Origin: Feature 002 (menubar-search-diff) Task 2.4
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                     | Notes |
| ------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----- |
| TC-008  | RequestCompareCommits メッセージ受信（有効なfromHash, toHash） | Normal - standard                                                          | DataSource.getCommitComparison() が repo, fromHash, toHash で呼ばれる               | -     |
| TC-009  | getCommitComparison() が GitFileChange[] を返す                | Normal - standard                                                          | ResponseCompareCommits が fileChanges, fromHash, toHash を含んでwebviewに送信される | -     |
| TC-010  | getCommitComparison() が null を返す                           | Exception - handled error                                                  | ResponseCompareCommits の fileChanges が null でwebviewに送信される                 | -     |

## S4: viewDiff比較モード拡張

> Origin: Feature 002 (menubar-search-diff) Task 2.4
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                     | Notes                  |
| ------- | ---------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------- |
| TC-011  | RequestViewDiff に compareWithHash あり              | Normal - standard                                                          | encodeDiffDocUri で fromHash と toHash を使った2つのURIが生成される | 2点間比較用Diff Editor |
| TC-012  | RequestViewDiff に compareWithHash なし（undefined） | Normal - standard                                                          | 既存の動作（親コミットとの差分）が維持される                        | 後方互換               |

## S5: pull/pushメッセージルーティング

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 3.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                           | Notes                |
| ------- | ----------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------- |
| TC-013  | { command: "pull", repo: "..." } メッセージ受信 | Normal - standard                                                          | dataSource.pull(repo) が呼ばれ、ResponsePull が送信される | pushTag パターン準拠 |
| TC-014  | { command: "push", repo: "..." } メッセージ受信 | Normal - standard                                                          | dataSource.push(repo) が呼ばれ、ResponsePush が送信される | pushTag パターン準拠 |

## S8: deleteRemoteBranch/rebaseBranch メッセージルーティング

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                          | Notes                |
| ------- | ---------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------- |
| TC-021  | RequestDeleteRemoteBranch メッセージ受信 | Normal - standard                                                          | DataSource.deleteRemoteBranch が repo, remoteName, branchName で呼ばれる | mute/unmute パターン |
| TC-022  | RequestRebaseBranch メッセージ受信       | Normal - standard                                                          | DataSource.rebaseBranch が repo, branchName で呼ばれる                   | mute/unmute パターン |
| TC-023  | deleteRemoteBranch 成功（null 返却）     | Normal - standard                                                          | ResponseDeleteRemoteBranch が status: null で webview に送信される       | -                    |
| TC-024  | rebaseBranch 失敗（エラー文字列返却）    | Exception - handled error                                                  | ResponseRebaseBranch が status: "error message" で webview に送信される  | -                    |

## S9: deleteBranch 拡張（リモート同時削除）

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                              | Notes                |
| ------- | -------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------- |
| TC-025  | deleteOnRemotes = ["origin"], ローカル削除成功           | Normal - standard                                                          | ローカル削除後にリフレッシュ送信、続けて deleteRemoteBranch("origin", branchName) が呼ばれる | 部分成功考慮         |
| TC-026  | deleteOnRemotes = [] (空配列)                            | Normal - no remote                                                         | ローカル削除のみ実行。deleteRemoteBranch は呼ばれない                                        | 既存動作維持         |
| TC-027  | deleteOnRemotes = ["origin"], ローカル成功、リモート失敗 | Normal - partial success                                                   | グラフリフレッシュ後、リモート削除エラーが別途エラーダイアログで表示される                   | ローカル削除は維持   |
| TC-028  | ローカル削除が失敗                                       | Exception - handled error                                                  | エラーレスポンスが返却される。deleteRemoteBranch は呼ばれない                                | リモート削除試行なし |

## S10: loadCommits 拡張（Author フィルタ）

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                         | Notes    |
| ------- | ---------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------- |
| TC-029  | msg.authorFilter = "Alice"   | Normal - standard                                                          | dataSource.getCommits() の authorFilter パラメータに "Alice" が渡される | -        |
| TC-030  | msg.authorFilter = undefined | Normal - no filter                                                         | dataSource.getCommits() が authorFilter なしで呼ばれる（既存動作維持）  | 後方互換 |

## S11: createBranch + checkout オーケストレーション

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**テスト対象パス**: `src/gitGraphView.ts:223-228`

| Case ID | Input / Precondition                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                            | Notes                  |
| ------- | ----------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------- |
| TC-031  | checkout=true, createBranch 成功                      | Normal - standard                                                          | checkoutBranch(repo, branchName, null) が呼ばれる                          | -                      |
| TC-032  | checkout=true, createBranch 成功, checkoutBranch 成功 | Normal - standard                                                          | status: null が返される（完全成功）                                        | -                      |
| TC-033  | checkout=true, createBranch 成功, checkoutBranch 失敗 | Normal - partial success                                                   | status に部分成功メッセージが返される（ブランチは作成済み、checkout 失敗） | -                      |
| TC-034  | checkout=false, createBranch 成功                     | Normal - standard                                                          | checkoutBranch が呼ばれない、status: null                                  | -                      |
| TC-035  | createBranch 失敗（エラーメッセージ返却）             | Exception - handled error                                                  | status にエラーメッセージ、checkoutBranch は呼ばれない                     | -                      |
| TC-036  | checkout 未指定（undefined）                          | Boundary - legacy compat                                                   | checkoutBranch が呼ばれない（後方互換、従来動作）                          | レガシーメッセージ対応 |

## S15: loadCommits 入力正規化 (Feature 040)

> Origin: Feature 040 (settings-and-copy-polish) (light-spec-plan)
> Added: 2026-05-17
> Status: active
> Supersedes: -
> Signature: `case "loadCommits":` の message handler
> Target Path: `src/gitGraphView.ts`
> Test File: `tests/src/gitGraphView.test.ts`

webview から届く `loadCommits` メッセージの `maxCommits` が 0 / 負値であっても、`DataSource.getCommits()` に渡る値が常に 1 以上になることを検証する。

| Case ID | Input / Precondition   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                         | Notes                          |
| ------- | ---------------------- | -------------------------------------------------------------------------- | --------------------------------------- | ------------------------------ |
| TC-068  | `msg.maxCommits = 0`   | Boundary - lower bound                                                     | `DataSource.getCommits()` 第3引数が `1` | 0 → 1 正規化（メッセージ境界） |
| TC-069  | `msg.maxCommits = -10` | Validation - negative                                                      | `DataSource.getCommits()` 第3引数が `1` | 負値 → 1 正規化                |

## S16: viewDiff エラーハンドリング

> Origin: test-plan (既存コード網羅)
> Added: 2026-05-17
> Status: superseded
> Supersedes: -
> Superseded By: S24
> Signature: `private async viewDiff(repo, commitHash, oldFilePath, newFilePath, type, compareWithHash?): Promise<boolean>`
> Target Path: `src/gitGraphView.ts`

`vscode.commands.executeCommand("vscode.diff", ...)` 呼び出しを 3 つの try/catch（compareWithHash 指定時、Uncommitted モード、通常コミット比較）で包み、いずれも例外時は `false` を返す。

| Case ID | Input / Precondition                                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                            | Notes              |
| ------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------ |
| TC-070  | `compareWithHash !== undefined`、`vscode.commands.executeCommand("vscode.diff", ...)` が reject  | Exception - vscode.diff failure (compare mode)                             | `viewDiff` が `false` を返す。例外は呼び出し元へ伝播しない | L727-L741 の catch |
| TC-071  | `compareWithHash === undefined`、`commitHash === UNCOMMITTED_CHANGES_HASH`、`vscode.diff` reject | Exception - vscode.diff failure (uncommitted)                              | `viewDiff` が `false` を返す                               | L748-L763 の catch |
| TC-072  | `compareWithHash === undefined`、通常コミット、`vscode.diff` reject                              | Exception - vscode.diff failure (normal commit)                            | `viewDiff` が `false` を返す                               | L775-L786 の catch |

## S17: 未登録リポジトリのメッセージガード

> Origin: test-plan (既存コード網羅)
> Added: 2026-05-17
> Status: active
> Supersedes: -
> Signature: `onDidReceiveMessage` 内の早期 return ガード
> Target Path: `src/gitGraphView.ts:148-154`

`msg.command` が `copyToClipboard` / `loadRepos` 以外で、かつ `"repo" in msg` を満たす場合に、`msg.repo` が `RepoManager.getRepos()` のキーに含まれているかを検査し、未登録なら DataSource を呼ばずに早期 return する。

| Case ID | Input / Precondition                                                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                             | Notes                    |
| ------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------ |
| TC-073  | `msg.command = "loadCommits"`、`msg.repo` が `RepoManager.getRepos()` のキーに含まれない | Validation - unregistered repo                                             | `DataSource.getCommits` は呼ばれず、`repoFileWatcher.unmute` も実行されない | 既存登録のみを許可       |
| TC-074  | `msg.command = "copyToClipboard"`、`msg.repo` が未登録                                   | Normal - bypass guard                                                      | ガードをバイパスし `copyToClipboard` utility が呼ばれる                     | ガード対象外コマンド     |
| TC-075  | `msg.command = "loadRepos"`、`msg.repo` プロパティ無し                                   | Normal - bypass guard (no repo key)                                        | `respondLoadRepos` が呼ばれる                                               | `"repo" in msg` が false |
