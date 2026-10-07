# テスト観点表: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Generated: 2026-10-07T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: keyboard-accessibility

## S42: ホスト生成 HTML の toolbar button・label・DOM 順・一覧名・状態通知要素

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: superseded
> Superseded By: S43
> Supersedes: -
> Signature: `private getHtmlForWebview(...)` の `#controls` 内 HTML（`#branchCleanupBtn` / `#searchBtn` / `#fetchBtn` / `#currentBtn` / `#refreshBtn` を `button type="button"` に、`#repoSelect` / `#branchSelect` / `#authorSelect` の起動 button 名、`#showRemoteBranchesControl` の `label` と checkbox の DOM 順維持）/ `#commitTable` の `aria-label`（`hostT("Commit history")`）/ `role="status"` `aria-live="polite"` の通知要素（`hostT("Git Keizu status")`）
> Target Path: `src/gitGraphView.ts:755-851, 1086-1088`（`getHtmlForWebview()` の `#controls` 798-806、`#statusNotice` 809、`#commitTable` 814、`toolbarButton()`）
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

### Task 12 テスト対応（Feature 061-05）— S42

- 本節は S43 に置き換えた（TC-411 だけが契約変更。他の Case は S43 へ引き継ぎ、test method の対応は S43 の「Task 12 テスト対応」を参照）

## S43: ホスト生成 HTML の toolbar button・label・DOM 順・一覧名・状態通知要素（Dropdown 名は webview 辞書）

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: S42
> Signature: `private getHtmlForWebview(...)` の `#controls` 内 HTML（`toolbarButton(id, name)` による `#branchCleanupBtn` / `#searchBtn` / `#fetchBtn` / `#currentBtn` / `#refreshBtn`、`#repoControl` / `#branchControl` / `#authorControl` の `span.unselectable` label 文言と `div.dropdown` の隣接、`#showRemoteBranchesControl`）/ `#commitTable[aria-label=hostT("Commit history")]` / `#statusNotice[role="status"][aria-live="polite"][aria-label=hostT("Git Keizu status")]`
> Target Path: `src/gitGraphView.ts:755-851, 1086-1088`（`getHtmlForWebview()` の `#controls` 798-806、`#statusNotice` 809、`#commitTable` 814、`toolbarButton()`）
> Test File: `tests/src/gitGraphView.test.ts`

S42 TC-411 は Dropdown 起動 button の名前を host 側の `data-label` / `aria-labelledby` で渡す契約だったが、Task 9 は起動 button の名前を webview 側 `Dropdown` の `label` 引数（`t("toolbar.repo")` 等の webview 辞書）で付け、host は従来どおり `span.unselectable` の表示文言を `div.dropdown` の隣に置くだけとした（`web/dropdown-test.md` S11 TC-039 が名前の存在を検証）。本節は TC-411 を置き換え、S42 の TC-410・TC-412〜TC-417 は期待結果を変えずに引き継ぐ（テストは同じ Case ID のまま describe `GitKeizuView host HTML toolbar buttons, list name and status notice (S42)` に残る）。

| Case ID | Input / Precondition                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                  | Notes                                                                                  |
| ------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| TC-418  | `#repoControl` / `#branchControl` / `#authorControl` の周辺 HTML | Normal - label 文言と mount の隣接                                         | 各 wrapper が `span.unselectable`（文言 `hostT("Repo:")` / `hostT("Branches:")` / `hostT("Authors:")`）と `div.dropdown`（`#repoSelect` / `#branchSelect` / `#authorSelect`）を持ち、host は `data-label` / `aria-labelledby` を追加しない。起動 button の名前は webview 側（`web/dropdown-test.md` S11 TC-039） | S42 TC-411 の置き換え（K44）。Task 9「既存 toolbar 文言で付ける」は webview 辞書で充足 |

### 失敗源インベントリ（include-or-justify）— Feature 061-05 追加分（S43）

| 失敗源                                         | 対応ケースまたは除外理由                              |
| ---------------------------------------------- | ----------------------------------------------------- |
| label 文言の消失・mount の分離                 | TC-418                                                |
| toolbar button・順序・一覧名・status・ID・設定 | 引き継いだ S42 TC-410・TC-412〜TC-417（期待結果不変） |
| 外部依存・例外                                 | excluded(HTML 生成は文字列組立で `hostT` は mock)     |

### Task 12 テスト対応（Feature 061-05）— S43

- TC-418: `tests/src/gitGraphView.test.ts` `keeps the dropdown labels next to their mounts (TC-411)`（`// Case:` は旧 ID のまま本節を参照）
- 引き継ぎ: TC-410 `renders the five toolbar actions as named standard buttons` / TC-412 `keeps the remote checkbox label structure and order` / TC-413 `orders the toolbar children per R4.3 without any tabindex` / TC-414 `names the commit list` / TC-415 `places one polite status element outside the graph and the list` / TC-416 `keeps every existing id and never duplicates one` / TC-417 `adds no viewState key and no configuration entry`
- 実行結果（2026-10-07）: 8 件 pass
