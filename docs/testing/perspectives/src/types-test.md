# テスト観点表: src/types.ts

> Source: `src/types.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: UNCOMMITTED_CHANGES_HASH / VALID_UNCOMMITTED_RESET_MODES 定数検証

> Origin: Feature 001 (menu-bar-enhancement) Task 1.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `src/types.ts`

| Case ID | Input / Precondition                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result         | Notes                                          |
| ------- | --------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------- |
| TC-001  | UNCOMMITTED_CHANGES_HASH 定数を参照                 | Normal - standard                                                          | 値が `"*"` と一致する   | 既存のハードコード値との互換性保証             |
| TC-002  | VALID_UNCOMMITTED_RESET_MODES を参照                | Normal - standard                                                          | `"mixed"` を含む        | -                                              |
| TC-003  | VALID_UNCOMMITTED_RESET_MODES を参照                | Normal - standard                                                          | `"hard"` を含む         | -                                              |
| TC-004  | VALID_UNCOMMITTED_RESET_MODES のサイズ              | Boundary - exact count                                                     | Set のサイズが 2 である | "soft" は含まないことの間接検証                |
| TC-005  | VALID_UNCOMMITTED_RESET_MODES に `"soft"` で has()  | Normal - invalid                                                           | `false` を返す          | Uncommitted リセットでは soft は意味をなさない |
| TC-006  | VALID_UNCOMMITTED_RESET_MODES に `""` で has()      | Boundary - empty                                                           | `false` を返す          | -                                              |
| TC-007  | VALID_UNCOMMITTED_RESET_MODES に `"MIXED"` で has() | Boundary - case sensitivity                                                | `false` を返す          | 大文字は受け付けない                           |

## S2: worktree Open/Reveal 応答の status 必須化

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: `ResponseOpenWorktreeInNewWindow` / `ResponseRevealWorktreeInOS`（`status: GitCommandStatus` を必須化）
> Target Path: `src/types.ts:586-604`

worktree の Open/Reveal 応答型の `status?`（optional）を必須の `status: GitCommandStatus`（`string | null`）へ変更する修正。optional のままだと成功応答の `undefined` が webview 側の `status !== null` 判定でエラー扱いになるため、型で必須送出を強制する（[2] の型契約）。host/web の実行分岐は各 owner（`src/gitGraphView-test/` / `web/messageHandler-test.md`）の責務。

| Case ID | Input / Precondition                                                                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                     | Notes                    |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| TC-008  | `{ command: "openWorktreeInNewWindow" }`（status 欠落）/ `{ command: "openWorktreeInNewWindow", status: null }` / `status: "msg"` を型検査 | Type - status 必須（open）                                                 | status 欠落の object literal は型エラーになり（`@ts-expect-error` が有効）、`status: null` と `status: "msg"` は `ResponseOpenWorktreeInNewWindow` へ代入可能である | typecheck / 型レベル検証 |
| TC-009  | `{ command: "revealWorktreeInOS" }`（status 欠落）/ `status: null` / `status: "msg"` を型検査                                              | Type - status 必須（reveal）                                               | status 欠落の object literal は型エラーになり、`status: null` と `status: "msg"` は `ResponseRevealWorktreeInOS` へ代入可能である                                   | typecheck / 型レベル検証 |

### 失敗源インベントリ（include-or-justify）— Feature 045 追加分（S2）

| 失敗源                                                       | 対応ケースまたは除外理由                                                            |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| optional status のままの成功応答 `undefined`（誤エラー判定） | TC-008、TC-009（必須化の型検査で送出漏れをコンパイル時に検出）                      |
| 片方の command 型だけの必須化                                | TC-008（open）と TC-009（reveal）を個別に検証                                       |
| 実行時の status 値の誤送出                                   | excluded(host 側の送出値は `src/gitGraphView-test/` owner の TC-100〜TC-105 で担保) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(型エイリアス定義のみで実行時の検証分岐が存在しない)
- Exception: excluded(同上。throw 経路なし)
- External: excluded(外部依存なし)
- Boundary: excluded(型定義に数値・空値境界が存在しない。`null` の代入可否は TC-008/TC-009 に含めて検証)
- Type: TC-008、TC-009

**失敗系/正常系比（煙感知器）**: 正常系0件、失敗系2件（TC-008、TC-009）。本セクションの対象は型契約のみで正常実行経路を持たないため、正常系0件はインベントリ欠落ではないことを確認した。

## S3: checkout 結果と二段階 Push の型契約

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-03
> Status: active
> Supersedes: -
> Signature: `CheckoutBranchResult` / `ResponseCheckoutBranch` / `PushTarget` / `PushPreparation` / `RequestPush` / `ResponsePush`
> Target Path: `src/types.ts`（checkout 結果 union と Push protocol。実装後に行範囲へ更新）
> Test File: `tests/src/types.test.ts`

checkout の結果を `kind` で、Push の応答を `phase` で narrowing できる discriminated union として固定する型契約の観点。`RequestPush` は `operationId` と `selectedRemote` を必須にし、`ResponsePush` の 3 variant はいずれも `operationId` を必須にする。runtime の分岐は各 owner（`src/dataSource-test/02-branch-worktree-02.md` / `src/gitGraphView-test/01-message-routing-03.md` / `web/messageHandler-test.md`）の責務で、本セクションは `@ts-expect-error` と代入可否だけを検証する。

| Case ID | Input / Precondition                                                                                                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                           | Notes                       |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| TC-010  | `{ kind: "branchExists" }` を `CheckoutBranchResult` へ代入                                                                              | Type - branchExists variant                                                | 代入がコンパイルでき、`kind` で narrowing した分岐で `status` へアクセスすると型エラーになる（`@ts-expect-error` が有効） | status を持たない variant   |
| TC-011  | `{ kind: "invalidRef" }` を `CheckoutBranchResult` へ代入                                                                                | Type - invalidRef variant                                                  | 代入がコンパイルできる                                                                                                    | -                           |
| TC-012  | `{ kind: "completed", status: null }` を `CheckoutBranchResult` へ代入                                                                   | Type - completed variant                                                   | 代入がコンパイルでき、`kind === "completed"` で narrowing した分岐で `status` へアクセスできる                            | `GitCommandStatus`          |
| TC-013  | `{ kind: "completed" }`（`status` 欠落）を代入                                                                                           | Type - completed の必須 field                                              | `@ts-expect-error` が有効（型エラーになる）                                                                               | completed だけ status 必須  |
| TC-014  | `{ kind: "unknown" }` を代入                                                                                                             | Type - 未知の kind                                                         | `@ts-expect-error` が有効（型エラーになる）                                                                               | union 外の値                |
| TC-015  | `{ command: "push", repo: "/r", operationId: "op-1", selectedRemote: null }` を `RequestPush` へ代入                                     | Type - 初回 Request                                                        | 代入がコンパイルできる                                                                                                    | 選択前の Request            |
| TC-016  | `{ command: "push", repo: "/r", operationId: "op-1", selectedRemote: "origin" }` を `RequestPush` へ代入                                 | Type - 選択後 Request                                                      | 代入がコンパイルできる                                                                                                    | 2 通目の Request            |
| TC-017  | `RequestPush` から `operationId` を欠落させた object literal                                                                             | Type - operationId 必須（Request）                                         | `@ts-expect-error` が有効（型エラーになる）                                                                               | 相関 ID の欠落防止          |
| TC-018  | `RequestPush` から `selectedRemote` を欠落させた object literal                                                                          | Type - selectedRemote 必須                                                 | `@ts-expect-error` が有効（型エラーになる）                                                                               | optional にしない           |
| TC-019  | `{ command: "push", operationId: "op-1", phase: "selectRemote", remotes: ["origin"], defaultRemote: "origin" }` を `ResponsePush` へ代入 | Type - selectRemote variant                                                | 代入がコンパイルでき、`phase` で narrowing した分岐で `remotes` と `defaultRemote` へアクセスできる                       | -                           |
| TC-020  | `{ command: "push", operationId: "op-1", phase: "noRemotes" }` を `ResponsePush` へ代入                                                  | Type - noRemotes variant                                                   | 代入がコンパイルでき、narrowing 後に `remotes` へアクセスすると型エラーになる（`@ts-expect-error` が有効）                | phase 固有 field の分離     |
| TC-021  | `{ command: "push", operationId: "op-1", phase: "completed", status: null }` を `ResponsePush` へ代入                                    | Type - completed variant                                                   | 代入がコンパイルでき、narrowing 後に `status` へアクセスできる                                                            | -                           |
| TC-022  | completed variant から `status` を欠落させた object literal                                                                              | Type - completed の必須 field                                              | `@ts-expect-error` が有効（型エラーになる）                                                                               | -                           |
| TC-023  | selectRemote variant から `defaultRemote` を欠落させた object literal                                                                    | Type - selectRemote の必須 field                                           | `@ts-expect-error` が有効（型エラーになる）                                                                               | -                           |
| TC-024  | 3 variant それぞれから `operationId` を欠落させた object literal                                                                         | Type - operationId 必須（全 Response variant）                             | 3 つとも `@ts-expect-error` が有効（型エラーになる）                                                                      | 全 variant 共通の必須 field |
| TC-025  | `switch (response.phase)` で `selectRemote` / `noRemotes` / `completed` の 3 case を網羅する                                             | Type - exhaustive narrowing                                                | `default` 節で残余値を `never` 型の変数へ代入してもコンパイルできる（列挙漏れがない）                                     | phase による網羅性          |

### 失敗源インベントリ（include-or-justify）— Feature 047 追加分（S3）

| 失敗源                                                | 対応ケースまたは除外理由                                                                                                                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 必須 field の欠落（`operationId`）                    | TC-017、TC-024                                                                                                                                                                       |
| 必須 field の欠落（phase / kind 固有 field）          | TC-013、TC-022、TC-023                                                                                                                                                               |
| optional 化による phase 推測の余地                    | TC-018、TC-020                                                                                                                                                                       |
| union 外の値の受理                                    | TC-014                                                                                                                                                                               |
| variant の取り違え（narrowing できない型設計）        | TC-010、TC-012、TC-019、TC-020、TC-021、TC-025                                                                                                                                       |
| 各分岐の negative 側（有効な literal が拒否される）   | TC-011、TC-015、TC-016                                                                                                                                                               |
| runtime の値送出・分岐の誤り                          | excluded(実行時の挙動は `src/dataSource-test/02-branch-worktree-02.md` S41〜S43、`src/gitGraphView-test/01-message-routing-03.md` S28〜S29、`web/messageHandler-test.md` S12 の責務) |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL） | excluded(型エイリアス定義のみで数値境界を持たない。`selectedRemote: null` と `status: null` の代入可否は TC-015 / TC-021 に含めて検証)                                               |
| 外部依存の失敗                                        | excluded(外部依存なし)                                                                                                                                                               |
| 例外送出                                              | excluded(型定義のみで throw 経路が存在しない)                                                                                                                                        |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(型エイリアス定義のみで実行時の検証分岐が存在しない)
- Exception: excluded(同上。throw 経路なし)
- External: excluded(外部依存なし)
- Boundary: excluded(型定義に数値・空値境界が存在しない。`null` の代入可否は TC-015 / TC-021 に含めて検証)
- Type: TC-010〜TC-025

**失敗系/正常系比（煙感知器）**: 正常系0件、失敗系16件（TC-010〜TC-025）。S2 と同じく本セクションの対象は型契約のみで正常実行経路を持たないため、正常系0件はインベントリ欠落ではないことを確認した。
