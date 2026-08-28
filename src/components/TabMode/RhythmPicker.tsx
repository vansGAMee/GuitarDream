import React from 'react';
import { ALL_DURATIONS, DURATION_RATE_HELP, DURATION_RATE_LABELS } from '../../music/duration';
import { useSong } from '../../state/songContext';

export const RhythmPicker: React.FC = () => {
  const { selectedDuration, setDuration } = useSong();

  return (
    <div
      className="rhythm-picker flex items-center gap-0.5 p-1 rounded-xl shrink-0"
      aria-label="Скорость нот относительно BPM"
    >
      {ALL_DURATIONS.map((dur) => {
        const isSelected = selectedDuration === dur;
        const rate = DURATION_RATE_LABELS[dur];
        const help = DURATION_RATE_HELP[dur];
        return (
          <button
            key={dur}
            type="button"
            onClick={() => setDuration(dur)}
            aria-label={`Скорость ${rate}: ${help}`}
            title={help}
            aria-pressed={isSelected}
            className={`rhythm-option min-w-9 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-metadata-sm font-semibold ${
              isSelected
                ? 'rhythm-option--active text-canvas'
                : 'text-text-secondary hover:text-on-surface'
            }`}
          >
            {rate}
          </button>
        );
      })}
    </div>
  );
};
