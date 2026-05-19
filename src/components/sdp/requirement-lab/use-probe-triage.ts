"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  LabPhase,
  ProbeCard,
  ProbeTriageConfig,
  ProbeFlavor,
  ScopeCard,
  Scoreboard,
} from "./types";

const REVEAL_STAGGER_MS = 700;

/**
 * Deterministic Fisher-Yates from a seed so SSR/client agree on order
 * before hydration, but the order isn't always the same across sessions.
 */
function shuffleStable<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function useProbeTriage(config: ProbeTriageConfig) {
  // Stable seed across renders, fresh each mount. The shuffle is purely
  // cosmetic — the learner shouldn't memorize position.
  const seedRef = useRef<number>(0);
  if (seedRef.current === 0) {
    seedRef.current = Math.floor(Math.random() * 1_000_000) + 1;
  }
  const shuffledLibrary = useMemo(
    () => shuffleStable(config.library, seedRef.current),
    [config.library],
  );

  const [picks, setPicks] = useState<string[]>([]); // ordered probe ids
  const [phase, setPhase] = useState<LabPhase>("selecting");
  /** During "revealing": how many picks have revealed so far (0..budget). */
  const [revealedCount, setRevealedCount] = useState(0);
  const [scope, setScope] = useState<ScopeCard[]>([]);

  // ── Selection ───────────────────────────────────────────────────
  const togglePick = useCallback(
    (id: string) => {
      if (phase !== "selecting") return;
      setPicks((prev) => {
        if (prev.includes(id)) return prev.filter((p) => p !== id);
        if (prev.length >= config.budget) return prev;
        return [...prev, id];
      });
    },
    [phase, config.budget],
  );

  const reorderPicks = useCallback(
    (id: string, newIndex: number) => {
      if (phase !== "selecting") return;
      setPicks((prev) => {
        const oldIndex = prev.indexOf(id);
        if (oldIndex === -1) return prev;
        const without = prev.filter((p) => p !== id);
        const clamped = Math.max(0, Math.min(newIndex, without.length));
        without.splice(clamped, 0, id);
        return without;
      });
    },
    [phase],
  );

  // ── Submit + staggered reveal ───────────────────────────────────
  const submit = useCallback(() => {
    if (phase !== "selecting" || picks.length === 0) return;
    setPhase("revealing");
    setRevealedCount(0);
  }, [phase, picks.length]);

  const reset = useCallback(() => {
    setPicks([]);
    setScope([]);
    setRevealedCount(0);
    setPhase("selecting");
  }, []);

  // Drive the staged reveal: every REVEAL_STAGGER_MS, advance revealedCount.
  // When the next pick is revealed AND its quality is high/medium, push
  // its surfaces into scope.
  useEffect(() => {
    if (phase !== "revealing") return;
    if (revealedCount >= picks.length) {
      setPhase("complete");
      return;
    }
    const t = setTimeout(() => {
      const id = picks[revealedCount];
      const probe = config.library.find((p) => p.id === id);
      if (probe && probe.surfaces && (probe.quality === "high" || probe.quality === "medium")) {
        const now = Date.now() + revealedCount; // ts encodes order for animation
        setScope((prev) => {
          const seen = new Set(prev.map((c) => c.id));
          const additions: ScopeCard[] = [];
          for (const s of probe.surfaces!) {
            if (seen.has(s.surfaceId)) continue;
            additions.push({
              id: s.surfaceId,
              kind: s.kind,
              title: s.title,
              detail: s.detail,
              surfacedBy: probe.id,
              ts: now,
            });
            seen.add(s.surfaceId);
          }
          return [...additions, ...prev];
        });
      }
      setRevealedCount((c) => c + 1);
    }, REVEAL_STAGGER_MS);
    return () => clearTimeout(t);
  }, [phase, revealedCount, picks, config.library]);

  // ── Derived ─────────────────────────────────────────────────────
  const pickedProbes: ProbeCard[] = useMemo(
    () =>
      picks
        .map((id) => config.library.find((p) => p.id === id))
        .filter((p): p is ProbeCard => !!p),
    [picks, config.library],
  );

  const revealedProbes: ProbeCard[] = useMemo(
    () => pickedProbes.slice(0, revealedCount),
    [pickedProbes, revealedCount],
  );

  const scoreboard: Scoreboard = useMemo(() => {
    const hits = pickedProbes.filter((p) => p.quality === "high");
    const marginals = pickedProbes.filter((p) => p.quality === "medium");
    const wasted = pickedProbes.filter((p) => p.quality === "low");
    const traps = pickedProbes.filter((p) => p.quality === "trap");
    const regret = config.library.filter(
      (p) => p.quality === "high" && !picks.includes(p.id),
    );
    const flavorsCovered = new Set<ProbeFlavor>(
      [...hits, ...marginals].map((p) => p.flavor),
    );
    const kindsCovered = new Set(scope.map((c) => c.kind));
    return {
      picked: picks.length,
      budget: config.budget,
      hits,
      marginals,
      wasted,
      traps,
      regret,
      flavorsCovered,
      kindsCovered,
    };
  }, [pickedProbes, picks, config.library, config.budget, scope]);

  return {
    config,
    shuffledLibrary,
    picks,
    pickedProbes,
    revealedProbes,
    revealedCount,
    phase,
    scope,
    scoreboard,
    togglePick,
    reorderPicks,
    submit,
    reset,
  };
}

export type ProbeTriageState = ReturnType<typeof useProbeTriage>;
