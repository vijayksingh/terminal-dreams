export const ENDPOINT_RE =
  /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/\S+)$/;

export const TYPE_RE =
  /^([A-Z][A-Za-z0-9_]*[a-z][A-Za-z0-9_]*)(<[^<>]+>)?(\[\])?$/;

// Duration inside backticks: `400ms`, `2.5s`, `200μs`, `1h`.
// Bare-prose matching is narrower (multi-char units only) — that
// matcher lives in RichText.tsx to avoid "1990s" decade collisions.
export const DURATION_RE =
  /^(\d+(?:\.\d+)?)\s?(ms|μs|us|ns|s|min|sec|hr|h)$/;

// Storage / byte size inside backticks: `2 KB`, `200 bytes`, `1.5 MB`.
// Same metric-magnitude language as DurationBadge.
export const SIZE_RE =
  /^(\d+(?:\.\d+)?)\s?(bytes?|B|KB|MB|GB|TB|PB|KiB|MiB|GiB|TiB|kb|mb|gb|tb|kbit|Mbit|Gbit|Tbit)$/;

// Percentile inside backticks: `p95`, `p99`, `p99.9`. Conservative
// allowlist of canonical percentile values used in perf writing.
export const PERCENTILE_RE =
  /^p(5|10|25|50|75|90|95|99(?:\.9{1,3})?)$/;

// Percentage inside backticks: `95%`, `0.5%`, `99.99%`.
export const PERCENTAGE_RE = /^(\d+(?:\.\d+)?)%$/;

// Multiplier inside backticks: `10×`, `5x`, `100×`.
export const MULTIPLIER_RE = /^(\d+(?:\.\d+)?)([×x])$/;

// Big-O complexity inside backticks: `O(n)`, `O(log n)`, `O(n²)`.
// The `O` is mathematical notation, not a generic identifier — so we
// render it with display-serif italic instead of the code-pill cyan.
export const COMPLEXITY_RE = /^O\(([^)]+)\)$/;

export function isChipText(text: string): boolean {
  const t = text.trim();
  return (
    ENDPOINT_RE.test(t) ||
    TYPE_RE.test(t) ||
    DURATION_RE.test(t) ||
    SIZE_RE.test(t) ||
    PERCENTILE_RE.test(t) ||
    PERCENTAGE_RE.test(t) ||
    MULTIPLIER_RE.test(t) ||
    COMPLEXITY_RE.test(t)
  );
}
