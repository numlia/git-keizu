# テスト観点表: web/main.ts

> Source: `web/main.ts`
> Generated: 2026-10-07T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: keyboard-accessibility

`13-keyboard-accessibility-01.md` の続き（同じ共通 fixture・用語・計画 ID 対応表を参照）。本 shard は Tab 順と一覧内の往復、再描画・応答後の復元とメニュー維持、メニュー起動経路、詳細・ファイル操作の既存アクション接続、行の名前・状態説明・通知を持つ。

## S73: Tab 順序・一覧内の往復・停止点の構成

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: `FocusContext.getTabStops(): readonly HTMLElement[]` の main 実装 / 一覧内の Tab 境界処理（操作対象行 → 表示参照・counter → 詳細操作の往復で `moveFocusPast` を使う）/ 列ヘッダーの並び順メニュー button
> Target Path: `web/main.ts`（`getTabStops` の組み立て、`renderTable()` の列ヘッダー、一覧内 Tab の keydown 処理。実装後に行範囲へ更新）
> Test File: `tests/web/main.keyboard.test.ts`

対応プラン §3.6・R4.3 の順序。通常 DOM 順の部分はネイティブ Tab に任せ、別行に挿入された詳細との境界だけ明示移動する。jsdom では Tab の既定動作が生成されないため、`getTabStops()` の配列と、一覧内境界で `Tab` keydown を送ったときの `activeElement` / `defaultPrevented` を観測する。実 Tab 順は Task 12 の実 Webview 確認（Notes）に残す。

| Case ID | Input / Precondition                                                                                                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                     | Notes                                                          |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| TC-700  | 経路バー・履歴バー・整理パネル・追加読込 button・検索を表示した状態で `getTabStops()`                                                    | Normal - 上位の並び                                                        | 配列の順が toolbar の要素群 → `#pathHighlightBar` 内の操作 → `#fileHistoryBar` 内の操作 → 整理パネル内の操作 → 表ヘッダーの並び順 button → 操作対象行 → その行の参照 / counter → 詳細操作 → 追加読込 button → 検索の操作で、要素は全て `isConnected` かつ非 `hidden`・非 `disabled` | R4.3。バー同士の DOM 順を保つ                                  |
| TC-701  | toolbar 部分だけを抽出                                                                                                                   | Normal - toolbar 内の順                                                    | repo 起動 button → branch 起動 button → author 起動 button → `#showRemoteBranchesCheckbox` → `#branchCleanupBtn` → `#searchBtn` → `#fetchBtn` → `#currentBtn` → `#refreshBtn`                                                                                                       | R4.3                                                           |
| TC-702  | 操作対象 `R`、`N` の詳細を開き（詳細は別行）、`R` に参照 2 個がある状態で `R` の行 → `Tab` → `Tab` → `Tab` → `Tab`                       | Normal - 行 → 参照群 → 詳細群の順方向                                      | `activeElement` が順に `R` の参照 1 → 参照 2 → `N` の詳細内の最初の操作（親リンク button）→ 次の詳細操作。境界（参照 2 → 詳細）の `Tab` だけ `defaultPrevented === true`                                                                                                            | K20。詳細が操作対象と異なる行にあっても参照群の後              |
| TC-703  | TC-702 の最後の位置から Shift + `Tab` を繰り返す                                                                                         | Normal - 逆方向の対称                                                      | `activeElement` が逆順（詳細操作 → `R` の参照 2 → 参照 1 → `R` の行）で、境界（詳細の先頭 → 参照 2）の Shift + `Tab` だけ消費                                                                                                                                                       | K20。「前後方向を対称に」                                      |
| TC-704  | TC-702 の状態で `getTabStops()` と `N` / `M` 行の参照 button の `tabindex`                                                               | Validation - 他行の参照は停止点に含めない                                  | `N` / `M` 行の参照 button が配列に無く `tabindex="-1"`。`R` 行の参照だけ `tabindex="0"`                                                                                                                                                                                             | R4.3「他行のラベルはTab順に含めない」                          |
| TC-705  | 経路バー非表示、`#currentBtn` が `disabled`、検索非表示、整理パネル `hidden` の状態で `getTabStops()`。document 内の `tabindex` 値を列挙 | Validation - 非表示・無効の除外と正の tabindex の不使用                    | 非表示 / 無効の要素が配列に含まれず、`tabindex` の値が `"0"` と `"-1"` 以外に存在しない                                                                                                                                                                                             | R4.1 / R4.3                                                    |
| TC-706  | 表ヘッダーの並び順 button に実フォーカスして `Enter` と `Space`                                                                          | Normal - 列ヘッダーの並び順メニュー                                        | 既存の並び順メニュー（`02-context-menu-01.md` S34 と同じ項目）が開き、最初の操作項目へ実フォーカス、要求 0 件                                                                                                                                                                       | §3.6「列ヘッダーには並び順メニューを起動する標準buttonを置く」 |
| TC-707  | 詳細操作の最後の要素で `Tab`、`R` の行で Shift + `Tab`                                                                                   | Boundary - 詳細側から通常 DOM 順へ戻って再入場しない                       | 詳細最後の `Tab` は非消費で `activeElement` が変わらない（ネイティブ Tab で追加読込 / 検索へ進む）。行の Shift + `Tab` も非消費（表ヘッダーへはネイティブ）。循環して参照群へ戻らない                                                                                               | §3.6「詳細側から通常DOM順へ戻って再入場する循環を作らない」    |
| TC-708  | `moreCommitsAvailable: true` で追加読込 button を表示し、検索を表示した状態で配列の末尾 3 要素                                           | Normal - 追加読込と検索は一覧の後                                          | 末尾が追加読込 `button` → 検索 input → 検索の button 群で、追加読込は `button` 要素                                                                                                                                                                                                 | R4.3。Task 9「loadMoreもbuttonに」                             |

### 失敗源インベントリ（include-or-justify）— Feature 061-05 追加分（S73）

| 失敗源                                  | 対応ケースまたは除外理由                                                                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 上位・toolbar の順序崩れ                | TC-700、TC-701                                                                                                                                                                       |
| 別行の詳細へ入れない、逆方向が非対称    | TC-702、TC-703                                                                                                                                                                       |
| 他行の参照・非表示・無効・正の tabindex | TC-704、TC-705                                                                                                                                                                       |
| ヘッダー button の欠落                  | TC-706                                                                                                                                                                               |
| 循環、追加読込 / 検索の位置             | TC-707、TC-708                                                                                                                                                                       |
| 実 Tab 移動                             | excluded(jsdom では生成されない。Task 12 の実 Webview 手動 Case: toolbar → 一覧 → 参照 → 詳細 → 追加読込 → 検索 → Webview 外へ Tab で退出できることを VS Code 版・OS を記録して確認) |

## S74: 再描画・応答後のフォーカス復元とメニュー対象の維持

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: `renderTable()` / `renderUncommitedChanges()` / 詳細の挿入・置換（`renderCommitDetailsView()` / `showCommitDetails()`）/ 追加読込 / `renderShowLoading()` での `beginFocusUpdate(root)` → `finishFocusUpdate(update)` の接続 / repo 変更入口での ticket 失効と `hideContextMenu("repository")` / 同 repo の `renderShowLoading()` でメニューを閉じない変更
> Target Path: `web/main.ts`（各描画関数の前後と repo 変更入口。実装後に行範囲へ更新）
> Test File: `tests/web/main.keyboard.test.ts`

対応プラン §3.4 の ticket 方式を main の描画へ接続した観点。ticket の判定自体は `web/keyboardNavigation-test.md` S4 の責務で、本表は main のどの描画でどの root に ticket を取り、repo 変更でいつ失効させるかを実 DOM で観測する。復元のための追加要求・自動再試行は作らない（全 Case で復元に伴う `postMessage` 増分 0）。

| Case ID | Input / Precondition                                                                                                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                          | Notes                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| TC-709  | `M` に実フォーカス → `renderShowLoading()`（読み込み表示）→ 利用者が `#refreshBtn` へ focus → 同 repo の `loadCommits` 応答                 | Validation - 退避後の利用者移動を上書きしない                              | 応答後も `activeElement` が `#refreshBtn`、`M` は `tabindex="0"` のまま、`postMessage` 増分 0                                                                            | K21 / A8.3-5                                                            |
| TC-710  | `M` の参照 button に実フォーカスした状態で同 repo の `loadCommits`（同じ commits、`hard: true`）を受理                                      | Normal - 同 repo の再描画で復元                                            | `activeElement` が新しい `M` の参照 button（旧要素は `isConnected === false`）、`scrollTop` 不変、`postMessage` 増分 0                                                   | K22 / A8.1-7                                                            |
| TC-711  | `M` に実フォーカス → 同 repo の `loadCommits` 応答を 2 回連続で受理（2 回目で `M` が消え `R` が旧 index）                                   | Normal - 連続応答は最新 ticket だけ復元                                    | 最終的な `activeElement` が `R` の行（1 回目の ticket で `M` へ戻した後、2 回目で `R`）。`focus` が切断要素に対して呼ばれない                                            | K22 / A8.3-3                                                            |
| TC-712  | `M` に実フォーカス → 別 repo へ `selectRepo` → 別 repo の `loadCommits` 応答。別途 `loadRepos` で現在 repo が消える応答                     | Validation - repo 切替後は旧 ticket で復元しない                           | 別 repo の表に `M` があっても `activeElement` が `M` の行に移らず、HEAD 行だけが `tabindex="0"`（focus は奪わない）。`loadRepos` 経路も同じ                              | K22 / A8.3-3                                                            |
| TC-713  | `M` の参照 button に実フォーカス → `renderShowLoading()` → 同 repo の応答で同じ参照が残る / 消える                                          | Normal - 読み込み中の `#commitTable` 退避と再解決                          | 読み込み表示中は `activeElement` が `#commitTable`。応答後は残る場合は新しい参照 button、消える場合は所属行 `M`（行も消えれば操作対象行）                                | A8.3-5。`web/keyboardNavigation-test.md` S4 TC-051 の main 接続         |
| TC-714  | `M` の行メニューを開いた状態で同 repo の `renderShowLoading()`、続けて同 repo の応答                                                        | Normal - 同 repo の読み込み表示でメニューを閉じない                        | `#contextMenu` が `active` のまま、応答後に項目を `click` すると開いた時点の `repo` / `hash`（`M`）で既存 action が 1 回呼ばれる                                         | R4.7「同一repoの読み込み表示でメニューを無条件に閉じる現行処理…を変更」 |
| TC-715  | `M` の行メニューを開いた状態で別 repo へ `selectRepo`                                                                                       | Validation - repo 変更はメニューを閉じる                                   | `hideContextMenu` が呼ばれ `#contextMenu` の `active` が外れ、その後に旧項目の `onClick` を呼んでも `postMessage` 0 件                                                   | K31 / A8.3-5                                                            |
| TC-716  | `M` の行メニューを開いたまま同 repo の `loadCommits`（並べ替えで `M` の DOM が置換、操作対象は `R` へ移動する入力）を受理し、項目を `click` | Validation - DOM 置換でアクション対象を付け替えない                        | 実行される既存 action の引数 `hash` が `M`（現在の操作対象 `R` ではない）。復元先は意味上のキーで解決                                                                    | K46 / A8.3-5                                                            |
| TC-717  | 追加読込 button に実フォーカスして `Enter`、応答で追加行を受理                                                                              | Normal - 追加読込の無効化と復元                                            | `Enter` 直後に button が `disabled`、`loadCommits` 要求 1 件、応答後の `activeElement` が接続された有効要素（残る追加読込 button、無ければ操作対象行）で `body` ではない | Task 9「処理開始時の無効化/置換でfocus ticketを扱う」                   |
| TC-718  | 詳細の親リンク button に実フォーカスして `Enter`（親 `R` の詳細へ切替）、応答で詳細を再描画                                                 | Normal - 詳細の置換後の復元                                                | 応答後の `activeElement` が新しい詳細内の接続された操作（同じキーが無いため詳細の起点行 `R`）で、`commitDetails` 要求が 1 件だけ                                         | K39。詳細内 DOM の置換                                                  |
| TC-719  | 詳細内のファイル差分 button に実フォーカスした状態で、そのファイルが無い `commitDetails` 応答を受理                                         | Normal - 消失したファイル操作は詳細の起点行へ                              | `activeElement` が詳細の起点行、切断要素への `focus` 呼出し 0 回、要求増分 0                                                                                             | A8.3-5                                                                  |
| TC-720  | TC-709〜TC-719 の全操作で復元に伴う `postMessage` を集計                                                                                    | Validation - 復元のための要求・再試行なし                                  | 復元によって増える `postMessage` が 0 件（操作そのものの既存要求だけ）                                                                                                   | R4.7                                                                    |

### 失敗源インベントリ（include-or-justify）— Feature 061-05 追加分（S74）

| 失敗源                                                   | 対応ケースまたは除外理由                             |
| -------------------------------------------------------- | ---------------------------------------------------- |
| 利用者移動・repo 切替後に奪い返す                        | TC-709、TC-712                                       |
| 再描画・連続応答で復元しない / 古い ticket で上書き      | TC-710、TC-711                                       |
| 読み込み中の退避なし                                     | TC-713                                               |
| 同 repo 読み込みでメニューを閉じる / repo 変更で閉じない | TC-714、TC-715                                       |
| DOM 置換でアクション対象が別行へ                         | TC-716                                               |
| 追加読込・詳細置換・ファイル消失で body へ落ちる         | TC-717〜TC-719                                       |
| 復元のための要求                                         | TC-720                                               |
| ticket の判定条件                                        | excluded(`web/keyboardNavigation-test.md` S4 の責務) |

## S75: ContextMenu / Shift + F10 によるメニュー起動経路と参照ラベルの Enter / Space

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: コミット行 / 作業ツリー行 / 参照 button / stash / worktree ラベル / ファイル行 / 表ヘッダーの `keydown`（`key: "ContextMenu"` または Shift + `F10`）から既存 builder（`buildCommitContextMenuItems` / `buildUncommittedContextMenuItems` / `showRefBadgeContextMenu` / ファイル menu / 並び順 menu）へ `showContextMenu(event: ContextMenuTrigger, items, sourceElem, recentActions?, focusOptions?)` を呼ぶ経路 / キー起動直後の同じ押下由来 `contextmenu` の抑止 / 参照 button の `Enter` / `Space`
> Target Path: `web/main.ts`（各 menu 起点の listener と `showRefBadgeContextMenu()`。実装後に行範囲へ更新）
> Test File: `tests/web/main.keyboard.test.ts`

対応プラン §3.5・R4.4 の main 側。メニュー内部のフォーカス・移動・閉鎖は `web/contextMenu-test.md` S9 / S10 の責務。各起点で、同じ対象をマウスで右クリックした場合の `showContextMenu` の `items`（title 列）と action 実行時の `postMessage` 引数が一致することで builder / context の同一性を確認する。

| Case ID | Input / Precondition                                                                                                                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                     | Notes                                                                                                       |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| TC-721  | `M` の行に実フォーカスして Shift + `F10` keydown、別途 `key: "ContextMenu"` keydown                                                                                           | Normal - コミット行からのキー起動                                          | `#contextMenu` が `active` で、項目 title の並びが `M` の `contextmenu`（マウス）と一致し、位置が行の `getBoundingClientRect()` から既存の画面内 clamp で決まる（`clientX` / `clientY` に依存しない）。最初の操作項目へ実フォーカス | K28 / A8.1-4                                                                                                |
| TC-722  | 作業ツリー行、`M` の参照 button（ローカル主部 / 併記 remote）、stash ラベル、detached worktree ラベル、詳細内のファイル行、表ヘッダーの各要素に実フォーカスして Shift + `F10` | Normal - 各対象の既存 builder へ送る                                       | それぞれマウス右クリック時と同じ title 列のメニューが開き、代表項目の実行で `postMessage` の引数（`repo` / `hash` / `name` / `remote` / `worktreePath` / `filePath`）が一致                                                         | K28 / A8.1-4。stash / worktree の対象解決は `02-context-menu-02.md` S61 と同じ入口                          |
| TC-723  | `#findInput` と dialog の `<input>` に実フォーカスして Shift + `F10`、`ContextMenu`                                                                                           | Validation - 入力欄は標準の編集メニューを維持                              | `showContextMenu` が呼ばれず、`#contextMenu` が非 `active`、keydown が非消費                                                                                                                                                        | R4.4「入力欄は標準の編集メニューを維持する」                                                                |
| TC-724  | `M` の行で Shift + `F10` keydown の直後に同じ押下由来の `contextmenu` イベントを発火。その後、独立したマウス右クリック（`contextmenu`）を `R` の行で発火                      | Validation - 同じ押下の重複だけ抑止                                        | 1 回目のメニューが 1 回だけ開き（`showContextMenu` 1 回）、続く独立した右クリックでは `R` のメニューが開く（抑止が残らない）                                                                                                        | K28 / A8.3-2。「次の独立したマウス右クリックまで抑止しない」                                                |
| TC-725  | 省略一覧の複製に実フォーカスして Shift + `F10`                                                                                                                                | Normal - 一覧からの起動は focusOptions を渡す                              | `showContextMenu` の第 5 引数が `{ tabOrigin: <counter>, onTabExit }` を持ち、`onTabExit` の実行で `closePopup("tab")` 相当（`.refOverflowPopup` 0 個）になる。`items` は行内参照からの起動と同じ                                   | K37。§3.5「省略一覧は `focusOptions` にcounterと `() => closePopup("tab")` を渡し」                         |
| TC-726  | `M` の参照 button に実フォーカスして `Enter`、別途 `Space`。続けて同じ button で `dblclick`                                                                                   | Normal - 参照の Enter / Space はメニュー、checkout は dblclick のまま      | `Enter` / `Space` で参照メニューが開き checkout 要求 0 件、詳細要求 0 件（行詳細を開かない）。`dblclick` では既存の `checkoutBranchAction` 相当の要求 1 件                                                                          | R4.3「参照ラベルのEnter/Spaceはそのラベルの既存コンテキストメニューを開く。チェックアウトを直接実行しない」 |
| TC-727  | TC-721〜TC-722 で開いた各メニューの代表項目を `Enter` で実行し、マウスで同じ項目を `click` した場合と比較                                                                     | Normal - キー起動のメニューも同じ action と recent 記録                    | `postMessage` の引数が一致し、`recordRecentAction` の記録条件・回数が一致                                                                                                                                                           | A8.2-3。R5「最近使った操作の記録条件は保つ」                                                                |

### 失敗源インベントリ（include-or-justify）— Feature 061-05 追加分（S75）

| 失敗源                                    | 対応ケースまたは除外理由                            |
| ----------------------------------------- | --------------------------------------------------- |
| 起点ごとに別の builder / context を作る   | TC-721、TC-722、TC-727                              |
| 入力欄のメニューを奪う                    | TC-723                                              |
| キーと contextmenu の二重表示、抑止の残存 | TC-724                                              |
| 一覧起点で focusOptions を渡さない        | TC-725                                              |
| 参照 Enter で checkout / 行詳細を起こす   | TC-726                                              |
| メニュー内部の移動・閉鎖                  | excluded(`web/contextMenu-test.md` S9 / S10 の責務) |

## S76: 詳細・ファイル・フォルダー操作の標準 button と既存アクション接続

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: `renderCommitDetailsView()` / `showCommitDetails()` の親 hash button・`#commitDetailsClose`・`#fileViewToggle` / `bindFileViewListeners()` のファイル差分 button・`.openFile` button・`.highlightFileHistory` button・folder button の `click` と `keydown` / `handleFileViewToggle()` / `alterGitFileTree` の接続
> Target Path: `web/main.ts`（`renderCommitDetailsView()`、`bindFileViewListeners()`、`handleFileViewToggle()`。実装後に行範囲へ更新）
> Test File: `tests/web/main.keyboard.test.ts`

対応プラン §3.7.2 R4.3 の詳細・ファイル操作を main 側で接続した観点。HTML 構造（sibling button・`hidden`・名前）は `web/fileTree-test.md` S6 の責務。各操作は `button` の `click`（jsdom では `Enter` / `Space` の既定 click が生成されないため `click` で代替し、`keydown` の `Enter` / `Space` で同じ handler が 1 回だけ呼ばれることを別に確認）で既存の要求と同じ引数を送り、子 button の実行が `li` や行の `click` へ伝播して差分 / 詳細の追加要求を出さない。

| Case ID | Input / Precondition                                                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                  | Notes                                                                                                 |
| ------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| TC-728  | `N` の詳細（親 `M`）を開き、親 hash の `button` を `click`、別途 `Enter` keydown                                           | Normal - 親リンク                                                          | `commitHash: "M"` の詳細要求が各 1 件（`span.parentHash` click と同じ引数）、`#commitDetails` が `M` 行の直後へ                                                                                  | K39                                                                                                   |
| TC-729  | 詳細の `#commitDetailsClose` button を `click` / `Enter`                                                                   | Normal - 閉じる                                                            | `#commitDetails` が除去され、`activeElement` が詳細の起点行、要求 0 件                                                                                                                           | K39。復元は R4.7 の起点行                                                                             |
| TC-730  | `#fileViewToggle` button を `click` / `Enter`                                                                              | Normal - 表示切替                                                          | 表示形式が list ↔ tree で切り替わり（`01-rendering-03.md` S62 と同じ DOM）、`activeElement` が新しい toggle button、要求 0 件                                                                    | K39                                                                                                   |
| TC-731  | ファイル行の差分 button を `click` / `Enter`。`li` 自体を `click`                                                          | Normal - ファイル差分は button だけが起動                                  | button では `viewDiff` 要求 1 件で引数（`fromHash` / `toHash` / `oldFilePath` / `newFilePath` / `type`）が既存の `li` click と同じ時系列（`getCommitOrder`）。`li` の click では要求 0 件        | K39 / A8.1-6。「liは非操作ラッパー」                                                                  |
| TC-732  | `.openFile` button と `.highlightFileHistory` button を `click` / `Enter`。親の `li` と行に click リスナーを登録           | Validation - 子 button の伝播停止                                          | `openFile` 要求 / `fileHistory` 要求が各 1 件で引数が既存と同じ。`li` / 行の click リスナー呼出し 0 回、`viewDiff` と `commitDetails` の要求 0 件                                                | K39 / A8.1-6                                                                                          |
| TC-733  | tree 表示でフォルダー button を `click` / `Enter`（閉じる → 開く）                                                         | Normal - フォルダー展開                                                    | `alterGitFileTree` 相当の状態更新で `aria-expanded` が `"false"` → `"true"`、`ul.gitFolderContents` の `hidden` が切り替わり、閉じている間は子 button が `getTabStops()` に含まれない。要求 0 件 | K38 / K39                                                                                             |
| TC-734  | `additions: null` / `deletions: null`（binary）のファイル行で差分 button を `click`、`Enter`。続けて同じ行で Shift + `F10` | Validation - 差分不可は起動せずメニューは残す                              | 差分 button が `disabled` で `viewDiff` 要求 0 件。Shift + `F10` でファイルメニュー（`02-context-menu-01.md` S52 と同じ項目）が開く                                                              | K38。R4.3「差分不可のファイルは差分を起動しないが、そのファイルの利用可能なメニュー・個別操作は残す」 |

### 失敗源インベントリ（include-or-justify）— Feature 061-05 追加分（S76）

| 失敗源                                       | 対応ケースまたは除外理由                   |
| -------------------------------------------- | ------------------------------------------ |
| 親リンク・閉じる・切替の未接続               | TC-728〜TC-730                             |
| 差分が li から起動する、引数の時系列が変わる | TC-731                                     |
| 子 button の伝播で差分 / 詳細を追加要求      | TC-732                                     |
| フォルダーの状態と子停止点                   | TC-733                                     |
| binary で差分起動 / メニュー消失             | TC-734                                     |
| HTML 構造・名前                              | excluded(`web/fileTree-test.md` S6 の責務) |

## S77: 行の名前・状態説明・状態通知

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: `renderTable()` / `renderUncommitedChanges()` の行 `aria-label` と `aria-describedby`（`a11y.operationTarget` / `a11y.detailsOpen` / `a11y.compareBase` / `a11y.compareTarget` / `a11y.head` / `a11y.workingTree` / `a11y.stash`）/ `#commitTable` の `aria-label`（`a11y.commitHistory`）/ `role="status"` `aria-live="polite"` の通知要素への `a11y.commitsLoaded` / `a11y.noCommits` / エラー文言の書込み / `abbrevCommit` / `getCommitDate`
> Target Path: `web/main.ts`（行描画と通知の書込み。実装後に行範囲へ更新）
> Test File: `tests/web/main.keyboard.test.ts`

対応プラン §3.6 末尾・R4.8 の読み上げ。辞書の値は `l10n/web/web.l10n.en.json-test.md` S11 / `web.l10n.ja.json-test.md` S12、CSS は `media/main-test.md` S9 の責務。`globalThis.webviewMessages` に実辞書（en）を設定して文言を確認する。

| Case ID | Input / Precondition                                                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                   | Notes                                                                                                                                                                                                                                                       |
| ------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-735  | 標準 fixture の `M` の行の `aria-label`                                                                           | Normal - 行の名前                                                          | `abbrevCommit("M")`、件名、作者、`getCommitDate(date)` の表示文字列を含み、件名 `<b>x</b>` を渡した場合も文字列として含まれる（`b` 要素が生成されない）                           | K45 / R4.8                                                                                                                                                                                                                                                  |
| TC-736  | `M` を操作対象、`N` の詳細、`N/R` 比較の状態で各行の `aria-describedby` が指す要素の `textContent`                | Normal - 複数状態の同時説明                                                | `M`: 操作対象 + HEAD、`N`: 詳細表示中 + 比較の起点、`R`: 比較対象。`aria-describedby` の ID が document 内で一意で、指す要素が存在する                                            | K45 / R4.8「複数状態を同時に示す」                                                                                                                                                                                                                          |
| TC-737  | 作業ツリー行と stash 行の `aria-label`                                                                            | Normal - 種類の明示                                                        | 作業ツリー行に `a11y.workingTree` の訳、stash 行に `a11y.stash` の訳が含まれる                                                                                                    | R4.8                                                                                                                                                                                                                                                        |
| TC-738  | 全行とテーブルの属性を列挙                                                                                        | Validation - 未実装 grid 操作を宣言しない                                  | `role="grid"` / `role="row"` の宣言と行の `aria-selected` が 0 件、`table` / `tr` のネイティブ構造が維持                                                                          | R4.8                                                                                                                                                                                                                                                        |
| TC-739  | 標準 fixture の受理、`commits = []` の受理、エラー応答（`error` 付き）の受理で `[role="status"]` の `textContent` | Normal - polite な状態通知                                                 | それぞれ `a11y.commitsLoaded` の `{0}` に件数（`3`）、`a11y.noCommits`、エラー文言。要素が `aria-live="polite"` を持ち、`#commitTable` / `#commitGraph` は `aria-live` を持たない | K45。「グラフ全体の再描画をlive領域として読み直させない」                                                                                                                                                                                                   |
| TC-740  | `#commitTable` の属性                                                                                             | Normal - 一覧の名前                                                        | `aria-label` が `a11y.commitHistory` の訳（`Commit history`）                                                                                                                     | Task 9 / Task 11                                                                                                                                                                                                                                            |
| TC-741  | 追加読込 button、`#currentBtn`、toolbar の各 button の名前                                                        | Normal - 操作名                                                            | 追加読込 button に名前があり、`#currentBtn` が `aria-disabled` ではなく標準 `disabled` で無効を表し、toolbar の各 button の名前が host 辞書の既存文言と一致                       | K44 / K47                                                                                                                                                                                                                                                   |
| TC-742  | 行内の装飾 svg（参照アイコン）、測定複製 `.refOverflowMeasure` の属性                                             | Validation - 装飾と測定複製を読み上げから外す                              | svg が `aria-hidden="true"`、測定複製が `aria-hidden="true"` かつ停止点なし                                                                                                       | R4.8。手動: スクリーンリーダー（NVDA / VoiceOver）で `M` の行に移動し、名前・状態（操作対象 / 詳細表示中 / HEAD）・種類が読まれ、英日で辞書どおりの意味になることを VS Code 版・OS・リーダー名 / 版とともに記録。全環境で同一の発話文字列は合格条件にしない |

### 失敗源インベントリ（include-or-justify）— Feature 061-05 追加分（S77）

| 失敗源                           | 対応ケースまたは除外理由                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 名前の欠落・HTML 解釈            | TC-735                                                                                                |
| 状態の片方だけ、ID 重複          | TC-736                                                                                                |
| 種類の欠落                       | TC-737                                                                                                |
| 不適切な role / aria-selected    | TC-738                                                                                                |
| 通知の欠落、グラフ全体の live 化 | TC-739                                                                                                |
| 一覧・button の名前欠落          | TC-740、TC-741                                                                                        |
| 装飾・測定複製の読み上げ         | TC-742                                                                                                |
| 実際の発話                       | excluded(支援技術依存。TC-742 Notes の手動確認で意味と操作可否を確認し、自動テストの pass に含めない) |
