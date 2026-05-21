"use client";

import { useState } from "react";
import { usePerfContext } from "../perf-context";
import styles from "../WebPerformanceLab.module.css";

const CACHE_STRATEGIES = ["no-cache", "immutable", "stale-while-revalidate"] as const;
type CacheStrategyChoice = typeof CACHE_STRATEGIES[number];

const CACHE_RESOURCES = [
  { resource: "HTML", correct: "no-cache" as CacheStrategyChoice, ttl: "0s", reason: "Must revalidate — content changes on deploy" },
  { resource: "JS/CSS", correct: "immutable" as CacheStrategyChoice, ttl: "1 year", reason: "Content-hashed filenames never change" },
  { resource: "Images", correct: "stale-while-revalidate" as CacheStrategyChoice, ttl: "30 days", reason: "Serve stale, refresh in background" },
  { resource: "Fonts", correct: "immutable" as CacheStrategyChoice, ttl: "1 year", reason: "Versioned in CSS, never changes" },
  { resource: "API data", correct: "stale-while-revalidate" as CacheStrategyChoice, ttl: "5 min", reason: "Fresh enough for reads, update async" },
];

export function CachingWidget() {
  const { enabledOptimizations, visitType, activeProfile: nw } = usePerfContext();
  const on = enabledOptimizations.has("caching");
  const [phase, setPhase] = useState<"problem" | "exercise" | "result">("problem");
  const [assignments, setAssignments] = useState<Record<string, CacheStrategyChoice>>({});

  const allAssigned = CACHE_RESOURCES.every((r) => assignments[r.resource]);
  const correctCount = CACHE_RESOURCES.filter((r) => assignments[r.resource] === r.correct).length;
  const allCorrect = correctCount === CACHE_RESOURCES.length;

  const handleAssign = (resource: string, strategy: CacheStrategyChoice) => {
    if (phase === "result") return;
    setAssignments((prev) => ({ ...prev, [resource]: strategy }));
  };

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

      {phase === "problem" && (
        <>
          <p className={styles.widgetNote}>
            A returning user visits the same page. Without cache headers, every resource re-downloads over the network:
          </p>
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
              Total: {uncachedTotal}ms — every byte re-downloaded.
              {cachedTotal < uncachedTotal && (
                <span className={styles.uncachedSavings}> With caching: ~{cachedTotal}ms ({Math.round((1 - cachedTotal / uncachedTotal) * 100)}% faster)</span>
              )}
            </div>
          </div>
          <button type="button" className={styles.cacheSubmitButton} onClick={() => setPhase("exercise")}>
            Fix this — assign cache strategies
          </button>
        </>
      )}

      {phase === "exercise" && (
        <>
          <div className={styles.cacheDecisionCards}>
            <div className={styles.cacheDecisionCard}>
              <span className={styles.cacheDecisionQ}>Q1</span>
              <span>Does the URL change between deploys?</span>
              <span className={styles.cacheDecisionAnswer}>Yes → <strong>no-cache</strong> (revalidate)</span>
            </div>
            <div className={styles.cacheDecisionCard}>
              <span className={styles.cacheDecisionQ}>Q2</span>
              <span>Is the URL content-hashed?</span>
              <span className={styles.cacheDecisionAnswer}>Yes → <strong>immutable</strong> (cache forever)</span>
            </div>
            <div className={styles.cacheDecisionCard}>
              <span className={styles.cacheDecisionQ}>else</span>
              <span>Neither?</span>
              <span className={styles.cacheDecisionAnswer}><strong>stale-while-revalidate</strong></span>
            </div>
          </div>
          <p className={styles.widgetNote} style={{ marginTop: "var(--space-1)" }}>
            Apply the decision tree above to assign each resource its cache strategy:
          </p>
          <div className={styles.cacheMatchGrid}>
            <div className={styles.cacheMatchHeader}>
              <span>Resource</span>
              {CACHE_STRATEGIES.map((s) => (
                <span key={s} className={styles.cacheMatchStrategyLabel}>{s}</span>
              ))}
            </div>
            {CACHE_RESOURCES.map((r) => (
              <div key={r.resource} className={styles.cacheMatchRow}>
                <span className={styles.cacheResource}>{r.resource}</span>
                {CACHE_STRATEGIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={styles.cacheMatchCell}
                    data-selected={assignments[r.resource] === s ? "true" : undefined}
                    onClick={() => handleAssign(r.resource, s)}
                    aria-pressed={assignments[r.resource] === s}
                  />
                ))}
              </div>
            ))}
          </div>
          {allAssigned && (
            <button
              type="button"
              className={styles.cacheSubmitButton}
              onClick={() => setPhase("result")}
            >
              Check answers
            </button>
          )}
        </>
      )}

      {phase === "result" && (
        <>
          <div className={styles.predictionResult} data-correct={allCorrect ? "true" : undefined}>
            <span className={styles.predictionResultIcon}>{allCorrect ? "✓" : "✗"}</span>
            <span>
              {allCorrect
                ? "Perfect — you matched every resource to its ideal cache strategy."
                : `${correctCount}/${CACHE_RESOURCES.length} correct. See corrections below.`}
            </span>
          </div>
          <div className={styles.cacheGrid}>
            <div className={styles.cacheHeaderRow}>
              <span>Resource</span>
              <span>Strategy</span>
              <span>TTL</span>
            </div>
            {CACHE_RESOURCES.map((r) => {
              const userPick = assignments[r.resource];
              const isCorrect = userPick === r.correct;
              return (
                <div key={r.resource} className={styles.cacheRow} data-state={on ? "active" : "inactive"}>
                  <span className={styles.cacheResource}>{r.resource}</span>
                  <span className={styles.cacheStrategy}>
                    {!isCorrect && <span className={styles.cacheWrong}>{userPick} → </span>}
                    {r.correct}
                  </span>
                  <span className={styles.cacheTTL}>{r.ttl}</span>
                </div>
              );
            })}
          </div>
          <p className={styles.widgetNote}>
            {on && visitType === "repeat"
              ? "Repeat visit: most resources served from cache — near-instant load. Toggle 'First visit' above to compare."
              : on
              ? "Cache headers configured. Switch to 'Repeat visit' above to see the cached waterfall."
              : "Now toggle Caching Strategy above to apply these headers and watch the waterfall shrink."}
          </p>
        </>
      )}
    </div>
  );
}
