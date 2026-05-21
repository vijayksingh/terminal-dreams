"use client";

import { usePerfContext } from "../perf-context";
import type { FontDisplayStrategy } from "../engine/perf-simulator";
import styles from "../WebPerformanceLab.module.css";

const STRATEGY_LABELS: Record<FontDisplayStrategy, string> = {
  block: "block",
  swap: "swap",
  fallback: "fallback",
  optional: "optional",
};

const STRATEGY_INFO: Record<FontDisplayStrategy, { foit: string; cls: string; description: string }> = {
  block: { foit: "3s max", cls: "High if late", description: "Invisible text for up to 3s, then fallback. Swap causes CLS." },
  swap: { foit: "None", cls: "Always shifts", description: "Fallback immediately visible, swaps when font loads. Always causes CLS." },
  fallback: { foit: "~100ms", cls: "Low", description: "Brief invisible period, then fallback. Only swaps if font loads within ~100ms." },
  optional: { foit: "~100ms", cls: "Zero", description: "Brief invisible period, then fallback forever. Font cached for next page load." },
};

export function FontWidget() {
  const { enabledOptimizations, activeProfile: nw, optParams, updateOptParam } = usePerfContext();
  const on = enabledOptimizations.has("fontLoading");
  const rtt = nw.rtt;
  const multiplier = nw.multiplier;
  const strategy = optParams.fontStrategy;
  const setStrategy = (v: FontDisplayStrategy) => updateOptParam("fontStrategy", v);

  const cssDownload = Math.round(48 * multiplier + rtt);
  const cssParse = 8;
  const fontDiscover = cssDownload + cssParse;
  const fontDownloadBefore = Math.round(82 * multiplier + rtt);
  const fontDownloadAfter = Math.round(28 * multiplier + rtt);
  const foitEnd = fontDiscover + fontDownloadBefore;

  const beforeSteps = [
    { label: "CSS download", ms: cssDownload, type: "wait" },
    { label: "CSS parse", ms: cssParse, type: "wait" },
    { label: "FOIT (invisible text)", ms: fontDownloadBefore, type: "foit" },
    { label: "Font swap (+0.11 CLS)", ms: 0, type: "marker" },
  ];

  const afterSteps = [
    { label: "Preload + CSS (parallel)", ms: Math.max(cssDownload, fontDownloadAfter), type: "parallel" },
    { label: "Text visible (no shift)", ms: 0, type: "good-marker" },
  ];

  const info = STRATEGY_INFO[strategy];

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Font Loading Timeline</div>
      <div className={styles.pipelineTimelines}>
        <div className={styles.pipelineRow}>
          <span className={styles.pipelineRowLabel}>Before</span>
          <div className={styles.pipelineTrack}>
            {beforeSteps.map((s, i) => s.type === "marker" ? (
              <div key={i} className={styles.pipelineMarker} data-state={on ? "inactive" : "active"}>
                <span>Swap @ {foitEnd}ms</span>
              </div>
            ) : (
              <div
                key={i}
                className={styles.pipelineBlock}
                data-type={s.type === "foit" ? "blocking" : "html"}
                data-state={on ? "inactive" : "active"}
                style={{ flex: s.ms }}
              >
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.pipelineRow}>
          <span className={styles.pipelineRowLabel}>After</span>
          <div className={styles.pipelineTrack}>
            {afterSteps.map((s, i) => s.type === "good-marker" ? (
              <div key={i} className={styles.pipelineMarker} data-type="early" data-state={on ? "active" : "inactive"}>
                <span>Ready @ {Math.max(cssDownload, fontDownloadAfter)}ms</span>
              </div>
            ) : (
              <div
                key={i}
                className={styles.pipelineBlock}
                data-type="async"
                data-state={on ? "active" : "inactive"}
                style={{ flex: s.ms }}
              >
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {on && (
        <div className={styles.fontStrategyWrap}>
          <label className={styles.criticalSliderLabel}>font-display strategy:</label>
          <div className={styles.yieldPresets} role="radiogroup" aria-label="font-display strategy">
            {(["block", "swap", "fallback", "optional"] as FontDisplayStrategy[]).map((s) => (
              <button
                key={s}
                type="button"
                className={styles.yieldPresetBtn}
                data-active={s === strategy ? "true" : undefined}
                onClick={() => setStrategy(s)}
                role="radio"
                aria-checked={s === strategy}
              >
                {STRATEGY_LABELS[s]}
              </button>
            ))}
          </div>
          <p className={styles.widgetNote}>{info.description}</p>
        </div>
      )}

      <div className={styles.fontMetrics}>
        <div className={styles.fontMetricItem}>
          <span className={styles.fontMetricLabel}>Font size</span>
          <span className={styles.fontMetricValue} data-state={on ? "good" : "bad"}>
            {on ? "28 KB (subset)" : "82 KB (full)"}
          </span>
        </div>
        <div className={styles.fontMetricItem}>
          <span className={styles.fontMetricLabel}>FOIT</span>
          <span className={styles.fontMetricValue} data-state={on ? "good" : "bad"}>
            {on ? info.foit : `${fontDownloadBefore}ms`}
          </span>
        </div>
        <div className={styles.fontMetricItem}>
          <span className={styles.fontMetricLabel}>CLS impact</span>
          <span className={styles.fontMetricValue} data-state={on ? "good" : "bad"}>
            {on ? info.cls : "+0.11 (font swap)"}
          </span>
        </div>
      </div>
    </div>
  );
}
