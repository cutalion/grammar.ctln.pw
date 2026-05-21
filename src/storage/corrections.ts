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
}

export function loadHistory(): Correction[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Correction[]).map((c) =>
      c.status === 'pending'
        ? { ...c, status: 'error', error: c.error ?? 'Interrupted' }
        : c,
    );
  } catch {
    return [];
  }
}

export function saveHistory(items: Correction[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}
