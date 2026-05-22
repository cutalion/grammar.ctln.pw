import { useCallback, useEffect, useState } from 'react';
import { Correction, loadHistory, saveHistory } from '../storage/corrections';
import { ProviderConfig } from '../providers/types';
import { getAdapter } from '../providers';
import { SYSTEM_PROMPT } from '../prompts/systemPrompt';
import { parseOutput } from '../lib/parseOutput';
import { shortId } from '../lib/id';

export function useCorrections() {
  const [items, setItems] = useState<Correction[]>(() => loadHistory());

  useEffect(() => { saveHistory(items); }, [items]);

  const correct = useCallback(async (input: string, config: ProviderConfig, systemPrompt?: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const id = shortId();
    const created: Correction = {
      id,
      input: trimmed,
      output: '',
      status: 'pending',
      providerLabel: config.label,
      model: config.model,
      createdAt: Date.now(),
    };
    setItems((prev) => [...prev, created]);

    const ctrl = new AbortController();
    try {
      const adapter = getAdapter(config.providerId);
      let full = '';
      for await (const chunk of adapter.send({
        config,
        system: systemPrompt?.trim() ? systemPrompt : SYSTEM_PROMPT,
        messages: [{ id, role: 'user', content: trimmed, createdAt: Date.now() }],
        signal: ctrl.signal,
      })) {
        full += chunk;
      }
      const parsed = parseOutput(full);
      setItems((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, output: parsed.corrected, notes: parsed.notes, status: 'done' }
            : c,
        ),
      );
    } catch (e: unknown) {
      const err = e as { message?: string };
      setItems((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status: 'error', error: err?.message ?? String(e) } : c,
        ),
      );
    }
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  return { items, correct, remove, clear };
}
