"use client";

import { usePerfContext } from "../perf-context";
import styles from "../WebPerformanceLab.module.css";

const CACHE_RESOURCES = [
  { resource: "HTML", strategy: "no-cache", ttl: "0s" },
  { resource: "JS/CSS", strategy: "immutable", ttl: "1 year" },
  { resource: "Images", strategy: "stale-while-revalidate", ttl: "30 days" },
  { resource: "Fonts", strategy: "immutable", ttl: "1 year" },
  { resource: "API data", strategy: "stale-while-revalidate", ttl: "5 min" },
];

export function CachingWidget() {
  const { enabledOptimizations, visitType, activeProfile: nw } = usePerfContext();
  const on = enabledOptimizations.has("caching");

  const uncachedResources = [
    { name: "HTML", size: 12, ms: Math.round(12 * nw.multiplier + nw.rtt) },
    { name: "styles.css", size: 48, ms: Math.round(48 * nw.multiplier + nw.rtt) },
    { name: "app.js", size: 180, ms: Math.round(180 * nw.multiplier + nw.rtt) },
    { name: "hero.jpg", size: 245, ms: Math.round(245 * nw.multiplier + nw.rtt) },
    { name: "font.woff2", size: 32, ms: Math.round(32 * nw.multiplier + nw.rtt) },
    { name: "api/data", size: 8, ms: Math.round(8 * nw.multiplier + nw.rtt * 2) },
  ];
  const uncachedTotal = uncachedResources.reduce((s, r) => s + r.ms, 0);
  const cachedTotal = Math.round(12 * nw.multiplier + nw.rtt + 25);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Cache Strategy Matrix</div>

      <div className={styles.uncachedWaterfall}>
        {uncachedResources.map((r) => (
          <div key={r.name} className={styles.uncachedRow}>
            <span className={styles.uncachedLabel}>{r.name}</span>
            <div className={styles.uncachedBar} style={{ width: `${Math.max((r.ms / uncachedTotal) * 100, 8)}%` }}>
              <span>{r.size} KB · {r.ms}ms</span>
            </div>
          </div>
        ))}
        <div className={styles.uncachedTotal}>
          {on && visitType === "repeat"
            ? `Cached: ~${cachedTotal}ms — ${Math.round((1 - cachedTotal / uncachedTotal) * 100)}% faster than uncached`
            : `Total: ${uncachedTotal}ms — every byte re-downloaded`}
        </div>
      </div>

      <div className={styles.cacheGrid}>
        <div className={styles.cacheHeaderRow}>
          <span>Resource</span>
          <span>Strategy</span>
          <span>TTL</span>
        </div>
        {CACHE_RESOURCES.map((r) => (
          <div key={r.resource} className={styles.cacheRow} data-state={on ? "active" : "inactive"}>
            <span className={styles.cacheResource}>{r.resource}</span>
            <span className={styles.cacheStrategy}>{r.strategy}</span>
            <span className={styles.cacheTTL}>{r.ttl}</span>
          </div>
        ))}
      </div>

      <p className={styles.widgetNote}>
        {on && visitType === "repeat"
          ? "Repeat visit: most resources served from cache — near-instant load. Toggle 'First visit' to compare."
          : on
          ? "Cache headers configured. Switch to 'Repeat visit' to see the cached waterfall."
          : "Without cache headers, every resource re-downloads on each visit. Toggle Caching above."}
      </p>
    </div>
  );
}
