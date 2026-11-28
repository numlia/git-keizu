---
title: Scope delayed history replies to their originating Webview
type: rule
date: 2026-11-28
status: Active
context: "PR #144 review"
node_id: rule:RULE-20261128-132817-7deb-history-reply-ownership
when_changed:
  - concept:webview-history-request-lifetime
  - file:src/gitGraphView.ts
  - file:web/main.ts
---

# RULE-002: Scope delayed history replies to their originating Webview

## Condition

An extension-host operation can finish after the same panel receives a new Webview document.

## Judgment

Correlate a history reply with both the logical request and the document that issued it. Check a delayed reply from the old document arriving before the current reply. Only the current reply may install rows or complete the current request.

## Rationale

The panel survives HTML replacement. In PR #144 both Webviews issued request 1. The first reply installed obsolete rows and consumed the second Webview's pending request.

## Exceptions

A host guarantee that cancels or suppresses all outstanding replies on document replacement also satisfies the rule.

## Related documents

- [History request routing cases](../../../docs/testing/perspectives/src/gitGraphView-test/01-message-routing-03.md)
