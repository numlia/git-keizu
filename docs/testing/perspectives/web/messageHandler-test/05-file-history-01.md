# テスト観点表: web/messageHandler.ts

> Source: `web/messageHandler.ts`
> Generated: 2026-09-08T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: file-history

## S18: fileHistory 応答の API 委譲

> Origin: Feature 055-07 (light-spec-plan)
> Added: 2026-09-08
> Status: active
> Supersedes: -
> Signature: `handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void`（`case "fileHistory"`）/ `GitKeizuViewAPI.loadFileHistory(response: ResponseFileHistory): void`
> Target Path: `web/messageHandler.ts`（handleMessage switch。`case "fetchAvatar"` の後。実装後に行範囲へ更新）
> Test File: `tests/web/messageHandler.test.ts`

`fileHistory` case は response 全体を `gitKeizu.loadFileHistory(msg)` へ 1 回渡し、handler 側では解釈しない契約（対応プラン §4 Task 7 実装内容 1）。requestId / repo の鮮度判定・error dialog・強調は `web/fileHistory-test.md` S3〜S4 の責務で本表には含めない。

| Case ID | Input / Precondition                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                               | Notes                    |
| ------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| TC-082  | `{ command: "fileHistory", repo, requestId, anchorHash, filePath, entries: [...] }` を受信 | Normal - 無変換の委譲                                                      | `gitKeizu.loadFileHistory` が 1 回呼ばれ、引数が受信 message と同一 object（`toBe` で同一参照）である                         | exact object・加工なし   |
| TC-083  | `entries: null` の応答を受信                                                               | Normal - 解釈しない委譲                                                    | `gitKeizu.loadFileHistory` が 1 回呼ばれ、`showErrorDialog` と `gitKeizu.refresh` の call count が 0 である                   | 表示判断は controller 側 |
| TC-084  | `entries` に union 外の `type` を含む malformed 応答を受信                                 | Type - malformed でも委譲                                                  | handler が例外を送出せず `gitKeizu.loadFileHistory` が 1 回呼ばれる（validation は controller の責務のため handler は素通し） | 検証の二重化を防ぐ       |

### 失敗源インベントリ（include-or-justify）— Feature 055-07 追加分（S18）

| 失敗源                                                | 対応ケースまたは除外理由                                                                        |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 委譲時の object 加工・複数回委譲                      | TC-082（同一参照・call count 1 を検証）                                                         |
| handler 側での error 表示・refresh の先行             | TC-083                                                                                          |
| malformed 応答での handler 例外                       | TC-084                                                                                          |
| 鮮度判定・anchor 不在・強調                           | excluded(`web/fileHistory-test.md` S3〜S4 の責務)                                               |
| 外部依存×失敗モード                                   | excluded(handler は message 分岐のみで外部依存なし)                                             |
| 例外・エラー経路                                      | excluded(handler 自体に throw 分岐を追加しない。malformed 素通しは TC-084 で検証)               |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL） | excluded(handler は値を解釈しないため数値・空境界を持たない。`entries: null` の素通しは TC-083) |
| 入力検証×違反パターン                                 | excluded(検証は controller owner の契約。handler は素通しすることを TC-084 で固定)              |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(検証しないことが契約で、素通しは TC-084 で固定)
- Exception: excluded(throw 経路なし)
- External: excluded(外部依存なし)
- Boundary: excluded(値を解釈しないため境界なし)
- Type: TC-084
- Normal: TC-082、TC-083

**失敗系/正常系比（煙感知器）**: 正常系2件（TC-082、TC-083）、失敗系1件（TC-084）。差1のためインベントリを再導出したが、委譲 1 分岐だけの section で失敗源は加工・先行解釈・malformed 例外に限られ、検証系はすべて controller owner へ割り当て済みであることを確認した。
