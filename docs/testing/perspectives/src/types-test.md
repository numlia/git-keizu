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
> Status: superseded
> Supersedes: -
> Superseded By: S4
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

## S4: checkout 結果と二段階 Push の型契約（Response への repo 必須化）

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-04
> Status: superseded
> Supersedes: S3
> Superseded By: S6
> Signature: `CheckoutBranchResult` / `ResponseCheckoutBranch` / `RequestPush` / `ResponsePush`
> Target Path: `src/types.ts`（checkout 結果 union と Push protocol）
> Test File: `tests/src/types.test.ts`

`ResponsePush` の 3 variant すべてへ `repo: string` を必須追加し、webview 側が module state（`pendingPushRepo`）で repository を持ち回る設計を型で不要にする変更。S3 は `repo` を持たない Response literal が代入できることを期待結果としていたため supersede する。checkout 結果と `RequestPush` の契約は S3 から変更がないが、section をライフサイクルの単位とする規約に従い、現行契約を 1 セクションで表せるよう本セクションへ引き継ぐ。runtime の分岐は各 owner（`src/gitGraphView-test/01-message-routing-03.md` S31、`web/messageHandler-test.md` S14、`web/refMenu-test/01-branch-actions-01.md` S17 / S19）の責務で、本セクションは `@ts-expect-error` と代入可否だけを検証する。

| Case ID | Input / Precondition                                                                                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                           | Notes                            |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| TC-026  | `{ kind: "branchExists" }` を `CheckoutBranchResult` へ代入                                                                                          | Type - branchExists variant                                                | 代入がコンパイルでき、`kind` で narrowing した分岐で `status` へアクセスすると型エラーになる（`@ts-expect-error` が有効） | S3/TC-010 の引き継ぎ（契約不変） |
| TC-027  | `{ kind: "invalidRef" }` を `CheckoutBranchResult` へ代入                                                                                            | Type - invalidRef variant                                                  | 代入がコンパイルできる                                                                                                    | S3/TC-011 の引き継ぎ             |
| TC-028  | `{ kind: "completed", status: null }` を `CheckoutBranchResult` へ代入                                                                               | Type - completed variant                                                   | 代入がコンパイルでき、`kind === "completed"` で narrowing した分岐で `status` へアクセスできる                            | S3/TC-012 の引き継ぎ             |
| TC-029  | `{ kind: "completed" }`（`status` 欠落）を代入                                                                                                       | Type - completed の必須 field                                              | `@ts-expect-error` が有効（型エラーになる）                                                                               | S3/TC-013 の引き継ぎ             |
| TC-030  | `{ kind: "unknown" }` を代入                                                                                                                         | Type - 未知の kind                                                         | `@ts-expect-error` が有効（型エラーになる）                                                                               | S3/TC-014 の引き継ぎ             |
| TC-031  | `{ command: "push", repo: "/r", operationId: "op-1", selectedRemote: null }` を `RequestPush` へ代入                                                 | Type - 初回 Request                                                        | 代入がコンパイルできる                                                                                                    | S3/TC-015 の引き継ぎ             |
| TC-032  | `{ command: "push", repo: "/r", operationId: "op-1", selectedRemote: "origin" }` を `RequestPush` へ代入                                             | Type - 選択後 Request                                                      | 代入がコンパイルできる                                                                                                    | S3/TC-016 の引き継ぎ             |
| TC-033  | `RequestPush` から `operationId` を欠落させた object literal                                                                                         | Type - operationId 必須（Request）                                         | `@ts-expect-error` が有効（型エラーになる）                                                                               | S3/TC-017 の引き継ぎ             |
| TC-034  | `RequestPush` から `selectedRemote` を欠落させた object literal                                                                                      | Type - selectedRemote 必須                                                 | `@ts-expect-error` が有効（型エラーになる）                                                                               | S3/TC-018 の引き継ぎ             |
| TC-035  | `{ command: "push", repo: "/r", operationId: "op-1", phase: "selectRemote", remotes: ["origin"], defaultRemote: "origin" }` を `ResponsePush` へ代入 | Type - selectRemote variant                                                | 代入がコンパイルでき、`phase` で narrowing した分岐で `repo` / `remotes` / `defaultRemote` へアクセスできる               | repo 追加後の正常代入            |
| TC-036  | `{ command: "push", repo: "/r", operationId: "op-1", phase: "noRemotes" }` を `ResponsePush` へ代入                                                  | Type - noRemotes variant                                                   | 代入がコンパイルでき、narrowing 後に `remotes` へアクセスすると型エラーになる（`@ts-expect-error` が有効）                | phase 固有 field の分離          |
| TC-037  | `{ command: "push", repo: "/r", operationId: "op-1", phase: "completed", status: null }` を `ResponsePush` へ代入                                    | Type - completed variant                                                   | 代入がコンパイルでき、narrowing 後に `status` へアクセスできる                                                            | -                                |
| TC-038  | completed variant から `status` を欠落させた object literal                                                                                          | Type - completed の必須 field                                              | `@ts-expect-error` が有効（型エラーになる）                                                                               | -                                |
| TC-039  | selectRemote variant から `defaultRemote` を欠落させた object literal                                                                                | Type - selectRemote の必須 field                                           | `@ts-expect-error` が有効（型エラーになる）                                                                               | -                                |
| TC-040  | 3 variant それぞれから `operationId` を欠落させた object literal                                                                                     | Type - operationId 必須（全 Response variant）                             | 3 つとも `@ts-expect-error` が有効（型エラーになる）                                                                      | 全 variant 共通の必須 field      |
| TC-041  | 3 variant それぞれから `repo` を欠落させた object literal                                                                                            | Type - repo 必須（全 Response variant）                                    | 3 つとも `@ts-expect-error` が有効（型エラーになる）                                                                      | module state 廃止の型的な担保    |
| TC-042  | `switch (response.phase)` で `selectRemote` / `noRemotes` / `completed` の 3 case を網羅する                                                         | Type - exhaustive narrowing                                                | `default` 節で残余値を `never` 型の変数へ代入してもコンパイルできる（列挙漏れがない）                                     | S3/TC-025 の引き継ぎ             |

### 失敗源インベントリ（include-or-justify）— Feature 047 P3 修正分（S4）

| 失敗源                                                | 対応ケースまたは除外理由                                                                                                                                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 必須 field の欠落（`repo`）                           | TC-041                                                                                                                                                                                                      |
| 必須 field の欠落（`operationId`）                    | TC-033、TC-040                                                                                                                                                                                              |
| 必須 field の欠落（phase / kind 固有 field）          | TC-029、TC-038、TC-039                                                                                                                                                                                      |
| optional 化による phase 推測の余地                    | TC-034、TC-036                                                                                                                                                                                              |
| union 外の値の受理                                    | TC-030                                                                                                                                                                                                      |
| variant の取り違え（narrowing できない型設計）        | TC-026、TC-028、TC-035、TC-036、TC-037、TC-042                                                                                                                                                              |
| 各分岐の negative 側（有効な literal が拒否される）   | TC-027、TC-031、TC-032、TC-035                                                                                                                                                                              |
| repository を module state で持ち回る設計への逆戻り   | TC-041（型で `repo` を強制するため、Response 受信側が別経路から repository を得る必要がなくなる。実行時の配線は `web/messageHandler-test.md` S14 と `web/refMenu-test/01-branch-actions-01.md` S19 の責務） |
| runtime の値送出・分岐の誤り                          | excluded(実行時の挙動は `src/gitGraphView-test/01-message-routing-03.md` S31、`web/messageHandler-test.md` S14 の責務)                                                                                      |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL） | excluded(型エイリアス定義のみで数値境界を持たない。`selectedRemote: null` と `status: null` の代入可否は TC-031 / TC-037 に含めて検証)                                                                      |
| 外部依存の失敗                                        | excluded(外部依存なし)                                                                                                                                                                                      |
| 例外送出                                              | excluded(型定義のみで throw 経路が存在しない)                                                                                                                                                               |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(型エイリアス定義のみで実行時の検証分岐が存在しない)
- Exception: excluded(同上。throw 経路なし)
- External: excluded(外部依存なし)
- Boundary: excluded(型定義に数値・空値境界が存在しない。`null` の代入可否は TC-031 / TC-037 に含めて検証)
- Type: TC-026〜TC-042

**失敗系/正常系比（煙感知器）**: 正常系0件、失敗系17件（TC-026〜TC-042）。S2・S3 と同じく本セクションの対象は型契約のみで正常実行経路を持たないため、正常系0件はインベントリ欠落ではないことを確認した。

## S5: PushTarget の local / upstream branch 分離

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-04
> Status: active
> Supersedes: -
> Signature: `PushTarget`
> Target Path: `src/types.ts`（`PushTarget`）
> Test File: `tests/src/types.test.ts`

upstream 設定済み Push で現在のローカル branch と upstream 側 branch の名前が異なる場合に備え、`PushTarget` が `localBranchName` と `upstreamBranchName` を別 field として必須保持する型契約を固定する。実行時の refspec と Git state は `src/dataSource-test/02-branch-worktree-02.md` S42 / S43、host の引き渡しは `src/gitGraphView-test/01-message-routing-03.md` S31 の責務。

| Case ID | Input / Precondition                                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                         | Notes                  |
| ------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------- |
| TC-043  | local `feature/local` / upstream `main` の `PushTarget`、および各 branch field を欠落させた object literal | Type - Push 元・Push 先の必須 field                                        | 別名を持つ target は代入でき、`localBranchName` / `upstreamBranchName` のどちらを欠いても型エラーになる | refspec 両側の型的担保 |

### 失敗源インベントリ（include-or-justify）— Feature 047 別名 upstream 修正分（S5）

| 失敗源                                      | 対応ケースまたは除外理由                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Push 元と Push 先を単一 branch 名へ縮退する | TC-043                                                                                          |
| 必須 field の欠落                           | TC-043                                                                                          |
| runtime の refspec 構築・Git 実行           | excluded(`src/dataSource-test/02-branch-worktree-02.md` S43 TC-254 / TC-261 の責務)             |
| 外部依存の失敗                              | excluded(型定義のみで外部依存なし)                                                              |
| 境界値（empty / 不正 ref）                  | excluded(実行時 validation は `src/dataSource-test/02-branch-worktree-02.md` S43 TC-259 の責務) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(型定義のみで実行時 validation 分岐なし)
- Exception: excluded(型定義のみで throw 経路なし)
- External: excluded(外部依存なし)
- Boundary: excluded(不正 ref は runtime owner の責務)
- Type: TC-043

**失敗系/正常系比（煙感知器）**: 正常系0件、失敗系1件（TC-043）。本セクションは必須 field の型契約のみを対象とするため、正常系0件はインベントリ欠落ではない。

## S6: remote checkout target・結果と二段階 Push の型契約

> Origin: Feature 051 (remote-checkout-pull) (light-spec-plan)
> Added: 2026-08-06
> Status: active
> Supersedes: S4
> Signature: `RemoteBranchTarget` / `RequestCheckoutBranch` / `CheckoutBranchResult` / `ResponseCheckoutBranch` / `RequestPush` / `ResponsePush`
> Target Path: `src/types.ts`（checkout target・result / response union と Push protocol）
> Test File: `tests/src/types.test.ts`

checkout request の remote 値を役割別 field を持つ object にし、checkout 後の pull 失敗と remote 不在を他の結果から型で区別する。S4 が保持していた二段階 Push と Response の `repo` 必須契約は変更せず、新しい Case ID で引き継ぐ。`PushTarget` の契約は S5 の責務で変更しない。

| Case ID | Input / Precondition                                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                         | Notes                    |
| ------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------ |
| TC-044  | `{ remoteName: "origin", branchName: "main" }` を `RemoteBranchTarget` へ代入                        | Type - remote target                                                       | 代入がコンパイルでき、`remoteName` と `branchName` をそれぞれ `string` として参照できる | 役割を分離               |
| TC-045  | `RemoteBranchTarget` から `remoteName` を欠落                                                        | Type - remoteName 必須                                                     | `@ts-expect-error` が有効（型エラーになる）                                             | payload 欠落             |
| TC-046  | `RemoteBranchTarget` から `branchName` を欠落                                                        | Type - branchName 必須                                                     | `@ts-expect-error` が有効（型エラーになる）                                             | payload 欠落             |
| TC-047  | `remoteBranch: null` の object literal を `RequestCheckoutBranch` へ代入                             | Type - local checkout request                                              | 代入がコンパイルでき、`remoteBranch === null` で narrowing できる                       | local 経路               |
| TC-048  | `remoteBranch: { remoteName: "origin", branchName: "main" }` の object literal を代入                | Type - remote checkout request                                             | 代入がコンパイルでき、非 null 分岐で両 field を参照できる                               | structured target        |
| TC-049  | `RequestCheckoutBranch` から `remoteBranch` を欠落                                                   | Type - remoteBranch 必須                                                   | `@ts-expect-error` が有効（型エラーになる）                                             | optional 化を防ぐ        |
| TC-050  | `{ kind: "branchExists" }` を `CheckoutBranchResult` へ代入                                          | Type - branchExists result                                                 | 代入がコンパイルでき、narrowing 後に `status` へアクセスすると型エラーになる            | S4/TC-026 の引き継ぎ     |
| TC-051  | `{ kind: "invalidRef" }` を `CheckoutBranchResult` へ代入                                            | Type - invalidRef result                                                   | 代入がコンパイルできる                                                                  | S4/TC-027 の引き継ぎ     |
| TC-052  | `{ kind: "remoteNotFound" }` を `CheckoutBranchResult` へ代入                                        | Type - remoteNotFound result                                               | 代入がコンパイルでき、narrowing 後に `status` へアクセスすると型エラーになる            | 新 variant               |
| TC-053  | `{ kind: "pullFailed", status: "CONFLICT" }` を `CheckoutBranchResult` へ代入                        | Type - pullFailed result                                                   | 代入がコンパイルでき、narrowing 後の `status` が `string` である                        | 部分成功                 |
| TC-054  | `{ kind: "pullFailed" }` を `CheckoutBranchResult` へ代入                                            | Type - pullFailed status 必須                                              | `@ts-expect-error` が有効（型エラーになる）                                             | field 欠落               |
| TC-055  | `{ kind: "pullFailed", status: null }` を代入                                                        | Type - pullFailed status 非 null                                           | `@ts-expect-error` が有効（`null` を許容しない）                                        | completed と区別         |
| TC-056  | `{ kind: "completed", status: null }` を `CheckoutBranchResult` へ代入                               | Type - completed result                                                    | 代入がコンパイルでき、narrowing 後に `status` が `GitCommandStatus` である              | S4/TC-028 の引き継ぎ     |
| TC-057  | `{ kind: "completed" }` を代入                                                                       | Type - completed status 必須                                               | `@ts-expect-error` が有効（型エラーになる）                                             | S4/TC-029 の引き継ぎ     |
| TC-058  | `{ kind: "unknown" }` を代入                                                                         | Type - 未知の result kind                                                  | `@ts-expect-error` が有効（型エラーになる）                                             | S4/TC-030 の引き継ぎ     |
| TC-059  | `switch (result.kind)` で 5 kind を列挙                                                              | Type - result exhaustive narrowing                                         | `default` 節の残余値を `never` へ代入してもコンパイルできる                             | kind 漏れを検出          |
| TC-060  | `{ command: "checkoutBranch", kind: "branchExists" }` を `ResponseCheckoutBranch` へ代入             | Type - branchExists response                                               | 代入がコンパイルできる                                                                  | response union           |
| TC-061  | `{ command: "checkoutBranch", kind: "invalidRef" }` を代入                                           | Type - invalidRef response                                                 | 代入がコンパイルできる                                                                  | response union           |
| TC-062  | `{ command: "checkoutBranch", kind: "remoteNotFound" }` を代入                                       | Type - remoteNotFound response                                             | 代入がコンパイルできる                                                                  | response union           |
| TC-063  | `{ command: "checkoutBranch", kind: "pullFailed", status: "CONFLICT" }` を代入                       | Type - pullFailed response                                                 | 代入がコンパイルでき、narrowing 後の `status` が `string` である                        | response union           |
| TC-064  | `{ command: "checkoutBranch", kind: "completed", status: null }` を代入                              | Type - completed response                                                  | 代入がコンパイルできる                                                                  | response union           |
| TC-065  | pullFailed / completed response から `status` を欠落                                                 | Type - response status 必須                                                | 2 つとも `@ts-expect-error` が有効（型エラーになる）                                    | variant 固有 field       |
| TC-066  | `switch (response.kind)` で 5 kind を列挙                                                            | Type - response exhaustive narrowing                                       | `default` 節の残余値を `never` へ代入してもコンパイルできる                             | response kind 漏れを検出 |
| TC-067  | `{ command: "push", repo: "/r", operationId: "op-1", selectedRemote: null }` を `RequestPush` へ代入 | Type - 初回 Push Request                                                   | 代入がコンパイルできる                                                                  | S4/TC-031 の引き継ぎ     |
| TC-068  | `{ command: "push", repo: "/r", operationId: "op-1", selectedRemote: "origin" }` を代入              | Type - 選択後 Push Request                                                 | 代入がコンパイルできる                                                                  | S4/TC-032 の引き継ぎ     |
| TC-069  | `RequestPush` から `operationId` を欠落                                                              | Type - operationId 必須                                                    | `@ts-expect-error` が有効（型エラーになる）                                             | S4/TC-033 の引き継ぎ     |
| TC-070  | `RequestPush` から `selectedRemote` を欠落                                                           | Type - selectedRemote 必須                                                 | `@ts-expect-error` が有効（型エラーになる）                                             | S4/TC-034 の引き継ぎ     |
| TC-071  | repo 付き `selectRemote` variant を `ResponsePush` へ代入                                            | Type - selectRemote response                                               | 代入がコンパイルでき、narrowing 後に `repo` / `remotes` / `defaultRemote` を参照できる  | S4/TC-035 の引き継ぎ     |
| TC-072  | repo 付き `noRemotes` variant を代入                                                                 | Type - noRemotes response                                                  | 代入がコンパイルでき、narrowing 後に `remotes` へアクセスすると型エラーになる           | S4/TC-036 の引き継ぎ     |
| TC-073  | repo 付き `completed` variant を代入                                                                 | Type - completed Push response                                             | 代入がコンパイルでき、narrowing 後に `status` を参照できる                              | S4/TC-037 の引き継ぎ     |
| TC-074  | Push completed variant から `status` を欠落                                                          | Type - Push status 必須                                                    | `@ts-expect-error` が有効（型エラーになる）                                             | S4/TC-038 の引き継ぎ     |
| TC-075  | selectRemote variant から `defaultRemote` を欠落                                                     | Type - defaultRemote 必須                                                  | `@ts-expect-error` が有効（型エラーになる）                                             | S4/TC-039 の引き継ぎ     |
| TC-076  | 3 Push response variant から `operationId` を欠落                                                    | Type - operationId 必須（全 variant）                                      | 3 つとも `@ts-expect-error` が有効（型エラーになる）                                    | S4/TC-040 の引き継ぎ     |
| TC-077  | 3 Push response variant から `repo` を欠落                                                           | Type - repo 必須（全 variant）                                             | 3 つとも `@ts-expect-error` が有効（型エラーになる）                                    | S4/TC-041 の引き継ぎ     |
| TC-078  | `switch (response.phase)` で Push の 3 phase を列挙                                                  | Type - Push exhaustive narrowing                                           | `default` 節の残余値を `never` へ代入してもコンパイルできる                             | S4/TC-042 の引き継ぎ     |

### 失敗源インベントリ（include-or-justify）— Feature 051 追加分（S6）

| 失敗源                                               | 対応ケースまたは除外理由                                                                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| checkout payload の `remoteName` / `branchName` 欠落 | TC-045、TC-046                                                                                                                       |
| request の `remoteBranch` 欠落・optional 化          | TC-047〜TC-049                                                                                                                       |
| checkout result / response の未知 kind               | TC-058、TC-059、TC-066                                                                                                               |
| `remoteNotFound` variant 欠落                        | TC-052、TC-062                                                                                                                       |
| `pullFailed.status` の欠落・null 許容                | TC-053〜TC-055、TC-063、TC-065                                                                                                       |
| completed status の欠落                              | TC-057、TC-065                                                                                                                       |
| result / response narrowing の不完結                 | TC-050〜TC-066                                                                                                                       |
| Push Request の必須 field 欠落                       | TC-069、TC-070                                                                                                                       |
| Push Response の variant 固有 / 共通 field 欠落      | TC-074〜TC-077                                                                                                                       |
| Push phase narrowing の不完結                        | TC-071〜TC-073、TC-078                                                                                                               |
| 境界値（0 / minimum / maximum / +/-1 / empty）       | excluded(型定義は文字列の値域を制約しない。runtime の ref / remote 検証は `src/dataSource-test/02-branch-worktree-02.md` S46 の責務) |
| 外部依存の失敗・例外送出                             | excluded(型定義のみで外部依存と throw 経路を持たない)                                                                                |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(型定義のみで runtime validation 分岐なし)
- Exception: excluded(型定義のみで throw 経路なし)
- External: excluded(外部依存なし)
- Boundary: TC-047、TC-055、TC-056、TC-067（`null` の許可 / 拒否を型で検証。数値境界は非該当）
- Type: TC-044〜TC-078

**失敗系/正常系比（煙感知器）**: 正常系0件、失敗系35件（全件 Type / Boundary）。型定義 artifact のため Normal runtime case は存在せず、正常な代入と拒否される代入を Type category 内で対にしている。
