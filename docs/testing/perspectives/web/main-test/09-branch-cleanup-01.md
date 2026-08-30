# テスト観点表: web/main.ts

> Source: `web/main.ts`
> Generated: 2026-08-25T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: branch-cleanup

## S49: branch cleanup panel の lifecycle 接続・1 branch filter・dataset 完全一致 scroll

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `GitKeizuView` constructor の panel 生成 / `refresh(mode)` / `selectRepo()`・`loadRepos()` / `showBranchInGraph(branchName: string): void`
> Target Path: `web/main.ts`（panel 接続と graph 移動。実装後に行範囲へ更新）
> Test File: `tests/web/main.test.ts`

panel を constructor で 1 回生成して graph callback・delete dialog callback を注入し、repository 変更・refresh を panel へ接続する配線と、`showBranchInGraph()` の 1 branch filter・描画後 dataset 完全一致 scroll の観点（対応プラン §3.3 / §4 Task 5）。panel 内部の row validation・描画は `web/branchCleanupPanel-test.md`、response の委譲は `web/messageHandler-test/04-branch-cleanup-01.md` S17 の責務。

| Case ID | Input / Precondition                                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                 | Notes                       |
| ------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| TC-305  | `GitKeizuView` を初期化し `#branchCleanupBtn` をクリック                                                | Normal - panel 生成と toggle 接続                                          | `BranchCleanupPanel` の constructor が 1 回だけ呼ばれ、button click で `panel.toggle(currentRepo)` が 1 回呼ばれる                              | 生成は 1 インスタンス       |
| TC-306  | `panel.isOpen()` が `true` の状態で `refresh("soft")` を呼ぶ                                            | Normal - open 中の refresh 接続                                            | `panel.refresh(currentRepo)` が 1 回呼ばれ、既存の `loadBranches` / `loadCommits` request は従来どおり送られる（既存 payload 不変）             | 既存 refresh 契約の維持     |
| TC-307  | `panel.isOpen()` が `false` の状態で `refresh("soft")` を呼ぶ                                           | Boundary - close 中の refresh                                              | `panel.refresh` の call count が 0 で、`loadBranchCleanup` の `sendMessage` が 0 件である                                                       | close 中は追加 message 0 件 |
| TC-308  | repository dropdown で A から B へ切り替える                                                            | Normal - repository 切替の接続                                             | `panel.selectRepository("B")` が 1 回呼ばれる                                                                                                   | 反例: repo 切替             |
| TC-309  | 同一 repository のまま `refresh("soft")` を繰り返す                                                     | Normal - 同一 repository では selectRepository を呼ばない                  | `panel.selectRepository` の call count が 0 のままである（selection 維持）                                                                      | 実変更時のみ通知            |
| TC-310  | `showBranchInGraph("feature/x")` を呼ぶ                                                                 | Normal - 1 branch filter と hard refresh                                   | `selectedBranches` が `["feature/x"]` に置き換わり、dropdown の選択 state が同期され、hard refresh の `loadCommits` request が 1 回だけ送られる | filter は対象 1 件          |
| TC-311  | `showBranchInGraph("feature/x")` の描画完了後、`.gitRef.head` label（`dataset.name = "feature/x"`）あり | Normal - 描画後の dataset 完全一致 scroll                                  | 全 `.gitRef.head` の走査で `dataset.name === "feature/x"` の label が属する commit 行の hash が `scrollToCommit()` へ渡り、1 回呼ばれる         | 描画後に走査                |
| TC-312  | `showBranchInGraph("a;b")`・label の `dataset.name` が `a;b`（`x<img>` でも同様）                       | Type - 特殊名の selector 不使用                                            | branch 名が `querySelector()` の selector 文字列へ連結されず、dataset の完全一致比較で label が発見され `scrollToCommit()` が 1 回呼ばれる      | 反例: 特殊名                |
| TC-313  | `showBranchInGraph("feature/x")` の描画後、一致する `dataset.name` の label が存在しない                | Validation - 一致 label なし                                               | `scrollToCommit()` の call count が 0 で、例外が送出されない                                                                                    | ref 移動後の安全側          |
| TC-314  | 描画後の label が `dataset.name = "feature/x-suffix"` のみ                                              | Boundary - 前方一致の排除                                                  | `scrollToCommit()` の call count が 0 である（部分一致・前方一致で scroll しない）                                                              | 完全一致のみ                |
| TC-315  | panel の delete callback へ `("/repo", "feature/x", ["origin"])` が渡る                                 | Normal - delete dialog 配線                                                | export された `showDeleteBranchDialog` が `("/repo", "feature/x", ["origin"])` の完全一致引数で 1 回呼ばれる                                    | dialog 本体は refMenu owner |

### 失敗源インベントリ（include-or-justify）— Feature 055-03 追加分（S49）

| 失敗源                                                | 対応ケースまたは除外理由                                                      |
| ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| close 中の refresh で診断 message を誘発する          | TC-307                                                                        |
| repository 実変更の通知漏れ・過剰通知                 | TC-308、TC-309                                                                |
| filter が 1 件に置き換わらない・既存 request の破壊   | TC-306、TC-310                                                                |
| branch 名の selector 連結                             | TC-312                                                                        |
| 一致 label 不在・前方一致での誤 scroll                | TC-313、TC-314                                                                |
| panel の多重生成・callback 未注入                     | TC-305、TC-315                                                                |
| 描画完了前の走査（label 未生成での scroll 失敗）      | TC-311（描画後の走査で hash が渡ることを検証）                                |
| panel 内部の row validation・描画                     | excluded(`web/branchCleanupPanel-test.md` S2〜S4 の責務)                      |
| response の委譲                                       | excluded(`web/messageHandler-test/04-branch-cleanup-01.md` S17 の責務)        |
| dialog 文面・payload・defaults                        | excluded(`web/refMenu-test/01-branch-actions-01.md` S21 の責務)               |
| 例外・エラー経路                                      | excluded(配線 method に throw 分岐がない。label 不在の安全側は TC-313 で検証) |
| 外部依存×失敗モード                                   | excluded(webview 内の関数呼び出しのみで外部依存なし)                          |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL） | excluded(数値境界なし。0 件一致は TC-313 / TC-314、選択 1 件は TC-310 で充足) |
| 不正な型・フォーマット                                | excluded(型契約は `src/types-test.md` S8 の責務)                              |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-313
- Exception: excluded(throw 経路なし)
- External: excluded(外部依存なし)
- Boundary: TC-307、TC-314
- Type: TC-312
- Normal: TC-305、TC-306、TC-308〜TC-311、TC-315

**失敗系/正常系比（煙感知器）**: 正常系7件（TC-305、TC-306、TC-308〜TC-311、TC-315）、失敗系4件（TC-307、TC-312〜TC-314）。配線 section のため正常系（接続の存在検証）が並ぶ構造で、失敗源は close 中誘発・selector 連結・不一致 scroll に限られることをインベントリで確認した。
