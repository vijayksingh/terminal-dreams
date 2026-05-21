"use client";

import { useState } from "react";
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

const DEFER_STRATEGIES = ["requestIdleCallback", "After load", "On interaction"] as const;
type DeferStrategy = typeof DEFER_STRATEGIES[number];

const SCRIPT_CORRECT_STRATEGY: Record<string, DeferStrategy> = {
  "analytics.js": "requestIdleCallback",
  "ads.js": "After load",
  "chatbot.js": "On interaction",
};

export function ThirdPartyWidget() {
  const { enabledOptimizations } = usePerfContext();
  const on = enabledOptimizations.has("thirdPartyDefer");

  const [strategyAssignments, setStrategyAssignments] = useState<Record<string, DeferStrategy>>({});
  const [strategySubmitted, setStrategySubmitted] = useState(false);

  const allAssigned = THIRD_PARTY_SCRIPTS.every((s) => strategyAssignments[s.name]);
  const correctCount = THIRD_PARTY_SCRIPTS.filter(
    (s) => strategyAssignments[s.name] === SCRIPT_CORRECT_STRATEGY[s.name],
  ).length;
  const allCorrect = correctCount === THIRD_PARTY_SCRIPTS.length;

  const handleAssign = (script: string, strategy: DeferStrategy) => {
    if (strategySubmitted) return;
    setStrategyAssignments((prev) => ({ ...prev, [script]: strategy }));
  };

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Script Execution Timeline</div>

      {!strategySubmitted && !on ? (
        <>
          <p className={styles.widgetNote}>
            Match each script to its ideal deferral strategy. Consider: how critical is the data? How many users need it? When does it need to run?
          </p>
          <div className={styles.cacheMatchGrid}>
            <div className={styles.cacheMatchHeader}>
              <span>Script</span>
              {DEFER_STRATEGIES.map((s) => (
                <span key={s} className={styles.cacheMatchStrategyLabel}>{s}</span>
              ))}
            </div>
            {THIRD_PARTY_SCRIPTS.map((s) => (
              <div key={s.name} className={styles.cacheMatchRow}>
                <span className={styles.cacheResource}>
                  {s.name} <span style={{ opacity: 0.5 }}>({s.size} KB)</span>
                </span>
                {DEFER_STRATEGIES.map((strat) => (
                  <button
                    key={strat}
                    type="button"
                    className={styles.cacheMatchCell}
                    data-selected={strategyAssignments[s.name] === strat ? "true" : undefined}
                    onClick={() => handleAssign(s.name, strat)}
                    aria-pressed={strategyAssignments[s.name] === strat}
                  />
                ))}
              </div>
            ))}
          </div>
          {allAssigned && (
            <button type="button" className={styles.cacheSubmitButton} onClick={() => setStrategySubmitted(true)}>
              Check strategies
            </button>
          )}
        </>
      ) : (
        <>
          {strategySubmitted && !on && (
            <div className={styles.predictionResult} data-correct={allCorrect ? "true" : undefined}>
              <span className={styles.predictionResultIcon}>{allCorrect ? "✓" : "✗"}</span>
              <span>
                {allCorrect
                  ? "Perfect — analytics fires at idle (no rush), ads after load (skeleton holds the slot), chatbot on click (95% of users never open it)."
                  : `${correctCount}/3 correct. Analytics → idle (timestamp delay is invisible), ads → after load (skeleton placeholder), chatbot → on interaction (125 KB for 5% of users). Toggle Third-Party Defer to see the timeline shift.`}
              </span>
            </div>
          )}

          <p className={styles.widgetNote}>
            {on
              ? "Scripts deferred past the critical window — main thread stays free for user interactions."
              : "Third-party scripts compete with your app during the critical rendering window."}
          </p>

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

          <div className={styles.thirdPartySavings}>
            {on
              ? "215 KB deferred past load — TBT drops ~90ms, main thread freed for first interactions"
              : "215 KB of third-party JS executes during parse/hydrate, blocking your app from becoming interactive"}
          </div>
        </>
      )}
    </div>
  );
}
