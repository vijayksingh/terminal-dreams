"use client";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

interface ProgressBarProps {
  progress: number; // 0-100
}

export function ProgressBar({ progress }: ProgressBarProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="fixed left-0 right-0 top-0 z-50 h-1">
      <div
        className={`h-full bg-gradient-to-r from-[var(--color-accent)] via-[var(--cookbook-timer-warning)] to-[var(--cookbook-timer-done)]`}
        style={{
          width: `${progress}%`,
          transition: prefersReducedMotion ? 'width 0.1s linear' : 'width 0.3s ease-out',
        }}
      />
    </div>
  );
}
