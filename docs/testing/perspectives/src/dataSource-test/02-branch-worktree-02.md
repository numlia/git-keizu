# テスト観点表: src/dataSource.ts

> Source: `src/dataSource.ts`
> Generated: 2026-08-03T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: branch-worktree

## S41: checkoutBranch() リモート checkout の安全化

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-03
> Status: active
> Supersedes: S9
> Signature: `checkoutBranch(repo: string, branchName: string, remoteBranch: string | null): Promise<CheckoutBranchResult>`
> Target Path: `src/dataSource.ts`（`checkoutBranch()`。実装後に行範囲へ更新）
> Test File: `tests/src/dataSource.test.ts` / `tests/src/dataSource.git.test.ts`

`git checkout -B <branch> <remote-branch>` を廃し、ref 検証 → 既存 branch の read-only 存在確認 → `checkout --track -b` の順に安全化する変更。戻り値は `GitCommandStatus` から `CheckoutBranchResult`（`branchExists | invalidRef | completed`）へ変わる。local 経路（`remoteBranch === null`）の args `["checkout", branchName]` は維持し、検証だけを追加する。`-B` を対象範囲から除去するため、`-B` 前提の旧 S9 を supersede する。ref 名の判定規則そのものは `src/refValidation-test.md` S1 の責務、webview 表示は `web/messageHandler-test.md` S12 の責務。

| Case ID | Input / Precondition                                                                                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                              | Notes                         |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| TC-231  | `branchName = "-delete"`, `remoteBranch = "origin/main"`                                                                                  | Validation - 不正 local ref                                                | `{ kind: "invalidRef" }` を返す。`cp.spawn` の call count が 0                                                                                                                               | Git を起動しない              |
| TC-232  | `branchName = "feature/x"`, `remoteBranch = "origin/feature..x"`                                                                          | Validation - 不正 remote ref                                               | `{ kind: "invalidRef" }` を返す。`cp.spawn` の call count が 0                                                                                                                               | remote 側も検証する           |
| TC-233  | `branchName = ""`, `remoteBranch = null`                                                                                                  | Boundary - empty branch name                                               | `{ kind: "invalidRef" }` を返す。`cp.spawn` の call count が 0                                                                                                                               | local 経路でも検証する        |
| TC-234  | `branchName = "main"`, `remoteBranch = null`、git が exit 0                                                                               | Normal - local checkout                                                    | `cp.spawn` が args `["checkout", "main"]` で 1 回呼ばれ、`{ kind: "completed", status: null }` を返す                                                                                        | 既存 local 動作の維持         |
| TC-235  | `branchName = "feature/x"`, `remoteBranch = "origin/feature/x"`、存在確認 query が `refs/heads/feature/x` を検出                          | Validation - 同名 branch の保護                                            | `{ kind: "branchExists" }` を返す。`cp.spawn` は read-only 存在確認の 1 回だけで、`"checkout"` を含む args では呼ばれない                                                                    | 既存 branch を再配置しない    |
| TC-236  | 同条件で存在確認 query が未検出（空 stdout / exit 非0 の未検出表現）、checkout が exit 0                                                  | Normal - remote checkout                                                   | `cp.spawn` が args `["checkout", "--track", "-b", "feature/x", "origin/feature/x"]` で 1 回呼ばれ、`{ kind: "completed", status: null }` を返す。args に `"-B"` を含まない                   | `-B` 除去の回帰検証           |
| TC-237  | 存在確認 query が spawn error / 非0 exit で stderr `"fatal: not a git repository"` を出す                                                 | Exception - 存在確認の失敗                                                 | `{ kind: "completed", status: "fatal: not a git repository" }` を返す（`branchExists` ではない）。checkout args での `cp.spawn` は呼ばれない                                                 | query 失敗の詳細を保持する    |
| TC-238  | 存在確認は未検出、`checkout --track -b` が exit 非0 で stderr `"fatal: invalid reference"`                                                | Exception - remote checkout 失敗                                           | `{ kind: "completed", status: "fatal: invalid reference" }` を返す                                                                                                                           | Git error を握り潰さない      |
| TC-239  | `remoteBranch = null` で `checkout` が exit 非0、stderr `"error: pathspec"`                                                               | Exception - local checkout 失敗                                            | `{ kind: "completed", status: "error: pathspec" }` を返す                                                                                                                                    | 既存の失敗表現の維持          |
| TC-240  | 実 Git 一時 repository。`feature/x` が commit A を指し、bare remote の `origin/feature/x` が commit B を指す状態で remote checkout を実行 | Validation - 既存 branch ref の保全（実 Git）                              | 戻り値が `{ kind: "branchExists" }`。`rev-parse refs/heads/feature/x` の hash が実行前後で commit A のまま一致し、`branch --show-current` と `status --porcelain` の出力も実行前後で一致する | ref 破壊の直接観測            |
| TC-241  | 実 Git 一時 repository。未使用名 `feature/new` に対し `origin/feature/new` から remote checkout を実行                                    | Normal - tracking 設定（実 Git）                                           | `branch --show-current` が `feature/new`、`config branch.feature/new.remote` が `origin`、`config branch.feature/new.merge` が `refs/heads/feature/new` を返す                               | `--track -b` の効果           |
| TC-242  | 実 Git 一時 repository。既存 `feature/x` に upstream `upstream/feature/x` が設定済みの状態で TC-240 と同じ remote checkout を実行         | Validation - upstream 設定の保全（実 Git）                                 | `config branch.feature/x.remote` が `upstream`、`config branch.feature/x.merge` が `refs/heads/feature/x` のまま実行前後で一致する                                                           | upstream の付け替えが起きない |

## S42: preparePush() / getRemotes() Push 先の解決

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-03
> Status: active
> Supersedes: -
> Signature: `preparePush(repo: string): Promise<PushPreparation>` / `getRemotes(repo: string): Promise<string[] | null>`
> Target Path: `src/dataSource.ts`（`preparePush()` / `getRemotes()`。実装後に行範囲へ更新）
> Test File: `tests/src/dataSource.test.ts`

Push 先を `origin` 固定から現在の upstream 優先へ変える解決ロジックの観点。`branch --show-current` の空 stdout を detached HEAD として扱い、current branch があるときだけ upstream remote / branch を読む。upstream が有効なら `upstream`、未設定 / detached なら昇順 remote 一覧を持つ `selectRemote`、Git クエリ失敗なら `error` を返す。`getRemotes()` は取得失敗（`null`）と remote 0 件（`[]`）を別の値で区別する。Push 実行 args は S43、host 側の phase 判断は `src/gitGraphView-test/01-message-routing-03.md` S28 の責務。

| Case ID | Input / Precondition                                                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                 | Notes                    |
| ------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| TC-243  | current が `"feature/local"`、`branch.feature/local.remote` が `"upstream"`、merge が `"refs/heads/main"` | Normal - 別名 upstream あり                                                | `{ kind: "upstream", target: { remoteName: "upstream", localBranchName: "feature/local", upstreamBranchName: "main" } }` を返す | Push 元と Push 先を保持  |
| TC-244  | current branch あり、upstream 未設定、`git remote` が `"upstream\norigin\n"`                              | Normal - upstream 未設定                                                   | `{ kind: "selectRemote", remotes: ["origin", "upstream"] }` を返す（昇順）                                                      | 利用者選択へ回す         |
| TC-245  | `branch --show-current` の stdout が空文字（detached HEAD）、`git remote` が `"origin\n"`                 | Boundary - empty current branch                                            | `{ kind: "selectRemote", remotes: ["origin"] }` を返す。upstream 読み取りの `cp.spawn`（`config --get branch....`）は呼ばれない | detached を空文字で判定  |
| TC-246  | upstream 未設定、`git remote` の stdout が空文字                                                          | Boundary - remote 0 件                                                     | `{ kind: "selectRemote", remotes: [] }` を返す（`kind: "error"` ではない）                                                      | 空一覧と失敗を区別       |
| TC-247  | upstream 未設定、`git remote` が exit 非0 で stderr `"fatal: remote fail"`                                | External - remote 取得失敗                                                 | `{ kind: "error", status: "fatal: remote fail" }` を返す（空配列の `selectRemote` ではない）                                    | TC-246 と別値            |
| TC-248  | `branch --show-current` が exit 非0 で stderr `"fatal: not a git repository"`                             | Exception - current branch 取得失敗                                        | `{ kind: "error", status: "fatal: not a git repository" }` を返す（detached と同一視しない）                                    | TC-245 と別値            |
| TC-249  | current branch あり、`branch.main.remote` が `"-evil"`（unsafe）                                          | Validation - unsafe upstream                                               | `kind` が `"upstream"` にならず `selectRemote` を返す。`"-evil"` は戻り値に含まれない                                           | 不正値を Push へ渡さない |
| TC-250  | `getRemotes()`、`git remote` の stdout が `"upstream\norigin\n"`                                          | Normal - 一覧取得                                                          | `["origin", "upstream"]` を返す（昇順）                                                                                         | 並び順の固定             |
| TC-251  | `getRemotes()`、stdout が空文字                                                                           | Boundary - empty                                                           | `[]` を返す（`null` ではない）                                                                                                  | 空配列と `null` の区別   |
| TC-252  | `getRemotes()`、exit 非0                                                                                  | External - 取得失敗                                                        | `null` を返す（`[]` ではない）                                                                                                  | 失敗の識別               |
| TC-253  | `getRemotes()`、stdout が `"origin\n-evil\n"`                                                             | Validation - unsafe remote 名                                              | 戻り値が `["origin"]` で `"-evil"` を含まない                                                                                   | 成功値として返さない     |

## S43: pushToUpstream() / pushWithUpstream() 明示 Push の実行

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-03
> Updated: 2026-08-04
> Status: active
> Supersedes: S10
> Signature: `pushToUpstream(repo: string, target: PushTarget): Promise<GitCommandStatus>` / `pushWithUpstream(repo: string, remoteName: string): Promise<GitCommandStatus>`
> Target Path: `src/dataSource.ts`（`pushToUpstream()` / `pushWithUpstream()`。実装後に行範囲へ更新）
> Test File: `tests/src/dataSource.test.ts` / `tests/src/dataSource.git.test.ts`

`push(repo)` の `["push", "--set-upstream", "origin", "HEAD"]` 固定を廃し、upstream ありは `["push", <remote>, "<localBranch>:<upstreamBranch>"]`、選択確定後の新規 upstream 登録だけ `["push", "--set-upstream", <remote>, "HEAD"]` を使う変更。Push 元のローカル branch と Push 先の upstream branch を refspec で分離し、リネーム後も現在のローカル branch を既存 upstream へ送る。`push()` と origin 固定 args を除去するため、`["push"]`（引数なし）を現行仕様として固定していた旧 S10 を supersede する。旧 S10 が同一セクションで扱っていた `pull()` は本変更の対象外で挙動を変えないため、S44 として active のまま引き継ぐ。`fetch()` / `pushTag()` は変更しない。

| Case ID | Input / Precondition                                                                                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                  | Notes                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| TC-254  | `pushToUpstream(repo, { remoteName: "upstream", localBranchName: "feature/local", upstreamBranchName: "main" })`、git が exit 0 | Normal - 別名 upstream への明示 Push                                       | `cp.spawn` が args `["push", "upstream", "feature/local:main"]` で 1 回呼ばれ、`null` を返す。args に `"--set-upstream"` と `"HEAD"` を含まない                                  | Push 元・Push 先を分離    |
| TC-255  | 同呼び出しで git が exit 非0、stderr `"fatal: rejected"`                                                                        | Exception - Push 失敗                                                      | `"fatal: rejected"` を返す                                                                                                                                                       | stderr を握り潰さない     |
| TC-256  | `pushWithUpstream(repo, "origin")`、git が exit 0                                                                               | Normal - upstream 登録つき Push                                            | `cp.spawn` が args `["push", "--set-upstream", "origin", "HEAD"]` で 1 回呼ばれ、`null` を返す                                                                                   | 選択確定後だけ使う        |
| TC-257  | 同呼び出しで git が exit 非0、stderr `"fatal: no such remote"`                                                                  | Exception - Push 失敗                                                      | `"fatal: no such remote"` を返す                                                                                                                                                 | -                         |
| TC-258  | `pushToUpstream(repo, { remoteName: "-evil", localBranchName: "main", upstreamBranchName: "main" })`                            | Validation - unsafe remote 名                                              | `cp.spawn` の call count が 0。非 null のエラー文字列を返す                                                                                                                      | 実行前 guard              |
| TC-259  | local が `"feature..local"` の場合と upstream が `"feature..upstream"` の場合                                                   | Validation - 不正 local / upstream branch 名                               | どちらも `cp.spawn` の call count が 0。非 null の ref エラー文字列を返す                                                                                                        | refspec 両側の guard      |
| TC-260  | `pushWithUpstream(repo, "")`                                                                                                    | Boundary - empty remote 名                                                 | `cp.spawn` の call count が 0。非 null のエラー文字列を返す                                                                                                                      | 空 remote 名              |
| TC-261  | 実 Git 一時 repository。local `feature/local` が `upstream/main` を追跡し、`origin` も登録済みの状態で解決から Push まで実行    | Normal - 別名かつ non-origin upstream への Push（実 Git）                  | target が local `feature/local` / upstream `main` を保持し、`upstream` の `refs/heads/main` が local HEAD と一致する。`upstream/feature/local` は作られず、`origin` は変化しない | 誤 source / remote を検出 |
| TC-262  | 実 Git 一時 repository。upstream 未設定 branch に対し `pushWithUpstream(repo, "upstream")` を実行                               | Normal - upstream 登録（実 Git）                                           | 実行後の `config branch.<branch>.remote` が `upstream`、`config branch.<branch>.merge` が `refs/heads/<branch>` を返す                                                           | `--set-upstream` の効果   |

## S44: pull() 既存挙動の維持

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-03
> Status: active
> Supersedes: -
> Signature: `pull(repo: string): Promise<GitCommandStatus>`
> Target Path: `src/dataSource.ts`（`pull()`）
> Test File: `tests/src/dataSource.test.ts`

旧 S10 が `pull()` と `push()` を 1 セクションで扱っていたため、Push 側の supersede に伴って pull の観測点も historical になる。`pull()` は本変更の対象外で実装を変えないため、既存挙動の維持確認として active のまま引き継ぐ。

| Case ID | Input / Precondition                                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                               | Notes                                |
| ------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------ |
| TC-263  | `pull(repo)`、git が exit 0                                                    | Normal - pull args                                                         | `cp.spawn` が args `["pull"]` で 1 回呼ばれる | 旧 S10/TC-071 の引き継ぎ（挙動不変） |
| TC-264  | `pull(repo)`、git が exit 0                                                    | Normal - 成功                                                              | `null` を返す                                 | 旧 S10/TC-072 の引き継ぎ             |
| TC-265  | `pull(repo)`、git が exit 非0 で stderr `"CONFLICT (content): Merge conflict"` | Exception - pull 失敗                                                      | `"CONFLICT (content): Merge conflict"` を返す | 旧 S10/TC-073 の引き継ぎ             |

### 失敗源インベントリ（include-or-justify）— Feature 047 追加分（S41〜S44）

| 失敗源                                                                | 対応ケースまたは除外理由                                                                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 入力検証 × 不正 local ref                                             | TC-231、TC-233                                                                                                                             |
| 入力検証 × 不正 remote ref                                            | TC-232                                                                                                                                     |
| 入力検証 × unsafe remote 名（Push）                                   | TC-258、TC-260、TC-253（一覧側）                                                                                                           |
| 入力検証 × 不正 branch 名（Push）                                     | TC-259                                                                                                                                     |
| guard 拒否（同名 branch の再配置防止）                                | TC-235、TC-240                                                                                                                             |
| 外部依存の失敗 × 存在確認 query の失敗                                | TC-237                                                                                                                                     |
| 外部依存の失敗 × remote 一覧取得の失敗                                | TC-247、TC-252                                                                                                                             |
| 外部依存の失敗 × current branch 取得の失敗                            | TC-248                                                                                                                                     |
| 外部依存の失敗 × checkout / Push コマンドの非0 exit                   | TC-238、TC-239、TC-255、TC-257                                                                                                             |
| 外部依存の失敗 × pull コマンドの非0 exit                              | TC-265                                                                                                                                     |
| pull 実装の巻き込み変更                                               | TC-263、TC-264（args と成功値が不変であることの確認）                                                                                      |
| 各分岐の negative 側（local 経路 / 未使用名 / upstream あり）         | TC-234、TC-236、TC-241、TC-243、TC-250                                                                                                     |
| 境界値（empty: branch 名 / current branch / remote 一覧 / remote 名） | TC-233、TC-245、TC-246、TC-251、TC-260                                                                                                     |
| 境界値（0 / minimum / maximum / +/-1 / NULL）                         | excluded(引数は文字列と `string \| null` のみで数値境界を持たない。`remoteBranch === null` は local 経路として TC-234 / TC-239 で検証済み) |
| 不正な型・フォーマット                                                | excluded(引数の型は TypeScript が保証し、実行時の型分岐を持たない。ref 形式の不正は Validation 系ケースで検証)                             |
| repository state の破壊（ref hash / worktree / upstream）             | TC-240、TC-242、TC-261                                                                                                                     |
| upstream 設定の取り違え（unsafe / 未設定）                            | TC-249、TC-244                                                                                                                             |
| ref 判定規則そのものの誤り                                            | excluded(`src/refValidation-test.md` S1 TC-001〜TC-019 の責務)                                                                             |
| phase 判断・Response 送出の誤り                                       | excluded(`src/gitGraphView-test/01-message-routing-03.md` S28 の責務)                                                                      |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-231、TC-232、TC-235、TC-240、TC-242、TC-249、TC-253、TC-258、TC-259
- Exception: TC-237、TC-238、TC-239、TC-248、TC-255、TC-257、TC-265
- External: TC-247、TC-252
- Boundary: TC-233、TC-245、TC-246、TC-251、TC-260
- Type: excluded(実行時の型分岐を持たず、引数型は TypeScript が保証する。型契約は `src/types-test.md` S3 の責務)

**失敗系/正常系比（煙感知器）**: 正常系12件（TC-234、TC-236、TC-241、TC-243、TC-244、TC-250、TC-254、TC-256、TC-261、TC-262、TC-263、TC-264）、失敗系23件（残り）。比は約 1.9:1 で、失敗源インベントリの各行に対応ケースまたは除外理由が付いている。

## S45: readUpstreamTarget() upstream merge 設定の形式検証

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-04
> Status: active
> Supersedes: -
> Signature: `preparePush(repo: string): Promise<PushPreparation>`（private `readUpstreamTarget()` 経由）
> Target Path: `src/dataSource.ts`（`readUpstreamTarget()` の `REFS_HEADS_PREFIX` 判定）
> Test File: `tests/src/dataSource.test.ts`

Task 6 の coverage 分析で、`branch.<name>.merge` が `refs/heads/` 以外で始まるときに upstream 扱いを取りやめる分岐（`src/dataSource.ts:1017-1018`）へ既存 case のどれからも到達していないことが判明したため additive に追加する。S42 の TC-249 が通るのは同関数でも後段の `isSafeRemoteName()` / `isValidRefName()` guard（同 1021 行）で、merge ref の prefix 判定は経由しない。upstream として解釈できない設定を Push 先へ昇格させず、利用者選択（`selectRemote`）へ落とすことを固定する。remote/ref 名の形式判定そのものは `src/refValidation-test.md` S1、phase 判断は `src/gitGraphView-test/01-message-routing-03.md` S28 の責務。

| Case ID | Input / Precondition                                                                                                                                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                     | Notes                                 |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| TC-266  | `branch --show-current` が `"main"`、`branch.main.remote` が `"origin"`（safe）、`branch.main.merge` が `"refs/remotes/origin/main"`（`refs/heads/` 始まりでない）、`git remote` が `"origin\n"` | Validation - upstream merge ref の形式不正                                 | `{ kind: "selectRemote", remotes: ["origin"] }` を返す（`kind: "upstream"` にならない）。`config --get branch.main.merge` の query が 1 回、`git remote` の query が 1 回実行される | remote 名が safe でも昇格させない分岐 |

### 失敗源インベントリ（include-or-justify）— Feature 047 追補分（S45）

| 失敗源                                                | 対応ケースまたは除外理由                                                                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 入力検証 × merge ref の形式不正                       | TC-266                                                                                                                       |
| 入力検証 × unsafe remote 名 / 不正 upstream branch 名 | excluded(後段 guard の分岐で S42 TC-249 が担保)                                                                              |
| 各分岐の negative 側（正しい `refs/heads/` 始まり）   | excluded(S42 TC-243 が upstream 昇格を担保)                                                                                  |
| 外部依存の失敗（config / remote query の失敗）        | excluded(S42 TC-247、TC-248 が担保)                                                                                          |
| 境界値（merge 設定が空文字）                          | excluded(空文字も `refs/heads/` 始まりでないため TC-266 と同一分岐へ入る。upstream 未設定時の空 stdout は S42 TC-244 が担保) |
| 境界値（0 / minimum / maximum / +/-1 / NULL）         | excluded(Git 設定値は文字列のみで数値境界を持たない)                                                                         |
| 例外送出                                              | excluded(戻り値で表現し throw 経路を持たない)                                                                                |
| 不正な型・フォーマット                                | excluded(引数型は TypeScript が保証する。型契約は `src/types-test.md` S3 の責務)                                             |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-266
- Exception: excluded(throw 経路が存在しない)
- External: excluded(query 失敗は S42 TC-247、TC-248 の責務)
- Boundary: excluded(数値境界がなく、空文字 merge 設定は TC-266 と同一分岐)
- Type: excluded(型契約は `src/types-test.md` S3 の責務)

**失敗系/正常系比（煙感知器）**: 正常系0件、失敗系1件（TC-266）。本セクションは既存 S42 が取りこぼした拒否分岐 1 本だけを対象とする追補のため、正常系0件はインベントリ欠落ではないことを確認した（正常系の upstream 昇格は S42 TC-243 が担保）。
