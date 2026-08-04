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

| 失敗源 | 対応ケースまたは除外理由 |
| ------ | ------------------------ |
| Feature 050を含まないorigin/main、PR CIだけの成功、main CIの失敗 | TC-001 |
| 全依存とproduction依存、HighとLowの閾値取り違え | TC-002、TC-003 |
| install、2 audit、quality checksの順序違反 | TC-004 |
| `continue-on-error`またはignore optionによるfail-open | TC-005 |
| npm registry errorまたはtimeout | TC-006（pnpm auditの非zero exitという同一失敗分岐） |
| 既存github-actions設定の上書き | TC-007 |
| npm設定の欠落、重複、directoryまたはintervalの誤り | TC-008 |
| group、ignore、target branch等の未要求customization | TC-009 |
| default branch上のDependabot YAML parse errorまたはupdate job error | TC-010 |
| alerts PUTの非204、transport error、権限拒否 | TC-011、TC-012 |
| Security Updates PUTの非204、transport error、部分成功後の誤rollback | TC-013、TC-014 |
| alertsまたはSecurity Updatesの最終state不一致 | TC-015、TC-016 |
| format、lint、typecheck、全体回帰の失敗 | TC-017、TC-018、TC-019、TC-020 |
| application、Feature 049/050所有物へのscope逸脱 | TC-021 |
| Required status checksまたはrulesetの外部state変更・読込不能 | TC-022、TC-023（前後snapshotを取得できなければpassにしない） |
| dependency-review actionの過剰追加 | TC-024 |
| 既存CI trigger、runtime、install、quality stepの回帰 | TC-025 |
| 数値入力の0 / minimum / maximum / +/-1 | excluded(入力値を処理する実装ではない。意味のあるseverity閾値境界はTC-002、TC-003で、step位置境界はTC-004で検証する) |
| empty / NULL入力 | excluded(YAML keyの欠落・空値はparse/configuration不成立としてTC-008、TC-010、TC-025で検出し、独立した入力分岐は存在しない) |
| 不正型・不正format | TC-010（YAML parse）、TC-016（REST response fieldのboolean型） |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-005、TC-009、TC-021〜TC-024
- Exception: TC-012、TC-014
- External: TC-006
- Boundary: TC-001〜TC-004
- Type: TC-016

**失敗系/正常系比（煙感知器）**: 正常系11件（TC-007、TC-008、TC-010、TC-011、TC-013、TC-015、TC-017〜TC-020、TC-025）、失敗系14件（TC-001〜TC-006、TC-009、TC-012、TC-014、TC-016、TC-021〜TC-024）、比1.27。両者は同数または差1ではなく、inventoryから導出した25件を比率合わせで増減しない。

| Case ID | Input / Precondition | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes |
| ------- | -------------------- | -------------------------------------------------------------------------- | --------------- | ----- |
| TC-001 | Task 1開始前にorigin/main SHA、Feature 050 commit `db07fa3`、同SHAのmain CI runとlogを確認する | Boundary - implementation readiness gate | origin/mainが`db07fa3`を祖先に含み、runの`headSha`がorigin/main SHAと一致し、`status=completed`、`conclusion=success`、logにpnpm 10.34.5とlint 0 warnings / 0 errorsがある | Target: origin/main、main CI。local main先行またはPR CIだけの成功ではgateを通さない |
| TC-002 | `.github/workflows/ci.yaml`のlint jobをYAML parseする | Boundary - all dependency High threshold | `name`が`Audit all dependencies`、`run`が`pnpm audit --audit-level=high`と厳密一致するstepが1件ある | Target: `.github/workflows/ci.yaml`。High以上の全依存監査 |
| TC-003 | `.github/workflows/ci.yaml`のlint jobをYAML parseする | Boundary - production dependency Low threshold | `name`が`Audit production dependencies`、`run`が`pnpm audit --prod --audit-level=low`と厳密一致するstepが1件ある | Target: `.github/workflows/ci.yaml`。production依存はLow以上を監査 |
| TC-004 | lint jobのstep配列からInstall dependencies、2 audit、Format checkのindexを取得する | Boundary - exact step order | `allAuditIndex = installIndex + 1`、`productionAuditIndex = allAuditIndex + 1`、`formatIndex = productionAuditIndex + 1`がすべて成立する | Target: `.github/workflows/ci.yaml`。既存quality step前へ連続配置 |
| TC-005 | 2つのaudit stepとcommandを検査する | Validation - fail-open configuration rejection | 両stepに`continue-on-error` keyがなく、run文字列にignore optionがなく、workflow内にadvisory除外設定が0件である | Target: `.github/workflows/ci.yaml`。監査失敗を成功扱いにしない |
| TC-006 | npm registry errorによりいずれかの`pnpm audit`が非zeroで終了するworkflow run | External - registry audit failure | 該当audit stepとlint jobの`conclusion=failure`がworkflow URLで確認でき、後続Format checkが成功扱いで実行されない | Target: GitHub Actions。registry timeoutも同じ非zero exit分岐 |
| TC-007 | `.github/dependabot.yml`の`updates[0]`をYAML parseする | Normal - existing GitHub Actions schedule | `package-ecosystem=github-actions`、`directory=/`、`schedule.interval=monthly`が維持され、その他の既存key/valueに差分がない | Target: `.github/dependabot.yml`。既存第1要素を変更しない |
| TC-008 | `.github/dependabot.yml`の`updates`をYAML parseする | Normal - npm weekly version update | `package-ecosystem=npm`、`directory=/`、`schedule.interval=weekly`の要素が`updates[1]`にあり、同条件の要素数が1件である | Target: `.github/dependabot.yml`。npm Version Update設定 |
| TC-009 | npm update要素のkey集合とファイル全体を検査する | Validation - unrequested customization rejection | npm要素のkey集合が`package-ecosystem`、`directory`、`schedule`だけで、groups、allow、ignore、target-branch、open-pull-requests-limit、registries、day、time、timezoneが0件である | Target: `.github/dependabot.yml`。最小native config |
| TC-010 | 設定commitがorigin/mainへ反映された後、Dependabotのnpm/root/weekly表示と直近update jobを確認する | Normal - default branch parse acceptance | default branchの表示がnpm、`/`、weeklyと一致し、直近jobのparse/configuration errorが0件で、job URLを証跡へ記録する | Target: GitHub Dependabot。PR branchだけでは完了にしない |
| TC-011 | `PUT repos/numlia/git-keizu/vulnerability-alerts`を実行する | Normal - alerts enable response | REST responseのHTTP statusが204で、request URLとstatusを証跡へ記録する | Target: GitHub repository dependency security settings。第1 external operation |
| TC-012 | alerts PUTが非204またはtransport errorになる | Exception - Security Updates call suppression | `PUT .../automated-security-fixes`のcall countが0で、alerts失敗のstatusまたはerrorを記録して処理を停止する | Target: GitHub REST API。順序gate |
| TC-013 | alerts PUTが204の後に`PUT repos/numlia/git-keizu/automated-security-fixes`を実行する | Normal - Security Updates enable response | 2回目のREST responseのHTTP statusが204で、alerts PUTより後のcallとしてrequest URLとstatusを記録する | Target: GitHub repository dependency security settings。第2 external operation |
| TC-014 | alerts PUTは204、Security Updates PUTは非204またはtransport errorになる | Exception - partial success without rollback | vulnerability-alertsへのDELETEまたはdisable callが0回でalertsを維持し、再試行対象がautomated-security-fixes PUTだけである | Target: GitHub REST API。部分成功時のstate transition |
| TC-015 | enable operation後に`GET repos/numlia/git-keizu/vulnerability-alerts`を`--include`で実行する | Normal - alerts final state | HTTP statusが204で、response headerを含む実行結果を証跡へ記録する | Target: GitHub repository dependency security settings。alerts最終確認 |
| TC-016 | enable operation後に`GET repos/numlia/git-keizu/automated-security-fixes`を実行する | Type - Security Updates response fields | JSON responseにboolean型の`enabled === true`と`paused === false`が存在し、欠落、文字列値、反対値をpassにしない | Target: GitHub repository dependency security settings。型と値を直接検証 |
| TC-017 | `pnpm run format`を実行する | Normal - format acceptance | commandのexit codeが0である | Target: repository全体。oxfmt check |
| TC-018 | `pnpm run lint`を実行する | Normal - lint acceptance | commandのexit codeが0で、warning 0件、error 0件である | Target: repository全体。oxlint |
| TC-019 | `pnpm run typecheck`を実行する | Normal - typecheck acceptance | commandのexit codeが0で、`src`と`web`の両tsconfig検査が完了する | Target: repository全体。TypeScript compile contract |
| TC-020 | `pnpm run test:ci`を実行する | Normal - full regression acceptance | commandのexit codeが0で、failed test file 0件、failed test 0件である | Target: repository全体。編集対象限定ではない全体回帰 |
| TC-021 | Task 1以降のscoped diffで禁止pathを検査する | Validation - application scope isolation | `package.json`、`pnpm-lock.yaml`、`src/**`、`web/**`、`tests/**`のdiff pathが0件である | Target: git diff。Feature 049/050所有物を変更しない |
| TC-022 | 実装前後のRequired status checksをread-onlyで取得する | Validation - required checks preservation | 前後snapshotが厳密一致し、設定変更operationのcall countが0である | Target: GitHub branch protection / ruleset API。取得不能なら未検証 |
| TC-023 | 実装前後のactive rulesetをread-onlyで取得する | Validation - ruleset preservation | deletionとnon-fast-forward禁止を含む前後snapshotが厳密一致し、ruleset変更operationのcall countが0である | Target: GitHub ruleset API。取得不能なら未検証 |
| TC-024 | `.github/workflows/ci.yaml`のusesとdiffを検査する | Validation - dependency-review exclusion | `actions/dependency-review-action`を含むstepが0件で、新規workflow fileも0件である | Target: `.github/**`。未要求actionを追加しない |
| TC-025 | 変更前後のCI workflowをYAML parseして非audit契約を比較する | Normal - existing CI contract preservation | main pushとmain向けPR trigger、`ubuntu-latest`、Node.js 22、Corepack、`pnpm install --frozen-lockfile`、Format/Lint/Typecheck/Test stepのkey/valueと相対順が厳密一致する | Target: `.github/workflows/ci.yaml`。追加した2 step以外を維持 |
