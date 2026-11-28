---
title: Allow listed Git text comparisons to open when VS Code cannot synchronize the text model
type: rule
date: 2026-11-28
status: Active
context: "Branch review, refs/remotes/origin/main (89972393550031ea4b9495eb99079482b296be56) to feat/061-07-saved-diff (ad9695a44ed5b2e5e036a9879262997cb499bddb)"
node_id: rule:RULE-20261128-132817-45ff-large-diff-model-sync
when_changed:
  - concept:extension-host-model-synchronization
  - file:src/savedDiffEncoding.ts
  - file:src/gitGraphView.ts
---

# RULE-010: Allow listed Git text comparisons to open when VS Code cannot synchronize the text model

## Condition

Git reports numeric addition and deletion counts, the graph enables the file's diff action, and the saved side is available to a read-only provider. An editor integration needs file metadata such as its language for decoding.

## Judgment

Keep the comparison available to VS Code when the editor can display the resource but cannot synchronize its text model with the extension host. Include an eligible large text file in the checks for any change that requires document metadata before opening a comparison.

## Rationale

VS Code can display a large file and still reject an extension's request to open its text document. Making that request a prerequisite for language selection prevents an enabled comparison from reaching the editor.

## Exceptions

The existing read-failure response applies when the provider cannot capture the required saved contents. Binary rows and other rows without numeric counts already disable the action.

## Related documents

- [Working-tree comparison cases](../../../docs/testing/perspectives/src/gitGraphView-test/01-message-routing-02.md)
- [VS Code document synchronization check](https://github.com/microsoft/vscode/blob/1.99.0/src/vs/workbench/api/browser/mainThreadDocuments.ts#L249-L253)
