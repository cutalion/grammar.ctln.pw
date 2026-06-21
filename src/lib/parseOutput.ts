export interface ParsedOutput {
  corrected: string;
  notes?: string;
}

export function parseOutput(
  raw: string,
  tag: 'corrected' | 'suggested' = 'corrected',
): ParsedOutput {
  const primary = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
  let match = raw.match(primary);

  // Fallback to <corrected> tag if primary tag not found and we're not already looking for it
  if (!match && tag !== 'corrected') {
    match = raw.match(/<corrected>([\s\S]*?)<\/corrected>/i);
  }

  if (!match) {
    return { corrected: raw.trim() };
  }
  const notesMatch = raw.match(/<notes>([\s\S]*?)<\/notes>/i);
  const notes = notesMatch?.[1].trim();
  return {
    corrected: match[1].trim(),
    notes: notes && notes.length > 0 ? notes : undefined,
  };
}
