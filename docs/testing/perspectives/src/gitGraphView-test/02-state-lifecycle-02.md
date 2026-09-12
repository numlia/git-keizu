# テスト観点表: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Generated: 2026-09-12T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: state-lifecycle

## S40: createOrShow() 先行呼び出しが生成したパネルの閉鎖で待機中の呼び出しを止める

> Origin: Feature 057 (multi-repo-single-folder-workspace) issue #49 PR #60 レビュー指摘
> Added: 2026-09-12
> Status: active
> Supersedes: -
> Signature: `public static createOrShow(extensionPath: string, dataSource: DataSource, extensionState: ExtensionState, avatarManager: AvatarManager, repoManager: RepoManager, rootUri?: vscode.Uri): Promise<void>`
> Target Path: `src/gitGraphView.ts`（`open()`と`dispose()`）
> Test File: `tests/src/gitGraphView.test.ts`

S38（`02-state-lifecycle-01.md`）は呼び出し時点に存在したパネルの閉鎖だけを検知していた。本セクションは、パネル閉鎖のたびに進むカウンタ（`panelCloseCount`、`dispose()`で加算）を呼び出し時点で記録し、待機中に進んでいればパネル生成・`reveal`・`selectRepo`のいずれも行わずに`Promise`を完了させることを固定する。呼び出し時点にパネルが無く、先行呼び出しが生成したパネルをユーザーが閉じた場合も対象になる。定数はS36と同じ。

| Case ID | Input / Precondition                                                                                                                                                                                                                                                                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                 | Notes                    |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| TC-397  | `currentPanel`なし、`getRepos()`が`{}`。`SCM_REPO`の`rootUri`→`SIBLING_REPO`の`rootUri`の順に`createOrShow`を呼び、独立したdeferred d1・d2を返す。d1をresolve（`{ [SCM_REPO] }`へ）して1回目の`Promise`完了を待ち、`currentPanel.dispose()`で閉じてからd2をresolve（`{ [SCM_REPO], [SIBLING_REPO] }`へ） | Boundary - 先行が生成したパネルの閉鎖後の完了                              | 1回目完了時点で`createWebviewPanel`1回。2回目完了後も`createWebviewPanel`は1回のまま、`currentPanel`が`undefined`、`reveal`0回、`selectRepo`0件 | 閉じたタブを作り直さない |

### 失敗源インベントリ（include-or-justify）— PR #60 レビュー対応分（S40）

| 失敗源                                                                       | 対応ケースまたは除外理由                               |
| ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| 呼び出し時点にパネルが無かった待機中の呼び出しが、閉じられたパネルを作り直す | TC-397                                                 |
| 呼び出し時点に存在したパネルの閉鎖                                           | S38 TC-394 / TC-395が所有                              |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL）                        | 閉鎖0回（通常完了）はS36 TC-376が所有。閉鎖1回: TC-397 |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(`rootUri`は`Uri`型で、拒否分岐を持たない)
- Exception: excluded(`open()`内でthrow・catchを追加しない)
- External: excluded(登録rejectはS36 / S37 / S39が所有)
- Boundary: TC-397
- Type: excluded(型はコンパイル時に保証)
- Normal: excluded(閉鎖の無い通常完了はS36 / S37が所有)

**失敗系/正常系比（煙感知器）**: 正常系0件、失敗系1件（Boundary 1件）。正常系は既存セクションが所有するため比率合わせのケース追加は行わない。
