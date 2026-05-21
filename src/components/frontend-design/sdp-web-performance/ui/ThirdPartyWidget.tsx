"use client";

import { usePerfContext } from "../perf-context";
import styles from "../WebPerformanceLab.module.css";

const THIRD_PARTY_SCRIPTS = [
  {
    name: "analytics.js",
    size: 38,
    eagerPhases: [{ phase: "parse" as const, flex: 2 }, { phase: "execute" as const, flex: 3 }],
    deferPhases: [{ phase: "idle" as const, flex: 2 }],
    strategy: "requestIdleCallback",
  },
  {
    name: "ads.js",
    size: 52,
    eagerPhases: [{ phase: "parse" as const, flex: 3 }, { phase: "execute" as const, flex: 4 }],
    deferPhases: [{ phase: "idle" as const, flex: 3 }],
    strategy: "After load event",
  },
  {
    name: "chatbot.js",
    size: 125,
    eagerPhases: [{ phase: "parse" as const, flex: 5 }, { phase: "execute" as const, flex: 8 }],
    deferPhases: [{ phase: "idle" as const, flex: 4 }],
    strategy: "On user interaction",
  },
];

export function ThirdPartyWidget() {
  const { enabledOptimizations } = usePerfContext();
  const on = enabledOptimizations.has("thirdPartyDefer");

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Script Execution Timeline</div>

      <div className={styles.lifecycleTimeline}>
        <div className={styles.lifecycleRow}>
          <span className={styles.lifecycleLabel}>app.js</span>
          <div className={styles.lifecycleTrack}>
            <div className={styles.lifecycleBlock} data-phase="parse" style={{ flex: 4 }}><span>parse</span></div>
            <div className={styles.lifecycleBlock} data-phase="execute" style={{ flex: 6 }}><span>hydrate</span></div>
          </div>
        </div>

        {THIRD_PARTY_SCRIPTS.map((s) => (
          <div key={s.name} className={styles.lifecycleRow}>
            <span className={styles.lifecycleLabel}>
              {s.name} <span className={styles.lifecycleSize}>({s.size} KB)</span>
            </span>
            <div className={styles.lifecycleTrack}>
              {!on && s.eagerPhases.map((p, i) => (
                <div key={i} className={styles.lifecycleBlock} data-phase={p.phase} data-state="active" style={{ flex: p.flex }}>
                  <span>{p.phase}</span>
                </div>
              ))}
              {on && (
                <>
                  <div style={{ flex: 10 }} />
                  {s.deferPhases.map((p, i) => (
                    <div key={i} className={styles.lifecycleBlock} data-phase={p.phase} data-state="active" style={{ flex: p.flex }}>
                      <span>{s.strategy}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        ))}

        <div className={styles.lifecycleAxisRow}>
          <span />
          <div className={styles.lifecycleAxis}>
            <span>parse</span>
            <span>DOMContentLoaded</span>
            <span>load</span>
            <span>idle</span>
          </div>
        </div>
      </div>

      <p className={styles.widgetNote}>
        {on
          ? "215 KB deferred past load — TBT drops ~90ms, main thread freed for first interactions"
          : "215 KB of third-party JS executes during parse/hydrate, blocking your app from becoming interactive"}
      </p>
    </div>
  );
}
