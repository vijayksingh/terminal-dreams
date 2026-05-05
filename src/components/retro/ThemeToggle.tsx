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
          borderColor: "var(--color-surface-2)",
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
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors"
      style={{
        borderColor: "var(--color-surface-2)",
        color: "var(--color-muted)",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-sm)",
        lineHeight: 1,
        letterSpacing: "0.01em",
      }}
    >
      <span aria-hidden>{theme === "dark" ? "☾" : "☀"}</span>
      <span>{theme === "dark" ? "dark" : "light"}</span>
    </button>
  );
}

export default ThemeToggle;
