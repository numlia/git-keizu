# テスト観点表: web/messageHandler.ts

## S1: handleMessage() pull/pushレスポンス処理

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 3.3
> Added: 2026-02-25

**シグネチャ**: `handleMessage(msg: ResponseMessage, gitGraph: GitGraphViewAPI): void`
**テスト対象パス**: `web/messageHandler.ts`

| Case ID | Input / Precondition                   | Perspective (Equivalence / Boundary) | Expected Result                                | Notes                   |
| ------- | -------------------------------------- | ------------------------------------ | ---------------------------------------------- | ----------------------- |
| TC-001  | ResponsePull: status = null            | Equivalence - normal (success)       | グラフリフレッシュが呼ばれる                   | refreshOrError パターン |
| TC-002  | ResponsePush: status = null            | Equivalence - normal (success)       | グラフリフレッシュが呼ばれる                   | refreshOrError パターン |
| TC-003  | ResponsePull: status = "error message" | Equivalence - error                  | エラーダイアログ "Unable to Pull" が表示される | gitメッセージ表示       |
| TC-004  | ResponsePush: status = "error message" | Equivalence - error                  | エラーダイアログ "Unable to Push" が表示される | gitメッセージ表示       |
