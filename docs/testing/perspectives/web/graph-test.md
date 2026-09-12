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
> Target Path: `web/graph.ts`（merge 経路の探索ループ直後と、通常経路の末尾 while）
> Test File: `tests/web/graph.test.ts`

`loadCommits()` は「親は必ず子より後ろに並ぶ」前提で頂点を下方向へ辿る。detached worktree の HEAD が読み込み済みコミットの子だった場合など、その前提が崩れた入力では、親に到達しないまま探索が終わり `registerParentProcessed()` が呼ばれず、`findStart()` が同じ頂点を返し続けて webview が「読み込み中」のまま固まっていた。修正では、通常経路は末尾 while で id が自分より小さい親も nullVertex と同様に処理済みへ進め、merge 経路は接続点が見つからずにループを抜けたときに親を処理済みへ進める。データ側の並び替えは `src/dataSource-test/02-branch-worktree-03.md` S47（TC-364〜TC-366）の責務。

| Case ID | Input / Precondition                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                  | Notes                                  |
| ------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------- |
| TC-076  | `[a(parent b), b, c(parent a)]`、`c` の唯一の親 `a` が先頭行          | Boundary - preceding parent on the normal path                             | `loadCommits()` が終了し、`registerParentProcessed()` の合計呼び出し回数が 2、circle が 3 件描画 | 末尾 while で id の小さい親を消費      |
| TC-077  | `[a(parent b), b, c(parents a, b)]`、merge `c` の両親がともに前方の行 | Boundary - preceding parent on the merge path                              | `loadCommits()` が終了し、`registerParentProcessed()` の合計呼び出し回数が 3、circle が 3 件描画 | merge 経路で接続点未発見のまま親を消費 |

### 失敗源インベントリ（include-or-justify）— graph-terminate-on-preceding-parent 追加分（S20）

| 失敗源                                                | 対応ケースまたは除外理由                                                                 |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 通常経路で前方の親を消費せず無限ループ                | TC-076                                                                                   |
| merge 経路で前方の親を消費せず無限ループ              | TC-077                                                                                   |
| 前方の親を消費する際に他の親を過剰登録する            | TC-076、TC-077（合計回数 = 親エッジ数で過剰登録なし）                                    |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL） | 親なし・nullVertex 親は S18（TC-060、TC-064）の責務。前方親は id 差 1 以上で追加境界なし |
| 入力検証×違反パターン                                 | excluded(`Graph` は並び順を検証せず描画する。並び替えは S47 の責務)                      |
| 外部依存×失敗モード                                   | excluded(SVG 生成は DOM API のみで外部依存なし)                                          |
| 例外・エラー経路                                      | excluded(throw 経路を追加しない。停止しないことを終了と回数で観測する)                   |
| 型不正・フォーマット不正                              | excluded(TypeScript の型検査で担保)                                                      |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(上表のとおり)
- Exception: excluded(上表のとおり)
- External: excluded(上表のとおり)
- Boundary: TC-076、TC-077
- Type: excluded(上表のとおり)

**失敗系/正常系比（煙感知器）**: 正常系 0 件、失敗系 2 件。停止保証の観点は崩れた入力のみを対象とするため正常系は S7 / S18 の既存ケースに委ねる。
