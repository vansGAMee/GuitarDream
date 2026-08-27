import React, { useRef, useState, useEffect } from 'react';
import { useSong } from '../../state/songContext';
import { TapTempoCalculator } from '../../music/bpm';
import { playTapSound } from '../../audio/metronome';

interface TapTempoButtonProps {
  isTappingActive?: boolean;
  onToggleTappingActive?: (active: boolean) => void;
}

export const TapTempoButton: React.FC<TapTempoButtonProps> = ({
  isTappingActive = false,
  onToggleTappingActive,
}) => {
  const { song, setBpm } = useSong();
  const tapCalculatorRef = useRef<TapTempoCalculator>(new TapTempoCalculator());
  const [pulse, setPulse] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const registerTap = () => {
    playTapSound();
    setPulse(true);
    setTimeout(() => setPulse(false), 100);

    const calculatedBpm = tapCalculatorRef.current.tap();
    if (calculatedBpm !== null) {
      setBpm(calculatedBpm);
    }

    if (onToggleTappingActive) {
      onToggleTappingActive(true);
    }

    // Reset tap active state after 2.5s of inactivity
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      if (onToggleTappingActive) {
        onToggleTappingActive(false);
      }
      tapCalculatorRef.current.reset();
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <button
      onClick={registerTap}
      aria-label="Tap tempo to set song speed"
      className={`px-3.5 py-1.5 rounded-full border text-metadata-sm font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow-md ${
        isTappingActive || pulse
          ? 'bg-primary text-canvas border-primary ring-2 ring-primary/40 scale-105'
          : 'bg-surface-2 text-text-secondary border-soft-divider hover:text-on-surface hover:bg-surface-3'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${isTappingActive ? 'bg-canvas animate-ping' : 'bg-primary'}`} />
      <span>{isTappingActive ? `Tapping: ${song.bpm} BPM` : 'Tap Tempo'}</span>
    </button>
  );
};
