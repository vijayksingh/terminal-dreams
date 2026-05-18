"use client";

import { DemoSandbox } from "@/components/principles/demo-primitives/DemoSandbox";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import styles from "./DragDropDemo.module.css";

// ── Types ──────────────────────────────────────────────────────────

type CardData = {
  id: string;
  label: string;
};

type ColumnData = {
  id: string;
  title: string;
  cards: CardData[];
};

type DragPhase = "idle" | "pending" | "active";

type DragState = {
  phase: DragPhase;
  cardId: string;
  sourceColumnId: string;
  sourceIndex: number;
  pointerX: number;
  pointerY: number;
  offsetX: number;
  offsetY: number;
  targetColumnId: string | null;
  targetIndex: number;
};

type PointerEventEntry = {
  id: number;
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel";
  distance?: number;
  timestamp: number;
};

type KeyboardGrabState = {
  cardId: string;
  columnId: string;
  cardIndex: number;
};

type TabId = "Board" | "Events" | "Keyboard";

/** Cached bounding rects snapshotted at drag start.
 *  Since we reorder via CSS transforms (not DOM mutations), these rects
 *  remain valid for the entire drag gesture. See Phase 3 scenario 1. */
type CachedColumnRects = {
  columnId: string;
  rect: DOMRect;
  cardRects: DOMRect[];
}[];

// ── Constants ──────────────────────────────────────────────────────

const DRAG_ACTIVATION_THRESHOLD = 5; // px dead zone before drag activates
const CARD_HEIGHT_ESTIMATE = 40; // px, approximate card height for shuffle offsets

const INITIAL_COLUMNS: ColumnData[] = [
  {
    id: "todo",
    title: "To Do",
    cards: [
      { id: "c1", label: "Set up CI pipeline" },
      { id: "c2", label: "Write unit tests" },
      { id: "c3", label: "Design database schema" },
      { id: "c4", label: "Create API endpoints" },
    ],
  },
  {
    id: "progress",
    title: "In Progress",
    cards: [
      { id: "c5", label: "Implement auth flow" },
      { id: "c6", label: "Build dashboard UI" },
      { id: "c7", label: "Add drag-and-drop" },
      { id: "c8", label: "Optimize bundle size" },
    ],
  },
  {
    id: "done",
    title: "Done",
    cards: [
      { id: "c9", label: "Project scaffolding" },
      { id: "c10", label: "Configure linting" },
      { id: "c11", label: "Set up dev environment" },
      { id: "c12", label: "Deploy staging server" },
      { id: "c13", label: "Write tech spec" },
    ],
  },
];

const COLUMN_ACCENT_VAR: Record<string, string> = {
  todo: "var(--col-todo-accent)",
  progress: "var(--col-inprogress-accent)",
  done: "var(--col-done-accent)",
};

const EVENT_COLOR_VAR: Record<PointerEventEntry["type"], string> = {
  pointerdown: "var(--event-down)",
  pointermove: "var(--event-move)",
  pointerup: "var(--event-up)",
  pointercancel: "var(--event-cancel)",
};

const TAB_OPTIONS = ["Board", "Events", "Keyboard"] as const;

// ── Helpers ────────────────────────────────────────────────────────

function cloneColumns(cols: ColumnData[]): ColumnData[] {
  return cols.map((col) => ({
    ...col,
    cards: col.cards.map((card) => ({ ...card })),
  }));
}

function findCard(
  cols: ColumnData[],
  cardId: string,
): { colIndex: number; cardIndex: number } | null {
  for (let ci = 0; ci < cols.length; ci++) {
    const cardIdx = cols[ci].cards.findIndex((c) => c.id === cardId);
    if (cardIdx !== -1) return { colIndex: ci, cardIndex: cardIdx };
  }
  return null;
}

// ── Component ──────────────────────────────────────────────────────

export function DragDropDemo() {
  const [activeTab, setActiveTab] = useState<TabId>("Board");
  const [columns, setColumns] = useState<ColumnData[]>(() =>
    cloneColumns(INITIAL_COLUMNS),
  );
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [events, setEvents] = useState<PointerEventEntry[]>([]);
  const [kbGrab, setKbGrab] = useState<KeyboardGrabState | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [pointerAnnouncement, setPointerAnnouncement] = useState("");
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);

  const reducedMotion = usePrefersReducedMotion();
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cachedRectsRef = useRef<CachedColumnRects>([]);
  const eventIdRef = useRef(0);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const accDistRef = useRef(0);
  const timelineEndRef = useRef<HTMLDivElement | null>(null);
  const refocusCardIdRef = useRef<string | null>(null);
  const refocusColumnIdRef = useRef<string | null>(null);

  // Auto-scroll timeline to latest event
  useEffect(() => {
    if (activeTab === "Events" && timelineEndRef.current) {
      timelineEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [events.length, activeTab]);

  // Fix 3: Restore focus after cross-column keyboard move
  useEffect(() => {
    const cardId = refocusCardIdRef.current;
    if (!cardId) return;
    refocusCardIdRef.current = null;
    // Use requestAnimationFrame to ensure React has committed the DOM update
    requestAnimationFrame(() => {
      const el = document.querySelector(
        `[data-card-id="${cardId}"]`,
      ) as HTMLElement | null;
      el?.focus();
    });
  }, [kbGrab?.columnId]);

  // ── Hit Testing ────────────────────────────────────────────────

  /** Snapshot all column and card bounding rects at drag start.
   *  Since the demo repositions cards via CSS transforms (not DOM reorders),
   *  these rects stay valid for the entire gesture — avoiding repeated
   *  getBoundingClientRect calls on every pointermove.
   *  This is the "cache rects at drag start" optimisation from Phase 3. */
  const snapshotRects = useCallback(() => {
    const snapshot: CachedColumnRects = [];
    for (let i = 0; i < columnRefs.current.length; i++) {
      const el = columnRefs.current[i];
      if (!el) continue;
      const cardEls = el.querySelectorAll("[data-card-id]");
      const cardRects: DOMRect[] = [];
      for (let j = 0; j < cardEls.length; j++) {
        cardRects.push(cardEls[j].getBoundingClientRect());
      }
      snapshot.push({
        columnId: columns[i].id,
        rect: el.getBoundingClientRect(),
        cardRects,
      });
    }
    cachedRectsRef.current = snapshot;
  }, [columns]);

  /** Hit-test using cached rects (O(columns + cards) with no forced reflow). */
  const hitTestColumn = useCallback(
    (x: number, y: number): { columnId: string; index: number } | null => {
      const cached = cachedRectsRef.current;
      for (let i = 0; i < cached.length; i++) {
        const { columnId, rect, cardRects } = cached[i];
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          let insertIndex = cardRects.length;
          for (let j = 0; j < cardRects.length; j++) {
            const midY = cardRects[j].top + cardRects[j].height / 2;
            if (y < midY) {
              insertIndex = j;
              break;
            }
          }
          return { columnId, index: insertIndex };
        }
      }
      return null;
    },
    [],
  );

  // ── Pointer Drag Handlers ──────────────────────────────────────

  const addEvent = useCallback((type: PointerEventEntry["type"], distance?: number) => {
    eventIdRef.current += 1;
    setEvents((prev) => [
      ...prev,
      { id: eventIdRef.current, type, distance, timestamp: Date.now() },
    ]);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, cardId: string, columnId: string, cardIndex: number) => {
      if (e.button !== 0) return;
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      const rect = target.getBoundingClientRect();
      dragStartPosRef.current = { x: e.clientX, y: e.clientY };
      accDistRef.current = 0;

      // Start in "pending" phase — not yet a real drag until the threshold is crossed
      setDragState({
        phase: "pending",
        cardId,
        sourceColumnId: columnId,
        sourceIndex: cardIndex,
        pointerX: e.clientX,
        pointerY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        targetColumnId: columnId,
        targetIndex: cardIndex,
      });

      if (activeTab === "Events") {
        addEvent("pointerdown");
      }
    },
    [activeTab, addEvent],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState) return;

      const dx = e.clientX - dragStartPosRef.current.x;
      const dy = e.clientY - dragStartPosRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      accDistRef.current = Math.round(dist);

      // Fix 4: Dead zone — don't activate drag until pointer moves beyond threshold
      if (dragState.phase === "pending") {
        if (dist < DRAG_ACTIVATION_THRESHOLD) {
          if (activeTab === "Events") {
            addEvent("pointermove", accDistRef.current);
          }
          return;
        }
        // Cross the threshold — cache bounding rects and promote to active drag.
        // Rects are snapshotted once here and reused for every subsequent
        // pointermove, avoiding repeated getBoundingClientRect calls.
        snapshotRects();
        setDragState((prev) => (prev ? { ...prev, phase: "active" } : null));
      }

      const hit = hitTestColumn(e.clientX, e.clientY);

      setDragState((prev) => {
        if (!prev) return null;
        const newTargetCol = hit?.columnId ?? null;
        const newTargetIdx = hit?.index ?? prev.targetIndex;

        // Fix 6: Announce drop target changes for pointer drag
        if (
          newTargetCol &&
          (newTargetCol !== prev.targetColumnId || newTargetIdx !== prev.targetIndex)
        ) {
          const colTitle = columns.find((c) => c.id === newTargetCol)?.title ?? newTargetCol;
          setPointerAnnouncement(
            `Moving to ${colTitle} column, position ${newTargetIdx + 1}`,
          );
        }

        return {
          ...prev,
          pointerX: e.clientX,
          pointerY: e.clientY,
          targetColumnId: newTargetCol,
          targetIndex: newTargetIdx,
        };
      });

      if (activeTab === "Events") {
        addEvent("pointermove", accDistRef.current);
      }
    },
    [dragState, hitTestColumn, snapshotRects, activeTab, addEvent, columns],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState) return;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

      // If still in pending phase, the threshold was never crossed — treat as click, not drag
      if (dragState.phase === "pending") {
        setDragState(null);
        setPointerAnnouncement("");
        if (activeTab === "Events") {
          addEvent("pointerup");
        }
        return;
      }

      const hit = hitTestColumn(e.clientX, e.clientY);

      if (hit) {
        setColumns((prev) => {
          const next = cloneColumns(prev);
          const sourceColIdx = next.findIndex((c) => c.id === dragState.sourceColumnId);
          const targetColIdx = next.findIndex((c) => c.id === hit.columnId);
          if (sourceColIdx === -1 || targetColIdx === -1) return prev;

          const [card] = next[sourceColIdx].cards.splice(dragState.sourceIndex, 1);
          if (!card) return prev;

          let insertIdx = hit.index;
          // Adjust index if moving within the same column and the source was before the target
          if (sourceColIdx === targetColIdx && dragState.sourceIndex < insertIdx) {
            insertIdx = Math.max(0, insertIdx - 1);
          }

          next[targetColIdx].cards.splice(insertIdx, 0, card);
          return next;
        });
      }

      if (activeTab === "Events") {
        addEvent("pointerup");
      }

      setDragState(null);
      setPointerAnnouncement("");
      cachedRectsRef.current = [];
    },
    [dragState, hitTestColumn, activeTab, addEvent],
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState) return;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      setDragState(null);
      setPointerAnnouncement("");
      cachedRectsRef.current = [];

      if (activeTab === "Events") {
        addEvent("pointercancel");
      }
    },
    [dragState, activeTab, addEvent],
  );

  // ── Keyboard Handlers ──────────────────────────────────────────

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent, cardId: string, columnId: string, cardIndex: number) => {
      if (activeTab !== "Keyboard") return;

      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!kbGrab) {
          // Grab
          setKbGrab({ cardId, columnId, cardIndex });
          const card = columns
            .find((c) => c.id === columnId)
            ?.cards.find((c) => c.id === cardId);
          setAnnouncement(
            `Grabbed ${card?.label ?? "card"}. Use arrow keys to move. Space to drop. Escape to cancel.`,
          );
        } else if (kbGrab.cardId === cardId) {
          // Drop
          setKbGrab(null);
          const card = columns
            .find((c) => c.id === columnId)
            ?.cards.find((c) => c.id === cardId);
          setAnnouncement(
            `Dropped ${card?.label ?? "card"} in ${columns.find((c) => c.id === columnId)?.title ?? "column"}, position ${cardIndex + 1}.`,
          );
        }
        return;
      }

      if (e.key === "Escape" && kbGrab) {
        e.preventDefault();
        setAnnouncement("Cancelled move.");
        setKbGrab(null);
        return;
      }

      if (!kbGrab || kbGrab.cardId !== cardId) return;

      const colIdx = columns.findIndex((c) => c.id === kbGrab.columnId);
      if (colIdx === -1) return;

      if (e.key === "ArrowUp" && kbGrab.cardIndex > 0) {
        e.preventDefault();
        setColumns((prev) => {
          const next = cloneColumns(prev);
          const col = next[colIdx];
          const fromIdx = kbGrab.cardIndex;
          const toIdx = fromIdx - 1;
          [col.cards[fromIdx], col.cards[toIdx]] = [col.cards[toIdx], col.cards[fromIdx]];
          return next;
        });
        const newIdx = kbGrab.cardIndex - 1;
        setKbGrab((prev) => (prev ? { ...prev, cardIndex: newIdx } : null));
        setAnnouncement(
          `Moved to position ${newIdx + 1} of ${columns[colIdx].cards.length} in ${columns[colIdx].title}.`,
        );
      } else if (
        e.key === "ArrowDown" &&
        kbGrab.cardIndex < columns[colIdx].cards.length - 1
      ) {
        e.preventDefault();
        setColumns((prev) => {
          const next = cloneColumns(prev);
          const col = next[colIdx];
          const fromIdx = kbGrab.cardIndex;
          const toIdx = fromIdx + 1;
          [col.cards[fromIdx], col.cards[toIdx]] = [col.cards[toIdx], col.cards[fromIdx]];
          return next;
        });
        const newIdx = kbGrab.cardIndex + 1;
        setKbGrab((prev) => (prev ? { ...prev, cardIndex: newIdx } : null));
        setAnnouncement(
          `Moved to position ${newIdx + 1} of ${columns[colIdx].cards.length} in ${columns[colIdx].title}.`,
        );
      } else if (e.key === "ArrowLeft" && colIdx > 0) {
        e.preventDefault();
        const targetColIdx = colIdx - 1;
        setColumns((prev) => {
          const next = cloneColumns(prev);
          const [card] = next[colIdx].cards.splice(kbGrab.cardIndex, 1);
          if (!card) return prev;
          next[targetColIdx].cards.push(card);
          return next;
        });
        const newCardIndex = columns[targetColIdx].cards.length;
        // Fix 3: Schedule focus recovery after cross-column DOM rebuild
        refocusCardIdRef.current = kbGrab.cardId;
        refocusColumnIdRef.current = columns[targetColIdx].id;
        setKbGrab({
          cardId: kbGrab.cardId,
          columnId: columns[targetColIdx].id,
          cardIndex: newCardIndex,
        });
        setAnnouncement(
          `Moved to ${columns[targetColIdx].title}, position ${newCardIndex + 1}.`,
        );
      } else if (e.key === "ArrowRight" && colIdx < columns.length - 1) {
        e.preventDefault();
        const targetColIdx = colIdx + 1;
        setColumns((prev) => {
          const next = cloneColumns(prev);
          const [card] = next[colIdx].cards.splice(kbGrab.cardIndex, 1);
          if (!card) return prev;
          next[targetColIdx].cards.push(card);
          return next;
        });
        const newCardIndex = columns[targetColIdx].cards.length;
        // Fix 3: Schedule focus recovery after cross-column DOM rebuild
        refocusCardIdRef.current = kbGrab.cardId;
        refocusColumnIdRef.current = columns[targetColIdx].id;
        setKbGrab({
          cardId: kbGrab.cardId,
          columnId: columns[targetColIdx].id,
          cardIndex: newCardIndex,
        });
        setAnnouncement(
          `Moved to ${columns[targetColIdx].title}, position ${newCardIndex + 1}.`,
        );
      }
    },
    [activeTab, kbGrab, columns],
  );

  // Reset keyboard grab when switching tabs
  useEffect(() => {
    setKbGrab(null);
    setFocusedCardId(null);
    setAnnouncement("");
  }, [activeTab]);

  // ── Render helpers ─────────────────────────────────────────────

  const renderCard = (
    card: CardData,
    columnId: string,
    cardIndex: number,
    mode: "pointer" | "keyboard",
  ) => {
    const isActiveDrag = dragState?.phase === "active";
    const isDragging = isActiveDrag && dragState?.cardId === card.id;
    const isGrabbed = kbGrab?.cardId === card.id;
    const isFocused = focusedCardId === card.id && mode === "keyboard";

    // Fix 2: Compute shuffle offset — cards at/after the insertion index shift down
    let shuffleY = 0;
    if (
      isActiveDrag &&
      dragState &&
      !reducedMotion &&
      dragState.targetColumnId === columnId &&
      dragState.cardId !== card.id
    ) {
      // If this card is at or after the target index, shift it down
      if (cardIndex >= dragState.targetIndex) {
        shuffleY = CARD_HEIGHT_ESTIMATE;
      }
    }

    const needsShift = shuffleY !== 0;

    const classNames = [
      styles.card,
      isDragging ? styles.cardDragging : "",
      isFocused ? styles.cardFocused : "",
      isGrabbed ? styles.cardGrabbed : "",
      needsShift ? styles.cardShifted : "",
    ]
      .filter(Boolean)
      .join(" ");

    const cardStyle: React.CSSProperties = {
      "--card-accent": COLUMN_ACCENT_VAR[columnId],
      ...(needsShift ? { transform: `translateY(${shuffleY}px)` } : {}),
    } as React.CSSProperties;

    return (
      <div>
        <div
          className={classNames}
          data-card-id={card.id}
          style={cardStyle}
          tabIndex={mode === "keyboard" ? 0 : -1}
          role={mode === "keyboard" ? "option" : undefined}
          aria-selected={isGrabbed}
          aria-label={`${card.label}${isGrabbed ? ", grabbed" : ""}`}
          onPointerDown={
            mode === "pointer"
              ? (e) => handlePointerDown(e, card.id, columnId, cardIndex)
              : undefined
          }
          onKeyDown={
            mode === "keyboard"
              ? (e) => handleCardKeyDown(e, card.id, columnId, cardIndex)
              : undefined
          }
          onFocus={
            mode === "keyboard"
              ? () => setFocusedCardId(card.id)
              : undefined
          }
          onBlur={
            mode === "keyboard"
              ? () => setFocusedCardId(null)
              : undefined
          }
        >
          {card.label}
          {isGrabbed && (
            <span className={styles.cardGrabbedLabel}>moving</span>
          )}
        </div>
      </div>
    );
  };

  const renderColumn = (
    col: ColumnData,
    colIndex: number,
    mode: "pointer" | "keyboard",
  ) => {
    const isActiveDrag = dragState?.phase === "active";
    const isDropTarget =
      isActiveDrag &&
      dragState?.targetColumnId === col.id &&
      dragState?.sourceColumnId !== col.id;

    const classNames = [
      styles.column,
      isDropTarget ? styles.columnDropTarget : "",
    ]
      .filter(Boolean)
      .join(" ");

    const showTrailingIndicator =
      isActiveDrag &&
      dragState &&
      dragState.targetColumnId === col.id &&
      dragState.targetIndex === col.cards.length;

    // Insertion indicator for same-column reorder: appears at the target
    // index position to show exactly where the dragged card will land.
    const isSameColumnReorder =
      isActiveDrag &&
      dragState &&
      dragState.targetColumnId === col.id &&
      dragState.sourceColumnId === col.id &&
      !reducedMotion;
    const insertionIndex = isSameColumnReorder ? dragState.targetIndex : -1;

    return (
      <div
        key={col.id}
        className={classNames}
        ref={(el) => {
          columnRefs.current[colIndex] = el;
        }}
      >
        <div className={styles.columnHeader}>
          <h4 className={styles.columnTitle}>{col.title}</h4>
          <span className={styles.columnCount}>{col.cards.length}</span>
        </div>
        <div
          className={styles.cardList}
          role={mode === "keyboard" ? "listbox" : undefined}
          aria-label={`${col.title} column`}
        >
          {col.cards.map((card, i) => (
            <React.Fragment key={card.id}>
              {insertionIndex === i && card.id !== dragState?.cardId && (
                <div className={styles.cardInsertionIndicator} aria-hidden="true" />
              )}
              {renderCard(card, col.id, i, mode)}
            </React.Fragment>
          ))}
          {showTrailingIndicator && (
            <div className={styles.cardDropIndicator} />
          )}
        </div>
      </div>
    );
  };

  // ── Ghost Element ──────────────────────────────────────────────

  const renderGhost = () => {
    if (!dragState || dragState.phase !== "active") return null;
    const loc = findCard(columns, dragState.cardId);
    if (!loc) return null;
    const card = columns[loc.colIndex].cards[loc.cardIndex];
    if (!card) return null;

    const ghostX = dragState.pointerX - dragState.offsetX;
    const ghostY = dragState.pointerY - dragState.offsetY;
    // Fix 1: Position via translate3d (compositor-only) instead of left/top (layout-triggering)
    const tilt = reducedMotion ? "" : "rotate(2deg) scale(1.02)";
    const transform = `translate3d(${ghostX}px, ${ghostY}px, 0) ${tilt}`.trim();

    return (
      <div
        className={styles.ghost}
        aria-hidden="true"
        style={{
          transform,
          "--card-accent": COLUMN_ACCENT_VAR[dragState.sourceColumnId],
        } as React.CSSProperties}
      >
        {card.label}
      </div>
    );
  };

  // ── Event Timeline ─────────────────────────────────────────────

  const renderTimeline = () => {
    return (
      <div className={styles.timeline}>
        <div className={styles.timelineHeader}>
          <h4 className={styles.timelineTitle}>Pointer Events</h4>
          <button
            className={styles.timelineClearBtn}
            onClick={() => setEvents([])}
            type="button"
          >
            Clear
          </button>
        </div>
        <div className={styles.timelineTrack}>
          {events.length === 0 && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                color: "var(--color-muted)",
                opacity: 0.6,
              }}
            >
              Drag a card to see events...
            </span>
          )}
          {events.map((evt, i) => (
            <span key={evt.id}>
              {i > 0 && <span className={styles.timelineArrow}>{"→"}</span>}
              <span className={styles.timelineEvent}>
                <span
                  className={styles.timelineDot}
                  style={{ background: EVENT_COLOR_VAR[evt.type] }}
                />
                {evt.type.replace("pointer", "")}
                {evt.distance !== undefined && evt.type === "pointermove" && (
                  <span style={{ opacity: 0.6 }}>{evt.distance}px</span>
                )}
              </span>
            </span>
          ))}
          <div ref={timelineEndRef} />
        </div>
      </div>
    );
  };

  // ── Tab Content ────────────────────────────────────────────────

  // Shared pointer aria-live region for Board + Events tabs (Fix 6)
  const pointerAriaLive = (
    <div
      className={styles.srOnly}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {pointerAnnouncement}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "Board":
        return (
          <>
            <div
              className={styles.board}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            >
              {columns.map((col, i) => renderColumn(col, i, "pointer"))}
              {renderGhost()}
            </div>
            {pointerAriaLive}
          </>
        );
      case "Events":
        return (
          <div className={styles.timelineWrapper}>
            <div
              className={styles.board}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            >
              {columns.map((col, i) => renderColumn(col, i, "pointer"))}
              {renderGhost()}
            </div>
            {renderTimeline()}
            {pointerAriaLive}
          </div>
        );
      case "Keyboard":
        return (
          <div>
            <div className={styles.keyboardInstructions}>
              <p className={styles.keyboardInstructionsText}>
                <span className={styles.kbd}>Tab</span> to focus a card,{" "}
                <span className={styles.kbd}>Space</span> to grab,{" "}
                <span className={styles.kbd}>{"↑"}</span>
                <span className={styles.kbd}>{"↓"}</span> to reorder,{" "}
                <span className={styles.kbd}>{"←"}</span>
                <span className={styles.kbd}>{"→"}</span> to move between columns,{" "}
                <span className={styles.kbd}>Space</span> to drop,{" "}
                <span className={styles.kbd}>Esc</span> to cancel
              </p>
            </div>
            <div className={styles.board}>
              {columns.map((col, i) => renderColumn(col, i, "keyboard"))}
            </div>
            <div
              className={styles.srOnly}
              role="status"
              aria-live="assertive"
              aria-atomic="true"
            >
              {announcement}
            </div>
          </div>
        );
    }
  };

  return (
    <div className={styles.root}>
      <DemoSandbox title="Drag & Drop System">
        <DemoSandbox.Tabs
          options={TAB_OPTIONS}
          value={activeTab}
          onChange={(v) => setActiveTab(v as TabId)}
        />
        {renderTabContent()}
        <DemoSandbox.Caption>
          {activeTab === "Board" &&
            "Drag cards between columns to reorder. The ghost element follows the pointer while drop zones highlight on hover."}
          {activeTab === "Events" &&
            "Drag a card and watch the pointer event sequence fire in the timeline below the board."}
          {activeTab === "Keyboard" &&
            "Navigate with Tab, grab with Space, reorder with arrow keys. Screen reader announcements describe every move."}
        </DemoSandbox.Caption>
      </DemoSandbox>
    </div>
  );
}
