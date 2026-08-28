import React from 'react';
import { useSong } from '../../state/songContext';
import { IconClose, IconFx } from '../Common/Icons';

interface FxSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FxSheet: React.FC<FxSheetProps> = ({ isOpen, onClose }) => {
  const { song, updateFx } = useSong();
  const fx = song.fx;

  if (!isOpen) return null;

  return (
    <div className="sheet-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
      <div className="sheet-panel w-full sm:max-w-md h-[85dvh] sm:h-auto sm:max-h-[85dvh] bg-surface-1 border-t sm:border border-strong-divider rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-strong-divider shrink-0">
          <div className="flex items-center gap-2">
            <IconFx className="w-5 h-5 text-primary" />
            <h2 className="text-title-lg font-bold text-on-surface">Guitar Effects (FX)</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:text-on-surface hover:bg-surface-variant transition-colors"
            aria-label="Close"
          >
            <IconClose />
          </button>
        </div>

        {/* Body */}
        <div
          className="flex-1 min-h-0 p-6 pb-[calc(1.5rem+var(--safe-bottom))] space-y-6 overflow-y-auto overscroll-contain touch-pan-y hide-scrollbar"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* DRIVE */}
          <div className="bg-surface-2 p-4 rounded-xl border border-soft-divider space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-body-standard text-on-surface">Drive / Saturation</span>
              <button
                onClick={() => updateFx({ driveEnabled: !fx.driveEnabled })}
                className={`px-3 py-1 rounded-full text-metadata-sm font-bold transition-colors ${
                  fx.driveEnabled ? 'bg-primary text-canvas' : 'bg-surface-3 text-text-tertiary'
                }`}
              >
                {fx.driveEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            {fx.driveEnabled && (
              <div className="space-y-1">
                <div className="flex justify-between text-metadata-sm text-text-tertiary">
                  <span>Gain / Crunch</span>
                  <span>{fx.driveAmount}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={fx.driveAmount}
                  onChange={(e) => updateFx({ driveAmount: parseInt(e.target.value) })}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* DELAY */}
          <div className="bg-surface-2 p-4 rounded-xl border border-soft-divider space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-body-standard text-on-surface">Echo / Delay</span>
              <button
                onClick={() => updateFx({ delayEnabled: !fx.delayEnabled })}
                className={`px-3 py-1 rounded-full text-metadata-sm font-bold transition-colors ${
                  fx.delayEnabled ? 'bg-primary text-canvas' : 'bg-surface-3 text-text-tertiary'
                }`}
              >
                {fx.delayEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            {fx.delayEnabled && (
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-metadata-sm text-text-tertiary">
                    <span>Mix</span>
                    <span>{Math.round(fx.delayMix * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(fx.delayMix * 100)}
                    onChange={(e) => updateFx({ delayMix: parseInt(e.target.value) / 100 })}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-metadata-sm text-text-tertiary">
                    <span>Time</span>
                    <span>{Math.round(fx.delayTime * 1000)}ms</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="10"
                    value={Math.round(fx.delayTime * 1000)}
                    onChange={(e) => updateFx({ delayTime: parseInt(e.target.value) / 1000 })}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-metadata-sm text-text-tertiary">
                    <span>Feedback</span>
                    <span>{Math.round(fx.delayFeedback * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="85"
                    value={Math.round(fx.delayFeedback * 100)}
                    onChange={(e) => updateFx({ delayFeedback: parseInt(e.target.value) / 100 })}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* REVERB */}
          <div className="bg-surface-2 p-4 rounded-xl border border-soft-divider space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-body-standard text-on-surface">Reverb Space</span>
              <button
                onClick={() => updateFx({ reverbEnabled: !fx.reverbEnabled })}
                className={`px-3 py-1 rounded-full text-metadata-sm font-bold transition-colors ${
                  fx.reverbEnabled ? 'bg-primary text-canvas' : 'bg-surface-3 text-text-tertiary'
                }`}
              >
                {fx.reverbEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            {fx.reverbEnabled && (
              <div className="space-y-1">
                <div className="flex justify-between text-metadata-sm text-text-tertiary">
                  <span>Mix</span>
                  <span>{Math.round(fx.reverbMix * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(fx.reverbMix * 100)}
                  onChange={(e) => updateFx({ reverbMix: parseInt(e.target.value) / 100 })}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
