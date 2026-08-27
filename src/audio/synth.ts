import { Note } from '../types/music';
import { noteToMidi, noteToFrequency } from '../music/midiNotes';
import { GuitarFxNode } from './fx';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let fxNode: GuitarFxNode | null = null;

// Soundfont sample buffer cache: MIDI number -> AudioBuffer
const sampleBufferCache = new Map<number, AudioBuffer>();
let isSoundfontLoading = false;
let soundfontRawData: Record<string, string> | null = null;

const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

function midiToSoundfontName(midi: number): string {
  const noteIndex = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return NOTE_NAMES[noteIndex] + octave;
}

// Convert base64 data URI to ArrayBuffer
function base64ToArrayBuffer(base64Uri: string): ArrayBuffer {
  const base64 = base64Uri.replace(/^data:audio\/[^;]+;base64,/, '');
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

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
    masterGain.gain.setValueAtTime(0.85, audioCtx.currentTime);

    fxNode = new GuitarFxNode(audioCtx);

    fxNode.output.connect(compressor);
    compressor.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    // Preload soundfont in background
    loadGuitarSoundfont();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  return audioCtx;
}

export async function loadGuitarSoundfont(): Promise<void> {
  if (isSoundfontLoading || soundfontRawData) return;
  isSoundfontLoading = true;

  try {
    const res = await fetch('/soundfonts/acoustic_guitar_steel.json');
    if (!res.ok) throw new Error('Soundfont fetch failed');
    soundfontRawData = await res.json();

    // Pre-decode essential guitar range (MIDI 40 to 88)
    if (soundfontRawData && audioCtx) {
      for (let midi = 40; midi <= 88; midi++) {
        decodeMidiNote(midi).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('Could not load acoustic soundfont, using physical synth fallback:', err);
  } finally {
    isSoundfontLoading = false;
  }
}

async function decodeMidiNote(midi: number): Promise<AudioBuffer | null> {
  if (sampleBufferCache.has(midi)) {
    return sampleBufferCache.get(midi)!;
  }
  if (!soundfontRawData || !audioCtx) return null;

  const noteName = midiToSoundfontName(midi);
  const base64 = soundfontRawData[noteName];
  if (!base64) return null;

  try {
    const arrayBuffer = base64ToArrayBuffer(base64);
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    sampleBufferCache.set(midi, audioBuffer);
    return audioBuffer;
  } catch (err) {
    console.warn('Failed to decode note sample:', noteName, err);
    return null;
  }
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
  const midi = noteToMidi(note);

  // If real sampled sound is available, play high-definition acoustic sample
  const cachedBuffer = sampleBufferCache.get(midi);
  if (cachedBuffer) {
    playSampledVoice(cachedBuffer, t, durationSec);
    return;
  }

  // If sample is not decoded yet, decode asynchronously for next time and play acoustic synth
  if (soundfontRawData) {
    decodeMidiNote(midi).then((buf) => {
      if (buf && startTime === undefined && Math.abs(ctx.currentTime - t) < 0.05) {
        // Can use next time
      }
    });
  }

  playPhysicalSynthVoice(note, t, durationSec);
}

function playSampledVoice(buffer: AudioBuffer, t: number, durationSec: number): void {
  if (!audioCtx) return;
  const ctx = audioCtx;

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gainNode = ctx.createGain();
  const safeDuration = Math.max(0.08, durationSec);

  // Natural acoustic sustain and release
  gainNode.gain.setValueAtTime(0.85, t);
  const sustainEnd = t + Math.max(0.05, safeDuration * 0.85);
  gainNode.gain.setValueAtTime(0.85, sustainEnd);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, sustainEnd + 0.3);

  source.connect(gainNode);

  if (fxNode) {
    gainNode.connect(fxNode.input);
  } else {
    gainNode.connect(ctx.destination);
  }

  source.start(t);
  source.stop(sustainEnd + 0.35);
}

function playPhysicalSynthVoice(note: Note, t: number, durationSec: number): void {
  if (!audioCtx) return;
  const ctx = audioCtx;
  const freq = noteToFrequency(note);

  const safeDuration = Math.max(0.05, Math.min(durationSec, 3.0));
  const attackTime = Math.min(0.005, safeDuration * 0.15);
  const releaseTime = safeDuration;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const sub = ctx.createOscillator();

  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(freq, t);

  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(freq * 1.001, t);

  sub.type = 'sine';
  sub.frequency.setValueAtTime(freq * 2, t);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(freq * 6, 7000), t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.2, 350), t + releaseTime * 0.7);

  const bodyFilter = ctx.createBiquadFilter();
  bodyFilter.type = 'peaking';
  bodyFilter.frequency.setValueAtTime(180, t);
  bodyFilter.Q.setValueAtTime(2, t);
  bodyFilter.gain.setValueAtTime(2, t);

  const noteGain = ctx.createGain();
  noteGain.gain.setValueAtTime(0.0001, t);
  noteGain.gain.linearRampToValueAtTime(0.24, t + attackTime);
  noteGain.gain.exponentialRampToValueAtTime(0.0001, t + releaseTime);

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
    const strumOffset = idx * 0.008;
    playPluckedGuitarNote(note, t + strumOffset, durationSec);
  });
}
