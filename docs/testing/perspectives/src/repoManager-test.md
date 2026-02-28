# テスト観点表: src/repoManager.ts

> Source: `src/repoManager.ts`
> Generated: 2026-02-27T00:00:00+09:00

## S1: registerRepoFromUri() URI からのリポジトリ登録

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27

**シグネチャ**: `registerRepoFromUri(uri: vscode.Uri): Promise<void>`
**テスト対象パス**: `src/repoManager.ts`

| Case ID | Input / Precondition                          | Perspective (Equivalence / Boundary) | Expected Result                                           | Notes          |
| ------- | --------------------------------------------- | ------------------------------------ | --------------------------------------------------------- | -------------- |
| TC-001  | URI が既に登録済みリポジトリを指す            | Equivalence - normal (existing)      | addRepo が呼ばれない、既存状態維持                        | 重複登録防止   |
| TC-002  | URI が未登録の有効な Git リポジトリを指す     | Equivalence - normal (new repo)      | addRepo が呼ばれ、sendRepos でビューに通知される          | 新規登録フロー |
| TC-003  | URI が Git リポジトリでないディレクトリを指す | Equivalence - abnormal (non-git)     | isGitRepository が false を返し、登録処理がスキップされる | 事前検証       |
