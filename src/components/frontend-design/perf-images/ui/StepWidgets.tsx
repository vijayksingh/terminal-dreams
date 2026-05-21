"use client";

import React, { useMemo, useState } from "react";
import {
  type ImageFormat,
  type SrcsetCandidate,
  buildGallery,
  buildImgMarkup,
  evaluateLazyConfig,
  pickSrcsetCandidate,
  sizeAtQuality,
  DPR_PRESETS,
} from "../engine/image-perf-simulator";
import { BUDGET_KB } from "../image-perf-context";
import styles from "../ImagePerfLab.module.css";

// ── Shared Bar primitive ─────────────────────────────────────────────

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const width = `${Math.min(100, (value / max) * 100)}%`;
  return (
    <div className={styles.barCell}>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width, background: color }} />
      </div>
      <span className={styles.barValue}>{value}</span>
    </div>
  );
}

// ── Step 1: Format landscape ─────────────────────────────────────────

type FormatRow = {
  format: ImageFormat;
  name: string;
  lossy: boolean;
  transparency: boolean;
  animation: boolean;
  /** Baseline 2024 figures, sourced from caniuse.com / web.dev (May 2026). */
  supportPct: number;
  detail: string;
};

const FORMAT_ROWS: FormatRow[] = [
  {
    format: "jpeg",
    name: "JPEG",
    lossy: true,
    transparency: false,
    animation: false,
    supportPct: 100,
    detail:
      "Universal baseline since 1992. No transparency, no animation, but the safest fallback in <picture>.",
  },
  {
    format: "png",
    name: "PNG",
    lossy: false,
    transparency: true,
    animation: false,
    supportPct: 100,
    detail:
      "Lossless with alpha. Great for UI assets and screenshots, terrible for photographs (5–10× larger).",
  },
  {
    format: "webp",
    name: "WebP",
    lossy: true,
    transparency: true,
    animation: true,
    supportPct: 100,
    detail:
      "Lossy or lossless, transparency, animation. Effectively 100% support in 2025 — use it as the default fallback when AVIF isn't supported.",
  },
  {
    format: "avif",
    name: "AVIF",
    lossy: true,
    transparency: true,
    animation: true,
    supportPct: 95,
    detail:
      "AV1-derived. Roughly half the bytes of JPEG at matched quality. Slow to encode — use a CDN or build-time tool. Safari shipped 16.4 in March 2023, so support is ~95% Baseline 2024.",
  },
];

export function FormatLandscape() {
  const [selected, setSelected] = useState<ImageFormat | null>(null);

  const maxSize = useMemo(
    () => Math.max(...FORMAT_ROWS.map((f) => sizeAtQuality(f.format, 80))),
    [],
  );

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Format comparison · quality 80</div>
      <div className={styles.formatTable}>
        <div className={styles.formatHeaderRow}>
          <span>Format</span>
          <span>Lossy</span>
          <span>Alpha</span>
          <span>Anim</span>
          <span title="Baseline 2024 (caniuse.com / web.dev)">Supp.</span>
          <span>Bytes</span>
          <span>Size</span>
        </div>
        {FORMAT_ROWS.map((f) => {
          const size = sizeAtQuality(f.format, 80);
          const color =
            f.format === "avif"
              ? "var(--diagram-layer-2)"
              : f.format === "webp"
                ? "var(--diagram-layer-1)"
                : f.format === "jpeg"
                  ? "var(--diagram-layer-3)"
                  : "var(--diagram-layer-0)";
          return (
            <button
              key={f.name}
              type="button"
              className={styles.formatRow}
              data-selected={selected === f.format ? "true" : undefined}
              onClick={() => setSelected(selected === f.format ? null : f.format)}
              aria-pressed={selected === f.format}
            >
              <span className={styles.formatName} style={{ color }}>
                {f.name}
              </span>
              <span className={styles.formatCheck}>{f.lossy ? "yes" : "no"}</span>
              <span className={styles.formatCheck}>{f.transparency ? "yes" : "no"}</span>
              <span className={styles.formatCheck}>{f.animation ? "yes" : "no"}</span>
              <span className={styles.formatSupport}>{f.supportPct}%</span>
              <div className={styles.formatBar}>
                <div
                  className={styles.formatBarFill}
                  style={{ width: `${(size / maxSize) * 100}%`, background: color }}
                />
              </div>
              <span className={styles.formatSize}>{size} KB</span>
            </button>
          );
        })}
      </div>
      {selected && (
        <div className={styles.formatDetail}>
          {FORMAT_ROWS.find((f) => f.format === selected)?.detail}
        </div>
      )}
      <div className={styles.markupBlock}>
        <div className={styles.markupTitle}>The picture-element fallback</div>
        <pre className={styles.markupCode}>{`<picture>
  <source type="image/avif" srcset="hero.avif" />
  <source type="image/webp" srcset="hero.webp" />
  <img src="hero.jpg" alt="..." width="1600" height="1000" />
</picture>`}</pre>
        <div className={styles.widgetNote}>
          Browsers walk the <code>{`<source>`}</code> list top-to-bottom; the first matching{" "}
          <code>type</code> wins. Always end on a JPEG <code>{`<img>`}</code> — that branch
          survives even on devices you didn&apos;t anticipate.
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Quality curve ────────────────────────────────────────────

const QUALITY_PROBES = [100, 90, 85, 80, 70, 60, 40, 20];

export function CompressionQuality() {
  const [quality, setQuality] = useState(85);

  const rows = useMemo(
    () =>
      QUALITY_PROBES.map((q) => ({
        q,
        jpeg: sizeAtQuality("jpeg", q),
        webp: sizeAtQuality("webp", q),
        avif: sizeAtQuality("avif", q),
      })),
    [],
  );

  const current = useMemo(
    () => ({
      jpeg: sizeAtQuality("jpeg", quality),
      webp: sizeAtQuality("webp", quality),
      avif: sizeAtQuality("avif", quality),
    }),
    [quality],
  );

  const baseline100 = sizeAtQuality("jpeg", 100);
  const savedVs100 = baseline100 - current.jpeg;
  const savedPct = Math.round((savedVs100 / baseline100) * 100);
  const status = savedPct >= 60 ? "good" : savedPct >= 30 ? "ok" : "bad";

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Quality dial</div>
      <label className={styles.sliderLabel}>
        Quality{" "}
        <strong>
          q={quality}
        </strong>
      </label>
      <input
        type="range"
        min={20}
        max={100}
        step={1}
        value={quality}
        onChange={(e) => setQuality(Number(e.target.value))}
        className={styles.slider}
        aria-label="JPEG/WebP/AVIF quality"
      />
      <div className={styles.qualityCallout} data-status={status}>
        <span className={styles.qualityCalloutValue}>{savedPct}%</span>
        <span className={styles.qualityCalloutNote}>
          saved vs q=100 ({savedVs100} KB off a {baseline100} KB JPEG)
        </span>
      </div>

      <div className={styles.qualityTable}>
        <div className={styles.qualityHeader}>
          <span>q</span>
          <span>JPEG</span>
          <span>WebP</span>
          <span>AVIF</span>
        </div>
        {rows.map((row) => {
          const active = row.q === Math.round(quality / 5) * 5;
          return (
            <div
              key={row.q}
              className={styles.qualityRow}
              data-active={active ? "true" : undefined}
            >
              <span className={styles.qualityQ}>q={row.q}</span>
              <Bar value={row.jpeg} max={320} color="var(--diagram-layer-3)" />
              <Bar value={row.webp} max={320} color="var(--diagram-layer-1)" />
              <Bar value={row.avif} max={320} color="var(--diagram-layer-2)" />
            </div>
          );
        })}
      </div>
      <p className={styles.widgetNote}>
        The curve is steep early. Going from <strong>q=100</strong> to <strong>q=90</strong>{" "}
        buys most of the savings; below <strong>q=70</strong> you trade real visible quality
        for diminishing bytes.
      </p>
    </div>
  );
}

// ── Step 3: srcset builder ───────────────────────────────────────────

const AVAILABLE_WIDTHS = [320, 480, 640, 800, 1024, 1200, 1600, 2000];

const SIZE_PRESETS = [
  { id: "hero", label: "Full-bleed hero", sizesAttr: "100vw" },
  { id: "half", label: "Half on desktop, full on mobile", sizesAttr: "(min-width: 768px) 50vw, 100vw" },
  {
    id: "third",
    label: "Three-column grid",
    sizesAttr: "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  },
] as const;

function estimateSizeForWidth(w: number): number {
  // Approximation of mozjpeg/q80 file size scaling. Real numbers depend on content.
  return Math.round(8 + (w / 1600) * 140);
}

export function SrcsetBuilder() {
  const [selectedWidths, setSelectedWidths] = useState<number[]>([480, 800, 1200, 1600]);
  const [viewportCss, setViewportCss] = useState(768);
  const [dpr, setDpr] = useState(2);
  const [sizePresetId, setSizePresetId] =
    useState<(typeof SIZE_PRESETS)[number]["id"]>("half");
  const [copyState, setCopyState] = useState<"idle" | "ok">("idle");

  const sizesAttr = SIZE_PRESETS.find((p) => p.id === sizePresetId)!.sizesAttr;

  const candidates: SrcsetCandidate[] = useMemo(
    () => selectedWidths.map((w) => ({ width: w, sizeKB: estimateSizeForWidth(w) })),
    [selectedWidths],
  );

  const cssRenderedWidth = useMemo(() => {
    if (sizePresetId === "hero") return viewportCss;
    if (sizePresetId === "half") return viewportCss >= 768 ? Math.round(viewportCss * 0.5) : viewportCss;
    if (sizePresetId === "third") {
      if (viewportCss >= 1024) return Math.round(viewportCss / 3);
      if (viewportCss >= 640) return Math.round(viewportCss / 2);
      return viewportCss;
    }
    return viewportCss;
  }, [viewportCss, sizePresetId]);

  const pick = useMemo(
    () => pickSrcsetCandidate(candidates, cssRenderedWidth, dpr),
    [candidates, cssRenderedWidth, dpr],
  );

  const markup = useMemo(
    () => buildImgMarkup(selectedWidths, sizesAttr),
    [selectedWidths, sizesAttr],
  );

  const toggleWidth = (w: number) => {
    setSelectedWidths((prev) =>
      prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w].sort((a, b) => a - b),
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markup);
      setCopyState("ok");
      setTimeout(() => setCopyState("idle"), 1400);
    } catch {
      setCopyState("idle");
    }
  };

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Build the markup</div>

      <label className={styles.fieldLabel}>Available widths</label>
      <div className={styles.widthChips}>
        {AVAILABLE_WIDTHS.map((w) => (
          <button
            key={w}
            type="button"
            className={styles.widthChip}
            data-on={selectedWidths.includes(w) ? "true" : undefined}
            onClick={() => toggleWidth(w)}
            aria-pressed={selectedWidths.includes(w)}
          >
            {w}w
          </button>
        ))}
      </div>

      <label className={styles.fieldLabel}>Slot sizing</label>
      <div className={styles.sizesPresetRow}>
        {SIZE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={styles.sizesPreset}
            data-on={sizePresetId === p.id ? "true" : undefined}
            onClick={() => setSizePresetId(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <label className={styles.sliderLabel}>
        Viewport <strong>{viewportCss}px</strong>
      </label>
      <input
        type="range"
        min={320}
        max={1800}
        step={10}
        value={viewportCss}
        onChange={(e) => setViewportCss(Number(e.target.value))}
        className={styles.slider}
        aria-label="Viewport CSS width"
      />

      <label className={styles.fieldLabel}>Device pixel ratio</label>
      <div className={styles.dprRow}>
        {DPR_PRESETS.map((d) => (
          <button
            key={d.value}
            type="button"
            className={styles.dprChip}
            data-on={dpr === d.value ? "true" : undefined}
            onClick={() => setDpr(d.value)}
            aria-pressed={dpr === d.value}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className={styles.pickerSummary}>
        <span className={styles.pickerSummaryRow}>
          CSS slot: <strong>{cssRenderedWidth}px</strong>
        </span>
        <span className={styles.pickerSummaryRow}>
          Effective need: <strong>{pick.effectiveWidth}px</strong> ({cssRenderedWidth} × {dpr})
        </span>
        <span
          className={styles.pickerSummaryRow}
          data-status={pick.fellBack ? "bad" : "good"}
        >
          {pick.fellBack
            ? `No candidate covers ${pick.effectiveWidth}px — browser fell back to ${pick.picked.width}w`
            : `Browser picks ${pick.picked.width}w (smallest ≥ ${pick.effectiveWidth}px)`}
        </span>
      </div>

      <div className={styles.candidateList}>
        {candidates.map((c) => {
          const picked = c.width === pick.picked.width;
          return (
            <div
              key={c.width}
              className={styles.candidateRow}
              data-picked={picked ? "true" : undefined}
            >
              <span className={styles.candidateLabel}>{c.width}w</span>
              <Bar
                value={c.sizeKB}
                max={160}
                color={picked ? "var(--diagram-layer-2)" : "var(--diagram-layer-0)"}
              />
              <span className={styles.candidateMeta}>
                {picked ? "selected" : c.width < pick.effectiveWidth ? "too small" : "wasted bytes"}
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.markupBlock}>
        <div className={styles.markupHeader}>
          <span className={styles.markupTitle}>Emitted HTML</span>
          <button
            type="button"
            className={styles.copyBtn}
            onClick={handleCopy}
            data-state={copyState}
          >
            {copyState === "ok" ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className={styles.markupCode}>{markup}</pre>
        <div className={styles.widgetNote}>
          The browser reads <code>sizes</code> first to learn the slot, multiplies by DPR, then
          picks the smallest <code>srcset</code> candidate <strong>≥</strong> that number.
        </div>
      </div>

      <div className={styles.markupBlock}>
        <div className={styles.markupTitle}>Avatars: use 2x descriptors</div>
        <pre className={styles.markupCode}>{`<img
    src="avatar.webp"
    srcset="avatar.webp 1x, avatar@2x.webp 2x, avatar@3x.webp 3x"
    width="40" height="40" alt="Ada" />`}</pre>
        <div className={styles.widgetNote}>
          Use <code>2x</code> descriptors for fixed-size images. Use <code>w</code> descriptors
          when the slot changes with the viewport.
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Art direction ────────────────────────────────────────────

const ART_BREAKPOINTS = [
  {
    label: "Mobile",
    maxWidth: 480,
    crop: "portrait",
    aspect: "3 / 4",
    desc: "Tight portrait crop — subject fills the frame on small screens.",
  },
  {
    label: "Tablet",
    maxWidth: 1024,
    crop: "square",
    aspect: "1 / 1",
    desc: "Square crop with breathing room.",
  },
  {
    label: "Desktop",
    maxWidth: 9999,
    crop: "landscape",
    aspect: "16 / 9",
    desc: "Full landscape — subject sits in environment.",
  },
] as const;

export function ArtDirection() {
  const [viewport, setViewport] = useState(700);
  const active = ART_BREAKPOINTS.find((bp) => viewport <= bp.maxWidth) ?? ART_BREAKPOINTS[2];

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Different crops, not different sizes</div>
      <label className={styles.sliderLabel}>
        Viewport <strong>{viewport}px</strong>
      </label>
      <input
        type="range"
        min={320}
        max={1600}
        step={10}
        value={viewport}
        onChange={(e) => setViewport(Number(e.target.value))}
        className={styles.slider}
        aria-label="Viewport for art direction"
      />
      <div className={styles.cropPreview} style={{ aspectRatio: active.aspect }}>
        <div className={styles.cropLabel}>{active.crop}</div>
        <div className={styles.cropSubject} />
      </div>
      <div className={styles.cropCaption}>
        At {viewport}px the <code>{`<picture>`}</code> serves the{" "}
        <strong>{active.crop}</strong> crop.
      </div>

      <div className={styles.breakpointCards}>
        {ART_BREAKPOINTS.map((bp) => (
          <div
            key={bp.label}
            className={styles.breakpointCard}
            data-active={bp.label === active.label ? "true" : undefined}
          >
            <span className={styles.breakpointLabel}>{bp.label}</span>
            <span className={styles.breakpointCrop}>{bp.crop}</span>
            <span className={styles.breakpointDesc}>{bp.desc}</span>
          </div>
        ))}
      </div>

      <div className={styles.markupBlock}>
        <div className={styles.markupTitle}>The markup browsers walk</div>
        <pre className={styles.markupCode}>{`<picture>
  <source media="(max-width: 480px)"  srcset="hero-portrait.avif"  type="image/avif" />
  <source media="(max-width: 480px)"  srcset="hero-portrait.webp"  type="image/webp" />
  <source media="(max-width: 1024px)" srcset="hero-square.avif"    type="image/avif" />
  <source media="(max-width: 1024px)" srcset="hero-square.webp"    type="image/webp" />
  <source srcset="hero-landscape.avif" type="image/avif" />
  <source srcset="hero-landscape.webp" type="image/webp" />
  <img src="hero-landscape.jpg" alt="..." width="1600" height="900" />
</picture>`}</pre>
        <div className={styles.widgetNote}>
          Stack <code>{`<source>`}</code>s by breakpoint, then by format. The browser walks
          top-to-bottom and uses the <strong>first</strong> source whose <code>media</code> and{" "}
          <code>type</code> both match.
        </div>
      </div>
    </div>
  );
}

// ── Step 5: Lazy budget ──────────────────────────────────────────────

export function LazyBudget() {
  const gallery = useMemo(() => buildGallery(), []);
  const [eagerIndices, setEagerIndices] = useState<Set<number>>(
    () => new Set(gallery.filter((g) => g.aboveFold).map((g) => g.index)),
  );

  const result = useMemo(
    () => evaluateLazyConfig(gallery, eagerIndices, BUDGET_KB),
    [gallery, eagerIndices],
  );

  const overBudget = result.eagerBytes > BUDGET_KB;

  const togglePolicy = (index: number) => {
    setEagerIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const eagerAll = () => setEagerIndices(new Set(gallery.map((g) => g.index)));
  const lazyAll = () => setEagerIndices(new Set());
  const aboveFoldOnly = () =>
    setEagerIndices(new Set(gallery.filter((g) => g.aboveFold).map((g) => g.index)));

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Configure the page</div>
      <div className={styles.lazyControls}>
        <button type="button" className={styles.lazyPreset} onClick={aboveFoldOnly}>
          Above-fold only
        </button>
        <button type="button" className={styles.lazyPreset} onClick={eagerAll}>
          All eager
        </button>
        <button type="button" className={styles.lazyPreset} onClick={lazyAll}>
          All lazy
        </button>
      </div>

      <div className={styles.galleryGrid}>
        {gallery.map((img) => {
          const eager = eagerIndices.has(img.index);
          return (
            <button
              key={img.index}
              type="button"
              className={styles.galleryCell}
              data-policy={eager ? "eager" : "lazy"}
              data-hero={img.hero ? "true" : undefined}
              data-fold={img.aboveFold ? "true" : undefined}
              onClick={() => togglePolicy(img.index)}
              aria-pressed={eager}
              aria-label={`Image ${img.index + 1}${img.hero ? " (hero)" : ""}: ${eager ? "eager" : "lazy"}`}
            >
              <span className={styles.galleryIndex}>{img.index + 1}</span>
              <span className={styles.galleryPolicy}>{eager ? "eager" : "lazy"}</span>
              {img.hero && <span className={styles.galleryHero}>hero</span>}
            </button>
          );
        })}
      </div>

      <div className={styles.budgetMeter} data-status={overBudget ? "bad" : "good"}>
        <div
          className={styles.budgetMeterFill}
          style={{ width: `${Math.min(140, (result.eagerBytes / BUDGET_KB) * 100)}%` }}
        />
        <span className={styles.budgetMeterLabel}>
          <strong>{result.eagerBytes} KB</strong> eager / {BUDGET_KB} KB budget
          {overBudget
            ? ` — over by ${result.overByKB} KB`
            : ` — ${BUDGET_KB - result.eagerBytes} KB headroom`}
        </span>
      </div>

      {result.heroIsLazy && (
        <div className={styles.lcpWarning}>
          <strong>LCP warning.</strong> Image #1 is the hero — the LCP element. Marking it
          lazy forces the browser to wait until layout + IntersectionObserver before fetching
          it. That regression usually shows up as a 400–800ms LCP penalty in field data.
        </div>
      )}

      {!result.heroIsLazy && result.aboveFoldLazyCount > 0 && (
        <div className={styles.foldWarning}>
          <strong>Heads up:</strong> {result.aboveFoldLazyCount} above-fold{" "}
          {result.aboveFoldLazyCount === 1 ? "image is" : "images are"} lazy. They get fetched
          the instant layout completes, so the saving is small and the perception is
          &ldquo;flashing in&rdquo; after first paint.
        </div>
      )}

      <div className={styles.markupBlock}>
        <div className={styles.markupTitle}>The minimum-viable markup</div>
        <pre className={styles.markupCode}>{`<img src="hero.avif"
    width="1600" height="1000"
    fetchpriority="high"
    decoding="async"
    alt="hero" />

<img src="card.webp"
    width="320" height="240"
    loading="lazy"
    decoding="async"
    alt="card" />`}</pre>
        <div className={styles.widgetNote}>
          Always set <code>width</code> and <code>height</code> (or a CSS{" "}
          <code>aspect-ratio</code>). The browser reserves the box <strong>before</strong>{" "}
          bytes arrive — your CLS insurance policy.
        </div>
      </div>
    </div>
  );
}

// ── Step 6: Priority hints ───────────────────────────────────────────

type PriorityResource = {
  name: string;
  priority: "high" | "low" | "auto";
  size: number;
  lcp: boolean;
};

const PRIORITY_RESOURCES: PriorityResource[] = [
  { name: "hero.avif", priority: "high", size: 95, lcp: true },
  { name: "logo.svg", priority: "high", size: 4, lcp: false },
  { name: "card-1.webp", priority: "auto", size: 33, lcp: false },
  { name: "card-2.webp", priority: "auto", size: 39, lcp: false },
  { name: "avatar.webp", priority: "low", size: 8, lcp: false },
  { name: "bg-pattern.svg", priority: "low", size: 12, lcp: false },
];

export function PriorityHints() {
  const [showOptimized, setShowOptimized] = useState(false);

  const sorted = useMemo(() => {
    if (!showOptimized) return PRIORITY_RESOURCES;
    const order = { high: 0, auto: 1, low: 2 };
    return [...PRIORITY_RESOURCES].sort((a, b) => order[a.priority] - order[b.priority]);
  }, [showOptimized]);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Waterfall ordering</div>

      <div className={styles.strategyToggle}>
        <button
          type="button"
          className={styles.strategyButton}
          data-active={!showOptimized ? "true" : undefined}
          onClick={() => setShowOptimized(false)}
        >
          Default heuristics
        </button>
        <button
          type="button"
          className={styles.strategyButton}
          data-active={showOptimized ? "true" : undefined}
          onClick={() => setShowOptimized(true)}
        >
          With priority hints
        </button>
      </div>

      <div className={styles.priorityList}>
        {sorted.map((r, i) => (
          <div key={r.name} className={styles.priorityRow}>
            <span className={styles.priorityIndex}>{i + 1}</span>
            <span className={styles.priorityName}>{r.name}</span>
            <span
              className={styles.priorityBadge}
              data-priority={showOptimized ? r.priority : "auto"}
            >
              {showOptimized ? r.priority : "auto"}
            </span>
            <div className={styles.priorityBarTrack}>
              <div
                className={styles.priorityBar}
                style={{ width: `${(r.size / 95) * 100}%` }}
                data-lcp={r.lcp ? "true" : undefined}
              />
            </div>
            <span className={styles.prioritySize}>{r.size} KB</span>
            {r.lcp && <span className={styles.lcpBadge}>LCP</span>}
          </div>
        ))}
      </div>

      <p className={styles.widgetNote}>
        {showOptimized
          ? "High-priority resources jump to the front of the queue. The hero starts downloading before any avatar or background pattern can compete for bandwidth."
          : "Without hints, hero.avif sits behind logos and patterns in the default order, so layout finishes before the LCP image has had a chance to start."}
      </p>

      <div className={styles.markupBlock}>
        <div className={styles.markupTitle}>The 2024+ hero incantation</div>
        <pre className={styles.markupCode}>{`<img src="hero.avif"
    fetchpriority="high"
    decoding="async"
    width="1600" height="1000"
    alt="hero" />`}</pre>
        <div className={styles.widgetNote}>
          <strong>
            <code>fetchpriority=&quot;high&quot;</code> supersedes{" "}
            <code>{`<link rel="preload" as="image">`}</code>
          </strong>{" "}
          for known LCP images. web.dev&apos;s 2023 guidance: skip the preload tag and put
          the hint on the <code>{`<img>`}</code> itself. Less plumbing, same effect, no risk
          of fetching twice.
        </div>
        <div className={styles.widgetNote}>
          <code>decoding=&quot;async&quot;</code> is free and has been stable since Chrome 65
          (2018). Pair it with <code>fetchpriority</code> on every hero image.
        </div>
      </div>
    </div>
  );
}

// ── Step 7: Image CDN ────────────────────────────────────────────────

const CDN_STAGES = [
  {
    id: "client",
    label: "Client",
    desc: "Sends 'Accept: image/avif, image/webp, image/*' so the CDN can content-negotiate.",
  },
  {
    id: "cdn",
    label: "CDN edge",
    desc: "Looks up (URL + Accept + viewport hint) in the edge cache. Hit → respond. Miss → fall through to transform.",
  },
  {
    id: "transform",
    label: "Transform",
    desc: "Resize, recompress, re-encode to AVIF/WebP/JPEG as needed. Cache the result for the next 1000 requests.",
  },
  {
    id: "origin",
    label: "Origin",
    desc: "Stores exactly one master image at high resolution. The CDN derives every variant lazily.",
  },
] as const;

type Client = "chrome" | "safari16" | "ie11";

const CLIENT_RESPONSE: Record<Client, { fmt: string; size: number; accept: string; label: string }> = {
  chrome: {
    fmt: "image/avif",
    size: 68,
    accept: "Accept: image/avif, image/webp, image/*",
    label: "Chrome 124",
  },
  safari16: {
    fmt: "image/webp",
    size: 84,
    accept: "Accept: image/webp, image/*",
    label: "Safari 16",
  },
  ie11: {
    fmt: "image/jpeg",
    size: 115,
    accept: "Accept: image/*",
    label: "IE 11",
  },
};

export function ImageCDN() {
  const [activeStage, setActiveStage] = useState(0);
  const [client, setClient] = useState<Client>("chrome");

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>One URL, many bytes</div>

      <label className={styles.fieldLabel}>Client</label>
      <div className={styles.dprRow}>
        {(Object.keys(CLIENT_RESPONSE) as Client[]).map((c) => (
          <button
            key={c}
            type="button"
            className={styles.dprChip}
            data-on={client === c ? "true" : undefined}
            onClick={() => setClient(c)}
            aria-pressed={client === c}
          >
            {CLIENT_RESPONSE[c].label}
          </button>
        ))}
      </div>

      <div className={styles.cdnSplit}>
        <span className={styles.cdnSplitMeta}>Accept header advertises</span>
        <code className={styles.cdnSplitCode}>{CLIENT_RESPONSE[client].accept}</code>
        <span className={styles.cdnSplitMeta}>CDN responds with</span>
        <code className={styles.cdnSplitCode}>
          Content-Type: {CLIENT_RESPONSE[client].fmt}, {CLIENT_RESPONSE[client].size} KB
        </code>
      </div>

      <div className={styles.cdnPipeline} role="list">
        {CDN_STAGES.map((stage, i) => (
          <React.Fragment key={stage.id}>
            <button
              type="button"
              className={styles.cdnStage}
              data-active={i === activeStage ? "true" : undefined}
              data-visited={i <= activeStage ? "true" : undefined}
              onClick={() => setActiveStage(i)}
              role="listitem"
              aria-current={i === activeStage ? "step" : undefined}
            >
              <span className={styles.cdnStageIndex}>{i + 1}</span>
              <span className={styles.cdnStageLabel}>{stage.label}</span>
            </button>
            {i < CDN_STAGES.length - 1 && (
              <span
                className={styles.cdnArrow}
                data-active={i < activeStage ? "true" : undefined}
                aria-hidden="true"
              >
                →
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
      <div className={styles.cdnDetail}>
        <div className={styles.cdnDetailLabel}>{CDN_STAGES[activeStage].label}</div>
        <div className={styles.cdnDetailDesc}>{CDN_STAGES[activeStage].desc}</div>
      </div>

      <div className={styles.markupBlock}>
        <div className={styles.markupTitle}>Anatomy of the transform URL</div>
        <pre className={styles.markupCode}>{`/cdn/hero.jpg?w=1600&q=80&fmt=auto&dpr=2`}</pre>
        <div className={styles.widgetNote}>
          <code>w</code> resizes, <code>q</code> sets quality, <code>fmt=auto</code> triggers
          content negotiation, <code>dpr</code> hints the device pixel ratio. Most CDNs sign
          the URL or limit allowed values to prevent transform-cost abuse.
        </div>
      </div>
    </div>
  );
}
