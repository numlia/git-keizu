import * as fs from "node:fs/promises";
import * as path from "node:path";

import * as vscode from "vscode";

import type { DataSource } from "./dataSource";
import { UNCOMMITTED_CHANGES_HASH } from "./types";

const FS_REGEX = /\\/g;

export function abbrevCommit(commitHash: string) {
  return commitHash.substring(0, 8);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await vscode.env.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function getPathFromUri(uri: vscode.Uri) {
  return uri.fsPath.replace(FS_REGEX, "/");
}

export function getPathFromStr(str: string) {
  return str.replace(FS_REGEX, "/");
}

// Evaluate promises in parallel, with at most maxParallel running at any time
export async function evalPromises<X, Y>(
  data: X[],
  maxParallel: number,
  createPromise: (val: X) => Promise<Y>
): Promise<Y[]> {
  if (data.length === 0) return [];

  const results: Y[] = Array.from({ length: data.length });
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < data.length) {
      const i = nextIndex++;
      results[i] = await createPromise(data[i]);
    }
  }

  const workers = Array.from({ length: Math.min(maxParallel, data.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function doesFileExist(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const PATH_TRAVERSAL_ERROR = "The file path is invalid.";

export async function openFile(
  repo: string,
  filePath: string,
  commitHash: string,
  dataSource: DataSource,
  viewColumn: vscode.ViewColumn
): Promise<string | null> {
  if (filePath.split("/").includes("..")) {
    return PATH_TRAVERSAL_ERROR;
  }

  const resolvedPath = path.resolve(repo, filePath);
  if (!resolvedPath.startsWith(repo)) {
    return PATH_TRAVERSAL_ERROR;
  }

  if (await doesFileExist(resolvedPath)) {
    try {
      await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(resolvedPath), {
        preview: true,
        viewColumn
      });
      return null;
    } catch {
      return `Visual Studio Code was unable to open ${filePath}.`;
    }
  }

  if (commitHash !== UNCOMMITTED_CHANGES_HASH) {
    const newPath = await dataSource.getNewPathOfRenamedFile(repo, commitHash, filePath);
    if (newPath !== null) {
      const resolvedNewPath = path.resolve(repo, newPath);
      if (!resolvedNewPath.startsWith(repo)) {
        return PATH_TRAVERSAL_ERROR;
      }
      if (await doesFileExist(resolvedNewPath)) {
        try {
          await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(resolvedNewPath), {
            preview: true,
            viewColumn
          });
          return null;
        } catch {
          return `Visual Studio Code was unable to open ${filePath}.`;
        }
      }
    }
  }

  return `The file ${filePath} doesn't currently exist in this repository.`;
}
