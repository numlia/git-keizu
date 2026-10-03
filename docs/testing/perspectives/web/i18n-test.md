# テスト観点表: web/i18n.ts

> Source: `web/i18n.ts`
> Generated: 2026-05-03T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest

## S1: webview t() helper fallback and placeholder handling

> Origin: Feature 035 (japanese-ui-i18n) Task 8
> Added: 2026-05-03
> Status: active
> Supersedes: -
> Signature: `t(key: string, ...args: (string | number)[]): string; getWebviewLocale(): "en" | "ja"`
> Target Path: `web/i18n.ts`

| Case ID | Input / Precondition                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                | Notes                     |
| ------- | ----------------------------------------- | -------------------------------------------------------------------------- | ------------------------------ | ------------------------- |
| TC-001  | 辞書に key があり `{0}` / `{1}` を含む    | Normal - key hit                                                           | placeholder が順番に置換される | 主要正常系                |
| TC-002  | 辞書に key がない                         | Boundary - key miss                                                        | key 自体を返す                 | 欠損キー fallback         |
| TC-003  | placeholder の引数が不足                  | Boundary - missing arg                                                     | 不足引数は空文字になる         | VS Code l10n との互換方針 |
| TC-004  | `globalThis.webviewMessages` 未定義       | Exception - missing global                                                 | 空辞書扱いで key fallback する | 単体テスト / 注入失敗時   |
| TC-005  | `globalThis.webviewLocale` が `ja` / `en` | Normal - locale normalize                                                  | `ja` のみ ja、それ以外は en    | 日付 locale 分岐の入口    |

## S2: 隠れたバッジ件数の数値差込み

> Origin: Feature 059-02 (light-spec-plan)
> Added: 2026-09-24
> Status: active
> Supersedes: -
> Signature: `t(key: string, ...args: (string | number)[]): string`（`t("refs.showHidden", hiddenCount)` の数値引数）
> Target Path: `web/i18n.ts`（`t`。実装は変更しない）
> Test File: `tests/web/i18n.test.ts`

counterのtitle/aria-labelに使う `t("refs.showHidden", hiddenCount)` が、既存の `t` で数値を差し込めることを実辞書で確認する。`web/i18n.ts` は変更しない。辞書の文言の正本は `l10n/web/web.l10n.en.json-test.md` S10 と `l10n/web/web.l10n.ja.json-test.md` S11 が所有し、本節は差込み結果だけを扱う。

| Case ID | Input / Precondition                                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                       | Notes                          |
| ------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| TC-006  | `l10n/web/web.l10n.en.json` を読み `globalThis.webviewMessages` に設定し、`t("refs.showHidden", 4)` | Normal - 英語の数値差込み                                                  | `Show 4 hidden badges` を返す                                                                                         | AC-18                          |
| TC-007  | `l10n/web/web.l10n.ja.json` を読み `globalThis.webviewMessages` に設定し、`t("refs.showHidden", 4)` | Normal - 日本語の数値差込み                                                | `非表示のバッジ 4 件を表示` を返す                                                                                    | AC-18                          |
| TC-008  | en実辞書で `t("refs.showHidden", n)` を n=9 / 10 / 99 / 100 で呼ぶ                                  | Boundary - 桁数の変わる件数                                                | それぞれ `Show 9 hidden badges` / `Show 10 hidden badges` / `Show 99 hidden badges` / `Show 100 hidden badges` を返す | AC-16                          |
| TC-009  | en実辞書で `t("refs.showHidden", 1000)`                                                             | Boundary - 桁区切りなし                                                    | `Show 1000 hidden badges` を返す（`1,000` にしない）                                                                  | 数値は `String` 変換で差し込む |

### 失敗源インベントリ（include-or-justify）— Feature 059-02 追加分（S2）

| 失敗源                                       | 対応ケースまたは除外理由                                   |
| -------------------------------------------- | ---------------------------------------------------------- |
| 数値引数を差し込めない・locale形式へ変換する | TC-006〜TC-009                                             |
| 桁数の変化で文字列が崩れる                   | TC-008                                                     |
| キー欠落時のfallback                         | excluded(既存S1 TC-002で担保済み。本件で `t` を変更しない) |
| 文言の誤り                                   | excluded(l10n各辞書の観点の責務)                           |
| 外部依存・例外                               | excluded(`t` は辞書参照と置換だけでthrow経路を持たない)    |

### Feature 059-02 テスト対応（S2）

- テストファイル: `tests/web/i18n.test.ts` の describe `hidden ref badge counter label (Feature 059-02)`。TC-006・TC-007・TC-009 は各 `it`、TC-008 は n=9/10/99/100 を `it.each`。実辞書JSONを `globalThis.webviewMessages` に設定し、既存の `t` をそのまま呼ぶ

## S3: 経路強調 UI の翻訳キーの英日解決

> Origin: Feature 061-01 (light-spec-plan)
> Added: 2026-10-03
> Status: active
> Supersedes: -
> Signature: `t(key: string, ...args: (string | number)[]): string`（実装は変更しない）
> Target Path: `web/i18n.ts:7-13`（`t`。実装は変更しない）
> Test File: `tests/web/i18n.test.ts`

対応プラン §3.6 の11キーが、実辞書 `l10n/web/web.l10n.en.json` / `l10n/web/web.l10n.ja.json` を `globalThis.webviewMessages` に設定した状態で、既存の `t` によりキーそのものへ fallback せず期待文言へ解決されることを確認する。モード値（`Direct parents and children` 等）はenumの値がそのままキーになる。各ケースは11キーの parameterized test（`it.each`）で、キーごとに期待文言を照合する。バーの DOM 構造は `web/pathHighlightController-test.md` S1 の責務で本表には含めない。

| Case ID | Input / Precondition                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Notes                                     |
| ------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| TC-010  | en 実辞書を設定し、§3.6 の11キーそれぞれで `t(key)` を呼ぶ | Normal - 英語解決                                                          | `pathHighlight.menu` → `Highlight path`、`Direct parents and children` → `Direct parents and children`、`Ancestors and descendants` → `Ancestors and descendants`、`First-parent ancestors` → `First-parent ancestors`、`All ancestors` → `All ancestors`、`pathHighlight.mode` → `Mode`、`pathHighlight.loadedOnly` → `Loaded history only`、`pathHighlight.clear` → `Clear path highlight`、`pathHighlight.branchAtSelection` → `Branch at selection`、`pathHighlight.targetOutside` → `Target is outside loaded history`、`pathHighlight.outside` → `Outside loaded history` と `toBe` で一致する | 11キーすべてが辞書に存在する              |
| TC-011  | ja 実辞書を設定し、同じ11キーで `t(key)` を呼ぶ            | Normal - 日本語解決                                                        | `pathHighlight.menu` → `経路を強調`、`Direct parents and children` → `直接の親・子`、`Ancestors and descendants` → `全祖先と全子孫`、`First-parent ancestors` → `第一親の祖先`、`All ancestors` → `全祖先`、`pathHighlight.mode` → `モード`、`pathHighlight.loadedOnly` → `読み込み済みの履歴のみ`、`pathHighlight.clear` → `経路の強調を解除`、`pathHighlight.branchAtSelection` → `選択時点のブランチ`、`pathHighlight.targetOutside` → `対象は読み込み済み履歴の範囲外です`、`pathHighlight.outside` → `読み込み済み履歴の範囲外` と `toBe` で一致する                                            | 英語キーの fallback（キーのまま）ではない |

### 失敗源インベントリ（include-or-justify）— Feature 061-01 追加分（S3）

| 失敗源                                    | 対応ケースまたは除外理由                                     |
| ----------------------------------------- | ------------------------------------------------------------ |
| 辞書のキー欠落（キーそのものへ fallback） | TC-010、TC-011（期待文言との `toBe` でキー文字列と区別する） |
| 英日の文言の誤り・取り違え                | TC-010、TC-011                                               |
| placeholder・数値差込み                   | excluded(11キーに placeholder がない)                        |
| 外部依存・例外                            | excluded(`t` は辞書参照と置換だけで throw 経路を持たない)    |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(上表のとおり)
- Exception: excluded(上表のとおり)
- External: excluded(上表のとおり)
- Boundary: excluded(キー欠落の fallback は S1 TC-002 で担保済み)
- Type: excluded(型分岐なし)
- Normal: TC-010、TC-011
