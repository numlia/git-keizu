# テスト観点表: src/dataSource.ts

> Source: `src/dataSource.ts`
> Generated: 2026-08-25T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: branch-cleanup

## S48: getBranchCleanup() Git orchestration・失敗分離・3 並列

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `public async getBranchCleanup(repo: string, requestedCompareBranch: string | null): Promise<BranchCleanupResult>`
> Target Path: `src/dataSource.ts`（`getBranchCleanup()`。実装後に行範囲へ更新）
> Test File: `tests/src/dataSource.git.test.ts`

`for-each-ref` snapshot を先に取得し、比較は snapshot の検証済み commit OID だけで `rev-list --left-right --count` を `BRANCH_COMPARISON_MAX_PARALLEL = 3` の `evalPromises()` で実行、worktree / remote 名一覧 / refs/remotes を独立取得して失敗を fact 単位へ分離する orchestration の観点（対応プラン §3.2 / §4 Task 2）。NUL parse・fallback 決定則・行合成の分岐は `src/branchCleanup-test.md` S1〜S4 の責務で、本表は Git 引数・call count・失敗分離・並列数だけを対象にする。

| Case ID | Input / Precondition                                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                    | Notes                          |
| ------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| TC-313  | branch 2 件の repository で `getBranchCleanup(repo, null)` を呼ぶ（spawn mock） | Normal - snapshot 取得 args                                                | `cp.spawn` の args に `for-each-ref`・`--sort=refname`・`refs/heads` が含まれ、format 文字列が `%(refname)` / `%(HEAD)` / `%(upstream)` / `%(upstream:track)` / `%(committerdate:unix)` / `%(objectname)` / `%(tree)` を NUL 区切りで含む呼出が cwd = repo、`LC_ALL=C` で 1 回ある | Git 2.32 互換 atom のみ        |
| TC-314  | 比較先が解決された branch 1 件で comparison を実行                              | Normal - 比較 args は OID のみ                                             | `rev-list` 呼出の args が `["rev-list", "--left-right", "--count", "<compareOid>...<branchOid>"]` と `toEqual` で一致し、args のどこにも branch 名文字列が現れない                                                                                                                 | revspec へ branch 名を渡さない |
| TC-315  | `getBranchCleanup(repo, null)` を 1 回呼ぶ                                      | Normal - 独立取得                                                          | `worktree list --porcelain`、`remote`、`refs/remotes` を列挙する `for-each-ref` の 3 呼出がそれぞれ 1 回ずつあり、worktree 成功時のみ `parseWorktreeList()` が当該 stdout で 1 回呼ばれる                                                                                          | 診断収集は runGitQuery 直呼び  |
| TC-316  | 最初の `for-each-ref`（refs/heads）が exit 非 0 で失敗                          | External - 全体 ref 失敗                                                   | 戻り値が `{ kind: "error", status: <失敗 message> }` と `toEqual` で一致し、`rev-list` / `worktree` への `cp.spawn` call count が 0 である                                                                                                                                         | 全体 error と空成功の区別      |
| TC-317  | branch 3 件中 1 件の `rev-list` だけ exit 非 0                                  | External - 行単位 rev-list failure                                         | 当該行のみ `ancestry: "unknown"` / `aheadBehind: { kind: "unknown" }` になり、他 2 行は known、3 行すべての `treeDifference` は snapshot の tree OID から算出され unknown にならない                                                                                               | 反例: 行単位失敗の局所化       |
| TC-318  | `worktree list --porcelain` が exit 非 0                                        | External - worktree 失敗                                                   | 全行の worktree が `{ kind: "unknown" }` になり（empty collection へ畳まない）、`parseWorktreeList()` の call count が 0、戻り値 kind は `"ok"` のまま他 fact は known を維持する                                                                                                  | 反例: worktree failure         |
| TC-319  | `git remote` が exit 非 0                                                       | External - remote 名一覧失敗                                               | 全行の remotes が `null` になり（`[]` へ畳まない）、戻り値 kind は `"ok"` のまま他 fact は維持される                                                                                                                                                                               | 反例: remote failure           |
| TC-320  | `refs/remotes` を列挙する `for-each-ref` が exit 非 0                           | External - remote refs 失敗                                                | 全行の remotes が `null` になり、戻り値 kind は `"ok"` のまま他 fact は維持される                                                                                                                                                                                                  | 名一覧成功でも照合不能         |
| TC-321  | branch 4 件（比較先あり）で comparison の解決を人為的に遅延させる               | Normal - 最大 3 並列と順序                                                 | `rev-list` の同時 in-flight 数の最大値が 3 であり、応答完了順を逆順にしても結果 rows の並びが `for-each-ref --sort=refname` の snapshot 順と一致する                                                                                                                               | 反例: 4 branches 3 concurrency |
| TC-322  | `for-each-ref` が exit 0 で空出力                                               | Boundary - 0 branch                                                        | 戻り値が `{ kind: "ok", compareBranch: null, rows: [] }` と `toEqual` で一致し、`rev-list` の call count が 0 である                                                                                                                                                               | 空成功と error の区別          |
| TC-323  | current の 1 branch のみの snapshot                                             | Boundary - 1 branch                                                        | 戻り値 kind が `"ok"` で rows が 1 件、compareBranch がその branch 名になる                                                                                                                                                                                                        | current fallback               |
| TC-324  | requested = `vanished` が snapshot に不在（origin/HEAD → local `main` あり）    | Validation - requested 消失の再評価                                        | 同じ snapshot 上で fallback が再評価され compareBranch が `main` になり、`refs/heads` への `for-each-ref` call count が 1 のまま増えない（再取得しない）                                                                                                                           | snapshot 再利用                |
| TC-325  | requested = `a;b`、snapshot に `feat/$(date)` を含む                            | Validation - 特殊名の安全性                                                | すべての `cp.spawn` 呼出で shell オプションが使われず、`rev-list` args に `a;b` / `feat/$(date)` の文字列が現れない（比較 args は OID のみ）                                                                                                                                       | 反例: 特殊名                   |
| TC-326  | detached（current なし）かつ origin/HEAD / `main` / `master` 不在               | Boundary - detached fallback なし                                          | 戻り値が `{ kind: "ok", compareBranch: null, rows: <全行 notSelected> }` になり、`rev-list` の call count が 0 である                                                                                                                                                              | 反例: detached fallback なし   |

### 失敗源インベントリ（include-or-justify）— Feature 055-03 追加分（S48）

| 失敗源                                                   | 対応ケースまたは除外理由                                                                              |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 全体 ref 取得の失敗                                      | TC-316                                                                                                |
| 行単位 comparison の失敗                                 | TC-317                                                                                                |
| worktree / remote 名 / remote refs の取得失敗            | TC-318〜TC-320                                                                                        |
| 失敗を空 collection・unused へ畳む                       | TC-318、TC-319（unknown / null の維持を検証）                                                         |
| branch 名の revspec / shell への混入                     | TC-314、TC-325                                                                                        |
| 並列数超過・完了順による順序崩れ                         | TC-321                                                                                                |
| requested 消失時の snapshot 再取得・不整合               | TC-324                                                                                                |
| 0 / 1 branch・detached の縮退                            | TC-322、TC-323、TC-326                                                                                |
| parse・fallback 決定則・行合成の分岐                     | excluded(`src/branchCleanup-test.md` S1〜S4 owner の責務)                                             |
| 例外・エラー経路（spawn 例外）                           | excluded(`runGitQuery()` の失敗写像は既存 S21 系 owner の責務で本 Feature では変更しない)             |
| 境界値（minimum / maximum / +/-1 / NULL / empty 文字列） | excluded(数値引数を持たない。0 / 1 / 4 branch の意味のある境界は TC-321〜TC-323 で充足)               |
| 不正な型・フォーマット                                   | excluded(型契約は `src/types-test.md` S8、出力形式不正の写像は `src/branchCleanup-test.md` S3 の責務) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-324、TC-325
- Exception: excluded(spawn 失敗は External として TC-316〜TC-320 で検証し、throw 経路は既存 runGitQuery 契約のまま)
- External: TC-316〜TC-320
- Boundary: TC-322、TC-323、TC-326
- Type: excluded(型契約・形式不正は他 owner の責務)
- Normal: TC-313〜TC-315、TC-321

**失敗系/正常系比（煙感知器）**: 正常系4件（TC-313〜TC-315、TC-321）、失敗系10件（TC-316〜TC-320、TC-322〜TC-326）、比2.5。インベントリ由来の導出であり比率合わせの追加・削除は行っていない。
