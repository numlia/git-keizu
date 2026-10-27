# Test Perspectives: src/config.ts

> Source: `src/config.ts`
> Generated: 2026-05-17T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: feature-040-load-and-rgba

## S15: initialLoadCommits() / loadMoreCommits() correct values below 1

> Origin: Feature 040 (settings-and-copy-polish) (light-spec-plan)
> Added: 2026-05-17
> Status: active
> Supersedes: -
> Signature: `initialLoadCommits(): number`, `loadMoreCommits(): number`
> Target Path: `src/config.ts`

Verifies that `normalizeCommitLoadCount(value, defaultValue)` corrects 0, negative values and non-finite values to an integer of at least 1.

| Case ID | Input / Precondition         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes                              |
| ------- | ---------------------------- | -------------------------------------------------------------------------- | --------------- | ---------------------------------- |
| TC-081  | `initialLoadCommits` not set | Normal - default                                                           | Returns 300     | Package default                    |
| TC-082  | `initialLoadCommits = 0`     | Boundary - lower bound                                                     | Returns 1       | 0 is corrected to 1                |
| TC-083  | `initialLoadCommits = -50`   | Validation - invalid value                                                 | Returns 1       | Negative values are corrected to 1 |
| TC-084  | `loadMoreCommits` not set    | Normal - default                                                           | Returns 100     | Package default                    |
| TC-085  | `loadMoreCommits = 0`        | Boundary - lower bound                                                     | Returns 1       | 0 is corrected to 1                |
| TC-086  | `loadMoreCommits = 250`      | Normal - positive                                                          | Returns 250     | Positive values are kept           |

## S16: graphColours() RGBA filter

> Origin: Feature 040 (settings-and-copy-polish) (light-spec-plan)
> Added: 2026-05-17
> Status: superseded
> Superseded By: S19
> Supersedes: -
> Signature: `graphColours(): string[]`
> Target Path: `src/config.ts`

Verifies that only the allowed forms (HEX 6/8, rgb(), rgba() with alpha 0-1) are kept, through `GRAPH_COLOUR_PATTERN`.

| Case ID | Input / Precondition                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                             | Notes                                             |
| ------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------- |
| TC-087  | `["rgba(1, 2, 3, 0.5)"]`                                            | Normal - alpha mid                                                         | The input array is returned unchanged       | alpha 0.5 is allowed                              |
| TC-088  | `["rgba(1, 2, 3, 1)"]`                                              | Boundary - alpha max                                                       | The input array is returned unchanged       | alpha 1 is allowed                                |
| TC-089  | `["rgba(1, 2, 3)"]`                                                 | Validation - 3 args                                                        | Empty array                                 | rgba with 3 arguments is rejected                 |
| TC-090  | `["rgba(1, 2, 3, 1.5)"]`                                            | Validation - alpha out of range                                            | Empty array                                 | alpha > 1 is rejected                             |
| TC-091  | `["rgb(1, 2, 3)", "#0085d9", "#0085d9cc"]`                          | Normal - classic forms                                                     | The input array is returned unchanged       | HEX/RGB are kept                                  |
| TC-092  | `["rgba(1, 2, 3, 0.5)", "rgba(1, 2, 3)", "#0085d9", "not-a-color"]` | Mixed                                                                      | Returns `["rgba(1, 2, 3, 0.5)", "#0085d9"]` | Only invalid values are filtered out (order kept) |
