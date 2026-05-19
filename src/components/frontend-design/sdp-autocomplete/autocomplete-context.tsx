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
import type { StateEntry } from "@/components/recipe-lab/StateInspector";

// ── Types ───────────────────────────────────────────────────────────

export type Phase = "planning" | "building" | "optimizing" | "polishing" | "production";

export type RequestStatus = "in-flight" | "aborted" | "completed" | "cached" | "failed";

export type TrackedRequest = {
  id: number;
  term: string;
  status: RequestStatus;
  timestamp: number;
  duration?: number;
};

export type ScopeItem = {
  id: string;
  label: string;
  description: string;
};

export type ApiEndpoint = {
  method: "GET" | "POST";
  path: string;
  description: string;
  usedBy: string;
  params: { name: string; type: string; note: string }[];
  responseType: string;
};

export type TypeField = {
  name: string;
  type: string;
  note?: string;
};

export type TypeDef = {
  name: string;
  category: "api" | "state" | "props";
  fields: TypeField[];
};

const MAX_TRACKED_REQUESTS = 50;
const DEBOUNCE_RESET_DELAY_MS = 120;

// ── Trie data structure ─────────────────────────────────────────────

export interface TrieNode {
  children: Map<string, TrieNode>;
  results: string[] | null;
  insertedAt: number;
  accessCount: number;
}

function createTrieNode(): TrieNode {
  return { children: new Map(), results: null, insertedAt: Date.now(), accessCount: 0 };
}

export interface TrieState {
  root: TrieNode;
  nodeCount: number;
  cacheCount: number;
}

function createTrie(): TrieState {
  return { root: createTrieNode(), nodeCount: 1, cacheCount: 0 };
}

function trieCollectCached(
  node: TrieNode,
  prefix: string,
  out: { prefix: string; node: TrieNode }[]
): void {
  if (node.results !== null) out.push({ prefix, node });
  for (const [char, child] of node.children) {
    trieCollectCached(child, prefix + char, out);
  }
}

function trieEvict(trie: TrieState, maxSize: number): TrieState {
  if (trie.cacheCount <= maxSize) return trie;
  const cached: { prefix: string; node: TrieNode }[] = [];
  trieCollectCached(trie.root, "", cached);
  cached.sort((a, b) => a.node.insertedAt - b.node.insertedAt);
  let evicted = 0;
  const toEvict = trie.cacheCount - maxSize;
  for (let i = 0; i < cached.length && evicted < toEvict; i++) {
    cached[i].node.results = null;
    cached[i].node.accessCount = 0;
    evicted++;
  }
  return {
    root: trie.root,
    nodeCount: trie.nodeCount,
    cacheCount: trie.cacheCount - evicted,
  };
}

function trieInsert(trie: TrieState, key: string, results: string[], maxSize?: number): TrieState {
  let current = trie.root;
  let added = 0;
  const lower = key.toLowerCase();
  for (const char of lower) {
    if (!current.children.has(char)) {
      current.children.set(char, createTrieNode());
      added++;
    }
    current = current.children.get(char)!;
  }
  const isNew = current.results === null;
  current.results = results;
  current.insertedAt = Date.now();
  current.accessCount++;
  let next: TrieState = {
    root: trie.root,
    nodeCount: trie.nodeCount + added,
    cacheCount: trie.cacheCount + (isNew ? 1 : 0),
  };
  if (maxSize !== undefined) next = trieEvict(next, maxSize);
  return next;
}

function trieLookup(trie: TrieState, prefix: string): string[] | null {
  let current = trie.root;
  const lower = prefix.toLowerCase();
  for (const char of lower) {
    if (!current.children.has(char)) return null;
    current = current.children.get(char)!;
  }
  if (current.results !== null) {
    current.accessCount++;
    current.insertedAt = Date.now();
  }
  return current.results;
}

// ── Constants ───────────────────────────────────────────────────────

export const TOTAL_STEPS = 15;

export const SCOPE_ITEMS: ScopeItem[] = [
  { id: "debounce", label: "Debounced input?", description: "300ms quiet period prevents request spam during fast typing" },
  { id: "abort", label: "Request cancellation?", description: "AbortController prevents stale responses from overwriting newer results" },
  { id: "cache", label: "Trie caching?", description: "Prefix tree caches results — repeated searches cost zero network requests" },
  { id: "keyboard", label: "Keyboard navigation?", description: "Arrow keys, Enter, Escape — full combobox pattern for accessibility" },
  { id: "highlight", label: "Match highlighting?", description: "XSS-safe <mark> elements show which part of each result matches the query" },
];

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/search",
    description: "Fetch search suggestions for a query prefix",
    usedBy: "SearchInput → DebounceController → NetworkLayer",
    params: [
      { name: "q", type: "string", note: "search prefix" },
      { name: "limit", type: "number", note: "max results (default 8)" },
    ],
    responseType: "SearchResult[]",
  },
  {
    method: "POST",
    path: "/api/search/log",
    description: "Log a selected search result for analytics",
    usedBy: "ResultList → onSelect callback",
    params: [
      { name: "query", type: "string", note: "original search query" },
      { name: "selected", type: "string", note: "item the user picked" },
      { name: "position", type: "number", note: "index in result list" },
    ],
    responseType: "void",
  },
];

export const DATA_MODELS: TypeDef[] = [
  {
    name: "SearchResult",
    category: "api",
    fields: [
      { name: "text", type: "string", note: "display label" },
      { name: "score", type: "number", note: "relevance (0–1)" },
      { name: "category", type: "string?", note: "optional grouping" },
    ],
  },
  {
    name: "TrieNode",
    category: "state",
    fields: [
      { name: "children", type: "Map<char, TrieNode>", note: "branching edges" },
      { name: "results", type: "string[] | null", note: "cached at this prefix" },
      { name: "accessCount", type: "number", note: "access frequency" },
      { name: "insertedAt", type: "number", note: "LRU eviction key (updated on access)" },
    ],
  },
  {
    name: "AutocompleteState",
    category: "state",
    fields: [
      { name: "query", type: "string", note: "current input value" },
      { name: "results", type: "string[]", note: "displayed suggestions" },
      { name: "highlightedIndex", type: "number", note: "-1 = none selected" },
      { name: "isOpen", type: "boolean", note: "dropdown visibility" },
      { name: "trie", type: "TrieNode", note: "prefix cache root" },
      { name: "requests", type: "TrackedRequest[]", note: "network timeline" },
    ],
  },
];

// ── Mock search data ────────────────────────────────────────────────

const TERMS: readonly string[] = [
  "Abstract Syntax Tree", "Angular", "Apollo GraphQL", "Astro",
  "Babel", "Backbone.js", "Binary Search", "Bun",
  "CSS Grid", "CSS Modules", "Closure", "Compiler", "Concurrency", "Currying",
  "D3.js", "Deno", "Docker",
  "Electron", "Elm", "ESLint", "Event Loop", "Express",
  "FastAPI", "Fiber", "Flexbox", "Flutter",
  "Garbage Collector", "Git", "Go", "GraphQL",
  "Haskell", "HTML", "HTTP/2", "Hydration",
  "Interpreter",
  "Java", "JavaScript", "Jest", "JSON", "JSX",
  "Kotlin", "Kubernetes",
  "Lazy Loading", "Linked List", "Linux", "Lisp", "LLVM", "Lua",
  "Memoization", "Microservices", "MongoDB", "Mutex", "MySQL",
  "Nest.js", "Next.js", "Node.js", "Nuxt",
  "OCaml",
  "Perl", "PHP", "PostgreSQL", "Prettier", "Promise", "Protocol Buffers", "Python",
  "React", "React Query", "Redis", "Redux", "Remix", "REST API", "Ruby", "Rust",
  "Sass", "Scala", "Semaphore", "Server Components", "Service Worker",
  "Solid.js", "SQLite", "Streaming SSR", "Svelte", "Swift",
  "Tailwind CSS", "TCP/IP", "Terraform", "Three.js", "Tree Shaking", "Trie", "TypeScript",
  "V8 Engine", "Virtual DOM", "Vite", "Vue.js",
  "WASM", "WebSocket", "Webpack",
  "XState",
  "Zig", "Zod", "Zustand",
] as const;

function searchTerms(query: string): string[] {
  const lower = query.toLowerCase();
  return TERMS.filter((t) => t.toLowerCase().includes(lower)).slice(0, 8);
}

// ── Phase + feature computation ─────────────────────────────────────

export function getPhase(step: number): Phase {
  if (step <= 3) return "planning";
  if (step <= 7) return "building";
  if (step <= 10) return "optimizing";
  if (step <= 13) return "polishing";
  return "production";
}

const FEATURE_UNLOCK: Record<string, number> = {
  basicSearch: 4,
  debounce: 5,
  abortController: 6,
  trieCache: 7,
  keyboardNav: 8,
  generationCounter: 9,
  matchHighlight: 10,
  networkError: 11,
  accessibility: 12,
  lruEviction: 13,
  compareMode: 14,
};

function isFeatureActive(feature: string, step: number, toggled: boolean): boolean {
  const unlock = FEATURE_UNLOCK[feature];
  if (!unlock) return false;
  if (step > unlock) return true;
  if (step === unlock) return toggled;
  return false;
}

// ── Context shape ───────────────────────────────────────────────────

type AutocompleteContextValue = {
  activeStep: number;
  phase: Phase;

  scopeEnabled: Set<string>;
  toggleScope: (id: string) => void;

  featureToggled: Record<string, boolean>;
  toggleFeature: (feature: string) => void;
  isActive: (feature: string) => boolean;

  // Search state
  query: string;
  setQuery: (q: string) => void;
  results: string[];
  highlightedIndex: number;
  setHighlightedIndex: (i: number) => void;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;

  // Debounce
  debounceMs: number;
  setDebounceMs: (ms: number) => void;
  debounceProgress: number;

  // Network
  requests: TrackedRequest[];
  networkDelayMs: number;
  setNetworkDelayMs: (ms: number) => void;
  networkErrorRate: number;
  setNetworkErrorRate: (r: number) => void;

  // Trie
  trie: TrieState;

  // Metrics
  totalRequests: number;
  abortedRequests: number;
  cacheHits: number;
  networkSaved: number;

  // Actions
  handleInput: (value: string) => void;
  handleKeyDown: (key: string) => void;
  handleSelect: (index: number) => void;
  clearAll: () => void;

  // State inspector
  stateEntries: StateEntry[];

  // LRU
  lruMaxSize: number;
  setLruMaxSize: (n: number) => void;
  lastEviction: { count: number; ts: number } | null;

};

const AutocompleteContext = createContext<AutocompleteContextValue | null>(null);

export function useAutocomplete(): AutocompleteContextValue {
  const ctx = useContext(AutocompleteContext);
  if (!ctx) throw new Error("useAutocomplete must be used within AutocompleteProvider");
  return ctx;
}

// ── Provider ────────────────────────────────────────────────────────

export function AutocompleteProvider({
  activeStep,
  children,
}: {
  activeStep: number;
  children: ReactNode;
}) {
  const phase = getPhase(activeStep);

  // ── Scope (Step 1) ──
  const [scopeEnabled, setScopeEnabled] = useState<Set<string>>(
    () => new Set<string>()
  );
  const toggleScope = useCallback((id: string) => {
    setScopeEnabled((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ── Feature toggles ──
  const [featureToggled, setFeatureToggled] = useState<Record<string, boolean>>({});
  const toggleFeature = useCallback((feature: string) => {
    setFeatureToggled((prev) => ({ ...prev, [feature]: !prev[feature] }));
  }, []);
  const isActive = useCallback(
    (feature: string) => isFeatureActive(feature, activeStep, !!featureToggled[feature]),
    [activeStep, featureToggled]
  );

  // ── Search state ──
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [debounceProgress, setDebounceProgress] = useState(0);
  const [debounceMs, setDebounceMs] = useState(300);
  const [networkDelayMs, setNetworkDelayMs] = useState(400);
  const [networkErrorRate, setNetworkErrorRate] = useState(0);
  const [requests, setRequests] = useState<TrackedRequest[]>([]);
  const [trie, setTrie] = useState<TrieState>(createTrie);
  const [lruMaxSize, setLruMaxSize] = useState(50);
  const [lastEviction, setLastEviction] = useState<{ count: number; ts: number } | null>(null);



  const trieRef = useRef(trie);
  trieRef.current = trie;
  const prevCacheCount = useRef(trie.cacheCount);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceStart = useRef<number>(0);
  const debounceRaf = useRef<number>(0);
  const progressResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const generationRef = useRef(0);

  // ── Debounce bar animation ──
  const animateDebounceBar = useCallback(() => {
    const elapsed = Date.now() - debounceStart.current;
    const progress = Math.min(elapsed / debounceMs, 1);
    setDebounceProgress(progress);
    if (progress < 1) {
      debounceRaf.current = requestAnimationFrame(animateDebounceBar);
    }
  }, [debounceMs]);

  const clearDebounce = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    cancelAnimationFrame(debounceRaf.current);
    setDebounceProgress(0);
  }, []);

  useEffect(() => {
    const current = trie.cacheCount;
    const prev = prevCacheCount.current;
    if (prev > 0 && current < prev && current > 0) {
      setLastEviction({ count: prev - current, ts: Date.now() });
    }
    prevCacheCount.current = current;
  }, [trie.cacheCount]);

  // ── Fire search ──
  const fireSearch = useCallback(
    (term: string) => {
      const useTrie = isActive("trieCache");
      const useAbort = isActive("abortController");
      const useGenCounter = isActive("generationCounter");
      const useNetworkError = isActive("networkError");

      if (useTrie) {
        const cached = trieLookup(trieRef.current, term);
        if (cached !== null) {
          const id = ++requestIdRef.current;
          setRequests((prev) => [
            ...prev.slice(-(MAX_TRACKED_REQUESTS - 1)),
            { id, term, status: "cached" as const, timestamp: Date.now() },
          ]);
          setResults(cached);
          setIsOpen(cached.length > 0);
          setHighlightedIndex(-1);
          return;
        }
      }

      if (useAbort && abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;
      const id = ++requestIdRef.current;
      const generation = ++generationRef.current;

      setRequests((prev) => [
        ...prev.slice(-(MAX_TRACKED_REQUESTS - 1)).map((r) =>
          r.status === "in-flight" && useAbort
            ? { ...r, status: "aborted" as const }
            : r
        ),
        { id, term, status: "in-flight" as const, timestamp: Date.now() },
      ]);

      const delay = networkDelayMs * (0.5 + Math.random());
      const timer = setTimeout(() => {
        if (controller.signal.aborted) return;
        if (useGenCounter && generation !== generationRef.current) return;

        if (useNetworkError && Math.random() < networkErrorRate) {
          setRequests((prev) =>
            prev.map((r) =>
              r.id === id
                ? { ...r, status: "failed" as const, duration: Date.now() - r.timestamp }
                : r
            )
          );
          return;
        }

        const found = searchTerms(term);
        setResults(found);
        setIsOpen(true);
        setHighlightedIndex(-1);
        setRequests((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, status: "completed" as const, duration: Date.now() - r.timestamp }
              : r
          )
        );

        if (useTrie) {
          const useLru = isActive("lruEviction");
          setTrie((prev) => trieInsert(prev, term, found, useLru ? lruMaxSize : undefined));
        }
      }, delay);

      controller.signal.addEventListener("abort", () => clearTimeout(timer));
    },
    [isActive, networkDelayMs, networkErrorRate, lruMaxSize]
  );

  // ── Handle input ──
  const handleInput = useCallback(
    (value: string) => {
      setQuery(value);

      if (!value.trim()) {
        clearDebounce();
        setResults([]);
        setIsOpen(false);
        setHighlightedIndex(-1);
        return;
      }

      const useDebounce = isActive("debounce");

      if (!useDebounce) {
        fireSearch(value.trim());
        return;
      }

      clearDebounce();
      debounceStart.current = Date.now();
      debounceRaf.current = requestAnimationFrame(animateDebounceBar);

      debounceTimer.current = setTimeout(() => {
        setDebounceProgress(1);
        cancelAnimationFrame(debounceRaf.current);
        fireSearch(value.trim());
        const resetTimer = setTimeout(() => setDebounceProgress(0), DEBOUNCE_RESET_DELAY_MS);
        progressResetRef.current = resetTimer;
      }, debounceMs);
    },
    [clearDebounce, animateDebounceBar, fireSearch, isActive, debounceMs]
  );

  // ── Keyboard ──
  const handleKeyDown = useCallback(
    (key: string) => {
      const useKeyboard = isActive("keyboardNav");
      if (!useKeyboard) return;
      if (!isOpen || results.length === 0) return;

      switch (key) {
        case "ArrowDown":
          setHighlightedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1
          );
          break;
        case "Enter":
          if (highlightedIndex >= 0 && highlightedIndex < results.length) {
            setQuery(results[highlightedIndex]);
            setIsOpen(false);
            setHighlightedIndex(-1);
            clearDebounce();
          }
          break;
        case "Escape":
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;
      }
    },
    [isActive, isOpen, results, highlightedIndex, clearDebounce]
  );

  // ── Select ──
  const handleSelect = useCallback(
    (index: number) => {
      if (index >= 0 && index < results.length) {
        setQuery(results[index]);
        setIsOpen(false);
        setHighlightedIndex(-1);
        clearDebounce();
      }
    },
    [results, clearDebounce]
  );

  // ── Clear ──
  const clearAll = useCallback(() => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    clearDebounce();
    setRequests([]);
    setTrie(createTrie());
  }, [clearDebounce]);

  // ── Reset on step change ──
  const prevStep = useRef(activeStep);
  useEffect(() => {
    if (prevStep.current !== activeStep) {
      prevStep.current = activeStep;
      clearAll();
    }
  }, [activeStep, clearAll]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (progressResetRef.current) clearTimeout(progressResetRef.current);
      cancelAnimationFrame(debounceRaf.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // ── Metrics ──
  const totalRequests = requests.length;
  const abortedRequests = requests.filter((r) => r.status === "aborted").length;
  const cacheHits = requests.filter((r) => r.status === "cached").length;
  const networkSaved = totalRequests > 0
    ? Math.round(((abortedRequests + cacheHits) / totalRequests) * 100)
    : 0;

  // ── State inspector entries ──
  const stateEntries = useMemo((): StateEntry[] => {
    const entries: StateEntry[] = [
      { label: "query", value: query || "(empty)" },
      { label: "results.length", value: results.length },
      { label: "isOpen", value: isOpen },
      { label: "highlightedIndex", value: highlightedIndex },
    ];

    if (isActive("debounce")) {
      entries.push({ label: "debounceMs", value: debounceMs });
    }
    if (isActive("abortController")) {
      entries.push(
        { label: "totalRequests", value: totalRequests },
        { label: "abortedRequests", value: abortedRequests },
      );
    }
    if (isActive("trieCache")) {
      entries.push(
        { label: "trie.nodeCount", value: trie.nodeCount },
        { label: "trie.cacheCount", value: trie.cacheCount },
        { label: "cacheHits", value: cacheHits },
      );
    }
    if (isActive("keyboardNav")) {
      entries.push({ label: "keyboard", value: "enabled" });
    }
    if (isActive("networkError")) {
      entries.push(
        { label: "networkDelayMs", value: networkDelayMs },
        { label: "errorRate", value: `${Math.round(networkErrorRate * 100)}%` },
      );
    }
    if (isActive("lruEviction")) {
      entries.push({ label: "lruMaxSize", value: lruMaxSize });
    }

    entries.push({ label: "networkSaved", value: `${networkSaved}%` });

    return entries;
  }, [
    query, results.length, isOpen, highlightedIndex, debounceMs,
    totalRequests, abortedRequests, cacheHits, trie.nodeCount,
    trie.cacheCount, networkDelayMs, networkErrorRate, networkSaved,
    lruMaxSize, isActive,
  ]);

  // ── Context value ──
  const value = useMemo(
    (): AutocompleteContextValue => ({
      activeStep,
      phase,
      scopeEnabled,
      toggleScope,
      featureToggled,
      toggleFeature,
      isActive,
      query,
      setQuery,
      results,
      highlightedIndex,
      setHighlightedIndex,
      isOpen,
      setIsOpen,
      debounceMs,
      setDebounceMs,
      debounceProgress,
      requests,
      networkDelayMs,
      setNetworkDelayMs,
      networkErrorRate,
      setNetworkErrorRate,
      trie,
      totalRequests,
      abortedRequests,
      cacheHits,
      networkSaved,
      handleInput,
      handleKeyDown,
      handleSelect,
      clearAll,
      stateEntries,
      lruMaxSize,
      setLruMaxSize,
      lastEviction,
    }),
    [
      activeStep, phase, scopeEnabled, toggleScope,
      featureToggled, toggleFeature, isActive,
      query, results, highlightedIndex, isOpen,
      debounceMs, debounceProgress,
      requests, networkDelayMs, networkErrorRate,
      trie, totalRequests, abortedRequests, cacheHits, networkSaved,
      handleInput, handleKeyDown, handleSelect, clearAll,
      stateEntries, lruMaxSize, lastEviction,
    ]
  );

  return (
    <AutocompleteContext.Provider value={value}>
      {children}
    </AutocompleteContext.Provider>
  );
}
