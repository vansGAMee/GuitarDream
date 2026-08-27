import { GuitarString } from '../types/music';

export type FretGeometry = {
  fret: number;
  left: number;
  right: number;
  width: number;
  center: number;
};

// 0 is open string/nut area; frets 1..24
export const FRET_WIDTHS: number[] = [
  48, // Fret 0 (Open strings area)
  92, // 1
  88, // 2
  84, // 3
  80, // 4
  76, // 5
  73, // 6
  70, // 7
  67, // 8
  64, // 9
  61, // 10
  58, // 11
  56, // 12
  54, // 13
  52, // 14
  50, // 15
  48, // 16
  47, // 17
  46, // 18
  45, // 19
  44, // 20
  43, // 21
  42, // 22
  41, // 23
  40, // 24
];

export const TOTAL_FRETS = 24;

// Standard string vertical centers as percentages from top (0 = high e, 5 = low E)
// In a 6-row grid with top/bottom padding, each row is 1/6 (16.666%)
// The centers of 6 equal rows are (s + 0.5) / 6 * 100%
export const STRING_VERTICAL_PERCENTAGES = [
  (0 + 0.5) / 6 * 100, // 8.333% -> or standard visual 10%
  (1 + 0.5) / 6 * 100, // 25.0% -> 26%
  (2 + 0.5) / 6 * 100, // 41.666% -> 42%
  (3 + 0.5) / 6 * 100, // 58.333% -> 58%
  (4 + 0.5) / 6 * 100, // 75.0% -> 74%
  (5 + 0.5) / 6 * 100, // 91.666% -> 90%
];

export const STRING_VISUAL_PERCENTAGES = [10, 26, 42, 58, 74, 90] as const;

// Precompute fret geometries
export function createFretGeometry(maxFret = TOTAL_FRETS): FretGeometry[] {
  const geometries: FretGeometry[] = [];
  let currentLeft = 0;

  for (let fret = 0; fret <= maxFret; fret++) {
    const width = FRET_WIDTHS[fret] ?? 40;
    const right = currentLeft + width;
    const center = currentLeft + width / 2;

    geometries.push({
      fret,
      left: currentLeft,
      right,
      width,
      center,
    });

    currentLeft += width;
  }

  return geometries;
}

export const SHARED_FRET_GEOMETRIES = createFretGeometry(TOTAL_FRETS);
export const TOTAL_NECK_WIDTH = SHARED_FRET_GEOMETRIES[SHARED_FRET_GEOMETRIES.length - 1].right;

export function getFretBounds(fret: number): FretGeometry {
  if (fret < 0) return SHARED_FRET_GEOMETRIES[0];
  if (fret >= SHARED_FRET_GEOMETRIES.length) {
    return SHARED_FRET_GEOMETRIES[SHARED_FRET_GEOMETRIES.length - 1];
  }
  return SHARED_FRET_GEOMETRIES[fret];
}

export function getStringCenter(stringIndex: GuitarString): number {
  return STRING_VISUAL_PERCENTAGES[stringIndex] ?? 50;
}

export function isSingleDotFret(fret: number): boolean {
  return [3, 5, 7, 9, 15, 17, 19, 21].includes(fret);
}

export function isDoubleDotFret(fret: number): boolean {
  return [12, 24].includes(fret);
}
