"use client";

import { motion } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useAssetsPerf } from "../assets-perf-context";
import {
  THIRD_PARTY_SCRIPTS,
  type ScriptMode,
} from "../engine/third-party-engine";
import styles from "../OtherAssetsPerfLab.module.css";

const MODE_ORDER: ScriptMode[] = ["blocking", "async", "defer", "partytown"];

const MODE_LABEL: Record<ScriptMode, string> = {
  blocking: "blocking",
  async: "async",
  defer: "defer",
  partytown: "Partytown",
};

const MODE_DESCRIPTION: Record<ScriptMode, string> = {
  blocking: 'no attribute — HTML parser stalls. Plain <script src="…">.',
  async: 'async — downloads in parallel, runs whenever it arrives (out of order).',
  defer: 'defer — downloads in parallel, runs after DOMContentLoaded, in source order.',
  partytown: 'type="text/partytown" — executes inside a Web Worker, main thread is free.',
};

export function ThirdPartyAudit() {
  const reducedMotion = usePrefersReducedMotion();
  const {
    scriptAssignment,
    setScriptMode,
    resetAudit,
    applyOptimalAudit,
    auditTotals,
    auditBaseline,
    auditVerdict,
  } = useAssetsPerf();

  const blockingPct = Math.min(100, (auditTotals.blockingMs / 1500) * 100);
  const blockingColor =
    auditTotals.blockingMs < 200
      ? "var(--color-success)"
      : auditTotals.blockingMs < 600
        ? "var(--color-warning)"
        : "var(--color-error)";

  return (
    <div className={styles.zonePane}>
      <header className={styles.paneHeader}>
        <span className={styles.paneLabel}>Live audit</span>
        <span className={styles.paneSub}>
          Per-script loading mode. Watch the blocking gauge as you change the mix.
        </span>
        <div className={styles.paneActions}>
          <button type="button" className={styles.linkButton} onClick={applyOptimalAudit}>
            Show optimal
          </button>
          <button type="button" className={styles.linkButton} onClick={resetAudit}>
            Reset
          </button>
        </div>
      </header>

      <div className={styles.auditMeter}>
        <div className={styles.auditMeterHead}>
          <span className={styles.auditMeterLabel}>Main-thread blocking</span>
          <span className={styles.auditMeterValue} style={{ color: blockingColor }}>
            {auditTotals.blockingMs}ms
          </span>
        </div>
        <div className={styles.auditMeterTrack}>
          <motion.span
            className={styles.auditMeterFill}
            style={{ background: blockingColor }}
            animate={{ width: `${blockingPct}%` }}
            transition={reducedMotion ? { duration: 0 } : TRANSITION.progress}
          />
          <span className={styles.auditMeterMark} style={{ left: `${(200 / 1500) * 100}%` }}>
            200ms target
          </span>
        </div>
        <div className={styles.auditMeterStats}>
          <span>
            <strong>{auditBaseline.blockingMs}ms</strong> baseline → {auditTotals.blockingMs}ms now
          </span>
          <span>
            INP penalty <strong>{auditTotals.inpPenaltyMs}ms</strong>
          </span>
          <span>
            Network <strong>{auditTotals.initialKb}KB</strong>
          </span>
        </div>
      </div>

      <div className={styles.timeline}>
        <span className={styles.timelineLabel}>Main thread</span>
        <div className={styles.timelineTrack}>
          {THIRD_PARTY_SCRIPTS.map((script) => {
            const mode = scriptAssignment[script.id];
            const cost =
              mode === "partytown" ? script.partytownMainMs : script.mainThreadMs;
            const inBlock =
              mode === "blocking" || mode === "async" || mode === "partytown";
            if (!inBlock) return null;
            return (
              <motion.span
                key={`${script.id}-${mode}`}
                className={styles.timelineBar}
                data-mode={mode}
                data-warn={mode !== "partytown" && cost >= 50 ? "true" : undefined}
                animate={{
                  flexGrow: cost,
                  opacity: mode === "partytown" ? 0.55 : 1,
                }}
                transition={reducedMotion ? { duration: 0 } : TRANSITION.progress}
              >
                <span className={styles.timelineBarLabel}>{script.label.split(" ")[0]}</span>
                <span className={styles.timelineBarMs}>{cost}ms</span>
              </motion.span>
            );
          })}
          <span className={styles.timelineDeferRail}>
            {THIRD_PARTY_SCRIPTS.filter(
              (s) => scriptAssignment[s.id] === "defer",
            ).map((script) => (
              <span key={script.id} className={styles.timelineDeferTag}>
                {script.label.split(" ")[0]} (defer after DOMContent)
              </span>
            ))}
          </span>
        </div>
        <div className={styles.timelineLegend}>
          <span data-mode="blocking">blocking — parser stall</span>
          <span data-mode="async">async — lands mid-parse</span>
          <span data-mode="defer">defer — after DOMContent</span>
          <span data-mode="partytown">Partytown — in a Worker</span>
        </div>
      </div>

      <ul className={styles.scriptList} aria-label="Third-party scripts">
        {THIRD_PARTY_SCRIPTS.map((script) => {
          const mode = scriptAssignment[script.id];
          return (
            <li key={script.id} className={styles.scriptRow}>
              <div className={styles.scriptRowHead}>
                <span className={styles.scriptName}>{script.label}</span>
                <span className={styles.scriptCost}>
                  main: {mode === "partytown" ? script.partytownMainMs : script.mainThreadMs}ms
                </span>
              </div>
              <span className={styles.scriptPurpose}>{script.purpose}</span>
              <div className={styles.scriptModeRow} role="radiogroup" aria-label={`${script.label} mode`}>
                {MODE_ORDER.map((m) => {
                  const blocked = m === "partytown" && !script.partytownSafe;
                  const isActive = mode === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      className={styles.modeChip}
                      data-active={isActive ? "true" : undefined}
                      data-blocked={blocked ? "true" : undefined}
                      onClick={() => !blocked && setScriptMode(script.id, m)}
                      disabled={blocked}
                      role="radio"
                      aria-checked={isActive}
                      title={blocked ? script.partytownNote : MODE_DESCRIPTION[m]}
                    >
                      {MODE_LABEL[m]}
                    </button>
                  );
                })}
              </div>
              {!script.partytownSafe && (
                <span className={styles.scriptWarning}>
                  ! Partytown blocked: {script.partytownNote}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <motion.div
        key={auditVerdict.headline}
        className={styles.auditVerdict}
        data-status={auditVerdict.isOptimal ? "good" : "warn"}
        initial={reducedMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={TRANSITION.enterCard}
      >
        <strong className={styles.auditVerdictHeadline}>{auditVerdict.headline}</strong>
        <span className={styles.auditVerdictBody}>{auditVerdict.detail}</span>
      </motion.div>

      <div className={styles.snippetReveal}>
        <span className={styles.snippetRevealLabel}>What the optimal markup looks like</span>
        <pre className={styles.codeBlock}>
          <code>{`<!-- Synchronous: must paint before LCP. SRI guards the supply chain. -->
<script
  src="https://cdn.optimizely.com/datafiles/PROJECT_ID.json"
  integrity="sha384-…"
  crossorigin="anonymous"
  referrerpolicy="strict-origin-when-cross-origin"
></script>

<!-- Off-main-thread: GA4, Intercom, ads, social embeds -->
<script>
  partytown = { forward: ["dataLayer.push", "gtag"] };
</script>
<script src="/~partytown/partytown.js"></script>
<script type="text/partytown" src="https://www.googletagmanager.com/gtag/js?id=G-…"></script>`}</code>
        </pre>
      </div>
    </div>
  );
}
