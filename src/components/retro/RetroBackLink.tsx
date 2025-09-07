"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import styles from "./retro.module.css";

type RetroBackLinkProps = {
  href?: string;
  label?: string;
};

export function RetroBackLink({ href = "/", label = "Back" }: RetroBackLinkProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      style={{ display: "inline-block" }}
    >
      <Link
        href={href}
        className={styles.navLink}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLAnchorElement;
          el.textContent = "← Back";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLAnchorElement;
          el.textContent = label;
        }}
        style={{
          border: "1px solid var(--color-border)",
          padding: "var(--space-1) var(--space-2)",
          borderRadius: "var(--radius-1)",
          background: "var(--color-surface)",
        }}
      >
        {label}
      </Link>
    </motion.div>
  );
}

export default RetroBackLink;


