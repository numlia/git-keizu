# Test Perspectives: src/config.ts

> Source: `src/config.ts`
> Generated: 2026-09-12T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: feature-056-retain-context

## S20: retainContextWhenHidden() default value consistent with package.json

> Origin: Feature 056 (retain-context-when-hidden) issue #48
> Added: 2026-09-12
> Status: active
> Supersedes: -
> Signature: `retainContextWhenHidden(): boolean`
> Target Path: `src/config.ts` (right after `maxDepthOfRepoSearch()`)
> Test File: `tests/src/config-defaults.test.ts` (an `it.each` row of Group 1)

Checks that the fallback value of `workspaceConfiguration.get("retainContextWhenHidden", true)` matches `git-keizu.retainContextWhenHidden.default` in `package.json`. Adds one row to the simple value comparison group of S10. Type checking of the setting value is left to the VS Code settings schema; this table covers only the default value contract.

| Case ID | Input / Precondition                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                           | Notes                  |
| ------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------- |
| TC-368  | Call `retainContextWhenHidden()` with the `get` mock returning the fallback value as is | Normal - default value consistency                                         | The return value matches `default` (`true`) of `package.json` with `toBe` | Same comparison as S10 |

### Failure-source inventory (include-or-justify) — added by Feature 056 (S20)

| Failure source                                                    | Covering cases or reason for exclusion                                                                           |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| The fallback in code does not match the default in `package.json` | TC-368                                                                                                           |
| Misspelled setting key                                            | TC-368 (`default` is looked up by the `package.json` key, so a missing key gives `undefined` and does not match) |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)     | excluded(boolean setting. Values other than `true` / `false` are rejected by the schema)                         |
| External dependency × failure mode                                | excluded(`workspaceConfiguration.get()` does not throw under the default value contract; existing behaviour)     |
| Exception and error paths                                         | excluded(the getter has no branch)                                                                               |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(as in the table above)
- Exception: excluded(as in the table above)
- External: excluded(as in the table above)
- Boundary: excluded(as in the table above)
- Type: excluded(as in the table above)
- Normal: TC-368

**Failure/normal ratio (smoke detector)**: 1 normal case, 0 failure cases. This adds a single default value getter, and it was confirmed that the table above covers the failure sources.
