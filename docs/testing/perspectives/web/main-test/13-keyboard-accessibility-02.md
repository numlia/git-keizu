# テスト観点表: web/main.ts

> Source: `web/main.ts`
> Generated: 2026-10-07T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: keyboard-accessibility

`13-keyboard-accessibility-01.md` の続き（同じ共通 fixture・用語・計画 ID 対応表を参照）。本 shard は Tab 順と一覧内の往復、再描画・応答後の復元とメニュー維持、メニュー起動経路、詳細・ファイル操作の既存アクション接続、行の名前・状態説明・通知、blur した Webview へフォーカスを取り戻さない契約、キー起動メニューの keyup 由来 `contextmenu` と merge ダイアログの起点復元、ファイル行全体をマウスの差分起動領域として戻す契約を持つ。

## S73: Tab 順序・一覧内の往復・停止点の構成

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: `FocusContext.getTabStops(): readonly HTMLElement[]` の main 実装 / 一覧内の Tab 境界処理（操作対象行 → 表示参照・counter → 詳細操作の往復で `moveFocusPast` を使う）/ 列ヘッダーの並び順メニュー button
> Target Path: `web/main.ts:287-320, 1657-1680, 2166-2213`（`consumeKey` / `isDisplayed` / `isTabStop` / `collectTabStops` / `activeContainer`、`bindCommitOrderingButton` / `buildCommitOrderingButtonHtml`、`getRowLabelStops` / `getTabStops` / `handleListTab`）
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

### Task 12 テスト対応（Feature 061-05）— S73

- テスト: `tests/web/main.keyboard.test.ts` describe `Tab boundary between the target row's labels and the details (S73)`（TC-702 / TC-703 / TC-704 / TC-707）、describe `tab stop order across the toolbar, bars, panel, list, details and find (S73)`（Task 12 追加: TC-700 / TC-701 / TC-705）、describe `toolbar state, load more button, status notice and ordering button`（TC-706 `opens the ordering menu from the header button with Enter, Space and click`、TC-708 `places the load more button and the find controls after the list`）
- TC-700 の観測方法: `getTabStops()` は private のため、公開 API `moveFocusPast(captureFocusOrigin(activeElement), 1)` を先頭の repo 起動 button から `false` になるまで繰り返し、到達した要素列（`walkTabStops()`）の所属グループ順を比較する。検索を開くとファイル履歴が終了する既存契約（`10-file-history-01.md` TC-324）があるため、履歴バーありの巡回と検索ありの巡回の 2 回に分けて全順序を確認した。全停止点が `isConnected`・非 `hidden`・非 `aria-hidden`・非 `:disabled` で重複なし
- TC-707 残課題（手動）: 詳細が操作対象行より上にある場合、詳細最後の Tab と行の Shift+Tab はネイティブ順で一覧へ再入場し得る（Task 3 handoff）。自動テストは非消費だけを確認し、実 Tab 順は `13-keyboard-accessibility-01.md` 冒頭の手動一覧に残す
- 実行結果（2026-10-07）: 9 件 pass

## S74: 再描画・応答後のフォーカス復元とメニュー対象の維持

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: `renderTable()` / `renderUncommitedChanges()` / 詳細の挿入・置換（`renderCommitDetailsView()` / `showCommitDetails()`）/ 追加読込 / `renderShowLoading()` での `beginFocusUpdate(root)` → `finishFocusUpdate(update)` の接続 / repo 変更入口での ticket 失効と `hideContextMenu("repository")` / 同 repo の `renderShowLoading()` でメニューを閉じない変更
> Target Path: `web/main.ts:1113-1120, 1198-1222, 1524-1533, 2031-2051, 2367-2399, 2419-2498`（`renderTable()` の ticket、追加読込 button の click、`renderShowLoading()`、`leaveRepository` / `beginListFocusUpdate` / `finishListFocusUpdate`、`renderCommitDetailsView()`、`hideCommitDetails()` / `showCommitDetails()`）
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

### Task 12 テスト対応（Feature 061-05）— S74

- テスト: `tests/web/main.keyboard.test.ts` describe `focus restore after re-render and the kept menu context (S74)`。TC-709〜TC-716、TC-719 を同番号の `it` で（TC-710 は行・参照ラベル・詳細内ファイル button の 3 変種、TC-709 / TC-719 は describe `toolbar state, …` / `details, file and folder controls … (S76)` にも変種）。TC-718 は S76 describe の `restores the details' origin row after the switch started from the parent link (TC-718)`
- Task 12 追加: TC-717 `replaces the load more button on Enter and keeps focus on a connected element (TC-717)`、TC-720 `adds no request of its own across loading, re-render and details restores (TC-720)`（参照ラベル focus → Ctrl+R → 応答 → 強制再描画 2 回 → 詳細のファイル消失まで通し、`postMessage` の command 列が操作由来の `loadBranches` / `loadCommits` / `commitDetails` だけであることを確認）
- TC-714 の解釈（Task 3 handoff）: 同 repo の読み込み表示と **変更なし** の応答ではメニューが残り、開いた時点の `hash` で action が走る。**変更あり** の応答では `requestLoadBranchesAndCommits` の既存 callback がメニューを閉じる（`05-state-response-02.md` S67 TC-626 が active のまま）。TC-714 の test は変更なし応答で確認し、変更あり応答の閉鎖は TC-626 の test が担う
- TC-717 の解釈: 追加読込 button は click 時に loading header へ **置換** される（Task 9「処理開始時の無効化/置換」）ため、`disabled` ではなく置換（`isConnected === false`）を観測する。置換時点で button の ticket が解決し focus は操作対象行へ移り、応答後も行に留まる（Expected の「残る追加読込 button」は、置換前に ticket が解決する現実装では復元先にならない。R4.7 の復元列「同操作 → 操作対象行」の後段で、`body` へ落ちない要件は満たす。レビュー論点として記録）。Enter 自体は native button の既定 click に委ね（`defaultPrevented === false`）、jsdom では `click()` で代替
- 実行結果（2026-10-07）: 14 件 pass

## S75: ContextMenu / Shift + F10 によるメニュー起動経路と参照ラベルの Enter / Space

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: コミット行 / 作業ツリー行 / 参照 button / stash / worktree ラベル / ファイル行 / 表ヘッダーの `keydown`（`key: "ContextMenu"` または Shift + `F10`）から既存 builder（`buildCommitContextMenuItems` / `buildUncommittedContextMenuItems` / `showRefBadgeContextMenu` / ファイル menu / 並び順 menu）へ `showContextMenu(event: ContextMenuTrigger, items, sourceElem, recentActions?, focusOptions?)` を呼ぶ経路 / キー起動直後の同じ押下由来 `contextmenu` の抑止 / 参照 button の `Enter` / `Space`
> Target Path: `web/main.ts:322-330, 1270-1352, 1353-1511, 1640-1702, 2715-2752, 2838-2848`（`consumeContextMenuLaunch`、行・作業ツリー行・`gitRef` の keydown、`showCommitRowContextMenu` 〜 `showStashBadgeContextMenu`、列ヘッダーと並び順 button、ファイル行の keydown と `handleFileRowActivationKey`）
> Test File: `tests/web/main.keyboard.test.ts`

対応プラン §3.5・R4.4 の main 側。メニュー内部のフォーカス・移動・閉鎖は `web/contextMenu-test.md` S9 / S10 の責務。各起点で、同じ対象をマウスで右クリックした場合の `showContextMenu` の `items`（title 列）と action 実行時の `postMessage` 引数が一致することで builder / context の同一性を確認する。

| Case ID | Input / Precondition                                                                                                                                                                                                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                    | Notes                                                                                                                                                                        |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-721  | `M` の行に実フォーカスして Shift + `F10` keydown、別途 `key: "ContextMenu"` keydown                                                                                                                                                                                     | Normal - コミット行からのキー起動                                          | `#contextMenu` が `active` で、項目 title の並びが `M` の `contextmenu`（マウス）と一致し、位置が行の `getBoundingClientRect()` から既存の画面内 clamp で決まる（`clientX` / `clientY` に依存しない）。最初の操作項目へ実フォーカス                                | K28 / A8.1-4                                                                                                                                                                 |
| TC-722  | 作業ツリー行、`M` の参照 button（ローカル主部 / 併記 remote）、stash ラベル、detached worktree ラベル、詳細内のファイル行、表ヘッダーの各要素に実フォーカスして Shift + `F10`                                                                                           | Normal - 各対象の既存 builder へ送る                                       | それぞれマウス右クリック時と同じ title 列のメニューが開き、代表項目の実行で `postMessage` の引数（`repo` / `hash` / `name` / `remote` / `worktreePath` / `filePath`）が一致                                                                                        | K28 / A8.1-4。stash / worktree の対象解決は `02-context-menu-02.md` S61 と同じ入口                                                                                           |
| TC-723  | `#findInput` と dialog の `<input>` に実フォーカスして Shift + `F10`、`ContextMenu`                                                                                                                                                                                     | Validation - 入力欄は標準の編集メニューを維持                              | `showContextMenu` が呼ばれず、`#contextMenu` が非 `active`、keydown が非消費                                                                                                                                                                                       | R4.4「入力欄は標準の編集メニューを維持する」                                                                                                                                 |
| TC-724  | `M` の行で Shift + `F10` keydown の直後に同じ押下由来の `contextmenu` イベントを発火。その後、独立したマウス右クリック（`contextmenu`）を `R` の行で発火。別試行で `ContextMenu` の keydown → keyup の後に同じ押下由来の `contextmenu`、続けて `R` の独立した右クリック | Validation - 同じ押下の重複だけ抑止                                        | 1 回目のメニューが 1 回だけ開き（`showContextMenu` 1 回）、続く独立した右クリックでは `R` のメニューが開く（抑止が残らない）。keyup 後の順でも 1 回だけ開き（項目 DOM が同一、フォーカス中の `li` 不変、`defaultPrevented === true`）、続く `R` の右クリックは開く | K28 / A8.3-2。「次の独立したマウス右クリックまで抑止しない」。レビュー修正 round 1（2026-10-07）: 起動キーの keyup は抑止を解除しない（`web/contextMenu-test.md` S9 TC-124） |
| TC-725  | 省略一覧の複製に実フォーカスして Shift + `F10`                                                                                                                                                                                                                          | Normal - 一覧からの起動は focusOptions を渡す                              | `showContextMenu` の第 5 引数が `{ tabOrigin: <counter>, onTabExit }` を持ち、`onTabExit` の実行で `closePopup("tab")` 相当（`.refOverflowPopup` 0 個）になる。`items` は行内参照からの起動と同じ                                                                  | K37。§3.5「省略一覧は `focusOptions` にcounterと `() => closePopup("tab")` を渡し」                                                                                          |
| TC-726  | `M` の参照 button に実フォーカスして `Enter`、別途 `Space`。続けて同じ button で `dblclick`                                                                                                                                                                             | Normal - 参照の Enter / Space はメニュー、checkout は dblclick のまま      | `Enter` / `Space` で参照メニューが開き checkout 要求 0 件、詳細要求 0 件（行詳細を開かない）。`dblclick` では既存の `checkoutBranchAction` 相当の要求 1 件                                                                                                         | R4.3「参照ラベルのEnter/Spaceはそのラベルの既存コンテキストメニューを開く。チェックアウトを直接実行しない」                                                                  |
| TC-727  | TC-721〜TC-722 で開いた各メニューの代表項目を `Enter` で実行し、マウスで同じ項目を `click` した場合と比較                                                                                                                                                               | Normal - キー起動のメニューも同じ action と recent 記録                    | `postMessage` の引数が一致し、`recordRecentAction` の記録条件・回数が一致。`Enter` 実行後の `activeElement` が起点（ファイル行の差分 button / `M` の行）                                                                                                           | A8.2-3。R5「最近使った操作の記録条件は保つ」。レビュー修正 round 1（2026-10-07）: 完了後の復帰は `web/contextMenu-test.md` S11                                               |

### 失敗源インベントリ（include-or-justify）— Feature 061-05 追加分（S75）

| 失敗源                                    | 対応ケースまたは除外理由                            |
| ----------------------------------------- | --------------------------------------------------- |
| 起点ごとに別の builder / context を作る   | TC-721、TC-722、TC-727                              |
| 入力欄のメニューを奪う                    | TC-723                                              |
| キーと contextmenu の二重表示、抑止の残存 | TC-724                                              |
| 一覧起点で focusOptions を渡さない        | TC-725                                              |
| 参照 Enter で checkout / 行詳細を起こす   | TC-726                                              |
| メニュー内部の移動・閉鎖                  | excluded(`web/contextMenu-test.md` S9 / S10 の責務) |

### Task 12 テスト対応（Feature 061-05）— S75

- テスト: `tests/web/main.keyboard.test.ts` describe `ref label Enter / Space open the menu while dblclick keeps the checkout (S75)`。TC-726 は 2 `it`（Enter / Space / dblclick と repeat / keyup）。Task 12 追加: TC-721 `opens the row menu from Shift+F10 and ContextMenu at the row's rectangle (TC-721)`（行の `getBoundingClientRect` を stub し、同じ anchor 点で発火したマウス menu と `style.left` / `style.top`・title 列が一致、最初の項目へ実フォーカス）、TC-722 `sends every launch point to the builder its mouse right-click uses (TC-722)`（作業ツリー行 / ローカル主部 / 併記 remote / stash / detached worktree / 詳細内ファイル行 / 列ヘッダーの 7 起点で title 列が一致し、代表項目 `copyToClipboard`（`feature` / `origin/feature` / `stash@{0}` / `/tmp/wt8`）と `openFile`（`repo` / `commitHash` / `filePath`）の payload がマウス経由と `toEqual`）、TC-723 `leaves Shift+F10 and ContextMenu to the find input and to dialog inputs (TC-723)`、TC-724 `swallows only the contextmenu of the same press and keeps later right-clicks (TC-724)`（keydown → 同じ押下の `contextmenu` → keyup → 別行の独立した右クリック）、TC-727 `runs the same action and recent record from Enter as from a click (TC-727)`（`Open File` の `saveRepoState` + `openFile`、行の `Copy Commit Hash` で Enter と click の `postMessage` 列が一致）
- レビュー修正 round 1（2026-10-07）: TC-724 の `it` に `ContextMenu` keydown → keyup → 同じ押下の `contextmenu` → `R` の独立した右クリックを追加（RED: 旧実装で `R` ではなく `M` のメニューが再生成 → GREEN）。TC-727 の `it` に `Enter` 実行後の `activeElement` assert を追加（RED → GREEN）。TC-722 の `it` はマウス右クリックを実際の順どおり `pointerdown` → `contextmenu` で発火する（keyup が抑止を解除しなくなったため、押下なしの `contextmenu` 単独は同一対象で抑止される）
- TC-725 は `tests/web/main.refOverflow.test.ts` describe `… (S57)` 直後の `passes the list's focus options on a keyboard launch from a clone (TC-725)`（省略一覧の layout fixture と `showContextMenu` spy を持つファイルに置く。`// Case: TC-725` で本表を参照）
- TC-722 の表示元: `showContextMenu` の第 3 引数は起動した操作 `button`（行内 `.gitRefButton` / `.gitRefHeadRemote`、複製の同 button、ファイル行の子 button）であり、builder へは従来どおり `.gitRef` badge / `li.gitFile` を渡す。旧 S55 / S57 / S61 の「第 3 引数が badge / ラベル要素」の契約は S78 で置き換えた
- 実行結果（2026-10-07）: 7 件 pass（本 shard 分）＋ TC-725 pass

## S76: 詳細・ファイル・フォルダー操作の標準 button と既存アクション接続

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: superseded
> Superseded By: S82
> Supersedes: -
> Signature: `renderCommitDetailsView()` / `showCommitDetails()` の親 hash button・`#commitDetailsClose`・`#fileViewToggle` / `bindFileViewListeners()` のファイル差分 button・`.openFile` button・`.highlightFileHistory` button・folder button の `click` と `keydown` / `handleFileViewToggle()` / `alterGitFileTree` の接続
> Target Path: `web/main.ts:2367-2399, 2499-2504, 2640-2848`（`renderCommitDetailsView()`、`bindDetailsClose`、`bindParentHashListeners` / `handleFileViewToggle` / `bindFileViewListeners` / `markFileViewTargets` / `toggleFolder` / `sendViewDiffAction` / `handleFileRowActivationKey`）
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

### Task 12 テスト対応（Feature 061-05）— S76

- テスト: `tests/web/main.keyboard.test.ts` describe `details, file and folder controls as standard buttons (S76)`。TC-728〜TC-734 を同番号の `it` で（TC-731 は通常 / 比較の 2 変種、TC-734 は binary の差分 button と有効 button なし行の 2 変種）
- jsdom の代替（Task 8 handoff）: 各 button の Enter keydown は native click に委ねるため `defaultPrevented === false` を確認し、実行は `click` で代替する（実機の Enter → click 1 回は `13-keyboard-accessibility-01.md` 冒頭の手動一覧）。TC-730 の「要求 0 件」は Git / 詳細要求 0 件の意味で、表示形式の保存 `saveRepoState` 1 件は `01-rendering-03.md` S62 TC-548 の契約として許容。TC-733 の「閉じている間は子 button が `getTabStops()` に含まれない」は `ul.gitFolderContents[hidden]` 祖先による除外（`isTabStop` の `[hidden]` 判定）で確認
- 実行結果（2026-10-07）: 13 件 pass
- 本節は S82 に置き換えた（TC-731 の「`li` の click では要求 0 件」だけが契約変更。他の Case は S82 へ引き継ぎ、test method の対応は S82 の「利用者フォローアップ テスト対応」を参照）

## S77: 行の名前・状態説明・状態通知

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: superseded
> Superseded By: S79
> Supersedes: -
> Signature: `renderTable()` / `renderUncommitedChanges()` の行 `aria-label` と `aria-describedby`（`a11y.operationTarget` / `a11y.detailsOpen` / `a11y.compareBase` / `a11y.compareTarget` / `a11y.head` / `a11y.workingTree` / `a11y.stash`）/ `#commitTable` の `aria-label`（`a11y.commitHistory`）/ `role="status"` `aria-live="polite"` の通知要素への `a11y.commitsLoaded` / `a11y.noCommits` / エラー文言の書込み / `abbrevCommit` / `getCommitDate`
> Target Path: `web/main.ts:134-149, 848-856, 1160-1200, 1851-1855, 2110-2132`（`buildRowName` / `buildRowStateHtml`、`loadCommits()` の `announceStatus` 呼出し、`renderTable()` の行属性、`announceStatus`、`refreshRowStates`）
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

### Task 12 テスト対応（Feature 061-05）— S77

- 本節は S79 に置き換えた（TC-739 のエラー部分だけが契約変更。他の Case は S79 へ引き継ぎ、test method の対応は S79 の「Task 12 テスト対応」を参照）

## S78: 参照・stash・worktree メニューの表示元は起動した操作 button、複製再生成でメニューを維持

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: S55, S57, S61
> Signature: `showRefBadgeContextMenu(event: ContextMenuTrigger, badge: HTMLElement, focusOptions?: ContextMenuFocusOptions): void` / `showStashBadgeContextMenu(event, badge, source, focusOptions?)` / `resolveRefSource(event, badge): HTMLElement` / `RefOverflowOptions.onRefContextMenu(event, ref, focusOptions?)` と `renderPopupItems()`（`hideContextMenu()` を呼ばない）
> Target Path: `web/main.ts:157-172, 1313-1329, 1408-1511`（`resolveRefType` / `resolveRefSource`、`gitRef` の contextmenu / keydown、`showRefBadgeContextMenu` 〜 `showStashBadgeContextMenu`）、`web/refOverflow.ts:728-759`（`renderPopupItems` / `clonePopupItem` / `forwardRefMenu`）
> Test File: `tests/web/main.refOverflow.test.ts`（S55 / S57 / S61 由来の Case）、`tests/web/main.test.ts`（S55 TC-412 / TC-423）、`tests/web/main.keyboard.test.ts`（TC-722）

Task 7（参照ラベルの `button` 化）と R4.7 により、S55（`01-rendering-02.md`）・S57（`02-context-menu-01.md`）・S61（`02-context-menu-02.md`）の 3 点が置き換わる: (1) S55 TC-412 / TC-423 と S57 TC-445 / TC-449 / TC-453 の「`showContextMenu` の第 3 引数が `.detachedWorktree` / バッジ / 複製要素 / ラベル」は、起動した **操作 `button`**（`.gitRef > button.gitRefButton`、併記 remote は `button.gitRefHeadRemote`、複製も同じ button）になる。builder（`buildRefContextMenuItems` / `buildDetachedWorktreeContextMenuItems` / `buildStashContextMenuItems`）へ渡す引数は従来どおり `.gitRef` badge / 元の `.commit` 行で変わらない。(2) S61 TC-531 の「複製再生成でメニュー消去（`hideContextMenu` 1 回）」は、複製 DOM の更新だけを理由に開いているメニューを閉じない契約（`web/refOverflow-test.md` S6 TC-102 と同じ）へ変わる。上記 6 件以外の S55 / S57 / S61 の Case（S55 TC-394〜TC-411・TC-413〜TC-422・TC-424〜TC-426、S57 TC-446〜TC-448・TC-450〜TC-452・TC-454〜TC-456、S61 TC-494〜TC-530・TC-532〜TC-545）は期待結果を変えずに本節へ引き継ぎ、テストは同じ Case ID のまま各 test file に残る。

| Case ID | Input / Precondition                                                                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                 | Notes                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| TC-743  | S57 TC-445 / TC-449 と S55 TC-412 / TC-423 の各状態（行内の worktree 付き branch、その複製、detached ラベル本体とその icon）で contextmenu | Normal - 表示元は起動した操作 button                                       | builder の引数は旧 Case と同じ（`(TEST_REPO, "feature/x", バッジ, false, gitBranchHead, ["origin"], { path, isMainWorktree })` / `(TEST_REPO, "/tmp/wt8")`）で、`showContextMenu` の第 3 引数が当該 badge 内の `button.gitRefButton`（複製では複製内の同 button）。第 2 引数は builder の戻り値と `toBe` で同一 | S55 TC-412 / TC-423、S57 TC-445 / TC-449 の置き換え。`contextMenuActive` もその button に付く      |
| TC-744  | S57 TC-453 / S61 の各状態で stash ラベル（行内・複製、icon / `span.findMatch` / 本体）を contextmenu                                       | Normal - stash の表示元                                                    | `buildStashContextMenuItems` が行内・一覧で各 1 回、同じ `(TEST_REPO, hash, selector, 元の .commit 行)`。`showContextMenu` の第 3 引数が各ラベル内の `button.gitRefButton`。参照 builder は 0 回                                                                                                                | S57 TC-453 の置き換え。S61 の対象解決（icon / 検索マーク / 本体）は引き継ぎ                        |
| TC-745  | 一覧の複製からメニューを開いた後、実 FindWidget の検索更新（`SEARCH_DEBOUNCE_MS` 待機）で複製を再生成                                      | Normal - 複製再生成でメニューを維持                                        | 古い複製は `isConnected === false`、`#contextMenu` は `active` のまま（`hideContextMenu` 0 回）、一覧は同じ要素で開いたまま新しい複製（`data-stash-hash` が同じ）を持ち、`postMessage` 0 件                                                                                                                     | S61 TC-531 の置き換え（R4.7 / `web/refOverflow-test.md` S6 TC-102）。製品へ固定 delay を追加しない |

### 失敗源インベントリ（include-or-justify）— Feature 061-05 追加分（S78）

| 失敗源                                                   | 対応ケースまたは除外理由                                                               |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 表示元が badge のままで focus 復元先が button にならない | TC-743、TC-744                                                                         |
| builder 引数が button 化で変わる                         | TC-743、TC-744（旧 Case と同じ引数）                                                   |
| 複製再生成でメニューが閉じる / 旧複製が残る              | TC-745                                                                                 |
| 対象解決（icon / 検索マーク / 本体 / 特殊文字）          | 引き継いだ S55 / S57 / S61 の Case（期待結果不変）                                     |
| 外部依存・例外                                           | excluded(builder と `showContextMenu` の引数観測だけで外部依存と throw 経路を持たない) |

### Task 12 テスト対応（Feature 061-05）— S78

- TC-743: `tests/web/main.refOverflow.test.ts` `passes the existing arguments for an in-row worktree branch (TC-445)` / `passes the in-row arguments for the listed worktree branch (TC-449)`、`tests/web/main.test.ts` `shows the detached worktree menu on a detached label (TC-412)` / `resolves a contextmenu on the label icon to the detached label (TC-423)`（各 test は第 3 引数を `menuSourceOf(badge)` / `label.querySelector("button.gitRefButton")` で assert。`// Case:` は旧 ID のまま本節を参照）
- TC-744: `tests/web/main.refOverflow.test.ts` `opens the stash menu from the stash badge in the row and in the list (TC-453)` と S61 由来の describe `stash label lifecycle and clicks (S61)` の各 `it`（`expectStashMenuFrom` が表示元 button を assert）
- TC-745: `tests/web/main.refOverflow.test.ts` `keeps the list menu when a find update regenerates the clones (TC-531)`（`// Case: TC-531` の注記で本節への置き換えを明記）
- 実行結果（2026-10-07）: `tests/web/main.refOverflow.test.ts` 185 件・`tests/web/main.test.ts` 全件 pass

## S79: 行の名前・状態説明・状態通知（読み込み完了 / 空結果は status、エラーは既存ダイアログ）

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: S77
> Signature: `announceStatus(text: string)` と `loadCommits()` の `a11y.commitsLoaded` / `a11y.noCommits` の書込み / `showErrorDialog(message, reason, sourceElem, explanation?)`（`web/dialogs.ts`、`role="dialog"` `aria-modal="true"` `aria-labelledby`）/ S77 と同じ行の `aria-label` / `aria-describedby` / `#commitTable` の名前
> Target Path: `web/main.ts:134-149, 848-856, 1160-1200, 1851-1855, 2110-2132`、`web/dialogs.ts:270-294`
> Test File: `tests/web/main.keyboard.test.ts`

S77 TC-739 は「エラー応答（`error` 付き）の受理で `[role="status"]` にエラー文言」を期待したが、一覧読み込み（`ResponseLoadCommits` / `ResponseLoadBranches`）はホスト protocol に `error` フィールドを持たず（§7 により protocol は変更しない）、操作応答のエラーは既存契約 R5 どおり `showErrorDialog`（`aria-modal` の dialog。初期フォーカスが閉じる button へ移り、名前が質問文を指す: `web/dialogs-test.md` S9 TC-049 / TC-055）で通知される。本節は TC-739 を「読み込み完了 / 空結果は polite な status、エラーは dialog（status 不変）」へ置き換え、S77 の TC-735〜TC-738・TC-740〜TC-742 は期待結果を変えずに引き継ぐ（テストは同じ Case ID のまま `tests/web/main.keyboard.test.ts` describe `row names, state descriptions and decorative icons (S77)` に残る）。レビュー論点: エラー文言を status へも書く（`showErrorDialog` から `announceStatus` を呼ぶ）案は製品変更のため本 Task では行わない。

| Case ID | Input / Precondition                                                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                                                                                                                     | Notes                                                                                    |
| ------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| TC-746  | 標準 fixture の受理、`commits = []` の受理、続けて操作応答のエラー（`addTag` の `status` が失敗文字列）を受理する | Normal - polite な状態通知と dialog の分担                                 | 受理で `[role="status"]` の `textContent` が `a11y.commitsLoaded` の `{0}` に件数（`3`）、空で `a11y.noCommits`。エラーでは `#dialog` が `active`・`role="dialog"`・`aria-modal="true"` で `textContent` に `error.addTag` の訳と失敗文字列を含み、閉じる button に実フォーカス、`[role="status"]` の `textContent` は直前の値のまま。要素は `aria-live="polite"` を持ち、`#commitTable` / `#commitGraph` は `aria-live` を持たない | S77 TC-739 の置き換え（K45）。「グラフ全体の再描画をlive領域として読み直させない」は維持 |

### 失敗源インベントリ（include-or-justify）— Feature 061-05 追加分（S79）

| 失敗源                                                    | 対応ケースまたは除外理由                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 通知の欠落、グラフ全体の live 化                          | TC-746                                                                                      |
| エラーが status と dialog の両方に出る / どちらにも出ない | TC-746                                                                                      |
| 名前・状態・種類・role・装飾                              | 引き継いだ S77 TC-735〜TC-738、TC-740〜TC-742（期待結果不変）                               |
| 一覧読み込みのエラー応答                                  | excluded(ホスト protocol に `error` が無く §7 で protocol を変更しない)                     |
| 実際の発話                                                | excluded(支援技術依存。TC-742 の手動確認。`13-keyboard-accessibility-01.md` 冒頭の手動一覧) |

### Task 12 テスト対応（Feature 061-05）— S79

- TC-746: `tests/web/main.keyboard.test.ts` describe `toolbar state, load more button, status notice and ordering button` の `writes the loaded count and the empty result to the polite status notice (TC-739)`（読み込み完了 / 空結果）と `keeps the status notice unchanged while an error dialog announces a failure (TC-746)`（Task 12 追加。`addTag` 応答の失敗 `status` を受理し、`#dialog` の属性・フォーカスと status の不変を確認）
- 引き継ぎ: TC-735 `names a row by short hash, subject, author and date without interpreting HTML (TC-735)` / TC-736 `describes the target, details, compare base, compare target and HEAD together (TC-736)` / TC-737 `states the working tree and stash kinds in the row name (TC-737)` / TC-738 `keeps the native table structure without grid roles or aria-selected (TC-738)` / TC-740・TC-742 `names the list and hides the decorative ref icons from the accessibility tree (TC-740 / TC-742)` / TC-741 `uses the standard disabled state on the current button (TC-741)`。TC-742 の測定複製 `.refOverflowMeasure`（`aria-hidden="true"`・停止点なし）は `web/refOverflow-test.md` S6 TC-104 の test が assert
- 実行結果（2026-10-07）: 全件 pass

## S80: blur した Webview へ応答・repo 変更でフォーカスを取り戻さない

> Origin: Feature 061-05 (light-spec-plan) review fix
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: `finishListFocusUpdate(update: FocusUpdate | null): void`（`finishFocusUpdate` が `false` を返し `activeElement` が `null` / `body` で、かつ `document.hasFocus()` が `true` のときだけ `#commitTable` へ退避）
> Target Path: `web/main.ts:2040-2050`（`finishListFocusUpdate`）
> Test File: `tests/web/main.keyboard.test.ts`

A8.2-4「フォーカスが別の部品・VS Code側へ移った後に、更新応答で取り戻さない」の main 側。`finishFocusUpdate`（`web/keyboardNavigation-test.md` S4 TC-044 / TC-047）は repo 変更・window blur・利用者移動・古い世代で `false` を返すが、旧実装の `#commitTable` への退避は `activeElement` が `body` なら無条件に実行され、blur 後の応答で Webview がフォーカスを奪い返していた。退避は Webview がフォーカスを保つ場合（`document.hasFocus()`）に限り、S74 TC-713（同 repo の読み込み表示）は `finishFocusUpdate` 内の退避で従来どおり。jsdom の `document.hasFocus()` はフォーカス要素の有無で決まるため、テストでは window の `blur` / `focus` イベントと `hasFocus` の stub を併用して実ブラウザーの状態を再現する。

| Case ID | Input / Precondition                                                                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                           | Notes                                                                        |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| TC-747  | `M` に実フォーカス → window `blur`（`document.hasFocus()` が `false`）→ 同 repo の `loadCommits`（`hard: true`）応答                | Validation - blur 後の応答で取り戻さない                                   | 旧 `M` は `isConnected === false`、`activeElement` が `body`（`#commitTable` でも行でもない）、`HTMLElement.prototype.focus` の呼出し 0 回、`M` だけ `tabindex="0"`、`postMessage` 増分 0 | A8.2-4。レビュー指摘 F2                                                      |
| TC-748  | TC-747 の blur の後に window `focus`（`hasFocus()` が `true`）→ 同じ応答                                                            | Normal - 再フォーカス後は復元                                              | `activeElement` が新しい `M` の行、`postMessage` 増分 0                                                                                                                                   | K22 / A8.1-7 の対照（TC-710 と同じ復元）                                     |
| TC-749  | `M` に実フォーカスし Webview がフォーカスを保つ状態（`hasFocus()` が `true`）で別 repo へ `selectRepo` → 別 repo の応答（HEAD `R`） | Normal - repo 変更の読み込み表示では退避を維持                             | 読み込み表示中は `activeElement` が `#commitTable`、応答後は操作対象行 `R`（HEAD）で `R` だけ `tabindex="0"`                                                                              | R4.7「名前付き一覧コンテナーに一時退避」。S74 TC-712（`M` へ移らない）と両立 |
| TC-750  | `M` に実フォーカス → window `blur` → 別 repo へ `selectRepo` → 別 repo の応答                                                       | Validation - blur 後は repo 変更でも退避しない                             | 読み込み表示中・応答後とも `activeElement` が `body`、`focus` の呼出し 0 回、`R` だけ `tabindex="0"`                                                                                      | A8.2-4                                                                       |

### 失敗源インベントリ（include-or-justify）— Feature 061-05 review fix（S80）

| 失敗源                                                       | 対応ケースまたは除外理由                                                                              |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| blur 後の応答・repo 変更で `#commitTable` へ奪い返す         | TC-747、TC-750                                                                                        |
| 退避の過剰抑止（フォーカス中の repo 変更で `body` に落ちる） | TC-749                                                                                                |
| 再フォーカス後に復元しない                                   | TC-748                                                                                                |
| 同 repo 読み込み表示の退避                                   | excluded(S74 TC-713 が `finishFocusUpdate` 内の退避で担う)                                            |
| 実ブラウザーの `document.hasFocus()`                         | excluded(jsdom では stub。VS Code 側へ移った後の応答で Webview が focus を取り戻さないことは手動確認) |

### レビュー修正 round 1 テスト対応（Feature 061-05）— S80

- テスト: `tests/web/main.keyboard.test.ts` describe `no focus pulled back into a blurred webview (S80)`。TC-747 `leaves focus on body when a response replaces the rows after the webview blurred` / TC-748 `restores the row again once the webview has focus back` / TC-749 `parks on the list container across a repository change while the webview has focus` / TC-750 `does not park on the list container after the webview blurred`。`blurWebview()` が `document.hasFocus` を `false` に stub して window `blur` を発火し、`refocusWebview()` / `afterEach` の window `focus` で `web/keyboardNavigation.ts` の blur 状態を戻す
- RED: 旧実装（`document.hasFocus()` 条件なし）で TC-747 / TC-750 が fail（`activeElement` が `#commitTable`）→ GREEN。TC-709〜TC-713 は変更なしで pass
- 実行結果（2026-10-07）: 4 件 pass

## S81: キー起動メニューの keyup 由来 contextmenu（main 経路）と merge ダイアログの起点復元

> Origin: Feature 061-05 (light-spec-plan) review fix
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: 行の `keydown`（`key: "ContextMenu"`）→ `showCommitRowContextMenu` → `showContextMenu(KeyboardEvent, ...)` の後の keyup / `contextmenu`（`web/contextMenu.ts` S12 の抑止と document 登録の `hideContextMenuListener` の組み合わせ）/ `buildCommitContextMenuItems(..., sourceElem)` → `buildMergeMenuItem(..., sourceElem)` → `showFormDialog(..., sourceElem)` → `hideDialog("keyboard")`
> Target Path: `web/main.ts:1269-1300, 2925`（行の `contextmenu` / keydown 起動と document の `hideContextMenuListener`）、`web/commitMenu.ts:302-312`、`web/mergeDialog.ts:17-23, 63-65`
> Test File: `tests/web/main.keyboard.test.ts`

レビュー指摘 round 2 の main 側統合。S75 TC-724 は keyup 後の `contextmenu` を起点行へ発火していたが、実ブラウザー（Windows の VK_APPS）の対象はその時点でフォーカスしている最初の `li` であり、旧実装では document の `hideContextMenuListener` が開いたばかりのメニューを閉じていた（`web/contextMenu-test.md` S12）。merge ダイアログは `sourceElem = null` で開かれていたため、閉鎖後の復元先が無く `body` に落ちていた（`web/dialogs-test.md` S10）。本節は実 main の起動経路と実 `showFormDialog` で両方を観測する。

| Case ID | Input / Precondition                                                                                                                                                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type)   | Expected Result                                                                                                                                                                                                                     | Notes                                                                                        |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| TC-751  | `M` の行に実フォーカスして `ContextMenu` keydown（メニューが開き最初の `li` へフォーカス）→ その `li` へ `ContextMenu` keyup → 同じ `li` を対象に `contextmenu`。続けて `R` の行を `pointerdown` → `contextmenu` | Validation - `li` 対象の keyup 由来 contextmenu を抑止し独立右クリックは通す | keyup と `contextmenu` が `defaultPrevented === true`、`#contextMenu` が `active` のまま、子要素の並びが同一、`activeElement` がその `li` のまま。`R` の右クリックは非抑止で `R` のメニューが開く（Copy Commit Hash → `data: "R"`） | R4.4 / A8.1-4。S75 TC-724（起点行対象）の補完。`web/contextMenu-test.md` S12 TC-148 / TC-150 |
| TC-752  | `M` の行で Shift + `F10` → 「Merge into current branch…」へフォーカスして `Enter`（`#dialog` が開き内部へフォーカス）→ `Escape` keydown → keyup                                                                  | Normal - merge ダイアログの取消で起点行へ                                    | `#dialog` の `active` が外れ、`activeElement` が `M` の行、`mergeCommit` 要求 0 件                                                                                                                                                  | R4.7 / A8.1-6。`web/dialogs-test.md` S10 TC-059 / TC-060                                     |
| TC-753  | TC-752 と同じく開いた後、`#dialogAction` へフォーカスして `Enter`                                                                                                                                                | Normal - 確定で要求 1 件と起点行へ                                           | `mergeCommit` 要求が 1 件（`repo` / `commitHash: "M"` / `createNewCommit: true` / `squash: false` / `noCommit: false` = `dialogDefaults.merge`）、`#dialog` が閉じ `activeElement` が `M` の行                                      | R4.7。`recordRecentAction`（`saveRepoState`）の記録は従来どおり                              |

### 失敗源インベントリ（include-or-justify）— Feature 061-05 review fix round 2（S81）

| 失敗源                                                  | 対応ケースまたは除外理由                                                                                                                |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `li` 対象の keyup 由来 `contextmenu` でメニューが閉じる | TC-751                                                                                                                                  |
| merge ダイアログの取消 / 確定後に `body` へ落ちる       | TC-752、TC-753                                                                                                                          |
| 起点行対象の同じ押下 `contextmenu`、独立右クリック      | excluded(S75 TC-724 が不変のまま pass することで確認)                                                                                   |
| ref メニューの merge 項目                               | excluded(同じ `buildMergeMenuItem` に `sourceElem` を渡す。`tests/web/refMenu.test.ts` TC-029〜TC-031 が builder 経由で不変のまま pass) |

### レビュー修正 round 2 テスト対応（Feature 061-05）— S81

- テスト: `tests/web/main.keyboard.test.ts`。TC-751 は S75 の describe 内 `keeps the menu when the keyup contextmenu lands on the focused item (TC-751)`。TC-752 / TC-753 は describe `merge dialog opened from a keyboard menu returns focus to the row (S81)` の `returns focus to the row when the merge dialog is cancelled with Escape` / `posts one merge request and returns focus to the row on confirm`
- RED: 旧実装（a0e8503）で 3 件とも fail（TC-751: `#contextMenu` が非 `active`、TC-752 / TC-753: `activeElement` が `body`）→ GREEN。S75 TC-724 / TC-727 は変更なしで pass
- Windows 実機の VK_APPS keyup → `contextmenu` 合成は `13-keyboard-accessibility-01.md` 冒頭の手動一覧に追加（未実施）
- 実行結果（2026-10-07）: 3 件 pass

## S82: ファイル行全体をマウスの差分起動領域として戻す（`li` の click で差分）

> Origin: Feature 061-05 (light-spec-plan) user follow-up
> Added: 2026-10-07
> Status: active
> Supersedes: S76
> Signature: `bindFileViewListeners()` の `li.gitFile` `click`（`e.target` が `button` 内なら無視し、それ以外は `sendViewDiffAction(e.currentTarget)`。伝播は止めない）/ S76 と同じ差分 button・`.openFile` / `.highlightFileHistory` button・folder button・親 hash button・`#commitDetailsClose`・`#fileViewToggle` の接続
> Target Path: `web/main.ts:211, 2717-2757, 2818-2842`（`BUTTON_SELECTOR`、`bindFileViewListeners` の `gitFile` click、`sendViewDiffAction`）
> Test File: `tests/web/main.keyboard.test.ts`

S76 TC-731 は「`li` は非操作ラッパーで、`li` 自体の click では要求 0 件」としたが、利用者の判断で Task 8 以前のマウスの当たり判定（`li` の余白・`R` マーカー・`(+n|-m)` カウンターを含む行全体の click で差分を開く）を戻す。キーボード操作（差分 button の Enter / Space、有効 button なし行の Enter / Space メニュー）、button 構造（`web/fileTree-test.md` S6）、子 button の伝播停止（TC-732）はそのまま。`li` の click リスナーは 83385b6 の旧実装と同じく伝播を止めない（詳細 `tr` はコミット行の兄弟であり行の切替は起きず、document の `hideContextMenuListener` が開いているメニューを従来どおり閉じる）。本節は TC-731 だけを TC-754 / TC-758 へ置き換え、S76 の TC-728〜TC-730・TC-732〜TC-734 は期待結果を変えずに引き継ぐ（テストは同じ Case ID のまま describe `details, file and folder controls as standard buttons (S76)` に残る）。

| Case ID | Input / Precondition                                                                                                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                        | Notes                                                             |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| TC-754  | `M` の詳細でファイル行の差分 button を `click`、続けて `li` 自体（`e.target === li`）を `click`。さらに `li` を `contextmenu` でメニューを開いてから `li` を `click` | Normal - 行の余白から差分                                                  | 差分 button と `li` の click で `viewDiff` 要求が各 1 件、payload（`repo` / `commitHash` / `oldFilePath` / `newFilePath` / `type`）が同一。`#commitDetails` は `M` 行の直後のまま、他の要求 0 件。メニューを開いた後の `li` click ではメニューが閉じて `viewDiff` 1 件 | S76 TC-731 の置き換え（K39 / A8.1-6）。`// Case: TC-731 → TC-754` |
| TC-755  | `li.gitFile > span.gitFileAddDel` を `click`。`type: "R"`（`oldFilePath: "src/old.txt"`）の行で `li.gitFile > span.gitFileRename` を `click`                         | Normal - button 以外の子要素                                               | それぞれ `viewDiff` 要求 1 件。rename 行では `oldFilePath` が旧 path、`type: "R"`                                                                                                                                                                                      | K39。`e.target` が `li` 内で `button` 外なら行として扱う          |
| TC-756  | 差分 button、`.openFile` button、`.highlightFileHistory` button を `click`                                                                                           | Validation - button は自身の要求だけ                                       | 差分 button で `viewDiff` 1 件だけ（行リスナーによる 2 件目なし）。`.openFile` / `.highlightFileHistory` で `openFile` / `fileHistory` が各 1 件、`viewDiff` 0 件                                                                                                      | K39 / A8.1-6。TC-732 の伝播停止契約は不変                         |
| TC-757  | `additions: null` / `deletions: null`（binary、`gitDiffPossible` なし）の行で `li` を `click`                                                                        | Validation - 差分不可の行は不活性                                          | 要求 0 件、`#commitDetails` は `M` 行の直後のまま                                                                                                                                                                                                                      | K38 / R4.3。`sendViewDiffAction` の `gitDiffPossible` ガード      |
| TC-758  | 比較表示（`N` を開き `M` を Ctrl + click）でファイル行の差分 button を `click`、続けて `li` を `click`                                                               | Normal - 比較表示の時系列                                                  | 両方の `viewDiff` が `commitHash: "M"` / `compareWithHash: "N"`（`getCommitOrder` で古い側が先）で payload が同一                                                                                                                                                      | S76 TC-731 比較変種の置き換え（K39）。`// Case: TC-731 → TC-758`  |

### 失敗源インベントリ（include-or-justify）— Feature 061-05 利用者フォローアップ（S82）

| 失敗源                                                   | 対応ケースまたは除外理由                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------ |
| `li` の余白・子 span の click で差分が開かない           | TC-754、TC-755                                                           |
| button の click が行リスナーで二重に差分を開く           | TC-756                                                                   |
| binary 行の click で差分が開く                           | TC-757                                                                   |
| 比較表示で `li` 経路の時系列が button 経路と違う         | TC-758                                                                   |
| 行の click でコミット行が切り替わる / メニューが閉じない | TC-754（`#commitDetails` の位置とメニューの閉鎖）                        |
| キーボード経路・button 構造                              | 引き継いだ S76 TC-728〜TC-730・TC-732〜TC-734、`web/fileTree-test.md` S6 |

### 利用者フォローアップ テスト対応（Feature 061-05）— S82

- テスト: `tests/web/main.keyboard.test.ts` describe `details, file and folder controls as standard buttons (S76)`。TC-754 `requests the same diff from the diff button and from the row wrapper (TC-754)`（旧 TC-731 の書き換え）、TC-755 `requests the diff from the rename marker and the counters inside the row (TC-755)`、TC-756 `keeps each button's own request without a second diff from the row (TC-756)`、TC-757 `ignores a row click on a binary file (TC-757)`、TC-758 `orders the comparison hashes for the row like the diff button (TC-758)`（旧 TC-731 比較変種の書き換え）
- RED: 旧実装（b5d40df、`li` の click リスナーなし）で TC-754 / TC-755 / TC-758 が fail（`li` の click で `viewDiff` 0 件）→ GREEN。TC-756 / TC-757 は旧実装でも pass（不変の保証）。S76 の引き継ぎ Case は変更なしで pass
- 引き継ぎ: TC-728 / TC-729 / TC-730 / TC-732 / TC-733 / TC-734 / TC-686 / TC-719 / TC-710 の各 `it` は S76 の「Task 12 テスト対応」のまま
- 実行結果（2026-10-07）: 16 件 pass（describe 全体）

## S83: 比較の解除で起点の単一詳細を取り直す

> Origin: Feature 061-05 (light-spec-plan) user follow-up
> Added: 2026-10-08
> Status: active
> Supersedes: -
> Signature: `handleCommitRowActivation(clickedHash, sourceElem, isModifierClick)` の「同じ比較対象」分岐 → `loadCommitDetails(this.expandedCommit.srcElem)`（`srcElem === null` なら `hideCommitDetails()`）/ `showCompareResult(fileChanges, fromHash, toHash)` の `compareWithHash === null` ガード
> Target Path: `web/main.ts:2298-2335, 2337-2366, 2856-2884`（`handleCommitRowActivation`、`loadCommitDetails`、`showCompareResult`）
> Test File: `tests/web/main.keyboard.test.ts`

比較結果の受信は `expandedCommit.commitDetails` / `fileTree` を比較用の合成データ（作者・日付・親・本文が空、ファイルは比較差分）で上書きする。旧実装は解除時にその合成データで単一詳細を描き直していたため、要約が空になりファイル一覧が比較のまま残っていた（main 由来の既存不具合、利用者の実画面確認で発見）。解除は起点の詳細を取り直す。キーボードの Ctrl + `Enter` とマウスの Ctrl + click は同じ分岐を通る。S70 TC-668 の「`postMessage` の増分が 0」は本節の要求 1 件へ更新し、`06-file-actions-01.md` TC-390 は解除後に起点の詳細応答を受理してから glyph を操作する（期待結果は不変）。

| Case ID | Input / Precondition                                                                                                                                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                          | Notes                                                    |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| TC-759  | `N` の詳細（本文 `N body`、ファイル `src/n.txt`）を開き、比較 `N/M`（比較のファイル `src/compare.txt`）を受理。`M` に実フォーカスで Ctrl + `Enter`、続けて `N` の詳細応答を受理 | Normal - 解除で起点の詳細へ戻る（主回帰）                                  | 解除直後: `compareTarget` 0 件、`commitHash: "N"` の詳細要求 1 件・比較要求 0 件、`#commitDetails` が `N` 行の直後、`activeElement` が `M`。応答後: 要約に `N body` と作者、ファイル一覧に `src/n.txt` があり `src/compare.txt` がない、比較の要約文なし | 旧実装: 要求 0 件、`src/compare.txt` が残る（RED）       |
| TC-760  | TC-759 と同じ比較 `N/M` で、`M` を Ctrl + click                                                                                                                                 | Normal - マウスの解除も同じ                                                | 要求列が TC-759 のキーボード解除と一致（`commitDetails` / `N` の 1 件）。応答後の表示も TC-759 と同じ                                                                                                                                                    | R4.2「修飾クリックと同じ比較操作」                       |
| TC-761  | 比較 `N/M` の結果を受理する前に `M` で Ctrl + `Enter` で解除し、遅れて `compareCommits` 応答、続けて `N` の詳細応答                                                             | Boundary - 解除後に届いた比較結果                                          | 比較応答では表示が変わらず（読み込み表示のまま、`src/compare.txt` なし）、詳細応答で `src/n.txt` が描かれる                                                                                                                                              | `showCompareResult` の `compareWithHash === null` ガード |

### 失敗源インベントリ（include-or-justify）— Feature 061-05 利用者フォローアップ（S83）

| 失敗源                                               | 対応ケースまたは除外理由                                                                                        |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 解除後に合成データ（空の要約・比較のファイル）が残る | TC-759                                                                                                          |
| キーボードとマウスの解除で要求が食い違う             | TC-760                                                                                                          |
| 解除後に届いた古い比較結果が表示を上書きする         | TC-761                                                                                                          |
| 起点の行が無い（`srcElem === null`）                 | 除外: 描画済みの行からしか比較を操作できず、復元時の `srcElem` は再描画で必ず設定される。防御として詳細を閉じる |
| 詳細の取得失敗                                       | 既存の `commitDetails` 応答処理（エラーダイアログ）の責務。`web/messageHandler-test` で確認済み                 |

### 利用者フォローアップ テスト対応（Feature 061-05）— S83

- テスト: `tests/web/main.keyboard.test.ts` describe `cancelling a comparison restores the origin's own details (S83)`。TC-759 `requests and shows the origin's details after a modified Enter cancel (TC-759)`、TC-760 `sends the same request from a Ctrl+click cancel (TC-760)`、TC-761 `ignores a compare result that arrives after the cancel (TC-761)`。S70 TC-668 と `tests/web/main.test.ts` TC-390 の期待・前提を更新
- RED: 旧実装（d27270a）で TC-759 / TC-760 / TC-761 と更新後の TC-668 が fail（解除で要求 0 件、比較のファイルが残る）→ GREEN
- 実行結果（2026-10-08）: `tests/web/main.keyboard.test.ts` / `tests/web/main.test.ts` 全件 pass

## S84: Shift + ↑↓ は詳細を動かさず操作対象だけを移す

> Origin: Feature 061-05 (light-spec-plan) user follow-up
> Added: 2026-10-08
> Status: active
> Supersedes: -
> Signature: `handleRowKey(e, row, onRow)` の比較中分岐（Ctrl / Cmd 付きだけ非処理）と通常一覧分岐（`moveRowTarget(index + delta, e, !e.shiftKey && this.expandedCommit !== null)`）。ファイル履歴分岐 `handleFileHistoryArrowKey` は変更しない
> Target Path: `web/main.ts:1903-1941, 1962-1975`（`handleRowKey`、`moveRowTarget`）
> Test File: `tests/web/main.keyboard.test.ts`、`tests/web/main.test.ts`

単一詳細が開いていると無修飾の ↑↓ は詳細を追従させる（D1）ため、詳細を開いたまま別の行を操作対象にできず、Ctrl + `Enter` による比較の開始にキーボードだけでは到達できなかった（確定仕様 §8.1-2 の未達。利用者の実画面確認で発見）。利用者決定 D4 として、Shift + ↑↓ は表示順で操作対象だけを移し、詳細・比較・要求を変えない。比較中の Shift + ↑↓ も無修飾と同じく操作対象だけを移す。ファイル履歴中の Shift 単独は従来どおり扱わない（S71 TC-681 は不変）。Ctrl / Cmd + Shift の代替親子（TC-671）と比較中の非処理（TC-664）も不変。S64 TC-569（Shift 単独は非消費）は本節 TC-767 へ置き換える。

| Case ID | Input / Precondition                                                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                          | Notes                                             |
| ------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| TC-762  | `N` の単一詳細を開き `N` に実フォーカス、Shift + `ArrowDown`、続けて Shift + `ArrowUp`          | Normal - 詳細を残して操作対象だけ移す                                      | 1 回目: `activeElement` と `tabindex="0"` が `M`、`#commitDetails` は `N` 行の直後のまま、要求 0 件、消費。2 回目: `N` へ戻り、要求 0 件 | D4。旧実装: 非消費で移動しない（RED）             |
| TC-763  | TC-762 の 1 回目の後（操作対象 `M`、詳細 `N`）、`M` で Ctrl + `Enter`                           | Normal - キーボードだけで比較を開始                                        | `compareTarget` が `M`、`commitDetailsOpen` が `N`、`compareCommits`（`fromHash: "M"` / `toHash: "N"`）が 1 件                           | §8.1-2。旧実装: 比較に到達できない（RED）         |
| TC-764  | 詳細なしで `M` に実フォーカス、Shift + `ArrowDown`                                              | Normal - 詳細なしは無修飾と同じ                                            | `activeElement` が `R`、要求 0 件、`#commitDetails` なし、消費                                                                           | D4                                                |
| TC-765  | 比較 `N/M` 中、`M` に実フォーカスで Shift + `ArrowDown`                                         | Normal - 比較中も操作対象だけ                                              | `activeElement` が `R`、`commitDetailsOpen` が `N`・`compareTarget` が `M` のまま、要求 0 件、消費                                       | D4。TC-664（Ctrl / Cmd 付き）は不変               |
| TC-766  | `N` の単一詳細を開き、先頭行 `N` で Shift + `ArrowUp`                                           | Boundary - 端では動かない                                                  | `activeElement` が `N` のまま、要求 0 件、非消費                                                                                         | §4.2 端の非消費                                   |
| TC-767  | `tests/web/main.test.ts` の mock 構成（通常モード、`COMMIT_HASH_2` を展開）で Shift + `ArrowUp` | Normal - 詳細あり Shift 単独                                               | 消費（`preventDefault` / `stopPropagation` 各 1 回）、詳細要求 0 件                                                                      | S64 TC-569 の置き換え。`// Case: TC-569 → TC-767` |

### 失敗源インベントリ（include-or-justify）— Feature 061-05 利用者フォローアップ（S84）

| 失敗源                                        | 対応ケースまたは除外理由                           |
| --------------------------------------------- | -------------------------------------------------- |
| Shift + ↑↓ で詳細が追従する / 要求が出る      | TC-762、TC-767                                     |
| キーボードだけで比較を開始できない            | TC-763                                             |
| 詳細なし・比較中で Shift の動作が無修飾と違う | TC-764、TC-765                                     |
| 端で循環・消費する                            | TC-766                                             |
| ファイル履歴中に Shift で一致行探索を迂回する | S71 TC-681（不変。Shift 単独は履歴分岐で扱わない） |
| 代替親子（Ctrl / Cmd + Shift）の退行          | S70 TC-671、TC-664（不変）                         |

### 利用者フォローアップ テスト対応（Feature 061-05）— S84

- テスト: `tests/web/main.keyboard.test.ts` describe `Shift + arrows move only the target (S84)`。TC-762 `keeps the open details while Shift + arrows move the target (TC-762)`、TC-763 `starts a comparison from the keyboard alone (TC-763)`、TC-764 `moves only the target without details like the plain arrow (TC-764)`、TC-765 `moves only the target during a comparison (TC-765)`、TC-766 `stops at the first row without consuming Shift + ArrowUp (TC-766)`。`tests/web/main.test.ts` TC-767 `Shift-only + ArrowUp moves only the target (TC-767)`（旧 TC-569 の書き換え）
- RED: 旧実装（d27270a）で TC-762〜TC-765 が fail（Shift 付き矢印が非消費で移動しない）→ GREEN。TC-766 は旧実装でも pass（端の不変の保証）
- 実行結果（2026-10-08）: `tests/web/main.keyboard.test.ts` / `tests/web/main.test.ts` 全件 pass
