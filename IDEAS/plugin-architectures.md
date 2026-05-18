# Plugin Architectures: How Tools Teach Themselves New Tricks

**Status:** Idea -- not yet started
**Created:** 2026-05-15
**Tags:** Systems Design, Plugin Systems, Extensibility, Hooks, Visitors, Middleware, Config-as-Code

---

## The Series Thesis

Every successful developer tool eventually faces the same crisis: the maintainers cannot anticipate every use case, but they cannot hand over the internals either. The answer is always some form of plugin system -- a controlled boundary where external code can participate in the tool's lifecycle without breaking its guarantees.

But "plugin system" is not one design. It is a spectrum of fundamentally different architectures, each encoding different assumptions about trust, timing, data ownership, and the relationship between host and extension. This series dismantles four real plugin systems -- Vite, ESLint, Tailwind, and Webpack -- to extract the transferable architectural patterns underneath. The goal is not to teach each tool's plugin API. The goal is to teach the reader to *design* plugin systems, or at minimum to evaluate them with informed intuition when choosing a tool.

The series moves from problem to technique to synthesis:

1. **The Problem** -- why extensibility is hard, the design space, the tradeoffs that every plugin system must navigate
2. **Vite** -- hook-based pipeline architecture, Rollup compatibility layer, the dev/build split
3. **ESLint** -- visitor pattern over AST, rule isolation, fixers, the flat config migration
4. **Tailwind** -- config-driven extensibility, the plugin-as-registration pattern, JIT compilation
5. **Webpack** -- tapable event system, compiler/compilation lifecycle, the loader/plugin distinction
6. **Synthesis** -- a decision framework, the tradeoffs matrix, designing your own

---

## Post 1: The Problem -- Why Plugins Exist

### Narrative Arc

The reader arrives knowing what plugins are as a user ("I `npm install` a Vite plugin and add it to my config"). They leave understanding plugins as an *architectural decision* -- a deliberate boundary the tool designer draws between "our responsibility" and "your opportunity."

### Content Outline

**The Extensibility Dilemma.** Every tool starts opinionated. Opinions are what make it useful -- they encode decisions the user doesn't have to make. But opinions also exclude use cases. The moment a tool succeeds, users arrive with needs the maintainers never imagined. The tool faces a choice: add every feature (monolith bloat), say no (community fracture), or create a boundary where external code can participate (plugin system).

**The Design Space.** Plugin architectures cluster into four families, though real systems often blend them:

- **Hook-based (pipeline).** The host defines a sequence of lifecycle stages. Plugins register callbacks at specific stages. Data flows through the pipeline; each hook can inspect, transform, or replace it. *Examples: Vite/Rollup, Webpack tapable, Babel.* The host controls *when* code runs. The plugin controls *what* it does at that moment.

- **Visitor-based (traversal).** The host builds a data structure (usually an AST) and walks it. Plugins declare which node types they care about and receive callbacks when those nodes are visited. *Examples: ESLint, Babel (also hook-based), Prettier.* The host controls *traversal order*. The plugin controls *what it does with each node*.

- **Config-based (registration).** The plugin doesn't hook into a lifecycle or visit a tree. Instead, it registers new entries into the host's configuration space -- new rules, new utilities, new variants. The host's engine then processes the expanded configuration. *Examples: Tailwind plugins, PostCSS, ESLint's flat config (partially).* The host controls *interpretation*. The plugin controls *vocabulary*.

- **Middleware-based (chain).** Each plugin wraps the next, forming a chain. A request enters one end and passes through each middleware, which can modify it, short-circuit it, or pass it along. *Examples: Express/Koa, Redux middleware, Webpack loaders (a special case).* The host controls *chain structure*. The plugin controls *per-request behavior*.

**The Evaluation Framework.** Before diving into specific tools, the reader needs a lens for comparing plugin systems. Five dimensions:

1. **Composability** -- can plugins cooperate without knowing about each other? Or do they fight over the same data?
2. **Isolation** -- can a buggy plugin crash the host? Can it corrupt another plugin's state?
3. **Discoverability** -- can a developer figure out what hooks exist, what data they receive, and what's expected?
4. **Performance** -- what's the overhead of the plugin boundary? Does the system pay per-hook or per-plugin?
5. **Evolvability** -- can the host change its internals without breaking plugins? How stable is the contract?

**The Spectrum from Config to Code.** At one extreme, a plugin is just a JSON object that extends configuration (Tailwind). At the other, it's arbitrary code that intercepts and transforms the host's internal data structures (Webpack). The further toward code, the more power and the more risk. Every plugin system sits somewhere on this spectrum, and where it sits determines its character.

### Interactive Widgets

#### Widget 1.1: The Plugin Design Space Map

**Visual description.** A 2D scatter plot with two axes: "Plugin Power" (y-axis, from "extends vocabulary" to "intercepts internals") and "Host Control" (x-axis, from "plugin runs freely" to "host dictates lifecycle"). Four quadrants, each labeled with its architecture family. Vite, ESLint, Tailwind, and Webpack are plotted as labeled dots. Additional tools (Babel, PostCSS, Express, Redux) appear as smaller, fainter dots for context.

**Animation design.** On load, the axes draw in left-to-right and bottom-to-top (TRANSITION.enterCard timing). Then the four primary dots spring in one by one (SPRING.snappy, STAGGER.fast), each trailing a brief label. The quadrant labels fade in last. When the reader hovers a dot, a tooltip shows a one-sentence summary of that tool's plugin model. The dot scales up slightly (scale: 1.15, SPRING.quick).

**Interaction model.** Hover to inspect. Click a dot to highlight all tools in its quadrant with a pulse animation (LOOP.pulse). A sidebar caption updates with a paragraph about the quadrant's characteristics. Click the dot again (or click empty space) to deselect. Drag is not needed here -- this is a reference map, not a builder.

**What it teaches.** The design space is not a list -- it's a space with axes and tradeoffs. Static text can name the four families but cannot communicate that they exist in tension with each other, that real tools blend families, or that moving along one axis costs you on another. The spatial layout makes these tradeoffs *visible*.

**Why static text fails.** A bullet list of four families implies they're discrete categories. The 2D plot shows they're positions in a continuous space, and that real tools often occupy the space between families.

**Component API (rough).**
```tsx
<DesignSpaceMap
  axes={{ x: "Host Control", y: "Plugin Power" }}
  quadrants={[
    { label: "Hook-based", description: "..." },
    { label: "Visitor-based", description: "..." },
    { label: "Config-based", description: "..." },
    { label: "Middleware-based", description: "..." },
  ]}
  tools={[
    { id: "vite", label: "Vite", x: 0.75, y: 0.7, primary: true },
    { id: "eslint", label: "ESLint", x: 0.6, y: 0.5, primary: true },
    // ...
  ]}
/>
```

#### Widget 1.2: The Extensibility Spectrum

**Visual description.** A horizontal gradient bar running from "Pure Config" (left, cool blue) to "Pure Code" (right, warm amber). Five tool logos are positioned along the bar at their approximate position on the spectrum. Below the bar, a panel shows what the plugin "looks like" at the currently selected position -- on the left, it's a JSON snippet; in the middle, it's a function registering callbacks; on the right, it's a class with lifecycle methods intercepting compiler internals.

**Animation design.** A draggable handle on the bar. As the reader drags it left to right, the code panel below cross-fades (TRANSITION.crossfade) between representative plugin code snippets at different points on the spectrum. The gradient bar has a subtle shimmer at the handle's position (CSS custom property animation, not framer-motion -- avoids layout thrashing). Tool logos along the bar glow when the handle passes near them (within ~10% of their position), using a box-shadow transition.

**Interaction model.** Drag the handle along the spectrum. The code panel updates in real time. Click a tool logo to snap the handle to that position and see that tool's representative plugin code. A caption below the code panel explains what this position on the spectrum means for composability, isolation, and evolvability.

**What it teaches.** The spectrum is continuous, not discrete. Tailwind's plugin system is "closer to config" than Webpack's, but both are valid designs for different reasons. The inline code comparison makes the *texture* of each approach tangible -- the reader sees what they'd actually write.

**Why static text fails.** Showing four separate code blocks doesn't communicate the *gradient* between them. The draggable handle makes the continuum physical.

**Component API (rough).**
```tsx
<ExtensibilitySpectrum
  points={[
    { tool: "tailwind", position: 0.15, code: "...", caption: "..." },
    { tool: "eslint", position: 0.45, code: "...", caption: "..." },
    { tool: "vite", position: 0.65, code: "...", caption: "..." },
    { tool: "webpack", position: 0.85, code: "...", caption: "..." },
  ]}
/>
```

#### Widget 1.3: The Tradeoff Pentagon

**Visual description.** A radar/spider chart with five axes corresponding to the evaluation framework dimensions: Composability, Isolation, Discoverability, Performance, Evolvability. The chart starts empty. As the reader selects tools from a small pill-bar above the chart, each tool's profile appears as a colored polygon on the radar chart. Up to three tools can be overlaid simultaneously.

**Animation design.** When a tool is toggled on, its polygon draws in vertex by vertex (STAGGER.fast between vertices, SPRING.gentle for each vertex's position). Polygons use semi-transparent fills so overlaps are visible. When a tool is toggled off, its polygon collapses to center (TRANSITION.enterCard, reversed). Axis labels have a subtle LOOP.breathe opacity animation to keep the chart feeling alive.

**Interaction model.** Click pills to toggle tools on/off (max 3 active). Hover a vertex to see a tooltip explaining that tool's score on that dimension with a one-sentence justification. The pills show which tools are active with an accent border.

**What it teaches.** No plugin system wins on every dimension. Webpack's tapable system scores high on power but lower on discoverability. Tailwind's config approach scores high on isolation but lower on plugin power. The overlaid polygons make tradeoffs between tools *directly comparable*.

**Why static text fails.** A prose comparison of five dimensions across four tools is 20 comparisons. The radar chart makes them simultaneous and visual.

**Component API (rough).**
```tsx
<TradeoffPentagon
  dimensions={["Composability", "Isolation", "Discoverability", "Performance", "Evolvability"]}
  tools={[
    { id: "vite", label: "Vite", scores: [4, 3, 4, 4, 3], color: "var(--color-accent-blue)" },
    { id: "eslint", label: "ESLint", scores: [3, 5, 4, 3, 4], color: "var(--color-accent-green)" },
    // ...
  ]}
  maxActive={3}
/>
```

### Critical Questions

- **Is the source code walkthrough at the right depth?** This post has no source code -- it's the framing post. The risk is being too abstract. Anchor every concept with a concrete one-sentence example from a real tool, even if the deep dive comes later.
- **What mental model should the reader have BEFORE this post?** They should have used at least one plugin (e.g., a Vite plugin or an ESLint config) as a consumer. They do NOT need to have written one.
- **Could this widget teach the concept without the accompanying prose?** The Design Space Map could, if the quadrant descriptions are rich enough. The Extensibility Spectrum definitely needs prose to explain WHY the spectrum exists. The Tradeoff Pentagon needs prose to explain what each dimension means.
- **Are we accidentally teaching the tool's API instead of the architectural pattern?** Low risk for this post since it's about the design space. But the Extensibility Spectrum widget must show representative code that illustrates the *pattern*, not the specific API. Use pseudocode-ish examples, not copy-paste-ready configs.

---

## Post 2: Vite -- Hook-Based Pipeline Architecture

### Narrative Arc

The reader arrives knowing Vite is "fast" and uses Rollup under the hood. They leave understanding WHY Vite's plugin system is shaped the way it is -- the dual-mode problem (dev server vs. production build), how Rollup compatibility constrains design, how virtual modules work, and how the hook ordering system lets plugins cooperate without coordination.

### Content Outline

**The Dual-Mode Problem.** Vite doesn't have one pipeline -- it has two. In dev, modules are served on-demand via native ESM. In production, they're bundled by Rollup. A Vite plugin must work in both modes, which means its hooks must be defined in terms of *what* they do (resolve a module, transform code, generate an asset) rather than *when* they run in a specific pipeline. This is the deep architectural insight: Vite's hooks are semantic operations, not temporal positions.

**The Rollup Compatibility Layer.** Vite deliberately makes its plugin interface a superset of Rollup's. A Rollup plugin works in Vite with zero changes. This is an opinionated design choice -- it sacrifices some dev-server-specific affordances in exchange for ecosystem compatibility. Walk through the specific hooks: `resolveId`, `load`, `transform`, `buildStart`, `buildEnd`. Show how each hook maps to a stage in both the dev and build pipelines.

**Annotated Source: The Plugin Container.** The `PluginContainer` is Vite's internal orchestrator. It iterates over plugins for each hook, handles ordering (`enforce: 'pre' | 'post'`), and manages the async pipeline. Walk through the actual source code (simplified/annotated) to show:

- How plugins are sorted by `enforce` into three buckets (pre, normal, post)
- How a hook like `resolveId` is called sequentially and short-circuits on the first non-null return
- How `transform` hooks are chained -- each receives the previous hook's output
- How `configureServer` gives plugins access to the dev server's middleware stack

**Virtual Modules.** One of Vite's most powerful patterns: plugins can create modules that don't exist on disk. Walk through how `resolveId` returns a virtual ID (prefixed with `\0`) and `load` provides the code. This is the pattern that powers `import.meta.env`, CSS modules, and dozens of community plugins.

**HMR Hooks.** The `handleHotUpdate` hook lets plugins intercept HMR events. Show how a plugin can filter which modules are marked as updated, inject new modules into the update, or trigger a full reload. This is the hook that makes HMR extensible rather than hardcoded.

### Interactive Widgets

#### Widget 2.1: The Vite Plugin Pipeline Visualizer

**Visual description.** A horizontal pipeline of rounded boxes representing Vite's build hooks in order: `config` -> `configResolved` -> `configureServer` -> `buildStart` -> `resolveId` -> `load` -> `transform` -> `buildEnd` -> `generateBundle` -> `writeBundle`. Each box is a stage. Below the pipeline, a sidebar area holds draggable "plugin cards" -- each card lists which hooks it implements (small dots colored to match the pipeline stages).

**Animation design.** The pipeline draws in left-to-right on mount (STAGGER.fast, TRANSITION.enterCard per box). Plugin cards sit in the sidebar with a gentle idle sway (LOOP.breathe on translateY, 2px amplitude). When a plugin card is dragged onto the pipeline, it snaps to a "plugin slot" below the pipeline and its hook dots animate outward to their corresponding stages with spring-connected lines (SPRING.snappy). The lines draw with a path-drawing animation (strokeDashoffset transition). When "Run Build" is clicked, a luminous dot travels left-to-right through the pipeline. At each stage, if a plugin has a hook there, the hook dot pulses (LOOP.pulse, 2 cycles) and the line between the plugin card and the stage glows. If the hook produces output, a small before/after diff tooltip appears above the stage for 1.5s before the dot moves on.

**Interaction model.** Drag plugin cards from sidebar into the pipeline. Reorder plugins to see how `enforce: 'pre' | 'post'` affects ordering (dragging a plugin to the "pre" zone moves it before normal plugins; "post" zone after). Click "Run Build" to animate the data flow. Click individual stages to see what data they receive and return. A "Show Code" toggle on each plugin card reveals its hook implementations as annotated code blocks.

**What it teaches.** The mental model of "plugins are hooks into a pipeline" is hard to build from prose alone. The animation of data flowing through stages with plugins firing at specific points makes the timing and ordering tangible. Dragging plugins and reordering them teaches the enforce system experientially.

**Why static text fails.** A table of hooks with descriptions tells you WHAT each hook does but not HOW they compose. The pipeline visualization shows the sequential flow and makes hook ordering a spatial concept.

**Component API (rough).**
```tsx
<PluginPipeline
  stages={[
    { id: "resolveId", label: "resolveId", description: "...", dataShape: "string -> string | null" },
    // ...
  ]}
  plugins={[
    {
      id: "my-plugin",
      label: "My Plugin",
      enforce: "pre",
      hooks: {
        resolveId: { code: "...", transform: (input) => output },
        transform: { code: "...", transform: (input) => output },
      },
    },
  ]}
  mode="build" // or "dev" to show the dev-mode pipeline
/>
```

#### Widget 2.2: The Dev vs. Build Split View

**Visual description.** Two vertical panels side-by-side. Left panel: "Dev Mode" -- shows the dev server pipeline (middleware stack, on-demand module resolution, HMR socket). Right panel: "Build Mode" -- shows the Rollup build pipeline (input -> plugins -> chunks -> output). Between them, vertical dashed lines connect the hooks that are shared between both modes. Hooks that only exist in one mode are visually distinct (outlined vs. filled).

**Animation design.** On mount, both panels build simultaneously from top to bottom (STAGGER.fast). Shared hooks glow in sync (same accent color) while mode-specific hooks use a muted tone. When the reader clicks a shared hook (e.g., `transform`), the dashed line between the two panels brightens and a tooltip appears in the center explaining "same hook, different context." The left panel can animate an incoming request (a dot entering the middleware stack and flowing through to module resolution), while the right panel animates a full build (all modules processed in batch). These animations run independently but can be triggered simultaneously to show the contrast.

**Interaction model.** Click any hook box to see its description and how its behavior differs between dev and build. Toggle a "Sync" switch to animate both panels simultaneously -- watching the dev request flow alongside the build pipeline flow highlights the temporal difference (on-demand vs. batch). A "Highlight Shared" button dims mode-specific hooks and brightens shared ones, making the Rollup compatibility surface visible.

**What it teaches.** Vite's plugin system serves two masters, and this is its deepest design tension. A Vite plugin author must understand that their `transform` hook runs on-demand in dev (called per-module when requested) vs. in-batch during build (called for every module in dependency order). This widget makes the timing difference visceral.

**Why static text fails.** Prose can say "the hook runs differently in dev vs. build." The side-by-side animation SHOWS what "differently" means -- on-demand vs. batch processing, middleware stack vs. Rollup pipeline. The timing difference is a fundamentally temporal concept that needs animation to communicate.

**Component API (rough).**
```tsx
<DevBuildSplit
  sharedHooks={["resolveId", "load", "transform", "buildStart", "buildEnd"]}
  devOnlyHooks={["configureServer", "handleHotUpdate", "transformIndexHtml"]}
  buildOnlyHooks={["generateBundle", "writeBundle", "renderChunk"]}
  devFlow={[ /* middleware stages */ ]}
  buildFlow={[ /* rollup stages */ ]}
/>
```

#### Widget 2.3: Virtual Module Explorer

**Visual description.** A split view. Left side: a file tree showing a project's source files. Right side: a code editor (MonacoCodeBlock or ShikiCodeViewer) showing the currently selected file's content. One file in the tree is marked with a ghost icon -- it's a virtual module (`virtual:my-config`). The virtual module has no file on disk; its "source" is generated by a plugin.

**Animation design.** When the reader clicks the virtual module in the file tree, the right panel doesn't load from disk -- instead, the plugin's `load` hook code fades in above the editor (TRANSITION.enterCard), showing the function that generates the module's content. Then the generated content types itself into the editor below, character by character (typewriter effect, 30ms per character, cancelable). A dotted line traces from the plugin code to the editor, labeled "generates." When the reader modifies the plugin's `resolveId` return value (editable inline), the generated content updates live.

**Interaction model.** Click files in the tree to view them normally. Click the virtual module to trigger the plugin visualization. Edit the plugin's configuration (a few controlled inputs: module name, exported values) and watch the generated code update in real time. A "Where does this run?" toggle switches between showing the virtual module in dev context (served via dev server) vs. build context (inlined by Rollup).

**What it teaches.** Virtual modules are Vite's most conceptually difficult feature for newcomers. The idea that a module can exist without a file, generated on-the-fly by a plugin, is abstract until you see the pipeline: `import 'virtual:x'` -> `resolveId` returns `'\0virtual:x'` -> `load` generates the code. This widget makes the generation visible.

**Why static text fails.** Code blocks can show the plugin and the generated code separately. But the causal relationship -- this plugin function produces this module content -- needs the visual connection (the dotted line, the typewriter generation) to feel real.

**Component API (rough).**
```tsx
<VirtualModuleExplorer
  files={[
    { path: "src/main.ts", content: "import config from 'virtual:my-config';\n..." },
    { path: "virtual:my-config", virtual: true, generator: { resolveId: "...", load: "..." } },
  ]}
  editableFields={["moduleName", "exportedValues"]}
/>
```

### Critical Questions

- **Is the source code walkthrough at the right depth?** The PluginContainer walkthrough should show the *orchestration logic* (how hooks are called in order, how short-circuiting works), not the full source. ~30-40 annotated lines, not 300. Use CodeAnnotator to highlight the key patterns.
- **What mental model should the reader have BEFORE this post?** They should have read Post 1 (the design space framing). They should understand what "hook-based pipeline" means in the abstract. They should have used Vite as a user (configured `vite.config.ts` with at least one plugin).
- **Could this widget teach the concept without the accompanying prose?** The Pipeline Visualizer could teach hook ordering without prose. The Dev/Build Split needs prose to explain WHY there are two modes (the performance motivation). The Virtual Module Explorer needs prose to motivate when you'd want a virtual module.
- **Are we accidentally teaching the tool's API instead of the architectural pattern?** High risk here. The hook names (`resolveId`, `load`, `transform`) are Vite-specific, but the PATTERN (sequential hook pipeline with short-circuiting, plugin ordering, input/output contracts) is transferable. The prose must keep returning to the pattern. The widgets should have a "pattern" layer that names the general technique alongside the Vite-specific implementation.

---

## Post 3: ESLint -- Visitor Pattern Over AST

### Narrative Arc

The reader arrives knowing ESLint as "the thing that underlines my code in red." They leave understanding that ESLint is fundamentally a tree-walking machine, that rules are visitors over an AST, and that this architecture -- separating *traversal* from *inspection* -- is one of the most powerful and reusable patterns in software design. The flat config migration story serves as a case study in API evolution.

### Content Outline

**The AST as Common Ground.** ESLint doesn't operate on text -- it operates on a tree. The parser (Espree, or a custom parser like `@typescript-eslint/parser`) produces an AST. Every rule is a function that receives the tree walker and says "when you hit a node of type X, call me." This is the visitor pattern, and it's the reason ESLint can have 300+ rules that don't know about each other -- they all operate on the same tree independently.

**Annotated Source: The Rule Context.** A rule is a factory function that returns an object mapping node types to handler functions. Walk through a real rule (e.g., `no-unused-vars` simplified) to show:

- The `create(context)` function and what `context` provides (scope, source code, settings, report)
- How `context.report()` works -- the plugin doesn't fix anything directly; it reports a violation with location, message, and optionally a fixer
- How the visitor keys map to AST node types (e.g., `VariableDeclaration`, `Identifier`, `FunctionExpression`)

**The Traversal Engine.** ESLint walks the AST depth-first. For each node, it calls all registered visitors for that node type. Crucially, plugins don't control traversal order -- the host does. This is the key isolation mechanism: plugins can't skip nodes, can't reorder traversal, can't see each other's state. They can only observe and report.

**How Fixers Work.** When `context.report()` includes a `fix` function, ESLint can auto-fix. But fixers are constrained: they can only insert, replace, or remove text ranges. They don't modify the AST directly. Walk through why this constraint exists (AST mutation during traversal is unsafe) and how ESLint handles conflicting fixes (last one wins, with overlap detection).

**The Flat Config Migration.** ESLint's move from `.eslintrc` (cascading config files) to `eslint.config.js` (flat array of config objects) is a case study in plugin system evolution. The old system had implicit inheritance, plugin resolution via strings, and environment-based globals. The new system is explicit, programmatic, and composable. Walk through what changed architecturally and why -- the old system's complexity grew from features that seemed simple individually but interacted unpredictably.

**Shared Settings and Cross-Rule Communication.** Rules are isolated, but sometimes they need shared context (e.g., the React version for `eslint-plugin-react`). ESLint provides `context.settings` as a controlled channel. This is a deliberate design choice -- rules share read-only configuration, not mutable state.

### Interactive Widgets

#### Widget 3.1: The AST Visitor Walkthrough

**Visual description.** Left panel: a code editor showing a small JavaScript snippet (maybe 10-15 lines with a few lint issues -- unused variable, missing semicolon, `console.log`). Right panel: the AST of that code rendered as a collapsible tree. Below both panels: a "rules" bar showing three rule cards (e.g., `no-unused-vars`, `semi`, `no-console`), each with a colored indicator.

**Animation design.** Click "Run Linter" and the AST tree illuminates node by node in depth-first order (STAGGER.fast, each node getting a brief highlight flash). When a node matches a rule's visitor key, the corresponding rule card pulses (SPRING.quick) and a colored marker appears on the node AND on the corresponding location in the source code (left panel). The markers animate in with SPRING.snappy. After the full traversal completes, all violations are visible as colored underlines in the source code and colored badges on AST nodes. The traversal speed is controllable via a playback speed slider.

**Interaction model.** Edit the source code and the AST updates live (debounced 300ms). Click "Run Linter" to animate the traversal. Click a violation marker to see the rule's `context.report()` call with the message and location. Toggle rules on/off in the rules bar to see which violations appear/disappear. Click "Step" instead of "Run" to advance one AST node at a time -- at each step, the reader sees which rules are checking this node and whether any fire.

**What it teaches.** The separation between traversal and inspection. The reader sees that the ENGINE walks the tree, and the RULES just react to the nodes they care about. This is the visitor pattern made visible. The step mode makes it especially clear: the rule doesn't drive traversal -- it waits to be called.

**Why static text fails.** The visitor pattern is a temporal concept -- it's about WHEN things happen during a traversal. A diagram can show the tree structure, but only animation can show the traversal sequence and the timing of rule firings relative to the walk.

**Component API (rough).**
```tsx
<ASTVisitorWalkthrough
  initialCode={`const x = 1;\nconsole.log("hello")\nfunction unused() {}`}
  rules={[
    { id: "no-unused-vars", visitorKeys: ["VariableDeclarator", "FunctionDeclaration"], color: "var(--color-accent-amber)" },
    { id: "semi", visitorKeys: ["ExpressionStatement", "VariableDeclaration"], color: "var(--color-accent-blue)" },
    { id: "no-console", visitorKeys: ["MemberExpression"], color: "var(--color-accent-red)" },
  ]}
  playbackSpeed={1}
/>
```

#### Widget 3.2: The Fixer Sandbox

**Visual description.** Top: a source code editor with lint violations highlighted. Below: a "Fix Queue" panel showing each pending fix as a card. Each card shows: the rule that produced it, the text range it targets (highlighted in the source), and the replacement text. At the bottom: a "before/after" diff view.

**Animation design.** When fixes are applied, they animate in sequence: the first fix's range highlights in the source (accent glow, SPRING.quick), then the text transforms (old text fades out, new text fades in, TRANSITION.crossfade). If two fixes overlap, the second fix's card gets a red "conflict" border animation (SPRING.quick shake) and a tooltip explaining that ESLint discards conflicting fixes and re-runs. The before/after diff panel updates with each fix, showing the cumulative result.

**Interaction model.** The reader can reorder fix cards in the queue by dragging to explore how order affects the outcome. They can edit a fix's replacement text to see what happens (the diff updates live). A "Simulate Conflict" button adds a second fix that overlaps with the first, triggering the conflict animation and the re-run explanation. A toggle switches between "apply all" (instant) and "apply one-by-one" (animated sequence).

**What it teaches.** ESLint fixers operate on text ranges, not on the AST. This is subtle but important: fixes are text-level operations applied after AST analysis. The conflict handling (discard and re-run) is a direct consequence of this design. The widget makes the text-range abstraction tangible.

**Why static text fails.** The concept of overlapping text ranges is spatial. Prose can describe it, but seeing two highlighted ranges overlap in the source code, and watching the conflict resolution play out, builds genuine understanding.

**Component API (rough).**
```tsx
<FixerSandbox
  initialCode={`var x = 1\nconsole.log(x)`}
  fixes={[
    { rule: "semi", range: [9, 9], replacement: ";", message: "Missing semicolon" },
    { rule: "no-var", range: [0, 3], replacement: "const", message: "Use const instead of var" },
  ]}
  conflictScenario={{ /* overlapping fix definition */ }}
/>
```

#### Widget 3.3: Flat Config Composer

**Visual description.** A vertical stack of "config layer" cards. Each card represents one config object in the flat array (e.g., "base rules", "TypeScript overrides", "test file overrides"). Each card shows its `files` glob pattern, its `rules` (as toggle pills), and its `plugins` (as small icons). At the bottom: a "resolved config" panel showing the final merged configuration for a selected file.

**Animation design.** When the reader selects a file path from a small file tree on the side, the config layers that match that file's path illuminate (border glow, SPRING.gentle) while non-matching layers dim (opacity 0.4, TRANSITION.enterCard). The resolved config panel builds incrementally: the base layer's rules appear first, then each matching layer's overrides animate in on top (later layers' rules slide in and push/replace earlier ones with a flip animation). This shows the flat, top-to-bottom merge order.

**Interaction model.** Drag config layer cards to reorder them -- the resolved config updates live, showing how order matters. Click rule pills to toggle them on/off and see the resolved config change. Add a new layer card with a "+" button, select its file glob and rules. Select different files from the file tree to see which layers match. A "Show Legacy Equivalent" toggle displays the equivalent `.eslintrc` cascading config side-by-side, highlighting how implicit inheritance becomes explicit ordering.

**What it teaches.** The flat config is "just an array." The merge is top-to-bottom, last-match-wins. There's no inheritance, no cascading, no `extends` resolution. But this simplicity has consequences for how plugins compose -- and this widget lets the reader experiment with those consequences.

**Why static text fails.** Config merging is inherently about layer ordering. Prose can say "later configs override earlier ones," but dragging layers and watching the resolution change makes the ordering tangible. The legacy comparison panel shows WHY the migration happened -- the cascading model's complexity becomes visible.

**Component API (rough).**
```tsx
<FlatConfigComposer
  layers={[
    { label: "Base", files: ["**/*.js"], rules: { "semi": "error", "no-console": "warn" }, plugins: [] },
    { label: "TypeScript", files: ["**/*.ts"], rules: { "semi": "off" }, plugins: ["@typescript-eslint"] },
    { label: "Tests", files: ["**/*.test.*"], rules: { "no-console": "off" }, plugins: [] },
  ]}
  fileTree={["src/index.ts", "src/utils.js", "tests/index.test.ts"]}
/>
```

### Critical Questions

- **Is the source code walkthrough at the right depth?** The rule context walkthrough should show one real rule (simplified), not the ESLint core traversal engine. The reader should understand how to WRITE a visitor, not how the tree walker works internally. The walker is an implementation detail; the visitor contract is the architectural insight.
- **What mental model should the reader have BEFORE this post?** They need to know what an AST is (tree representation of code, nodes have types). They do NOT need to know ESTree or parser internals. A brief AST primer in the first section is warranted -- 4-5 sentences, not a full explainer.
- **Could this widget teach the concept without the accompanying prose?** The AST Visitor Walkthrough could teach the traversal/visitor split without prose -- it's self-evident when you watch it. The Fixer Sandbox needs prose to explain why fixes are text-range-based. The Flat Config Composer needs prose to motivate the migration.
- **Are we accidentally teaching the tool's API instead of the architectural pattern?** Medium risk. The visitor pattern IS the architectural pattern, and ESLint IS the example, so the boundary is thin. The prose must explicitly name the pattern ("this is the visitor pattern -- GoF, 1994") and note where else it appears (Babel, Prettier, compiler passes). The widgets should feel transferable: "you could build this same traversal-plus-visitors system for any tree structure."

---

## Post 4: Tailwind -- Config-Driven Extensibility

### Narrative Arc

The reader arrives knowing Tailwind as "utility classes." They leave understanding that Tailwind's plugin system is fundamentally different from hook-based or visitor-based systems -- it's *registration*, not *interception*. A Tailwind plugin doesn't hook into a pipeline or visit a tree. It tells the engine "here are new things that exist," and the engine handles the rest. This is the config-based extensibility pattern at its purest.

### Content Outline

**Registration vs. Interception.** In Vite, a plugin intercepts data flowing through a pipeline. In ESLint, a plugin visits nodes during a traversal. In Tailwind, a plugin *registers new entries* -- utilities, components, variants, base styles -- into the engine's vocabulary. The plugin never touches the CSS generation pipeline directly. It hands the engine new raw materials, and the engine's existing machinery (JIT compiler, variant system, specificity management) processes them.

**The Plugin API Surface.** Walk through what a Tailwind plugin can register:

- `addUtilities()` -- new atomic utility classes (e.g., `.skew-15`)
- `addComponents()` -- multi-property component classes (e.g., `.btn`)
- `addBase()` -- base/reset styles
- `addVariant()` -- new variant selectors (e.g., `hocus:` for hover+focus)
- `matchUtilities()` -- dynamic utilities that accept arbitrary values
- `theme()` / `config()` -- reading the resolved configuration

**Annotated Source: How Registration Becomes CSS.** Walk through the JIT compiler's role. When a Tailwind plugin calls `addUtilities()`, the utility definitions are stored in a registry. The JIT compiler scans source files for class names, looks them up in the registry, and generates only the CSS that's actually used. This is the key insight: registration is *lazy*. The plugin defines what COULD exist; the JIT compiler decides what DOES exist based on usage.

**The Theme System as Plugin Infrastructure.** Tailwind's `theme` configuration is itself a plugin system. The `extend` key lets you add to the default theme without replacing it. Theme values are consumed by both core utilities and plugin-registered utilities. Walk through how `theme()` resolution works -- the merge order, the `extend` semantics, the closure-based dynamic values.

**Variants as a Composition System.** Variants (`hover:`, `dark:`, `md:`) are Tailwind's answer to the combinatorial explosion problem. A plugin that registers one utility and one variant creates one utility that works with ALL existing variants, and one variant that works with ALL existing utilities. Walk through how this multiplicative composition works architecturally -- the variant system wraps utilities in selectors, and the JIT compiler handles the combinations.

**The `@apply` Paradox.** `@apply` lets you use Tailwind utilities inside custom CSS. But this creates a dependency inversion: the CSS file depends on the utility registry, which depends on the config, which depends on plugins. Walk through the compilation order and why `@apply` of plugin-registered utilities sometimes fails.

### Interactive Widgets

#### Widget 4.1: The Utility Registration Visualizer

**Visual description.** Three columns. Left: a code editor showing a Tailwind plugin definition (the `plugin()` function with `addUtilities`, `addComponents`, `addVariant` calls). Center: a "Registry" panel -- a structured list showing the registered utilities, components, and variants as expandable cards. Right: a "Generated CSS" panel showing the output CSS for a given set of class names.

**Animation design.** As the reader types or modifies the plugin code (left panel), new registry entries animate into the center panel (SPRING.snappy, slide-in from left). Each entry has a type badge (utility/component/variant/base) with a color-coded accent. When the reader types class names into a small input field above the right panel, the JIT compiler "scans" the input (a scanning line animation, left-to-right across the input, TRANSITION.progress), matches against the registry (matched entries in the center panel pulse, SPRING.quick), and the generated CSS appears in the right panel with a typewriter effect. Unmatched class names get a subtle red underline.

**Interaction model.** Edit the plugin code to register new utilities. Type class names in the "usage" input to see what CSS is generated. Click a registry entry to see its definition and which class names would activate it. A "Show All vs. Show Used" toggle on the registry panel demonstrates the JIT principle: "registered" is not "generated." Only used utilities produce CSS. A counter shows "X registered / Y used / Z bytes generated."

**What it teaches.** The separation between registration and generation. The reader viscerally experiences that `addUtilities()` doesn't CREATE CSS -- it registers potential CSS. The JIT compiler creates CSS only when it sees usage. This is the core insight of config-based extensibility: the plugin defines vocabulary, the engine decides what to emit.

**Why static text fails.** The three-stage pipeline (define -> register -> generate-on-use) is a process that unfolds over time. Static code blocks can show the plugin and the output CSS, but they can't show the JIT scanning step in between -- the moment where the engine decides WHICH of the registered utilities to actually generate.

**Component API (rough).**
```tsx
<UtilityRegistrationVisualizer
  initialPlugin={`plugin(function({ addUtilities }) {\n  addUtilities({\n    '.skew-15': { transform: 'skewY(-15deg)' },\n  })\n})`}
  initialUsage="skew-15 bg-blue-500 p-4"
  coreUtilities={["bg-*", "p-*", "m-*", "text-*"]}
/>
```

#### Widget 4.2: The Variant Multiplication Table

**Visual description.** A grid/matrix. Rows are utilities (e.g., `bg-blue-500`, `text-white`, `skew-15`). Columns are variants (e.g., `hover:`, `dark:`, `md:`, `focus:`, and a custom plugin-registered variant). Each cell shows whether that combination produces valid CSS. The grid starts with core utilities and variants, and the reader can add custom ones.

**Animation design.** When the reader adds a new utility (row) via the plugin editor, the new row slides in from the left (SPRING.gentle) and all cells in that row fill simultaneously with a stagger (STAGGER.fast, left to right). When a new variant (column) is added, the column slides in from the top and cells fill top-to-bottom. The filling animation is a small pop (scale 0 -> 1, SPRING.snappy) with a color fill. Hovering a cell reveals the generated CSS selector in a tooltip. The key visual: adding ONE utility adds an entire ROW. Adding ONE variant adds an entire COLUMN. The multiplicative nature is immediately visible.

**Interaction model.** Add utilities and variants via small input forms. Click any cell to see the generated CSS. A running counter shows "X utilities x Y variants = Z combinations, but only N used" to reinforce the JIT principle. A "Custom Variant" builder lets the reader define a variant's selector (e.g., `.parent:hover &` for a `parent-hover:` variant) and watch the entire column populate.

**What it teaches.** Tailwind's composition is multiplicative, not additive. One new utility doesn't add one class -- it adds N classes (one per variant). One new variant doesn't add one modifier -- it adds M modifiers (one per utility). This is Tailwind's architectural superpower, and it's why config-based registration is so powerful here: the engine handles the combinatorics.

**Why static text fails.** The multiplicative relationship is mathematical. Prose says "variants compose with utilities." The grid SHOWS the multiplication. Adding one row and watching an entire line of cells appear is a moment of genuine insight that prose can't replicate.

**Component API (rough).**
```tsx
<VariantMultiplicationTable
  initialUtilities={["bg-blue-500", "text-white", "p-4"]}
  initialVariants={["hover", "focus", "dark", "md"]}
  customVariantBuilder={true}
  showGeneratedCSS={true}
/>
```

#### Widget 4.3: Config Resolution Explorer

**Visual description.** A layered card stack showing the Tailwind configuration merge order: "Default Theme" (bottom, dimmed), "User Config" (middle), "Plugin Extensions" (top). Each card shows a subset of theme values (colors, spacing, etc.) as key-value pills. Where a higher layer overrides a lower one, the pill is highlighted with an accent border. Where `extend` is used, a "+" indicator shows the value was added alongside the defaults rather than replacing them.

**Animation design.** The card stack starts collapsed (only top card visible). Click "Expand" and the cards fan out vertically (SPRING.gentle, staggered 150ms). Override relationships are shown with connecting lines between the overriding pill and the overridden pill below it (line draws on expand, TRANSITION.progress). The `extend` vs. `replace` distinction is animated: when the reader toggles a config value between `extend` and `replace` mode, the default theme's corresponding pills either stay (extend -- pill has a green checkmark that animates in) or fade out (replace -- pill shrinks to nothing, SPRING.quick). The resolved theme (shown in a separate "Result" panel) updates live.

**Interaction model.** Toggle individual theme keys between "extend" and "replace." Add new theme values via inline inputs. Click any resolved value to trace its origin (the source card highlights and a dotted line connects them). A "Plugin View" toggle adds a third layer showing how plugin-registered theme values merge into the stack.

**What it teaches.** Tailwind's theme resolution is a layered merge, and the `extend` vs. `replace` distinction is the most common source of config bugs. The visual layering makes the merge order intuitive. The tracing interaction ("where did this value come from?") builds debugging intuition.

**Why static text fails.** Config merge orders are notoriously hard to explain in prose. "Plugin values merge after user config but before defaults" is technically correct but doesn't build intuition. The stacked cards make the ordering spatial and the tracing makes the origin of any value discoverable.

**Component API (rough).**
```tsx
<ConfigResolutionExplorer
  defaultTheme={{ colors: { blue: { 500: "#3b82f6" } }, spacing: { 4: "1rem" } }}
  userConfig={{ theme: { extend: { colors: { brand: "#ff6b35" } } } }}
  pluginExtensions={{ utilities: ["skew-*"], themeKeys: ["skewAngle"] }}
/>
```

### Critical Questions

- **Is the source code walkthrough at the right depth?** Show the plugin API surface (what you call), not the JIT internals (how scanning works). The reader should be able to write a Tailwind plugin after reading this post. The JIT compiler is context, not the lesson.
- **What mental model should the reader have BEFORE this post?** They should have used Tailwind's utility classes and understood the `tailwind.config.js` file. They should have read Post 1 (to know where config-based extensibility sits in the design space). They do NOT need CSS-in-JS experience.
- **Could this widget teach the concept without the accompanying prose?** The Variant Multiplication Table could -- the multiplicative insight is purely visual. The Utility Registration Visualizer needs prose to explain why registration != generation (the JIT step). The Config Resolution Explorer needs prose to motivate why merging is complex.
- **Are we accidentally teaching the tool's API instead of the architectural pattern?** Medium-high risk. Tailwind's plugin API is simple enough that teaching the API IS teaching the pattern (registration). But the prose must generalize: "This registration pattern appears in PostCSS, in VS Code themes, in any system where plugins extend vocabulary rather than intercept behavior." Name the pattern explicitly.

---

## Post 5: Webpack -- The Tapable Hook System

### Narrative Arc

The reader arrives knowing Webpack as "the complicated bundler." They leave understanding that Webpack's complexity comes from its *ambition* -- it models the entire build process as a graph of hookable events, and this graph is the most powerful (and most complex) plugin architecture in the JavaScript ecosystem. The tapable system is the architectural core, and the compiler/compilation lifecycle is how plugins navigate it.

### Content Outline

**Tapable: An Event System for Build Tools.** Webpack's plugin system is built on `tapable`, a standalone library that provides typed, synchronous and asynchronous hook primitives. Walk through the hook types:

- `SyncHook` -- fire-and-forget, plugins observe
- `SyncBailHook` -- first non-undefined return short-circuits
- `SyncWaterfallHook` -- each plugin's return becomes the next plugin's input (pipeline)
- `AsyncSeriesHook` / `AsyncParallelHook` -- async equivalents
- `AsyncSeriesBailHook` / `AsyncSeriesWaterfallHook` -- async with flow control

This taxonomy IS the lesson. Each hook type encodes a different contract between the host and plugins. The waterfall is a pipeline. The bail hook is a decision point. The parallel hook is a fan-out. Webpack's architecture is *composed* from these primitives.

**The Compiler and Compilation.** Webpack has two main objects plugins interact with:

- `Compiler` -- the long-lived build orchestrator. Created once, survives across rebuilds (in watch mode). Hooks: `run`, `compile`, `make`, `emit`, `done`.
- `Compilation` -- the per-build context. Created fresh for each build. Contains the module graph, chunks, assets. Hooks: `buildModule`, `succeedModule`, `seal`, `optimize`, `afterOptimize`.

Walk through a plugin's `apply(compiler)` method to show how plugins tap into these hooks. The two-object split is an architectural choice: long-lived state (compiler) vs. per-build state (compilation). This separation is what makes watch mode and HMR possible.

**Annotated Source: A Real Webpack Plugin.** Walk through `DefinePlugin` (or a similarly instructive plugin) to show:

- The `apply(compiler)` entry point
- Tapping into `compilation.hooks.seal` to access the module graph
- Using `compilation.hooks.optimizeModules` to transform code
- How the plugin accesses and modifies the module graph without breaking other plugins

**Loader vs. Plugin.** Loaders transform individual files (one-in, one-out). Plugins tap into the build lifecycle. Loaders are middleware (chained, per-file). Plugins are event listeners (lifecycle-wide). Walk through why the distinction exists: loaders are simple and composable (any transform chain works); plugins need access to the whole build graph.

**The Loader Chain as Middleware.** Loaders execute right-to-left (or bottom-to-top in config). Each loader receives the previous loader's output. This is the middleware pattern applied to file transformation. Walk through a chain: `sass-loader` -> `css-loader` -> `style-loader`, showing how each stage transforms the content.

### Interactive Widgets

#### Widget 5.1: The Tapable Hook Type Explorer

**Visual description.** A horizontal panel showing all tapable hook types as interactive cards. Each card has: the hook type name, a small animated diagram showing its flow pattern (pipeline for waterfall, short-circuit for bail, parallel lines for parallel), and a "Try It" button. Below the cards: a sandbox area where the selected hook type is demonstrated with a live example.

**Animation design.** Each hook type card has a perpetually looping micro-animation showing its flow pattern:

- SyncHook: dots flowing in sequence, each passing through a handler (LOOP.breathe timing)
- SyncBailHook: dots flowing in sequence, one handler lights up red and the flow stops (loop with pause)
- SyncWaterfallHook: a dot enters handler 1, transforms color (blue -> green), enters handler 2, transforms again (green -> amber), exits (continuous loop)
- AsyncParallelHook: a dot enters, splits into three parallel tracks, all three complete, a merge point activates (continuous loop)

When "Try It" is clicked, the sandbox below shows 3-4 plugin handlers tapping the hook. A "Fire Hook" button triggers the hook, and the sandbox animates the actual execution: each handler highlights in sequence (or parallel), showing return values, short-circuits, or waterfall transformations.

**Interaction model.** Click hook type cards to select them. In the sandbox, edit handler code (simplified -- each handler is a one-liner). Add/remove handlers. Click "Fire Hook" to see the execution. For waterfall hooks, the input value visibly transforms as it passes through handlers. For bail hooks, the reader can toggle which handler returns a value to see where the short-circuit happens. For parallel hooks, the reader can set async delays on each handler to see the timing diagram.

**What it teaches.** Tapable's hook types are not just "sync vs. async." They encode different *collaboration patterns* between plugins. The waterfall is "each plugin transforms the previous output." The bail hook is "the first plugin that has an answer wins." The parallel hook is "everyone works simultaneously." These patterns are reusable beyond Webpack.

**Why static text fails.** The difference between hook types is fundamentally about *flow* -- how data moves through handlers, when execution stops, how results combine. Animated flow diagrams communicate this instantly. A prose description of "SyncBailHook calls handlers in sequence and stops at the first non-undefined return" is correct but doesn't build the spatial/temporal intuition that the animation does.

**Component API (rough).**
```tsx
<TapableHookExplorer
  hookTypes={[
    {
      name: "SyncHook",
      description: "Fire-and-forget. All handlers called, returns ignored.",
      flowPattern: "sequential-passthrough",
      sandbox: {
        handlers: [
          { label: "Plugin A", code: "console.log('A')" },
          { label: "Plugin B", code: "console.log('B')" },
        ],
      },
    },
    // ...
  ]}
/>
```

#### Widget 5.2: The Compiler/Compilation Lifecycle

**Visual description.** A vertical timeline (top to bottom) representing the Webpack build lifecycle. The timeline has two swim lanes: "Compiler" (left, persistent -- shown as a solid vertical bar) and "Compilation" (right, ephemeral -- shown as a dashed vertical bar that appears and disappears for each build). Hooks are positioned along the timeline as labeled nodes. Plugin "taps" are shown as small colored dots on hook nodes, with lines connecting to plugin cards on the far right.

**Animation design.** On mount, the Compiler swim lane draws top-to-bottom (TRANSITION.progress). When "Start Build" is clicked, the Compilation swim lane fades in (TRANSITION.enterCard) and hooks fire in sequence down the timeline. Each hook node emits a pulse (SPRING.quick) when it fires. Plugin dots on that hook pulse simultaneously. The data being processed (module graph, chunks, assets) is represented as a small icon that evolves as it moves down the timeline: raw files at the top, module graph in the middle, optimized chunks near the bottom, emitted assets at the end. After the build completes, clicking "Rebuild" shows the Compilation lane disappearing and a new one appearing -- the Compiler persists, the Compilation is fresh. This teaches the long-lived vs. ephemeral distinction.

**Interaction model.** Click any hook node to see its documentation, which plugins have tapped it, and what data is available at that point. Click "Start Build" for the full animation. Click "Rebuild" to see the Compilation lifecycle repeat while the Compiler persists. A "Watch Mode" toggle starts a repeating rebuild cycle. Plugin cards on the right can be dragged to hook nodes to "tap" them -- this adds a dot to the hook and the plugin's handler fires during the next build animation.

**What it teaches.** The two-object model (Compiler vs. Compilation) and the build lifecycle. The reader sees that hooks fire in a specific order, that different hooks have access to different data, and that the Compilation is per-build while the Compiler is persistent. The drag-to-tap interaction teaches how plugins register themselves.

**Why static text fails.** The lifecycle is a 20+ step sequence with two interleaved swim lanes. A prose list of hooks is unreadable. The visual timeline with animation makes the ordering, timing, and swim-lane distinction immediately comprehensible.

**Component API (rough).**
```tsx
<CompilerCompilationLifecycle
  compilerHooks={["environment", "afterEnvironment", "entryOption", "afterPlugins", "run", "compile", "make", "afterCompile", "emit", "done"]}
  compilationHooks={["buildModule", "succeedModule", "finishModules", "seal", "optimize", "optimizeModules", "optimizeChunks", "afterOptimize"]}
  plugins={[
    { id: "define", label: "DefinePlugin", taps: { "compilation.seal": "...", "compilation.optimizeModules": "..." } },
    { id: "html", label: "HtmlWebpackPlugin", taps: { "compiler.emit": "..." } },
  ]}
/>
```

#### Widget 5.3: The Loader Chain Simulator

**Visual description.** A horizontal chain of "loader" boxes connected by arrows. On the far left: a raw file (e.g., `styles.scss`). On the far right: the final output (e.g., a `<style>` tag in JS). Each loader box has a label, a before/after content preview, and an expand toggle to see the loader's transformation logic.

**Animation design.** Click "Process File" and the raw file content (shown as a small code block) slides into the first loader from the left (SPRING.gentle). Inside the loader box, the content visually transforms (syntax highlighting changes, structure changes -- shown as a morph animation between the two code states). The transformed content slides out the right side into the next loader. Each loader's before/after is captured and shown inline. The chain executes right-to-left (matching Webpack's actual execution order), which is deliberately counterintuitive -- an annotation explains "loaders execute bottom-to-top / right-to-left, like function composition: `style(css(sass(file)))`."

**Interaction model.** Add/remove/reorder loaders in the chain. The reader starts with a preset chain (`sass-loader -> css-loader -> style-loader`) but can swap loaders, add a `postcss-loader` in the middle, or remove `style-loader` to see what happens. Each loader has a brief description of its transformation. An "Explain Direction" button highlights the right-to-left execution and the function composition analogy. The reader can also define a trivial custom loader (a text input that's a simple find-replace) and insert it into the chain.

**What it teaches.** Loaders are middleware -- specifically, they're function composition applied to file content. The right-to-left execution order is the single most confusing aspect of Webpack loaders, and this widget makes it physical. The ability to reorder and see the output change teaches why order matters (CSS modules before PostCSS produces different results than after).

**Why static text fails.** Loader execution order is counterintuitive (bottom-to-top in config, right-to-left in execution). Prose can say "loaders compose like functions," but watching content flow through the chain, transforming at each stage, and seeing the output change when you reorder -- that's experiential learning.

**Component API (rough).**
```tsx
<LoaderChainSimulator
  initialFile={{ name: "styles.scss", content: "$color: blue;\n.header { color: $color; }" }}
  initialChain={[
    { id: "sass", label: "sass-loader", transform: (scss) => compiledCSS },
    { id: "css", label: "css-loader", transform: (css) => moduleCSS },
    { id: "style", label: "style-loader", transform: (css) => jsStyleTag },
  ]}
  availableLoaders={[
    { id: "postcss", label: "postcss-loader", transform: (css) => autoprefixedCSS },
    { id: "custom", label: "Custom Loader", editable: true },
  ]}
/>
```

### Critical Questions

- **Is the source code walkthrough at the right depth?** The tapable hook types need to be shown at the API level (how you tap, what you receive). The Compiler/Compilation lifecycle should show one real plugin's `apply()` method. Do NOT walk through Webpack's internal module resolution or chunk splitting -- that's internals, not architecture.
- **What mental model should the reader have BEFORE this post?** They should understand the build pipeline concept from Post 2 (Vite). They should know what a bundler does at a high level (resolve dependencies, combine files, optimize). They do NOT need to have configured Webpack extensively.
- **Could this widget teach the concept without the accompanying prose?** The Tapable Hook Explorer could -- the animations are self-explanatory. The Lifecycle widget needs prose to explain WHY there are two objects and what data each has. The Loader Chain needs a brief prose explanation of the right-to-left convention.
- **Are we accidentally teaching the tool's API instead of the architectural pattern?** High risk for this post. Webpack has SO MUCH API surface that it's easy to get lost in specifics. The tapable hook types are the transferable pattern -- they're a library, not Webpack-specific. The Compiler/Compilation split is the architectural insight. Keep returning to the pattern: "this is an event system with typed channels."

---

## Post 6: Synthesis -- Design Your Own Plugin System

### Narrative Arc

The reader arrives having internalized four concrete plugin architectures. They leave with a decision framework for choosing (or designing) a plugin system, a tradeoffs matrix, and the confidence to evaluate any new tool's extensibility model. This post is less about new information and more about *organizing* what they've learned.

### Content Outline

**The Four Patterns, Distilled.** One paragraph each, now written as patterns rather than tool descriptions:

- **Pipeline (Vite/Rollup):** Define stages, let plugins hook into stages, flow data through. Best when: the host has a clear sequential process and plugins need to transform data at specific points.
- **Visitor (ESLint):** Build a data structure, walk it, let plugins react to nodes. Best when: the host operates on a tree/graph and plugins need to inspect or annotate without controlling traversal.
- **Registration (Tailwind):** Let plugins extend the host's vocabulary by declaring new entries. Best when: the host has a well-defined domain (utility classes, rules, themes) and plugins add to it rather than modifying behavior.
- **Event System (Webpack/tapable):** Expose a rich graph of typed events, let plugins tap any event. Best when: the host has a complex lifecycle with many extension points and plugins may need to coordinate.

**The Decision Framework.** A flowchart for choosing a pattern:

1. Does your host have a linear pipeline? -> Pipeline
2. Does your host operate on a tree structure? -> Visitor
3. Is your host's domain a finite vocabulary that plugins extend? -> Registration
4. Is your host's lifecycle complex with many independent extension points? -> Event System
5. Does your host need multiple patterns? -> Most real systems do. Vite uses Pipeline + Registration (virtual modules). Webpack uses Event System + Middleware (loaders). ESLint uses Visitor + Registration (flat config).

**The Tradeoffs Matrix.** A structured comparison across the five evaluation dimensions from Post 1:

| Dimension | Pipeline | Visitor | Registration | Event System |
|---|---|---|---|---|
| Composability | High (ordered) | High (independent) | Very High (multiplicative) | Medium (depends on hook types) |
| Isolation | Medium (shared data) | High (no shared state) | Very High (no interception) | Low (shared compiler state) |
| Discoverability | High (stages are named) | High (node types are documented) | Very High (API is small) | Low (many hooks, deep graph) |
| Performance | Medium (per-stage overhead) | Medium (per-node overhead) | High (lazy generation) | Low (per-hook, per-plugin overhead) |
| Evolvability | Medium (stages are contracts) | High (tree schema is stable) | High (engine internals hidden) | Low (hooks are contracts) |

**Designing Your Own: A Worked Example.** Walk through designing a plugin system for a hypothetical tool (e.g., a static site generator, a test runner, or a CLI tool). Apply the decision framework. Choose a pattern. Define the plugin interface. Identify the tradeoffs. Show what the plugin authoring experience looks like.

**Anti-Patterns.** Common mistakes in plugin system design:

- **Exposing too much:** making internals hookable that should be private
- **The God Hook:** one hook that does everything, telling plugins nothing about timing
- **Missing lifecycle events:** not providing hooks at the boundaries where plugins naturally need to act
- **Synchronous bottlenecks:** forcing all plugins through synchronous hooks when async would allow parallelism
- **Unstable contracts:** changing hook signatures between minor versions

### Interactive Widgets

#### Widget 6.1: The Plugin System Builder

**Visual description.** A full-screen interactive workspace. Left panel: a "Host Definition" editor where the reader defines their hypothetical tool's lifecycle as a series of named stages. Center panel: a "Plugin Interface" that auto-generates based on the lifecycle -- showing the hook signatures, the data available at each stage, and the plugin contract. Right panel: "Test Plugins" -- the reader writes simple plugin implementations and watches them execute against the lifecycle.

**Animation design.** When the reader adds a new lifecycle stage (left panel), it slides into the center panel as a new hook definition (SPRING.gentle). The auto-generated TypeScript interface updates with a diff-highlight animation (new lines flash with an accent background, TRANSITION.enterCard, then settle). When the reader writes a test plugin and clicks "Run Lifecycle," the lifecycle animates as a vertical sequence (like the Webpack lifecycle widget), with the plugin's handlers firing at their tapped hooks. The host data transforms visually at each stage.

**Interaction model.** Define lifecycle stages (name, data shape, hook type -- sync/async/bail/waterfall). The center panel auto-generates the plugin interface. Write test plugins in the right panel. Run the lifecycle to see plugins execute. Experiment with hook types: change a waterfall to a bail hook and see how plugin behavior changes. Add conflicting plugins and see how different hook types handle conflicts differently. A "Pattern Recommendation" indicator at the top suggests which pattern family the reader's design most resembles.

**What it teaches.** Plugin system design is a series of concrete decisions: what stages exist, what data is available, how plugins interact at each stage, what hook type governs each interaction. By building one, the reader internalizes these decisions. The pattern recommendation connects their design back to the four families studied in earlier posts.

**Why static text fails.** Plugin system design is inherently generative -- you can't understand the tradeoffs without making choices and seeing consequences. Static text can describe the decision framework, but the builder lets the reader *apply* it. The immediate feedback (auto-generated interface, executable lifecycle) makes each decision's consequences visible.

**Component API (rough).**
```tsx
<PluginSystemBuilder
  presets={[
    { name: "Static Site Generator", stages: [...] },
    { name: "Test Runner", stages: [...] },
    { name: "CLI Tool", stages: [...] },
  ]}
  hookTypes={["sync", "async", "bail", "waterfall", "parallel"]}
  autoGenerateInterface={true}
/>
```

#### Widget 6.2: The Tradeoffs Matrix (Interactive)

**Visual description.** The tradeoffs matrix from the prose section, but interactive. A 4x5 grid (patterns x dimensions). Each cell is a clickable box with a color intensity representing the score (darker = higher). Above the grid: four pattern cards that can be toggled on/off. Below the grid: a detail panel.

**Animation design.** On mount, the grid fills cell by cell in a diagonal wave (STAGGER.fast, starting from top-left). Each cell color fades in (TRANSITION.enterCard). When the reader hovers a cell, it scales up slightly (scale 1.08, SPRING.quick) and the detail panel below shows the justification for that score. When a pattern card is toggled off, its entire row dims (opacity 0.3, TRANSITION.enterCard). When the reader clicks a dimension header (column), all cells in that column pulse (SPRING.quick) and sort by score (the row cards animate to their new positions, SPRING.gentle), showing which pattern wins on that dimension.

**Interaction model.** Hover cells for justifications. Click dimension headers to sort patterns by that dimension. Toggle patterns on/off to compare subsets. A "My Requirements" mode lets the reader weight each dimension (drag a slider from 1-5) and the grid recomputes a weighted score per pattern, with the "recommended" pattern highlighted. This is the decision framework made interactive.

**What it teaches.** Tradeoffs are not absolute -- they depend on what you value. The weighted scoring mode is the key insight: if you value isolation above all else, Registration wins. If you value power, Event System wins. There's no universally best pattern.

**Why static text fails.** A static table shows the data but doesn't let the reader prioritize. The weighted scoring mode turns passive reading into active decision-making.

**Component API (rough).**
```tsx
<TradeoffsMatrix
  patterns={["Pipeline", "Visitor", "Registration", "Event System"]}
  dimensions={["Composability", "Isolation", "Discoverability", "Performance", "Evolvability"]}
  scores={{
    "Pipeline": [4, 3, 4, 3, 3],
    "Visitor": [4, 5, 4, 3, 4],
    "Registration": [5, 5, 5, 4, 4],
    "Event System": [3, 2, 2, 2, 2],
  }}
  justifications={{
    /* cell-level explanations */
  }}
  weightedMode={true}
/>
```

#### Widget 6.3: The Pattern Blender

**Visual description.** A Venn-diagram-style visualization showing the four patterns as overlapping circles. In the overlap regions: real tools that blend patterns. Vite sits in the overlap between Pipeline and Registration. Webpack sits in the overlap between Event System and Middleware. ESLint sits near Visitor but overlaps with Registration (flat config). The reader can drag a "My Tool" marker anywhere on the diagram.

**Animation design.** The four circles draw in with staggered scaling (SPRING.gentle). Tool dots spring into their positions (SPRING.snappy, STAGGER.fast). When the reader drags the "My Tool" marker into a region, the circles in that region glow (LOOP.breathe) and a side panel updates with advice: "Your tool blends Pipeline and Visitor patterns. Consider: define your stages first (pipeline), then let plugins register visitors within specific stages. Risk: double complexity of onboarding. Example: Babel does this." The advice updates live as the marker moves.

**Interaction model.** Drag "My Tool" around the diagram. Click any existing tool dot for a brief description of how it blends patterns. A "Why Here?" button on each tool dot reveals a 2-3 sentence justification for its placement. The reader can also place multiple "My Tool" markers to compare different design approaches for their hypothetical tool.

**What it teaches.** Real plugin systems are rarely pure instances of one pattern. Understanding how patterns blend is the final synthesis. The spatial layout makes the blending concrete -- you're not choosing one pattern, you're positioning yourself in a space.

**Why static text fails.** Prose can list which tools blend which patterns. The spatial diagram makes the RELATIONSHIPS between patterns visible, and the draggable marker lets the reader explore the space rather than just receive conclusions.

**Component API (rough).**
```tsx
<PatternBlender
  patterns={[
    { id: "pipeline", label: "Pipeline", position: { x: 150, y: 100 }, radius: 140 },
    { id: "visitor", label: "Visitor", position: { x: 350, y: 100 }, radius: 140 },
    { id: "registration", label: "Registration", position: { x: 150, y: 280 }, radius: 140 },
    { id: "event", label: "Event System", position: { x: 350, y: 280 }, radius: 140 },
  ]}
  tools={[
    { id: "vite", label: "Vite", position: { x: 150, y: 190 }, regions: ["pipeline", "registration"] },
    { id: "webpack", label: "Webpack", position: { x: 350, y: 190 }, regions: ["event"] },
    // ...
  ]}
  draggableMarker={true}
/>
```

### Critical Questions

- **Is the source code walkthrough at the right depth?** This post has minimal source code -- it's synthesis. The worked example (designing a plugin system) should show 20-30 lines of a plugin interface definition, not a full implementation.
- **What mental model should the reader have BEFORE this post?** They should have read at least 2-3 of the technique posts (Posts 2-5). Ideally all four. This post doesn't re-explain any tool's plugin system.
- **Could this widget teach the concept without the accompanying prose?** The Plugin System Builder could be a standalone learning tool. The Tradeoffs Matrix needs prose to explain each dimension. The Pattern Blender needs prose to explain why certain tools sit where they do.
- **Are we accidentally teaching the tool's API instead of the architectural pattern?** Low risk -- this post is purely about patterns. The risk is the opposite: being too abstract. Ground every claim in a concrete example from a real tool studied earlier in the series.

---

## Cross-Cutting Technical Notes

### Component Architecture

- Each post's widgets are self-contained in `src/mdx/posts/plugin-architectures-N/` where N is the post number.
- Shared primitives (pipeline renderer, hook type visualizations, registry panels) live in `src/mdx/shared/` if they're reused across posts.
- The Pipeline Visualizer (Post 2) and Lifecycle (Post 5) share a common "sequential flow" animation primitive. Extract it.
- The Tradeoff Pentagon (Post 1) and Tradeoffs Matrix (Post 6) share scoring data. Define it once in a shared data file.

### Animation Conventions

- All animations use `SPRING`, `TRANSITION`, `LOOP`, and `STAGGER` from `src/lib/motion.ts`.
- Pipeline flow animations use a custom `TRANSITION.pipelineFlow` preset (to be defined): `{ duration: DURATION.slow, ease: EASE.inOut }`.
- Hook firing pulses use `LOOP.pulse` with `repeatCount: 2` (not infinite -- pulses should stop).
- Every widget respects `usePrefersReducedMotion()`. Reduced-motion fallbacks: replace animations with instant state changes, replace pulse/glow with static accent borders.

### Data Flow

- Plugin definitions are typed interfaces, shared across widgets within a post.
- The "Run Build" / "Fire Hook" animations use a state machine (`idle -> running -> complete`) to prevent re-triggering during animation.
- Draggable interactions use `framer-motion`'s `drag` prop with `dragConstraints` and `onDragEnd` for snapping.

### Accessibility

- All animated visualizations have `aria-label` descriptions of the current state.
- The "step" mode on traversal/pipeline widgets serves as the accessible alternative to continuous animation.
- Drag-and-drop interactions have keyboard alternatives (tab to select, arrow keys to reorder, Enter to drop).
- Color is never the sole differentiator -- shapes, labels, and patterns supplement color coding.

### Performance Considerations

- AST parsing for Widget 3.1 (AST Visitor Walkthrough) should use a lightweight parser (Acorn) loaded lazily, not the full ESLint engine.
- The Plugin System Builder (Widget 6.1) generates TypeScript interfaces as strings, not actual types -- no compiler needed in the browser.
- Pipeline animations should use `transform` and `opacity` only (compositor-friendly properties). No layout-triggering animations.
- Large widgets (Builder, Lifecycle) should be wrapped in `IntersectionObserver` guards -- don't animate until visible.

---

## Series Dependencies and Reading Order

```
Post 1 (Problem) ─────────────────────────────────┐
    │                                               │
    ├── Post 2 (Vite) ──────────────────────┐      │
    │                                        │      │
    ├── Post 3 (ESLint) ────────────────────┤      │
    │                                        ├──── Post 6 (Synthesis)
    ├── Post 4 (Tailwind) ──────────────────┤
    │                                        │
    └── Post 5 (Webpack) ───────────────────┘
```

Post 1 is required first. Posts 2-5 can be read in any order (each is self-contained once Post 1 is understood). Post 6 requires at least 2 technique posts, ideally all 4.

---

## Open Questions

1. **Scope of source code walkthroughs.** Should we use actual source code from each tool's repo (risk: code changes between versions), or simplified reconstructions that capture the architectural patterns? Leaning toward reconstructions with links to real source for the curious.

2. **Babel as a candidate.** Babel sits at the intersection of Pipeline (plugin phases) and Visitor (AST traversal). It might deserve its own post, or it could be a recurring example in the synthesis post. It's the tool that MOST clearly blends two patterns.

3. **PostCSS.** PostCSS has a clean plugin architecture (AST-based, similar to ESLint but for CSS). It could replace one of the four tools, or serve as a "bonus" post. It's simpler than all four current candidates, which might make it a better teaching tool for one of the patterns.

4. **Interactive widget complexity.** The Plugin System Builder (Widget 6.1) is ambitious -- essentially a mini-IDE for plugin systems. Should it be simplified to a guided wizard (choose lifecycle stages from presets, see the generated interface) rather than a freeform builder? The wizard is more teachable; the builder is more powerful.

5. **Series length.** Six posts is substantial. Could Posts 2-5 be shortened to "technique briefs" (1500 words + 2 widgets each) rather than full deep dives (3000 words + 3 widgets each)? This depends on whether the series should be exhaustive or illustrative. Leaning toward illustrative -- the widgets do the heavy teaching.

6. **Reader-built plugins.** Should the technique posts (2-5) include a "Build a Plugin" exercise at the end? Each post would end with the reader building a small plugin for that tool using the concepts they just learned. The interactive widgets could scaffold this exercise. Risk: scope creep. Reward: the deepest form of learning.
