"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { StateEntry } from "@/components/recipe-lab/StateInspector";

// ── Constants ──────────────────────────────────────────────────────────

export const ITEM_HEIGHT = 36;
export const VIEWPORT_HEIGHT = 380;
export const DEFAULT_TOTAL = 10_000;
export const NAIVE_CAP = 2_000;
export const DEFAULT_OVERSCAN = 3;

// ── Phases ─────────────────────────────────────────────────────────────

export type Phase = "problem" | "insight" | "mechanics";

export function getPhase(step: number): Phase {
  if (step <= 2) return "problem";
  if (step <= 4) return "insight";
  return "mechanics";
}

// ── Rendered item type ─────────────────────────────────────────────────

export type RenderedItem = {
  index: number;
  y: number;
  inViewport: boolean;
  isOverscan: boolean;
};

// ── Context shape ──────────────────────────────────────────────────────

type WindowingContextValue = {
  activeStep: number;
  phase: Phase;

  // Core data
  totalItems: number;
  setTotalItems: (n: number) => void;
  itemHeight: number;
  viewportHeight: number;
  totalHeight: number;

  // Scroll
  scrollTop: number;
  setScrollTop: (n: number) => void;

  // Windowing toggle (step 4+)
  windowingEnabled: boolean;
  toggleWindowing: () => void;

  // Overscan (step 6)
  overscan: number;
  setOverscan: (n: number) => void;

  // Viewport range
  viewportStart: number;
  viewportEnd: number;
  visibleCount: number;

  // Render range
  renderStart: number;
  renderEnd: number;
  mountedCount: number;

  // Items to render
  items: RenderedItem[];

  // Computed
  savings: number;
  naiveDomCount: number;

  // Feature visibility (step-driven)
  showViewportHighlight: boolean;
  showMinimap: boolean;
  showWindowing: boolean;
  showPipeline: boolean;
  showOverscan: boolean;

  // Inspector
  stateEntries: StateEntry[];
  renderCount: number;
};

const WindowingContext = createContext<WindowingContextValue | null>(null);

export function useWindowing() {
  const ctx = useContext(WindowingContext);
  if (!ctx) {
    throw new Error("useWindowing must be used within <WindowingProvider>");
  }
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────────────

type WindowingProviderProps = {
  activeStep: number;
  children: ReactNode;
};

export function WindowingProvider({
  activeStep,
  children,
}: WindowingProviderProps) {
  const phase = getPhase(activeStep);
  const [totalItems, setTotalItems] = useState(DEFAULT_TOTAL);
  const [scrollTop, setScrollTop] = useState(0);
  const [windowingEnabled, setWindowingEnabled] = useState(false);
  const [overscan, setOverscan] = useState(DEFAULT_OVERSCAN);
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  // ── Step transitions ──
  const prevStepRef = useRef(activeStep);
  useEffect(() => {
    if (prevStepRef.current === activeStep) return;

    if (activeStep >= 4) setWindowingEnabled(true);
    else setWindowingEnabled(false);

    if (activeStep === 6) setOverscan(0);

    const prevPhase = getPhase(prevStepRef.current);
    if (prevPhase !== phase) setScrollTop(0);

    prevStepRef.current = activeStep;
  }, [activeStep, phase]);

  const toggleWindowing = useCallback(() => {
    setWindowingEnabled((p) => !p);
  }, []);

  // ── Feature visibility ──
  const showViewportHighlight = activeStep >= 3;
  const showMinimap = activeStep >= 3;
  const showWindowing = activeStep >= 4;
  const showPipeline = activeStep >= 5;
  const showOverscan = activeStep >= 6;

  // ── Calculations ──
  const totalHeight = totalItems * ITEM_HEIGHT;
  const viewportStart = Math.floor(scrollTop / ITEM_HEIGHT);
  const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ITEM_HEIGHT);
  const viewportEnd = Math.min(
    totalItems - 1,
    viewportStart + visibleCount - 1,
  );

  const isWindowed = windowingEnabled && showWindowing;
  const activeOverscan = showOverscan ? overscan : 0;

  const renderStart = isWindowed
    ? Math.max(0, viewportStart - activeOverscan)
    : 0;
  const renderEnd = isWindowed
    ? Math.min(totalItems - 1, viewportEnd + activeOverscan)
    : Math.min(totalItems - 1, NAIVE_CAP - 1);
  const mountedCount = renderEnd - renderStart + 1;
  const naiveDomCount = Math.min(totalItems, NAIVE_CAP);

  const savings = isWindowed
    ? Math.round((1 - mountedCount / totalItems) * 100)
    : 0;

  // ── Build item list ──
  const items = useMemo((): RenderedItem[] => {
    const arr: RenderedItem[] = [];
    for (let i = renderStart; i <= renderEnd; i++) {
      arr.push({
        index: i,
        y: i * ITEM_HEIGHT,
        inViewport: i >= viewportStart && i <= viewportEnd,
        isOverscan: isWindowed && (i < viewportStart || i > viewportEnd),
      });
    }
    return arr;
  }, [renderStart, renderEnd, viewportStart, viewportEnd, isWindowed]);

  // ── State inspector entries ──
  const stateEntries = useMemo((): StateEntry[] => {
    const entries: StateEntry[] = [];

    entries.push({ label: "totalItems", value: totalItems });
    entries.push({
      label: "itemHeight",
      value: `${ITEM_HEIGHT}px`,
    });
    entries.push({
      label: "totalHeight",
      value: `${totalHeight.toLocaleString("en-US")}px`,
    });

    if (activeStep >= 2) {
      entries.push({
        label: "domNodes",
        value: isWindowed ? mountedCount : naiveDomCount,
        highlight: isWindowed,
      });
    }

    if (activeStep >= 3) {
      entries.push({
        label: "viewportStart",
        value: viewportStart,
        highlight: true,
      });
      entries.push({
        label: "viewportEnd",
        value: viewportEnd,
        highlight: true,
      });
      entries.push({
        label: "visibleItems",
        value: visibleCount,
      });
      if (!isWindowed) {
        entries.push({
          label: "wastedNodes",
          value: naiveDomCount - visibleCount,
          highlight: true,
        });
      }
    }

    if (activeStep >= 4) {
      entries.push({
        label: "mode",
        value: isWindowed ? "windowed" : "naive",
        highlight: isWindowed,
      });
      if (isWindowed) {
        entries.push({
          label: "savings",
          value: `${savings}%`,
          highlight: true,
        });
        entries.push({
          label: "spacerHeight",
          value: `${totalHeight.toLocaleString("en-US")}px`,
        });
      }
    }

    if (activeStep >= 5) {
      entries.push({
        label: "scrollTop",
        value: Math.round(scrollTop),
        highlight: scrollTop > 0,
      });
      entries.push({
        label: "startIndex",
        value: viewportStart,
        highlight: true,
      });
      entries.push({
        label: "mountRange",
        value: `[${renderStart}, ${renderEnd}]`,
        highlight: true,
      });
    }

    if (activeStep >= 6) {
      entries.push({
        label: "overscan",
        value: `±${overscan}`,
        highlight: overscan > 0,
      });
      entries.push({
        label: "bufferItems",
        value: isWindowed
          ? Math.min(activeOverscan, viewportStart) +
            Math.min(
              activeOverscan,
              totalItems - 1 - viewportEnd,
            )
          : 0,
      });
    }

    return entries;
  }, [
    totalItems,
    totalHeight,
    activeStep,
    isWindowed,
    mountedCount,
    naiveDomCount,
    viewportStart,
    viewportEnd,
    visibleCount,
    savings,
    scrollTop,
    renderStart,
    renderEnd,
    overscan,
    activeOverscan,
  ]);

  // ── Memoised context value ──
  const value = useMemo(
    (): WindowingContextValue => ({
      activeStep,
      phase,
      totalItems,
      setTotalItems,
      itemHeight: ITEM_HEIGHT,
      viewportHeight: VIEWPORT_HEIGHT,
      totalHeight,
      scrollTop,
      setScrollTop,
      windowingEnabled,
      toggleWindowing,
      overscan,
      setOverscan,
      viewportStart,
      viewportEnd,
      visibleCount,
      renderStart,
      renderEnd,
      mountedCount,
      items,
      savings,
      naiveDomCount,
      showViewportHighlight,
      showMinimap,
      showWindowing,
      showPipeline,
      showOverscan,
      stateEntries,
      renderCount: renderCountRef.current,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      activeStep,
      phase,
      totalItems,
      totalHeight,
      scrollTop,
      windowingEnabled,
      toggleWindowing,
      overscan,
      viewportStart,
      viewportEnd,
      visibleCount,
      renderStart,
      renderEnd,
      mountedCount,
      items,
      savings,
      naiveDomCount,
      showViewportHighlight,
      showMinimap,
      showWindowing,
      showPipeline,
      showOverscan,
      stateEntries,
    ],
  );

  return (
    <WindowingContext.Provider value={value}>
      {children}
    </WindowingContext.Provider>
  );
}
