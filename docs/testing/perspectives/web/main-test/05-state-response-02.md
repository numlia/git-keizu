# テスト観点表: web/main.ts

> Source: `web/main.ts`
> Generated: 2026-07-04T02:44:58Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: state-response

## S41: buildAuthorOptions() 全著者 ∪ 選択中著者のマージ

> Origin: フェーズ2 修正 M12 (author-dropdown-merge-options)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: `function buildAuthorOptions(authors: string[], selectedAuthors: string[]): { options: { name: string; value: string }[]; selected: string[] }`
> Target Path: `web/main.ts:93-104`

`buildAuthorOptions` を「全著者リスト ∪ 選択中著者（`authors` に未含有の分だけ末尾追加）」のマージ方式へ変更する修正。`mergedAuthors = [...authors, ...selectedAuthors.filter((a) => !authors.includes(a))]` を基に `[All Authors, ...mergedAuthors]` のオプションを構築し、`selected` は `selectedAuthors` をそのまま返す。フィルタ選択中の著者が現在の著者候補に存在しなくてもオプションから欠落しないことを保証する。

| Case ID | Input / Precondition                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                    | Notes                      |
| ------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| TC-229  | authors=["Alice","Bob"], selectedAuthors=["Alice"]                           | Normal - selected already in authors                                       | options が `[All Authors, Alice, Bob]`（Alice は重複追加されない）、selected が `["Alice"]`                        | 選択が候補内のとき重複なし |
| TC-230  | authors=["Alice"], selectedAuthors=["Bob"]（Bob は authors に不在）          | Normal - selected appended                                                 | options が `[All Authors, Alice, Bob]`（未含有の Bob を末尾に追加）、selected が `["Bob"]`                         | 候補外の選択をマージ       |
| TC-231  | authors=[], selectedAuthors=[]                                               | Boundary - empty merge                                                     | options が `[All Authors]` のみ、selected が `[]`                                                                  | 空マージ境界               |
| TC-232  | authors=["Alice"], selectedAuthors=["Alice","Charlie"]                       | Boundary - partial out-of-list                                             | options が `[All Authors, Alice, Charlie]`（Alice は重複せず Charlie を追加）、selected が `["Alice","Charlie"]`   | 一部のみ候補外             |
| TC-233  | authors=["Alice","Bob"], selectedAuthors=["Bob","Alice"]（順序違い・全内包） | Boundary - dedup preserves author order                                    | options が `[All Authors, Alice, Bob]`（authors の順序を維持し重複追加なし）、selected が `["Bob","Alice"]` のまま | 重複排除と順序保持         |

## S42: loadCommits() Author ドロップダウンの無条件再構築

> Origin: フェーズ2 修正 M12 (author-dropdown-unconditional-rebuild)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: S16, S21, S23
> Signature: `public loadCommits(commits, commitHead, moreAvailable, hard, authors?)`
> Target Path: `web/main.ts:477-486`

`loadCommits` から `if (this.selectedAuthors.length === 0)` ガードを撤廃し、著者ドロップダウンを常に再構築する修正。`authorList` は `authors`（サーバー提供）優先、未提供時は `commits` から重複排除・ソートで算出し、`buildAuthorOptions(authorList, this.selectedAuthors)`（S41）でマージして `authorDropdown.setOptions(options, selected)` を常時呼ぶ。これによりフィルタ選択中でもドロップダウンが再構築され、かつ選択状態が保持される。旧 S16（フィルタ時はリスト非更新）/ S21（`authorFilter !== null` でスキップ）/ S23（フィルタ選択中は非更新）を置き換える。

| Case ID | Input / Precondition                                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                       | Notes                                                    |
| ------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| TC-234  | selectedAuthors=[]（フィルタなし）、authors=["Alice","Bob"] 提供                | Normal - no filter rebuild                                                 | `authorDropdown.setOptions` が options=`[All Authors, Alice, Bob]`、selected=`[]` で1回呼ばれる                                       | サーバー提供リストで再構築                               |
| TC-235  | selectedAuthors=["Alice"]（フィルタ選択中）、authors=["Alice","Bob"] 提供       | Normal - filter active still rebuilds                                      | `authorDropdown.setOptions` が options=`[All Authors, Alice, Bob]`、selected=`["Alice"]` で呼ばれる（旧スキップ挙動を廃止・選択維持） | 修正の肝（旧 S16/TC-110・S21/TC-132・S23/TC-144 を置換） |
| TC-236  | authors=undefined（サーバー未提供）、commits の author が ["Bob","Alice","Bob"] | Boundary - fallback extraction                                             | `authorList` が `commits` から重複排除・ソートされた `["Alice","Bob"]` となり、その内容で `setOptions` が呼ばれる                     | 旧 S21/TC-130 のフォールバックを継承                     |
| TC-237  | authors=[]（空著者リスト）、selectedAuthors=[]                                  | Boundary - empty author list                                               | `authorDropdown.setOptions` が options=`[All Authors]` のみで呼ばれる                                                                 | 旧 S16/TC-111・S21/TC-131 を継承                         |
| TC-238  | selectedAuthors=["Charlie"] が authors=["Alice","Bob"] に不在                   | Boundary - selected out of author list preserved                           | options が `[All Authors, Alice, Bob, Charlie]`（選択中著者をマージ）、selected=`["Charlie"]` が維持される                            | 候補外選択が欠落しない                                   |
| TC-239  | Author "Alice" をドロップダウンで選択（selectedAuthors=["Alice"]）              | Normal - filter request sent                                               | `requestLoadCommits` により送信メッセージへ `authors: ["Alice"]` が含まれる                                                           | 旧 S16/TC-108・S23/TC-142 を継承                         |
| TC-240  | "All Authors" を選択（selectedAuthors=[]）                                      | Normal - filter cleared                                                    | 送信メッセージへ `authors: []` が含まれる（全コミット表示）                                                                           | 旧 S16/TC-109・S23/TC-141 を継承                         |

## S43: loadAvatar() dataset.email 生メール比較によるアバター適用

> Origin: フェーズ3 修正 L15 (avatar-raw-email-compare)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: -
> Signature: `public loadAvatar(email: string, image: string): void`
> Target Path: `web/main.ts:497-506`

`.avatar` 要素の突合を `avatarsElems[i].dataset.email === escapeHtml(email)` から生メール同士の比較 `avatarsElems[i].dataset.email === email` へ変更する修正。`dataset.email` は生メール（L16 で読み取り側の unescape も除去）で格納されるため、旧実装は `escapeHtml(email)` と生メールを比較しており、HTML 特殊文字を含むメールでアバターが一致せず適用されなかった。`image` は `img` の `src` へ埋め込む際に従来どおり `escapeHtml` される。

| Case ID | Input / Precondition                                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                 | Notes                          |
| ------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| TC-241  | `dataset.email="a@x.com"` の `.avatar` 要素があり `loadAvatar("a@x.com", img)`                | Normal - plain email match                                                 | `this.avatars["a@x.com"]=img`、`saveState()` が呼ばれ、一致要素の innerHTML が `<img class="avatarImg" src="...">` に更新される | 通常メール                     |
| TC-242  | `dataset.email="a<b@x.com"`（HTML 特殊文字を含む生メール）の要素があり同メールで `loadAvatar` | Boundary - special-char email match                                        | 生メール同士が一致し innerHTML が更新される（旧 `escapeHtml(email)` 比較では不一致で未適用だった）                              | L15 の中核回帰                 |
| TC-243  | どの `.avatar` 要素の `dataset.email` にも一致しないメールで `loadAvatar`                     | Boundary - no matching element                                             | `this.avatars[email]=img` と `saveState()` は実行されるが、どの要素の innerHTML も変更されない                                  | 非一致時の副作用範囲           |
| TC-244  | `image` に `"` を含む値で `loadAvatar`（一致要素あり）                                        | Boundary - image escaped in src                                            | 一致要素の innerHTML の `src` 属性値が `escapeHtml(image)` 済みで、属性が破壊されない                                           | XSS 防止（src エスケープ維持） |
| TC-245  | 同一 `dataset.email` の `.avatar` 要素が複数あり `loadAvatar`                                 | Boundary - multiple matches updated                                        | 一致する全要素の innerHTML が更新される                                                                                         | 複数一致                       |

## S45: 展開コミット復元時 loading 分岐での commitDetails 再送

> Origin: フェーズ3 修正 L17 (restore-loading-resend-commit-details)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: -
> Signature: コミット行クリック／復元時の展開処理（`expandedCommit` 分岐）
> Target Path: `web/main.ts:804-816`

`expandedCommit` の展開処理で、`commitDetails`/`fileTree` が未取得かつ `loading===true` の分岐に、`commitDetailsOpen` クラス付与と `renderCommitDetailsView()` に続けて `commitDetails` メッセージの再送を追加する修正。webview state 復元で loading 状態のまま拡張機能側にリクエストが届いていないケースで、詳細取得を再要求する。payload の `hasParents`/`isStash` は `commitLookup` から引いたコミットの有無で決定（`commit !== undefined && ...`）。

| Case ID | Input / Precondition                                                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                       | Notes                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TC-252  | `expandedCommit.loading===true`、details/fileTree 未取得、`commitLookup` に該当コミットあり（親あり・stash なし） | Normal - loading resend with commit                                        | `commitDetailsOpen` 付与・`renderCommitDetailsView()` 実行後、`sendMessage` が `command:"commitDetails"`, `commitHash`, `hasParents:true`, `isStash:false` で送られる | 復元時の再送                                                                                                                                                                                                                                                                                                                                                                                                             |
| TC-253  | `expandedCommit.loading===true`、`commitLookup` に該当コミットが不在（`commit===undefined`）                      | Boundary - commit not found                                                | 送信 payload が `hasParents:false`, `isStash:false` になる（`commit !== undefined` ガード）                                                                           | ルックアップ欠落境界。未カバー: 描画される commit 行（`commitElems`）と `commitLookup` はいずれも同一の `this.commits` 配列から生成されるため、行 elem が見つかりつつ `commitLookup[hash]` のみ `undefined` になる状態を公開メッセージ/DOM 経由で構成できない（防御的ガードで実運用では不到達）。`commit !== undefined` ガード自体はコードレビューで担保。                                                               |
| TC-254  | `expandedCommit.loading===true`、該当コミットが stash（`stash !== null`）                                         | Boundary - stash commit                                                    | 送信 payload が `isStash:true` になる                                                                                                                                 | stash 判定                                                                                                                                                                                                                                                                                                                                                                                                               |
| TC-255  | `expandedCommit.commitDetails` と `fileTree` が取得済み                                                           | Normal - cached details path                                               | `showCommitDetails()` が呼ばれ、`commitDetails` 再送は行われない                                                                                                      | 先行分岐（再送しない）                                                                                                                                                                                                                                                                                                                                                                                                   |
| TC-256  | `expandedCommit.loading===false` かつ details/fileTree 未取得                                                     | Boundary - not loading path                                                | `loadCommitDetails(elem)` が呼ばれ、`commitDetails` 再送は行われない                                                                                                  | else 分岐。未カバー: `expandedCommit` が `loading===false` かつ詳細未取得となる状態は state 復元（`vscode.getState()`）で永続化された expandedCommit を構築時に読み込む経路でのみ発生し、公開メッセージ/DOM 操作では到達不能。加えて else 分岐の `loadCommitDetails` も `commitDetails` を送信するため、loading 分岐の再送との観測差分が乏しい。実装済み TC-252/254（loading 再送）と TC-255（cached）で近傍分岐を担保。 |

## S59: ref一覧とcontrollerの破棄・保持（表置換・リポジトリ切替・無変更更新・scroll）

> Origin: Feature 059-02 (light-spec-plan)
> Added: 2026-09-24
> Status: active
> Supersedes: -
> Signature: `public loadCommits(commits, commitHead, moreAvailable, forceRender, authors?, worktrees?)` / `public loadRepos(repos, lastActiveRepo): boolean` / `public selectRepo(repo: string)` / repoDropdownの変更callback / `private renderShowLoading()` / `#scrollContainer` のscroll処理
> Target Path: `web/main.ts`（上記各経路でのdetach / closePopup の呼出し。実装後に行範囲へ更新）
> Test File: `tests/web/main.refOverflow.test.ts`

表置換・loading表示・リポジトリ切替の開始では一覧と一覧起点メニューを閉じてcontrollerをdetachし、無変更更新・一覧内scrollでは一覧を保持する。一覧は実controllerでcounterをclickして開き、一覧起点メニューは複製の右クリックで開く。ホスト側の取得処理は対象外。

| Case ID | Input / Precondition                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                 | Notes                                 |
| ------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| TC-464  | 一覧と一覧起点メニューを開いた状態で、refの変わったcommitsを `loadCommits`              | Normal - 表置換で閉鎖                                                      | `hideContextMenu` が呼ばれ、旧一覧と旧複製が `isConnected === false`。新しい表の行に `.refOverflowCounter` が描画され直している | AC-06                                 |
| TC-465  | 一覧を開いた状態で、同じcommits・head・worktreesを `forceRender=false` で `loadCommits` | Boundary - 無変更更新で保持                                                | `.refOverflowPopup` が1個のまま、一覧起点メニューへの `hideContextMenu` 0回、`onMinimumWidth` による `min-width` 解除なし       | 無変更returnに閉鎖を追加しない。AC-07 |
| TC-466  | 一覧を開いた状態で、追加読み込み後の増えたcommitsを `loadCommits`                       | Normal - 追加読み込みで閉鎖                                                | 一覧が0個になり、旧複製が `isConnected === false`                                                                               | AC-06                                 |
| TC-467  | 一覧を開いた状態で、repoDropdownで別リポジトリを選択                                    | Normal - ドロップダウン切替の開始で閉鎖                                    | 次の `loadCommits` 要求を送る前に一覧が0個になり、`#content` と表の `min-width` が解除される                                    | AC-06                                 |
| TC-468  | 一覧を開いた状態で `selectRepo(存在するrepo)`                                           | Normal - selectRepo経路で閉鎖                                              | 一覧が0個になり、controllerがdetachされる                                                                                       | AC-06                                 |
| TC-469  | 一覧を開いた状態で `selectRepo(未登録repo)`                                             | Boundary - 切替が起きない呼出し                                            | 既存の早期returnで一覧が1個のまま                                                                                               | -                                     |
| TC-470  | 一覧を開いた状態で、現在のrepoを含まない `loadRepos`                                    | Normal - loadRepos経路で閉鎖                                               | 一覧が0個になり、controllerがdetachされる                                                                                       | AC-06                                 |
| TC-471  | 一覧を開いた状態で、現在のrepoを含む `loadRepos`                                        | Boundary - 切替なしのloadRepos                                             | 一覧が1個のまま                                                                                                                 | -                                     |
| TC-472  | 一覧を開いた状態でhard refreshによりloading表示へ切り替わる                             | Normal - loading表示で閉鎖                                                 | `#loadingHeader` の表示時点で一覧が0個、controllerがdetachされている                                                            | -                                     |
| TC-473  | 一覧と一覧起点メニューを開いた状態で `#scrollContainer` のscrollを発火                  | Normal - 表scrollで閉鎖                                                    | 一覧が0個になり `hideContextMenu` が1回呼ばれる                                                                                 | AC-06                                 |
| TC-474  | 一覧を開いた状態で `.refOverflowPopup` 自身のscrollを発火                               | Validation - 一覧内scrollで閉じない                                        | 一覧が1個のまま                                                                                                                 | AC-07                                 |

### 失敗源インベントリ（include-or-justify）— Feature 059-02 追加分（S59）

| 失敗源                             | 対応ケースまたは除外理由                      |
| ---------------------------------- | --------------------------------------------- |
| 表置換後に古い一覧・メニューが残る | TC-464、TC-466、TC-472                        |
| 無変更更新で一覧が閉じる           | TC-465                                        |
| 切替経路の一部で破棄漏れ           | TC-467、TC-468、TC-470                        |
| 切替が起きない呼出しで閉じる       | TC-469、TC-471                                |
| scroll判定の誤り                   | TC-473、TC-474                                |
| ホストの取得処理の失敗             | excluded(本節はwebview内の表示状態だけを扱う) |
| 例外送出                           | excluded(破棄処理にthrow経路を追加しない)     |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-474
- Exception: excluded(throw経路なし)
- External: excluded(上表のとおり)
- Boundary: TC-465、TC-469、TC-471
- Type: excluded(メッセージ型は既存の責務)

**失敗系/正常系比（煙感知器）**: 正常系7件、失敗系4件。

### Feature 059-02 テスト対応と実行証跡（S59）

- テストファイル: `tests/web/main.refOverflow.test.ts` の describe `ref list lifecycle on replacement, switching and scrolling (S59)`。TC-464〜TC-474 を各 `it` で検証（TC-467 は送信のたびに一覧数と `#content` の `min-width` を記録、TC-472 は Ctrl+R のハードリフレッシュで検証しクリックによる外側閉鎖と区別）
- 実ブラウザ確認（Chromium headless）: 無変更 `loadCommits` で一覧維持・`min-width` 不変、コミット追加の `loadCommits` で一覧が閉じ counter 再描画、`selectRepo` で一覧が閉じ loading 表示・`#content` の `min-width` 解除、同リポジトリへ戻すと再計測（M=81）。表の縦スクロールで一覧が閉じる（CDPの縦ホイールは headless でスクロールを起こさなかったため `scrollBy` による実スクロールイベントで確認）。一覧内の縦横ホイールでは一覧維持
