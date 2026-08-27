import React from 'react';
import { useSong } from '../../state/songContext';
import { IconEditNote, IconPlay } from '../Common/Icons';

export const BottomNav: React.FC = () => {
  const { activeMode, setActiveMode } = useSong();

  return (
    <nav
      id="bottom-nav"
      aria-label="Primary mode navigation"
      className="fixed bottom-0 left-0 w-full z-50 flex justify-center gap-6 items-center bg-background/95 backdrop-blur-md border-t border-surface-container-highest transition-all"
      style={{
        height: 'var(--nav-h)',
        paddingBottom: 'var(--safe-bottom)',
      }}
    >
      {/* TAB Mode */}
      <button
        id="nav-tab"
        onClick={() => setActiveMode('TAB')}
        aria-label="Переключить в режим редактирования табов"
        aria-pressed={activeMode === 'TAB'}
        className={`nav-btn flex items-center justify-center gap-2 rounded-xl px-5 py-1.5 transition-all duration-150 active:scale-95 ${
          activeMode === 'TAB'
            ? 'bg-surface-container-high text-primary ring-1 ring-primary/30 shadow-sm'
            : 'text-on-secondary-fixed-variant hover:text-on-surface'
        }`}
      >
        <IconEditNote className="w-5 h-5 sm:w-6 sm:h-6" filled={activeMode === 'TAB'} />
        <span className="font-label-bold text-xs sm:text-sm font-bold">ТАБЫ</span>
      </button>

      {/* PLAY Mode */}
      <button
        id="nav-play"
        onClick={() => setActiveMode('PLAY')}
        aria-label="Переключить в режим плеера"
        aria-pressed={activeMode === 'PLAY'}
        className={`nav-btn flex items-center justify-center gap-2 rounded-xl px-5 py-1.5 transition-all duration-150 active:scale-95 ${
          activeMode === 'PLAY'
            ? 'bg-surface-container-high text-primary ring-1 ring-primary/30 shadow-sm'
            : 'text-on-secondary-fixed-variant hover:text-on-surface'
        }`}
      >
        <IconPlay className="w-5 h-5 sm:w-6 sm:h-6" filled={activeMode === 'PLAY'} />
        <span className="font-label-bold text-xs sm:text-sm font-bold">ПЛЕЕР</span>
      </button>
    </nav>
  );
};
