"use client";

import { motion } from "framer-motion";
import { SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { ProbeCard } from "./types";
import styles from "./styles.module.css";

type ProbeWallProps = {
  library: ProbeCard[];
  picks: string[]; // ordered probe ids
  budget: number;
  locked: boolean; // true after submit
  onToggle: (id: string) => void;
};

export function ProbeWall({
  library,
  picks,
  budget,
  locked,
  onToggle,
}: ProbeWallProps) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className={styles.wallWrap}>
      <div className={styles.wallHead}>
        <span className={styles.wallEyebrow}>the probe library</span>
        <span className={styles.wallSubhead}>
          12 candidate questions. Pick {budget} you'd actually ask. Quality is
          hidden until submit.
        </span>
      </div>

      <div className={styles.wall}>
        {library.map((probe) => {
          const rank = picks.indexOf(probe.id);
          const isPicked = rank !== -1;
          const isDisabled =
            locked || (!isPicked && picks.length >= budget);
          return (
            <motion.button
              key={probe.id}
              type="button"
              className={styles.wallCard}
              data-picked={isPicked ? "true" : undefined}
              data-locked={locked ? "true" : undefined}
              disabled={isDisabled && !isPicked}
              onClick={() => onToggle(probe.id)}
              whileTap={reducedMotion ? undefined : { scale: 0.98 }}
              transition={SPRING.quick}
              aria-pressed={isPicked}
            >
              {isPicked ? (
                <span className={styles.wallCardRank}>{rank + 1}</span>
              ) : (
                <span className={styles.wallCardRankEmpty}>·</span>
              )}
              <span className={styles.wallCardText}>{probe.text}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
