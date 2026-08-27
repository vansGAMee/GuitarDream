import React, { useRef, useEffect, useState } from 'react';
import { useSong } from '../../state/songContext';
import { usePlayback } from '../../state/playbackContext';
import { STRING_NAMES, Note } from '../../types/music';
import { SHARED_FRET_GEOMETRIES } from '../../geometry/fretboardGeometry';
import { BpmControl } from './BpmControl';
import { TapTempoButton } from './TapTempoButton';
import { PlayTransport } from './PlayTransport';
import { Fretboard } from '../Fretboard/Fretboard';
import { FxSheet } from '../Shell/FxSheet';
import { TapTempoCalculator } from '../../music/bpm';
import { playTapSound } from '../../audio/metronome';

export const PlayMode: React.FC = () => {
  const { song, setBpm, loopRange, setLoopRange } = useSong();
  const { currentStepIndex, isPlaying } = usePlayback();
  const fretboardScrollRef = useRef<HTMLDivElement>(null);
  const [isFxOpen, setIsFxOpen] = useState(false);
  const [isTappingActive, setIsTappingActive] = useState(false);

  const tapCalculatorRef = useRef<TapTempoCalculator>(new TapTempoCalculator());
  const tapTimeoutRef = useRef<number | null>(null);

  // Active notes for currently playing step
  const activeStep = song.steps[currentStepIndex];
  const activeNotes: Note[] = activeStep ? activeStep.notes : [];

  // Smooth scroll fretboard to keep active notes in view
  useEffect(() => {
    if (activeNotes.length > 0 && fretboardScrollRef.current) {
      const frets = activeNotes.map((n) => n.fret).filter((f) => f > 0);
      if (frets.length > 0) {
        const avgFret = Math.round(frets.reduce((a, b) => a + b, 0) / frets.length);
        const geom = SHARED_FRET_GEOMETRIES[avgFret];
        if (geom) {
          const container = fretboardScrollRef.current;
          const containerWidth = container.clientWidth;
          const targetScrollLeft = Math.max(0, geom.center - containerWidth / 2);

          if (
            geom.left < container.scrollLeft + 60 ||
            geom.right > container.scrollLeft + containerWidth - 60
          ) {
            container.scrollTo({
              left: targetScrollLeft,
              behavior: 'smooth',
            });
          }
        }
      }
    }
  }, [currentStepIndex, activeNotes]);

  // Handle tap anywhere on screen when Tap Mode is active
  const handleScreenTap = () => {
    playTapSound();
    const calculatedBpm = tapCalculatorRef.current.tap();
    if (calculatedBpm !== null) {
      setBpm(calculatedBpm);
    }

    if (tapTimeoutRef.current !== null) {
      clearTimeout(tapTimeoutRef.current);
    }
    tapTimeoutRef.current = window.setTimeout(() => {
      setIsTappingActive(false);
      tapCalculatorRef.current.reset();
    }, 2500);
  };

  return (
    <section
      id="view-play"
      className="relative flex flex-col h-full w-full bg-canvas overflow-hidden justify-between"
      style={{ paddingBottom: 'var(--nav-h)' }}
    >
      {/* Tap Tempo Full Screen Overlay when active */}
      {isTappingActive && (
        <div
          onClick={handleScreenTap}
          className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center cursor-pointer select-none animate-fade-in p-4"
        >
          <div className="p-6 bg-surface-1 border-2 border-primary rounded-3xl text-center shadow-2xl space-y-3 pointer-events-none transform scale-105 transition-all max-w-sm">
            <div className="text-3xl sm:text-4xl font-bold text-primary font-mono">{song.bpm} BPM</div>
            <p className="text-sm font-semibold text-on-surface">Тапайте в любом месте экрана в ритм</p>
            <p className="text-xs text-text-tertiary">Темп зафиксируется автоматически через пару секунд</p>
          </div>
        </div>
      )}

      {/* Top Header & BPM Control */}
      <div className="flex flex-col items-center pt-2 sm:pt-4 pb-1 sm:pb-2 px-3 sm:px-4 shrink-0 space-y-1.5">
        <h1 className="text-base sm:text-title-lg font-bold text-on-surface text-center truncate max-w-xs">
          {song.title}
        </h1>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
          <BpmControl />
          <TapTempoButton
            isTappingActive={isTappingActive}
            onToggleTappingActive={(active) => setIsTappingActive(active)}
          />
        </div>

        {/* Custom Loop Range Indicator */}
        {loopRange && (
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/50 px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs text-primary font-semibold">
            <span>Цикл: шаги #{loopRange.startIndex + 1}–#{loopRange.endIndex + 1}</span>
            <button
              onClick={() => setLoopRange(null)}
              className="text-on-surface hover:text-primary underline ml-1"
            >
              Сброс
            </button>
          </div>
        )}
      </div>

      {/* Dominant Centered Fretboard */}
      <div id="play-neck-wrap" className="flex-1 w-full relative flex items-center justify-center my-1 sm:my-2 overflow-hidden px-2 sm:px-4 min-h-0">
        <div
          id="play-neck"
          className="w-full max-w-4xl h-[clamp(160px,36dvh,320px)] rounded-2xl overflow-hidden fretboard-wood shadow-2xl relative flex border-2 border-surface-container-lowest"
        >
          {/* Nut & String Labels */}
          <div className="w-8 sm:w-10 h-full bg-[#111] border-r-2 sm:border-r-4 border-[#222] flex flex-col justify-around py-2 sm:py-4 z-20 font-mono text-xs sm:text-sm font-bold text-on-surface items-center shadow-md shrink-0 select-none">
            {STRING_NAMES.map((name, idx) => (
              <span key={idx}>{name}</span>
            ))}
          </div>

          {/* Canonical Shared Fretboard */}
          <div className="flex-1 relative overflow-hidden">
            <Fretboard
              activeNotes={activeNotes}
              interactive={false}
              scrollContainerRef={fretboardScrollRef}
              pulseActiveNotes={isPlaying}
              maxFrets={24}
            />
          </div>
        </div>
      </div>

      {/* Transport Controls */}
      <PlayTransport onOpenFx={() => setIsFxOpen(true)} />

      {/* FX Sheet */}
      <FxSheet isOpen={isFxOpen} onClose={() => setIsFxOpen(false)} />
    </section>
  );
};
