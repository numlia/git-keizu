# テスト観点表: web/main.ts

> Source: `web/main.ts`
> Generated: 2026-04-04T12:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: file-actions

## S36: bindFileViewListeners() openFile クリックハンドラ

> Origin: Feature 026 (commit-detail-open-file) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: active
> Supersedes: -

**シグネチャ**: `bindFileViewListeners(): void`
**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                      | Notes                     |
| ------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------- |
| TC-202  | コミットが展開されている + .openFile 要素をクリック            | Normal - standard                                                          | vscode.postMessage が { command: "openFile", repo, filePath, commitHash } で呼ばれる | 既存 TC-039 パターン参考  |
| TC-203  | .openFile をクリック + 親 .gitFile にも click ハンドラあり     | Normal - event isolation                                                   | stopPropagation が呼ばれ、親 .gitFile の viewDiff ハンドラが発火しない               | イベント伝播停止の検証    |
| TC-204  | expandedCommit が null                                         | Validation - null guard                                                    | vscode.postMessage が呼ばれない                                                      | ガード条件の検証          |
| TC-205  | data-newfilepath が URL エンコード済み（"src%2Fmy%20file.ts"） | Normal - URI decoding                                                      | filePath が "src/my file.ts" にデコードされてメッセージに含まれる                    | decodeURIComponent の検証 |
| TC-206  | data-newfilepath に特殊文字（日本語ファイル名等）を含む        | Boundary - special characters                                              | filePath がデコード後の正しい文字列でメッセージに含まれる                            | Unicode 文字の処理        |
