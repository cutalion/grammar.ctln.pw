const KEY = 'grammar.history.v1';

export interface Correction {
  id: string;
  input: string;
  output: string;
  notes?: string;
  status: 'pending' | 'done' | 'error';
  error?: string;
  providerLabel?: string;
  model?: string;
  createdAt: number;
  suggestion?: {
    output: string;
    notes?: string;
    status: 'pending' | 'done' | 'error';
    error?: string;
  };
}

export function loadHistory(): Correction[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Correction[]).map((c) => {
      const fixed: Correction =
        c.status === 'pending'
          ? { ...c, status: 'error', error: c.error ?? 'Interrupted' }
          : c;
      if (fixed.suggestion?.status === 'pending') {
        return {
          ...fixed,
          suggestion: {
            ...fixed.suggestion,
            status: 'error',
            error: fixed.suggestion.error ?? 'Interrupted',
          },
        };
      }
      return fixed;
    });
  } catch {
    return [];
  }
}

export function saveHistory(items: Correction[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}
