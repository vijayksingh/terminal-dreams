"use client";

import { usePerfContext } from "../perf-context";
import styles from "../WebPerformanceLab.module.css";

export function CriticalCSSWidget() {
  const { enabledOptimizations, activeProfile: nw, optParams, updateOptParam } = usePerfContext();
  const on = enabledOptimizations.has("criticalCSS");
  const rtt = nw.rtt;
  const multiplier = nw.multiplier;
  const inlineKB = optParams.criticalCssKB;
  const setInlineKB = (v: number) => updateOptParam("criticalCssKB", v);

  const totalCSS = 48;
  const htmlParse = 15;
  const cssDownload = Math.round(totalCSS * multiplier + rtt);
  const cssParse = 8;
  const criticalInline = Math.round(inlineKB * 0.8);
  const asyncKB = totalCSS - inlineKB;
  const asyncCssDownload = Math.round(asyncKB * multiplier + rtt);
  const fcpBefore = htmlParse + cssDownload + cssParse;
  const fcpAfter = htmlParse + criticalInline;
  const fouc = inlineKB < 3;

  const beforeSteps = [
    { label: "HTML parse", ms: htmlParse, type: "html" },
    { label: `styles.css (${totalCSS} KB)`, ms: cssDownload, type: "blocking" },
    { label: "CSS parse", ms: cssParse, type: "blocking" },
    { label: "FCP", ms: 0, type: "marker" },
  ];

  const afterSteps = [
    { label: `HTML + ${inlineKB} KB inline`, ms: htmlParse + criticalInline, type: "html" },
    { label: "FCP", ms: 0, type: "marker" },
    { label: `async CSS (${asyncKB} KB)`, ms: asyncCssDownload, type: "async" },
  ];

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Rendering Pipeline</div>

      <div className={styles.criticalSliderWrap}>
        <label className={styles.criticalSliderLabel}>
          Inline CSS: <strong>{inlineKB} KB</strong> / {totalCSS} KB
          {fouc && <span className={styles.criticalFouc}> FOUC risk</span>}
          {inlineKB > 14 && <span className={styles.criticalBloat}> HTML bloat</span>}
        </label>
        <input
          type="range"
          min={0}
          max={20}
          step={1}
          value={inlineKB}
          onChange={(e) => setInlineKB(Number(e.target.value))}
          className={styles.criticalSlider}
          aria-label={`Inline CSS size: ${inlineKB} KB`}
        />
        <div className={styles.criticalSliderTicks}>
          <span>0 KB</span>
          <span className={styles.criticalSliderSweet}>~4 KB sweet spot</span>
          <span>20 KB</span>
        </div>
      </div>

      <div className={styles.pipelineTimelines}>
        <div className={styles.pipelineRow}>
          <span className={styles.pipelineRowLabel}>Before</span>
          <div className={styles.pipelineTrack}>
            {beforeSteps.map((s, i) => s.type === "marker" ? (
              <div key={i} className={styles.pipelineMarker} data-state={on ? "inactive" : "active"}>
                <span>FCP @ {fcpBefore}ms</span>
              </div>
            ) : (
              <div
                key={i}
                className={styles.pipelineBlock}
                data-type={s.type}
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
            {afterSteps.map((s, i) => s.type === "marker" ? (
              <div key={i} className={styles.pipelineMarker} data-type="early" data-state="active">
                <span>FCP @ {fcpAfter}ms{fouc ? " ⚠" : ""}</span>
              </div>
            ) : (
              <div
                key={i}
                className={styles.pipelineBlock}
                data-type={s.type}
                data-state="active"
                style={{ flex: s.ms }}
              >
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.pipelineSaving} data-state="active">
        FCP: {fcpBefore}ms → {fcpAfter}ms (saved {fcpBefore - fcpAfter}ms)
      </div>
      <p className={styles.widgetNote}>
        {fouc
          ? `Only ${inlineKB} KB inline — above-fold content will render unstyled (FOUC). Increase to ~4 KB to cover the critical rendering path.`
          : inlineKB > 14
          ? `${inlineKB} KB of inline CSS bloats the HTML document. The savings diminish past ~4 KB because extra inline CSS rarely covers more critical-path rules.`
          : on
          ? `${inlineKB} KB critical CSS inlined — browser paints at ${fcpAfter}ms. Async CSS (${asyncKB} KB) loads without blocking.`
          : `The full ${totalCSS} KB stylesheet blocks rendering for ~${cssDownload}ms on ${nw.label}. Drag the slider to find the optimal inline threshold.`}
      </p>
    </div>
  );
}
