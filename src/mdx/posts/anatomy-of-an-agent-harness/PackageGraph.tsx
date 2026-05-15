"use client";

import { FlowDiagram } from "@/mdx/shared/flow-diagram";
import type { FlowDiagramDef } from "@/mdx/shared/flow-diagram";

const PACKAGES: FlowDiagramDef = {
  id: "flue-packages",
  title: "Packages",
  subtitle: "dependency arrows point inward",
  thesis: "The stable core depends on nothing — unstable edges depend on it",
  tension: "Dependency inversion at the package level — can the core stay truly independent?",
  protagonist: "sdk",
  hint: "Click any package to see its role",
  viewBox: "0 0 500 164",
  nodes: [
    {
      id: "cli",
      label: "@flue/cli",
      sublabel: "dev · run · build",
      x: 185,
      y: 36,
      w: 120,
      h: 34,
      role: "supporting",
      brief: "Thin argument parser — no business logic",
      description: "Thin wrapper around the SDK. Parses arguments, validates input, calls SDK functions.",
      detail:
        "Three commands: flue dev (local development with hot reload), flue run (execute an agent from CLI), flue build (compile workspace into deployable artifact). Contains almost no business logic of its own.",
    },
    {
      id: "sdk",
      label: "@flue/sdk",
      sublabel: "sessions · tasks · tools · build",
      x: 185,
      y: 120,
      w: 140,
      h: 34,
      role: "protagonist",
      brief: "The stable core that everything depends on",
      description: "The stable core. Sessions, tasks, tools, and the build pipeline.",
      detail:
        "The dependency arrows point inward — the SDK depends on neither the CLI nor connectors. This is dependency inversion applied to package architecture: the stable core is depended upon by everything, and it depends on nothing.",
    },
    {
      id: "connectors",
      label: "@flue/connectors",
      sublabel: "daytona · mcp",
      x: 385,
      y: 78,
      w: 130,
      h: 34,
      role: "context",
      brief: "Volatile integrations isolated at the edge",
      description: "Third-party integrations. Changes frequently as upstream APIs evolve.",
      detail:
        "Daytona container connector, MCP server adapters, and future platform-specific code. Its instability is isolated from the core SDK by the package boundary. Unstable packages at the edges can change freely without affecting the core.",
    },
  ],
  edges: [
    { from: "cli", to: "sdk", label: "depends on", verb: "imports", description: "CLI calls SDK functions — all business logic lives in the core" },
    { from: "connectors", to: "sdk", label: "depends on", verb: "implements", description: "connectors implement SDK interfaces for third-party services" },
  ],
  annotations: [
    { x: 52, y: 122, text: "stable core" },
    { x: 452, y: 36, text: "unstable edge" },
  ],
};

export function PackageGraph() {
  return <FlowDiagram {...PACKAGES} />;
}

export default PackageGraph;
