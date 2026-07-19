# テスト観点表: src/gitExecutable.ts

> Source: `src/gitExecutable.ts`
> Generated: 2026-07-19T09:52:44+09:00
> Language: TypeScript
> Test Framework: Vitest

## S1: resolveGitExecutable() 候補の逐次検証とフォールバック

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: `resolveGitExecutable(candidates: string[]): Promise<string>`（設計時想定。実装時に確定）
> Target Path: `src/gitExecutable.ts`（新規モジュール。実装後に行範囲へ更新）

`Config.gitPath()` が正規化した文字列候補列を受け取り、各候補の安全な構造検証と `spawn(candidate, ["--version"])` による逐次 probe を行う。spawn error / 非ゼロ exit は次候補へ進み、候補が空または全失敗なら `git` を probe する。`git` の probe も失敗した場合でも、従来の no-Git 表示経路を維持するため最終値として `git` を返す（reject しない）。

| Case ID | Input / Precondition                                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                        | Notes                             |
| ------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| TC-001  | `["/usr/bin/git"]`。spawn は exit 0 を emit                                                  | Normal - 第1候補成功                                                       | 戻り値が `"/usr/bin/git"`。spawn が `("/usr/bin/git", ["--version"])` で1回だけ呼ばれる                                                | 正常経路                          |
| TC-002  | `["/bad/git", "/usr/bin/git"]`。第1候補は spawn `error` イベント（ENOENT）、第2候補は exit 0 | External - spawn error で次候補へ                                          | 戻り値が `"/usr/bin/git"`。spawn が計2回、第1引数の順序が `"/bad/git"` → `"/usr/bin/git"` で呼ばれる                                   | 実行ファイル不在時の順次探索      |
| TC-003  | `["/old/git", "/usr/bin/git"]`。第1候補は exit 1、第2候補は exit 0                           | External - 非ゼロ exit で次候補へ                                          | 戻り値が `"/usr/bin/git"`。spawn が計2回呼ばれ、第1候補の exit 1 では reject されない                                                  | exit code 失敗の順次探索          |
| TC-004  | `[]`（空候補列）。`git` の probe は exit 0                                                   | Boundary - 空候補列                                                        | spawn が `("git", ["--version"])` で1回だけ呼ばれ、戻り値が `"git"`                                                                    | `Config.gitPath()` が `[]` の場合 |
| TC-005  | `["/bad1", "/bad2"]`。全候補と `git` の probe がすべて失敗（spawn error）                    | External - 全候補失敗の最終フォールバック                                  | spawn が計3回（`"/bad1"` → `"/bad2"` → `"git"`）呼ばれ、戻り値が `"git"`（Promise は reject しない）                                   | no-Git 表示経路の維持             |
| TC-006  | `["", "/usr/bin/git"]`（構造検証で不正となる空文字候補を含む）。第2候補は exit 0             | Validation - 不正形式候補のスキップ                                        | 空文字候補では spawn が呼ばれず（`""` を command にした呼び出し 0 回）、spawn は `"/usr/bin/git"` の1回のみで戻り値が `"/usr/bin/git"` | 候補の構造検証                    |

### 失敗源インベントリ（include-or-justify）

| 失敗源                                         | 対応ケースまたは除外理由                                                          |
| ---------------------------------------------- | --------------------------------------------------------------------------------- |
| 候補実行ファイル不在（spawn `error` イベント） | TC-002                                                                            |
| 候補の実行失敗（非ゼロ exit）                  | TC-003                                                                            |
| 空候補列                                       | TC-004                                                                            |
| 全候補 + `git` の失敗                          | TC-005                                                                            |
| 構造検証で不正な候補（空文字等）               | TC-006                                                                            |
| 非文字列候補の混入                             | excluded(`Config.gitPath()` が文字列以外を除外して正規化する。config S18 で担保)  |
| probe の throw / reject 経路                   | excluded(本モジュールは失敗を解決値の次候補遷移で扱い、reject 経路を持たない契約) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-006
- Exception: excluded(probe 失敗は throw せず次候補へ進む解決値契約で、例外分岐が存在しない)
- External: TC-002、TC-003、TC-005
- Boundary: TC-004
- Type: excluded(候補は `Config.gitPath()` が `string[]` へ正規化済みで、非文字列は到達しない)

数値境界（0 / minimum / maximum / +/-1）は候補列の要素数に対する仕様上の上限が存在しないため対象外とし、意味のある境界は空候補列（TC-004）と空文字候補（TC-006）で充足する。NULL は `Config.gitPath()` の正規化（config S18 TC-099）で `[]` へ変換されるため本モジュールには到達しない。

**失敗系/正常系比（煙感知器）**: 正常系1件（TC-001）、失敗系5件（TC-002〜TC-006）、比5.0。
