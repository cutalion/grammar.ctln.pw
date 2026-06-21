import { useCallback, useEffect, useRef, useState } from 'react';
import { Correction, loadHistory, saveHistory } from '../storage/corrections';
import { ProviderConfig } from '../providers/types';
import { adapters } from '../providers';
import { SYSTEM_PROMPT } from '../prompts/systemPrompt';
import { SUGGESTION_PROMPT } from '../prompts/suggestionPrompt';
import { parseOutput, ParsedOutput } from '../lib/parseOutput';
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
      suggestion: { output: '', status: 'pending' },
    };
    setItems((prev) => [...prev, created]);

    // Run one provider call with the given system prompt, accumulate the
    // streamed chunks, and return the parsed result. Each call gets its own
    // AbortController tracked in inFlight so unmount cleanup aborts both.
    const run = async (system: string, tag: 'corrected' | 'suggested'): Promise<ParsedOutput> => {
      const ctrl = new AbortController();
      inFlight.current.add(ctrl);
      try {
        const adapter = adapters[config.providerId];
        let full = '';
        for await (const chunk of adapter.send({
          config,
          system,
          messages: [{ id, role: 'user', content: trimmed, createdAt: Date.now() }],
          signal: ctrl.signal,
        })) {
          full += chunk;
        }
        return parseOutput(full, tag);
      } finally {
        inFlight.current.delete(ctrl);
      }
    };

    const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';
    const message = (e: unknown) => (e as { message?: string })?.message ?? String(e);

    const correction = (async () => {
      try {
        const parsed = await run(systemPrompt?.trim() ? systemPrompt : SYSTEM_PROMPT, 'corrected');
        setItems((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, output: parsed.corrected, notes: parsed.notes, status: 'done' }
              : c,
          ),
        );
      } catch (e) {
        // An abort is our own unmount cleanup, not a failure — leave the item
        // pending in localStorage; loadHistory rewrites leftover pending items
        // to "Interrupted" on the next load.
        if (isAbort(e)) return;
        setItems((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: 'error', error: message(e) } : c)),
        );
      }
    })();

    const suggestion = (async () => {
      try {
        const parsed = await run(SUGGESTION_PROMPT, 'suggested');
        setItems((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, suggestion: { output: parsed.corrected, notes: parsed.notes, status: 'done' } }
              : c,
          ),
        );
      } catch (e) {
        if (isAbort(e)) return;
        setItems((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, suggestion: { output: '', status: 'error', error: message(e) } }
              : c,
          ),
        );
      }
    })();

    await Promise.all([correction, suggestion]);
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  return { items, correct, remove, clear };
}
