import { Note } from '../types/music';
import { noteToMidi } from '../music/midiNotes';
import { GuitarFxNode } from './fx';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let fxNode: GuitarFxNode | null = null;

// Soundfont sample buffer cache: MIDI number -> AudioBuffer
const sampleBufferCache = new Map<number, AudioBuffer>();
const pendingDecodes = new Set<number>();
let soundfontRawData: Record<string, string> | null = null;
let isSoundfontFetching = false;

const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

function midiToSoundfontName(midi: number): string {
  const noteIndex = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return NOTE_NAMES[noteIndex] + octave;
}

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

// Open string MIDI notes for instant acoustic priority decoding
const CORE_GUITAR_MIDIS = [40, 45, 50, 55, 59, 64, 69, 74];

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
    masterGain.gain.setValueAtTime(0.9, audioCtx.currentTime);

    fxNode = new GuitarFxNode(audioCtx);

    fxNode.output.connect(compressor);
    compressor.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    // Immediately fetch soundfont
    fetchSoundfontData();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

// Start fetching soundfont immediately on page load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    fetchSoundfontData();
  }, 10);
}

async function fetchSoundfontData(): Promise<void> {
  if (isSoundfontFetching || soundfontRawData) return;
  isSoundfontFetching = true;

  try {
    const res = await fetch('/soundfonts/acoustic_guitar_steel.json');
    if (!res.ok) throw new Error('Soundfont fetch failed');
    soundfontRawData = await res.json();

    // Immediately decode core guitar open strings so we have instant sampled audio for any pitch
    if (audioCtx) {
      for (const midi of CORE_GUITAR_MIDIS) {
        decodeNoteOnDemand(midi).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Failed to load acoustic guitar soundfont:', err);
  } finally {
    isSoundfontFetching = false;
  }
}

async function decodeNoteOnDemand(midi: number): Promise<AudioBuffer | null> {
  if (sampleBufferCache.has(midi)) {
    return sampleBufferCache.get(midi)!;
  }
  if (!soundfontRawData || !audioCtx || pendingDecodes.has(midi)) return null;

  pendingDecodes.add(midi);
  const noteName = midiToSoundfontName(midi);
  const base64 = soundfontRawData[noteName];
  if (!base64) {
    pendingDecodes.delete(midi);
    return null;
  }

  try {
    const arrayBuffer = base64ToArrayBuffer(base64);
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    sampleBufferCache.set(midi, audioBuffer);
    pendingDecodes.delete(midi);
    return audioBuffer;
  } catch {
    pendingDecodes.delete(midi);
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

  // 1. If exact note sample buffer is already cached, play directly at 1.0 pitch
  const cachedBuffer = sampleBufferCache.get(midi);
  if (cachedBuffer) {
    playSampledVoice(cachedBuffer, 1.0, t, durationSec);
    return;
  }

  // 2. Trigger on-demand background decode of the exact note
  if (soundfontRawData) {
    decodeNoteOnDemand(midi).catch(() => {});
  } else if (!isSoundfontFetching) {
    fetchSoundfontData();
  }

  // 3. Find closest available real acoustic sample buffer and pitch-shift it
  // This guarantees 100% authentic sampled acoustic guitar sound with ZERO synthesized beeps!
  let bestMidi: number | null = null;
  let minDiff = Infinity;

  sampleBufferCache.forEach((_, cachedMidi) => {
    const diff = Math.abs(cachedMidi - midi);
    if (diff < minDiff) {
      minDiff = diff;
      bestMidi = cachedMidi;
    }
  });

  if (bestMidi !== null) {
    const nearestBuffer = sampleBufferCache.get(bestMidi)!;
    const playbackRate = Math.pow(2, (midi - bestMidi) / 12);
    playSampledVoice(nearestBuffer, playbackRate, t, durationSec);
    return;
  }

  // 4. If soundfont is currently decoding its very first note, decode synchronously/immediately
  if (soundfontRawData) {
    decodeNoteOnDemand(midi).then((buf) => {
      if (buf && startTime === undefined && Math.abs(ctx.currentTime - t) < 0.1) {
        playSampledVoice(buf, 1.0, ctx.currentTime, durationSec);
      }
    });
  }
}

function playSampledVoice(buffer: AudioBuffer, playbackRate: number, t: number, durationSec: number): void {
  if (!audioCtx) return;
  const ctx = audioCtx;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.setValueAtTime(playbackRate, t);

  const gainNode = ctx.createGain();
  const safeDuration = Math.max(0.08, durationSec);

  // Natural acoustic guitar pluck dynamics
  gainNode.gain.setValueAtTime(0.9, t);
  const sustainEnd = t + Math.max(0.05, safeDuration * 0.85);
  gainNode.gain.setValueAtTime(0.9, sustainEnd);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, sustainEnd + 0.35);

  source.connect(gainNode);

  if (fxNode) {
    gainNode.connect(fxNode.input);
  } else {
    gainNode.connect(ctx.destination);
  }

  source.start(t);
  source.stop(sustainEnd + 0.4);
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
