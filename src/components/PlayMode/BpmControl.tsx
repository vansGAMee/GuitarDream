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
    <div className="flex items-center justify-center gap-3 bg-surface-1 rounded-full px-5 py-2 border border-strong-divider shadow-md">
      <button
        onClick={handleDecrement}
        aria-label="Decrease BPM"
        className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-primary hover:bg-surface-2 transition-colors active:scale-95"
      >
        <IconMinus className="w-5 h-5" />
      </button>

      <div className="flex items-baseline gap-1.5 min-w-[70px] justify-center">
        <span id="bpm-display" className="font-bold text-3xl font-mono text-on-surface leading-none">
          {song.bpm}
        </span>
        <span className="text-metadata-sm text-text-tertiary font-semibold uppercase">BPM</span>
      </div>

      <button
        onClick={handleIncrement}
        aria-label="Increase BPM"
        className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-primary hover:bg-surface-2 transition-colors active:scale-95"
      >
        <IconPlus className="w-5 h-5" />
      </button>
    </div>
  );
};
