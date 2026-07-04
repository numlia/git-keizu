# テスト観点表: src/dataSource.ts

> Source: `src/dataSource.ts`
> Generated: 2026-05-02T01:45:44Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: author-watch-paths

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

## S26: getRepositoryStateWatchPaths() Git 管理ディレクトリ解決

> Origin: Feature 033 (watch-refresh-scope) Task 1
> Added: 2026-05-02T01:45:44Z
> Status: active
> Supersedes: -
> Signature: `public async getRepositoryStateWatchPaths(repo: string): Promise<string[]>`
> Target Path: `src/dataSource.ts`

| Case ID | Input / Precondition                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                            | Notes                                     |
| ------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| TC-150  | `git-dir=".git"`, `git-common-dir=".git"`                                    | Boundary - duplicate relative paths                                        | 戻り値が `["/test/repo/.git"]` になり、`rev-parse --git-dir` と `rev-parse --git-common-dir` が各1回 `cwd=repo` で呼ばれる | main worktree                             |
| TC-151  | `git-dir="/main/.git/worktrees/feature-x"`, `git-common-dir="/main/.git"`    | Normal - linked worktree                                                   | 戻り値が worktree git-dir を先頭にした `["/main/.git/worktrees/feature-x", "/main/.git"]` になる                           | linked worktree                           |
| TC-152  | `git-dir="./.git/worktrees/feature-x"`, `git-common-dir="/shared/repo/.git"` | Normal - mixed relative and absolute                                       | 相対パスが `repo` 基準の絶対パス `/test/repo/.git/worktrees/feature-x` に解決され、絶対パスはそのまま保持される            | 正規化                                    |
| TC-153  | `git-dir=".git"`, `git-common-dir` が非0終了                                 | External - git-common-dir failure                                          | 戻り値が `["/test/repo/.git"]` だけになり、失敗した `git-common-dir` は配列に含まれない                                    | 部分成功フォールバック                    |
| TC-154  | `git-dir` が error event、`git-common-dir="/main/.git"`                      | External - git-dir failure                                                 | 戻り値が `["/main/.git"]` だけになり、成功した `git-common-dir` の結果だけを返す                                           | error event フォールバック                |
| TC-155  | `git-dir` も `git-common-dir` も失敗                                         | External - all rev-parse failed                                            | 戻り値が空配列 `[]` になる                                                                                                 | watch root 解決不可時の最終フォールバック |

## S29: getGitLog() `--author` 正規表現メタ文字エスケープ

> Origin: フェーズ2 修正 M1 (author-filter-regex-escape)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: `function escapeRegExp(str: string): string` / `private getGitLog(repo, branches, num, showRemoteBranches, authors: string[])`
> Target Path: `src/dataSource.ts:64-66, 979-981`

`git log --author=<pattern>` は値を正規表現として解釈するため、著者名に含まれる正規表現メタ文字（`. * + ? ^ $ { } ( ) | [ ] \`）を `escapeRegExp` で `\` エスケープしてから `--author=` に連結する修正。`dependabot[bot]` のようなブラケットを含む著者を意図した完全一致で絞り込めるようにする。メタ文字を含まない著者名はエスケープ後も不変。

| Case ID | Input / Precondition                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                   | Notes                                |
| ------- | -------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------ |
| TC-173  | authors=["dependabot[bot]"]                  | Normal - bracket escape                                                    | git log 引数に `--author=dependabot\[bot\]` が含まれる（`[` と `]` が `\` エスケープされる）      | ブラケットを含むボット著者の完全一致 |
| TC-174  | authors=["Jane O'Brien"]（メタ文字なし）     | Normal - passthrough unchanged                                             | git log 引数に `--author=Jane O'Brien` がそのまま含まれる（`'` とスペースはメタ文字集合外で不変） | 既存挙動の後方互換（S13/S18 と整合） |
| TC-175  | authors=["a.b*c"]                            | Normal - dot and star escape                                               | git log 引数に `--author=a\.b\*c` が含まれる（`.` と `*` が `\` エスケープされる）                | 任意文字・量指定子メタ文字の無害化   |
| TC-176  | authors=["a\\b"]（バックスラッシュ）         | Boundary - backslash escape                                                | git log 引数に `--author=a\\b` が含まれる（`\` が `\\` へ二重化される）                           | バックスラッシュ自身のエスケープ     |
| TC-177  | authors=[""]（空文字列著者）                 | Boundary - empty author                                                    | git log 引数に `--author=` が含まれる（`escapeRegExp("")==="" `）。spawn は例外を投げない         | 空文字はメタ文字置換対象なし         |
| TC-178  | authors=["(a\|b)"]（グループ・選択メタ文字） | Boundary - group and alternation escape                                    | git log 引数に `--author=\(a\|b\)` が含まれる（`(`,`)`,`\|` が `\` エスケープされる）             | 選択・グループメタ文字の無害化       |
