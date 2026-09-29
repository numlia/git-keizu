# README media capture

Scripts that recreate the GIFs and screenshots used in the project README (`resources/screenshots/`). They open a separate VS Code with the development build of Git Keizu on a generated demo repository, drive it with Playwright, and convert the recording with ffmpeg. Your own VS Code installation and settings are not touched.

## Requirements

- Linux with a display (WSLg works)
- A Linux build of VS Code, extracted anywhere (for example from `https://update.code.visualstudio.com/latest/linux-x64/stable`)
- Playwright for Node.js. It is not a project dependency; point the scripts at any installed copy
- ffmpeg

## Configuration

| Variable                   | Required | Description                                                                                                         |
| -------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `KEIZU_CAPTURE_VSCODE`     | Yes      | Path to the VS Code executable, e.g. `.../VSCode-linux-x64/code`                                                    |
| `KEIZU_CAPTURE_PLAYWRIGHT` | No       | Module path or name to import Playwright from, e.g. `.../node_modules/playwright/index.mjs` (default: `playwright`) |
| `KEIZU_CAPTURE_WORK_DIR`   | No       | Where the VS Code profile and captured frames go (default: `.tmp/readme-media`)                                     |

## Usage

Recreate everything in one go:

```bash
KEIZU_CAPTURE_VSCODE=/path/to/VSCode-linux-x64/code \
KEIZU_CAPTURE_PLAYWRIGHT=/path/to/node_modules/playwright/index.mjs \
bash scripts/readme-media/capture-all.sh ~/trailmap-demo
```

The demo root must not exist yet. Its path appears in the Worktree column of the Branch Cleanup screenshot, so choose a neutral location.

The steps can also be run one at a time:

| Script                            | Output                                                     | Note                                    |
| --------------------------------- | ---------------------------------------------------------- | --------------------------------------- |
| `make-demo-repo.sh <dir>`         | Demo repository `<dir>/trailmap` with worktrees next to it | Deterministic history and dates         |
| `capture-stills.mjs <repo>`       | Full-window stills in `<work-dir>/frames/stills`           | Creates a branch in the repository      |
| `capture-file-history.mjs <repo>` | Frames for `file-history.gif`                              |                                         |
| `capture-hero.mjs <repo>`         | Frames for `hero.gif`                                      | Creates a worktree in the repository    |
| `render.sh`                       | GIFs and cropped stills in `resources/screenshots`         | Crop geometry assumes a 1280x800 window |

## Notes

- Playwright input has no visible pointer, so the captures draw their own cursor, click ripples, and keycaps.
- Frames come from the Chrome DevTools screencast, so a GIF follows the real timing of the interaction.
- The development host title prefix is removed from the title bar so the captures look like a normal install.
- After changing the window size in `lib.mjs`, update the crop geometry in `render.sh`.
