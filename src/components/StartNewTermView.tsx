import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSaveStatus } from '../context/SaveStatusContext';
import {
  subscribeCalendarTerms,
  subscribeCourseCatalog,
  startNewTerm,
} from '../lib/firestoreService';
import { CalendarTerm, CourseCatalogItem, UserLevel } from '../types';
import { formatDateString } from '../lib/dateUtils';
import { USER_LEVELS } from '../lib/constants';
import {
  Calendar,
  Check,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';

interface StartNewTermViewProps {
  onTermStarted: () => void;
}

export const StartNewTermView: React.FC<StartNewTermViewProps> = ({ onTermStarted }) => {
  const { currentUser, userProfile } = useAuth();
  const { triggerSaving, triggerSaved, triggerError } = useSaveStatus();

  const [calendarTerms, setCalendarTerms] = useState<CalendarTerm[]>([]);
  const [catalogCourses, setCatalogCourses] = useState<CourseCatalogItem[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<UserLevel>(userProfile?.level || 'Foundation');
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (userProfile?.level) {
      setFilterLevel(userProfile.level);
    }
  }, [userProfile?.level]);

  useEffect(() => {
    const unsubCal = subscribeCalendarTerms((terms) => {
      setCalendarTerms(terms);
    });
    const unsubCat = subscribeCourseCatalog((courses) => {
      setCatalogCourses(courses);
    });
    return () => {
      unsubCal();
      unsubCat();
    };
  }, []);

  // Filter terms:
  // 1. Current active term (if today falls within startDate .. endTermDate), marked as "Current"
  // 2. Next 2 upcoming terms after that (or after today if no term is active), sorted chronologically
  // Take up to 3 results.
  const visibleTerms = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    // 1. Sort all calendar documents chronologically by startDate
    const sorted = [...calendarTerms]
      .filter((t) => t.startDate && t.endTermDate)
      .sort((a, b) => {
        const aTime = new Date(a.startDate).getTime();
        const bTime = new Date(b.startDate).getTime();
        return (Number.isNaN(aTime) ? 0 : aTime) - (Number.isNaN(bTime) ? 0 : bTime);
      });

    // 2. Check if today falls within any term's startDate to endTermDate range
    const currentIndex = sorted.findIndex((term) => {
      const start = new Date(term.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(term.endTermDate);
      end.setHours(23, 59, 59, 999);
      return todayTime >= start.getTime() && todayTime <= end.getTime();
    });

    if (currentIndex !== -1) {
      // Current active term
      const currentTerm = sorted[currentIndex];
      // Next 2 upcoming terms after that
      const nextUpcoming = sorted.slice(currentIndex + 1, currentIndex + 3);
      return [
        { term: currentTerm, isCurrent: true },
        ...nextUpcoming.map((t) => ({ term: t, isCurrent: false })),
      ];
    }

    // If no term is currently active: filter to today's date onward and take first 3 results
    const upcoming = sorted
      .filter((term) => {
        const end = new Date(term.endTermDate);
        end.setHours(23, 59, 59, 999);
        return end.getTime() >= todayTime;
      })
      .slice(0, 3);

    return upcoming.map((term) => ({
      term,
      isCurrent: false,
    }));
  }, [calendarTerms]);

  // Keep selectedTermId in sync with visible terms
  useEffect(() => {
    if (visibleTerms.length > 0) {
      const exists = visibleTerms.some((vt) => vt.term.termId === selectedTermId);
      if (!exists) {
        setSelectedTermId(visibleTerms[0].term.termId);
      }
    }
  }, [visibleTerms, selectedTermId]);

  const selectedCalendar = calendarTerms.find((c) => c.termId === selectedTermId);
  const filteredCourses = catalogCourses.filter((c) => c.level === filterLevel);

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  const handleStartTerm = async () => {
    if (!currentUser || !selectedCalendar) return;
    if (selectedCourseIds.length === 0) {
      alert('Please select at least one course for the new term.');
      return;
    }

    const selectedCourseObjects = catalogCourses.filter((c) =>
      selectedCourseIds.includes(c.id)
    );

    setIsSubmitting(true);
    triggerSaving();
    try {
      await startNewTerm(currentUser.uid, selectedCalendar, selectedCourseObjects);
      triggerSaved();
      onTermStarted();
    } catch (err) {
      triggerError('Failed to initialize term');
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Start New Academic Term
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Select an upcoming official calendar cycle and enroll in your level&apos;s courses. The assessment structure is pulled automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Step 1: Pick Academic Calendar Cycle */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <span className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center text-xs font-bold">
            1
          </span>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Pick Official Calendar Cycle
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {visibleTerms.map(({ term: cal, isCurrent }) => {
            const isSelected = cal.termId === selectedTermId;
            return (
              <div
                key={cal.termId}
                id={`calendar-option-${cal.termId}`}
                onClick={() => setSelectedTermId(cal.termId)}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer space-y-2.5 relative ${
                  isSelected
                    ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50/70 dark:bg-zinc-800/60 shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                      {cal.cycleType} Cycle
                    </span>
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        Current
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                        Upcoming
                      </span>
                    )}
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-zinc-900 dark:text-zinc-100 shrink-0" />}
                </div>

                <div>
                  <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {cal.cycleType} {cal.termId.replace(/^[A-Za-z]+/, '')} Term
                  </div>
                  {isCurrent && (
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                      Currently active term
                    </div>
                  )}
                </div>

                <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                  <div>Commences: <strong className="text-zinc-700 dark:text-zinc-300">{formatDateString(cal.startDate)}</strong></div>
                  <div>Quiz 1: <strong className="text-zinc-700 dark:text-zinc-300">{formatDateString(cal.quiz1Date)}</strong></div>
                  <div>End Term: <strong className="text-zinc-700 dark:text-zinc-300">{formatDateString(cal.endTermDate)}</strong></div>
                </div>
              </div>
            );
          })}
          {visibleTerms.length === 0 && (
            <div className="col-span-full p-6 text-center text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl">
              No active or upcoming terms found in the calendar catalog.
            </div>
          )}
        </div>
      </div>

      {/* Step 2: Select Courses From Catalog */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center text-xs font-bold">
              2
            </span>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Select Courses ({selectedCourseIds.length} chosen)
            </h2>
          </div>

          {/* Level Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {USER_LEVELS.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium whitespace-nowrap transition-colors ${
                  filterLevel === lvl
                    ? 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredCourses.map((course) => {
            const isSelected = selectedCourseIds.includes(course.id);
            return (
              <div
                key={course.id}
                id={`catalog-select-${course.id}`}
                onClick={() => toggleCourseSelection(course.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  isSelected
                    ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50/80 dark:bg-zinc-800/80 shadow-2xs'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                }`}
              >
                <div className="space-y-1">
                  <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                    {course.name}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {course.assessmentType === 'exam' ? (
                      <span>
                        Exam Components: Quiz 1, Quiz 2, End Term
                        {course.examComponents?.oppeCount
                          ? ` + ${course.examComponents.oppeCount} OPPEs`
                          : ''}
                      </span>
                    ) : (
                      <span>
                        Project Components: Project Submission
                        {course.projectComponents?.hasViva ? ' + Viva' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-900'
                      : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation & Archival Notice */}
      <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-5 flex items-start gap-3.5 text-xs text-amber-900 dark:text-amber-200">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold">Term Archival Rule:</div>
          <div>
            Starting a new term will automatically set your previous active term&apos;s status to archived (<code className="bg-amber-100/70 dark:bg-amber-900/60 px-1 py-0.5 rounded">isActive: false</code>). Its score records and weekly milestones will be preserved read-only in your <strong>Course History</strong>.
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          id="confirm-start-term-btn"
          disabled={selectedCourseIds.length === 0 || isSubmitting}
          onClick={handleStartTerm}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 rounded-lg hover:bg-zinc-800 dark:hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
        >
          {isSubmitting ? (
            <span>Starting term...</span>
          ) : (
            <>
              <span>Enroll &amp; Launch Term</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
