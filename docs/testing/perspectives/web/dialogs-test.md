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
