"use client";

import { SECTIONS } from "@/lib/frontend-design-data";
import type { FdSectionSlug } from "@/lib/frontend-design-types";
import { SPRING } from "@/lib/motion";
import { motion } from "framer-motion";
import styles from "./frontend-design.module.css";

type Props = {
  activeSection: FdSectionSlug | null;
  onSelect: (slug: FdSectionSlug | null) => void;
};

function layerColor(token: string): string {
  return `var(${token})`;
}

const filterStyles = {
  bar: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "var(--space-2)",
    marginBottom: "var(--space-4)",
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35em",
    padding: "0.25em 0.6em",
    fontFamily: "var(--font-mono)",
    fontSize: "var(--text-xs)",
    border: "1px solid var(--color-border)",
    background: "transparent",
    color: "var(--color-muted)",
    cursor: "pointer",
    transition: "border-color 0.15s, color 0.15s",
  },
  dot: {
    display: "inline-block",
    width: 6,
    height: 6,
    borderRadius: "50%",
    flexShrink: 0,
  },
};

export function SectionFilter({ activeSection, onSelect }: Props) {
  return (
    <div style={filterStyles.bar}>
      <motion.button
        style={{
          ...filterStyles.chip,
          ...(activeSection === null
            ? { borderColor: "var(--color-accent)", color: "var(--color-text)" }
            : {}),
        }}
        whileTap={{ scale: 0.95 }}
        transition={SPRING.quick}
        onClick={() => onSelect(null)}
      >
        All
      </motion.button>
      {SECTIONS.map((sec) => {
        const isActive = activeSection === sec.slug;
        return (
          <motion.button
            key={sec.slug}
            style={{
              ...filterStyles.chip,
              ...(isActive
                ? {
                    borderColor: layerColor(sec.colorToken),
                    color: layerColor(sec.colorToken),
                  }
                : {}),
            }}
            whileTap={{ scale: 0.95 }}
            transition={SPRING.quick}
            onClick={() => onSelect(isActive ? null : sec.slug)}
          >
            <span style={{ ...filterStyles.dot, backgroundColor: layerColor(sec.colorToken) }} />
            {sec.shortName}
          </motion.button>
        );
      })}
    </div>
  );
}
