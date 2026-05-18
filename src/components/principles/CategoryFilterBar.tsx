"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { SPRING } from "@/lib/motion";
import { layerColors } from "@/components/recipe-lab/diagram-colors";
import type { PrincipleCategory, CategoryInfo } from "@/lib/principle-types";
import styles from "./principles.module.css";

export function CategoryFilterBar({
  categories,
  activeCategory,
  onChange,
}: {
  categories: CategoryInfo[];
  activeCategory: PrincipleCategory | null;
  onChange: (cat: PrincipleCategory | null) => void;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--space-2)",
        justifyContent: "center",
        padding: "var(--space-4) 0",
      }}
    >
      <FilterChip
        label="All"
        active={activeCategory === null}
        onClick={() => onChange(null)}
        colorToken="--color-accent"
        prefersReducedMotion={prefersReducedMotion}
      />
      {categories.map((cat) => (
        <FilterChip
          key={cat.slug}
          label={cat.name}
          active={activeCategory === cat.slug}
          onClick={() => onChange(activeCategory === cat.slug ? null : cat.slug)}
          colorToken={cat.colorToken}
          prefersReducedMotion={prefersReducedMotion}
        />
      ))}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  colorToken,
  prefersReducedMotion,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  colorToken: string;
  prefersReducedMotion: boolean;
}) {
  const colors = layerColors(colorToken);

  const chipStyle = {
    borderColor: active ? colors.dot : "var(--color-border)",
    background: active ? colors.bg : "transparent",
    color: active ? colors.text : "var(--color-muted)",
  };

  if (prefersReducedMotion) {
    return (
      <button
        onClick={onClick}
        className={styles.categoryChip}
        style={chipStyle}
      >
        <span
          className={styles.chipDot}
          style={{ background: colors.dot }}
        />
        {label}
      </button>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      className={styles.categoryChip}
      style={chipStyle}
      whileTap={{ scale: 0.95 }}
      animate={{
        borderColor: chipStyle.borderColor,
        background: chipStyle.background,
        color: chipStyle.color,
      }}
      transition={SPRING.snappy}
    >
      <span
        className={styles.chipDot}
        style={{ background: colors.dot }}
      />
      {label}
    </motion.button>
  );
}
