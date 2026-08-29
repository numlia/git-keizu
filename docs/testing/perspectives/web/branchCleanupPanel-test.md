# テスト観点表: web/branchCleanupPanel.ts

> Source: `web/branchCleanupPanel.ts`
> Generated: 2026-08-25T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Storage Mode: single-file

## S1: 開閉と request lifecycle（toggle / refresh / selectRepository / requestId）

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `BranchCleanupPanel.toggle(repo: string)` / `refresh(repo: string)` / `selectRepository(repo: string)` / `isOpen(): boolean`
> Target Path: `web/branchCleanupPanel.ts`（open / closed・request 生成。実装後に行範囲へ更新）
> Test File: `tests/web/branchCleanupPanel.test.ts`

panel が open / closed・current repo・selected comparison・latest request・requestId を private state として所有し、requestId を 1 から単調増加させる契約（対応プラン §3.3）。graph の内部 state と削除 dialog 本文は `web/main-test/09-branch-cleanup-01.md` / `web/refMenu-test/01-branch-actions-01.md` の責務で本表には含めない。

| Case ID | Input / Precondition                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                            | Notes                      |
| ------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| TC-001  | closed 状態で `toggle("/repo")` を呼ぶ                                                     | Normal - open と初回 request                                               | `isOpen()` が `true` になり、loading 表示が描画され、`sendMessage` が `{ command: "loadBranchCleanup", repo: "/repo", requestId: 1, compareBranch: null }` で 1 回呼ばれる | requestId は 1 から        |
| TC-002  | open 後に `refresh("/repo")` を 2 回呼ぶ                                                   | Normal - requestId 単調増加                                                | 送信された 3 request の `requestId` が `1`、`2`、`3` と単調増加し、再利用されない                                                                                          | -                          |
| TC-003  | open 状態で `toggle("/repo")` を呼ぶ                                                       | Normal - close                                                             | `isOpen()` が `false` になり、行操作 button が DOM から除去され、latest request が無効化される                                                                             | close 後応答は S2 TC-013   |
| TC-004  | open 状態で `refresh("/repo")` を呼ぶ                                                      | Normal - open 中の再要求                                                   | `sendMessage` が新しい `requestId` の request 1 件で呼ばれる                                                                                                               | -                          |
| TC-005  | closed 状態で `refresh("/repo")` を呼ぶ                                                    | Boundary - close 中の refresh                                              | `sendMessage` の call count が 0 である（追加 message 0 件）                                                                                                               | close 中は要求を生成しない |
| TC-006  | 比較先を選択済みの open 状態で `selectRepository("/other")` を呼ぶ                         | Normal - repository 切替で selection 破棄                                  | 以後の request の `compareBranch` が `null` に戻り、request の `repo` が `"/other"` になる                                                                                 | 反例: repo 切替            |
| TC-007  | 比較先 `develop` を選択済みの open 状態で `refresh("/repo")` を呼ぶ                        | Normal - 同一 repository では selection 維持                               | 再要求の `compareBranch` が `"develop"` のまま送られる                                                                                                                     | -                          |
| TC-008  | requestId が正の safe integer の上限に達した状態（test で状態を注入）で `refresh("/repo")` | Boundary - requestId 枯渇                                                  | `sendMessage` の call count が 0 で、取得失敗表示が描画される（wrap して再利用しない）                                                                                     | §3.3 の枯渇契約            |
| TC-009  | open 状態で比較先を `feature/x` へ変更する                                                 | Normal - comparison 変更                                                   | loading 表示が先に描画され、`sendMessage` が `compareBranch: "feature/x"` の request 1 件で呼ばれる                                                                        | loading 先行               |

### 失敗源インベントリ（include-or-justify）— Feature 055-03 追加分（S1）

| 失敗源                                                | 対応ケースまたは除外理由                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------- |
| close 中・close 後の要求生成                          | TC-005                                                                                |
| requestId の再利用・非単調                            | TC-002                                                                                |
| requestId 枯渇時の wrap / 送信                        | TC-008                                                                                |
| repo 切替で selection が残る                          | TC-006                                                                                |
| 同一 repo refresh で selection が消える               | TC-007                                                                                |
| loading を描画せずに要求だけ送る                      | TC-001、TC-009（loading 先行を検証）                                                  |
| 応答の鮮度・検証の失敗源                              | excluded(S2 の責務)                                                                   |
| 例外・エラー経路                                      | excluded(lifecycle method に throw 分岐がなく、失敗は表示状態として S2 / S3 で検証)   |
| 外部依存×失敗モード                                   | excluded(Git 失敗は host / DataSource owner の責務。panel は response union を受ける) |
| 境界値（0 / minimum / maximum / +/-1 / NULL / empty） | excluded(数値入力は requestId のみで、初期値 1 は TC-001、上限枯渇は TC-008 で充足)   |
| 不正な型・フォーマット                                | excluded(response の runtime validation は S2 の責務)                                 |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(lifecycle 側に検証分岐がなく、検証は S2 の責務)
- Exception: excluded(throw 経路なし)
- External: excluded(外部依存なし)
- Boundary: TC-005、TC-008
- Type: excluded(S2 の責務)
- Normal: TC-001〜TC-004、TC-006、TC-007、TC-009

**失敗系/正常系比（煙感知器）**: 正常系7件（TC-001〜TC-004、TC-006、TC-007、TC-009）、失敗系2件（TC-005、TC-008）。lifecycle の失敗源（stale 応答・malformed row・close 後応答）は S2 へ割り当て済みで、本 section は状態遷移の正常系が主となる構造であることをインベントリ再導出で確認した。

## S2: handleResponse() の runtime validation と応答鮮度

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `BranchCleanupPanel.handleResponse(response: ResponseLoadBranchCleanup): void`
> Target Path: `web/branchCleanupPanel.ts`（response validation。実装後に行範囲へ更新）
> Test File: `tests/web/branchCleanupPanel.test.ts`

response と全 row field を `unknown` から runtime validate し、最新正の safe integer ID・repo・open state が一致する応答だけ描画する契約（対応プラン §3.1 / §3.3）。最新 valid 応答の error / malformed は panel failure、stale / 別 repo / close 後は DOM を変更せず無視する。

| Case ID | Input / Precondition                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                | Notes                   |
| ------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------- |
| TC-010  | 最新 request と repo / requestId が一致する `kind: "ok"` の応答（valid row 2 件） | Normal - 最新 valid 応答の描画                                             | loading 表示が消え、行が 2 件描画される                                        | -                       |
| TC-011  | request A（id=1）→ request B（id=2）の後、B の応答 → A の応答の順で受信           | Validation - A/B 逆順応答                                                  | B の応答だけが描画され、A の応答受信で DOM が変化しない（描画内容が B のまま） | 反例: 逆順応答          |
| TC-012  | 最新 requestId だが `repo` が current repo と異なる応答                           | Validation - 別 repository の応答                                          | DOM が変化しない（無視。failure 表示もしない）                                 | 反例: repo 切替後の応答 |
| TC-013  | open → request 送信 → close の後、当該 requestId の応答を受信                     | Validation - close 後の応答                                                | DOM が変化せず、行・操作 button が描画されない                                 | 反例: close 後応答      |
| TC-014  | 最新 requestId の応答だが row の `ancestry` が `"safe"`（union 外）               | Validation - malformed row                                                 | 行が 0 件、削除 button が 0 件で、panel の取得失敗表示が描画される             | 反例: invalid row       |
| TC-015  | 最新 requestId の `kind: "error", status: "fatal"` 応答                           | Exception - 全体 error 応答                                                | 取得失敗表示が描画され、行が 0 件になる                                        | error union の表示      |
| TC-016  | `result.rows` が配列でない・row が object でない応答（`unknown` 経由で注入）      | Type - 構造不正の応答                                                      | 行が 0 件で取得失敗表示が描画される（例外を送出しない）                        | runtime validation      |
| TC-017  | `requestId` が文字列 `"2"` の応答（最新は 2）                                     | Type - requestId 型不正                                                    | DOM が変化しない（数値へ暗黙変換して最新扱いしない）                           | 厳密一致                |

### 失敗源インベントリ（include-or-justify）— Feature 055-03 追加分（S2）

| 失敗源                                                | 対応ケースまたは除外理由                                                                     |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 逆順・stale 応答の描画                                | TC-011                                                                                       |
| repository 切替後の応答の描画                         | TC-012                                                                                       |
| close 後の応答の描画                                  | TC-013                                                                                       |
| malformed row / 構造不正の受理                        | TC-014、TC-016                                                                               |
| 全体 error の握り潰し（描画継続）                     | TC-015                                                                                       |
| requestId の暗黙型変換                                | TC-017                                                                                       |
| 最新 valid 応答の誤無視                               | TC-010                                                                                       |
| 外部依存×失敗モード                                   | excluded(Git 失敗は error union として届く。発生源は dataSource owner S48 の責務)            |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL） | excluded(数値入力は requestId のみで S1 TC-001 / TC-008 の責務。空 rows は S3 TC-024 で充足) |
| 型契約（compile time）                                | excluded(`src/types-test.md` S8 の責務。本 section は runtime validation を担う)             |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-011〜TC-014
- Exception: TC-015
- External: excluded(外部依存なし)
- Boundary: excluded(数値・空境界は S1 / S3 の責務)
- Type: TC-016、TC-017
- Normal: TC-010

**失敗系/正常系比（煙感知器）**: 正常系1件（TC-010）、失敗系7件（TC-011〜TC-017）、比7.0。検証・鮮度の section であり失敗系が支配的になるのは構造どおり。

## S3: 行描画（union ごとの表示・textContent・日時）

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `BranchCleanupPanel.handleResponse()` の描画経路（createElement / textContent）
> Target Path: `web/branchCleanupPanel.ts`（table 描画。実装後に行範囲へ更新）
> Test File: `tests/web/branchCleanupPanel.test.ts`

table は createElement と textContent で構築し、ancestry / ahead-behind / tree / upstream / worktree / 日時を union variant ごとに明示表示、`unknown` と `notSelected` を別文言にする契約（対応プラン §3.3）。文言キーの存在は l10n owner（`l10n/web/web.l10n.en.json-test.md` S5 / `web.l10n.ja.json-test.md` S6）の責務。

| Case ID | Input / Precondition                                                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                         | Notes                      |
| ------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| TC-018  | 全 fact known の row（ancestor / ahead 1 behind 2 / same / present / used / known / remotes 1 件） | Normal - known 行の表示                                                    | 各セルの `textContent` が対応する l10n 文言・値（ahead/behind 数値、upstream 名、worktree path、remote 名）と一致する   | -                          |
| TC-019  | `ancestry: "unknown"` の行と `ancestry: "notSelected"` の行を同時に描画                            | Normal - unknown / notSelected の文言差                                    | 2 行のセル `textContent` が互いに異なり、それぞれ unknown 用・notSelected 用の l10n 文言と一致する                      | 同じ値へ潰さない           |
| TC-020  | `upstream: { kind: "unset" }` の行と `{ kind: "gone", name: "origin/x" }` の行                     | Normal - upstream unset / gone の表示差                                    | unset 行と gone 行のセル `textContent` が異なり、gone 行は name `origin/x` を含む                                       | -                          |
| TC-021  | `worktree: { kind: "unused" }` の行と `{ kind: "unknown" }` の行                                   | Normal - worktree unused / unknown の表示差                                | 2 行のセル `textContent` が互いに異なる文言になる                                                                       | 失敗を unused と潰さない   |
| TC-022  | `branchName: "x<img>"` の row を描画                                                               | Type - 特殊名の element 化防止                                             | panel 内に `img` element が 0 件で、branch 名セルの `textContent` が `"x<img>"` と `toBe` で一致する                    | 反例: 特殊名               |
| TC-023  | `lastCommit: { kind: "known", unixSeconds: 1724500000 }` の row                                    | Normal - 日時表示                                                          | `getCommitDate(1724500000)` が呼ばれ、その戻り値の value がセルの `textContent` に、title が要素の title 属性に使われる | 既存 dates helper の再利用 |
| TC-024  | `rows: []` の最新 valid 応答                                                                       | Boundary - 0 row                                                           | table の行が 0 件で、empty 用の l10n 文言が `textContent` として描画される                                              | 反例: 0 branch             |
| TC-025  | `rows` が 1 件の最新 valid 応答                                                                    | Boundary - 1 row                                                           | table の行がちょうど 1 件描画される                                                                                     | 反例: 1 branch             |
| TC-026  | `worktree.path` と `upstream.name` に `<b>bold</b>` を含む row                                     | Type - path / upstream の element 化防止                                   | panel 内に `b` element が 0 件で、各セルの `textContent` に入力文字列がそのまま含まれる                                 | innerHTML 不使用           |

### 失敗源インベントリ（include-or-justify）— Feature 055-03 追加分（S3）

| 失敗源                                           | 対応ケースまたは除外理由                                                      |
| ------------------------------------------------ | ----------------------------------------------------------------------------- |
| variant の表示混同（unknown / notSelected など） | TC-019〜TC-021                                                                |
| branch 名・path・upstream の HTML 解釈           | TC-022、TC-026                                                                |
| 0 / 1 行の縮退                                   | TC-024、TC-025                                                                |
| 日時の独自整形（既存 helper の不使用）           | TC-023                                                                        |
| known 値の欠落表示                               | TC-018                                                                        |
| malformed row の描画                             | excluded(S2 TC-014 / TC-016 の責務)                                           |
| 文言キーの欠落・parity                           | excluded(l10n owner S5 / S6 の責務)                                           |
| 例外・エラー経路                                 | excluded(描画は validate 済み row のみを受け取り throw 分岐を持たない)        |
| 外部依存×失敗モード                              | excluded(外部依存なし)                                                        |
| 境界値（0 / minimum / maximum / +/-1 / NULL）    | excluded(数値境界は ahead/behind の表示値のみで TC-018 に含む。0 行は TC-024) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(応答検証は S2 の責務で、描画段に検証分岐がない)
- Exception: excluded(throw 経路なし)
- External: excluded(外部依存なし)
- Boundary: TC-024、TC-025
- Type: TC-022、TC-026
- Normal: TC-018〜TC-021、TC-023

**失敗系/正常系比（煙感知器）**: 正常系5件（TC-018〜TC-021、TC-023）、失敗系4件（TC-022、TC-024〜TC-026）。差1のためインベントリを再導出したが、描画段の失敗源は variant 混同・HTML 解釈・縮退に限られ、検証系の失敗源は S2 へ割り当て済みであることを確認した。

## S4: 行操作の eligibility と callback

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `BranchCleanupPanelActions.showBranch(branchName: string)` / `showDeleteDialog(repo: string, branchName: string, remotes: string[])` と行 button 生成
> Target Path: `web/branchCleanupPanel.ts`（操作可否判定と callback。実装後に行範囲へ更新）
> Test File: `tests/web/branchCleanupPanel.test.ts`

削除操作は「最新 loaded・比較先あり・対象が current でない・対象が比較先でない・worktree unused・全事実 known・remote list known」の全条件を満たす行だけ表示する契約（対応プラン §3.3）。dialog 本文と payload は `web/refMenu-test/01-branch-actions-01.md` S21 の責務。

| Case ID | Input / Precondition                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                          | Notes                    |
| ------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| TC-027  | 全 eligibility 条件を満たす行の delete button をクリック           | Normal - eligible 行の削除操作                                             | 当該行に delete button が 1 件あり、クリックで `actions.showDeleteDialog` が `(repo, branchName, remotes)` の完全一致引数で 1 回呼ばれる | 引数は known remotes     |
| TC-028  | `isCurrent: true` の行                                             | Validation - current 行の除外                                              | 当該行の delete button が 0 件である                                                                                                     | -                        |
| TC-029  | branchName が比較先と一致する行                                    | Validation - 比較先行の除外                                                | 当該行の delete button が 0 件である                                                                                                     | -                        |
| TC-030  | `worktree: { kind: "used", ... }` の行                             | Validation - worktree used の除外                                          | 当該行の delete button が 0 件である                                                                                                     | -                        |
| TC-031  | いずれかの fact が unknown（例: `ancestry: "unknown"`）の行        | Validation - unknown fact の除外                                           | 当該行の delete button が 0 件である                                                                                                     | 全事実 known 条件        |
| TC-032  | `remotes: null` の行                                               | Validation - remote list 不明の除外                                        | 当該行の delete button が 0 件である                                                                                                     | -                        |
| TC-033  | 比較先なし（全行 notSelected）の応答                               | Validation - 比較先なしの全行除外                                          | 全行の delete button が 0 件である                                                                                                       | -                        |
| TC-034  | request 送信直後の loading 表示中                                  | Validation - loading 中の除外                                              | delete button が 0 件である（loading 描画に行操作が含まれない）                                                                          | stale 操作の防止         |
| TC-035  | 任意の行の「グラフで表示」button をクリック（branchName は `a;b`） | Normal - showBranch callback                                               | `actions.showBranch` が `("a;b")` で 1 回呼ばれる（branchName 以外を渡さず、加工しない）                                                 | 特殊名も data として渡す |

### 失敗源インベントリ（include-or-justify）— Feature 055-03 追加分（S4）

| 失敗源                                                | 対応ケースまたは除外理由                                                                  |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| current / 比較先 / worktree used 行への削除表示       | TC-028〜TC-030                                                                            |
| unknown fact / remotes null 行への削除表示            | TC-031、TC-032                                                                            |
| 比較先なし・loading 中の削除表示                      | TC-033、TC-034                                                                            |
| callback 引数の欠落・加工                             | TC-027、TC-035                                                                            |
| stale 応答由来の行操作                                | excluded(S2 TC-011〜TC-013 が stale 応答の非描画を担保し、操作 button は描画行にのみ付く) |
| dialog 本文・payload・defaults の誤り                 | excluded(`web/refMenu-test/01-branch-actions-01.md` S21 の責務)                           |
| graph 側の filter / scroll の誤り                     | excluded(`web/main-test/09-branch-cleanup-01.md` S49 の責務)                              |
| 例外・エラー経路                                      | excluded(callback 呼出のみで throw 経路なし)                                              |
| 外部依存×失敗モード                                   | excluded(外部依存なし)                                                                    |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL） | excluded(数値境界なし。0 行は S3 TC-024、remotes null は TC-032 で充足)                   |
| 不正な型・フォーマット                                | excluded(row の runtime validation は S2 の責務)                                          |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-028〜TC-034
- Exception: excluded(throw 経路なし)
- External: excluded(外部依存なし)
- Boundary: excluded(数値・空境界は S2 / S3 の責務)
- Type: excluded(S2 の責務)
- Normal: TC-027、TC-035

**失敗系/正常系比（煙感知器）**: 正常系2件（TC-027、TC-035）、失敗系7件（TC-028〜TC-034）、比3.5。eligibility の否定分岐を条件ごとに 1 case ずつ置いた構造で、インベントリ由来の導出である。

## S5: syncComparisonOptions() の比較先 label（自動解決値の表示）

> Origin: Feature 055-03 follow-up
> Added: 2026-08-29
> Status: active
> Supersedes: -
> Signature: `BranchCleanupPanel.syncComparisonOptions(): void`
> Target Path: `web/branchCleanupPanel.ts`（syncComparisonOptions()。Task 3 実装後に行範囲へ更新）
> Test File: `tests/web/branchCleanupPanel.test.ts`

自動選択かつ loaded のときだけ `view.compareBranch ?? t("cleanup.state.notSelected")` を `t("cleanup.comparison.autoResolved", resolved)` へ渡して auto option name を作り、明示選択・loading・failed では `t("cleanup.comparison.auto")` を使う契約（対応プラン §3.1 / §3.2）。auto option の value は `COMPARISON_AUTO_VALUE`（空文字）、Request の自動指定は `compareBranch: null` のまま維持する。locale 固定値の正本は l10n owner（`../l10n/web/web.l10n.en.json-test.md` S7 / `../l10n/web/web.l10n.ja.json-test.md` S8）の責務で、本表は表示分岐だけを扱う。

| Case ID | Input / Precondition                                                                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                    | Notes                          |
| ------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| TC-036  | 自動選択（`selectedComparison === null`）で `compareBranch: "main"` の最新 loaded 応答を受信                                  | Normal - 自動解決 label                                                    | auto option の name と dropdown の current 表示 `textContent` が `Automatic (main)` になり、`sendMessage` の request 引数は `compareBranch: null` のまま変化しない | 解決値の表示（主回帰）         |
| TC-037  | 自動選択で `compareBranch: null` の最新 loaded 応答を受信                                                                     | Boundary - null 解決値                                                     | auto option の name が `Automatic (No comparison target)`（`cleanup.state.notSelected` を `{0}` へ埋めた値）と `toBe` で一致し、`Automatic ()` を表示しない        | null と空文字を混同しない      |
| TC-038  | `develop` を明示選択済み（最新 `branchNames` に存在）で `compareBranch: "develop"` の loaded 応答を受信                       | Normal - 明示選択の非混同                                                  | dropdown の current 表示 `textContent` が `develop`、auto option の name が `Automatic`（resolved 形式 `(` を含まない）である                                      | 明示へ resolved label 混入禁止 |
| TC-039  | `feature/x` を選択後、最新 loaded 応答の `branchNames` に `feature/x` が存在しない（`compareBranch: "main"`）                 | Validation - 消失選択の fallback                                           | current 表示が auto option になり、その name の `textContent` が `Automatic (main)` になる                                                                         | 反例: 選択 branch の消失       |
| TC-040  | 自動選択で `compareBranch: "x<img>"` の最新 loaded 応答を受信                                                                 | Type - HTML 風名称の element 化防止                                        | dropdown 内の `img` element が 0 件で、current 表示の `textContent` が `Automatic (x<img>)` と `toBe` で一致する                                                   | escapeHtml 経路のみで描画      |
| TC-041  | 自動選択で request 送信直後（loading 表示中、応答未受信）                                                                     | Normal - loading 中の label                                                | auto option の name と current 表示 `textContent` が `Automatic` で、resolved 形式 `(` を含まない                                                                  | 推測値を表示しない             |
| TC-042  | 自動選択で `compareBranch: "main"` の loaded 表示後、refresh への `kind: "error"` 応答で failed 表示                          | Exception - failed 中の label                                              | auto option の name と current 表示 `textContent` が `Automatic` で、過去の解決値 `main` を含まない                                                                | 反例: 過去値の残留             |
| TC-043  | `compareBranch: "main"` の loaded 表示から同一 repository で `refresh()` を呼び、その後 `compareBranch: "develop"` の最新応答 | Normal - 同一 repository refresh の label 同期                             | 応答前は行表示が維持されたまま current 表示が `Automatic (main)` の旧値で、最新応答受信後に表の再描画と同時に current 表示が `Automatic (develop)` へ更新される    | 表と label の基準一致          |

### 失敗源インベントリ（include-or-justify）— Feature 055-03 follow-up 追加分（S5）

| 失敗源                                                | 対応ケースまたは除外理由                                                                                       |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 明示選択への resolved label 混入                      | TC-038                                                                                                         |
| null 解決値の `Automatic ()` 化（未確定と空文字混同） | TC-037                                                                                                         |
| 消失選択の current 表示継続（fallback 欠落）          | TC-039                                                                                                         |
| branch 名の HTML 解釈（element 化）                   | TC-040                                                                                                         |
| loading / failed での過去値・推測値表示               | TC-041、TC-042                                                                                                 |
| refresh 中の表と label の基準不一致                   | TC-043                                                                                                         |
| 解決値の非表示（常に `Automatic` のまま）             | TC-036                                                                                                         |
| Request payload への解決値の混入                      | TC-036（`compareBranch: null` 維持を mock 引数で検証）                                                         |
| 応答の構造不正・stale                                 | excluded(S2 TC-011〜TC-017 の責務。本 section は validate 済み view からの label 決定のみを扱う)               |
| locale 固定値の drift・parity                         | excluded(l10n owner S7 / S8 の責務)                                                                            |
| 外部依存×失敗モード                                   | excluded(外部依存なし)                                                                                         |
| 境界値（0 / minimum / maximum / +/-1 / empty）        | excluded(数値入力なし。NULL は TC-037、auto value の空文字は `COMPARISON_AUTO_VALUE` 契約として TC-036 で充足) |
| 不正な型・フォーマット                                | excluded(応答の runtime validation は S2 の責務。HTML 風名称は TC-040 で充足)                                  |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-039
- Exception: TC-042
- External: excluded(外部依存なし)
- Boundary: TC-037
- Type: TC-040
- Normal: TC-036、TC-038、TC-041、TC-043

**失敗系/正常系比（煙感知器）**: 正常系4件（TC-036、TC-038、TC-041、TC-043）、失敗系4件（TC-037、TC-039、TC-040、TC-042）。同数のためインベントリを再導出したが、label 決定の失敗源は明示混同・null 混同・消失 fallback・HTML 解釈・loading／failed の過去値表示に限られ、応答検証系の失敗源は S2 へ割り当て済みであることを確認した。
