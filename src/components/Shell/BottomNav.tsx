import React from 'react';
import { useSong } from '../../state/songContext';
import { IconEditNote, IconPlay } from '../Common/Icons';

export const BottomNav: React.FC = () => {
  const { activeMode, setActiveMode } = useSong();

  return (
    <nav
      id="bottom-nav"
      aria-label="Primary mode navigation"
      className="fixed bottom-0 left-0 w-full z-50 flex justify-center gap-4 items-center bg-background border-t border-surface-container-highest"
    >
      {/* TAB Mode */}
      <button
        id="nav-tab"
        onClick={() => setActiveMode('TAB')}
        aria-label="Switch to TAB editing mode"
        aria-pressed={activeMode === 'TAB'}
        className={`nav-btn flex flex-col items-center justify-center rounded-xl px-6 py-2 transition-transform duration-150 active:scale-95 ${
          activeMode === 'TAB'
            ? 'bg-surface-container-high text-on-surface'
            : 'text-on-secondary-fixed-variant hover:text-on-surface'
        }`}
      >
        <IconEditNote className="w-6 h-6" filled={activeMode === 'TAB'} />
        <span className="font-label-bold text-label-bold mt-1">TAB</span>
      </button>

      {/* PLAY Mode */}
      <button
        id="nav-play"
        onClick={() => setActiveMode('PLAY')}
        aria-label="Switch to PLAY practice mode"
        aria-pressed={activeMode === 'PLAY'}
        className={`nav-btn flex flex-col items-center justify-center rounded-xl px-6 py-2 transition-transform duration-150 active:scale-95 ${
          activeMode === 'PLAY'
            ? 'bg-surface-container-high text-primary'
            : 'text-on-secondary-fixed-variant hover:text-on-surface'
        }`}
      >
        <IconPlay className="w-6 h-6" filled={activeMode === 'PLAY'} />
        <span className={`font-label-bold text-label-bold mt-1 ${activeMode === 'PLAY' ? 'text-primary' : ''}`}>
          PLAY
        </span>
      </button>
    </nav>
  );
};
