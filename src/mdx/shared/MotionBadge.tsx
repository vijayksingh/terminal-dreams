"use client";

import styles from "@/components/retro/retro.module.css";
import { motion } from "framer-motion";

export function MotionBadge({ label = "motion" }: { label?: string }) {
  return (
    <motion.span
      className={styles.listLink}
      style={{
        display: "inline-block",
        border: "1px solid #303030",
        padding: "0.15rem 0.5rem",
        borderRadius: 4,
        background: "#121212",
      }}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.05, boxShadow: "0 0 0 1px #303030" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {label}
    </motion.span>
  );
}

export default MotionBadge;


