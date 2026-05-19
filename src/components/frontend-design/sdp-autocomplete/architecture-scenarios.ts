import type {
  ArchScenarioPlayerConfig,
  ArchTypeDef,
  ArchStep,
} from "@/components/sdp/architecture-scenario-player";
import type { FlowNode, FlowEdge } from "@/mdx/shared/flow-diagram";

// ── Geometry ───────────────────────────────────────────────────────

const NODES: FlowNode[] = [
  {
    id: "input",
    label: "SearchInput",
    sublabel: "keystrokes · combobox · aria",
    x: 158,
    y: 6,
    w: 164,
    h: 22,
  },
  {
    id: "controller",
    label: "SearchController — state owner",
    sublabel: "query · results · highlightedIndex · isOpen",
    x: 40,
    y: 46,
    w: 400,
    h: 28,
  },
  {
    id: "debounce",
    label: "DebounceTimer",
    sublabel: "300ms · reset on keystroke",
    x: 36,
    y: 96,
    w: 120,
    h: 24,
  },
  {
    id: "abort",
    label: "AbortManager",
    sublabel: "AbortController · signal",
    x: 170,
    y: 96,
    w: 120,
    h: 24,
  },
  {
    id: "trie",
    label: "TrieCache",
    sublabel: "prefix tree · O(k) lookup",
    x: 304,
    y: 96,
    w: 120,
    h: 24,
  },
  {
    id: "network",
    label: "NetworkLayer",
    sublabel: "fetch · signal · retry",
    x: 170,
    y: 138,
    w: 120,
    h: 22,
  },
  {
    id: "results",
    label: "ResultList",
    sublabel: "highlight · keyboard · listbox",
    x: 36,
    y: 138,
    w: 120,
    h: 22,
  },
];

const EDGES: FlowEdge[] = [
  { from: "input", to: "controller", verb: "emits keystrokes" },
  { from: "controller", to: "debounce", verb: "schedules query" },
  { from: "controller", to: "abort", verb: "manages cancellation" },
  { from: "controller", to: "trie", verb: "checks cache" },
  { from: "debounce", to: "abort", verb: "fires after quiet period" },
  { from: "abort", to: "network", verb: "passes signal" },
  { from: "network", to: "trie", verb: "stores results" },
  { from: "controller", to: "results", verb: "passes results[]" },
  {
    from: "results",
    to: "controller",
    dashed: true,
    verb: "fires onSelect",
    pathOverride: "M 36,149 C 6,149 6,60 40,60",
    midpointOverride: { x: 6, y: 105 },
  },
  {
    from: "trie",
    to: "controller",
    dashed: true,
    verb: "returns cached results",
    pathOverride: "M 424,108 C 474,108 474,60 440,60",
    midpointOverride: { x: 474, y: 84 },
  },
];

// ── Type definitions ───────────────────────────────────────────────

const T_SearchResult: ArchTypeDef = {
  name: "SearchResult",
  kind: "API response",
  fields: [
    { name: "text", type: "string", note: "display label" },
    { name: "score", type: "number", note: "relevance 0–1" },
    { name: "category", type: "string?", note: "optional grouping" },
  ],
};

const T_TrieNode: ArchTypeDef = {
  name: "TrieNode",
  kind: "state",
  fields: [
    { name: "children", type: "Map<char, TrieNode>", note: "branching edges" },
    { name: "results", type: "string[] | null", note: "cached at this prefix" },
    { name: "accessCount", type: "number", note: "LRU tracking" },
  ],
};

const T_DebounceState: ArchTypeDef = {
  name: "DebounceState",
  kind: "state",
  fields: [
    { name: "timerId", type: "number | null", note: "pending setTimeout" },
    { name: "pendingQuery", type: "string", note: "buffered input" },
    { name: "delay", type: "number", note: "ms (default 300)" },
  ],
};

// ── Scenarios ──────────────────────────────────────────────────────

const searchFlow: ArchStep[] = [
  { nodeId: "input", caption: "User types 'rea' — each keystroke triggers onChange" },
  { nodeId: "controller", caption: "Controller receives the full query string 'rea'", payload: { type: T_DebounceState } },
  { nodeId: "debounce", caption: "Debounce timer starts — 300ms countdown begins. Previous timer cleared." },
  { nodeId: "debounce", caption: "⏳ Waiting... if user types another key, timer resets to 300ms" },
  { nodeId: "trie", caption: "Timer fires → controller checks trie cache for prefix 'rea'", payload: { type: T_TrieNode } },
  { nodeId: "abort", caption: "Cache miss → abort any previous request, create new AbortController" },
  { nodeId: "network", caption: "Fetch fires with signal attached. Server processes 'rea'", payload: { type: T_SearchResult } },
  { nodeId: "trie", caption: "Response arrives → results cached in trie at prefix 'rea'", payload: { type: T_TrieNode } },
  { nodeId: "results", caption: "Results rendered in dropdown. highlightedIndex = -1 (none selected)", payload: { type: T_SearchResult } },
];

const cacheHitFlow: ArchStep[] = [
  { nodeId: "input", caption: "User types 'rea' again — same prefix as before" },
  { nodeId: "controller", caption: "Controller receives query 'rea'" },
  { nodeId: "debounce", caption: "Debounce timer starts (still 300ms wait)", payload: { type: T_DebounceState } },
  { nodeId: "trie", caption: "Timer fires → trie lookup for 'rea' — CACHE HIT! No network needed.", payload: { type: T_TrieNode } },
  { nodeId: "results", caption: "Cached results rendered instantly. Zero network cost.", payload: { type: T_SearchResult } },
];

const raceConditionFlow: ArchStep[] = [
  { nodeId: "input", caption: "User types 'j' — debounce fires, request A starts (slow: 800ms)" },
  { nodeId: "network", caption: "User types 'ja' quickly — debounce fires, request B starts (fast: 200ms)" },
  { nodeId: "abort", caption: "AbortController.abort() called on request A. Signal.aborted = true." },
  { nodeId: "network", caption: "Request A's fetch catches AbortError — silently ignored. Request B in flight." },
  { nodeId: "trie", caption: "Request B responds with 'ja' results — correct and current. No stale overwrites.", payload: { type: T_SearchResult } },
  { nodeId: "results", caption: "Results for 'ja' displayed. Without AbortController, request A's stale results would overwrite." },
];

const keyboardFlow: ArchStep[] = [
  { nodeId: "input", caption: "User presses ↓ arrow key while dropdown is open" },
  { nodeId: "controller", caption: "Controller increments highlightedIndex from -1 to 0 (first result)" },
  { nodeId: "results", caption: "ResultList renders with first item highlighted. aria-activedescendant updated.", payload: { type: T_SearchResult } },
  { nodeId: "input", caption: "User presses Enter — selects highlighted result" },
  { nodeId: "controller", caption: "query = selectedResult.text, isOpen = false, highlightedIndex = -1" },
];

export const AUTOCOMPLETE_ARCH_CONFIG: ArchScenarioPlayerConfig = {
  thesis: "An autocomplete decomposes into six cooperating subsystems: input handling, debounce timing, request cancellation, prefix caching, network transport, and result rendering.",
  nodes: NODES,
  edges: EDGES,
  protagonist: "controller",
  scenarios: [
    { id: "search", label: "Search", blurb: "Full search flow from keystroke to rendered results", steps: searchFlow },
    { id: "cache-hit", label: "Cache hit", blurb: "Trie lookup bypasses the network entirely", steps: cacheHitFlow },
    { id: "race", label: "Race condition", blurb: "AbortController prevents stale response overwrites", steps: raceConditionFlow },
    { id: "keyboard", label: "Keyboard nav", blurb: "Arrow keys navigate results without losing input focus", steps: keyboardFlow },
  ],
  viewBox: "0 0 490 176",
};
