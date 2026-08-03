# テスト観点表: src/refValidation.ts

> Source: `src/refValidation.ts`
> Generated: 2026-08-03T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Storage Mode: single-file

## S1: isValidRefName() / isSafeRemoteName() 純粋検証

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-03
> Status: active
> Supersedes: -
> Signature: `isValidRefName(refName: string): boolean` / `isSafeRemoteName(remoteName: string): boolean`
> Target Path: `src/refValidation.ts`（新規ファイル。実装後に行範囲へ更新）
> Test File: `tests/src/refValidation.test.ts`

host 側で checkout / Push へ渡す ref 名と remote 名を、Git process を起動する前に判定する純粋関数の観点。`isValidRefName()` は Git ref rules に反する構造（空文字、先頭 `-` / `/` / `.`、末尾 `.` / `/` / `.lock`、空 segment、`.` 始まり segment、`..`、`@{`、空白、制御文字、Git 禁止文字）を拒否する。`isSafeRemoteName()` は空文字と先頭 `-`（option 誤認）だけを拒否し、登録済み remote 一覧との照合は host 側の責務（`src/gitGraphView-test/01-message-routing-03.md` S28）とする。webview 側の入力検証（`web/utils.ts` の `refInvalid`）は本 owner の対象外で、UI 検証と host 検証は責務を分ける。

| Case ID | Input / Precondition                                                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                           | Notes                                          |
| ------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------- |
| TC-001  | `isValidRefName("feature/login")`                                                                  | Normal - 階層 ref                                                          | `true` を返す                                                             | スラッシュ区切りの通常ブランチ名               |
| TC-002  | `isValidRefName("a")`                                                                              | Boundary - minimum（1文字）                                                | `true` を返す                                                             | 最小の有効 ref                                 |
| TC-003  | `isValidRefName("")`                                                                               | Boundary - empty                                                           | `false` を返す                                                            | 空文字は Git へ渡さない                        |
| TC-004  | `isValidRefName("-delete")`                                                                        | Validation - 先頭 option prefix                                            | `false` を返す                                                            | `-` 始まりは Git の option と誤認される        |
| TC-005  | `isValidRefName("/feature")`                                                                       | Validation - 先頭スラッシュ                                                | `false` を返す                                                            | Git ref rules 違反                             |
| TC-006  | `isValidRefName(".feature")`                                                                       | Validation - 先頭ドット                                                    | `false` を返す                                                            | Git ref rules 違反                             |
| TC-007  | `isValidRefName("feature.")`                                                                       | Validation - 末尾ドット                                                    | `false` を返す                                                            | 先頭ドット（TC-006）とは別分岐                 |
| TC-008  | `isValidRefName("feature/")`                                                                       | Validation - 末尾スラッシュ                                                | `false` を返す                                                            | 先頭スラッシュ（TC-005）とは別分岐             |
| TC-009  | `isValidRefName("feature.lock")`                                                                   | Validation - `.lock` サフィックス                                          | `false` を返す                                                            | Git 予約サフィックス                           |
| TC-010  | `isValidRefName("feature//login")`                                                                 | Validation - 空 segment                                                    | `false` を返す                                                            | 連続スラッシュ                                 |
| TC-011  | `isValidRefName("feature/.hidden")`                                                                | Validation - `.` 始まり segment                                            | `false` を返す                                                            | 先頭ドット（TC-006）とは別分岐（2 segment 目） |
| TC-012  | `isValidRefName("feature..login")`                                                                 | Validation - 連続ドット                                                    | `false` を返す                                                            | `..` は revision range 記法                    |
| TC-013  | `isValidRefName("feature@{1}")`                                                                    | Validation - `@{` 列                                                       | `false` を返す                                                            | reflog 記法                                    |
| TC-014  | `isValidRefName("feature login")`                                                                  | Validation - 空白文字                                                      | `false` を返す                                                            | 半角スペースを含む                             |
| TC-015  | refName = `"feature"` + `String.fromCharCode(0x7f)`（DEL）+ `"login"` を `isValidRefName()` へ渡す | Type - 制御文字                                                            | `false` を返す                                                            | 不正フォーマットの文字コード                   |
| TC-016  | `isValidRefName(name)` を `~` / `^` / `:` / `?` / `*` / `[` / `\` の 7 文字それぞれについて実行    | Validation - Git 禁止文字                                                  | 7 入力すべてで `false` を返す（禁止文字集合という単一分岐を全要素で検証） | 文字集合判定は 1 分岐                          |
| TC-017  | `isSafeRemoteName("origin")`                                                                       | Normal - remote 名                                                         | `true` を返す                                                             | 既定 remote                                    |
| TC-018  | `isSafeRemoteName("")`                                                                             | Boundary - empty                                                           | `false` を返す                                                            | 空 remote 名                                   |
| TC-019  | `isSafeRemoteName("-upstream")`                                                                    | Validation - 先頭 option prefix                                            | `false` を返す                                                            | `-` 始まりは Git の option と誤認される        |

### 失敗源インベントリ（include-or-justify）— Feature 047 追加分（S1）

| 失敗源                                                               | 対応ケースまたは除外理由                                                                                                                                |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 入力検証 × option 誤認（先頭 `-`）                                   | TC-004（ref）、TC-019（remote）                                                                                                                         |
| 入力検証 × Git ref rules 構造違反（先頭・末尾・segment・`..`・`@{`） | TC-005〜TC-013                                                                                                                                          |
| 入力検証 × 不正文字（空白・制御文字・Git 禁止文字）                  | TC-014、TC-015、TC-016                                                                                                                                  |
| 各分岐の negative 側（有効値が誤って拒否される）                     | TC-001、TC-002、TC-017                                                                                                                                  |
| 境界値（empty）                                                      | TC-003（ref）、TC-018（remote）                                                                                                                         |
| 境界値（minimum）                                                    | TC-002                                                                                                                                                  |
| 境界値（0 / maximum / +/-1 / NULL）                                  | excluded(引数は `string` 型のみで数値境界を持たず、`null` / `undefined` は TypeScript の型で到達しない。長さ上限は仕様に存在しない)                     |
| 外部依存の失敗（Git process、ファイル、ネットワーク）                | excluded(純粋関数で外部依存を持たない。Git 未起動であること自体は `src/dataSource-test/02-branch-worktree-02.md` TC-231〜TC-233 が call count 0 で担保) |
| 例外送出                                                             | excluded(仕様上 throw 経路を持たず boolean を返す契約)                                                                                                  |
| 不正な型・フォーマット                                               | TC-015（制御文字を含む不正フォーマット）                                                                                                                |
| 登録済み remote 一覧との不一致                                       | excluded(`isSafeRemoteName()` は形式検証のみ。membership 再検証は `src/gitGraphView-test/01-message-routing-03.md` S28 TC-116 / TC-119 の責務)          |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-004〜TC-014、TC-016、TC-019
- Exception: excluded(throw 経路が存在しない)
- External: excluded(外部依存なし。純粋関数)
- Boundary: TC-002、TC-003、TC-018
- Type: TC-015

**失敗系/正常系比（煙感知器）**: 正常系2件（TC-001、TC-017）、失敗系17件（TC-002〜TC-016、TC-018、TC-019）。比は 8.5:1 で、拒否条件を 1 分岐 1 ケースへ分解した結果である。
