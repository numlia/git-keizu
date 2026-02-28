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
