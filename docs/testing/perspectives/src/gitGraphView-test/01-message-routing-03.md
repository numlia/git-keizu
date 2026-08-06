# テスト観点表: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Generated: 2026-08-03T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: message-routing

## S28: 二段階 Push の phase orchestration

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-03
> Status: superseded
> Supersedes: S5
> Superseded By: S31
> Signature: `case "push"` の routing（`RequestPush { repo, operationId, selectedRemote }` → `ResponsePush { operationId, phase }`）
> Target Path: `src/gitGraphView.ts`（`handleMessage` switch の `case "push"`。実装後に行範囲へ更新）
> Test File: `tests/src/gitGraphView.test.ts`

`dataSource.push(repo)` の単段呼び出しを、`preparePush()` の結果に応じた 3 phase（`selectRemote` / `noRemotes` / `completed`）の仲介へ置き換える観点。初回 Request（`selectedRemote === null`）は解決だけを行い、2 通目は `getRemotes()` を再実行して membership・安全性を再検証してから `pushWithUpstream()` を呼ぶ。全 Response は元 Request の `operationId` をそのまま載せる。旧 S5 は `dataSource.push(repo)` の単段呼び出しを期待結果として固定していたため supersede し、変更対象外の pull routing は S30 として維持する。Git args と解決規則は `src/dataSource-test/02-branch-worktree-02.md` S42 / S43、webview 側の表示と選択 UI は `web/messageHandler-test.md` S12 / `web/refMenu-test/01-branch-actions-01.md` S17 の責務。

| Case ID | Input / Precondition                                                                                                                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                       | Notes                               |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| TC-110  | `{ operationId: "op-1", selectedRemote: null }`、`preparePush()` が `{ kind: "upstream", target: { remoteName: "upstream", branchName: "main" } }`          | Normal - upstream 即 Push                                                  | `pushToUpstream(repo, { remoteName: "upstream", branchName: "main" })` が 1 回呼ばれ、`sendMessage` が `{ command: "push", operationId: "op-1", phase: "completed", status: null }` で 1 回呼ばれる。`phase: "selectRemote"` の Response は送られない | 選択を挟まない                      |
| TC-111  | 初回 Request、`preparePush()` が `{ kind: "selectRemote", remotes: ["origin", "upstream"] }`                                                                | Normal - 選択要求                                                          | `sendMessage` が `{ command: "push", operationId: "op-1", phase: "selectRemote", remotes: ["origin", "upstream"], defaultRemote: "origin" }` で 1 回呼ばれる。`pushToUpstream` / `pushWithUpstream` の call count が 0                                | 確認前に Push しない                |
| TC-112  | 初回 Request、`preparePush()` が `{ kind: "selectRemote", remotes: ["alpha", "zeta"] }`（`origin` を含まない）                                              | Boundary - default 解決（origin 不在）                                     | Response の `defaultRemote` が `"alpha"`（昇順先頭）、`remotes` が `["alpha", "zeta"]` である                                                                                                                                                         | default 解決規則                    |
| TC-113  | 初回 Request、`preparePush()` が `{ kind: "selectRemote", remotes: [] }`                                                                                    | Boundary - remote 0 件                                                     | `sendMessage` が `{ command: "push", operationId: "op-1", phase: "noRemotes" }` で 1 回呼ばれる。Push 系メソッドの call count が 0                                                                                                                    | 空一覧の専用 phase                  |
| TC-114  | 初回 Request、`preparePush()` が `{ kind: "error", status: "fatal: remote fail" }`                                                                          | Exception - 解決失敗                                                       | `sendMessage` が `{ command: "push", operationId: "op-1", phase: "completed", status: "fatal: remote fail" }` で呼ばれる（`selectRemote` / `noRemotes` ではない）                                                                                     | error を completed の status へ写像 |
| TC-115  | `{ operationId: "op-1", selectedRemote: "origin" }`、`getRemotes()` が `["origin", "upstream"]`                                                             | Normal - 選択確定後の Push                                                 | `pushWithUpstream(repo, "origin")` が 1 回呼ばれ、`sendMessage` が `{ command: "push", operationId: "op-1", phase: "completed", status: null }` で呼ばれる                                                                                            | 2 通目の正常経路                    |
| TC-116  | `{ selectedRemote: "evil" }`、`getRemotes()` が `["origin"]`（一覧に含まれない）                                                                            | Validation - membership 再検証                                             | `pushWithUpstream` の call count が 0。`sendMessage` の Response が `phase: "completed"` かつ `status !== null` である                                                                                                                                | 未登録 remote を Git へ渡さない     |
| TC-117  | `{ selectedRemote: "origin" }`、`getRemotes()` が `null`（取得失敗）                                                                                        | External - remote 取得失敗                                                 | `pushWithUpstream` の call count が 0。Response が `phase: "completed"` かつ `status !== null` である                                                                                                                                                 | 失敗時は Push しない                |
| TC-118  | `{ selectedRemote: "origin" }`、`getRemotes()` が `[]`                                                                                                      | Boundary - 再取得時の空一覧                                                | `pushWithUpstream` の call count が 0。Response が `phase: "completed"` かつ `status !== null` である                                                                                                                                                 | 空一覧でも Push しない              |
| TC-119  | `{ selectedRemote: "-evil" }`（unsafe 名）、`getRemotes()` が `["origin"]`                                                                                  | Validation - unsafe remote 名                                              | `pushWithUpstream` の call count が 0。Response が `phase: "completed"` かつ `status !== null` である                                                                                                                                                 | 形式検証も再実行する                |
| TC-120  | `{ operationId: "op-1", selectedRemote: null }`（`selectRemote` へ分岐）の直後に `{ operationId: "op-2", selectedRemote: null }`（`upstream` へ分岐）を処理 | Normal - operationId の相関                                                | 1 通目の Response の `operationId` が `"op-1"`、2 通目が `"op-2"` であり、共有 state による上書きが起きない                                                                                                                                           | 連続操作の取り違え防止              |
| TC-121  | `{ selectedRemote: "origin" }`、`getRemotes()` が `["origin"]`、`pushWithUpstream()` が `"fatal: rejected"` を返す                                          | Exception - Push 失敗の伝達                                                | Response が `{ phase: "completed", operationId: "op-1", status: "fatal: rejected" }` である                                                                                                                                                           | Git error を握り潰さない            |

## S29: checkout 結果の Response 写像と createBranch オーケストレーション

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-03
> Status: superseded
> Supersedes: S11
> Superseded By: S32
> Signature: `case "checkoutBranch"` / `case "createBranch"` の routing（`CheckoutBranchResult` → `ResponseCheckoutBranch`）
> Target Path: `src/gitGraphView.ts`（`handleMessage` switch の `case "checkoutBranch"` と `case "createBranch"`。実装後に行範囲へ更新）
> Test File: `tests/src/gitGraphView.test.ts`

`checkoutBranch()` の戻り値が `GitCommandStatus` から `CheckoutBranchResult` へ変わることに伴う host 側写像の観点。`branchExists` / `invalidRef` / `completed` を同じ `kind` の `ResponseCheckoutBranch` として送出し、`createBranch` 後の local checkout では `completed.status` を既存の部分成功メッセージへ変換する既存表示を維持する。旧 S11 は `checkoutBranch()` が `GitCommandStatus` を返す前提で成功 / 失敗を表現していたため supersede し、本変更で挙動が変わらない分岐（`checkout: false` / createBranch 失敗 / `checkout` 未指定）も TC-129〜TC-131 として active のまま引き継ぐ。Git 実行の判断は `src/dataSource-test/02-branch-worktree-02.md` S41、表示文言は `web/messageHandler-test.md` S12 の責務。

| Case ID | Input / Precondition                                                                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                      | Notes                    |
| ------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| TC-122  | `checkoutBranch()` が `{ kind: "branchExists" }` を返す                                                                   | Validation - branchExists の伝達                                           | `sendMessage` が `{ command: "checkoutBranch", kind: "branchExists" }` で 1 回呼ばれる（`status` field を持たない）                                  | 型どおりの送出           |
| TC-123  | `checkoutBranch()` が `{ kind: "invalidRef" }` を返す                                                                     | Validation - invalidRef の伝達                                             | `sendMessage` が `{ command: "checkoutBranch", kind: "invalidRef" }` で 1 回呼ばれる                                                                 | 型どおりの送出           |
| TC-124  | `checkoutBranch()` が `{ kind: "completed", status: null }` を返す                                                        | Normal - 成功の伝達                                                        | `sendMessage` が `{ command: "checkoutBranch", kind: "completed", status: null }` で 1 回呼ばれる                                                    | 成功経路                 |
| TC-125  | `checkoutBranch()` が `{ kind: "completed", status: "fatal: pathspec" }` を返す                                           | Exception - Git 失敗の伝達                                                 | `sendMessage` の Response が `{ kind: "completed", status: "fatal: pathspec" }` である                                                               | error を握り潰さない     |
| TC-126  | `createBranch` 成功 + `checkout: true` で `checkoutBranch()` が `{ kind: "completed", status: "fatal: pathspec" }` を返す | Exception - 部分成功表示の維持                                             | `ResponseCreateBranch.status` が `Branch 'feature/x' was created, but checkout failed: fatal: pathspec` である                                       | 既存メッセージの維持     |
| TC-127  | `createBranch` 成功 + `checkout: true` で `checkoutBranch()` が `{ kind: "completed", status: null }` を返す              | Normal - 作成 + checkout 成功                                              | `checkoutBranch(repo, branchName, null)` が 1 回呼ばれ、`ResponseCreateBranch.status` が `null` である                                               | 既存動作の維持           |
| TC-128  | `createBranch` 成功 + `checkout: true` で `checkoutBranch()` が `{ kind: "invalidRef" }` を返す                           | Validation - 非 completed kind の写像                                      | `ResponseCreateBranch.status` が `Branch 'feature/x' was created, but checkout failed:` で始まる文字列であり、`undefined` や生の `kind` 値にならない | 分岐の取りこぼし防止     |
| TC-129  | `createBranch` 成功 + `checkout: false`                                                                                   | Normal - checkout 抑止                                                     | `checkoutBranch` の call count が 0。`ResponseCreateBranch.status` が `null` である                                                                  | 旧 S11/TC-034 の引き継ぎ |
| TC-130  | `createBranch` が `"fatal: branch exists"` を返す + `checkout: true`                                                      | Exception - 作成失敗                                                       | `checkoutBranch` の call count が 0。`ResponseCreateBranch.status` が `"fatal: branch exists"` である                                                | 旧 S11/TC-035 の引き継ぎ |
| TC-131  | `checkout` が `undefined`（レガシー message）                                                                             | Boundary - legacy compat                                                   | `checkoutBranch` の call count が 0。`ResponseCreateBranch.status` が `null` である                                                                  | 旧 S11/TC-036 の引き継ぎ |

## S30: pull メッセージルーティングの維持

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-03
> Status: active
> Supersedes: -
> Signature: `case "pull"` の routing（`RequestPull` → `ResponsePull`）
> Target Path: `src/gitGraphView.ts`（`handleMessage` switch の `case "pull"`）
> Test File: `tests/src/gitGraphView.test.ts`

旧 S5 が pull と push を 1 セクションで扱っていたため、push 側の supersede に伴って pull 側の観測点も historical になる。pull は本変更の対象外で挙動を変えないため、既存挙動の維持確認として active のまま引き継ぐ。

| Case ID | Input / Precondition                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                          | Notes                               |
| ------- | ------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| TC-132  | `{ command: "pull", repo: "/repo" }` を受信 | Normal - pull routing                                                      | `dataSource.pull("/repo")` が 1 回呼ばれ、`sendMessage` が `{ command: "pull", status }` で 1 回呼ばれる | 旧 S5/TC-013 の引き継ぎ（挙動不変） |

### 失敗源インベントリ（include-or-justify）— Feature 047 追加分（S28〜S30）

| 失敗源                                                                               | 対応ケースまたは除外理由                                                                                                                 |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 入力検証 × 選択 remote の未登録（membership 不一致）                                 | TC-116                                                                                                                                   |
| 入力検証 × 選択 remote の unsafe 名                                                  | TC-119                                                                                                                                   |
| guard 拒否の伝達（branchExists / invalidRef）                                        | TC-122、TC-123、TC-128                                                                                                                   |
| 外部依存の失敗 × `preparePush()` の error                                            | TC-114                                                                                                                                   |
| 外部依存の失敗 × `getRemotes()` の取得失敗                                           | TC-117                                                                                                                                   |
| 外部依存の失敗 × Push / checkout / createBranch の失敗                               | TC-121、TC-125、TC-126、TC-130                                                                                                           |
| 各分岐の negative 側（upstream あり / 選択後 Push / 成功 checkout / checkout 抑止）  | TC-110、TC-115、TC-124、TC-127、TC-129                                                                                                   |
| 境界値（remote 0 件、default 解決対象に origin が無い、legacy な `checkout` 未指定） | TC-112、TC-113、TC-118、TC-131                                                                                                           |
| 境界値（0 / minimum / maximum / +/-1 / NULL）                                        | excluded(payload は文字列と配列のみで数値境界を持たない。`selectedRemote: null` は初回 Request の識別子として TC-110〜TC-114 で検証済み) |
| out-of-order / 連続 operation の取り違え                                             | TC-120                                                                                                                                   |
| 不正な型・フォーマット                                                               | excluded(`RequestPush` / `ResponsePush` の必須 field と narrowing は `src/types-test.md` S3 TC-015〜TC-025 の責務)                       |
| 利用者確認前の自動 Push（origin の暗黙選択）                                         | TC-111（選択要求時に Push 系 call count 0 を検証）                                                                                       |
| 既存 routing・watcher mute/unmute への波及                                           | excluded(本変更は `case "push"` と checkout 写像に限定し、watcher の try/finally は `02-state-lifecycle-01.md` の既存 owner 観点で担保)  |
| pull routing の巻き込み変更                                                          | TC-132（挙動不変の確認）                                                                                                                 |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-116、TC-119、TC-122、TC-123、TC-128
- Exception: TC-114、TC-121、TC-125、TC-126、TC-130
- External: TC-117
- Boundary: TC-112、TC-113、TC-118、TC-131
- Type: excluded(型契約は `src/types-test.md` S3 の責務。host 側は値の routing のみを検証する)

**失敗系/正常系比（煙感知器）**: 正常系8件（TC-110、TC-111、TC-115、TC-120、TC-124、TC-127、TC-129、TC-132）、失敗系15件（残り）。比は約 1.9:1 である。

## S31: 二段階 Push の phase orchestration（Response への repo 同梱）

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-04
> Updated: 2026-08-04
> Status: active
> Supersedes: S28
> Signature: `case "push"` の routing（`RequestPush { repo, operationId, selectedRemote }` → `ResponsePush { repo, operationId, phase }`）
> Target Path: `src/gitGraphView.ts`（`handleMessage` switch の `case "push"` と `resolvePush()` 以下の private method）
> Test File: `tests/src/gitGraphView.test.ts`

`ResponsePush` の全 variant へ `repo` が必須追加されたことに伴い、host が Request の `repo` を `operationId` と同じ引数渡しで全 Response へ載せる変更。S28 は `repo` を含まない Response payload を期待結果としていたため supersede する。phase 判断・membership 再検証・Push 呼び出しの規則は S28 から変わらないが、section をライフサイクルの単位とする規約に従い本セクションへ引き継ぐ。upstream target は Push 元の `localBranchName` と Push 先の `upstreamBranchName` を保持したまま `pushToUpstream()` へ渡す。あわせて、異なる repository の連続 operation で各 Response が自分の `repo` を保持することを TC-145 で固定する。Git args と解決規則は `src/dataSource-test/02-branch-worktree-02.md` S42 / S43、webview 側の表示と選択 UI は `web/messageHandler-test.md` S14 / `web/refMenu-test/01-branch-actions-01.md` S17 / S19 の責務。

| Case ID | Input / Precondition                                                                                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                   | Notes                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| TC-133  | `{ repo: "/test/repo", operationId: "op-1", selectedRemote: null }`、`preparePush()` が local `feature/local` / upstream `main` の target を返す | Normal - upstream 即 Push                                                  | `pushToUpstream(repo, { remoteName: "upstream", localBranchName: "feature/local", upstreamBranchName: "main" })` が 1 回呼ばれ、completed Response が送られる                                                     | Push 元・Push 先を保持              |
| TC-134  | 初回 Request、`preparePush()` が `{ kind: "selectRemote", remotes: ["origin", "upstream"] }`                                                     | Normal - 選択要求                                                          | `sendMessage` が `{ command: "push", repo: "/test/repo", operationId: "op-1", phase: "selectRemote", remotes: ["origin", "upstream"], defaultRemote: "origin" }` で 1 回呼ばれ、Push 系メソッドの call count が 0 | S28/TC-111 の引き継ぎ ＋ repo 同梱  |
| TC-135  | 初回 Request、`preparePush()` が `{ kind: "selectRemote", remotes: ["alpha", "zeta"] }`（`origin` を含まない）                                   | Boundary - default 解決（origin 不在）                                     | Response の `defaultRemote` が `"alpha"`（昇順先頭）、`remotes` が `["alpha", "zeta"]` である                                                                                                                     | S28/TC-112 の引き継ぎ               |
| TC-136  | 初回 Request、`preparePush()` が `{ kind: "selectRemote", remotes: [] }`                                                                         | Boundary - remote 0 件                                                     | `sendMessage` が `{ command: "push", repo: "/test/repo", operationId: "op-1", phase: "noRemotes" }` で 1 回呼ばれ、Push 系メソッドの call count が 0                                                              | S28/TC-113 の引き継ぎ ＋ repo 同梱  |
| TC-137  | 初回 Request、`preparePush()` が `{ kind: "error", status: "fatal: remote fail" }`                                                               | Exception - 解決失敗                                                       | `sendMessage` が `{ command: "push", repo: "/test/repo", operationId: "op-1", phase: "completed", status: "fatal: remote fail" }` で呼ばれる（`selectRemote` / `noRemotes` ではない）                             | S28/TC-114 の引き継ぎ ＋ repo 同梱  |
| TC-138  | `{ operationId: "op-1", selectedRemote: "origin" }`、`getRemotes()` が `["origin", "upstream"]`                                                  | Normal - 選択確定後の Push                                                 | `pushWithUpstream(repo, "origin")` が 1 回呼ばれ、`sendMessage` が `{ command: "push", repo: "/test/repo", operationId: "op-1", phase: "completed", status: null }` で呼ばれる                                    | S28/TC-115 の引き継ぎ ＋ repo 同梱  |
| TC-139  | `{ selectedRemote: "evil" }`、`getRemotes()` が `["origin"]`（一覧に含まれない）                                                                 | Validation - membership 再検証                                             | `pushWithUpstream` の call count が 0。Response が `phase: "completed"` かつ `status !== null` である                                                                                                             | S28/TC-116 の引き継ぎ               |
| TC-140  | `{ selectedRemote: "origin" }`、`getRemotes()` が `null`（取得失敗）                                                                             | External - remote 取得失敗                                                 | `pushWithUpstream` の call count が 0。Response が `phase: "completed"` かつ `status !== null` である                                                                                                             | S28/TC-117 の引き継ぎ               |
| TC-141  | `{ selectedRemote: "origin" }`、`getRemotes()` が `[]`                                                                                           | Boundary - 再取得時の空一覧                                                | `pushWithUpstream` の call count が 0。Response が `phase: "completed"` かつ `status !== null` である                                                                                                             | S28/TC-118 の引き継ぎ               |
| TC-142  | `{ selectedRemote: "-evil" }`（unsafe 名）、`getRemotes()` が `["origin"]`                                                                       | Validation - unsafe remote 名                                              | `pushWithUpstream` の call count が 0。Response が `phase: "completed"` かつ `status !== null` である                                                                                                             | S28/TC-119 の引き継ぎ               |
| TC-143  | 同一 repository で `operationId: "op-1"`（`selectRemote` へ分岐）の直後に `operationId: "op-2"`（`upstream` へ分岐）を処理                       | Normal - operationId の相関                                                | 1 通目の Response の `operationId` が `"op-1"`、2 通目が `"op-2"` であり、共有 state による上書きが起きない                                                                                                       | S28/TC-120 の引き継ぎ               |
| TC-144  | `{ selectedRemote: "origin" }`、`getRemotes()` が `["origin"]`、`pushWithUpstream()` が `"fatal: rejected"` を返す                               | Exception - Push 失敗の伝達                                                | Response が `{ phase: "completed", repo: "/test/repo", operationId: "op-1", status: "fatal: rejected" }` である                                                                                                   | S28/TC-121 の引き継ぎ ＋ repo 同梱  |
| TC-145  | repo `/test/repo`（`selectRemote` へ分岐）と repo `/test/other-repo`（`upstream` へ分岐）の Request を連続して処理                               | Normal - repository の相関                                                 | 1 通目の Response の `repo` が `"/test/repo"`、2 通目が `"/test/other-repo"` であり、共有 state による上書きが起きない                                                                                            | repo も引数渡しであることの直接検証 |

### 失敗源インベントリ（include-or-justify）— Feature 047 P3 修正分（S31）

| 失敗源                                                                    | 対応ケースまたは除外理由                                                                                                                 |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Response の `repo` 欠落・取り違え（共有 state 化）                        | TC-133、TC-134、TC-136、TC-137、TC-138、TC-144、TC-145                                                                                   |
| 入力検証 × 選択 remote の未登録（membership 不一致）                      | TC-139                                                                                                                                   |
| 入力検証 × 選択 remote の unsafe 名                                       | TC-142                                                                                                                                   |
| 外部依存の失敗 × `preparePush()` の error                                 | TC-137                                                                                                                                   |
| 外部依存の失敗 × `getRemotes()` の取得失敗                                | TC-140                                                                                                                                   |
| 外部依存の失敗 × Push の失敗                                              | TC-144                                                                                                                                   |
| 各分岐の negative 側（upstream あり / 選択後 Push）                       | TC-133、TC-138                                                                                                                           |
| 境界値（remote 0 件、default 解決対象に origin が無い、再取得時の空一覧） | TC-135、TC-136、TC-141                                                                                                                   |
| 境界値（0 / minimum / maximum / +/-1 / NULL）                             | excluded(payload は文字列と配列のみで数値境界を持たない。`selectedRemote: null` は初回 Request の識別子として TC-133〜TC-137 で検証済み) |
| out-of-order / 連続 operation の取り違え（operationId / repository）      | TC-143、TC-145                                                                                                                           |
| 利用者確認前の自動 Push（origin の暗黙選択）                              | TC-134（選択要求時に Push 系 call count 0 を検証）                                                                                       |
| 不正な型・フォーマット                                                    | excluded(`RequestPush` / `ResponsePush` の必須 field と narrowing は `src/types-test.md` S4 TC-031〜TC-042 の責務)                       |
| checkout 写像・pull routing・watcher mute/unmute への波及                 | excluded(本変更は `case "push"` の payload に限定し、S29 / S30 と `02-state-lifecycle-01.md` の既存 owner 観点で担保)                    |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-139、TC-142
- Exception: TC-137、TC-144
- External: TC-140
- Boundary: TC-135、TC-136、TC-141
- Type: excluded(型契約は `src/types-test.md` S4 の責務。host 側は値の routing のみを検証する)

**失敗系/正常系比（煙感知器）**: 正常系5件（TC-133、TC-134、TC-138、TC-143、TC-145）、失敗系8件（TC-135、TC-136、TC-137、TC-139、TC-140、TC-141、TC-142、TC-144）。比は 1.6:1 で、S28 と同じ分岐構成へ repo 相関の1件を加えた結果である。

## S32: checkout remote target の中継と 5 kind Response 写像

> Origin: Feature 051 (remote-checkout-pull) (light-spec-plan)
> Added: 2026-08-06
> Status: active
> Supersedes: S29
> Signature: `case "checkoutBranch"` の routing（`RequestCheckoutBranch` → `DataSource.checkoutBranch()` → `ResponseCheckoutBranch`）/ `case "createBranch"`
> Target Path: `src/gitGraphView.ts`（`handleMessage` switch の `case "checkoutBranch"` / `case "createBranch"` と `describeCheckoutResult()`）
> Test File: `tests/src/gitGraphView.test.ts`

request の構造化 remote target を加工せず DataSource へ渡し、5 kind の result を同じ kind / field の response へ写像する。createBranch 成功後の local checkout と部分成功メッセージは S29 から引き継ぎ、通常到達しない remote-only kind も exhaustive な説明関数で処理する。Git 内部分岐は `src/dataSource-test/02-branch-worktree-02.md` S46、webview 表示は `web/messageHandler-test/03-git-operation-responses-01.md` S15 の責務。

| Case ID | Input / Precondition                                                                                                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                | Notes                 |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| TC-146  | `{ command: "checkoutBranch", repo: "/r", branchName: "main", remoteBranch: { remoteName: "origin", branchName: "main" } }`、DataSource が completed/null を返す | Normal - structured target routing                                         | `dataSource.checkoutBranch` が `("/r", "main", { remoteName: "origin", branchName: "main" })` で 1 回呼ばれ、`sendMessage` が `{ command: "checkoutBranch", kind: "completed", status: null }` で 1 回呼ばれる | 引数不変中継          |
| TC-147  | DataSource が `{ kind: "branchExists" }` を返す                                                                                                                  | Validation - branchExists 写像                                             | `sendMessage` が `{ command: "checkoutBranch", kind: "branchExists" }` で 1 回呼ばれ、`status` field を持たない                                                                                                | S29/TC-122 の引き継ぎ |
| TC-148  | DataSource が `{ kind: "invalidRef" }` を返す                                                                                                                    | Validation - invalidRef 写像                                               | `sendMessage` が `{ command: "checkoutBranch", kind: "invalidRef" }` で 1 回呼ばれる                                                                                                                           | S29/TC-123 の引き継ぎ |
| TC-149  | DataSource が `{ kind: "remoteNotFound" }` を返す                                                                                                                | Validation - remoteNotFound 写像                                           | `sendMessage` が `{ command: "checkoutBranch", kind: "remoteNotFound" }` で 1 回呼ばれ、`status` field を持たない                                                                                              | 新 kind               |
| TC-150  | DataSource が `{ kind: "pullFailed", status: "CONFLICT" }` を返す                                                                                                | Exception - pullFailed 写像                                                | `sendMessage` が `{ command: "checkoutBranch", kind: "pullFailed", status: "CONFLICT" }` で 1 回呼ばれる                                                                                                       | status を保持         |
| TC-151  | DataSource が `{ kind: "completed", status: "fatal: checkout" }` を返す                                                                                          | Exception - completed failure 写像                                         | `sendMessage` が `{ command: "checkoutBranch", kind: "completed", status: "fatal: checkout" }` で 1 回呼ばれる                                                                                                 | S29/TC-125 の引き継ぎ |
| TC-152  | createBranch 成功 + `checkout: true`、local checkout が completed/`"fatal: pathspec"`                                                                            | Exception - create 後 checkout 失敗                                        | `ResponseCreateBranch.status` が `Branch 'feature/x' was created, but checkout failed: fatal: pathspec` と完全一致する                                                                                         | S29/TC-126 の引き継ぎ |
| TC-153  | createBranch 成功 + `checkout: true`、local checkout が completed/null                                                                                           | Normal - create＋checkout 成功                                             | `checkoutBranch(repo, branchName, null)` が 1 回呼ばれ、`ResponseCreateBranch.status` が `null`                                                                                                                | S29/TC-127 の引き継ぎ |
| TC-154  | createBranch 成功 + `checkout: true`、local checkout が `{ kind: "invalidRef" }`                                                                                 | Validation - create 後 non-completed result                                | `ResponseCreateBranch.status` が `Branch 'feature/x' was created, but checkout failed:` で始まり、`undefined` または生の kind にならない                                                                       | S29/TC-128 の引き継ぎ |
| TC-155  | createBranch 成功 + `checkout: false`                                                                                                                            | Normal - checkout 抑止                                                     | `checkoutBranch` の call count が 0、`ResponseCreateBranch.status` が `null`                                                                                                                                   | S29/TC-129 の引き継ぎ |
| TC-156  | createBranch が `"fatal: branch exists"` を返す + `checkout: true`                                                                                               | Exception - createBranch 失敗                                              | `checkoutBranch` の call count が 0、`ResponseCreateBranch.status` が `"fatal: branch exists"`                                                                                                                 | S29/TC-130 の引き継ぎ |
| TC-157  | createBranch request の `checkout` が `undefined`                                                                                                                | Boundary - legacy compat                                                   | `checkoutBranch` の call count が 0、`ResponseCreateBranch.status` が `null`                                                                                                                                   | S29/TC-131 の引き継ぎ |

### 失敗源インベントリ（include-or-justify）— Feature 051 追加分（S32）

| 失敗源                                                                 | 対応ケースまたは除外理由                                                                                                      |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| structured remote target の field 欠落・文字列化                       | TC-146（object の deep equality と DataSource call args を検証）                                                              |
| result kind の写像漏れ                                                 | TC-147〜TC-151                                                                                                                |
| `pullFailed.status` の欠落・握り潰し                                   | TC-150                                                                                                                        |
| createBranch 後 checkout の部分成功メッセージ崩れ                      | TC-152、TC-154                                                                                                                |
| createBranch 失敗後 / checkout false / legacy request で checkout する | TC-155〜TC-157                                                                                                                |
| 各分岐の negative 側（成功 response）                                  | TC-146、TC-153                                                                                                                |
| remote query / checkout / pull 自体の失敗                              | excluded(DataSource 内部分岐は `src/dataSource-test/02-branch-worktree-02.md` S46 の責務)                                     |
| webview の refresh / dialog 表示                                       | excluded(`web/messageHandler-test/03-git-operation-responses-01.md` S15 の責務)                                               |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL）                  | excluded(payload は文字列と object で数値境界を持たない。`remoteBranch: null` は TC-153、legacy `undefined` は TC-157 で検証) |
| 不正な型・payload field 欠落                                           | excluded(`src/types-test.md` S6 の型契約で担保)                                                                               |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-147、TC-148、TC-149、TC-154
- Exception: TC-150、TC-151、TC-152、TC-156
- External: excluded(external Git 依存は DataSource owner の責務)
- Boundary: TC-157
- Type: excluded(`src/types-test.md` S6 の責務)

**失敗系/正常系比（煙感知器）**: 正常系3件（TC-146、TC-153、TC-155）、失敗系9件（残り）。比は 3.0:1 で、result kind と createBranch の既存分岐から導出した結果である。
