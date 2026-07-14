# テスト観点表: web/dialogs.ts

> Source: `web/dialogs.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: showFormDialog() フォーカス優先順位

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 5.2
> Added: 2026-02-25
> Status: active
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
