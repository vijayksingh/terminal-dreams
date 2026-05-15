type LabSvgDefsProps = {
  prefix: string;
  gridColor?: string;
  gridOpacity?: number;
};

export function LabSvgDefs({ prefix, gridColor = "var(--color-muted)", gridOpacity = 0.1 }: LabSvgDefsProps) {
  return (
    <defs>
      <filter id={`${prefix}-glow`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
        <feFlood floodColor="var(--color-accent)" floodOpacity="0.3" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id={`${prefix}-node-grad`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="white" stopOpacity="0.07" />
        <stop offset="40%" stopColor="white" stopOpacity="0" />
        <stop offset="100%" stopColor="black" stopOpacity="0.05" />
      </linearGradient>
      <radialGradient id={`${prefix}-vignette`} cx="50%" cy="45%">
        <stop offset="0%" stopColor="transparent" />
        <stop offset="70%" stopColor="transparent" />
        <stop offset="100%" stopColor="black" stopOpacity="0.06" />
      </radialGradient>
      <pattern id={`${prefix}-grid`} width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="10" cy="10" r="0.4" fill={gridColor} opacity={gridOpacity} />
      </pattern>
    </defs>
  );
}
