import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSaveStatus } from '../context/SaveStatusContext';
import {
  subscribeUserTerms,
  subscribeUserCourses,
  subscribeCalendarTerms,
  toggleWeeklyChecklist,
  updateCourseScoreField,
} from '../lib/firestoreService';
import { UserTerm, UserCourse, CalendarTerm, CourseScores, ComponentScore } from '../types';
import { calculateTermWeek } from '../lib/dateUtils';
import { ChecklistIconToggle } from './ChecklistIconToggle';
import { Check, Edit3, Award, FileText, ChevronDown, ChevronUp } from 'lucide-react';

export const MyTermView: React.FC = () => {
  const { currentUser } = useAuth();
  const { triggerSaving, triggerSaved, triggerError } = useSaveStatus();

  const [activeTerm, setActiveTerm] = useState<UserTerm | null>(null);
  const [courses, setCourses] = useState<UserCourse[]>([]);
  const [calendarTerms, setCalendarTerms] = useState<CalendarTerm[]>([]);
  const [expandedScoresCourseId, setExpandedScoresCourseId] = useState<string | null>(null);

  // Subscribe to user terms
  useEffect(() => {
    if (!currentUser) return;
    const unsubTerms = subscribeUserTerms(currentUser.uid, (terms) => {
      const active = terms.find((t) => t.isActive);
      setActiveTerm(active || null);
    });
    return () => unsubTerms();
  }, [currentUser]);

  // Subscribe to calendar terms
  useEffect(() => {
    const unsubCal = subscribeCalendarTerms((terms) => {
      setCalendarTerms(terms);
    });
    return () => unsubCal();
  }, []);

  // Subscribe to courses of active term
  useEffect(() => {
    if (!currentUser || !activeTerm) {
      setCourses([]);
      return;
    }
    const unsubCourses = subscribeUserCourses(currentUser.uid, activeTerm.termId, (cList) => {
      setCourses(cList);
      if (cList.length > 0 && !expandedScoresCourseId) {
        setExpandedScoresCourseId(cList[0].id);
      }
    });
    return () => unsubCourses();
  }, [currentUser, activeTerm]);

  const matchedCalendar = calendarTerms.find((c) => c.termId === activeTerm?.calendarId);
  const weekInfo = calculateTermWeek(matchedCalendar?.startDate);

  // Handle weekly toggle
  const handleToggle = async (
    courseId: string,
    weekNum: number,
    field: 'assignmentSubmitted' | 'practiceQuestionsCompleted' | 'notesCreated',
    currentVal: boolean
  ) => {
    if (!currentUser || !activeTerm) return;
    triggerSaving();
    try {
      await toggleWeeklyChecklist(
        currentUser.uid,
        activeTerm.termId,
        courseId,
        `week${weekNum}`,
        field,
        currentVal
      );
      triggerSaved();
    } catch (err) {
      triggerError('Failed to save progress');
      console.error(err);
    }
  };

  // Handle Score Edit
  const handleScoreChange = async (
    course: UserCourse,
    componentKey: keyof CourseScores,
    field: 'score' | 'max',
    val: string
  ) => {
    if (!currentUser || !activeTerm) return;
    const numVal = parseFloat(val) || 0;

    const currentComp = course.scores?.[componentKey] || { score: 0, max: 100 };
    const updatedScores: CourseScores = {
      ...course.scores,
      [componentKey]: {
        ...currentComp,
        [field]: numVal,
      },
    };

    triggerSaving();
    try {
      await updateCourseScoreField(currentUser.uid, activeTerm.termId, course.id, updatedScores);
      triggerSaved();
    } catch (err) {
      triggerError('Failed to save score');
      console.error(err);
    }
  };

  if (!activeTerm) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <div className="bg-white border border-zinc-200 rounded-xl p-8 max-w-md mx-auto">
          <h2 className="text-lg font-bold text-zinc-900">No Active Term</h2>
          <p className="text-sm text-zinc-500 mt-2">
            You do not currently have an active term enrolled. Please visit &quot;Start New Term&quot; to pick your semester calendar and courses.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Active Term View
              </span>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {weekInfo.displayText}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              {activeTerm.termName} Grid
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Full 12-week study tracker with independent columns per week. Tap checkboxes to update your progress.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-zinc-500 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200">
            <span className="font-semibold text-zinc-700">Icons Legend:</span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                A
              </span>
              Assignment
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                P
              </span>
              Practice
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                N
              </span>
              Notes
            </span>
          </div>
        </div>
      </div>

      {/* Week-by-Week Interactive Grid */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900">
            Week 1 – Week 12 Study Completion Grid
          </h3>
          <span className="text-xs text-zinc-500">
            Current: <strong className="text-zinc-900">Week {weekInfo.weekNumber}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/50">
                <th className="sticky left-0 bg-zinc-50 z-10 px-4 py-3 font-semibold text-zinc-700 w-64 border-r border-zinc-200">
                  Course Name
                </th>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
                  const isCurrent = w === weekInfo.weekNumber;
                  return (
                    <th
                      key={w}
                      className={`px-2 py-2.5 text-center font-semibold transition-colors ${
                        isCurrent
                          ? 'bg-zinc-900 text-white font-bold'
                          : 'text-zinc-600 border-r border-zinc-100'
                      }`}
                    >
                      W{w}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-zinc-50/40 transition-colors">
                  {/* Course Info Column */}
                  <td className="sticky left-0 bg-white hover:bg-zinc-50/40 z-10 px-4 py-3 border-r border-zinc-200">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: course.color }}
                      />
                      <div>
                        <div className="font-semibold text-zinc-900 line-clamp-1">
                          {course.name}
                        </div>
                        <div className="text-[10px] text-zinc-400 capitalize">
                          {course.assessmentType} course
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 12 Week Cells */}
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
                    const isCurrent = w === weekInfo.weekNumber;
                    const weekKey = `week${w}`;
                    const prog = course.weeklyProgress?.[weekKey] || {
                      assignmentSubmitted: false,
                      practiceQuestionsCompleted: false,
                      notesCreated: false,
                    };

                    return (
                      <td
                        key={w}
                        className={`p-1.5 text-center border-r border-zinc-100 ${
                          isCurrent ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          {/* Assignment */}
                          <button
                            id={`grid-${course.id}-w${w}-asgn`}
                            onClick={() =>
                              handleToggle(
                                course.id,
                                w,
                                'assignmentSubmitted',
                                prog.assignmentSubmitted
                              )
                            }
                            title={`W${w} Assignment: ${prog.assignmentSubmitted ? 'Done' : 'Not done'}`}
                            className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-all ${
                              prog.assignmentSubmitted
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                            }`}
                          >
                            A
                          </button>

                          {/* Practice Questions */}
                          <button
                            id={`grid-${course.id}-w${w}-prac`}
                            onClick={() =>
                              handleToggle(
                                course.id,
                                w,
                                'practiceQuestionsCompleted',
                                prog.practiceQuestionsCompleted
                              )
                            }
                            title={`W${w} Practice Questions: ${prog.practiceQuestionsCompleted ? 'Done' : 'Not done'}`}
                            className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-all ${
                              prog.practiceQuestionsCompleted
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                            }`}
                          >
                            P
                          </button>

                          {/* Notes */}
                          <button
                            id={`grid-${course.id}-w${w}-note`}
                            onClick={() =>
                              handleToggle(
                                course.id,
                                w,
                                'notesCreated',
                                prog.notesCreated
                              )
                            }
                            title={`W${w} Notes Created: ${prog.notesCreated ? 'Done' : 'Not done'}`}
                            className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-all ${
                              prog.notesCreated
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                            }`}
                          >
                            N
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Component Scores Section */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-zinc-700" />
            <span>Active Term Assessment &amp; Component Scores</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Log your official quiz, OPPE, project, and end-term marks. Only components applicable to the catalog entry are rendered.
          </p>
        </div>

        <div className="space-y-3">
          {courses.map((course) => {
            const isExpanded = expandedScoresCourseId === course.id;
            return (
              <div
                key={course.id}
                className="border border-zinc-200 rounded-lg overflow-hidden transition-all"
              >
                <div
                  onClick={() => setExpandedScoresCourseId(isExpanded ? null : course.id)}
                  className="p-4 bg-zinc-50/70 hover:bg-zinc-100/70 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: course.color }}
                    />
                    <span className="font-semibold text-zinc-900 text-sm">{course.name}</span>
                    <span className="text-xs text-zinc-400">
                      ({course.assessmentType === 'project' ? 'Project' : 'Exam'})
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                  )}
                </div>

                {isExpanded && (
                  <div className="p-5 bg-white border-t border-zinc-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {/* EXAM TYPE COMPONENTS */}
                    {course.assessmentType === 'exam' && (
                      <>
                        {/* Quiz 1 */}
                        {course.examComponents?.quiz1 && (
                          <ScoreInputCard
                            label="Quiz 1"
                            score={course.scores?.quiz1?.score}
                            max={course.scores?.quiz1?.max || 100}
                            onScoreChange={(val) =>
                              handleScoreChange(course, 'quiz1', 'score', val)
                            }
                            onMaxChange={(val) =>
                              handleScoreChange(course, 'quiz1', 'max', val)
                            }
                          />
                        )}

                        {/* Quiz 2 */}
                        {course.examComponents?.quiz2 && (
                          <ScoreInputCard
                            label="Quiz 2"
                            score={course.scores?.quiz2?.score}
                            max={course.scores?.quiz2?.max || 100}
                            onScoreChange={(val) =>
                              handleScoreChange(course, 'quiz2', 'score', val)
                            }
                            onMaxChange={(val) =>
                              handleScoreChange(course, 'quiz2', 'max', val)
                            }
                          />
                        )}

                        {/* End Term */}
                        {course.examComponents?.endTerm && (
                          <ScoreInputCard
                            label="End Term Exam"
                            score={course.scores?.endTerm?.score}
                            max={course.scores?.endTerm?.max || 100}
                            onScoreChange={(val) =>
                              handleScoreChange(course, 'endTerm', 'score', val)
                            }
                            onMaxChange={(val) =>
                              handleScoreChange(course, 'endTerm', 'max', val)
                            }
                          />
                        )}

                        {/* OPPE 1 (if oppeCount >= 1) */}
                        {(course.examComponents?.oppeCount ?? 0) >= 1 && (
                          <ScoreInputCard
                            label="OPPE 1 (Programming)"
                            score={course.scores?.oppe1?.score}
                            max={course.scores?.oppe1?.max || 100}
                            onScoreChange={(val) =>
                              handleScoreChange(course, 'oppe1', 'score', val)
                            }
                            onMaxChange={(val) =>
                              handleScoreChange(course, 'oppe1', 'max', val)
                            }
                          />
                        )}

                        {/* OPPE 2 (if oppeCount == 2) */}
                        {(course.examComponents?.oppeCount ?? 0) === 2 && (
                          <ScoreInputCard
                            label="OPPE 2 (Programming)"
                            score={course.scores?.oppe2?.score}
                            max={course.scores?.oppe2?.max || 100}
                            onScoreChange={(val) =>
                              handleScoreChange(course, 'oppe2', 'score', val)
                            }
                            onMaxChange={(val) =>
                              handleScoreChange(course, 'oppe2', 'max', val)
                            }
                          />
                        )}
                      </>
                    )}

                    {/* PROJECT TYPE COMPONENTS */}
                    {course.assessmentType === 'project' && (
                      <>
                        <ScoreInputCard
                          label="Project Submission"
                          score={course.scores?.project?.score}
                          max={course.scores?.project?.max || 100}
                          onScoreChange={(val) =>
                            handleScoreChange(course, 'project', 'score', val)
                          }
                          onMaxChange={(val) =>
                            handleScoreChange(course, 'project', 'max', val)
                          }
                        />

                        {course.projectComponents?.hasViva && (
                          <ScoreInputCard
                            label="Viva Voce"
                            score={course.scores?.viva?.score}
                            max={course.scores?.viva?.max || 100}
                            onScoreChange={(val) =>
                              handleScoreChange(course, 'viva', 'score', val)
                            }
                            onMaxChange={(val) =>
                              handleScoreChange(course, 'viva', 'max', val)
                            }
                          />
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface ScoreInputCardProps {
  label: string;
  score?: number;
  max: number;
  onScoreChange: (val: string) => void;
  onMaxChange: (val: string) => void;
}

const ScoreInputCard: React.FC<ScoreInputCardProps> = ({
  label,
  score,
  max,
  onScoreChange,
  onMaxChange,
}) => {
  return (
    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1.5">
      <div className="text-xs font-semibold text-zinc-700">{label}</div>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-[10px] text-zinc-400 block mb-0.5">Marks</label>
          <input
            type="number"
            min={0}
            max={max}
            step={0.5}
            defaultValue={score !== undefined ? score : ''}
            onBlur={(e) => onScoreChange(e.target.value)}
            placeholder="Score"
            className="w-full px-2 py-1 text-xs border border-zinc-300 rounded bg-white font-medium text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-zinc-800"
          />
        </div>
        <span className="text-zinc-400 text-xs self-end pb-1.5">/</span>
        <div className="w-16">
          <label className="text-[10px] text-zinc-400 block mb-0.5">Total</label>
          <input
            type="number"
            min={1}
            max={100}
            defaultValue={max || 100}
            onBlur={(e) => onMaxChange(e.target.value)}
            className="w-full px-2 py-1 text-xs border border-zinc-300 rounded bg-white text-zinc-600 focus:outline-hidden focus:ring-1 focus:ring-zinc-800"
          />
        </div>
      </div>
    </div>
  );
};
