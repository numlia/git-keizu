#!/usr/bin/env bash
# Turns the captured frames into the README media under resources/screenshots:
# the two GIFs from their screencast frames, and the stills cropped from full-window shots.
# Crop geometry (width:height:x:y) assumes the 1280x800 window set in lib.mjs.
set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
readonly FRAMES_DIR="${KEIZU_CAPTURE_WORK_DIR:-${REPO_ROOT}/.tmp/readme-media}/frames"
readonly OUT_DIR="${REPO_ROOT}/resources/screenshots"
readonly GIF_FPS=20
readonly GIF_COLORS=128

# Webview area without the title bar, activity bar and status bar.
readonly CROP_VIEW="1228:708:52:62"
readonly CROP_VIEW_WITH_DETAILS="1228:620:52:62"
readonly CROP_BRANCH_CLEANUP="1228:324:52:62"
readonly CROP_COMMIT_MENU="860:460:52:100"
readonly CROP_WORKTREE_MENU="720:560:52:100"
readonly CROP_DIALOG="900:530:52:100"

render_gif() {
  local name="$1"
  ffmpeg -loglevel error -y -f concat -safe 0 -i "${FRAMES_DIR}/${name}/frames.txt" \
    -vf "fps=${GIF_FPS},split[a][b];[a]palettegen=max_colors=${GIF_COLORS}:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle" \
    "${OUT_DIR}/${name}.gif"
}

crop_still() {
  local name="$1" geometry="$2"
  ffmpeg -loglevel error -y -i "${FRAMES_DIR}/stills/${name}.png" -vf "crop=${geometry}" "${OUT_DIR}/${name}.png"
}

render_gif hero
render_gif file-history
crop_still graph-overview "${CROP_VIEW}"
crop_still path-highlight "${CROP_VIEW}"
crop_still commit-comparison "${CROP_VIEW_WITH_DETAILS}"
crop_still commit-actions "${CROP_COMMIT_MENU}"
crop_still worktree-menu "${CROP_WORKTREE_MENU}"
crop_still branch-delete-explained "${CROP_DIALOG}"
crop_still branch-cleanup "${CROP_BRANCH_CLEANUP}"
ls -la "${OUT_DIR}"
