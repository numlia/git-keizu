# テスト観点表: l10n/bundle.l10n.ja.json

> Source: `l10n/bundle.l10n.ja.json`
> Generated: 2026-10-07T00:00:00Z
> Language: JSON (l10n bundle)
> Test Framework: Vitest
> Storage Mode: single-file

## S1: ホスト生成 HTML の一覧名・状態通知の日本語キー

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: 追加キー `Commit history` / `Git Keizu status`（値 `コミット履歴` / `Git Keizuの状態`）
> Target Path: `l10n/bundle.l10n.ja.json`
> Test File: `tests/src/i18n.test.ts`

対応プラン Task 11 実装内容 4 末尾のホスト辞書追加（日本語）。raw key fallback の不在を含めて検証する。

| Case ID | Input / Precondition                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                              | Notes                                        |
| ------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| TC-001  | ja host bundle から `Commit history` と `Git Keizu status` を読み込む | Normal - キーの存在と値                                                    | 2 キーが存在し、値がそれぞれ `コミット履歴` / `Git Keizuの状態` と完全一致し、キー文字列そのものと一致しない | K45                                          |
| TC-002  | 既存 toolbar の 9 キーを読み込む                                      | Normal - 既存訳の維持                                                      | 9 キーが存在し値が変更前と同じ                                                                               | Task 9                                       |
| TC-003  | en / ja 両 host bundle のキー集合を比較                               | Validation - locale parity                                                 | 差集合が双方向とも空                                                                                         | en 側は `bundle.l10n-test.md` S1 TC-003 と対 |

### 失敗源インベントリ（include-or-justify）— Feature 061-05 追加分（S1）

| 失敗源                           | 対応ケースまたは除外理由                            |
| -------------------------------- | --------------------------------------------------- |
| キー欠落・誤値・raw key fallback | TC-001                                              |
| 既存訳の変更                     | TC-002                                              |
| 片 locale だけの追加             | TC-003                                              |
| 外部依存・例外・型               | excluded(静的 JSON で外部依存・throw・型分岐が無い) |
