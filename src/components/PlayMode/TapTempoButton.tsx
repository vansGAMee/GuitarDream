import React, { useRef, useState } from 'react';
import { useSong } from '../../state/songContext';
import { TapTempoCalculator } from '../../music/bpm';

export const TapTempoButton: React.FC = () => {
  const { setBpm } = useSong();
  const tapCalculatorRef = useRef<TapTempoCalculator>(new TapTempoCalculator());
  const [isTapped, setIsTapped] = useState(false);

  const handleTap = () => {
    setIsTapped(true);
    setTimeout(() => setIsTapped(false), 120);

    const calculatedBpm = tapCalculatorRef.current.tap();
    if (calculatedBpm !== null) {
      setBpm(calculatedBpm);
    }
  };

  return (
    <button
      onClick={handleTap}
      className={`px-3 py-1 rounded-full border text-metadata-sm font-semibold transition-all active:scale-95 ${
        isTapped
          ? 'bg-primary text-canvas border-primary scale-105'
          : 'bg-surface-2 text-text-tertiary border-soft-divider hover:text-on-surface hover:bg-surface-3'
      }`}
    >
      Tap Tempo
    </button>
  );
};
