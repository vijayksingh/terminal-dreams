# Composing with FlowDiagram

## Why this guide exists

FlowDiagram renders nodes and edges. That's its mechanical job. But nodes and edges alone don't teach — they produce reference diagrams that assume the reader already understands the system. Five boxes connected by arrows labeled with method names is a cheat sheet for an expert, not a learning tool for a reader.

This guide exists because we learned that the difference between "boxes thrown out there" and a diagram that feels intentionally crafted isn't better rendering — it's better thinking about what the diagram is FOR. The rendering is fine. The thinking is what's usually absent.

The FlowDiagram system encodes this thinking as five semantic dimensions. Provide them, and the system translates meaning into visual craft automatically. Skip them, and you get technically correct diagrams that teach nothing.

## The problem we solved

A diagram created with only positional data (x, y, labels, connections) fails at its purpose in predictable ways:

- **All nodes have equal visual weight.** The reader's eye wanders — there's no entry point, no focal pull, no sense of "start here." Working memory (~4 chunks) overflows when five equally-demanding elements compete for attention.

- **Edges show connections but don't explain them.** ".skill()" is an API reference, not an explanation. The reader sees topology, not meaning. They know Session connects to Skill but not why that matters.

- **The teaching content is locked behind clicks.** The detail panel only appears on interaction. A reader who doesn't click — and many won't, because nothing signals "click me" — walks away having learned nothing.

- **There's no reading order.** The reader accesses nodes randomly. Each click reveals isolated facts. No scaffolding builds one insight toward the next.

- **Selection destroys context.** When one node is selected, aggressive dimming of everything else makes the graph unreadable. The reader can't see where the selected node's edges lead because the target nodes have disappeared.

These aren't rendering bugs. They're symptoms of a syntactic approach — the author described WHERE things go, but never said WHAT they mean or WHY they're there.

## Five semantic dimensions

We arrived at these by studying what makes interactions feel crafted — borrowing from instructional design, cinematography, editorial typography, game design, and data visualization. Each dimension addresses a failure mode above.

### 1. Intent — "Why does this diagram exist?"

Every diagram has a **thesis**: the one thing the reader should understand after seeing it. If you can't state it in one sentence, the diagram is trying to do too much. The thesis is always visible — it's the advance organizer (Ausubel) that gives the reader a scaffold before they encounter details. Without it, the reader has no framework to hang new information on.

Optionally, a diagram has a **tension**: the interesting constraint, tradeoff, or surprise. "Everything routes through one object — bottleneck or feature?" Tension gives the reader a reason to care. A diagram without tension is information without a point.

**What it fixes:** The reader knows what they're looking at before any interaction. The establishing shot (cinematography) works.

### 2. Hierarchy — "What matters more?"

Not all elements are equally important. A **role** system (protagonist / supporting / context) creates a gradient of visual weight that guides the eye:

- **Protagonist**: The center of the story. Rendered larger, with accent treatment and the strongest interactive signals. There may be zero or one per diagram — not every diagram has a single center. A pipeline has a flow; a comparison has parallel structures.
- **Supporting**: Directly involved in the main story. Normal rendering.
- **Context**: Background, peripheral. Rendered slightly smaller and lighter.

The visual hierarchy isn't decoration — it's cognitive triage (Sweller). It reduces perceived complexity by telling the reader what to process first. The author never manually tweaks `w: 82` vs `w: 56` — they declare roles, and the system derives the visual treatment.

Typography teaches this: headline size tells you what matters before you read a word. The same principle applies to node size.

**What it fixes:** The reader's eye has a natural entry point. The diagram communicates importance through visual weight, not just labels.

### 3. Relationships — "What do the connections mean?"

Edges are the plot. Nodes are characters. The relationships between things ARE the story.

Every edge can carry:
- A **label**: the short form visible on the diagram — `.skill()`, `tool calls`
- A **verb**: the action — `loads`, `spawns`, `executes`, `applies`
- A **description**: the human explanation — "loads markdown instruction sets into the conversation"

The label serves the visual channel. The description serves the verbal channel. Together they achieve dual coding (Paivio) — two channels reinforcing the same message.

When a node is selected, the system auto-composes a relationship view from its edge descriptions. The reader sees not just "what is Session" but "how Session connects to everything else." This creates shot/reverse shot (film) — understanding node A creates curiosity about node B.

**What it fixes:** The detail panel shows relationships, not just isolated properties. The reader builds a mental model of the system, not a collection of unrelated facts.

### 4. Affordance — "Does this look alive?"

The best games never say "press X to jump." They put a gap in front of you. The diagram should feel interactive before any instruction:

- Nodes have visible mass (filled, not just outlined against the background)
- Hover states signal "I respond to you"
- Selection feedback is generous — accent glow, edge illumination, detail panel slide-in
- The detail panel area implies "content lives here" even when empty

This dimension is mostly handled by the system's rendering defaults, not by per-diagram data. But the semantic data feeds into it: the highest-weight node (hierarchy) gets the strongest affordance. The node with the richest edge descriptions (relationships) produces the most rewarding detail panel on click.

**What it fixes:** The reader discovers interaction through design, not through hint text. Clicks feel rewarding, not uncertain.

### 5. Path — "How should I read this?"

An optional dimension: the suggested comprehension order. An **arc** is a sequence of node IDs that says "understand these in this order." When present:

- Small numbered indicators appear on nodes
- The entrance animation staggers along the arc
- The reader has a visible journey to follow

Not every diagram needs an arc. Reference diagrams, comparison diagrams, and ecosystem diagrams may be better served by free exploration. But teaching diagrams — where concepts build on each other — always benefit from making the learning path visible.

The arc should follow the elaboration principle (Reigeluth): start with the simplest, most general concept, then elaborate toward specifics. It should follow the relationships — each step reveals a connection that creates curiosity about the next node.

**What it fixes:** The reader has a comprehension path. Understanding builds incrementally instead of accumulating randomly.

## How the dimensions compose

The dimensions are not a checklist of independent features. They form a reinforcing loop:

```
Intent → shapes what Hierarchy should emphasize
    → "Session is the hub" means Session should be the focal point

Hierarchy → shapes which elements get strongest Affordance
    → the protagonist node gets the most inviting hover state

Affordance → shapes how interaction reveals Relationships
    → clicking the protagonist shows its rich connections

Relationships → shape the natural Path
    → "Session connects to Skill" creates curiosity about Skill next

Path → completes the Intent
    → after following the arc, the reader understands the thesis
```

When every visual decision is backed by multiple dimensions pointing to the same conclusion, the result feels intentional. A node isn't big for one reason — it's big because of its role AND its arc position AND its connection count. Multiple rationales converge on one visual decision. That convergence is what "thousands of hours of craft" feels like.

A diagram where the dimensions conflict — where the visual hierarchy says "look here" but the arc says "start there" — feels dissonant. The system prevents this by deriving visuals from the semantic data, not from independent manual choices.

## The semantic fields

### On FlowDiagramDef

| Field | Type | Required | Dimension | What it does |
|-------|------|----------|-----------|-------------|
| `thesis` | `string` | yes | Intent | Rendered as visible summary text. The reader's first orientation. |
| `tension` | `string` | no | Intent | Rendered as a prominent callout. The "interesting question." |
| `protagonist` | `string` | no | Hierarchy | Node ID. System applies scale + accent + strongest affordance. |
| `arc` | `string[]` | no | Path | Comprehension order. System renders numbered indicators + staggers animation. |

### On FlowNode

| Field | Type | Required | Dimension | What it does |
|-------|------|----------|-----------|-------------|
| `role` | `"protagonist" \| "supporting" \| "context"` | no | Hierarchy | Drives scale factor (1.15x / 1.0x / 0.9x) and visual weight. Inferred from `protagonist` field if not set. |
| `brief` | `string` | no | Relationships | One-line "what is this." Shown in the detail panel header alongside the label. |

### On FlowEdge

| Field | Type | Required | Dimension | What it does |
|-------|------|----------|-----------|-------------|
| `verb` | `string` | no | Relationships | The action: "loads", "spawns", "executes". Used in relationship detail view. |
| `description` | `string` | no | Relationships | Human-readable explanation. Auto-composed into detail panel when node is selected. |

## What the system does with semantic data

The author provides meaning. The system provides craft. The translation happens through **scene resolution** — a computed analysis of the full diagram across all five dimensions.

### Per-node resolution

For each node, the system computes:
- **Semantic weight** from role + connection count + arc position + richness of connected edge descriptions
- **Scale factor** derived from semantic weight (protagonist ~1.15x, context ~0.9x)
- **Accent treatment** automatically applied to protagonist
- **Stagger order** follows the arc (or falls back to weight-descending, or spatial position)

### Per-edge resolution

For each edge, the system computes:
- **Prominence** from connected nodes' weights + whether it has a description
- **Detail contribution** — when either endpoint is selected, this edge's verb + description appear in the relationship view

### Scene-level rendering

- **Thesis** rendered as visible text below the header
- **Tension** rendered as a callout annotation
- **Arc indicators** (numbered dots) appear on nodes when arc is provided
- **Detail panel** auto-composes: node brief + edge relationships to neighbors
- **Dev warnings** logged when semantic data is thin

## The quality spectrum

The system doesn't gate rendering on semantic data. It rewards it.

### Bare minimum (syntactic only)

```ts
{
  id: "my-diagram",
  thesis: "...",   // required, but even a placeholder passes
  viewBox: "0 0 400 200",
  nodes: [
    { id: "a", x: 100, y: 100, label: "A" },
    { id: "b", x: 300, y: 100, label: "B" },
  ],
  edges: [{ from: "a", to: "b" }],
}
```

Result: Two same-sized nodes, one unnamed edge, a visible thesis. Functional but lifeless. Dev console shows warnings about missing roles, missing edge descriptions.

### Fully semantic

```ts
{
  id: "architecture-map",
  thesis: "All five primitives communicate through the Session hub",
  tension: "Single coordination point — bottleneck or feature?",
  protagonist: "session",
  arc: ["session", "skill", "role", "task", "sandbox"],
  nodes: [
    { id: "session", role: "protagonist", label: "Session",
      brief: "Message history with built-in compaction", ... },
    { id: "skill", role: "supporting", label: "Skill",
      brief: "Markdown instruction sets", ... },
    // ...
  ],
  edges: [
    { from: "session", to: "skill", label: ".skill()",
      verb: "loads", description: "loads instruction sets into the conversation" },
    // ...
  ],
}
```

Result: Session renders larger with accent glow. Thesis visible as orientation text. Numbered indicators guide reading order. Clicking Session shows its brief + all four relationship descriptions. Tension callout surfaces the interesting question. Entrance animation follows the arc. Zero dev warnings.

The gap between these two is the incentive. The semantic data IS the craft.

## Composing a new diagram

Before writing any code, answer five questions:

1. **What should the reader understand?**
   → Write the thesis. One sentence. If you can't, narrow the scope.

2. **What matters most?**
   → Assign roles. Is there a protagonist? What's supporting? What's context?
   → If everything feels equally important, that's fine — but state why.

3. **What do the connections mean?**
   → Write a verb and description for each edge. Not API labels — human explanations.
   → If you can't explain an edge in plain language, question whether it belongs.

4. **What's the reading order?**
   → Define an arc if concepts build on each other.
   → If the diagram is a reference (no natural order), omit it.

5. **What's interesting?**
   → State the tension. The constraint, the tradeoff, the surprise.
   → If there's no tension, the diagram might be too obvious to warrant interaction.

The system handles affordance (dimension 4) through its rendering defaults. The author handles meaning. The system handles craft.
