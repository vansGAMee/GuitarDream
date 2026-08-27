import React from 'react';
import { useSong } from '../../state/songContext';
import { IconArrowForward } from '../Common/Icons';

export const OnboardingHint: React.FC = () => {
  const { hasSeenAdvanceHint, dismissAdvanceHint } = useSong();

  if (hasSeenAdvanceHint) return null;

  return (
    <div
      onClick={dismissAdvanceHint}
      className="absolute left-14 top-1/2 -translate-y-1/2 z-40 bg-surface-elevated/95 border border-primary text-primary px-3 py-1.5 rounded-lg shadow-xl text-metadata-sm font-medium flex items-center gap-2 cursor-pointer animate-pulse"
    >
      <span>Tap left side to continue</span>
      <IconArrowForward className="w-3.5 h-3.5" />
    </div>
  );
};
