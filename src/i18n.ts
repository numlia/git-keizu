import * as fs from "node:fs/promises";
import * as path from "node:path";

import * as vscode from "vscode";

export type GitKeizuLocale = "en" | "ja";

const FALLBACK_LOCALE: GitKeizuLocale = "en";

export function getLocale(): GitKeizuLocale {
  return vscode.env.language === "ja" || vscode.env.language.startsWith("ja-") ? "ja" : "en";
}

export function t(message: string, ...args: (string | number | boolean)[]): string {
  return vscode.l10n.t(message, ...args);
}

export async function loadWebviewMessages(extensionPath: string): Promise<Record<string, string>> {
  const locale = getLocale();
  const localeMessages = await readWebviewMessages(extensionPath, locale);
  if (locale === FALLBACK_LOCALE) {
    return localeMessages ?? {};
  }

  const englishMessages = await readWebviewMessages(extensionPath, FALLBACK_LOCALE);
  // Keys absent from the locale dictionary would otherwise render as raw keys in the webview.
  return { ...englishMessages, ...localeMessages };
}

async function readWebviewMessages(
  extensionPath: string,
  locale: GitKeizuLocale
): Promise<Record<string, string> | null> {
  try {
    const content = await fs.readFile(
      path.join(extensionPath, "l10n", "web", `web.l10n.${locale}.json`),
      "utf8"
    );
    const parsed = JSON.parse(content) as unknown;
    return isStringRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every((item) => typeof item === "string");
}
