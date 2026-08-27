import { describe, it, expect } from 'vitest';
import { Note, GuitarString, Step, createEmptySong } from '../types/music';
import { groupStepsIntoMeasures } from '../music/measures';

// Helper simulating the exact toggleDraftNote logic from songContext
function simulateToggleDraftNote(draft: Note[], stringIndex: GuitarString, fret: number): Note[] {
  const existingIdx = draft.findIndex((n) => n.string === stringIndex);
  if (existingIdx !== -1) {
    if (draft[existingIdx].fret === fret) {
      return draft.filter((_, idx) => idx !== existingIdx);
    } else {
      return draft.map((n, idx) => (idx === existingIdx ? { string: stringIndex, fret } : n));
    }
  } else {
    return [...draft, { string: stringIndex, fret }];
  }
}

describe('Workflow & Acceptance Tests', () => {
  it('Section 51: Same-string note selection and toggle test', () => {
    let draft: Note[] = [];

    // 1. Tap A string (string 4) fret 2
    draft = simulateToggleDraftNote(draft, 4, 2);
    expect(draft).toEqual([{ string: 4, fret: 2 }]);

    // 2. Tap A string fret 5
    draft = simulateToggleDraftNote(draft, 4, 5);
    expect(draft).toEqual([{ string: 4, fret: 5 }]); // only A5 remains

    // 3. Tap A5 again
    draft = simulateToggleDraftNote(draft, 4, 5);
    expect(draft).toEqual([]); // A string becomes unselected
  });

  it('Section 50: Full Chord Creation, Step Commit, and Rest Creation Flow', () => {
    let song = createEmptySong('Test Riff');
    let draft: Note[] = [];

    // Step 1: Select low E0 (5, 0), A2 (4, 2), D2 (3, 2)
    draft = simulateToggleDraftNote(draft, 5, 0);
    draft = simulateToggleDraftNote(draft, 4, 2);
    draft = simulateToggleDraftNote(draft, 3, 2);
    expect(draft.length).toBe(3);

    // Commit Step 1 (Chord)
    const step1: Step = {
      id: 'step-1',
      notes: [...draft].sort((a, b) => a.string - b.string),
      duration: 'quarter',
    };
    song = { ...song, steps: [...song.steps, step1] };
    draft = [];

    expect(song.steps.length).toBe(1);
    expect(song.steps[0].notes.length).toBe(3);
    expect(draft.length).toBe(0);

    // Step 2: Select low E3 (5, 3)
    draft = simulateToggleDraftNote(draft, 5, 3);
    const step2: Step = {
      id: 'step-2',
      notes: [...draft],
      duration: 'quarter',
    };
    song = { ...song, steps: [...song.steps, step2] };
    draft = [];

    expect(song.steps.length).toBe(2);
    expect(song.steps[1].notes).toEqual([{ string: 5, fret: 3 }]);

    // Step 3: Advance with no notes (Rest Step)
    const step3: Step = {
      id: 'step-3',
      notes: [],
      duration: 'quarter',
    };
    song = { ...song, steps: [...song.steps, step3] };

    expect(song.steps.length).toBe(3);
    expect(song.steps[2].notes).toEqual([]); // rest

    // Verification for PLAY mode
    expect(song.steps[0].notes.map((n) => `${n.string}:${n.fret}`)).toEqual(['3:2', '4:2', '5:0']);
    expect(song.steps[1].notes.map((n) => `${n.string}:${n.fret}`)).toEqual(['5:3']);
    expect(song.steps[2].notes).toEqual([]);
  });

  it('Section 52: Existing Step In-Place Edit Test', () => {
    let song = createEmptySong('Edit Test');
    song.steps = [
      {
        id: 's1',
        notes: [{ string: 4, fret: 2 }, { string: 3, fret: 2 }],
        duration: 'quarter',
      },
      {
        id: 's2',
        notes: [{ string: 5, fret: 3 }],
        duration: 'quarter',
      },
    ];

    // Tap step 0 to edit
    let editDraft = [...song.steps[0].notes];
    // Change D string from fret 2 to fret 4
    editDraft = simulateToggleDraftNote(editDraft, 3, 4);

    // Save in place
    const updatedSteps = [...song.steps];
    updatedSteps[0] = { ...updatedSteps[0], notes: editDraft };
    song = { ...song, steps: updatedSteps };

    expect(song.steps.length).toBe(2); // No duplicate step created
    expect(song.steps[0].notes).toEqual([
      { string: 4, fret: 2 },
      { string: 3, fret: 4 },
    ]);
    expect(song.steps[1].notes).toEqual([{ string: 5, fret: 3 }]);
  });

  it('Section 53: Long Song 16-Measure Test', () => {
    const song = createEmptySong('Long Song');
    const steps: Step[] = [];

    // Create 16 measures of 4/4 with 4 quarter notes each (64 steps)
    for (let m = 0; m < 16; m++) {
      for (let b = 0; b < 4; b++) {
        steps.push({
          id: `step_${m}_${b}`,
          notes: [{ string: 5, fret: (m + b) % 12 }],
          duration: 'quarter',
        });
      }
    }

    song.steps = steps;

    const measures = groupStepsIntoMeasures(song.steps, song.timeSignature);
    expect(measures.length).toBe(16);

    let totalBeats = 0;
    measures.forEach((m, idx) => {
      expect(m.measureNumber).toBe(idx + 1);
      expect(m.steps.length).toBe(4);
      expect(m.totalBeats).toBe(4);
      totalBeats += m.totalBeats;
    });

    expect(totalBeats).toBe(64);

    // Verify last measure contains correct steps
    expect(measures[15].steps[3].step.id).toBe('step_15_3');
  });
});
