import React, { useState } from 'react';
import { useSong } from '../../state/songContext';
import { usePlayback } from '../../state/playbackContext';
import { IconClose, IconPlus, IconTrash, IconCopy, IconDownload, IconMetronome } from '../Common/Icons';

interface SongMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExport: () => void;
}

export const SongMenuSheet: React.FC<SongMenuSheetProps> = ({ isOpen, onClose, onOpenExport }) => {
  const {
    song,
    songsList,
    setTitle,
    newSong,
    loadSong,
    duplicateCurrentSong,
    deleteCurrentSong,
  } = useSong();

  const { isMetronomeEnabled, toggleMetronome } = usePlayback();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(song.title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen) return null;

  const handleSaveTitle = () => {
    setTitle(titleInput);
    setIsEditingTitle(false);
  };

  const handleNewSong = async () => {
    await newSong();
    setTitleInput('Untitled Riff');
    onClose();
  };

  const handleLoadSong = async (id: string) => {
    await loadSong(id);
    onClose();
  };

  const handleDuplicate = async () => {
    await duplicateCurrentSong();
    onClose();
  };

  const handleDelete = async () => {
    await deleteCurrentSong();
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-surface-1 border-t sm:border border-strong-divider rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-strong-divider shrink-0">
          <h2 className="text-title-lg font-bold text-on-surface">Проект и настройки</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:text-on-surface hover:bg-surface-variant transition-colors"
            aria-label="Close"
          >
            <IconClose />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 hide-scrollbar">
          {/* Title & Rename */}
          <div className="bg-surface-2 p-4 rounded-xl border border-soft-divider">
            <label className="text-metadata-sm text-text-tertiary uppercase tracking-wider block mb-2 font-semibold">
              Название песни
            </label>
            {isEditingTitle ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="flex-1 bg-surface-3 border border-strong-divider rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-primary text-body-standard"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') setIsEditingTitle(false);
                  }}
                />
                <button
                  onClick={handleSaveTitle}
                  className="px-4 py-2 bg-primary text-canvas font-semibold rounded-lg hover:bg-accent-light transition-colors text-metadata-sm"
                >
                  Сохранить
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-title-lg font-semibold text-on-surface truncate mr-2">{song.title}</span>
                <button
                  onClick={() => {
                    setTitleInput(song.title);
                    setIsEditingTitle(true);
                  }}
                  className="text-metadata-sm text-primary hover:underline font-semibold"
                >
                  Переименовать
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleNewSong}
              className="flex items-center justify-center gap-2 p-3 bg-surface-2 hover:bg-surface-3 border border-soft-divider rounded-xl text-on-surface font-medium transition-colors text-control-md"
            >
              <IconPlus className="w-5 h-5 text-primary" />
              <span>Новая песня</span>
            </button>

            <button
              onClick={handleDuplicate}
              className="flex items-center justify-center gap-2 p-3 bg-surface-2 hover:bg-surface-3 border border-soft-divider rounded-xl text-on-surface font-medium transition-colors text-control-md"
            >
              <IconCopy className="w-5 h-5 text-primary" />
              <span>Дублировать</span>
            </button>
          </div>

          {/* Export & Metronome shortcuts */}
          <div className="space-y-2">
            <button
              onClick={() => {
                onClose();
                onOpenExport();
              }}
              className="w-full flex items-center justify-between p-3.5 bg-surface-2 hover:bg-surface-3 border border-primary/40 hover:border-primary rounded-xl text-on-surface transition-all shadow-sm group"
            >
              <div className="flex items-center gap-3">
                <IconDownload className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="text-body-standard font-bold text-primary group-hover:text-accent-light">
                    Экспорт в ноты и табы
                  </div>
                  <div className="text-metadata-sm text-text-secondary">
                    Нотная партитура (PDF со скрипичным ключом), MusicXML, MIDI, TXT
                  </div>
                </div>
              </div>
              <span className="text-primary font-bold">{'→'}</span>
            </button>

            <button
              onClick={toggleMetronome}
              className={`w-full flex items-center justify-between p-3.5 border rounded-xl transition-colors ${
                isMetronomeEnabled
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-surface-2 hover:bg-surface-3 border-soft-divider text-on-surface'
              }`}
            >
              <div className="flex items-center gap-3">
                <IconMetronome className="w-5 h-5" />
                <span className="text-body-standard font-semibold">Студийный метроном</span>
              </div>
              <span className="text-metadata-sm font-bold uppercase">{isMetronomeEnabled ? 'ВКЛ' : 'ВЫКЛ'}</span>
            </button>
          </div>

          {/* Local Songs List */}
          <div>
            <label className="text-metadata-sm text-text-tertiary uppercase tracking-wider block mb-3 font-semibold">
              Сохраненные песни ({songsList.length})
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto hide-scrollbar">
              {songsList.map((s) => {
                const isCurrent = s.id === song.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => handleLoadSong(s.id)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-colors ${
                      isCurrent
                        ? 'bg-surface-elevated border-primary text-on-surface'
                        : 'bg-surface-2 hover:bg-surface-3 border-soft-divider text-text-secondary hover:text-on-surface'
                    }`}
                  >
                    <div className="truncate mr-3">
                      <div className="font-semibold text-body-standard truncate text-on-surface">
                        {s.title} {isCurrent && <span className="text-xs text-primary font-normal">(Текущая)</span>}
                      </div>
                      <div className="text-metadata-sm text-text-tertiary">
                        {s.bpm} BPM • {s.steps.length} шагов • {new Date(s.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Danger Zone: Delete */}
          <div className="pt-2">
            {showDeleteConfirm ? (
              <div className="p-4 bg-error-container/20 border border-error-container rounded-xl text-center space-y-3">
                <p className="text-sm text-error font-medium">Удалить песню &quot;{song.title}&quot;? Это действие нельзя отменить.</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 bg-surface-3 text-on-surface rounded-lg text-metadata-sm font-semibold"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-error text-canvas rounded-lg text-metadata-sm font-semibold"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 p-3 text-error/80 hover:text-error hover:bg-error-container/10 border border-error/20 rounded-xl text-metadata-sm font-medium transition-colors"
              >
                <IconTrash className="w-4 h-4" />
                <span>Удалить текущую песню</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
