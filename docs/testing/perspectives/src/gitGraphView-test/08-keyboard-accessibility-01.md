# テスト観点表: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Generated: 2026-10-07T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: keyboard-accessibility

## S42: ホスト生成 HTML の toolbar button・label・DOM 順・一覧名・状態通知要素

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: `private getHtmlForWebview(...)` の `#controls` 内 HTML（`#branchCleanupBtn` / `#searchBtn` / `#fetchBtn` / `#currentBtn` / `#refreshBtn` を `button type="button"` に、`#repoSelect` / `#branchSelect` / `#authorSelect` の起動 button 名、`#showRemoteBranchesControl` の `label` と checkbox の DOM 順維持）/ `#commitTable` の `aria-label`（`hostT("Commit history")`）/ `role="status"` `aria-live="polite"` の通知要素（`hostT("Git Keizu status")`）
> Target Path: `src/gitGraphView.ts`（`getHtmlForWebview()` の `#controls` と `#content` 生成。設計時のため実装後に行範囲へ更新）
> Test File: `tests/src/gitGraphView.test.ts`

対応プラン Task 9 実装内容 1 の観点。既存 ID と DOM 順を維持し、設定・プロトコル・依存を追加しない。生成 HTML を `JSDOM` で parse して属性と順序を観測し、`hostT` は `vscode.l10n.t` の mock で英語値を返す。Webview 側のキー処理・`disabled` の同期は `web/main-test/13-keyboard-accessibility-01.md` S69 / `-02.md` S77、辞書の値は `l10n/bundle.l10n-test.md` / `l10n/bundle.l10n.ja-test.md` の責務で本表には含めない。

| Case ID | Input / Precondition                                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                                      | Notes                                                                                |
| ------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TC-410  | 生成 HTML の `#branchCleanupBtn` / `#searchBtn` / `#fetchBtn` / `#currentBtn` / `#refreshBtn` | Normal - 標準 button と名前                                                | 5 要素が `button` で `type="button"`、ID が既存と同じ、名前（`aria-label` または `title`）が `hostT("Branch Cleanup")` / `hostT("Search")` / `hostT("Fetch --prune")` / `hostT("Current")` / `hostT("Refresh")` の戻り値と一致                                                                                                                       | K44 / A8.1-6                                                                         |
| TC-411  | `#repoSelect` / `#branchSelect` / `#authorSelect` の周辺 HTML                                 | Normal - Dropdown 起動 button の名前の供給                                 | 各 `div.dropdown` に隣接する label 文言（`hostT("Repo:")` 等）が、Webview 側の Dropdown が起動 button の名前に使える属性（`data-label` または `aria-labelledby` 先の `id` 付き `span`）で渡される                                                                                                                                                    | K44。Task 9「repo/branch/authorのDropdown起動buttonの名前を既存toolbar文言で付ける」 |
| TC-412  | `#showRemoteBranchesControl` の構造                                                           | Normal - remote checkbox の label と DOM 順                                | `label#showRemoteBranchesControl` の子が順に `input#showRemoteBranchesCheckbox[type="checkbox"][value="1"][checked]` → `span.customCheckbox` → テキスト `hostT("Show Remote Branches")` で、変更前と同じ順序                                                                                                                                         | K44。「remote checkboxのlabelとDOM順は維持」                                         |
| TC-413  | `#controls` の子要素の順序                                                                    | Normal - toolbar の DOM 順                                                 | `#repoControl` → `#branchControl` → `#authorControl` → `#showRemoteBranchesControl` → `#branchCleanupBtn` → `#searchBtn` → `#fetchBtn` → `#currentBtn` → `#refreshBtn` の順で、`tabindex` 属性を持つ要素が `#controls` 内に 0 件（正の tabindex なし、順序は DOM 順）                                                                                | K44 / R4.3                                                                           |
| TC-414  | `#commitTable` の属性                                                                         | Normal - 一覧の名前                                                        | `aria-label` が `hostT("Commit history")` の戻り値                                                                                                                                                                                                                                                                                                   | K44 / K45                                                                            |
| TC-415  | `#content` / `#scrollContainer` 周辺の通知要素                                                | Normal - 分離した status 要素                                              | `role="status"` と `aria-live="polite"` を持つ要素が 1 個あり、名前が `hostT("Git Keizu status")`、`#commitGraph` / `#commitTable` の子孫ではなく、`#commitGraph` と `#commitTable` 自体に `aria-live` が無い                                                                                                                                        | K44 / R4.8「グラフ全体の再描画をlive領域として読み直させない」                       |
| TC-416  | 生成 HTML 全体の `id` 集合を変更前と比較                                                      | Validation - 既存 ID の維持                                                | 既存 ID がすべて残り（`repoSelect` / `branchSelect` / `authorSelect` / `showRemoteBranchesCheckbox` / `branchCleanupBtn` / `searchBtn` / `fetchBtn` / `currentBtn` / `refreshBtn` / `branchCleanupPanel` / `scrollContainer` / `scrollShadow` / `content` / `commitGraph` / `commitTable` / `footer` / `dialogBacking` / `dialog`）、重複 ID が 0 件 | Task 9「既存IDを維持」                                                               |
| TC-417  | `viewState` の JSON と `package.json` の `contributes.configuration`                          | Validation - 設定・プロトコルの追加なし                                    | `viewState` に新しいキーが無く、`git-keizu.*` の設定項目数が変更前と同じ                                                                                                                                                                                                                                                                             | §3.1 / R6                                                                            |

### 失敗源インベントリ（include-or-justify）— Feature 061-05 追加分（S42）

| 失敗源                                      | 対応ケースまたは除外理由                          |
| ------------------------------------------- | ------------------------------------------------- |
| toolbar が button でない・名前なし          | TC-410                                            |
| Dropdown 起動 button の名前が渡らない       | TC-411                                            |
| remote checkbox の label / 順序の変更       | TC-412                                            |
| DOM 順・正の tabindex                       | TC-413                                            |
| 一覧名・status 要素の欠落、グラフの live 化 | TC-414、TC-415                                    |
| 既存 ID の消失・重複                        | TC-416                                            |
| 設定・プロトコル追加                        | TC-417                                            |
| 外部依存・例外                              | excluded(HTML 生成は文字列組立で `hostT` は mock) |
