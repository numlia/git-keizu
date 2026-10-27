# Test Perspectives: src/dataSource.ts

> Source: `src/dataSource.ts`
> Generated: 2026-07-19T09:52:44+09:00
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: git-path

## S37: registerGitPath() assigns a single path at once after resolution completes

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: `public async registerGitPath(): Promise<void>` (changed to an async contract. The constructor initializes with a safe default)
> Target Path: `src/dataSource.ts:95-114` (current implementation location; update after the fix)

`registerGitPath()` awaits the completion of the candidate resolution in `src/gitExecutable.ts` (sequential `--version` probes), and after resolution assigns a single string to `this.gitPath` at once. The constructor initializes with a safe default (`git`), so candidates or arrays in the middle of resolution never reach the command of `spawnGit()` / `runGitCommandSpawn()`. The branches of the candidate resolution itself (sequential probes, fallback) are the responsibility of `src/gitExecutable-test.md` S1.

| Case ID | Input / Precondition                                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                            | Notes                                                             |
| ------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| TC-218  | The resolver resolves to `"/opt/git/bin/git"`. Run a Git command after awaiting `registerGitPath()` | Normal - resolved value applied                                            | The first argument (command) of subsequent spawn calls is `"/opt/git/bin/git"` (a single string)                                                                                                           | Assigned at once after resolution completes                       |
| TC-219  | Run a Git command while the resolver is pending (unresolved Promise)                                | Boundary - safe default before resolution                                  | The spawn command is a single string with the value before resolution (the default `"git"` or the old path before the change), and no array, `undefined` or in-progress candidate is passed as the command | Contract of keeping the old value (also on configuration changes) |
| TC-220  | The resolver returns `"git"` after all candidates fail                                              | External - fallback applied when all candidates fail                       | `registerGitPath()` resolves without rejecting, and the command of subsequent spawns is `"git"`                                                                                                            | Keeps the no-Git display path                                     |

### Failure-source inventory (include-or-justify)

| Failure source                                              | Covering case or reason for exclusion                                                                         |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| An array is passed as is to the spawn command               | TC-218, TC-219 (fixes that it is always a single string)                                                      |
| In-progress candidates are exposed                          | TC-219                                                                                                        |
| All candidates fail                                         | TC-220                                                                                                        |
| Branches for invalid candidate structure and probe failures | excluded(covered by TC-001 to TC-006 of the `src/gitExecutable.ts` owner)                                     |
| Activation does not wait for resolution                     | excluded(covered by TC-032 to TC-033 of the `src/extension.ts` owner)                                         |
| The resolver rejects                                        | excluded(the resolver's contract is to return the final fallback `git` and never reject. gitExecutable owner) |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(this method only assigns a validated resolved value and has no input validation branch)
- Exception: excluded(the resolver never rejects by contract, so no throw path exists)
- External: TC-220
- Boundary: TC-219
- Type: excluded(the resolved value is guaranteed by the type contract that the resolver returns a single `string`)

Numeric and empty boundaries (0 / minimum / maximum / +/-1 / empty / NULL) are out of scope because this section covers the timing contract of assigning the resolved value, where they have no meaning in the spec (the meaningful boundary, "before resolution", is covered by TC-219).

**Failure/normal ratio (smoke detector)**: 1 normal case (TC-218), 2 failure cases (TC-219, TC-220), ratio 2.0.
