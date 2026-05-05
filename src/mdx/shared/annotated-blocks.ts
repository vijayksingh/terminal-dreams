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
};
