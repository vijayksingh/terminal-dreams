/**
 * Shared visual constants for the demo primitive system.
 * Every primitive references these instead of hardcoding values.
 */

export const LABEL = {
  fontSize: 10,
  fontWeight: 600,
  fontFamily: "var(--font-geist-pixel-square, var(--font-geist-mono, var(--font-mono)))",
  paddingX: 7,
  paddingY: 3,
  borderRadius: 4,
  lineHeight: 1,
} as const;

export const CONNECTOR = {
  dashArray: "4 3",
  strokeWidth: 1,
  lineLength: 20,
  cornerSize: 14,
} as const;

export const MEASURE = {
  capHeight: 8,
  strokeWidth: 1,
  labelGap: 4,
} as const;

export const RADIUS_GUIDE = {
  strokeWidth: 1.5,
  dashArray: "3 2",
  labelOffset: 6,
} as const;

export type DemoColor = "neutral" | "success" | "error" | "accent";

export const COLOR_MAP: Record<
  DemoColor,
  { dot: string; bg: string; border: string; text: string }
> = {
  neutral: {
    dot: "var(--color-muted)",
    bg: "var(--color-surface-2)",
    border: "var(--color-border)",
    text: "var(--color-muted)",
  },
  success: {
    dot: "var(--color-success)",
    bg: "var(--color-success-muted)",
    border: "var(--color-success)",
    text: "var(--color-success)",
  },
  error: {
    dot: "var(--color-error)",
    bg: "var(--color-error-muted)",
    border: "var(--color-error)",
    text: "var(--color-error)",
  },
  accent: {
    dot: "var(--color-accent)",
    bg: "var(--color-surface-2)",
    border: "var(--color-accent)",
    text: "var(--color-accent)",
  },
};
