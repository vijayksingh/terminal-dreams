"use client";

import { useAssetsPerf } from "../assets-perf-context";
import {
  VIDEO_CODE_SAMPLES,
  VIDEO_OPTIONS,
  type VideoStrategy,
} from "../engine/video-strategy-engine";
import styles from "../OtherAssetsPerfLab.module.css";

const VIDEO_KEYS: VideoStrategy[] = ["eager-mp4", "poster-lazy", "youtube-facade"];

export function VideoStrategyBoard() {
  const { fold, setFold, bestVideo } = useAssetsPerf();

  return (
    <div className={styles.zonePane}>
      <header className={styles.paneHeader}>
        <span className={styles.paneLabel}>Cost-per-strategy</span>
        <span className={styles.paneSub}>
          Toggle the fold position to see how the right answer flips.
        </span>
      </header>

      <div className={styles.foldToggleRow}>
        <div className={styles.foldToggle} role="radiogroup" aria-label="Fold position">
          {(["above", "below"] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={styles.foldToggleBtn}
              data-active={fold === f ? "true" : undefined}
              onClick={() => setFold(f)}
              role="radio"
              aria-checked={fold === f}
            >
              {f === "above" ? "Above the fold" : "Below the fold"}
            </button>
          ))}
        </div>
        <span className={styles.videoBoardHeaderHint}>
          {fold === "above"
            ? "above fold — LCP-sensitive"
            : "below fold — fetched on scroll/click"}
        </span>
      </div>

      <div className={styles.videoOptionsGrid}>
        {VIDEO_KEYS.map((id) => {
          const opt = VIDEO_OPTIONS[id];
          const isBest = id === bestVideo;
          return (
            <article
              key={id}
              className={styles.videoOptionCard}
              data-best={isBest ? "true" : undefined}
            >
              <header className={styles.videoOptionHead}>
                <span className={styles.videoOptionTag}>{opt.shortLabel}</span>
                {isBest && (
                  <span className={styles.videoOptionBadge}>
                    best for {fold === "above" ? "above" : "below"}
                  </span>
                )}
              </header>
              <dl className={styles.videoMetricGrid}>
                <div className={styles.videoMetric}>
                  <dt>Initial</dt>
                  <dd data-status={opt.initialKB < 100 ? "good" : opt.initialKB < 1000 ? "ok" : "bad"}>
                    {opt.initialKB >= 1000
                      ? `${(opt.initialKB / 1000).toFixed(1)} MB`
                      : `${opt.initialKB} KB`}
                  </dd>
                </div>
                <div className={styles.videoMetric}>
                  <dt>LCP delta</dt>
                  <dd data-status={opt.lcpDeltaMs === 0 ? "good" : opt.lcpDeltaMs < 500 ? "ok" : "bad"}>
                    {opt.lcpDeltaMs > 0 ? `+${opt.lcpDeltaMs}ms` : "0ms"}
                  </dd>
                </div>
                <div className={styles.videoMetric}>
                  <dt>On click</dt>
                  <dd data-status={opt.interactionDelayMs < 300 ? "good" : opt.interactionDelayMs < 1500 ? "ok" : "bad"}>
                    {opt.interactionDelayMs}ms
                  </dd>
                </div>
              </dl>
              <p className={styles.videoOptionTradeoff}>{opt.tradeoff}</p>
              <pre className={styles.videoCodeSnippet}>
                <code>{VIDEO_CODE_SAMPLES[id]}</code>
              </pre>
            </article>
          );
        })}
      </div>
    </div>
  );
}
