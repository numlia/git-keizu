# テスト観点表: web/dialogs.ts

> Source: `web/dialogs.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: showFormDialog() フォーカス優先順位

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 5.2
> Added: 2026-02-25
> Status: superseded
> Superseded By: S9
> Supersedes: -

**シグネチャ**: `showFormDialog(title: string, inputs: DialogInput[], actionName: string, actioned: (values: string[]) => void, sourceElem: HTMLElement | null): void`
**テスト対象パス**: `web/dialogs.ts`

| Case ID | Input / Precondition                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                    | Notes               |
| ------- | --------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------- | ------------------- |
| TC-001  | text-ref入力あり + text入力あり                     | Normal - standard                                                          | text-ref入力にフォーカス           | 最優先              |
| TC-002  | text-ref入力なし + text入力あり (Stashダイアログ等) | Normal - standard                                                          | 最初のtext入力にフォーカス         | REQ-9.1の主要ケース |
| TC-003  | text-ref入力なし + text入力なし                     | Boundary - フィールドなし                                                  | フォーカスなし（エラーにならない） | 確認ダイアログ等    |
| TC-004  | text入力が複数ある場合                              | Normal - standard                                                          | 最初（先頭）のtext入力にフォーカス | 順序の確認          |

## S2: showFormDialog() Enterキー確定

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 5.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**シグネチャ**: `showFormDialog() 内部 keydown イベントハンドラ`
**テスト対象パス**: `web/dialogs.ts`

| Case ID | Input / Precondition                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                           | Notes                                    |
| ------- | -------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------- |
| TC-005  | ダイアログ有効状態 + Enterキー押下     | Normal - standard                                                          | アクションボタンのclickがトリガーされる   | 主要ケース                               |
| TC-006  | Enterキー押下                          | Normal - standard                                                          | event.preventDefault()が呼ばれる          | デフォルト動作抑制                       |
| TC-007  | noInputクラス付き + Enterキー押下      | Normal - disabled state                                                    | アクションボタンのclickがトリガーされない | 無効状態                                 |
| TC-008  | inputInvalidクラス付き + Enterキー押下 | Normal - disabled state                                                    | アクションボタンのclickがトリガーされない | バリデーション失敗状態                   |
| TC-009  | Escapeキー押下                         | Normal - wrong key                                                         | アクションボタンのclickがトリガーされない | Enter以外のキー                          |
| TC-010  | Tabキー押下                            | Normal - wrong key                                                         | アクションボタンのclickがトリガーされない | Enter以外のキー                          |
| TC-011  | ダイアログ有効状態 + Shift+Enterキー   | Boundary - modifier key                                                    | テスト環境に応じた動作確認                | 修飾キー付きの場合の考慮が必要か設計確認 |

## S3: showFormDialog() info ツールチップ描画

> Origin: Feature 014 (dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-09
> Status: active
> Supersedes: -

**テスト対象パス**: `web/dialogs.ts`

| Case ID | Input / Precondition                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                      | Notes          |
| ------- | -------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------- |
| TC-012  | checkbox に info="説明テキスト" プロパティあり     | Normal - standard                                                          | info icon (SVG) が描画され、title 属性に "説明テキスト" が設定される | -              |
| TC-013  | checkbox に info プロパティなし（undefined）       | Normal - no info                                                           | info icon が描画されない                                             | 既存動作維持   |
| TC-014  | info テキストに HTML 特殊文字 `<script>&"'` を含む | Boundary - special chars (XSS)                                             | title 属性内で HTML エスケープされる                                 | XSS 防止       |
| TC-015  | multi フォーム（text + checkbox with info）        | Normal - multi layout                                                      | checkbox 行の適切な位置に info icon が配置される                     | レイアウト確認 |
| TC-016  | single フォーム（checkbox with info のみ）         | Normal - single layout                                                     | checkbox label 直後に info icon が配置される                         | レイアウト確認 |

## S4: showFormDialog() DialogInput plain text エスケープ (Feature 041)

> Origin: Feature 041 (refresh-contention-and-dialog-escape) (light-spec-plan)
> Added: 2026-05-22
> Status: active
> Supersedes: -
> Signature: `showFormDialog(message, inputs, actionName, actioned, sourceElem, afterCreate?)`
> Target Path: `web/dialogs.ts`

`DialogInput` 由来の文字列 (`name`, `default`, `placeholder`, `options[].name`, `options[].value`) を HTML 連結直前にすべて `escapeHtml()` で処理し、危険文字が DOM 解析されないことを検証する。`message` 引数は既存契約で HTML を許容するためエスケープ対象外。

| Case ID | Input / Precondition                                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                       | Notes                  |
| ------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------- |
| TC-017  | multi form の `text` input `name = "<img onerror=...>"` で `showFormDialog` を呼ぶ                  | Boundary - special chars in label                                          | label セルに `<img>` 要素が生成されず、テキストとして `<img onerror=...>` がそのまま表示される        | name 描画境界          |
| TC-018  | `text` input `default = '" autofocus oninput="alert(1)'`, `placeholder = "</input><script>"` で呼ぶ | Boundary - special chars in attributes                                     | `value` / `placeholder` 属性が破壊されず、追加の `<script>` 要素が DOM に生成されない                 | 属性境界               |
| TC-019  | `select` option `value = "1\""`, `name = "<b>boom</b>"` で呼ぶ                                      | Boundary - special chars in option                                         | `<option>` が 1 件のみ生成され、表示テキストが `<b>boom</b>`、`select.value` 読み出し値が `1"` となる | option 境界 + 値往復   |
| TC-020  | multi form の `checkbox` input `name = "</td><script>"` で呼ぶ                                      | Boundary - special chars in checkbox name                                  | 追加の `</td>` / `<script>` 要素が生成されず、テキストとして表示される                                | checkbox name 描画境界 |
| TC-021  | `message = "<b>hi</b>"` を渡し、`text` input `name = "x"` で呼ぶ                                    | Normal - message HTML preserved                                            | `message` の `<b>` 要素が太字として描画され、エスケープされていない                                   | 既存 HTML 契約維持     |

## S5: showFormDialog() ref 入力の input/keyup 両イベント検証

> Origin: フェーズ3 修正 L14 (dialog-ref-input-event-validation)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: -
> Signature: `showFormDialog()` 内 text-ref 入力の検証ハンドラ（`validateRefInput`）
> Target Path: `web/dialogs.ts:153-171`

text-ref 入力の検証ロジックを匿名 `keyup` リスナから名前付き関数 `validateRefInput` に切り出し、`keyup` に加えて `input` イベントにもバインドする修正。旧実装は `keyup` のみを購読していたため、貼り付け・IME 確定・プログラム的な値変更など `input` は発火するが `keyup` を伴わない入力で検証（`active` / `noInput` / `inputInvalid` クラス付与と `invalidNotice` の更新）が走らなかった。検証ロジック自体は不変。

| Case ID | Input / Precondition                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                         | Notes                 |
| ------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------- |
| TC-022  | ref 入力に有効値を設定し `input` イベントを dispatch                       | Normal - input event valid                                                 | dialog の className が `"active"`（noInput/inputInvalid なし）に更新される                              | input 経路の正常検証  |
| TC-023  | ref 入力に `refInvalid` にマッチする値を設定し `input` イベントを dispatch | Validation - input event invalid chars                                     | className に `"inputInvalid"` が付与され、`invalidNotice` に `invalidCharacters` メッセージが設定される | 不正文字検証          |
| TC-024  | ref 入力を空文字にし `input` イベントを dispatch                           | Boundary - input event empty                                               | className に `"noInput"` が付与される                                                                   | 空入力境界            |
| TC-025  | ref 入力に有効値を設定し `keyup` イベントを dispatch                       | Normal - keyup event still bound                                           | className が `"active"` に更新される（keyup も同じ `validateRefInput` を購読）                          | 既存 keyup 経路の維持 |
| TC-026  | `keyup` を発火させず `input` イベントのみを dispatch（貼り付け相当）       | Boundary - input without keyup                                             | `validateRefInput` が実行され className が更新される（旧 keyup 単独購読では未実行だった）               | L14 の中核回帰        |
| TC-027  | inputInvalid 状態から有効値へ変更し `input` イベントを dispatch            | Boundary - notice cleared on valid input                                   | className が `"active"` に戻り、`invalidNotice` が空文字にクリアされる                                  | 検証結果の再計算      |

## S6: showFormDialog() multiフォームのチェックボックスラベル関連付け（for属性）

> Origin: notes/features/044/memo-対応プラン.md
> Added: 2026-07-14T19:46:42+09:00
> Status: active
> Supersedes: none
> Signature: `showFormDialog()` 内 multiフォームcheckboxの隣接ラベルセル生成部
> Target Path: `web/dialogs.ts`

multiフォーム（`multiElementForm === true`）のcheckbox名セルをプレーンテキスト`<td>`から`<td><label for="dialogInput${i}">名前</label>（infoHtml）</td>`構造へ変更し、ラベル文字列クリックでチェック状態がトグルすることを検証する。infoアイコンは`label`の外側に置き、クリックでトグルしない。単一フォーム経路（名前を`<label>`内包）は変更しない。

| Case ID | Input / Precondition                                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                    | Notes                                        |
| ------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| TC-028  | multiフォーム（text入力1件+checkbox入力1件）で`showFormDialog`を呼ぶ                             | Normal - label生成                                                         | checkbox名セルに`label`要素が1件生成され、`for`属性が対応する`input`のid（`dialogInput1`）と一致し、`label.textContent`がcheckboxのnameと一致する  | 新構造の基本契約                             |
| TC-029  | TC-028と同構成（checkbox初期`checked=false`）でlabel要素の`click()`を実行                        | Normal - クリックトグル                                                    | `document.getElementById("dialogInput1")`の`checked`が`false`から`true`に変化する                                                                  | jsdomのlabeled control activationで観測      |
| TC-030  | TC-028と同構成（checkbox初期`checked=false`）でlabel要素を2回`click()`する                       | Boundary - トグル往復                                                      | 1回目の`click()`後に`checked === true`、2回目の`click()`後に元の`false`へ戻る                                                                      | 往復で状態が破綻しないこと                   |
| TC-031  | 全チェックボックス構成（checkbox 2件、いずれも初期`checked=false`）で2件目のlabelを`click()`する | Normal - for/id対応の取り違えなし                                          | 2件目のcheckbox（`dialogInput1`）の`checked`のみ`true`にトグルし、1件目（`dialogInput0`）の`checked`は`false`のまま不変                            | for/id不一致の失敗源に対応                   |
| TC-032  | info付きcheckboxを含むmultiフォーム（checkbox初期`checked=false`）でinfoアイコンを`click()`する  | Boundary - infoアイコン非トグル                                            | infoアイコン（`.dialogInfo`）が`label`要素の外側（labelの子孫でない位置）に描画され、infoアイコンの`click()`後も`checked`が`false`のまま変化しない | 誤トグル防止（infoはツールチップ目的）       |
| TC-033  | 単一フォーム（checkbox 1件のみ）で`showFormDialog`を呼ぶ                                         | Normal - 単一フォーム回帰                                                  | checkboxのnameが`.dialogFormCheckbox`内の`<label>`の`textContent`に内包され、`for`属性付きlabelを持つ名前セル（`td > label[for]`）が生成されない   | 従来構造の維持（変更対象外経路）             |
| TC-034  | multiフォームのcheckbox `name = "<b>boom</b>"`で`showFormDialog`を呼ぶ                           | Boundary - エスケープ維持                                                  | `escapeHtml`がcheckboxのnameを引数として呼ばれ、label内に`<b>`要素が生成されず、テキストとして`<b>boom</b>`が表示される                            | モック検証: 呼び出し引数。既存TC-020との整合 |

### 失敗源インベントリ（include-or-justify）

| 失敗源                                                             | 対応ケースまたは除外理由                                    |
| ------------------------------------------------------------------ | ----------------------------------------------------------- |
| for/id不一致（ラベルクリックで別のcheckboxがトグル、または無反応） | TC-031（属性値の一致自体はTC-028で固定）                    |
| label要素の未生成・クリックでトグルしない退行                      | TC-028、TC-029、TC-030                                      |
| エスケープ欠落（nameがHTML要素としてlabel内に展開される）          | TC-034                                                      |
| infoアイコンがlabel内に入りクリックで誤トグル                      | TC-032                                                      |
| 単一フォーム構造の破壊（変更対象外経路の回帰）                     | TC-033                                                      |
| CSS視覚崩れ（`cursor: pointer` / `user-select: none`の欠落）       | excluded(jsdomで検証不能・目視確認はプラン§8完了判定に委譲) |
| 既存S1〜S5の失敗源（フォーカス・Enter確定・info描画・ref検証など） | excluded(既存挙動・本変更のスコープ外)                      |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(本変更はDOM生成契約のみで、入力検証分岐を追加しない)
- Exception: excluded(本変更スコープに例外経路が存在しない)
- External: excluded(外部依存なし。内部ユーティリティ`escapeHtml`の呼び出しはTC-034のモック検証で担保)
- Boundary: TC-030、TC-032、TC-034
- Type: excluded(`DialogInput`の型はTypeScriptコンパイル時に保証され、実行時の型分岐が存在しない)

数値・空値境界（0 / minimum / maximum / +/-1 / empty / NULL）は、本セクションの対象がDOM構造とクリックトグルの契約であり仕様上意味を持たないため対象外とする（トグル往復のTC-030、非トグル境界のTC-032、特殊文字境界のTC-034で本変更に意味のある境界を充足）。

**失敗系/正常系比（煙感知器）**: 正常系4件（TC-028、TC-029、TC-031、TC-033）、失敗系3件（TC-030、TC-032、TC-034）、比0.75。件数が1件差以内のためインベントリを再導出したが、本変更スコープの失敗源は上表のとおりすべて対応ケースまたは除外理由で充足されており、追加すべき失敗系ケースはないことを確認した（Validation / Exception / External / Typeが構造上発生しないDOM生成契約のため、失敗系はBoundaryのみとなる）。

## S7: showErrorDialog() 説明付きエラーダイアログの DOM 契約

> Origin: Feature 055-01 (light-spec-plan)
> Added: 2026-08-23
> Status: active
> Supersedes: -
> Signature: `showErrorDialog(message: string, reason: string | null, sourceElem: HTMLElement | null, explanation?: ErrorDialogExplanation): void`
> Target Path: `web/dialogs.ts`（実装後に行範囲へ更新）

`showErrorDialog` に省略可能な第4引数 `explanation`（`summary` / `reason` / `guidance` / `rawOutputLabel` の4文字列）を追加し、`explanation !== undefined && reason !== null` のときだけ既存タイトルの下に要約、理由、案内、初期状態が閉じた `details`（`summary` = `rawOutputLabel`、`pre` = Git 原文全文）、閉じるボタンの順で描画する変更。説明4文字列と原文はそれぞれ `escapeHtml()` を通し、説明なしの既存3引数呼び出しは現在の DOM 構造を維持する。分類・routing は `web/messageHandler-test/01-basic-responses-01.md` S16、locale 値は l10n owner（en S4 / ja S5）の責務。

| Case ID | Input / Precondition                                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                | Notes                                |
| ------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| TC-035  | `showErrorDialog("title", "error line", null, { summary, reason, guidance, rawOutputLabel } の4値)` | Normal - 説明付き DOM の順序と閉じるボタン限定                             | dialog 内に要約・理由・案内・`details` がこの順（DOM 出現順）で各1件生成され、`details.open === false`、`details > summary` の `textContent` が `rawOutputLabel` と一致し、button が `#dialogDismiss` の1件だけで `#dialogAction` が存在しない | 表示順序と操作契約（閉じる以外なし） |
| TC-036  | 説明あり + `reason = "error: line1\nIf you are sure line2"`（複数行の Git 原文）                    | Boundary - 複数行原文の改行保持                                            | `details > pre` の `textContent` が `reason` 全文（`\n` を含む）と完全一致し、`pre` 内に `<br>` 要素が生成されない                                                                                                                             | 原文を加工しない（全文・改行保持）   |
| TC-037  | 説明あり + `summary = "<b>summary</b>"`、`reason = "<img src=x onerror=alert(1)>"`                  | Boundary - special chars（XSS）                                            | dialog 内に `img` 要素と `b` 要素が生成されず、要約要素の `textContent` に `<b>summary</b>`、`pre` の `textContent` に `<img src=x onerror=alert(1)>` が文字列としてそのまま含まれる                                                           | 説明・原文とも `escapeHtml` を通す   |
| TC-038  | `showErrorDialog("title", "error message", null)`（第4引数なしの既存3引数呼び出し）                 | Normal - 説明なしの既存 DOM 維持                                           | 既存どおり `.errorReason` 要素に原文が表示され、dialog 内に `details` 要素と要約・理由・案内の説明要素が生成されない                                                                                                                           | 後方互換（既存 HTML 生成式の維持）   |

### 失敗源インベントリ（include-or-justify）— Feature 055-01 追加分（S7）

| 失敗源                                                | 対応ケースまたは除外理由                                                                                                                                  |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 説明要素の欠落・順序崩れ                              | TC-035                                                                                                                                                    |
| `details` が初期展開される（`open` 属性の付与）       | TC-035                                                                                                                                                    |
| 閉じる以外のボタン生成（強制削除・再試行・コピー等）  | TC-035（`#dialogDismiss` 1件のみ、`#dialogAction` 不在で担保）                                                                                            |
| 原文改行の欠落・`<br>` 化・一部欠落                   | TC-036                                                                                                                                                    |
| escape 欠落（説明・原文が HTML として展開される）     | TC-037                                                                                                                                                    |
| 説明なし既存 DOM の破壊（後方互換の退行）             | TC-038                                                                                                                                                    |
| `deleteBranch` の分類・routing の誤り                 | excluded(`web/messageHandler-test/01-basic-responses-01.md` S16 の責務)                                                                                   |
| locale 値の欠落・不一致                               | excluded(`l10n/web/web.l10n.en.json-test.md` S4 / `web.l10n.ja.json-test.md` S5 の責務)                                                                   |
| CSS の視覚崩れ（折り返し・余白）                      | excluded(jsdom で検証不能。プラン §6 の使い捨てリポジトリでの手動確認に委譲)                                                                              |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL） | excluded(数値境界を持たない DOM 生成契約。`reason: null` と説明の同時渡しは実装分岐上 explanation 判定前に説明なし経路へ倒れ、説明なし側は TC-038 で担保) |
| 外部依存の失敗                                        | excluded(外部依存なし。引数はテスト側で直接構築する)                                                                                                      |
| 不正な型・フォーマット                                | excluded(`ErrorDialogExplanation` の型は TypeScript コンパイル時に保証される)                                                                             |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(本変更は DOM 生成契約のみで、入力検証分岐を追加しない)
- Exception: excluded(本変更スコープに例外経路が存在しない)
- External: excluded(外部依存なし)
- Boundary: TC-036、TC-037
- Type: excluded(引数型は TypeScript コンパイル時に保証される)

**失敗系/正常系比（煙感知器）**: 正常系2件（TC-035、TC-038）、失敗系2件（TC-036、TC-037）。件数が同数のためインベントリを再導出したが、本変更は DOM 生成契約のみで失敗源は上表のとおりすべて対応ケースまたは除外理由で充足されており、追加すべき失敗系ケースはないことを確認した。

## S8: Error-dialog-active state used to keep error dialogs open across refresh

> Origin: Feature 060-03 addendum (light-spec-plan)
> Added: 2026-09-29
> Status: active
> Supersedes: -
> Signature: `isErrorDialogActive(): boolean` (new query next to `isDialogActive()`; set by `showErrorDialog(...)`, cleared by every other dialog shown through `showDialog(...)` and by `hideDialog(): void`)
> Target Path: `web/dialogs.ts:7, 203-259` (module state `errorDialogShown`, `showErrorDialog`, `showDialog`, `hideDialog`, `isDialogActive`, `isErrorDialogActive`; line ranges after the Feature 060-03 addendum implementation)
> Test File: `tests/web/dialogs.test.ts`

The refresh-driven auto-close in `web/main.ts` needs to tell error dialogs apart from other dialogs (spec addendum `追補（2026-09-29）再読み込みでエラーダイアログを閉じない`). This section fixes only the state kept by `web/dialogs.ts`: it is true while the dialog on screen was opened by `showErrorDialog`, and false otherwise. The state is not exposed in the DOM, so the error dialog DOM of S7 (TC-035 to TC-038) is unchanged. Which dialogs a refresh closes is owned by `web/main-test/08-request-queue-01.md` S67.

| Case ID | Input / Precondition                                                                                                                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                     | Notes                                                          |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| TC-039  | No dialog has been shown yet                                                                                                                                                            | Boundary - initial state                                                   | `isErrorDialogActive()` returns `false` and `isDialogActive()` returns `false`                                                                                                      | -                                                              |
| TC-040  | `showErrorDialog("Unable to Delete Branch", "error: the branch 'feature' is not fully merged.", null)`                                                                                  | Normal - error dialog shown                                                | `isErrorDialogActive()` returns `true` and `isDialogActive()` returns `true`                                                                                                        | Same three-argument call as the `removeWorktree` response      |
| TC-041  | After TC-040, each of `showConfirmationDialog`, `showRefInputDialog`, `showCheckboxDialog`, `showSelectDialog` and `showFormDialog` is called once (one parameterized row per function) | Normal - another dialog replaces the error dialog                          | For every function, `isErrorDialogActive()` returns `false` while `isDialogActive()` returns `true`, and `#dialog` shows the new dialog instead of the error text                   | Acceptance 3 of the spec addendum depends on this              |
| TC-042  | After TC-040, `hideDialog()` is called                                                                                                                                                  | Normal - hidden by code                                                    | `isErrorDialogActive()` returns `false` and `isDialogActive()` returns `false`                                                                                                      | Hard refresh and Esc close through `hideDialog()`              |
| TC-043  | After TC-040, `#dialogDismiss` is clicked                                                                                                                                               | Normal - dismissed by the user                                             | `#dialog` loses the `active` class and `isErrorDialogActive()` returns `false`                                                                                                      | Dismiss is how the user closes the kept error dialog           |
| TC-044  | After TC-040, `showErrorDialog("Unable to Pull", "CONFLICT", null)` replaces the first error dialog                                                                                     | Boundary - error replaced by another error                                 | `isErrorDialogActive()` returns `true` and `#dialog` shows the second error text                                                                                                    | -                                                              |
| TC-045  | `showConfirmationDialog("Are you sure?", confirmed, null)` without any earlier error dialog                                                                                             | Normal - non-error dialog only                                             | `isErrorDialogActive()` returns `false` while `isDialogActive()` returns `true`                                                                                                     | -                                                              |
| TC-046  | `showErrorDialog("title", "error message", null)`                                                                                                                                       | Normal - error dialog DOM unchanged by the state                           | `#dialog` and `#dialogBacking` have exactly the class `active`, `#dialog` has no attribute other than `id` and `class`, and it contains one `#dialogDismiss` and no `#dialogAction` | The state lives in the module, not in the DOM; S7 stays active |

### Failure source inventory (include-or-justify) - Feature 060-03 addendum (S8)

| Failure source                                                        | Case or reason                                                                                                  |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| The state is not set by `showErrorDialog`                             | TC-040, TC-044                                                                                                  |
| The state survives a non-error dialog, so a refresh keeps that dialog | TC-041, TC-045                                                                                                  |
| The state survives `hideDialog` or Dismiss                            | TC-042, TC-043                                                                                                  |
| The state starts as true                                              | TC-039                                                                                                          |
| The error dialog DOM gains a marker or changes structure              | TC-046                                                                                                          |
| Refresh, hard refresh and context menu decisions                      | excluded (owned by `web/main-test/08-request-queue-01.md` S67)                                                  |
| Invalid argument types                                                | excluded (the query takes no argument; `showErrorDialog` argument types are checked by the TypeScript compiler) |

### Feature 060-03 addendum test mapping and execution evidence (S8)

Test file: `tests/web/dialogs.test.ts`, describe `isErrorDialogActive` (`@see` this file). TC-039 loads a fresh copy of the module with `vi.resetModules()` so the initial state is observed. TC-041 is one parameterized test with one row per dialog function. The describe column comes first because the perspectives index counts rows whose first cell is a Case ID.

| describe              | Case ID | Test Method                                                                                                                                                                      | Result            |
| --------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `isErrorDialogActive` | TC-039  | returns false before any dialog is shown (TC-039)                                                                                                                                | pass (2026-09-29) |
| `isErrorDialogActive` | TC-040  | returns true while an error dialog is shown (TC-040)                                                                                                                             | pass (2026-09-29) |
| `isErrorDialogActive` | TC-041  | returns false after $name replaces the error dialog (TC-041), 5 rows: `showConfirmationDialog`, `showRefInputDialog`, `showCheckboxDialog`, `showSelectDialog`, `showFormDialog` | pass (2026-09-29) |
| `isErrorDialogActive` | TC-042  | returns false after hideDialog closes the error dialog (TC-042)                                                                                                                  | pass (2026-09-29) |
| `isErrorDialogActive` | TC-043  | returns false after the user clicks Dismiss (TC-043)                                                                                                                             | pass (2026-09-29) |
| `isErrorDialogActive` | TC-044  | stays true when another error dialog replaces the first one (TC-044)                                                                                                             | pass (2026-09-29) |
| `isErrorDialogActive` | TC-045  | returns false while only a confirmation dialog is shown (TC-045)                                                                                                                 | pass (2026-09-29) |
| `isErrorDialogActive` | TC-046  | keeps the error dialog DOM free of any state marker (TC-046)                                                                                                                     | pass (2026-09-29) |

- GREEN (2026-09-29): `pnpm exec vitest run tests/web/dialogs.test.ts` gave `Tests 50 passed (50)`. The query does not exist at the base `1339842`, so these cases have no RED run of their own; the main regression RED is recorded in `web/main-test/08-request-queue-01.md` S67.

## S9: モーダルのフォーカス・Tab 循環・Escape keydown・IME 保護・起点復元

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: S1
> Signature: `showFormDialog(message, inputs, actionName, actioned, sourceElem, afterCreate?)` / `showConfirmationDialog(...)` / `showErrorDialog(message, reason, sourceElem, explanation?)` / `hideDialog(): void`（公開 signature は維持）/ `#dialog` の `role="dialog"`・`aria-modal`・名前 / 内部 `keydown`（`Enter` / `Escape` / `Tab`）/ `isKeyboardActionBlocked(event)` / `captureFocusOrigin` / `restoreFocus`
> Target Path: `web/dialogs.ts:53-60, 136-262, 270-490`（`DialogSession` / `lastDialogFocus` / `inertBackground`、入力 HTML と `initialFormInput` / `showFormDialog`、`showErrorDialog`、`captureSession` / `focusOrigin` / `tabStops` / `focusInDialog` / `cycleFocus` / `handleEnter` / `handleDialogKeydown` / `handleDocumentFocusIn` / `excludeBackground` / `restoreBackground` / `closeSession` / `showDialog` / `hideDialog` / `isDialogActive` / `isErrorDialogActive`）
> Test File: `tests/web/dialogs.test.ts`

対応プラン §3.7.2 R4.6 と Task 6 の観点。S1（フォーカス優先順位）は入力なしのダイアログで「フォーカスなし」（TC-003）としていたが、入力がなければ取消 / 閉じる button へ初期フォーカスする契約へ変わるため置き換える。S1 の text-ref → text の優先（TC-001 / TC-002 / TC-004）は本節へ引き継ぐ。S2（Enter 確定）は有効 / 無効状態の意味が変わらないため active のまま additive（IME と二重発火は本節）。fixture は `#dialog` / `#dialogBacking` と背景の `#refreshBtn`、`sourceElem`（メニューの起点）を持つ jsdom で、`actioned` / `confirmed` は `vi.fn()`。

| Case ID | Input / Precondition                                                                                                                                                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                  | Notes                                                                                            |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| TC-047  | `sourceElem` に実フォーカスがある状態で、メニュー実行相当として `showFormDialog`（text-ref 入力 1 件 + text 入力 1 件）を呼ぶ                                                                      | Normal - dialog へフォーカス移譲（text-ref 優先）                          | `activeElement` が text-ref の `input`、`#dialog` が `active`。text-ref が無く text 入力だけなら最初の text `input`（S1 TC-001 / TC-002 / TC-004 の引き継ぎ）                                                                    | K32。select / checkbox だけの入力なら最初の `select` / `checkbox`                                |
| TC-048  | text-ref 入力に不正値（`..`、空）を入れて `Enter`、続けて正しい値（`feature/x`）を入れて `Enter`（keydown → keyup）                                                                                | Normal / Validation - 入力検証を通した実行                                 | 不正値では `actioned` 0 回で `#dialog` が開いたまま（`inputInvalid` / `noInput` と action button の `disabled` が同期）、正しい値では `actioned` が `["feature/x", ...]` で 1 回、`#dialog` が閉じる。keyup で追加 0 回          | K32 / A8.1-6。S5 の検証ロジックを経由                                                            |
| TC-049  | `showConfirmationDialog`（入力なし）と `showErrorDialog`（入力なし）を呼ぶ                                                                                                                         | Normal - 入力なしは取消 / 閉じるへ初期フォーカス                           | `activeElement` が取消（`dismiss`）button / 閉じる button で、`button` 要素・`type="button"`・名前（文言）を持つ                                                                                                                 | K33。S1 TC-003「フォーカスなし」の契約変更                                                       |
| TC-050  | 入力 2 件 + action + dismiss の dialog で `Tab` を 5 回、末尾の dismiss で `Tab`、先頭の入力で Shift + `Tab`                                                                                       | Normal / Boundary - 内部循環                                               | 順に 入力 1 → 入力 2 → action → dismiss → 入力 1（循環）。末尾の `Tab` と先頭の Shift + `Tab` が消費され、`activeElement` が `#dialog` の外（`#refreshBtn`）へ出ない。無効化された action は飛ばす                               | K33 / A8.3-4。VS Code 下限環境向けに `inert` だけに依存しない Tab trap                           |
| TC-051  | 入力に実フォーカスして `Escape` keydown → keyup。`sourceElem` を起点に開いた場合                                                                                                                   | Normal - Escape keydown で dialog だけ閉じ起点へ                           | keydown で `#dialog` の `active` が外れ `actioned` 0 回、`activeElement` が `sourceElem`（`restoreFocus(origin, "keyboard")`）。keydown が消費され上位の Escape 列へ流れない。keyup で変化なし                                   | K33 / A8.3-4                                                                                     |
| TC-052  | dialog を開いた状態で `Escape` の `keyup` だけを送る                                                                                                                                               | Validation - keyup では閉じない                                            | `#dialog` が `active` のまま                                                                                                                                                                                                     | R4.6「Escapeの閉鎖はkeydownに統一し、keyupでは閉じない」                                         |
| TC-053  | text 入力で `compositionstart` → `Enter` keydown（`isComposing: true`）→ `compositionend` → `Enter` keyup。続けて通常の `Enter`                                                                    | Validation - IME 変換中の Enter で実行しない                               | IME 中の Enter と対応 keyup で `actioned` 0 回、`#dialog` 開いたまま。通常の `Enter` で 1 回                                                                                                                                     | K34 / A8.3-2                                                                                     |
| TC-054  | 有効な入力で `Enter` keydown（`repeat: true`）× 3                                                                                                                                                  | Validation - repeat で多重実行しない                                       | `actioned` 0 回（repeat は実行キーとして阻止）                                                                                                                                                                                   | A8.3-2                                                                                           |
| TC-055  | `showFormDialog` の DOM 属性。`name` が空の入力を含む                                                                                                                                              | Normal - role / aria-modal / 名前 / label                                  | `#dialog` が `role="dialog"`、`aria-modal="true"`、`aria-labelledby`（または `aria-label`）が質問文を指す。各入力が `label` で関連付けられ（`for` / `id`）、`name` が空の入力は dialog の質問文を `aria-labelledby` で名前にする | R4.6 / A8.1-6                                                                                    |
| TC-056  | dialog 表示中に背景の `#refreshBtn` と行 `M` の `tabindex` / `inert` 相当を調べ、`#refreshBtn` へ `focusin` を発火。別途 `document` へ Ctrl+F keydown                                              | Validation - 背景の停止点とショートカットを除外                            | 背景の操作が停止点から外れ（`tabindex="-1"` または `inert`）、`focusin` 後の `activeElement` が dialog 内へ戻る。Ctrl+F が `findWidget` を開かない（dialog が消費）                                                              | R4.6「ダイアログ表示中は背後へフォーカス・ショートカットを通さず」。閉鎖時に背景の元の状態を戻す |
| TC-057  | action button に実フォーカスして `Enter` keydown → keyup（`click` リスナーも登録）                                                                                                                 | Validation - フォーム用 handler と click の二重発火なし                    | `actioned` が合計 1 回                                                                                                                                                                                                           | A8.3-2。ネイティブ click の生成は jsdom 外のため Task 12 の実 Webview 確認へ                     |
| TC-058  | dialog A（`sourceElem` 起点）を開いたまま dialog B（確認）へ置換し、A の `hideDialog` 相当の閉鎖処理を呼ぶ。別途 B 表示中に非同期 error（`showErrorDialog`）が到着し、その後 error dialog を閉じる | Validation - 古い閉鎖は focus を戻さず、現在の所有者だけ復元               | A の閉鎖処理後も `activeElement` が B 内（`sourceElem` へ戻らない）。error dialog の閉鎖では、error dialog が現在の所有者である場合だけ起点へ復元し、そうでなければ `activeElement` を変えない                                   | K46 / A8.3-3                                                                                     |

### 失敗源インベントリ（include-or-justify）— Feature 061-05 追加分（S9）

| 失敗源                                              | 対応ケースまたは除外理由                                    |
| --------------------------------------------------- | ----------------------------------------------------------- |
| 初期フォーカスの誤り（入力あり / なし）             | TC-047、TC-049                                              |
| 不正値で実行、正しい値で実行しない                  | TC-048                                                      |
| Tab が外へ出る、無効 button に止まる                | TC-050                                                      |
| Escape で起点へ戻らない、keyup で閉じる、上位へ流す | TC-051、TC-052                                              |
| IME / repeat / 二重発火                             | TC-053、TC-054、TC-057                                      |
| role / 名前 / label の欠落                          | TC-055                                                      |
| 背景の停止点・ショートカット                        | TC-056                                                      |
| 古い閉鎖の復元、非同期 error の所有者判定           | TC-058                                                      |
| 外部依存・例外                                      | excluded(callback は spy で外部依存と throw 経路を持たない) |

### Task 12 テスト対応（Feature 061-05）— S9

- テスト: `tests/web/dialogs.test.ts` describe `modal focus, Tab cycle, Escape keydown, IME guard and origin restore (S9)`。fixture は `configureFocusContext` と `installKeyboardGuards` を `beforeEach` で登録し `afterEach` で破棄（`vi.resetModules` 後の旧 listener なし）、`activeElement()` で復元を判定
- TC-047 2 `it`（text-ref 優先 / text のみ）/ TC-048 `runs the action only after a valid ref value and never on keyup` / TC-049 `it.each`（confirmation / error の初期フォーカス）＋ `renders the action button as a native type=button with its name` / TC-050 2 `it`（循環 / 無効 button を飛ばす）/ TC-051 2 `it`（Escape keydown / dismiss button）/ TC-052 2 `it`（keyup 単独 / repeat）/ TC-053 `does not run the action for Enter during IME composition` / TC-054 `does not run the action for repeated Enter keydown` / TC-055 2 `it` / TC-056 2 `it`（背景の除外と復元 / 既に `inert` の要素）/ TC-057 2 `it`（Enter 1 回で 1 回実行 + 遅延 click で追加 0 / 無効 button）/ TC-058 2 `it`（置換後の古い閉鎖 / 非同期 error の所有者）
- 手動 Case（未実施）TC-053（IME）/ TC-056（`inert`、VS Code 1.74 以上）/ TC-057（native button の Enter → click 1 回）: 手順・期待・影響・代替確認は `web/main-test/13-keyboard-accessibility-01.md` 冒頭の手動一覧（dialogs の行）。jsdom では TC-057 を keydown の `defaultPrevented === true` と、切り離した button への `click()` 追加実行 0 回で代替した
- 実行結果（2026-10-07）: 20 件 pass
