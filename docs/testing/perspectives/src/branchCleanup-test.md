# テスト観点表: src/branchCleanup.ts

> Source: `src/branchCleanup.ts`
> Generated: 2026-08-25T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Storage Mode: single-file

## S1: NUL snapshot parse と record / field validation

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `parseBranchSnapshot(stdout: string): BranchSnapshot`（純関数。実装後に正確な関数名へ更新）
> Target Path: `src/branchCleanup.ts`（NUL snapshot parse。実装後に行範囲へ更新）
> Test File: `tests/src/branchCleanup.test.ts`

`for-each-ref` の NUL 区切り 7 field（`%(refname)` / `%(HEAD)` / `%(upstream)` / `%(upstream:track)` / `%(committerdate:unix)` / `%(objectname)` / `%(tree)`）出力を immutable な内部 snapshot へ変換する純関数の観点。snapshot の identity である `refs/heads/` refname が不正な record は record 単位で除外し、commit / tree / date / upstream の不正は該当 fact だけを unknown にする（対応プラン §4 Task 2 実装内容 2）。child process の起動・引数は `src/dataSource-test/06-branch-cleanup-01.md` S48 の責務で本表には含めない。

| Case ID | Input / Precondition                                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                        | Notes                                 |
| ------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| TC-001  | 正常 7 field の 2 record（`refs/heads/main` current、`refs/heads/feature/x`）を NUL 区切りで入力 | Normal - 全 field 正常 parse                                               | 2 entry の snapshot が返り、branchName / isCurrent / commit OID / tree OID / unixSeconds が入力値と `toEqual` で一致し、entry 順が入力順のまま保たれる | `--sort=refname` 順の保持             |
| TC-002  | `%(upstream)` が `refs/remotes/origin/feature/x`、`%(upstream:track)` が空の record              | Normal - upstream present                                                  | 当該 entry の upstream が `{ kind: "present", name: "origin/feature/x" }` と `toEqual` で一致する                                                      | unset / gone と潰さない               |
| TC-003  | `%(upstream)` が空文字の record                                                                  | Normal - upstream unset                                                    | 当該 entry の upstream が `{ kind: "unset" }` と `toEqual` で一致する（`unknown` ではない）                                                            | 未設定と取得失敗の区別                |
| TC-004  | `%(upstream)` あり、`%(upstream:track)` が `[gone]` の record                                    | Normal - upstream gone                                                     | 当該 entry の upstream が `{ kind: "gone", name: "origin/feature/x" }` と `toEqual` で一致する                                                         | gone を unset と潰さない              |
| TC-005  | refname が `refs/tags/v1` の record を正常 record と混在させて入力                               | Validation - refname 不正 record の除外                                    | 不正 record が結果に含まれず entry 数が正常 record 数と一致し、正常 record の全 fact は保持される                                                      | 行 identity を作れない record は除外  |
| TC-006  | field 数が 7 未満の record を正常 record と混在させて入力                                        | Validation - field 数不足 record の除外                                    | 不正 record が結果に含まれず、正常 record の全 fact は保持される                                                                                       | field 位置ずれの伝播防止              |
| TC-007  | `%(objectname)` が OID 形式でない（`xyz`）record                                                 | Validation - commit OID 不正                                               | 当該 entry の comparison 用 commit OID が不正として保持されず（後段合成で ancestry / aheadBehind が `unknown`）、branchName / lastCommit は保持される  | fact 単位の局所化                     |
| TC-008  | `%(tree)` が OID 形式でない record                                                               | Validation - tree OID 不正                                                 | 当該 entry の tree OID が不正として保持されず（後段合成で treeDifference が `unknown`）、他 fact は保持される                                          | fact 単位の局所化                     |
| TC-009  | `%(committerdate:unix)` が非数値（`abc`）の record                                               | Validation - 日時不正                                                      | 当該 entry の lastCommit が `{ kind: "unknown" }` と `toEqual` で一致し、他 fact は保持される                                                          | -                                     |
| TC-010  | stdout が空文字                                                                                  | Boundary - 0 record                                                        | entry 0 件の snapshot が返る（例外を送出しない。空は成功状態であり error と区別される）                                                                | 0 branch 反例の入口                   |
| TC-011  | 正常 record 1 件のみ                                                                             | Boundary - 1 record                                                        | entry 1 件の snapshot が返り、全 fact が入力値と一致する                                                                                               | 1 branch 反例の入口                   |
| TC-012  | `%(committerdate:unix)` が `0` の record                                                         | Boundary - unix 秒 0                                                       | 当該 entry の lastCommit が `{ kind: "known", unixSeconds: 0 }` と `toEqual` で一致する（0 を unknown へ潰さない）                                     | epoch 境界                            |
| TC-013  | refname が `refs/heads/a;b`、`refs/heads/feat/$(date)`、`refs/heads/x<img>` の 3 record          | Type - 特殊名をデータとして保持                                            | 3 entry の branchName がそれぞれ `a;b` / `feat/$(date)` / `x<img>` と `toBe` で一致する（解釈・加工・除外をしない）                                    | shell / HTML として解釈しない同一分岐 |

### 失敗源インベントリ（include-or-justify）— Feature 055-03 追加分（S1）

| 失敗源                                    | 対応ケースまたは除外理由                                                                           |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| refname 不正 record の混入                | TC-005                                                                                             |
| field 数不足 record の混入                | TC-006                                                                                             |
| commit / tree OID の不正                  | TC-007、TC-008                                                                                     |
| 日時の不正・0 値の潰し                    | TC-009、TC-012                                                                                     |
| upstream の unset / gone / present の混同 | TC-002〜TC-004                                                                                     |
| 空出力・1 件の縮退                        | TC-010、TC-011                                                                                     |
| 特殊名の解釈・除外                        | TC-013                                                                                             |
| 外部依存×失敗モード（Git 実行失敗）       | excluded(child process と失敗分離は `src/dataSource-test/06-branch-cleanup-01.md` S48 の責務)      |
| 例外・エラー経路                          | excluded(純関数は throw せず不正を除外 / unknown へ写像する契約。除外分岐は TC-005〜TC-009 で検証) |
| 境界値（minimum / maximum / +/-1 / NULL） | excluded(入力は Git 出力文字列で数値引数を持たない。0 / empty は TC-010 / TC-012 で充足)           |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-005〜TC-009
- Exception: excluded(上表のとおり throw 経路を持たない契約)
- External: excluded(外部依存なし。Git 実行は dataSource owner の責務)
- Boundary: TC-010〜TC-012
- Type: TC-013
- Normal: TC-001〜TC-004

**失敗系/正常系比（煙感知器）**: 正常系4件（TC-001〜TC-004）、失敗系9件（TC-005〜TC-013）、比2.25。インベントリ由来の導出であり比率合わせの追加・削除は行っていない。

## S2: 比較先解決（requested / origin/HEAD / main / master / current fallback）

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `resolveCompareBranch(snapshot: BranchSnapshot, originHeadTarget: string | null, requested: string | null): ResolvedCompare | null`（純関数。実装後に正確な関数名へ更新）
> Target Path: `src/branchCleanup.ts`（比較先解決。実装後に行範囲へ更新）
> Test File: `tests/src/branchCleanup.test.ts`

requested branch name は local snapshot への完全一致後だけ OID を使用し、不在時は origin/HEAD → main → master → current の順で同じ snapshot 上を fallback する契約（対応プラン §3.1）。detached かつ fallback 全滅では比較先なし（null）とし、勝手な既定値を作らない。

| Case ID | Input / Precondition                                                                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                        | Notes                            |
| ------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| TC-014  | snapshot に `develop` あり、requested = `develop`                                                        | Normal - requested 完全一致                                                | 解決結果の branch 名が `develop`、比較 OID が snapshot の `develop` entry の commit OID と `toBe` で一致する           | Git 由来 OID のみ使用            |
| TC-015  | snapshot に requested = `gone-branch` が不在、origin/HEAD が `main` を指し local `main` あり             | Validation - requested 消失時の fallback                                   | requested を使わず fallback が評価され、解決結果の branch 名が `main` になる                                           | 消失した名前の OID を作らない    |
| TC-016  | requested = null、origin/HEAD が `refs/remotes/origin/main` を指し、同名 local `main` が snapshot に存在 | Normal - origin/HEAD → 同名 local                                          | 解決結果の branch 名が `main`、比較 OID が local `main` の commit OID と `toBe` で一致する（remote 側 OID を使わない） | local snapshot への完全一致      |
| TC-017  | origin/HEAD が `release` を指すが同名 local が snapshot に不在、local `main` あり                        | Validation - origin/HEAD 同名 local なし                                   | origin/HEAD 由来の値を使わず、解決結果の branch 名が `main` になる                                                     | remote を指す origin/HEAD の反例 |
| TC-018  | origin/HEAD なし、`main` 不在、`master` が snapshot に存在                                               | Normal - master fallback                                                   | 解決結果の branch 名が `master` になる                                                                                 | -                                |
| TC-019  | origin/HEAD なし、`main` / `master` 不在、current branch `topic` が存在                                  | Normal - current fallback                                                  | 解決結果の branch 名が `topic`（isCurrent な entry）になる                                                             | 最後の fallback                  |
| TC-020  | detached（isCurrent な entry なし）かつ origin/HEAD / `main` / `master` すべて不在                       | Boundary - detached fallback なし                                          | 解決結果が `null` になる（既定値を合成しない。後段で全行 `notSelected`）                                               | 反例: detached fallback なし     |
| TC-021  | snapshot が current の 1 branch のみ、requested = null                                                   | Boundary - 1 branch                                                        | 解決結果の branch 名がその 1 branch と一致する（current fallback で自分自身が比較先になる）                            | 1 branch 反例                    |

### 失敗源インベントリ（include-or-justify）— Feature 055-03 追加分（S2）

| 失敗源                                                | 対応ケースまたは除外理由                                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 消失した requested の名前 / OID を使う                | TC-015                                                                                         |
| origin/HEAD が remote を指すのに OID を流用する       | TC-016、TC-017                                                                                 |
| fallback 順序（main / master / current）の誤り        | TC-017〜TC-019                                                                                 |
| detached で比較先を捏造する                           | TC-020                                                                                         |
| 1 branch の縮退                                       | TC-021                                                                                         |
| 外部依存×失敗モード                                   | excluded(純関数で外部依存なし。origin/HEAD 取得失敗の扱いは dataSource owner S48 の責務)       |
| 例外・エラー経路                                      | excluded(throw せず null を返す契約。null 分岐は TC-020 で検証)                                |
| 不正な型・フォーマット                                | excluded(入力 snapshot の record / field validation は S1 の責務)                              |
| 境界値（0 / minimum / maximum / +/-1 / NULL / empty） | excluded(数値引数なし。空 snapshot は 0 branch として S4 TC-039 で、null 解決は TC-020 で充足) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-015、TC-017
- Exception: excluded(throw 経路なし)
- External: excluded(外部依存なし)
- Boundary: TC-020、TC-021
- Type: excluded(入力検証は S1 の責務)
- Normal: TC-014、TC-016、TC-018、TC-019

**失敗系/正常系比（煙感知器）**: 正常系4件（TC-014、TC-016、TC-018、TC-019）、失敗系4件（TC-015、TC-017、TC-020、TC-021）。同数のためインベントリを再導出したが、本 section の失敗源は fallback 選択の誤りと縮退（消失・同名不在・detached・1 branch）に限られ、入力不正は S1、Git 失敗は dataSource owner へ割り当て済みであることを確認した。

## S3: ahead/behind parse と remote ref 完全一致

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `parseAheadBehind(stdout: string): BranchCleanupAheadBehind` / `matchRemoteRefs(branchName: string, remoteNames: readonly string[], remoteRefs: readonly string[]): string[]`（純関数。実装後に正確な関数名へ更新）
> Target Path: `src/branchCleanup.ts`（ahead/behind parse と remote 照合。実装後に行範囲へ更新）
> Test File: `tests/src/branchCleanup.test.ts`

`rev-list --left-right --count ${compareOid}...${branchOid}` の出力（`left<TAB>right`。left = 比較先のみのコミット数 = behind、right = branch のみのコミット数 = ahead）を parse し、祖先関係は右値のみで決める契約（対応プラン §3.1）。remote 照合は remote 名を slash で分割せず、`refs/remotes/${remoteName}/${branchName}` の完全一致だけを使う。

| Case ID | Input / Precondition                                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                          | Notes                               |
| ------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| TC-022  | stdout = `0\t0`                                                                                            | Normal - 同一点                                                            | `{ kind: "known", ahead: 0, behind: 0 }` と `toEqual` で一致し、祖先判定が `ancestor` になる                             | 右値 0 → 祖先                       |
| TC-023  | stdout = `3\t2`                                                                                            | Normal - 分岐あり                                                          | `{ kind: "known", ahead: 2, behind: 3 }` と `toEqual` で一致し、祖先判定が `notAncestor` になる                          | left = behind / right = ahead       |
| TC-024  | stdout = `5\t0`                                                                                            | Normal - behind のみ                                                       | `{ kind: "known", ahead: 0, behind: 5 }` と `toEqual` で一致し、祖先判定が `ancestor` になる（左値では祖先を否定しない） | 通常 merge 反例の基礎               |
| TC-025  | stdout = `abc` または TAB 欠落の `3 2`                                                                     | Type - 出力形式不正                                                        | `{ kind: "unknown" }` と `toEqual` で一致し、祖先判定も `unknown` になる（数値へ潰さない）                               | -                                   |
| TC-026  | stdout = `9007199254740993\t0`（safe integer 超）                                                          | Boundary - safe integer 超過                                               | `{ kind: "unknown" }` と `toEqual` で一致する（精度落ちした数値を known として返さない）                                 | Number.MAX_SAFE_INTEGER + 2         |
| TC-027  | remoteNames = `["origin"]`、remoteRefs に `refs/remotes/origin/feature/x` あり、branchName = `feature/x`   | Normal - remote 完全一致                                                   | 戻り値が `["origin"]` と `toEqual` で一致する                                                                            | -                                   |
| TC-028  | remoteNames = `["my", "my/remote"]`、remoteRefs に `refs/remotes/my/remote/feat` あり、branchName = `feat` | Normal - slash を含む remote 名                                            | 戻り値に `my/remote` が含まれる（remote 名の slash 分割では照合せず full ref の完全一致で照合する）                      | slash 分割の反例                    |
| TC-029  | remoteRefs に `refs/remotes/origin/feature/x-suffix` のみ、branchName = `feature/x`                        | Validation - 前方一致の排除                                                | 戻り値が `[]` と `toEqual` で一致する（前方一致・部分一致を採用しない）                                                  | 完全一致のみ                        |
| TC-030  | remoteRefs = `[]`                                                                                          | Boundary - remote ref 0 件                                                 | 戻り値が `[]` と `toEqual` で一致する（`null` ではない。取得成功の空と取得失敗を区別する）                               | 失敗時の null は S4 / dataSource 側 |

### 失敗源インベントリ（include-or-justify）— Feature 055-03 追加分（S3）

| 失敗源                                      | 対応ケースまたは除外理由                                                                       |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| left / right の取り違え                     | TC-023、TC-024                                                                                 |
| 左値で祖先を否定する（通常 merge 反例の源） | TC-024                                                                                         |
| 出力形式不正を数値へ潰す                    | TC-025                                                                                         |
| safe integer 超過の精度落ち                 | TC-026                                                                                         |
| remote 名の slash 分割による誤照合          | TC-028                                                                                         |
| 前方一致・部分一致の誤採用                  | TC-029                                                                                         |
| 空集合と取得失敗の混同                      | TC-030                                                                                         |
| 外部依存×失敗モード（rev-list 実行失敗）    | excluded(コマンド失敗の分離は `src/dataSource-test/06-branch-cleanup-01.md` S48 TC-317 の責務) |
| 例外・エラー経路                            | excluded(throw せず unknown へ写像する契約。unknown 分岐は TC-025 / TC-026 で検証)             |
| 境界値（minimum / +/-1 / NULL）             | excluded(0 は TC-022、上限は TC-026、空は TC-030 で充足。null 入力は型契約上不成立)            |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-029
- Exception: excluded(throw 経路なし)
- External: excluded(外部依存なし)
- Boundary: TC-026、TC-030
- Type: TC-025
- Normal: TC-022〜TC-024、TC-027、TC-028

**失敗系/正常系比（煙感知器）**: 正常系5件（TC-022〜TC-024、TC-027、TC-028）、失敗系4件（TC-025、TC-026、TC-029、TC-030）。差1のためインベントリを再導出したが、parse / 照合の失敗源は形式不正・精度・誤照合・空集合に限られ、実行失敗は dataSource owner へ割り当て済みであることを確認した。

## S4: 行合成（fact 独立・failure 局所化・反例）

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `synthesizeRows(snapshot: BranchSnapshot, compare: ResolvedCompare | null, comparisons: ..., worktrees: ..., remotes: ...): BranchCleanupRow[]`（純関数。実装後に正確な関数名・引数へ更新）
> Target Path: `src/branchCleanup.ts`（行合成。実装後に行範囲へ更新）
> Test File: `tests/src/branchCleanup.test.ts`

祖先関係（rev-list 右値）と tree 差分（tree OID 一致）を独立 field として合成し、fact ごとの取得失敗を discriminated union で局所化する行合成の観点（対応プラン §3.1 / §3.2）。入力を mutate せず新しい配列・object を返す。

| Case ID | Input / Precondition                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                           | Notes                          |
| ------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| TC-031  | ahead 0 / behind 2、比較先 tree OID ≠ branch tree OID                      | Normal - 通常 merge 反例                                                   | 行が `ancestry: "ancestor"` かつ `treeDifference: "different"` へ合成される（tree が進んでいても祖先）                                    | §3.1 反例の左側                |
| TC-032  | ahead 1 / behind 1、比較先 tree OID = branch tree OID                      | Normal - squash 反例                                                       | 行が `ancestry: "notAncestor"` かつ `aheadBehind: { kind: "known", ahead: 1, behind: 1 }` かつ `treeDifference: "same"` へ合成される      | §3.1 反例の右側                |
| TC-033  | comparison が unknown、双方の tree OID は valid                            | Normal - tree 独立算出                                                     | 行が `ancestry: "unknown"` のまま `treeDifference` は tree OID 比較から `"same"` / `"different"` へ算出される（unknown へ引きずられない） | 行単位 rev-list failure の合成 |
| TC-034  | worktree collection の branches に該当 branch のentry（path / isMain）あり | Normal - worktree used                                                     | 行の worktree が `{ kind: "used", path: "<入力 path>", isMain: <入力値> }` と `toEqual` で一致する                                        | -                              |
| TC-035  | worktree collection 取得成功で該当 branch の entry なし                    | Normal - worktree unused                                                   | 行の worktree が `{ kind: "unused" }` と `toEqual` で一致する                                                                             | -                              |
| TC-036  | worktree collection が取得失敗を表す入力（unavailable）                    | Exception - worktree 失敗の保持                                            | 全行の worktree が `{ kind: "unknown" }` と `toEqual` で一致する（`unused` へ潰さない）                                                   | 反例: worktree failure         |
| TC-037  | remote 一覧が取得失敗を表す入力（unavailable）                             | Exception - remote 失敗の保持                                              | 全行の remotes が `null` になる（`[]` へ潰さない）                                                                                        | 反例: remote failure           |
| TC-038  | compare = null（比較先なし）                                               | Boundary - notSelected 伝播                                                | 全行の ancestry / treeDifference が `"notSelected"`、aheadBehind が `{ kind: "notSelected" }` になる（`unknown` ではない）                | detached fallback なしの下流   |
| TC-039  | snapshot が 0 entry                                                        | Boundary - 0 branch                                                        | 戻り値が `[]` と `toEqual` で一致する（例外なし。成功空状態）                                                                             | -                              |
| TC-040  | 呼出前に snapshot / comparison 入力の deep copy を取り、合成後に比較       | Validation - 入力 immutability                                             | 呼出後の入力が deep copy と `toEqual` で一致し（mutate なし）、戻り値配列が入力配列と別参照（`not.toBe`）である                           | coding-style immutability      |

### 失敗源インベントリ（include-or-justify）— Feature 055-03 追加分（S4）

| 失敗源                                         | 対応ケースまたは除外理由                                                         |
| ---------------------------------------------- | -------------------------------------------------------------------------------- |
| 祖先関係と tree 差分の混同（総合判定への縮退） | TC-031、TC-032                                                                   |
| comparison unknown の tree 列への伝播          | TC-033                                                                           |
| worktree / remote 失敗を空・unused へ畳む      | TC-036、TC-037                                                                   |
| notSelected と unknown の混同                  | TC-038                                                                           |
| 0 branch の縮退                                | TC-039                                                                           |
| 入力の mutate                                  | TC-040                                                                           |
| worktree used / unused の取り違え              | TC-034、TC-035                                                                   |
| 外部依存×失敗モード                            | excluded(純関数で外部依存なし。失敗の発生源は dataSource owner S48 の責務)       |
| 例外・エラー経路                               | excluded(throw せず union へ写像する契約。失敗値の写像は TC-036 / TC-037 で検証) |
| 不正な型・フォーマット                         | excluded(field validation は S1、parse 不正は S3 の責務)                         |
| 境界値（minimum / maximum / +/-1 / NULL）      | excluded(数値引数なし。0 / 空 / null 相当は TC-038 / TC-039 で充足)              |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-040
- Exception: TC-036、TC-037
- External: excluded(外部依存なし)
- Boundary: TC-038、TC-039
- Type: excluded(型・形式不正は S1 / S3 の責務)
- Normal: TC-031〜TC-035

**失敗系/正常系比（煙感知器）**: 正常系5件（TC-031〜TC-035）、失敗系5件（TC-036〜TC-040）。同数のためインベントリを再導出したが、合成段の失敗源は失敗値の保持・伝播境界・immutability に限られ、入力不正（S1 / S3）と実行失敗（dataSource S48）は他 section / owner へ割り当て済みであることを確認した。正常系 5 件のうち TC-031〜TC-033 は §3.1 の反例シナリオを直接固定する case であり、比率合わせの追加・削除は行っていない。

## S5: HEAD mark・upstream prefix・origin 外 symref の fact 劣化

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `parseBranchSnapshot(stdout: string): BranchSnapshotEntry[]`（HEAD / upstream field の劣化経路）/ `parseOriginHeadTarget(stdout: string): string | null`（origin 外 symref）
> Target Path: `src/branchCleanup.ts:97-113`（parseIsCurrent / parseUpstream）、`src/branchCleanup.ts:174-186`（parseOriginHeadTarget）
> Test File: `tests/src/branchCleanup.test.ts`

S1 preamble の契約「commit / tree / date / HEAD / upstream の不正は該当 fact だけを unknown にする」のうち、S1 で case row 未採番だった HEAD mark 不正・upstream prefix 不正と、S2 の contract 記載のみだった origin 外 symref を additive に採番する（Task 6 再照合で発見、既存 S1〜S4 は不変）。正常系・他 fact の保持は S1〜S4 の既存 case が担保する。

| Case ID | Input / Precondition                                                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                     | Notes                            |
| ------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| TC-041  | `%(HEAD)` field が `*` / 空白 / 空以外の値（`?`）の record                                                       | Validation - HEAD mark 不正                                                | 当該 entry の isCurrent が `null` になり（true / false へ潰さない）、branchName / commit OID / lastCommit は保持される                              | fact 単位の局所化                |
| TC-042  | `%(upstream)` が `refs/remotes/` にも `refs/heads/` にも該当しない ref（`refs/foo/bar`）の record                | Validation - upstream prefix 不正                                          | 当該 entry の upstream が `{ kind: "unknown" }` と `toEqual` で一致し（unset / present へ潰さない）、他 fact は保持される                           | 不明形式は取得失敗扱い           |
| TC-043  | origin/HEAD の `%(symref)` が `refs/remotes/origin/` 外（`refs/remotes/upstream/main`）で、snapshot に main あり | Validation - origin 外 symref                                              | `parseOriginHeadTarget()` が `null` を返し、`resolveCompareBranch()` は origin/HEAD を採用せず次順位の `main` を解決する（origin 外の値を使わない） | S2 TC-016〜TC-018 の fallback 列 |

### 失敗源インベントリ（include-or-justify）— Feature 055-03 追加分（S5）

| 失敗源                                                | 対応ケースまたは除外理由                                                                      |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| HEAD mark 不正を true / false へ潰す                  | TC-041                                                                                        |
| upstream prefix 不正を unset / present へ潰す         | TC-042                                                                                        |
| origin 外 symref を比較先として流用する               | TC-043                                                                                        |
| 正常系・他 fact の保持                                | excluded(S1 TC-001〜TC-004 / S2 TC-014〜TC-021 の既存 case が担保。本 section は劣化経路のみ) |
| 外部依存×失敗モード                                   | excluded(純関数で外部依存なし。Git 実行失敗は dataSource owner S48 の責務)                    |
| 例外・エラー経路                                      | excluded(throw せず null / unknown へ写像する契約。写像自体を TC-041〜TC-043 で検証)          |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL） | excluded(数値引数なし。空 field は S1 TC-003 / TC-010、空 symref target は同一分岐の TC-043)  |
| 不正な型・フォーマット                                | excluded(record / field 構造の不正は S1 TC-005〜TC-009 の責務。本 section は値域の劣化)       |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-041〜TC-043
- Exception: excluded(throw 経路なし)
- External: excluded(外部依存なし)
- Boundary: excluded(数値・空境界は S1 の責務)
- Type: excluded(構造不正は S1 の責務)
- Normal: excluded(正常系は S1 / S2 の既存 case が担保する劣化専用 section)

**失敗系/正常系比（煙感知器）**: 正常系0件、失敗系3件（TC-041〜TC-043）。本 section は S1 / S2 の正常系を前提に劣化経路だけを additive に採番したもので、正常系0件はインベントリ欠落ではないことを確認した。
