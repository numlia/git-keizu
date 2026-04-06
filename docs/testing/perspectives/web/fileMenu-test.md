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
