"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { highlight, type Segment } from "./highlight";
import type { StateEntry } from "../StateInspector";

// ── Feature types ──────────────────────────────────────────────────

export type Feature = "input" | "filter" | "highlight" | "empty";
export type ExtraFeature = "clear" | "count" | "sort";

export type FeatureMeta = { id: Feature; label: string; step: number };
export type ExtraFeatureMeta = { id: ExtraFeature; label: string; props: number };

export const FEATURES: FeatureMeta[] = [
  { id: "input", label: "Search Input", step: 2 },
  { id: "filter", label: "Live Filtering", step: 3 },
  { id: "highlight", label: "Match Highlight", step: 4 },
  { id: "empty", label: "Empty State", step: 5 },
];

export const EXTRA_FEATURES: ExtraFeatureMeta[] = [
  { id: "clear", label: "Clear Button", props: 1 },
  { id: "count", label: "Result Count", props: 1 },
  { id: "sort", label: "Sort Toggle", props: 2 },
];

const STEP_FEATURES: Record<number, Feature[]> = {
  1: [],
  2: ["input"],
  3: ["input", "filter"],
  4: ["input", "filter", "highlight"],
  5: ["input", "filter", "highlight", "empty"],
  6: ["input", "filter", "highlight", "empty"],
  7: ["input", "filter", "highlight", "empty"],
  8: ["input", "filter", "highlight", "empty"],
  9: ["input", "filter", "highlight", "empty"],
};

export const ITEMS = ["Apple", "Banana", "Cherry", "Date", "Elderberry"];

// ── Layout for step 8 (prop-driven) ──────────────────────────────

export type LayoutId = "default" | "count-above" | "sort-bottom";

export type LayoutPreset = {
  id: LayoutId;
  label: string;
  description: string;
  propsNeeded: string[];
};

export const LAYOUT_PRESETS: LayoutPreset[] = [
  { id: "default", label: "Default", description: "Count in header, controls beside input", propsNeeded: [] },
  { id: "count-above", label: "Count above input", description: "Standalone count line above search", propsNeeded: ["countPosition"] },
  { id: "sort-bottom", label: "Sort in footer", description: "Sort toggle below the list, not in header", propsNeeded: ["sortPosition"] },
];

// ── Layout slots for step 9 (composition-driven) ─────────────────

export type SlotId = "input" | "count" | "list" | "inspector";

export const DEFAULT_SLOT_ORDER: SlotId[] = [
  "input",
  "count",
  "list",
  "inspector",
];

// ── Phase helpers ──────────────────────────────────────────────────

export type Phase = "basics" | "growing" | "composition";

export function getPhase(step: number): Phase {
  if (step <= 6) return "basics";
  if (step <= 8) return "growing";
  return "composition";
}

// ── Context shape ──────────────────────────────────────────────────

type SearchContextValue = {
  activeStep: number;
  phase: Phase;

  // Query
  query: string;
  setQuery: (q: string) => void;

  // Feature toggles (steps 1-6)
  enabled: Set<Feature>;
  toggle: (id: Feature) => void;
  userOverride: boolean;
  stepFeatures: Feature[];

  // Extra features (steps 7-8)
  extras: Set<ExtraFeature>;
  toggleExtra: (id: ExtraFeature) => void;
  propCount: number;

  // Sort (step 7+)
  sortOrder: "none" | "asc";
  toggleSort: () => void;

  // Computed flags
  hasInput: boolean;
  hasFilter: boolean;
  hasHighlight: boolean;
  hasEmpty: boolean;
  hasClear: boolean;
  hasCount: boolean;
  hasSort: boolean;

  // Results
  items: string[];
  results: string[];
  sortedResults: string[];
  derivedResults: string[];
  isEmpty: boolean;

  // Naive mode
  naiveMode: boolean;
  setNaiveMode: (v: boolean | ((prev: boolean) => boolean)) => void;
  isStale: boolean;
  naiveResults: string[];

  // Layout (step 8 — prop-driven)
  layoutId: LayoutId;
  setLayoutId: (id: LayoutId) => void;
  layoutPropCost: number;

  // Layout (step 9 — composition-driven)
  slotOrder: SlotId[];
  moveSlot: (id: SlotId, direction: "up" | "down") => void;

  // Rendering
  renderCount: number;
  highlightText: (text: string) => Segment[];

  // State inspector
  stateEntries: StateEntry[];
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function useSearchDemo() {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("useSearchDemo must be used within <SearchDemoRoot>");
  }
  return ctx;
}

// ── Naive filter hook ──────────────────────────────────────────────

function useNaiveFilter(items: string[], query: string, active: boolean) {
  const [staleResults, setStaleResults] = useState(items);

  useEffect(() => {
    if (!active) return;
    const id = requestAnimationFrame(() => {
      setStaleResults(
        items.filter((item) =>
          item.toLowerCase().includes(query.toLowerCase())
        )
      );
    });
    return () => cancelAnimationFrame(id);
  }, [items, query, active]);

  useEffect(() => {
    if (!active) setStaleResults(items);
  }, [active, items]);

  return staleResults;
}

// ── Provider ───────────────────────────────────────────────────────

type SearchDemoRootProps = {
  activeStep: number;
  children: ReactNode;
};

export function SearchDemoRoot({ activeStep, children }: SearchDemoRootProps) {
  const phase = getPhase(activeStep);
  const [enabled, setEnabled] = useState<Set<Feature>>(new Set());
  const [query, setQuery] = useState("");
  const [userOverride, setUserOverride] = useState(false);
  const [naiveMode, setNaiveMode] = useState(false);
  const [extras, setExtras] = useState<Set<ExtraFeature>>(new Set());
  const [sortOrder, setSortOrder] = useState<"none" | "asc">("none");
  const [layoutId, setLayoutId] = useState<LayoutId>("default");
  const [slotOrder, setSlotOrder] = useState<SlotId[]>(DEFAULT_SLOT_ORDER);
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  const stepFeatures = STEP_FEATURES[activeStep] ?? [];

  useEffect(() => {
    if (!userOverride) {
      setEnabled(new Set(stepFeatures));
    }
  }, [activeStep, userOverride]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    setUserOverride(false);
    setNaiveMode(false);
    setExtras(new Set());
    setSortOrder("none");
    setLayoutId("default");
    if (prevPhaseRef.current !== phase) {
      setQuery("");
      prevPhaseRef.current = phase;
    }
    if (activeStep === 9) {
      setSlotOrder(DEFAULT_SLOT_ORDER);
    }
  }, [activeStep, phase]);

  const toggle = useCallback((id: Feature) => {
    setUserOverride(true);
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleExtra = useCallback((id: ExtraFeature) => {
    setExtras((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSort = useCallback(() => {
    setSortOrder((prev) => (prev === "none" ? "asc" : "none"));
  }, []);

  const moveSlot = useCallback((id: SlotId, direction: "up" | "down") => {
    setSlotOrder((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    });
  }, []);

  const hasInput = enabled.has("input");
  const hasFilter = enabled.has("filter");
  const hasHighlight = enabled.has("highlight");
  const hasEmpty = enabled.has("empty");
  const hasClear = extras.has("clear");
  const hasCount = extras.has("count");
  const hasSort = extras.has("sort");

  const derivedResults = hasFilter
    ? ITEMS.filter((item) => item.toLowerCase().includes(query.toLowerCase()))
    : ITEMS;

  const naiveResults = useNaiveFilter(ITEMS, query, naiveMode && hasFilter);
  const results = naiveMode && hasFilter ? naiveResults : derivedResults;

  const sortedResults = useMemo(() => {
    if (sortOrder === "asc") return [...results].sort();
    return results;
  }, [results, sortOrder]);

  const isEmpty = hasEmpty && sortedResults.length === 0 && query.length > 0;
  const isStale = naiveMode && hasFilter && naiveResults.length !== derivedResults.length;

  const layoutPreset = LAYOUT_PRESETS.find((l) => l.id === layoutId)!;
  const layoutPropCost = layoutPreset.propsNeeded.length;

  // Prop count: base props + extras + layout props
  const propCount = useMemo(() => {
    let count = 2; // items, placeholder (base)
    if (hasFilter) count += 1;
    if (hasHighlight) count += 1;
    if (hasEmpty) count += 1;
    EXTRA_FEATURES.forEach((ef) => {
      if (extras.has(ef.id)) count += ef.props;
    });
    count += layoutPropCost;
    return count;
  }, [hasFilter, hasHighlight, hasEmpty, extras, layoutPropCost]);

  const highlightText = useCallback(
    (text: string) => highlight(text, query),
    [query]
  );

  const stateEntries = useMemo((): StateEntry[] => {
    const entries: StateEntry[] = [];

    if (hasInput) {
      entries.push({ label: "query", value: query, highlight: query.length > 0 });
    }

    entries.push({ label: "items", value: ITEMS });

    if (hasFilter) {
      entries.push({
        label: "results",
        value: sortedResults,
        highlight: sortedResults.length !== ITEMS.length,
      });
      entries.push({
        label: "results.length",
        value: sortedResults.length,
        highlight: sortedResults.length !== ITEMS.length,
      });
      if (naiveMode) {
        entries.push({ label: "stale", value: isStale, highlight: isStale });
      }
    }

    if (hasSort) {
      entries.push({ label: "sortOrder", value: sortOrder, highlight: sortOrder !== "none" });
    }

    if (hasHighlight && query.length > 0 && sortedResults.length > 0) {
      const segments = highlight(sortedResults[0], query);
      entries.push({
        label: `segments("${sortedResults[0]}")`,
        value: segments.map((s) => (s.match ? `[${s.text}]` : s.text)).join(""),
      });
    }

    if (hasEmpty) {
      entries.push({ label: "isEmpty", value: isEmpty, highlight: isEmpty });
    }

    if (phase === "growing") {
      entries.push({ label: "propCount", value: propCount, highlight: propCount > 5 });
      if (layoutId !== "default") {
        entries.push({ label: "layout", value: layoutId, highlight: true });
        entries.push({ label: "layoutProps", value: layoutPreset.propsNeeded, highlight: true });
      }
    }

    return entries;
  }, [query, sortedResults, hasInput, hasFilter, hasHighlight, hasEmpty, hasSort, isEmpty, naiveMode, isStale, sortOrder, phase, propCount, layoutId, layoutPreset]);

  const value = useMemo(
    (): SearchContextValue => ({
      activeStep,
      phase,
      query,
      setQuery,
      enabled,
      toggle,
      userOverride,
      stepFeatures,
      extras,
      toggleExtra,
      propCount,
      sortOrder,
      toggleSort,
      hasInput,
      hasFilter,
      hasHighlight,
      hasEmpty,
      hasClear,
      hasCount,
      hasSort,
      items: ITEMS,
      results: sortedResults,
      sortedResults,
      derivedResults,
      isEmpty,
      naiveMode,
      setNaiveMode,
      isStale,
      naiveResults,
      layoutId,
      setLayoutId,
      layoutPropCost,
      slotOrder,
      moveSlot,
      renderCount: renderCountRef.current,
      highlightText,
      stateEntries,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      activeStep, phase, query, enabled, toggle, userOverride,
      extras, toggleExtra, propCount, sortOrder, toggleSort,
      hasInput, hasFilter, hasHighlight, hasEmpty,
      hasClear, hasCount, hasSort,
      sortedResults, derivedResults, isEmpty,
      naiveMode, isStale, naiveResults,
      layoutId, layoutPropCost,
      slotOrder, moveSlot, highlightText, stateEntries,
    ]
  );

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}
