# テスト観点表: web/refMenu.ts

## S1: checkoutBranchAction() ブランチ名提案ロジック

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 2.2
> Added: 2026-02-25

**シグネチャ**: `checkoutBranchAction(repo: string, sourceElem: HTMLElement, refName: string, isRemoteCombined?: boolean): void`
**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition             | Perspective (Equivalence / Boundary) | Expected Result | Notes                                |
| ------- | -------------------------------- | ------------------------------------ | --------------- | ------------------------------------ |
| TC-001  | refName = "origin/feature/ebook" | Equivalence - normal (2階層)         | "feature/ebook" | 最初のスラッシュ以降を取得           |
| TC-002  | refName = "origin/main"          | Equivalence - normal (1階層)         | "main"          | リモート名のみ除去                   |
| TC-003  | refName = "origin/a/b/c"         | Equivalence - normal (3階層)         | "a/b/c"         | 深いネスト対応                       |
| TC-004  | refName = "upstream/feature/x"   | Equivalence - normal (別リモート)    | "feature/x"     | originではないリモート名             |
| TC-005  | refName = "origin"               | Boundary - スラッシュなし            | "" (空文字列)   | 仕様上通常は発生しないが防御的に処理 |
| TC-006  | refName = "o/x"                  | Boundary - min (最短パス)            | "x"             | 1文字リモート名 + 1文字ブランチ名    |

## S2: buildRefContextMenuItems() Pull/Pushメニュー項目

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 3.3
> Added: 2026-02-25

**シグネチャ**: `buildRefContextMenuItems(repo: string, refName: string, sourceElem: HTMLElement, isRemote: boolean, gitBranchHead: string | null): (ContextMenuElement | null)[]`
**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                           | Perspective (Equivalence / Boundary) | Expected Result                     | Notes                        |
| ------- | ---------------------------------------------- | ------------------------------------ | ----------------------------------- | ---------------------------- |
| TC-007  | gitBranchHead === refName (カレントブランチ)   | Equivalence - normal                 | メニューにPull/Push項目が含まれる   | メニュー先頭に配置           |
| TC-008  | Pull/Push項目のタイトル                        | Equivalence - normal                 | "Pull" と "Push"                    | 表示文言の確認               |
| TC-009  | gitBranchHead !== refName (非カレントブランチ) | Equivalence - exclusion              | メニューにPull/Push項目が含まれない | カレントブランチのみ表示     |
| TC-010  | refType === "remote" (リモートブランチ)        | Equivalence - exclusion              | メニューにPull/Push項目が含まれない | ローカルカレントブランチのみ |
