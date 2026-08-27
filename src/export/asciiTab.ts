import { Song, STRING_NAMES } from '../types/music';
import { groupStepsIntoMeasures } from '../music/measures';

export function generateAsciiTab(song: Song): string {
  const lines: string[] = [];
  lines.push(`Title: ${song.title}`);
  lines.push(`Tempo: ${song.bpm} BPM | Time Signature: ${song.timeSignature.numerator}/${song.timeSignature.denominator}`);
  lines.push(`Date: ${new Date(song.updatedAt).toLocaleDateString()}`);
  lines.push('='.repeat(60));
  lines.push('');

  if (!song.steps || song.steps.length === 0) {
    lines.push('(Empty tab)');
    return lines.join('\n');
  }

  const measures = groupStepsIntoMeasures(song.steps, song.timeSignature);
  const measuresPerRow = 4;

  for (let mIdx = 0; mIdx < measures.length; mIdx += measuresPerRow) {
    const rowMeasures = measures.slice(mIdx, mIdx + measuresPerRow);
    const rowLines: string[] = STRING_NAMES.map((strName) => `${strName}|-`);

    rowMeasures.forEach((measure, relIdx) => {
      if (relIdx > 0) {
        // Measure separator
        for (let s = 0; s < 6; s++) {
          rowLines[s] += '|-';
        }
      }

      if (measure.steps.length === 0) {
        for (let s = 0; s < 6; s++) {
          rowLines[s] += '-------';
        }
      } else {
        measure.steps.forEach(({ step }) => {
          // Find fret for each string
          const noteMap = new Map<number, number>();
          step.notes.forEach((n) => noteMap.set(n.string, n.fret));

          // Determine column width based on multi-digit frets
          let colWidth = 2;
          step.notes.forEach((n) => {
            if (n.fret >= 10) colWidth = Math.max(colWidth, n.fret.toString().length);
          });

          for (let s = 0; s < 6; s++) {
            if (noteMap.has(s)) {
              const fretStr = noteMap.get(s)!.toString();
              rowLines[s] += fretStr.padEnd(colWidth + 1, '-');
            } else {
              rowLines[s] += '-'.repeat(colWidth + 1);
            }
          }
        });
      }
    });

    // Close row
    for (let s = 0; s < 6; s++) {
      rowLines[s] += '|';
    }

    lines.push(...rowLines);
    lines.push('');
  }

  return lines.join('\n');
}

export function downloadAsciiTab(song: Song): void {
  const content = generateAsciiTab(song);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${song.title.replace(/[^a-z0-9_\-]/gi, '_')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
