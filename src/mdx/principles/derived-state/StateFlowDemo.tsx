"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { DemoSandbox } from "@/components/principles/demo-primitives";
import { DialSegment } from "@/components/ui/dialkit/DialSegment";
import { DialToggle } from "@/components/ui/dialkit/DialToggle";

// ── Data ────────────────────────────────────────────────────────────

type CartItem = { emoji: string; price: number };

const CATALOG: CartItem[] = [
  { emoji: "\u{1F34E}", price: 3 }, // 🍎
  { emoji: "\u{1F34C}", price: 2 }, // 🍌
  { emoji: "\u{1F382}", price: 5 }, // 🎂
];

const DISCOUNT_THRESHOLD = 10;

function deriveCount(items: CartItem[]) {
  return items.length;
}

function deriveTotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.price, 0);
}

function deriveHasDiscount(items: CartItem[]) {
  return deriveTotal(items) >= DISCOUNT_THRESHOLD;
}

function formatPrice(n: number) {
  return `$${n}`;
}

// ── Types ───────────────────────────────────────────────────────────

type Mode = "Stored" | "Computed";
const MODE_OPTIONS = ["Stored", "Computed"] as const;

type BoxId = "items" | "itemCount" | "totalPrice" | "hasDiscount";

const DERIVED_IDS: BoxId[] = ["itemCount", "totalPrice", "hasDiscount"];

const BOX_LABELS: Record<BoxId, string> = {
  items: "items",
  itemCount: "itemCount",
  totalPrice: "totalPrice",
  hasDiscount: "hasDiscount",
};

/** Stagger delays (ms) used in Computed mode cascade */
const CASCADE_MS: Record<BoxId, number> = {
  items: 0,
  itemCount: 80,
  totalPrice: 160,
  hasDiscount: 240,
};

const FLASH_DURATION = 450; // ms per box flash

// ── Shared styles ───────────────────────────────────────────────────

const monoFont: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
};

// ── StateBox ────────────────────────────────────────────────────────

function StateBox({
  label,
  value,
  isSource,
  isDerived,
  mode,
  flashing,
  desynced,
  shaking,
}: {
  label: string;
  value: string;
  isSource: boolean;
  isDerived: boolean;
  mode: Mode;
  flashing: boolean;
  desynced: boolean;
  shaking: boolean;
}) {
  const reducedMotion = usePrefersReducedMotion();

  const borderStyle = mode === "Computed" && isDerived ? "dashed" : "solid";

  // Determine border color priority: desynced > flashing > source accent > neutral
  const borderColor = desynced
    ? "var(--color-error)"
    : flashing
      ? "var(--color-accent)"
      : isSource
        ? "var(--color-accent)"
        : "var(--color-border)";

  return (
    <motion.div
      animate={{
        scale: flashing && !reducedMotion ? 1.06 : 1,
        borderColor,
        x: shaking && !reducedMotion ? [0, -4, 4, -3, 3, -1, 0] : 0,
      }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : shaking
            ? { x: { duration: 0.4, ease: "easeOut" }, default: SPRING.snappy }
            : SPRING.snappy
      }
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "10px 16px",
        borderRadius: "var(--radius-2)",
        borderWidth: 1.5,
        borderStyle,
        background: "var(--color-surface-2)",
        minWidth: 100,
        ...monoFont,
      }}
    >
      <span
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--color-muted)",
          letterSpacing: "0.03em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--color-text)",
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>

      {/* DESYNC badge */}
      {desynced && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={reducedMotion ? { duration: 0 } : SPRING.snappy}
          style={{
            position: "absolute",
            top: -8,
            right: -8,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: "var(--color-bg)",
            background: "var(--color-error)",
            padding: "2px 5px",
            borderRadius: "var(--radius-1)",
            lineHeight: 1,
            textTransform: "uppercase",
          }}
        >
          desync
        </motion.span>
      )}
    </motion.div>
  );
}

// ── Arrow connector (SVG) ───────────────────────────────────────────

function ArrowDown({ desynced = false }: { desynced?: boolean }) {
  return (
    <svg
      width={2}
      height={24}
      viewBox="0 0 2 24"
      style={{ display: "block", margin: "0 auto", overflow: "visible" }}
      aria-hidden="true"
    >
      <line
        x1={1}
        y1={0}
        x2={1}
        y2={20}
        stroke={desynced ? "var(--color-error)" : "var(--color-muted)"}
        strokeWidth={1}
        strokeDasharray="4 3"
        strokeOpacity={0.5}
      />
      <polygon
        points="-3,18 1,24 5,18"
        fill={desynced ? "var(--color-error)" : "var(--color-muted)"}
        opacity={0.5}
      />
    </svg>
  );
}

// ── Main component ──────────────────────────────────────────────────

export function StateFlowDemo() {
  const reducedMotion = usePrefersReducedMotion();

  // ── Controls ──
  const [mode, setMode] = useState<Mode>("Stored");
  const [breakSync, setBreakSync] = useState(false);

  // ── Cart (source of truth) ──
  const [items, setItems] = useState<CartItem[]>([CATALOG[0]]);
  const nextIndexRef = useRef(1);

  // ── Stored-mode shadow state ──
  const [storedCount, setStoredCount] = useState(1);
  const [storedTotal, setStoredTotal] = useState(CATALOG[0].price);
  const [storedHasDiscount, setStoredHasDiscount] = useState(false);

  // ── Flash state: tracks which boxes are currently flashing ──
  const [flashing, setFlashing] = useState<Set<BoxId>>(new Set());
  const [shaking, setShaking] = useState(false);
  const flashTimers = useRef<Map<BoxId, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Mutation counter ──
  const [mutationCount, setMutationCount] = useState<number | null>(null);
  const mutationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Helpers ──

  const flashBox = useCallback((id: BoxId, delayMs: number) => {
    // Clear any previous timer for this box
    const prev = flashTimers.current.get(id);
    if (prev) clearTimeout(prev);

    const startTimer = setTimeout(() => {
      setFlashing((s) => new Set(s).add(id));

      const endTimer = setTimeout(() => {
        setFlashing((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
      }, FLASH_DURATION);

      flashTimers.current.set(id, endTimer);
    }, delayMs);

    flashTimers.current.set(id, startTimer);
  }, []);

  const triggerShake = useCallback(() => {
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    setShaking(true);
    shakeTimer.current = setTimeout(() => setShaking(false), 500);
  }, []);

  const showMutations = useCallback((count: number) => {
    if (mutationTimer.current) clearTimeout(mutationTimer.current);
    setMutationCount(count);
    mutationTimer.current = setTimeout(() => setMutationCount(null), 2200);
  }, []);

  // ── Desync detection ──
  const isTotalDesynced =
    mode === "Stored" && breakSync && storedTotal !== deriveTotal(items);

  // ── Add item ──
  const addItem = useCallback(() => {
    const newItem = CATALOG[nextIndexRef.current % CATALOG.length];
    nextIndexRef.current += 1;
    const newItems = [...items, newItem];
    setItems(newItems);

    if (mode === "Stored") {
      setStoredCount(newItems.length);
      if (!breakSync) {
        setStoredTotal(deriveTotal(newItems));
      }
      setStoredHasDiscount(deriveHasDiscount(newItems));

      showMutations(breakSync ? 3 : 4);

      // All flash simultaneously in stored mode
      flashBox("items", 0);
      flashBox("itemCount", 0);
      if (!breakSync) {
        flashBox("totalPrice", 0);
      } else {
        triggerShake();
      }
      flashBox("hasDiscount", 0);
    } else {
      showMutations(1);

      // Cascade flash in computed mode
      flashBox("items", CASCADE_MS.items);
      flashBox("itemCount", CASCADE_MS.itemCount);
      flashBox("totalPrice", CASCADE_MS.totalPrice);
      flashBox("hasDiscount", CASCADE_MS.hasDiscount);
    }
  }, [items, mode, breakSync, flashBox, triggerShake, showMutations]);

  // ── Remove item ──
  const removeItem = useCallback(() => {
    if (items.length === 0) return;
    const newItems = items.slice(0, -1);
    setItems(newItems);

    if (mode === "Stored") {
      setStoredCount(newItems.length);
      if (!breakSync) {
        setStoredTotal(deriveTotal(newItems));
      }
      setStoredHasDiscount(deriveHasDiscount(newItems));

      showMutations(breakSync ? 3 : 4);

      flashBox("items", 0);
      flashBox("itemCount", 0);
      if (!breakSync) {
        flashBox("totalPrice", 0);
      } else {
        triggerShake();
      }
      flashBox("hasDiscount", 0);
    } else {
      showMutations(1);

      flashBox("items", CASCADE_MS.items);
      flashBox("itemCount", CASCADE_MS.itemCount);
      flashBox("totalPrice", CASCADE_MS.totalPrice);
      flashBox("hasDiscount", CASCADE_MS.hasDiscount);
    }
  }, [items, mode, breakSync, flashBox, triggerShake, showMutations]);

  // ── Mode change ──
  const handleModeChange = useCallback(
    (newMode: Mode) => {
      setMode(newMode);
      setBreakSync(false);
      setStoredCount(items.length);
      setStoredTotal(deriveTotal(items));
      setStoredHasDiscount(deriveHasDiscount(items));
      setFlashing(new Set());
      setShaking(false);
      setMutationCount(null);
    },
    [items],
  );

  const handleBreakSyncChange = useCallback(
    (v: boolean) => {
      setBreakSync(v);
      if (!v) {
        // Re-sync when turning off
        setStoredTotal(deriveTotal(items));
        setShaking(false);
      }
    },
    [items],
  );

  // ── Display values ──
  const displayValues: Record<BoxId, string> = {
    items: `[${items.map((i) => i.emoji).join(", ")}]`,
    itemCount:
      mode === "Stored" ? String(storedCount) : String(deriveCount(items)),
    totalPrice:
      mode === "Stored"
        ? formatPrice(storedTotal)
        : formatPrice(deriveTotal(items)),
    hasDiscount:
      mode === "Stored"
        ? String(storedHasDiscount)
        : String(deriveHasDiscount(items)),
  };

  return (
    <DemoSandbox title="Derived State">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
          width: "100%",
          userSelect: "none",
        }}
      >
        {/* ── Source box ── */}
        <StateBox
          label={BOX_LABELS.items}
          value={displayValues.items}
          isSource
          isDerived={false}
          mode={mode}
          flashing={flashing.has("items")}
          desynced={false}
          shaking={false}
        />

        {/* ── Arrows ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 80,
            padding: "0 16px",
          }}
        >
          {DERIVED_IDS.map((id) => (
            <ArrowDown
              key={id}
              desynced={id === "totalPrice" && isTotalDesynced}
            />
          ))}
        </div>

        {/* ── Derived boxes ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {DERIVED_IDS.map((id) => (
            <StateBox
              key={id}
              label={BOX_LABELS[id]}
              value={displayValues[id]}
              isSource={false}
              isDerived
              mode={mode}
              flashing={flashing.has(id)}
              desynced={id === "totalPrice" && isTotalDesynced}
              shaking={id === "totalPrice" && shaking && isTotalDesynced}
            />
          ))}
        </div>

        {/* ── Actions + mutation counter ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 20,
          }}
        >
          <ActionButton onClick={addItem} disabled={false}>
            Add Item
          </ActionButton>
          <ActionButton onClick={removeItem} disabled={items.length === 0}>
            Remove Item
          </ActionButton>

          <motion.span
            animate={{ opacity: mutationCount !== null ? 1 : 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.15 }}
            style={{
              ...monoFont,
              fontSize: "var(--text-xs)",
              color:
                mutationCount === 1
                  ? "var(--color-success)"
                  : "var(--color-muted)",
              fontWeight: 600,
              minWidth: 100,
              textAlign: "center",
            }}
          >
            {mutationCount !== null
              ? `${mutationCount} mutation${mutationCount === 1 ? "" : "s"}`
              : " "}
          </motion.span>
        </div>
      </div>

      {/* ── Controls ── */}
      <DemoSandbox.Controls>
        <DialSegment
          label="mode"
          options={MODE_OPTIONS}
          value={mode}
          onChange={handleModeChange}
        />
        <div
          style={{
            opacity: mode === "Stored" ? 1 : 0.35,
            pointerEvents: mode === "Stored" ? "auto" : "none",
            transition: "opacity 0.15s",
          }}
        >
          <DialToggle
            label="break sync"
            value={breakSync}
            onChange={handleBreakSyncChange}
          />
        </div>
      </DemoSandbox.Controls>

      <DemoSandbox.Caption>
        {mode === "Stored"
          ? breakSync
            ? "Stored mode with sync bug — totalPrice forgets to update"
            : "Stored mode — every value managed with separate setState"
          : "Computed mode — derived values auto-cascade from source"}
      </DemoSandbox.Caption>
    </DemoSandbox>
  );
}

// ── ActionButton ────────────────────────────────────────────────────

function ActionButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...monoFont,
        fontSize: "var(--text-xs)",
        fontWeight: 500,
        padding: "6px 14px",
        borderRadius: "var(--radius-1)",
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        color: disabled ? "var(--color-muted)" : "var(--color-text)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "border-color 0.15s, opacity 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!disabled)
          e.currentTarget.style.borderColor = "var(--color-accent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border)";
      }}
    >
      {children}
    </button>
  );
}

export default StateFlowDemo;
