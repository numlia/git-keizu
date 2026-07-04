# テスト観点表: src/dataSource.ts

> Source: `src/dataSource.ts`
> Generated: 2026-05-02T01:45:44Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: branch-worktree

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

## S25: getNewPathOfRenamedFile() リネーム追跡

> Origin: Feature 026 (commit-detail-open-file) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: superseded
> Supersedes: -
> Superseded By: S27

**シグネチャ**: `getNewPathOfRenamedFile(repo: string, commitHash: string, oldFilePath: string): Promise<string | null>`
**テスト対象パス**: `src/dataSource.ts`

| Case ID | Input / Precondition                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                           | Notes                              |
| ------- | ----------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| TC-142  | リネームされたファイル（old.ts → new.ts）の diff 出力 | Normal - rename found                                                      | "new.ts" が返される                                                                                       | null-byte 区切りパース             |
| TC-143  | リネームされていないファイル（空の diff 出力）        | Normal - no rename                                                         | null が返される                                                                                           | マッチなし                         |
| TC-144  | 無効なコミットハッシュ（非16進数文字列）              | Validation - invalid hash                                                  | null が返される。cp.spawn が呼ばれないことを検証する                                                      | isValidCommitHash() ガード         |
| TC-145  | ".." を含むファイルパス                               | Validation - path traversal                                                | null が返される。cp.spawn が呼ばれないことを検証する                                                      | パストラバーサルガード             |
| TC-146  | git diff コマンドが exit code 非0 で終了              | Exception - git error                                                      | null が返される                                                                                           | spawnGit errorValue フォールバック |
| TC-147  | spawn が error イベントを emit                        | Exception - spawn error                                                    | null が返される                                                                                           | プロセスエラー                     |
| TC-148  | git diff の stdout が空                               | Boundary - empty output                                                    | null が返される                                                                                           | 空出力                             |
| TC-149  | 有効な入力で git diff を実行                          | Normal - args verification                                                 | cp.spawn が ["diff", "--diff-filter=R", "--find-renames", "-z", hash, "HEAD", "--", "file.ts"] で呼ばれる | git 引数の正確性検証               |

## S27: getNewPathOfRenamedFile() リネーム追跡（pathspec 除去 + name-status カーソルパース）

> Origin: フェーズ1 修正 H2 (rename-tracking-repair)
> Added: 2026-07-04T01:35:00Z
> Status: active
> Supersedes: S25
> Signature: `getNewPathOfRenamedFile(repo: string, commitHash: string, oldFilePath: string): Promise<string | null>`
> Target Path: `src/dataSource.ts:567-610`

pathspec 制限（`"--", oldFilePath`）を除去し `--name-status` を追加した新 args と、NUL 区切り name-status（`R<score>\0old\0new\0`）をカーソル方式（R は +3 / 他は +2）でパースする実装への差し替え。`getPathFromStr(old) === oldFilePath` 一致レコードの new を返す。旧 S25 は pathspec 付き args と単純ループを固定していたため supersede する。

| Case ID | Input / Precondition                                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                           | Notes                                        |
| ------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| TC-156  | stdout=`"R100\0old.ts\0new.ts\0"`, oldFilePath=`"old.ts"`                                 | Normal - single rename match                                               | `"new.ts"` が返される（`getPathFromStr(fields[2])`）                                                                                                      | 単一 R レコードの old 一致                   |
| TC-157  | 有効な commitHash と oldFilePath で実行                                                   | Normal - args (no pathspec)                                                | cp.spawn が `["diff", "--name-status", "--diff-filter=R", "--find-renames", "-z", commitHash, "HEAD"]` で呼ばれる。末尾に `"--"` / oldFilePath を含まない | pathspec 除去の検証                          |
| TC-158  | stdout=`"R100\0a.ts\0b.ts\0R100\0old.ts\0new.ts\0"`, oldFilePath=`"old.ts"`               | Normal - multiple records second match                                     | 1件目（a.ts→b.ts）は old 不一致で cursor+=3、2件目の old 一致で `"new.ts"` が返される                                                                     | カーソル前進と複数レコード走査               |
| TC-159  | stdout=`"R100\0other.ts\0renamed.ts\0"`, oldFilePath=`"old.ts"`                           | Validation - no matching old path                                          | old 不一致のまま cursor が末尾へ到達し `null` が返される                                                                                                  | 一致レコードなし                             |
| TC-160  | stdout=`""`（空文字）, oldFilePath=`"old.ts"`                                             | Boundary - empty output                                                    | `fields=[""]` で while 条件 `fields[0] !== ""` が false となり `null` が返される                                                                          | 空 diff 出力                                 |
| TC-161  | stdout=`"X\0a.ts\0b.ts\0"`（VALID_FILE_CHANGE_TYPES 外の status）, oldFilePath=`"a.ts"`   | Type - invalid status char                                                 | `VALID_FILE_CHANGE_TYPES.has("X")` が false のため break し `null` が返される                                                                             | 想定外 status での防御的中断                 |
| TC-162  | commitHash=`"not-a-hex-hash"`（16進数以外）                                               | Validation - invalid hash guard                                            | `null` が返される。cp.spawn が呼ばれない（0回）                                                                                                           | `isValidCommitHash()` ガード（L572）         |
| TC-163  | oldFilePath=`"../secret.ts"`（".." セグメント含む）                                       | Validation - path traversal guard                                          | `null` が返される。cp.spawn が呼ばれない（0回）                                                                                                           | パストラバーサルガード（L575）               |
| TC-164  | git diff が exit code 非0 で終了                                                          | Exception - git error fallback                                             | spawnGit の errorValue により `null` が返される                                                                                                           | 外部プロセス失敗時フォールバック             |
| TC-165  | stdout=`"R100\0old.ts\0"`（new フィールド欠落の切り詰めレコード）, oldFilePath=`"old.ts"` | Boundary - truncated record missing new path                               | `fields[cursor+2]` が undefined のため `getPathFromStr("")` すなわち空文字 `""` が返される                                                                | 欠損 new フィールドの `?? ""` フォールバック |
