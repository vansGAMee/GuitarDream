import React, { useState } from 'react';
import { useSong } from '../../state/songContext';
import { IconUndo, IconSettings } from '../Common/Icons';
import { SongMenuSheet } from './SongMenuSheet';
import { ExportSheet } from './ExportSheet';

export const Header: React.FC = () => {
  const { song, undo, canUndo } = useSong();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  return (
    <>
      <header className="flex justify-between items-center px-4 h-14 w-full bg-surface-1 z-40 shrink-0 border-b border-strong-divider">
        {/* Undo */}
        <button
          onClick={undo}
          disabled={!canUndo}
          aria-label="Undo"
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 ${
            canUndo
              ? 'text-on-surface hover:bg-surface-variant cursor-pointer'
              : 'text-text-disabled opacity-40 cursor-default'
          }`}
        >
          <IconUndo />
        </button>

        {/* Title */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className="flex flex-col items-center justify-center max-w-[65%] px-2 py-1 rounded-lg hover:bg-surface-variant transition-colors"
          aria-label="Song settings and rename"
        >
          <h1 className="font-title-lg text-title-lg font-bold text-on-surface tracking-tight truncate w-full text-center">
            {song.title}
          </h1>
        </button>

        {/* Settings / Menu */}
        <button
          onClick={() => setIsMenuOpen(true)}
          aria-label="Settings and project menu"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant transition-transform active:scale-95 text-on-surface"
        >
          <IconSettings />
        </button>
      </header>

      {/* Secondary Sheets */}
      <SongMenuSheet
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onOpenExport={() => setIsExportOpen(true)}
      />

      <ExportSheet
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </>
  );
};
