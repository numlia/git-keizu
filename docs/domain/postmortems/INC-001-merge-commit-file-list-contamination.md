---
title: Merge commit file list contamination bug
type: postmortem
date: 2026-04-03
status: Draft
context: main
---

# INC-001: Merge commit file list contamination bug

## Summary

When viewing the file list of a merge commit in Git Keizu, files not belonging to that merge were incorrectly displayed. The `git diff-tree -m` flag outputs diffs against all parents, causing files from unrelated parent diffs to contaminate the list.

## Timeline

| Time                            | Event                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| 2018 (upstream Git Graph)       | Initial implementation used `git diff-tree -m`                                        |
| 2020-03-05 (upstream Git Graph) | Same bug reported and fixed as Issue #274 (changed to `git diff <hash>^ <hash>`)      |
| Fork time (neo-git-graph)       | Forked from pre-#274 code, inheriting the bug                                         |
| 2026-04-03                      | Report received: merge commit for aw-kentei PR #464 showed 2 files instead of 1       |
| 2026-04-03                      | Root cause identified through comparison with upstream, fixed using the same approach |
| 2026-04-03                      | Fix applied, all 1228 tests passed, verified in production                            |

## Impact

- Scope: All Git Keizu users viewing merge commit details. File list displayed inaccurately when selecting a merge commit
- Severity: Minor (display-only issue, no data loss or functional failure)

## Root cause

The `commitDetails()` method in `src/dataSource.ts` used `git diff-tree -m`. The `-m` flag outputs diffs against each parent of a merge commit separately, causing the parser to accumulate files from both parent diffs into a single array, resulting in extraneous files appearing in the list.

This was already fixed in upstream Git Graph in March 2020 as Issue #274, but the fork source neo-git-graph had not incorporated the fix, and it was inherited as-is by Git Keizu.

## Actions

- Immediate: Applied the same approach as upstream (`git diff <hash>^ <hash>`). Added `hasParents` to the message protocol and introduced a `buildDiffArgs()` method that branches git commands appropriately for commits with parents, root commits, and stashes
- Permanent: Establish a process to periodically review upstream Git Graph fix history and check for unincorporated critical fixes

## Lessons learned

The root cause was that the fork source had not incorporated an upstream fix. Bugs fixed upstream can persist indefinitely through a fork chain, which is an inherent risk in fork-based development. A mechanism to periodically check diffs with the fork source (e.g., reviewing upstream release notes and issues) is needed.

## Related documents

- ADR: None
- Rules: None
- Incidents: [Upstream Git Graph Issue #274](https://github.com/mhutchie/vscode-git-graph/issues/274)

<!-- Status transition: Draft → Reviewed -->
