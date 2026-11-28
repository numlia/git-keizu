---
title: Keep the extension host responsive while preparing large saved comparisons
type: rule
date: 2026-11-28
status: Active
context: "Branch review, refs/remotes/origin/main (89972393550031ea4b9495eb99079482b296be56) to feat/061-07-saved-diff (a915dd900f670039a598314ce5563dec4a321d48)"
node_id: rule:RULE-20261128-132817-d217-saved-diff-host-responsiveness
depends_on:
  - id: rule:RULE-20261128-132817-45ff-large-diff-model-sync
    relation: references
when_changed:
  - concept:extension-host-decoding-responsiveness
  - file:src/savedDiffEncoding.ts
---

# RULE-011: Keep the extension host responsive while preparing large saved comparisons

## Condition

Git enables the comparison for a saved text file and Git Keizu converts its encoding in the shared VS Code extension host before opening the diff.

## Judgment

Keep the host able to process other extensions' commands during conversion. Open a large eligible file on supported editors with different decoding paths. Check the displayed text and confirm that other callbacks run during preparation.

## Rationale

The desktop harness opened a 51 MiB Shift JIS comparison on Linux VS Code 1.74.3 and 1.99.3 and verified the Japanese prefix of its display bytes. Both editors reported an unresponsive extension host. On 1.74.3 the step between capture and opening the editor took 8.176 seconds. VS Code 1.107.1 also paused a host timer for 6.365 seconds when its public API decoded the file in one call. Both paths could pass a check of the final display text.

## Exceptions

Conversion that runs outside the extension host can still take time. This rule measures host responsiveness and leaves total loading time dependent on the file and environment.

## Related documents

- [Decoding and event-loop regression cases](../../../tests/src/savedDiffEncoding.test.ts)
- [RULE-010](RULE-20261128-132817-45ff-large-diff-model-sync.md)
