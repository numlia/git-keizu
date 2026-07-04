# テスト観点表: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Generated: 2026-07-04T02:44:58Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: message-routing

## S24: viewDiff() HEAD の resolveRefToHash 解決と未コミット版数クエリ

> Origin: フェーズ2 修正 M9/M10 (view-diff-resolve-head)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: S16
> Signature: `private async viewDiff(repo, commitHash, oldFilePath, newFilePath, type, compareWithHash?): Promise<boolean>`
> Target Path: `src/gitGraphView.ts:745-800`

未コミット差分の可変参照 `HEAD` を `dataSource.resolveRefToHash(repo, "HEAD")`（rev-parse による固定ハッシュ解決）へ置き換え、解決不能時は `"HEAD"` にフォールバックする修正。比較モード（`compareWithHash !== undefined`）では `actualFromHash` を、非比較の未コミットモード（`compareWithHash === undefined` かつ `commitHash === UNCOMMITTED_CHANGES_HASH`）では左 URI 側を、それぞれ解決ハッシュで生成する。未コミット側（type `D`）の右 URI には `encodeDiffDocUri(..., Date.now().toString())` で版数クエリを付与しキャッシュを無効化する。3 つの `vscode.diff` 呼び出しの `try/catch`（例外時 `false` 返却）は旧 S16 の観点を継承する。旧 S16（`HEAD` 直埋め前提）を置き換える。

| Case ID | Input / Precondition                                                                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                          | Notes                                         |
| ------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| TC-089  | `compareWithHash !== undefined`、`commitHash === UNCOMMITTED_CHANGES_HASH`、resolveRefToHash が `"deadbeef"` を返す           | Normal - compare mode HEAD resolved                                        | `dataSource.resolveRefToHash(repo, "HEAD")` が呼ばれ、`actualFromHash="deadbeef"` として左 `encodeDiffDocUri` に埋め込まれる                                             | 比較モードの HEAD 解決                        |
| TC-090  | `compareWithHash !== undefined`、`commitHash` が通常コミット `"abc123"`                                                       | Normal - compare mode normal commit                                        | `actualFromHash="abc123"`（`resolveRefToHash` は呼ばれない）で左 URI が生成される                                                                                        | 通常コミットは解決不要                        |
| TC-091  | `compareWithHash !== undefined`、`commitHash === UNCOMMITTED_CHANGES_HASH`、resolveRefToHash が `null` を返す                 | Boundary - resolve null fallback                                           | `actualFromHash` が `"HEAD"` にフォールバックして左 URI が生成される                                                                                                     | 解決不能時のフォールバック                    |
| TC-092  | `compareWithHash === undefined`、`commitHash === UNCOMMITTED_CHANGES_HASH`、type `"D"`、resolveRefToHash が `"cafe01"` を返す | Normal - uncommitted mode resolve + version                                | 左 URI が `encodeDiffDocUri(repo, oldFilePath, "cafe01")`、右 URI が `encodeDiffDocUri(repo, oldFilePath, UNCOMMITTED_CHANGES_HASH, Date.now().toString())` で生成される | 未コミット側の HEAD 解決 + 版数クエリ         |
| TC-093  | `compareWithHash !== undefined`、`vscode.commands.executeCommand("vscode.diff", ...)` が reject                               | Exception - vscode.diff failure (compare mode)                             | `viewDiff` が `false` を返す。例外は呼び出し元へ伝播しない                                                                                                               | 旧 S16/TC-070 を継承                          |
| TC-094  | `compareWithHash === undefined`、`commitHash === UNCOMMITTED_CHANGES_HASH`、`vscode.diff` が reject                           | Exception - vscode.diff failure (uncommitted)                              | `viewDiff` が `false` を返す                                                                                                                                             | 旧 S16/TC-071 を継承（HEAD 直埋め前提を置換） |
| TC-095  | `compareWithHash === undefined`、通常コミット、`vscode.diff` が reject                                                        | Exception - vscode.diff failure (normal commit)                            | `viewDiff` が `false` を返す                                                                                                                                             | 旧 S16/TC-072 を継承                          |
