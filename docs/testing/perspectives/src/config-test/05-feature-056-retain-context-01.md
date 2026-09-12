# テスト観点表: src/config.ts

> Source: `src/config.ts`
> Generated: 2026-09-12T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: feature-056-retain-context

## S20: retainContextWhenHidden() 既定値の package.json 整合

> Origin: Feature 056 (retain-context-when-hidden) issue #48
> Added: 2026-09-12
> Status: active
> Supersedes: -
> Signature: `retainContextWhenHidden(): boolean`
> Target Path: `src/config.ts`（`maxDepthOfRepoSearch()` の直後）
> Test File: `tests/src/config-defaults.test.ts`（Group 1 の `it.each` 行）

`workspaceConfiguration.get("retainContextWhenHidden", true)` のフォールバック値が `package.json` の `git-keizu.retainContextWhenHidden.default` と一致する観点。S10 の単純値比較グループに 1 行追加する。設定値の型検証は VS Code の設定スキーマに委ね、本表では既定値契約のみ扱う。

| Case ID | Input / Precondition                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                    | Notes              |
| ------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------ |
| TC-368  | `get` mock がフォールバック値をそのまま返す状態で `retainContextWhenHidden()` を呼ぶ | Normal - 既定値の整合                                                      | 戻り値が `package.json` の `default`（`true`）と `toBe` で一致する | S10 と同じ比較方式 |

### 失敗源インベントリ（include-or-justify）— Feature 056 追加分（S20）

| 失敗源                                                 | 対応ケースまたは除外理由                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| コード側フォールバックと `package.json` 既定値の不一致 | TC-368                                                                                            |
| 設定キー名の綴り違い                                   | TC-368（`package.json` のキーで `default` を引くため、キーが無ければ `undefined` と不一致になる） |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL）  | excluded(boolean 設定。`true` / `false` 以外はスキーマで拒否される)                               |
| 外部依存×失敗モード                                    | excluded(`workspaceConfiguration.get()` は既定値契約で throw しない既存挙動)                      |
| 例外・エラー経路                                       | excluded(getter に分岐なし)                                                                       |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(上表のとおり)
- Exception: excluded(上表のとおり)
- External: excluded(上表のとおり)
- Boundary: excluded(上表のとおり)
- Type: excluded(上表のとおり)
- Normal: TC-368

**失敗系/正常系比（煙感知器）**: 正常系1件、失敗系0件。既定値 getter 1 本の追加で、失敗源は上表で網羅済みであることを確認した。
