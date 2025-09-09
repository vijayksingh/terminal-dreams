"use client";

import { LockOpenIcon, LockOpenIconHandle } from "@/components/ui/lock-open";
import { useEffect, useMemo, useRef, useState } from "react";

function getInitialTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem("td-theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">(getInitialTheme);
  const iconRef = useRef<LockOpenIconHandle | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    localStorage.setItem("td-theme", theme);
  }, [theme]);

  const label = useMemo(() => (theme === "dark" ? "Dark" : "Light"), [theme]);

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        iconRef.current?.startAnimation();
        setTheme(next);
        // settle animation back
        window.setTimeout(() => iconRef.current?.stopAnimation(), 600);
      }}
      className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      {/* keep pointer events */}
      <LockOpenIcon ref={iconRef} size={18} className="text-foreground" />
      <span className="font-medium">{label}</span>
    </button>
  );
}

export default ThemeToggle;


