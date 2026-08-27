import { getAudioContext } from './synth';

export function playMetronomeTick(isAccent: boolean, time?: number, volume = 0.5): void {
  const ctx = getAudioContext();
  const t = time !== undefined ? Math.max(ctx.currentTime, time) : ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(isAccent ? 1600 : 950, t);
  osc.frequency.exponentialRampToValueAtTime(100, t + 0.04);

  gain.gain.setValueAtTime(isAccent ? volume * 0.8 : volume * 0.45, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + 0.05);
}
