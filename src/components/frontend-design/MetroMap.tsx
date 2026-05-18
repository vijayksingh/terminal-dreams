"use client";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useFdProgress } from "@/hooks/use-fd-progress";
import { SECTIONS, getStopsForSection } from "@/lib/frontend-design-data";
import type { FdMetroMapData, FdSectionSlug } from "@/lib/frontend-design-types";
import { DURATION, EASE, TRANSITION } from "@/lib/motion";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  computeMapLayout,
  MAP_W,
  TRACK_FILL_W,
  STOP_R,
  BADGE_R,
  TICK_H,
  MIN_ZOOM,
  MAX_ZOOM,
  type PositionedStop,
} from "./metro-geometry";
import styles from "./MetroMap.module.css";

type Props = {
  mapData: FdMetroMapData;
  activeSection: FdSectionSlug | null;
  onSectionSelect: (slug: FdSectionSlug | null) => void;
};

type Camera = { x: number; y: number; zoom: number };

function col(token: string): string {
  return `var(${token})`;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(" ");
}

export function MetroMap({ mapData, activeSection, onSectionSelect }: Props) {
  const rm = usePrefersReducedMotion();
  const { isComplete } = useFdProgress();
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [hoveredStop, setHoveredStop] = useState<PositionedStop | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const [aspect, setAspect] = useState(16 / 9);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (height > 0) setAspect(width / height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const isDraggingRef = useRef(false);
  const wasDraggedRef = useRef(false);
  const dragStartRef = useRef({ px: 0, py: 0, cx: 0, cy: 0 });

  const vw = MAP_W / camera.zoom;
  const vh = vw / aspect;
  const viewBox = `${camera.x} ${camera.y} ${vw} ${vh}`;

  const layout = useMemo(() => computeMapLayout(mapData), [mapData]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        const fx = (e.clientX - rect.left) / rect.width;
        const fy = (e.clientY - rect.top) / rect.height;
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        setCamera((c) => {
          const nz = clamp(c.zoom * factor, MIN_ZOOM, MAX_ZOOM);
          const cw = MAP_W / c.zoom;
          const ch = cw / aspect;
          const nw = MAP_W / nz;
          const nh = nw / aspect;
          return { x: c.x + fx * (cw - nw), y: c.y + fy * (ch - nh), zoom: nz };
        });
      } else {
        setCamera((c) => {
          const cw = MAP_W / c.zoom;
          const ch = cw / aspect;
          return {
            x: c.x + (e.deltaX / rect.width) * cw,
            y: c.y + (e.deltaY / rect.height) * ch,
            zoom: c.zoom,
          };
        });
      }
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [aspect]);

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    wasDraggedRef.current = false;
    const cam = cameraRef.current;
    dragStartRef.current = { px: e.clientX, py: e.clientY, cx: cam.x, cy: cam.y };
    svgRef.current?.setPointerCapture(e.pointerId);
    setHoveredStop(null);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingRef.current) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { px, py, cx, cy } = dragStartRef.current;
    if (Math.abs(e.clientX - px) > 3 || Math.abs(e.clientY - py) > 3) wasDraggedRef.current = true;
    setCamera((c) => {
      const cw = MAP_W / c.zoom;
      const ch = cw / aspect;
      return {
        x: cx - ((e.clientX - px) / rect.width) * cw,
        y: cy - ((e.clientY - py) / rect.height) * ch,
        zoom: c.zoom,
      };
    });
  }, [aspect]);

  const handlePointerUp = useCallback(() => { isDraggingRef.current = false; }, []);
  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    if (wasDraggedRef.current) { e.stopPropagation(); e.preventDefault(); wasDraggedRef.current = false; }
  }, []);

  const zoomBy = useCallback((factor: number) => {
    setCamera((c) => {
      const nz = clamp(c.zoom * factor, MIN_ZOOM, MAX_ZOOM);
      const cw = MAP_W / c.zoom; const ch = cw / aspect;
      const nw = MAP_W / nz; const nh = nw / aspect;
      return { x: c.x + 0.5 * (cw - nw), y: c.y + 0.5 * (ch - nh), zoom: nz };
    });
  }, [aspect]);
  const resetCamera = useCallback(() => setCamera({ x: 0, y: 0, zoom: 1 }), []);

  const handleStopHover = useCallback((stop: PositionedStop) => {
    const svg = svgRef.current;
    const canvas = canvasRef.current;
    if (!svg || !canvas) return;
    const sr = svg.getBoundingClientRect();
    const cr = canvas.getBoundingClientRect();
    const cam = cameraRef.current;
    const cw = MAP_W / cam.zoom;
    const ch = cw / aspect;
    setTooltipPos({
      x: ((stop.x - cam.x) / cw) * sr.width + sr.left - cr.left,
      y: ((stop.y - cam.y) / ch) * sr.height + sr.top - cr.top - 12,
    });
    setHoveredStop(stop);
  }, [aspect]);

  useEffect(() => {
    if (!activeSection) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onSectionSelect(null); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [activeSection, onSectionSelect]);

  const selSec = activeSection ? SECTIONS.find((s) => s.slug === activeSection) : null;
  const isZoomed = camera.zoom !== 1 || camera.x !== 0 || camera.y !== 0;

  return (
    <div className={styles.mapCanvas} ref={canvasRef} onClickCapture={handleClickCapture}>
      <svg
        ref={svgRef}
        className={styles.mapSvg}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Frontend System Design roadmap — drag to pan, pinch to zoom"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={resetCamera}
      >
        <defs>
          <filter id="trackGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
          </filter>
        </defs>

        {/* Click-to-deselect background */}
        <rect x={camera.x - 5000} y={camera.y - 5000} width={vw + 10000} height={vh + 10000}
          fill="transparent" onClick={() => { if (activeSection) onSectionSelect(null); }} />

        {/* ═══ 1. Intersection connectors — lowest layer ═══ */}
        {layout.intersections.map((ix, i) => {
          const relevant = !activeSection || ix.sectionSlugs.includes(activeSection);
          const dimmed = activeSection && !relevant;
          return (
            <path
              key={`conn-${i}`}
              d={ix.path}
              className={`${styles.connectorLine} ${
                dimmed ? styles.connectorDimmed :
                activeSection && relevant ? styles.connectorActive : ""
              }`}
              stroke={col(ix.fromColor)}
            />
          );
        })}

        {/* ═══ 2. Per-section tracks — glow → border → colored fill ═══ */}
        {layout.sections.map((sec, sIdx) => {
          const isDimmed = activeSection && activeSection !== sec.sectionSlug;
          const color = col(sec.colorToken);
          const drawDelay = sIdx * 0.25;

          return (
            <g key={`track-${sec.sectionSlug}`}>
              {/* Glow halo */}
              <motion.path
                d={sec.sectionPath}
                className={`${styles.trackGlow} ${isDimmed ? styles.glowDimmed : ""}`}
                stroke={color}
                filter="url(#trackGlow)"
                pathLength={1}
                initial={rm ? {} : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={rm ? { duration: 0 } : { duration: 0.7, ease: [0.4, 0, 0.2, 1], delay: drawDelay }}
              />
              {/* Dark border */}
              <motion.path
                d={sec.sectionPath}
                className={`${styles.trackBorder} ${isDimmed ? styles.dimmed : ""}`}
                pathLength={1}
                initial={rm ? {} : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={rm ? { duration: 0 } : { duration: 0.7, ease: [0.4, 0, 0.2, 1], delay: drawDelay }}
              />
              {/* Colored fill */}
              <motion.path
                d={sec.sectionPath}
                className={`${styles.trackFill} ${isDimmed ? styles.dimmed : ""}`}
                stroke={color}
                pathLength={1}
                initial={rm ? {} : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={rm ? { duration: 0 } : { duration: 0.7, ease: [0.4, 0, 0.2, 1], delay: drawDelay + 0.05 }}
              />
            </g>
          );
        })}

        {/* ═══ 3. Tick marks — dark dividers between stops ═══ */}
        {layout.stops.map((stop, i) => {
          const isDimmed = activeSection && activeSection !== stop.sectionSlug;
          return (
            <motion.line
              key={`tick-${stop.id}`}
              x1={stop.x} y1={stop.y - TICK_H}
              x2={stop.x} y2={stop.y + TICK_H}
              className={`${styles.tick} ${isDimmed ? styles.dimmed : ""}`}
              initial={rm ? {} : { opacity: 0 }}
              animate={{ opacity: isDimmed ? 0 : 0.4 }}
              transition={rm ? { duration: 0 } : { duration: 0.3, delay: 1.2 + i * 0.01 }}
            />
          );
        })}

        {/* ═══ 4. Station markers ═══ */}
        {layout.stops.map((stop, i) => {
          const isDimmed = activeSection && activeSection !== stop.sectionSlug;
          const sec = SECTIONS.find((s) => s.slug === stop.sectionSlug);
          const color = sec ? col(sec.colorToken) : "var(--color-muted)";
          const completed = isComplete(stop.id);
          const sIdx = layout.sections.findIndex((s) => s.sectionSlug === stop.sectionSlug);
          const drawDelay = sIdx * 0.25 + 0.8 + i * 0.012;

          return (
            <g key={stop.id} className={`${styles.stop} ${isDimmed ? styles.stopDimmed : ""}`}>
              <Link href={`/frontend-design/${stop.slug}`}>
                <motion.g
                  className={`${styles.stopMarker} ${stop.kind === "live-coding" ? styles.liveCodingPulse : ""}`}
                  style={{ color }}
                  onMouseEnter={() => handleStopHover(stop)}
                  onMouseLeave={() => setHoveredStop(null)}
                  initial={rm ? {} : { scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={rm ? { duration: 0 } : { ...TRANSITION.enterItem, delay: drawDelay }}
                  tabIndex={0}
                  aria-label={`${stop.label}${completed ? " (completed)" : ""}`}
                >
                  {renderStopShape(stop, color, completed)}
                </motion.g>
              </Link>
              {completed && (
                <text x={stop.x} y={stop.y + 1} textAnchor="middle" dominantBaseline="central"
                  className={styles.checkmark} fill={color} pointerEvents="none">✓</text>
              )}
            </g>
          );
        })}

        {/* ═══ 5. Stop labels — staggered near/far below or above ═══ */}
        {layout.stops.map((stop, i) => {
          const isDimmed = activeSection && activeSection !== stop.sectionSlug;
          const sec = SECTIONS.find((s) => s.slug === stop.sectionSlug);
          const color = sec ? col(sec.colorToken) : "var(--color-muted)";
          const sectionStops = layout.stops.filter((s) => s.sectionSlug === stop.sectionSlug);
          const localIdx = sectionStops.indexOf(stop);
          const isFar = localIdx % 2 === 1;

          return (
            <text
              key={`lbl-${stop.id}`}
              x={stop.x}
              y={stop.labelY}
              textAnchor="middle"
              dominantBaseline={stop.direction === "right" ? "hanging" : "auto"}
              className={`${styles.stopLabel} ${isDimmed ? styles.dimmed : ""} ${isFar ? styles.stopLabelFar : ""}`}
              fill={color}
            >
              {stop.label}
            </text>
          );
        })}

        {/* ═══ 6. Section headers ═══ */}
        {layout.sections.map((sec) => {
          const section = SECTIONS.find((s) => s.slug === sec.sectionSlug);
          if (!section) return null;
          const isDimmed = activeSection && activeSection !== sec.sectionSlug;
          const isActive = activeSection === sec.sectionSlug;
          const color = col(sec.colorToken);
          const numX = sec.titlePos.x;
          const textX = sec.titleAnchor === "start" ? numX + 28 : numX - 28;

          return (
            <g
              key={`hdr-${sec.sectionSlug}`}
              className={`${styles.sectionHeader} ${isDimmed ? styles.dimmed : ""}`}
              onClick={() => onSectionSelect(isActive ? null : sec.sectionSlug)}
            >
              <circle cx={numX} cy={sec.titlePos.y} r={12} fill={color} />
              <text x={numX} y={sec.titlePos.y} textAnchor="middle" dominantBaseline="central"
                className={styles.sectionHeaderNumber}>
                {String(sec.order).padStart(2, "0")}
              </text>
              <text x={textX} y={sec.titlePos.y}
                textAnchor={sec.titleAnchor} dominantBaseline="central"
                className={styles.sectionHeaderText} fill={color}>
                {section.name.toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* ═══ 7. U-turn badges ═══ */}
        {layout.badges.map((badge) => {
          const isDimmed = activeSection && activeSection !== badge.sectionSlug;
          const isActive = activeSection === badge.sectionSlug;
          const color = col(badge.colorToken);

          return (
            <g key={`badge-${badge.sectionSlug}-${badge.order}`}
              className={`${styles.badge} ${isDimmed ? styles.dimmed : ""}`}
              onClick={() => onSectionSelect(isActive ? null : badge.sectionSlug)}
            >
              <circle cx={badge.x} cy={badge.y} r={BADGE_R}
                fill={color} stroke="var(--color-bg)" strokeWidth={4} />
              <text x={badge.x} y={badge.y} textAnchor="middle" dominantBaseline="central"
                className={styles.badgeText} fill="var(--color-bg)">
                {String(badge.order).padStart(2, "0")}
              </text>
            </g>
          );
        })}

        {/* ═══ 8. START marker ═══ */}
        {layout.sections[0] && (() => {
          const s = layout.sections[0];
          return (
            <text x={s.startX + 14} y={s.y - TRACK_FILL_W - 20}
              textAnchor="start" className={styles.startText}>
              ▶ START HERE
            </text>
          );
        })()}
      </svg>

      {/* ── Tooltip ── */}
      <AnimatePresence>
        {hoveredStop && (
          <motion.div
            className={styles.tooltip}
            style={{ left: tooltipPos.x, top: tooltipPos.y, transform: "translate(-50%, -100%)" }}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            transition={{ duration: DURATION.instant }}
          >
            <p className={styles.tooltipTitle}>{hoveredStop.label}</p>
            <div className={styles.tooltipMeta}>
              <span className={styles.tooltipDot}
                style={{ backgroundColor: col(SECTIONS.find((s) => s.slug === hoveredStop.sectionSlug)?.colorToken ?? "--color-muted") }} />
              {SECTIONS.find((s) => s.slug === hoveredStop.sectionSlug)?.shortName}
              <span className={styles.tooltipKind}>{hoveredStop.kind.replace(/-/g, " ")}</span>
              {isComplete(hoveredStop.id) && <span className={styles.tooltipComplete}>completed</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Zoom controls ── */}
      <div className={styles.zoomControls}>
        <button className={styles.zoomBtn} onClick={() => zoomBy(1.4)} aria-label="Zoom in">+</button>
        <span className={styles.zoomLevel}>{Math.round(camera.zoom * 100)}%</span>
        <button className={styles.zoomBtn} onClick={() => zoomBy(1 / 1.4)} aria-label="Zoom out">&minus;</button>
        {isZoomed && (
          <button className={styles.zoomBtn} onClick={resetCamera} aria-label="Reset view">⌂</button>
        )}
      </div>

      {/* ── Detail panel ── */}
      <AnimatePresence>
        {selSec && (
          <motion.aside className={styles.detailPanel}
            initial={{ x: 340 }} animate={{ x: 0 }} exit={{ x: 340 }}
            transition={{ duration: DURATION.normal, ease: EASE.out }}
          >
            <div className={styles.detailHeader}>
              <div className={styles.detailSectionName} style={{ color: col(selSec.colorToken) }}>
                <span className={styles.detailDot} style={{ backgroundColor: col(selSec.colorToken) }} />
                Line {String(selSec.order).padStart(2, "0")}
              </div>
              <button className={styles.detailClose} onClick={() => onSectionSelect(null)}>✕</button>
            </div>
            <h2 className={styles.detailTitle}>{selSec.name}</h2>
            <p className={styles.detailDescription}>{selSec.description}</p>
            <div className={styles.detailStopList}>
              {getStopsForSection(selSec.slug).map((stop) => {
                const completed = isComplete(stop.id);
                return (
                  <Link key={stop.id} href={`/frontend-design/${stop.slug}`} className={styles.detailStop}>
                    <span className={styles.detailStopOrder}>
                      {completed ? "✓" : String(stop.order).padStart(2, "0")}
                    </span>
                    <span className={styles.detailStopName}>{stop.label}</span>
                    <span className={styles.detailStopKind}>{stop.kind.replace(/-/g, " ")}</span>
                  </Link>
                );
              })}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Mobile fallback ── */}
      <div className={styles.mobileList}>
        {SECTIONS.map((sec) => (
          <div key={sec.slug} className={styles.mobileLine}>
            <div className={styles.mobileLineHeader}>
              <span className={styles.mobileLineDot} style={{ backgroundColor: col(sec.colorToken) }} />
              {sec.name}
            </div>
            <p className={styles.mobileLineDesc}>{sec.description}</p>
            <div className={styles.mobileStops}>
              {getStopsForSection(sec.slug).map((stop) => (
                <Link key={stop.id} href={`/frontend-design/${stop.slug}`} className={styles.mobileStop}>
                  {isComplete(stop.id) ? "✓ " : ""}{stop.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderStopShape(stop: PositionedStop, color: string, completed: boolean) {
  const { x, y, kind } = stop;
  const fill = completed ? color : "var(--map-stop-ring)";
  const stroke = "var(--color-bg)";

  switch (kind) {
    case "coding-assignment":
      return (
        <rect x={x - STOP_R} y={y - STOP_R} width={STOP_R * 2} height={STOP_R * 2} rx={3}
          fill={fill} stroke={stroke} strokeWidth={2} />
      );

    case "live-coding":
      return (
        <polygon
          points={`${x},${y - STOP_R} ${x + STOP_R},${y} ${x},${y + STOP_R} ${x - STOP_R},${y}`}
          fill={fill} stroke={stroke} strokeWidth={2} strokeLinejoin="round"
        />
      );

    case "overview":
      return (
        <g>
          <circle cx={x} cy={y} r={STOP_R} fill="none" stroke={fill} strokeWidth={3} />
          <circle cx={x} cy={y} r={STOP_R - 4} fill={fill} />
        </g>
      );

    case "system-design-problem":
      return (
        <polygon points={hexPoints(x, y, STOP_R + 2)}
          fill={fill} stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
      );

    default:
      return (
        <circle cx={x} cy={y} r={STOP_R}
          fill={fill} stroke={stroke} strokeWidth={2} />
      );
  }
}
