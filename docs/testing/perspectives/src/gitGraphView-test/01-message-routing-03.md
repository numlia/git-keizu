# テスト観点表: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Generated: 2026-08-03T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: message-routing

## S28: 二段階 Push の phase orchestration

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-03
> Status: active
> Supersedes: S5
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
> Status: active
> Supersedes: S11
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
