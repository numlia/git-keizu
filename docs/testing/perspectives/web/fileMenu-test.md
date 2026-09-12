# テスト観点表: web/fileMenu.ts

> Source: `web/fileMenu.ts`
> Generated: 2026-04-04T15:52:21Z
> Language: TypeScript
> Test Framework: Vitest

## S1: file row Open File action request payload 解決

> Origin: Feature 027 (commit-file-context-menu) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: active
> Supersedes: -

**シグネチャ**: `file row 要素 / expandedCommit / repo を受け取り openFile request を送る helper`
**テスト対象パス**: `web/fileMenu.ts`

| Case ID | Input / Precondition                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                     | Notes               |
| ------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------- |
| TC-001  | `.gitFile` に `data-newfilepath="src%2Ffile.ts"`、expandedCommit.hash あり | Normal - standard                                                          | `sendMessage` が 1 回呼ばれ、payload が `{ command: "openFile", repo, filePath: "src/file.ts", commitHash }` になる | REQ-2.2-TC1         |
| TC-002  | `data-newfilepath` に空白や日本語を含む URI エンコード済みパス             | Boundary - special characters                                              | `sendMessage` の `filePath` がデコード後の完全一致文字列になる                                                      | REQ-2.2-TC2         |
| TC-003  | expandedCommit が null                                                     | Validation - missing commit context                                        | `sendMessage` が呼ばれない                                                                                          | no-op guard         |
| TC-004  | `.gitFile` に `data-newfilepath` が存在しない                              | Validation - missing dataset                                               | `sendMessage` が呼ばれない                                                                                          | no-op guard         |
| TC-005  | type=`D` の deleted file row に `data-newfilepath` が存在する              | Boundary - deleted row delegation                                          | deleted row でも `sendMessage` が通常の `openFile` payload で呼ばれ、可否判定を host 側へ委譲する                   | REQ-2.2-TC3 の前段  |
| TC-006  | target 要素が `.gitFile` の配下に存在しない                                | Validation - missing file row                                              | `closest(".gitFile")` 解決に失敗しても例外を投げず、`sendMessage` が呼ばれない                                      | nested target guard |

## S2: buildFileContextMenuItems() menu item 構築

> Origin: Feature 027 (commit-file-context-menu) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: superseded
> Supersedes: -
> Superseded By: S5

**シグネチャ**: `buildFileContextMenuItems(fileRow, expandedCommit, repo): ContextMenuElement[]`
**テスト対象パス**: `web/fileMenu.ts`

| Case ID | Input / Precondition                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                    | Notes                    |
| ------- | ------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| TC-007  | 有効な `.gitFile` row、expandedCommit.hash あり        | Normal - standard                                                          | 返却される items は 1 件で、title が `Open File` である                                                            | REQ-2.1-TC1, REQ-2.1-TC2 |
| TC-008  | type=`D` の deleted file row                           | Boundary - deleted row menu availability                                   | deleted row でも items が空にならず、`Open File` 1 件を返す                                                        | REQ-2.1-TC4              |
| TC-009  | expandedCommit が null                                 | Validation - missing commit context                                        | 空配列を返し、menu を表示しない                                                                                    | guard                    |
| TC-010  | `data-newfilepath` 欠落など action helper の前提が不足 | Validation - missing dataset                                               | 空配列を返し、実行不能な menu item を生成しない                                                                    | guard                    |
| TC-011  | TC-007 の items[0].onClick を実行                      | Normal - shared action reuse                                               | menu item 選択時の `sendMessage` payload が icon click と同一構造 `{ command, repo, filePath, commitHash }` になる | REQ-2.2 / REQ-2.3        |

## S3: Recent actions 識別子と保存トリガー

> Origin: Feature 034 (context-menu-recent-actions) Task 4
> Added: 2026-05-02
> Status: superseded
> Supersedes: -
> Superseded By: S5
> Signature: `buildFileContextMenuItems(fileRow, expandedCommit, repo): ContextMenuElement[]`
> Target Path: `web/fileMenu.ts`

| Case ID | Input / Precondition                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                        | Notes                                 |
| ------- | ------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------- |
| TC-012  | 有効な `.gitFile` row、expandedCommit.hash あり   | Normal - recent id                                                         | `Open File` item に `recentActionId = "file.openFile"` が付与される                    | 表示条件上、Recent block 自体は別責務 |
| TC-013  | TC-012 の item を click                           | Normal - record before send                                                | `recordRecentAction(repo, "file.openFile")` が `openFile` payload 送信より先に呼ばれる | sendOpenFileAction 再利用             |
| TC-014  | expandedCommit が null で menu 自体が生成されない | Validation - guard                                                         | 空配列を返し、`recordRecentAction(...)` も呼ばれない                                   | キャンセル相当                        |

## S4: buildFileContextMenuItems() Highlight File History item の表示条件と callback

> Origin: Feature 055-07 (light-spec-plan)
> Added: 2026-09-08
> Status: active
> Supersedes: -
> Signature: `buildFileContextMenuItems(fileRow: HTMLElement | null, expandedCommit: FileMenuExpandedCommit | null, repo: string | null, fileHistory: FileHistoryMenuContext): ContextMenuElement[]`
> Target Path: `web/fileMenu.ts`（`buildFileContextMenuItems()`。実装後に行範囲へ更新）
> Test File: `tests/web/fileMenu.test.ts`

`Open File` を先頭に維持し、`expandedCommit.hash !== "*"`・`fileHistory.isStash === false`・`compareWithHash === null`・`data-type` が `A` / `M` / `D` / `R` のすべてを満たすときだけ 2 件目に `Highlight File History` を追加する契約の観点（対応プラン §4 Task 4 実装内容 1〜2）。`onClick` は `onHighlightFileHistory(anchorHash, decodeURIComponent(path))` を呼び、request の送信は `web/fileHistory-test.md` S2 の責務で本表には含めない。基本 fixture は type `M` の row、`{ hash: "abc", compareWithHash: null }`、`{ isStash: false, onHighlightFileHistory: vi.fn() }`。

| Case ID | Input / Precondition                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                      | Notes                             |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| TC-015  | 基本 fixture                                                 | Normal - 2 件の menu                                                       | 戻り値が 2 件で `[0].title === "Open File"`、`[1].title === "Highlight File History"`                                                                                                | 順序固定                          |
| TC-016  | 基本 fixture の `[1].onClick()` を実行                       | Normal - callback 引数                                                     | `onHighlightFileHistory` が `("abc", "src/file.ts")` で 1 回呼ばれ、`postMessage` の call count が 0                                                                                 | decode 済み path                  |
| TC-017  | 基本 fixture の `[1]`                                        | Normal - recentActionId なし                                               | `[1].recentActionId` が `undefined` で、`[1].onClick()` 後の `recordRecentAction` の call count が 0                                                                                 | `RecentActionId` union を広げない |
| TC-018  | `data-type` が `A` / `D` / `R` の row                        | Normal - 許容 type 集合                                                    | 3 入力とも戻り値が 2 件で `[1].title === "Highlight File History"`                                                                                                                   | `FILE_HISTORY_MENU_CHANGE_TYPES`  |
| TC-019  | `data-type` が `T` の row                                    | Validation - 許容外 type                                                   | 戻り値が `Open File` 1 件                                                                                                                                                            | typechange                        |
| TC-020  | `data-type` 属性が無い row                                   | Boundary - dataset 欠落                                                    | 戻り値が `Open File` 1 件                                                                                                                                                            | `undefined` は許容外              |
| TC-021  | `expandedCommit.hash === "*"`（uncommitted）                 | Validation - uncommitted changes                                           | 戻り値が `Open File` 1 件                                                                                                                                                            | `UNCOMMITTED_CHANGES_HASH`        |
| TC-022  | `fileHistory.isStash === true`                               | Validation - stash commit                                                  | 戻り値が `Open File` 1 件                                                                                                                                                            | 判定源は呼出側                    |
| TC-023  | `expandedCommit.compareWithHash === "def"`                   | Validation - 比較表示                                                      | 戻り値が `Open File` 1 件                                                                                                                                                            | 安定した anchor がない            |
| TC-024  | `expandedCommit === null`                                    | Validation - commit context なし                                           | 戻り値が `[]`（既存挙動維持）                                                                                                                                                        | S2 TC-009 と同じ guard            |
| TC-025  | `data-newfilepath` 欠落の row                                | Validation - dataset 欠落                                                  | 戻り値が `[]`（既存挙動維持）                                                                                                                                                        | S2 TC-010 と同じ guard            |
| TC-026  | 基本 fixture の `[0]`                                        | Normal - 既存 item の維持                                                  | `[0].recentActionId === "file.openFile"` で、`[0].onClick()` により `recordRecentAction(repo, "file.openFile")` と `openFile` payload の `postMessage` が従来どおり 1 回ずつ呼ばれる | S1〜S3 の契約を壊さない           |
| TC-027  | `data-newfilepath` が空白と日本語を含む URI encode 済み path | Boundary - special characters                                              | `[1].onClick()` の第 2 引数が decode 後の完全一致文字列                                                                                                                              | `decodeURIComponent`              |

### 失敗源インベントリ（include-or-justify）— Feature 055-07 追加分（S4）

| 失敗源                                                | 対応ケースまたは除外理由                                                                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| uncommitted / stash / 比較表示で item を出す          | TC-021〜TC-023                                                                                                                                   |
| 許容外 type・dataset 欠落で item を出す               | TC-019、TC-020                                                                                                                                   |
| encode 済み path をそのまま渡す                       | TC-016、TC-027                                                                                                                                   |
| `Open File` の順序・payload・recent action の破壊     | TC-015、TC-026                                                                                                                                   |
| `Highlight File History` へ recentActionId を付ける   | TC-017                                                                                                                                           |
| 既存 guard（context なし・path 欠落）の後退           | TC-024、TC-025                                                                                                                                   |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL） | 0 件: TC-024、TC-025。1 件: TC-019〜TC-023。`null` context: TC-024。dataset 欠落: TC-020、TC-025。maximum / +/-1: excluded(数値閾値が存在しない) |
| 外部依存×失敗モード                                   | excluded(menu 構築は DOM dataset と callback だけで外部依存なし)                                                                                 |
| 例外・エラー経路                                      | excluded(guard は空配列 / 1 件で表現し throw 経路を持たない)                                                                                     |
| 型不正・フォーマット不正                              | excluded(`FileMenuExpandedCommit` / `FileHistoryMenuContext` の型は TypeScript の型検査で担保し、`data-type` の未知値は TC-019 で固定)           |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-019、TC-021〜TC-025
- Exception: excluded(上表のとおり throw 経路なし)
- External: excluded(上表のとおり)
- Boundary: TC-020、TC-027
- Type: excluded(上表のとおり)
- Normal: TC-015〜TC-018、TC-026

**失敗系/正常系比（煙感知器）**: 正常系5件、失敗系8件。表示条件 4 つの否定側と既存 guard を失敗源として列挙し、比 1.6 倍がインベントリから導かれた値であることを確認した。比率合わせのためのケース追加・削除は行わない。

## S5: buildFileContextMenuItems() 4 引数 signature での Open File item の維持

> Origin: Feature 055-07 (light-spec-plan) Task 8
> Added: 2026-09-08
> Status: active
> Supersedes: S2, S3
> Signature: `buildFileContextMenuItems(fileRow: HTMLElement | null, expandedCommit: FileMenuExpandedCommit | null, repo: string | null, fileHistory: FileHistoryMenuContext): ContextMenuElement[]`
> Target Path: `web/fileMenu.ts`（`buildFileContextMenuItems()`）
> Test File: `tests/web/fileMenu.test.ts`

S2 / S3 は 3 引数 signature と「items が `Open File` 1 件」を前提にしており、Task 4 で `fileHistory` 引数が追加され通常 row では 2 件目に `Highlight File History` が並ぶため（S4 TC-015）、期待結果が現行契約と一致しなくなった。本セクションは S2 / S3 の `Open File` 契約を 4 引数 signature の下で再定義する。件数と 2 件目の表示条件は S4、`expandedCommit === null` / `data-newfilepath` 欠落の guard は S4 TC-024 / TC-025、`recentActionId` の付与は S4 TC-026 が担い本表には含めない。基本 fixture は type `M` の row、`{ hash: "abc123def456", compareWithHash: null }`、`{ isStash: false, onHighlightFileHistory: vi.fn() }`。

| Case ID | Input / Precondition                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                     | Notes                |
| ------- | ------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| TC-028  | 基本 fixture                                      | Normal - Open File の先頭維持                                              | `[0].title === "Open File"` で、title が `Open File` の item が 1 件だけ含まれる                                                    | 旧 TC-007。件数は S4 |
| TC-029  | type=`D` の deleted file row                      | Boundary - deleted row menu availability                                   | items が空にならず `[0].title === "Open File"` である                                                                               | 旧 TC-008            |
| TC-030  | 基本 fixture の `[0].onClick()` を実行            | Normal - shared action reuse                                               | `postMessage` が 1 回、payload が icon click と同一構造 `{ command: "openFile", repo, filePath: "src/file.ts", commitHash }` である | 旧 TC-011            |
| TC-031  | 基本 fixture の `[0].onClick()` を実行            | Normal - record before send                                                | `recordRecentAction(repo, "file.openFile")` が 1 回、`mock.invocationCallOrder` で `postMessage` より先に呼ばれる                   | 旧 TC-013            |
| TC-032  | expandedCommit が null で menu 自体が生成されない | Validation - guard                                                         | 空配列を返し、`recordRecentAction(...)` の call count が 0                                                                          | 旧 TC-014            |

### 失敗源インベントリ（include-or-justify）— Feature 055-07 Task 8 追加分（S5）

| 失敗源                                                | 対応ケースまたは除外理由                                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `Open File` が先頭から外れる・重複する                | TC-028、TC-029                                                                                 |
| payload 構造の drift・二重送信                        | TC-030                                                                                         |
| recent action の記録漏れ・順序逆転                    | TC-031                                                                                         |
| guard 時の recent action 記録                         | TC-032                                                                                         |
| 2 件目の表示条件・guard の `[]`・`recentActionId`     | excluded(S4 TC-015〜TC-026 の責務)                                                             |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL） | 0 件: TC-032。`null` context: TC-032。maximum / +/-1: excluded(数値閾値が存在しない)           |
| 外部依存×失敗モード                                   | excluded(menu 構築は DOM dataset と callback だけで外部依存なし)                               |
| 例外・エラー経路                                      | excluded(guard は空配列で表現し throw 経路を持たない)                                          |
| 型不正・フォーマット不正                              | excluded(`FileMenuExpandedCommit` / `FileHistoryMenuContext` の型は TypeScript の型検査で担保) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-032
- Exception: excluded(上表のとおり throw 経路なし)
- External: excluded(上表のとおり)
- Boundary: TC-029
- Type: excluded(上表のとおり)
- Normal: TC-028、TC-030、TC-031

**失敗系/正常系比（煙感知器）**: 正常系3件、失敗系2件。S2 / S3 の契約を 4 引数 signature へ写した replacement section で、失敗源は先頭維持・payload・recent action の 3 点に限られることを上表で列挙した。比率合わせのためのケース追加・削除は行わない。

## S6: canHighlightFileHistory() / sendHighlightFileHistoryAction() 共有判定とアイコン起動

> Origin: Feature 055-09 (light-spec-plan)
> Added: 2026-09-13
> Status: active
> Supersedes: -
> Signature: `canHighlightFileHistory(expandedCommit: FileMenuExpandedCommit, isStash: boolean, changeType: string | undefined): boolean` / `sendHighlightFileHistoryAction(fileRow: HTMLElement | null, expandedCommit: FileMenuExpandedCommit | null, repo: string | null, fileHistory: FileHistoryMenuContext): void`
> Target Path: `web/fileMenu.ts`（`canHighlightFileHistory()`・`sendHighlightFileHistoryAction()`。Task 5完了時に行範囲へ更新）
> Test File: `tests/web/fileMenu.test.ts`

context menuが持つ4条件（uncommittedでない / stashでない / 比較表示でない / change typeが`A` / `M` / `D` / `R`）をexport関数`canHighlightFileHistory()`の1か所に置き、履歴アイコンのclickから呼ぶ`sendHighlightFileHistoryAction()`が`sendOpenFileAction()`と同じ4ガードのあとにその時点の入力で同じ4条件を再評価してから`onHighlightFileHistory(anchorHash, decodeURIComponent(path))`を1回呼ぶ契約の観点（対応プラン§3.4、§4 Task 2）。menu側の戻り値はS4 / S5、DOM listenerの配線は`web/main-test/06-file-actions-01.md` S54、requestの送信は`web/fileHistory-test.md`の責務で本表には含めない。基本fixtureは`{ hash: "abc", compareWithHash: null }`、`isStash: false`、type `M`で`newfilepath: "src%2Ffile.ts"`の行、`makeFileHistoryContext()`。

| Case ID | Input / Precondition                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                    | Notes                            |
| ------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------- |
| TC-033  | `canHighlightFileHistory({ hash: "abc", compareWithHash: null }, false, "M")`    | Normal - 基本                                                              | `true`                                                                                             | -                                |
| TC-034  | changeTypeが`A` / `D` / `R`                                                      | Normal - 許容type集合                                                      | 3入力とも`true`                                                                                    | `FILE_HISTORY_MENU_CHANGE_TYPES` |
| TC-035  | changeTypeが`T`                                                                  | Validation - 許容外type                                                    | `false`                                                                                            | typechange                       |
| TC-036  | changeTypeが`undefined`                                                          | Boundary - dataset欠落                                                     | `false`                                                                                            | -                                |
| TC-037  | hashが`*`                                                                        | Validation - uncommitted                                                   | `false`                                                                                            | `UNCOMMITTED_CHANGES_HASH`       |
| TC-038  | isStashが`true`                                                                  | Validation - stash                                                         | `false`                                                                                            | -                                |
| TC-039  | compareWithHashが`"def"`                                                         | Validation - 比較表示                                                      | `false`                                                                                            | -                                |
| TC-040  | `sendHighlightFileHistoryAction(基本行, 基本commit, TEST_REPO, context)`         | Normal - 起動                                                              | `onHighlightFileHistory`が`("abc", "src/file.ts")`で1回、`postMessage`0回、`recordRecentAction`0回 | menu項目と同じ引数               |
| TC-041  | `data-newfilepath`が`encodeURIComponent("src/テスト ファイル.ts")`               | Boundary - special characters                                              | 第2引数が`"src/テスト ファイル.ts"`                                                                | `decodeURIComponent`             |
| TC-042  | fileRowが`null`（`resolveFileRow(span)`の結果）                                  | Validation - 行解決失敗                                                    | callback 0回、例外なし                                                                             | S1 TC-006と同じguard             |
| TC-043  | expandedCommitが`null`                                                           | Validation - commit contextなし                                            | 0回                                                                                                | -                                |
| TC-044  | repoが`null`                                                                     | Validation - repoなし                                                      | 0回                                                                                                | DOM統合では作れない経路          |
| TC-045  | `data-newfilepath`欠落の行                                                       | Validation - dataset欠落                                                   | 0回                                                                                                | -                                |
| TC-046  | hash `*` / isStash `true` / compareWithHash `"def"` / type `T` / type欠落の5入力 | Validation - 4条件の否定側                                                 | 各0回                                                                                              | click時の再評価                  |
| TC-047  | type `A` / `D` / `R`の行                                                         | Normal - 4条件の許可側                                                     | 各1回、第1引数`"abc"`                                                                              | -                                |

### 失敗源インベントリ（include-or-justify）— Feature 055-09 追加分（S6）

| 失敗源                                                                                               | 対応ケースまたは除外理由                                                                                                          |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 4条件の否定側（uncommitted / stash / 比較表示 / 許容外type・type欠落）で`true`を返す・callbackを呼ぶ | TC-035〜TC-039、TC-046                                                                                                            |
| ガード後退（`fileRow` / `expandedCommit` / `repo`の`null`、`data-newfilepath`欠落でcallbackを呼ぶ）  | TC-042〜TC-045                                                                                                                    |
| encode済みpathの素通し                                                                               | TC-041                                                                                                                            |
| recent actionの記録（`recordRecentAction`を呼ぶ）・`postMessage`の直接送信                           | TC-040                                                                                                                            |
| 許容typeの取りこぼし                                                                                 | TC-034、TC-047                                                                                                                    |
| menu側の戻り値・DOM listenerの配線・requestの送信                                                    | excluded(S4 / S5、`web/main-test/06-file-actions-01.md` S54、`web/fileHistory-test.md`の責務)                                     |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL）                                                | 0回: TC-042〜TC-046。`null`引数: TC-042〜TC-044。dataset欠落: TC-036、TC-045。maximum / +/-1: excluded(数値閾値が存在しない)      |
| 外部依存×失敗モード                                                                                  | excluded(判定と起動はDOM datasetとcallbackだけで外部依存なし)                                                                     |
| 例外・エラー経路                                                                                     | excluded(ガードは早期returnで表現しthrow経路を持たない。TC-042で例外なしを確認)                                                   |
| 型不正・フォーマット不正                                                                             | excluded(`FileMenuExpandedCommit` / `FileHistoryMenuContext`の型はTypeScriptの型検査で担保し、`changeType`の未知値はTC-035で固定) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-035、TC-037〜TC-039、TC-042〜TC-046
- Exception: excluded(上表のとおりthrow経路なし)
- External: excluded(上表のとおり)
- Boundary: TC-036、TC-041
- Type: excluded(上表のとおり)
- Normal: TC-033、TC-034、TC-040、TC-047

**失敗系/正常系比（煙感知器）**: 正常系4件、失敗系11件。4条件の否定側を判定関数と起動helperの両方で、4ガードを起動helperで列挙し、比2.75倍がインベントリから導かれた値であることを確認した。比率合わせのためのケース追加・削除は行わない。
