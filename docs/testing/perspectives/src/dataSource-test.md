# テスト観点表: src/dataSource.ts

> Source: `src/dataSource.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: getStashes() スタッシュデータ取得

> Origin: Feature 001 (menu-bar-enhancement) Task 3.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**シグネチャ**: `getStashes(repo: string): Promise<GitStash[]>`
**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                              | Notes                                                    |
| ------- | --------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| TC-001  | リポジトリに3件のスタッシュが存在       | Normal - standard                                                          | 3件の GitStash オブジェクト配列を返す        | git reflog のモック出力を使用                            |
| TC-002  | リポジトリにスタッシュが存在しない      | Boundary - empty                                                           | 空配列 `[]` を返す（エラーではない）         | git コマンドが stderr を出力するが空配列にフォールバック |
| TC-003  | リポジトリに1件のスタッシュのみ         | Boundary - min (1 entry)                                                   | 1件の GitStash オブジェクト配列を返す        | 最小有効件数                                             |
| TC-004  | git reflog コマンドが異常終了           | Exception - handled error                                                  | 空配列を返すかエラーをスローする             | spawn のモックで exit code 非0 をシミュレート            |
| TC-005  | reflog 出力にフィールド数不正の行が混在 | Boundary - malformed input                                                 | 不正行はスキップされ、有効行のみパースされる | STASH_FORMAT_FIELD_COUNT ガード条件                      |
| TC-006  | reflog 出力に親ハッシュが空の行が混在   | Boundary - empty parent                                                    | 空親行はスキップされ、有効行のみパースされる | line[1] === "" ガード条件                                |

## S2: スタッシュ統合ロジック（getCommits 内）

> Origin: Feature 001 (menu-bar-enhancement) Task 3.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                          | Notes                                |
| ------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------ |
| TC-007  | スタッシュの hash がコミット配列内の hash と一致                      | Normal - standard                                                          | 該当コミットノードに stash 情報がアタッチされる          | hash-to-index ルックアップマップ使用 |
| TC-008  | スタッシュの baseHash がコミット配列内の hash と一致（hash は不一致） | Normal - standard                                                          | ベースコミットの直後にスタッシュ行が挿入される           | 新規コミットノードとして挿入         |
| TC-009  | スタッシュの hash も baseHash もコミット配列内に不在                  | Normal - out of range                                                      | スタッシュはスキップされ、コミット配列は変更なし         | 可視範囲外のスタッシュ               |
| TC-010  | 同一 baseHash に2件のスタッシュ（日付: 新 > 旧）                      | Normal - multiple                                                          | 新しいスタッシュが先、古いスタッシュが後の順で挿入される | 日付降順ソート                       |
| TC-011  | スタッシュ 0 件                                                       | Boundary - zero                                                            | コミット配列がそのまま返される（変更なし）               | getStashes が空配列を返すケース      |
| TC-012  | 3件のスタッシュがそれぞれ異なる baseHash を持つ                       | Normal - standard                                                          | 各 baseHash の直後にそれぞれ挿入される                   | 逆順挿入でインデックス整合性を維持   |

## S3: getCommitFile() ファイル内容取得

> Origin: test-plan (既存テスト)
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                      | Notes |
| ------- | ------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------ | ----- |
| TC-013  | 有効なコミットハッシュ                | Normal - standard                                                          | ファイル内容の文字列を返す           | -     |
| TC-014  | コミットハッシュに ^ サフィックス付き | Normal - standard                                                          | 親コミットのファイル内容を返す       | -     |
| TC-015  | 不正なコミットハッシュ                | Boundary - invalid hash                                                    | 空文字列を返す                       | -     |
| TC-016  | .. を含むパストラバーサル             | Boundary - path traversal                                                  | 空文字列を返す（セキュリティガード） | -     |
| TC-017  | git show コマンドが失敗               | Exception - handled error                                                  | 空文字列を返す                       | -     |
| TC-018  | ^ のみ（ベースハッシュなし）          | Boundary - invalid                                                         | 空文字列を返す                       | -     |
| TC-019  | HEAD ref                              | Normal - standard                                                          | ファイル内容を返す                   | -     |
| TC-020  | HEAD^ ref                             | Normal - standard                                                          | 親コミットのファイル内容を返す       | -     |

## S4: スタッシュコマンド (apply/pop/drop/branch)

> Origin: Feature 001 (menu-bar-enhancement) Task 4.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                           | Notes                   |
| ------- | ----------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------- |
| TC-021  | applyStash(repo, "stash@{0}", false)            | Normal - standard                                                          | git args: `["stash", "apply", "stash@{0}"]`               | reinstateIndex = false  |
| TC-022  | applyStash(repo, "stash@{0}", true)             | Normal - with option                                                       | git args: `["stash", "apply", "--index", "stash@{0}"]`    | reinstateIndex = true   |
| TC-023  | popStash(repo, "stash@{1}", false)              | Normal - standard                                                          | git args: `["stash", "pop", "stash@{1}"]`                 | reinstateIndex = false  |
| TC-024  | popStash(repo, "stash@{1}", true)               | Normal - with option                                                       | git args: `["stash", "pop", "--index", "stash@{1}"]`      | reinstateIndex = true   |
| TC-025  | dropStash(repo, "stash@{2}")                    | Normal - standard                                                          | git args: `["stash", "drop", "stash@{2}"]`                | -                       |
| TC-026  | branchFromStash(repo, "my-branch", "stash@{0}") | Normal - standard                                                          | git args: `["stash", "branch", "my-branch", "stash@{0}"]` | -                       |
| TC-027  | applyStash でコンフリクト発生                   | Exception - handled error                                                  | エラーメッセージ文字列を返す（null ではない）             | stderr からのメッセージ |
| TC-028  | dropStash で不正セレクタ                        | Exception - handled error                                                  | エラーメッセージ文字列を返す                              | 通常発生しないがガード  |

## S5: Uncommittedコマンド (push/reset/clean)

> Origin: Feature 001 (menu-bar-enhancement) Task 5.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                  | Notes                                      |
| ------- | ----------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| TC-029  | pushStash(repo, "WIP message", true)      | Normal - full options                                                      | git args: `["stash", "push", "--message", "WIP message", "--include-untracked"]` | メッセージ + untracked                     |
| TC-030  | pushStash(repo, "WIP message", false)     | Normal - message only                                                      | git args: `["stash", "push", "--message", "WIP message"]`                        | メッセージのみ                             |
| TC-031  | pushStash(repo, "", true)                 | Normal - untracked only                                                    | git args: `["stash", "push", "--include-untracked"]`                             | --message フラグなし                       |
| TC-032  | pushStash(repo, "", false)                | Boundary - minimal args                                                    | git args: `["stash", "push"]`                                                    | オプションなし                             |
| TC-033  | resetUncommitted(repo, "mixed")           | Normal - standard                                                          | git args: `["reset", "--mixed", "HEAD"]`                                         | -                                          |
| TC-034  | resetUncommitted(repo, "hard")            | Normal - standard                                                          | git args: `["reset", "--hard", "HEAD"]`                                          | -                                          |
| TC-035  | resetUncommitted(repo, "soft")            | Normal - invalid mode                                                      | エラーまたは拒否される                                                           | VALID_UNCOMMITTED_RESET_MODES に含まれない |
| TC-036  | resetUncommitted(repo, "invalid")         | Normal - invalid mode                                                      | エラーまたは拒否される                                                           | 不正な文字列                               |
| TC-037  | resetUncommitted(repo, "")                | Boundary - empty                                                           | エラーまたは拒否される                                                           | 空文字列                                   |
| TC-038  | cleanUntrackedFiles(repo, false)          | Normal - standard                                                          | git args: `["clean", "-f"]`                                                      | ディレクトリ除外                           |
| TC-039  | cleanUntrackedFiles(repo, true)           | Normal - with option                                                       | git args: `["clean", "-f", "-d"]`                                                | ディレクトリ含む                           |
| TC-040  | pushStash で git コマンドが失敗           | Exception - handled error                                                  | エラーメッセージ文字列を返す（null ではない）                                    | stderr からのメッセージ                    |
| TC-041  | cleanUntrackedFiles で git コマンドが失敗 | Exception - handled error                                                  | エラーメッセージ文字列を返す（null ではない）                                    | stderr からのメッセージ                    |

## S6: fetch() --prune

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 4.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**シグネチャ**: `fetch(repo: string): Promise<GitCommandStatus>`
**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                       | Notes                        |
| ------- | ---------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------- |
| TC-042  | 有効なrepoパス               | Normal - standard                                                          | ["fetch", "--all", "--prune"] 引数で git が実行される | --prune が追加されていること |
| TC-043  | fetch成功 (exit code 0)      | Normal - standard                                                          | null を返す                                           | 成功時はnull                 |
| TC-044  | fetchエラー (exit code != 0) | Exception - handled error                                                  | stderr メッセージ文字列を返す                         | リモート接続失敗等           |
| TC-045  | spawn がエラーイベントを発行 | Exception - spawn                                                          | エラーメッセージ文字列を返す                          | spawn error event            |

## S7: getCommitComparison() 差分取得

> Origin: Feature 002 (menubar-search-diff) Task 2.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**シグネチャ**: `getCommitComparison(repo: string, fromHash: string, toHash: string): Promise<GitFileChange[] | null>`
**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                  | Notes                                  |
| ------- | ------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------- |
| TC-046  | fromHash: 有効なハッシュ, toHash: 有効なハッシュ       | Normal - standard                                                          | GitFileChange[] を返す                                                           | nameStatus + numStat の並列実行        |
| TC-047  | 差分にリネームファイル(R)を含む                        | Normal - standard                                                          | oldFilePath と newFilePath が異なる GitFileChange を返す                         | --find-renames による検出              |
| TC-048  | 差分にA/M/D/R全種を含む                                | Normal - standard                                                          | 各変更種別が正しく分類される                                                     | --diff-filter=AMDR                     |
| TC-049  | numStat の追加行数・削除行数                           | Normal - standard                                                          | additions, deletions に正しい数値が設定される                                    | numStat パースの検証                   |
| TC-050  | toHash: 空文字（作業ツリー比較）                       | Boundary - empty toHash                                                    | git diff引数にtoHashが含まれない。作業ツリーとの差分を返す。ls-filesも実行される | isToWorkingTree=true                   |
| TC-051  | fromHash: UNCOMMITTED_CHANGES_HASH ("\*")              | Boundary - special hash                                                    | toHashがdiffベースとして使用される                                               | UNCOMMITTED特殊処理                    |
| TC-052  | 変更ファイルが0件                                      | Boundary - empty result                                                    | 空配列 [] を返す（nullではない）                                                 | 同一コミット間 or 差分なし             |
| TC-053  | git diffコマンドがエラー終了                           | Exception - handled error                                                  | null を返す                                                                      | spawn例外時にcatchブロックでnull返却   |
| TC-054  | numStatの出力行がnameStatusと不一致                    | Boundary - malformed                                                       | 取得可能なデータのみで結果を構成する                                             | パースの堅牢性                         |
| TC-055  | fromHash=UNCOMMITTED_CHANGES_HASH + 未追跡ファイルあり | Normal - standard                                                          | ls-filesが実行され、結果に未追跡ファイルが含まれる                               | isToWorkingTree=true時のみls-files実行 |
| TC-056  | toHash="" (作業ツリー比較) + 未追跡ファイルあり        | Normal - standard                                                          | ls-filesが実行され、結果に未追跡ファイルが含まれる                               | toHash空文字でもisToWorkingTree=true   |
| TC-057  | 2コミット間比較（fromHash, toHash共に有効ハッシュ）    | Boundary - no ls-files                                                     | ls-filesは実行されない（spawn呼び出しは2回のみ）                                 | isToWorkingTree=false                  |
| TC-058  | 作業ツリー比較 + 未追跡ファイルがdiff出力と重複        | Boundary - dedup                                                           | 重複ファイルは1回のみ含まれる                                                    | fileLookupで既存エントリをスキップ     |
| TC-059  | 作業ツリー比較 + 未追跡ファイル0件                     | Boundary - empty untracked                                                 | diff出力のみで結果が構成される                                                   | -                                      |
| TC-060  | 作業ツリー比較 + ls-files出力に空行が混在              | Boundary - empty line                                                      | 空行はスキップされ、有効なファイルパスのみ追加される                             | filePath === "" ガード                 |

## S8: getUncommittedDetails() 未コミット詳細

> Origin: Feature 002 (menubar-search-diff) Task 2.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**シグネチャ**: `getUncommittedDetails(repo: string): Promise<GitCommitDetails | null>`
**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                      | Notes                                      |
| ------- | ------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------ |
| TC-061  | staged/unstaged変更 + 未追跡ファイルあり    | Normal - standard                                                          | fileChangesにdiff結果 + 未追跡ファイルが含まれる     | nameStatus + numStat + ls-filesの3並列実行 |
| TC-062  | staged/unstaged変更のみ、未追跡ファイルなし | Normal - standard                                                          | fileChangesにdiff結果のみ含まれる                    | -                                          |
| TC-063  | diff出力なし、未追跡ファイルのみ存在        | Boundary - diff empty                                                      | fileChangesに未追跡ファイルのみ含まれる              | -                                          |
| TC-064  | 未追跡ファイルがdiff結果のnewFilePathと重複 | Boundary - dedup                                                           | 重複ファイルは1回のみ含まれる                        | fileLookupで既存エントリをスキップ         |
| TC-065  | ls-files出力に空行が混在                    | Boundary - empty line                                                      | 空行はスキップされ、有効なファイルパスのみ追加される | filePath === "" ガード                     |
| TC-066  | git diff または ls-files が例外をスロー     | Exception - handled error                                                  | null を返す                                          | catch ブロックでnull返却                   |
| TC-067  | 正常なdiff出力（リネーム含む）              | Normal - standard                                                          | GitCommitDetails を返す。正しいtype/pathが設定される | nameStatus パースの基本検証                |

## S9: checkoutBranch() -Bフラグ

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 2.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**シグネチャ**: `checkoutBranch(repo: string, branchName: string, remoteBranch: string | null): Promise<GitCommandStatus>`
**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                         | Notes                   |
| ------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------- |
| TC-068  | remoteBranch = "origin/feature/x", branchName = "feature/x" | Normal - リモートcheckout                                                  | git checkout -B feature/x origin/feature/x が実行される | -b ではなく -B          |
| TC-069  | remoteBranch = null, branchName = "main"                    | Normal - ローカルcheckout                                                  | git checkout main が実行される（-Bフラグなし）          | 既存動作維持            |
| TC-070  | remoteBranch = "origin/invalid..branch"                     | Exception - handled error                                                  | gitがエラーを返す（不正ブランチ名）                     | gitバリデーションに依存 |

## S10: pull() / push()

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 3.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                | Notes                |
| ------- | --------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------- |
| TC-071  | 有効なrepoパス                          | Normal - pull                                                              | ["pull"] 引数で git が実行される                               | 引数なしのgit pull   |
| TC-072  | pull成功 (exit code 0)                  | Normal - standard                                                          | null を返す (GitCommandStatus)                                 | 成功時はnull         |
| TC-073  | pullエラー (exit code != 0, stderrあり) | Exception - pull failure                                                   | stderr メッセージ文字列を返す                                  | マージコンフリクト等 |
| TC-074  | 有効なrepoパス                          | Normal - push                                                              | ["push"] 引数で git が実行される                               | 引数なしのgit push   |
| TC-075  | push成功 (exit code 0)                  | Normal - standard                                                          | null を返す (GitCommandStatus)                                 | 成功時はnull         |
| TC-076  | pushエラー (exit code != 0, stderrあり) | Exception - push failure                                                   | stderr メッセージ文字列を返す                                  | upstream未設定等     |
| TC-077  | push: upstream未設定                    | Exception - no upstream                                                    | "fatal: The current branch ... has no upstream branch." を返す | git標準エラー        |

## S11: deleteRemoteBranch() リモートブランチ削除

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**シグネチャ**: `deleteRemoteBranch(repo: string, remoteName: string, branchName: string): Promise<GitCommandStatus>`
**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                          | Notes                 |
| ------- | -------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------- |
| TC-078  | 有効な remoteName="origin", branchName="feature/x" | Normal - standard                                                          | git args: `["push", "origin", "--delete", "feature/x"]`。null を返す     | spawnGit 引数検証     |
| TC-079  | git push --delete コマンドが異常終了               | Exception - handled error                                                  | エラーメッセージ文字列を返す（null ではない）                            | リモート接続失敗等    |
| TC-080  | remoteName="upstream", branchName="fix/bug-123"    | Normal - 別リモート                                                        | git args: `["push", "upstream", "--delete", "fix/bug-123"]`。null を返す | origin 以外のリモート |

## S12: rebaseBranch() リベース実行

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**シグネチャ**: `rebaseBranch(repo: string, branchName: string): Promise<GitCommandStatus>`
**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                               | Notes          |
| ------- | -------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------- |
| TC-081  | branchName="main"                                        | Normal - standard                                                          | git args: `["rebase", "main"]`。null を返す                                   | 正常リベース   |
| TC-082  | リベース中にコンフリクト発生                             | Exception - conflict                                                       | エラーメッセージ文字列を返す。git の案内メッセージ（rebase --abort 等）を含む | stderr 出力    |
| TC-083  | 作業ツリーにコミットされていない変更がある状態でリベース | Exception - dirty tree                                                     | エラーメッセージ文字列を返す                                                  | git が拒否する |

## S13: getGitLog()/getCommits() Author 絞り込み拡張

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                  | Notes          |
| ------- | ------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------- |
| TC-084  | authorFilter="John Doe"                    | Normal - standard                                                          | git log 引数に `--author=John Doe` が含まれる                                                    | フィルタ指定時 |
| TC-085  | authorFilter 未指定（undefined）           | Normal - no filter                                                         | git log 引数に `--author` が含まれない                                                           | 既存動作維持   |
| TC-086  | authorFilter="" (空文字列)                 | Boundary - empty                                                           | git log 引数に `--author` が含まれない、または空文字でフィルタなしと同等                         | 空文字の扱い   |
| TC-087  | authorFilter="Jane O'Brien" (特殊文字含む) | Normal - special chars                                                     | git log 引数に `--author=Jane O'Brien` が含まれる。spawnGit 経由のためシェルインジェクションなし | 安全性確認     |

## S14: commitDetails() コミッターメール拡張

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                 | Notes                        |
| ------- | ------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------- |
| TC-088  | git show 出力に %ce（コミッターメール）が含まれる | Normal - standard                                                          | GitCommitDetails.committerEmail に正しいメールアドレスが設定される                              | フォーマットインデックス 6   |
| TC-089  | コミッターメールが空文字列                        | Boundary - empty                                                           | GitCommitDetails.committerEmail が空文字列                                                      | noreply アドレスでない場合等 |
| TC-090  | commitInfo の全7フィールドが正常に設定されている  | Normal - standard                                                          | 既存フィールド（hash, author, email, date, committer）が変更されず、committerEmail が追加される | 後方互換性                   |

## S15: getAuthors() Author リスト取得

> Origin: Feature 011 (author-filter-fix) (aidd-spec-tasks-test)
> Added: 2026-03-05
> Status: active
> Supersedes: -

**シグネチャ**: `getAuthors(repo: string): Promise<string[]>`
**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                    | Notes                                    |
| ------- | --------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------- |
| TC-091  | リポジトリに 5 人の Author のコミットが存在               | Normal - standard                                                          | 5 人の Author 名がアルファベット順の配列で返される | git shortlog 正常出力のパース            |
| TC-092  | 空リポジトリ（HEAD 不在、git shortlog がエラー終了）      | Boundary - empty (no HEAD)                                                 | 空配列 `[]` を返す                                 | spawnGit の errorValue フォールバック    |
| TC-093  | Author が 1 人のみのリポジトリ                            | Boundary - min (single author)                                             | 1 要素の配列を返す                                 | 最小有効件数                             |
| TC-094  | git shortlog コマンドが異常終了（exit code 非 0）         | Exception - handled error                                                  | 空配列 `[]` を返す                                 | spawnGit の errorValue フォールバック    |
| TC-095  | shortlog 出力: `"    5\tAlice\n   12\tBob\n"` 形式        | Normal - parse                                                             | `["Alice", "Bob"]` を返す（カウント部分を除去）    | タブ区切りパースの検証                   |
| TC-096  | shortlog 出力が空文字列（コミットゼロ）                   | Boundary - empty output                                                    | 空配列 `[]` を返す                                 | パーサが空入力を処理できること           |
| TC-097  | Author 名にスペースや特殊文字を含む（例: "Jane O'Brien"） | Normal - special chars                                                     | 特殊文字を含む Author 名がそのまま返される         | パーサがタブ以降の全文字列を保持すること |

## S16: getCommits() authors 統合

> Origin: Feature 011 (author-filter-fix) (aidd-spec-tasks-test)
> Added: 2026-03-05
> Status: active
> Supersedes: -

**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                  | Notes                                      |
| ------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| TC-098  | getCommits() 正常実行（getAuthors が Author リストを返す） | Normal - standard                                                          | 戻り値オブジェクトに `authors` フィールドが含まれ、Author リストが設定されている | Promise.all に getAuthors が統合されている |
| TC-099  | getAuthors がエラーで空配列を返す                          | Exception - fallback                                                       | commits/head/moreCommitsAvailable は正常に取得され、authors が空配列で返される   | 他の Promise.all 結果に影響しないこと      |

## S17: getGitLog branches 配列パラメータ

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**シグネチャ**: `private getGitLog(repo: string, branches: string[], num: number, showRemoteBranches: boolean, authors: string[])`
**テスト対象パス**: `src/dataSource.ts:753-758`

| Case ID | Input / Precondition                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                     | Notes                         |
| ------- | ------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------- |
| TC-100  | branches=["main","dev"]                          | Normal - standard                                                          | git log 引数に "main" と "dev" が含まれる（--branches/--tags なし） | 複数ブランチ指定              |
| TC-101  | branches=[]                                      | Normal - show all                                                          | git log 引数に --branches --tags が含まれる                         | 全ブランチ表示（従来相当）    |
| TC-102  | branches=["feature/x"]                           | Normal - single                                                            | git log 引数に "feature/x" が含まれる                               | 単一ブランチ指定              |
| TC-103  | branches=["main","dev"], showRemoteBranches=true | Normal - standard                                                          | git log 引数に "main" と "dev" が含まれ、--remotes は含まれない     | ブランチ指定時は remotes 不要 |
| TC-104  | branches=[], showRemoteBranches=true             | Normal - all + remotes                                                     | git log 引数に --branches --tags --remotes が含まれる               | 全ブランチ + リモート         |
| TC-105  | branches=[], showRemoteBranches=false            | Boundary - all without remotes                                             | git log 引数に --branches --tags が含まれ、--remotes は含まれない   | リモート非表示                |

## S18: getGitLog/getCommits authors 配列パラメータ

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**シグネチャ**: `private getGitLog(repo: string, branches: string[], num: number, showRemoteBranches: boolean, authors: string[])`
**テスト対象パス**: `src/dataSource.ts:753-758`

| Case ID | Input / Precondition     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                            | Notes                       |
| ------- | ------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------- |
| TC-106  | authors=["Alice","Bob"]  | Normal - standard                                                          | git log 引数に --author=Alice と --author=Bob の両方が含まれる                             | 複数著者フィルタ（OR 論理） |
| TC-107  | authors=[]               | Normal - no filter                                                         | git log 引数に --author フラグが含まれない                                                 | フィルタなし（従来相当）    |
| TC-108  | authors=["Jane O'Brien"] | Normal - special chars                                                     | git log 引数に --author=Jane O'Brien が含まれる。spawnGit 経由でシェルインジェクションなし | 特殊文字の安全性            |
| TC-109  | authors=["Alice"]        | Normal - single                                                            | git log 引数に --author=Alice が含まれる                                                   | 単一著者フィルタ            |

## S19: mergeBranch/mergeCommit squash/noCommit 拡張

> Origin: Feature 014 (dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-09
> Status: active
> Supersedes: -

**シグネチャ**: `mergeBranch(repo: string, branchName: string, createNewCommit: boolean, squash: boolean, noCommit: boolean): Promise<GitCommandStatus>`
**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                       | Notes                    |
| ------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------ |
| TC-110  | createNewCommit=true, squash=false, noCommit=false              | Normal - standard                                                          | git args: `["merge", "--no-ff", ref]`                                 | 従来動作                 |
| TC-111  | createNewCommit=false, squash=false, noCommit=false             | Normal - standard                                                          | git args: `["merge", ref]`                                            | フラグなし               |
| TC-112  | createNewCommit=true, squash=true, noCommit=false               | Normal - squash override                                                   | git args: `["merge", "--squash", ref]`（--no-ff なし）                | squash が no-ff を上書き |
| TC-113  | createNewCommit=false, squash=true, noCommit=false              | Normal - standard                                                          | git args: `["merge", "--squash", ref]`                                | squash のみ              |
| TC-114  | createNewCommit=true, squash=false, noCommit=true               | Normal - standard                                                          | git args: `["merge", "--no-ff", "--no-commit", ref]`                  | 独立オプション           |
| TC-115  | createNewCommit=false, squash=false, noCommit=true              | Normal - standard                                                          | git args: `["merge", "--no-commit", ref]`                             | noCommit のみ            |
| TC-116  | createNewCommit=true, squash=true, noCommit=true                | Normal - all flags                                                         | git args: `["merge", "--squash", "--no-commit", ref]`（--no-ff なし） | 全フラグ、squash 優先    |
| TC-117  | createNewCommit=false, squash=true, noCommit=true               | Normal - standard                                                          | git args: `["merge", "--squash", "--no-commit", ref]`                 | squash + noCommit        |
| TC-118  | mergeCommit: 不正なコミットハッシュ, squash=true, noCommit=true | Boundary - invalid hash                                                    | INVALID_COMMIT_HASH_MESSAGE を返す                                    | 入力バリデーション維持   |

## S20: cherrypickCommit recordOrigin/noCommit 拡張

> Origin: Feature 014 (dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-09
> Status: active
> Supersedes: -

**シグネチャ**: `cherrypickCommit(repo: string, commitHash: string, parentIndex: number, recordOrigin: boolean, noCommit: boolean): Promise<GitCommandStatus>`
**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                   | Notes                    |
| ------- | --------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------ |
| TC-119  | parentIndex=0, recordOrigin=false, noCommit=false         | Normal - standard                                                          | git args: `["cherry-pick", hash]`                                 | 従来動作                 |
| TC-120  | parentIndex=0, recordOrigin=true, noCommit=false          | Normal - standard                                                          | git args: `["cherry-pick", "-x", hash]`                           | recordOrigin のみ        |
| TC-121  | parentIndex=0, recordOrigin=false, noCommit=true          | Normal - standard                                                          | git args: `["cherry-pick", "--no-commit", hash]`                  | noCommit のみ            |
| TC-122  | parentIndex=0, recordOrigin=true, noCommit=true           | Normal - both flags                                                        | git args: `["cherry-pick", "-x", "--no-commit", hash]`            | 独立オプション           |
| TC-123  | parentIndex=2, recordOrigin=true, noCommit=true           | Normal - merge commit                                                      | git args: `["cherry-pick", "-m", "2", "-x", "--no-commit", hash]` | マージコミットの全フラグ |
| TC-124  | 不正なコミットハッシュ, recordOrigin=true, noCommit=false | Boundary - invalid hash                                                    | INVALID_COMMIT_HASH_MESSAGE を返す                                | バリデーション維持       |
| TC-125  | parentIndex=-1, recordOrigin=false, noCommit=false        | Boundary - invalid parentIndex                                             | "Invalid parent index." を返す                                    | バリデーション維持       |

## S21: getGitLog() コミット表示順序（commitOrdering パラメータ）

> Origin: Feature 015 (commit-sort-order) (aidd-spec-tasks-test)
> Added: 2026-03-10
> Status: active
> Supersedes: -

**シグネチャ**: `private getGitLog(repo: string, branches: string[], num: number, showRemoteBranches: boolean, authors: string[], commitOrdering: CommitOrdering)`
**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                      | Notes                                     |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------- |
| TC-126  | commitOrdering="date"                                        | Normal - standard                                                          | git log 引数に "--date-order" が含まれる                                             | デフォルトと同じ動作                      |
| TC-127  | commitOrdering="topo"                                        | Normal - standard                                                          | git log 引数に "--topo-order" が含まれる                                             | トポロジカル順序                          |
| TC-128  | commitOrdering="author-date"                                 | Normal - standard                                                          | git log 引数に "--author-date-order" が含まれる                                      | 著者日時順序                              |
| TC-129  | COMMIT_ORDER_FLAGS 定数マッピング                            | Normal - exhaustive                                                        | 3つのキー（date, topo, author-date）が存在し、対応するフラグ文字列にマッピングされる | CommitOrdering 型の全値を網羅             |
| TC-130  | getCommits(repo, branches, max, showRemote, authors, "topo") | Normal - passthrough                                                       | getGitLog に commitOrdering="topo" が正しく渡される                                  | getCommits → getGitLog パラメータ中継     |
| TC-131  | commitOrdering="date" （後方互換確認）                       | Normal - backward                                                          | 既存のハードコード "--date-order" と同じ git log 引数が生成される                    | v0.5.4 以前と同じ動作であることを保証する |

## S22: getWorktrees() worktree 一覧取得

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: active
> Supersedes: -

**シグネチャ**: `getWorktrees(repo: string): Promise<WorktreeMap>`
**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                            | Notes                                     |
| ------- | --------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------- |
| TC-132  | spawnGit 成功、porcelain 出力あり       | Normal - standard                                                          | parseWorktreeList の結果がそのまま返される | spawnGit → parseWorktreeList パイプライン |
| TC-133  | spawnGit エラー（exit code 非 0）       | Exception - handled error                                                  | 空マップ `{}` を返す                       | エラー時のフォールバック                  |
| TC-134  | リポジトリに worktree なし（main のみ） | Boundary - single                                                          | main worktree のみのマップ                 | 最小有効結果                              |

## S23: addWorktree() worktree 作成

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: active
> Supersedes: -

**シグネチャ**: `addWorktree(repo: string, path: string, branchName: string, commitHash?: string): Promise<GitCommandStatus>`
**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                  | Notes                |
| ------- | ------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------- |
| TC-135  | path + branchName（commitHash なし） | Normal - existing branch                                                   | git args: `["worktree", "add", path, branchName]`。null を返す                   | REQ-3.2 既存ブランチ |
| TC-136  | path + branchName + commitHash       | Normal - new branch                                                        | git args: `["worktree", "add", "-b", branchName, path, commitHash]`。null を返す | REQ-3.1 新規ブランチ |
| TC-137  | 作成成功（exit code 0）              | Normal - standard                                                          | null を返す（GitCommandStatus）                                                  | -                    |
| TC-138  | 重複ブランチ名で git がエラー        | Exception - handled error                                                  | エラーメッセージ文字列を返す                                                     | REQ-3.1-TC4          |
| TC-139  | 既存パスで git がエラー              | Exception - handled error                                                  | エラーメッセージ文字列を返す                                                     | REQ-3.1-TC5          |

## S24: removeWorktree() worktree 削除

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: active
> Supersedes: -

**シグネチャ**: `removeWorktree(repo: string, worktreePath: string): Promise<GitCommandStatus>`
**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                               | Notes       |
| ------- | ------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------- |
| TC-140  | 有効な worktreePath                  | Normal - standard                                                          | git args: `["worktree", "remove", worktreePath]`。null を返す | REQ-4.1     |
| TC-141  | 未コミット変更がある worktree の削除 | Exception - handled error                                                  | エラーメッセージ文字列を返す                                  | REQ-4.1-TC5 |
