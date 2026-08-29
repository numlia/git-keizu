# テスト観点表: l10n/web/web.l10n.ja.json

> Source: `l10n/web/web.l10n.ja.json`
> Generated: 2026-05-17T00:00:00Z
> Language: JSON (l10n bundle)
> Test Framework: Vitest
> Storage Mode: single-file

## S1: commit 起点 Create Branch ダイアログ翻訳 (Feature 040)

> Origin: Feature 040 (settings-and-copy-polish) (light-spec-plan)
> Added: 2026-05-17
> Status: active
> Supersedes: -
> Target Path: `l10n/web/web.l10n.ja.json`
> Test File: `tests/web/i18n.test.ts`

commit 起点の Create Branch ダイアログ翻訳キーが追加され、既存の stash 起点キーが維持されていることを検証する。

| Case ID | Input / Precondition                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                        | Notes                |
| ------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------- |
| TC-001  | `Enter the name of the branch you would like to create from commit {0}:` を読み込み | Normal - new key                                                           | 「コミット」を含み `{0}` placeholder を残す日本語訳    | commit 起点キー追加  |
| TC-002  | `Enter the name of the branch you would like to create from {0}:` を読み込み        | Normal - existing key                                                      | `{0} から作成するブランチ名を入力してください:` を返す | stash 起点キーは保護 |

## S2: worktree 操作エラーの日本語翻訳キー (Feature 045)

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Target Path: `l10n/web/web.l10n.ja.json`
> Test File: `tests/web/i18n.test.ts`

worktree の Open/Reveal 失敗表示に使う専用エラーキー `error.openWorktreeInNewWindow` / `error.revealWorktreeInOS` が ja bundle に追加されていることを検証する。キーの利用分岐は `web/messageHandler-test.md` S11 の責務。

| Case ID | Input / Precondition                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                            | Notes                     |
| ------- | --------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------- |
| TC-003  | ja bundle から `error.openWorktreeInNewWindow` を読み込み | Normal - new key                                                           | キーが存在し、値が非空（`length > 0`）の日本語文字列である | Open 失敗の専用キー追加   |
| TC-004  | ja bundle から `error.revealWorktreeInOS` を読み込み      | Normal - new key                                                           | キーが存在し、値が非空（`length > 0`）の日本語文字列である | Reveal 失敗の専用キー追加 |

### 失敗源インベントリ（include-or-justify）— Feature 045 追加分（S2）

| 失敗源                                  | 対応ケースまたは除外理由                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| ja 側のキー欠落（片 locale のみの追加） | TC-003、TC-004（en 側は `web.l10n.en.json-test.md` TC-001〜TC-002 と対で担保） |
| 空文字の訳値                            | TC-003、TC-004（非空検証を含む）                                               |
| キーの利用分岐の欠落                    | excluded(`web/messageHandler-test.md` S11 TC-033/TC-035 で担保)                |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(JSON bundle は静的データで検証分岐が存在しない。欠落・空値の検出は TC-003/TC-004 の存在・非空検証に含まれる)
- Exception: excluded(JSON 読み込みの失敗はビルド/テスト基盤で検出され、bundle 自体に例外分岐はない)
- External: excluded(外部依存なし)
- Boundary: excluded(数値境界が存在しない。empty は TC-003/TC-004 の非空検証で充足)
- Type: excluded(値は JSON string で型分岐が存在しない)

**失敗系/正常系比（煙感知器）**: 正常系2件（TC-003、TC-004）、失敗系0件。静的 JSON データの存在・非空検証のみで実行分岐を持たないため、失敗系0件はインベントリ欠落ではないことを確認した。

## S3: 安全な checkout と Push 先選択の日本語翻訳キー (Feature 047)

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-03
> Status: active
> Supersedes: -
> Signature: 追加キー集合 `error.checkoutBranchExists` / `error.checkoutInvalidRef` / `error.pushNoRemotes` / `push.selectRemote` / `push.selectRemoteAction`
> Target Path: `l10n/web/web.l10n.ja.json`
> Test File: `tests/web/i18n.test.ts`

remote checkout の拒否理由と二段階 Push の選択 UI に使う 5 キー（`error.checkoutBranchExists` / `error.checkoutInvalidRef` / `error.pushNoRemotes` / `push.selectRemote` / `push.selectRemoteAction`）が ja bundle に追加されていることを検証する。キーの利用分岐は `web/messageHandler-test.md` S12 と `web/refMenu-test/01-branch-actions-01.md` S17 の責務。

| Case ID | Input / Precondition                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                   | Notes                         |
| ------- | --------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------- |
| TC-005  | ja bundle から `error.checkoutBranchExists` を読み込み    | Normal - new key                                                           | キーが存在し、値が非空（`length > 0`）の日本語文字列である                                        | 既存 branch の拒否理由        |
| TC-006  | ja bundle から `error.checkoutInvalidRef` を読み込み      | Normal - new key                                                           | キーが存在し、値が非空（`length > 0`）の日本語文字列である                                        | 不正 ref の拒否理由           |
| TC-007  | ja bundle から `error.pushNoRemotes` を読み込み           | Normal - new key                                                           | キーが存在し、値が非空（`length > 0`）の日本語文字列である                                        | 登録済み remote なし          |
| TC-008  | ja bundle から `push.selectRemote` を読み込み             | Normal - new key                                                           | キーが存在し、値が非空（`length > 0`）の日本語文字列である                                        | 選択ダイアログの prompt       |
| TC-009  | ja bundle から `push.selectRemoteAction` を読み込み       | Normal - new key                                                           | キーが存在し、値が非空（`length > 0`）の日本語文字列である                                        | 選択ダイアログの action label |
| TC-010  | ja / en 両 bundle を読み込み、上記 5 キーの集合と値を比較 | Validation - locale parity と raw key fallback の不在                      | en bundle に欠落しているキーが 0 件であり、5 キーの ja 値がいずれもキー文字列そのものと一致しない | 未翻訳の素通しを検出          |

### 失敗源インベントリ（include-or-justify）— Feature 047 追加分（S3）

| 失敗源                                                  | 対応ケースまたは除外理由                                                                                                            |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| ja 側のキー欠落                                         | TC-005〜TC-009                                                                                                                      |
| 片 locale だけの追加（parity 崩れ）                     | TC-010（en 側は `web.l10n.en.json-test.md` TC-008 と対で担保）                                                                      |
| 空文字の訳値                                            | TC-005〜TC-009（非空検証を含む）                                                                                                    |
| 未翻訳（キー文字列がそのまま値になる raw key fallback） | TC-010                                                                                                                              |
| キーの利用分岐の欠落                                    | excluded(`web/messageHandler-test.md` S12 TC-036 / TC-037 / TC-041 と `web/refMenu-test/01-branch-actions-01.md` S17 TC-084 で担保) |
| 境界値（0 / minimum / maximum / +/-1 / NULL）           | excluded(静的 JSON に数値境界が存在しない。empty は非空検証で充足)                                                                  |
| 外部依存の失敗・例外送出                                | excluded(bundle は静的データで外部依存も throw 経路も持たない)                                                                      |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-010
- Exception: excluded(JSON 読み込みの失敗はテスト基盤で検出され、bundle 自体に例外分岐はない)
- External: excluded(外部依存なし)
- Boundary: excluded(数値境界が存在しない。empty は TC-005〜TC-009 の非空検証で充足)
- Type: excluded(値は JSON string で型分岐が存在しない)

**失敗系/正常系比（煙感知器）**: 正常系5件（TC-005〜TC-009）、失敗系1件（TC-010）。静的 JSON データの存在・非空検証が中心で実行分岐を持たないため、失敗系が少ないことはインベントリ欠落ではないことを確認した。

## S4: 同名 remote checkout＋pull の日本語 prompt / error

> Origin: Feature 051 (remote-checkout-pull) (light-spec-plan)
> Added: 2026-08-06
> Status: active
> Supersedes: -
> Signature: 追加キー `Enter the local branch name for checking out {0}. If a branch with the same name already exists, the selected remote branch will be pulled after checkout:` / `error.checkoutRemoteNotFound`
> Target Path: `l10n/web/web.l10n.ja.json`
> Test File: `tests/web/i18n.test.ts`

| Case ID | Input / Precondition                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                | Notes                 |
| ------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| TC-011  | ja bundle から Feature 051 prompt source key を読み込む           | Normal - checkout＋pull prompt                                             | key が存在し、値が非空の日本語文字列で「選択したリモートブランチ」と同名既存時の pull を明示し、`{0}` placeholder をちょうど 1 個含む          | 利用者説明            |
| TC-012  | ja bundle から `error.checkoutRemoteNotFound` を読み込む          | Normal - remote not found error                                            | key が存在し、値が非空の日本語文字列で、値が raw key `error.checkoutRemoteNotFound` と一致しない                                               | raw fallback 防止     |
| TC-013  | ja / en 両 bundle で prompt と error key 集合・placeholder を比較 | Validation - locale parity / raw fallback                                  | en bundle で欠落している key が 0 件、prompt の placeholder 集合が両 locale で `{0}` と一致し、ja の 2 値がいずれも key 文字列そのものではない | parity と未翻訳を検出 |

### 失敗源インベントリ（include-or-justify）— Feature 051 追加分（S4）

| 失敗源                                                | 対応ケースまたは除外理由                                                                                                                |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| ja prompt key の欠落・空値                            | TC-011                                                                                                                                  |
| ja remoteNotFound key の欠落・空値                    | TC-012                                                                                                                                  |
| raw key fallback / 未翻訳                             | TC-012、TC-013                                                                                                                          |
| 片 locale だけの追加 / placeholder 不一致             | TC-013                                                                                                                                  |
| UI での prompt / error 利用分岐                       | excluded(`web/refMenu-test/01-branch-actions-01.md` S20 TC-100 / `web/messageHandler-test/03-git-operation-responses-01.md` S15 の責務) |
| 境界値（0 / minimum / maximum / +/-1 / NULL / empty） | excluded(静的 JSON に数値境界がなく、empty は TC-011 / TC-012 の非空検証で充足)                                                         |
| 外部依存の失敗・例外送出                              | excluded(bundle は静的データで外部依存と throw 経路を持たない)                                                                          |
| 不正な型・形式                                        | excluded(JSON string の型は parse / TypeScript で保証し、placeholder 形式は TC-011 / TC-013 で検証)                                     |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-013
- Exception: excluded(throw 経路なし)
- External: excluded(外部依存なし)
- Boundary: excluded(数値境界なし。empty は TC-011 / TC-012 で検証)
- Type: excluded(bundle 値は string の静的データ)

**失敗系/正常系比（煙感知器）**: 正常系2件（TC-011、TC-012）、失敗系1件（TC-013）。件数が近いため再導出し、静的 locale の失敗源が欠落・空値・parity・placeholder・raw fallback に限られることを確認した。

## S5: deleteBranch not fully merged 説明の日本語4キー

> Origin: Feature 055-01 (light-spec-plan)
> Added: 2026-08-23
> Status: superseded
> Superseded By: S7
> Supersedes: -
> Signature: 追加キー集合 `error.deleteBranchNotFullyMerged.summary` / `error.deleteBranchNotFullyMerged.reason` / `error.deleteBranchNotFullyMerged.guidance` / `dialog.originalGitOutput`
> Target Path: `l10n/web/web.l10n.ja.json`
> Test File: `tests/web/i18n.test.ts`

`deleteBranch` の `not fully merged` 説明ダイアログに使う4キーが ja bundle に追加され、値が確定仕様の固定文言（`notes/features/055/01/memo-確定仕様.md` §4.4 の日本語列）と完全一致することを検証する。キーの利用分岐は `web/messageHandler-test/01-basic-responses-01.md` S16 と `web/dialogs-test.md` S7 の責務であり、`web/i18n.ts` の `t()` 分岐は本セクションに含めない。

| Case ID | Input / Precondition                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                        | Notes                                          |
| ------- | ------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| TC-014  | ja bundle から上記4キーを読み込む                       | Normal - 固定4値                                                           | 4キーがすべて存在し、各値が memo-確定仕様 §4.4 の日本語4値と `toBe` で完全一致し（完全一致により非空も担保）、各値から `{数字}` 形式の placeholder を抽出した結果が空で、各値がキー文字列そのものと一致しない（raw key fallback 不在） | 断定表現を避けた固定文言。未翻訳の素通しを検出 |
| TC-015  | ja / en 両 bundle を読み込み、上記4キーの集合を比較する | Validation - locale parity                                                 | en bundle に欠落しているキーが0件である（ja 4キー集合との差集合が空）                                                                                                                                                                  | 片 locale だけの追加を検出                     |

### 失敗源インベントリ（include-or-justify）— Feature 055-01 追加分（S5）

| 失敗源                                                  | 対応ケースまたは除外理由                                                                            |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| ja 側のキー欠落・固定文言からの drift                   | TC-014                                                                                              |
| 空文字の訳値                                            | TC-014（固定値との完全一致で担保）                                                                  |
| placeholder の混入（4キーは placeholder なし）          | TC-014                                                                                              |
| 未翻訳（キー文字列がそのまま値になる raw key fallback） | TC-014                                                                                              |
| 片 locale だけの追加（parity 崩れ）                     | TC-015（en 側は `web.l10n.en.json-test.md` TC-013 と対で担保）                                      |
| キーの利用分岐の欠落                                    | excluded(`web/messageHandler-test/01-basic-responses-01.md` S16 と `web/dialogs-test.md` S7 で担保) |
| 境界値（0 / minimum / maximum / +/-1 / NULL）           | excluded(静的 JSON に数値境界が存在しない。empty は TC-014 の固定値完全一致で充足)                  |
| 外部依存の失敗・例外送出                                | excluded(bundle は静的データで外部依存も throw 経路も持たない)                                      |
| 不正な型・形式                                          | excluded(値は JSON string で型分岐が存在しない)                                                     |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-015
- Exception: excluded(JSON 読み込みの失敗はテスト基盤で検出され、bundle 自体に例外分岐はない)
- External: excluded(外部依存なし)
- Boundary: excluded(数値境界が存在しない。empty は TC-014 の固定値完全一致で充足)
- Type: excluded(値は JSON string で型分岐が存在しない)

**失敗系/正常系比（煙感知器）**: 正常系1件（TC-014）、失敗系1件（TC-015）。件数が同数のため再導出したが、静的 JSON データの失敗源は欠落・drift・空値・placeholder・raw fallback・parity に限られ、上表のとおりすべて充足されていることを確認した。

## S6: branch cleanup panel の日本語キー集合

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: 追加キー集合: panel title / comparison / 列名 / known・unknown・notSelected 状態 / loading・error・empty / show・delete action（キー名は Task 4 実装時に確定）
> Target Path: `l10n/web/web.l10n.ja.json`
> Test File: `tests/web/i18n.test.ts`

branch cleanup panel の表示に使う日本語キー集合が ja bundle へ en と同じ集合で追加されていることを検証する（対応プラン §4 Task 4 実装内容 7）。キーの利用分岐は `web/branchCleanupPanel-test.md` S3 の責務。

| Case ID | Input / Precondition                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                        | Notes                      |
| ------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| TC-016  | ja bundle から panel キー集合の全キーを読み込む                       | Normal - キー集合の存在                                                    | 全キーが存在し、各値が非空（`length > 0`）の日本語文字列である                                                         | 集合は Task 4 実装で確定   |
| TC-017  | ja bundle の panel キー全値をキー文字列と比較する                     | Normal - raw key fallback 不在                                             | いずれの値もキー文字列そのものと一致せず、unknown 用と notSelected 用の値が互いに一致しない                            | 未翻訳・同一値化を検出     |
| TC-018  | ja / en 両 bundle を読み込み、panel キー集合と placeholder を比較する | Validation - locale parity                                                 | en bundle に欠落しているキーが 0 件で（双方向の差集合が空）、placeholder を含むキーは `{N}` 集合が両 locale で一致する | 片 locale だけの追加を検出 |

### 失敗源インベントリ（include-or-justify）— Feature 055-03 追加分（S6）

| 失敗源                                                     | 対応ケースまたは除外理由                                                     |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| ja 側のキー欠落・空値                                      | TC-016                                                                       |
| 未翻訳（raw key fallback）・unknown / notSelected 同一値化 | TC-017                                                                       |
| 片 locale だけの追加 / placeholder 不一致                  | TC-018（en 側は `web.l10n.en.json-test.md` S5 TC-016 と対で担保）            |
| キーの利用分岐の欠落                                       | excluded(`web/branchCleanupPanel-test.md` S3 の責務)                         |
| 境界値（0 / minimum / maximum / +/-1 / NULL）              | excluded(静的 JSON に数値境界が存在しない。empty は TC-016 の非空検証で充足) |
| 外部依存の失敗・例外送出                                   | excluded(bundle は静的データで外部依存も throw 経路も持たない)               |
| 不正な型・形式                                             | excluded(値は JSON string で型分岐が存在しない)                              |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-018
- Exception: excluded(JSON 読み込みの失敗はテスト基盤で検出され、bundle 自体に例外分岐はない)
- External: excluded(外部依存なし)
- Boundary: excluded(数値境界が存在しない。empty は TC-016 の非空検証で充足)
- Type: excluded(値は JSON string で型分岐が存在しない)
- Normal: TC-016、TC-017

**失敗系/正常系比（煙感知器）**: 正常系2件（TC-016、TC-017）、失敗系1件（TC-018）。差1のためインベントリを再導出したが、静的 locale の失敗源は欠落・空値・raw fallback・同一値化・parity・placeholder に限られることを確認した。

## S7: deleteBranch not fully merged 説明の日本語固定値（055-03 改訂）

> Origin: Feature 055-03 follow-up
> Added: 2026-08-29
> Status: active
> Supersedes: S5
> Signature: 更新キー `error.deleteBranchNotFullyMerged.summary` / `error.deleteBranchNotFullyMerged.reason`（不変キー `error.deleteBranchNotFullyMerged.guidance` / `dialog.originalGitOutput` を含む4キー集合）
> Target Path: `l10n/web/web.l10n.ja.json`
> Test File: `tests/web/i18n.test.ts`

`not fully merged` 説明の summary / reason を、upstream と upstream 未設定時の現在ブランチの条件関係、パネル比較先との差を説明する固定文言（対応プラン §3.3 の日本語列）へ改訂する契約。S5 の「055-01 確定仕様 §4.4 との完全一致」を本 section の固定値へ置き換えるため replacement とする。guidance と `dialog.originalGitOutput` は 055-01 の値から変更しない。キーの利用分岐は `web/messageHandler-test/01-basic-responses-01.md` S16 と `web/dialogs-test.md` S7 の責務。

| Case ID | Input / Precondition                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                       | Notes                             |
| ------- | ------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| TC-019  | ja bundle から上記4キーを読み込む                       | Normal - 改訂後の固定4値                                                   | summary / reason が対応プラン §3.3 の日本語固定値と `toBe` で完全一致し、guidance と `dialog.originalGitOutput` が 055-01 確定仕様 §4.4 の既存日本語値と `toBe` で完全一致し（変更なしを固定）、4値から `{数字}` 形式 placeholder を抽出した結果が空で、各値がキー文字列そのものと一致しない（raw key fallback 不在） | 値の drift と不変キーの改変を検出 |
| TC-020  | ja / en 両 bundle を読み込み、上記4キーの集合を比較する | Validation - locale parity                                                 | en bundle に欠落しているキーが0件である（ja 4キー集合との差集合が空）                                                                                                                                                                                                                                                 | 片 locale だけの改訂を検出        |

### 失敗源インベントリ（include-or-justify）— Feature 055-03 follow-up 追加分（S7）

| 失敗源                                                  | 対応ケースまたは除外理由                                                                            |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| summary / reason の改訂漏れ・固定値からの drift         | TC-019                                                                                              |
| guidance / `dialog.originalGitOutput` の誤改変          | TC-019（既存固定値との完全一致で担保）                                                              |
| 空文字の訳値・placeholder の混入                        | TC-019（固定値完全一致と placeholder 抽出空で担保)                                                  |
| 未翻訳（キー文字列がそのまま値になる raw key fallback） | TC-019                                                                                              |
| 片 locale だけの改訂（parity 崩れ）                     | TC-020（en 側は `web.l10n.en.json-test.md` S6 TC-018 と対で担保）                                   |
| キーの利用分岐の欠落                                    | excluded(`web/messageHandler-test/01-basic-responses-01.md` S16 と `web/dialogs-test.md` S7 で担保) |
| 境界値（0 / minimum / maximum / +/-1 / NULL）           | excluded(静的 JSON に数値境界が存在しない。empty は TC-019 の固定値完全一致で充足)                  |
| 外部依存の失敗・例外送出                                | excluded(bundle は静的データで外部依存も throw 経路も持たない)                                      |
| 不正な型・形式                                          | excluded(値は JSON string で型分岐が存在しない)                                                     |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-020
- Exception: excluded(JSON 読み込みの失敗はテスト基盤で検出され、bundle 自体に例外分岐はない)
- External: excluded(外部依存なし)
- Boundary: excluded(数値境界が存在しない。empty は TC-019 の固定値完全一致で充足)
- Type: excluded(値は JSON string で型分岐が存在しない)
- Normal: TC-019

**失敗系/正常系比（煙感知器）**: 正常系1件（TC-019）、失敗系1件（TC-020）。件数が同数のため再導出したが、静的 JSON データの失敗源は drift・誤改変・空値・placeholder・raw fallback・parity に限られ、上表のとおりすべて充足されていることを確認した。

## S8: 比較先自動解決 label の日本語キー

> Origin: Feature 055-03 follow-up
> Added: 2026-08-29
> Status: active
> Supersedes: -
> Signature: 追加キー `cleanup.comparison.autoResolved`（値 `自動 ({0})`、placeholder 集合 `{0}`）
> Target Path: `l10n/web/web.l10n.ja.json`
> Test File: `tests/web/i18n.test.ts`

比較先ドロップダウンの auto option へ解決済み branch 名を埋め込む新キー `cleanup.comparison.autoResolved` が ja bundle に追加され、値が対応プラン §3.3 の固定値と完全一致することを検証する additive section。キーの利用分岐（自動／明示・loaded／loading／failed の label 決定）は `web/branchCleanupPanel-test.md` S5 の責務。

| Case ID | Input / Precondition                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                   | Notes                         |
| ------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| TC-021  | ja bundle から `cleanup.comparison.autoResolved` を読み込む               | Normal - 新キーの固定値                                                    | キーが存在し、値が `自動 ({0})` と `toBe` で完全一致し、値から抽出した `{数字}` 形式 placeholder 集合が `{0}` のみで、値がキー文字列そのものと一致しない（raw key fallback 不在） | 完全一致により非空も担保      |
| TC-022  | ja / en 両 bundle を読み込み、当該キーの存在と placeholder 集合を比較する | Validation - locale parity                                                 | en bundle に `cleanup.comparison.autoResolved` が存在し（欠落0件）、placeholder 集合が両 locale とも `{0}` で一致する                                                             | 片 locale / placeholder drift |

### 失敗源インベントリ（include-or-justify）— Feature 055-03 follow-up 追加分（S8）

| 失敗源                                                  | 対応ケースまたは除外理由                                                           |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| ja 側のキー欠落・固定値からの drift                     | TC-021                                                                             |
| placeholder の欠落・過剰（`{0}` 以外の混入）            | TC-021                                                                             |
| 未翻訳（キー文字列がそのまま値になる raw key fallback） | TC-021                                                                             |
| 片 locale だけの追加 / placeholder 不一致               | TC-022（en 側は `web.l10n.en.json-test.md` S7 TC-020 と対で担保）                  |
| キーの利用分岐の欠落                                    | excluded(`web/branchCleanupPanel-test.md` S5 の責務)                               |
| 境界値（0 / minimum / maximum / +/-1 / NULL）           | excluded(静的 JSON に数値境界が存在しない。empty は TC-021 の固定値完全一致で充足) |
| 外部依存の失敗・例外送出                                | excluded(bundle は静的データで外部依存も throw 経路も持たない)                     |
| 不正な型・形式                                          | excluded(値は JSON string で型分岐が存在しない)                                    |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-022
- Exception: excluded(JSON 読み込みの失敗はテスト基盤で検出され、bundle 自体に例外分岐はない)
- External: excluded(外部依存なし)
- Boundary: excluded(数値境界が存在しない。empty は TC-021 の固定値完全一致で充足)
- Type: excluded(値は JSON string で型分岐が存在しない)
- Normal: TC-021

**失敗系/正常系比（煙感知器）**: 正常系1件（TC-021）、失敗系1件（TC-022）。件数が同数のため再導出したが、単一キーの静的 locale の失敗源は欠落・drift・placeholder・raw fallback・parity に限られ、上表のとおり充足されていることを確認した。
