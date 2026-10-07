# テスト観点表: web/dropdown.ts

> Source: `web/dropdown.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: isOpen() 展開状態判定

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**シグネチャ**: `isOpen(): boolean`
**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes        |
| ------- | ------------------------------------ | -------------------------------------------------------------------------- | --------------- | ------------ |
| TC-001  | ドロップダウン初期状態（閉じている） | Normal - closed                                                            | false を返す    | 初期状態     |
| TC-002  | ドロップダウン展開後                 | Normal - open                                                              | true を返す     | open() 後    |
| TC-003  | 展開後に close() 呼び出し            | Normal - re-closed                                                         | false を返す    | 状態遷移検証 |

## S2: close() パブリック化

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**シグネチャ**: `close(): void`
**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                 | Notes  |
| ------- | ------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------- | ------ |
| TC-004  | ドロップダウン展開中に close() | Normal - standard                                                          | ドロップダウンが非表示になり、isOpen() が false | -      |
| TC-005  | 既に閉じている状態で close()   | Boundary - already closed                                                  | エラーなし、isOpen() は引き続き false           | 冪等性 |

## S3: escapeHtml XSS修正

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                | Notes               |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------- | ------------------- |
| TC-006  | オプション名に HTML特殊文字を含む（例: `<script>alert(1)</script>`） | Validation - XSS attempt                                                   | 選択値表示にエスケープ済みテキストが設定される | escapeHtml 適用検証 |
| TC-007  | オプション名が通常テキスト（例: `main`）                             | Normal - standard                                                          | テキストがそのまま表示される                   | 通常動作の維持      |
| TC-008  | オプション名に `&`, `<`, `>`, `"`, `'` を含む                        | Boundary - all HTML entities                                               | すべての特殊文字が適切にエスケープされる       | 各エンティティ検証  |

## S4: title 属性設定

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                    | Notes                      |
| ------- | ---------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------- |
| TC-009  | render() 実行後の選択値表示要素    | Normal - standard                                                          | title 属性にオプション名（生テキスト）が設定される | ブラウザがエスケープ       |
| TC-010  | ドロップダウンオプション要素の描画 | Normal - standard                                                          | 各オプション div に title 属性が設定される         | ツールチップ用             |
| TC-011  | 長いオプション名（100文字以上）    | Boundary - long text                                                       | title 属性にフルテキストが設定される               | 省略表示時のフルネーム表示 |

## S5: マジックナンバー定数化

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes                  |
| ------- | ------------------------ | -------------------------------------------------------------------------- | --------------- | ---------------------- |
| TC-012  | MIN_DROPDOWN_WIDTH 定数  | Normal - standard                                                          | 値が 130        | 最小幅                 |
| TC-013  | SCROLLBAR_THRESHOLD 定数 | Normal - standard                                                          | 値が 272        | スクロールバー表示閾値 |
| TC-014  | SCROLLBAR_WIDTH 定数     | Normal - standard                                                          | 値が 12         | スクロールバー幅       |
| TC-015  | MAX_DROPDOWN_HEIGHT 定数 | Normal - standard                                                          | 値が 297        | 最大高さ               |

## S6: マルチセレクトモード初期化

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: superseded
> Superseded By: S11
> Supersedes: -

**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                | Notes                 |
| ------- | ---------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------- | --------------------- |
| TC-016  | multipleAllowed=true でコンストラクタ呼び出し  | Normal - standard                                                          | マルチセレクトモードが有効になる               | -                     |
| TC-017  | multipleAllowed=false でコンストラクタ呼び出し | Normal - standard                                                          | 単一選択モード（既存動作）が維持される         | 後方互換              |
| TC-018  | multipleAllowed=true で render() 実行          | Normal - standard                                                          | 各オプションにチェックボックス要素が描画される | input type="checkbox" |
| TC-019  | multipleAllowed=false で render() 実行         | Normal - no checkbox                                                       | チェックボックス要素が描画されない             | 既存動作維持          |

## S7: マルチセレクト "Show All" 排他制御

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                       | Notes        |
| ------- | ---------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------- | ------------ |
| TC-020  | "Show All"（インデックス 0）をクリック               | Normal - standard                                                          | 全ての個別チェックボックスが解除される                | -            |
| TC-021  | 個別オプションをクリック                             | Normal - standard                                                          | "Show All" が解除され、クリックしたオプションがトグル | -            |
| TC-022  | 全ての個別選択を 1 つずつ解除                        | Boundary - all deselected                                                  | 自動的に "Show All" が選択状態に復帰する              | 自動復帰     |
| TC-023  | "Show All" 選択中に個別オプションを 1 つクリック     | Normal - standard                                                          | "Show All" が解除され、個別オプションがチェックされる | 排他切替     |
| TC-024  | 複数の個別オプションが選択中に "Show All" をクリック | Normal - standard                                                          | 全個別選択が解除され、"Show All" のみ選択             | 一括リセット |

## S8: マルチセレクト閉じ・コールバック動作

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                              | Notes              |
| ------- | --------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------- | ------------------ |
| TC-025  | ドロップダウン open → 選択変更あり → close          | Normal - standard                                                          | コールバックが発火し、選択値の配列が渡される | -                  |
| TC-026  | ドロップダウン open → 選択変更なし → close          | Boundary - no change                                                       | コールバックが発火しない                     | 不要なリロード防止 |
| TC-027  | "Show All" 選択状態で close                         | Normal - standard                                                          | コールバックに空配列が渡される               | 空配列 = Show All  |
| TC-028  | 1 項目のみ選択状態で close                          | Normal - single                                                            | コールバックに 1 要素の配列が渡される        | -                  |
| TC-029  | 3 項目選択状態で close                              | Normal - multiple                                                          | コールバックに 3 要素の配列が渡される        | -                  |
| TC-030  | open 時の選択状態を記録 → トグル → 元に戻す → close | Boundary - revert to original                                              | コールバックが発火しない（変更なしと判定）   | 差分検知           |

## S9: マルチセレクト表示ラベル

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                | Notes      |
| ------- | --------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------- | ---------- |
| TC-031  | "Show All" が選択中         | Normal - standard                                                          | 表示ラベルが "Show All" の名前になる           | -          |
| TC-032  | 個別オプション 1 件が選択中 | Normal - single                                                            | 表示ラベルがそのオプション名になる             | -          |
| TC-033  | 個別オプション 2 件が選択中 | Normal - multi                                                             | 表示ラベルが件数表示になる（例: "2 selected"） | -          |
| TC-034  | 個別オプション 5 件が選択中 | Boundary - many selections                                                 | 表示ラベルが件数表示になる（例: "5 selected"） | 多数選択時 |

## S10: マルチセレクトイベントハンドリング

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                             | Notes                |
| ------- | ------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------- | -------------------- |
| TC-035  | マルチセレクト: オプションクリック         | Normal - standard                                                          | ドロップダウンが閉じない（stopPropagation） | 単一選択との差異     |
| TC-036  | 単一選択: オプションクリック               | Normal - standard                                                          | ドロップダウンが閉じる（既存動作維持）      | 後方互換             |
| TC-037  | マルチセレクト: フィルタ入力で文字列を入力 | Normal - standard                                                          | オプションがフィルタテキストで絞り込まれる  | 既存フィルタ機能維持 |
| TC-038  | マルチセレクト: フィルタ入力でマッチなし   | Boundary - no match                                                        | オプションが全て非表示になる                | 既存フィルタ動作維持 |

## S11: 起動 button・開閉・候補移動・内部 Tab 順と候補の再解決

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: S6
> Signature: `new Dropdown(id, showInfo, label, callback, multipleAllowed?)`（既存 overload を維持）/ `setOptions(options, selected)` / 起動 `button`（名前・`aria-expanded`・`aria-controls`）/ 検索 `input` と `listbox` / `option` の keydown
> Target Path: `web/dropdown.ts:69-178, 209-294, 315-386, 407-474, 490-511`（constructor と `createHintButton`、`setOptions` / `refresh` / `render`、`filter` と候補の再解決、`handleTriggerKeydown` / `handleFilterKeydown` / `handleOptionKeydown`、`handleTab`）
> Test File: `tests/web/dropdown.test.ts`

対応プラン §3.7.2 R4.5 と Task 4 の観点。S6（マルチセレクト初期化）は option 内に `input type="checkbox"` を描画する契約（TC-018）だったが、checkbox を装飾表示に置き換え `listbox` / `option` / `aria-multiselectable` / `aria-selected` で状態を表すため置き換える。S6 の単一 / 複数のモード判定（TC-016 / TC-017 / TC-019）の意味は本節へ引き継ぐ。fixture は `#branchSelect` 相当の `div.dropdown` に options `[Show All, feature, hotfix, main]`（複数選択）と `[/a, /b]`（単一）を与え、`document.activeElement` と `aria-*` 属性、変更 callback の回数を観測する。候補のフォーカスは選択状態と別に `value` で保持し、表示候補のうち 1 個だけを Tab 停止点にする。実装前実測: 現在値要素は `div`（`tabIndex -1`）で `focus()` しても `activeElement` は `body`。

| Case ID | Input / Precondition                                                                                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                | Notes                                                                                                |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| TC-039  | 起動 button に実フォーカスして `Enter`、`Space`、`ArrowDown` の各キー（keydown → keyup）                                                          | Normal - 起動 button で開き検索へフォーカス                                | 3 通りとも `dropdownOpen` が付き `aria-expanded="true"`、`activeElement` が検索 `input`、起動 button が `button` 要素で `type="button"`・名前（`aria-label` または `aria-labelledby` で `label` の文言）・`aria-controls` が menu の `id` と一致。keyup で二重に toggle しない | K23 / A8.1-3。実装前実測: `div.dropdownCurrentValue` は focus 不可                                   |
| TC-040  | 開いた状態で検索 input に `f`、`e`、` `（Space）を入力（`keyup` で `filter()`）                                                                   | Normal - 文字と Space は検索文字列                                         | `input.value` が `"fe "` 相当で候補が絞られ、Space で選択が反転しない（`aria-selected` 不変）、callback 0 回                                                                                                                                                                   | R4.5「入力中の文字とSpaceは検索文字列として扱う」                                                    |
| TC-041  | 検索 input に実フォーカスして `ArrowDown`、別途 `ArrowUp`                                                                                         | Normal - 入力の↓は最初、↑は最後の表示候補                                  | `ArrowDown` で `activeElement` が表示中の最初の `option`（絞り込み後はその先頭）、`ArrowUp` で最後の表示 `option`。keydown が消費される                                                                                                                                        | R4.5                                                                                                 |
| TC-042  | 候補の先頭に実フォーカスして `ArrowUp`、末尾で `ArrowDown`、中間で `ArrowDown`                                                                    | Boundary - 候補の端で止まる                                                | 先頭 `↑` / 末尾 `↓` は `activeElement` 不変（検索 input へ戻らず循環しない）。中間 `↓` は次の表示候補。非表示（絞り込みで隠れた）候補を飛ばす                                                                                                                                  | R4.5「表示候補だけを移動し端で止まる」                                                               |
| TC-043  | 候補上で `Home`、`End`                                                                                                                            | Normal - 先頭 / 末尾へ                                                     | `activeElement` が表示中の先頭 / 末尾の `option`                                                                                                                                                                                                                               | R4.5                                                                                                 |
| TC-044  | 複数選択と単一選択の各 render 結果の属性                                                                                                          | Normal - roles と選択状態                                                  | 候補群が `role="listbox"`、各候補が `role="option"`、複数選択は `aria-multiselectable="true"`、選択済み候補が `aria-selected="true"`。option 内に focus 可能な `input` が無く（装飾表示）、Tab 停止点が重複しない                                                              | S6 TC-018 の契約変更。R4.5                                                                           |
| TC-045  | 候補群へ初回入場（`Tab` 相当で `getTabStops` の 1 停止点）。選択済み `hotfix` がある場合と無い場合。候補 `main` へ移動して検索 input へ戻り再入場 | Normal - 候補群の 1 停止点と再入場                                         | 表示候補のうち `tabindex="0"` が 1 個だけ。初回は選択済み先頭（`hotfix`）、無ければ先頭候補。再入場では直前の `main`                                                                                                                                                           | R4.5「候補群への初回入場は表示中の選択済み先頭、なければ先頭候補とし、以後は表示中の直前候補を保つ」 |
| TC-046  | 検索文字列 `zzz` で表示候補 0 件のまま `ArrowDown`、`Enter`                                                                                       | Boundary - 検索 0 件                                                       | `activeElement` が検索 input のまま、`input.value` が `"zzz"` を保持、`dropdown.noResults` の文言が表示され `role="status"` 等で通知、閉じない、callback 0 回                                                                                                                  | K26 / A8.3-1                                                                                         |
| TC-047  | `setOptions([], [])`（データ 0 件）で render                                                                                                      | Boundary - データ 0 件                                                     | 起動 button が `disabled`、`getTabStops` 相当で停止点にならず、`click` / `Enter` で開かない（`dropdownOpen` なし）                                                                                                                                                             | K26 / A8.3-1。「0件の起動は無効」                                                                    |
| TC-048  | 開いた状態で `setOptions` を候補 1 件（Show All + 1 件、または単一の 1 件）へ更新                                                                 | Boundary - 1 件以下への更新で閉じる                                        | `dropdownOpen` が外れ、`activeElement` が起動 button（復元）、callback 0 回。`options[0]` を無条件参照せず表示名が空 options でも例外にならない                                                                                                                                | K26 / A8.3-1。現行の「候補が1件以下なら閉じる」を維持                                                |
| TC-049  | 複数選択を開き、検索 input から `Tab` を繰り返す（`getTabStops` と内部 keydown）                                                                  | Normal - 内部 Tab 順                                                       | 検索 input → 候補群の 1 停止点 → 適用 `button` → 取消 `button` の順。単一選択では適用 / 取消が無く検索 input → 候補群。Shift + `Tab` で候補から検索 input へ戻れる                                                                                                             | K27 / A8.3-4                                                                                         |
| TC-050  | 複数選択で候補を変更した後、取消 button から `Tab`（外側へ）。単一選択で候補にフォーカスした後に外側へ `Tab`                                      | Normal - 外部 Tab 退出                                                     | 複数選択は変更を適用（callback 1 回）、単一選択は未確定候補を破棄（callback 0 回、値不変）。どちらも閉じるが `activeElement` を起動 button へ戻さない（`Tab` の移動先を奪わない。`restoreFocus(origin, "tab")` が `false`）                                                    | K27 / A8.3-4                                                                                         |
| TC-051  | 複数選択で候補を変更した後、`document.body` の空き領域を `click`（外側）                                                                          | Normal - 外側クリックは適用し移動先を優先                                  | callback 1 回、`dropdownOpen` 除去、`activeElement` が起動 button ではない（移動先を奪わない）                                                                                                                                                                                 | K27 / A8.2-3                                                                                         |
| TC-052  | 開いた状態で起動 button を `click` / `Enter`                                                                                                      | Normal - 起動 button で閉じる                                              | 複数選択は変更があれば callback 1 回（適用）、単一選択は破棄。`aria-expanded="false"`、`activeElement` が起動 button                                                                                                                                                           | K27                                                                                                  |

### 失敗源インベントリ（include-or-justify）— Feature 061-05 追加分（S11）

| 失敗源                                             | 対応ケースまたは除外理由                                        |
| -------------------------------------------------- | --------------------------------------------------------------- |
| 起動要素がフォーカス不可・名前 / 状態なし          | TC-039                                                          |
| Space で反転する、文字が候補移動になる             | TC-040                                                          |
| 入力↑↓・候補端・Home / End の誤り                  | TC-041〜TC-043                                                  |
| checkbox が停止点に残る、roles 不在                | TC-044                                                          |
| 候補群の停止点が複数・初回 / 再入場先の誤り        | TC-045                                                          |
| 0 件 / 1 件 / データ 0 件                          | TC-046〜TC-048                                                  |
| 内部 Tab 順・外部退出の適用 / 破棄・移動先の横取り | TC-049〜TC-052                                                  |
| 外部依存・例外                                     | excluded(DOM と callback だけで外部依存と throw 経路を持たない) |

### Task 12 テスト対応（Feature 061-05）— S11

- テスト: `tests/web/dropdown.test.ts` describe `S11: Trigger button, option movement, internal Tab order and re-resolution`。TC-039〜TC-052 を同番号の `it` で 1 件ずつ（`it` 名末尾が Case ID）。TC-044 は加えて describe `S6 (superseded by S11)` の `renders decorative checkboxes without focusable inputs in multi-select mode (TC-018)` が S6 TC-018 の契約変更として本節を参照
- TC-046 の解釈（Task 4 handoff）: 「表示候補 0 件のまま `Enter` で閉じない」は **単一選択** の契約。複数選択の検索 input 上の Enter は R4.5 により変更を適用して閉じる（S12 TC-059）。TC-046 の test は単一選択で 0 件を作って確認する
- TC-048 の解釈（Task 4 handoff）: 「候補 1 件以下」は `options.length <= 1`（Show All を含む全候補数）。複数選択は Show All + 0 件、単一選択は 1 件で閉じ、起動 button へ復元する
- 実行結果（2026-10-07）: 14 件 pass。実装前実測（`div.dropdownCurrentValue` が focus 不可）は TC-039 で GREEN

## S12: 適用・取消・IME / repeat / keyup の保護と close / cancelAndClose の契約

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: `public close(reason?: FocusCloseReason): void` / `public cancelAndClose(reason?: FocusCloseReason): void`（公開化）/ 候補・検索 input の `Enter` / `Space` / `Escape` keydown / `isKeyboardActionBlocked(event)` の利用 / `setOptions()` の取消基準更新
> Target Path: `web/dropdown.ts:188-208, 387-406, 475-489, 519-597`（`toggleMultiSelectOption` / `confirmSingleOption`、`handleKeydown`、`activateOption`、`toggleFromTrigger` / `open` / `leave` / `isOpen` / `close` / `cancelAndClose` / `hideMenu` / `fireMultiSelectCallbackIfChanged`）
> Test File: `tests/web/dropdown.test.ts`

対応プラン §3.5「Dropdownのcloseは適用、cancelAndCloseは取消であり、同じ意味へまとめない」と R4.5 / R4.6 の観点。document の capture Enter / Escape リスナーを部品内の keydown へ置き換える。S8（閉じ・callback）と S10（イベント）は適用の意味が変わらないため active のまま。実装前実測（実 Dropdown、`M` の詳細を開いた状態）: 候補変更後の `Escape` keydown で取消は成立するが同じ押下の keyup で背後の詳細が閉じる。`isComposing: true` の `Enter` keydown で閉じて callback が 1 回実行される（IME 確定で適用）。

| Case ID | Input / Precondition                                                                                                                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                   | Notes                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| TC-053  | 複数選択を起動 button の `Enter` で開き、検索に `h` → `ArrowDown`（候補 `hotfix`）→ `Space` → `Enter`（keydown → keyup）                                                  | Normal - 候補変更を 1 回適用し起動 button へ復帰                           | `Space` 後に `hotfix` の `aria-selected="true"`（callback まだ 0 回）。`Enter` で callback が `["hotfix"]` で 1 回、`dropdownOpen` 除去、`activeElement` が起動 button。keyup で追加 0 回                                         | K23 / A8.1-3                                                                           |
| TC-054  | 複数選択を開き `Space` で `hotfix` を反転した後、`Escape` keydown → keyup を一連で送る（document に bubble リスナーを登録）                                               | Normal - Escape keydown で開始選択へ取消                                   | keydown で選択が開いた時点へ戻り（`aria-selected` が元どおり）、callback 0 回、`activeElement` が起動 button。keydown が `defaultPrevented` かつ bubble リスナー呼出し 0 回（上位の Escape 列へ流さない）。keyup では何も起きない | K24 / A8.1-3 / A8.3-4。実装前実測: keyup で背後の詳細が閉じる（main 側 TC-690）        |
| TC-055  | TC-054 を `isComposing: false` の `Escape` の `keyup` だけで送る（keydown なし）                                                                                          | Validation - keyup 単独では取消しない                                      | `dropdownOpen` のまま、選択不変、callback 0 回                                                                                                                                                                                    | R4.6「keyupでは閉じない」。片方だけの擬似操作で検証済みとしない前提の確認              |
| TC-056  | 複数選択を開き `main` を反転した後、`setOptions([Show All, feature, hotfix], ["feature"])`（`main` 削除・選択値受信）→ `Escape`                                           | Normal - 候補更新は新しい取消基準                                          | 取消後の選択が受信した `["feature"]`（開いた時点の選択ではなく、削除された `main` が復活しない）、callback 0 回                                                                                                                   | K25 / A8.3-1                                                                           |
| TC-057  | 単一選択（`[/a, /b]`、現在 `/a`）で候補 `/b` に実フォーカスして `Enter`、別試行で `Space`                                                                                 | Normal - 単一は候補上の Enter / Space で確定                               | callback が `"/b"` で 1 回、`dropdownOpen` 除去、現在値表示が `/b`、`activeElement` が起動 button                                                                                                                                 | R4.5                                                                                   |
| TC-058  | 単一選択で検索 `b` → 検索 input 上で `Enter`。別途検索 `zzz`（0 件）で `Enter`                                                                                            | Normal / Boundary - 入力 Enter は表示先頭を確定、0 件は閉じない            | 前者は callback `"/b"` 1 回で閉じる。後者は callback 0 回、`dropdownOpen` のまま、`input.value` 保持                                                                                                                              | R4.5「0件なら閉じない」                                                                |
| TC-059  | 複数選択で `hotfix` を反転後、検索 input 上で `Enter`                                                                                                                     | Normal - 複数の入力 Enter は適用                                           | callback `["hotfix"]` 1 回、閉じる、`activeElement` が起動 button                                                                                                                                                                 | R4.5                                                                                   |
| TC-060  | 複数選択で `feature` と `hotfix` を選択した後、候補 `Show All` 上で `Space`。続けて `feature` で `Space`                                                                  | Normal - Show All の排他をキーボードでも維持                               | `Show All` の `Space` で個別選択が空（`aria-selected` が Show All だけ）。`feature` の `Space` で Show All が外れる                                                                                                               | S7 の契約維持                                                                          |
| TC-061  | 複数選択で `hotfix` を反転後、`compositionstart` → `Enter` keydown（`isComposing: true`）→ `compositionend` → `Enter` keyup                                               | Validation - IME 変換中の Enter で適用しない                               | `dropdownOpen` のまま、callback 0 回（keyup でも 0 回）                                                                                                                                                                           | K34 / A8.3-2。実装前実測: 閉じて callback 1 回（RED）                                  |
| TC-062  | 複数選択で候補を反転後、`Enter` keydown（`repeat: false`）→ `Enter` keydown（`repeat: true`）× 2                                                                          | Validation - repeat で二重適用しない                                       | callback が合計 1 回                                                                                                                                                                                                              | A8.3-2                                                                                 |
| TC-063  | 候補上で `Space` keydown → `Space` keyup、`Enter` keydown → `Enter` keyup                                                                                                 | Validation - keyup で二重に反転 / 適用しない                               | `Space` の反転が 1 回（keyup で戻らない）、`Enter` の callback が 1 回                                                                                                                                                            | A8.3-2。標準 button の既定 click は jsdom が生成しないため Task 12 の実 Webview 確認へ |
| TC-064  | 複数選択で候補を変更後に `close("keyboard")`、別試行で `cancelAndClose("keyboard")`、別試行で引数なし `close()` / `cancelAndClose()`。事前に `#refreshBtn` へ実フォーカス | Normal - close は適用、cancelAndClose は取消、引数なしは focus を奪わない  | `close("keyboard")` は callback 1 回で `activeElement` が起動 button。`cancelAndClose("keyboard")` は callback 0 回・選択復元で起動 button。引数なしはそれぞれ適用 / 取消しつつ `activeElement` が `#refreshBtn` のまま           | §3.5。`cancelAndClose` が public                                                       |
| TC-065  | 候補 `hotfix` → `main` へ `ArrowDown` でフォーカス移動だけ行い、`Escape`                                                                                                  | Validation - フォーカス移動だけでは値を変えない                            | `aria-selected` が移動前後で不変、callback 0 回                                                                                                                                                                                   | R4.5「フォーカス移動だけでは値を変更しない」                                           |
| TC-066  | dropdown を閉じた状態で、無関係な `<input>` 上で `Enter` keydown と document 上で `Escape` keydown を発火                                                                 | Validation - 閉じているときに document の Enter / Escape を横取りしない    | どちらも `defaultPrevented === false` で、dropdown の callback 0 回（document capture リスナーが残っていない）                                                                                                                    | Task 4「documentのcapture Enter/Escapeを部品内のkeydownへ置き換える」                  |

### 失敗源インベントリ（include-or-justify）— Feature 061-05 追加分（S12）

| 失敗源                                                  | 対応ケースまたは除外理由                                     |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| 適用が複数回 / 起動 button へ戻らない                   | TC-053、TC-059                                               |
| Escape で適用する、keyup で閉じる、上位へ流す           | TC-054、TC-055                                               |
| 候補更新後の取消基準・削除値の復活                      | TC-056                                                       |
| 単一の確定・0 件 Enter で閉じる                         | TC-057、TC-058                                               |
| Show All 排他の退行                                     | TC-060                                                       |
| IME / repeat / keyup の二重適用                         | TC-061〜TC-063                                               |
| close と cancelAndClose の混同、引数なしで focus を奪う | TC-064                                                       |
| フォーカス移動で値が変わる                              | TC-065                                                       |
| document capture リスナーの残存                         | TC-066                                                       |
| 外部依存・例外                                          | excluded(callback 呼出だけで外部依存と throw 経路を持たない) |

### Task 12 テスト対応（Feature 061-05）— S12

- テスト: `tests/web/dropdown.test.ts` describe `S12: Apply / cancel, input guards and the close / cancelAndClose contract`。TC-053〜TC-066 を同番号の `it` で 1 件ずつ。fixture は `installKeyboardGuards(document)` を `beforeEach` で登録し各 `it` 後に破棄
- RED → GREEN: 実装前実測「`isComposing: true` の Enter で閉じて callback 1 回」は TC-061、「keyup で背後の詳細が閉じる」は TC-054（本表）と `web/main-test/13-keyboard-accessibility-01.md` S72 TC-690（main）で GREEN
- TC-063 の未自動化部分: 標準 button（候補は `div[role=option]` のため対象外、Apply / Cancel の `button.dropdownHintBtn` と起動 button）の既定 click は jsdom が生成しない。手動 Case（未実施）: 実 Webview で branch 複数選択を Tab / Enter で開き、候補で Space → Enter、別試行で Apply button 上の Enter / Space を 1 回・repeat・IME 確定直後に押す。期待: 適用が合計 1 回（`loadCommits` 要求 1 件）。影響: 二重適用で要求 2 件。代替確認: TC-062 / TC-063 の callback 回数（jsdom）。実 Webview の手動 Case は `web/main-test/13-keyboard-accessibility-01.md` 冒頭「Task 12 実 Webview 手動確認（未実施一覧）」の様式で記録し、自動テストの pass に含めない
- 実行結果（2026-10-07）: 14 件 pass
