# テスト観点表: media/dropdown.css

> Source: `media/dropdown.css`
> Generated: 2026-08-24T22:27:13+09:00
> Language: CSS
> Test Framework: Vitest
> Storage Mode: single-file

## S1: `.dropdownMenu` のローカル z-index 変数参照

> Origin: Feature 055-02 (light-spec-plan)
> Added: 2026-08-24
> Status: active
> Supersedes: -
> Signature: `.dropdownMenu` ルールの `z-index: var(--git-keizu-local-z-index-dropdown-menu)` 宣言
> Target Path: `media/dropdown.css`（`.dropdownMenu`。行番号は Task 2 実装後に確定）
> Test File: `tests/web/overlayLayers.test.ts`

`.dropdownMenu` が `#controls` 内ローカル層専用の変数だけを参照し、グローバル層の変数を参照せず、同ファイルに数値直書きの z-index が残らない静的契約を検証する。変数 `--git-keizu-local-z-index-dropdown-menu` の定義値100の正本と検証は `media/main-test.md` S1 TC-001 の責務であり、グローバル9層の順序比較と find widget 固有の契約も本表には含めない。

| Case ID | Input / Precondition                                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                            | Notes                                                                                                                                                       |
| ------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-001  | `media/dropdown.css` を文字列として読み込み、`.dropdownMenu` ルールの z-index 宣言を抽出する  | Normal - dropdown ローカル層の変数参照                                     | z-index 宣言がちょうど1件存在し、宣言値が `var(--git-keizu-local-z-index-dropdown-menu)` と完全一致する                    | 宣言の欠落・重複・誤参照を1件数と完全一致で検出。値100の維持は §3.2 で値100と確定した本ローカル変数への参照＋`media/main-test.md` TC-001 の値検証の組で担保 |
| TC-002  | `media/dropdown.css` 全体でグローバル層プレフィックス `--git-keizu-z-index-` の出現を検索する | Validation - グローバル層変数の誤参照                                      | `--git-keizu-z-index-` の出現が0件である（dropdown はローカル層 `--git-keizu-local-z-index-dropdown-menu` だけを参照する） | dropdown の100をグローバル比較列へ混入させる誤参照（§3.1 反例シナリオ）を検出                                                                               |
| TC-003  | `media/dropdown.css` 全体の z-index 宣言をすべて抽出する                                      | Validation - 数値直書きの再混入                                            | `z-index:` 宣言の値のうち `var(` で始まらないもの（数値直書き）が0件である                                                 | 変更前の `z-index: 100` の残存・再混入を検出                                                                                                                |

### 失敗源インベントリ（include-or-justify）— Feature 055-02 追加分（S1）

| 失敗源                                                   | 対応ケースまたは除外理由                                                                                                                                             |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 誤参照（別変数を参照）                                   | TC-001（`var(...)` 完全一致で検出）                                                                                                                                  |
| 誤参照（グローバル層変数への混入）                       | TC-002                                                                                                                                                               |
| 宣言の欠落（z-index 宣言自体の削除）                     | TC-001（1件数の検証を含む）                                                                                                                                          |
| 宣言の重複（同ルールへの多重宣言）                       | TC-001（ちょうど1件の検証で検出）                                                                                                                                    |
| 数値直書きの再混入（置換漏れ含む）                       | TC-003                                                                                                                                                               |
| 変数値の誤値・変数の重複定義                             | excluded(変数定義は `media/main.css :root` の責務であり、本ファイルに定義は存在しない。値の検証は `media/main-test.md` TC-001 / TC-002 で担保)                       |
| 順序境界（グローバル昇順・dialog 境界）                  | excluded(dropdown は `#controls` の stacking context 内ローカル層でグローバル比較列に含めない（§3.2）。グローバル順序は `media/main-test.md` TC-011 / TC-012 の責務) |
| 入力検証×違反パターン                                    | excluded(静的 CSS 契約でありユーザー入力・引数を受け取る経路が存在しない)                                                                                            |
| 外部依存×失敗モード                                      | excluded(CSS ファイル読込の失敗は `readFileSync` の例外としてテスト基盤が検出し、契約自体に外部依存がない)                                                           |
| 例外・エラー経路                                         | excluded(CSS 宣言に throw 経路が存在しない)                                                                                                                          |
| 数値入力境界（0 / minimum / maximum / +/-1 / 空 / NULL） | excluded(実行時の数値入力が存在しない。層値の境界は main owner の責務)                                                                                               |
| 型不正・フォーマット不正                                 | excluded(宣言値は静的テキストで型分岐がなく、形式 drift は TC-001 の完全一致で検出)                                                                                  |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-002、TC-003
- Exception: excluded(上表のとおり throw 経路なし)
- External: excluded(上表のとおり外部依存なし)
- Boundary: excluded(数値境界が存在せず、層順序の境界は `media/main-test.md` TC-011 / TC-012 の責務)
- Type: excluded(上表のとおり型分岐なし)

**失敗系/正常系比（煙感知器）**: 正常系1件（TC-001）、失敗系2件（TC-002、TC-003）。差1のためインベントリを再導出したが、本ファイルが所有する静的契約は「1宣言の参照先」「グローバル層からの分離」「数値直書き不在」に限られ、値・順序の失敗源は上表のとおり owner 責務の除外理由で充足されている。比率合わせのためのケース追加は行わない。

## S2: 起動 button・候補・装飾 checkbox・無効状態の表示契約

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: `.dropdownCurrentValue`（`button` 化）/ `.dropdownOption[role="option"]` の `:focus-visible` と `[aria-selected="true"]` / 装飾 checkbox（`.dropdownOptionCheck` 相当）/ `.dropdownCurrentValue:disabled` / `.dropdownHintBtn`（`button` 化）の宣言
> Target Path: `media/dropdown.css`（起動 button・候補・hint button の宣言。設計時のため実装後に行範囲へ更新）
> Test File: `tests/web/keyboardStyles.test.ts`（TC-013〜TC-016）、実 VS Code Webview（TC-017）

対応プラン Task 11 実装内容 1〜2 の観点。`button` 化で UA 既定の font / color / border / padding が入るため、既存表示へ合わせる reset 宣言と、隠れた停止点（`input[type=checkbox]`）を残さない宣言を検証する。

| Case ID | Input / Precondition                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                | Notes                                           |
| ------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| TC-013  | `.dropdownCurrentValue` と `.dropdownHintBtn` のルール                            | Normal - native button の表示を既存に合わせる                              | `font: inherit`（または `font-family` / `font-size` の継承）、`color` / `background` / `border` / `padding` の宣言があり、`text-align` が左寄せ、`width: 100%` 相当で既存の `div` 表示と同じ幅 | K45                                             |
| TC-014  | `.dropdownCurrentValue:focus-visible` と `.dropdownOption:focus-visible` のルール | Normal - focus 枠                                                          | `outline: 2px solid var(--vscode-focusBorder)` が両方にあり、`.dropdownOption` の枠が `overflow` で切れないよう `outline-offset` が負値または内側                                              | K45                                             |
| TC-015  | 装飾 checkbox のセレクターと `.dropdownOption input[type="checkbox"]` の走査      | Validation - 隠れた停止点を残さない                                        | option 内の `input[type="checkbox"]` 向けの宣言が無く（要素自体を生成しない前提）、装飾用セレクターが `[aria-selected="true"]` に連動して表示を切り替える                                      | K45 / A8.1-3「独立したTab停止点を重複させない」 |
| TC-016  | `.dropdownCurrentValue:disabled` のルール                                         | Normal - 無効表示                                                          | `cursor: default` と `opacity`（または無効色）の宣言がある                                                                                                                                     | K26 の表示側                                    |
| TC-017  | 実 VS Code Webview で幅を狭め、branch 複数選択を Tab / Enter で開き候補を↓で移動  | Normal - 狭幅で起動 button・候補の枠が見える（手動）                       | 起動 button と候補の枠が切れず、apply / cancel の button に Tab で到達して枠が見える。記録: VS Code 版、OS、テーマ                                                                             | K45 / A8.3-6。手動                              |

### 失敗源インベントリ（include-or-justify）— Feature 061-05 追加分（S2）

| 失敗源                      | 対応ケースまたは除外理由 |
| --------------------------- | ------------------------ |
| button 化による見た目の崩れ | TC-013                   |
| 枠の欠落・切れ              | TC-014、TC-017           |
| 隠れた checkbox の停止点    | TC-015                   |
| 無効表示の欠落              | TC-016                   |
| 外部依存・例外              | excluded(静的 CSS 契約)  |
