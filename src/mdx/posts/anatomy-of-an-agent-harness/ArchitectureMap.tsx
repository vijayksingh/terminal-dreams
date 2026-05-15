"use client";

import { FlowDiagram } from "@/mdx/shared/flow-diagram";
import type { FlowDiagramDef, ResolvedNode } from "@/mdx/shared/flow-diagram";
import { PRIMITIVES } from "./flue-data";

// ── Spatial design ──────────────────────────────────────
//
// The layout encodes a spatial metaphor:
//   Top row    = Instruction Layer (Skill + Role) — how the agent thinks
//   Center     = Session hub — where everything converges
//   Bottom row = Execution Layer (Task + Sandbox) — where the agent acts
//
// This maps to the reader's intuition: "mind" above, "hands" below,
// with the coordinator in the middle. The horizontal spread within
// each layer separates concerns (Skill is input knowledge, Role is
// behavioral constraints; Task is delegation, Sandbox is execution).

const CANVAS = { w: 540, h: 260 };
const CENTER = { x: CANVAS.w / 2, y: 118 };

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  session: CENTER,
  skill:   { x: 130, y: 46 },
  role:    { x: 410, y: 46 },
  task:    { x: 130, y: 198 },
  sandbox: { x: 410, y: 198 },
};

// ── Shape rationale ─────────────────────────────────────
//
// hexagon  → Session: a hub/nexus with many facets — signals "central coordinator"
// cylinder → Skill: knowledge storage — .md files loaded from disk
// diamond  → Role: decision/identity — the persona is a constraint choice
// rect     → Task: a discrete work unit — the most generic, "tasklike" shape
// pill     → Sandbox: a contained runtime — the rounded ends suggest encapsulation

const NODE_SHAPES: Record<string, { shape: "hexagon" | "cylinder" | "diamond" | "rect" | "pill"; w: number; h: number }> = {
  session: { shape: "hexagon", w: 100, h: 40 },
  skill:   { shape: "cylinder", w: 86,  h: 30 },
  role:    { shape: "diamond",  w: 90,  h: 36 },
  task:    { shape: "rect",     w: 82,  h: 28 },
  sandbox: { shape: "pill",     w: 88,  h: 28 },
};

// ── Brief summaries (shown on detail panel header) ──────

const BRIEFS: Record<string, string> = {
  session: "Append-only message log with built-in compaction",
  skill:   "Markdown instruction sets loaded per-call",
  role:    "Persona overlays that constrain behavior",
  task:    "Child agents with their own message history",
  sandbox: "One interface, three runtimes",
};

// ── Rich descriptions (shown in detail panel body) ──────

const DESCRIPTIONS: Record<string, string> = {
  session:
    "The session is an append-only message log. Every prompt, response, and tool call is a message. " +
    "Three operations — prompt(), skill(), task() — all flow through it. When token limits approach, " +
    "compaction summarizes older messages. Only one operation runs at a time, enforced by optimistic concurrency.",
  skill:
    "Skills are .md files in .agents/skills/ that bundle instructions, context, and output format " +
    "constraints into a single document. They're injected into the system prompt for one call only — " +
    "ephemeral overlays, not persistent configuration. A product manager can edit them without touching code.",
  role:
    "Roles are character profiles: scoped instructions, optional model overrides, and behavioral constraints. " +
    "Applied per-call, not persisted to history. The same session can adopt different roles for different " +
    "operations. They compose with skills without inheritance — layered, not hierarchical.",
  task:
    "Tasks are child agents spawned via session.task(). Each gets a fresh message history " +
    "(focused context) but shares the parent's sandbox (same files, same tools). " +
    "Depth is capped at 4 to prevent infinite recursion. This is delegation, not multithreading.",
  sandbox:
    "The sandbox is a uniform execution surface. Virtual (just-bash) for speed. " +
    "Local (host filesystem) for CI/CD. Container (Daytona) for untrusted code. " +
    "The SessionEnv interface is identical across all three — agents never know which runtime they're on.",
};

// ── Why-it-matters lines (closing insight per node) ─────

const WHY_IT_MATTERS: Record<string, string> = {
  session: "Every debugging session starts here — replay the log, reproduce the bug.",
  skill:   "Behavior as prose, not code. The most powerful abstraction in the system.",
  role:    "Identity without rigidity. The agent can be anyone, one call at a time.",
  task:    "Divide and conquer with a safety net — depth limits prevent runaway delegation.",
  sandbox: "The abstraction that makes \"works on my machine\" actually mean something.",
};

// ── Build the diagram definition ────────────────────────

const ARCHITECTURE: FlowDiagramDef = {
  id: "architecture-map",
  title: "Architecture",
  subtitle: "five primitives, one hub",
  viewBox: `0 0 ${CANVAS.w} ${CANVAS.h}`,

  // ── Dimension 1: Intent ───────────────────────────────
  thesis:
    "Five primitives coordinate through a single Session hub — the message log is the system's spine.",
  tension:
    "Everything flows through one object. Bottleneck, or the simplest correct design?",

  // ── Dimension 2: Hierarchy ────────────────────────────
  protagonist: "session",

  // ── Dimension 5: Path ─────────────────────────────────
  // Start at the hub, then follow natural curiosity:
  // "What does the hub connect to?" → instruction layer → execution layer.
  // Within each layer: input/knowledge first, then action/constraint.
  arc: ["session", "skill", "role", "task", "sandbox"],

  hint: "Tap any node to explore how it works",

  // ── Nodes ─────────────────────────────────────────────
  nodes: PRIMITIVES.map((p) => ({
    id: p.id,
    ...NODE_POSITIONS[p.id],
    ...NODE_SHAPES[p.id],
    label: p.name,
    sublabel: p.id === "session" ? "hub" : undefined,
    role: (p.id === "session"
      ? "protagonist"
      : "supporting") as "protagonist" | "supporting",
    brief: BRIEFS[p.id],
    description: DESCRIPTIONS[p.id],
    data: {
      icon: p.icon,
      properties: p.properties,
      tagline: p.tagline,
      whyItMatters: WHY_IT_MATTERS[p.id],
    },
  })),

  // ── Dimension 3: Relationships ────────────────────────
  // Every edge carries a human explanation, not just an API label.
  edges: [
    {
      from: "session",
      to: "skill",
      label: ".skill()",
      route: "curved" as const,
      verb: "loads",
      description:
        "Loads a markdown instruction set into the system prompt for this call. " +
        "The skill shapes HOW the model responds — it's behavioral configuration as prose.",
      animate: "stream" as const,
    },
    {
      from: "session",
      to: "role",
      label: "role overlay",
      route: "curved" as const,
      verb: "applies",
      description:
        "Applies a persona and its constraints to the current operation. " +
        "Roles define WHO the model is — character, tone, model selection. Per-call, not permanent.",
    },
    {
      from: "session",
      to: "task",
      label: ".task()",
      route: "curved" as const,
      verb: "spawns",
      description:
        "Delegates work to a child agent with its own message history. " +
        "The child runs to completion and returns results. This is how agents divide complex work.",
      animate: "trace" as const,
    },
    {
      from: "session",
      to: "sandbox",
      label: "tool calls",
      route: "curved" as const,
      verb: "executes in",
      description:
        "Runs tool calls (shell commands, file I/O) in the sandboxed environment. " +
        "The session never touches the filesystem directly — all execution is mediated.",
    },
    {
      from: "task",
      to: "sandbox",
      label: "shared env",
      route: "straight" as const,
      dashed: true,
      verb: "shares",
      description:
        "Child tasks share the parent's sandbox — same files, same tools, same working directory. " +
        "Fresh message history, shared workspace. This is what makes delegation practical.",
    },
  ],

  // ── Groups ────────────────────────────────────────────
  // Visual containment makes the two-layer architecture legible.
  groups: [
    {
      id: "instruction-layer",
      label: "Instruction Layer",
      nodeIds: ["skill", "role"],
      style: "dashed" as const,
      pad: 22,
      description: "Shapes how the agent thinks — knowledge and identity",
    },
    {
      id: "execution-layer",
      label: "Execution Layer",
      nodeIds: ["task", "sandbox"],
      style: "dashed" as const,
      pad: 22,
      description: "Where the agent acts — delegation and tool execution",
    },
  ],

  // ── Annotations ───────────────────────────────────────
  annotations: [
    { x: CENTER.x, y: CENTER.y + 30, text: "one operation at a time" },
    { x: 130, y: 228, text: "max depth: 4" },
    { x: 410, y: 228, text: "virtual | local | container" },
  ],

  config: {
    detailPanelHeight: "auto" as const,
    edgeDefaults: { route: "curved" as const },
  },
};

// ── Detail panel renderer ───────────────────────────────
//
// The default detail panel shows label + brief + connections.
// This custom renderer adds:
// - A prominent icon badge
// - The one-line tagline
// - Categorized property list
// - A "why it matters" closing insight
// - Visual separation between sections

function PrimitiveDetail({ node }: { node: ResolvedNode }) {
  const d = node.data as {
    icon: string;
    properties: string[];
    tagline: string;
    whyItMatters: string;
  };

  return (
    <div style={{ fontFamily: "var(--font-mono)" }}>
      {/* Header: icon + name + tagline */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--color-accent)",
            color: "var(--color-bg)",
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {d.icon}
        </span>
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--color-text)",
              lineHeight: 1.2,
            }}
          >
            {node.label}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--color-muted)",
              lineHeight: 1.3,
              marginTop: 1,
            }}
          >
            {d.tagline}
          </div>
        </div>
      </div>

      {/* Separator */}
      <div
        style={{
          height: 1,
          background: "var(--color-border)",
          opacity: 0.3,
          marginBottom: 10,
        }}
      />

      {/* Properties list */}
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: 5,
        }}
      >
        {d.properties.map((prop) => (
          <li
            key={prop}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              fontSize: 12,
              lineHeight: 1.5,
              color: "var(--color-text)",
            }}
          >
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "var(--color-accent)",
                opacity: 0.6,
                flexShrink: 0,
                marginTop: 7,
              }}
            />
            {prop}
          </li>
        ))}
      </ul>

      {/* Why it matters — closing insight */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 8,
          borderTop: "1px solid color-mix(in srgb, var(--color-border) 30%, transparent)",
          fontSize: 11,
          fontStyle: "italic",
          color: "var(--color-accent)",
          opacity: 0.7,
          lineHeight: 1.5,
        }}
      >
        {d.whyItMatters}
      </div>
    </div>
  );
}

// ── Exported component ──────────────────────────────────

export function ArchitectureMap() {
  return (
    <FlowDiagram {...ARCHITECTURE}>
      {(node) => <PrimitiveDetail node={node} />}
    </FlowDiagram>
  );
}

export default ArchitectureMap;
