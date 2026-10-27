# Test Perspectives: package.json

> Source: `package.json`
> Generated: 2026-05-17T00:00:00Z
> Language: JSON (VS Code contributes schema)
> Test Framework: Vitest
> Storage Mode: single-file

## S1: minimum / pattern validation of contributes.configuration (Feature 040)

> Origin: Feature 040 (settings-and-copy-polish) (light-spec-plan)
> Added: 2026-05-17
> Status: active
> Supersedes: -
> Target Path: `package.json` (`contributes.configuration.properties`)
> Test File: `tests/src/config-defaults.test.ts`

Verifies that `minimum: 1` is set on `git-keizu.initialLoadCommits` / `git-keizu.loadMoreCommits`, and that `git-keizu.graphColours.items.pattern` includes the 4-argument rgba alternative.

| Case ID | Input / Precondition                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result             | Notes                       |
| ------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------- | --------------------------- |
| TC-001  | Read the `git-keizu.initialLoadCommits` schema                     | Normal - schema                                                            | The `minimum` property is 1 | Rejects values below 1      |
| TC-002  | Read the `git-keizu.loadMoreCommits` schema                        | Normal - schema                                                            | The `minimum` property is 1 | Rejects values below 1      |
| TC-003  | Test `rgba(1, 2, 3, 0.5)` / `rgba(1, 2, 3, 1)` against the pattern | Normal - RGBA accepted                                                     | Both match the pattern      | Allows alpha 0-1            |
| TC-004  | Test `rgba(1, 2, 3)` against the pattern                           | Validation - 3 args rejected                                               | Does not match the pattern  | Rejects 3-argument rgba     |
| TC-005  | Test `rgba(1, 2, 3, 1.5)` against the pattern                      | Validation - alpha out of range                                            | Does not match the pattern  | Rejects alpha > 1           |
| TC-006  | Test `#0085d9` / `#0085d9cc` / `rgb(1, 2, 3)` against the pattern  | Normal - classic forms                                                     | All match the pattern       | Confirms HEX/RGB still work |

## S2: Resolving Critical and High issues in development dependencies (Feature 046)

> Origin: Feature 046 (dev-dependency-security-update) (light-spec-plan)
> Added: 2026-08-03
> Status: active
> Supersedes: -
> Signature: `package.json#devDependencies`
> Target Path: `package.json` (`devDependencies`)
> Test File: none (command acceptance)

Verifies the contract to resolve Critical and High vulnerabilities in development dependencies with the smallest diff within the existing major versions. Dependency audit results come from external npm registry data and change over time, so there are no fixed-value Vitest tests; each case is accepted by running a command or by a manual check.

| Case ID | Input / Precondition                                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                    | Notes                                                                                             |
| ------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| TC-007  | Check the direct dependency diff with `git diff -- package.json`                                    | Normal - scope of direct dependency diff                                   | The diff is only the 3 items `@vscode/vsce: ^3.9.2`, `vite: ^7.3.6`, `vitest: ^4.1.10`, with no diff in other direct dependencies, `dependencies`, scripts, contributes or engines | Range specifiers stay as `^`                                                                      |
| TC-008  | Run `pnpm install --frozen-lockfile` with the updated `pnpm-lock.yaml`                              | Normal - frozen lockfile install                                           | Completes with exit code 0, and no manifest/lock mismatch error is printed                                                                                                         | Confirms dependency installation is reproducible                                                  |
| TC-009  | Run `pnpm audit --audit-level=high` on all dependencies                                             | External - registry audit (all dependencies)                               | Exit code 0, with 0 Critical and 0 High reported                                                                                                                                   | Audit data comes from the npm registry and changes over time                                      |
| TC-010  | Run `pnpm audit --prod --audit-level=low` on production dependencies                                | External - registry audit (production dependencies)                        | 0 known vulnerabilities reported                                                                                                                                                   | `dependencies` is empty, and `node_modules` is not included in the VSIX                           |
| TC-011  | Run `pnpm why vitest vite rollup @vscode/vsce undici flatted markdown-it js-yaml postcss minimatch` | Validation - absence of old vulnerable resolutions                         | No vulnerable old resolution (Vitest 4.0.18, Vite 7.3.1, Rollup 4.58.0, Undici 7.22.0) appears on any dependency path of the 10 given packages                                     | Leftovers are judged per path                                                                     |
| TC-012  | Run `pnpm list vite --depth Infinity`                                                               | Boundary - Vite major boundary                                             | Every listed Vite resolution is 7.x, with 0 entries of 8.x                                                                                                                         | Forbids updates that cross the major boundary                                                     |
| TC-013  | Run `pnpm run format`                                                                               | Normal - format acceptance                                                 | Exit code 0                                                                                                                                                                        | `oxfmt --check`                                                                                   |
| TC-014  | Run `pnpm run lint`                                                                                 | Normal - lint acceptance                                                   | Exit code 0                                                                                                                                                                        | `oxlint`                                                                                          |
| TC-015  | Run `pnpm run typecheck`                                                                            | Normal - typecheck acceptance                                              | Exit code 0                                                                                                                                                                        | Both tsconfigs of `src/` and `web/`                                                               |
| TC-016  | Run `pnpm run test:ci`                                                                              | Normal - full regression acceptance                                        | Exit code 0 with 0 failed tests                                                                                                                                                    | Run at least once as a full-project regression                                                    |
| TC-017  | Run `pnpm run compile`                                                                              | Normal - build acceptance                                                  | Exit code 0, and `out/extension.js` and `out/web.min.js` are generated                                                                                                             | 2-target build with esbuild                                                                       |
| TC-018  | Run `pnpm run package`                                                                              | Normal - package acceptance                                                | Exit code 0, and a VSIX file is generated                                                                                                                                          | Created with `@vscode/vsce`                                                                       |
| TC-019  | Run `vsce ls` on the package target                                                                 | Validation - excluding VSIX contents                                       | The output contains no paths under `node_modules` and no unneeded development files (`src/`, `web/`, `tests/`, `docs/`, `notes/`)                                                  | The exclusions in `.vscodeignore` are kept                                                        |
| TC-020  | Install the generated VSIX in VS Code, open a Git repository and start the extension                | Normal - manual check of the main display                                  | The Git graph is drawn, and selecting a commit shows the commit details                                                                                                            | Cannot be automated, so it is a manual check and the result is recorded in the execution evidence |
| TC-021  | Only Moderate and Low remain in the audit result                                                    | Exception - branch for recording remaining audit findings                  | Does not block completion, and the severity, advisory ID and dependency path of each remaining finding are recorded in the execution evidence                                      | Not acceptable if even one Critical or High exists                                                |
| TC-022  | A High or higher vulnerability cannot be resolved within the existing major version                 | Exception - stop when it cannot be resolved                                | Does not use `pnpm.overrides`, forced updates or `audit --fix --force`; sets the checkpoint to `blocked`, stops, and records the target package and reason in blocking_reason      | Forbids apparent completion through exceptions                                                    |

### Failure-source inventory (include-or-justify)

| Failure source                                                       | Covering case or exclusion reason                                                                                                                                                                                         |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The direct dependency diff goes beyond the 3 given items             | TC-007                                                                                                                                                                                                                    |
| Changes in registry audit results (Critical or High reappearing)     | TC-009, TC-010, TC-021                                                                                                                                                                                                    |
| Frozen install failure (manifest/lock mismatch)                      | TC-008                                                                                                                                                                                                                    |
| Old dependency paths remaining                                       | TC-011                                                                                                                                                                                                                    |
| Vite 8.x mixed in                                                    | TC-012                                                                                                                                                                                                                    |
| Quality check failure (format / lint / typecheck / full regression)  | TC-013, TC-014, TC-015, TC-016                                                                                                                                                                                            |
| Build failure (compile)                                              | TC-017                                                                                                                                                                                                                    |
| Package creation failure (package)                                   | TC-018                                                                                                                                                                                                                    |
| Unneeded files included in the VSIX                                  | TC-019                                                                                                                                                                                                                    |
| Main screen fails to display in the manual check                     | TC-020                                                                                                                                                                                                                    |
| No fixed version exists within the existing major                    | TC-022                                                                                                                                                                                                                    |
| Input value boundaries (0 / minimum / maximum / +/-1 / empty / NULL) | excluded(the targets are JSON dependency range declarations and command exit codes, so there is no boundary that takes numeric or string input. The meaningful boundary is covered by the Vite major boundary in TC-012)  |
| Invalid types / invalid formats                                      | excluded(invalid types in dependency declarations are rejected by pnpm when it parses the manifest, which is existing behavior, and command acceptance has no type input, so this is not a failure source of this change) |

**Failure-category coverage (diversity floor)**:

- Validation: TC-011, TC-019
- Exception: TC-021, TC-022
- External: TC-009, TC-010
- Boundary: TC-012
- Type: excluded(as in the table above, there is no type input)

**Failure/normal ratio (smoke detector)**: 9 normal cases (TC-007, TC-008, TC-013 to TC-018, TC-020), 7 failure cases (TC-009 to TC-012, TC-019, TC-021, TC-022), ratio 0.78. Because failure cases are fewer than normal cases, the inventory was derived again, and as the table above shows every failure source is covered by a case or an exclusion reason. Of the 9 normal cases, the 6 cases (TC-013 to TC-018) that split the quality, build and package acceptance commands into 1 case = 1 command affect the ratio, and no cases are added or removed just to adjust the ratio.

### Feature 046 execution evidence

**Run date and time**: 2026-08-03 20:38 to 20:41 JST (2026-08-03T11:41:24Z)
**Environment**: Linux (WSL2), pnpm 10.29.3 (through `npx --yes pnpm@10.29.3`), Node.js as the project default
**Execution harness difference**: The implementation plan named `codex`, but the implementation ran through the `claude-code` subagent mechanism. The checkpoint wait round used the 480 seconds of the Codex preset, so `execution.harness: claude-code` and the source of the wait preset do not match. There is no effect on the deliverables or verification results; this item records the deviation in execution means from the plan.
**Verified commit**: `7716d04` (`chore: update vulnerable development dependencies`), comparison base `ebb48c8`
**Working branch**: `chore/046-dev-dependency-security-update`

#### Execution result per case

The INDEX generator counts table rows starting with `| TC-` as case definitions, so the execution evidence is recorded as a list, not a table. This keeps the case count of this section at the 16 cases of the case definition table above.

- **TC-007**: `git diff ebb48c8..HEAD -- package.json`, exit code 0. The diff is only the 3 items in `devDependencies` (`@vscode/vsce` from `^3.7.1` to `^3.9.2`, `vite` `^7.3.6` newly added, `vitest` from `^4.0.18` to `^4.1.10`). No diff in `dependencies`, scripts, contributes or engines.
- **TC-008**: `npx --yes pnpm@10.29.3 install --frozen-lockfile`, exit code 0. `Lockfile is up to date, resolution step is skipped` was printed, with no manifest/lock mismatch error.
- **TC-009**: `npx --yes pnpm@10.29.3 audit --audit-level=high`, exit code 0. `1 vulnerabilities found` / `Severity: 1 low`. 0 Critical, 0 High, 0 Moderate.
- **TC-010**: `npx --yes pnpm@10.29.3 audit --prod --audit-level=low`, exit code 0. `No known vulnerabilities found`.
- **TC-011**: `npx --yes pnpm@10.29.3 why vitest vite rollup @vscode/vsce undici flatted markdown-it js-yaml postcss minimatch`, exit code 0. All paths have only the updated resolutions, with 0 paths of the old vulnerable resolutions (Vitest 4.0.18, Vite 7.3.1, Rollup 4.58.0, Undici 7.22.0) and of minimatch 3.x.
- **TC-012**: `npx --yes pnpm@10.29.3 list vite --depth Infinity`, exit code 0. All 3 Vite references are 7.3.6 (direct dependency, peer of `@vitest/mocker`, peer of `vitest`), with 0 of 8.x.
- **TC-013**: `npx --yes pnpm@10.29.3 run format`, exit code 0. `All matched files use the correct format.` (175 files).
- **TC-014**: `npx --yes pnpm@10.29.3 run lint`, exit code 0. `Found 0 warnings and 0 errors.` (78 files, 97 rules).
- **TC-015**: `npx --yes pnpm@10.29.3 run typecheck`, exit code 0. `tsc -p ./src --noEmit && tsc -p ./web --noEmit` completed with no output.
- **TC-016**: `npx --yes pnpm@10.29.3 run test:ci`, exit code 0. `RUN v4.1.10` / `Test Files 41 passed (41)` / `Tests 1633 passed (1633)` with 0 failures. Run as a full-project regression.
- **TC-017**: `npx --yes pnpm@10.29.3 run compile`, exit code 0. Generated `out/extension.js 57.6kb` and `out/web.min.js 94.7kb`.
- **TC-018**: `npx --yes pnpm@10.29.3 run package`, exit code 0. `DONE Packaged: /home/numlia/work/ai/git-keizu/git-keizu-0.8.2.vsix (25 files, 147.58 KB)`.
- **TC-019**: `npx --yes pnpm@10.29.3 exec vsce ls`, exit code 0. 23 paths are included (`package.json` and related, `README.md`, `LICENSE`, `resources/`, `out/`, `media/`, `l10n/`), with 0 hits for `node_modules/`, `src/`, `web/`, `tests/`, `docs/` and `notes/`. The 2-file difference from the 25 files in the VSIX of TC-018 is the VSIX container metadata `extension.vsixmanifest` and `[Content_Types].xml`, which `vsce ls` does not list as extension content.
- **TC-020**: Installed the generated VSIX `/home/numlia/work/ai/git-keizu/git-keizu-0.8.2.vsix` in VS Code, opened a Git repository and started the extension. **Check OK** (checked 2026-08-03, manual check by the user). Confirmed that the Git graph draws the commit history and that selecting a commit shows the commit details (the commit's file contents). This case cannot be automated, so it is accepted by the user's manual check.
- **TC-021**: `npx --yes pnpm@10.29.3 audit --audit-level=low` (to get details of the remaining findings), exit code 1 (because Low was detected). The only remaining finding is the one in the next item, with 0 Critical, High and Moderate. Only Low remains, so it does not block completion.
- **TC-022**: TC-009 found 0 at High or above, so the stop branch for unresolvable findings did not occur. None of `pnpm.overrides`, forced updates or `audit --fix --force` were used.

#### Audit result totals and remaining findings (TC-009 / TC-010 / TC-021)

- Audit of all dependencies: 0 Critical, 0 High, 0 Moderate, 1 Low (1 in total)
- Audit of production dependencies: 0 known vulnerabilities

| severity | Package   | Advisory ID                                                              | Vulnerable versions | Fixed version | Dependency path |
| -------- | --------- | ------------------------------------------------------------------------ | ------------------- | ------------- | --------------- |
| low      | `esbuild` | [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr) | `>=0.27.3 <0.28.1`  | `>=0.28.1`    | `.>esbuild`     |

The summary is arbitrary file read when the development server is started on Windows. This project uses esbuild only as a bundler and does not start the development server, so as stated in implementation plan §7 it is out of scope for this change.

#### Main resolved versions

`vitest` 4.1.10, `vite` 7.3.6, `rollup` 4.62.4, `@vscode/vsce` 3.9.2, `undici` 7.29.0, `flatted` 3.4.4, `js-yaml` 4.3.1, `markdown-it` 14.3.0, `postcss` 8.5.25, `minimatch` 10.2.6 (the 3.x path is gone).

#### Deliverables

- VSIX: `/home/numlia/work/ai/git-keizu/git-keizu-0.8.2.vsix` (25 files, 147.58 KB)
- Build output: `out/extension.js`, `out/web.min.js`
- Both are excluded from commits by `.gitignore`.

#### Why no fixed-value Vitest tests are added, and alternative verification

Dependency audit results depend on external data, the advisories in the npm registry, and the same lockfile can give different results when new advisories are published or existing ones are updated. Embedding counts or advisory IDs as fixed values in Vitest would make unstable tests that fail without any code change, and the work of updating the fixed values would turn reviews into a formality. So this section has no fixed-value tests and is verified by the following alternatives.

- Dependency contract (TC-007): direct check of the manifest diff with `git diff`
- Reproducibility (TC-008): exit code of `pnpm install --frozen-lockfile`
- Audit and dependency paths (TC-009 to TC-012, TC-021, TC-022): run `pnpm audit` / `pnpm why` / `pnpm list` against the registry at that time and record the results in this evidence
- Compatibility (TC-013 to TC-018): quality checks with the existing package scripts, full-project regression tests, build and VSIX creation
- Contents and display (TC-019, TC-020): checking the `vsce ls` output and a manual check in VS Code

When re-verification is needed, re-run the commands above in the same order and check the differences from this evidence.

#### Whether the test code conventions apply

This task adds no Vitest tests, so the `// Case:` / `// Given:` / `// When:` / `// Then:` comment conventions, exception asserts and mock asserts in `docs/test-supplement.md` do not apply. Traceability of each Case ID is ensured by the per-case execution results above, which map each Case ID to its command, exit code and main output.

#### Checking the INDEX regeneration

Re-ran `python3 ~/.claude/skills/rebuild-test-perspectives-index/scripts/rebuild_index.py .` and confirmed that the root totals of 430 sections and 2104 cases, `package.json` with 2 sections and 22 cases, and the Reverse Lookup row of Feature 046 are kept. The evidence text is not counted by INDEX.

In the first regeneration, when the evidence was written as a table, `package.json` grew from 22 cases to 38 cases. The generator counts table rows starting with `| TC-` as case definitions, so the 16 rows of the evidence table were counted twice as cases. After changing the evidence to a list and regenerating, it returned to 22 cases. From now on, do not use tables when adding evidence to this section.

The diff between the regenerated `INDEX.md` and the current commit is only formatting drift in the generation timestamp line and table padding, with no difference in the totals, Forward Lookup or Reverse Lookup. So `INDEX.md` is not committed again and the output of Task 1 is kept.

## S3: pnpm 10.34.5 security update (Feature 050)

> Origin: Feature 050 (pnpm-security-update) (light-spec-plan)
> Added: 2026-08-04
> Status: active
> Supersedes: -
> Signature: `package.json#packageManager+scripts.vscode:prepublish`
> Target Path: `package.json` (`packageManager`, `scripts.vscode:prepublish`)
> Test File: none (command / external CI acceptance)

Verifies the contract that resolves known vulnerabilities in pnpm itself and makes `packageManager` and the Corepack / npx consumer paths agree on 10.34.5. The Advisory Database, the npm registry and main CI are external states that change over time, so there are no fixed-value Vitest tests; each case is accepted by a command, a scoped diff or CI execution evidence.

### Failure-source inventory (include-or-justify)

| Failure source                                                                        | Covering case or exclusion reason                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version pin mismatch in `packageManager` or `vscode:prepublish`                       | TC-023, TC-024                                                                                                                                                                                                                                             |
| 10.29.3 remaining in the target current locations                                     | TC-025, TC-026                                                                                                                                                                                                                                             |
| HTTP, JSON parse or rate-limit error from the npm registry or the Advisory API        | TC-027, TC-029                                                                                                                                                                                                                                             |
| A new advisory against pnpm 10.34.5                                                   | TC-028, TC-029                                                                                                                                                                                                                                             |
| frozen lock incompatibility                                                           | TC-030                                                                                                                                                                                                                                                     |
| audit failure of all project dependencies or of production dependencies               | TC-031, TC-032                                                                                                                                                                                                                                             |
| format / lint / typecheck / full regression failure                                   | TC-033, TC-034, TC-035, TC-036                                                                                                                                                                                                                             |
| Version mismatch of the nested pnpm consumer                                          | TC-024, TC-027, TC-037                                                                                                                                                                                                                                     |
| Missing bundle after prepublish or compile                                            | TC-037, TC-038                                                                                                                                                                                                                                             |
| VSIX package failure                                                                  | TC-039                                                                                                                                                                                                                                                     |
| Unneeded files included in the VSIX                                                   | TC-040                                                                                                                                                                                                                                                     |
| scope creep beyond the 2 given items, the 2 documents and S3 / INDEX                  | TC-041                                                                                                                                                                                                                                                     |
| Changes to S1 / S2, TC-001 to TC-022, or the Feature 046 historical evidence          | TC-042                                                                                                                                                                                                                                                     |
| pnpm version mismatch in main CI, failure of the existing `lint` job, missing run URL | TC-043                                                                                                                                                                                                                                                     |
| Numeric input boundaries (0 / minimum / maximum / +/-1 / empty / NULL)                | excluded(the package manager version and command acceptance take no numeric input. The meaningful boundaries are verified as advisory count 0->1 in TC-028 / TC-029, version 10.29.3->10.34.5 in TC-023 to TC-027, and main CI pending->success in TC-043) |
| Invalid types / invalid formats                                                       | excluded(there is no spec that passes type input to the package manager version or the acceptance commands, and invalid manifest / JSON / API formats are detected by each consumer or as a verification failure in TC-029)                                |

| Case ID | Input / Precondition                                                                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                  | Notes                                                                |
| ------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| TC-023  | Read `packageManager` in `package.json`                                                                         | Normal - package manager pin                                               | The value exactly equals the string `pnpm@10.34.5`                                                                                                                                                                                                                                               | Version boundary from 10.29.3 to 10.34.5                             |
| TC-024  | Read `scripts.vscode:prepublish` in `package.json`                                                              | Normal - nested npx pin                                                    | The value exactly equals the string `npx --yes pnpm@10.34.5 run compile`                                                                                                                                                                                                                         | Pins pnpm on the extension package path                              |
| TC-025  | Search the current pnpm guidance in `CLAUDE.md` and `docs/development/directory-structure.md`                   | Normal - current documentation sync                                        | The current version in both documents is 10.34.5, with 0 mismatches in the target current lines                                                                                                                                                                                                  | The historical evidence of Feature 046 is out of scope               |
| TC-026  | Classify where 10.29.3 remains in the target current locations and the Feature 046 history                      | Validation - stale current version rejection                               | 0 occurrences of 10.29.3 in the target current locations, and the only allowed leftover, the Feature 046 history in `package.json-test.md`, is listed with path / section / reason                                                                                                               | Repository-wide replacement is forbidden                             |
| TC-027  | Run `npx --yes pnpm@10.34.5 --version`                                                                          | External - npm registry resolution                                         | Exit code 0, and standard output exactly equals `10.34.5`                                                                                                                                                                                                                                        | HTTP or registry failure is not acceptable                           |
| TC-028  | Query the GitHub Advisory Database API with `ecosystem=npm&affects=pnpm@10.34.5`                                | External - pnpm advisory lookup                                            | After HTTP success, the top-level JSON is an array, and `jq length` returns 0                                                                                                                                                                                                                    | A separate contract from the project dependency audit                |
| TC-029  | The Advisory API check returns a High / Critical match, an HTTP error, a JSON parse error or a rate-limit error | Exception - advisory verification blocked                                  | Errors are not converted to 0 findings; the checkpoint status becomes `blocked`, and the matching advisory or the API failure type is recorded in the blocking reason                                                                                                                            | Do not switch to another version, pnpm 11 or ignore without approval |
| TC-030  | Run `install --frozen-lockfile` with pnpm 10.34.5                                                               | Normal - frozen install acceptance                                         | Exit code 0, with 0 diff in `pnpm-lock.yaml` and `pnpm-workspace.yaml` before and after the run                                                                                                                                                                                                  | Confirms manifest and lock compatibility                             |
| TC-031  | Run `audit --audit-level=high` with pnpm 10.34.5                                                                | External - full dependency audit                                           | Exit code 0, with 0 Critical and 0 High                                                                                                                                                                                                                                                          | Not a substitute for pnpm's own advisories                           |
| TC-032  | Run `audit --prod --audit-level=low` with pnpm 10.34.5                                                          | External - production dependency audit                                     | Exit code 0, with 0 known vulnerabilities reported                                                                                                                                                                                                                                               | Checks production dependencies separately                            |
| TC-033  | Run `run format` with pnpm 10.34.5                                                                              | Normal - format acceptance                                                 | Exit code 0, with 0 files reported as not matching the format                                                                                                                                                                                                                                    | `oxfmt --check`                                                      |
| TC-034  | Run `run lint` with pnpm 10.34.5                                                                                | Normal - lint acceptance                                                   | Exit code 0, with 0 warnings and 0 errors reported                                                                                                                                                                                                                                               | `oxlint`                                                             |
| TC-035  | Run `run typecheck` with pnpm 10.34.5                                                                           | Normal - typecheck acceptance                                              | Exit code 0, with 0 TypeScript errors in `src/` and `web/`                                                                                                                                                                                                                                       | Checks both tsconfigs                                                |
| TC-036  | Run `run test:ci` with pnpm 10.34.5                                                                             | Normal - full regression acceptance                                        | Exit code 0, with 0 failed test files and 0 failed tests reported                                                                                                                                                                                                                                | Run the whole project at least once                                  |
| TC-037  | Run `run vscode:prepublish` with pnpm 10.34.5                                                                   | Normal - prepublish acceptance                                             | Exit code 0, and `out/extension.js` and `out/web.min.js` exist                                                                                                                                                                                                                                   | Checks the npx pin consumer path inside the script                   |
| TC-038  | Run `run compile` with pnpm 10.34.5                                                                             | Normal - compile acceptance                                                | Exit code 0, and `out/extension.js` and `out/web.min.js` exist                                                                                                                                                                                                                                   | Checks that both bundles are generated                               |
| TC-039  | Run `run package` with pnpm 10.34.5                                                                             | Normal - package acceptance                                                | Exit code 0, and at least one `.vsix` output exists in the project root                                                                                                                                                                                                                          | Record the generated path in the execution evidence                  |
| TC-040  | Run `exec vsce ls` with pnpm 10.34.5                                                                            | Validation - VSIX content exclusion                                        | 0 paths each under `node_modules/`, `src/`, `web/`, `tests/`, `docs/` and `notes/` in the output                                                                                                                                                                                                 | Keeps the exclusions in `.vscodeignore`                              |
| TC-041  | Check the scoped diff of Tasks 1 to 3 from the comparison base                                                  | Validation - scope boundary                                                | The diff is only the 2 given items in `package.json`, the 2 documents, S3 / INDEX, and the user-authorized 1-line exclusion of the generated INDEX from the formatter in `.oxfmtrc.jsonc` (commit `1185370`), with 0 out-of-scope diffs in lock / workspace / CI / dependency / app code / tests | Check the allowed diff for each Task in order                        |
| TC-042  | Compare the baseline before S3 was added with the current `package.json-test.md` per section                    | Validation - historical evidence immutability                              | S1 / S2, TC-001 to TC-022 and the Feature 046 10.29.3 execution evidence are byte-equivalent, with a 0-byte diff                                                                                                                                                                                 | Only S3 is appended additively                                       |
| TC-043  | Check the main CI run that includes the Feature 050 merge commit                                                | Boundary - post-merge completion gate                                      | Completion of Feature 050 and the start of Feature 048 are held until the CI run URL is recorded, the pnpm version in the log is 10.34.5, and the existing `lint` job conclusion is `success`                                                                                                    | On the branch, `pending(post-merge gate)`                            |

**Failure-category coverage (diversity floor)**:

- Validation: TC-026, TC-040, TC-041, TC-042
- Exception: TC-029
- External: TC-027, TC-028, TC-031, TC-032
- Boundary: TC-043 (advisory 0->1 is also covered by TC-028 / TC-029, and version 10.29.3->10.34.5 by TC-023 to TC-027)
- Type: excluded(as in the table above, there is no type input, and invalid formats are detected by the consumers or TC-029)

**Failure/normal ratio (smoke detector)**: 11 normal cases (TC-023 to TC-025, TC-030, TC-033 to TC-039), 10 failure cases (TC-026 to TC-029, TC-031, TC-032, TC-040 to TC-043), ratio 0.91. Because the counts are close, the inventory was derived again, and every failure source in the table above has a Case ID or an exclusion reason. The normal cases that split quality, regression, build and package into 1 case = 1 command affect the ratio, and no cases are added or removed just to adjust the ratio.

### Feature 050 branch execution evidence

**Run date and time**: 2026-08-04T18:55:41+09:00

**Environment**: Linux 5.15.153.1-microsoft-standard-WSL2 x86_64, Node.js v24.13.0, pnpm 10.34.5 (through `npx --yes pnpm@10.34.5`)

#### Execution result per case

- **TC-023**: exact-value check equivalent to `jq -e '.packageManager == "pnpm@10.34.5"' package.json`, exit code 0. `packageManager` is `pnpm@10.34.5`.
- **TC-024**: exact-value check equivalent to `jq -e '.scripts["vscode:prepublish"] == "npx --yes pnpm@10.34.5 run compile"' package.json`, exit code 0. The nested pnpm pin is also 10.34.5.
- **TC-025**: `rg -n '10\\.29\\.3|10\\.34\\.5' package.json CLAUDE.md docs/development/directory-structure.md docs/testing/perspectives/package.json-test.md`, exit code 0. 2 places in `package.json`, 4 places in `CLAUDE.md` and 1 place in the directory guide are the current 10.34.5.
- **TC-026**: inverted check with `rg -n '10\\.29\\.3' package.json CLAUDE.md docs/development/directory-structure.md`, exit code 0, 0 hits in the target current locations. The allowed leftovers are only the S2 "Feature 046 execution evidence" in `docs/testing/perspectives/package.json-test.md` (history of runs with the old version) and the failure-source, boundary and immutability text of S3 (the contract for the change from 10.29.3 to 10.34.5), and neither is current version guidance.
- **TC-027**: `npx --yes pnpm@10.34.5 --version`, exit code 0, standard output `10.34.5`. The EROFS that occurred in the npm cache of the read-only sandbox was isolated by re-running the same command in the normal environment, and successful registry resolution was confirmed.
- **TC-028**: Saved the GitHub Advisory API response with `curl -fsSL` to `/tmp/git-keizu-pnpm-10.34.5-advisories.json`, then ran `file`, `jq -e 'type == "array"'` and `jq -e 'length == 0'` in order. All exit code 0, a JSON array, advisory count 0.
- **TC-029**: Ran the HTTP, JSON and count checks of TC-028 as independent commands with `curl -f` and `jq -e`, all exit code 0. No fallback that converts an HTTP error, parse error, rate-limit response or advisory to 0 findings was used, and the blocked condition did not occur.
- **TC-030**: `npx --yes pnpm@10.34.5 install --frozen-lockfile`, exit code 0. `Lockfile is up to date, resolution step is skipped`, pnpm v10.34.5. The working-tree diff of `pnpm-lock.yaml` and `pnpm-workspace.yaml` after the run is 0.
- **TC-031**: `npx --yes pnpm@10.34.5 audit --audit-level=high`, exit code 0. 0 Critical, 0 High. 1 Low below the failure threshold.
- **TC-032**: `npx --yes pnpm@10.34.5 audit --prod --audit-level=low`, exit code 0. `No known vulnerabilities found`.
- **TC-033**: `npx --yes pnpm@10.34.5 run format`, exit code 0. `All matched files use the correct format.`, 184 files.
- **TC-034**: `npx --yes pnpm@10.34.5 run lint`, exit code 0. 81 files, 97 rules, 0 warnings, 0 errors.
- **TC-035**: `npx --yes pnpm@10.34.5 run typecheck`, exit code 0. `tsc -p ./src --noEmit && tsc -p ./web --noEmit` completed with 0 TypeScript errors.
- **TC-036**: `npx --yes pnpm@10.34.5 run test:ci`, exit code 0. Vitest v4.1.10, Test Files 43 passed, Tests 1751 passed, 0 failures.
- **TC-037**: `npx --yes pnpm@10.34.5 run vscode:prepublish`, exit code 0. The script ran `npx --yes pnpm@10.34.5 run compile` and generated `out/extension.js` (63,371 bytes) and `out/web.min.js` (97,876 bytes).
- **TC-038**: `npx --yes pnpm@10.34.5 run compile`, exit code 0. Regenerated `out/extension.js` and `out/web.min.js` and confirmed both paths exist.
- **TC-039**: `npx --yes pnpm@10.34.5 run package`, exit code 0. Generated `/home/numlia/work/ai/git-keizu/git-keizu-0.8.3.vsix` (25 files, 149.42 KB).
- **TC-040**: `npx --yes pnpm@10.34.5 exec vsce ls`, exit code 0. 0 included paths in total under `node_modules/`, `src/`, `web/`, `tests/`, `docs/` and `notes/`.
- **TC-041**: `git diff --exit-code 14625d024981376cadaf91584f371bf14cb03f58..HEAD -- pnpm-lock.yaml pnpm-workspace.yaml .github/workflows/ci.yaml src web tests`, exit code 0. The changes from the base are only 6 files: `.oxfmtrc.jsonc`, `package.json`, `CLAUDE.md`, the directory guide, S3 and the generated INDEX, with 0 diff in dependency, lock, workspace, CI, `src/`, `web/` and `tests/`. The user-authorized corrective commit `1185370` is only the 1 line in `.oxfmtrc.jsonc` that excludes the canonical generated INDEX from the formatter and the formatting of the S3 table; it does not change the INDEX generator, the format script, dependencies, app code or tests.
- **TC-042**: Compared all 160 lines of the base `package.json-test.md` with the 160 lines before S3 in the current file by SHA-256; both are `13f1e5604c1532fcafb0792914e37f4ba43b4a3ee1e5fdff310e06156df7a5b4`. S1 / S2, TC-001 to TC-022 and the Feature 046 execution evidence are byte-equivalent.
- **TC-043**: `pending(post-merge gate)`. Completion of Feature 050 and the start of Feature 048 are held until the main CI run URL including the Feature 050 merge commit, the pnpm 10.34.5 usage log and success of the existing `lint` job are all available.

#### Deliverables and commit targets

The generated outputs are `out/extension.js`, `out/web.min.js` and `git-keizu-0.8.3.vsix`, and the external responses are `/tmp/git-keizu-pnpm-10.34.5-advisories.json` and `/tmp/git-keizu-pnpm-dist-tags.json`. None of them are commit targets of Task 3, and this file is the only one changed as branch evidence.

#### Why no fixed-value Vitest tests are added

The Advisory Database, the npm registry and main CI are external states that change over time, and for frozen install, audit, build, package and VSIX contents the command acceptance itself is the contract. A fixed-value Vitest test would either wrongly treat external failures as success or only recheck the same constants as the implementation, so none is added; verification uses `curl -f`, `jq -e`, pnpm commands, scoped diffs and post-merge CI evidence. Therefore `// Case:`, Given / When / Then and exception / mock assertions do not apply.
