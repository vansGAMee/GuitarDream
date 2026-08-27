export type GuitarString = 0 | 1 | 2 | 3 | 4 | 5;

export const STRING_NAMES = ['e', 'B', 'G', 'D', 'A', 'E'] as const;

export const OPEN_STRING_MIDI = [
  64, // 0 = high e (E4)
  59, // 1 = B (B3)
  55, // 2 = G (G3)
  50, // 3 = D (D3)
  45, // 4 = A (A2)
  40, // 5 = low E (E2)
] as const;

export type Note = {
  string: GuitarString;
  fret: number;
};

export type NoteDuration =
  | 'whole'
  | 'half'
  | 'quarter'
  | 'eighth'
  | 'sixteenth';

export type Step = {
  id: string;
  notes: Note[];
  duration: NoteDuration;
};

export type TimeSignature = {
  numerator: number;
  denominator: number;
};

export type FxSettings = {
  driveEnabled: boolean;
  driveAmount: number; // 0 to 100

  delayEnabled: boolean;
  delayMix: number; // 0 to 1
  delayTime: number; // 0.05 to 1.0 (seconds)
  delayFeedback: number; // 0 to 0.9

  reverbEnabled: boolean;
  reverbMix: number; // 0 to 1
};

export type Song = {
  id: string;
  title: string;
  bpm: number;
  timeSignature: TimeSignature;
  steps: Step[];
  fx: FxSettings;
  createdAt: number;
  updatedAt: number;
};

export type AppMode = 'TAB' | 'PLAY';

export const DEFAULT_FX: FxSettings = {
  driveEnabled: false,
  driveAmount: 30,
  delayEnabled: false,
  delayMix: 0.35,
  delayTime: 0.3,
  delayFeedback: 0.4,
  reverbEnabled: false,
  reverbMix: 0.25,
};

export function createEmptySong(title = 'Untitled Riff'): Song {
  const now = Date.now();
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'song_' + now + '_' + Math.random().toString(36).slice(2, 8),
    title,
    bpm: 120,
    timeSignature: { numerator: 4, denominator: 4 },
    steps: [],
    fx: { ...DEFAULT_FX },
    createdAt: now,
    updatedAt: now,
  };
}
