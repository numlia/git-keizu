# テスト観点表: src/dataSource.ts

> Source: `src/dataSource.ts`
> Generated: 2026-07-04T04:29:24Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: spawn-refname-diff

## S32: spawnGit() stderr ストリームのドレイン

> Origin: フェーズ3 修正 L1 (spawn-stderr-drain)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: -
> Signature: `private spawnGit<T>(args: string[], repo: string, successValue: (stdout: string) => T, errorValue: T): Promise<T>`
> Target Path: `src/dataSource.ts:1244-1247`

`spawnGit` の子プロセスに `cmd.stderr.on("data", () => {})` を追加し、stderr ストリームを常時ドレイン（消費）する修正。ドレインしないと OS のパイプバッファ上限（Linux で既定 64KB）を超える stderr 出力が発生した場合に子プロセスの書き込みが `write` システムコールでブロックし、`close` イベントが到達せず Promise が解決されないハングを招く。ドレインハンドラは値を捨てるだけで stdout パースには影響しない。

| Case ID | Input / Precondition                                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                            | Notes                            |
| ------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------- |
| TC-188  | spawnGit 実行、`cmd.stderr` に `data` リスナが登録されているかを検証                             | Normal - stderr listener registered                                        | `cmd.stderr.on` が `"data"` イベントに対して1回呼ばれ、リスナ関数が登録される                              | ドレインハンドラの存在確認       |
| TC-189  | spawnGit exit 0。stderr に大量データ（`data` イベント複数回）を emit した後に `close(0)` を emit | External - large stderr drained without hang                               | stderr の内容に関わらず `close` が処理され、`successValue(stdout)` が1回解決される。Promise がハングしない | stderr バッファ滞留の回避        |
| TC-190  | spawnGit exit 0。stderr に `data` を emit しつつ stdout にも `data` を emit                      | Boundary - stderr consumed but stdout preserved                            | `successValue` は stdout 由来の文字列のみで呼ばれ、stderr 内容は結果に混入しない                           | ドレインが stdout パースへ非干渉 |

## S33: runGitCommandSpawn() 末尾空行の条件付き除去

> Origin: フェーズ3 修正 L2 (spawn-conditional-trailing-slice)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: -
> Signature: `private runGitCommandSpawn(args: string[], repo: string): Promise<GitCommandStatus>`
> Target Path: `src/dataSource.ts:1219-1226`

close code≠0 経路の出力整形を、無条件に最終行を落とす `lines.slice(0, lines.length - 1).join("\n")` から、`lines[lines.length - 1] === ""` のときだけ末尾要素を `pop()` する条件付き除去へ変更する修正。git のエラーメッセージが末尾改行なしで出力された場合に、旧実装では最終行（＝実メッセージの一部）が欠落していた。末尾に改行があるとき（分割後に末尾が空文字）のみ空要素を除去し、それ以外は全行を保持する。

| Case ID | Input / Precondition                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                       | Notes                           |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------- |
| TC-191  | close code=1、stdout=`"error line\n"`（末尾改行あり）        | Normal - trailing newline popped                                           | 解決文字列が `"error line"`（末尾空行のみ除去）となる                                 | 末尾空文字 pop 経路             |
| TC-192  | close code=1、stdout=`"fatal: bad revision"`（末尾改行なし） | Boundary - no trailing newline preserves last line                         | 解決文字列が `"fatal: bad revision"` 全体となり、最終行が欠落しない                   | 旧無条件 slice で落ちていた回帰 |
| TC-193  | close code=1、stdout=`"line1\nline2\n"`                      | Boundary - multiline trailing newline                                      | 解決文字列が `"line1\nline2"`（末尾空行のみ除去、中間行は保持）                       | 複数行 + 末尾改行               |
| TC-194  | close code=1、stdout=`""`、stderr=`""`（両空）               | Boundary - empty output                                                    | `"".split(eolRegex)` が `[""]`、末尾が空文字のため pop され、解決文字列が `""` となる | 空出力の境界                    |

## S34: addTag()/createBranch() 先頭ハイフン ref 名の拒否

> Origin: フェーズ3 修正 L4 (ref-name-option-injection-guard)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: -
> Signature: `function isRefNameSafe(refName: string): boolean` / `public addTag(...)` / `public createBranch(repo, branchName, commitHash)`
> Target Path: `src/dataSource.ts:84-87, 746-751, 768-772`

`isRefNameSafe(refName) = !refName.startsWith("-")` を追加し、`addTag`（tagName）と `createBranch`（branchName）の冒頭で ref 名が `-` で始まる場合に git を起動せず `INVALID_REF_NAME_MESSAGE`（`"Invalid ref name."`）を `Promise.resolve` で返すガードを追加する修正。先頭 `-` の ref 名がそのまま git 引数へ渡るとオプション（例: `--delete`）として解釈されるオプションインジェクションを防ぐ。ガードは `spawnGit` 呼び出し前に短絡する。

| Case ID | Input / Precondition                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                             | Notes                            |
| ------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------- |
| TC-195  | `addTag(repo, "v1.0.0", false, "")`（通常タグ名）                   | Normal - valid tag name                                                    | git `tag` コマンドが `spawnGit` 経由で実行され、`INVALID_REF_NAME_MESSAGE` は返らない                       | 正常経路                         |
| TC-196  | `createBranch(repo, "feature/x", <有効ハッシュ>)`（通常ブランチ名） | Normal - valid branch name                                                 | git `branch` コマンドが実行され、`INVALID_REF_NAME_MESSAGE` は返らない                                      | 正常経路                         |
| TC-197  | `addTag(repo, "--delete", false, "")`                               | Validation - leading hyphen tag rejected                                   | `INVALID_REF_NAME_MESSAGE` が resolve され、`spawnGit` が呼ばれない（git 未起動）                           | オプション注入拒否               |
| TC-198  | `createBranch(repo, "-D", <有効ハッシュ>)`                          | Validation - leading hyphen branch rejected                                | `INVALID_REF_NAME_MESSAGE` が resolve され、`spawnGit` が呼ばれない。`isValidCommitHash` 判定にも到達しない | ガードが最優先で短絡             |
| TC-199  | `addTag(repo, "-", false, "")`（ハイフン単体）                      | Boundary - single hyphen                                                   | `"-".startsWith("-")` が true のため `INVALID_REF_NAME_MESSAGE` が返る                                      | 最小の不正入力境界               |
| TC-200  | `createBranch(repo, "", <有効ハッシュ>)`（空文字ブランチ名）        | Boundary - empty ref name                                                  | `"".startsWith("-")` が false のためガードを通過し、後続の `isValidCommitHash` 判定へ進む                   | 空文字は先頭ハイフン判定の対象外 |

## S35: getCommitComparison() NUL 区切り差分パース

> Origin: フェーズ3 修正 L5 (diff-nul-delimited-parse)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: S7
> Signature: `getCommitComparison(repo: string, fromHash: string, toHash: string): Promise<GitFileChange[] | null>`
> Target Path: `src/dataSource.ts:505-616`

`git diff --name-status` / `--numstat` に `-z`（`NULL_BYTE_OPTION`）を付与し、出力を `eolRegex` 改行分割から `NULL_BYTE_SEPARATOR`（NUL）分割へ変更。パスの引用・タブ・改行を含むファイル名でも壊れないカーソル型パースへ統一する修正。name-status は先頭ステータス文字を検証し、`R`（リネーム）は `status\0old\0new\0` の3トークン（カーソル +3）、それ以外は `status\0path\0` の2トークン（+2）。`VALID_FILE_CHANGE_TYPES` に含まれない文字で停止。numstat は `a\td\tpath\0` 通常行（+1）と、リネーム時の `a\td\t\0old\0new\0` 形式（path 欄が空文字のため `old`/`new` を後続トークンから読み `+3`）を判別し、`NaN` の追加/削除数は `null` を設定する。S7 の非 `-z`（タブ/改行分割）前提を置き換える。

| Case ID | Input / Precondition                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                        | Notes                                 |
| ------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| TC-201  | 2コミット間比較、name-status stdout=`"M\0src/a.ts\0"`、numstat stdout=`"3\t1\tsrc/a.ts\0"` | Normal - single modified file NUL parse                                    | `git diff` 引数に `NULL_BYTE_OPTION` が含まれ、`[{oldFilePath:"src/a.ts", newFilePath:"src/a.ts", type:"M", additions:3, deletions:1}]` が返る                         | 通常行 +2 / numstat +1                |
| TC-202  | name-status=`"R\0old.ts\0new.ts\0"`、numstat=`"2\t2\t\0old.ts\0new.ts\0"`                  | Normal - rename triple-token parse                                         | `{oldFilePath:"old.ts", newFilePath:"new.ts", type:"R", additions:2, deletions:2}` が返る。name-status カーソル +3、numstat は path 欄空文字を検出し old/new を読み +3 | リネームの NUL 3トークン              |
| TC-203  | name-status に A/M/D/R を各1件、対応する numstat を含む                                    | Normal - all change types classified                                       | 各 `type` が `A`/`M`/`D`/`R` に正しく分類され、`additions`/`deletions` が numstat 由来で設定される                                                                     | `--diff-filter=AMDR` + カーソルパース |
| TC-204  | numstat 行が `"-\t-\tbinary.png\0"`（バイナリ、数値が `-`）                                | Boundary - non-numeric numstat                                             | `parseInt("-",10)` が `NaN` のため `additions`/`deletions` が `null` に設定される                                                                                      | `Number.isNaN` → null 変換            |
| TC-205  | toHash=`""`（作業ツリー比較）、ls-files で未追跡ファイルあり                               | Normal - working tree with untracked                                       | `isToWorkingTree=true` で ls-files も実行され、未追跡ファイルが結果に含まれる。spawn は3回                                                                             | 作業ツリー経路                        |
| TC-206  | name-status stdout に不正なステータス文字（例先頭 `"X\0..."`）                             | Boundary - invalid status char breaks loop                                 | `VALID_FILE_CHANGE_TYPES.has("X")` が false でカーソルループが `break`。以降の行はパースされない                                                                       | 不正トークンで停止                    |
| TC-207  | numstat の path が fileLookup に存在しない（name-status と不一致）                         | Boundary - numstat orphan skipped                                          | `fileLookup[path]` が `undefined` のため additions/deletions は設定されず、`fileChanges` は name-status 由来のまま                                                     | パースの堅牢性（旧 TC-054 相当）      |
| TC-208  | 作業ツリー比較 + 未追跡ファイルが diff 出力の newFilePath と重複                           | Boundary - untracked dedup                                                 | 重複ファイルは `fileLookup` の既存判定で1回のみ含まれる                                                                                                                | 重複排除（旧 TC-058 相当）            |
| TC-209  | `git diff` コマンドが例外終了（spawn reject）                                              | Exception - handled error                                                  | `null` が返る（catch ブロック）                                                                                                                                        | エラー時 null 返却                    |

## S36: getUncommittedDetails() NUL 区切り差分パース

> Origin: フェーズ3 修正 L5 (diff-nul-delimited-parse)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: S8
> Signature: `getUncommittedDetails(repo: string): Promise<GitCommitDetails | null>`
> Target Path: `src/dataSource.ts:376-465`

`getUncommittedDetails` の `git diff HEAD --name-status` / `--numstat` に `-z` を付与し、S35 と同一の NUL 区切りカーソルパース（R は +3、他は +2、numstat リネームは path 欄空文字判別で +3、`NaN` → `null`）へ統一する修正。ls-files（未追跡ファイル）は `-z` 対象外で従来どおり。S8 の非 `-z` 前提を置き換える。

| Case ID | Input / Precondition                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                  | Notes                      |
| ------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------- |
| TC-210  | staged/unstaged 変更 + 未追跡ファイルあり。name-status/numstat は NUL 区切り stdout | Normal - diff plus untracked NUL parse                                     | `fileChanges` に diff 結果（NUL パース由来）+ 未追跡ファイルが含まれる。name-status/numstat/ls-files の3並列実行 | 3並列 + カーソルパース     |
| TC-211  | name-status=`"R\0a/old\0a/new\0"`、numstat=`"5\t0\t\0a/old\0a/new\0"`               | Normal - rename triple-token parse                                         | `{oldFilePath:"a/old", newFilePath:"a/new", type:"R", additions:5, deletions:0}` が `details.fileChanges` に入る | リネーム NUL 3トークン     |
| TC-212  | staged/unstaged 変更のみ、未追跡ファイルなし                                        | Normal - diff only                                                         | `fileChanges` に diff 結果のみ含まれる                                                                           | ls-files 空                |
| TC-213  | numstat 行が `"-\t-\t\0old\0new\0"`（バイナリのリネーム）                           | Boundary - non-numeric rename numstat                                      | path 欄空文字で old/new を読み `+3`、`additions`/`deletions` が `NaN` → `null` に設定される                      | リネーム + 非数値          |
| TC-214  | 未追跡ファイルが diff 結果の newFilePath と重複                                     | Boundary - untracked dedup                                                 | 重複ファイルは `fileLookup` の既存判定で1回のみ含まれる                                                          | 重複排除（旧 TC-064 相当） |
| TC-215  | name-status 先頭が不正ステータス文字（`VALID_FILE_CHANGE_TYPES` 外）                | Boundary - invalid status char breaks loop                                 | カーソルループが `break` し、以降パースされない                                                                  | 不正トークン停止           |
| TC-216  | ls-files 出力に空トークンが混在                                                     | Boundary - empty untracked token skipped                                   | 空文字パスはスキップされ、有効な未追跡ファイルのみ追加される                                                     | `filePath === ""` ガード   |
| TC-217  | `git diff` または `ls-files` が例外をスロー                                         | Exception - handled error                                                  | `null` が返る（catch ブロック）                                                                                  | エラー時 null 返却         |
