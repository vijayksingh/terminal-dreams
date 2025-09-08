import type { Config } from "tailwindcss";

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
    extend: {},
  },
  plugins: [],
};

export default config;


