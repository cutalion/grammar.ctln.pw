import { useCallback, useEffect, useRef, useState } from 'react';
import { Correction, loadHistory, saveHistory } from '../storage/corrections';
import { ProviderConfig } from '../providers/types';
import { adapters } from '../providers';
import { SYSTEM_PROMPT } from '../prompts/systemPrompt';
import { parseOutput } from '../lib/parseOutput';
import { shortId } from '../lib/id';

export function useCorrections() {
  const [items, setItems] = useState<Correction[]>(() => loadHistory());

  useEffect(() => { saveHistory(items); }, [items]);

  // Abort any in-flight requests on unmount so their fetches don't outlive the
  // hook and try to update state that's gone.
  const inFlight = useRef<Set<AbortController>>(new Set());
  useEffect(() => () => {
    for (const ctrl of inFlight.current) ctrl.abort();
  }, []);

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
    inFlight.current.add(ctrl);
    try {
      const adapter = adapters[config.providerId];
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
      // An abort is our own unmount cleanup, not a failure — leave the item
      // pending in localStorage; loadHistory rewrites leftover pending items to
      // "Interrupted" on the next load.
      if (e instanceof DOMException && e.name === 'AbortError') return;
      const err = e as { message?: string };
      setItems((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status: 'error', error: err?.message ?? String(e) } : c,
        ),
      );
    } finally {
      inFlight.current.delete(ctrl);
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
