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
          border: "1px solid #303030",
          padding: "0.25rem 0.5rem",
          borderRadius: 4,
          background: "#141414",
        }}
      >
        {label}
      </Link>
    </motion.div>
  );
}

export default RetroBackLink;


