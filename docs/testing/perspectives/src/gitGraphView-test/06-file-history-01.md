# Test Perspectives: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Generated: 2026-09-08T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: file-history

## S34: fileHistory routing, requestId validation and response echo

> Origin: Feature 055-07 (light-spec-plan)
> Added: 2026-09-08
> Status: active
> Supersedes: -
> Signature: `case "fileHistory"` in `private respondToMessage()` (after `case "fetchAvatar"`)
> Target Path: `src/gitGraphView.ts` (message switch; to be updated to a line range after implementation)
> Test File: `tests/src/gitGraphView.test.ts`

Perspectives for the routing where only requests for registered repositories pass the leading filter (`src/gitGraphView.ts:161-170`), and only when `Number.isSafeInteger(requestId) && requestId > 0` holds is `dataSource.getFileHistory()` called once and `repo` / `requestId` / `anchorHash` / `filePath` echoed (implementation plan §4 Task 3, implementation items 2 to 3). Git arguments and entry computation belong to `src/dataSource-test/07-file-history-01.md` S49 to S50, and hash / path validation to the DataSource side; they are not in this table.

| Case ID | Input / Precondition                                                                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                     | Notes                                      |
| ------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| TC-173  | Receive `{ command: "fileHistory", repo: <未登録>, requestId: 1, anchorHash, filePath }` (`<未登録>` = an unregistered repo) | Validation - unregistered repository                                       | The call counts of `dataSource.getFileHistory` and `postMessage` are 0 (no response)                                | Left to the existing leading filter        |
| TC-174  | A request with `requestId: 0`                                                                                                | Boundary - requestId 0                                                     | The call counts of `getFileHistory` and `postMessage` are 0                                                         | Does not satisfy `> 0`                     |
| TC-175  | A request with `requestId: -1`                                                                                               | Validation - negative number                                               | The call counts of `getFileHistory` and `postMessage` are 0                                                         | -                                          |
| TC-176  | A request with `requestId: 1.5`                                                                                              | Type - non-integer                                                         | The call counts of `getFileHistory` and `postMessage` are 0                                                         | `Number.isSafeInteger` is false            |
| TC-177  | A request with `requestId: Number.MAX_SAFE_INTEGER + 1`                                                                      | Boundary - safe integer limit +1                                           | The call counts of `getFileHistory` and `postMessage` are 0                                                         | -                                          |
| TC-178  | A request with `requestId: 1` (the smallest valid value)                                                                     | Boundary - smallest valid value                                            | `getFileHistory` is called once, and `postMessage` is called with 1 response of `command: "fileHistory"`            | -                                          |
| TC-179  | A request with `requestId: Number.MAX_SAFE_INTEGER`                                                                          | Boundary - safe integer limit                                              | `getFileHistory` is called once, and the response's `requestId` is the same value                                   | -                                          |
| TC-180  | A request with a registered repo, `requestId: 5`, `anchorHash: "abc"`, `filePath: "src/a.txt"`                               | Normal - delegation to the DataSource                                      | `getFileHistory` is called once with `("<repo>", "abc", "src/a.txt")`                                               | Arguments are not modified                 |
| TC-181  | The response to the same request                                                                                             | Normal - echo of 4 fields                                                  | The response's `repo` / `requestId` / `anchorHash` / `filePath` match the request values with `toBe`                | -                                          |
| TC-182  | `getFileHistory` returns an entries array                                                                                    | Normal - same reference for entries                                        | The response's `entries` is the same reference as the return value with `toBe` (not converted)                      | -                                          |
| TC-183  | `getFileHistory` returns `null`                                                                                              | Normal - null passed through                                               | The response's `entries` is `null` (not folded into `[]` or `undefined`), and `postMessage` is called once          | Failures also get a response               |
| TC-184  | A request with a valid requestId and `anchorHash: "zz"` (invalid hash)                                                       | Normal - hash / path validation is delegated                               | `getFileHistory` is called once with `"zz"` passed as is, and the response's `entries` is the return value (`null`) | Validation belongs to the DataSource owner |

### Failure-source inventory (include-or-justify) — added by Feature 055-07 (S34)

| Failure source                                                                   | Covering case or reason for exclusion                                                                                                                                                                  |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Responding to an unregistered repository                                         | TC-173                                                                                                                                                                                                 |
| Responding to an invalid requestId (0 / negative / non-integer / over the limit) | TC-174 to TC-177                                                                                                                                                                                       |
| Missing a valid requestId (boundary)                                             | TC-178, TC-179                                                                                                                                                                                         |
| Missing echo fields or modified values                                           | TC-181, TC-182, TC-184                                                                                                                                                                                 |
| Folding `null` into `[]` or `undefined`                                          | TC-183                                                                                                                                                                                                 |
| Duplicate DataSource calls or modified arguments                                 | TC-180                                                                                                                                                                                                 |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)                    | 0: TC-174. minimum: TC-178. maximum: TC-179. +1: TC-177. NULL: TC-183. empty: excluded(requestId is a number, and the empty-string check of `anchorHash` / `filePath` belongs to the DataSource owner) |
| External dependency × failure mode                                               | excluded(`getFileHistory()` maps Git failures to `null`, and TC-183 pins that the routing passes it through)                                                                                           |
| Exception and error paths                                                        | excluded(no throw branch is added to the case clause)                                                                                                                                                  |
| Stale response / missing anchor / DOM re-creation / unload                       | excluded(belongs to the webview owner. The host responds per request)                                                                                                                                  |

**Failure-category coverage (diversity floor)**:

- Validation: TC-173, TC-175
- Exception: excluded(no throw path; see the table above)
- External: excluded(see the table above)
- Boundary: TC-174, TC-177 to TC-179
- Type: TC-176
- Normal: TC-180 to TC-184

**Failure/normal ratio (smoke detector)**: 5 normal cases, 7 failure cases. This section covers one routing case, its failure sources are limited to the repo filter and the requestId check, and they are all listed in the table above. No cases are added or removed just to adjust the ratio.
