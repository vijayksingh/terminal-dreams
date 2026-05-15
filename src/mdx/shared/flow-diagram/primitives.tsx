"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION, STAGGER } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type {
  ResolvedNode,
  ResolvedEdge,
  ResolvedGroup,
  FlowAnnotation,
  FlowNode,
  NodeVariant,
} from "./types";
import { DEFAULTS, diamondPath, hexagonPath, arrowheadPath } from "./geometry";
import type { UseFlowTimelineReturn } from "./use-flow-timeline";

// ── Spatial arrow-key navigation ─────────────────────────

const ARROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

function findSpatialNeighbor(
  from: ResolvedNode,
  all: ResolvedNode[],
  key: string,
): ResolvedNode | null {
  let best: ResolvedNode | null = null;
  let bestScore = Infinity;

  for (const n of all) {
    if (n.id === from.id || !n.interactive) continue;
    const dx = n.x - from.x;
    const dy = n.y - from.y;

    let aligned = false;
    switch (key) {
      case "ArrowRight": aligned = dx > 5 && Math.abs(dy) < Math.abs(dx) * 1.5; break;
      case "ArrowLeft":  aligned = dx < -5 && Math.abs(dy) < Math.abs(dx) * 1.5; break;
      case "ArrowDown":  aligned = dy > 5 && Math.abs(dx) < Math.abs(dy) * 1.5; break;
      case "ArrowUp":    aligned = dy < -5 && Math.abs(dx) < Math.abs(dy) * 1.5; break;
    }
    if (!aligned) continue;

    const dist = dx * dx + dy * dy;
    if (dist < bestScore) {
      bestScore = dist;
      best = n;
    }
  }
  return best;
}

// ── Marker definitions ───────────────────────────────────

export function FlowMarkerDefs({ id }: { id: string }) {
  return (
    <defs>
      <filter id={`fd-glow-${id}`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
        <feFlood floodColor="var(--color-accent)" floodOpacity="0.25" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id={`fd-glow-subtle-${id}`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="blur" />
        <feFlood floodColor="var(--color-accent)" floodOpacity="0.3" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

// ── Node shape SVG ───────────────────────────────────────

function variantFill(variant: NodeVariant, isProtagonist?: boolean): string {
  switch (variant) {
    case "selected":
    case "active":
      return "color-mix(in srgb, var(--color-accent) 14%, var(--color-surface))";
    case "hovered":
      return isProtagonist
        ? "color-mix(in srgb, var(--color-accent) 10%, var(--color-surface))"
        : "var(--color-surface-2)";
    case "error":
      return "color-mix(in srgb, #e06c75 8%, var(--color-surface))";
    default:
      return isProtagonist
        ? "color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))"
        : "var(--color-surface)";
  }
}

function variantStroke(variant: NodeVariant, accent?: boolean, isProtagonist?: boolean): string {
  switch (variant) {
    case "selected":
    case "active":
    case "hovered":
      return "var(--color-accent)";
    case "error":
      return "#e06c75";
    default:
      return (accent || isProtagonist) ? "var(--color-accent)" : "var(--color-border)";
  }
}

function variantStrokeOpacity(variant: NodeVariant, accent?: boolean, isProtagonist?: boolean): number {
  switch (variant) {
    case "selected":
    case "active":
      return 1;
    case "hovered":
      return isProtagonist ? 0.8 : 0.6;
    default:
      return isProtagonist ? 0.7 : accent ? 0.5 : 1;
  }
}

export function FlowNodeShape({ node }: { node: ResolvedNode }) {
  const w = node.resolvedW;
  const h = node.resolvedH;
  const shape = node.shape ?? "rect";
  const fill = variantFill(node.variant, node.isProtagonist);
  const stroke = variantStroke(node.variant, node.accent, node.isProtagonist);
  const strokeOpacity = variantStrokeOpacity(node.variant, node.accent, node.isProtagonist);
  const roleModifiers = DEFAULTS.role[node.effectiveRole ?? "supporting"];
  const sw = DEFAULTS.stroke.node * roleModifiers.strokeMultiplier;
  const x = node.x - w / 2;
  const y = node.y - h / 2;

  const sharedStyle = { transition: "fill 0.2s, stroke 0.2s, stroke-opacity 0.2s" };

  switch (shape) {
    case "pill":
      return (
        <rect
          x={x} y={y} width={w} height={h} rx={h / 2}
          fill={fill} stroke={stroke} strokeWidth={sw} strokeOpacity={strokeOpacity}
          style={sharedStyle}
        />
      );
    case "diamond":
      return (
        <path
          d={diamondPath(node.x, node.y, w, h)}
          fill={fill} stroke={stroke} strokeWidth={sw} strokeOpacity={strokeOpacity}
          style={sharedStyle}
        />
      );
    case "cylinder": {
      const ry = 4;
      return (
        <g style={sharedStyle}>
          <rect x={x} y={y + ry} width={w} height={h - ry}
            fill={fill} stroke={stroke} strokeWidth={sw} strokeOpacity={strokeOpacity} />
          <ellipse cx={node.x} cy={y + h} rx={w / 2} ry={ry}
            fill={fill} stroke={stroke} strokeWidth={sw} strokeOpacity={strokeOpacity} />
          <ellipse cx={node.x} cy={y + ry} rx={w / 2} ry={ry}
            fill={fill} stroke={stroke} strokeWidth={sw} strokeOpacity={strokeOpacity} />
        </g>
      );
    }
    case "circle": {
      const r = Math.min(w, h) / 2;
      return (
        <circle
          cx={node.x} cy={node.y} r={r}
          fill={fill} stroke={stroke} strokeWidth={sw} strokeOpacity={strokeOpacity}
          style={sharedStyle}
        />
      );
    }
    case "hexagon":
      return (
        <path
          d={hexagonPath(node.x, node.y, w, h)}
          fill={fill} stroke={stroke} strokeWidth={sw} strokeOpacity={strokeOpacity}
          style={sharedStyle}
        />
      );
    case "rect":
    default:
      return (
        <rect
          x={x} y={y} width={w} height={h} rx={DEFAULTS.node.r}
          fill={fill} stroke={stroke} strokeWidth={sw} strokeOpacity={strokeOpacity}
          style={sharedStyle}
        />
      );
  }
}

// ── Node label (SVG text or foreignObject) ───────────────

export function FlowNodeLabel({ node }: { node: ResolvedNode }) {
  if (node.render) {
    const w = node.resolvedW;
    const h = node.resolvedH;
    return (
      <foreignObject
        x={node.x - w / 2}
        y={node.y - h / 2}
        width={w}
        height={h}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {node.render({
            node,
            variant: node.variant,
            isSelected: node.variant === "selected",
            isHovered: node.variant === "hovered",
          })}
        </div>
      </foreignObject>
    );
  }

  const hasSublabel = !!node.sublabel;
  const w = node.resolvedW;
  const h = node.resolvedH;
  const labelY = hasSublabel ? node.y - h * 0.14 : node.y;
  const sublabelY = node.y + h * 0.22;
  const roleModifiers = DEFAULTS.role[node.effectiveRole ?? "supporting"];

  const baseLabelSize = DEFAULTS.font.label * roleModifiers.fontMultiplier;
  const baseSublabelSize = DEFAULTS.font.sublabel * roleModifiers.fontMultiplier;
  const labelCharW = baseLabelSize * 0.62;
  const labelTextW = node.label.length * labelCharW;
  const availW = w - 8;
  const labelScale = labelTextW > availW ? availW / labelTextW : 1;
  const labelFontSize = baseLabelSize * labelScale;
  const sublabelFontSize = baseSublabelSize * labelScale;

  return (
    <>
      <text
        x={node.x}
        y={labelY}
        textAnchor="middle"
        dominantBaseline="central"
        fill={
          node.variant === "active" || node.variant === "selected" || node.isProtagonist
            ? "var(--color-accent)"
            : "var(--color-text)"
        }
        fontSize={labelFontSize}
        fontWeight={node.isProtagonist ? 700 : 600}
        fontFamily="var(--font-mono)"
      >
        {node.label}
      </text>
      {hasSublabel && (
        <text
          x={node.x}
          y={sublabelY}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--color-muted)"
          fontSize={sublabelFontSize}
          fontFamily="var(--font-mono)"
        >
          {node.sublabel}
        </text>
      )}
    </>
  );
}

// ── Node hit area (interaction wrapper) ──────────────────
//
// The visible shape can be small; the hit area is at least
// minSize for touch accessibility (44px default).

export function FlowNodeHitArea({
  node,
  onSelect,
  onHover,
  index,
  diagramId,
  children,
  allNodes,
}: {
  node: ResolvedNode;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  index: number;
  diagramId: string;
  children: ReactNode;
  allNodes?: ResolvedNode[];
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [isFocusVisible, setIsFocusVisible] = useState(false);
  const isHighlighted = node.variant === "active" || node.variant === "selected";

  const inner = (
    <g
      onClick={(ev) => {
        ev.stopPropagation();
        if (node.interactive) onSelect(node.id);
      }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={(ev) => {
        try { if (ev.target.matches(":focus-visible")) setIsFocusVisible(true); } catch { setIsFocusVisible(true); }
        onHover(node.id);
      }}
      onBlur={() => {
        setIsFocusVisible(false);
        onHover(null);
      }}
      style={{ cursor: node.interactive ? "pointer" : "default", outline: "none" }}
      focusable={node.interactive ? "true" : "false"}
      opacity={node.opacity}
      role="button"
      tabIndex={node.interactive ? 0 : -1}
      aria-label={`${node.label}${node.sublabel ? `, ${node.sublabel}` : ""}${node.description ? `: ${node.description}` : ""}`}
      aria-roledescription="diagram node"
      aria-describedby={node.brief ? `fd-brief-${diagramId}-${node.id}` : undefined}
      onKeyDown={(ev) => {
        if (node.interactive && (ev.key === "Enter" || ev.key === " ")) {
          ev.preventDefault();
          onSelect(node.id);
        }
        if (allNodes && ARROW_KEYS.has(ev.key)) {
          const target = findSpatialNeighbor(node, allNodes, ev.key);
          if (target) {
            ev.preventDefault();
            const el = (ev.currentTarget as SVGElement)
              .closest("svg")
              ?.querySelector<SVGElement>(`[data-node-id="${target.id}"]`);
            el?.focus();
          }
        }
      }}
      data-node-id={node.id}
    >
      {/* Invisible hit area for touch targets */}
      <rect
        x={node.x - DEFAULTS.touchTarget / 2}
        y={node.y - DEFAULTS.touchTarget / 2}
        width={DEFAULTS.touchTarget}
        height={DEFAULTS.touchTarget}
        fill="transparent"
        stroke="none"
      />
      {children}
    </g>
  );

  if (reducedMotion) return <g key={node.id}>{inner}</g>;

  return (
    <motion.g
      key={node.id}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: node.opacity, y: 0 }}
      transition={{ ...SPRING.gentle, delay: index * STAGGER.fast }}
      filter={
        isHighlighted || isFocusVisible
          ? `url(#fd-glow-${diagramId})`
          : node.isProtagonist
            ? `url(#fd-glow-subtle-${diagramId})`
            : undefined
      }
    >
      {inner}
    </motion.g>
  );
}

// ── Arc indicator (numbered dot on arc nodes) ───────────

export function FlowArcIndicator({
  node,
}: {
  node: ResolvedNode;
}) {
  if (node.arcIndex === null) return null;
  const { r, fontSize, offsetX, offsetY } = DEFAULTS.arcIndicator;
  const cx = node.x + node.resolvedW / 2 + offsetX;
  const cy = node.y - node.resolvedH / 2 + offsetY;

  return (
    <g opacity={node.opacity} style={{ transition: "opacity 0.2s" }}>
      <circle cx={cx} cy={cy} r={r} fill="var(--color-accent)" opacity={0.85} />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--color-bg)"
        fontSize={fontSize}
        fontWeight={700}
        fontFamily="var(--font-mono)"
      >
        {node.arcIndex + 1}
      </text>
    </g>
  );
}

// ── Edge path ────────────────────────────────────────────

export function FlowEdgePath({
  edge,
}: {
  edge: ResolvedEdge;
  diagramId: string;
}) {
  if (!edge.path) return null;

  const isLit = edge.variant === "lit" || edge.variant === "active";
  const isProblem = edge.variant === "problem";

  const stroke = isProblem
    ? "#e06c75"
    : isLit
      ? "var(--color-accent)"
      : "var(--color-muted)";

  const dashArray = isProblem
    ? DEFAULTS.dash.problem
    : edge.dashed
      ? DEFAULTS.dash.dashed
      : DEFAULTS.dash.normal;

  const animate = edge.animate ?? "none";

  const endArrowD = arrowheadPath(edge.arrowTip, edge.arrowDir);
  const startArrowD = edge.startArrowTip && edge.startArrowDir
    ? arrowheadPath(edge.startArrowTip, edge.startArrowDir)
    : null;

  return (
    <g
      style={{ transition: "opacity 0.2s" }}
      opacity={edge.opacity}
    >
      <path
        d={edge.path}
        fill="none"
        stroke={stroke}
        strokeWidth={isLit ? DEFAULTS.stroke.edgeLit : DEFAULTS.stroke.edge}
        strokeDasharray={dashArray}
        style={{
          transition: "stroke 0.2s, stroke-width 0.2s, opacity 0.2s",
          ...(animate === "stream"
            ? { animation: "fd-stream 1.5s linear infinite" }
            : {}),
        }}
      />
      {endArrowD && (
        <path d={endArrowD} fill={stroke}
          style={{ transition: "fill 0.2s" }} />
      )}
      {startArrowD && (
        <path d={startArrowD} fill={stroke}
          style={{ transition: "fill 0.2s" }} />
      )}
      {/* Trace dot — animates along the path */}
      {animate === "trace" && (
        <circle
          r={2}
          fill="var(--color-accent)"
          style={{
            offsetPath: `path('${edge.path}')`,
            animation: "fd-trace 2s ease-in-out infinite",
          }}
        />
      )}
      {/* Edge label */}
      {edge.label && (() => {
        const charW = DEFAULTS.font.edge * 0.62;
        const padX = 3;
        const padY = 2;
        const tw = edge.label.length * charW + padX * 2;
        const th = DEFAULTS.font.edge + padY * 2;

        const nums = edge.path.match(/-?[\d.]+(?:e[+-]?\d+)?/gi);
        let pathLen = Infinity;
        if (nums && nums.length >= 4) {
          const pdx = parseFloat(nums[nums.length - 2]) - parseFloat(nums[0]);
          const pdy = parseFloat(nums[nums.length - 1]) - parseFloat(nums[1]);
          pathLen = Math.sqrt(pdx * pdx + pdy * pdy);
        }

        const markerRoom = DEFAULTS.marker.w * 2 + 4;
        const fitsInline = tw + markerRoom < pathLen;

        let offsetX = 0;
        let offsetY = 0;
        if (!fitsInline) {
          const { dx, dy } = edge.direction;
          const perpX = -dy;
          const perpY = dx;
          const offset = th / 2 + 4;
          offsetX = perpX * offset;
          offsetY = perpY * offset;
        }

        return (
          <>
            <rect
              x={edge.midpoint.x + offsetX - tw / 2}
              y={edge.midpoint.y + offsetY - th / 2}
              width={tw}
              height={th}
              rx={2}
              fill="var(--color-surface)"
            />
            <text
              x={edge.midpoint.x + offsetX}
              y={edge.midpoint.y + offsetY}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isProblem ? "#e06c75" : isLit ? "var(--color-accent)" : "var(--color-muted)"}
              fontSize={DEFAULTS.font.edge}
              fontFamily="var(--font-mono)"
            >
              {edge.label}
            </text>
          </>
        );
      })()}
    </g>
  );
}

// ── Group box ────────────────────────────────────────────

export function FlowGroupBox({ group }: { group: ResolvedGroup }) {
  if (!group.bounds) return null;
  const b = group.bounds;
  const isFilled = group.style === "filled";

  return (
    <g opacity={group.opacity} style={{ transition: "opacity 0.2s" }}>
      <rect
        x={b.x}
        y={b.y}
        width={b.w}
        height={b.h}
        rx={DEFAULTS.group.r}
        fill={isFilled ? "color-mix(in srgb, var(--color-surface-2) 50%, transparent)" : "none"}
        stroke={group.color ?? "var(--color-border)"}
        strokeWidth={0.75}
        strokeDasharray={group.style === "dashed" ? "6 3" : undefined}
        opacity={0.6}
      />
      <text
        x={b.x + 8}
        y={b.y + DEFAULTS.group.labelSize + 3}
        fill={group.color ?? "var(--color-muted)"}
        fontSize={DEFAULTS.group.labelSize}
        fontFamily="var(--font-mono)"
        fontWeight={600}
      >
        {group.label}
      </text>
    </g>
  );
}

// ── Annotation ───────────────────────────────────────────

export function FlowAnnotationText({ annotation }: { annotation: FlowAnnotation }) {
  return (
    <text
      x={annotation.x}
      y={annotation.y}
      textAnchor="middle"
      fill="var(--color-muted)"
      fontSize={DEFAULTS.font.annotation}
      fontFamily="var(--font-mono)"
    >
      {annotation.text.split("\n").map((line, li) => (
        <tspan key={li} x={annotation.x} dy={li === 0 ? 0 : 10}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

// ── Token (animated position indicator) ──────────────────

export function FlowToken({
  x,
  y,
  variant = "dot",
}: {
  x: number;
  y: number;
  variant?: "dot" | "ring" | "glow";
}) {
  const reducedMotion = usePrefersReducedMotion();

  if (reducedMotion) {
    return <circle cx={x} cy={y} r={3} fill="var(--color-accent)" />;
  }

  return (
    <>
      {(variant === "ring" || variant === "glow") && (
        <motion.circle
          r={variant === "glow" ? 8 : 6}
          fill="var(--color-accent)"
          opacity={variant === "glow" ? 0.1 : 0.15}
          animate={{ cx: x, cy: y }}
          transition={SPRING.snappy}
        />
      )}
      <motion.circle
        r={3}
        fill="var(--color-accent)"
        animate={{ cx: x, cy: y }}
        transition={SPRING.snappy}
      />
    </>
  );
}

// ── Detail panel ─────────────────────────────────────────

export function FlowDetailPanel({
  selectedNode,
  children,
  hint,
  height,
  edges,
  nodeMap,
}: {
  selectedNode: ResolvedNode | null;
  children?: (node: ResolvedNode) => ReactNode;
  hint?: string;
  height?: number | "auto";
  edges?: ResolvedEdge[];
  nodeMap?: Record<string, FlowNode>;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const minH = height === "auto" ? undefined : (height ?? 72);

  return (
    <div
      style={{
        minHeight: minH,
        paddingTop: 12,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <AnimatePresence mode="wait">
        {selectedNode ? (
          <DetailContent
            key={selectedNode.id}
            node={selectedNode}
            customRender={children}
            edges={edges}
            nodeMap={nodeMap}
            reducedMotion={reducedMotion}
          />
        ) : (
          <DetailHint
            key="empty"
            hint={hint ?? "Click any node to see details"}
            reducedMotion={reducedMotion}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailContent({
  node,
  customRender,
  edges,
  nodeMap,
  reducedMotion,
}: {
  node: ResolvedNode;
  customRender?: (node: ResolvedNode) => ReactNode;
  edges?: ResolvedEdge[];
  nodeMap?: Record<string, FlowNode>;
  reducedMotion: boolean;
}) {
  const connections = edges && nodeMap
    ? edges
        .filter((e) => (e.from === node.id || e.to === node.id) && e.description)
        .map((e) => {
          const isOutgoing = e.from === node.id;
          const otherId = isOutgoing ? e.to : e.from;
          const other = nodeMap[otherId];
          return { edge: e, other, isOutgoing };
        })
        .filter((c) => c.other)
    : [];

  const inner = customRender ? (
    <div>{customRender(node)}</div>
  ) : (
    <div style={{ fontFamily: "var(--font-mono)" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)", marginBottom: 4 }}>
        {node.label}
        {node.brief && (
          <span style={{ color: "var(--color-muted)", fontWeight: 400, fontSize: 10, marginLeft: 8 }}>
            — {node.brief}
          </span>
        )}
        {!node.brief && node.sublabel && (
          <span style={{ color: "var(--color-muted)", fontWeight: 400, fontSize: 10, marginLeft: 8 }}>
            {node.sublabel}
          </span>
        )}
      </div>
      {node.description && (
        <div style={{ fontSize: 11, lineHeight: 1.6, color: "var(--color-muted)", marginBottom: 6 }}>
          {node.description}
        </div>
      )}
      {connections.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-muted)", marginBottom: 4 }}>
            Connections
          </div>
          {connections.map((c) => (
            <div
              key={`${c.edge.from}-${c.edge.to}`}
              style={{ fontSize: 10, lineHeight: 1.7, color: "var(--color-muted)" }}
            >
              <span style={{ color: "var(--color-accent)" }}>
                {c.isOutgoing ? "→" : "←"}
              </span>{" "}
              <span style={{ color: "var(--color-text)", fontWeight: 500 }}>
                {c.edge.verb ?? (c.isOutgoing ? "connects to" : "receives from")}
              </span>{" "}
              {c.other.label}
              {c.edge.description && (
                <span> — {c.edge.description}</span>
              )}
            </div>
          ))}
        </div>
      )}
      {node.detail && (
        <div
          style={{
            fontSize: 10,
            lineHeight: 1.6,
            color: "var(--color-muted)",
            marginTop: 6,
          }}
        >
          {node.detail}
        </div>
      )}
    </div>
  );

  if (reducedMotion) return inner;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={TRANSITION.enterItem}
    >
      {inner}
    </motion.div>
  );
}

function DetailHint({ hint, reducedMotion }: { hint: string; reducedMotion: boolean }) {
  const inner = (
    <div
      style={{
        padding: "10px 0",
        color: "var(--color-muted)",
        fontSize: 11,
        fontFamily: "var(--font-mono)",
        fontStyle: "italic",
      }}
    >
      {hint}
    </div>
  );

  if (reducedMotion) return inner;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={TRANSITION.crossfade}
    >
      {inner}
    </motion.div>
  );
}

// ── Timeline controls ────────────────────────────────────

export function FlowTimelineControls({
  timeline,
}: {
  timeline: UseFlowTimelineReturn;
}) {
  const stepLabel = `Step ${timeline.currentStepIdx + 1} of ${timeline.stepCount}`;

  return (
    <div
      role="toolbar"
      aria-label="Timeline controls"
      style={{
        paddingTop: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button
          type="button"
          onClick={timeline.stepBack}
          disabled={timeline.currentStepIdx === 0}
          aria-label="Previous step"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            padding: "4px 8px",
            border: "none",
            background: "none",
            color: timeline.currentStepIdx === 0 ? "var(--color-muted)" : "var(--color-text)",
            cursor: timeline.currentStepIdx === 0 ? "default" : "pointer",
          }}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={timeline.togglePlay}
          disabled={timeline.isComplete}
          aria-label={timeline.isPlaying ? "Pause" : "Play"}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            padding: "4px 8px",
            border: "none",
            background: "none",
            color: timeline.isPlaying ? "var(--color-accent)" : timeline.isComplete ? "var(--color-muted)" : "var(--color-text)",
            cursor: timeline.isComplete ? "default" : "pointer",
          }}
        >
          {timeline.isPlaying ? "‖ Pause" : "▸ Play"}
        </button>
        <button
          type="button"
          onClick={timeline.reset}
          aria-label="Reset timeline"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            padding: "4px 8px",
            border: "none",
            background: "none",
            color: "var(--color-muted)",
            cursor: "pointer",
          }}
        >
          ⟲
        </button>
      </div>

      <span
        aria-live="polite"
        aria-atomic
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--color-muted)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {stepLabel}
      </span>

      <button
        type="button"
        onClick={timeline.step}
        disabled={timeline.isComplete || timeline.isPlaying}
        aria-label="Next step"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 600,
          padding: "4px 12px",
          borderRadius: "var(--radius-1, 4px)",
          border: "none",
          background:
            timeline.isComplete || timeline.isPlaying
              ? "transparent"
              : "var(--color-accent)",
          color:
            timeline.isComplete || timeline.isPlaying
              ? "var(--color-muted)"
              : "var(--color-bg)",
          cursor: timeline.isComplete || timeline.isPlaying ? "default" : "pointer",
        }}
      >
        {timeline.isComplete ? "Done" : "Step →"}
      </button>
    </div>
  );
}

// ── CSS keyframes (injected once) ────────────────────────

const animStylesId = "fd-animation-styles";

export function FlowAnimationStyles() {
  if (typeof document !== "undefined" && document.getElementById(animStylesId)) {
    return null;
  }
  return (
    <style id={animStylesId}>{`
      @keyframes fd-stream {
        to { stroke-dashoffset: -20; }
      }
      @keyframes fd-trace {
        0% { offset-distance: 0%; opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { offset-distance: 100%; opacity: 0; }
      }
    `}</style>
  );
}
