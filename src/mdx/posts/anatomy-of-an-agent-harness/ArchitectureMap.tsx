"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { SPRING, TRANSITION, STAGGER } from "@/lib/motion";
import { PRIMITIVES } from "./flue-data";
import type { Primitive } from "./flue-data";

const SVG_W = 560;
const SVG_H = 210;
const NODE_W = 82;
const NODE_H = 28;
const DETAIL_H = 140;

type Pos = { x: number; y: number };

const NODES: Record<string, Pos> = {
  skill:   { x: 120, y: 36 },
  session: { x: SVG_W / 2, y: 82 },
  role:    { x: SVG_W - 120, y: 36 },
  task:    { x: 150, y: 160 },
  sandbox: { x: SVG_W - 150, y: 160 },
};

type Edge = { from: string; to: string; label: string };

const EDGES: Edge[] = [
  { from: "session", to: "skill", label: ".skill()" },
  { from: "session", to: "role", label: "role overlay" },
  { from: "session", to: "task", label: ".task()" },
  { from: "session", to: "sandbox", label: "tool calls" },
  { from: "task", to: "sandbox", label: "exec()" },
];

function getEdgeLine(from: Pos, to: Pos) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / d;
  const ny = dy / d;

  return {
    x1: from.x + nx * (NODE_W / 2 + 2),
    y1: from.y + ny * (NODE_H / 2 + 2),
    x2: to.x - nx * (NODE_W / 2 + 2),
    y2: to.y - ny * (NODE_H / 2 + 2),
  };
}

function labelPos(from: Pos, to: Pos): Pos {
  const { x1, y1, x2, y2 } = getEdgeLine(from, to);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: mx + (-dy / d) * 10, y: my + (dx / d) * 10 };
}

export function ArchitectureMap() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const toggle = useCallback((id: string) => {
    setSelectedId((p) => (p === id ? null : id));
  }, []);

  const selected = selectedId
    ? PRIMITIVES.find((p) => p.id === selectedId) ?? null
    : null;

  return (
    <div
      className="my-6 overflow-hidden rounded-lg"
      style={{
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        boxShadow: "var(--shadow-1)",
      }}
    >
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        style={{ display: "block" }}
        onClick={() => setSelectedId(null)}
      >
        <defs>
          <filter id="node-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
            <feFlood floodColor="var(--color-accent)" floodOpacity="0.5" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="dot-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {EDGES.map((e) => {
          const from = NODES[e.from];
          const to = NODES[e.to];
          if (!from || !to) return null;

          const lit = selectedId === e.from || selectedId === e.to;
          const dim = selectedId !== null && !lit;
          const { x1, y1, x2, y2 } = getEdgeLine(from, to);
          const lp = labelPos(from, to);

          return (
            <g key={`${e.from}-${e.to}`} style={{ transition: "opacity 0.2s" }} opacity={dim ? 0.15 : 1}>
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={lit ? "var(--color-accent)" : "var(--color-muted)"}
                strokeWidth={lit ? 2.5 : 1.5}
                strokeDasharray={lit ? "none" : "5 4"}
                opacity={lit ? 1 : 0.6}
                style={{ transition: "stroke 0.2s, stroke-width 0.2s, opacity 0.2s" }}
              />
              <circle cx={x2} cy={y2} r={lit ? 4 : 3}
                fill={lit ? "var(--color-accent)" : "var(--color-muted)"}
                opacity={lit ? 1 : 0.6}
                filter={lit ? "url(#dot-glow)" : undefined}
                style={{ transition: "r 0.2s, fill 0.2s, opacity 0.2s" }}
              />
              <text
                x={lp.x} y={lp.y}
                textAnchor="middle" dominantBaseline="central"
                fill={lit ? "var(--color-accent)" : "var(--color-muted)"}
                fontSize={10} fontFamily="var(--font-mono)"
                opacity={lit ? 1 : 0.6}
              >
                {e.label}
              </text>
            </g>
          );
        })}

        {PRIMITIVES.map((p, i) => {
          const pos = NODES[p.id];
          if (!pos) return null;
          const isSel = selectedId === p.id;
          const isHov = hoveredId === p.id;
          const isHub = p.id === "session";
          const dim = selectedId !== null && !isSel;
          const rx = pos.x - NODE_W / 2;
          const ry = pos.y - NODE_H / 2;

          const node = (
            <g
              onClick={(ev) => { ev.stopPropagation(); toggle(p.id); }}
              onMouseEnter={() => setHoveredId(p.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ cursor: "pointer", transition: "opacity 0.2s" }}
              opacity={dim ? 0.35 : 1}
              role="button"
              tabIndex={0}
              aria-label={`${p.name}: ${p.tagline}`}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  toggle(p.id);
                }
              }}
            >
              <rect
                x={rx} y={ry} width={NODE_W} height={NODE_H} rx={6}
                fill={isHov && !isSel ? "var(--color-surface-2)" : "var(--color-bg)"}
                stroke={isSel ? "var(--color-accent)" : isHov ? "var(--color-accent)" : "var(--color-border)"}
                strokeWidth={isSel ? 2 : 1.5}
                filter={isSel ? "url(#node-glow)" : undefined}
                style={{
                  transition: "fill 0.2s, stroke 0.2s, stroke-width 0.15s, transform 0.2s",
                  transformOrigin: `${pos.x}px ${pos.y}px`,
                  transform: isSel ? "scale(1.04)" : isHov ? "scale(1.04)" : "scale(1)",
                }}
              />
              {isHub && (
                <line
                  x1={rx + 4} y1={ry} x2={rx + NODE_W - 4} y2={ry}
                  stroke="var(--color-accent)" strokeWidth={2}
                />
              )}
              <circle cx={rx + 13} cy={pos.y} r={8}
                fill="var(--color-accent)"
              />
              <text
                x={rx + 13} y={pos.y}
                textAnchor="middle" dominantBaseline="central"
                fill="var(--color-bg)"
                fontSize={9} fontWeight={700} fontFamily="var(--font-mono)"
              >
                {p.icon}
              </text>
              <text
                x={rx + 26} y={pos.y}
                dominantBaseline="central"
                fill="var(--color-text)"
                fontSize={11} fontWeight={600} fontFamily="var(--font-mono)"
              >
                {p.name}
              </text>
            </g>
          );

          if (reducedMotion) return <g key={p.id}>{node}</g>;

          return (
            <motion.g
              key={p.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: dim ? 0.35 : 1, y: 0 }}
              transition={{ ...SPRING.gentle, delay: i * STAGGER.fast }}
            >
              {node}
            </motion.g>
          );
        })}

        <text
          x={SVG_W / 2} y={106}
          textAnchor="middle"
          fill="var(--color-muted)" fontSize={8} fontFamily="var(--font-mono)"
          opacity={0.6}
        >
          hub — all operations flow through here
        </text>

        <text x={150} y={182} textAnchor="middle"
          fill="var(--color-muted)" fontSize={8} fontFamily="var(--font-mono)" opacity={0.5}
        >max depth: 4</text>
        <text x={SVG_W - 150} y={182} textAnchor="middle"
          fill="var(--color-muted)" fontSize={8} fontFamily="var(--font-mono)" opacity={0.5}
        >virtual | local | container</text>
      </svg>

      <div
        style={{
          height: DETAIL_H,
          borderTop: "1px solid var(--color-border)",
          background: "var(--color-surface-2)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <AnimatePresence mode="wait">
          {selected ? (
            <DetailContent key={selected.id} primitive={selected} reducedMotion={reducedMotion} />
          ) : (
            <EmptyHint key="empty" reducedMotion={reducedMotion} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DetailContent({
  primitive,
  reducedMotion,
}: {
  primitive: Primitive;
  reducedMotion: boolean;
}) {
  const inner = (
    <div style={{ padding: "12px 16px", fontFamily: "var(--font-mono)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span
          style={{
            width: 22, height: 22, borderRadius: "50%",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: "var(--color-accent)", color: "var(--color-bg)",
            fontSize: 11, fontWeight: 700,
          }}
        >
          {primitive.icon}
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
          {primitive.name}
        </span>
        <span style={{ fontSize: 11, color: "var(--color-muted)" }}>
          — {primitive.tagline}
        </span>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
        {primitive.properties.map((prop) => (
          <li key={prop} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, lineHeight: 1.5, color: "var(--color-text)" }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--color-accent)", flexShrink: 0, marginTop: 6 }} />
            {prop}
          </li>
        ))}
      </ul>
    </div>
  );

  if (reducedMotion) return inner;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={TRANSITION.enterItem}
    >
      {inner}
    </motion.div>
  );
}

function EmptyHint({ reducedMotion }: { reducedMotion: boolean }) {
  const inner = (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--color-accent)",
        fontSize: 12,
        fontFamily: "var(--font-mono)",
        opacity: 0.7,
      }}
    >
      Click a node to see its properties
    </div>
  );

  if (reducedMotion) return inner;

  return (
    <motion.div
      style={{ height: "100%" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={TRANSITION.crossfade}
    >
      {inner}
    </motion.div>
  );
}

export default ArchitectureMap;
