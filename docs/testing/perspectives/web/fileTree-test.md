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
> Status: superseded
> Supersedes: -
> Superseded By: S5

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

## S4: generateGitFileTree() 同名 file→folder 差し替え

> Origin: フェーズ2 修正 M13 (file-tree-file-to-folder-replacement)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: `export function generateGitFileTree(gitFiles: GitFileChange[]): GitFolder`
> Target Path: `web/fileTree.ts:16-40`

ツリー構築時、中間パスセグメントの既存ノード判定を `cur.contents[path[j]] === undefined` から `cur.contents[path[j]] === undefined || cur.contents[path[j]].type === "file"` へ拡張する修正。既に `file` ノードとして存在するセグメントを `folder` ノードへ差し替えて降下を継続する。同一コミット内に `foo`（ファイル）と `foo/bar`（`foo` をディレクトリとするファイル）が混在しても、`file` ノードの存在しない `contents` へアクセスしてクラッシュすることなくツリーを構築できる。

| Case ID | Input / Precondition                                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                            | Notes                                |
| ------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| TC-026  | 中間セグメントが未定義（`cur.contents[path[j]] === undefined`）             | Normal - new folder segment                                                | 当該セグメントに新規 `folder` ノード（空 `contents`）が作成され、`cur` がその folder へ降下する            | 通常のフォルダ生成経路               |
| TC-027  | 中間セグメントが既存 `folder` ノード                                        | Normal - existing folder reused                                            | 差し替えずに既存 folder を再利用して降下する（`contents` が保持される）                                    | 既存フォルダは維持                   |
| TC-028  | 中間セグメントが既存 `file` ノード（先に `foo`(file)、次に `foo/bar`）      | Boundary - file to folder replacement                                      | 当該セグメントの `file` ノードが `type==="folder"`・空 `contents` の folder へ差し替えられ、降下が継続する | 修正の肝（同名衝突の解消）           |
| TC-029  | file→folder 差し替え後、末端の `bar` を追加                                 | Boundary - leaf added under replaced folder                                | 差し替えた folder の `contents["bar"]` に葉 `file` ノードが追加される                                      | 差し替え後の葉登録                   |
| TC-030  | gitFiles=[`{newFilePath:"foo"}`, `{newFilePath:"foo/bar"}`]（同名衝突入力） | Exception - collision handled without throw                                | `generateGitFileTree` が例外を投げず完了し、結果ツリーで `foo` が `bar` を含む `folder` になる             | 旧実装ではクラッシュしていた回帰防止 |

## S5: buildFileItemHtml() 履歴アイコン描画と判定関数の受け渡し

> Origin: Feature 055-09 (light-spec-plan)
> Added: 2026-09-13
> Status: active
> Supersedes: S2
> Signature: `generateGitFileListHtml(gitFiles: GitFileChange[], canHighlightFileHistory: FileHistoryActionPredicate): string` / `generateGitFileTreeHtml(folder: GitFolder, gitFiles: GitFileChange[], canHighlightFileHistory: FileHistoryActionPredicate): string`（`buildFileItemHtml()`は非exportで両関数経由）
> Target Path: `web/fileTree.ts`（`buildFileItemHtml()`・`generateGitFileTreeHtml()`・`generateGitFileListHtml()`。Task 5完了時に行範囲へ更新）
> Test File: `tests/web/fileTree.test.ts`

S2は`openFile`アイコンだけを前提にし、`D`行では`.gitFileActions`自体を描画しない契約（TC-014）だったが、対応プラン§3.5で`.gitFileAction.openFile`の直後に`.gitFileAction.highlightFileHistory`を並べ、`D`行でも判定関数が`true`なら履歴アイコンだけを描画する契約へ変わったため、S2のアクションアイコン契約を新signatureの下で再定義する。`web/fileTree.ts`は判定関数`FileHistoryActionPredicate`を行ごとに1回呼ぶだけで、uncommitted / stash / 比較表示 / typeの4条件の中身は`web/fileMenu-test.md` S6、`web/main.ts`が渡す関数の形は`web/main-test/06-file-actions-01.md` S54の責務で本表には含めない。基本fixtureは`makeFile()`（`M`、`src/file.ts`、+5 / -2）、`ALLOW = () => true`、`DENY = () => false`。

| Case ID | Input / Precondition                                                                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                  | Notes              |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| TC-031  | list、`M`行、ALLOW                                                                                                                    | Normal - 2アイコンの順序                                                   | `.gitFileActions`の子要素が2個で、`children[0]`が`.gitFileAction.openFile`、`children[1]`が`.gitFileAction.highlightFileHistory` | 順序固定           |
| TC-032  | list、`M`行、ALLOW                                                                                                                    | Normal - 履歴アイコンの内容                                                | `.highlightFileHistory`の`title`属性が`Highlight File History`で、内側に`.codicon-history`要素がある                             | `svgIcons.history` |
| TC-033  | list、`D`行、ALLOW                                                                                                                    | Boundary - D行は履歴のみ                                                   | `.gitFileActions`が存在し子要素が1個で`.highlightFileHistory`。`.openFile`は`null`                                               | 旧TC-014の契約変更 |
| TC-034  | list、`A`行と`R`行、ALLOW                                                                                                             | Normal - 許容typeの網羅                                                    | 両行とも子要素が2個で2個目が`.highlightFileHistory`                                                                              | 旧TC-012 / TC-013  |
| TC-035  | list、`M`行、DENY                                                                                                                     | Validation - 判定false                                                     | `.openFile`が存在し、`.highlightFileHistory`が`null`、`.gitFileActions`の子要素が1個                                             | 旧TC-011 / TC-015  |
| TC-036  | list、`D`行、DENY                                                                                                                     | Boundary - アイコン0個                                                     | `.gitFileActions`が`null`                                                                                                        | 現行D行と同じ      |
| TC-037  | list、`A` / `M` / `D` / `R`の4行、ALLOW                                                                                               | Boundary - 混在                                                            | `.highlightFileHistory`が4個、`.openFile`が3個、`.codicon-go-to-file`が3個                                                       | 旧TC-016           |
| TC-038  | list、3行、`vi.fn(() => true)`                                                                                                        | Normal - 行ごとの委譲                                                      | 判定関数が3回呼ばれ、各呼出の第1引数がその行の`GitFileChange`と同一参照                                                          | `toBe`             |
| TC-039  | tree、`generateGitFileTree()`で`src/deep/a.ts`(A) / `src/deep/m.ts`(M) / `src/deep/d.ts`(D) / `src/deep/r.ts`(R)、`vi.fn(() => true)` | Normal - 再帰伝達                                                          | `.highlightFileHistory`が4個、`.openFile`が3個、判定関数が4回呼ばれる                                                            | `src/deep/`配下    |
| TC-040  | tree、TC-039と同じ4行、DENY                                                                                                           | Validation - 再帰でも非描画                                                | `.highlightFileHistory`が0個、`.openFile`が3個、`.gitFileActions`が3個                                                           | -                  |
| TC-041  | `M`行と`D`行の同じ入力をlistとtreeで生成、ALLOW                                                                                       | Normal - 表示形式の一致                                                    | `data-newfilepath`が同じ行同士で`.gitFileActions`の`innerHTML`が一致する                                                         | -                  |

### 失敗源インベントリ（include-or-justify）— Feature 055-09 追加分（S5）

| 失敗源                                                                                        | 対応ケースまたは除外理由                                                                                  |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 全行非描画の手抜き（判定結果を無視して履歴アイコンを出さない）                                | TC-037、TC-039                                                                                            |
| 判定を`fileTree`内で決める（渡された関数を呼ばない）                                          | TC-038                                                                                                    |
| 再帰で判定が落ちる（子フォルダへ関数を渡さない）                                              | TC-039、TC-040                                                                                            |
| `D`行の0個判定（`openFile`なしで`.gitFileActions`を空のまま描画・または履歴アイコンも落とす） | TC-033、TC-036                                                                                            |
| 順序逆転（`highlightFileHistory`が`openFile`より前に並ぶ）                                    | TC-031                                                                                                    |
| list / treeの食い違い                                                                         | TC-041                                                                                                    |
| 4条件の中身・`web/main.ts`が渡す関数の形                                                      | excluded(`web/fileMenu-test.md` S6 / `web/main-test/06-file-actions-01.md` S54の責務)                     |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL）                                         | 0個: TC-036、TC-040。1個: TC-033、TC-035。混在4行: TC-037。maximum / +/-1: excluded(数値閾値が存在しない) |
| 外部依存×失敗モード                                                                           | excluded(HTML生成は引数と`t()`・`svgIcons`の定数だけで外部依存なし)                                       |
| 例外・エラー経路                                                                              | excluded(判定`false`は非描画で表現しthrow経路を持たない)                                                  |
| 型不正・フォーマット不正                                                                      | excluded(`FileHistoryActionPredicate` / `GitFileChange`の型はTypeScriptの型検査で担保)                    |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-035、TC-040
- Exception: excluded(上表のとおりthrow経路なし)
- External: excluded(上表のとおり)
- Boundary: TC-033、TC-036、TC-037
- Type: excluded(上表のとおり)
- Normal: TC-031、TC-032、TC-034、TC-038、TC-039、TC-041

**失敗系/正常系比（煙感知器）**: 正常系6件、失敗系5件。S2の6 caseを判定関数付きsignatureへ写したreplacement sectionで、失敗源は非描画・判定の自前化・再帰・`D`行・順序・表示形式差に限られることを上表で列挙した。比率合わせのためのケース追加・削除は行わない。
