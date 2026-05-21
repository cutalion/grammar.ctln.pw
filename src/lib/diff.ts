export type DiffPart = { type: 'same' | 'add' | 'del'; text: string };

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
  const out: DiffPart[] = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (aw[i - 1] === bw[j - 1]) {
      out.unshift({ type: 'same', text: aw[i - 1] });
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      out.unshift({ type: 'del', text: aw[i - 1] });
      i--;
    } else {
      out.unshift({ type: 'add', text: bw[j - 1] });
      j--;
    }
  }
  while (i > 0) { out.unshift({ type: 'del', text: aw[i - 1] }); i--; }
  while (j > 0) { out.unshift({ type: 'add', text: bw[j - 1] }); j--; }
  return out;
}
