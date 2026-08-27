import React from 'react';
import { usePlayback } from '../../state/playbackContext';
import { IconPlay, IconPause, IconSkipPrevious, IconLoop, IconFx, IconMetronome } from '../Common/Icons';

interface PlayTransportProps {
  onOpenFx: () => void;
}

export const PlayTransport: React.FC<PlayTransportProps> = ({ onOpenFx }) => {
  const {
    isPlaying,
    isLooping,
    isMetronomeEnabled,
    togglePlay,
    restart,
    toggleLoop,
    toggleMetronome,
  } = usePlayback();

  return (
    <div id="play-transport" className="w-full bg-surface-dim/95 backdrop-blur-md border-t border-strong-divider shrink-0 px-3 sm:px-4 py-2 sm:py-3 z-30">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* Metronome quick toggle */}
        <button
          onClick={toggleMetronome}
          aria-label="Включить/выключить метроном"
          title="Метроном"
          className={`hardware-btn w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors ${
            isMetronomeEnabled
              ? 'text-primary border-primary/60 bg-primary/10 ring-1 ring-primary/40'
              : 'text-text-secondary hover:text-on-surface'
          }`}
        >
          <IconMetronome className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Restart */}
        <button
          onClick={restart}
          aria-label="Перезапустить воспроизведение"
          title="В начало"
          className="hardware-btn w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-text-secondary hover:text-primary transition-colors active:scale-95"
        >
          <IconSkipPrevious className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Master Play / Pause */}
        <button
          id="btn-master-play"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Пауза' : 'Воспроизведение'}
          className={`hardware-btn w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xl ${
            isPlaying
              ? 'bg-surface-bright text-primary border-primary/50'
              : 'bg-primary-container text-on-primary-container hover:bg-accent-light'
          }`}
        >
          {isPlaying ? (
            <IconPause className="w-7 h-7 sm:w-9 sm:h-9" />
          ) : (
            <IconPlay className="w-7 h-7 sm:w-9 sm:h-9 ml-0.5" />
          )}
        </button>

        {/* Loop toggle */}
        <button
          id="btn-loop"
          onClick={toggleLoop}
          aria-label="Включить/выключить повтор"
          title="Зацикливание"
          className={`hardware-btn w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors active:scale-95 ${
            isLooping
              ? 'text-primary border-primary/60 bg-primary/10 ring-1 ring-primary/40'
              : 'text-text-secondary hover:text-on-surface'
          }`}
        >
          <IconLoop className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Guitar Effects (FX) Sheet Trigger */}
        <button
          onClick={onOpenFx}
          aria-label="Настройки гитарных эффектов"
          title="Эффекты (FX)"
          className="hardware-btn w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-text-secondary hover:text-primary transition-colors"
        >
          <IconFx className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
};
