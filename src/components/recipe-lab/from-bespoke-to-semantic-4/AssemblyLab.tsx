"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION, STAGGER } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { DialToggle } from "@/components/ui/dialkit";
import { QUALITY_COLORS as QC, USAGE_COLORS as UC } from "../diagram-colors";
import { BASE_NODES, BASE_EDGES, ARC, THESIS, TENSION, VIEWBOX, ROLE_SCALE } from "../shared/graph-data";
import type { BaseNodeDef } from "../shared/graph-data";
import { cubicEdge, arrowheadPath } from "../shared/geometry";
import { LabSvgDefs } from "../shared/LabSvgDefs";

// ── Types ──────────────────────────────────────────────────

type QualityMode = "bare" | "semantic" | "full";
type UsageLevel = 0 | 1 | 2 | 3;

type DemoNode = BaseNodeDef & {
  qualityDetails: Record<QualityMode, string>;
};

// ── Demo data ──────────────────────────────────────────────

const QUALITY_DETAILS: Record<string, Record<QualityMode, string>> = {
  session: {
    bare: "Plain box — no role, no shape distinction, no story",
    semantic: "Protagonist role → pill shape, 1.15× scale, accent stroke",
    full: "Full treatment: thesis + arc #1 + edge verbs + variant resolution",
  },
  skill: {
    bare: "Plain box — same visual weight as every other node",
    semantic: "Supporting role → normal scale, edge verb '.skill()' → loads",
    full: "Arc position #2, dimmed on sibling select, connection descriptions",
  },
  role: {
    bare: "Plain box — no indication of behavioral purpose",
    semantic: "Supporting role, edge verb '.role()' → applies constraints",
    full: "Arc position #3, full interaction + connection descriptions",
  },
  task: {
    bare: "Plain box — relationship to Skill/Sandbox invisible",
    semantic: "Supporting role, 'spawns' + 'runs in' verbs show execution chain",
    full: "Arc position #4, full interaction + relationship details",
  },
  sandbox: {
    bare: "Plain box — indistinguishable from primary nodes",
    semantic: "Context role → 0.9× scale, lighter stroke, visually recedes",
    full: "Arc position #5 (end), context variant treatment on interaction",
  },
};

const NODES: DemoNode[] = BASE_NODES.map((base) => ({
  ...base,
  qualityDetails: QUALITY_DETAILS[base.id],
}));

const EDGES = BASE_EDGES;

// ── Quality + Usage config ────────────────────────────────

const QUALITY_MODES: QualityMode[] = ["bare", "semantic", "full"];

const QUALITY_INFO: Record<QualityMode, { title: string; what: string; effect: string }> = {
  bare: {
    title: "Bare",
    what: "Minimum viable diagram",
    effect: "No hierarchy, no reading order, no story. Every node looks identical. Edges are unlabeled lines.",
  },
  semantic: {
    title: "Semantic",
    what: "Five dimensions active",
    effect: "Intent (thesis/tension), hierarchy (role scaling), relationships (edge verbs), path (arc order), affordance (variants).",
  },
  full: {
    title: "Full",
    what: "Semantic + all interactions",
    effect: "Click-to-select, detail panels, arc indicators, connection descriptions. The diagram tells a complete story.",
  },
};

const USAGE_INFO: Record<UsageLevel, { title: string; code: string; detail: string }> = {
  0: {
    title: "Level 0 — Drop-in",
    code: "<FlowDiagram {...def} />",
    detail: "One import, zero config. Layout, interaction, and rendering all handled. Good for 80% of diagrams.",
  },
  1: {
    title: "Level 1 — Custom detail",
    code: "<FlowDiagram>{(node) => <Custom />}</FlowDiagram>",
    detail: "Render children for the selected node. The diagram manages selection and layout — you customize the info panel.",
  },
  2: {
    title: "Level 2 — Controlled",
    code: "<FlowDiagram selectedId={id} onSelect={setId} />",
    detail: "You own selection state. Enables sidebar highlights, URL-driven selection, keyboard shortcuts.",
  },
  3: {
    title: "Level 3 — Hook only",
    code: "const flow = useFlowDiagram(def);",
    detail: "Raw hook, no component. Bring your own SVG renderers. Maximum control — the recipe demos use this level.",
  },
};

// ── Semantic field controls ──────────────────

type SemanticFields = {
  thesis: boolean;
  roles: boolean;
  verbs: boolean;
  arc: boolean;
  tension: boolean;
};

function getFieldsFromQuality(q: QualityMode): SemanticFields {
  return {
    thesis: q !== "bare",
    roles: q !== "bare",
    verbs: q !== "bare",
    arc: q === "full",
    tension: q === "full",
  };
}

// ── Step mapping ──────────────────────────────────────────

function getQualityMode(step: number): QualityMode {
  if (step <= 2) return "bare";
  if (step <= 4) return "semantic";
  return "full";
}

function getUsageLevel(step: number): UsageLevel {
  if (step <= 5) return 0;
  if (step === 6) return 1;
  if (step === 7) return 2;
  return 3;
}

// ── Main component ────────────────────────────────────────

export function AssemblyLab({ activeStep }: { activeStep: number }) {
  const reducedMotion = usePrefersReducedMotion();
  const [manualQuality, setManualQuality] = useState<QualityMode | null>(null);
  const quality = manualQuality ?? getQualityMode(activeStep);
  const usageLevel = getUsageLevel(activeStep);

  const [fieldOverrides, setFieldOverrides] = useState<SemanticFields | null>(null);

  const fields = fieldOverrides ?? getFieldsFromQuality(quality);

  const toggleField = useCallback((field: keyof SemanticFields, v: boolean) => {
    setFieldOverrides((prev) => {
      const current = prev ?? getFieldsFromQuality(quality);
      return { ...current, [field]: v };
    });
  }, [quality]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expandedQuality, setExpandedQuality] = useState<QualityMode | null>(null);
  const [expandedUsage, setExpandedUsage] = useState<UsageLevel | null>(null);

  useEffect(() => { setManualQuality(null); setFieldOverrides(null); setSelectedId(null); setExpandedQuality(null); setExpandedUsage(null); }, [activeStep]);

  const toggleNode = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
    setExpandedQuality(null);
    setExpandedUsage(null);
  }, []);

  const toggleQuality = useCallback((q: QualityMode) => {
    setExpandedQuality((prev) => (prev === q ? null : q));
    setSelectedId(null);
    setExpandedUsage(null);
  }, []);

  const toggleUsage = useCallback((level: UsageLevel) => {
    setExpandedUsage((prev) => (prev === level ? null : level));
    setSelectedId(null);
    setExpandedQuality(null);
  }, []);

  const isBare = quality === "bare";
  const showRoles = fields.roles;
  const showArc = fields.arc;
  const showThesis = fields.thesis;
  const showTension = fields.tension;
  const showEdgeLabels = fields.verbs;

  const selectedNode = selectedId ? NODES.find((n) => n.id === selectedId) ?? null : null;

  const resolvedNodes = useMemo(() =>
    NODES.map((n, i) => {
      const scale = showRoles ? ROLE_SCALE[n.role] : 1;
      let variant: "idle" | "selected" | "hovered" | "dimmed" = "idle";
      if (selectedId === n.id) variant = "selected";
      else if (selectedId !== null) variant = "dimmed";
      else if (hoveredId === n.id) variant = "hovered";
      const arcIndex = showArc ? ARC.indexOf(n.id) : -1;
      return { ...n, scale, variant, arcIndex, staggerIdx: showArc && arcIndex >= 0 ? arcIndex : i };
    }),
    [showRoles, selectedId, hoveredId, showArc],
  );

  const resolvedEdges = useMemo(() =>
    EDGES.map((e) => {
      const from = NODES.find((n) => n.id === e.from)!;
      const to = NODES.find((n) => n.id === e.to)!;
      const geo = cubicEdge(from, to);
      const isLit = selectedId === e.from || selectedId === e.to;
      const isDimmed = selectedId !== null && !isLit;
      return { ...e, ...geo, isLit, isDimmed };
    }),
    [selectedId],
  );

  const selectedEdges = selectedNode
    ? EDGES.filter((e) => e.from === selectedNode.id || e.to === selectedNode.id)
    : [];

  const nothingExpanded = !selectedNode && !expandedQuality && expandedUsage === null;

  const hintText =
    activeStep <= 2 ? "Bare mode — every node identical, no labels, no story. Click one."
    : activeStep <= 4 ? "Semantic mode active — click a node to compare bare vs semantic"
    : activeStep === 5 ? "Level 0: one import, everything handled. Click a quality tab."
    : activeStep === 6 ? "Level 1: custom detail panel. Click to see the code pattern."
    : activeStep === 7 ? "Level 2: you own selection state. External coordination."
    : "Level 3: hook only. You bring the renderers. Maximum control.";

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
                    style={{ color: "var(--color-accent)", background: "color-mix(in srgb, var(--color-bg) 80%, transparent)" }}>
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
          aria-label="Assembly demo diagram"
          onClick={() => { setSelectedId(null); setExpandedQuality(null); setExpandedUsage(null); }}
        >
          <LabSvgDefs prefix="asm" />
          <rect x={-20} y={-20} width={VIEWBOX.w + 40} height={VIEWBOX.h + 40} fill="url(#asm-grid)" />
          <rect x={-20} y={-20} width={VIEWBOX.w + 40} height={VIEWBOX.h + 40} fill="url(#asm-vignette)" />

          {resolvedEdges.map((e) => {
            const from = NODES.find((n) => n.id === e.from)!;
            const to = NODES.find((n) => n.id === e.to)!;
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;
            const edgeStroke = e.isLit ? "var(--color-accent)" : "var(--color-muted)";
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
                  <path d={arrowD} fill={edgeStroke}
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
            const opacity = n.variant === "dimmed" ? 0.4 : 1;
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
                filter={isSelected ? "url(#asm-glow)" : undefined}
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
                  rx={rx} fill="url(#asm-node-grad)" pointerEvents="none" strokeOpacity={0}
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
        {/* Quality + Usage tabs */}
        <div className="flex items-center gap-1 px-4 py-2 flex-wrap">
          <span className="font-mono text-xs uppercase tracking-wider mr-2" style={{ color: "var(--color-muted)", opacity: 0.5 }}>
            quality
          </span>
          {QUALITY_MODES.map((q) => {
            const reached = QUALITY_MODES.indexOf(quality) >= QUALITY_MODES.indexOf(q);
            const isCurrent = quality === q;
            const isExpanded = expandedQuality === q;
            const c = QC[q];
            if (!reached) return null;
            return (
              <button
                key={q}
                type="button"
                onClick={() => { setManualQuality(q); toggleQuality(q); }}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-colors hover:bg-white/5"
                style={{
                  background: isExpanded ? "color-mix(in srgb, var(--color-surface-2) 60%, transparent)" : undefined,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{ background: c.dot, boxShadow: isCurrent ? `0 0 4px ${c.dot}` : "none" }} />
                <span className="font-mono text-xs" style={{ color: isExpanded ? "var(--color-text)" : "var(--color-muted)" }}>
                  {q}
                </span>
              </button>
            );
          })}
          {activeStep >= 5 && (
            <>
              <span className="font-mono text-xs uppercase tracking-wider mx-2" style={{ color: "var(--color-muted)", opacity: 0.5 }}>
                usage
              </span>
              {([0, 1, 2, 3] as UsageLevel[]).filter((l) => l <= usageLevel).map((level) => {
                const isExpanded = expandedUsage === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => toggleUsage(level)}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-colors hover:bg-white/5"
                    style={{
                      background: isExpanded ? "color-mix(in srgb, var(--color-surface-2) 60%, transparent)" : undefined,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: UC.dot }} />
                    <span className="font-mono text-xs" style={{ color: isExpanded ? "var(--color-text)" : "var(--color-muted)" }}>
                      L{level}
                    </span>
                  </button>
                );
              })}
            </>
          )}
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
                <div className="flex flex-col gap-0.5 mt-2">
                  {QUALITY_MODES.filter((q) => QUALITY_MODES.indexOf(quality) >= QUALITY_MODES.indexOf(q)).map((q) => {
                    const isCurrent = quality === q;
                    const c = QC[q];
                    return (
                      <div key={q} className="flex gap-2 items-start">
                        <span className="shrink-0 w-1.5 h-1.5 rounded-full mt-[5px]"
                          style={{ background: c.dot, opacity: isCurrent ? 1 : 0.4 }} />
                        <span className="font-mono text-xs" style={{
                          color: isCurrent ? c.text : "var(--color-muted)",
                          lineHeight: 1.5, opacity: isCurrent ? 1 : 0.5,
                        }}>
                          <strong style={{ fontWeight: 600 }}>{q}:</strong> {selectedNode.qualityDetails[q]}
                        </span>
                      </div>
                    );
                  })}
                </div>
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
            ) : expandedQuality ? (
              <motion.div
                key={`q-${expandedQuality}`}
                initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={TRANSITION.enterItem}
              >
                <div className="font-mono text-xs font-semibold" style={{ color: QC[expandedQuality].text }}>
                  {QUALITY_INFO[expandedQuality].title}
                </div>
                <div className="font-mono text-xs mt-1 font-medium" style={{ color: "var(--color-muted)", lineHeight: 1.5 }}>
                  {QUALITY_INFO[expandedQuality].what}
                </div>
                <div className="font-mono text-xs mt-0.5" style={{ color: QC[expandedQuality].text, lineHeight: 1.5 }}>
                  {QUALITY_INFO[expandedQuality].effect}
                </div>
              </motion.div>
            ) : expandedUsage !== null ? (
              <motion.div
                key={`u-${expandedUsage}`}
                initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={TRANSITION.enterItem}
              >
                <div className="font-mono text-xs font-semibold" style={{ color: UC.text }}>
                  {USAGE_INFO[expandedUsage].title}
                </div>
                <div
                  className="font-mono text-xs mt-1.5 px-1.5 py-1 rounded"
                  style={{ color: "var(--color-accent)", background: "color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))", lineHeight: 1.5 }}
                >
                  {USAGE_INFO[expandedUsage].code}
                </div>
                <div className="font-mono text-xs mt-1" style={{ color: "var(--color-muted)", lineHeight: 1.5 }}>
                  {USAGE_INFO[expandedUsage].detail}
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

          {/* Semantic field toggles — inline, when not bare */}
          {!isBare && (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid color-mix(in srgb, var(--color-border) 50%, transparent)" }}>
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-xs uppercase tracking-wider" style={{ color: "var(--color-muted)", opacity: 0.5 }}>
                  semantic fields
                </span>
                <DialToggle label="Thesis" value={fields.thesis} onChange={(v) => toggleField("thesis", v)} />
                <DialToggle label="Roles" value={fields.roles} onChange={(v) => toggleField("roles", v)} />
                <DialToggle label="Verbs" value={fields.verbs} onChange={(v) => toggleField("verbs", v)} />
                <DialToggle label="Arc" value={fields.arc} onChange={(v) => toggleField("arc", v)} />
                <DialToggle label="Tension" value={fields.tension} onChange={(v) => toggleField("tension", v)} />
                {fieldOverrides && (
                  <button
                    type="button"
                    onClick={() => setFieldOverrides(null)}
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
