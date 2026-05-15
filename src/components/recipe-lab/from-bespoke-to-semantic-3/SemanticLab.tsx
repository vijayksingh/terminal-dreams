"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION, STAGGER } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { Dial, DialChips } from "@/components/ui/dialkit";
import { DIMENSION_COLORS as DC } from "../diagram-colors";
import { BASE_NODES, BASE_EDGES, ARC, THESIS, TENSION, VIEWBOX, ROLE_SCALE } from "../shared/graph-data";
import type { BaseNodeDef } from "../shared/graph-data";
import { cubicEdge, arrowheadPath } from "../shared/geometry";
import { LabSvgDefs } from "../shared/LabSvgDefs";

// ── Types ──────────────────────────────────────────────────

type DimensionName = "intent" | "hierarchy" | "relationships" | "path" | "affordance";

type DemoNode = BaseNodeDef & {
  dimensionDetails: Record<DimensionName, string>;
};

// ── Demo data ──────────────────────────────────────────────

const DIMENSION_DETAILS: Record<string, Record<DimensionName, string>> = {
  session: {
    intent: "Thesis names it as the hub — gives the diagram a central claim",
    hierarchy: "Protagonist role → 1.15× scale, pill shape, accent stroke",
    relationships: "Edge verbs (loads, applies) describe its API surface",
    path: "Arc position #1 — the reader starts here",
    affordance: "Selected variant: accent fill + glow, dimmed siblings",
  },
  skill: {
    intent: "Part of the thesis — one of five primitives around the hub",
    hierarchy: "Supporting role → normal scale, rect shape",
    relationships: "'loads' from Session, 'spawns' Task — verbs explain function",
    path: "Arc position #2 — reader visits it second",
    affordance: "Standard interaction: hover highlight, click select",
  },
  role: {
    intent: "Part of the thesis — behavior constraints around the hub",
    hierarchy: "Supporting role → normal scale, rect shape",
    relationships: "'applies' from Session, 'configures' Sandbox — constraints",
    path: "Arc position #3 — visited after Skill",
    affordance: "Standard interaction, dimmed when sibling selected",
  },
  task: {
    intent: "Part of the thesis — operation tracking through the hub",
    hierarchy: "Supporting role → normal scale",
    relationships: "'spawns' from Skill, 'runs in' Sandbox — execution path",
    path: "Arc position #4 — near the end of the reading arc",
    affordance: "Standard interaction: hover highlight, click select",
  },
  sandbox: {
    intent: "Part of the thesis — isolated execution for the hub",
    hierarchy: "Context role → 0.9× scale, visually recedes",
    relationships: "'configures' from Role, 'runs in' from Task — end of chain",
    path: "Arc position #5 — the reader ends here",
    affordance: "Context variant: lighter stroke, less visual weight",
  },
};

const NODES: DemoNode[] = BASE_NODES.map((base) => ({
  ...base,
  dimensionDetails: DIMENSION_DETAILS[base.id],
}));

const EDGES = BASE_EDGES;

// ── Dimension config ──────────────────────────────────────

const DIMENSIONS: DimensionName[] = ["intent", "hierarchy", "relationships", "path", "affordance"];

const DIM_INFO: Record<DimensionName, { title: string; what: string; effect: string }> = {
  intent: {
    title: "Intent",
    what: "What story is this diagram telling?",
    effect: "Thesis defines the central claim; tension adds productive friction that makes the reader think.",
  },
  hierarchy: {
    title: "Hierarchy",
    what: "Who matters most?",
    effect: "protagonist / supporting / context roles control visual weight — scale, stroke weight, fill treatment.",
  },
  relationships: {
    title: "Relationships",
    what: "How do they connect?",
    effect: "Edge verbs describe the API surface; descriptions add context when a node is explored.",
  },
  path: {
    title: "Path",
    what: "What order to read?",
    effect: "Arc numbers guide the reader through the diagram sequentially, creating a narrative flow.",
  },
  affordance: {
    title: "Affordance",
    what: "How does it respond?",
    effect: "Variant resolution maps user interaction state (idle, hover, selected, dimmed) to visual treatment.",
  },
};

// ── Step → active dimensions ─────────────────────────────

type SemanticView = "bare" | "intent" | "hierarchy" | "relationships" | "path" | "variants" | "full";

function getView(step: number): SemanticView {
  if (step <= 2) return "bare";
  if (step === 3) return "intent";
  if (step === 4) return "hierarchy";
  if (step === 5) return "relationships";
  if (step === 6) return "path";
  if (step === 7) return "variants";
  return "full";
}

function getActiveDimensions(view: SemanticView): Set<DimensionName> {
  switch (view) {
    case "bare": return new Set();
    case "intent": return new Set(["intent"]);
    case "hierarchy": return new Set(["intent", "hierarchy"]);
    case "relationships": return new Set(["intent", "hierarchy", "relationships"]);
    case "path": return new Set(["intent", "hierarchy", "relationships", "path"]);
    case "variants": return new Set(DIMENSIONS);
    case "full": return new Set(DIMENSIONS);
  }
}

function getNewDimension(view: SemanticView): DimensionName | null {
  switch (view) {
    case "intent": return "intent";
    case "hierarchy": return "hierarchy";
    case "relationships": return "relationships";
    case "path": return "path";
    case "variants": return "affordance";
    default: return null;
  }
}

// ── Main component ────────────────────────────────────────

export function SemanticLab({ activeStep }: { activeStep: number }) {
  const reducedMotion = usePrefersReducedMotion();
  const view = getView(activeStep);
  const activeDims = getActiveDimensions(view);
  const newDim = getNewDimension(view);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expandedDim, setExpandedDim] = useState<DimensionName | null>(null);
  const [overrideDims, setOverrideDims] = useState<Set<DimensionName> | null>(null);
  const [roleOverrides, setRoleOverrides] = useState<Record<string, "protagonist" | "supporting" | "context">>({});
  const [protagonistScale, setProtagonistScale] = useState(1.15);
  const [dimmedOpacity, setDimmedOpacity] = useState(0.75);

  const canToggleDims = view === "full";
  const effectiveDims = canToggleDims && overrideDims !== null ? overrideDims : activeDims;
  const effectiveNewDim = canToggleDims && overrideDims !== null ? null : newDim;
  const showHierarchyLab = effectiveDims.has("hierarchy");

  const toggleNode = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
    setExpandedDim(null);
  }, []);

  const toggleDim = useCallback((dim: DimensionName) => {
    setExpandedDim((prev) => (prev === dim ? null : dim));
    setSelectedId(null);
  }, []);

  const toggleDimOverride = useCallback((dim: DimensionName) => {
    setOverrideDims((prev) => {
      const current = prev ?? new Set(DIMENSIONS);
      const next = new Set(current);
      if (next.has(dim)) next.delete(dim);
      else next.add(dim);
      return next;
    });
  }, []);

  const showRoles = effectiveDims.has("hierarchy");
  const showEdgeLabels = effectiveDims.has("relationships");
  const showArc = effectiveDims.has("path");
  const showThesis = effectiveDims.has("intent");
  const showTension = effectiveDims.size >= 2;

  const selectedNode = selectedId ? NODES.find((n) => n.id === selectedId) ?? null : null;

  const resolvedNodes = useMemo(() =>
    NODES.map((n, i) => {
      const effectiveRole = roleOverrides[n.id] ?? n.role;
      const scale = showRoles ? (effectiveRole === "protagonist" ? protagonistScale : ROLE_SCALE[effectiveRole]) : 1;
      let variant: "idle" | "selected" | "hovered" | "dimmed" = "idle";
      if (selectedId === n.id) variant = "selected";
      else if (selectedId !== null) variant = "dimmed";
      else if (hoveredId === n.id) variant = "hovered";
      const arcIndex = showArc ? ARC.indexOf(n.id) : -1;
      return { ...n, role: effectiveRole, scale, variant, arcIndex, staggerIdx: showArc && arcIndex >= 0 ? arcIndex : i };
    }),
    [showRoles, selectedId, hoveredId, showArc, roleOverrides, protagonistScale],
  );

  const resolvedEdges = useMemo(() =>
    EDGES.map((e) => {
      const from = resolvedNodes.find((n) => n.id === e.from)!;
      const to = resolvedNodes.find((n) => n.id === e.to)!;
      const geo = cubicEdge(from, to, from.scale, to.scale);
      const isLit = selectedId === e.from || selectedId === e.to;
      const isDimmed = selectedId !== null && !isLit;
      return { ...e, ...geo, isLit, isDimmed };
    }),
    [selectedId, resolvedNodes],
  );

  const selectedEdges = selectedNode
    ? EDGES.filter((e) => e.from === selectedNode.id || e.to === selectedNode.id)
    : [];

  const hintText =
    overrideDims !== null && effectiveDims.size === 0 ? "All dimensions off. Click dots to re-enable, or hit 'reset'."
    : overrideDims !== null && effectiveDims.size === 5 ? "All dimensions active — try removing one to see its individual contribution"
    : overrideDims !== null && effectiveDims.size > 0 && effectiveDims.size < 5 ? `${effectiveDims.size}/5 dimensions active — toggle dots to isolate each one's contribution`
    : overrideDims === null && effectiveDims.size === 0 ? "Bare diagram — every node looks the same. No story yet."
    : overrideDims === null && activeStep === 3 ? "The thesis appeared — click any node to see what intent adds"
    : overrideDims === null && activeStep === 4 ? "Session grew 15%. Click it to see hierarchy's effect"
    : overrideDims === null && activeStep === 5 ? "Edge labels appeared — click a node to see its connections"
    : overrideDims === null && activeStep === 6 ? "Arc numbers show reading order — follow 1 → 2 → 3 → 4 → 5"
    : overrideDims === null && activeStep === 7 ? "All five dimensions active — click any node for the full breakdown"
    : "Click the colored dots above to toggle each dimension on/off";

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-bg)" }}>

      {/* ── Diagram: hero ─────────────────────────────── */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center p-4">
        {/* Thesis overlay */}
        <AnimatePresence>
          {showThesis && (
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={SPRING.gentle}
              className="absolute top-2 left-0 right-0 text-center z-10 pointer-events-none"
            >
              <span className="font-mono text-xs font-medium px-2 py-0.5 rounded"
                style={{ color: "var(--color-text)", background: "color-mix(in srgb, var(--color-bg) 80%, transparent)" }}>
                {THESIS}
              </span>
              {showTension && (
                <motion.div initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={TRANSITION.enterCard} className="mt-0.5">
                  <span className="font-mono text-xs italic px-2 py-0.5 rounded"
                    style={{ color: DC.intent.dot, background: "color-mix(in srgb, var(--color-bg) 80%, transparent)" }}>
                    {TENSION}
                  </span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <svg
          viewBox={`-20 -20 ${VIEWBOX.w + 40} ${VIEWBOX.h + 40}`}
          className="w-full h-auto max-h-full"
          style={{ maxWidth: 520 }}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Semantic diagram demo"
          onClick={() => { setSelectedId(null); setExpandedDim(null); }}
        >
          <LabSvgDefs prefix="sem" />
          <rect x={-20} y={-20} width={VIEWBOX.w + 40} height={VIEWBOX.h + 40} fill="url(#sem-grid)" />
          <rect x={-20} y={-20} width={VIEWBOX.w + 40} height={VIEWBOX.h + 40} fill="url(#sem-vignette)" />

          {resolvedEdges.map((e) => {
            const midX = (NODES.find((n) => n.id === e.from)!.x + NODES.find((n) => n.id === e.to)!.x) / 2;
            const midY = (NODES.find((n) => n.id === e.from)!.y + NODES.find((n) => n.id === e.to)!.y) / 2;
            const edgeStroke = e.isLit ? "var(--color-accent)" : "var(--color-muted)";
            const arrowFill = edgeStroke;
            const arrowD = arrowheadPath(e.p2, e.endDir);
            return (
              <g key={`${e.from}-${e.to}`}>
                {e.isLit && (
                  <path d={e.path} fill="none" stroke="var(--color-accent)"
                    strokeWidth={6} strokeLinecap="round" opacity={0.08} />
                )}
                <path
                  d={e.path} fill="none" stroke={edgeStroke}
                  strokeWidth={e.isLit ? 1.5 : 1}
                  strokeDasharray={e.isLit ? undefined : "3 3"}
                  opacity={e.isDimmed ? 0.2 : e.isLit ? 0.9 : 0.5}
                  style={{ transition: "opacity 0.2s, stroke 0.2s" }}
                />
                {arrowD && (
                  <path d={arrowD} fill={arrowFill}
                    opacity={e.isDimmed ? 0.2 : e.isLit ? 0.9 : 0.5}
                    style={{ transition: "opacity 0.2s, fill 0.2s" }} />
                )}
                {showEdgeLabels && (
                  <text x={midX} y={midY - 4} textAnchor="middle" fontSize={6.5}
                    fill={e.isLit ? "var(--color-accent)" : "var(--color-muted)"}
                    fontFamily="var(--font-mono)" opacity={e.isDimmed ? 0.3 : 1}
                    style={{ transition: "opacity 0.2s" }}>
                    {e.label}
                  </text>
                )}
              </g>
            );
          })}

          {resolvedNodes.map((n) => {
            const w = n.w * n.scale;
            const h = n.h * n.scale;
            const isProt = n.role === "protagonist" && showRoles;
            const isSelected = n.variant === "selected";
            const isHovered = n.variant === "hovered";
            const opacity = n.variant === "dimmed" ? dimmedOpacity : 1;
            const fill = isSelected
              ? "color-mix(in srgb, var(--color-accent) 18%, var(--color-surface))"
              : isHovered
                ? "color-mix(in srgb, var(--color-accent) 10%, var(--color-surface))"
                : isProt
                  ? "color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))"
                  : "var(--color-surface)";
            const stroke = isSelected || isHovered || isProt ? "var(--color-accent)" : "var(--color-border)";
            const sw = isSelected ? 1.5 : 1;
            const rx = isProt ? h / 2 : 4;

            return (
              <motion.g
                key={n.id}
                tabIndex={0}
                role="button"
                aria-label={`${n.label}${isSelected ? " (selected)" : ""}`}
                initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity, y: 0 }}
                transition={{ ...SPRING.gentle, delay: n.staggerIdx * STAGGER.fast }}
                style={{ cursor: "pointer", outline: "none" }}
                filter={isSelected ? "url(#sem-glow)" : undefined}
                onClick={(ev) => { ev.stopPropagation(); toggleNode(n.id); }}
                onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); toggleNode(n.id); } }}
                onMouseEnter={() => setHoveredId(n.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* 44x44 transparent hit area for touch targets */}
                <rect x={n.x - 22} y={n.y - 22} width={44} height={44} fill="transparent" stroke="none" />
                <motion.rect
                  animate={{ x: n.x - w / 2, y: n.y - h / 2 + 1.5, width: w, height: h }}
                  transition={SPRING.snappy}
                  rx={rx} fill="black" opacity={0.08} strokeOpacity={0} pointerEvents="none"
                />
                <motion.rect
                  animate={{ x: n.x - w / 2, y: n.y - h / 2, width: w, height: h }}
                  transition={SPRING.snappy}
                  rx={rx} fill={fill} stroke={stroke} strokeWidth={sw}
                  style={{ transition: "fill 0.2s, stroke 0.2s, stroke-opacity 0.2s" }}
                  pointerEvents="none"
                />
                <motion.rect
                  animate={{ x: n.x - w / 2, y: n.y - h / 2, width: w, height: h }}
                  transition={SPRING.snappy}
                  rx={rx} fill="url(#sem-node-grad)" pointerEvents="none" strokeOpacity={0}
                />
                <motion.line
                  animate={{
                    x1: n.x - w / 2 + (isProt ? h / 2 : 4),
                    x2: n.x + w / 2 - (isProt ? h / 2 : 4),
                    y1: n.y - h / 2 + 0.5,
                    y2: n.y - h / 2 + 0.5,
                  }}
                  transition={SPRING.snappy}
                  stroke="white" strokeOpacity={isSelected ? 0.12 : 0.06} strokeWidth={0.5}
                  pointerEvents="none"
                />
                <text
                  x={n.x} y={n.y} textAnchor="middle" dominantBaseline="central"
                  fontSize={isProt ? 9.5 : 8.5} fontWeight={isProt ? 700 : 600}
                  fill={isSelected || isHovered || isProt ? "var(--color-accent)" : "var(--color-text)"}
                  fontFamily="var(--font-mono)" style={{ transition: "fill 0.2s" }}
                  pointerEvents="none">
                  {n.label}
                </text>
                {n.arcIndex >= 0 && (
                  <g pointerEvents="none">
                    <circle cx={n.x + w / 2} cy={n.y - h / 2 - 2} r={5.5} fill="var(--color-accent)" opacity={0.85} />
                    <text x={n.x + w / 2} y={n.y - h / 2 - 2} textAnchor="middle" dominantBaseline="central"
                      fontSize={6.5} fontWeight={700} fill="var(--color-bg)" fontFamily="var(--font-mono)">
                      {n.arcIndex + 1}
                    </text>
                  </g>
                )}
              </motion.g>
            );
          })}
        </svg>
      </div>

      {/* ── Readout strip ─────────────────────────────── */}
      <div
        className="shrink-0 overflow-y-auto"
        style={{ maxHeight: "45%", borderTop: "1px solid var(--color-border)" }}
      >
        {/* Dimension tabs */}
        <div className="flex items-center gap-1 px-4 py-2">
          <span className="font-mono text-xs uppercase tracking-wider mr-2" style={{ color: "var(--color-muted)", opacity: 0.5 }}>
            dims
          </span>
          {canToggleDims && overrideDims !== null && (
            <button type="button" onClick={() => setOverrideDims(null)}
              className="font-mono text-xs mr-1 transition-colors hover:text-[var(--color-text)]" style={{ color: "var(--color-muted)" }}>
              ↺
            </button>
          )}
          {DIMENSIONS.map((dim) => {
            const active = effectiveDims.has(dim);
            const c = DC[dim];
            const isExpanded = expandedDim === dim;
            if (!canToggleDims && !active) return null;
            return (
              <button
                key={dim}
                type="button"
                onClick={() => canToggleDims ? toggleDimOverride(dim) : toggleDim(dim)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-colors hover:bg-white/5"
                style={{
                  background: isExpanded ? "color-mix(in srgb, var(--color-surface-2) 60%, transparent)" : undefined,
                  opacity: active ? 1 : 0.35,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{
                    background: active ? c.dot : "var(--color-border)",
                    boxShadow: active && dim === effectiveNewDim ? `0 0 4px ${c.dot}` : "none",
                  }}
                />
                <span className="font-mono text-xs" style={{ color: isExpanded ? "var(--color-text)" : active ? "var(--color-muted)" : "var(--color-border)" }}>
                  {DIM_INFO[dim].title.toLowerCase()}
                </span>
              </button>
            );
          })}
        </div>

        {/* Readout content */}
        <div className="px-4 pb-3">
          <AnimatePresence mode="wait">
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
                    {selectedNode.role}
                  </span>
                </div>
                <div className="font-mono text-xs mt-1" style={{ color: "var(--color-muted)", lineHeight: 1.5 }}>
                  {selectedNode.brief}
                </div>
                {effectiveDims.size > 0 && (
                  <div className="flex flex-col gap-0.5 mt-2">
                    {DIMENSIONS.filter((d) => effectiveDims.has(d)).map((dim) => (
                      <div key={dim} className="flex gap-2 items-start">
                        <span className="shrink-0 w-1.5 h-1.5 rounded-full mt-[5px]" style={{ background: DC[dim].dot }} />
                        <span className="font-mono text-xs" style={{ color: "var(--color-muted)", lineHeight: 1.5 }}>
                          {selectedNode.dimensionDetails[dim]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {selectedEdges.length > 0 && showEdgeLabels && (
                  <div className="mt-2 pt-1.5" style={{ borderTop: "1px solid color-mix(in srgb, var(--color-border) 50%, transparent)" }}>
                    {selectedEdges.map((e) => {
                      const isOut = e.from === selectedNode.id;
                      const other = NODES.find((n) => n.id === (isOut ? e.to : e.from))!;
                      return (
                        <div key={`${e.from}-${e.to}`} className="font-mono text-xs" style={{ color: "var(--color-muted)", lineHeight: 1.7 }}>
                          <span style={{ color: "var(--color-accent)" }}>{isOut ? "→" : "←"}</span>{" "}
                          <span style={{ color: "var(--color-text)", fontWeight: 500 }}>{e.verb}</span>{" "}
                          {other.label} — {e.description}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            ) : expandedDim ? (
              <motion.div
                key={`dim-${expandedDim}`}
                initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={TRANSITION.enterItem}
              >
                <div className="font-mono text-xs font-semibold" style={{ color: DC[expandedDim].text }}>
                  {DIM_INFO[expandedDim].title}
                </div>
                <div className="font-mono text-xs mt-1 font-medium" style={{ color: "var(--color-muted)", lineHeight: 1.5 }}>
                  {DIM_INFO[expandedDim].what}
                </div>
                <div className="font-mono text-xs mt-0.5" style={{ color: DC[expandedDim].text, lineHeight: 1.5 }}>
                  {DIM_INFO[expandedDim].effect}
                </div>
              </motion.div>
            ) : (
              <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={TRANSITION.crossfade}>
                <span className="font-mono text-xs italic" style={{ color: "var(--color-muted)" }}>
                  {hintText}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hierarchy controls — inline, when active */}
          {showHierarchyLab && (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid color-mix(in srgb, var(--color-border) 50%, transparent)" }}>
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-xs uppercase tracking-wider" style={{ color: "var(--color-muted)", opacity: 0.5 }}>
                  hierarchy lab
                </span>
                <Dial
                  label="Prot. scale"
                  value={protagonistScale}
                  min={0.8}
                  max={1.5}
                  step={0.05}
                  format={(v) => `${v.toFixed(2)}×`}
                  onChange={setProtagonistScale}
                />
                <Dial
                  label="Dim opacity"
                  value={dimmedOpacity}
                  min={0}
                  max={1}
                  step={0.05}
                  format={(v) => `${Math.round(v * 100)}%`}
                  onChange={setDimmedOpacity}
                />
                {NODES.map((n) => (
                  <DialChips
                    key={n.id}
                    label={n.label}
                    options={["protagonist", "supporting", "context"] as const}
                    value={roleOverrides[n.id] ?? n.role}
                    onChange={(v) => setRoleOverrides((prev) => ({ ...prev, [n.id]: v }))}
                    colors={{
                      protagonist: "var(--color-accent)",
                      supporting: DC.hierarchy.dot,
                      context: "var(--color-muted)",
                    }}
                  />
                ))}
                {Object.keys(roleOverrides).length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setRoleOverrides({}); setProtagonistScale(1.15); setDimmedOpacity(0.75); }}
                    className="font-mono text-xs mt-1 transition-colors hover:text-[var(--color-text)]"
                    style={{ color: "var(--color-muted)" }}
                  >
                    ↺ reset
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
