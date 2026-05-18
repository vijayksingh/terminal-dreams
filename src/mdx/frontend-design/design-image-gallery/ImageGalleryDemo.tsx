"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { DemoSandbox } from "@/components/principles/demo-primitives/DemoSandbox";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import styles from "./ImageGalleryDemo.module.css";

/* ── Constants ────────────────────────────────────────────────── */

const TOTAL_IMAGES = 500;
const COLUMNS = 3;
const IMAGE_KB = 85; // average "image" size in KB
const ROW_HEIGHT_BASE = 100;
const BUFFER_ROWS = 2;
const LOAD_DELAY_MS = 300;
const IO_ROOT_MARGIN = "100px";

type Tab = "Gallery" | "Network" | "Lightbox";

type ImageStatus = "pending" | "loading" | "loaded";

interface ImageItem {
  id: number;
  height: number;
  hue: number;
  lightness: number;
  chroma: number;
  status: ImageStatus;
}

/* ── Deterministic image data ─────────────────────────────────── */

function generateImages(): ImageItem[] {
  const imgs: ImageItem[] = [];
  for (let i = 0; i < TOTAL_IMAGES; i++) {
    // Heights vary between 80-180px to create masonry feel
    const heightSeed = ((i * 137 + 73) % 100) / 100;
    const height = Math.round(80 + heightSeed * 100);
    // Hue range: indigo (260) to teal (190), wrapping through blue
    const hue = 190 + ((i * 17 + 41) % 80);
    const lightness = 45 + ((i * 23 + 11) % 20);
    const chroma = 0.15 + ((i * 13 + 7) % 10) * 0.008;
    imgs.push({
      id: i,
      height,
      hue,
      lightness,
      chroma,
      status: "pending",
    });
  }
  return imgs;
}

function imageColor(img: ImageItem): string {
  return `oklch(${img.lightness}% ${img.chroma} ${img.hue})`;
}

/* ── Component ────────────────────────────────────────────────── */

export function ImageGalleryDemo() {
  const reducedMotion = usePrefersReducedMotion();
  const [activeTab, setActiveTab] = useState<Tab>("Gallery");
  const [images, setImages] = useState<ImageItem[]>(generateImages);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const demoRootRef = useRef<HTMLDivElement>(null);
  const lightboxPrevRef = useRef<HTMLButtonElement>(null);
  const lightboxNextRef = useRef<HTMLButtonElement>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  const loadTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  /* ── Derived state ──────────────────────────────────────────── */

  const loadedCount = images.filter((img) => img.status === "loaded").length;
  const loadingCount = images.filter((img) => img.status === "loading").length;
  const pendingCount = TOTAL_IMAGES - loadedCount - loadingCount;
  const savedMB = (((TOTAL_IMAGES - loadedCount) * IMAGE_KB) / 1024).toFixed(1);

  /* ── Virtualization logic ───────────────────────────────────── */

  // We compute row positions for a 3-column masonry
  // For simplicity, items fill columns left-to-right, row by row
  const rowCount = Math.ceil(TOTAL_IMAGES / COLUMNS);

  const getRowHeight = useCallback(
    (rowIdx: number): number => {
      // Height of a row = max height of its items
      const startIdx = rowIdx * COLUMNS;
      let maxH = ROW_HEIGHT_BASE;
      for (let c = 0; c < COLUMNS; c++) {
        const idx = startIdx + c;
        if (idx < images.length) {
          maxH = Math.max(maxH, images[idx].height);
        }
      }
      return maxH;
    },
    [images]
  );

  // Cumulative row offsets
  const rowOffsets = useCallback((): number[] => {
    const offsets: number[] = [0];
    for (let r = 0; r < rowCount; r++) {
      offsets.push(offsets[r] + getRowHeight(r) + 8); // 8px gap
    }
    return offsets;
  }, [rowCount, getRowHeight]);

  const totalHeight = useCallback((): number => {
    const offsets = rowOffsets();
    return offsets[offsets.length - 1] ?? 0;
  }, [rowOffsets]);

  const getVisibleRange = useCallback((): {
    startRow: number;
    endRow: number;
  } => {
    const container = scrollRef.current;
    if (!container)
      return { startRow: 0, endRow: Math.min(BUFFER_ROWS * 2, rowCount) };

    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;
    const offsets = rowOffsets();

    // Binary search for start row
    let startRow = 0;
    for (let r = 0; r < rowCount; r++) {
      if (offsets[r + 1] > scrollTop) {
        startRow = r;
        break;
      }
    }

    // Find end row
    let endRow = startRow;
    for (let r = startRow; r < rowCount; r++) {
      if (offsets[r] > scrollTop + viewportHeight) {
        endRow = r;
        break;
      }
      endRow = r + 1;
    }

    // Add buffer
    startRow = Math.max(0, startRow - BUFFER_ROWS);
    endRow = Math.min(rowCount, endRow + BUFFER_ROWS);

    return { startRow, endRow };
  }, [rowCount, rowOffsets]);

  /* ── Lazy loading ───────────────────────────────────────────── */

  const triggerLoad = useCallback(
    (indices: number[]) => {
      const toLoad = indices.filter((idx) => {
        const img = images[idx];
        return img && img.status === "pending" && !loadTimers.current.has(idx);
      });

      if (toLoad.length === 0) return;

      setImages((prev) => {
        const next = [...prev];
        for (const idx of toLoad) {
          next[idx] = { ...next[idx], status: "loading" };
        }
        return next;
      });

      for (const idx of toLoad) {
        const delay = reducedMotion ? 0 : LOAD_DELAY_MS + Math.random() * 200;
        const timer = setTimeout(() => {
          setImages((prev) => {
            const next = [...prev];
            if (next[idx]) {
              next[idx] = { ...next[idx], status: "loaded" };
            }
            return next;
          });
          loadTimers.current.delete(idx);
        }, delay);
        loadTimers.current.set(idx, timer);
      }
    },
    [images, reducedMotion]
  );

  /* ── IntersectionObserver for lazy loading ──────────────────── */

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const visibleIndices: number[] = [];
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const rowIdx = Number(
            (entry.target as HTMLElement).dataset.rowIdx
          );
          if (!Number.isNaN(rowIdx)) {
            for (let c = 0; c < COLUMNS; c++) {
              const idx = rowIdx * COLUMNS + c;
              if (idx < TOTAL_IMAGES) {
                visibleIndices.push(idx);
              }
            }
          }
        }
      }
      if (visibleIndices.length > 0) {
        triggerLoad(visibleIndices);
      }
    },
    [triggerLoad]
  );

  // Create/recreate the observer when the callback changes
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    observerRef.current = new IntersectionObserver(handleIntersection, {
      root,
      rootMargin: IO_ROOT_MARGIN,
      threshold: 0,
    });

    // Observe all existing sentinels
    sentinelRefs.current.forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [handleIntersection]);

  // Ref callback for sentinel elements
  const setSentinelRef = useCallback(
    (rowIdx: number, el: HTMLDivElement | null) => {
      if (el) {
        sentinelRefs.current.set(rowIdx, el);
        observerRef.current?.observe(el);
      } else {
        const prev = sentinelRefs.current.get(rowIdx);
        if (prev) {
          observerRef.current?.unobserve(prev);
        }
        sentinelRefs.current.delete(rowIdx);
      }
    },
    []
  );

  /* ── Scroll handler (for virtualization re-render only) ─────── */

  const [, setScrollTick] = useState(0);
  const handleScroll = useCallback(() => {
    // Force re-render so getVisibleRange picks up new scrollTop
    setScrollTick((t) => t + 1);
  }, []);

  // Initial load: trigger for initially visible rows
  useEffect(() => {
    const { startRow, endRow } = getVisibleRange();
    const initialIndices: number[] = [];
    for (let r = startRow; r < endRow; r++) {
      for (let c = 0; c < COLUMNS; c++) {
        const idx = r * COLUMNS + c;
        if (idx < TOTAL_IMAGES) {
          initialIndices.push(idx);
        }
      }
    }
    triggerLoad(initialIndices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup timers
  useEffect(() => {
    const timers = loadTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };
  }, []);

  /* ── Reset ──────────────────────────────────────────────────── */

  const handleReset = useCallback(() => {
    loadTimers.current.forEach((t) => clearTimeout(t));
    loadTimers.current.clear();
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
    setImages(generateImages());
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    // Re-trigger initial load after reset
    resetTimerRef.current = setTimeout(() => {
      const { startRow, endRow } = getVisibleRange();
      const initialIndices: number[] = [];
      for (let r = startRow; r < endRow; r++) {
        for (let c = 0; c < COLUMNS; c++) {
          const idx = r * COLUMNS + c;
          if (idx < TOTAL_IMAGES) {
            initialIndices.push(idx);
          }
        }
      }
      triggerLoad(initialIndices);
      resetTimerRef.current = null;
    }, 50);
  }, [getVisibleRange, triggerLoad]);

  /* ── Lightbox ───────────────────────────────────────────────── */

  const openLightbox = useCallback((idx: number) => {
    setLightboxIndex(idx);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const lightboxPrev = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      // Find previous loaded image
      for (let i = prev - 1; i >= 0; i--) {
        if (images[i].status === "loaded") return i;
      }
      return prev;
    });
  }, [images]);

  const lightboxNext = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      // Find next loaded image
      for (let i = prev + 1; i < TOTAL_IMAGES; i++) {
        if (images[i].status === "loaded") return i;
      }
      return prev;
    });
  }, [images]);

  // Focus trap for lightbox
  const handleLightboxKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        closeLightbox();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        lightboxPrev();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        lightboxNext();
        return;
      }
      // Focus trap: cycle between Prev, Next, Close
      if (e.key === "Tab") {
        const focusable = [
          lightboxPrevRef.current,
          lightboxNextRef.current,
          lightboxCloseRef.current,
        ].filter(Boolean) as HTMLElement[];

        if (focusable.length === 0) return;

        const currentIdx = focusable.indexOf(
          document.activeElement as HTMLElement
        );

        if (e.shiftKey) {
          e.preventDefault();
          const nextIdx =
            currentIdx <= 0 ? focusable.length - 1 : currentIdx - 1;
          focusable[nextIdx].focus();
        } else {
          e.preventDefault();
          const nextIdx =
            currentIdx >= focusable.length - 1 ? 0 : currentIdx + 1;
          focusable[nextIdx].focus();
        }
      }
    },
    [closeLightbox, lightboxPrev, lightboxNext]
  );

  // Auto-focus close button when lightbox opens
  useEffect(() => {
    if (lightboxIndex !== null && lightboxCloseRef.current) {
      lightboxCloseRef.current.focus();
    }
  }, [lightboxIndex]);

  /* ── Render: Gallery tab ────────────────────────────────────── */

  function renderGallery() {
    const { startRow, endRow } = getVisibleRange();
    const offsets = rowOffsets();
    const visibleItems: React.ReactNode[] = [];

    for (let r = startRow; r < endRow; r++) {
      // Sentinel element for IntersectionObserver (one per row)
      visibleItems.push(
        <div
          key={`sentinel-${r}`}
          ref={(el) => setSentinelRef(r, el)}
          data-row-idx={r}
          className={styles.sentinel}
          style={{
            position: "absolute",
            top: offsets[r],
            left: 0,
            width: "100%",
            height: getRowHeight(r),
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />
      );

      for (let c = 0; c < COLUMNS; c++) {
        const idx = r * COLUMNS + c;
        if (idx >= TOTAL_IMAGES) continue;
        const img = images[idx];
        const top = offsets[r];
        const colWidth = `calc((100% - ${(COLUMNS - 1) * 8}px) / ${COLUMNS})`;
        const left = `calc(${c} * (${colWidth} + 8px))`;

        visibleItems.push(
          <div
            key={img.id}
            className={styles.imageCard}
            style={{
              position: "absolute",
              top,
              left,
              width: colWidth,
              height: img.height,
            }}
            role="button"
            tabIndex={0}
            aria-label={`Image ${img.id + 1}${img.status === "loaded" ? ", loaded" : ", pending"}`}
            onClick={() => {
              if (img.status === "loaded") openLightbox(idx);
            }}
            onKeyDown={(e) => {
              if (
                (e.key === "Enter" || e.key === " ") &&
                img.status === "loaded"
              ) {
                e.preventDefault();
                openLightbox(idx);
              }
            }}
          >
            <div
              className={`${styles.imagePlaceholder} ${
                img.status === "loaded"
                  ? styles.imageLoaded
                  : img.status === "loading"
                    ? styles.imageLoading
                    : styles.imagePending
              }`}
              style={
                {
                  height: "100%",
                  "--img-color": imageColor(img),
                } as React.CSSProperties
              }
            >
              {img.id + 1}
            </div>
            <div className={styles.cardMeta}>
              <span>#{img.id + 1}</span>
              {img.status === "loaded" ? (
                <span className={styles.loadedBadge}>loaded</span>
              ) : (
                <span className={styles.pendingBadge}>
                  {img.status === "loading" ? "loading" : "pending"}
                </span>
              )}
            </div>
          </div>
        );
      }
    }

    return (
      <div className={styles.demoRoot} ref={demoRootRef}>
        {/* Skip link for screen readers */}
        <a href="#gallery-controls" className={styles.skipLink}>
          Skip to gallery controls
        </a>

        {/* Live stats bar visible while scrolling */}
        <div className={styles.statsBar} role="status" aria-live="polite">
          <span>
            Loaded{" "}
            <span className={styles.statsHighlight}>{loadedCount}</span> of{" "}
            {TOTAL_IMAGES}
          </span>
          <span className={styles.statsLive}>
            <span className={styles.statsLiveItem}>
              <span className={`${styles.statsLiveDot} ${styles.dotLoadedSmall}`} />
              {loadedCount}
            </span>
            <span className={styles.statsLiveItem}>
              <span className={`${styles.statsLiveDot} ${styles.dotInFlightSmall}`} />
              {loadingCount}
            </span>
            <span className={styles.statsLiveItem}>
              <span className={`${styles.statsLiveDot} ${styles.dotPendingSmall}`} />
              {pendingCount}
            </span>
          </span>
          <span>
            saving{" "}
            <span className={styles.statsHighlight}>{savedMB} MB</span>
          </span>
        </div>
        <div
          ref={scrollRef}
          className={styles.scrollContainer}
          onScroll={handleScroll}
        >
          <div style={{ position: "relative", height: totalHeight() }}>
            {visibleItems}
          </div>
        </div>
        <div id="gallery-controls" className={styles.galleryControls}>
          <button
            className={styles.resetButton}
            onClick={handleReset}
            type="button"
          >
            Reset
          </button>
        </div>
        {lightboxIndex !== null && renderLightboxOverlay()}
      </div>
    );
  }

  /* ── Render: Network tab ────────────────────────────────────── */

  function renderNetwork() {
    // Show first 200 dots for readability, rest are summarized
    const displayCount = Math.min(200, TOTAL_IMAGES);
    const dots: React.ReactNode[] = [];

    for (let i = 0; i < displayCount; i++) {
      const img = images[i];
      let dotClass = styles.networkDotPending;
      if (img.status === "loaded") dotClass = styles.networkDotLoaded;
      else if (img.status === "loading") dotClass = styles.networkDotInFlight;

      dots.push(
        <div
          key={i}
          className={`${styles.networkDot} ${dotClass}`}
          title={`Image ${i + 1}: ${img.status}`}
        />
      );
    }

    return (
      <div className={styles.networkPanel}>
        <div className={styles.networkStatsRow}>
          <div className={styles.networkStat}>
            <div
              className={`${styles.networkStatDot} ${styles.dotLoaded}`}
            />
            <span>{loadedCount} loaded</span>
          </div>
          <div className={styles.networkStat}>
            <div
              className={`${styles.networkStatDot} ${styles.dotInFlight}`}
            />
            <span>{loadingCount} in-flight</span>
          </div>
          <div className={styles.networkStat}>
            <div
              className={`${styles.networkStatDot} ${styles.dotPending}`}
            />
            <span>{pendingCount} pending</span>
          </div>
        </div>
        <div className={styles.networkGrid}>{dots}</div>
        {displayCount < TOTAL_IMAGES && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              color: "var(--color-muted)",
            }}
          >
            Showing first {displayCount} of {TOTAL_IMAGES} requests
          </span>
        )}
        <button
          className={styles.resetButton}
          onClick={handleReset}
          type="button"
        >
          Reset scroll
        </button>
      </div>
    );
  }

  /* ── Render: Lightbox overlay (shared between Gallery & Lightbox tabs) */

  function renderLightboxOverlay() {
    if (lightboxIndex === null) return null;
    const img = images[lightboxIndex];
    if (!img) return null;

    return (
      <div
        className={styles.lightboxOverlay}
        role="dialog"
        aria-modal="true"
        aria-label={`Lightbox: Image ${img.id + 1}`}
        onKeyDown={handleLightboxKeyDown}
      >
        <div className={styles.lightboxContent}>
          <div
            className={styles.lightboxImage}
            style={{ background: imageColor(img) }}
          >
            {img.id + 1}
          </div>
          <div className={styles.lightboxNav}>
            <button
              ref={lightboxPrevRef}
              className={styles.lightboxButton}
              onClick={lightboxPrev}
              type="button"
              aria-label="Previous image"
            >
              Prev
            </button>
            <button
              ref={lightboxNextRef}
              className={styles.lightboxButton}
              onClick={lightboxNext}
              type="button"
              aria-label="Next image"
            >
              Next
            </button>
            <button
              ref={lightboxCloseRef}
              className={styles.lightboxButton}
              onClick={closeLightbox}
              type="button"
              aria-label="Close lightbox"
            >
              Close
            </button>
          </div>
          <div className={styles.focusIndicator}>
            <span className={styles.focusRing} />
            Focus trapped: Tab cycles between buttons
          </div>
          <div className={styles.lightboxLabel}>
            <span className={styles.kbd}>Esc</span> close{" "}
            <span className={styles.kbd}>&larr;</span>{" "}
            <span className={styles.kbd}>&rarr;</span> navigate{" "}
            <span className={styles.kbd}>Tab</span> cycle focus
          </div>
        </div>
      </div>
    );
  }

  /* ── Render: Lightbox tab ───────────────────────────────────── */

  function renderLightboxTab() {
    const loadedImages = images.filter((img) => img.status === "loaded");
    const sampleImg = loadedImages.length > 0 ? loadedImages[0] : images[0];

    return (
      <div className={styles.lightboxPanel}>
        {lightboxIndex !== null ? (
          renderLightboxOverlay()
        ) : (
          <>
            <p className={styles.lightboxInstructions}>
              Click the image below to open the lightbox. Use{" "}
              <span className={styles.kbd}>Tab</span> /{" "}
              <span className={styles.kbd}>Shift+Tab</span> to cycle between
              Prev / Next / Close buttons. Use{" "}
              <span className={styles.kbd}>&larr;</span>{" "}
              <span className={styles.kbd}>&rarr;</span> arrows to navigate and{" "}
              <span className={styles.kbd}>Esc</span> to close.
            </p>
            <div
              className={styles.lightboxDemoCard}
              style={{ background: imageColor(sampleImg) }}
              role="button"
              tabIndex={0}
              aria-label={`Open lightbox for image ${sampleImg.id + 1}`}
              onClick={() => {
                // Ensure this image is "loaded" for lightbox
                setImages((prev) => {
                  const next = [...prev];
                  const idx = next.findIndex((img) => img.id === sampleImg.id);
                  if (idx >= 0) {
                    next[idx] = { ...next[idx], status: "loaded" };
                  }
                  return next;
                });
                openLightbox(images.findIndex((img) => img.id === sampleImg.id));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setImages((prev) => {
                    const next = [...prev];
                    const idx = next.findIndex(
                      (img) => img.id === sampleImg.id
                    );
                    if (idx >= 0) {
                      next[idx] = { ...next[idx], status: "loaded" };
                    }
                    return next;
                  });
                  openLightbox(
                    images.findIndex((img) => img.id === sampleImg.id)
                  );
                }
              }}
            >
              {sampleImg.id + 1}
            </div>
          </>
        )}
      </div>
    );
  }

  /* ── Main render ────────────────────────────────────────────── */

  return (
    <DemoSandbox title="Image Gallery System">
      <DemoSandbox.Tabs
        options={["Gallery", "Network", "Lightbox"] as const}
        value={activeTab}
        onChange={(v) => {
          setActiveTab(v as Tab);
          if (v !== "Lightbox") {
            setLightboxIndex(null);
          }
        }}
      />

      {activeTab === "Gallery" && renderGallery()}
      {activeTab === "Network" && renderNetwork()}
      {activeTab === "Lightbox" && renderLightboxTab()}

      <DemoSandbox.Caption>
        {activeTab === "Gallery" &&
          "Scroll to lazy-load images via IntersectionObserver. Only visible rows are rendered (virtualization)."}
        {activeTab === "Network" &&
          "Each dot represents a network request. Scroll the gallery to see state changes."}
        {activeTab === "Lightbox" &&
          "Focus trap keeps Tab cycling between Prev/Next/Close. Arrow keys navigate."}
      </DemoSandbox.Caption>
    </DemoSandbox>
  );
}
