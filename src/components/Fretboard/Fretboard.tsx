import React, { useRef } from 'react';
import { Note, GuitarString } from '../../types/music';
import {
  SHARED_FRET_GEOMETRIES,
  TOTAL_FRETS,
  STRING_VISUAL_PERCENTAGES,
  isSingleDotFret,
  isDoubleDotFret,
} from '../../geometry/fretboardGeometry';
import { playPluckedGuitarNote } from '../../audio/synth';

interface FretboardProps {
  activeNotes: Note[];
  interactive?: boolean;
  onNoteToggle?: (stringIndex: GuitarString, fret: number) => void;
  className?: string;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
  pulseActiveNotes?: boolean;
  maxFrets?: number;
  highlightNut?: boolean;
}

export const Fretboard: React.FC<FretboardProps> = ({
  activeNotes,
  interactive = false,
  onNoteToggle,
  className = '',
  scrollContainerRef,
  pulseActiveNotes = false,
  maxFrets = TOTAL_FRETS,
}) => {
  const pointerStartRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const fretsToRender = SHARED_FRET_GEOMETRIES.slice(0, maxFrets + 1);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartRef.current) return;
    const dx = Math.abs(e.clientX - pointerStartRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartRef.current.y);
    if (dx > 8 || dy > 8) {
      pointerStartRef.current.moved = true;
    }
  };

  const handlePointerUp = (stringIndex: GuitarString, fret: number) => {
    if (!interactive || !onNoteToggle) return;
    if (pointerStartRef.current && pointerStartRef.current.moved) {
      // Drag/scroll gesture: do not toggle note
      pointerStartRef.current = null;
      return;
    }
    pointerStartRef.current = null;

    // Toggle note and play acoustic preview sound
    onNoteToggle(stringIndex, fret);
    playPluckedGuitarNote({ string: stringIndex, fret }, undefined, 0.8);
  };

  return (
    <div
      ref={scrollContainerRef}
      className={`relative w-full h-full overflow-x-auto overflow-y-hidden select-none hide-scrollbar touch-pan-x ${className}`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div className="relative h-full flex fretboard-wood" style={{ minWidth: 'max-content' }}>
        {/* Frets Container */}
        {fretsToRender.map((geom) => {
          const fret = geom.fret;
          const isOpen = fret === 0;

          return (
            <div
              key={fret}
              className={`relative h-full flex-none ${isOpen ? 'bg-black/20' : 'bg-transparent'}`}
              style={{ width: `${geom.width}px` }}
            >
              {/* Nut on Fret 0 */}
              {isOpen && <div className="nut" />}

              {/* Fret wire on Frets > 0 */}
              {!isOpen && <div className="fret-wire-only" />}

              {/* Position Inlay Markers */}
              {isSingleDotFret(fret) && <div className="fret-marker" />}
              {isDoubleDotFret(fret) && (
                <>
                  <div className="fret-marker double-a" />
                  <div className="fret-marker double-b" />
                </>
              )}

              {/* Six Clickable/Interactive Touch Rows */}
              <div
                className="six-row-grid z-30"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
              >
                {([0, 1, 2, 3, 4, 5] as GuitarString[]).map((s) => {
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-label={`String ${s}, Fret ${fret}`}
                      disabled={!interactive}
                      onPointerUp={() => handlePointerUp(s, fret)}
                      className={`touch-row flex items-center justify-center ${
                        interactive ? 'cursor-pointer' : 'cursor-default'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* 6 Shared Horizontal Strings Layer */}
        <div className="six-row-grid pointer-events-none z-20">
          <div className="string-row"><div className="guitar-string h-[1px]" /></div>
          <div className="string-row"><div className="guitar-string h-[1.5px]" /></div>
          <div className="string-row"><div className="guitar-string h-[2px]" /></div>
          <div className="string-row"><div className="guitar-string h-[2.5px]" /></div>
          <div className="string-row"><div className="guitar-string h-[3px]" /></div>
          <div className="string-row"><div className="guitar-string h-[4px]" /></div>
        </div>

        {/* Active Note Markers Layer */}
        <div className="absolute inset-0 pointer-events-none z-40">
          {activeNotes.map((note) => {
            const geom = SHARED_FRET_GEOMETRIES[note.fret] || SHARED_FRET_GEOMETRIES[0];
            const topPct = STRING_VISUAL_PERCENTAGES[note.string];
            const leftPx = geom.center;

            return (
              <div
                key={`${note.string}-${note.fret}`}
                className={`note-token absolute w-7 h-7 rounded-full bg-primary text-canvas font-bold text-xs flex items-center justify-center shadow-lg -translate-x-1/2 -translate-y-1/2 ${
                  pulseActiveNotes ? 'playing-note' : ''
                }`}
                style={{
                  top: `${topPct}%`,
                  left: `${leftPx}px`,
                }}
              >
                {note.fret}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
