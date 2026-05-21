"use client";

import { useState, useRef, useEffect } from "react";
import { usePerfContext } from "../perf-context";
import styles from "../WebPerformanceLab.module.css";

const YIELD_PRESETS = [10, 25, 50, 100, 200];
const TOTAL_WORK_MS = 400;

export function LongTaskWidget() {
  const { enabledOptimizations, setSimulatedInp } = usePerfContext();
  const on = enabledOptimizations.has("longTaskBreaking");
  const [yieldMs, setYieldMs] = useState(50);
  const [clickState, setClickState] = useState<"idle" | "queued" | "processed">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const chunkCount = Math.ceil(TOTAL_WORK_MS / yieldMs);
  const chunks = Array.from({ length: chunkCount }, (_, i) => {
    const remaining = TOTAL_WORK_MS - i * yieldMs;
    return Math.min(yieldMs, remaining);
  });
  const longestChunk = Math.max(...chunks);
  const isLongTask = longestChunk > 50;
  const overheadPct = Math.round(((chunkCount - 1) * 0.5 / TOTAL_WORK_MS) * 100);

  const [lastDelay, setLastDelay] = useState(0);

  const handleSimClick = () => {
    if (clickState !== "idle") return;
    const taskDuration = on ? longestChunk : 280;
    const arrivalPct = Math.random();
    const arrivalMs = Math.round(arrivalPct * taskDuration);
    const waitMs = taskDuration - arrivalMs;
    setLastDelay(waitMs);
    setSimulatedInp(waitMs);
    setClickState("queued");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setClickState("processed");
      timerRef.current = setTimeout(() => {
        setClickState("idle");
        setSimulatedInp(null);
      }, 1200);
    }, waitMs);
  };

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Main Thread Timeline</div>
      <div className={styles.taskTimeline}>
        <div className={styles.taskTimelineRow}>
          <span className={styles.taskTimelineLabel}>Before</span>
          <div className={styles.taskTimelineTrack}>
            <div
              className={styles.taskBlock}
              data-long="true"
              data-state={on ? "inactive" : "active"}
              style={{ width: "60%" }}
            >
              <span>hydrate() — 280ms</span>
            </div>
            <div
              className={styles.taskBlock}
              data-long="true"
              data-state={on ? "inactive" : "active"}
              style={{ width: "25%" }}
            >
              <span>parse — 120ms</span>
            </div>
          </div>
        </div>
        <div className={styles.taskTimelineRow}>
          <span className={styles.taskTimelineLabel}>After</span>
          <div className={styles.taskTimelineTrack}>
            {chunks.map((ms, i) => (
              <div
                key={i}
                className={styles.taskBlock}
                data-long={ms > 50 ? "true" : undefined}
                data-state={on ? "active" : "inactive"}
                style={{ width: `${(ms / TOTAL_WORK_MS) * 100}%` }}
              >
                <span>{ms}ms</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {on && (
        <div className={styles.yieldSliderWrap}>
          <label className={styles.criticalSliderLabel}>
            Yield every: <strong>{yieldMs}ms</strong>
            {isLongTask && <span className={styles.criticalFouc}> still a long task!</span>}
          </label>
          <div className={styles.yieldPresets}>
            {YIELD_PRESETS.map((ms) => (
              <button
                key={ms}
                type="button"
                className={styles.yieldPresetBtn}
                data-active={ms === yieldMs ? "true" : undefined}
                onClick={() => setYieldMs(ms)}
              >
                {ms}ms
              </button>
            ))}
          </div>
          <span className={styles.yieldInfo}>
            {chunkCount} chunks · worst-case delay {longestChunk}ms · +{overheadPct}% overhead
          </span>
        </div>
      )}

      <div className={styles.clickSimulation}>
        <button
          type="button"
          className={styles.clickSimButton}
          data-state={clickState}
          onClick={handleSimClick}
          disabled={clickState !== "idle"}
        >
          {clickState === "idle" && "Click during long task"}
          {clickState === "queued" && `Queued ~${lastDelay}ms...`}
          {clickState === "processed" && "Processed!"}
        </button>
        <span className={styles.clickSimLabel}>
          {clickState === "idle" && "Simulates a user click at a random point during the task (CPU-bound, not network-dependent)"}
          {clickState === "queued" && (on ? "Yielded — browser processes input between chunks" : "Main thread blocked — click sits in queue")}
          {clickState === "processed" && `Input delay: ${lastDelay}ms — ${lastDelay <= 200 ? "passes" : "fails"} INP threshold (try again — timing varies)`}
        </span>
      </div>

      <p className={styles.widgetNote}>
        {on
          ? isLongTask
            ? `Chunks of ${yieldMs}ms still exceed the 50ms Long Task threshold. Try a smaller yield interval.`
            : `${chunkCount} chunks of ≤${yieldMs}ms — no single task exceeds 50ms. Browser processes input between chunks, worst-case delay: ${longestChunk}ms.`
          : "Two long tasks (280ms + 120ms = 400ms blocking) hold the main thread. Any click during these tasks queues until the task completes — that's your INP."}
      </p>
    </div>
  );
}
