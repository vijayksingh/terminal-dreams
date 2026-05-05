import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

// Tailwind v4 uses @tailwindcss/postcss in postcss.config.
// This config enables shadcn CLI to inspect content paths when generating styles.
//
// Color strategy: CSS custom properties in tokens.css are the single source of truth.
// Tailwind color utilities below reference those vars so classes like `bg-surface`
// resolve to the current theme's value without duplication.
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/mdx/**/*.{ts,tsx}",
    "./content/blog/**/*.{md,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── shadcn semantic colors (HSL) ──────────────────────────
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        ring: "hsl(var(--ring))",

        // ── App design tokens (from tokens.css) ──────────────────
        // These let you write `bg-surface` instead of `bg-[var(--color-surface)]`
        "app-bg": "var(--color-bg)",
        surface: {
          DEFAULT: "var(--color-surface)",
          2: "var(--color-surface-2)",
        },
        "app-border": "var(--color-border)",
        "app-muted": "var(--color-muted)",
        "app-text": "var(--color-text)",
        "app-link": "var(--color-link)",
        "app-accent": "var(--color-accent)",
        "accent-weak": "var(--accent-weak)",

        // ── Cookbook-specific tokens ──────────────────────────────
        "timer-warning": "var(--cookbook-timer-warning)",
        "timer-done": "var(--cookbook-timer-done)",
      },
      borderRadius: {
        lg: "var(--radius-3)",
        md: "var(--radius-2)",
        sm: "var(--radius-1)",
      },
    },
  },
  plugins: [animate],
};

export default config;
