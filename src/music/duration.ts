import { NoteDuration } from '../types/music';

export const ALL_DURATIONS: NoteDuration[] = [
  'whole',
  'half',
  'quarter',
  'eighth',
  'sixteenth',
];

export const DURATION_LABELS: Record<NoteDuration, { name: string; short: string; symbol: string }> = {
  whole: { name: 'Whole (1)', short: '1', symbol: 'w' },
  half: { name: 'Half (1/2)', short: '1/2', symbol: 'h' },
  quarter: { name: 'Quarter (1/4)', short: '1/4', symbol: 'q' },
  eighth: { name: 'Eighth (1/8)', short: '1/8', symbol: 'e' },
  sixteenth: { name: 'Sixteenth (1/16)', short: '1/16', symbol: 's' },
};

export function durationToBeats(duration: NoteDuration): number {
  switch (duration) {
    case 'whole': return 4;
    case 'half': return 2;
    case 'quarter': return 1;
    case 'eighth': return 0.5;
    case 'sixteenth': return 0.25;
    default: return 1;
  }
}

export function durationToMs(duration: NoteDuration, bpm: number): number {
  const beatMs = 60_000 / bpm;
  return beatMs * durationToBeats(duration);
}

export function beatsToDuration(beats: number): NoteDuration {
  if (beats >= 4) return 'whole';
  if (beats >= 2) return 'half';
  if (beats >= 1) return 'quarter';
  if (beats >= 0.5) return 'eighth';
  return 'sixteenth';
}
