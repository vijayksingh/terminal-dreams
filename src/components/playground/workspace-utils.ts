import type { PlaygroundFile, PlaygroundFileLanguage } from "@/components/playground/types";

const LOCAL_ROOT = "/src";

const KNOWN_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".css", ".json"];

function collapseSlashes(value: string): string {
  return value.replace(/\/{2,}/g, "/");
}

export function normalizePath(path: string): string {
  const withForwardSlash = path.replace(/\\/g, "/").trim();
  const withLeadingSlash = withForwardSlash.startsWith("/") ? withForwardSlash : `/${withForwardSlash}`;
  const normalized = collapseSlashes(withLeadingSlash);
  return normalized === "" ? LOCAL_ROOT : normalized;
}

export function ensureWorkspacePath(path: string): string {
  const normalized = normalizePath(path);
  if (normalized.startsWith(LOCAL_ROOT)) {
    return normalized;
  }
  return `${LOCAL_ROOT}${normalized}`;
}

export function normalizeFolderPath(path: string): string {
  const normalized = ensureWorkspacePath(path).replace(/\/+$/, "");
  return normalized.length === 0 ? LOCAL_ROOT : normalized;
}

export function dirname(path: string): string {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf("/");
  if (index <= 0) return "/";
  return normalized.slice(0, index);
}

export function hasKnownExtension(path: string): boolean {
  return KNOWN_EXTENSIONS.some((ext) => path.endsWith(ext));
}

export function inferLanguageFromPath(path: string): PlaygroundFileLanguage {
  const normalized = normalizePath(path);
  if (normalized.endsWith(".css")) return "css";
  if (normalized.endsWith(".json")) return "json";
  if (normalized.endsWith(".js") || normalized.endsWith(".jsx")) return "javascript";
  return "typescript";
}

export function isRunnableFile(path: string): boolean {
  return /\.(tsx|ts|jsx|js)$/i.test(path);
}

export function createFileId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function toFileByPath(files: PlaygroundFile[]): Map<string, PlaygroundFile> {
  const map = new Map<string, PlaygroundFile>();
  files.forEach((file) => map.set(normalizePath(file.path), file));
  return map;
}
