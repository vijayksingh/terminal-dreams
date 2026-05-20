"use client";

import React, { useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAutocomplete } from "../autocomplete-context";
import { TrieNode } from "../engine/prefix-trie";
import styles from "../AutocompleteLab.module.css";

// ── Motion constants ────────────────────────────────────────────────
const SPRING = {
  snappy: { type: "spring", stiffness: 380, damping: 30 } as const,
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);
  return reduced;
}

// ── Match highlighting ─────────────────────────────────────────────
export function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className={styles.matchMark}>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ── Persistent search component ────────────────────────────────────
export function PersistentSearch() {
  const ctx = useAutocomplete();
  const inputRef = useRef<HTMLInputElement>(null);
  const noMotion = usePrefersReducedMotion();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
        e.preventDefault();
        ctx.handleKeyDown(e.key);
      }
    },
    [ctx]
  );

  const showHighlight = ctx.isActive("matchHighlight");

  return (
    <div className={styles.searchContainer}>
      <div className={styles.searchWrapper}>
        {/* Search input */}
        <div className={styles.searchInputRow}>
          <span className={styles.searchIcon} aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            ref={inputRef}
            className={styles.searchInput}
            type="text"
            value={ctx.query}
            onChange={(e) => ctx.handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search programming terms..."
            aria-label="Search programming terms"
            role="combobox"
            aria-expanded={ctx.isOpen}
            aria-autocomplete="list"
            aria-controls="ac-lab-listbox"
            aria-activedescendant={ctx.highlightedIndex >= 0
              ? `ac-lab-result-${ctx.highlightedIndex}`
              : undefined}
          />
          {ctx.query && (
            <button
              className={styles.escButton}
              onClick={() => {
                ctx.handleInput("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              ESC
            </button>
          )}
        </div>

        {/* Debounce bar */}
        {ctx.isActive("debounce") && (
          <div className={styles.debounceBar} aria-hidden="true">
            <div
              className={styles.debounceFill}
              style={{ width: `${ctx.debounceProgress * 100}%` }}
            />
          </div>
        )}

        {/* Results dropdown */}
        <AnimatePresence>
          {ctx.isOpen && (
            <motion.div
              id="ac-lab-listbox"
              className={styles.resultsDropdown}
              role="listbox"
              aria-label="Search results"
              initial={noMotion ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={noMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={SPRING.snappy}
            >
              {ctx.results.length > 0 ? ctx.results.map((result, i) => (
                <div
                  key={result}
                  id={`ac-lab-result-${i}`}
                  role="option"
                  aria-selected={i === ctx.highlightedIndex}
                  className={`${styles.resultItem} ${
                    i === ctx.highlightedIndex ? styles.resultHighlighted : ""
                  }`}
                  onMouseEnter={() => ctx.setHighlightedIndex(i)}
                  onClick={() => ctx.handleSelect(i)}
                >
                  {showHighlight
                    ? highlightMatch(result, ctx.query)
                    : result}
                </div>
              )) : (
                <div className={styles.resultEmpty} role="status">
                  No results for &ldquo;{ctx.query}&rdquo;
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Feature badges showing what's active */}
      <div className={styles.activeBadges}>
        {ctx.isActive("debounce") && <span className={styles.badge} data-kind="debounce">debounce</span>}
        {ctx.isActive("abortController") && <span className={styles.badge} data-kind="abort">abort</span>}
        {ctx.isActive("trieCache") && <span className={styles.badge} data-kind="cache">trie cache</span>}
        {ctx.isActive("keyboardNav") && <span className={styles.badge} data-kind="keyboard">keyboard</span>}
        {ctx.isActive("matchHighlight") && <span className={styles.badge} data-kind="highlight">highlight</span>}
        {ctx.isActive("generationCounter") && <span className={styles.badge} data-kind="gen">gen counter</span>}
        {ctx.isActive("networkError") && <span className={styles.badge} data-kind="error">errors</span>}
        {ctx.isActive("accessibility") && <span className={styles.badge} data-kind="a11y">ARIA</span>}
      </div>
    </div>
  );
}

// ── Network timeline ───────────────────────────────────────────────
export function NetworkTimeline() {
  const { requests } = useAutocomplete();
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const statusColors: Record<string, string> = {
    "in-flight": "var(--diagram-layer-0)",
    aborted: "var(--color-error)",
    completed: "var(--color-success)",
    cached: "var(--diagram-layer-3)",
    failed: "var(--color-warning)",
  };

  return (
    <div className={styles.networkPanel}>
      <div className={styles.networkLabel}>Network Timeline</div>
      <div
        className={styles.networkTimeline}
        role="status"
        aria-label={`Network requests: ${requests.length} total — ${requests.filter(r => r.status === "completed").length} completed, ${requests.filter(r => r.status === "aborted").length} aborted, ${requests.filter(r => r.status === "cached").length} cached`}
      >
        {requests.length === 0 && (
          <span className={styles.networkEmpty}>Type to see requests...</span>
        )}
        {requests.map((req) => (
          <button
            key={req.id}
            type="button"
            className={styles.networkDot}
            style={{ background: statusColors[req.status] }}
            onMouseEnter={() => setHoveredId(req.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => setHoveredId(prev => prev === req.id ? null : req.id)}
            aria-label={`${req.term}: ${req.status}${req.duration ? `, ${req.duration}ms` : ""}`}
          >
            {hoveredId === req.id && (
              <div className={styles.dotTooltip} role="tooltip">
                <span>{req.term}</span>
                <span className={styles.dotStatus}>{req.status}</span>
                {req.duration && <span>{req.duration}ms</span>}
              </div>
            )}
          </button>
        ))}
      </div>
      <div className={styles.networkLegend}>
        {Object.entries(statusColors).map(([status, color]) => (
          <span key={status} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: color }} />
            {status}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Trie visualizer ────────────────────────────────────────────────
interface TrieVisNode {
  char: string;
  prefix: string;
  hasCached: boolean;
  depth: number;
  children: TrieVisNode[];
}

function flattenTrieVis(
  node: TrieNode,
  prefix: string,
  char: string,
  depth: number
): TrieVisNode {
  const children: TrieVisNode[] = [];
  const sorted = Array.from(node.children.entries()).sort(([a], [b]) => a.localeCompare(b));
  for (const [c, child] of sorted) {
    if (depth < 4) {
      children.push(flattenTrieVis(child, prefix + c, c, depth + 1));
    }
  }
  return {
    char,
    prefix,
    hasCached: node.results !== null,
    depth,
    children,
  };
}

export function TrieVisualizer() {
  const { trie } = useAutocomplete();

  const visRoot = useMemo(
    () => flattenTrieVis(trie.root, "", "*", 0),
    [trie.root]
  );

  if (trie.nodeCount <= 1) {
    return (
      <div className={styles.triePanel}>
        <div className={styles.trieEmpty}>Search to build the trie cache</div>
      </div>
    );
  }

  return (
    <div className={styles.triePanel}>
      <div className={styles.trieHeader}>
        <span>Trie Cache</span>
        <span className={styles.trieStats}>
          {trie.nodeCount} nodes · {trie.cacheCount} cached
        </span>
      </div>
      <div className={styles.trieTree}>
        <TrieNodeVis node={visRoot} />
      </div>
    </div>
  );
}

function TrieNodeVis({ node }: { node: TrieVisNode }) {
  return (
    <div className={styles.trieNodeGroup}>
      <span
        className={styles.trieNode}
        data-cached={node.hasCached ? "true" : undefined}
        data-root={node.depth === 0 ? "true" : undefined}
        title={node.prefix || "root"}
      >
        {node.char}
      </span>
      {node.children.length > 0 && (
        <div className={styles.trieChildren}>
          {node.children.map((child) => (
            <TrieNodeVis key={child.prefix} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}
