export type CellValue = string | number | null;

export type CellFormat = {
  bold: boolean;
  align: "left" | "center" | "right";
  type: "text" | "number" | "currency" | "percent";
};

export type Cell = {
  id: string;
  raw: string;
  computed: CellValue;
  formula: boolean;
  deps: string[];
  dependents: string[];
  dirty: boolean;
  error: string | null;
  format: CellFormat;
};

// ── Cell ID helpers ─────────────────────────────────────────────────

export function colToLetter(col: number): string {
  return String.fromCharCode(65 + col);
}

export function cellId(row: number, col: number): string {
  return `${colToLetter(col)}${row + 1}`;
}

export function parseCellId(id: string): { row: number; col: number } {
  const col = id.charCodeAt(0) - 65;
  const row = parseInt(id.slice(1), 10) - 1;
  return { row, col };
}

// ── Simple formula parser ───────────────────────────────────────────

export function parseFormulaDeps(raw: string): string[] {
  if (!raw.startsWith("=")) return [];
  const refs = raw.match(/[A-Z]\d+/g) || [];
  return [...new Set(refs)];
}

export function safeEval(expr: string): number {
  let pos = 0;
  const s = expr.replace(/\s/g, "");

  function parseExpr(): number {
    let result = parseTerm();
    while (pos < s.length && (s[pos] === "+" || s[pos] === "-")) {
      const op = s[pos]!;
      pos++;
      const right = parseTerm();
      result = op === "+" ? result + right : result - right;
    }
    return result;
  }

  function parseTerm(): number {
    let result = parseFactor();
    while (pos < s.length && (s[pos] === "*" || s[pos] === "/")) {
      const op = s[pos]!;
      pos++;
      const right = parseFactor();
      result = op === "*" ? result * right : result / right;
    }
    return result;
  }

  function parseFactor(): number {
    if (s[pos] === "(") {
      pos++;
      const result = parseExpr();
      pos++; // skip )
      return result;
    }
    if (s[pos] === "-") {
      pos++;
      return -parseFactor();
    }
    const start = pos;
    while (pos < s.length && ((s[pos]! >= "0" && s[pos]! <= "9") || s[pos] === ".")) pos++;
    return parseFloat(s.slice(start, pos));
  }

  return parseExpr();
}

export function evaluateFormula(
  raw: string,
  cells: Map<string, Cell>
): { value: CellValue; error: string | null } {
  if (!raw.startsWith("=")) {
    const num = Number(raw);
    return { value: raw === "" ? null : isNaN(num) ? raw : num, error: null };
  }

  const expr = raw.slice(1);

  // Handle SUM(range)
  const sumMatch = expr.match(/^SUM\(([A-Z])(\d+):([A-Z])(\d+)\)$/i);
  if (sumMatch) {
    const [, c1, r1, c2, r2] = sumMatch;
    const startCol = c1!.charCodeAt(0) - 65;
    const endCol = c2!.charCodeAt(0) - 65;
    const startRow = parseInt(r1!, 10) - 1;
    const endRow = parseInt(r2!, 10) - 1;
    let sum = 0;
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = cells.get(cellId(r, c));
        const v = cell?.computed;
        if (typeof v === "number") sum += v;
      }
    }
    return { value: sum, error: null };
  }

  // Handle simple cell references and arithmetic
  let resolved = expr;
  const refs = expr.match(/[A-Z]\d+/g) || [];
  for (const ref of refs) {
    const cell = cells.get(ref);
    const v = cell?.computed;
    if (v === null || v === undefined) {
      resolved = resolved.replace(ref, "0");
    } else if (typeof v === "number") {
      resolved = resolved.replace(ref, String(v));
    } else {
      return { value: null, error: `#REF! ${ref} is not a number` };
    }
  }

  try {
    if (/^[\d\s+\-*/().]+$/.test(resolved)) {
      const result = safeEval(resolved);
      if (typeof result === "number" && isFinite(result)) {
        return { value: result, error: null };
      }
      return { value: null, error: "#VALUE!" };
    }
    return { value: null, error: "#PARSE!" };
  } catch {
    return { value: null, error: "#ERROR!" };
  }
}
