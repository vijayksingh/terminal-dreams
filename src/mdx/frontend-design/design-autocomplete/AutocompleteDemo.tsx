"use client";

import { DemoSandbox } from "@/components/principles/demo-primitives/DemoSandbox";
import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  type KeyboardEvent,
} from "react";
import styles from "./AutocompleteDemo.module.css";

/* ══════════════════════════════════════════════════════════════
   Mock data — ~100 programming-related terms
   ══════════════════════════════════════════════════════════════ */

const TERMS: readonly string[] = [
  "Abstract Syntax Tree",
  "Angular",
  "Apollo GraphQL",
  "Astro",
  "Babel",
  "Backbone.js",
  "Binary Search",
  "Bun",
  "CSS Grid",
  "CSS Modules",
  "Closure",
  "Compiler",
  "Concurrency",
  "Currying",
  "D3.js",
  "Deno",
  "Docker",
  "Electron",
  "Elm",
  "ESLint",
  "Event Loop",
  "Express",
  "FastAPI",
  "Fiber",
  "Flexbox",
  "Flutter",
  "Garbage Collector",
  "Git",
  "Go",
  "GraphQL",
  "Haskell",
  "HTML",
  "HTTP/2",
  "Hydration",
  "Interpreter",
  "Java",
  "JavaScript",
  "Jest",
  "JSON",
  "JSX",
  "Kotlin",
  "Kubernetes",
  "Lazy Loading",
  "Linked List",
  "Linux",
  "Lisp",
  "LLVM",
  "Lua",
  "Memoization",
  "Microservices",
  "MongoDB",
  "Mutex",
  "MySQL",
  "Nest.js",
  "Next.js",
  "Node.js",
  "Nuxt",
  "OCaml",
  "Perl",
  "PHP",
  "PostgreSQL",
  "Prettier",
  "Promise",
  "Protocol Buffers",
  "Python",
  "React",
  "React Query",
  "Redis",
  "Redux",
  "Remix",
  "REST API",
  "Ruby",
  "Rust",
  "Sass",
  "Scala",
  "Semaphore",
  "Server Components",
  "Service Worker",
  "Solid.js",
  "SQLite",
  "Streaming SSR",
  "Svelte",
  "Swift",
  "Tailwind CSS",
  "TCP/IP",
  "Terraform",
  "Three.js",
  "Tree Shaking",
  "Trie",
  "TypeScript",
  "V8 Engine",
  "Virtual DOM",
  "Vite",
  "Vue.js",
  "WASM",
  "WebSocket",
  "Webpack",
  "XState",
  "Zig",
  "Zod",
  "Zustand",
] as const;

/* ══════════════════════════════════════════════════════════════
   Trie data structure
   ══════════════════════════════════════════════════════════════ */

interface TrieNode {
  children: Map<string, TrieNode>;
  results: string[] | null;
  /** Timestamp of when the node was inserted (for new-node animation). */
  insertedAt: number;
}

function createTrieNode(): TrieNode {
  return { children: new Map(), results: null, insertedAt: Date.now() };
}

interface TrieState {
  root: TrieNode;
  nodeCount: number;
  cacheCount: number;
}

function createTrie(): TrieState {
  return { root: createTrieNode(), nodeCount: 1, cacheCount: 0 };
}

function trieInsert(
  trie: TrieState,
  key: string,
  results: string[]
): TrieState {
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
  return {
    root: trie.root,
    nodeCount: trie.nodeCount + added,
    cacheCount: trie.cacheCount + (isNew ? 1 : 0),
  };
}

function trieSearch(trie: TrieState, prefix: string): string[] | null {
  let current = trie.root;
  const lower = prefix.toLowerCase();
  for (const char of lower) {
    if (!current.children.has(char)) return null;
    current = current.children.get(char)!;
  }
  return current.results;
}

/* ══════════════════════════════════════════════════════════════
   Search function (filters TERMS by prefix)
   ══════════════════════════════════════════════════════════════ */

function searchTerms(query: string): string[] {
  const lower = query.toLowerCase();
  return TERMS.filter((t) => t.toLowerCase().includes(lower)).slice(0, 8);
}

/* ══════════════════════════════════════════════════════════════
   Request tracking
   ══════════════════════════════════════════════════════════════ */

type RequestStatus = "in-flight" | "aborted" | "completed" | "cached";

interface TrackedRequest {
  id: number;
  term: string;
  status: RequestStatus;
}

/* ══════════════════════════════════════════════════════════════
   Highlight match helper — splits string at match, wraps in <mark>
   ══════════════════════════════════════════════════════════════ */

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Reduced motion hook (inlined to avoid external deps)
   ══════════════════════════════════════════════════════════════ */

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

/* ══════════════════════════════════════════════════════════════
   Tab 1: Search
   ══════════════════════════════════════════════════════════════ */

const DEBOUNCE_MS = 300;
const DELAY_MIN = 200;
const DELAY_MAX = 800;

function randomDelay(): number {
  return DELAY_MIN + Math.random() * (DELAY_MAX - DELAY_MIN);
}

interface SearchTabProps {
  trie: TrieState;
  onTrieUpdate: (trie: TrieState) => void;
}

function SearchTab({ trie, onTrieUpdate }: SearchTabProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [requests, setRequests] = useState<TrackedRequest[]>([]);
  const [debounceProgress, setDebounceProgress] = useState(0);
  const [hoveredDot, setHoveredDot] = useState<number | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceStart = useRef<number>(0);
  const debounceRaf = useRef<number>(0);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const reducedMotion = usePrefersReducedMotion();

  const clearDebounce = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    cancelAnimationFrame(debounceRaf.current);
    setDebounceProgress(0);
  }, []);

  const animateDebounceBar = useCallback(() => {
    const elapsed = Date.now() - debounceStart.current;
    const progress = Math.min(elapsed / DEBOUNCE_MS, 1);
    setDebounceProgress(progress);
    if (progress < 1) {
      debounceRaf.current = requestAnimationFrame(animateDebounceBar);
    }
  }, []);

  const fireSearch = useCallback(
    (term: string) => {
      // Check trie cache first
      const cached = trieSearch(trie, term);
      if (cached !== null) {
        const id = ++requestIdRef.current;
        setRequests((prev) => [
          ...prev,
          { id, term, status: "cached" as const },
        ]);
        setResults(cached);
        setShowDropdown(cached.length > 0);
        setHighlightedIndex(-1);
        return;
      }

      // Abort previous in-flight request
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;
      const id = ++requestIdRef.current;
      const capturedId = id;

      setRequests((prev) => [
        ...prev.map((r) =>
          r.status === "in-flight" ? { ...r, status: "aborted" as const } : r
        ),
        { id, term, status: "in-flight" as const },
      ]);

      const delay = randomDelay();
      const timer = setTimeout(() => {
        if (controller.signal.aborted) return;
        // Race condition guard: only process if this is still the latest request
        if (capturedId !== requestIdRef.current) return;
        const found = searchTerms(term);
        setResults(found);
        setShowDropdown(found.length > 0);
        setHighlightedIndex(-1);
        setRequests((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, status: "completed" as const } : r
          )
        );
        // Cache the result
        onTrieUpdate(trieInsert(trie, term, found));
      }, delay);

      controller.signal.addEventListener("abort", () => {
        clearTimeout(timer);
      });
    },
    [trie, onTrieUpdate]
  );

  const handleInput = useCallback(
    (value: string) => {
      setQuery(value);

      if (!value.trim()) {
        clearDebounce();
        setResults([]);
        setShowDropdown(false);
        setHighlightedIndex(-1);
        return;
      }

      // Reset debounce
      clearDebounce();
      debounceStart.current = Date.now();
      if (!reducedMotion) {
        debounceRaf.current = requestAnimationFrame(animateDebounceBar);
      }

      debounceTimer.current = setTimeout(() => {
        setDebounceProgress(1);
        cancelAnimationFrame(debounceRaf.current);
        fireSearch(value.trim());
        // Reset bar after a brief flash at 100%
        setTimeout(() => setDebounceProgress(0), 120);
      }, DEBOUNCE_MS);
    },
    [clearDebounce, animateDebounceBar, fireSearch, reducedMotion]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!showDropdown || results.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < results.length) {
            setQuery(results[highlightedIndex]);
            setShowDropdown(false);
            setHighlightedIndex(-1);
            clearDebounce();
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowDropdown(false);
          setHighlightedIndex(-1);
          break;
      }
    },
    [showDropdown, results, highlightedIndex, clearDebounce]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    clearDebounce();
    inputRef.current?.focus();
  }, [clearDebounce]);

  // Stats
  const stats = useMemo(() => {
    const sent = requests.length;
    const aborted = requests.filter((r) => r.status === "aborted").length;
    const completed = requests.filter((r) => r.status === "completed").length;
    const cached = requests.filter((r) => r.status === "cached").length;
    return { sent, aborted, completed, cached };
  }, [requests]);

  return (
    <div className={styles.searchPanel}>
      <div className={styles.searchWrapper}>
        <div className={styles.searchInputRow}>
          <span className={styles.searchIcon} aria-hidden="true">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            ref={inputRef}
            id="ac-search-input"
            className={styles.searchInput}
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search programming terms..."
            aria-label="Search programming terms"
            role="combobox"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
            aria-controls="ac-results-listbox"
            aria-activedescendant={
              highlightedIndex >= 0
                ? `ac-result-${highlightedIndex}`
                : undefined
            }
          />
          {query && (
            <button
              className={styles.clearButton}
              onClick={handleClear}
              aria-label="Clear search"
            >
              ESC
            </button>
          )}
        </div>

        {/* Debounce timer bar */}
        <div className={styles.debounceBar} aria-hidden="true">
          <div
            className={styles.debounceFill}
            style={{ width: `${debounceProgress * 100}%` }}
          />
        </div>

        {/* Results dropdown */}
        {showDropdown && results.length > 0 && (
          <div
            id="ac-results-listbox"
            className={styles.resultsDropdown}
            role="listbox"
            aria-label="Search results"
          >
            {results.map((result, i) => (
              <div
                key={result}
                id={`ac-result-${i}`}
                role="option"
                aria-selected={i === highlightedIndex}
                className={`${styles.resultItem} ${
                  i === highlightedIndex ? styles.resultHighlighted : ""
                }`}
                onMouseEnter={() => setHighlightedIndex(i)}
                onClick={() => {
                  setQuery(result);
                  setShowDropdown(false);
                  setHighlightedIndex(-1);
                  clearDebounce();
                }}
              >
                {highlightMatch(result, query)}
              </div>
            ))}
          </div>
        )}

        {showDropdown && results.length === 0 && query.trim() && (
          <div className={styles.resultsDropdown}>
            <div className={styles.noResults}>No results found</div>
          </div>
        )}
      </div>

      {/* Network panel */}
      <div className={styles.networkPanel}>
        <div className={styles.networkLabel}>Network Timeline</div>
        <div className={styles.networkTimeline}>
          {requests.length === 0 && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                color: "var(--color-muted)",
              }}
            >
              Type to see requests...
            </span>
          )}
          {requests.map((req) => (
            <div
              key={req.id}
              className={`${styles.networkDot} ${
                req.status === "in-flight"
                  ? styles.dotInFlight
                  : req.status === "aborted"
                    ? styles.dotAborted
                    : req.status === "cached"
                      ? styles.dotCached
                      : styles.dotCompleted
              }`}
              onMouseEnter={() => setHoveredDot(req.id)}
              onMouseLeave={() => setHoveredDot(null)}
              aria-label={`Request "${req.term}" — ${req.status}`}
            >
              {hoveredDot === req.id && (
                <div className={styles.dotTooltip}>{req.term}</div>
              )}
            </div>
          ))}
        </div>
        <div className={styles.networkStats}>
          <span className={styles.statItem}>
            <span
              className={styles.statDot}
              style={{ background: "var(--diagram-layer-0)" }}
            />
            Sent: {stats.sent}
          </span>
          <span className={styles.statItem}>
            <span
              className={styles.statDot}
              style={{ background: "var(--color-error)" }}
            />
            Aborted: {stats.aborted}
          </span>
          <span className={styles.statItem}>
            <span
              className={styles.statDot}
              style={{ background: "var(--color-success)" }}
            />
            Completed: {stats.completed}
          </span>
          <span className={styles.statItem}>
            <span
              className={styles.statDot}
              style={{ background: "var(--ac-color-cached)" }}
            />
            Cached: {stats.cached}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Tab 2: Trie Visualizer
   ══════════════════════════════════════════════════════════════ */

interface TrieVisNode {
  id: string;
  char: string;
  prefix: string;
  hasCachedResults: boolean;
  x: number;
  y: number;
  children: TrieVisNode[];
  insertedAt: number;
}

function flattenTrie(
  node: TrieNode,
  prefix: string,
  parentChar: string
): TrieVisNode {
  const children: TrieVisNode[] = [];
  const sorted = Array.from(node.children.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  for (const [char, child] of sorted) {
    children.push(flattenTrie(child, prefix + char, char));
  }
  return {
    id: prefix || "root",
    char: parentChar,
    prefix,
    hasCachedResults: node.results !== null,
    x: 0,
    y: 0,
    children,
    insertedAt: node.insertedAt,
  };
}

/** Assign x,y positions to trie nodes using a simple layered layout. */
function layoutTrie(root: TrieVisNode): {
  nodes: TrieVisNode[];
  width: number;
  height: number;
} {
  const NODE_R = 16;
  const H_GAP = 12;
  const V_GAP = 52;
  const PAD = 30;

  // First pass: compute subtree widths
  function subtreeWidth(node: TrieVisNode): number {
    if (node.children.length === 0) return NODE_R * 2;
    let total = 0;
    for (const child of node.children) {
      total += subtreeWidth(child);
    }
    total += (node.children.length - 1) * H_GAP;
    return Math.max(NODE_R * 2, total);
  }

  // Second pass: assign positions
  const allNodes: TrieVisNode[] = [];
  function assign(node: TrieVisNode, x: number, y: number) {
    node.x = x;
    node.y = y;
    allNodes.push(node);

    if (node.children.length === 0) return;

    const totalW = subtreeWidth(node);
    let startX = x - totalW / 2;

    for (const child of node.children) {
      const cw = subtreeWidth(child);
      assign(child, startX + cw / 2, y + V_GAP);
      startX += cw + H_GAP;
    }
  }

  const totalWidth = subtreeWidth(root);
  assign(root, totalWidth / 2 + PAD, PAD + NODE_R);

  // Calculate bounds
  let maxX = 0;
  let maxY = 0;
  for (const n of allNodes) {
    if (n.x + NODE_R + PAD > maxX) maxX = n.x + NODE_R + PAD;
    if (n.y + NODE_R + PAD > maxY) maxY = n.y + NODE_R + PAD;
  }

  return {
    nodes: allNodes,
    width: Math.max(maxX, 200),
    height: Math.max(maxY, 200),
  };
}

interface TrieTabProps {
  trie: TrieState;
  onTrieUpdate: (trie: TrieState) => void;
}

function TrieTab({ trie, onTrieUpdate }: TrieTabProps) {
  const [selectedPrefix, setSelectedPrefix] = useState<string | null>(null);
  const [trieQuery, setTrieQuery] = useState("");
  const reducedMotion = usePrefersReducedMotion();
  const now = useRef(Date.now());
  const trieDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visRoot = useMemo(
    () => flattenTrie(trie.root, "", "*"),
    [trie.root]
  );

  const layout = useMemo(() => layoutTrie(visRoot), [visRoot]);

  const handleTrieSearch = useCallback(
    (value: string) => {
      setTrieQuery(value);
      const trimmed = value.trim();
      if (!trimmed) return;

      if (trieDebounceRef.current) clearTimeout(trieDebounceRef.current);
      trieDebounceRef.current = setTimeout(() => {
        // Check cache first
        const cached = trieSearch(trie, trimmed);
        if (cached !== null) return;
        // Compute and cache the result
        const found = searchTerms(trimmed);
        onTrieUpdate(trieInsert(trie, trimmed, found));
      }, DEBOUNCE_MS);
    },
    [trie, onTrieUpdate]
  );

  const handleNodeKeyDown = useCallback(
    (e: KeyboardEvent<SVGGElement>, prefix: string, isSelected: boolean) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setSelectedPrefix(isSelected ? null : prefix);
      }
    },
    []
  );

  const hasNodes = trie.nodeCount > 1;

  // Get selected node's cached results
  const selectedResults = useMemo(() => {
    if (selectedPrefix === null) return null;
    return trieSearch(trie, selectedPrefix);
  }, [trie, selectedPrefix]);

  // Build edges
  const edges: Array<{ from: TrieVisNode; to: TrieVisNode }> = [];
  function collectEdges(node: TrieVisNode) {
    for (const child of node.children) {
      edges.push({ from: node, to: child });
      collectEdges(child);
    }
  }
  if (hasNodes) collectEdges(visRoot);

  const NODE_R = 16;

  return (
    <div className={styles.triePanel}>
      <div className={styles.trieSearchRow}>
        <span className={styles.trieSearchIcon} aria-hidden="true">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          className={styles.trieSearchInput}
          type="text"
          value={trieQuery}
          onChange={(e) => handleTrieSearch(e.target.value)}
          placeholder="Type here to grow the trie..."
          aria-label="Type to grow the trie"
        />
      </div>

      <div className={styles.trieStats}>
        <span>
          Nodes: <span className={styles.trieStatValue}>{trie.nodeCount}</span>
        </span>
        <span>
          Cached prefixes:{" "}
          <span className={styles.trieStatValue}>{trie.cacheCount}</span>
        </span>
      </div>

      <div className={styles.trieContainer}>
        {!hasNodes ? (
          <div className={styles.trieEmpty}>
            Type above or search in the &ldquo;Search&rdquo; tab to build the trie
          </div>
        ) : (
          <svg
            className={styles.trieSvg}
            width={layout.width}
            height={layout.height}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
          >
            {/* Edges */}
            {edges.map(({ from, to }) => (
              <line
                key={`${from.id}-${to.id}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className={styles.trieEdge}
              />
            ))}

            {/* Nodes */}
            {layout.nodes.map((node) => {
              const isRoot = node.id === "root";
              const isSelected = node.prefix === selectedPrefix;
              const isNew =
                !reducedMotion && node.insertedAt > now.current - 2000;
              const nodeLabel = isRoot
                ? "Root node"
                : `Prefix "${node.prefix}"${node.hasCachedResults ? " (cached)" : ""}`;

              return (
                <g
                  key={node.id}
                  className={`${styles.trieNode} ${isNew ? styles.trieNodeNew : ""}`}
                  tabIndex={0}
                  role="button"
                  aria-label={nodeLabel}
                  onClick={() =>
                    setSelectedPrefix(
                      isSelected ? null : node.prefix
                    )
                  }
                  onKeyDown={(e) =>
                    handleNodeKeyDown(e, node.prefix, isSelected)
                  }
                  style={{
                    transformOrigin: `${node.x}px ${node.y}px`,
                  }}
                >
                  {/* Transparent hit area for 44px touch target */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={22}
                    className={styles.trieNodeHitArea}
                  />
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={NODE_R}
                    className={`${styles.trieNodeCircle} ${
                      isSelected
                        ? styles.trieNodeSelected
                        : node.hasCachedResults && !isRoot
                          ? styles.trieNodeCached
                          : ""
                    } ${isRoot ? styles.trieNodeRoot : ""}`}
                  />
                  <text
                    x={node.x}
                    y={node.y}
                    className={styles.trieNodeLabel}
                  >
                    {isRoot ? "*" : node.char}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {selectedPrefix !== null && selectedResults !== null && (
        <div className={styles.trieSelectedInfo}>
          <div>
            Prefix:{" "}
            <span className={styles.trieSelectedPrefix}>
              &quot;{selectedPrefix}&quot;
            </span>{" "}
            ({selectedResults.length} results)
          </div>
          <div className={styles.trieSelectedResults}>
            {selectedResults.map((r) => (
              <span key={r} className={styles.trieResultTag}>
                {r}
              </span>
            ))}
          </div>
        </div>
      )}

      {selectedPrefix !== null && selectedResults === null && (
        <div className={styles.trieSelectedInfo}>
          <div>
            Prefix:{" "}
            <span className={styles.trieSelectedPrefix}>
              &quot;{selectedPrefix}&quot;
            </span>{" "}
            — no cached results at this node
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Tab 3: Compare
   ══════════════════════════════════════════════════════════════ */

interface CompareLogEntry {
  term: string;
  status: "sent" | "aborted" | "completed" | "cached";
}

interface ColumnState {
  requestCount: number;
  log: CompareLogEntry[];
}

function CompareTab() {
  const [input, setInput] = useState("");
  const [noDebounce, setNoDebounce] = useState<ColumnState>({
    requestCount: 0,
    log: [],
  });
  const [debounced, setDebounced] = useState<ColumnState>({
    requestCount: 0,
    log: [],
  });
  const [cached, setCached] = useState<ColumnState>({
    requestCount: 0,
    log: [],
  });

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheRef = useRef<Map<string, string[]>>(new Map());

  const handleInput = useCallback((value: string) => {
    setInput(value);
    const trimmed = value.trim();

    if (!trimmed) return;

    // Column 1: No debounce — fires immediately on every keystroke
    setNoDebounce((prev) => ({
      requestCount: prev.requestCount + 1,
      log: [
        ...prev.log,
        { term: trimmed, status: "sent" as const },
      ],
    }));

    // Column 2: Debounce — waits 300ms
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebounced((prev) => ({
        requestCount: prev.requestCount + 1,
        log: [
          ...prev.log,
          { term: trimmed, status: "completed" as const },
        ],
      }));
    }, DEBOUNCE_MS);

    // Column 3: Debounce + Cache
    // We reuse the same debounce logic but check cache
    // For simplicity, column 3 debounces the same way but checks cache on fire
    // We schedule separately for column 3
    // (In production these would share a debounce, but split here for clarity)
  }, []);

  // Separate debounce for cached column to keep state independent
  const cacheDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleInputWithCache = useCallback(
    (value: string) => {
      handleInput(value);
      const trimmed = value.trim();
      if (!trimmed) return;

      if (cacheDebounceRef.current) {
        clearTimeout(cacheDebounceRef.current);
      }
      cacheDebounceRef.current = setTimeout(() => {
        if (cacheRef.current.has(trimmed.toLowerCase())) {
          setCached((prev) => ({
            requestCount: prev.requestCount,
            log: [
              ...prev.log,
              { term: trimmed, status: "cached" as const },
            ],
          }));
        } else {
          const results = searchTerms(trimmed);
          cacheRef.current.set(trimmed.toLowerCase(), results);
          setCached((prev) => ({
            requestCount: prev.requestCount + 1,
            log: [
              ...prev.log,
              { term: trimmed, status: "completed" as const },
            ],
          }));
        }
      }, DEBOUNCE_MS);
    },
    [handleInput]
  );

  const handleReset = useCallback(() => {
    setInput("");
    setNoDebounce({ requestCount: 0, log: [] });
    setDebounced({ requestCount: 0, log: [] });
    setCached({ requestCount: 0, log: [] });
    cacheRef.current.clear();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (cacheDebounceRef.current) clearTimeout(cacheDebounceRef.current);
  }, []);

  return (
    <div className={styles.comparePanel}>
      <div className={styles.compareInputRow}>
        <input
          className={styles.compareInput}
          type="text"
          value={input}
          onChange={(e) => handleInputWithCache(e.target.value)}
          placeholder='Type "javascript" and watch the difference...'
          aria-label="Type to compare debounce modes"
        />
      </div>

      <div className={styles.compareColumns}>
        {/* Column 1: No debounce */}
        <div className={styles.compareColumn}>
          <div className={styles.compareColumnHeader}>
            No Debounce
            <span className={styles.compareSubtitle}>
              Fires every keystroke
            </span>
          </div>
          <div className={styles.compareCounter}>
            <span className={styles.counterValue}>
              {noDebounce.requestCount}
            </span>
            <span className={styles.counterLabel}>requests sent</span>
          </div>
          <div className={styles.compareRequestLog}>
            {noDebounce.log.map((entry, i) => (
              <div key={i} className={styles.compareLogEntry}>
                <span
                  className={styles.compareLogDot}
                  style={{ background: "var(--diagram-layer-0)" }}
                />
                {entry.term}
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: With debounce */}
        <div className={styles.compareColumn}>
          <div className={styles.compareColumnHeader}>
            300ms Debounce
            <span className={styles.compareSubtitle}>
              Waits for quiet period
            </span>
          </div>
          <div className={styles.compareCounter}>
            <span className={styles.counterValue}>
              {debounced.requestCount}
            </span>
            <span className={styles.counterLabel}>requests sent</span>
          </div>
          <div className={styles.compareRequestLog}>
            {debounced.log.map((entry, i) => (
              <div key={i} className={styles.compareLogEntry}>
                <span
                  className={styles.compareLogDot}
                  style={{ background: "var(--color-success)" }}
                />
                {entry.term}
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Debounce + Cache */}
        <div className={styles.compareColumn}>
          <div className={styles.compareColumnHeader}>
            Debounce + Cache
            <span className={styles.compareSubtitle}>
              Skips if prefix cached
            </span>
          </div>
          <div className={styles.compareCounter}>
            <span className={styles.counterValue}>
              {cached.requestCount}
            </span>
            <span className={styles.counterLabel}>network requests</span>
          </div>
          <div className={styles.compareRequestLog}>
            {cached.log.map((entry, i) => (
              <div key={i} className={styles.compareLogEntry}>
                <span
                  className={styles.compareLogDot}
                  style={{
                    background:
                      entry.status === "cached"
                        ? "var(--ac-color-cached)"
                        : "var(--color-success)",
                  }}
                />
                {entry.term}
                {entry.status === "cached" && (
                  <span
                    style={{
                      color: "var(--ac-color-cached)",
                      fontWeight: 700,
                      marginLeft: 4,
                    }}
                  >
                    HIT
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <button className={styles.compareReset} onClick={handleReset}>
        Reset
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main component — wraps all 3 tabs in DemoSandbox
   ══════════════════════════════════════════════════════════════ */

type TabId = "Search" | "Trie" | "Compare";
const TABS = ["Search", "Trie", "Compare"] as const;

export function AutocompleteDemo() {
  const [activeTab, setActiveTab] = useState<TabId>("Search");
  const [trie, setTrie] = useState<TrieState>(createTrie);

  return (
    <DemoSandbox title="Autocomplete System Design" className={styles.demoRoot}>
      <DemoSandbox.Tabs
        options={TABS}
        value={activeTab}
        onChange={(v) => setActiveTab(v as TabId)}
      />

      {activeTab === "Search" && (
        <SearchTab trie={trie} onTrieUpdate={setTrie} />
      )}
      {activeTab === "Trie" && <TrieTab trie={trie} onTrieUpdate={setTrie} />}
      {activeTab === "Compare" && <CompareTab />}

      <DemoSandbox.Caption>
        {activeTab === "Search" &&
          "Type to search. Watch the debounce bar, network dots, and cached responses."}
        {activeTab === "Trie" &&
          "Type to grow the trie in real-time. Click or press Enter on nodes to inspect cached results."}
        {activeTab === "Compare" &&
          "Same input processed three ways. Type fast and compare request counts."}
      </DemoSandbox.Caption>
    </DemoSandbox>
  );
}
