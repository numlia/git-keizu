# テスト観点表: src/dataSource.ts

> Source: `src/dataSource.ts`
> Generated: 2026-07-19T09:52:44+09:00
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: git-path

## S37: registerGitPath() 解決完了後の単一 path 一括代入

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: `public async registerGitPath(): Promise<void>`（非同期契約へ変更。constructor は安全な既定値で初期化）
> Target Path: `src/dataSource.ts:95-114`（現行実装位置。修正後に更新）

`registerGitPath()` は `src/gitExecutable.ts` の候補解決（逐次 `--version` probe）の完了を await し、解決後に単一文字列を `this.gitPath` へ一括代入する。constructor は安全な既定値（`git`）で初期化し、解決途中の候補や配列を `spawnGit()` / `runGitCommandSpawn()` の command へ波及させない。候補解決自体の分岐（順次 probe、フォールバック）は `src/gitExecutable-test.md` S1 の責務。

| Case ID | Input / Precondition                                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                               | Notes                              |
| ------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| TC-218  | resolver が `"/opt/git/bin/git"` に解決。`registerGitPath()` を await 後に Git command を実行 | Normal - 解決値の反映                                                      | 以後の spawn 呼び出しの第1引数（command）が `"/opt/git/bin/git"`（単一文字列）になる                                                          | resolve 完了後の一括代入           |
| TC-219  | resolver が pending（未解決 Promise）の間に Git command を実行                                | Boundary - 解決前の安全既定値                                              | spawn の command が解決前の値（既定 `"git"` または変更前の旧 path）の単一文字列であり、配列・`undefined`・解決途中の候補が command に渡らない | 旧値維持の契約（設定変更時も同様） |
| TC-220  | resolver が全候補失敗で `"git"` を返す                                                        | External - 全候補失敗時のフォールバック反映                                | `registerGitPath()` が reject せず resolve し、以後の spawn の command が `"git"` になる                                                      | no-Git 表示経路の維持              |

### 失敗源インベントリ（include-or-justify）

| 失敗源                                 | 対応ケースまたは除外理由                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| 配列が spawn の command へそのまま渡る | TC-218、TC-219（常に単一文字列であることを固定）                                            |
| 解決途中の候補が公開される             | TC-219                                                                                      |
| 全候補失敗                             | TC-220                                                                                      |
| 候補の構造不正・probe 失敗の分岐       | excluded(`src/gitExecutable.ts` owner の TC-001〜TC-006 で担保)                             |
| activation が解決を待たない            | excluded(`src/extension.ts` owner の TC-032〜TC-033 で担保)                                 |
| resolver の reject                     | excluded(resolver は最終フォールバック `git` を返し reject しない契約。gitExecutable owner) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(本メソッドは検証済み解決値の代入のみで、入力検証分岐を持たない)
- Exception: excluded(resolver が reject しない契約のため throw 経路が存在しない)
- External: TC-220
- Boundary: TC-219
- Type: excluded(解決値は resolver が単一 `string` を返す型契約で保証される)

数値・空値境界（0 / minimum / maximum / +/-1 / empty / NULL）は、本セクションの対象が解決値の代入タイミング契約であり仕様上意味を持たないため対象外とする（意味のある境界は「解決前」の TC-219 で充足）。

**失敗系/正常系比（煙感知器）**: 正常系1件（TC-218）、失敗系2件（TC-219、TC-220）、比2.0。
