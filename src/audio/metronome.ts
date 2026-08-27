import { getAudioContext } from './synth';

export function playMetronomeTick(isAccent: boolean, time?: number, volume = 0.6): void {
  const ctx = getAudioContext();
  const t = time !== undefined ? Math.max(ctx.currentTime, time) : ctx.currentTime;

  // Realistic acoustic woodblock / studio click
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const masterGain = ctx.createGain();

  // Frequencies for acoustic wooden stick / woodblock strike
  const freq1 = isAccent ? 2200 : 1400;
  const freq2 = isAccent ? 3300 : 2100;

  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(freq1, t);
  osc1.frequency.exponentialRampToValueAtTime(freq1 * 0.4, t + 0.03);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq2, t);
  osc2.frequency.exponentialRampToValueAtTime(freq2 * 0.5, t + 0.025);

  // Filter for natural acoustic resonance
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(isAccent ? 2500 : 1600, t);
  filter.Q.setValueAtTime(3.5, t);

  // Sharp transient envelope
  const vol = isAccent ? volume : volume * 0.65;
  masterGain.gain.setValueAtTime(0.0001, t);
  masterGain.gain.linearRampToValueAtTime(vol, t + 0.002);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, t + (isAccent ? 0.045 : 0.035));

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(masterGain);
  masterGain.connect(ctx.destination);

  osc1.start(t);
  osc2.start(t);

  osc1.stop(t + 0.05);
  osc2.stop(t + 0.05);
}

// Crisp acoustic feedback when user physically taps the Tap Tempo button/screen
export function playTapSound(): void {
  const ctx = getAudioContext();
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1800, t);
  osc.frequency.exponentialRampToValueAtTime(600, t + 0.025);

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.5, t + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + 0.035);
}
