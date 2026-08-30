# テスト観点表: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Generated: 2026-08-25T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: branch-cleanup

## S33: loadBranchCleanup routing・requestId validation・panel mount

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `private respondToMessage()` の `case "loadBranchCleanup"` / `private getHtmlForWebview()`（`#branchCleanupBtn` / `#branchCleanupPanel` mount）
> Target Path: `src/gitGraphView.ts`（message switch と HTML mount。実装後に行範囲へ更新）
> Test File: `tests/src/gitGraphView.test.ts`

`Number.isSafeInteger(requestId) && requestId > 0` を満たす request だけ DataSource を 1 回呼び、repo / requestId をそのまま echo する routing の観点（対応プラン §4 Task 3）。診断値の算出は `src/dataSource-test/06-branch-cleanup-01.md` S48、panel の state / 描画は `web/branchCleanupPanel-test.md` の責務で本表には含めない。

| Case ID | Input / Precondition                                                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                             | Notes                           |
| ------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| TC-158  | `{ command: "loadBranchCleanup", repo: <whitelist 済>, requestId: 5, compareBranch: null }` を受信 | Normal - valid request の委譲                                              | `dataSource.getBranchCleanup` が `(repo, null)` で 1 回呼ばれ、`postMessage` が `command: "loadBranchCleanup"` の response 1 件で呼ばれる                   | 1 request = 1 call = 1 response |
| TC-159  | 同 request の response 内容を検証                                                                  | Normal - repo / requestId echo                                             | response の `repo` と `requestId` が request の値と `toBe` で一致し、`result` が DataSource 戻り値の discriminated union と `toEqual` で一致する（無変換）  | echo 契約                       |
| TC-160  | `compareBranch: "develop"` の valid request を受信                                                 | Normal - compareBranch passthrough                                         | `getBranchCleanup` が `(repo, "develop")` で 1 回呼ばれる（値の加工・検証をしない）                                                                         | 解決は DataSource 側            |
| TC-161  | `requestId: 0` の request を受信                                                                   | Validation - requestId 0                                                   | `getBranchCleanup` の call count が 0、`postMessage` の `loadBranchCleanup` response が 0 件である                                                          | 応答も Git 実行もしない         |
| TC-162  | `requestId: -1` の request を受信                                                                  | Validation - requestId 負数                                                | `getBranchCleanup` call count 0、response 0 件                                                                                                              | -                               |
| TC-163  | `requestId: 1.5` の request を受信                                                                 | Validation - requestId 小数                                                | `getBranchCleanup` call count 0、response 0 件                                                                                                              | -                               |
| TC-164  | `requestId: "1"`（文字列）の request を受信                                                        | Type - requestId 文字列                                                    | `getBranchCleanup` call count 0、response 0 件                                                                                                              | runtime guard                   |
| TC-165  | `requestId: Number.MAX_SAFE_INTEGER + 1` の request を受信                                         | Validation - unsafe integer                                                | `getBranchCleanup` call count 0、response 0 件                                                                                                              | `Number.isSafeInteger` guard    |
| TC-166  | `requestId: 1`（最小 valid）の request を受信                                                      | Boundary - requestId 最小値                                                | `getBranchCleanup` が 1 回呼ばれ、response の `requestId` が `1` で echo される                                                                             | 0 との境界                      |
| TC-167  | `requestId: Number.MAX_SAFE_INTEGER` の request を受信                                             | Boundary - requestId 最大 safe 値                                          | `getBranchCleanup` が 1 回呼ばれ、response の `requestId` が `Number.MAX_SAFE_INTEGER` で echo される                                                       | 上限側の境界                    |
| TC-168  | valid request の処理で repoFileWatcher の mute / unmute を観測                                     | Normal - watcher finally 契約                                              | 既存 message case と同じく watcher の unmute が処理完了後（`finally`）に 1 回呼ばれる                                                                       | 既存契約の維持                  |
| TC-169  | `getHtmlForWebview()` を呼ぶ                                                                       | Normal - mount 順                                                          | 生成 HTML 内の出現順が controls → `#branchCleanupBtn` → `#branchCleanupPanel` → `#scrollContainer` であり、`#branchCleanupPanel` が hidden 状態で出力される | mount 契約                      |
| TC-170  | 生成 HTML の `#branchCleanupBtn` を検証                                                            | Normal - toolbar button                                                    | `#branchCleanupBtn` が controls 内に存在し、title が host l10n の branch cleanup キー由来の文字列と一致する                                                 | l10n 値は `src/i18n-test.md` S2 |
| TC-171  | 生成 HTML の既存 DOM を検証                                                                        | Normal - 既存 subtree の維持                                               | `#scrollContainer` / `#commitGraph` / dialog 系の既存 ID がすべて残り、branch 名文字列が HTML へ埋め込まれていない                                          | graph subtree 回帰なし          |
| TC-172  | request を受信せずに refresh 通知経路（`sendMessage` 相当）だけを起動する                          | Validation - host 自発要求の禁止                                           | webview へ送られた message に `command: "loadBranchCleanup"` が 0 件である（パネルを開かない限り host は診断要求・応答を生成しない）                        | 要求起点は webview のみ         |

### 失敗源インベントリ（include-or-justify）— Feature 055-03 追加分（S33）

| 失敗源                                                     | 対応ケースまたは除外理由                                                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| invalid requestId（0 / 負 / 小数 / 文字列 / unsafe）の通過 | TC-161〜TC-165                                                                                          |
| valid 境界（1 / MAX_SAFE_INTEGER）の誤拒否                 | TC-166、TC-167                                                                                          |
| repo / requestId の echo 崩れ・result の加工               | TC-159                                                                                                  |
| 1 request に対する複数 call / 複数 response                | TC-158（call count / response 件数 1 を検証）                                                           |
| watcher unmute 漏れ                                        | TC-168                                                                                                  |
| mount 順・hidden 初期状態の崩れ                            | TC-169                                                                                                  |
| 既存 graph / dialog DOM の破壊・branch 名の HTML 埋め込み  | TC-171                                                                                                  |
| host 自発の診断要求生成                                    | TC-172                                                                                                  |
| repository whitelist 外の repo                             | excluded(既存 message 共通の repository 検証で、既存 owner `01-message-routing-01.md` S 系の責務)       |
| DataSource 内部の失敗・診断値                              | excluded(`src/dataSource-test/06-branch-cleanup-01.md` S48 の責務。route は result を無変換で echo)     |
| 例外・エラー経路                                           | excluded(route 自体に throw 分岐を追加しない。DataSource は失敗を union で返し reject しない契約)       |
| 境界値（empty / NULL）                                     | excluded(requestId の数値境界は TC-161〜TC-167 で充足。null requestId は Type guard の TC-164 と同分岐) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-161〜TC-163、TC-165、TC-172
- Exception: excluded(上表のとおり throw 分岐なし)
- External: excluded(Git 失敗の写像は DataSource owner の責務)
- Boundary: TC-166、TC-167
- Type: TC-164
- Normal: TC-158〜TC-160、TC-168〜TC-171

**失敗系/正常系比（煙感知器）**: 正常系7件（TC-158〜TC-160、TC-168〜TC-171）、失敗系8件（TC-161〜TC-167、TC-172）。件数が近いためインベントリを再導出したが、routing 層の失敗源は requestId guard・echo 崩れ・mount / DOM 回帰・自発要求に限られ、Git 失敗と描画は他 owner へ割り当て済みであることを確認した。正常系には mount / 既存 DOM 維持の構造検証が並ぶため件数が多く、比率合わせの追加・削除は行っていない。
