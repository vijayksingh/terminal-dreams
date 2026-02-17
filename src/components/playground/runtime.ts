import * as Babel from "@babel/standalone";
import { init, parse } from "es-module-lexer";
import MagicString from "magic-string";

import type { PlaygroundFile, PlaygroundWorkspace } from "@/components/playground/types";
import { dirname, ensureWorkspacePath, normalizePath, toFileByPath } from "@/components/playground/workspace-utils";

// Use a bare-specifier namespace so import maps work inside `about:srcdoc`.
const PLAYGROUND_LOCAL_PREFIX = "td-playground";
const PLAYGROUND_RUNTIME_CHANNEL = "td-playground";
const RESOLUTION_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".css", ".json"];
const lexerReady = Promise.resolve(init);

export type PlaygroundBuildResult = {
  srcDoc: string;
  blobUrls: string[];
};

export class PlaygroundBuildError extends Error {
  diagnostics: string[];

  constructor(diagnostics: string[]) {
    super(diagnostics[0] ?? "Playground build failed.");
    this.name = "PlaygroundBuildError";
    this.diagnostics = diagnostics;
  }
}

function toVirtualSpecifier(path: string): string {
  return `${PLAYGROUND_LOCAL_PREFIX}${normalizePath(path)}`;
}

function stripVirtualPrefix(specifier: string): string {
  if (!specifier.startsWith(PLAYGROUND_LOCAL_PREFIX)) return specifier;
  return specifier.slice(PLAYGROUND_LOCAL_PREFIX.length);
}

function normalizeSegments(value: string): string {
  const normalized = value.replace(/\\/g, "/");
  const segments = normalized.split("/");
  const stack: string[] = [];

  segments.forEach((segment) => {
    if (!segment || segment === ".") return;
    if (segment === "..") {
      stack.pop();
      return;
    }
    stack.push(segment);
  });

  return `/${stack.join("/")}`;
}

function hasExtension(path: string): boolean {
  return /\.[A-Za-z0-9]+$/.test(path);
}

function isHttpSpecifier(specifier: string): boolean {
  return /^(https?:)?\/\//.test(specifier);
}

function isDataOrBlobSpecifier(specifier: string): boolean {
  return specifier.startsWith("data:") || specifier.startsWith("blob:");
}

function toCdnSpecifier(specifier: string): string {
  const [withoutHash, hash = ""] = specifier.split("#");
  const joiner = withoutHash.includes("?") ? "&" : "?";
  const withBundle = withoutHash.includes("bundle")
    ? withoutHash
    : `${withoutHash}${joiner}bundle`;
  return `https://esm.sh/${withBundle}${hash ? `#${hash}` : ""}`;
}

function resolveLocalPath(
  specifier: string,
  importerPath: string,
  filesByPath: Map<string, PlaygroundFile>
): string | null {
  const localSpecifier = stripVirtualPrefix(specifier);
  const basePath = localSpecifier.startsWith(".")
    ? normalizeSegments(`${dirname(importerPath)}/${localSpecifier}`)
    : ensureWorkspacePath(localSpecifier);

  if (filesByPath.has(basePath)) return basePath;

  const candidates: string[] = [];

  if (!hasExtension(basePath)) {
    RESOLUTION_EXTENSIONS.forEach((extension) => {
      candidates.push(`${basePath}${extension}`);
    });
    RESOLUTION_EXTENSIONS.forEach((extension) => {
      candidates.push(`${basePath}/index${extension}`);
    });
  }

  for (const candidate of candidates) {
    if (filesByPath.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

function cssModuleContent(path: string, css: string): string {
  const styleId = `td-playground-style-${path.replace(/[^a-zA-Z0-9]/g, "-")}`;
  return `const styleId = ${JSON.stringify(styleId)};
let styleNode = document.getElementById(styleId);
if (!styleNode) {
  styleNode = document.createElement("style");
  styleNode.id = styleId;
  document.head.appendChild(styleNode);
}
styleNode.textContent = ${JSON.stringify(css)};
export default styleNode;
`;
}

function jsonModuleContent(content: string, path: string): string {
  try {
    const parsed = JSON.parse(content);
    return `export default ${JSON.stringify(parsed)};`;
  } catch {
    throw new PlaygroundBuildError([`Invalid JSON in "${path}".`]);
  }
}

function transpileModule(file: PlaygroundFile): string {
  const normalizedPath = normalizePath(file.path);

  if (normalizedPath.endsWith(".css") || file.language === "css") {
    return cssModuleContent(normalizedPath, file.content);
  }

  if (normalizedPath.endsWith(".json") || file.language === "json") {
    return jsonModuleContent(file.content, normalizedPath);
  }

  const presets: Array<string | [string, Record<string, unknown>]> = [];
  const needsTypescript = /\.(ts|tsx)$/i.test(normalizedPath);
  const needsReact = /\.(js|jsx|tsx)$/i.test(normalizedPath);

  // Babel presets run right-to-left. Keep React first so TypeScript strips types before JSX transform.
  if (needsReact) {
    presets.push([
      "react",
      {
        runtime: "automatic",
      },
    ]);
  }
  if (needsTypescript) {
    presets.push([
      "typescript",
      {
        allExtensions: true,
        isTSX: normalizedPath.endsWith(".tsx"),
      },
    ]);
  }

  try {
    const transformed = Babel.transform(file.content, {
      filename: normalizedPath,
      sourceType: "module",
      presets,
      babelrc: false,
      configFile: false,
      retainLines: true,
    });

    return transformed.code ?? "";
  } catch (error) {
    const message =
      error instanceof Error ? error.message : `Unknown transpile error in "${normalizedPath}".`;
    throw new PlaygroundBuildError([message]);
  }
}

function rewriteImports(
  importerPath: string,
  code: string,
  filesByPath: Map<string, PlaygroundFile>
): string {
  const [imports] = parse(code);
  if (imports.length === 0) return code;

  const magicString = new MagicString(code);

  imports.forEach((item) => {
    if (!item.n) return;

    const specifier = item.n;
    if (isHttpSpecifier(specifier) || isDataOrBlobSpecifier(specifier)) {
      return;
    }

    if (
      specifier.startsWith(".") ||
      specifier.startsWith("/") ||
      specifier.startsWith(PLAYGROUND_LOCAL_PREFIX)
    ) {
      const resolvedLocalPath = resolveLocalPath(specifier, importerPath, filesByPath);
      if (!resolvedLocalPath) {
        throw new PlaygroundBuildError([
          `Cannot resolve "${specifier}" imported from "${importerPath}".`,
        ]);
      }
      magicString.overwrite(item.s, item.e, toVirtualSpecifier(resolvedLocalPath));
      return;
    }

    magicString.overwrite(item.s, item.e, toCdnSpecifier(specifier));
  });

  return magicString.toString();
}

function escapeScriptEnd(value: string): string {
  return value.replace(/<\/script/gi, "<\\/script");
}

function createSrcDoc(imports: Record<string, string>, entryPath: string): string {
  const importMap = escapeScriptEnd(JSON.stringify({ imports }));
  const entrySpecifier = toVirtualSpecifier(entryPath);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root { color-scheme: light dark; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      }
      #root { min-height: 100vh; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      (function () {
        var post = function (type, payload) {
          parent.postMessage({ channel: "${PLAYGROUND_RUNTIME_CHANNEL}", type: type, payload: payload || {} }, "*");
        };
        window.addEventListener("error", function (event) {
          post("runtime-error", {
            message: (event.error && event.error.message) || event.message || "Runtime error",
            stack: (event.error && event.error.stack) || ""
          });
        });
        window.addEventListener("unhandledrejection", function (event) {
          var reason = event.reason;
          post("runtime-error", {
            message: (reason && reason.message) || String(reason),
            stack: (reason && reason.stack) || ""
          });
        });
      })();
    </script>
    <script type="importmap">${importMap}</script>
    <script type="module">
      const post = (type, payload = {}) =>
        parent.postMessage({ channel: "${PLAYGROUND_RUNTIME_CHANNEL}", type, payload }, "*");
      try {
        await import(${JSON.stringify(entrySpecifier)});
        post("ready", { timestamp: Date.now() });
      } catch (error) {
        post("runtime-error", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack ?? "" : "",
        });
      }
    </script>
  </body>
</html>`;
}

export async function buildPlaygroundSource(workspace: PlaygroundWorkspace): Promise<PlaygroundBuildResult> {
  await lexerReady;

  const filesByPath = toFileByPath(workspace.files);
  const entryPath = normalizePath(workspace.entry);

  if (!filesByPath.has(entryPath)) {
    throw new PlaygroundBuildError([`Entry file "${entryPath}" is missing from workspace.`]);
  }

  const transpiledByPath = new Map<string, string>();
  filesByPath.forEach((file, path) => {
    transpiledByPath.set(path, transpileModule(file));
  });

  const rewrittenByPath = new Map<string, string>();
  transpiledByPath.forEach((code, path) => {
    rewrittenByPath.set(path, rewriteImports(path, code, filesByPath));
  });

  const importMap: Record<string, string> = {};
  const blobUrls: string[] = [];

  rewrittenByPath.forEach((code, path) => {
    const blobUrl = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
    importMap[toVirtualSpecifier(path)] = blobUrl;
    blobUrls.push(blobUrl);
  });

  return {
    srcDoc: createSrcDoc(importMap, entryPath),
    blobUrls,
  };
}

export function revokeBlobUrls(blobUrls: string[]) {
  blobUrls.forEach((url) => URL.revokeObjectURL(url));
}

export const PLAYGROUND_POST_MESSAGE_CHANNEL = PLAYGROUND_RUNTIME_CHANNEL;
