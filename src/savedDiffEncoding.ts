import * as path from "node:path";

import * as vscode from "vscode";

const UTF8 = "utf8";
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const UTF16_LE_BOM = Buffer.from([0xff, 0xfe]);
const UTF16_BE_BOM = Buffer.from([0xfe, 0xff]);
const BINARY_PROBE_BYTES = 512;
const GUESS_SAMPLE_BYTES = 64 * 1024;
const GUESSABLE_NAMES = [
  "UTF-8",
  "UTF-16LE",
  "UTF-16BE",
  "windows-1252",
  "windows-1250",
  "ISO-8859-2",
  "windows-1251",
  "ISO-8859-5",
  "KOI8-R",
  "windows-1253",
  "ISO-8859-7",
  "windows-1255",
  "ISO-8859-8",
  "SHIFT_JIS",
  "EUC-JP",
  "EUC-KR",
  "GB2312"
];
const detectorNames = new Map(
  GUESSABLE_NAMES.map((name) => [name.toLowerCase().replace(/[-_]/g, ""), name])
);
detectorNames.set("cp950", "Big5");
detectorNames.set("cp866", "IBM866");
detectorNames.set("cp1125", "IBM1125");

type DecodeOptions = { uri: vscode.Uri } | { encoding: string };
type EncodingWorkspace = typeof vscode.workspace & {
  decode?(bytes: Uint8Array, options: DecodeOptions): Thenable<string>;
};

// VS Code versions before 1.100 ship these codecs but have no public workspace.decode API.
function editorModule<T>(relativePath: string): T {
  const modules = path.join(vscode.env.appRoot, "node_modules");
  const candidates = [path.join(modules, relativePath), path.join(`${modules}.asar`, relativePath)];
  const filename = candidates.find((candidate) => {
    try {
      require.resolve(candidate);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "MODULE_NOT_FOUND") throw error;
      return false;
    }
  });
  if (!filename) throw new Error(`The editor's text decoder is unavailable: ${relativePath}`);
  return require(filename) as T;
}

function decodeLegacy(bytes: Buffer, files: vscode.WorkspaceConfiguration): string {
  const codec = editorModule<{
    decode(input: Buffer, encoding: string): string;
    encodingExists(encoding: string): boolean;
  }>("@vscode/iconv-lite-umd");
  let encoding = files.get<string>("encoding", UTF8);
  if (files.get("autoGuessEncoding", false)) {
    const detector = editorModule<{
      detect(sample: string, options?: { detectEncodings: string[] }): { encoding: string | null };
    }>("jschardet/dist/jschardet.min.js");
    const candidates = files
      .get<string[]>("candidateGuessEncodings", [])
      .flatMap((id) => detectorNames.get(id) ?? []);
    const guess = detector
      .detect(
        bytes.subarray(0, GUESS_SAMPLE_BYTES).toString("latin1"),
        candidates.length ? { detectEncodings: candidates } : undefined
      )
      .encoding?.toLowerCase();
    if (guess && !["ascii", "utf-16", "utf-32"].includes(guess)) {
      encoding = guess === "big5" ? "cp950" : guess === "ibm866" ? "cp866" : guess;
    }
  }
  return codec.decode(bytes, codec.encodingExists(encoding) ? encoding : UTF8);
}

function hasLanguageOverrides(files: vscode.WorkspaceConfiguration): boolean {
  return ["encoding", "autoGuessEncoding", "candidateGuessEncodings"].some(
    (key) => files.inspect(key)?.languageIds?.length
  );
}

function usesDefaultDecoding(files: vscode.WorkspaceConfiguration): boolean {
  return (
    files.get("encoding", UTF8) === UTF8 &&
    !files.get("autoGuessEncoding", false) &&
    !hasLanguageOverrides(files)
  );
}

export async function savedDiffDisplayBytes(
  bytes: Buffer,
  source: vscode.Uri | undefined,
  snapshot: vscode.Uri
): Promise<Buffer | undefined> {
  // Both resources already get the same BOM, UTF-16 or binary detection from the editor.
  if (
    !bytes.length ||
    [UTF8_BOM, UTF16_LE_BOM, UTF16_BE_BOM].some((bom) =>
      bytes.subarray(0, bom.length).equals(bom)
    ) ||
    bytes.subarray(0, BINARY_PROBE_BYTES).includes(0)
  )
    return undefined;

  const workspace: EncodingWorkspace = vscode.workspace;
  const document =
    source && workspace.textDocuments.find((doc) => doc.uri.toString() === source.toString());
  const files = workspace.getConfiguration("files", document ?? source);
  const virtual = workspace.getConfiguration("files", snapshot);
  const selected = (document as (vscode.TextDocument & { encoding?: string }) | undefined)
    ?.encoding;
  if (
    usesDefaultDecoding(virtual) &&
    (!source || (selected ? selected === UTF8 : usesDefaultDecoding(files)))
  )
    return undefined;

  let text: string;
  if (workspace.decode) {
    const options = source && !selected ? { uri: source } : { encoding: selected ?? UTF8 };
    text = await workspace.decode(bytes, options);
    if (text === (await workspace.decode(bytes, { uri: snapshot }))) return undefined;
  } else {
    const folder = source && workspace.getWorkspaceFolder(source);
    const settingsDir = folder && vscode.Uri.joinPath(folder.uri, ".vscode");
    if (
      !source ||
      (settingsDir && source.path.startsWith(`${settingsDir.path}/`)) ||
      source.path.endsWith(".code-workspace")
    ) {
      text = bytes.toString("utf8");
    } else {
      const languageId =
        document?.languageId ??
        (hasLanguageOverrides(files)
          ? (await workspace.openTextDocument(snapshot)).languageId
          : undefined);
      text = decodeLegacy(
        bytes,
        languageId ? workspace.getConfiguration("files", { uri: source, languageId }) : files
      );
    }
  }
  // The display resource has its own settings. A BOM makes its text unambiguous there as well.
  return Buffer.from(`\uFEFF${text}`, "utf8");
}
