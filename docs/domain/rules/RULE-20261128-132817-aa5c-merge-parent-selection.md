---
title: Keep merge-parent choices consistent while history pages arrive
type: rule
date: 2026-11-28
status: Active
context: "PR #144 review"
node_id: rule:RULE-20261128-132817-aa5c-merge-parent-selection
when_changed:
  - concept:merge-mainline-selection
  - file:web/commitMenu.ts
---

# RULE-006: Keep merge-parent choices consistent while history pages arrive

## Condition

A commit menu can stay open while the graph appends history. Cherry Pick and Revert need the merge's parents in Git order, including parents outside the loaded window.

## Judgment

Resolve each parent hash and its optional subject from the same version of the history. The menu can capture its parent options when opened or resolve all of them against the current rows at activation. Use the abbreviated hash for a parent outside that version. Keep the original parent order and one-based mainline number.

## Rationale

A parent arriving on the next page acquires an index beyond the end of the previously displayed rows. Using that index with the earlier rows prevents the parent selector from opening.

## Exceptions

Ordinary single-parent and root commits use a different dialog and do not require parent choices.

## Related documents

- [Commit menu cases](../../../docs/testing/perspectives/web/commitMenu-test.md)
- [Merge parent selection](../../../web/commitMenu.ts)
