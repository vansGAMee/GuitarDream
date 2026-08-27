import React, { useRef } from 'react';
import { useSong } from '../../state/songContext';
import { STRING_NAMES } from '../../types/music';
import { TabCanvas } from './TabCanvas';
import { RhythmPicker } from './RhythmPicker';
import { StepContextMenu } from './StepContextMenu';
import { OnboardingHint } from './OnboardingHint';
import { Fretboard } from '../Fretboard/Fretboard';
import { IconArrowForward } from '../Common/Icons';

export const TabMode: React.FC = () => {
  const {
    song,
    draftNotes,
    toggleDraftNote,
    commitStep,
    editingStepIndex,
  } = useSong();

  const fretboardScrollRef = useRef<HTMLDivElement>(null);

  return (
    <section id="view-tab" className="relative flex flex-col h-full w-full bg-canvas overflow-hidden">
      {/* Scrollable Score Section */}
      <div className="flex-1 overflow-y-auto p-4 pb-80 hide-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Score Header & Rhythm Picker */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-control-md font-bold text-on-surface">{song.title}</h2>
            <span className="text-metadata-sm text-text-tertiary font-mono">
              {song.timeSignature.numerator}/{song.timeSignature.denominator} • {song.bpm} BPM
            </span>
          </div>

          <div className="flex items-center gap-2">
            {editingStepIndex !== null ? (
              <StepContextMenu stepIndex={editingStepIndex} />
            ) : (
              <RhythmPicker />
            )}
          </div>
        </div>

        {/* Tablature Score Canvas */}
        <TabCanvas />
      </div>

      {/* Fixed Bottom Interactive Fretboard Input Area */}
      <div
        id="tab-input-panel"
        className="absolute bottom-0 w-full bg-surface-dim border-t border-strong-divider pb-20 pt-3 flex flex-col z-30"
      >
        {/* Info & Manual advance row */}
        <div className="px-4 flex justify-between items-center mb-2">
          <span className="text-metadata-sm text-text-tertiary truncate">
            {draftNotes.length === 0
              ? 'Выберите лад. Тапните по левому краю или кнопке ДАЛЕЕ для следующей ноты.'
              : `${draftNotes.length} нот в аккорде. Тапните левый край для фиксации.`}
          </span>
          <button
            id="btn-advance-manual"
            onClick={commitStep}
            className="px-3.5 py-1.5 bg-primary-container hover:bg-accent-light rounded-full text-label-bold font-bold text-on-primary-container hover:text-canvas border border-primary/50 transition-all active:scale-95 text-xs flex items-center gap-1.5 shrink-0 shadow-md"
          >
            <span>ДАЛЕЕ</span>
            <IconArrowForward className="w-4 h-4" />
          </button>
        </div>

        {/* The Interactive Fretboard Panel */}
        <div className="flex-1 relative mx-3 rounded-xl overflow-hidden fretboard-wood shadow-2xl flex border border-strong-divider">
          {/* Invisible Left Advance Zone */}
          <div
            id="advance-zone"
            onClick={commitStep}
            title="Тапните здесь для перехода к следующей ноте"
            className="absolute left-0 top-0 w-14 h-full z-40 bg-gradient-to-r from-black/50 via-black/20 to-transparent flex items-center justify-center cursor-pointer hover:from-primary/20 active:from-primary/40 transition-colors"
          >
            <IconArrowForward className="w-5 h-5 text-text-secondary opacity-60" />
          </div>

          {/* First-time Onboarding Hint */}
          <OnboardingHint />

          {/* String Labels Column (E, B, G, D, A, E) */}
          <div className="w-8 h-full bg-[#111] border-r border-[#222] flex flex-col justify-around py-3 z-20 font-mono text-xs font-bold text-text-tertiary items-center shrink-0">
            {STRING_NAMES.map((name, idx) => (
              <span key={idx}>{name}</span>
            ))}
          </div>

          {/* Scrollable Interactive Fretboard */}
          <div className="flex-1 relative overflow-hidden">
            <Fretboard
              activeNotes={draftNotes}
              interactive={true}
              onNoteToggle={toggleDraftNote}
              scrollContainerRef={fretboardScrollRef}
              maxFrets={24}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
