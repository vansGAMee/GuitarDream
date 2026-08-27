import { Note } from '../types/music';
import { noteToFrequency } from '../music/midiNotes';
import { GuitarFxNode } from './fx';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let fxNode: GuitarFxNode | null = null;

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();

    compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-14, audioCtx.currentTime);
    compressor.knee.setValueAtTime(6, audioCtx.currentTime);
    compressor.ratio.setValueAtTime(8, audioCtx.currentTime);
    compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
    compressor.release.setValueAtTime(0.15, audioCtx.currentTime);

    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.8, audioCtx.currentTime);

    fxNode = new GuitarFxNode(audioCtx);

    fxNode.output.connect(compressor);
    compressor.connect(masterGain);
    masterGain.connect(audioCtx.destination);
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  return audioCtx;
}

export function getFxNode(): GuitarFxNode | null {
  if (!fxNode) {
    getAudioContext();
  }
  return fxNode;
}

export function playPluckedGuitarNote(note: Note, startTime?: number, durationSec = 1.0): void {
  const ctx = getAudioContext();
  const t = startTime !== undefined ? Math.max(ctx.currentTime, startTime) : ctx.currentTime;
  const freq = noteToFrequency(note);

  // Safe duration bounds
  const safeDuration = Math.max(0.04, Math.min(durationSec, 3.0));
  const attackTime = Math.min(0.005, safeDuration * 0.15);
  const releaseTime = safeDuration;

  // Plucked guitar voice modeling using dual-oscillator acoustic resonance
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const sub = ctx.createOscillator();

  // Waveform mixture: triangle + sawtooth with slight detune gives rich acoustic string character
  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(freq, t);

  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(freq * 1.001, t);

  sub.type = 'sine';
  sub.frequency.setValueAtTime(freq * 2, t);

  // Lowpass filter for natural acoustic decay
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(freq * 6, 7000), t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.2, 350), t + releaseTime * 0.7);

  // Body resonance filter
  const bodyFilter = ctx.createBiquadFilter();
  bodyFilter.type = 'peaking';
  bodyFilter.frequency.setValueAtTime(180, t);
  bodyFilter.Q.setValueAtTime(2, t);
  bodyFilter.gain.setValueAtTime(2, t);

  // Amp envelope
  const noteGain = ctx.createGain();
  noteGain.gain.setValueAtTime(0.0001, t);
  noteGain.gain.linearRampToValueAtTime(0.24, t + attackTime);
  noteGain.gain.exponentialRampToValueAtTime(0.0001, t + releaseTime);

  // Connect Voice
  osc1.connect(filter);
  osc2.connect(filter);
  sub.connect(filter);

  filter.connect(bodyFilter);
  bodyFilter.connect(noteGain);

  if (fxNode) {
    noteGain.connect(fxNode.input);
  } else {
    noteGain.connect(ctx.destination);
  }

  osc1.start(t);
  osc2.start(t);
  sub.start(t);

  const stopTime = t + releaseTime + 0.05;
  osc1.stop(stopTime);
  osc2.stop(stopTime);
  sub.stop(stopTime);
}

export function playChord(notes: Note[], startTime?: number, durationSec = 1.0): void {
  if (!notes || notes.length === 0) return;
  const ctx = getAudioContext();
  const t = startTime !== undefined ? Math.max(ctx.currentTime, startTime) : ctx.currentTime;

  notes.forEach((note, idx) => {
    // Subtle realistic pick strum stagger (8ms between strings)
    const strumOffset = idx * 0.008;
    playPluckedGuitarNote(note, t + strumOffset, durationSec);
  });
}
