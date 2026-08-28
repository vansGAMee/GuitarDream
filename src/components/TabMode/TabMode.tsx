import React, { useRef } from 'react';
import { useSong } from '../../state/songContext';
import { TabCanvas } from './TabCanvas';
import { RhythmPicker } from './RhythmPicker';
import { StepContextMenu } from './StepContextMenu';
import { OnboardingHint } from './OnboardingHint';
import { Fretboard } from '../Fretboard/Fretboard';
import { IconArrowForward } from '../Common/Icons';
import { STRING_NAMES } from '../../types/music';

export const TabMode: React.FC = () => {
  const {
    song,
    draftNotes,
    toggleDraftNote,
    commitStep,
    stepBack,
    editingStepIndex,
    pasteSteps,
  } = useSong();

  const fretboardScrollRef = useRef<HTMLDivElement>(null);
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        pasteSteps(text);
      }
    } catch {
      const text = prompt('Вставьте текст табов или JSON (Ctrl+V):');
      if (text) pasteSteps(text);
    }
  };

  return (
    <section id="view-tab" className="animate-mode-in relative flex flex-col h-full w-full bg-canvas overflow-hidden">
      {/* Scrollable Score Section */}
      <div
        className="tab-score-scroll flex-1 overflow-y-auto p-3 sm:p-4 hide-scrollbar"
        style={{
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 'calc(var(--tab-panel-h) + var(--nav-h) + 12px)',
        }}
      >
        {/* Controls Bar: Time/BPM info, Paste & Rhythm Picker */}
        <div className="tab-toolbar flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="tab-meta text-[10px] sm:text-[11px] text-text-tertiary font-mono px-2 py-1 rounded-lg">
              {song.timeSignature.numerator}/{song.timeSignature.denominator} · {song.bpm} BPM
            </span>
            <button
              onClick={handlePasteFromClipboard}
              title="Вставить ноты или табы из буфера обмена (Ctrl+V)"
              className="tab-paste px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-medium text-text-tertiary hover:text-primary flex items-center gap-1"
            >
              <span>Вставить · Ctrl+V</span>
            </button>
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
        className="tab-input-panel absolute bottom-0 w-full bg-surface-dim border-t border-strong-divider flex flex-col z-30"
        style={{
          height: 'calc(var(--tab-panel-h) + var(--nav-h))',
          paddingBottom: 'var(--nav-h)',
          paddingTop: '6px',
        }}
      >
        {/* Step Navigation & Action Bar */}
        <div className="tab-action-bar px-3 sm:px-4 flex justify-between items-center mb-1.5 gap-2 shrink-0">
          {/* Back Step Button */}
          <button
            onClick={stepBack}
            title="Вернуться к предыдущей ноте (Стрелка влево / Backspace)"
            className="px-2.5 sm:px-3 py-1 bg-surface-2 hover:bg-surface-3 rounded-full text-[11px] sm:text-xs font-bold text-text-secondary hover:text-on-surface border border-soft-divider transition-all active:scale-95 flex items-center gap-1 shrink-0"
          >
            <span>◂ НАЗАД</span>
          </button>

          {/* Status Label */}
          <span
            key={`${editingStepIndex ?? 'new'}-${draftNotes.length}`}
            className="tab-entry-status text-[10px] sm:text-xs text-text-tertiary truncate text-center flex-1"
          >
            {draftNotes.length === 0
              ? 'Выберите лад. Пробел/ДАЛЕЕ — переход.'
              : `${draftNotes.length} нот в аккорде. Пробел/ДАЛЕЕ — фиксация.`}
          </span>

          {/* Forward / Commit Button */}
          <button
            id="btn-advance-manual"
            onClick={commitStep}
            title="Зафиксировать ноту и перейти дальше (Пробел / Enter / Стрелка вправо)"
            className="px-3 sm:px-4 py-1 bg-primary-container hover:bg-accent-light rounded-full text-label-bold font-bold text-on-primary-container hover:text-canvas border border-primary/50 transition-all active:scale-95 text-[11px] sm:text-xs flex items-center gap-1 shrink-0 shadow-md"
          >
            <span>ДАЛЕЕ ▸</span>
          </button>
        </div>

        {/* The Interactive Fretboard Panel */}
        <div className="tab-fret-input flex-1 relative mx-2 sm:mx-3 rounded-xl overflow-hidden fretboard-wood flex border border-strong-divider min-h-0">
          {/* Left Step-Back/Advance Zone */}
          <div
            id="advance-zone"
            onClick={commitStep}
            title="Тапните здесь для перехода к следующей ноте (Пробел)"
            className="absolute left-0 top-0 w-12 h-full z-40 bg-gradient-to-r from-black/60 via-black/20 to-transparent flex items-center justify-center cursor-pointer hover:from-primary/30 active:from-primary/50 transition-colors group"
          >
            <IconArrowForward className="w-4 h-4 sm:w-5 sm:h-5 text-text-secondary group-hover:text-primary transition-colors opacity-70" />
          </div>

          {/* First-time Onboarding Hint */}
          <OnboardingHint />

          {/* String Labels Column (E, B, G, D, A, E) */}
          <div className="w-7 sm:w-8 h-full bg-[#111] border-r border-[#222] flex flex-col justify-around py-2 sm:py-3 z-20 font-mono text-[11px] sm:text-xs font-bold text-text-tertiary items-center shrink-0 select-none">
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
