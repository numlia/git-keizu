# Test Perspectives: src/types.ts

> Source: `src/types.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: UNCOMMITTED_CHANGES_HASH / VALID_UNCOMMITTED_RESET_MODES constant checks

> Origin: Feature 001 (menu-bar-enhancement) Task 1.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `src/types.ts`

| Case ID | Input / Precondition                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result        | Notes                                                       |
| ------- | ----------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------- |
| TC-001  | Read the UNCOMMITTED_CHANGES_HASH constant            | Normal - standard                                                          | The value equals `"*"` | Guarantees compatibility with the existing hard-coded value |
| TC-002  | Read VALID_UNCOMMITTED_RESET_MODES                    | Normal - standard                                                          | Contains `"mixed"`     | -                                                           |
| TC-003  | Read VALID_UNCOMMITTED_RESET_MODES                    | Normal - standard                                                          | Contains `"hard"`      | -                                                           |
| TC-004  | Size of VALID_UNCOMMITTED_RESET_MODES                 | Boundary - exact count                                                     | The Set size is 2      | Indirectly checks that "soft" is not included               |
| TC-005  | has() on VALID_UNCOMMITTED_RESET_MODES with `"soft"`  | Normal - invalid                                                           | Returns `false`        | soft has no meaning for an Uncommitted reset                |
| TC-006  | has() on VALID_UNCOMMITTED_RESET_MODES with `""`      | Boundary - empty                                                           | Returns `false`        | -                                                           |
| TC-007  | has() on VALID_UNCOMMITTED_RESET_MODES with `"MIXED"` | Boundary - case sensitivity                                                | Returns `false`        | Uppercase is not accepted                                   |

## S2: Making status required in worktree Open/Reveal responses

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: `ResponseOpenWorktreeInNewWindow` / `ResponseRevealWorktreeInOS` (making `status: GitCommandStatus` required)
> Target Path: `src/types.ts:586-604`

A fix that changes `status?` (optional) in the worktree Open/Reveal response types to the required `status: GitCommandStatus` (`string | null`). If it stayed optional, the `undefined` of a success response would be treated as an error by the webview's `status !== null` check, so the type forces it to always be sent (the type contract of [2]). The runtime branches on the host and web sides belong to their owners (`src/gitGraphView-test/` / `web/messageHandler-test.md`).

| Case ID | Input / Precondition                                                                                                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                 | Notes                        |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| TC-008  | Type-check `{ command: "openWorktreeInNewWindow" }` (status missing) / `{ command: "openWorktreeInNewWindow", status: null }` / `status: "msg"` | Type - status required (open)                                              | The object literal missing status is a type error (`@ts-expect-error` takes effect), and `status: null` and `status: "msg"` are assignable to `ResponseOpenWorktreeInNewWindow` | typecheck / type-level check |
| TC-009  | Type-check `{ command: "revealWorktreeInOS" }` (status missing) / `status: null` / `status: "msg"`                                              | Type - status required (reveal)                                            | The object literal missing status is a type error, and `status: null` and `status: "msg"` are assignable to `ResponseRevealWorktreeInOS`                                        | typecheck / type-level check |

### Failure-source inventory (include-or-justify) — added for Feature 045 (S2)

| Failure source                                                                      | Covering case or reason for exclusion                                                                     |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| A success response `undefined` with status still optional (wrongly judged an error) | TC-008, TC-009 (the type check of the required field catches a missing send at compile time)              |
| Making it required for only one command type                                        | TC-008 (open) and TC-009 (reveal) are checked separately                                                  |
| Sending the wrong status value at runtime                                           | excluded(the values the host sends are covered by TC-100 to TC-105 of the `src/gitGraphView-test/` owner) |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(only type alias definitions, with no runtime validation branch)
- Exception: excluded(same as above; no throw path)
- External: excluded(no external dependencies)
- Boundary: excluded(the type definitions have no numeric or empty-value boundaries. Whether `null` is assignable is checked as part of TC-008/TC-009)
- Type: TC-008, TC-009

**Failure/normal ratio (smoke detector)**: 0 normal cases, 2 failure cases (TC-008, TC-009). This section only targets type contracts and has no normal runtime path, so confirmed that 0 normal cases is not a gap in the inventory.

## S3: Type contracts for checkout results and the two-step Push

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-03
> Status: superseded
> Supersedes: -
> Superseded By: S4
> Signature: `CheckoutBranchResult` / `ResponseCheckoutBranch` / `PushTarget` / `PushPreparation` / `RequestPush` / `ResponsePush`
> Target Path: `src/types.ts` (the checkout result union and the Push protocol; to be updated to a line range after implementation)
> Test File: `tests/src/types.test.ts`

Covers the type contract that fixes the checkout result as a discriminated union narrowable by `kind`, and the Push response as one narrowable by `phase`. `RequestPush` requires `operationId` and `selectedRemote`, and all 3 variants of `ResponsePush` require `operationId`. The runtime branches belong to their owners (`src/dataSource-test/02-branch-worktree-02.md` / `src/gitGraphView-test/01-message-routing-03.md` / `web/messageHandler-test.md`); this section only checks `@ts-expect-error` and assignability.

| Case ID | Input / Precondition                                                                                                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                    | Notes                                 |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| TC-010  | Assign `{ kind: "branchExists" }` to `CheckoutBranchResult`                                                                              | Type - branchExists variant                                                | The assignment compiles, and accessing `status` in the branch narrowed by `kind` is a type error (`@ts-expect-error` takes effect) | Variant without status                |
| TC-011  | Assign `{ kind: "invalidRef" }` to `CheckoutBranchResult`                                                                                | Type - invalidRef variant                                                  | The assignment compiles                                                                                                            | -                                     |
| TC-012  | Assign `{ kind: "completed", status: null }` to `CheckoutBranchResult`                                                                   | Type - completed variant                                                   | The assignment compiles, and `status` is accessible in the branch narrowed by `kind === "completed"`                               | `GitCommandStatus`                    |
| TC-013  | Assign `{ kind: "completed" }` (`status` missing)                                                                                        | Type - required field of completed                                         | `@ts-expect-error` takes effect (type error)                                                                                       | Only completed requires status        |
| TC-014  | Assign `{ kind: "unknown" }`                                                                                                             | Type - unknown kind                                                        | `@ts-expect-error` takes effect (type error)                                                                                       | A value outside the union             |
| TC-015  | Assign `{ command: "push", repo: "/r", operationId: "op-1", selectedRemote: null }` to `RequestPush`                                     | Type - first Request                                                       | The assignment compiles                                                                                                            | Request before selection              |
| TC-016  | Assign `{ command: "push", repo: "/r", operationId: "op-1", selectedRemote: "origin" }` to `RequestPush`                                 | Type - Request after selection                                             | The assignment compiles                                                                                                            | The second Request                    |
| TC-017  | An object literal of `RequestPush` missing `operationId`                                                                                 | Type - operationId required (Request)                                      | `@ts-expect-error` takes effect (type error)                                                                                       | Prevents a missing correlation ID     |
| TC-018  | An object literal of `RequestPush` missing `selectedRemote`                                                                              | Type - selectedRemote required                                             | `@ts-expect-error` takes effect (type error)                                                                                       | Not made optional                     |
| TC-019  | Assign `{ command: "push", operationId: "op-1", phase: "selectRemote", remotes: ["origin"], defaultRemote: "origin" }` to `ResponsePush` | Type - selectRemote variant                                                | The assignment compiles, and `remotes` and `defaultRemote` are accessible in the branch narrowed by `phase`                        | -                                     |
| TC-020  | Assign `{ command: "push", operationId: "op-1", phase: "noRemotes" }` to `ResponsePush`                                                  | Type - noRemotes variant                                                   | The assignment compiles, and accessing `remotes` after narrowing is a type error (`@ts-expect-error` takes effect)                 | Separates phase-specific fields       |
| TC-021  | Assign `{ command: "push", operationId: "op-1", phase: "completed", status: null }` to `ResponsePush`                                    | Type - completed variant                                                   | The assignment compiles, and `status` is accessible after narrowing                                                                | -                                     |
| TC-022  | An object literal of the completed variant missing `status`                                                                              | Type - required field of completed                                         | `@ts-expect-error` takes effect (type error)                                                                                       | -                                     |
| TC-023  | An object literal of the selectRemote variant missing `defaultRemote`                                                                    | Type - required field of selectRemote                                      | `@ts-expect-error` takes effect (type error)                                                                                       | -                                     |
| TC-024  | Object literals of each of the 3 variants missing `operationId`                                                                          | Type - operationId required (all Response variants)                        | `@ts-expect-error` takes effect for all 3 (type error)                                                                             | Required field common to all variants |
| TC-025  | `switch (response.phase)` covers the 3 cases `selectRemote` / `noRemotes` / `completed`                                                  | Type - exhaustive narrowing                                                | Assigning the remaining value to a variable of type `never` in the `default` clause compiles (nothing is missed)                   | Exhaustiveness by phase               |

### Failure-source inventory (include-or-justify) — added for Feature 047 (S3)

| Failure source                                                 | Covering case or reason for exclusion                                                                                                                                                              |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing required field (`operationId`)                         | TC-017, TC-024                                                                                                                                                                                     |
| Missing required field (phase / kind-specific fields)          | TC-013, TC-022, TC-023                                                                                                                                                                             |
| Room for guessing the phase because a field is optional        | TC-018, TC-020                                                                                                                                                                                     |
| Accepting a value outside the union                            | TC-014                                                                                                                                                                                             |
| Mixing up variants (a type design that cannot be narrowed)     | TC-010, TC-012, TC-019, TC-020, TC-021, TC-025                                                                                                                                                     |
| The negative side of each branch (a valid literal is rejected) | TC-011, TC-015, TC-016                                                                                                                                                                             |
| Wrong values sent or wrong branches at runtime                 | excluded(runtime behavior belongs to `src/dataSource-test/02-branch-worktree-02.md` S41 to S43, `src/gitGraphView-test/01-message-routing-03.md` S28 to S29, and `web/messageHandler-test.md` S12) |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)  | excluded(only type alias definitions, with no numeric boundaries. Whether `selectedRemote: null` and `status: null` are assignable is checked as part of TC-015 / TC-021)                          |
| External dependency failure                                    | excluded(no external dependencies)                                                                                                                                                                 |
| Thrown exception                                               | excluded(only type definitions, with no throw path)                                                                                                                                                |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(only type alias definitions, with no runtime validation branch)
- Exception: excluded(same as above; no throw path)
- External: excluded(no external dependencies)
- Boundary: excluded(the type definitions have no numeric or empty-value boundaries. Whether `null` is assignable is checked as part of TC-015 / TC-021)
- Type: TC-010 to TC-025

**Failure/normal ratio (smoke detector)**: 0 normal cases, 16 failure cases (TC-010 to TC-025). As with S2, this section only targets type contracts and has no normal runtime path, so confirmed that 0 normal cases is not a gap in the inventory.

## S4: Type contracts for checkout results and the two-step Push (making repo required in Responses)

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-04
> Status: superseded
> Supersedes: S3
> Superseded By: S6
> Signature: `CheckoutBranchResult` / `ResponseCheckoutBranch` / `RequestPush` / `ResponsePush`
> Target Path: `src/types.ts` (the checkout result union and the Push protocol)
> Test File: `tests/src/types.test.ts`

A change that adds a required `repo: string` to all 3 variants of `ResponsePush`, so that the type makes it unnecessary for the webview to carry the repository around in module state (`pendingPushRepo`). S3 expected that a Response literal without `repo` could be assigned, so it is superseded. The contracts for the checkout result and `RequestPush` are unchanged from S3, but following the rule that a section is the unit of lifecycle, they are carried over into this section so that the current contract is expressed in one section. The runtime branches belong to their owners (`src/gitGraphView-test/01-message-routing-03.md` S31, `web/messageHandler-test.md` S14, `web/refMenu-test/01-branch-actions-01.md` S17 / S19); this section only checks `@ts-expect-error` and assignability.

| Case ID | Input / Precondition                                                                                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                    | Notes                                              |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| TC-026  | Assign `{ kind: "branchExists" }` to `CheckoutBranchResult`                                                                                          | Type - branchExists variant                                                | The assignment compiles, and accessing `status` in the branch narrowed by `kind` is a type error (`@ts-expect-error` takes effect) | Carried over from S3/TC-010 (contract unchanged)   |
| TC-027  | Assign `{ kind: "invalidRef" }` to `CheckoutBranchResult`                                                                                            | Type - invalidRef variant                                                  | The assignment compiles                                                                                                            | Carried over from S3/TC-011                        |
| TC-028  | Assign `{ kind: "completed", status: null }` to `CheckoutBranchResult`                                                                               | Type - completed variant                                                   | The assignment compiles, and `status` is accessible in the branch narrowed by `kind === "completed"`                               | Carried over from S3/TC-012                        |
| TC-029  | Assign `{ kind: "completed" }` (`status` missing)                                                                                                    | Type - required field of completed                                         | `@ts-expect-error` takes effect (type error)                                                                                       | Carried over from S3/TC-013                        |
| TC-030  | Assign `{ kind: "unknown" }`                                                                                                                         | Type - unknown kind                                                        | `@ts-expect-error` takes effect (type error)                                                                                       | Carried over from S3/TC-014                        |
| TC-031  | Assign `{ command: "push", repo: "/r", operationId: "op-1", selectedRemote: null }` to `RequestPush`                                                 | Type - first Request                                                       | The assignment compiles                                                                                                            | Carried over from S3/TC-015                        |
| TC-032  | Assign `{ command: "push", repo: "/r", operationId: "op-1", selectedRemote: "origin" }` to `RequestPush`                                             | Type - Request after selection                                             | The assignment compiles                                                                                                            | Carried over from S3/TC-016                        |
| TC-033  | An object literal of `RequestPush` missing `operationId`                                                                                             | Type - operationId required (Request)                                      | `@ts-expect-error` takes effect (type error)                                                                                       | Carried over from S3/TC-017                        |
| TC-034  | An object literal of `RequestPush` missing `selectedRemote`                                                                                          | Type - selectedRemote required                                             | `@ts-expect-error` takes effect (type error)                                                                                       | Carried over from S3/TC-018                        |
| TC-035  | Assign `{ command: "push", repo: "/r", operationId: "op-1", phase: "selectRemote", remotes: ["origin"], defaultRemote: "origin" }` to `ResponsePush` | Type - selectRemote variant                                                | The assignment compiles, and `repo` / `remotes` / `defaultRemote` are accessible in the branch narrowed by `phase`                 | Valid assignment after adding repo                 |
| TC-036  | Assign `{ command: "push", repo: "/r", operationId: "op-1", phase: "noRemotes" }` to `ResponsePush`                                                  | Type - noRemotes variant                                                   | The assignment compiles, and accessing `remotes` after narrowing is a type error (`@ts-expect-error` takes effect)                 | Separates phase-specific fields                    |
| TC-037  | Assign `{ command: "push", repo: "/r", operationId: "op-1", phase: "completed", status: null }` to `ResponsePush`                                    | Type - completed variant                                                   | The assignment compiles, and `status` is accessible after narrowing                                                                | -                                                  |
| TC-038  | An object literal of the completed variant missing `status`                                                                                          | Type - required field of completed                                         | `@ts-expect-error` takes effect (type error)                                                                                       | -                                                  |
| TC-039  | An object literal of the selectRemote variant missing `defaultRemote`                                                                                | Type - required field of selectRemote                                      | `@ts-expect-error` takes effect (type error)                                                                                       | -                                                  |
| TC-040  | Object literals of each of the 3 variants missing `operationId`                                                                                      | Type - operationId required (all Response variants)                        | `@ts-expect-error` takes effect for all 3 (type error)                                                                             | Required field common to all variants              |
| TC-041  | Object literals of each of the 3 variants missing `repo`                                                                                             | Type - repo required (all Response variants)                               | `@ts-expect-error` takes effect for all 3 (type error)                                                                             | Type-level guarantee for dropping the module state |
| TC-042  | `switch (response.phase)` covers the 3 cases `selectRemote` / `noRemotes` / `completed`                                                              | Type - exhaustive narrowing                                                | Assigning the remaining value to a variable of type `never` in the `default` clause compiles (nothing is missed)                   | Carried over from S3/TC-025                        |

### Failure-source inventory (include-or-justify) — Feature 047 P3 fix (S4)

| Failure source                                                     | Covering case or reason for exclusion                                                                                                                                                                                                      |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Missing required field (`repo`)                                    | TC-041                                                                                                                                                                                                                                     |
| Missing required field (`operationId`)                             | TC-033, TC-040                                                                                                                                                                                                                             |
| Missing required field (phase / kind-specific fields)              | TC-029, TC-038, TC-039                                                                                                                                                                                                                     |
| Room for guessing the phase because a field is optional            | TC-034, TC-036                                                                                                                                                                                                                             |
| Accepting a value outside the union                                | TC-030                                                                                                                                                                                                                                     |
| Mixing up variants (a type design that cannot be narrowed)         | TC-026, TC-028, TC-035, TC-036, TC-037, TC-042                                                                                                                                                                                             |
| The negative side of each branch (a valid literal is rejected)     | TC-027, TC-031, TC-032, TC-035                                                                                                                                                                                                             |
| Going back to a design that carries the repository in module state | TC-041 (because the type enforces `repo`, the Response receiver no longer needs to get the repository by another route. The runtime wiring belongs to `web/messageHandler-test.md` S14 and `web/refMenu-test/01-branch-actions-01.md` S19) |
| Wrong values sent or wrong branches at runtime                     | excluded(runtime behavior belongs to `src/gitGraphView-test/01-message-routing-03.md` S31 and `web/messageHandler-test.md` S14)                                                                                                            |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)      | excluded(only type alias definitions, with no numeric boundaries. Whether `selectedRemote: null` and `status: null` are assignable is checked as part of TC-031 / TC-037)                                                                  |
| External dependency failure                                        | excluded(no external dependencies)                                                                                                                                                                                                         |
| Thrown exception                                                   | excluded(only type definitions, with no throw path)                                                                                                                                                                                        |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(only type alias definitions, with no runtime validation branch)
- Exception: excluded(same as above; no throw path)
- External: excluded(no external dependencies)
- Boundary: excluded(the type definitions have no numeric or empty-value boundaries. Whether `null` is assignable is checked as part of TC-031 / TC-037)
- Type: TC-026 to TC-042

**Failure/normal ratio (smoke detector)**: 0 normal cases, 17 failure cases (TC-026 to TC-042). As with S2 and S3, this section only targets type contracts and has no normal runtime path, so confirmed that 0 normal cases is not a gap in the inventory.

## S5: Separating the local and upstream branch in PushTarget

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-04
> Status: active
> Supersedes: -
> Signature: `PushTarget`
> Target Path: `src/types.ts` (`PushTarget`)
> Test File: `tests/src/types.test.ts`

For a Push with an upstream set where the current local branch and the upstream branch have different names, fixes the type contract that `PushTarget` holds `localBranchName` and `upstreamBranchName` as separate required fields. The runtime refspec and Git state belong to `src/dataSource-test/02-branch-worktree-02.md` S42 / S43, and the hand-off on the host to `src/gitGraphView-test/01-message-routing-03.md` S31.

| Case ID | Input / Precondition                                                                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                           | Notes                                              |
| ------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| TC-043  | A `PushTarget` with local `feature/local` / upstream `main`, and object literals each missing one branch field | Type - required fields for the Push source and destination                 | A target with different names is assignable, and missing either `localBranchName` or `upstreamBranchName` is a type error | Type-level guarantee for both sides of the refspec |

### Failure-source inventory (include-or-justify) — Feature 047 fix for differently named upstreams (S5)

| Failure source                                                       | Covering case or reason for exclusion                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Collapsing the Push source and destination into a single branch name | TC-043                                                                                            |
| Missing required field                                               | TC-043                                                                                            |
| Building the refspec and running Git at runtime                      | excluded(belongs to `src/dataSource-test/02-branch-worktree-02.md` S43 TC-254 / TC-261)           |
| External dependency failure                                          | excluded(only type definitions, with no external dependencies)                                    |
| Boundary values (empty / invalid ref)                                | excluded(runtime validation belongs to `src/dataSource-test/02-branch-worktree-02.md` S43 TC-259) |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(only type definitions, with no runtime validation branch)
- Exception: excluded(only type definitions, with no throw path)
- External: excluded(no external dependencies)
- Boundary: excluded(invalid refs belong to the runtime owner)
- Type: TC-043

**Failure/normal ratio (smoke detector)**: 0 normal cases, 1 failure case (TC-043). This section only targets the type contract of required fields, so 0 normal cases is not a gap in the inventory.

## S6: Type contracts for the remote checkout target and result, and the two-step Push

> Origin: Feature 051 (remote-checkout-pull) (light-spec-plan)
> Added: 2026-08-06
> Status: active
> Supersedes: S4
> Signature: `RemoteBranchTarget` / `RequestCheckoutBranch` / `CheckoutBranchResult` / `ResponseCheckoutBranch` / `RequestPush` / `ResponsePush`
> Target Path: `src/types.ts` (the checkout target, result / response union and the Push protocol)
> Test File: `tests/src/types.test.ts`

Makes the remote value of the checkout request an object with a field for each role, and distinguishes a pull failure after checkout and a missing remote from the other results by type. The two-step Push and the required `repo` in Responses held by S4 are unchanged and carried over under new Case IDs. The `PushTarget` contract belongs to S5 and is unchanged.

| Case ID | Input / Precondition                                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                               | Notes                          |
| ------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------ |
| TC-044  | Assign `{ remoteName: "origin", branchName: "main" }` to `RemoteBranchTarget`                        | Type - remote target                                                       | The assignment compiles, and `remoteName` and `branchName` can each be read as `string`       | Separates the roles            |
| TC-045  | `RemoteBranchTarget` missing `remoteName`                                                            | Type - remoteName required                                                 | `@ts-expect-error` takes effect (type error)                                                  | Missing payload                |
| TC-046  | `RemoteBranchTarget` missing `branchName`                                                            | Type - branchName required                                                 | `@ts-expect-error` takes effect (type error)                                                  | Missing payload                |
| TC-047  | Assign an object literal with `remoteBranch: null` to `RequestCheckoutBranch`                        | Type - local checkout request                                              | The assignment compiles, and it can be narrowed by `remoteBranch === null`                    | Local path                     |
| TC-048  | Assign an object literal with `remoteBranch: { remoteName: "origin", branchName: "main" }`           | Type - remote checkout request                                             | The assignment compiles, and both fields can be read in the non-null branch                   | Structured target              |
| TC-049  | `RequestCheckoutBranch` missing `remoteBranch`                                                       | Type - remoteBranch required                                               | `@ts-expect-error` takes effect (type error)                                                  | Prevents making it optional    |
| TC-050  | Assign `{ kind: "branchExists" }` to `CheckoutBranchResult`                                          | Type - branchExists result                                                 | The assignment compiles, and accessing `status` after narrowing is a type error               | Carried over from S4/TC-026    |
| TC-051  | Assign `{ kind: "invalidRef" }` to `CheckoutBranchResult`                                            | Type - invalidRef result                                                   | The assignment compiles                                                                       | Carried over from S4/TC-027    |
| TC-052  | Assign `{ kind: "remoteNotFound" }` to `CheckoutBranchResult`                                        | Type - remoteNotFound result                                               | The assignment compiles, and accessing `status` after narrowing is a type error               | New variant                    |
| TC-053  | Assign `{ kind: "pullFailed", status: "CONFLICT" }` to `CheckoutBranchResult`                        | Type - pullFailed result                                                   | The assignment compiles, and `status` after narrowing is `string`                             | Partial success                |
| TC-054  | Assign `{ kind: "pullFailed" }` to `CheckoutBranchResult`                                            | Type - pullFailed status required                                          | `@ts-expect-error` takes effect (type error)                                                  | Missing field                  |
| TC-055  | Assign `{ kind: "pullFailed", status: null }`                                                        | Type - pullFailed status non-null                                          | `@ts-expect-error` takes effect (`null` is not allowed)                                       | Distinguished from completed   |
| TC-056  | Assign `{ kind: "completed", status: null }` to `CheckoutBranchResult`                               | Type - completed result                                                    | The assignment compiles, and `status` after narrowing is `GitCommandStatus`                   | Carried over from S4/TC-028    |
| TC-057  | Assign `{ kind: "completed" }`                                                                       | Type - completed status required                                           | `@ts-expect-error` takes effect (type error)                                                  | Carried over from S4/TC-029    |
| TC-058  | Assign `{ kind: "unknown" }`                                                                         | Type - unknown result kind                                                 | `@ts-expect-error` takes effect (type error)                                                  | Carried over from S4/TC-030    |
| TC-059  | `switch (result.kind)` lists the 5 kinds                                                             | Type - result exhaustive narrowing                                         | Assigning the remaining value in the `default` clause to `never` compiles                     | Detects a missed kind          |
| TC-060  | Assign `{ command: "checkoutBranch", kind: "branchExists" }` to `ResponseCheckoutBranch`             | Type - branchExists response                                               | The assignment compiles                                                                       | Response union                 |
| TC-061  | Assign `{ command: "checkoutBranch", kind: "invalidRef" }`                                           | Type - invalidRef response                                                 | The assignment compiles                                                                       | Response union                 |
| TC-062  | Assign `{ command: "checkoutBranch", kind: "remoteNotFound" }`                                       | Type - remoteNotFound response                                             | The assignment compiles                                                                       | Response union                 |
| TC-063  | Assign `{ command: "checkoutBranch", kind: "pullFailed", status: "CONFLICT" }`                       | Type - pullFailed response                                                 | The assignment compiles, and `status` after narrowing is `string`                             | Response union                 |
| TC-064  | Assign `{ command: "checkoutBranch", kind: "completed", status: null }`                              | Type - completed response                                                  | The assignment compiles                                                                       | Response union                 |
| TC-065  | pullFailed / completed responses missing `status`                                                    | Type - response status required                                            | `@ts-expect-error` takes effect for both (type error)                                         | Variant-specific field         |
| TC-066  | `switch (response.kind)` lists the 5 kinds                                                           | Type - response exhaustive narrowing                                       | Assigning the remaining value in the `default` clause to `never` compiles                     | Detects a missed response kind |
| TC-067  | Assign `{ command: "push", repo: "/r", operationId: "op-1", selectedRemote: null }` to `RequestPush` | Type - first Push Request                                                  | The assignment compiles                                                                       | Carried over from S4/TC-031    |
| TC-068  | Assign `{ command: "push", repo: "/r", operationId: "op-1", selectedRemote: "origin" }`              | Type - Push Request after selection                                        | The assignment compiles                                                                       | Carried over from S4/TC-032    |
| TC-069  | `RequestPush` missing `operationId`                                                                  | Type - operationId required                                                | `@ts-expect-error` takes effect (type error)                                                  | Carried over from S4/TC-033    |
| TC-070  | `RequestPush` missing `selectedRemote`                                                               | Type - selectedRemote required                                             | `@ts-expect-error` takes effect (type error)                                                  | Carried over from S4/TC-034    |
| TC-071  | Assign a `selectRemote` variant with repo to `ResponsePush`                                          | Type - selectRemote response                                               | The assignment compiles, and `repo` / `remotes` / `defaultRemote` can be read after narrowing | Carried over from S4/TC-035    |
| TC-072  | Assign a `noRemotes` variant with repo                                                               | Type - noRemotes response                                                  | The assignment compiles, and accessing `remotes` after narrowing is a type error              | Carried over from S4/TC-036    |
| TC-073  | Assign a `completed` variant with repo                                                               | Type - completed Push response                                             | The assignment compiles, and `status` can be read after narrowing                             | Carried over from S4/TC-037    |
| TC-074  | The Push completed variant missing `status`                                                          | Type - Push status required                                                | `@ts-expect-error` takes effect (type error)                                                  | Carried over from S4/TC-038    |
| TC-075  | The selectRemote variant missing `defaultRemote`                                                     | Type - defaultRemote required                                              | `@ts-expect-error` takes effect (type error)                                                  | Carried over from S4/TC-039    |
| TC-076  | The 3 Push response variants missing `operationId`                                                   | Type - operationId required (all variants)                                 | `@ts-expect-error` takes effect for all 3 (type error)                                        | Carried over from S4/TC-040    |
| TC-077  | The 3 Push response variants missing `repo`                                                          | Type - repo required (all variants)                                        | `@ts-expect-error` takes effect for all 3 (type error)                                        | Carried over from S4/TC-041    |
| TC-078  | `switch (response.phase)` lists the 3 Push phases                                                    | Type - Push exhaustive narrowing                                           | Assigning the remaining value in the `default` clause to `never` compiles                     | Carried over from S4/TC-042    |

### Failure-source inventory (include-or-justify) — added for Feature 051 (S6)

| Failure source                                                | Covering case or reason for exclusion                                                                                                                                 |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing `remoteName` / `branchName` in the checkout payload   | TC-045, TC-046                                                                                                                                                        |
| Missing or optional `remoteBranch` in the request             | TC-047 to TC-049                                                                                                                                                      |
| Unknown kind in the checkout result / response                | TC-058, TC-059, TC-066                                                                                                                                                |
| Missing `remoteNotFound` variant                              | TC-052, TC-062                                                                                                                                                        |
| Missing or null-allowing `pullFailed.status`                  | TC-053 to TC-055, TC-063, TC-065                                                                                                                                      |
| Missing completed status                                      | TC-057, TC-065                                                                                                                                                        |
| Incomplete result / response narrowing                        | TC-050 to TC-066                                                                                                                                                      |
| Missing required fields in the Push Request                   | TC-069, TC-070                                                                                                                                                        |
| Missing variant-specific / common fields in the Push Response | TC-074 to TC-077                                                                                                                                                      |
| Incomplete Push phase narrowing                               | TC-071 to TC-073, TC-078                                                                                                                                              |
| Boundary values (0 / minimum / maximum / +/-1 / empty)        | excluded(the type definitions do not constrain the string value range. Runtime ref / remote validation belongs to `src/dataSource-test/02-branch-worktree-02.md` S46) |
| External dependency failure / thrown exception                | excluded(only type definitions, with no external dependencies or throw path)                                                                                          |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(only type definitions, with no runtime validation branch)
- Exception: excluded(only type definitions, with no throw path)
- External: excluded(no external dependencies)
- Boundary: TC-047, TC-055, TC-056, TC-067 (allowing / rejecting `null` is checked by type. Numeric boundaries do not apply)
- Type: TC-044 to TC-078

**Failure/normal ratio (smoke detector)**: 0 normal cases, 35 failure cases (all Type / Boundary). Because this is a type-definition artifact, there are no Normal runtime cases; valid assignments and rejected assignments are paired within the Type category.

## S7: Type contracts for detached worktrees and WorktreeCollection

> Origin: Feature 052 (detached-worktree-display) (light-spec-plan)
> Added: 2026-08-08
> Status: active
> Supersedes: -
> Signature: `WorktreeInfo` / `DetachedWorktreeInfo` / `WorktreeMap` / `WorktreeCollection` / `ResponseLoadCommits.worktrees`
> Target Path: `src/types.ts` (the worktree types and `ResponseLoadCommits`; to be updated to a line range after implementation)
> Test File: `tests/src/types.test.ts`

Adds a type contract that represents detached HEAD worktrees, which a `WorktreeMap` keyed by branch name cannot express, with `DetachedWorktreeInfo` (which requires `head`) and `WorktreeCollection` (which holds both branch and detached entries). The shapes of `WorktreeInfo` and `WorktreeMap` do not change, and `ResponseLoadCommits.worktrees` stays optional while only its type becomes a collection. Runtime classification belongs to `src/worktree-test.md` S2, building the response to `src/dataSource-test/02-branch-worktree-03.md` S47, and rendering and comparison in the webview to `web/main-test/01-rendering-02.md` S48 and `web/utils-test.md` S5; this section only checks `@ts-expect-error` and assignability.

| Case ID | Input / Precondition                                                                                                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                   | Notes                                             |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| TC-079  | Assign `{ path: "/tmp/wt8", isMain: false, head: "abc1234" }` to `DetachedWorktreeInfo`                                                                             | Type - detached entry                                                      | The assignment compiles, and `head` can be read as `string`                                       | Minimal contract for detached                     |
| TC-080  | An object literal of `DetachedWorktreeInfo` missing `head`                                                                                                          | Type - head required                                                       | `@ts-expect-error` takes effect (type error)                                                      | Prevents making it optional                       |
| TC-081  | An object literal of `DetachedWorktreeInfo` missing `path`                                                                                                          | Type - path required (inherited field)                                     | `@ts-expect-error` takes effect (type error)                                                      | Checks the `extends WorktreeInfo` inheritance     |
| TC-082  | An object literal of `DetachedWorktreeInfo` missing `isMain`                                                                                                        | Type - isMain required (inherited field)                                   | `@ts-expect-error` takes effect (type error)                                                      | The type enforces telling main from linked        |
| TC-083  | Assign a `DetachedWorktreeInfo` to a variable of type `WorktreeInfo`                                                                                                | Type - assignable to base                                                  | The assignment compiles                                                                           | Compatibility in the inheritance direction        |
| TC-084  | Assign a value with only `{ path, isMain }` to an element of `WorktreeCollection["detached"]`                                                                       | Type - base not assignable to detached                                     | `@ts-expect-error` takes effect (type error)                                                      | Does not mix entries without `head` into detached |
| TC-085  | Assign `{ branches: {}, detached: [] }` to `WorktreeCollection`                                                                                                     | Boundary - empty collection                                                | The assignment compiles, and `branches` can be read as a `WorktreeMap` and `detached` as an array | Same shape as the empty fallback                  |
| TC-086  | An object literal of `WorktreeCollection` missing `branches`                                                                                                        | Type - branches required                                                   | `@ts-expect-error` takes effect (type error)                                                      | Prevents a one-sided collection                   |
| TC-087  | An object literal of `WorktreeCollection` missing `detached`                                                                                                        | Type - detached required                                                   | `@ts-expect-error` takes effect (type error)                                                      | Same as above                                     |
| TC-088  | Assign `{ "feature/x": { path: "/wt/x", isMain: false } }` to `WorktreeCollection["branches"]`                                                                      | Type - branch entry unchanged                                              | The assignment compiles (`head` is not required)                                                  | Keeps the existing `WorktreeMap` contract         |
| TC-089  | Assign an object literal omitting `worktrees` to `ResponseLoadCommits`                                                                                              | Boundary - optional field omitted                                          | The assignment compiles                                                                           | Stays optional (4.1)                              |
| TC-090  | Assign `worktrees: { branches: { main: { path: "/r", isMain: true } }, detached: [{ path: "/tmp/wt8", isMain: false, head: "abc1234" }] }` to `ResponseLoadCommits` | Type - response collection                                                 | The assignment compiles, and `branches` / `detached` can be read from `worktrees`                 | The new response shape                            |
| TC-091  | Assign `worktrees: { main: { path: "/r", isMain: true } }` (the old flat map shape) to `ResponseLoadCommits`                                                        | Type - flat map rejected                                                   | `@ts-expect-error` takes effect (type error)                                                      | Prevents going back to the old shape              |

### Failure-source inventory (include-or-justify) — added for Feature 052 (S7)

| Failure source                                                                | Covering case or reason for exclusion                                                                                                                              |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Making the detached `head` optional                                           | TC-080                                                                                                                                                             |
| Failing to inherit `path` / `isMain`                                          | TC-081, TC-082                                                                                                                                                     |
| Mixing values without `head` into `detached`                                  | TC-084                                                                                                                                                             |
| Missing one side's field in `WorktreeCollection`                              | TC-086, TC-087                                                                                                                                                     |
| Breaking the shape of the existing `WorktreeMap`                              | TC-088, TC-083                                                                                                                                                     |
| Making the response field required and breaking the existing webview contract | TC-089                                                                                                                                                             |
| Leaving the response as the old flat map                                      | TC-090, TC-091                                                                                                                                                     |
| Boundary values (empty)                                                       | TC-085 (empty collection), TC-089 (field omitted)                                                                                                                  |
| Boundary values (0 / minimum / maximum / +/-1 / NULL)                         | excluded(the type definitions have no numeric boundaries and no field that allows `null`)                                                                          |
| Wrong classification, rendering or comparison at runtime                      | excluded(belongs to `src/worktree-test.md` S2, `src/dataSource-test/02-branch-worktree-03.md` S47, `web/utils-test.md` S5, `web/main-test/01-rendering-02.md` S48) |
| External dependency failure / thrown exception                                | excluded(only type definitions, with no external dependencies or throw path)                                                                                       |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(only type definitions, with no runtime validation branch)
- Exception: excluded(only type definitions, with no throw path)
- External: excluded(no external dependencies)
- Boundary: TC-085, TC-089
- Type: TC-079 to TC-084, TC-086 to TC-088, TC-090, TC-091

**Failure/normal ratio (smoke detector)**: 0 normal cases, 13 failure cases (all Type / Boundary). As with S2 to S6, this section only targets type contracts and has no normal runtime path, so 0 normal cases is not a gap in the inventory.

## S8: Type contracts for the branch cleanup diagnosis fact unions and messages

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `BranchCleanupAncestry` / `BranchCleanupTreeDifference` / `BranchCleanupAheadBehind` / `BranchCleanupUpstream` / `BranchCleanupWorktree` / `BranchCleanupLastCommit` / `BranchCleanupRow` / `BranchCleanupResult` / `RequestLoadBranchCleanup` / `ResponseLoadBranchCleanup`
> Target Path: `src/types.ts` (the branch cleanup diagnosis types and message union; to be updated to a line range after implementation)
> Test File: `tests/src/types.test.ts`

Fixes the type contracts for the fact unions and diagnosis messages in implementation plan §3.2. Checks at the type level that `unknown` and `notSelected`, `unset` and `gone`, and `unused` and a fetch failure (`unknown` / `null`) are not collapsed into the same value. Runtime validation belongs to `web/branchCleanupPanel-test.md` S2 and message routing to `src/gitGraphView-test/05-branch-cleanup-01.md` S33; this section only checks `@ts-expect-error` and assignability.

| Case ID | Input / Precondition                                                                                                                                                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                        | Notes                                                |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| TC-092  | Assign `"ancestor"` / `"notAncestor"` / `"unknown"` / `"notSelected"` to `BranchCleanupAncestry`, and also assign `"safe"`                                                                                              | Type - ancestry literal union                                              | The 4 literals compile, and `@ts-expect-error` takes effect for `"safe"` (type error)                                  | Has no overall-verdict word                          |
| TC-093  | Assign `"same"` / `"different"` / `"unknown"` / `"notSelected"` to `BranchCleanupTreeDifference`, and also assign `"differ"`                                                                                            | Type - treeDifference literal union                                        | The 4 literals compile, and `@ts-expect-error` takes effect for `"differ"`                                             | A union independent of ancestry                      |
| TC-094  | Assign `{ kind: "known", ahead: 0, behind: 0 }` to `BranchCleanupAheadBehind`, and also a literal missing `ahead`                                                                                                       | Type - aheadBehind known variant                                           | The known assignment compiles, and `@ts-expect-error` takes effect for the missing `ahead`                             | Makes the number pair required                       |
| TC-095  | Assign `{ kind: "unknown" }` / `{ kind: "notSelected" }` and access `ahead` after narrowing                                                                                                                             | Type - aheadBehind failure variants                                        | Both assignments compile, and `@ts-expect-error` takes effect for accessing `ahead` after narrowing                    | unknown and notSelected are separate variants        |
| TC-096  | Assign `{ kind: "present" }` / `{ kind: "gone" }` (`name` missing) to `BranchCleanupUpstream`                                                                                                                           | Type - upstream name required                                              | `@ts-expect-error` takes effect for both, and literals with `name` compile                                             | name required for present / gone                     |
| TC-097  | Assign `{ kind: "unset" }` / `{ kind: "unknown" }` and access `name` after narrowing                                                                                                                                    | Type - upstream variants without name                                      | Both assignments compile, and `@ts-expect-error` takes effect for accessing `name` after narrowing                     | unset and unknown are separate variants              |
| TC-098  | Assign `{ kind: "used", path: "/wt", isMain: false }` to `BranchCleanupWorktree`, and with `path` / `isMain` each missing                                                                                               | Type - required fields of worktree used                                    | The used assignment compiles, and `@ts-expect-error` takes effect for both the missing `path` and the missing `isMain` | -                                                    |
| TC-099  | Assign `{ kind: "unused" }` / `{ kind: "unknown" }` and access `path` after narrowing                                                                                                                                   | Type - worktree unused / unknown variant                                   | Both assignments compile, and `@ts-expect-error` takes effect for accessing `path` after narrowing                     | unused and unknown are separate variants             |
| TC-100  | Assign `{ kind: "known", unixSeconds: 0 }` to `BranchCleanupLastCommit`, and also a literal missing `unixSeconds`                                                                                                       | Type - lastCommit known variant                                            | The known assignment compiles, and `@ts-expect-error` takes effect for the missing `unixSeconds`                       | -                                                    |
| TC-101  | Assign a literal with all fields to `BranchCleanupRow`                                                                                                                                                                  | Type - complete row literal                                                | The assignment compiles, and each fact field can be read as its union type                                             | -                                                    |
| TC-102  | An object literal of `BranchCleanupRow` missing `ancestry`                                                                                                                                                              | Type - required row field                                                  | `@ts-expect-error` takes effect (type error)                                                                           | Prevents omitting a fact                             |
| TC-103  | Assign a row literal with `remotes: null`, and also a literal missing `remotes`                                                                                                                                         | Type - remotes allows null, cannot be omitted                              | Assigning `null` compiles, and `@ts-expect-error` takes effect for the missing field                                   | Distinguishes a failure null from omission           |
| TC-104  | Assign a row literal with `isCurrent: null`                                                                                                                                                                             | Type - isCurrent allows null                                               | The assignment compiles                                                                                                | Expresses "unknown" when detached                    |
| TC-105  | Assign `{ kind: "ok", compareBranch: null, rows: [] }` to `BranchCleanupResult`                                                                                                                                         | Type - result ok variant                                                   | The assignment compiles, and `rows` / `compareBranch` are accessible in the branch narrowed by `kind === "ok"`         | Success without a comparison branch                  |
| TC-106  | Assign `{ kind: "error", status: "fatal" }` and access `rows` after narrowing                                                                                                                                           | Type - result error variant                                                | The assignment compiles, and `@ts-expect-error` takes effect for accessing `rows` after narrowing                      | Distinguishes an overall error from an empty success |
| TC-107  | Assign `{ kind: "partial" }` to `BranchCleanupResult`                                                                                                                                                                   | Type - unknown result kind                                                 | `@ts-expect-error` takes effect (type error)                                                                           | A value outside the union                            |
| TC-108  | Assign `{ command: "loadBranchCleanup", repo: "/r", requestId: 1, compareBranch: null }` to `RequestLoadBranchCleanup`, and also a literal missing `compareBranch`                                                      | Type - required request fields                                             | The complete literal compiles, and `@ts-expect-error` takes effect for the missing `compareBranch`                     | Prevents making it optional                          |
| TC-109  | Assign a `RequestLoadBranchCleanup` value to a variable of the `RequestMessage` union                                                                                                                                   | Type - included in the request union                                       | The assignment compiles, and it can be narrowed by `command === "loadBranchCleanup"`                                   | Joins the message protocol                           |
| TC-110  | Assign `{ command: "loadBranchCleanup", repo: "/r", requestId: 1, result: { kind: "ok", compareBranch: null, rows: [] } }` to `ResponseLoadBranchCleanup` and `ResponseMessage`, and also a literal missing `requestId` | Type - required response fields and inclusion in the union                 | The complete literal compiles for both, and `@ts-expect-error` takes effect for the missing `requestId`                | Makes the echo field required                        |
| TC-111  | `switch` covers the 4 literals of `BranchCleanupAncestry`                                                                                                                                                               | Type - exhaustive narrowing                                                | Assigning the remaining value to a variable of type `never` in the `default` clause compiles (nothing is missed)       | Basis for exhaustive display branches                |

### Failure-source inventory (include-or-justify) — added for Feature 055-03 (S8)

| Failure source                                                                       | Covering case or reason for exclusion                                                                                                                                |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Collapsing unknown / notSelected, unset / gone, unused / failure into the same value | TC-092, TC-093, TC-095, TC-097, TC-099, TC-103                                                                                                                       |
| Missing or optional variant-specific fields                                          | TC-094, TC-096, TC-098, TC-100, TC-102, TC-103, TC-108, TC-110                                                                                                       |
| Accepting a value outside the union                                                  | TC-092, TC-093, TC-107                                                                                                                                               |
| A type design that cannot be narrowed                                                | TC-095, TC-097, TC-099, TC-105, TC-106, TC-111                                                                                                                       |
| Not included in the message union                                                    | TC-109, TC-110                                                                                                                                                       |
| The negative side of each branch (a valid literal is rejected)                       | TC-101, TC-104, TC-105, TC-108                                                                                                                                       |
| Wrong runtime value validation or routing                                            | excluded(belongs to `web/branchCleanupPanel-test.md` S2 and `src/gitGraphView-test/05-branch-cleanup-01.md` S33)                                                     |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)                        | excluded(the type definitions have no numeric boundaries. Allowing / rejecting `null` is checked as part of TC-103 / TC-104, and `unixSeconds: 0` as part of TC-100) |
| External dependency failure / thrown exception                                       | excluded(only type definitions, with no external dependencies or throw path)                                                                                         |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(only type alias definitions, with no runtime validation branch)
- Exception: excluded(same as above; no throw path)
- External: excluded(no external dependencies)
- Boundary: excluded(there are no numeric boundaries. Whether `null` / `0` are assignable is checked as part of TC-100 / TC-103 / TC-104)
- Type: TC-092 to TC-111

**Failure/normal ratio (smoke detector)**: 0 normal cases, 20 failure cases (TC-092 to TC-111). As with S2 to S7, this section only targets type contracts and has no normal runtime path, so confirmed that 0 normal cases is not a gap in the inventory.

## S9: Type contracts for file history Request / Response / entry

> Origin: Feature 055-07 (light-spec-plan)
> Added: 2026-09-08
> Status: active
> Supersedes: -
> Signature: `FileHistoryChangeType` / `FileHistoryEntry` / `RequestFileHistory` / `ResponseFileHistory` (added to the `RequestMessage` / `ResponseMessage` unions)
> Target Path: `src/types.ts` (after `RequestFetchAvatar` / `ResponseFetchAvatar`; to be updated to a line range after implementation)
> Test File: `tests/src/types.test.ts`

Covers the contract that the types in implementation plan §3.4 join the message protocol and that the type distinguishes `entries: null` (failure) from `entries: []` (no history) (checked with `@ts-expect-error` and assignability). Runtime value validation and routing belong to `src/gitGraphView-test/06-file-history-01.md` S34 and `src/dataSource-test/07-file-history-01.md` S49 and are not part of this table.

| Case ID | Input / Precondition                                                                                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                               | Notes                                                    |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| TC-112  | Assign `{ hash, parentHashes: [], type: "R", oldFilePath, newFilePath, historicalPath, isMerge: true }` to `FileHistoryEntry`                        | Type - complete entry literal                                              | The assignment compiles, and each of the 4 literals `"A"` / `"M"` / `"D"` / `"R"` can be assigned to `type`                                                   | -                                                        |
| TC-113  | Assign an entry literal with `type: "T"`                                                                                                             | Type - outside the change type union                                       | `@ts-expect-error` takes effect (type error)                                                                                                                  | Matches `--diff-filter=AMDR`                             |
| TC-114  | Assign an entry literal missing `historicalPath`                                                                                                     | Type - required entry field                                                | `@ts-expect-error` takes effect                                                                                                                               | Missing `isMerge` / `parentHashes` takes the same branch |
| TC-115  | Assign `{ command: "fileHistory", repo: "/r", requestId: 1, anchorHash: "abc", filePath: "src/a.txt" }` to `RequestFileHistory` and `RequestMessage` | Type - included in the request union                                       | Both assignments compile, and `anchorHash` / `filePath` are accessible in the branch narrowed by `command === "fileHistory"`                                  | Joins the message protocol                               |
| TC-116  | Assign a request literal missing `requestId`                                                                                                         | Type - required request field                                              | `@ts-expect-error` takes effect                                                                                                                               | Makes the echo field required                            |
| TC-117  | Assign `{ command: "fileHistory", repo, requestId, anchorHash, filePath, entries: null }` to `ResponseFileHistory` and `ResponseMessage`             | Type - null entries in the response                                        | Both assignments compile, and it can be narrowed by `command === "fileHistory"`                                                                               | `null` represents failure                                |
| TC-118  | Assign a response literal with `entries: []`                                                                                                         | Type - empty array in the response                                         | The assignment compiles, and `.length` is accessible in the branch narrowed by `entries !== null` (the type of `entries` is the union of an array and `null`) | The type distinguishes `null` from `[]`                  |
| TC-119  | Assign a response literal missing `entries`                                                                                                          | Type - required response field                                             | `@ts-expect-error` takes effect                                                                                                                               | Prevents making it optional                              |
| TC-120  | Assign a response literal with `entries: undefined`                                                                                                  | Type - undefined not allowed                                               | `@ts-expect-error` takes effect                                                                                                                               | Only `null` is allowed                                   |
| TC-121  | `switch` covers the 4 literals of `FileHistoryChangeType`                                                                                            | Type - exhaustive narrowing                                                | Assigning the remaining value to a variable of type `never` in the `default` clause compiles (nothing is missed)                                              | Basis for exhaustive display branches                    |

### Failure-source inventory (include-or-justify) — added for Feature 055-07 (S9)

| Failure source                                                 | Covering case or reason for exclusion                                                                                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accepting a change type outside the union                      | TC-113, TC-121                                                                                                                                          |
| Missing or optional required fields                            | TC-114, TC-116, TC-119                                                                                                                                  |
| Collapsing `null` with `[]` / `undefined`                      | TC-117, TC-118, TC-120                                                                                                                                  |
| Not included in the message union                              | TC-115, TC-117                                                                                                                                          |
| The negative side of each branch (a valid literal is rejected) | TC-112, TC-115, TC-117, TC-118                                                                                                                          |
| Wrong runtime value validation or routing                      | excluded(belongs to `src/gitGraphView-test/06-file-history-01.md` S34 and `src/dataSource-test/07-file-history-01.md` S49)                              |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)  | excluded(the type definitions have no numeric boundaries. Whether `null` / `[]` / `undefined` are allowed is checked as part of TC-117, TC-118, TC-120) |
| External dependency failure / thrown exception                 | excluded(only type definitions, with no external dependencies or throw path)                                                                            |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(only type alias definitions, with no runtime validation branch)
- Exception: excluded(same as above; no throw path)
- External: excluded(no external dependencies)
- Boundary: excluded(there are no numeric boundaries. `null` / `[]` / `undefined` are checked as part of TC-117, TC-118, TC-120)
- Type: TC-112 to TC-121

**Failure/normal ratio (smoke detector)**: 0 normal cases, 10 failure cases (TC-112 to TC-121). As with S2 to S8, this section only targets type contracts and has no normal runtime path, so confirmed that 0 normal cases is not a gap in the inventory.

## S10: The branch deletion request union of RequestRemoveWorktree (Compiler API semantic diagnostics)

> Origin: Feature 053 (detached-worktree-menu) (light-spec-plan)
> Added: 2026-09-13
> Status: active
> Supersedes: -
> Signature: `type RequestRemoveWorktree = (RequestRemoveWorktreeBase & { deleteBranch?: false; branchName?: string }) | (RequestRemoveWorktreeBase & { deleteBranch: true; branchName: string })`
> Target Path: `src/types.ts:665-679`
> Test File: `tests/src/types.test.ts`

Checks the real `src/types.ts` with the helper from implementation plan §3.9. A check using only `@ts-expect-error` is not covered by `pnpm run typecheck`, so it was not adopted. Runtime checks belong to `src/gitGraphView-test/03-worktree-actions-01.md` S41.

| Case ID | Input / Precondition                                                                                                                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                        | Notes |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----- |
| TC-122  | literal `{ command: "removeWorktree", repo: "/r", worktreePath: "/tmp/wt8", deleteBranch: false }`                                                                                | Normal - detached payload accepted                                         | 0 Error diagnostics (across all files). `program.getSourceFile(TYPES_PATH)` is defined | -     |
| TC-123  | `{ command: "removeWorktree", repo: "/r", worktreePath: "/tmp/wt8" }`                                                                                                             | Boundary - deleteBranch and branchName omitted                             | 0 Error diagnostics                                                                    | -     |
| TC-124  | preamble `const flag: boolean = Math.random() > 0.5;`, literal `{ command: "removeWorktree", repo: "/r", worktreePath: "/tmp/wt8", branchName: "feature/x", deleteBranch: flag }` | Normal - legacy sender with boolean variable                               | 0 Error diagnostics                                                                    | -     |
| TC-125  | `{ command: "removeWorktree", repo: "/r", worktreePath: "/tmp/wt8", deleteBranch: true }`                                                                                         | Validation - branchName required when deleting                             | 1 Error diagnostic, with `code` `2322` and `file.fileName` `VIRTUAL_PATH`              | -     |
| TC-126  | `{ command: "removeWorktree", repo: "/r", worktreePath: "/tmp/wt8", deleteBranch: true, branchName: "feature/x" }`                                                                | Normal - explicit delete accepted                                          | 0 Error diagnostics                                                                    | -     |

### Failure-source inventory (include-or-justify) — added for Feature 053 (S10)

| Failure source                                | Covering case or reason for exclusion                                            |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| Rejecting the detached form                   | TC-122                                                                           |
| Rejecting the omitted form                    | TC-123                                                                           |
| Rejecting existing senders                    | TC-124                                                                           |
| Accepting `true` with the name missing        | TC-125                                                                           |
| Rejecting the explicit form                   | TC-126                                                                           |
| Treating a module resolution error as success | The `getSourceFile` check in TC-122 and the 0-diagnostics check across all files |

**Failure-category coverage (diversity floor)**:

- Validation: TC-125
- Exception: excluded(only runs the compiler)
- External: excluded(only runs the compiler)
- Boundary: TC-123
