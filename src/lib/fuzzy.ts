// Subsequence fuzzy match with word-boundary and consecutive-run bonuses.
// Returns 0 when query chars don't all appear in order.
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  let score = 0;
  let run = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      let bonus = 1;
      if (ti === 0 || /[\s\-_./:]/.test(t[ti - 1])) bonus += 3;
      if (run > 0) bonus += run + 1;
      score += bonus;
      run++;
      qi++;
    } else {
      run = 0;
    }
  }
  return qi === q.length ? score : 0;
}
