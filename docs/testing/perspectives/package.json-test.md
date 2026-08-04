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

**失敗系/正常系比（煙感知器）**: 正常系9件（TC-007、TC-008、TC-013〜TC-018、TC-020）、失敗系7件（TC-009〜TC-012、TC-019、TC-021、TC-022）、比0.78。失敗系が正常系を下回るためインベントリを再導出したが、上表のとおり全失敗源が対応ケースまたは除外理由で充足されている。正常系9件のうち、品質・ビルド・パッケージの受け入れコマンドを1 case = 1 commandで分離した6件（TC-013〜TC-018）が比に影響しており、比率合わせのためのケース追加・削除は行わない。

### Feature 046 実行証跡

**実行日時**: 2026-08-03 20:38〜20:41 JST（2026-08-03T11:41:24Z）
**実行環境**: Linux (WSL2)、pnpm 10.29.3（`npx --yes pnpm@10.29.3`経由）、Node.js実行はプロジェクト既定
**実行ハーネス差異**: 対応プランは`codex`を指定したが、実装は`claude-code`のサブエージェント機構で実行した。checkpointのwait roundはCodex presetの480秒を使用しており、`execution.harness: claude-code`と待機presetの出典が一致していない。成果物・検証結果への影響はなく、本項を計画からの実行手段の逸脱記録とする。
**検証コミット**: `7716d04`（`chore: update vulnerable development dependencies`）、比較基点`ebb48c8`
**作業ブランチ**: `chore/046-dev-dependency-security-update`

#### ケース別の実行結果

INDEXジェネレーターは`| TC-`で始まる表行をケース定義として集計するため、実行証跡は表ではなくリストで記録する。これにより本セクションのケース数は上のケース定義表の16件のままとなる。

- **TC-007**: `git diff ebb48c8..HEAD -- package.json`、終了コード0。差分は`devDependencies`の3項目のみ（`@vscode/vsce`が`^3.7.1`から`^3.9.2`、`vite` `^7.3.6`を新規追加、`vitest`が`^4.0.18`から`^4.1.10`）。`dependencies`・scripts・contributes・enginesに差分なし。
- **TC-008**: `npx --yes pnpm@10.29.3 install --frozen-lockfile`、終了コード0。`Lockfile is up to date, resolution step is skipped`が出力され、manifestとlockの不整合エラーなし。
- **TC-009**: `npx --yes pnpm@10.29.3 audit --audit-level=high`、終了コード0。`1 vulnerabilities found` / `Severity: 1 low`。Critical 0件、High 0件、Moderate 0件。
- **TC-010**: `npx --yes pnpm@10.29.3 audit --prod --audit-level=low`、終了コード0。`No known vulnerabilities found`。
- **TC-011**: `npx --yes pnpm@10.29.3 why vitest vite rollup @vscode/vsce undici flatted markdown-it js-yaml postcss minimatch`、終了コード0。全経路が更新後の解決のみで、旧脆弱解決（Vitest 4.0.18、Vite 7.3.1、Rollup 4.58.0、Undici 7.22.0）およびminimatch 3系の経路は0件。
- **TC-012**: `npx --yes pnpm@10.29.3 list vite --depth Infinity`、終了コード0。Vite参照は3件すべて7.3.6（直接依存、`@vitest/mocker`のpeer、`vitest`のpeer）で、8系0件。
- **TC-013**: `npx --yes pnpm@10.29.3 run format`、終了コード0。`All matched files use the correct format.`（175ファイル）。
- **TC-014**: `npx --yes pnpm@10.29.3 run lint`、終了コード0。`Found 0 warnings and 0 errors.`（78ファイル、97ルール）。
- **TC-015**: `npx --yes pnpm@10.29.3 run typecheck`、終了コード0。`tsc -p ./src --noEmit && tsc -p ./web --noEmit`が無出力で完了。
- **TC-016**: `npx --yes pnpm@10.29.3 run test:ci`、終了コード0。`RUN v4.1.10` / `Test Files 41 passed (41)` / `Tests 1633 passed (1633)`で失敗0件。プロジェクト全体の回帰として実行した。
- **TC-017**: `npx --yes pnpm@10.29.3 run compile`、終了コード0。`out/extension.js 57.6kb`と`out/web.min.js 94.7kb`を生成。
- **TC-018**: `npx --yes pnpm@10.29.3 run package`、終了コード0。`DONE Packaged: /home/numlia/work/ai/git-keizu/git-keizu-0.8.2.vsix (25 files, 147.58 KB)`。
- **TC-019**: `npx --yes pnpm@10.29.3 exec vsce ls`、終了コード0。収録は23パス（`package.json`系、`README.md`、`LICENSE`、`resources/`、`out/`、`media/`、`l10n/`）で、`node_modules/`・`src/`・`web/`・`tests/`・`docs/`・`notes/`のヒットは0件。TC-018のVSIX内25ファイルとの差分2件は、VSIXコンテナ側のメタデータ`extension.vsixmanifest`と`[Content_Types].xml`であり、`vsce ls`の拡張コンテンツ列挙対象外である。
- **TC-020**: 生成VSIX`/home/numlia/work/ai/git-keizu/git-keizu-0.8.2.vsix`をVS Codeへインストールし、Gitリポジトリを開いて拡張を起動。**確認OK**（確認日2026-08-03、ユーザーによる手動確認）。Gitグラフがコミット履歴を描画し、コミット選択でコミット詳細（コミットのファイル内容）が表示されることを確認した。自動化できないため本ケースはユーザーの手動確認で受け入れる。
- **TC-021**: `npx --yes pnpm@10.29.3 audit --audit-level=low`（残件詳細の取得）、終了コード1（Lowを検出したため）。残件は次項の1件のみで、Critical・High・Moderateは0件。Lowだけが残るため完了を妨げない。
- **TC-022**: TC-009でHigh以上が0件のため、解消不能時の停止分岐は発生しなかった。`pnpm.overrides`・強制更新・`audit --fix --force`はいずれも未使用である。

#### 監査結果の集計と残件（TC-009 / TC-010 / TC-021）

- 全依存監査: Critical 0件、High 0件、Moderate 0件、Low 1件（合計1件）
- production依存監査: 既知脆弱性0件

| severity | パッケージ | アドバイザリID                                                           | 脆弱バージョン     | 修正版     | 依存経路    |
| -------- | ---------- | ------------------------------------------------------------------------ | ------------------ | ---------- | ----------- |
| low      | `esbuild`  | [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr) | `>=0.27.3 <0.28.1` | `>=0.28.1` | `.>esbuild` |

概要はWindowsで開発サーバーを起動した場合の任意ファイル読み取りである。本プロジェクトはesbuildをバンドラーとしてのみ使用し開発サーバーを起動しないため、対応プラン§7のとおり本対応の範囲外とする。

#### 主要な解決バージョン

`vitest` 4.1.10、`vite` 7.3.6、`rollup` 4.62.4、`@vscode/vsce` 3.9.2、`undici` 7.29.0、`flatted` 3.4.4、`js-yaml` 4.3.1、`markdown-it` 14.3.0、`postcss` 8.5.25、`minimatch` 10.2.6（3系経路は消滅）。

#### 成果物

- VSIX: `/home/numlia/work/ai/git-keizu/git-keizu-0.8.2.vsix`（25ファイル、147.58 KB）
- ビルド成果物: `out/extension.js`、`out/web.min.js`
- いずれも`.gitignore`によりコミット対象外である。

#### 固定値Vitestテストを追加しない理由と代替検証

依存監査の結果はnpmレジストリ上のアドバイザリという外部データに依存し、新規アドバイザリの公開や既存アドバイザリの更新で同一ロックファイルでも結果が変わる。件数やアドバイザリIDを固定値としてVitestへ埋め込むと、コード変更がないまま失敗する不安定なテストになり、逆に固定値の更新作業がレビューの形骸化を招く。そのため本セクションは固定値テストを持たず、次の代替手段で検証する。

- 依存契約（TC-007）: `git diff`によるmanifest差分の直接確認
- 再現可能性（TC-008）: `pnpm install --frozen-lockfile`の終了コード
- 監査と依存経路（TC-009〜TC-012、TC-021、TC-022）: `pnpm audit` / `pnpm why` / `pnpm list`をその時点のレジストリに対して実行し、結果を本証跡へ記録
- 互換性（TC-013〜TC-018）: 既存のpackage scriptsによる品質チェック、プロジェクト全体の回帰テスト、ビルド、VSIX作成
- 収録物と表示（TC-019、TC-020）: `vsce ls`の出力確認とVS Code上での手動確認

再検証が必要な場合は上記コマンド群を同じ順序で再実行し、本証跡との差分を確認する。

#### テストコード規約の適用可否

本タスクではVitestテストを追加しないため、`docs/test-supplement.md`の`// Case:` / `// Given:` / `// When:` / `// Then:`コメント規約、例外assert、mock assertはいずれも非該当である。各Case IDの追跡性は、上のケース別実行結果がCase IDとコマンド・終了コード・主要出力を対応付けることで担保する。

#### INDEX再生成の確認

`python3 ~/.claude/skills/rebuild-test-perspectives-index/scripts/rebuild_index.py .`を再実行し、root集計430 sections・2104 cases、`package.json` 2 sections・22 cases、Feature 046のReverse Lookup行が維持されることを確認した。証跡本文はINDEXの集計対象外である。

証跡を表形式で書いた初回の再生成では`package.json`が22 casesから38 casesへ増加した。ジェネレーターは`| TC-`で始まる表行をケース定義として数えるため、証跡表の16行がケースとして重複計上されたものである。証跡をリスト形式へ変更して再生成し、22 casesへ戻ることを確認した。以後、本セクションへ証跡を追記する際も表形式を使わない。

再生成後の`INDEX.md`と現在のコミット内容の差分は、生成タイムスタンプ行と表パディングの整形ドリフトだけで、集計値・Forward Lookup・Reverse Lookupの内容に差分はない。そのため`INDEX.md`は再コミットせずTask 1の生成結果を維持する。

## S3: pnpm 10.34.5 セキュリティ更新 (Feature 050)

> Origin: Feature 050 (pnpm-security-update) (light-spec-plan)
> Added: 2026-08-04
> Status: active
> Supersedes: -
> Signature: `package.json#packageManager+scripts.vscode:prepublish`
> Target Path: `package.json` (`packageManager`, `scripts.vscode:prepublish`)
> Test File: なし（コマンド / 外部 CI 受け入れ）

pnpm本体の既知脆弱性を解消し、`packageManager`とCorepack / npx消費経路が10.34.5へ一致する契約を検証する。Advisory Database、npmレジストリ、main CIは外部状態で変動するため固定値のVitestテストは持たず、各ケースをコマンド、scoped diff、またはCI実行証跡で受け入れる。

### 失敗源インベントリ（include-or-justify）

| 失敗源 | 対応ケースまたは除外理由 |
| ------- | ------------------------ |
| `packageManager`または`vscode:prepublish`のversion pin不一致 | TC-023、TC-024 |
| 対象現行箇所への10.29.3残存 | TC-025、TC-026 |
| npmレジストリまたはAdvisory APIのHTTP・JSON parse・rate-limit error | TC-027、TC-029 |
| pnpm 10.34.5に対する新しいadvisory | TC-028、TC-029 |
| frozen lock incompatibility | TC-030 |
| project全依存またはproduction依存のaudit failure | TC-031、TC-032 |
| format / lint / typecheck / 全体回帰の失敗 | TC-033、TC-034、TC-035、TC-036 |
| nested pnpm consumerのversion不一致 | TC-024、TC-027、TC-037 |
| prepublishまたはcompile後のbundle欠落 | TC-037、TC-038 |
| VSIX package failure | TC-039 |
| VSIXへの不要ファイル混入 | TC-040 |
| 指定二項目・二文書・S3 / INDEX以外へのscope creep | TC-041 |
| S1 / S2、TC-001〜TC-022、Feature 046 historical evidenceの改変 | TC-042 |
| main CIのpnpm version不一致、既存`lint` job失敗、run URL欠落 | TC-043 |
| 数値入力境界（0 / minimum / maximum / +/-1 / 空 / NULL） | excluded(package manager versionとcommand acceptanceは数値入力を受け取らない。意味のある境界はadvisory件数0→1をTC-028 / TC-029、version 10.29.3→10.34.5をTC-023〜TC-027、main CI pending→successをTC-043で検証する) |
| 型不正・フォーマット不正 | excluded(package manager versionと受け入れコマンドへtype inputを渡す仕様がなく、manifest / JSON / API形式の不正は各consumerまたはTC-029のverification failureとして検出する) |

| Case ID | Input / Precondition | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes |
| ------- | -------------------- | -------------------------------------------------------------------------- | --------------- | ----- |
| TC-023 | `package.json`の`packageManager`を読み込む | Normal - package manager pin | 値が文字列`pnpm@10.34.5`と完全一致する | 10.29.3から10.34.5へのversion境界 |
| TC-024 | `package.json`の`scripts.vscode:prepublish`を読み込む | Normal - nested npx pin | 値が文字列`npx --yes pnpm@10.34.5 run compile`と完全一致する | extension package経路のpnpmを固定 |
| TC-025 | `CLAUDE.md`と`docs/development/directory-structure.md`の現行pnpm案内を検索する | Normal - current documentation sync | 両文書の現行version表記が10.34.5で一致し、対象現行行の不一致が0件である | Feature 046の履歴証跡は対象外 |
| TC-026 | 対象現行箇所とFeature 046履歴に対し10.29.3の残存箇所を分類する | Validation - stale current version rejection | 対象現行箇所の10.29.3が0件で、許容残存は`package.json-test.md`のFeature 046履歴だけとしてpath / section / 理由付きで列挙される | repository全体置換は禁止 |
| TC-027 | `npx --yes pnpm@10.34.5 --version`を実行する | External - npm registry resolution | 終了コード0で、標準出力が`10.34.5`と完全一致する | HTTPまたはregistry failureは受け入れ不可 |
| TC-028 | GitHub Advisory Database APIへ`ecosystem=npm&affects=pnpm@10.34.5`で問い合わせる | External - pnpm advisory lookup | HTTP成功後のtop-level JSONが配列で、`jq length`が0を返す | project dependency auditとは別契約 |
| TC-029 | Advisory API検証がHigh / Critical該当、HTTP error、JSON parse error、またはrate-limit errorを返す | Exception - advisory verification blocked | エラーを0件へ変換せずcheckpoint statusが`blocked`となり、blocking reasonに該当advisoryまたはAPI失敗種別が記録される | 別version、pnpm 11、ignoreへ無断変更しない |
| TC-030 | pnpm 10.34.5で`install --frozen-lockfile`を実行する | Normal - frozen install acceptance | 終了コード0で、実行前後の`pnpm-lock.yaml`と`pnpm-workspace.yaml`のdiffが0件である | manifestとlockの互換性を確認 |
| TC-031 | pnpm 10.34.5で`audit --audit-level=high`を実行する | External - full dependency audit | 終了コード0で、Critical件数とHigh件数がそれぞれ0である | pnpm本体advisoryの代替にしない |
| TC-032 | pnpm 10.34.5で`audit --prod --audit-level=low`を実行する | External - production dependency audit | 終了コード0で、既知脆弱性の報告件数が0である | production依存を別に確認 |
| TC-033 | pnpm 10.34.5で`run format`を実行する | Normal - format acceptance | 終了コード0で、format不一致ファイルが0件と報告される | `oxfmt --check` |
| TC-034 | pnpm 10.34.5で`run lint`を実行する | Normal - lint acceptance | 終了コード0で、warning 0件・error 0件と報告される | `oxlint` |
| TC-035 | pnpm 10.34.5で`run typecheck`を実行する | Normal - typecheck acceptance | 終了コード0で、`src/`と`web/`のTypeScript errorが0件である | 両tsconfigを確認 |
| TC-036 | pnpm 10.34.5で`run test:ci`を実行する | Normal - full regression acceptance | 終了コード0で、failed test files 0件・failed tests 0件と報告される | プロジェクト全体を1回以上実行 |
| TC-037 | pnpm 10.34.5で`run vscode:prepublish`を実行する | Normal - prepublish acceptance | 終了コード0で、`out/extension.js`と`out/web.min.js`が存在する | script内のnpx pin消費経路を確認 |
| TC-038 | pnpm 10.34.5で`run compile`を実行する | Normal - compile acceptance | 終了コード0で、`out/extension.js`と`out/web.min.js`が存在する | 二つのbundle生成を確認 |
| TC-039 | pnpm 10.34.5で`run package`を実行する | Normal - package acceptance | 終了コード0で、プロジェクトルートに`.vsix`成果物が1件以上存在する | 生成pathを実行証跡へ記録 |
| TC-040 | pnpm 10.34.5で`exec vsce ls`を実行する | Validation - VSIX content exclusion | 出力中の`node_modules/`、`src/`、`web/`、`tests/`、`docs/`、`notes/`配下pathが各0件である | `.vscodeignore`の除外を維持 |
| TC-041 | Task 1〜3のscoped diffを比較基点から確認する | Validation - scope boundary | 差分が`package.json`の指定二項目、二文書、S3 / INDEXだけで、lock / workspace / CI / dependency / app code / testsのscope外差分が0件である | Task順序ごとに許可差分を照合 |
| TC-042 | S3追加前baselineと現在の`package.json-test.md`をsection単位で比較する | Validation - historical evidence immutability | S1 / S2、TC-001〜TC-022、Feature 046の10.29.3実行証跡がbyte-equivalentで、差分が0 byteである | S3だけをadditiveに追記 |
| TC-043 | Feature 050 merge commitを含むmain CI runを確認する | Boundary - post-merge completion gate | CI run URLが記録され、logのpnpm versionが10.34.5、既存`lint` job conclusionが`success`となるまでFeature 050完了とFeature 048着手が保留される | branch上では`pending(post-merge gate)` |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-026、TC-040、TC-041、TC-042
- Exception: TC-029
- External: TC-027、TC-028、TC-031、TC-032
- Boundary: TC-043（advisory 0→1はTC-028 / TC-029、version 10.29.3→10.34.5はTC-023〜TC-027でも充足）
- Type: excluded(上表のとおりtype inputが存在せず、形式不正はconsumerまたはTC-029で検出する)

**失敗系/正常系比（煙感知器）**: 正常系11件（TC-023〜TC-025、TC-030、TC-033〜TC-039）、失敗系10件（TC-026〜TC-029、TC-031、TC-032、TC-040〜TC-043）、比0.91。同数近辺のためインベントリを再導出したが、上表の全失敗源にCase IDまたは除外理由がある。品質・回帰・build・packageを1 case = 1 commandで分けた正常系が比に影響しており、比率合わせのためのcase追加・削除は行わない。
