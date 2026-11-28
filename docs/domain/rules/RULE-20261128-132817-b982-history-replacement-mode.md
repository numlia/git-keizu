---
title: Include Git replacement mode when reusing paged history
type: rule
date: 2026-11-28
status: Active
context: "PR #144 review"
node_id: rule:RULE-20261128-132817-b982-history-replacement-mode
when_changed:
  - concept:git-replacement-refs
  - file:src/dataSource.ts
---

# RULE-004: Include Git replacement mode when reusing paged history

## Condition

A history request retains commits or a lookahead row across independent Git invocations, and the repository has replacement refs. An included or global config file can change whether those refs affect the walk while every ref name and object ID stays the same.

## Judgment

Check the effective replacement mode before extending that history, or use a fresh read for repositories with replacement refs. Compare the combined hashes, parent links and presence of another page with a fresh read under the new mode.

## Rationale

A replacement can change a commit's parent. In the six-commit review fixture, disabling replacements between reads skipped two intervening commits and made the view report the end. Including the setting in the snapshot caused the host to reload the correct range.

## Exceptions

A full read already uses Git's current replacement mode. A change to that mode alone cannot affect a repository with no effective replacement refs.

## Related documents

- [History continuation cases, TC-385](../../../docs/testing/perspectives/src/dataSource-test/01-history-diff-01.md)
- [Real Git history tests](../../../tests/src/dataSource.git.test.ts)
