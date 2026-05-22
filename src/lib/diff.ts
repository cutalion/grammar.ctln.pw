export type DiffPart = { type: 'same' | 'add' | 'del'; text: string };

/** Horizontal whitespace only — newlines are meaningful and never collapsed. */
const isCollapsibleWhitespace = (s: string): boolean =>
  /^\s*$/.test(s) && !/[\r\n]/.test(s);

/** Collapse runs of spaces/tabs but keep newlines so paragraph breaks compare correctly. */
export function normalizeForDiff(s: string): string {
  return s.trim().replace(/[^\S\n]+/g, ' ');
}

export function wordDiff(a: string, b: string): DiffPart[] {
  const aw = a.split(/(\s+)/);
  const bw = b.split(/(\s+)/);
  const n = aw.length;
  const m = bw.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = aw[i - 1] === bw[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const raw: DiffPart[] = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (aw[i - 1] === bw[j - 1]) {
      raw.unshift({ type: 'same', text: aw[i - 1] });
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      raw.unshift({ type: 'del', text: aw[i - 1] });
      i--;
    } else {
      raw.unshift({ type: 'add', text: bw[j - 1] });
      j--;
    }
  }
  while (i > 0) { raw.unshift({ type: 'del', text: aw[i - 1] }); i--; }
  while (j > 0) { raw.unshift({ type: 'add', text: bw[j - 1] }); j--; }

  // Suppress horizontal whitespace-only differences (e.g. "  " → " ").
  // Keep newline changes visible — they are real edits, not noise.
  const out: DiffPart[] = [];
  for (const p of raw) {
    if (!isCollapsibleWhitespace(p.text)) {
      out.push(p);
      continue;
    }
    if (p.type === 'del') continue;
    out.push({ type: 'same', text: p.text });
  }
  return out;
}

export function hasMeaningfulDiff(a: string, b: string): boolean {
  return normalizeForDiff(a) !== normalizeForDiff(b);
}
