import React from 'react';
import { useSong } from '../../state/songContext';
import { IconArrowForward } from '../Common/Icons';

export const OnboardingHint: React.FC = () => {
  const { hasSeenAdvanceHint, dismissAdvanceHint } = useSong();

  if (hasSeenAdvanceHint) return null;

  return (
    <div
      onClick={dismissAdvanceHint}
      className="absolute left-16 top-1/2 -translate-y-1/2 z-40 bg-surface-elevated border-2 border-primary text-primary px-3.5 py-2 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 cursor-pointer animate-pulse select-none"
    >
      <span>Тапните по левому краю или кнопке ДАЛЕЕ для перехода</span>
      <IconArrowForward className="w-4 h-4" />
    </div>
  );
};
