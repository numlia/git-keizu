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

| Case ID | Input / Precondition                                                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                       | Notes                  |
| ------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| TC-252  | `expandedCommit.loading===true`、details/fileTree 未取得、`commitLookup` に該当コミットあり（親あり・stash なし） | Normal - loading resend with commit                                        | `commitDetailsOpen` 付与・`renderCommitDetailsView()` 実行後、`sendMessage` が `command:"commitDetails"`, `commitHash`, `hasParents:true`, `isStash:false` で送られる | 復元時の再送           |
| TC-253  | `expandedCommit.loading===true`、`commitLookup` に該当コミットが不在（`commit===undefined`）                      | Boundary - commit not found                                                | 送信 payload が `hasParents:false`, `isStash:false` になる（`commit !== undefined` ガード）                                                                           | ルックアップ欠落境界   |
| TC-254  | `expandedCommit.loading===true`、該当コミットが stash（`stash !== null`）                                         | Boundary - stash commit                                                    | 送信 payload が `isStash:true` になる                                                                                                                                 | stash 判定             |
| TC-255  | `expandedCommit.commitDetails` と `fileTree` が取得済み                                                           | Normal - cached details path                                               | `showCommitDetails()` が呼ばれ、`commitDetails` 再送は行われない                                                                                                      | 先行分岐（再送しない） |
| TC-256  | `expandedCommit.loading===false` かつ details/fileTree 未取得                                                     | Boundary - not loading path                                                | `loadCommitDetails(elem)` が呼ばれ、`commitDetails` 再送は行われない                                                                                                  | else 分岐              |
