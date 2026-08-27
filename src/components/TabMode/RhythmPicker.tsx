import React from 'react';
import { ALL_DURATIONS, DURATION_LABELS } from '../../music/duration';
import { useSong } from '../../state/songContext';

export const RhythmPicker: React.FC = () => {
  const { selectedDuration, setDuration } = useSong();

  return (
    <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-xl border border-soft-divider shrink-0">
      {ALL_DURATIONS.map((dur) => {
        const isSelected = selectedDuration === dur;
        const info = DURATION_LABELS[dur];
        return (
          <button
            key={dur}
            type="button"
            onClick={() => setDuration(dur)}
            aria-label={`Select ${info.name}`}
            className={`px-2.5 py-1 rounded-lg text-metadata-sm font-semibold transition-all active:scale-95 ${
              isSelected
                ? 'bg-primary text-canvas shadow-sm'
                : 'text-text-secondary hover:text-on-surface hover:bg-surface-3'
            }`}
          >
            {info.short}
          </button>
        );
      })}
    </div>
  );
};
