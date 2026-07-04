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

## S3: generateGitFileTreeHtml() ツリー描画時の HTML エスケープ

> Origin: フェーズ1 修正 H1 (commit-details-tree-escape)
> Added: 2026-07-04T01:35:00Z
> Status: active
> Supersedes: -
> Signature: `export function generateGitFileTreeHtml(folder: GitFolder, gitFiles: GitFileChange[]): string`
> Target Path: `web/fileTree.ts:69-99`

フォルダ名（`folder.name`, L72）とファイル表示名（`folder.contents[keys[i]].name`, L95）をツリー HTML へ埋め込む際に `escapeHtml` を適用する修正。`escapeHtml` の変換表: `&`→`&amp;`, `<`→`&lt;`, `>`→`&gt;`, `"`→`&quot;`, `'`→`&#x27;`, `/`→`&#x2F;`。

| Case ID | Input / Precondition                                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                     | Notes                                |
| ------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| TC-017  | `folder.name="<script>alert(1)</script>"`（開いたフォルダ）                            | Validation - XSS escape (folder name)                                      | 出力 HTML が `<span class="gitFolderName">&lt;script&gt;alert(1)&lt;&#x2F;script&gt;</span>` を含む。生の `<script>` 文字列を含まない               | `<`/`>`/`/` がエスケープされる       |
| TC-018  | `folder.name="a&b"`                                                                    | Validation - ampersand escape (folder name)                                | 出力 HTML が `<span class="gitFolderName">a&amp;b</span>` を含む。生の `a&b` を含まない                                                             | `&` エスケープ                       |
| TC-019  | `folder.name="say\"hi\" it's"`（二重・単一引用符含む）                                 | Validation - quote escape (folder name)                                    | 出力 HTML が `&quot;hi&quot;` と `it&#x27;s` を含む。生の `"` および `'` を `gitFolderName` span 内に含まない                                       | `"`/`'` エスケープ                   |
| TC-020  | `folder.name="a/b"`（スラッシュ含む）                                                  | Validation - slash escape (folder name)                                    | 出力 HTML が `<span class="gitFolderName">a&#x2F;b</span>` を含む。生の `a/b` を span テキストに含まない                                            | `/` も `&#x2F;` へ変換される         |
| TC-021  | `folder.name="src"`（特殊文字なし）                                                    | Normal - plain folder name                                                 | 出力 HTML が `<span class="gitFolderName">src</span>` を含む。HTML エンティティ（`&amp;`/`&lt;` 等）を含まない                                      | エスケープ対象外はそのまま           |
| TC-022  | `folder.name=""`（ルートフォルダ）                                                     | Boundary - empty folder name                                               | 出力 HTML が `<span class="gitFolderName">` を含まない（L72 三項が空文字を返す）。`gitFolder` span 自体が描画されない                               | 空名時は escapeHtml 経路に入らない   |
| TC-023  | ファイル要素の `contents[key].name="<img src=x onerror=y>.ts"`（ツリー直下のファイル） | Validation - XSS escape (file basename)                                    | `buildFileItemHtml` に渡る displayName が `&lt;img src=x onerror=y&gt;.ts` となり、生成された `<li class="gitFile ...">` 内に生の `<img` を含まない | 表示名がエスケープ済みで埋め込まれる |
| TC-024  | ファイル要素の `contents[key].name="main.ts"`（特殊文字なし）                          | Normal - plain file basename                                               | `<li class="gitFile ...">` 内に `main.ts` をそのまま含む。HTML エンティティを含まない                                                               | エスケープ対象外はそのまま           |
| TC-025  | 親フォルダ配下の子フォルダ `child.name="<b>&"`（ネスト構造）                           | Validation - nested folder escape                                          | 再帰呼び出しで生成される子フォルダの `<span class="gitFolderName">&lt;b&gt;&amp;</span>` を出力 HTML が含む。生の `<b>&` を含まない                 | 再帰経路でも escapeHtml が適用される |
