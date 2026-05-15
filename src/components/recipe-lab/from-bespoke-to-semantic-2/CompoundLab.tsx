"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION, STAGGER, DURATION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { DialSegment, DialChips } from "@/components/ui/dialkit";
import { LAYER_COLORS as LC } from "../diagram-colors";
import { LabSvgDefs } from "../shared/LabSvgDefs";
import { arrowheadPath, ARROW_LEN } from "../shared/geometry";
import type { EdgeGeometry } from "../shared/geometry";

// ── Types ──────────────────────────────────────────────────

type Vec2 = { x: number; y: number };
type Shape = "rect" | "pill" | "diamond" | "circle";
type LayerName = "types" | "geometry" | "primitives" | "composition";

type DemoNode = {
  id: string;
  label: string;
  brief: string;
  pos: Vec2;
  w: number;
  h: number;
  shape?: Shape;
  role?: "protagonist" | "supporting" | "context";
  layerDetails: Record<LayerName, string>;
};

type DemoEdge = {
  from: string;
  to: string;
  route?: "straight" | "orthogonal";
};

// ── Demo data ──────────────────────────────────────────────

const NODES: DemoNode[] = [
  {
    id: "session", label: "Session", brief: "Central hub — message history with compaction",
    pos: { x: 140, y: 30 }, w: 80, h: 28, shape: "pill", role: "protagonist",
    layerDetails: {
      types: 'shape: "pill", role: "protagonist"',
      geometry: "pill boundary → arc exit points, 1.15× scale from role",
      primitives: "FlowNodeShape renders pill, FlowNodeHitArea wraps with 44×44 touch target",
      composition: "Protagonist glow, accent fill, staggered first in arc",
    },
  },
  {
    id: "skill", label: "Skill", brief: "Markdown instruction sets loaded at startup",
    pos: { x: 60, y: 80 }, w: 62, h: 26, shape: "rect", role: "supporting",
    layerDetails: {
      types: 'shape: "rect", role: "supporting"',
      geometry: "rect boundary → standard exit points, 1.0× scale",
      primitives: "FlowNodeShape renders rect with rx:3, standard hit area",
      composition: "Normal weight, keyboard-navigable, dimmed when sibling selected",
    },
  },
  {
    id: "role", label: "Role", brief: "System prompt and behavior constraints",
    pos: { x: 220, y: 80 }, w: 58, h: 26, shape: "rect", role: "supporting",
    layerDetails: {
      types: 'shape: "rect", role: "supporting"',
      geometry: "rect boundary → standard exit points, 1.0× scale",
      primitives: "FlowNodeShape renders rect, FlowNodeLabel auto-scales text to fit",
      composition: "Normal weight, participates in arc stagger order",
    },
  },
  {
    id: "task", label: "Task", brief: "Stateful operation tracker",
    pos: { x: 90, y: 135 }, w: 58, h: 26, shape: "diamond", role: "supporting",
    layerDetails: {
      types: 'shape: "diamond", role: "supporting"',
      geometry: "diamond boundary → angled exit math (ray-diamond intersection)",
      primitives: "FlowNodeShape renders diamond <path>, edges attach at angled boundary",
      composition: "Diamond shape signals decision/branching semantically",
    },
  },
  {
    id: "sandbox", label: "Sandbox", brief: "Isolated execution environment",
    pos: { x: 195, y: 135 }, w: 66, h: 26, shape: "rect", role: "context",
    layerDetails: {
      types: 'shape: "rect", role: "context"',
      geometry: "rect boundary, 0.9× scale from context role → visually recedes",
      primitives: "FlowNodeShape renders smaller rect, lighter stroke (0.8× multiplier)",
      composition: "Context role: less visual weight, last in stagger order",
    },
  },
];

const EDGES: DemoEdge[] = [
  { from: "session", to: "skill" },
  { from: "session", to: "role" },
  { from: "skill", to: "task", route: "orthogonal" },
  { from: "role", to: "sandbox" },
  { from: "task", to: "sandbox", route: "orthogonal" },
];

const VB = { w: 280, h: 170 };
const VB_PAD = 20;
const ROLE_SCALE = { protagonist: 1.15, supporting: 1.0, context: 0.9 } as const;

// ── Geometry ───────────────────────────────────────────────

function nodeExit(n: DemoNode, tx: number, ty: number, gap: number) {
  const scale = ROLE_SCALE[n.role ?? "supporting"];
  const hw = (n.w * scale) / 2;
  const hh = (n.h * scale) / 2;
  const dx = tx - n.pos.x;
  const dy = ty - n.pos.y;
  if (dx === 0 && dy === 0) return { x: n.pos.x, y: n.pos.y };

  const shape = n.shape ?? "rect";
  let ex: number, ey: number;

  if (shape === "diamond") {
    const t = 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh);
    ex = n.pos.x + t * dx;
    ey = n.pos.y + t * dy;
  } else if (shape === "circle") {
    const r = Math.min(hw, hh);
    const d = Math.sqrt(dx * dx + dy * dy);
    ex = n.pos.x + (dx * r) / d;
    ey = n.pos.y + (dy * r) / d;
  } else {
    const sx = dx !== 0 ? hw / Math.abs(dx) : Infinity;
    const sy = dy !== 0 ? hh / Math.abs(dy) : Infinity;
    const s = Math.min(sx, sy);
    ex = n.pos.x + dx * s;
    ey = n.pos.y + dy * s;
  }

  const d = Math.sqrt(dx * dx + dy * dy);
  return { x: ex + (dx / d) * gap, y: ey + (dy / d) * gap };
}

function straightEdge(from: DemoNode, to: DemoNode): EdgeGeometry {
  const p1 = nodeExit(from, to.pos.x, to.pos.y, 2);
  const p2 = nodeExit(to, from.pos.x, from.pos.y, 2);
  const strokeEnd = nodeExit(to, from.pos.x, from.pos.y, 2 + ARROW_LEN);
  const midY = (p1.y + strokeEnd.y) / 2;
  const path = `M ${p1.x} ${p1.y} C ${p1.x} ${midY}, ${strokeEnd.x} ${midY}, ${strokeEnd.x} ${strokeEnd.y}`;
  return { path, p1, p2, endDir: { x: p2.x - strokeEnd.x, y: p2.y - strokeEnd.y } };
}

function orthogonalEdge(from: DemoNode, to: DemoNode): EdgeGeometry {
  const p1 = nodeExit(from, to.pos.x, to.pos.y, 2);
  const p2 = nodeExit(to, from.pos.x, from.pos.y, 2);
  const strokeEnd = nodeExit(to, from.pos.x, from.pos.y, 2 + ARROW_LEN);
  const midY = (p1.y + strokeEnd.y) / 2;
  const path = `M ${p1.x} ${p1.y} L ${p1.x} ${midY} L ${strokeEnd.x} ${midY} L ${strokeEnd.x} ${strokeEnd.y}`;
  return { path, p1, p2, endDir: { x: p2.x - strokeEnd.x, y: p2.y - strokeEnd.y } };
}

function NodeShape({ node, scale, fill, stroke, sw, isSelected }: {
  node: DemoNode; scale: number; fill: string; stroke: string; sw: number; isSelected?: boolean;
}) {
  const w = node.w * scale;
  const h = node.h * scale;
  const cx = node.pos.x;
  const cy = node.pos.y;
  const t = { transition: "fill 0.2s, stroke 0.2s, stroke-opacity 0.2s" } as const;
  const shape = node.shape ?? "rect";

  const shadowOffset = 1.5;
  const highlightOpacity = isSelected ? 0.12 : 0.06;

  switch (shape) {
    case "pill":
      return (
        <g>
          <rect x={cx - w / 2} y={cy - h / 2 + shadowOffset} width={w} height={h} rx={h / 2}
            fill="black" opacity={0.08} />
          <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={h / 2}
            fill={fill} stroke={stroke} strokeWidth={sw} style={t} />
          <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={h / 2}
            fill="url(#comp-node-grad)" pointerEvents="none" />
          <line x1={cx - w / 2 + h / 2} y1={cy - h / 2 + 0.5} x2={cx + w / 2 - h / 2} y2={cy - h / 2 + 0.5}
            stroke="white" strokeOpacity={highlightOpacity} strokeWidth={0.5} />
        </g>
      );
    case "diamond": {
      const d = `M ${cx} ${cy - h / 2} L ${cx + w / 2} ${cy} L ${cx} ${cy + h / 2} L ${cx - w / 2} ${cy} Z`;
      const dShadow = `M ${cx} ${cy - h / 2 + shadowOffset} L ${cx + w / 2} ${cy + shadowOffset} L ${cx} ${cy + h / 2 + shadowOffset} L ${cx - w / 2} ${cy + shadowOffset} Z`;
      return (
        <g>
          <path d={dShadow} fill="black" opacity={0.08} />
          <path d={d} fill={fill} stroke={stroke} strokeWidth={sw} style={t} />
          <path d={d} fill="url(#comp-node-grad)" pointerEvents="none" />
          <line x1={cx - w * 0.22} y1={cy - h * 0.28} x2={cx + w * 0.22} y2={cy - h * 0.28}
            stroke="white" strokeOpacity={highlightOpacity} strokeWidth={0.5} />
        </g>
      );
    }
    case "circle": {
      const r = Math.min(w, h) / 2;
      return (
        <g>
          <circle cx={cx} cy={cy + shadowOffset} r={r} fill="black" opacity={0.08} />
          <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={sw} style={t} />
          <circle cx={cx} cy={cy} r={r} fill="url(#comp-node-grad)" pointerEvents="none" />
          <line x1={cx - r * 0.5} y1={cy - r + 1} x2={cx + r * 0.5} y2={cy - r + 1}
            stroke="white" strokeOpacity={highlightOpacity} strokeWidth={0.5} strokeLinecap="round" />
        </g>
      );
    }
    default:
      return (
        <g>
          <rect x={cx - w / 2} y={cy - h / 2 + shadowOffset} width={w} height={h} rx={4}
            fill="black" opacity={0.08} />
          <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={4}
            fill={fill} stroke={stroke} strokeWidth={sw} style={t} />
          <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={4}
            fill="url(#comp-node-grad)" pointerEvents="none" />
          <line x1={cx - w / 2 + 4} y1={cy - h / 2 + 0.5} x2={cx + w / 2 - 4} y2={cy - h / 2 + 0.5}
            stroke="white" strokeOpacity={highlightOpacity} strokeWidth={0.5} />
        </g>
      );
  }
}

// ── Layer config per step ──────────────────────────────────

const LAYERS: LayerName[] = ["types", "geometry", "primitives", "composition"];

type LayerConfig = {
  activeLayers: Set<LayerName>;
  newLayer: LayerName | null;
};

function getLayerConfig(step: number): LayerConfig {
  if (step <= 1) return { activeLayers: new Set(["types"]), newLayer: "types" };
  if (step <= 3) return { activeLayers: new Set(["types", "geometry"]), newLayer: "geometry" };
  if (step <= 5) return { activeLayers: new Set(["types", "geometry", "primitives"]), newLayer: "primitives" };
  return { activeLayers: new Set(LAYERS), newLayer: step === 6 ? "composition" : null };
}


const LAYER_INFO: Record<LayerName, { title: string; what: string; items: string[] }> = {
  types: {
    title: "Layer 0 — Types",
    what: "Shared vocabulary: what exists, what properties things have",
    items: ["FlowNode", "FlowEdge", "FlowGroup", "NodeShape (6 shapes)", "NodeRole (3 tiers)"],
  },
  geometry: {
    title: "Layer 1 — Geometry",
    what: "Pure math: no React, no DOM, no state. Just coordinates.",
    items: ["nodeExit — boundary exit points per shape", "computeEdgePath — straight / orthogonal / curved / arc", "computeGroupBounds — bounding boxes for groups"],
  },
  primitives: {
    title: "Layer 2 — Primitives",
    what: "Atomic React components, each does exactly one thing",
    items: ["FlowNodeShape — renders 6 shapes", "FlowNodeHitArea — 44×44 touch + keyboard + a11y", "FlowEdgePath — styled path with markers", "FlowDetailPanel — relationship view on click"],
  },
  composition: {
    title: "Layer 3 — Composed",
    what: "FlowDiagram assembles all layers — one import, done",
    items: ["useFlowDiagram hook — resolves raw data → visual state", "FlowDiagram component — renders all primitives in order", "4 usage levels: drop-in → hook-only"],
  },
};

// ── Main component ─────────────────────────────────────────

type CompoundLabProps = { activeStep: number };

export function CompoundLab({ activeStep }: CompoundLabProps) {
  const reducedMotion = usePrefersReducedMotion();
  const { activeLayers, newLayer } = getLayerConfig(activeStep);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expandedLayer, setExpandedLayer] = useState<LayerName | null>(null);
  const [posOverrides, setPosOverrides] = useState<Record<string, Vec2>>({});
  const [routeOverrides, setRouteOverrides] = useState<Record<string, "straight" | "orthogonal">>({});
  const [shapeOverrides, setShapeOverrides] = useState<Record<string, Shape>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const didDragRef = useRef(false);

  const toggleNode = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
    setExpandedLayer(null);
  }, []);

  const toggleLayer = useCallback((layer: LayerName) => {
    setExpandedLayer((prev) => (prev === layer ? null : layer));
    setSelectedId(null);
  }, []);

  const canDrag = activeLayers.has("geometry");
  const hasOverrides = Object.keys(posOverrides).length > 0 || Object.keys(routeOverrides).length > 0 || Object.keys(shapeOverrides).length > 0;

  const effectiveNodes = useMemo(
    () => NODES.map((n) => {
      const pos = posOverrides[n.id] ?? n.pos;
      const shape = shapeOverrides[n.id] ?? n.shape;
      return (pos !== n.pos || shape !== n.shape) ? { ...n, pos, shape } : n;
    }),
    [posOverrides, shapeOverrides],
  );

  const startDrag = useCallback(
    (id: string, e: React.PointerEvent) => {
      if (!canDrag) return;
      e.stopPropagation();
      e.preventDefault();
      setDraggingId(id);
      didDragRef.current = false;
      const svg = svgRef.current;
      if (!svg) return;

      const startX = e.clientX;
      const startY = e.clientY;

      const toSvg = (clientX: number, clientY: number): Vec2 | null => {
        const ctm = svg.getScreenCTM();
        if (!ctm) return null;
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const svgPt = pt.matrixTransform(ctm.inverse());
        return { x: Math.round(svgPt.x), y: Math.round(svgPt.y) };
      };

      const onMove = (ev: PointerEvent) => {
        if (Math.abs(ev.clientX - startX) > 3 || Math.abs(ev.clientY - startY) > 3) {
          didDragRef.current = true;
        }
        const p = toSvg(ev.clientX, ev.clientY);
        if (!p) return;
        const clamped = {
          x: Math.max(30, Math.min(VB.w - 30, p.x)),
          y: Math.max(15, Math.min(VB.h - 15, p.y)),
        };
        setPosOverrides((prev) => ({ ...prev, [id]: clamped }));
      };
      const onUp = () => {
        setDraggingId(null);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [canDrag],
  );

  const selectedNode = selectedId ? effectiveNodes.find((n) => n.id === selectedId) ?? null : null;

  const resolvedNodes = useMemo(() =>
    effectiveNodes.map((n) => {
      const scale = activeLayers.has("types") ? ROLE_SCALE[n.role ?? "supporting"] : 1;
      let variant: "idle" | "selected" | "hovered" | "dimmed" = "idle";
      if (selectedId === n.id) variant = "selected";
      else if (selectedId !== null) variant = "dimmed";
      else if (hoveredId === n.id) variant = "hovered";
      return { ...n, scale, variant };
    }),
    [selectedId, hoveredId, activeLayers, effectiveNodes],
  );

  const edgePaths = useMemo(() =>
    EDGES.map((e) => {
      const from = effectiveNodes.find((n) => n.id === e.from)!;
      const to = effectiveNodes.find((n) => n.id === e.to)!;
      const route = routeOverrides[`${e.from}-${e.to}`] ?? e.route ?? "straight";
      const geo = route === "orthogonal" ? orthogonalEdge(from, to) : straightEdge(from, to);
      const isLit = selectedId === e.from || selectedId === e.to;
      const isDimmed = selectedId !== null && !isLit;
      return { ...e, ...geo, isLit, isDimmed, effectiveRoute: route };
    }),
    [selectedId, effectiveNodes, routeOverrides],
  );

  const activeLayerForDetail = expandedLayer ?? newLayer;

  const hintText =
    activeStep === 1 ? "Click Session — see how types describe the protagonist"
    : activeStep <= 3 ? "Drag any node — edges recalculate live"
    : activeStep === 4 ? "Notice the dashed hit areas — 44×44 touch targets"
    : activeStep <= 6 ? "Click any node, then expand a layer"
    : activeStep === 7 ? "The render prop is the escape hatch into full React"
    : "Click nodes and layers — see how all four work together";

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-bg)" }}>

      {/* ── Diagram: hero ─────────────────────────────── */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center p-4">
        <svg
          ref={svgRef}
          viewBox={`${-VB_PAD} ${-VB_PAD} ${VB.w + VB_PAD * 2} ${VB.h + VB_PAD * 2}`}
          className="w-full h-auto max-h-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Compound architecture diagram"
          style={{ maxWidth: 520, cursor: draggingId ? "grabbing" : canDrag ? "grab" : undefined }}
          onClick={() => { setSelectedId(null); setExpandedLayer(null); }}
        >
          <LabSvgDefs prefix="comp" />

          <rect x={-VB_PAD} y={-VB_PAD} width={VB.w + VB_PAD * 2} height={VB.h + VB_PAD * 2} fill="url(#comp-grid)" />
          <rect x={-VB_PAD} y={-VB_PAD} width={VB.w + VB_PAD * 2} height={VB.h + VB_PAD * 2} fill="url(#comp-vignette)" />

          {activeLayers.has("geometry") && edgePaths.map((e) => {
            const edgeStroke = e.isLit ? "var(--color-accent)" : "var(--color-muted)";
            const arrowD = arrowheadPath(e.p2, e.endDir);
            return (
              <g key={`${e.from}-${e.to}`}>
                {e.isLit && (
                  <motion.path
                    d={e.path} fill="none" stroke="var(--color-accent)"
                    strokeWidth={6} strokeLinecap="round"
                    initial={{ opacity: 0 }} animate={{ opacity: 0.08 }}
                    transition={TRANSITION.enterCard}
                  />
                )}
                <motion.path
                  d={e.path} fill="none" stroke={edgeStroke}
                  strokeWidth={e.isLit ? 1.5 : 1}
                  strokeDasharray={e.isLit ? undefined : "3 3"}
                  initial={reducedMotion ? false : { opacity: 0, pathLength: 0 }}
                  animate={{ opacity: e.isDimmed ? 0.2 : e.isLit ? 0.9 : 0.5, pathLength: 1 }}
                  transition={{ ...TRANSITION.enterCard, pathLength: { duration: DURATION.slow } }}
                />
                {arrowD && (
                  <path d={arrowD} fill={edgeStroke}
                    opacity={e.isDimmed ? 0.2 : e.isLit ? 0.9 : 0.5}
                    style={{ transition: "opacity 0.2s, fill 0.2s" }} />
                )}
                {e.isLit && (
                  <>
                    <circle cx={e.p1.x} cy={e.p1.y} r={2} fill="var(--color-accent)" opacity={0.9} />
                    <circle cx={e.p1.x} cy={e.p1.y} r={4} fill="var(--color-accent)" opacity={0.12} />
                    <circle cx={e.p2.x} cy={e.p2.y} r={2} fill="var(--color-accent)" opacity={0.9} />
                    <circle cx={e.p2.x} cy={e.p2.y} r={4} fill="var(--color-accent)" opacity={0.12} />
                  </>
                )}
              </g>
            );
          })}

          {resolvedNodes.map((n, i) => {
            const isProt = n.role === "protagonist" && activeLayers.has("types");
            const isSelected = n.variant === "selected";
            const isHovered = n.variant === "hovered";
            const opacity = n.variant === "dimmed" ? 0.35 : 1;
            const fill = isSelected
              ? "color-mix(in srgb, var(--color-accent) 18%, var(--color-surface))"
              : isHovered
                ? "color-mix(in srgb, var(--color-accent) 10%, var(--color-surface))"
                : isProt
                  ? "color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))"
                  : "var(--color-surface)";
            const stroke = isSelected || isHovered || isProt
              ? "var(--color-accent)" : "var(--color-border)";
            const sw = isSelected ? 1.5 : 1;

            return (
              <motion.g
                key={n.id}
                tabIndex={0}
                role="button"
                aria-label={`${n.label}${isSelected ? " (selected)" : ""}${canDrag ? ", draggable" : ""}`}
                initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity, y: 0 }}
                transition={{ ...SPRING.gentle, delay: i * STAGGER.fast }}
                style={{ cursor: draggingId === n.id ? "grabbing" : canDrag ? "grab" : "pointer", outline: "none" }}
                filter={isSelected ? "url(#comp-glow)" : undefined}
                onClick={(ev) => { ev.stopPropagation(); if (didDragRef.current) { didDragRef.current = false; return; } toggleNode(n.id); }}
                onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); toggleNode(n.id); } }}
                onPointerDown={(ev) => canDrag && startDrag(n.id, ev)}
                onMouseEnter={() => setHoveredId(n.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* 44x44 transparent hit area for touch targets */}
                <rect x={n.pos.x - 22} y={n.pos.y - 22} width={44} height={44}
                  fill="transparent" stroke="none" />
                <NodeShape node={n} scale={n.scale} fill={fill} stroke={stroke} sw={sw} isSelected={isSelected} />
                <text
                  x={n.pos.x} y={n.pos.y}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={isProt ? 9.5 : 8.5} fontWeight={isProt ? 700 : 600}
                  fill={isSelected || isHovered || isProt ? "var(--color-accent)" : "var(--color-text)"}
                  fontFamily="var(--font-mono)" style={{ transition: "fill 0.2s" }}
                  pointerEvents="none"
                >
                  {n.label}
                </text>
                {activeLayers.has("primitives") && (
                  <rect x={n.pos.x - 22} y={n.pos.y - 22} width={44} height={44}
                    fill="transparent" stroke="var(--color-muted)" strokeWidth={0.5}
                    strokeDasharray="2 2" opacity={0.25} rx={4} pointerEvents="none" />
                )}
              </motion.g>
            );
          })}
        </svg>
      </div>

      {/* ── Readout strip ─────────────────────────────── */}
      <div
        className="shrink-0 overflow-y-auto"
        style={{
          maxHeight: "45%",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        {/* Layer tabs — always visible */}
        <div className="flex items-center gap-1 px-4 py-2">
          <span className="font-mono text-xs uppercase tracking-wider mr-2" style={{ color: "var(--color-muted)", opacity: 0.5 }}>
            layers
          </span>
          {LAYERS.map((layer) => {
            const active = activeLayers.has(layer);
            if (!active) return null;
            const c = LC[layer];
            const isExpanded = expandedLayer === layer;
            return (
              <button
                key={layer}
                type="button"
                onClick={() => toggleLayer(layer)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-colors hover:bg-white/5"
                style={{
                  background: isExpanded ? "color-mix(in srgb, var(--color-surface-2) 60%, transparent)" : undefined,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{
                    background: c.dot,
                    boxShadow: layer === newLayer ? `0 0 4px ${c.dot}` : "none",
                  }}
                />
                <span className="font-mono text-xs" style={{ color: isExpanded ? "var(--color-text)" : "var(--color-muted)" }}>
                  {layer}
                </span>
              </button>
            );
          })}
        </div>

        {/* Readout content */}
        <div className="px-4 pb-3">
          <AnimatePresence mode="wait">
            {/* Priority 1: selected node */}
            {selectedNode ? (
              <motion.div
                key={`node-${selectedNode.id}`}
                initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={TRANSITION.enterItem}
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xs font-bold" style={{ color: "var(--color-accent)" }}>
                    {selectedNode.label}
                  </span>
                  <span className="font-mono text-xs" style={{ color: "var(--color-muted)" }}>
                    {selectedNode.shape ?? "rect"} · {selectedNode.role ?? "supporting"}
                  </span>
                </div>
                <div className="font-mono text-xs mt-1" style={{ color: "var(--color-muted)", lineHeight: 1.5 }}>
                  {selectedNode.brief}
                </div>
                <div className="flex flex-col gap-0.5 mt-2">
                  {LAYERS.filter((l) => activeLayers.has(l)).map((layer) => (
                    <div key={layer} className="flex gap-2 items-start">
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full mt-[5px]" style={{ background: LC[layer].dot }} />
                      <span className="font-mono text-xs" style={{ color: "var(--color-muted)", lineHeight: 1.5 }}>
                        {selectedNode.layerDetails[layer]}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : expandedLayer ? (
              /* Priority 2: expanded layer detail */
              <motion.div
                key={`layer-${expandedLayer}`}
                initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={TRANSITION.enterItem}
              >
                <div className="font-mono text-xs font-semibold" style={{ color: LC[expandedLayer].text }}>
                  {LAYER_INFO[expandedLayer].title}
                </div>
                <div className="font-mono text-xs mt-1" style={{ color: "var(--color-muted)", lineHeight: 1.5 }}>
                  {LAYER_INFO[expandedLayer].what}
                </div>
                <div className="flex flex-col gap-0.5 mt-1.5">
                  {LAYER_INFO[expandedLayer].items.map((item) => (
                    <div key={item} className="flex items-start gap-1.5">
                      <span className="shrink-0 mt-[5px] font-mono text-[6px]" style={{ color: LC[expandedLayer].dot }}>●</span>
                      <span className="font-mono text-xs" style={{ color: "var(--color-muted)", lineHeight: 1.5 }}>
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              /* Priority 3: hint */
              <motion.div
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={TRANSITION.crossfade}
              >
                <span className="font-mono text-xs italic" style={{ color: "var(--color-muted)" }}>
                  {hintText}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Geometry controls — inline, when active */}
          {canDrag && (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid color-mix(in srgb, var(--color-border) 50%, transparent)" }}>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs uppercase tracking-wider" style={{ color: "var(--color-muted)", opacity: 0.5 }}>
                  routes
                </span>
                {EDGES.map((e) => {
                  const key = `${e.from}-${e.to}`;
                  const current = routeOverrides[key] ?? e.route ?? "straight";
                  return (
                    <DialSegment
                      key={key}
                      label={`${e.from.slice(0, 3)}→${e.to.slice(0, 3)}`}
                      options={["straight", "orthogonal"] as const}
                      value={current}
                      onChange={(v) => setRouteOverrides((prev) => ({ ...prev, [key]: v }))}
                      formatOption={(v) => v === "straight" ? "line" : "elbow"}
                    />
                  );
                })}
              </div>
              <div className="flex flex-col gap-1 mt-2 pt-2" style={{ borderTop: "1px solid color-mix(in srgb, var(--color-border) 50%, transparent)" }}>
                <span className="font-mono text-xs uppercase tracking-wider" style={{ color: "var(--color-muted)", opacity: 0.5 }}>
                  shapes
                </span>
                {effectiveNodes.map((n) => (
                  <DialChips
                    key={n.id}
                    label={n.label}
                    options={["rect", "pill", "diamond", "circle"] as const}
                    value={(shapeOverrides[n.id] ?? n.shape ?? "rect") as "rect" | "pill" | "diamond" | "circle"}
                    onChange={(s) => setShapeOverrides((prev) => ({ ...prev, [n.id]: s }))}
                  />
                ))}
              </div>
              {hasOverrides && (
                <button
                  type="button"
                  onClick={() => { setPosOverrides({}); setRouteOverrides({}); setShapeOverrides({}); }}
                  className="font-mono text-xs mt-2 transition-colors hover:text-[var(--color-text)]"
                  style={{ color: "var(--color-muted)" }}
                >
                  ↺ reset
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
