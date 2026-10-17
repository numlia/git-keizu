/**
 * Suggested paths for new worktrees.
 *
 * The template language matches Better Worktrees
 * (https://github.com/shivanshthapliyal/vscode-better-worktrees, MIT,
 * Shivansh Thapliyal): `${repoPath}`, `${repoName}`, and `${branch}`; a
 * leading `~`; relative templates resolved against the repository; unknown
 * placeholders left as written; a blank template falling back to the default.
 * The resolved path is only a starting point. The create dialog shows it and
 * the user can edit it before anything is written.
 *
 * Path joining follows the host platform the same way Node's `path` module
 * does. The webview has no Node `path`, so the rules live here.
 */

export const DEFAULT_WORKTREE_PATH_TEMPLATE = `${"$"}{repoPath}/../${"$"}{repoName}-${"$"}{branch}`;

export type WorktreePathPlatform = "posix" | "win32";

export interface WorktreePathVars {
  repoPath: string;
  branch: string;
  homeDir: string;
  /** Host path style. Inferred from the paths when omitted. */
  platform?: WorktreePathPlatform;
  /**
   * Process working directory. Windows consults this when a template names a
   * drive without a root, the same way Node's `path.win32.resolve` does.
   */
  cwd?: string;
  /** Drive prefixes such as `D:` mapped to that drive's working directory. */
  driveCwd?: Readonly<Record<string, string>>;
}

/**
 * Turns a branch name into a single path segment. Branches are namespaced with
 * slashes far more often than not, and using one verbatim would spread a
 * worktree across nested directories where `feat/api` and `feat/api/v2` cannot
 * both exist. Characters that are awkward or illegal in a path go the same way.
 */
export function sanitizeBranchForPath(branch: string): string {
  // Same class Better Worktrees strips so a branch stays one directory, including
  // ASCII control characters, which are not legal in a directory name.
  const controlCharacters = `${String.fromCharCode(0)}-${String.fromCharCode(31)}`;
  const replaced = branch.replace(new RegExp(`[/\\\\:*?"<>|\\s${controlCharacters}]+`, "g"), "-");
  const collapsed = replaced.replace(/-+/g, "-").replace(/_+/g, "_").replace(/\.+/g, ".");
  const trimmed = collapsed.replace(/^[-._]+/, "").replace(/[-._]+$/, "");
  return trimmed || "worktree";
}

/**
 * Expands a path template to an absolute path. Relative templates resolve
 * against the repository rather than the process working directory.
 */
export function resolveWorktreePath(template: string, vars: WorktreePathVars): string {
  const pathApi = vars.platform === "win32" || inferWin32(vars) ? win32 : posix;
  const context: Win32ResolveContext = { cwd: vars.cwd, driveCwd: vars.driveCwd };
  const effective = template.trim() || DEFAULT_WORKTREE_PATH_TEMPLATE;
  const repoPath = pathApi.resolve([vars.repoPath], context);

  const values = new Map<string, string>([
    ["repoPath", repoPath],
    ["repoName", pathApi.basename(repoPath)],
    ["branch", sanitizeBranchForPath(vars.branch)]
  ]);

  // An unrecognised placeholder is left as written: silently expanding it to
  // nothing would produce a plausible-looking path pointing somewhere else.
  // A Map keeps names that live on Object.prototype, such as constructor, written out.
  const expanded = effective.replace(
    /\$\{(\w+)\}/g,
    (match, key: string) => values.get(key) ?? match
  );

  return pathApi.resolve([repoPath, expandHome(expanded, vars.homeDir, pathApi)], context);
}

function inferWin32(vars: WorktreePathVars): boolean {
  if (vars.platform === "posix") {
    return false;
  }
  return looksLikeWin32(vars.repoPath) || looksLikeWin32(vars.homeDir);
}

function looksLikeWin32(target: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(target) || target.startsWith("\\\\");
}

interface Win32ResolveContext {
  cwd?: string;
  driveCwd?: Readonly<Record<string, string>>;
}

interface PathApi {
  resolve(paths: readonly string[], context?: Win32ResolveContext): string;
  join(...paths: string[]): string;
  basename(target: string): string;
}

function expandHome(target: string, homeDir: string, pathApi: PathApi): string {
  if (target === "~") {
    return homeDir;
  }
  if (target.startsWith("~/") || target.startsWith("~\\")) {
    return pathApi.join(homeDir, target.slice(2));
  }
  return target;
}

const CHAR_UPPERCASE_A = 65;
const CHAR_LOWERCASE_A = 97;
const CHAR_UPPERCASE_Z = 90;
const CHAR_LOWERCASE_Z = 122;
const CHAR_DOT = 46;
const CHAR_FORWARD_SLASH = 47;
const CHAR_BACKWARD_SLASH = 92;
const CHAR_COLON = 58;

function isWindowsDeviceRoot(code: number): boolean {
  return (
    (code >= CHAR_UPPERCASE_A && code <= CHAR_UPPERCASE_Z) ||
    (code >= CHAR_LOWERCASE_A && code <= CHAR_LOWERCASE_Z)
  );
}

/** Reads Windows per-drive working directories (`=C:`, `=D:`, ...) from an environment. */
export function windowsDriveDirectories(
  env: Readonly<Record<string, string | undefined>>
): Record<string, string> {
  const drives: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (
      key.length === 3 &&
      key.charCodeAt(0) === 61 &&
      key.charCodeAt(2) === CHAR_COLON &&
      isWindowsDeviceRoot(key.charCodeAt(1)) &&
      value
    ) {
      drives[key.slice(1)] = value;
    }
  }
  return drives;
}

function normalizeString(
  path: string,
  allowAboveRoot: boolean,
  separator: string,
  isSeparator: (code: number) => boolean
): string {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let code = 0;
  for (let i = 0; i <= path.length; ++i) {
    if (i < path.length) {
      code = path.charCodeAt(i);
    } else if (isSeparator(code)) {
      break;
    } else {
      code = CHAR_FORWARD_SLASH;
    }

    if (isSeparator(code)) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (dots === 2) {
        if (
          res.length < 2 ||
          lastSegmentLength !== 2 ||
          res.charCodeAt(res.length - 1) !== CHAR_DOT ||
          res.charCodeAt(res.length - 2) !== CHAR_DOT
        ) {
          if (res.length > 2) {
            const lastSlashIndex = res.length - lastSegmentLength - 1;
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
            }
            lastSlash = i;
            dots = 0;
            continue;
          } else if (res.length !== 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? `${separator}..` : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `${separator}${path.slice(lastSlash + 1, i)}`;
        } else {
          res = path.slice(lastSlash + 1, i);
        }
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === CHAR_DOT && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

function isPosixSeparator(code: number): boolean {
  return code === CHAR_FORWARD_SLASH;
}

function isWin32Separator(code: number): boolean {
  return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
}

const posix: PathApi = {
  resolve(paths: readonly string[]): string {
    let resolvedPath = "";
    let resolvedAbsolute = false;

    for (let i = paths.length - 1; i >= 0 && !resolvedAbsolute; i--) {
      const path = paths[i];
      if (path.length === 0) {
        continue;
      }
      resolvedPath = `${path}/${resolvedPath}`;
      resolvedAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    }

    resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute, "/", isPosixSeparator);
    if (resolvedAbsolute) {
      return `/${resolvedPath}`;
    }
    return resolvedPath.length > 0 ? resolvedPath : ".";
  },

  join(...paths: string[]): string {
    const parts = paths.filter((path) => path.length > 0);
    if (parts.length === 0) {
      return ".";
    }
    return normalizePosix(parts.join("/"));
  },

  basename(target: string): string {
    let start = 0;
    let end = -1;
    let matchedSlash = true;
    for (let i = target.length - 1; i >= 0; --i) {
      if (target.charCodeAt(i) === CHAR_FORWARD_SLASH) {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
    }
    if (end === -1) {
      return "";
    }
    return target.slice(start, end);
  }
};

function normalizePosix(path: string): string {
  if (path.length === 0) {
    return ".";
  }
  const isAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
  const trailingSeparator = path.charCodeAt(path.length - 1) === CHAR_FORWARD_SLASH;
  let normalized = normalizeString(path, !isAbsolute, "/", isPosixSeparator);
  if (normalized.length === 0) {
    if (isAbsolute) {
      return "/";
    }
    return trailingSeparator ? "./" : ".";
  }
  if (trailingSeparator) {
    normalized += "/";
  }
  return isAbsolute ? `/${normalized}` : normalized;
}

function driveDirectory(device: string, context: Win32ResolveContext): string {
  const fromDrive = lookupDriveCwd(context.driveCwd, device);
  const candidate = fromDrive || context.cwd;
  // Same check as Node's path.win32.resolve: a cwd counts only when it is on
  // this drive, or when it is not itself a Windows path (so a forward-slash
  // root is joined onto the drive). Anything else falls back to the drive root.
  if (
    candidate === undefined ||
    (candidate.slice(0, 2).toLowerCase() !== device.toLowerCase() &&
      candidate.charCodeAt(2) === CHAR_BACKWARD_SLASH)
  ) {
    return `${device}\\`;
  }
  return candidate;
}

function lookupDriveCwd(
  drives: Readonly<Record<string, string>> | undefined,
  device: string
): string | undefined {
  if (drives === undefined) {
    return undefined;
  }
  const wanted = device.toLowerCase();
  for (const key of Object.keys(drives)) {
    if (key.toLowerCase() === wanted && drives[key]) {
      return drives[key];
    }
  }
  return undefined;
}

const win32: PathApi = {
  resolve(paths: readonly string[], context: Win32ResolveContext = {}): string {
    let resolvedDevice = "";
    let resolvedTail = "";
    let resolvedAbsolute = false;

    for (let i = paths.length - 1; i >= -1; i--) {
      let path: string;
      if (i >= 0) {
        path = paths[i];
        if (path.length === 0) {
          continue;
        }
      } else if (resolvedDevice.length === 0) {
        break;
      } else {
        path = driveDirectory(resolvedDevice, context);
      }

      const len = path.length;
      let rootEnd = 0;
      let device = "";
      let isAbsolute = false;
      const code = path.charCodeAt(0);

      if (len === 1) {
        if (isWin32Separator(code)) {
          rootEnd = 1;
          isAbsolute = true;
        }
      } else if (isWin32Separator(code)) {
        isAbsolute = true;
        if (isWin32Separator(path.charCodeAt(1))) {
          let j = 2;
          let last = j;
          while (j < len && !isWin32Separator(path.charCodeAt(j))) {
            j++;
          }
          if (j < len && j !== last) {
            const firstPart = path.slice(last, j);
            last = j;
            while (j < len && isWin32Separator(path.charCodeAt(j))) {
              j++;
            }
            if (j < len && j !== last) {
              last = j;
              while (j < len && !isWin32Separator(path.charCodeAt(j))) {
                j++;
              }
              if (j === len || j !== last) {
                if (firstPart !== "." && firstPart !== "?") {
                  device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                  rootEnd = j;
                } else {
                  device = `\\\\${firstPart}`;
                  rootEnd = 4;
                }
              }
            }
          }
        } else {
          rootEnd = 1;
        }
      } else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
        device = path.slice(0, 2);
        rootEnd = 2;
        if (len > 2 && isWin32Separator(path.charCodeAt(2))) {
          isAbsolute = true;
          rootEnd = 3;
        }
      }

      if (device.length > 0) {
        if (resolvedDevice.length > 0) {
          if (device.toLowerCase() !== resolvedDevice.toLowerCase()) {
            continue;
          }
        } else {
          resolvedDevice = device;
        }
      }

      if (resolvedAbsolute) {
        if (resolvedDevice.length > 0) {
          break;
        }
      } else {
        resolvedTail = `${path.slice(rootEnd)}\\${resolvedTail}`;
        resolvedAbsolute = isAbsolute;
        if (isAbsolute && resolvedDevice.length > 0) {
          break;
        }
      }
    }

    resolvedTail = normalizeString(resolvedTail, !resolvedAbsolute, "\\", isWin32Separator);
    if (resolvedAbsolute) {
      return `${resolvedDevice}\\${resolvedTail}`;
    }
    return `${resolvedDevice}${resolvedTail}` || ".";
  },

  join(...paths: string[]): string {
    const parts = paths.filter((path) => path.length > 0);
    if (parts.length === 0) {
      return ".";
    }
    let joined = parts.join("\\");
    const firstPart = parts[0];
    let needsReplace = true;
    let slashCount = 0;
    if (isWin32Separator(firstPart.charCodeAt(0))) {
      ++slashCount;
      if (firstPart.length > 1 && isWin32Separator(firstPart.charCodeAt(1))) {
        ++slashCount;
        if (firstPart.length > 2) {
          if (isWin32Separator(firstPart.charCodeAt(2))) {
            ++slashCount;
          } else {
            needsReplace = false;
          }
        }
      }
    }
    if (needsReplace) {
      while (slashCount < joined.length && isWin32Separator(joined.charCodeAt(slashCount))) {
        slashCount++;
      }
      if (slashCount >= 2) {
        joined = `\\${joined.slice(slashCount)}`;
      }
    }
    return normalizeWin32(joined);
  },

  basename(target: string): string {
    let start = 0;
    let end = -1;
    let matchedSlash = true;
    if (
      target.length >= 2 &&
      isWindowsDeviceRoot(target.charCodeAt(0)) &&
      target.charCodeAt(1) === CHAR_COLON
    ) {
      start = 2;
    }
    for (let i = target.length - 1; i >= start; --i) {
      if (isWin32Separator(target.charCodeAt(i))) {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
    }
    if (end === -1) {
      return "";
    }
    return target.slice(start, end);
  }
};

function normalizeWin32(path: string): string {
  if (path.length === 0) {
    return ".";
  }
  const len = path.length;
  if (len === 1) {
    return isPosixSeparator(path.charCodeAt(0)) ? "\\" : path;
  }

  let rootEnd = 0;
  let device: string | undefined;
  let isAbsolute = false;
  const code = path.charCodeAt(0);

  if (isWin32Separator(code)) {
    isAbsolute = true;
    if (isWin32Separator(path.charCodeAt(1))) {
      let j = 2;
      let last = j;
      while (j < len && !isWin32Separator(path.charCodeAt(j))) {
        j++;
      }
      if (j < len && j !== last) {
        const firstPart = path.slice(last, j);
        last = j;
        while (j < len && isWin32Separator(path.charCodeAt(j))) {
          j++;
        }
        if (j < len && j !== last) {
          last = j;
          while (j < len && !isWin32Separator(path.charCodeAt(j))) {
            j++;
          }
          if (j === len || j !== last) {
            if (firstPart === "." || firstPart === "?") {
              device = `\\\\${firstPart}`;
              rootEnd = 4;
            } else if (j === len) {
              return `\\\\${firstPart}\\${path.slice(last)}\\`;
            } else {
              device = `\\\\${firstPart}\\${path.slice(last, j)}`;
              rootEnd = j;
            }
          }
        }
      }
    } else {
      rootEnd = 1;
    }
  } else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
    device = path.slice(0, 2);
    rootEnd = 2;
    if (len > 2 && isWin32Separator(path.charCodeAt(2))) {
      isAbsolute = true;
      rootEnd = 3;
    }
  }

  let tail =
    rootEnd < len ? normalizeString(path.slice(rootEnd), !isAbsolute, "\\", isWin32Separator) : "";
  if (tail.length === 0 && !isAbsolute) {
    tail = ".";
  }
  if (tail.length > 0 && isWin32Separator(path.charCodeAt(len - 1))) {
    tail += "\\";
  }
  if (device === undefined) {
    return isAbsolute ? `\\${tail}` : tail;
  }
  return isAbsolute ? `${device}\\${tail}` : `${device}${tail}`;
}
