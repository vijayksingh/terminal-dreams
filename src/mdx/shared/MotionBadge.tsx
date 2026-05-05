"use client";

import styles from "@/components/retro/retro.module.css";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { motion } from "framer-motion";
import { SPRING } from "@/lib/motion";

export function MotionBadge({ label = "motion" }: { label?: string }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const baseStyle = {
    display: "inline-block",
    border: "1px solid var(--color-border)",
    padding: "0.15rem var(--space-2)",
    borderRadius: "var(--radius-1)",
    background: "var(--color-surface)",
  } as const;

  if (prefersReducedMotion) {
    return <span className={styles.listLink} style={baseStyle}>{label}</span>;
  }

  return (
    <motion.span
      className={styles.listLink}
      style={baseStyle}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.05, boxShadow: "0 0 0 1px var(--color-border)" }}
      transition={SPRING.gentle}
    >
      {label}
    </motion.span>
  );
}

export default MotionBadge;


