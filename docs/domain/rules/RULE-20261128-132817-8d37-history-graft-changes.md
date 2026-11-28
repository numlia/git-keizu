---
title: Invalidate paged Git history when effective grafts change
type: rule
date: 2026-11-28
status: Active
context: "PR #144 review"
node_id: rule:RULE-20261128-132817-8d37-history-graft-changes
depends_on:
  - id: rule:RULE-20261128-132817-b982-history-replacement-mode
    relation: references
when_changed:
  - concept:git-history-grafts
  - file:src/dataSource.ts
---

# RULE-005: Invalidate paged Git history when effective grafts change

## Condition

The graph reuses previously displayed parents or a lookahead commit across Git invocations. Git can obtain ancestry overrides from a graft file, including a file outside the worktree.

## Judgment

Before extending the history, account for creation, deletion and edits of the effective graft file. Resolve its location through Git. If its state cannot be established, reload the requested range. Compare the resulting commit order, parents and remaining-history flag with a fresh read.

## Rationale

Making the second displayed commit a graft root left every ref unchanged. The continuation still displayed four commits and offered another page. A fresh read stopped at two commits.

## Exceptions

A complete read already applies the current ancestry. A reader that explicitly disables grafts consistently across all of its queries can document that separate contract.

## Related documents

- [History continuation cases, TC-385](../../../docs/testing/perspectives/src/dataSource-test/01-history-diff-01.md)
- [RULE-004](RULE-20261128-132817-b982-history-replacement-mode.md)
