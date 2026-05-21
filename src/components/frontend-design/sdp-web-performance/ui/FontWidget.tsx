"use client";

import { usePerfContext } from "../perf-context";
import styles from "../WebPerformanceLab.module.css";

export function FontWidget() {
  const { enabledOptimizations, activeProfile: nw } = usePerfContext();
  const on = enabledOptimizations.has("fontLoading");
  const rtt = nw.rtt;
  const multiplier = nw.multiplier;

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
      <div className={styles.fontMetrics}>
        <div className={styles.fontMetricItem}>
          <span className={styles.fontMetricLabel}>Font size</span>
          <span className={styles.fontMetricValue} data-state={on ? "good" : "bad"}>
            {on ? "28 KB (subset)" : "82 KB (full)"}
          </span>
        </div>
        <div className={styles.fontMetricItem}>
          <span className={styles.fontMetricLabel}>Discovery</span>
          <span className={styles.fontMetricValue} data-state={on ? "good" : "bad"}>
            {on ? "Preloaded in <head>" : `After CSS parse (${fontDiscover}ms)`}
          </span>
        </div>
        <div className={styles.fontMetricItem}>
          <span className={styles.fontMetricLabel}>CLS impact</span>
          <span className={styles.fontMetricValue} data-state={on ? "good" : "bad"}>
            {on ? "~0 (metric overrides)" : "+0.11 (font swap)"}
          </span>
        </div>
      </div>
    </div>
  );
}
