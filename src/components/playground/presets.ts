import type {
  PlaygroundFile,
  PlaygroundFileLanguage,
  PlaygroundPresetId,
  PlaygroundWorkspace,
} from "@/components/playground/types";
import { createFileId, ensureWorkspacePath, inferLanguageFromPath } from "@/components/playground/workspace-utils";

type PresetFileSeed = {
  path: string;
  language?: PlaygroundFileLanguage;
  content: string;
};

type PlaygroundPreset = {
  id: PlaygroundPresetId;
  label: string;
  description: string;
  entry: string;
  files: PresetFileSeed[];
};

function toFileSeed(seed: PresetFileSeed): PlaygroundFile {
  const normalizedPath = ensureWorkspacePath(seed.path);
  return {
    id: createFileId(),
    path: normalizedPath,
    language: seed.language ?? inferLanguageFromPath(normalizedPath),
    content: seed.content,
  };
}

export const PLAYGROUND_PRESETS: Record<PlaygroundPresetId, PlaygroundPreset> = {
  "react-ts": {
    id: "react-ts",
    label: "React + TypeScript",
    description: "Starter with TSX components and helper module.",
    entry: "/src/main.tsx",
    files: [
      {
        path: "/src/main.tsx",
        content: `import { createRoot } from "react-dom/client";
import { App } from "./App";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found.");
}

createRoot(root).render(<App />);
`,
      },
      {
        path: "/src/App.tsx",
        content: `import { formatIdea, getTimestamp } from "./idea";

export function App() {
  return (
    <main style={{ fontFamily: "Inter, system-ui, sans-serif", padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Terminal Dreams Playground</h1>
      <p style={{ marginTop: 0, color: "#666" }}>
        {formatIdea("React + TS + live preview")}
      </p>
      <small style={{ color: "#888" }}>Last run: {getTimestamp()}</small>
    </main>
  );
}
`,
      },
      {
        path: "/src/idea.ts",
        content: `export function formatIdea(label: string): string {
  return \`Current scratch: \${label}\`;
}

export function getTimestamp(): string {
  return new Date().toLocaleTimeString();
}
`,
      },
    ],
  },
  "react-js": {
    id: "react-js",
    label: "React + JavaScript",
    description: "Starter with JSX and simple utility module.",
    entry: "/src/main.jsx",
    files: [
      {
        path: "/src/main.jsx",
        language: "javascript",
        content: `import { createRoot } from "react-dom/client";
import { App } from "./App";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found.");
}

createRoot(root).render(<App />);
`,
      },
      {
        path: "/src/App.jsx",
        language: "javascript",
        content: `import { nowLabel } from "./time";

export function App() {
  return (
    <main style={{ fontFamily: "Inter, system-ui, sans-serif", padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>JS Scratch Lab</h1>
      <p style={{ marginTop: 0, color: "#666" }}>
        Edit files on the left, hit Run, iterate.
      </p>
      <small style={{ color: "#888" }}>Built at: {nowLabel()}</small>
    </main>
  );
}
`,
      },
      {
        path: "/src/time.js",
        language: "javascript",
        content: `export const nowLabel = () => new Date().toLocaleTimeString();
`,
      },
    ],
  },
};

export const PLAYGROUND_PRESET_OPTIONS = Object.values(PLAYGROUND_PRESETS).map((preset) => ({
  id: preset.id,
  label: preset.label,
  description: preset.description,
}));

export function createWorkspaceFromPreset(presetId: PlaygroundPresetId): PlaygroundWorkspace {
  const preset = PLAYGROUND_PRESETS[presetId] ?? PLAYGROUND_PRESETS["react-ts"];
  const files = preset.files.map(toFileSeed);
  const firstFile = files[0];
  return {
    version: 1,
    preset: preset.id,
    entry: ensureWorkspacePath(preset.entry),
    activeFileId: firstFile?.id ?? "",
    folders: ["/src"],
    files,
  };
}
