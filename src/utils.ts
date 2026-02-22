import * as vscode from "vscode";

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

  const workers = Array.from(
    { length: Math.min(maxParallel, data.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}
