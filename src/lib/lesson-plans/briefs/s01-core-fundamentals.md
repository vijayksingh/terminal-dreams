# Section 1: Core Fundamentals -- Implementation Briefs

> 9 stops. Each brief is self-contained: an implementing agent should be able to
> build the component without asking any design questions.
>
> **Design tokens** live in `src/styles/tokens.css`.
> **Motion presets** live in `src/lib/motion.ts` (SPRING, TRANSITION, LOOP, DURATION, DELAY, STAGGER).
> **Convention**: CSS Modules for layout, Tailwind for internals, `var(--*)` for every color.

---

## core-box-model -- Box Model Explorable
**Format**: explorable | **Effort**: medium

### Interaction State Machine

```
                          +-----------+
                          |   idle    |  (initial: reader sees the box, no interaction yet)
                          +-----+-----+
                                |
                     [nudge fades in after 3s]
                                |
                          +-----v-----+
                          |  nudged   |  (hint text visible: "try dragging the edges")
                          +-----+-----+
                                |
                     [pointerdown on any edge handle]
                                |
                          +-----v-----+
            +------------>| dragging  |<-----------+
            |             +-----+-----+            |
            |                   |                  |
            |        [pointermove: delta]           |
            |                   |                  |
            |     +-------------v-----------+      |
            |     | live-update             |      |
            |     | (layer sizes + formula  |      |
            |     |  recalculate per frame) |      |
            |     +-------------+-----------+      |
            |                   |                  |
            |        [pointerup / pointercancel]   |
            |                   |                  |
            |             +-----v-----+            |
            +------------ |  settled  |  ----------+
                          +-----+-----+
                                |
                     [first drag complete && !boxSizingToggled]
                                |
                          +-----v-----+
                          | chip-shown|  ("try toggling box-sizing" chip appears)
                          +-----+-----+
                                |
                     [click box-sizing toggle]
                                |
                          +-----v-----+
                          | toggling  |  (animated transition: content-box <-> border-box)
                          +-----+-----+
                                |
                     [animation completes, 600ms]
                                |
                          +-----v-----+
                          |  settled  |  (back to free exploration)
                          +-----+-----+
                                |
                     [margin dragged to negative OR margin set to auto]
                                |
                          +-----v-----+
                          | advanced  |  (all discoveries unlocked)
                          +-----+-----+
                                |
                     [3+ discoveries triggered]
                                |
                          +-----v-----+
                          | summary   |  ("what you discovered" panel fades in)
                          +-----------+
```

**Data driving each state:**
- `idle`: no interaction count
- `nudged`: `interactionCount === 0 && elapsed > 3000`
- `dragging`: `activeLayer: 'content' | 'padding' | 'border' | 'margin'`, `dragAxis: 'x' | 'y' | 'both'`, `dragDelta: { dx: number, dy: number }`
- `toggling`: `boxSizing: 'content-box' | 'border-box'`, animation progress 0-1
- `summary`: `discoveredSet: Set<string>` with size >= 3

### Visual Choreography

**Static layout (no animation)**:
- Container: 600px wide, centered. Background: `var(--color-surface)`.
- The "box" is rendered as 4 concentric rectangles:
  - Content: solid fill `var(--diagram-layer-0)` (blue, hue 200). Initial size 200x150px.
  - Padding: fill `var(--diagram-layer-1)` (green, hue 140) at 30% opacity. Initial 0px all sides.
  - Border: fill `var(--diagram-layer-2)` (purple, hue 300) at 50% opacity. Initial 3px all sides.
  - Margin: fill `var(--diagram-layer-4)` (orange, hue 30) at 15% opacity with 2px dashed outline `var(--diagram-layer-4)`. Initial 0px all sides.
- Each layer edge has a drag handle: 24x8px rounded pill, same color as the layer but full opacity, centered on each edge (top, right, bottom, left). Cursor: `ew-resize` for left/right, `ns-resize` for top/bottom.
- MeasureLine components: thin 1px lines with dimension labels (e.g. "200px") connecting opposite edges of each layer. These update live.
- FormulaBar: fixed below the box, 100% container width, monospace font `var(--font-mono)`, `var(--text-sm)`. Shows: `content + padding-L + padding-R + border-L + border-R = total`. Numbers in the formula are colored to match their layer.

**Animations:**
1. **Nudge pulse** (3s after mount): The padding edge handles pulse once. Scale 1 -> 1.4 -> 1, 600ms, `SPRING.snappy`. CSS `@keyframes` with `prefers-reduced-motion: no-preference` guard.
2. **Drag feedback**: On pointerdown, handle scales to 1.2 (SPRING.quick, 150ms). Layer resizes in real-time via React state driving inline width/height -- no animation library needed, raw state + CSS transitions disabled during drag for responsiveness.
3. **Box-sizing toggle**: When switching content-box -> border-box:
   - Outer box dimensions freeze (via framer-motion `layout` animation, TRANSITION.enterCard = 300ms easeOut).
   - Content area shrinks inward -- its background color briefly flashes white at 10% opacity (150ms) to draw the eye.
   - FormulaBar formula text morphs: `content + padding + border = total` rearranges to `total - padding - border = content`. Use framer-motion `AnimatePresence` with `layout` on each formula segment. Duration 400ms, SPRING.snappy.
   - Dimension labels animate to new values (countUp, 300ms).
4. **Margin auto**: When margin is set to "auto" (via a small `auto` button on the margin handle), the box slides to center with SPRING.gentle (stiffness 300, damping 20). The margin MeasureLines on left and right animate to equal values.
5. **Negative margin**: When margin is dragged past 0, the neighbor element (a 100px-tall grey placeholder below the box) slides up, overlapping. Use `translateY` for the neighbor; overlap region gets a red-tinted overlay at 15% opacity.
6. **Summary fade-in**: Opacity 0 -> 1, translateY 20px -> 0, 500ms, TRANSITION.progress.

**Reduced motion**: All transitions become instant (duration: 0). Drag still works (it is inherently frame-by-frame). Nudge pulse replaced with a static border highlight. Box-sizing toggle snaps values instantly.

### Teaching Flow (First 60 Seconds)

1. **0s**: Reader sees a 200x150px blue rectangle centered on a 600px canvas. No text, no instructions. Below the box: a FormulaBar showing `200 + 0 + 0 + 6 + 0 + 0 = 206px` (content + padding-L + padding-R + border-L + border-R + margin-L + margin-R). The padding handles are barely visible (small pills on each edge).
2. **3s**: If no interaction, the four padding handles pulse once (scale 1 -> 1.4 -> 1 over 600ms). A 12px monospace label fades in below the box: "drag the edges" in `var(--color-muted)`. This label fades out after 5s or on first interaction.
3. **Reader drags the right padding handle outward**: The green padding layer grows from 0 to whatever they drag (say 40px). The FormulaBar updates live: `200 + 0 + 40 + 6 + 0 + 0 = 246px`. The total number at the end pulses briefly (scale 1.05, 200ms) each time it changes.
4. **After first successful drag completes (pointerup)**: A chip slides in from the right edge of the FormulaBar: pill-shaped, `var(--color-accent)` text, reads "try toggling box-sizing" with a small arrow icon pointing up toward a toggle that simultaneously fades in above the box.
5. **Reader clicks the box-sizing toggle** (a segmented control: `content-box | border-box`): The outer box dimensions FREEZE at their current size. The content area (blue) shrinks inward by the padding amount. The FormulaBar formula visually rearranges. The chip disappears.
6. **Reader drags padding again under border-box**: They see the content area shrinking while the total stays fixed. The formula makes it viscerally clear: total is constant, content absorbs the change.
7. **After 2+ discoveries**: A "margin: auto" button appears on the left and right margin handles. Clicking it animates the box to center. A second chip: "try dragging margin below zero."
8. **Negative margin exploration**: Reader drags bottom margin past 0. The grey neighbor block slides up and overlaps the box. Visual overlap is tinged red.
9. **After 3+ discoveries**: A summary panel fades in below everything. 3-4 bullet points recapping what they discovered, each with the layer color dot.

### Data & State Shape

```typescript
type BoxLayer = 'content' | 'padding' | 'border' | 'margin';
type BoxEdge = 'top' | 'right' | 'bottom' | 'left';

interface BoxDimensions {
  content: { width: number; height: number };      // px, min 40
  padding: Record<BoxEdge, number>;                 // px, min 0
  border: Record<BoxEdge, number>;                  // px, min 0, max 20
  margin: Record<BoxEdge, number | 'auto'>;         // px (can be negative, min -60), or 'auto'
}

interface BoxModelState {
  dimensions: BoxDimensions;
  boxSizing: 'content-box' | 'border-box';

  // Interaction tracking
  activeHandle: { layer: BoxLayer; edge: BoxEdge } | null;
  dragStart: { x: number; y: number } | null;

  // Discovery state
  discoveredSet: Set<string>;  // 'drag-padding' | 'toggle-box-sizing' | 'margin-auto' | 'negative-margin'
  showNudge: boolean;
  showChip: 'box-sizing' | 'margin-auto' | 'negative-margin' | null;
  showSummary: boolean;
}

// Derived (not stored):
// - totalWidth: computed from dimensions + boxSizing mode
// - totalHeight: computed from dimensions + boxSizing mode
// - formulaSegments: array of { value: number, color: string, label: string }
// - layerRects: computed pixel rects for each layer (for SVG rendering)
```

### Primitives & Props

**DemoSandbox** -- Wraps the entire explorable. Provides the bordered canvas container with consistent padding, dark surface background, and optional title bar.
```tsx
<DemoSandbox title="Box Model" minHeight={500}>
  <BoxModelExplorable />
</DemoSandbox>
```

**MeasureLine** -- Reusable dimension annotation line. Renders an SVG line with end-caps and a centered label.
```tsx
<MeasureLine
  from={{ x: 50, y: 200 }}
  to={{ x: 250, y: 200 }}
  label="200px"
  color="var(--diagram-layer-0)"
  labelPosition="above"  // or 'below', 'left', 'right'
/>
```

**FormulaBar** -- Horizontal bar showing a live-updating mathematical formula.
```tsx
<FormulaBar
  segments={[
    { value: 200, color: 'var(--diagram-layer-0)', label: 'content' },
    { value: 40, color: 'var(--diagram-layer-1)', label: 'padding-L' },
    // ...
  ]}
  operator="+"
  result={{ value: 286, label: 'total width' }}
  animate={true}
/>
```

**Annotation** -- Small floating label with an optional connector line.
```tsx
<Annotation target={handleRef} text="drag me" position="below" delay={3000} />
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Drag to absurd values** | Clamp: content min 40px, padding/border max 120px each, margin range -60 to 120px. Handles stop at clamp boundary with a subtle bounce (SPRING.quick). |
| **Window resize mid-drag** | The 600px container is `max-width: 600px; width: 100%`. On resize, recompute SVG viewBox. Cancel active drag on resize event (fire pointercancel). |
| **Keyboard access** | Each handle is a `<button>` with `role="slider"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`. Arrow keys adjust by 2px, Shift+arrow by 10px. Focus ring: 2px solid `var(--color-accent)`. |
| **Touch devices** | Handles have a 44x44px touch target (transparent hit area larger than visual 24x8px pill). Use `touch-action: none` on the drag surface. |
| **Return after completing** | `discoveredSet` persists in `sessionStorage`. On revisit, summary is shown immediately but collapsed. Reader can still interact freely. |
| **Both axes dragged simultaneously** | Only one handle active at a time. Second pointer is ignored (`if (activeHandle) return`). |
| **Box-sizing toggle while dragging** | Disabled during drag (toggle button gets `pointer-events: none` + 50% opacity). |

### Cross-Lesson Connections

- **Prerequisite for core-positioning**: Understanding that each element occupies content + padding + border + margin space is assumed when positioning explains how `top: 20px` offsets from the margin edge.
- **Foreshadows core-formatting-ctx**: Margin collapse in the BFC lesson directly extends the "margin" concept introduced here. The orange margin color is reused.
- **Foreshadows core-stacking-ctx**: The layered concentric rectangles visual metaphor (nested boxes) prepares readers for the "layers" concept in stacking contexts.
- **FormulaBar reuse**: The FormulaBar component built here is reused in core-formatting-ctx (showing margin collapse math) and core-render-cycle (showing render cost).

---

## core-positioning -- Positioning Explorable
**Format**: explorable | **Effort**: large

### Interaction State Machine

```
                          +-----------+
                          |   idle    |  (5 colored elements in normal document flow)
                          +-----+-----+
                                |
                     [click on any element]
                                |
                          +-----v-----+
                          | selected  |  (element gets selection ring, toolbar appears)
                          +-----+-----+
                                |
                     [choose position mode from toolbar]
                                |
                   +------------v-----------+
                   |   mode-transitioning   | (element animates to new position, 500ms)
                   +------------+-----------+
                                |
                     [transition completes]
                                |
                   +------------v-----------+
                   |   mode-active          | (offset handles visible, ghost shown)
                   +---+--------+-------+---+
                       |        |       |
          [drag offset handle]  |   [click different element]
                       |        |       |
                +------v--+     |   +---v------+
                | offset- |     |   | selected |  (first element keeps its position)
                | dragging|     |   +----------+
                +------+--+     |
                       |        |
            [pointerup]|        |  [click 'sticky' + scroll container activates]
                       |        |
                +------v--+  +--v-----------+
                | mode-   |  | scroll-mode  |  (embedded scroll container appears)
                | active  |  +--+-----------+
                +---+-----+     |
                    |      [scroll events]
                    |           |
                    |    +------v--------+
                    |    | sticky-active |  (element sticks when threshold hit)
                    |    +------+--------+
                    |           |
                    +-----+-----+
                          |
               [set parent=relative, child=absolute]
                          |
                    +-----v---------+
                    | containing-   |  (containing block shifts from viewport to parent,
                    | block-shift   |   glowing border animates from viewport to parent)
                    +---------------+
```

**Data driving each state:**
- `selected`: `selectedElementId: string`
- `mode-active`: `positionMode: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky'`, `offsets: { top: number, right: number, bottom: number, left: number }`
- `scroll-mode`: `scrollTop: number`, `stickyThreshold: number`
- `containing-block-shift`: `containingBlockId: string` (which element provides the containing block)

### Visual Choreography

**Static layout:**
- Container: 700px wide, 500px tall, `var(--color-surface)` background, 1px `var(--color-border)` border. Represents a mini webpage.
- 5 elements in normal document flow (display: block, stacked vertically):
  - Element A: 120x60px, `var(--diagram-layer-0)` (blue), label "A"
  - Element B: 160x80px, `var(--diagram-layer-1)` (green), label "B"
  - Element C (the primary experiment target): 140x70px, `var(--diagram-layer-2)` (purple), label "C"
  - Element D: 100x50px, `var(--diagram-layer-3)` (yellow), label "D"
  - Element E: 130x65px, `var(--diagram-layer-4)` (orange), label "E"
- Each element has rounded corners `var(--radius-2)`, `var(--shadow-1)`, centered white label in `var(--font-mono)` `var(--text-sm)`.
- Toolbar: horizontal strip above the container. 5 buttons: `static`, `relative`, `absolute`, `fixed`, `sticky`. Each is a pill button, `var(--color-surface-2)` bg, `var(--font-mono)` text. Active mode: `var(--color-accent)` bg with white text.

**Animations:**
1. **Selection**: Click element -> 2px ring `var(--color-accent)` appears around it, animated with `SPRING.quick`. Other elements dim to 60% opacity (200ms, TRANSITION.enterCard).
2. **Position mode change** (e.g., static -> absolute):
   - Ghost outline: a dashed 2px border `var(--color-muted)` at 50% opacity appears at the element's ORIGINAL flow position. Fades in over 200ms.
   - Element animates from flow position to offset position using `SPRING.gentle` (300ms, stiffness 300, damping 20). If no offsets set, absolute element jumps to 0,0 of containing block.
   - Containing block indicator: the nearest positioned ancestor (or the viewport container) gets a 2px dashed border in `var(--color-accent)` that draws itself on (stroke-dashoffset animation, 400ms, easeOut). Label "containing block" appears next to it.
3. **Offset handle drag**: Four offset handles appear on the positioned element's edges (same design as box-model handles: 24x8px pills). Dragging animates the element position in real-time. The offset value shows as a live-updating label next to the handle (e.g., "top: 32px").
4. **Sticky scroll**: When sticky is selected, the container transforms: bottom 200px becomes a scrollable region with `overflow-y: auto` and a visible scrollbar. A "scroll me" indicator pulses at the scrollbar (LOOP.breathe). As user scrolls, the sticky element flows until it hits the threshold (default `top: 0`), then STICKS with a brief scale pulse (1.0 -> 1.02 -> 1.0, 200ms, SPRING.snappy) and a glow: `box-shadow: 0 0 12px var(--color-accent)` fading in over 300ms.
5. **Containing block shift**: When parent is set to `relative` and child to `absolute`, the containing block dashed border MIGRATES from the viewport-container to the parent element. Animation: old border fades out (200ms) while new border draws in (400ms). A connecting line briefly appears between old and new containing block (200ms, then fades).

**Reduced motion**: All position changes snap instantly. Ghost appears immediately. Containing block border appears without draw-in animation. Sticky glow appears without pulse.

### Teaching Flow (First 60 Seconds)

1. **0s**: Five colored rectangles stacked vertically in normal document flow. No instructions visible. Toolbar above shows 5 position modes, all deselected. A subtle hint label below the container: "click an element" in `var(--color-muted)`, disappears on first click.
2. **Reader clicks Element C (purple)**: C gets a 2px accent ring. The toolbar activates (buttons become clickable, previously they had `cursor: default`). The hint changes to "choose a position mode."
3. **Reader clicks "absolute"**: C's ghost outline appears at its original position (dashed purple border). C animates to the top-left corner of the outer container (its containing block = the viewport container, since no parent is positioned). The container edge gets a glowing dashed border labeled "containing block." Four offset handles appear on C.
4. **Reader drags C's "top" handle down**: C moves down, live label shows "top: 47px". Ghost outline stays at the original position, making the displacement obvious.
5. **A nudge chip appears** (if user hasn't discovered it after 10s): "try setting B to relative, then C to absolute" -- pill chip near the toolbar.
6. **Reader sets B (green) to "relative"**: Nothing visible changes about B's position (relative with no offsets = same position). BUT B gets a faint dashed border too.
7. **Reader re-selects C and sets it to "absolute"**: The containing block glow MIGRATES from the outer container to B. C repositions itself relative to B's top-left corner. The ghost still shows C's original flow position. This is the aha moment.
8. **Reader experiments with "sticky"**: Selects D, clicks "sticky." The bottom of the container becomes scrollable. A "scroll me" arrow pulses. Reader scrolls, D flows naturally until it hits the top of the scroll container and STICKS with a satisfying glow pulse.

### Data & State Shape

```typescript
interface ElementConfig {
  id: string;
  label: string;
  color: string;           // CSS variable reference
  flowSize: { width: number; height: number };
  position: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  offsets: { top: number | null; right: number | null; bottom: number | null; left: number | null };
  parent: string | null;   // ID of logical parent (for nesting)
}

interface PositioningState {
  elements: Record<string, ElementConfig>;
  selectedId: string | null;

  // Layout computed from flow
  flowPositions: Record<string, { x: number; y: number }>;   // derived
  computedPositions: Record<string, { x: number; y: number }>; // derived from position + offsets + containing block

  // Containing block resolution
  containingBlocks: Record<string, string>;  // elementId -> containingBlockId (derived)

  // Scroll state (for sticky)
  scrollContainerActive: boolean;
  scrollTop: number;

  // Interaction
  activeOffsetHandle: { elementId: string; edge: BoxEdge } | null;
  dragStart: { x: number; y: number } | null;
  discoveredSet: Set<string>;
}

// Derived:
// - ghostPositions: flowPositions for elements whose position !== 'static'
// - containingBlockId: walk up parent chain to find nearest positioned ancestor, or viewport
// - stickyIsStuck: scrollTop >= stickyThreshold for sticky elements
```

### Primitives & Props

**DemoSandbox** -- Container frame for the mini-page viewport.
```tsx
<DemoSandbox title="Positioning" minHeight={600} toolbar={<PositionToolbar />}>
  <PositioningExplorable />
</DemoSandbox>
```

**Annotation** -- Labels for "containing block", offset values, ghost labels.
```tsx
<Annotation target={containingBlockRef} text="containing block" position="top-right" variant="glow" />
```

No ScrollytellingShell needed -- this is pure explorable.

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Set fixed + scroll** | Fixed elements position relative to the demo container (not the real viewport). Use `position: absolute` relative to the container with scroll-invariant coordinates. Explain this scoping in a tiny footnote. |
| **Absolute with no positioned ancestor** | Containing block = the demo container (simulated viewport). Glowing border appears on the container edge. |
| **All elements set to absolute** | Document flow collapses. A warning chip appears: "All elements are out of flow -- the container has no height." Container border pulses `var(--color-error)` briefly. |
| **Keyboard navigation** | Tab between elements. Enter to select. Arrow keys on toolbar to change position mode. Arrow keys on offset handles to adjust by 2px / Shift+Arrow for 10px. |
| **Window resize** | Recompute all flow and computed positions. Clamp offsets to container bounds. Cancel active drag. |
| **Scroll container on mobile** | Use `-webkit-overflow-scrolling: touch`. Minimum scroll region height: 400px to allow meaningful sticky demo. |

### Cross-Lesson Connections

- **Depends on core-box-model**: Margin/padding/border dimensions from the box model determine the exact edges that offsets reference. The same color system for box layers is reused for offset visualization.
- **Foreshadows core-stacking-ctx**: Positioning creates stacking contexts (positioned + z-index). The ghost outline concept returns as the "original layer position" concept in stacking.
- **Foreshadows core-formatting-ctx**: Absolute positioning removes elements from normal flow, which affects BFC behavior. The "out of flow" concept introduced here is prerequisite.

---

## core-formatting-ctx -- Block Formatting Context Explorable
**Format**: explorable | **Effort**: medium

### Interaction State Machine

```
                          +-----------+
                          |   idle    |  (Scenario 1 active by default)
                          +-----+-----+
                                |
                     [select tab / scenario]
                                |
              +-----------------v-----------------+
              |                 |                  |
        +-----v------+  +------v------+  +--------v------+
        | scenario-1 |  | scenario-2  |  | scenario-3    |
        | margin-    |  | float-      |  | float-        |
        | collapse   |  | clearing    |  | exclusion     |
        +-----+------+  +------+------+  +--------+------+
              |                 |                  |
       [toggle BFC trigger]    |           [toggle BFC trigger]
              |                 |                  |
        +-----v------+  +------v------+  +--------v------+
        | bfc-on     |  | bfc-on      |  | bfc-on        |
        | (gap grows)|  | (height     |  | (text stops   |
        |            |  |  restores)  |  |  wrapping)    |
        +-----+------+  +------+------+  +--------+------+
              |                 |                  |
       [click 'WHY?']          |           [click 'WHY?']
              |                 |                  |
        +-----v------+  +------v------+  +--------v------+
        | bfc-reveal |  | bfc-reveal  |  | bfc-reveal    |
        | (boundary  |  | (boundary   |  | (boundary     |
        |  visible)  |  |  visible)   |  |  visible)     |
        +-----+------+  +------+------+  +--------+------+
              |                 |                  |
       [toggle BFC off]        |           [toggle BFC off]
              |                 |                  |
        +-----v------+  +------v------+  +--------v------+
        | scenario-N |  | scenario-N  |  | scenario-N    |
        | (reset)    |  | (reset)     |  | (reset)       |
        +-----------+   +-------------+  +---------------+
```

**Data per scenario:**
- Scenario 1: `{ gap: number (20 or 40), bfcActive: boolean, bfcTrigger: 'overflow-hidden' | null, showBoundary: boolean }`
- Scenario 2: `{ containerHeight: number, bfcActive: boolean, bfcTrigger: 'overflow-auto' | 'display-flow-root' | 'contain-layout' | null, showBoundary: boolean }`
- Scenario 3: `{ textWrapping: boolean, bfcActive: boolean, showBoundary: boolean }`

### Visual Choreography

**Scenario 1 -- Margin Collapse (default view):**
- Two blocks stacked vertically, each 200px wide, 80px tall.
  - Block A: `var(--diagram-layer-0)` (blue), bottom margin 20px.
  - Block B: `var(--diagram-layer-1)` (green), top margin 20px.
- Margin arrows: two SVG arrows, one pointing down from A (20px long, orange `var(--diagram-layer-4)`) and one pointing up from B (20px long, also orange). They OVERLAP in the middle -- only 20px gap visible, not 40px.
- The overlapping region has a subtle striped pattern (45-degree orange lines at 10% opacity) to visualize the collapse.
- Toggle button: "overflow: hidden" pill button. When clicked:
  - A wrapper div appears around Block A with a dashed 1px `var(--color-muted)` border.
  - The margin arrows animate: bottom arrow holds position, top arrow SLIDES down by 20px (SPRING.gentle, 400ms). Gap grows from 20px to 40px.
  - Overlap region disappears (fade 200ms).
  - Gap dimension label animates: "20px" -> "40px" with a count-up.
- "WHY?" button: small pill, `var(--color-accent)` outline. Click it: a glowing 2px dashed border in `var(--color-accent)` appears around the wrapper div with a label "BFC boundary." Glow pulses once (LOOP.glow at 1s, then steady).

**Scenario 2 -- Float Clearing:**
- Container: 300x auto, 1px solid `var(--color-border)`.
- Inside: a floated child (120x100px, `var(--diagram-layer-2)` purple, `float: left`). Container height collapses to 0 (border visible as a flat line at top).
- Height indicator: a vertical MeasureLine on the right side showing "0px" in red `var(--color-error)`.
- Three toggle buttons: `overflow:auto`, `display:flow-root`, `contain:layout`. Click any:
  - Container height animates from 0 to child height (SPRING.gentle, 400ms). The container border expands downward.
  - Height label counts up: "0px" -> "100px" in `var(--color-success)`.
  - StatusDot next to the toggle turns green.

**Scenario 3 -- Float Exclusion:**
- A 300px container with a 80x80px floated image placeholder (grey square, `float: left`) and paragraph text wrapping around it.
- Toggle: "Add BFC to text." Click it:
  - Text container gets `overflow: hidden` (or `display: flow-root`).
  - Text STOPS wrapping and forms its own rectangular column next to the float. Animated via `SPRING.gentle`: text block width shrinks and repositions over 400ms.
  - BFC boundary glow appears on the text container.

**Tab transitions:** Cross-fade between scenarios, 200ms (TRANSITION.crossfade). The active tab gets an underline that slides to the new position (translateX, 300ms, SPRING.snappy).

**Reduced motion:** Gap change instant. Height change instant. Text reflow instant. Glow borders appear without animation.

### Teaching Flow (First 60 Seconds)

1. **0s**: Scenario 1 is visible. Two colored blocks with a 20px gap between them. Two orange margin arrows are visible, overlapping. A dimension label reads "gap: 20px". No explanation text.
2. **3s**: A nudge fades in: "the top block has 20px bottom margin, the bottom has 20px top margin. Why isn't the gap 40px?"
3. **Reader clicks "overflow: hidden" toggle**: The wrapper appears around the top block. The gap animates from 20px to 40px. The margin arrows separate. The dimension label counts from 20 to 40 and turns green. A chip appears: "that's a Block Formatting Context."
4. **Reader clicks "WHY?"**: A glowing dashed border appears around the overflow:hidden wrapper. Label: "BFC boundary -- margins can't collapse across this."
5. **Reader switches to Scenario 2 tab** ("Float Clearing"): Container with a collapsed height (0px) and a float escaping. Height label shows "0px" in red.
6. **Reader clicks "display:flow-root"**: Container snaps open to contain the float. Height animates to 100px. StatusDot goes green.
7. **Reader switches to Scenario 3** ("Float Exclusion"): Text wrapping around a float. Reader toggles BFC on the text -- text stops wrapping and forms its own column.
8. **After visiting all 3 scenarios**: A "what you discovered" summary fades in below. Core insight: "A BFC is an invisible boundary that isolates its contents from outside layout effects."

### Data & State Shape

```typescript
type BFCTrigger = 'overflow-hidden' | 'overflow-auto' | 'display-flow-root' | 'contain-layout' | null;

interface ScenarioState {
  id: 'margin-collapse' | 'float-clearing' | 'float-exclusion';
  bfcActive: boolean;
  bfcTrigger: BFCTrigger;
  showBoundary: boolean;
}

interface BFCState {
  activeScenario: ScenarioState['id'];
  scenarios: Record<ScenarioState['id'], ScenarioState>;
  discoveredSet: Set<string>;  // 'margin-collapse' | 'float-clearing' | 'float-exclusion' | 'why-reveal'
  showSummary: boolean;
}

// Derived:
// - marginGap: scenarios['margin-collapse'].bfcActive ? 40 : 20
// - containerHeight: scenarios['float-clearing'].bfcActive ? floatChildHeight : 0
// - textWraps: !scenarios['float-exclusion'].bfcActive
```

### Primitives & Props

**DemoSandbox** with **DemoSandbox.Tabs** -- Tabbed container for the 3 scenarios.
```tsx
<DemoSandbox title="Block Formatting Context" minHeight={400}>
  <DemoSandbox.Tabs
    tabs={['Margin Collapse', 'Float Clearing', 'Float Exclusion']}
    activeTab={activeScenario}
    onTabChange={setActiveScenario}
  />
  {/* scenario content */}
</DemoSandbox>
```

**Annotation** -- "BFC boundary" label on the glowing border.
**StatusDot** -- Green/red indicator next to each BFC trigger toggle.
**MeasureLine** -- (from box-model) for gap and height indicators.

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Rapid tab switching** | Debounce tab transitions by 150ms. Cancel in-flight animations on tab change. |
| **Toggle BFC on/off rapidly** | Interrupt previous animation and animate from current interpolated value. Use framer-motion's ability to handle mid-flight animation changes. |
| **Keyboard** | Tab key cycles through toggles and tabs. Enter/Space activates toggles. Screen reader announces: "Block formatting context [on/off]." |
| **Long text in Scenario 3** | Text container has `max-height: 200px` with `overflow: auto` to prevent layout blow-up. |
| **Window resize** | Scenario containers use `max-width: 400px; width: 100%`. Recompute float clearing heights on resize. |

### Cross-Lesson Connections

- **Depends on core-box-model**: Margin concept (orange color, MeasureLine) carries directly forward. Readers must know what margin is to understand collapse.
- **Depends on core-positioning**: Float behavior implicitly references normal flow and out-of-flow concepts from positioning.
- **Foreshadows core-stacking-ctx**: BFC is a "context" -- stacking context is another. The concept of invisible boundaries that change child behavior transfers directly.
- **FormulaBar reuse potential**: Could show margin math: `20 + 20 = 40 (expected)` vs `max(20, 20) = 20 (collapsed)`.

---

## core-stacking-ctx -- Stacking Context Explorable
**Format**: explorable | **Effort**: large

### Interaction State Machine

```
                          +-----------+
                          |   idle    |  (6 cards in 3D perspective, flat arrangement)
                          +-----+-----+
                                |
                     [drag card on z-axis OR click card]
                                |
                          +-----v-----+
                          | z-drag    |  (z-index value changes, card moves in 3D space)
                          +-----+-----+
                                |
                     [drop / release]
                                |
                          +-----v-----+
                          |  settled  |  (new z-index applied, paint order updated)
                          +-----+-----+
                                |
                     [toggle stacking-context trigger on a card]
                                |
                     +----------v-----------+
                     | context-forming      | (card gets colored border,
                     | (border animates in, |  children group inside it)
                     |  children regroup)   |
                     +----------+-----------+
                                |
                     [drag child INTO another card (nesting)]
                                |
                     +----------v-----------+
                     | nesting-transition   | (card shrinks, slides into parent,
                     |                      |  becomes child in paint order)
                     +----------+-----------+
                                |
                     [z-index:9999 on child of z-index:1 parent, sibling at z-index:2]
                                |
                     +----------v-----------+
                     | aha-trapped          | (child visually trapped below sibling
                     |                      |  despite higher z-index. Nudge text appears.)
                     +----------+-----------+
                                |
                     [3+ discoveries]
                                |
                     +----------v-----------+
                     | summary              |
                     +----------------------+
```

### Visual Choreography

**3D Scene Setup:**
- Container: 700px wide, 500px tall, `perspective: 1200px` applied to a wrapper div.
- Inner scene: `transform: rotateX(25deg) rotateY(-5deg)`, creating a tilted 3D view. `transform-style: preserve-3d` on the scene.
- 6 cards, each 120x80px with rounded corners (`var(--radius-2)`), `var(--shadow-2)`, centered labels (A-F) in `var(--font-mono)`.
  - Card A: `var(--diagram-layer-0)` (blue), z-index 1
  - Card B: `var(--diagram-layer-1)` (green), z-index 2
  - Card C: `var(--diagram-layer-2)` (purple), z-index 3
  - Card D: `var(--diagram-layer-3)` (yellow), z-index 4
  - Card E: `var(--diagram-layer-4)` (orange), z-index 5
  - Card F: `var(--diagram-layer-5)` (teal), z-index 6
- Cards are offset horizontally (staggered by 40px) and vertically in the 3D space by `translateZ(z-index * 30px)`. Higher z-index = visually closer to the viewer.
- Each card has a z-index badge: a small pill (28x20px) at top-right, `var(--color-bg)` background, `var(--font-mono)` `var(--text-xs)`, showing the z-index value.

**Property Toggle Panel:**
- Right sidebar, 200px wide. For the selected card, shows toggleable properties:
  - `opacity: 0.99` (checkbox)
  - `transform: scale(1)` (checkbox)
  - `filter: blur(0)` (checkbox)
  - `will-change: transform` (checkbox)
  - `isolation: isolate` (checkbox)
- Each checkbox has a yellow warning icon: "creates stacking context."

**Animations:**
1. **Z-axis drag**: Card follows pointer Y movement mapped to translateZ. Z-index badge value updates live (rounded to integer). SPRING.quick (stiffness 400, damping 26). Other cards that need to reorder slide to new Z positions (SPRING.gentle, 300ms).
2. **Stacking context formation**: When a property toggle is activated:
   - Card gets a 3px solid border in a brightened version of its color (increase L by 15% in oklch).
   - Label "STACKING CONTEXT" appears below the card (fade in, 200ms).
   - If card has children, they visually GROUP together -- a translucent panel (card color at 8% opacity) envelopes the card and its children, animating from the card's bounds outward to encompass all children (SPRING.gentle, 400ms).
3. **Nesting (drag into)**: User drags Card E over Card A. Drop zone highlighted (A gets a pulsing 2px dashed border, LOOP.pulse). On drop:
   - E shrinks by 15% (scale 1 -> 0.85, SPRING.snappy).
   - E slides to position relative to A (SPRING.gentle).
   - E's z-index badge adds a prefix: "A:5" showing it's scoped to A's context.
   - If A has a stacking context, E's global rendering position recalculates.
4. **Trapped z-index aha**: When child E (z-index:9999) inside parent A (z-index:1) still renders below sibling B (z-index:2):
   - E's z-index badge turns red and grows (scale pulse 1 -> 1.3 -> 1, 300ms).
   - A red text label: "z-index 9999 trapped inside z-index 1" appears between E and B.
   - A visual "cage" effect: faint red bars around A's stacking context boundary (animated in, 300ms).

**Reduced motion**: No 3D tilt (flat overhead view instead). Cards arranged in overlapping stack. Z-index changes reflected by paint order only. Context borders appear without animation.

### Teaching Flow (First 60 Seconds)

1. **0s**: 6 colorful cards visible in a 3D tilted perspective. Cards are staggered horizontally and stacked vertically by z-index. Each has a z-index badge. No instructions. Right panel shows property toggles (disabled until card selected).
2. **3s**: Nudge: "try dragging cards up and down to change their z-index" in `var(--color-muted)`.
3. **Reader drags Card C upward**: Card C moves forward (higher translateZ). Z-index badge counts up. When C passes D's z-index, D slides back and C slides in front. Satisfying.
4. **Reader clicks Card A**: Property panel activates for A. Nudge chip near the panel: "toggle opacity:0.99 to see what happens."
5. **Reader checks opacity:0.99**: Card A gets a stacking context border. If A has no children yet, the border just appears. A label: "STACKING CONTEXT" fades in.
6. **Nudge appears**: "now try dragging the red card into the blue card as a child."
7. **Reader drags E into A**: E becomes a child of A. E shrinks slightly and repositions inside A's bounds. E's z-index badge updates to show scope: "A:5".
8. **Key moment**: Reader drags E's z-index to 9999. E's badge says "A:9999". But E is STILL visually behind B (z-index: 2). The badge turns red. Explainer text: "z-index 9999 is trapped -- it only competes inside A's stacking context (z-index: 1)."
9. **After 3+ discoveries**: Summary fades in. Core insight: "z-index creates a competition, but stacking contexts define WHICH competition you're in."

### Data & State Shape

```typescript
interface CardState {
  id: string;
  label: string;
  color: string;
  zIndex: number;
  parentId: string | null;        // null = root level
  formsStackingContext: boolean;   // derived from properties OR explicit z-index + positioned
  properties: {
    opacity: number;              // 1 or 0.99
    hasTransform: boolean;
    hasFilter: boolean;
    willChange: boolean;
    isolation: boolean;
  };
}

interface StackingState {
  cards: Record<string, CardState>;
  selectedId: string | null;

  // Drag
  activeDrag: { cardId: string; mode: 'z-axis' | 'nesting'; startY: number } | null;
  dropTarget: string | null;

  // Derived
  paintOrder: string[];           // sorted card IDs in final paint order (flattened tree walk)
  stackingContextTree: TreeNode;  // tree of stacking contexts for debug display

  discoveredSet: Set<string>;
  showSummary: boolean;
}

type TreeNode = {
  cardId: string;
  zIndex: number;
  children: TreeNode[];
};

// Derived:
// - formsStackingContext: opacity < 1 || hasTransform || hasFilter || willChange || isolation || (zIndex !== 'auto' && positioned)
// - paintOrder: walk the stacking context tree, within each context sort by z-index, flatten
// - 3D translateZ per card: paintOrder.indexOf(cardId) * 30px
```

### Primitives & Props

**DemoSandbox** -- Hosts the 3D scene + property panel.
```tsx
<DemoSandbox title="Stacking Contexts" minHeight={550} layout="split-right" sidebarWidth={220}>
  <StackingExplorable />
</DemoSandbox>
```

**Annotation** -- "STACKING CONTEXT" labels, "trapped" explainer.

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Nest more than 2 levels deep** | Allow up to 3 levels of nesting. Beyond that, drop is rejected (card bounces back, SPRING.quick). |
| **Circular nesting (drag parent into own child)** | Rejected. Card bounces back. Brief red flash on the drop target. |
| **Z-index extremes** | Clamp to range -10 to 9999. Badge shows clamped value. |
| **3D perspective on mobile** | On viewports < 600px, reduce perspective to 800px and rotateX to 15deg. Cards shrink to 90x60px. |
| **Keyboard** | Tab to select card. Up/Down arrows to change z-index by 1. Shift+Up/Down by 10. Enter on a card + arrow toward another card to initiate nesting. |
| **Undo nesting** | Double-click a nested card to un-nest it (returns to root level with its original z-index). |
| **All cards nested into one** | Works fine. The single root stacking context contains all others. Paint order makes it clear. |

### Cross-Lesson Connections

- **Depends on core-positioning**: Stacking contexts are often created by positioned elements with z-index. The "positioned" concept must already be understood.
- **Depends on core-formatting-ctx**: The concept of "invisible boundaries that change child behavior" transfers from BFC to stacking context. Same mental model, different axis (flow vs paint order).
- **Foreshadows core-composition**: Stacking contexts often align with compositor layers. The "layer" concept introduced here in paint-order terms becomes a GPU memory concept in composition.
- **Foreshadows core-render-cycle**: The paint stage in the render pipeline determines stacking order. This lesson gives readers a mental model for what "Paint" does.

---

## core-render-cycle -- Rendering Pipeline Scrollytelling
**Format**: scrollytelling | **Effort**: xl

### Interaction State Machine

```
Phase 1 — Scrollytelling (linear, scroll-driven):

  step-0 ──scroll──> step-1 ──scroll──> step-2 ──scroll──> ... ──scroll──> step-5
  (empty)            (DOM)              (Style)             ...            (Composite)
                                                                               |
                                                                    [scroll past step-5]
                                                                               |
                                                                         +-----v------+
                                                                         | transition |
                                                                         | to Phase 2 |
                                                                         +-----+------+
                                                                               |
Phase 2 — Interactive Trigger Panel:

                          +-------------------+
                          | trigger-panel     |  (all 5 stages visible, all dim)
                          | (idle)            |
                          +--------+----------+
                                   |
                        [click CSS property button]
                                   |
                          +--------v----------+
                          | property-active   |  (triggered stages glow with cost color)
                          | {property, stages}|
                          +--------+----------+
                                   |
                        [click different property]
                                   |
                          +--------v----------+
                          | property-active   |  (previous stages dim, new ones glow)
                          +--------+----------+
                                   |
                        [toggle 'read between writes']
                                   |
                          +--------v----------+
                          | forced-reflow     |  (pipeline runs twice, red warning)
                          +--------+----------+
                                   |
                        [toggle off]
                                   |
                          +--------v----------+
                          | trigger-panel     |  (reset to idle)
                          +-------------------+
```

**Data:**
- Phase 1: `{ currentStep: 0-5, scrollProgress: 0-1 }`
- Phase 2: `{ selectedProperty: string | null, triggeredStages: Set<Stage>, forcedReflow: boolean }`

### Visual Choreography

**Pipeline Diagram (sticky visual, full width of sticky panel ~60% viewport):**
- 5 stage boxes, 120px wide, 80px tall, arranged horizontally with 20px gaps.
- Each box: rounded corners `var(--radius-2)`, contains an icon (24x24px SVG) and label below.
  - DOM: `var(--diagram-layer-0)` (blue, hue 200), icon: `</>` tree structure
  - Style: `var(--diagram-layer-9)` (purple, hue 260), icon: paint palette
  - Layout: `var(--diagram-layer-3)` (yellow, hue 60), icon: grid/ruler
  - Paint: `var(--diagram-layer-1)` (green, hue 140), icon: paintbrush
  - Composite: `var(--diagram-layer-5)` (teal, hue 170), icon: layers
- Arrows between stages: 20px wide SVG paths with arrowheads. Stroke: `var(--color-muted)` when inactive.
- When a stage is "active" during scrollytelling:
  - Box fill animates from 10% opacity to 100% opacity (400ms, TRANSITION.enterCard).
  - Box border: 2px solid, matching stage color.
  - Arrow leading TO this stage gets animated data-flow particles: 4px circles traveling along the path using framer-motion's `pathLength` 0 -> 1 over 800ms with `easeOut`. 3 particles spaced evenly, looping (LOOP.breathe speed).
  - Internal illustration animates in:
    - DOM: HTML tags `<div>`, `<p>`, `<img>` slide in from left, connect into tree lines (600ms, staggered by STAGGER.fast).
    - Style: CSS rule blocks fly in from the left, arrows connect to DOM nodes (600ms, staggered).
    - Layout: rectangles appear with dimension labels (width/height) animating from 0 to values (600ms, TRANSITION.enterCard).
    - Paint: elements fill with color left-to-right (CSS `clip-path: inset(0 X% 0 0)` animating X from 100 to 0 over 600ms).
    - Composite: 3 layers shown in mini 3D exploded view (translateZ offset), then flatten together (400ms, SPRING.gentle).

**Phase 2 -- Trigger Panel (appears below pipeline after scrollytelling):**
- Horizontal bar of CSS property buttons: `width`, `height`, `margin`, `padding`, `color`, `background`, `transform`, `opacity`, `filter`, `font-size`, `top/left`, `box-shadow`.
- Each button: pill shape, `var(--color-surface-2)` bg, `var(--font-mono)` `var(--text-xs)`.
- On click: triggered pipeline stages glow. Stages that DON'T trigger stay at 10% opacity.
  - Expensive path (Layout+Paint+Composite): stages glow with red tint (`var(--color-error)` border, pulsing once, LOOP.glow).
  - Medium path (Paint+Composite): stages glow with yellow tint (`var(--diagram-layer-3)` border).
  - Cheap path (Composite only): stage glows with green tint (`var(--color-success)` border).
- Cost indicator below pipeline: a horizontal bar segmented by triggered stages, colored red/yellow/green. Width proportional to estimated cost.

**Forced Reflow Toggle:**
- A distinct "read between writes" toggle button (destructive style, red-outlined). When active:
  - The pipeline diagram clones: a second pipeline appears below the first, slightly offset and at 60% opacity.
  - Both pipelines run their particle animations simultaneously.
  - A red warning flash (full pipeline width, `var(--color-error)` at 15% opacity) pulses twice (LOOP.pulse).
  - A label: "FORCED SYNCHRONOUS LAYOUT -- pipeline runs twice in one frame" in `var(--color-error)`.

**Reduced motion**: Stages appear fully lit instantly on scroll. No particles. No internal illustrations (show final state). Trigger panel highlights instantly. Forced reflow shows static double pipeline without animation.

### Teaching Flow (First 60 Seconds)

1. **0s**: Pipeline diagram visible on the left (sticky). All 5 stage boxes are dim (10% opacity, outlined). Right scroll column shows the first narrative paragraph: "Every time something changes on a web page..."
2. **Reader scrolls**: Step 1 activates. DOM stage lights up to full opacity. Inside the DOM box, HTML tags animate into a tree structure. Arrow from DOM to Style gets particle flow. Right column shows: "First, the browser parses HTML into a DOM tree..."
3. **Continue scrolling**: Style stage lights up. CSS rule blocks fly in and connect to DOM nodes via arrows. Narrative: "Next, it resolves every CSS rule..."
4. **Continue**: Layout stage. Boxes with dimension labels. Narrative: "Now the browser calculates exact position and size..."
5. **Continue**: Paint stage. Elements fill with color (left-to-right wipe). Narrative: "The browser rasterizes each layer into pixels..."
6. **Continue**: Composite stage. Mini 3D layers flatten. Narrative: "Finally, painted layers are composited together..."
7. **Scroll past all stages**: Pipeline stays fully lit. Below it, the Trigger Panel slides up (translateY 20->0, opacity 0->1, TRANSITION.enterCard). Narrative: "Not all changes are equal."
8. **Reader clicks "width"**: Layout, Paint, and Composite stages glow red. DOM and Style stay dim. Cost bar shows a wide red segment. Narrative: "Changing 'width' forces the browser to re-run Layout, Paint, AND Composite."
9. **Reader clicks "transform"**: Only Composite glows green. Cost bar is tiny and green. Narrative: "But 'transform' skips straight to Composite."
10. **Reader toggles "read between writes"**: Pipeline duplicates. Red warning flash. Narrative: "Reading layout properties between DOM writes forces a synchronous layout."

### Data & State Shape

```typescript
type PipelineStage = 'dom' | 'style' | 'layout' | 'paint' | 'composite';

type CostLevel = 'cheap' | 'medium' | 'expensive';

interface PropertyTrigger {
  property: string;
  stages: PipelineStage[];
  cost: CostLevel;
}

// Hardcoded mapping (from csstriggers.com):
const PROPERTY_TRIGGERS: PropertyTrigger[] = [
  { property: 'width',      stages: ['layout', 'paint', 'composite'], cost: 'expensive' },
  { property: 'height',     stages: ['layout', 'paint', 'composite'], cost: 'expensive' },
  { property: 'margin',     stages: ['layout', 'paint', 'composite'], cost: 'expensive' },
  { property: 'padding',    stages: ['layout', 'paint', 'composite'], cost: 'expensive' },
  { property: 'font-size',  stages: ['layout', 'paint', 'composite'], cost: 'expensive' },
  { property: 'top/left',   stages: ['layout', 'paint', 'composite'], cost: 'expensive' },
  { property: 'color',      stages: ['paint', 'composite'],           cost: 'medium' },
  { property: 'background', stages: ['paint', 'composite'],           cost: 'medium' },
  { property: 'box-shadow', stages: ['paint', 'composite'],           cost: 'medium' },
  { property: 'filter',     stages: ['composite'],                    cost: 'cheap' },
  { property: 'transform',  stages: ['composite'],                    cost: 'cheap' },
  { property: 'opacity',    stages: ['composite'],                    cost: 'cheap' },
];

interface RenderCycleState {
  // Phase 1 — scrollytelling
  currentStep: number;        // 0-8 (mapped to scrollSteps)
  scrollProgress: number;     // 0-1 within current step

  // Phase 2 — trigger panel
  phase: 'scrollytelling' | 'interactive';
  selectedProperty: string | null;
  triggeredStages: PipelineStage[];   // derived from selectedProperty
  costLevel: CostLevel | null;        // derived

  // Forced reflow
  forcedReflow: boolean;

  // Discovery tracking
  discoveredProperties: Set<string>;
  discoveredReflow: boolean;
}
```

### Primitives & Props

**ScrollytellingShell** -- THE primary primitive for this lesson.
```tsx
<ScrollytellingShell
  steps={SCROLL_STEPS}
  renderVisual={(stepIndex, progress) => (
    <PipelineDiagram
      activeStep={stepIndex}
      progress={progress}
      triggerPanel={stepIndex >= 6 ? <TriggerPanel /> : null}
    />
  )}
  visualPosition="left"
  stickyTop={80}
/>
```

**DemoSandbox** -- Wraps the trigger panel in Phase 2 for consistent styling.

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Scroll backward** | Stages dim back in reverse. Particles reverse. Step index decrements. Phase 2 hides if scrolling above step 6. |
| **Click property before scrollytelling completes** | Trigger panel only appears after step 5 is reached. Clicking pipeline stages during scrollytelling does nothing. |
| **Rapid property clicking** | Previous glow fades out (100ms), new glow fades in (200ms). No queuing. |
| **Narrow viewport** | Below 900px: pipeline stages stack 3+2 (3 top, 2 bottom) with arrows routing between rows. Below 600px: vertical pipeline (single column). |
| **Forced reflow + property selected** | Both active simultaneously. The double pipeline shows the selected property's stages glowing. |
| **Keyboard** | Arrow keys or Tab to navigate property buttons. Enter to select. R key toggles forced reflow. |

### Cross-Lesson Connections

- **Depends on core-box-model**: Layout stage references box dimensions (width, padding, border). The "Layout" stage literally calculates what core-box-model teaches manually.
- **Depends on core-stacking-ctx**: The Paint stage handles stacking order. Composite stage handles compositor layers. Both concepts were introduced in prior stops.
- **Directly feeds core-composition**: Composite stage is expanded in full detail in the next lesson. This provides the overview; composition provides the deep dive.
- **Directly feeds core-gpu**: The "transform = Composite only" insight from the trigger panel is the ENTIRE premise of the GPU battle lesson.
- **Foreshadows core-event-loop**: The "one frame" concept and forced reflow connect to event loop timing. Understanding frame timing is prerequisite for understanding microtask starvation blocking rendering.

---

## core-composition -- Compositor Layer Scrollytelling
**Format**: scrollytelling | **Effort**: medium

### Interaction State Machine

```
Phase 1 — Scrollytelling (4 steps):

  step-0 ──scroll──> step-1 ──scroll──> step-2 ──scroll──> step-3
  (flat,              (sidebar           (hero              (layer
   1 layer)            separates)         separates)         explosion)
                                                                |
                                                     [scroll past step-3]
                                                                |
Phase 2 — Interactive:

                          +-----------+
                          | explorer  |  (all elements visible, layer tree panel on right)
                          +-----+-----+
                                |
                     [toggle will-change/animation on element]
                                |
                          +-----v-----+
                          | promoting |  (element lifts into its own layer, VRAM increases)
                          +-----+-----+
                                |
                     [VRAM crosses threshold]
                                |
                          +-----v-----+
                          | warning   |  (VRAM counter red, "layer explosion" warning)
                          +-----+-----+
                                |
                     [remove promotions]
                                |
                          +-----v-----+
                          | explorer  |  (back to normal)
                          +-----------+
```

### Visual Choreography

**Mock Webpage (sticky visual):**
- A simplified webpage rendering, 500px wide, 400px tall:
  - Header: full width, 50px tall, `var(--diagram-layer-0)` (blue)
  - Hero image: full width, 120px tall, `var(--diagram-layer-1)` (green) with a landscape placeholder
  - Sidebar: 140px wide, 200px tall, right side, `var(--diagram-layer-2)` (purple)
  - Content: remaining space, `var(--color-surface-2)` with lorem text lines
  - Footer: full width, 40px tall, `var(--diagram-layer-3)` (yellow)
- All wrapped in a `perspective: 1000px` container for 3D separation effect.

**VRAM Counter:**
- Top-right corner, 120x36px, `var(--color-surface)` bg, rounded `var(--radius-2)`.
- Icon: memory chip SVG (16x16px). Label: "2.0 MB" in `var(--font-mono)`.
- Color transitions: white (< 8MB), yellow `var(--diagram-layer-3)` (8-16MB), red `var(--color-error)` (>16MB).
- Value animates on change: countUp/countDown, 300ms, TRANSITION.progress.

**Layer Tree Panel (Phase 2, right sidebar, 200px):**
- Tree structure showing which elements are on which layers.
- Each layer: colored dot (matching element) + element name + "GPU" badge if promoted.
- Indentation for nesting. Lines connecting parent to children.

**Scroll Animations:**
1. **Step 0**: All elements flat. Single outlined rectangle labeled "Layer 1". VRAM: "2.0 MB".
2. **Step 1**: Sidebar lifts out of the flat page. `translateZ(60px)` over 600ms, SPRING.gentle. A 1px border in sidebar's color appears around it (the "layer boundary"). Second outlined rectangle appears in layer tree: "Layer 2". VRAM counter ticks from 2.0 to 2.4 MB.
3. **Step 2**: Hero image lifts. `translateZ(40px)`. Gets an opacity pulse animation (CSS `@keyframes`, 2s loop) to show WHY it's promoted. "Layer 3". VRAM: 4.1 MB.
4. **Step 3**: 5 more elements rapidly promote (staggered, 150ms apart). VRAM counter climbs: 4.1 -> 6.2 -> 8.5 -> 11.0 -> 15.3 -> 20.8 MB. At 12MB the counter turns yellow. At 20MB it turns red, pulses (LOOP.pulse), and a "LAYER EXPLOSION" chip appears (red bg, white text, shake animation -- translateX(-2px, 2px, 0) over 200ms, 3 cycles).

**Phase 2 -- Interactive:**
- Each element in the webpage has a small toggle icon (layers icon, 16x16px) in its top-right corner. Click to toggle layer promotion.
- On toggle ON: element lifts (translateZ 40px, SPRING.gentle, 400ms), layer tree updates, VRAM counter ticks up.
- On toggle OFF: element settles back (translateZ 0, SPRING.gentle, 400ms), layer merges in layer tree, VRAM ticks down.

**Reduced motion**: No 3D transforms. Promoted layers shown with a colored outline border and "GPU" badge only. VRAM counter still updates. Layer explosion shown as static red state.

### Teaching Flow (First 60 Seconds)

1. **0s**: A simplified webpage rendering. All flat, single layer. VRAM counter: "2.0 MB". Narrative: "By default, the browser paints your entire page into a single layer."
2. **Scroll**: Sidebar separates upward in 3D, floating above the page. Layer tree shows 2 entries. VRAM: 2.4 MB. Narrative: "When you add will-change:transform, the browser promotes that element..."
3. **Scroll**: Hero image lifts, pulsing with an opacity animation. Layer tree: 3 entries. VRAM: 4.1 MB. Narrative: "CSS animations automatically promote elements too..."
4. **Scroll**: Rapid cascade -- 5 more elements promote. VRAM climbs to 20.8 MB, goes red. "LAYER EXPLOSION" chip shakes. Narrative: "But every layer costs GPU memory..."
5. **Scroll past**: Interactive mode. All elements are back to flat. Reader can toggle individual elements to explore the VRAM cost of each.
6. **Reader promotes 2-3 elements**: VRAM stays reasonable. Elements float individually. Layer tree updates.
7. **Reader promotes 8+ elements**: VRAM goes red again. They viscerally understand the trade-off.

### Data & State Shape

```typescript
interface LayerElement {
  id: string;
  label: string;
  color: string;
  bounds: { x: number; y: number; width: number; height: number };
  promoted: boolean;
  promotionReason: 'will-change' | 'animation' | 'transform' | null;
  estimatedVRAM: number;     // MB, based on bounds area * 4 bytes (RGBA) / 1024^2, with overhead
}

interface CompositionState {
  // Phase 1
  currentStep: number;
  scrollProgress: number;
  phase: 'scrollytelling' | 'interactive';

  // Elements
  elements: Record<string, LayerElement>;

  // Derived
  totalVRAM: number;          // sum of base (2MB) + promoted element VRAMs
  vramLevel: 'normal' | 'warning' | 'danger';  // derived from thresholds
  layerTree: LayerTreeNode[]; // derived from promotion state
  layerCount: number;         // derived

  discoveredSet: Set<string>;
}

type LayerTreeNode = {
  layerIndex: number;
  elements: string[];         // element IDs in this layer
  vram: number;
};
```

### Primitives & Props

**ScrollytellingShell** -- Two-phase: scrollytelling then interactive.
```tsx
<ScrollytellingShell
  steps={SCROLL_STEPS}
  renderVisual={(stepIndex) => (
    <CompositionView
      step={stepIndex}
      interactive={stepIndex >= 4}
    />
  )}
/>
```

**DemoSandbox** -- For the interactive phase.
**Annotation** -- "Layer 1", "Layer 2" labels, "LAYER EXPLOSION" warning.

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Promote all elements** | VRAM goes to max (~35 MB). Counter shows extreme red. All elements in 3D view overlap chaotically -- this IS the lesson. |
| **De-promote during scroll phase** | Not possible -- scroll phase is view-only. Interactive toggles only appear in Phase 2. |
| **Narrow viewport** | 3D perspective reduces. Elements scale proportionally. VRAM counter moves to below the diagram. |
| **VRAM calculation accuracy** | Estimates based on element area * 4 bytes/pixel + 0.2MB overhead per layer. Not real browser VRAM but proportionally accurate for teaching. |

### Cross-Lesson Connections

- **Depends on core-render-cycle**: The Composite stage introduced in the pipeline is expanded here. Readers already know Composite is the final, GPU-accelerated stage.
- **Depends on core-stacking-ctx**: Stacking contexts often correlate with compositor layers. The 3D exploded view visual metaphor is reused from stacking context.
- **Directly feeds core-gpu**: Understanding that promoted layers run on GPU is the exact premise of the GPU battle. This lesson explains WHY transform is GPU-accelerated; the next shows the PERFORMANCE IMPACT.

---

## core-gpu -- GPU vs CPU Animation Battle
**Format**: battle | **Effort**: medium

### Interaction State Machine

```
                          +-----------+
                          |   idle    |  (two animations paused, stress at 0%)
                          +-----+-----+
                                |
                     [click 'Start' or auto-play on mount]
                                |
                          +-----v-----+
                          |  running  |  (both animations at 60fps, stress=0)
                          +-----+-----+
                                |
                     [drag stress slider]
                                |
                          +-----v-----+
                          | stressed  |  (CPU animation jitters, GPU stays smooth)
                          +-----+-----+
                                |
                     [stress reaches 80%+]
                                |
                          +-----v-----+
                          | diverged  |  (clear visual difference, metrics diverge)
                          +-----+-----+
                                |
                     [stress back to 0]
                                |
                          +-----v-----+
                          |  running  |  (both recover to 60fps)
                          +-----+-----+
                                |
                     [click 'Pause']
                                |
                          +-----v-----+
                          |   idle    |
                          +-----------+
```

### Visual Choreography

**BattleArena Layout:**
- Full width, split into two equal panels with a 2px `var(--color-border)` divider.
- **Left panel header**: "CPU (top/left)" in red-tinted text `var(--color-error)`.
- **Right panel header**: "GPU (transform)" in green-tinted text `var(--color-success)`.
- Each panel: 300x200px animation area, `var(--color-surface)` bg.

**The Animation -- Bouncing Ball:**
- Each panel has a 32px diameter circle.
  - Left ball: `var(--diagram-layer-4)` (orange) with 2px `var(--color-error)` border.
  - Right ball: `var(--diagram-layer-5)` (teal) with 2px `var(--color-success)` border.
- Ball path: horizontal bounce, left edge to right edge and back, continuous.
- Left ball animated with: `element.style.left = x + 'px'` inside `requestAnimationFrame`. This reads `offsetWidth` per frame (triggering layout).
- Right ball animated with: `element.style.transform = 'translateX(' + x + 'px)'` inside `requestAnimationFrame`. Compositor-only.
- At 0% stress: both balls bounce identically, smooth 60fps.
- Ball leaves a fading motion trail: 5 ghost copies at decreasing opacity (0.3, 0.2, 0.15, 0.1, 0.05) trailing behind. Trail makes smoothness/jitter visually obvious.

**Stress Slider (shared control, above both panels):**
- Horizontal slider, full width of the battle arena. Track: 4px tall, `var(--color-border)`. Thumb: 20px circle, `var(--color-accent)`.
- Label: "Main Thread Stress: 0%" -- value updates live.
- Stress implementation: on each `requestAnimationFrame`, if stress > 0, run a blocking loop for `stress * 12ms` (at 80% stress = ~9.6ms of blocking, eating most of the 16ms frame budget).
- As stress increases:
  - Left ball motion trail becomes jagged (frames skipped, trail shows gaps).
  - Right ball motion trail stays smooth.

**Live Metrics Dashboard (below both panels):**
- Three metric rows, each with left/right values:
  1. **FPS**: Large number (48px `var(--font-mono)`). Left value drops with stress (60 -> 45 -> 30 -> 15). Right stays at 60. Color: green if >= 55, yellow if 30-54, red if < 30.
  2. **Frame time**: Horizontal bar chart, 120px wide. Each bar = one frame's duration. Left shows spiking bars (tall = slow frames) in red. Right shows flat bars in green. Rolling window of last 30 frames.
  3. **Main thread busy**: Percentage. Both show the same value (it IS the same thread). But only the left animation suffers because it requires layout work on that thread.

**Animations:**
- Ball bounce: linear, 2s per full bounce cycle. No easing (constant speed makes jitter more visible).
- FPS counter: value change animates with `font-variant-numeric: tabular-nums` to prevent layout shift. Color transitions over 200ms.
- Frame time bars: new bar slides in from right, oldest bar slides out left. 60fps = new bar every ~16ms.
- Stress slider: custom thumb with a glow that intensifies with stress level. At 80%+: thumb glows red (LOOP.glow).

**Reduced motion**: Balls move but without motion trail. FPS counter and frame time bars still update. The core teaching (metrics divergence) works without visual animation smoothness, though the experience is less visceral.

### Teaching Flow (First 60 Seconds)

1. **0s**: Two panels visible, balls bouncing identically. FPS: 60/60. Stress slider at 0%. Everything looks the same. A nudge: "they look identical now. drag the stress slider to see what happens under load."
2. **Reader drags stress to 30%**: Left ball starts showing micro-stutters. FPS: 48/60. Frame time bars on the left show occasional spikes. Right panel: unchanged.
3. **Reader drags to 60%**: Left ball visibly stuttering. Motion trail shows gaps. FPS: 30/60. Frame time bars on left are mostly tall (red). Right: still 60fps, smooth trail, flat green bars.
4. **Reader drags to 80%**: Left ball barely moving -- severe frame drops. FPS: 15/60. The contrast is dramatic. A chip appears: "this is why CSS animations use transform."
5. **Reader slides back to 0%**: Both recover to 60fps. They look identical again. A second chip: "the difference only shows under load -- which is ALWAYS the case in real apps."
6. **Discovery**: Reader understands that the performance gap is invisible in dev tools under ideal conditions but catastrophic in production with real workloads.

### Data & State Shape

```typescript
interface AnimationState {
  running: boolean;
  stressLevel: number;        // 0-100

  // Per-panel metrics (updated every rAF)
  cpu: {
    fps: number;
    frameTime: number;        // ms, current frame
    frameTimes: number[];     // rolling window of last 30
    ballX: number;            // current position
  };
  gpu: {
    fps: number;
    frameTime: number;
    frameTimes: number[];
    ballX: number;
  };
}

// Derived:
// - fpsColor(fps): fps >= 55 ? 'var(--color-success)' : fps >= 30 ? 'var(--diagram-layer-3)' : 'var(--color-error)'
// - trailPositions: last 5 ballX values (for motion trail)
// - mainThreadBusy: stressLevel (same for both, that's the point)
```

### Primitives & Props

**BattleArena** -- THE primary primitive for this format.
```tsx
<BattleArena
  approaches={[
    { id: 'cpu', label: 'CPU (top/left)', color: 'var(--color-error)', render: <CPUBall /> },
    { id: 'gpu', label: 'GPU (transform)', color: 'var(--color-success)', render: <GPUBall /> },
  ]}
  sharedControls={[
    { id: 'stress', type: 'slider', label: 'Main Thread Stress', min: 0, max: 100, suffix: '%' },
  ]}
  metrics={[
    { id: 'fps', label: 'FPS', format: 'integer' },
    { id: 'frame-time', label: 'Frame Time', format: 'bar-chart' },
    { id: 'thread-busy', label: 'Main Thread', format: 'percentage' },
  ]}
/>
```

**Dial** -- For the stress slider (more visual than a native range input).
```tsx
<Dial value={stress} onChange={setStress} min={0} max={100} label="Stress" suffix="%" />
```

**DemoSandbox** -- Outer container.

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Tab hidden (page not visible)** | Pause rAF loop. Resume on visibility change. Prevents phantom frame time accumulation. |
| **Stress at 100%** | Clamp blocking loop to 15ms max (leave 1ms for browser overhead). CPU ball effectively frozen. |
| **Low-power device** | Even at 0% stress, baseline FPS may be < 60. Show actual measured FPS, not hardcoded 60. The relative difference still teaches. |
| **Window resize** | Ball bounce path recalculates to new panel width. No interruption to animation. |
| **Keyboard** | Left/Right arrows on stress slider move by 5%. Shift+Arrow by 20%. Space to pause/resume. |
| **Mobile** | Single-column layout: CPU panel on top, GPU panel below. Slider between them. Metrics below both. |

### Cross-Lesson Connections

- **Depends on core-render-cycle**: The "transform = Composite only" insight from the trigger panel is proven viscerally here. Readers already know WHY transform is cheap; now they SEE the impact.
- **Depends on core-composition**: Layer promotion (will-change: transform) is what enables GPU compositing. This lesson shows the performance payoff of that promotion.
- **Foreshadows core-event-loop**: Main thread blocking directly connects to event loop. "The main thread is busy" is the same concept as "the call stack is occupied." This builds intuition for why long tasks block rendering.

---

## core-event-loop -- Event Loop Scrollytelling + Prediction Game
**Format**: scrollytelling | **Effort**: xl

### Interaction State Machine

```
Phase 1 — "Meet the Machine" (scroll-driven, steps 0-5):

  step-0 ──> step-1 ──> step-2 ──> step-3 ──> step-4 ──> step-5
  (empty)    (stack)    (task-q)   (micro-q)  (web-api)   (render)

Phase 2 — "Watch It Run" (scroll-driven, steps 6-9):

  step-6 ──> step-7 ──> step-8 ──> step-9
  (sync       (setTimeout  (Promise    (stack empty,
   code)       registers)   resolves)   drain order)

Phase 3 — Prediction Game (interactive):

                          +--------------------+
                          | scenario-intro     | (code snippet shown, prediction UI appears)
                          +--------+-----------+
                                   |
                        [drag output blocks into predicted order]
                                   |
                          +--------v-----------+
                          | predicting         | (blocks in user-arranged order)
                          +--------+-----------+
                                   |
                        [click 'Run']
                                   |
                   +---------------v---------------+
                   |                               |
            [prediction correct]            [prediction wrong]
                   |                               |
            +------v-------+                +------v--------+
            | correct      |                | wrong         |
            | (green flash, |                | (red flash,   |
            |  replay to   |                |  replay with  |
            |  reinforce)  |                |  diff overlay) |
            +------+-------+                +------+--------+
                   |                               |
                   +---------------v---------------+
                                   |
                        [click 'Next' or auto-advance]
                                   |
                          +--------v-----------+
                          | scenario-intro     | (next scenario, difficulty increases)
                          +--------+-----------+
                                   |
                        [all 5 scenarios complete]
                                   |
                          +--------v-----------+
                          | mastery-summary    | (score, insights, connections)
                          +--------------------+
```

### Visual Choreography

**The Event Loop Machine (sticky visual, full width of sticky panel):**

Total layout: 600x450px SVG-based diagram.

- **Call Stack** (left side, vertical):
  - 140x300px area. Stack frames are 130x36px rounded rectangles that push UP when added (SPRING.snappy) and pop DOWN when removed.
  - Empty state: gray dashed outline. Label "Call Stack" at top in `var(--font-mono)` `var(--text-xs)`.
  - Active frame: `var(--color-text)` bg with code label. Newest frame on top with a subtle glow (`box-shadow: 0 0 8px var(--color-accent)`).

- **Task Queue** (bottom-right, horizontal):
  - 300x50px area. Tasks are 90x36px pills, colored `var(--diagram-layer-0)` (blue). They enter from the right (slide in, SPRING.snappy) and exit left (slide out when consumed).
  - Label: "Task Queue" above in `var(--font-mono)`.
  - Items show callback names: "setTimeout cb", "click handler", etc.

- **Microtask Queue** (middle-right, horizontal):
  - 300x50px area, positioned above the task queue. Items colored `var(--color-accent)` (accent purple). Same pill shape.
  - Label: "Microtask Queue" above, in `var(--color-accent)`.
  - Visual distinction: a subtle pulsing border (LOOP.breathe) to emphasize its priority.

- **Web API Area** (top-right):
  - 200x120px area. Shows active timers (circular countdown icons, 24px) and fetch requests (globe icon with spinner).
  - Timer: circular progress ring that counts down. When complete, the callback "flies" from the Web API area to the appropriate queue (parabolic arc path, 500ms, SPRING.gentle).

- **Render Steps** (bottom strip, full width):
  - 600x30px area between the queues and the bottom edge. Shows "Style -> Layout -> Paint" as small colored boxes (same colors as render-cycle pipeline). Normally dim (10% opacity). Lights up between task processing to show when rendering CAN happen.

**Data Flow Animations:**
- When a callback moves from Web API to queue: animated along a curved SVG path, 400ms, `easeOut`. The item materializes at source, travels along the path with a trailing glow, lands in the queue.
- When a queue item is consumed: it lifts from the queue (scale 1 -> 1.1, 100ms), travels to the call stack (curved path, 300ms), and pushes onto the stack as a new frame.
- When the stack pops: top frame slides down and fades (200ms, opacity 1 -> 0, translateY 0 -> 20px).
- **Microtask drain**: All microtask items process in RAPID succession (150ms between each) before any task. The microtask queue border pulses faster during drain.
- **Render step highlight**: Between processing a task and checking the task queue again, the render steps area briefly glows (300ms, green tint) to show "the browser CAN render here."

**Phase 3 -- Prediction Game:**
- Code snippet: `300px` wide panel, syntax-highlighted, `var(--color-surface)` bg, `var(--font-mono)`.
- Output prediction area: horizontal bar below the code with numbered slots (1st, 2nd, 3rd...). Each slot is a 50x36px dashed rectangle.
- Draggable output blocks: pill-shaped blocks with the expected output text (e.g., `"1"`, `"2"`, `"promise"`, `"timeout"`). Color-coded: sync = `var(--color-text)`, microtask = `var(--color-accent)`, macrotask = `var(--diagram-layer-0)`, render = `var(--diagram-layer-2)`.
- On drop into slot: block snaps (SPRING.quick).
- "Run" button: large, `var(--color-accent)` bg, centered below.

**After clicking Run:**
- **Correct**: Green flash on all blocks (bg green for 300ms). Score counter increments. The event loop machine replays the execution slowly (500ms per step) to reinforce.
- **Wrong**: Red flash on incorrectly placed blocks. The event loop machine replays, and at each step, the CORRECT block position is highlighted in green while the user's wrong position shows in red (side-by-side ghost). Speed: 700ms per step to allow comprehension.

**Reduced motion**: No animated paths between machine components. Items appear/disappear at source/destination instantly. Queue items simply appear/disappear. Prediction game: no flash -- use border color change instead.

### Teaching Flow (First 60 Seconds)

1. **0s**: Empty event loop machine, all areas dim and outlined. Narrative: "JavaScript is single-threaded."
2. **Scroll**: Call stack highlights with a glowing border. Narrative: "The call stack tracks what's executing RIGHT NOW."
3. **Scroll**: Task queue highlights. Example items appear: "setTimeout cb", "click handler". Narrative: "The task queue holds callbacks..."
4. **Scroll**: Microtask queue highlights in accent color. "Promise.then" appears. Narrative: "The microtask queue is special: it drains COMPLETELY between tasks."
5. **Scroll**: Web API area highlights. Timer icons counting down. Fetch icon spinning. Narrative: "Web APIs run OUTSIDE JavaScript."
6. **Scroll**: Render steps highlight. Narrative: "Between tasks, the browser may run rendering..."
7. **Scroll**: Code example appears: `console.log(1); setTimeout(() => console.log(2), 0); Promise.resolve().then(() => console.log(3)); console.log(4);`
   - `console.log(1)` pushes to stack, executes, pops. "1" appears in output.
8. **Scroll**: `setTimeout` registers in Web API. Timer shows 0ms countdown. Callback "flies" to task queue.
9. **Scroll**: `Promise.resolve().then(...)` -- callback slides into microtask queue directly.
10. **Scroll**: `console.log(4)` executes. Stack empty. Microtask drains: "3" output. Then task: "2" output. Order: 1, 4, 3, 2.
11. **Scroll past**: Prediction game appears. First scenario: the warmup.

### Data & State Shape

```typescript
type QueueType = 'microtask' | 'macrotask';
type ItemStatus = 'queued' | 'executing' | 'completed';

interface StackFrame {
  id: string;
  label: string;            // e.g., "console.log(1)"
  sourceLineIndex: number;  // which line of code this corresponds to
}

interface QueueItem {
  id: string;
  label: string;
  queue: QueueType;
  status: ItemStatus;
  origin: 'web-api' | 'direct';  // setTimeout callbacks come from web-api
}

interface WebAPIItem {
  id: string;
  type: 'timer' | 'fetch' | 'event';
  label: string;
  remaining: number;        // ms remaining (for timers)
  callbackId: string;       // ID of the QueueItem it will produce
}

interface EventLoopMachineState {
  callStack: StackFrame[];
  taskQueue: QueueItem[];
  microtaskQueue: QueueItem[];
  webAPIs: WebAPIItem[];
  renderStepActive: boolean;
  output: string[];           // console output sequence
}

// Prediction game
interface Scenario {
  id: string;
  code: string;               // syntax-highlighted source
  expectedOrder: string[];     // correct output sequence
  difficulty: 1 | 2 | 3 | 4 | 5;
  executionSteps: EventLoopMachineState[];  // pre-computed states for replay
}

interface PredictionGameState {
  currentScenarioIndex: number;
  scenarios: Scenario[];
  userPrediction: string[];        // user's dragged order
  result: 'pending' | 'correct' | 'wrong' | null;
  replayStep: number | null;       // which step of the replay animation
  score: { correct: number; total: number };
}

interface EventLoopState {
  phase: 'scrollytelling-meet' | 'scrollytelling-run' | 'prediction';
  currentStep: number;
  scrollProgress: number;
  machine: EventLoopMachineState;
  game: PredictionGameState;
}

// The 5 scenarios:
const SCENARIOS: Scenario[] = [
  {
    id: 'warmup',
    code: 'console.log("A"); setTimeout(() => console.log("B"), 0);',
    expectedOrder: ['A', 'B'],
    difficulty: 1,
    executionSteps: [/* precomputed */],
  },
  {
    id: 'classic',
    code: `console.log(1);
setTimeout(() => console.log(2), 0);
Promise.resolve().then(() => console.log(3));
console.log(4);`,
    expectedOrder: ['1', '4', '3', '2'],
    difficulty: 2,
    executionSteps: [/* precomputed */],
  },
  {
    id: 'nested-micro',
    code: `Promise.resolve().then(() => {
  console.log("A");
  Promise.resolve().then(() => console.log("B"));
});
Promise.resolve().then(() => console.log("C"));`,
    expectedOrder: ['A', 'C', 'B'],
    difficulty: 3,
    executionSteps: [/* precomputed */],
  },
  {
    id: 'async-await',
    code: `async function foo() {
  console.log(1);
  await Promise.resolve();
  console.log(2);
}
foo();
console.log(3);`,
    expectedOrder: ['1', '3', '2'],
    difficulty: 4,
    executionSteps: [/* precomputed */],
  },
  {
    id: 'full-gauntlet',
    code: `setTimeout(() => console.log("T"), 0);
queueMicrotask(() => console.log("M"));
requestAnimationFrame(() => console.log("R"));
Promise.resolve().then(() => console.log("P"));
console.log("S");`,
    expectedOrder: ['S', 'M', 'P', 'R', 'T'],
    difficulty: 5,
    executionSteps: [/* precomputed */],
  },
];
```

### Primitives & Props

**ScrollytellingShell** -- For Phases 1 and 2.
```tsx
<ScrollytellingShell
  steps={SCROLL_STEPS}
  renderVisual={(stepIndex, progress) => (
    <EventLoopMachine state={computeStateForStep(stepIndex, progress)} />
  )}
/>
```

The prediction game replaces the scrollytelling after Phase 2 completes. It uses **DemoSandbox** for the code panel and prediction area.

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Drag prediction block outside the drop zone** | Block snaps back to its original position (SPRING.quick). |
| **Submit prediction with empty slots** | "Run" button disabled until all slots filled. Gray state with tooltip: "fill all slots." |
| **Back-scroll during Phase 2 code trace** | Machine state rewinds. Items reverse their animation paths. |
| **Replay takes too long** | "Skip replay" button appears after 3 seconds. Clicking it shows final state instantly. |
| **rAF scenario timing** | rAF fires "before the next paint" which is after microtasks but exact ordering relative to macrotasks depends on browser. Note this in a tiny footnote; accept both orderings. |
| **Keyboard drag** | Prediction blocks focusable with Tab. Space to pick up, arrow keys to move between slots, Space/Enter to drop. |
| **Mobile** | Prediction blocks use touch drag. Slots increase to 60x44px for touch targets. |
| **Already-completed scenarios on revisit** | Load score from sessionStorage. Show green checkmarks on completed scenarios. Allow replay. |

### Cross-Lesson Connections

- **Depends on core-render-cycle**: "Render steps" area in the event loop machine directly references the 5-stage pipeline. Readers already know what "Style -> Layout -> Paint" means.
- **Depends on core-gpu**: Understanding that main thread blocking prevents rendering connects to the GPU lesson's stress slider. "Main thread busy" is the same concept.
- **Directly feeds core-microtasks**: The microtask queue introduced here is explored in deep detail in the next lesson. The color coding (accent purple for microtasks) carries forward.
- **The prediction game is the STICKIEST teaching device in the entire section.** Getting a prediction wrong and seeing the replay is the most effective way to internalize event loop rules. This is why it's XL effort.

---

## core-microtasks -- Microtask Deep Dive Explorable
**Format**: explorable | **Effort**: medium

### Interaction State Machine

```
                          +--------------------+
                          | idle               |  (microtask queue visualized, code editor empty)
                          +--------+-----------+
                                   |
                    [type code in editor OR click preset button]
                                   |
                          +--------v-----------+
                          | code-ready         |  (code in editor, 'Run' button active)
                          +--------+-----------+
                                   |
                    [click 'Run']
                                   |
                          +--------v-----------+
                          | executing          |  (step-through: queue fills and drains visually)
                          +--------+-----------+
                                   |
                    [execution completes]
                                   |
                          +--------v-----------+
                          | result-shown       |  (output displayed, interleaving diagram shown)
                          +--------+-----------+
                                   |
                    [click 'Starvation Demo' tab]
                                   |
                          +--------v-----------+
                          | starvation-idle    |  (UI counter visible, 'Start' button ready)
                          +--------+-----------+
                                   |
                    [click 'Start infinite microtask loop']
                                   |
                          +--------v-----------+
                          | starvation-active  |  (UI frozen, counter stuck, queue overflowing)
                          +--------+-----------+
                                   |
                    [5 seconds auto-kill OR click 'Stop']
                                   |
                          +--------v-----------+
                          | starvation-frozen  |  ('render blocked' screaming, fix hint appears)
                          +--------+-----------+
                                   |
                    [edit code to use setTimeout instead]
                                   |
                          +--------v-----------+
                          | fix-applied        |  (counter resumes, queue drains between tasks)
                          +--------+-----------+
                                   |
                    [click 'Interleaving Demo' tab]
                                   |
                          +--------v-----------+
                          | interleave-demo    |  (3 setTimeouts with Promise.then inside)
                          +--------+-----------+
```

### Visual Choreography

**Layout: Two tabs -- "Starvation Demo" (default) and "Interleaving Demo".**

**Starvation Demo tab:**
- Top section (200px tall): Live microtask queue visualization.
  - Horizontal queue, 500px wide. Items are 16px-tall bars colored `var(--color-accent)` that pack left to right.
  - When starvation occurs: bars fill the queue endlessly. They overflow to the right with a "..." indicator. Queue border pulses red (LOOP.pulse).
  - Above the queue: a "render checkpoint" indicator -- a small green dot that should flash between queue drains. During starvation, it's stuck gray with a red X.
- Middle section: A UI counter that should tick every 16ms (requestAnimationFrame-driven). Shows a large number (48px `var(--font-mono)`). When working: number increments smoothly. When frozen: number STOPS (stuck on whatever value it had).
  - Below counter: three dummy buttons ("Click me", "Hover me", "Type here") that become unresponsive during starvation. Cursor changes to `wait`. Clicking them shows a brief red outline pulse (queued event, never processed).
- Bottom section: Code panel with a small editor (200px tall, `var(--font-mono)`, syntax highlighted).
  - Default code: `queueMicrotask(function loop() { queueMicrotask(loop); });`
  - "Run" button and "Stop" (kill) button.
- "Render Blocked" indicator: when starvation active, a 60px-tall red banner slides down from the top (translateY -60 -> 0, 200ms, SPRING.snappy). Text: "RENDER BLOCKED" in white on `var(--color-error)` bg, pulsing opacity (LOOP.pulse).

**Implementation of starvation:**
- Do NOT actually run infinite microtasks (that would freeze the real page). Instead, SIMULATE it:
  - Run the code in a web worker or use a setTimeout-based simulation that PRETENDS the queue is filling.
  - Stop the counter's rAF loop to simulate frozen rendering.
  - Show the queue visualization filling up with simulated items.
  - After 5 seconds, auto-kill and show the "fix hint."
- The fix hint: a chip that says "replace queueMicrotask with setTimeout to yield." When reader edits the code to use setTimeout, run the corrected version -- counter resumes, queue drains between tasks, render checkpoint flashes green.

**Interleaving Demo tab:**
- Pre-loaded code: 3 setTimeouts each containing a Promise.then:
```javascript
setTimeout(() => {
  console.log("task 1");
  Promise.resolve().then(() => console.log("micro 1"));
}, 0);
setTimeout(() => {
  console.log("task 2");
  Promise.resolve().then(() => console.log("micro 2"));
}, 0);
setTimeout(() => {
  console.log("task 3");
  Promise.resolve().then(() => console.log("micro 3"));
}, 0);
```
- Execution visualization: a timeline diagram (horizontal, 500px wide):
  - 6 blocks arranged left to right: `task1`, `micro1`, `task2`, `micro2`, `task3`, `micro3`.
  - Tasks are blue `var(--diagram-layer-0)`, microtasks are purple `var(--color-accent)`.
  - Animated: each block slides in from the left with a 200ms delay between them (staggered, STAGGER.fast * 3). Arrows connect each task to its microtask.
  - Render checkpoints: small green triangles between each task-micro pair, showing where the browser COULD render.

**Reduced motion**: No slide animations. Queue fills appear instantly. Counter stops immediately. Timeline blocks appear all at once.

### Teaching Flow (First 60 Seconds)

1. **0s**: Starvation Demo tab active. Microtask queue visualization (empty). UI counter ticking: 1, 2, 3... Buttons responsive. Code editor shows the recursive queueMicrotask code. A "Start" button is prominent.
2. **Reader clicks "Start"**: The microtask queue starts filling with bars -- rapidly, one per 50ms of simulation. The counter STOPS incrementing (stuck at e.g., 47). The buttons become unresponsive. The "RENDER BLOCKED" banner slides down.
3. **3s of starvation**: Hint chip appears: "the microtask queue never empties, so the browser never gets to render. Try replacing queueMicrotask with setTimeout."
4. **5s**: Auto-kill. Queue empties. Counter resumes. "RENDER BLOCKED" banner slides up.
5. **Reader edits code**: Changes `queueMicrotask(loop)` to `setTimeout(loop, 0)`. Clicks "Run."
6. **Result**: Counter keeps ticking. Queue shows one item appear, drain, render checkpoint flashes green, then the next item. No starvation. A success chip: "setTimeout yields to the browser between iterations."
7. **Reader clicks "Interleaving Demo" tab**: Pre-loaded code executes. Timeline shows task1 -> micro1 -> task2 -> micro2 -> task3 -> micro3. Render checkpoints visible between each pair.
8. **Key insight reinforced**: Microtask checkpoint runs after EACH macrotask, not once at the end.

### Data & State Shape

```typescript
interface MicrotaskState {
  activeTab: 'starvation' | 'interleaving';

  // Starvation demo
  starvation: {
    code: string;
    running: boolean;
    frozen: boolean;               // simulated UI freeze
    counterValue: number;          // last counter value before freeze
    queueDepth: number;            // simulated items in queue (0-100 for visualization)
    showBlockedBanner: boolean;
    showHint: boolean;
    fixApplied: boolean;
  };

  // Interleaving demo
  interleaving: {
    executionTimeline: TimelineItem[];   // derived from pre-computed execution
    animationStep: number;               // which item is currently animating in
    output: string[];
  };

  discoveredSet: Set<string>;
  showSummary: boolean;
}

interface TimelineItem {
  id: string;
  label: string;
  type: 'task' | 'microtask' | 'render';
  color: string;
}
```

### Primitives & Props

**DemoSandbox** with **DemoSandbox.Tabs** for the two demos.
```tsx
<DemoSandbox title="Microtask Deep Dive" minHeight={500}>
  <DemoSandbox.Tabs tabs={['Starvation Demo', 'Interleaving']} />
  {/* tab content */}
</DemoSandbox>
```

No ScrollytellingShell needed -- pure explorable.

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Reader writes actually dangerous code** | The "editor" is a controlled textarea with a whitelist of allowed APIs: `queueMicrotask`, `setTimeout`, `Promise.resolve`, `console.log`, `requestAnimationFrame`. Anything else: "unsupported API" error. |
| **Starvation doesn't auto-kill** | Hard timeout at 5s. Force-stop the simulation. |
| **Reader clicks "Start" multiple times** | Button disabled while running. |
| **Tab switch during starvation** | Auto-stop starvation on tab switch. Resume counter. |
| **Mobile** | Code editor shrinks to full-width, 150px tall. Queue visualization below it. Stack vertically. |
| **Keyboard** | Tab to "Start" button, Enter to run. Tab to code editor, type freely. Tab to "Stop". Ctrl+Enter to run from editor. |

### Cross-Lesson Connections

- **Depends on core-event-loop**: The microtask queue and checkpoint concept were introduced in the event loop lesson. This lesson zooms in. The accent purple color for microtasks carries forward.
- **The starvation demo is the visceral counterpart to the event loop prediction game.** Where the prediction game teaches ORDERING, the starvation demo teaches CONSEQUENCES.
- **Connects to core-render-cycle**: "Render blocked" directly references the render pipeline. If microtasks never yield, the pipeline never runs. The "render checkpoint" indicator uses the same green color as the Composite stage.
- **Final stop in Section 1**: This lesson synthesizes everything. Box model (layout calculations), positioning (flow), BFC (isolation), stacking (paint order), render cycle (pipeline), composition (layers), GPU (compositor), event loop (scheduling), and now microtasks (blocking). The reader has built a complete mental model from the ground up.

---

## Section Arc Summary

The 9 stops form a deliberate spiral:

1. **core-box-model** -- How big is an element? (spatial)
2. **core-positioning** -- Where does an element go? (spatial)
3. **core-formatting-ctx** -- How do siblings interact? (relational)
4. **core-stacking-ctx** -- In what order do elements paint? (z-axis)
5. **core-render-cycle** -- What work does the browser do to display all of this? (process)
6. **core-composition** -- How does the GPU help? (optimization)
7. **core-gpu** -- What's the performance impact? (proof)
8. **core-event-loop** -- How does JavaScript schedule all of this? (timing)
9. **core-microtasks** -- What happens when scheduling goes wrong? (failure mode)

Each stop assumes the vocabulary and mental models of all prior stops. The color system (diagram-layer-0 through diagram-layer-9) is used consistently across all stops for the same concepts. The FormulaBar, MeasureLine, and Annotation primitives are built once in core-box-model and reused throughout.
