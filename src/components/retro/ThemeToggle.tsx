"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  // Start with null to avoid hydration mismatch — server doesn't know the theme
  const [theme, setTheme] = useState<"dark" | "light" | null>(null);

  // Read the actual theme from the DOM on mount (set by the blocking script)
  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  useEffect(() => {
    if (theme === null) return;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("td-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  // Render a placeholder with the same dimensions during SSR to avoid layout shift
  if (theme === null) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium"
        style={{
          borderColor: "oklch(24.84% 0.018 var(--base-hue) / 0.5)",
          background: "oklch(16.75% 0.011 var(--base-hue) / 0.65)",
          color: "var(--color-muted)",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-sm)",
          lineHeight: 1,
          letterSpacing: "0.01em",
          visibility: "hidden",
        }}
      >
        <span aria-hidden>☾</span>
        <span>dark</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      onClick={toggle}
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium cursor-pointer"
      style={{
        borderColor: "color-mix(in srgb, var(--color-border) 50%, transparent)",
        background: "color-mix(in srgb, var(--color-surface) 65%, transparent)",
        backdropFilter: "blur(12px) saturate(1.4)",
        WebkitBackdropFilter: "blur(12px) saturate(1.4)",
        color: "var(--color-muted)",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-sm)",
        lineHeight: 1,
        letterSpacing: "0.01em",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <span aria-hidden>{theme === "dark" ? "☾" : "☀"}</span>
      <span>{theme === "dark" ? "dark" : "light"}</span>
    </button>
  );
}

export default ThemeToggle;
