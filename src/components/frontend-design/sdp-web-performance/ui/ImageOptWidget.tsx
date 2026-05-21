"use client";

import { usePerfContext } from "../perf-context";
import type { OptimizationParams } from "../engine/perf-simulator";
import styles from "../WebPerformanceLab.module.css";

type ImageFormat = OptimizationParams["imageFormat"];
const FORMAT_RATIO: Record<ImageFormat, number> = { jpeg: 1, webp: 0.65, avif: 0.5 };
const FORMAT_LABELS: Record<ImageFormat, string> = { jpeg: "JPEG", webp: "WebP", avif: "AVIF" };

const IMAGE_ITEMS = [
  { name: "hero", originalKB: 245, lazy: false },
  { name: "card-1", originalKB: 95, lazy: true },
  { name: "card-2", originalKB: 110, lazy: true },
  { name: "banner", originalKB: 88, lazy: true },
];

export function ImageOptWidget() {
  const { enabledOptimizations, optParams, updateOptParam } = usePerfContext();
  const on = enabledOptimizations.has("imageOptimization");
  const format = optParams.imageFormat;
  const quality = optParams.imageQuality;
  const setFormat = (v: ImageFormat) => updateOptParam("imageFormat", v);
  const setQuality = (v: number) => updateOptParam("imageQuality", v);

  const qualityFactor = 0.5 + (quality / 100) * 0.8;
  const maxOriginal = Math.max(...IMAGE_ITEMS.map((i) => i.originalKB));

  const items = IMAGE_ITEMS.map((img) => {
    const optimizedKB = Math.round(img.originalKB * FORMAT_RATIO[format] * qualityFactor);
    return {
      ...img,
      beforeKB: img.originalKB,
      afterKB: optimizedKB,
    };
  });

  const totalBefore = items.reduce((s, i) => s + i.beforeKB, 0);
  const totalAfterAll = items.reduce((s, i) => s + i.afterKB, 0);
  const totalAfterInitial = items.reduce((s, i) => s + (i.lazy ? 0 : i.afterKB), 0);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Image Pipeline</div>

      {on && (
        <div className={styles.imageControls}>
          <div className={styles.yieldPresets} role="radiogroup" aria-label="Image format">
            {(["jpeg", "webp", "avif"] as ImageFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                className={styles.yieldPresetBtn}
                data-active={f === format ? "true" : undefined}
                onClick={() => setFormat(f)}
                role="radio"
                aria-checked={f === format}
                aria-label={`${FORMAT_LABELS[f]} format`}
              >
                {FORMAT_LABELS[f]}
              </button>
            ))}
          </div>
          <div className={styles.criticalSliderWrap}>
            <label className={styles.criticalSliderLabel}>
              Quality: <strong>{quality}%</strong>
            </label>
            <input
              type="range"
              min={20}
              max={100}
              step={5}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className={styles.criticalSlider}
              aria-label={`Image quality: ${quality}%`}
            />
          </div>
        </div>
      )}

      <div className={styles.imageGrid}>
        {items.map((img) => (
          <div key={img.name} className={styles.imageRow}>
            <span className={styles.imageName}>{img.name}</span>
            <div className={styles.imageBarWrap}>
              <div
                className={styles.imageBar}
                data-state={on ? "optimized" : "original"}
                style={{
                  width: `${((on ? img.afterKB : img.beforeKB) / maxOriginal) * 100}%`,
                }}
              />
            </div>
            <span className={styles.imageSize}>
              {on ? `${img.afterKB} KB` : `${img.beforeKB} KB`}
              {on && img.lazy && <span className={styles.lazyBadge}>lazy</span>}
            </span>
          </div>
        ))}
      </div>
      <p className={styles.widgetNote}>
        {on
          ? <>
              {FORMAT_LABELS[format]} @ {quality}%: initial payload <strong data-status="good">{totalAfterInitial} KB</strong> (was {totalBefore} KB).
              {format === "jpeg" && " Switch to WebP or AVIF for further savings — modern codecs compress 35-50% better."}
              {format === "webp" && " WebP has ~97% browser support. AVIF saves more but has ~92% support."}
              {format === "avif" && quality < 50 && " Quality below 50% introduces visible artifacts on detailed images — test with real content."}
            </>
          : <>Initial image payload: <strong data-status="bad">{totalBefore} KB</strong>. Enable Image Optimization to experiment with format and quality tradeoffs.</>}
      </p>
    </div>
  );
}
