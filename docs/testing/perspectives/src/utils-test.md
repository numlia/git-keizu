# テスト観点表: src/utils.ts

> Source: `src/utils.ts`
> Generated: 2026-04-04T12:00:00Z
> Language: TypeScript
> Test Framework: Vitest

## S1: doesFileExist() ファイル存在チェック

> Origin: Feature 026 (commit-detail-open-file) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: active
> Supersedes: -

**シグネチャ**: `doesFileExist(path: string): Promise<boolean>`
**テスト対象パス**: `src/utils.ts`

| Case ID | Input / Precondition                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result  | Notes                            |
| ------- | ------------------------------------ | -------------------------------------------------------------------------- | ---------------- | -------------------------------- |
| TC-001  | fs.access が正常解決するパス         | Normal - standard                                                          | true が返される  | fs.access(path, F_OK) のモック   |
| TC-002  | fs.access が ENOENT で拒否されるパス | Normal - non-existent path                                                 | false が返される | エラーを catch して false を返す |

## S2: openFile() パストラバーサル検証

> Origin: Feature 026 (commit-detail-open-file) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: superseded
> Superseded By: S6
> Supersedes: -

**シグネチャ**: `openFile(repo: string, filePath: string, commitHash: string, dataSource: DataSource, viewColumn: vscode.ViewColumn): Promise<string | null>`
**テスト対象パス**: `src/utils.ts`

| Case ID | Input / Precondition                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                               | Notes                          |
| ------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------ |
| TC-003  | filePath に ".." セグメントを含む（例: "../etc/passwd"）               | Validation - path traversal                                                | エラーメッセージ文字列が返される。vscode.commands.executeCommand が呼ばれない | 第一段チェック                 |
| TC-004  | path.resolve(repo, filePath) が repo プレフィックスを持たない          | Validation - prefix escape                                                 | エラーメッセージ文字列が返される。vscode.commands.executeCommand が呼ばれない | 第二段チェック                 |
| TC-005  | ファイル不在 + リネーム先取得 + 新パスが repo プレフィックスを持たない | Validation - renamed path traversal                                        | エラーメッセージ文字列が返される                                              | リネーム先にも prefix 検証適用 |

## S3: openFile() 正常ファイルオープン

> Origin: Feature 026 (commit-detail-open-file) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: active
> Supersedes: -

**シグネチャ**: `openFile(repo: string, filePath: string, commitHash: string, dataSource: DataSource, viewColumn: vscode.ViewColumn): Promise<string | null>`
**テスト対象パス**: `src/utils.ts`

| Case ID | Input / Precondition                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                 | Notes                       |
| ------- | -------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------- |
| TC-006  | ファイルが存在する                           | Normal - standard                                                          | null が返される。vscode.commands.executeCommand が "vscode.open", Uri, { preview: true, viewColumn } で呼ばれる | preview: true の検証        |
| TC-007  | ファイルが存在し viewColumn = ViewColumn.One | Normal - viewColumn pass-through                                           | vscode.open の第3引数に viewColumn: ViewColumn.One が含まれる                                                   | viewColumn パススルーの検証 |

## S4: openFile() リネーム追跡

> Origin: Feature 026 (commit-detail-open-file) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: active
> Supersedes: -

**シグネチャ**: `openFile(repo: string, filePath: string, commitHash: string, dataSource: DataSource, viewColumn: vscode.ViewColumn): Promise<string | null>`
**テスト対象パス**: `src/utils.ts`

| Case ID | Input / Precondition                                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                | Notes                                |
| ------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------ |
| TC-008  | ファイル不在 + getNewPathOfRenamedFile が新パスを返す + 新パスのファイルが存在する | Normal - rename success                                                    | null が返される。vscode.open が新パスの URI で呼ばれる                         | リネーム追跡成功フロー               |
| TC-009  | ファイル不在 + getNewPathOfRenamedFile が null を返す                              | Exception - no rename found                                                | "The file ... doesn't currently exist in this repository." が返される          | リネーム情報なし                     |
| TC-010  | ファイル不在 + リネーム先パスのファイルも存在しない                                | Exception - renamed path missing                                           | "The file ... doesn't currently exist in this repository." が返される          | リネーム先も不在                     |
| TC-011  | ファイル不在 + commitHash が UNCOMMITTED_CHANGES_HASH                              | Normal - uncommitted skip                                                  | エラーメッセージが返される。getNewPathOfRenamedFile が呼ばれないことを検証する | 未コミット変更はリネーム追跡スキップ |

## S5: openFile() エラーハンドリング

> Origin: Feature 026 (commit-detail-open-file) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: active
> Supersedes: -

**シグネチャ**: `openFile(repo: string, filePath: string, commitHash: string, dataSource: DataSource, viewColumn: vscode.ViewColumn): Promise<string | null>`
**テスト対象パス**: `src/utils.ts`

| Case ID | Input / Precondition                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                        | Notes                    |
| ------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------ |
| TC-012  | ファイルが存在する + vscode.commands.executeCommand が例外をスロー | Exception - vscode.open failure                                            | "Visual Studio Code was unable to open ..." が返される | try-catch でのエラー変換 |

## S6: openFile() path.relative ベースのパストラバーサル検証

> Origin: フェーズ3 修正 L12 (path-relative-traversal-guard)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: S2
> Signature: `openFile(repo: string, filePath: string, commitHash: string, dataSource: DataSource, viewColumn: vscode.ViewColumn): Promise<string | null>`
> Target Path: `src/utils.ts:70-99`

パストラバーサル検証を、旧2段方式（`filePath.split("/").includes("..")` の第1段 + `!resolvedPath.startsWith(repo)` の第2段）から、`path.relative(repo, path.resolve(repo, filePath))` の結果が `".."` で始まる、または `path.isAbsolute` である場合に拒否する単一方式へ置き換える修正。リネーム先パスにも同じ relative 方式を適用する。旧 `startsWith(repo)` は `repo="/a"` と `resolvedPath="/ab/x"` のような接頭辞共有の兄弟ディレクトリを誤って許可していたが、relative 方式はこれを `"../ab/x"` として確実に拒否する。S2 の split-includes + startsWith 前提を置き換える。

| Case ID | Input / Precondition                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                        | Notes                                                                                      |
| ------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| TC-013  | repo=`/repo`、filePath=`src/a.ts`（repo 内）                                 | Normal - inside repo allowed                                               | `path.relative` が `"src/a.ts"`（`".."` 始まりでも絶対でもない）でガードを通過し、ファイルオープン処理へ進む                           | 正常パス                                                                                   |
| TC-014  | repo=`/repo`、filePath=`../etc/passwd`                                       | Validation - relative escape rejected                                      | `path.relative` が `"../etc/passwd"` で `".."` 始まりのため `PATH_TRAVERSAL_ERROR` を返し、`vscode.commands.executeCommand` を呼ばない | 相対的な脱出                                                                               |
| TC-015  | repo=`/repo`、filePath=`/etc/passwd`（絶対パス）                             | Type - absolute path rejected                                              | `path.resolve` 後の `path.relative` 判定で拒否され、`PATH_TRAVERSAL_ERROR` を返す（`..` 始まり／`isAbsolute` いずれかで捕捉）          | 絶対パス。`isAbsolute` 分岐は Windows のドライブ跨ぎで顕在化、POSIX では `..` 始まりで捕捉 |
| TC-016  | ファイル不在 + `getNewPathOfRenamedFile` が repo 外へ脱出する新パスを返す    | Validation - renamed path escape rejected                                  | リネーム先の `path.relative` が `".."` 始まりのため `PATH_TRAVERSAL_ERROR` を返す                                                      | リネーム先にも relative 検証適用                                                           |
| TC-017  | repo=`/repo`、filePath=`""`（repo ルート自身に解決）                         | Boundary - repo root allowed                                               | `path.relative(repo, repo)` が `""` で `".."` 始まりでも絶対でもないためガードを通過する                                               | repo ルート境界                                                                            |
| TC-018  | repo=`/repo`、resolvedPath が `/repo-evil/x`（接頭辞共有の兄弟ディレクトリ） | Boundary - sibling prefix rejected                                         | `path.relative` が `"../repo-evil/x"` で `".."` 始まりのため拒否される（旧 `startsWith("/repo")` は誤許可していた）                    | L12 の中核回帰                                                                             |
