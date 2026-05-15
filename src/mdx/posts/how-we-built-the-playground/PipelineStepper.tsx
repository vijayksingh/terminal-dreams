"use client";

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { SPRING, STAGGER, TRANSITION } from "@/lib/motion";
import type { ThemedToken, BundledLanguage, BundledTheme } from "shiki";
import styles from "./pipeline-stepper.module.css";

// ── Shiki helpers ─────────────────────────────────────────

function useIsDark(): boolean {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const check = () => {
      const attr = document.documentElement.getAttribute("data-theme");
      setDark(
        attr
          ? attr === "dark"
          : window.matchMedia("(prefers-color-scheme: dark)").matches,
      );
    };
    check();
    const observer = new MutationObserver(() => check());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  return dark;
}

function renderTokenLine(tokens: ThemedToken[]): ReactNode[] {
  return tokens.map((t, i) => (
    <span key={i} style={{ color: t.color }}>
      {t.content}
    </span>
  ));
}

function useShikiTokens(
  code: string,
  language: string,
  theme: BundledTheme,
): ThemedToken[][] | null {
  const [tokens, setTokens] = useState<ThemedToken[][] | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("shiki")
      .then(({ codeToTokens }) =>
        codeToTokens(code, { lang: language as BundledLanguage, theme }),
      )
      .then((result) => {
        if (!cancelled) setTokens(result.tokens);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [code, language, theme]);

  return tokens;
}

// ── Data model ────────────────────────────────────────────

type ThreadColor = "blue" | "amber" | "teal";
type ThreadHL = { line: number; color: ThreadColor };

type CodeSnippet = {
  code: string;
  language: string;
};

type StageDef = {
  label: string;
  shortLabel: string;
};

type StepDef = {
  stageIndex: number;
  narration: string;
  transformLabel?: string;
  input?: CodeSnippet;
  inputThreads?: ThreadHL[];
  output: CodeSnippet;
  outputThreads?: ThreadHL[];
};

// ── Thread color map ──────────────────────────────────────

const THREAD_CSS: Record<ThreadColor, string> = {
  blue: styles.threadBlue,
  amber: styles.threadAmber,
  teal: styles.threadTeal,
};

// ── Pipeline stages ───────────────────────────────────────

const STAGES: StageDef[] = [
  { label: "Source TSX", shortLabel: ".tsx" },
  { label: "Babel", shortLabel: "babel" },
  { label: "es-module-lexer", shortLabel: "lexer" },
  { label: "magic-string", shortLabel: "magic" },
  { label: "Blob URLs", shortLabel: "blob" },
  { label: "Import map", shortLabel: "imap" },
  { label: "iframe render", shortLabel: "frame" },
];

// ── Step definitions (input → output with threads) ────────

const STEPS: StepDef[] = [
  // 0 — Source TSX (pipeline start: output only)
  {
    stageIndex: 0,
    narration:
      "The user types TSX in the editor. The browser cannot execute this — TypeScript annotations are not JavaScript, JSX is not JavaScript, and bare import specifiers are not URLs.",
    output: {
      code: `import { useState } from "react";
import { App } from "./App";

type Props = { step?: number };

export function Counter({ step = 1 }: Props) {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + step)}>{count}</button>;
}`,
      language: "tsx",
    },
    outputThreads: [
      { line: 0, color: "blue" },
      { line: 1, color: "amber" },
    ],
  },

  // 1 — Babel: TSX body → JS body
  {
    stageIndex: 1,
    narration:
      'Babel strips TypeScript and transforms JSX to function calls. <button>{count}</button> becomes _jsx("button", { ... }). The code is valid JavaScript now — but the import specifiers are still bare.',
    transformLabel: "babel.transform()",
    input: {
      code: `type Props = { step?: number };

export function Counter({ step = 1 }: Props) {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + step)}>
    {count}
  </button>;
}`,
      language: "tsx",
    },
    output: {
      code: `export function Counter({ step = 1 }) {
  const [count, setCount] = useState(0);
  return _jsx("button", {
    onClick: () => setCount(c => c + step),
    children: count
  });
}`,
      language: "javascript",
    },
  },

  // 2 — Lexer: transpiled JS → specifier records
  {
    stageIndex: 2,
    narration:
      "es-module-lexer scans the transpiled code and returns the byte position of every import specifier. No AST, no parsing overhead — just character offsets for surgical replacement.",
    transformLabel: "parse(code)",
    input: {
      code: `import { useState } from "react";
import { App } from "./App";
import { jsx as _jsx } from "react/jsx-runtime";

export function Counter({ step = 1 }) { … }`,
      language: "javascript",
    },
    inputThreads: [
      { line: 0, color: "blue" },
      { line: 1, color: "amber" },
      { line: 2, color: "teal" },
    ],
    output: {
      code: `[
  { n: "react",             s: 27,  e: 34  },
  { n: "./App",             s: 55,  e: 60  },
  { n: "react/jsx-runtime", s: 86,  e: 103 },
]
// n = specifier name
// s = start byte offset, e = end byte offset`,
      language: "typescript",
    },
    outputThreads: [
      { line: 1, color: "blue" },
      { line: 2, color: "amber" },
      { line: 3, color: "teal" },
    ],
  },

  // 3 — magic-string: bare specifiers → URLs
  {
    stageIndex: 3,
    narration:
      "magic-string rewrites each specifier at the exact byte offsets from the lexer. Bare packages map to CDN URLs. Relative paths map to the virtual namespace. The rest of the source is untouched.",
    transformLabel: "ms.overwrite(s, e, url)",
    input: {
      code: `import { useState } from "react";
import { App } from "./App";
import { jsx as _jsx }
  from "react/jsx-runtime";`,
      language: "javascript",
    },
    inputThreads: [
      { line: 0, color: "blue" },
      { line: 1, color: "amber" },
      { line: 3, color: "teal" },
    ],
    output: {
      code: `import { useState } from "https://esm.sh/react@19?bundle";
import { App } from "td-playground/src/App.tsx";
import { jsx as _jsx }
  from "https://esm.sh/react@19/jsx-runtime?bundle";`,
      language: "javascript",
    },
    outputThreads: [
      { line: 0, color: "blue" },
      { line: 1, color: "amber" },
      { line: 3, color: "teal" },
    ],
  },

  // 4 — Blob URLs: rewritten files → blob: URLs
  {
    stageIndex: 4,
    narration:
      "Each rewritten file becomes a Blob, then a blob: URL via URL.createObjectURL. The browser treats these as real ES modules — importable, cacheable, revoked on rebuild to prevent memory leaks.",
    transformLabel: "URL.createObjectURL(blob)",
    input: {
      code: `// main.tsx — 2.1 KB rewritten JS
import { useState } from "https://esm.sh/react@19?bundle";
…

// App.tsx — 840 B rewritten JS
import { jsx } from "https://esm.sh/react@19/jsx-runtime?bundle";
…`,
      language: "javascript",
    },
    inputThreads: [
      { line: 1, color: "blue" },
      { line: 5, color: "teal" },
    ],
    output: {
      code: `// Two blob: URLs — one per workspace file
main.tsx  → blob:null/a8f3-b2c1-4d5e-9f7a
App.tsx   → blob:null/7d2e-4f91-c3b8-2a6d`,
      language: "text",
    },
    outputThreads: [
      { line: 1, color: "blue" },
      { line: 2, color: "amber" },
    ],
  },

  // 5 — Import map: all mappings assembled
  {
    stageIndex: 5,
    narration:
      'The import map assembles every specifier-to-URL mapping into a single JSON object. When the browser encounters import "react", the map resolves it to the CDN URL. Virtual paths resolve to blob URLs.',
    transformLabel: "JSON.stringify(map)",
    input: {
      code: `"react"             → "https://esm.sh/react@19?bundle"
"react/jsx-runtime" → "https://esm.sh/…/jsx-runtime?bundle"
"react-dom/client"  → "https://esm.sh/…/client?bundle"
"td-playground/…/main.tsx" → "blob:null/a8f3-…"
"td-playground/…/App.tsx"  → "blob:null/7d2e-…"`,
      language: "text",
    },
    inputThreads: [
      { line: 0, color: "blue" },
      { line: 1, color: "teal" },
      { line: 3, color: "blue" },
      { line: 4, color: "amber" },
    ],
    output: {
      code: `{
  "imports": {
    "react":              "https://esm.sh/react@19?bundle",
    "react/jsx-runtime":  "https://esm.sh/…/jsx-runtime?bundle",
    "react-dom/client":   "https://esm.sh/…/client?bundle",
    "td-playground/src/main.tsx": "blob:null/a8f3-…",
    "td-playground/src/App.tsx":  "blob:null/7d2e-…"
  }
}`,
      language: "json",
    },
    outputThreads: [
      { line: 2, color: "blue" },
      { line: 3, color: "teal" },
      { line: 5, color: "blue" },
      { line: 6, color: "amber" },
    ],
  },

  // 6 — iframe: import map + entry → srcdoc
  {
    stageIndex: 6,
    narration:
      "An <iframe srcdoc> loads the full HTML document: import map first, then a module script that imports the entry file. The component renders in complete isolation — null origin, separate DOM, zero access to the host page.",
    transformLabel: "<iframe srcdoc>",
    input: {
      code: `{
  "imports": {
    "react": "https://esm.sh/react@19?bundle",
    "react/jsx-runtime": "https://esm.sh/…?bundle",
    …
  }
}`,
      language: "json",
    },
    inputThreads: [
      { line: 2, color: "blue" },
      { line: 3, color: "teal" },
    ],
    output: {
      code: `<!doctype html>
<html><head>
  <script type="importmap">
    { "imports": { "react": "…", … } }
  </script>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    import("td-playground/src/main.tsx");
  </script>
</body></html>`,
      language: "html",
    },
    outputThreads: [
      { line: 3, color: "blue" },
      { line: 9, color: "blue" },
    ],
  },
];

// ── Sub-components ────────────────────────────────────────

function CodePanel({
  snippet,
  theme,
  threads,
  label,
}: {
  snippet: CodeSnippet;
  theme: BundledTheme;
  threads?: ThreadHL[];
  label?: string;
}) {
  const tokens = useShikiTokens(snippet.code, snippet.language, theme);
  const lines = useMemo(() => snippet.code.split("\n"), [snippet.code]);

  const threadMap = useMemo(() => {
    if (!threads) return null;
    const map = new Map<number, ThreadColor>();
    for (const t of threads) map.set(t.line, t.color);
    return map;
  }, [threads]);

  return (
    <div className={styles.codePanel}>
      {label && <div className={styles.codePanelLabel}>{label}</div>}
      {lines.map((line, i) => {
        const threadColor = threadMap?.get(i);
        const threadClass = threadColor ? THREAD_CSS[threadColor] : "";

        return (
          <div
            key={i}
            className={`${styles.codeLine} ${threadClass}`}
          >
            <span className={styles.lineNum}>{i + 1}</span>
            <span className={styles.lineText}>
              {tokens ? renderTokenLine(tokens[i] ?? []) : line || " "}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TransformView({
  step,
  theme,
  reducedMotion,
}: {
  step: StepDef;
  theme: BundledTheme;
  reducedMotion: boolean;
}) {
  const [inputExpanded, setInputExpanded] = useState(false);
  const hasInput = !!step.input;

  return (
    <div className={styles.transformView}>
      {/* Input panel — collapsible */}
      {hasInput && (
        <div className={styles.transformInput}>
          <button
            className={`${styles.inputToggle} ${inputExpanded ? styles.inputToggleOpen : ""}`}
            onClick={() => setInputExpanded((v) => !v)}
            aria-expanded={inputExpanded}
          >
            <span className={styles.inputToggleChevron}>›</span>
            <span className={styles.inputToggleLabel}>input</span>
            <span className={styles.inputToggleHint}>from previous step</span>
          </button>

          {reducedMotion ? (
            inputExpanded ? (
              <CodePanel
                snippet={step.input!}
                theme={theme}
                threads={step.inputThreads}
              />
            ) : null
          ) : (
            <AnimatePresence initial={false}>
              {inputExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={TRANSITION.collapse}
                  style={{ overflow: "hidden" }}
                >
                  <CodePanel
                    snippet={step.input!}
                    theme={theme}
                    threads={step.inputThreads}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      )}

      {/* Transform label */}
      {step.transformLabel && (
        <div className={styles.transformLabelBar}>
          <span className={styles.transformArrowDown}>↓</span>
          <code className={styles.transformFn}>{step.transformLabel}</code>
        </div>
      )}

      {/* Output panel — always visible */}
      <CodePanel
        snippet={step.output}
        theme={theme}
        threads={step.outputThreads}
        label="output"
      />
    </div>
  );
}

// ── Stage cell ────────────────────────────────────────────

type CellState = "pending" | "active" | "done";

function StageCell({
  index,
  stage,
  state,
  onClick,
  reducedMotion,
}: {
  index: number;
  stage: StageDef;
  state: CellState;
  onClick: () => void;
  reducedMotion: boolean;
}) {
  const stateClass =
    state === "active"
      ? styles.cellActive
      : state === "done"
        ? styles.cellDone
        : styles.cellPending;

  const cellContent = (
    <div
      className={`${styles.cell} ${stateClass}`}
      role="tab"
      aria-selected={state === "active"}
      aria-label={`Stage ${index + 1}: ${stage.label}`}
      tabIndex={state === "active" ? 0 : -1}
      onClick={onClick}
    >
      <span className={styles.cellBadge}>
        {state === "done" ? (
          <>
            <span className={styles.badgeCheck}>✓</span>
            <span className={styles.threadDots}>
              <span className={`${styles.threadDot} ${styles.threadDotBlue}`} />
              <span className={`${styles.threadDot} ${styles.threadDotAmber}`} />
              <span className={`${styles.threadDot} ${styles.threadDotTeal}`} />
            </span>
          </>
        ) : (
          index + 1
        )}
      </span>
      <span className={styles.cellLabel}>{stage.shortLabel}</span>
    </div>
  );

  if (reducedMotion) return cellContent;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        ...SPRING.snappy,
        delay: index * STAGGER.fast,
      }}
    >
      {cellContent}
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────

export function PipelineStepper() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const isDark = useIsDark();
  const theme: BundledTheme = isDark ? "tokyo-night" : "github-light";
  const stripRef = useRef<HTMLDivElement>(null);

  const total = STEPS.length;
  const step = STEPS[currentStep];
  const progress = currentStep / (total - 1);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(total - 1, index));
      setCurrentStep(clamped);
      setIsPlaying(false);
    },
    [total],
  );

  const prev = useCallback(
    () => setCurrentStep((s) => Math.max(0, s - 1)),
    [],
  );
  const next = useCallback(
    () => setCurrentStep((s) => Math.min(total - 1, s + 1)),
    [total],
  );

  useEffect(() => {
    if (!isPlaying) return;
    if (currentStep >= total - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => setCurrentStep((s) => s + 1), 2200);
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, total]);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const activeCell = strip.querySelector<HTMLElement>(
      '[aria-selected="true"]',
    );
    if (activeCell) {
      activeCell.scrollIntoView({
        behavior: reducedMotion ? "instant" : "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [currentStep, step.stageIndex, reducedMotion]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        prev();
        e.preventDefault();
      } else if (e.key === "ArrowRight") {
        next();
        e.preventDefault();
      } else if (e.key === " ") {
        setIsPlaying((p) => !p);
        e.preventDefault();
      } else if (e.key === "Home") {
        goTo(0);
        e.preventDefault();
      } else if (e.key === "End") {
        goTo(total - 1);
        e.preventDefault();
      }
    },
    [prev, next, goTo, total],
  );

  return (
    <div
      className={styles.wrapper}
      tabIndex={0}
      role="region"
      aria-label="Pipeline step-through visualization"
      onKeyDown={handleKeyDown}
    >
      {/* Chrome header */}
      <div className={styles.chromeBar}>
        <div className={styles.chromeDots}>
          <span className={`${styles.chromeDot} ${styles.chromeDotRed}`} />
          <span className={`${styles.chromeDot} ${styles.chromeDotYellow}`} />
          <span className={`${styles.chromeDot} ${styles.chromeDotGreen}`} />
        </div>
        <span className={styles.chromeTitle}>playground / pipeline</span>
        <span className={styles.chromeSpacer} />
        <span className={styles.chromeStep} aria-live="polite">
          step {currentStep + 1} of {total}
        </span>
        <div className={styles.chromeControls}>
          <button
            className={styles.chromeBtn}
            onClick={prev}
            disabled={currentStep === 0}
            aria-label="Previous step"
          >
            ◀
          </button>
          <button
            className={styles.chromeBtn}
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "⏸" : "▸"}
          </button>
          <button
            className={styles.chromeBtn}
            onClick={next}
            disabled={currentStep === total - 1}
            aria-label="Next step"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Stage strip with progress rail */}
      <div className={styles.stripContainer}>
        <div
          className={styles.progressRail}
          style={{ "--progress": progress } as React.CSSProperties}
        />
        <div
          className={styles.strip}
          ref={stripRef}
          role="tablist"
          aria-label="Pipeline stages"
        >
          {STAGES.map((stage, i) => {
            const state: CellState =
              i < step.stageIndex
                ? "done"
                : i === step.stageIndex
                  ? "active"
                  : "pending";

            return (
              <StageCell
                key={i}
                index={i}
                stage={stage}
                state={state}
                onClick={() => goTo(i)}
                reducedMotion={reducedMotion}
              />
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      <div
        className={styles.detail}
        role="tabpanel"
        id="pipeline-detail"
        aria-label={`Detail: ${STAGES[step.stageIndex].label}`}
      >
        <div className={styles.detailHeader}>
          <span className={styles.detailBadge}>{step.stageIndex + 1}</span>
          <span className={styles.detailName}>
            {STAGES[step.stageIndex].label}
          </span>
        </div>

        <AnimatePresence mode="wait">
          {reducedMotion ? (
            <div key={currentStep}>
              <TransformView
                step={step}
                theme={theme}
                reducedMotion={reducedMotion}
              />
            </div>
          ) : (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={SPRING.snappy}
            >
              <TransformView
                step={step}
                theme={theme}
                reducedMotion={reducedMotion}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Narration */}
      <div className={styles.narration}>
        <div className={styles.narrationAccent} />
        <AnimatePresence mode="wait">
          {reducedMotion ? (
            <span key={currentStep} className={styles.narrationText}>
              <span className={styles.narrationStep}>
                Step {currentStep + 1}.
              </span>{" "}
              {step.narration}
            </span>
          ) : (
            <motion.span
              key={currentStep}
              className={styles.narrationText}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={TRANSITION.crossfade}
            >
              <span className={styles.narrationStep}>
                Step {currentStep + 1}.
              </span>{" "}
              {step.narration}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default PipelineStepper;
