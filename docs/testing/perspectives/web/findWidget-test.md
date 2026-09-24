# テスト観点表: web/findWidget.ts

> Source: `web/findWidget.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: FindWidget DOM生成・表示管理

> Origin: Feature 002 (menubar-search-diff) Task 3.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `web/findWidget.ts`

| Case ID | Input / Precondition          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                         | Notes |
| ------- | ----------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----- |
| TC-001  | FindWidget コンストラクタ実行 | Normal - standard                                                          | DOM構造が生成される: 入力欄, Aaトグル, .\*トグル, カウンター, 前/次ボタン, 閉じるボタン | -     |
| TC-002  | show() 呼び出し               | Normal - standard                                                          | ウィジェットが表示状態になり、入力欄にフォーカスが移動する                              | -     |
| TC-003  | close() 呼び出し              | Normal - standard                                                          | ウィジェットが非表示になり、全ハイライトがクリアされる                                  | -     |
| TC-004  | show() 後に isVisible()       | Normal - standard                                                          | true を返す                                                                             | -     |
| TC-005  | close() 後に isVisible()      | Normal - standard                                                          | false を返す                                                                            | -     |

## S2: FindWidget 入力制御

> Origin: Feature 002 (menubar-search-diff) Task 3.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `web/findWidget.ts`

| Case ID | Input / Precondition            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result              | Notes                |
| ------- | ------------------------------- | -------------------------------------------------------------------------- | ---------------------------- | -------------------- |
| TC-006  | setInputEnabled(false)          | Normal - standard                                                          | 入力欄がdisabled状態になる   | データロード前       |
| TC-007  | setInputEnabled(true)           | Normal - standard                                                          | 入力欄がenabled状態になる    | データロード完了後   |
| TC-008  | コミット0件の状態でテキスト入力 | Boundary - zero commits                                                    | マッチなし、カウンター非表示 | disabled状態の可能性 |

## S3: FindWidget 検索マッチング

> Origin: Feature 002 (menubar-search-diff) Task 3.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `web/findWidget.ts`

| Case ID | Input / Precondition                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                        | Notes       |
| ------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ | ----------- |
| TC-009  | テキスト "fix" 入力、コミットメッセージに "fix bug" を含むコミットあり | Normal - standard                                                          | 該当コミット行がハイライトされ、カウンターが更新される | -           |
| TC-010  | テキスト入力、著者名にマッチするコミットあり                           | Normal - standard                                                          | 著者名欄がハイライトされる                             | -           |
| TC-011  | テキスト入力、コミットハッシュ（短縮形）にマッチ                       | Normal - standard                                                          | ハッシュ欄がハイライトされる                           | -           |
| TC-012  | テキスト入力、ブランチ名・タグ名にマッチ                               | Normal - standard                                                          | ブランチ/タグラベル欄がハイライトされる                | -           |
| TC-013  | テキスト入力で3件マッチ                                                | Normal - standard                                                          | カウンターが "1 of 3" と表示される                     | 初期位置は1 |
| TC-014  | テキスト入力でマッチ0件                                                | Boundary - no matches                                                      | カウンターが "No Results" と表示、ハイライトなし       | -           |
| TC-015  | テキスト入力でマッチ1件                                                | Boundary - single match                                                    | カウンターが "1 of 1" と表示される                     | -           |
| TC-016  | 検索テキストを空にクリア                                               | Boundary - empty text                                                      | 全ハイライトが除去され、カウンターが非表示になる       | -           |

## S4: FindWidget 検索オプション

> Origin: Feature 002 (menubar-search-diff) Task 3.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `web/findWidget.ts`

| Case ID | Input / Precondition                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                 | Notes                     |
| ------- | ---------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------- |
| TC-017  | caseSensitive OFF, テキスト "Fix"        | Normal - standard                                                          | "fix", "Fix", "FIX" 全てにマッチ                | デフォルト動作            |
| TC-018  | caseSensitive ON, テキスト "Fix"         | Normal - standard                                                          | "Fix" のみにマッチ、"fix" にはマッチしない      | RegExp iフラグなし        |
| TC-019  | regex ON, テキスト "fix\|feat"           | Normal - standard                                                          | "fix" または "feat" を含むコミットにマッチ      | 正規表現パターン          |
| TC-020  | regex ON, テキスト "[invalid"            | Exception - handled error                                                  | エラー属性が設定され（赤枠）、マッチなし        | RegExp コンストラクタ例外 |
| TC-021  | regex ON, テキスト "(?:)" (ゼロ長マッチ) | Boundary - zero-length                                                     | エラー属性が設定され、マッチがクリアされる      | ReDoS防止                 |
| TC-022  | regex ON, テキスト "(a+)+" (潜在的ReDoS) | Boundary - backtracking                                                    | try-catchで安全に処理される（クラッシュしない） | ReDoS防止                 |

## S5: FindWidget ナビゲーション

> Origin: Feature 002 (menubar-search-diff) Task 3.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `web/findWidget.ts`

| Case ID | Input / Precondition         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                   | Notes      |
| ------- | ---------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------- | ---------- |
| TC-023  | 3件マッチ、位置1、next()     | Normal - standard                                                          | 位置が2に移動し、カウンターが "2 of 3" になる     | -          |
| TC-024  | 3件マッチ、位置1、prev()     | Normal - standard                                                          | 位置が3に循環移動し、カウンターが "3 of 3" になる | 逆方向循環 |
| TC-025  | 3件マッチ、位置3、next()     | Boundary - wrap forward                                                    | 位置が1に循環移動し、カウンターが "1 of 3" になる | 順方向循環 |
| TC-026  | マッチ0件で next()           | Boundary - no matches                                                      | 何も起こらない（エラーにならない）                | -          |
| TC-027  | ナビゲーション後のスクロール | Normal - standard                                                          | scrollToCommit() が呼び出される                   | -          |

## S6: FindWidget 状態永続化

> Origin: Feature 002 (menubar-search-diff) Task 3.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `web/findWidget.ts`

| Case ID | Input / Precondition              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                        | Notes |
| ------- | --------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----- |
| TC-028  | getState() 呼び出し               | Normal - standard                                                          | FindWidgetState オブジェクトを返す（text, currentHash, visible, caseSensitive, regex） | -     |
| TC-029  | restoreState(savedState) 呼び出し | Normal - standard                                                          | 保存した状態が正しく復元される（テキスト、トグル、表示状態）                           | -     |
| TC-030  | restoreState(null)                | Boundary - null state                                                      | デフォルト状態が適用される（エラーにならない）                                         | -     |

## S7: FindWidget デバウンス

> Origin: Feature 002 (menubar-search-diff) Task 3.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `web/findWidget.ts`

| Case ID | Input / Precondition          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                     | Notes              |
| ------- | ----------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------ |
| TC-031  | テキスト入力後200ms経過       | Normal - standard                                                          | 検索が実行される                                                    | SEARCH_DEBOUNCE_MS |
| TC-032  | テキスト入力後100msで別の入力 | Boundary - debounce reset                                                  | 最初の検索はキャンセルされ、新しい入力から200ms後に検索が実行される | -                  |

## S8: stash セレクタ検索の表示文字列照合

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: `findMatches()` 内の stash セレクタ照合（`buildStashSelectorDisplay(commit.stash.selector)` を使用）
> Target Path: `web/findWidget.ts:300-315`

stash の照合値を完全な `commit.stash.selector`（例 `stash@{0}`）から、画面に表示される短縮セレクタ `buildStashSelectorDisplay(selector)`（例 `@{0}`）へ変更する修正。検索対象と行内ハイライト対象を一致させ、「ヒット扱いなのにハイライトが付かない」[15] を解消する。非表示の `stash` 接頭辞は検索対象から除外し、`"stash"` による全 stash の一括検索は廃止する。stash 行の表示生成（アイコン + 短縮セレクタ）は変更しない。

| Case ID | Input / Precondition                                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                     | Notes                            |
| ------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| TC-033  | stash（selector `stash@{0}`、message 等は `stash` を含まない）を表示中、検索語 `stash` | Validation - 非表示接頭辞の非一致                                          | stash 行がマッチに含まれず（カウンター "No Results"）、当該行に `findMatch` span が挿入されない                                                                     | 一括検索の廃止（確定仕様）       |
| TC-034  | 同条件で検索語 `@{0}`                                                                  | Normal - 表示文字列の一致とハイライト                                      | 対象 stash 行がマッチし（カウンター "1 of 1"）、行内の stash セレクタ表示に `findMatch` span が挿入され、`next()` / `prev()` で当該行が現在マッチ枠として維持される | 件数 + ハイライト + 移動         |
| TC-035  | 同条件で検索語 `stash@{0}`（完全セレクタ）                                             | Validation - 完全セレクタの非一致                                          | マッチ0件（カウンター "No Results"）で、`findMatch` span が挿入されない                                                                                             | 完全表示化は行わない（確定仕様） |

## S9: openCdvEnabled の状態保存・復元

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: `getState(): FindWidgetState` / `restoreState(state: FindWidgetState)`（`openCdvEnabled` を追加）
> Target Path: `web/findWidget.ts:236-259` + `web/global.d.ts:123-129`

`FindWidgetState` に optional 互換の `openCdvEnabled` を追加し、`getState()` で boolean を保存する修正。`restoreState()` は `if (!state.visible) return` の早期 return より前に `state.openCdvEnabled === true` で内部値を復元し、`#findOpenCdv` 要素の active class を同期する。旧バージョンの保存 state（フィールド欠落）は false とする（[16] の修正）。`web/global.d.ts` の型追加は typecheck で担保する。

| Case ID | Input / Precondition                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                | Notes                            |
| ------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| TC-036  | open-CDV トグルを ON にした状態で `getState()` を呼ぶ                             | Normal - 状態の保存                                                        | 返却 state の `openCdvEnabled` が `true`（boolean）である（widget の visible/hidden に依存しない）                             | 保存対象への追加                 |
| TC-037  | `{ visible: false, openCdvEnabled: true, ... }` で `restoreState()` を呼ぶ        | Boundary - 非表示 state の復元                                             | visible 早期 return より前に内部値 `true` が復元され、`#findOpenCdv` に active class が付与される（widget 自体は非表示のまま） | 早期 return 前の同期（修正の肝） |
| TC-038  | `{ visible: true, openCdvEnabled: true, ... }` で `restoreState()` を呼ぶ         | Normal - 表示 state の復元                                                 | 内部値 `true` の復元、`#findOpenCdv` の active class 付与、widget の表示がすべて行われる                                       | 表示経路                         |
| TC-039  | 旧形式 state（`openCdvEnabled` フィールドが存在しない）で `restoreState()` を呼ぶ | Boundary - legacy state の欠落値                                           | 内部値が `false` になり、`#findOpenCdv` に active class が付与されない（`undefined` は false 扱い）                            | 後方互換                         |

### 失敗源インベントリ（include-or-justify）— Feature 045 追加分（S8〜S9）

| 失敗源                                                 | 対応ケースまたは除外理由                                                               |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 検索対象と表示の不一致（ヒットするのにハイライトなし） | TC-033、TC-034、TC-035                                                                 |
| `openCdvEnabled` の未保存（再構築で OFF に戻る）       | TC-036                                                                                 |
| hidden state の早期 return による復元漏れ              | TC-037                                                                                 |
| 内部値と CSS class の不同期                            | TC-037、TC-038（class 付与まで検証）                                                   |
| 旧 state のフィールド欠落                              | TC-039                                                                                 |
| stash 行の表示文字列生成の退行                         | excluded(表示生成は `web/main-test/`（table 描画）と `web/utils-test.md` owner の責務) |
| 正規表現エラー・ReDoS                                  | excluded(既存 S4 TC-020〜TC-022 で担保済み。本変更で挙動を変えない)                    |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-033、TC-035
- Exception: excluded(本変更に throw 分岐が存在しない)
- External: excluded(外部依存なし。state はテスト側で直接構築する)
- Boundary: TC-037、TC-039
- Type: excluded(`openCdvEnabled` の型は TypeScript コンパイル時に保証され、実行時は `=== true` 判定で `undefined` を TC-039 が検証)

数値境界（0 / minimum / maximum / +/-1）は本変更の対象（文字列照合と boolean 状態）に仕様上存在しないため対象外とし、意味のある境界は欠落値（TC-039）と非表示復元（TC-037）で充足する。

**失敗系/正常系比（煙感知器）**: 正常系3件（TC-034、TC-036、TC-038）、失敗系4件（TC-033、TC-035、TC-037、TC-039）、比1.3。

## S10: ref折り畳み要素の走査除外と強調更新通知

> Origin: Feature 059-02 (light-spec-plan)
> Added: 2026-09-24
> Status: active
> Supersedes: -
> Signature: `FindWidgetCallbacks.onHighlightsChanged?(): void`、`findMatches()` / `clearMatches()` のテキスト走査と強調解除（`data-ref-overflow-ignore` を持つ要素のsubtreeを除外）
> Target Path: `web/findWidget.ts`（`getChildNodesWithTextContent` / `getChildrenWithClassName`、`findMatches`、`clearMatches`、`close`。実装後に行範囲へ更新）
> Test File: `tests/web/findWidget.test.ts`

検索対象の判定（コミットの元データ）、正規表現・大小文字の設定、コミット単位の件数、結果移動、詳細を開くオプションを変えずに、counterと複製（`data-ref-overflow-ignore`）をテキスト走査と強調解除から除外し、強調の付与・解除の完了後に通知する。counterの強調と一覧の同期は `web/refOverflow-test.md` S5 の責務。一覧の座標は扱わない。

| Case ID | Input / Precondition                                                                                                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                | Notes                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| TC-040  | branch `feature/hidden-only` を持つコミット行で、そのrefが `.refOverflowHidden` を持つ（非表示）。検索語 `hidden-only`                                 | Normal - 隠れた元refの走査                                                 | カウンターが `1 of 1`（1コミット）で、隠れたref内に `span.findMatch` が挿入される                                                                              | AC-08                     |
| TC-041  | 行内に `data-ref-overflow-ignore` を持つ `button.refOverflowCounter`（文字列 `+4`）があり、他の検索対象フィールドに `4` を含まないコミット。検索語 `4` | Validation - counter文字列を検索対象にしない                               | カウンターが `No Results`、counterの子孫に `.findMatch` が0個で、counterは `BUTTON` 要素のまま                                                                 | AC-10                     |
| TC-042  | 行内に `data-ref-overflow-ignore` を持つcounterと複製があり、コミットメッセージが検索語に一致                                                          | Normal - 除外subtreeの外だけを強調                                         | 一致件数が1コミットのまま、`span.findMatch` がメッセージ側だけにあり、`data-ref-overflow-ignore` のsubtree内の `.findMatch` が0個                              | AC-10                     |
| TC-043  | TC-040の検索後に検索語を空にする                                                                                                                       | Normal - 強調解除と除外subtreeの保持                                       | 隠れたref内の `span.findMatch` が0個になり元の文字列へ戻る。`data-ref-overflow-ignore` のsubtreeの `innerHTML` が検索前と一致し、counterは `BUTTON` 要素のまま | -                         |
| TC-044  | `onHighlightsChanged` をspyにして一致する語で検索                                                                                                      | Normal - 強調付与後の通知                                                  | 検索1回につき通知が1回で、通知時点で `span.findMatch` がDOMに存在する                                                                                          | AC-08                     |
| TC-045  | 一致後に、検索語を空にする / `close()` / regex ONで `[invalid` / regex ONで `(?:)` のいずれかを行う                                                    | Boundary - 解除経路の通知                                                  | 各操作で通知が1回以上あり、最後の通知時点で表の `span.findMatch` が0個                                                                                         | AC-09                     |
| TC-046  | `onHighlightsChanged` を持たないcallbacksで検索と解除を行う                                                                                            | Boundary - 通知は任意                                                      | 例外なく検索と解除が完了し、既存どおりカウンターが更新される                                                                                                   | optional callback         |
| TC-047  | `onHighlightsChanged` をspyにして1回の入力で検索                                                                                                       | Validation - 通知から再検索しない                                          | `getCommits` の呼出しが1回、通知が1回で、通知をきっかけにした再検索が起きない                                                                                  | 検索→同期→検索の循環なし  |
| TC-048  | ブランチなしworktree（path `/tmp/wt8`）のラベルを持つ行で、他の検索対象フィールドに `wt8` を含まない。検索語 `wt8`                                     | Validation - worktree名/pathを検索対象に追加しない                         | カウンターが `No Results`                                                                                                                                      | §3.6 検索範囲の限界を受容 |
| TC-049  | 隠れたref `Feature/Hidden` の行で、caseSensitive ONの検索語 `feature/hidden` と、regex ONの検索語 `Feature/Hid.*`                                      | Normal - 既存の検索条件の維持                                              | caseSensitive ONでは `No Results`、regex ONでは `1 of 1`                                                                                                       | 元データ基準の判定。AC-10 |

### 失敗源インベントリ（include-or-justify）— Feature 059-02 追加分（S10）

| 失敗源                                              | 対応ケースまたは除外理由                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------- |
| 隠れた元refを走査しない                             | TC-040                                                                     |
| counter文字列・複製を件数や置換へ混入させる         | TC-041、TC-042                                                             |
| 強調解除でcounterをテキストへ置換する               | TC-041、TC-043                                                             |
| 付与・解除後の通知漏れ                              | TC-044、TC-045                                                             |
| optional callbackの欠落で例外                       | TC-046                                                                     |
| 通知による再検索ループ                              | TC-047                                                                     |
| 検索範囲の変更（worktree名/pathの追加、条件の変化） | TC-048、TC-049                                                             |
| 一覧の座標                                          | excluded(`web/refOverflow-test.md` S4 の責務)                              |
| 外部依存の失敗                                      | excluded(callbacksはテスト側のspyで、検索は受領済みのコミットだけを使う)   |
| 例外送出                                            | excluded(無効regexは既存S4 TC-020の例外処理のまま。通知経路はTC-045で確認) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-041、TC-047、TC-048
- Exception: excluded(上表のとおり)
- External: excluded(上表のとおり)
- Boundary: TC-045、TC-046
- Type: excluded(callbackの型はTypeScriptで保証される)

**失敗系/正常系比（煙感知器）**: 正常系5件（TC-040、TC-042〜TC-044、TC-049）、失敗系5件。件数が同数のため再導出したが、走査除外と通知の失敗源は上表で充足した。

### Feature 059-02 テスト対応と実行証跡（S10）

- テストファイル: `tests/web/findWidget.test.ts` の describe `FindWidget ref overflow exclusion and highlight notification (S10)`。TC-040〜TC-049 を各 `it` で検証（TC-045 は4つの解除経路、TC-049 は2つの検索条件を `it.each`）。TC-043 は、行内の除外subtreeに既に複製された `span.findMatch` を置き、検索と解除の後も除外subtreeの `innerHTML` が検索前と一致することで、強調解除の走査除外も確認する
- 変異確認: テキスト走査の除外を外すと TC-042/TC-043、強調解除の走査除外を外すと TC-043、`close()` 後の通知を外すと TC-045 が失敗することを確認した（変異は確認後に戻した）
- 実FindWidgetとmainの配線は `web/main-test/01-rendering-03.md` TC-492 で確認。実ブラウザ（Chromium headless）では、隠れたref名だけの一致で `1 of 1`・counter強調（背景 rgba(234, 92, 0, 0.35)）・一覧は閉じたまま、説明文だけの一致で counter 強調なし、`+4` の検索で No Results かつ counter は BUTTON のまま、クリアと不正regex（`[inv`）で表のマーク0件
