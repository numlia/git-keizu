# テスト観点表: web/fileTree.ts

> Source: `web/fileTree.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: generateGitFileListHtml() フラットファイルリスト描画

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**シグネチャ**: `generateGitFileListHtml(gitFiles: GG.GitFileChange[]): string`
**テスト対象パス**: `web/fileTree.ts`

| Case ID | Input / Precondition               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                       | Notes                |
| ------- | ---------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------- |
| TC-001  | 3件のファイル変更（A, M, D）       | Normal - standard                                                          | フルパスのフラット `<ul>/<li>` リスト。ファイルパスのアルファベット順 | ソート検証           |
| TC-002  | ファイル変更タイプ A（追加）       | Normal - standard                                                          | バッジ "A" が表示される。CSS クラスに変更タイプが含まれる             | -                    |
| TC-003  | ファイル変更タイプ D（削除）       | Normal - standard                                                          | バッジ "D" が表示される                                               | -                    |
| TC-004  | ファイル変更タイプ M（変更）       | Normal - standard                                                          | バッジ "M" が表示される                                               | -                    |
| TC-005  | ファイル変更タイプ R（リネーム）   | Normal - standard                                                          | バッジ "R" が表示される。旧パスがツールチップに設定される             | oldFilePath tooltip  |
| TC-006  | 空のファイル変更配列               | Boundary - empty                                                           | 空のリスト HTML が返される（エラーではない）                          | -                    |
| TC-007  | ファイル要素の CSS クラス          | Normal - standard                                                          | 各要素に gitFile クラスと変更タイプクラスが設定される                 | 既存ツリー表示と同一 |
| TC-008  | ファイル要素の data 属性           | Normal - standard                                                          | data-oldfilepath, data-newfilepath, data-type が設定される            | 既存ツリー表示と同一 |
| TC-009  | additions/deletions カウンター表示 | Normal - standard                                                          | 追加行数・削除行数が正しく表示される                                  | -                    |
| TC-010  | 1件のファイル変更                  | Boundary - min (1 entry)                                                   | 1件のリスト項目を含む HTML が返される                                 | 最小有効件数         |

## S2: buildFileItemHtml() アクションアイコン表示

> Origin: Feature 026 (commit-detail-open-file) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: active
> Supersedes: -

**シグネチャ**: `buildFileItemHtml(gitFile: GG.GitFileChange): string`（private — generateGitFileListHtml 経由で間接テスト）
**テスト対象パス**: `web/fileTree.ts`

| Case ID | Input / Precondition                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                      | Notes                        |
| ------- | ---------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------- |
| TC-011  | type "M"（変更）のファイル               | Normal - modified file                                                     | .gitFileAction.openFile 要素が HTML に含まれる       | -                            |
| TC-012  | type "A"（追加）のファイル               | Normal - added file                                                        | .gitFileAction.openFile 要素が HTML に含まれる       | -                            |
| TC-013  | type "R"（リネーム）のファイル           | Normal - renamed file                                                      | .gitFileAction.openFile 要素が HTML に含まれる       | -                            |
| TC-014  | type "D"（削除）のファイル               | Validation - deleted excluded                                              | .gitFileActions 要素が HTML に含まれない             | 削除ファイルはアイコン非表示 |
| TC-015  | type "M" のファイル                      | Normal - icon content                                                      | アイコン要素内に codicon-go-to-file クラスが含まれる | svgIcons.goToFile の検証     |
| TC-016  | 4件のファイル（type "A", "M", "D", "R"） | Boundary - mixed types                                                     | .gitFileAction.openFile 要素が3個（D 以外）存在する  | 条件分岐の網羅               |
