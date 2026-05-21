"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { LCP_PAGE_ELEMENTS, useCwvContext } from "../cwv-context";
import styles from "../CoreWebVitalsLab.module.css";

// The lab simulates what `new PerformanceObserver({ type: "largest-contentful-paint" })`
// would report: the largest-rendered candidate element. Selection comes from
// `engine/cwv-simulator.ts` — layout has no first-child / sibling hint.

export function LcpDiscoveryPage() {
  const { hoveredLcp, setHoveredLcp, lcpCandidate } = useCwvContext();
  const noMotion = usePrefersReducedMotion();
  const focused = hoveredLcp ? LCP_PAGE_ELEMENTS.find((el) => el.id === hoveredLcp) ?? null : null;

  return (
    <div className={styles.lcpDiscoveryRoot}>
      <div
        className={styles.lcpPageMockup}
        role="application"
        aria-label="Mock web page — hover elements to inspect LCP candidates"
      >
        {LCP_PAGE_ELEMENTS.map((el) => {
          const isLcp = lcpCandidate?.id === el.id;
          const isHovered = hoveredLcp === el.id;
          return (
            <button
              key={el.id}
              type="button"
              className={styles.lcpElement}
              data-id={el.id}
              data-is-lcp={isLcp && isHovered ? "true" : undefined}
              data-hovered={isHovered ? "true" : undefined}
              data-candidate={el.type === "non-candidate" ? "false" : "true"}
              onMouseEnter={() => setHoveredLcp(el.id)}
              onFocus={() => setHoveredLcp(el.id)}
              onMouseLeave={() => setHoveredLcp(null)}
              onBlur={() => setHoveredLcp(null)}
              aria-label={`${el.label} — area ${(el.area * 100).toFixed(0)}% of viewport`}
            >
              <span className={styles.lcpElementBadge}>{el.label}</span>
              <span className={styles.lcpElementType}>{el.type === "non-candidate" ? "not a candidate" : el.type}</span>
              <span className={styles.lcpElementArea}>{Math.round(el.area * 100)}% of viewport</span>
              {isHovered && isLcp && (
                <motion.span
                  layout
                  className={styles.lcpElementCrown}
                  initial={noMotion ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={SPRING.snappy}
                >
                  LCP candidate
                </motion.span>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {focused ? (
          <motion.div
            key={focused.id}
            className={styles.lcpReadout}
            data-correct={lcpCandidate?.id === focused.id ? "true" : undefined}
            initial={noMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={noMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={TRANSITION.enterCard}
          >
            <span className={styles.lcpReadoutHeader}>
              <span className={styles.lcpReadoutTag}>
                {lcpCandidate?.id === focused.id ? "LCP" : focused.type === "non-candidate" ? "Excluded" : "Smaller"}
              </span>
              <span className={styles.lcpReadoutTitle}>{focused.label}</span>
              <code className={styles.lcpReadoutCode}>type: {focused.type}</code>
            </span>
            <p className={styles.lcpReadoutReason}>{focused.reason}</p>
          </motion.div>
        ) : (
          <motion.p
            key="empty"
            className={styles.lcpReadoutEmpty}
            initial={noMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION.crossfade}
          >
            Hover any element. The browser's <code>PerformanceObserver</code> picks the largest candidate the moment it paints.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
