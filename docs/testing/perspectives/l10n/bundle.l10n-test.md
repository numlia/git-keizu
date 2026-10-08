# テスト観点表: l10n/bundle.l10n.json

> Source: `l10n/bundle.l10n.json`
> Generated: 2026-10-07T00:00:00Z
> Language: JSON (l10n bundle)
> Test Framework: Vitest
> Storage Mode: single-file

## S1: ホスト生成 HTML の一覧名・状態通知の英語キー

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: 追加キー `Commit history` / `Git Keizu status`（既存 toolbar キー `Repo:` / `Branches:` / `Authors:` / `Show Remote Branches` / `Branch Cleanup` / `Search` / `Fetch --prune` / `Current` / `Refresh` の再利用を含む）
> Target Path: `l10n/bundle.l10n.json`
> Test File: `tests/src/i18n.test.ts`

対応プラン Task 11 実装内容 4 末尾のホスト辞書追加。`src/gitGraphView.ts` の `hostT()` が `#commitTable` の名前と `role="status"` 要素の名前に使う。host 生成 HTML への接続は `src/gitGraphView-test/08-keyboard-accessibility-01.md` S42、既存 branch cleanup キーは `src/i18n-test.md` S2 の責務。

| Case ID | Input / Precondition                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                               | Notes                                           |
| ------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------- |
| TC-001  | en host bundle から `Commit history` と `Git Keizu status` を読み込む | Normal - キーの存在と値                                                    | 2 キーが存在し、値がそれぞれ `Commit history` / `Git Keizu status` と完全一致 | K45                                             |
| TC-002  | 既存 toolbar の 9 キーを読み込む                                      | Normal - 既存訳の維持                                                      | 9 キーが存在し値が変更前と同じ（`Repo:` 等）                                  | Task 9「既存toolbar訳は再利用」                 |
| TC-003  | en / ja 両 host bundle のキー集合を比較                               | Validation - locale parity                                                 | 差集合が双方向とも空（片 locale だけの追加が 0 件）                           | ja 側は `bundle.l10n.ja-test.md` S1 TC-003 と対 |

### 失敗源インベントリ（include-or-justify）— Feature 061-05 追加分（S1）

| 失敗源               | 対応ケースまたは除外理由                                                     |
| -------------------- | ---------------------------------------------------------------------------- |
| キー欠落・誤値       | TC-001                                                                       |
| 既存訳の変更         | TC-002                                                                       |
| 片 locale だけの追加 | TC-003                                                                       |
| キーの利用分岐       | excluded(`src/gitGraphView-test/08-keyboard-accessibility-01.md` S42 の責務) |
| 外部依存・例外・型   | excluded(静的 JSON で外部依存・throw・型分岐が無い)                          |

### Task 12 テスト対応（Feature 061-05）— S1

- テスト: `tests/src/i18n.test.ts`（`// @see` 本ファイル）。TC-001 `English host bundle holds the list name and status region name (en TC-001)` / TC-002 `English host bundle keeps the nine toolbar texts unchanged (en TC-002)` / TC-003 `adds the two host keys to both locales (en TC-003 / ja TC-003)`
- 実行結果（2026-10-07）: 3 件 pass
