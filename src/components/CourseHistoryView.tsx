import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSaveStatus } from '../context/SaveStatusContext';
import {
  subscribeUserTerms,
  subscribeCalendarTerms,
  updateCourseFinalGrade,
  deleteUserTerm,
  deleteUserCourse,
} from '../lib/firestoreService';
import { UserTerm, UserCourse, CalendarTerm, FinalGrade } from '../types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FinalGradeBadge } from './FinalGradeBadge';
import { AddPastTermModal } from './AddPastTermModal';
import {
  Clock,
  ChevronDown,
  ChevronUp,
  Award,
  History,
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

export const CourseHistoryView: React.FC = () => {
  const { currentUser } = useAuth();
  const { triggerSaving, triggerSaved, triggerError } = useSaveStatus();

  const [archivedTerms, setArchivedTerms] = useState<UserTerm[]>([]);
  const [calendarTerms, setCalendarTerms] = useState<CalendarTerm[]>([]);
  const [termCoursesMap, setTermCoursesMap] = useState<Record<string, UserCourse[]>>({});
  const [expandedTermId, setExpandedTermId] = useState<string | null>(null);
  const [loadingCourses, setLoadingCourses] = useState<Record<string, boolean>>({});
  const [showAddModal, setShowAddModal] = useState(false);

  // In-app deletion dialog state (replaces window.confirm which is blocked in iframes)
  const [termToDelete, setTermToDelete] = useState<UserTerm | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<{
    termId: string;
    course: UserCourse;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Subscribe to user terms
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeUserTerms(currentUser.uid, (allTerms) => {
      const archived = allTerms.filter((t) => !t.isActive);
      // Sort with latest terms first
      archived.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      setArchivedTerms(archived);
      if (archived.length > 0 && !expandedTermId) {
        setExpandedTermId(archived[0].termId);
      }
    });
    return () => unsub();
  }, [currentUser]);

  // Subscribe to calendar terms
  useEffect(() => {
    const unsub = subscribeCalendarTerms(setCalendarTerms);
    return () => unsub();
  }, []);

  // Load courses when a term is expanded
  useEffect(() => {
    if (!currentUser || !expandedTermId) return;
    if (termCoursesMap[expandedTermId]) return;

    const fetchTermCourses = async () => {
      setLoadingCourses((prev) => ({ ...prev, [expandedTermId]: true }));
      try {
        const snap = await getDocs(
          collection(db, 'users', currentUser.uid, 'terms', expandedTermId, 'courses')
        );
        const courses: UserCourse[] = [];
        snap.forEach((d) => {
          courses.push({ id: d.id, ...(d.data() as Omit<UserCourse, 'id'>) });
        });
        setTermCoursesMap((prev) => ({ ...prev, [expandedTermId]: courses }));
      } catch (err) {
        console.error('Error fetching archived term courses:', err);
      } finally {
        setLoadingCourses((prev) => ({ ...prev, [expandedTermId]: false }));
      }
    };

    fetchTermCourses();
  }, [currentUser, expandedTermId, termCoursesMap]);

  const handleUpdateGrade = async (termId: string, courseId: string, newGrade: FinalGrade | null) => {
    if (!currentUser) return;
    triggerSaving();
    try {
      await updateCourseFinalGrade(currentUser.uid, termId, courseId, newGrade);
      // Update local state
      setTermCoursesMap((prev) => {
        const existing = prev[termId] || [];
        const updated = existing.map((c) =>
          c.id === courseId ? { ...c, finalGrade: newGrade } : c
        );
        return { ...prev, [termId]: updated };
      });
      triggerSaved();
    } catch (err) {
      triggerError('Failed to update grade');
      console.error(err);
    }
  };

  const handleConfirmDeleteTerm = async () => {
    if (!currentUser || !termToDelete) return;
    setIsDeleting(true);
    triggerSaving();
    try {
      await deleteUserTerm(currentUser.uid, termToDelete.termId);
      triggerSaved();
      setTermCoursesMap((prev) => {
        const copy = { ...prev };
        delete copy[termToDelete.termId];
        return copy;
      });
      setArchivedTerms((prev) => prev.filter((t) => t.termId !== termToDelete.termId));
      if (expandedTermId === termToDelete.termId) {
        setExpandedTermId(null);
      }
      setTermToDelete(null);
    } catch (err) {
      triggerError('Failed to delete historical term');
      console.error('Error deleting term:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteCourse = async () => {
    if (!currentUser || !courseToDelete) return;
    setIsDeleting(true);
    triggerSaving();
    try {
      await deleteUserCourse(currentUser.uid, courseToDelete.termId, courseToDelete.course.id);
      triggerSaved();
      setTermCoursesMap((prev) => {
        const existing = prev[courseToDelete.termId] || [];
        return {
          ...prev,
          [courseToDelete.termId]: existing.filter((c) => c.id !== courseToDelete.course.id),
        };
      });
      setCourseToDelete(null);
    } catch (err) {
      triggerError('Failed to delete course');
      console.error('Error deleting course:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTermAdded = () => {
    setTermCoursesMap({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Course &amp; Term History
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Permanent records of completed semesters, final grades (S/A/B/C/D/E/I), and assessment marks.
              </p>
            </div>
          </div>

          {/* + Add Past Course/Term Button */}
          <button
            id="add-past-term-btn"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-white rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-2xs self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Past Course / Term</span>
          </button>
        </div>
      </div>

      {archivedTerms.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-10 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
              No Historical Terms Found
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Terms are automatically archived here when starting a new term. You can also backfill prior semesters completed before using this app.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Backfill Past Term</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {archivedTerms.map((term) => {
            const isExpanded = expandedTermId === term.termId;
            const courses = termCoursesMap[term.termId] || [];
            const isLoading = loadingCourses[term.termId];

            return (
              <div
                key={term.termId}
                id={`archived-term-${term.termId}`}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden"
              >
                {/* Expandable Header */}
                <div
                  onClick={() => setExpandedTermId(isExpanded ? null : term.termId)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                          {term.termName}
                        </h3>
                        {term.isManualBackfill && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                            Backfilled Record
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {term.isManualBackfill ? 'Historical User Entry' : 'Archived Term Record'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full">
                      {courses.length} course{courses.length === 1 ? '' : 's'}
                    </span>

                    {/* Delete Historical Term button */}
                    <button
                      type="button"
                      id={`delete-term-btn-${term.termId}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTermToDelete(term);
                      }}
                      title="Delete this historical term"
                      aria-label="Delete this historical term"
                      className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors focus:outline-hidden"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-zinc-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-zinc-200 dark:border-zinc-800 p-5 bg-zinc-50/50 dark:bg-zinc-850/40 space-y-4">
                    {isLoading ? (
                      <div className="text-center py-6 text-xs text-zinc-400">
                        Loading archived courses...
                      </div>
                    ) : courses.length === 0 ? (
                      <div className="text-center py-6 text-xs text-zinc-400">
                        No courses recorded in this term.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {courses.map((course) => {
                          // Calculate completion if weekly checklists exist
                          let doneChecklists = 0;
                          if (course.weeklyProgress) {
                            Object.values(course.weeklyProgress).forEach((wp) => {
                              const check = wp as {
                                assignmentSubmitted?: boolean;
                                practiceQuestionsCompleted?: boolean;
                                notesCreated?: boolean;
                              };
                              if (check.assignmentSubmitted) doneChecklists++;
                              if (check.practiceQuestionsCompleted) doneChecklists++;
                              if (check.notesCreated) doneChecklists++;
                            });
                          }

                          return (
                            <div
                              key={course.id}
                              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3 shadow-2xs relative overflow-hidden"
                            >
                              <div
                                className="absolute left-0 top-0 bottom-0 w-1.5"
                                style={{ backgroundColor: course.color }}
                              />

                              {/* Course Header with Headline Final Grade Badge & Delete Course button */}
                              <div className="pl-2 flex items-start justify-between gap-3">
                                <div className="space-y-0.5 min-w-0">
                                  <div className="text-[10px] font-semibold uppercase text-zinc-400">
                                    {course.level}
                                  </div>
                                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                    {course.name}
                                  </h4>
                                  {!term.isManualBackfill && (
                                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                      Weekly Tasks Completed: {doneChecklists} / 36
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* Headline Color-coded Final Grade Badge (S/A green, B/C amber, D/E/I red) */}
                                  <FinalGradeBadge
                                    grade={course.finalGrade}
                                    editable={true}
                                    onGradeChange={(newGrade) =>
                                      handleUpdateGrade(term.termId, course.id, newGrade)
                                    }
                                  />

                                  {/* Delete single course button */}
                                  <button
                                    type="button"
                                    onClick={() => setCourseToDelete({ termId: term.termId, course })}
                                    title="Delete this course from history"
                                    aria-label="Delete this course from history"
                                    className="p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Scores breakdown */}
                              <div className="pl-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
                                <div className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                                  <Award className="w-3.5 h-3.5 text-zinc-500" />
                                  <span>Component Scores</span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                  {course.assessmentType === 'exam' ? (
                                    <>
                                      {course.scores?.quiz1?.score !== undefined && (
                                        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded border border-zinc-100 dark:border-zinc-800">
                                          <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">
                                            Quiz 1
                                          </span>
                                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            {course.scores.quiz1.score} / {course.scores.quiz1.max ?? 100}
                                          </span>
                                        </div>
                                      )}
                                      {course.scores?.quiz2?.score !== undefined && (
                                        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded border border-zinc-100 dark:border-zinc-800">
                                          <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">
                                            Quiz 2
                                          </span>
                                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            {course.scores.quiz2.score} / {course.scores.quiz2.max ?? 100}
                                          </span>
                                        </div>
                                      )}
                                      {course.scores?.endTerm?.score !== undefined && (
                                        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded border border-zinc-100 dark:border-zinc-800">
                                          <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">
                                            End Term
                                          </span>
                                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            {course.scores.endTerm.score} / {course.scores.endTerm.max ?? 100}
                                          </span>
                                        </div>
                                      )}
                                      {course.scores?.oppe1?.score !== undefined && (
                                        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded border border-zinc-100 dark:border-zinc-800">
                                          <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">
                                            OPPE 1
                                          </span>
                                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            {course.scores.oppe1.score} / {course.scores.oppe1.max ?? 100}
                                          </span>
                                        </div>
                                      )}
                                      {course.scores?.oppe2?.score !== undefined && (
                                        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded border border-zinc-100 dark:border-zinc-800">
                                          <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">
                                            OPPE 2
                                          </span>
                                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            {course.scores.oppe2.score} / {course.scores.oppe2.max ?? 100}
                                          </span>
                                        </div>
                                      )}
                                      {!course.scores?.quiz1 &&
                                        !course.scores?.quiz2 &&
                                        !course.scores?.endTerm &&
                                        !course.scores?.oppe1 && (
                                          <div className="text-zinc-400 text-xs italic col-span-2">
                                            Raw component marks not logged.
                                          </div>
                                        )}
                                    </>
                                  ) : (
                                    <>
                                      {course.scores?.project?.score !== undefined && (
                                        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded border border-zinc-100 dark:border-zinc-800">
                                          <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">
                                            Project
                                          </span>
                                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            {course.scores.project.score} / {course.scores.project.max ?? 100}
                                          </span>
                                        </div>
                                      )}
                                      {course.scores?.viva?.score !== undefined && (
                                        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded border border-zinc-100 dark:border-zinc-800">
                                          <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">
                                            Viva
                                          </span>
                                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            {course.scores.viva.score} / {course.scores.viva.max ?? 100}
                                          </span>
                                        </div>
                                      )}
                                      {!course.scores?.project && !course.scores?.viva && (
                                        <div className="text-zinc-400 text-xs italic col-span-2">
                                          Raw component marks not logged.
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Term Confirmation Modal */}
      {termToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => {
            if (!isDeleting) setTermToDelete(null);
          }}
        >
          <div
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-left"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-term-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 id="delete-term-title" className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Delete Historical Term?
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {termToDelete.termName}
                  </strong>{' '}
                  and all of its archived courses from your history?
                </p>
              </div>
            </div>

            <div className="text-xs bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
              This action cannot be undone. The archived term and all associated final grades and marks will be removed.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setTermToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTerm}
                disabled={isDeleting}
                id="confirm-delete-term-btn"
                className="px-4 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Term'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Course Confirmation Modal */}
      {courseToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => {
            if (!isDeleting) setCourseToDelete(null);
          }}
        >
          <div
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-left"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-course-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 id="delete-course-title" className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Delete Course Record?
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Are you sure you want to permanently remove{' '}
                  <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {courseToDelete.course.name}
                  </strong>{' '}
                  from this historical term?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setCourseToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCourse}
                disabled={isDeleting}
                id="confirm-delete-course-btn"
                className="px-4 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Course'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Past Term / Course Modal */}
      <AddPastTermModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        calendarTerms={calendarTerms}
        onTermAdded={handleTermAdded}
      />
    </div>
  );
};
