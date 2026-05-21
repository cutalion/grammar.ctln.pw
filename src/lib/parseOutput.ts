export interface ParsedOutput {
  corrected: string;
  notes?: string;
}

export function parseOutput(raw: string): ParsedOutput {
  const correctedMatch = raw.match(/<corrected>([\s\S]*?)<\/corrected>/i);
  if (!correctedMatch) {
    return { corrected: raw.trim() };
  }
  const notesMatch = raw.match(/<notes>([\s\S]*?)<\/notes>/i);
  const notes = notesMatch?.[1].trim();
  return {
    corrected: correctedMatch[1].trim(),
    notes: notes && notes.length > 0 ? notes : undefined,
  };
}
