"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type {
  ArchitectureChallengeProps,
  Block,
  Connection,
  ConnectionFeedback,
  ConnectionKey,
  PlacedBlock,
  ValidationResult,
  ValidationRule,
  ValidationStatus,
} from "./types";
import styles from "./ArchitectureChallenge.module.css";

/* ── Constants ────────────────────────────────────────────────────── */

const GRID_SIZE = 20;
const BLOCK_WIDTH = 160;
const BLOCK_HEIGHT = 52;
const PORT_OFFSET_X = 7;

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function connKey(from: string, to: string): ConnectionKey {
  return `${from}->${to}`;
}

/* ── Category color mapping ───────────────────────────────────────── */

const CATEGORY_COLORS: Record<string, string> = {
  rendering: "var(--diagram-layer-0)",
  data: "var(--diagram-layer-1)",
  network: "var(--diagram-layer-2)",
  optimization: "var(--diagram-layer-3)",
  storage: "var(--diagram-layer-4)",
  layout: "var(--diagram-layer-5)",
  state: "var(--diagram-layer-6)",
  ui: "var(--diagram-layer-7)",
  performance: "var(--diagram-layer-8)",
  default: "var(--diagram-layer-9)",
};

function categoryColor(category?: string): string {
  if (!category) return CATEGORY_COLORS.default;
  return CATEGORY_COLORS[category.toLowerCase()] ?? CATEGORY_COLORS.default;
}

/* ── SVG bezier path between two points ───────────────────────────── */

function bezierPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  const dx = Math.abs(x2 - x1) * 0.5;
  const cpx1 = x1 + dx;
  const cpx2 = x2 - dx;
  return `M ${x1} ${y1} C ${cpx1} ${y1}, ${cpx2} ${y2}, ${x2} ${y2}`;
}

/* ── Compute port positions for a placed block ────────────────────── */

function outputPort(block: PlacedBlock): { x: number; y: number } {
  return {
    x: block.x + BLOCK_WIDTH + PORT_OFFSET_X,
    y: block.y + BLOCK_HEIGHT / 2,
  };
}

function inputPort(block: PlacedBlock): { x: number; y: number } {
  return {
    x: block.x - PORT_OFFSET_X,
    y: block.y + BLOCK_HEIGHT / 2,
  };
}

/* ── Validation logic ─────────────────────────────────────────────── */

function validateArchitecture(
  connections: Connection[],
  placedBlockIds: string[],
  rules: ValidationRule,
): ValidationResult {
  const connSet = new Set(connections.map((c) => connKey(c.from, c.to)));
  const feedback: ConnectionFeedback[] = [];
  let correct = 0;
  const total = rules.required.length;

  // Check required connections
  for (const req of rules.required) {
    const key = connKey(req.from, req.to);
    if (connSet.has(key)) {
      correct++;
      feedback.push({ key, status: "correct", message: "Correct" });
    } else {
      const msg =
        rules.errorMessages[key] ??
        `Missing connection: ${req.from} -> ${req.to}`;
      feedback.push({ key, status: "missing", message: msg });
    }
  }

  // Check forbidden connections
  if (rules.forbidden) {
    for (const forbidden of rules.forbidden) {
      const key = connKey(forbidden.from, forbidden.to);
      if (connSet.has(key)) {
        const msg =
          rules.errorMessages[key] ??
          `This connection should not exist: ${forbidden.from} -> ${forbidden.to}`;
        feedback.push({ key, status: "forbidden", message: msg });
      }
    }
  }

  // Check extra connections (not required, not forbidden)
  const requiredSet = new Set(
    rules.required.map((c) => connKey(c.from, c.to)),
  );
  const forbiddenSet = new Set(
    (rules.forbidden ?? []).map((c) => connKey(c.from, c.to)),
  );
  for (const conn of connections) {
    const key = connKey(conn.from, conn.to);
    if (!requiredSet.has(key) && !forbiddenSet.has(key)) {
      feedback.push({
        key,
        status: "extra",
        message:
          rules.errorMessages[key] ??
          "This connection is not needed",
      });
    }
  }

  // Check required blocks
  if (rules.requiredBlocks) {
    for (const blockId of rules.requiredBlocks) {
      if (!placedBlockIds.includes(blockId)) {
        const msg =
          rules.errorMessages[blockId] ??
          `Block "${blockId}" must be placed on the canvas`;
        feedback.push({
          key: `block:${blockId}` as ConnectionKey,
          status: "missing",
          message: msg,
        });
      }
    }
  }

  return { score: correct, total, feedback };
}

/* ── Main component ───────────────────────────────────────────────── */

export function ArchitectureChallenge({
  title,
  blocks,
  validation,
  mysteryBlock,
  scenarios,
  revealedAnswer,
  colorToken,
  onComplete,
  initialPlacements,
}: ArchitectureChallengeProps) {
  const reducedMotion = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLDivElement>(null);

  // ── State ────────────────────────────────────────────────────────
  const [placedBlocks, setPlacedBlocks] = useState<PlacedBlock[]>(() => {
    if (!initialPlacements) return [];
    return Object.entries(initialPlacements).map(([id, pos]) => ({
      id,
      x: snapToGrid(pos.x),
      y: snapToGrid(pos.y),
    }));
  });
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>("idle");
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [mysteryRevealed, setMysteryRevealed] = useState(false);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [isDraggingFromSidebar, setIsDraggingFromSidebar] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [srAnnouncement, setSrAnnouncement] = useState("");

  // Per-scenario state persistence
  const [scenarioStates, setScenarioStates] = useState<
    Record<string, { placed: PlacedBlock[]; connections: Connection[] }>
  >({});

  // Drag tracking ref
  const dragRef = useRef<{
    blockId: string;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    isFromSidebar: boolean;
  } | null>(null);

  // Ghost position for sidebar drag
  const [dragGhostPos, setDragGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [dragGhostBlockId, setDragGhostBlockId] = useState<string | null>(null);

  // Timer ref for handleCheck cleanup (fix #3)
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Connection error timer ref
  const connectionErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Derived values ───────────────────────────────────────────────
  const currentScenario = useMemo(() => {
    if (!scenarios || !activeScenario) return null;
    return scenarios.find((s) => s.id === activeScenario) ?? null;
  }, [scenarios, activeScenario]);

  const currentValidation = currentScenario
    ? currentScenario.validation
    : validation;

  const availableBlocks = useMemo(() => {
    let result = [...blocks];
    if (currentScenario) {
      if (currentScenario.removeBlocks) {
        const removeSet = new Set(currentScenario.removeBlocks);
        result = result.filter((b) => !removeSet.has(b.id));
      }
      if (currentScenario.addBlocks) {
        result = [...result, ...currentScenario.addBlocks];
      }
    }
    return result;
  }, [blocks, currentScenario]);

  const disabledBlockIds = useMemo(() => {
    if (!currentScenario?.removeBlocks) return new Set<string>();
    return new Set(currentScenario.removeBlocks);
  }, [currentScenario]);

  const placedBlockIds = useMemo(
    () => new Set(placedBlocks.map((b) => b.id)),
    [placedBlocks],
  );

  // ── Accent CSS var ───────────────────────────────────────────────
  const accentStyle = useMemo(() => {
    if (!colorToken) return undefined;
    return { "--ac-accent": `var(${colorToken})` } as React.CSSProperties;
  }, [colorToken]);

  // ── Scenario switching ───────────────────────────────────────────
  const switchScenario = useCallback(
    (scenarioId: string | null) => {
      // Save current state
      const currentKey = activeScenario ?? "__base__";
      setScenarioStates((prev) => ({
        ...prev,
        [currentKey]: { placed: placedBlocks, connections },
      }));

      // Reset validation
      setValidationStatus("idle");
      setValidationResult(null);
      setShowReveal(false);
      setConnectingFrom(null);
      setSelectedBlockId(null);

      if (scenarioId === null) {
        // Go back to base
        const saved = scenarioStates.__base__;
        if (saved) {
          setPlacedBlocks(saved.placed);
          setConnections(saved.connections);
        }
        setActiveScenario(null);
        return;
      }

      setActiveScenario(scenarioId);

      // Load saved or initialize from scenario
      const saved = scenarioStates[scenarioId];
      if (saved) {
        setPlacedBlocks(saved.placed);
        setConnections(saved.connections);
      } else {
        const scenario = scenarios?.find((s) => s.id === scenarioId);
        if (scenario?.initialState) {
          // Pre-wire the initial architecture
          setConnections(scenario.initialState);
          // Place blocks that appear in initialState but aren't placed yet
          const neededIds = new Set<string>();
          for (const c of scenario.initialState) {
            neededIds.add(c.from);
            neededIds.add(c.to);
          }
          // Use existing placed positions or auto-layout
          const existing = new Map(
            placedBlocks.map((b) => [b.id, b]),
          );
          const newPlaced: PlacedBlock[] = [];
          let autoY = 40;
          for (const id of neededIds) {
            if (existing.has(id)) {
              newPlaced.push(existing.get(id)!);
            } else {
              newPlaced.push({
                id,
                x: snapToGrid(60),
                y: snapToGrid(autoY),
              });
              autoY += BLOCK_HEIGHT + 40;
            }
          }
          setPlacedBlocks(newPlaced);
        } else {
          setPlacedBlocks([...placedBlocks]);
          setConnections([...connections]);
        }
      }
    },
    [
      activeScenario,
      connections,
      placedBlocks,
      scenarioStates,
      scenarios,
    ],
  );

  // ── Canvas coordinate helper ─────────────────────────────────────
  const canvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    [],
  );

  // ── Place block from sidebar ─────────────────────────────────────
  const placeBlock = useCallback(
    (blockId: string, x: number, y: number) => {
      if (placedBlockIds.has(blockId)) return;
      setPlacedBlocks((prev) => [
        ...prev,
        {
          id: blockId,
          x: snapToGrid(Math.max(0, x - BLOCK_WIDTH / 2)),
          y: snapToGrid(Math.max(0, y - BLOCK_HEIGHT / 2)),
        },
      ]);
      setValidationStatus("idle");
      setValidationResult(null);
    },
    [placedBlockIds],
  );

  // ── Remove block from canvas ─────────────────────────────────────
  const removeBlock = useCallback(
    (blockId: string) => {
      setPlacedBlocks((prev) => prev.filter((b) => b.id !== blockId));
      setConnections((prev) =>
        prev.filter((c) => c.from !== blockId && c.to !== blockId),
      );
      if (selectedBlockId === blockId) setSelectedBlockId(null);
      if (connectingFrom === blockId) setConnectingFrom(null);
      setValidationStatus("idle");
      setValidationResult(null);
    },
    [selectedBlockId, connectingFrom],
  );

  // ── Remove connection ────────────────────────────────────────────
  const removeConnection = useCallback(
    (from: string, to: string) => {
      setConnections((prev) =>
        prev.filter((c) => !(c.from === from && c.to === to)),
      );
      setSrAnnouncement(`Removed connection from ${from} to ${to}`);
      setValidationStatus("idle");
      setValidationResult(null);
    },
    [],
  );

  // ── Connection drawing ───────────────────────────────────────────
  const startConnection = useCallback((blockId: string) => {
    setConnectingFrom(blockId);
  }, []);

  // Helper to show a temporary connection error
  const showConnectionError = useCallback((message: string) => {
    if (connectionErrorTimerRef.current) clearTimeout(connectionErrorTimerRef.current);
    setConnectionError(message);
    connectionErrorTimerRef.current = setTimeout(() => {
      connectionErrorTimerRef.current = null;
      setConnectionError(null);
    }, 1500);
  }, []);

  const completeConnection = useCallback(
    (targetId: string) => {
      if (!connectingFrom || connectingFrom === targetId) {
        // Invalid: connecting to self or no source
        if (connectingFrom) {
          showConnectionError("Cannot connect a block to itself");
          setSrAnnouncement("Connection cancelled: cannot connect a block to itself");
        }
        setConnectingFrom(null);
        setCursorPos(null);
        return;
      }

      // Check for duplicate
      const exists = connections.some(
        (c) => c.from === connectingFrom && c.to === targetId,
      );
      if (exists) {
        showConnectionError("Connection already exists");
        setSrAnnouncement("Connection already exists");
        setConnectingFrom(null);
        setCursorPos(null);
        return;
      }

      const fromDef = availableBlocks.find((b) => b.id === connectingFrom);
      const toDef = availableBlocks.find((b) => b.id === targetId);
      const fromLabel = fromDef?.label ?? connectingFrom;
      const toLabel = toDef?.label ?? targetId;

      setConnections((prev) => [
        ...prev,
        { from: connectingFrom, to: targetId },
      ]);
      setSrAnnouncement(`Connected ${fromLabel} to ${toLabel}`);

      setConnectingFrom(null);
      setCursorPos(null);
      setValidationStatus("idle");
      setValidationResult(null);
    },
    [connectingFrom, connections, availableBlocks, showConnectionError],
  );

  // ── Pointer handlers for sidebar drag ────────────────────────────
  const handleSidebarPointerDown = useCallback(
    (e: React.PointerEvent, blockId: string) => {
      if (placedBlockIds.has(blockId) || disabledBlockIds.has(blockId)) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      dragRef.current = {
        blockId,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        isFromSidebar: true,
      };
      setIsDraggingFromSidebar(true);
      setDragGhostBlockId(blockId);
      setDragGhostPos({ x: e.clientX, y: e.clientY });
    },
    [placedBlockIds, disabledBlockIds],
  );

  // ── Pointer handlers for canvas block drag ───────────────────────
  const handleBlockPointerDown = useCallback(
    (e: React.PointerEvent, blockId: string) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const block = placedBlocks.find((b) => b.id === blockId);
      if (!block) return;

      const coords = canvasCoords(e.clientX, e.clientY);
      dragRef.current = {
        blockId,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: coords.x - block.x,
        offsetY: coords.y - block.y,
        isFromSidebar: false,
      };
      setSelectedBlockId(blockId);
    },
    [placedBlocks, canvasCoords],
  );

  // ── Pointer move on canvas (connection drawing + block drag) ─────
  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent) => {
      // Update cursor position for connection drawing line
      if (connectingFrom) {
        const coords = canvasCoords(e.clientX, e.clientY);
        setCursorPos(coords);
      }

      // Update ghost position during sidebar drag
      if (dragRef.current?.isFromSidebar) {
        setDragGhostPos({ x: e.clientX, y: e.clientY });
      }

      // Block dragging
      if (dragRef.current && !dragRef.current.isFromSidebar) {
        const coords = canvasCoords(e.clientX, e.clientY);
        const newX = snapToGrid(
          Math.max(0, coords.x - dragRef.current.offsetX),
        );
        const newY = snapToGrid(
          Math.max(0, coords.y - dragRef.current.offsetY),
        );
        setPlacedBlocks((prev) =>
          prev.map((b) =>
            b.id === dragRef.current!.blockId
              ? { ...b, x: newX, y: newY }
              : b,
          ),
        );
      }
    },
    [connectingFrom, canvasCoords],
  );

  const handleCanvasPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (dragRef.current?.isFromSidebar) {
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
            placeBlock(dragRef.current.blockId, x, y);
          }
        }
      }
      dragRef.current = null;
      setIsDraggingFromSidebar(false);
      setDragGhostPos(null);
      setDragGhostBlockId(null);
    },
    [placeBlock],
  );

  // Global pointer move for sidebar drag ghost (needed before pointer enters canvas)
  useEffect(() => {
    function handleGlobalPointerMove(e: PointerEvent) {
      if (dragRef.current?.isFromSidebar) {
        setDragGhostPos({ x: e.clientX, y: e.clientY });
      }
    }
    function handleGlobalPointerUp() {
      if (dragRef.current?.isFromSidebar) {
        dragRef.current = null;
        setIsDraggingFromSidebar(false);
        setDragGhostPos(null);
        setDragGhostBlockId(null);
      }
    }
    window.addEventListener("pointermove", handleGlobalPointerMove);
    window.addEventListener("pointerup", handleGlobalPointerUp);
    return () => {
      window.removeEventListener("pointermove", handleGlobalPointerMove);
      window.removeEventListener("pointerup", handleGlobalPointerUp);
    };
  }, []);

  // Cancel connection on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setConnectingFrom(null);
        setCursorPos(null);
        setSelectedBlockId(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Cleanup timers on unmount (fix #3: timer leak)
  useEffect(() => {
    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
      if (connectionErrorTimerRef.current) clearTimeout(connectionErrorTimerRef.current);
    };
  }, []);

  // ── Validation ───────────────────────────────────────────────────
  const handleCheck = useCallback(() => {
    setValidationStatus("checking");
    // Clear any existing timer
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    // Small delay for visual feedback
    checkTimerRef.current = setTimeout(() => {
      checkTimerRef.current = null;
      const result = validateArchitecture(
        connections,
        placedBlocks.map((b) => b.id),
        currentValidation,
      );
      setValidationResult(result);
      setValidationStatus("complete");

      // Reveal mystery block if all required connections are present
      if (mysteryBlock && result.score === result.total) {
        setMysteryRevealed(true);
      }

      // Fire onComplete callback
      onComplete?.(result);
    }, reducedMotion ? 0 : 300);
  }, [connections, placedBlocks, currentValidation, mysteryBlock, reducedMotion, onComplete]);

  // ── Reset ────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setPlacedBlocks([]);
    setConnections([]);
    setSelectedBlockId(null);
    setConnectingFrom(null);
    setCursorPos(null);
    setValidationStatus("idle");
    setValidationResult(null);
    setShowReveal(false);
  }, []);

  // ── Keyboard support for canvas blocks ───────────────────────────
  const handleBlockKeyDown = useCallback(
    (e: React.KeyboardEvent, blockId: string) => {
      const block = placedBlocks.find((b) => b.id === blockId);
      if (!block) return;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setPlacedBlocks((prev) =>
            prev.map((b) =>
              b.id === blockId ? { ...b, y: Math.max(0, b.y - GRID_SIZE) } : b,
            ),
          );
          break;
        case "ArrowDown":
          e.preventDefault();
          setPlacedBlocks((prev) =>
            prev.map((b) =>
              b.id === blockId ? { ...b, y: b.y + GRID_SIZE } : b,
            ),
          );
          break;
        case "ArrowLeft":
          e.preventDefault();
          setPlacedBlocks((prev) =>
            prev.map((b) =>
              b.id === blockId ? { ...b, x: Math.max(0, b.x - GRID_SIZE) } : b,
            ),
          );
          break;
        case "ArrowRight":
          e.preventDefault();
          setPlacedBlocks((prev) =>
            prev.map((b) =>
              b.id === blockId ? { ...b, x: b.x + GRID_SIZE } : b,
            ),
          );
          break;
        case " ":
          e.preventDefault();
          if (connectingFrom) {
            completeConnection(blockId);
          } else {
            startConnection(blockId);
          }
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          removeBlock(blockId);
          break;
        case "Enter":
          e.preventDefault();
          setSelectedBlockId(blockId === selectedBlockId ? null : blockId);
          break;
      }
    },
    [
      placedBlocks,
      connectingFrom,
      selectedBlockId,
      completeConnection,
      startConnection,
      removeBlock,
    ],
  );

  // ── Keyboard for sidebar blocks ──────────────────────────────────
  const handleSidebarKeyDown = useCallback(
    (e: React.KeyboardEvent, blockId: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (placedBlockIds.has(blockId) || disabledBlockIds.has(blockId)) return;

        // Auto-place at a good position
        const existingCount = placedBlocks.length;
        const col = existingCount % 3;
        const row = Math.floor(existingCount / 3);
        const x = 40 + col * (BLOCK_WIDTH + 60);
        const y = 40 + row * (BLOCK_HEIGHT + 60);
        placeBlock(blockId, x + BLOCK_WIDTH / 2, y + BLOCK_HEIGHT / 2);
      }
    },
    [placedBlockIds, disabledBlockIds, placedBlocks, placeBlock],
  );

  // ── Build feedback map keyed by connection key ───────────────────
  const feedbackMap = useMemo(() => {
    if (!validationResult) return new Map<ConnectionKey, ConnectionFeedback>();
    return new Map(validationResult.feedback.map((f) => [f.key, f]));
  }, [validationResult]);

  // ── Get placed block by id ───────────────────────────────────────
  const getPlacedBlock = useCallback(
    (id: string) => placedBlocks.find((b) => b.id === id),
    [placedBlocks],
  );

  // ── Get block definition by id ───────────────────────────────────
  const getBlockDef = useCallback(
    (id: string) => availableBlocks.find((b) => b.id === id),
    [availableBlocks],
  );

  // ── Connection line class based on feedback ──────────────────────
  function connectionLineClass(from: string, to: string): string {
    if (validationStatus !== "complete") return styles.connectionLine;
    const fb = feedbackMap.get(connKey(from, to));
    if (!fb) return styles.connectionLine;
    switch (fb.status) {
      case "correct":
        return `${styles.connectionLine} ${styles.connectionLineCorrect}`;
      case "forbidden":
        return `${styles.connectionLine} ${styles.connectionLineForbidden}`;
      case "extra":
        return `${styles.connectionLine} ${styles.connectionLineExtra}`;
      default:
        return styles.connectionLine;
    }
  }

  // ── Connection midpoint (for delete button) ──────────────────────
  function connectionMidpoint(
    from: string,
    to: string,
  ): { x: number; y: number } | null {
    const fromBlock = getPlacedBlock(from);
    const toBlock = getPlacedBlock(to);
    if (!fromBlock || !toBlock) return null;
    const p1 = outputPort(fromBlock);
    const p2 = inputPort(toBlock);
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  }

  // ── Mystery block handling ───────────────────────────────────────
  const handleMysteryDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!mysteryBlock || !mysteryRevealed) return;
      if (placedBlockIds.has(mysteryBlock.answer)) return;
      handleSidebarPointerDown(e, mysteryBlock.answer);
    },
    [mysteryBlock, mysteryRevealed, placedBlockIds, handleSidebarPointerDown],
  );

  const handleMysteryKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!mysteryBlock || !mysteryRevealed) return;
      if (placedBlockIds.has(mysteryBlock.answer)) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const existingCount = placedBlocks.length;
        const col = existingCount % 3;
        const row = Math.floor(existingCount / 3);
        const x = 40 + col * (BLOCK_WIDTH + 60);
        const y = 40 + row * (BLOCK_HEIGHT + 60);
        placeBlock(
          mysteryBlock.answer,
          x + BLOCK_WIDTH / 2,
          y + BLOCK_HEIGHT / 2,
        );
      }
    },
    [mysteryBlock, mysteryRevealed, placedBlockIds, placedBlocks, placeBlock],
  );

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className={styles.wrapper} style={accentStyle}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <h3 className={styles.topTitle}>{title}</h3>
        <div className={styles.buttonGroup}>
          <button
            className={styles.resetButton}
            onClick={handleReset}
            type="button"
          >
            Reset
          </button>
          {revealedAnswer && (
            <button
              className={styles.resetButton}
              onClick={() => setShowReveal((v) => !v)}
              type="button"
            >
              {showReveal ? "Hide Answer" : "Show Answer"}
            </button>
          )}
          <button
            className={styles.checkButton}
            onClick={handleCheck}
            type="button"
          >
            {validationStatus === "checking" ? "Checking..." : "Check Architecture"}
          </button>
        </div>
      </div>

      {/* Scenario tabs */}
      {scenarios && scenarios.length > 0 && (
        <div className={styles.scenarioTabs} role="tablist">
          <button
            className={`${styles.scenarioTab} ${
              !activeScenario ? styles.scenarioTabActive : ""
            }`}
            onClick={() => switchScenario(null)}
            role="tab"
            aria-selected={!activeScenario}
            type="button"
          >
            Phase 1: Build
          </button>
          {scenarios.map((s) => (
            <button
              key={s.id}
              className={`${styles.scenarioTab} ${
                activeScenario === s.id ? styles.scenarioTabActive : ""
              }`}
              onClick={() => switchScenario(s.id)}
              role="tab"
              aria-selected={activeScenario === s.id}
              type="button"
            >
              {s.title}
            </button>
          ))}
        </div>
      )}

      {/* Scenario description */}
      {currentScenario && (
        <div className={styles.scenarioDesc}>
          <p className={styles.scenarioDescText}>
            {currentScenario.description}
          </p>
        </div>
      )}

      {/* Main layout */}
      <div className={styles.main}>
        {/* Sidebar */}
        <div className={styles.sidebar} role="list" aria-label="Available blocks">
          <p className={styles.sidebarLabel}>Components</p>
          {availableBlocks.map((block) => {
            const isPlaced = placedBlockIds.has(block.id);
            const isDisabled = disabledBlockIds.has(block.id);
            return (
              <div
                key={block.id}
                className={`${styles.blockCard} ${
                  isPlaced ? styles.blockCardPlaced : ""
                } ${isDisabled ? styles.blockCardDisabled : ""}`}
                role="listitem"
                tabIndex={isPlaced || isDisabled ? -1 : 0}
                onPointerDown={(e) => handleSidebarPointerDown(e, block.id)}
                onKeyDown={(e) => handleSidebarKeyDown(e, block.id)}
                aria-label={`${block.label}${isPlaced ? " (placed)" : ""}`}
              >
                <span className={styles.blockCardLabel}>
                  <span
                    className={styles.categoryDot}
                    style={{ background: categoryColor(block.category) }}
                  />
                  {block.label}
                  {isPlaced && (
                    <span className={styles.blockCardCheck} aria-hidden="true">
                      &#10003;
                    </span>
                  )}
                </span>
                <p className={styles.blockCardDesc}>{block.description}</p>
              </div>
            );
          })}

          {/* Mystery block */}
          {mysteryBlock && (
            <div
              className={`${styles.blockCard} ${styles.mysteryCard} ${
                mysteryRevealed ? styles.mysteryRevealed : ""
              } ${
                mysteryRevealed && placedBlockIds.has(mysteryBlock.answer)
                  ? styles.blockCardPlaced
                  : ""
              }`}
              role="listitem"
              tabIndex={
                mysteryRevealed && !placedBlockIds.has(mysteryBlock.answer)
                  ? 0
                  : -1
              }
              onPointerDown={handleMysteryDrag}
              onKeyDown={handleMysteryKeyDown}
              aria-label={
                mysteryRevealed
                  ? mysteryBlock.answerLabel
                  : "Mystery block"
              }
            >
              <span className={styles.blockCardLabel}>
                {mysteryRevealed ? mysteryBlock.answerLabel : "???"}
              </span>
              <p
                className={
                  mysteryRevealed
                    ? styles.blockCardDesc
                    : styles.mysteryHint
                }
              >
                {mysteryRevealed
                  ? `Revealed: ${mysteryBlock.answerLabel}`
                  : mysteryBlock.hint}
              </p>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className={`${styles.canvasArea} ${
            isDraggingFromSidebar ? styles.canvasAreaDragging : ""
          }`}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onClick={() => {
            if (connectingFrom) {
              // Clicked empty canvas while connecting -- invalid
              showConnectionError("Click a target block's input port to connect");
              setSrAnnouncement("Connection cancelled: no target block selected");
              setConnectingFrom(null);
              setCursorPos(null);
            } else {
              setSelectedBlockId(null);
            }
          }}
          role="application"
          aria-label="Architecture canvas. Drag blocks here to build your architecture."
        >
          {/* Empty state */}
          {placedBlocks.length === 0 && (
            <div className={styles.canvasEmpty}>
              <p className={styles.canvasEmptyText}>
                Drag blocks from the sidebar
                <br />
                or press Enter on a block to place it
              </p>
            </div>
          )}

          {/* SVG arrow layer */}
          <svg className={styles.svgLayer}>
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon
                  points="0 0, 8 3, 0 6"
                  fill="var(--ac-accent)"
                />
              </marker>
              <marker
                id="arrowhead-correct"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon
                  points="0 0, 8 3, 0 6"
                  fill="var(--color-success)"
                />
              </marker>
              <marker
                id="arrowhead-error"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon
                  points="0 0, 8 3, 0 6"
                  fill="var(--color-error)"
                />
              </marker>
              <marker
                id="arrowhead-muted"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon
                  points="0 0, 8 3, 0 6"
                  fill="var(--color-muted)"
                />
              </marker>
            </defs>

            {/* Existing connections */}
            {connections.map((conn) => {
              const fromBlock = getPlacedBlock(conn.from);
              const toBlock = getPlacedBlock(conn.to);
              if (!fromBlock || !toBlock) return null;
              const p1 = outputPort(fromBlock);
              const p2 = inputPort(toBlock);

              const fb = feedbackMap.get(connKey(conn.from, conn.to));
              let markerEnd = "url(#arrowhead)";
              if (validationStatus === "complete" && fb) {
                if (fb.status === "correct") markerEnd = "url(#arrowhead-correct)";
                else if (fb.status === "forbidden" || fb.status === "extra")
                  markerEnd = "url(#arrowhead-error)";
              }

              const mid = connectionMidpoint(conn.from, conn.to);

              return (
                <g key={connKey(conn.from, conn.to)}>
                  <path
                    d={bezierPath(p1.x, p1.y, p2.x, p2.y)}
                    className={connectionLineClass(conn.from, conn.to)}
                    markerEnd={markerEnd}
                  />
                  {/* Delete button at midpoint */}
                  {mid && validationStatus !== "complete" && (
                    <g
                      className={styles.connectionDelete}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeConnection(conn.from, conn.to);
                      }}
                      role="button"
                      aria-label={`Remove connection from ${conn.from} to ${conn.to}`}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          removeConnection(conn.from, conn.to);
                        }
                      }}
                    >
                      <circle
                        cx={mid.x}
                        cy={mid.y}
                        r="8"
                        className={styles.connectionDeleteBg}
                      />
                      <text
                        x={mid.x}
                        y={mid.y}
                        className={styles.connectionDeleteX}
                      >
                        &#215;
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Missing connections (shown during validation) */}
            {validationStatus === "complete" &&
              validationResult?.feedback
                .filter((f) => f.status === "missing" && !f.key.startsWith("block:"))
                .map((f) => {
                  const [fromId, toId] = f.key.split("->") as [string, string];
                  const fromBlock = getPlacedBlock(fromId);
                  const toBlock = getPlacedBlock(toId);
                  if (!fromBlock || !toBlock) return null;
                  const p1 = outputPort(fromBlock);
                  const p2 = inputPort(toBlock);
                  return (
                    <path
                      key={`missing-${f.key}`}
                      d={bezierPath(p1.x, p1.y, p2.x, p2.y)}
                      className={`${styles.connectionLine} ${styles.connectionLineMissing}`}
                      markerEnd="url(#arrowhead-error)"
                    />
                  );
                })}

            {/* Revealed answer connections */}
            {showReveal &&
              revealedAnswer?.map((conn) => {
                const fromBlock = getPlacedBlock(conn.from);
                const toBlock = getPlacedBlock(conn.to);
                if (!fromBlock || !toBlock) return null;
                // Don't show if already connected
                const alreadyConnected = connections.some(
                  (c) => c.from === conn.from && c.to === conn.to,
                );
                if (alreadyConnected) return null;
                const p1 = outputPort(fromBlock);
                const p2 = inputPort(toBlock);
                return (
                  <path
                    key={`reveal-${conn.from}-${conn.to}`}
                    d={bezierPath(p1.x, p1.y, p2.x, p2.y)}
                    className={`${styles.connectionLine} ${styles.connectionLineReveal}`}
                    markerEnd="url(#arrowhead-muted)"
                  />
                );
              })}

            {/* Connection-in-progress drawing line */}
            {connectingFrom && cursorPos && (
              <>
                {(() => {
                  const fromBlock = getPlacedBlock(connectingFrom);
                  if (!fromBlock) return null;
                  const p1 = outputPort(fromBlock);
                  return (
                    <path
                      d={bezierPath(
                        p1.x,
                        p1.y,
                        cursorPos.x,
                        cursorPos.y,
                      )}
                      className={`${styles.connectionLine} ${styles.connectionLineDrawing}`}
                    />
                  );
                })()}
              </>
            )}
          </svg>

          {/* Canvas blocks */}
          {placedBlocks.map((placed) => {
            const blockDef = getBlockDef(placed.id);
            const label = blockDef?.label ?? placed.id;
            const category = blockDef?.category;
            const isSelected = selectedBlockId === placed.id;

            return (
              <div
                key={placed.id}
                className={`${styles.canvasBlock} ${
                  isSelected ? styles.canvasBlockSelected : ""
                }`}
                style={{
                  left: placed.x,
                  top: placed.y,
                  width: BLOCK_WIDTH,
                }}
                onPointerDown={(e) => handleBlockPointerDown(e, placed.id)}
                onKeyDown={(e) => handleBlockKeyDown(e, placed.id)}
                tabIndex={0}
                role="button"
                aria-label={`${label} block at position ${placed.x}, ${placed.y}. Use arrow keys to move, Space to connect, Delete to remove.`}
              >
                {/* Category color bar */}
                <span
                  className={styles.canvasBlockCategory}
                  style={{ background: categoryColor(category) }}
                  aria-hidden="true"
                />
                <span className={styles.canvasBlockLabel}>{label}</span>

                {/* Input port (left) */}
                <button
                  className={`${styles.port} ${styles.portInput} ${
                    connectingFrom && connectingFrom !== placed.id
                      ? styles.portActive
                      : ""
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (connectingFrom) {
                      completeConnection(placed.id);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      if (connectingFrom) {
                        completeConnection(placed.id);
                      }
                    }
                  }}
                  type="button"
                  aria-label={`${label} input port`}
                  tabIndex={-1}
                />

                {/* Output port (right) */}
                <button
                  className={`${styles.port} ${styles.portOutput} ${
                    connectingFrom === placed.id ? styles.portActive : ""
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (connectingFrom === placed.id) {
                      // Cancel
                      setConnectingFrom(null);
                      setCursorPos(null);
                    } else {
                      startConnection(placed.id);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      if (connectingFrom === placed.id) {
                        setConnectingFrom(null);
                        setCursorPos(null);
                      } else {
                        startConnection(placed.id);
                      }
                    }
                  }}
                  type="button"
                  aria-label={`${label} output port`}
                  tabIndex={-1}
                />

                {/* Remove button */}
                <button
                  className={styles.removeBlock}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeBlock(placed.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      removeBlock(placed.id);
                    }
                  }}
                  type="button"
                  aria-label={`Remove ${label}`}
                  tabIndex={-1}
                >
                  &#215;
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Validation panel */}
      {validationStatus === "complete" && validationResult && (
        <div className={styles.validationPanel} role="status" aria-live="polite">
          <div className={styles.validationScore}>
            <span>
              {validationResult.score}/{validationResult.total} connections
              correct
            </span>
            <div className={styles.validationScoreBar}>
              <div
                className={`${styles.validationScoreFill} ${
                  validationResult.score === validationResult.total
                    ? styles.validationScorePerfect
                    : styles.validationScorePartial
                }`}
                style={{
                  width: `${
                    validationResult.total > 0
                      ? (validationResult.score / validationResult.total) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
          <ul className={styles.validationFeedbackList}>
            {validationResult.feedback.map((fb) => {
              let statusClass = "";
              let icon = "";
              switch (fb.status) {
                case "correct":
                  statusClass = styles.feedbackCorrect;
                  icon = "✓";
                  break;
                case "missing":
                  statusClass = styles.feedbackMissing;
                  icon = "✗";
                  break;
                case "extra":
                  statusClass = styles.feedbackExtra;
                  icon = "‒";
                  break;
                case "forbidden":
                  statusClass = styles.feedbackForbidden;
                  icon = "⚠";
                  break;
              }
              return (
                <li
                  key={fb.key}
                  className={`${styles.feedbackItem} ${statusClass}`}
                >
                  <span className={styles.feedbackIcon} aria-hidden="true">
                    {icon}
                  </span>
                  <span>{fb.message}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Connection error toast (fix #4) */}
      {connectionError && (
        <div className={styles.connectionErrorToast} role="alert">
          {connectionError}
        </div>
      )}

      {/* Drag ghost for sidebar drag (fix #2) */}
      {dragGhostPos && dragGhostBlockId && (() => {
        const ghostDef = availableBlocks.find((b) => b.id === dragGhostBlockId);
        if (!ghostDef) return null;
        return (
          <div
            className={styles.dragGhost}
            style={{
              transform: `translate3d(${dragGhostPos.x - BLOCK_WIDTH / 2}px, ${dragGhostPos.y - BLOCK_HEIGHT / 2}px, 0)`,
            }}
            aria-hidden="true"
          >
            <span
              className={styles.canvasBlockCategory}
              style={{ background: categoryColor(ghostDef.category) }}
            />
            <span className={styles.canvasBlockLabel}>{ghostDef.label}</span>
          </div>
        );
      })()}

      {/* Screen-reader announcements (fix #9) */}
      <div
        className={styles.srOnly}
        aria-live="polite"
        aria-atomic="true"
        role="status"
      >
        {srAnnouncement}
      </div>
    </div>
  );
}
