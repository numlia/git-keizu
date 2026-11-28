import * as path from "node:path";
import { setImmediate as yieldToHost } from "node:timers/promises";

import * as vscode from "vscode";

import { emptyDiffDocAt } from "./diffDocProvider";

const UTF8 = "utf8";
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const UTF16_LE_BOM = Buffer.from([0xff, 0xfe]);
const UTF16_BE_BOM = Buffer.from([0xfe, 0xff]);
const BINARY_PROBE_BYTES = 512;
const GUESS_SAMPLE_BYTES = 64 * 1024;
const DECODE_CHUNK_BYTES = 256 * 1024;
const FIRST_STABLE_ENCODING_MINOR = 100;
const FIRST_CANDIDATE_FALLBACK_MINOR = 140;
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

function editorAtLeast(minorVersion: number): boolean {
  const [major, minor] = vscode.version.split(".").map(Number);
  return major > 1 || (major === 1 && minor >= minorVersion);
}

// Use the editor's codecs when the whole-buffer API is unavailable or would block the host.
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

type EditorCodec = {
  decode(input: Buffer, encoding: string): string;
  encode(text: string, encoding: string): Uint8Array;
  getDecoder(encoding: string): { write(input: Buffer): string; end(): string | undefined };
  encodingExists(encoding: string): boolean;
};

function codecName(detectorName: string): string {
  const id = detectorName.toLowerCase().replace(/[-_]/g, "");
  return id === "big5" ? "cp950" : id === "ibm866" ? "cp866" : id;
}

function uniqueCandidate(sample: Buffer, candidates: string[]): string | undefined {
  try {
    // The sample can end partway through a valid UTF-8 character.
    new TextDecoder("utf-8", { fatal: true }).decode(sample, { stream: true });
    return undefined;
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
  }
  const codec = editorModule<EditorCodec>("@vscode/iconv-lite-umd");
  let match: string | undefined;
  for (const id of new Set(candidates.map(codecName))) {
    if (id.startsWith("utf")) continue;
    const encoded = codec.encode(codec.decode(sample, id), id);
    if (!sample.equals(encoded)) continue;
    if (match) return undefined;
    match = id;
  }
  return match;
}

function sourceEncoding(bytes: Buffer, files: vscode.WorkspaceConfiguration): string {
  const configured = files.get<string>("encoding", UTF8);
  if (!files.get("autoGuessEncoding", false)) return configured;
  const detector = editorModule<{
    detect(sample: string, options?: { detectEncodings: string[] }): { encoding: string | null };
  }>("jschardet/dist/jschardet.min.js");
  const sample = bytes.subarray(0, GUESS_SAMPLE_BYTES);
  const candidates = files
    .get<string[]>("candidateGuessEncodings", [])
    .flatMap((id) => detectorNames.get(id) ?? []);
  let guess: string | undefined;
  try {
    guess = detector
      .detect(
        sample.toString("latin1"),
        candidates.length ? { detectEncodings: candidates } : undefined
      )
      .encoding?.toLowerCase();
  } catch (error) {
    // Some encodings offered in VS Code settings have no detector in its bundled jschardet.
    if (
      error instanceof Error &&
      candidates.some((name) => error.message.startsWith(`Encoding ${name} is not supported.`))
    )
      return configured;
    throw error;
  }
  if (!guess && candidates.length && editorAtLeast(FIRST_CANDIDATE_FALLBACK_MINOR)) {
    return uniqueCandidate(sample, candidates) ?? configured;
  }
  if (!guess || ["ascii", "utf-16", "utf-32"].includes(guess)) return configured;
  return codecName(guess);
}

async function decodeInChunks(bytes: Buffer, encoding: string): Promise<Buffer> {
  if (encoding === UTF8 || encoding === "utf8bom") return Buffer.concat([UTF8_BOM, bytes]);
  const codec = editorModule<EditorCodec>("@vscode/iconv-lite-umd");
  const decoder = codec.getDecoder(codec.encodingExists(encoding) ? encoding : UTF8);
  const chunks = [UTF8_BOM];
  let highSurrogate = "";
  for (let start = 0; start < bytes.length; start += DECODE_CHUNK_BYTES) {
    if (start > 0) await yieldToHost();
    const decoded = decoder.write(bytes.subarray(start, start + DECODE_CHUNK_BYTES));
    const text = `${highSurrogate}${decoded}`;
    // A UTF-16 decoder can return the two halves of a character in separate chunks.
    highSurrogate = text.match(/[\uD800-\uDBFF]$/u)?.[0] ?? "";
    chunks.push(Buffer.from(text.slice(0, text.length - highSurrogate.length), "utf8"));
  }
  chunks.push(Buffer.from(`${highSurrogate}${decoder.end() ?? ""}`, "utf8"));
  return Buffer.concat(chunks);
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
  // Some older releases expose the proposed decode function but reject calls from extensions.
  const decode = editorAtLeast(FIRST_STABLE_ENCODING_MINOR) ? workspace.decode : undefined;
  const selected = decode
    ? (document as (vscode.TextDocument & { encoding?: string }) | undefined)?.encoding
    : undefined;
  if (
    usesDefaultDecoding(virtual) &&
    (!source || (selected ? selected === UTF8 : usesDefaultDecoding(files)))
  )
    return undefined;

  if (decode && bytes.length <= DECODE_CHUNK_BYTES) {
    const options = source && !selected ? { uri: source } : { encoding: selected ?? UTF8 };
    const text = await decode(bytes, options);
    if (text === (await decode(bytes, { uri: snapshot }))) return undefined;
    // A BOM makes the display text unambiguous under the virtual resource's own settings.
    return Buffer.from(`\uFEFF${text}`, "utf8");
  }

  if (selected || !source) return decodeInChunks(bytes, selected ?? UTF8);
  const folder = workspace.getWorkspaceFolder(source);
  const settingsDir = folder && vscode.Uri.joinPath(folder.uri, ".vscode");
  if (
    (settingsDir && source.path.startsWith(`${settingsDir.path}/`)) ||
    source.path.endsWith(".code-workspace")
  )
    return decodeInChunks(bytes, UTF8);

  const languageId =
    document?.languageId ??
    (hasLanguageOverrides(files)
      ? (await workspace.openTextDocument(emptyDiffDocAt(source))).languageId
      : undefined);
  const scoped = languageId
    ? workspace.getConfiguration("files", { uri: source, languageId })
    : files;
  return decodeInChunks(bytes, sourceEncoding(bytes, scoped));
}
