"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import styles from "./semantic-playground.module.css";

// ── Domain types ──────────────────────────────────────────────

type RoleType = "dependency" | "collaborator" | "output";
type ReadingDirection = "top-down" | "center-out" | "left-right";

interface NodeDef {
  id: string;
  label: string;
}

const NODES: NodeDef[] = [
  { id: "session", label: "Session" },
  { id: "skill", label: "Skill" },
  { id: "sandbox", label: "Sandbox" },
  { id: "task", label: "Task" },
  { id: "model", label: "Model" },
];

const EDGES: [string, string][] = [
  ["session", "skill"],
  ["session", "sandbox"],
  ["session", "task"],
  ["session", "model"],
  ["task", "sandbox"],
];

// ── Syntactic code display ────────────────────────────────────

const SYNTACTIC_CODE = `nodes:
  - id: session, x: 200, y: 50, w: 120, h: 40
  - id: skill, x: 80, y: 160, w: 120, h: 40
  - id: sandbox, x: 320, y: 160, w: 120, h: 40
  - id: task, x: 140, y: 280, w: 120, h: 40
  - id: model, x: 260, y: 280, w: 120, h: 40
edges:
  - from: session, to: skill
  - from: session, to: sandbox
  - from: session, to: task
  - from: session, to: model
  - from: task, to: sandbox
style:
  fill: "#3a3a5c"
  stroke: "#6a6a8e"
  fontSize: 12`;

// ── Layout engines ────────────────────────────────────────────

/** Flat parking-lot layout — no hierarchy, no meaning. */
function syntacticLayout(): Record<string, { x: number; y: number; w: number; h: number }> {
  return {
    session: { x: 200, y: 50, w: 120, h: 40 },
    skill: { x: 80, y: 160, w: 120, h: 40 },
    sandbox: { x: 320, y: 160, w: 120, h: 40 },
    task: { x: 140, y: 280, w: 120, h: 40 },
    model: { x: 260, y: 280, w: 120, h: 40 },
  };
}

/** Semantic layout — protagonist is visually dominant, roles shape weight. */
function semanticLayout(
  protagonist: string,
  roles: Record<string, RoleType>,
  direction: ReadingDirection,
): Record<string, { x: number; y: number; w: number; h: number }> {
  const cx = 220;
  const cy = 170;

  const result: Record<string, { x: number; y: number; w: number; h: number }> = {};
  const others = NODES.filter((n) => n.id !== protagonist);

  const sizeByRole: Record<RoleType, { w: number; h: number }> = {
    collaborator: { w: 110, h: 38 },
    dependency: { w: 100, h: 34 },
    output: { w: 95, h: 32 },
  };

  // Group others by role for tier-based positioning
  const byRole: Record<RoleType, NodeDef[]> = {
    dependency: others.filter((n) => roles[n.id] === "dependency"),
    collaborator: others.filter((n) => roles[n.id] === "collaborator"),
    output: others.filter((n) => roles[n.id] === "output"),
  };

  if (direction === "top-down") {
    // Protagonist at top center, tiers descend
    result[protagonist] = { x: cx, y: 55, w: 140, h: 52 };
    const tiers: { role: RoleType; y: number }[] = [
      { role: "dependency", y: 150 },
      { role: "collaborator", y: 200 },
      { role: "output", y: 275 },
    ];
    for (const tier of tiers) {
      const group = byRole[tier.role];
      const spread = 130;
      group.forEach((node, idx) => {
        const offset = (idx - (group.length - 1) / 2) * spread;
        result[node.id] = { x: cx + offset, y: tier.y, ...sizeByRole[tier.role] };
      });
    }
  } else if (direction === "left-right") {
    // Protagonist on left, tiers flow right
    result[protagonist] = { x: 70, y: cy, w: 140, h: 52 };
    const tiers: { role: RoleType; x: number }[] = [
      { role: "dependency", x: 220 },
      { role: "collaborator", x: 290 },
      { role: "output", x: 380 },
    ];
    for (const tier of tiers) {
      const group = byRole[tier.role];
      const spread = 75;
      group.forEach((node, idx) => {
        const offset = (idx - (group.length - 1) / 2) * spread;
        result[node.id] = { x: tier.x, y: cy + offset, ...sizeByRole[tier.role] };
      });
    }
  } else {
    // center-out: protagonist at center, others radiate by role distance
    result[protagonist] = { x: cx, y: cy, w: 140, h: 52 };
    const radiusByRole: Record<RoleType, number> = {
      collaborator: 105,
      dependency: 130,
      output: 150,
    };
    let angleIdx = 0;
    for (const node of others) {
      const role = roles[node.id];
      const angle = ((angleIdx / others.length) * Math.PI * 2) - Math.PI / 2;
      const radius = radiusByRole[role];
      result[node.id] = {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        ...sizeByRole[role],
      };
      angleIdx++;
    }
  }

  return result;
}

// ── Visual properties by role ─────────────────────────────────

function roleOpacity(role: RoleType | "protagonist"): number {
  switch (role) {
    case "protagonist": return 1;
    case "collaborator": return 0.85;
    case "dependency": return 0.65;
    case "output": return 0.5;
  }
}

function roleFontSize(role: RoleType | "protagonist"): number {
  switch (role) {
    case "protagonist": return 13;
    case "collaborator": return 11;
    case "dependency": return 10;
    case "output": return 10;
  }
}

function roleStrokeWidth(role: RoleType | "protagonist"): number {
  switch (role) {
    case "protagonist": return 2;
    case "collaborator": return 1.5;
    case "dependency": return 1;
    case "output": return 1;
  }
}

// ── SVG diagram renderers ─────────────────────────────────────

const SVG_W = 440;
const SVG_H = 340;

function SyntacticPreview() {
  const layout = syntacticLayout();

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width="100%"
      height="100%"
      style={{ maxWidth: SVG_W, maxHeight: SVG_H }}
    >
      {/* Edges */}
      {EDGES.map(([from, to]) => {
        const a = layout[from];
        const b = layout[to];
        return (
          <line
            key={`${from}-${to}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
        );
      })}

      {/* Nodes — all identical styling */}
      {NODES.map((node) => {
        const n = layout[node.id];
        return (
          <g key={node.id}>
            <rect
              x={n.x - n.w / 2}
              y={n.y - n.h / 2}
              width={n.w}
              height={n.h}
              rx={4}
              fill="var(--color-surface-2)"
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text
              x={n.x}
              y={n.y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--color-muted)"
              fontFamily="var(--font-mono)"
              fontSize={11}
            >
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function SemanticPreview({
  protagonist,
  roles,
  direction,
  reducedMotion,
}: {
  protagonist: string;
  roles: Record<string, RoleType>;
  direction: ReadingDirection;
  reducedMotion: boolean;
}) {
  const layout = useMemo(
    () => semanticLayout(protagonist, roles, direction),
    [protagonist, roles, direction],
  );

  const springTransition = reducedMotion
    ? { duration: 0 }
    : SPRING.gentle;

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width="100%"
      height="100%"
      style={{ maxWidth: SVG_W, maxHeight: SVG_H }}
    >
      {/* Edges — animate position with nodes */}
      {EDGES.map(([from, to]) => {
        const a = layout[from];
        const b = layout[to];
        if (!a || !b) return null;
        const isProtEdge = from === protagonist || to === protagonist;
        return (
          <motion.line
            key={`${from}-${to}`}
            animate={{ x1: a.x, y1: a.y, x2: b.x, y2: b.y }}
            transition={springTransition}
            stroke={isProtEdge ? "var(--color-accent)" : "var(--color-border)"}
            strokeWidth={isProtEdge ? 1.5 : 1}
            strokeOpacity={isProtEdge ? 0.6 : 0.3}
          />
        );
      })}

      {/* Nodes — protagonist is visually dominant */}
      {NODES.map((node) => {
        const n = layout[node.id];
        if (!n) return null;
        const isProt = node.id === protagonist;
        const nodeRole = isProt ? ("protagonist" as const) : roles[node.id];
        const opacity = roleOpacity(nodeRole);
        const fontSize = roleFontSize(nodeRole);
        const strokeWidth = roleStrokeWidth(nodeRole);

        return (
          <motion.g
            key={node.id}
            animate={{
              x: n.x,
              y: n.y,
              opacity,
            }}
            transition={springTransition}
          >
            <motion.rect
              animate={{
                width: n.w,
                height: n.h,
                x: -n.w / 2,
                y: -n.h / 2,
              }}
              transition={springTransition}
              rx={isProt ? 8 : 4}
              fill={isProt ? "color-mix(in srgb, var(--color-accent) 15%, var(--color-surface-2))" : "var(--color-surface-2)"}
              stroke={isProt ? "var(--color-accent)" : "var(--color-border)"}
              strokeWidth={strokeWidth}
            />
            <motion.text
              animate={{ fontSize }}
              transition={springTransition}
              y={1}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isProt ? "var(--color-text)" : "var(--color-muted)"}
              fontFamily="var(--font-mono)"
              fontWeight={isProt ? 700 : 400}
            >
              {node.label}
            </motion.text>
            {/* Protagonist sublabel */}
            {isProt && (
              <motion.text
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={reducedMotion ? { duration: 0 } : TRANSITION.enterCard}
                y={n.h / 2 + 14}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--color-accent)"
                fontFamily="var(--font-mono)"
                fontSize={9}
                fontWeight={600}
                letterSpacing="0.06em"
              >
                PROTAGONIST
              </motion.text>
            )}
          </motion.g>
        );
      })}
    </svg>
  );
}

// ── Code syntax highlighting ──────────────────────────────────

function SyntacticCode() {
  const lines = SYNTACTIC_CODE.split("\n");

  return (
    <pre className={styles.codeBlock}>
      {lines.map((line, i) => {
        // Section headers (nodes:, edges:, style:)
        if (/^\w+:/.test(line)) {
          return (
            <span key={i} className={styles.codeLine}>
              <span className={styles.codeKey}>{line}</span>{"\n"}
            </span>
          );
        }

        // Values with numbers
        const highlighted = line
          .replace(
            /(id|x|y|w|h|from|to|fill|stroke|fontSize):/g,
            '<key>$1:</key>',
          )
          .replace(
            /(\d+)/g,
            '<num>$1</num>',
          )
          .replace(
            /("[^"]*")/g,
            '<val>$1</val>',
          );

        // Parse the marked-up string into React elements
        const parts: React.ReactNode[] = [];
        let remaining = highlighted;
        let partIdx = 0;
        const tagRe = /<(key|num|val)>(.*?)<\/\1>/;
        let match: RegExpExecArray | null;

        while ((match = tagRe.exec(remaining)) !== null) {
          if (match.index > 0) {
            parts.push(
              <span key={partIdx++} className={styles.codeComment}>
                {remaining.slice(0, match.index)}
              </span>,
            );
          }
          const cls =
            match[1] === "key"
              ? styles.codeKey
              : match[1] === "num"
                ? styles.codeNumber
                : styles.codeValue;
          parts.push(
            <span key={partIdx++} className={cls}>
              {match[2]}
            </span>,
          );
          remaining = remaining.slice(match.index + match[0].length);
        }

        if (remaining) {
          parts.push(
            <span key={partIdx++} className={styles.codeComment}>
              {remaining}
            </span>,
          );
        }

        return (
          <span key={i} className={styles.codeLine}>
            {parts}{"\n"}
          </span>
        );
      })}
    </pre>
  );
}

// ── Main component ────────────────────────────────────────────

export function SemanticPlayground() {
  const reducedMotion = usePrefersReducedMotion();

  const [protagonist, setProtagonist] = useState("session");
  const [roles, setRoles] = useState<Record<string, RoleType>>({
    session: "collaborator",
    skill: "dependency",
    sandbox: "collaborator",
    task: "output",
    model: "dependency",
  });
  const [direction, setDirection] = useState<ReadingDirection>("top-down");
  const [thesis, setThesis] = useState(
    "Session is the stateful hub that connects all primitives",
  );

  const otherNodes = NODES.filter((n) => n.id !== protagonist);

  function handleProtagonistChange(newProt: string) {
    setProtagonist(newProt);
    // Reassign the previous protagonist a sensible default role
    setRoles((prev) => {
      const next = { ...prev };
      next[newProt] = prev[newProt] ?? "collaborator";
      return next;
    });
  }

  function handleRoleChange(nodeId: string, role: RoleType) {
    setRoles((prev) => ({ ...prev, [nodeId]: role }));
  }

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.badge}>Phase 5</span>
        <span className={styles.headerHint}>
          Vocabulary shapes what you build
        </span>
      </div>

      {/* Input panels */}
      <div className={styles.inputPanels}>
        {/* Left — Syntactic API */}
        <div className={`${styles.panel} ${styles.panelSyntactic}`}>
          <div className={styles.panelHeader}>
            <span className={styles.panelLabel}>Syntactic API</span>
            <span className={styles.panelSubtitle}>coordinates + dimensions</span>
          </div>
          <div className={styles.panelBody}>
            <SyntacticCode />
          </div>
        </div>

        {/* Right — Semantic API */}
        <div className={`${styles.panel} ${styles.panelSemantic}`}>
          <div className={styles.panelHeader}>
            <span className={styles.panelLabel}>Semantic API</span>
            <span className={styles.panelSubtitle}>intent + roles</span>
          </div>
          <div className={styles.panelBody}>
            {/* Thesis */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Thesis</label>
              <input
                type="text"
                className={styles.formInput}
                value={thesis}
                onChange={(e) => setThesis(e.target.value)}
              />
            </div>

            {/* Protagonist */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Protagonist</label>
              <select
                className={styles.formSelect}
                value={protagonist}
                onChange={(e) => handleProtagonistChange(e.target.value)}
              >
                {NODES.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Supporting roles */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Supporting Roles</label>
              <div className={styles.roleGrid}>
                {otherNodes.map((node) => (
                  <div key={node.id} className={styles.roleRow}>
                    <span className={styles.roleNodeName}>{node.label}</span>
                    <select
                      className={styles.roleSelect}
                      value={roles[node.id]}
                      onChange={(e) =>
                        handleRoleChange(node.id, e.target.value as RoleType)
                      }
                    >
                      <option value="dependency">dependency</option>
                      <option value="collaborator">collaborator</option>
                      <option value="output">output</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Reading direction */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Reading Direction</label>
              <div className={styles.radioGroup}>
                {(["top-down", "center-out", "left-right"] as ReadingDirection[]).map(
                  (dir) => (
                    <button
                      key={dir}
                      type="button"
                      className={styles.radioOption}
                      data-selected={direction === dir}
                      onClick={() => setDirection(dir)}
                    >
                      <span className={styles.radioDot}>
                        <span className={styles.radioDotInner} />
                      </span>
                      {dir}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview section */}
      <div className={styles.previewSection}>
        {/* Syntactic preview */}
        <div className={`${styles.previewPanel} ${styles.previewSyntactic}`}>
          <div className={styles.previewHeader}>Result: syntactic</div>
          <div className={styles.svgArea}>
            <SyntacticPreview />
          </div>
        </div>

        {/* Semantic preview */}
        <div className={`${styles.previewPanel} ${styles.previewSemantic}`}>
          <div className={styles.previewHeader}>Result: semantic</div>
          <div className={styles.svgArea}>
            <SemanticPreview
              protagonist={protagonist}
              roles={roles}
              direction={direction}
              reducedMotion={reducedMotion}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
