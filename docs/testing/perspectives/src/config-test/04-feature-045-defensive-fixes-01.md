# テスト観点表: src/config.ts

> Source: `src/config.ts`
> Generated: 2026-07-19T09:52:44+09:00
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: feature-045-defensive-fixes

## S18: gitPath() git.path 設定の候補列正規化

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: S17
> Signature: `gitPath(): string[]`
> Target Path: `src/config.ts:222-225`（現行実装位置。修正後に更新）

VS Code の `git.path`（`string | string[] | null`）を順序保持した文字列候補列へ正規化する。文字列は1要素の候補列、配列は文字列要素のみの候補列とし、文字列以外の要素は除外する。S17 の「単一 `string` を返し配列を透過する」契約を置き換える（配列が `path.isAbsolute` / spawn へそのまま渡る起動クラッシュ [1] の修正）。

| Case ID | Input / Precondition                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                  | Notes                                                    |
| ------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------- |
| TC-097  | `git.path = "/usr/local/bin/git"`（string）                       | Normal - string 設定の候補列化                                             | `["/usr/local/bin/git"]`（長さ1の配列）が返る                                    | 単一文字列 → 1要素候補列                                 |
| TC-098  | `git.path = ["C:\\Git\\git.exe", "/usr/bin/git"]`（array）        | Normal - array 設定の順序保持                                              | `["C:\\Git\\git.exe", "/usr/bin/git"]` が入力順そのままで返る                    | VS Code 組み込み Git 拡張の候補探索契約に整合            |
| TC-099  | `git.path = null`（未設定の VS Code 既定）                        | Boundary - null                                                            | `[]`（空配列）が返る                                                             | `git` への最終フォールバックは resolver 側（TC-004）責務 |
| TC-100  | `git.path = ["/usr/bin/git", 42, null, {}]`（非文字列混入 array） | Type - 非文字列要素の除外                                                  | `["/usr/bin/git"]`（文字列要素のみ、入力順保持）が返り、非文字列要素は含まれない | 外部設定の防御的正規化                                   |

## S19: graphColours() 空フィルタ結果の既定色フォールバック

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: S16
> Signature: `graphColours(): string[]`
> Target Path: `src/config.ts:117-134`

既定12色を名前付き readonly 定数へ抽出し、`GRAPH_COLOUR_PATTERN` による filter 後が空のときだけ既定12色配列の新しいコピーを返す。非空の有効色列は従来どおり順序保持で返す。S16 の「filter 後が空なら空配列を返す」期待（TC-089/TC-090）を置き換える（`web/graph.ts` の `x % 0 = NaN` → `undefined` 色参照 [5] の修正）。

| Case ID | Input / Precondition                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                          | Notes                                 |
| ------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| TC-101  | `graphColours = []`（明示的な空配列設定）                                 | Boundary - empty 設定                                                      | 長さ12の既定色配列（先頭 `"#0085d9"`、末尾 `"#ffcc00"`）が返る                                           | `package.json` の既定値と同一値・同順 |
| TC-102  | `graphColours = ["not-a-color", "rgba(1, 2, 3)"]`（全要素が filter 除外） | Validation - 全要素不正                                                    | 長さ12の既定色配列が返る（空配列は返らない）                                                             | S16 TC-089/TC-090 の空配列期待を置換  |
| TC-103  | `graphColours = ["rgba(1, 2, 3, 0.5)", "bad", "#0085d9"]`（混在）         | Normal - 有効色のみ順序保持                                                | `["rgba(1, 2, 3, 0.5)", "#0085d9"]` が返る（フォールバック非適用）                                       | S16 TC-092 と同挙動の維持             |
| TC-104  | `graphColours = ["#0085d9cc", "rgb(1, 2, 3)"]`（全要素有効）              | Normal - フォールバック非適用                                              | `["#0085d9cc", "rgb(1, 2, 3)"]` が入力順のまま返る                                                       | 有効色列は透過                        |
| TC-105  | TC-101 の返却配列へ `push("#000000")` した後、再度 `graphColours()` 実行  | Boundary - 返却配列の独立性                                                | 2回目の返却が変更の影響を受けない長さ12の既定色配列である（1回目の返却配列への変更が既定値へ波及しない） | 既定配列のコピー返却（immutability）  |

### 失敗源インベントリ（include-or-justify）

| 失敗源                                                              | 対応ケースまたは除外理由                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `git.path` 配列設定が単一 string として後段へ透過（起動クラッシュ） | TC-098（候補列化）、TC-100（非文字列除外）                                                 |
| `git.path = null`                                                   | TC-099                                                                                     |
| `git.path` への非文字列要素混入                                     | TC-100                                                                                     |
| 空文字候補の実行                                                    | excluded(候補の構造検証は `src/gitExecutable.ts` owner の TC-006 で担保)                   |
| `graphColours` の filter 後空配列（undefined 色参照）               | TC-101（空設定）、TC-102（全要素不正）                                                     |
| フォールバック既定配列の共有参照汚染                                | TC-105                                                                                     |
| 有効色列へのフォールバック誤適用                                    | TC-103、TC-104                                                                             |
| 設定読み取りの例外                                                  | excluded(`workspaceConfiguration.get()` は既定値契約で throw しない既存挙動。本変更対象外) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-102
- Exception: excluded(両メソッドに throw 分岐が存在せず、本変更でも追加しない)
- External: excluded(外部依存は `vscode.workspace.getConfiguration` のモックのみで、失敗モードは既定値契約により発生しない)
- Boundary: TC-099、TC-101、TC-105
- Type: TC-100

数値境界（0 / minimum / maximum / +/-1）は色配列・候補列の要素数に仕様上の上限下限が存在しないため対象外とし、意味のある境界は empty（TC-099、TC-101）で充足する。

**失敗系/正常系比（煙感知器）**: 正常系4件（TC-097、TC-098、TC-103、TC-104）、失敗系5件（TC-099、TC-100、TC-101、TC-102、TC-105）、比1.25。件数が近接しているためインベントリを再導出したが、本変更（正規化とフォールバックの2分岐）の失敗源は上表のとおりすべて対応ケースまたは除外理由で充足されており、追加すべき失敗系ケースはないことを確認した。
