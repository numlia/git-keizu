# テスト観点表: web/uncommittedMenu.ts

> Source: `web/uncommittedMenu.ts`
> Generated: 2026-03-09T00:00:00+09:00

## S1: Stash Push Include Untracked デフォルト値

> Origin: Feature 014 (dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-09

**テスト対象パス**: `web/uncommittedMenu.ts:16-43`

| Case ID | Input / Precondition                                                    | Perspective (Equivalence / Boundary) | Expected Result                                                                     | Notes        |
| ------- | ----------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------- | ------------ |
| TC-001  | viewState.dialogDefaults.stashUncommittedChanges.includeUntracked=true  | Equivalence - normal                 | Include Untracked checkbox が ON（checked）で表示される                             | 設定反映     |
| TC-002  | viewState.dialogDefaults.stashUncommittedChanges.includeUntracked=false | Equivalence - normal                 | Include Untracked checkbox が OFF（unchecked）で表示される                          | 設定反映     |
| TC-003  | Stash Push ダイアログの全体構成                                         | Equivalence - normal                 | text（Message）+ checkbox（Include Untracked）の 2 要素で showFormDialog が呼ばれる | 既存構成維持 |
