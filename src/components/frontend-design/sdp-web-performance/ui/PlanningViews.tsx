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
  const [visibleFrame, setVisibleFrame] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timings = device === "wifi"
    ? { blank: 200, partial: 350, loaded: 500, interactive: 650 }
    : { blank: 1700, partial: 2400, loaded: 2900, interactive: 3500 };

  const frames = [
    { at: 0, label: "Navigation", state: "blank", desc: "User clicks link" },
    { at: timings.blank, label: `${timings.blank}ms`, state: "blank", desc: "Blank — waiting for JS" },
    { at: timings.partial, label: `${timings.partial}ms`, state: "partial", desc: "Shell renders (FCP)" },
    { at: timings.loaded, label: `${timings.loaded}ms`, state: "loaded", desc: "Hero image loads (LCP)" },
    { at: timings.interactive, label: `${timings.interactive}ms`, state: "interactive", desc: "Interactive (long tasks clear)" },
  ];

  React.useEffect(() => {
    setVisibleFrame(0);
    let current = 0;
    const advance = () => {
      if (current >= frames.length - 1) return;
      current++;
      const delay = device === "3g"
        ? (frames[current].at - frames[current - 1].at) * 0.4
        : (frames[current].at - frames[current - 1].at) * 0.8;
      timerRef.current = setTimeout(() => {
        setVisibleFrame(current);
        advance();
      }, delay);
    };
    advance();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [device]);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Page Load Filmstrip</div>
      <div className={styles.deviceToggle}>
        <button
          type="button"
          className={styles.deviceButton}
          data-active={device === "3g" ? "true" : undefined}
          onClick={() => setDevice("3g")}
        >
          3G (slow)
        </button>
        <button
          type="button"
          className={styles.deviceButton}
          data-active={device === "wifi" ? "true" : undefined}
          onClick={() => setDevice("wifi")}
        >
          Wi-Fi (fast)
        </button>
      </div>
      <div className={styles.filmstrip}>
        {frames.map((f, i) => (
          <div
            key={i}
            className={styles.filmFrame}
            data-state={f.state}
            data-visible={i <= visibleFrame ? "true" : undefined}
          >
            <span className={styles.filmFrameTime}>{f.label}</span>
            <div className={styles.filmFrameScreen} data-state={f.state} />
            <span className={styles.filmFrameDesc}>{f.desc}</span>
          </div>
        ))}
      </div>
      <p className={styles.widgetNote}>
        On 3G, the user stares at a blank screen for {timings.blank}ms. The page isn't interactive until {timings.interactive}ms.
        On Wi-Fi, total load drops to {timings.interactive}ms. Each frame is a moment the user is waiting.
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
