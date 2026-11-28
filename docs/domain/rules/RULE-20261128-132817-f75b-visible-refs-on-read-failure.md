---
title: Preserve visible Git refs when a history snapshot is unavailable
type: rule
date: 2026-11-28
status: Active
context: "PR #144 review"
node_id: rule:RULE-20261128-132817-f75b-visible-refs-on-read-failure
when_changed:
  - concept:visible-history-refs
  - file:src/dataSource.ts
---

# RULE-003: Preserve visible Git refs when a history snapshot is unavailable

## Condition

History pagination reads a wider set of Git refs than the user chose to display. A ref outside the visible set prevents Git from returning the complete snapshot.

## Judgment

Disable continuation when the snapshot is unavailable. Independently recover HEAD and the visible refs using the same scope as the user's history view. Check a valid local branch and tag while a hidden remote ref cannot be resolved.

## Rationale

In PR #144, a broken hidden ref caused a local-only view to lose the local branch, tag and HEAD while the commits still loaded. A separate lookup of the visible refs recovered all three labels.

## Exceptions

If Git also cannot resolve the visible refs, the history can only display the metadata it can establish.

## Related documents

- [History snapshot failure cases, TC-404 and TC-405](../../../docs/testing/perspectives/src/dataSource-test/01-history-diff-02.md)
