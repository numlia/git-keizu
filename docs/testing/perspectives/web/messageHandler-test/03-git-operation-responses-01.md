# テスト観点表: web/messageHandler.ts

> Source: `web/messageHandler.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: git-operation-responses

## S12: checkout kind と Push phase の表示・委譲

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-03
> Status: superseded
> Supersedes: S1
> Superseded By: S14
> Signature: `handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void`（`case "checkoutBranch"` / `case "push"`）
> Target Path: `web/messageHandler.ts`（handleMessage switch。実装後に行範囲へ更新）
> Test File: `tests/web/messageHandler.test.ts`

`ResponseCheckoutBranch` を `kind` で、`ResponsePush` を `phase` で分岐させ、`branchExists` / `invalidRef` / `noRemotes` は locale 別の専用 reason を表示し、`selectRemote` は `showPushRemoteDialog()` へ委譲、`completed` は既存 `refreshOrError()` へ渡す変更。旧 S1 は `ResponsePush.status` の単段処理を期待結果として固定していたため supersede し、変更対象外の pull 応答処理は S13 として維持する。翻訳キーの存在は l10n owner（`l10n/web/web.l10n.en.json-test.md` S2 / `web.l10n.ja.json-test.md` S3）、dialog の中身は `web/refMenu-test/01-branch-actions-01.md` S17 の責務。

| Case ID | Input / Precondition                                                                                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                  | Notes                        |
| ------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| TC-036  | `{ command: "checkoutBranch", kind: "branchExists" }`                                                                       | Validation - 既存 branch の表示                                            | `showErrorDialog` が `(t("error.checkoutBranch"), t("error.checkoutBranchExists"), null)` で 1 回呼ばれ、`gitKeizu.refresh` は呼ばれない         | raw 英語 status を出さない   |
| TC-037  | `{ command: "checkoutBranch", kind: "invalidRef" }`                                                                         | Validation - 不正 ref の表示                                               | `showErrorDialog` が `(t("error.checkoutBranch"), t("error.checkoutInvalidRef"), null)` で 1 回呼ばれ、`gitKeizu.refresh` は呼ばれない           | 専用 reason                  |
| TC-038  | `{ command: "checkoutBranch", kind: "completed", status: null }`                                                            | Normal - checkout 成功                                                     | `gitKeizu.refresh(false)` が 1 回呼ばれ、`showErrorDialog` は呼ばれない                                                                          | 既存 refreshOrError 経路     |
| TC-039  | `{ command: "checkoutBranch", kind: "completed", status: "fatal: pathspec" }`                                               | Exception - checkout 失敗                                                  | `showErrorDialog` が `(t("error.checkoutBranch"), "fatal: pathspec", null)` で 1 回呼ばれ、`gitKeizu.refresh` は呼ばれない                       | Git メッセージの表示         |
| TC-040  | `{ command: "push", operationId: "op-1", phase: "selectRemote", remotes: ["origin", "upstream"], defaultRemote: "origin" }` | Normal - 選択の委譲                                                        | `showPushRemoteDialog` が `(repo, "op-1", ["origin", "upstream"], "origin")` で 1 回呼ばれ、`gitKeizu.refresh` と `showErrorDialog` は呼ばれない | 引数を加工しない             |
| TC-041  | `{ command: "push", operationId: "op-1", phase: "noRemotes" }`                                                              | Validation - remote 未登録の表示                                           | `showErrorDialog` が `(t("error.push"), t("error.pushNoRemotes"), null)` で 1 回呼ばれ、`showPushRemoteDialog` は呼ばれない                      | 専用 reason                  |
| TC-042  | `{ command: "push", operationId: "op-1", phase: "completed", status: null }`                                                | Normal - Push 成功                                                         | `gitKeizu.refresh(false)` が 1 回呼ばれ、`showErrorDialog` は呼ばれない                                                                          | soft refresh                 |
| TC-043  | `{ command: "push", operationId: "op-1", phase: "completed", status: "fatal: rejected" }`                                   | Exception - Push 失敗                                                      | `showErrorDialog` が `(t("error.push"), "fatal: rejected", null)` で 1 回呼ばれ、`gitKeizu.refresh` は呼ばれない                                 | 既存 Push error title の維持 |

## S13: pull レスポンス処理の維持

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-03
> Status: active
> Supersedes: -
> Signature: `handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void`（`case "pull"`）
> Target Path: `web/messageHandler.ts`（handleMessage switch の `case "pull"`）
> Test File: `tests/web/messageHandler.test.ts`

旧 S1 が pull と push を 1 セクションで扱っていたため、push 側の supersede に伴って pull の観測点も historical になる。pull 応答の処理は本変更の対象外で挙動を変えないため、既存挙動の維持確認として active のまま引き継ぐ。

| Case ID | Input / Precondition                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                            | Notes                               |
| ------- | ----------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------- |
| TC-044  | `{ command: "pull", status: null }`       | Normal - pull 成功                                                         | `gitKeizu.refresh("soft")` が 1 回呼ばれ、`showErrorDialog` は呼ばれない   | 旧 S1/TC-001 の引き継ぎ（挙動不変） |
| TC-045  | `{ command: "pull", status: "CONFLICT" }` | Exception - pull 失敗                                                      | `showErrorDialog` が `(t("error.pull"), "CONFLICT", null)` で 1 回呼ばれる | 旧 S1/TC-003 の引き継ぎ             |

### 失敗源インベントリ（include-or-justify）— Feature 047 追加分（S12・S13）

| 失敗源                                                        | 対応ケースまたは除外理由                                                                                                                                                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| guard 拒否の表示漏れ（branchExists / invalidRef / noRemotes） | TC-036、TC-037、TC-041                                                                                                                                                                                                         |
| raw 英語 status をそのまま表示する（locale 別 reason の欠落） | TC-036、TC-037、TC-041                                                                                                                                                                                                         |
| Git 失敗の握り潰し（checkout / Push）                         | TC-039、TC-043                                                                                                                                                                                                                 |
| 失敗時に refresh してしまう                                   | TC-036、TC-037、TC-039、TC-043、TC-045                                                                                                                                                                                         |
| phase / kind の取り違え（委譲先の誤り）                       | TC-040、TC-041、TC-042                                                                                                                                                                                                         |
| 各分岐の negative 側（成功時に error を出さない）             | TC-038、TC-042、TC-044                                                                                                                                                                                                         |
| 選択肢・default の加工（host Response との不一致）            | TC-040                                                                                                                                                                                                                         |
| 境界値（`remotes` が空配列）                                  | excluded(空一覧は host が `noRemotes` phase として送るため `selectRemote` の空配列は到達しない。`noRemotes` は TC-041 で検証)                                                                                                  |
| 境界値（0 / minimum / maximum / +/-1 / NULL）                 | excluded(payload は文字列・配列のみで数値境界を持たない。`status: null` は成功契約値として TC-038 / TC-042 / TC-044 で検証)                                                                                                    |
| 外部依存の失敗                                                | excluded(外部依存なし。応答メッセージはテスト側で直接構築する)                                                                                                                                                                 |
| 翻訳キーの欠落                                                | excluded(`l10n/web/web.l10n.en.json-test.md` S2 と `web.l10n.ja.json-test.md` S3 で担保)                                                                                                                                       |
| 不正な型・フォーマット                                        | excluded(応答型は `src/types-test.md` S3 の型契約と TypeScript コンパイルで保証される)                                                                                                                                         |
| operationId の欠落・取り違え                                  | excluded(handler は operationId を dialog へ素通しするだけで判断に使わない。相関の担保は `src/gitGraphView-test/01-message-routing-03.md` S28 TC-120 と `web/refMenu-test/01-branch-actions-01.md` S17 TC-085 / TC-088 の責務) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-036、TC-037、TC-041
- Exception: TC-039、TC-043、TC-045
- External: excluded(外部依存なし)
- Boundary: excluded(数値境界がなく、空一覧は `noRemotes` phase として TC-041 で検証済み)
- Type: excluded(型契約は `src/types-test.md` S3 の責務)

**失敗系/正常系比（煙感知器）**: 正常系4件（TC-038、TC-040、TC-042、TC-044）、失敗系6件（TC-036、TC-037、TC-039、TC-041、TC-043、TC-045）。比は 1.5:1 である。

## S14: checkout kind と Push phase の表示・委譲（Response の repo を使用）

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-04
> Status: superseded
> Supersedes: S12
> Superseded By: S15
> Signature: `handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void`（`case "checkoutBranch"` / `case "push"`）
> Target Path: `web/messageHandler.ts`（handleMessage switch）
> Test File: `tests/web/messageHandler.test.ts`

`ResponsePush` へ `repo` が必須追加されたことに伴い、`selectRemote` phase の委譲先へ渡す repository を `web/refMenu.ts` の module state（`getPendingPushRepo()`）ではなく `msg.repo` から取る変更。S12 は `getPendingPushRepo()` 由来の repository を期待引数としていたため supersede する。checkout 成功時は、Git の取得結果と内部キャッシュが一致していても古い active branch DOM が残らないよう `refresh("forceRender")` で強制再描画する。このモードは hard refresh と異なり、ローディング表示と展開状態の即時リセットを行わない。Push 成功時は従来どおり `refresh("soft")` を維持する。翻訳キーの存在は l10n owner（`l10n/web/web.l10n.en.json-test.md` S2 / `web.l10n.ja.json-test.md` S3）、dialog の中身は `web/refMenu-test/01-branch-actions-01.md` S17 / S19 の責務。

| Case ID | Input / Precondition                                                                                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                       | Notes                        |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| TC-046  | `{ command: "checkoutBranch", kind: "branchExists" }`                                                                                               | Validation - 既存 branch の表示                                            | `showErrorDialog` が `(t("error.checkoutBranch"), t("error.checkoutBranchExists"), null)` で 1 回呼ばれ、`gitKeizu.refresh` は呼ばれない                                                              | S12/TC-036 の引き継ぎ        |
| TC-047  | `{ command: "checkoutBranch", kind: "invalidRef" }`                                                                                                 | Validation - 不正 ref の表示                                               | `showErrorDialog` が `(t("error.checkoutBranch"), t("error.checkoutInvalidRef"), null)` で 1 回呼ばれ、`gitKeizu.refresh` は呼ばれない                                                                | S12/TC-037 の引き継ぎ        |
| TC-048  | `{ command: "checkoutBranch", kind: "completed", status: null }`                                                                                    | Normal - checkout 成功                                                     | `gitKeizu.refresh("forceRender")` が 1 回呼ばれ、`showErrorDialog` は呼ばれない                                                                                                                       | active branch の強制再描画   |
| TC-049  | `{ command: "checkoutBranch", kind: "completed", status: "fatal: pathspec" }`                                                                       | Exception - checkout 失敗                                                  | `showErrorDialog` が `(t("error.checkoutBranch"), "fatal: pathspec", null)` で 1 回呼ばれ、`gitKeizu.refresh` は呼ばれない                                                                            | S12/TC-039 の引き継ぎ        |
| TC-050  | `{ command: "push", repo: "/response/repo", operationId: "op-1", phase: "selectRemote", remotes: ["origin", "upstream"], defaultRemote: "origin" }` | Normal - 選択の委譲                                                        | `showPushRemoteDialog` が `("/response/repo", "op-1", ["origin", "upstream"], "origin")` で 1 回呼ばれる。第1引数が Response の `repo` と一致し、`gitKeizu.refresh` と `showErrorDialog` は呼ばれない | module state を参照しない    |
| TC-051  | `{ command: "push", repo: "/r", operationId: "op-1", phase: "noRemotes" }`                                                                          | Validation - remote 未登録の表示                                           | `showErrorDialog` が `(t("error.push"), t("error.pushNoRemotes"), null)` で 1 回呼ばれ、`showPushRemoteDialog` は呼ばれない                                                                           | S12/TC-041 の引き継ぎ        |
| TC-052  | `{ command: "push", repo: "/r", operationId: "op-1", phase: "completed", status: null }`                                                            | Normal - Push 成功                                                         | `gitKeizu.refresh("soft")` が 1 回呼ばれ、`showErrorDialog` は呼ばれない                                                                                                                              | S12/TC-042 の引き継ぎ        |
| TC-053  | `{ command: "push", repo: "/r", operationId: "op-1", phase: "completed", status: "fatal: rejected" }`                                               | Exception - Push 失敗                                                      | `showErrorDialog` が `(t("error.push"), "fatal: rejected", null)` で 1 回呼ばれ、`gitKeizu.refresh` は呼ばれない                                                                                      | 既存 Push error title の維持 |

### 失敗源インベントリ（include-or-justify）— Feature 047 P3 修正分（S14）

| 失敗源                                                        | 対応ケースまたは除外理由                                                                                                                              |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 委譲先へ別 repository を渡す（module state の混入）           | TC-050（Response の `repo` と第1引数の一致を assert し、他の値が混ざらないことを固定）                                                                |
| guard 拒否の表示漏れ（branchExists / invalidRef / noRemotes） | TC-046、TC-047、TC-051                                                                                                                                |
| raw 英語 status をそのまま表示する（locale 別 reason の欠落） | TC-046、TC-047、TC-051                                                                                                                                |
| Git 失敗の握り潰し（checkout / Push）                         | TC-049、TC-053                                                                                                                                        |
| 失敗時に refresh してしまう                                   | TC-046、TC-047、TC-049、TC-053                                                                                                                        |
| phase / kind の取り違え（委譲先の誤り）                       | TC-050、TC-051、TC-052                                                                                                                                |
| 各分岐の negative 側（成功時に error を出さない）             | TC-048、TC-052                                                                                                                                        |
| checkout 済みでも同値判定で active branch DOM が更新されない  | TC-048（forceRender を要求）。DOM、展開状態、競合時の再描画は `web/main-test/08-request-queue-01.md` S47 TC-270〜TC-276 で担保                        |
| 選択肢・default の加工（host Response との不一致）            | TC-050                                                                                                                                                |
| 境界値（`remotes` が空配列）                                  | excluded(空一覧は host が `noRemotes` phase として送るため `selectRemote` の空配列は到達しない。`noRemotes` は TC-051 で検証)                         |
| 境界値（0 / minimum / maximum / +/-1 / NULL）                 | excluded(payload は文字列・配列のみで数値境界を持たない。`status: null` は成功契約値として TC-048 / TC-052 で検証)                                    |
| 外部依存の失敗                                                | excluded(外部依存なし。応答メッセージはテスト側で直接構築する)                                                                                        |
| 翻訳キーの欠落                                                | excluded(`l10n/web/web.l10n.en.json-test.md` S2 と `web.l10n.ja.json-test.md` S3 で担保)                                                              |
| 不正な型・フォーマット（`repo` 欠落を含む）                   | excluded(応答型は `src/types-test.md` S4 TC-041 の型契約と TypeScript コンパイルで保証される)                                                         |
| operationId の欠落・取り違え                                  | excluded(handler は operationId を dialog へ素通しするだけで判断に使わない。相関の担保は `src/gitGraphView-test/01-message-routing-03.md` S31 の責務) |
| pull 応答処理の巻き込み変更                                   | excluded(S13 TC-044 / TC-045 が挙動不変を担保)                                                                                                        |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-046、TC-047、TC-051
- Exception: TC-049、TC-053
- External: excluded(外部依存なし)
- Boundary: excluded(数値境界がなく、空一覧は `noRemotes` phase として TC-051 で検証済み)
- Type: excluded(型契約は `src/types-test.md` S4 の責務)

**失敗系/正常系比（煙感知器）**: 正常系3件（TC-048、TC-050、TC-052）、失敗系5件（TC-046、TC-047、TC-049、TC-051、TC-053）。比は約 1.7:1 である。

## S15: checkout の 5 kind 表示と Push phase の維持

> Origin: Feature 051 (remote-checkout-pull) (light-spec-plan)
> Added: 2026-08-06
> Status: active
> Supersedes: S14
> Signature: `handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void`（`case "checkoutBranch"` / `case "push"`）
> Target Path: `web/messageHandler.ts`（handleMessage switch の checkout / Push response）
> Test File: `tests/web/messageHandler.test.ts`

S14 の checkout / Push 表示契約を引き継ぎ、remote 不在は専用 locale reason で停止し、checkout 後の pull 失敗は repository state を再描画してから pull error を表示する。menu callback と host result 生成は別 owner の責務。

| Case ID | Input / Precondition                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                          | Notes                       |
| ------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| TC-054  | `{ command: "checkoutBranch", kind: "branchExists" }`                         | Validation - branchExists 表示                                             | `showErrorDialog` が `(t("error.checkoutBranch"), t("error.checkoutBranchExists"), null)` で 1 回、`refresh` は 0 回                                     | S14/TC-046 の引き継ぎ       |
| TC-055  | `{ command: "checkoutBranch", kind: "invalidRef" }`                           | Validation - invalidRef 表示                                               | `showErrorDialog` が `(t("error.checkoutBranch"), t("error.checkoutInvalidRef"), null)` で 1 回、`refresh` は 0 回                                       | S14/TC-047 の引き継ぎ       |
| TC-056  | `{ command: "checkoutBranch", kind: "remoteNotFound" }`                       | Validation - remoteNotFound 表示                                           | `showErrorDialog` が `(t("error.checkoutBranch"), t("error.checkoutRemoteNotFound"), null)` で 1 回、`refresh` は 0 回                                   | 専用 locale reason          |
| TC-057  | `{ command: "checkoutBranch", kind: "completed", status: null }`              | Normal - checkout 成功                                                     | `gitKeizu.refresh("forceRender")` が 1 回、`showErrorDialog` は 0 回                                                                                     | S14/TC-048 の引き継ぎ       |
| TC-058  | `{ command: "checkoutBranch", kind: "completed", status: "fatal: pathspec" }` | Exception - checkout 失敗                                                  | `showErrorDialog` が `(t("error.checkoutBranch"), "fatal: pathspec", null)` で 1 回、`refresh` は 0 回                                                   | S14/TC-049 の引き継ぎ       |
| TC-059  | `{ command: "checkoutBranch", kind: "pullFailed", status: "CONFLICT" }`       | Exception - pull 部分成功                                                  | `gitKeizu.refresh("forceRender")` と `showErrorDialog(t("error.pull"), "CONFLICT", null)` が各 1 回、この順で呼ばれる。checkout error title は使われない | current branch を先に再描画 |
| TC-060  | repo 付き Push `selectRemote` response                                        | Normal - Push 選択の委譲                                                   | `showPushRemoteDialog` が `(msg.repo, msg.operationId, msg.remotes, msg.defaultRemote)` で 1 回、`refresh` / error dialog は 0 回                        | S14/TC-050 の引き継ぎ       |
| TC-061  | repo 付き Push `noRemotes` response                                           | Validation - Push remote 未登録                                            | `showErrorDialog` が `(t("error.push"), t("error.pushNoRemotes"), null)` で 1 回、dialog は 0 回                                                         | S14/TC-051 の引き継ぎ       |
| TC-062  | repo 付き Push completed/null response                                        | Normal - Push 成功                                                         | `gitKeizu.refresh("soft")` が 1 回、error dialog は 0 回                                                                                                 | S14/TC-052 の引き継ぎ       |
| TC-063  | repo 付き Push completed/`"fatal: rejected"` response                         | Exception - Push 失敗                                                      | `showErrorDialog` が `(t("error.push"), "fatal: rejected", null)` で 1 回、`refresh` は 0 回                                                             | S14/TC-053 の引き継ぎ       |

### 失敗源インベントリ（include-or-justify）— Feature 051 追加分（S15）

| 失敗源                                                | 対応ケースまたは除外理由                                                                                               |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| checkout guard kind の表示漏れ                        | TC-054〜TC-056                                                                                                         |
| remoteNotFound で refresh / Git status を表示         | TC-056                                                                                                                 |
| completed failure の握り潰し / 誤 refresh             | TC-058                                                                                                                 |
| pullFailed で current branch の再描画を省略           | TC-059                                                                                                                 |
| pullFailed の error title / status / 呼出順序の誤り   | TC-059                                                                                                                 |
| Push phase の既存経路巻き込み                         | TC-060〜TC-063                                                                                                         |
| 各分岐の negative 側（成功時に error を表示）         | TC-057、TC-062                                                                                                         |
| locale key 欠落                                       | excluded(`l10n/web/web.l10n.en.json-test.md` S3 / `web.l10n.ja.json-test.md` S4 の責務)                                |
| payload field 欠落・未知 kind                         | excluded(`src/types-test.md` S6 の責務)                                                                                |
| menu callback / host result 生成                      | excluded(`web/refMenu-test/01-branch-actions-01.md` S20 / `src/gitGraphView-test/01-message-routing-03.md` S32 の責務) |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL） | excluded(payload は文字列と union で数値境界を持たない。`status: null` は TC-057 / TC-062 で検証)                      |
| 外部依存の失敗                                        | excluded(応答 message はテスト側で直接構築し、Git failure は DataSource owner の責務)                                  |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-054、TC-055、TC-056、TC-061
- Exception: TC-058、TC-059、TC-063
- External: excluded(外部依存なし)
- Boundary: excluded(数値境界がなく、`null` は TC-057 / TC-062 で正常契約として検証)
- Type: excluded(`src/types-test.md` S6 の責務)

**失敗系/正常系比（煙感知器）**: 正常系3件（TC-057、TC-060、TC-062）、失敗系7件（残り）。比は約 2.3:1 で、5 checkout kind と既存 Push phase の分岐から導出した結果である。
