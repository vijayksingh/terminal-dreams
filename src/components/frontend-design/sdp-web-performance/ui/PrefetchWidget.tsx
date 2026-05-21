"use client";

import { useState, useRef, useEffect } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { usePerfContext } from "../perf-context";
import styles from "../WebPerformanceLab.module.css";

const ROUTE_LINKS = [
  { path: "/products", clicks: 62, correct: true },
  { path: "/cart", clicks: 38, correct: true },
  { path: "/about", clicks: 4, correct: false },
  { path: "/blog/archive", clicks: 2, correct: false },
  { path: "/account/settings", clicks: 28, correct: true },
  { path: "/terms-of-service", clicks: 1, correct: false },
];

type PrefetchLinkState = {
  prefetchProgress: number;
  navigating: boolean;
  navTime: number | null;
};

export function PrefetchWidget() {
  const { enabledOptimizations, activeProfile: nw } = usePerfContext();
  const on = enabledOptimizations.has("prefetching");
  const hasCodeSplitting = enabledOptimizations.has("codeSplitting");
  const rm = usePrefersReducedMotion();

  const prefetchDurationMs = Math.round(75 * nw.multiplier + nw.rtt * 2);
  const coldNavMs = Math.round(nw.rtt * 2.6 + 75 * nw.multiplier + 20 * nw.multiplier + nw.rtt * 2 + 45);
  const renderOnlyMs = 50;

  const [linkStates, setLinkStates] = useState<Record<string, PrefetchLinkState>>({});
  const [attempts, setAttempts] = useState<{ path: string; hovered: boolean; prefetchPct: number; navTime: number }[]>([]);
  const intervalRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const navTimerRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    return () => {
      Object.values(intervalRefs.current).forEach(clearInterval);
      Object.values(navTimerRefs.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (!on) {
      Object.values(intervalRefs.current).forEach(clearInterval);
      intervalRefs.current = {};
    }
  }, [on]);

  const startPrefetch = (path: string) => {
    if (!on || linkStates[path]?.navigating) return;
    if (intervalRefs.current[path]) clearInterval(intervalRefs.current[path]);

    setLinkStates((prev) => ({
      ...prev,
      [path]: { ...prev[path], prefetchProgress: prev[path]?.prefetchProgress ?? 0, navigating: false, navTime: null },
    }));

    const tickMs = 50;
    const increment = (tickMs / prefetchDurationMs) * 100;
    intervalRefs.current[path] = setInterval(() => {
      setLinkStates((prev) => {
        const cur = prev[path]?.prefetchProgress ?? 0;
        if (cur >= 100) {
          clearInterval(intervalRefs.current[path]);
          return prev;
        }
        return { ...prev, [path]: { ...prev[path], prefetchProgress: Math.min(cur + increment, 100), navigating: false, navTime: null } };
      });
    }, tickMs);
  };

  const stopPrefetch = (path: string) => {
    if (intervalRefs.current[path]) {
      clearInterval(intervalRefs.current[path]);
      delete intervalRefs.current[path];
    }
  };

  const navigate = (path: string) => {
    if (linkStates[path]?.navigating) return;
    stopPrefetch(path);
    const progress = linkStates[path]?.prefetchProgress ?? 0;
    const remainingFrac = Math.max(0, 1 - progress / 100);
    const navTime = Math.round(remainingFrac * coldNavMs + renderOnlyMs);

    setLinkStates((prev) => ({
      ...prev,
      [path]: { ...prev[path], prefetchProgress: progress, navigating: true, navTime: null },
    }));

    const displayDelay = rm ? 50 : Math.min(navTime * 0.6, 1200);
    navTimerRefs.current[path] = setTimeout(() => {
      setLinkStates((prev) => ({
        ...prev,
        [path]: { ...prev[path], navigating: false, navTime },
      }));
      setAttempts((prev) => [...prev, { path, hovered: on, prefetchPct: Math.round(progress), navTime }]);
    }, displayDelay);
  };

  const resetAll = () => {
    Object.values(intervalRefs.current).forEach(clearInterval);
    Object.values(navTimerRefs.current).forEach(clearTimeout);
    intervalRefs.current = {};
    navTimerRefs.current = {};
    setLinkStates({});
    setAttempts([]);
  };

  const bestAttempt = attempts.length > 0 ? Math.min(...attempts.map((a) => a.navTime)) : null;
  const worstAttempt = attempts.length > 0 ? Math.max(...attempts.map((a) => a.navTime)) : null;

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Hover-to-Prefetch Simulation</div>
      <p className={styles.widgetNote}>
        {on && !hasCodeSplitting
          ? "Prefetching needs route chunks to prefetch — enable Code Splitting first so the bundle has separate chunks to load ahead of time."
          : on
          ? "Hover a link to start prefetching its route chunk. Click to navigate — timing depends on how much loaded before you clicked."
          : "Toggle Prefetching above to enable hover-triggered prefetch. Then try clicking links below."}
      </p>

      <div className={styles.prefetchLinkGrid}>
        {ROUTE_LINKS.map((l) => {
          const st = linkStates[l.path];
          const progress = st?.prefetchProgress ?? 0;
          const navigating = st?.navigating ?? false;
          const navTime = st?.navTime;

          return (
            <button
              key={l.path}
              type="button"
              className={styles.prefetchSimBtn}
              data-navigating={navigating ? "true" : undefined}
              data-done={navTime != null ? "true" : undefined}
              onMouseEnter={() => startPrefetch(l.path)}
              onMouseLeave={() => stopPrefetch(l.path)}
              onFocus={() => startPrefetch(l.path)}
              onBlur={() => stopPrefetch(l.path)}
              onClick={() => navigate(l.path)}
              disabled={navigating}
            >
              <span className={styles.prefetchLinkPath}>{l.path}</span>
              <span className={styles.prefetchLinkClicks}>{l.clicks}% of clicks</span>
              {on && progress > 0 && navTime == null && (
                <div className={styles.prefetchProgressTrack}>
                  <div
                    className={styles.prefetchProgressFill}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                    data-complete={progress >= 100 ? "true" : undefined}
                  />
                </div>
              )}
              {navigating && <span className={styles.prefetchNavSpinner}>loading…</span>}
              {navTime != null && (
                <span className={styles.prefetchNavResult} data-fast={navTime <= renderOnlyMs + 30 ? "true" : undefined}>
                  {navTime}ms
                </span>
              )}
            </button>
          );
        })}
      </div>

      {attempts.length > 0 && (
        <div className={styles.prefetchAttemptLog}>
          <div className={styles.prefetchAttemptHeader}>
            <span>Navigation log</span>
            <button type="button" className={styles.prefetchResetBtn} onClick={resetAll}>Reset</button>
          </div>
          {attempts.map((a, i) => (
            <div key={i} className={styles.prefetchAttemptRow}>
              <span className={styles.prefetchAttemptPath}>{a.path}</span>
              <span className={styles.prefetchAttemptPct}>{a.prefetchPct}% prefetched</span>
              <span
                className={styles.prefetchAttemptTime}
                data-fast={a.navTime <= renderOnlyMs + 30 ? "true" : undefined}
              >
                {a.navTime}ms
              </span>
            </div>
          ))}
          {bestAttempt != null && worstAttempt != null && worstAttempt > bestAttempt && (
            <p className={styles.widgetNote}>
              Best: {bestAttempt}ms vs worst: {worstAttempt}ms — {Math.round((1 - bestAttempt / worstAttempt) * 100)}% faster with a complete prefetch.
            </p>
          )}
        </div>
      )}

      <div className={styles.prefetchPipeline}>
        {[
          { stage: "1", label: "Viewport links", desc: "IntersectionObserver detects visible <a> tags" },
          { stage: "2", label: "Route prediction", desc: "Hover/focus triggers prefetch of route chunk" },
          { stage: "3", label: "Speculation Rules", desc: "Browser speculatively prerenders top candidates (Chrome 121+)" },
        ].map((step) => (
          <div key={step.stage} className={styles.prefetchStep} data-state={on ? "active" : "inactive"}>
            <span className={styles.prefetchBadge}>{step.stage}</span>
            <div>
              <span className={styles.prefetchStepTitle}>{step.label}</span>
              <span className={styles.prefetchStepDesc}>{step.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
