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

| Case ID | Input / Precondition                                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                 | Notes                                |
| ------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| TC-060  | 外側ループが末尾まで到達（`i === vertices.length`）し、末尾に未処理 nullVertex 親が残る             | Normal - end reached registers trailing null parents                       | `registerParentProcessed()` が残存 nullVertex 親の分だけ呼ばれ、`getNextParent()` が最終的に非 nullVertex/null になる           | 従来挙動（末尾到達時のみ登録）       |
| TC-061  | 内側探索が `parentVertexOnBranch=true` で早期 `break`（`i < vertices.length`）、nullVertex 親が保留 | Boundary - early break preserves off-screen edge                           | `i === vertices.length` ガードにより `while` に入らず、保留 nullVertex 親に対し `registerParentProcessed()` が呼ばれない（0回） | 修正の肝（画面外親エッジを消さない） |
| TC-062  | `i === vertices.length` で末尾処理中、次の親が非 nullVertex                                         | Boundary - non-null parent breaks inner while                              | `while` 内 `else` 分岐で `break` し、非 nullVertex 親に対して `registerParentProcessed()` は呼ばれない                          | 過剰登録の防止                       |
| TC-063  | 早期 break でエッジ保持後、同一 vertex の残り children を処理                                       | Boundary - pending edge available to remaining children                    | 保留された nullVertex 親エッジが未処理のまま残り、残りの children の経路計算に利用可能である                                    | 保持されたエッジの利用可能性         |
| TC-064  | `i === vertices.length` かつ `getNextParent() === null`（残り親なし）                               | Boundary - no remaining parents                                            | `while` ループ本体が実行されず、`registerParentProcessed()` が呼ばれない（0回）                                                 | 残り親なし境界                       |
