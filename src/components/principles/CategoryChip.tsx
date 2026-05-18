"use client";

import Link from "next/link";
import { layerColors } from "@/components/recipe-lab/diagram-colors";
import type { PrincipleCategory } from "@/lib/principle-types";
import { CATEGORIES } from "@/lib/principle-data";
import styles from "./principles.module.css";

const colorCache = new Map<string, ReturnType<typeof layerColors>>();

function getCategoryColors(token: string) {
  if (!colorCache.has(token)) {
    colorCache.set(token, layerColors(token));
  }
  return colorCache.get(token)!;
}

export function CategoryChip({
  category,
  linked = true,
}: {
  category: PrincipleCategory;
  linked?: boolean;
}) {
  const info = CATEGORIES.find((c) => c.slug === category);
  if (!info) return null;

  const colors = getCategoryColors(info.colorToken);
  const chipStyle = {
    borderColor: colors.border,
    background: colors.bg,
    color: colors.text,
  };

  const content = (
    <>
      <span className={styles.chipDot} style={{ background: colors.dot }} />
      {info.name}
    </>
  );

  if (linked) {
    return (
      <Link
        href={`/principles/category/${category}`}
        className={styles.categoryChip}
        style={chipStyle}
      >
        {content}
      </Link>
    );
  }

  return (
    <span className={styles.categoryChip} style={chipStyle}>
      {content}
    </span>
  );
}
