"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION, STAGGER } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { DialToggle, DialPanel, DialChips } from "@/components/ui/dialkit";
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

const QUALITY_CHIP_COLORS: Partial<Record<QualityMode, string>> = {
  bare: QC.bare.dot,
  semantic: QC.semantic.dot,
  full: QC.full.dot,
};

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

  useEffect(() => { setManualQuality(null); setFieldOverrides(null); setSelectedId(null); }, [activeStep]);

  const toggleNode = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const reachedModes = useMemo(
    () => QUALITY_MODES.filter((_, i) => i <= QUALITY_MODES.indexOf(getQualityMode(activeStep))),
    [activeStep],
  );

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
          onClick={() => setSelectedId(null)}
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

      {/* ── Workshop ─────────────────────────────────── */}
      <div
        className="shrink-0 overflow-y-auto flex flex-col gap-2 p-3"
        style={{ maxHeight: "50%", borderTop: "1px solid var(--color-border)" }}
      >
        <DialPanel title="Quality" accent={QC[quality].dot}>
          <DialChips
            label="Mode"
            options={reachedModes}
            value={quality}
            onChange={(q) => { setManualQuality(q); setFieldOverrides(null); }}
            colors={QUALITY_CHIP_COLORS}
          />
          <p className="font-mono text-xs" style={{ color: QC[quality].text, lineHeight: 1.5 }}>
            {QUALITY_INFO[quality].effect}
          </p>
        </DialPanel>

        {!isBare && (
          <DialPanel title="Semantic Fields">
            <DialToggle label="Thesis" value={fields.thesis} onChange={(v) => toggleField("thesis", v)} />
            <DialToggle label="Roles" value={fields.roles} onChange={(v) => toggleField("roles", v)} />
            <DialToggle label="Verbs" value={fields.verbs} onChange={(v) => toggleField("verbs", v)} />
            <DialToggle label="Arc" value={fields.arc} onChange={(v) => toggleField("arc", v)} />
            <DialToggle label="Tension" value={fields.tension} onChange={(v) => toggleField("tension", v)} />
            {fieldOverrides && (
              <button
                type="button"
                onClick={() => setFieldOverrides(null)}
                className="font-mono text-xs mt-0.5 self-start transition-colors hover:text-[var(--color-text)]"
                style={{ color: "var(--color-muted)" }}
              >
                ↺ reset to {quality}
              </button>
            )}
          </DialPanel>
        )}

        {activeStep >= 5 && (
          <DialPanel title="Usage" accent={UC.dot}>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs shrink-0" style={{ color: "var(--color-muted)", minWidth: 52 }}>Level</span>
              <span className="font-mono text-xs font-semibold" style={{ color: UC.text }}>
                {USAGE_INFO[usageLevel].title}
              </span>
            </div>
            <code
              className="block font-mono text-xs px-1.5 py-1 rounded"
              style={{
                color: "var(--color-accent)",
                background: "color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))",
                lineHeight: 1.5,
              }}
            >
              {USAGE_INFO[usageLevel].code}
            </code>
            <p className="font-mono text-xs" style={{ color: "var(--color-muted)", lineHeight: 1.5 }}>
              {USAGE_INFO[usageLevel].detail}
            </p>
          </DialPanel>
        )}

        <AnimatePresence>
          {selectedNode && (
            <motion.div
              key={`inspect-${selectedNode.id}`}
              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={TRANSITION.enterItem}
            >
              <DialPanel title={selectedNode.label} accent="var(--color-accent)">
                <span className="font-mono text-xs" style={{ color: "var(--color-muted)" }}>
                  {selectedNode.role} — {selectedNode.brief}
                </span>
                <div className="flex flex-col gap-0.5">
                  {reachedModes.map((q) => {
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
                  <div className="pt-1.5" style={{ borderTop: "1px solid color-mix(in srgb, var(--color-border) 50%, transparent)" }}>
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
              </DialPanel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
