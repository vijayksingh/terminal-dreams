"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION, SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { usePerfContext } from "../perf-context";
import { OPTIMIZATIONS } from "../engine/perf-simulator";
import styles from "../WebPerformanceLab.module.css";

// ── Step 1: Page load filmstrip ────────────────────────────────────

export function AppProfileView() {
  const [device, setDevice] = useState<"wifi" | "3g">("3g");
  const [playbackMs, setPlaybackMs] = useState(0);
  const [replayKey, setReplayKey] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const rafRef = useRef<number | null>(null);

  const timings = device === "wifi"
    ? { blank: 200, partial: 350, loaded: 500, interactive: 650 }
    : { blank: 1700, partial: 2400, loaded: 2900, interactive: 3500 };

  const frames = [
    { at: 0, label: "0ms", checkpoint: null, state: "blank", desc: "User clicks link" },
    { at: timings.blank, label: `${timings.blank}ms`, checkpoint: "Blank", state: "blank", desc: "Blank — waiting for JS" },
    { at: timings.partial, label: `${timings.partial}ms`, checkpoint: "FCP", state: "partial", desc: "Shell renders (FCP)" },
    { at: timings.loaded, label: `${timings.loaded}ms`, checkpoint: "LCP", state: "loaded", desc: "Hero image loads (LCP)" },
    { at: timings.interactive, label: `${timings.interactive}ms`, checkpoint: "TTI", state: "interactive", desc: "Interactive (long tasks clear)" },
  ];

  const totalMs = timings.interactive;
  // Wall-clock playback: 3G compressed to ~1.6s, Wi-Fi to ~520ms.
  const playbackDurationMs = device === "3g" ? totalMs * 0.46 : totalMs * 0.8;

  React.useEffect(() => {
    if (reducedMotion) {
      setPlaybackMs(totalMs);
      return;
    }
    setPlaybackMs(0);
    const start = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start;
      const simMs = Math.min((elapsed / playbackDurationMs) * totalMs, totalMs);
      setPlaybackMs(simMs);
      if (simMs < totalMs) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [device, replayKey, reducedMotion, totalMs, playbackDurationMs]);

  const visibleFrame = frames.reduce((acc, f, i) => (f.at <= playbackMs ? i : acc), 0);
  const progressPct = Math.min((playbackMs / totalMs) * 100, 100);
  const isComplete = playbackMs >= totalMs;

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Page Load Filmstrip</div>
      <div className={styles.deviceToggle}>
        <button
          type="button"
          className={styles.deviceBtn}
          data-active={device === "3g" ? "true" : undefined}
          onClick={() => setDevice("3g")}
        >
          3G (slow)
        </button>
        <button
          type="button"
          className={styles.deviceBtn}
          data-active={device === "wifi" ? "true" : undefined}
          onClick={() => setDevice("wifi")}
        >
          Wi-Fi (fast)
        </button>
        <button
          type="button"
          className={styles.replayBtn}
          onClick={() => setReplayKey((k) => k + 1)}
          aria-label="Replay page load"
        >
          {isComplete ? "↻ Replay" : "↻ Restart"}
        </button>
      </div>
      <div className={styles.timeProgressor} aria-label={`Page load progress: ${Math.round(playbackMs)}ms of ${totalMs}ms`}>
        <div className={styles.timeProgressorTrack}>
          <div className={styles.timeProgressorFill} style={{ width: `${progressPct}%` }} />
          {frames.filter((f) => f.checkpoint).map((f) => {
            const pct = (f.at / totalMs) * 100;
            const reached = playbackMs >= f.at;
            return (
              <div
                key={f.checkpoint}
                className={styles.timeCheckpoint}
                style={{ left: `${pct}%` }}
                data-reached={reached ? "true" : undefined}
                data-state={f.state}
              >
                <span className={styles.timeCheckpointDot} />
                <span className={styles.timeCheckpointLabel}>{f.checkpoint}</span>
                <span className={styles.timeCheckpointTime}>{f.label}</span>
              </div>
            );
          })}
        </div>
        <span className={styles.timeProgressorClock}>
          {Math.round(playbackMs)}ms / {totalMs}ms
        </span>
      </div>
      <div className={styles.filmstrip}>
        {frames.map((f, i) => (
          <div
            key={i}
            className={styles.filmFrame}
            data-state={f.state}
            data-visible={i <= visibleFrame ? "true" : undefined}
          >
            <div className={styles.filmFrameScreen} data-state={f.state}>
              {f.state !== "blank" && <div className={styles.filmNavbar} />}
              {f.state === "partial" && (
                <>
                  <div className={styles.filmSkeleton} />
                  <div className={styles.filmSkeleton} style={{ width: "60%" }} />
                  <div className={styles.filmSkeleton} style={{ width: "80%" }} />
                </>
              )}
              {(f.state === "loaded" || f.state === "interactive") && (
                <>
                  <div className={styles.filmHero} />
                  <div className={styles.filmText} />
                  <div className={styles.filmText} style={{ width: "70%" }} />
                </>
              )}
            </div>
            <span className={styles.filmFrameDesc}>{f.desc}</span>
          </div>
        ))}
      </div>
      <p className={styles.widgetNote}>
        On 3G, the user stares at a blank screen for {timings.blank}ms. The page isn't interactive until {timings.interactive}ms.
        On Wi-Fi, total load drops to {timings.interactive}ms. Each checkpoint above marks a moment the user is waiting for.
      </p>
    </div>
  );
}

// ── Step 2: Vitals overview ────────────────────────────────────────

export function VitalsOverview() {
  const { metrics } = usePerfContext();

  const vitals = [
    {
      name: "LCP",
      full: "Largest Contentful Paint",
      threshold: "≤ 2500ms",
      baseline: `${metrics.lcp}ms`,
      cause: "Slow hero image, render-blocking CSS/JS, server response time",
    },
    {
      name: "INP",
      full: "Interaction to Next Paint",
      threshold: "≤ 200ms",
      baseline: `${metrics.inp}ms`,
      cause: "Long tasks blocking the main thread during user interaction",
    },
    {
      name: "CLS",
      full: "Cumulative Layout Shift",
      threshold: "≤ 0.10",
      baseline: metrics.cls.toFixed(2),
      cause: "Images without dimensions, late-injected content, font swap",
    },
  ];

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Core Web Vitals</div>
      <div className={styles.vitalsGrid}>
        {vitals.map((v) => (
          <div key={v.name} className={styles.vitalCard}>
            <div className={styles.vitalHeader}>
              <span className={styles.vitalName}>{v.name}</span>
              <span className={styles.vitalThreshold}>{v.threshold}</span>
            </div>
            <span className={styles.vitalFull}>{v.full}</span>
            <div className={styles.vitalBaseline}>
              <span>Baseline:</span>
              <strong>{v.baseline}</strong>
            </div>
            <span className={styles.vitalCause}>{v.cause}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 3: Optimization map ───────────────────────────────────────

const OPT_TARGETS: Record<string, string[]> = {
  codeSplitting: ["LCP", "TBT"],
  criticalCSS: ["LCP", "FCP"],
  imageOptimization: ["LCP", "CLS"],
  fontLoading: ["CLS", "LCP"],
  thirdPartyDefer: ["TBT", "INP"],
  longTaskBreaking: ["INP", "TBT"],
  layoutStability: ["CLS"],
  caching: ["LCP"],
  prefetching: ["LCP"],
};

export function OptMapView() {
  const [hoveredOpt, setHoveredOpt] = useState<string | null>(null);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Optimization → Metric Map</div>
      <p className={styles.widgetNote}>
        Hover each optimization to see which Core Web Vitals it improves:
      </p>
      <div className={styles.optMapGrid}>
        {OPTIMIZATIONS.map((opt) => (
          <div
            key={opt.id}
            className={styles.optMapRow}
            onMouseEnter={() => setHoveredOpt(opt.id)}
            onMouseLeave={() => setHoveredOpt(null)}
            data-hovered={hoveredOpt === opt.id ? "true" : undefined}
          >
            <span className={styles.optMapLabel}>{opt.label}</span>
            <span className={styles.optMapDesc}>{opt.description}</span>
            <div className={styles.optMapTargets}>
              {(OPT_TARGETS[opt.id] ?? []).map((t) => (
                <span key={t} className={styles.optMapTarget} data-metric={t}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
