"use client";

import { useState } from "react";
import { usePerfContext } from "../perf-context";
import styles from "../WebPerformanceLab.module.css";

// ── Font metric exercise ───────────────────────────────────────────

const FONT_DESCRIPTORS = [
  { property: "size-adjust", correct: "107%", hint: "Scales the fallback to match web font's overall glyph size" },
  { property: "ascent-override", correct: "90%", hint: "Matches the height above the baseline" },
  { property: "descent-override", correct: "22%", hint: "Matches the depth below the baseline" },
];
const FONT_VALUES = ["107%", "90%", "22%"];

function FontMetricExercise() {
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);

  const allPicked = FONT_DESCRIPTORS.every((d) => picks[d.property]);
  const allCorrect = FONT_DESCRIPTORS.every((d) => picks[d.property] === d.correct);

  return (
    <div className={styles.widgetExercise}>
      <p className={styles.widgetNote}>Match each @font-face descriptor to its value:</p>
      <div className={styles.codeFillPre}>
        <code>{"@font-face {\n"}</code>
        {FONT_DESCRIPTORS.map((d) => (
          <div key={d.property} style={{ paddingLeft: "1.5em" }}>
            <code>{d.property}: </code>
            {checked ? (
              <span
                className={styles.codeFillSelect}
                data-status={picks[d.property] === d.correct ? "correct" : "wrong"}
              >
                {picks[d.property] || "—"}{picks[d.property] !== d.correct ? ` → ${d.correct}` : ""}
              </span>
            ) : (
              <select
                className={styles.codeFillSelect}
                value={picks[d.property] || ""}
                onChange={(e) => setPicks((p) => ({ ...p, [d.property]: e.target.value }))}
              >
                <option value="">—</option>
                {FONT_VALUES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            )}
            <code>;</code>
          </div>
        ))}
        <code>{"}"}</code>
      </div>
      {!checked && allPicked && (
        <button type="button" className={styles.cacheSubmitButton} onClick={() => setChecked(true)}>
          Check values
        </button>
      )}
      {checked && (
        <div className={styles.predictionResult} data-correct={allCorrect ? "true" : undefined}>
          <span className={styles.predictionResultIcon}>{allCorrect ? "✓" : "✗"}</span>
          <span>
            {allCorrect
              ? "All correct — these overrides make the fallback font occupy identical space as the web font, eliminating CLS during the swap."
              : "See corrections above. size-adjust scales the overall glyph box, ascent-override sets the height above baseline, descent-override sets depth below."}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Font widget ────────────────────────────────────────────────────

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
      <FontMetricExercise />
    </div>
  );
}
