"use client";

import { type ReactNode, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION, STAGGER } from "@/lib/motion";
import {
  SearchDemoRoot,
  useSearchDemo,
  FEATURES,
  EXTRA_FEATURES,
  LAYOUT_PRESETS,
  type LayoutId,
  type SlotId,
} from "./search-context";
import { StateInspector } from "../StateInspector";

// ── Root ───────────────────────────────────────────────────────────
// Provides all state to children via context.
// Children determine layout — Root imposes no DOM structure.

function Root({
  activeStep,
  children,
}: {
  activeStep: number;
  children: ReactNode;
}) {
  return (
    <SearchDemoRoot activeStep={activeStep}>{children}</SearchDemoRoot>
  );
}

// ── Toolbar ────────────────────────────────────────────────────────
// Feature toggle buttons. Reads enabled/toggle from context.
// Renders as a horizontal bar — parent decides sticky/scroll behavior.

function Toolbar() {
  const { enabled, toggle, activeStep, userOverride, stepFeatures } =
    useSearchDemo();

  return (
    <div
      className="shrink-0 px-4 py-3 flex flex-wrap gap-2"
      style={{ borderBottom: "1px solid var(--color-border)" }}
    >
      <span
        className="text-[10px] font-mono uppercase tracking-wider self-center mr-1"
        style={{ color: "var(--color-muted)" }}
      >
        Features
      </span>
      {FEATURES.map((f) => (
        <FeatureToggle
          key={f.id}
          label={f.label}
          isOn={enabled.has(f.id)}
          isStepFeature={stepFeatures.includes(f.id)}
          showOutline={!userOverride}
          onToggle={() => toggle(f.id)}
        />
      ))}
    </div>
  );
}

function FeatureToggle({
  label,
  isOn,
  isStepFeature,
  showOutline,
  onToggle,
}: {
  label: string;
  isOn: boolean;
  isStepFeature: boolean;
  showOutline: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="px-2.5 py-1 text-xs font-mono rounded transition-all"
      style={{
        background: isOn ? "var(--color-surface-2)" : "transparent",
        color: isOn ? "var(--color-text)" : "var(--color-muted)",
        border: `1px solid ${isOn ? "var(--color-border)" : "transparent"}`,
        outline:
          isStepFeature && showOutline
            ? "1px solid var(--color-accent)"
            : "none",
        outlineOffset: "1px",
      }}
    >
      <span
        className="inline-block w-2 h-2 rounded-full mr-1.5"
        style={{
          background: isOn ? "var(--color-accent)" : "var(--color-muted)",
          opacity: isOn ? 1 : 0.3,
        }}
      />
      {label}
    </button>
  );
}

// ── NaiveToggle ────────────────────────────────────────────────────
// Step-3-only toggle that simulates the useEffect stale-frame bug.
// Renders conditionally based on activeStep.

function NaiveToggle() {
  const { activeStep, naiveMode, setNaiveMode } = useSearchDemo();

  return (
    <AnimatePresence>
      {activeStep === 3 && (
        <motion.div
          key="naive-toggle"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={TRANSITION.collapse}
        className="shrink-0 px-4 py-2 flex items-center gap-2"
        style={{
          borderBottom: "1px solid var(--color-border)",
          background: naiveMode
            ? "color-mix(in srgb, var(--color-accent) 6%, transparent)"
            : "transparent",
        }}
      >
        <button
          onClick={() => setNaiveMode((p: boolean) => !p)}
          className="flex items-center gap-2 text-xs font-mono transition-colors"
          style={{
            color: naiveMode ? "var(--color-accent)" : "var(--color-muted)",
          }}
        >
          <Checkbox checked={naiveMode} />
          Try the naive useEffect approach
        </button>
        {naiveMode && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[10px]"
            style={{ color: "var(--color-muted)" }}
          >
            — type fast to see the stale frame
          </motion.span>
        )}
      </motion.div>
      )}
    </AnimatePresence>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-sm transition-all"
      style={{
        width: 14,
        height: 14,
        border: `1px solid ${checked ? "var(--color-accent)" : "var(--color-border)"}`,
        background: checked ? "var(--color-accent)" : "transparent",
        color: checked ? "var(--color-bg)" : "transparent",
        fontSize: 9,
        lineHeight: 1,
      }}
    >
      {checked ? "✓" : ""}
    </span>
  );
}

// ── StaleIndicator ─────────────────────────────────────────────────
// Flashes when naive mode produces a stale frame.

function StaleIndicator() {
  const { isStale, naiveResults, derivedResults } = useSearchDemo();

  return (
    <AnimatePresence>
      {isStale && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={TRANSITION.enterItem}
          className="px-3 py-2 rounded text-xs font-mono"
          style={{
            background:
              "color-mix(in srgb, var(--color-accent) 12%, transparent)",
            border: "1px solid var(--color-accent)",
            color: "var(--color-accent)",
          }}
        >
          ⚡ Stale frame — results show {naiveResults.length} items but
          query already matches {derivedResults.length}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Panel ──────────────────────────────────────────────────────────
// The card that wraps the demo UI. Children determine content.
// Accepts a title prop but defaults to context-driven behavior.

function Panel({
  title = "Fruit List",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  const { isStale } = useSearchDemo();

  return (
    <div
      className="rounded-lg p-5"
      style={{
        background: "var(--color-surface)",
        border: `1px solid ${isStale ? "var(--color-accent)" : "var(--color-border)"}`,
        fontFamily: "var(--font-sans)",
        transition: "border-color 0.15s ease",
      }}
    >
      <h3
        className="text-base font-semibold mt-0 mb-3"
        style={{ color: "var(--color-text)" }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

// ── Input ──────────────────────────────────────────────────────────
// Controlled search input. Only renders when "input" feature is on.

function Input({ placeholder = "Type to search..." }: { placeholder?: string }) {
  const { hasInput, query, setQuery } = useSearchDemo();

  return (
    <AnimatePresence mode="popLayout">
      {hasInput && (
        <motion.div
          key="search-input"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={TRANSITION.collapse}
          className="mb-3"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 text-sm rounded font-mono"
            style={{
              background: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              outline: "none",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--color-accent)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border)";
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── List ───────────────────────────────────────────────────────────
// Renders results with staggered animations.
// Uses render prop for item content — consumer decides how items look.

type ListProps = {
  children: (item: string, index: number) => ReactNode;
};

function List({ children: renderItem }: ListProps) {
  const { results, isEmpty } = useSearchDemo();

  return (
    <AnimatePresence mode="popLayout">
      {isEmpty ? (
        <Empty />
      ) : (
        <motion.ul
          key="result-list"
          className="flex flex-col gap-0.5 list-none p-0 m-0"
        >
          <AnimatePresence mode="popLayout">
            {results.map((item, index) => (
              <Item key={item} index={index}>
                {renderItem(item, index)}
              </Item>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </AnimatePresence>
  );
}

// ── Item ───────────────────────────────────────────────────────────
// A single list row with staggered enter/exit animation.

function Item({
  index,
  children,
}: {
  index: number;
  children: ReactNode;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ ...SPRING.snappy, delay: index * STAGGER.fast }}
      className="text-sm py-1.5 px-2 rounded"
      style={{ color: "var(--color-text)" }}
    >
      {children}
    </motion.li>
  );
}

// ── Highlight ──────────────────────────────────────────────────────
// Renders a text string with the matching query portion wrapped in <mark>.
// Only highlights when the "highlight" feature is enabled.

function Highlight({ text }: { text: string }) {
  const { hasHighlight, highlightText } = useSearchDemo();

  if (!hasHighlight) return <>{text}</>;

  return (
    <>
      {highlightText(text).map((seg, i) =>
        seg.match ? (
          <mark
            key={i}
            className="px-0.5 rounded-sm"
            style={{
              background: "var(--color-accent)",
              color: "var(--color-bg)",
            }}
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  );
}

// ── Empty ──────────────────────────────────────────────────────────
// Rendered by List when isEmpty is true.

function Empty() {
  const { query } = useSearchDemo();

  return (
    <motion.p
      key="empty-state"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={TRANSITION.enterItem}
      className="text-sm italic py-2"
      style={{ color: "var(--color-muted)" }}
    >
      No results for &ldquo;{query}&rdquo;.
    </motion.p>
  );
}

// ── Inspector ──────────────────────────────────────────────────────
// Wraps StateInspector with context-driven entries and render count.

function Inspector() {
  const { activeStep, stateEntries, renderCount } = useSearchDemo();

  return (
    <StateInspector
      entries={stateEntries}
      title={activeStep === 6 ? "useSearch()" : "State"}
      renderCount={renderCount}
    />
  );
}

// ── ScrollArea ─────────────────────────────────────────────────────
// Scrollable content region. Just a flex container — children
// determine what goes inside.

function ScrollArea({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 min-h-0 overflow-auto px-5 py-4 flex flex-col gap-4">
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP 7-8: "GROWING PAINS" PHASE
// Same panel as steps 1-6 but features keep getting bolted on.
// Step 8 adds a layout picker that ACTUALLY rearranges the panel.
// ═══════════════════════════════════════════════════════════════════

// ── LockedToolbar ─────────────────────────────────────────────────
// Shows steps 1-6 features as all enabled and non-toggleable.
// Provides visual continuity: "we still have everything from before."

function LockedToolbar() {
  return (
    <div
      className="shrink-0 px-4 py-3 flex flex-wrap gap-2"
      style={{ borderBottom: "1px solid var(--color-border)" }}
    >
      <span
        className="text-[10px] font-mono uppercase tracking-wider self-center mr-1"
        style={{ color: "var(--color-muted)" }}
      >
        Features
      </span>
      {FEATURES.map((f) => (
        <span
          key={f.id}
          className="px-2.5 py-1 text-xs font-mono rounded"
          style={{
            background: "var(--color-surface-2)",
            color: "var(--color-text)",
            border: "1px solid var(--color-border)",
            opacity: 0.6,
          }}
        >
          <span
            className="inline-block w-2 h-2 rounded-full mr-1.5"
            style={{ background: "var(--color-accent)" }}
          />
          {f.label}
        </span>
      ))}
    </div>
  );
}

// ── ExtraToolbar ───────────────────────────────────────────────────
// New feature toggles for steps 7-8. Each toggle adds props to the
// monolith and the prop counter climbs visibly.

function ExtraToolbar() {
  const { extras, toggleExtra, propCount } = useSearchDemo();

  return (
    <div
      className="shrink-0 px-4 py-2.5 flex flex-wrap items-center gap-2"
      style={{ borderBottom: "1px solid var(--color-border)" }}
    >
      <span
        className="text-[10px] font-mono uppercase tracking-wider self-center mr-1"
        style={{ color: "var(--color-muted)" }}
      >
        Add features
      </span>
      {EXTRA_FEATURES.map((ef) => {
        const isOn = extras.has(ef.id);
        return (
          <button
            key={ef.id}
            onClick={() => toggleExtra(ef.id)}
            className="px-2.5 py-1 text-xs font-mono rounded transition-all"
            style={{
              background: isOn ? "var(--color-surface-2)" : "transparent",
              color: isOn ? "var(--color-text)" : "var(--color-muted)",
              border: `1px solid ${isOn ? "var(--color-border)" : "transparent"}`,
            }}
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-1.5"
              style={{
                background: isOn ? "var(--color-accent)" : "var(--color-muted)",
                opacity: isOn ? 1 : 0.3,
              }}
            />
            {ef.label}
            <span
              className="ml-1.5 text-[9px]"
              style={{ color: "var(--color-muted)" }}
            >
              +{ef.props} prop{ef.props > 1 ? "s" : ""}
            </span>
          </button>
        );
      })}
      <PropCounter count={propCount} />
    </div>
  );
}

function PropCounter({ count }: { count: number }) {
  return (
    <motion.div
      key={count}
      initial={{ scale: 1.3 }}
      animate={{ scale: 1 }}
      transition={SPRING.snappy}
      className="ml-auto px-2 py-0.5 rounded text-[10px] font-mono"
      style={{
        background: count > 5
          ? "color-mix(in srgb, var(--color-accent) 15%, transparent)"
          : "var(--color-surface-2)",
        color: count > 5 ? "var(--color-accent)" : "var(--color-muted)",
        border: `1px solid ${count > 5 ? "var(--color-accent)" : "var(--color-border)"}`,
      }}
    >
      {count} props
    </motion.div>
  );
}

// ── Shared result rendering used by GrowingPanel ──────────────────

function ResultListInline() {
  const { results, isEmpty, hasHighlight, highlightText, query } = useSearchDemo();

  if (isEmpty) {
    return (
      <p className="text-sm italic py-2" style={{ color: "var(--color-muted)" }}>
        No results for &ldquo;{query}&rdquo;.
      </p>
    );
  }

  return (
    <AnimatePresence mode="popLayout">
      <motion.ul
        key="result-list"
        className="flex flex-col gap-0.5 list-none p-0 m-0"
      >
        <AnimatePresence mode="popLayout">
          {results.map((item, index) => (
            <motion.li
              key={item}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ ...SPRING.snappy, delay: index * STAGGER.fast }}
              className="text-sm py-1.5 px-2 rounded"
              style={{ color: "var(--color-text)" }}
            >
              {hasHighlight
                ? highlightText(item).map((seg, i) =>
                    seg.match ? (
                      <mark
                        key={i}
                        className="px-0.5 rounded-sm"
                        style={{
                          background: "var(--color-accent)",
                          color: "var(--color-bg)",
                        }}
                      >
                        {seg.text}
                      </mark>
                    ) : (
                      <span key={i}>{seg.text}</span>
                    )
                  )
                : item}
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </AnimatePresence>
  );
}

function CountBadge() {
  const { results } = useSearchDemo();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-[10px] font-mono px-2 py-0.5 rounded"
      style={{
        background: "var(--color-surface-2)",
        color: "var(--color-muted)",
      }}
    >
      {results.length} result{results.length !== 1 ? "s" : ""}
    </motion.div>
  );
}

function ClearButton() {
  const { query, setQuery } = useSearchDemo();
  if (query.length === 0) return null;
  return (
    <motion.button
      initial={{ opacity: 0, width: 0 }}
      animate={{ opacity: 1, width: "auto" }}
      exit={{ opacity: 0, width: 0 }}
      transition={SPRING.snappy}
      onClick={() => setQuery("")}
      className="px-2 text-xs font-mono rounded shrink-0"
      style={{
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
        color: "var(--color-muted)",
      }}
    >
      Clear
    </motion.button>
  );
}

function SortButton() {
  const { sortOrder, toggleSort } = useSearchDemo();
  return (
    <motion.button
      initial={{ opacity: 0, width: 0 }}
      animate={{ opacity: 1, width: "auto" }}
      exit={{ opacity: 0, width: 0 }}
      transition={SPRING.snappy}
      onClick={toggleSort}
      className="px-2 text-xs font-mono rounded shrink-0"
      style={{
        background: sortOrder === "asc"
          ? "color-mix(in srgb, var(--color-accent) 12%, transparent)"
          : "var(--color-surface-2)",
        border: `1px solid ${sortOrder === "asc" ? "var(--color-accent)" : "var(--color-border)"}`,
        color: sortOrder === "asc" ? "var(--color-accent)" : "var(--color-muted)",
      }}
    >
      A→Z
    </motion.button>
  );
}

// ── GrowingPanel ──────────────────────────────────────────────────
// The live panel for steps 7-8. Same panel as steps 1-6 but with
// extras bolting on. In step 8, layoutId controls element order —
// the panel ACTUALLY rearranges when the user picks a layout.

function GrowingPanel() {
  const {
    query, setQuery, results, hasClear, hasCount, hasSort, layoutId,
  } = useSearchDemo();

  const inputRow = (
    <div className="flex gap-2 mb-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type to search..."
        className="flex-1 px-3 py-2 text-sm rounded font-mono"
        style={{
          background: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text)",
          outline: "none",
        }}
      />
      <AnimatePresence>
        {hasClear && <ClearButton />}
      </AnimatePresence>
      <AnimatePresence>
        {hasSort && layoutId !== "sort-bottom" && <SortButton />}
      </AnimatePresence>
    </div>
  );

  return (
    <div
      className="rounded-lg p-5"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <h3
        className="text-base font-semibold mt-0 mb-3 flex items-center justify-between"
        style={{ color: "var(--color-text)" }}
      >
        <span>Fruit List</span>
        <AnimatePresence>
          {hasCount && layoutId === "default" && <CountBadge />}
        </AnimatePresence>
      </h3>

      <AnimatePresence mode="popLayout">
        {hasCount && layoutId === "count-above" && (
          <motion.div
            key="count-above"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={TRANSITION.collapse}
            className="mb-3 px-2 py-1.5 rounded text-[11px] font-mono"
            style={{
              background: "var(--color-surface-2)",
              color: "var(--color-muted)",
            }}
          >
            {results.length} result{results.length !== 1 ? "s" : ""}
          </motion.div>
        )}
      </AnimatePresence>

      {inputRow}

      <ResultListInline />

      <AnimatePresence>
        {hasSort && layoutId === "sort-bottom" && (
          <motion.div
            key="sort-footer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={TRANSITION.collapse}
            className="mt-3 pt-3 flex justify-end"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            <SortButton />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── LayoutPicker ──────────────────────────────────────────────────
// Step 8: picks a layout and the panel ABOVE actually rearranges.
// Shows the prop cost of each layout change.

function LayoutPicker() {
  const { layoutId, setLayoutId } = useSearchDemo();

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div
        className="px-4 py-2 text-[10px] font-mono uppercase tracking-wider"
        style={{
          color: "var(--color-muted)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        Try a different layout
      </div>
      <div className="p-3 flex flex-col gap-1.5">
        {LAYOUT_PRESETS.map((preset) => {
          const isActive = layoutId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => setLayoutId(preset.id)}
              className="flex items-start gap-2 px-3 py-2 rounded text-left text-xs font-mono transition-all"
              style={{
                background: isActive
                  ? "color-mix(in srgb, var(--color-accent) 8%, transparent)"
                  : "transparent",
                border: `1px solid ${isActive ? "var(--color-accent)" : "transparent"}`,
                color: isActive ? "var(--color-text)" : "var(--color-muted)",
              }}
            >
              <span
                className="mt-0.5 shrink-0 w-2 h-2 rounded-full"
                style={{
                  background: isActive ? "var(--color-accent)" : "var(--color-border)",
                }}
              />
              <div className="flex-1">
                <div>{preset.label}</div>
                <div className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                  {preset.description}
                </div>
              </div>
              {preset.propsNeeded.length > 0 && (
                <div className="flex gap-1 shrink-0 self-center">
                  {preset.propsNeeded.map((prop) => (
                    <span
                      key={prop}
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono"
                      style={{
                        background: isActive
                          ? "color-mix(in srgb, var(--color-accent) 12%, transparent)"
                          : "transparent",
                        color: isActive ? "var(--color-accent)" : "var(--color-muted)",
                        border: `1px solid ${isActive ? "var(--color-accent)" : "var(--color-border)"}`,
                      }}
                    >
                      +{prop}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {layoutId !== "default" && (
          <motion.div
            key={layoutId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={TRANSITION.collapse}
            className="px-4 py-2.5 text-[11px] font-mono"
            style={{
              borderTop: "1px solid var(--color-border)",
              background: "color-mix(in srgb, var(--color-accent) 5%, transparent)",
              color: "var(--color-accent)",
            }}
          >
            The layout changed — but it cost you{" "}
            {LAYOUT_PRESETS.find((l) => l.id === layoutId)!.propsNeeded.length} new prop
            {LAYOUT_PRESETS.find((l) => l.id === layoutId)!.propsNeeded.length > 1 ? "s" : ""}.
            Watch the prop counter climb.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP 9: "COMPOSITION" PHASE
// Reorderable slots that prove layout = JSX tree, not prop config.
// ═══════════════════════════════════════════════════════════════════

const SLOT_LABELS: Record<SlotId, string> = {
  input: "Search.Input",
  count: "Search.Count",
  list: "Search.List",
  inspector: "Search.Inspector",
};

function SlotArranger() {
  const { slotOrder, moveSlot } = useSearchDemo();

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div
        className="px-4 py-2 text-[10px] font-mono uppercase tracking-wider"
        style={{
          color: "var(--color-muted)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        Rearrange components
      </div>
      <div className="p-2 flex flex-col gap-1">
        {slotOrder.map((id, idx) => (
          <motion.div
            key={id}
            layout
            transition={SPRING.snappy}
            className="flex items-center gap-2 px-3 py-2 rounded"
            style={{
              background: "var(--color-bg)",
              border: "1px solid var(--color-border)",
            }}
          >
            <span
              className="text-xs font-mono flex-1"
              style={{ color: "var(--color-accent)" }}
            >
              &lt;{SLOT_LABELS[id]} /&gt;
            </span>
            <div className="flex gap-0.5">
              <button
                onClick={() => moveSlot(id, "up")}
                disabled={idx === 0}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono transition-opacity"
                style={{
                  background: "var(--color-surface-2)",
                  color: "var(--color-muted)",
                  opacity: idx === 0 ? 0.3 : 1,
                }}
              >
                ↑
              </button>
              <button
                onClick={() => moveSlot(id, "down")}
                disabled={idx === slotOrder.length - 1}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono transition-opacity"
                style={{
                  background: "var(--color-surface-2)",
                  color: "var(--color-muted)",
                  opacity: idx === slotOrder.length - 1 ? 0.3 : 1,
                }}
              >
                ↓
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── JsxPreview ────────────────────────────────────────────────────
// Shows the equivalent JSX code that matches the current slot order.
// Lines animate to new positions when slots are reordered — proving
// that "the JSX tree IS the layout."

function JsxPreview() {
  const { slotOrder } = useSearchDemo();

  const JSX_LINES: Record<SlotId, string> = {
    input: '  <Search.Input placeholder="Search..." />',
    count: "  <Search.Count />",
    list: "  <Search.List>{(item) => <Search.Highlight text={item} />}</Search.List>",
    inspector: "  <Search.Empty>No results found.</Search.Empty>",
  };

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div
        className="px-4 py-2 text-[10px] font-mono uppercase tracking-wider flex items-center justify-between"
        style={{
          color: "var(--color-muted)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <span>Equivalent JSX</span>
        <span style={{ color: "var(--color-accent)", textTransform: "none" }}>
          live
        </span>
      </div>
      <div className="p-3 font-mono text-[11px] leading-relaxed">
        <div style={{ color: "var(--color-muted)" }}>
          {"<Search.Root items={items}>"}
        </div>
        <div className="flex flex-col">
          {slotOrder.map((id) => (
            <motion.div
              key={id}
              layout
              transition={SPRING.snappy}
              style={{ color: "var(--color-accent)" }}
            >
              {JSX_LINES[id]}
            </motion.div>
          ))}
        </div>
        <div style={{ color: "var(--color-muted)" }}>
          {"</Search.Root>"}
        </div>
      </div>
    </div>
  );
}

// Renders the actual composed demo based on slotOrder
function ComposedPanel() {
  const {
    query, setQuery, results, isEmpty, hasHighlight,
    highlightText, slotOrder,
  } = useSearchDemo();

  const slotRenderers: Record<SlotId, () => ReactNode> = {
    input: () => (
      <div className="mb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type to search..."
          className="w-full px-3 py-2 text-sm rounded font-mono"
          style={{
            background: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
            outline: "none",
          }}
        />
      </div>
    ),
    count: () => (
      <div
        className="text-[10px] font-mono px-2 py-1 mb-2"
        style={{ color: "var(--color-muted)" }}
      >
        {results.length} result{results.length !== 1 ? "s" : ""}
      </div>
    ),
    list: () => (
      <div className="mb-2">
        {isEmpty ? (
          <p
            className="text-sm italic py-2"
            style={{ color: "var(--color-muted)" }}
          >
            No results for &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5 list-none p-0 m-0">
            {results.map((item) => (
              <li
                key={item}
                className="text-sm py-1.5 px-2 rounded"
                style={{ color: "var(--color-text)" }}
              >
                {hasHighlight
                  ? highlightText(item).map((seg, i) =>
                      seg.match ? (
                        <mark
                          key={i}
                          className="px-0.5 rounded-sm"
                          style={{
                            background: "var(--color-accent)",
                            color: "var(--color-bg)",
                          }}
                        >
                          {seg.text}
                        </mark>
                      ) : (
                        <span key={i}>{seg.text}</span>
                      )
                    )
                  : item}
              </li>
            ))}
          </ul>
        )}
      </div>
    ),
    inspector: () => (
      <div>
        <Inspector />
      </div>
    ),
  };

  return (
    <div
      className="rounded-lg p-5"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <h3
        className="text-base font-semibold mt-0 mb-3"
        style={{ color: "var(--color-text)" }}
      >
        Fruit List
      </h3>
      {slotOrder.map((id) => (
        <Fragment key={id}>{slotRenderers[id]()}</Fragment>
      ))}
    </div>
  );
}

// ── Namespace export ───────────────────────────────────────────────

export const SearchDemo = {
  Root,
  Toolbar,
  NaiveToggle,
  StaleIndicator,
  Panel,
  Input,
  List,
  Item,
  Highlight,
  Empty,
  Inspector,
  ScrollArea,
  // Steps 7-8: growing pains
  LockedToolbar,
  ExtraToolbar,
  GrowingPanel,
  LayoutPicker,
  // Step 9: composition
  SlotArranger,
  JsxPreview,
  ComposedPanel,
} as const;
