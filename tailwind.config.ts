import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

// Tailwind v4 uses @tailwindcss/postcss in postcss.config.
// This config enables shadcn CLI to inspect content paths when generating styles.
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
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        ring: "hsl(var(--ring))",
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


