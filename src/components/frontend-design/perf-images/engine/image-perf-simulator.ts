// Pure simulation logic for the perf-images lab.
// Kept free of React so the lab UI can stay thin and the math is testable.

export type ImageFormat = "avif" | "webp" | "jpeg" | "png";

export interface FormatPoint {
  format: ImageFormat;
  /** File size in KB at the given quality for a 1600x1000 photograph. */
  sizeKB: number;
}

// Pre-computed sizes for a representative 1600x1000 photograph. The steep
// drop-off from q=100 -> q=85 is intentional: it matches modern encoders
// (libavif, mozjpeg, libwebp) and lets the prose claim "most savings
// happen 100 -> 90" without contradicting the bars on screen.
const QUALITY_TABLE: { q: number; png: number; jpeg: number; webp: number; avif: number }[] = [
  { q: 100, png: 680, jpeg: 320, webp: 240, avif: 195 },
  { q: 90,  png: 680, jpeg: 180, webp: 130, avif: 105 },
  { q: 85,  png: 680, jpeg: 140, webp: 100, avif:  82 },
  { q: 80,  png: 680, jpeg: 115, webp:  84, avif:  68 },
  { q: 70,  png: 680, jpeg:  88, webp:  64, avif:  52 },
  { q: 60,  png: 680, jpeg:  72, webp:  52, avif:  42 },
  { q: 40,  png: 680, jpeg:  56, webp:  40, avif:  32 },
  { q: 20,  png: 680, jpeg:  42, webp:  28, avif:  22 },
];

/** Interpolate file size for a (format, quality) pair from the calibration table. */
export function sizeAtQuality(format: ImageFormat, quality: number): number {
  const q = Math.max(20, Math.min(100, quality));
  const table = QUALITY_TABLE;
  for (let i = 0; i < table.length - 1; i++) {
    const hi = table[i];
    const lo = table[i + 1];
    if (q <= hi.q && q >= lo.q) {
      const t = hi.q === lo.q ? 0 : (q - lo.q) / (hi.q - lo.q);
      const a = lo[format];
      const b = hi[format];
      return Math.round(a + (b - a) * t);
    }
  }
  return table[table.length - 1][format];
}

/** Savings percentage of AVIF (or other) vs JPEG at the same quality. */
export function savingsVsJpeg(format: ImageFormat, quality: number): number {
  const jpeg = sizeAtQuality("jpeg", quality);
  const target = sizeAtQuality(format, quality);
  if (jpeg === 0) return 0;
  return Math.round((1 - target / jpeg) * 100);
}

// -- srcset picker -----------------------------------------------------

export interface SrcsetCandidate {
  width: number;
  sizeKB: number;
}

export interface SrcsetPick {
  picked: SrcsetCandidate;
  /** True when no candidate covers the requested effective width and the
   *  largest available is being used as a fallback. */
  fellBack: boolean;
  effectiveWidth: number;
}

/**
 * Pick the smallest srcset candidate that still covers the effective width
 * (viewport CSS px * DPR). Falls back to the largest candidate and flags it.
 * Candidates can be passed in any order; they are sorted ascending internally.
 */
export function pickSrcsetCandidate(
  candidates: SrcsetCandidate[],
  viewportCssWidth: number,
  dpr: number,
): SrcsetPick {
  const effectiveWidth = Math.round(viewportCssWidth * dpr);
  const sorted = [...candidates].sort((a, b) => a.width - b.width);
  const winner = sorted.find((c) => c.width >= effectiveWidth);
  if (winner) {
    return { picked: winner, fellBack: false, effectiveWidth };
  }
  return {
    picked: sorted[sorted.length - 1],
    fellBack: true,
    effectiveWidth,
  };
}

/** Render the chosen widths as a valid `<img>` element string the reader can copy. */
export function buildImgMarkup(
  widths: number[],
  sizesAttr: string,
  baseName = "photo",
  ext = "webp",
): string {
  const sortedWidths = [...widths].sort((a, b) => a - b);
  const srcset = sortedWidths
    .map((w) => `${baseName}-${w}.${ext} ${w}w`)
    .join(",\n            ");
  // Default `src` is the median-ish width, matching real-world authoring guidance.
  const defaultSrc = sortedWidths[Math.floor(sortedWidths.length / 2)] ?? sortedWidths[0];
  return [
    `<img`,
    `    srcset="${srcset}"`,
    `    sizes="${sizesAttr}"`,
    `    src="${baseName}-${defaultSrc}.${ext}"`,
    `    width="${sortedWidths[sortedWidths.length - 1] ?? 800}"`,
    `    height="${Math.round((sortedWidths[sortedWidths.length - 1] ?? 800) * 0.625)}"`,
    `    alt="..." />`,
  ].join("\n");
}

// -- Lazy loading budget -----------------------------------------------

export interface PageImage {
  index: number;
  /** "above the fold" reflects what the reader sees on first paint. */
  aboveFold: boolean;
  /** Hero image is the LCP candidate. Lazy-loading it warns. */
  hero: boolean;
  sizeKB: number;
}

/** A realistic 20-image gallery layout: hero (#1) + 2 above-fold cards + 17 below. */
export function buildGallery(): PageImage[] {
  return Array.from({ length: 20 }, (_, i) => ({
    index: i,
    aboveFold: i < 3,
    hero: i === 0,
    sizeKB: i === 0 ? 95 : 45, // hero is larger than gallery thumbs
  }));
}

export interface LazyResult {
  eagerBytes: number;
  totalBytes: number;
  /** Negative means under budget. */
  overByKB: number;
  heroIsLazy: boolean;
  /** Above-fold images marked lazy will be re-fetched mid-paint, costing LCP. */
  aboveFoldLazyCount: number;
}

export function evaluateLazyConfig(
  gallery: PageImage[],
  eagerIndices: Set<number>,
  budgetKB: number,
): LazyResult {
  let eagerBytes = 0;
  let totalBytes = 0;
  let heroIsLazy = false;
  let aboveFoldLazyCount = 0;

  for (const img of gallery) {
    totalBytes += img.sizeKB;
    if (eagerIndices.has(img.index)) {
      eagerBytes += img.sizeKB;
    } else {
      if (img.hero) heroIsLazy = true;
      if (img.aboveFold) aboveFoldLazyCount += 1;
    }
  }

  return {
    eagerBytes,
    totalBytes,
    overByKB: eagerBytes - budgetKB,
    heroIsLazy,
    aboveFoldLazyCount,
  };
}

// -- DPR map -----------------------------------------------------------

/** A representative DPR by device class. Used so the srcset story matches reality. */
export const DPR_PRESETS = [
  { label: "Phone (DPR 3)", value: 3 },
  { label: "Retina laptop (DPR 2)", value: 2 },
  { label: "Standard monitor (DPR 1)", value: 1 },
] as const;
