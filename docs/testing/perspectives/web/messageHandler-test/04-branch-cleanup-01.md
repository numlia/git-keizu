# テスト観点表: web/messageHandler.ts

> Source: `web/messageHandler.ts`
> Generated: 2026-08-25T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: branch-cleanup

## S17: loadBranchCleanup 応答の API 委譲

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void`（`case "loadBranchCleanup"`）/ `GitKeizuViewAPI.loadBranchCleanup(response: ResponseLoadBranchCleanup): void`
> Target Path: `web/messageHandler.ts`（handleMessage switch。実装後に行範囲へ更新）
> Test File: `tests/web/messageHandler.test.ts`

`loadBranchCleanup` case は response 全体を `gitKeizu.loadBranchCleanup(msg)` へ 1 回渡し、handler 側では解釈しない契約（対応プラン §4 Task 5 実装内容 5）。鮮度判定・runtime validation・描画は `web/branchCleanupPanel-test.md` S2 の責務で本表には含めない。

| Case ID | Input / Precondition                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                            | Notes                  |
| ------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| TC-079  | `{ command: "loadBranchCleanup", repo, requestId, result: { kind: "ok", ... } }` を受信 | Normal - 無変換の委譲                                                      | `gitKeizu.loadBranchCleanup` が 1 回呼ばれ、引数が受信 message と同一 object（`toBe` で同一参照）である                    | exact object・加工なし |
| TC-080  | `result.kind` が `"error"` の応答を受信                                                 | Normal - 解釈しない委譲                                                    | `gitKeizu.loadBranchCleanup` が 1 回呼ばれ、`showErrorDialog` と `gitKeizu.refresh` の call count が 0 である              | 表示判断は panel 側    |
| TC-081  | `result.rows` に union 外の値を含む malformed 応答を受信                                | Type - malformed でも委譲                                                  | handler が例外を送出せず `gitKeizu.loadBranchCleanup` が 1 回呼ばれる（validation は panel の責務のため handler は素通し） | 検証の二重化を防ぐ     |

### 失敗源インベントリ（include-or-justify）— Feature 055-03 追加分（S17）

| 失敗源                                                | 対応ケースまたは除外理由                                                          |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| 委譲時の object 加工・複数回委譲                      | TC-079（同一参照・call count 1 を検証）                                           |
| handler 側での error 表示・refresh の先行             | TC-080                                                                            |
| malformed 応答での handler 例外                       | TC-081                                                                            |
| 鮮度判定・row validation・描画                        | excluded(`web/branchCleanupPanel-test.md` S2 の責務)                              |
| 外部依存×失敗モード                                   | excluded(handler は message 分岐のみで外部依存なし)                               |
| 例外・エラー経路                                      | excluded(handler 自体に throw 分岐を追加しない。malformed 素通しは TC-081 で検証) |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL） | excluded(handler は値を解釈しないため数値・空境界を持たない)                      |
| 入力検証×違反パターン                                 | excluded(検証は panel owner の契約。handler は素通しすることを TC-081 で固定)     |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(検証しないことが契約で、素通しは TC-081 で固定)
- Exception: excluded(throw 経路なし)
- External: excluded(外部依存なし)
- Boundary: excluded(値を解釈しないため境界なし)
- Type: TC-081
- Normal: TC-079、TC-080

**失敗系/正常系比（煙感知器）**: 正常系2件（TC-079、TC-080）、失敗系1件（TC-081）。差1のためインベントリを再導出したが、委譲 1 分岐だけの section で失敗源は加工・先行解釈・malformed 例外に限られ、検証系はすべて panel owner へ割り当て済みであることを確認した。
