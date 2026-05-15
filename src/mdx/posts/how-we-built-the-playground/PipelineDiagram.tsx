"use client";

import { FlowDiagram } from "@/mdx/shared/flow-diagram";
import type { FlowDiagramDef } from "@/mdx/shared/flow-diagram";

const PIPELINE: FlowDiagramDef = {
  id: "playground-pipeline",
  title: "Pipeline",
  subtitle: "keypress → rendered component",
  thesis: "Seven stages transform a keypress into a rendered component — all in the browser",
  protagonist: "babel",
  tension: "How do you run a build pipeline with no build server?",
  arc: ["babel", "lexer", "rewrite", "blob", "importmap", "script", "iframe"],
  hint: "Click any stage to see how it works",
  viewBox: "0 0 440 310",
  nodes: [
    {
      id: "babel",
      label: "① Babel standalone",
      x: 220,
      y: 28,
      w: 260,
      role: "protagonist",
      description: "TypeScript + JSX → plain ES module JavaScript.",
      detail:
        "Babel runs entirely in the browser. It strips types, transforms JSX to createElement calls, and emits standard ES modules. No server round-trip, no bundler.",
    },
    {
      id: "lexer",
      label: "② es-module-lexer",
      x: 220,
      y: 72,
      w: 260,
      description: "Extract import specifier character offsets — no AST, just byte positions.",
      detail:
        "A tiny WASM binary that scans for import/export statements in O(n) time. Returns character offsets so rewrites are surgical. One-time async init at module load.",
    },
    {
      id: "rewrite",
      label: "③ magic-string",
      x: 220,
      y: 116,
      w: 260,
      description: "Surgical specifier rewrites: local → virtual namespace, bare → CDN.",
      detail:
        './App → virtual namespace path, "react" → esm.sh CDN URL, http URLs pass through unchanged. Only the specifier bytes change — the rest of the source is untouched.',
    },
    {
      id: "blob",
      label: "④ Blob URL",
      x: 220,
      y: 160,
      w: 260,
      description: "URL.createObjectURL(new Blob([code])) — one blob per file.",
      detail:
        "Each file in the workspace becomes a blob URL. The browser treats these as real ES modules — importable, cacheable, garbage-collected when revoked.",
    },
    {
      id: "importmap",
      label: "⑤ Import map",
      x: 220,
      y: 204,
      w: 260,
      description: "Map virtual namespace paths → blob URLs.",
      detail:
        'A <script type="importmap"> that maps the virtual namespace to blob URLs. The browser\'s native module resolver handles the rest — no custom loader needed.',
    },
    {
      id: "script",
      label: "⑥ script tag",
      x: 220,
      y: 248,
      w: 260,
      description: '<script type="module"> injected into srcdoc.',
      detail:
        "The entry point is a module script that imports the user's App component. The import map resolves all specifiers at load time — zero runtime module resolution code.",
    },
    {
      id: "iframe",
      label: "⑦ iframe",
      x: 220,
      y: 292,
      w: 260,
      description: "<iframe srcdoc> renders the component in full isolation.",
      detail:
        "A sandboxed iframe with srcdoc receives the full HTML document. Complete isolation from the host page — separate DOM, separate module graph, separate error boundary.",
    },
  ],
  edges: [
    { from: "babel", to: "lexer", verb: "emits", description: "plain ES module JavaScript with JSX transformed", animate: "stream" },
    { from: "lexer", to: "rewrite", verb: "extracts", description: "import specifier byte offsets for surgical rewriting", animate: "stream" },
    { from: "rewrite", to: "blob", verb: "produces", description: "source code with all specifiers resolved to URLs", animate: "stream" },
    { from: "blob", to: "importmap", verb: "registers", description: "each file becomes a blob URL in the virtual namespace", animate: "stream" },
    { from: "importmap", to: "script", verb: "maps", description: "virtual paths resolved to blob URLs by the browser", animate: "stream" },
    { from: "script", to: "iframe", verb: "renders", description: "module script imports the app inside a sandboxed iframe", animate: "stream" },
  ],
};

export function PipelineDiagram() {
  return <FlowDiagram {...PIPELINE} />;
}

export default PipelineDiagram;
