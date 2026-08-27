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
    <div id="play-transport" className="w-full bg-surface-dim border-t border-strong-divider shrink-0 px-4 py-4 z-30">
      <div className="max-w-md mx-auto flex items-center justify-between gap-3">
        {/* Metronome quick toggle */}
        <button
          onClick={toggleMetronome}
          aria-label="Toggle metronome"
          title="Metronome"
          className={`hardware-btn w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isMetronomeEnabled
              ? 'text-primary border-primary/60 bg-primary/10'
              : 'text-text-secondary hover:text-on-surface'
          }`}
        >
          <IconMetronome className="w-5 h-5" />
        </button>

        {/* Restart */}
        <button
          onClick={restart}
          aria-label="Restart playback from beginning"
          title="Restart"
          className="hardware-btn w-14 h-14 rounded-full flex items-center justify-center text-text-secondary hover:text-primary transition-colors active:scale-95"
        >
          <IconSkipPrevious className="w-6 h-6" />
        </button>

        {/* Master Play / Pause */}
        <button
          id="btn-master-play"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
          className={`hardware-btn w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xl ${
            isPlaying
              ? 'bg-surface-bright text-primary border-primary/40'
              : 'bg-primary-container text-on-primary-container hover:bg-accent-light'
          }`}
        >
          {isPlaying ? <IconPause className="w-9 h-9" /> : <IconPlay className="w-9 h-9" />}
        </button>

        {/* Loop toggle */}
        <button
          id="btn-loop"
          onClick={toggleLoop}
          aria-label="Toggle playback loop"
          title="Loop"
          className={`hardware-btn w-14 h-14 rounded-full flex items-center justify-center transition-colors active:scale-95 ${
            isLooping
              ? 'text-primary border-primary/60 bg-primary/10'
              : 'text-text-secondary hover:text-on-surface'
          }`}
        >
          <IconLoop className="w-6 h-6" />
        </button>

        {/* Guitar Effects (FX) Sheet Trigger */}
        <button
          onClick={onOpenFx}
          aria-label="Guitar effects settings"
          title="Guitar Effects"
          className="hardware-btn w-12 h-12 rounded-full flex items-center justify-center text-text-secondary hover:text-primary transition-colors"
        >
          <IconFx className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
