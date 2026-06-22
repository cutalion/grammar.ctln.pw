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

  const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';
  const message = (e: unknown) => (e as { message?: string })?.message ?? String(e);

  // Run one provider call with the given system prompt, accumulate the streamed
  // chunks, and return the parsed result. Each call gets its own AbortController
  // tracked in inFlight so unmount cleanup aborts every in-flight request.
  const runCall = useCallback(
    async (
      input: string,
      config: ProviderConfig,
      system: string,
      tag: 'corrected' | 'suggested',
    ): Promise<ParsedOutput> => {
      const ctrl = new AbortController();
      inFlight.current.add(ctrl);
      try {
        const adapter = adapters[config.providerId];
        let full = '';
        for await (const chunk of adapter.send({
          config,
          system,
          messages: [{ id: shortId(), role: 'user', content: input, createdAt: Date.now() }],
          signal: ctrl.signal,
        })) {
          full += chunk;
        }
        return parseOutput(full, tag);
      } finally {
        inFlight.current.delete(ctrl);
      }
    },
    [],
  );

  // The two slices of a record are produced (and re-produced, on retry) by these
  // helpers. Each owns exactly the fields it writes and clears its own error on
  // success, so retrying one slice never disturbs the other.
  const runCorrection = useCallback(
    async (id: string, input: string, config: ProviderConfig, systemPrompt?: string) => {
      try {
        const parsed = await runCall(
          input,
          config,
          systemPrompt?.trim() ? systemPrompt : SYSTEM_PROMPT,
          'corrected',
        );
        setItems((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, output: parsed.corrected, notes: parsed.notes, status: 'done', error: undefined }
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
    },
    [runCall],
  );

  const runSuggestion = useCallback(
    async (id: string, input: string, config: ProviderConfig, suggestionPrompt?: string) => {
      try {
        const parsed = await runCall(
          input,
          config,
          suggestionPrompt?.trim() ? suggestionPrompt : SUGGESTION_PROMPT,
          'suggested',
        );
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
    },
    [runCall],
  );

  const correct = useCallback(
    async (
      input: string,
      config: ProviderConfig,
      systemPrompt?: string,
      suggestionPrompt?: string,
    ) => {
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

      await Promise.all([
        runCorrection(id, trimmed, config, systemPrompt),
        runSuggestion(id, trimmed, config, suggestionPrompt),
      ]);
    },
    [runCorrection, runSuggestion],
  );

  // Re-run a single failed slice in place, reusing the record's original input.
  // Retry uses the currently active config, so its model/provider may differ
  // from the first attempt — reflect that on the record so the footer stays
  // truthful.
  const retry = useCallback(
    async (
      id: string,
      slice: 'corrected' | 'suggested',
      config: ProviderConfig,
      systemPrompt?: string,
      suggestionPrompt?: string,
    ) => {
      const item = items.find((c) => c.id === id);
      if (!item) return;
      if (slice === 'corrected') {
        setItems((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, status: 'pending', error: undefined, model: config.model, providerLabel: config.label }
              : c,
          ),
        );
        await runCorrection(id, item.input, config, systemPrompt);
      } else {
        setItems((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, model: config.model, providerLabel: config.label, suggestion: { output: '', status: 'pending' } }
              : c,
          ),
        );
        await runSuggestion(id, item.input, config, suggestionPrompt);
      }
    },
    [items, runCorrection, runSuggestion],
  );

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  return { items, correct, retry, remove, clear };
}
