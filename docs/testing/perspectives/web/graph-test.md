# テスト観点表: web/graph.ts

## S1: スタッシュコミットの頂点描画

> Origin: Feature 001 (menu-bar-enhancement) Task 3.4
> Added: 2026-02-25

**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition           | Perspective (Equivalence / Boundary) | Expected Result                                      | Notes                         |
| ------- | ------------------------------ | ------------------------------------ | ---------------------------------------------------- | ----------------------------- |
| TC-001  | スタッシュコミットの頂点描画   | Equivalence - normal                 | 二重円が描画される（外側: 塗りつぶし、内側: リング） | graph.ts の描画パラメータ検証 |
| TC-002  | 非スタッシュコミットの頂点描画 | Equivalence - normal (non-stash)     | 単一円が描画される（既存動作維持）                   | -                             |

## S2: Vertex コンストラクタと id プロパティ

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04

**シグネチャ**: `constructor(id: number)`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition                  | Perspective (Equivalence / Boundary) | Expected Result                   | Notes          |
| ------- | ------------------------------------- | ------------------------------------ | --------------------------------- | -------------- |
| TC-003  | id=5 で Vertex 作成                   | Equivalence - normal                 | getId() === 5, getPoint().y === 5 | id と y は同値 |
| TC-004  | id=NULL_VERTEX_ID (-1) で Vertex 作成 | Equivalence - special value          | getId() === -1                    | nullVertex 用  |
| TC-005  | id=0 で Vertex 作成                   | Boundary - zero                      | getId() === 0                     | 最初のコミット |

## S3: Vertex.addChild() / children 管理

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04

**シグネチャ**: `addChild(vertex: Vertex): void`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition | Perspective (Equivalence / Boundary) | Expected Result                | Notes      |
| ------- | -------------------- | ------------------------------------ | ------------------------------ | ---------- |
| TC-006  | 子 Vertex を1つ追加  | Equivalence - normal                 | children 配列の長さ === 1      | -          |
| TC-007  | 子 Vertex を複数追加 | Equivalence - normal                 | children 配列の長さ === 追加数 | -          |
| TC-008  | 子 Vertex 未追加     | Boundary - empty                     | children 配列の長さ === 0      | デフォルト |

## S4: Vertex.getParents() getter

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04

**シグネチャ**: `getParents(): Vertex[]`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition                   | Perspective (Equivalence / Boundary) | Expected Result       | Notes        |
| ------- | -------------------------------------- | ------------------------------------ | --------------------- | ------------ |
| TC-009  | 親を2つ追加後に getParents()           | Equivalence - normal                 | 長さ2の配列、追加順   | -            |
| TC-010  | 親未追加で getParents()                | Boundary - empty                     | 空配列                | -            |
| TC-011  | nullVertex を親に追加して getParents() | Equivalence - special                | nullVertex を含む配列 | 範囲外親あり |

## S5: Vertex.isStash public getter

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04

**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition  | Perspective (Equivalence / Boundary) | Expected Result   | Notes      |
| ------- | --------------------- | ------------------------------------ | ----------------- | ---------- |
| TC-012  | setStash() 未呼び出し | Equivalence - normal (default)       | isStash === false | デフォルト |
| TC-013  | setStash() 呼び出し後 | Equivalence - normal                 | isStash === true  | -          |

## S6: Vertex.isMerge() with nullVertex

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04

**シグネチャ**: `isMerge(): boolean`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition             | Perspective (Equivalence / Boundary) | Expected Result     | Notes        |
| ------- | -------------------------------- | ------------------------------------ | ------------------- | ------------ |
| TC-014  | 通常 parent を2つ追加            | Equivalence - normal                 | isMerge() === true  | 通常マージ   |
| TC-015  | 通常 parent 1つ + nullVertex 1つ | Equivalence - normal                 | isMerge() === true  | 範囲外親あり |
| TC-016  | parent 1つのみ                   | Equivalence - normal                 | isMerge() === false | 非マージ     |
| TC-017  | parent なし                      | Boundary - no parents                | isMerge() === false | -            |

## S7: Graph.loadCommits() nullVertex 機構

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04

**シグネチャ**: `loadCommits(commits: GitCommitNode[], commitHead: string | null, commitLookup: { [hash: string]: number }): void`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition                   | Perspective (Equivalence / Boundary) | Expected Result                 | Notes        |
| ------- | -------------------------------------- | ------------------------------------ | ------------------------------- | ------------ |
| TC-018  | 親が commitLookup に存在するコミット   | Equivalence - normal                 | 正常に addParent + addChild     | -            |
| TC-019  | 親が commitLookup に存在しないコミット | Equivalence - normal                 | addParent(nullVertex)           | 表示範囲外   |
| TC-020  | 2つの親、一方だけ commitLookup に存在  | Equivalence - normal                 | 1つ正常 parent + 1つ nullVertex | マージケース |
| TC-021  | 全コミットの親が commitLookup 内       | Equivalence - normal                 | nullVertex 未使用               | 通常ケース   |
| TC-022  | コミット配列が空                       | Boundary - empty                     | 頂点なし、エラーなし            | -            |

## S8: Graph.determinePath() nullVertex ガード

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04

**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition                                          | Perspective (Equivalence / Boundary) | Expected Result                                       | Notes |
| ------- | ------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------- | ----- |
| TC-023  | マージ Vertex の parent が nullVertex (id === NULL_VERTEX_ID) | Equivalence - normal                 | merge 分岐ガードをスキップし normal branch として処理 | -     |
| TC-024  | determinePath ループで parentVertex === null                  | Equivalence - normal                 | ループが break で正常終了                             | -     |
| TC-025  | 末端の nullVertex 親に対する処理                              | Equivalence - normal                 | registerParentProcessed() が呼ばれる                  | -     |

## S9: Branch.addLine() numUncommitted 条件修正

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04

**シグネチャ**: `addLine(p1: Point, p2: Point, isCommitted: boolean, lockedFirst: boolean): void`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition                             | Perspective (Equivalence / Boundary) | Expected Result               | Notes        |
| ------- | ------------------------------------------------ | ------------------------------------ | ----------------------------- | ------------ |
| TC-026  | p2.x=0, p2.y < numUncommitted, isCommitted=true  | Equivalence - normal                 | numUncommitted が p2.y に更新 | x=0 条件充足 |
| TC-027  | p2.x=1, p2.y < numUncommitted, isCommitted=true  | Equivalence - normal                 | numUncommitted が更新されない | x≠0 条件不足 |
| TC-028  | p2.x=0, p2.y >= numUncommitted, isCommitted=true | Boundary - threshold                 | numUncommitted が更新されない | 境界条件     |

## S10: Graph.getMutedCommits() マージコミット mute

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04

**シグネチャ**: `getMutedCommits(currentHash: string | null): boolean[]`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition                  | Perspective (Equivalence / Boundary) | Expected Result            | Notes      |
| ------- | ------------------------------------- | ------------------------------------ | -------------------------- | ---------- |
| TC-029  | mergeCommits=true, merge かつ非 stash | Equivalence - normal                 | muted[i] === true          | -          |
| TC-030  | mergeCommits=true, merge かつ stash   | Equivalence - special                | muted[i] === false         | stash 除外 |
| TC-031  | mergeCommits=true, 非 merge           | Equivalence - normal                 | muted[i] === false         | -          |
| TC-032  | mergeCommits=false                    | Equivalence - normal                 | merge 理由による mute なし | 設定無効   |

## S11: Graph.getMutedCommits() HEAD 祖先外コミット mute

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04

**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition                              | Perspective (Equivalence / Boundary) | Expected Result               | Notes        |
| ------- | ------------------------------------------------- | ------------------------------------ | ----------------------------- | ------------ |
| TC-033  | commitsNotAncestorsOfHead=true, HEAD から到達可能 | Equivalence - normal                 | muted[i] === false            | ancestor     |
| TC-034  | commitsNotAncestorsOfHead=true, HEAD から到達不可 | Equivalence - normal                 | muted[i] === true             | non-ancestor |
| TC-035  | commitsNotAncestorsOfHead=false                   | Equivalence - normal                 | ancestor 理由による mute なし | 設定無効     |
| TC-036  | currentHash === null                              | Boundary - null HEAD                 | 全コミットを到達可能とみなす  | mute なし    |
| TC-037  | currentHash が commitLookup に不在                | Boundary - unknown HEAD              | 全コミットを到達可能とみなす  | mute なし    |

## S12: Graph.getMutedCommits() 複合設定と結果配列

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04

**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition                 | Perspective (Equivalence / Boundary) | Expected Result                        | Notes        |
| ------- | ------------------------------------ | ------------------------------------ | -------------------------------------- | ------------ |
| TC-038  | 両設定 true、マージ + 非祖先コミット | Equivalence - combined               | muted[i] === true（両方の理由で mute） | -            |
| TC-039  | 両設定 true、非マージ + 祖先コミット | Equivalence - combined               | muted[i] === false                     | -            |
| TC-040  | 返却配列の長さ                       | Equivalence - normal                 | commits.length と同一                  | 全コミット分 |
| TC-041  | nullVertex 親は ancestor 探索対象外  | Equivalence - special                | nullVertex を辿らず安全に探索完了      | -            |

## S13: Vertex.getChildren() 子頂点読み取りアクセサ

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08

**シグネチャ**: `getChildren(): Vertex[]`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition                   | Perspective (Equivalence / Boundary) | Expected Result                 | Notes               |
| ------- | -------------------------------------- | ------------------------------------ | ------------------------------- | ------------------- |
| TC-042  | children 未追加時に getChildren() 呼出 | Boundary - empty                     | 空配列を返す                    | デフォルト状態      |
| TC-043  | addChild で子を1つ追加後に getChildren | Equivalence - normal                 | 1要素の配列（追加した子を含む） | -                   |
| TC-044  | addChild で子を3つ追加後に getChildren | Equivalence - normal                 | 追加順に3要素の配列             | addChild 呼出順維持 |

## S14: Graph.getFirstParentIndex() 最初の親インデックス取得

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08

**シグネチャ**: `getFirstParentIndex(i: number): number`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition                    | Perspective (Equivalence / Boundary) | Expected Result                      | Notes          |
| ------- | --------------------------------------- | ------------------------------------ | ------------------------------------ | -------------- |
| TC-045  | 親が1つのコミット                       | Equivalence - normal                 | その親のインデックスを返す           | -              |
| TC-046  | 親が複数のマージコミット                | Equivalence - normal                 | 最初の親（parents[0]）のインデックス | -              |
| TC-047  | 親なしのルートコミット                  | Boundary - no parents                | -1 を返す                            | -              |
| TC-048  | 親が commitLookup 外（nullVertex のみ） | Boundary - nullVertex                | -1 を返す                            | 表示範囲外の親 |

## S15: Graph.getFirstChildIndex() 最初の子インデックス取得

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08

**シグネチャ**: `getFirstChildIndex(i: number): number`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition               | Perspective (Equivalence / Boundary) | Expected Result                | Notes               |
| ------- | ---------------------------------- | ------------------------------------ | ------------------------------ | ------------------- |
| TC-049  | 子が1つのコミット                  | Equivalence - normal                 | その子のインデックスを返す     | -                   |
| TC-050  | 子が複数で同一ブランチの子あり     | Equivalence - normal                 | 同一ブランチの子のインデックス | isOnThisBranch 優先 |
| TC-051  | 子が複数で同一ブランチの子なし     | Equivalence - normal (fallback)      | 最大インデックスの子を返す     | -                   |
| TC-052  | 子なしのコミット（ブランチの先頭） | Boundary - no children               | -1 を返す                      | -                   |

## S16: Graph.getAlternativeParentIndex() 代替親インデックス取得

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08

**シグネチャ**: `getAlternativeParentIndex(i: number): number`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition        | Perspective (Equivalence / Boundary) | Expected Result                      | Notes            |
| ------- | --------------------------- | ------------------------------------ | ------------------------------------ | ---------------- |
| TC-053  | 親が2つ以上のマージコミット | Equivalence - normal                 | 2番目の親のインデックスを返す        | マージ元ブランチ |
| TC-054  | 親が1つのみの通常コミット   | Equivalence - normal (fallback)      | その親のインデックスにフォールバック | -                |
| TC-055  | 親なしのルートコミット      | Boundary - no parents                | -1 を返す                            | -                |

## S17: Graph.getAlternativeChildIndex() 代替子インデックス取得

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08

**シグネチャ**: `getAlternativeChildIndex(i: number): number`
**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition           | Perspective (Equivalence / Boundary) | Expected Result                                | Notes |
| ------- | ------------------------------ | ------------------------------------ | ---------------------------------------------- | ----- |
| TC-056  | 子が複数で同一ブランチの子あり | Equivalence - normal                 | 同一ブランチ除外後の最大インデックスの子を返す | -     |
| TC-057  | 子が複数で同一ブランチの子なし | Equivalence - normal (fallback)      | 2番目に大きいインデックスの子を返す            | -     |
| TC-058  | 子が1つのみ                    | Equivalence - normal (fallback)      | その子にフォールバック                         | -     |
| TC-059  | 子なしのコミット               | Boundary - no children               | -1 を返す                                      | -     |
