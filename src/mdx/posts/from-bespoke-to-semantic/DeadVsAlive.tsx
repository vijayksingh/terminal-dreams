"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { SPRING } from "@/lib/motion";
import styles from "./dead-vs-alive.module.css";

// ── Data ────────────────────────────────────────────────────────
// The SAME five nodes and edges power both diagrams. The only
// difference is how craft decisions (size, weight, spacing,
// saturation) are applied — or not.

type NodeDef = {
  id: string;
  label: string;
};

type EdgeDef = {
  from: string;
  to: string;
};

const NODES: NodeDef[] = [
  { id: "session", label: "Session" },
  { id: "skill", label: "Skill" },
  { id: "sandbox", label: "Sandbox" },
  { id: "task", label: "Task" },
  { id: "model", label: "Model" },
];

const EDGES: EdgeDef[] = [
  { from: "session", to: "skill" },
  { from: "session", to: "sandbox" },
  { from: "session", to: "task" },
  { from: "session", to: "model" },
  { from: "task", to: "model" },
];

// ── Layout: "dead" (uniform grid) ──────────────────────────────
// Rigid 2-row grid. Session has no spatial privilege.

const CANVAS = { w: 320, h: 220 };

const DEAD_POSITIONS: Record<string, { x: number; y: number }> = {
  session: { x: 160, y: 56 },
  skill: { x: 64, y: 56 },
  sandbox: { x: 256, y: 56 },
  task: { x: 96, y: 156 },
  model: { x: 224, y: 156 },
};

const DEAD_NODE_SIZE = { w: 80, h: 32 };
const DEAD_FONT_SIZE = 12;
const DEAD_FONT_WEIGHT = 400;
const DEAD_STROKE_WIDTH = 1;
const DEAD_EDGE_OPACITY = 0.4;
const DEAD_BORDER_OPACITY = 0.5;
const DEAD_FILL_OPACITY = 0;

// ── Layout: "alive" (crafted hierarchy) ────────────────────────
// Session is the protagonist: larger, centered, more saturated.
// Skill + Sandbox are grouped tightly to the left,
// Task + Model grouped to the right, with a wider gap between groups.

const ALIVE_POSITIONS: Record<string, { x: number; y: number }> = {
  session: { x: 160, y: 110 },
  skill: { x: 68, y: 46 },
  sandbox: { x: 68, y: 170 },
  task: { x: 256, y: 46 },
  model: { x: 256, y: 170 },
};

const ALIVE_NODE_SIZES: Record<string, { w: number; h: number }> = {
  session: { w: 104, h: 40 },
  skill: { w: 76, h: 28 },
  sandbox: { w: 76, h: 28 },
  task: { w: 76, h: 28 },
  model: { w: 76, h: 28 },
};

const ALIVE_FONT_SIZES: Record<string, number> = {
  session: 15,
  skill: 11.5,
  sandbox: 11.5,
  task: 11.5,
  model: 11.5,
};

const ALIVE_FONT_WEIGHTS: Record<string, number> = {
  session: 600,
  skill: 400,
  sandbox: 400,
  task: 400,
  model: 400,
};

const ALIVE_STROKE_WIDTHS: Record<string, number> = {
  "session->skill": 1.5,
  "session->sandbox": 1.5,
  "session->task": 1.5,
  "session->model": 1.5,
  "task->model": 0.75,
};

const ALIVE_EDGE_OPACITIES: Record<string, number> = {
  "session->skill": 0.7,
  "session->sandbox": 0.7,
  "session->task": 0.7,
  "session->model": 0.7,
  "task->model": 0.25,
};

const ALIVE_BORDER_OPACITIES: Record<string, number> = {
  session: 1,
  skill: 0.45,
  sandbox: 0.45,
  task: 0.45,
  model: 0.45,
};

const ALIVE_FILL_OPACITIES: Record<string, number> = {
  session: 0.08,
  skill: 0,
  sandbox: 0,
  task: 0,
  model: 0,
};

// ── Checklist items ────────────────────────────────────────────

const CHECKLIST = [
  "Protagonist identified (Session)",
  "Type scale applied (15px / 12px)",
  "Visual weight distributed",
  "Grouping through white space",
  "Edge hierarchy established",
];

// ── Transition config ──────────────────────────────────────────

const NODE_TRANSITION = {
  type: "spring" as const,
  stiffness: SPRING.gentle.stiffness,
  damping: SPRING.gentle.damping,
};

// ── Helpers ─────────────────────────────────────────────────────

function edgeKey(e: EdgeDef) {
  return `${e.from}->${e.to}`;
}

/**
 * Compute the point where a line from (cx,cy) to (tx,ty) intersects
 * the border of a rect centered at (cx,cy) with half-sizes (hw,hh).
 */
function rectEdgePoint(
  cx: number,
  cy: number,
  hw: number,
  hh: number,
  tx: number,
  ty: number
) {
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // Which side does the ray hit first?
  const scaleX = hw / (absDx || 1);
  const scaleY = hh / (absDy || 1);
  const scale = Math.min(scaleX, scaleY);

  return { x: cx + dx * scale, y: cy + dy * scale };
}

// ── SVG Diagram renderer ────────────────────────────────────────

type DiagramProps = {
  alive: boolean;
  reducedMotion: boolean;
};

function Diagram({ alive, reducedMotion }: DiagramProps) {
  const rx = 6;

  return (
    <svg
      viewBox={`0 0 ${CANVAS.w} ${CANVAS.h}`}
      width="100%"
      height="100%"
      style={{ maxWidth: CANVAS.w, maxHeight: CANVAS.h }}
      aria-label={`Architecture diagram — ${alive ? "with hierarchy" : "without hierarchy"}`}
      role="img"
    >
      {/* Edges */}
      {EDGES.map((edge) => {
        const ek = edgeKey(edge);

        const fromPos = alive
          ? ALIVE_POSITIONS[edge.from]
          : DEAD_POSITIONS[edge.from];
        const toPos = alive
          ? ALIVE_POSITIONS[edge.to]
          : DEAD_POSITIONS[edge.to];

        const fromSize = alive
          ? ALIVE_NODE_SIZES[edge.from]
          : DEAD_NODE_SIZE;
        const toSize = alive ? ALIVE_NODE_SIZES[edge.to] : DEAD_NODE_SIZE;

        const p1 = rectEdgePoint(
          fromPos.x,
          fromPos.y,
          fromSize.w / 2 + 2,
          fromSize.h / 2 + 2,
          toPos.x,
          toPos.y
        );
        const p2 = rectEdgePoint(
          toPos.x,
          toPos.y,
          toSize.w / 2 + 2,
          toSize.h / 2 + 2,
          fromPos.x,
          fromPos.y
        );

        const strokeWidth = alive
          ? ALIVE_STROKE_WIDTHS[ek] ?? DEAD_STROKE_WIDTH
          : DEAD_STROKE_WIDTH;
        const opacity = alive
          ? ALIVE_EDGE_OPACITIES[ek] ?? DEAD_EDGE_OPACITY
          : DEAD_EDGE_OPACITY;

        if (reducedMotion) {
          return (
            <line
              key={ek}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="var(--color-muted)"
              strokeWidth={strokeWidth}
              opacity={opacity}
              strokeLinecap="round"
            />
          );
        }

        return (
          <motion.line
            key={ek}
            animate={{
              x1: p1.x,
              y1: p1.y,
              x2: p2.x,
              y2: p2.y,
              strokeWidth,
              opacity,
            }}
            transition={NODE_TRANSITION}
            stroke="var(--color-muted)"
            strokeLinecap="round"
          />
        );
      })}

      {/* Nodes */}
      {NODES.map((node) => {
        const pos = alive
          ? ALIVE_POSITIONS[node.id]
          : DEAD_POSITIONS[node.id];
        const size = alive
          ? ALIVE_NODE_SIZES[node.id]
          : DEAD_NODE_SIZE;
        const fontSize = alive
          ? ALIVE_FONT_SIZES[node.id]
          : DEAD_FONT_SIZE;
        const fontWeight = alive
          ? ALIVE_FONT_WEIGHTS[node.id]
          : DEAD_FONT_WEIGHT;
        const borderOpacity = alive
          ? ALIVE_BORDER_OPACITIES[node.id]
          : DEAD_BORDER_OPACITY;
        const fillOpacity = alive
          ? ALIVE_FILL_OPACITIES[node.id]
          : DEAD_FILL_OPACITY;

        if (reducedMotion) {
          return (
            <g key={node.id}>
              <rect
                x={pos.x - size.w / 2}
                y={pos.y - size.h / 2}
                width={size.w}
                height={size.h}
                rx={rx}
                fill="var(--color-accent)"
                fillOpacity={fillOpacity}
                stroke="var(--color-accent)"
                strokeWidth={1}
                opacity={borderOpacity}
              />
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--color-text)"
                fontFamily="var(--font-mono)"
                fontSize={fontSize}
                fontWeight={fontWeight}
                opacity={alive && node.id !== "session" ? 0.7 : 1}
              >
                {node.label}
              </text>
            </g>
          );
        }

        return (
          <g key={node.id}>
            <motion.rect
              animate={{
                x: pos.x - size.w / 2,
                y: pos.y - size.h / 2,
                width: size.w,
                height: size.h,
                fillOpacity,
                opacity: borderOpacity,
              }}
              transition={NODE_TRANSITION}
              rx={rx}
              fill="var(--color-accent)"
              stroke="var(--color-accent)"
              strokeWidth={1}
            />
            <motion.text
              animate={{
                x: pos.x,
                y: pos.y,
                fontSize,
                fontWeight,
                opacity: alive && node.id !== "session" ? 0.7 : 1,
              }}
              transition={NODE_TRANSITION}
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--color-text)"
              fontFamily="var(--font-mono)"
            >
              {node.label}
            </motion.text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Main component ──────────────────────────────────────────────

export function DeadVsAlive() {
  const [hierarchyOn, setHierarchyOn] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const toggle = useCallback(() => setHierarchyOn((prev) => !prev), []);

  return (
    <div className={styles.wrapper}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <span className={styles.toolbarLabel}>Hierarchy</span>
          <button
            type="button"
            className={styles.toggleTrack}
            data-on={hierarchyOn}
            onClick={toggle}
            aria-pressed={hierarchyOn}
            aria-label="Toggle hierarchy"
          >
            <span className={styles.toggleThumb} />
          </button>
        </div>
      </div>

      {/* Side-by-side diagrams */}
      <div className={styles.panels}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>Without hierarchy</div>
          <div className={styles.svgArea}>
            <Diagram alive={false} reducedMotion={reducedMotion} />
          </div>
        </div>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>With hierarchy</div>
          <div className={styles.svgArea}>
            <Diagram alive={hierarchyOn} reducedMotion={reducedMotion} />
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className={styles.checklist}>
        {CHECKLIST.map((item) => (
          <span
            key={item}
            className={styles.checkItem}
            data-active={hierarchyOn}
          >
            <span className={styles.checkIcon} data-active={hierarchyOn}>
              {hierarchyOn ? "✓" : ""}
            </span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
