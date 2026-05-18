"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { SPRING, DELAY } from "@/lib/motion";
import { DialToggle } from "@/components/ui/dialkit/DialToggle";
import { DialSegment } from "@/components/ui/dialkit/DialSegment";
import { DemoSandbox } from "@/components/principles/demo-primitives";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

// ── Layer data ──────────────────────────────────────────────────────

type Layer = {
  name: string;
  file: string;
  deps: number;
  color: string;
  /** Width as a percentage of the container — widest at top, narrowest at bottom */
  widthPct: number;
};

const LAYERS: Layer[] = [
  { name: "Composed",   file: "FlowDiagram.tsx",       deps: 1, color: "var(--color-accent)",           widthPct: 100 },
  { name: "Primitives", file: "primitives.tsx",         deps: 1, color: "var(--diagram-layer-1)",        widthPct: 92 },
  { name: "Hooks",      file: "use-flow-diagram.ts",    deps: 1, color: "var(--diagram-layer-2)",        widthPct: 84 },
  { name: "Geometry",   file: "geometry.ts",            deps: 1, color: "var(--diagram-layer-3)",        widthPct: 76 },
  { name: "Types",      file: "types.ts",               deps: 0, color: "var(--diagram-layer-0)",        widthPct: 68 },
];

const BAR_HEIGHT = 44;
const COLLAPSED_GAP = 2;
const EXPLODED_GAP = 40;
const STAGGER_MS = 0.03; // 30ms stagger

const GEOMETRY_OPTIONS = ["Straight", "Orthogonal"] as const;
type GeometryMode = (typeof GEOMETRY_OPTIONS)[number];

// ── Mini diagram SVG paths ──────────────────────────────────────────

function MiniDiagram({ geometry }: { geometry: GeometryMode }) {
  const reducedMotion = usePrefersReducedMotion();

  // 3 nodes at fixed positions inside a small viewbox
  const nodes = [
    { x: 4, y: 10 },
    { x: 28, y: 4 },
    { x: 52, y: 14 },
  ];

  const straightEdges = [
    `M ${nodes[0].x + 8} ${nodes[0].y + 3} L ${nodes[1].x} ${nodes[1].y + 3}`,
    `M ${nodes[1].x + 8} ${nodes[1].y + 3} L ${nodes[2].x} ${nodes[2].y + 3}`,
  ];

  const orthogonalEdges = [
    `M ${nodes[0].x + 8} ${nodes[0].y + 3} L ${nodes[0].x + 18} ${nodes[0].y + 3} L ${nodes[0].x + 18} ${nodes[1].y + 3} L ${nodes[1].x} ${nodes[1].y + 3}`,
    `M ${nodes[1].x + 8} ${nodes[1].y + 3} L ${nodes[1].x + 18} ${nodes[1].y + 3} L ${nodes[1].x + 18} ${nodes[2].y + 3} L ${nodes[2].x} ${nodes[2].y + 3}`,
  ];

  const edges = geometry === "Straight" ? straightEdges : orthogonalEdges;

  return (
    <svg
      width={64}
      height={22}
      viewBox="0 0 64 22"
      fill="none"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      {/* Edges */}
      {edges.map((d, i) => (
        <motion.path
          key={i}
          d={d}
          stroke="var(--color-accent)"
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{ d }}
          transition={reducedMotion ? { duration: 0 } : SPRING.snappy}
        />
      ))}
      {/* Nodes */}
      {nodes.map((n, i) => (
        <rect
          key={i}
          x={n.x}
          y={n.y}
          width={8}
          height={6}
          rx={1.5}
          fill="var(--color-muted)"
        />
      ))}
    </svg>
  );
}

// ── Dependency arrow (dashed line between layers) ───────────────────

function DependencyArrow({
  fromY,
  toY,
  containerWidth,
  visible,
}: {
  fromY: number;
  toY: number;
  containerWidth: number;
  visible: boolean;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const midX = containerWidth / 2;
  const arrowTipSize = 4;
  const startY = fromY;
  const endY = toY;

  return (
    <motion.g
      animate={{ opacity: visible ? 1 : 0 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { duration: 0.25, delay: visible ? DELAY.short : 0 }
      }
    >
      <line
        x1={midX}
        y1={startY}
        x2={midX}
        y2={endY - arrowTipSize}
        stroke="var(--color-muted)"
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      <polygon
        points={`${midX},${endY} ${midX - arrowTipSize},${endY - arrowTipSize} ${midX + arrowTipSize},${endY - arrowTipSize}`}
        fill="var(--color-muted)"
      />
    </motion.g>
  );
}

// ── Layer bar ───────────────────────────────────────────────────────

function LayerBar({
  layer,
  index,
  exploded,
  isFlashing,
  showPreview,
  geometry,
}: {
  layer: Layer;
  index: number;
  exploded: boolean;
  isFlashing: boolean;
  showPreview: boolean;
  geometry: GeometryMode;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const y = exploded
    ? index * (BAR_HEIGHT + EXPLODED_GAP)
    : index * (BAR_HEIGHT + COLLAPSED_GAP);

  const depLabel = layer.deps === 0 ? "0 deps" : `${layer.deps} dep`;

  return (
    <motion.div
      animate={{ y }}
      transition={reducedMotion ? { duration: 0 } : { ...SPRING.snappy, delay: index * STAGGER_MS }}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <motion.div
        animate={{
          borderColor: isFlashing ? "var(--color-accent)" : "var(--color-border)",
        }}
        transition={reducedMotion ? { duration: 0 } : SPRING.snappy}
        style={{
          width: `${layer.widthPct}%`,
          height: BAR_HEIGHT,
          background: "var(--color-surface-2)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-2)",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 8,
          fontFamily: "var(--font-mono)",
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* Colored dot */}
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: layer.color,
            flexShrink: 0,
          }}
        />

        {/* Layer name */}
        <span
          style={{
            fontWeight: 600,
            fontSize: "var(--text-xs)",
            color: "var(--color-text)",
            whiteSpace: "nowrap",
          }}
        >
          {layer.name}
        </span>

        {/* Mini diagram preview (only on Composed bar) */}
        {showPreview && (
          <span style={{ marginLeft: 4, display: "flex", alignItems: "center" }}>
            <MiniDiagram geometry={geometry} />
          </span>
        )}

        {/* Spacer */}
        <span style={{ flex: 1 }} />

        {/* Dependency badge */}
        <span
          style={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            color: exploded ? "var(--color-text)" : "var(--color-muted)",
            background: exploded ? "var(--color-surface)" : "transparent",
            border: exploded ? "1px solid var(--color-border)" : "1px solid transparent",
            borderRadius: "var(--radius-1)",
            padding: "1px 6px",
            transition: "all 0.2s ease",
            whiteSpace: "nowrap",
          }}
        >
          {depLabel}
        </span>

        {/* Filename */}
        <span
          style={{
            fontSize: 10,
            color: "var(--color-muted)",
            fontFamily: "var(--font-mono)",
            whiteSpace: "nowrap",
          }}
        >
          {layer.file}
        </span>
      </motion.div>
    </motion.div>
  );
}

// ── Main component ──────────────────────────────────────────────────

export function LayerStack() {
  const [exploded, setExploded] = useState(false);
  const [geometry, setGeometry] = useState<GeometryMode>("Straight");
  const [flashIndex, setFlashIndex] = useState<number | null>(null);
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const handleGeometryChange = useCallback(
    (value: GeometryMode) => {
      setGeometry(value);

      // Flash the Geometry layer (index 3)
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      setFlashIndex(3);
      flashTimeout.current = setTimeout(() => {
        setFlashIndex(null);
      }, 600);
    },
    [],
  );

  // Layout calculations
  const collapsedHeight =
    LAYERS.length * BAR_HEIGHT + (LAYERS.length - 1) * COLLAPSED_GAP;
  const explodedHeight =
    LAYERS.length * BAR_HEIGHT + (LAYERS.length - 1) * EXPLODED_GAP;
  const containerHeight = exploded ? explodedHeight : collapsedHeight;

  // Arrow positions (between bars in exploded view)
  // Each arrow goes from the bottom of one bar to the top of the next
  const arrows = LAYERS.slice(0, -1).map((_, i) => ({
    fromY: i * (BAR_HEIGHT + EXPLODED_GAP) + BAR_HEIGHT,
    toY: (i + 1) * (BAR_HEIGHT + EXPLODED_GAP),
  }));

  return (
    <DemoSandbox title="Primitive Composition">
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        {/* Animated height container */}
        <motion.div
          animate={{ height: containerHeight }}
          transition={reducedMotion ? { duration: 0 } : SPRING.snappy}
          style={{ position: "relative", width: "100%" }}
        >
          {/* Dependency arrows SVG overlay */}
          <svg
            viewBox={`0 0 480 ${explodedHeight}`}
            preserveAspectRatio="xMidYMid meet"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
            aria-hidden="true"
          >
            {arrows.map((arrow, i) => (
              <DependencyArrow
                key={i}
                fromY={arrow.fromY}
                toY={arrow.toY}
                containerWidth={480}
                visible={exploded}
              />
            ))}
          </svg>

          {/* Layer bars */}
          {LAYERS.map((layer, i) => (
            <LayerBar
              key={layer.name}
              layer={layer}
              index={i}
              exploded={exploded}
              isFlashing={flashIndex === i}
              showPreview={i === 0}
              geometry={geometry}
            />
          ))}
        </motion.div>
      </div>

      <DemoSandbox.Controls>
        <DialToggle
          label="Explode"
          value={exploded}
          onChange={setExploded}
        />
        <DialSegment
          label="Geometry"
          options={GEOMETRY_OPTIONS}
          value={geometry}
          onChange={handleGeometryChange}
        />
      </DemoSandbox.Controls>

      <DemoSandbox.Caption>
        Toggle Explode to separate the layers. Swap Geometry to see one layer change without affecting the rest.
      </DemoSandbox.Caption>
    </DemoSandbox>
  );
}

export default LayerStack;
