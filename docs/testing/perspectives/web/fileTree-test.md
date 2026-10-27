# Test Perspectives: web/fileTree.ts

> Source: `web/fileTree.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: generateGitFileListHtml() flat file list rendering

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**Signature**: `generateGitFileListHtml(gitFiles: GG.GitFileChange[], canHighlightFileHistory: FileHistoryActionPredicate): string`
**Target path**: `web/fileTree.ts`

| Case ID | Input / Precondition                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                           | Notes                          |
| ------- | ----------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------ |
| TC-001  | 3 file changes (A, M, D)            | Normal - standard                                                          | A flat `<ul>/<li>` list of full paths, in alphabetical order of file path | Sort check                     |
| TC-002  | File change type A (added)          | Normal - standard                                                          | Badge "A" is shown. The CSS class includes the change type                | -                              |
| TC-003  | File change type D (deleted)        | Normal - standard                                                          | Badge "D" is shown                                                        | -                              |
| TC-004  | File change type M (modified)       | Normal - standard                                                          | Badge "M" is shown                                                        | -                              |
| TC-005  | File change type R (renamed)        | Normal - standard                                                          | Badge "R" is shown. The old path is set as the tooltip                    | oldFilePath tooltip            |
| TC-006  | Empty file change array             | Boundary - empty                                                           | An empty list HTML is returned (not an error)                             | -                              |
| TC-007  | CSS classes of file elements        | Normal - standard                                                          | Each element has the gitFile class and the change type class              | Same as the existing tree view |
| TC-008  | data attributes of file elements    | Normal - standard                                                          | data-oldfilepath, data-newfilepath and data-type are set                  | Same as the existing tree view |
| TC-009  | additions/deletions counter display | Normal - standard                                                          | The added and deleted line counts are shown correctly                     | -                              |
| TC-010  | 1 file change                       | Boundary - min (1 entry)                                                   | HTML with 1 list item is returned                                         | Minimum valid count            |

## S2: buildFileItemHtml() action icon display

> Origin: Feature 026 (commit-detail-open-file) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: superseded
> Supersedes: -
> Superseded By: S5

**Signature**: `buildFileItemHtml(gitFile: GG.GitFileChange): string` (private; tested indirectly through generateGitFileListHtml)
**Target path**: `web/fileTree.ts`

| Case ID | Input / Precondition              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                          | Notes                         |
| ------- | --------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------- |
| TC-011  | File of type "M" (modified)       | Normal - modified file                                                     | The HTML contains a .gitFileAction.openFile element      | -                             |
| TC-012  | File of type "A" (added)          | Normal - added file                                                        | The HTML contains a .gitFileAction.openFile element      | -                             |
| TC-013  | File of type "R" (renamed)        | Normal - renamed file                                                      | The HTML contains a .gitFileAction.openFile element      | -                             |
| TC-014  | File of type "D" (deleted)        | Validation - deleted excluded                                              | The HTML does not contain a .gitFileActions element      | No icon for deleted files     |
| TC-015  | File of type "M"                  | Normal - icon content                                                      | The icon element contains the codicon-go-to-file class   | Checks svgIcons.goToFile      |
| TC-016  | 4 files (type "A", "M", "D", "R") | Boundary - mixed types                                                     | There are 3 .gitFileAction.openFile elements (all but D) | Covers the conditional branch |

## S3: HTML escaping in generateGitFileTreeHtml() tree rendering

> Origin: フェーズ1 修正 H1 (commit-details-tree-escape)
> Added: 2026-07-04T01:35:00Z
> Status: active
> Supersedes: -
> Signature: `export function generateGitFileTreeHtml(folder: GitFolder, gitFiles: GitFileChange[], canHighlightFileHistory: FileHistoryActionPredicate): string`
> Target Path: `web/fileTree.ts:69-99`

A fix that applies `escapeHtml` when the folder name (`folder.name`, L72) and the file display name (`folder.contents[keys[i]].name`, L95) are embedded in the tree HTML. The `escapeHtml` conversion table: `&`→`&amp;`, `<`→`&lt;`, `>`→`&gt;`, `"`→`&quot;`, `'`→`&#x27;`, `/`→`&#x2F;`.

| Case ID | Input / Precondition                                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                       | Notes                                               |
| ------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| TC-017  | `folder.name="<script>alert(1)</script>"` (open folder)                                       | Validation - XSS escape (folder name)                                      | The output HTML contains `<span class="gitFolderName">&lt;script&gt;alert(1)&lt;&#x2F;script&gt;</span>`. It does not contain the raw `<script>` string               | `<`/`>`/`/` are escaped                             |
| TC-018  | `folder.name="a&b"`                                                                           | Validation - ampersand escape (folder name)                                | The output HTML contains `<span class="gitFolderName">a&amp;b</span>`. It does not contain the raw `a&b`                                                              | `&` escaped                                         |
| TC-019  | `folder.name="say\"hi\" it's"` (contains double and single quotes)                            | Validation - quote escape (folder name)                                    | The output HTML contains `&quot;hi&quot;` and `it&#x27;s`. The `gitFolderName` span does not contain a raw `"` or `'`                                                 | `"`/`'` escaped                                     |
| TC-020  | `folder.name="a/b"` (contains a slash)                                                        | Validation - slash escape (folder name)                                    | The output HTML contains `<span class="gitFolderName">a&#x2F;b</span>`. The span text does not contain the raw `a/b`                                                  | `/` is also converted to `&#x2F;`                   |
| TC-021  | `folder.name="src"` (no special characters)                                                   | Normal - plain folder name                                                 | The output HTML contains `<span class="gitFolderName">src</span>`. It contains no HTML entities (`&amp;`/`&lt;` and so on)                                            | Characters not subject to escaping stay as they are |
| TC-022  | `folder.name=""` (root folder)                                                                | Boundary - empty folder name                                               | The output HTML does not contain `<span class="gitFolderName">` (the ternary at L72 returns an empty string). The `gitFolder` span itself is not rendered             | An empty name does not go through escapeHtml        |
| TC-023  | File element `contents[key].name="<img src=x onerror=y>.ts"` (a file directly under the tree) | Validation - XSS escape (file basename)                                    | The displayName passed to `buildFileItemHtml` is `&lt;img src=x onerror=y&gt;.ts`, and the generated `<li class="gitFile ...">` does not contain a raw `<img`         | The display name is embedded already escaped        |
| TC-024  | File element `contents[key].name="main.ts"` (no special characters)                           | Normal - plain file basename                                               | `<li class="gitFile ...">` contains `main.ts` as is. It contains no HTML entities                                                                                     | Characters not subject to escaping stay as they are |
| TC-025  | Child folder `child.name="<b>&"` under a parent folder (nested structure)                     | Validation - nested folder escape                                          | The output HTML contains `<span class="gitFolderName">&lt;b&gt;&amp;</span>` for the child folder generated by the recursive call. It does not contain the raw `<b>&` | escapeHtml is also applied on the recursive path    |

## S4: generateGitFileTree() replacing a file with a folder of the same name

> Origin: フェーズ2 修正 M13 (file-tree-file-to-folder-replacement)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: `export function generateGitFileTree(gitFiles: GitFileChange[]): GitFolder`
> Target Path: `web/fileTree.ts:16-40`

A fix that extends the existing-node check for intermediate path segments during tree building from `cur.contents[path[j]] === undefined` to `cur.contents[path[j]] === undefined || cur.contents[path[j]].type === "file"`. A segment that already exists as a `file` node is replaced with a `folder` node and the descent continues. Even when one commit contains both `foo` (a file) and `foo/bar` (a file with `foo` as its directory), the tree is built without crashing on access to the nonexistent `contents` of the `file` node.

| Case ID | Input / Precondition                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                | Notes                                              |
| ------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| TC-026  | Intermediate segment is undefined (`cur.contents[path[j]] === undefined`)               | Normal - new folder segment                                                | A new `folder` node (empty `contents`) is created for the segment and `cur` descends into that folder                          | Normal folder creation path                        |
| TC-027  | Intermediate segment is an existing `folder` node                                       | Normal - existing folder reused                                            | The existing folder is reused without replacement and the descent continues (`contents` is kept)                               | Existing folders are kept                          |
| TC-028  | Intermediate segment is an existing `file` node (`foo`(file) first, then `foo/bar`)     | Boundary - file to folder replacement                                      | The `file` node of the segment is replaced with a folder of `type==="folder"` with empty `contents`, and the descent continues | Core of the fix (resolves the same-name collision) |
| TC-029  | After the file→folder replacement, add the leaf `bar`                                   | Boundary - leaf added under replaced folder                                | A leaf `file` node is added to `contents["bar"]` of the replaced folder                                                        | Leaf registration after the replacement            |
| TC-030  | gitFiles=[`{newFilePath:"foo"}`, `{newFilePath:"foo/bar"}`] (same-name collision input) | Exception - collision handled without throw                                | `generateGitFileTree` completes without throwing, and in the resulting tree `foo` is a `folder` that contains `bar`            | Regression guard; the old implementation crashed   |

## S5: buildFileItemHtml() history icon rendering and passing of the predicate

> Origin: Feature 055-09 (light-spec-plan)
> Added: 2026-09-13
> Status: active
> Supersedes: S2
> Signature: `generateGitFileListHtml(gitFiles: GitFileChange[], canHighlightFileHistory: FileHistoryActionPredicate): string` / `generateGitFileTreeHtml(folder: GitFolder, gitFiles: GitFileChange[], canHighlightFileHistory: FileHistoryActionPredicate): string` (`buildFileItemHtml()` is not exported and is reached through both functions)
> Target Path: `web/fileTree.ts:44-143`
> Test File: `tests/web/fileTree.test.ts`

S2 assumed only the `openFile` icon, with the contract that `D` rows do not render `.gitFileActions` at all (TC-014). Implementation plan §3.5 changed the contract: `.gitFileAction.highlightFileHistory` follows `.gitFileAction.openFile`, and a `D` row renders only the history icon when the predicate is `true`. This section therefore redefines the S2 action icon contract under the new signature. `web/fileTree.ts` only calls the predicate `FileHistoryActionPredicate` once per row; the content of the four conditions uncommitted / stash / comparison view / type belongs to `web/fileMenu-test.md` S6, and the shape of the function that `web/main.ts` passes belongs to `web/main-test/06-file-actions-01.md` S54, so they are not in this table. The basic fixture is `makeFile()` (`M`, `src/file.ts`, +5 / -2), `ALLOW = () => true`, `DENY = () => false`.

| Case ID | Input / Precondition                                                                                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                               | Notes                           |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| TC-031  | list, `M` row, ALLOW                                                                                                                      | Normal - order of the 2 icons                                              | `.gitFileActions` has 2 child elements; `children[0]` is `.gitFileAction.openFile` and `children[1]` is `.gitFileAction.highlightFileHistory` | Fixed order                     |
| TC-032  | list, `M` row, ALLOW                                                                                                                      | Normal - content of the history icon                                       | The `title` attribute of `.highlightFileHistory` is `Highlight File History`, and it contains a `.codicon-history` element                    | `svgIcons.history`              |
| TC-033  | list, `D` row, ALLOW                                                                                                                      | Boundary - D row has history only                                          | `.gitFileActions` exists with 1 child element, `.highlightFileHistory`. `.openFile` is `null`                                                 | Contract change from old TC-014 |
| TC-034  | list, `A` row and `R` row, ALLOW                                                                                                          | Normal - covers the allowed types                                          | Both rows have 2 child elements, and the second is `.highlightFileHistory`                                                                    | Old TC-012 / TC-013             |
| TC-035  | list, `M` row, DENY                                                                                                                       | Validation - predicate false                                               | `.openFile` exists, `.highlightFileHistory` is `null`, and `.gitFileActions` has 1 child element                                              | Old TC-011 / TC-015             |
| TC-036  | list, `D` row, DENY                                                                                                                       | Boundary - 0 icons                                                         | `.gitFileActions` is `null`                                                                                                                   | Same as the current D row       |
| TC-037  | list, 4 rows `A` / `M` / `D` / `R`, ALLOW                                                                                                 | Boundary - mixed                                                           | 4 `.highlightFileHistory`, 3 `.openFile`, 3 `.codicon-go-to-file`                                                                             | Old TC-016                      |
| TC-038  | list, 3 rows, `vi.fn(() => true)`                                                                                                         | Normal - delegation per row                                                | The predicate is called 3 times, and the first argument of each call is the same reference as that row's `GitFileChange`                      | `toBe`                          |
| TC-039  | tree, `generateGitFileTree()` with `src/deep/a.ts`(A) / `src/deep/m.ts`(M) / `src/deep/d.ts`(D) / `src/deep/r.ts`(R), `vi.fn(() => true)` | Normal - recursive passing                                                 | 4 `.highlightFileHistory`, 3 `.openFile`, and the predicate is called 4 times                                                                 | Under `src/deep/`               |
| TC-040  | tree, the same 4 rows as TC-039, DENY                                                                                                     | Validation - not rendered in recursion either                              | 0 `.highlightFileHistory`, 3 `.openFile`, 3 `.gitFileActions`                                                                                 | -                               |
| TC-041  | Generate the same input of an `M` row and a `D` row as list and tree, ALLOW                                                               | Normal - same result for both view formats                                 | For rows with the same `data-newfilepath`, the `innerHTML` of `.gitFileActions` matches                                                       | -                               |

### Failure-source inventory (include-or-justify) — Feature 055-09 additions (S5)

| Failure source                                                                                                       | Covering case or reason for exclusion                                                                                    |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Shortcut that renders nothing for all rows (ignores the predicate result and never shows the history icon)           | TC-037, TC-039                                                                                                           |
| The decision made inside `fileTree` (the passed function is not called)                                              | TC-038                                                                                                                   |
| The predicate is lost in recursion (the function is not passed to child folders)                                     | TC-039, TC-040                                                                                                           |
| 0-icon decision for `D` rows (renders an empty `.gitFileActions` without `openFile`, or also drops the history icon) | TC-033, TC-036                                                                                                           |
| Reversed order (`highlightFileHistory` before `openFile`)                                                            | TC-031                                                                                                                   |
| Mismatch between list / tree                                                                                         | TC-041                                                                                                                   |
| Content of the four conditions, shape of the function `web/main.ts` passes                                           | excluded(responsibility of `web/fileMenu-test.md` S6 / `web/main-test/06-file-actions-01.md` S54)                        |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)                                                        | 0: TC-036, TC-040. 1: TC-033, TC-035. 4 mixed rows: TC-037. maximum / +/-1: excluded(no numeric threshold exists)        |
| External dependency x failure mode                                                                                   | excluded(HTML generation uses only the arguments and the constants of `t()` and `svgIcons`, with no external dependency) |
| Exception and error paths                                                                                            | excluded(a `false` predicate is expressed by not rendering, with no throw path)                                          |
| Invalid type or format                                                                                               | excluded(the types of `FileHistoryActionPredicate` / `GitFileChange` are covered by the TypeScript type check)           |

**Failure-category coverage (diversity floor)**:

- Validation: TC-035, TC-040
- Exception: excluded(no throw path, as in the table above)
- External: excluded(as in the table above)
- Boundary: TC-033, TC-036, TC-037
- Type: excluded(as in the table above)
- Normal: TC-031, TC-032, TC-034, TC-038, TC-039, TC-041

**Failure/normal ratio (smoke detector)**: 6 normal cases, 5 failure cases. This is a replacement section that maps the 6 cases of S2 to the signature with the predicate, and the table above lists the failure sources, which are limited to not rendering, deciding internally, recursion, `D` rows, order and view format differences. No cases are added or removed just to adjust the ratio.

## S6: Standard button structure and names for file and folder controls

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: `generateGitFileListHtml(gitFiles: GitFileChange[], canHighlightFileHistory: FileHistoryActionPredicate): string` / `generateGitFileTreeHtml(folder: GitFolder, gitFiles: GitFileChange[], canHighlightFileHistory: FileHistoryActionPredicate): string` (the signature is kept. `buildFileItemHtml()` places the diff `button` and the `.gitFileAction` `button` as siblings and makes folders `button`)
> Target Path: `web/fileTree.ts:5-13, 63-168` (constants such as `BINARY_FILE_TITLE` / `MENU_STOP_TAB_INDEX`, `buildFileItemHtml` / `buildFolderHtml` / `generateGitFileTreeHtml` / `generateGitFileListHtml`)
> Test File: `tests/web/fileTree.test.ts`

HTML structure perspectives for implementation plan R4.3 and Task 8. The classes, data attributes and history icon predicate delegation of S1 / S3 / S4 / S5 are kept, so they stay active and this section is additive (the classes and order of `.gitFileAction.openFile` / `.highlightFileHistory` are as in S5; the elements become `button`). Event wiring on the main side belongs to `web/main-test/13-keyboard-accessibility-02.md` S76. Names are `t("a11y.actionFor", <操作名>, <path>)` (`<操作名>` is the action name), checked with the real dictionary (en) set in `webviewMessages`.

| Case ID | Input / Precondition                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type)         | Expected Result                                                                                                                                                                                                                                                                                                                                                              | Notes                                                                   |
| ------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| TC-042  | list, `M` row (`src/file.ts`, +5 / -2), ALLOW                                       | Normal - diff button and action buttons are siblings                               | `li.gitFile` itself has no `tabindex`, and directly under it are the diff `button` (`type="button"`, name contains `src/file.ts`) and, inside `.gitFileActions`, `button.gitFileAction.openFile` and `button.gitFileAction.highlightFileHistory`. No `button` has a `button` descendant (no nesting), and `data-oldfilepath` / `data-newfilepath` / `data-type` stay on `li` | K38 / A8.1-6                                                            |
| TC-043  | list, `D` row, ALLOW                                                                | Boundary - D row has no open but has history                                       | There are the diff `button` and the `.highlightFileHistory` `button`, and `.openFile` is `null`                                                                                                                                                                                                                                                                              | K38. Keeps the S5 TC-033 structure                                      |
| TC-044  | list, `R` row (`old.ts` → `new.ts`)                                                 | Normal - rename keeps the paths                                                    | `data-oldfilepath` of `li` is `encodeURIComponent("old.ts")`, `data-newfilepath` is `encodeURIComponent("new.ts")`, the diff button name contains `new.ts`, and the `title` of `.gitFileRename` is the translation of `file.renamed`                                                                                                                                         | K38 / A8.3-1 (rename)                                                   |
| TC-045  | list, `M` row with `additions: null` / `deletions: null` (binary)                   | Validation - no diff possible disables the diff button and keeps the other actions | The diff `button` is `disabled` without the `gitDiffPossible` class, and the `title` of `li` is the binary text. The `.openFile` / `.highlightFileHistory` `button` are not `disabled`                                                                                                                                                                                       | K38 / A8.1-6                                                            |
| TC-046  | tree, `generateGitFileTree()` with `src/deep/a.ts` and `src/x.ts`, `deep` collapsed | Normal / Boundary - folder button and exclusion of collapsed children              | The folder is `button.gitFolder` (`type="button"`, name contains the folder path, `aria-expanded="false"`, `aria-controls` is the `id` of the child `ul`), the child `ul.gitFolderContents` has the `hidden` attribute, and the `button` inside it are not tab stops because of the `hidden` ancestor. An open folder has `aria-expanded="true"` and no `hidden`             | K38 / A8.1-6. "Remove children of collapsed folders from the Tab order" |
| TC-047  | Generate the same `M` / `D` input as list and tree                                  | Normal - same structure for both view formats                                      | For `li` with the same `data-newfilepath`, the count, order, `disabled` state and names of `button` match                                                                                                                                                                                                                                                                    | Extends S5 TC-041                                                       |
| TC-048  | `M` row with `newFilePath = 'a<b>&"x.ts'`                                           | Validation - names and paths are not interpreted as HTML                           | The diff button name (`aria-label`) and the display name match as strings, `li` contains 0 `b` elements, and `data-newfilepath` is the `encodeURIComponent` value                                                                                                                                                                                                            | R4.8 "Do not interpret subjects, ref names or paths as HTML"            |
| TC-049  | svg elements of TC-042                                                              | Validation - decorative icons are hidden from screen readers                       | svg inside `.gitFileIcon` / `.gitFileAction` has `aria-hidden="true"`, and each `button` name is its `aria-label` (matches `t("a11y.actionFor", t("context.openFile"), "src/file.ts")`)                                                                                                                                                                                      | R4.8                                                                    |
| TC-050  | `gitFiles = []` for list and tree                                                   | Boundary - empty                                                                   | Only a `ul.gitFolderContents` with 0 `button` is returned, without an exception                                                                                                                                                                                                                                                                                              | Keeps the S1 TC-006 structure                                           |

### Failure-source inventory (include-or-justify) — Feature 061-05 additions (S6)

| Failure source                                                 | Covering case or reason for exclusion                                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Nested buttons, li becomes a tab stop, missing data attributes | TC-042                                                                                                 |
| Structure of D rows, renames and binaries                      | TC-043 to TC-045                                                                                       |
| Folder state and tab stops of collapsed children               | TC-046                                                                                                 |
| Mismatch between list / tree                                   | TC-047                                                                                                 |
| HTML interpretation, decorations read aloud                    | TC-048, TC-049                                                                                         |
| Empty input                                                    | TC-050                                                                                                 |
| click / keydown wiring and requests                            | excluded(responsibility of `web/main-test/13-keyboard-accessibility-02.md` S76)                        |
| External dependency and exceptions                             | excluded(HTML generation uses only the arguments and `t()`, with no external dependency or throw path) |

### Task 12 test mapping (Feature 061-05) — S6

- Tests: `tests/web/fileTree.test.ts` describe `file and folder controls as standard buttons (S6)`. TC-042 to TC-050 each have an `it` with the same number (TC-045 has 2 `it`: the binary diff button, and a row without enabled buttons). `globalThis.webviewMessages` is set to the real dictionary (en) to check the `a11y.actionFor` names
- click / keydown wiring on the main side is `web/main-test/13-keyboard-accessibility-02.md` S76 TC-728 to TC-734
- Execution result (2026-10-07): 10 passed
