import React, { useRef, useEffect } from 'react';
import { useSong } from '../../state/songContext';
import { groupStepsIntoMeasures } from '../../music/measures';
import { STRING_NAMES } from '../../types/music';

// Heights for the 6 strings (percentage from top within the staff height)
const STRING_ROW_PERCENTAGES = [10, 26, 42, 58, 74, 90] as const;

export const TabCanvas: React.FC = () => {
  const { song, editingStepIndex, selectStepForEditing, commitStep, loopRange, setLoopRange } = useSong();
  const measures = groupStepsIntoMeasures(song.steps, song.timeSignature);
  const activeStepElementRef = useRef<HTMLDivElement | null>(null);
  const lastStepElementRef = useRef<HTMLDivElement | null>(null);
  const rowScrollRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Auto-scroll to active step during editing or to latest step when writing/recording new notes
  useEffect(() => {
    const targetElement = editingStepIndex !== null ? activeStepElementRef.current : lastStepElementRef.current;
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'end',
      });
    }
  }, [editingStepIndex, song.steps.length]);

  const measuresPerRow = 4;

  const handleStepClick = (e: React.MouseEvent, globalIndex: number) => {
    e.stopPropagation();

    // Shift+Click sets loop range
    if (e.shiftKey && editingStepIndex !== null) {
      const start = Math.min(editingStepIndex, globalIndex);
      const end = Math.max(editingStepIndex, globalIndex);
      setLoopRange({ startIndex: start, endIndex: end });
      return;
    }

    selectStepForEditing(editingStepIndex === globalIndex ? null : globalIndex);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Loop Range Banner if active */}
      {loopRange && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-primary text-xs font-semibold animate-fade-in shadow-sm">
          <span>🔁 Выделен цикл для плеера: шаги #{loopRange.startIndex + 1} – #{loopRange.endIndex + 1}</span>
          <button
            onClick={() => setLoopRange(null)}
            className="px-2.5 py-1 bg-surface-2 hover:bg-surface-3 rounded-lg text-on-surface text-metadata-sm border border-soft-divider"
          >
            Сбросить цикл
          </button>
        </div>
      )}

      {Array.from({ length: Math.ceil(measures.length / measuresPerRow) }).map((_, rIdx) => {
        const rowMeasures = measures.slice(rIdx * measuresPerRow, (rIdx + 1) * measuresPerRow);
        const isLastRow = rIdx === Math.ceil(measures.length / measuresPerRow) - 1;

        return (
          <div
            key={rIdx}
            className="bg-surface-1 rounded-2xl p-3 sm:p-4 border border-strong-divider shadow-lg relative overflow-hidden transition-all duration-200"
          >
            <div className="flex relative h-40 sm:h-48">
              {/* String Labels column on the left */}
              <div className="w-8 sm:w-9 h-full pr-2 sm:pr-3 border-r border-strong-divider relative shrink-0 bg-surface-1 z-20">
                {STRING_NAMES.map((name, sIdx) => {
                  const topPct = STRING_ROW_PERCENTAGES[sIdx];
                  return (
                    <div
                      key={sIdx}
                      className="absolute -translate-y-1/2 left-0 right-2 sm:right-3 flex items-center justify-center font-mono text-xs sm:text-sm font-bold text-text-secondary select-none"
                      style={{ top: `${topPct}%` }}
                    >
                      {name}
                    </div>
                  );
                })}
              </div>

              {/* Scrollable Staff with continuous 6 string lines & measures */}
              <div
                ref={(el) => (rowScrollRefs.current[rIdx] = el)}
                className="flex-1 relative overflow-x-auto hide-scrollbar pl-2 flex items-center cursor-pointer"
                onClick={() => commitStep()}
                title="Нажмите в пустом месте, чтобы зафиксировать ноту и перейти дальше"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <div className="flex items-center min-w-full h-full relative">
                  {/* Continuous 6 Horizontal String Lines across the entire row width */}
                  <div className="absolute inset-0 pointer-events-none z-0 min-w-full">
                    {STRING_ROW_PERCENTAGES.map((topPct, sIdx) => (
                      <div
                        key={sIdx}
                        className="absolute left-0 right-0 h-[1px] bg-[#353B45]"
                        style={{ top: `${topPct}%` }}
                      />
                    ))}
                  </div>

                  {/* Measures Container */}
                  <div className="flex items-center min-w-full h-full relative z-10">
                    {rowMeasures.map((measure) => {
                      return (
                        <div
                          key={measure.measureNumber}
                          className="flex items-center h-full relative border-r-2 border-line-strong pr-3 sm:pr-4 mr-2 shrink-0 min-w-[100px] sm:min-w-[120px]"
                        >
                          {/* Measure Number Header */}
                          <div className="absolute top-1 left-1 text-[10px] sm:text-[11px] font-mono text-text-tertiary font-semibold select-none">
                            #{measure.measureNumber}
                          </div>

                          {measure.steps.length === 0 ? (
                            <div className="w-20 sm:w-24 h-full flex items-center justify-center text-text-disabled text-xs italic select-none">
                              (пусто)
                            </div>
                          ) : (
                            <div className="flex items-center gap-4 sm:gap-6 px-2 sm:px-3 h-full">
                              {measure.steps.map(({ step, globalIndex }) => {
                                const isEditing = editingStepIndex === globalIndex;
                                const isLastGlobalStep = globalIndex === song.steps.length - 1;
                                const inLoop = loopRange && globalIndex >= loopRange.startIndex && globalIndex <= loopRange.endIndex;
                                const noteMap = new Map<number, number>();
                                step.notes.forEach((n) => noteMap.set(n.string, n.fret));

                                const refToAssign = isEditing
                                  ? activeStepElementRef
                                  : isLastGlobalStep && editingStepIndex === null
                                  ? lastStepElementRef
                                  : undefined;

                                return (
                                  <div
                                    key={step.id}
                                    ref={refToAssign}
                                    onClick={(e) => handleStepClick(e, globalIndex)}
                                    className={`w-9 sm:w-10 h-full relative cursor-pointer rounded-lg transition-all duration-150 transform active:scale-95 ${
                                      isEditing
                                        ? 'bg-primary/20 ring-2 ring-primary scale-105 shadow-md'
                                        : inLoop
                                        ? 'bg-primary/10 ring-1 ring-primary/40'
                                        : 'hover:bg-surface-3/50'
                                    }`}
                                  >
                                    {/* Playhead for active edit */}
                                    {isEditing && (
                                      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-primary shadow-sm pointer-events-none z-10 animate-pulse" />
                                    )}

                                    {/* 6 Notes or transparent lines */}
                                    {STRING_ROW_PERCENTAGES.map((topPct, sIdx) => {
                                      const hasNote = noteMap.has(sIdx);
                                      const fret = noteMap.get(sIdx);

                                      if (!hasNote) return null;

                                      return (
                                        <div
                                          key={sIdx}
                                          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
                                          style={{ top: `${topPct}%` }}
                                        >
                                          <span
                                            className={`font-mono text-xs sm:text-sm font-bold px-1.5 py-0.5 rounded shadow-sm leading-none flex items-center justify-center transition-transform ${
                                              isEditing
                                                ? 'bg-primary text-canvas ring-2 ring-accent-light scale-110'
                                                : 'bg-surface-1 text-on-surface border border-line-strong'
                                            }`}
                                          >
                                            {fret}
                                          </span>
                                        </div>
                                      );
                                    })}

                                    {/* Rest indicator if no notes in step */}
                                    {step.notes.length === 0 && (
                                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                                        <span className="font-mono text-xs text-text-tertiary bg-surface-1 px-1.5 py-0.5 rounded border border-line-soft select-none">
                                          𝄽
                                        </span>
                                      </div>
                                    )}

                                    {/* Duration label pill */}
                                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] font-mono text-text-tertiary uppercase font-bold select-none">
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

                    {/* Auto-scroll anchor at the end of the last row */}
                    {isLastRow && (
                      <div
                        ref={editingStepIndex === null ? lastStepElementRef : undefined}
                        className="w-12 h-full shrink-0 flex items-center justify-center text-text-disabled text-xs"
                      >
                        ▸
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
