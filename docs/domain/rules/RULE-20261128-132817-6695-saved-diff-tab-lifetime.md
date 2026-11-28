---
title: Release saved comparison bytes when the last editor using them closes
type: rule
date: 2026-11-28
status: Active
context: "Branch review, refs/remotes/origin/main (89972393550031ea4b9495eb99079482b296be56) to feat/061-07-saved-diff (fde3c447a9a5c5a6ac427ee731a3e57786cd2fae)"
node_id: rule:RULE-20261128-132817-6695-saved-diff-tab-lifetime
when_changed:
  - concept:saved-diff-tab-ownership
  - file:src/savedDiffFileSystem.ts
---

# RULE-008: Release saved comparison bytes when the last editor using them closes

## Condition

Git Keizu retains working-tree bytes under a distinct URI for each saved comparison opened in VS Code.

## Judgment

Keep each snapshot readable while a tab uses it. Release it after the last tab closes, even when its text model never reaches the extension host. Verify that closing the last reference releases the bytes and that closing one of two editors displaying the same comparison preserves the other.

## Rationale

A large text file can have numeric Git diff statistics and open from the graph. VS Code can display it without sending text-document events to the extension. A cache that requires such an event for cleanup retains one full copy per open.

## Exceptions

A rejected open can release its private snapshot immediately. A language change or closing the graph panel can leave the comparison open.

## Related documents

- [Saved comparison lifetime cases](../../../docs/testing/perspectives/src/savedDiffFileSystem-test.md)
- [VS Code text model synchronization](https://github.com/microsoft/vscode/blob/1.107.1/src/vs/editor/common/model.ts#L1599-L1602)
