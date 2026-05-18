# Section 3: Web APIs for Complex UI -- Implementation Brief

> Source: `src/lib/lesson-plans/s03-web-apis.ts`
> Section color: `--diagram-layer-0` (oklch 65% 0.15 200, teal-blue)
> Motion tokens: `src/lib/motion.ts` | Design tokens: `src/styles/tokens.css`
> Section structure: concept -> practice -> concept -> practice -> concept -> practice (observer overview, then 3 deep-dive/challenge pairs)

---

## api-observer-overview -- Observer Anatomy Viewer
**Format**: anatomy | **Effort**: small

### Interaction State Machine

```
                       +-------------------+
                       |      GRID         |
                       | (4 cards visible) |
                       +-------------------+
                            |  click card
                            v
               +---------------------------+
               |     CARD_EXPANDED         |
               | expandedCard: ObserverType |
               +---------------------------+
                  |   click "X" or         |  click "Quiz" CTA
                  |   click backdrop       |     (from grid)
                  v                        v
          +------------+         +-------------------+
          |    GRID    |         |   QUIZ_ACTIVE     |
          |  (return)  |         | questionIdx: 0..4 |
          +------------+         +-------------------+
                                   |  answer question
                                   v
                                 +-------------------+
                                 |  QUIZ_FEEDBACK    |
                                 | correct: boolean  |
                                 | explanation: str  |
                                 +-------------------+
                                   |  next / finish
                                   v
                                 +-------------------+
                                 | QUIZ_COMPLETE     |
                                 | score: number     |
                                 +-------------------+
```

**State data:**
- `view`: `"grid"` | `"expanded"` | `"quiz"`
- `expandedCard`: `"intersection"` | `"mutation"` | `"resize"` | `"performance"` | `null`
- `quizState`: `{ questionIdx: number; answers: (ObserverType | null)[]; showFeedback: boolean; }`

### Visual Choreography

**Grid layout (default view):**
- 2x2 CSS Grid, gap: `var(--space-4)` (16px).
- Each card: 220x180px, `var(--color-surface)` background, `var(--radius-2)` (8px) border-radius, `var(--shadow-2)` shadow.
- Top border: 3px solid, per-observer color:
  - IntersectionObserver: `oklch(65% 0.15 200)` (teal, `--diagram-layer-0`)
  - MutationObserver: `oklch(65% 0.15 300)` (purple, `--diagram-layer-2`)
  - ResizeObserver: `oklch(65% 0.15 60)` (amber, `--diagram-layer-3`)
  - PerformanceObserver: `oklch(65% 0.15 140)` (green, `--diagram-layer-1`)
- Card contents top-to-bottom:
  - Observer name in `var(--font-mono)`, `var(--text-sm)` (0.85rem), `var(--color-text)`.
  - "Watches: [target]" label, `var(--text-xs)` (0.75rem), `var(--color-muted)`.
  - Mini live demo area: exactly 44px tall, `var(--color-bg)` background, `var(--radius-1)` corners, 1px `var(--color-border)` border. Runs on `LOOP.breathe` (2s cycle, easeInOut). No user interaction needed.
- Card hover: translateY(-2px) via `SPRING.quick` (stiffness 400, damping 26). Cursor: pointer.

**Mini demo specifics (each 44px tall, 100% card width minus 16px padding):**
- IO mini: 44px scroll area. A 10px circle (`oklch(65% 0.15 200)`) translates vertically from below the viewport line to above it on a 3s loop. A 1px dashed horizontal line at 50% height marks the "viewport edge." When the circle is below: opacity 0.3. When it crosses: opacity 1.0, 150ms transition.
- MO mini: 3 small rectangles (8x6px) arranged as a tree. Every 2s, a new rectangle fades in (TRANSITION.enterItem, 200ms) as a child node; after 3 children, the oldest fades out. A tiny flash (4px circle, observer color, 100ms) appears at the root when a change fires.
- RO mini: A rectangle that scales width between 60% and 100% of the demo area on a 2.5s loop. Two dimension labels (e.g., "120" and "80") at top-right corner update in sync, using `var(--font-mono)` at 9px.
- PO mini: 3 horizontal bars stacked vertically (FP, FCP, LCP labels at 8px font). Each bar fills left-to-right staggered: FP at 0.5s, FCP at 1.2s, LCP at 2.0s, then resets. Bar color matches observer color at 60% opacity.

**Card expansion:**
- Clicked card expands from its grid position to full container width (max 680px), height auto. Transition: `SPRING.gentle` (stiffness 300, damping 20). Other 3 cards fade to opacity 0.15 over `DURATION.normal` (300ms).
- Expanded content (below the mini demo, which keeps running):
  - Constructor signature: `new IntersectionObserver(callback, options)` in a code block. `var(--font-mono)`, `var(--text-sm)`, `var(--color-surface-2)` background, 12px padding.
  - `observe(target)` / `unobserve(target)` / `disconnect()` method signatures, each on its own line with a 1-sentence description in `var(--color-muted)`.
  - Callback signature: `(entries: TypedEntry[], observer) => void` with entry fields listed.
  - 3 use-case pills: small rounded chips (`var(--radius-1)`, observer color at 15% opacity background, observer color text). E.g., for IO: "Lazy loading", "Infinite scroll", "Scroll animations".
- Close: X button top-right (24x24px, `var(--color-muted)`, hover `var(--color-text)`). Also close on clicking outside the expanded card.

**Quiz (below the grid):**
- Activated by a button: "Which Observer?" in `var(--font-mono)`, pill-shaped, `var(--color-accent)` border.
- 5 scenario cards appear one at a time. Each scenario: `var(--color-surface)` card, max-width 560px, centered. Scenario text in `var(--text-base)`, `var(--color-text)`. Below: 4 answer buttons (one per observer), styled as the observer-colored pills from the grid.
- Correct answer: button pulses green (`var(--color-success)`) for 400ms, explanation text fades in below with `TRANSITION.enterCard`.
- Wrong answer: button shakes (translateX +/- 3px, 3 cycles, 300ms total), turns `var(--color-error)` border. Specific feedback fades in: e.g., "IO tracks visibility, not size -- you want ResizeObserver." `var(--color-muted)` italic text. Correct button then highlights with a soft glow.
- Progress: 5 dots at the top of the quiz area. Filled dot = answered. Current dot pulses via `LOOP.pulse`.

### Teaching Flow (First 60 Seconds)

1. Reader sees 4 observer cards in a 2x2 grid. Each card has a tiny animation running -- the mini demos are already alive. No instructions, no labels saying "click me." The movement draws the eye.
2. Reader hovers over the IO card (it lifts 2px). They click it.
3. Card expands smoothly to full width. The mini demo keeps running at the top. Below it: constructor, methods, callback shape, 3 use-case pills. Reader scans the API surface in ~10 seconds.
4. Reader clicks X or clicks outside. Card shrinks back to grid. They click the MO card next -- same pattern but different content. They now see the shared pattern: construct, observe, callback.
5. After exploring 2-3 cards, they notice the "Which Observer?" button below the grid. They click it.
6. First scenario: "You need to detect when a promotional banner enters the user's viewport to log an analytics impression." Four buttons. They pick IntersectionObserver -- correct.
7. Second scenario: "A sidebar's width changes when a user drags a divider. You need to re-layout its contents." If they pick IO, they get: "IO tracks whether an element is visible, not its dimensions. ResizeObserver watches element size changes." They try RO -- correct.

### Data & State Shape

```typescript
type ObserverType = "intersection" | "mutation" | "resize" | "performance";

type ObserverCard = {
  type: ObserverType;
  name: string;              // "IntersectionObserver"
  watches: string;           // "Element visibility in viewport"
  color: string;             // CSS custom property ref, e.g., "var(--diagram-layer-0)"
  constructor: string;       // "new IntersectionObserver(callback, options)"
  methods: { name: string; signature: string; description: string }[];
  callbackSignature: string;
  useCases: string[];        // ["Lazy loading", "Infinite scroll", "Scroll animations"]
};

type QuizScenario = {
  prompt: string;
  correctAnswer: ObserverType;
  wrongFeedback: Record<ObserverType, string>; // specific feedback per wrong choice
};

type ObserverAnatomyState = {
  view: "grid" | "expanded" | "quiz";
  expandedCard: ObserverType | null;
  quiz: {
    currentQuestion: number;  // 0..4
    answers: (ObserverType | null)[];
    showingFeedback: boolean;
    selectedAnswer: ObserverType | null;
  };
};
```

### Primitives & Props

| Primitive | Source | Props used |
|-----------|--------|------------|
| `AnatomyViewer` | Shared layout primitive (to be built) | `regions: Region[]`, `renderDiagram: () => ReactNode` -- wraps the 4-card grid; each card is a region |
| `DemoSandbox` | Shared primitive | Container for each mini live demo, provides consistent sizing and background |
| `motion.div` | framer-motion | Expansion/collapse animations using `layoutId` per card for shared layout animation |

**No external dependencies beyond framer-motion and React.**

### Edge Cases

- **Rapid clicking**: Debounce card expansion. If user clicks card B while card A is expanding, cancel A's expansion and expand B. Use `AnimatePresence` with `mode="wait"`.
- **Reduced motion**: All mini demos still update state (values change) but transitions are instant (`duration: 0`). Card expansion uses no spring -- just immediate layout shift.
- **Quiz re-take**: After completing 5 questions, show score and a "Retry" button that resets quiz state. Do not shuffle question order (consistent learning path).
- **Mobile (< 640px)**: Grid becomes single column (4 cards stacked). Expanded card takes full viewport width. Quiz answer buttons stack 2x2.
- **Keyboard**: Cards focusable with Tab, Enter to expand. Quiz buttons accessible. Escape to close expanded card.

### Cross-Lesson Connections

This is the **gateway lesson** for the entire section. It introduces all 4 observers at a surface level. The "Which Observer?" quiz validates that the reader can distinguish them before diving deep. The next 3 pairs (IO deep-dive + challenge, MO deep-dive + challenge, RO deep-dive + challenge) each assume the reader already knows what the observer does conceptually. PerformanceObserver is shown here for completeness but does not get its own deep-dive in this section (it appears in Section 7: Performance).

---

## api-intersection -- IntersectionObserver Explorable
**Format**: explorable | **Effort**: large

### Interaction State Machine

```
                    +---------------------+
                    |      IDLE           |
                    | scrollPos: 0        |
                    | thresholds: [0]     |
                    | rootMargin: "0px"   |
                    +---------------------+
                         |  scroll / drag margin / place threshold
                         v
                    +---------------------+
                    |    OBSERVING        |
                    | entries: IOEntry[]  |
                    | callbackLog: Log[]  |
                    +---------------------+
                       |             |
            drag margin handle    click element to
                       |           place threshold
                       v               v
              +----------------+   +------------------+
              | MARGIN_DRAGGING|   | THRESHOLD_PLACING|
              | axis: t/r/b/l  |   | targetEl: number |
              | value: number  |   | position: 0..1   |
              +----------------+   +------------------+
                       |               |
                       +-------+-------+
                               v
                    +---------------------+
                    |    OBSERVING        |
                    | (updated config)    |
                    +---------------------+
```

**State data:**
- `scrollPosition`: number (px from top of scroll container)
- `rootMargin`: `{ top: number; right: number; bottom: number; left: number }` (px)
- `thresholds`: number[] (0..1 values, user-placed)
- `entries`: per-element intersection data `{ ratio: number; isIntersecting: boolean; boundingClientRect: DOMRect }`
- `callbackLog`: `{ timestamp: number; elementIndex: number; ratio: number; isIntersecting: boolean }[]`
- `isDraggingMargin`: `{ active: boolean; side: "top" | "right" | "bottom" | "left" | null }`

### Visual Choreography

**Overall layout: two-column, 60/40 split.**
- Left (60%): the scroll viewport + elements.
- Right (40%): callback log + controls.

**Scroll viewport (left panel):**
- Container: 300px tall, 100% parent width, `var(--color-bg)` background, 2px solid `var(--color-border)` border, `var(--radius-2)` corners. `overflow-y: scroll` with custom scrollbar (thin, `var(--color-muted)` thumb).
- Inside the container: 5 colored blocks stacked vertically with 60px gaps between them. First block starts 320px from top (so it's initially just below the viewport).
- Each block: 100% container width minus 32px (16px padding each side), 120px tall, rounded `var(--radius-2)`.
  - Block colors (solid fills, high contrast):
    - Block 0: `oklch(65% 0.18 200)` (teal)
    - Block 1: `oklch(65% 0.18 140)` (green)
    - Block 2: `oklch(65% 0.18 300)` (purple)
    - Block 3: `oklch(65% 0.18 60)` (amber)
    - Block 4: `oklch(65% 0.18 25)` (red-orange)
  - Each block contains a label: "Element {n}" in `var(--font-mono)`, `var(--text-sm)`, white text.

**Intersection ratio bar (per block):**
- Positioned as a vertical bar on the LEFT edge of each block, 6px wide, full block height.
- Background: block color at 20% opacity.
- Fill: block color at 100% opacity, height = `intersectionRatio * 100%`, anchored at bottom, grows upward.
- Fill animation: perfectly synced to actual scroll position (no transition delay -- use `requestAnimationFrame` to read ratio from the real IO and set height directly). This is NOT spring-animated; it must track scroll 1:1.
- Ratio label: white text, `var(--font-mono)`, 11px, positioned at the top of the fill bar. Shows "0.00" to "1.00" with 2 decimal places.

**isIntersecting badge (per block):**
- Positioned top-right of each block, 28x28px circle.
- Not intersecting: `var(--color-error)` (`oklch(65% 0.2 25)`) background, "x" icon (8px, white).
- Intersecting: `var(--color-success)` (`oklch(60% 0.18 140)`) background, checkmark icon (8px, white).
- Transition between states: background-color 150ms ease-out. Scale from 0.85 to 1.0 on state change via `SPRING.snappy`.

**Threshold lines (on each block):**
- Each threshold renders as a horizontal dashed line across the full block width.
- Dash pattern: 4px dash, 4px gap, 1.5px stroke, block color.
- Label at right end: threshold value (e.g., "0.50"), `var(--font-mono)`, 10px, block color text.
- Default: single threshold at 0 (top edge of block). User can click anywhere on a block to place an additional threshold line at that vertical position (mapped to 0..1).
- Max 5 thresholds per element. Click an existing threshold line to remove it.

**rootMargin visualization:**
- A translucent overlay around the scroll container's visible area, INSIDE the scroll area.
- Color: `oklch(65% 0.15 200 / 0.12)` (teal, 12% opacity).
- Positive rootMargin: the overlay extends BEYOND the viewport boundary (e.g., +100px bottom means the teal zone extends 100px below the visible viewport edge).
- Negative rootMargin: the overlay shrinks INWARD from the viewport edge.
- Four drag handles, one per side: 12x40px (horizontal sides) or 40x12px (vertical sides) rounded pill, `oklch(65% 0.15 200)` fill, positioned at the midpoint of each rootMargin edge.
- Drag interaction: grab a handle, drag inward (negative) or outward (positive). Value snaps to 10px increments. Range: -150px to +250px. During drag: value tooltip appears next to cursor showing "rootMargin-top: +120px".
- Drag uses pointer events (not mouse events) for touch support. `SPRING.quick` on handle release to snap to final position.

**Callback log (right panel, top section):**
- Looks like a browser console: `var(--color-bg)` background, 1px `var(--color-border)` left border.
- Max height: 200px, overflow-y: auto (newest at bottom, auto-scrolls).
- Each entry: single line.
  - Timestamp: `var(--color-muted)`, `var(--font-mono)`, 10px. Format: "12:34:56.789".
  - Element badge: 8px circle filled with the block's color, inline before the text.
  - Text: `"El 2: ratio=0.47, isIntersecting=true"` in `var(--font-mono)`, `var(--text-xs)`.
  - `isIntersecting=true` in `var(--color-success)`. `isIntersecting=false` in `var(--color-error)`.
- New entries slide in from the right: `TRANSITION.enterItem` (200ms, easeOut).
- Clear log button: top-right of log panel, icon-only (trash), `var(--color-muted)`.

**Controls (right panel, below log):**
- Root margin numeric inputs: 4 number inputs (top, right, bottom, left) in a cross layout mimicking the CSS shorthand. `var(--font-mono)`, 48px wide each. Synced bidirectionally with the drag handles.
- Threshold quick-set buttons: "[0]", "[0, 0.5, 1]", "[0, 0.25, 0.5, 0.75, 1]", "Custom". Clicking a preset sets all elements' thresholds. "Custom" enables click-to-place on blocks.
- Active config display: a read-only code block showing the current `new IntersectionObserver(callback, { root, rootMargin, threshold })` with live values interpolated.

### Teaching Flow (First 60 Seconds)

1. Reader sees a 300px viewport with a hint of the first colored block peeking at the bottom. Right panel shows an empty callback log and controls with default values (rootMargin: 0px all sides, threshold: [0]).
2. They scroll down. The first block (teal) enters the viewport from below. Immediately: the ratio bar on the left edge starts filling upward, the badge flips from red X to green check, and a log entry appears: "El 0: ratio=0.12, isIntersecting=true".
3. They keep scrolling. The ratio bar fills to 1.00 as the block is fully visible. More log entries fire (at threshold 0, there's only one entry per crossing).
4. They notice the threshold preset buttons. They click "[0, 0.5, 1]". Dashed lines appear at the top, middle, and bottom of each block.
5. They scroll again. Now 3 separate callbacks fire per element as it crosses each threshold. The log fills up faster. They can see exactly WHEN each threshold triggers.
6. They notice the rootMargin drag handles (teal pills at the viewport edges). They grab the bottom handle and drag it downward (extending the zone). A teal overlay grows below the viewport. The label shows "+120px".
7. They scroll back up and scroll down again slowly. The first block triggers isIntersecting=true while it's still 120px BELOW the visible area. The callback fires EARLY. The log confirms it. Aha: "rootMargin makes the observer trigger before the element is visible."
8. They realize: `rootMargin: 200px` means "start lazy-loading images 200px before they scroll into view."

### Data & State Shape

```typescript
type BlockEntry = {
  index: number;
  color: string;
  ratio: number;          // 0..1, live from IO
  isIntersecting: boolean;
  thresholds: number[];   // user-placed, 0..1
};

type RootMargin = {
  top: number;    // px, can be negative
  right: number;
  bottom: number;
  left: number;
};

type CallbackLogEntry = {
  id: string;              // nanoid for React key
  timestamp: number;       // Date.now()
  elementIndex: number;
  ratio: number;
  isIntersecting: boolean;
};

type MarginDrag = {
  active: boolean;
  side: "top" | "right" | "bottom" | "left" | null;
  startValue: number;
  startPointer: number;   // clientX or clientY at drag start
};

type IntersectionExplorableState = {
  blocks: BlockEntry[];           // length 5
  rootMargin: RootMargin;
  thresholdPreset: "single" | "three" | "five" | "custom";
  callbackLog: CallbackLogEntry[];
  marginDrag: MarginDrag;
  scrollPosition: number;
};
```

### Primitives & Props

| Primitive | Source | Props used |
|-----------|--------|------------|
| `DemoSandbox` | Shared | Container wrapper providing consistent border, background, and padding for the entire explorable |
| `Dial` | Shared | Numeric rootMargin inputs -- each side uses a `Dial` with min/max/step for precise control |
| `Annotation` | Shared | Labels on the rootMargin zone ("rootMargin: +120px") and threshold lines ("0.50") |
| `MeasureLine` | Not used here (reserved for ResizeObserver) | -- |

**Internal components to build:**
- `ScrollViewport` -- the 300px scroll container with IO wired to real elements
- `IntersectionBlock` -- a single colored block with ratio bar, badge, threshold lines
- `RootMarginOverlay` -- the draggable translucent zone visualization
- `CallbackLog` -- the console-styled log panel
- `ThresholdPlacer` -- click-to-place interaction on blocks

### Edge Cases

- **Fast scroll skipping thresholds**: This is a TEACHING MOMENT, not a bug. When user scrolls fast and IO skips intermediate thresholds, the log should show the gap. Add a subtle "skipped" indicator (strikethrough on the missed threshold values) so the reader notices.
- **Too many log entries**: Cap at 200 entries. Oldest entries removed. Show a "-- 43 earlier entries cleared --" divider.
- **rootMargin + threshold interaction**: Changing rootMargin re-creates the IO instance (real API limitation). Show a brief flash on the log panel ("Observer re-created with new rootMargin") in `var(--color-muted)` to teach that rootMargin is set at construction time.
- **Mobile (< 640px)**: Switch to single-column stacked layout. Viewport: 250px tall. Controls and log below the viewport (tabbed: "Log" | "Config").
- **Reduced motion**: Ratio bars still update (they track scroll, not animated). Badge color transition instant. Log entries appear without slide animation.
- **Reader places 5+ thresholds**: Show a max-reached tooltip: "Max 5 thresholds per element. Click an existing line to remove it."
- **Zero-height element edge case**: Not modeled (all blocks are fixed 120px). But mention in a small annotation that IO handles zero-height elements.

### Cross-Lesson Connections

Feeds directly into **api-assignment-2** (IO Challenge Chain). Every concept introduced here -- rootMargin for pre-loading, thresholds for granular tracking, unobserve for cleanup -- becomes a challenge task. The rootMargin drag interaction specifically prepares for Challenge 2 (lazy images with rootMargin=200px). The fast-scroll threshold skipping prepares for understanding why IO is not a scroll listener replacement.

---

## api-assignment-2 -- IntersectionObserver Challenge Chain
**Format**: challenge-chain | **Effort**: medium

### Interaction State Machine

```
+---------------------+
|  CHALLENGE_SELECT   |
|  activeChallenge: 0 |
|  unlocked: [0]      |
+---------------------+
        | start challenge
        v
+---------------------+
|  EDITING            |
|  code: string       |
|  dirty: boolean     |
+---------------------+
    |   run tests    |  reset code
    v                v
+--------+     +-----------+
| TESTING|     |  EDITING  |
| running|     | (starter) |
+--------+     +-----------+
    |
    +------ pass ------+
    |                   v
    |           +----------------+
    |           | CHALLENGE_PASS |
    |           | nextUnlocked   |
    |           +----------------+
    |                   | continue
    |                   v
    |           +---------------------+
    |           |  CHALLENGE_SELECT   |
    |           |  activeChallenge: n+1|
    |           +---------------------+
    |
    +------ fail ------+
                        v
                +----------------+
                | CHALLENGE_FAIL |
                | errors: Test[] |
                | hint: string   |
                +----------------+
                    | edit code / reveal hint
                    v
                +---------------------+
                |  EDITING            |
                | (hint displayed)    |
                +---------------------+
```

### Visual Choreography

**Overall layout:**
- Full-width, single column. Progress bar at top: 4 segments. Completed = `var(--color-success)` fill. Current = `var(--color-accent)` pulsing outline. Locked = `var(--color-border)` dashed outline. Each segment has a label below: "1. Basic IO", "2. Lazy Images", "3. Infinite Scroll", "4. Scroll Animations".
- Below progress bar: the active challenge panel.

**Challenge panel:**
- Card: `var(--color-surface)` background, `var(--radius-3)` (12px) corners, `var(--shadow-2)`.
- Challenge title: `var(--font-mono)`, `var(--text-lg)`, `var(--color-text)`. E.g., "Challenge 2: Lazy Image Loading".
- Description: 2-3 sentences, `var(--text-base)`, `var(--color-muted)`. E.g., "These images have `data-src` attributes. Use IntersectionObserver with rootMargin to set their `src` 200px before they enter the viewport. Don't forget to clean up."
- Two-panel split below description (50/50):
  - **Left: Code editor** -- Monaco-style textarea with syntax highlighting (use a `<textarea>` with `var(--font-mono)`, `var(--color-bg)` background, or integrate a lightweight code highlighter). Starter code pre-filled. Editable lines marked with a left-border highlight (`var(--color-accent)` 2px). Read-only lines (HTML setup) grayed out.
  - **Right: Preview panel** -- a 280px-tall scrollable area showing the rendered HTML. This is an iframe sandbox OR a sandboxed div with the user's JS executing against the DOM.
- Below panels: "Run Tests" button (`var(--color-accent)` background, white text, `var(--radius-2)`, 40px tall) and "Reset" link (`var(--color-muted)`).

**Test results:**
- Pass: green bar slides in from right (`TRANSITION.enterCard`, 300ms). Checkmark icon + "All tests passed!" + specific test names with checkmarks.
- Fail: red bar slides in. Each failed test: X icon + test name + specific feedback. E.g., "FAIL: unobserve called after load -- observer is still watching loaded images." Feedback text in `var(--color-error)`.
- Hint system: after first failure, "Need a hint?" link appears. 3 progressive hints per challenge:
  - Hint 1: conceptual nudge ("Think about what rootMargin does to the observation zone")
  - Hint 2: API nudge ("The second argument to the constructor accepts { rootMargin }")
  - Hint 3: code pattern ("entry.target.src = entry.target.dataset.src; observer.unobserve(entry.target)")
- Each hint replaces the previous. Styled: `var(--color-surface-2)` background, left border 3px `oklch(65% 0.15 60)` (amber), 12px padding.

**Challenge completion:**
- Confetti-free. Green border pulses once around the card (`SPRING.gentle`). "Next Challenge" button appears with right arrow, sliding in from right.
- Progress bar segment fills with `var(--color-success)`, 400ms ease-out.

**Per-challenge specifics:**

1. **Basic IO**: Starter HTML has 5 `<div class="target">` elements in a scrollable area. Starter JS has an empty callback. Reader must: create IO, observe all 5, log `entry.target.id` when intersecting. Tests check: IO created, all 5 observed, log contains correct IDs.

2. **Lazy Images**: 8 `<img>` tags with `data-src` but no `src` (placeholder gray boxes). Reader must: IO with `rootMargin: "200px"`, set `src` from `data-src` on intersect, `unobserve` after. Tests check: rootMargin is "200px" (or "200px 0px"), src set correctly, unobserve called. **Key test**: "observer still watching loaded images" catches missing unobserve.

3. **Infinite Scroll**: A list of 20 items + a sentinel `<div id="sentinel">` at the bottom. Reader must: observe sentinel, on intersect add 10 more items, re-observe. Tests check: sentinel observed, items added on intersect, sentinel re-observed after DOM update.

4. **Scroll Animations**: 6 `<div class="animate-on-scroll">` elements. Reader must: observe each with threshold [0.2], add class `"visible"` when intersecting (ratio >= 0.2), add staggered delay based on element index. Tests check: class added at correct threshold, `transitionDelay` set per element (index * 100ms).

### Teaching Flow (First 60 Seconds)

1. Reader sees the progress bar with 4 challenges. Only "1. Basic IO" is unlocked (solid outline). Challenges 2-4 are dashed/locked.
2. Challenge 1 panel is open. Description: "Five elements are hiding below the fold. Create an IntersectionObserver that logs each element's ID when it enters the viewport."
3. Left panel shows starter code: the HTML is read-only (5 divs), the JS section has `// Your code here`. Right panel shows the 5 gray blocks in a scroll area.
4. Reader types: `const observer = new IntersectionObserver((entries) => { entries.forEach(e => { if (e.isIntersecting) console.log(e.target.id); }); });` then `document.querySelectorAll('.target').forEach(el => observer.observe(el));`.
5. They click "Run Tests." Tests execute: IO created (pass), 5 elements observed (pass), scroll simulation runs, IDs logged (pass). Green bar: "All tests passed!"
6. Progress bar fills segment 1 green. "Next Challenge" button appears. They click it.
7. Challenge 2 loads: lazy images. The preview shows 8 gray placeholder boxes. They now need to apply rootMargin and unobserve. The concepts from the IO explorable (previous stop) are now required.

### Data & State Shape

```typescript
type ChallengeId = "basic-io" | "lazy-images" | "infinite-scroll" | "scroll-animations";

type TestResult = {
  name: string;
  passed: boolean;
  feedback: string;      // specific feedback on failure
};

type HintLevel = 0 | 1 | 2 | 3; // 0 = no hint shown

type Challenge = {
  id: ChallengeId;
  title: string;
  description: string;
  starterHTML: string;    // read-only
  starterJS: string;      // editable starting code
  tests: TestDefinition[];
  hints: [string, string, string]; // 3 progressive hints
};

type IOChallengeChainState = {
  challenges: Challenge[];
  unlocked: Set<ChallengeId>;
  activeChallengeIndex: number;
  code: string;           // current editor content
  testResults: TestResult[] | null;
  testRunning: boolean;
  hintLevel: HintLevel;
  completed: Set<ChallengeId>;
};
```

### Primitives & Props

| Primitive | Source | Props used |
|-----------|--------|------------|
| `ChallengeRunner` | Shared layout primitive | `challenges: Challenge[]`, `onComplete`, progress bar, sequential unlock, hint system |

**Internal components to build:**
- `CodeEditor` -- syntax-highlighted editable textarea with line numbers, read-only regions. Uses `var(--font-mono)`, `var(--color-bg)` background.
- `PreviewPane` -- sandboxed scrollable area that executes reader's JS against the DOM. Must support scroll simulation for tests.
- `TestResultBar` -- slide-in pass/fail summary with per-test feedback.

### Edge Cases

- **Infinite loop in user code**: The sandbox must have a max execution time (2 seconds). If exceeded, show: "Your code took too long to execute. Check for infinite loops." `var(--color-error)` border.
- **User removes starter HTML**: The reset button restores both HTML and JS to starter state. Confirm before reset if code is dirty.
- **Preview scroll state**: Preview retains scroll position between test runs so the reader can verify visually.
- **Console.log output**: Route `console.log` from the sandbox to a small console drawer below the preview (collapsible, 3 lines visible by default).
- **Mobile (< 640px)**: Code editor and preview stack vertically (editor on top, preview below). Tabs to switch could also work but stacking preserves both visible.

### Cross-Lesson Connections

Directly follows **api-intersection**. Every concept from the explorable is tested:
- Challenge 1: basic observe/callback pattern (from expanded card details)
- Challenge 2: rootMargin (from the drag interaction)
- Challenge 3: observe/unobserve lifecycle (from watching the callback log)
- Challenge 4: thresholds (from the threshold placer)

The unobserve emphasis here prepares for the MO section, where `disconnect()` before modification is equally critical.

---

## api-mutation -- MutationObserver Explorable
**Format**: explorable | **Effort**: medium

### Interaction State Machine

```
                     +----------------------+
                     |    INITIAL           |
                     | config: ALL_OFF      |
                     | tree: initial DOM    |
                     | log: []              |
                     +----------------------+
                          |  click action button
                          v
                  +-----------------------+
                  |   MUTATION_FIRED      |
                  | config matches?       |
                  +-----------------------+
                   /                  \
             config OFF            config ON
                /                      \
               v                        v
   +-------------------+     +-------------------+
   |  NOTHING_LOGGED   |     |  RECORD_LOGGED    |
   |  nudge appears    |     |  record in log    |
   +-------------------+     +-------------------+
         |                          |
         | toggle config            | expand record
         v                          v
   +-------------------+     +-------------------+
   |  CONFIG_CHANGED   |     | RECORD_EXPANDED   |
   |  MO re-created    |     | fields visible    |
   +-------------------+     +-------------------+
```

**State data:**
- `config`: `{ childList: boolean; attributes: boolean; characterData: boolean; subtree: boolean; attributeOldValue: boolean; characterDataOldValue: boolean; attributeFilter: string[] | null }`
- `domTree`: tree structure representing the live DOM
- `mutationLog`: `MutationRecordEntry[]`
- `nudge`: `{ visible: boolean; message: string } | null`
- `expandedRecord`: `number | null` (index in log)

### Visual Choreography

**Layout: two-panel, 55/45 split.**
- Left (55%): interactive DOM tree + action buttons.
- Right (45%): config toggles (top) + mutation log (bottom).

**Config toggles (right panel, top, 120px tall):**
- 6 toggle switches in a vertical list, each on its own row.
- Each toggle: label in `var(--font-mono)` `var(--text-sm)`, plus a 36x20px toggle switch.
- ALL START OFF. Switch track: `var(--color-border)`. Switch thumb: 16x16px circle.
- Toggle ON: track fills with the observer color `oklch(65% 0.15 300)` (purple, `--diagram-layer-2`). Thumb slides right via `SPRING.snappy` (stiffness 280, damping 22).
- When a toggle is turned on: a subtle 200ms pulse on the toggle (scale 1.0 -> 1.05 -> 1.0) confirming the change.
- Below toggles: a read-only code block showing the current config object, live-updating. `var(--font-mono)`, `var(--text-xs)`, `var(--color-surface-2)` background.

**DOM tree (left panel, upper 60%):**
- Visual tree rendering: indented nodes, each node is a rounded rect (auto-width, 28px tall).
  - Element nodes: `var(--color-surface-2)` background, tag name in `oklch(65% 0.15 300)` (purple), attributes in `oklch(65% 0.15 60)` (amber). E.g., `<div class="card">`.
  - Text nodes: `var(--color-surface)` background, italic text content in `var(--color-muted)`, max 30 chars truncated.
- Tree lines: 1px solid `var(--color-border)` connecting parent to children (L-shaped connectors).
- Nodes are expandable/collapsible: click the triangle toggle (12px, `var(--color-muted)`) to collapse children.
- Initial tree:
  ```
  <div id="root">
    <ul class="list">
      <li class="item">Item 1</li>
      <li class="item">Item 2</li>
    </ul>
    <p id="text">Hello world</p>
  </div>
  ```
- When a mutation occurs on a node: the node flashes with a 300ms highlight. Added nodes: green flash (`var(--color-success)` at 30% opacity background). Removed nodes: red flash (`var(--color-error)` at 30% opacity) then fade out. Attribute changes: amber flash (`oklch(65% 0.15 60)` at 30% opacity). Text changes: purple flash.

**Action buttons (left panel, below tree, 6 buttons in 2x3 grid):**
- Each button: 120x36px, `var(--color-surface-2)` background, `var(--radius-2)`, `var(--font-mono)` `var(--text-xs)`.
- Buttons:
  - "Add Child" -- adds a `<li>` to the `<ul>`
  - "Remove Child" -- removes the last `<li>`
  - "Add Deep Child" -- adds a `<span>` inside the first `<li>` (tests subtree)
  - "Change Attribute" -- toggles `class` on the `<ul>` between "list" and "list active"
  - "Edit Text" -- changes the `<p>` text content to a random phrase
  - "Change Data Attr" -- sets `data-count` on root (tests attributeFilter)
- Button hover: lift 1px, `var(--shadow-1)`.
- Button click: depress 1px (translateY +1px, 80ms).

**Nudge system:**
- When an action fires but nothing is logged (config mismatch): a nudge panel slides up from the bottom of the left panel.
- Nudge: `var(--color-surface-2)` background, 3px left border in `oklch(65% 0.15 60)` (amber), 12px padding.
- Text: a question, not an answer. E.g., "The observer didn't catch that child addition. Which config option watches for child changes?" `var(--color-muted)` text, `var(--text-sm)`.
- Nudge has a subtle entrance: `TRANSITION.enterCard` (300ms, easeOut), slide up 8px.
- Nudge auto-dismisses after 6 seconds OR when the reader toggles a config option.

**Mutation log (right panel, below config, fills remaining height):**
- Chrome DevTools-style. `var(--color-bg)` background.
- Each MutationRecord entry: collapsed by default to a single summary line.
  - Summary: `"childList: <ul.list>"` or `"attributes: <ul.list> class"` in `var(--font-mono)`, `var(--text-xs)`.
  - Left margin: a colored dot (6px) matching mutation type: green for childList add, red for childList remove, amber for attributes, purple for characterData.
  - Click to expand: shows all MutationRecord fields:
    - `type`: string, bold.
    - `target`: rendered as the DOM node tag with color.
    - `addedNodes` / `removedNodes`: NodeList rendered as tags. Empty = `[]` in `var(--color-muted)`.
    - `previousSibling` / `nextSibling`: tag or null.
    - `attributeName`: string or null.
    - `oldValue`: string or null. When null AND `attributeOldValue` is off: shows `null` with a small "(enable attributeOldValue)" hint in `var(--color-muted)` italic.
  - Expanded view uses `TRANSITION.collapse` (300ms, easeInOut) for height animation.
- Max 50 entries. Oldest removed with a divider.

### Teaching Flow (First 60 Seconds)

1. Reader sees a DOM tree on the left and 6 config toggles on the right -- ALL off. Below the tree: 6 action buttons. The mutation log is empty.
2. They click "Add Child". A new `<li>` node appears in the tree with a green flash. But the mutation log... is empty. Nothing logged.
3. A nudge slides up: "The observer didn't catch that child addition. Which config option watches for child changes?"
4. Reader looks at the toggles. They turn on "childList". The config code block updates: `{ childList: true }`.
5. They click "Add Child" again. This time: green flash on tree AND a new entry in the log: `"childList: <ul.list>"`. They expand it and see `addedNodes: [<li>]`, `target: <ul>`.
6. They try "Add Deep Child" (adds a `<span>` inside the first `<li>`). Green flash on tree. But the log... empty again.
7. They realize: childList only watches DIRECT children of the observed node. They toggle "subtree" on.
8. They try "Add Deep Child" again. Now it logs. Aha: subtree extends observation to all descendants.
9. They click "Change Attribute". Log shows `"attributes: <ul.list>"` -- but `oldValue: null`. They turn on "attributeOldValue". Repeat. Now `oldValue: "list"` appears.
10. Each discovery is driven by NEEDING the config option, not being told about it.

### Data & State Shape

```typescript
type DOMNode = {
  id: string;
  tag: string;
  attributes: Record<string, string>;
  textContent?: string;
  children: DOMNode[];
  isCollapsed: boolean;
};

type MutationConfig = {
  childList: boolean;
  attributes: boolean;
  characterData: boolean;
  subtree: boolean;
  attributeOldValue: boolean;
  characterDataOldValue: boolean;
  attributeFilter: string[] | null;
};

type MutationRecordEntry = {
  id: string;
  type: "childList" | "attributes" | "characterData";
  targetId: string;         // DOMNode id
  targetDisplay: string;    // "<ul.list>"
  addedNodes: string[];     // tag display strings
  removedNodes: string[];
  previousSibling: string | null;
  nextSibling: string | null;
  attributeName: string | null;
  oldValue: string | null;
};

type NudgeState = {
  visible: boolean;
  message: string;
  dismissTimer: ReturnType<typeof setTimeout> | null;
};

type MutationExplorableState = {
  config: MutationConfig;
  domTree: DOMNode;                // root node
  mutationLog: MutationRecordEntry[];
  expandedRecordIndex: number | null;
  nudge: NudgeState;
};
```

### Primitives & Props

| Primitive | Source | Props used |
|-----------|--------|------------|
| `DemoSandbox` | Shared | Container wrapper for the full explorable |
| `DialToggle` | Shared | Each config toggle switch -- boolean on/off with label |

**Internal components to build:**
- `DOMTreeView` -- recursive tree renderer with expand/collapse, node highlighting on mutation, L-shaped connector lines
- `ActionButton` -- styled button with depress animation
- `MutationRecordCard` -- expandable record with DevTools-style property coloring
- `NudgePanel` -- slide-up hint panel with auto-dismiss

### Edge Cases

- **All toggles off at start**: This IS the design. First action always produces nothing, triggering the first nudge. Do not show a "turn on options first" message -- the failure is the teacher.
- **Observer recreation on config change**: Real MO requires `disconnect()` + re-`observe()` when config changes. Show a brief "(observer re-created)" flash in the log when toggles change, teaching that config is set at observe-time.
- **subtree without childList/attributes**: If reader turns on subtree alone without any of childList/attributes/characterData, nudge: "subtree extends observation depth, but you still need to tell the observer WHAT to watch (childList, attributes, or characterData)."
- **attributeFilter with attributes off**: If reader hasn't turned on `attributes`, attributeFilter has no effect. Nudge accordingly.
- **Rapid button clicks**: Debounce action buttons at 300ms. Queue mutations if clicked faster.
- **Mobile (< 640px)**: Panels stack vertically. Tree on top (collapsible), config + log below in tabs.
- **Reduced motion**: Node flash highlights use background-color change without animation (instant switch, then 500ms hold, then instant return). No slide on nudge.

### Cross-Lesson Connections

Feeds directly into **api-assignment-3** (MO Challenge Chain). The discovery-through-need pattern means the reader has internalized WHICH config does WHAT before they're asked to configure it in challenges. The "disconnect before modify" pattern (critical for Challenge 3's infinite loop) is foreshadowed by the "(observer re-created)" flash when config changes. The expanded MutationRecord view teaches the exact field names needed for Challenge 4's undo system.

---

## api-assignment-3 -- MutationObserver Challenge Chain
**Format**: challenge-chain | **Effort**: medium

### Interaction State Machine

```
Same structure as api-assignment-2 (IOChallengeChain) with 4 challenges.
State machine identical to IOChallengeChain but with MO-specific challenge content.

Additional state for Challenge 3:
+---------------------+
|  EDITING            |
+---------------------+
     | run tests
     v
+---------------------+
|  TESTING            |
+---------------------+
     | infinite loop detected (> 500 iterations)
     v
+---------------------+
| LOOP_DETECTED       |
| iterations: number  |
| callStack: string[] |
+---------------------+
     | dismiss
     v
+---------------------+
|  EDITING            |
| hint: "disconnect"  |
+---------------------+
```

### Visual Choreography

**Identical layout to IOChallengeChain** (progress bar, challenge panel, code editor + preview split). Same dimensions, colors, interaction patterns. Only the challenge content differs.

**Per-challenge specifics:**

1. **Watch Class Changes**: Preview shows a `<div>` whose class toggles every 2s between "card" and "card highlighted". Reader must: create MO with `{ attributes: true, attributeFilter: ["class"] }`, log each class change. Code editor has starter HTML (the toggling div) + empty JS. Tests: MO created, attributeFilter is `["class"]`, callback logs class values.

2. **Auto-Link URLs**: Preview shows a `<div contenteditable>` with some text. When user types a URL (e.g., "https://example.com"), it should auto-wrap in an `<a>` tag. Reader must: observe characterData + subtree, detect URL patterns in text changes, wrap them. Tests: URL detection regex works, `<a>` tags created, href set correctly.

3. **Prevent Infinite Loops**: Preview shows a list. MO watches for new `<li>` additions and should add a timestamp span to each new `<li>`. **THE TRAP**: if reader modifies DOM inside the callback without disconnecting, MO fires again, adding another timestamp, which fires again...
   - **Safety mechanism**: The sandbox counts callback invocations. At 500 iterations, it hard-stops execution and shows a dramatic but friendly error:
     - Preview panel border flashes `var(--color-error)` 3 times (200ms each).
     - Error overlay: `var(--color-error-muted)` background, centered text: "Infinite mutation loop detected after 500 iterations." Below: "Your callback is modifying the DOM, which triggers the observer again. How can you pause observation while modifying?"
     - The first hint auto-reveals: "observer.disconnect() pauses observation. observer.observe() resumes it."
   - Correct solution: `disconnect()` before DOM modification, `observe()` after. Tests verify: disconnect called before modification, observe called after, no loop.

4. **DOM Undo System**: The boss challenge. Preview shows a rich interactive area (buttons to add/remove/modify elements). Reader must: record all MutationRecords into a stack, implement an "Undo" button that reverses the last mutation.
   - Undo logic:
     - `childList` with `addedNodes` -> remove those nodes
     - `childList` with `removedNodes` -> re-insert those nodes (using `nextSibling` for correct position)
     - `attributes` -> set attribute back to `oldValue` (requires `attributeOldValue: true`)
     - `characterData` -> set textContent back to `oldValue`
   - Tests: undo correctly reverses each mutation type, undo stack decrements, multiple undos in sequence work.
   - Preview has a visible "Undo Stack" counter (badge showing depth, e.g., "3") that the reader's code must update.

### Teaching Flow (First 60 Seconds)

1. Reader sees 4 challenges, only #1 unlocked: "Watch Class Changes."
2. Preview shows a card that alternates between normal and highlighted every 2s. Challenge: "Log each class change to the console."
3. Reader writes MO with attributes: true. They run tests -- passes, but a bonus test notes: "Your observer watches ALL attributes. Can you narrow it to just class?" They add `attributeFilter: ["class"]` -- fully passes.
4. Challenge 2 unlocks. They tackle auto-linking. Harder -- requires characterData + subtree + regex + DOM modification. Hints guide toward the URL regex and wrapping logic.
5. Challenge 3 is where it gets interesting. They write a callback that adds a `<span>` to new `<li>` elements. They run it. After a moment, the preview flashes red -- "Infinite mutation loop detected." They experience the footgun firsthand.
6. First hint auto-shows: disconnect pattern. They add `observer.disconnect()` before modification and `observer.observe(target, config)` after. Tests pass. This lesson sticks because they FELT the loop.

### Data & State Shape

```typescript
type MOChallengeId = "class-watch" | "auto-link" | "prevent-loop" | "undo-system";

type MOChallenge = {
  id: MOChallengeId;
  title: string;
  description: string;
  starterHTML: string;
  starterJS: string;
  tests: TestDefinition[];
  hints: [string, string, string];
  // Challenge 3 specific:
  maxCallbackIterations?: number;  // 500
  loopErrorMessage?: string;
};

type MOChallengeChainState = {
  challenges: MOChallenge[];
  unlocked: Set<MOChallengeId>;
  activeChallengeIndex: number;
  code: string;
  testResults: TestResult[] | null;
  testRunning: boolean;
  hintLevel: HintLevel;
  completed: Set<MOChallengeId>;
  // Challenge 3 specific:
  loopDetected: boolean;
  loopIterationCount: number;
  // Challenge 4 specific:
  undoStackDepth: number;
};
```

### Primitives & Props

| Primitive | Source | Props used |
|-----------|--------|------------|
| `ChallengeRunner` | Shared layout primitive | Same as IOChallengeChain -- sequential unlock, progress, hints |

**Internal components to build (shared with IOChallengeChain where possible):**
- `CodeEditor` -- reuse from api-assignment-2
- `PreviewPane` -- extended with loop detection counter (maxIterations prop) and DOM mutation sandbox
- `LoopErrorOverlay` -- the dramatic error display for Challenge 3
- `UndoStackBadge` -- small counter badge for Challenge 4's undo depth

### Edge Cases

- **Challenge 3 infinite loop must not freeze the browser**: The sandbox intercepts `MutationObserver` constructor and wraps the callback with an invocation counter. At `maxIterations` (500), it throws a custom `LoopDetectedError` that the sandbox catches. Real browser MO is never used directly.
- **Challenge 4 undo with multiple simultaneous mutations**: A single MO callback can receive multiple MutationRecords. The undo button should reverse ALL records from the last callback invocation (batch undo), not record-by-record.
- **Challenge 4 re-insertion position**: When undoing a `removedNodes` mutation, the `nextSibling` from the original record is needed for correct `insertBefore`. If `nextSibling` was also removed, fall back to `appendChild`. Test for this edge case.
- **Code persists across test runs**: User's code is preserved when they re-run tests. Reset button clears to starter.
- **Challenge 2 URL regex**: Accept multiple URL patterns (http, https, with/without www). Hint 2 should provide a reasonable regex.

### Cross-Lesson Connections

Follows **api-mutation**. The config discovery from the explorable maps directly:
- Challenge 1 requires `attributes` + `attributeFilter` (discovered via the "Change Attribute" button)
- Challenge 2 requires `characterData` + `subtree` (discovered via "Edit Text" and "Add Deep Child")
- Challenge 3 teaches `disconnect()`/`observe()` lifecycle (foreshadowed by config-change recreation)
- Challenge 4 requires understanding every MutationRecord field (learned by expanding records in the log)

The disconnect-before-modify pattern from Challenge 3 parallels the unobserve-after-load pattern from api-assignment-2, reinforcing the principle: observers need lifecycle management.

---

## api-resize -- ResizeObserver Explorable
**Format**: explorable | **Effort**: medium

### Interaction State Machine

```
                   +-------------------------+
                   |      IDLE               |
                   | containerSize: initial   |
                   | layout: "horizontal"     |
                   +-------------------------+
                        |  drag resize handle
                        v
                   +-------------------------+
                   |     RESIZING            |
                   | containerSize: {w, h}   |
                   | callbackCount: number   |
                   +-------------------------+
                        |  release handle
                        v
                   +-------------------------+
                   | LAYOUT_RESOLVED         |
                   | layout: computed        |
                   | metrics: BoxSize        |
                   +-------------------------+
                        |
            +-----------+-----------+
            |                       |
     resize browser window    toggle comparison
            v                       v
   +------------------+   +---------------------+
   | VIEWPORT_RESIZE  |   | COMPARISON_MODE     |
   | both respond     |   | roVersion: visible  |
   | (aha moment)     |   | mqVersion: visible  |
   +------------------+   +---------------------+
```

### Visual Choreography

**Overall layout: stacked. Comparison is the key interaction.**

**Main demo area (top, 400px tall initially):**
- A resizable container: `var(--color-surface)` background, `var(--radius-3)` corners, `var(--shadow-2)`, `overflow: hidden`.
- Resize handle: bottom-right corner, 20x20px area with a diagonal grip icon (3 diagonal lines, `var(--color-muted)`). The handle has `cursor: nwse-resize`. Additionally, the right and bottom edges (last 8px) are draggable for single-axis resize.
- The container's `resize: both` CSS property is NOT used (too small a handle). Instead, implement custom pointer-event-based resize with visual grip.
- Initial size: 680x320px (shows horizontal layout).
- Min size: 200x150px. Max size: 900x500px.

**Card component inside the container (the RO-driven layout):**
- This card adapts its layout based on its CONTAINER width (not viewport):
  - **> 600px (horizontal)**: Image placeholder (180x120px, `oklch(65% 0.15 200 / 0.15)` with a mountain icon, rounded `var(--radius-2)`) on the left. Title ("Responsive Card", `var(--font-sans)`, `var(--text-xl)`, `var(--color-text)`) + body text (2 sentences, `var(--text-sm)`, `var(--color-muted)`) + a tag row (3 pills) on the right. Flexbox row.
  - **300-600px (vertical)**: Image moves to top (full width, 140px tall). Title + body below. Flexbox column.
  - **< 300px (compact)**: Image hidden (display: none). Title only, truncated with ellipsis. Body hidden. Tags hidden.
- Layout transitions: width/height changes on inner elements use `TRANSITION.collapse` (300ms, easeInOut). Opacity transitions on appearing/disappearing elements: `DURATION.fast` (200ms).
- Current layout label: small badge top-right of the card: "horizontal", "vertical", or "compact" in `var(--font-mono)`, `var(--text-xs)`, `oklch(65% 0.15 200)` text on `oklch(65% 0.15 200 / 0.15)` background.

**Callback counter (top-right of main demo, fixed position):**
- Circle badge, 36px diameter, `var(--color-surface-2)` background, `var(--color-border)` border.
- Number inside: callback count, `var(--font-mono)`, `var(--text-sm)`.
- On each callback: number increments, badge briefly scales to 1.15 via `SPRING.snappy` then returns.
- During rapid resize: counter climbs visibly fast (every pixel of change). This is intentional -- teaches the "fires on every change" behavior.
- Below the badge: "callbacks" label, `var(--text-xs)`, `var(--color-muted)`.

**Side panel (right, 240px wide, fixed alongside main demo):**
- Shows live measurement values updating in real-time:
  - `contentBoxSize`: `{ inlineSize: 640, blockSize: 280 }` -- updating numbers in `var(--font-mono)`, values pulse `var(--color-accent)` briefly on change.
  - `borderBoxSize`: `{ inlineSize: 680, blockSize: 320 }` -- same style.
  - `contentRect`: `{ width, height, top, left }` -- same style.
- Property names in `var(--color-muted)`, values in `var(--color-text)`.
- When padding/border is visible (toggled via a checkbox): the difference between contentBoxSize and borderBoxSize is highlighted with a colored connector line and delta label (e.g., "+40px padding+border").

**Comparison section (below main demo, separated by 32px):**
- Two side-by-side containers, each 340px wide, 200px tall:
  - Left: "ResizeObserver version" label. The same card component, driven by RO.
  - Right: "Media Query version" label. Identical card, but layout changes driven by `@media` width breakpoints.
- Both containers are NOT individually resizable. Instead:
  - A shared width slider below both: range 200px to 700px, affects ONLY the containers' width (not the browser window).
  - The browser window resize affects the media query version (because it uses viewport media queries) but NOT the RO version (because RO watches element size).
- **The aha moment**: Drag the shared slider to 250px. RO version goes compact. MQ version stays horizontal (viewport is still wide). Then resize the browser window narrow. MQ version ALSO goes compact. But the RO version was already there. Label appears: "RO responds to element size. MQ responds to viewport size."
- Highlight difference: when layouts diverge, a subtle `var(--color-error)` 2px border appears on the MQ container with "Doesn't respond to container size" annotation.

### Teaching Flow (First 60 Seconds)

1. Reader sees a large card in a resizable container. The card shows horizontal layout (image left, text right). A grip handle is visible at the bottom-right corner.
2. They grab the handle and drag left. The container shrinks. At ~580px, the card layout snaps to vertical (image top, text bottom). The transition is smooth. The layout badge changes to "vertical."
3. They keep dragging. At ~290px: compact mode. Image disappears. Only title remains. Badge: "compact."
4. They notice the callback counter in the top-right: it reads "347." It fired for every single pixel. They think: "That's a lot of callbacks."
5. They look at the side panel: contentBoxSize updates live as they drag. They see exact dimensions.
6. They scroll down to the comparison section. Two identical cards side by side. They drag the shared width slider to 300px. The RO version goes vertical. The MQ version... stays horizontal. "Doesn't respond to container size" label appears.
7. They resize their browser window instead. Now the MQ version ALSO goes vertical. Both match. They resize the browser back but drag the slider small again. RO version is compact; MQ version is horizontal. The difference clicks: RO watches the element; MQ watches the viewport.
8. They realize: for components that live inside variable-width containers (sidebars, grids, panels), only RO gives correct responsive behavior.

### Data & State Shape

```typescript
type CardLayout = "horizontal" | "vertical" | "compact";

type BoxSizeMeasurement = {
  inlineSize: number;
  blockSize: number;
};

type ContentRect = {
  width: number;
  height: number;
  top: number;
  left: number;
};

type ResizeExplorableState = {
  containerSize: { width: number; height: number };
  cardLayout: CardLayout;
  callbackCount: number;
  measurements: {
    contentBoxSize: BoxSizeMeasurement;
    borderBoxSize: BoxSizeMeasurement;
    contentRect: ContentRect;
  };
  isResizing: boolean;
  showPaddingBorder: boolean;  // toggle for padding/border visualization
  // Comparison section:
  comparisonSliderWidth: number;  // 200..700
  roLayout: CardLayout;
  mqLayout: CardLayout;
  layoutsDiverge: boolean;
};
```

### Primitives & Props

| Primitive | Source | Props used |
|-----------|--------|------------|
| `DemoSandbox` | Shared | Container for the full explorable |
| `MeasureLine` | Shared | Shows dimension labels on the card: width and height with arrows. Used in the side panel to annotate contentBoxSize vs borderBoxSize difference. |
| `Annotation` | Shared | Labels on comparison containers ("Doesn't respond to container size"), layout badge ("horizontal" / "vertical" / "compact") |

**Internal components to build:**
- `ResizableContainer` -- custom resize handle implementation using pointer events, min/max constraints, grip visual
- `ResponsiveCard` -- the card component with 3 layout modes, accepting width as prop (not using media queries)
- `MediaQueryCard` -- identical card but using `@media` queries for layout (for comparison)
- `MeasurementPanel` -- live-updating measurement values with pulse animation on change
- `ComparisonSlider` -- shared width slider controlling both comparison containers

### Edge Cases

- **Resize beyond min/max**: Clamp at 200x150 min, 900x500 max. Handle cursor changes to indicate limit reached.
- **Callback count overflow**: Reset counter with a "(reset)" link when it exceeds 9999. The high count is a teaching tool, not a problem.
- **Comparison section browser resize**: The comparison containers must remain at the slider-controlled width regardless of viewport changes. Use fixed pixel widths, not percentages.
- **Layout transition during drag**: Use `TRANSITION.collapse` for smooth layout shifts, but if reduced motion is on, transitions are instant. The layout switch itself (flexbox direction change) should not cause content to jump.
- **Mobile (< 640px)**: Main demo container takes full width, max-height 260px. Comparison containers stack vertically (full width each). The slider still works but controls width clamped to viewport width.
- **Touch resize**: Handle touch events for the resize grip. Use `touch-action: none` on the grip element.

### Cross-Lesson Connections

Feeds directly into **api-assignment-4** (RO Challenge Chain). The three layout modes (horizontal/vertical/compact) map to Challenge 1 (data-columns attribute). The callback counter teaches the need for debouncing (Challenge 2 auto-truncation). The comparison with media queries motivates Challenge 4 (container-query polyfill). The live measurement panel teaches contentRect vs borderBoxSize, needed for Challenge 3 (canvas redraw using exact dimensions).

---

## api-assignment-4 -- ResizeObserver Challenge Chain
**Format**: challenge-chain | **Effort**: medium

### Interaction State Machine

```
Same structure as IOChallengeChain and MOChallengeChain: 4 sequential challenges,
progressive unlock, same state machine.

Unique addition: the preview panel is RESIZABLE.

+-------------------+
|    EDITING        |
+-------------------+
   |           |
   |     drag preview edge
   |           v
   |    +------------------+
   |    | PREVIEW_RESIZING |
   |    | width: number    |
   |    +------------------+
   |           |  release
   |           v
   |    +-------------------+
   +--->|    EDITING        |
        | preview at new w  |
        +-------------------+
```

### Visual Choreography

**Layout identical to IOChallengeChain and MOChallengeChain** with one critical addition: the preview panel has a draggable LEFT edge for resizing.

**Resizable preview panel:**
- The preview panel (right side of the 50/50 split) has a 6px-wide drag handle on its left edge.
- Handle: `var(--color-border)` with 3 horizontal dots centered vertically. Cursor: `ew-resize`.
- Drag left = wider preview, narrower editor. Drag right = narrower preview, wider editor.
- Min preview width: 160px. Min editor width: 240px.
- During drag: a live width label appears above the preview: "Preview: 420px" in `var(--font-mono)`, `var(--text-xs)`, `var(--color-muted)`.
- The resizable preview is ESSENTIAL because readers need to test their RO code at different container sizes.

**Per-challenge specifics:**

1. **Data Columns**: Preview shows a `<div class="container">` with 12 child items (colored squares in a CSS Grid). Reader must: observe the container, set `data-columns="1"` when width < 300, `"2"` when 300-600, `"3"` when > 600. CSS in the starter uses `[data-columns]` attribute selectors to set grid-template-columns. Tests: observe called, data-columns set correctly at each breakpoint, reader drags preview to verify 1/2/3 columns.

2. **Auto-Truncating Text**: Preview shows a `<p>` with long text inside a container. Reader must: observe the container, measure text overflow (scrollWidth > clientWidth), truncate with "..." and add a `title` attribute with full text. Tests: truncation applied when text overflows, title set, text restores when container grows.

3. **Responsive Canvas Chart**: Preview shows a `<canvas>` element inside the container. Reader must: observe the container, resize the canvas (width/height attributes, NOT CSS), redraw a simple bar chart (3 bars, proportional to canvas width). Tests: canvas dimensions match container, bars redraw proportionally, no stretching/blurring.

4. **Container Query Polyfill**: The boss challenge. Preview shows a parent container with a child card (like the explorable's ResponsiveCard). Reader must: observe the parent, read its width from the RO entry, apply child styles from JS based on width breakpoints (horizontal/vertical/compact). Tests: layout changes at correct breakpoints, styles applied via JS (not media queries), works at any container width.

### Teaching Flow (First 60 Seconds)

1. Reader sees 4 challenges, only #1 unlocked: "Dynamic Columns."
2. Preview shows 12 colored squares in a 3-column grid. The preview panel has a drag handle on its left edge.
3. Challenge description: "Use ResizeObserver to set a data-columns attribute on the container. CSS handles the rest."
4. Starter code shows the CSS (`[data-columns="1"] { grid-template-columns: 1fr; }` etc.) and HTML. JS section is empty.
5. Reader writes RO code: observe container, check entry.contentRect.width, set dataset.columns.
6. They run tests. First test passes (observer created), second fails: "data-columns not set on container."
7. They realize they need to set the attribute inside the callback. They fix it, run again. Passes at current width.
8. They drag the preview handle to make it narrow. The grid switches to 1 column. They drag wide: 3 columns. The reader physically verifies their RO works across sizes.
9. All tests pass. Next challenge unlocks.

### Data & State Shape

```typescript
type ROChallengeId = "data-columns" | "auto-truncate" | "responsive-canvas" | "container-polyfill";

type ROChallenge = {
  id: ROChallengeId;
  title: string;
  description: string;
  starterHTML: string;
  starterCSS: string;    // some challenges include CSS
  starterJS: string;
  tests: TestDefinition[];
  hints: [string, string, string];
};

type ROChallengeChainState = {
  challenges: ROChallenge[];
  unlocked: Set<ROChallengeId>;
  activeChallengeIndex: number;
  code: string;
  testResults: TestResult[] | null;
  testRunning: boolean;
  hintLevel: HintLevel;
  completed: Set<ROChallengeId>;
  previewWidth: number;       // draggable preview width
  isResizingPreview: boolean;
};
```

### Primitives & Props

| Primitive | Source | Props used |
|-----------|--------|------------|
| `ChallengeRunner` | Shared layout primitive | Same as other challenge chains |

**Internal components (reuse from IO/MO challenge chains where possible):**
- `CodeEditor` -- reuse, add CSS tab support for challenges with starter CSS
- `ResizablePreviewPane` -- extends PreviewPane with a draggable left edge. New primitive specific to RO challenges.
- `TestResultBar` -- reuse from IOChallengeChain

### Edge Cases

- **Initial RO callback**: RO fires immediately on `observe()` with the initial size. Challenge 1 test should verify the reader handles this (data-columns set before any resize). If they only handle it inside a resize check, the initial render has no columns attribute.
- **Canvas blurring on resize**: Challenge 3 must test that canvas.width and canvas.height (attributes, not CSS) are set. If reader only sets CSS width/height, the canvas stretches and blurs. Test checks: `canvas.width === container.clientWidth`.
- **Preview resize during test run**: Tests should snapshot the preview size at test start and not be affected by resizing mid-test.
- **Challenge 4 style application**: Reader must apply styles via JS (element.style.flexDirection, etc.), not by toggling CSS classes with media queries. Tests verify: inline styles present, no media query usage detected.
- **Mobile (< 640px)**: Preview resize handle is less discoverable on touch. Add a "Resize me!" annotation arrow on first visit. Editor and preview stack vertically with a height-resize handle instead.

### Cross-Lesson Connections

Final stop in the section. Completes the observer trifecta: IO for visibility (assignment 2), MO for DOM changes (assignment 3), RO for element size (assignment 4). The container-query polyfill in Challenge 4 is the capstone -- it combines RO knowledge with practical CSS layout, showing that observers are not just for detection but for driving UI behavior. This prepares the reader for Section 5 (App State), where observer-driven state patterns scale to full applications.

The pattern across all three challenge chains is consistent: challenge 1 is basic setup, challenge 2 applies a practical use case, challenge 3 teaches a footgun (unobserve, infinite loops, initial size), challenge 4 is an ambitious synthesis. This consistent structure means readers who've completed one chain know exactly what to expect from the next.

---
