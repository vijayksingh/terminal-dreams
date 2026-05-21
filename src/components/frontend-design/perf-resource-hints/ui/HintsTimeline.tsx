"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { Bar, PriorityTier, ResourceKind } from "../engine/hints-simulator";
import styles from "../ResourceHintsLab.module.css";

const LABEL_W = 96;
const BAR_W = 280;
const ROW_H = 26;
const TOP_PAD = 28;
const BOTTOM_PAD = 18;

type Props = {
  bars: Bar[];
  loadEndMs: number;
  nextPageEndMs: number;
  focusId: string | null;
  highlightInversion: boolean;
};

const KIND_TO_LAYER: Record<ResourceKind, string> = {
  document: "var(--diagram-layer-0)",
  css: "var(--diagram-layer-3)",
  js: "var(--diagram-layer-4)",
  module: "var(--diagram-layer-9)",
  font: "var(--diagram-layer-2)",
  image: "var(--diagram-layer-5)",
  "third-party": "var(--diagram-layer-7)",
};

const PHASE_TO_LAYER = {
  dns: "var(--diagram-layer-1)",
  tcp: "var(--diagram-layer-6)",
  tls: "var(--diagram-layer-8)",
} as const;

export function HintsTimeline({
  bars,
  loadEndMs,
  nextPageEndMs,
  focusId,
  highlightInversion,
}: Props) {
  const rm = usePrefersReducedMotion();

  const maxMs = useMemo(() => {
    const ceiling = Math.max(loadEndMs + 80, nextPageEndMs, 2000);
    return Math.round(ceiling / 100) * 100;
  }, [loadEndMs, nextPageEndMs]);

  const msToX = (ms: number) => LABEL_W + (ms / maxMs) * BAR_W;
  const totalH = TOP_PAD + bars.length * ROW_H + BOTTOM_PAD;
  const totalW = LABEL_W + BAR_W + 56;

  const ticks: number[] = [];
  const tickInterval = maxMs <= 1500 ? 250 : 500;
  for (let t = 0; t <= maxMs; t += tickInterval) ticks.push(t);

  return (
    <div className={styles.timelineWrap}>
      <div className={styles.timelineHeader}>
        <span className={styles.timelineTitle}>Resource Timeline</span>
        <span
          className={styles.timelineEnd}
          data-status={highlightInversion ? "warn" : undefined}
        >
          Page load · <strong>{loadEndMs}ms</strong>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${totalW} ${totalH}`}
        width="100%"
        height={totalH}
        className={styles.timelineSvg}
        role="img"
        aria-label={`Resource load timeline, ${bars.length} bars across ${maxMs}ms`}
      >
        {/* Axis ticks */}
        {ticks.map((t) => (
          <g key={`tick-${t}`}>
            <line
              x1={msToX(t)}
              y1={TOP_PAD - 6}
              x2={msToX(t)}
              y2={totalH - BOTTOM_PAD}
              stroke="var(--color-border)"
              strokeWidth={0.6}
              strokeDasharray="2,3"
            />
            <text
              x={msToX(t)}
              y={TOP_PAD - 10}
              textAnchor="middle"
              className={styles.timelineTickLabel}
            >
              {t >= 1000 ? `${(t / 1000).toFixed(1)}s` : `${t}ms`}
            </text>
          </g>
        ))}

        {/* Page-load marker */}
        <line
          x1={msToX(loadEndMs)}
          y1={TOP_PAD - 4}
          x2={msToX(loadEndMs)}
          y2={totalH - BOTTOM_PAD}
          stroke="var(--color-success)"
          strokeWidth={1.2}
          opacity={0.6}
        />

        {bars.map((bar, idx) => {
          const y = TOP_PAD + idx * ROW_H;
          const isFocus = focusId === bar.resourceId;
          const isNextNav = bar.forNextNav;

          return (
            <g key={bar.resourceId}>
              {/* Row background */}
              <rect
                x={LABEL_W - 6}
                y={y}
                width={BAR_W + 16}
                height={ROW_H - 4}
                rx={3}
                fill={
                  isFocus
                    ? "color-mix(in srgb, var(--diagram-layer-9) 8%, transparent)"
                    : "transparent"
                }
              />

              {/* Resource label */}
              <text
                x={LABEL_W - 12}
                y={y + ROW_H / 2 + 1}
                textAnchor="end"
                className={styles.timelineLabel}
                data-focus={isFocus ? "true" : undefined}
                fill={
                  bar.hinted
                    ? "var(--diagram-layer-9)"
                    : "var(--color-muted)"
                }
              >
                {bar.label}
              </text>

              {/* Ghost: baseline span */}
              {bar.hinted && !isNextNav && (
                <motion.rect
                  x={msToX(bar.baselineStartMs)}
                  y={y + 4}
                  rx={2}
                  ry={2}
                  height={ROW_H - 10}
                  width={Math.max(
                    msToX(bar.baselineEndMs) - msToX(bar.baselineStartMs),
                    2,
                  )}
                  fill="none"
                  stroke="var(--color-muted)"
                  strokeDasharray="3,2"
                  strokeWidth={0.8}
                  opacity={0.45}
                  initial={rm ? false : { opacity: 0 }}
                  animate={{ opacity: 0.45 }}
                  transition={TRANSITION.crossfade}
                />
              )}

              {/* Connection phases */}
              {bar.connectionPhases.map((phase) => {
                const px = msToX(phase.startMs);
                const pw = Math.max(
                  msToX(phase.startMs + phase.durationMs) - px,
                  2,
                );
                return (
                  <motion.rect
                    key={`${bar.resourceId}-${phase.kind}`}
                    x={px}
                    y={y + 6}
                    rx={1.5}
                    ry={1.5}
                    height={ROW_H - 14}
                    fill={PHASE_TO_LAYER[phase.kind]}
                    opacity={0.85}
                    initial={rm ? false : { width: 0, opacity: 0 }}
                    animate={{ width: pw, opacity: 0.85 }}
                    transition={rm ? { duration: 0 } : SPRING.snappy}
                  />
                );
              })}

              {/* Download / body */}
              <motion.rect
                x={msToX(bar.downloadStartMs)}
                y={y + 4}
                rx={2}
                ry={2}
                height={ROW_H - 10}
                fill={KIND_TO_LAYER[bar.kind]}
                opacity={isNextNav ? 0.55 : 1}
                initial={rm ? false : { width: 0 }}
                animate={{
                  width: Math.max(
                    msToX(bar.downloadStartMs + bar.downloadDurationMs) -
                      msToX(bar.downloadStartMs),
                    3,
                  ),
                }}
                transition={rm ? { duration: 0 } : SPRING.snappy}
              />

              {/* Parse overlay for modulepreload */}
              {bar.hasParseOverlay && (
                <motion.rect
                  x={msToX(bar.downloadStartMs)}
                  y={y + ROW_H - 9}
                  rx={1.5}
                  ry={1.5}
                  height={3}
                  width={Math.max(
                    msToX(bar.downloadStartMs + bar.downloadDurationMs) -
                      msToX(bar.downloadStartMs),
                    3,
                  )}
                  fill="var(--diagram-layer-5)"
                  initial={rm ? false : { opacity: 0 }}
                  animate={{ opacity: 0.95 }}
                  transition={TRANSITION.enterItem}
                />
              )}

              {/* Priority badge */}
              {bar.hinted && !isNextNav && (
                <PriorityBadge
                  priority={bar.priority}
                  x={msToX(bar.downloadStartMs + bar.downloadDurationMs) + 6}
                  y={y + ROW_H / 2 + 1}
                />
              )}

              {/* Next-nav badge */}
              {isNextNav && bar.hinted && (
                <text
                  x={msToX(bar.downloadStartMs + bar.downloadDurationMs) + 6}
                  y={y + ROW_H / 2 + 1}
                  className={styles.timelineBadge}
                  data-tone="idle"
                >
                  {bar.hintsApplied.includes("speculation-prerender")
                    ? "prerendered"
                    : "idle"}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <Legend />
    </div>
  );
}

function PriorityBadge({
  priority,
  x,
  y,
}: {
  priority: PriorityTier;
  x: number;
  y: number;
}) {
  if (priority === "medium") return null;
  const label =
    priority === "high"
      ? "high"
      : priority === "low"
        ? "low"
        : "idle";
  return (
    <text x={x} y={y} className={styles.timelineBadge} data-tone={priority}>
      {label}
    </text>
  );
}

function Legend() {
  return (
    <div className={styles.timelineLegend}>
      <LegendDot color="var(--diagram-layer-1)" label="DNS" />
      <LegendDot color="var(--diagram-layer-6)" label="TCP" />
      <LegendDot color="var(--diagram-layer-8)" label="TLS" />
      <LegendDot color="var(--diagram-layer-4)" label="download" />
      <LegendDot color="var(--diagram-layer-5)" label="parse / compile" />
      <span className={styles.legendDivider} />
      <span className={styles.legendNote}>dashed = baseline (no hint)</span>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className={styles.legendItem}>
      <span
        className={styles.legendSwatch}
        style={{ background: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
