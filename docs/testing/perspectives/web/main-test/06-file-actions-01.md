# テスト観点表: web/main.ts

> Source: `web/main.ts`
> Generated: 2026-04-04T15:52:21Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: file-actions

## S36: bindFileViewListeners() openFile クリックハンドラ

> Origin: Feature 026 (commit-detail-open-file) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: active
> Supersedes: -

**シグネチャ**: `bindFileViewListeners(): void`
**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                      | Notes                     |
| ------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------- |
| TC-202  | コミットが展開されている + .openFile 要素をクリック            | Normal - standard                                                          | vscode.postMessage が { command: "openFile", repo, filePath, commitHash } で呼ばれる | 既存 TC-039 パターン参考  |
| TC-203  | .openFile をクリック + 親 .gitFile にも click ハンドラあり     | Normal - event isolation                                                   | stopPropagation が呼ばれ、親 .gitFile の viewDiff ハンドラが発火しない               | イベント伝播停止の検証    |
| TC-204  | expandedCommit が null                                         | Validation - null guard                                                    | vscode.postMessage が呼ばれない                                                      | ガード条件の検証          |
| TC-205  | data-newfilepath が URL エンコード済み（"src%2Fmy%20file.ts"） | Normal - URI decoding                                                      | filePath が "src/my file.ts" にデコードされてメッセージに含まれる                    | decodeURIComponent の検証 |
| TC-206  | data-newfilepath に特殊文字（日本語ファイル名等）を含む        | Boundary - special characters                                              | filePath がデコード後の正しい文字列でメッセージに含まれる                            | Unicode 文字の処理        |

## S37: bindFileViewListeners() file row context menu 導線

> Origin: Feature 027 (commit-file-context-menu) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: superseded
> Supersedes: -
> Superseded By: S52

**シグネチャ**: `bindFileViewListeners(): void`
**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                 | Notes             |
| ------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------- |
| TC-207  | tree 表示の `.gitFile` 行を右クリック                         | Normal - tree row context menu                                             | `showContextMenu` が 1 回呼ばれ、対象 row を sourceElem に持ち、items が 1 件で title が `Open File` である     | REQ-2.1-TC1       |
| TC-208  | list 表示の `.gitFile` 行を右クリック                         | Normal - list row context menu                                             | `showContextMenu` が 1 回呼ばれ、tree 表示と同じ単項目 menu が渡される                                          | REQ-2.1-TC2       |
| TC-209  | `.gitFile.gitDiffPossible` 行を右クリック                     | Boundary - event isolation                                                 | `preventDefault()` と `stopPropagation()` が適用され、`vscode.postMessage` に `viewDiff` が送られない           | REQ-2.3-TC3       |
| TC-210  | type=`D` の deleted file row（`.openFile` icon は存在しない） | Boundary - deleted row menu                                                | icon 非表示でも `showContextMenu` が呼ばれ、items は 1 件のまま維持される                                       | REQ-2.1-TC4       |
| TC-211  | right click menu で返された `Open File` 項目を選択            | Normal - menu selection                                                    | `vscode.postMessage` が `{ command: "openFile", repo, filePath, commitHash }` で呼ばれ、`viewDiff` は送られない | REQ-2.2-TC1       |
| TC-212  | expandedCommit が null の状態で `.gitFile` を右クリック       | Validation - missing commit context                                        | `showContextMenu` が呼ばれず、`openFile` message も送信されない                                                 | collapse 後ガード |
| TC-213  | 有効な file row を右クリック                                  | Validation - single action scope                                           | `showContextMenu` に渡す items が `Open File` のみで、divider や追加 action を含まない                          | REQ-2.1-TC3       |

## S52: bindFileViewListeners() file row context menu 導線（Highlight File History 追加後）

> Origin: Feature 055-07 (light-spec-plan) Task 8
> Added: 2026-09-08
> Status: active
> Supersedes: S37
> Signature: `bindFileViewListeners(): void`（`.gitFile` の `contextmenu` handler）
> Target Path: `web/main.ts`（`bindFileViewListeners()` の contextmenu listener）
> Test File: `tests/web/main.test.ts`

S37 は「items が `Open File` 1 件」を前提にしており、Task 4 で通常 commit の `A` / `M` / `D` / `R` row に `Highlight File History` が 2 件目として並ぶ契約（`web/fileMenu-test.md` S4 TC-015）に変わったため、S37 の導線契約を 2 件 menu の下で再定義する。menu item の表示条件そのものは `web/fileMenu-test.md` S4、`buildFileContextMenuItems` へ渡す第 4 引数の形は `10-file-history-01.md` S50 TC-328〜TC-330 の責務で本表には含めない。fixture は通常 commit（`stash === null`）を展開した CDV の type `M` / `D` row。

| Case ID | Input / Precondition                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                       | Notes     |
| ------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| TC-342  | tree 表示の `.gitFile` 行を右クリック                         | Normal - tree row context menu                                             | `showContextMenu` が 1 回呼ばれ、対象 row を sourceElem に持ち、items が 2 件で `[0].title === "Open File"`、`[1].title === "Highlight File History"` | 旧 TC-207 |
| TC-343  | list 表示の `.gitFile` 行を右クリック                         | Normal - list row context menu                                             | `showContextMenu` が 1 回呼ばれ、tree 表示と同じ 2 件 menu が渡される                                                                                 | 旧 TC-208 |
| TC-344  | `.gitFile.gitDiffPossible` 行を右クリック                     | Boundary - event isolation                                                 | `event.defaultPrevented` が `true` で、`vscode.postMessage` に `viewDiff` が送られない                                                                | 旧 TC-209 |
| TC-345  | type=`D` の deleted file row（`.openFile` icon は存在しない） | Boundary - deleted row menu                                                | icon 非表示でも `showContextMenu` が呼ばれ、`D` は許容 type のため items は 2 件のまま                                                                | 旧 TC-210 |
| TC-346  | right click menu で返された `Open File` 項目を選択            | Normal - menu selection                                                    | `vscode.postMessage` が `{ command: "openFile", repo, filePath, commitHash }` で呼ばれ、`viewDiff` は送られない                                       | 旧 TC-211 |
| TC-347  | expandedCommit が null の状態で `.gitFile` を右クリック       | Validation - missing commit context                                        | `showContextMenu` が呼ばれず、`openFile` message も送信されない                                                                                       | 旧 TC-212 |
| TC-348  | 有効な file row を右クリック                                  | Validation - fixed action scope                                            | `showContextMenu` に渡す items の title 列が `["Open File", "Highlight File History"]` と `toEqual` で一致し、divider（`null`）を含まない             | 旧 TC-213 |

### 失敗源インベントリ（include-or-justify）— Feature 055-07 Task 8 追加分（S52）

| 失敗源                                                | 対応ケースまたは除外理由                                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| tree / list で menu の内容が食い違う                  | TC-342、TC-343                                                                                 |
| 右クリックで `viewDiff` が発火する                    | TC-344、TC-346                                                                                 |
| deleted row で item を落とす                          | TC-345                                                                                         |
| commit context なしで menu を出す                     | TC-347                                                                                         |
| divider や第 3 の item の混入                         | TC-348                                                                                         |
| 第 4 引数の形・stash 判定・request への接続           | excluded(`10-file-history-01.md` S50 TC-328〜TC-330 の責務)                                    |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL） | 0 件: TC-347。2 件固定: TC-342、TC-345、TC-348。maximum / +/-1: excluded(数値閾値が存在しない) |
| 外部依存×失敗モード                                   | excluded(contextmenu handler は DOM event と menu builder だけで外部依存なし)                  |
| 例外・エラー経路                                      | excluded(handler は `items.length === 0` で return し throw 経路を持たない)                    |
| 型不正・フォーマット不正                              | excluded(引数の型は TypeScript の型検査で担保)                                                 |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-347、TC-348
- Exception: excluded(上表のとおり throw 経路なし)
- External: excluded(上表のとおり)
- Boundary: TC-344、TC-345
- Type: excluded(上表のとおり)
- Normal: TC-342、TC-343、TC-346

**失敗系/正常系比（煙感知器）**: 正常系3件、失敗系4件。S37 の 7 case を 2 件 menu の契約へ写した replacement section で、失敗源は表示内容の食い違い・`viewDiff` 発火・guard・混入に限られることを上表で列挙した。比率合わせのためのケース追加・削除は行わない。
