# SDP Lab Visual Language

Visual consistency rules for every System Design Problem interactive lab.
The gold standard is `sdp-web-performance`. Every lab must converge on these patterns.

---

## Architecture

| Concern | Rule |
|---------|------|
| Step bar | Use shared `_shared/StepBar` component, NOT inline step bar CSS |
| Control panel | Use shared `_shared/ControlPanel` for toggles — float/collapse, never dominate viewport |
| Lab root | `display:flex; flex-direction:column; height:100%; overflow:hidden; font-family:var(--font-mono); container-type:inline-size` |
| Scroll area | `padding: var(--space-4); gap: var(--space-3)` |

## Typography Scale

Labs define a local scale scoped to `.labRoot`:

```css
--perf-xs: 0.5625rem;   /* 9px — tick labels, micro annotations */
--perf-sm: 0.625rem;    /* 10px — captions, secondary labels */
--perf-base: 0.6875rem; /* 11px — body text, descriptions */
--perf-md: 0.8125rem;   /* 13px — metric values, emphasized labels */
--perf-lg: 0.9375rem;   /* 15px — titles, primary values */
```

**Every lab should use this exact scale** via `--lab-xs` through `--lab-lg` (rename from `--perf-*` to be lab-agnostic).

- Widget titles: `font-family: var(--font-sans); font-size: 1rem; font-weight: 700; letter-spacing: -0.02em`
- Widget notes/descriptions: `font-family: var(--font-sans); font-size: var(--lab-base); line-height: 1.55; text-wrap: pretty`
- Section headings: `font-size: var(--text-sm); font-weight: 600; letter-spacing: -0.01em`
- Metric values: `font-variant-numeric: tabular-nums` always

## Colors

| Role | Token | Usage |
|------|-------|-------|
| Primary accent | `var(--diagram-layer-9)` | Active step dots, toggle chips, primary actions, focus rings |
| Secondary accents | `var(--diagram-layer-0..8)` | Data categories, chart segments — assign per-topic, not per-lab |
| Feedback: good | `var(--color-success)` | Passing thresholds, completed states |
| Feedback: bad | `var(--color-error)` | Failing thresholds, errors |
| Feedback: warn | `var(--color-warning)` | Borderline states |
| Surface | `var(--color-surface)` | Card backgrounds, button rest states |
| Surface-2 | `var(--color-surface-2)` | Hover backgrounds |
| Border | `var(--color-border)` | All structural borders |
| Muted | `var(--color-muted)` | Secondary text, labels |
| Text | `var(--color-text)` | Primary text |

**NEVER use `var(--color-accent)` in labs.** Use `var(--diagram-layer-9)` instead — it's the same hue (260°) but participates in the diagram palette, keeping labs consistent.

## Surface Treatment

### When to use what

| Surface | CSS | When |
|---------|-----|------|
| **Flat** (no border, no shadow) | `background: transparent` | Default for grouping containers, widget panels |
| **Bordered** | `border: 1px solid var(--color-border); border-radius: var(--radius-2)` | Interactive zones, data containers, metric cards |
| **Bordered + tinted** | `border: 1px solid var(--color-border); background: var(--color-surface)` | Buttons, inputs, elevated cards |
| **Shadow** | `box-shadow: var(--shadow-1)` or `var(--shadow-2)` | Floating panels, overlays, sticky toolbars only |

**NEVER** nest bordered cards inside bordered cards. Flat parent → bordered children, or bordered parent → flat children.

### Widget panels

```css
.widgetPanel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
```

No border, no background — the widget IS the content. Title gets a subtle bottom border:

```css
.widgetTitle {
  padding-bottom: var(--space-1);
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 40%, transparent);
}
```

## Controls

### Toggle chips (multi-select feature toggles)

Use the web-perf pattern: pill-shaped, border + dot indicator, `diagram-layer-9` active.

```css
/* 4px 10px padding, 999px border-radius, var(--lab-sm) font-size */
/* Active: border-color + color + bg tint all use diagram-layer-9 */
/* Dot: 7px circle, diagram-layer-9 when on */
```

### Toggle switches (binary on/off)

Standardize to: **44×24px track, 16×16px knob, 12px border-radius.**

```css
.toggleButton {
  width: 44px; height: 24px;
  border-radius: 12px;
  border: 2px solid var(--color-border);
  background: var(--color-surface-2);
}
.toggleButton[data-on="true"] {
  background: var(--diagram-layer-9);
  border-color: var(--diagram-layer-9);
}
.toggleKnob {
  width: 16px; height: 16px;
  /* translateX(20px) when on */
}
```

### Segment buttons (mutually exclusive options)

```css
/* var(--space-1) var(--space-2) padding */
/* 1px solid var(--color-border), var(--radius-1) */
/* Active: border-color + color use the relevant diagram-layer color */
/* Active bg: color-mix(in srgb, [color] 8%, var(--color-bg)) */
/* :active { transform: scale(0.96) } */
```

### Sliders (range inputs)

```css
/* 6px height track, --radius-1 border-radius */
/* Gradient fill: solid accent → 14% tint background */
/* 16×16px thumb, 999px radius, accent color, 2px border solid --color-bg */
/* thumb:hover { scale(1.1) }, thumb:active { scale(1.2), cursor: grabbing } */
/* Always set --fill-pct custom property for visual fill */
```

### Preset buttons (discrete value selectors)

```css
/* Same as segment buttons but with min-height: 32px for touch */
/* 4px gap between buttons */
```

## Interactive Widgets

### Simulation buttons (click-to-demo)

```css
.simButton {
  padding: var(--space-3);
  border-radius: var(--radius-2);
  border: 1px solid var(--color-border);
  /* State-driven: idle → accent border, queued → warning, done → success */
}
```

### Progress bars

```css
/* Track: var(--color-border) background, var(--radius-1) */
/* Fill: accent gradient, transition: width 500ms ease */
/* Always has a data-complete attribute for 100% state */
```

### Pipeline/timeline visualizations

```css
/* Horizontal flex, 2px gap between blocks */
/* Each block: var(--radius-1), color-mix with 25% accent */
/* data-state="inactive" → opacity: 0.2 */
/* data-state="active" → full opacity */
```

## Focus & Accessibility

```css
/* All interactive elements: */
:focus-visible {
  outline: 2px solid var(--diagram-layer-9);
  outline-offset: 1px;
}

/* Touch targets: min-height 32px, ideally 44px */
/* aria-pressed on toggles, aria-checked on radio groups */
/* aria-live="polite" on dynamic metric displays */
/* tabular-nums on ALL changing numbers */
```

## Animation

- All transitions use named values from `src/lib/motion.ts`
- Interactive state changes: CSS transitions, 150ms ease
- `:active` press: `transform: scale(0.96)` — exactly 0.96, no other value
- Reduced motion: `@media (prefers-reduced-motion: reduce)` disables keyframe animations
- `transition: all` is BANNED — always specify exact properties

## Spacing Rhythm

| Context | Token |
|---------|-------|
| Lab padding | `var(--space-4)` |
| Gap between widgets | `var(--space-3)` |
| Inside widget between sections | `var(--space-2)` |
| Inline element gaps | `var(--space-1)` |
| Grid/button group gaps | `2px` or `4px` |

## Anti-Patterns (what to fix in existing labs)

1. **Inline step bar CSS** — delete from lab CSS, use shared `_shared/StepBar`
2. **`var(--color-accent)` in toggle-on states** — replace with `var(--diagram-layer-9)`
3. **`diagram-layer-5` as primary accent** — replace with `diagram-layer-9`
4. **`transition: all`** — replace with specific properties
5. **Toggle sizes that aren't 44×24** — standardize
6. **`box-sizing: content-box` on toggles** — remove, use standard border-box
7. **Nested bordered containers** — flatten hierarchy
8. **Missing focus-visible** — add to all interactive elements
9. **Missing tabular-nums** — add to all numeric displays
10. **Arbitrary font sizes** (0.7rem, 0.75rem, 0.85rem) — use lab scale tokens
