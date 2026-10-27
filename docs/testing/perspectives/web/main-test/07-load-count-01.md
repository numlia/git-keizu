# Test Perspectives: web/main.ts

> Source: `web/main.ts`
> Generated: 2026-05-17T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: load-count

## S39: maxCommits normalization helper (Feature 040)

> Origin: Feature 040 (settings-and-copy-polish) (light-spec-plan)
> Added: 2026-05-17
> Status: active
> Supersedes: -
> Signature: `normalizeCommitLoadCount(value: number, defaultValue: number): number`
> Target Path: `web/main.ts`
> Test File: `tests/web/main.test.ts`

Verifies the `normalizeCommitLoadCount` helper, which keeps the payload of `requestLoadCommits` at 1 or more even when the old webview state (`prevState.maxCommits`) is 0, negative or non-finite, and also after the increment by Load More or automatic loading.

| Case ID | Input / Precondition          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes                                                                    |
| ------- | ----------------------------- | -------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------ |
| TC-216  | `value=0, defaultValue=300`   | Boundary - lower bound                                                     | Returns 1       | 0 is corrected to 1                                                      |
| TC-217  | `value=-50, defaultValue=300` | Validation - negative                                                      | Returns 1       | A negative value is corrected to 1                                       |
| TC-218  | `value=NaN, defaultValue=300` | Validation - non-finite                                                    | Returns 300     | Falls back to the default                                                |
| TC-219  | `value=400, defaultValue=300` | Normal - positive                                                          | Returns 400     | A positive value is kept (a typical value after the Load More increment) |
| TC-220  | `value=NaN, defaultValue=0`   | Validation - degenerate default                                            | Returns 1       | 1 is guaranteed even when the default is also below the lower limit      |
