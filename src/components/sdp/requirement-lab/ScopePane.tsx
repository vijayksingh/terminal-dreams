"use client";

import { motion, AnimatePresence } from "framer-motion";
import { KIND_META, KIND_ORDER, type ScopeCard } from "./types";
import { SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import styles from "./styles.module.css";

type ScopePaneProps = {
  scope: ScopeCard[];
  /** ts of the most recent probe — buckets with cards from this probe pulse. */
  recentProbeTs: number | null;
  onRemove: (id: string) => void;
  /** Hide the remove × on cards (scope is system-derived). */
  readOnly?: boolean;
};

export function ScopePane({
  scope,
  recentProbeTs,
  onRemove,
  readOnly,
}: ScopePaneProps) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <aside className={styles.scope}>
      <header className={styles.scopeHead}>
        <span className={styles.scopeEyebrow}>scope</span>
        <span className={styles.scopeTitle}>what your probes surfaced</span>
        <span className={styles.scopeSub}>
          Five kinds, populated as a side-effect of probing. Boundary cards
          render struck-through — they're requirements about what you're <em>not</em> building.
        </span>
      </header>

      {KIND_ORDER.map((kind) => {
        const meta = KIND_META[kind];
        const items = scope.filter((c) => c.kind === kind);
        const justLanded =
          recentProbeTs !== null && items.some((c) => c.ts === recentProbeTs);
        return (
          <section
            key={kind}
            className={styles.scopeSection}
            data-kind={kind}
            data-filled={items.length > 0 ? "true" : undefined}
            data-pulse={justLanded ? "true" : undefined}
          >
            <div className={styles.scopeSectionHead}>
              <span className={styles.scopeSectionFrame}>{meta.frame}</span>
              <span className={styles.scopeSectionLabel}>{meta.label}</span>
              <span className={styles.scopeSectionCount}>{items.length}</span>
            </div>

            {items.length === 0 ? (
              <span className={styles.scopeEmpty}>{meta.blurb}</span>
            ) : (
              <AnimatePresence initial={false}>
                {items.map((card) => (
                  <motion.div
                    key={card.id}
                    className={styles.scopeCard}
                    data-boundary={kind === "boundary" ? "true" : undefined}
                    data-just-landed={card.ts === recentProbeTs ? "true" : undefined}
                    layout
                    initial={
                      reducedMotion ? false : { opacity: 0, x: 12, scale: 0.96 }
                    }
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={
                      reducedMotion
                        ? { opacity: 0 }
                        : { opacity: 0, x: 12, scale: 0.96 }
                    }
                    transition={reducedMotion ? { duration: 0 } : SPRING.gentle}
                  >
                    <div className={styles.scopeCardTitle}>{card.title}</div>
                    <div className={styles.scopeCardDetail}>{card.detail}</div>
                    {readOnly ? null : (
                      <button
                        type="button"
                        className={styles.scopeCardRemove}
                        onClick={() => onRemove(card.id)}
                        aria-label={`Remove ${card.title}`}
                      >
                        ×
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </section>
        );
      })}
    </aside>
  );
}
