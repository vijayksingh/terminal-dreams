type Annotation = {
  match: string;
  label: string;
  explanation: string;
};

type AnnotatedBlock = {
  code: string;
  language: string;
  annotations: Annotation[];
};

export const ANNOTATED_BLOCKS: Record<string, AnnotatedBlock> = {

  // ═══════════════════════════════════════════════════════════════
  // Phase 1 — The Highlight Bar
  // ═══════════════════════════════════════════════════════════════

  "p1-render-lines": {
    code: `const lines = code.split("\\n");

return (
  <div className="relative rounded-lg overflow-hidden bg-surface">
    <div style={{ padding: "8px 0" }}>
      {lines.map((line, i) => (
        <div key={i} style={{ height: 22 }} className="flex items-center">
          <span className="w-6 text-right pr-1.5 text-[9px] font-mono text-muted">
            {i + 1}
          </span>
          <pre className="flex-1 whitespace-pre font-mono text-xs">
            {line}
          </pre>
        </div>
      ))}
    </div>
  </div>
);`,
    language: "tsx",
    annotations: [
      { match: "code.split", label: "1", explanation: "\"function bfs(graph, start) {\\n  const visited = ...\" becomes [\"function bfs(graph, start) {\", \"  const visited = ...\", ...]. Each array element is now one addressable line." },
      { match: "className=\"relative", label: "2", explanation: "\"relative\" matters. The highlight bar in Step 4 is position:absolute inside this container. Without it, the bar positions itself relative to the page." },
      { match: "padding: \"8px 0\"", label: "3", explanation: "This is PAD_Y = 8. Breathing room above and below the code. It also becomes part of the bar's positioning math in Step 4." },
      { match: "height: 22", label: "4", explanation: "LINE_H = 22. Every line is exactly 22px tall. Fixed height means we can compute ANY line's position with simple math: line 5 starts at 5 × 22 = 110px. No DOM measurement needed." },
      { match: "w-6 text-right", label: "5", explanation: "The line number gutter. \"w-6\" = fixed width so numbers align. \"text-right\" right-aligns single and double digits. \"pr-1.5\" = small gap between number and code." },
      { match: "whitespace-pre", label: "6", explanation: "\"whitespace-pre\" preserves indentation — without it, \"  const visited\" collapses to \"const visited\". \"flex-1\" makes code fill remaining width after the gutter." },
    ],
  },

  "p1-singleton": {
    code: `let highlighterPromise: Promise<HighlighterCore> | null = null;

function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const { createHighlighterCore } = await import("shiki/core");

      const { createJavaScriptRegexEngine } = await import(
        "shiki/engine/javascript"
      );

      return createHighlighterCore({
        themes: [
          import("shiki/themes/tokyo-night"),
          import("shiki/themes/github-light"),
        ],
        langs: [import("shiki/langs/typescript")],
        engine: createJavaScriptRegexEngine(),
      });
    })();
  }
  return highlighterPromise;
}`,
    language: "typescript",
    annotations: [
      { match: "highlighterPromise: Promise", label: "1", explanation: "Module-level variable. Starts as null. Once set, it persists for the entire page lifetime. Every component that imports this module shares this same variable." },
      { match: "if (!highlighterPromise)", label: "2", explanation: "First call: null, so we enter this block and start loading. Second call: already set, skip straight to return. This is the singleton guard." },
      { match: "await import(\"shiki/core\")", label: "3", explanation: "Dynamic import — Shiki's code isn't in the initial bundle. It loads only when someone actually needs syntax highlighting." },
      { match: "shiki/engine/javascript", label: "4", explanation: "JS regex engine, not WASM. WASM is faster for huge files, but requires async init that complicates SSR. JS engine is simpler and plenty fast for ~15 line snippets." },
      { match: "})();", label: "5", explanation: "The () immediately invokes the async function. highlighterPromise is now a Promise, not null. The next caller gets the same in-flight promise." },
      { match: "return highlighterPromise", label: "6", explanation: "Every caller gets the same promise. Whether it's still loading or already resolved, they all .then() on the same instance. One highlighter, shared everywhere." },
    ],
  },

  "p1-progressive": {
    code: `{tokens
  ? tokens[i].map((token, j) => (
      <span key={j} style={{ color: token.color }}>{token.content}</span>
    ))
  : <span style={{ color: "var(--color-text)" }}>{line}</span>
}`,
    language: "tsx",
    annotations: [
      { match: "? tokens[i].map", label: "1", explanation: "After the highlighter loads: tokens has colors, so we render colored spans. Each span gets its color from Shiki's analysis." },
      { match: ": <span", label: "2", explanation: "Before loading: tokens is null, so we show raw text in plain white. No spinner, no skeleton. The switch is invisible — text stays in place, only colors change. This is progressive enhancement." },
    ],
  },

  "p1-active-line": {
    code: `const isActive = activeLine === i;
const isDimmed = activeLine !== null && !isActive;

<div style={{
  height: LINE_H,
  opacity: isDimmed ? 0.55 : 1,
  transition: "opacity 300ms ease",
}}>`,
    language: "tsx",
    annotations: [
      { match: "activeLine === i", label: "1", explanation: "Is this the line the user clicked? Simple equality check — no data structures, no lookups." },
      { match: "activeLine !== null && !isActive", label: "2", explanation: "Should this line fade? Only if SOME line is active AND it's not THIS line. When activeLine is null, nothing is dimmed — all lines at full opacity." },
      { match: "isDimmed ? 0.55 : 1", label: "3", explanation: "Dimmed lines drop to 55% opacity. Still readable, just visually de-emphasized. The active line stays at 100%." },
      { match: "opacity 300ms ease", label: "4", explanation: "The fade is animated. Click a new line → old line fades 100%→55%, new line fades 55%→100%. Smooth, not an instant switch." },
    ],
  },

  "p1-prefix-sum": {
    code: `const lineTops: number[] = [];
let totalLineHeight = 0;

lineHeights.forEach((height) => {
  lineTops.push(totalLineHeight);
  totalLineHeight += height;
});`,
    language: "typescript",
    annotations: [
      { match: "totalLineHeight = 0", label: "1", explanation: "Running sum. Starts at 0 (first line starts at the top of the container)." },
      { match: "lineTops.push(totalLineHeight)", label: "2", explanation: "Line i starts at the current running sum. Line 0 → 0px, Line 1 → 22px, Line 2 → 44px, etc." },
      { match: "totalLineHeight += height", label: "3", explanation: "Advance by this line's height. Right now all 22px, so trivially i × 22. But in Phase 2, interactive lines grow to 44px — this prefix sum handles mixed heights correctly." },
    ],
  },

  "p1-highlight-bar": {
    code: `<motion.div
  className="absolute left-0 right-0 pointer-events-none"
  style={{
    borderLeft: \`2px solid \${trackHex}\`,
    backgroundColor: getHighlightBackground(trackHex),
    top: PAD_Y,
    height: LINE_H,
  }}
  initial={{ y: barTop, opacity: 0 }}
  animate={{ y: barTop, opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={SPRING.snappy}
/>`,
    language: "tsx",
    annotations: [
      { match: "pointer-events-none", label: "1", explanation: "Clicks pass through the bar to the code lines behind it. Without this, clicking a line would click the bar instead (it's layered on top)." },
      { match: "borderLeft:", label: "2", explanation: "The purple accent line on the left edge — the most visible part of the bar. trackHex is \"#7c3aed\" by default." },
      { match: "getHighlightBackground", label: "3", explanation: "A very subtle 7% opacity tint of the track color. Just enough to show the bar area without obscuring code." },
      { match: "top: PAD_Y", label: "4", explanation: "FIXED at 8px (the container's padding). This is the anchor point. The bar's ACTUAL position comes from the y transform below, not from top." },
      { match: "y: barTop, opacity: 0", label: "5", explanation: "First appearance: starts at barTop position but invisible. Fades in with the spring animation." },
      { match: "animate:", label: "6", explanation: "Framer Motion animates TO these values. y is translateY. When activeLine changes → barTop changes → spring moves the bar." },
      { match: "SPRING.snappy", label: "7", explanation: "Spring physics, not a CSS ease curve. More momentum = more overshoot. Moving 10 lines feels different from moving 1." },
    ],
  },

  "p1-highlight-bg": {
    code: `function getHighlightBackground(trackHex: string) {
  return trackHex.startsWith("#")
    ? \`\${trackHex}12\`
    : \`color-mix(in srgb, \${trackHex} 12%, transparent)\`;
}`,
    language: "typescript",
    annotations: [
      { match: "trackHex}12", label: "1", explanation: "Appends \"12\" to the hex. \"#7c3aed\" → \"#7c3aed12\". In 8-digit hex, last two chars are alpha. \"12\" hex ≈ 7% opacity — a barely-visible tint." },
      { match: "color-mix", label: "2", explanation: "Fallback for CSS variables like \"var(--track-color)\" which aren't hex strings. color-mix does the same thing — 12% track color + 88% transparent." },
    ],
  },

  "p1-track-color": {
    code: `<span
  className="w-6 text-right pr-1.5 text-[9px] font-mono"
  style={{
    color: isActive && trackHex ? trackHex : "var(--color-muted)",
    transition: "color 300ms ease",
  }}
>
  {i + 1}
</span>`,
    language: "tsx",
    annotations: [
      { match: "isActive && trackHex", label: "1", explanation: "When this line is active AND we have a track color, the number turns purple (or blue, or green). Otherwise stays gray. Same trackHex drives the bar's border, background, and annotation color." },
      { match: "color 300ms ease", label: "2", explanation: "Smooth color transition when the active line changes — the number color gently shifts rather than snapping." },
    ],
  },

  "p1-annotation-slot": {
    code: `<AnimatePresence>
  {isActive && children != null && (
    <motion.div
      className="overflow-hidden pl-8"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={SPRING.snappy}
    >
      <div className="py-1.5">{children}</div>
    </motion.div>
  )}
</AnimatePresence>`,
    language: "tsx",
    annotations: [
      { match: "isActive && children != null", label: "1", explanation: "Two conditions: this must be the active line AND the consumer must have passed children. When activeLine changes, the old annotation exits and the new one enters." },
      { match: "overflow-hidden", label: "2", explanation: "Critical for the height animation. At height: 0, content is hidden. As height grows, content reveals. Without overflow-hidden, content would be visible even at height: 0." },
      { match: "height: \"auto\"", label: "3", explanation: "Special in Framer Motion. The library measures content's natural height, then animates from 0 to that value. Pure CSS can't animate to \"auto\" — Framer handles this automatically." },
      { match: "exit:", label: "4", explanation: "When the user clicks a different line, collapse back to 0. AnimatePresence detects unmounting and plays this exit animation before removing the DOM node." },
      { match: "{children}", label: "5", explanation: "Whatever the consumer passed — text, a quiz, a state display. CodeTrace doesn't know or care what's inside. It provides positioning, animation, and lifecycle." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // Phase 2 — Making Code Clickable
  // ═══════════════════════════════════════════════════════════════

  "p2-line-action-interface": {
    code: `getLineAction?: (
  lineIndex: number,
  line: string,
) => CodeTraceLineAction | null;

interface CodeTraceLineAction {
  ariaLabel: string;

  onClick: (lineIndex: number) => void;

  disabled?: boolean;
}`,
    language: "tsx",
    annotations: [
      { match: "getLineAction?:", label: "1", explanation: "Called for EVERY line. The function inspects the line index or text content and returns either an action object (interactive) or null (plain text)." },
      { match: "CodeTraceLineAction | null", label: "2", explanation: "Returning null means 'this line is not interactive.' The component ignores clicks on it entirely." },
      { match: "ariaLabel: string", label: "3", explanation: "What a screen reader announces. e.g. 'Explore line 6: Iteration.' Without this, the reader would try to read all the code tokens." },
      { match: "onClick:", label: "4", explanation: "What happens when the line is clicked or activated via keyboard." },
      { match: "disabled?:", label: "5", explanation: "A disabled line is still announced ('Sort phase, button, disabled') but cannot be activated. Tells the user 'this exists but you cannot use it right now.'" },
    ],
  },

  "p2-line-action-usage": {
    code: `<CodeTrace
  code={CODE}
  trackHex="#7c3aed"
  getLineAction={(i, line) =>
    SECTIONS.has(i)
      ? { ariaLabel: \`Explore line \${i + 1}\`, onClick: handleClick }
      : null
  }
/>`,
    language: "tsx",
    annotations: [
      { match: "getLineAction=", label: "1", explanation: "One callback replaces four separate props. It receives the line index and text, returns an action or null." },
      { match: "SECTIONS.has(i)", label: "2", explanation: "If this line index is in the SECTIONS set, return an action object. Otherwise return null and the component ignores the click." },
      { match: "ariaLabel:", label: "3", explanation: "Template literal builds a screen-reader label per line. Each interactive line gets a unique announcement." },
    ],
  },

  "p2-aria-roles": {
    code: `<div
  role={isInteractive ? "button" : undefined}
  aria-label={action?.ariaLabel}
  aria-disabled={isInteractive ? action.disabled : undefined}
  tabIndex={isInteractive && !action.disabled ? 0 : undefined}
  onKeyDown={isInteractive ? handleKeyDown : undefined}
>`,
    language: "tsx",
    annotations: [
      { match: "role={isInteractive", label: "1", explanation: "Tells screen readers 'this div behaves like a button.' Non-interactive lines have no role -- they are just text." },
      { match: "aria-label=", label: "2", explanation: "The accessible name. Without this, the screen reader reads ALL content inside the div -- line number, code, AND badge. With it, the reader hears a clean label." },
      { match: "aria-disabled=", label: "3", explanation: "A disabled line is still announced ('Sort phase, button, disabled') but cannot be activated." },
      { match: "tabIndex=", label: "4", explanation: "tabIndex={0} puts the element in the natural tab order. Disabled lines get NO tabIndex -- focus skips them. This is why Tab jumps from line 2 to line 6." },
      { match: "onKeyDown=", label: "5", explanation: "Keyboard handler only attached to interactive lines. Non-interactive lines ignore key events entirely." },
    ],
  },

  "p2-key-handler": {
    code: `function handleLineKeyDown(
  event: KeyboardEvent,
  lineIndex: number,
  action: CodeTraceLineAction,
) {
  if (action.disabled) return;

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action.onClick(lineIndex);
  }
}`,
    language: "ts",
    annotations: [
      { match: "action.disabled", label: "1", explanation: "Safety check. Disabled lines should not receive focus (no tabIndex), but defensive coding never hurts." },
      { match: "Enter", label: "2", explanation: "Both Enter and Space activate the line, matching native button behavior." },
      { match: "preventDefault", label: "3", explanation: "CRITICAL. Without this, pressing Space activates the line AND scrolls the page down. The browser default for Space is 'scroll one viewport.' preventDefault() makes Space ONLY activate the line." },
      { match: "action.onClick", label: "4", explanation: "Same handler as mouse clicks. Keyboard and mouse converge to the same action." },
    ],
  },

  "p2-line-rule-interface": {
    code: `interface CodeTraceLineRule {
  test: string | ((line: string) => boolean);

  style?: CSSProperties;

  tokenColor?: string;
}`,
    language: "ts",
    annotations: [
      { match: "test:", label: "1", explanation: "How to match. A string does line.includes(test). A function gives full control: check if the line starts with '//', ends with 'TODO', contains an error, etc." },
      { match: "style?:", label: "2", explanation: "CSS styles applied to the line's container div. Background colors, borders, opacity -- anything CSS can do." },
      { match: "tokenColor?:", label: "3", explanation: "Override ALL syntax token colors on this line with one color. Normally each token gets its own Shiki color; tokenColor replaces all of them. Useful for error lines where 'make this whole line red' is clearer than mixed colors." },
    ],
  },

  "p2-line-rules": {
    code: `const rules: CodeTraceLineRule[] = [
  {
    test: (line) => line.trimStart().startsWith("//"),
    style: { background: "var(--color-surface-2)", borderRadius: "4px" },
  },
  {
    test: (line) => line.trim() === "",
    style: { opacity: 0.3 },
  },
];`,
    language: "ts",
    annotations: [
      { match: "trimStart().startsWith", label: "1", explanation: "Matches comment lines. trimStart() handles indented comments like '  // Sort by start time' -- without it, the check fails because the line starts with spaces, not '//'." },
      { match: "var(--color-surface-2)", label: "2", explanation: "Subtle background tint. Makes comment lines visually 'pop' as a group without being loud." },
      { match: "line.trim() ===", label: "3", explanation: "Matches empty lines or whitespace-only lines." },
      { match: "opacity: 0.3", label: "4", explanation: "Fades empty lines to near-invisible. They still exist (preserving line numbers and spacing) but visually recede." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // Phase 3 — Wrapping the Primitive
  // ═══════════════════════════════════════════════════════════════

  "p3-live-code-props": {
    code: `interface LiveCodePanelProps {
  code: string;
  lineMap: (number | null)[];
  step: number;
  trackHex: string;
  annotations?: (string | null)[];
}`,
    language: "tsx",
    annotations: [
      { match: "lineMap: (number | null)[]", label: "1", explanation: "An array where the INDEX is the step number and the VALUE is the line number to highlight. lineMap[0] = 0 means \"at step 0, highlight line 0\". lineMap[5] = null means \"at step 5, highlight nothing.\"" },
      { match: "step: number", label: "2", explanation: "The current step. Controlled by the parent — usually a lesson flow, animation timeline, or step slider." },
      { match: "annotations?: (string | null)[]", label: "3", explanation: "annotations[step] = text to show below the active line. null means \"no annotation at this step.\"" },
    ],
  },

  "p3-live-code-render": {
    code: `const activeLine = lineMap[Math.min(step, lineMap.length - 1)] ?? null;

const annotation = annotations?.[step] ?? null;

<CodeTrace
  code={code}
  activeLine={activeLine}
  trackHex={trackHex}
>
  {annotation && <span>└─ {annotation}</span>}
</CodeTrace>`,
    language: "tsx",
    annotations: [
      { match: "Math.min(step", label: "1", explanation: "Look up which line to highlight for the current step. Math.min clamps the step to the array bounds — if someone passes step=99 but lineMap only has 9 entries, we use the last one. ?? null handles undefined entries." },
      { match: "annotations?.[step]", label: "2", explanation: "Same pattern — look up the annotation for this step. ?. handles the case where annotations wasn't passed at all." },
      { match: "activeLine={activeLine}", label: "3", explanation: "CodeTrace receives the derived line number, not the step. It has no concept of steps — it only knows which line to highlight." },
      { match: "{annotation && <span>", label: "4", explanation: "If there's an annotation for this step, render it inside CodeTrace's annotation slot (the children pattern from Phase 1)." },
    ],
  },

  "p3-code-delay": {
    code: `const isVisible = step >= codeDelay;

<AnimatePresence>
  {isVisible && (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={SPRING.gentle}
    >
      <CodeTrace ... />
    </motion.div>
  )}
</AnimatePresence>`,
    language: "tsx",
    annotations: [
      { match: "step >= codeDelay", label: "1", explanation: "step starts at 0. If codeDelay is 2, the code panel is hidden for steps 0 and 1 (the visual explanation steps), and appears at step 2 (when the student is ready for code)." },
      { match: "<AnimatePresence>", label: "2", explanation: "AnimatePresence detects when children enter or exit the DOM. When isVisible flips, it plays entry or exit animations before mounting/unmounting." },
      { match: "initial={{ opacity: 0, x: 12 }}", label: "3", explanation: "Start invisible and 12px to the right of its final position." },
      { match: "animate={{ opacity: 1, x: 0 }}", label: "4", explanation: "Slide to its natural position and become visible." },
      { match: "exit={{ opacity: 0, x: 12 }}", label: "5", explanation: "When hiding, reverse the animation — slide right and fade out." },
    ],
  },

  "p3-gated-state": {
    code: `const viewedRef = useRef<Set<number>>(new Set());

const [viewedCount, setViewedCount] = useState(0);

const allViewed = viewedCount >= sections.length;`,
    language: "tsx",
    annotations: [
      { match: "useRef<Set<number>>", label: "1", explanation: "A ref (not state) that tracks WHICH sections have been visited. useRef because we don't want re-renders when adding to the set — clicking a section you already visited would trigger a wasted re-render." },
      { match: "useState(0)", label: "2", explanation: "A state number that tracks HOW MANY sections have been visited. This DOES trigger re-renders — because viewedCount drives the progress text (\"2/4 sections explored\") and the Complete button." },
      { match: "viewedCount >= sections.length", label: "3", explanation: "Derived from viewedCount. When true, the Complete button activates." },
    ],
  },

  "p3-gated-toggle": {
    code: `const handleToggle = (line: number) => {
  setBridgeLine(bridgeLine === line ? null : line);

  if (!viewedRef.current.has(line)) {
    viewedRef.current.add(line);
    setViewedCount(viewedRef.current.size);
  }
};`,
    language: "tsx",
    annotations: [
      { match: "bridgeLine === line ? null : line", label: "1", explanation: "Toggle the active section. Clicking an already-active section deactivates it (bridgeLine becomes null). Clicking a new section activates it." },
      { match: "!viewedRef.current.has(line)", label: "2", explanation: "Only enter this block on FIRST visit. Clicking the same section again doesn't enter — viewedRef already has it." },
      { match: "viewedRef.current.add(line)", label: "3", explanation: "Mark this section as viewed in the ref. No re-render." },
      { match: "setViewedCount(viewedRef.current.size)", label: "4", explanation: "Update the count from the ref's size. THIS triggers a re-render because the progress UI needs to update — but only on first visit." },
    ],
  },

  "p3-gated-render": {
    code: `<CodeTrace code={code} activeLine={bridgeLine} trackHex={trackHex}>
  {activeSection && <span>{activeSection.narration}</span>}
</CodeTrace>`,
    language: "tsx",
    annotations: [
      { match: "activeLine={bridgeLine}", label: "1", explanation: "GatedCodeBridge drives CodeTrace through its public API — activeLine is the only rendering prop it controls." },
      { match: "activeSection && <span>", label: "2", explanation: "The same children-as-slot pattern from Phase 1. The slot designed for static text now powers an interactive exploration UI. Same mechanism, different content." },
    ],
  },

  "p3-split-tokens": {
    code: `function splitTokensAroundPlaceholders(
  tokens: ThemedToken[],
  placeholderIds: string[],
): TokenOrBlank[] {
  const result: TokenOrBlank[] = [];

  for (const token of tokens) {
    const match = placeholderIds.find((id) =>
      token.content.includes(\`___\${id}___\`)
    );

    if (!match) {
      result.push(token);
      continue;
    }

    const marker = \`___\${match}___\`;
    const idx = token.content.indexOf(marker);
    const before = token.content.slice(0, idx);
    const after = token.content.slice(idx + marker.length);

    if (before) result.push({ ...token, content: before });
    result.push({ type: "blank", id: match });
    if (after) result.push({ ...token, content: after });
  }

  return result;
}`,
    language: "ts",
    annotations: [
      { match: "tokens: ThemedToken[]", label: "1", explanation: "The raw Shiki token stream from tokenizing the template code. Each token has a content string and a color." },
      { match: "TokenOrBlank[]", label: "2", explanation: "The output mixes Shiki tokens with blank markers. Downstream rendering maps tokens to colored spans and blanks to interactive dropdowns." },
      { match: "token.content.includes", label: "3", explanation: "Check if this token contains a placeholder marker. A single Shiki token might contain the placeholder if Shiki grouped surrounding characters with it." },
      { match: "token.content.indexOf(marker)", label: "4", explanation: "Find where inside the token string the placeholder starts. We need exact boundaries to split without losing the original token's color." },
      { match: "{ ...token, content: before }", label: "5", explanation: "The text before the placeholder keeps the original token's syntax color. Same for the text after. Only the middle becomes an interactive blank." },
      { match: "{ type: \"blank\", id: match }", label: "6", explanation: "Replace the placeholder substring with a blank marker. The renderer will turn this into a dropdown with answer options." },
    ],
  },

  "p3-codefill-context": {
    code: `const CodeFillCtx = createContext<CodeFillState | null>(null);

<CodeFillCtx.Provider value={state}>
  {lines.map((lineTokens, i) => (
    <div key={i} style={{ height: LINE_H }}>
      {lineTokens.map((tok) =>
        tok.type === "blank"
          ? <BlankSlot key={tok.id} id={tok.id} />
          : <span key={tok.content} style={{ color: tok.color }}>{tok.content}</span>
      )}
    </div>
  ))}
</CodeFillCtx.Provider>`,
    language: "tsx",
    annotations: [
      { match: "createContext<CodeFillState | null>", label: "1", explanation: "Shared state: which blanks have been filled, what options are selected, whether the form has been submitted." },
      { match: "<CodeFillCtx.Provider value={state}>", label: "2", explanation: "BlankSlot components anywhere in the tree can read this context. No prop drilling needed." },
      { match: "tok.type === \"blank\"", label: "3", explanation: "The split token stream from splitTokensAroundPlaceholders. Regular tokens render as colored spans; blank markers render as interactive dropdowns." },
      { match: "<BlankSlot key={tok.id}", label: "4", explanation: "Each BlankSlot reads the shared answer state from context, renders a dropdown when clicked, and writes back the selected option." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // Phase 4 — Breaking Free
  // ═══════════════════════════════════════════════════════════════

  "p4-line-kind": {
    code: `type LineKind =
  | { type: "signature" }

  | { type: "close" }

  | { type: "committed"; chunkIdx: number }

  | { type: "pending" }

  | { type: "active-label"; chunkIdx: number }`,
    language: "ts",
    annotations: [
      { match: "\"signature\"", label: "1", explanation: "The function declaration line. Always visible, never dimmed." },
      { match: "\"close\"", label: "2", explanation: "The closing brace. Same treatment as signature — always visible." },
      { match: "\"committed\"", label: "3", explanation: "A code line revealed when the student solved a chunk. chunkIdx tells us which chunk it belongs to — this matters for staggered animation, since each chunk's lines animate independently." },
      { match: "\"pending\"", label: "4", explanation: "A placeholder like \"// step 2 — pending\", dimmed to 25% opacity. When the student solves the step, this line is replaced by real committed code lines." },
      { match: "\"active-label\"", label: "5", explanation: "The currently-active step label (e.g. \"// 1 — count frequencies\"). Below this, a step panel renders with the chunk title and a \"Solve this step\" prompt." },
    ],
  },

  "p4-state-event": {
    code: `interface State {
  revealed: Set<number>;
  activeIdx: number | null;
  correct: number;
}

type Event =
  | { type: "resolve"; idx: number; total: number }
  | { type: "reset" };`,
    language: "ts",
    annotations: [
      { match: "revealed: Set<number>", label: "1", explanation: "Which chunks the student has solved. Set for O(1) has/add." },
      { match: "activeIdx: number | null", label: "2", explanation: "Which chunk is currently being solved. null when all are done." },
      { match: "correct: number", label: "3", explanation: "Count of correctly solved chunks. Used for completion reporting." },
      { match: "\"resolve\"", label: "4", explanation: "Student solved chunk idx. total is the chunk count — needed to compute whether there's a next chunk or we're done." },
      { match: "\"reset\"", label: "5", explanation: "Start over. One event clears everything." },
    ],
  },

  "p4-reducer": {
    code: `function reduce(state: State, event: Event): State {
  switch (event.type) {
    case "resolve": {
      if (state.revealed.has(event.idx)) return state;

      const next = new Set(state.revealed);
      next.add(event.idx);

      let nextActive: number | null = null;
      for (let j = 0; j < event.total; j++) {
        if (!next.has(j)) { nextActive = j; break; }
      }

      return {
        revealed: next,
        activeIdx: nextActive,
        correct: state.correct + 1,
      };
    }

    case "reset":
      return initialState();
  }
}`,
    language: "ts",
    annotations: [
      { match: "state.revealed.has(event.idx)) return state", label: "1", explanation: "Guard clause. If already revealed, return same reference so React skips re-render. Prevents double-resolves from rapid clicks." },
      { match: "const next = new Set(state.revealed)", label: "2", explanation: "Create a NEW set — never mutate state.revealed. React needs reference inequality to detect changes." },
      { match: "let nextActive: number | null = null", label: "3", explanation: "Find the first unrevealed chunk. Handles non-sequential reveals (relevant in Step 5 with the replaces mechanism). If all revealed, stays null." },
      { match: "revealed: next,", label: "4", explanation: "All three fields update ATOMICALLY. No intermediate state where revealed changed but activeIdx didn't." },
      { match: "return initialState()", label: "5", explanation: "One line resets everything. initialState() is the single source of truth for \"what does fresh look like.\" Add more fields later — only update one function." },
    ],
  },

  "p4-build-unified": {
    code: `function buildUnifiedCode(
  chunks: Chunk[],
  revealed: Set<number>,
  activeIdx: number | null,
): UnifiedLine[] {
  const lines: UnifiedLine[] = [];

  lines.push({
    text: FUNCTION_SIGNATURE,
    kind: { type: "signature" },
  });

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    if (chunk.replaces !== undefined) continue;

    const isRevealed = revealed.has(i);
    const isActive = i === activeIdx;

    if (isRevealed) {
      for (const codeLine of chunk.revealCode.split("\\n")) {
        lines.push({
          text: codeLine,
          kind: { type: "committed", chunkIdx: i },
        });
      }

    } else if (isActive) {
      lines.push({
        text: \`  // \${chunk.stepNumber} — \${chunk.title.toLowerCase()}\`,
        kind: { type: "active-label", chunkIdx: i },
      });

    } else {
      lines.push({
        text: \`  // step \${chunk.stepNumber} — pending\`,
        kind: { type: "pending" },
      });
    }
  }

  lines.push({
    text: FUNCTION_CLOSE,
    kind: { type: "close" },
  });
  return lines;
}`,
    language: "ts",
    annotations: [
      { match: "const lines: UnifiedLine[] = []", label: "1", explanation: "The output array. Will contain every line in the code body — signature, chunk slots, closing brace." },
      { match: "text: FUNCTION_SIGNATURE", label: "2", explanation: "Always starts with the function signature. This line is always visible, never dimmed." },
      { match: "chunk.replaces !== undefined) continue", label: "3", explanation: "Skip chunks with replaces — they don't get their own slot. They render at their TARGET's position when revealed. More in Step 5." },
      { match: "const isRevealed = revealed.has(i)", label: "4", explanation: "Two questions about each chunk: has the student solved it (revealed), and is it currently being solved (active)?" },
      { match: "chunk.revealCode.split", label: "5", explanation: "REVEALED: Split the chunk's code into individual lines. A 5-line chunk creates 5 UnifiedLine entries, each tagged \"committed\" with the chunk index for staggered animation." },
      { match: "active-label", label: "6", explanation: "ACTIVE: Show a comment-style label. Below this line, the renderer inserts a step panel with the chunk title and a \"Solve this step\" prompt." },
      { match: "type: \"pending\"", label: "7", explanation: "PENDING: Not revealed, not active. A dimmed placeholder at 25% opacity that says \"there's more code coming here.\"" },
      { match: "text: FUNCTION_CLOSE", label: "8", explanation: "Always ends with the closing brace. The code body is bookended by signature and close." },
    ],
  },

  "p4-choreo": {
    code: `const CHOREO = {
  codeStart: 0.08,
  codeStep: 0.04,
  noteDelay: 0.32,
  noteSlide: 12,
};`,
    language: "ts",
    annotations: [
      { match: "codeStart: 0.08", label: "1", explanation: "First committed line waits 80ms before animating. This gap lets the step panel reposition first (beats 1-2), so code doesn't appear before the panel moves out of the way." },
      { match: "codeStep: 0.04", label: "2", explanation: "40ms between each subsequent line. Line 0 at 80ms, line 1 at 120ms, line 2 at 160ms. With 5 lines, the last starts at 80 + 4*40 = 240ms." },
      { match: "noteDelay: 0.32", label: "3", explanation: "Reveal note waits 320ms — after ALL code lines have started. Code first (the what), then insight (the why). Prevents the reader's eye from being pulled in two directions." },
      { match: "noteSlide: 12", label: "4", explanation: "Reveal note slides in from 12px left. Horizontal motion for horizontal content (a sentence), vs vertical growth for vertical content (code lines)." },
    ],
  },

  "p4-motion-line": {
    code: `<motion.div
  initial={{ height: 0, opacity: 0 }}
  animate={{ height: LINE_H, opacity: 0.85 }}
  transition={{
    ...SPRING.snappy,
    delay: CHOREO.codeStart + lineIndex * CHOREO.codeStep,
  }}
/>`,
    language: "tsx",
    annotations: [
      { match: "height: 0, opacity: 0", label: "1", explanation: "Start collapsed and invisible. overflow: hidden on the parent means content is hidden at height 0, then revealed as height grows." },
      { match: "height: LINE_H, opacity: 0.85", label: "2", explanation: "Spring open to LINE_H (20px). 85% opacity for committed code — slightly softer than 100%, making structural lines (signature, close brace) stand out more." },
      { match: "CHOREO.codeStart + lineIndex * CHOREO.codeStep", label: "3", explanation: "The stagger formula. Line 0 delays 0.08s, line 1 delays 0.12s, line 2 delays 0.16s. Creates the \"typing\" cascade — lines appear to fall into place one after another." },
    ],
  },

  "p4-chunk-interface": {
    code: `interface Chunk {
  id: string;
  stepNumber: number;
  title: string;
  revealCode: string;
  revealNote: string;

  replaces?: number;
}`,
    language: "ts",
    annotations: [
      { match: "id: string", label: "1", explanation: "Unique identifier for the chunk, used as React key for stable animation." },
      { match: "revealCode: string", label: "2", explanation: "The actual code lines that appear when the student solves this chunk." },
      { match: "revealNote: string", label: "3", explanation: "The insight text (\"The move: ...\") shown after the code reveals." },
      { match: "replaces?: number", label: "4", explanation: "If set, this chunk targets another chunk by index. When revealed, it REPLACES the target's code at the target's position. The function doesn't grow — it improves." },
    ],
  },

  "p4-replacer-map": {
    code: `const replacerMap = new Map<number, number>();
for (let i = 0; i < chunks.length; i++) {
  if (chunks[i].replaces !== undefined) {
    replacerMap.set(chunks[i].replaces!, i);
  }
}

if (chunk.replaces !== undefined) continue;

const replacerIdx = replacerMap.get(i);
const replacerRevealed = replacerIdx !== undefined
  && revealed.has(replacerIdx);

if (replacerRevealed) {
  // Show the REPLACER's code at the ORIGINAL's position.
  // Step 3's code vanishes. Step 4's code appears in its place.
} else if (isRevealed) {
  // Show the original code (step 3's version).
  // If the replacer is active, also show its label below.
}`,
    language: "ts",
    annotations: [
      { match: "new Map<number, number>()", label: "1", explanation: "Builds a lookup: \"chunk 2 has a replacer at index 3.\" When rendering chunk 2's slot, we check this map." },
      { match: "chunk.replaces !== undefined) continue", label: "2", explanation: "The replacer chunk (step 4) is skipped — it doesn't get its own slot in the code body." },
      { match: "replacerMap.get(i)", label: "3", explanation: "Check if THIS slot's chunk has a replacer, and whether that replacer has been revealed." },
      { match: "replacerRevealed", label: "4", explanation: "If the replacer is revealed, show its code at the original's position. The function didn't grow — it refined." },
      { match: "} else if (isRevealed)", label: "5", explanation: "Otherwise show the original code. If the replacer is active, its label also appears below." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // From Bespoke to Semantic — Part 1
  // ═══════════════════════════════════════════════════════════════

  "bespoke-text-clip": {
    code: `// Article 1 — hand-crafted SVG, hardcoded widths
const NODE_W = 72;  // fits "Session", "Sandbox", "Cache"
const NODE_H = 24;

function renderNode(node: { label: string; x: number; y: number }) {
  return (
    <g>
      <clipPath id={\`clip-\${node.label}\`}>
        <rect x={node.x - NODE_W / 2} y={node.y - NODE_H / 2}
              width={NODE_W} height={NODE_H} />
      </clipPath>
      <rect x={node.x - NODE_W / 2} y={node.y - NODE_H / 2}
            width={NODE_W} height={NODE_H} rx={2}
            fill="var(--color-surface)" stroke="#888" />
      <text x={node.x} y={node.y + 3} textAnchor="middle"
            fontSize={9} clipPath={\`url(#clip-\${node.label})\`}>
        {node.label}
      </text>
    </g>
  );
}`,
    language: "tsx",
    annotations: [
      { match: "NODE_W = 72", label: "1", explanation: "72px fits \"Session\" (46px) and \"Sandbox\" (50px) comfortably. \"Configuration Manager\" measures 112px at fontSize 9. The width is never validated against the label — it's a visual guess." },
      { match: "clipPath id=", label: "2", explanation: "The clipPath is defensive. Without it, the overflowing text bleeds into neighboring nodes. With it, the text is silently amputated. Both are wrong — the box should resize to fit." },
      { match: "width={NODE_W}", label: "3", explanation: "Same constant for every node. The fix is to measure the text first: canvas.measureText() or a hidden SVG <text> element. But that requires async layout, which a quick one-off SVG skips." },
      { match: "fontSize={9}", label: "4", explanation: "Font size is hardcoded. It interacts with NODE_W — change the font size and the same label might fit or clip. These two values are coupled but managed independently." },
    ],
  },

  "bespoke-edge-overlap": {
    code: `// Article 2 — straight-line edges, no obstacle avoidance
function renderEdge(from: Node, to: Node) {
  return (
    <line
      x1={from.x}
      y1={from.y + from.h / 2}
      x2={to.x}
      y2={to.y - to.h / 2}
      stroke="oklch(50% 0.1 180)"
      strokeWidth={1.2}
    />
  );
}

// The edge from Client (40,22) to Notify (40,145)
// passes straight through Auth at (40,72).
// A human sees the overlap. The code does not.`,
    language: "tsx",
    annotations: [
      { match: "from.y + from.h / 2", label: "1", explanation: "Exit from bottom-center of the source node. This assumes the shortest path to the target is a straight line — true when nothing is in the way, wrong when a third node sits between them." },
      { match: "to.y - to.h / 2", label: "2", explanation: "Enter at top-center of the target. The edge ignores every other node in the diagram. It has no concept of obstacles." },
      { match: "Client (40,22) to Notify (40,145)", label: "3", explanation: "Both Client and Notify sit at x=40. Auth also sits at x=40, y=72 — directly on the vertical path. The straight line from Client to Notify runs through Auth's center. The code sees two endpoints; it has no concept of the node between them." },
    ],
  },

  "bespoke-interaction-gap": {
    code: `// Article 3 — nodes look clickable but aren't
<rect
  x={node.x - NODE_W / 2}
  y={node.y - NODE_H / 2}
  width={NODE_W} height={NODE_H}
  rx={12}
  cursor="pointer"        // ← promises interaction
  // No onClick handler    // ← doesn't deliver
  // No onKeyDown          // ← keyboard users ignored
  // No role="button"      // ← screen readers see a rect
  // No tabIndex            // ← can't focus with Tab
  // No aria-label          // ← no text alternative
/>

// What FlowDiagram does instead:
<FlowNodeHitArea
  node={node}
  onSelect={select}
  minTarget={44}           // 44×44px touch target
  role="button"
  tabIndex={0}
  aria-label={\`\${node.label}: \${node.brief}\`}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") select(node.id);
  }}
/>`,
    language: "tsx",
    annotations: [
      { match: "cursor=\"pointer\"", label: "1", explanation: "cursor: pointer is a visual promise. The user sees a hand cursor and expects something to happen on click. When nothing does, trust erodes. The user stops trying to interact." },
      { match: "No onClick handler", label: "2", explanation: "Interaction requires state: selectedId, a click handler, visual differentiation, and an accessibility layer. That's 40-60 lines of boilerplate per diagram — zero of which are about the article's topic." },
      { match: "minTarget={44}", label: "3", explanation: "WCAG 2.5.5 requires 44×44px minimum for touch targets. The bespoke node is 58×24px — wide enough, but only 24px tall. On mobile, tapping it is a precision exercise." },
      { match: "aria-label=", label: "4", explanation: "Screen readers see an SVG rect with no text content. The aria-label gives it a name. Without it, the node is invisible to assistive technology — it exists visually but not semantically." },
    ],
  },

  "monolith-config-path": {
    code: `// To change Session's entrance animation:
const config = {
  // ... 45 other properties ...
  nodeStyles: {
    default: {
      fill: "var(--color-surface)",
      stroke: "var(--color-border)",
      // ... 8 other default props ...
    },
    overrides: {
      session: {                    // level 2
        animationOverrides: {       // level 3
          entrance: {               // level 4
            type: "spring",
            stiffness: 300,
            damping: 22,
          },
          // But does this conflict with transitionConfig?
          // Does transitionConfig.defaultEasing apply first?
          // What about transitionConfig.stagger?
          // The answer: "it depends." ← not documented
        },
      },
    },
  },
  transitionConfig: {
    defaultEasing: "easeOut",
    stagger: 0.06,
    // Does this stagger delay apply to overridden nodes?
    // Or only to nodes without animationOverrides?
    // Neither the types nor the docs say.
  },
};`,
    language: "typescript",
    annotations: [
      { match: "45 other properties", label: "1", explanation: "The real config had 52 properties across 6 top-level objects. Each property was added to solve one consumer's request. The aggregate is a combinatorial maze." },
      { match: "level 2", label: "2", explanation: "nodeStyles.overrides is a Record<string, PartialNodeStyle>. Every node gets its own optional override bag. Sounds flexible — until you realize there's no way to share an override across 3 of 5 nodes without repeating it." },
      { match: "level 4", label: "3", explanation: "4 levels deep to reach the actual value. The consumer's mental model is \"I want Session to bounce in.\" The API's model is \"navigate to nodeStyles → overrides → session → animationOverrides → entrance → type.\"" },
      { match: "\"it depends.\"", label: "4", explanation: "Undocumented interaction between two independently-added features. transitionConfig.stagger was added in v2. animationOverrides was added in v3. Nobody tested them together." },
    ],
  },

  "monolith-type-explosion": {
    code: `type DiagramConfig = {
  nodes: NodeConfig[];
  edges: EdgeConfig[];
  layout: LayoutConfig;
  nodeStyles: NodeStyleConfig;
  edgeStyles: EdgeStyleConfig;
  transitionConfig: TransitionConfig;
  interaction: InteractionConfig;
  accessibility: AccessibilityConfig;
  // Added in v2:
  timeline?: TimelineConfig;
  // Added in v3:
  annotations?: AnnotationConfig[];
  // Added in v4:
  groups?: GroupConfig[];
  responsive?: ResponsiveConfig;
};

// Each sub-config has 5-15 properties:
type NodeStyleConfig = {
  default: {
    fill?: string; stroke?: string; strokeWidth?: number;
    rx?: number; shadow?: boolean; shape?: NodeShape;
    fontSize?: number; fontWeight?: number; fontFamily?: string;
    minWidth?: number; minHeight?: number;
  };
  overrides?: Record<string, Partial<NodeStyleConfig["default"]> & {
    animationOverrides?: AnimationOverrides;
    triggerMode?: "mount" | "scroll" | "visible";
  }>;
};`,
    language: "typescript",
    annotations: [
      { match: "DiagramConfig = {", label: "1", explanation: "12 top-level keys. A new consumer sees this type and asks \"which of these do I need?\" The answer: at minimum nodes, edges, layout. In practice: also nodeStyles (because the defaults are wrong for your use case), interaction (because you want selection), and transitionConfig (because the default animation is too slow)." },
      { match: "Added in v2", label: "2", explanation: "Each version added 1-2 top-level config objects. timeline, annotations, groups, responsive — each was a separate consumer request that became a permanent API surface. The type grew monotonically." },
      { match: "5-15 properties", label: "3", explanation: "NodeStyleConfig alone has 11 properties in default, plus overrides which adds animationOverrides (another 6) and triggerMode. That's 18 properties for node styling. Multiply across all sub-configs: roughly 80 total leaf properties." },
      { match: "Partial<NodeStyleConfig", label: "4", explanation: "Partial means every property is optional. Optional means the consumer can't tell which combinations are valid. fill without stroke? Shape without minWidth? The types permit everything; the runtime rejects some combinations silently." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // From Bespoke to Semantic — Part 2: The Compound Pattern
  // ═══════════════════════════════════════════════════════════════

  "compound-types-as-language": {
    code: `export type NodeShape =
  | "rect"
  | "pill"
  | "diamond"
  | "cylinder"
  | "circle"
  | "hexagon";

export type NodeRole = "protagonist" | "supporting" | "context";

export type FlowNode = {
  id: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  shape?: NodeShape;
  role?: NodeRole;
  label: string;
  sublabel?: string;
  brief?: string;

  /** Replace the default SVG label with a full React component. */
  render?: (props: NodeRenderProps) => ReactNode;

  description?: string;
  detail?: ReactNode;
};`,
    language: "typescript",
    annotations: [
      { match: "NodeShape =", label: "1", explanation: "Six shapes, each a union literal. The consumer writes shape: \"diamond\" — the geometry module handles the SVG path math. No SVG knowledge needed." },
      { match: "NodeRole =", label: "2", explanation: "Three roles that map to visual weight: protagonist (1.15× scale), supporting (1.0×), context (0.9×). The consumer declares meaning; the system derives aesthetics." },
      { match: "w?: number", label: "3", explanation: "Optional with smart defaults. If omitted, DEFAULTS.node.w (80px) is used, scaled by the role multiplier. The consumer only sets width when they need to override." },
      { match: "render?:", label: "4", explanation: "The escape hatch the monolith couldn't provide. Any React component inside an SVG node via foreignObject. Forms, buttons, charts — anything." },
    ],
  },

  "compound-geometry-pure": {
    code: `function rectExit(
  cx: number, cy: number,
  hw: number, hh: number,
  tx: number, ty: number,
  gap: number,
) {
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const sx = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  const d = Math.sqrt(dx * dx + dy * dy);
  return {
    x: cx + dx * s + (dx / d) * gap,
    y: cy + dy * s + (dy / d) * gap,
  };
}

export function nodeExit(n: FlowNode, tx: number, ty: number, gap: number) {
  const shape = n.shape ?? "rect";
  switch (shape) {
    case "diamond":  return diamondExit(n.x, n.y, w/2, h/2, tx, ty, gap);
    case "circle":   return circleExit(n.x, n.y, r, tx, ty, gap);
    case "hexagon":  return hexagonExit(n.x, n.y, w/2, h/2, tx, ty, gap);
    default:         return rectExit(n.x, n.y, w/2, h/2, tx, ty, gap);
  }
}`,
    language: "typescript",
    annotations: [
      { match: "rectExit(", label: "1", explanation: "Pure function: center point, half-widths, target point, gap → exit point. No React, no DOM, no state. You can unit-test this with numbers alone." },
      { match: "Math.min(sx, sy)", label: "2", explanation: "Ray-box intersection. Scale factors sx and sy represent how far along the ray the x and y boundaries are hit. The minimum is where the ray first exits the rectangle." },
      { match: "(dx / d) * gap", label: "3", explanation: "After finding the boundary exit, push the point outward by 'gap' pixels along the direction vector. This keeps arrow markers from overlapping the node border." },
      { match: "nodeExit(", label: "4", explanation: "Shape-polymorphic dispatch. The edge path generator calls nodeExit() without caring what shape a node is. Rects, diamonds, circles — the geometry module handles the difference." },
    ],
  },

  "compound-edge-paths": {
    code: `function orthogonalPath(from: FlowNode, to: FlowNode): string {
  const p1 = nodeExit(from, to.x, to.y, DEFAULTS.edgeGap);
  const p2 = nodeExit(to, from.x, from.y, DEFAULTS.edgeGap);

  const dx = Math.abs(p2.x - p1.x);
  const dy = Math.abs(p2.y - p1.y);

  if (dy >= dx) {
    const midY = (p1.y + p2.y) / 2;
    return \`M \${p1.x} \${p1.y} L \${p1.x} \${midY} L \${p2.x} \${midY} L \${p2.x} \${p2.y}\`;
  }
  const midX = (p1.x + p2.x) / 2;
  return \`M \${p1.x} \${p1.y} L \${midX} \${p1.y} L \${midX} \${p2.y} L \${p2.x} \${p2.y}\`;
}

export function computeEdgePath(
  from: FlowNode, to: FlowNode, route: EdgeRoute,
): string {
  switch (route) {
    case "orthogonal": return orthogonalPath(from, to);
    case "curved":     return curvedPath(from, to);
    case "arc":        return arcPath(from, to);
    default:           return straightPath(from, to);
  }
}`,
    language: "typescript",
    annotations: [
      { match: "nodeExit(from, to.x", label: "1", explanation: "Two calls to nodeExit: one for where the line leaves the source, one for where it enters the target. The geometry system handles shape-aware boundary computation." },
      { match: "dy >= dx", label: "2", explanation: "If nodes are more vertical than horizontal, route vertically first (down to midpoint, across, then down). Otherwise, route horizontally first. This heuristic avoids diagonal segments." },
      { match: "midY = (p1.y + p2.y) / 2", label: "3", explanation: "The orthogonal bend point. A straight line between offset nodes crosses through obstacles. Two right-angle turns at the midpoint route cleanly around them — the exact problem bespoke Article 2 couldn't solve." },
      { match: "computeEdgePath(", label: "4", explanation: "Single entry point for all edge routing. The consumer writes route: \"orthogonal\" and gets clean right-angle paths. No manual SVG path strings." },
    ],
  },

  "compound-primitives-hitarea": {
    code: `export function FlowNodeHitArea({
  node, onSelect, onHover, index, diagramId, children,
}: {
  node: ResolvedNode;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  index: number;
  diagramId: string;
  children: ReactNode;
}) {
  return (
    <motion.g
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: node.opacity, y: 0 }}
      transition={{ ...SPRING.gentle, delay: index * STAGGER.fast }}
    >
      <g
        onClick={(ev) => { ev.stopPropagation(); onSelect(node.id); }}
        onMouseEnter={() => onHover(node.id)}
        onMouseLeave={() => onHover(null)}
        role="button"
        tabIndex={node.interactive ? 0 : -1}
        aria-label={\`\${node.label}: \${node.description ?? ""}\`}
        onKeyDown={(ev) => {
          if (ev.key === "Enter" || ev.key === " ") onSelect(node.id);
        }}
      >
        {/* Invisible 44×44 touch target */}
        <rect
          x={node.x - 22} y={node.y - 22}
          width={44} height={44}
          fill="transparent" stroke="none"
        />
        {children}
      </g>
    </motion.g>
  );
}`,
    language: "tsx",
    annotations: [
      { match: "children: ReactNode", label: "1", explanation: "The primitive wraps whatever you put inside it. FlowNodeShape, FlowNodeLabel, or your own custom SVG. The hit area doesn't know or care what it wraps." },
      { match: "delay: index * STAGGER.fast", label: "2", explanation: "Staggered entrance. The index comes from the scene context's stagger map — which follows the arc order if provided, falling back to spatial position. The animation knows about the semantic reading order." },
      { match: "role=\"button\"", label: "3", explanation: "Every interactive node is a button: click, keyboard, focus, aria-label. The 60 lines of accessibility boilerplate that bespoke Article 3 skipped — written once, applied everywhere." },
      { match: "width={44} height={44}", label: "4", explanation: "WCAG 2.5.5 minimum touch target. A node might be 80×28px visually, but the hit area is always at least 44×44. On mobile, you can actually tap it." },
    ],
  },

  "compound-composition-vs-config": {
    code: `// MONOLITH: Configure everything through one prop bag
<DiagramMonolith
  nodes={nodes}
  edges={edges}
  nodeStyles={{ default: { fill: "..." }, overrides: { session: { ... } } }}
  layout={{ algorithm: "dagre", direction: "TB" }}
  interaction={{ selectable: true, detailPanelPosition: "inline" }}
  transitionConfig={{ defaultEasing: "easeOut", stagger: 0.06 }}
/>

// COMPOUND: Compose primitives freely
<svg viewBox={viewBox}>
  <FlowMarkerDefs id={id} />
  {groups.map(g => <FlowGroupBox key={g.id} group={g} />)}
  {edges.map(e => <FlowEdgePath key={e.key} edge={e} />)}
  {nodes.map(n => (
    <FlowNodeHitArea key={n.id} node={n} onSelect={select}>
      <FlowNodeShape node={n} />
      <FlowNodeLabel node={n} />
    </FlowNodeHitArea>
  ))}
</svg>
<FlowDetailPanel selectedNode={selectedNode} />`,
    language: "tsx",
    annotations: [
      { match: "MONOLITH:", label: "1", explanation: "One component, one prop bag, zero flexibility. Every customization requires a new prop. Need a React component inside a node? Fork the monolith." },
      { match: "COMPOUND:", label: "2", explanation: "Independent primitives composed freely. Need to skip the detail panel? Don't render it. Need custom edge rendering? Replace FlowEdgePath. Need a React component inside a node? Use the render prop on FlowNode." },
      { match: "FlowGroupBox", label: "3", explanation: "Groups render behind edges, which render behind nodes. The z-order is explicit in the JSX tree — not hidden in a configuration object." },
      { match: "FlowDetailPanel", label: "4", explanation: "The detail panel is a separate component outside the SVG. In the monolith, it was entangled with the diagram's internal rendering. Here, it can live anywhere in your layout." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // From Bespoke to Semantic — Part 3: The Semantic Layer
  // ═══════════════════════════════════════════════════════════════

  "semantic-five-dimensions": {
    code: `export type FlowDiagramDef = {
  id: string;
  title: string;
  viewBox: string;

  nodes: FlowNode[];
  edges: FlowEdge[];
  groups?: FlowGroup[];
  annotations?: FlowAnnotation[];

  // ── Semantic dimensions ──────────────────────
  thesis: string;          // Intent: why this diagram exists
  protagonist?: string;    // Hierarchy: what matters most
  tension?: string;        // Intent: the interesting question
  arc?: string[];          // Path: reading order
};`,
    language: "typescript",
    annotations: [
      { match: "thesis: string", label: "1", explanation: "Required. Forces every diagram author to answer: \"what should the reader understand?\" If you can't write one sentence, the diagram is trying to do too much. Rendered as visible text above the SVG." },
      { match: "protagonist?: string", label: "2", explanation: "The node ID that matters most. The system applies 1.15× scale, accent glow, strongest interactive signal. The consumer declares importance; the renderer derives the visual treatment." },
      { match: "tension?: string", label: "3", explanation: "The interesting question or tradeoff. \"Single coordination point — bottleneck or feature?\" Rendered as a prominent callout. Gives the reader a reason to care." },
      { match: "arc?: string[]", label: "4", explanation: "Comprehension order. [\"session\", \"skill\", \"role\", \"task\", \"sandbox\"] produces numbered indicators on nodes and staggers the entrance animation to follow the learning path." },
    ],
  },

  "semantic-role-system": {
    code: `export const DEFAULTS = {
  role: {
    protagonist: { scale: 1.15, strokeMultiplier: 1.8, fontMultiplier: 1.12 },
    supporting:  { scale: 1.0,  strokeMultiplier: 1.0, fontMultiplier: 1.0 },
    context:     { scale: 0.9,  strokeMultiplier: 0.8, fontMultiplier: 0.9 },
  },
};

// In the hook:
const effectiveRole = sceneContext.roleMap.get(n.id) ?? "supporting";
const isProtagonist = n.id === sceneContext.protagonistId;
const roleScale = DEFAULTS.role[effectiveRole].scale;

return {
  ...n,
  resolvedW: resolveW(n, defaultW) * roleScale,
  resolvedH: resolveH(n, defaultH) * roleScale,
  isProtagonist,
  effectiveRole,
};`,
    language: "typescript",
    annotations: [
      { match: "protagonist: { scale: 1.15", label: "1", explanation: "15% larger, 80% thicker stroke, 12% bigger font. Small differences that compound: the protagonist node is visually heavier across every dimension simultaneously." },
      { match: "context:     { scale: 0.9", label: "2", explanation: "10% smaller, 20% thinner stroke. Context nodes recede without disappearing. The hierarchy creates a gradient of visual weight — the reader's eye finds the protagonist first." },
      { match: "roleScale", label: "3", explanation: "The consumer never writes w: 92 for a protagonist. They write role: \"protagonist\" and the system computes 80 × 1.15 = 92. Change the scale factor once and every protagonist in every diagram updates." },
      { match: "isProtagonist", label: "4", explanation: "Boolean flag propagated to every renderer. The shape gets accent fill. The label gets accent color. The hit area gets glow filter. One declaration, four visual effects." },
    ],
  },

  "semantic-edge-relationships": {
    code: `export type FlowEdge = {
  from: string;
  to: string;
  label?: string;        // visual: shown on the edge path
  verb?: string;         // semantic: "loads", "spawns", "executes"
  description?: string;  // narrative: human explanation
  route?: EdgeRoute;
  animate?: EdgeAnimate;
  problem?: boolean;
};

// Auto-composed in the detail panel:
const connections = edges
  .filter(e => e.from === node.id || e.to === node.id)
  .filter(e => e.description)
  .map(e => ({
    edge: e,
    other: nodeMap[e.from === node.id ? e.to : e.from],
    isOutgoing: e.from === node.id,
  }));

// Renders as:
// → loads Skill — "loads instruction sets into the conversation"
// → spawns Sandbox — "creates isolated execution environments"`,
    language: "typescript",
    annotations: [
      { match: "label?: string", label: "1", explanation: "The short form visible on the diagram: \".skill()\", \"tool calls\". Serves the visual channel — the reader sees topology at a glance." },
      { match: "verb?: string", label: "2", explanation: "The action word: \"loads\", \"spawns\", \"executes\". Used in the relationship view. The consumer writes the verb; the system constructs \"→ loads Skill\" automatically." },
      { match: "description?: string", label: "3", explanation: "The human explanation. This is where teaching happens. \"Loads instruction sets into the conversation\" explains what .skill() actually does. Label is reference; description is learning." },
      { match: "connections = edges", label: "4", explanation: "When a node is selected, the detail panel auto-composes a relationship view from all connected edges with descriptions. Zero custom code per diagram — the system builds it from the semantic data." },
    ],
  },

  "semantic-variant-resolution": {
    code: `export type NodeVariant =
  | "idle" | "selected" | "hovered" | "dimmed"
  | "active" | "visited" | "future" | "disabled" | "error";

const VARIANT_OPACITY: Record<NodeVariant, number> = {
  idle: 1, selected: 1, hovered: 1, dimmed: 0.75,
  active: 1, visited: 0.7, future: 0.28, disabled: 0.2, error: 1,
};

function resolveNodeVariant(
  nodeId: string,
  selectedId: string | null,
  hoveredId: string | null,
  externalStates?: Record<string, NodeVariant>,
): NodeVariant {
  if (externalStates?.[nodeId]) return externalStates[nodeId];
  if (nodeId === selectedId) return "selected";
  if (nodeId === hoveredId) return "hovered";
  if (selectedId !== null) return "dimmed";
  return "idle";
}`,
    language: "typescript",
    annotations: [
      { match: "NodeVariant =", label: "1", explanation: "Nine variants covering every interaction state. The renderer never computes opacity or color directly — it receives a variant and looks up the visual treatment." },
      { match: "future: 0.28", label: "2", explanation: "In timeline mode, future nodes are nearly invisible. The reader sees what's been covered and what's active — the future is suggested, not revealed. Progressive disclosure through opacity." },
      { match: "externalStates?.[nodeId]", label: "3", explanation: "External states override everything. The timeline hook provides these — it sets \"active\", \"visited\", \"future\", \"disabled\" based on playback position. The variant system is the bridge between hooks and renderers." },
      { match: "selectedId !== null", label: "4", explanation: "When anything is selected, everything else dims. This focus-plus-context pattern (Shneiderman) keeps the selected node prominent while preserving spatial awareness." },
    ],
  },

  "semantic-scene-resolution": {
    code: `const sceneContext = useMemo((): SceneContext => {
  const protagonistId = def.protagonist
    ?? def.nodes.find(n => n.role === "protagonist")?.id
    ?? null;

  const arcMap = new Map<string, number>();
  if (def.arc) {
    def.arc.forEach((nodeId, idx) => arcMap.set(nodeId, idx));
  }

  const roleMap = new Map<string, NodeRole>();
  for (const n of def.nodes) {
    if (n.role) roleMap.set(n.id, n.role);
    else if (n.id === protagonistId) roleMap.set(n.id, "protagonist");
    else roleMap.set(n.id, "supporting");
  }

  // Stagger: arc first, then remaining nodes by position
  const arcNodes = def.arc ?? [];
  const nonArcNodes = def.nodes
    .filter(n => !arcMap.has(n.id))
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map(n => n.id);
  const staggerMap = new Map<string, number>();
  [...arcNodes, ...nonArcNodes].forEach((id, idx) =>
    staggerMap.set(id, idx)
  );

  return { protagonistId, arcMap, roleMap, staggerMap };
}, [def]);`,
    language: "typescript",
    annotations: [
      { match: "protagonistId = def.protagonist", label: "1", explanation: "Three ways to declare a protagonist: the top-level field, the role property on a node, or neither. The system finds it from any source. Redundancy in the API creates flexibility in authoring." },
      { match: "arcMap = new Map", label: "2", explanation: "Arc positions as a lookup table. Node \"skill\" at arc index 1 gets a numbered indicator (2) and staggers second in the entrance animation. The map is the bridge between author intent and renderer behavior." },
      { match: "protagonistId) roleMap.set", label: "3", explanation: "Role inference: if a node is the protagonist but doesn't have role: \"protagonist\" set explicitly, the system infers it. Explicit role always wins, but the protagonist field provides a convenient shorthand." },
      { match: "arcNodes, ...nonArcNodes", label: "4", explanation: "Stagger order: arc nodes animate first (in reading order), then remaining nodes top-to-bottom, left-to-right. The entrance animation tells a story — the protagonist appears first, then the supporting cast." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // From Bespoke to Semantic — Part 4: The Assembly
  // ═══════════════════════════════════════════════════════════════

  "assembly-hook-api": {
    code: `export function useFlowDiagram(
  def: FlowDiagramDef,
  options?: UseFlowDiagramOptions,
): UseFlowDiagramReturn {
  // ── Selection state (controlled or uncontrolled) ──
  const [internalSelectedId, setInternalSelectedId] = useState(null);
  const selectedId = options?.selectedId ?? internalSelectedId;

  // ── Scene context (semantic analysis) ──
  const sceneContext = useMemo(() => /* ... */, [def]);

  // ── Timeline integration ──
  const timeline = useFlowTimeline(def.timeline ?? null);
  const mergedNodeStates = useMemo(() => {
    if (!timeline?.isActive) return options?.nodeStates;
    // Merge timeline states: active, visited, future, disabled
  }, [timeline, options?.nodeStates]);

  // ── Resolution: data + state → visual output ──
  const resolvedNodes = useMemo(() =>
    def.nodes.map(n => ({
      ...n,
      variant: resolveNodeVariant(n.id, selectedId, hoveredId, mergedNodeStates),
      resolvedW: resolveW(n) * roleScale,
      opacity: VARIANT_OPACITY[variant],
      isProtagonist: n.id === sceneContext.protagonistId,
    })),
  [def.nodes, selectedId, hoveredId, mergedNodeStates, sceneContext]);

  return { selectedId, resolvedNodes, resolvedEdges, resolvedGroups, ... };
}`,
    language: "typescript",
    annotations: [
      { match: "controlled or uncontrolled", label: "1", explanation: "The React select/input pattern. Pass selectedId to control from outside (parent manages state). Omit it and the hook manages its own state. Same hook, two integration modes." },
      { match: "sceneContext = useMemo", label: "2", explanation: "Scene context is computed once from the definition. It contains the protagonist, role map, arc map, and stagger order — the semantic analysis that turns raw data into visual decisions." },
      { match: "mergedNodeStates", label: "3", explanation: "Timeline states merge into the variant system. When the timeline is playing, it overrides node variants with active/visited/future/disabled. The hook is the integration point between temporal and spatial state." },
      { match: "resolvedNodes = useMemo", label: "4", explanation: "The core transformation: raw FlowNode + interaction state + scene context → ResolvedNode with variant, opacity, dimensions, and flags. Renderers consume this — they never compute visual state themselves." },
    ],
  },

  "assembly-composed-component": {
    code: `export function FlowDiagram({ children, ...def }: FlowDiagramProps) {
  const flow = useFlowDiagram(def, options);

  return (
    <div className="my-8">
      {/* Thesis — always visible orientation */}
      {def.thesis && <div className="...">{def.thesis}</div>}
      {def.tension && <div className="...">{def.tension}</div>}

      {/* SVG canvas */}
      <svg viewBox={def.viewBox} onClick={() => flow.clearSelection()}>
        <FlowMarkerDefs id={def.id} />
        {flow.resolvedGroups.map(g => <FlowGroupBox key={g.id} group={g} />)}
        {flow.resolvedEdges.map(e => <FlowEdgePath key={e.key} edge={e} />)}
        {flow.resolvedNodes.map(n => (
          <FlowNodeHitArea key={n.id} node={n} onSelect={flow.select}>
            <FlowNodeShape node={n} />
            <FlowNodeLabel node={n} />
          </FlowNodeHitArea>
        ))}
      </svg>

      {/* Detail panel + Timeline controls */}
      <FlowDetailPanel selectedNode={selectedNode} />
      {flow.timeline && <FlowTimelineControls timeline={flow.timeline} />}
    </div>
  );
}`,
    language: "tsx",
    annotations: [
      { match: "useFlowDiagram(def, options)", label: "1", explanation: "One hook call resolves everything: nodes, edges, groups, selection, hover, timeline. The composed component is a thin rendering shell over the hook's output." },
      { match: "def.thesis &&", label: "2", explanation: "Thesis is always visible — it's the advance organizer. The reader knows what the diagram is about before any interaction. Tension follows as the interesting question." },
      { match: "FlowGroupBox", label: "3", explanation: "Rendering order encodes z-order: groups (back) → edges → nodes (front). The JSX tree IS the render pipeline — no configuration needed." },
      { match: "FlowDetailPanel", label: "4", explanation: "Lives outside the SVG. Gets the selected node's resolved state. Auto-composes relationships from edge data. The detail panel is a consumer of the hook, not part of the SVG renderer." },
    ],
  },

  "assembly-quality-spectrum": {
    code: `// ── Bare minimum (syntactic only) ──────────────
const bare: FlowDiagramDef = {
  id: "basic",
  title: "System",
  thesis: "A basic system diagram",
  viewBox: "0 0 400 200",
  nodes: [
    { id: "a", x: 80, y: 100, label: "Service A" },
    { id: "b", x: 200, y: 100, label: "Service B" },
    { id: "c", x: 320, y: 100, label: "Service C" },
  ],
  edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }],
};
// Result: Three same-sized nodes, two unnamed edges.
// Dev console: ⚠ No protagonist. ⚠ 2/2 edges lack verb.

// ── Fully semantic ────────────────────────────────
const rich: FlowDiagramDef = {
  id: "architecture",
  title: "Agent Architecture",
  thesis: "All five primitives communicate through Session",
  tension: "Single coordination point — bottleneck or feature?",
  protagonist: "session",
  arc: ["session", "skill", "role", "task", "sandbox"],
  viewBox: "0 0 400 280",
  nodes: [
    { id: "session", role: "protagonist", label: "Session",
      brief: "Message history with built-in compaction",
      description: "Central state object managing conversation turns..." },
    { id: "skill", role: "supporting", label: "Skill",
      brief: "Markdown instruction sets",
      description: "Loaded at session start from .md files..." },
    // ... 3 more nodes with brief + description
  ],
  edges: [
    { from: "session", to: "skill", label: ".skill()",
      verb: "loads",
      description: "loads markdown instruction sets into the conversation" },
    // ... each edge with verb + description
  ],
};
// Result: Session 15% larger with glow. Numbered indicators.
// Rich detail panel on click. Zero dev warnings.`,
    language: "typescript",
    annotations: [
      { match: "bare minimum", label: "1", explanation: "7 lines of data. The diagram renders correctly — text fits, edges avoid obstacles, nodes are interactive. The compound system handles the mechanics. But it's lifeless: no hierarchy, no reading order, no story." },
      { match: "⚠ No protagonist", label: "2", explanation: "Dev warnings are the quality gradient. They don't block rendering — they tell the author what's missing. Like TypeScript errors but for diagram craft." },
      { match: "Fully semantic", label: "3", explanation: "Same system, same primitives. The difference is data density. thesis, protagonist, arc, brief, verb, description — each field adds one semantic layer. The visual improvement comes from the system translating meaning into craft." },
      { match: "Zero dev warnings", label: "4", explanation: "The quality spectrum is the incentive. Bare minimum works. Fully semantic works better. The system rewards richer data with richer rendering — it never punishes simplicity." },
    ],
  },

  "assembly-levels-of-usage": {
    code: `// ── Level 0: Drop-in ──
// "I just want a diagram."
<FlowDiagram {...diagramDef} />

// ── Level 1: Custom detail panel ──
// "I want to control what appears when nodes are selected."
<FlowDiagram {...diagramDef}>
  {(node) => <MyCustomPanel node={node} />}
</FlowDiagram>

// ── Level 2: Controlled selection ──
// "I want the diagram to sync with external state."
<FlowDiagram {...diagramDef}
  selectedId={activeNodeId}
  onSelect={setActiveNodeId}
/>

// ── Level 3: Full custom rendering ──
// "I want to use the hook directly."
const flow = useFlowDiagram(diagramDef);
return (
  <svg viewBox={diagramDef.viewBox}>
    {flow.resolvedEdges.map(e => <MyCustomEdge edge={e} />)}
    {flow.resolvedNodes.map(n => <MyCustomNode node={n} />)}
  </svg>
);`,
    language: "tsx",
    annotations: [
      { match: "Level 0: Drop-in", label: "1", explanation: "One line. The composed component handles everything: rendering, interaction, detail panel, animation. 80% of use cases stop here." },
      { match: "Level 1: Custom detail", label: "2", explanation: "Render prop pattern. The composed component still handles the SVG, but you control the detail panel content. The child function receives a ResolvedNode with all computed state." },
      { match: "Level 2: Controlled", label: "3", explanation: "Lift selection state to the parent. Now external buttons, search, or URL params can drive which node is selected. The diagram becomes a controlled component." },
      { match: "Level 3: Full custom", label: "4", explanation: "Use the hook directly, bring your own renderers. You get resolved nodes/edges with variants, opacity, and dimensions computed — but render them however you want. The kitchen, not the vending machine." },
    ],
  },

  // ── How We Built the Playground ──────────────────────────

  "playground-babel-config": {
    code: `const result = Babel.transform(code, {
  presets: [
    ["react", { runtime: "automatic" }],
    "typescript",
  ],
  plugins: ["transform-modules-commonjs"],
  filename: "app.tsx",
});`,
    language: "typescript",
    annotations: [
      { match: "runtime: \"automatic\"", label: "1", explanation: "The 'automatic' JSX runtime means Babel injects 'import { jsx } from react/jsx-runtime' instead of requiring React in scope. Users write <App /> without importing React — just like modern bundlers." },
      { match: "\"typescript\"", label: "2", explanation: "Babel strips TypeScript syntax but doesn't type-check. This is intentional: a playground needs speed, not correctness. Type errors would block exploration." },
      { match: "transform-modules-commonjs", label: "3", explanation: "Converts import/export to require/module.exports so our custom module loader can intercept them. The browser doesn't have a native module system we can hook into — CommonJS gives us that seam." },
      { match: "filename: \"app.tsx\"", label: "4", explanation: "The filename hint tells Babel which parser plugins to enable. Without it, JSX and TypeScript syntax would be rejected as parse errors." },
    ],
  },

  "playground-lexer-parse": {
    code: `function resolveImports(code: string): string[] {
  const imports: string[] = [];
  const importRegex =
    /import\\s+(?:[\\w{},\\s*]+\\s+from\\s+)?['\"]([^'\"]+)['\"]/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}`,
    language: "typescript",
    annotations: [
      { match: "importRegex", label: "1", explanation: "A regex that catches 'import X from \"y\"', 'import { X } from \"y\"', and 'import \"y\"'. It's not perfect — it'll match imports inside comments or strings. But for a playground, false positives are harmless: we just pre-load an extra module that goes unused." },
      { match: "match[1]", label: "2", explanation: "Capture group 1 is the module specifier — the string between quotes. This is the only part we need: not what's imported, just where from." },
      { match: "while ((match", label: "3", explanation: "The exec() loop with a global regex is the classic pattern for extracting all matches. Each call advances lastIndex, returning the next match until null." },
    ],
  },

  "playground-magic-string": {
    code: `// Build the preview HTML document
const srcdoc = \`<!DOCTYPE html>
<html>
<head>
  <style>\${cssText}</style>
  <script>
    // Inject module system
    const modules = {};
    function require(name) {
      if (!modules[name]) throw new Error(name);
      return modules[name];
    }
    // Register React
    modules["react"] = window.React;
    modules["react/jsx-runtime"] = window.React;
  </script>
  <script>\${transpiledCode}</script>
</head>
<body><div id="root"></div></body>
</html>\`;`,
    language: "typescript",
    annotations: [
      { match: "const modules = {}", label: "1", explanation: "A hand-rolled module registry. When Babel rewrites 'import React from \"react\"' to 'const React = require(\"react\")', this is the require function that resolves it." },
      { match: "modules[\"react\"]", label: "2", explanation: "React is loaded via CDN <script> tag and lands on window.React. We just alias it into our module system. Same trick works for any library." },
      { match: "${cssText}", label: "3", explanation: "CSS is injected directly into a <style> tag. No bundler, no CSS modules transform — just raw text. This is why the playground supports plain CSS but not Sass or PostCSS." },
      { match: "${transpiledCode}", label: "4", explanation: "The Babel output drops in as a single script. Because it's CommonJS (thanks to transform-modules-commonjs), it executes top-down: require() calls resolve synchronously from our registry." },
    ],
  },

  "playground-srcdoc": {
    code: `<iframe
  ref={iframeRef}
  srcDoc={srcdoc}
  sandbox="allow-scripts"
  title="Preview"
  className="preview-frame"
/>`,
    language: "tsx",
    annotations: [
      { match: "srcDoc={srcdoc}", label: "1", explanation: "srcDoc is the key to the whole architecture. Instead of pointing to a URL, we pass the entire HTML document as a string. Every keystroke generates a new document — no server round-trip, no file writes." },
      { match: "sandbox=\"allow-scripts\"", label: "2", explanation: "The sandbox attribute creates a security boundary. 'allow-scripts' lets code run but blocks popups, form submission, and top-level navigation. User code can't escape the iframe." },
      { match: "ref={iframeRef}", label: "3", explanation: "The ref gives us imperative access for error handling. When the iframe's script throws, we catch it via the iframe's contentWindow.onerror and surface it in our error panel." },
    ],
  },

  "playground-error-handler": {
    code: `// Error boundary for the preview
iframe.contentWindow.onerror = (message, source, line) => {
  setError({
    message: String(message),
    line: line ?? 0,
    source: source ?? "unknown",
  });
  return true; // prevent default console error
};

// Runtime error catching
try {
  const result = Babel.transform(code, config);
  setTranspiled(result.code);
  setError(null);
} catch (err) {
  setError({
    message: err.message,
    line: err.loc?.line ?? 0,
    source: "babel",
  });
}`,
    language: "typescript",
    annotations: [
      { match: "contentWindow.onerror", label: "1", explanation: "Runtime errors (undefined variables, failed renders) happen inside the iframe. onerror is the only way to catch them from the parent — postMessage would require cooperative code inside the iframe." },
      { match: "return true", label: "2", explanation: "Returning true suppresses the browser's default error logging. Without this, every typo would produce both our styled error panel AND a noisy console error." },
      { match: "Babel.transform(code, config)", label: "3", explanation: "Syntax errors are caught here, before the code ever reaches the iframe. This is the two-layer error strategy: Babel catches parse errors, onerror catches runtime errors." },
      { match: "err.loc?.line", label: "4", explanation: "Babel parse errors include location info (line, column). We thread this through to the editor so it can highlight the error line — the same red-squiggle experience as a real IDE." },
    ],
  },

  "playground-virtual-namespace": {
    code: `// Virtual module namespace
function createModuleScope(name: string, code: string) {
  const module = { exports: {} };
  const wrappedCode = \`
    (function(module, exports, require) {
      \${code}
    })(module, module.exports, require);
  \`;
  eval(wrappedCode);
  return module.exports;
}`,
    language: "typescript",
    annotations: [
      { match: "module = { exports: {} }", label: "1", explanation: "Each module gets its own exports object — the same contract as Node.js CommonJS. When Babel compiles 'export default App', it becomes 'module.exports.default = App'." },
      { match: "wrappedCode", label: "2", explanation: "The IIFE wrapper gives each module its own scope. Without it, all modules would share the same 'module' and 'exports' bindings, and the last one loaded would overwrite everything." },
      { match: "eval(wrappedCode)", label: "3", explanation: "Yes, eval. In a sandboxed iframe, it's the simplest way to execute dynamically generated code. The sandbox attribute on the iframe is the security boundary — eval inside it can't touch the parent page." },
    ],
  },

  "playground-coercion": {
    code: `// Coerce common CSS patterns for iframe context
function coerceCSS(raw: string): string {
  return raw
    .replace(/\\.module\\.css/g, ".css")
    .replace(/:root/g, ":scope")
    .replace(/@import\\s+['\"][^'\"]+['\"];?/g, "");
}`,
    language: "typescript",
    annotations: [
      { match: ".module.css", label: "1", explanation: "CSS Modules don't exist in our iframe — there's no bundler to scope class names. Stripping the .module suffix is a signal to the user that scoping is manual here." },
      { match: ":scope", label: "2", explanation: ":root in the iframe would target the iframe's <html>, not the preview container. :scope targets the element the stylesheet is attached to — closer to what the user expects." },
      { match: "@import", label: "3", explanation: "External @import statements would fail in srcdoc (no base URL to resolve against) and block rendering while they timeout. Stripping them is both a performance and reliability win." },
    ],
  },

  "playground-regex-vs-lexer": {
    code: `// ❌ Regex approach — brittle
const importRegex = /import .+ from ['\"](.+)['\"]/g;
// Breaks on: multiline imports, comments containing
// import-like text, dynamic import(), template literals

// ✅ Lexer approach — robust
import { parse } from "es-module-lexer";
const [imports] = parse(code);
// Handles all edge cases: re-exports, dynamic imports,
// string escaping, comments — because it actually parses`,
    language: "typescript",
    annotations: [
      { match: "❌ Regex approach", label: "1", explanation: "The playground starts here — and it works. Regex import detection handles 95% of real playground code. The remaining 5% (multiline imports, commented-out imports) rarely matters for learning exercises." },
      { match: "Breaks on:", label: "2", explanation: "These aren't hypothetical failures. Multiline 'import { A, B, C }' is common in real code. A comment saying '// import this later' would trigger a false positive. The regex approach has a known failure ceiling." },
      { match: "✅ Lexer approach", label: "3", explanation: "es-module-lexer is a purpose-built WASM module (~4KB) that parses import/export statements. It's what Vite uses internally. The jump from regex to lexer is the same jump as from string matching to parsing." },
      { match: "actually parses", label: "4", explanation: "The key insight: regex matches text patterns, a lexer understands syntax structure. The lexer knows that 'import' inside a string literal isn't a real import. This is why production bundlers never use regex for module resolution." },
    ],
  },
};
