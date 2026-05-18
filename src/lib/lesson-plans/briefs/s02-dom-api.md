# Section 2: DOM API -- Implementation Briefs

> Each stop below is a self-contained blueprint. An agent reading a single stop
> should have enough detail to build the component without asking design questions.

---

## dom-refresher -- DOM Anatomy Viewer
**Format**: anatomy | **Effort**: medium

### Interaction State Machine

```
                      +------------------+
                      |      idle        |
                      |  (tree visible,  |
                      |  nothing active) |
                      +--------+---------+
                               |
                    hover node  |  type in search bar
               +----------------+----------------+
               v                                 v
     +-------------------+            +--------------------+
     |   node-hovered    |            |   search-active    |
     | (border highlight,|            | (input focused,    |
     |  tooltip visible) |            |  results live)     |
     +--------+----------+            +--------+-----------+
              |                                |
         click node                  enter/blur with query
              |                                |
              v                                v
     +-------------------+            +--------------------+
     |  node-selected    |            |  search-results    |
     | (slide-out panel  |            | (matching nodes    |
     |  visible, CRUD    |            |  glow, count shown)|
     |  method groups)   |            +--------------------+
     +--------+----------+                     |
              |                          click a glowing node
         click a method                        |
              |                    +-----------+
              v                    v
     +-------------------+
     | method-running    |
     | (animation plays  |
     |  on the tree)     |
     +--------+----------+
              |
         animation completes
              |
              v
     +-------------------+
     |  result-shown     |
     | (outcome visible, |
     |  tree updated)    |
     +--------+----------+
              |
         click tree bg / Escape / click another node
              |
              v
           (idle)
```

**State data**:
- `idle`: no stored selection.
- `node-hovered`: `hoveredNodeId: string`.
- `node-selected`: `selectedNodeId: string`, triggers panel slide.
- `search-active`: `searchQuery: string`, `matchingNodeIds: string[]`.
- `method-running`: `activeMethod: MethodId`, `targetNodeId: string`, `animationPhase: 'enter' | 'execute' | 'exit'`.
- `result-shown`: `lastResult: { method: MethodId, affectedNodes: string[], outcome: string }`.

**Transitions**:
- `idle -> node-hovered`: onMouseEnter any tree node.
- `node-hovered -> idle`: onMouseLeave without click.
- `node-hovered -> node-selected`: onClick on hovered node.
- `node-selected -> method-running`: click a method chip in the slide-out panel.
- `method-running -> result-shown`: animation promise resolves.
- `result-shown -> node-selected`: auto-return after 2s, or click panel background.
- `result-shown -> idle`: press Escape or click tree background.
- Any state -> `search-active`: focus the search input.
- `search-active -> search-results`: query length > 0 and matches exist.
- `search-active -> idle`: blur with empty query or press Escape.

### Visual Choreography

**Tree rendering (mount)**:
- Nodes stagger in top-to-bottom using `STAGGER.fast` (0.06s per node). Each node fades from `opacity: 0, y: -4` to `opacity: 1, y: 0` over `DURATION.fast` (200ms), ease-out. Total for 18 nodes: ~1.3s. CSS-only via `@keyframes` with `animation-delay` calculated per node index.

**Node hover**:
- Border: `2px solid var(--diagram-layer-0)` fades in over 150ms ease-out. CSS `transition: border-color 150ms ease-out`. No JS needed.
- Tooltip: absolutely positioned above node. Appears with `opacity: 0 -> 1` and `y: 4 -> 0` over `DURATION.instant` (150ms). Pure CSS with `:hover + .tooltip` or CSS `transition`. Text: "Click to explore". Monospace font, `--text-xs`.

**Node selection (click)**:
- Selected node gets `2px solid var(--color-accent)` border, `background: var(--color-surface-2)`. Spring scale to 1.03 using `SPRING.quick` (stiffness: 400, damping: 26). Framer-motion `animate={{ scale: 1.03 }}`.
- All non-selected sibling nodes dim to `opacity: 0.5` over `DURATION.fast`.
- Slide-out panel enters from the right: `x: 100% -> 0` over `DURATION.normal` (300ms), ease-out. Framer-motion `AnimatePresence` + `motion.div`. Panel width: 320px (desktop), full width (mobile overlay).

**Slide-out panel content**:
- Four category headers stagger in with `STAGGER.fast`. Each header has a colored dot:
  - Create: `var(--color-success)` (oklch green)
  - Read: `var(--diagram-layer-0)` (blue)
  - Update: `var(--diagram-layer-3)` (yellow/gold)
  - Delete: `var(--color-error)` (red)
- Method chips within each category stagger in 30ms after their header. Chips are `border-radius: var(--radius-1)`, `padding: var(--space-1) var(--space-2)`, monospace text, background tinted to match category color at 15% opacity.

**Method execution animations** (all framer-motion):
- **Create (appendChild, insertBefore, createElement)**: New node slides down from parent with `SPRING.gentle` (stiffness: 300, damping: 20). Node starts at `opacity: 0, scaleY: 0, height: 0` and expands to full. Tree below shifts down with `TRANSITION.enterCard`. Green pulse on new node: `boxShadow` animates `0 0 0 4px var(--color-success)` once over 600ms then fades.
- **Read (querySelector, getElementById, childNodes, etc.)**: Target node(s) get a sweeping highlight -- a `::after` pseudo-element wipes left-to-right with `var(--diagram-layer-0)` at 20% opacity, 400ms. If multiple results (querySelectorAll), stagger the wipe across matches at 80ms intervals.
- **Update (setAttribute, classList.add, textContent, style)**: The changed property value flickers (text swaps with a 100ms crossfade). Node border flashes yellow (`var(--diagram-layer-3)`) once: `opacity: 0 -> 1 -> 0` over 500ms.
- **Delete (removeChild, remove)**: Node and all children fade to `opacity: 0` and `scaleY: 0` over `DURATION.normal` (300ms) with `EASE.out`. Gap closes with `TRANSITION.enterCard` as siblings shift up. Red flash (`boxShadow: 0 0 0 4px var(--color-error)`) on the removed node's location, fading over 400ms.
- **Traversal (parentNode, nextSibling, children, firstChild)**: A dotted line animates from the selected node to the target node. Line draws itself using SVG `stroke-dashoffset` animation over 300ms. Target node pulses with accent border.

**Search bar**:
- Input field at top of tree panel, monospace, `--text-sm`. Placeholder: `querySelector('.card')`.
- On keystroke (debounced 150ms): matching nodes get a glow: `box-shadow: 0 0 8px 2px var(--diagram-layer-0)`. Non-matching nodes dim to `opacity: 0.4`. Glow uses CSS transition (200ms).
- Match count badge next to input: e.g., "3 matches". Badge enters with `SPRING.snappy`.

**Reduced motion**:
- All animations become instant (`duration: 0`). Stagger delays removed. Scale changes removed. Slide-out panel appears immediately (no slide). Glow/highlight applied without transition. Traversal dotted lines appear fully drawn.

### Teaching Flow (First 60 Seconds)

1. **(0-2s)** Tree mounts with stagger animation. 18 nodes visible in a DevTools-like indented tree. Root is `<html>`, containing `<head>` (collapsed) and `<body>`. Body contains: `<header>`, `<main>` with `<div class="card-list">` holding three `<div class="card">` children each with `<h2>`, `<p>`, `<button>`. Also `<aside class="sidebar">` and `<footer>`. Each node shows tag name in monospace and class/id as a dimmed attribute: `div.card`, `h2`, `button.delete-btn`.

2. **(2-5s)** A subtle nudge text fades in at top-right: "Click any node to explore its methods" in `--color-muted`, `--text-xs`. Fades out after 4 seconds if no interaction.

3. **(5-8s)** Reader hovers over `<div class="card">`. Blue border appears. Tooltip shows "Click to explore" with a small arrow pointing down.

4. **(8-10s)** Reader clicks the `<div class="card">`. Node highlights with accent border, scales to 1.03. Sibling nodes dim. Slide-out panel enters from right (300ms ease-out).

5. **(10-15s)** Panel shows four color-coded groups staggering in:
   - **Create** (green dot): `appendChild`, `insertBefore`, `cloneNode`
   - **Read** (blue dot): `querySelector`, `querySelectorAll`, `children`, `childNodes`, `closest`, `matches`
   - **Update** (yellow dot): `setAttribute`, `classList.add`, `classList.toggle`, `textContent`, `innerHTML`, `style.setProperty`
   - **Delete** (red dot): `removeChild`, `remove`
   - **Traverse** (purple dot, `--diagram-layer-2`): `parentNode`, `nextSibling`, `previousSibling`, `firstChild`, `lastChild`

6. **(15-20s)** Reader clicks `parentNode` under Traverse. A dotted SVG line draws from `<div class="card">` up to `<div class="card-list">`. The parent highlights with accent border. A small label appears: "parentNode -> div.card-list".

7. **(20-30s)** Reader clicks `removeChild` under Delete. The `<div class="card">` and all its children (`<h2>`, `<p>`, `<button>`) fade out simultaneously (300ms). The tree reflows -- the two remaining cards shift up smoothly. A red flash at the removal point. Result banner at panel bottom: "Removed div.card and 3 children".

8. **(30-45s)** Reader clicks the search bar. Types `querySelectorAll('.card')`. As they type: after `.c` no matches. After `.card`: 2 remaining `.card` nodes glow blue. Match badge: "2 matches". The reader visually sees that the removed card is gone from results.

9. **(45-60s)** Reader clicks one of the glowing `.card` nodes. Panel re-opens for that node. They click `appendChild` under Create. A placeholder `<div>` slides in as a new child of the card with green pulse. The reader has now performed Create, Read, Delete, and Traverse -- all through direct manipulation.

### Data & State Shape

```typescript
// --- Tree Data ---
type DOMNodeData = {
  id: string;                          // unique key, e.g. "node-7"
  tag: string;                         // "div", "h2", "button"
  attributes: Record<string, string>;  // { class: "card", id: "main" }
  children: string[];                  // child node IDs (ordered)
  parentId: string | null;
  textContent?: string;                // leaf text nodes
};

type TreeState = {
  nodes: Record<string, DOMNodeData>;  // stored, mutable via methods
  rootId: string;                      // "node-0" (the <html>)
};

// --- Interaction State ---
type ViewerState = {
  hoveredNodeId: string | null;        // derived: set on mouse events
  selectedNodeId: string | null;       // stored: set on click
  panelOpen: boolean;                  // derived from selectedNodeId !== null
  searchQuery: string;                 // stored: controlled input
  matchingNodeIds: string[];           // derived: computed from searchQuery + tree
  activeMethod: MethodExecution | null;// stored: set when method chip clicked
};

type MethodExecution = {
  methodId: string;                    // "removeChild", "querySelector", etc.
  targetNodeId: string;
  category: 'create' | 'read' | 'update' | 'delete' | 'traverse';
  animationPhase: 'enter' | 'execute' | 'exit' | 'done';
  result: MethodResult | null;        // populated after execution
};

type MethodResult = {
  affectedNodeIds: string[];
  description: string;                 // "Removed div.card and 3 children"
  treeSnapshot: TreeState;             // new tree state after mutation
};

// --- Method Registry ---
type MethodDef = {
  id: string;
  label: string;                       // display name
  category: 'create' | 'read' | 'update' | 'delete' | 'traverse';
  applicableTo: string[];             // tag names or '*' for all
  execute: (tree: TreeState, targetId: string) => MethodResult;
  syntax: string;                      // "parent.removeChild(node)"
};
```

**Derived vs Stored**:
- Stored: `TreeState.nodes`, `selectedNodeId`, `searchQuery`, `activeMethod`.
- Derived: `matchingNodeIds` (useMemo from searchQuery + nodes), `panelOpen` (boolean from selectedNodeId), `hoveredNodeId` (local event state, not in global store), applicable methods for selected node (filtered from registry by tag name).

**Shared state**: None. This component is self-contained. Tree state lives in `useReducer` with actions: `SELECT_NODE`, `EXECUTE_METHOD`, `SET_SEARCH`, `RESET`.

### Primitives & Props

**AnatomyViewer** (from shared primitives):
```tsx
<AnatomyViewer
  regions={treeNodeRegions}        // each node is a clickable region
  renderDiagram={() => <DOMTree />} // the tree visualization
  onRegionClick={(regionId) => selectNode(regionId)}
  onRegionHover={(regionId) => setHovered(regionId)}
  breadcrumb={selectedPath}         // e.g. ["html", "body", "main", "div.card"]
/>
```

**DemoSandbox** (reused per lesson metadata):
- Wraps the entire viewer in the standard interactive container with consistent border, background, and padding.
- Props: `title="DOM Anatomy"`, `fullWidth={true}`.

**Additional internal components** (built for this lesson, not shared):
- `DOMTreeRenderer`: recursive tree node rendering with indent levels.
- `MethodPanel`: the slide-out panel with categorized method chips.
- `SearchBar`: debounced input with match counter.
- `TraversalLine`: SVG path for drawing connections between nodes.

### Edge Cases

**Method on incompatible node type**:
- Running `appendChild` on a void element (`<img>`, `<input>`, `<br>`): method chip is visible but dimmed with a tooltip "Void elements cannot have children". Click does nothing.
- Running `removeChild` on a node with no children: chip dimmed, tooltip "No children to remove".

**removeChild on root (`<html>`)**:
- The `<html>` node's Delete category shows all methods dimmed. Tooltip: "Cannot remove the document root". This prevents an empty tree state.

**Invalid selector in search bar**:
- Wrap the internal matching logic in try/catch. On invalid CSS selector syntax (e.g., `querySelector('...')`), show inline error below input: "Invalid selector" in `var(--color-error)`, `--text-xs`. No nodes highlight. Error clears on next valid keystroke.

**Empty search results**:
- If query is valid but matches nothing: all nodes dim to `opacity: 0.4`. Badge shows "0 matches". No glow on any node.

**Rapid method clicks**:
- If a method animation is in progress (`activeMethod.animationPhase !== 'done'`), additional method clicks are queued (max 1 in queue). The queued method runs after the current animation completes. Visual: queued chip shows a subtle pulse to indicate "pending".

**Keyboard navigation**:
- `Tab` moves focus through tree nodes (top-to-bottom, depth-first). `Enter` or `Space` on a focused node = select (opens panel). `Escape` = deselect (closes panel, returns to tree). Arrow keys within the panel navigate method chips. `Enter` on a focused chip = execute method. `Tab` from last chip returns focus to tree.
- Tree nodes have `role="treeitem"`, panel has `role="complementary"`, method chips have `role="button"`.

**Mobile / narrow viewport (<768px)**:
- Tree takes full width. Panel overlays as a bottom sheet (slides up from bottom, 60vh max-height) instead of side panel. Search bar moves above the tree. Touch: tap = select (no hover state).

**Tree overflow (after many creates)**:
- Tree container has `overflow-y: auto` with `max-height: 600px`. Newly created nodes auto-scroll into view using `scrollIntoView({ behavior: 'smooth', block: 'nearest' })`.

### Cross-Lesson Connections

- **Foundation for dom-querying**: The search bar in dom-refresher uses `querySelector`/`querySelectorAll` syntax, giving the reader their first taste of query methods. When they reach the QueryMethodBattle, they already have muscle memory for typing selectors. The tree structure (18 nodes, class-based) is intentionally simple so the reader internalizes the shape before facing the 50-node tree in dom-querying.
- **CRUD vocabulary carries forward**: The color coding (Create=green, Read=blue, Update=yellow, Delete=red) established here is reused in the challenge chain's test feedback and the scrollytelling's performance annotations. Consistency across the section builds recognition.
- **Traversal animations reused**: The dotted SVG line for `parentNode`/`nextSibling` traversal in dom-refresher reappears in dom-querying as the animated traversal path that query methods take through the tree. Same visual language, escalated complexity.
- **Mental model for perf**: The reader who has clicked `querySelector` in the anatomy viewer and watched nodes highlight one-by-one already has an intuition for "querySelector walks the tree." The scrollytelling (dom-query-perf) makes this cost EXPLICIT with timing bars and node counts, but the intuition was planted here.
- **removeChild experience informs challenge 2**: The reader who ran `removeChild` in the anatomy viewer and saw the subtree disappear has already encountered the concept before challenge 2 of the assignment asks them to implement delete buttons.

---

## dom-querying -- Query Method Battle
**Format**: battle | **Effort**: medium

### Interaction State Machine

```
                    +--------------------+
                    |      setup         |
                    | (tree rendered,    |
                    |  query bar empty,  |
                    |  methods idle)     |
                    +--------+-----------+
                             |
                   reader types a target description
                   or picks a preset
                             |
                             v
                    +--------------------+
                    |  target-selected   |
                    | (query target set, |
                    |  methods ready to  |
                    |  race)             |
                    +--------+-----------+
                             |
                   click "Race" button
                             |
                             v
                    +--------------------+
                    |  race-running      |
                    | (all 4 methods run |
                    |  simultaneously    |
                    |  with traversal    |
                    |  animations)       |
                    +--------+-----------+
                             |
                   all animations complete
                             |
                             v
                    +--------------------+
                    |  results-shown     |
                    | (timing bars,      |
                    |  result counts,    |
                    |  winner badge)     |
                    +--------+-----------+
                             |
            click "Live/Static Demo"  OR  new query
                   |                        |
                   v                        v
          +--------------------+      (target-selected)
          | live-static-demo   |
          | (collection shown, |
          |  add-element btn   |
          |  visible)          |
          +--------+-----------+
                   |
            click "Add Element"
                   |
                   v
          +--------------------+
          | live-static-reveal |
          | (HTMLCollection    |
          |  count updates,    |
          |  NodeList count    |
          |  stays frozen)     |
          +--------------------+
                   |
            click "Reset" or new query
                   |
                   v
                (setup)
```

**State data**:
- `setup`: `treeNodes: DOMNodeData[]` (50 nodes, static), all methods at rest.
- `target-selected`: `queryTarget: { description: string, selector: string, id?: string, className?: string }`.
- `race-running`: `methodStates: Record<MethodName, { phase: 'traversing' | 'found' | 'done', visitedNodeIds: string[], resultNodeIds: string[], elapsedMs: number }>`.
- `results-shown`: `raceResults: Record<MethodName, { resultNodeIds: string[], elapsedMs: number, returnType: 'Element' | 'HTMLCollection' | 'NodeList' | 'null' }>`.
- `live-static-demo`: `liveCollection: { ids: string[], isLive: true }`, `staticList: { ids: string[], isLive: false }`.
- `live-static-reveal`: same, but `liveCollection.ids` has grown by 1, `staticList.ids` unchanged.

### Visual Choreography

**Tree layout (mount)**:
- 50 nodes rendered as a compact tree graph (not indented list -- actual node-edge graph). Nodes are small circles (16px diameter) with tag abbreviation on hover. Connected by thin lines (`1px var(--color-border)`). Layout: d3-hierarchy tree layout, top-to-bottom. Stagger in over 800ms using `STAGGER.fast`.

**Race start**:
- "Race" button pulses once (`SPRING.quick` scale 1 -> 1.05 -> 1) then all four method columns begin simultaneously.

**Traversal animations** (the core teaching visual):
- **getElementById**: Single node instantly highlights in green (`var(--color-success)`). No traversal animation -- the node just "pops" with a scale 1 -> 1.3 -> 1 spring (`SPRING.snappy`, 200ms). This represents the O(1) hash-map lookup. A label appears: "Hash map: O(1)".
- **querySelector('.card')**: Nodes light up one-by-one in depth-first order. Each node gets `background: var(--diagram-layer-0)` at 40% opacity for 30ms, then dims back unless it matches. Speed: 30ms per node (50 nodes = 1.5s total traversal). First match locks in with `var(--diagram-layer-0)` solid fill and the traversal STOPS. Label: "Tree walk: stopped at first match".
- **getElementsByClassName**: Same depth-first traversal animation as querySelector (30ms per node), but does NOT stop at first match -- continues through all 50 nodes. All matches stay highlighted in `var(--diagram-layer-3)`. Label: "Tree walk: all nodes, LIVE collection".
- **querySelectorAll**: Same depth-first traversal (30ms/node, all nodes visited). All matches highlighted in `var(--diagram-layer-2)`. Label: "Tree walk: all nodes, STATIC snapshot".

**Timing bars** (appear after race):
- Horizontal bars below each method, growing left-to-right with `TRANSITION.progress` (500ms ease-out). Bar length proportional to traversal time. getElementById bar is nearly invisible (just a green dot). querySelector bar stops partway. Both getAll methods have full-width bars. Colors match method highlights.

**Result cards**:
- Below each timing bar: a card showing return type, match count, and collection type badge. Cards stagger in at `STAGGER.fast`. Collection type badge: "LIVE" in red-orange (`var(--diagram-layer-4)`) or "STATIC" in blue (`var(--diagram-layer-0)`).

**Live vs Static demo**:
- Panel slides down (`TRANSITION.collapse`, 300ms ease-in-out) showing two collection objects side by side.
- Left: `HTMLCollection [div.card, div.card, div.card]` with a live count badge: "Length: 3".
- Right: `NodeList [div.card, div.card, div.card]` with a static count badge: "Length: 3".
- "Add Element" button between them, large, accent-colored, with a `+` icon.

**Add Element animation**:
- Click "Add Element": a new `.card` node slides into the tree graph from above (`SPRING.gentle`, y: -20 -> 0, opacity: 0 -> 1). Simultaneously:
  - Left (HTMLCollection) count badge animates: "3" -> "4" with a number-flip animation (old number slides up, new slides down, 200ms). Badge background pulses green.
  - Right (NodeList) count badge: NOTHING happens. Badge background pulses red briefly, then a label fades in: "Frozen at query time". The "3" stays rock-solid.
- This asymmetry IS the lesson. Pause 1s, then a summary label fades in: "Live collections auto-update. Static snapshots don't."

**Reduced motion**:
- Traversal: all visited nodes highlight simultaneously (no sequential walk). Timing bars appear at full length instantly. Number flip is a simple text swap with no animation. Add-element node appears in place.

### Teaching Flow (First 60 Seconds)

1. **(0-3s)** 50-node tree graph renders with a quick stagger. Compact, visually dense but readable. Four method columns below the tree, each labeled: `getElementById`, `querySelector`, `getElementsByClassName`, `querySelectorAll`. Each column is dimmed with a "waiting..." label.

2. **(3-8s)** A target bar at top shows 3 preset buttons: "Find #hero (by ID)", "Find first .card (by class)", "Find ALL .card (by class)". Plus a text input for custom queries. Reader clicks "Find ALL .card (by class)".

3. **(8-10s)** Target description locks in. A "Race!" button appears, large and pulsing gently (`LOOP.breathe` at 50% intensity).

4. **(10-25s)** Reader clicks "Race!". All four methods start simultaneously:
   - `getElementById`: irrelevant for class-based query -- column shows "N/A" dimmed (getElementById cannot search by class).
   - `querySelector('.card')`: nodes light up one by one. At node 14, the first `.card` is found -- traversal stops. 7 nodes remain unvisited (dim). Time bar grows to ~30%.
   - `getElementsByClassName('card')`: nodes light up one by one through all 50. All 5 `.card` nodes glow gold. Time bar grows to 100%.
   - `querySelectorAll('.card')`: same traversal through all 50 nodes. All 5 `.card` nodes glow purple. Time bar grows to 100%.

5. **(25-35s)** Results lock in. Timing bars animate. Result cards stagger in:
   - getElementById: "N/A"
   - querySelector: "1 Element | 420 node checks" (stopped early)
   - getElementsByClassName: "HTMLCollection (5) | LIVE | 1500 node checks"
   - querySelectorAll: "NodeList (5) | STATIC | 1500 node checks"

6. **(35-40s)** Reader notices the "LIVE" vs "STATIC" badges. A pulsing "See the difference" button appears below the results.

7. **(40-50s)** Reader clicks it. Live/Static demo panel slides down. Two collection displays side by side, both showing Length: 5. "Add matching element" button prominent in the center.

8. **(50-60s)** Reader clicks "Add Element". New `.card` node appears in tree. Left collection: 5 -> 6 with green pulse. Right collection: stays at 5 with red "Frozen at query time" label. The reader viscerally sees the difference between live and static collections.

### Data & State Shape

```typescript
// --- Tree ---
type BattleTreeNode = {
  id: string;
  tag: string;
  className: string;
  domId?: string;              // HTML id attribute
  children: string[];
  x: number; y: number;       // pre-computed layout coords
};

type BattleTree = {
  nodes: Record<string, BattleTreeNode>;
  rootId: string;
  edges: Array<[string, string]>;   // [parentId, childId] for rendering lines
};

// --- Race State ---
type MethodName = 'getElementById' | 'querySelector' | 'getElementsByClassName' | 'querySelectorAll';

type QueryTarget = {
  description: string;         // "Find ALL .card"
  selector: string;            // ".card"
  id?: string;                 // for getElementById
  className?: string;          // for getElementsByClassName
};

type MethodRaceState = {
  phase: 'idle' | 'traversing' | 'found' | 'done' | 'na';
  visitedNodeIds: string[];    // nodes checked so far (drives animation)
  resultNodeIds: string[];     // nodes that matched
  elapsedSteps: number;        // simulated "cost" (node visit count)
  returnType: 'Element' | 'HTMLCollection' | 'NodeList' | null;
  isLive: boolean;
};

type BattleState = {
  tree: BattleTree;                              // stored, mutable (for add-element)
  queryTarget: QueryTarget | null;               // stored
  racePhase: 'setup' | 'ready' | 'racing' | 'results';  // stored
  methods: Record<MethodName, MethodRaceState>;  // stored
  liveStaticDemoOpen: boolean;                   // stored
  addedElements: string[];                       // stored: IDs of dynamically added nodes
};
```

**Derived**:
- Traversal animation frame (which nodes are lit) = derived from `visitedNodeIds` + a `requestAnimationFrame` timer that reveals one node per 30ms tick.
- Timing bar width = derived from `elapsedSteps / maxSteps`.
- Winner = derived from comparing `elapsedSteps` across methods (lowest with valid results).

**Shared state**: Tree data is local. No cross-component state needed.

### Primitives & Props

**BattleArena** (from shared primitives):
```tsx
<BattleArena
  approaches={[
    { id: 'getElementById', label: 'getElementById', color: 'var(--color-success)' },
    { id: 'querySelector', label: 'querySelector', color: 'var(--diagram-layer-0)' },
    { id: 'getElementsByClassName', label: 'getElementsByClassName', color: 'var(--diagram-layer-3)' },
    { id: 'querySelectorAll', label: 'querySelectorAll', color: 'var(--diagram-layer-2)' },
  ]}
  sharedControls={[
    { type: 'preset-buttons', options: presetTargets },
    { type: 'text-input', placeholder: "Or type a selector..." },
    { type: 'action-button', label: 'Race!', onClick: startRace },
  ]}
  metrics={[
    { id: 'nodes-checked', label: 'Nodes Checked', format: 'number' },
    { id: 'return-type', label: 'Returns', format: 'badge' },
    { id: 'collection-type', label: 'Collection', format: 'badge' },
  ]}
  renderApproach={(approachId, state) => <MethodColumn ... />}
/>
```

**DemoSandbox**: wraps the entire battle. `title="Query Method Battle"`, `fullWidth={true}`.

**Internal components**:
- `TreeGraph`: d3-hierarchy layout rendering 50 nodes as circles with edges.
- `TraversalAnimator`: takes `visitedNodeIds` array and a speed, reveals highlights sequentially.
- `MethodColumn`: single method's result display (timing bar + result card).
- `LiveStaticPanel`: the side-by-side collection comparison with add-element button.
- `NumberFlip`: animated counter component for the collection length change.

### Edge Cases

**Custom selector that matches nothing**:
- All methods complete traversal, 0 results. Result cards show "0 matches". No winner badge. A hint fades in: "No elements matched. Try `.card` or `#hero`."

**Custom selector that is invalid CSS**:
- querySelector/querySelectorAll columns show "SyntaxError" in red. getElementsBy columns attempt their lookup normally. Input field border turns `var(--color-error)`.

**getElementById with a class selector**:
- Column shows "N/A -- getElementById only accepts IDs" dimmed. Other methods run normally.

**Reader clicks Race before selecting a target**:
- "Race!" button is disabled (dimmed, `cursor: not-allowed`) until a target is set. No empty race possible.

**Reader clicks "Add Element" multiple times**:
- Each click adds one more `.card` node. HTMLCollection count increments each time. NodeList stays frozen at original count. Cap at 5 additions (button disables after 5 with tooltip "Max additions reached"). This prevents layout overflow.

**Keyboard navigation**:
- Tab order: preset buttons -> custom input -> Race button -> method columns (informational, not interactive) -> Live/Static button -> Add Element button. `Enter` on Race triggers the race. `Escape` resets to setup. `aria-live="polite"` on result cards so screen readers announce results.

**Narrow viewport (<768px)**:
- Methods stack vertically (2x2 grid) instead of 4 columns. Tree graph scales down. Live/Static demo stacks vertically instead of side-by-side.

### Cross-Lesson Connections

- **Builds on dom-refresher**: The reader typed `querySelector('.card')` in the anatomy viewer's search bar. Here they see WHY `querySelector` stops at the first match (the traversal animation stops) while `querySelectorAll` continues through all nodes. The search bar was foreshadowing.
- **Traversal animation reused in dom-query-perf**: The one-by-one node lighting animation created here is the SAME visual used in the scrollytelling. In dom-query-perf, the reader watches this traversal shrink (from 100 nodes to 12 to 1) as optimization strategies are applied. Visual continuity is critical.
- **Live vs Static informs challenge 3**: Challenge 3 (search input filtering) requires the reader to choose between live and static collections. If they use `getElementsByClassName`, their collection auto-updates when they add/remove DOM nodes -- which might cause unexpected behavior during iteration. The battle gave them the intuition; the challenge tests if they apply it.
- **Performance framing**: The timing bars and "nodes checked" metric plant the seed for the query-perf scrollytelling. The reader already knows that `getElementById` is O(1) and selector-based queries walk the tree. The scrollytelling makes the cost concrete at 100-node scale with real optimization strategies.

---

## dom-query-perf -- Query Performance Scrollytelling
**Format**: scrollytelling | **Effort**: medium

### Interaction State Machine

```
                    +------------------------+
                    |    scroll-step-0       |
                    | (tree visible, all     |
                    |  nodes dim, step 0     |
                    |  narrative visible)     |
                    +--------+---------------+
                             |
                    reader scrolls down
                             |
                             v
                    +------------------------+
                    |    scroll-step-N       |
                    | (tree animates per     |
                    |  step config, N=1..4)  |
                    +--------+---------------+
                             |
                    scrolls past step 4 (layout thrashing)
                             |
                             v
                    +------------------------+
                    | thrash-interactive      |
                    | (toggle between         |
                    |  interleaved/batched)   |
                    +--------+---------------+
                             |
                    scrolls past interactive zone
                             |
                             v
                    +------------------------+
                    |  refactor-challenge    |
                    | (code editor with bad  |
                    |  code, reader edits    |
                    |  to optimize)          |
                    +--------+---------------+
                             |
                    reader edits and runs
                             |
                             v
                    +------------------------+
                    |  refactor-feedback     |
                    | (tree re-animates      |
                    |  showing improvement)  |
                    +------------------------+
```

**State data**:
- `currentStep: number` (0-4, driven by IntersectionObserver).
- `optimizationLevel: 'naive' | 'scoped' | 'cached' | 'batched'` (derived from step).
- `traversalNodeCount: number` (100, 12, 1, or 0 depending on step).
- `thrashMode: 'interleaved' | 'batched'` (stored, toggled by user).
- `pipelineRunCount: number` (6 for interleaved, 1 for batched).
- `refactorCode: string` (stored, editable by reader).
- `refactorResult: { nodeCount: number, timeMs: number } | null`.

### Visual Choreography

**Sticky visual: Tree graph**:
- 100+ nodes rendered as a compact force-directed or radial tree. Nodes are tiny (8px circles). Edges are thin (0.5px). Tree fills the sticky panel (60% of viewport width). A "query cost" bar runs along the bottom of the sticky: a horizontal bar that fills proportional to nodes visited, with a numeric label.

**Step 0 -- Establishing shot**:
- Tree fades in over `DURATION.slow` (500ms). All nodes at base color (`var(--color-border)`, dim). No traversal. Cost bar empty. Label: "100 nodes".

**Step 1 -- Naive: full traversal**:
- ALL 100 nodes light up in a wave radiating from root. Wave speed: 15ms per node (total ~1.5s). Color: `var(--color-error)` at 50% opacity. Cost bar fills to 100% in sync with the wave, colored red. Label changes: "100 / 100 nodes checked". Timing overlay: "~2.4ms".

**Step 2 -- Scope narrowing**:
- Camera (viewport) zooms into a subtree of 12 nodes (CSS `transform: scale(1.8)` centered on the subtree, `TRANSITION.enterCard` 300ms). Non-subtree nodes fade to `opacity: 0.15`. Then the 12-node traversal lights up: same wave, but only 12 nodes glow `var(--diagram-layer-3)`. Cost bar shrinks to 12% width, colored yellow-green. Label: "12 / 100 nodes checked". Timing: "~0.3ms". A code annotation appears near the tree: `const parent = document.getElementById('list'); parent.querySelector('.card');`.

**Step 3 -- ID caching**:
- Tree zooms back out. A single node flashes instantly with `var(--color-success)` -- no traversal wave at all. The node scales to 1.5x with `SPRING.snappy` (200ms) then back to 1x. Cost bar shows a single green dot at 1% width. Label: "1 / 100 nodes checked". Timing: "~0.01ms". Code annotation: `const card = document.getElementById('card-7'); // cached`.

**Step 4 -- Layout thrashing**:
- Tree visualization is replaced by a render pipeline diagram (reusing the visual language from core-render-cycle). Pipeline: Style -> Layout -> Paint -> Composite as 4 horizontal boxes. In "interleaved" mode: pipeline runs 6 times in rapid succession (each run is a flash sequence through all 4 boxes, 200ms per run, 1.2s total). Red warning pulses with each re-run. Counter: "6 forced layouts".
- Toggle appears below: two buttons, "Interleaved" (active, red border) and "Batched" (inactive, green border).

**Thrash toggle animation**:
- Switch to "Batched": pipeline runs ONCE (all 4 boxes light up in sequence, 200ms total). Counter: "1 layout pass". The 6x -> 1x reduction is visceral. Background briefly flashes green.
- Switch back to "Interleaved": pipeline hammers 6 times again. Background flashes red.

**Code annotations** (per step):
- Small code blocks positioned to the right of the tree or below it (depending on viewport). Monospace, `var(--color-surface)` background, `var(--radius-2)` corners. Relevant line highlighted with the step's color. Fade in with `TRANSITION.enterItem` (200ms).

**Post-scroll refactor challenge**:
- After step 4, a code editor slides up from the bottom of the sticky panel (`TRANSITION.collapse`, 300ms). Shows "bad" code:
  ```js
  // Runs 60x per second in a scroll handler
  function onScroll() {
    const items = document.querySelectorAll('.item');
    items.forEach(item => {
      const top = item.offsetTop;       // READ
      item.style.transform = `...`;     // WRITE
    });
  }
  ```
- Reader edits the code. A "Run" button re-triggers the tree animation showing how many nodes light up with their version. Better code = fewer nodes lit = shorter cost bar.

**Reduced motion**:
- Traversal waves are instant (all relevant nodes highlight at once). Pipeline runs are shown as a static count (no animation, just the number). Zoom transitions are instant. Cost bar appears at final width.

### Teaching Flow (First 60 Seconds)

1. **(0-5s)** Reader sees a large tree graph (100+ nodes) in the sticky panel on the left. All nodes dim gray. A cost bar at bottom reads "0 nodes checked". Right side (scroll panel) shows the first narrative paragraph: "Querying from 'document' scans the entire tree every time. With a few queries this is fine -- but in a scroll handler firing 60x/second, it adds up fast."

2. **(5-15s)** Reader scrolls. The tree explodes with color: all 100 nodes light up in a wave from the root outward (15ms per node). The cost bar fills to 100%, turning red. Label: "100 / 100 nodes checked ~ 2.4ms". The reader sees the ENTIRE tree getting traversed. This is the "bad" baseline.

3. **(15-25s)** Reader scrolls again. The viewport zooms into a subtree. 88 nodes fade to near-invisible. Only 12 nodes remain prominent. The traversal wave runs through just these 12. Cost bar drops to 12%. Label: "12 / 100 ~ 0.3ms". Code appears: `parent.querySelector('.card')`. The visual shrinkage IS the lesson -- same result, 88% less work.

4. **(25-35s)** Reader scrolls again. Viewport zooms out. A single node flashes green instantly -- no wave at all. Cost bar shows a dot. Label: "1 / 100 ~ 0.01ms". Code: `getElementById('card-7')`. The progression from 100 -> 12 -> 1 is now complete.

5. **(35-45s)** Reader scrolls to the layout thrashing step. Tree is replaced by a pipeline diagram. It runs 6 times in rapid succession with red pulses. The reader sees the pipeline hammering. Counter: "6 forced layouts per frame". The narrative explains: reading layout values between DOM writes forces the pipeline to re-run.

6. **(45-55s)** A toggle appears. Reader switches from "Interleaved" to "Batched". Pipeline runs once. Counter drops to 1. Green flash. The difference is stark. Reader toggles back and forth a few times, watching the pipeline hammer vs glide.

7. **(55-60s+)** Reader scrolls past into the refactor challenge zone. Code editor appears with the "bad" scroll handler. They begin editing.

### Data & State Shape

```typescript
type ScrollStep = {
  index: number;
  optimizationLevel: 'naive' | 'scoped' | 'cached' | 'batched';
  highlightedNodeIds: string[];        // which nodes light up
  costBarPercent: number;              // 100, 12, 1, 0
  timingLabel: string;                 // "~2.4ms"
  codeAnnotation?: string;            // code snippet
};

type PerfScrollyState = {
  currentStepIndex: number;            // stored, driven by IntersectionObserver
  treeNodes: TreeNode[];               // stored, static 100-node tree
  thrashMode: 'interleaved' | 'batched'; // stored, toggled by user
  refactorCode: string;                // stored, controlled textarea
  refactorResult: RefactorResult | null; // stored, computed after "Run"
};

type RefactorResult = {
  nodesChecked: number;
  layoutPasses: number;
  grade: 'poor' | 'good' | 'optimal'; // derived from nodesChecked + layoutPasses
  feedback: string;
};

// derived:
// activeStep: ScrollStep = STEPS[currentStepIndex]
// highlightedNodes: Set<string> = new Set(activeStep.highlightedNodeIds)
// costBarWidth: string = `${activeStep.costBarPercent}%`
// pipelineRunCount: number = thrashMode === 'interleaved' ? 6 : 1
```

**Derived vs Stored**:
- Stored: `currentStepIndex`, `thrashMode`, `refactorCode`, `refactorResult`.
- Derived: everything visual (which nodes glow, bar width, pipeline count, code annotations).
- Step data is a static array defined at module scope, not in state.

### Primitives & Props

**ScrollytellingShell** (from shared primitives):
```tsx
<ScrollytellingShell
  steps={scrollSteps}                    // 4 steps + interactive thrash step
  renderVisual={(stepIndex) => (
    stepIndex <= 3
      ? <TreeTraversalVisual step={stepIndex} nodes={treeNodes} />
      : <PipelineThrashVisual mode={thrashMode} onToggle={setThrashMode} />
  )}
  visualPosition="left"
  progressBar={true}
/>
```

**DemoSandbox**: wraps entire scrollytelling. `title="Query Performance"`.

**Internal components**:
- `TreeTraversalVisual`: renders the 100-node graph with zoom and traversal wave per step.
- `CostBar`: horizontal bar with label and timing. Animated width.
- `PipelineThrashVisual`: 4-stage pipeline with run-count animation. Reuses visual language from `core-render-cycle`'s pipeline (same colors, same box shapes, same arrow style).
- `RefactorEditor`: small code editor (textarea with syntax highlighting or CodeMirror lite) with "Run" button and feedback display.
- `CodeAnnotation`: positioned code snippet with highlighted line.

### Edge Cases

**Reader scrolls backward**:
- ScrollytellingShell handles this. Returning to a previous step REVERSES the animation: nodes that were highlighted dim again, cost bar shrinks, zoom reverses. The visual is fully bidirectional. No state corruption.

**Reader scrolls very fast (skips steps)**:
- IntersectionObserver fires for the step they land on. Intermediate steps are skipped visually. The tree jumps to the target step's state. Traversal wave does not play for skipped steps (would feel janky). Instead, nodes appear at their target state instantly.

**Refactor challenge -- reader writes broken JS**:
- Wrap `eval` in try/catch (or better: use a simple AST-based pattern matcher instead of eval). On syntax error: show inline error below editor in `var(--color-error)`. Tree stays at last valid state.

**Refactor challenge -- reader writes optimal code on first try**:
- Show a "Perfect!" badge with confetti-free celebration: the cost bar flashes green, grade shows "Optimal", and a summary line appears: "You cached the reference and batched reads/writes. Zero unnecessary traversals."

**Refactor challenge -- reader doesn't optimize at all (submits original code)**:
- Grade: "Poor". Cost bar stays red at 100%. Feedback: "The scroll handler still queries from document on every frame. Try caching `document.getElementById('list')` outside the handler."

**Viewport too short for scroll steps**:
- Minimum step height: 200px. On very short viewports (<500px), steps stack more tightly but remain individually triggerable. The sticky panel reduces to 50vh.

**Pipeline visual on mobile**:
- Pipeline boxes stack vertically instead of horizontal. Run-count label is prominent. Toggle buttons remain accessible.

### Cross-Lesson Connections

- **Reuses dom-querying's traversal visual**: The one-by-one node lighting animation from the battle is the SAME animation used here. The reader recognizes it. The difference: in the battle they watched it on 50 nodes for comparison. Here they watch it on 100 nodes and then see it SHRINK to 12 and then 1. Same visual language, escalated meaning.
- **Pipeline from core-render-cycle**: The layout thrashing step reuses the pipeline diagram from Section 1's render cycle lesson. Same 4 stages, same colors, same left-to-right flow. The reader already knows what this pipeline IS (from S01). Now they see it being ABUSED (running 6x per frame). This is explicit cross-section continuity.
- **Feeds into dom-assignment-1**: Challenge 4 (sorting without re-querying) directly tests the "cache references" optimization from step 3. Challenge 3 (live filtering) tests the "scope your queries" optimization from step 2. The scrollytelling gives the WHY; the challenge chain demands the HOW.
- **Foreshadows S07 (Performance section)**: Layout thrashing is introduced here as one optimization. S07 covers it comprehensively with requestAnimationFrame batching, will-change, and IntersectionObserver-driven lazy loading. This lesson plants the concept; S07 expands it.

---

## dom-assignment-1 -- DOM Challenge Chain
**Format**: challenge-chain | **Effort**: large

### Interaction State Machine

```
                    +------------------------+
                    |   challenge-intro      |
                    | (challenge 1 visible,  |
                    |  2-6 locked, progress  |
                    |  bar at 0/6)           |
                    +--------+---------------+
                             |
                    reader reads challenge, begins editing
                             |
                             v
                    +------------------------+
                    |   editing              |
                    | (code editor active,   |
                    |  live preview updates, |
                    |  tests not yet run)    |
                    +--------+---------------+
                             |
                    click "Run Tests"
                             |
                             v
                    +------------------------+
                    |   tests-running        |
                    | (test indicators       |
                    |  animate sequentially) |
                    +--------+---------------+
                             |
              all pass          some fail
               |                    |
               v                    v
    +-------------------+  +-------------------+
    |  challenge-passed |  |  challenge-failed |
    | (green flash,     |  | (red indicators,  |
    |  +1 progress,     |  |  SPECIFIC failure |
    |  hints for better |  |  feedback per     |
    |  approach shown   |  |  test, hints      |
    |  if suboptimal)   |  |  available)       |
    +--------+----------+  +--------+----------+
             |                      |
    auto-advance (1.5s)      edit and retry
             |                      |
             v                      v
    +-------------------+       (editing)
    |  next-challenge   |
    | (challenge N+1    |
    |  unlocks with     |
    |  slide animation) |
    +-------------------+
             |
     ... repeat for 6 challenges ...
             |
             v
    +-------------------+
    |  chain-complete   |
    | (all 6 passed,    |
    |  summary card,    |
    |  solution diffs)  |
    +-------------------+
```

**Additional sub-state for hints**:

```
(challenge-failed) --click "Hint 1"--> hint-1-shown
                   --click "Hint 2"--> hint-2-shown (available after 30s or 2 failed attempts)
                   --click "Hint 3"--> hint-3-shown (available after 60s or 4 failed attempts)
                   --click "Show Solution"--> solution-revealed (available after hint-3 or 90s)
```

**State data**:
- `currentChallenge: 1-6`.
- `challengeStates: Record<number, { code: string, testResults: TestResult[], hintsUsed: number, attempts: number, passed: boolean, approach: 'suboptimal' | 'optimal' | null }>`.
- `editorCode: string` (active challenge's code).
- `previewHTML: string` (derived from running the code in a sandboxed iframe).
- `testsRunning: boolean`.
- `solutionRevealed: boolean`.

### Visual Choreography

**Layout**:
- Full-width, single-challenge view. Progress bar at top spanning full width: 6 segments, filled segments colored `var(--color-success)`, current segment pulsing with `LOOP.breathe` at 20% intensity, locked segments at `var(--color-border)`.
- Below progress bar: challenge title + description (2-3 sentences).
- Main area split 60/40: left = code editor, right = live preview.
- Below main area: test results panel + hint/solution buttons.

**Challenge unlock animation**:
- When challenge N passes, the next challenge slides in from the right: `x: 100% -> 0`, `TRANSITION.enterCard` (300ms ease-out). Previous challenge slides out left: `x: 0 -> -100%`. Progress bar segment N fills with green (`var(--color-success)`), background expanding left-to-right over 400ms.

**Test execution animation**:
- Tests run sequentially with 200ms stagger. Each test: starts as a gray dot, turns into a spinning indicator (CSS `@keyframes spin`, 600ms per revolution) while running, then snaps to green checkmark or red X.
- Green checkmark: scales from 0 -> 1.2 -> 1 with `SPRING.snappy` (200ms).
- Red X: shakes horizontally (4px amplitude, 3 cycles, 300ms) using `@keyframes shake`.
- Below each failed test: specific feedback text slides down with `TRANSITION.collapse` (300ms). Text in `var(--color-error)`, monospace for code references.

**Suboptimal-pass feedback** (the key teaching device):
- If all tests pass but the approach is suboptimal: green flash, BUT a yellow banner slides down below tests with `TRANSITION.collapse`. Banner has a lightbulb icon and text like "Tests pass, but try event delegation -- add one handler to the parent instead of N handlers on children." Banner border: `2px solid var(--diagram-layer-3)` (yellow). Reader can proceed OR revise.

**Solution reveal (diff view)**:
- Two-column diff: left = reader's code, right = optimal solution. Differences highlighted: additions in green (`var(--color-success-muted)` background), removals in red (`var(--color-error-muted)` background). Diff panel slides up from bottom with `TRANSITION.enterCard`. Each diff hunk staggers in at `STAGGER.fast`.

**Code editor**:
- Monospace (`var(--font-mono)`), dark background (`var(--color-bg)`). Line numbers in `var(--color-muted)`. Editable region clearly marked with a lighter background (`var(--color-surface)`). Non-editable starter code in `var(--color-surface-2)` with `opacity: 0.7`. Syntax highlighting: strings green, keywords purple, comments gray.

**Live preview**:
- Sandboxed iframe showing the rendered DOM. Updates on every keystroke (debounced 300ms). Border: `1px solid var(--color-border)`. When tests pass: border flashes green for 500ms. When code throws: preview shows error overlay in red.

**Hint progression**:
- Hint buttons at bottom-right. Initially: "Hint 1" visible, others hidden.
- Hint 1 always available. Click: text slides in below button (`TRANSITION.collapse`). Hint 2 appears after 30s or 2 failed attempts (fades in from `opacity: 0`, 300ms). Hint 3 after 60s or 4 attempts. "Show Solution" after hint 3 shown or 90s elapsed.
- Each hint more specific: Hint 1 = concept direction ("think about event bubbling"). Hint 2 = approach ("add the handler to the parent, use event.target"). Hint 3 = near-solution ("event.target.closest('.item') to find the clicked item").

**Chain complete celebration**:
- All 6 progress segments glow green. A summary card slides up: "6/6 Challenges Complete". Lists each challenge with the reader's approach (optimal/suboptimal) and time taken. A "Review Solutions" button opens the diff view for any challenge.

**Reduced motion**:
- Challenge transitions are instant (no slide). Test indicators show final state immediately (no spin, no shake). Progress bar fills instantly. Diff highlights appear without stagger.

### Teaching Flow (First 60 Seconds)

1. **(0-3s)** Progress bar at top: segment 1 pulsing gently, segments 2-6 locked (gray with lock icon). Challenge title: "Challenge 1: Render a List from Data". Description: "Given an array of 5 todo items, render them as an unordered list in the `#app` container. Use `document.createElement` and `appendChild` -- no `innerHTML`."

2. **(3-8s)** Code editor on left shows starter code:
   ```js
   const todos = ['Buy milk', 'Write tests', 'Ship feature', 'Review PR', 'Deploy'];
   const app = document.getElementById('app');

   // YOUR CODE HERE
   // Render each todo as an <li> inside a <ul>
   ```
   Live preview on right shows an empty `<div id="app">`.

3. **(8-25s)** Reader types their solution. As they type, the live preview updates in real-time (debounced 300ms). They create a `<ul>`, loop through `todos`, create `<li>` elements, append them. The preview shows the list appearing item by item as they code.

4. **(25-30s)** Reader clicks "Run Tests". Four tests execute with 200ms stagger:
   - "Container has a `<ul>` element" -> checkmark
   - "`<ul>` contains 5 `<li>` elements" -> checkmark
   - "Each `<li>` contains the correct text" -> checkmark
   - "No `innerHTML` used" -> checkmark (or red X if they cheated)

5. **(30-35s)** All pass: green flash on the editor border. Progress segment 1 fills green. After 1.5s auto-advance: challenge 1 slides left, challenge 2 slides in from right.

6. **(35-45s)** Challenge 2: "Add a Delete Button". Description: "Add a 'Delete' button to each `<li>`. Clicking it should remove that item from the DOM." Starter code includes the solution from challenge 1 (code carries forward!) plus a new editable section.

7. **(45-55s)** Reader adds `click` event listeners to each button. Tests run: all pass. BUT a yellow banner slides in: "Tests pass! But you added 5 separate click handlers. Try event delegation: one handler on the `<ul>` that checks `event.target`."

8. **(55-60s)** Reader sees the suboptimal feedback. They can either proceed to challenge 3 or revise. The yellow banner is non-blocking -- it teaches without gatekeeping.

### Data & State Shape

```typescript
// --- Challenge Definition (static) ---
type ChallengeDefinition = {
  id: number;                          // 1-6
  title: string;
  description: string;
  starterCode: string;                 // includes previous challenge solutions
  editableRegion: [number, number];    // [startLine, endLine] of editable zone
  tests: TestDefinition[];
  hints: [string, string, string];     // progressive hints
  optimalSolution: string;
  suboptimalPatterns: SuboptimalPattern[];
};

type TestDefinition = {
  id: string;
  label: string;                       // "Container has a <ul> element"
  testFn: (iframe: HTMLIFrameElement) => boolean;
  failureFeedback: string;            // specific failure message
};

type SuboptimalPattern = {
  detect: (code: string) => boolean;   // regex or AST check
  feedback: string;                    // "try event delegation..."
};

// --- Runtime State ---
type ChallengeChainState = {
  currentChallenge: number;            // stored, 1-6
  challenges: Record<number, ChallengeProgress>;  // stored
  chainComplete: boolean;              // derived from all 6 passed
};

type ChallengeProgress = {
  code: string;                        // stored, the reader's current code
  testResults: TestResult[];           // stored, last run
  passed: boolean;                     // derived from testResults
  attempts: number;                    // stored, incremented on each Run Tests
  hintsUsed: number;                   // stored, 0-3
  solutionRevealed: boolean;           // stored
  approach: 'suboptimal' | 'optimal' | null;  // derived from suboptimalPatterns
  startedAt: number;                   // stored, timestamp
  completedAt: number | null;          // stored, timestamp
};

type TestResult = {
  testId: string;
  passed: boolean;
  feedback: string | null;            // null if passed
};
```

**Derived vs Stored**:
- Stored: `currentChallenge`, each challenge's `code`, `attempts`, `hintsUsed`, `solutionRevealed`, `startedAt`, `completedAt`.
- Derived: `passed` (all tests pass), `approach` (check code against suboptimalPatterns), `chainComplete`, `testResults` (recomputed on each "Run Tests"), live preview HTML (sandboxed eval of code).

**Code carry-forward**: Challenge N's `starterCode` includes the SOLUTION from challenge N-1 (not the reader's code, unless their code was optimal). This prevents broken code from cascading. If the reader's N-1 code was optimal, use theirs. If suboptimal, use the optimal solution as the base but show a note: "We've swapped in the optimized version from the previous challenge."

### Primitives & Props

**ChallengeRunner** (from shared primitives):
```tsx
<ChallengeRunner
  challenges={DOM_CHALLENGES}          // array of 6 ChallengeDefinition
  onComplete={() => trackCompletion('dom-assignment-1')}
  hintsPerChallenge={3}
  hintDelayMs={30000}                  // 30s before hint 2 unlocks
  solutionAfterHints={true}            // show solution only after all hints
  showDiffOnSolution={true}
  codeCarryForward={true}
/>
```

**Internal components** (built for this lesson):
- `ChallengeEditor`: code editor with editable region highlighting, line numbers, basic syntax highlighting. Not a full CodeMirror -- a `<textarea>` with a syntax-highlighted overlay for display, or a lightweight editor like `prism-react-renderer` + `react-simple-code-editor`.
- `LivePreview`: sandboxed iframe that executes reader's code. Communicates test results via `postMessage`.
- `TestResultPanel`: sequential test indicators with feedback.
- `HintStack`: progressive hint reveal with timer-based unlocking.
- `DiffViewer`: two-column diff with addition/removal highlighting.
- `ProgressBar`: 6-segment progress indicator.
- `SuboptimalBanner`: yellow feedback banner for passing-but-improvable solutions.

### Edge Cases

**Reader pastes a full solution from outside**:
- Tests still run normally. If it passes and is optimal, full credit. The suboptimal detection still runs. No penalty for looking up solutions -- the hints and feedback still teach.

**Reader writes code that infinite-loops**:
- The sandboxed iframe has a 2-second execution timeout (via a Web Worker or `setTimeout` kill). On timeout: preview shows "Execution timeout -- possible infinite loop" in `var(--color-error)`. Tests auto-fail. Editor does NOT freeze.

**Reader writes code that throws**:
- Preview shows the error message in a red overlay. Stack trace trimmed to relevant lines. Tests that depend on DOM state auto-fail with feedback "Your code threw an error: [message]".

**Reader skips to challenge 6 (attempts to bypass lock)**:
- Challenges 2-6 are grayed out with a lock icon. No click target. Progress is strictly sequential. If someone manipulates state via devtools, the tests for later challenges reference earlier challenge DOM output and will fail without the foundation.

**Event delegation detection (challenge 2)**:
- Suboptimal detection: regex for `addEventListener` inside a loop or `.forEach`. Pattern: `/\.forEach\(.*addEventListener/` or multiple `addEventListener('click'` calls. False positive risk is low because the starter code structure is constrained.
- If reader uses `onclick` attribute: separate suboptimal pattern with feedback "Inline handlers work but can't be easily removed. Try addEventListener."

**Drag-to-reorder (challenge 6) -- touch vs mouse**:
- The challenge description specifies pointer events (not mouse events). Starter code includes `pointerdown`, `pointermove`, `pointerup` stubs. Touch devices work automatically. Tests verify that `pointerdown` is used, not `mousedown`.

**Keyboard navigation within editor**:
- Tab within the editable region inserts 2 spaces (not focus change). `Escape` exits the editor and moves focus to "Run Tests" button. `Ctrl+Enter` / `Cmd+Enter` = Run Tests shortcut. `aria-label` on editor: "Code editor for challenge [N]".

**Challenge code carries forward but reader's previous code was broken**:
- As noted in Data Shape: if the reader's code was suboptimal but passing, use the optimal solution as the base for the next challenge. If the reader revealed the solution without passing, use the revealed solution as base. This prevents cascading failures.

**Reader resizes viewport mid-challenge**:
- Editor and preview are in a CSS grid with `minmax()`. Below 768px: stack vertically (editor on top, preview below). Editor maintains scroll position and cursor position across resize.

### Cross-Lesson Connections

- **Tests concepts from all 3 previous stops**: Challenge 1 (createElement + appendChild) = anatomy viewer's Create methods. Challenge 2 (event delegation) = a new concept but informed by the anatomy viewer's experience of clicking individual nodes vs parent containers. Challenge 3 (querySelector filtering) = direct application of dom-querying battle's selector knowledge. Challenge 4 (sort without re-query) = direct application of dom-query-perf's caching lesson. Challenges 5-6 (keyboard + drag) = new DOM API territory that extends the section.
- **Suboptimal feedback references earlier lessons**: When the reader sorts by clearing innerHTML, the feedback says "You destroyed all DOM state. Remember from the DOM anatomy viewer -- appendChild on an existing node MOVES it." Direct callback to dom-refresher.
- **The progression mirrors the section arc**: anatomy (learn the API) -> battle (compare methods) -> scrollytelling (understand cost) -> challenge (apply everything). The challenge chain is the exam that validates the three teaching stops.
- **Sets up Section 3 (Web APIs)**: Challenge 5 (keyboard navigation) introduces event handling patterns. Challenge 6 (drag-to-reorder) introduces pointer events. Both are Web API topics that Section 3 expands on. The challenge chain bridges DOM manipulation (S02) into event-driven programming (S03).
- **Code carry-forward teaches real-world accumulation**: Each challenge builds on the previous, mirroring how real features accumulate in a codebase. By challenge 6, the reader has built a complete interactive list component from scratch -- which is the same artifact a system-design lesson might start with.
