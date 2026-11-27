import React, { useState } from 'react';
import { StudyLogEntry } from '../types';
import { getCalendarDaysDiff } from '../lib/dateUtils';
import { Trash2 } from 'lucide-react';

interface StudyLogEntryRowProps {
  entry: StudyLogEntry;
  todayIST: string;
  onDelete: (logId: string) => Promise<void>;
}

function parseEntryDateParts(dateStr: string) {
  const parts = dateStr?.split('-').map(Number);
  if (!parts || parts.length < 3 || parts.some(isNaN)) {
    return null;
  }
  const [y, m, d] = parts;
  const utcDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const month = utcDate
    .toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
    .toUpperCase();
  const day = String(d);
  const weekday = utcDate.toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  });
  return { month, day, weekday };
}

export const StudyLogEntryRow: React.FC<StudyLogEntryRowProps> = ({
  entry,
  todayIST,
  onDelete,
}) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isToday = entry.date === todayIST;
  const daysAgo = getCalendarDaysDiff(entry.date, todayIST);
  const dateParts = parseEntryDateParts(entry.date);

  const relativeDay = isToday
    ? 'Today'
    : daysAgo === 1
      ? 'Yesterday'
      : dateParts?.weekday || entry.date;

  const formattedTime = entry.createdAt
    ? (() => {
        try {
          return new Date(entry.createdAt).toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: 'numeric',
            minute: '2-digit',
          });
        } catch {
          return '';
        }
      })()
    : '';

  const relativeLabel = formattedTime ? `${relativeDay} • ${formattedTime}` : relativeDay;

  const handleConfirm = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(entry.id);
    } finally {
      setIsDeleting(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <div
      className={`flex items-center gap-3.5 sm:gap-4 rounded-xl border px-3.5 py-3 transition-colors ${
        confirmingDelete
          ? 'bg-rose-50/40 dark:bg-rose-950/15 border-rose-200 dark:border-rose-900/60'
          : 'bg-zinc-50/70 dark:bg-zinc-950/50 border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
      }`}
    >
      {/* Left Side: Fixed-width Date Box */}
      <div
        className={`w-13 h-13 sm:w-14 sm:h-14 shrink-0 rounded-lg border flex flex-col items-center justify-center select-none ${
          isToday
            ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300/80 dark:border-emerald-500/40'
            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
        }`}
      >
        <span
          className={`text-[10px] font-semibold tracking-wider uppercase leading-none ${
            isToday
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          {dateParts ? dateParts.month : 'LOG'}
        </span>
        <span
          className={`text-lg sm:text-xl font-bold leading-tight mt-0.5 tabular-nums ${
            isToday
              ? 'text-emerald-900 dark:text-white'
              : 'text-zinc-900 dark:text-white'
          }`}
        >
          {dateParts ? dateParts.day : '•'}
        </span>
      </div>

      {/* Middle: Course Badge + Relative Label/Time + Summary */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/80">
            {entry.courseColor && (
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: entry.courseColor }}
              />
            )}
            <span className="truncate max-w-[200px]">{entry.courseName}</span>
          </span>

          {isToday && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
              TODAY
            </span>
          )}

          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            {relativeLabel}
          </span>
        </div>

        <p className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-100 leading-snug break-words">
          {entry.summary}
        </p>
      </div>

      {/* Right Side: Trash Icon or Inline Two-Step Confirmation */}
      <div className="shrink-0 flex items-center">
        {confirmingDelete ? (
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5">
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mr-0.5">
              Delete?
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isDeleting}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? '...' : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={isDeleting}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300/80 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="p-2 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            title="Delete study entry"
            aria-label="Delete study entry"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
