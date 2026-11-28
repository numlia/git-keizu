---
title: Represent the absent side of a Git file change explicitly
type: rule
date: 2026-11-28
status: Active
context: "Branch review, refs/remotes/origin/main (89972393550031ea4b9495eb99079482b296be56) to feat/061-07-saved-diff (fde3c447a9a5c5a6ac427ee731a3e57786cd2fae)"
node_id: rule:RULE-20261128-132817-af57-absent-diff-side
when_changed:
  - concept:git-diff-change-type
  - file:src/diffDocProvider.ts
  - file:src/gitGraphView.ts
---

# RULE-007: Represent the absent side of a Git file change explicitly

## Condition

A graph comparison opens the two sides of a file row that Git classified as an addition or deletion.

## Judgment

Supply an empty document for the absent side identified by the row's change type. Test an addition at a path that used to hold a directory.

## Rationale

Replacing a tracked directory with a text file produces an addition for the file. Looking up the same path in the selected commit succeeds and yields the old tree listing. Displaying it would introduce lines that never belonged to the file.

## Exceptions

Both sides of a modification or rename have content. For a rename, the old and new paths can differ.

## Related documents

- [Expected comparison contents, TC-433](../../../docs/testing/perspectives/src/gitGraphView-test/01-message-routing-02.md)
- [Real Git comparison tests](../../../tests/src/gitGraphView.savedDiff.git.test.ts)
