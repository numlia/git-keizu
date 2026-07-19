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

| Case ID | Input / Precondition                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                 | Notes                                      |
| ------- | ---------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------ | ---------------- |
| TC-017  | caseSensitive OFF, テキスト "Fix"        | Normal - standard                                                          | "fix", "Fix", "FIX" 全てにマッチ                | デフォルト動作                             |
| TC-018  | caseSensitive ON, テキスト "Fix"         | Normal - standard                                                          | "Fix" のみにマッチ、"fix" にはマッチしない      | RegExp iフラグなし                         |
| TC-019  | regex ON, テキスト "fix                  | feat"                                                                      | Normal - standard                               | "fix" または "feat" を含むコミットにマッチ | 正規表現パターン |
| TC-020  | regex ON, テキスト "[invalid"            | Exception - handled error                                                  | エラー属性が設定され（赤枠）、マッチなし        | RegExp コンストラクタ例外                  |
| TC-021  | regex ON, テキスト "(?:)" (ゼロ長マッチ) | Boundary - zero-length                                                     | エラー属性が設定され、マッチがクリアされる      | ReDoS防止                                  |
| TC-022  | regex ON, テキスト "(a+)+" (潜在的ReDoS) | Boundary - backtracking                                                    | try-catchで安全に処理される（クラッシュしない） | ReDoS防止                                  |

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
