"use client";

import { useState, useMemo, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION, DURATION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { DialToggle } from "@/components/ui/dialkit";

// ── Types ──────────────────────────────────────────────────────

type Vec2 = { x: number; y: number };
type NodeDef = {
  id: string;
  label: string;
  pos: Vec2;
  w: number;
  h: number;
};
type EdgeDef = { from: string; to: string };

// ── Phase 1: Bespoke gallery data ──────────────────────────────

const DIAGRAM_CONFIGS = [
  {
    caption: "Article 1",
    palette: { fill: "var(--color-surface-2, #1e1e2e)", stroke: "#6e7681", text: "var(--color-text, #cdd6f4)", fontFamily: "var(--font-sans)", fontSize: 9, rx: 2 },
    nodes: [
      { id: "api", label: "API Gateway", pos: { x: 110, y: 22 }, w: 72, h: 24 },
      { id: "cfg", label: "Configuration Manager", pos: { x: 110, y: 62 }, w: 72, h: 24 },
      { id: "db", label: "Database", pos: { x: 50, y: 108 }, w: 60, h: 24 },
      { id: "cache", label: "Cache", pos: { x: 170, y: 108 }, w: 52, h: 24 },
      { id: "log", label: "Logger", pos: { x: 110, y: 145 }, w: 56, h: 22 },
    ] satisfies NodeDef[],
    edges: [
      { from: "api", to: "cfg" },
      { from: "cfg", to: "db" },
      { from: "cfg", to: "cache" },
      { from: "db", to: "log" },
      { from: "cache", to: "log" },
    ],
    issue: { label: "text clipping", cx: 110, cy: 62, r: 50 },
    clipNodeId: "cfg",
  },
  {
    caption: "Article 2",
    palette: { fill: "oklch(22% 0.02 180)", stroke: "oklch(50% 0.1 180)", text: "oklch(88% 0.03 180)", fontFamily: "var(--font-mono)", fontSize: 10.5, rx: 10 },
    nodes: [
      { id: "client", label: "Client", pos: { x: 40, y: 22 }, w: 62, h: 26 },
      { id: "server", label: "Server", pos: { x: 170, y: 22 }, w: 62, h: 26 },
      { id: "auth", label: "Auth", pos: { x: 40, y: 72 }, w: 56, h: 26 },
      { id: "store", label: "Store", pos: { x: 140, y: 118 }, w: 56, h: 26 },
      { id: "notify", label: "Notify", pos: { x: 40, y: 145 }, w: 56, h: 22 },
    ] satisfies NodeDef[],
    edges: [
      { from: "client", to: "auth" },
      { from: "server", to: "auth" },
      { from: "auth", to: "store" },
      { from: "client", to: "notify" },
    ],
    issue: { label: "edge overlap", cx: 40, cy: 72, r: 30 },
    clipNodeId: null,
  },
  {
    caption: "Article 3",
    palette: { fill: "oklch(24% 0.03 60)", stroke: "oklch(55% 0.12 60)", text: "oklch(85% 0.06 60)", fontFamily: "var(--font-sans)", fontSize: 9.5, rx: 12 },
    nodes: [
      { id: "entry", label: "Entry", pos: { x: 110, y: 22 }, w: 58, h: 24 },
      { id: "parse", label: "Parser", pos: { x: 50, y: 65 }, w: 58, h: 24 },
      { id: "validate", label: "Validate", pos: { x: 170, y: 65 }, w: 62, h: 24 },
      { id: "transform", label: "Transform", pos: { x: 110, y: 110 }, w: 66, h: 24 },
      { id: "output", label: "Output", pos: { x: 110, y: 148 }, w: 54, h: 22 },
    ] satisfies NodeDef[],
    edges: [
      { from: "entry", to: "parse" },
      { from: "entry", to: "validate" },
      { from: "parse", to: "transform" },
      { from: "validate", to: "transform" },
      { from: "transform", to: "output" },
    ],
    issue: { label: "no hover states", cx: 110, cy: 88, r: 68 },
    clipNodeId: null,
  },
] as const;

// ── Phase 2: Monolith config tree ──────────────────────────────

type ConfigNode = {
  key: string;
  value: string | ConfigNode[];
  isTarget?: boolean;
};

const MONOLITH_TREE: ConfigNode[] = [
  { key: "nodes", value: [
    { key: "ids", value: '["session", "auth", "storage", "api-gateway", "cache"]' },
    { key: "defaultShape", value: '"rounded-rect"' },
    { key: "defaultSize", value: '{ width: 160, height: 48 }' },
    { key: "labelPosition", value: '"center"' },
    { key: "showTooltips", value: "true" },
  ]},
  { key: "edges", value: [
    { key: "defaultType", value: '"smoothstep"' },
    { key: "animated", value: "false" },
    { key: "markerEnd", value: '"arrowclosed"' },
    { key: "strokeWidth", value: "1.5" },
  ]},
  { key: "layout", value: [
    { key: "algorithm", value: '"dagre"' },
    { key: "direction", value: '"TB"' },
    { key: "nodeSeparation", value: "60" },
    { key: "rankSeparation", value: "80" },
  ]},
  { key: "nodeStyles", value: [
    { key: "default", value: [
      { key: "fill", value: '"var(--color-surface)"' },
      { key: "stroke", value: '"var(--color-border)"' },
      { key: "rx", value: "6" },
      { key: "fontSize", value: "13" },
      { key: "fontWeight", value: "500" },
    ]},
    { key: "overrides", value: [
      { key: "session", value: [
        { key: "fill", value: '"oklch(30% 0.08 260)"' },
        { key: "stroke", value: '"var(--color-app-accent)"' },
        { key: "animationOverrides", value: [
          { key: "entrance", value: [
            { key: "type", value: '"spring"', isTarget: true },
            { key: "stiffness", value: "300", isTarget: true },
            { key: "damping", value: "22", isTarget: true },
          ]},
        ]},
      ]},
    ]},
  ]},
  { key: "transitionConfig", value: [
    { key: "defaultEasing", value: '"easeOut"' },
    { key: "duration", value: "0.35" },
    { key: "stagger", value: "0.06" },
  ]},
  { key: "interaction", value: [
    { key: "selectable", value: "true" },
    { key: "detailPanelPosition", value: '"inline"' },
    { key: "dimUnselected", value: "true" },
    { key: "keyboardNavigation", value: "true" },
  ]},
];

// ── Rendering helpers ──────────────────────────────────────────

const VB = { w: 220, h: 165 };
const FIX_LOC = { clipping: 15, routing: 25, interaction: 45 } as const;

function findNode(nodes: readonly NodeDef[], id: string) {
  return nodes.find((n) => n.id === id)!;
}

const DiagramSvg = memo(function DiagramSvg({
  config,
  highlightIssue,
  focusIndex,
  reducedMotion,
  diagramIndex,
  onBrokenClick,
  fixClipping,
  fixRouting,
  fixInteraction,
  selectedId,
  onSelect,
  hoveredId,
  onHover,
}: {
  config: (typeof DIAGRAM_CONFIGS)[number];
  highlightIssue: boolean;
  focusIndex: number | null;
  reducedMotion: boolean;
  diagramIndex: number;
  onBrokenClick?: () => void;
  fixClipping?: boolean;
  fixRouting?: boolean;
  fixInteraction?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
}) {
  const { palette, nodes, edges, issue, clipNodeId } = config;
  const isFocused = focusIndex === null || focusIndex === diagramIndex;
  const opacity = isFocused ? 1 : 0.3;

  const isFixed =
    (fixClipping && diagramIndex === 0) ||
    (fixRouting && diagramIndex === 1) ||
    (fixInteraction && diagramIndex === 2);

  const issueLabelPos = diagramIndex === 0
    ? { x: 110, y: 80 }
    : diagramIndex === 1
      ? { x: 82, y: 42 }
      : { x: 110, y: 81 };

  return (
    <motion.svg
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      className="w-full"
      animate={{ opacity }}
      transition={TRANSITION.enterCard}
      role="img"
      aria-label={`Diagram ${diagramIndex + 1}: ${issue.label}`}
      onClick={fixInteraction ? () => onSelect?.(null) : undefined}
    >
      <defs>
        <filter id={`glow-${diagramIndex}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
          <feFlood floodColor="var(--color-accent)" floodOpacity="0.3" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={`node-grad-${diagramIndex}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.07" />
          <stop offset="40%" stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity="0.05" />
        </linearGradient>
        <radialGradient id={`vignette-${diagramIndex}`} cx="50%" cy="45%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="70%" stopColor="transparent" />
          <stop offset="100%" stopColor="black" stopOpacity="0.06" />
        </radialGradient>
        <pattern id={`grid-${diagramIndex}`} width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="0.4" fill={palette.stroke} opacity="0.12" />
        </pattern>
      </defs>

      <rect width={VB.w} height={VB.h} fill={`url(#grid-${diagramIndex})`} />
      <rect width={VB.w} height={VB.h} fill={`url(#vignette-${diagramIndex})`} />

      {edges.map((e) => {
        const from = findNode(nodes, e.from);
        const to = findNode(nodes, e.to);
        const isRoutedEdge = fixRouting && e.from === "client" && e.to === "notify";
        const isLit = fixInteraction && (selectedId === e.from || selectedId === e.to);
        const isDimmed = fixInteraction && selectedId !== null && !isLit;
        const edgeOpacity = isDimmed ? 0.2 : 1;
        const stroke = isLit ? "var(--color-accent)" : palette.stroke;

        if (isRoutedEdge) {
          const y1 = from.pos.y + from.h / 2;
          const y2 = to.pos.y - to.h / 2;
          const routedPath = `M ${from.pos.x} ${y1} L 8 ${y1} L 8 ${y2} L ${to.pos.x} ${y2}`;
          return (
            <g key={`${e.from}-${e.to}-routed`}>
              {isLit && (
                <path d={routedPath} fill="none" stroke="var(--color-accent)" strokeWidth={6} strokeLinecap="round" opacity={0.08} />
              )}
              <motion.path
                d={routedPath}
                fill="none"
                stroke={stroke}
                strokeWidth={isLit ? 1.5 : 1}
                initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: edgeOpacity }}
                transition={{ pathLength: { duration: DURATION.slow }, opacity: TRANSITION.enterCard }}
              />
            </g>
          );
        }

        const x1 = from.pos.x, y1 = from.pos.y + from.h / 2;
        const x2 = to.pos.x, y2 = to.pos.y - to.h / 2;
        const midY = (y1 + y2) / 2;
        const curvePath = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
        return (
          <g key={`${e.from}-${e.to}`}>
            {isLit && (
              <path d={curvePath} fill="none" stroke="var(--color-accent)" strokeWidth={6} strokeLinecap="round" opacity={0.08} />
            )}
            <motion.path
              d={curvePath}
              fill="none"
              stroke={stroke}
              strokeWidth={isLit ? 1.5 : 1}
              animate={{ opacity: edgeOpacity }}
              transition={TRANSITION.enterCard}
            />
          </g>
        );
      })}

      {nodes.map((n) => {
        const autoW = fixClipping
          ? Math.max(n.w, n.label.length * palette.fontSize * 0.6 + 14)
          : n.w;
        const needsClip = !fixClipping && clipNodeId === n.id;
        const clipId = `clip-${n.id}-${diagramIndex}`;

        const isSelected = fixInteraction && selectedId === n.id;
        const isHovered = fixInteraction && hoveredId === n.id;
        const isDimmed = fixInteraction && selectedId !== null && !isSelected;

        const nodeFill = isSelected
          ? `color-mix(in srgb, var(--color-accent) 14%, ${palette.fill})`
          : palette.fill;
        const nodeStroke = isSelected || isHovered
          ? "var(--color-accent)"
          : palette.stroke;
        const nodeSw = isSelected ? 1.5 : 1;
        const nodeOpacity = isDimmed ? 0.3 : 1;

        const isInteractive = fixInteraction || diagramIndex === 2;

        const handleClick = (ev: React.MouseEvent) => {
          if (fixInteraction) {
            ev.stopPropagation();
            onSelect?.(selectedId === n.id ? null : n.id);
          } else if (diagramIndex === 2) {
            onBrokenClick?.();
          }
        };

        const handleKeyDown = (ev: React.KeyboardEvent) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            if (fixInteraction) {
              onSelect?.(selectedId === n.id ? null : n.id);
            } else if (diagramIndex === 2) {
              onBrokenClick?.();
            }
          }
        };

        return (
          <motion.g
            key={n.id}
            animate={{ opacity: nodeOpacity }}
            transition={TRANSITION.enterCard}
            filter={isSelected ? `url(#glow-${diagramIndex})` : undefined}
            onMouseEnter={fixInteraction ? () => onHover?.(n.id) : undefined}
            onMouseLeave={fixInteraction ? () => onHover?.(null) : undefined}
            {...(isInteractive ? {
              tabIndex: 0,
              role: "button" as const,
              "aria-label": `${n.label}${isSelected ? " (selected)" : ""}`,
              onKeyDown: handleKeyDown,
              style: { outline: "none", cursor: "pointer" },
            } : {})}
          >
            {needsClip && (
              <defs>
                <clipPath id={clipId}>
                  <rect x={n.pos.x - autoW / 2} y={n.pos.y - n.h / 2} width={autoW} height={n.h} />
                </clipPath>
              </defs>
            )}
            {/* 44x44 transparent hit area for touch targets */}
            <rect
              x={n.pos.x - 22}
              y={n.pos.y - 22}
              width={44}
              height={44}
              fill="transparent"
              stroke="none"
              onClick={handleClick}
            />
            <motion.rect
              animate={{ x: n.pos.x - autoW / 2, width: autoW }}
              y={n.pos.y - n.h / 2 + 1.5}
              height={n.h}
              rx={palette.rx}
              fill="black"
              opacity={0.08}
              strokeOpacity={0}
              pointerEvents="none"
              transition={SPRING.snappy}
            />
            <motion.rect
              animate={{ x: n.pos.x - autoW / 2, width: autoW }}
              y={n.pos.y - n.h / 2}
              height={n.h}
              rx={palette.rx}
              fill={nodeFill}
              stroke={nodeStroke}
              strokeWidth={nodeSw}
              style={{ transition: "fill 0.2s, stroke 0.2s, stroke-opacity 0.2s" }}
              pointerEvents="none"
              transition={SPRING.snappy}
            />
            <motion.rect
              animate={{ x: n.pos.x - autoW / 2, width: autoW }}
              y={n.pos.y - n.h / 2}
              height={n.h}
              rx={palette.rx}
              fill={`url(#node-grad-${diagramIndex})`}
              pointerEvents="none"
              strokeOpacity={0}
              transition={SPRING.snappy}
            />
            <line
              x1={n.pos.x - autoW / 2 + palette.rx}
              y1={n.pos.y - n.h / 2 + 0.5}
              x2={n.pos.x + autoW / 2 - palette.rx}
              y2={n.pos.y - n.h / 2 + 0.5}
              stroke="white"
              strokeOpacity={isSelected ? 0.12 : 0.06}
              strokeWidth={0.5}
              pointerEvents="none"
            />
            <text
              x={n.pos.x}
              y={n.pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={palette.fontSize}
              fill={isSelected || isHovered ? "var(--color-accent)" : palette.text}
              fontFamily={palette.fontFamily}
              clipPath={needsClip ? `url(#${clipId})` : undefined}
              pointerEvents="none"
            >
              {n.label}
            </text>
          </motion.g>
        );
      })}

      {/* Issue overlay — targeted per-issue indicators */}
      <AnimatePresence>
        {highlightIssue && !isFixed && (
          <motion.g
            key="issue-error"
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : SPRING.gentle}
          >
            {diagramIndex === 0 && (() => {
              const n = findNode(nodes, "cfg");
              const hw = n.w / 2 + 3, hh = n.h / 2 + 3;
              return (
                <>
                  <rect x={n.pos.x - hw} y={n.pos.y - hh} width={hw * 2} height={hh * 2} rx={palette.rx}
                    fill="none" stroke="var(--color-error)" strokeWidth={1.2} strokeDasharray="3 2" />
                  <line x1={n.pos.x - hw - 4} y1={n.pos.y - 4} x2={n.pos.x - hw - 4} y2={n.pos.y + 4}
                    stroke="var(--color-error)" strokeWidth={2} strokeLinecap="round" />
                  <line x1={n.pos.x + hw + 4} y1={n.pos.y - 4} x2={n.pos.x + hw + 4} y2={n.pos.y + 4}
                    stroke="var(--color-error)" strokeWidth={2} strokeLinecap="round" />
                </>
              );
            })()}
            {diagramIndex === 1 && (() => {
              const from = findNode(nodes, "client");
              const to = findNode(nodes, "auth");
              const y1 = from.pos.y + from.h / 2;
              const y2 = to.pos.y - to.h / 2;
              const midY = (y1 + y2) / 2;
              return (
                <>
                  <line x1={from.pos.x} y1={y1} x2={from.pos.x} y2={y2}
                    stroke="var(--color-error)" strokeWidth={3.5} opacity={0.4} strokeLinecap="round" />
                  <circle cx={from.pos.x} cy={midY} r={3} fill="var(--color-error)" opacity={0.9} />
                </>
              );
            })()}
            {diagramIndex === 2 && (() => {
              const targets = [findNode(nodes, "entry"), findNode(nodes, "output")];
              return (
                <>
                  {targets.map((n) => {
                    const ix = n.pos.x + n.w / 2 + 4;
                    const iy = n.pos.y - n.h / 2 - 4;
                    return (
                      <g key={`no-${n.id}`}>
                        <circle cx={ix} cy={iy} r={5} fill="none" stroke="var(--color-error)" strokeWidth={1.2} />
                        <line x1={ix - 3.5} y1={iy + 3.5} x2={ix + 3.5} y2={iy - 3.5}
                          stroke="var(--color-error)" strokeWidth={1.2} />
                      </g>
                    );
                  })}
                </>
              );
            })()}
            <rect x={issueLabelPos.x - 34} y={issueLabelPos.y} width={68} height={13} rx={2.5}
              fill="var(--color-error-muted)" stroke="var(--color-error)" strokeWidth={0.7} />
            <text x={issueLabelPos.x} y={issueLabelPos.y + 9.5} textAnchor="middle" fontSize={7.5}
              fill="var(--color-muted)" fontFamily="var(--font-mono)">
              {issue.label}
            </text>
          </motion.g>
        )}
        {highlightIssue && isFixed && (
          <motion.g
            key="issue-fixed"
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : SPRING.gentle}
          >
            <rect x={issueLabelPos.x - 17} y={issueLabelPos.y} width={34} height={13} rx={2.5}
              fill="var(--color-success-muted)" stroke="var(--color-success)" strokeWidth={0.7} />
            <text x={issueLabelPos.x} y={issueLabelPos.y + 9.5} textAnchor="middle" fontSize={7.5}
              fill="var(--color-success)" fontFamily="var(--font-mono)">
              fixed
            </text>
          </motion.g>
        )}
      </AnimatePresence>
    </motion.svg>
  );
});

// ── Config tree renderer ───────────────────────────────────────

function ConfigTreeNode({
  node,
  depth,
  expanded,
  onToggle,
  targetReached,
}: {
  node: ConfigNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  targetReached: boolean;
}) {
  const path = depth === 0 ? node.key : `${depth}-${node.key}`;
  const isArray = Array.isArray(node.value);
  const isOpen = expanded.has(path);

  if (!isArray) {
    return (
      <div
        className="flex gap-2 py-0.5 pl-1"
        style={{
          paddingLeft: depth * 16,
          background: node.isTarget && targetReached ? "color-mix(in srgb, var(--color-accent) 15%, var(--color-surface))" : undefined,
          borderRadius: node.isTarget ? 4 : undefined,
        }}
      >
        <span style={{ color: "var(--color-accent)" }} className="font-mono text-xs">{node.key}</span>
        <span style={{ color: "var(--color-muted)" }} className="font-mono text-xs">:</span>
        <span style={{ color: "var(--color-text)" }} className="font-mono text-xs">{node.value as string}</span>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(path)}
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 py-0.5 w-full text-left hover:bg-[var(--color-surface-2)] rounded"
        style={{ paddingLeft: depth * 16 }}
      >
        <span
          className="text-xs transition-transform"
          style={{
            transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
            color: "var(--color-muted)",
          }}
        >
          {"▶"}
        </span>
        <span style={{ color: "var(--color-accent)" }} className="font-mono text-xs">{node.key}</span>
        <span style={{ color: "var(--color-muted)" }} className="font-mono text-xs">
          {isOpen ? "" : `{${(node.value as ConfigNode[]).length}}`}
        </span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={TRANSITION.collapse}
            style={{ overflow: "hidden" }}
          >
            {(node.value as ConfigNode[]).map((child) => (
              <ConfigTreeNode
                key={child.key}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                onToggle={onToggle}
                targetReached={targetReached}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main lab component ─────────────────────────────────────────

type EvolutionLabProps = {
  activeStep: number;
};

export function EvolutionLab({ activeStep }: EvolutionLabProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [highlightIssues, setHighlightIssues] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [clickedBroken, setClickedBroken] = useState(false);

  const [fixClipping, setFixClipping] = useState(false);
  const [fixRouting, setFixRouting] = useState(false);
  const [fixInteraction, setFixInteraction] = useState(false);
  const [d3Selected, setD3Selected] = useState<string | null>(null);
  const [d3Hovered, setD3Hovered] = useState<string | null>(null);

  useEffect(() => {
    if (!fixInteraction) {
      setD3Selected(null);
      setD3Hovered(null);
    }
  }, [fixInteraction]);

  useEffect(() => {
    if (!clickedBroken) return;
    const t = setTimeout(() => setClickedBroken(false), 3000);
    return () => clearTimeout(t);
  }, [clickedBroken]);

  const totalLoc =
    (fixClipping ? FIX_LOC.clipping : 0) +
    (fixRouting ? FIX_LOC.routing : 0) +
    (fixInteraction ? FIX_LOC.interaction : 0);

  const toggleExpand = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const focusIndex = activeStep >= 2 && activeStep <= 4 ? activeStep - 2 : null;

  const showBespoke = activeStep <= 4;
  const showMonolith = activeStep >= 5;

  const targetReached = expanded.has("nodeStyles") &&
    expanded.has("1-overrides") &&
    expanded.has("2-session") &&
    expanded.has("3-animationOverrides");

  const propDisplay = useMemo(() => {
    let count = 0;
    function countProps(nodes: ConfigNode[], exp: Set<string>, depth: number) {
      for (const node of nodes) {
        const path = depth === 0 ? node.key : `${depth}-${node.key}`;
        if (Array.isArray(node.value)) {
          if (exp.has(path)) countProps(node.value, exp, depth + 1);
        } else {
          count++;
        }
      }
    }
    countProps(MONOLITH_TREE, expanded, 0);
    return count;
  }, [expanded]);

  const hintText =
    activeStep === 1 ? "Toggle Highlight Issues — then use the Bug Fix toggles below"
    : activeStep === 2 ? "Toggle 'Fix clipping' — watch Configuration Manager expand to fit"
    : activeStep === 3 ? "Toggle 'Fix routing' — the Client→Notify edge reroutes around Auth"
    : activeStep === 4 ? "Toggle 'Fix interaction' — then click nodes in Diagram 3"
    : activeStep === 5 ? "Expand each section — watch the prop counter grow"
    : activeStep === 6 ? "Navigate: nodeStyles → overrides → session → animationOverrides"
    : activeStep === 7 ? "Keep expanding — watch the prop counter climb."
    : "One animation change. Four levels deep.";

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-bg)" }}>

      {/* ── Hero content ──────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          {showBespoke && (
            <motion.div
              key="bespoke"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={TRANSITION.enterCard}
              className="flex flex-col items-center gap-2 p-4 h-full"
            >
              {DIAGRAM_CONFIGS.map((config, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5 w-full" style={{ maxWidth: 280 }}>
                  <div className="rounded-lg overflow-hidden w-full" style={{ background: "var(--color-bg)" }}>
                    <DiagramSvg
                      config={config}
                      highlightIssue={highlightIssues}
                      focusIndex={focusIndex}
                      reducedMotion={reducedMotion}
                      diagramIndex={i}
                      onBrokenClick={() => setClickedBroken(true)}
                      fixClipping={i === 0 ? fixClipping : undefined}
                      fixRouting={i === 1 ? fixRouting : undefined}
                      fixInteraction={i === 2 ? fixInteraction : undefined}
                      selectedId={i === 2 ? d3Selected : undefined}
                      onSelect={i === 2 ? setD3Selected : undefined}
                      hoveredId={i === 2 ? d3Hovered : undefined}
                      onHover={i === 2 ? setD3Hovered : undefined}
                    />
                  </div>
                  <span className="text-xs font-mono" style={{ color: "var(--color-muted)" }}>
                    {config.caption}
                  </span>
                </div>
              ))}
            </motion.div>
          )}

          {showMonolith && (
            <motion.div
              key="monolith"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={TRANSITION.enterCard}
              className="p-4"
            >
              <div className="rounded-lg p-3" style={{ background: "var(--color-bg)" }}>
                {MONOLITH_TREE.map((node) => (
                  <ConfigTreeNode
                    key={node.key}
                    node={node}
                    depth={0}
                    expanded={expanded}
                    onToggle={toggleExpand}
                    targetReached={targetReached}
                  />
                ))}
              </div>

              <AnimatePresence>
                {targetReached && (
                  <motion.div
                    initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={SPRING.gentle}
                    className="mt-3 px-3 py-2 text-center"
                  >
                    <span className="font-mono text-xs" style={{ color: "var(--color-accent)" }}>
                      4 levels deep to change one animation
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Readout strip ─────────────────────────────── */}
      <div
        className="shrink-0 overflow-y-auto"
        style={{ maxHeight: "45%", borderTop: "1px solid var(--color-border)" }}
      >
        {/* Tab row */}
        <div className="flex items-center gap-1 px-4 py-2">
          <AnimatePresence mode="wait">
            {showBespoke ? (
              <motion.div key="bespoke-tabs" className="flex items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={TRANSITION.crossfade}>
                <span className="font-mono text-xs uppercase tracking-wider mr-2" style={{ color: "var(--color-muted)", opacity: 0.5 }}>
                  issues
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={highlightIssues}
                  aria-label="Highlight issues"
                  onClick={() => setHighlightIssues((v) => !v)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full transition-colors font-mono text-xs hover:bg-white/5 min-h-[28px]"
                  style={{
                    background: highlightIssues ? "var(--color-error-muted)" : undefined,
                    color: "var(--color-muted)",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full"
                    style={{ background: highlightIssues ? "var(--color-error)" : "var(--color-muted)" }} />
                  highlight
                </button>
              </motion.div>
            ) : (
              <motion.div key="monolith-tabs" className="flex items-center justify-between w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={TRANSITION.crossfade}>
                <span className="font-mono text-xs uppercase tracking-wider" style={{ color: "var(--color-muted)", opacity: 0.5 }}>
                  monolith config
                </span>
                <div className="flex items-center gap-2">
                  <motion.span
                    key={propDisplay}
                    className="font-mono text-xs px-2 py-0.5 rounded"
                    style={{
                      background: "color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))",
                      color: "var(--color-accent)",
                    }}
                    initial={reducedMotion ? false : { scale: 1.3 }}
                    animate={{ scale: 1 }}
                    transition={SPRING.snappy}
                  >
                    {propDisplay} props
                  </motion.span>
                  <button
                    type="button"
                    onClick={() => setExpanded(new Set())}
                    className="font-mono text-xs transition-colors hover:text-[var(--color-text)]"
                    style={{ color: "var(--color-muted)" }}
                  >
                    ↺ reset
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Readout content */}
        <div className="px-4 pb-3">
          <AnimatePresence mode="wait">
            {showBespoke ? (
              <motion.div key="bespoke-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={TRANSITION.crossfade}>
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-xs uppercase tracking-wider" style={{ color: "var(--color-muted)", opacity: 0.5 }}>
                    bug fixes
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <DialToggle label="Fix clipping" value={fixClipping} onChange={setFixClipping} />
                    </div>
                    <span className="font-mono text-xs shrink-0 tabular-nums"
                      style={{ color: fixClipping ? "var(--color-success)" : "var(--color-muted)", opacity: fixClipping ? 1 : 0.4 }}>
                      +{FIX_LOC.clipping}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <DialToggle label="Fix routing" value={fixRouting} onChange={setFixRouting} />
                    </div>
                    <span className="font-mono text-xs shrink-0 tabular-nums"
                      style={{ color: fixRouting ? "var(--color-success)" : "var(--color-muted)", opacity: fixRouting ? 1 : 0.4 }}>
                      +{FIX_LOC.routing}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <DialToggle label="Fix interaction" value={fixInteraction} onChange={setFixInteraction} />
                    </div>
                    <span className="font-mono text-xs shrink-0 tabular-nums"
                      style={{ color: fixInteraction ? "var(--color-success)" : "var(--color-muted)", opacity: fixInteraction ? 1 : 0.4 }}>
                      +{FIX_LOC.interaction}
                    </span>
                  </div>
                </div>

                <AnimatePresence>
                  {totalLoc > 0 && (
                    <motion.div
                      initial={reducedMotion ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={SPRING.snappy}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 mt-1.5 flex justify-between font-mono text-xs"
                        style={{ borderTop: "1px solid color-mix(in srgb, var(--color-border) 50%, transparent)" }}>
                        <span style={{ color: "var(--color-muted)" }}>× 4 articles</span>
                        <motion.span
                          key={totalLoc * 4}
                          initial={reducedMotion ? false : { scale: 1.4 }}
                          animate={{ scale: 1 }}
                          transition={SPRING.snappy}
                          style={{ color: "var(--color-error)", fontWeight: 600 }}
                        >
                          {totalLoc * 4} LOC
                        </motion.span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Interaction state readout */}
                <AnimatePresence>
                  {fixInteraction && d3Selected && (
                    <motion.div
                      initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={SPRING.snappy}
                      className="font-mono text-xs mt-2 pt-2"
                      style={{ borderTop: "1px solid color-mix(in srgb, var(--color-border) 50%, transparent)", color: "var(--color-accent)" }}
                    >
                      selectedId: &quot;{d3Selected}&quot;
                      <span style={{ color: "var(--color-muted)", marginLeft: 8 }}>state management in action</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Broken click toast */}
                <AnimatePresence>
                  {clickedBroken && (
                    <motion.div
                      initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={SPRING.snappy}
                      className="font-mono text-xs mt-2"
                      style={{ color: "var(--color-error)" }}
                      role="status"
                    >
                      Nothing happened. cursor: pointer promised — no onClick delivered.
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div key="monolith-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={TRANSITION.crossfade} />
            )}
          </AnimatePresence>

          {/* Hint — always shown at bottom */}
          <div className="mt-2">
            <span className="font-mono text-xs italic" style={{ color: "var(--color-muted)" }}>
              {hintText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
