# Section 5: Application State Design -- Implementation Briefs

> Source: `src/lib/lesson-plans/s05-app-state.ts`
> Section color: `--diagram-layer-2` (oklch 65% 0.15 300, purple)
> Motion tokens: `src/lib/motion.ts` | Design tokens: `src/styles/tokens.css`
> Section structure: WHAT to store (data structure choice) -> WHERE to store it (browser storage) -> HOW to manage memory pressure (multi-tier offloading). A progressive "what -> where -> how" arc.

---

## state-search -- Data Structure Battle
**Format**: battle | **Effort**: large

### Interaction State Machine

```
                     +---------------------+
                     |       IDLE          |
                     | query: ""           |
                     | mode: "prefix"      |
                     | datasetSize: 1000   |
                     | animating: false    |
                     +---------------------+
                          |  type in search input
                          v
                     +---------------------+
                     |   QUERY_SUBMITTED   |
                     | query: string       |
                     | mode: SearchMode    |
                     +---------------------+
                          |  (immediate, no debounce -- fast feedback)
                          v
                     +---------------------+
                     |    RACING           |
                     | animating: true     |
                     | arrayProgress: 0..1 |
                     | mapProgress: 0..1   |
                     | trieProgress: 0..1  |
                     +---------------------+
                       /        |        \
             array done    map done    trie done
                  |            |            |
                  v            v            v
               (each lane sets finished: true independently)
                          |
                     all three finished
                          |
                          v
                     +---------------------+
                     |   RESULTS           |
                     | winner: LaneId      |
                     | arrayTime: number   |
                     | mapTime: number     |
                     | trieTime: number    |
                     | results: per-lane[] |
                     +---------------------+
                          |
          +---------------+-----------------+
          |               |                 |
   type new query   change mode    change dataset size
          |               |                 |
          v               v                 v
     QUERY_SUBMITTED  +-------------------+
                      | MODE_CHANGED      |
                      | mode: SearchMode  |
                      | (reset + re-race  |
                      |  if query exists) |
                      +-------------------+
                              |
                              v
                      +---------------------+
                      | DATASET_RESIZING    |
                      | size: number        |
                      | regenerating: true  |
                      +---------------------+
                              |  generation done
                              v
                      +---------------------+
                      |       IDLE          |
                      | (ready for query)   |
                      +---------------------+
```

**State data:**
- `query`: current search string
- `mode`: `"prefix"` | `"exact"` | `"insert"` | `"delete"` -- which operation to race
- `datasetSize`: number (slider value: 10, 100, 1_000, 10_000, 100_000)
- `lanes`: per-lane animation and result state (see Data & State Shape)
- `winner`: `"array"` | `"map"` | `"trie"` | `null`
- `animating`: boolean, true while race in progress
- `dataset`: the actual generated word list (persisted across races, regenerated on size change)

### Visual Choreography

**Overall layout: BattleArena pattern. Three vertical lanes with shared controls above and speed bars below.**

**Controls bar (top, full width, 64px tall):**
- Search input: 360px wide, centered. `var(--font-mono)`, `var(--text-base)`, `var(--color-text)` on `var(--color-bg)` background. 2px solid `var(--color-border)` border, `var(--radius-2)` corners. Placeholder: "type to search..." in `var(--color-muted)`. Focus ring: 2px `var(--color-accent)` ring.
- Mode selector: 4 pill buttons in a row, right of the search input, 16px gap. Each pill: `var(--font-mono)`, `var(--text-xs)`, 28px tall, `var(--radius-1)` corners. Inactive: `var(--color-surface-2)` background, `var(--color-muted)` text. Active: `var(--color-accent)` background, white text. Transition between states: `TRANSITION.crossfade` (150ms). Labels: "Prefix", "Exact", "Insert", "Delete".
- Dataset size slider: below the search input, full controls-bar width. Custom range input. Track: 4px tall, `var(--color-border)`. Thumb: 16px circle, `var(--color-accent)`. Below the track: 5 tick marks at logarithmic positions (10, 100, 1K, 10K, 100K) with labels in `var(--font-mono)`, `var(--text-xs)`, `var(--color-muted)`. Snap to these 5 values only -- no intermediate positions.

**Three lanes (middle section, main visual area):**
- Container: flex row, 3 lanes, each `calc((100% - 32px) / 3)` wide (16px gap between lanes). Min lane width: 200px. Below 640px: lanes stack vertically.
- Each lane: `var(--color-surface)` background, `var(--radius-2)` corners, 1px `var(--color-border)` border. 12px internal padding.
- Lane header: label at top, `var(--font-mono)`, `var(--text-sm)`, centered.
  - Array lane header: "Array" in `var(--diagram-layer-0)` (oklch 65% 0.15 200, teal).
  - Map lane header: "Map / Object" in `var(--diagram-layer-1)` (oklch 65% 0.15 140, green).
  - Trie lane header: "Trie" in `var(--diagram-layer-2)` (oklch 65% 0.15 300, purple).
- Lane height: 320px (fixed, overflow hidden -- the data structure visualization fills this).

**Array lane visualization (linear scan):**
- Render `Math.min(datasetSize, 80)` rectangles as a wrapped grid of cells inside the 320px lane. Each cell: 10x18px, 2px gap. Fill: `var(--color-surface-2)` (dormant).
- When race starts: cells highlight sequentially from index 0. Each cell transitions to the lane color (`var(--diagram-layer-0)`) at 0.7 opacity. Highlight timing: total scan animation duration scales with dataset size:
  - 10 items: 200ms total (20ms per cell)
  - 100 items: 600ms total (show first 80 cells scanning, counter for remaining)
  - 1,000 items: 1,500ms total (show 80 cells, counter races through remaining)
  - 10,000 items: 3,000ms total
  - 100,000 items: 5,000ms total (the pain is visible)
- When dataset exceeds 80 visible cells: a counter below the grid shows "scanning... 4,231 / 10,000" in `var(--font-mono)`, `var(--text-xs)`, `var(--diagram-layer-0)` text. Counter increments rapidly.
- Match found: the matching cell pulses bright -- scale 1.0 -> 1.3 -> 1.0 via `SPRING.snappy`, fill goes to full opacity lane color. If no match: all cells dim back to dormant, a "No match" label appears in `var(--color-muted)`.
- Prefix mode: multiple matches possible. All matching cells pulse, and a result count badge appears: "7 matches" in `var(--font-mono)`, `var(--text-xs)`.

**Map lane visualization (hash + jump):**
- Render 16 horizontal "bucket" slots stacked vertically. Each slot: full lane width minus padding, 16px tall, 2px gap. Fill: `var(--color-surface-2)`. Slot labels on left: `[0]` through `[15]` in `var(--font-mono)`, 9px, `var(--color-muted)`.
- When race starts -- two-phase animation:
  - Phase 1 -- hash computation (80ms): The query text appears above the buckets, each character pulses in sequence (20ms per char) with a small "hashing..." label. A thin animated line traces from the query text downward to the target bucket index. Line color: `var(--diagram-layer-1)`. The line uses `SPRING.quick` to reach the bucket.
  - Phase 2 -- bucket jump (40ms): Target bucket flashes bright (`var(--diagram-layer-1)` full opacity, scale 1.0 -> 1.08 -> 1.0 via `SPRING.snappy`). Result item appears inside the bucket with a fade-in (`DURATION.instant`, 150ms).
- Total time: ~120ms visual duration regardless of dataset size (the point: O(1)).
- Prefix mode: Map shows "N/A -- Maps cannot do prefix search" in `var(--color-muted)` italic text, centered in the lane. The bucket visualization dims to 20% opacity. A small annotation: "Maps only support exact key lookup" below.

**Trie lane visualization (tree descent):**
- Render a top-down tree structure. Root node at top center of lane.
- Node rendering: each node is a 28x28px rounded square (`var(--radius-1)`). Fill: `var(--color-surface-2)` (dormant). Character label centered inside: `var(--font-mono)`, 12px, `var(--color-text)`.
- Edges: 1.5px solid `var(--color-border)` connecting parent to children. Bezier curves (not straight lines) for visual clarity.
- The trie shows only the relevant branch for the current query plus 2-3 sibling branches at each level (to show the tree structure without overwhelming). Max visible depth: 8 levels. If word is longer, collapse middle with a "..." node.
- When race starts: character-by-character descent animation.
  - Each node on the path highlights in sequence: fill transitions to `var(--diagram-layer-2)` at 0.8 opacity. Duration per node: 100ms.
  - The edge leading to the next node traces in the lane color (`var(--diagram-layer-2)`), 80ms per edge, `TRANSITION.enterItem`.
  - Total time for "java": 4 nodes x 100ms + 3 edges x 80ms = 640ms.
  - Total time scales with query length (O(k)), NOT dataset size.
- Prefix mode: after reaching the query's terminal node, all descendant leaf nodes flash simultaneously (100ms stagger per level). Result count badge: "12 prefix matches". The subtree below the terminal node gets a subtle background highlight: `var(--diagram-layer-2)` at 10% opacity.
- The tree auto-zooms to fit: if the descent goes deep, the tree scales down (CSS transform scale, min 0.6) with a smooth `TRANSITION.enterCard` zoom.

**Speed bars (below the three lanes, full width):**
- 3 horizontal bars, one per lane. Each bar: full container width, 32px tall, 8px gap between bars.
- Bar background: `var(--color-surface-2)`, `var(--radius-1)` corners.
- Bar fill: lane color at 80% opacity. Width animates from 0% to proportional-to-time. The SLOWEST lane fills to 100%; others fill proportionally less. Fill animation: `TRANSITION.progress` (500ms, easeOut).
- Time label at the end of each bar fill: `var(--font-mono)`, `var(--text-xs)`, lane color. Shows simulated time in ms (e.g., "3,200ms", "0.1ms", "400ms").
- Label on left of each bar: data structure name in lane color, `var(--font-mono)`, `var(--text-xs)`.

**Winner badge:**
- Appears above the winning lane's header after all three lanes finish. A pill badge: "FASTEST" in `var(--font-mono)`, `var(--text-xs)`, white text on the winning lane's color, `var(--radius-1)`, scale entrance from 0.8 -> 1.0 via `SPRING.snappy`.
- Below the speed bars: a one-line takeaway sentence in `var(--color-muted)`, `var(--text-sm)`. Context-dependent:
  - Array wins: "At {n} items, Array's cache locality beats hash overhead."
  - Map wins (exact): "O(1) hash lookup dominates at scale -- Map is built for exact key access."
  - Trie wins (prefix): "Tries are purpose-built for prefix search -- Maps can't do this at all."

### Teaching Flow (First 60 Seconds)

1. Reader sees 3 labeled lanes: "Array", "Map / Object", "Trie". Each lane is empty/dormant -- just the structural visualization (cells, buckets, tree). A search input at top with placeholder "type to search...". Mode selector defaults to "Prefix". Dataset size slider at "1,000 items".
2. Reader types "java" in the search input. All 3 lanes animate simultaneously:
   - **Array lane**: cells start highlighting one-by-one from top-left. Slow, visible scan. Counter: "scanning... 247 / 1,000". Takes ~1,500ms to complete. Multiple matches found.
   - **Map lane**: "N/A -- Maps cannot do prefix search" appears. Buckets dim. Map can't compete in prefix mode.
   - **Trie lane**: j -> a -> v -> a nodes highlight in sequence, each taking 100ms. After "a" (the terminal node), the subtree lights up showing all "java*" words. Total: ~640ms.
3. Trie finishes first. "FASTEST" badge appears above Trie. Speed bars fill: Trie bar short (fast), Array bar long (slow), Map bar shows "N/A". Takeaway: "Tries are purpose-built for prefix search -- Maps can't do this at all."
4. Reader thinks: "But wait, isn't Map supposed to be fast?" They click "Exact" mode.
5. They type "javascript" again. This time:
   - **Array**: slow linear scan again, ~1,500ms.
   - **Map**: hash animation flash (80ms) -> instant bucket jump (40ms). Done in 120ms.
   - **Trie**: character-by-character descent, ~1,000ms for 10 characters.
6. Map wins by a mile. "FASTEST" badge on Map. Speed bars make it visceral: Map bar is a thin sliver, Array bar is enormous. Takeaway: "O(1) hash lookup dominates at scale -- Map is built for exact key access."
7. Reader drags the dataset slider down to "10 items". Types "java" in Exact mode. This time Array finishes nearly as fast as Map (all 10 cells scan in 200ms, Map still 120ms). The speed bars are almost equal. Takeaway: "At 10 items, Array's cache locality beats hash overhead."
8. The three discoveries hit in sequence: Trie wins prefix, Map wins exact-at-scale, Array wins small-datasets. The reader now has an intuition for WHEN to use WHICH.

### Data & State Shape

```typescript
type LaneId = "array" | "map" | "trie";
type SearchMode = "prefix" | "exact" | "insert" | "delete";

type DatasetSizeOption = 10 | 100 | 1_000 | 10_000 | 100_000;

type LaneAnimationState = {
  progress: number;          // 0..1, how far through the animation
  finished: boolean;
  currentIndex: number;      // array: scan index; trie: depth index
  highlightedCells: number[];  // indices of highlighted cells/nodes
  matchIndices: number[];    // which cells are matches
  simulatedTimeMs: number;   // the "time" this structure took
};

type TrieNode = {
  char: string;
  children: TrieNode[];
  isTerminal: boolean;
  id: string;                // stable key for React rendering
};

type LaneResult = {
  matchCount: number;
  timeMs: number;
  items: string[];           // matched items (max 20 displayed)
};

type DataStructureBattleState = {
  // Controls
  query: string;
  mode: SearchMode;
  datasetSize: DatasetSizeOption;

  // Dataset (regenerated when size changes)
  dataset: string[];              // word list
  trieRoot: TrieNode;             // pre-built trie
  hashMap: Map<string, number>;   // pre-built map (value = index)

  // Race state
  animating: boolean;
  lanes: Record<LaneId, LaneAnimationState>;
  winner: LaneId | null;

  // Results
  results: Record<LaneId, LaneResult | null>;
  takeaway: string | null;

  // Dataset generation
  regenerating: boolean;
};
```

**Dataset generation:** Use a deterministic word list. Seed from a base list of ~500 programming-related words (language names, framework names, API terms). For larger datasets, combine with a prefix/suffix generator: e.g., "java", "javascript", "java-runtime", "java-compiler", "javadoc". This ensures prefix queries always have meaningful results. Generate on component mount and cache in a ref.

### Primitives & Props

| Primitive | Source | Props used |
|-----------|--------|------------|
| `BattleArena` | Shared layout primitive (to be built) | `approaches: Approach[]` (3 lanes), `sharedControls: Control[]` (search input, mode selector, size slider), `metrics: Metric[]` (speed bars) |
| `DemoSandbox` | Shared | Outer container wrapper |
| `Dial` | Shared | Dataset size slider, could also use for any future numeric controls |

**Internal components to build:**
- `ArrayLane` -- grid of cells with sequential highlight animation, counter for overflow, match pulsing
- `MapLane` -- bucket visualization with hash animation, instant jump, N/A state for prefix mode
- `TrieLane` -- tree rendering with character-by-character descent, subtree highlight for prefix matches, auto-zoom
- `SpeedBars` -- 3 horizontal race bars with proportional fill and time labels
- `WinnerBadge` -- pill badge with scale entrance animation
- `TakeawayLine` -- context-dependent one-liner below speed bars

### Edge Cases

- **Empty query**: All lanes show dormant state. No race triggered. Speed bars empty. A subtle "Type a query to start the race" hint in `var(--color-muted)` below the input.
- **No results found**: Array scans all cells (all dim back). Map shows empty bucket. Trie descent dead-ends at a non-existent node (last valid node flashes `var(--color-error)` briefly, then "no match" label). All speed bars fill (they still took time), but a "0 results" label replaces match count.
- **Very long queries (20+ chars)**: Trie lane truncates visible tree with "..." node after depth 8. Animation still plays for full depth but the visual collapses the middle. Map hash animation is the same (O(1)). Array scan is the same (O(n)).
- **Rapid typing**: DO NOT debounce. Each keystroke triggers a new race, canceling any in-progress animation. The "interruption" of the Array scan mid-way (while Map finishes instantly) is itself a teaching moment about O(1) vs O(n). Use `AbortController` pattern or a race-generation counter to discard stale animations.
- **Dataset size at extremes**:
  - 10 items: Array lane shows all 10 cells, scan is near-instant. Speed bars are nearly equal for Array vs Map. This is the "Array can win" discovery.
  - 100,000 items: Array lane shows 80 cells + counter racing to 100K. The 5-second animation for Array is deliberately painful. Trie prefix results may return 50+ matches -- cap displayed items at 20 with "+ 34 more" label.
- **Insert/Delete modes**: Insert mode: Array shows element shifting (cells slide right from insertion point, 30ms stagger). Map shows hash + direct placement. Trie shows tree descent + new node creation. Delete mode: reverse of insert animations. These modes are secondary -- prefix and exact are the primary teaching tools.
- **Trie rendering overflow**: If the trie branch has more than 6 children at any level, collapse siblings beyond 3 into a "+4 more" node. This prevents the tree from becoming unreadably wide.
- **Mobile (< 640px)**: Lanes stack vertically (Array on top, Map middle, Trie bottom). Speed bars move to the right side of each lane as vertical bars (32px wide, lane height). Search input takes full width.
- **Reduced motion**: No cell-by-cell animation. All cells highlight simultaneously at race start. Speed bars fill instantly. Tree nodes highlight all at once on the path. The visual difference between fast and slow is conveyed by the speed bar labels (time values) rather than animation duration.

### Cross-Lesson Connections

This is the **first stop** in the "what -> where -> how" arc. It teaches WHAT data structure to choose based on access pattern. The Trie vs Map distinction (prefix vs exact) maps directly to real state design decisions: autocomplete features need tries (or similar prefix structures), while lookup tables need maps. The dataset-size insight (small arrays beat hashmaps) prevents premature optimization.

The "Map wins for exact lookup" finding sets up **state-storage**: once you know Map/Object is your in-memory structure, the question becomes WHERE to persist it (localStorage? IndexedDB?). The "Array scan is O(n)" finding sets up **state-memory**: when your dataset grows to 100K, you can't keep it all in main thread memory -- you need the tiered offloading strategy.

---

## state-storage -- Browser Storage Anatomy
**Format**: anatomy | **Effort**: medium

### Interaction State Machine

```
                      +-------------------------+
                      |       CABINET           |
                      | allDrawersClosed: true  |
                      | quizActive: false       |
                      +-------------------------+
                            |  click a drawer
                            v
                      +-------------------------+
                      |    DRAWER_OPEN          |
                      | openDrawer: StorageType |
                      | tab: "view" | "write"   |
                      |   | "size" | "traits"   |
                      +-------------------------+
                        |     |      |        |
                  click   write   view     close
                 another  test   real      drawer
                 drawer   data   data
                   |       |      |         |
                   v       v      v         v
              DRAWER_OPEN  |  +----------+ CABINET
              (new drawer) |  | DATA_VIEW|
                           |  | entries[]|
                           |  +----------+
                           v
                    +------------------+
                    |  WRITE_TEST      |
                    | key: string      |
                    | value: string    |
                    | writing: boolean |
                    +------------------+
                           | write success / failure
                           v
                    +------------------+      +---------------------+
                    |  WRITE_RESULT   |      | QUOTA_EXCEEDED      |
                    |  success: true  |      | storage: "local"    |
                    +------------------+      | currentSize: "4.8MB"|
                           |                  | attempted: "2MB"    |
                           v                  +---------------------+
                    DRAWER_OPEN                        |
                    (data refreshed)                   v
                                              +---------------------+
                                              | INDEXEDDB_NUDGE     |
                                              | "I can handle this" |
                                              +---------------------+

              === QUIZ FLOW ===

                      +-------------------------+
                      |       CABINET           |
                      +-------------------------+
                            |  click "Which Storage?" button
                            v
                      +-------------------------+
                      |     QUIZ_ACTIVE         |
                      | scenarioIdx: 0..7       |
                      | scenarios: Scenario[]   |
                      +-------------------------+
                            |  drag scenario card
                            v
                      +-------------------------+
                      |    DRAGGING_SCENARIO    |
                      | draggedScenario: number |
                      | hoverTarget: StorageType|
                      +-------------------------+
                            |  drop on drawer
                            v
                  +---------+-----------+
                  |                     |
              correct                wrong
                  |                     |
                  v                     v
          +----------------+   +------------------+
          | QUIZ_CORRECT   |   |  QUIZ_WRONG      |
          | explanation    |   |  wrongFeedback   |
          | nextReady      |   |  correctDrawer   |
          +----------------+   |  highlighted     |
                  |            +------------------+
                  |                     |
                  v                     v
          +-------------------------+
          | QUIZ_ACTIVE             |
          | scenarioIdx: n+1       |
          +-------------------------+
                  |  all 8 done
                  v
          +-------------------------+
          | QUIZ_COMPLETE           |
          | score: number           |
          | breakdown: per-scenario |
          +-------------------------+
```

**State data:**
- `openDrawer`: `StorageType | null`
- `drawerTab`: `"view"` | `"write"` | `"size"` | `"traits"`
- `realData`: per-storage actual entries read from browser APIs
- `writeForm`: `{ key: string; value: string }`
- `writeResult`: `{ success: boolean; error?: string }`
- `quizState`: `{ active: boolean; scenarioIdx: number; score: number; answers: (StorageType | null)[] }`
- `dragState`: `{ dragging: boolean; scenarioIdx: number; hoverTarget: StorageType | null }`

### Visual Choreography

**Overall layout: full-width anatomy diagram. Filing cabinet metaphor.**

**The cabinet (main visual, centered, max-width 720px):**
- 5 "drawers" stacked vertically, 12px gap between each. Each drawer: full cabinet width, 64px tall (closed). `var(--color-surface)` background, `var(--radius-2)` corners, 1px `var(--color-border)` border, `var(--shadow-1)`.
- Each drawer has, left to right:
  - An icon area (40x40px) with a small pictogram for the storage type:
    - localStorage: key icon (16px, `var(--diagram-layer-0)`, teal)
    - sessionStorage: hourglass icon (16px, `var(--diagram-layer-1)`, green)
    - IndexedDB: database cylinder icon (16px, `var(--diagram-layer-2)`, purple)
    - Cookies: cookie/crescent icon (16px, `var(--diagram-layer-3)`, amber)
    - Cache API: layers/stack icon (16px, `var(--diagram-layer-5)`, cyan-green)
  - Storage name: `var(--font-mono)`, `var(--text-sm)`, `var(--color-text)`.
  - Size meter: a thin horizontal bar (120px wide, 6px tall, `var(--radius-1)`). Background: `var(--color-surface-2)`. Fill: drawer's color at 70% opacity. Fill width proportional to current usage vs max capacity. Label: "2.1 / 5 MB" in `var(--font-mono)`, 9px, `var(--color-muted)`.
  - Sync/Async badge: small pill at the right. Synchronous: "sync" in `var(--color-error)` text, `var(--color-error-muted)` background. Asynchronous: "async" in `var(--color-success)` text, `var(--color-success-muted)` background. `var(--text-xs)`, `var(--radius-1)`.
  - Pull tab: a 28x12px rectangle at the right edge, `var(--color-border)`, `var(--radius-1)`, cursor: pointer.
- Drawer hover: translateY(-1px), `var(--shadow-2)`, border becomes drawer's color at 40% opacity. Transition: `SPRING.quick`.

**Drawer open state:**
- Clicked drawer expands from 64px to 320px height. Transition: `SPRING.gentle` (stiffness 300, damping 20). Other drawers slide down to make room (layout animation).
- Expanded content has 4 tabs along the top: "View Data", "Write Test", "Size Limits", "Traits". Tab styling: `var(--font-mono)`, `var(--text-xs)`, `var(--color-muted)` inactive, `var(--color-text)` active with a 2px bottom border in the drawer's color.

**Tab: "View Data":**
- Reads REAL data from the browser storage API. Displays as a key-value table.
- Table header: "Key" | "Value" | "Size", `var(--font-mono)`, `var(--text-xs)`, `var(--color-muted)`.
- Table rows: alternating `var(--color-bg)` and `var(--color-surface)` backgrounds. Key in `var(--color-text)`, Value in `var(--color-muted)` (truncated to 60 chars with "..." and tooltip for full value). Size in `var(--font-mono)`, 9px.
- For IndexedDB: shows database names and object store names (can't show all data -- too large). Each database name is clickable to show object store count.
- For Cookies: shows cookie name, value (obscured for HttpOnly), domain, expiry, flags (HttpOnly, Secure, SameSite) as small colored pills.
- For Cache API: shows cache names and URL count per cache.
- Empty state: "No data stored" in `var(--color-muted)` italic, centered.
- Entry animation: rows slide in from left with 40ms stagger per row, `TRANSITION.enterItem`.

**Tab: "Write Test":**
- Simple form: Key input (200px), Value textarea (200px wide, 80px tall), "Write" button.
- Key and Value: `var(--font-mono)`, `var(--text-sm)`, `var(--color-text)` on `var(--color-bg)`.
- "Write" button: drawer's color background, white text, `var(--radius-2)`, 36px tall. Click: depress animation (translateY +1px, 80ms).
- On success: brief green flash on the button (300ms), new entry appears in the View Data tab (auto-switches to View Data after 1s).
- On failure (e.g., QuotaExceededError for localStorage): button flashes `var(--color-error)` (300ms). Error message below: the specific error string in `var(--font-mono)`, `var(--text-sm)`, `var(--color-error)`. For QuotaExceededError: the IndexedDB drawer blinks its pull tab 3 times (`LOOP.glow`, 1s cycle, drawer's color) with an annotation floating next to it: "I can handle this" in `var(--diagram-layer-2)` text.

**Tab: "Size Limits":**
- Full-width bar visualization. Background: `var(--color-surface-2)`, 24px tall, `var(--radius-2)`.
- Filled portion: drawer's color at 70% opacity. Width: `(currentUsage / maxCapacity) * 100%`.
- Above the bar: "Used: 2.1 MB" on the left, "Limit: ~5 MB" on the right. `var(--font-mono)`, `var(--text-sm)`.
- Below the bar: a text description of the limit:
  - localStorage: "~5 MB per origin. Synchronous access blocks the main thread."
  - sessionStorage: "~5 MB per origin. Cleared when tab closes."
  - IndexedDB: "Typically 50%+ of available disk. Async access, no blocking."
  - Cookies: "~4 KB per cookie, ~80 cookies per domain."
  - Cache API: "Shares quota with IndexedDB. Designed for HTTP response caching."
- For localStorage: an "Add 1MB" button that writes 1MB of test data. Clicking it repeatedly fills the bar. When it hits the limit: bar turns `var(--color-error)`, size label flashes. `QuotaExceededError` message appears below.

**Tab: "Traits":**
- A 4-column trait comparison for this specific storage:
  - Persistence: "Tab" (sessionStorage), "Origin" (localStorage), "Origin" (IndexedDB), "Configurable" (Cookies), "Origin" (Cache API). Shown as a labeled badge.
  - Access Pattern: "Sync read/write" or "Async read/write". Sync gets a warning icon.
  - Scope: "Same origin, all tabs" (localStorage), "Same origin, single tab" (sessionStorage), "Same origin, all tabs" (IndexedDB), "Per-domain, sent with requests" (Cookies), "Same origin, all tabs + Service Worker" (Cache API).
  - XSS Vulnerability: "Accessible via JS" (red badge for localStorage, sessionStorage, IndexedDB, Cache API) or "HttpOnly available" (green badge for Cookies).
- Each trait: icon + label in `var(--font-mono)`, `var(--text-xs)`. Colored per significance.

**Quiz section (below the cabinet, 32px gap):**
- "Which Storage?" button: `var(--font-mono)`, `var(--text-sm)`, pill-shaped, 40px tall, `var(--color-accent)` border, `var(--color-bg)` background. Hover: fill becomes `var(--color-accent)`, text becomes white.
- When activated: 8 scenario cards appear one at a time above the cabinet. Each card: 280px wide, auto-height, `var(--color-surface)` background, `var(--radius-2)`, `var(--shadow-2)`. Scenario text in `var(--text-sm)`, `var(--color-text)`. A small "drag me" indicator (4 horizontal dots at top of card, `var(--color-muted)`).
- Drag interaction: reader grabs the scenario card and drags it toward one of the 5 drawers. As the card hovers over a drawer, the drawer's border brightens to the drawer's color at full opacity and scales up 2px. Drop zone is generous: 24px around each drawer.
- Correct drop: card dissolves into the drawer (scale 0.9 -> 0, opacity 1 -> 0, 300ms, `SPRING.snappy`). Drawer briefly pulses `var(--color-success)` border (400ms). Explanation text slides up from below the cabinet: green dot + explanation in `var(--text-sm)`, `var(--color-muted)`.
- Wrong drop: card bounces back to its original position (`SPRING.gentle`). The wrong drawer shakes (translateX +/- 3px, 3 cycles, 300ms). The CORRECT drawer glows softly (border pulses in its color, `LOOP.glow`, 2 cycles). Specific feedback appears below: red dot + "Why not {wrong}: {reason}. The right answer is {correct}: {explanation}." in `var(--text-sm)`.
- Progress: 8 small dots below the scenario card area. Filled = answered correctly on first try (green), filled with error ring = answered (eventually got it), unfilled = pending.

**The 8 quiz scenarios:**
1. "You need to cache an entire SPA's HTML, CSS, and JS for offline use." -- Cache API.
2. "Store a user's auth token that the server needs to read on every request." -- Cookies (HttpOnly).
3. "Save form draft data that should survive a page refresh but not persist forever." -- localStorage (or sessionStorage if "until tab closes" is acceptable).
4. "Store 50MB of user-generated documents for an offline-first notes app." -- IndexedDB.
5. "Keep track of whether the user has seen the onboarding tooltip (simple boolean)." -- localStorage.
6. "Share a 'currently editing' status across multiple tabs of the same app." -- localStorage (storage event for cross-tab).
7. "Store structured search results with indexes for fast querying." -- IndexedDB.
8. "Temporarily hold a wizard's step-2 data while the user completes step-3, clear when they leave." -- sessionStorage.

### Teaching Flow (First 60 Seconds)

1. Reader sees 5 drawers stacked vertically, each labeled with a storage API name, a size meter, and a sync/async badge. The drawers look like a filing cabinet -- the metaphor is immediate.
2. They click the localStorage drawer. It expands smoothly to reveal 4 tabs. The "View Data" tab is active, showing actual key-value pairs from their browser. They see real data: maybe a theme preference, a cookie consent flag, some analytics IDs. "This is actual data on MY machine."
3. They click "Write Test" tab. They type key: "test-key", value: "hello world", click Write. The data appears. They switch to "View Data" and see their entry.
4. They click "Size Limits" tab. They see the bar: "Used: 0.1 MB / ~5 MB". They click "Add 1MB" five times. The bar fills: 1.1, 2.1, 3.1, 4.1... at 5.1 MB, it fails. The bar turns red. "QuotaExceededError" appears. The IndexedDB drawer's pull tab starts blinking: "I can handle this."
5. They close the localStorage drawer and click IndexedDB. Size Limits tab: "Typically 50%+ of available disk." The bar is almost empty relative to a massive capacity. They get it: IndexedDB is the big one.
6. They notice the "Which Storage?" button at the bottom. They click it.
7. First scenario card appears: "Cache an entire SPA for offline use." They drag it to... localStorage? It bounces back. "localStorage is limited to 5MB and can't cache HTTP responses. Cache API stores request/response pairs designed for offline use." They drag it to Cache API. Correct. Drawer pulses green.
8. Second scenario: "Store a user's auth token that the server needs to read." They drag to localStorage. Shake. "localStorage is accessible to any JavaScript on the page -- an XSS attack could steal the token. HttpOnly cookies can't be accessed by JavaScript." They drag to Cookies. Correct.

### Data & State Shape

```typescript
type StorageType = "localStorage" | "sessionStorage" | "indexedDB" | "cookies" | "cacheAPI";

type DrawerTab = "view" | "write" | "size" | "traits";

type StorageEntry = {
  key: string;
  value: string;
  size: number;        // bytes
  metadata?: {
    // Cookie-specific
    domain?: string;
    expires?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: string;
    // IndexedDB-specific
    objectStoreCount?: number;
    // Cache API-specific
    urlCount?: number;
  };
};

type DrawerData = {
  type: StorageType;
  name: string;             // "localStorage"
  icon: string;             // icon identifier
  color: string;            // CSS variable, e.g., "var(--diagram-layer-0)"
  isSync: boolean;
  entries: StorageEntry[];
  currentSizeBytes: number;
  maxSizeBytes: number;     // approximate
  sizeLabel: string;        // "~5 MB"
  description: string;      // one-line for Size Limits tab
  traits: {
    persistence: string;
    accessPattern: string;
    scope: string;
    xssVulnerable: boolean;
  };
};

type QuizScenario = {
  prompt: string;
  correctAnswer: StorageType;
  wrongFeedback: Partial<Record<StorageType, string>>;  // feedback per wrong choice
  correctExplanation: string;
};

type QuizAnswer = {
  scenario: number;
  firstTryCorrect: boolean;
  answer: StorageType;
};

type StorageAnatomyState = {
  openDrawer: StorageType | null;
  activeTab: DrawerTab;
  drawers: DrawerData[];

  // Write test form
  writeForm: { key: string; value: string };
  writeResult: { success: boolean; error?: string } | null;

  // IndexedDB nudge
  indexedDBNudgeVisible: boolean;

  // Quiz
  quiz: {
    active: boolean;
    scenarios: QuizScenario[];
    currentScenarioIdx: number;
    answers: QuizAnswer[];
    dragState: {
      dragging: boolean;
      hoverTarget: StorageType | null;
    };
    showingFeedback: boolean;
    feedbackIsCorrect: boolean;
    score: number;
  };
};
```

### Primitives & Props

| Primitive | Source | Props used |
|-----------|--------|------------|
| `AnatomyViewer` | Shared layout primitive (to be built) | `regions: Region[]` (5 drawers), `renderDiagram: () => ReactNode` -- each drawer is a clickable region that expands to reveal detail |
| `DemoSandbox` | Shared | Outer container wrapper |

**Internal components to build:**
- `StorageDrawer` -- a single drawer: collapsed (64px) and expanded (320px) states, 4 tabs, pull-tab interaction, size meter, sync/async badge
- `RealDataTable` -- reads from actual browser storage APIs (localStorage, sessionStorage via `window.localStorage`, IndexedDB via `indexedDB.databases()`, cookies via `document.cookie`, Cache API via `caches.keys()`) and renders as a table
- `WriteTestForm` -- key/value form with write button, success/error feedback
- `SizeLimitBar` -- horizontal bar with fill, labels, and "Add 1MB" test button (localStorage only)
- `TraitCard` -- 4-trait display per storage type
- `QuizDragArea` -- manages drag-and-drop of scenario cards to drawers, including hover highlights and bounce-back
- `ScenarioCard` -- draggable card with scenario text
- `IndexedDBNudge` -- the blinking "I can handle this" annotation

### Edge Cases

- **Browser storage access blocked**: In incognito/private mode or with storage disabled, `localStorage.setItem` throws. Catch errors and show a banner: "Storage access is restricted in this browser mode. Showing simulated data instead." Fall back to mock data that mimics realistic storage entries.
- **Empty storage**: If a drawer has no real data, show "No data stored -- try the Write Test tab" in `var(--color-muted)`.
- **IndexedDB async reading**: IndexedDB reads are async. Show a loading skeleton (3 rows of shimmer, 200ms animation, `var(--color-surface-2)`) while reading. Never block the main thread.
- **Cookie HttpOnly visibility**: `document.cookie` cannot access HttpOnly cookies. Note this in the cookies View Data tab: "HttpOnly cookies are hidden from JavaScript -- that's the point." in `var(--color-muted)` italic.
- **Cache API availability**: Cache API requires HTTPS (or localhost). If unavailable, show the drawer grayed out with "Requires HTTPS" label.
- **Quiz drag on mobile**: Touch drag may be difficult. Provide a fallback: tapping the scenario card shows 5 answer buttons (one per storage type) instead of drag-to-drawer.
- **Quiz replay**: After completing all 8 scenarios, show score and "Retry" button. Shuffle scenario order on retry.
- **Rapid drawer switching**: Only one drawer open at a time. Clicking another while one is open: close current (200ms), open new (300ms), sequenced. No overlapping animations.
- **Large localStorage data**: If localStorage has many entries (100+), paginate the View Data table: show first 20 rows with a "Show all (147 entries)" link.
- **Mobile (< 640px)**: Cabinet takes full width. Drawers expand to full viewport width. Quiz scenario cards appear above the cabinet as a card stack. Tabs inside drawers become a horizontal scrollable strip.
- **Reduced motion**: Drawer expand/collapse instant. Quiz drag still works (position tracking doesn't need animation). Bounce-back on wrong answer is an instant snap-back. Size meter fill is instant.

### Cross-Lesson Connections

This is the **second stop** in the "what -> where -> how" arc. Having learned WHAT data structure to use (state-search), the reader now learns WHERE to persist data. The localStorage quota limit (5MB) directly motivates the next stop (state-memory): when your app's data exceeds what localStorage can hold, you need IndexedDB -- and when it exceeds what the main thread should hold, you need the multi-tier memory strategy.

The quiz scenarios connect forward: "50MB of documents for offline-first" (IndexedDB) and "cache SPA for offline use" (Cache API) foreshadow real system design patterns in Section 10. The "auth token in HttpOnly cookies" scenario connects to Section 9 (Security). The "cross-tab communication via localStorage" scenario connects to the BroadcastChannel/SharedWorker topics if covered elsewhere.

---

## state-memory -- Memory Offloading Scrollytelling
**Format**: scrollytelling | **Effort**: medium

### Interaction State Machine

```
                +----------------------------+
                |        SCROLL_IDLE         |
                | stepIndex: 0               |
                | mainThreadLoad: 1.0 (100%) |
                | workerLoad: 0.0            |
                | indexedDBLoad: 0.0          |
                +----------------------------+
                     |  scroll to step 1
                     v
                +----------------------------+
                |       STEP_1_OVERLOADED    |
                | stepIndex: 1               |
                | mainThreadLoad: 1.0 (red)  |
                | gcPauses: visible          |
                +----------------------------+
                     |  scroll to step 2
                     v
                +----------------------------+
                |    STEP_2_WORKER_OFFLOAD   |
                | stepIndex: 2               |
                | mainThreadLoad: 0.6        |
                | workerLoad: 0.4            |
                | serializationCost: 12ms    |
                | postMessageAnim: playing   |
                +----------------------------+
                     |  scroll to step 3
                     v
                +----------------------------+
                |   STEP_3_COLD_TO_IDB       |
                | stepIndex: 3               |
                | mainThreadLoad: 0.4        |
                | workerLoad: 0.4            |
                | indexedDBLoad: 0.2          |
                +----------------------------+
                     |  scroll to step 4
                     v
                +----------------------------+
                |     STEP_4_LRU_CACHE       |
                | stepIndex: 4               |
                | lruCache: CacheEntry[]     |
                | evictionAnim: playing      |
                +----------------------------+
                     |  scroll to step 5
                     v
                +----------------------------+
                |  STEP_5_SHARED_ARRAY_BUF   |
                | stepIndex: 5               |
                | serializationCost: 0ms     |
                | zeroCopyAnim: playing      |
                +----------------------------+
                     |  scroll past step 5
                     v
                +----------------------------+
                |  INTERACTIVE_ALLOCATOR     |
                | allocatorActive: true      |
                | userAllocation: TierAlloc  |
                | memoryPressure: computed   |
                +----------------------------+
                     |  drag allocation slider
                     v
                +----------------------------+
                |  ALLOCATING                |
                | tier: "main"|"worker"|"idb"|
                | amount: number             |
                | pressure: recalculated     |
                +----------------------------+
```

**State data:**
- `stepIndex`: 0..5 (driven by IntersectionObserver on scroll step markers)
- `mainThreadLoad`: 0..1 (fraction of bar filled)
- `workerLoad`: 0..1
- `indexedDBLoad`: 0..1
- `gcPauses`: `{ visible: boolean; count: number }` (simulated GC pause indicators)
- `serializationCost`: number (ms, displayed in counter)
- `postMessageBlobs`: `{ id: string; from: Tier; to: Tier; progress: number }[]` (animated data blobs in transit)
- `lruCache`: `{ key: string; lastAccess: number; size: number; inMainThread: boolean }[]`
- `allocator`: `{ mainMB: number; workerMB: number; idbMB: number; totalMB: number }`
- `memoryPressure`: `"green"` | `"yellow"` | `"red"` (computed from mainThreadLoad)

### Visual Choreography

**Layout: ScrollytellingShell. 60/40 split. Sticky visual on left, scroll narrative on right.**

**Sticky visual (left, 60% width, full viewport height minus 64px):**

Three horizontal memory bars stacked vertically, centered in the sticky area. Between them: animated connection pathways for data flow.

**Memory bars:**
- Each bar: 100% sticky-area width minus 48px padding, 48px tall, `var(--radius-2)` corners.
- **Main Thread bar (top)**:
  - Background: `var(--color-surface-2)`.
  - Fill: gradient from left. Color depends on load:
    - 0-50%: `var(--color-success)` (green, oklch 60% 0.18 140)
    - 50-80%: `oklch(70% 0.18 60)` (amber, warning)
    - 80-100%: `var(--color-error)` (red, oklch 65% 0.2 25)
  - Fill width: `mainThreadLoad * 100%`. Transition: `TRANSITION.progress` (500ms, easeOut) when driven by scroll steps. When driven by the allocator slider: no transition (immediate, 1:1 tracking).
  - Label left: "Main Thread" in `var(--font-mono)`, `var(--text-sm)`, `var(--color-text)`.
  - Label right: "{X} MB" in `var(--font-mono)`, `var(--text-sm)`, bar fill color.
  - Sub-label: "fast, limited, blocks UI" in `var(--text-xs)`, `var(--color-muted)`.
  - GC pause indicators: when load > 80%, small red triangles (8px) appear at irregular intervals along the top edge of the bar, each with a tooltip: "GC pause: 14ms" in `var(--font-mono)`, 9px. These appear with `SPRING.snappy` scale animation. In step 1, show 5-7 of these scattered along the bar.
- **Web Worker bar (middle, 40px below Main Thread bar)**:
  - Same dimensions and structure as Main Thread bar.
  - Fill color: `var(--diagram-layer-2)` (purple, oklch 65% 0.15 300) regardless of load (workers don't block UI).
  - Label left: "Web Worker" in `var(--font-mono)`.
  - Sub-label: "parallel, no UI access" in `var(--text-xs)`, `var(--color-muted)`.
- **IndexedDB bar (bottom, 40px below Worker bar)**:
  - Same dimensions but 32px tall (visually "deeper" storage feels smaller in height but conceptually larger in capacity).
  - Fill color: `var(--diagram-layer-0)` (teal, oklch 65% 0.15 200).
  - Label left: "IndexedDB" in `var(--font-mono)`.
  - Sub-label: "persistent, unlimited, async" in `var(--text-xs)`, `var(--color-muted)`.
  - A subtle capacity indicator: a dashed outline extending far beyond the bar's current fill, suggesting massive headroom. Dash pattern: 4px dash, 8px gap, 1px stroke, `var(--color-border)`.

**Data flow pathways (between the bars):**
- When data moves between tiers (steps 2, 3, 4, 5): an animated "blob" travels along a path connecting the two bars.
- Blob: 20x14px rounded rectangle, filled with a gradient from source tier color to destination tier color. Drop shadow: `0 0 6px {source-color}`.
- Path: a vertical connector line (1.5px, `var(--color-border)`) between the two bars, with the blob traveling along it.
- Blob animation: translate from source bar's right edge to destination bar's left edge, 600ms, `SPRING.gentle`. At the midpoint, the blob briefly widens (scaleX 1.2) to suggest "data in transit."
- **Serialization cost counter** (steps 2 and 5): a small counter positioned next to the pathway.
  - Step 2 (postMessage): counter reads "12ms" in `var(--font-mono)`, `var(--text-sm)`, `var(--color-error)`. The counter ticks up from 0 to 12 over 300ms as the blob travels.
  - Step 5 (SharedArrayBuffer): counter reads "0ms" in `var(--font-mono)`, `var(--text-sm)`, `var(--color-success)`. The counter stays at 0 -- the blob teleports instantly (no travel animation, just a flash at both endpoints simultaneously).

**Per-step visual specifics:**

**Step 0 (initial):** All bars empty. Only Main Thread bar label visible. Worker and IndexedDB bars are ghosted outlines (`var(--color-border)`, dashed). No fills.

**Step 1 (overloaded):** Main Thread bar fills from 0% to 100% over 800ms. Color transitions through green -> amber -> red as it fills. At 80%, GC pause triangles start appearing (staggered, 150ms each, `SPRING.snappy`). At 100%, the bar's border pulses red via `LOOP.pulse` (1.5s). A "Long Task" label flashes in the bar at 90% position: "blocked: 200ms" in white text on red background, `var(--text-xs)`.

**Step 2 (worker offload):** A data blob detaches from the Main Thread bar's right side and travels down to the Worker bar. The postMessage serialization counter ticks up: "0ms... 4ms... 8ms... 12ms". Main Thread bar fill shrinks from 100% to 60% (green/amber transition). Worker bar materializes (outline becomes solid, fill grows to 40%). GC pause triangles reduce from 7 to 2.

**Step 3 (cold data to IndexedDB):** A second blob, smaller and colored differently (teal), detaches from the Main Thread bar and travels down past the Worker bar to IndexedDB. Main Thread shrinks from 60% to 40% (solidly green now). IndexedDB bar materializes with 20% fill. GC pause triangles disappear entirely. A small "breathing room" annotation appears next to the Main Thread bar in `var(--color-success)`, `var(--text-xs)`.

**Step 4 (LRU cache):** A small visualization appears overlaid on the Main Thread bar: 6 tiny labeled rectangles inside the bar representing cached items (e.g., "user", "prefs", "recent", "feed", "msgs", "notif"). Each is 40x20px, `var(--color-surface)` background, `var(--font-mono)` 8px label.
- Eviction animation: the leftmost item ("notif" -- least recently used) slides out the bottom of the Main Thread bar, travels down to IndexedDB, and a new item ("search") slides in from the right. This plays automatically on entering step 4, then replays on a 4s loop.
- An "LRU" label appears above the mini-cache: `var(--font-mono)`, `var(--text-xs)`, `var(--diagram-layer-3)` (amber) text.
- Eviction arrow: a thin animated arrow from the evicted item to IndexedDB. Arrow color: `var(--diagram-layer-0)` (teal). `TRANSITION.enterCard` (300ms).

**Step 5 (SharedArrayBuffer):** The pathway between Main Thread and Worker changes. The blob travel animation is replaced with a simultaneous flash at both endpoints. Both the Main Thread and Worker bars get a shared highlight: a 4px section of both bars pulses in `var(--diagram-layer-2)` (purple) simultaneously, connected by a thick 3px solid line (not dashed). The serialization counter: "0ms" in green, contrasted with the "(was 12ms)" ghost text in `var(--color-muted)` struck through.
- A small "Atomics" label appears on the connecting line: `var(--font-mono)`, 9px, `var(--color-muted)`.
- The "zero-copy" nature is visually communicated by the LACK of a traveling blob -- the data is already in both places.

**Post-scroll interactive allocator:**
- Appears after scrolling past step 5. Full sticky-area width.
- The three memory bars remain visible from the scrollytelling.
- Below the bars: 3 horizontal sliders (one per tier), each labeled:
  - "Main Thread: {X} MB" -- slider range: 0 to `totalMB`. Slider track: same color as the bar.
  - "Web Worker: {X} MB" -- same.
  - "IndexedDB: {X} MB" -- same.
- A "Total Data" label and number: "{totalMB} MB" with a slider to set total (range: 10 MB to 500 MB, step 10).
- Constraint: the three tier sliders must sum to `totalMB`. When one slider is dragged, the others adjust proportionally (or the reader can lock a tier with a small lock icon toggle next to each slider).
- **Memory pressure meter**: a semicircular gauge (120px wide, 60px tall) above the bars. Needle position maps to mainThreadLoad: green zone (0-40%), amber zone (40-70%), red zone (70-100%). Needle animated with `SPRING.snappy`. Label below: "Memory Pressure" in `var(--font-mono)`, `var(--text-xs)`.
- When the reader allocates too much to Main Thread (> 70% of total): GC pause triangles reappear on the Main Thread bar. The pressure meter needle enters the red zone. A label: "GC pauses impacting frame rate" in `var(--color-error)`, `var(--text-xs)`.
- When the reader finds a balanced allocation (Main Thread < 40%): the pressure meter shows green, and a takeaway appears: "Hot data in Main Thread, computation in Worker, cold data in IndexedDB." in `var(--color-success)`, `var(--text-sm)`.

### Teaching Flow (First 60 Seconds)

1. Reader sees a single horizontal bar labeled "Main Thread" with nothing else. The bar is empty. The right panel shows the first scroll step's narrative: "All data living in main thread memory. Garbage collector runs frequently, long tasks block the UI. Sound familiar?"
2. As they scroll, the Main Thread bar fills to 100%. The fill color transitions from green through amber to red. At 80%, small red triangles start appearing: "GC pause: 14ms", "GC pause: 23ms". At 100%, the bar pulses red. A "blocked: 200ms" long-task label flashes. The reader viscerally sees: too much data = main thread pain.
3. They scroll to step 2. A purple blob detaches from the Main Thread and travels down to a Worker bar that materializes below. A counter ticks: "Serialization: 0ms... 4ms... 8ms... 12ms". The Main Thread bar shrinks to 60%. GC triangles reduce. Narrative: "Web Workers run on a separate thread -- great for heavy computation. But data must be serialized to cross the boundary. That 12ms copy isn't free."
4. Step 3: another blob, teal, slides further down to an IndexedDB bar. Main Thread drops to 40% (fully green). Narrative: "Cold data -- rarely accessed -- belongs in IndexedDB. Main thread breathes again."
5. Step 4: tiny cached items appear inside the Main Thread bar. The least-recently-used item gets evicted to IndexedDB, and a new item slides in. The LRU loop plays. Narrative: "An LRU cache keeps hot data in fast main thread memory. Least-recently-used items evict to IndexedDB."
6. Step 5: the pathway between Main Thread and Worker changes to a simultaneous flash. "0ms" counter vs "(was 12ms)" crossed out. Narrative: "SharedArrayBuffer lets workers access the same memory. Zero serialization cost -- but you need Atomics for synchronization."
7. After step 5: the allocator appears. Three sliders. The reader drags Main Thread to 80%. Pressure meter goes red. GC triangles appear. They pull it back to 30%, push more to Worker and IndexedDB. Meter goes green. "Hot data in Main Thread, computation in Worker, cold data in IndexedDB." They've internalized the strategy by FEELING the pressure.

### Data & State Shape

```typescript
type Tier = "mainThread" | "worker" | "indexedDB";
type PressureLevel = "green" | "amber" | "red";

type GCPause = {
  id: string;
  positionPercent: number;   // 0..100, position along bar
  durationMs: number;        // displayed: "GC pause: 14ms"
};

type DataBlob = {
  id: string;
  from: Tier;
  to: Tier;
  progress: number;          // 0..1, travel animation progress
  sizeLabel: string;         // "40MB"
  color: string;             // CSS variable
};

type LRUCacheItem = {
  key: string;               // "user", "prefs", "recent", etc.
  inMainThread: boolean;
  evicting: boolean;         // true during eviction animation
};

type ScrollStep = {
  index: number;
  mainThreadLoad: number;    // 0..1
  workerLoad: number;
  indexedDBLoad: number;
  gcPauseCount: number;
  blobs: DataBlob[];
  serializationCostMs: number;
};

type AllocatorState = {
  totalMB: number;           // 10..500
  mainThreadMB: number;
  workerMB: number;
  indexedDBMB: number;
  lockedTiers: Set<Tier>;    // tiers the user has locked
};

type MemoryOffloadingState = {
  // Scrollytelling
  currentStepIndex: number;   // 0..5
  stepTransitionProgress: number;  // 0..1, for inter-step interpolation

  // Bar state (driven by step OR allocator)
  mainThreadLoad: number;
  workerLoad: number;
  indexedDBLoad: number;
  pressure: PressureLevel;

  // Visual elements
  gcPauses: GCPause[];
  activeBlobs: DataBlob[];
  serializationCostMs: number;
  showSerializationCounter: boolean;

  // LRU cache (step 4)
  lruItems: LRUCacheItem[];
  lruEvictionPlaying: boolean;

  // SharedArrayBuffer (step 5)
  showZeroCopy: boolean;
  showOldCostStrikethrough: boolean;

  // Post-scroll allocator
  allocatorActive: boolean;
  allocator: AllocatorState;
  showTakeaway: boolean;
  takeawayText: string;
};
```

### Primitives & Props

| Primitive | Source | Props used |
|-----------|--------|------------|
| `ScrollytellingShell` | Shared layout primitive (to be built) | `steps: ScrollStep[]` (5 steps), `renderVisual: (stepIndex: number) => ReactNode` -- provides the 60/40 split, IntersectionObserver step triggering, sticky positioning, scroll progress bar, reduced-motion fallback |
| `DemoSandbox` | Shared | Container wrapper for the post-scroll allocator interactive |

**Internal components to build:**
- `MemoryBar` -- single horizontal bar with dynamic fill color (green/amber/red), label, sub-label, GC pause triangle indicators. Accepts `load: number`, `tier: Tier`, `gcPauses: GCPause[]`.
- `DataBlobAnimation` -- animated blob traveling between two bars along a connector path. Accepts `from: Tier`, `to: Tier`, `progress: number`, `color: string`.
- `SerializationCounter` -- ticking counter that animates from 0 to targetMs. Accepts `targetMs: number`, `playing: boolean`.
- `LRUMiniCache` -- overlay on Main Thread bar showing 6 small labeled items with eviction loop animation.
- `ZeroCopyVisual` -- the SharedArrayBuffer simultaneous-flash visualization replacing blob travel.
- `PressureMeter` -- semicircular gauge with animated needle. Accepts `pressure: number` (0..1).
- `TierAllocatorSliders` -- 3 constrained sliders that sum to a total, with lock toggles.
- `GCPauseTriangle` -- small red triangle with tooltip, scale entrance animation.

### Edge Cases

- **Scroll direction reversal**: If the reader scrolls backward, the visual must reverse. Step transitions are bidirectional: scrolling from step 3 back to step 2 should re-expand the Main Thread bar and shrink IndexedDB. Use the `stepIndex` to drive all visual state (not animation history).
- **Fast scrolling past multiple steps**: If the reader scrolls quickly from step 0 to step 4, intermediate states should be shown briefly (each step holds for at least 200ms) or the visual should interpolate through all intermediate states. Do NOT skip directly -- the cumulative build-up is the teaching device.
- **Allocator slider constraint violation**: When dragging one slider, if the sum would exceed totalMB, clamp the dragged slider. If a tier is locked, it cannot be adjusted by the constraint system. If all three are locked, unlock the oldest lock when dragging.
- **Very large totalMB (500 MB)**: The bars should still be proportionally meaningful. Use the same bar width regardless of total -- only the fill and labels change. IndexedDB's dashed "headroom" outline extends to suggest it could hold even more.
- **Allocator with Main Thread at 0 MB**: Show the Main Thread bar as empty with a note: "0 MB in main thread = all data access requires async reads" in `var(--color-muted)`. This teaches that SOME main thread cache is necessary for responsive UI.
- **Mobile (< 640px)**: ScrollytellingShell switches to single-column: sticky visual on top (40vh), scroll narrative below. Bars are narrower but maintain proportions. Allocator sliders stack vertically.
- **Reduced motion**: No blob travel animations. Data movement is shown as instant state changes: source bar shrinks, destination bar grows, simultaneously, 0ms transition. Serialization counter shows final value immediately. LRU eviction shows as instant item swap (no slide). Pressure meter needle snaps to position.
- **postMessage vs SharedArrayBuffer comparison**: In step 5, if the reader has not fully internalized the 12ms cost from step 2, the "(was 12ms)" strikethrough might not land. Ensure the "12ms" text remains visible (ghosted) on the pathway until step 5 replaces it, so the contrast is always visible.
- **Keyboard navigation**: Each scroll step should be reachable via keyboard. Allocator sliders are focusable with arrow key increments (step: 10 MB). Pressure meter announces its value via `aria-label`.

### Cross-Lesson Connections

This is the **third and final stop** in the "what -> where -> how" arc. Having chosen the right data structure (state-search) and the right storage API (state-storage), the reader now learns HOW to manage memory pressure across runtime tiers.

The three-bar model (Main Thread / Worker / IndexedDB) synthesizes knowledge from both prior stops:
- The Map from state-search is the in-memory cache (Main Thread hot data).
- IndexedDB from state-storage is the cold storage tier.
- The LRU cache bridges them: hot data (fast access, from state-search) lives in main thread; cold data (persistent, from state-storage) lives in IndexedDB.

The serialization cost insight (postMessage 12ms vs SharedArrayBuffer 0ms) is a performance concept that connects forward to Section 7 (Performance). The "allocate too much to main thread = GC pauses" finding connects to the "long tasks block the event loop" concept from Section 1 (core-event-loop). The three-tier mental model prepares the reader for Section 10's system design problems, where real applications must manage data across these tiers.

**Arc summary:**
- state-search: WHAT data structure to use (Array vs Map vs Trie based on access pattern)
- state-storage: WHERE to put data (localStorage vs IndexedDB vs Cookies vs Cache API based on constraints)
- state-memory: HOW to manage memory across tiers (Main Thread for hot, Worker for compute, IndexedDB for cold)

The three stops together answer the full question: "How should I design application state?"

---
