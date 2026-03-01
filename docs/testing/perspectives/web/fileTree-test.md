# テスト観点表: web/fileTree.ts

> Source: `web/fileTree.ts`
> Generated: 2026-03-01T00:00:00+09:00

## S1: generateGitFileListHtml() フラットファイルリスト描画

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01

**シグネチャ**: `generateGitFileListHtml(gitFiles: GG.GitFileChange[]): string`
**テスト対象パス**: `web/fileTree.ts`

| Case ID | Input / Precondition               | Perspective (Equivalence / Boundary) | Expected Result                                                       | Notes                |
| ------- | ---------------------------------- | ------------------------------------ | --------------------------------------------------------------------- | -------------------- |
| TC-001  | 3件のファイル変更（A, M, D）       | Equivalence - normal                 | フルパスのフラット `<ul>/<li>` リスト。ファイルパスのアルファベット順 | ソート検証           |
| TC-002  | ファイル変更タイプ A（追加）       | Equivalence - normal                 | バッジ "A" が表示される。CSS クラスに変更タイプが含まれる             | -                    |
| TC-003  | ファイル変更タイプ D（削除）       | Equivalence - normal                 | バッジ "D" が表示される                                               | -                    |
| TC-004  | ファイル変更タイプ M（変更）       | Equivalence - normal                 | バッジ "M" が表示される                                               | -                    |
| TC-005  | ファイル変更タイプ R（リネーム）   | Equivalence - normal                 | バッジ "R" が表示される。旧パスがツールチップに設定される             | oldFilePath tooltip  |
| TC-006  | 空のファイル変更配列               | Boundary - empty                     | 空のリスト HTML が返される（エラーではない）                          | -                    |
| TC-007  | ファイル要素の CSS クラス          | Equivalence - normal                 | 各要素に gitFile クラスと変更タイプクラスが設定される                 | 既存ツリー表示と同一 |
| TC-008  | ファイル要素の data 属性           | Equivalence - normal                 | data-oldfilepath, data-newfilepath, data-type が設定される            | 既存ツリー表示と同一 |
| TC-009  | additions/deletions カウンター表示 | Equivalence - normal                 | 追加行数・削除行数が正しく表示される                                  | -                    |
| TC-010  | 1件のファイル変更                  | Boundary - min (1 entry)             | 1件のリスト項目を含む HTML が返される                                 | 最小有効件数         |
