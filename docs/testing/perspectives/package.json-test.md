# テスト観点表: package.json

> Source: `package.json`
> Generated: 2026-05-17T00:00:00Z
> Language: JSON (VS Code contributes schema)
> Test Framework: Vitest
> Storage Mode: single-file

## S1: contributes.configuration の minimum / pattern 検証 (Feature 040)

> Origin: Feature 040 (settings-and-copy-polish) (light-spec-plan)
> Added: 2026-05-17
> Status: active
> Supersedes: -
> Target Path: `package.json` (`contributes.configuration.properties`)
> Test File: `tests/src/config-defaults.test.ts`

`git-keizu.initialLoadCommits` / `git-keizu.loadMoreCommits` に `minimum: 1` が設定され、`git-keizu.graphColours.items.pattern` が rgba 4 引数 alternative を含むことを検証する。

| Case ID | Input / Precondition                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result          | Notes              |
| ------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------ | ------------------ |
| TC-001  | `git-keizu.initialLoadCommits` schema 読み込み                | Normal - schema                                                            | `minimum` プロパティが 1 | 1 未満を拒否       |
| TC-002  | `git-keizu.loadMoreCommits` schema 読み込み                   | Normal - schema                                                            | `minimum` プロパティが 1 | 1 未満を拒否       |
| TC-003  | pattern に `rgba(1, 2, 3, 0.5)` / `rgba(1, 2, 3, 1)` をテスト | Normal - RGBA accepted                                                     | 両方が pattern にマッチ  | alpha 0-1 を許可   |
| TC-004  | pattern に `rgba(1, 2, 3)` をテスト                           | Validation - 3 args rejected                                               | pattern にマッチしない   | 3 引数 rgba は拒否 |
| TC-005  | pattern に `rgba(1, 2, 3, 1.5)` をテスト                      | Validation - alpha out of range                                            | pattern にマッチしない   | alpha > 1 を拒否   |
| TC-006  | pattern に `#0085d9` / `#0085d9cc` / `rgb(1, 2, 3)` をテスト  | Normal - classic forms                                                     | 全てが pattern にマッチ  | HEX/RGB の維持確認 |

## S2: 開発依存のCritical・High解消 (Feature 046)

> Origin: Feature 046 (dev-dependency-security-update) (light-spec-plan)
> Added: 2026-08-03
> Status: active
> Supersedes: -
> Signature: `package.json#devDependencies`
> Target Path: `package.json` (`devDependencies`)
> Test File: なし（コマンド受け入れ）

開発依存のCritical・High脆弱性を、既存メジャーバージョン内の最小差分で解消する契約を検証する。依存監査の結果はnpmレジストリの外部データで変動するため固定値のVitestテストは持たず、各ケースはコマンド実行または手動確認で受け入れる。

| Case ID | Input / Precondition                                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                       | Notes                                                  |
| ------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| TC-007  | `git diff -- package.json`で直接依存の差分を確認                                                      | Normal - 直接依存の差分範囲                                                | 差分が`@vscode/vsce: ^3.9.2`、`vite: ^7.3.6`、`vitest: ^4.1.10`の3項目だけで、他の直接依存・`dependencies`・scripts・contributes・enginesに差分がない | 範囲指定は`^`のまま維持する                            |
| TC-008  | 更新後の`pnpm-lock.yaml`で`pnpm install --frozen-lockfile`を実行                                      | Normal - frozen lockfile install                                           | 終了コード0で完了し、manifestとlockの不整合エラーが出力されない                                                                                       | 依存導入の再現可能性を確認する                         |
| TC-009  | 全依存に対し`pnpm audit --audit-level=high`を実行                                                     | External - レジストリ監査（全依存）                                        | 終了コード0で、Critical 0件・High 0件が報告される                                                                                                     | 監査データはnpmレジストリ由来で変動する                |
| TC-010  | production依存に対し`pnpm audit --prod --audit-level=low`を実行                                       | External - レジストリ監査（production依存）                                | 既知脆弱性0件が報告される                                                                                                                             | `dependencies`は空でVSIXへ`node_modules`を収録しない   |
| TC-011  | `pnpm why vitest vite rollup @vscode/vsce undici flatted markdown-it js-yaml postcss minimatch`を実行 | Validation - 旧脆弱解決の不在                                              | 指定10パッケージのどの依存経路にも脆弱な旧解決（Vitest 4.0.18、Vite 7.3.1、Rollup 4.58.0、Undici 7.22.0）が現れない                                   | 経路単位で残存を判定する                               |
| TC-012  | `pnpm list vite --depth Infinity`を実行                                                               | Boundary - Viteメジャー境界                                                | 列挙される全Vite解決が7系で、8系のエントリが0件                                                                                                       | メジャー境界を越える更新を禁止する                     |
| TC-013  | `pnpm run format`を実行                                                                               | Normal - format受け入れ                                                    | 終了コード0                                                                                                                                           | `oxfmt --check`                                        |
| TC-014  | `pnpm run lint`を実行                                                                                 | Normal - lint受け入れ                                                      | 終了コード0                                                                                                                                           | `oxlint`                                               |
| TC-015  | `pnpm run typecheck`を実行                                                                            | Normal - typecheck受け入れ                                                 | 終了コード0                                                                                                                                           | `src/`と`web/`の両tsconfig                             |
| TC-016  | `pnpm run test:ci`を実行                                                                              | Normal - 全体回帰受け入れ                                                  | 終了コード0で、失敗テスト0件                                                                                                                          | プロジェクト全体の回帰として1回以上実行する            |
| TC-017  | `pnpm run compile`を実行                                                                              | Normal - build受け入れ                                                     | 終了コード0で`out/extension.js`と`out/web.min.js`が生成される                                                                                         | esbuildによる2ターゲットのビルド                       |
| TC-018  | `pnpm run package`を実行                                                                              | Normal - package受け入れ                                                   | 終了コード0でVSIXファイルが生成される                                                                                                                 | `@vscode/vsce`による作成                               |
| TC-019  | 生成対象に対し`vsce ls`を実行                                                                         | Validation - VSIX収録物の除外                                              | 出力に`node_modules`配下のパスと不要な開発ファイル（`src/`、`web/`、`tests/`、`docs/`、`notes/`）が含まれない                                         | `.vscodeignore`の除外が維持されている                  |
| TC-020  | 生成VSIXをVS Codeへインストールし、Gitリポジトリを開いて拡張を起動                                    | Normal - 主要表示の手動確認                                                | Gitグラフが描画され、コミット選択でコミット詳細が表示される                                                                                           | 自動化不可のため手動確認とし、結果を実行証跡へ記録する |
| TC-021  | 監査結果にModerate・Lowだけが残る                                                                     | Exception - 監査残件の記録分岐                                             | 完了を妨げず、残件ごとにseverity・アドバイザリID・依存経路が実行証跡へ記録される                                                                      | Critical・Highが1件でもあれば受け入れ不可              |
| TC-022  | High以上の脆弱性が既存メジャー内で解消できない                                                        | Exception - 解消不能時の停止                                               | `pnpm.overrides`・強制更新・`audit --fix --force`を行わず、checkpointを`blocked`にして停止し、blocking_reasonへ対象パッケージと理由を記録する         | 例外化による見かけ上の完了を禁止する                   |

### 失敗源インベントリ（include-or-justify）

| 失敗源                                                     | 対応ケースまたは除外理由                                                                                                                                       |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 直接依存差分が指定3項目を逸脱                              | TC-007                                                                                                                                                         |
| レジストリ監査結果の変動（Critical・Highの再出現）         | TC-009、TC-010、TC-021                                                                                                                                         |
| frozen installの失敗（manifestとlockの不整合）             | TC-008                                                                                                                                                         |
| 旧依存経路の残存                                           | TC-011                                                                                                                                                         |
| Vite 8系の混入                                             | TC-012                                                                                                                                                         |
| 品質チェックの失敗（format / lint / typecheck / 全体回帰） | TC-013、TC-014、TC-015、TC-016                                                                                                                                 |
| ビルドの失敗（compile）                                    | TC-017                                                                                                                                                         |
| パッケージ作成の失敗（package）                            | TC-018                                                                                                                                                         |
| VSIX収録物への不要ファイル混入                             | TC-019                                                                                                                                                         |
| 主要画面の手動表示失敗                                     | TC-020                                                                                                                                                         |
| 既存メジャー内に修正版が存在しない                         | TC-022                                                                                                                                                         |
| 入力値境界（0 / minimum / maximum / +/-1 / 空 / NULL）     | excluded(検証対象がJSONの依存範囲宣言とコマンドの終了コードであり、数値・文字列入力を受け取る境界が存在しない。意味のある境界はViteのメジャー境界TC-012で充足) |
| 型不正・フォーマット不正                                   | excluded(依存宣言の型不正はpnpmがmanifest解析時に拒否する既存挙動で、コマンド受け入れには型入力が存在しないため本変更の失敗源ではない)                         |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-011、TC-019
- Exception: TC-021、TC-022
- External: TC-009、TC-010
- Boundary: TC-012
- Type: excluded(上表のとおり型入力が存在しない)

**失敗系/正常系比（煙感知器）**: 正常系9件（TC-007、TC-008、TC-013〜TC-018、TC-020）、失敗系7件（TC-009〜TC-012、TC-019、TC-021、TC-022）、比0.78。失敗系が正常系を下回るためインベントリを再導出したが、上表のとおり全失敗源が対応ケースまたは除外理由で充足されている。品質・ビルド・パッケージの受け入れコマンドを1 case = 1 commandで分離する構造上、正常系が6件多くなることが比の要因であり、比率合わせのためのケース追加・削除は行わない。
