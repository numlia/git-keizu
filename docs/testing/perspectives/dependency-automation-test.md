# Test Perspectives: Dependency automation operational contract

> Source: `Dependency automation operational contract`
> Generated: 2026-08-04T19:54:34+09:00
> Language: YAML / GitHub REST API / shell command
> Test Framework: Operational acceptance (no fixed-value Vitest)
> Storage Mode: single-file

## S1: CI dependency audit and Dependabot operations (Feature 048)

> Origin: Feature 048 (dependency-automation) (light-spec-plan)
> Added: 2026-08-04
> Status: active
> Supersedes: -
> Signature: `dependency-automation operational contract`
> Target Path: `.github/workflows/ci.yaml`, `.github/dependabot.yml`, GitHub repository dependency security settings
> Test File: なし（YAML差分、pnpm command、workflow run、Dependabot job、GitHub REST responseによる運用受け入れ）

CIの依存監査、Dependabot Version Update、Dependabot alerts、Security Updates、および変更範囲の維持を検証する。外部state、advisory、default branch parseは変動するため固定値Vitestを追加せず、実行時のURL、status、response、diffを証跡として保存する。

### 失敗源インベントリ（include-or-justify）

| 失敗源                                                                        | 対応ケースまたは除外理由                                                                                                    |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Feature 050を含まないorigin/main、PR CIだけの成功、main CIの失敗              | TC-001                                                                                                                      |
| 全依存とproduction依存、HighとLowの閾値取り違え                               | TC-002、TC-003                                                                                                              |
| install、2 audit、quality checksの順序違反                                    | TC-004                                                                                                                      |
| `continue-on-error`またはignore optionによるfail-open                         | TC-005                                                                                                                      |
| npm registry errorまたはtimeout                                               | TC-006（pnpm auditの非zero exitという同一失敗分岐）                                                                         |
| 既存github-actions設定の上書き                                                | TC-007                                                                                                                      |
| npm設定の欠落、重複、directoryまたはintervalの誤り                            | TC-008                                                                                                                      |
| 保留中のmajor update以外のignore、group、target branch等の未要求customization | TC-009                                                                                                                      |
| default branch上のDependabot YAML parse errorまたはupdate job error           | TC-010                                                                                                                      |
| alerts PUTの非204、transport error、権限拒否                                  | TC-011、TC-012                                                                                                              |
| Security Updates PUTの非204、transport error、部分成功後の誤rollback          | TC-013、TC-014                                                                                                              |
| alertsまたはSecurity Updatesの最終state不一致                                 | TC-015、TC-016                                                                                                              |
| format、lint、typecheck、全体回帰の失敗                                       | TC-017、TC-018、TC-019、TC-020                                                                                              |
| application、Feature 049/050所有物へのscope逸脱                               | TC-021                                                                                                                      |
| Required status checksまたはrulesetの外部state変更・読込不能                  | TC-022、TC-023（前後snapshotを取得できなければpassにしない）                                                                |
| dependency-review actionの過剰追加                                            | TC-024                                                                                                                      |
| 既存CI trigger、runtime、install、quality stepの回帰                          | TC-025                                                                                                                      |
| 数値入力の0 / minimum / maximum / +/-1                                        | excluded(入力値を処理する実装ではない。意味のあるseverity閾値境界はTC-002、TC-003で、step位置境界はTC-004で検証する)        |
| empty / NULL入力                                                              | excluded(YAML keyの欠落・空値はparse/configuration不成立としてTC-008、TC-010、TC-025で検出し、独立した入力分岐は存在しない) |
| 不正型・不正format                                                            | TC-010（YAML parse）、TC-016（REST response fieldのboolean型）                                                              |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-005、TC-009、TC-021〜TC-024
- Exception: TC-012、TC-014
- External: TC-006
- Boundary: TC-001〜TC-004
- Type: TC-016

**失敗系/正常系比（煙感知器）**: 正常系11件（TC-007、TC-008、TC-010、TC-011、TC-013、TC-015、TC-017〜TC-020、TC-025）、失敗系14件（TC-001〜TC-006、TC-009、TC-012、TC-014、TC-016、TC-021〜TC-024）、比1.27。両者は同数または差1ではなく、inventoryから導出した25件を比率合わせで増減しない。

| Case ID | Input / Precondition                                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                               | Notes                                                                                    |
| ------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| TC-001  | Task 1開始前にorigin/main SHA、Feature 050 commit `db07fa3`、同SHAのmain CI runとlogを確認する   | Boundary - implementation readiness gate                                   | origin/mainが`db07fa3`を祖先に含み、runの`headSha`がorigin/main SHAと一致し、`status=completed`、`conclusion=success`、logにpnpm 10.34.5とlint 0 warnings / 0 errorsがある    | Target: origin/main、main CI。local main先行またはPR CIだけの成功ではgateを通さない      |
| TC-002  | `.github/workflows/ci.yaml`のlint jobをYAML parseする                                            | Boundary - all dependency High threshold                                   | `name`が`Audit all dependencies`、`run`が`pnpm audit --audit-level=high`と厳密一致するstepが1件ある                                                                           | Target: `.github/workflows/ci.yaml`。High以上の全依存監査                                |
| TC-003  | `.github/workflows/ci.yaml`のlint jobをYAML parseする                                            | Boundary - production dependency Low threshold                             | `name`が`Audit production dependencies`、`run`が`pnpm audit --prod --audit-level=low`と厳密一致するstepが1件ある                                                              | Target: `.github/workflows/ci.yaml`。production依存はLow以上を監査                       |
| TC-004  | lint jobのstep配列からInstall dependencies、2 audit、Format checkのindexを取得する               | Boundary - exact step order                                                | `allAuditIndex = installIndex + 1`、`productionAuditIndex = allAuditIndex + 1`、`formatIndex = productionAuditIndex + 1`がすべて成立する                                      | Target: `.github/workflows/ci.yaml`。既存quality step前へ連続配置                        |
| TC-005  | 2つのaudit stepとcommandを検査する                                                               | Validation - fail-open configuration rejection                             | 両stepに`continue-on-error` keyがなく、run文字列にignore optionがなく、workflow内にadvisory除外設定が0件である                                                                | Target: `.github/workflows/ci.yaml`。監査失敗を成功扱いにしない                          |
| TC-006  | `http://127.0.0.1:9`、retry 0、1秒timeoutでlocal auditを実行し、CI設定を検査する                 | External - registry audit failure                                          | commandはexit 1で`ECONNREFUSED`とURLを出力する。CIの`continue-on-error`、ignore option、shell overrideは各0件で、標準`bash -e`が失敗伝播する                                  | Target: local / CI。workflow runの実証は対象外                                           |
| TC-007  | `.github/dependabot.yml`の`updates[0]`をYAML parseする                                           | Normal - existing GitHub Actions schedule                                  | `package-ecosystem=github-actions`、`directory=/`、`schedule.interval=monthly`が維持され、その他の既存key/valueに差分がない                                                   | Target: `.github/dependabot.yml`。既存第1要素を変更しない                                |
| TC-008  | `.github/dependabot.yml`の`updates`をYAML parseする                                              | Normal - npm weekly version update                                         | `package-ecosystem=npm`、`directory=/`、`schedule.interval=weekly`の要素が`updates[1]`にあり、同条件の要素数が1件である                                                       | Target: `.github/dependabot.yml`。npm Version Update設定                                 |
| TC-009  | npm update要素のkey集合と`ignore`を検査する                                                      | Validation - unrequested customization rejection                           | `ignore`は`@types/node`と`vite`の`version-update:semver-major`の2件だけで、groups、allow、target-branch、open-pull-requests-limit、registries、day、time、timezoneが0件である | Target: `.github/dependabot.yml`。Node 26 / Vite 8移行決定までmajor updateの自動PRを保留 |
| TC-010  | 設定commitがorigin/mainへ反映された後、Dependabotのnpm/root/weekly表示と直近update jobを確認する | Normal - default branch parse acceptance                                   | default branchの表示がnpm、`/`、weeklyと一致し、直近jobのparse/configuration errorが0件で、job URLを証跡へ記録する                                                            | Target: GitHub Dependabot。PR branchだけでは完了にしない                                 |
| TC-011  | `PUT repos/numlia/git-keizu/vulnerability-alerts`を実行する                                      | Normal - alerts enable response                                            | REST responseのHTTP statusが204で、request URLとstatusを証跡へ記録する                                                                                                        | Target: GitHub repository dependency security settings。第1 external operation           |
| TC-012  | alerts PUTが非204またはtransport errorになる                                                     | Exception - Security Updates call suppression                              | `PUT .../automated-security-fixes`のcall countが0で、alerts失敗のstatusまたはerrorを記録して処理を停止する                                                                    | Target: GitHub REST API。順序gate                                                        |
| TC-013  | alerts PUTが204の後に`PUT repos/numlia/git-keizu/automated-security-fixes`を実行する             | Normal - Security Updates enable response                                  | 2回目のREST responseのHTTP statusが204で、alerts PUTより後のcallとしてrequest URLとstatusを記録する                                                                           | Target: GitHub repository dependency security settings。第2 external operation           |
| TC-014  | alerts PUTは204、Security Updates PUTは非204またはtransport errorになる                          | Exception - partial success without rollback                               | vulnerability-alertsへのDELETEまたはdisable callが0回でalertsを維持し、再試行対象がautomated-security-fixes PUTだけである                                                     | Target: GitHub REST API。部分成功時のstate transition                                    |
| TC-015  | enable operation後に`GET repos/numlia/git-keizu/vulnerability-alerts`を`--include`で実行する     | Normal - alerts final state                                                | HTTP statusが204で、response headerを含む実行結果を証跡へ記録する                                                                                                             | Target: GitHub repository dependency security settings。alerts最終確認                   |
| TC-016  | enable operation後に`GET repos/numlia/git-keizu/automated-security-fixes`を実行する              | Type - Security Updates response fields                                    | JSON responseにboolean型の`enabled === true`と`paused === false`が存在し、欠落、文字列値、反対値をpassにしない                                                                | Target: GitHub repository dependency security settings。型と値を直接検証                 |
| TC-017  | `pnpm run format`を実行する                                                                      | Normal - format acceptance                                                 | commandのexit codeが0である                                                                                                                                                   | Target: repository全体。oxfmt check                                                      |
| TC-018  | `pnpm run lint`を実行する                                                                        | Normal - lint acceptance                                                   | commandのexit codeが0で、warning 0件、error 0件である                                                                                                                         | Target: repository全体。oxlint                                                           |
| TC-019  | `pnpm run typecheck`を実行する                                                                   | Normal - typecheck acceptance                                              | commandのexit codeが0で、`src`と`web`の両tsconfig検査が完了する                                                                                                               | Target: repository全体。TypeScript compile contract                                      |
| TC-020  | `pnpm run test:ci`を実行する                                                                     | Normal - full regression acceptance                                        | commandのexit codeが0で、failed test file 0件、failed test 0件である                                                                                                          | Target: repository全体。編集対象限定ではない全体回帰                                     |
| TC-021  | Task 1以降のscoped diffで禁止pathを検査する                                                      | Validation - application scope isolation                                   | `package.json`、`pnpm-lock.yaml`、`src/**`、`web/**`、`tests/**`のdiff pathが0件である                                                                                        | Target: git diff。Feature 049/050所有物を変更しない                                      |
| TC-022  | 実装前後のRequired status checksをread-onlyで取得する                                            | Validation - required checks preservation                                  | 前後snapshotが厳密一致し、設定変更operationのcall countが0である                                                                                                              | Target: GitHub branch protection / ruleset API。取得不能なら未検証                       |
| TC-023  | 実装前後のactive rulesetをread-onlyで取得する                                                    | Validation - ruleset preservation                                          | deletionとnon-fast-forward禁止を含む前後snapshotが厳密一致し、ruleset変更operationのcall countが0である                                                                       | Target: GitHub ruleset API。取得不能なら未検証                                           |
| TC-024  | `.github/workflows/ci.yaml`のusesとdiffを検査する                                                | Validation - dependency-review exclusion                                   | `actions/dependency-review-action`を含むstepが0件で、新規workflow fileも0件である                                                                                             | Target: `.github/**`。未要求actionを追加しない                                           |
| TC-025  | 変更前後のCI workflowをYAML parseして非audit契約を比較する                                       | Normal - existing CI contract preservation                                 | main pushとmain向けPR trigger、`ubuntu-latest`、Node.js 22、Corepack、`pnpm install`、Format/Lint/Typecheck/Test stepのkey/valueと相対順が厳密一致する                        | Target: `.github/workflows/ci.yaml`。追加した2 step以外を維持                            |

### Feature 048 branch実行証跡

- 実行日時: 2026-08-04T20:29:51+09:00
- 環境: Linux 5.15.153.1-microsoft-standard-WSL2 x86_64、Node.js v24.13.0、pnpm 10.34.5
- 検証対象commit: `c3e6ed02d3e6fea2c515b46db0b90b6358a008ed`
- 比較基点: `db07fa36848d2366d939e1b1eaca2bfb20c67bab`

#### ケース別結果

- TC-001: pass。origin/mainがFeature 050 commit `db07fa3`を含み、main CI run
  `https://github.com/numlia/git-keizu/actions/runs/30902311288`は`completed/success`、pnpm
  10.34.5、lint 0 warnings / 0 errorsであることをTask 1で確認した。
- TC-002: pass。`Audit all dependencies` / `pnpm audit --audit-level=high`の完全一致stepは1件。
- TC-003: pass。`Audit production dependencies` / `pnpm audit --prod --audit-level=low`の完全一致stepは1件。
- TC-004: pass。lint jobのstep indexはInstall dependencies=3、全依存audit=4、production
  audit=5、Format check=6で、要求された連続順序と一致した。
- TC-005: pass。2 audit stepの`continue-on-error`、run文字列のignore option、workflow内のadvisory除外設定は各0件。
- TC-006: pass（合意済みlocal/static代替検証）。`timeout 30s env npm_config_cache=/tmp/feature-048-npm-cache npm_config_fetch_retries=0 npm_config_fetch_timeout=1000 npx --yes pnpm@10.34.5 audit --registry=http://127.0.0.1:9 --audit-level=high`は2.24秒でexit 1となり、`ECONNREFUSED`と`http://127.0.0.1:9/-/npm/v1/security/audits/quick`を出力した。workflowの2 audit stepには`continue-on-error`、`--ignore-registry-errors`、その他ignore optionがなく、`ubuntu-latest` jobにshell overrideもない。GitHub Actionsの標準Linux shellは`bash -e {0}`でnonzeroをstep failureへ伝播するため、registry errorを成功扱いにしない静的契約も成立する。workflow URL、job conclusion、後続stepのskipは本Caseの要求外とする。
- TC-007: pass。`updates[0]`は変更前と同一のgithub-actions / `/` / monthlyで、その他のkey/value差分は0件。
- TC-008: pass。`updates[1]`はnpm / `/` / weeklyと完全一致し、同条件の要素は1件。
- TC-009: pass。npm要素のkeyは`package-ecosystem`、`directory`、`schedule`のみで、禁止customizationは0件。
- TC-010: pending(post-merge)。検証対象commitがorigin/mainに未反映であり、default branchのDependabot
  parseと直近update job URLはマージ後に確認する。
- TC-011: pending(post-merge)。origin/main反映前のためalerts PUTは実行していない。
- TC-012: pending(post-merge)。alerts PUT未実行のため、非204時のSecurity Updates call抑止はマージ後のoperationで確認する。
- TC-013: pending(post-merge)。alerts 204を先に得る順序gateを満たすまでSecurity Updates PUTは実行しない。
- TC-014: pending(post-merge)。Security Updates PUT未実行のため、部分成功時のno rollbackと再試行対象はマージ後に確認する。
- TC-015: pending(post-merge)。enable operation未実行のため、vulnerability-alerts GETの204確認はマージ後に行う。
- TC-016: pending(post-merge)。enable operation未実行のため、automated-security-fixes GETのboolean型と値はマージ後に確認する。
- TC-017: pass。`npx --yes pnpm@10.34.5 run format`はexit 0、185 filesすべてformat一致。
- TC-018: pass。`npx --yes pnpm@10.34.5 run lint`はexit 0、81 filesでwarning 0件、error 0件。
- TC-019: pass。`npx --yes pnpm@10.34.5 run typecheck`はexit 0、`tsc -p ./src --noEmit`と`tsc -p ./web --noEmit`が完了。
- TC-020: pass。`npx --yes pnpm@10.34.5 run test:ci`はexit 0、43 test files / 1751 testsがpassし、failureは0件。
- TC-021: pass。`git diff --name-only db07fa3..HEAD -- package.json pnpm-lock.yaml src web tests`の出力は0件。
- TC-022: pass。事前仕様snapshotのRequired status checksなしに対し、read-only APIはHTTP 404
  `Required status checks not enabled`を返した。設定変更operationは0回。
- TC-023: pass。事前仕様snapshotと現在APIはいずれもactive ruleset 1件、ruleは`deletion`と
  `non_fast_forward`だけである。ruleset id 13085290の`updated_at`は2026-02-22T12:11:35.496+09:00でFeature 048開始前、設定変更operationは0回。
- TC-024: pass。`actions/dependency-review-action`を含むstepと、比較基点からの新規workflow fileは各0件。
- TC-025: pass。現在workflowから2 audit stepだけを除いたYAML構造は比較基点と完全一致し、trigger、runtime、Corepack、`pnpm install`、quality stepのkey/valueと相対順に差分は0件。

#### コマンド実行結果

- `npx --yes pnpm@10.34.5 audit --audit-level=high`: exit 0。主要出力はlow 1件で、High / Criticalは0件。
- `npx --yes pnpm@10.34.5 audit --prod --audit-level=low`: exit 0。`No known vulnerabilities found`。
- `npx --yes pnpm@10.34.5 run format`: exit 0。`All matched files use the correct format.`。
- `npx --yes pnpm@10.34.5 run lint`: exit 0。warning 0件、error 0件。
- `npx --yes pnpm@10.34.5 run typecheck`: exit 0。src / webの両tsconfigが完了。
- `npx --yes pnpm@10.34.5 run test:ci`: exit 0。43 test files、1751 testsがpass。
- `git diff --check`: exit 0、出力なし。

#### scoped diffとpost-merge gate

比較基点からの差分は`.github/workflows/ci.yaml`、`.github/dependabot.yml`、本観点表、派生INDEXだけである。`package.json`、`pnpm-lock.yaml`、`src/**`、`web/**`、`tests/**`の差分は0件である。検証対象commitはorigin/mainの祖先ではないため、TC-010〜TC-016はpost-merge pendingとする。これらはFeature 048の完了条件を満たしたものとして扱わず、origin/main反映後にDependabot job、alerts PUT、Security Updates PUT、最終GETを規定順序で実行し、URL、HTTP status、responseを保存する。

#### 自動test fileを追加しない理由

対象はYAMLの宣言、npm registryのadvisory、GitHubのdefault branch parseとrepository settingsという外部state、およびcommand acceptanceである。これらを固定値Vitestへ写しても実際のregistry、workflow、Dependabot job、REST responseを検証できないため、自動test fileは追加しない。代替としてYAML parse、scoped diff、exact commandのexit / 主要出力、read-only API response、post-merge operationの証跡で各Case IDを追跡する。テストコードを追加しないため、Given / When / Thenコメント、mock assertion、coverage計測は非該当である。

#### Completion Checklist自己点検

active sectionはS1のみで、TC-001〜TC-025の欠番・重複はない。全Case IDと具体的なExpected Resultをbranch pass、TC-006の合意済みlocal/static代替検証、またはTC-010〜TC-016のpost-merge pendingへ対応付けた。失敗源インベントリの全項目とValidation / Exception / External / Boundary / Typeの全カテゴリにはCase IDまたは除外理由があり、正常11件・失敗14件、比1.27を維持する。1 case = 1 branch、境界値の除外理由、外部failureの代替検証理由を確認した。固定値test非追加の理由とpost-merge pendingを明記し、観点漏れは検出していない。

#### INDEX再生成確認

`python3 ~/.claude/skills/rebuild-test-perspectives-index/scripts/rebuild_index.py . --check`はexit 0で、INDEXはup to dateだった。集計は42 sources、65 physical files、459 active sections、2340 active cases、Feature 048のforward lookupは1 section / 25 casesで、証跡追記前から不変である。証跡はケース定義tableではなくlist形式のため集計対象にならず、INDEXに差分がないので再生成による対象file追加は行わない。
