# テスト観点表: src/gitGraphView.ts

## S1: スタッシュメッセージルーティング

> Origin: Feature 001 (menu-bar-enhancement) Task 4.2
> Added: 2026-02-25

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                  | Perspective (Equivalence / Boundary) | Expected Result                                   | Notes                |
| ------- | ------------------------------------- | ------------------------------------ | ------------------------------------------------- | -------------------- |
| TC-001  | RequestApplyStash メッセージ受信      | Equivalence - normal                 | DataSource.applyStash が正しい引数で呼ばれる      | mute/unmute パターン |
| TC-002  | RequestPopStash メッセージ受信        | Equivalence - normal                 | DataSource.popStash が正しい引数で呼ばれる        | mute/unmute パターン |
| TC-003  | RequestDropStash メッセージ受信       | Equivalence - normal                 | DataSource.dropStash が正しい引数で呼ばれる       | mute/unmute パターン |
| TC-004  | RequestBranchFromStash メッセージ受信 | Equivalence - normal                 | DataSource.branchFromStash が正しい引数で呼ばれる | mute/unmute パターン |

## S2: Uncommittedメッセージルーティング

> Origin: Feature 001 (menu-bar-enhancement) Task 5.2
> Added: 2026-02-25

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                      | Perspective (Equivalence / Boundary) | Expected Result                                       | Notes                |
| ------- | ----------------------------------------- | ------------------------------------ | ----------------------------------------------------- | -------------------- |
| TC-005  | RequestPushStash メッセージ受信           | Equivalence - normal                 | DataSource.pushStash が正しい引数で呼ばれる           | mute/unmute パターン |
| TC-006  | RequestResetUncommitted メッセージ受信    | Equivalence - normal                 | DataSource.resetUncommitted が正しい引数で呼ばれる    | mute/unmute パターン |
| TC-007  | RequestCleanUntrackedFiles メッセージ受信 | Equivalence - normal                 | DataSource.cleanUntrackedFiles が正しい引数で呼ばれる | mute/unmute パターン |

## S3: compareCommitsメッセージルーティング

> Origin: Feature 002 (menubar-search-diff) Task 2.4
> Added: 2026-02-25

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                           | Perspective (Equivalence / Boundary) | Expected Result                                                                     | Notes |
| ------- | -------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------- | ----- |
| TC-008  | RequestCompareCommits メッセージ受信（有効なfromHash, toHash） | Equivalence - normal                 | DataSource.getCommitComparison() が repo, fromHash, toHash で呼ばれる               | -     |
| TC-009  | getCommitComparison() が GitFileChange[] を返す                | Equivalence - normal                 | ResponseCompareCommits が fileChanges, fromHash, toHash を含んでwebviewに送信される | -     |
| TC-010  | getCommitComparison() が null を返す                           | Equivalence - error                  | ResponseCompareCommits の fileChanges が null でwebviewに送信される                 | -     |

## S4: viewDiff比較モード拡張

> Origin: Feature 002 (menubar-search-diff) Task 2.4
> Added: 2026-02-25

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                 | Perspective (Equivalence / Boundary) | Expected Result                                                     | Notes                  |
| ------- | ---------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------- | ---------------------- |
| TC-011  | RequestViewDiff に compareWithHash あり              | Equivalence - normal                 | encodeDiffDocUri で fromHash と toHash を使った2つのURIが生成される | 2点間比較用Diff Editor |
| TC-012  | RequestViewDiff に compareWithHash なし（undefined） | Equivalence - normal                 | 既存の動作（親コミットとの差分）が維持される                        | 後方互換               |

## S5: pull/pushメッセージルーティング

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 3.3
> Added: 2026-02-25

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                            | Perspective (Equivalence / Boundary) | Expected Result                                           | Notes                |
| ------- | ----------------------------------------------- | ------------------------------------ | --------------------------------------------------------- | -------------------- |
| TC-013  | { command: "pull", repo: "..." } メッセージ受信 | Equivalence - normal                 | dataSource.pull(repo) が呼ばれ、ResponsePull が送信される | pushTag パターン準拠 |
| TC-014  | { command: "push", repo: "..." } メッセージ受信 | Equivalence - normal                 | dataSource.push(repo) が呼ばれ、ResponsePush が送信される | pushTag パターン準拠 |

## S6: createOrShow() rootUri ハンドリング

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                             | Perspective (Equivalence / Boundary)  | Expected Result                                                        | Notes          |
| ------- | ------------------------------------------------ | ------------------------------------- | ---------------------------------------------------------------------- | -------------- |
| TC-015  | rootUri 指定あり、パネル未作成                   | Equivalence - normal (new panel)      | viewState.lastActiveRepo が rootUri.fsPath に設定される                | 初回起動時     |
| TC-016  | rootUri 指定あり、パネル既存、リポジトリ登録済み | Equivalence - normal (existing panel) | panel.reveal() 後に ResponseSelectRepo が送信される                    | リポジトリ切替 |
| TC-017  | rootUri 指定あり、パネル既存、リポジトリ未登録   | Equivalence - normal (unregistered)   | registerRepoFromUri() が呼ばれ、その後 ResponseSelectRepo が送信される | 新規登録フロー |
| TC-018  | rootUri 指定なし（コマンドパレットから実行）     | Equivalence - normal (no rootUri)     | 従来動作維持（selectRepo メッセージ送信なし）                          | 後方互換       |

## S7: viewState キーバインド・自動読み込み設定の受け渡し

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition         | Perspective (Equivalence / Boundary) | Expected Result                                      | Notes                |
| ------- | ---------------------------- | ------------------------------------ | ---------------------------------------------------- | -------------------- |
| TC-019  | getHtmlForWebview() 呼び出し | Equivalence - normal                 | viewState に keybindings オブジェクトが含まれる      | 設定パイプライン検証 |
| TC-020  | getHtmlForWebview() 呼び出し | Equivalence - normal                 | viewState に loadMoreCommitsAutomatically が含まれる | 設定パイプライン検証 |

## S8: deleteRemoteBranch/rebaseBranch メッセージルーティング

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                     | Perspective (Equivalence / Boundary) | Expected Result                                                          | Notes                |
| ------- | ---------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------ | -------------------- |
| TC-021  | RequestDeleteRemoteBranch メッセージ受信 | Equivalence - normal                 | DataSource.deleteRemoteBranch が repo, remoteName, branchName で呼ばれる | mute/unmute パターン |
| TC-022  | RequestRebaseBranch メッセージ受信       | Equivalence - normal                 | DataSource.rebaseBranch が repo, branchName で呼ばれる                   | mute/unmute パターン |
| TC-023  | deleteRemoteBranch 成功（null 返却）     | Equivalence - normal                 | ResponseDeleteRemoteBranch が status: null で webview に送信される       | -                    |
| TC-024  | rebaseBranch 失敗（エラー文字列返却）    | Equivalence - error                  | ResponseRebaseBranch が status: "error message" で webview に送信される  | -                    |

## S9: deleteBranch 拡張（リモート同時削除）

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                     | Perspective (Equivalence / Boundary) | Expected Result                                                                              | Notes                |
| ------- | -------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------- | -------------------- |
| TC-025  | deleteOnRemotes = ["origin"], ローカル削除成功           | Equivalence - normal                 | ローカル削除後にリフレッシュ送信、続けて deleteRemoteBranch("origin", branchName) が呼ばれる | 部分成功考慮         |
| TC-026  | deleteOnRemotes = [] (空配列)                            | Equivalence - normal (no remote)     | ローカル削除のみ実行。deleteRemoteBranch は呼ばれない                                        | 既存動作維持         |
| TC-027  | deleteOnRemotes = ["origin"], ローカル成功、リモート失敗 | Equivalence - partial success        | グラフリフレッシュ後、リモート削除エラーが別途エラーダイアログで表示される                   | ローカル削除は維持   |
| TC-028  | ローカル削除が失敗                                       | Equivalence - error                  | エラーレスポンスが返却される。deleteRemoteBranch は呼ばれない                                | リモート削除試行なし |

## S10: loadCommits 拡張（Author フィルタ）

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition         | Perspective (Equivalence / Boundary) | Expected Result                                                         | Notes    |
| ------- | ---------------------------- | ------------------------------------ | ----------------------------------------------------------------------- | -------- |
| TC-029  | msg.authorFilter = "Alice"   | Equivalence - normal                 | dataSource.getCommits() の authorFilter パラメータに "Alice" が渡される | -        |
| TC-030  | msg.authorFilter = undefined | Equivalence - normal (no filter)     | dataSource.getCommits() が authorFilter なしで呼ばれる（既存動作維持）  | 後方互換 |

## S11: createBranch + checkout オーケストレーション

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07

**テスト対象パス**: `src/gitGraphView.ts:223-228`

| Case ID | Input / Precondition                                  | Perspective (Equivalence / Boundary) | Expected Result                                                            | Notes                  |
| ------- | ----------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------- | ---------------------- |
| TC-031  | checkout=true, createBranch 成功                      | Equivalence - normal                 | checkoutBranch(repo, branchName, null) が呼ばれる                          | -                      |
| TC-032  | checkout=true, createBranch 成功, checkoutBranch 成功 | Equivalence - normal                 | status: null が返される（完全成功）                                        | -                      |
| TC-033  | checkout=true, createBranch 成功, checkoutBranch 失敗 | Equivalence - partial success        | status に部分成功メッセージが返される（ブランチは作成済み、checkout 失敗） | -                      |
| TC-034  | checkout=false, createBranch 成功                     | Equivalence - normal                 | checkoutBranch が呼ばれない、status: null                                  | -                      |
| TC-035  | createBranch 失敗（エラーメッセージ返却）             | Equivalence - error                  | status にエラーメッセージ、checkoutBranch は呼ばれない                     | -                      |
| TC-036  | checkout 未指定（undefined）                          | Boundary - legacy compat             | checkoutBranch が呼ばれない（後方互換、従来動作）                          | レガシーメッセージ対応 |

## S12: loadCommits branches/authors 配列パススルー

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07

**テスト対象パス**: `src/gitGraphView.ts:279-291`

| Case ID | Input / Precondition                               | Perspective (Equivalence / Boundary) | Expected Result                                                     | Notes          |
| ------- | -------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------- | -------------- |
| TC-037  | msg.branches=["main","dev"], msg.authors=["Alice"] | Equivalence - normal                 | getCommits が branches=["main","dev"], authors=["Alice"] で呼ばれる | 配列パススルー |
| TC-038  | msg.branches=[], msg.authors=[]                    | Boundary - empty arrays              | getCommits が branches=[], authors=[] で呼ばれる（全件表示）        | 空配列         |

## S13: merge/cherry-pick ハンドラ拡張 + viewState dialogDefaults

> Origin: Feature 014 (dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-09

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                         | Perspective (Equivalence / Boundary) | Expected Result                                                                  | Notes            |
| ------- | ------------------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------- | ---------------- |
| TC-039  | getHtmlForWebview() 呼び出し                                 | Equivalence - normal                 | viewState に dialogDefaults が含まれ、Config.dialogDefaults() の返却値と一致する | 設定パイプライン |
| TC-040  | RequestMergeBranch (squash=true, noCommit=false)             | Equivalence - normal                 | DataSource.mergeBranch に squash=true, noCommit=false が渡される                 | -                |
| TC-041  | RequestMergeCommit (squash=false, noCommit=true)             | Equivalence - normal                 | DataSource.mergeCommit に squash=false, noCommit=true が渡される                 | -                |
| TC-042  | RequestCherrypickCommit (recordOrigin=true, noCommit=true)   | Equivalence - normal                 | DataSource.cherrypickCommit に recordOrigin=true, noCommit=true が渡される       | -                |
| TC-043  | RequestCherrypickCommit (recordOrigin=false, noCommit=false) | Equivalence - normal                 | DataSource.cherrypickCommit に recordOrigin=false, noCommit=false が渡される     | 従来互換         |

## S14: viewState commitOrdering 受け渡し / loadCommits ハンドラ

> Origin: Feature 015 (commit-sort-order) (aidd-spec-tasks-test)
> Added: 2026-03-10

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                  | Perspective (Equivalence / Boundary) | Expected Result                                                                  | Notes                |
| ------- | ----------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------- | -------------------- |
| TC-044  | getHtmlForWebview() 呼び出し                          | Equivalence - normal                 | viewState に commitOrdering が含まれ、Config.commitOrdering() の返却値と一致する | 設定パイプライン検証 |
| TC-045  | loadCommits メッセージに commitOrdering="topo"        | Equivalence - normal                 | dataSource.getCommits() に commitOrdering="topo" が渡される                      | -                    |
| TC-046  | loadCommits メッセージに commitOrdering="author-date" | Equivalence - normal                 | dataSource.getCommits() に commitOrdering="author-date" が渡される               | -                    |
| TC-047  | loadCommits メッセージに commitOrdering="date"        | Equivalence - normal (default)       | dataSource.getCommits() に commitOrdering="date" が渡される                      | デフォルト動作確認   |

## S15: createWorktree/removeWorktree/openTerminal メッセージハンドラ

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                                          | Perspective (Equivalence / Boundary) | Expected Result                                                                                      | Notes                |
| ------- | ----------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------- | -------------------- |
| TC-048  | RequestCreateWorktree（commitHash なし, openTerminal=false）                  | Equivalence - normal                 | DataSource.addWorktree が正しい引数で呼ばれ、ResponseCreateWorktree が送信される。ターミナル起動なし | REQ-3.2              |
| TC-049  | RequestCreateWorktree（commitHash あり, openTerminal=true）、addWorktree 成功 | Equivalence - normal (with terminal) | addWorktree 呼出後、createTerminal が name + cwd 付きで呼ばれ、terminal.show() 実行                  | REQ-3.1, REQ-3.1-TC6 |
| TC-050  | RequestCreateWorktree、addWorktree 失敗（エラー文字列返却）                   | Equivalence - error                  | ResponseCreateWorktree に status（エラー文字列）が含まれ、ターミナル起動なし                         | -                    |
| TC-051  | RequestRemoveWorktree                                                         | Equivalence - normal                 | DataSource.removeWorktree が呼ばれ、ResponseRemoveWorktree が送信される                              | REQ-4.1              |
| TC-052  | RequestOpenTerminal                                                           | Equivalence - normal                 | createTerminal が name + cwd 付きで呼ばれ、terminal.show() 実行。ResponseOpenTerminal 送信           | REQ-9.1              |

## S16: removeWorktree ハンドラ ブランチ同時削除

> Origin: Feature 019 (worktree-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-15

**テスト対象パス**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                                 | Perspective (Equivalence / Boundary) | Expected Result                                                                  | Notes            |
| ------- | -------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------- | ---------------- |
| TC-053  | deleteBranch=true, worktree 削除成功(null), branch 削除成功(null)    | Equivalence - normal                 | ResponseRemoveWorktree: status=null, branchStatus=null                           | REQ-4.2-TC1      |
| TC-054  | deleteBranch=true, worktree 削除成功(null), branch 削除失敗("error") | Equivalence - partial success        | ResponseRemoveWorktree: status=null, branchStatus="error message"                | REQ-4.2-TC2      |
| TC-055  | deleteBranch=true, worktree 削除失敗("error")                        | Equivalence - error                  | ResponseRemoveWorktree: status="error", branchStatus 未設定。deleteBranch 未呼出 | REQ-4.2-TC5      |
| TC-056  | deleteBranch=false, worktree 削除成功(null)                          | Equivalence - normal                 | ResponseRemoveWorktree: status=null, branchStatus 未設定。deleteBranch 未呼出    | REQ-4.2-TC3      |
| TC-057  | deleteBranch=undefined (旧 webview 互換)                             | Boundary - legacy compat             | deleteBranch 未呼出、false としてフォールバック                                  | REQ-4.2 後方互換 |
| TC-058  | deleteBranch=true 時の forceDelete パラメータ検証                    | Equivalence - constraint             | dataSource.deleteBranch の第3引数が false（安全な削除）固定                      | REQ-4.2-TC4      |
