import {
  buildGallery,
  buildImgMarkup,
  evaluateLazyConfig,
  pickSrcsetCandidate,
  savingsVsJpeg,
  sizeAtQuality,
} from "../image-perf-simulator";

describe("sizeAtQuality", () => {
  it("matches the calibration table at probe points", () => {
    expect(sizeAtQuality("jpeg", 100)).toBe(320);
    expect(sizeAtQuality("jpeg", 80)).toBe(115);
    expect(sizeAtQuality("avif", 80)).toBe(68);
    expect(sizeAtQuality("png", 100)).toBe(680);
  });

  it("interpolates linearly between calibration points", () => {
    const j95 = sizeAtQuality("jpeg", 95);
    expect(j95).toBeGreaterThan(180);
    expect(j95).toBeLessThan(320);
  });

  it("clamps quality to [20, 100]", () => {
    expect(sizeAtQuality("jpeg", 0)).toBe(sizeAtQuality("jpeg", 20));
    expect(sizeAtQuality("jpeg", 200)).toBe(sizeAtQuality("jpeg", 100));
  });
});

describe("savingsVsJpeg", () => {
  it("reports AVIF at q=80 as roughly half the size of JPEG", () => {
    const savings = savingsVsJpeg("avif", 80);
    expect(savings).toBeGreaterThan(35);
    expect(savings).toBeLessThan(60);
  });
});

describe("pickSrcsetCandidate", () => {
  const candidates = [
    { width: 400, sizeKB: 18 },
    { width: 800, sizeKB: 52 },
    { width: 1200, sizeKB: 95 },
    { width: 1600, sizeKB: 148 },
  ];

  it("picks the smallest candidate that covers the effective width", () => {
    const r = pickSrcsetCandidate(candidates, 400, 2);
    expect(r.picked.width).toBe(800);
    expect(r.fellBack).toBe(false);
  });

  it("picks the next size up when the need is just over a candidate", () => {
    const r = pickSrcsetCandidate(candidates, 401, 2);
    expect(r.picked.width).toBe(1200);
  });

  it("flags fellBack=true when no candidate covers the effective width", () => {
    const r = pickSrcsetCandidate(candidates, 1024, 2);
    expect(r.effectiveWidth).toBe(2048);
    expect(r.picked.width).toBe(1600);
    expect(r.fellBack).toBe(true);
  });

  it("works when candidates are passed in arbitrary order", () => {
    const unordered = [...candidates].reverse();
    const r = pickSrcsetCandidate(unordered, 320, 1);
    expect(r.picked.width).toBe(400);
  });
});

describe("buildImgMarkup", () => {
  it("emits an <img> with srcset, sizes, src, width, height", () => {
    const html = buildImgMarkup([480, 800, 1200], "(min-width: 768px) 50vw, 100vw");
    expect(html).toMatch(/srcset="photo-480\.webp 480w/);
    expect(html).toMatch(/photo-800\.webp 800w/);
    expect(html).toMatch(/photo-1200\.webp 1200w/);
    expect(html).toMatch(/sizes="\(min-width: 768px\) 50vw, 100vw"/);
    expect(html).toMatch(/width="1200"/);
  });

  it("sorts widths ascending before emitting", () => {
    const html = buildImgMarkup([1200, 480, 800], "100vw");
    const idx480 = html.indexOf("480w");
    const idx800 = html.indexOf("800w");
    const idx1200 = html.indexOf("1200w");
    expect(idx480).toBeLessThan(idx800);
    expect(idx800).toBeLessThan(idx1200);
  });
});

describe("evaluateLazyConfig", () => {
  const gallery = buildGallery();

  it("comes in under 1.0 MB when only above-fold is eager", () => {
    const eager = new Set(gallery.filter((g) => g.aboveFold).map((g) => g.index));
    const r = evaluateLazyConfig(gallery, eager, 1024);
    expect(r.eagerBytes).toBeLessThan(1024);
    expect(r.overByKB).toBeLessThan(0);
    expect(r.heroIsLazy).toBe(false);
  });

  it("flags heroIsLazy when image index 0 is not in eager set", () => {
    const eager = new Set(gallery.filter((g) => g.aboveFold && !g.hero).map((g) => g.index));
    const r = evaluateLazyConfig(gallery, eager, 1024);
    expect(r.heroIsLazy).toBe(true);
  });

  it("totals correctly when all are eager", () => {
    const eager = new Set(gallery.map((g) => g.index));
    const r = evaluateLazyConfig(gallery, eager, 1024);
    expect(r.eagerBytes).toBe(r.totalBytes);
  });
});
