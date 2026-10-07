# テスト観点表: media/findwidget.css

> Source: `media/findwidget.css`
> Generated: 2026-08-24T22:27:13+09:00
> Language: CSS
> Test Framework: Vitest
> Storage Mode: single-file

## S1: `.findWidget` の z-index 変数参照

> Origin: Feature 055-02 (light-spec-plan)
> Added: 2026-08-24
> Status: active
> Supersedes: -
> Signature: `.findWidget` ルールの `z-index: var(--git-keizu-z-index-find-widget)` 宣言
> Target Path: `media/findwidget.css`（`.findWidget`。行番号は Task 2 実装後に確定）
> Test File: `tests/web/overlayLayers.test.ts`

`.findWidget` がグローバル find widget 層の変数だけを参照し、同ファイルに数値直書きの z-index が残らない静的契約を検証する。変数 `--git-keizu-z-index-find-widget` の定義値100の正本と検証は `media/main-test.md` S1 TC-001 の責務であり、グローバル順序・dropdown ローカル層も本表には含めない。

| Case ID | Input / Precondition                                                                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                        | Notes                                                                                                                                                                                                                                                                                                                                                                              |
| ------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-001  | `media/findwidget.css` を文字列として読み込み、`.findWidget` ルールの z-index 宣言を抽出する                | Normal - find widget 層の変数参照                                          | z-index 宣言がちょうど1件存在し、宣言値が `var(--git-keizu-z-index-find-widget)` と完全一致する                                                        | 宣言の欠落・重複・誤参照（別層の変数）を1件数と完全一致で検出。実効値100の維持は §3.2 で値100と確定した本変数への参照＋`media/main-test.md` TC-001 の値検証の組で担保                                                                                                                                                                                                              |
| TC-002  | `media/findwidget.css` 全体の z-index 宣言をすべて抽出する                                                  | Validation - 数値直書きの再混入                                            | `z-index:` 宣言の値のうち `var(` で始まらないもの（数値直書き）が0件である                                                                             | 変更前の `z-index: 100` の残存・再混入を検出                                                                                                                                                                                                                                                                                                                                       |
| TC-003  | 実際の VS Code Webview で検索を実行して結果・入力・オプションを持つ状態にし、ダイアログを表示してから閉じる | Normal - 手動: 検索状態の表示前後一致                                      | ダイアログを閉じた後、検索ウィジェットの表示状態・入力文字列・検索結果位置・オプション（大文字小文字等）が表示前と一致し、入力・ボタンを再び操作できる | 手動確認。理由: 表示前後の検索状態一致と操作性は実際の Webview の描画とイベント処理でのみ判定でき、jsdom では検証できない。手順: 検索語を入力し結果位置を移動した状態でエラーダイアログを表示→閉じ、ウィジェットの表示・入力値・結果位置・オプションを目視比較し入力を操作する。期待結果: 表示前と完全一致し操作可能。証跡: 表示前後のスクリーンショットと確認記録を実行証跡へ残す |

### 失敗源インベントリ（include-or-justify）— Feature 055-02 追加分（S1）

| 失敗源                                                   | 対応ケースまたは除外理由                                                                                                                       |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 誤参照（別層のグローバル変数・ローカル変数を参照）       | TC-001（`var(...)` 完全一致で検出）                                                                                                            |
| 宣言の欠落（z-index 宣言自体の削除）                     | TC-001（1件数の検証を含む）                                                                                                                    |
| 宣言の重複（同ルールへの多重宣言）                       | TC-001（ちょうど1件の検証で検出）                                                                                                              |
| 数値直書きの再混入（置換漏れ含む）                       | TC-002                                                                                                                                         |
| 変数値の誤値・変数の重複定義                             | excluded(変数定義は `media/main.css :root` の責務であり、本ファイルに定義は存在しない。値の検証は `media/main-test.md` TC-001 / TC-002 で担保) |
| 順序境界（グローバル昇順・dialog 境界）                  | excluded(グローバル順序の比較は `media/main-test.md` TC-011 / TC-012 の責務であり、本ファイルは参照のみを所有する)                             |
| ダイアログ表示前後の検索状態の drift                     | TC-003（手動確認）                                                                                                                             |
| 入力検証×違反パターン                                    | excluded(静的 CSS 契約でありユーザー入力・引数を受け取る経路が存在しない)                                                                      |
| 外部依存×失敗モード                                      | excluded(CSS ファイル読込の失敗は `readFileSync` の例外としてテスト基盤が検出し、契約自体に外部依存がない)                                     |
| 例外・エラー経路                                         | excluded(CSS 宣言に throw 経路が存在しない)                                                                                                    |
| 数値入力境界（0 / minimum / maximum / +/-1 / 空 / NULL） | excluded(実行時の数値入力が存在しない。層値の境界は main owner の責務)                                                                         |
| 型不正・フォーマット不正                                 | excluded(宣言値は静的テキストで型分岐がなく、形式 drift は TC-001 の完全一致で検出)                                                            |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-002
- Exception: excluded(上表のとおり throw 経路なし)
- External: excluded(上表のとおり外部依存なし)
- Boundary: excluded(数値境界が存在せず、層順序の境界は `media/main-test.md` TC-011 / TC-012 の責務)
- Type: excluded(上表のとおり型分岐なし)

**失敗系/正常系比（煙感知器）**: 正常系2件（TC-001、TC-003）、失敗系1件（TC-002）。差1のためインベントリを再導出したが、本ファイルが所有する静的契約は「1宣言の参照先」と「数値直書き不在」に限られ、値・順序・状態管理の失敗源は上表のとおり owner 責務の除外理由で充足されている。比率合わせのためのケース追加は行わない。

## S2: 検索 button の表示・focus・押下状態の表示契約

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: `.findWidget button`（`#findCaseSensitive` / `#findRegex` / `#findOpenCdv` / `#findPrev` / `#findNext` / `#findClose`）の reset・`:focus-visible`・`[aria-pressed="true"]`（既存 `.active`）・`:disabled` の宣言
> Target Path: `media/findwidget.css:37-61, 64-82, 96-131`（`#findInput:focus-visible` / `.findWidget button` の reset / `:focus-visible` / `:disabled` / `#findInput:disabled`、`.findModifier` と `.active` / `[aria-pressed="true"]`、action button と `#findPrev` / `#findNext` の `:disabled`、`#findOpenCdv[aria-pressed="true"]`）
> Test File: `tests/web/keyboardStyles.test.ts`（TC-013〜TC-015）、実 VS Code Webview（TC-016。Task 12 時点で未実施）

対応プラン Task 11 実装内容 2 の観点。S1 の z-index 契約は維持。

| Case ID | Input / Precondition                                                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                | Notes              |
| ------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| TC-013  | `.findWidget button` 系ルール                                                                          | Normal - native button の表示を既存 span に合わせる                        | `font: inherit`、`background` / `border` / `padding` / `color` の宣言があり、既存 `.findModifier` の寸法と同じ                 | K45                |
| TC-014  | `.findWidget button:focus-visible` のルール                                                            | Normal - focus 枠                                                          | `outline: 2px solid var(--vscode-focusBorder)`                                                                                 | K45                |
| TC-015  | `.findModifier.active` と `.findModifier[aria-pressed="true"]`、`.findWidget button:disabled` のルール | Normal - 押下 / 無効の表示                                                 | 押下状態の表示宣言が `active` class と `aria-pressed` のどちらでも同じ値で、`:disabled` に無効表示（`opacity` または色）がある | K40 / K45          |
| TC-016  | 実 VS Code Webview で検索を開き Tab で各 button を巡回し、Aa / .\* を Space で切り替える               | Normal - 検索 button の枠と押下表示（手動）                                | 各 button に枠が見え、押下状態が枠と別の表現で判別できる。記録: VS Code 版、OS、テーマ                                         | K45 / A8.3-6。手動 |

### 失敗源インベントリ（include-or-justify）— Feature 061-05 追加分（S2）

| 失敗源                      | 対応ケースまたは除外理由 |
| --------------------------- | ------------------------ |
| button 化による見た目の崩れ | TC-013                   |
| 枠の欠落                    | TC-014、TC-016           |
| 押下 / 無効表示の欠落       | TC-015                   |
| 外部依存・例外              | excluded(静的 CSS 契約)  |

### Task 12 テスト対応（Feature 061-05）— S2

- テスト: `tests/web/keyboardStyles.test.ts` describe `media/findwidget.css button look, focus and pressed / disabled states (S2)`。TC-013 `resets the native buttons to the former span look` / TC-014 `outlines every find button and the input with the focus frame` / TC-015 `shows pressed state from aria-pressed as from .active and dims disabled buttons`
- 手動 Case TC-016: **未実施**（理由・影響・代替確認・残る手順は `web/main-test/13-keyboard-accessibility-01.md` 冒頭の手動一覧。検索を開き Tab で各 button を巡回し Aa / .* を Space で切り替えて枠と押下表示を確認）
- 実行結果（2026-10-07）: 3 件 pass
