# テスト観点表: l10n/web/web.l10n.en.json

> Source: `l10n/web/web.l10n.en.json`
> Generated: 2026-07-19T09:52:44+09:00
> Language: JSON (l10n bundle)
> Test Framework: Vitest
> Storage Mode: single-file

## S1: worktree 操作エラーの英語翻訳キー (Feature 045)

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Target Path: `l10n/web/web.l10n.en.json`
> Test File: `tests/web/i18n.test.ts`

worktree の Open/Reveal 失敗表示に使う専用エラーキー `error.openWorktreeInNewWindow` / `error.revealWorktreeInOS` が en bundle に追加されていることを検証する。キーの利用分岐（handler の表示条件）は `web/messageHandler-test.md` S11 の責務。

| Case ID | Input / Precondition                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                          | Notes                     |
| ------- | --------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------- |
| TC-001  | en bundle から `error.openWorktreeInNewWindow` を読み込み | Normal - new key                                                           | キーが存在し、値が非空（`length > 0`）の英語文字列である | Open 失敗の専用キー追加   |
| TC-002  | en bundle から `error.revealWorktreeInOS` を読み込み      | Normal - new key                                                           | キーが存在し、値が非空（`length > 0`）の英語文字列である | Reveal 失敗の専用キー追加 |

### 失敗源インベントリ（include-or-justify）— Feature 045 追加分（S1）

| 失敗源                                  | 対応ケースまたは除外理由                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| en 側のキー欠落（片 locale のみの追加） | TC-001、TC-002（ja 側は `web.l10n.ja.json-test.md` TC-003〜TC-004 と対で担保） |
| 空文字の訳値                            | TC-001、TC-002（非空検証を含む）                                               |
| キーの利用分岐の欠落                    | excluded(`web/messageHandler-test.md` S11 TC-033/TC-035 で担保)                |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(JSON bundle は静的データで検証分岐が存在しない。欠落・空値の検出は TC-001/TC-002 の存在・非空検証に含まれる)
- Exception: excluded(JSON 読み込みの失敗はビルド/テスト基盤で検出され、bundle 自体に例外分岐はない)
- External: excluded(外部依存なし)
- Boundary: excluded(数値境界が存在しない。empty は TC-001/TC-002 の非空検証で充足)
- Type: excluded(値は JSON string で型分岐が存在しない)

**失敗系/正常系比（煙感知器）**: 正常系2件（TC-001、TC-002）、失敗系0件。静的 JSON データの存在・非空検証のみで実行分岐を持たないため、失敗系0件はインベントリ欠落ではないことを確認した。

## S2: 安全な checkout と Push 先選択の英語翻訳キー (Feature 047)

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-03
> Status: active
> Supersedes: -
> Signature: 追加キー集合 `error.checkoutBranchExists` / `error.checkoutInvalidRef` / `error.pushNoRemotes` / `push.selectRemote` / `push.selectRemoteAction`
> Target Path: `l10n/web/web.l10n.en.json`
> Test File: `tests/web/i18n.test.ts`

remote checkout の拒否理由と二段階 Push の選択 UI に使う 5 キー（`error.checkoutBranchExists` / `error.checkoutInvalidRef` / `error.pushNoRemotes` / `push.selectRemote` / `push.selectRemoteAction`）が en bundle に追加されていることを検証する。キーの利用分岐は `web/messageHandler-test.md` S12 と `web/refMenu-test/01-branch-actions-01.md` S17 の責務。

| Case ID | Input / Precondition                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                          | Notes                         |
| ------- | ------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------- |
| TC-003  | en bundle から `error.checkoutBranchExists` を読み込み | Normal - new key                                                           | キーが存在し、値が非空（`length > 0`）の英語文字列である | 既存 branch の拒否理由        |
| TC-004  | en bundle から `error.checkoutInvalidRef` を読み込み   | Normal - new key                                                           | キーが存在し、値が非空（`length > 0`）の英語文字列である | 不正 ref の拒否理由           |
| TC-005  | en bundle から `error.pushNoRemotes` を読み込み        | Normal - new key                                                           | キーが存在し、値が非空（`length > 0`）の英語文字列である | 登録済み remote なし          |
| TC-006  | en bundle から `push.selectRemote` を読み込み          | Normal - new key                                                           | キーが存在し、値が非空（`length > 0`）の英語文字列である | 選択ダイアログの prompt       |
| TC-007  | en bundle から `push.selectRemoteAction` を読み込み    | Normal - new key                                                           | キーが存在し、値が非空（`length > 0`）の英語文字列である | 選択ダイアログの action label |
| TC-008  | en / ja 両 bundle を読み込み、上記 5 キーの集合を比較  | Validation - locale parity                                                 | ja bundle に欠落しているキーが 0 件である（差集合が空）  | 片 locale だけの追加を検出    |

### 失敗源インベントリ（include-or-justify）— Feature 047 追加分（S2）

| 失敗源                                        | 対応ケースまたは除外理由                                                                                                            |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| en 側のキー欠落                               | TC-003〜TC-007                                                                                                                      |
| 片 locale だけの追加（parity 崩れ）           | TC-008（ja 側は `web.l10n.ja.json-test.md` TC-010 と対で担保）                                                                      |
| 空文字の訳値                                  | TC-003〜TC-007（非空検証を含む）                                                                                                    |
| キーの利用分岐の欠落                          | excluded(`web/messageHandler-test.md` S12 TC-036 / TC-037 / TC-041 と `web/refMenu-test/01-branch-actions-01.md` S17 TC-084 で担保) |
| 境界値（0 / minimum / maximum / +/-1 / NULL） | excluded(静的 JSON に数値境界が存在しない。empty は非空検証で充足)                                                                  |
| 外部依存の失敗・例外送出                      | excluded(bundle は静的データで外部依存も throw 経路も持たない)                                                                      |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-008
- Exception: excluded(JSON 読み込みの失敗はテスト基盤で検出され、bundle 自体に例外分岐はない)
- External: excluded(外部依存なし)
- Boundary: excluded(数値境界が存在しない。empty は TC-003〜TC-007 の非空検証で充足)
- Type: excluded(値は JSON string で型分岐が存在しない)

**失敗系/正常系比（煙感知器）**: 正常系5件（TC-003〜TC-007）、失敗系1件（TC-008）。静的 JSON データの存在・非空検証が中心で実行分岐を持たないため、失敗系が少ないことはインベントリ欠落ではないことを確認した。

## S3: 同名 remote checkout＋pull の英語 prompt / error

> Origin: Feature 051 (remote-checkout-pull) (light-spec-plan)
> Added: 2026-08-06
> Status: active
> Supersedes: -
> Signature: 追加キー `Enter the local branch name for checking out {0}. If a branch with the same name already exists, the selected remote branch will be pulled after checkout:` / `error.checkoutRemoteNotFound`
> Target Path: `l10n/web/web.l10n.en.json`
> Test File: `tests/web/i18n.test.ts`

| Case ID | Input / Precondition                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                         | Notes                                |
| ------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| TC-009  | en bundle から Feature 051 prompt source key を読み込む           | Normal - checkout＋pull prompt                                             | key が存在し、値が非空の英語文字列で `{0}` placeholder をちょうど 1 個含む                              | 同名既存時の pull を説明             |
| TC-010  | en bundle から `error.checkoutRemoteNotFound` を読み込む          | Normal - remote not found error                                            | key が存在し、値が非空（`length > 0`）の英語文字列である                                                | 専用 reason                          |
| TC-011  | en / ja 両 bundle で prompt と error key 集合・placeholder を比較 | Validation - locale parity                                                 | ja bundle で欠落している key が 0 件で、prompt の placeholder 集合が両 locale とも `{0}` だけで一致する | 片 locale / placeholder drift を検出 |

### 失敗源インベントリ（include-or-justify）— Feature 051 追加分（S3）

| 失敗源                                                | 対応ケースまたは除外理由                                                                                                                |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| en prompt key の欠落・空値                            | TC-009                                                                                                                                  |
| en remoteNotFound key の欠落・空値                    | TC-010                                                                                                                                  |
| 片 locale だけの追加 / placeholder 不一致             | TC-011                                                                                                                                  |
| UI での prompt / error 利用分岐                       | excluded(`web/refMenu-test/01-branch-actions-01.md` S20 TC-100 / `web/messageHandler-test/03-git-operation-responses-01.md` S15 の責務) |
| 境界値（0 / minimum / maximum / +/-1 / NULL / empty） | excluded(静的 JSON に数値境界がなく、empty は TC-009 / TC-010 の非空検証で充足)                                                         |
| 外部依存の失敗・例外送出                              | excluded(bundle は静的データで外部依存と throw 経路を持たない)                                                                          |
| 不正な型・形式                                        | excluded(JSON string の型は parse / TypeScript で保証し、placeholder 形式は TC-009 / TC-011 で検証)                                     |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-011
- Exception: excluded(throw 経路なし)
- External: excluded(外部依存なし)
- Boundary: excluded(数値境界なし。empty は TC-009 / TC-010 で検証)
- Type: excluded(bundle 値は string の静的データ)

**失敗系/正常系比（煙感知器）**: 正常系2件（TC-009、TC-010）、失敗系1件（TC-011）。件数が近いため再導出し、静的 locale の失敗源が欠落・空値・parity・placeholder に限られることを確認した。

## S4: deleteBranch not fully merged 説明の英語4キー

> Origin: Feature 055-01 (light-spec-plan)
> Added: 2026-08-23
> Status: active
> Supersedes: -
> Signature: 追加キー集合 `error.deleteBranchNotFullyMerged.summary` / `error.deleteBranchNotFullyMerged.reason` / `error.deleteBranchNotFullyMerged.guidance` / `dialog.originalGitOutput`
> Target Path: `l10n/web/web.l10n.en.json`
> Test File: `tests/web/i18n.test.ts`

`deleteBranch` の `not fully merged` 説明ダイアログに使う4キーが en bundle に追加され、値が確定仕様の固定文言（`notes/features/055/01/memo-確定仕様.md` §4.4 の English 列）と完全一致することを検証する。キーの利用分岐は `web/messageHandler-test/01-basic-responses-01.md` S16 と `web/dialogs-test.md` S7 の責務であり、`web/i18n.ts` の `t()` 分岐は本セクションに含めない。

| Case ID | Input / Precondition                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                           | Notes                                       |
| ------- | ------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| TC-012  | en bundle から上記4キーを読み込む                       | Normal - 固定4値                                                           | 4キーがすべて存在し、各値が memo-確定仕様 §4.4 の英語4値と `toBe` で完全一致し（完全一致により非空も担保）、各値から `{数字}` 形式の placeholder を抽出した結果が空である | 断定表現を避けた固定文言。値の drift を検出 |
| TC-013  | en / ja 両 bundle を読み込み、上記4キーの集合を比較する | Validation - locale parity                                                 | ja bundle に欠落しているキーが0件である（en 4キー集合との差集合が空）                                                                                                     | 片 locale だけの追加を検出                  |

### 失敗源インベントリ（include-or-justify）— Feature 055-01 追加分（S4）

| 失敗源                                         | 対応ケースまたは除外理由                                                                            |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| en 側のキー欠落・固定文言からの drift          | TC-012                                                                                              |
| 空文字の訳値                                   | TC-012（固定値との完全一致で担保）                                                                  |
| placeholder の混入（4キーは placeholder なし） | TC-012                                                                                              |
| 片 locale だけの追加（parity 崩れ）            | TC-013（ja 側は `web.l10n.ja.json-test.md` TC-015 と対で担保）                                      |
| キーの利用分岐の欠落                           | excluded(`web/messageHandler-test/01-basic-responses-01.md` S16 と `web/dialogs-test.md` S7 で担保) |
| 境界値（0 / minimum / maximum / +/-1 / NULL）  | excluded(静的 JSON に数値境界が存在しない。empty は TC-012 の固定値完全一致で充足)                  |
| 外部依存の失敗・例外送出                       | excluded(bundle は静的データで外部依存も throw 経路も持たない)                                      |
| 不正な型・形式                                 | excluded(値は JSON string で型分岐が存在しない)                                                     |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-013
- Exception: excluded(JSON 読み込みの失敗はテスト基盤で検出され、bundle 自体に例外分岐はない)
- External: excluded(外部依存なし)
- Boundary: excluded(数値境界が存在しない。empty は TC-012 の固定値完全一致で充足)
- Type: excluded(値は JSON string で型分岐が存在しない)

**失敗系/正常系比（煙感知器）**: 正常系1件（TC-012）、失敗系1件（TC-013）。件数が同数のため再導出したが、静的 JSON データの失敗源は欠落・drift・空値・placeholder・parity に限られ、上表のとおりすべて充足されていることを確認した。

## S5: branch cleanup panel の英語キー集合

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: 追加キー集合: panel title / comparison / 列名 / known・unknown・notSelected 状態 / loading・error・empty / show・delete action（キー名は Task 4 実装時に確定）
> Target Path: `l10n/web/web.l10n.en.json`
> Test File: `tests/web/i18n.test.ts`

branch cleanup panel の表示に使う英語キー集合（title、comparison、列名、upstream / worktree / comparison の各状態文言、loading / error / empty、show / delete action）が en bundle に追加されていることを検証する（対応プラン §4 Task 4 実装内容 7）。キーの利用分岐は `web/branchCleanupPanel-test.md` S3 の責務。`unknown` と `notSelected` の文言が同一値にならないことは表示側 TC-019 と対で、bundle 側でも値の相異を検証する。

| Case ID | Input / Precondition                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                  | Notes                           |
| ------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------- |
| TC-014  | en bundle から panel キー集合の全キーを読み込む                       | Normal - キー集合の存在                                                    | 全キーが存在し、各値が非空（`length > 0`）の英語文字列である                                     | 集合は Task 4 実装で確定        |
| TC-015  | en bundle の unknown 用文言と notSelected 用文言を比較する            | Normal - 状態文言の相異                                                    | unknown 用と notSelected 用の値が互いに一致しない（同一文言へ潰していない）                      | §3.2 の区別を bundle 側でも固定 |
| TC-016  | en / ja 両 bundle を読み込み、panel キー集合と placeholder を比較する | Validation - locale parity                                                 | ja bundle に欠落しているキーが 0 件で、placeholder を含むキーは `{N}` 集合が両 locale で一致する | 片 locale / placeholder drift   |

### 失敗源インベントリ（include-or-justify）— Feature 055-03 追加分（S5）

| 失敗源                                        | 対応ケースまたは除外理由                                                     |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| en 側のキー欠落・空値                         | TC-014                                                                       |
| unknown / notSelected 文言の同一値化          | TC-015                                                                       |
| 片 locale だけの追加 / placeholder 不一致     | TC-016（ja 側は `web.l10n.ja.json-test.md` S6 TC-018 と対で担保）            |
| キーの利用分岐の欠落                          | excluded(`web/branchCleanupPanel-test.md` S3 の責務)                         |
| 境界値（0 / minimum / maximum / +/-1 / NULL） | excluded(静的 JSON に数値境界が存在しない。empty は TC-014 の非空検証で充足) |
| 外部依存の失敗・例外送出                      | excluded(bundle は静的データで外部依存も throw 経路も持たない)               |
| 不正な型・形式                                | excluded(値は JSON string で型分岐が存在しない)                              |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-016
- Exception: excluded(JSON 読み込みの失敗はテスト基盤で検出され、bundle 自体に例外分岐はない)
- External: excluded(外部依存なし)
- Boundary: excluded(数値境界が存在しない。empty は TC-014 の非空検証で充足)
- Type: excluded(値は JSON string で型分岐が存在しない)
- Normal: TC-014、TC-015

**失敗系/正常系比（煙感知器）**: 正常系2件（TC-014、TC-015）、失敗系1件（TC-016）。差1のためインベントリを再導出したが、静的 locale の失敗源は欠落・空値・同一値化・parity・placeholder に限られることを確認した。
