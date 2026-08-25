# テスト観点表: src/i18n.ts

> Source: `src/i18n.ts`
> Generated: 2026-05-03T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest

## S1: host locale / webview dictionary loading

> Origin: Feature 035 (japanese-ui-i18n) Task 8
> Added: 2026-05-03
> Updated: 2026-08-03
> Status: active
> Supersedes: -
> Signature: `getLocale(): "en" | "ja"; loadWebviewMessages(extensionPath: string): Promise<Record<string, string>>; t(message: string, ...args): string`
> Target Path: `src/i18n.ts`

| Case ID | Input / Precondition                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                        | Notes                       |
| ------- | --------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------- | --------------------------- |
| TC-001  | `vscode.env.language` が `ja` / `ja-JP` | Normal - locale branch                                                     | `getLocale()` が `ja` を返す           | 日本語表示切替の入口        |
| TC-002  | `vscode.env.language` が未対応 locale   | Normal - fallback                                                          | `getLocale()` が `en` を返す           | 未対応 locale は英語        |
| TC-003  | host `t("Hello {0}", "Git Keizu")`      | External - vscode.l10n delegation                                          | `vscode.l10n.t` に同じ引数で委譲される | host 翻訳 wrapper           |
| TC-004  | ja / en 双方に同一キーが存在            | Normal - dictionary merge                                                  | ja の値が en を上書きする              | `l10n/web/web.l10n.ja.json` |
| TC-005  | ja 辞書読み込み失敗、en は成功          | Exception - fallback                                                       | en webview messages を返す             | ファイル欠損時の継続        |
| TC-006  | ja / en の両方が失敗または不正 JSON     | Exception - fallback exhausted                                             | 空辞書 `{}` を返す                     | HTML 生成を止めない         |
| TC-007  | ja 辞書に存在しないキーが en にある     | Normal - per-key fallback                                                  | 当該キーは en の値で埋まる             | 未翻訳キーの生キー露出防止  |
| TC-008  | locale が en                            | Normal - fallback locale short-circuit                                     | en 辞書のみを 1 回読む                 | 同一ファイルの二重読み防止  |

## S2: branch cleanup toolbar title の host 英日キー

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `l10n/bundle.l10n.json` / `l10n/bundle.l10n.ja.json` への branch cleanup toolbar title キー追加（キー名は Task 3 実装時に確定）
> Target Path: `l10n/bundle.l10n.json` / `l10n/bundle.l10n.ja.json`
> Test File: `tests/src/i18n.test.ts`

`#branchCleanupBtn` の toolbar title に使う host bundle の英日キーの存在・一致を検証する（対応プラン §4 Task 3 実装内容 4。責務割当表の owner は host l10n bundle）。既存 key / value の維持は既存 case の責務で、webview 側の locale キーは `l10n/web/web.l10n.*.json-test.md` の責務のため本表には含めない。

| Case ID | Input / Precondition                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                     | Notes                         |
| ------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------- |
| TC-009  | en host bundle から branch cleanup toolbar title キーを読み込む | Normal - en キーの存在                                                     | キーが存在し、値が非空（`length > 0`）の英語文字列である                                            | Task 3 で追加する title       |
| TC-010  | ja host bundle から同キーを読み込む                             | Normal - ja キーの存在                                                     | キーが存在し、値が非空の日本語文字列で、値がキー文字列そのものと一致しない（raw key fallback 不在） | 未翻訳の素通しを検出          |
| TC-011  | en / ja 両 host bundle を読み込み、追加キー集合を比較する       | Validation - locale parity                                                 | 追加キー集合の en / ja 差集合が双方向とも空である（片 locale だけの追加が 0 件）                    | Task 3 NO-GO（片 locale）対応 |

### 失敗源インベントリ（include-or-justify）— Feature 055-03 追加分（S2）

| 失敗源                                        | 対応ケースまたは除外理由                                                    |
| --------------------------------------------- | --------------------------------------------------------------------------- |
| en 側のキー欠落・空値                         | TC-009                                                                      |
| ja 側のキー欠落・空値・raw key fallback       | TC-010                                                                      |
| 片 locale だけの追加（parity 崩れ）           | TC-011                                                                      |
| キーの利用分岐（title への反映）              | excluded(`src/gitGraphView-test/05-branch-cleanup-01.md` S33 TC-170 で担保) |
| 境界値（0 / minimum / maximum / +/-1 / NULL） | excluded(静的 JSON に数値境界が存在しない。empty は非空検証で充足)          |
| 外部依存の失敗・例外送出                      | excluded(bundle は静的データで外部依存も throw 経路も持たない)              |
| 不正な型・形式                                | excluded(値は JSON string で型分岐が存在しない)                             |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-011
- Exception: excluded(JSON 読み込みの失敗はテスト基盤で検出され、bundle 自体に例外分岐はない)
- External: excluded(外部依存なし)
- Boundary: excluded(数値境界が存在しない。empty は TC-009 / TC-010 の非空検証で充足)
- Type: excluded(値は JSON string で型分岐が存在しない)
- Normal: TC-009、TC-010

**失敗系/正常系比（煙感知器）**: 正常系2件（TC-009、TC-010）、失敗系1件（TC-011）。差1のためインベントリを再導出したが、静的 locale の失敗源は欠落・空値・raw fallback・parity に限られ、上表のとおりすべて充足されていることを確認した。
