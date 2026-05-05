# Terminal Dreams — Project Conventions

## Styling

- **CSS Modules** for layout concerns: page grids, sticky positioning, responsive breakpoints, structural composition.
- **Tailwind utilities** for component internals: spacing, colors, typography, borders, shadows within a component.
- **CSS custom properties** (`var(--color-*)`) are the single source of truth for all design tokens. Defined in `src/styles/tokens.css`.
- **Tailwind color utilities** (`bg-surface`, `text-app-accent`, etc.) reference the CSS variables — never hardcode hex values in components.

## Animation

- All framer-motion transition values live in `src/lib/motion.ts`.
- Use named exports (`SPRING.snappy`, `TRANSITION.enterCard`, `LOOP.breathe`) instead of inline `{ duration: 0.3, ease: "easeOut" }`.
- Every animated component must respect `usePrefersReducedMotion()`.

## Components

- Cookbook SVG illustrations live in `src/components/cookbook/CategoryIllustrations.tsx`, not inline in card components.
- Large interactive pages use Layout + Controller pattern: a pure layout component accepting slots, and a controller component wiring hooks.

## Testing

```bash
npm run test
```

Jest + React Testing Library. Tests are co-located with components or in `__tests__/` directories.
