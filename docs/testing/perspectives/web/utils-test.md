# テスト観点表: web/utils.ts

> Source: `web/utils.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: svgIcons SVGアイコン検証

> Origin: Feature 001 (menu-bar-enhancement) Task 1.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `web/utils.ts`

| Case ID | Input / Precondition  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                | Notes |
| ------- | --------------------- | -------------------------------------------------------------------------- | ------------------------------ | ----- |
| TC-001  | svgIcons.fetch を参照 | Normal - standard                                                          | 空でない文字列で `<svg` を含む | -     |
| TC-002  | svgIcons.stash を参照 | Normal - standard                                                          | 空でない文字列で `<svg` を含む | -     |

## S2: buildCommitRowAttributes() muted パラメータ

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**シグネチャ**: `buildCommitRowAttributes(hash: string, stash: GG.GitCommitStash | null, muted: boolean): string`
**テスト対象パス**: `web/utils.ts`

| Case ID | Input / Precondition                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                             | Notes                  |
| ------- | ----------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------- |
| TC-003  | hash="abc123", stash=null, muted=true                 | Normal - standard                                                          | class="commit mute" data-hash="abc123" を含む               | mute 適用              |
| TC-004  | hash="abc123", stash=null, muted=false                | Normal - standard                                                          | class="commit" data-hash="abc123" を含む（mute なし）       | mute 非適用            |
| TC-005  | hash="abc123", stash={...}, muted=true                | Normal - special                                                           | class="commit stash" data-hash="abc123" を含む（mute なし） | stash は mute 不適用   |
| TC-006  | hash=UNCOMMITTED_CHANGES_HASH, stash=null, muted=true | Normal - special                                                           | class="unsavedChanges" を含む（mute なし）                  | unsaved は mute 不適用 |
| TC-007  | hash="abc123", stash=null, muted=true                 | Normal - standard                                                          | data-hash="abc123" が含まれる                               | data-hash 保持         |

## S3: svgIcons.worktree アイコン検証

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: active
> Supersedes: -

**テスト対象パス**: `web/utils.ts`

| Case ID | Input / Precondition     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                | Notes   |
| ------- | ------------------------ | -------------------------------------------------------------------------- | ------------------------------ | ------- |
| TC-008  | svgIcons.worktree を参照 | Normal - standard                                                          | 空でない文字列で `<svg` を含む | REQ-2.1 |

## S4: sanitizeBranchNameForPath() branch名パス正規化

> Origin: Feature 024 (worktree-path-normalize) (aidd-spec-tasks-test)
> Added: 2026-03-27
> Status: active
> Supersedes: -

**シグネチャ**: `sanitizeBranchNameForPath(branchName: string): string`
**テスト対象パス**: `web/utils.ts`

| Case ID | Input / Precondition              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                   | Notes                                |
| ------- | --------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------ |
| TC-009  | branchName = "feature/x"          | Normal - standard                                                          | 返却値が `"feature-x"` である                                     | REQ-9.1-TC1: / → -                   |
| TC-010  | branchName = "feature/sub/branch" | Normal - standard                                                          | 返却値が `"feature-sub-branch"` である                            | REQ-9.1-TC2: 複数スラッシュ          |
| TC-011  | branchName = "feature//x"         | Normal - consecutive                                                       | 返却値が `"feature-x"` である（連続 / を1つの - に折り畳み）      | REQ-9.1-TC3                          |
| TC-012  | branchName = "path\\file"         | Normal - standard                                                          | 返却値が `"path-file"` である                                     | REQ-9.1-TC4: バックスラッシュ        |
| TC-013  | branchName = "fix:bug"            | Normal - standard                                                          | 返却値が `"fix-bug"` である                                       | REQ-9.1-TC4: コロン                  |
| TC-014  | branchName = 'a\*b?c"d<e>f\|g'    | Normal - standard                                                          | 返却値が `"a-b-c-d-e-f-g"` である                                 | REQ-9.1-TC4: 残り6種 (\* ? " < > \|) |
| TC-015  | branchName = "feature branch"     | Normal - standard                                                          | 返却値が `"feature-branch"` である                                | REQ-9.1-TC4: 半角スペース            |
| TC-016  | branchName = "main"               | Normal - no-change                                                         | 返却値が `"main"` である（無変更）                                | REQ-9.1-TC5                          |
| TC-017  | branchName = "feature/ x"         | Normal - consecutive                                                       | 返却値が `"feature-x"` である（/ + スペースを1つの - に折り畳み） | REQ-9.1-TC6                          |
| TC-018  | branchName = ""                   | Boundary - empty                                                           | 返却値が `""` である                                              | 空文字列                             |
| TC-019  | branchName = "feature-x"          | Normal - idempotent                                                        | 返却値が `"feature-x"` である                                     | 冪等性: f(f(x)) === f(x)             |

## S5: worktreeCollectionsEqual() collection 差分判定

> Origin: Feature 052 (detached-worktree-display) (light-spec-plan)
> Added: 2026-08-08
> Status: active
> Supersedes: -
> Signature: `worktreeCollectionsEqual(a: GG.WorktreeCollection, b: GG.WorktreeCollection): boolean`
> Target Path: `web/utils.ts`（`worktreeCollectionsEqual()`。実装後に行範囲へ更新）
> Test File: `tests/web/utils.test.ts`

`worktreeMapsEqual()` を `worktreeCollectionsEqual()` へ改名し、`branches` のキー・`path`・`isMain` に加えて `detached` の配列長と各 index の `path`・`isMain`・`head` を比較する追加。`detached` は parser 側で完全 path の昇順に正規化されるため、集合比較や呼び出し側での再 sort は行わず index 同士を比較する。既存 branch map の比較規則は変えないため S1〜S4 は supersede しない。再描画のスキップ判定そのものは `web/main-test/01-rendering-02.md` S48 TC-299 の責務。

| Case ID | Input / Precondition                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                             | Notes                             |
| ------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------- |
| TC-020  | branches 1 件と detached 1 件が全 field 一致する 2 つの collection        | Normal - identical collections                                             | 戻り値が `true` である                                                      | 同値判定                          |
| TC-021  | 双方が `{ branches: {}, detached: [] }`                                   | Boundary - both empty                                                      | 戻り値が `true` である                                                      | 空 fallback 同士                  |
| TC-022  | branches が空、detached だけが全 field 一致する 2 つの collection         | Normal - detached only                                                     | 戻り値が `true` である                                                      | branch なし repository            |
| TC-023  | branches のキー数が 1 と 2 で異なる（detached は同一）                    | Boundary - branch count differs                                            | 戻り値が `false` である                                                     | 8.3 の branches 差分              |
| TC-024  | branches のキー数は同じでキー名だけが異なる（`feature/x` と `feature/y`） | Validation - branch key mismatch                                           | 戻り値が `false` である                                                     | 件数一致でも検出する              |
| TC-025  | branches の `path` だけが異なる                                           | Validation - branch path differs                                           | 戻り値が `false` である                                                     | field 単位の差分                  |
| TC-026  | branches の `isMain` だけが異なる                                         | Validation - branch isMain differs                                         | 戻り値が `false` である                                                     | field 単位の差分                  |
| TC-027  | detached の配列長が 1 と 2 で異なる（branches は同一）                    | Boundary - detached length differs                                         | 戻り値が `false` である                                                     | 8.3 の detached 差分              |
| TC-028  | detached[0] の `path` だけが異なる                                        | Validation - detached path differs                                         | 戻り値が `false` である                                                     | field 単位の差分                  |
| TC-029  | detached[0] の `isMain` だけが異なる                                      | Validation - detached isMain differs                                       | 戻り値が `false` である                                                     | field 単位の差分                  |
| TC-030  | detached[0] の `head` だけが異なる                                        | Validation - detached head differs                                         | 戻り値が `false` である                                                     | 8.3 の head 差分。HEAD 移動の検出 |
| TC-031  | detached の要素集合は同一で並び順だけが入れ替わっている                   | Boundary - detached order differs                                          | 戻り値が `false` である（index 同士を比較し、集合比較や再 sort を行わない） | 4.5 の正規化前提                  |

### 失敗源インベントリ（include-or-justify）— Feature 052 追加分（S5）

| 失敗源                                                 | 対応ケースまたは除外理由                                                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| detached を比較対象から落とす                          | TC-027〜TC-031                                                                                                                                          |
| `head` の差分だけを見落とす（HEAD 移動を検出できない） | TC-030                                                                                                                                                  |
| branches 比較の既存規則を壊す                          | TC-020、TC-023〜TC-026                                                                                                                                  |
| 配列長だけを比べて要素の field を見ない                | TC-028〜TC-030                                                                                                                                          |
| 集合比較や再 sort で順序差を無視する                   | TC-031                                                                                                                                                  |
| 境界値（empty）                                        | TC-021（双方空）、TC-022（branches 空）                                                                                                                 |
| 境界値（0 / minimum / maximum / +/-1）                 | TC-023 / TC-027（件数 +/-1 の差分）。数値上限は collection に存在しないため非該当                                                                       |
| 境界値（NULL）                                         | excluded(引数が `WorktreeCollection` 必須型で `null` を取り得ない。応答省略時の空 collection 化は `web/main-test/01-rendering-02.md` S48 TC-298 の責務) |
| 外部依存の失敗                                         | excluded(純関数で外部依存を持たない)                                                                                                                    |
| 例外送出                                               | excluded(戻り値が `boolean` の純関数で throw 経路を持たない)                                                                                            |
| 旧 `worktreeMapsEqual` の呼び出しが残る                | excluded(実行コードと test import の symbol 検索で確認する静的条件。Task 5 の完了条件で担保する)                                                        |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-024、TC-025、TC-026、TC-028、TC-029、TC-030
- Exception: excluded(throw 経路なし)
- External: excluded(外部依存なし)
- Boundary: TC-021、TC-023、TC-027、TC-031
- Type: excluded(引数は型で `WorktreeCollection` に固定され、不正型は typecheck が拒否する。型契約は `src/types-test.md` S7 の責務)

**失敗系/正常系比（煙感知器）**: 正常系 2 件（TC-020、TC-022）、失敗系 10 件（TC-021、TC-023〜TC-031）。比 5.0 で近接（差 1 以内）ではないため、インベントリ再導出は不要と判断した。
