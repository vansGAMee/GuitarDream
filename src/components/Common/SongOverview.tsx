import React, { useMemo } from 'react';
import { durationToBeats } from '../../music/duration';
import { groupStepsIntoMeasures } from '../../music/measures';
import { Step, TimeSignature } from '../../types/music';

interface SongOverviewProps {
  steps: Step[];
  timeSignature: TimeSignature;
  activeStepIndex: number | null;
  onSelect: (index: number) => void;
  showProgress?: boolean;
}

export const SongOverview: React.FC<SongOverviewProps> = ({
  steps,
  timeSignature,
  activeStepIndex,
  onSelect,
  showProgress = false,
}) => {
  const measures = useMemo(
    () => groupStepsIntoMeasures(steps, timeSignature),
    [steps, timeSignature],
  );

  if (steps.length < 2) return null;

  const active = activeStepIndex === null
    ? null
    : Math.max(0, Math.min(activeStepIndex, steps.length - 1));

  return (
    <div className="rounded-xl border border-soft-divider bg-surface-1/95 px-3 py-2 shadow-lg backdrop-blur-md">
      <div className="mb-1.5 flex items-center justify-between text-[9px] font-semibold tracking-[0.12em] text-text-tertiary">
        <span>ВСЯ ЗАПИСЬ</span>
        <span className="font-mono tracking-normal">
          {active === null ? '—' : active + 1} / {steps.length}
        </span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-3 ring-1 ring-soft-divider">
        {measures.map((measure) => (
          <div
            key={measure.measureNumber}
            className="flex min-w-0 flex-1 border-r border-canvas last:border-r-0"
          >
            {measure.steps.map(({ step, globalIndex }) => {
              const isActive = globalIndex === active;
              const isPast = showProgress && active !== null && globalIndex < active;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => onSelect(globalIndex)}
                  aria-label={`Перейти к шагу ${globalIndex + 1}`}
                  className={`touch-row h-full min-w-0 rounded-none p-0 ${
                    isActive
                      ? 'bg-primary shadow-[0_0_10px_rgba(235,193,101,0.8)]'
                      : isPast
                        ? 'bg-primary/35'
                        : step.notes.length > 0
                          ? 'bg-on-surface/25 hover:bg-on-surface/40'
                          : 'bg-surface-variant hover:bg-surface-3'
                  }`}
                  style={{ flexGrow: durationToBeats(step.duration) }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
