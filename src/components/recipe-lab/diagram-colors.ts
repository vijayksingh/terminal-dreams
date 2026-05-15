export function layerColors(cssVar: string) {
  return {
    dot: `var(${cssVar})`,
    border: `color-mix(in srgb, var(${cssVar}) 60%, var(--color-border))`,
    bg: `color-mix(in srgb, var(${cssVar}) 10%, var(--color-surface))`,
    text: `color-mix(in srgb, var(${cssVar}) 50%, var(--color-text))`,
  } as const;
}

export const LAYER_COLORS = {
  types:       layerColors("--diagram-layer-0"),
  geometry:    layerColors("--diagram-layer-1"),
  primitives:  layerColors("--diagram-layer-2"),
  composition: layerColors("--diagram-layer-3"),
} as const;

export const DIMENSION_COLORS = {
  intent:        layerColors("--diagram-layer-3"),
  hierarchy:     layerColors("--diagram-layer-2"),
  relationships: layerColors("--diagram-layer-1"),
  path:          layerColors("--diagram-layer-0"),
  affordance:    layerColors("--diagram-layer-4"),
} as const;

export const QUALITY_COLORS = {
  bare:     layerColors("--diagram-layer-4"),
  semantic: layerColors("--diagram-layer-0"),
  full:     layerColors("--diagram-layer-1"),
} as const;

export const USAGE_COLORS = layerColors("--diagram-layer-2");
