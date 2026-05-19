"use client";

import { DemoSandbox } from "@/components/principles/demo-primitives/DemoSandbox";
import {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import styles from "./WindowingExplorer.module.css";

const ITEM_HEIGHT = 36;
const VIEWPORT_HEIGHT = 400;
const MINIMAP_HEIGHT = 340;
const NAIVE_CAP = 3_000;

type RenderMode = "windowed" | "naive";

type RenderedItem = {
  index: number;
  y: number;
  inViewport: boolean;
};

export function WindowingExplorer() {
  const [renderMode, setRenderMode] = useState<RenderMode>("windowed");
  const [totalItems, setTotalItems] = useState(10_000);
  const [overscan, setOverscan] = useState(3);
  const [scrollTop, setScrollTop] = useState(0);
  const [domCount, setDomCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);

  const totalHeight = totalItems * ITEM_HEIGHT;
  const isNaive = renderMode === "naive";
  const naiveCount = Math.min(totalItems, NAIVE_CAP);

  // ── Windowed calculation ──
  const viewportStartIdx = Math.floor(scrollTop / ITEM_HEIGHT);
  const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ITEM_HEIGHT);
  const viewportEndIdx = Math.min(
    totalItems - 1,
    viewportStartIdx + visibleCount - 1,
  );
  const renderStart = isNaive
    ? 0
    : Math.max(0, viewportStartIdx - overscan);
  const renderEnd = isNaive
    ? naiveCount - 1
    : Math.min(totalItems - 1, viewportEndIdx + overscan);
  const mountedCount = renderEnd - renderStart + 1;

  const items: RenderedItem[] = useMemo(() => {
    const arr: RenderedItem[] = [];
    for (let i = renderStart; i <= renderEnd; i++) {
      arr.push({
        index: i,
        y: i * ITEM_HEIGHT,
        inViewport: i >= viewportStartIdx && i <= viewportEndIdx,
      });
    }
    return arr;
  }, [renderStart, renderEnd, viewportStartIdx, viewportEndIdx]);

  // ── Real DOM counting ──
  useEffect(() => {
    if (spacerRef.current) {
      setDomCount(spacerRef.current.childElementCount);
    }
  }, [items.length, renderMode]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    },
    [],
  );

  const handleTotalChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = Number(e.target.value);
      setTotalItems(next);
      if (containerRef.current) {
        const maxScroll = Math.max(0, next * ITEM_HEIGHT - VIEWPORT_HEIGHT);
        if (containerRef.current.scrollTop > maxScroll) {
          containerRef.current.scrollTop = maxScroll;
        }
      }
    },
    [],
  );

  const handleModeChange = useCallback((v: string) => {
    setRenderMode(v as RenderMode);
  }, []);

  // ── Minimap geometry ──
  const mmScale = Math.min(1, MINIMAP_HEIGHT / totalHeight);
  const mmViewportTop = scrollTop * mmScale;
  const mmViewportH = Math.max(6, VIEWPORT_HEIGHT * mmScale);
  const mmRenderTop = renderStart * ITEM_HEIGHT * mmScale;
  const mmRenderH = isNaive
    ? MINIMAP_HEIGHT
    : Math.max(10, mountedCount * ITEM_HEIGHT * mmScale);

  // ── Windowed vs naive comparison ──
  const windowedNodes = visibleCount + overscan * 2;
  const naiveNodes = Math.min(totalItems, NAIVE_CAP);
  const ratio = Math.max(1, naiveNodes / Math.max(1, windowedNodes));

  return (
    <DemoSandbox title="Windowing Explorer">
      <DemoSandbox.Tabs
        options={["windowed", "naive"] as const}
        value={renderMode}
        onChange={handleModeChange}
        formatOption={(v) =>
          v === "windowed" ? "Windowed" : "Naive (all items)"
        }
      />

      {/* ── DOM comparison banner ── */}
      <div className={styles.comparison} role="region" aria-label="DOM node comparison">
        <div className={styles.compRow}>
          <span className={styles.compLabel}>Windowed</span>
          <div className={styles.compTrack}>
            <div
              className={styles.compBarWindowed}
              style={{ width: `${Math.max(2, (windowedNodes / naiveNodes) * 100)}%` }}
            />
          </div>
          <span className={styles.compCount}>{windowedNodes} nodes</span>
        </div>
        <div className={styles.compRow}>
          <span className={styles.compLabel}>Naive</span>
          <div className={styles.compTrack}>
            <div
              className={styles.compBarNaive}
              style={{ width: "100%" }}
            />
          </div>
          <span className={styles.compCount}>
            {naiveNodes.toLocaleString()} nodes
          </span>
        </div>
        <div className={styles.compRatio}>
          {Math.round(ratio)}&times; fewer DOM nodes with windowing
        </div>
      </div>

      <div className={styles.layout}>
        {/* ── Minimap ── */}
        <div className={styles.minimap}>
          <div
            className={styles.mmTrack}
            style={{ height: MINIMAP_HEIGHT }}
            aria-hidden="true"
          >
            <div
              className={isNaive ? styles.mmRenderedFull : styles.mmRendered}
              style={{ top: mmRenderTop, height: mmRenderH }}
            />
            <div
              className={styles.mmViewport}
              style={{ top: mmViewportTop, height: mmViewportH }}
            />
          </div>
          <div className={styles.mmLabel}>
            <span className={styles.mmCount}>{domCount}</span>
            <span className={styles.mmTotal}>
              / {totalItems.toLocaleString()}
            </span>
          </div>
        </div>

        {/* ── Scroll container ── */}
        <div className={styles.scrollerWrap}>
          <div
            ref={containerRef}
            className={styles.scroller}
            onScroll={handleScroll}
            style={{ height: VIEWPORT_HEIGHT }}
            role="list"
            aria-label={`Virtual list of ${totalItems.toLocaleString()} items, ${domCount} currently in DOM`}
          >
            <div ref={spacerRef} className={styles.spacer} style={{ height: totalHeight }}>
              {items.map((item) => (
                <div
                  key={item.index}
                  role="listitem"
                  className={
                    isNaive
                      ? item.inViewport
                        ? styles.rowNaiveVisible
                        : styles.rowNaive
                      : item.inViewport
                        ? styles.rowViewport
                        : styles.rowOverscan
                  }
                  style={{
                    transform: `translateY(${item.y}px)`,
                    height: ITEM_HEIGHT,
                  }}
                >
                  <span className={styles.rowIdx}>#{item.index}</span>
                  <span className={styles.rowBar} />
                  {!isNaive && (
                    <span className={styles.rowPos}>
                      translateY({item.y.toLocaleString()}px)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline: live computation flow — only in windowed mode */}
          {!isNaive && (
            <div className={styles.pipeline} aria-label="Windowing calculation pipeline">
              <span className={styles.pipeStep}>
                scrollTop{" "}
                <span className={styles.pipeStepVal}>
                  {Math.round(scrollTop).toLocaleString()}
                </span>
              </span>
              <span className={styles.pipeArrow} aria-hidden="true">
                &rarr;
              </span>
              <span className={styles.pipeStep}>
                start{" "}
                <span className={styles.pipeStepVal}>
                  floor({Math.round(scrollTop)}/{ITEM_HEIGHT}) ={" "}
                  {viewportStartIdx}
                </span>
              </span>
              <span className={styles.pipeArrow} aria-hidden="true">
                &rarr;
              </span>
              <span className={styles.pipeStep}>
                mount{" "}
                <span className={styles.pipeStepVal}>
                  #{renderStart}–#{renderEnd}
                </span>
              </span>
              <span className={styles.pipeArrow} aria-hidden="true">
                &rarr;
              </span>
              <span className={styles.pipeStep}>
                DOM{" "}
                <span className={styles.pipeStepVal}>
                  {domCount} nodes
                </span>
              </span>
            </div>
          )}

          {/* Naive mode warning */}
          {isNaive && (
            <div className={styles.naiveWarning}>
              {totalItems > NAIVE_CAP ? (
                <>
                  Rendering {NAIVE_CAP.toLocaleString()} of{" "}
                  {totalItems.toLocaleString()} items (capped to prevent
                  browser freeze). Notice the scroll is already slower than
                  windowed mode.
                </>
              ) : (
                <>
                  All {naiveNodes.toLocaleString()} items rendered. Every single
                  DOM node exists simultaneously. Try scrolling — then switch to
                  Windowed mode and feel the difference.
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Stats panel ── */}
        <div
          className={styles.stats}
          role="region"
          aria-label="Windowing statistics"
          aria-live="polite"
        >
          <div className={styles.statRow}>
            <span className={styles.statLabel}>DOM nodes</span>
            <span className={styles.statHighlight}>{domCount}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Total</span>
            <span className={styles.statValue}>
              {totalItems.toLocaleString()}
            </span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Viewport</span>
            <span className={styles.statValue}>
              #{viewportStartIdx}–#{viewportEndIdx}
            </span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Overscan</span>
            <span className={styles.statValue}>&plusmn;{overscan}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Spacer</span>
            <span className={styles.statValue}>
              {totalHeight.toLocaleString()}px
            </span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Savings</span>
            <span className={styles.statHighlight}>
              {isNaive ? "0%" : `${Math.round((1 - domCount / totalItems) * 100)}%`}
            </span>
          </div>
        </div>
      </div>

      <DemoSandbox.Controls>
        <label className={styles.ctrl}>
          Items
          <input
            type="range"
            min={100}
            max={100_000}
            step={100}
            value={totalItems}
            onChange={handleTotalChange}
            aria-valuetext={`${totalItems.toLocaleString()} items`}
          />
          <span className={styles.ctrlVal}>
            {totalItems.toLocaleString()}
          </span>
        </label>
        <label className={styles.ctrl}>
          Overscan
          <input
            type="range"
            min={0}
            max={10}
            value={overscan}
            onChange={(e) => setOverscan(Number(e.target.value))}
            aria-valuetext={`${overscan} items overscan`}
          />
          <span className={styles.ctrlVal}>&plusmn;{overscan}</span>
        </label>
      </DemoSandbox.Controls>

      <DemoSandbox.Caption>
        {isNaive
          ? "Every item is a real DOM node. Switch to Windowed to see how virtualisation changes this."
          : "Only highlighted items exist in the DOM — everything else is empty space. Switch to Naive to feel the difference."}
      </DemoSandbox.Caption>
    </DemoSandbox>
  );
}
