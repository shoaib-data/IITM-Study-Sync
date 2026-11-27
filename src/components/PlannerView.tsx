import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSaveStatus } from '../context/SaveStatusContext';
import {
  subscribeUserTasks,
  addUserTask,
  updateUserTask,
  deleteUserTask,
  subscribeUserTerms,
  subscribeCalendarTerms,
  subscribeUserCourses,
  subscribeUserStickyNotes,
} from '../lib/firestoreService';
import { UserTask, UserTerm, CalendarTerm, UserCourse, StickyNote } from '../types';
import { StickyNotesSection } from './StickyNotesSection';
import { getTodayIST } from '../lib/dateUtils';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Calendar as CalendarIcon,
  X,
  ArrowRight,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface ExamMark {
  id: string;
  name: string;
  type: 'quiz1' | 'quiz2' | 'endTerm' | 'oppe1' | 'oppe2';
  color: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
}

const EXAM_TYPE_STYLES: Record<
  ExamMark['type'],
  { name: string; dotColor: string; badgeBg: string; badgeText: string }
> = {
  quiz1: {
    name: 'Quiz 1',
    dotColor: 'bg-blue-500',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800',
    badgeText: 'text-blue-700 dark:text-blue-300',
  },
  quiz2: {
    name: 'Quiz 2',
    dotColor: 'bg-purple-500',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800',
    badgeText: 'text-purple-700 dark:text-purple-300',
  },
  endTerm: {
    name: 'End Term',
    dotColor: 'bg-amber-500',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
    badgeText: 'text-amber-700 dark:text-amber-300',
  },
  oppe1: {
    name: 'OPPE 1 Window',
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
  },
  oppe2: {
    name: 'OPPE 2 Window',
    dotColor: 'bg-cyan-500',
    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
  },
};

/**
 * Returns an array of YYYY-MM-DD date strings between start and end inclusive.
 */
function getDatesInRange(startStr?: string, endStr?: string): string[] {
  if (!startStr) return [];
  if (!endStr || endStr === startStr) return [startStr];

  const dates: string[] = [];
  const [y1, m1, d1] = startStr.split('-').map(Number);
  const [y2, m2, d2] = endStr.split('-').map(Number);
  if (isNaN(y1) || isNaN(m1) || isNaN(d1) || isNaN(y2) || isNaN(m2) || isNaN(d2)) {
    return [startStr];
  }

  let curr = new Date(Date.UTC(y1, m1 - 1, d1, 12, 0, 0));
  const end = new Date(Date.UTC(y2, m2 - 1, d2, 12, 0, 0));
  let count = 0;
  while (curr <= end && count < 60) {
    const y = curr.getUTCFullYear();
    const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
    const d = String(curr.getUTCDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    curr = new Date(curr.getTime() + 24 * 60 * 60 * 1000);
    count++;
  }
  return dates;
}

/**
 * Formats YYYY-MM-DD to human friendly string, e.g. "Monday, Nov 9, 2026"
 */
function formatHumanDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return dateStr;
  }
}

export const PlannerView: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const { triggerSaving, triggerSaved, triggerError } = useSaveStatus();

  // Current India date (Asia/Kolkata)
  const [todayIST, setTodayIST] = useState<string>(() => getTodayIST());

  // Viewed month in calendar grid: { year, month } (month 0-indexed: 0 = Jan, 11 = Dec)
  const [viewDate, setViewDate] = useState(() => {
    const [y, m] = getTodayIST().split('-').map(Number);
    return { year: y, month: m - 1 };
  });

  // Selected date for day panel (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayIST());

  // Tasks from Firestore
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [userTerms, setUserTerms] = useState<UserTerm[]>([]);
  const [calendarTerms, setCalendarTerms] = useState<CalendarTerm[]>([]);
  const [activeCourses, setActiveCourses] = useState<UserCourse[]>([]);
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);

  // Mobile bottom sheet state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline editing state: taskId -> newTitle
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');

  // Keep today's date fresh in IST if the tab stays open across midnight
  useEffect(() => {
    const handleSync = () => {
      const current = getTodayIST();
      setTodayIST((prev) => (prev !== current ? current : prev));
    };
    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);
    const interval = setInterval(handleSync, 60000);
    return () => {
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
      clearInterval(interval);
    };
  }, []);

  // 1. Subscribe to user tasks
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeUserTasks(currentUser.uid, (taskList) => {
      setTasks(taskList);
    });
    return () => unsub();
  }, [currentUser]);

  // 2. Subscribe to user terms
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeUserTerms(currentUser.uid, (tList) => {
      setUserTerms(tList);
    });
    return () => unsub();
  }, [currentUser]);

  // 3. Subscribe to calendar terms
  useEffect(() => {
    const unsub = subscribeCalendarTerms((calList) => {
      setCalendarTerms(calList);
    });
    return () => unsub();
  }, []);

  // 4. Subscribe to active term courses for tagging
  const activeTerm = userTerms.find((t) => t.isActive);
  useEffect(() => {
    if (!currentUser || !activeTerm) {
      setActiveCourses([]);
      return;
    }
    const unsub = subscribeUserCourses(currentUser.uid, activeTerm.termId, (cList) => {
      setActiveCourses(cList.filter((c) => c.status !== 'dropped'));
    });
    return () => unsub();
  }, [currentUser, activeTerm]);

  // 5. Subscribe to user sticky notes (subject-specific + persistent 'general')
  useEffect(() => {
    if (!currentUser) {
      setStickyNotes([]);
      return;
    }
    const unsub = subscribeUserStickyNotes(currentUser.uid, (notes) => {
      setStickyNotes(notes);
    });
    return () => unsub();
  }, [currentUser]);

  // Map exam dates from linked calendar documents
  const examDatesMap = useMemo(() => {
    const map: Record<string, ExamMark[]> = {};

    const addMark = (dateStr: string, mark: ExamMark) => {
      if (!dateStr) return;
      if (!map[dateStr]) {
        map[dateStr] = [];
      }
      // Deduplicate by mark id
      if (!map[dateStr].some((m) => m.id === mark.id)) {
        map[dateStr].push(mark);
      }
    };

    // Find linked calendar documents from user's registered terms
    const userCalendarIds = new Set(userTerms.map((t) => t.calendarId).filter(Boolean));
    const relevantCalendars =
      calendarTerms.filter((c) => userCalendarIds.has(c.termId)).length > 0
        ? calendarTerms.filter((c) => userCalendarIds.has(c.termId))
        : calendarTerms; // Fallback to all if user terms have no calendars yet

    for (const cal of relevantCalendars) {
      // Quiz 1
      if (cal.quiz1Date) {
        addMark(cal.quiz1Date, {
          id: `${cal.termId}-quiz1`,
          name: `${cal.termId ? cal.termId + ' ' : ''}Quiz 1`,
          type: 'quiz1',
          color: 'blue',
          ...EXAM_TYPE_STYLES.quiz1,
        });
      }
      // Quiz 2
      if (cal.quiz2Date) {
        addMark(cal.quiz2Date, {
          id: `${cal.termId}-quiz2`,
          name: `${cal.termId ? cal.termId + ' ' : ''}Quiz 2`,
          type: 'quiz2',
          color: 'purple',
          ...EXAM_TYPE_STYLES.quiz2,
        });
      }
      // End Term
      if (cal.endTermDate) {
        addMark(cal.endTermDate, {
          id: `${cal.termId}-endTerm`,
          name: `${cal.termId ? cal.termId + ' ' : ''}End Term`,
          type: 'endTerm',
          color: 'amber',
          ...EXAM_TYPE_STYLES.endTerm,
        });
      }
      // OPPE 1 Window
      if (cal.oppe1Window?.start) {
        const oppe1Dates = getDatesInRange(cal.oppe1Window.start, cal.oppe1Window.end);
        oppe1Dates.forEach((d) => {
          addMark(d, {
            id: `${cal.termId}-oppe1`,
            name: `${cal.termId ? cal.termId + ' ' : ''}OPPE 1 Window`,
            type: 'oppe1',
            color: 'emerald',
            ...EXAM_TYPE_STYLES.oppe1,
          });
        });
      }
      // OPPE 2 Window
      if (cal.oppe2Window?.start) {
        const oppe2Dates = getDatesInRange(cal.oppe2Window.start, cal.oppe2Window.end);
        oppe2Dates.forEach((d) => {
          addMark(d, {
            id: `${cal.termId}-oppe2`,
            name: `${cal.termId ? cal.termId + ' ' : ''}OPPE 2 Window`,
            type: 'oppe2',
            color: 'cyan',
            ...EXAM_TYPE_STYLES.oppe2,
          });
        });
      }
    }

    return map;
  }, [userTerms, calendarTerms]);

  // Tasks grouped by date for fast cell lookup
  const tasksByDate = useMemo(() => {
    const map: Record<string, UserTask[]> = {};
    for (const t of tasks) {
      if (!map[t.date]) {
        map[t.date] = [];
      }
      map[t.date].push(t);
    }
    return map;
  }, [tasks]);

  // Overdue tasks: unfinished tasks whose date is strictly before today
  const overdueTasks = useMemo(() => {
    return tasks
      .filter((t) => !t.done && t.date < todayIST)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [tasks, todayIST]);

  // Selected day's tasks: unfinished first, done tasks struck through at the bottom
  const selectedDayTasks = useMemo(() => {
    const list = tasksByDate[selectedDate] || [];
    return [...list].sort((a, b) => {
      if (a.done !== b.done) {
        return a.done ? 1 : -1;
      }
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });
  }, [tasksByDate, selectedDate]);

  // Month navigation
  const handlePrevMonth = () => {
    setViewDate((prev) => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setViewDate((prev) => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleGoToToday = () => {
    const [y, m] = todayIST.split('-').map(Number);
    setViewDate({ year: y, month: m - 1 });
    setSelectedDate(todayIST);
  };

  // Month grid calculation (Sun-Sat)
  const monthGrid = useMemo(() => {
    const { year, month } = viewDate;

    // First day of this month
    const firstDayUtc = new Date(Date.UTC(year, month, 1, 12, 0, 0));
    // Sunday is 0, Saturday is 6
    const startDayOfWeek = firstDayUtc.getUTCDay();

    // Total days in current month
    const totalDaysInMonth = new Date(Date.UTC(year, month + 1, 0, 12, 0, 0)).getUTCDate();
    // Total days in previous month
    const totalDaysInPrevMonth = new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate();

    const cells: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Leading days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = totalDaysInPrevMonth - i;
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayIST,
      });
    }

    // Days in current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayIST,
      });
    }

    // Trailing days from next month to round out the weeks (multiples of 7)
    const remainder = cells.length % 7;
    if (remainder > 0) {
      const daysToAdd = 7 - remainder;
      const nextM = month === 11 ? 0 : month + 1;
      const nextY = month === 11 ? year + 1 : year;
      for (let d = 1; d <= daysToAdd; d++) {
        const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cells.push({
          dateStr,
          dayNumber: d,
          isCurrentMonth: false,
          isToday: dateStr === todayIST,
        });
      }
    }

    return cells;
  }, [viewDate, todayIST]);

  const monthName = new Date(Date.UTC(viewDate.year, viewDate.month, 1, 12, 0, 0)).toLocaleDateString(
    'en-US',
    { month: 'long', year: 'numeric', timeZone: 'UTC' }
  );

  // Day selection
  const handleSelectDay = (dateStr: string) => {
    setSelectedDate(dateStr);
    setMobileDrawerOpen(true);
  };

  // Add task handler
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    if (tasks.length >= 300) {
      triggerError('Task limit reached (max 300 tasks).');
      return;
    }

    setIsSubmitting(true);
    triggerSaving();

    try {
      const taggedCourse = activeCourses.find((c) => c.courseId === selectedCourseId);
      await addUserTask(currentUser.uid, {
        title: trimmed.slice(0, 120),
        date: selectedDate,
        done: false,
        courseId: taggedCourse ? taggedCourse.courseId : undefined,
        courseName: taggedCourse ? taggedCourse.name : undefined,
        createdAt: new Date().toISOString(),
      });
      setNewTitle('');
      setSelectedCourseId('');
      triggerSaved();
    } catch (err: any) {
      console.error('Failed to add task:', err);
      triggerError(err.message || 'Failed to add task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle task done
  const handleToggleTask = async (task: UserTask) => {
    if (!currentUser) return;
    triggerSaving();
    try {
      await updateUserTask(currentUser.uid, task.id, { done: !task.done });
      triggerSaved();
    } catch (err) {
      console.error('Failed to update task:', err);
      triggerError('Failed to update task');
    }
  };

  // Move task to today
  const handleMoveToToday = async (task: UserTask) => {
    if (!currentUser) return;
    triggerSaving();
    try {
      await updateUserTask(currentUser.uid, task.id, { date: todayIST });
      triggerSaved();
    } catch (err) {
      console.error('Failed to move task:', err);
      triggerError('Failed to move task');
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    if (!currentUser) return;
    triggerSaving();
    try {
      await deleteUserTask(currentUser.uid, taskId);
      triggerSaved();
    } catch (err) {
      console.error('Failed to delete task:', err);
      triggerError('Failed to delete task');
    }
  };

  // Save inline edit
  const handleSaveEdit = async (taskId: string) => {
    if (!currentUser) return;
    const trimmed = editTitleInput.trim();
    if (!trimmed) {
      setEditingTaskId(null);
      return;
    }
    triggerSaving();
    try {
      await updateUserTask(currentUser.uid, taskId, { title: trimmed.slice(0, 120) });
      setEditingTaskId(null);
      triggerSaved();
    } catch (err) {
      console.error('Failed to edit task:', err);
      triggerError('Failed to edit task');
    }
  };

  const isLimitReached = tasks.length >= 300;
  const selectedExams = examDatesMap[selectedDate] || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              <CalendarDays className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Study Planner
            </h1>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Organize daily tasks, track term exams, and keep your studies in sync &bull; India Standard Time (IST)
          </p>
        </div>

        {/* Task counter & limit indicator */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 shadow-2xs">
            <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{tasks.length}</span> / 300 tasks
          </div>
        </div>
      </div>

      {/* 300 Tasks Limit Banner (if reached) */}
      {isLimitReached && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 rounded-xl p-4 flex items-center gap-3 text-sm text-amber-800 dark:text-amber-200">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>
            <strong>Task limit reached (300 tasks).</strong> You have reached the maximum allowed tasks. Please delete or complete older tasks to add new ones.
          </p>
        </div>
      )}

      {/* OVERDUE SECTION (Above calendar, hidden when none) */}
      {overdueTasks.length > 0 && (
        <div className="bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-red-800 dark:text-red-300">
                Overdue Tasks ({overdueTasks.length})
              </h2>
            </div>
            <span className="text-xs text-red-600 dark:text-red-400">
              Action required: pending from earlier dates
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {overdueTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/60 rounded-lg p-3 shadow-2xs flex flex-col justify-between gap-2.5"
              >
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">
                      {task.title}
                    </span>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1"
                      title="Delete task"
                      aria-label="Delete overdue task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300">
                      Due {formatHumanDate(task.date)}
                    </span>
                    {task.courseName && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 truncate max-w-[140px]">
                        {task.courseName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    onClick={() => handleToggleTask(task)}
                    className="inline-flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark Done</span>
                  </button>

                  <button
                    onClick={() => handleMoveToToday(task)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 px-2 py-1 rounded transition-colors cursor-pointer"
                  >
                    <span>Move to today</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Two-Column Layout (Calendar + Desktop Day Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* CALENDAR COLUMN (Span 2) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Calendar Header Controls */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                  title="Previous Month"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                  title="Next Month"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 ml-1">
                  {monthName}
                </h2>
              </div>

              <button
                onClick={handleGoToToday}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors shadow-2xs cursor-pointer"
              >
                <span>Today</span>
              </button>
            </div>

            {/* Weekday Row (Sun-Sat) */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider pb-1">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Calendar Grid Cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {monthGrid.map((cell) => {
                const dayTasks = tasksByDate[cell.dateStr] || [];
                const dayExams = examDatesMap[cell.dateStr] || [];
                const isSelected = cell.dateStr === selectedDate;
                const hasTasks = dayTasks.length > 0;
                const allTasksDone = hasTasks && dayTasks.every((t) => t.done);
                const undoneCount = dayTasks.filter((t) => !t.done).length;

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    onClick={() => handleSelectDay(cell.dateStr)}
                    className={`relative min-h-[70px] sm:min-h-[88px] p-1.5 sm:p-2 rounded-xl text-left flex flex-col justify-between transition-all cursor-pointer border ${
                      isSelected
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                        : cell.isToday
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50/80 dark:bg-zinc-800/40 ring-1 ring-zinc-900/10'
                        : cell.isCurrentMonth
                        ? 'border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                        : 'border-zinc-100 dark:border-zinc-800/40 bg-zinc-50/50 dark:bg-zinc-950/40 opacity-40 hover:opacity-75'
                    }`}
                  >
                    {/* Top Row: Date Number and Today Tag */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs sm:text-sm font-semibold rounded-md w-6 h-6 flex items-center justify-center ${
                          cell.isToday
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                            : cell.isCurrentMonth
                            ? 'text-zinc-900 dark:text-zinc-100'
                            : 'text-zinc-400 dark:text-zinc-500'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {/* Task status indicator badge */}
                      {hasTasks && (
                        <div>
                          {allTasksDone ? (
                            <span
                              className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 shadow-2xs"
                              title={`${dayTasks.length} tasks completed`}
                            >
                              <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" />
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center justify-center min-w-4 sm:min-w-5 h-4 sm:h-5 px-1 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                              title={`${undoneCount} pending tasks`}
                            >
                              {undoneCount}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Exam Dots / Labels */}
                    <div className="w-full space-y-1 mt-1">
                      {dayExams.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          {dayExams.map((exam) => (
                            <span
                              key={exam.id}
                              className={`w-2 h-2 rounded-full ${exam.dotColor}`}
                              title={exam.name}
                            />
                          ))}
                          {dayExams.length === 1 && (
                            <span className="hidden sm:inline-block text-[9px] font-medium text-zinc-500 dark:text-zinc-400 truncate max-w-[50px]">
                              {dayExams[0].name.replace(/^[^\s]+\s/, '')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exam Type Legend (Read-Only) */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
              Academic Calendar Legend (Read-Only)
            </h3>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Quiz 1 Exam</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>Quiz 2 Exam</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>End Term Exam</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>OPPE 1 Window</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                <span>OPPE 2 Window</span>
              </div>
            </div>
          </div>
        </div>

        {/* DAY PANEL COLUMN (Desktop side panel) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-5">
            <DayPanelContent
              selectedDate={selectedDate}
              todayIST={todayIST}
              selectedExams={selectedExams}
              selectedDayTasks={selectedDayTasks}
              activeCourses={activeCourses}
              newTitle={newTitle}
              setNewTitle={setNewTitle}
              selectedCourseId={selectedCourseId}
              setSelectedCourseId={setSelectedCourseId}
              isSubmitting={isSubmitting}
              handleAddTask={handleAddTask}
              handleToggleTask={handleToggleTask}
              handleDeleteTask={handleDeleteTask}
              editingTaskId={editingTaskId}
              setEditingTaskId={setEditingTaskId}
              editTitleInput={editTitleInput}
              setEditTitleInput={setEditTitleInput}
              handleSaveEdit={handleSaveEdit}
              isLimitReached={isLimitReached}
            />
          </div>
        </div>
      </div>

      {/* STICKY NOTES SECTION (Full width directly below Calendar + Legend) */}
      {currentUser && (
        <StickyNotesSection
          uid={currentUser.uid}
          termId={activeTerm?.termId}
          courses={activeCourses}
          stickyNotes={stickyNotes}
        />
      )}

      {/* MOBILE BOTTOM SHEET FOR DAY PANEL */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Sheet Body */}
          <div className="relative bg-white dark:bg-zinc-900 rounded-t-2xl shadow-2xl border-t border-zinc-200 dark:border-zinc-800 p-5 max-h-[85vh] overflow-y-auto space-y-4 z-10 animate-in slide-in-from-bottom duration-200">
            {/* Drag handle / close header */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2.5" />
              <div className="font-semibold text-xs text-zinc-400 uppercase tracking-wider">
                Day Panel
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                aria-label="Close day panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <DayPanelContent
              selectedDate={selectedDate}
              todayIST={todayIST}
              selectedExams={selectedExams}
              selectedDayTasks={selectedDayTasks}
              activeCourses={activeCourses}
              newTitle={newTitle}
              setNewTitle={setNewTitle}
              selectedCourseId={selectedCourseId}
              setSelectedCourseId={setSelectedCourseId}
              isSubmitting={isSubmitting}
              handleAddTask={handleAddTask}
              handleToggleTask={handleToggleTask}
              handleDeleteTask={handleDeleteTask}
              editingTaskId={editingTaskId}
              setEditingTaskId={setEditingTaskId}
              editTitleInput={editTitleInput}
              setEditTitleInput={setEditTitleInput}
              handleSaveEdit={handleSaveEdit}
              isLimitReached={isLimitReached}
            />
          </div>
        </div>
      )}
    </div>
  );
};

interface DayPanelContentProps {
  selectedDate: string;
  todayIST: string;
  selectedExams: ExamMark[];
  selectedDayTasks: UserTask[];
  activeCourses: UserCourse[];
  newTitle: string;
  setNewTitle: (v: string) => void;
  selectedCourseId: string;
  setSelectedCourseId: (v: string) => void;
  isSubmitting: boolean;
  handleAddTask: (e: React.FormEvent) => void;
  handleToggleTask: (t: UserTask) => void;
  handleDeleteTask: (id: string) => void;
  editingTaskId: string | null;
  setEditingTaskId: (id: string | null) => void;
  editTitleInput: string;
  setEditTitleInput: (v: string) => void;
  handleSaveEdit: (id: string) => void;
  isLimitReached: boolean;
}

const DayPanelContent: React.FC<DayPanelContentProps> = ({
  selectedDate,
  todayIST,
  selectedExams,
  selectedDayTasks,
  activeCourses,
  newTitle,
  setNewTitle,
  selectedCourseId,
  setSelectedCourseId,
  isSubmitting,
  handleAddTask,
  handleToggleTask,
  handleDeleteTask,
  editingTaskId,
  setEditingTaskId,
  editTitleInput,
  setEditTitleInput,
  handleSaveEdit,
  isLimitReached,
}) => {
  const isToday = selectedDate === todayIST;

  return (
    <div className="space-y-4">
      {/* Date Title Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {isToday && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Today
            </span>
          )}
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {formatHumanDate(selectedDate)}
          </h3>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {selectedDayTasks.length} {selectedDayTasks.length === 1 ? 'task' : 'tasks'} scheduled
        </p>
      </div>

      {/* Exam badges marked on this date */}
      {selectedExams.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Exam Milestones
          </div>
          <div className="space-y-1">
            {selectedExams.map((exam) => (
              <div
                key={exam.id}
                className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold ${exam.badgeBg} ${exam.badgeText}`}
              >
                <span className={`w-2 h-2 rounded-full ${exam.dotColor}`} />
                <span>{exam.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Task Input Form */}
      <form onSubmit={handleAddTask} className="space-y-2.5 pt-2">
        <div className="space-y-1">
          <label
            htmlFor="planner-task-title-input"
            className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block"
          >
            Add Task
          </label>
          <div className="relative">
            <input
              id="planner-task-title-input"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="What do you need to do? (max 120 chars)"
              maxLength={120}
              disabled={isLimitReached || isSubmitting}
              className="w-full text-sm px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <span className="absolute right-2.5 bottom-2 text-[10px] text-zinc-400 font-mono">
              {newTitle.length}/120
            </span>
          </div>
        </div>

        {/* Optional Course Tag Dropdown */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              disabled={isLimitReached || isSubmitting}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">No course tag (General)</option>
              {activeCourses.map((c) => (
                <option key={c.courseId} value={c.courseId}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={!newTitle.trim() || isLimitReached || isSubmitting}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </form>

      {/* Tasks List */}
      <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Tasks ({selectedDayTasks.length})
        </div>

        {selectedDayTasks.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400 space-y-1">
            <CalendarIcon className="w-6 h-6 mx-auto stroke-1 text-zinc-300 dark:text-zinc-600 mb-1" />
            <p>No tasks scheduled for this day.</p>
            <p className="text-[11px] text-zinc-400">Add a task above to plan your study session.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {selectedDayTasks.map((task) => {
              const isEditing = editingTaskId === task.id;

              return (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border transition-all ${
                    task.done
                      ? 'bg-zinc-50/60 dark:bg-zinc-800/30 border-zinc-200/50 dark:border-zinc-800/50'
                      : 'bg-white dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700/80 shadow-2xs'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editTitleInput}
                        onChange={(e) => setEditTitleInput(e.target.value)}
                        maxLength={120}
                        className="w-full text-xs px-2.5 py-1.5 rounded bg-zinc-100 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingTaskId(null)}
                          className="px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(task.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2.5">
                      {/* Checkbox and Title */}
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={task.done}
                          onChange={() => handleToggleTask(task)}
                          className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-600 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-xs sm:text-sm font-medium break-words ${
                              task.done
                                ? 'line-through text-zinc-400 dark:text-zinc-500'
                                : 'text-zinc-800 dark:text-zinc-100'
                            }`}
                          >
                            {task.title}
                          </p>
                          {task.courseName && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 truncate max-w-[200px]">
                              {task.courseName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Edit & Delete Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTaskId(task.id);
                            setEditTitleInput(task.title);
                          }}
                          className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                          title="Edit task"
                          aria-label="Edit task"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete task"
                          aria-label="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
