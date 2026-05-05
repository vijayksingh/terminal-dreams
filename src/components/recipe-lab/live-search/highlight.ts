export type Segment = { text: string; match: boolean };

export function highlight(text: string, query: string): Segment[] {
  if (!query.trim()) return [{ text, match: false }];
  const lq = query.toLowerCase();
  const lt = text.toLowerCase();
  const idx = lt.indexOf(lq);
  if (idx === -1) return [{ text, match: false }];
  return [
    { text: text.slice(0, idx), match: false },
    { text: text.slice(idx, idx + query.length), match: true },
    { text: text.slice(idx + query.length), match: false },
  ].filter((s) => s.text.length > 0);
}
