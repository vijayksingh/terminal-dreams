// ── RequirementLab v3 — Probe Triage ────────────────────────────────
//
// Mechanic: the learner sees a wall of candidate probes and must pick
// which ones to "ask" given a finite question budget. Probes' qualities
// and consequences are hidden until submit — the cognitive work is
// JUDGING which probes surface architectural pressure, not producing
// them by typing.
//
// Why this shape: it scales without an LLM. We author a finite probe
// library; the learner exercises judgment about probe quality, which
// transfers to real requirements gathering directly.

export type CardKind = "actor" | "entity" | "flow" | "constraint" | "boundary";

export type KindMeta = {
  label: string;
  frame: string;
  tone: string;
  blurb: string;
};

export const KIND_META: Record<CardKind, KindMeta> = {
  actor: {
    label: "Actor",
    frame: "Who",
    tone: "var(--diagram-layer-9)",
    blurb: "The people the system serves",
  },
  entity: {
    label: "Entity",
    frame: "What",
    tone: "var(--diagram-layer-1)",
    blurb: "The data the system holds",
  },
  flow: {
    label: "Flow",
    frame: "How",
    tone: "var(--diagram-layer-2)",
    blurb: "The workflows the system runs",
  },
  constraint: {
    label: "Constraint",
    frame: "Must",
    tone: "var(--diagram-layer-3)",
    blurb: "The invariants the system honors",
  },
  boundary: {
    label: "Boundary",
    frame: "Not",
    tone: "var(--diagram-layer-8)",
    blurb: "What is deliberately excluded",
  },
};

export const KIND_ORDER: CardKind[] = [
  "actor",
  "entity",
  "flow",
  "constraint",
  "boundary",
];

// ── Probe flavors (the meta-taxonomy of stress tests) ────────────────

export type ProbeFlavor =
  | "scale"
  | "concurrency"
  | "failure"
  | "context"
  | "ambition";

export type FlavorMeta = {
  label: string;
  one_liner: string;
  tone: string;
};

export const FLAVOR_META: Record<ProbeFlavor, FlavorMeta> = {
  scale: {
    label: "scale",
    one_liner: "what if there are N of it",
    tone: "var(--diagram-layer-1)",
  },
  concurrency: {
    label: "concurrency",
    one_liner: "what if X and Y happen at once",
    tone: "var(--diagram-layer-2)",
  },
  failure: {
    label: "failure",
    one_liner: "what if X breaks or is unreachable",
    tone: "var(--diagram-layer-4)",
  },
  context: {
    label: "context",
    one_liner: "what if the user is somewhere different",
    tone: "var(--diagram-layer-7)",
  },
  ambition: {
    label: "ambition",
    one_liner: "what if we wanted feature X",
    tone: "var(--diagram-layer-9)",
  },
};

export const FLAVOR_ORDER: ProbeFlavor[] = [
  "scale",
  "concurrency",
  "failure",
  "context",
  "ambition",
];

// ── Probe quality (hidden during selection, revealed on submit) ──────

export type ProbeQuality = "high" | "medium" | "low" | "trap";

export type TrapKind = "tech-bait" | "vague" | "answered" | "off-topic";

export type SurfaceTemplate = {
  surfaceId: string;
  kind: CardKind;
  title: string;
  detail: string;
};

export type ProbeCard = {
  id: string;
  /** What the learner reads when choosing. Quality not visible here. */
  text: string;
  /** Hidden until reveal. */
  flavor: ProbeFlavor;
  quality: ProbeQuality;
  /** For high/medium probes: the architect's response. */
  response?: string;
  /** One-line takeaway. */
  teaching?: string;
  /** Cards surfaced into scope. */
  surfaces?: SurfaceTemplate[];
  /** For low/trap probes: why this wasn't productive. */
  critique?: string;
  /** For trap probes specifically. */
  trapKind?: TrapKind;
};

// ── Scope (after picks reveal) ────────────────────────────────────────

export type ScopeCard = {
  id: string;
  kind: CardKind;
  title: string;
  detail: string;
  surfacedBy: string;
  ts: number;
};

// ── Lab states ────────────────────────────────────────────────────────

export type LabPhase = "selecting" | "revealing" | "complete";

// ── Config + props ────────────────────────────────────────────────────

export type ProbeTriageConfig = {
  briefTitle: string;
  briefBody: string;
  briefFacts: string[];
  /** Number of probes the learner can pick. Default: 5. */
  budget: number;
  /** The candidate probes. Display order is randomized at mount. */
  library: ProbeCard[];
};

export type ProbeTriageProps = {
  config: ProbeTriageConfig;
};

// ── Derived: scoreboard after reveal ──────────────────────────────────

export type Scoreboard = {
  picked: number;
  budget: number;
  /** High-value probes picked. */
  hits: ProbeCard[];
  /** Medium-value probes picked. */
  marginals: ProbeCard[];
  /** Low-value probes picked (answered in brief). */
  wasted: ProbeCard[];
  /** Trap probes picked. */
  traps: ProbeCard[];
  /** High-value probes NOT picked — what you missed. */
  regret: ProbeCard[];
  /** Flavors exercised (from hits + marginals). */
  flavorsCovered: Set<ProbeFlavor>;
  /** Kinds surfaced (cards present in scope). */
  kindsCovered: Set<CardKind>;
};
