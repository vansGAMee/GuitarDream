import { describe, it, expect } from 'vitest';
import {
  createFretGeometry,
  getFretBounds,
  getStringCenter,
  TOTAL_FRETS,
} from '../geometry/fretboardGeometry';

describe('Shared Fretboard Geometry', () => {
  it('creates ordered non-overlapping fret boundaries from 0 to 24', () => {
    const geoms = createFretGeometry(TOTAL_FRETS);
    expect(geoms.length).toBe(TOTAL_FRETS + 1);

    for (let i = 0; i < geoms.length; i++) {
      expect(geoms[i].fret).toBe(i);
      expect(geoms[i].width).toBeGreaterThan(0);
      expect(geoms[i].right).toBe(geoms[i].left + geoms[i].width);
      expect(geoms[i].center).toBe(geoms[i].left + geoms[i].width / 2);

      if (i > 0) {
        expect(geoms[i].left).toBe(geoms[i - 1].right);
      }
    }
  });

  it('returns valid fret bounds for in-range and out-of-range queries', () => {
    const fret0 = getFretBounds(0);
    expect(fret0.fret).toBe(0);
    expect(fret0.left).toBe(0);

    const fret12 = getFretBounds(12);
    expect(fret12.fret).toBe(12);

    const negativeFret = getFretBounds(-5);
    expect(negativeFret.fret).toBe(0);

    const hugeFret = getFretBounds(99);
    expect(hugeFret.fret).toBe(TOTAL_FRETS);
  });

  it('returns consistent vertical string centers', () => {
    expect(getStringCenter(0)).toBe(10); // high e
    expect(getStringCenter(1)).toBe(26); // B
    expect(getStringCenter(2)).toBe(42); // G
    expect(getStringCenter(3)).toBe(58); // D
    expect(getStringCenter(4)).toBe(74); // A
    expect(getStringCenter(5)).toBe(90); // low E
  });
});
