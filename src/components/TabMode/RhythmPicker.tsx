import React from 'react';
import { ALL_DURATIONS, DURATION_LABELS } from '../../music/duration';
import { useSong } from '../../state/songContext';

export const RhythmPicker: React.FC = () => {
  const { selectedDuration, setDuration } = useSong();

  return (
    <div className="rhythm-picker flex items-center gap-0.5 p-1 rounded-xl shrink-0" aria-label="Длительность ноты">
      {ALL_DURATIONS.map((dur) => {
        const isSelected = selectedDuration === dur;
        const info = DURATION_LABELS[dur];
        return (
          <button
            key={dur}
            type="button"
            onClick={() => setDuration(dur)}
            aria-label={`Длительность ${info.short}`}
            aria-pressed={isSelected}
            className={`rhythm-option min-w-9 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-metadata-sm font-semibold ${
              isSelected
                ? 'rhythm-option--active text-canvas'
                : 'text-text-secondary hover:text-on-surface'
            }`}
          >
            {info.short}
          </button>
        );
      })}
    </div>
  );
};
