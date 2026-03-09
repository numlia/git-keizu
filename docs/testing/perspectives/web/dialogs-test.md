# テスト観点表: web/dialogs.ts

## S1: showFormDialog() フォーカス優先順位

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 5.2
> Added: 2026-02-25

**シグネチャ**: `showFormDialog(title: string, inputs: DialogInput[], actionName: string, actioned: (values: string[]) => void, sourceElem: HTMLElement | null): void`
**テスト対象パス**: `web/dialogs.ts`

| Case ID | Input / Precondition                                | Perspective (Equivalence / Boundary) | Expected Result                    | Notes               |
| ------- | --------------------------------------------------- | ------------------------------------ | ---------------------------------- | ------------------- |
| TC-001  | text-ref入力あり + text入力あり                     | Equivalence - normal                 | text-ref入力にフォーカス           | 最優先              |
| TC-002  | text-ref入力なし + text入力あり (Stashダイアログ等) | Equivalence - normal                 | 最初のtext入力にフォーカス         | REQ-9.1の主要ケース |
| TC-003  | text-ref入力なし + text入力なし                     | Boundary - フィールドなし            | フォーカスなし（エラーにならない） | 確認ダイアログ等    |
| TC-004  | text入力が複数ある場合                              | Equivalence - normal                 | 最初（先頭）のtext入力にフォーカス | 順序の確認          |

## S2: showFormDialog() Enterキー確定

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 5.2
> Added: 2026-02-25

**シグネチャ**: `showFormDialog() 内部 keydown イベントハンドラ`
**テスト対象パス**: `web/dialogs.ts`

| Case ID | Input / Precondition                   | Perspective (Equivalence / Boundary) | Expected Result                           | Notes                                    |
| ------- | -------------------------------------- | ------------------------------------ | ----------------------------------------- | ---------------------------------------- |
| TC-005  | ダイアログ有効状態 + Enterキー押下     | Equivalence - normal                 | アクションボタンのclickがトリガーされる   | 主要ケース                               |
| TC-006  | Enterキー押下                          | Equivalence - normal                 | event.preventDefault()が呼ばれる          | デフォルト動作抑制                       |
| TC-007  | noInputクラス付き + Enterキー押下      | Equivalence - disabled state         | アクションボタンのclickがトリガーされない | 無効状態                                 |
| TC-008  | inputInvalidクラス付き + Enterキー押下 | Equivalence - disabled state         | アクションボタンのclickがトリガーされない | バリデーション失敗状態                   |
| TC-009  | Escapeキー押下                         | Equivalence - wrong key              | アクションボタンのclickがトリガーされない | Enter以外のキー                          |
| TC-010  | Tabキー押下                            | Equivalence - wrong key              | アクションボタンのclickがトリガーされない | Enter以外のキー                          |
| TC-011  | ダイアログ有効状態 + Shift+Enterキー   | Boundary - modifier key              | テスト環境に応じた動作確認                | 修飾キー付きの場合の考慮が必要か設計確認 |

## S3: showFormDialog() info ツールチップ描画

> Origin: Feature 014 (dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-09

**テスト対象パス**: `web/dialogs.ts`

| Case ID | Input / Precondition                               | Perspective (Equivalence / Boundary) | Expected Result                                                      | Notes          |
| ------- | -------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------- | -------------- |
| TC-012  | checkbox に info="説明テキスト" プロパティあり     | Equivalence - normal                 | info icon (SVG) が描画され、title 属性に "説明テキスト" が設定される | -              |
| TC-013  | checkbox に info プロパティなし（undefined）       | Equivalence - normal (no info)       | info icon が描画されない                                             | 既存動作維持   |
| TC-014  | info テキストに HTML 特殊文字 `<script>&"'` を含む | Boundary - special chars (XSS)       | title 属性内で HTML エスケープされる                                 | XSS 防止       |
| TC-015  | multi フォーム（text + checkbox with info）        | Equivalence - normal (multi layout)  | checkbox 行の適切な位置に info icon が配置される                     | レイアウト確認 |
| TC-016  | single フォーム（checkbox with info のみ）         | Equivalence - normal (single layout) | checkbox label 直後に info icon が配置される                         | レイアウト確認 |
