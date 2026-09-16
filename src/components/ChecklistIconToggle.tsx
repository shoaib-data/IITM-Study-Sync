import React from 'react';
import { Check, X, FileText, CheckSquare, BookMarked } from 'lucide-react';

export type ChecklistType = 'assignment' | 'practice' | 'notes';

interface ChecklistIconToggleProps {
  id?: string;
  type: ChecklistType;
  completed: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

const TYPE_CONFIG = {
  assignment: {
    label: 'Weekly Assignment',
    shortLabel: 'Assignment',
    icon: FileText,
  },
  practice: {
    label: 'Practice Questions',
    shortLabel: 'Practice',
    icon: CheckSquare,
  },
  notes: {
    label: 'Lecture Notes Created',
    shortLabel: 'Notes',
    icon: BookMarked,
  },
};

export const ChecklistIconToggle: React.FC<ChecklistIconToggleProps> = ({
  id,
  type,
  completed,
  onToggle,
  disabled = false,
  size = 'md',
}) => {
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  const buttonSize = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <button
      id={id}
      type="button"
      disabled={disabled}
      onClick={onToggle}
      title={`${config.label}: ${completed ? 'Completed (click to toggle)' : 'Incomplete (click to complete)'}`}
      aria-label={`${config.label}: ${completed ? 'Completed' : 'Incomplete'}`}
      className={`relative inline-flex items-center justify-center rounded-md border transition-all ${buttonSize} ${
        disabled ? 'cursor-default' : 'cursor-pointer'
      } ${
        completed
          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 shadow-2xs'
          : 'bg-zinc-50 border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:bg-zinc-100'
      }`}
    >
      {completed ? (
        <Check className={`${iconSize} stroke-[2.5]`} />
      ) : (
        <X className={`${iconSize} stroke-[1.5] text-zinc-300`} />
      )}
    </button>
  );
};
