# Test Perspectives: src/config.ts

> Source: `src/config.ts`
> Generated: 2026-07-19T09:52:44+09:00
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: feature-045-defensive-fixes

## S18: gitPath() normalizes the git.path setting into a candidate list

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: S17
> Signature: `gitPath(): string[]`
> Target Path: `src/config.ts:222-225` (current implementation location; update after the fix)

Normalizes VS Code's `git.path` (`string | string[] | null`) into an order-preserving list of string candidates. A string becomes a one-element candidate list, and an array becomes a candidate list of its string elements only; non-string elements are dropped. Replaces S17's contract of "returns a single `string` and passes arrays through" (fix for the startup crash [1] where an array was passed as-is to `path.isAbsolute` / spawn).

| Case ID | Input / Precondition                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                             | Notes                                                                     |
| ------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| TC-097  | `git.path = "/usr/local/bin/git"` (string)                                   | Normal - string setting turned into a candidate list                       | `["/usr/local/bin/git"]` (an array of length 1) is returned                                                 | Single string → one-element candidate list                                |
| TC-098  | `git.path = ["C:\\Git\\git.exe", "/usr/bin/git"]` (array)                    | Normal - array setting keeps its order                                     | `["C:\\Git\\git.exe", "/usr/bin/git"]` is returned in the input order                                       | Matches the candidate search contract of VS Code's built-in Git extension |
| TC-099  | `git.path = null` (VS Code default when unset)                               | Boundary - null                                                            | `[]` (an empty array) is returned                                                                           | The final fallback to `git` is the resolver's responsibility (TC-004)     |
| TC-100  | `git.path = ["/usr/bin/git", 42, null, {}]` (array with non-string elements) | Type - non-string elements dropped                                         | `["/usr/bin/git"]` (string elements only, input order kept) is returned and contains no non-string elements | Defensive normalization of an external setting                            |

## S19: graphColours() falls back to the default colours when the filtered result is empty

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: S16
> Signature: `graphColours(): string[]`
> Target Path: `src/config.ts:117-134`

Extracts the 12 default colours into a named readonly constant, and returns a new copy of the 12-colour default array only when the result after filtering by `GRAPH_COLOUR_PATTERN` is empty. A non-empty list of valid colours is returned in order as before. Replaces S16's expectation of "returns an empty array when the filtered result is empty" (TC-089/TC-090) (fix for [5], where `x % 0 = NaN` in `web/graph.ts` led to an `undefined` colour lookup).

| Case ID | Input / Precondition                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                               | Notes                                                          |
| ------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| TC-101  | `graphColours = []` (explicit empty array setting)                                      | Boundary - empty setting                                                   | The default colour array of length 12 (first `"#0085d9"`, last `"#ffcc00"`) is returned                                                                       | Same values in the same order as the default in `package.json` |
| TC-102  | `graphColours = ["not-a-color", "rgba(1, 2, 3)"]` (every element removed by the filter) | Validation - all elements invalid                                          | The default colour array of length 12 is returned (not an empty array)                                                                                        | Replaces the empty-array expectation of S16 TC-089/TC-090      |
| TC-103  | `graphColours = ["rgba(1, 2, 3, 0.5)", "bad", "#0085d9"]` (mixed)                       | Normal - only valid colours, order kept                                    | `["rgba(1, 2, 3, 0.5)", "#0085d9"]` is returned (no fallback)                                                                                                 | Keeps the same behavior as S16 TC-092                          |
| TC-104  | `graphColours = ["#0085d9cc", "rgb(1, 2, 3)"]` (all elements valid)                     | Normal - no fallback                                                       | `["#0085d9cc", "rgb(1, 2, 3)"]` is returned in the input order                                                                                                | Valid colour lists pass through                                |
| TC-105  | After `push("#000000")` onto the array returned in TC-101, call `graphColours()` again  | Boundary - independence of the returned array                              | The second return value is the default colour array of length 12, unaffected by the change (changing the first returned array does not leak into the default) | The default array is returned as a copy (immutability)         |

### Failure-source inventory (include-or-justify)

| Failure source                                                                  | Covering case or reason for exclusion                                                                                              |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| A `git.path` array setting passed downstream as a single string (startup crash) | TC-098 (candidate list), TC-100 (non-string elements dropped)                                                                      |
| `git.path = null`                                                               | TC-099                                                                                                                             |
| Non-string elements mixed into `git.path`                                       | TC-100                                                                                                                             |
| Running an empty-string candidate                                               | excluded(structural validation of candidates is covered by TC-006 owned by `src/gitExecutable.ts`)                                 |
| `graphColours` empty after filtering (`undefined` colour lookup)                | TC-101 (empty setting), TC-102 (all elements invalid)                                                                              |
| Shared-reference pollution of the fallback default array                        | TC-105                                                                                                                             |
| Fallback wrongly applied to a valid colour list                                 | TC-103, TC-104                                                                                                                     |
| Exception while reading settings                                                | excluded(`workspaceConfiguration.get()` does not throw under its default-value contract, an existing behavior outside this change) |

**Failure-category coverage (diversity floor)**:

- Validation: TC-102
- Exception: excluded(neither method has a throw branch, and this change adds none)
- External: excluded(the only external dependency is the mock of `vscode.workspace.getConfiguration`, whose failure modes do not occur under the default-value contract)
- Boundary: TC-099, TC-101, TC-105
- Type: TC-100

Numeric boundaries (0 / minimum / maximum / +/-1) are out of scope because the spec sets no upper or lower limit on the number of elements in the colour array or the candidate list; the meaningful boundary, empty, is covered by TC-099 and TC-101.

**Failure/normal ratio (smoke detector)**: 4 normal cases (TC-097, TC-098, TC-103, TC-104), 5 failure cases (TC-099, TC-100, TC-101, TC-102, TC-105), ratio 1.25. Because the counts are close, the inventory was derived again, and every failure source of this change (two branches: normalization and fallback) is covered by a case or a reason for exclusion as shown above, so no further failure cases need to be added.
