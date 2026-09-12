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

## S54: bindFileViewListeners() 履歴アイコンの描画判定配線とクリックハンドラ

> Origin: Feature 055-09 (light-spec-plan)
> Added: 2026-09-13
> Status: active
> Supersedes: -
> Signature: `bindFileViewListeners(): void`（`.highlightFileHistory`のclick listener） / `buildFilesSectionInnerHtml(fileViewType: FileViewType, fileChanges: GG.GitFileChange[], fileTree: GitFolder): string`
> Target Path: `web/main.ts`（`buildFileHistoryActionPredicate()`・`buildFilesSectionInnerHtml()`・`bindFileViewListeners()`のhighlightFileHistory listener。Task 5完了時に行範囲へ更新）
> Test File: `tests/web/main.test.ts`

`buildFilesSectionInnerHtml()`が`buildFileHistoryActionPredicate()`で作った判定関数を`generateGitFileTreeHtml` / `generateGitFileListHtml`へ渡す配線と、`.highlightFileHistory`のclickで`sendHighlightFileHistoryAction(resolveFileRow(target), this.expandedCommit, this.currentRepo, this.buildFileHistoryMenuContext())`へ委譲して`fileHistory.request()`に至る経路の観点（対応プラン§3.6、§4 Task 3〜Task 4）。判定関数の真偽の根拠は`web/fileMenu-test.md` S6、実HTMLのアイコン構成は`web/fileTree-test.md` S5の責務で本表には含めない。`web/fileTree`はmodule mock（`generateGitFileTreeHtml: vi.fn(() => "<table></table>")`、`generateGitFileListHtml: vi.fn(() => '<ul class="gitFolderContents"></ul>')`）、`web/fileHistory`は`mockFileHistoryInstance`（`request: vi.fn()`）、`web/contextMenu`は`recordRecentAction: vi.fn()`でmockし、`web/fileMenu`は実moduleが動く。fixtureは`ICON_ROW_HTML = '<table><tr class="gitFile M gitDiffPossible" data-oldfilepath="src%2Ffile.ts" data-newfilepath="src%2Ffile.ts" data-type="M"><td><span class="gitFileActions"><span class="gitFileAction openFile" title="Open File">icon</span><span class="gitFileAction highlightFileHistory" title="Highlight File History"><span class="codicon codicon-history"></span></span></span></td></tr></table>'`、click対象は`.highlightFileHistory .codicon-history`、`predicateOf(n)`は`vi.mocked(generateGitFileTreeHtml).mock.calls[n][2]`。

| Case ID | Input / Precondition                                                                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                      | Notes                                 |
| ------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| TC-372  | 通常commit（`COMMIT_HASH_1`）を展開し`commitDetails`応答                                                                  | Normal - 判定関数の配線（tree）                                            | `generateGitFileTreeHtml`の第3引数が関数で、`A` / `M` / `D` / `R`の`GitFileChange`で`true`、`T`（cast）と`type`欠落（cast）で`false` | F2                                    |
| TC-373  | uncommitted（hash `*`）を展開                                                                                             | Validation - uncommittedの配線                                             | 第3引数の関数が`M`で`false`                                                                                                          | -                                     |
| TC-374  | stash commit（`COMMITS_WITH_STASH`、`stash !== null`）を展開                                                              | Validation - stashの配線                                                   | `M`で`false`                                                                                                                         | stashを常にfalseにする実装を検出      |
| TC-375  | `expandCommitWithCompare(COMMIT_HASH_1, COMMIT_HASH_2)`                                                                   | Validation - 比較表示の配線                                                | 比較応答時の呼出の第3引数が`M`で`false`                                                                                              | -                                     |
| TC-376  | TC-372の後`#fileViewToggle`をclick                                                                                        | Normal - 判定関数の配線（list）                                            | `generateGitFileListHtml`が1回呼ばれ、第2引数の関数が`M`で`true`、`T`で`false`                                                       | `handleFileViewToggle()`              |
| TC-377  | `ICON_ROW_HTML`で展開しglyphをclick                                                                                       | Normal - request委譲                                                       | `mockFileHistoryInstance.request`が`(COMMIT_HASH_1, "src/file.ts")`で1回、`postMessage`に`viewDiff`なし                              | -                                     |
| TC-378  | `data-newfilepath`が`encodeURIComponent("src/テスト ファイル.ts")`のfixture                                               | Boundary - special characters                                              | 第2引数が`"src/テスト ファイル.ts"`                                                                                                  | -                                     |
| TC-379  | `ICON_ROW_HTML`（`gitDiffPossible`行）でglyphをclick                                                                      | Normal - event isolation                                                   | `postMessage`の呼出が0回                                                                                                             | 親`.gitFile`の`viewDiff`不発火        |
| TC-380  | TC-372の後toggleで`<ul>`版のICON fixtureへ切替えglyphをclick                                                              | Normal - 切替後の再bind                                                    | `request`が1回                                                                                                                       | `web/main.ts:1823`                    |
| TC-381  | `ICON_ROW_HTML`で展開後、glyph要素の参照を保持したまま同commitをclickして閉じ、保持したglyphへclick                       | Validation - expandedCommit null                                           | `request`0回                                                                                                                         | `hideCommitDetails()`後の残存listener |
| TC-382  | `.gitFile`の外に置いた`<span class="gitFileAction highlightFileHistory">`をclick                                          | Validation - 行解決失敗                                                    | `request`0回                                                                                                                         | `resolveFileRow()`が`null`            |
| TC-383  | `data-newfilepath`を持たない行のglyphをclick                                                                              | Validation - dataset欠落                                                   | `request`0回                                                                                                                         | -                                     |
| TC-384  | uncommittedをICON fixtureで展開しglyphをclick                                                                             | Validation - click時uncommitted                                            | 0回                                                                                                                                  | -                                     |
| TC-385  | stashをICON fixtureで展開しglyphをclick                                                                                   | Validation - click時stash                                                  | 0回                                                                                                                                  | -                                     |
| TC-386  | `data-type="T"`の行と`data-type`欠落の行（ICON付き）のglyphをclick                                                        | Validation - click時許容外type                                             | 各0回                                                                                                                                | -                                     |
| TC-387  | `ICON_ROW_HTML`で展開後`clickCommit(COMMIT_HASH_2, { ctrlKey: true })`し応答を送らずglyphをclick                          | Boundary - 比較待ち（commit経路）                                          | `request`0回、`viewDiff`0回、`compareCommits`は1回送信済み                                                                           | F1                                    |
| TC-388  | uncommittedを含む一覧で通常commitをICON fixtureで展開後`clickUnsavedChanges({ metaKey: true })`し応答を送らずglyphをclick | Boundary - 比較待ち（uncommitted経路）                                     | `request`0回、`viewDiff`0回                                                                                                          | F1                                    |
| TC-389  | TC-387の後に`compareCommits`応答を送る                                                                                    | Validation - 比較応答後                                                    | 直近の`generateGitFileTreeHtml`呼出の第3引数が`M`で`false`                                                                           | 実HTMLの0個はfileTree S5              |
| TC-390  | TC-389の後`clickCommit(COMMIT_HASH_2, { ctrlKey: true })`で解除（`ICON_ROW_HTML`を`mockReturnValueOnce`）しglyphをclick   | Normal - 解除後の再起動                                                    | `request`が1回                                                                                                                       | 拒否が残らない                        |
| TC-391  | `A` / `D` / `R`のICON行fixture                                                                                            | Normal - 許容typeの網羅                                                    | 各1回、第1引数`COMMIT_HASH_1`                                                                                                        | -                                     |
| TC-392  | `isActive`→`true`、次に`isPending`→`true`でglyphをclick                                                                   | Normal - active / pending中                                                | それぞれ`request`が同じ引数で1回                                                                                                     | 新しい規則なし                        |
| TC-393  | TC-377のclick後                                                                                                           | Normal - recent action非記録                                               | `recordRecentAction`0回                                                                                                              | -                                     |

### 失敗源インベントリ（include-or-justify）— Feature 055-09 追加分（S54）

| 失敗源                                                                                                                           | 対応ケースまたは除外理由                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 配線の渡し忘れ・stash常時false（判定関数を渡さない、uncommitted / stash / 比較表示で`true`を返す関数を渡す、list切替で渡さない） | TC-372〜TC-376                                                                                                                   |
| 描画時判定のキャッシュ（click時に再評価せず比較待ち中に起動する・解除後も拒否が残る）                                            | TC-387〜TC-390                                                                                                                   |
| 伝播（親`.gitFile`の`viewDiff`が発火する）                                                                                       | TC-379                                                                                                                           |
| 再bind漏れ（tree / list切替後にlistenerが付かない）                                                                              | TC-380                                                                                                                           |
| DOM経路のガード（閉じた後の残存要素・行解決失敗・dataset欠落で起動する）                                                         | TC-381〜TC-383                                                                                                                   |
| click時の4条件（uncommitted / stash / 許容外typeで起動する・許容typeを取りこぼす）                                               | TC-384〜TC-386、TC-391                                                                                                           |
| payloadのdrift・encode済みpathの素通し・recent action記録・mode中の抑止                                                          | TC-377、TC-378、TC-392、TC-393                                                                                                   |
| 判定関数の真偽の根拠・実HTMLのアイコン構成                                                                                       | excluded(`web/fileMenu-test.md` S6 / `web/fileTree-test.md` S5の責務)                                                            |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL）                                                                            | 0回: TC-379、TC-381〜TC-389。`null` context: TC-381。dataset欠落: TC-383、TC-386。maximum / +/-1: excluded(数値閾値が存在しない) |
| 外部依存×失敗モード                                                                                                              | excluded(`fileHistory.request`はmockで呼出だけを観測し、失敗モードは`web/fileHistory-test.md`の責務)                             |
| 例外・エラー経路                                                                                                                 | excluded(listenerはhelperの早期returnで表現しthrow経路を持たない)                                                                |
| 型不正・フォーマット不正                                                                                                         | excluded(引数の型はTypeScriptの型検査で担保し、`data-type`の未知値はTC-372 / TC-386で固定)                                       |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-373〜TC-375、TC-381〜TC-386、TC-389
- Exception: excluded(上表のとおりthrow経路なし)
- External: excluded(上表のとおり)
- Boundary: TC-378、TC-387、TC-388
- Type: excluded(上表のとおり)
- Normal: TC-372、TC-376、TC-377、TC-379、TC-380、TC-390〜TC-393

**失敗系/正常系比（煙感知器）**: 正常系9件、失敗系13件。配線の4状態（通常 / uncommitted / stash / 比較）と click 時の4条件・3ガード・比較待ちをそれぞれ失敗源として列挙し、比1.4倍がインベントリから導かれた値であることを確認した。比率合わせのためのケース追加・削除は行わない。
