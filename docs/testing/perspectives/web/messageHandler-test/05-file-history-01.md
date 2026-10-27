# Test Perspectives: web/messageHandler.ts

> Source: `web/messageHandler.ts`
> Generated: 2026-09-08T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: file-history

## S18: Delegating the fileHistory response to the API

> Origin: Feature 055-07 (light-spec-plan)
> Added: 2026-09-08
> Status: active
> Supersedes: -
> Signature: `handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void` (`case "fileHistory"`) / `GitKeizuViewAPI.loadFileHistory(response: ResponseFileHistory): void`
> Target Path: `web/messageHandler.ts` (the handleMessage switch, after `case "fetchAvatar"`; update to a line range after implementation)
> Test File: `tests/web/messageHandler.test.ts`

The contract that the `fileHistory` case passes the whole response to `gitKeizu.loadFileHistory(msg)` once and the handler does not interpret it (implementation plan §4 Task 7 implementation item 1). Freshness checks on requestId / repo, the error dialog and highlighting belong to `web/fileHistory-test.md` S3 to S4 and are not covered in this table.

| Case ID | Input / Precondition                                                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                   | Notes                                        |
| ------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| TC-082  | Receive `{ command: "fileHistory", repo, requestId, anchorHash, filePath, entries: [...] }` | Normal - delegation without conversion                                     | `gitKeizu.loadFileHistory` is called once, and its argument is the same object as the received message (same reference with `toBe`)               | exact object, no processing                  |
| TC-083  | Receive a response with `entries: null`                                                     | Normal - delegation without interpretation                                 | `gitKeizu.loadFileHistory` is called once, and the call counts of `showErrorDialog` and `gitKeizu.refresh` are 0                                  | Display decisions are on the controller side |
| TC-084  | Receive a malformed response whose `entries` contain a `type` outside the union             | Type - delegated even when malformed                                       | The handler does not throw and `gitKeizu.loadFileHistory` is called once (validation belongs to the controller, so the handler passes it through) | Prevents duplicated validation               |

### Failure-source inventory (include-or-justify) - added by Feature 055-07 (S18)

| Failure source                                                  | Covering cases or reason for exclusion                                                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Processing the object on delegation / delegating more than once | TC-082 (checks the same reference and call count 1)                                                                                   |
| The handler shows an error or refreshes first                   | TC-083                                                                                                                                |
| The handler throws on a malformed response                      | TC-084                                                                                                                                |
| Freshness checks / missing anchor / highlighting                | excluded (owned by `web/fileHistory-test.md` S3 to S4)                                                                                |
| External dependency x failure mode                              | excluded (the handler only branches on the message, with no external dependencies)                                                    |
| Exception / error paths                                         | excluded (no throw branch is added to the handler itself. Passing malformed data through is checked in TC-084)                        |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)   | excluded (the handler does not interpret values, so it has no numeric or empty boundaries. Passing `entries: null` through is TC-083) |
| Input validation x violation patterns                           | excluded (validation is the contract of the controller owner. TC-084 pins that the handler passes it through)                         |

**Failure-category coverage (diversity floor)**:

- Validation: excluded (not validating is the contract, and passing through is pinned by TC-084)
- Exception: excluded (no throw path)
- External: excluded (no external dependencies)
- Boundary: excluded (does not interpret values, so no boundaries)
- Type: TC-084
- Normal: TC-082, TC-083

**Failure/normal ratio (smoke detector)**: 2 normal cases (TC-082, TC-083), 1 failure case (TC-084). Because the difference is 1, the inventory was re-derived; in this section with a single delegation branch, the failure sources are limited to processing, interpreting first and exceptions on malformed data, and all validation is assigned to the controller owner.
