import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSaveStatus } from '../context/SaveStatusContext';
import {
  subscribeCourseCatalog,
  backfillPastTerm,
  BackfillCourseInput,
} from '../lib/firestoreService';
import { CalendarTerm, CourseCatalogItem, FinalGrade, UserLevel, AssessmentType } from '../types';
import { USER_LEVELS } from '../lib/constants';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  BookOpen,
  Award,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface AddPastTermModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendarTerms: CalendarTerm[];
  onTermAdded: () => void;
}

interface DraftCourse {
  tempId: string;
  source: 'catalog' | 'custom';
  catalogCourseId: string;
  name: string;
  level: UserLevel;
  assessmentType: AssessmentType;
  finalGrade: FinalGrade;
  showScores: boolean;
  scores: {
    quiz1?: number;
    quiz2?: number;
    endTerm?: number;
    oppe1?: number;
    oppe2?: number;
    project?: number;
    viva?: number;
  };
}

const GRADE_OPTIONS: FinalGrade[] = ['S', 'A', 'B', 'C', 'D', 'E', 'I'];

export const AddPastTermModal: React.FC<AddPastTermModalProps> = ({
  isOpen,
  onClose,
  calendarTerms,
  onTermAdded,
}) => {
  const { currentUser, userProfile } = useAuth();
  const { triggerSaving, triggerSaved, triggerError } = useSaveStatus();

  const [catalog, setCatalog] = useState<CourseCatalogItem[]>([]);
  const [termMode, setTermMode] = useState<'calendar' | 'custom'>('calendar');
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [customTermName, setCustomTermName] = useState<string>('');

  const [courses, setCourses] = useState<DraftCourse[]>([
    {
      tempId: 'draft-1',
      source: 'catalog',
      catalogCourseId: '',
      name: '',
      level: userProfile?.level || 'Foundation',
      assessmentType: 'exam',
      finalGrade: 'S',
      showScores: false,
      scores: {},
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeCourseCatalog(setCatalog);
    return () => unsub();
  }, []);

  // Set default calendar if available
  useEffect(() => {
    if (calendarTerms.length > 0 && !selectedCalendarId) {
      setSelectedCalendarId(calendarTerms[0].termId);
    }
  }, [calendarTerms, selectedCalendarId]);

  if (!isOpen) return null;

  const handleAddCourse = () => {
    setCourses((prev) => [
      ...prev,
      {
        tempId: `draft-${Date.now()}-${Math.random()}`,
        source: 'catalog',
        catalogCourseId: '',
        name: '',
        level: userProfile?.level || 'Foundation',
        assessmentType: 'exam',
        finalGrade: 'A',
        showScores: false,
        scores: {},
      },
    ]);
  };

  const handleRemoveCourse = (index: number) => {
    if (courses.length <= 1) return;
    setCourses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCatalogSelect = (index: number, catId: string) => {
    const found = catalog.find((c) => c.id === catId);
    if (!found) return;

    setCourses((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        catalogCourseId: found.id,
        name: found.name,
        level: found.level,
        assessmentType: found.assessmentType,
      };
      return copy;
    });
  };

  const updateCourseField = (index: number, field: keyof DraftCourse, value: any) => {
    setCourses((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const updateScoreField = (index: number, scoreKey: string, val: string) => {
    const num = val === '' ? undefined : parseFloat(val);
    setCourses((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        scores: {
          ...copy[index].scores,
          [scoreKey]: num,
        },
      };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setErrorMsg(null);

    // Compute Term Name
    let finalTermName = '';
    let finalCalendarId: string | undefined = undefined;

    if (termMode === 'calendar') {
      const matched = calendarTerms.find((c) => c.termId === selectedCalendarId);
      if (!matched) {
        setErrorMsg('Please select a valid calendar term.');
        return;
      }
      finalTermName = `${matched.cycleType} ${matched.termId.replace(/^[A-Za-z]+/, '')} Term`;
      finalCalendarId = matched.termId;
    } else {
      if (!customTermName.trim()) {
        setErrorMsg('Please enter a custom term label (e.g. "Jan 2025 Term").');
        return;
      }
      finalTermName = customTermName.trim();
    }

    // Validate courses
    for (let i = 0; i < courses.length; i++) {
      const c = courses[i];
      if (!c.name.trim()) {
        setErrorMsg(`Please select or enter a course name for Course #${i + 1}.`);
        return;
      }
      if (!c.finalGrade) {
        setErrorMsg(`Please select a Final Grade for "${c.name}".`);
        return;
      }
    }

    setIsSubmitting(true);
    triggerSaving();

    try {
      const preparedCourses: BackfillCourseInput[] = courses.map((c) => {
        const catItem = catalog.find((item) => item.id === c.catalogCourseId);
        const itemScores: any = {};

        if (c.scores.quiz1 !== undefined) itemScores.quiz1 = { score: c.scores.quiz1, max: 100 };
        if (c.scores.quiz2 !== undefined) itemScores.quiz2 = { score: c.scores.quiz2, max: 100 };
        if (c.scores.endTerm !== undefined) itemScores.endTerm = { score: c.scores.endTerm, max: 100 };
        if (c.scores.oppe1 !== undefined) itemScores.oppe1 = { score: c.scores.oppe1, max: 100 };
        if (c.scores.oppe2 !== undefined) itemScores.oppe2 = { score: c.scores.oppe2, max: 100 };
        if (c.scores.project !== undefined) itemScores.project = { score: c.scores.project, max: 100 };
        if (c.scores.viva !== undefined) itemScores.viva = { score: c.scores.viva, max: 100 };

        return {
          name: c.name.trim(),
          courseId: c.catalogCourseId || undefined,
          level: c.level,
          assessmentType: c.assessmentType,
          finalGrade: c.finalGrade,
          scores: Object.keys(itemScores).length > 0 ? itemScores : undefined,
          examComponents: catItem?.examComponents || { quiz1: true, quiz2: true, endTerm: true, oppeCount: 0 },
          projectComponents: catItem?.projectComponents || { hasProjectSubmission: true, hasViva: true },
        };
      });

      await backfillPastTerm(currentUser.uid, {
        termName: finalTermName,
        calendarId: finalCalendarId,
        courses: preparedCourses,
      });

      triggerSaved();
      onTermAdded();
      onClose();
    } catch (err) {
      triggerError('Failed to save past term record');
      setErrorMsg(err instanceof Error ? err.message : 'Error creating historical record');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getGradeButtonColor = (g: FinalGrade, isSelected: boolean) => {
    if (!isSelected) {
      return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700';
    }
    switch (g) {
      case 'S':
      case 'A':
        return 'bg-emerald-600 text-white font-bold shadow-xs ring-2 ring-emerald-500/50';
      case 'B':
      case 'C':
        return 'bg-amber-600 text-white font-bold shadow-xs ring-2 ring-amber-500/50';
      case 'D':
      case 'E':
      case 'I':
        return 'bg-rose-600 text-white font-bold shadow-xs ring-2 ring-rose-500/50';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-past-term-title"
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-850/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 id="add-past-term-title" className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Add Past Course / Term History
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Backfill completed terms and final grades from previous semesters before using this app
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {errorMsg && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Term Label Specification */}
          <div className="bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                1. Term Identification
              </label>
              <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5 bg-white dark:bg-zinc-900 text-xs">
                <button
                  type="button"
                  onClick={() => setTermMode('calendar')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    termMode === 'calendar'
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  Pick Calendar Cycle
                </button>
                <button
                  type="button"
                  onClick={() => setTermMode('custom')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    termMode === 'custom'
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  Type Custom Label
                </button>
              </div>
            </div>

            {termMode === 'calendar' ? (
              <div className="space-y-1">
                <label className="text-xs text-zinc-500 dark:text-zinc-400">
                  Select Past Cycle from Academic Calendar:
                </label>
                <select
                  id="past-term-calendar-select"
                  value={selectedCalendarId}
                  onChange={(e) => setSelectedCalendarId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-500 focus:outline-hidden"
                >
                  {calendarTerms.map((cal) => (
                    <option key={cal.termId} value={cal.termId}>
                      {cal.cycleType} {cal.termId.replace(/^[A-Za-z]+/, '')} Term ({cal.termId})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs text-zinc-500 dark:text-zinc-400">
                  Enter Term Label (e.g. &quot;Jan 2025 Term&quot;, &quot;Sep 2023 Term&quot;):
                </label>
                <input
                  type="text"
                  id="past-term-custom-input"
                  placeholder="e.g. Jan 2025 Term"
                  value={customTermName}
                  onChange={(e) => setCustomTermName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-500 focus:outline-hidden"
                />
              </div>
            )}
          </div>

          {/* Section 2: Courses and Final Grades */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                2. Courses &amp; Final Grades
              </label>
              <button
                type="button"
                onClick={handleAddCourse}
                id="add-course-to-past-term-btn"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Course</span>
              </button>
            </div>

            <div className="space-y-4">
              {courses.map((course, idx) => (
                <div
                  key={course.tempId}
                  className="bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 rounded-xl p-4 space-y-3 relative shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-zinc-400" />
                      <span>Course #{idx + 1}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      <div className="inline-flex rounded-md border border-zinc-200 dark:border-zinc-700 p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => updateCourseField(idx, 'source', 'catalog')}
                          className={`px-2 py-0.5 rounded transition-all ${
                            course.source === 'catalog'
                              ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold'
                              : 'text-zinc-500'
                          }`}
                        >
                          From Catalog
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCourseField(idx, 'source', 'custom')}
                          className={`px-2 py-0.5 rounded transition-all ${
                            course.source === 'custom'
                              ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold'
                              : 'text-zinc-500'
                          }`}
                        >
                          Custom Name
                        </button>
                      </div>

                      {courses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCourse(idx)}
                          className="p-1 text-zinc-400 hover:text-rose-500 transition-colors rounded"
                          title="Remove course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Course Name Selection or Input */}
                  {course.source === 'catalog' ? (
                    <div>
                      <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
                        Select Course from Catalog:
                      </label>
                      <select
                        value={course.catalogCourseId}
                        onChange={(e) => handleCatalogSelect(idx, e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-500"
                      >
                        <option value="">-- Choose a Catalog Course --</option>
                        {catalog.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            [{cat.level}] {cat.name} ({cat.assessmentType})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
                          Course Title:
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Deep Learning Practice"
                          value={course.name}
                          onChange={(e) => updateCourseField(idx, 'name', e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
                          Level:
                        </label>
                        <select
                          value={course.level}
                          onChange={(e) => updateCourseField(idx, 'level', e.target.value as UserLevel)}
                          className="w-full px-2 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-500"
                        >
                          {USER_LEVELS.map((lvl) => (
                            <option key={lvl} value={lvl}>
                              {lvl}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Headline Field: Final Grade (S / A / B / C / D / E / I) */}
                  <div className="bg-zinc-50 dark:bg-zinc-800/80 p-3 rounded-lg border border-zinc-100 dark:border-zinc-700/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span>Final Grade (Headline Metric)</span>
                      </label>
                      <span className="text-[10px] text-zinc-400 font-medium">Primary CGPA-Style Record</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {GRADE_OPTIONS.map((g) => {
                        const isSelected = course.finalGrade === g;
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => updateCourseField(idx, 'finalGrade', g)}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${getGradeButtonColor(
                              g,
                              isSelected
                            )}`}
                          >
                            Grade {g}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Optional Marks Accordion Toggle */}
                  <div>
                    <button
                      type="button"
                      onClick={() => updateCourseField(idx, 'showScores', !course.showScores)}
                      className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:underline"
                    >
                      {course.showScores ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {course.showScores
                          ? 'Hide raw marks'
                          : 'Optional: Enter raw marks (Quiz, End Term, OPPE / Project)'}
                      </span>
                    </button>

                    {course.showScores && (
                      <div className="mt-2.5 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-750 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {course.assessmentType === 'exam' ? (
                          <>
                            <div>
                              <label className="text-[10px] text-zinc-400 block mb-0.5">Quiz 1 (/100)</label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                placeholder="—"
                                value={course.scores.quiz1 !== undefined ? course.scores.quiz1 : ''}
                                onChange={(e) => updateScoreField(idx, 'quiz1', e.target.value)}
                                className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-400 block mb-0.5">Quiz 2 (/100)</label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                placeholder="—"
                                value={course.scores.quiz2 !== undefined ? course.scores.quiz2 : ''}
                                onChange={(e) => updateScoreField(idx, 'quiz2', e.target.value)}
                                className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-400 block mb-0.5">End Term (/100)</label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                placeholder="—"
                                value={course.scores.endTerm !== undefined ? course.scores.endTerm : ''}
                                onChange={(e) => updateScoreField(idx, 'endTerm', e.target.value)}
                                className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-400 block mb-0.5">OPPE (/100)</label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                placeholder="—"
                                value={course.scores.oppe1 !== undefined ? course.scores.oppe1 : ''}
                                onChange={(e) => updateScoreField(idx, 'oppe1', e.target.value)}
                                className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <label className="text-[10px] text-zinc-400 block mb-0.5">Project (/100)</label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                placeholder="—"
                                value={course.scores.project !== undefined ? course.scores.project : ''}
                                onChange={(e) => updateScoreField(idx, 'project', e.target.value)}
                                className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-400 block mb-0.5">Viva (/100)</label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                placeholder="—"
                                value={course.scores.viva !== undefined ? course.scores.viva : ''}
                                onChange={(e) => updateScoreField(idx, 'viva', e.target.value)}
                                className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Adding {courses.length} historical course{courses.length === 1 ? '' : 's'} as read-only archive
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                id="submit-backfill-term-btn"
                className="px-5 py-2 text-xs font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-white rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving Past Record...' : 'Save Past Term Record'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
