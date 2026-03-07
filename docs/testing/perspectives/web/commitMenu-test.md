# テスト観点表: web/commitMenu.ts

> Source: `web/commitMenu.ts`
> Generated: 2026-03-07T00:00:00+09:00

## S1: Create Branch ダイアログ（checkout チェックボックス付き）

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07

**テスト対象パス**: `web/commitMenu.ts:59-75`

| Case ID | Input / Precondition                           | Perspective (Equivalence / Boundary) | Expected Result                                              | Notes                     |
| ------- | ---------------------------------------------- | ------------------------------------ | ------------------------------------------------------------ | ------------------------- |
| TC-001  | Create Branch メニュー項目選択                 | Equivalence - normal                 | showFormDialog が text-ref + checkbox の 2 要素で呼ばれる    | showRefInputDialog でない |
| TC-002  | ダイアログ表示時のチェックボックスデフォルト値 | Equivalence - normal                 | Check out チェックボックスのデフォルトが ON (true) である    | 設計仕様                  |
| TC-003  | 有効なブランチ名 + checkout=true で送信        | Equivalence - normal                 | RequestCreateBranch メッセージに checkout: true が含まれる   | -                         |
| TC-004  | 有効なブランチ名 + checkout=false で送信       | Equivalence - normal                 | RequestCreateBranch メッセージに checkout: false が含まれる  | -                         |
| TC-005  | ブランチ名が空で送信                           | Boundary - empty name                | ダイアログのバリデーションにより送信が阻止される             | 既存バリデーション維持    |
| TC-006  | ブランチ名に不正文字を含む（refInvalid）       | Boundary - invalid ref               | ダイアログのリアルタイム検証でエラーインジケータが表示される | 既存バリデーション維持    |
