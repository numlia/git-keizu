# テスト観点表: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Generated: 2026-09-08T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: file-history

## S34: fileHistory routing・requestId validation・response echo

> Origin: Feature 055-07 (light-spec-plan)
> Added: 2026-09-08
> Status: active
> Supersedes: -
> Signature: `private respondToMessage()` の `case "fileHistory"`（`case "fetchAvatar"` の後）
> Target Path: `src/gitGraphView.ts`（message switch。実装後に行範囲へ更新）
> Test File: `tests/src/gitGraphView.test.ts`

登録済み repository の request だけが先頭フィルタ（`src/gitGraphView.ts:161-170`）を通過し、`Number.isSafeInteger(requestId) && requestId > 0` を満たすときだけ `dataSource.getFileHistory()` を 1 回呼んで `repo` / `requestId` / `anchorHash` / `filePath` を echo する routing の観点（対応プラン §4 Task 3 実装内容 2〜3）。Git 引数と entry の算出は `src/dataSource-test/07-file-history-01.md` S49〜S50、hash / path の検証は DataSource 側の責務で本表には含めない。

| Case ID | Input / Precondition                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                        | Notes                      |
| ------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------- |
| TC-173  | `{ command: "fileHistory", repo: <未登録>, requestId: 1, anchorHash, filePath }` を受信 | Validation - 未登録 repository                                             | `dataSource.getFileHistory` と `postMessage` の call count が 0（無応答）                              | 既存の先頭フィルタに委ねる |
| TC-174  | `requestId: 0` の request                                                               | Boundary - requestId 0                                                     | `getFileHistory` と `postMessage` の call count が 0                                                   | `> 0` を満たさない         |
| TC-175  | `requestId: -1` の request                                                              | Validation - 負数                                                          | `getFileHistory` と `postMessage` の call count が 0                                                   | -                          |
| TC-176  | `requestId: 1.5` の request                                                             | Type - 非整数                                                              | `getFileHistory` と `postMessage` の call count が 0                                                   | `Number.isSafeInteger` 偽  |
| TC-177  | `requestId: Number.MAX_SAFE_INTEGER + 1` の request                                     | Boundary - safe integer 上限 +1                                            | `getFileHistory` と `postMessage` の call count が 0                                                   | -                          |
| TC-178  | `requestId: 1`（最小の有効値）の request                                                | Boundary - 最小の有効値                                                    | `getFileHistory` が 1 回呼ばれ、`postMessage` が `command: "fileHistory"` の response 1 件で呼ばれる   | -                          |
| TC-179  | `requestId: Number.MAX_SAFE_INTEGER` の request                                         | Boundary - safe integer 上限                                               | `getFileHistory` が 1 回呼ばれ、response の `requestId` が同じ値                                       | -                          |
| TC-180  | 登録済み repo、`requestId: 5`、`anchorHash: "abc"`、`filePath: "src/a.txt"` の request  | Normal - DataSource への委譲                                               | `getFileHistory` が `("<repo>", "abc", "src/a.txt")` で 1 回呼ばれる                                   | 引数の加工なし             |
| TC-181  | 同 request の response                                                                  | Normal - 4 field の echo                                                   | response の `repo` / `requestId` / `anchorHash` / `filePath` が request の値と `toBe` で一致する       | -                          |
| TC-182  | `getFileHistory` が entries 配列を返す                                                  | Normal - entries の同一参照                                                | response の `entries` が戻り値と `toBe` で同一参照（無変換）                                           | -                          |
| TC-183  | `getFileHistory` が `null` を返す                                                       | Normal - null の素通し                                                     | response の `entries` が `null`（`[]` や `undefined` へ畳まない）で、`postMessage` は 1 回呼ばれる     | 失敗も response する       |
| TC-184  | `anchorHash: "zz"`（不正 hash）の有効 requestId request                                 | Normal - hash / path 検証の委譲                                            | `getFileHistory` が `"zz"` をそのまま渡して 1 回呼ばれ、response の `entries` が戻り値（`null`）である | 検証は DataSource owner    |

### 失敗源インベントリ（include-or-justify）— Feature 055-07 追加分（S34）

| 失敗源                                                 | 対応ケースまたは除外理由                                                                                                                                                |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 未登録 repository への応答                             | TC-173                                                                                                                                                                  |
| 不正 requestId（0 / 負数 / 非整数 / 上限超え）への応答 | TC-174〜TC-177                                                                                                                                                          |
| 有効 requestId の取り漏れ（境界）                      | TC-178、TC-179                                                                                                                                                          |
| echo field の欠落・値の加工                            | TC-181、TC-182、TC-184                                                                                                                                                  |
| `null` を `[]` や `undefined` へ畳む                   | TC-183                                                                                                                                                                  |
| DataSource の重複呼出・引数の加工                      | TC-180                                                                                                                                                                  |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL）  | 0: TC-174。minimum: TC-178。maximum: TC-179。+1: TC-177。NULL: TC-183。empty: excluded(requestId は数値で、`anchorHash` / `filePath` の空文字列検証は DataSource owner) |
| 外部依存×失敗モード                                    | excluded(Git 失敗は `getFileHistory()` が `null` へ写像し、routing は TC-183 で素通しを固定する)                                                                        |
| 例外・エラー経路                                       | excluded(case 節に throw 分岐を追加しない)                                                                                                                              |
| stale response / anchor 不在 / DOM 再生成 / unload     | excluded(webview owner の責務。host は request 単位で応答する)                                                                                                          |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-173、TC-175
- Exception: excluded(上表のとおり throw 経路なし)
- External: excluded(上表のとおり)
- Boundary: TC-174、TC-177〜TC-179
- Type: TC-176
- Normal: TC-180〜TC-184

**失敗系/正常系比（煙感知器）**: 正常系5件、失敗系7件。routing 1 case の section で失敗源は repo フィルタと requestId 検証に限られ、上表で列挙済みであることを確認した。比率合わせのためのケース追加・削除は行わない。
