# Test Perspectives: src/gitExecutable.ts

> Source: `src/gitExecutable.ts`
> Generated: 2026-07-19T09:52:44+09:00
> Language: TypeScript
> Test Framework: Vitest

## S1: resolveGitExecutable() sequential candidate validation and fallback

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: `resolveGitExecutable(candidates: string[]): Promise<string>` (assumed at design time; finalized during implementation)
> Target Path: `src/gitExecutable.ts` (new module; update to a line range after implementation)

Takes the list of string candidates normalized by `Config.gitPath()`, runs a safe structural check on each candidate, and probes them one by one with `spawn(candidate, ["--version"])`. A spawn error or non-zero exit moves on to the next candidate; if the list is empty or every candidate fails, it probes `git`. Even when the `git` probe also fails, it returns `git` as the final value (it does not reject) so that the existing no-Git display path is kept.

| Case ID | Input / Precondition                                                                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                  | Notes                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| TC-001  | `["/usr/bin/git"]`. spawn emits exit 0                                                                                    | Normal - first candidate succeeds                                          | Returns `"/usr/bin/git"`. spawn is called exactly once with `("/usr/bin/git", ["--version"])`                                                                                    | Normal path                                      |
| TC-002  | `["/bad/git", "/usr/bin/git"]`. The first candidate emits a spawn `error` event (ENOENT); the second exits 0              | External - spawn error moves to the next candidate                         | Returns `"/usr/bin/git"`. spawn is called twice in total, with first arguments in the order `"/bad/git"` → `"/usr/bin/git"`                                                      | Sequential search when the executable is missing |
| TC-003  | `["/old/git", "/usr/bin/git"]`. The first candidate exits 1; the second exits 0                                           | External - non-zero exit moves to the next candidate                       | Returns `"/usr/bin/git"`. spawn is called twice in total, and exit 1 from the first candidate does not reject                                                                    | Sequential search on exit code failure           |
| TC-004  | `[]` (empty candidate list). The `git` probe exits 0                                                                      | Boundary - empty candidate list                                            | spawn is called exactly once with `("git", ["--version"])`, and the return value is `"git"`                                                                                      | When `Config.gitPath()` is `[]`                  |
| TC-005  | `["/bad1", "/bad2"]`. Every candidate and the `git` probe fail (spawn error)                                              | External - final fallback when all candidates fail                         | spawn is called 3 times in total (`"/bad1"` → `"/bad2"` → `"git"`), and the return value is `"git"` (the Promise does not reject)                                                | Keeps the no-Git display path                    |
| TC-006  | `["", "/usr/bin/git"]` (includes an empty-string candidate that fails the structural check). The second candidate exits 0 | Validation - skip malformed candidates                                     | spawn is not called for the empty-string candidate (0 calls with `""` as the command); spawn is called once only, for `"/usr/bin/git"`, and the return value is `"/usr/bin/git"` | Structural check of candidates                   |

### Failure-source inventory (include-or-justify)

| Failure source                                                  | Covering case or reason for exclusion                                                                                        |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Candidate executable missing (spawn `error` event)              | TC-002                                                                                                                       |
| Candidate fails to run (non-zero exit)                          | TC-003                                                                                                                       |
| Empty candidate list                                            | TC-004                                                                                                                       |
| All candidates + `git` fail                                     | TC-005                                                                                                                       |
| Candidate rejected by the structural check (empty string, etc.) | TC-006                                                                                                                       |
| Non-string candidate mixed in                                   | excluded(`Config.gitPath()` drops non-string values during normalization; covered by config S18)                             |
| probe throw / reject path                                       | excluded(this module handles failure by moving to the next candidate as a resolved value; by contract it has no reject path) |

**Failure-category coverage (diversity floor)**:

- Validation: TC-006
- Exception: excluded(probe failure does not throw; under the resolved-value contract it moves to the next candidate, so there is no exception branch)
- External: TC-002, TC-003, TC-005
- Boundary: TC-004
- Type: excluded(candidates are already normalized to `string[]` by `Config.gitPath()`, so non-string values never reach this module)

Numeric boundaries (0 / minimum / maximum / +/-1) are out of scope because the spec sets no upper limit on the number of candidates; the meaningful boundaries are covered by the empty candidate list (TC-004) and the empty-string candidate (TC-006). NULL is converted to `[]` by the normalization in `Config.gitPath()` (config S18 TC-099), so it never reaches this module.

**Failure/normal ratio (smoke detector)**: 1 normal case (TC-001), 5 failure cases (TC-002 to TC-006), ratio 5.0.
