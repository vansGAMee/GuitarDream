import React from 'react';
import { useSong } from '../../state/songContext';
import { clampBpm } from '../../music/bpm';
import { IconMinus, IconPlus } from '../Common/Icons';

export const BpmControl: React.FC = () => {
  const { song, setBpm } = useSong();

  const handleDecrement = () => {
    setBpm(clampBpm(song.bpm - 1));
  };

  const handleIncrement = () => {
    setBpm(clampBpm(song.bpm + 1));
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 bg-surface-1 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 border border-strong-divider shadow-md">
      <button
        onClick={handleDecrement}
        aria-label="Уменьшить BPM"
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-primary hover:bg-surface-2 transition-colors active:scale-95"
      >
        <IconMinus className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      <div className="flex items-baseline gap-1 min-w-[55px] sm:min-w-[65px] justify-center select-none">
        <span key={song.bpm} id="bpm-display" className="bpm-value font-bold text-xl sm:text-2xl font-mono text-on-surface leading-none">
          {song.bpm}
        </span>
        <span className="text-[10px] sm:text-metadata-sm text-text-tertiary font-semibold uppercase">BPM</span>
      </div>

      <button
        onClick={handleIncrement}
        aria-label="Увеличить BPM"
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-primary hover:bg-surface-2 transition-colors active:scale-95"
      >
        <IconPlus className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
    </div>
  );
};
