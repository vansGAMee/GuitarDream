import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Song, Step, Note, NoteDuration, GuitarString, AppMode, FxSettings, createEmptySong } from '../types/music';
import { BoundedHistory } from './history';
import { dbSaveSong, dbGetSong, dbGetAllSongs, dbDeleteSong, dbGetSetting, dbSetSetting } from '../storage/db';
import { globalPlaybackEngine } from '../audio/playbackEngine';

interface SongContextType {
  song: Song;
  songsList: Song[];
  draftNotes: Note[];
  selectedDuration: NoteDuration;
  editingStepIndex: number | null;
  activeMode: AppMode;
  hasSeenAdvanceHint: boolean;
  canUndo: boolean;
  canRedo: boolean;
  
  // Note / Step operations
  toggleDraftNote: (stringIndex: GuitarString, fret: number) => void;
  commitStep: () => void;
  setDuration: (duration: NoteDuration) => void;
  selectStepForEditing: (index: number | null) => void;
  saveEditedStep: () => void;
  cancelEditing: () => void;
  deleteStep: (index: number) => void;
  insertStep: (index: number, position: 'before' | 'after') => void;
  duplicateStep: (index: number) => void;
  
  // Song operations
  setBpm: (bpm: number) => void;
  setTitle: (title: string) => void;
  updateFx: (fx: Partial<FxSettings>) => void;
  newSong: () => Promise<void>;
  loadSong: (id: string) => Promise<void>;
  duplicateCurrentSong: () => Promise<void>;
  deleteCurrentSong: () => Promise<void>;
  refreshSongsList: () => Promise<void>;
  
  // Shell
  setActiveMode: (mode: AppMode) => void;
  dismissAdvanceHint: () => void;
  undo: () => void;
  redo: () => void;
}

const SongContext = createContext<SongContextType | null>(null);

const LAST_SONG_KEY = 'last_opened_song_id';
const ONBOARDING_HINT_KEY = 'has_seen_advance_hint';

export const SongProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [song, setSong] = useState<Song>(() => createEmptySong());
  const [songsList, setSongsList] = useState<Song[]>([]);
  const [draftNotes, setDraftNotes] = useState<Note[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<NoteDuration>('quarter');
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [activeMode, setActiveModeState] = useState<AppMode>('TAB');
  const [hasSeenAdvanceHint, setHasSeenAdvanceHint] = useState<boolean>(true); // default true while loading
  const [canUndoState, setCanUndoState] = useState<boolean>(false);
  const [canRedoState, setCanRedoState] = useState<boolean>(false);

  const historyRef = useRef<BoundedHistory<Song>>(new BoundedHistory<Song>(50));
  const autosaveTimerRef = useRef<number | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);

  // Update undo/redo availability
  const updateUndoRedoFlags = useCallback(() => {
    setCanUndoState(historyRef.current.canUndo());
    setCanRedoState(historyRef.current.canRedo());
  }, []);

  // Save checkpoint in history
  const recordHistory = useCallback((currentSong: Song) => {
    historyRef.current.push(currentSong);
    updateUndoRedoFlags();
  }, [updateUndoRedoFlags]);

  // Initial Load from DB
  useEffect(() => {
    async function initStorage() {
      try {
        const hintSeen = await dbGetSetting<boolean>(ONBOARDING_HINT_KEY, false);
        setHasSeenAdvanceHint(hintSeen);

        const lastSongId = await dbGetSetting<string | null>(LAST_SONG_KEY, null);
        const all = await dbGetAllSongs();
        setSongsList(all);

        if (lastSongId) {
          const loaded = await dbGetSong(lastSongId);
          if (loaded) {
            setSong(loaded);
            globalPlaybackEngine.setSong(loaded);
            isInitialLoadRef.current = false;
            return;
          }
        }

        if (all.length > 0) {
          setSong(all[0]);
          globalPlaybackEngine.setSong(all[0]);
        } else {
          // Create and save a fresh empty song
          const fresh = createEmptySong('Untitled Riff');
          await dbSaveSong(fresh);
          await dbSetSetting(LAST_SONG_KEY, fresh.id);
          setSong(fresh);
          setSongsList([fresh]);
          globalPlaybackEngine.setSong(fresh);
        }
      } catch (err) {
        console.error('Storage init error:', err);
      } finally {
        isInitialLoadRef.current = false;
      }
    }

    initStorage();
  }, []);

  // Autosave when song changes
  useEffect(() => {
    if (isInitialLoadRef.current) return;

    globalPlaybackEngine.setSong(song);

    if (autosaveTimerRef.current !== null) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(async () => {
      try {
        await dbSaveSong(song);
        await dbSetSetting(LAST_SONG_KEY, song.id);
        const all = await dbGetAllSongs();
        setSongsList(all);
      } catch (err) {
        console.error('Autosave error:', err);
      }
    }, 400);

    return () => {
      if (autosaveTimerRef.current !== null) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [song]);

  // Switch App Mode
  const setActiveMode = useCallback((mode: AppMode) => {
    if (mode === 'TAB' && globalPlaybackEngine.getIsPlaying()) {
      globalPlaybackEngine.pause();
    }
    setActiveModeState(mode);
  }, []);

  // Toggle note in draft
  const toggleDraftNote = useCallback((stringIndex: GuitarString, fret: number) => {
    setDraftNotes((prev) => {
      const existingIdx = prev.findIndex((n) => n.string === stringIndex);
      if (existingIdx !== -1) {
        if (prev[existingIdx].fret === fret) {
          // Tapping same fret again deselects it
          return prev.filter((_, idx) => idx !== existingIdx);
        } else {
          // Replace fret on same string
          return prev.map((n, idx) => (idx === existingIdx ? { string: stringIndex, fret } : n));
        }
      } else {
        // Add note for this string
        return [...prev, { string: stringIndex, fret }];
      }
    });
  }, []);

  // Commit draft notes as a Step
  const commitStep = useCallback(() => {
    recordHistory(song);

    // Sort notes by string 0..5
    const sortedNotes = [...draftNotes].sort((a, b) => a.string - b.string);

    const newStep: Step = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'step_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      notes: sortedNotes,
      duration: selectedDuration,
    };

    setSong((prev) => ({
      ...prev,
      steps: [...prev.steps, newStep],
      updatedAt: Date.now(),
    }));

    // Clear draft
    setDraftNotes([]);

    // Dismiss advance hint on first commit
    if (!hasSeenAdvanceHint) {
      setHasSeenAdvanceHint(true);
      dbSetSetting(ONBOARDING_HINT_KEY, true);
    }
  }, [draftNotes, selectedDuration, song, recordHistory, hasSeenAdvanceHint]);

  // Set Duration
  const setDuration = useCallback((duration: NoteDuration) => {
    setSelectedDuration(duration);
    if (editingStepIndex !== null) {
      recordHistory(song);
      setSong((prev) => {
        const nextSteps = [...prev.steps];
        if (nextSteps[editingStepIndex]) {
          nextSteps[editingStepIndex] = {
            ...nextSteps[editingStepIndex],
            duration,
          };
        }
        return { ...prev, steps: nextSteps, updatedAt: Date.now() };
      });
    }
  }, [editingStepIndex, recordHistory, song]);

  // Select Step for editing
  const selectStepForEditing = useCallback((index: number | null) => {
    if (index === null) {
      setEditingStepIndex(null);
      setDraftNotes([]);
      return;
    }

    if (song.steps[index]) {
      setEditingStepIndex(index);
      setDraftNotes([...song.steps[index].notes]);
      setSelectedDuration(song.steps[index].duration);
    }
  }, [song.steps]);

  // Save edited step
  const saveEditedStep = useCallback(() => {
    if (editingStepIndex === null) return;
    recordHistory(song);

    const sortedNotes = [...draftNotes].sort((a, b) => a.string - b.string);

    setSong((prev) => {
      const nextSteps = [...prev.steps];
      if (nextSteps[editingStepIndex]) {
        nextSteps[editingStepIndex] = {
          ...nextSteps[editingStepIndex],
          notes: sortedNotes,
          duration: selectedDuration,
        };
      }
      return { ...prev, steps: nextSteps, updatedAt: Date.now() };
    });

    setEditingStepIndex(null);
    setDraftNotes([]);
  }, [editingStepIndex, draftNotes, selectedDuration, recordHistory, song]);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditingStepIndex(null);
    setDraftNotes([]);
  }, []);

  // Delete Step
  const deleteStep = useCallback((index: number) => {
    recordHistory(song);
    setSong((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
      updatedAt: Date.now(),
    }));
    if (editingStepIndex === index) {
      setEditingStepIndex(null);
      setDraftNotes([]);
    } else if (editingStepIndex !== null && editingStepIndex > index) {
      setEditingStepIndex(editingStepIndex - 1);
    }
  }, [editingStepIndex, recordHistory, song]);

  // Insert Step
  const insertStep = useCallback((index: number, position: 'before' | 'after') => {
    recordHistory(song);
    const insertAt = position === 'before' ? index : index + 1;
    const newStep: Step = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'step_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      notes: [],
      duration: selectedDuration,
    };

    setSong((prev) => {
      const nextSteps = [...prev.steps];
      nextSteps.splice(insertAt, 0, newStep);
      return { ...prev, steps: nextSteps, updatedAt: Date.now() };
    });

    setEditingStepIndex(insertAt);
    setDraftNotes([]);
  }, [recordHistory, selectedDuration, song]);

  // Duplicate Step
  const duplicateStep = useCallback((index: number) => {
    if (!song.steps[index]) return;
    recordHistory(song);

    const source = song.steps[index];
    const duplicated: Step = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'step_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      notes: source.notes.map((n) => ({ ...n })),
      duration: source.duration,
    };

    setSong((prev) => {
      const nextSteps = [...prev.steps];
      nextSteps.splice(index + 1, 0, duplicated);
      return { ...prev, steps: nextSteps, updatedAt: Date.now() };
    });
  }, [recordHistory, song]);

  // BPM
  const setBpm = useCallback((bpm: number) => {
    recordHistory(song);
    setSong((prev) => ({
      ...prev,
      bpm,
      updatedAt: Date.now(),
    }));
  }, [recordHistory, song]);

  // Title
  const setTitle = useCallback((title: string) => {
    recordHistory(song);
    setSong((prev) => ({
      ...prev,
      title: title.trim() || 'Untitled Riff',
      updatedAt: Date.now(),
    }));
  }, [recordHistory, song]);

  // FX
  const updateFx = useCallback((fxUpdate: Partial<FxSettings>) => {
    setSong((prev) => {
      const newFx: FxSettings = { ...prev.fx, ...fxUpdate };
      return { ...prev, fx: newFx, updatedAt: Date.now() };
    });
  }, []);

  // New Song
  const newSong = useCallback(async () => {
    globalPlaybackEngine.pause();
    const fresh = createEmptySong('Untitled Riff');
    historyRef.current.clear();
    setEditingStepIndex(null);
    setDraftNotes([]);
    await dbSaveSong(fresh);
    await dbSetSetting(LAST_SONG_KEY, fresh.id);
    setSong(fresh);
    const all = await dbGetAllSongs();
    setSongsList(all);
    updateUndoRedoFlags();
  }, [updateUndoRedoFlags]);

  // Load Song
  const loadSong = useCallback(async (id: string) => {
    globalPlaybackEngine.pause();
    const loaded = await dbGetSong(id);
    if (loaded) {
      historyRef.current.clear();
      setEditingStepIndex(null);
      setDraftNotes([]);
      await dbSetSetting(LAST_SONG_KEY, loaded.id);
      setSong(loaded);
      updateUndoRedoFlags();
    }
  }, [updateUndoRedoFlags]);

  // Duplicate Current Song
  const duplicateCurrentSong = useCallback(async () => {
    const duplicated: Song = {
      ...song,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'song_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      title: `${song.title} (Copy)`,
      steps: song.steps.map((s) => ({
        ...s,
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'step_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        notes: s.notes.map((n) => ({ ...n })),
      })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await dbSaveSong(duplicated);
    await dbSetSetting(LAST_SONG_KEY, duplicated.id);
    historyRef.current.clear();
    setEditingStepIndex(null);
    setDraftNotes([]);
    setSong(duplicated);
    const all = await dbGetAllSongs();
    setSongsList(all);
    updateUndoRedoFlags();
  }, [song, updateUndoRedoFlags]);

  // Delete Current Song
  const deleteCurrentSong = useCallback(async () => {
    globalPlaybackEngine.pause();
    await dbDeleteSong(song.id);
    const all = await dbGetAllSongs();
    setSongsList(all);

    if (all.length > 0) {
      await loadSong(all[0].id);
    } else {
      await newSong();
    }
  }, [song.id, loadSong, newSong]);

  // Refresh Songs List
  const refreshSongsList = useCallback(async () => {
    const all = await dbGetAllSongs();
    setSongsList(all);
  }, []);

  // Dismiss Advance Hint
  const dismissAdvanceHint = useCallback(() => {
    setHasSeenAdvanceHint(true);
    dbSetSetting(ONBOARDING_HINT_KEY, true);
  }, []);

  // Undo
  const undo = useCallback(() => {
    const prev = historyRef.current.undo(song);
    if (prev) {
      setSong(prev);
      setEditingStepIndex(null);
      setDraftNotes([]);
      updateUndoRedoFlags();
    }
  }, [song, updateUndoRedoFlags]);

  // Redo
  const redo = useCallback(() => {
    const next = historyRef.current.redo(song);
    if (next) {
      setSong(next);
      setEditingStepIndex(null);
      setDraftNotes([]);
      updateUndoRedoFlags();
    }
  }, [song, updateUndoRedoFlags]);

  return (
    <SongContext.Provider
      value={{
        song,
        songsList,
        draftNotes,
        selectedDuration,
        editingStepIndex,
        activeMode,
        hasSeenAdvanceHint,
        canUndo: canUndoState,
        canRedo: canRedoState,
        toggleDraftNote,
        commitStep,
        setDuration,
        selectStepForEditing,
        saveEditedStep,
        cancelEditing,
        deleteStep,
        insertStep,
        duplicateStep,
        setBpm,
        setTitle,
        updateFx,
        newSong,
        loadSong,
        duplicateCurrentSong,
        deleteCurrentSong,
        refreshSongsList,
        setActiveMode,
        dismissAdvanceHint,
        undo,
        redo,
      }}
    >
      {children}
    </SongContext.Provider>
  );
};

export const useSong = () => {
  const context = useContext(SongContext);
  if (!context) {
    throw new Error('useSong must be used within a SongProvider');
  }
  return context;
};
