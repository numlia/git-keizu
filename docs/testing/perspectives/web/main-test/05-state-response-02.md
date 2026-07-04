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
