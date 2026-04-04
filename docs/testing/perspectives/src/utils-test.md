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
> Status: active
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
