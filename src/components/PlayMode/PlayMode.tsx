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

export const PlayMode: React.FC = () => {
  const { song } = useSong();
  const { currentStepIndex, isPlaying } = usePlayback();
  const fretboardScrollRef = useRef<HTMLDivElement>(null);
  const [isFxOpen, setIsFxOpen] = useState(false);

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

          // Only scroll if outside visible bounds
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

  return (
    <section id="view-play" className="relative flex flex-col h-full w-full bg-canvas overflow-hidden justify-between">
      {/* Top Header & BPM Control */}
      <div className="flex flex-col items-center pt-4 pb-2 px-4 shrink-0 space-y-2">
        <h1 className="text-title-lg font-bold text-on-surface text-center truncate max-w-xs">
          {song.title}
        </h1>

        <div className="flex items-center gap-3">
          <BpmControl />
          <TapTempoButton />
        </div>
      </div>

      {/* Dominant Centered Fretboard */}
      <div id="play-neck-wrap" className="flex-1 w-full relative flex items-center justify-center my-2 overflow-hidden px-3">
        <div
          id="play-neck"
          className="w-full max-w-4xl h-[340px] rounded-2xl overflow-hidden fretboard-wood shadow-2xl relative flex border-2 border-surface-container-lowest"
        >
          {/* Nut & String Labels */}
          <div className="w-10 h-full bg-[#111] border-r-4 border-[#222] flex flex-col justify-around py-4 z-20 font-mono text-sm font-bold text-on-surface items-center shadow-md shrink-0">
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
