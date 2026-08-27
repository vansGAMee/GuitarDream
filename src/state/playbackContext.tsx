import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { globalPlaybackEngine } from '../audio/playbackEngine';
import { useSong } from './songContext';

interface PlaybackContextType {
  isPlaying: boolean;
  currentStepIndex: number;
  isLooping: boolean;
  isMetronomeEnabled: boolean;
  togglePlay: () => void;
  restart: () => void;
  toggleLoop: () => void;
  toggleMetronome: () => void;
  seekStep: (index: number) => void;
}

const PlaybackContext = createContext<PlaybackContextType | null>(null);

export const PlaybackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { song } = useSong();
  const [isPlaying, setIsPlaying] = useState<boolean>(globalPlaybackEngine.getIsPlaying());
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(globalPlaybackEngine.getCurrentStepIndex());
  const [isLooping, setIsLooping] = useState<boolean>(globalPlaybackEngine.getLoop());
  const [isMetronomeEnabled, setIsMetronomeEnabled] = useState<boolean>(globalPlaybackEngine.getMetronome());

  useEffect(() => {
    const unsubscribe = globalPlaybackEngine.subscribe((stepIdx, playing) => {
      setCurrentStepIndex(stepIdx);
      setIsPlaying(playing);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    globalPlaybackEngine.setSong(song);
  }, [song]);

  const togglePlay = useCallback(() => {
    globalPlaybackEngine.togglePlay();
  }, []);

  const restart = useCallback(() => {
    globalPlaybackEngine.restart();
  }, []);

  const toggleLoop = useCallback(() => {
    const next = !isLooping;
    setIsLooping(next);
    globalPlaybackEngine.setLoop(next);
  }, [isLooping]);

  const toggleMetronome = useCallback(() => {
    const next = !isMetronomeEnabled;
    setIsMetronomeEnabled(next);
    globalPlaybackEngine.setMetronome(next);
  }, [isMetronomeEnabled]);

  const seekStep = useCallback((index: number) => {
    globalPlaybackEngine.setStepIndex(index);
  }, []);

  return (
    <PlaybackContext.Provider
      value={{
        isPlaying,
        currentStepIndex,
        isLooping,
        isMetronomeEnabled,
        togglePlay,
        restart,
        toggleLoop,
        toggleMetronome,
        seekStep,
      }}
    >
      {children}
    </PlaybackContext.Provider>
  );
};

export const usePlayback = () => {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }
  return context;
};
