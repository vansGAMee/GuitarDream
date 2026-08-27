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
    <div className="flex items-center gap-2 bg-surface-elevated border border-primary/50 px-3 py-1.5 rounded-xl shadow-lg animate-fade-in shrink-0">
      <span className="text-metadata-sm font-semibold text-primary mr-1">
        Editing Step #{stepIndex + 1}
      </span>

      <button
        onClick={saveEditedStep}
        className="px-2.5 py-1 bg-primary text-canvas font-bold text-metadata-sm rounded-lg hover:bg-accent-light transition-colors"
      >
        Done
      </button>

      <button
        onClick={() => insertStep(stepIndex, 'before')}
        title="Insert step before"
        className="p-1.5 text-text-secondary hover:text-on-surface hover:bg-surface-3 rounded-lg transition-colors"
      >
        <IconPlus className="w-4 h-4" />
      </button>

      <button
        onClick={() => duplicateStep(stepIndex)}
        title="Duplicate step"
        className="p-1.5 text-text-secondary hover:text-on-surface hover:bg-surface-3 rounded-lg transition-colors"
      >
        <IconCopy className="w-4 h-4" />
      </button>

      <button
        onClick={() => deleteStep(stepIndex)}
        title="Delete step"
        className="p-1.5 text-error hover:bg-error-container/20 rounded-lg transition-colors"
      >
        <IconTrash className="w-4 h-4" />
      </button>

      <button
        onClick={cancelEditing}
        title="Cancel editing"
        className="p-1.5 text-text-tertiary hover:text-on-surface rounded-lg transition-colors"
      >
        <IconClose className="w-4 h-4" />
      </button>
    </div>
  );
};
