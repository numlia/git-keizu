# Project Structure

## Organization Philosophy

**Two-runtime separation**: The codebase is split into two fully isolated TypeScript projects (`src/` and `web/`) with separate tsconfig files, build targets, and runtime environments. They share type definitions but no executable code.

## Directory Patterns

### Extension Backend (`src/`)

**Location**: `src/`
**Purpose**: Node.js code running in VS Code's extension host. Handles Git operations, state, and webview management.
**Entry**: `src/extension.ts` → bundled to `out/extension.js`
**Pattern**: One class per file, each class owns a single responsibility:

- `DataSource` — Git CLI wrapper (spawn-based)
- `GitGraphView` — Webview panel lifecycle and message routing
- `RepoManager` — Repository auto-discovery and watching
- `AvatarManager` — Avatar fetching and caching
- `ExtensionState` — State persistence (column widths, last repo, cache)
- `Config` — Typed settings wrapper

### Webview Frontend (`web/`)

**Location**: `web/`
**Purpose**: Browser code running in VS Code's Chromium webview. Renders UI and handles user interactions.
**Entry**: `web/main.ts` → bundled to `out/web.min.js`
**Pattern**: Main class (`GitGraphView`) in `main.ts`, extracted modules for distinct UI concerns:

- `graph.ts` — SVG graph rendering engine
- `dropdown.ts` — Reusable dropdown component
- `dialogs.ts` — Confirmation/form/error dialogs
- `fileTree.ts` — Nested file tree from commit changes
- `contextMenu.ts` — Right-click context menu
- `branchLabels.ts` — Branch/tag label rendering
- `dates.ts` — Date formatting
- `utils.ts` — Shared utilities (escapeHtml, sendMessage, SVG icons)

### Tests (`tests/`)

**Location**: `tests/`
**Purpose**: Vitest unit tests, mirroring the two-runtime structure.
**Pattern**: `tests/src/` for backend tests, `tests/web/` for webview tests. Test files named `*.test.ts`.

- `tests/web/setup.ts` — Mocks `acquireVsCodeApi()` for webview test environment

### Static Resources (`resources/`, `media/`)

**Location**: `resources/`, `media/`
**Purpose**: Static assets used by the extension and webview.

- `resources/` — Extension icon, webview HTML templates
- `media/` — CSS stylesheets for the webview

### Build Output (`out/`)

**Location**: `out/`
**Purpose**: esbuild output (git-ignored). Contains bundled `extension.js` and `web.min.js`.

### Reference / Notes (`notes/`)

**Location**: `notes/`
**Purpose**: Historical reference. Contains the original vscode-git-graph and neo-git-graph sources for comparison. Not part of the build.

## Naming Conventions

- **Files**: camelCase (`dataSource.ts`, `gitGraphView.ts`, `branchLabels.ts`)
- **Classes**: PascalCase (`DataSource`, `GitGraphView`, `AvatarManager`)
- **Interfaces**: PascalCase with descriptive prefixes (`GitCommitNode`, `RequestAddTag`, `ResponseLoadCommits`)
- **Type aliases**: PascalCase (`DateFormat`, `GraphStyle`, `GitResetMode`)
- **Message commands**: camelCase string literals (`"loadCommits"`, `"checkoutBranch"`)
- **Settings keys**: kebab-case under `git-keizu.*` namespace (`git-keizu.graphStyle`)

## Import Organization

```typescript
// External modules first (sorted by simple-import-sort)
import * as vscode from "vscode";

// Internal modules (sorted alphabetically)
import { AvatarManager } from "./avatarManager";
import { DataSource } from "./dataSource";
import { GitGraphView } from "./gitGraphView";
```

- **No path aliases**: All imports use relative paths (`./`, `../`)
- **Import sorting**: Enforced by `simple-import-sort/imports` (oxlint, auto-fixable)
- **No cross-runtime imports**: `src/` and `web/` never import from each other

## Code Organization Principles

- **Single responsibility**: Each file owns one class or one cohesive set of utilities
- **Message-driven architecture**: All communication between runtimes flows through the typed `RequestMessage`/`ResponseMessage` protocol
- **No shared executable code**: `src/types.ts` defines shared interfaces only; no functions cross the runtime boundary
- **Security at the boundary**: Input validation happens in `dataSource.ts` (commit hash, paths, reset mode) and `gitGraphView.ts` (repo validation); `web/utils.ts` handles XSS escaping
- **State isolation**: Extension state (`ExtensionState`) persists to disk; webview state (`viewState`) is initialized from the extension on panel creation

---

_Document patterns, not file trees. New files following patterns shouldn't require updates_
