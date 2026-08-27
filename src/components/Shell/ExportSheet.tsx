import React, { useState } from 'react';
import { useSong } from '../../state/songContext';
import { IconClose, IconDownload } from '../Common/Icons';
import { downloadAsciiTab } from '../../export/asciiTab';
import { downloadMidi } from '../../export/midiExport';
import { downloadMusicXml } from '../../export/musicXmlExport';
import { exportPdf } from '../../export/pdfExport';

interface ExportSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportSheet: React.FC<ExportSheetProps> = ({ isOpen, onClose }) => {
  const { song } = useSong();
  const [exportingType, setExportingType] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async (type: 'ascii' | 'midi' | 'xml' | 'pdf') => {
    setExportingType(type);
    try {
      if (type === 'ascii') {
        downloadAsciiTab(song);
      } else if (type === 'midi') {
        downloadMidi(song);
      } else if (type === 'xml') {
        downloadMusicXml(song);
      } else if (type === 'pdf') {
        exportPdf(song);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setTimeout(() => {
        setExportingType(null);
        onClose();
      }, 400);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-surface-1 border-t sm:border border-strong-divider rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-strong-divider shrink-0">
          <div className="flex items-center gap-2">
            <IconDownload className="w-5 h-5 text-primary" />
            <h2 className="text-title-lg font-bold text-on-surface">Экспорт партитуры и табов</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:text-on-surface hover:bg-surface-variant transition-colors"
            aria-label="Закрыть"
          >
            <IconClose />
          </button>
        </div>

        {/* Formats */}
        <div className="p-6 space-y-3 overflow-y-auto">
          {/* PDF Sheet Music */}
          <button
            onClick={() => handleExport('pdf')}
            disabled={exportingType !== null}
            className="w-full flex items-center justify-between p-4 bg-surface-2 hover:bg-surface-3 border border-primary/40 hover:border-primary rounded-xl text-left transition-all shadow-md group"
          >
            <div>
              <div className="font-semibold text-body-standard text-primary group-hover:text-accent-light flex items-center gap-1.5">
                <span>Партитура в нотах + Табы (.pdf)</span>
              </div>
              <div className="text-metadata-sm text-text-secondary mt-0.5">
                Классический нотный стан (скрипичный ключ 8vb, штили, длительности, диезы) + табы
              </div>
            </div>
            <span className="text-primary text-metadata-sm font-bold shrink-0 ml-3">
              {exportingType === 'pdf' ? 'Экспорт...' : 'PDF'}
            </span>
          </button>

          {/* MusicXML */}
          <button
            onClick={() => handleExport('xml')}
            disabled={exportingType !== null}
            className="w-full flex items-center justify-between p-4 bg-surface-2 hover:bg-surface-3 border border-soft-divider rounded-xl text-left transition-colors"
          >
            <div>
              <div className="font-semibold text-body-standard text-on-surface">MusicXML (.musicxml)</div>
              <div className="text-metadata-sm text-text-tertiary">
                Нотный формат для MuseScore, Guitar Pro, Sibelius, Finale
              </div>
            </div>
            <span className="text-primary text-metadata-sm font-semibold shrink-0 ml-3">
              {exportingType === 'xml' ? 'Экспорт...' : 'XML'}
            </span>
          </button>

          {/* MIDI */}
          <button
            onClick={() => handleExport('midi')}
            disabled={exportingType !== null}
            className="w-full flex items-center justify-between p-4 bg-surface-2 hover:bg-surface-3 border border-soft-divider rounded-xl text-left transition-colors"
          >
            <div>
              <div className="font-semibold text-body-standard text-on-surface">Standard MIDI (.mid)</div>
              <div className="text-metadata-sm text-text-tertiary">
                Полифонический MIDI-файл для DAW и синтезаторов
              </div>
            </div>
            <span className="text-primary text-metadata-sm font-semibold shrink-0 ml-3">
              {exportingType === 'midi' ? 'Экспорт...' : 'MIDI'}
            </span>
          </button>

          {/* ASCII TAB */}
          <button
            onClick={() => handleExport('ascii')}
            disabled={exportingType !== null}
            className="w-full flex items-center justify-between p-4 bg-surface-2 hover:bg-surface-3 border border-soft-divider rounded-xl text-left transition-colors"
          >
            <div>
              <div className="font-semibold text-body-standard text-on-surface">Текстовые табы (.txt)</div>
              <div className="text-metadata-sm text-text-tertiary">ASCII-табулатура для чтения в блокноте</div>
            </div>
            <span className="text-primary text-metadata-sm font-semibold shrink-0 ml-3">
              {exportingType === 'ascii' ? 'Экспорт...' : 'TXT'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
