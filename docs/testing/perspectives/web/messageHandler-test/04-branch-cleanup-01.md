# Test Perspectives: web/messageHandler.ts

> Source: `web/messageHandler.ts`
> Generated: 2026-08-25T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: branch-cleanup

## S17: Delegating the loadBranchCleanup response to the API

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void` (`case "loadBranchCleanup"`) / `GitKeizuViewAPI.loadBranchCleanup(response: ResponseLoadBranchCleanup): void`
> Target Path: `web/messageHandler.ts` (handleMessage switch; update to line ranges after implementation)
> Test File: `tests/web/messageHandler.test.ts`

Contract: the `loadBranchCleanup` case passes the whole response to `gitKeizu.loadBranchCleanup(msg)` once and does not interpret it in the handler (implementation plan §4 Task 5 implementation item 5). Freshness checks, runtime validation and rendering are owned by `web/branchCleanupPanel-test.md` S2 and are not in this table.

| Case ID | Input / Precondition                                                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                      | Notes                         |
| ------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| TC-079  | Receive `{ command: "loadBranchCleanup", repo, requestId, result: { kind: "ok", ... } }` | Normal - delegation without conversion                                     | `gitKeizu.loadBranchCleanup` is called once, and its argument is the same object as the received message (same reference with `toBe`)                | Exact object, no modification |
| TC-080  | Receive a response whose `result.kind` is `"error"`                                      | Normal - delegation without interpretation                                 | `gitKeizu.loadBranchCleanup` is called once, and the call counts of `showErrorDialog` and `gitKeizu.refresh` are 0                                   | The panel decides the display |
| TC-081  | Receive a malformed response whose `result.rows` contains a value outside the union      | Type - delegated even when malformed                                       | The handler throws no exception and `gitKeizu.loadBranchCleanup` is called once (validation is owned by the panel, so the handler passes it through) | Avoids duplicated validation  |

### Failure-source inventory (include-or-justify) — added by Feature 055-03 (S17)

| Failure source                                                | Case or reason for exclusion                                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Object modified on delegation / delegated multiple times      | TC-079 (verifies the same reference and a call count of 1)                                                          |
| Error display or refresh done first in the handler            | TC-080                                                                                                              |
| Handler exception on a malformed response                     | TC-081                                                                                                              |
| Freshness checks, row validation, rendering                   | excluded(owned by `web/branchCleanupPanel-test.md` S2)                                                              |
| External dependency x failure mode                            | excluded(the handler only branches on messages, with no external dependency)                                        |
| Exception / error paths                                       | excluded(no throw branch is added to the handler itself; passing malformed responses through is verified by TC-081) |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL) | excluded(the handler does not interpret values, so it has no numeric or empty boundary)                             |
| Input validation x violation pattern                          | excluded(validation is the panel owner's contract; TC-081 pins that the handler passes it through)                  |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(not validating is the contract, and passing through is pinned by TC-081)
- Exception: excluded(no throw path)
- External: excluded(no external dependency)
- Boundary: excluded(values are not interpreted, so there is no boundary)
- Type: TC-081
- Normal: TC-079, TC-080

**Failure/normal ratio (smoke detector)**: 2 normal cases (TC-079, TC-080), 1 failure case (TC-081). With a difference of 1 the inventory was re-derived; in this section with a single delegation branch the failure sources are limited to modification, interpretation done first and exceptions on malformed responses, and all validation was confirmed to be assigned to the panel owner.
