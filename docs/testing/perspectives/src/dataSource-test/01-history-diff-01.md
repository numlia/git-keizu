# テスト観点表: src/dataSource.ts

> Source: `src/dataSource.ts`
> Generated: 2026-05-02T01:45:44Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: history-diff

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
> Status: superseded
> Superseded By: S35
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
> Status: superseded
> Superseded By: S36
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

## S28: runGitCommandSpawn() / spawnGit() 出力バッファの結合デコード

> Origin: フェーズ1 修正 M2 (spawn-buffer-concat)
> Added: 2026-07-04T01:35:00Z
> Status: active
> Supersedes: -
> Signature: `private runGitCommandSpawn(args: string[], repo: string): Promise<GitCommandStatus>` / `private spawnGit<T>(args, repo, successValue, errorValue): Promise<T>`
> Target Path: `src/dataSource.ts:1100-1153`

stdout/stderr を文字列連結（`stdout += d`）で蓄積していた実装を Buffer 配列（`stdoutChunks.push(Buffer.from(d))`）+ `Buffer.concat(chunks).toString()` の一括デコード方式へ変更。マルチバイト文字がチャンク境界で分割されても文字化け（U+FFFD 置換文字）せずに復元されることを保証する追加観点。

| Case ID | Input / Precondition                                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                             | Notes                                     |
| ------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------- |
| TC-166  | spawnGit, exit 0。UTF-8 3バイト文字 "あ"(E3 81 82) を data イベント2回 `[E3,81]` と `[82]` に分割して emit | Normal - multibyte chunk boundary restore                                  | successValue が結合デコード後の `"あ"` で1回呼ばれる。U+FFFD(`�`) を含まない                | Buffer.concat による境界復元              |
| TC-167  | spawnGit, exit 0。ASCII `"abc"` を単一 data イベントで emit                                                | Normal - single chunk decode                                               | successValue が `"abc"` で1回呼ばれる                                                       | 単一チャンクの通常経路                    |
| TC-168  | spawnGit, exit 0。data イベントを一度も emit しない                                                        | Boundary - no data events                                                  | `Buffer.concat([])` が空文字となり、successValue が `""` で1回呼ばれる                      | 出力なし境界                              |
| TC-169  | spawnGit, exit code 非0（close code=1）                                                                    | Exception - error value fallback                                           | errorValue がそのまま解決される。successValue は呼ばれない（0回）                           | 非正常終了時フォールバック                |
| TC-170  | runGitCommandSpawn, exit code 非0。stdout にマルチバイト文字を2チャンク分割で emit                         | Exception - error stdout multibyte restore                                 | 結合デコードされた stdout を eol 分割し末尾行を除いた文字列が解決される。文字化けを含まない | close code≠0 の stdout 経路（L1121-1124） |
| TC-171  | runGitCommandSpawn, exit code 非0。stdout は空、stderr に2チャンク emit                                    | Exception - stderr concat fallback                                         | stdout が空のため結合デコードされた stderr 由来の文字列が解決される                         | stdout 空時の stderr フォールバック       |
| TC-172  | runGitCommandSpawn, exit code 0                                                                            | Normal - success null                                                      | `null` が解決される（成功）                                                                 | 正常終了時                                |

## S30: getBranches() 分離 HEAD 疑似ブランチ行の検出拡張（headRegex）

> Origin: フェーズ2 修正 M3 (detached-head-detection)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: `const headRegex = /^\(HEAD detached (at\|from) .+\)$/` / `getBranches()` の `stdout` パーサ
> Target Path: `src/dataSource.ts:25, 129-132`

`headRegex` を旧 `/^\(HEAD detached at [0-9A-Za-z]+\)/g`（`at` のみ・16進英数字のみ・非アンカー・global）から `/^\(HEAD detached (at\|from) .+\)$/`（`at`/`from` 両対応・任意文字・行末アンカー・非global）へ差し替える修正。`git branch` 出力に現れる分離 HEAD の疑似ブランチ行（`(HEAD detached at <hash>)` / `(HEAD detached from <ref>)`）を確実に検出して `continue` でスキップし、実ブランチ一覧に混入させない。global フラグ除去により `String.match` の `lastIndex` 状態を持たない。

| Case ID | Input / Precondition                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                          | Notes                                              |
| ------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| TC-179  | branch 行 name=`(HEAD detached at 1a2b3c4)`                         | Normal - detached at skipped                                               | `headRegex.match` が非 null となり `continue`。`branches` 配列にこの行が追加されない                     | 従来 `at` 形式の分離 HEAD 行                       |
| TC-180  | branch 行 name=`(HEAD detached from origin/main)`                   | Normal - detached from variant                                             | `headRegex` にマッチし `continue`。`branches` に追加されない（旧 `at` 限定正規表現では取りこぼしていた） | `from` 形式検出の追加ケース                        |
| TC-181  | branch 行 name=`(HEAD detached at v1.0-rc.1)`（非英数字を含む ref） | Boundary - non-alphanumeric ref                                            | `.+` により `.`/`-` を含む ref でもマッチし `continue`。`branches` に追加されない                        | 旧 `[0-9A-Za-z]+` では不一致だった境界             |
| TC-182  | branch 行 name=`main`（通常ブランチ）                               | Normal - real branch retained                                              | `headRegex.match` が null となり `continue` せず、`branches` に `main` が追加される                      | 実ブランチが誤スキップされないこと                 |
| TC-183  | branch 行 name=`feature/(HEAD detached at x)`（語句を含む枝名）     | Boundary - start anchor                                                    | `^` アンカーにより先頭が `(` でないためマッチせず、`branches` に追加される                               | `^` アンカーで語句を含む実ブランチを過剰一致しない |

## S31: spawn オプションへのロケール固定 env 付与（LC_ALL=C）

> Origin: フェーズ2 修正 M3 (spawn-locale-lc-all-c)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: `private runGitCommandSpawn(args, repo)` / `private spawnGit<T>(args, repo, successValue, errorValue)`
> Target Path: `src/dataSource.ts:1107-1110, 1147-1150`

両 spawn ヘルパーの `cp.spawn` 第3引数を `{ cwd: repo }` から `{ cwd: repo, env: { ...process.env, LC_ALL: "C" } }` へ変更する修正。git のメッセージ・porcelain 出力を C ロケールに固定し、実行環境のロケール差異に依存せず（headRegex の英語文言マッチ等が）決定的に動作することを保証する。`process.env` を展開して既存の環境変数を保持しつつ `LC_ALL` のみ `"C"` で上書きする。

| Case ID | Input / Precondition                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                            | Notes                                        |
| ------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------- |
| TC-184  | runGitCommandSpawn 実行、repo=`/r`                                      | Normal - env option present                                                | `cp.spawn` が第3引数 `{ cwd: "/r", env: objectContaining({ LC_ALL: "C" }) }` で1回呼ばれる | run 側 spawn オプション                      |
| TC-185  | spawnGit 実行、repo=`/r`                                                | Normal - env option present                                                | `cp.spawn` の第3引数の `cwd` が `"/r"`、`env.LC_ALL` が `"C"` である                       | spawnGit 側 spawn オプション                 |
| TC-186  | `process.env.PATH="/usr/bin"` が存在する状態で spawnGit 実行            | Boundary - existing env preserved                                          | spawn へ渡る `env.PATH` が `"/usr/bin"` のまま保持され、かつ `env.LC_ALL` が `"C"` である  | `...process.env` 展開で既存変数が消えない    |
| TC-187  | `process.env.LC_ALL="ja_JP.UTF-8"` が事前設定された状態で spawnGit 実行 | Boundary - override precedence                                             | spawn へ渡る `env.LC_ALL` が継承値 `"ja_JP.UTF-8"` ではなく `"C"` に上書きされている       | 上書き優先順位（スプレッド後に LC_ALL 指定） |
