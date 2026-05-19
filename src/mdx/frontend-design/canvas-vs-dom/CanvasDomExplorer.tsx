"use client";

import { DemoSandbox } from "@/components/principles/demo-primitives/DemoSandbox";
import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import styles from "./CanvasDomExplorer.module.css";

const MIN_DOTS = 50;
const MAX_DOTS = 20_000;
const DOT_SIZE = 4;
const AREA_H = 320;

type Dot = { x: number; y: number; hue: number };

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function generateDots(count: number, w: number, h: number): Dot[] {
  const rng = seededRandom(7);
  return Array.from({ length: count }, () => ({
    x: rng() * w,
    y: rng() * h,
    hue: Math.round(rng() * 360),
  }));
}

function formatTime(ms: number): string {
  if (ms < 0.1) return "<0.1ms";
  if (ms < 10) return `${ms.toFixed(1)}ms`;
  return `${Math.round(ms)}ms`;
}

function timeClass(ms: number): string {
  if (ms < 4) return styles.timeGood;
  if (ms < 16) return styles.timeWarn;
  return styles.timeBad;
}

export function CanvasDomExplorer() {
  const [dotCount, setDotCount] = useState(500);
  const [areaWidth, setAreaWidth] = useState(400);
  const [domRenderMs, setDomRenderMs] = useState(0);
  const [canvasRenderMs, setCanvasRenderMs] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  const domRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const domAreaRef = useRef<HTMLDivElement>(null);

  const dots = useMemo(
    () => generateDots(dotCount, areaWidth, AREA_H),
    [dotCount, areaWidth],
  );

  useEffect(() => {
    if (domAreaRef.current) {
      const w = domAreaRef.current.offsetWidth;
      if (w > 0) setAreaWidth(w);
    }
  }, []);

  // Measure DOM render time — force layout on all children to scale with DOM size
  useEffect(() => {
    if (!domRef.current) return;
    const start = performance.now();
    const children = domRef.current.children;
    for (let i = 0; i < children.length; i++) {
      void (children[i] as HTMLElement).offsetTop;
    }
    setDomRenderMs(performance.now() - start);
  }, [dots]);

  // ── Draw canvas + measure ──
  const drawCanvas = useCallback(
    (canvas: HTMLCanvasElement, items: Dot[]) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return 0;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      for (const dot of items) {
        ctx.fillStyle = `oklch(65% 0.15 ${dot.hue})`;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, DOT_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      return performance.now();
    },
    [],
  );

  useEffect(() => {
    if (canvasRef.current) {
      const start = performance.now();
      drawCanvas(canvasRef.current, dots);
      const elapsed = performance.now() - start;
      setCanvasRenderMs(elapsed);
    }
  }, [dots, drawCanvas]);

  const tradeoffs: Array<[string, string, string]> = [
    ["Events", "Native (click, hover, focus)", "Manual hit-testing"],
    ["Accessibility", "Built-in DOM a11y tree", "Must implement ARIA"],
    ["Text selection", "Free", "Manual text rendering"],
    ["Style/Layout", "CSS engine handles it", "You calculate everything"],
    ["10K+ elements", "Drops frames", "Stays smooth"],
    ["Memory", "Heavy (DOM nodes)", "Light (pixel buffer)"],
  ];

  const crossoverReached = dotCount >= 5_000;
  const domAdvantage = dotCount < 1_000;

  return (
    <div className={styles.root}>
      <DemoSandbox title="Canvas vs DOM Rendering">
        <div className={styles.split}>
          {/* DOM pane */}
          <div className={styles.pane}>
            <span className={styles.paneLabelDom}>DOM</span>
            <div
              ref={domAreaRef}
              className={styles.renderArea}
              style={{ height: AREA_H }}
              role="img"
              aria-label={`DOM rendering ${dotCount} elements`}
            >
              <div ref={domRef}>
                {dots.map((dot, i) => (
                  <div
                    key={i}
                    className={styles.domDot}
                    style={{
                      left: dot.x - DOT_SIZE / 2,
                      top: dot.y - DOT_SIZE / 2,
                      width: DOT_SIZE,
                      height: DOT_SIZE,
                      background: `oklch(65% 0.15 ${dot.hue})`,
                    }}
                  />
                ))}
              </div>
              <div className={styles.timeOverlay}>
                <span className={timeClass(domRenderMs)}>
                  {formatTime(domRenderMs)}
                </span>
              </div>
            </div>
          </div>

          {/* Canvas pane */}
          <div className={styles.pane}>
            <span className={styles.paneLabelCanvas}>Canvas</span>
            <div
              className={styles.renderArea}
              style={{ height: AREA_H }}
              role="img"
              aria-label={`Canvas rendering ${dotCount} elements`}
            >
              <canvas ref={canvasRef} className={styles.canvasEl} />
              <div className={styles.timeOverlay}>
                <span className={timeClass(canvasRenderMs)}>
                  {formatTime(canvasRenderMs)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Render time comparison bar */}
        <div className={styles.renderComparison} aria-live="polite">
          <div className={styles.renderCompRow}>
            <span className={styles.renderCompLabel}>DOM</span>
            <div className={styles.renderCompTrack}>
              <div
                className={styles.renderCompBarDom}
                style={{
                  width: `${Math.min(100, Math.max(2, (domRenderMs / 32) * 100))}%`,
                }}
              />
            </div>
            <span className={timeClass(domRenderMs)}>
              {formatTime(domRenderMs)}
            </span>
          </div>
          <div className={styles.renderCompRow}>
            <span className={styles.renderCompLabel}>Canvas</span>
            <div className={styles.renderCompTrack}>
              <div
                className={styles.renderCompBarCanvas}
                style={{
                  width: `${Math.min(100, Math.max(2, (canvasRenderMs / 32) * 100))}%`,
                }}
              />
            </div>
            <span className={timeClass(canvasRenderMs)}>
              {formatTime(canvasRenderMs)}
            </span>
          </div>
          {domRenderMs > 0.1 && canvasRenderMs > 0 && (
            <div className={styles.renderCompRatio}>
              DOM is {Math.max(1, Math.round(domRenderMs / Math.max(0.1, canvasRenderMs)))}&times; slower
            </div>
          )}
        </div>

        {/* Tradeoff table */}
        <div
          className={styles.tradeoffs}
          role="table"
          aria-label="DOM vs Canvas tradeoffs"
        >
          <div className={styles.tradeoffHeader}>Feature</div>
          <div className={styles.tradeoffHeader}>DOM</div>
          <div className={styles.tradeoffHeader}>Canvas</div>
          {tradeoffs.map(([feature, dom, canvas]) => {
            const domIsGood =
              feature !== "10K+ elements" && feature !== "Memory";
            const isCrossoverRow =
              (feature === "10K+ elements" || feature === "Memory") &&
              crossoverReached;
            const isDomAdvantageRow =
              (feature === "Events" ||
                feature === "Accessibility" ||
                feature === "Text selection") &&
              domAdvantage;
            return (
              <div key={feature} style={{ display: "contents" }} role="row">
                <div
                  className={
                    isCrossoverRow
                      ? styles.tradeoffCellHighlight
                      : isDomAdvantageRow
                        ? styles.tradeoffCellDomWin
                        : styles.tradeoffCell
                  }
                  role="rowheader"
                >
                  {feature}
                </div>
                <div
                  className={
                    isDomAdvantageRow && domIsGood
                      ? styles.tradeoffGoodHighlight
                      : domIsGood
                        ? styles.tradeoffGood
                        : isCrossoverRow && !domIsGood
                          ? styles.tradeoffBadHighlight
                          : styles.tradeoffBad
                  }
                  role="cell"
                >
                  {dom}
                </div>
                <div
                  className={
                    isCrossoverRow && !domIsGood
                      ? styles.tradeoffGoodHighlight
                      : domIsGood
                        ? styles.tradeoffBad
                        : styles.tradeoffGood
                  }
                  role="cell"
                >
                  {canvas}
                </div>
              </div>
            );
          })}
        </div>

        <DemoSandbox.Controls>
          <label className={styles.ctrl}>
            Elements
            <input
              type="range"
              min={MIN_DOTS}
              max={MAX_DOTS}
              step={50}
              value={dotCount}
              onChange={(e) => setDotCount(Number(e.target.value))}
              aria-valuetext={`${dotCount.toLocaleString()} elements`}
            />
            <span className={styles.ctrlVal}>
              {dotCount.toLocaleString()}
            </span>
          </label>
        </DemoSandbox.Controls>

        <DemoSandbox.Caption>
          Drag the slider to scale element count. Watch the render time
          diverge — DOM gets dramatically slower while Canvas stays flat.
        </DemoSandbox.Caption>
      </DemoSandbox>
    </div>
  );
}
