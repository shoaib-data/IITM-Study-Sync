import React, { useState } from 'react';
import { FinalGrade } from '../types';
import { Award, ChevronDown } from 'lucide-react';

interface FinalGradeBadgeProps {
  grade?: FinalGrade | null;
  editable?: boolean;
  onGradeChange?: (newGrade: FinalGrade | null) => void;
}

export const FinalGradeBadge: React.FC<FinalGradeBadgeProps> = ({
  grade,
  editable = false,
  onGradeChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const getStyle = (g?: FinalGrade | null) => {
    switch (g) {
      case 'S':
      case 'A':
        return 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'B':
      case 'C':
        return 'bg-amber-100/80 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'D':
      case 'E':
      case 'I':
        return 'bg-rose-100/80 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      default:
        return 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700';
    }
  };

  const GRADE_OPTIONS: FinalGrade[] = ['S', 'A', 'B', 'C', 'D', 'E', 'I'];

  if (editable && isEditing && onGradeChange) {
    return (
      <div className="inline-flex items-center gap-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg p-1 shadow-sm">
        <select
          value={grade || ''}
          autoFocus
          onChange={(e) => {
            const val = e.target.value as FinalGrade;
            onGradeChange(val || null);
            setIsEditing(false);
          }}
          onBlur={() => setIsEditing(false)}
          className="text-xs font-bold bg-transparent border-0 text-zinc-900 dark:text-zinc-100 focus:ring-0 focus:outline-hidden py-0.5 pl-1 pr-4"
        >
          <option value="">No Grade</option>
          {GRADE_OPTIONS.map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div
      onClick={() => {
        if (editable && onGradeChange) {
          setIsEditing(true);
        }
      }}
      title={editable ? 'Click to change final grade' : undefined}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all shadow-2xs ${getStyle(
        grade
      )} ${editable ? 'cursor-pointer hover:opacity-90 hover:scale-105 active:scale-95' : ''}`}
    >
      <Award className="w-3.5 h-3.5 shrink-0" />
      <span>{grade ? `Grade ${grade}` : 'No Grade'}</span>
      {editable && onGradeChange && (
        <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
      )}
    </div>
  );
};
