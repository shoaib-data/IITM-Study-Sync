import React, { useState } from 'react';
import { StudyLogEntry, UserCourse } from '../types';
import { StudyLogEntryRow } from './StudyLogEntryRow';
import { BookOpenCheck, Plus, ArrowRight } from 'lucide-react';

interface StudyLogCardProps {
  courses: UserCourse[];
  entries: StudyLogEntry[];
  todayIST: string;
  onAddEntry: (params: {
    courseId?: string;
    courseName: string;
    courseColor?: string;
    summary: string;
  }) => Promise<void>;
  onDeleteEntry: (logId: string) => Promise<void>;
  onViewFullHistory: () => void;
}

export const StudyLogCard: React.FC<StudyLogCardProps> = ({
  courses,
  entries,
  todayIST,
  onAddEntry,
  onDeleteEntry,
  onViewFullHistory,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('general');
  const [summary, setSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Show ONLY the 7 most recent study entries for the current term
  const recentEntries = entries.slice(0, 7);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = summary.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const matchedCourse =
        selectedCourseId === 'general'
          ? undefined
          : courses.find((c) => c.courseId === selectedCourseId || c.id === selectedCourseId);

      await onAddEntry({
        courseId: matchedCourse ? matchedCourse.courseId : undefined,
        courseName: matchedCourse ? matchedCourse.name : 'General',
        courseColor: matchedCourse ? matchedCourse.color : undefined,
        summary: trimmed.slice(0, 500),
      });
      setSummary('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="study-log-dashboard-card"
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpenCheck className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Todays Study Log
          </h2>
        </div>

        <button
          id="view-full-study-history-btn"
          type="button"
          onClick={onViewFullHistory}
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline self-start sm:self-auto cursor-pointer"
        >
          <span>View Full History</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <select
          id="study-log-course-select"
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          disabled={isSubmitting}
          aria-label="Select course"
          className="sm:w-48 shrink-0 text-xs px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 cursor-pointer"
        >
          <option value="general">General</option>
          {courses.map((course) => (
            <option key={course.id} value={course.courseId}>
              {course.name}
            </option>
          ))}
        </select>

        <div className="flex flex-1 gap-2">
          <input
            id="study-log-summary-input"
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Write what you studied or completed today..."
            maxLength={500}
            disabled={isSubmitting}
            className="flex-1 min-w-0 text-xs sm:text-sm px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
          />

          <button
            id="study-log-submit-btn"
            type="submit"
            disabled={!summary.trim() || isSubmitting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Entry</span>
          </button>
        </div>
      </form>

      {/* Recent Entries List (Max 7) */}
      {recentEntries.length === 0 ? (
        <div className="py-5 px-4 text-center rounded-lg bg-zinc-50/70 dark:bg-zinc-800/40 border border-dashed border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
          No study sessions logged yet for this term. Add what you worked on today above!
        </div>
      ) : (
        <div className="space-y-2.5">
          {recentEntries.map((entry) => (
            <StudyLogEntryRow
              key={entry.id}
              entry={entry}
              todayIST={todayIST}
              onDelete={onDeleteEntry}
            />
          ))}
        </div>
      )}
    </div>
  );
};
