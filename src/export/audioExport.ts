import { Song, Note } from '../types/music';
import { durationToBeats } from '../music/duration';
import { noteToMidi } from '../music/midiNotes';

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

// Convert rendered AudioBuffer to 16-bit 44.1kHz Stereo WAV
export function audioBufferToWav(buffer: AudioBuffer): Uint8Array {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const length = buffer.length;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channels & write 16-bit PCM
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Uint8Array(arrayBuffer);
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export async function renderSongToWav(song: Song): Promise<Uint8Array> {
  // 1. Fetch soundfont raw data
  const res = await fetch('/soundfonts/acoustic_guitar_steel.json');
  const soundfont: Record<string, string> = await res.json();

  // 2. Calculate song length
  let songDurationSec = 0;
  song.steps.forEach((s) => {
    const beats = durationToBeats(s.duration);
    songDurationSec += (60 / song.bpm) * beats;
  });

  const totalDurationSec = Math.max(1.0, songDurationSec + 2.5);
  const sampleRate = 44100;
  const totalFrames = Math.ceil(sampleRate * totalDurationSec);

  const OfflineCtxClass =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;

  const offlineCtx = new OfflineCtxClass(2, totalFrames, sampleRate);

  // Decode needed notes for the offline context
  const decodedBuffers = new Map<number, AudioBuffer>();

  const allMidis = new Set<number>();
  song.steps.forEach((s) => {
    s.notes.forEach((n) => allMidis.add(noteToMidi(n)));
  });

  // Also decode basic 6 strings for fallback pitch-shifting
  [40, 45, 50, 55, 59, 64].forEach((m) => allMidis.add(m));

  for (const midi of allMidis) {
    const noteName = midiToSoundfontName(midi);
    const base64 = soundfont[noteName];
    if (base64) {
      try {
        const ab = base64ToArrayBuffer(base64);
        const audioBuf = await offlineCtx.decodeAudioData(ab);
        decodedBuffers.set(midi, audioBuf);
      } catch {}
    }
  }

  // Master compressor and output
  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-12, 0);
  compressor.ratio.setValueAtTime(6, 0);

  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(0.9, 0);

  compressor.connect(masterGain);
  masterGain.connect(offlineCtx.destination);

  // Schedule all steps
  let currentTime = 0.05;

  song.steps.forEach((step) => {
    const beats = durationToBeats(step.duration);
    const stepDurationSec = (60 / song.bpm) * beats;

    if (step.notes && step.notes.length > 0) {
      step.notes.forEach((note: Note, idx: number) => {
        const midi = noteToMidi(note);
        const strumOffset = idx * 0.008;
        const noteTime = currentTime + strumOffset;

        let buffer = decodedBuffers.get(midi);
        let playbackRate = 1.0;

        if (!buffer) {
          let bestMidi: number | null = null;
          let minDiff = Infinity;
          decodedBuffers.forEach((_, m) => {
            const diff = Math.abs(m - midi);
            if (diff < minDiff) {
              minDiff = diff;
              bestMidi = m;
            }
          });
          if (bestMidi !== null) {
            buffer = decodedBuffers.get(bestMidi);
            playbackRate = Math.pow(2, (midi - bestMidi) / 12);
          }
        }

        if (buffer) {
          const source = offlineCtx.createBufferSource();
          source.buffer = buffer;
          source.playbackRate.setValueAtTime(playbackRate, noteTime);

          const gainNode = offlineCtx.createGain();
          const safeDuration = Math.max(0.1, stepDurationSec * 1.3);

          gainNode.gain.setValueAtTime(0.9, noteTime);
          const sustainEnd = noteTime + safeDuration * 0.85;
          gainNode.gain.setValueAtTime(0.9, sustainEnd);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, sustainEnd + 0.4);

          source.connect(gainNode);
          gainNode.connect(compressor);

          source.start(noteTime);
          source.stop(sustainEnd + 0.45);
        }
      });
    }

    currentTime += stepDurationSec;
  });

  const renderedBuffer = await offlineCtx.startRendering();
  return audioBufferToWav(renderedBuffer);
}

export async function downloadAudioWav(song: Song): Promise<void> {
  const wavBytes = await renderSongToWav(song);
  const blob = new Blob([wavBytes.buffer as ArrayBuffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${song.title.replace(/[^a-z0-9_\-]/gi, '_')}.wav`;
  a.click();
  URL.revokeObjectURL(url);
}
