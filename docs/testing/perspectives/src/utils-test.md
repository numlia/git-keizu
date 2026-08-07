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

## S7: isValidCommitHash() コミットハッシュ値域の共有 helper

> Origin: Feature 052 (detached-worktree-display) (light-spec-plan)
> Added: 2026-08-08
> Status: active
> Supersedes: -
> Signature: `isValidCommitHash(hash: string): boolean`
> Target Path: `src/utils.ts`（`isValidCommitHash()`。実装後に行範囲へ更新）
> Test File: `tests/src/utils.test.ts`

`src/dataSource.ts` の非公開 helper（`/^[0-9a-f]{4,40}$/i`）を `src/utils.ts` へ移して export し、DataSource と `src/worktree.ts` が同じ規則を使えるようにする追加。値域は現行のまま変えず、SHA-256 の 64 文字 object ID は本対応の対象外として拒否されることを固定する。移動元の各 call site の振る舞いは `src/dataSource-test/` の既存 section が担保し、本 section は helper 単体の値域だけを対象とする。

| Case ID | Input / Precondition                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result         | Notes                                    |
| ------- | --------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------- | ---------------------------------------- |
| TC-019  | `hash` = 40 文字の小文字 16 進文字列                | Normal - full length hash                                                  | 戻り値が `true` である  | 通常の完全ハッシュ。最大長の境界も兼ねる |
| TC-020  | `hash` = `"ABCD1234"`（大文字 16 進）               | Normal - case insensitive                                                  | 戻り値が `true` である  | `/i` フラグの維持                        |
| TC-021  | `hash` = `"abcd"`（4 文字）                         | Boundary - minimum length                                                  | 戻り値が `true` である  | 短縮ハッシュの下限                       |
| TC-022  | `hash` = `"abc"`（3 文字）                          | Boundary - minimum minus one                                               | 戻り値が `false` である | 下限 -1                                  |
| TC-023  | `hash` = 41 文字の 16 進文字列                      | Boundary - maximum plus one                                                | 戻り値が `false` である | 上限 +1                                  |
| TC-024  | `hash` = `""`（空文字列）                           | Boundary - empty                                                           | 戻り値が `false` である | 空入力                                   |
| TC-025  | `hash` = 64 文字の 16 進文字列（SHA-256 object ID） | Boundary - sha-256 length rejected                                         | 戻り値が `false` である | 6 章の対象外契約を明示的に固定する       |
| TC-026  | `hash` = `"zzzz"`（16 進外の英字）                  | Type - non-hex character                                                   | 戻り値が `false` である | 文字種の検証                             |
| TC-027  | `hash` = `"abcd\n"`（末尾改行付き）                 | Validation - trailing newline rejected                                     | 戻り値が `false` である | `$` が複数行境界にならないことの確認     |
| TC-028  | `hash` = `" abcd"`（先頭空白付き）                  | Validation - surrounding whitespace rejected                               | 戻り値が `false` である | trim せずに拒否する                      |
| TC-029  | `hash` = `"-abcd"`（option 形式の文字列）           | Validation - option-like argument rejected                                 | 戻り値が `false` である | Git 引数へ option を渡さない担保         |

### 失敗源インベントリ（include-or-justify）— Feature 052 追加分（S7）

| 失敗源                                         | 対応ケースまたは除外理由                                                                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 移設時に長さ下限・上限が変わる                 | TC-019、TC-021、TC-022、TC-023                                                                                                                  |
| 大文字ハッシュを誤って拒否する                 | TC-020                                                                                                                                          |
| 16 進以外の文字を通す                          | TC-026                                                                                                                                          |
| 前後の空白・改行を許して部分一致にする         | TC-027、TC-028                                                                                                                                  |
| option 形式の文字列を Git 引数へ通す           | TC-029                                                                                                                                          |
| SHA-256 の 64 文字を追加してしまう             | TC-025                                                                                                                                          |
| 境界値（0 / minimum / maximum / +/-1 / empty） | TC-021（minimum）、TC-022（minimum-1）、TC-019（maximum）、TC-023（maximum+1）、TC-024（empty）。長さ 0 は TC-024 と同一入力のため統合した      |
| 境界値（NULL）                                 | excluded(引数が `string` 型で `null` / `undefined` を取り得ない。空文字は TC-024 で検証)                                                        |
| 外部依存の失敗                                 | excluded(正規表現判定のみで外部依存を持たない)                                                                                                  |
| 例外送出                                       | excluded(戻り値が `boolean` の純関数で throw 経路を持たない)                                                                                    |
| DataSource 各 call site の振る舞い変化         | excluded(`src/dataSource-test/01-history-diff-01.md` S27 TC-162 ほか既存 section が call site 単位で担保する。本対応は helper の値域を変えない) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-027、TC-028、TC-029
- Exception: excluded(throw 経路なし)
- External: excluded(外部依存なし)
- Boundary: TC-021、TC-022、TC-023、TC-024、TC-025
- Type: TC-026

**失敗系/正常系比（煙感知器）**: 正常系 2 件（TC-019、TC-020）、失敗系 9 件（TC-021〜TC-029。`Perspective` が `Boundary` / `Type` / `Validation` で始まるものを失敗系として数える）。比 4.5 で近接（差 1 以内）ではないため、インベントリ再導出は不要と判断した。
