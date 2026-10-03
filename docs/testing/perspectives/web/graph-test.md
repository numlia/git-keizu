# テスト観点表: web/graph.ts

> Source: `web/graph.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: スタッシュコミットの頂点描画

> Origin: Feature 001 (menu-bar-enhancement) Task 3.4
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                      | Notes                         |
| ------- | ------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------- |
| TC-001  | スタッシュコミットの頂点描画   | Normal - standard                                                          | 二重円が描画される（外側: 塗りつぶし、内側: リング） | graph.ts の描画パラメータ検証 |
| TC-002  | 非スタッシュコミットの頂点描画 | Normal - non-stash                                                         | 単一円が描画される（既存動作維持）                   | -                             |

## S2: Vertex コンストラクタと id プロパティ

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**シグネチャ**: `constructor(id: number)`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                   | Notes          |
| ------- | ------------------------------------- | -------------------------------------------------------------------------- | --------------------------------- | -------------- |
| TC-003  | id=5 で Vertex 作成                   | Normal - standard                                                          | getId() === 5, getPoint().y === 5 | id と y は同値 |
| TC-004  | id=NULL_VERTEX_ID (-1) で Vertex 作成 | Normal - special value                                                     | getId() === -1                    | nullVertex 用  |
| TC-005  | id=0 で Vertex 作成                   | Boundary - zero                                                            | getId() === 0                     | 最初のコミット |

## S3: Vertex.addChild() / children 管理

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**シグネチャ**: `addChild(vertex: Vertex): void`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                | Notes      |
| ------- | -------------------- | -------------------------------------------------------------------------- | ------------------------------ | ---------- |
| TC-006  | 子 Vertex を1つ追加  | Normal - standard                                                          | children 配列の長さ === 1      | -          |
| TC-007  | 子 Vertex を複数追加 | Normal - standard                                                          | children 配列の長さ === 追加数 | -          |
| TC-008  | 子 Vertex 未追加     | Boundary - empty                                                           | children 配列の長さ === 0      | デフォルト |

## S4: Vertex.getParents() getter

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**シグネチャ**: `getParents(): Vertex[]`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result       | Notes        |
| ------- | -------------------------------------- | -------------------------------------------------------------------------- | --------------------- | ------------ |
| TC-009  | 親を2つ追加後に getParents()           | Normal - standard                                                          | 長さ2の配列、追加順   | -            |
| TC-010  | 親未追加で getParents()                | Boundary - empty                                                           | 空配列                | -            |
| TC-011  | nullVertex を親に追加して getParents() | Normal - special                                                           | nullVertex を含む配列 | 範囲外親あり |

## S5: Vertex.isStash public getter

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result   | Notes      |
| ------- | --------------------- | -------------------------------------------------------------------------- | ----------------- | ---------- |
| TC-012  | setStash() 未呼び出し | Normal - default                                                           | isStash === false | デフォルト |
| TC-013  | setStash() 呼び出し後 | Normal - standard                                                          | isStash === true  | -          |

## S6: Vertex.isMerge() with nullVertex

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**シグネチャ**: `isMerge(): boolean`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result     | Notes        |
| ------- | -------------------------------- | -------------------------------------------------------------------------- | ------------------- | ------------ |
| TC-014  | 通常 parent を2つ追加            | Normal - standard                                                          | isMerge() === true  | 通常マージ   |
| TC-015  | 通常 parent 1つ + nullVertex 1つ | Normal - standard                                                          | isMerge() === true  | 範囲外親あり |
| TC-016  | parent 1つのみ                   | Normal - standard                                                          | isMerge() === false | 非マージ     |
| TC-017  | parent なし                      | Boundary - no parents                                                      | isMerge() === false | -            |

## S7: Graph.loadCommits() nullVertex 機構

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**シグネチャ**: `loadCommits(commits: GitCommitNode[], commitHead: string | null, commitLookup: { [hash: string]: number }): void`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                 | Notes        |
| ------- | -------------------------------------- | -------------------------------------------------------------------------- | ------------------------------- | ------------ |
| TC-018  | 親が commitLookup に存在するコミット   | Normal - standard                                                          | 正常に addParent + addChild     | -            |
| TC-019  | 親が commitLookup に存在しないコミット | Normal - standard                                                          | addParent(nullVertex)           | 表示範囲外   |
| TC-020  | 2つの親、一方だけ commitLookup に存在  | Normal - standard                                                          | 1つ正常 parent + 1つ nullVertex | マージケース |
| TC-021  | 全コミットの親が commitLookup 内       | Normal - standard                                                          | nullVertex 未使用               | 通常ケース   |
| TC-022  | コミット配列が空                       | Boundary - empty                                                           | 頂点なし、エラーなし            | -            |

## S8: Graph.determinePath() nullVertex ガード

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                       | Notes |
| ------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------- | ----- |
| TC-023  | マージ Vertex の parent が nullVertex (id === NULL_VERTEX_ID) | Normal - standard                                                          | merge 分岐ガードをスキップし normal branch として処理 | -     |
| TC-024  | determinePath ループで parentVertex === null                  | Normal - standard                                                          | ループが break で正常終了                             | -     |
| TC-025  | 末端の nullVertex 親に対する処理                              | Normal - standard                                                          | registerParentProcessed() が呼ばれる                  | -     |

## S9: Branch.addLine() numUncommitted 条件修正

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**シグネチャ**: `addLine(p1: Point, p2: Point, isCommitted: boolean, lockedFirst: boolean): void`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result               | Notes        |
| ------- | ------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------- | ------------ |
| TC-026  | p2.x=0, p2.y < numUncommitted, isCommitted=true  | Normal - standard                                                          | numUncommitted が p2.y に更新 | x=0 条件充足 |
| TC-027  | p2.x=1, p2.y < numUncommitted, isCommitted=true  | Normal - standard                                                          | numUncommitted が更新されない | x≠0 条件不足 |
| TC-028  | p2.x=0, p2.y >= numUncommitted, isCommitted=true | Boundary - threshold                                                       | numUncommitted が更新されない | 境界条件     |

## S10: Graph.getMutedCommits() マージコミット mute

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**シグネチャ**: `getMutedCommits(currentHash: string | null): boolean[]`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result            | Notes      |
| ------- | ------------------------------------- | -------------------------------------------------------------------------- | -------------------------- | ---------- |
| TC-029  | mergeCommits=true, merge かつ非 stash | Normal - standard                                                          | muted[i] === true          | -          |
| TC-030  | mergeCommits=true, merge かつ stash   | Normal - special                                                           | muted[i] === false         | stash 除外 |
| TC-031  | mergeCommits=true, 非 merge           | Normal - standard                                                          | muted[i] === false         | -          |
| TC-032  | mergeCommits=false                    | Normal - standard                                                          | merge 理由による mute なし | 設定無効   |

## S11: Graph.getMutedCommits() HEAD 祖先外コミット mute

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result               | Notes        |
| ------- | ------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------- | ------------ |
| TC-033  | commitsNotAncestorsOfHead=true, HEAD から到達可能 | Normal - standard                                                          | muted[i] === false            | ancestor     |
| TC-034  | commitsNotAncestorsOfHead=true, HEAD から到達不可 | Normal - standard                                                          | muted[i] === true             | non-ancestor |
| TC-035  | commitsNotAncestorsOfHead=false                   | Normal - standard                                                          | ancestor 理由による mute なし | 設定無効     |
| TC-036  | currentHash === null                              | Boundary - null HEAD                                                       | 全コミットを到達可能とみなす  | mute なし    |
| TC-037  | currentHash が commitLookup に不在                | Boundary - unknown HEAD                                                    | 全コミットを到達可能とみなす  | mute なし    |

## S12: Graph.getMutedCommits() 複合設定と結果配列

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                        | Notes        |
| ------- | ------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------- | ------------ |
| TC-038  | 両設定 true、マージ + 非祖先コミット | Normal - combined                                                          | muted[i] === true（両方の理由で mute） | -            |
| TC-039  | 両設定 true、非マージ + 祖先コミット | Normal - combined                                                          | muted[i] === false                     | -            |
| TC-040  | 返却配列の長さ                       | Normal - standard                                                          | commits.length と同一                  | 全コミット分 |
| TC-041  | nullVertex 親は ancestor 探索対象外  | Normal - special                                                           | nullVertex を辿らず安全に探索完了      | -            |

## S13: Vertex.getChildren() 子頂点読み取りアクセサ

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08
> Status: active
> Supersedes: -

**シグネチャ**: `getChildren(): Vertex[]`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                 | Notes               |
| ------- | -------------------------------------- | -------------------------------------------------------------------------- | ------------------------------- | ------------------- |
| TC-042  | children 未追加時に getChildren() 呼出 | Boundary - empty                                                           | 空配列を返す                    | デフォルト状態      |
| TC-043  | addChild で子を1つ追加後に getChildren | Normal - standard                                                          | 1要素の配列（追加した子を含む） | -                   |
| TC-044  | addChild で子を3つ追加後に getChildren | Normal - standard                                                          | 追加順に3要素の配列             | addChild 呼出順維持 |

## S14: Graph.getFirstParentIndex() 最初の親インデックス取得

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08
> Status: active
> Supersedes: -

**シグネチャ**: `getFirstParentIndex(i: number): number`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                      | Notes          |
| ------- | --------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------ | -------------- |
| TC-045  | 親が1つのコミット                       | Normal - standard                                                          | その親のインデックスを返す           | -              |
| TC-046  | 親が複数のマージコミット                | Normal - standard                                                          | 最初の親（parents[0]）のインデックス | -              |
| TC-047  | 親なしのルートコミット                  | Boundary - no parents                                                      | -1 を返す                            | -              |
| TC-048  | 親が commitLookup 外（nullVertex のみ） | Boundary - nullVertex                                                      | -1 を返す                            | 表示範囲外の親 |

## S15: Graph.getFirstChildIndex() 最初の子インデックス取得

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08
> Status: active
> Supersedes: -

**シグネチャ**: `getFirstChildIndex(i: number): number`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                | Notes               |
| ------- | ---------------------------------- | -------------------------------------------------------------------------- | ------------------------------ | ------------------- |
| TC-049  | 子が1つのコミット                  | Normal - standard                                                          | その子のインデックスを返す     | -                   |
| TC-050  | 子が複数で同一ブランチの子あり     | Normal - standard                                                          | 同一ブランチの子のインデックス | isOnThisBranch 優先 |
| TC-051  | 子が複数で同一ブランチの子なし     | Normal - fallback                                                          | 最大インデックスの子を返す     | -                   |
| TC-052  | 子なしのコミット（ブランチの先頭） | Boundary - no children                                                     | -1 を返す                      | -                   |

## S16: Graph.getAlternativeParentIndex() 代替親インデックス取得

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08
> Status: active
> Supersedes: -

**シグネチャ**: `getAlternativeParentIndex(i: number): number`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                      | Notes            |
| ------- | --------------------------- | -------------------------------------------------------------------------- | ------------------------------------ | ---------------- |
| TC-053  | 親が2つ以上のマージコミット | Normal - standard                                                          | 2番目の親のインデックスを返す        | マージ元ブランチ |
| TC-054  | 親が1つのみの通常コミット   | Normal - fallback                                                          | その親のインデックスにフォールバック | -                |
| TC-055  | 親なしのルートコミット      | Boundary - no parents                                                      | -1 を返す                            | -                |

## S17: Graph.getAlternativeChildIndex() 代替子インデックス取得

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08
> Status: active
> Supersedes: -

**シグネチャ**: `getAlternativeChildIndex(i: number): number`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                | Notes |
| ------- | ------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------- | ----- |
| TC-056  | 子が複数で同一ブランチの子あり | Normal - standard                                                          | 同一ブランチ除外後の最大インデックスの子を返す | -     |
| TC-057  | 子が複数で同一ブランチの子なし | Normal - fallback                                                          | 2番目に大きいインデックスの子を返す            | -     |
| TC-058  | 子が1つのみ                    | Normal - fallback                                                          | その子にフォールバック                         | -     |
| TC-059  | 子なしのコミット               | Boundary - no children                                                     | -1 を返す                                      | -     |

## S18: determinePath() 早期 break 時の画面外 nullVertex 親エッジ保持

> Origin: フェーズ2 修正 M11 (graph-preserve-offscreen-parent-edge)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: `private determinePath(startAt: number): void` 内の末尾 nullVertex 親処理ループ
> Target Path: `web/graph.ts:638-654`

末尾の nullVertex 親を `registerParentProcessed()` する `while` ループを、外側ループが末尾まで到達したとき（`i === this.vertices.length`）に限定するガードを追加する修正。内側の親探索が `parentVertexOnBranch` により早期 `break` した場合（`i < vertices.length`）は、保留中の nullVertex 親（画面外への親エッジ）を処理済み登録せず、同一 vertex の残りの children のために保持する。観測は `vertex.registerParentProcessed` の呼び出し回数と `getNextParent()` の残存状態で行う。

| Case ID | Input / Precondition                                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                 | Notes                                                                                                                                                                                                                                                                                                                                    |
| ------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-060  | 外側ループが末尾まで到達（`i === vertices.length`）し、末尾に未処理 nullVertex 親が残る             | Normal - end reached registers trailing null parents                       | `registerParentProcessed()` が残存 nullVertex 親の分だけ呼ばれ、`getNextParent()` が最終的に非 nullVertex/null になる           | 従来挙動（末尾到達時のみ登録）                                                                                                                                                                                                                                                                                                           |
| TC-061  | 内側探索が `parentVertexOnBranch=true` で早期 `break`（`i < vertices.length`）、nullVertex 親が保留 | Boundary - early break preserves off-screen edge                           | `i === vertices.length` ガードにより `while` に入らず、保留 nullVertex 親に対し `registerParentProcessed()` が呼ばれない（0回） | 修正の肝（画面外親エッジを消さない）。`determinePath` は private かつ `findStart` が同一 vertex を再選択して保留 null を後続パスで処理するため、早期 break パスは公開 API では `getNextParent()===null による break` で再現し、観測は「全パス合計の `registerParentProcessed` 呼び出し回数=親数（各1回・過剰なし）＋ render 成功」で代替 |
| TC-062  | `i === vertices.length` で末尾処理中、次の親が非 nullVertex                                         | Boundary - non-null parent breaks inner while                              | `while` 内 `else` 分岐で `break` し、非 nullVertex 親に対して `registerParentProcessed()` は呼ばれない                          | 過剰登録の防止。観測は全 determinePath パス合計の `registerParentProcessed` 呼び出し回数（=親数、過剰登録なし）＋ render 成功で代替（determinePath は private のため per-iteration 観測不可）                                                                                                                                            |
| TC-063  | 早期 break でエッジ保持後、同一 vertex の残り children を処理                                       | Boundary - pending edge available to remaining children                    | 保留された nullVertex 親エッジが未処理のまま残り、残りの children の経路計算に利用可能である                                    | 保持されたエッジの利用可能性                                                                                                                                                                                                                                                                                                             |
| TC-064  | `i === vertices.length` かつ `getNextParent() === null`（残り親なし）                               | Boundary - no remaining parents                                            | `while` ループ本体が実行されず、`registerParentProcessed()` が呼ばれない（0回）                                                 | 残り親なし境界                                                                                                                                                                                                                                                                                                                           |

## S19: circle の data-hash と setFileHistoryHighlight() による match / current / dim の描画状態

> Origin: Feature 055-07 (light-spec-plan)
> Added: 2026-09-08
> Status: active
> Supersedes: -
> Signature: `Graph.setFileHistoryHighlight(highlight: GraphFileHistoryHighlight | null): void` / `Vertex.draw(svg: SVGElement, config: Config, expandOffset: boolean, hash: string, highlightClass: string | null): void`
> Target Path: `web/graph.ts`（`Graph.render()` と `Vertex.draw()`。実装後に行範囲へ更新）
> Test File: `tests/web/graph.test.ts`

`Graph` が highlight を保持し、`render()` のたびに svg の `class` と各 circle の `data-hash` / 強調 class を付与する契約の観点（対応プラン §3.9 / §4 Task 6）。行 class の付与は `web/fileHistory-test.md` S4、CSS の値は `media/main-test.md` S3 の責務で本表には含めない。基本 fixture は hash `h0` / `h1` / `h2` の 3 commit を `loadCommits` した mock DOM。

| Case ID | Input / Precondition                                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                             | Notes                     |
| ------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| TC-065  | 基本 fixture で `render(null)`                                                                        | Normal - data-hash 属性                                                    | 3 つの circle の `getAttribute("data-hash")` がそれぞれ `h0` / `h1` / `h2` で、いずれの `class` にも `fileHistory` を含まず、svg の `class` が `fileHistoryMode` を含まない | highlight なしの既定      |
| TC-066  | `setFileHistoryHighlight({ matchHashes: new Set(["h0", "h2"]), currentHash: "h0" })` → `render(null)` | Normal - current circle                                                    | `h0` の circle の `class` が `"fileHistoryMatch fileHistoryCurrent"` と `toBe` で一致する                                                                                   | match と current を併記   |
| TC-067  | 同 highlight                                                                                          | Normal - match circle                                                      | `h2` の circle の `class` が `"fileHistoryMatch"`                                                                                                                           | -                         |
| TC-068  | 同 highlight                                                                                          | Normal - dim circle                                                        | `h1` の circle の `class` が `"fileHistoryDim"`                                                                                                                             | match 外                  |
| TC-069  | 同 highlight                                                                                          | Normal - svg の mode class                                                 | svg の `getAttribute("class")` が `"fileHistoryMode"`                                                                                                                       | -                         |
| TC-070  | `h0` が HEAD（既存 class `current`）で同 highlight                                                    | Normal - 既存 class の先頭維持                                             | `h0` の circle の `class` が `"current fileHistoryMatch fileHistoryCurrent"`（既存 class が先頭）                                                                           | space 区切りで追加        |
| TC-071  | stash commit を含む fixture で dim になる highlight                                                   | Normal - stash の outer / inner                                            | outer circle の `class` が `"stashOuter fileHistoryDim"`、inner circle が `"stashInner fileHistoryDim"` で、両方の `data-hash` が stash の hash                             | 2 circle とも属性を持つ   |
| TC-072  | TC-066 の後に `setFileHistoryHighlight(null)` → `render(null)`                                        | Normal - 解除                                                              | svg の `getAttribute("class")` が `""` で、全 circle の `class` から `fileHistory*` が消え、HEAD circle は `"current"` のまま                                               | -                         |
| TC-073  | `{ matchHashes: new Set(["h0", "h2"]), currentHash: null }`                                           | Boundary - currentHash null                                                | `h0` / `h2` が `"fileHistoryMatch"`、`fileHistoryCurrent` を持つ circle が 0 件、svg は `fileHistoryMode`                                                                   | current なしの match 表示 |
| TC-074  | `{ matchHashes: new Set(), currentHash: null }`                                                       | Boundary - match 0 件                                                      | 3 circle とも `"fileHistoryDim"` で svg は `fileHistoryMode`                                                                                                                | 全 dim                    |
| TC-075  | TC-066 の後に `render(null)` をもう一度呼ぶ                                                           | Normal - 再描画での維持                                                    | 2 回目の render 後も class が TC-066〜TC-069 と同じ（highlight は `Graph` が保持）                                                                                          | SVG group 再生成に耐える  |

### 失敗源インベントリ（include-or-justify）— Feature 055-07 追加分（S19）

| 失敗源                                                | 対応ケースまたは除外理由                                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `data-hash` の欠落（通常 / stash outer / inner）      | TC-065、TC-071                                                                                                                  |
| 3 状態 class の取り違え・現行 class の上書き          | TC-066〜TC-068、TC-070、TC-071                                                                                                  |
| svg の mode class 付与・除去漏れ                      | TC-069、TC-072、TC-074                                                                                                          |
| 解除後に class が残る                                 | TC-072                                                                                                                          |
| 再描画で highlight が消える                           | TC-075                                                                                                                          |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL） | `null` highlight: TC-065、TC-072。`currentHash: null`: TC-073。空 `Set`: TC-074。maximum / +/-1: excluded(数値閾値が存在しない) |
| 入力検証×違反パターン                                 | excluded(`GraphFileHistoryHighlight` は型で固定され、`Graph` は値を検証せず描画する)                                            |
| 外部依存×失敗モード                                   | excluded(SVG 生成は DOM API のみで外部依存なし)                                                                                 |
| 例外・エラー経路                                      | excluded(描画に throw 経路を追加しない)                                                                                         |
| 型不正・フォーマット不正                              | excluded(TypeScript の型検査で担保)                                                                                             |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(上表のとおり値を検証しない)
- Exception: excluded(上表のとおり)
- External: excluded(上表のとおり)
- Boundary: TC-073、TC-074
- Type: excluded(上表のとおり)
- Normal: TC-065〜TC-072、TC-075

**失敗系/正常系比（煙感知器）**: 正常系9件、失敗系2件。描画状態の観点は class の存在検証が正常系として並ぶ構造で、失敗源は欠落・上書き・残存・再描画に限られることを上表で列挙した。比率合わせのためのケース追加・削除は行わない。

## S20: determinePath() の親が子より前に並ぶ入力での停止保証

> Origin: 不具合修正 (graph-terminate-on-preceding-parent)
> Added: 2026-09-12
> Status: active
> Supersedes: -
> Signature: `private determinePath(startAt: number): void`
> Target Path: `web/graph.ts`（通常経路の末尾 while）
> Test File: `tests/web/graph.test.ts`

`loadCommits()` は「親は必ず子より後ろに並ぶ」前提で頂点を下方向へ辿る。detached worktree の HEAD が読み込み済みコミットの子だった場合など、その前提が崩れた入力では、親に到達しないまま探索が終わり `registerParentProcessed()` が呼ばれず、`findStart()` が同じ頂点を返し続けて webview が「読み込み中」のまま固まっていた。修正では、通常経路の末尾 while で id が自分より小さい親も nullVertex と同様に処理済みへ進める。merge 経路は 1 周目に `registerUnavailablePoint()` で接続点を登録し 2 周目でそれを見つけるため、もともと自力で終了する（ガード不要）。データ側の並び替えは `src/dataSource-test/02-branch-worktree-03.md` S47（TC-364〜TC-366）の責務。

| Case ID | Input / Precondition                                                                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                  | Notes                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| TC-076  | `[a(parent b), b, c(parent a)]`、`c` の唯一の親 `a` が先頭行                                                       | Boundary - preceding parent on the normal path                             | `loadCommits()` が終了し、`registerParentProcessed()` の合計呼び出し回数が 2、circle が 3 件描画 | 末尾 while で id の小さい親を消費                         |
| TC-077  | `[a(parent b), b, d(parent c), c(parents a, b)]`、末尾の merge `c` に `d` 経由で到達し、`c` の両親がともに前方の行 | Boundary - preceding parents of a merge reached through its child          | `loadCommits()` が終了し、`registerParentProcessed()` の合計呼び出し回数が 4、circle が 4 件描画 | 子経由で到達した頂点の末尾 while で複数の前方親を連続消費 |

### 失敗源インベントリ（include-or-justify）— graph-terminate-on-preceding-parent 追加分（S20）

| 失敗源                                                 | 対応ケースまたは除外理由                                                                 |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 通常経路で前方の親を消費せず無限ループ                 | TC-076                                                                                   |
| 子経由で到達した頂点の複数の前方親を消費せず無限ループ | TC-077                                                                                   |
| 前方の親を消費する際に他の親を過剰登録する             | TC-076、TC-077（合計回数 = 親エッジ数で過剰登録なし）                                    |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL）  | 親なし・nullVertex 親は S18（TC-060、TC-064）の責務。前方親は id 差 1 以上で追加境界なし |
| 入力検証×違反パターン                                  | excluded(`Graph` は並び順を検証せず描画する。並び替えは S47 の責務)                      |
| 外部依存×失敗モード                                    | excluded(SVG 生成は DOM API のみで外部依存なし)                                          |
| 例外・エラー経路                                       | excluded(throw 経路を追加しない。停止しないことを終了と回数で観測する)                   |
| 型不正・フォーマット不正                               | excluded(TypeScript の型検査で担保)                                                      |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(上表のとおり)
- Exception: excluded(上表のとおり)
- External: excluded(上表のとおり)
- Boundary: TC-076、TC-077
- Type: excluded(上表のとおり)

**失敗系/正常系比（煙感知器）**: 正常系 0 件、失敗系 2 件。停止保証の観点は崩れた入力のみを対象とするため正常系は S7 / S18 の既存ケースに委ねる。

## S21: setPathHighlight() による論理接続の強調・外枠・境界印の描画

> Origin: Feature 061-01 (light-spec-plan)
> Added: 2026-10-03
> Status: active
> Supersedes: -
> Signature: `Graph.setPathHighlight(highlight: PathHighlightResult | null): void` / `Graph.render(expandedCommit: ExpandedCommit | null): void` / `Branch.draw(svg: SVGElement, config: Config, expandAt: number)` / `Line` と `PlacedLine` の `readonly edgeKeys: ReadonlySet<string>`
> Target Path: `web/graph.ts:49-54`（`UnavailablePoint`）、`web/graph.ts:66-93`（`Branch.addLine` / `Branch.shareEdgeKeys`）、`web/graph.ts:97-248`（`Branch.draw` / `Branch.drawPath`）、`web/graph.ts:298-300`（`Vertex.getNextParentIndex`）、`web/graph.ts:341-355`（`Vertex.registerUnavailablePoint` / `Vertex.getLineIndexAfter`）、`web/graph.ts:369-457`（`Vertex.draw` / `Vertex.drawPathHighlightMarks`）、`web/graph.ts:556-631`（`Graph.setPathHighlight` / `Graph.drawPathHighlightMarks` / `Graph.render`）、`web/graph.ts:782-909`（`Graph.getEdgeKeysToParent` / `Graph.shareEdgeKeysToParent` / `Graph.determinePath`）、`web/global.d.ts:104-121`（`Line` / `PlacedLine`）
> Test File: `tests/web/graph.test.ts`

対応プラン §3.5 の描画契約の観点。`Graph` は `PathHighlightResult`（`hashes` / `edgeKeys` / `boundaries`）を保持し、`render()` のたびに所有キーが `edgeKeys` に含まれる線分だけを強調する。どの頂点・接続を強調するか（探索モード）は `web/pathHighlight-test.md` が決め、本表は与えられた結果の描画だけを扱う。CSS の値は `media/main-test.md` S8 の責務で本表には含めない。期待する `edgeKeys` は `["子","親"]` 形式のリテラル文字列で書き、`hashes` / `boundaries` も fixture から独立に決める。

共通の観測: svg の `class` に `pathHighlightMode`、強調した線と影の `class` に `pathHighlightSelected`（元の `line` / `shaddow` は残す）、外枠は `circle.pathHighlightRing`（`cx` / `cy` が同じ hash の元 circle と一致、`r` が `6`）、境界印は `rect.pathHighlightBoundary`（`width` / `height` が `12`、中心が元 circle の `cx` / `cy`）。線分の対応は `path` の `d` を、同じ入力を `setPathHighlight(null)` で描いた結果の `d` と比べる。

fixture:

- 直線fixture: `[a(parent b), b(parent c), c]`（全行がlane 0）
- 合流fixture: 表示順 `m, n, a, c, b, r`、`m→[a,b]`、`n→[c,b]`、`a→[]`、`c→[]`、`b→[r]`、`r→[]`。`n` の第二親 `b` への接続は配置処理で `m→b` の線が登録した接続点に合流し、合流点から `b` までの線分を共有する（`determinePath()` の merge 経路。実装時に `UnavailablePoint` の利用を確認して行範囲を記録する）
- 逆順fixture: S20 TC-076 の `[a(parent b), b, c(parent a)]`

| Case ID | Input / Precondition                                                                                                                                                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                                                                      | Notes                                                                        |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| TC-078  | 直線fixtureを `loadCommits` し、`setPathHighlight({ targetFound: true, hashes: {b,c}, edgeKeys: {["b","c"]}, boundaries: [] })` → `render(null)`。続けて `setPathHighlight(null)` → `render(null)` | Normal - 強調境界で単純化と連結を止める                                    | 強調時: `path.line` が2件で、`b`→`c` 区間の `d` を持つ1件だけが `class` に `pathHighlightSelected` を含み、`a`→`b` 区間の1件は含まない。`path.shaddow` も2件で `d` が対応する `path.line` と一致し、svg の `class` が `pathHighlightMode` を含む。解除後: `path.line` が1件に戻り、その `d` が強調前の2件を連結した点列と等しく、`pathHighlightSelected` / `pathHighlightMode` が0件 | 垂直線の単純化と色単位の連結を強調状態が等しい場合だけ許可する               |
| TC-079  | 合流fixtureで `edgeKeys: {["m","b"]}`、`hashes: {m,b}`                                                                                                                                             | Normal - マージの新規部分                                                  | `m` から `b` へ向かう線分（`m` の行から合流点までの新規部分と合流点から `b` までの部分）の `path` がすべて `pathHighlightSelected` を持ち、`m`→`a` の線分と `n` から出る線分は持たない。各 `path` の `d` は `setPathHighlight(null)` で描いた同じ区間の `d` と一致する                                                                                                               | 形状を変えない                                                               |
| TC-080  | 合流fixtureで `edgeKeys: {["n","b"]}`、`hashes: {n,b}`                                                                                                                                             | Normal - 共有後続部分の強調                                                | `n` から合流点までの新規線分と、合流点から `b` までの共有線分の両方が `pathHighlightSelected` を持つ。`m` から合流点までの線分（`m→b` の合流前の部分）は持たない                                                                                                                                                                                                                     | 共有線分は複数の接続キーを所有し、いずれかが結果に含まれれば強調する         |
| TC-081  | 合流fixtureで `edgeKeys: {["n","b"]}`、`hashes: {n,b}`（TC-080 と同じ）                                                                                                                            | Validation - 指定親より先と同色の無関係部分を強調しない                    | `b`→`r` の線分（`b` の先へ同じ lane・同じ色で続く）と、`n`→`c`、`m`→`a` の線分に `pathHighlightSelected` がない                                                                                                                                                                                                                                                                      | 共有範囲は既知の親 `b` の終点で止める                                        |
| TC-082  | `config.graphStyle = "angular"` で合流fixtureを描き、`edgeKeys: {["n","b"]}`                                                                                                                       | Normal - angular の折れ線維持                                              | 強調した `path` と非強調の `path` の `d` を連結した点列が、`setPathHighlight(null)` の angular 描画で得た `d` の点列と一致し、強調した `path` の `d` に曲線コマンド（`C` / `Q`）がない                                                                                                                                                                                               | 分割点は合流点                                                               |
| TC-083  | `config.graphStyle = "rounded"` で合流fixtureを描き、`edgeKeys: {["m","b"]}`                                                                                                                       | Normal - rounded の曲線維持                                                | `m` から出る強調 `path` の `d` が、`setPathHighlight(null)` の rounded 描画で同じ区間を描いた `d` と一致し、曲線コマンドを含む                                                                                                                                                                                                                                                       | 曲線の形を変えない                                                           |
| TC-084  | 合流fixtureで `m`（row 0）を展開（`render({ id: 0, ... })`）し、`edgeKeys: {["m","b"]}`。`m` から右の lane へ向かう最初の線分は `lockedFirst === true` で展開行をまたぐ                            | Normal - lockedFirst の詳細展開で所有情報を引き継ぐ                        | 展開で分かれた2つの `PlacedLine`（通常の遷移と `expandY` 分の延長）に対応する `path` がどちらも `pathHighlightSelected` を持ち、`d` が `setPathHighlight(null)` で同じ展開をした結果と一致する                                                                                                                                                                                       | `Branch.draw()` の `lockedFirst` 分岐                                        |
| TC-085  | 合流fixtureで `b`（row 4）を展開し、`edgeKeys: {["b","r"]}`、`hashes: {b,r}`。`b` から左の lane の `r` へ向かう線分は `lockedFirst === false` で展開行をまたぐ                                     | Normal - 非lockedFirst の詳細展開で所有情報を引き継ぐ                      | 展開で分かれた2つの `PlacedLine`（延長と移動した遷移）に対応する `path` がどちらも `pathHighlightSelected` を持ち、`n`→`b` / `m`→`b` の線分は持たず、`d` が `setPathHighlight(null)` の結果と一致する                                                                                                                                                                                | `Branch.draw()` の非 `lockedFirst` 分岐                                      |
| TC-086  | 合流fixtureで `m` を HEAD（`commitHead = "m"`）として `loadCommits` し、`hashes: {m,b}`、`edgeKeys: {["m","b"]}` → `render(null)`。続けて `setPathHighlight(null)` → `render(null)`                | Normal - HEAD の丸印維持と外枠                                             | 強調時: `circle.pathHighlightRing` が2件で `cx` / `cy` が `m` / `b` の元 circle と一致し `r` が `6`。`m` の元 circle は `class` に `current` を持ち `fill` 属性が強調前と同じで、`data-hash` を持つ circle の件数が強調前と同じ（偽の頂点なし）。解除後: `pathHighlightRing` が0件、`m` の circle が `current` のまま、svg の `class` から `pathHighlightMode` が消える              | 外枠は元の丸印とは別要素                                                     |
| TC-087  | fixture `[c1(parents g2, g1), x]`（`g1` / `g2` は未読み込み）で `hashes: {c1}`、`edgeKeys: {}`、`boundaries: [{c1,g2},{c1,g1}]`                                                                    | Boundary - 同一の子に複数境界で rect 1個                                   | `rect.pathHighlightBoundary` が1件で中心が `c1` の circle の `cx` / `cy`、`width` / `height` が `12`。`g1` / `g2` の circle・`pathHighlightRing` は存在せず、circle の総数が強調前と同じ                                                                                                                                                                                             | 未読み込み親の区別はバーの詳細で行い、rect を重ねない                        |
| TC-088  | fixture `[t(parent gap), r]`（`gap` は未読み込み）で `hashes: {t}`、`edgeKeys: {}`、`boundaries: [{t,gap}]`                                                                                        | Validation - 未読み込み親への継続線を強調しない                            | `t` から下へ続く継続線（null 頂点へ向かう線）の `path` に `pathHighlightSelected` がなく、`pathHighlightSelected` を持つ `path` が0件。`t` に `pathHighlightRing` と `pathHighlightBoundary` が1件ずつあり、`t`→`r` の線は描かれない                                                                                                                                                 | 配置上の継続線に所有キーを付けない                                           |
| TC-089  | 逆順fixtureで `hashes: {c,a}`、`edgeKeys: {["c","a"]}`、`boundaries: []`                                                                                                                           | Validation - 逆順入力で誤った継続線を強調せず停止する                      | `loadCommits()` が終了し（S20 TC-076 と同じく `registerParentProcessed()` の合計が2）、`pathHighlightSelected` を持つ `path` が0件（`c` から前方の `a` へ到達する線は既存配置に存在しないため新設しない）、`pathHighlightRing` が `c` と `a` の2件                                                                                                                                   | 探索集合が正しくても存在しない線は作らない。到達を確かめてからキーを確定する |

### 失敗源インベントリ（include-or-justify）— Feature 061-01 追加分（S21）

| 失敗源                                                | 対応ケースまたは除外理由                                                                                         |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 単純化・連結で強調境界が消える                        | TC-078、TC-082                                                                                                   |
| マージの新規部分・共有後続部分に所有キーが付かない    | TC-079、TC-080                                                                                                   |
| 指定親より先・同色の無関係部分の誤強調                | TC-081                                                                                                           |
| 曲線・折れ線の形状変化                                | TC-082、TC-083                                                                                                   |
| 詳細展開の分割で所有キーが落ちる                      | TC-084、TC-085                                                                                                   |
| HEAD・元の丸印の変更、偽の頂点                        | TC-086、TC-087                                                                                                   |
| 未読み込み親・逆順の継続線を論理接続として強調する    | TC-088、TC-089                                                                                                   |
| 解除後に印・class が残る                              | TC-078、TC-086                                                                                                   |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL） | `null` 解除: TC-078、TC-086。接続0件: TC-087〜TC-089。複数境界: TC-087。maximum / +/-1: excluded(数値閾値がない) |
| 入力検証×違反パターン                                 | excluded(`Graph` は結果を検証せず描画する。疑似行・不在の判定は計算側の責務)                                     |
| 外部依存×失敗モード                                   | excluded(SVG 生成は DOM API のみで外部依存なし)                                                                  |
| 例外・エラー経路                                      | excluded(throw 経路を追加しない。停止は終了と回数で観測する)                                                     |
| 型不正・フォーマット不正                              | excluded(`edgeKeys` の型は TypeScript の型検査と typecheck で担保)                                               |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-081、TC-088、TC-089
- Exception: excluded(上表のとおり)
- External: excluded(上表のとおり)
- Boundary: TC-087
- Type: excluded(上表のとおり)
- Normal: TC-078〜TC-080、TC-082〜TC-086
