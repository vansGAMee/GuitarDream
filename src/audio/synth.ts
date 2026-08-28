import { Note } from '../types/music';
import { noteToMidi } from '../music/midiNotes';
import { GuitarFxNode } from './fx';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let fxNode: GuitarFxNode | null = null;

// Soundfont sample buffer cache: MIDI number -> AudioBuffer
const sampleBufferCache = new Map<number, AudioBuffer>();
const pendingDecodes = new Map<number, Promise<AudioBuffer | null>>();
let soundfontRawData: Record<string, string> | null = null;
let soundfontLoadPromise: Promise<void> | null = null;

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

function warmCoreGuitarSamples(): void {
  if (!audioCtx || !soundfontRawData) return;
  CORE_GUITAR_MIDIS.forEach((midi) => {
    decodeNoteOnDemand(midi).catch(() => {});
  });
}

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();

    compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, audioCtx.currentTime);
    compressor.knee.setValueAtTime(12, audioCtx.currentTime);
    compressor.ratio.setValueAtTime(3, audioCtx.currentTime);
    compressor.attack.setValueAtTime(0.01, audioCtx.currentTime);
    compressor.release.setValueAtTime(0.22, audioCtx.currentTime);

    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.84, audioCtx.currentTime);

    fxNode = new GuitarFxNode(audioCtx);

    fxNode.output.connect(compressor);
    compressor.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    // Fetch and warm reusable samples as soon as the user unlocks Web Audio.
    fetchSoundfontData().then(warmCoreGuitarSamples);
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
  if (soundfontRawData) return;
  if (soundfontLoadPromise) return soundfontLoadPromise;

  soundfontLoadPromise = (async () => {
    try {
      const res = await fetch('/soundfonts/acoustic_guitar_steel.json');
      if (!res.ok) throw new Error('Soundfont fetch failed');
      soundfontRawData = await res.json();

      // Warm a sparse set across the guitar range. Nearby notes can use these instantly
      // while their exact sample is decoded in the background.
      warmCoreGuitarSamples();
    } catch (err) {
      console.error('Failed to load acoustic guitar soundfont:', err);
    } finally {
      soundfontLoadPromise = null;
    }
  })();

  return soundfontLoadPromise;
}

async function decodeNoteOnDemand(midi: number): Promise<AudioBuffer | null> {
  if (sampleBufferCache.has(midi)) {
    return sampleBufferCache.get(midi)!;
  }
  const existingDecode = pendingDecodes.get(midi);
  if (existingDecode) return existingDecode;
  if (!soundfontRawData || !audioCtx) return null;

  const decodePromise = (async (): Promise<AudioBuffer | null> => {
    const noteName = midiToSoundfontName(midi);
    const base64 = soundfontRawData?.[noteName];
    if (!base64 || !audioCtx) return null;

    try {
      const arrayBuffer = base64ToArrayBuffer(base64);
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      sampleBufferCache.set(midi, audioBuffer);
      return audioBuffer;
    } catch {
      return null;
    } finally {
      pendingDecodes.delete(midi);
    }
  })();

  pendingDecodes.set(midi, decodePromise);
  return decodePromise;
}

export function getFxNode(): GuitarFxNode | null {
  if (!fxNode) {
    getAudioContext();
  }
  return fxNode;
}

export function playPluckedGuitarNote(note: Note, startTime?: number, durationSec = 1.0, velocity = 0.88): void {
  const ctx = getAudioContext();
  const t = startTime !== undefined ? Math.max(ctx.currentTime, startTime) : ctx.currentTime;
  const midi = noteToMidi(note);

  // 1. If exact note sample buffer is already cached, play directly at 1.0 pitch
  const cachedBuffer = sampleBufferCache.get(midi);
  if (cachedBuffer) {
    playSampledVoice(cachedBuffer, 1.0, t, durationSec, velocity);
    return;
  }

  // 2. Reuse an in-flight decode instead of dropping the first note while it loads.
  const exactDecode = soundfontRawData
    ? decodeNoteOnDemand(midi)
    : fetchSoundfontData().then(() => decodeNoteOnDemand(midi));

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
    playSampledVoice(nearestBuffer, playbackRate, t, durationSec, velocity);
    return;
  }

  // 4. With no warm sample available, play the exact sample as soon as it is ready.
  // Scheduled playback gets a tight deadline; direct fret taps allow a slightly longer one.
  exactDecode.then((buf) => {
    const latestUsefulTime = startTime === undefined ? t + 0.24 : t + 0.035;
    if (buf && ctx.currentTime <= latestUsefulTime) {
      playSampledVoice(buf, 1.0, Math.max(ctx.currentTime, t), durationSec, velocity);
    }
  });
}

function playSampledVoice(buffer: AudioBuffer, playbackRate: number, t: number, durationSec: number, velocity: number): void {
  if (!audioCtx) return;
  const ctx = audioCtx;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.setValueAtTime(playbackRate, t);

  const gainNode = ctx.createGain();
  const safeDuration = Math.max(0.08, durationSec);

  // Natural acoustic guitar pluck dynamics
  const peakGain = Math.max(0.1, Math.min(1, velocity));
  gainNode.gain.setValueAtTime(0.0001, t);
  gainNode.gain.linearRampToValueAtTime(peakGain, t + 0.003);
  const sustainEnd = t + Math.max(0.05, safeDuration * 0.85);
  gainNode.gain.setValueAtTime(peakGain, sustainEnd);
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

  const orderedNotes = [...notes].sort((a, b) => b.string - a.string);
  const chordVelocity = Math.max(0.56, 0.88 - Math.max(0, orderedNotes.length - 1) * 0.06);

  orderedNotes.forEach((note, idx) => {
    const strumOffset = idx * 0.009;
    playPluckedGuitarNote(note, t + strumOffset, durationSec, chordVelocity);
  });
}
