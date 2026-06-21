export interface ParsedOutput {
  corrected: string;
  notes?: string;
}

export function parseOutput(
  raw: string,
  tag: 'corrected' | 'suggested' = 'corrected',
): ParsedOutput {
  const primary = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
  const correctedMatch = raw.match(primary);

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
