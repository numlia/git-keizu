---
title: Preserve file identity across reused paths in history continuations
type: rule
date: 2026-11-28
status: Active
context: "PR #127 review"
node_id: rule:RULE-20261128-132817-38a0-file-history-path-reuse
when_changed:
  - concept:file-history-rename-continuation
  - file:src/dataSource.ts
---

# RULE-001: Preserve file identity across reused paths in history continuations

## Condition

A file-history implementation resumes tracing an old pathname after a rename, especially by querying that pathname from a newer anchor commit.

## Judgment

Verify that the continuation traces the original file through the rename, even if another file later takes its old pathname. Include a real-Git case for this reuse alongside merge and rename-chain cases.

## Rationale

In PR #127, `a.txt -> b.txt`, followed by unrelated `x.txt -> a.txt`, redirects an anchor-based `--follow a.txt` query to the unrelated file. The required splice commit disappears, turning a previously valid history into a failed load. This was reproduced through the public API on Git 2.43.0 and 2.56.0.

## Exceptions

A different continuation strategy may satisfy this rule if it establishes file identity at the intended boundary and preserves the documented side-branch history contract. Pinning the query to the rename commit alone is not evidence that side-branch behavior is preserved.

## Related documents

- [File lineage tests, TC-352 and TC-361](../../../docs/testing/perspectives/src/dataSource-test/07-file-history-01.md)
