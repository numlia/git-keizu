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
> Status: active
> Supersedes: -

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
> Status: active
> Supersedes: -
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
