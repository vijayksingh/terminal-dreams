"use client";

import { usePerfContext } from "../perf-context";
import styles from "../WebPerformanceLab.module.css";

const IMAGE_ITEMS = [
  { name: "hero", before: 245, after: 65, lazy: false },
  { name: "card-1", before: 95, after: 33, lazy: true },
  { name: "card-2", before: 110, after: 39, lazy: true },
  { name: "banner", before: 88, after: 31, lazy: true },
];

export function ImageOptWidget() {
  const { enabledOptimizations } = usePerfContext();
  const on = enabledOptimizations.has("imageOptimization");

  const totalBefore = IMAGE_ITEMS.reduce((s, i) => s + i.before, 0);
  const totalAfter = IMAGE_ITEMS.reduce((s, i) => s + (i.lazy ? 0 : i.after), 0);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Image Pipeline</div>

      <div className={styles.imageGrid}>
        {IMAGE_ITEMS.map((img) => (
          <div key={img.name} className={styles.imageRow}>
            <span className={styles.imageName}>{img.name}</span>
            <div className={styles.imageBarWrap}>
              <div
                className={styles.imageBar}
                data-state={on ? "optimized" : "original"}
                style={{
                  width: `${((on ? img.after : img.before) / 245) * 100}%`,
                }}
              />
            </div>
            <span className={styles.imageSize}>
              {on ? `${img.after} KB` : `${img.before} KB`}
              {on && img.lazy && <span className={styles.lazyBadge}>lazy</span>}
            </span>
          </div>
        ))}
      </div>
      <div className={styles.imageSavings}>
        Initial image payload: <strong data-status={on ? "good" : "bad"}>
          {on ? `${totalAfter} KB` : `${totalBefore} KB`}
        </strong>
        {on && ` (saved ${totalBefore - totalAfter} KB — below-fold deferred)`}
      </div>
    </div>
  );
}
