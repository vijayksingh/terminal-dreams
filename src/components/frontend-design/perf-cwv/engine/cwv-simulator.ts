// ── Core Web Vitals simulator ─────────────────────────────────────
// Pure functions: ratings, CLS session-window grouping, INP phase math.
// No React. Used by `cwv-context.tsx` (state) and the lab UI components.

export type Rating = "good" | "needs-improvement" | "poor";

/** CWV thresholds (good ≤ , poor > ). Calibrated to p75 field data. */
export const CWV_THRESHOLDS = {
  /** seconds */
  lcp: { good: 2.5, poor: 4.0 },
  /** milliseconds */
  inp: { good: 200, poor: 500 },
  /** unitless */
  cls: { good: 0.1, poor: 0.25 },
} as const;

export function rateLcp(seconds: number): Rating {
  if (seconds <= CWV_THRESHOLDS.lcp.good) return "good";
  if (seconds <= CWV_THRESHOLDS.lcp.poor) return "needs-improvement";
  return "poor";
}

export function rateInp(ms: number): Rating {
  if (ms <= CWV_THRESHOLDS.inp.good) return "good";
  if (ms <= CWV_THRESHOLDS.inp.poor) return "needs-improvement";
  return "poor";
}

export function rateCls(value: number): Rating {
  if (value <= CWV_THRESHOLDS.cls.good) return "good";
  if (value <= CWV_THRESHOLDS.cls.poor) return "needs-improvement";
  return "poor";
}

// ── LCP discovery (step 2) ────────────────────────────────────────
// Real PerformanceObserver picks the candidate with the largest rendered area.
// The pre-existing implementation leaked the answer via CSS `:first-child`.
// We now compute the LCP candidate from `area` so layout has no hint.

export type LcpCandidateType = "img" | "video-poster" | "text-block" | "background-image" | "non-candidate";

export type LcpElement = {
  id: string;
  label: string;
  /** rendered area as a fraction of the viewport (impact fraction) */
  area: number;
  type: LcpCandidateType;
  /** why this is or isn't the LCP element */
  reason: string;
};

export function pickLcpCandidate(elements: readonly LcpElement[]): LcpElement | null {
  // The LCP candidate is the largest-rendered element of a candidate type.
  // `<canvas>` and `<svg>` shapes do NOT qualify. `<image>` inside SVG is
  // technically a candidate but is rare in practice; we omit it from this lab.
  const candidates = elements.filter((e) => e.type !== "non-candidate");
  if (candidates.length === 0) return null;
  return candidates.reduce((largest, el) => (el.area > largest.area ? el : largest));
}

// ── INP phase math (step 4) ──────────────────────────────────────
// INP = input delay + processing + presentation.

export type InpPhase = "input-delay" | "processing" | "presentation";

export type InpBreakdown = Record<InpPhase, number>;

export function sumInp(breakdown: InpBreakdown): number {
  return breakdown["input-delay"] + breakdown.processing + breakdown.presentation;
}

// ── CLS session windows (step 6) ─────────────────────────────────
// CRITICAL: CLS is NOT a sum of all shifts.
// Spec: cluster shifts into windows. A new window starts when the gap from
// the previous shift exceeds 1 second OR when the window's elapsed duration
// would exceed 5 seconds. CLS is the maximum window score.
// https://web.dev/articles/cls#session_window

export type LayoutShift = {
  id: string;
  /** time the shift occurred (ms) */
  atMs: number;
  /** shift score: impact fraction × distance fraction */
  score: number;
  /** human label for the source element */
  source: string;
};

export type ClsWindow = {
  shifts: LayoutShift[];
  startMs: number;
  endMs: number;
  total: number;
};

const SESSION_GAP_MS = 1000;
const SESSION_MAX_MS = 5000;

export function groupClsWindows(shifts: readonly LayoutShift[]): ClsWindow[] {
  if (shifts.length === 0) return [];
  const ordered = [...shifts].sort((a, b) => a.atMs - b.atMs);
  const windows: ClsWindow[] = [];

  for (const shift of ordered) {
    const current = windows[windows.length - 1];
    const startsNewWindow =
      !current ||
      shift.atMs - current.shifts[current.shifts.length - 1].atMs > SESSION_GAP_MS ||
      shift.atMs - current.startMs > SESSION_MAX_MS;

    if (startsNewWindow) {
      windows.push({
        shifts: [shift],
        startMs: shift.atMs,
        endMs: shift.atMs,
        total: shift.score,
      });
    } else {
      current.shifts.push(shift);
      current.endMs = shift.atMs;
      current.total = round3(current.total + shift.score);
    }
  }

  return windows;
}

export function computeClsFromWindows(windows: readonly ClsWindow[]): number {
  if (windows.length === 0) return 0;
  return round3(Math.max(...windows.map((w) => w.total)));
}

export function computeCls(shifts: readonly LayoutShift[]): number {
  return computeClsFromWindows(groupClsWindows(shifts));
}

// ── Field vs lab (step 7) ────────────────────────────────────────
// Field is ALWAYS slower than lab — the gap shrinks as device-quality rises.
// p75 represents the slow quartile of real users; lab is a single optimistic
// machine. We model this as: field = lab × max(1, gap(deviceQuality)).

export type LabFieldMetrics = {
  labLcpMs: number;
  fieldLcpMs: number;
  labInpMs: number;
  fieldInpMs: number;
  labCls: number;
  fieldCls: number;
};

/**
 * deviceQuality 0..100 — 0 means the p75 user has terrible hardware
 * (max gap), 100 means even the slow quartile is on modern phones, but
 * field NEVER catches lab: a single optimistic machine always beats the
 * slow quartile of real users. We clamp the floor at 1.3× to keep the
 * lesson honest across the whole slider.
 */
export function fieldGap(deviceQuality: number): number {
  const q = Math.max(0, Math.min(100, deviceQuality));
  // Quality 0 → gap ≈ 3.0×, quality 100 → gap ≈ 1.3× (field never beats lab).
  return Math.max(1.3, 3.0 - 0.017 * q);
}

export function computeLabField(labLcpMs: number, labInpMs: number, labCls: number, deviceQuality: number): LabFieldMetrics {
  const gap = fieldGap(deviceQuality);
  // CLS scales more weakly with device speed — layout decisions, not CPU.
  const clsGap = 1 + (gap - 1) * 0.4;
  return {
    labLcpMs,
    fieldLcpMs: Math.round(labLcpMs * gap),
    labInpMs,
    fieldInpMs: Math.round(labInpMs * gap),
    labCls,
    fieldCls: round3(labCls * clsGap),
  };
}

// ── Formatting helpers ────────────────────────────────────────────

export function formatLcp(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}

export function formatInp(ms: number): string {
  return `${Math.round(ms)}ms`;
}

export function formatCls(value: number): string {
  return value.toFixed(2);
}

export function formatRating(rating: Rating): string {
  if (rating === "good") return "Good";
  if (rating === "needs-improvement") return "Needs work";
  return "Poor";
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
