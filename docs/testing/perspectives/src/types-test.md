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
