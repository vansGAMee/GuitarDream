import React, { useRef, useEffect } from 'react';
import { useSong } from '../../state/songContext';
import { groupStepsIntoMeasures } from '../../music/measures';
import { STRING_NAMES } from '../../types/music';

export const TabCanvas: React.FC = () => {
  const { song, editingStepIndex, selectStepForEditing } = useSong();
  const measures = groupStepsIntoMeasures(song.steps, song.timeSignature);
  const activeStepElementRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to current edit step
  useEffect(() => {
    if (editingStepIndex !== null && activeStepElementRef.current) {
      activeStepElementRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [editingStepIndex]);

  const measuresPerRow = 4;

  return (
    <div className="space-y-6">
      {Array.from({ length: Math.ceil(measures.length / measuresPerRow) }).map((_, rIdx) => {
        const rowMeasures = measures.slice(rIdx * measuresPerRow, (rIdx + 1) * measuresPerRow);

        return (
          <div
            key={rIdx}
            className="bg-surface-1 rounded-2xl p-4 border border-strong-divider shadow-lg relative overflow-hidden"
          >
            <div className="flex relative h-44">
              {/* String Labels column + Clef */}
              <div className="flex flex-col justify-between py-2 pr-3 border-r border-strong-divider w-9 shrink-0 bg-surface-1 z-20">
                {STRING_NAMES.map((name, sIdx) => (
                  <span
                    key={sIdx}
                    className="font-mono text-sm leading-none h-4 flex items-center justify-center text-text-secondary font-bold"
                  >
                    {name}
                  </span>
                ))}
              </div>

              {/* Staff and Steps */}
              <div className="flex-1 relative overflow-x-auto hide-scrollbar pl-2 flex items-center">
                {/* 6 Horizontal String Lines */}
                <div className="absolute inset-y-0 left-0 right-0 py-2 flex flex-col justify-between pointer-events-none z-0">
                  {STRING_NAMES.map((_, s) => (
                    <div key={s} className="w-full h-px bg-line-strong" />
                  ))}
                </div>

                {/* Measures and Notes Container */}
                <div className="flex items-center min-w-full h-full relative z-10">
                  {rowMeasures.map((measure) => {
                    return (
                      <div
                        key={measure.measureNumber}
                        className="flex items-center h-full relative border-r border-line-strong pr-3 mr-3 shrink-0"
                        style={{ minWidth: measure.steps.length === 0 ? '120px' : 'auto' }}
                      >
                        {/* Measure Number Header */}
                        <div className="absolute top-0 left-1 text-[10px] font-mono text-text-tertiary">
                          #{measure.measureNumber}
                        </div>

                        {measure.steps.length === 0 ? (
                          <div className="w-24 h-full flex items-center justify-center text-text-disabled text-sm italic">
                            (empty)
                          </div>
                        ) : (
                          <div className="flex items-center gap-6 px-2">
                            {measure.steps.map(({ step, globalIndex }) => {
                              const isEditing = editingStepIndex === globalIndex;
                              const noteMap = new Map<number, number>();
                              step.notes.forEach((n) => noteMap.set(n.string, n.fret));

                              return (
                                <div
                                  key={step.id}
                                  ref={isEditing ? activeStepElementRef : undefined}
                                  onClick={() => selectStepForEditing(isEditing ? null : globalIndex)}
                                  className={`w-10 h-full flex flex-col justify-between items-center relative py-2 cursor-pointer rounded-lg transition-colors ${
                                    isEditing ? 'bg-primary/15' : 'hover:bg-surface-3/50'
                                  }`}
                                >
                                  {/* Playhead for active edit */}
                                  {isEditing && (
                                    <div className="playhead left-1/2 -translate-x-1/2" />
                                  )}

                                  {/* 6 String numbers or rests */}
                                  {STRING_NAMES.map((_, sIdx) => {
                                    const hasNote = noteMap.has(sIdx);
                                    const fret = noteMap.get(sIdx);

                                    return (
                                      <div
                                        key={sIdx}
                                        className="h-4 flex items-center justify-center relative"
                                      >
                                        {hasNote ? (
                                          <span
                                            className={`tab-number text-tab flex items-center justify-center font-bold ${
                                              isEditing ? 'active text-canvas' : 'text-on-surface'
                                            }`}
                                          >
                                            {fret}
                                          </span>
                                        ) : (
                                          <span className="tab-number text-text-disabled text-xs opacity-50">
                                            -
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}

                                  {/* Duration marker pill */}
                                  <div className="absolute -bottom-1 text-[9px] font-mono text-text-tertiary uppercase">
                                    {step.duration.slice(0, 1)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
