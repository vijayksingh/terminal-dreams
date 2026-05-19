"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import type { FlowNode, FlowEdge } from "@/mdx/shared/flow-diagram";
import type { ArchStep } from "./types";
import styles from "./styles.module.css";

type NodePhase = "future" | "active" | "visited" | "idle";

type DiagramCanvasProps = {
  viewBox: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  protagonist?: string;
  steps: ArchStep[];
  currentStepIdx: number;
  reducedMotion: boolean;
  /**
   * When false (counterfactual mode), the API node's sublabel renders
   * with strikethrough on the `/:id` portion — the endpoint that
   * doesn't exist without the type split.
   */
  splitEnabled: boolean;
};

function nodePhase(
  nodeId: string,
  steps: ArchStep[],
  currentStepIdx: number,
): NodePhase {
  const stepNodeIds = steps.map((s) => s.nodeId);
  const idxInPath = stepNodeIds.indexOf(nodeId);
  if (idxInPath === -1) return "idle";
  if (idxInPath === currentStepIdx) return "active";
  if (idxInPath < currentStepIdx) return "visited";
  return "future";
}

function edgePhase(
  from: string,
  to: string,
  steps: ArchStep[],
  currentStepIdx: number,
): NodePhase {
  for (let i = 1; i < steps.length; i++) {
    if (steps[i - 1].nodeId === from && steps[i].nodeId === to) {
      if (i === currentStepIdx) return "active";
      if (i < currentStepIdx) return "visited";
      return "future";
    }
  }
  return "idle";
}

function curvedPath(
  from: FlowNode,
  to: FlowNode,
  pathOverride?: string,
  midpointOverride?: { x: number; y: number },
): {
  d: string;
  midX: number;
  midY: number;
  fromCx: number;
  fromCy: number;
  toCx: number;
  toCy: number;
} {
  const fromCx = from.x + (from.w ?? 100) / 2;
  const fromCy = from.y + (from.h ?? 40) / 2;
  const toCx = to.x + (to.w ?? 100) / 2;
  const toCy = to.y + (to.h ?? 40) / 2;

  if (pathOverride) {
    const mid = midpointOverride ?? { x: (fromCx + toCx) / 2, y: (fromCy + toCy) / 2 };
    return {
      d: pathOverride,
      midX: mid.x,
      midY: mid.y,
      fromCx,
      fromCy,
      toCx,
      toCy,
    };
  }

  // Direction: down vs up
  const isDownward = toCy > fromCy;

  const x1 = fromCx;
  const y1 = isDownward ? from.y + (from.h ?? 40) : from.y;
  const x2 = toCx;
  const y2 = isDownward ? to.y : to.y + (to.h ?? 40);

  const midY = (y1 + y2) / 2;

  // For lateral (sibling) hops, fall back to side anchors
  if (Math.abs(fromCy - toCy) < 8) {
    const xMid = (fromCx + toCx) / 2;
    return {
      d: `M${x1},${fromCy} C${xMid},${fromCy} ${xMid},${toCy} ${x2},${toCy}`,
      midX: xMid,
      midY: fromCy,
      fromCx,
      fromCy,
      toCx,
      toCy,
    };
  }

  return {
    d: `M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`,
    midX: (x1 + x2) / 2,
    midY,
    fromCx,
    fromCy,
    toCx,
    toCy,
  };
}

// ── Phase-driven colors ──────────────────────────────────────────────

const NODE_FILL: Record<NodePhase, string> = {
  idle: "var(--color-surface)",
  future: "var(--color-surface)",
  active: "var(--color-surface)",
  visited: "var(--color-surface)",
};

const NODE_STROKE: Record<NodePhase, string> = {
  idle: "color-mix(in srgb, var(--color-border) 90%, transparent)",
  future: "color-mix(in srgb, var(--color-border) 60%, transparent)",
  active: "var(--color-accent)",
  visited: "var(--diagram-layer-9)",
};

const NODE_OPACITY: Record<NodePhase, number> = {
  idle: 0.85,
  future: 0.55,
  active: 1,
  visited: 0.9,
};

const EDGE_STROKE: Record<NodePhase, string> = {
  idle: "color-mix(in srgb, var(--color-muted) 50%, transparent)",
  future: "color-mix(in srgb, var(--color-muted) 30%, transparent)",
  active: "var(--color-accent)",
  visited: "color-mix(in srgb, var(--diagram-layer-9) 70%, transparent)",
};

export function DiagramCanvas({
  viewBox,
  nodes,
  edges,
  protagonist,
  steps,
  currentStepIdx,
  reducedMotion,
  splitEnabled,
}: DiagramCanvasProps) {
  const nodeMap: Record<string, FlowNode> = Object.fromEntries(
    nodes.map((n) => [n.id, n]),
  );

  // Resolve current step and active edge
  const currentStep = steps[currentStepIdx];
  const prevStep = currentStepIdx > 0 ? steps[currentStepIdx - 1] : null;
  const activeEdgeFromTo = prevStep
    ? { from: prevStep.nodeId, to: currentStep.nodeId }
    : null;

  // Find geometry for the active payload chip
  let chipGeom: { fromCx: number; fromCy: number; midX: number; midY: number; toCx: number; toCy: number } | null = null;
  if (activeEdgeFromTo && currentStep.payload) {
    const f = nodeMap[activeEdgeFromTo.from];
    const t = nodeMap[activeEdgeFromTo.to];
    if (f && t) {
      const matchedEdge = edges.find(
        (e) => e.from === activeEdgeFromTo.from && e.to === activeEdgeFromTo.to,
      );
      const g = curvedPath(f, t, matchedEdge?.pathOverride, matchedEdge?.midpointOverride);
      chipGeom = {
        fromCx: g.fromCx,
        fromCy: g.fromCy,
        midX: g.midX,
        midY: g.midY,
        toCx: g.toCx,
        toCy: g.toCy,
      };
    }
  }

  return (
    <div className={styles.canvasWrap}>
      <svg
        viewBox={viewBox}
        className={styles.canvasSvg}
        role="img"
        aria-label={`Architecture diagram, step ${currentStepIdx + 1} of ${steps.length}: ${currentStep?.caption ?? ""}`}
      >
        <defs>
          <filter id="aspe-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="blur" />
            <feFlood floodColor="var(--color-accent)" floodOpacity="0.45" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="aspe-arrow-future" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="var(--color-muted)" opacity="0.4" />
          </marker>
          <marker id="aspe-arrow-active" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="var(--color-accent)" />
          </marker>
          <marker id="aspe-arrow-visited" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="var(--diagram-layer-9)" opacity="0.7" />
          </marker>
          <marker id="aspe-arrow-idle" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="var(--color-muted)" opacity="0.5" />
          </marker>
        </defs>

        {/* Edges first (behind nodes) */}
        {edges.map((edge, i) => {
          const from = nodeMap[edge.from];
          const to = nodeMap[edge.to];
          if (!from || !to) return null;
          const { d } = curvedPath(from, to, edge.pathOverride, edge.midpointOverride);
          const phase = edgePhase(edge.from, edge.to, steps, currentStepIdx);
          const stroke = EDGE_STROKE[phase];
          const dashed = !!edge.dashed;
          const isActive = phase === "active";

          return (
            <g key={`edge-${i}`}>
              {/* Glow underlay for active edges */}
              {isActive && (
                <path
                  d={d}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth={6}
                  opacity={0.18}
                  filter="url(#aspe-glow)"
                />
              )}
              <motion.path
                d={d}
                fill="none"
                stroke={stroke}
                strokeWidth={isActive ? 2 : 1.5}
                strokeDasharray={dashed ? "3 4" : isActive ? "5 4" : undefined}
                markerEnd={`url(#aspe-arrow-${phase})`}
                animate={
                  isActive && !reducedMotion
                    ? { strokeDashoffset: [0, -18] }
                    : { strokeDashoffset: 0 }
                }
                transition={
                  isActive && !reducedMotion
                    ? { duration: 0.9, repeat: Infinity, ease: "linear" }
                    : { duration: 0 }
                }
              />
            </g>
          );
        })}

        {/* Anticipation pulse on the node we just left (storyboard beat A) */}
        <AnimatePresence>
          {prevStep && !reducedMotion && (() => {
            const sourceNode = nodeMap[prevStep.nodeId];
            if (!sourceNode) return null;
            const sw = sourceNode.w ?? 100;
            const sh = sourceNode.h ?? 40;
            return (
              <motion.rect
                key={`anticipation-${currentStepIdx}-${prevStep.nodeId}`}
                x={sourceNode.x}
                y={sourceNode.y}
                width={sw}
                height={sh}
                rx={7}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={2}
                initial={{ opacity: 0.65, scale: 1 }}
                animate={{ opacity: 0, scale: 1.18 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                style={{
                  transformOrigin: `${sourceNode.x + sw / 2}px ${sourceNode.y + sh / 2}px`,
                  pointerEvents: "none",
                }}
              />
            );
          })()}
        </AnimatePresence>

        {/* Nodes */}
        {nodes.map((node) => {
          const phase = nodePhase(node.id, steps, currentStepIdx);
          const isProtagonist = node.id === protagonist;
          const stroke = NODE_STROKE[phase];
          const w = node.w ?? 100;
          const h = node.h ?? 40;
          const filterId = phase === "active" ? "url(#aspe-glow)" : undefined;
          // Beat C: the target node ramps up only when the chip arrives.
          // Visited (just-left) and others react instantly.
          const isBecomingActive = phase === "active";
          const phaseTransition = reducedMotion
            ? { duration: 0 }
            : isBecomingActive
              ? { ...SPRING.gentle, delay: 0.3 }
              : SPRING.quick;

          return (
            <motion.g
              key={node.id}
              animate={{
                opacity: NODE_OPACITY[phase],
                scale: phase === "active" && !reducedMotion ? 1.04 : 1,
              }}
              transition={phaseTransition}
              style={{ transformOrigin: `${node.x + w / 2}px ${node.y + h / 2}px` }}
            >
              <rect
                x={node.x}
                y={node.y}
                width={w}
                height={h}
                rx={7}
                fill={NODE_FILL[phase]}
                stroke={stroke}
                strokeWidth={isProtagonist || phase === "active" ? 2 : 1.5}
                filter={filterId}
              />
              {/* Left accent strip */}
              <rect
                x={node.x}
                y={node.y}
                width={3.5}
                height={h}
                rx={1.5}
                fill={stroke}
              />
              <text
                x={node.x + 9}
                y={node.y + 11}
                className={styles.nodeLabel}
                fill={phase === "active" ? "var(--color-accent)" : "var(--color-text)"}
              >
                {node.label}
              </text>
              {node.sublabel &&
                (node.id === "api" && !splitEnabled ? (
                  // Counterfactual: strike through the /:id endpoint to
                  // signal that the split-driven endpoint no longer exists.
                  <text
                    x={node.x + 9}
                    y={node.y + 19}
                    className={styles.nodeSublabel}
                    fill="var(--color-muted)"
                  >
                    /gallery ·{" "}
                    <tspan
                      textDecoration="line-through"
                      fill="color-mix(in srgb, var(--color-muted) 60%, transparent)"
                    >
                      /:id
                    </tspan>{" "}
                    · /srcset
                  </text>
                ) : (
                  <text
                    x={node.x + 9}
                    y={node.y + 19}
                    className={styles.nodeSublabel}
                    fill="var(--color-muted)"
                  >
                    {node.sublabel}
                  </text>
                ))}
            </motion.g>
          );
        })}

        {/* Payload chip on active edge */}
        <AnimatePresence mode="popLayout">
          {chipGeom && currentStep.payload && (
            <motion.g
              key={`chip-${currentStepIdx}-${currentStep.payload.type.name}`}
              initial={
                reducedMotion
                  ? { opacity: 1 }
                  : { x: chipGeom.fromCx, y: chipGeom.fromCy, opacity: 0 }
              }
              animate={
                reducedMotion
                  ? { opacity: 1 }
                  : { x: chipGeom.midX, y: chipGeom.midY, opacity: 1 }
              }
              exit={
                reducedMotion
                  ? { opacity: 0 }
                  : { x: chipGeom.toCx, y: chipGeom.toCy, opacity: 0 }
              }
              transition={reducedMotion ? { duration: 0 } : { ...SPRING.gentle, opacity: TRANSITION.enterCard }}
            >
              <PayloadChip typeName={currentStep.payload.type.name} />
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
}

// ── Payload chip ─────────────────────────────────────────────────────

function PayloadChip({ typeName }: { typeName: string }) {
  // Compute width from text length (rough but stable)
  const w = Math.max(50, typeName.length * 5.4 + 16);
  const h = 16;
  return (
    <g>
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={h / 2}
        fill="var(--color-bg)"
        stroke="var(--color-accent)"
        strokeWidth={1.25}
      />
      <text
        x={0}
        y={3.5}
        textAnchor="middle"
        className={styles.chipLabel}
      >
        {typeName}
      </text>
    </g>
  );
}
