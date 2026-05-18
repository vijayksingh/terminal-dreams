"use client";

import { STOPS } from "@/lib/frontend-design-data";
import type { FdSectionSlug } from "@/lib/frontend-design-types";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "fd-progress";

function readProgress(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeProgress(stops: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stops));
  } catch {
    // quota exceeded — silently ignore
  }
}

export function useFdProgress() {
  const [completedStops, setCompletedStops] = useState<string[]>([]);

  useEffect(() => {
    setCompletedStops(readProgress());
  }, []);

  const markComplete = useCallback((stopId: string) => {
    setCompletedStops((prev) => {
      if (prev.includes(stopId)) return prev;
      const next = [...prev, stopId];
      writeProgress(next);
      return next;
    });
  }, []);

  const isComplete = useCallback(
    (stopId: string) => completedStops.includes(stopId),
    [completedStops],
  );

  const progressForSection = useCallback(
    (sectionSlug: FdSectionSlug) => {
      const sectionStops = STOPS.filter((s) => s.sectionSlug === sectionSlug);
      const completed = sectionStops.filter((s) => completedStops.includes(s.id)).length;
      return { completed, total: sectionStops.length };
    },
    [completedStops],
  );

  return { completedStops, markComplete, isComplete, progressForSection };
}
