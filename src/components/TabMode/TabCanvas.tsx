import React, { useRef, useEffect } from 'react';
import { useSong } from '../../state/songContext';
import { groupStepsIntoMeasures } from '../../music/measures';
import { DURATION_LABELS } from '../../music/duration';
import { STRING_NAMES } from '../../types/music';

// Heights for the 6 strings (percentage from top within the staff height)
const STRING_ROW_PERCENTAGES = [10, 26, 42, 58, 74, 90] as const;

export const TabCanvas: React.FC = () => {
  const { song, editingStepIndex, selectStepForEditing, commitStep, loopRange, setLoopRange } = useSong();
  const measures = groupStepsIntoMeasures(song.steps, song.timeSignature);
  const activeStepElementRef = useRef<HTMLButtonElement | null>(null);
  const lastStepElementRef = useRef<HTMLButtonElement | null>(null);

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

  const handleStepClick = (e: React.MouseEvent<HTMLButtonElement>, globalIndex: number) => {
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
    <div className="tab-score space-y-3 sm:space-y-4">
      {/* Loop Range Banner if active */}
      {loopRange && (
        <div className="loop-banner flex items-center justify-between bg-primary/10 border border-primary/40 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-primary text-xs font-semibold animate-fade-in">
          <span>Цикл: шаги {loopRange.startIndex + 1}–{loopRange.endIndex + 1}</span>
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
        const measureWidths = rowMeasures.map((measure) => Math.max(13.5, measure.steps.length * 3 + 2));
        const rowWidth = measureWidths.reduce((total, width) => total + width, 0);
        return (
          <article
            key={rIdx}
            className="tab-score-row relative overflow-hidden"
            style={{ animationDelay: `${Math.min(rIdx * 35, 175)}ms` }}
          >
            <div className="flex relative h-[142px] sm:h-[164px]">
              {/* String Labels column on the left */}
              <div className="tab-string-labels w-10 sm:w-11 h-full relative shrink-0 z-20">
                {STRING_NAMES.map((name, sIdx) => {
                  const topPct = STRING_ROW_PERCENTAGES[sIdx];
                  return (
                    <div
                      key={sIdx}
                      className="absolute -translate-y-1/2 inset-x-0 flex items-center justify-center font-mono text-[10px] sm:text-xs font-semibold text-text-tertiary select-none"
                      style={{ top: `${topPct}%` }}
                    >
                      {name}
                    </div>
                  );
                })}
              </div>

              {/* Scrollable Staff with continuous 6 string lines & measures */}
              <div
                className="tab-staff-scroll flex-1 relative overflow-x-auto hide-scrollbar flex items-center cursor-pointer"
                onClick={() => commitStep()}
                title="Нажмите в пустом месте, чтобы зафиксировать ноту и перейти дальше"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <div
                  className="tab-staff-track flex items-center min-w-full h-full relative shrink-0"
                  style={{ width: `${rowWidth}rem` }}
                >
                  {/* Keep lines inside the intrinsic-width track so they span every measure. */}
                  <div className="absolute inset-0 pointer-events-none z-0">
                    {STRING_ROW_PERCENTAGES.map((topPct, sIdx) => (
                      <div
                        key={sIdx}
                        className="tab-string-line absolute left-0 right-0 h-px"
                        style={{ top: `${topPct}%` }}
                      />
                    ))}
                  </div>

                  {/* Measures Container */}
                  <div className="flex items-center w-max min-w-full h-full relative z-10">
                    {rowMeasures.map((measure, measureIdx) => {
                      return (
                        <section
                          key={measure.measureNumber}
                          className="tab-measure flex grow items-center h-full relative shrink-0"
                          style={{ width: `${measureWidths[measureIdx]}rem` }}
                        >
                          {/* Measure Number Header */}
                          <div className="tab-measure-number absolute top-2 left-3 text-[9px] sm:text-[10px] font-mono text-text-tertiary font-semibold select-none">
                            {String(measure.measureNumber).padStart(2, '0')}
                          </div>

                          {measure.steps.length === 0 ? (
                            <div className="w-full h-full flex items-center justify-center text-text-disabled text-[11px] select-none">
                              Начните с грифа
                            </div>
                          ) : (
                            <div className="flex items-center justify-evenly gap-2 sm:gap-3 px-4 sm:px-5 h-full min-w-full">
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
                                  <button
                                    type="button"
                                    key={step.id}
                                    ref={refToAssign}
                                    onClick={(e) => handleStepClick(e, globalIndex)}
                                    aria-label={`Шаг ${globalIndex + 1}, длительность ${DURATION_LABELS[step.duration].short}`}
                                    aria-pressed={isEditing}
                                    className={`tab-step w-10 sm:w-11 h-full relative cursor-pointer ${
                                      isEditing
                                        ? 'tab-step--active'
                                        : inLoop
                                        ? 'tab-step--loop'
                                        : ''
                                    }`}
                                  >
                                    {/* Playhead for active edit */}
                                    {isEditing && (
                                      <div className="tab-step-caret absolute top-2 bottom-2 left-1/2 -translate-x-1/2 w-px pointer-events-none z-10" />
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
                                            className={`tab-fret-note font-mono text-xs sm:text-sm font-semibold leading-none flex items-center justify-center ${
                                              isEditing
                                                ? 'tab-fret-note--active'
                                                : ''
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
                                        <span className="tab-rest font-mono text-sm text-text-tertiary select-none">
                                          𝄽
                                        </span>
                                      </div>
                                    )}

                                    {/* Duration label pill */}
                                    <div className="tab-duration absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] font-mono text-text-tertiary font-medium select-none">
                                      {DURATION_LABELS[step.duration].short}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};
