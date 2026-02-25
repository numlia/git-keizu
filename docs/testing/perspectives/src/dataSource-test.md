# テスト観点表: src/dataSource.ts

## S1: getStashes() スタッシュデータ取得

> Origin: Feature 001 (menu-bar-enhancement) Task 3.2
> Added: 2026-02-25

**シグネチャ**: `getStashes(repo: string): Promise<GitStash[]>`
**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                    | Perspective (Equivalence / Boundary) | Expected Result                              | Notes                                                    |
| ------- | --------------------------------------- | ------------------------------------ | -------------------------------------------- | -------------------------------------------------------- |
| TC-001  | リポジトリに3件のスタッシュが存在       | Equivalence - normal                 | 3件の GitStash オブジェクト配列を返す        | git reflog のモック出力を使用                            |
| TC-002  | リポジトリにスタッシュが存在しない      | Boundary - empty                     | 空配列 `[]` を返す（エラーではない）         | git コマンドが stderr を出力するが空配列にフォールバック |
| TC-003  | リポジトリに1件のスタッシュのみ         | Boundary - min (1 entry)             | 1件の GitStash オブジェクト配列を返す        | 最小有効件数                                             |
| TC-004  | git reflog コマンドが異常終了           | Equivalence - error                  | 空配列を返すかエラーをスローする             | spawn のモックで exit code 非0 をシミュレート            |
| TC-005  | reflog 出力にフィールド数不正の行が混在 | Boundary - malformed input           | 不正行はスキップされ、有効行のみパースされる | STASH_FORMAT_FIELD_COUNT ガード条件                      |
| TC-006  | reflog 出力に親ハッシュが空の行が混在   | Boundary - empty parent              | 空親行はスキップされ、有効行のみパースされる | line[1] === "" ガード条件                                |

## S2: スタッシュ統合ロジック（getCommits 内）

> Origin: Feature 001 (menu-bar-enhancement) Task 3.2
> Added: 2026-02-25

**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                                                  | Perspective (Equivalence / Boundary) | Expected Result                                          | Notes                                |
| ------- | --------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------- | ------------------------------------ |
| TC-007  | スタッシュの hash がコミット配列内の hash と一致                      | Equivalence - normal                 | 該当コミットノードに stash 情報がアタッチされる          | hash-to-index ルックアップマップ使用 |
| TC-008  | スタッシュの baseHash がコミット配列内の hash と一致（hash は不一致） | Equivalence - normal                 | ベースコミットの直後にスタッシュ行が挿入される           | 新規コミットノードとして挿入         |
| TC-009  | スタッシュの hash も baseHash もコミット配列内に不在                  | Equivalence - out of range           | スタッシュはスキップされ、コミット配列は変更なし         | 可視範囲外のスタッシュ               |
| TC-010  | 同一 baseHash に2件のスタッシュ（日付: 新 > 旧）                      | Equivalence - multiple               | 新しいスタッシュが先、古いスタッシュが後の順で挿入される | 日付降順ソート                       |
| TC-011  | スタッシュ 0 件                                                       | Boundary - zero                      | コミット配列がそのまま返される（変更なし）               | getStashes が空配列を返すケース      |
| TC-012  | 3件のスタッシュがそれぞれ異なる baseHash を持つ                       | Equivalence - normal                 | 各 baseHash の直後にそれぞれ挿入される                   | 逆順挿入でインデックス整合性を維持   |

## S3: getCommitFile() ファイル内容取得

> Origin: test-plan (既存テスト)
> Added: 2026-02-25

**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                  | Perspective (Equivalence / Boundary) | Expected Result                      | Notes |
| ------- | ------------------------------------- | ------------------------------------ | ------------------------------------ | ----- |
| TC-013  | 有効なコミットハッシュ                | Equivalence - normal                 | ファイル内容の文字列を返す           | -     |
| TC-014  | コミットハッシュに ^ サフィックス付き | Equivalence - normal                 | 親コミットのファイル内容を返す       | -     |
| TC-015  | 不正なコミットハッシュ                | Boundary - invalid hash              | 空文字列を返す                       | -     |
| TC-016  | .. を含むパストラバーサル             | Boundary - path traversal            | 空文字列を返す（セキュリティガード） | -     |
| TC-017  | git show コマンドが失敗               | Equivalence - error                  | 空文字列を返す                       | -     |
| TC-018  | ^ のみ（ベースハッシュなし）          | Boundary - invalid                   | 空文字列を返す                       | -     |
| TC-019  | HEAD ref                              | Equivalence - normal                 | ファイル内容を返す                   | -     |
| TC-020  | HEAD^ ref                             | Equivalence - normal                 | 親コミットのファイル内容を返す       | -     |

## S4: スタッシュコマンド (apply/pop/drop/branch)

> Origin: Feature 001 (menu-bar-enhancement) Task 4.2
> Added: 2026-02-25

**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                            | Perspective (Equivalence / Boundary) | Expected Result                                           | Notes                   |
| ------- | ----------------------------------------------- | ------------------------------------ | --------------------------------------------------------- | ----------------------- |
| TC-021  | applyStash(repo, "stash@{0}", false)            | Equivalence - normal                 | git args: `["stash", "apply", "stash@{0}"]`               | reinstateIndex = false  |
| TC-022  | applyStash(repo, "stash@{0}", true)             | Equivalence - with option            | git args: `["stash", "apply", "--index", "stash@{0}"]`    | reinstateIndex = true   |
| TC-023  | popStash(repo, "stash@{1}", false)              | Equivalence - normal                 | git args: `["stash", "pop", "stash@{1}"]`                 | reinstateIndex = false  |
| TC-024  | popStash(repo, "stash@{1}", true)               | Equivalence - with option            | git args: `["stash", "pop", "--index", "stash@{1}"]`      | reinstateIndex = true   |
| TC-025  | dropStash(repo, "stash@{2}")                    | Equivalence - normal                 | git args: `["stash", "drop", "stash@{2}"]`                | -                       |
| TC-026  | branchFromStash(repo, "my-branch", "stash@{0}") | Equivalence - normal                 | git args: `["stash", "branch", "my-branch", "stash@{0}"]` | -                       |
| TC-027  | applyStash でコンフリクト発生                   | Equivalence - error                  | エラーメッセージ文字列を返す（null ではない）             | stderr からのメッセージ |
| TC-028  | dropStash で不正セレクタ                        | Equivalence - error                  | エラーメッセージ文字列を返す                              | 通常発生しないがガード  |

## S5: Uncommittedコマンド (push/reset/clean)

> Origin: Feature 001 (menu-bar-enhancement) Task 5.2
> Added: 2026-02-25

**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                      | Perspective (Equivalence / Boundary)  | Expected Result                                                                  | Notes                                      |
| ------- | ----------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| TC-029  | pushStash(repo, "WIP message", true)      | Equivalence - normal (full options)   | git args: `["stash", "push", "--message", "WIP message", "--include-untracked"]` | メッセージ + untracked                     |
| TC-030  | pushStash(repo, "WIP message", false)     | Equivalence - normal (message only)   | git args: `["stash", "push", "--message", "WIP message"]`                        | メッセージのみ                             |
| TC-031  | pushStash(repo, "", true)                 | Equivalence - normal (untracked only) | git args: `["stash", "push", "--include-untracked"]`                             | --message フラグなし                       |
| TC-032  | pushStash(repo, "", false)                | Boundary - minimal args               | git args: `["stash", "push"]`                                                    | オプションなし                             |
| TC-033  | resetUncommitted(repo, "mixed")           | Equivalence - normal                  | git args: `["reset", "--mixed", "HEAD"]`                                         | -                                          |
| TC-034  | resetUncommitted(repo, "hard")            | Equivalence - normal                  | git args: `["reset", "--hard", "HEAD"]`                                          | -                                          |
| TC-035  | resetUncommitted(repo, "soft")            | Equivalence - invalid mode            | エラーまたは拒否される                                                           | VALID_UNCOMMITTED_RESET_MODES に含まれない |
| TC-036  | resetUncommitted(repo, "invalid")         | Equivalence - invalid mode            | エラーまたは拒否される                                                           | 不正な文字列                               |
| TC-037  | resetUncommitted(repo, "")                | Boundary - empty                      | エラーまたは拒否される                                                           | 空文字列                                   |
| TC-038  | cleanUntrackedFiles(repo, false)          | Equivalence - normal                  | git args: `["clean", "-f"]`                                                      | ディレクトリ除外                           |
| TC-039  | cleanUntrackedFiles(repo, true)           | Equivalence - with option             | git args: `["clean", "-f", "-d"]`                                                | ディレクトリ含む                           |
| TC-040  | pushStash で git コマンドが失敗           | Equivalence - error                   | エラーメッセージ文字列を返す（null ではない）                                    | stderr からのメッセージ                    |
| TC-041  | cleanUntrackedFiles で git コマンドが失敗 | Equivalence - error                   | エラーメッセージ文字列を返す（null ではない）                                    | stderr からのメッセージ                    |

## S6: fetch() --prune

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 4.2
> Added: 2026-02-25

**シグネチャ**: `fetch(repo: string): Promise<GitCommandStatus>`
**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition         | Perspective (Equivalence / Boundary) | Expected Result                                       | Notes                        |
| ------- | ---------------------------- | ------------------------------------ | ----------------------------------------------------- | ---------------------------- |
| TC-042  | 有効なrepoパス               | Equivalence - normal                 | ["fetch", "--all", "--prune"] 引数で git が実行される | --prune が追加されていること |
| TC-043  | fetch成功 (exit code 0)      | Equivalence - normal                 | null を返す                                           | 成功時はnull                 |
| TC-044  | fetchエラー (exit code != 0) | Equivalence - error                  | stderr メッセージ文字列を返す                         | リモート接続失敗等           |
| TC-045  | spawn がエラーイベントを発行 | Equivalence - error (spawn)          | エラーメッセージ文字列を返す                          | spawn error event            |

## S7: getCommitComparison() 差分取得

> Origin: Feature 002 (menubar-search-diff) Task 2.2
> Added: 2026-02-25

**シグネチャ**: `getCommitComparison(repo: string, fromHash: string, toHash: string): Promise<GitFileChange[] | null>`
**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                                   | Perspective (Equivalence / Boundary) | Expected Result                                                                  | Notes                                  |
| ------- | ------------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------- | -------------------------------------- |
| TC-046  | fromHash: 有効なハッシュ, toHash: 有効なハッシュ       | Equivalence - normal                 | GitFileChange[] を返す                                                           | nameStatus + numStat の並列実行        |
| TC-047  | 差分にリネームファイル(R)を含む                        | Equivalence - normal                 | oldFilePath と newFilePath が異なる GitFileChange を返す                         | --find-renames による検出              |
| TC-048  | 差分にA/M/D/R全種を含む                                | Equivalence - normal                 | 各変更種別が正しく分類される                                                     | --diff-filter=AMDR                     |
| TC-049  | numStat の追加行数・削除行数                           | Equivalence - normal                 | additions, deletions に正しい数値が設定される                                    | numStat パースの検証                   |
| TC-050  | toHash: 空文字（作業ツリー比較）                       | Boundary - empty toHash              | git diff引数にtoHashが含まれない。作業ツリーとの差分を返す。ls-filesも実行される | isToWorkingTree=true                   |
| TC-051  | fromHash: UNCOMMITTED_CHANGES_HASH ("\*")              | Boundary - special hash              | toHashがdiffベースとして使用される                                               | UNCOMMITTED特殊処理                    |
| TC-052  | 変更ファイルが0件                                      | Boundary - empty result              | 空配列 [] を返す（nullではない）                                                 | 同一コミット間 or 差分なし             |
| TC-053  | git diffコマンドがエラー終了                           | Equivalence - error                  | null を返す                                                                      | spawn例外時にcatchブロックでnull返却   |
| TC-054  | numStatの出力行がnameStatusと不一致                    | Boundary - malformed                 | 取得可能なデータのみで結果を構成する                                             | パースの堅牢性                         |
| TC-055  | fromHash=UNCOMMITTED_CHANGES_HASH + 未追跡ファイルあり | Equivalence - normal                 | ls-filesが実行され、結果に未追跡ファイルが含まれる                               | isToWorkingTree=true時のみls-files実行 |
| TC-056  | toHash="" (作業ツリー比較) + 未追跡ファイルあり        | Equivalence - normal                 | ls-filesが実行され、結果に未追跡ファイルが含まれる                               | toHash空文字でもisToWorkingTree=true   |
| TC-057  | 2コミット間比較（fromHash, toHash共に有効ハッシュ）    | Boundary - no ls-files               | ls-filesは実行されない（spawn呼び出しは2回のみ）                                 | isToWorkingTree=false                  |
| TC-058  | 作業ツリー比較 + 未追跡ファイルがdiff出力と重複        | Boundary - dedup                     | 重複ファイルは1回のみ含まれる                                                    | fileLookupで既存エントリをスキップ     |
| TC-059  | 作業ツリー比較 + 未追跡ファイル0件                     | Boundary - empty untracked           | diff出力のみで結果が構成される                                                   | -                                      |
| TC-060  | 作業ツリー比較 + ls-files出力に空行が混在              | Boundary - empty line                | 空行はスキップされ、有効なファイルパスのみ追加される                             | filePath === "" ガード                 |

## S8: getUncommittedDetails() 未コミット詳細

> Origin: Feature 002 (menubar-search-diff) Task 2.2
> Added: 2026-02-25

**シグネチャ**: `getUncommittedDetails(repo: string): Promise<GitCommitDetails | null>`
**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                        | Perspective (Equivalence / Boundary) | Expected Result                                      | Notes                                      |
| ------- | ------------------------------------------- | ------------------------------------ | ---------------------------------------------------- | ------------------------------------------ |
| TC-061  | staged/unstaged変更 + 未追跡ファイルあり    | Equivalence - normal                 | fileChangesにdiff結果 + 未追跡ファイルが含まれる     | nameStatus + numStat + ls-filesの3並列実行 |
| TC-062  | staged/unstaged変更のみ、未追跡ファイルなし | Equivalence - normal                 | fileChangesにdiff結果のみ含まれる                    | -                                          |
| TC-063  | diff出力なし、未追跡ファイルのみ存在        | Boundary - diff empty                | fileChangesに未追跡ファイルのみ含まれる              | -                                          |
| TC-064  | 未追跡ファイルがdiff結果のnewFilePathと重複 | Boundary - dedup                     | 重複ファイルは1回のみ含まれる                        | fileLookupで既存エントリをスキップ         |
| TC-065  | ls-files出力に空行が混在                    | Boundary - empty line                | 空行はスキップされ、有効なファイルパスのみ追加される | filePath === "" ガード                     |
| TC-066  | git diff または ls-files が例外をスロー     | Equivalence - error                  | null を返す                                          | catch ブロックでnull返却                   |
| TC-067  | 正常なdiff出力（リネーム含む）              | Equivalence - normal                 | GitCommitDetails を返す。正しいtype/pathが設定される | nameStatus パースの基本検証                |

## S9: checkoutBranch() -Bフラグ

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 2.2
> Added: 2026-02-25

**シグネチャ**: `checkoutBranch(repo: string, branchName: string, remoteBranch: string | null): Promise<GitCommandStatus>`
**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                                        | Perspective (Equivalence / Boundary)    | Expected Result                                         | Notes                   |
| ------- | ----------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------- | ----------------------- |
| TC-068  | remoteBranch = "origin/feature/x", branchName = "feature/x" | Equivalence - normal (リモートcheckout) | git checkout -B feature/x origin/feature/x が実行される | -b ではなく -B          |
| TC-069  | remoteBranch = null, branchName = "main"                    | Equivalence - normal (ローカルcheckout) | git checkout main が実行される（-Bフラグなし）          | 既存動作維持            |
| TC-070  | remoteBranch = "origin/invalid..branch"                     | Equivalence - error                     | gitがエラーを返す（不正ブランチ名）                     | gitバリデーションに依存 |

## S10: pull() / push()

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 3.3
> Added: 2026-02-25

**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                    | Perspective (Equivalence / Boundary) | Expected Result                                                | Notes                |
| ------- | --------------------------------------- | ------------------------------------ | -------------------------------------------------------------- | -------------------- |
| TC-071  | 有効なrepoパス                          | Equivalence - normal (pull)          | ["pull"] 引数で git が実行される                               | 引数なしのgit pull   |
| TC-072  | pull成功 (exit code 0)                  | Equivalence - normal                 | null を返す (GitCommandStatus)                                 | 成功時はnull         |
| TC-073  | pullエラー (exit code != 0, stderrあり) | Equivalence - error (pull failure)   | stderr メッセージ文字列を返す                                  | マージコンフリクト等 |
| TC-074  | 有効なrepoパス                          | Equivalence - normal (push)          | ["push"] 引数で git が実行される                               | 引数なしのgit push   |
| TC-075  | push成功 (exit code 0)                  | Equivalence - normal                 | null を返す (GitCommandStatus)                                 | 成功時はnull         |
| TC-076  | pushエラー (exit code != 0, stderrあり) | Equivalence - error (push failure)   | stderr メッセージ文字列を返す                                  | upstream未設定等     |
| TC-077  | push: upstream未設定                    | Equivalence - error (no upstream)    | "fatal: The current branch ... has no upstream branch." を返す | git標準エラー        |
