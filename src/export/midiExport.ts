import { Song } from '../types/music';
import { noteToMidi } from '../music/midiNotes';
import { durationToBeats } from '../music/duration';

function writeVarInt(value: number): number[] {
  let buffer = value & 0x7f;
  const bytes: number[] = [];
  while ((value >>= 7)) {
    buffer <<= 8;
    buffer |= (value & 0x7f) | 0x80;
  }
  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) buffer >>= 8;
    else break;
  }
  return bytes;
}

export function generateMidiFile(song: Song): Uint8Array {
  const TPQN = 480; // Ticks per quarter note
  const microsecondsPerBeat = Math.round(60_000_000 / song.bpm);

  const trackEvents: number[] = [];

  // Track Name
  trackEvents.push(0, 0xff, 0x03, song.title.length, ...Array.from(song.title).map((c) => c.charCodeAt(0)));

  // Time Signature: numerator, denominator as log2 (e.g. 4/4 -> 4, 2), clocks per click (24), 32nd notes per quarter (8)
  const denomPow = Math.round(Math.log2(song.timeSignature.denominator));
  trackEvents.push(0, 0xff, 0x58, 4, song.timeSignature.numerator, denomPow, 24, 8);

  // Set Tempo
  trackEvents.push(
    0,
    0xff,
    0x51,
    3,
    (microsecondsPerBeat >> 16) & 0xff,
    (microsecondsPerBeat >> 8) & 0xff,
    microsecondsPerBeat & 0xff
  );

  // Program Change (Acoustic Guitar Nylon = 24 / Steel = 25 in General MIDI 0-indexed)
  trackEvents.push(0, 0xc0, 25);

  let accumulatedDelta = 0;

  song.steps.forEach((step) => {
    const beats = durationToBeats(step.duration);
    const durationTicks = Math.round(beats * TPQN);

    if (!step.notes || step.notes.length === 0) {
      // Rest step: accumulate delta ticks for next note
      accumulatedDelta += durationTicks;
      return;
    }

    const midiNotes = step.notes.map((n) => noteToMidi(n));

    // Note On for all notes in chord
    midiNotes.forEach((midi, idx) => {
      const delta = idx === 0 ? accumulatedDelta : 0;
      trackEvents.push(...writeVarInt(delta));
      trackEvents.push(0x90, midi, 95); // Note on, channel 0, velocity 95
    });

    accumulatedDelta = 0;

    // Note Off for all notes after durationTicks
    midiNotes.forEach((midi, idx) => {
      const delta = idx === 0 ? durationTicks : 0;
      trackEvents.push(...writeVarInt(delta));
      trackEvents.push(0x80, midi, 0); // Note off
    });
  });

  // End of Track
  trackEvents.push(...writeVarInt(accumulatedDelta));
  trackEvents.push(0xff, 0x2f, 0x00);

  // Build File
  const fileBytes: number[] = [];

  // MThd chunk: format 0 (single track), 1 track, TPQN
  fileBytes.push(
    0x4d, 0x54, 0x68, 0x64, // 'MThd'
    0x00, 0x00, 0x00, 0x06, // Header length = 6
    0x00, 0x00,             // Format 0
    0x00, 0x01,             // 1 track
    (TPQN >> 8) & 0xff, TPQN & 0xff // Division
  );

  // MTrk chunk
  const trackLength = trackEvents.length;
  fileBytes.push(
    0x4d, 0x54, 0x72, 0x6b, // 'MTrk'
    (trackLength >> 24) & 0xff,
    (trackLength >> 16) & 0xff,
    (trackLength >> 8) & 0xff,
    trackLength & 0xff,
    ...trackEvents
  );

  return new Uint8Array(fileBytes);
}

export function downloadMidi(song: Song): void {
  const midiBytes = generateMidiFile(song);
  const blob = new Blob([midiBytes.buffer as ArrayBuffer], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${song.title.replace(/[^a-z0-9_\-]/gi, '_')}.mid`;
  a.click();
  URL.revokeObjectURL(url);
}
