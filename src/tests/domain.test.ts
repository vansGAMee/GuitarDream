import { describe, it, expect } from 'vitest';
import { Note, Step, Song, createEmptySong, OPEN_STRING_MIDI } from '../types/music';
import { durationToBeats, durationToMs, beatsToDuration } from '../music/duration';
import { noteToMidi, midiToFrequency, midiToNoteName } from '../music/midiNotes';
import { groupStepsIntoMeasures } from '../music/measures';
import { clampBpm, TapTempoCalculator } from '../music/bpm';
import { BoundedHistory } from '../state/history';

describe('Domain Models & Music Calculations', () => {
  it('correctly maps string orders and open string MIDI pitches', () => {
    // 0 = high e (E4), 5 = low E (E2)
    expect(OPEN_STRING_MIDI[0]).toBe(64); // E4
    expect(OPEN_STRING_MIDI[1]).toBe(59); // B3
    expect(OPEN_STRING_MIDI[2]).toBe(55); // G3
    expect(OPEN_STRING_MIDI[3]).toBe(50); // D3
    expect(OPEN_STRING_MIDI[4]).toBe(45); // A2
    expect(OPEN_STRING_MIDI[5]).toBe(40); // E2
  });

  it('calculates accurate MIDI pitches for fretted and open notes', () => {
    const lowE0: Note = { string: 5, fret: 0 };
    const lowE3: Note = { string: 5, fret: 3 }; // G2
    const a2: Note = { string: 4, fret: 2 }; // B2
    const highE12: Note = { string: 0, fret: 12 }; // E5

    expect(noteToMidi(lowE0)).toBe(40);
    expect(noteToMidi(lowE3)).toBe(43);
    expect(noteToMidi(a2)).toBe(47);
    expect(noteToMidi(highE12)).toBe(76);

    expect(midiToNoteName(40)).toBe('E2');
    expect(midiToNoteName(43)).toBe('G2');
    expect(midiToNoteName(69)).toBe('A4');
    expect(midiToFrequency(69)).toBeCloseTo(440, 2);
  });

  it('calculates duration to beats and ms correctly', () => {
    expect(durationToBeats('whole')).toBe(4);
    expect(durationToBeats('half')).toBe(2);
    expect(durationToBeats('quarter')).toBe(1);
    expect(durationToBeats('eighth')).toBe(0.5);
    expect(durationToBeats('sixteenth')).toBe(0.25);

    // 120 BPM -> 1 beat = 500ms
    expect(durationToMs('quarter', 120)).toBe(500);
    expect(durationToMs('eighth', 120)).toBe(250);
    expect(durationToMs('half', 120)).toBe(1000);

    expect(beatsToDuration(4)).toBe('whole');
    expect(beatsToDuration(1)).toBe('quarter');
    expect(beatsToDuration(0.5)).toBe('eighth');
  });

  it('groups steps into measures accurately based on rhythmic durations', () => {
    const timeSignature = { numerator: 4, denominator: 4 };

    // 4 quarter notes = 1 full measure
    const steps: Step[] = [
      { id: '1', notes: [{ string: 5, fret: 0 }], duration: 'quarter' },
      { id: '2', notes: [{ string: 5, fret: 2 }], duration: 'quarter' },
      { id: '3', notes: [{ string: 5, fret: 3 }], duration: 'quarter' },
      { id: '4', notes: [{ string: 4, fret: 0 }], duration: 'quarter' },
      // Measure 2: 1 half note + 2 quarter notes
      { id: '5', notes: [{ string: 4, fret: 2 }], duration: 'half' },
      { id: '6', notes: [{ string: 3, fret: 0 }], duration: 'quarter' },
      { id: '7', notes: [{ string: 3, fret: 2 }], duration: 'quarter' },
    ];

    const measures = groupStepsIntoMeasures(steps, timeSignature);
    expect(measures.length).toBe(2);
    expect(measures[0].measureNumber).toBe(1);
    expect(measures[0].steps.length).toBe(4);
    expect(measures[0].totalBeats).toBe(4);

    expect(measures[1].measureNumber).toBe(2);
    expect(measures[1].steps.length).toBe(3);
    expect(measures[1].totalBeats).toBe(4);
  });

  it('handles rests as valid steps with empty notes array', () => {
    const timeSignature = { numerator: 4, denominator: 4 };
    const steps: Step[] = [
      { id: '1', notes: [{ string: 5, fret: 0 }], duration: 'half' },
      { id: '2', notes: [], duration: 'half' }, // Rest step
    ];

    const measures = groupStepsIntoMeasures(steps, timeSignature);
    expect(measures.length).toBe(1);
    expect(measures[0].steps.length).toBe(2);
    expect(measures[0].steps[1].step.notes).toEqual([]);
    expect(measures[0].totalBeats).toBe(4);
  });

  it('clamps BPM within valid bounds (30 - 300)', () => {
    expect(clampBpm(20)).toBe(30);
    expect(clampBpm(350)).toBe(300);
    expect(clampBpm(120)).toBe(120);
    expect(clampBpm(NaN)).toBe(120);
  });

  it('calculates tap tempo accurately', () => {
    const calc = new TapTempoCalculator();
    expect(calc.tap()).toBeNull(); // 1 tap is not enough

    // Mock performance.now timestamps roughly 500ms apart (120 BPM)
    const originalNow = performance.now;
    let mockTime = 1000;
    performance.now = () => mockTime;

    calc.reset();
    calc.tap(); // tap 1 at 1000ms

    mockTime = 1500;
    const bpm1 = calc.tap(); // tap 2 at 1500ms (diff 500ms -> 120 BPM)
    expect(bpm1).toBe(120);

    mockTime = 2000;
    const bpm2 = calc.tap();
    expect(bpm2).toBe(120);

    performance.now = originalNow;
  });

  it('manages bounded undo/redo history correctly', () => {
    const history = new BoundedHistory<Song>(5);
    const song1 = createEmptySong('Riff 1');
    const song2: Song = { ...song1, title: 'Riff 2', bpm: 140 };
    const song3: Song = { ...song2, title: 'Riff 3', bpm: 160 };

    history.push(song1);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);

    history.push(song2);
    const undoneTo2 = history.undo(song3);
    expect(undoneTo2?.title).toBe('Riff 2');
    expect(history.canRedo()).toBe(true);

    const undoneTo1 = history.undo(undoneTo2!);
    expect(undoneTo1?.title).toBe('Riff 1');

    const redoneTo2 = history.redo(undoneTo1!);
    expect(redoneTo2?.title).toBe('Riff 2');
  });
});
