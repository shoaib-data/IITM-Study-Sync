import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeUserTerms } from '../lib/firestoreService';
import { UserTerm, UserCourse } from '../types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Clock, ChevronDown, ChevronUp, Award, CheckCircle2, History } from 'lucide-react';

export const CourseHistoryView: React.FC = () => {
  const { currentUser } = useAuth();
  const [archivedTerms, setArchivedTerms] = useState<UserTerm[]>([]);
  const [termCoursesMap, setTermCoursesMap] = useState<Record<string, UserCourse[]>>({});
  const [expandedTermId, setExpandedTermId] = useState<string | null>(null);
  const [loadingCourses, setLoadingCourses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeUserTerms(currentUser.uid, (allTerms) => {
      const archived = allTerms.filter((t) => !t.isActive);
      setArchivedTerms(archived);
      if (archived.length > 0 && !expandedTermId) {
        setExpandedTermId(archived[0].termId);
      }
    });
    return () => unsub();
  }, [currentUser]);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Course &amp; Term History
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Read-only archive of previous academic terms. Previous terms are automatically archived when starting a new term.
            </p>
          </div>
        </div>
      </div>

      {archivedTerms.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-10 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">No Archived Terms Yet</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            When you complete your semester and start a new term cycle, your active term will be archived here as a permanent, read-only record.
          </p>
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
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{term.termName}</h3>
                      <div className="text-xs text-zinc-400">Archived Term Record</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full">
                      {courses.length} courses
                    </span>
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
                          // Calculate completion
                          let doneChecklists = 0;
                          if (course.weeklyProgress) {
                            Object.values(course.weeklyProgress).forEach((wp) => {
                              const check = wp as { assignmentSubmitted?: boolean; practiceQuestionsCompleted?: boolean; notesCreated?: boolean };
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

                              <div className="pl-2">
                                <div className="text-[10px] font-semibold uppercase text-zinc-400">
                                  {course.level}
                                </div>
                                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{course.name}</h4>
                                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                  Weekly Tasks Completed: {doneChecklists} / 36
                                </div>
                              </div>

                              {/* Scores breakdown */}
                              <div className="pl-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
                                <div className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                                  <Award className="w-3.5 h-3.5 text-zinc-500" />
                                  <span>Final Component Scores (Read-Only)</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {course.assessmentType === 'exam' ? (
                                    <>
                                      {course.examComponents?.quiz1 && (
                                        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded border border-zinc-100 dark:border-zinc-800">
                                          <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">Quiz 1</span>
                                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            {course.scores?.quiz1?.score ?? '—'} / {course.scores?.quiz1?.max ?? 100}
                                          </span>
                                        </div>
                                      )}
                                      {course.examComponents?.quiz2 && (
                                        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded border border-zinc-100 dark:border-zinc-800">
                                          <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">Quiz 2</span>
                                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            {course.scores?.quiz2?.score ?? '—'} / {course.scores?.quiz2?.max ?? 100}
                                          </span>
                                        </div>
                                      )}
                                      {course.examComponents?.endTerm && (
                                        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded border border-zinc-100 dark:border-zinc-800">
                                          <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">End Term</span>
                                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            {course.scores?.endTerm?.score ?? '—'} / {course.scores?.endTerm?.max ?? 100}
                                          </span>
                                        </div>
                                      )}
                                      {(course.examComponents?.oppeCount ?? 0) >= 1 && (
                                        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded border border-zinc-100 dark:border-zinc-800">
                                          <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">OPPE 1</span>
                                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            {course.scores?.oppe1?.score ?? '—'} / {course.scores?.oppe1?.max ?? 100}
                                          </span>
                                        </div>
                                      )}
                                      {(course.examComponents?.oppeCount ?? 0) === 2 && (
                                        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded border border-zinc-100 dark:border-zinc-800">
                                          <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">OPPE 2</span>
                                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            {course.scores?.oppe2?.score ?? '—'} / {course.scores?.oppe2?.max ?? 100}
                                          </span>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded border border-zinc-100 dark:border-zinc-800">
                                        <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">Project</span>
                                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                          {course.scores?.project?.score ?? '—'} / {course.scores?.project?.max ?? 100}
                                        </span>
                                      </div>
                                      {course.projectComponents?.hasViva && (
                                        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded border border-zinc-100 dark:border-zinc-800">
                                          <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">Viva</span>
                                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            {course.scores?.viva?.score ?? '—'} / {course.scores?.viva?.max ?? 100}
                                          </span>
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
    </div>
  );
};
