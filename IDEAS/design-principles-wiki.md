# Interactive Design Principles Wiki

**Status:** Expanded idea -- designing information architecture and initial principle pages
**Created:** 2026-05-15
**Tags:** Design Principles, Knowledge Base, Component Architecture, State Management, Animation, Pedagogy, Accessibility, Performance
**Format:** Wiki / Knowledge Base (not a linear series)

---

## The Concept

A living knowledge base of frontend design principles, each demonstrated through interactive widgets. Not a book read cover-to-cover, but a reference navigated by need: the developer who just wrote a 400-line component that handles layout, data fetching, and three animation states doesn't need a lecture on separation of concerns -- they need the principle page for **Primitive Composition**, with a live widget showing what happens when you extract the animation into a hook, the layout into a shell, and the data into a context. They need to see their monolith decompose in front of them.

Think "Refactoring Guru meets Observable notebooks." Each principle page has a consistent structure, cross-links to related principles, and -- critically -- an interactive widget that lets the reader manipulate the principle, not just read about it. Static text explains what a compound component is. The widget lets you drag props between the compound component and the monolithic alternative, watching the API surface shrink and the composition possibilities multiply.

### Why a Wiki, Not a Series

The plugin architectures and streaming ideas docs work as linear series because they have a narrative arc: problem -> technique -> technique -> technique -> synthesis. Design principles don't have a natural reading order. "Primitive Composition" doesn't come before or after "Optimistic Updates" -- they exist in different domains. A developer working on animation has no reason to read about cache invalidation first.

A wiki scales where a series doesn't:

- **New principles can be added** by creating a page and adding cross-links. No restructuring.
- **Cross-domain connections become visible.** "Primitive Composition" applies to components, to animations, to state management. In a series, it lives in one chapter. In a wiki, it links to all three domains.
- **Multiple entry points.** A reader arrives from a deep-dive post ("Zustand uses this pattern -- see the principle page") or from a category browse ("show me all Animation principles") or from a search ("how do I handle optimistic rollback?").
- **No completeness pressure.** A series with 6 posts feels incomplete at 4. A wiki with 20 principles feels alive at 12 and richer at 40.

### How This Relates to the Existing Content

The "From Bespoke to Semantic" recipe series (`content/recipes/from-bespoke-to-semantic-*.mdx`) tells the story of the FlowDiagram component's evolution: scattered one-off SVGs -> monolithic component -> compound component -> semantic contract system. That story becomes **source material** for several wiki principle pages:

- The "bespoke SVG debt" becomes an example on the **Primitive Composition** page
- The "monolithic component" becomes an anti-pattern on the **Compound Components** page
- The "semantic contract" (thesis/hierarchy/narrative) becomes its own page: **Semantic Contracts**
- The FlowDiagram's `types.ts` -> `geometry.ts` -> `use-flow-diagram.ts` -> `primitives.tsx` -> `FlowDiagram.tsx` layering becomes an example on the **Layered Architecture** page

The deep-dive series (plugin architectures, streaming, React state) are "here's how Library X implements it." The wiki is "here's the general principle, with Library X as one example." Deep dives link forward to wiki pages ("This pattern is called Visitor -- see the principle page"). Wiki pages link back to deep dives ("For a full walkthrough of this pattern in ESLint, see the Plugin Architectures series, Post 3").

---

## Layout & Visual Identity Decisions

### Landing Page: Knowledge Graph

The `/principles` page is dominated by an interactive knowledge graph — principles are nodes, relationships are edges. Category membership is encoded as color-coded clusters. The graph is the primary wayfinding tool; below it, category filters toggle which clusters are visible, and learning paths are listed as curated sequences.

**Graph interaction model:**
- **Pan & zoom** via mouse drag / scroll (or pinch on touch). Graph auto-fits all visible nodes on load.
- **Click node** → navigates to principle page.
- **Hover node** → shows tooltip with one-line summary + category tags.
- **Category filter chips** below the graph toggle cluster visibility. Active categories glow with their cluster color. "All" is default.
- **Search** (Cmd+K palette or inline search bar) highlights matching nodes in the graph, dimming non-matches.
- **Learning paths** section below the graph shows curated sequences as horizontal step indicators (not the graph itself — paths are explicit ordered sequences, not graph traversals).

**Animation spec:**
- Graph entrance: nodes fade in with `STAGGER.fast` by category cluster. Edges draw in with `TRANSITION.enterCard` after nodes settle.
- Node hover: scale `1.0 → 1.15` with `SPRING.snappy`, connected edges brighten.
- Category filter toggle: excluded nodes shrink to 0 with `SPRING.gentle`, edges retract. Remaining nodes reflow to fill space with `SPRING.snappy`.
- Reduced motion: no entrance stagger, no edge draw-in, no reflow. Hover shows outline instead of scale. Filter is instant opacity toggle.

**Technical approach:**
- Force-directed layout computed once at build time (or on first paint), then cached. No physics simulation running continuously — that's a battery drain.
- SVG for nodes and edges (not canvas) — keeps them accessible, styleable, and clickable without hit-testing math.
- `IntersectionObserver` guard: graph doesn't animate until visible.
- Nodes are `<a>` elements wrapping SVG groups — keyboard navigable via Tab, Enter to follow link.

### Principle Page: Sidebar TOC + Content

Individual principle pages use the existing blog post layout: `240px` sticky sidebar with section TOC, content area to the right. This is consistent with the rest of Terminal Dreams and familiar to returning readers.

- **Sidebar** (Fira Code mono) lists the 9 template sections: Problem, Principle, Widget, Example, Anti-Patterns, Related, Break This Rule, Deep-Dive Refs. Active section highlighted via scroll-spy.
- **Content area** uses editorial typography (see Visual Identity below). Widgets render inline in the content flow at full content-column width.
- **Mobile** (< 768px): sidebar collapses, TOC becomes a dropdown or disappears. Content goes full-width.

### Cross-Navigation: Related Links + Breadcrumbs

**Top of page:**
```
principles / component-design / compound-components
                                    ← prev  next →
```
Breadcrumb trail with category and principle name. Prev/next arrows cycle through principles within the same primary category, sorted by importance weight.

**Bottom of page:**
A "Related Principles" section with 3-5 cards. Each card shows: principle name, one-line summary, category tags, and a one-sentence relationship description ("Primitive Composition is the general form of this pattern").

### Visual Identity: Hybrid Retro Shell + Editorial Content

The wiki uses a **two-layer typographic system**:

| Layer | Font | Usage |
|---|---|---|
| **Chrome** (navigation) | Fira Code (mono) | Breadcrumbs, sidebar TOC, category tags, search, card metadata, graph labels |
| **Content** (reading) | Fraunces (display headings) + Inter (body) | Principle title, section headings, prose paragraphs, anti-pattern descriptions |
| **Code** | Fira Code (mono) | All code blocks, inline code, component API examples |

The chrome layer signals "you're navigating" — it's the retro terminal shell. The content layer signals "you're reading/learning" — it shifts to editorial mode for long-form comprehension.

**Color system:** Same oklch tokens as the rest of the site. No new palette. Category colors for the knowledge graph come from the existing `--diagram-layer-*` tokens.

**Borders & surfaces:** Same sharp borders (`var(--color-border)`), same surface hierarchy (`--color-bg` → `--color-surface` → `--color-surface-2`). No rounded corners beyond `--radius-1` on tags.

**Scanlines:** Present on the landing page (retro chrome dominates). Absent or very subtle on principle pages (editorial content dominates — scanlines fight readability on long prose).

---

## Information Architecture

### URL Structure

```
/principles                        # Landing page: category browse, search, featured paths
/principles/[slug]                 # Individual principle page
/principles/category/[category]    # Category listing page
/principles/path/[path-slug]       # Learning path (curated sequence)
```

Slugs are kebab-case versions of the principle name: `compound-components`, `optimistic-updates`, `primitive-composition`, `semantic-contracts`.

### Category Taxonomy

Categories are NOT mutually exclusive. A principle can belong to multiple categories. The primary category determines its position in the browse view; secondary categories appear as tags.

| Category | Scope | Example Principles |
|---|---|---|
| **Component Design** | React/UI component architecture | Compound Components, Primitive Composition, Render Delegation, Prop API Design, Semantic Contracts, Slot Patterns |
| **State Management** | Data flow, caching, reactivity | Derived State, Optimistic Updates, Cache Invalidation, External Stores, Structural Sharing |
| **Animation & Motion** | Motion design for interactive UIs | Choreography, Reduced Motion, Spring Physics, Entrance/Exit Pairs, Performance Budgets, Stagger Patterns |
| **Teaching & Pedagogy** | How interactive content teaches | Progressive Disclosure, Cognitive Load, Widget Design, Annotation over Decoration, Scrubbing as Pedagogy |
| **Architecture** | System design, module boundaries | Separation of Concerns, Feature Colocation, Layered Architecture, Module Boundaries, Thin Wrappers |
| **Performance** | Speed, efficiency, budgets | Bundle Splitting, Lazy Loading, Render Optimization, CSS Containment, Compositor-Only Animations |
| **Accessibility** | Inclusive design | Focus Management, Screen Reader Patterns, ARIA Landmarks, Keyboard Navigation, Reduced Motion (cross-listed) |
| **Data Patterns** | Network, streaming, data shape | Streaming Composition, Producer-Consumer, Backpressure, Stale-While-Revalidate |

Categories can be added without restructuring -- they're tags, not folders. A new category ("Testing Patterns," "TypeScript Patterns") just means new tag values.

### Navigation Model

**Browse by Category.** The `/principles` landing page shows categories as expandable sections. Each section lists its principles as cards with name + one-line summary. Cards are sorted by a manually-curated "importance" weight, not alphabetically -- the most foundational principles surface first.

**Search.** A command-palette-style search (Cmd+K) that searches principle names, summaries, tags, and the full-text content. Results are ranked by relevance, with the principle name weighted highest. Search results show the principle name, one-line summary, and categories.

**"See Also" Cross-Links.** Every principle page has a "Related Principles" section at the bottom, linking to principles that are conceptually adjacent. These form a knowledge graph. The graph is navigable: from any principle page, the reader is one click from related principles. Over time, the graph becomes the primary navigation -- readers follow conceptual threads, not category hierarchies.

**Learning Paths.** Curated sequences of 4-8 principles for specific goals. Each path has a name, a description, and an ordered list of principle pages. Paths are displayed on the landing page and linked from individual principle pages ("This principle appears in the learning path: Build Your First Compound Component").

Example paths:

| Path | Principles (in order) |
|---|---|
| **Build a Composable Component** | Primitive Composition -> Compound Components -> Slot Patterns -> Semantic Contracts -> Render Delegation |
| **Optimize a Slow React App** | Render Optimization -> Derived State -> External Stores -> Structural Sharing -> CSS Containment |
| **Design Meaningful Animations** | Spring Physics -> Entrance/Exit Pairs -> Choreography -> Stagger Patterns -> Reduced Motion -> Performance Budgets |
| **Stream Data to the UI** | Producer-Consumer -> Backpressure -> Streaming Composition -> Stale-While-Revalidate -> Optimistic Updates |
| **Make Interactive Teaching Content** | Cognitive Load -> Progressive Disclosure -> Widget Design -> Annotation over Decoration -> Scrubbing as Pedagogy |

### File Organization

```
content/principles/                        # MDX content for each principle
  compound-components.mdx
  primitive-composition.mdx
  semantic-contracts.mdx
  ...

src/app/principles/
  page.tsx                                 # Landing page
  [slug]/page.tsx                          # Individual principle page
  category/[category]/page.tsx             # Category listing
  path/[path-slug]/page.tsx                # Learning path

src/components/principles/
  PrincipleCard.tsx                        # Card used in listings
  PrincipleNav.tsx                         # Category sidebar
  RelatedPrinciples.tsx                    # Cross-link section
  PrincipleSearch.tsx                      # Search component
  LearningPathStepper.tsx                  # Path progress UI

src/components/principle-widgets/          # Interactive widgets per principle
  compound-components/
    CompoundVsMonolith.tsx
  primitive-composition/
    DecompositionPlayground.tsx
  ...

src/lib/principles.ts                     # Principle metadata, relationships, paths
```

---

## Page Template Design

Every principle page follows the same structure. This consistency is a feature, not a constraint -- it means the reader always knows where to find what they need.

### Template Structure

```
1. Title + One-Line Summary
2. The Problem (2-3 paragraphs)
3. The Principle (1 clear statement + elaboration)
4. Interactive Widget (the core of the page)
5. Real-World Example (annotated code from an open-source repo)
6. Anti-Patterns (what NOT to do)
7. Related Principles (cross-links)
8. When to Break This Rule
9. Deep-Dive References (links to series posts that explore this principle)
```

### Section Details

**1. Title + One-Line Summary.** The title is the principle name in imperative form when possible ("Compose Primitives, Don't Extend Monoliths") or as a noun phrase when imperative is awkward ("Structural Sharing"). The summary is one sentence that a senior developer could read and say "ah, I know what that is."

**2. The Problem.** What goes wrong without this principle? Not abstract -- concrete. Show the code that smells, the component that's 400 lines, the re-render waterfall, the animation that janks. The problem section should make the reader uncomfortable if they recognize their own code.

**3. The Principle.** A single bolded statement, like a design commandment. Then 2-3 paragraphs of elaboration: why this works, what theory supports it (cite: Gestalt, cognitive load theory, SOLID, whatever is honest), and where the boundary is (this principle applies to X but not Y).

**4. Interactive Widget.** The heart of the page. Every principle has a bespoke widget that lets the reader manipulate the principle. Not a diagram of the principle -- a living instance of it. The widget should be playable in under 10 seconds (no tutorials, no setup) and should produce an "aha" moment in under 30 seconds.

Widget design constraints (consistent across all principle pages):
- Respects `usePrefersReducedMotion()` -- reduced motion fallback shows final states with step-through controls
- All animations use `SPRING`, `TRANSITION`, `LOOP`, `STAGGER` from `src/lib/motion.ts`
- Color is never the sole differentiator -- shapes, labels, and position supplement color
- Touch targets are at least 44x44px
- Keyboard navigable: Tab to focus, Enter/Space to activate, Arrow keys for directional controls
- Widget is wrapped in an `IntersectionObserver` guard -- don't animate until visible
- Lazy-loaded via dynamic import

**5. Real-World Example.** Annotated code from a real open-source repo (with permalink). Not pseudocode. Not our code. The reader sees the principle in production use. The code block uses `CodeAnnotator` to highlight the principle in action. ~20-40 lines, not 200.

**6. Anti-Patterns.** 2-3 common violations of the principle, each with:
- A name ("The God Component," "The Premature Abstraction")
- A code snippet showing the violation
- A one-sentence explanation of why it violates the principle

**7. Related Principles.** 3-5 links to related principle pages, each with a one-sentence explanation of the relationship: "Compound Components is the React-specific instantiation of Primitive Composition." "Choreography is how you sequence Entrance/Exit Pairs."

**8. When to Break This Rule.** Every principle has exceptions. Name them honestly. "Primitive Composition adds indirection. For a one-off component used in a single place, a monolith is simpler and that's fine." This section builds trust -- dogmatic principle pages feel like propaganda.

**9. Deep-Dive References.** Links to the blog's deep-dive series posts where this principle appears in the context of a specific library or tool. "See this principle applied in: Plugin Architectures Post 3 (ESLint's visitor pattern)" or "From Bespoke to Semantic, Part 2 (compound component extraction)."

### Frontmatter Schema

```yaml
---
title: "Compound Components"
slug: compound-components
summary: "Split a monolithic component into composable pieces that share implicit state through context, giving consumers control over rendering and layout."
categories:
  - component-design
tags:
  - react
  - composition
  - api-design
relatedPrinciples:
  - primitive-composition
  - render-delegation
  - slot-patterns
  - semantic-contracts
learningPaths:
  - build-a-composable-component
deepDiveRefs:
  - series: from-bespoke-to-semantic
    part: 2
    label: "Compound component extraction from the FlowDiagram monolith"
---
```

---

## Example Principle Pages

### Principle 1: Compound Components

**Summary:** Split a monolithic component into composable pieces that share implicit state through context, giving consumers control over rendering and layout.

#### The Problem

A `<Select>` component that accepts `options`, `value`, `onChange`, `renderOption`, `renderTrigger`, `placeholder`, `disabled`, `searchable`, `maxHeight`, `virtualized`, `groupBy`, `sortFn`, `emptyMessage`, `loadingMessage`... The prop list grows until the component is a configuration language, not a component. Every new feature is a new prop. Every new prop is a new conditional branch in the render function. The component becomes a ball of mud that nobody wants to touch.

The deeper problem: the consumer has no control over layout. Want the options above the trigger instead of below? Add a `placement` prop. Want a divider between groups? Add a `showDividers` prop. Want a footer with a "Create new" button? Add a `footer` prop. Each is reasonable in isolation. Together they encode a parallel layout language inside the component's props.

#### The Principle

**A component should be split into composable sub-components when its prop list starts encoding layout decisions or rendering variations.**

The compound component pattern replaces configuration props with composition. Instead of `<Select options={...} renderOption={...} footer={...}>`, you write:

```tsx
<Select value={value} onValueChange={setValue}>
  <Select.Trigger>
    <Select.Value placeholder="Choose..." />
  </Select.Trigger>
  <Select.Content>
    <Select.Group>
      <Select.Label>Fruits</Select.Label>
      <Select.Item value="apple">Apple</Select.Item>
      <Select.Item value="banana">Banana</Select.Item>
    </Select.Group>
    <Select.Separator />
    <Select.Footer>
      <button>Create new...</button>
    </Select.Footer>
  </Select.Content>
</Select>
```

The sub-components share state through context (the selected value, the open/closed state, keyboard navigation position). The consumer controls layout through composition (put the Footer wherever you want, or omit it entirely). New features don't require new props on the root -- they require new sub-components, which can be composed independently.

The theory: this is inversion of control applied to React components. The library doesn't render FOR you; it gives you building blocks that handle the hard parts (state, accessibility, keyboard interactions) and lets you control the easy parts (layout, styling, additional content).

#### Interactive Widget: Compound vs. Monolith Comparator

**Visual description.** Two panels side by side. Left panel: "Monolithic" -- a code editor showing a `<Select>` with a long prop list. Above the code, the rendered result. Right panel: "Compound" -- a code editor showing the compound component version. Above it, the same rendered result.

Between the two panels: a "Feature Request" queue. Small cards labeled with common feature requests: "Add search," "Add footer," "Add grouped options," "Add custom option rendering," "Add keyboard navigation." The reader drags feature cards onto either panel.

**Animation spec.**

- When a feature card is dragged to the Monolithic panel, a new prop appears in the code with a `SPRING.snappy` entrance. The prop list visibly grows. A complexity counter above the code increments. The code block's scroll height increases. If the code exceeds 30 lines, a "scroll needed" indicator appears.
- When the same feature card is dragged to the Compound panel, a new sub-component appears in the JSX tree with `SPRING.snappy`. The nesting depth may increase by one level, but the total line count grows less. The complexity counter increments less.
- After 5 features are added to both panels, a "Prop Count" badge on the monolithic side shows ~15 props. The compound side shows ~5 props on the root + 8 sub-components. A "lines of consumer code" comparison bar chart appears below both panels -- the compound version is longer in lines but each line is simpler (lower cyclomatic complexity, shown via a color-intensity heatmap on each line).
- A "Rearrange Layout" button becomes active after features are added. Clicking it on the compound side lets the reader drag sub-components to reorder them (Footer above Content, Label inside Item). The rendered preview updates live. Clicking it on the monolithic side shows a disabled state with a tooltip: "Layout is controlled by the component, not the consumer."

**Interaction model.** Drag feature cards to either panel. Click "Rearrange Layout" to reorder compound sub-components. A "Reset" button clears all features. A "Show Context" toggle on the compound panel reveals the internal context provider and how sub-components consume shared state.

**What it teaches.** The prop explosion problem is not about the number of props -- it's about what the props encode. Configuration props (values, callbacks) are fine. Rendering props (how to display things) and layout props (where to put things) are the smell. Compound components move rendering and layout from props to composition.

**Why static text fails.** The comparison is quantitative (prop count, line count, complexity) and experiential (try to rearrange the monolith). Static before/after code blocks show the structure but not the growth trajectory or the layout inflexibility.

**Component API (rough).**
```tsx
<CompoundVsMonolith
  features={[
    { id: "search", label: "Add search", monolithicProp: "searchable", compoundComponent: "Select.Search" },
    { id: "footer", label: "Add footer", monolithicProp: "footer: ReactNode", compoundComponent: "Select.Footer" },
    { id: "groups", label: "Grouped options", monolithicProp: "groupBy: (item) => string", compoundComponent: "Select.Group + Select.Label" },
    { id: "custom-render", label: "Custom option rendering", monolithicProp: "renderOption: (item) => ReactNode", compoundComponent: "Select.Item children" },
    { id: "keyboard", label: "Keyboard navigation", monolithicProp: "keyboard: boolean", compoundComponent: "(built into Select.Content)" },
  ]}
  rearrangeable={true}
/>
```

#### Real-World Example

Radix UI's `Select` component (https://github.com/radix-ui/primitives). Annotated excerpt from `packages/react/select/src/Select.tsx` showing:
- The `SelectProvider` context that shares `value`, `onValueChange`, `open`, `onOpenChange`
- How `SelectTrigger` reads context to display the selected value
- How `SelectItem` reads context to determine its selected state and calls `onValueChange` on click
- ~30 lines, annotated with `CodeAnnotator`

#### Anti-Patterns

1. **The Render Prop Graveyard.** `<Select renderTrigger={...} renderOption={...} renderGroup={...} renderEmpty={...}>` -- every visual customization point is a render prop. This is compound components without the composition: the consumer still can't control layout, they can only replace specific render slots.

2. **The Premature Split.** Splitting a 40-line component into 8 sub-components when it's used in exactly one place with no variations. Compound components solve the *variability* problem. If there's no variability, the indirection is pure cost.

3. **The Context Leak.** Sub-components that work outside their parent context because the context has a default value. `<Select.Item>` rendered without a `<Select>` parent silently renders as a div that does nothing. The compound contract should enforce co-location -- throw in development if context is missing.

#### Related Principles

- **Primitive Composition** -- Compound components are one instantiation of the broader "compose small pieces" principle. Primitive Composition is the general principle; Compound Components is the React pattern.
- **Render Delegation** -- When compound sub-components use `asChild` or render props to let the consumer control the underlying element.
- **Slot Patterns** -- Named slots (header, footer, sidebar) are a simpler version of compound components for layout-driven composition.
- **Semantic Contracts** -- The FlowDiagram's semantic dimensions (thesis, hierarchy, narrative) are compound components applied to data visualization: the consumer declares intent, the component handles rendering.

#### When to Break This Rule

- **One-off components with no variation.** A dashboard chart that's used exactly once, with exactly one layout, doesn't benefit from decomposition. The monolith is simpler.
- **Performance-critical components where context overhead matters.** Each context read is a potential re-render boundary. For components rendered thousands of times (virtualized list items), the context lookup overhead may matter. Profile first.
- **When the compound API is more complex than the prop API.** If your component has 3 features and the compound version requires 6 sub-components with specific nesting rules, the cure is worse than the disease. Compound components reduce complexity only when the feature count is high enough that prop-based configuration becomes unwieldy.

#### Deep-Dive References

- From Bespoke to Semantic, Part 2: "Compound component extraction from the FlowDiagram monolith" -- the specific refactoring journey where `<FlowDiagram>` was split into `FlowDiagram.Node`, `FlowDiagram.Edge`, `FlowDiagram.Group`, etc.

#### Critical Questions

- **Is the widget fair to the monolithic pattern?** The drag-to-add-features interaction is designed to make the monolith look bad. Make sure the monolith's code is clean and well-organized -- the problem is architectural, not cosmetic. A well-written monolith still has the prop explosion problem.
- **Should the widget use real Radix components or simplified mocks?** Simplified mocks -- the point is the pattern, not Radix's specific API. The real-world example section handles the Radix connection.
- **Does the "Rearrange Layout" interaction feel forced?** It must feel like a natural thing the reader would try, not a guided demo. Maybe instead of a button, the sub-components are always draggable, with a subtle drag handle icon.

---

### Principle 2: Primitive Composition

**Summary:** Build complex components by composing small, single-responsibility primitives rather than extending a monolithic base. Each primitive does one thing well and knows nothing about the others.

#### The Problem

A `<FlowDiagram>` component that handles node rendering, edge routing, group boundaries, text measurement, layout calculation, animation, selection state, hover state, keyboard navigation, accessibility, and responsive sizing. The component is 600 lines. Every bug fix risks breaking something else because all concerns share scope. Testing requires mounting the entire component even to verify that edge routing works correctly.

This is the FlowDiagram's actual history on this blog. The first version was a monolith. It worked. Then we needed different edge routing for a new article. Then we needed groups for an architecture map. Then we needed animation for an execution flow. Each feature was added to the same component. By the fourth article, the component was untouchable -- every change was a regression risk.

#### The Principle

**Decompose a complex component into a stack of single-responsibility layers: types -> geometry -> hooks -> primitives -> composed component.**

Each layer depends only on the layer below it:

- **Types** (`types.ts`): Data shapes, no logic. `FlowNode`, `FlowEdge`, `FlowGroup`. The vocabulary.
- **Geometry** (`geometry.ts`): Pure functions that compute positions, paths, bounding boxes. No React, no state, no side effects. Takes types, returns numbers.
- **Hooks** (`use-flow-diagram.ts`): React hooks that manage interaction state (selection, hover, keyboard focus) and resolve raw data + interaction state into resolved types (node variants, edge variants, opacities).
- **Primitives** (`primitives.tsx`): Small React components that render one thing: a node shape, an edge path, a group boundary, a label. Each receives resolved data and renders it. No state management, no interaction handling.
- **Composed component** (`FlowDiagram.tsx`): The public API. Wires hooks to primitives. Provides defaults. Handles layout. This is what the consumer imports.

The key insight: each layer is independently testable, independently replaceable, and independently understandable. You can read `geometry.ts` without knowing React. You can test `primitives.tsx` without mock data. You can swap the hook implementation without touching rendering.

#### Interactive Widget: The Layered Architecture Exploder

**Visual description.** A vertical stack of five layers, rendered as horizontal slabs. The top slab is the composed `<FlowDiagram>` component -- it shows a small working diagram (3 nodes, 2 edges). Below it, four more slabs representing the internal layers: Primitives, Hooks, Geometry, Types. Each slab shows a representative code snippet from that layer.

**Animation spec.**

- **Explode view.** A "Show Layers" toggle. When activated, the stack separates with a smooth spring animation (`SPRING.gentle`), each slab moving downward to reveal the layer beneath it. The composed component at the top disassembles: nodes detach and float down to the Primitives layer, geometry lines float down to the Geometry layer, the selection highlight floats down to the Hooks layer, and the type definitions float down to the Types layer. Each floating element follows a curved bezier path (quadratic, eased with `TRANSITION.enterCard`).
- **Dependency arrows.** In exploded view, dashed arrows draw between layers showing the dependency direction: Types <- Geometry <- Hooks <- Primitives <- Composed. Each arrow draws with a `strokeDashoffset` animation. Arrows only point downward -- no layer depends on a layer above it.
- **Layer isolation.** Click any layer to isolate it. The clicked layer scales up to fill the width; other layers collapse to thin bars above and below. The isolated layer shows its full code with `CodeAnnotator` highlighting. A "Test in isolation" badge appears, showing that this layer can be tested without mounting the full component.
- **Swap experiment.** The Geometry layer has two implementations: "straight edges" and "orthogonal edges." A toggle switches between them. The composed diagram at the top updates live -- the edges change routing without any change to the other layers. This demonstrates the substitution principle: layers are swappable because their contracts (types) are stable.

**Interaction model.** Toggle explode/collapse. Click layers to isolate. Swap geometry implementations. A "Dependency Count" indicator shows how many imports each layer has -- Types has 0, each subsequent layer has 1 (the layer below it).

**What it teaches.** Decomposition is not about splitting files. It's about organizing dependencies so that each layer has a narrow, stable interface with the layer below it. The swap experiment is the proof: if you can swap one layer without touching the others, the decomposition is real. If you can't, you have a monolith split across files.

**Why static text fails.** The dependency direction and the substitution experiment are the insights. Static diagrams can show layers and arrows, but the swap -- watching the diagram change when only the geometry layer changes -- is the visceral proof. The reader needs to see the other layers remain untouched.

**Component API (rough).**
```tsx
<LayeredArchitectureExploder
  layers={[
    { id: "types", label: "Types", code: typesCode, testable: true },
    { id: "geometry", label: "Geometry", code: geometryCode, testable: true,
      implementations: [
        { id: "straight", label: "Straight Edges", code: straightCode },
        { id: "orthogonal", label: "Orthogonal Edges", code: orthogonalCode },
      ]
    },
    { id: "hooks", label: "Hooks", code: hooksCode, testable: true },
    { id: "primitives", label: "Primitives", code: primitivesCode, testable: true },
    { id: "composed", label: "FlowDiagram", code: composedCode, testable: true },
  ]}
  diagram={smallFlowDiagramDef}
/>
```

#### Real-World Example

The FlowDiagram system in this codebase: `src/mdx/shared/flow-diagram/`. Annotated excerpt showing the layer boundary between `geometry.ts` (pure function that computes an edge path) and `primitives.tsx` (React component that renders the path). The geometry function takes `{ from: Point, to: Point, route: EdgeRoute }` and returns an SVG path string. The primitive takes a resolved edge and renders `<path d={edge.path} />`. Neither knows about the other's internals.

#### Anti-Patterns

1. **The File Split Monolith.** Five files that all import each other circularly. The layers exist in the file tree but not in the dependency graph. If `types.ts` imports from `hooks.ts`, the layering is fiction.

2. **The Leaky Primitive.** A primitive component that reaches up into hook state: `const { selectedId } = useFlowDiagram()` inside `NodePrimitive`. Now the primitive can't be tested without the hook provider. The hook should resolve state and pass it as props.

3. **The Premature Layer.** Adding a geometry layer when you have 3 nodes with hardcoded positions. Layers have cost (indirection, files to navigate, interfaces to maintain). Add them when the complexity justifies them, not preemptively.

#### Related Principles

- **Compound Components** -- The React-specific composition pattern that often uses primitives internally.
- **Layered Architecture** -- The general architectural principle; Primitive Composition is the component-level instantiation.
- **Separation of Concerns** -- The underlying motivation: each layer encapsulates one concern.
- **Semantic Contracts** -- The interface between layers is a semantic contract: types define what's expressible, not how it's rendered.

#### When to Break This Rule

- **Prototyping.** When you're exploring what a component should do, a monolith is faster. Decompose after the shape stabilizes.
- **Truly simple components.** A `<Badge>` component that renders a styled span doesn't need layers. The complexity threshold for decomposition is roughly "when you can't hold the whole component in your head."
- **When the primitive boundaries are wrong.** Wrong decomposition is worse than no decomposition. If you split by technical concern (state vs. rendering) when the real axis of change is by feature (node behavior vs. edge behavior), the layers will fight every feature addition.

#### Critical Questions

- **Does the "swap geometry" experiment actually work with the real FlowDiagram code?** It should, because the geometry layer is pure functions. Verify that the actual `geometry.ts` has no React dependencies.
- **Is five layers the right number?** It's what the FlowDiagram evolved into. But the principle should emphasize that the number of layers depends on the complexity. 2-3 layers is fine for simpler components.

---

### Principle 3: Semantic Contracts

**Summary:** Components should accept declarations of intent ("this node is the protagonist") rather than instructions for rendering ("make this node 120px wide with a blue border"). The component translates intent into visual treatment; the consumer never specifies pixels.

#### The Problem

A diagram definition that looks like this:

```ts
{ id: "session", x: 200, y: 100, w: 120, h: 60, fill: "#3b82f6",
  fontSize: 14, fontWeight: 600, borderRadius: 8, borderWidth: 2,
  borderColor: "#2563eb", label: "Session" }
```

The consumer is speaking CSS. They're telling the component HOW to render, not WHAT to render. If the blog's design tokens change, every diagram definition needs updating. If the component wants to add a hover effect, it has to override consumer-specified styles. If a new theme is introduced, every `fill: "#3b82f6"` is wrong.

This is the syntax vs. semantics distinction applied to component APIs. A syntactic API exposes the implementation (pixels, colors, coordinates). A semantic API exposes the meaning (role, importance, relationship). The implementation can change without breaking the consumer's code because the consumer never specified the implementation.

#### The Principle

**Component props should describe WHAT something is, not HOW it looks. The component owns the mapping from semantics to visuals.**

The FlowDiagram system's semantic API:

```ts
{ id: "session", role: "protagonist", label: "Session",
  brief: "Manages conversation state and tool permissions",
  x: 200, y: 100 }
```

The component sees `role: "protagonist"` and derives: larger node, accent border, stronger interactive signals, higher z-index, entry point for keyboard navigation. The consumer said "this is the protagonist." The component decided what that means visually.

The five semantic dimensions in the FlowDiagram system (from `COMPOSING.md`):

1. **Intent** (thesis + tension): why this diagram exists
2. **Hierarchy** (protagonist / supporting / context): what matters more
3. **Relationships** (verb + description on edges): what the connections mean
4. **Narrative** (arc: ordered sequence of node IDs): what order to read in
5. **Annotations** (positioned text): what to notice

Each dimension addresses a specific failure mode of syntactic APIs. Without intent, the reader doesn't know why the diagram exists. Without hierarchy, all nodes compete for attention equally. Without narrative, there's no reading order.

#### Interactive Widget: Syntax to Semantics Transformer

**Visual description.** A single diagram rendered in the center. Below it, two tabs: "Syntactic" and "Semantic." Each tab shows the diagram definition code that produces the diagram above.

**Animation spec.**

- **Syntactic tab active.** The diagram renders with all nodes at equal size, uniform colors, no emphasis. The code below shows raw pixel values (`w: 120`, `fill: "#3b82f6"`). The diagram feels flat -- technically correct, visually lifeless. All nodes have equal visual weight.
- **Semantic tab active.** When the reader switches to the Semantic tab, the diagram transforms: the protagonist node scales up (`SPRING.gentle`, scale from 1.0 to 1.2), its border shifts to the accent color, supporting nodes maintain their size, context nodes shrink slightly and desaturate. Edges gain labels. A thesis line appears above the diagram. The arc (reading order) is indicated by subtle numbered badges on nodes. The code below switches to show semantic declarations (`role: "protagonist"`, `thesis: "..."`, `arc: [...]`).
- **The transformation.** The transition between tabs is not a cut -- it's an animation. Each syntactic property morphs into its semantic equivalent. `w: 120` fades out as `role: "protagonist"` fades in. The node's width animates from 120 to the protagonist width. The reader sees the mapping from semantics to pixels happening in real time.
- **Editing semantics.** On the Semantic tab, the reader can change a node's role by clicking it and selecting from a dropdown (protagonist / supporting / context). The diagram updates live: the node's size, color treatment, and border change smoothly (`SPRING.snappy`). The code panel below updates simultaneously.

**Interaction model.** Toggle between Syntactic and Semantic tabs. Click nodes to change roles (Semantic tab only). A "Show Mapping" toggle reveals the internal mapping table: `protagonist -> { w: 140, h: 70, accentBorder: true, ... }`, `supporting -> { w: 100, h: 50, ... }`. This table is the component's internal logic that the semantic API hides from the consumer.

**What it teaches.** Semantic APIs are not about less code (the semantic version may have more props). They're about the RIGHT level of abstraction. The consumer says "this is important" and the component decides what "important" looks like. When the design system changes, only the mapping table changes -- not every diagram definition.

**Why static text fails.** The transformation animation is the insight. Watching `w: 120` become `role: "protagonist"` while the diagram smoothly adjusts makes the abstraction level shift tangible. Static before/after code blocks can show both versions, but the morphing animation communicates that they're the SAME diagram at different abstraction levels.

**Component API (rough).**
```tsx
<SyntaxToSemanticsTransformer
  diagram={flowDiagramDef}
  syntacticOverrides={{
    session: { w: 120, h: 60, fill: "#3b82f6", fontSize: 14, fontWeight: 600 },
    // ...
  }}
  semanticDef={{
    session: { role: "protagonist", brief: "Manages conversation state" },
    // ...
  }}
  roleMapping={{
    protagonist: { w: 140, h: 70, accentBorder: true },
    supporting: { w: 100, h: 50, accentBorder: false },
    context: { w: 80, h: 40, accentBorder: false, desaturate: true },
  }}
/>
```

#### Real-World Example

Radix UI Colors (https://github.com/radix-ui/colors). The scale system: instead of `color: "#3b82f6"`, you use `color: var(--blue-9)`. The number 9 is semantic -- it means "solid background" in the Radix scale system. Number 11 means "low-contrast text." The consumer declares intent (solid background), the system provides the right value for the current theme (light or dark). The semantic contract is the 12-step scale; the implementation is the hex values that change between themes.

#### Anti-Patterns

1. **The CSS Proxy.** A component whose props mirror CSS properties: `<Box width={120} height={60} backgroundColor="#3b82f6" borderRadius={8}>`. This is CSS with extra steps. Use CSS directly, or use semantic props that abstract away the CSS.

2. **The Incomplete Semantic.** A component with `role: "primary" | "secondary"` but also `fontSize: number`. The semantic layer has a hole -- the consumer must drop down to pixels for typography. Either the semantic system covers typography or it doesn't, but partial coverage is worse than none because the consumer must understand both systems.

3. **The Overly-Abstract Semantic.** `<Node importance={0.7} urgency={0.3} complexity={0.85}>` -- the semantic dimensions are so abstract that no one knows what they mean. Semantic APIs need categories (protagonist/supporting/context), not continuous values, unless the continuous dimension has an obvious physical interpretation (position, opacity).

#### Related Principles

- **Primitive Composition** -- Semantic contracts define the interface between composed layers.
- **Prop API Design** -- Semantic contracts are a specific philosophy of API design: intent over implementation.
- **Design Tokens** -- The mechanism that enables semantic contracts: the component maps semantic values to token values, not hardcoded values.
- **Annotation over Decoration** -- A semantic contract for diagrams: annotate the meaning, don't decorate the visuals.

#### When to Break This Rule

- **Escape hatches.** Even the most semantic API needs a way to say "I know what I want, just do this." A `style` override prop or a `className` prop is the escape hatch. Without it, the semantic system becomes a prison.
- **Low-level primitives.** The SVG `<rect>` element takes `width` and `height` in pixels. That's its job. Not every component needs a semantic layer -- only components where the mapping from intent to visuals is non-trivial and likely to change.

#### Critical Questions

- **Is the FlowDiagram the only good example?** It's the example we know best, but the principle is everywhere: Tailwind's utility naming (semantic class names that map to CSS), Chakra UI's size system (`size="lg"` instead of `fontSize="18px"`), Radix's color scales. Include at least two non-FlowDiagram examples.
- **Does "semantic" just mean "higher abstraction"?** Not exactly. It means the abstraction is aligned with the consumer's domain (teaching, data visualization, form design) rather than the implementation's domain (CSS, SVG, DOM). Make this distinction explicit.

---

### Principle 4: Optimistic Updates

**Summary:** Show the expected result of a user action immediately, then reconcile with the server response. Roll back if the server disagrees. The user should never wait for a network round trip to see the result of their own action.

#### The Problem

The user clicks "Like." Nothing happens for 800ms. Then the heart fills. The user doesn't know if their click registered. They click again. Now they've un-liked. Or they've sent two requests. Or the first request failed silently and the second one succeeded. The 800ms gap between action and feedback creates uncertainty, anxiety, and bugs.

This is the fundamental problem: the UI is a projection of server state, but the server is 50-500ms away. If the UI waits for the server before updating, every interaction feels sluggish. If the UI updates immediately without the server, the UI might show state that the server will reject.

#### The Principle

**Update the UI immediately with the expected result. Record the pre-update state as a rollback snapshot. Fire the server request in the background. If the server confirms, discard the snapshot. If the server rejects, restore the snapshot.**

The lifecycle:

1. **Action**: User clicks Like. Cache `{ likes: 41 }` as rollback snapshot.
2. **Optimistic update**: Set cache to `{ likes: 42 }`. UI renders 42 immediately.
3. **Server request**: `POST /api/like` fires in background.
4. **Success path**: Server responds `{ likes: 42 }`. Confirm cache. Discard snapshot.
5. **Failure path**: Server responds `429 Too Many Requests`. Restore snapshot `{ likes: 41 }`. UI renders 41. Show error.

The key subtlety: between steps 2 and 4, the UI is showing *speculative* state. The user sees 42, but the server hasn't confirmed it. This speculation is the trade: you gain perceived responsiveness, you accept the risk of a visible rollback.

#### Interactive Widget: The Optimistic Timeline

**Visual description.** A vertical timeline in the center with three tracks: "User sees" (left), "Cache" (center), "Server" (right). A Like button at the top.

**Animation spec.**

- **Step 1**: Reader clicks the Like button. Heart fills immediately (0ms). Left track shows "42" with a green flash. Center track shows "42" with an amber "speculative" badge. Right track shows a spinner with "request in flight." A "rollback snapshot" card appears below the cache track: `{ likes: 41 }`, with a faint dotted line connecting it to the cache. The snapshot has a parachute icon -- it's the safety net.
- **Step 2 (configurable delay)**: A "Server Latency" slider controls how long the request takes (200ms - 3000ms). During this time, the left track still shows 42 (the user is happy), the center track still shows 42 (speculative), and the right track shows the spinner.
- **Step 3a (Success)**: Server responds. Right track shows green checkmark and `{ likes: 42 }`. The "speculative" badge on the center track fades out (`TRANSITION.enterCard`). The rollback snapshot card fades out and drops off screen (`SPRING.gentle`, translateY +20, opacity 0). The cache is now confirmed.
- **Step 3b (Failure)**: Server responds with red X. Right track shows error. The cache track animates: 42 morphs back to 41 (the number visibly decrements with a flip animation). The rollback snapshot card glows (`SPRING.quick`), its value `{ likes: 41 }` visually transfers to the cache track (the snapshot card shrinks as the cache track value updates). The heart unfills. A red toast slides in from the right.
- **The rewind effect**: On failure, the left track ("User sees") plays a subtle VHS-rewind effect: two thin horizontal scanlines sweep down the track, slight desaturation during the rollback. This makes the "time travel" quality of rollback visceral. The rewind is brief (400ms, `TRANSITION.enterCard` timing) and doesn't obstruct readability.

**Interaction model.**

- Click Like to start the sequence.
- Toggle "Server outcome" between Success and Failure before or during the request.
- Drag the "Server Latency" slider to control timing.
- A "Rapid fire" mode: click Like 5 times in 200ms. Watch 5 speculative updates stack. Then fail request 3. The widget shows the cascade: requests 4 and 5, which were optimistic on top of request 3's optimistic state, must also be reconciled. This is the advanced scenario that separates toy implementations from production ones.
- A "Show code" toggle reveals the TanStack Query `useMutation` implementation with `onMutate`, `onError`, `onSuccess`, and `onSettled` callbacks.

**What it teaches.** Optimistic updates are a bet. The bet usually pays off (servers rarely reject valid-looking requests). But the rollback mechanism MUST exist, and it must handle the hard cases (multiple in-flight mutations, dependent cache entries). The rapid-fire scenario is the real test of understanding.

**Why static text fails.** The temporal dimension is everything. The 800ms gap between action and feedback is a felt experience. The rollback is a visible time-reversal. Static code blocks can show the `onMutate` and `onError` handlers, but they can't communicate the EXPERIENCE of seeing a UI optimistically update, wait, and then correct itself.

**Component API (rough).**
```tsx
<OptimisticTimeline
  serverOutcome="success" | "failure"
  serverLatency={800}
  rapidFire={false}
  showCode={false}
  initialValue={41}
/>
```

#### Real-World Example

TanStack Query's `useMutation` with `onMutate` / `onError` / `onSettled`. Annotated excerpt showing the snapshot-and-rollback pattern:

```tsx
const likeMutation = useMutation({
  mutationFn: (postId) => api.likePost(postId),
  onMutate: async (postId) => {
    await queryClient.cancelQueries({ queryKey: ['post', postId] })
    const previous = queryClient.getQueryData(['post', postId])   // snapshot
    queryClient.setQueryData(['post', postId], (old) => ({
      ...old,
      likes: old.likes + 1,                                       // optimistic
    }))
    return { previous }                                            // context for rollback
  },
  onError: (err, postId, context) => {
    queryClient.setQueryData(['post', postId], context.previous)   // rollback
  },
  onSettled: (data, err, postId) => {
    queryClient.invalidateQueries({ queryKey: ['post', postId] }) // reconcile
  },
})
```

#### Anti-Patterns

1. **The Optimistic Lie.** Updating the UI optimistically but not implementing rollback. When the server fails, the UI is permanently wrong until the next page refresh. This is worse than no optimistic update because the user trusts a false state.

2. **The Double Submit.** Optimistically updating on click but not disabling the action during the request. The user clicks again, sees the count increment to 43, and now has two in-flight requests that may conflict.

3. **The Cascade Ignore.** Optimistically updating a list item's "liked" status but not updating the parent list's "total likes" counter. The detail view shows liked; the list view shows un-liked. Optimistic updates must cascade to all derived/dependent cache entries.

#### Related Principles

- **Stale-While-Revalidate** -- The read-side equivalent: show stale data immediately, refresh in background. Optimistic updates are the write-side equivalent.
- **Cache Invalidation** -- What happens after the optimistic update is confirmed: invalidate dependent queries to ensure consistency.
- **Structural Sharing** -- How TanStack Query efficiently applies optimistic patches without causing unnecessary re-renders.

#### When to Break This Rule

- **Destructive actions.** "Delete this account" should NOT be optimistic. The irreversibility demands confirmation, not speculation.
- **Actions where the server may legitimately reject.** If 30% of like attempts fail (rate limiting, permissions), optimistic updates create a jarring experience -- the user sees the heart fill and unfill constantly.
- **Complex derived state.** If liking a post changes the feed ranking, optimistically re-ranking the feed is a rabbit hole. Sometimes waiting 200ms is simpler and more honest.

#### Critical Questions

- **Is the rapid-fire scenario too complex for the widget?** It's the scenario that reveals real understanding, but it might overwhelm readers encountering optimistic updates for the first time. Consider making it a collapsible "Advanced" section.
- **Should the widget use a real API?** No -- simulated delays are more controllable and don't require network access. But note in the text that real optimistic updates face additional challenges (network partitions, server-side validation that the client can't replicate).

---

### Principle 5: Choreography

**Summary:** When multiple elements animate simultaneously, their timing relationships matter more than their individual animations. Choreography is the sequencing, staggering, and synchronization of motion across a group of elements.

#### The Problem

Five cards enter the viewport. All five animate simultaneously with the same `opacity: 0 -> 1, translateY: 20px -> 0` transition. Duration: 300ms. The result: a wall of content that blinks into existence. No rhythm, no direction, no sense of spatial continuity. Each card's animation is individually correct but collectively meaningless.

The same five cards with staggered timing (50ms between each, left to right): now the reader's eye follows a sweep. The direction of the stagger communicates reading order. The rhythm communicates that these cards are a group, not five independent elements. The 50ms stagger costs 200ms of total wall-clock time, but the perceived speed is HIGHER because the reader can start processing the first card immediately instead of waiting for all five to appear.

Choreography is not about making individual animations better. It's about making animations meaningful as an ensemble.

#### The Principle

**Every animation exists in the context of other animations on screen. Design the relationships between animations (sequence, stagger, parallel, causal) before designing the animations themselves.**

Four choreography relationships:

1. **Sequence**: A finishes, then B starts. Use for causal relationships (dialog opens, THEN content loads).
2. **Stagger**: A starts, then B starts 50ms later, then C 50ms after B. Use for groups of similar elements (list items, cards, nav links).
3. **Parallel**: A and B start simultaneously. Use for elements that are conceptually one thing (a card's background and text appear together).
4. **Causal**: A's completion triggers B's start, with B's initial state derived from A's final state (a button press ripple that flows into a page transition). Use for actions and their consequences.

The stagger interval is the most important choreography parameter. Too short (<20ms): looks simultaneous, pointless overhead. Too long (>150ms): each element feels independent, the group identity dissolves. The sweet spot (40-80ms) creates a wave that reads as "these belong together, process them left-to-right."

#### Interactive Widget: The Choreography Mixer

**Visual description.** A row of 6 identical cards at the top. Below the cards: a choreography control panel with four sections.

**Animation spec.**

- **Stagger control.** A slider labeled "Stagger Interval" (0ms to 200ms). At 0ms, all cards enter simultaneously. As the reader drags right, a growing delay between each card's entrance becomes visible. A timing diagram below the slider shows 6 horizontal bars representing each card's animation, offset by the stagger interval. The bars update live as the slider moves.
- **Direction control.** A set of arrow buttons: left-to-right, right-to-left, center-out, edges-in. Changing direction changes which card starts first. The timing diagram updates to show the new order.
- **Easing control.** A dropdown selecting the individual card's easing: `SPRING.snappy`, `SPRING.gentle`, `TRANSITION.enterCard`. Changing this affects each card's individual motion but not the stagger timing.
- **Play/Replay.** A button that resets all cards to their initial state (invisible) and replays the choreographed entrance. The button pulses gently (`LOOP.breathe`) when ready to play.
- **Side-by-side comparison.** A toggle that splits the view into two rows of cards: the top row uses the reader's choreography settings, the bottom row uses "no choreography" (all simultaneous). The "Play" button animates both rows simultaneously. The comparison makes the difference visceral.

**Interaction model.** Drag the stagger slider. Select a direction. Choose an easing. Click Play. See the difference. The timing diagram is the analytical view; the card animation is the experiential view. Both update live.

**What it teaches.** The stagger interval is the single most impactful choreography parameter. Too short and you get a blink. Too long and you get a slide show. The timing diagram makes the relationship visible as data, while the card animation makes it visible as experience.

**Why static text fails.** Timing is fundamentally temporal. You cannot show a 50ms stagger in a static image. You can label it "50ms delay between cards," but the reader won't know what that FEELS like until they see it. The slider makes the parameter space explorable.

**Component API (rough).**
```tsx
<ChoreographyMixer
  itemCount={6}
  staggerInterval={60}
  direction="left-to-right"
  easing={SPRING.snappy}
  showTimingDiagram={true}
  showComparison={false}
/>
```

#### Real-World Example

Framer Motion's `staggerChildren` in `variants` (https://github.com/framer/motion). Annotated excerpt showing the `container` and `item` variant pattern:

```tsx
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: SPRING.snappy },
}

<motion.ul variants={container} initial="hidden" animate="show">
  {items.map(i => <motion.li key={i} variants={item} />)}
</motion.ul>
```

The `staggerChildren: 0.06` is the choreography. The `item` variants are the individual animation. The distinction is explicit in the code.

#### Anti-Patterns

1. **The Simultaneous Slam.** All elements animate with the same timing. No stagger, no sequence. The page goes from empty to full in one visual frame. This is the most common choreography failure.

2. **The Slow Reveal.** Each element takes 500ms and they stagger by 200ms. 6 elements take 1.5 seconds total. The reader has time to get bored between items. Stagger should be a fraction of the individual animation duration, not a multiple of it.

3. **The Directional Lie.** Cards stagger right-to-left in a left-to-right language. The eye is pulled against reading direction, creating cognitive friction. Stagger direction should follow reading order unless there's a specific reason to reverse it (e.g., elements flying in from the right edge of the viewport).

4. **The Orphan Animation.** One element animates differently from its siblings for no semantic reason. The card at index 3 bounces while the others fade. Unless that card IS different (it's the selected item, it's the new addition), mismatched animations break group identity.

#### Related Principles

- **Entrance/Exit Pairs** -- Individual animations that choreography sequences.
- **Stagger Patterns** -- The specific math and direction strategies for stagger effects.
- **Performance Budgets** -- Choreographed animations are more expensive than simultaneous ones (more frames with elements in motion). The budget must account for the stagger.
- **Reduced Motion** -- Choreography should degrade gracefully: in reduced motion mode, elements appear in stagger order but without animation (each appears at its stagger time, but as an instant show rather than a transition).

#### When to Break This Rule

- **Below the animation threshold.** If the individual animation is 150ms or less, adding a 50ms stagger to 3 elements barely registers. The cost of the stagger logic (computing delays, managing variants) exceeds the perceptual benefit.
- **Real-time data.** Elements arriving from a WebSocket at unpredictable intervals should NOT be choreographed. The user expects them when they arrive. Adding artificial stagger to real-time data feels laggy, not polished.
- **Single-element focus.** A modal opening, a toast appearing, a tooltip showing -- these are solo animations. Choreography applies to ensembles of 3+ elements.

#### Critical Questions

- **Is the timing diagram necessary, or does the card animation speak for itself?** The timing diagram bridges the gap between "I can see it" and "I can describe it numerically to another developer." Include it, but make it collapsible.
- **Should the widget include audio?** A subtle tick sound at each stagger interval would reinforce the rhythm. But audio is contentious in web content. Make it optional and off by default if included.

---

### Principle 6: Progressive Disclosure

**Summary:** Reveal information and complexity in layers, starting with the simplest useful view and letting the reader drill down. Don't front-load everything; don't hide the important things.

#### The Problem

A code annotation widget that shows 200 lines of source code with 12 annotations, a control panel with 8 toggles, a side panel with 3 tabs, and an options menu. On first load, the reader sees everything simultaneously. Their eye bounces between the code, the annotations, the controls, and the side panel. Cognitive load maxes out before they've read a single line. They close the tab.

The same widget with progressive disclosure: first load shows the code with ONE annotation highlighted. The reader reads it, clicks "Next," sees the second annotation. After 3 annotations, a "Show all annotations" toggle appears. The control panel starts collapsed, showing one relevant toggle. The side panel appears only when the reader clicks a term they want to explore.

The information is identical. The cognitive load trajectory is opposite: front-loaded vs. gradual.

#### The Principle

**Start with the minimum viable view. Add complexity in response to reader action (clicks, scrolls, time on page), not in response to the content existing.**

Three layers of disclosure:

1. **Immediate**: What the reader sees on load. This must be self-contained -- the reader should gain insight from layer 1 alone, without interacting. A diagram with a thesis, 3-4 nodes, and no controls satisfies layer 1.
2. **On-demand**: What appears when the reader interacts. Click a node to see its description. Expand a panel for controls. Toggle a mode for an alternative view. On-demand content is there for the curious but doesn't compete for attention.
3. **Deep-dive**: What appears when the reader actively searches. Linked principle pages, source code walkthroughs, advanced configuration. This layer exists but is never promoted in the UI -- the reader must navigate to it.

The key insight from instructional design: advance organizers (Ausubel). Layer 1 IS the advance organizer. It gives the reader a scaffold before they encounter detail. Without it, details are unattached facts. With it, details click into a framework.

#### Interactive Widget: The Disclosure Layers Simulator

**Visual description.** A demo widget (a small FlowDiagram with 5 nodes, 4 edges, and a side panel). The widget has three visual states corresponding to the three disclosure layers.

**Animation spec.**

- **Layer 1 (immediate).** On load: the diagram shows all 5 nodes and 4 edges with labels. The thesis is visible above the diagram. No controls, no side panel, no interactivity beyond hover tooltips. The reader can take in the overview without any decisions.
- **Layer 2 transition.** After 3 seconds (or on first click, whichever comes first), a subtle prompt appears below the diagram: "Click any node to explore." The text fades in with `TRANSITION.enterCard`. When the reader clicks a node, the side panel slides in from the right (`SPRING.gentle`, translateX from 100% to 0). The side panel contains the node's description, code references, and links to related nodes. A control bar appears at the top of the diagram with two toggles: "Show groups" and "Show timeline."
- **Layer 3 transition.** When the reader clicks a "Deep dive" link in the side panel, the entire widget smoothly transitions to an expanded view (`layout` animation via framer-motion). The diagram shrinks to a thumbnail in the top-left corner. The main area becomes a code walkthrough with `CodeAnnotator`. A "Back to diagram" button in the top-left returns to Layer 2.

Below the demo widget: a **Disclosure Inspector**. A horizontal bar showing the three layers as segments. The current layer is highlighted. A counter shows: "Layer 1: 4 visible elements. Layer 2: 11 visible elements. Layer 3: 23 visible elements." The reader can drag a slider to manually transition between layers, overriding the interaction-based triggers.

**Interaction model.** Interact with the demo widget naturally (click nodes, toggle controls, click deep-dive links). The Disclosure Inspector below tracks which layer is active and how many elements are visible. The slider lets the reader scrub through layers to see the progression. A "Compare: All Layers Simultaneously" toggle shows what the widget would look like with all 23 elements visible at once -- the cognitive overload state.

**What it teaches.** Progressive disclosure is not hiding content. It's sequencing attention. The comparison toggle is the proof: the all-at-once view has the same content as the layered view, but it's overwhelming. The layer count (4 -> 11 -> 23) makes the cognitive load reduction quantitative.

**Why static text fails.** Progressive disclosure is a temporal and interactive concept. A static screenshot of each layer shows the visual difference but not the EXPERIENCE of information arriving in response to your curiosity rather than all at once.

**Component API (rough).**
```tsx
<DisclosureLayersSimulator
  layers={[
    { id: "immediate", elements: baseElements, controls: [] },
    { id: "on-demand", elements: expandedElements, controls: ["groups", "timeline"] },
    { id: "deep-dive", elements: allElements, controls: ["groups", "timeline", "code-view"] },
  ]}
  diagram={smallDiagramDef}
  showInspector={true}
  autoAdvanceDelay={3000}
/>
```

#### Real-World Example

GitHub's file diff view. Layer 1: collapsed file list showing files changed, additions, deletions. Layer 2: click a file to expand its diff. Layer 3: click "View file" to see the full file in context. Each layer adds information without removing the previous layer's context. The collapsed file list remains visible as a navigation aid even when a diff is expanded.

#### Anti-Patterns

1. **The Wizard Trap.** Forcing the reader through Layer 1 before allowing Layer 2. If the reader already knows what they want (they clicked a deep link to a specific node), don't make them sit through the overview first. Progressive disclosure guides; it doesn't gate.

2. **The Hidden Feature.** A toggle buried three clicks deep that controls a critical feature. Progressive disclosure defers DETAIL, not importance. If something is important, it should be in Layer 1 or prominently signposted in Layer 2.

3. **The Premature Collapse.** Collapsing everything by default so the page loads empty. Layer 1 should be rich enough to be useful. A page with 6 collapsed sections and no visible content is progressive disclosure taken to absurdity.

#### Related Principles

- **Cognitive Load** -- The underlying theory. Progressive disclosure manages cognitive load by controlling information rate.
- **Widget Design** -- How to design the interactive widget that sits at the center of each principle page. Widget design is progressive disclosure applied to teaching interactives.
- **Annotation over Decoration** -- Annotations are Layer 2 content: they appear on interaction, they explain, they don't compete with the diagram for initial attention.

#### When to Break This Rule

- **Reference documentation.** The user who navigates to an API reference page wants to see all methods immediately. They're not exploring -- they're searching. Progressive disclosure in reference docs wastes time.
- **Dashboards with known layouts.** A user who visits their dashboard every day wants the same information in the same place. Progressively disclosing panels they expect to see creates friction, not clarity.
- **When Layer 1 is too thin.** If collapsing to an "overview" removes so much context that the reader can't orient, the overview is too aggressive. Layer 1 must be self-sufficient.

---

### Principle 7: Reduced Motion

**Summary:** Every animation must have a meaningful fallback for users who prefer reduced motion. Reduced motion is not "no animation" -- it's a different animation strategy that conveys the same information through non-motion channels.

#### The Problem

A developer adds `prefers-reduced-motion: reduce` support by wrapping all animations in `if (!prefersReducedMotion)`. The result: users with reduced motion enabled see a static page. Cards that animated in now simply exist. Transitions that communicated state changes now silently swap. The page works, but it's lost its ability to communicate through motion.

The failure is treating reduced motion as a binary: either the full animation plays, or nothing happens. But motion serves a purpose -- it communicates relationships, state changes, spatial continuity. Removing motion removes the communication. The fix is not "remove motion" but "communicate the same thing through a non-motion channel."

#### The Principle

**Every animation communicates something. When motion is reduced, that communication must survive through alternative channels: opacity changes, border shifts, color transitions, or instant state jumps with clear before/after differentiation.**

The reduced-motion translation table:

| Full Motion | What It Communicates | Reduced Motion Alternative |
|---|---|---|
| Slide in from right | "This is new, it came from outside" | Instant appear with a fade (opacity 0 -> 1, `DURATION.instant`) |
| Scale up from 0 | "This was created just now" | Instant appear with a brief accent border flash |
| Staggered entrance | "These are a group, read left-to-right" | All appear simultaneously, numbered badges indicate order |
| Spring bounce on tap | "Your action registered" | Border color flash (`DURATION.fast`) |
| Continuous rotation | "Processing / loading" | Static spinner icon + "Loading..." text |
| Parallax scroll | "Depth, layering" | Static layered composition (no scroll response) |

The reduced-motion experience is not lesser. It is different. The numbered badges on a staggered list convey reading order just as well as the stagger -- they convey it through a different channel (visual labeling vs. temporal sequence).

#### Interactive Widget: The Motion Translation Lab

**Visual description.** A split view. Left panel: "Full Motion" -- shows a set of UI elements (card entrance, button press, loading spinner, list stagger, page transition) with full animations. Right panel: "Reduced Motion" -- shows the same elements with reduced-motion alternatives.

**Animation spec.**

- A row of 5 demonstration buttons at the top: "Card Entrance," "Button Press," "Loading," "List Stagger," "Page Transition."
- Click any button to trigger the corresponding animation in BOTH panels simultaneously.
- Left panel plays the full animation (e.g., card slides in from right with `SPRING.snappy`).
- Right panel plays the reduced-motion alternative (e.g., card appears instantly with opacity fade over `DURATION.instant`).
- Below each panel: a small annotation explaining what each version communicates. "Full: spatial origin (from right) + arrival." "Reduced: arrival (opacity change), no spatial information -- compensated by position context (card is in the right column, implying rightward source)."

**Interaction model.** Click demonstration buttons to trigger animations. A "Translation Table" toggle below reveals the mapping table from the prose section, with each row highlighted when its demonstration is playing. A "Your System Setting" badge shows the reader's actual `prefers-reduced-motion` media query value, with a note: "This widget overrides your system setting for demonstration purposes."

**What it teaches.** Reduced motion is a design challenge, not a feature flag. The side-by-side comparison forces the developer to think about WHAT each animation communicates and HOW that communication survives without motion.

**Why static text fails.** The comparison is temporal. The reader needs to see the full animation and the reduced alternative SIDE BY SIDE, playing SIMULTANEOUSLY, to evaluate whether the alternative successfully communicates the same meaning.

**Component API (rough).**
```tsx
<MotionTranslationLab
  demonstrations={[
    {
      id: "card-entrance",
      label: "Card Entrance",
      fullMotion: { initial: { x: 100, opacity: 0 }, animate: { x: 0, opacity: 1 }, transition: SPRING.snappy },
      reducedMotion: { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: DURATION.instant } },
      communicates: "spatial origin + arrival",
      alternative: "arrival only (opacity change)",
    },
    // ...
  ]}
  showTranslationTable={false}
/>
```

#### Real-World Example

macOS system animations. With "Reduce motion" enabled, window minimization changes from the genie effect (window folds into the dock) to a cross-fade (window fades out, dock icon fades in). The genie effect communicates WHERE the window went (into its dock icon). The cross-fade communicates THAT the window is now in the dock (icon highlights) but not the spatial journey. The spatial information is considered non-essential -- the user can see the dock icon is highlighted.

#### Anti-Patterns

1. **The Kill Switch.** `if (prefersReducedMotion) return null` on all animation code. The component loses its ability to communicate state changes. Loading states, transitions, feedback -- all gone.

2. **The Ignored Query.** Not checking `prefers-reduced-motion` at all. Vestibular disorder, motion sensitivity, cognitive load -- the user asked for reduced motion for a reason. Ignoring the preference is an accessibility failure.

3. **The Slow Fade.** Replacing a 300ms slide animation with a 300ms fade animation and calling it "reduced motion." The issue is often not the TYPE of motion but the AMOUNT. A 300ms fade is still a lot of motion. Use `DURATION.instant` (150ms) or shorter for reduced-motion alternatives.

#### Related Principles

- **Choreography** -- Reduced motion must degrade choreography gracefully. Stagger timing is motion; the stagger should collapse to simultaneous with visual group indicators.
- **Performance Budgets** -- Reduced motion users often have reduced motion enabled because of hardware limitations (low-end devices, battery saving). Reduced motion alternatives should also be cheaper to compute.
- **Entrance/Exit Pairs** -- Each entrance/exit pair needs a reduced-motion variant defined alongside the full variant.

#### When to Break This Rule

- **Never.** This is one of the few principles with no legitimate exceptions. If a user has requested reduced motion, respect it. The alternative may be simpler, cheaper, or less visually rich, but it must exist.

---

### Principle 8: Derived State

**Summary:** If a value can be computed from other state, compute it. Don't store it. Stored derived state is a synchronization bug waiting to happen.

#### The Problem

```tsx
const [items, setItems] = useState(initialItems)
const [filteredItems, setFilteredItems] = useState(initialItems)
const [totalCount, setTotalCount] = useState(initialItems.length)
const [isEmpty, setIsEmpty] = useState(initialItems.length === 0)
```

Four pieces of state, but only one is independent: `items`. The other three are derivable: `filteredItems = items.filter(predicate)`, `totalCount = items.length`, `isEmpty = items.length === 0`. Every `setItems` call must also call `setFilteredItems`, `setTotalCount`, and `setIsEmpty`. Forget one and the UI is inconsistent. Add a fifth derived value and every callsite needs updating.

This is the synchronization problem: when state is derived but stored, every mutation must update both the source and all derivatives. The mutation surface grows linearly with the number of derivatives. Each derivative is a potential desync bug.

#### The Principle

**Compute derived values at render time (or in selectors/memos), never in event handlers. The only state that should be stored is state that cannot be computed from other state.**

```tsx
const [items, setItems] = useState(initialItems)
const filteredItems = useMemo(() => items.filter(predicate), [items, predicate])
const totalCount = items.length       // no memo needed for cheap computations
const isEmpty = items.length === 0    // no memo needed
```

One piece of state. Three computed values. Zero synchronization risk. The `setItems` call is the only mutation. `filteredItems`, `totalCount`, and `isEmpty` are always consistent because they're always recomputed from `items`.

The theory: this is the single source of truth principle applied to component state. In database design, normalization eliminates redundancy. In component design, derivation eliminates redundancy. Stored derived state is a denormalized cache, and caches need invalidation -- which is the hardest problem in computer science.

#### Interactive Widget: The State Dependency Graph

**Visual description.** A node graph showing state values and their dependencies. Independent state (items, filter predicate) are rendered as solid boxes. Derived values (filteredItems, totalCount, isEmpty) are rendered as dashed boxes. Arrows point from source to derived. Below the graph: a mutation trigger panel.

**Animation spec.**

- **The stored-derived view.** Toggle "Stored Derived: ON." All boxes are solid (all stored). When the reader clicks "Add item," ALL boxes flash with update pulses (`SPRING.quick`) -- items, filteredItems, totalCount, isEmpty all update. Four state updates for one action. A "Mutation Count" badge shows 4.
- **The computed-derived view.** Toggle "Stored Derived: OFF." Derived boxes become dashed. When the reader clicks "Add item," only the `items` box flashes. Then, with a brief stagger (`STAGGER.fast`), the derived boxes update via flowing arrows -- the update visually propagates from source to derived. A "Mutation Count" badge shows 1. The derived updates are visually distinct (lighter flash, thinner border animation) to show they're automatic, not manual.
- **The desync demonstration.** In "Stored Derived: ON" mode, a "Forget to update totalCount" toggle. When enabled, clicking "Add item" updates items and filteredItems but NOT totalCount. The totalCount box turns amber (`SPRING.quick` border flash) and a "DESYNC" badge appears. The graph shows items.length = 4 but totalCount = 3. This is the bug that derived state prevents.

**Interaction model.** Toggle between stored and computed derived state. Click "Add item" / "Remove item" / "Change filter" to trigger mutations. Watch the update propagation. Enable "Forget to update" toggles to see desync bugs. A "Lines of mutation code" counter shows how much code each mutation requires: stored-derived requires 4 lines (one setX per state), computed-derived requires 1 line.

**What it teaches.** The number of state update calls scales with the number of stored derived values. Computed derived values are free -- the framework handles propagation. The desync demonstration makes the failure mode visceral.

**Why static text fails.** The propagation from source to derived is a flow that happens over time. The "forget to update" interaction is experiential -- the reader triggers the bug themselves, sees the inconsistency, and understands WHY derived state should be computed.

**Component API (rough).**
```tsx
<StateDependencyGraph
  independentState={[
    { id: "items", type: "array", initial: [1, 2, 3] },
    { id: "predicate", type: "function", initial: "(x) => x > 1" },
  ]}
  derivedState={[
    { id: "filteredItems", derivedFrom: ["items", "predicate"], compute: "items.filter(predicate)" },
    { id: "totalCount", derivedFrom: ["items"], compute: "items.length" },
    { id: "isEmpty", derivedFrom: ["items"], compute: "items.length === 0" },
  ]}
  storedDerived={true}
  desyncToggles={["totalCount", "isEmpty"]}
/>
```

#### Real-World Example

Zustand's selector pattern. The store contains only independent state; components derive values via selectors:

```ts
const useStore = create((set) => ({
  items: [],
  predicate: (x) => true,
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
}))

// Derived at render time via selector -- never stored
const filteredItems = useStore((s) => s.items.filter(s.predicate))
const isEmpty = useStore((s) => s.items.length === 0)
```

The selectors are the derivation. They run on every state change, but only cause re-renders if their return value changes (referential equality check). This is derived state + render optimization in one pattern.

#### Anti-Patterns

1. **The useEffect Deriver.** `useEffect(() => { setFilteredItems(items.filter(predicate)) }, [items, predicate])`. This "computes" derived state in an effect, which runs AFTER render, causing a double render: first with stale filteredItems, then with fresh. `useMemo` computes during render. `useEffect` computes after render. For derived state, `useMemo` is always correct.

2. **The Premature Memo.** `const totalCount = useMemo(() => items.length, [items])`. `items.length` is an O(1) property access. `useMemo` has overhead (closure creation, dependency comparison). For cheap computations, plain derivation (`const totalCount = items.length`) is faster than memoized derivation.

3. **The Derived-State-in-Redux.** A Redux store with `items`, `filteredItems`, `totalCount`, and `isEmpty` all as top-level state. Three of those should be selectors, not state. Redux's `createSelector` (reselect) exists precisely for this pattern.

#### Related Principles

- **Structural Sharing** -- How libraries like TanStack Query avoid re-renders when derived state hasn't actually changed, even if the source state has.
- **Render Optimization** -- Derived state computed via selectors enables fine-grained re-rendering: only components whose derived value changed will re-render.
- **Cache Invalidation** -- Stored derived state IS a cache. Computed derived state avoids the cache invalidation problem entirely.

#### When to Break This Rule

- **Expensive computations with stable inputs.** If filtering 10,000 items takes 50ms and the predicate changes rarely, storing the filtered result and updating it only when the predicate changes is a valid optimization. But reach for `useMemo` first -- it computes lazily and caches automatically.
- **Cross-request derived state.** On the server, derived state may need to persist across requests (e.g., a materialized view in a database). Server-side derived state has different invalidation characteristics than client-side.

---

### Principle 9: Entrance/Exit Pairs

**Summary:** Every element that animates in must have a corresponding animation out. The entrance and exit should be related but not identical -- the exit is typically faster, simpler, and less attention-grabbing.

#### The Problem

A modal opens with a smooth scale + fade animation (300ms). The user clicks the backdrop. The modal vanishes instantly -- no animation. The asymmetry is jarring. The entrance said "pay attention, something is happening." The instant exit says "nothing happened, it was never here." The user is momentarily disoriented: did the modal close, or did it crash?

The opposite problem: a modal opens with a 300ms entrance and closes with a 300ms exit. The exit is too slow. The user clicked "close" -- they want it gone. A 300ms exit feels like the UI is ignoring their command. The entrance earns attention; the exit should not demand it.

#### The Principle

**Define entrance and exit animations as pairs. The exit should be the entrance in reverse but 30-50% faster, using a simpler easing curve.**

The asymmetry rule: entrances can be dramatic (spring bounce, slide from off-screen, stagger). Exits should be understated (fade, slide to nearest edge, no stagger). The ratio: if the entrance is 300ms with a spring, the exit is 200ms with a linear ease-out.

Why the asymmetry? Entrances compete for attention against existing content. They need enough duration and motion to register. Exits are the user's decision being executed -- the user already knows what's happening, they just want it done. Speed signals responsiveness.

The `AnimatePresence` pattern (framer-motion): the component defines both `initial` (entrance start), `animate` (active state), and `exit` (exit end). The library handles mounting/unmounting timing so the exit animation plays before the DOM node is removed.

#### Interactive Widget: The Enter/Exit Tuner

**Visual description.** A card in the center that can be toggled visible/hidden. Below it: two side-by-side timing panels -- "Entrance" (left) and "Exit" (right). Each panel has sliders for duration, easing curve (dropdown), and motion type (slide/scale/fade).

**Animation spec.**

- **The card.** A simple content card (title, subtitle, body text). Toggle button above it: "Show / Hide."
- **Entrance panel.** Duration slider (100ms-600ms). Easing dropdown (`SPRING.snappy`, `SPRING.gentle`, `TRANSITION.enterCard`). Motion type (slide-up, scale-from-center, fade-only). When the reader clicks "Show," the card enters with the configured entrance.
- **Exit panel.** Same controls. When the reader clicks "Hide," the card exits with the configured exit. A "Link to entrance" checkbox auto-sets the exit to be the entrance reversed and 40% faster. Unchecking allows independent configuration.
- **Asymmetry indicator.** Between the two panels, a visual comparison: two small timeline bars (entrance and exit) drawn to scale. The entrance bar is longer. A ratio label shows "Entrance: 300ms / Exit: 180ms (0.6x)." If the exit is longer than the entrance, the ratio label turns amber with a warning: "Exit slower than entrance -- usually feels sluggish."
- **A/B comparison.** A "Compare" toggle splits the view into two cards side by side: one with the reader's settings, one with "no exit animation" (instant disappear). The reader clicks "Hide" and sees both simultaneously. The animated exit feels intentional; the instant disappear feels broken.

**Interaction model.** Configure entrance and exit independently. Toggle the card visible/hidden. Use "Link to entrance" for automatic pairing. The A/B comparison makes the case for exit animations.

**What it teaches.** The asymmetry rule. Exits should be faster than entrances. The linked mode teaches the pairing concept; the independent mode lets the reader discover the asymmetry rule by experimentation (they'll find that a 300ms exit feels too slow and reduce it themselves).

**Why static text fails.** The timing relationship between entrance and exit is perceptual. "30-50% faster" is a guideline; the reader needs to FEEL the difference between a 300ms exit and a 180ms exit to calibrate their own sense of the right ratio.

**Component API (rough).**
```tsx
<EnterExitTuner
  entranceDuration={300}
  entranceEasing={SPRING.snappy}
  entranceType="slide-up"
  exitDuration={180}
  exitEasing={TRANSITION.enterCard}
  exitType="fade"
  linked={true}
  linkRatio={0.6}
  showComparison={false}
/>
```

#### Anti-Patterns

1. **The Symmetric Pair.** Entrance and exit have identical duration and easing. The exit feels too slow. Reduce exit duration by 30-50%.

2. **The Entrance-Only.** Animated entrance, instant exit. The user loses spatial continuity -- "where did it go?" Instant exits are acceptable only for destructive actions where the element is being deleted (it's gone, there's nowhere to animate TO).

3. **The Exit-Heavier.** An exit animation that's MORE dramatic than the entrance (exit has a bounce, entrance is a fade). This inverts the attention hierarchy: the reader is drawn to something leaving rather than something arriving.

#### Related Principles

- **Choreography** -- Entrance/exit pairs are the atoms that choreography sequences.
- **Reduced Motion** -- Each pair needs a reduced-motion variant. Typically: entrance becomes instant-appear with opacity change, exit becomes instant-disappear with no animation.
- **Spring Physics** -- Springs are ideal for entrances (overshoot conveys energy). Exits should use easing curves (linear/ease-out), not springs (the overshoot on exit feels like the element is coming back).

#### When to Break This Rule

- **Toast notifications.** Toasts enter with animation but often auto-dismiss on a timer. The auto-dismiss exit can be slower (the user didn't trigger it, so "responsiveness" isn't the goal -- "notice this is leaving" is).
- **Page transitions.** The "exit" of one page and the "entrance" of the next may not be a strict pair -- they're separate elements with separate animations. The exit of page A is choreographed with the entrance of page B, but they're not reverse-of-each-other.

---

### Principle 10: Cache Invalidation

**Summary:** Cached data is a bet that the data hasn't changed. Every cache needs an invalidation strategy that matches the data's actual change frequency. Too aggressive invalidation wastes bandwidth; too conservative invalidation shows stale data.

#### The Problem

A dashboard shows "Active Users: 1,247." This value was fetched 5 minutes ago. Is it still accurate? Maybe. If it's a real-time dashboard, 5 minutes is an eternity. If it's a monthly report, 5 minutes is fine. The cache duration is correct or incorrect based on the data's change frequency, not on a universal "5 minutes is a good cache time."

The deeper problem: different data on the same page has different change frequencies. The user's avatar (changes rarely) should have a long cache time. The notification count (changes constantly) should have a short one. A single `staleTime` for all queries treats all data as equally volatile.

#### The Principle

**Match the cache duration to the data's change frequency, not to a universal default. Different data on the same page should have different cache strategies.**

Four invalidation strategies, each appropriate for different data characteristics:

1. **Time-based (stale-after).** Data is stale after N milliseconds. Good for data with predictable update frequency (stock prices every second, weather every hour).
2. **Event-based (invalidate-on-mutation).** Data is stale when the user or another process mutates it. Good for user-owned data (the user's own posts, their profile).
3. **Focus-based (invalidate-on-refocus).** Data is stale when the user returns to the tab. Good for data that may have changed while the user was away (notifications, messages).
4. **Manual (imperative invalidation).** The developer explicitly marks data as stale. Good for data where the client can't know the change frequency (admin-edited config, feature flags).

TanStack Query exposes all four through `staleTime`, `invalidateQueries` (in mutation callbacks), `refetchOnWindowFocus`, and the imperative `queryClient.invalidateQueries()` API.

#### Interactive Widget: The Freshness Dial

**Visual description.** A dashboard mockup with 4 panels, each representing a different cache strategy. Each panel has a "freshness meter" -- a circular gauge that starts at green (fresh) and gradually rotates toward red (stale).

**Animation spec.**

- **Panel 1: Time-based.** The freshness meter counts down from green to red over 30 seconds (simulating `staleTime: 30000`). When it hits red, a "refetching" spinner appears and the meter resets to green. The countdown uses a smooth `TRANSITION.progress` rotation.
- **Panel 2: Event-based.** The freshness meter stays green indefinitely. A "Like" button is in the panel. When the reader clicks Like, the meter instantly jumps to red (the mutation invalidated the cache) and a refetch spinner appears. The meter resets to green when the simulated refetch completes (500ms).
- **Panel 3: Focus-based.** The freshness meter slowly drifts toward yellow (simulating background staleness). A "Switch Tab" button simulates leaving and returning. When clicked, the screen briefly dims (simulating tab switch, 1 second), then returns. The meter shows how much it drifted during absence and immediately refetches.
- **Panel 4: Manual.** The freshness meter stays green regardless of time. A big "Invalidate" button. Only when the reader clicks it does the meter jump to red and refetch.
- **Comparison mode.** All four panels are visible simultaneously with the same underlying data. The reader can watch the different strategies diverge: after 30 seconds with no interaction, Panel 1 has refetched 1x, Panel 2 is still on original data, Panel 3 is slightly stale, Panel 4 hasn't moved. The divergence is the teaching.

**Interaction model.** Watch the meters evolve over time. Click the Like button (Panel 2), click "Switch Tab" (Panel 3), click "Invalidate" (Panel 4). All four panels show the same data, so the reader can compare freshness across strategies. A "Data change" button simulates the server data actually changing -- the reader can then see which panels show stale data and which have already refetched.

**What it teaches.** Cache invalidation is not one strategy. It's a choice that depends on the data. The simultaneous four-panel view makes the trade-offs visible: time-based catches every change but refetches unnecessarily. Event-based only refetches when the user acts. Focus-based catches changes during absence. Manual gives full control but requires developer discipline.

**Why static text fails.** Freshness is temporal. The meters drifting at different rates, the divergence between strategies over 30 seconds of real time -- this is impossible to convey in a static diagram.

**Component API (rough).**
```tsx
<FreshnessDial
  strategies={[
    { id: "time-based", staleTime: 30000, label: "Time-based (30s)" },
    { id: "event-based", invalidateOnMutation: true, label: "Event-based" },
    { id: "focus-based", refetchOnFocus: true, label: "Focus-based" },
    { id: "manual", manualOnly: true, label: "Manual" },
  ]}
  initialData={{ activeUsers: 1247 }}
  simulatedServerChanges={[
    { at: 15000, newData: { activeUsers: 1253 } },
  ]}
/>
```

#### Anti-Patterns

1. **The Universal staleTime.** `staleTime: 300000` (5 minutes) on every query. Notification counts are 5 minutes stale. User profiles are uselessly re-fetched every 5 minutes. Match staleTime to data volatility.

2. **The Invalidation Cascade.** Liking a post invalidates the post query, the posts list query, the user profile query, the notification count query, and the activity feed query. Each invalidation triggers a refetch. Five concurrent requests for one Like click. Scope invalidation to the queries that actually depend on the changed data.

3. **The Never-Stale Cache.** `staleTime: Infinity` with no invalidation strategy. The data is cached forever. Users see data from their first visit until they hard-refresh. This is a bug that masquerades as performance optimization.

#### Related Principles

- **Optimistic Updates** -- The write-side complement. Optimistic updates change the cache immediately; cache invalidation determines when to verify with the server.
- **Stale-While-Revalidate** -- The read-side pattern: serve stale, refetch in background. Cache invalidation determines what counts as "stale."
- **Derived State** -- Computed derived state avoids cache invalidation entirely because there's no cache to invalidate. If a value can be derived, don't cache it.

#### When to Break This Rule

- **Offline-first apps.** When the user may not have network access, aggressive invalidation is counterproductive. Serve whatever you have, sync when connectivity returns. The cache IS the data, not a bet against staleness.
- **Idempotent data.** Static content that truly never changes (historical data, immutable records) should be cached forever with no invalidation. `staleTime: Infinity` is correct for genuinely immutable data.

---

### Principle 11: Focus Management

**Summary:** When the UI changes programmatically (modal opens, route changes, content loads dynamically), keyboard focus must be managed explicitly. Unmanaged focus creates invisible barriers for keyboard and screen reader users.

#### The Problem

A user navigating with keyboard reaches a "Delete" button. They press Enter. A confirmation dialog appears in the center of the screen. But focus stays on the now-hidden Delete button, behind the dialog. The user presses Tab. Focus moves to the next element IN THE PAGE, behind the dialog. The dialog is visually present but programmatically unreachable without a mouse.

This is the focus management problem: the visual UI and the focus order are out of sync. Sighted mouse users never notice because they point and click. Keyboard users are stranded. Screen reader users don't know the dialog exists.

#### The Principle

**When the UI changes programmatically, move focus to the most relevant element in the new view. When a temporary view (modal, popover, drawer) opens, trap focus inside it. When it closes, return focus to the trigger element.**

Three focus management patterns:

1. **Focus move on open.** Modal opens -> focus moves to the first focusable element inside the modal (or to the modal's close button, or to the modal's heading if it has `tabindex="-1"`).
2. **Focus trap.** While the modal is open, Tab and Shift+Tab cycle within the modal's focusable elements. Focus does not escape to the page behind.
3. **Focus restore on close.** Modal closes -> focus returns to the element that triggered the modal (the Delete button).

These three form a cycle: trigger -> move -> trap -> restore -> trigger. Every modal, popover, drawer, and dialog must complete this cycle. Breaking any step breaks keyboard navigation.

#### Interactive Widget: The Focus Tracker

**Visual description.** A mockup page with a toolbar, a content area, and a "Open Dialog" button. The currently focused element is highlighted with a prominent focus ring (2px solid, accent color, animated with `LOOP.breathe` at low intensity). A "Focus Log" panel on the right shows a chronological list of focused elements.

**Animation spec.**

- **Focus ring.** A 2px ring around the currently focused element, using the blog's accent color. The ring has a subtle pulse (`LOOP.breathe`, 1px amplitude on box-shadow spread). When focus moves, the ring animates from the old element to the new one using a shared layout animation (`layoutId="focus-ring"`, `SPRING.snappy`). This makes focus movement VISIBLE as a traveling indicator, not just a static ring that appears and disappears.
- **Focus log.** Each focus event adds a row to the log panel. The row slides in from the right (`SPRING.snappy`). The row shows: element tag name, accessible name (or text content), and a small arrow showing direction (forward = Tab, backward = Shift+Tab).
- **Dialog open.** When "Open Dialog" is clicked, the dialog appears (`SPRING.gentle`, scale from 0.95 to 1.0, opacity 0 to 1). The focus ring animates from the button INTO the dialog (the traveling ring crosses the gap, which is the visual proof of focus management). The focus log shows "Focus moved to: Dialog heading."
- **Focus trap.** Inside the dialog, pressing Tab cycles between the dialog's three focusable elements (close button, cancel button, confirm button). The focus ring travels between them. If the reader presses Tab on the last element, the ring wraps back to the first. The focus log shows the cycle.
- **Dialog close.** When the dialog closes, the focus ring animates from inside the dialog BACK to the "Open Dialog" button. The focus log shows "Focus restored to: Open Dialog button."

**The broken version.** A toggle: "Disable focus management." With it enabled, opening the dialog does NOT move focus. The focus ring stays on the "Open Dialog" button (now behind the dialog). Pressing Tab moves focus to the next page element (behind the dialog). The focus ring jumps unpredictably. The focus log shows the chaotic focus order. The dialog is visually present but focus-unreachable.

**Interaction model.** Use Tab and Shift+Tab to navigate the page. Click "Open Dialog" (or press Enter when focused). Watch the focus ring travel. Toggle "Disable focus management" to see the broken version. The focus log provides analytical evidence of what's happening.

**What it teaches.** Focus management is the invisible infrastructure of keyboard navigation. The traveling focus ring makes the invisible visible. The broken version makes the consequences of NOT managing focus visceral -- the reader experiences being "trapped behind the dialog" themselves.

**Why static text fails.** Focus order is sequential and interactive. Static screenshots can circle the focused element, but they can't show the SEQUENCE of focus changes or the EXPERIENCE of being unable to reach a visible dialog. The traveling ring animation turns an invisible accessibility concern into a visible, experiential one.

**Component API (rough).**
```tsx
<FocusTracker
  page={[
    { element: "button", label: "Menu" },
    { element: "nav", children: [/* nav items */] },
    { element: "main", children: [/* content */] },
    { element: "button", label: "Open Dialog" },
  ]}
  dialog={{
    heading: "Confirm Delete",
    focusableElements: ["Close", "Cancel", "Confirm"],
  }}
  focusManaged={true}
  showFocusLog={true}
/>
```

#### Real-World Example

Radix UI's `Dialog` component (https://github.com/radix-ui/primitives). Annotated excerpt from `packages/react/dialog/src/Dialog.tsx` showing:
- `FocusScope` component that traps focus
- `useRef` for the trigger element, used to restore focus on close
- The `onOpenAutoFocus` callback that moves focus to the first focusable element

#### Anti-Patterns

1. **The autofocus Crutch.** `<input autoFocus />` inside a dialog. This works for the initial focus move but does NOT handle focus trapping or focus restoration. `autoFocus` is a starting point, not a solution.

2. **The Invisible Trap.** Focus is trapped inside a popover, but the popover has no visible focus indicators. The user is trapped in something they can't see. Focus trapping requires visible focus indicators on every focusable element inside the trap.

3. **The Forgotten Restore.** Focus moves into the dialog on open but doesn't return to the trigger on close. After closing, focus lands on `<body>` -- the user has to Tab through the entire page to get back to where they were.

#### Related Principles

- **Keyboard Navigation** -- Focus management enables keyboard navigation through dynamic UI. They're complementary: keyboard navigation is the user's input, focus management is the application's response.
- **Screen Reader Patterns** -- Screen readers follow focus. Unmanaged focus means the screen reader loses track of the user's position.
- **Reduced Motion** -- The traveling focus ring animation should use a simple position change in reduced motion mode, not the shared layout animation.

#### When to Break This Rule

- **Non-blocking UI changes.** An inline validation message appearing below a form field should NOT steal focus. The user is typing -- moving focus would interrupt them. Non-blocking additions to the page should be announced via `aria-live` regions, not focus changes.
- **Background updates.** A notification badge updating from 3 to 4 should not move focus. Only USER-INITIATED changes that create new interactive surfaces need focus management.

---

## Cross-Cutting Concerns

### Shared Widget Primitives

Several widgets across principle pages share visual or interactive patterns. Extract these as shared primitives in `src/components/principle-widgets/shared/`:

| Primitive | Used By | Purpose |
|---|---|---|
| `<CodeComparison>` | Compound Components, Derived State, Semantic Contracts | Side-by-side code panels with synchronized scrolling |
| `<TimingDiagram>` | Choreography, Entrance/Exit, Reduced Motion | Horizontal bars showing animation timing relationships |
| `<StateMachineViz>` | Optimistic Updates, Cache Invalidation, Derived State | Generic state machine renderer with animated transitions |
| `<FreshnessGauge>` | Cache Invalidation | Circular gauge that counts down from green to red |
| `<FocusRingOverlay>` | Focus Management | Traveling focus ring with layout animation |
| `<SplitView>` | Compound Components, Reduced Motion, Entrance/Exit | Two-panel comparison layout with synced interactions |

This follows the project's own principle (Primitive Composition): build the shared primitives first, compose them into principle-specific widgets.

### Animation Conventions

All principle page widgets follow the project's animation conventions from `src/lib/motion.ts`:

- Entrance animations use `SPRING.snappy` or `SPRING.gentle` depending on element weight (badges = snappy, panels = gentle).
- Timing diagrams use `TRANSITION.progress` for smooth value changes.
- Interactive feedback uses `SPRING.quick`.
- Looping/ambient animations use `LOOP.breathe` at reduced intensity (never attention-grabbing).
- Every widget respects `usePrefersReducedMotion()`.

New presets to add for principle widgets:

```ts
// In src/lib/motion.ts
export const TRANSITION = {
  ...existing,
  /** Focus ring traveling between elements */
  focusTravel: { duration: DURATION.fast, ease: EASE.inOut } satisfies Transition,
  /** State machine transition (dot traveling along arrow) */
  stateTransition: { duration: DURATION.normal, ease: EASE.out } satisfies Transition,
};

export const STAGGER = {
  ...existing,
  /** Choreography default: 60ms between items */
  choreography: 0.06,
};
```

### Accessibility

Every principle page widget must meet WCAG 2.1 AA:

- All interactive elements have visible focus indicators (2px ring, accent color).
- All animations have reduced-motion alternatives.
- Color is supplemented by shape, label, or position.
- Screen reader announcements for state changes (via `aria-live="polite"`).
- Keyboard navigation for all interactions (Tab, Enter, Space, Arrow keys where appropriate).
- Touch targets are at least 44x44px.

The **Focus Management** and **Reduced Motion** principle pages dogfood their own principles -- their widgets must be exemplary implementations.

### Performance

- Each principle page's widget is dynamically imported (`next/dynamic`) to avoid loading all widget code on the landing page.
- Widgets are wrapped in `IntersectionObserver` guards: animation doesn't start until the widget is in the viewport.
- Heavy widgets (StateDependencyGraph, CompoundVsMonolith) use `useDeferredValue` for their code panels to avoid blocking the main thread during re-renders.
- All animations use compositor-friendly properties (`transform`, `opacity`) only. No `width`, `height`, `top`, `left` animations.

---

## Cross-Linking Strategy

### Link Types

1. **"Related Principles"** (bottom of every page): 3-5 links to conceptually adjacent principles. Each link includes a one-sentence explanation of the relationship. These links are bidirectional -- if A links to B, B links to A.

2. **"See Also" inline links** (within prose): When the Problem or Principle section mentions another principle by name, it links to that principle's page. These are unidirectional and contextual.

3. **"Deep Dive" links** (bottom of every page): Links to blog series posts where this principle appears in a specific context. These are unidirectional (principle page -> series post). The series post has a corresponding link back ("This pattern is called X -- see the principle page").

4. **"Learning Path" badges** (top of page, below title): If the principle appears in one or more learning paths, show small badges linking to the path pages.

### Knowledge Graph Shape

The cross-links form a graph. Expected clusters:

```
Component Design cluster:
  Compound Components <-> Primitive Composition <-> Semantic Contracts
  Render Delegation <-> Slot Patterns <-> Compound Components
  Prop API Design <-> Semantic Contracts

State Management cluster:
  Derived State <-> Structural Sharing <-> Render Optimization
  Optimistic Updates <-> Cache Invalidation <-> Stale-While-Revalidate
  External Stores <-> Derived State

Animation cluster:
  Choreography <-> Stagger Patterns <-> Entrance/Exit Pairs
  Reduced Motion <-> Choreography
  Spring Physics <-> Entrance/Exit Pairs
  Performance Budgets <-> Choreography

Cross-cluster bridges:
  Primitive Composition <-> Layered Architecture (component -> architecture)
  Reduced Motion <-> Focus Management (animation -> accessibility)
  Semantic Contracts <-> Prop API Design <-> Derived State (design -> state)
  Cache Invalidation <-> Derived State (state management overlap)
```

Bridges between clusters are the most valuable links -- they're the connections the reader wouldn't discover by browsing a single category.

### Implementation

The `src/lib/principles.ts` file maintains the relationship graph as data:

```ts
type PrincipleRelationship = {
  from: string      // principle slug
  to: string        // principle slug
  description: string
  bidirectional: boolean
}

type PrincipleMeta = {
  slug: string
  title: string
  summary: string
  categories: string[]
  tags: string[]
  relationships: PrincipleRelationship[]
  learningPaths: string[]
  deepDiveRefs: { series: string, part: number, label: string }[]
}
```

The `RelatedPrinciples` component at the bottom of each page reads this data and renders the links. The landing page uses the full graph for the knowledge graph visualization (if we build one -- see Open Questions).

---

## Scalability Plan

### Adding a New Principle

1. Create `content/principles/[slug].mdx` with the standard frontmatter.
2. Add the principle's metadata to `src/lib/principles.ts` (relationships, categories, learning paths).
3. Build the principle's widget in `src/components/principle-widgets/[slug]/`.
4. Add relationships in BOTH directions (update the related principle's metadata too).
5. If the principle belongs to a learning path, update the path's principle list.

No page restructuring. No navigation changes. No re-deployment of existing pages (unless you're adding a relationship link to an existing principle's metadata).

### Adding a New Category

1. Add the category to the `categories` enum in `src/lib/principles.ts`.
2. Create `src/app/principles/category/[category]/page.tsx` (if it doesn't use dynamic routing already).
3. Tag existing principles with the new category where appropriate.

No restructuring. The category listing page auto-generates from the metadata.

### Adding a New Learning Path

1. Add the path definition to `src/lib/principles.ts` (name, description, ordered list of principle slugs).
2. The path page auto-generates from the definition.
3. The principle pages auto-show the path badge from the definition.

### Growth Trajectory

Phase 1 (launch): 10-15 principles across 4-5 categories. Enough to demonstrate the wiki format and establish the quality bar. This doc outlines 11 fully-specified principles.

Phase 2 (expansion): 25-30 principles across all 7-8 categories. Every category has at least 3 principles. Learning paths cover 3-4 common developer journeys.

Phase 3 (maturity): 40+ principles. Community contributions possible (if the blog ever opens contributions). The knowledge graph is rich enough that "See Also" browsing becomes the primary navigation mode.

No phase requires restructuring the previous phase's content. Each principle is an atom. The graph grows by adding atoms and edges.

---

## Integration with Deep-Dive Series

### The Handoff Pattern

A deep-dive post (e.g., Plugin Architectures Post 3: ESLint) explores the visitor pattern in depth. The post contains a sentence like:

> The visitor pattern separates traversal from inspection -- the engine walks the tree, and the rules react to nodes they care about. This separation is the key architectural insight. **[Read more about this principle ->](/principles/separation-of-concerns)**

The principle page (Separation of Concerns) has a "Deep Dive References" section:

> **See this principle in practice:**
> - [Plugin Architectures Post 3: ESLint](/blog/plugin-architectures/eslint) -- The visitor pattern as separation of traversal from inspection
> - [From Bespoke to Semantic Part 1](/recipes/from-bespoke-to-semantic-1) -- Separating diagram data from diagram rendering

The deep dive is the narrative. The principle page is the reference. The reader can enter from either direction: "I read about ESLint and want to understand the general principle" or "I know the principle and want to see it applied."

### Specific Integration Points

| Deep-Dive Series | Post | Principle Pages Referenced |
|---|---|---|
| Plugin Architectures | Post 1 (Design Space) | Prop API Design, Separation of Concerns |
| Plugin Architectures | Post 3 (ESLint) | Separation of Concerns (visitor pattern) |
| Plugin Architectures | Post 4 (Tailwind) | Semantic Contracts (registration pattern) |
| Plugin Architectures | Post 6 (Synthesis) | Primitive Composition (pattern blending) |
| Streaming | Post 1 (The Problem) | Progressive Disclosure (streaming as disclosure) |
| Streaming | Post 2 (AI SDK) | Producer-Consumer, Backpressure |
| Streaming | Post 4 (TanStack Query) | Optimistic Updates, Cache Invalidation, Structural Sharing, Derived State |
| React State | Post 1 (Re-render Tax) | Render Optimization, Derived State |
| React State | Post 2 (Zustand) | External Stores, Derived State |
| From Bespoke to Semantic | Part 1 | Primitive Composition (the problem) |
| From Bespoke to Semantic | Part 2 | Compound Components (the solution) |
| From Bespoke to Semantic | Part 3 | Semantic Contracts (the FlowDiagram's semantic dimensions) |
| From Bespoke to Semantic | Part 4 | Layered Architecture (types -> geometry -> hooks -> primitives) |

---

## Additional Principle Pages (Outlined, Not Fully Specified)

The following principles are identified but not fully designed in this doc. Each needs the full treatment (Problem, Principle, Widget, Real-World Example, Anti-Patterns, Related, When to Break).

### Render Delegation (`render-delegation`)
**Summary:** Let the consumer control the rendered element via `asChild`, `as`, or render props, so the component owns behavior but not markup.
**Widget concept:** A button component with an `asChild` toggle. With `asChild` off, it renders a `<button>`. With it on, the reader provides a `<Link>`, an `<a>`, or a custom component, and the button's behavior (click handling, focus management, ARIA attributes) delegates to the consumer's element. The widget shows the DOM output changing while the behavior stays identical.

### Slot Patterns (`slot-patterns`)
**Summary:** Named composition slots (header, body, footer) that give the consumer control over what goes where without compound component complexity.
**Widget concept:** A Card component with named slots. The reader drags content blocks into slots and watches the rendered card update. Removing a slot shows the fallback. Adding extra content to a slot shows overflow handling.

### Structural Sharing (`structural-sharing`)
**Summary:** When updating cached data, preserve object references for unchanged subtrees to avoid unnecessary re-renders.
**Widget concept:** Two JSON trees (old and new). The widget diffs them, showing which nodes get new references and which keep old ones. A React component tree below shows which components re-render based on reference changes.

### Spring Physics (`spring-physics`)
**Summary:** Use spring-based animations (stiffness, damping, mass) instead of duration-based animations for UI interactions. Springs respond to interruption naturally; duration-based animations don't.
**Widget concept:** A ball on a spring with stiffness/damping/mass sliders. The reader drags the ball and releases it, watching the spring physics play out. A side panel shows the equivalent CSS `transition: 300ms ease-out` and how it fails on interruption (drag again mid-animation). The spring handles it naturally; the CSS transition restarts from the beginning.

### Stale-While-Revalidate (`stale-while-revalidate`)
**Summary:** Serve cached (possibly stale) data immediately, then revalidate in the background and update when fresh data arrives.
**Widget concept:** A social media profile card. First visit: loading state -> fresh data. Second visit (2 minutes later): stale data appears instantly (the cached version), then a subtle update as fresh data arrives (the bio text changes, the avatar updates). A side-by-side comparison with "no cache" (loading state on every visit) makes the speed difference visceral.

### Separation of Concerns (`separation-of-concerns`)
**Summary:** Each module/layer/component should have one reason to change. If a component changes when the data model changes AND when the visual design changes, it has two concerns.
**Widget concept:** A "Concern Highlighter" that colors different sections of a monolithic component by concern (data fetching = blue, rendering = green, event handling = amber, styling = red). The colors interleave, showing that concerns are tangled. A refactored version shows each concern in its own module -- the colors are now separated into distinct blocks.

### Widget Design (`widget-design`)
**Summary:** An interactive teaching widget should be playable in 10 seconds, produce an "aha" in 30 seconds, and leave the reader with a transferable mental model. Don't build a tool; build a demonstration.
**Widget concept:** Meta -- a widget about widget design. Shows three versions of the same concept (e.g., explaining binary search): a static diagram, a stepped walkthrough, and an explorable interactive. The reader rates each on "time to understand" and "depth of understanding." The interactive wins on both, but only if it follows the 10/30 second rule.

### Cognitive Load (`cognitive-load`)
**Summary:** Every element on screen competes for working memory. Reduce visible complexity by removing non-essential elements, grouping related elements, and sequencing information.
**Widget concept:** A working memory simulator. The reader sees a component with N visible elements. A "Working Memory" gauge (capacity: ~4 chunks) fills as elements are added. When it overflows, the reader's comprehension score drops (simulated, based on research). Grouping elements (Gestalt proximity) reduces the chunk count. The reader drags elements into groups and watches the gauge respond.

### Bundle Splitting (`bundle-splitting`)
**Summary:** Split JavaScript bundles along route and interaction boundaries. The initial load should contain only what's needed for the current view; everything else loads on demand.
**Widget concept:** A treemap visualization showing bundle composition. The reader adds features (authentication, charts, rich text editor) and watches the bundle grow. A "Split" tool lets them draw boundaries in the treemap -- each split becomes a dynamic import. The initial load size counter shows the impact. A "Page Load" simulation shows the waterfall: initial bundle loads, then split chunks load on demand.

### Keyboard Navigation (`keyboard-navigation`)
**Summary:** Every interactive element must be reachable and operable via keyboard. Tab order should follow visual layout. Complex widgets need arrow-key navigation patterns (roving tabindex, activedescendant).
**Widget concept:** A toolbar with 5 buttons. Two implementations side by side: "Tabbed" (each button is a tab stop -- 5 tabs to traverse) and "Roving Tabindex" (the toolbar is one tab stop, arrow keys move between buttons -- 1 tab to enter, arrows to navigate). A tab-count comparison shows the difference. The roving tabindex version matches the WAI-ARIA toolbar pattern.

---

## Open Questions

1. **Knowledge graph visualization.** Should the landing page (`/principles`) include a visual knowledge graph (nodes = principles, edges = relationships)? Pro: makes cross-domain connections discoverable. Con: graphs are hard to read at scale; past 20 nodes they become hairballs. Possible compromise: a zoomable local graph that shows 1 hop from the selected principle, not the full graph.

2. **Search implementation.** Full-text search across 40+ principle pages needs an index. Options: (a) build-time search index with Fuse.js, (b) Algolia, (c) Pagefind. The blog is statically generated, so Pagefind (static search) is the natural fit. But the search needs to weight principle names and summaries above body text.

3. **Community contributions.** If the wiki grows past 30 principles, maintaining quality becomes a bottleneck. Should there be a contribution model? The quality bar (bespoke interactive widget per principle) makes casual contributions difficult. A middle ground: community members write the prose sections; we build the widgets. But this splits authorship in a way that may not work editorially.

4. **Versioning.** Principles that reference specific library APIs (TanStack Query v5, Radix UI) will need updating when those libraries release major versions. Should principle pages show a "last verified with" version badge? Should the real-world examples link to pinned commits?

5. **Mobile experience.** Some widgets (drag-and-drop, side-by-side comparison) are designed for desktop widths. The mobile fallback needs thought: vertically stacked comparisons, tap-to-select instead of drag, collapsible panels. This is a significant design effort -- should it be Phase 2?

6. **Relationship to the "from-bespoke-to-semantic" recipe series.** That series is narrative (tells the FlowDiagram's story). The wiki pages that reference the same concepts (Compound Components, Semantic Contracts) are reference (explain the general principle). Should the recipe series be updated with links to the wiki pages? Should the wiki pages include "This principle was discovered during [the FlowDiagram journey](/recipes/from-bespoke-to-semantic-1)" origin stories?

7. **How opinionated should the widget designs be?** Each widget takes a position (compound components are better than monoliths, derived state should be computed not stored). But principles have exceptions, and the "When to Break This Rule" section exists for that reason. Should the widgets show BOTH sides (compound and monolith, stored and computed) neutrally, or should they be designed to favor the principle's recommendation? Leaning toward showing both but making the principle's recommendation the default/initial state.

8. **Is 11 fully-specified principles enough for this doc?** The spec above designs 11 principle pages in detail (Compound Components, Primitive Composition, Semantic Contracts, Optimistic Updates, Choreography, Progressive Disclosure, Reduced Motion, Derived State, Entrance/Exit Pairs, Cache Invalidation, Focus Management) and outlines 10 more. That's 21 total identified, with 11 at full quality. Enough to establish the pattern and quality bar, but the doc could be larger. The question is: does the extra detail in principles 12-21 add to the plan, or should those be designed when they're implemented?

---

## Sequence of Work

### Phase 0: Infrastructure
1. Define the `PrincipleMeta` type and relationships graph in `src/lib/principles.ts`.
2. Build the principle page template (MDX layout with consistent sections).
3. Build the `PrincipleCard`, `RelatedPrinciples`, and `LearningPathStepper` components.
4. Set up routing: `/principles`, `/principles/[slug]`, `/principles/category/[category]`, `/principles/path/[path-slug]`.
5. Build shared widget primitives: `CodeComparison`, `TimingDiagram`, `SplitView`.

### Phase 1: First 5 Principles (establish quality bar)
Ship these as a group -- enough to demonstrate the wiki format, cross-linking, and one learning path.

1. **Compound Components** -- the most recognizable pattern, broadest audience.
2. **Primitive Composition** -- directly references the FlowDiagram story.
3. **Derived State** -- crosses from component design to state management.
4. **Choreography** -- demonstrates the animation category.
5. **Progressive Disclosure** -- demonstrates the pedagogy category.

These 5 span 4 categories and form the start of the "Build a Composable Component" learning path.

### Phase 2: Expand to 10-12 Principles
Add cross-cluster bridges and fill out categories:

6. **Semantic Contracts** -- completes the FlowDiagram cluster.
7. **Optimistic Updates** -- anchors the state management cluster.
8. **Cache Invalidation** -- connects to optimistic updates.
9. **Reduced Motion** -- anchors the accessibility cluster, bridges to animation.
10. **Entrance/Exit Pairs** -- connects to choreography.
11. **Focus Management** -- anchors the accessibility cluster.
12. **Separation of Concerns** -- anchors the architecture cluster.

### Phase 3: Mature Wiki
Add remaining outlined principles, new categories (Testing, TypeScript), and community-facing features (search, knowledge graph visualization).

### Ongoing
Every new deep-dive series post should identify 1-2 principles to add to the wiki. The wiki grows as a byproduct of the blog's content creation, not as a separate effort.
