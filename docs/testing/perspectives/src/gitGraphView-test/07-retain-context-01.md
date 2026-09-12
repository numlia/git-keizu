# テスト観点表: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Generated: 2026-09-12T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: retain-context

## S35: retainContextWhenHidden 設定の panel option 反映と再表示時の分岐

> Origin: Feature 056 (retain-context-when-hidden) issue #48
> Added: 2026-09-12
> Status: active
> Supersedes: -
> Signature: `public static createOrShow()` の `createWebviewPanel` option / `onDidChangeViewState` handler の visible 分岐
> Target Path: `src/gitGraphView.ts`（`createOrShow()`・constructor の view-state handler）
> Test File: `tests/src/gitGraphView.test.ts`

`getConfig().retainContextWhenHidden()` を panel 生成時に 1 回読み、`createWebviewPanel` の `retainContextWhenHidden` option と、再表示時の分岐の両方に同じ値を使う観点。保持有効なら再表示時に webview へ `{ command: "refresh" }` を送るだけで HTML を再生成せず、無効なら従来どおり `update()` で HTML を再生成する。非表示時の処理（`currentRepo` の初期化と watcher 停止）は S18 / TC-064 の責務で本表には含めない。

| Case ID | Input / Precondition                                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                       | Notes                                |
| ------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| TC-364  | 設定が `true` の状態で `createOrShow()` を呼ぶ                                                        | Normal - option の受け渡し（有効）                                         | `createWebviewPanel` が `retainContextWhenHidden: true` を含む option で 1 回呼ばれる                                                                 | 既定値                               |
| TC-365  | 設定が `false` の状態で `createOrShow()` を呼ぶ                                                       | Normal - option の受け渡し（無効）                                         | `createWebviewPanel` が `retainContextWhenHidden: false` を含む option で呼ばれる                                                                     | 従来挙動の選択                       |
| TC-366  | 設定 `true` で panel を生成し初期 HTML が入った後、`visible=false` → `visible=true` と handler を呼ぶ | Normal - 保持時の再表示                                                    | `postMessage` が `{ command: "refresh" }` で 1 回だけ呼ばれ、`loadWebviewMessages` の call count が初期生成の 1 回のままである（HTML 再生成なし）     | 再表示は soft refresh のみ           |
| TC-367  | 設定 `false` で同じ遷移を行う                                                                         | Normal - 非保持時の再表示                                                  | `loadWebviewMessages` の call count が 2 になる（HTML 再生成）まで待ち、その間 `postMessage` は呼ばれない                                             | `refresh` を送らない                 |

### 失敗源インベントリ（include-or-justify）— Feature 056 追加分（S35）

| 失敗源                                                    | 対応ケースまたは除外理由                                                                                                                  |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 設定値が panel option へ渡らない                          | TC-364、TC-365                                                                                                                            |
| 保持有効時に HTML を再生成して保持を無効化する            | TC-366                                                                                                                                    |
| 保持無効時に `refresh` だけ送って破棄済み webview へ届かない | TC-367                                                                                                                                    |
| 再表示時に `refresh` が重複送信される                     | TC-366（call count 1）                                                                                                                    |
| 再表示の分岐が生成時と異なる設定値を読む                  | excluded(生成時の値を constructor 引数で固定する設計。実行中の設定変更は次回 panel 生成で反映され、本表では設定変更イベントを扱わない) |
| 非表示時の watcher 停止・`currentRepo` 初期化の欠落       | excluded(S18 TC-064 で既存担保)                                                                                                           |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL）     | excluded(入力は boolean のみ。`true` / `false` の両値を TC-364〜TC-367 で網羅)                                                             |
| 外部依存×失敗モード                                       | excluded(`createWebviewPanel` の失敗は VS Code API 側で、本変更で例外経路を追加しない)                                                     |
| 例外・エラー経路                                          | excluded(分岐に throw を追加しない)                                                                                                       |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(boolean 設定の検証は `src/config.ts` owner)
- Exception: excluded(上表のとおり)
- External: excluded(上表のとおり)
- Boundary: excluded(上表のとおり)
- Type: excluded(boolean の既定値契約は `src/config-test/05-feature-056-retain-context-01.md` S20)
- Normal: TC-364〜TC-367

**失敗系/正常系比（煙感知器）**: 正常系4件、失敗系0件。boolean 1 値で決まる 2 分岐の配線であり、失敗源は上表で全て既存 section か owner へ帰着することを確認した。比率合わせのためのケース追加は行わない。
