"use client";

import { usePerfContext } from "../perf-context";
import styles from "../WebPerformanceLab.module.css";

type DeferStrategy = "eager" | "defer" | "idle" | "interaction";
const STRATEGY_LABELS: Record<DeferStrategy, string> = {
  eager: "Eager",
  defer: "Defer",
  idle: "Idle",
  interaction: "On interact",
};
const STRATEGY_FLEX_OFFSET: Record<DeferStrategy, number> = {
  eager: 0,
  defer: 6,
  idle: 10,
  interaction: 14,
};

const THIRD_PARTY_SCRIPTS = [
  { name: "analytics.js", size: 38, parseFlex: 2, execFlex: 3, id: "analytics" },
  { name: "ads.js", size: 52, parseFlex: 3, execFlex: 4, id: "ads" },
  { name: "chatbot.js", size: 125, parseFlex: 5, execFlex: 8, id: "chatbot" },
];

export function ThirdPartyWidget() {
  const { enabledOptimizations, optParams, updateOptParam } = usePerfContext();
  const on = enabledOptimizations.has("thirdPartyDefer");
  const strategies = optParams.thirdPartyStrategies;

  const setStrategy = (id: string, strategy: DeferStrategy) => {
    updateOptParam("thirdPartyStrategies", { ...strategies, [id]: strategy });
  };

  const totalDeferred = THIRD_PARTY_SCRIPTS.filter((s) => (strategies[s.id] ?? "eager") !== "eager").reduce((sum, s) => sum + s.size, 0);
  const eagerCount = THIRD_PARTY_SCRIPTS.filter((s) => (strategies[s.id] ?? "eager") === "eager").length;

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

        {THIRD_PARTY_SCRIPTS.map((s) => {
          const strat = on ? strategies[s.id] : "eager";
          const offset = STRATEGY_FLEX_OFFSET[strat];
          return (
            <div key={s.name} className={styles.lifecycleRow}>
              <span className={styles.lifecycleLabel}>
                {s.name} <span className={styles.lifecycleSize}>({s.size} KB)</span>
              </span>
              <div className={styles.lifecycleTrack}>
                {strat === "eager" ? (
                  <>
                    <div className={styles.lifecycleBlock} data-phase="parse" data-state="active" style={{ flex: s.parseFlex }}>
                      <span>parse</span>
                    </div>
                    <div className={styles.lifecycleBlock} data-phase="execute" data-state="active" style={{ flex: s.execFlex }}>
                      <span>execute</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ flex: offset }} />
                    <div className={styles.lifecycleBlock} data-phase="idle" data-state="active" style={{ flex: Math.max(s.parseFlex, 2) }}>
                      <span>{STRATEGY_LABELS[strat]}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

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

      {on && (
        <div className={styles.thirdPartyControls}>
          {THIRD_PARTY_SCRIPTS.map((s) => (
            <div key={s.name} className={styles.thirdPartyControlRow}>
              <span className={styles.thirdPartyControlLabel}>{s.name}</span>
              <div className={styles.yieldPresets} role="radiogroup" aria-label={`${s.name} loading strategy`}>
                {(["eager", "defer", "idle", "interaction"] as DeferStrategy[]).map((strat) => (
                  <button
                    key={strat}
                    type="button"
                    className={styles.yieldPresetBtn}
                    data-active={strategies[s.id] === strat ? "true" : undefined}
                    onClick={() => setStrategy(s.id, strat)}
                    role="radio"
                    aria-checked={strategies[s.id] === strat}
                  >
                    {STRATEGY_LABELS[strat]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className={styles.widgetNote}>
        {on
          ? eagerCount === THIRD_PARTY_SCRIPTS.length
            ? "All scripts eager — no deferral benefit. Move non-critical scripts to idle or interaction triggers."
            : `${totalDeferred} KB deferred past critical path — TBT drops ~${Math.round(totalDeferred * 0.4)}ms, main thread freed for first interactions.`
          : "215 KB of third-party JS executes during parse/hydrate, blocking your app from becoming interactive."}
      </p>
    </div>
  );
}
