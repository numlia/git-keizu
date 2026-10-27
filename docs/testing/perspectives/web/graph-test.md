# Test Perspectives: web/graph.ts

> Source: `web/graph.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: Vertex drawing for stash commits

> Origin: Feature 001 (menu-bar-enhancement) Task 3.4
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `web/graph.ts`

| Case ID | Input / Precondition                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                       | Notes                                     |
| ------- | ------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------- |
| TC-001  | Vertex drawing for a stash commit     | Normal - standard                                                          | A double circle is drawn (outer: filled, inner: ring) | Checks the drawing parameters in graph.ts |
| TC-002  | Vertex drawing for a non-stash commit | Normal - non-stash                                                         | A single circle is drawn (existing behavior kept)     | -                                         |

## S2: Vertex constructor and the id property

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**Signature**: `constructor(id: number)`
**Target path**: `web/graph.ts`

| Case ID | Input / Precondition                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                   | Notes                       |
| ------- | ------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------- | --------------------------- |
| TC-003  | Create a Vertex with id=5                   | Normal - standard                                                          | getId() === 5, getPoint().y === 5 | id and y are the same value |
| TC-004  | Create a Vertex with id=NULL_VERTEX_ID (-1) | Normal - special value                                                     | getId() === -1                    | For nullVertex              |
| TC-005  | Create a Vertex with id=0                   | Boundary - zero                                                            | getId() === 0                     | The first commit            |

## S3: Vertex.addChild() / managing children

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**Signature**: `addChild(vertex: Vertex): void`
**Target path**: `web/graph.ts`

| Case ID | Input / Precondition       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                   | Notes   |
| ------- | -------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------- | ------- |
| TC-006  | Add one child Vertex       | Normal - standard                                                          | Length of the children array === 1                | -       |
| TC-007  | Add several child Vertices | Normal - standard                                                          | Length of the children array === the number added | -       |
| TC-008  | No child Vertex added      | Boundary - empty                                                           | Length of the children array === 0                | Default |

## S4: Vertex.getParents() getter

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**Signature**: `getParents(): Vertex[]`
**Target path**: `web/graph.ts`

| Case ID | Input / Precondition                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                          | Notes                      |
| ------- | ------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------- | -------------------------- |
| TC-009  | getParents() after adding two parents            | Normal - standard                                                          | An array of length 2, in the order added | -                          |
| TC-010  | getParents() with no parents added               | Boundary - empty                                                           | Empty array                              | -                          |
| TC-011  | getParents() after adding nullVertex as a parent | Normal - special                                                           | An array containing nullVertex           | Has an out-of-range parent |

## S5: Vertex.isStash public getter

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**Target path**: `web/graph.ts`

| Case ID | Input / Precondition       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result   | Notes   |
| ------- | -------------------------- | -------------------------------------------------------------------------- | ----------------- | ------- |
| TC-012  | setStash() not called      | Normal - default                                                           | isStash === false | Default |
| TC-013  | After setStash() is called | Normal - standard                                                          | isStash === true  | -       |

## S6: Vertex.isMerge() with nullVertex

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**Signature**: `isMerge(): boolean`
**Target path**: `web/graph.ts`

| Case ID | Input / Precondition               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result     | Notes                      |
| ------- | ---------------------------------- | -------------------------------------------------------------------------- | ------------------- | -------------------------- |
| TC-014  | Add two normal parents             | Normal - standard                                                          | isMerge() === true  | Normal merge               |
| TC-015  | One normal parent + one nullVertex | Normal - standard                                                          | isMerge() === true  | Has an out-of-range parent |
| TC-016  | Only one parent                    | Normal - standard                                                          | isMerge() === false | Not a merge                |
| TC-017  | No parents                         | Boundary - no parents                                                      | isMerge() === false | -                          |

## S7: Graph.loadCommits() nullVertex mechanism

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**Signature**: `loadCommits(commits: GitCommitNode[], commitHead: string | null, commitLookup: { [hash: string]: number }): void`
**Target path**: `web/graph.ts`

| Case ID | Input / Precondition                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                | Notes                       |
| ------- | ---------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------ | --------------------------- |
| TC-018  | A commit whose parent is in commitLookup       | Normal - standard                                                          | addParent + addChild as normal | -                           |
| TC-019  | A commit whose parent is not in commitLookup   | Normal - standard                                                          | addParent(nullVertex)          | Outside the displayed range |
| TC-020  | Two parents, only one of them in commitLookup  | Normal - standard                                                          | 1 normal parent + 1 nullVertex | Merge case                  |
| TC-021  | The parents of all commits are in commitLookup | Normal - standard                                                          | nullVertex is not used         | Normal case                 |
| TC-022  | Empty commit array                             | Boundary - empty                                                           | No vertices, no error          | -                           |

## S8: Graph.determinePath() nullVertex guard

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**Target path**: `web/graph.ts`

| Case ID | Input / Precondition                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                        | Notes |
| ------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----- |
| TC-023  | The parent of a merge Vertex is nullVertex (id === NULL_VERTEX_ID) | Normal - standard                                                          | The merge branch guard is skipped and it is handled as a normal branch | -     |
| TC-024  | parentVertex === null in the determinePath loop                    | Normal - standard                                                          | The loop ends normally with break                                      | -     |
| TC-025  | Handling a trailing nullVertex parent                              | Normal - standard                                                          | registerParentProcessed() is called                                    | -     |

## S9: Branch.addLine() numUncommitted condition fix

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**Signature**: `addLine(p1: Point, p2: Point, isCommitted: boolean, lockedFirst: boolean): void`
**Target path**: `web/graph.ts`

| Case ID | Input / Precondition                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                   | Notes                   |
| ------- | ------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------- | ----------------------- |
| TC-026  | p2.x=0, p2.y < numUncommitted, isCommitted=true  | Normal - standard                                                          | numUncommitted is updated to p2.y | The x=0 condition holds |
| TC-027  | p2.x=1, p2.y < numUncommitted, isCommitted=true  | Normal - standard                                                          | numUncommitted is not updated     | x≠0, condition not met  |
| TC-028  | p2.x=0, p2.y >= numUncommitted, isCommitted=true | Boundary - threshold                                                       | numUncommitted is not updated     | Boundary condition      |

## S10: Graph.getMutedCommits() muting merge commits

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**Signature**: `getMutedCommits(currentHash: string | null): boolean[]`
**Target path**: `web/graph.ts`

| Case ID | Input / Precondition                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result              | Notes            |
| ------- | ------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------- | ---------------- |
| TC-029  | mergeCommits=true, a merge and not a stash | Normal - standard                                                          | muted[i] === true            | -                |
| TC-030  | mergeCommits=true, a merge and a stash     | Normal - special                                                           | muted[i] === false           | Stash excluded   |
| TC-031  | mergeCommits=true, not a merge             | Normal - standard                                                          | muted[i] === false           | -                |
| TC-032  | mergeCommits=false                         | Normal - standard                                                          | No mute for the merge reason | Setting disabled |

## S11: Graph.getMutedCommits() muting commits that are not ancestors of HEAD

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**Target path**: `web/graph.ts`

| Case ID | Input / Precondition                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                      | Notes            |
| ------- | ------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------ | ---------------- |
| TC-033  | commitsNotAncestorsOfHead=true, reachable from HEAD     | Normal - standard                                                          | muted[i] === false                   | ancestor         |
| TC-034  | commitsNotAncestorsOfHead=true, not reachable from HEAD | Normal - standard                                                          | muted[i] === true                    | non-ancestor     |
| TC-035  | commitsNotAncestorsOfHead=false                         | Normal - standard                                                          | No mute for the ancestor reason      | Setting disabled |
| TC-036  | currentHash === null                                    | Boundary - null HEAD                                                       | All commits are treated as reachable | No mute          |
| TC-037  | currentHash is not in commitLookup                      | Boundary - unknown HEAD                                                    | All commits are treated as reachable | No mute          |

## S12: Graph.getMutedCommits() combined settings and the result array

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**Target path**: `web/graph.ts`

| Case ID | Input / Precondition                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                          | Notes                |
| ------- | ------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------- |
| TC-038  | Both settings true, a merge + non-ancestor commit | Normal - combined                                                          | muted[i] === true (muted for both reasons)               | -                    |
| TC-039  | Both settings true, a non-merge + ancestor commit | Normal - combined                                                          | muted[i] === false                                       | -                    |
| TC-040  | Length of the returned array                      | Normal - standard                                                          | Same as commits.length                                   | One entry per commit |
| TC-041  | nullVertex parents are not searched for ancestors | Normal - special                                                           | The search completes safely without following nullVertex | -                    |

## S13: Vertex.getChildren() read accessor for child vertices

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08
> Status: active
> Supersedes: -

**Signature**: `getChildren(): Vertex[]`
**Target path**: `web/graph.ts`

| Case ID | Input / Precondition                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                      | Notes                    |
| ------- | ----------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------ |
| TC-042  | Call getChildren() with no children added             | Boundary - empty                                                           | Returns an empty array                               | Default state            |
| TC-043  | getChildren after adding one child with addChild      | Normal - standard                                                          | An array with 1 element (containing the added child) | -                        |
| TC-044  | getChildren after adding three children with addChild | Normal - standard                                                          | An array of 3 elements in the order added            | addChild call order kept |

## S14: Graph.getFirstParentIndex() getting the index of the first parent

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08
> Status: active
> Supersedes: -

**Signature**: `getFirstParentIndex(i: number): number`
**Target path**: `web/graph.ts`

| Case ID | Input / Precondition                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                            | Notes                              |
| ------- | ---------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------- |
| TC-045  | A commit with one parent                             | Normal - standard                                                          | Returns the index of that parent           | -                                  |
| TC-046  | A merge commit with several parents                  | Normal - standard                                                          | The index of the first parent (parents[0]) | -                                  |
| TC-047  | A root commit with no parents                        | Boundary - no parents                                                      | Returns -1                                 | -                                  |
| TC-048  | The parent is outside commitLookup (only nullVertex) | Boundary - nullVertex                                                      | Returns -1                                 | Parent outside the displayed range |

## S15: Graph.getFirstChildIndex() getting the index of the first child

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08
> Status: active
> Supersedes: -

**Signature**: `getFirstChildIndex(i: number): number`
**Target path**: `web/graph.ts`

| Case ID | Input / Precondition                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                           | Notes                         |
| ------- | ----------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------- |
| TC-049  | A commit with one child                         | Normal - standard                                                          | Returns the index of that child           | -                             |
| TC-050  | Several children, one on the same branch        | Normal - standard                                                          | The index of the child on the same branch | isOnThisBranch takes priority |
| TC-051  | Several children, none on the same branch       | Normal - fallback                                                          | Returns the child with the largest index  | -                             |
| TC-052  | A commit with no children (the tip of a branch) | Boundary - no children                                                     | Returns -1                                | -                             |

## S16: Graph.getAlternativeParentIndex() getting the alternative parent index

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08
> Status: active
> Supersedes: -

**Signature**: `getAlternativeParentIndex(i: number): number`
**Target path**: `web/graph.ts`

| Case ID | Input / Precondition                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                        | Notes                |
| ------- | --------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------- | -------------------- |
| TC-053  | A merge commit with two or more parents | Normal - standard                                                          | Returns the index of the second parent | The merged-in branch |
| TC-054  | A normal commit with only one parent    | Normal - fallback                                                          | Falls back to the index of that parent | -                    |
| TC-055  | A root commit with no parents           | Boundary - no parents                                                      | Returns -1                             | -                    |

## S17: Graph.getAlternativeChildIndex() getting the alternative child index

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08
> Status: active
> Supersedes: -

**Signature**: `getAlternativeChildIndex(i: number): number`
**Target path**: `web/graph.ts`

| Case ID | Input / Precondition                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                          | Notes |
| ------- | ----------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----- |
| TC-056  | Several children, one on the same branch  | Normal - standard                                                          | Returns the child with the largest index after excluding the same branch | -     |
| TC-057  | Several children, none on the same branch | Normal - fallback                                                          | Returns the child with the second largest index                          | -     |
| TC-058  | Only one child                            | Normal - fallback                                                          | Falls back to that child                                                 | -     |
| TC-059  | A commit with no children                 | Boundary - no children                                                     | Returns -1                                                               | -     |

## S18: determinePath() keeps the off-screen nullVertex parent edge on early break

> Origin: フェーズ2 修正 M11 (graph-preserve-offscreen-parent-edge)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: the loop handling trailing nullVertex parents in `private determinePath(startAt: number): void`
> Target Path: `web/graph.ts:638-654`

A fix that adds a guard so that the `while` loop calling `registerParentProcessed()` for trailing nullVertex parents runs only when the outer loop has reached the end (`i === this.vertices.length`). When the inner parent search exits with an early `break` because of `parentVertexOnBranch` (`i < vertices.length`), the pending nullVertex parent (a parent edge going off-screen) is not registered as processed and is kept for the remaining children of the same vertex. Observed through the number of calls to `vertex.registerParentProcessed` and the remaining state of `getNextParent()`.

| Case ID | Input / Precondition                                                                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                          | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-060  | The outer loop reaches the end (`i === vertices.length`) and unprocessed nullVertex parents remain at the end                           | Normal - end reached registers trailing null parents                       | `registerParentProcessed()` is called once per remaining nullVertex parent, and `getNextParent()` finally becomes a non-nullVertex/null                  | Previous behavior (register only when the end is reached)                                                                                                                                                                                                                                                                                                                                                                                                                             |
| TC-061  | The inner search exits with an early `break` with `parentVertexOnBranch=true` (`i < vertices.length`), with a pending nullVertex parent | Boundary - early break preserves off-screen edge                           | The `i === vertices.length` guard keeps it out of the `while`, and `registerParentProcessed()` is not called for the pending nullVertex parent (0 times) | The core of the fix (do not drop the off-screen parent edge). `determinePath` is private and `findStart` reselects the same vertex so the pending null is handled in a later pass; so the early-break path is reproduced through the public API as `getNextParent()===null による break` (a break on getNextParent()===null), and the observation is replaced by "total `registerParentProcessed` calls over all passes = number of parents (once each, no excess) + render succeeds" |
| TC-062  | During trailing handling with `i === vertices.length`, the next parent is not a nullVertex                                              | Boundary - non-null parent breaks inner while                              | The `else` branch inside the `while` does `break`, and `registerParentProcessed()` is not called for the non-nullVertex parent                           | Prevents excess registration. The observation is replaced by the total `registerParentProcessed` calls over all determinePath passes (= number of parents, no excess registration) + render succeeds (determinePath is private, so per-iteration observation is not possible)                                                                                                                                                                                                         |
| TC-063  | After keeping the edge on an early break, the remaining children of the same vertex are processed                                       | Boundary - pending edge available to remaining children                    | The pending nullVertex parent edge stays unprocessed and can be used in the path calculation of the remaining children                                   | Availability of the kept edge                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| TC-064  | `i === vertices.length` and `getNextParent() === null` (no remaining parents)                                                           | Boundary - no remaining parents                                            | The `while` loop body does not run and `registerParentProcessed()` is not called (0 times)                                                               | No-remaining-parents boundary                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

## S19: Circle data-hash and the match / current / dim drawing state set by setFileHistoryHighlight()

> Origin: Feature 055-07 (light-spec-plan)
> Added: 2026-09-08
> Status: active
> Supersedes: -
> Signature: `Graph.setFileHistoryHighlight(highlight: GraphFileHistoryHighlight | null): void` / `Vertex.draw(svg: SVGElement, config: Config, expandOffset: boolean, hash: string, highlightClass: string | null): void`
> Target Path: `web/graph.ts` (`Graph.render()` and `Vertex.draw()`. Update to a line range after implementation)
> Test File: `tests/web/graph.test.ts`

Perspectives for the contract in which `Graph` holds the highlight and, on every `render()`, sets the svg `class` and the `data-hash` / highlight class of each circle (implementation plan §3.9 / §4 Task 6). Adding row classes belongs to `web/fileHistory-test.md` S4, and the CSS values to `media/main-test.md` S3; they are not in this table. The basic fixture is a mock DOM where 3 commits with hashes `h0` / `h1` / `h2` are loaded with `loadCommits`.

| Case ID | Input / Precondition                                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                       | Notes                                  |
| ------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| TC-065  | `render(null)` with the basic fixture                                                                 | Normal - data-hash attribute                                               | `getAttribute("data-hash")` of the 3 circles is `h0` / `h1` / `h2` respectively, none of their `class` contains `fileHistory`, and the svg `class` does not contain `fileHistoryMode` | Default without highlight              |
| TC-066  | `setFileHistoryHighlight({ matchHashes: new Set(["h0", "h2"]), currentHash: "h0" })` → `render(null)` | Normal - current circle                                                    | The `class` of the `h0` circle matches `"fileHistoryMatch fileHistoryCurrent"` with `toBe`                                                                                            | match and current together             |
| TC-067  | Same highlight                                                                                        | Normal - match circle                                                      | The `class` of the `h2` circle is `"fileHistoryMatch"`                                                                                                                                | -                                      |
| TC-068  | Same highlight                                                                                        | Normal - dim circle                                                        | The `class` of the `h1` circle is `"fileHistoryDim"`                                                                                                                                  | Not a match                            |
| TC-069  | Same highlight                                                                                        | Normal - mode class of the svg                                             | `getAttribute("class")` of the svg is `"fileHistoryMode"`                                                                                                                             | -                                      |
| TC-070  | `h0` is HEAD (existing class `current`) with the same highlight                                       | Normal - existing class kept first                                         | The `class` of the `h0` circle is `"current fileHistoryMatch fileHistoryCurrent"` (existing class first)                                                                              | Appended with spaces                   |
| TC-071  | A highlight that dims a fixture including a stash commit                                              | Normal - stash outer / inner                                               | The outer circle's `class` is `"stashOuter fileHistoryDim"`, the inner circle's is `"stashInner fileHistoryDim"`, and both have the stash hash as `data-hash`                         | Both circles have the attributes       |
| TC-072  | After TC-066, `setFileHistoryHighlight(null)` → `render(null)`                                        | Normal - cleared                                                           | `getAttribute("class")` of the svg is `""`, `fileHistory*` is gone from the `class` of every circle, and the HEAD circle stays `"current"`                                            | -                                      |
| TC-073  | `{ matchHashes: new Set(["h0", "h2"]), currentHash: null }`                                           | Boundary - currentHash null                                                | `h0` / `h2` are `"fileHistoryMatch"`, 0 circles have `fileHistoryCurrent`, and the svg has `fileHistoryMode`                                                                          | match display without current          |
| TC-074  | `{ matchHashes: new Set(), currentHash: null }`                                                       | Boundary - 0 matches                                                       | All 3 circles are `"fileHistoryDim"` and the svg has `fileHistoryMode`                                                                                                                | All dimmed                             |
| TC-075  | After TC-066, call `render(null)` once more                                                           | Normal - kept across re-render                                             | After the second render the classes are the same as TC-066 to TC-069 (`Graph` holds the highlight)                                                                                    | Survives regeneration of the SVG group |

### Failure-source inventory (include-or-justify) — added by Feature 055-07 (S19)

| Failure source                                                | Covering case or reason for exclusion                                                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing `data-hash` (normal / stash outer / inner)            | TC-065, TC-071                                                                                                                              |
| The 3 state classes mixed up, the current class overwritten   | TC-066 to TC-068, TC-070, TC-071                                                                                                            |
| The svg mode class not added or not removed                   | TC-069, TC-072, TC-074                                                                                                                      |
| Classes remain after clearing                                 | TC-072                                                                                                                                      |
| The highlight disappears on re-render                         | TC-075                                                                                                                                      |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL) | `null` highlight: TC-065, TC-072. `currentHash: null`: TC-073. Empty `Set`: TC-074. maximum / +/-1: excluded(there is no numeric threshold) |
| Input validation × violation patterns                         | excluded(`GraphFileHistoryHighlight` is fixed by its type, and `Graph` draws without validating the value)                                  |
| External dependencies × failure modes                         | excluded(SVG generation uses only DOM APIs, no external dependency)                                                                         |
| Exception and error paths                                     | excluded(no throw path is added to drawing)                                                                                                 |
| Invalid type or format                                        | excluded(covered by TypeScript type checking)                                                                                               |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(values are not validated, as in the table above)
- Exception: excluded(see the table above)
- External: excluded(see the table above)
- Boundary: TC-073, TC-074
- Type: excluded(see the table above)
- Normal: TC-065 to TC-072, TC-075

**Failure/normal ratio (smoke detector)**: 9 normal cases, 2 failure cases. Perspectives on drawing state are structured as checks that classes exist, which line up as normal cases, and the table above lists that the failure sources are limited to missing, overwritten, remaining and re-render. No cases are added or removed just to adjust the ratio.

## S20: determinePath() is guaranteed to stop for input where a parent comes before its child

> Origin: 不具合修正 (graph-terminate-on-preceding-parent)
> Added: 2026-09-12
> Status: active
> Supersedes: -
> Signature: `private determinePath(startAt: number): void`
> Target Path: `web/graph.ts` (the trailing while on the normal path)
> Test File: `tests/web/graph.test.ts`

`loadCommits()` follows vertices downward on the premise that "a parent always comes after its child". For input that breaks this premise, such as when the HEAD of a detached worktree is a child of an already loaded commit, the search ended without reaching the parent, `registerParentProcessed()` was not called, `findStart()` kept returning the same vertex, and the webview froze in "loading". The fix makes the trailing while on the normal path also advance parents whose id is smaller than its own to processed, the same as a nullVertex. The merge path registers the connection point with `registerUnavailablePoint()` in the first round and finds it in the second round, so it already ends on its own (no guard needed). Reordering on the data side belongs to `src/dataSource-test/02-branch-worktree-03.md` S47 (TC-364 to TC-366).

| Case ID | Input / Precondition                                                                                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                           | Notes                                                                                              |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| TC-076  | `[a(parent b), b, c(parent a)]`, the only parent `a` of `c` is the first row                                                              | Boundary - preceding parent on the normal path                             | `loadCommits()` ends, the total number of `registerParentProcessed()` calls is 2, and 3 circles are drawn | The trailing while consumes the parent with a smaller id                                           |
| TC-077  | `[a(parent b), b, d(parent c), c(parents a, b)]`, the trailing merge `c` is reached through `d`, and both parents of `c` are earlier rows | Boundary - preceding parents of a merge reached through its child          | `loadCommits()` ends, the total number of `registerParentProcessed()` calls is 4, and 4 circles are drawn | The trailing while of a vertex reached through its child consumes several earlier parents in a row |

### Failure-source inventory (include-or-justify) — added by graph-terminate-on-preceding-parent (S20)

| Failure source                                                                                       | Covering case or reason for exclusion                                                                                                          |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Infinite loop because an earlier parent is not consumed on the normal path                           | TC-076                                                                                                                                         |
| Infinite loop because several earlier parents of a vertex reached through its child are not consumed | TC-077                                                                                                                                         |
| Other parents registered in excess when consuming an earlier parent                                  | TC-076, TC-077 (total count = number of parent edges, no excess registration)                                                                  |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)                                        | No parents and nullVertex parents belong to S18 (TC-060, TC-064). An earlier parent differs by an id of 1 or more, with no additional boundary |
| Input validation × violation patterns                                                                | excluded(`Graph` draws without validating the order. Reordering belongs to S47)                                                                |
| External dependencies × failure modes                                                                | excluded(SVG generation uses only DOM APIs, no external dependency)                                                                            |
| Exception and error paths                                                                            | excluded(no throw path is added. Not hanging is observed through termination and call counts)                                                  |
| Invalid type or format                                                                               | excluded(covered by TypeScript type checking)                                                                                                  |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(see the table above)
- Exception: excluded(see the table above)
- External: excluded(see the table above)
- Boundary: TC-076, TC-077
- Type: excluded(see the table above)

**Failure/normal ratio (smoke detector)**: 0 normal cases, 2 failure cases. The stop-guarantee perspectives cover only broken input, so normal cases are left to the existing cases of S7 / S18.

## S21: Drawing the highlight, outer ring and boundary mark of logical connections with setPathHighlight()

> Origin: Feature 061-01 (light-spec-plan)
> Added: 2026-10-03
> Status: active
> Supersedes: -
> Signature: `Graph.setPathHighlight(highlight: PathHighlightResult | null): void` / `Graph.render(expandedCommit: ExpandedCommit | null): void` / `Branch.draw(svg: SVGElement, config: Config, expandAt: number)` / `readonly edgeKeys: ReadonlySet<string>` of `Line` and `PlacedLine`
> Target Path: `web/graph.ts:49-54` (`UnavailablePoint`), `web/graph.ts:66-93` (`Branch.addLine` / `Branch.shareEdgeKeys`), `web/graph.ts:97-248` (`Branch.draw` / `Branch.drawPath`), `web/graph.ts:298-300` (`Vertex.getNextParentIndex`), `web/graph.ts:341-355` (`Vertex.registerUnavailablePoint` / `Vertex.getLineIndexAfter`), `web/graph.ts:369-457` (`Vertex.draw` / `Vertex.drawPathHighlightMarks`), `web/graph.ts:556-631` (`Graph.setPathHighlight` / `Graph.drawPathHighlightMarks` / `Graph.render`), `web/graph.ts:782-909` (`Graph.getEdgeKeysToParent` / `Graph.shareEdgeKeysToParent` / `Graph.determinePath`), `web/global.d.ts:104-121` (`Line` / `PlacedLine`)
> Test File: `tests/web/graph.test.ts`

Perspectives for the drawing contract in §3.5 of the implementation plan. `Graph` holds a `PathHighlightResult` (`hashes` / `edgeKeys` / `boundaries`), and on every `render()` highlights only the line segments whose owning keys are in `edgeKeys`. Which vertices and connections to highlight (the search mode) is decided by `web/pathHighlight-test.md`; this table covers only drawing a given result. CSS values belong to `media/main-test.md` S8 and are not in this table. The expected `edgeKeys` are written as literal strings in the form `["子","親"]`, and `hashes` / `boundaries` are also decided independently of the fixture.

Common observations: the svg `class` has `pathHighlightMode`; highlighted lines and shadows have `pathHighlightSelected` in their `class` (the original `line` / `shaddow` are kept); the outer ring is `circle.pathHighlightRing` (`cx` / `cy` match the original circle with the same hash, `r` is `6`); the boundary mark is `rect.pathHighlightBoundary` (`width` / `height` are `12`, centered on `cx` / `cy` of the original circle). Line segments are matched by comparing the `d` of `path` with the `d` drawn for the same input with `setPathHighlight(null)`.

fixture:

- Straight fixture: `[a(parent b), b(parent c), c]` (all rows in lane 0)
- Merge-join fixture: display order `m, n, a, c, b, r`, `m→[a,b]`, `n→[c,b]`, `a→[]`, `c→[]`, `b→[r]`, `r→[]`. The connection from `n` to its second parent `b` joins, during layout, the connection point registered by the `m→b` line and shares the segment from the join point to `b` (the merge path of `determinePath()`. Confirm the use of `UnavailablePoint` during implementation and record the line range)
- Reverse fixture: `[a(parent b), b, c(parent a)]` from S20 TC-076

| Case ID | Input / Precondition                                                                                                                                                                                                                                                                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type)                         | Expected Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Notes                                                                                                                                                                                                                             |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-078  | `loadCommits` the straight fixture, `setPathHighlight({ targetFound: true, hashes: {b,c}, edgeKeys: {["b","c"]}, boundaries: [] })` → `render(null)`. Then `setPathHighlight(null)` → `render(null)`                                                                                                     | Normal - simplification and joining stop at highlight boundaries                                   | While highlighted: there are 2 `path.line`, and only the one with the `d` of the `b`→`c` segment has `pathHighlightSelected` in its `class`; the one for the `a`→`b` segment does not. There are also 2 `path.shaddow` whose `d` match the corresponding `path.line`, and the svg `class` contains `pathHighlightMode`. After clearing: back to 1 `path.line`, whose `d` equals the points of the 2 earlier paths joined, and there are 0 `pathHighlightSelected` / `pathHighlightMode` | Simplifying vertical lines and joining by color are allowed only when the highlight state is equal                                                                                                                                |
| TC-079  | Merge-join fixture with `edgeKeys: {["m","b"]}`, `hashes: {m,b}`                                                                                                                                                                                                                                         | Normal - new part of a merge                                                                       | Every `path` of the segments from `m` to `b` (the new part from the `m` row to the join point and the part from the join point to `b`) has `pathHighlightSelected`, and the `m`→`a` segment and the segments leaving `n` do not. The `d` of each `path` matches the `d` of the same segment drawn with `setPathHighlight(null)`                                                                                                                                                         | Shape is not changed                                                                                                                                                                                                              |
| TC-080  | Merge-join fixture with `edgeKeys: {["n","b"]}`, `hashes: {n,b}`                                                                                                                                                                                                                                         | Normal - highlighting the shared following part                                                    | Both the new segment from `n` to the join point and the shared segment from the join point to `b` have `pathHighlightSelected`. The segment from `m` to the join point (the part of `m→b` before the join) does not                                                                                                                                                                                                                                                                     | A shared segment owns several connection keys and is highlighted if any of them is in the result                                                                                                                                  |
| TC-081  | Merge-join fixture with `edgeKeys: {["n","b"]}`, `hashes: {n,b}` (same as TC-080)                                                                                                                                                                                                                        | Validation - does not highlight parts beyond the given parent or unrelated parts of the same color | The `b`→`r` segment (continuing beyond `b` in the same lane and color), and the `n`→`c` and `m`→`a` segments, do not have `pathHighlightSelected`                                                                                                                                                                                                                                                                                                                                       | The shared range stops at the end point of the known parent `b`                                                                                                                                                                   |
| TC-082  | Draw the merge-join fixture with `config.graphStyle = "angular"`, `edgeKeys: {["n","b"]}`                                                                                                                                                                                                                | Normal - angular polylines kept                                                                    | The points of the joined `d` of the highlighted `path` and the non-highlighted `path` match the points of the `d` from the angular drawing with `setPathHighlight(null)`, and the `d` of the highlighted `path` has no curve commands (`C` / `Q`)                                                                                                                                                                                                                                       | The split point is the join point                                                                                                                                                                                                 |
| TC-083  | Draw the merge-join fixture with `config.graphStyle = "rounded"`, `edgeKeys: {["m","b"]}`                                                                                                                                                                                                                | Normal - rounded curves kept                                                                       | The `d` of the highlighted `path` leaving `m` matches the `d` of the same segment from the rounded drawing with `setPathHighlight(null)`, and contains curve commands                                                                                                                                                                                                                                                                                                                   | The curve shape is not changed                                                                                                                                                                                                    |
| TC-084  | Expand `m` (row 0) of the merge-join fixture (`render({ id: 0, ... })`) with `edgeKeys: {["m","b"]}`. The first segment from `m` toward the right lane has `lockedFirst === true` and spans the expanded row                                                                                             | Normal - ownership carried over when expanding details with lockedFirst                            | The `path`s for both `PlacedLine`s split by the expansion (the normal transition and the extension by `expandY`) have `pathHighlightSelected`, and `d` matches the result of the same expansion with `setPathHighlight(null)`                                                                                                                                                                                                                                                           | The `lockedFirst` branch of `Branch.draw()`                                                                                                                                                                                       |
| TC-085  | Expand `a` (row 2) of the merge-join fixture with `edgeKeys: {["m","b"]}`, `hashes: {m,b}`. The `(1,2)→(0,3)` segment of `m→b` has `lockedFirst === false` and spans the expanded row (`b` and `r` are both in lane 0 and `b→r` is a vertical line, so the non-lockedFirst branch is checked with `m→b`) | Normal - ownership carried over when expanding details without lockedFirst                         | The `path`s for both `PlacedLine`s split by the expansion (the extension and the shifted transition) have `pathHighlightSelected`, the join line of `n`→`b` and the `b`→`r` segment after expansion do not, and `d` matches the result with `setPathHighlight(null)`                                                                                                                                                                                                                    | The non-`lockedFirst` branch of `Branch.draw()`. Transcription fix during implementation: in the fixture layout, `b→r` is a vertical line and does not go through the branch, so the input was changed to expanding `a` and `m→b` |
| TC-086  | `loadCommits` the merge-join fixture with `m` as HEAD (`commitHead = "m"`), `hashes: {m,b}`, `edgeKeys: {["m","b"]}` → `render(null)`. Then `setPathHighlight(null)` → `render(null)`                                                                                                                    | Normal - HEAD circle kept and outer rings                                                          | While highlighted: 2 `circle.pathHighlightRing`, whose `cx` / `cy` match the original circles of `m` / `b` and `r` is `6`. The original circle of `m` has `current` in its `class` and the same `fill` attribute as before highlighting, and the number of circles with `data-hash` is the same as before highlighting (no fake vertices). After clearing: 0 `pathHighlightRing`, the `m` circle stays `current`, and `pathHighlightMode` is gone from the svg `class`                  | The outer ring is a separate element from the original circle                                                                                                                                                                     |
| TC-087  | Fixture `[c1(parents g2, g1), x]` (`g1` / `g2` not loaded) with `hashes: {c1}`, `edgeKeys: {}`, `boundaries: [{c1,g2},{c1,g1}]`                                                                                                                                                                          | Boundary - one rect for several boundaries on the same child                                       | 1 `rect.pathHighlightBoundary`, centered on `cx` / `cy` of the `c1` circle, with `width` / `height` of `12`. There are no circles or `pathHighlightRing` for `g1` / `g2`, and the total number of circles is the same as before highlighting                                                                                                                                                                                                                                            | Unloaded parents are distinguished in the bar details, and rects are not stacked                                                                                                                                                  |
| TC-088  | Fixture `[t(parent gap), r]` (`gap` not loaded) with `hashes: {t}`, `edgeKeys: {}`, `boundaries: [{t,gap}]`                                                                                                                                                                                              | Validation - the continuation line to an unloaded parent is not highlighted                        | The `path` of the continuation line going down from `t` (toward the null vertex) has no `pathHighlightSelected`, and 0 `path`s have `pathHighlightSelected`. `t` has 1 `pathHighlightRing` and 1 `pathHighlightBoundary`, and no `t`→`r` line is drawn                                                                                                                                                                                                                                  | No owning key is put on continuation lines from layout                                                                                                                                                                            |
| TC-089  | Reverse fixture with `hashes: {c,a}`, `edgeKeys: {["c","a"]}`, `boundaries: []`                                                                                                                                                                                                                          | Validation - with reverse-order input, stops without highlighting a wrong continuation line        | `loadCommits()` ends (the total of `registerParentProcessed()` is 2, as in S20 TC-076), 0 `path`s have `pathHighlightSelected` (no line from `c` to the earlier `a` exists in the existing layout, so none is created), and there are 2 `pathHighlightRing`, for `c` and `a`                                                                                                                                                                                                            | Even when the search set is correct, lines that do not exist are not created. Keys are fixed only after confirming reachability                                                                                                   |

### Failure-source inventory (include-or-justify) — added by Feature 061-01 (S21)

| Failure source                                                                                | Covering case or reason for exclusion                                                                                                              |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Highlight boundaries lost through simplification or joining                                   | TC-078, TC-082                                                                                                                                     |
| No owning key on the new part or the shared following part of a merge                         | TC-079, TC-080                                                                                                                                     |
| Wrongly highlighting parts beyond the given parent or unrelated parts of the same color       | TC-081                                                                                                                                             |
| Change in the shape of curves or polylines                                                    | TC-082, TC-083                                                                                                                                     |
| Owning keys lost when details expansion splits lines                                          | TC-084, TC-085                                                                                                                                     |
| Changes to HEAD or the original circle, fake vertices                                         | TC-086, TC-087                                                                                                                                     |
| Continuation lines to unloaded parents or in reverse order highlighted as logical connections | TC-088, TC-089                                                                                                                                     |
| Marks or classes remain after clearing                                                        | TC-078, TC-086                                                                                                                                     |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)                                 | `null` clear: TC-078, TC-086. 0 connections: TC-087 to TC-089. Several boundaries: TC-087. maximum / +/-1: excluded(there is no numeric threshold) |
| Input validation × violation patterns                                                         | excluded(`Graph` draws the result without validating it. Deciding pseudo rows and absence belongs to the calculation side)                         |
| External dependencies × failure modes                                                         | excluded(SVG generation uses only DOM APIs, no external dependency)                                                                                |
| Exception and error paths                                                                     | excluded(no throw path is added. Stopping is observed through termination and call counts)                                                         |
| Invalid type or format                                                                        | excluded(the type of `edgeKeys` is covered by TypeScript type checking and typecheck)                                                              |

**Failure-category coverage (diversity floor)**:

- Validation: TC-081, TC-088, TC-089
- Exception: excluded(see the table above)
- External: excluded(see the table above)
- Boundary: TC-087
- Type: excluded(see the table above)
- Normal: TC-078 to TC-080, TC-082 to TC-086
