"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { TRANSITION, SPRING } from "@/lib/motion";
import styles from "./bespoke-gallery.module.css";

// ── Types ──────────────────────────────────────────────────
type Vec2 = { x: number; y: number };
type NodeDef = { id: string; label: string; pos: Vec2; w: number; h: number };
type EdgeDef = { from: string; to: string };
type Annotation = { cx: number; cy: number; r: number; label: string };

type DiagramDef = {
  nodes: NodeDef[];
  edges: EdgeDef[];
  annotation: Annotation;
  nodeStyle: (n: NodeDef) => React.SVGProps<SVGRectElement>;
  labelStyle: React.SVGProps<SVGTextElement>;
  edgeStyle: React.SVGProps<SVGLineElement>;
  renderEdge?: (e: EdgeDef, nodes: NodeDef[]) => React.ReactNode;
  renderExtra?: () => React.ReactNode;
};

// ── Shared constants ───────────────────────────────────────
const VB_W = 220;
const VB_H = 165;

function findNode(nodes: NodeDef[], id: string) {
  return nodes.find((n) => n.id === id)!;
}

// ── Diagram 1: Text clipping ──────────────────────────────
// Uses small boxes with long labels and sharp corners — clinical feel.
const diagram1: DiagramDef = {
  nodes: [
    { id: "api", label: "API Gateway", pos: { x: 110, y: 22 }, w: 72, h: 24 },
    { id: "cfg", label: "Configuration Manager", pos: { x: 110, y: 62 }, w: 72, h: 24 },
    { id: "db", label: "Database", pos: { x: 50, y: 108 }, w: 60, h: 24 },
    { id: "cache", label: "Cache", pos: { x: 170, y: 108 }, w: 52, h: 24 },
    { id: "log", label: "Logger", pos: { x: 110, y: 145 }, w: 56, h: 22 },
  ],
  edges: [
    { from: "api", to: "cfg" },
    { from: "cfg", to: "db" },
    { from: "cfg", to: "cache" },
    { from: "db", to: "log" },
    { from: "cache", to: "log" },
  ],
  annotation: { cx: 110, cy: 62, r: 52, label: "text clipping" },
  nodeStyle: () => ({
    rx: 2,
    fill: "var(--color-surface-2)",
    stroke: "#6e7681",
    strokeWidth: 1,
  }),
  labelStyle: {
    fontSize: 9,
    fill: "var(--color-text)",
    fontFamily: "var(--font-sans)",
  },
  edgeStyle: { stroke: "#6e7681", strokeWidth: 1 },
};

// ── Diagram 2: Edge overlap ───────────────────────────────
// Rounded, larger nodes with a teal palette — different vibe entirely.
const diagram2: DiagramDef = {
  nodes: [
    { id: "client", label: "Client", pos: { x: 40, y: 22 }, w: 62, h: 26 },
    { id: "server", label: "Server", pos: { x: 170, y: 22 }, w: 62, h: 26 },
    { id: "auth", label: "Auth", pos: { x: 110, y: 70 }, w: 56, h: 26 },
    { id: "store", label: "Store", pos: { x: 110, y: 118 }, w: 56, h: 26 },
    { id: "notify", label: "Notify", pos: { x: 40, y: 145 }, w: 56, h: 22 },
  ],
  edges: [
    { from: "client", to: "auth" },
    { from: "server", to: "auth" },
    { from: "auth", to: "store" },
    { from: "client", to: "notify" },
  ],
  annotation: { cx: 110, cy: 72, r: 46, label: "edge overlap" },
  nodeStyle: () => ({
    rx: 10,
    fill: "oklch(22% 0.02 180)",
    stroke: "oklch(50% 0.1 180)",
    strokeWidth: 1.2,
  }),
  labelStyle: {
    fontSize: 10.5,
    fill: "oklch(88% 0.03 180)",
    fontFamily: "var(--font-mono)",
  },
  edgeStyle: { stroke: "oklch(50% 0.1 180)", strokeWidth: 1.2 },
  // The "bug": edge from client to notify goes straight through the auth node
  renderEdge: (e, nodes) => {
    const from = findNode(nodes, e.from);
    const to = findNode(nodes, e.to);
    // Default straight line — the client->notify edge slices through "Auth"
    return (
      <line
        key={`${e.from}-${e.to}`}
        x1={from.pos.x}
        y1={from.pos.y + from.h / 2}
        x2={to.pos.x}
        y2={to.pos.y - to.h / 2}
        stroke="oklch(50% 0.1 180)"
        strokeWidth={1.2}
      />
    );
  },
};

// ── Diagram 3: No hover states ────────────────────────────
// Warm amber palette, pill shapes — looks clickable but isn't.
const diagram3: DiagramDef = {
  nodes: [
    { id: "entry", label: "Entry", pos: { x: 110, y: 22 }, w: 58, h: 24 },
    { id: "parse", label: "Parser", pos: { x: 50, y: 65 }, w: 58, h: 24 },
    { id: "validate", label: "Validate", pos: { x: 170, y: 65 }, w: 62, h: 24 },
    { id: "transform", label: "Transform", pos: { x: 110, y: 110 }, w: 66, h: 24 },
    { id: "output", label: "Output", pos: { x: 110, y: 148 }, w: 54, h: 22 },
  ],
  edges: [
    { from: "entry", to: "parse" },
    { from: "entry", to: "validate" },
    { from: "parse", to: "transform" },
    { from: "validate", to: "transform" },
    { from: "transform", to: "output" },
  ],
  annotation: { cx: 110, cy: 88, r: 70, label: "no hover states" },
  nodeStyle: () => ({
    rx: 12,
    fill: "oklch(24% 0.03 60)",
    stroke: "oklch(55% 0.12 60)",
    strokeWidth: 1,
  }),
  labelStyle: {
    fontSize: 9.5,
    fill: "oklch(85% 0.06 60)",
    fontFamily: "var(--font-sans)",
    fontWeight: 500,
  },
  edgeStyle: { stroke: "oklch(45% 0.08 60)", strokeWidth: 1 },
};

// ── SVG renderer ───────────────────────────────────────────

function DiagramSvg({
  def,
  showAnnotation,
  reducedMotion,
  diagramIndex,
}: {
  def: DiagramDef;
  showAnnotation: boolean;
  reducedMotion: boolean;
  diagramIndex: number;
}) {
  const { nodes, edges, annotation, nodeStyle, labelStyle, edgeStyle, renderEdge, renderExtra } = def;

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="w-full h-full"
      role="img"
      aria-label={`Architecture diagram ${diagramIndex + 1} with ${annotation.label} issue`}
    >
      {/* Edges */}
      {edges.map((e) => {
        if (renderEdge) return renderEdge(e, nodes);
        const from = findNode(nodes, e.from);
        const to = findNode(nodes, e.to);
        return (
          <line
            key={`${e.from}-${e.to}`}
            x1={from.pos.x}
            y1={from.pos.y + from.h / 2}
            x2={to.pos.x}
            y2={to.pos.y - to.h / 2}
            {...edgeStyle}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((n) => {
        // Diagram 1: deliberately clip text on the "cfg" node
        const clip = diagramIndex === 0 && n.id === "cfg";
        const clipId = `clip-${n.id}-${diagramIndex}`;

        return (
          <g key={n.id}>
            {clip && (
              <defs>
                <clipPath id={clipId}>
                  <rect
                    x={n.pos.x - n.w / 2}
                    y={n.pos.y - n.h / 2}
                    width={n.w}
                    height={n.h}
                  />
                </clipPath>
              </defs>
            )}
            <rect
              x={n.pos.x - n.w / 2}
              y={n.pos.y - n.h / 2}
              width={n.w}
              height={n.h}
              // Diagram 3 nodes look clickable
              {...(diagramIndex === 2 ? { cursor: "pointer" } : {})}
              {...nodeStyle(n)}
            />
            <text
              x={n.pos.x}
              y={n.pos.y + 3.5}
              textAnchor="middle"
              clipPath={clip ? `url(#${clipId})` : undefined}
              {...labelStyle}
            >
              {n.label}
            </text>
          </g>
        );
      })}

      {renderExtra?.()}

      {/* Annotation overlay */}
      <AnimatePresence>
        {showAnnotation && (
          <motion.g
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
            transition={reducedMotion ? { duration: 0 } : SPRING.gentle}
          >
            <circle
              cx={annotation.cx}
              cy={annotation.cy}
              r={annotation.r}
              fill="none"
              stroke="oklch(65% 0.2 25)"
              strokeWidth={1.5}
              strokeDasharray="5 3"
            />
            <rect
              x={annotation.cx - 36}
              y={annotation.cy + annotation.r + 2}
              width={72}
              height={14}
              rx={3}
              fill="oklch(30% 0.06 25)"
              stroke="oklch(65% 0.2 25)"
              strokeWidth={0.8}
            />
            <text
              x={annotation.cx}
              y={annotation.cy + annotation.r + 12}
              textAnchor="middle"
              fontSize={7.5}
              fill="oklch(90% 0.05 25)"
              fontFamily="var(--font-mono)"
            >
              {annotation.label}
            </text>
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────

export function BespokeGallery() {
  const [highlightIssues, setHighlightIssues] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const diagrams = [diagram1, diagram2, diagram3];
  const captions = ["Article 1", "Article 2", "Article 3"];

  return (
    <div>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <button
          type="button"
          onClick={() => setHighlightIssues((v) => !v)}
          className={`
            inline-flex items-center gap-2 px-3 py-1.5
            rounded-md text-xs font-mono
            border transition-colors
            ${
              highlightIssues
                ? "bg-red-950/40 border-red-800/60 text-red-300"
                : "bg-surface border-border text-muted-foreground hover:text-foreground"
            }
          `}
          aria-pressed={highlightIssues}
        >
          <span
            className={`
              inline-block w-2 h-2 rounded-full
              ${highlightIssues ? "bg-red-400" : "bg-muted-foreground/40"}
            `}
          />
          Highlight Issues
        </button>
      </div>

      {/* Gallery grid */}
      <div className={styles.gallery}>
        {diagrams.map((def, i) => (
          <div key={i} className={styles.diagramCard}>
            <div
              className={`${styles.svgWrapper} border`}
              style={{
                background: "var(--color-bg)",
                borderColor: "var(--color-border)",
              }}
            >
              <DiagramSvg
                def={def}
                showAnnotation={highlightIssues}
                reducedMotion={reducedMotion}
                diagramIndex={i}
              />
            </div>
            <span className={styles.caption}>{captions[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
