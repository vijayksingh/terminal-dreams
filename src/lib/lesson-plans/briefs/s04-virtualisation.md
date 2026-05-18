# Section 4: Virtualisation -- Implementation Briefs

> Each stop below is a self-contained blueprint. An agent reading a single stop
> should have enough detail to build the component without asking design questions.

---

## virt-windowing -- Windowing Scrollytelling
**Format**: scrollytelling | **Effort**: large

### Interaction State Machine

```
                  +---------------------------+
                  |       step-0-problem      |
                  | (10,000 DOM nodes render. |
                  |  FPS: 3. Red pulsing.)    |
                  +-----------+---------------+
                              |
                   reader scrolls down
                              |
                              v
                  +---------------------------+
                  |      step-1-insight       |
                  | (viewport overlay fades   |
                  |  in, 15 items visible,    |
                  |  label appears)           |
                  +-----------+---------------+
                              |
                   reader scrolls down
                              |
                              v
                  +---------------------------+
                  |      step-2-window        |
                  | (viewport + overscan =    |
                  |  25 rendered. Rest become  |
                  |  ghost outlines.)         |
                  +-----------+---------------+
                              |
                   reader scrolls down
                              |
                              v
                  +---------------------------+
                  |      step-3-spacer        |
                  | (total-height spacer      |
                  |  block visible, scrollbar |
                  |  correct size)            |
                  +-----------+---------------+
                              |
                   reader scrolls down
                              |
                              v
                  +---------------------------+
                  |      step-4-recycle       |
                  | (auto-scroll demo: items  |
                  |  enter/exit with fade.    |
                  |  'Recycling' label.)      |
                  +-----------+---------------+
                              |
                   reader scrolls down
                              |
                              v
                  +---------------------------+
                  |      step-5-result        |
                  | (DOM counter: 25. FPS:    |
                  |  60. Green. Controls      |
                  |  enabled for free play.)  |
                  +-----------+---------------+
                              |
                   reader scrolls past final step
                              |
                              v
                  +---------------------------+
                  |      free-play            |
                  | (list fully scrollable.   |
                  |  Controls: totalItems,    |
                  |  overscan, viewportHeight.|
                  |  DOM counter live.)       |
                  +-----------+---------------+
                              |
                   adjust totalItems / overscan / viewport
                              |
                              v
                  (free-play, metrics update reactively)
```

**State data**:
- `currentStep: number` (0-5, driven by IntersectionObserver).
- `freePlayActive: boolean` (true after scrolling past step 5).
- `totalItems: number` (stored, default 10000, range 100-1000000).
- `overscan: number` (stored, default 5, range 0-20).
- `viewportHeight: number` (stored, default 300, range 150-600).
- `scrollTop: number` (stored, updated on scroll in free-play mode).
- `itemHeight: number` (fixed at 40px for this lesson -- variable height is the next stop).
- `visibleRange: { start: number, end: number }` (derived from scrollTop, viewportHeight, itemHeight, overscan).
- `renderedCount: number` (derived: end - start).
- `fps: number` (stored, updated via `requestAnimationFrame` timing).
- `fpsColor: 'green' | 'yellow' | 'red'` (derived from fps).
- `demoScrollOffset: number` (stored, used in step 4-5 for the auto-scroll animation before free-play takes over).

**Transitions**:
- `step-0 -> step-1`: IntersectionObserver fires for step-1 marker. Viewport overlay fades in.
- `step-1 -> step-2`: IntersectionObserver fires. Ghost outlines replace full items. DOM counter appears.
- `step-2 -> step-3`: IntersectionObserver fires. Spacer block becomes visible.
- `step-3 -> step-4`: IntersectionObserver fires. Auto-scroll demo begins.
- `step-4 -> step-5`: IntersectionObserver fires. Metrics lock in at result state.
- `step-5 -> free-play`: IntersectionObserver fires past last step. Controls unlock.
- `free-play -> free-play`: any control change or scroll event updates derived state.
- Scrolling backward reverses: e.g., `step-3 -> step-2` re-shows full items and hides spacer.

### Visual Choreography

**Overall layout**:
- ScrollytellingShell with `visualPosition="left"` (sticky panel 60% width). Sticky panel contains the virtual list visualization. Scroll panel (40% width) contains the 6 narrative steps.

**List visualization (all steps)**:
- Container: `width: 100%`, `height: viewportHeight` (default 300px), `border: 1px solid var(--color-border)`, `border-radius: var(--radius-2)`, `background: var(--color-bg)`, `overflow-y: auto` (in free-play mode, `overflow: hidden` during scrollytelling steps).
- Items: each row `height: 40px`, `padding: 0 var(--space-3)`, `font-family: var(--font-mono)`, `font-size: var(--text-sm)`, `color: var(--color-text)`, `border-bottom: 1px solid var(--color-border)`. Content: "Item {index}" left-aligned, "{index}" right-aligned in `var(--color-muted)`.
- Alternating row tint: even rows `background: var(--color-surface)`, odd rows `background: var(--color-bg)`.

**FPS counter** (visible from step 0 onward):
- Fixed top-right of the sticky panel. Size: 52px wide x 28px tall. `border-radius: var(--radius-1)`. `font-family: var(--font-mono)`, `font-size: var(--text-sm)`, `font-weight: 600`. `padding: var(--space-1) var(--space-2)`.
- Background: `var(--color-surface)`. Border: `1px solid` matching the FPS color.
- FPS color thresholds: green (`var(--color-success)`, oklch green) at 55+ fps, yellow (`var(--diagram-layer-3)`, oklch gold hue 60) at 30-54 fps, red (`var(--color-error)`, oklch red hue 25) below 30 fps.
- Color transition: `transition: color 300ms ease, border-color 300ms ease`.
- At step 0: fps reads "3" in red. Pulsing glow via `box-shadow: 0 0 8px var(--color-error)` with `LOOP.pulse` (1.5s infinite ease-in-out).
- At step 5 / free-play: fps reads "60" in green. No pulse.

**DOM counter** (visible from step 2 onward):
- Fixed top-left of the sticky panel. Same dimensions and style as FPS counter.
- Content: "{renderedCount} nodes". In step 0-1: shows "10,000 nodes" in red. In step 2+: shows "25 nodes" (or current overscan-adjusted count) in green.
- Number transition: animated with a counting-up/down effect. Use framer-motion `animate` on a `motion.span` with `TRANSITION.progress` (500ms ease-out). The number morphs from old value to new.

**Step 0 -- Problem state**:
- ALL 10,000 items are implied to be rendered (visually, show ~40 densely packed rows with the rest scrolled off). The list container appears janky: apply a CSS `animation: jank 200ms steps(2) infinite` that shifts the container 1px up/down to simulate choppiness. FPS counter: red "3fps", pulsing.
- Below the list: a label in `var(--color-muted)`, `font-size: var(--text-xs)`: "10,000 DOM elements. Every single one in the layout tree."

**Step 1 -- Viewport insight**:
- A viewport overlay fades in: a translucent rectangle `height: viewportHeight` (300px), `background: var(--diagram-layer-0)` at 12% opacity, `border: 2px dashed var(--diagram-layer-0)`, `border-radius: var(--radius-2)`. Positioned over the visible portion of the list. Fade-in: `opacity: 0 -> 1` over `DURATION.normal` (300ms) with `EASE.out`.
- Above the overlay, a label fades in: "only ~15 are visible" in `var(--diagram-layer-0)`, `font-size: var(--text-sm)`, `font-weight: 600`. Arrow pointing down into the viewport zone.
- Items outside the viewport dim to `opacity: 0.2` over `DURATION.normal` (300ms).

**Step 2 -- Window + overscan**:
- Viewport overlay stays. An overscan zone appears above and below the viewport: two additional translucent bands, each `height: overscan * itemHeight` (5 * 40px = 200px), `background: var(--diagram-layer-1)` at 10% opacity, `border: 1px dashed var(--diagram-layer-1)`. Labels: "overscan (5)" in `var(--diagram-layer-1)`.
- Items in viewport + overscan remain solid (full opacity, solid fill).
- Items OUTSIDE viewport + overscan become ghost outlines: `opacity: 0.08`, `border: 1px dashed var(--color-border)`, content replaced with a thin horizontal line at vertical center (representing "this item exists in data but not in DOM"). Ghost transition: each item transforms over `DURATION.fast` (200ms) with `EASE.out`, staggered at 2ms per item from edges inward (items furthest from viewport ghost first).
- DOM counter drops from "10,000" to "25" with the counting animation. FPS counter jumps from "3" to "58". Both color-transition to green. The FPS jump is the aha -- accompany with a brief `box-shadow: 0 0 12px var(--color-success)` flash on the FPS counter (400ms fade-out).

**Step 3 -- Spacer illusion**:
- The ghost items collapse into a single tall spacer block. Spacer: `height: totalItems * itemHeight` (400,000px represented as a proportional block in the visualization). `background: var(--color-border)` at 6% opacity with a repeating pattern of thin horizontal lines every 40px (representing the item grid). `border: 1px dashed var(--color-muted)`.
- Label at the center of the spacer block: "Total height: 400,000px (10,000 x 40px)" in `var(--color-muted)`, `font-size: var(--text-xs)`.
- A miniature scrollbar appears to the right of the list, showing the thumb at the correct proportional size (tiny for 10,000 items). Label near scrollbar: "Scrollbar thinks the list is full-size".

**Step 4 -- Recycling**:
- An automated scroll animation begins. The list scrolls smoothly at a rate of 200px/s for 3 seconds. During scroll:
  - Items entering the viewport from below: fade in from `opacity: 0, y: 10` to `opacity: 1, y: 0` over `DURATION.fast` (200ms) using `SPRING.snappy`.
  - Items exiting the viewport above: fade out from `opacity: 1, y: 0` to `opacity: 0, y: -10` over `DURATION.fast` (200ms).
  - A "RECYCLING" label appears centered above the list in `var(--diagram-layer-0)`, `font-size: var(--text-xs)`, `font-weight: 700`, `letter-spacing: 0.1em`. Two circular-arrow icons flanking the text.
- DOM counter stays at "25" throughout the scroll. This constancy IS the lesson.

**Step 5 -- Result state**:
- Scroll stops. Final metrics lock in:
  - FPS: 60, green, no pulse.
  - DOM nodes: 25, green.
  - A results row below the list: three metric cards side by side, each `padding: var(--space-2) var(--space-3)`, `background: var(--color-surface)`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-2)`.
    - Card 1: "Total Items" / "10,000" in `var(--color-text)`.
    - Card 2: "DOM Nodes" / "25" in `var(--color-success)`.
    - Card 3: "FPS" / "60" in `var(--color-success)`.
  - Cards stagger in with `STAGGER.fast` (60ms each), `TRANSITION.enterCard`.

**Free-play mode** (after scrollytelling):
- List becomes fully scrollable (`overflow-y: auto`).
- Controls bar appears below the list with `TRANSITION.collapse` (300ms ease-in-out):
  - **Total Items** Dial: `min=100`, `max=1000000`, `step=100`, `format=(v) => v >= 1000 ? \`${(v/1000).toFixed(0)}k\` : String(v)`. Default: 10000.
  - **Overscan** Dial: `min=0`, `max=20`, `step=1`. Default: 5.
  - **Viewport Height** Dial: `min=150`, `max=600`, `step=10`, `format=(v) => \`${v}px\``. Default: 300.
- Reader scrolls the list. Items recycle visibly (enter/exit animations). DOM counter stays constant. FPS stays at 60 regardless of totalItems.

**Reduced motion**:
- All step transitions are instant (no fade, no stagger). Ghost items appear immediately. FPS/DOM counters show final values without counting animation. Auto-scroll in step 4 is replaced with a static before/after: show the list at scrollTop=0, then instantly at scrollTop=2000, with a label: "Items recycled during scroll". Enter/exit item animations are instant opacity swaps.

### Teaching Flow (First 60 Seconds)

1. **(0-3s)** The sticky panel shows a list container with densely packed rows. Rows are slightly jittery (simulated jank animation). FPS counter in top-right reads "3" in red with a pulsing glow. DOM counter in top-left reads "10,000 nodes" in red. The reader immediately sees: something is very wrong. Right scroll panel shows first narrative: "10,000 DOM elements. The browser is choking on layout calculations for every single one."

2. **(3-10s)** Reader scrolls. A translucent blue overlay fades in over the visible portion of the list (about 15 rows). Items above and below the overlay dim to near-invisible. A bold label appears: "only 15 are visible". The narrative reads: "But look at the viewport. The user can only SEE about 15 items at a time. The other 9,985 are invisible -- expensive ghosts wasting layout and memory."

3. **(10-20s)** Reader scrolls again. Two green-tinted overscan bands appear above and below the viewport overlay. Items in viewport + overscan stay solid. Everything else transforms into ghost outlines -- faint dashed rectangles with no content. The transformation ripples outward from the viewport edges (items farthest from viewport ghost first). DOM counter drops from "10,000" to "25" with a rapid counting animation. FPS jumps from "3" to "58". The FPS counter flashes green. This is the first aha moment.

4. **(20-30s)** Reader scrolls to the spacer step. Ghost outlines collapse into a single tall block with faint grid lines. A label in the center reads "Total height: 400,000px". A miniature scrollbar shows the correct thumb size. Narrative: "A spacer element with the TOTAL list height tricks the scrollbar into behaving correctly."

5. **(30-42s)** Reader scrolls to the recycling step. The list begins auto-scrolling. Items enter from the bottom with a gentle spring-in, items exit at the top with a fade-out. The DOM counter stays rock-steady at "25". A "RECYCLING" label appears above the list. The reader watches the same 25 slots get repopulated with different data. FPS counter reads "60" in green.

6. **(42-50s)** Reader scrolls to the results step. Three metric cards stagger in below the list: Total Items 10,000, DOM Nodes 25, FPS 60. The juxtaposition is the lesson: 10,000 items, 25 nodes, 60fps.

7. **(50-60s)** Reader scrolls past the last step. Controls slide in: three Dials for Total Items, Overscan, and Viewport Height. The list becomes freely scrollable. The reader drags the Total Items dial to 1,000,000. DOM counter stays at 25. FPS stays at 60. They set overscan to 0 and scroll fast -- blank flashes appear at the edges. They increase overscan to 10 -- smooth again. The interactive is now their instrument.

### Data & State Shape

```typescript
// --- Virtual list core ---
type VirtualItem = {
  index: number;
  label: string;          // "Item {index}"
  offsetTop: number;      // index * itemHeight
};

type VisibleRange = {
  startIndex: number;     // Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  endIndex: number;       // Math.min(totalItems - 1, Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan)
};

// --- Component state ---
type WindowingScrollyState = {
  // Scroll-driven
  currentStep: number;                // 0-5, driven by IntersectionObserver
  freePlayActive: boolean;            // true after scrolling past step 5

  // Virtual list config (stored, user-adjustable in free-play)
  totalItems: number;                 // default 10000, range [100, 1000000]
  overscan: number;                   // default 5, range [0, 20]
  viewportHeight: number;             // default 300, range [150, 600]
  itemHeight: number;                 // fixed 40 (px)

  // Scroll state
  scrollTop: number;                  // stored, updated on scroll events

  // Performance metrics
  fps: number;                        // stored, updated via rAF timing
  frameTimestamps: number[];          // last 60 frame timestamps for rolling FPS

  // Demo animation
  demoScrollActive: boolean;          // true during step 4 auto-scroll
  demoScrollOffset: number;           // current offset in auto-scroll
};

// --- Derived values (computed, not stored) ---
// visibleRange: VisibleRange = computeRange(scrollTop, viewportHeight, itemHeight, overscan, totalItems)
// renderedItems: VirtualItem[] = generateItems(visibleRange.startIndex, visibleRange.endIndex)
// renderedCount: number = visibleRange.endIndex - visibleRange.startIndex + 1
// totalHeight: number = totalItems * itemHeight
// fpsColor: 'green' | 'yellow' | 'red' = fps >= 55 ? 'green' : fps >= 30 ? 'yellow' : 'red'
// ghostRanges: [0, visibleRange.startIndex - overscan - 1] and [visibleRange.endIndex + overscan + 1, totalItems - 1]

// --- Step config (static, module-scope) ---
type StepConfig = {
  index: number;
  showViewportOverlay: boolean;
  showOverscanBands: boolean;
  showGhostItems: boolean;
  showSpacer: boolean;
  showRecycling: boolean;
  showResults: boolean;
  simulatedFps: number;             // forced FPS display value during scrollytelling
  simulatedDomCount: number;        // forced DOM counter value during scrollytelling
};

const STEPS: StepConfig[] = [
  { index: 0, showViewportOverlay: false, showOverscanBands: false, showGhostItems: false, showSpacer: false, showRecycling: false, showResults: false, simulatedFps: 3, simulatedDomCount: 10000 },
  { index: 1, showViewportOverlay: true,  showOverscanBands: false, showGhostItems: false, showSpacer: false, showRecycling: false, showResults: false, simulatedFps: 3, simulatedDomCount: 10000 },
  { index: 2, showViewportOverlay: true,  showOverscanBands: true,  showGhostItems: true,  showSpacer: false, showRecycling: false, showResults: false, simulatedFps: 58, simulatedDomCount: 25 },
  { index: 3, showViewportOverlay: true,  showOverscanBands: true,  showGhostItems: false, showSpacer: true,  showRecycling: false, showResults: false, simulatedFps: 58, simulatedDomCount: 25 },
  { index: 4, showViewportOverlay: true,  showOverscanBands: true,  showGhostItems: false, showSpacer: true,  showRecycling: true,  showResults: false, simulatedFps: 60, simulatedDomCount: 25 },
  { index: 5, showViewportOverlay: false, showOverscanBands: false, showGhostItems: false, showSpacer: false, showRecycling: false, showResults: true,  simulatedFps: 60, simulatedDomCount: 25 },
];
```

**Derived vs Stored**:
- Stored: `currentStep`, `totalItems`, `overscan`, `viewportHeight`, `scrollTop`, `fps`, `demoScrollActive`, `demoScrollOffset`.
- Derived: `visibleRange`, `renderedItems`, `renderedCount`, `totalHeight`, `fpsColor`, all visual flags (from STEPS[currentStep]).
- Step configs are static constants.

**State management**: `useReducer` with actions: `SET_STEP`, `SET_SCROLL_TOP`, `UPDATE_FPS`, `SET_TOTAL_ITEMS`, `SET_OVERSCAN`, `SET_VIEWPORT_HEIGHT`, `START_DEMO_SCROLL`, `STOP_DEMO_SCROLL`.

### Primitives & Props

**ScrollytellingShell** (from shared primitives):
```tsx
<ScrollytellingShell
  steps={WINDOWING_SCROLL_STEPS}      // 6 ScrollStep objects from the lesson plan
  renderVisual={(stepIndex) => (
    <WindowingVisual
      step={STEPS[stepIndex]}
      totalItems={totalItems}
      overscan={overscan}
      viewportHeight={viewportHeight}
      scrollTop={scrollTop}
      fps={fps}
      freePlay={freePlayActive}
      onScroll={handleScroll}
    />
  )}
  visualPosition="left"
  progressBar={true}
  onStepChange={(idx) => dispatch({ type: 'SET_STEP', step: idx })}
/>
```

**DemoSandbox** (wraps the free-play controls):
```tsx
<DemoSandbox title="Virtual List">
  <WindowingVisual ... />
  <DemoSandbox.Controls>
    <Dial label="Items" value={totalItems} min={100} max={1000000} step={100} format={formatK} onChange={setTotalItems} />
    <Dial label="Overscan" value={overscan} min={0} max={20} step={1} onChange={setOverscan} />
    <Dial label="Height" value={viewportHeight} min={150} max={600} step={10} format={formatPx} onChange={setViewportHeight} />
  </DemoSandbox.Controls>
  <DemoSandbox.Caption>Scroll the list. Change parameters. DOM count stays constant.</DemoSandbox.Caption>
</DemoSandbox>
```

**Dial** (reused from dialkit):
- Three instances with configs as described above.

**Internal components** (built for this lesson, not shared):
- `VirtualListRenderer`: the core virtual list -- a scroll container with a spacer div and absolutely positioned item rows using `transform: translateY(offsetTop)`. This is a real working virtual list, not a simulation.
- `FPSCounter`: the fixed-position metric badge. Props: `value: number`, `animate: boolean`.
- `DOMCounter`: same pattern as FPSCounter. Props: `value: number`, `animate: boolean`.
- `ViewportOverlay`: translucent rectangle positioned over the visible area. Props: `height: number`, `visible: boolean`.
- `OverscanBands`: two translucent strips above/below viewport. Props: `overscan: number`, `itemHeight: number`, `visible: boolean`.
- `GhostItem`: the dashed-outline placeholder for non-rendered items. Props: `height: number`.
- `SpacerBlock`: the total-height visualization with grid lines. Props: `totalHeight: number`, `itemHeight: number`.
- `MetricCard`: a single metric display card. Props: `label: string`, `value: string`, `color: string`.

### Edge Cases

**Fast scrolling in free-play (momentum scroll / trackpad fling)**:
- The virtual list implementation uses `requestAnimationFrame` to batch scroll handler updates. Even at high scroll velocities, only one `scrollTop` update per frame. Items outside the overscan zone are not rendered, so the browser only paints ~25 items per frame regardless of scroll speed.
- If overscan is 0 and scroll speed exceeds the render budget: blank gaps appear (items flash white for 1-2 frames before mounting). This is intentional -- it teaches why overscan exists. No mitigation needed; it IS the discovery mechanic.

**Mobile momentum scroll (iOS Safari rubber-banding)**:
- The list container uses `overscroll-behavior: contain` to prevent pull-to-refresh and rubber-band interference. `-webkit-overflow-scrolling: touch` for smooth inertial scroll. Passive scroll listener (`{ passive: true }`) to avoid blocking the scroll thread.
- Viewport overlay and overscan bands use `position: sticky` relative to the scroll container so they track correctly during momentum scroll.

**Window resize during free-play**:
- `viewportHeight` is a stored value (user-controlled via Dial), not derived from the container's actual pixel height. If the browser window resizes, the list container adapts via CSS (`height: viewportHeight + 'px'` with `max-height: 100%`), but the viewportHeight state only changes when the user moves the Dial. No automatic recalculation needed -- this is a teaching tool, not a production virtual list.

**totalItems at 1,000,000**:
- The spacer `height` would be 40,000,000px. Browsers cap element heights at ~33,554,432px (Chrome) or ~17,895,697px (Firefox). For totalItems > ~400,000, switch the spacer to a proportional representation (e.g., 1px per 100 items) and adjust the scroll math accordingly. Display a note: "Scaled representation -- real scrollbar would be even smaller."
- The item data is generated on-the-fly (`"Item ${index}"`), not pre-allocated. No array of 1M objects in memory.

**Overscan = 0**:
- Legal value. Blank flashes during fast scroll are the expected behavior (discovery mechanic #2). No error state, no warning. The DOM counter correctly shows viewport-only items (no overscan buffer).

**Keyboard scroll (Tab, Page Up/Down, Arrow keys)**:
- In free-play mode, the list container has `tabIndex={0}` and handles keyboard events. `ArrowDown`/`ArrowUp` scroll by one itemHeight (40px). `PageDown`/`PageUp` scroll by viewportHeight. `Home`/`End` scroll to top/bottom. Focus ring: `2px solid var(--color-accent)` with `outline-offset: 2px`.
- During scrollytelling steps (before free-play), the list is not keyboard-scrollable. Keyboard scrolling works on the page itself (to advance scroll steps).

**Screen reader experience**:
- The list container has `role="list"`. Rendered items have `role="listitem"`. An `aria-label` on the container: "Virtual list showing items {startIndex} through {endIndex} of {totalItems}". FPS counter has `aria-live="polite"` and announces changes: "Performance: {fps} frames per second". DOM counter has `aria-live="polite"`: "{renderedCount} DOM nodes rendered".
- During scrollytelling, each step's narrative is the accessible description. The visual is supplementary.

**Reader scrolls backward through steps**:
- ScrollytellingShell handles reverse. Each visual state is a function of `currentStep`, not accumulated mutations. Scrolling from step 3 back to step 1 re-renders step 1's visual directly: viewport overlay visible, no overscan bands, no ghosts, DOM counter returns to "10,000", FPS returns to "3". All transitions play in reverse (ghosts solidify, overlay adjusts).

### Cross-Lesson Connections

- **Foundation for virt-fixed-vs-variable**: This lesson establishes the mental model -- viewport + overscan + spacer + recycling = virtual list. The next stop (battle) assumes the reader already understands WHAT windowing does and focuses on the HOW of offset calculation. The `itemHeight: 40` fixed value used here is intentionally simple so that virt-fixed-vs-variable can contrast it with variable heights.
- **The FPS counter visual language**: The red/yellow/green FPS counter introduced here is reused in EVERY subsequent stop in this section. virt-variable-height's build-along shows FPS improving with each code step. virt-canvas-dom's battle shows FPS diverging between approaches. Consistent color thresholds (55+/30-54/<30) and positioning (top-right) across all stops.
- **Ghost outlines carry forward**: The dashed-outline "ghost item" visual from step 2 reappears in virt-tree-grid to represent collapsed tree nodes and un-rendered grid cells. Same visual language: "this data exists but has no DOM node."
- **Free-play control pattern**: The Dial-based control bar established here (totalItems, overscan, viewportHeight) is the same interaction pattern used in virt-canvas-dom (item count slider) and virt-fixed-vs-variable (shared scroll position). Readers learn the "manipulate parameters, observe metrics" workflow once and recognize it in later stops.
- **Spacer concept feeds build-along**: Step 3's spacer explanation is step 2 of the build-along (virt-variable-height). The reader who understood the spacer conceptually here will recognize it when they write `spacer.style.height = totalItems * itemHeight + 'px'` in the build-along code.

---

## virt-fixed-vs-variable -- Fixed vs Variable Height Battle
**Format**: battle | **Effort**: medium

### Interaction State Machine

```
                    +----------------------------+
                    |         idle               |
                    | (both lists rendered,      |
                    |  shared controls ready,    |
                    |  no hover/selection)       |
                    +-----------+----------------+
                                |
              hover getOffset() label on either side
                                |
                                v
                    +----------------------------+
                    |    offset-calc-hover       |
                    | (formula animation plays   |
                    |  for the hovered side)     |
                    +-----------+----------------+
                                |
                  mouse leaves     |     click getOffset()
                       |           |           |
                       v           |           v
                    (idle)         |  +----------------------------+
                                   |  |   offset-calc-expanded    |
                                   |  | (full step-by-step calc   |
                                   |  |  visible in FormulaBar)   |
                                   |  +-----------+---------------+
                                   |              |
                                   |     click elsewhere / Escape
                                   |              |
                                   v              v
                    +----------------------------+
                    |      scrolling             |
                    | (shared scroll drives      |
                    |  both lists. Performance   |
                    |  meters update live.)      |
                    +-----------+----------------+
                                |
                   scroll stops / user adjusts controls
                                |
                                v
                    +----------------------------+
                    |     resize-item            |
                    | (drag handle on variable   |
                    |  side to resize an item)   |
                    +-----------+----------------+
                                |
                   release drag handle
                                |
                                v
                    +----------------------------+
                    |   cascade-animating        |
                    | (position cache updates    |
                    |  animate downward from     |
                    |  resized item. Chain       |
                    |  reaction visible.)        |
                    +-----------+----------------+
                                |
                   animation completes
                                |
                                v
                              (idle)
```

**State data**:
- `hoveredSide: 'fixed' | 'variable' | null`.
- `hoveredElement: 'getOffset' | 'getIndex' | null` (which formula label is hovered).
- `calcExpanded: boolean` (whether the formula animation is playing).
- `calcTargetIndex: number` (which index the getOffset calculation targets, default 5000).
- `scrollTop: number` (shared between both lists).
- `totalItems: number` (stored, default 10000, range [1000, 100000]).
- `fixedItemHeight: number` (constant 40px, not user-adjustable).
- `variableItems: VariableItem[]` (stored, array of {index, height} where height ranges 30-120px).
- `resizingItemIndex: number | null` (stored, which variable item is being drag-resized).
- `cascadeAnimating: boolean` (stored, true during position cache cascade).
- `cascadeProgress: number` (0-1, how far the cascade has animated).
- `perfMetrics: { fixed: { computeTimeUs: number }, variable: { computeTimeUs: number } }` (stored, updated on each scroll frame).

**Transitions**:
- `idle -> offset-calc-hover`: onMouseEnter on a getOffset label.
- `offset-calc-hover -> idle`: onMouseLeave.
- `offset-calc-hover -> offset-calc-expanded`: onClick on getOffset label.
- `offset-calc-expanded -> idle`: click elsewhere or press Escape.
- `idle -> scrolling`: user scrolls either list (scroll is synced).
- `scrolling -> idle`: scroll event stops (debounced 150ms).
- `idle -> resize-item`: pointer down on a variable item's drag handle.
- `resize-item -> cascade-animating`: pointer up after resizing.
- `cascade-animating -> idle`: cascade animation completes.

### Visual Choreography

**Overall layout**:
- BattleArena with two approaches side by side (50/50 split). Shared control bar above. Shared FormulaBar below.
- Left panel: "Fixed Height" label in `var(--diagram-layer-0)` (blue). Right panel: "Variable Height" label in `var(--diagram-layer-3)` (gold).

**List rendering (both sides)**:
- Each list: `width: 100%`, `height: 300px`, `overflow-y: auto`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-2)`.
- Fixed side: all rows 40px. Content: "Item {i}" in monospace. Background alternating `var(--color-surface)` / `var(--color-bg)`.
- Variable side: rows have varied heights (30-120px). Content includes realistic data: some items are single-line ("Item 42"), some are multi-line ("Item 107 -- This item has extended content that wraps to multiple lines and demonstrates variable height behavior"). Heights are deterministic from a seed (not random per render).

**Shared scroll sync**:
- Scrolling either list scrolls both. The scroll positions map proportionally (not pixel-for-pixel, since total heights differ). Left scroll position = `scrollTop`. Right scroll position = `scrollTop * (variableTotalHeight / fixedTotalHeight)`. Sync is immediate (same rAF frame).

**getOffset hover animation (the core teaching device)**:

Below each list, a code-style label: `getOffset(${calcTargetIndex})` in `font-family: var(--font-mono)`, `font-size: var(--text-sm)`, `color: var(--color-muted)`. On hover, the label gains `color: var(--color-text)`, `text-decoration: underline`, `cursor: pointer`.

*Fixed side hover*:
- FormulaBar appears below with `TRANSITION.enterItem` (200ms ease-out):
  ```
  [index] x [itemHeight] = [offset]
  [5000]  x [40]         = [200000]
  ```
- Tokens: `index` pill in `var(--diagram-layer-0)` (blue), `itemHeight` pill in `var(--diagram-layer-0)`, `=` operator, result pill in `var(--color-success)` (green).
- Animation: the multiplication happens visually. `5000` and `40` pills pulse once (`scale: 1 -> 1.1 -> 1`, `SPRING.snappy`, 200ms), then the result `200000` appears with a pop (`scale: 0 -> 1.1 -> 1`, `SPRING.quick`, 250ms).
- Total animation time: ~400ms. A label appears: "O(1) -- one multiply" in `var(--color-success)`.

*Variable side hover*:
- FormulaBar appears with a binary search visualization:
  ```
  Step 1: cache[5000] → check mid=5000 → offset=187432
  Step 2: cache[2500] → check mid=2500 → offset=94210
  Step 3: cache[3750] → ...
  ... (7 total steps for 10k items)
  Step 7: found → offset=198,847
  ```
- Each step appears sequentially with 200ms stagger. Each step's `mid` value pill is colored `var(--diagram-layer-3)` (gold). The arrow between steps pulses. On the right side of the formula area, a miniature binary search tree diagram shows the traversal path (7 nodes highlighted out of a 13-level tree).
- Total animation time: ~1.8s. A label appears: "O(log n) -- binary search through position cache" in `var(--diagram-layer-3)`.

**getOffset click (expanded view)**:
- Same animation as hover but with an additional detail: the FormulaBar expands to show the position cache array. For fixed: "No cache needed -- pure math". For variable: a row of cells representing cached cumulative heights, with the binary search path highlighted. Cells are 24x24px squares, `background: var(--color-surface)`, `border: 1px solid var(--color-border)`, `font-size: 8px` showing abbreviated offsets. Searched cells glow `var(--diagram-layer-3)` at 30% opacity.

**Resize handle (variable side only)**:
- Each variable-height item has a 6px-tall drag handle at the bottom edge. Handle: `background: var(--color-border)`, `cursor: ns-resize`, `border-radius: 3px`. On hover: `background: var(--diagram-layer-3)`. On drag: item height follows the pointer. Min: 30px. Max: 120px.

**Position cache cascade animation**:
- On drag release: the resized item flashes `border: 2px solid var(--diagram-layer-3)` (400ms fade-out). Then, starting from the item directly below the resized one, a cascade wave flows downward: each subsequent item's position shifts by the height delta. Each item shifts with a 15ms stagger. The shift is visible as a brief `translateY` adjustment with `SPRING.snappy`.
- A counter appears above the variable list: "Updating positions: {currentItem} / {itemsBelow}" counting up as the cascade progresses. Color: `var(--diagram-layer-3)`.
- Cascade timing for an item at index 5000 of 10000: 5000 items below * 15ms stagger = 75s (too long). Cap the visible cascade at 200 items (3s), then flash-complete the rest with a "...and {remaining} more" label.

**Performance meters**:
- Below each list (above the getOffset label): a small bar chart showing compute time per frame. Fixed: consistently tiny (under 0.01ms). Variable: slightly larger but still small for reads, spikes during cascade. Bar width: proportional to time, `max-width: 100%`, `height: 4px`, `background: var(--color-success)` for fixed, `var(--diagram-layer-3)` for variable.

**Reduced motion**:
- getOffset animations: all steps appear at once (no stagger, no sequential reveal). Binary search tree is static with path highlighted. Cascade: all items shift simultaneously (no wave). No spring animations on pills.

### Teaching Flow (First 60 Seconds)

1. **(0-5s)** Two lists side by side. Left labeled "Fixed Height" with a blue accent. Right labeled "Variable Height" with a gold accent. Both show items 0-7 visible. Fixed items are uniform 40px rows. Variable items range from compact single-liners to taller multi-line entries. Shared control bar above shows a "Total Items" Dial (default 10,000) and a "Jump to Index" input. Below each list: a code label `getOffset(5000)` in muted monospace.

2. **(5-15s)** Reader hovers the `getOffset(5000)` label on the fixed side. The FormulaBar slides in below: `5000 x 40 = 200,000`. The multiplication happens visually -- pills pulse, result pops in. Label: "O(1) -- one multiply". Total animation: ~400ms. The reader sees: for fixed height, finding any item's position is trivial math.

3. **(15-30s)** Reader moves mouse to the `getOffset(5000)` label on the variable side. FormulaBar clears and a new animation begins: binary search steps appear one by one. Step 1: check middle. Step 2: go left/right. Step 3... 7 steps total. Each step takes 200ms. A mini binary search tree lights up on the right. Label: "O(log n) -- 7 steps for 10,000 items". The reader sees: variable height requires searching through a position cache. The contrast with the fixed side's instant multiply is the first aha.

4. **(30-40s)** Reader scrolls one list. Both lists scroll in sync (proportionally). Performance bars update: both are tiny. FPS stays at 60 for both. A discovery nudge appears: "Both are fast for reading. Now try resizing an item..."

5. **(40-50s)** Reader grabs a drag handle on a variable-height item mid-list (around index 5000) and drags it taller. On release: the position cache cascade fires. Items below ripple-shift downward one by one. A counter ticks up: "Updating positions: 1 / 5,000... 50 / 5,000... 200 / 5,000... and 4,800 more". The cascade is the second aha: changing one item's height invalidates EVERY position below it.

6. **(50-60s)** The cascade completes. Performance bar on the variable side shows a brief spike. A summary label appears: "Fixed: O(1) everything. Variable: O(log n) read, O(n) on resize. Both are fast enough for most lists." The reader now understands the tradeoff without the lesson saying variable is "bad."

### Data & State Shape

```typescript
// --- Items ---
type FixedItem = {
  index: number;
  height: 40;                         // constant, literal type
};

type VariableItem = {
  index: number;
  height: number;                     // 30-120px, deterministic from seed
  content: string;                    // text content driving height
};

// --- Position cache (variable side only) ---
type PositionCache = {
  offsets: Float64Array;              // cumulative offsets, offsets[i] = sum of heights[0..i-1]
  totalHeight: number;                // sum of all heights
};

// --- Battle state ---
type FixedVsVariableState = {
  totalItems: number;                 // stored, 1000-100000, default 10000
  scrollTop: number;                  // stored, shared scroll driver

  // Fixed side (mostly derived)
  fixedItemHeight: 40;                // constant

  // Variable side
  variableItems: VariableItem[];      // stored, generated from seed
  positionCache: PositionCache;       // stored, rebuilt on resize
  resizingIndex: number | null;       // stored, which item is being dragged
  resizeDelta: number;                // stored, current drag delta in px

  // Offset calculation hover state
  hoveredSide: 'fixed' | 'variable' | null;  // stored
  calcExpanded: boolean;              // stored
  calcTargetIndex: number;            // stored, default 5000

  // Cascade animation
  cascadeActive: boolean;             // stored
  cascadeFromIndex: number;           // stored, where cascade starts
  cascadeCurrentIndex: number;        // stored, animation progress

  // Perf metrics
  fixedComputeUs: number;             // stored, microseconds per getOffset
  variableComputeUs: number;          // stored, microseconds per getOffset
};

// --- Derived ---
// fixedTotalHeight: number = totalItems * 40
// variableTotalHeight: number = positionCache.totalHeight
// fixedVisibleRange: { start, end } = simple Math.floor/ceil
// variableVisibleRange: { start, end } = binarySearch(positionCache, scrollTop)
// proportionalScrollTop: number = scrollTop * (variableTotalHeight / fixedTotalHeight)
// fixedOffsetCalc: { formula: string, steps: 1, result: number } = { `${calcTargetIndex} x 40`, 1, calcTargetIndex * 40 }
// variableOffsetCalc: BinarySearchTrace = traceBinarySearch(positionCache, calcTargetIndex)

type BinarySearchTrace = {
  steps: Array<{ mid: number, offset: number, direction: 'left' | 'right' | 'found' }>;
  totalSteps: number;
  result: number;
};
```

**State management**: `useReducer` with actions: `SCROLL`, `SET_TOTAL_ITEMS`, `HOVER_CALC`, `EXPAND_CALC`, `START_RESIZE`, `RESIZE_DRAG`, `END_RESIZE`, `CASCADE_TICK`, `CASCADE_COMPLETE`.

### Primitives & Props

**BattleArena** (from shared primitives):
```tsx
<BattleArena
  approaches={[
    { id: 'fixed', label: 'Fixed Height', color: 'var(--diagram-layer-0)' },
    { id: 'variable', label: 'Variable Height', color: 'var(--diagram-layer-3)' },
  ]}
  sharedControls={[
    { type: 'dial', label: 'Total Items', min: 1000, max: 100000, step: 1000 },
    { type: 'number-input', label: 'Jump to Index', min: 0, max: totalItems - 1 },
  ]}
  metrics={[
    { id: 'getOffset-cost', label: 'getOffset() Cost', format: 'complexity' },
    { id: 'compute-time', label: 'Compute Time', format: 'microseconds' },
  ]}
  renderApproach={(id, state) => (
    id === 'fixed'
      ? <FixedHeightList {...fixedProps} />
      : <VariableHeightList {...variableProps} />
  )}
/>
```

**DemoSandbox**: wraps the entire battle. `title="Fixed vs Variable Height"`.

**FormulaBar** (reused from demo-primitives):
```tsx
<FormulaBar
  tokens={
    hoveredSide === 'fixed'
      ? [{ label: String(calcTargetIndex), color: 'blue' }, 'x', { label: '40', color: 'blue' }, '=', { label: String(calcTargetIndex * 40), color: 'green' }]
      : binarySearchTrace.steps.map(step => ({ label: `cache[${step.mid}]`, color: 'gold' }))
  }
/>
```

**Dial** (reused from dialkit): Total Items control.

**Internal components**:
- `FixedHeightList`: virtual list with fixed 40px rows. Renders in the left BattleArena panel.
- `VariableHeightList`: virtual list with variable rows + resize handles. Renders in the right panel.
- `OffsetCalcLabel`: the hoverable `getOffset(index)` label that triggers formula animation.
- `BinarySearchViz`: miniature tree diagram showing the search path for variable offset lookup.
- `CascadeWave`: the ripple animation showing position updates flowing downward.
- `PerfBar`: tiny compute-time bar chart per side.

### Edge Cases

**Scroll sync at extremes (top/bottom)**:
- When fixed list hits bottom, variable list may not have reached its bottom (different total heights). Clamp the proportional scroll: `Math.min(proportionalScrollTop, variableTotalHeight - viewportHeight)`. Visual: one list may reach its scroll end before the other. No error, just natural behavior.

**Resize to min/max height**:
- Clamped during drag: `height = Math.max(30, Math.min(120, originalHeight + delta))`. Drag handle changes cursor to `not-allowed` at limits. No bounce or rubber-band.

**Cascade on first/last item**:
- Resizing the first item: cascade affects ALL other items (maximum cascade). Counter shows the full count.
- Resizing the last item: cascade affects 0 items. No cascade animation. Label: "Last item -- no positions to update."

**Mobile touch (resize handles)**:
- Resize handles increase to 12px tall on `(pointer: coarse)` media query. Touch targets are 44px minimum. `touch-action: none` on the handle to prevent scroll interference during drag.

**Keyboard navigation**:
- Tab cycles: Total Items Dial -> Jump to Index input -> fixed list -> variable list -> getOffset labels. Arrow keys scroll the focused list. `Enter` on getOffset label triggers the expanded view. `Escape` closes expanded view.

**getOffset target index out of range**:
- If `calcTargetIndex >= totalItems` after reducing totalItems: clamp to `totalItems - 1`. FormulaBar updates accordingly.

### Cross-Lesson Connections

- **Builds directly on virt-windowing**: The reader already knows viewport + overscan + spacer from the previous stop. This stop does not re-explain windowing. It focuses entirely on the HEIGHT CALCULATION difference. The fixed side uses the exact same `index * itemHeight` formula the reader saw in virt-windowing's step 3.
- **Sets up virt-variable-height**: The position cache and binary search shown here are the SAME data structures the reader will implement in the build-along. Steps 6-7 of the build-along (variable height + ResizeObserver) build exactly what this battle demonstrated. The reader has seen the algorithm animated; now they write it.
- **FormulaBar pattern**: The animated formula approach used here (showing step-by-step calculation) is the same pattern used in the S01 rendering pipeline lesson. Readers recognize "hover a concept, see the math" as a recurring interaction.
- **Cascade animation foreshadows tree virtualization**: The cascade of position updates when resizing a variable item is conceptually similar to the tree flattening animation in virt-tree-grid: one structural change (resize / expand node) ripples through the data structure. Same visual language (downward wave) in both stops.

---

## virt-variable-height -- Build a Virtual Scroller
**Format**: build-along | **Effort**: xl

### Interaction State Machine

```
                    +----------------------------+
                    |      code-step-0           |
                    | (naive render visible.     |
                    |  FPS: 3. Code: list.map.   |
                    |  Editor read-only until    |
                    |  reader reaches free edit) |
                    +-----------+----------------+
                                |
                     reader scrolls down
                                |
                                v
                    +----------------------------+
                    |      code-step-N           |
                    | (N=1..7. Code diff shown.  |
                    |  Preview updates. FPS      |
                    |  changes per step.)        |
                    +-----------+----------------+
                                |
                     reader scrolls to step 4
                                |
                                v
                    +----------------------------+
                    |     big-jump-celebration   |
                    | (FPS 3 -> 58. Brief        |
                    |  confetti-free celebration:|
                    |  green flash, counter      |
                    |  animation, label.)        |
                    +-----------+----------------+
                                |
                     auto-dismiss (2s) then continue scrolling
                                |
                                v
                    +----------------------------+
                    |      code-step-N (5-7)     |
                    | (remaining polish steps.   |
                    |  FPS: 55 -> 60.)           |
                    +-----------+----------------+
                                |
                     reader scrolls past step 7
                                |
                                v
                    +----------------------------+
                    |      edit-mode             |
                    | (all 8 steps editable.     |
                    |  Click any step tab to     |
                    |  edit. Changes cascade     |
                    |  forward to later steps.)  |
                    +-----------+----------------+
                                |
                     reader edits code at step N
                                |
                                v
                    +----------------------------+
                    |      preview-updating      |
                    | (live preview re-evaluates |
                    |  from edited step forward. |
                    |  FPS recalculates.)        |
                    +-----------+----------------+
                                |
                     editing settles (debounced 500ms)
                                |
                                v
                              (edit-mode)
```

**State data**:
- `currentStep: number` (0-7, driven by IntersectionObserver during scrollytelling phase).
- `editMode: boolean` (true after scrolling past all steps).
- `activeEditStep: number` (which step tab is selected in edit mode, default 0).
- `codeSteps: CodeStep[]` (stored, 8 steps, each with base code + reader edits).
- `userEdits: Record<number, string | null>` (stored, reader's modifications per step. null = unedited).
- `fpsPerStep: number[]` (static: [3, 3, 3, 58, 60, 55, 60, 60] -- simulated values during scrollytelling).
- `liveFps: number` (stored, real FPS measurement in edit mode).
- `celebrationActive: boolean` (stored, true for 2s at step 4).
- `previewError: string | null` (stored, if reader's edit causes a runtime error).

### Visual Choreography

**Overall layout**:
- Scrollytelling variant: sticky panel takes full width, split vertically. Top 60%: code editor panel. Bottom 40%: live preview panel. The scroll narration overlays from the right side as semi-transparent cards (same as standard scrollytelling but the visual is wider).
- Alternative: sticky panel is the left 60% (code top, preview bottom stacked), scroll narration is the right 40%. Use this layout if viewport width > 1200px. Below 1200px: sticky panel is full-width top half, narration scrolls below.

**Code editor panel**:
- Background: `var(--color-bg)`. `border: 1px solid var(--color-border)`. `border-radius: var(--radius-2) var(--radius-2) 0 0` (top corners only).
- Line numbers: `var(--color-muted)`, `font-size: var(--text-xs)`, `width: 36px`, right-aligned, `padding-right: var(--space-2)`.
- Code: `font-family: var(--font-mono)`, `font-size: var(--text-sm)`, `line-height: 1.6`.
- Syntax highlighting colors: keywords `oklch(65% 0.15 300)` (purple), strings `var(--color-success)`, numbers `var(--diagram-layer-3)` (gold), comments `var(--color-muted)`, functions `var(--diagram-layer-0)` (blue).

**Diff rendering per scroll step**:
- When scrolling to a new step, the code transforms with diffs:
  - Added lines: background `var(--color-success-muted)` (oklch green at 40% opacity in dark mode). A `+` marker in the line-number gutter, colored `var(--color-success)`.
  - Removed lines: background `var(--color-error-muted)` (oklch red at 40% opacity). A `-` marker colored `var(--color-error)`. Removed lines are shown for 600ms with a strikethrough, then collapse with `TRANSITION.collapse` (300ms ease-in-out).
  - Unchanged lines: no highlight.
  - New lines slide in from `opacity: 0, height: 0` to `opacity: 1, height: auto` over `DURATION.normal` (300ms) with `EASE.out`. Stagger: 40ms per line.

**Step-by-step code (exact content)**:

*Step 0 -- Naive*:
```jsx
function ItemList({ items }) {
  return (
    <div className="list-container">
      {items.map(item => (
        <div key={item.id} className="list-item">
          {item.label}
        </div>
      ))}
    </div>
  );
}
```

*Step 1 -- Scroll container + spacer*:
```jsx
function ItemList({ items, itemHeight }) {
+ const totalHeight = items.length * itemHeight;
+
  return (
-   <div className="list-container">
+   <div className="list-container" style={{ height: 300, overflow: 'auto' }}>
+     <div style={{ height: totalHeight }} />
      {items.map(item => (
        <div key={item.id} className="list-item">
          {item.label}
        </div>
      ))}
    </div>
  );
}
```

*Step 2 -- Calculate visible range*:
```jsx
function ItemList({ items, itemHeight }) {
  const totalHeight = items.length * itemHeight;
+ const [scrollTop, setScrollTop] = useState(0);
+
+ const startIndex = Math.floor(scrollTop / itemHeight);
+ const endIndex = Math.min(
+   items.length - 1,
+   Math.ceil((scrollTop + 300) / itemHeight)
+ );

  return (
-   <div className="list-container" style={{ height: 300, overflow: 'auto' }}>
+   <div
+     className="list-container"
+     style={{ height: 300, overflow: 'auto' }}
+     onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
+   >
      <div style={{ height: totalHeight }} />
      {items.map(item => (
```

*Step 3 -- Render only visible items (THE BIG JUMP)*:
```jsx
+   const visibleItems = items.slice(startIndex, endIndex + 1);
    ...
      <div style={{ height: totalHeight }}>
-       {items.map(item => (
-         <div key={item.id} className="list-item">
+       {visibleItems.map((item, i) => (
+         <div
+           key={item.id}
+           className="list-item"
+           style={{
+             position: 'absolute',
+             top: (startIndex + i) * itemHeight,
+             height: itemHeight,
+           }}
+         >
```

*Step 4 -- Add overscan*:
```jsx
+ const overscan = 5;
- const startIndex = Math.floor(scrollTop / itemHeight);
+ const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
-   Math.ceil((scrollTop + 300) / itemHeight)
+   Math.ceil((scrollTop + 300) / itemHeight) + overscan
  );
```

*Step 5 -- Variable heights*:
```jsx
- const totalHeight = items.length * itemHeight;
+ const heightCache = useMemo(() => {
+   const cache = new Float64Array(items.length);
+   let offset = 0;
+   for (let i = 0; i < items.length; i++) {
+     cache[i] = offset;
+     offset += items[i].height; // variable!
+   }
+   return { offsets: cache, total: offset };
+ }, [items]);
...
- const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
+ const startIndex = Math.max(0, binarySearch(heightCache.offsets, scrollTop) - overscan);
```

*Step 6 -- ResizeObserver for dynamic measurement*:
```jsx
+ const measureRef = useCallback((node, index) => {
+   if (!node) return;
+   const observer = new ResizeObserver(([entry]) => {
+     const measuredHeight = entry.contentBoxSize[0].blockSize;
+     if (measuredHeight !== items[index].height) {
+       updateHeight(index, measuredHeight);
+     }
+   });
+   observer.observe(node);
+   return () => observer.disconnect();
+ }, []);
```

*Step 7 -- translateY instead of padding-top*:
```jsx
- style={{ paddingTop: startOffset }}
+ style={{ transform: `translateY(${startOffset}px)` }}
```

**FPS counter** (visible throughout):
- Same style as virt-windowing's FPS counter (52x28px, top-right, mono, color-coded).
- During scrollytelling: shows the simulated FPS per step. Value transitions with the counting animation (`TRANSITION.progress`).
- During edit mode: shows the real measured FPS from the preview's rAF loop.

**Step 4 celebration (FPS 3 -> 58)**:
- When step transitions from 3 to 4, the FPS counter scales to 1.3x with `SPRING.quick` (400 stiffness, 26 damping), holds for 200ms, then returns to 1x.
- A flash: `box-shadow: 0 0 20px 4px var(--color-success)` on the FPS counter, fading over 800ms.
- Below the FPS counter, a label pops in: "THE JUMP" in `var(--color-success)`, `font-weight: 700`, `font-size: var(--text-xs)`, `letter-spacing: 0.15em`. Fades out after 2s.
- The code diff for this step's added lines gets an extra glow: `box-shadow: inset 0 0 8px var(--color-success-muted)` on the green-highlighted lines, fading over 1s.

**Live preview panel**:
- Below the code editor. `border: 1px solid var(--color-border)`, `border-radius: 0 0 var(--radius-2) var(--radius-2)` (bottom corners). `background: var(--color-bg)`. `height: 40%` of sticky panel.
- Contains a real, functional instance of the code at the current step. At step 0: shows 10,000 items in a janky list. At step 4+: shows a working virtual list.
- A thin divider between code and preview with a label: "PREVIEW" in `var(--color-muted)`, `font-size: 10px`, `letter-spacing: 0.1em`.

**Step tabs (edit mode)**:
- After scrollytelling completes, 8 numbered tabs appear above the code editor: `[0] [1] [2] [3] [4] [5] [6] [7]`. Each tab: `width: 32px`, `height: 28px`, `border-radius: var(--radius-1)`, `font-family: var(--font-mono)`, `font-size: var(--text-xs)`.
- Active tab: `background: var(--color-accent)`, `color: var(--primary-foreground)`.
- Edited tabs: a small dot above the tab number in `var(--diagram-layer-3)` indicating reader modification.
- Click any tab: code editor shows that step's code (with reader's edits if any). Preview updates to show the result of running all steps 0..N with reader's edits applied.

**Error state in preview**:
- If reader's edit causes a runtime error: preview shows a red overlay with the error message. `background: var(--color-error-muted)`. `color: var(--color-error)`. `font-family: var(--font-mono)`. `font-size: var(--text-sm)`. Error message truncated to 3 lines max.

**Reduced motion**:
- Code diffs appear instantly (no slide-in, no stagger, no collapse animation for removed lines). FPS counter value changes instantly (no counting animation). Step 4 celebration: FPS counter color changes to green with no scale/glow. Preview updates without transition.

### Teaching Flow (First 60 Seconds)

1. **(0-5s)** The sticky panel dominates the left 60% of the viewport. Top portion: a code editor showing the naive `items.map(item => <div>{item.label}</div>)` implementation. Bottom portion: a live preview with a janky, slow-scrolling list. FPS counter reads "3" in red with a pulsing glow. The right 40% shows the first narrative: "Start with the problem: rendering everything. 10,000 items, 3 frames per second."

2. **(5-12s)** Reader scrolls. Code editor transforms: a `totalHeight` calculation appears (green addition), the container gets `overflow: auto` (green diff), a spacer div appears. Removed lines flash red with strikethrough, then collapse. Preview shows... the same janky list, now inside a scroll container. FPS stays at "3". Narrative: "Create the illusion of a full list with a spacer element."

3. **(12-20s)** Reader scrolls again. More code additions: `useState(0)` for scrollTop, `startIndex`/`endIndex` calculations with `Math.floor` and `Math.ceil`, an `onScroll` handler. The formulas are highlighted in blue. Preview still shows all items (the range is calculated but not yet used). FPS stays at "3". Narrative: "From scrollTop and viewport height, calculate which items are visible."

4. **(20-30s)** Reader scrolls to THE step. Code changes: `items.map` becomes `visibleItems.map` with `.slice(startIndex, endIndex + 1)`. Absolute positioning with `top: index * itemHeight`. The diff is small -- just a few lines. But the preview TRANSFORMS: the janky list becomes a smooth-scrolling virtual list. FPS counter animates from "3" to "58" with a green flash, scales up, "THE JUMP" label appears. This is the peak teaching moment. Narrative: "The breakthrough: slice the array to only visible items."

5. **(30-38s)** Reader scrolls. A small addition: `overscan = 5` adjusts the startIndex and endIndex calculations. FPS ticks from "58" to "60". Preview becomes slightly smoother (no more blank flashes at edges during fast scroll). Narrative: "Add a buffer of 5 items above and below the viewport."

6. **(38-46s)** Reader scrolls to variable heights step. Larger code change: `heightCache` with `useMemo`, binary search function, variable `items[i].height`. FPS drops slightly from "60" to "55" (the search overhead). Preview items now have varying heights. Narrative: "For variable heights, maintain a position cache and use binary search."

7. **(46-52s)** ResizeObserver step. A `useCallback` ref with `ResizeObserver` that measures actual rendered heights and updates the cache. FPS returns to "60" (measured heights are more accurate, fewer re-renders). Narrative: "Use ResizeObserver to measure each rendered item and update the position cache dynamically."

8. **(52-60s)** Final step: `paddingTop` replaced with `transform: translateY(...)`. A one-line change. FPS stays at "60" but the preview shows silky-smooth scroll (the compositor handles transforms without layout). Narrative: "Final polish: transform:translateY avoids layout recalculation on every scroll event."

### Data & State Shape

```typescript
// --- Code step definitions (static) ---
type CodeStep = {
  index: number;
  title: string;                       // "Naive Render", "Add Spacer", etc.
  baseCode: string;                    // the code at this step (cumulative)
  diffFromPrevious: DiffHunk[];        // additions and removals vs previous step
  simulatedFps: number;                // FPS shown during scrollytelling
  highlightLines?: number[];           // lines to emphasize in the editor
};

type DiffHunk = {
  type: 'add' | 'remove';
  startLine: number;
  lines: string[];
};

// --- Runtime state ---
type BuildAlongState = {
  // Scrollytelling phase
  currentStep: number;                 // stored, 0-7
  scrollPhase: 'scrollytelling' | 'edit-mode';  // stored

  // Edit mode
  activeEditStep: number;              // stored, which tab is selected
  userEdits: Record<number, string>;   // stored, reader's code per step (keyed by step index)

  // Celebration
  celebrationActive: boolean;          // stored, true for 2s at step 3->4 transition
  celebrationTimeout: ReturnType<typeof setTimeout> | null;

  // Preview
  previewError: string | null;         // stored, runtime error from reader's code
  liveFps: number;                     // stored, measured FPS from preview

  // Code execution
  executionTimeout: boolean;           // stored, true if preview execution exceeded 2s
};

// --- Derived ---
// activeCode: string = userEdits[activeEditStep] ?? CODE_STEPS[activeEditStep].baseCode
// activeDiff: DiffHunk[] = CODE_STEPS[currentStep].diffFromPrevious (scrollytelling) or computed diff (edit mode)
// effectiveFps: number = scrollPhase === 'scrollytelling' ? CODE_STEPS[currentStep].simulatedFps : liveFps
// cumulativeCode: string = mergeSteps(0..activeEditStep, userEdits) -- for preview execution
// editedSteps: Set<number> = new Set(Object.keys(userEdits).map(Number))

// --- Static step definitions ---
const CODE_STEPS: CodeStep[] = [
  { index: 0, title: 'Naive Render',        simulatedFps: 3,  baseCode: STEP_0_CODE, diffFromPrevious: [] },
  { index: 1, title: 'Scroll Container',    simulatedFps: 3,  baseCode: STEP_1_CODE, diffFromPrevious: DIFF_0_1 },
  { index: 2, title: 'Visible Range',       simulatedFps: 3,  baseCode: STEP_2_CODE, diffFromPrevious: DIFF_1_2 },
  { index: 3, title: 'Render Visible Only', simulatedFps: 58, baseCode: STEP_3_CODE, diffFromPrevious: DIFF_2_3 },
  { index: 4, title: 'Add Overscan',        simulatedFps: 60, baseCode: STEP_4_CODE, diffFromPrevious: DIFF_3_4 },
  { index: 5, title: 'Variable Heights',    simulatedFps: 55, baseCode: STEP_5_CODE, diffFromPrevious: DIFF_4_5 },
  { index: 6, title: 'ResizeObserver',      simulatedFps: 60, baseCode: STEP_6_CODE, diffFromPrevious: DIFF_5_6 },
  { index: 7, title: 'translateY',          simulatedFps: 60, baseCode: STEP_7_CODE, diffFromPrevious: DIFF_6_7 },
];
```

**State management**: `useReducer` with actions: `SET_STEP`, `ENTER_EDIT_MODE`, `SELECT_EDIT_TAB`, `UPDATE_USER_CODE`, `SET_PREVIEW_ERROR`, `UPDATE_LIVE_FPS`, `START_CELEBRATION`, `END_CELEBRATION`.

### Primitives & Props

**ScrollytellingShell** (from shared primitives, scrollytelling variant for build-along):
```tsx
<ScrollytellingShell
  steps={BUILD_ALONG_SCROLL_STEPS}    // 8 ScrollStep objects
  renderVisual={(stepIndex) => (
    <BuildAlongVisual
      codeStep={CODE_STEPS[stepIndex]}
      userEdit={userEdits[stepIndex]}
      fps={CODE_STEPS[stepIndex].simulatedFps}
      celebrationActive={celebrationActive && stepIndex === 3}
      previewError={previewError}
    />
  )}
  visualPosition="left"
  progressBar={true}
  onStepChange={handleStepChange}
  stickyHeight="100vh"                 // full-height sticky for code+preview
/>
```

**CodeEvolution** (from shared primitives -- the diff-rendering engine):
```tsx
<CodeEvolution
  steps={CODE_STEPS}
  currentStep={currentStep}
  language="jsx"
  editable={editMode}
  onEdit={(stepIndex, newCode) => dispatch({ type: 'UPDATE_USER_CODE', step: stepIndex, code: newCode })}
  highlightAdditions={true}
  highlightRemovals={true}
  removalDisplayMs={600}               // show removed lines for 600ms before collapsing
  lineStaggerMs={40}                   // 40ms stagger per new line
/>
```

**Internal components**:
- `VirtualListPreview`: sandboxed execution of the current step's code. Uses an iframe or in-process eval with 10,000 mock items. Measures real FPS via rAF loop. Reports FPS and errors back to parent via callback.
- `StepTabs`: the numbered tab bar for edit mode. Props: `count: 8`, `active: number`, `edited: Set<number>`, `onSelect: (n) => void`.
- `CelebrationOverlay`: the brief flash/scale effect on the FPS counter at step 4. Self-dismisses after 2s.
- `PreviewErrorOverlay`: red error display in the preview panel.

### Edge Cases

**Reader edits step 2 and breaks step 3**:
- Each step's code is stored independently. In edit mode, the preview executes the CUMULATIVE code from step 0 through the active step. If the reader's edit at step 2 removes the `startIndex` variable that step 3 depends on, the preview at step 3+ shows a runtime error. The error overlay points to the breaking step: "Error at Step 3: startIndex is not defined (likely caused by your edit at Step 2)."

**Reader edits code to infinite loop**:
- Preview execution has a 2-second timeout (Web Worker with `setTimeout` kill, or `setTimeout`-based watchdog in the iframe). On timeout: preview shows "Execution timeout -- possible infinite loop" in red. Code editor is NOT frozen. Reader can edit and retry.

**Reader pastes a complete virtual list library**:
- Allowed. Tests/validation are not enforced during the build-along. The FPS counter measures real performance of whatever code runs in the preview. If they paste react-window, FPS will read 60. The learning is in the scrollytelling journey, not the code editor constraints.

**Scrolling backward through steps**:
- Code reverts to the previous step's state. Diff highlights reverse: added lines collapse, removed lines reappear (slide back in from strikethrough). FPS counter reverts to the previous step's simulated value. Preview re-renders the previous step's result.

**Very long code at later steps (step 6-7 have many additions)**:
- Code editor scrolls vertically. Max visible height: 60vh. Scroll position auto-adjusts to show the diff region (the changed lines) centered in the editor. `scrollIntoView({ behavior: 'smooth', block: 'center' })` on the first changed line.

**Preview on mobile (narrow viewport)**:
- Code and preview stack vertically (code on top, preview below). Each gets 50% of the sticky panel height. Step tabs wrap to two rows if needed. Code editor has horizontal scroll for long lines.

**Keyboard navigation**:
- `Ctrl+[` / `Ctrl+]` (or `Cmd` on Mac) navigate between steps in edit mode. `Ctrl+Enter` re-runs the preview. `Escape` exits the editor focus and returns to scroll navigation. Tab within the editor inserts 2 spaces.

### Cross-Lesson Connections

- **Implements what virt-windowing demonstrated**: The build-along is the HOW to virt-windowing's WHAT. Step 0's naive render is the same 10,000-item list from virt-windowing's step 0 (same FPS: 3, same visual: janky list). Step 3's breakthrough mirrors virt-windowing's step 2 (ghost items -> rendered items only). The reader re-encounters the same transformation, but this time they WROTE the code.
- **Implements what virt-fixed-vs-variable explained**: Steps 5-6 (variable heights, ResizeObserver) build the exact position cache and binary search that the battle demonstrated as an animation. The reader who watched the 7-step binary search in the FormulaBar now writes `binarySearch(heightCache.offsets, scrollTop)`.
- **Code from this stop feeds virt-tree-grid**: The completed virtual scroller from step 7 is the foundation for tree virtualization. virt-tree-grid shows that a virtual tree is just this scroller with a flattened hierarchy as its data source. The reader's mental model: "I built a virtual list. A virtual tree is a virtual list with expand/collapse modifying the flat data."
- **translateY vs padding-top connects to S07 (Performance)**: Step 7's `transform: translateY` vs `padding-top` is a micro-lesson in compositor vs layout properties. S07's performance section covers this comprehensively. The reader gets their first taste here: "transforms are free, layout properties are expensive."
- **FPS progression IS the narrative**: The sequence 3 -> 3 -> 3 -> 58 -> 60 -> 55 -> 60 -> 60 mirrors a real optimization journey: most of the gain comes from one insight (render only visible items), and the rest is polish. This pattern (big win + incremental polish) recurs in S07's performance optimization stops.

---

## virt-tree-grid -- Tree & 2D Grid Virtualisation
**Format**: explorable | **Effort**: large

### Interaction State Machine

**Tree Tab**:
```
                    +----------------------------+
                    |      tree-idle             |
                    | (tree rendered left,       |
                    |  flat array right,         |
                    |  all nodes collapsed       |
                    |  except root + L1)         |
                    +-----------+----------------+
                                |
                   click expand arrow on a node
                                |
                                v
                    +----------------------------+
                    |    tree-expanding          |
                    | (children animate into     |
                    |  tree view. Flat array     |
                    |  inserts entries at the    |
                    |  correct index in sync.)   |
                    +-----------+----------------+
                                |
                   animation completes (~400ms)
                                |
                                v
                    +----------------------------+
                    |    tree-expanded           |
                    | (node open. Virtual        |
                    |  window overlay on flat    |
                    |  array updates to show     |
                    |  new rendered range.)      |
                    +-----------+----------------+
                                |
              click collapse     |    scroll the tree list
                   |             |          |
                   v             |          v
            tree-collapsing      |    tree-scrolling
            (reverse of expand.  |    (virtual window
            Children removed     |    moves on flat array.
            from flat array.)    |    Items enter/exit.)
                   |             |          |
                   v             |          v
             (tree-idle with     |    (tree-idle with
              updated flat       |     updated scroll
              array)             |     position)
```

**Grid Tab**:
```
                    +----------------------------+
                    |      grid-idle             |
                    | (1000x1000 grid. Minimap   |
                    |  top-right. Viewport       |
                    |  rectangle on minimap.)    |
                    +-----------+----------------+
                                |
                   scroll grid (horizontal or vertical)
                                |
                                v
                    +----------------------------+
                    |    grid-scrolling          |
                    | (cells enter/exit at all   |
                    |  4 edges. Minimap viewport |
                    |  rectangle moves. Counter  |
                    |  updates.)                 |
                    +-----------+----------------+
                                |
                   scroll stops
                                |
                                v
                    +----------------------------+
                    |    grid-idle (new pos)     |
                    | (counter shows: "Rendering |
                    |  {N} of 1,000,000 cells")  |
                    +----------------------------+
```

**State data (Tree Tab)**:
- `treeData: TreeNode[]` (stored, 200+ nodes in hierarchical structure).
- `expandedNodeIds: Set<string>` (stored, which nodes are expanded).
- `flattenedList: FlatNode[]` (derived from treeData + expandedNodeIds).
- `treeScrollTop: number` (stored, scroll position of the tree list).
- `treeViewportHeight: number` (fixed 400px).
- `treeItemHeight: number` (fixed 32px per flattened row).
- `treeVisibleRange: { start: number, end: number }` (derived).
- `expandAnimating: string | null` (nodeId currently being animated).
- `collapseAnimating: string | null`.

**State data (Grid Tab)**:
- `gridScrollLeft: number` (stored).
- `gridScrollTop: number` (stored).
- `gridCols: number` (1000).
- `gridRows: number` (1000).
- `cellWidth: number` (80px).
- `cellHeight: number` (32px).
- `gridViewportWidth: number` (stored or derived from container).
- `gridViewportHeight: number` (stored or derived from container).
- `visibleColRange: { start: number, end: number }` (derived).
- `visibleRowRange: { start: number, end: number }` (derived).
- `renderedCellCount: number` (derived).

**Global**:
- `activeTab: 'tree' | 'grid'` (stored).

### Visual Choreography

**Tab bar**:
- DemoSandbox.Tabs with two options: "Tree Virtualisation" and "2D Grid". Active tab underline in `var(--color-accent)`. Tab switch: content cross-fades with `TRANSITION.crossfade` (150ms).

**TREE TAB -- Left panel (rendered tree)**:
- Width: 50% of the sandbox. `background: var(--color-bg)`. `border-right: 1px solid var(--color-border)`.
- Tree nodes rendered as indented rows. Each row: `height: 32px`, `padding-left: (depth * 20)px`. Content: expand/collapse arrow (triangle, 8px, `var(--color-muted)`, rotates 90deg on expand with `SPRING.snappy` 200ms) + file/folder icon (16x16, folder = `var(--diagram-layer-3)`, file = `var(--color-muted)`) + node name in `var(--font-mono)`, `var(--text-sm)`.
- Folder structure mimics a real project:
  ```
  src/
    components/
      Button.tsx
      Card.tsx
      Modal/
        Modal.tsx
        ModalHeader.tsx
        ModalBody.tsx
      List/
        List.tsx
        ListItem.tsx
        VirtualList.tsx
    hooks/
      useScroll.ts
      useVirtualize.ts
    utils/
      math.ts
      dom.ts
    App.tsx
  public/
    index.html
  package.json
  tsconfig.json
  ```
  Total: 200+ nodes across nested directories.
- Scrollable container: `height: 400px`, `overflow-y: auto`.

**TREE TAB -- Right panel (flattened array)**:
- Width: 50% of the sandbox. `background: var(--color-surface)`.
- Displays the flattened array as a vertical list of cells. Each cell: `height: 32px`, `padding: 0 var(--space-2)`, `font-family: var(--font-mono)`, `font-size: var(--text-xs)`. Content: `[{index}] {nodeName}` with indent indicator (repeated `--` for depth). E.g., `[0] src/`, `[1] -- components/`, `[2] ---- Button.tsx`.
- Virtual window overlay: a translucent rectangle over the currently rendered portion of the flat array. `background: var(--diagram-layer-0)` at 12% opacity. `border: 2px solid var(--diagram-layer-0)`. Height proportional to the number of rendered items. Moves as the tree scrolls.
- Label above the flat array: "Flattened: {flattenedList.length} items" in `var(--color-muted)`.
- Label on the window overlay: "Rendered: {renderedCount}" in `var(--diagram-layer-0)`.

**Expand animation (tree + flat array in sync)**:
- Tree side: children rows slide in below the parent. Each child: `opacity: 0, height: 0` -> `opacity: 1, height: 32px` over `DURATION.fast` (200ms) with `EASE.out`, staggered at 30ms per child. Arrow rotates from 0deg to 90deg with `SPRING.snappy`.
- Flat array side: new entries INSERT at the correct index. Entries below shift downward. Each new entry slides in from `opacity: 0, x: -10` to `opacity: 1, x: 0` over `DURATION.fast`, staggered at 30ms. Existing entries below animate `translateY` by `newChildCount * 32px` with `SPRING.snappy`.
- The synchronization is the lesson: when you expand a node, the flat array gets N new entries at index parentFlatIndex+1.

**Collapse animation**:
- Reverse of expand. Children fade out and collapse to `height: 0`. Flat array entries slide out and are removed. Entries below shift back up.

**GRID TAB -- Main grid**:
- Grid container: `width: 100%`, `height: 400px`, `overflow: auto` (both directions). CSS `scroll-behavior: auto` (not smooth -- virtual scrolling must be responsive).
- Total grid area: 1000 cols x 1000 rows = 1,000,000 cells. Each cell: `width: 80px`, `height: 32px`, `border: 1px solid var(--color-border)`.
- Cell content: `"R{row}C{col}"` in `var(--font-mono)`, `var(--text-xs)`, `color: var(--color-muted)`. Rendered cells get `background: var(--color-surface)`. Non-rendered cells (on the minimap) are gray.
- Only visible cells + 2-cell overscan on each edge are rendered. Positioned absolutely within a spacer div sized to the full grid (`width: 80000px`, `height: 32000px`).

**GRID TAB -- Minimap** (top-right overlay):
- Size: 200px x 200px. `position: absolute`, `top: var(--space-2)`, `right: var(--space-2)`. `background: var(--color-surface)`. `border: 1px solid var(--color-border)`. `border-radius: var(--radius-2)`. `opacity: 0.9`.
- The full 1000x1000 grid represented as tiny 0.2px dots in `var(--color-border)`.
- Rendered cell region: a colored rectangle on the minimap. `background: var(--diagram-layer-0)` at 25% opacity. `border: 1px solid var(--diagram-layer-0)`. Rectangle dimensions = (visibleCols / 1000 * 200)px by (visibleRows / 1000 * 200)px. Moves as the reader scrolls.
- Counter below the minimap: "Rendering {renderedCellCount} of 1,000,000 cells" in `var(--color-muted)`, `font-size: var(--text-xs)`.

**Reduced motion**:
- Expand/collapse: children appear/disappear instantly. Flat array entries appear at final position (no slide). Arrow rotation is instant. Grid minimap rectangle teleports (no smooth movement).

### Teaching Flow (First 60 Seconds)

1. **(0-5s)** DemoSandbox with two tabs: "Tree Virtualisation" (active) and "2D Grid". The tree tab shows a split view: left is a file tree with `src/`, `public/`, `package.json` visible. Only root and first-level children are expanded. Right shows the flattened array: `[0] src/`, `[1] -- components/`, `[2] -- hooks/`, `[3] -- utils/`, `[4] -- App.tsx`, `[5] public/`, `[6] -- index.html`, `[7] package.json`, `[8] tsconfig.json`. A blue overlay rectangle spans items [0]-[12] (the virtual window). Label: "Flattened: 9 items".

2. **(5-15s)** Reader clicks the expand arrow on `components/`. Tree side: four children slide in (Button.tsx, Card.tsx, Modal/, List/). Flat array side: four new entries insert at position [2] in sync. Items below shift down. The flat array now shows 13 items. The virtual window overlay adjusts. The reader sees: expanding a tree node is just INSERTING into a flat list at the right position.

3. **(15-25s)** Reader expands `Modal/`. Three more children insert (Modal.tsx, ModalHeader.tsx, ModalBody.tsx). Flat array grows to 16 items. Reader expands `List/`: three more children (List.tsx, ListItem.tsx, VirtualList.tsx). Flat array: 19 items. The virtual window now only covers ~12 of the 19 visible entries. Ghost items appear outside the window. The reader sees: the tree is an ILLUSION -- virtualization only sees a flat list with indentation data.

4. **(25-35s)** A nudge text fades in: "Scroll the tree to see virtualisation in action." Reader scrolls the tree. Items at the top exit (fade out in flat array). Items at the bottom enter (fade in). The window overlay slides down the flat array. The experience is identical to virt-windowing's free-play, but the DATA SOURCE is a dynamically-sized flattened tree.

5. **(35-40s)** Reader collapses `components/`. All its children (and grandchildren) vanish from both the tree and the flat array simultaneously. The flat array contracts. Window overlay adjusts. The reader viscerally feels: collapse = bulk removal from the flat array.

6. **(40-45s)** Reader switches to the "2D Grid" tab. The view changes to a spreadsheet-like grid. Visible: maybe 10 columns and 12 rows (~120 cells). A minimap in the top-right shows a tiny colored rectangle in the top-left corner of a vast gray field.

7. **(45-55s)** Reader scrolls the grid right and down. Cells enter from the right and bottom edges, exit from the left and top. The minimap rectangle moves accordingly. Counter reads: "Rendering 150 of 1,000,000 cells". The reader scrolls to the far bottom-right corner: "R999C999". Minimap rectangle is now in the bottom-right corner. The gap between 150 rendered cells and 1,000,000 total is the lesson.

8. **(55-60s)** Reader scrolls back to center. Counter still shows ~150. The constancy reinforces virt-windowing's lesson but in TWO dimensions.

### Data & State Shape

```typescript
// --- Tree data ---
type TreeNode = {
  id: string;                          // "src", "src/components", "src/components/Button.tsx"
  name: string;                        // "Button.tsx"
  type: 'folder' | 'file';
  children: string[];                  // child node IDs (ordered)
  depth: number;                       // 0 for root, 1 for first-level, etc.
  parentId: string | null;
};

type FlatNode = {
  nodeId: string;                      // reference to TreeNode.id
  name: string;
  depth: number;                       // for indentation
  type: 'folder' | 'file';
  isExpanded: boolean;                 // for folder nodes
  hasChildren: boolean;                // for showing expand arrow
};

// --- Grid data ---
type GridCell = {
  row: number;
  col: number;
  content: string;                     // "R{row}C{col}"
};

// --- Component state ---
type TreeGridState = {
  activeTab: 'tree' | 'grid';         // stored

  // Tree state
  treeNodes: Record<string, TreeNode>; // stored, static structure
  expandedNodeIds: Set<string>;        // stored, mutable
  treeScrollTop: number;               // stored
  expandAnimating: string | null;      // stored, currently-animating node
  collapseAnimating: string | null;    // stored

  // Grid state
  gridScrollLeft: number;              // stored
  gridScrollTop: number;               // stored
};

// --- Tree derived ---
// flattenedList: FlatNode[] = flattenTree(treeNodes, expandedNodeIds)
//   Algorithm: DFS from root. For each node, add to flat list.
//   If node is a folder and expandedNodeIds.has(node.id), recurse into children.
//   Otherwise skip children. This is the ENTIRE virtualisation trick for trees.
// treeVisibleRange: { start, end } = computeRange(treeScrollTop, 400, 32, 3 /*overscan*/)
// treeRenderedNodes: FlatNode[] = flattenedList.slice(treeVisibleRange.start, treeVisibleRange.end + 1)
// treeRenderedCount: number = treeRenderedNodes.length
// treeTotalHeight: number = flattenedList.length * 32

// --- Grid derived ---
// visibleColRange: { start, end } = { Math.max(0, Math.floor(gridScrollLeft / 80) - 2), Math.min(999, Math.ceil((gridScrollLeft + viewportWidth) / 80) + 2) }
// visibleRowRange: { start, end } = { Math.max(0, Math.floor(gridScrollTop / 32) - 2), Math.min(999, Math.ceil((gridScrollTop + viewportHeight) / 32) + 2) }
// renderedCells: GridCell[] = cartesian product of visibleRowRange x visibleColRange
// renderedCellCount: number = (visibleColRange.end - visibleColRange.start + 1) * (visibleRowRange.end - visibleRowRange.start + 1)
// minimapViewportRect: { x, y, width, height } = scaled to 200x200px minimap

type FlattenTreeFn = (
  nodes: Record<string, TreeNode>,
  expandedIds: Set<string>,
  rootId: string
) => FlatNode[];
```

**State management**: `useReducer` with actions: `SET_TAB`, `TOGGLE_EXPAND`, `SET_TREE_SCROLL`, `SET_GRID_SCROLL`, `EXPAND_ANIMATION_DONE`, `COLLAPSE_ANIMATION_DONE`.

### Primitives & Props

**DemoSandbox** (wraps the entire explorable):
```tsx
<DemoSandbox title="Tree & Grid Virtualisation">
  <DemoSandbox.Tabs
    options={['tree', 'grid'] as const}
    value={activeTab}
    onChange={setActiveTab}
    formatOption={(v) => v === 'tree' ? 'Tree Virtualisation' : '2D Grid'}
  />
  {activeTab === 'tree' ? <TreeVirtualPanel ... /> : <GridVirtualPanel ... />}
</DemoSandbox>
```

**Internal components**:
- `TreeVirtualPanel`: the split-view tree + flat array. Contains:
  - `VirtualTree`: left panel, renders the file browser tree using the virtual list technique (only renders visible flattened nodes).
  - `FlatArrayViz`: right panel, shows the flat array with window overlay.
  - `ExpandAnimator`: handles staggered insert/remove animation for tree and flat array in sync.
- `GridVirtualPanel`: the 2D grid with minimap. Contains:
  - `VirtualGrid`: the scroll container with absolutely positioned cells.
  - `GridMinimap`: 200x200px overview with rendered-region rectangle.
  - `CellCounter`: the "Rendering N of 1,000,000" label.

### Edge Cases

**Expanding a deeply nested folder (depth 5+)**:
- Indentation at depth 5: `5 * 20px = 100px`. If the tree panel is narrow (<300px), deep nodes may have their text clipped. Add `text-overflow: ellipsis`, `overflow: hidden`, `white-space: nowrap` on node names. Tooltip on hover shows full path.

**Expanding a folder with 50+ children**:
- Stagger animation capped at 20 visible children (30ms * 20 = 600ms). Remaining children appear instantly after the 20th. The flat array shows all insertions but only animates the ones within the virtual window.

**Rapid expand/collapse (clicking multiple folders quickly)**:
- Queue expand/collapse operations. If a new expand is triggered while an animation is in progress, the current animation completes instantly (jumps to end state) and the new one begins. Max queue depth: 1.

**Grid scroll to far edge**:
- At col 999: no right overscan. Cells render flush to the edge. No visual glitch -- the overscan reduction is handled by `Math.min(999, ...)`.

**Grid container resize**:
- `visibleColRange` and `visibleRowRange` recompute on resize (via `ResizeObserver` on the grid container). Minimap rectangle adjusts proportionally.

**Keyboard navigation (tree)**:
- `ArrowDown`/`ArrowUp` move focus through the flat list. `ArrowRight` on a collapsed folder expands it. `ArrowLeft` on an expanded folder collapses it. `ArrowLeft` on a file or collapsed folder moves focus to parent. `Home`/`End` jump to first/last visible node. `role="tree"`, `role="treeitem"`, `aria-expanded`, `aria-level`.

**Keyboard navigation (grid)**:
- `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight` move the focused cell. `Ctrl+ArrowRight` jumps to last column. `Ctrl+ArrowDown` jumps to last row. `role="grid"`, `role="row"`, `role="gridcell"`.

**Screen reader (tree)**:
- Each tree item: `aria-label="{name}, {type}, level {depth}"`. Expanded folders: `aria-expanded="true"`. `aria-setsize` and `aria-posinset` for virtualized items within the visible range.

### Cross-Lesson Connections

- **Applies virt-windowing to hierarchical data**: The tree tab's virtual window overlay is the SAME visual from virt-windowing (blue translucent rectangle showing rendered items). The reader recognizes it. The lesson: "tree virtualisation IS list virtualisation, with a flattening step."
- **Flat array = the data from virt-variable-height**: The flattened array is the same structure the reader built in the build-along. The virtual list that renders the flat array uses the same `startIndex`/`endIndex`/`translateY` technique from step 7. The reader sees their own code's concepts applied to tree data.
- **2D grid extends the mental model**: After seeing 1D windowing (virt-windowing) and 1D-with-flattening (tree tab), the grid tab shows 2D windowing. The reader generalizes: "windowing works on any axis. It is not specific to vertical lists."
- **Minimap visual language feeds virt-canvas-dom**: The grid minimap (tiny dots + colored viewport rectangle) is the same visual concept as virt-canvas-dom's canvas rendering. The reader who scrolled the grid and watched the minimap rectangle move will recognize the same "tiny rendered portion of a huge space" concept when Canvas renders 5,000 circles while only a few are visible on screen.
- **Tree flattening connects to S05 (App State)**: The DFS flatten algorithm (walk tree, skip collapsed children) is the same recursive data traversal pattern used in S05's state management stops when rendering nested component trees or normalizing data.

---

## virt-canvas-dom -- Canvas vs DOM Battle
**Format**: battle | **Effort**: large

### Interaction State Machine

```
                    +----------------------------+
                    |          idle              |
                    | (both panels render        |
                    |  circles. Item count: 100. |
                    |  Animation off. Metrics    |
                    |  stable at 60fps both.)    |
                    +-----------+----------------+
                                |
              drag item count slider  |  toggle animation
                       |              |         |
                       v              |         v
            +---------------------+   |  +---------------------+
            |  count-adjusting    |   |  |   animating         |
            | (circles add/remove |   |  | (all circles move   |
            |  live. FPS updates  |   |  |  randomly. FPS      |
            |  in real-time.)     |   |  |  updates live.)     |
            +---------+-----------+   |  +---------+-----------+
                      |               |            |
            release slider            |   click on a circle
                      |               |            |
                      v               |            v
                   (idle with         |  +---------------------+
                    new count)        |  |   item-selected     |
                                      |  | (DOM: instant click |
                                      |  |  handler highlights.|
                                      |  |  Canvas: visible    |
                                      |  |  delay as hit test  |
                                      |  |  iterates.)         |
                                      |  +---------+-----------+
                                      |            |
                                      |  click elsewhere / Escape
                                      |            |
                                      |            v
                                      |         (idle or animating)
                                      |
              Tab key / screen reader |
                                      |
                                      v
                    +---------------------+
                    | accessibility-test  |
                    | (DOM side: focus    |
                    |  rings work. Canvas |
                    |  side: nothing.)    |
                    +---------+-----------+
                              |
                    toggle "Hybrid" mode
                              |
                              v
                    +---------------------+
                    | hybrid-demo         |
                    | (Canvas for shapes, |
                    |  DOM overlay for    |
                    |  labels/tooltips.   |
                    |  Best of both.)     |
                    +---------------------+
```

**State data**:
- `itemCount: number` (stored, 100-50000, default 5000).
- `animating: boolean` (stored, default false).
- `selectedItemId: string | null` (stored).
- `selectedSide: 'dom' | 'canvas' | null` (stored).
- `hitTestInProgress: boolean` (stored, true while canvas iterates for click).
- `hitTestIterations: number` (stored, how many circles checked so far).
- `hybridMode: boolean` (stored, default false).
- `domFps: number` (stored, measured from DOM panel's rAF loop).
- `canvasFps: number` (stored, measured from Canvas panel's rAF loop).
- `domRenderTimeMs: number` (stored, time to paint one frame on DOM side).
- `canvasRenderTimeMs: number` (stored, time to paint one frame on Canvas side).
- `domMemoryMb: number` (stored, estimated from DOM node count * ~1KB per node).
- `canvasMemoryMb: number` (stored, estimated from canvas buffer size).
- `fpsHistory: { dom: number[], canvas: number[] }` (stored, last 60 data points for the graph).

**Transitions**:
- `idle -> count-adjusting`: drag the item count Dial.
- `count-adjusting -> idle`: release the Dial.
- `idle -> animating`: click "Animate" toggle.
- `animating -> idle`: click "Animate" toggle again.
- `idle/animating -> item-selected`: click a circle on either side.
- `item-selected -> idle/animating`: click elsewhere or press Escape.
- Any state -> `accessibility-test`: press Tab key.
- Any state -> `hybrid-demo`: toggle the "Hybrid" switch.

### Visual Choreography

**Overall layout**:
- BattleArena with two panels side by side (50/50). Left: "DOM" label in `var(--diagram-layer-0)` (blue). Right: "Canvas" label in `var(--diagram-layer-3)` (gold). Shared control bar above. Live metrics dashboard below.

**Shared control bar**:
- **Item Count** Dial: `min=100`, `max=50000`, `step=100`, `format=(v) => v >= 1000 ? \`${(v/1000).toFixed(0)}k\` : String(v)`. Default: 5000.
- **Animate** toggle: a segmented control with "Static" (default) and "Animate" options. When "Animate" is active, the label pulses gently.
- **Hybrid** toggle: "Standard" (default) and "Hybrid" options. Only affects the Canvas side.
- **Click to Select**: a label reminding the reader they can click circles.

**Circle rendering (both sides)**:
- Each circle: `radius: 6px` (scales to 4px above 10k items, 3px above 30k items). Random position within the panel (seeded, deterministic). Random color from a palette of 8 colors derived from `--diagram-layer-0` through `--diagram-layer-7`. `fill-opacity: 0.8`.
- DOM side: each circle is a `<div>` with `border-radius: 50%`, `position: absolute`, `width/height: 12px`. Inline style for position and background color.
- Canvas side: each circle is drawn with `ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI*2); ctx.fill()` in the canvas `2d` context.

**Animation mode**:
- Each circle moves randomly: velocity vector `(vx, vy)` per circle, ranging -1 to +1 px/frame. Circles bounce off panel edges. Movement is calculated per-frame in `requestAnimationFrame`.
- DOM side: each circle's `style.transform = \`translate(${x}px, ${y}px)\`` updates every frame.
- Canvas side: canvas clears and redraws all circles every frame.

**FPS divergence (the key visual)**:
- Below the panels, a real-time line graph (mini chart, 300px wide x 80px tall). X-axis: last 60 frames. Y-axis: 0-60fps. Two lines: DOM in `var(--diagram-layer-0)`, Canvas in `var(--diagram-layer-3)`.
- At 100 items: both lines flat at 60. Graph is boring.
- At 1,000 items: DOM dips slightly, Canvas stays flat.
- At 5,000 items: DOM drops to ~20fps, Canvas stays at 60. The lines DIVERGE visibly. This crossover is the main teaching moment.
- At 10,000+: DOM drops below 10fps, Canvas stays at 55-60.
- At 50,000: DOM at 1-3fps, Canvas at 40-50fps.
- The divergence threshold (where DOM starts losing) should be visually marked on the graph with a vertical dashed line and label: "Crossover: ~2,000 items".

**Metric cards** (below the graph):
- Four metric cards per side (8 total, 4 per column):
  - **FPS**: large number. Green/yellow/red coloring same as virt-windowing.
  - **DOM Nodes**: DOM side shows the actual count. Canvas side shows "1" (the canvas element). DOM node count in red when high.
  - **Render Time**: milliseconds per frame. DOM in ms. Canvas in ms. Color: green < 4ms, yellow 4-16ms, red > 16ms.
  - **Memory (est.)**: estimated memory. DOM: itemCount * ~1KB (each div is ~1KB with styles). Canvas: canvas width * height * 4 bytes (pixel buffer). Show in MB.

**Click-to-select interaction**:

*DOM side*:
- Click a circle: the `<div>` has an `onClick` handler. Instant response. Selected circle gets `border: 2px solid white`, `box-shadow: 0 0 8px var(--diagram-layer-0)`, `z-index: 10`. A tooltip appears: "Item #{id} -- Selected via DOM event handler" in `var(--color-text)`, `font-size: var(--text-xs)`.

*Canvas side*:
- Click on the canvas: triggers a hit test. The hit test iterates through ALL circles, checking `distance(clickX, clickY, circleX, circleY) < radius`. The iteration is VISIBLE: a counter appears at the click location: "Checking: 1... 500... 2000... 5000" counting up at 30ms intervals (simulated delay -- the actual computation is fast, but the animation shows the algorithmic cost). After finding the circle, it highlights with a drawn ring: `ctx.strokeStyle = white`, `ctx.lineWidth = 2`, `ctx.arc(...)`. Tooltip: "Item #{id} -- Found via hit test (checked {N} circles)".
- The simulated delay makes the O(n) cost tangible. At 100 items it is nearly instant. At 5,000 items the counter takes 1.5s. At 50,000 items: 4.5s.

**Accessibility test**:
- When reader presses Tab:
  - DOM side: focus rings appear on circles. Each circle is a `<div>` with `tabIndex={0}`, `role="button"`, `aria-label="Circle {id}, color {color}"`. Focus moves sequentially. Screen readers announce each circle.
  - Canvas side: NOTHING happens. No focus ring, no screen reader announcement. The canvas element itself may receive focus, but individual circles are invisible to assistive technology. A label appears on the Canvas panel: "Canvas is invisible to assistive technology" in `var(--color-error)`, `font-size: var(--text-xs)`.
- This contrast is the accessibility discovery.

**Hybrid mode** (Canvas side only):
- When hybrid mode is toggled on: the Canvas panel adds a DOM overlay layer. Canvas still renders all circles. But for the TOP 10 (or all visible if < 100) circles, transparent DOM elements (`<div>` with `position: absolute`, `pointer-events: auto`) overlay the canvas circles. These DOM elements have `tabIndex`, `aria-label`, `onClick`, and tooltip support.
- A label appears: "Hybrid: Canvas renders shapes, DOM handles interaction" in `var(--color-success)`.
- FPS stays near Canvas levels (the DOM overlay is only 10 elements). Accessibility works for the overlay elements. Click selection is instant for overlaid circles, hit-test for non-overlaid ones.

**Reduced motion**:
- "Animate" mode is still available but circles move 50% slower. FPS graph updates normally. Hit test counter appears at final value immediately (no counting animation). No spring or scale effects on selection.

### Teaching Flow (First 60 Seconds)

1. **(0-5s)** Two panels: "DOM" on left, "Canvas" on right. Both show 5,000 colored circles scattered randomly. Control bar: Item Count at 5000, Animate off, Hybrid off. Below: a real-time FPS graph with two lines both at 60fps. Metric cards show identical stats: FPS 60, Render Time ~2ms.

2. **(5-12s)** Reader clicks "Animate". All 10,000 circles (5k per side) start moving randomly, bouncing off edges. The FPS graph IMMEDIATELY diverges: DOM line drops from 60 to ~20fps. Canvas line stays at 60fps. DOM metric card turns yellow then red. Canvas stays green. The visual difference is stark: the DOM panel visibly stutters while the Canvas panel is butter-smooth.

3. **(12-20s)** Reader drags the Item Count slider. At 100: both lines converge back to 60. At 1,000: DOM is 50fps, Canvas 60fps. At 10,000: DOM collapses to 8fps, Canvas holds at 58fps. The divergence on the graph has a visible knee -- a crossover point around 2,000 items where Canvas starts winning decisively. A dashed line and label appear on the graph at this threshold.

4. **(20-30s)** Reader stops animating (clicks "Static"). Both panels freeze. Reader clicks a circle on the DOM side: instant highlight with tooltip -- "Selected via DOM event handler". Reader clicks a circle on the Canvas side: a counter starts ticking up at the click location -- "Checking: 1... 1000... 3500... 5000" -- then the circle highlights. Tooltip: "Found via hit test (checked 5,000 circles)". The reader sees: DOM has free event handling. Canvas must manually check every shape.

5. **(30-40s)** Reader presses Tab. On the DOM side: focus ring appears on a circle, moves through circles with repeated Tab. On the Canvas side: nothing happens. A red label appears: "Canvas is invisible to assistive technology." The reader discovers the critical tradeoff: Canvas trades accessibility for performance.

6. **(40-50s)** Reader toggles "Hybrid" mode on the Canvas side. A DOM overlay appears over the top 10 circles (visible as faint border-rings). Now Tab on the Canvas side focuses these 10 elements. Screen reader announces them. Click on an overlaid circle is instant. A green label: "Hybrid: Canvas shapes + DOM interaction."

7. **(50-60s)** Reader re-enables animation with Hybrid on. FPS stays near Canvas levels (~58fps with 10 DOM overlay elements). The hybrid approach maintains Canvas performance while restoring interactivity for important elements. The reader has now seen all three approaches: pure DOM (accessible but slow), pure Canvas (fast but inaccessible), hybrid (fast and partially accessible).

### Data & State Shape

```typescript
// --- Circle data ---
type CircleData = {
  id: string;                          // "circle-{index}"
  x: number;                          // current x position
  y: number;                          // current y position
  vx: number;                         // velocity x (-1 to 1)
  vy: number;                         // velocity y (-1 to 1)
  radius: number;                     // 6, 4, or 3 depending on item count
  color: string;                      // from diagram-layer palette
  colorIndex: number;                 // 0-7 for palette index
};

// --- Battle state ---
type CanvasVsDOMState = {
  // Controls
  itemCount: number;                   // stored, 100-50000
  animating: boolean;                  // stored
  hybridMode: boolean;                 // stored

  // Circle data
  circles: CircleData[];               // stored, regenerated when itemCount changes

  // Selection
  selectedItemId: string | null;       // stored
  selectedSide: 'dom' | 'canvas' | null;  // stored
  hitTestProgress: number | null;      // stored, null when not testing, 0-itemCount during test

  // Metrics
  domFps: number;                      // stored, rAF-measured
  canvasFps: number;                   // stored, rAF-measured
  domRenderTimeMs: number;             // stored, per-frame paint time
  canvasRenderTimeMs: number;          // stored, per-frame paint time
  fpsHistory: {
    dom: number[];                     // last 60 readings
    canvas: number[];                  // last 60 readings
  };

  // Accessibility test state
  tabTestActive: boolean;              // stored, true when reader pressed Tab
  domFocusedIndex: number | null;      // stored, which DOM circle has focus
};

// --- Derived ---
// circleRadius: number = itemCount > 30000 ? 3 : itemCount > 10000 ? 4 : 6
// domNodeCount: number = itemCount (one div per circle)
// canvasNodeCount: 1 (the canvas element itself)
// domMemoryMb: number = (itemCount * 1024) / (1024 * 1024)  // ~1KB per DOM node
// canvasMemoryMb: number = (canvasWidth * canvasHeight * 4) / (1024 * 1024)  // RGBA pixel buffer
// crossoverPoint: number = estimated from fpsHistory divergence (~2000 items)
// hybridOverlayCount: number = Math.min(10, itemCount)  // top-10 circles get DOM overlay
// fpsColor(fps): 'green' | 'yellow' | 'red' = standard thresholds

// --- Animation loop (runs in rAF) ---
type AnimationFrame = {
  updateCirclePositions: (circles: CircleData[], panelWidth: number, panelHeight: number) => void;
  renderDom: (circles: CircleData[]) => void;       // update div transforms
  renderCanvas: (ctx: CanvasRenderingContext2D, circles: CircleData[]) => void;  // clear + redraw
  measureFps: (timestamp: number) => number;
};
```

**State management**: `useReducer` for UI state + `useRef` for animation loop state (circles array, rAF ID, frame timestamps). Circles are updated in-place via refs during animation to avoid React re-renders per frame. React state only updates for FPS display (throttled to 4 updates/sec).

### Primitives & Props

**BattleArena** (from shared primitives):
```tsx
<BattleArena
  approaches={[
    { id: 'dom', label: 'DOM (divs)', color: 'var(--diagram-layer-0)' },
    { id: 'canvas', label: 'Canvas (2d)', color: 'var(--diagram-layer-3)' },
  ]}
  sharedControls={[
    { type: 'dial', id: 'item-count', label: 'Items', min: 100, max: 50000, step: 100 },
    { type: 'segment', id: 'animate', options: ['Static', 'Animate'] },
    { type: 'segment', id: 'hybrid', options: ['Standard', 'Hybrid'], appliesToApproach: 'canvas' },
  ]}
  metrics={[
    { id: 'fps', label: 'FPS', format: 'number-colored' },
    { id: 'nodes', label: 'DOM Nodes', format: 'number' },
    { id: 'render-time', label: 'Frame Time', format: 'milliseconds' },
    { id: 'memory', label: 'Memory (est.)', format: 'megabytes' },
  ]}
  renderApproach={(id) => (
    id === 'dom'
      ? <DOMCirclePanel circles={circles} onSelect={handleSelect} />
      : <CanvasCirclePanel circles={circles} onSelect={handleSelect} hybrid={hybridMode} />
  )}
/>
```

**DemoSandbox**: wraps the entire battle. `title="Canvas vs DOM"`.

**Dial** (from dialkit): item count slider.

**Internal components**:
- `DOMCirclePanel`: renders circles as `<div>` elements with absolute positioning. Each div has `onClick`, `tabIndex`, `aria-label`. Animation via `transform` updates in rAF. Measures own FPS.
- `CanvasCirclePanel`: renders circles on a `<canvas>` element. Clear-and-redraw loop in rAF. Hit-test on click (iterate all circles, check distance). Hybrid mode adds a DOM overlay layer for top-N circles.
- `FPSGraph`: real-time sparkline/line chart. Two series. 300x80px. Axes labeled. Divergence line drawn dynamically.
- `MetricDashboard`: 4 metric cards per side, arranged in a grid below the graph. Color-coded values.
- `HitTestCounter`: the animated counter that appears at click location on canvas, counting up through checked circles.
- `AccessibilityLabel`: the red/green label that appears when Tab is pressed, describing accessibility state per side.
- `HybridOverlay`: transparent DOM layer over canvas for interactive elements.

### Edge Cases

**50,000 items on low-end device**:
- DOM side will freeze the browser. Add a warning at 20,000+ items: "High item counts may cause your browser to slow down" in `var(--diagram-layer-3)`. The warning does NOT prevent the action -- freezing IS the lesson.
- If DOM FPS drops below 2fps for 3+ seconds: add a "DOM panel paused to prevent browser freeze" label and stop the DOM animation loop. Canvas continues normally.

**Canvas click at exact edge between two circles**:
- Hit test checks in reverse order (last drawn = top z-order). First circle whose center is within `radius` of click point wins. If click is outside all circles: deselect (no tooltip, no counter animation).

**Hybrid mode with animation on**:
- The 10 DOM overlay elements must track their corresponding canvas circles' positions. Update overlay `transform` in the same rAF as canvas draw. Potential issue: if circles move fast, overlays may lag by 1 frame. Acceptable -- the 1-frame lag is invisible.

**Window resize**:
- Canvas must resize: `canvas.width = container.clientWidth; canvas.height = container.clientHeight`. Circles that were outside the new bounds teleport to within bounds. FPS graph width adjusts. Metric cards reflow.

**Mobile touch events**:
- Canvas hit test works with touch: `touchstart` event, extract `touch.clientX/Y`, same logic. DOM circles: `onClick` works with touch natively. Hover states (tooltips) activate on long-press (300ms hold).

**Tab navigation with 5,000 DOM circles**:
- Tabbing through 5,000 elements is impractical. Cap focus navigation at 20 circles (first 20 in DOM order). After circle 20, Tab moves to the next control. Label: "Showing focus for first 20 of {itemCount} circles."
- Canvas side: Tab moves directly past the canvas (it has `tabIndex={-1}` when not in hybrid mode). In hybrid mode: Tab cycles through the 10 overlay elements.

**Memory estimation accuracy**:
- DOM memory is rough (~1KB/node is an approximation; real overhead varies by browser and styles). Canvas memory is more accurate (width * height * 4 bytes for the RGBA buffer). Label these as "estimated" in the metric cards.

**FPS measurement accuracy**:
- Use `performance.now()` in `requestAnimationFrame`. Rolling window of last 60 timestamps. FPS = 60000 / (last - first) where first/last are 60 frames apart. This smooths single-frame spikes. Report to nearest integer.

### Cross-Lesson Connections

- **Completes the virtualisation toolkit**: The reader has now seen four rendering strategies for large datasets: virtual DOM list (virt-windowing), virtual tree (virt-tree-grid), 2D virtual grid (virt-tree-grid), and Canvas bypass (this stop). Each has tradeoffs. This final stop shows that virtualization is not the only answer -- sometimes you bypass the DOM entirely.
- **FPS counter consistency**: The same red/yellow/green FPS counter design used in every stop of this section. The reader has been trained to read it since virt-windowing. Here it appears TWICE (one per side), and the DIVERGENCE between them is the primary insight.
- **Accessibility as a first-class concern**: The Tab/screen-reader discovery in this stop is the most direct accessibility lesson in the section. It connects forward to S09 (Security) which covers ARIA and accessible patterns. The hybrid approach demonstrated here is a practical solution the reader can apply immediately.
- **Crossover graph connects to S07 (Performance)**: The FPS divergence graph with its crossover point is the same analytical pattern used in S07 when comparing rendering strategies (CSR vs SSR vs SSG) at different data sizes. The reader learns to look for "at what N does approach A beat approach B" -- a general performance analysis skill.
- **Section 4 arc completion**: The section progresses linearly: windowing fundamentals (virt-windowing) -> height calculation tradeoffs (virt-fixed-vs-variable) -> build it from scratch (virt-variable-height) -> extend to trees and grids (virt-tree-grid) -> escape the DOM entirely (virt-canvas-dom). Each stop assumes all previous knowledge. By this final stop, the reader has a complete mental model: virtualize when you can, canvas when you must, hybrid when you need both.
