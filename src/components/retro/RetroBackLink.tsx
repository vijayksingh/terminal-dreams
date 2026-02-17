"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import styles from "./retro.module.css";

type RetroBackLinkProps = {
  href?: string;
  label?: string;
  variant?: "pill" | "inline";
};

export function RetroBackLink({
  href = "/",
  label = "Back",
  variant = "pill",
}: RetroBackLinkProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const isInline = variant === "inline";
  const linkElement = (
    <Link
      href={href}
      className={isInline ? `${styles.navLink} ${styles.backLinkInline}` : styles.navLink}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.textContent = isInline ? "← Back to archive" : "← Back";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.textContent = label;
      }}
      style={
        isInline
          ? undefined
          : {
              border: "1px solid var(--color-border)",
              padding: "var(--space-1) var(--space-2)",
              borderRadius: "var(--radius-1)",
              background: "var(--color-surface)",
            }
      }
    >
      {label}
    </Link>
  );

  if (prefersReducedMotion) {
    return <div style={{ display: "inline-block" }}>{linkElement}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      style={{ display: "inline-block" }}
    >
      {linkElement}
    </motion.div>
  );
}

export default RetroBackLink;


