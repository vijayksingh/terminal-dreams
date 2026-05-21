"use client";

import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION, SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { RESOURCE_COLORS, type WaterfallResource } from "../engine/perf-simulator";
import styles from "../WebPerformanceLab.module.css";

const LABEL_WIDTH = 96;
const BAR_AREA_WIDTH = 260;
const ROW_HEIGHT = 28;
const TOP_PAD = 24;
const BOTTOM_PAD = 12;

type TooltipState = {
  resource: WaterfallResource;
  x: number;
  y: number;
} | null;

type WaterfallChartProps = {
  resources: WaterfallResource[];
  timelineEndMs: number;
};

export function WaterfallChart({ resources, timelineEndMs }: WaterfallChartProps) {
  const rm = usePrefersReducedMotion();
  const [changedIds, setChangedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const prevResourcesRef = useRef<Map<string, number>>(new Map());
  const wrapperRef = useRef<HTMLDivElement>(null);

  const sortedResources = useMemo(
    () => [...resources].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs),
    [resources],
  );

  useEffect(() => {
    const prev = prevResourcesRef.current;
    const changed = new Set<string>();
    for (const r of sortedResources) {
      const prevEnd = prev.get(r.id);
      if (prevEnd !== undefined && prevEnd !== r.endMs) {
        changed.add(r.id);
      }
    }
    prevResourcesRef.current = new Map(sortedResources.map((r) => [r.id, r.endMs]));
    if (changed.size > 0) {
      setChangedIds(changed);
      const timer = setTimeout(() => setChangedIds(new Set()), 800);
      return () => clearTimeout(timer);
    }
  }, [sortedResources]);

  const depChain = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const chain = new Set<string>();
    let cur = selectedId;
    const resourceMap = new Map(sortedResources.map((r) => [r.id, r]));
    while (cur) {
      chain.add(cur);
      const r = resourceMap.get(cur);
      cur = r?.dependsOn ?? "";
      if (!cur || chain.has(cur)) break;
    }
    return chain;
  }, [selectedId, sortedResources]);

  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);

  const handleMouseEnter = useCallback(
    (r: WaterfallResource, e: React.MouseEvent<SVGGElement>) => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      setTooltip({
        resource: r,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 10,
      });
    },
    [],
  );

  const handleMouseMove = useCallback(
    (r: WaterfallResource, e: React.MouseEvent<SVGGElement>) => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      setTooltip({
        resource: r,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 10,
      });
    },
    [],
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  const maxMs = Math.max(timelineEndMs, 500);
  const msToX = (ms: number) => LABEL_WIDTH + (ms / maxMs) * BAR_AREA_WIDTH;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGSVGElement>) => {
      const len = sortedResources.length;
      if (len === 0) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        const next = focusedIdx === null ? 0 : Math.min(focusedIdx + 1, len - 1);
        setFocusedIdx(next);
        const r = sortedResources[next];
        const barX = msToX(r.startMs);
        const y = TOP_PAD + next * ROW_HEIGHT;
        setTooltip({ resource: r, x: barX, y: y - 10 });
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = focusedIdx === null ? 0 : Math.max(focusedIdx - 1, 0);
        setFocusedIdx(prev);
        const r = sortedResources[prev];
        const barX = msToX(r.startMs);
        const y = TOP_PAD + prev * ROW_HEIGHT;
        setTooltip({ resource: r, x: barX, y: y - 10 });
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (focusedIdx !== null) {
          const r = sortedResources[focusedIdx];
          setSelectedId(selectedId === r.id ? null : r.id);
        }
      } else if (e.key === "Escape") {
        setSelectedId(null);
        setTooltip(null);
        setFocusedIdx(null);
      }
    },
    [focusedIdx, sortedResources, selectedId, msToX],
  );

  const totalHeight = TOP_PAD + sortedResources.length * ROW_HEIGHT + BOTTOM_PAD;
  const totalWidth = LABEL_WIDTH + BAR_AREA_WIDTH + 12;

  const tickInterval = maxMs <= 1000 ? 200 : maxMs <= 2000 ? 500 : 1000;
  const ticks: number[] = [];
  for (let t = 0; t <= maxMs; t += tickInterval) ticks.push(t);

  return (
    <div className={styles.waterfallWrapper} ref={wrapperRef} style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        width="100%"
        height={totalHeight}
        className={styles.waterfallSvg}
        role="group"
        aria-roledescription="interactive chart"
        aria-label={`Resource waterfall: ${sortedResources.length} resources loading over ${maxMs >= 1000 ? `${(maxMs / 1000).toFixed(1)}s` : `${maxMs}ms`}. Use arrow keys to navigate resources, Enter to select, Escape to deselect.`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onBlur={() => { setFocusedIdx(null); setTooltip(null); }}
      >
        <title>Resource loading waterfall chart</title>
        <defs>
          <filter id="wf-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Time axis ticks */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={msToX(t)}
              y1={TOP_PAD - 4}
              x2={msToX(t)}
              y2={totalHeight - BOTTOM_PAD}
              stroke="var(--color-border)"
              strokeWidth={0.5}
              strokeDasharray="2,3"
            />
            <text
              x={msToX(t)}
              y={TOP_PAD - 8}
              textAnchor="middle"
              className={styles.waterfallTickLabel}
            >
              {t >= 1000 ? `${(t / 1000).toFixed(1)}s` : `${t}ms`}
            </text>
          </g>
        ))}

        {/* Resource rows */}
        <AnimatePresence mode="popLayout">
          {sortedResources.map((r, i) => {
            const y = TOP_PAD + i * ROW_HEIGHT;
            const barX = msToX(r.startMs);
            const barW = Math.max(
              (r.endMs - r.startMs) / maxMs * BAR_AREA_WIDTH,
              3,
            );

            return (
              <motion.g
                key={r.id}
                initial={rm ? false : { opacity: 0 }}
                animate={{ opacity: selectedId && !depChain.has(r.id) ? 0.25 : 1 }}
                exit={{ opacity: 0 }}
                transition={TRANSITION.enterItem}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedId(selectedId === r.id ? null : r.id)}
                onMouseEnter={(e) => handleMouseEnter(r, e)}
                onMouseMove={(e) => handleMouseMove(r, e)}
                onMouseLeave={handleMouseLeave}
                aria-label={`${r.label} — ${r.sizeKB}KB, ${r.startMs}ms to ${r.endMs}ms${r.blocking ? ", render-blocking" : ""}`}
              >
                {focusedIdx === i && (
                  <rect
                    x={0}
                    y={y}
                    width={totalWidth}
                    height={ROW_HEIGHT}
                    fill="var(--color-accent)"
                    opacity={0.08}
                    rx={2}
                  />
                )}
                {/* Label */}
                <text
                  x={LABEL_WIDTH - 6}
                  y={y + ROW_HEIGHT / 2 + 1}
                  textAnchor="end"
                  className={styles.waterfallLabel}
                  fill={r.optimized ? "var(--diagram-layer-9)" : "var(--color-muted)"}
                >
                  {r.label}
                </text>

                {/* Bar */}
                <motion.rect
                  y={y + 4}
                  rx={2}
                  ry={2}
                  height={ROW_HEIGHT - 8}
                  fill={RESOURCE_COLORS[r.type]}
                  opacity={r.blocking ? 1 : 0.75}
                  filter={changedIds.has(r.id) ? "url(#wf-glow)" : undefined}
                  initial={rm ? false : { width: 0, x: barX }}
                  animate={{ width: barW, x: barX }}
                  transition={SPRING.snappy}
                />

                {/* Blocking indicator */}
                {r.blocking && (
                  <motion.rect
                    animate={{ x: barX }}
                    transition={SPRING.snappy}
                    y={y + 3}
                    width={2}
                    height={ROW_HEIGHT - 6}
                    rx={1}
                    fill="var(--color-error)"
                  />
                )}

                {/* Size label */}
                <text
                  x={barX + barW + 4}
                  y={y + ROW_HEIGHT / 2 + 1}
                  className={styles.waterfallSizeLabel}
                >
                  {r.sizeKB}KB
                </text>
              </motion.g>
            );
          })}
        </AnimatePresence>

        {/* Dependency arrows */}
        {sortedResources.map((r, i) => {
          if (!r.dependsOn) return null;
          const depIdx = sortedResources.findIndex((d) => d.id === r.dependsOn);
          if (depIdx < 0) return null;
          const dep = sortedResources[depIdx];
          const fromX = msToX(dep.endMs);
          const fromY = TOP_PAD + depIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
          const toX = msToX(r.startMs);
          const toY = TOP_PAD + i * ROW_HEIGHT + ROW_HEIGHT / 2;
          const onCriticalPath = selectedId ? depChain.has(r.id) && depChain.has(dep.id) : false;
          return (
            <line
              key={`dep-${r.id}`}
              x1={fromX}
              y1={fromY}
              x2={toX}
              y2={toY}
              stroke={onCriticalPath ? "var(--diagram-layer-4)" : "var(--color-border)"}
              strokeWidth={onCriticalPath ? 1.2 : 0.6}
              strokeDasharray={onCriticalPath ? undefined : "2,3"}
              opacity={selectedId && !onCriticalPath ? 0.15 : 0.5}
            />
          );
        })}
      </svg>

      {/* Custom tooltip */}
      {tooltip && (
        <div
          className={styles.waterfallTooltip}
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className={styles.tooltipHeader}>
            <span
              className={styles.tooltipDot}
              style={{ background: RESOURCE_COLORS[tooltip.resource.type] }}
            />
            <strong>{tooltip.resource.label}</strong>
            <span className={styles.tooltipType}>{tooltip.resource.type}</span>
          </div>
          <div className={styles.tooltipRow}>
            <span>{tooltip.resource.sizeKB} KB</span>
            <span className={styles.tooltipDivider} />
            <span>{tooltip.resource.endMs - tooltip.resource.startMs}ms</span>
          </div>
          <div className={styles.tooltipTimeline}>
            {tooltip.resource.startMs}ms → {tooltip.resource.endMs}ms
          </div>
          {tooltip.resource.blocking && (
            <div className={styles.tooltipBlocking}>render-blocking</div>
          )}
          {tooltip.resource.dependsOn && (
            <div className={styles.tooltipDep}>
              waits for <strong>{tooltip.resource.dependsOn}</strong>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className={styles.waterfallLegend}>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: RESOURCE_COLORS.document }} /> doc
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: RESOURCE_COLORS.css }} /> css
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: RESOURCE_COLORS.js }} /> js
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: RESOURCE_COLORS.font }} /> font
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: RESOURCE_COLORS.image }} /> img
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: RESOURCE_COLORS["third-party"] }} /> 3P
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDotBlocking} /> blocking
        </span>
      </div>
    </div>
  );
}
