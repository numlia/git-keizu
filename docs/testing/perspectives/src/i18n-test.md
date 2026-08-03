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
