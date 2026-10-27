# Test Perspectives: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Generated: 2026-08-25T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: branch-cleanup

## S33: loadBranchCleanup routing, requestId validation, panel mount

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `case "loadBranchCleanup"` of `private respondToMessage()` / `private getHtmlForWebview()` (mount of `#branchCleanupBtn` / `#branchCleanupPanel`)
> Target Path: `src/gitGraphView.ts` (message switch and HTML mount; update to a line range after implementation)
> Test File: `tests/src/gitGraphView.test.ts`

Perspectives for the routing that calls DataSource once only for a request satisfying `Number.isSafeInteger(requestId) && requestId > 0`, and echoes repo / requestId unchanged (implementation plan §4 Task 3). Computing the diagnostic values belongs to `src/dataSource-test/06-branch-cleanup-01.md` S48, and the panel state / rendering to `web/branchCleanupPanel-test.md`; they are not in this table.

| Case ID | Input / Precondition                                                                                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                 | Notes                                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| TC-158  | Receive `{ command: "loadBranchCleanup", repo: <whitelist 済>, requestId: 5, compareBranch: null }` (repo already whitelisted) | Normal - a valid request is delegated                                      | `dataSource.getBranchCleanup` is called once with `(repo, null)`, and `postMessage` is called with 1 response with `command: "loadBranchCleanup"`                               | 1 request = 1 call = 1 response            |
| TC-159  | Check the response contents of the same request                                                                                | Normal - repo / requestId echo                                             | `repo` and `requestId` of the response match the request values with `toBe`, and `result` matches the discriminated union returned by DataSource with `toEqual` (no conversion) | Echo contract                              |
| TC-160  | Receive a valid request with `compareBranch: "develop"`                                                                        | Normal - compareBranch passthrough                                         | `getBranchCleanup` is called once with `(repo, "develop")` (the value is not processed or validated)                                                                            | Resolution is on the DataSource side       |
| TC-161  | Receive a request with `requestId: 0`                                                                                          | Validation - requestId 0                                                   | Call count of `getBranchCleanup` is 0, and there are 0 `loadBranchCleanup` responses in `postMessage`                                                                           | Neither responds nor runs Git              |
| TC-162  | Receive a request with `requestId: -1`                                                                                         | Validation - negative requestId                                            | `getBranchCleanup` call count 0, 0 responses                                                                                                                                    | -                                          |
| TC-163  | Receive a request with `requestId: 1.5`                                                                                        | Validation - fractional requestId                                          | `getBranchCleanup` call count 0, 0 responses                                                                                                                                    | -                                          |
| TC-164  | Receive a request with `requestId: "1"` (string)                                                                               | Type - string requestId                                                    | `getBranchCleanup` call count 0, 0 responses                                                                                                                                    | runtime guard                              |
| TC-165  | Receive a request with `requestId: Number.MAX_SAFE_INTEGER + 1`                                                                | Validation - unsafe integer                                                | `getBranchCleanup` call count 0, 0 responses                                                                                                                                    | `Number.isSafeInteger` guard               |
| TC-166  | Receive a request with `requestId: 1` (smallest valid)                                                                         | Boundary - smallest requestId                                              | `getBranchCleanup` is called once, and the response echoes `requestId` as `1`                                                                                                   | Boundary with 0                            |
| TC-167  | Receive a request with `requestId: Number.MAX_SAFE_INTEGER`                                                                    | Boundary - largest safe requestId                                          | `getBranchCleanup` is called once, and the response echoes `requestId` as `Number.MAX_SAFE_INTEGER`                                                                             | Upper boundary                             |
| TC-168  | Observe mute / unmute of repoFileWatcher while handling a valid request                                                        | Normal - watcher finally contract                                          | As in the existing message cases, the watcher unmute is called once after processing finishes (`finally`)                                                                       | Existing contract kept                     |
| TC-169  | Call `getHtmlForWebview()`                                                                                                     | Normal - mount order                                                       | In the generated HTML the order of appearance is controls → `#branchCleanupBtn` → `#branchCleanupPanel` → `#scrollContainer`, and `#branchCleanupPanel` is output hidden        | Mount contract                             |
| TC-170  | Check `#branchCleanupBtn` in the generated HTML                                                                                | Normal - toolbar button                                                    | `#branchCleanupBtn` exists inside controls, and its title matches the string from the branch cleanup key of the host l10n                                                       | The l10n value is in `src/i18n-test.md` S2 |
| TC-171  | Check the existing DOM in the generated HTML                                                                                   | Normal - existing subtree kept                                             | All existing IDs `#scrollContainer` / `#commitGraph` / dialogs remain, and no branch name string is embedded in the HTML                                                        | No regression of the graph subtree         |
| TC-172  | Trigger only the refresh notification path (equivalent to `sendMessage`) without receiving a request                           | Validation - no host-initiated request                                     | 0 messages sent to the webview have `command: "loadBranchCleanup"` (the host does not create diagnostic requests or responses unless the panel is opened)                       | Requests start only from the webview       |

### Failure-source inventory (include-or-justify) — added by Feature 055-03 (S33)

| Failure source                                                               | Covering cases or reason for exclusion                                                                                                        |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Invalid requestId (0 / negative / fractional / string / unsafe) gets through | TC-161 to TC-165                                                                                                                              |
| Valid boundaries (1 / MAX_SAFE_INTEGER) wrongly rejected                     | TC-166, TC-167                                                                                                                                |
| Broken echo of repo / requestId, result processed                            | TC-159                                                                                                                                        |
| Several calls / responses for 1 request                                      | TC-158 (checks call count / response count of 1)                                                                                              |
| Missing watcher unmute                                                       | TC-168                                                                                                                                        |
| Broken mount order or hidden initial state                                   | TC-169                                                                                                                                        |
| Existing graph / dialog DOM broken, branch names embedded in HTML            | TC-171                                                                                                                                        |
| Host creates diagnostic requests on its own                                  | TC-172                                                                                                                                        |
| A repo outside the repository whitelist                                      | excluded(the repository check shared by existing messages, owned by the S sections of the existing owner `01-message-routing-01.md`)          |
| Failures and diagnostic values inside DataSource                             | excluded(owned by `src/dataSource-test/06-branch-cleanup-01.md` S48. The route echoes the result without conversion)                          |
| Exception and error paths                                                    | excluded(the route itself adds no throw branch. DataSource's contract is to return failures as a union and never reject)                      |
| Boundary values (empty / NULL)                                               | excluded(numeric boundaries of requestId are covered by TC-161 to TC-167. A null requestId takes the same branch as the Type guard in TC-164) |

**Failure-category coverage (diversity floor)**:

- Validation: TC-161 to TC-163, TC-165, TC-172
- Exception: excluded(no throw branch, as in the table above)
- External: excluded(mapping Git failures is owned by the DataSource owner)
- Boundary: TC-166, TC-167
- Type: TC-164
- Normal: TC-158 to TC-160, TC-168 to TC-171

**Failure/normal ratio (smoke detector)**: 7 normal cases (TC-158 to TC-160, TC-168 to TC-171), 8 failure cases (TC-161 to TC-167, TC-172). The counts are close, so the inventory was derived again; it was confirmed that the failure sources of the routing layer are limited to the requestId guard, broken echo, mount / DOM regressions and host-initiated requests, and that Git failures and rendering are assigned to other owners. The normal cases include structural checks of the mount and of keeping the existing DOM, which is why they are numerous; no cases were added or removed to adjust the ratio.
