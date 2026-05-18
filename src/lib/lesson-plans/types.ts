// ── Frontend Design Lesson Plan — Shared Types ────────────────
//
// Every stop maps to a lesson with specific interactive mechanics.
// Agents building content import `getLessonMeta(stopId)` to know
// exactly what to scaffold.
//
// DESIGN PHILOSOPHY:
// 1. The interactive IS the lesson, not a supplement to prose.
// 2. Scrollytelling is the primary narrative device — sticky visual
//    that transforms as the reader scrolls through explanation steps.
// 3. Readers discover concepts through manipulation, not reading.
// 4. Each interaction should produce an "aha moment" that couldn't
//    happen through text alone.

// ── Format definitions ─────────────────────────────────────────

export type LessonFormat =
  | "scrollytelling"
  | "explorable"
  | "challenge-chain"
  | "build-along"
  | "battle"
  | "anatomy"
  | "playground"
  | "system-design";

export type Effort = "small" | "medium" | "large" | "xl";

export type ScrollStep = {
  /** What the sticky visual shows at this scroll position */
  visual: string;
  /** The prose paragraph the reader sees (1-3 sentences max) */
  narrative: string;
  /** Any reader interaction available at this step */
  interaction?: string;
};

export type DiscoveryMechanic = {
  /** What the reader does */
  action: string;
  /** What they see happen */
  reaction: string;
  /** The concept this teaches (the aha) */
  teaches: string;
};

export type InteractiveSpec = {
  component: string;
  description: string;
  reuses?: string[];
};

export type LessonMeta = {
  stopId: string;
  format: LessonFormat;
  effort: Effort;
  /** Max prose — scrollytelling steps count, not separate article text */
  proseTarget: [number, number];
  /** Interactive components to build */
  interactives: InteractiveSpec[];
  /** Scroll steps for scrollytelling lessons */
  scrollSteps?: ScrollStep[];
  /** Discovery mechanics — how interaction teaches */
  discoveries: DiscoveryMechanic[];
  learningOutcome: string;
  agentNotes: string;
};

// ── Format guide (for agents) ──────────────────────────────────
//
// scrollytelling
//   THE primary format. Two-column layout:
//   - Sticky side (60% width): interactive visualization that
//     transforms at each scroll trigger point.
//   - Scroll side (40% width): short narrative steps (2-4 sentences
//     each) that the reader scrolls through.
//   The visual NEVER resets — it builds cumulatively. By the end of
//   the scroll, the reader has watched the full concept construct
//   itself piece by piece.
//   Technical: IntersectionObserver on step markers triggers state
//   changes on the sticky visual. Each step = a state index.
//   Reduced motion: all transitions instant, scroll still works.
//   Examples: Rendering Pipeline, Event Loop, CORS, OAuth, ISR
//
// explorable
//   No guided narrative. Reader is dropped into an interactive
//   environment with a goal/question. They discover the answer
//   through experimentation. Small "nudge" hints appear if stuck.
//   Think: Nicky Case's Explorable Explanations.
//   Layout: full-width interactive with thin instruction bar.
//   Prose: question/challenge framing (50-100 words), then the
//   interactive IS the content. Summary insight at the end.
//   Examples: Box Model, Stacking Context, Formatting Context
//
// challenge-chain
//   Sequence of 4-8 micro-challenges that build on each other.
//   Each challenge: small code editor or interactive puzzle.
//   Complete one → unlock next → concepts compound.
//   Failed attempts get specific feedback (not just "wrong").
//   Layout: single challenge visible at a time, progress bar at top.
//   Prose: challenge description (1-2 sentences), then the editor/puzzle.
//   Examples: Coding Assignments, XSS (try to bypass sanitization)
//
// build-along
//   Scroll-driven code evolution. As reader scrolls, code changes
//   appear as diffs AND the live preview updates simultaneously.
//   Reader CAN edit any step and see their change cascade forward.
//   Layout: scrollytelling variant — sticky code+preview, scroll
//   narration explains each diff.
//   Key: FPS/perf counter visible throughout, showing impact of
//   each addition.
//   Examples: Virtual Scroll Implementation
//
// battle
//   Two (or three) approaches compete on the same task with
//   shared controls. Reader configures the scenario (data size,
//   network speed, etc.) and watches approaches handle it live.
//   Animated metrics: FPS, latency, bytes, DOM nodes, memory.
//   The reader discovers which approach wins WHERE — not a static
//   comparison but a dynamic "race."
//   Layout: side-by-side panels with shared control bar above,
//   live metric dashboard below.
//   Examples: Canvas vs DOM, HTTP/1.1 vs 2 vs 3, CSR vs SSR vs SSG
//
// anatomy
//   A complex artifact (HTTP request, OAuth flow, browser DevTools
//   panel, component tree) is rendered at full fidelity. Reader
//   hovers/clicks regions to "dissect" them — each region expands
//   into an explanation with mini-interactive.
//   Like a medical anatomy atlas but for web concepts.
//   Layout: full-width diagram, click regions expand inline.
//   Prose: only appears on interaction (tooltip + expandable detail).
//   Examples: DOM API Refresher, Observer Overview, Browser Storage
//
// playground
//   Completely open-ended tool. Reader builds/configures something
//   and sees the result. No guided flow, no challenges — just a
//   well-designed instrument. Good for "builder" topics.
//   Layout: full-width tool with output panel.
//   Prose: minimal usage instructions only.
//   Examples: CSP Builder, Cookie Lab, srcset Builder
//
// system-design
//   Scrollytelling architecture walkthrough PLUS a working mini-app
//   demo of the core mechanic. Structure:
//   Phase 1: Scrollytelling — requirements → architecture diagram
//     builds up component by component as reader scrolls.
//   Phase 2: Working demo — the "core mechanic" as an interactive
//     you can actually use (infinite scroll, drag-drop, etc.)
//   Phase 3: Scrollytelling — tradeoffs, edge cases, alternatives.
//   Prose: ~1500-2500 words across all scroll steps.
//   Examples: All 12 system design problems

// ── Shared layout primitives to build ──────────────────────────
//
// These are reusable layout components that individual lessons compose:
//
// ScrollytellingShell
//   Props: steps: ScrollStep[], renderVisual: (stepIndex) => ReactNode
//   Handles: IntersectionObserver on step markers, sticky positioning,
//   step index state, scroll progress bar, reduced-motion fallback.
//   Two variants: visual-left (default) or visual-right.
//
// BattleArena
//   Props: approaches: Approach[], sharedControls: Control[],
//          metrics: Metric[]
//   Handles: side-by-side layout, shared input routing, live metric
//   dashboard with animated counters, winner highlighting.
//
// ChallengeRunner
//   Props: challenges: Challenge[], onComplete: () => void
//   Handles: sequential unlock, progress bar, code editor integration,
//   test runner, hint system (3 progressive hints per challenge),
//   solution reveal, failure feedback.
//
// AnatomyViewer
//   Props: regions: Region[], renderDiagram: () => ReactNode
//   Handles: hover/click region detection, inline expansion,
//   tooltip positioning, breadcrumb trail of explored regions.
//
// CodeEvolution
//   Props: steps: CodeStep[], language: string
//   Handles: diff rendering (green/red), step animation on scroll,
//   editable code per step, live preview, metric overlay.
