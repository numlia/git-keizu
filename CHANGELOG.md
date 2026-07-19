# Changelog

All notable changes to Git Keizu will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.8.2] - 2026-07-19

This release fixes 15 defects confirmed in a follow-up audit of the extension host and webview (1 high, 3 medium, 11 low), covering activation robustness, error reporting, keyboard handling, git output parsing, resource lifecycles, and webview state.

### Fixed

- **Setting `git.path` to an array no longer crashes the extension**: VS Code's `git.path` setting officially accepts a list of candidate paths, but Git Keizu treated it as a single string and failed during activation with a `TypeError`, leaving the extension entirely unusable. Candidates are now probed in order with `git --version` and the first working executable is used; if none works, the extension falls back to `git` on the PATH and shows the usual "Git not found" experience.
- **Worktree "Open in New Window" and "Reveal in File Manager" failures are now reported**: When these actions failed (e.g. the worktree path no longer exists), the error was silently discarded and nothing happened. An error dialog with the git output is now shown, in both English and Japanese.
- **Arrow keys are no longer hijacked while typing**: With a commit's details open, pressing ArrowUp/ArrowDown inside the search box, a dialog input, or a dropdown filter no longer switches to another commit behind the scenes — the caret moves within the input as expected. Arrow navigation on the graph itself and shortcuts like Ctrl/Cmd+F while typing are unaffected.
- **Empty or fully invalid `graphColours` falls back to the default palette**: Setting `git-keizu.graphColours` to `[]` or to only invalid values previously produced `undefined` stroke/fill colours and broke the graph rendering; the default 12 colours are now used instead. A mix of valid and invalid values still keeps just the valid ones.
- **Removing a workspace folder during startup no longer breaks the view**: A folder removed while the extension was still scanning for repositories caused an internal exception that left the repository list stale; folder watcher start/stop is now idempotent and the view updates correctly.
- **"Also delete branch" checkbox no longer garbles branch names**: In the Remove Worktree dialog, branch names containing `/` or `&` (e.g. `feature/login`) were double-escaped and displayed as `feature&#x2F;login`; they now render correctly.
- **Untracked files with special characters display and open correctly**: Untracked file names containing quotes, tabs, newlines, or backslashes appeared mangled (e.g. `"tab\tname.txt"`) in the uncommitted changes view and could not be opened; they are now read with NUL-separated output and shown verbatim.
- **Cherry Pick / Revert works on root commits**: Right-clicking the repository's first commit no longer shows an empty parent-selection dropdown that always failed — root commits now use the normal single-parent flow. Merge commits keep their parent selector.
- **Tab characters in file names no longer drop change counts**: A file name containing a tab caused the additions/deletions of every subsequent file in the commit details to be lost; the numstat parser now preserves the full path and a malformed record only affects its own file.
- **Rename Branch validates the new name**: Renaming a branch to a name starting with `-` (e.g. `-D`) is now rejected upfront with "Invalid ref name." — consistent with Create Branch and Add Tag — instead of surfacing a confusing git usage error.
- **Extension shutdown no longer leaks resources**: The diff document provider and the avatar manager are now disposed with the extension, so event subscriptions are released and the periodic avatar fetch timer can no longer keep running (or re-create itself via retries) after the extension is deactivated.
- **Stash search matches what is displayed**: Searching for `@{0}` now matches and highlights the stash row. Previously the search matched the full internal selector (`stash@{0}`), so searching `stash` counted hits without any visible highlight; the hidden `stash` prefix is no longer searchable.
- **"Open commit details on match" search toggle is remembered**: The toggle in the search bar no longer resets to off every time the tab is switched or the view is restored.
- **Repository paths containing `</script>` no longer break the view**: JSON embedded in the webview bootstrap script now escapes `<`, so such a path can no longer terminate the script element and leave the view blank (script execution was already blocked by the CSP nonce).

## [0.8.1] - 2026-07-14

### Fixed

- **Checkbox labels now clickable in multi-input dialogs**: In dialogs that combine a checkbox with other inputs (Merge, Delete Branch, Rename Branch, Create/Remove Worktree, Stash, and other `commitMenu` actions), clicking the checkbox's label text now toggles the checkbox — previously only the small 15x15px checkbox icon itself was clickable, since the label text was rendered as plain text instead of an associated `<label>` element.

## [0.8.0] - 2026-07-04

This release is a codebase-wide correctness and robustness pass: 32 defects found in a full audit of the extension host and webview were fixed (2 high, 13 medium, 17 low), covering security, Windows regressions, multibyte handling, avatar reliability, and graph rendering.

### Fixed

- **Commit details tree view no longer breaks on special characters in names**: File and folder names containing HTML metacharacters (e.g. `<img src=x>.txt`) are now escaped in the commit details tree view — previously they were inserted unescaped, corrupting the panel markup (script execution was already blocked by the CSP nonce, but markup injection was possible). The list view was already safe.
- **Open File now works for renamed files**: Opening a file from a commit that predates a rename no longer always fails with "file does not exist" — the rename-tracking lookup that resolves the current path never returned a result and is now fixed, so renames are followed correctly.
- **Author filter handles names with special characters**: Filtering by an author whose name contains regex metacharacters (e.g. `dependabot[bot]`) now matches literally instead of returning zero commits or, for names with an unbalanced `[`, blanking the entire graph.
- **Multibyte characters no longer corrupt on large git output**: Japanese (and other multibyte) commit messages, author names, and file contents are no longer replaced with `�` when git output spans an internal buffer boundary — output is now decoded as a whole rather than chunk by chunk.
- **Detached HEAD detected more reliably**: `(HEAD detached from …)` states, tag names containing `.`, `-`, or `/` (e.g. `v1.2.3`), and non-English git output no longer leak a placeholder string into the branch list that would blank the graph when selected.
- **Windows auto-refresh restored**: The graph again refreshes automatically after commits, checkouts, and other git operations on Windows — a path-separator regression caused the file watcher glob to silently match nothing, leaving manual Refresh as the only option.
- **Auto-refresh no longer stops permanently after an error**: An exception while handling a webview action (such as opening a folder or revealing a file) no longer leaves the file watcher muted for the life of the panel; concurrent actions are also reference-counted so one finishing early can no longer unmute another still in progress.
- **Repository selection preserved when opening from the SCM panel**: Pressing the Git Keizu SCM button for one repository while a Git Keizu tab for another is in the background now reliably switches to the intended repository instead of staying on the previous one.
- **Avatar fetches no longer hang or leak on stalled connections**: Avatar requests that stall now time out, settle, and retry correctly instead of hanging forever and leaking a socket.
- **Avatar fetches no longer loop forever on header-less rate limits**: GitHub `403` / GitLab `429` responses that omit rate-limit headers (secondary rate limits, IP blocks) are now treated as normal failures that fall back to Gravatar, instead of re-requesting the API every 10 seconds indefinitely.
- **Diffs refresh after committing outside the extension**: Opening a `HEAD` or uncommitted-changes diff after committing in a terminal now shows the current content instead of a stale cached diff.
- **Diffs work for paths and repositories with special characters**: File names containing `#`, and repository paths containing `&`, `=`, or `%` (e.g. `C:\work\R&D\repo`), no longer produce broken or errored diff tabs.
- **Merge lines render correctly for off-screen parents**: A merge commit whose second parent is outside the loaded window and that has two or more loaded children now correctly draws the line indicating the branch continues below, instead of appearing as a single-parent commit.
- **Author dropdown stays complete after a tab switch**: Switching away from and back to the Git Keizu tab while an author filter is active no longer collapses the Author dropdown to only the selected author — the full author list is preserved so other authors can still be added.
- **File-to-directory replacement commits no longer freeze the details panel**: A commit that removes a file `a` and adds a directory `a/` no longer crashes tree construction and leaves the commit details view stuck on the loading spinner; if the tree cannot be built an error dialog is shown instead.
- **Details panel no longer hangs on repositories with many git warnings**: Large volumes of git `stderr` output (e.g. from damaged `refs/`) no longer stall the git process and leave the view spinning indefinitely.
- **Empty error messages fixed**: Git failures with output that has no trailing newline no longer drop the final (often only) line, so error dialogs no longer appear blank.
- **Branch and tag names starting with `-` are rejected**: Creating a branch or tag with a name such as `--list` is now refused with an error instead of being silently interpreted as a git option and reported as a success that created nothing.
- **Uncommitted files with quotes, backslashes, or control characters open correctly**: Opening or diffing uncommitted files and 2-commit comparisons whose paths contain `"`, `\`, or control characters now works, matching the behaviour already correct in commit details.
- **Simultaneous setting changes all take effect**: Saving `settings.json` with multiple Git Keizu settings changed at once (e.g. status bar item and date type together) now applies all of them instead of only the first.
- **Avatars load on the first view**: The avatar storage is now ready before the view evaluates whether avatars are available, so enabling avatars no longer requires a panel reload to take effect.
- **No error when closing a tab during a pending refresh**: Closing the Git Keizu tab while a refresh was debouncing no longer throws a "Webview is disposed" error when the timer fires.
- **No stray git processes after the extension is disabled**: Pending debounce timers are cleared on shutdown, so no git commands run against disposed resources after the extension deactivates.
- **Avatars load for remotes with short origin URLs**: An origin URL without a repository segment (e.g. `https://github.com/owner`) no longer throws and blocks all avatars for that repository — it now falls back to Gravatar.
- **Path-traversal guard hardened on Windows**: The file-path safety check now rejects `..\` (backslash) traversal and only permits paths that genuinely resolve inside the repository, closing a defence-in-depth gap.
- **Relative dates no longer overflow their unit**: Timestamps near a unit boundary now show `1 hour ago` / `1 day ago` instead of `60 minutes ago` / `24 hours ago`.
- **Ref input dialogs validate on mouse paste and delete**: The branch/tag name dialogs now re-validate on `input` as well as `keyup`, so right-click paste enables the button for valid input and right-click delete disables submission for empty input.
- **Avatars update live for emails with special characters**: Commit rows for authors whose email contains `&`, `'`, and similar characters (e.g. `o'brien@example.com`) now update as soon as the avatar arrives instead of waiting for the next full redraw.
- **Branch actions work for names containing entity-like characters**: Branch names such as `fix-&-bug` are no longer double-unescaped, so context-menu actions and double-click checkout send the correct name to git instead of a corrupted one.
- **Commit details reload after a tab restore**: If the details panel was mid-load when the webview state was saved, restoring the tab now re-requests the commit details instead of leaving the panel stuck on the loading spinner.

### Changed

- **Minimum Git version documented (Git 2.32+)**: A "Requirements" section in the README and the marketplace description now state that Git 2.32 or later is required, because viewing the contents of a stash entry uses `git stash show -u`, whose `-u` option was added in Git 2.32. No fallback for older Git versions is provided.

## [0.7.9] - 2026-05-28

### Fixed

- **Avatar remote source cache now works correctly**: The cache that maps repositories to their remote host (GitHub or GitLab) was not read correctly for cached non-string values, causing every avatar lookup to re-query the data source even when the result was already stored. The check is now correct, eliminating redundant data source calls.
- **Avatar fetches no longer fail silently on malformed provider responses**: When the GitHub or GitLab avatar API returns HTTP 200 with a body that cannot be parsed as JSON, the extension now falls back to Gravatar instead of letting the fetch pipeline fail silently. This makes avatar fetching resilient to transient or unexpected API responses.

## [0.7.8] - 2026-05-22

### Fixed

- **Refresh and filter changes are no longer silently dropped during a load**: Clicking Refresh, changing the branch filter or author filter, reordering commits, or triggering Load More while a `loadBranches` or `loadCommits` request was still in-flight would previously discard the action with no visible feedback. These requests are now queued and automatically re-sent once the current response arrives — the `hard` flag is OR-merged so no reload signal is lost, and all completion callbacks (including the one that re-enables auto Load More) are preserved and run on the queued response.
- **Dialog inputs with HTML characters no longer corrupt the form layout**: Labels, text defaults, placeholders, and select option names and values in form dialogs are now HTML-escaped before rendering, preventing commit messages or branch names containing `<`, `>`, `"`, `'`, or `&` from breaking the dialog appearance.

## [0.7.7] - 2026-05-17

### Added

- **RGBA colour support in `graphColours`**: The `git-keizu.graphColours` setting now accepts `rgba(r, g, b, a)` values with an explicit alpha channel (e.g. `rgba(0, 133, 217, 0.5)`), in addition to the existing `#RRGGBB`, `#RRGGBBAA`, and `rgb(r, g, b)` formats — useful for tuning graph line opacity without resorting to 8-digit hex. The setting description now reads "Colour (HEX, RGB or RGBA)".

### Fixed

- **Commit load counts no longer break with `0` or negative values**: `git-keizu.initialLoadCommits` and `git-keizu.loadMoreCommits` now declare a minimum of `1` in the setting schema and are clamped at runtime, so misconfigured values (`0`, negative numbers, or non-finite values) no longer cause an empty initial page or trigger an effectively unbounded `git log` read.
- **`rgba(r, g, b)` without alpha no longer slips through**: The 3-argument `rgba(...)` form (with no alpha) was previously accepted by the colour validator even though CSS requires an alpha component; the validator now requires alpha for `rgba(...)` and rejects the malformed form.
- **Japanese translation for "Create Branch from Commit" dialog**: The branch-name prompt shown when creating a branch from a commit's context menu is now fully translated in Japanese UI mode — previously the dialog text appeared in English because the `from commit {0}` i18n key was missing from the Japanese dictionary.

### Changed

- **Extension marketplace description shortened**: The VS Code Marketplace and Open VSX description has been trimmed further, dropping the "for VS Code" segment so the headline reads cleanly at narrow widths.

## [0.7.6] - 2026-05-10

### Changed

- **`showRecentActions` setting applies without restart**: Changing `git-keizu.menu.showRecentActions` in VS Code settings now takes effect in the currently open Git Keizu graph immediately — no window reload or restart required. The graph state (selected repository, branch, scroll position, commit details, and find widget) is fully preserved; only the context menu's Recent section visibility updates on the next context menu open.

## [0.7.5] - 2026-05-09

### Changed

- **Delete Branch and Delete Remote Branch now tracked in Recent actions**: Right-clicking a local branch and choosing "Delete Branch..." or a remote branch and choosing "Delete Remote Branch..." now records the action in the "Recent" section of the context menu — making frequently used delete operations one click away the next time. The action is recorded only after the confirmation dialog is accepted, so cancelling never pollutes the Recent list.

## [0.7.4] - 2026-05-07

### Changed

- **Extension marketplace description shortened**: The VS Code Marketplace and Open VSX description has been trimmed to a concise single line, making the extension easier to scan in search results.

## [0.7.3] - 2026-05-05

### Fixed

- **Context menu row height aligned with VS Code native menus**: Context menu items (including submenu entries) were taller than standard VS Code menus due to symmetric vertical padding. Item height is now set via `line-height: 28px` with no top/bottom padding, matching the compact, consistent look of VS Code's own context menus.

## [0.7.2] - 2026-05-04

### Changed

- **Reset to Commit now tracked in Recent actions**: "Reset current branch to this Commit" now appears in the Recent section of the commit context menu after it is used — making it one click away the next time you need to reset to the same commit. Previously, Reset was intentionally excluded from recent action tracking; it is now included alongside the other tracked commit actions.
- **Extension metadata updated for Japanese UI discoverability**: The VS Code Marketplace and Open VSX description now mentions Japanese UI support; `japanese` and `日本語` keywords have been added so Japanese-speaking developers can find the extension more easily.

## [0.7.1] - 2026-05-04

### Fixed

- **Japanese localization not applied in installed extension**: The packaged `.vsix` for v0.7.0 was missing every localization asset — `package.nls.json`, `package.nls.ja.json`, and the `l10n/` bundle directory — because the `.vscodeignore` whitelist did not include them, leaving the installed extension in English even when VS Code's display language was set to Japanese. The whitelist now explicitly includes `l10n/` and the manifest NLS files, so the i18n bundles ship with the extension as intended. Debug runs from the source tree were unaffected (the extension host loads files directly from disk), which is why the regression slipped past pre-release verification.

## [0.7.0] - 2026-05-04

### Added

- **Japanese UI localization (i18n)**: When VS Code's display language is set to Japanese, the entire Git Keizu interface — commands, configuration descriptions, toolbar labels, context menus, dialogs, error messages, and date/time display — automatically switches to Japanese. The manifest layer uses VS Code's standard `%key%` NLS mechanism (`package.nls.json` / `package.nls.ja.json`); webview translations are delivered via a dictionary-injection system with a `t()` helper that falls back to English for any unsupported locale. Relative dates adapt to Japanese conventions (e.g. `5分前` instead of `5 minutes ago`); absolute dates use ISO-style format (`2026-05-03 12:34`). Git operation terms follow standard katakana conventions (チェリーピック, リベース, リセット, etc.). The underlying i18n infrastructure (`src/i18n.ts`, `web/i18n.ts`, `l10n/` dictionary files) is designed to support additional locales through dictionary additions alone, without code changes.

## [0.6.0] - 2026-05-03

### Added

- **Recent actions in context menus**: Commit, branch, and file context menus now show a "Recent" section at the top listing the actions you have performed most recently in that repository — your most common operations are always one click away. The recent list is maintained per repository, deduplicates entries automatically, and is capped at 5 items. Only safe, frequently-used actions are tracked; destructive or low-frequency operations (Reset, Revert, Delete Branch, Rename Branch, and similar) are intentionally excluded. The section only appears when the current menu contains at least two trackable actions. Disable via `git-keizu.menu.showRecentActions` (default: on).

## [0.5.23] - 2026-05-02

### Changed

- **File watcher scoped to `.git` state files**: The background watcher that detects repository changes now monitors only the files that actually reflect Git state — `HEAD`, `index`, `config`, `packed-refs`, and `refs/*` — instead of watching every file in the repository. This eliminates spurious graph refreshes triggered by build artifacts, test outputs, and other working-tree changes, noticeably reducing visual noise in large repositories. Linked worktrees are also handled correctly: both the worktree's own `.git` directory and the shared common git directory are watched, so commits or branch changes in any linked worktree are still reflected in the graph immediately.

## [0.5.22] - 2026-04-30

### Changed

- **Context menus reorganized with "More…" submenu**: Commit, branch, and stash context menus have been restructured so the most-used actions appear at the top — Create Branch, Create Worktree Here, Cherry Pick, and Merge for commits; Checkout, Merge, Pull, and Push for branches; Apply Stash and Pop Stash for stashes. Less-used and destructive actions (Add Tag, Rename Branch, Delete Branch, Revert, Reset, Drop Stash, Create Branch from Stash, and Delete Remote Branch) are now grouped under a "More…" submenu that expands on hover. Dividers are placed only between groups of different roles; leading, trailing, and consecutive dividers have been removed throughout

## [0.5.21] - 2026-04-25

### Added

- **Open worktree in new window**: Right-clicking a worktree branch now shows "Open in New Window" — opens the worktree folder as a new VS Code window, so you can jump straight into it without any terminal commands
- **Reveal worktree in file manager**: Right-clicking a worktree branch now shows "Reveal in File Manager" — opens the OS file manager at the worktree path for quick file access without leaving VS Code

## [0.5.20] - 2026-04-10

### Fixed

- **Root commit file list now shows correctly**: Clicking the initial (root) commit in the graph now displays the files changed in that commit — previously the file list was always empty for root commits because an empty parent hash field (`%P`) was parsed as `[""]` instead of `[]`, causing `hasParents` to be incorrectly `true` and triggering the wrong diff command path

## [0.5.19] - 2026-04-07

### Fixed

- **Push works for new and renamed branches**: The Push action on the current branch now uses `git push --set-upstream origin HEAD`, so it succeeds even for newly created branches or branches that have just been renamed — previously, pushing without a configured upstream would fail with "fatal: The current branch … has no upstream branch"
- **Rename Branch updates upstream tracking automatically**: The Rename Branch dialog now includes an "Update upstream tracking" checkbox (on by default); when checked, renaming updates the git tracking config so the branch correctly follows the new remote name — for branches that have never been pushed, the remote is also configured so the next Push works without any extra steps

## [0.5.18] - 2026-04-06

### Added

- **Right-click context menu for commit detail files**: Right-clicking any file row in the commit details panel now opens a context menu with an "Open File" option — works in both Tree View and List View, and also appears for deleted files (opening a deleted file follows the existing error path). The existing left-click diff and hover "Open File" icon continue to work as before.

### Fixed

- **Push Tag dialog closes after success**: The "Pushing Tag…" loading dialog now dismisses automatically once the push completes — previously it would remain open indefinitely even after the tag had been successfully pushed.

## [0.5.17] - 2026-04-04

### Added

- **Open File from commit details**: Each file entry in the commit details panel now shows an "Open File" icon on hover (icon is hidden for deleted files); clicking it opens the current working-tree copy of that file in VS Code in preview mode. If the file has since been renamed, Git Keizu automatically resolves the new path via git rename tracking and opens it — if the file cannot be found or opened, an error dialog explains what went wrong.
- **Configurable editor group for Open File**: A new `git-keizu.openNewTabEditorGroup` setting lets you choose which editor group the opened file lands in — `Active` (default, same group as the current editor), `Beside` (opens to the side), or any numbered group `One` through `Nine`.

## [0.5.16] - 2026-04-04

### Changed

- **Commit details load noticeably faster**: A loading indicator appears immediately when you click a commit for instant visual feedback; the git commands that power the diff panel now run in parallel rather than sequentially, reducing perceived latency especially on large repositories or slower machines

## [0.5.15] - 2026-04-03

### Fixed

- **Merge commit file list now shows correct files**: Clicking a merge commit in the graph now shows only the files actually changed by that merge — previously, files changed in other parent diffs could appear alongside the real changes, producing an inflated or inaccurate file count; root commits continue to use `git diff-tree --root` while commits with parents now use `git diff <hash>^ <hash>`

## [0.5.14] - 2026-03-28

### Fixed

- **Worktree default path normalizes slash-containing branch names**: Branch names such as `feature/x` now produce `../repo-feature-x` as the default worktree path instead of the unintended `../repo-feature/x` (which would silently create a nested directory structure); the normalization covers `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`, and space in addition to `/` — consecutive unsafe characters collapse into a single `-`. Applies to both the "Create Worktree..." dialog (from branch context menu) and the "Create Worktree Here..." dialog (from commit context menu, where the path auto-updates as you type the branch name)

## [0.5.13] - 2026-03-25

### Fixed

- **Create Worktree "Open Terminal" default now consistent from both entry points**: When opening "Create Worktree Here..." from a commit's context menu, the "Open Terminal" checkbox now correctly reads its initial state from `git-keizu.dialog.createWorktree.openTerminal` — previously this entry point always showed the checkbox as checked regardless of the setting, while the branch label entry point already honored it correctly

## [0.5.12] - 2026-03-21

### Fixed

- **Config fallback values aligned with setting schema**: The `loadMoreCommits` fallback (used when VS Code cannot read the setting schema) has been corrected from 75 to 100, matching the documented default; the `graphColours` fallback palette has been expanded from 6 to 12 colours to match the full palette defined in the setting schema

## [0.5.11] - 2026-03-20

### Changed

- **CSS variable prefix**: Graph colour custom properties have been renamed from `--git-graph-color*` to `--git-keizu-color*` to align with the extension's branding; if you have custom CSS referencing `--git-graph-color-N`, update it to `--git-keizu-color-N` — no backward-compatible fallback is provided
- **Error screen wording**: The "unable to load repository" screen now reads "Unable to load Git Keizu" instead of "Unable to load Git Graph"

## [0.5.10] - 2026-03-18

### Added

- **Configurable "Open Terminal" default for Create Worktree**: The "Open Terminal" checkbox in the Create Worktree dialog now reads its initial state from `git-keizu.dialog.createWorktree.openTerminal` (default: on); set it to off if you prefer not to open a terminal after each worktree creation
- **Remove Worktree with branch co-deletion**: The Remove Worktree confirmation has been upgraded to a form dialog with an "Also delete branch" checkbox — when checked, the worktree's branch is deleted via `git branch -d` (safe delete) after the worktree is removed; unmerged branches are not affected. The checkbox default is configurable via `git-keizu.dialog.removeWorktree.deleteBranch` (default: on)

## [0.5.9] - 2026-03-15

### Fixed

- **2-commit comparison — consistent file diff direction**: File diffs in 2-commit comparison mode now always show changes from old to new, regardless of which commit was selected first. Previously, selecting a newer commit first and then Ctrl/Cmd+clicking an older one would display the diff in reverse chronological order

## [0.5.8] - 2026-03-14

### Fixed

- **Branch filter — remote-tracking branches excluded**: Remote-tracking branches (`origin/*`) no longer appear in the branch filter dropdown; only local branches are listed
- **Graph labels — `origin/HEAD` hidden**: The `origin/HEAD` symbolic ref (and any `*/HEAD` remote tracking pointer) is no longer shown as a label on commits in the graph

## [0.5.7] - 2026-03-13

### Changed

- **Icons**: All webview icons have been migrated from custom inline SVGs to VS Code's official [codicons](https://microsoft.github.io/vscode-codicons/) icon font — toolbar buttons (search, fetch, current, refresh), branch/stash/tag labels, commit detail panels, dialogs, and file tree entries now use native VS Code icons for consistent styling and proper theme adaptation

## [0.5.6] - 2026-03-13

### Added

- **Worktree support**: Git worktrees are now first-class in the graph — branches with an associated linked worktree show a dedicated worktree icon; hovering the label displays the worktree path in a tooltip
- **Create Worktree from branch**: Right-click any local branch without a worktree to create one — enter a path (default: `../repo-branchname`) with an "Open Terminal" checkbox to launch a VS Code terminal in the new worktree after creation
- **Create Worktree from commit**: Right-click any commit and choose "Create Worktree Here..." to create a new branch + worktree at that commit; the path field auto-fills as you type the branch name
- **Worktree actions on branch labels**: Right-click a branch with a linked worktree to open a terminal at its path, copy the path to clipboard, or remove the worktree (with confirmation; not available for the main worktree)

## [0.5.5] - 2026-03-10

### Added

- **Configurable commit display order**: Choose how commits are sorted in the graph — by committer date (default), topologically (same-branch commits appear consecutively), or by author date. Set the global default via `git-keizu.repository.commits.order` in VS Code settings; override per repository by right-clicking the table header and picking a sort order from the context menu. The per-repository choice is persisted and takes priority over the global setting
- **Screenshots in README**: The extension README now includes annotated screenshots showing the graph view, commit actions, branch filter, and 2-commit comparison

### Changed

- **Marketplace metadata**: Extension description rewritten to better convey the core value proposition; keywords expanded for improved discoverability in VS Code Marketplace and Open VSX

## [0.5.4] - 2026-03-10

### Fixed

- **Stash commit details — file list explosion with "Include Untracked"**: Stash entries created with "Include Untracked" no longer show an inflated list of unrelated files in the commit details panel; the diff now correctly reflects only the files actually changed in that stash

## [0.5.3] - 2026-03-09

### Added

- **Merge dialog: Squash Commits and No Commit options**: Merge operations (from both branch and commit context menus) now show three checkboxes — "Create a new commit even if fast-forward is possible" (on by default), "Squash Commits" (squashes all incoming commits into one), and "No Commit" (stages the merge result without auto-committing); when Squash is checked, No Fast Forward is automatically suppressed as required by Git. Tooltip icons on Squash and No Commit explain what each option does
- **Cherry-pick dialog: Record Origin and No Commit options**: Cherry-pick now shows a form dialog with two checkboxes — "Record Origin" (`-x`, appends a `(cherry picked from ...)` line to the commit message) and "No Commit" (stages the changes without auto-committing); merge-commit cherry-picks continue to show the parent selector alongside the new options. Both checkboxes include tooltip explanations
- **Configurable dialog defaults**: Six new settings under `git-keizu.dialog.*` let you set the initial checkbox state for Merge, Cherry-pick, and Stash dialogs — your preferred options are pre-selected each time a dialog opens (`git-keizu.dialog.merge.noFastForward` / `squashCommits` / `noCommit`, `git-keizu.dialog.cherryPick.recordOrigin` / `noCommit`, `git-keizu.dialog.stashUncommittedChanges.includeUntracked`)
- **Stash dialog default for Include Untracked**: The "Include Untracked" checkbox in the Stash Uncommitted Changes dialog now reads its initial state from `git-keizu.dialog.stashUncommittedChanges.includeUntracked` (default: off) instead of always starting unchecked

## [0.5.2] - 2026-03-08

### Added

- **Arrow key commit navigation**: With a commit's detail panel open, navigate between commits using Arrow keys — no modifier for table order (one row at a time), Ctrl/Cmd for branch-tracking (parent or child on the same branch), and Ctrl/Cmd+Shift to jump to an alternative branch (the merge source on a merge commit, or the alternate child at a branch point). Navigation is disabled in commit comparison mode; key events are consumed to prevent the graph from scrolling while navigating

## [0.5.1] - 2026-03-07

### Added

- **Scroll position restore on tab switch**: When you switch away from the Git Keizu tab and return, the graph now scrolls back to where you left off. The position is saved as part of the webview state whenever a user action triggers a state save (e.g. clicking a commit, expanding details, toggling a filter). Note: passively scrolling the list without performing any action does not trigger a save — if you scroll and immediately switch tabs, the position will revert to the last saved state. Backward-compatible with older saved states (defaults to top).

## [0.5.0] - 2026-03-07

### Added

- **Checkout on branch create**: The Create Branch dialog now includes a "Check out" checkbox (checked by default) — when checked, Git Keizu automatically checks out the new branch immediately after creating it; uncheck to create the branch without switching away from the current branch
- **Multi-select Branch filter**: The Branch dropdown now supports selecting multiple branches simultaneously; each item has a checkbox, "Show All" is the default state, and deselecting all individual branches automatically returns to "Show All"
- **Multi-select Author filter**: The Author dropdown now supports selecting multiple authors simultaneously; each item has a checkbox, "Show All" is the default state, and deselecting all individual authors automatically returns to "Show All"

## [0.2.12] - 2026-03-05

### Fixed

- **Author filter completeness**: The Author dropdown now lists all authors reachable from HEAD (via `git shortlog`) rather than only those in the currently visible commits — authors on older commits beyond the loaded page are no longer missing
- **Author filter excludes "Uncommitted Changes" entry**: The pseudo-commit for uncommitted changes (author `*`) is no longer included in the Author dropdown options

## [0.2.11] - 2026-03-05

### Changed

- **Marketplace metadata**: Extension categories updated from `"Other"` to `["SCM Providers", "Visualization"]` for better discoverability; keywords refreshed to more accurately represent the extension's functionality (`action`/`visualise` replaced with `branch`/`commit`/`history`/`visualize`)
- **Setting descriptions**: Remaining "Git Graph" references in setting descriptions replaced with "Git Keizu"
- **Activation events**: Removed redundant `onCommand:*` activation events — VS Code 1.74+ activates command contributions automatically without explicit declaration

## [0.2.10] - 2026-03-05

### Fixed

- **Muted commit branch label visibility**: Branch, remote, and tag labels on muted commits now render at full opacity; previously the mute opacity was applied to the entire commit row cell, causing reference labels to also appear faded
- **Muted commit column coverage**: The date, author, and commit hash columns now correctly dim when a commit is muted, matching the original behavior; previously only the commit message column was affected

## [0.2.9] - 2026-03-04

### Added

- **Mute merge commits**: Merge commits are displayed with muted text (50% opacity) by default, making non-merge commits easier to scan in a busy history. Can be disabled via `git-keizu.repository.commits.mute.mergeCommits` (default: true)
- **Mute non-ancestor commits**: A new opt-in setting `git-keizu.repository.commits.mute.commitsThatAreNotAncestorsOfHead` (default: false) dims commits that are not ancestors of the currently checked-out branch or commit

### Fixed

- **Graph line merging**: Merge commits whose second parent falls outside the loaded commit window now correctly draw the converging branch line instead of rendering as a single straight line
- **Commit color boundary**: The boundary between committed and uncommitted changes in the graph is now computed correctly in all cases

## [0.2.8] - 2026-03-01

### Fixed

- **2-commit comparison state persistence**: Switching away from the Git Keizu tab and returning while in compare mode no longer reverts to single-commit details — comparison state is now preserved across tab switches
- **2-commit comparison summary format**: The compare mode header now reads "Displaying all changes from [older commit] to [newer commit]." with commits shown in chronological order, instead of "Comparing X ↔ Y (N files)"

## [0.2.7] - 2026-03-01

### Fixed

- **Delete remote branch refresh timing**: When deleting a local branch with "Delete this branch on the remote" checked, the graph now refreshes after all remote branches are deleted instead of before, preventing the UI from briefly showing remote branches as still present after deletion

## [0.2.6] - 2026-03-01

### Added

- **Author filter**: New "Author" dropdown in the toolbar — select a commit author to show only their commits in the graph; choose "All Authors" to clear the filter. Author options are built from the currently loaded commits and passed as `--author` to `git log`
- **File view toggle**: A toggle icon button in the commit details panel switches between Tree View (folder hierarchy, default) and List View (flat alphabetical list of full paths); the chosen mode is saved per repository and restored across sessions
- **Delete Remote Branch**: Right-clicking a remote branch label now shows "Delete Remote Branch..." — a confirmation dialog runs `git push <remote> --delete <branch>` on confirmation
- **Merge remote branch**: Right-clicking a remote branch label now shows "Merge into current branch..." with the same confirmation dialog as for local branches
- **Rebase current branch**: Right-clicking any non-HEAD local branch now shows "Rebase current branch on Branch..." — confirms before running `git rebase <branch>`
- **Delete local + remote together**: When deleting a local branch that has a remote tracking counterpart, the Delete Branch dialog now includes a "Delete this branch on the remote" checkbox; when checked, the remote branch is also deleted after the local deletion succeeds (unchecked by default; only shown when a remote tracking branch exists)
- **Committer email in commit details**: The Committer field in the commit details panel now shows `Name <email>` format, matching the Author field
- **Clickable parent hashes**: Parent commit hashes in the commit details panel are now clickable — clicking one scrolls to and opens that commit's details panel

### Changed

- **Commit details field order**: Fields are now ordered Commit → Parents → Author → Committer → Date (previously ...Author → Date → Committer), aligning with the original layout
- **Custom checkboxes**: Native OS checkboxes in dialogs and the "Show Remote Branches" control are replaced with theme-aware styled checkboxes
- **Graph column auto-layout**: The auto-layout graph column is now capped at 40% of the viewport width to prevent the graph from dominating wide screens; column width adjusts smoothly when the panel is resized
- **Scroll to expanded commit**: Opening commit details now accounts for the sticky header height, so the selected commit row is never hidden behind the controls bar

## [0.2.4] - 2026-02-28

### Added

- **SCM panel button**: A "View Git Keizu" button now appears in the VS Code Source Control panel title bar; clicking it opens the graph and automatically selects the repository associated with the SCM provider. The button position can be set to Inline (title bar) or More Actions (`...` menu) via `git-keizu.sourceCodeProviderIntegrationLocation`
- **Keyboard shortcuts**: Four configurable shortcuts are now available — Find (Ctrl/Cmd+F), Refresh (Ctrl/Cmd+R), Scroll to HEAD (Ctrl/Cmd+H), and Scroll to Stash (Ctrl/Cmd+S); Shift+Stash shortcut moves to the previous stash. Each key can be rebound to any Ctrl/Cmd+letter combination or disabled via `git-keizu.keyboardShortcut.*` settings
- **Escape key staged dismissal**: Pressing Escape closes UI components one at a time in priority order — context menu → dialog → dropdown → find widget → commit details panel — so a single keypress always leaves you at the right state
- **Auto load more commits**: Additional commits load automatically when scrolling near the bottom of the commit list; can be disabled via the `git-keizu.loadMoreCommitsAutomatically` setting (default: enabled)
- **Dropdown overflow handling**: Branch and repository dropdowns are capped at 30% of the viewport width (multi-repo) or 40% (single-repo); names that exceed the width are truncated with an ellipsis and shown in full on hover

## [0.2.3] - 2026-02-26

### Changed

- **Smooth refresh after Git operations**: Branch deletions, fetches, pushes, merges, tags, resets, cherry-picks, and other Git actions now use a soft refresh — the commit table stays visible while new data loads in the background, eliminating the screen flash on every operation and preserving scroll position
- **Commit details panel height**: The panel height is now calculated dynamically from the available viewport space instead of being fixed at 250px; the height adjusts automatically when the VS Code panel is resized
- **Commit details scroll behavior**: When opening a commit's detail panel, the view only scrolls if the panel would extend outside the visible area, keeping your reading position stable; when scrolling is needed, only the minimum displacement to bring the panel into view is applied

### Removed

- **`git-keizu.autoCenterCommitDetailsView` setting**: Removed — the new scroll behavior (scroll only when the panel extends outside the viewport) replaces the old auto-center option

## [0.2.2] - 2026-02-25

### Added

- **Pull/Push for current branch**: Right-click the currently checked-out branch to run `git pull` or `git push`; git's output (success or error) is shown in an info/error dialog
- **Enter key confirmation**: Input dialogs (checkout branch, rename branch, etc.) now confirm on Enter key press

### Changed

- **Fetch uses `--prune`**: The Fetch button now always runs `git fetch --prune`, automatically removing stale remote-tracking references; the button tooltip reflects this
- **Icon redesign**: Extension icon (`icon.png`) and webview icons updated with a cleaner SVG graph layout

### Fixed

- **Context menu clipping**: Context menu now uses the full webview area as its bounding box, preventing items from being hidden behind the controls bar or cut off at screen edges
- **Stash label border color**: Stash label borders now correctly use the graph line color instead of always rendering grey
- **Remote branch checkout — branch name proposal**: Checking out `origin/feature/ebook` now correctly proposes `feature/ebook` as the local name instead of only the last path segment (`ebook`)
- **Remote branch checkout — existing local branch**: Checking out a remote branch when a same-named local branch already exists no longer fails with `fatal: a branch named '...' already exists`
- **Stash dialog auto-focus**: The Message field in the Stash dialog now receives focus automatically when the dialog opens
- **Find widget auto-focus**: The search text box in the Find widget now receives focus automatically when opened

## [0.2.1] - 2026-02-25

### Added

- **Stash support**: Stash entries are now displayed in the commit graph with a double-circle (ring) vertex style to distinguish them from regular commits
- **Stash context menu**: Right-click a stash entry to Apply, Pop, Drop, Create Branch from Stash, or copy the stash name/hash to clipboard
- **Uncommitted Changes context menu**: Right-click the Uncommitted Changes row to stash changes, reset (Mixed/Hard), or clean untracked files
- **Fetch button**: New toolbar button to run `git fetch --all` without a dialog
- **FindWidget**: Commit search bar (Ctrl/Cmd+F) with regex mode, case-sensitive mode, match counter (N of M), prev/next navigation, and state persistence across sessions
- **2-point commit comparison**: Ctrl/Cmd+click a second commit to compare it with the selected commit; click again to dismiss
- **Sticky header**: Menu bar and column headers remain fixed at the top while the commit list scrolls
- **Comprehensive test suite**: 211 tests across 8 test files covering stash operations, FindWidget, graph rendering, message handling, and commit comparison

### Changed

- Refactored `web/main.ts` into dedicated modules: `commitMenu.ts`, `refMenu.ts`, `stashMenu.ts`, `uncommittedMenu.ts`, and `messageHandler.ts`

## [0.2.0] - 2026-02-22

### Added

- Remote tracking information displayed in branch labels
- Vitest testing infrastructure with initial test coverage
- CI/CD publish workflow for VS Marketplace and Open VSX

### Changed

- Renamed extension from neo-git-graph to **Git Keizu**
- Migrated build system to esbuild with ES2020 target
- Refactored `web/main.ts` into submodules (dates, fileTree, contextMenu, dialogs, branchLabels)
- Migrated all `fs` callbacks to `async/await` using `node:fs/promises`
- Migrated all `Promise.then` chains to `async/await`

### Fixed

- XSS vulnerability and regex bug in webview
- Migrated all `cp.exec` calls to `cp.spawn` to prevent command injection
- Additional input validation and security hardening across backend

## [0.1.0] - 2026-02-18

Initial release as Git Keizu — forked from [neo-git-graph](https://github.com/asispts/neo-git-graph) (originally [Git Graph](https://github.com/mhutchie/vscode-git-graph) by mhutchie, MIT).

[Unreleased]: https://github.com/numlia/git-keizu/compare/v0.8.2...HEAD
[0.8.2]: https://github.com/numlia/git-keizu/compare/v0.8.1...v0.8.2
[0.8.1]: https://github.com/numlia/git-keizu/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/numlia/git-keizu/compare/v0.7.9...v0.8.0
[0.7.9]: https://github.com/numlia/git-keizu/compare/v0.7.8...v0.7.9
[0.7.8]: https://github.com/numlia/git-keizu/compare/v0.7.7...v0.7.8
[0.7.7]: https://github.com/numlia/git-keizu/compare/v0.7.6...v0.7.7
[0.7.6]: https://github.com/numlia/git-keizu/compare/v0.7.5...v0.7.6
[0.7.5]: https://github.com/numlia/git-keizu/compare/v0.7.4...v0.7.5
[0.7.4]: https://github.com/numlia/git-keizu/compare/v0.7.3...v0.7.4
[0.7.3]: https://github.com/numlia/git-keizu/compare/v0.7.2...v0.7.3
[0.7.2]: https://github.com/numlia/git-keizu/compare/v0.7.1...v0.7.2
[0.7.1]: https://github.com/numlia/git-keizu/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/numlia/git-keizu/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/numlia/git-keizu/compare/v0.5.23...v0.6.0
[0.5.23]: https://github.com/numlia/git-keizu/compare/v0.5.22...v0.5.23
[0.5.22]: https://github.com/numlia/git-keizu/compare/v0.5.21...v0.5.22
[0.5.21]: https://github.com/numlia/git-keizu/compare/v0.5.20...v0.5.21
[0.5.20]: https://github.com/numlia/git-keizu/compare/v0.5.19...v0.5.20
[0.5.19]: https://github.com/numlia/git-keizu/compare/v0.5.18...v0.5.19
[0.5.18]: https://github.com/numlia/git-keizu/compare/v0.5.17...v0.5.18
[0.5.17]: https://github.com/numlia/git-keizu/compare/v0.5.16...v0.5.17
[0.5.16]: https://github.com/numlia/git-keizu/compare/v0.5.15...v0.5.16
[0.5.15]: https://github.com/numlia/git-keizu/compare/v0.5.14...v0.5.15
[0.5.14]: https://github.com/numlia/git-keizu/compare/v0.5.13...v0.5.14
[0.5.13]: https://github.com/numlia/git-keizu/compare/v0.5.12...v0.5.13
[0.5.12]: https://github.com/numlia/git-keizu/compare/v0.5.11...v0.5.12
[0.5.11]: https://github.com/numlia/git-keizu/compare/v0.5.10...v0.5.11
[0.5.10]: https://github.com/numlia/git-keizu/compare/v0.5.9...v0.5.10
[0.5.9]: https://github.com/numlia/git-keizu/compare/v0.5.8...v0.5.9
[0.5.8]: https://github.com/numlia/git-keizu/compare/v0.5.7...v0.5.8
[0.5.7]: https://github.com/numlia/git-keizu/compare/v0.5.6...v0.5.7
[0.5.6]: https://github.com/numlia/git-keizu/compare/v0.5.5...v0.5.6
[0.5.5]: https://github.com/numlia/git-keizu/compare/v0.5.4...v0.5.5
[0.5.4]: https://github.com/numlia/git-keizu/compare/v0.5.3...v0.5.4
[0.5.3]: https://github.com/numlia/git-keizu/compare/v0.5.2...v0.5.3
[0.5.2]: https://github.com/numlia/git-keizu/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/numlia/git-keizu/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/numlia/git-keizu/compare/v0.2.12...v0.5.0
[0.2.12]: https://github.com/numlia/git-keizu/compare/v0.2.11...v0.2.12
[0.2.11]: https://github.com/numlia/git-keizu/compare/v0.2.10...v0.2.11
[0.2.10]: https://github.com/numlia/git-keizu/compare/v0.2.9...v0.2.10
[0.2.9]: https://github.com/numlia/git-keizu/compare/v0.2.8...v0.2.9
[0.2.8]: https://github.com/numlia/git-keizu/compare/v0.2.7...v0.2.8
[0.2.7]: https://github.com/numlia/git-keizu/compare/v0.2.6...v0.2.7
[0.2.6]: https://github.com/numlia/git-keizu/compare/v0.2.5...v0.2.6
[0.2.4]: https://github.com/numlia/git-keizu/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/numlia/git-keizu/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/numlia/git-keizu/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/numlia/git-keizu/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/numlia/git-keizu/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/numlia/git-keizu/releases/tag/v0.1.0
