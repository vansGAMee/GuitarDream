import React from 'react';
import { useSong } from '../../state/songContext';
import { IconTrash, IconCopy, IconPlus, IconClose } from '../Common/Icons';

interface StepContextMenuProps {
  stepIndex: number;
}

export const StepContextMenu: React.FC<StepContextMenuProps> = ({ stepIndex }) => {
  const {
    saveEditedStep,
    cancelEditing,
    deleteStep,
    insertStep,
    duplicateStep,
  } = useSong();

  return (
    <div className="step-context-menu flex items-center gap-1 px-1.5 py-1 rounded-xl animate-fade-in shrink-0">
      <span className="text-[10px] sm:text-metadata-sm font-semibold text-primary px-1.5">
        Шаг {stepIndex + 1}
      </span>

      <button
        onClick={saveEditedStep}
        className="px-2.5 py-1 bg-primary text-canvas font-bold text-[10px] sm:text-metadata-sm rounded-lg hover:bg-accent-light"
      >
        Готово
      </button>

      <button
        onClick={() => insertStep(stepIndex, 'before')}
        title="Вставить шаг перед текущим"
        aria-label="Вставить шаг перед текущим"
        className="p-1.5 text-text-secondary hover:text-on-surface hover:bg-surface-3 rounded-lg transition-colors"
      >
        <IconPlus className="w-4 h-4" />
      </button>

      <button
        onClick={() => duplicateStep(stepIndex)}
        title="Дублировать шаг"
        aria-label="Дублировать шаг"
        className="p-1.5 text-text-secondary hover:text-on-surface hover:bg-surface-3 rounded-lg transition-colors"
      >
        <IconCopy className="w-4 h-4" />
      </button>

      <button
        onClick={() => deleteStep(stepIndex)}
        title="Удалить шаг"
        aria-label="Удалить шаг"
        className="p-1.5 text-error hover:bg-error-container/20 rounded-lg transition-colors"
      >
        <IconTrash className="w-4 h-4" />
      </button>

      <button
        onClick={cancelEditing}
        title="Отменить редактирование"
        aria-label="Отменить редактирование"
        className="p-1.5 text-text-tertiary hover:text-on-surface rounded-lg transition-colors"
      >
        <IconClose className="w-4 h-4" />
      </button>
    </div>
  );
};
