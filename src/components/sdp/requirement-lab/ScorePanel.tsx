"use client";

import { motion } from "framer-motion";
import { SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  FLAVOR_META,
  FLAVOR_ORDER,
  KIND_META,
  KIND_ORDER,
  type Scoreboard,
} from "./types";
import styles from "./styles.module.css";

type ScorePanelProps = {
  scoreboard: Scoreboard;
  onReset: () => void;
};

export function ScorePanel({ scoreboard, onReset }: ScorePanelProps) {
  const reducedMotion = usePrefersReducedMotion();
  const totalHighs = scoreboard.hits.length + scoreboard.regret.length;

  return (
    <motion.div
      className={styles.scorePanel}
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : SPRING.gentle}
    >
      <div className={styles.scoreHead}>
        <span className={styles.scoreEyebrow}>scoreboard</span>
        <span className={styles.scoreTitle}>How did your picks compound?</span>
      </div>

      <div className={styles.scoreGrid}>
        <ScoreCell
          label="high-value hits"
          value={`${scoreboard.hits.length} / ${totalHighs}`}
          sub="probes that surfaced real pressure"
          tone="good"
        />
        <ScoreCell
          label="marginals"
          value={String(scoreboard.marginals.length)}
          sub="defensible but stepped-on picks"
        />
        <ScoreCell
          label="wasted"
          value={String(scoreboard.wasted.length)}
          sub="answered in the brief"
          tone={scoreboard.wasted.length > 0 ? "warn" : undefined}
        />
        <ScoreCell
          label="traps"
          value={String(scoreboard.traps.length)}
          sub="tech-bait or vague"
          tone={scoreboard.traps.length > 0 ? "bad" : "good"}
        />
        <ScoreCell
          label="flavors covered"
          value={`${scoreboard.flavorsCovered.size} / 5`}
          sub={FLAVOR_ORDER.filter(
            (f) => !scoreboard.flavorsCovered.has(f),
          )
            .map((f) => FLAVOR_META[f].label)
            .join(" · ") || "all five"}
          tone={scoreboard.flavorsCovered.size === 5 ? "good" : undefined}
        />
        <ScoreCell
          label="kinds in scope"
          value={`${scoreboard.kindsCovered.size} / 5`}
          sub={KIND_ORDER.filter((k) => !scoreboard.kindsCovered.has(k))
            .map((k) => KIND_META[k].frame)
            .join(" · ") || "Who / What / How / Must / Not"}
          tone={scoreboard.kindsCovered.size === 5 ? "good" : undefined}
        />
      </div>

      {scoreboard.regret.length > 0 ? (
        <div className={styles.regretBlock}>
          <div className={styles.regretEyebrow}>
            you skipped {scoreboard.regret.length} high-value{" "}
            {scoreboard.regret.length === 1 ? "probe" : "probes"}
          </div>
          {scoreboard.regret.map((probe) => (
            <div key={probe.id} className={styles.regretRow}>
              <span className={styles.regretFlavor}>
                {FLAVOR_META[probe.flavor].label}
              </span>
              <span className={styles.regretText}>“{probe.text}”</span>
              {probe.surfaces && probe.surfaces.length > 0 ? (
                <span className={styles.regretWould}>
                  would have surfaced{" "}
                  {Array.from(new Set(probe.surfaces.map((s) => s.kind)))
                    .map((k) => KIND_META[k].frame)
                    .join(" + ")}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.regretBlock} data-no-regret="true">
          <div className={styles.regretEyebrow}>no regrets</div>
          <div className={styles.regretText}>
            You picked all the high-value probes available.
          </div>
        </div>
      )}

      <div className={styles.scoreActions}>
        <button type="button" className={styles.submitBtn} onClick={onReset}>
          ↻ try a different ranking
        </button>
      </div>
    </motion.div>
  );
}

function ScoreCell({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "good" | "warn" | "bad";
}) {
  return (
    <div className={styles.scoreCell}>
      <span className={styles.scoreCellLabel}>{label}</span>
      <span className={styles.scoreCellValue} data-tone={tone}>
        {value}
      </span>
      <span className={styles.scoreCellSub}>{sub}</span>
    </div>
  );
}
