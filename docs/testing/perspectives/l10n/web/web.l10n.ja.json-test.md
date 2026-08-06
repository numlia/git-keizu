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
