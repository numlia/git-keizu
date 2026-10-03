# テスト観点表: web/pathHighlight.ts

> Source: `web/pathHighlight.ts`
> Generated: 2026-10-03T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest

## S1: computePathHighlight() の受け入れfixtureでの頂点・接続・境界の完全一致

> Origin: Feature 061-01 (light-spec-plan)
> Added: 2026-10-03
> Status: active
> Supersedes: -
> Signature: `computePathHighlight(commits: readonly GitCommitNode[], targetHash: string, mode: PathHighlightMode): PathHighlightResult` / `pathEdgeKey(childHash: string, parentHash: string): string`
> Target Path: `web/pathHighlight.ts:60-98`
> Test File: `tests/web/pathHighlight.test.ts`

対応プラン §3.7 の受け入れデータ9行を、`hashes`・`edgeKeys`・`boundaries`・`targetFound` の完全一致で検証する純粋計算の観点。標準fixtureは表示順 `N,M,A,B,U,R,X`、関係は `N→[M]`、`M→[A,B]`、`A→[R]`、`B→[R]`、`U→[R]`、`R→[]`、`X→[]`（各行は `stash: null`、`refs: []`、hashは表示用の識別子）。期待する `edgeKeys` は製品の `pathEdgeKey` を呼ばず、`["子","親"]` 形式のリテラル文字列（`JSON.stringify([childHash, parentHash])` と同じ文字列）で書く。`hashes` / `edgeKeys` は `Set` 同士の `toEqual`、`boundaries` は並び替えずに配列の `toEqual` で比較する。モード値はenum `PathHighlightMode` の `Direct` / `AncestorsAndDescendants` / `FirstParent` / `AllAncestors`。DOM・SVG・翻訳・ホスト送信には触れない（描画は `web/graph-test.md` S21、状態バーは `web/pathHighlightController-test.md` S1 の責務）。

| Case ID | Input / Precondition                                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                     | Notes                                                            |
| ------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| TC-001  | 標準fixture、`targetHash = "M"`、`Direct`                                                    | Normal - 直接の親・子                                                      | `targetFound === true`、`hashes` が `{N,M,A,B}`、`edgeKeys` が `{["N","M"],["M","A"],["M","B"]}`、`boundaries` が `[]`。あわせて `pathEdgeKey("N","M")` が `'["N","M"]'` と一致する | §3.7 行1。キー形式はハッシュ化・省略なし                         |
| TC-002  | 標準fixture、`targetHash = "A"`、`AncestorsAndDescendants`                                   | Normal - 祖先と子孫の独立探索                                              | `hashes` が `{N,M,A,R}`、`edgeKeys` が `{["N","M"],["M","A"],["A","R"]}`、`boundaries` が `[]`。`B` / `U` と `["M","B"]` / `["B","R"]` / `["U","R"]` を含まない                     | §3.7 行2。子孫 `M` から別親 `B` へ折り返さない                   |
| TC-003  | 標準fixture、`targetHash = "M"`、`AllAncestors`                                              | Normal - 全祖先                                                            | `hashes` が `{M,A,B,R}`、`edgeKeys` が `{["M","A"],["M","B"],["A","R"],["B","R"]}`、`boundaries` が `[]`。`N` と `["N","M"]` を含まない                                             | §3.7 行3。ブランチ先端 `M` の全祖先                              |
| TC-004  | 標準fixture、`targetHash = "M"`、`FirstParent`                                               | Normal - 第一親の祖先                                                      | `hashes` が `{M,A,R}`、`edgeKeys` が `{["M","A"],["A","R"]}`、`boundaries` が `[]`                                                                                                  | §3.7 行4。添字0のみをたどる                                      |
| TC-005  | 標準fixture、`targetHash = "R"`（`parentHashes: []`）、`AllAncestors`                        | Boundary - 親なしの対象                                                    | `targetFound === true`、`hashes` が `{R}`、`edgeKeys` が空の `Set`、`boundaries` が `[]`                                                                                            | §3.7 行5。親配列が空は境界ではない。TC-012（対象不在）と区別する |
| TC-006  | fixture `M→[missing,B]`、`B→[]`（`missing` は入力にない）、`targetHash = "M"`、`FirstParent` | Validation - 第一親の欠落を第二親で補わない                                | `hashes` が `{M}`、`edgeKeys` が空の `Set`、`boundaries` が `[{ childHash: "M", parentHash: "missing" }]`                                                                           | §3.7 行6。`B` と `["M","B"]` を含まない                          |
| TC-007  | fixture `M→[A,missing]`、`A→[]`、`targetHash = "M"`、`FirstParent`                           | Validation - 探索対象外の第二親を報告しない                                | `hashes` が `{M,A}`、`edgeKeys` が `{["M","A"]}`、`boundaries` が `[]`                                                                                                              | §3.7 行7。境界は訪れた頂点の添字0だけを調べる                    |
| TC-008  | fixture `T→[gap]`、`R→[]`（`gap` は入力にない）、`targetHash = "T"`、`AllAncestors`          | Validation - 欠けた親をまたいで接続しない                                  | `hashes` が `{T}`、`edgeKeys` が空の `Set`、`boundaries` が `[{ childHash: "T", parentHash: "gap" }]`。`R` と `["T","R"]` を含まない                                                | §3.7 行8                                                         |
| TC-009  | TC-008 の入力の末尾へ `gap→[R]` を追加した fixture、`targetHash = "T"`、`AllAncestors`       | Normal - 追加読み込み後の延長                                              | `hashes` が `{T,gap,R}`、`edgeKeys` が `{["T","gap"],["gap","R"]}`、`boundaries` が `[]`                                                                                            | §3.7 行9。同じ対象の再計算で境界が消え経路が延びる               |

### 失敗源インベントリ（include-or-justify）— Feature 061-01 追加分（S1）

| 失敗源                                                 | 対応ケースまたは除外理由                                                                                             |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| 子孫探索から別親へ折り返す・祖先探索から別子へ折り返す | TC-002、TC-003                                                                                                       |
| 第一親の欠落を第二親で補う                             | TC-006                                                                                                               |
| 探索対象外の親を境界として報告する                     | TC-007                                                                                                               |
| 欠けた親をまたいで読み込み済み頂点へ接続する           | TC-008、TC-009                                                                                                       |
| 親なしと対象不在を同じ空状態へ潰す                     | TC-005（S2 TC-012 と対で検証）                                                                                       |
| 接続キーの形式が描画側と一致しない                     | TC-001（`pathEdgeKey` の文字列照合）                                                                                 |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL）  | 親配列が空: TC-005。接続0件: TC-005、TC-006、TC-008。空入力・対象不在は S2。maximum / +/-1: excluded(数値閾値がない) |
| 入力検証×違反パターン                                  | 疑似行・対象不在は S2 の責務                                                                                         |
| 外部依存×失敗モード                                    | excluded(純粋計算で外部依存なし)                                                                                     |
| 例外・エラー経路                                       | excluded(throw 経路を持たない。対象不在は `targetFound: false` で表す)                                               |
| 型不正・フォーマット不正                               | excluded(TypeScript の型検査で担保)                                                                                  |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-006〜TC-008
- Exception: excluded(上表のとおり)
- External: excluded(上表のとおり)
- Boundary: TC-005
- Type: excluded(上表のとおり)
- Normal: TC-001〜TC-004、TC-009

## S2: computePathHighlight() の構造・疑似行・対象不在・境界の順序

> Origin: Feature 061-01 (light-spec-plan)
> Added: 2026-10-03
> Status: active
> Supersedes: -
> Signature: `computePathHighlight(commits: readonly GitCommitNode[], targetHash: string, mode: PathHighlightMode): PathHighlightResult`
> Target Path: `web/pathHighlight.ts:64-214`
> Test File: `tests/web/pathHighlight.test.ts`

対応プラン §3.4 の探索規則（疑似行の除外、順序非依存、方向別の境界判定、境界一覧の確定順）の観点。比較方法と標準fixtureは S1 と同じ。疑似行は `hash === UNCOMMITTED_CHANGES_HASH`（`src/types.ts`）の作業ツリー行と `stash !== null` の行。複数モードを含むケースは、各入力と期待値が分かる parameterized test（`it.each`）にする。

| Case ID | Input / Precondition                                                                                                                                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                     | Notes                                                                    |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| TC-010  | fixture `O→[P,Q,S]`、`P→[]`、`Q→[]`、`S→[]`（親3個のマージ）、`targetHash = "O"`、モードは `AllAncestors` と `FirstParent` の2通り                                                     | Normal - 親3個のマージ                                                     | `AllAncestors`: `hashes` が `{O,P,Q,S}`、`edgeKeys` が `{["O","P"],["O","Q"],["O","S"]}`。`FirstParent`: `hashes` が `{O,P}`、`edgeKeys` が `{["O","P"]}`。どちらも `boundaries` が `[]`                                                                                                                            | 第三親まで元の `parentHashes` 順で扱う                                   |
| TC-011  | 標準fixtureを逆順 `X,R,U,B,A,M,N` に並べた入力で、`M`/`Direct`、`A`/`AncestorsAndDescendants`、`M`/`AllAncestors`、`M`/`FirstParent` の4通り                                           | Normal - 表示順に依存しない                                                | 4通りとも `hashes` / `edgeKeys` が TC-001〜TC-004 と同じ `Set`、`boundaries` が `[]`                                                                                                                                                                                                                                | 行順序非依存。境界の順序だけが表示順に従う（TC-018）                     |
| TC-012  | 標準fixture、`targetHash = "Z"`（入力に存在しない）、4モードそれぞれ                                                                                                                   | Boundary - 対象不在                                                        | 4モードとも `targetFound === false`、`hashes.size === 0`、`edgeKeys.size === 0`、`boundaries` が `[]`                                                                                                                                                                                                               | TC-005（`targetFound: true` で空）と区別する                             |
| TC-013  | `commits = []`、`targetHash = "M"`、`AllAncestors`                                                                                                                                     | Boundary - 空入力                                                          | `targetFound === false`、3集合とも空                                                                                                                                                                                                                                                                                | throw しない                                                             |
| TC-014  | 標準fixtureの先頭に作業ツリー行（`hash = UNCOMMITTED_CHANGES_HASH`、`parentHashes: ["N"]`）を加え、`targetHash = UNCOMMITTED_CHANGES_HASH`、`Direct`                                   | Validation - 作業ツリー行を対象にしない                                    | `targetFound === false`、3集合とも空                                                                                                                                                                                                                                                                                | 疑似行は選択不在と同じ空状態                                             |
| TC-015  | 標準fixtureに stash 行（`hash = "S1"`、`stash !== null`、`parentHashes: ["M"]`）を加え、`targetHash = "S1"`、`AllAncestors`                                                            | Validation - stash 行を対象にしない                                        | `targetFound === false`、3集合とも空                                                                                                                                                                                                                                                                                | -                                                                        |
| TC-016  | 作業ツリー行（親 `N`）と stash 行 `S1`（親 `M`）を含む標準fixture、および通常行 `W→[S1]` を追加した入力。`M`/`AncestorsAndDescendants`、`M`/`Direct`、`W`/`AllAncestors` の3通り       | Validation - 探索途中の疑似行除外                                          | `M`/`AncestorsAndDescendants`: `hashes` が `{N,M,A,B,R}`、`edgeKeys` が `{["N","M"],["M","A"],["M","B"],["A","R"],["B","R"]}`。`M`/`Direct`: `hashes` が `{N,M,A,B}`。`W`/`AllAncestors`: `hashes` が `{W}`、`edgeKeys` が空。3通りとも `boundaries` が `[]` で、`UNCOMMITTED_CHANGES_HASH` / `S1` を含むキーがない | 入力に存在する除外行への関係は無視し、欠けた通常の親（境界）と混同しない |
| TC-017  | fixture `N→[M]`、`M→[A,missing2]`、`A→[R]`、`R→[]`（`missing2` は入力にない）。`A`/`AncestorsAndDescendants` と `M`/`AncestorsAndDescendants` の2通り                                  | Validation - 子孫側で到達した頂点の別親を境界にしない                      | `A`: `hashes` が `{N,M,A,R}`、`edgeKeys` が `{["N","M"],["M","A"],["A","R"]}`、`boundaries` が `[]`（`M→missing2` を報告しない）。`M`: `hashes` が `{N,M,A,R}`、`boundaries` が `[{ childHash: "M", parentHash: "missing2" }]`                                                                                      | 境界は祖先方向で訪れた頂点だけを調べる                                   |
| TC-018  | fixture 表示順 `C3,C2,C1`、`C3→[C1,C2]`、`C2→[C1,g1]`、`C1→[g2,g1]`（`g1` / `g2` は入力にない）、`targetHash = "C3"`、`AllAncestors`。同じ関係を表示順 `C1,C2,C3` に並べた入力でも実行 | Normal - 境界の表示順・親順・重複除去                                      | 両方とも `hashes` が `{C3,C2,C1}`、`edgeKeys` が `{["C3","C1"],["C3","C2"],["C2","C1"]}`。`boundaries` は順序込みで、表示順 `C3,C2,C1` では `[C2→g1, C1→g2, C1→g1]`、表示順 `C1,C2,C3` では `[C1→g2, C1→g1, C2→g1]`（各要素は `{ childHash, parentHash }`）。`C1→g1` は `C1` へ2経路で到達しても1件                 | 子の表示順 → 元の `parentHashes` 順。ハッシュ順ソート・探索順を使わない  |

### 失敗源インベントリ（include-or-justify）— Feature 061-01 追加分（S2）

| 失敗源                                                          | 対応ケースまたは除外理由                                                                            |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 第三親以降の取りこぼし・`parentHashes` の filter による添字ずれ | TC-010                                                                                              |
| 行順序に依存した結果の変化                                      | TC-011、TC-018                                                                                      |
| 対象不在・空入力での throw や `targetFound: true`               | TC-012、TC-013                                                                                      |
| 疑似行を対象・経路・境界に含める                                | TC-014〜TC-016                                                                                      |
| 子孫側の未読み込み親を境界に含める                              | TC-017                                                                                              |
| 境界の順序・重複                                                | TC-018                                                                                              |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL）           | 空入力: TC-013。対象不在: TC-012。親3個（複数親の上限側）: TC-010。NULL: excluded(引数は非nullの型) |
| 外部依存×失敗モード                                             | excluded(純粋計算で外部依存なし)                                                                    |
| 例外・エラー経路                                                | excluded(throw 経路を持たない)                                                                      |
| 型不正・フォーマット不正                                        | excluded(TypeScript の型検査で担保)                                                                 |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-014〜TC-017
- Exception: excluded(上表のとおり)
- External: excluded(上表のとおり)
- Boundary: TC-012、TC-013
- Type: excluded(上表のとおり)
- Normal: TC-010、TC-011、TC-018

## S3: computePathHighlight() の入力不変と長い線形履歴

> Origin: Feature 061-01 (light-spec-plan)
> Added: 2026-10-03
> Status: active
> Supersedes: -
> Signature: `computePathHighlight(commits: readonly GitCommitNode[], targetHash: string, mode: PathHighlightMode): PathHighlightResult`
> Target Path: `web/pathHighlight.ts:64-214`
> Test File: `tests/web/pathHighlight.test.ts`

対応プラン §3.1 の入力不変と、§3.4 の「再帰せず頂点数と親情報件数に線形」の観点。長い履歴の件数は実装時に fixture の生成件数を本節の Notes に記録し、ミリ秒の閾値は設けない。

| Case ID | Input / Precondition                                                                                                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                | Notes                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| TC-019  | 標準fixtureを配列・各commit・`parentHashes`・`refs` まで `Object.freeze` した入力で `M`/`AllAncestors`                                                       | Validation - 深くfreezeした入力の不変                                      | throw せず結果が TC-003 と同じ。実行前後の入力の `JSON.stringify` が一致し、各 `parentHashes` の参照と順序が変わらない。返した `hashes` / `edgeKeys` / `boundaries` は入力のどの配列・`Set` とも同一参照でない | 入力オブジェクトを変更しない                              |
| TC-020  | 配列から生成した線形履歴 `c0→[c1]`、`c1→[c2]`、…、`c(n-1)→[]`（n は実装時に記録する件数）。`c0`/`AllAncestors` と `c(n-1)`/`AncestorsAndDescendants` の2通り | Boundary - 長い履歴を再帰なしで処理                                        | 両方とも `RangeError` を投げず、`hashes.size === n` で `c0` と `c(n-1)` を含み、`edgeKeys.size === n - 1` で `["c0","c1"]` と `["c(n-2)","c(n-1)"]` を含み、`boundaries` が `[]`                               | fixture件数は実装時に記録。根拠のないミリ秒閾値を置かない |

### 失敗源インベントリ（include-or-justify）— Feature 061-01 追加分（S3）

| 失敗源                                                | 対応ケースまたは除外理由                                         |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| 入力配列・`parentHashes` の変更、入力の `Set` の流用  | TC-019                                                           |
| 再帰による深い履歴でのスタック溢れ                    | TC-020                                                           |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL） | 長い履歴の先頭・末尾: TC-020。その他は S1 / S2 で扱う            |
| 入力検証・外部依存・例外・型                          | excluded(純粋計算で入力検証分岐・外部依存・throw 経路を持たない) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-019
- Exception: excluded(上表のとおり)
- External: excluded(上表のとおり)
- Boundary: TC-020
- Type: excluded(上表のとおり)
