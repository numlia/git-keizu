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
> Status: active
> Supersedes: -

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
