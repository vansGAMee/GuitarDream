export const MIN_BPM = 30;
export const MAX_BPM = 300;
export const DEFAULT_BPM = 120;

export function clampBpm(bpm: number): number {
  if (isNaN(bpm)) return DEFAULT_BPM;
  return Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(bpm)));
}

export class TapTempoCalculator {
  private taps: number[] = [];
  private readonly maxIntervalMs = 2500; // Reset tap tempo if interval > 2.5s
  private readonly maxTaps = 8;

  public tap(): number | null {
    const now = performance.now();
    
    // Check if the last tap was too long ago
    if (this.taps.length > 0) {
      const lastTap = this.taps[this.taps.length - 1];
      if (now - lastTap > this.maxIntervalMs) {
        this.taps = [];
      }
    }

    this.taps.push(now);
    if (this.taps.length > this.maxTaps) {
      this.taps.shift();
    }

    if (this.taps.length < 2) {
      return null;
    }

    // Calculate intervals
    const intervals: number[] = [];
    for (let i = 1; i < this.taps.length; i++) {
      intervals.push(this.taps[i] - this.taps[i - 1]);
    }

    // Average interval
    const avgInterval = intervals.reduce((sum, v) => sum + v, 0) / intervals.length;
    if (avgInterval <= 0) return null;

    const bpm = 60_000 / avgInterval;
    return clampBpm(bpm);
  }

  public reset(): void {
    this.taps = [];
  }
}
