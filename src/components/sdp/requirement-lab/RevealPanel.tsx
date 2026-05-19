"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  FLAVOR_META,
  KIND_META,
  type ProbeCard,
} from "./types";
import styles from "./styles.module.css";

type RevealPanelProps = {
  revealedProbes: ProbeCard[];
};

const QUALITY_LABEL: Record<ProbeCard["quality"], string> = {
  high: "high-value",
  medium: "marginal",
  low: "wasted",
  trap: "trap",
};

export function RevealPanel({ revealedProbes }: RevealPanelProps) {
  const reducedMotion = usePrefersReducedMotion();

  if (revealedProbes.length === 0) return null;

  return (
    <div className={styles.revealStack}>
      <div className={styles.revealHead}>
        <span className={styles.revealEyebrow}>your picks revealed</span>
        <span className={styles.revealSub}>
          {revealedProbes.length} of {revealedProbes.length} revealed —
          watch the scope sidebar fill as each pick lands.
        </span>
      </div>

      <AnimatePresence initial={false}>
        {revealedProbes.map((probe, i) => {
          const flavor = FLAVOR_META[probe.flavor];
          return (
            <motion.div
              key={probe.id}
              className={styles.revealCard}
              data-quality={probe.quality}
              initial={reducedMotion ? false : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={reducedMotion ? { duration: 0 } : SPRING.gentle}
              layout
            >
              <div className={styles.revealCardHead}>
                <span className={styles.revealCardRank}>#{i + 1}</span>
                <span
                  className={styles.revealCardQuality}
                  data-quality={probe.quality}
                >
                  {QUALITY_LABEL[probe.quality]}
                </span>
                <span
                  className={styles.revealCardFlavor}
                  style={{ "--flavor-tone": flavor.tone } as React.CSSProperties}
                >
                  {flavor.label}
                </span>
              </div>

              <div className={styles.revealCardProbe}>“{probe.text}”</div>

              {probe.quality === "high" || probe.quality === "medium" ? (
                <>
                  <p className={styles.revealCardBody}>{probe.response}</p>
                  {probe.teaching ? (
                    <div className={styles.revealCardTeaching}>
                      <span className={styles.revealCardTeachingLabel}>
                        takeaway
                      </span>
                      {probe.teaching}
                    </div>
                  ) : null}
                  {probe.surfaces && probe.surfaces.length > 0 ? (
                    <div className={styles.revealCardSurfaced}>
                      <span className={styles.revealCardSurfacedLabel}>
                        surfaced into scope
                      </span>
                      <div className={styles.revealCardSurfacedKinds}>
                        {Array.from(
                          new Set(probe.surfaces.map((s) => s.kind)),
                        ).map((k) => (
                          <span
                            key={k}
                            className={styles.revealCardSurfacedKind}
                            style={
                              {
                                "--kind-tone": KIND_META[k].tone,
                              } as React.CSSProperties
                            }
                          >
                            {KIND_META[k].frame}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className={styles.revealCardBody}>{probe.critique}</p>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
