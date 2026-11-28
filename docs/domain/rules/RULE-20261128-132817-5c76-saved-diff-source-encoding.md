---
title: Preserve the source file’s decoding settings in saved Git comparison previews
type: rule
date: 2026-11-28
status: Active
context: "Branch review, refs/remotes/origin/main (89972393550031ea4b9495eb99079482b296be56) to feat/061-07-saved-diff (ceadd227b0705606442d86a0d3f7327a113f5fd5)"
node_id: rule:RULE-20261128-132817-5c76-saved-diff-source-encoding
when_changed:
  - concept:saved-diff-source-encoding
  - file:src/savedDiffEncoding.ts
  - file:src/savedDiffFileSystem.ts
---

# RULE-009: Preserve the source file’s decoding settings in saved Git comparison previews

## Condition

A Git Keizu comparison shows saved working-tree bytes through a virtual resource, and VS Code can apply a different encoding to the original file’s workspace folder.

## Judgment

Preserve the decoding applicable to the source resource when displaying its captured bytes. Check the text that VS Code displays for a BOM-less staged addition in a multi-root workspace with a folder-specific encoding.

## Rationale

A virtual URI outside the workspace folder inherits the workspace or user default. A byte-for-byte copy can therefore produce different text in the comparison and in the source editor. A staged addition isolates the saved side because its commit side is empty.

## Exceptions

A comparison concerned solely with raw bytes can assert byte equality directly. The source editor’s unsaved buffer is outside the saved-file comparison contract.

## Related documents

- [Saved comparison encoding cases](../../../tests/src/savedDiffEncoding.test.ts)
- [Working-tree comparison cases](../../../docs/testing/perspectives/src/gitGraphView-test/01-message-routing-02.md)
- [VS Code resource-specific read encoding](https://github.com/microsoft/vscode/blob/1.107.1/src/vs/workbench/services/textfile/browser/textFileService.ts#L822-L864)
