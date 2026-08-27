import { Step, Note, NoteDuration, GuitarString } from '../types/music';

// Parse text from clipboard (ASCII tab or serialized steps)
export function parsePastedTab(text: string, defaultDuration: NoteDuration = 'quarter'): Step[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // 1. Try parsing JSON if copied from our app
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].duration) {
      return parsed.map((s) => ({
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'step_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        notes: (s.notes || []).map((n: Note) => ({ string: n.string, fret: n.fret })),
        duration: s.duration || defaultDuration,
      }));
    }
  } catch {}

  // 2. Try parsing 6-line ASCII Tab
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length >= 6) {
    const stringLines: string[] = [];
    const stringMap: Record<string, number> = { e: 0, E: 0, B: 1, b: 1, G: 2, g: 2, D: 3, d: 3, A: 4, a: 4 };

    // Find 6 matching guitar string lines
    for (const line of lines) {
      const match = line.match(/^([eEBGDAebgda])\s*[:|](.*)$/);
      if (match) {
        const strName = match[1];
        const sIdx = stringMap[strName] !== undefined ? stringMap[strName] : stringLines.length;
        stringLines[sIdx] = match[2];
      } else if (line.includes('|') || line.includes('-')) {
        stringLines.push(line);
      }
    }

    if (stringLines.length >= 6) {
      const maxCol = Math.max(...stringLines.slice(0, 6).map((l) => l.length));
      const extractedSteps: Step[] = [];

      let col = 0;
      while (col < maxCol) {
        const notesAtCol: Note[] = [];
        let hasFret = false;

        for (let s = 0; s < 6; s++) {
          const char = (stringLines[s] || '')[col];
          if (char && char >= '0' && char <= '9') {
            hasFret = true;
            // Check for multi-digit fret
            let fretNum = parseInt(char);
            const nextChar = (stringLines[s] || '')[col + 1];
            if (nextChar && nextChar >= '0' && nextChar <= '9') {
              fretNum = parseInt(char + nextChar);
            }
            notesAtCol.push({ string: s as GuitarString, fret: fretNum });
          }
        }

        if (hasFret) {
          extractedSteps.push({
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'step_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            notes: notesAtCol,
            duration: defaultDuration,
          });
        }

        col++;
      }

      if (extractedSteps.length > 0) {
        return extractedSteps;
      }
    }
  }

  return [];
}
