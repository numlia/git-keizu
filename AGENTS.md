# AGENTS.md

output-language: en

## Architecture

`src/` runs in the Node.js extension host and `web/` in the browser webview. They communicate via the typed `RequestMessage` / `ResponseMessage` protocol in `src/types.ts`: `web/utils.ts` posts requests, `src/gitGraphView.ts` routes them to `DataSource`, and responses return to the webview. See [`docs/development/directory-structure.md`](docs/development/directory-structure.md) for file-level details.

## Code conventions

- **String concatenation**: Use template literals everywhere (no `+` for strings)
- **Async**: All async code uses `async/await` (no `.then()` chains, no callbacks for fs)
- **Git commands**: Always use `spawn()` via `runGitCommandSpawn`/`spawnGit` in `dataSource.ts` (never `exec` — shell injection prevention)

## Testing

- Test supplement (project-specific rules): [`docs/test-supplement.md`](docs/test-supplement.md)
- Test perspective documents under `docs/testing/perspectives/` are written in English, like the rest of the repository. Older sections still in Japanese stay as they are unless you rewrite that section.

## Settings namespace

All user-facing settings are under `git-keizu.*` (defined in `package.json` contributes.configuration). The `src/config.ts` wrapper reads these via `vscode.workspace.getConfiguration('git-keizu')`.
