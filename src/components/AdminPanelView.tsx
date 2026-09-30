import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSaveStatus } from '../context/SaveStatusContext';
import {
  subscribeCourseCatalog,
  addCatalogCourse,
  updateCatalogCourse,
  deleteCatalogCourse,
  subscribeCalendarTerms,
  updateCalendarTermDoc,
  triggerCalendarSync,
} from '../lib/firestoreService';
import { CourseCatalogItem, CalendarTerm, UserLevel, AssessmentType } from '../types';
import { USER_LEVELS } from '../lib/constants';
import { formatDateString } from '../lib/dateUtils';
import { TrafficViewerView } from './TrafficViewerView';
import {
  ShieldCheck,
  BookOpen,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Check,
  AlertCircle,
  X,
  Activity,
} from 'lucide-react';

export const AdminPanelView: React.FC = () => {
  const { userProfile } = useAuth();
  const { triggerSaving, triggerSaved, triggerError } = useSaveStatus();

  const [activeTab, setActiveTab] = useState<'courses' | 'calendar' | 'traffic'>('courses');
  const [courses, setCourses] = useState<CourseCatalogItem[]>([]);
  const [calendarTerms, setCalendarTerms] = useState<CalendarTerm[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Course Add/Edit Form Modal State
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseFormName, setCourseFormName] = useState('');
  const [courseFormLevel, setCourseFormLevel] = useState<UserLevel>('Foundation');
  const [courseFormAssessmentType, setCourseFormAssessmentType] = useState<AssessmentType>('exam');
  const [examQuiz1, setExamQuiz1] = useState(true);
  const [examQuiz2, setExamQuiz2] = useState(true);
  const [examEndTerm, setExamEndTerm] = useState(true);
  const [examOppeCount, setExamOppeCount] = useState<0 | 1 | 2>(0);
  const [projectHasViva, setProjectHasViva] = useState(true);

  // Calendar inline edit state
  const [editingCalendarTerm, setEditingCalendarTerm] = useState<CalendarTerm | null>(null);

  useEffect(() => {
    const unsubCourses = subscribeCourseCatalog(setCourses);
    const unsubCalendar = subscribeCalendarTerms(setCalendarTerms);
    return () => {
      unsubCourses();
      unsubCalendar();
    };
  }, []);

  if (!userProfile?.isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-8 max-w-md mx-auto space-y-2">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h2 className="text-base font-bold text-rose-900">Admin Access Required</h2>
          <p className="text-xs text-rose-700">
            This panel is restricted exclusively to the verified administrator account.
          </p>
        </div>
      </div>
    );
  }

  const openAddCourseModal = () => {
    setEditingCourseId(null);
    setCourseFormName('');
    setCourseFormLevel('Foundation');
    setCourseFormAssessmentType('exam');
    setExamQuiz1(true);
    setExamQuiz2(true);
    setExamEndTerm(true);
    setExamOppeCount(0);
    setProjectHasViva(true);
    setIsCourseModalOpen(true);
  };

  const openEditCourseModal = (course: CourseCatalogItem) => {
    setEditingCourseId(course.id);
    setCourseFormName(course.name);
    setCourseFormLevel(course.level);
    setCourseFormAssessmentType(course.assessmentType);
    if (course.assessmentType === 'exam' && course.examComponents) {
      setExamQuiz1(course.examComponents.quiz1);
      setExamQuiz2(course.examComponents.quiz2);
      setExamEndTerm(course.examComponents.endTerm);
      setExamOppeCount(course.examComponents.oppeCount);
    } else {
      setExamQuiz1(true);
      setExamQuiz2(true);
      setExamEndTerm(true);
      setExamOppeCount(0);
    }
    if (course.assessmentType === 'project' && course.projectComponents) {
      setProjectHasViva(!!course.projectComponents.hasViva);
    } else {
      setProjectHasViva(true);
    }
    setIsCourseModalOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseFormName.trim()) return;

    triggerSaving();
    try {
      const courseData: Omit<CourseCatalogItem, 'id'> = {
        name: courseFormName.trim(),
        level: courseFormLevel,
        assessmentType: courseFormAssessmentType,
      };

      if (courseFormAssessmentType === 'exam') {
        courseData.examComponents = {
          quiz1: examQuiz1,
          quiz2: examQuiz2,
          endTerm: examEndTerm,
          oppeCount: examOppeCount,
        };
      } else {
        courseData.projectComponents = {
          hasProjectSubmission: true,
          hasViva: projectHasViva,
        };
      }

      if (editingCourseId) {
        await updateCatalogCourse(editingCourseId, courseData);
      } else {
        await addCatalogCourse(courseData);
      }

      triggerSaved();
      setIsCourseModalOpen(false);
    } catch (err) {
      triggerError('Failed to save course');
      console.error(err);
    }
  };

  const handleDeleteCourse = async (courseId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from the global course catalog?`)) {
      return;
    }
    triggerSaving();
    try {
      await deleteCatalogCourse(courseId);
      triggerSaved();
    } catch (err) {
      triggerError('Failed to delete course');
      console.error(err);
    }
  };

  const handleSyncCalendar = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    triggerSaving();
    try {
      const res = await triggerCalendarSync();
      setIsSyncing(false);
      if (res.success) {
        triggerSaved();
        setSyncFeedback({ success: true, message: res.message });
      } else {
        triggerError('Sync encountered issues');
        setSyncFeedback({ success: false, message: res.message });
      }
    } catch (err) {
      setIsSyncing(false);
      triggerError('Scraper invocation failed');
      setSyncFeedback({
        success: false,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleSaveCalendarTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCalendarTerm) return;

    triggerSaving();
    try {
      await updateCalendarTermDoc(editingCalendarTerm.termId, {
        ...editingCalendarTerm,
        source: 'manually seeded',
        syncStatus: 'ok',
      });
      triggerSaved();
      setEditingCalendarTerm(null);
    } catch (err) {
      triggerError('Failed to update calendar dates');
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Administrator Console
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 uppercase">
                  Verified Admin
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Manage global course catalog definitions, track real-time website traffic, and oversee automated academic calendar syncing.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="admin-tab-traffic-btn"
              onClick={() => setActiveTab('traffic')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                activeTab === 'traffic'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>Traffic Viewer</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </button>
            <button
              id="admin-tab-courses-btn"
              onClick={() => setActiveTab('courses')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                activeTab === 'courses'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Manage Courses ({courses.length})</span>
            </button>
            <button
              id="admin-tab-calendar-btn"
              onClick={() => setActiveTab('calendar')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                activeTab === 'calendar'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Fix Calendar Dates ({calendarTerms.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: TRAFFIC VIEWER */}
      {activeTab === 'traffic' && <TrafficViewerView />}

      {/* TAB 2: MANAGE COURSES */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Official IITM Course Catalog</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Course catalog definitions are shared, read-only for students, and automatically populate term assessment structures.
              </p>
            </div>
            <button
              id="admin-add-course-btn"
              onClick={openAddCourseModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Course</span>
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60">
                  <th className="px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">Course Name</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">Level</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">Assessment Type</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">Components Structure</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-700 dark:text-zinc-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                      {course.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-zinc-100 dark:bg-zinc-800 font-medium text-zinc-700 dark:text-zinc-300">
                        {course.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize text-zinc-600 dark:text-zinc-400 font-medium">
                      {course.assessmentType}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 text-[11px]">
                      {course.assessmentType === 'exam' ? (
                        <span>
                          Q1 ({course.examComponents?.quiz1 ? 'Yes' : 'No'}), Q2 (
                          {course.examComponents?.quiz2 ? 'Yes' : 'No'}), End Term (
                          {course.examComponents?.endTerm ? 'Yes' : 'No'}), OPPE:{' '}
                          {course.examComponents?.oppeCount ?? 0}
                        </span>
                      ) : (
                        <span>
                          Project Submission (Yes), Viva (
                          {course.projectComponents?.hasViva ? 'Yes' : 'No'})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        id={`edit-course-btn-${course.id}`}
                        onClick={() => openEditCourseModal(course)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        title="Edit course"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`delete-course-btn-${course.id}`}
                        onClick={() => handleDeleteCourse(course.id, course.name)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Delete course"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FIX CALENDAR DATES & AUTOMATION */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Academic Calendar Automation &amp; Overrides</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Automated Gemini scraping keeps term dates synchronized with official IITM portals. You can manually correct any date field below if holidays shift.
              </p>
            </div>

            <button
              id="admin-trigger-sync-btn"
              disabled={isSyncing}
              onClick={handleSyncCalendar}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 rounded-lg transition-colors shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Scraping with Gemini...' : 'Sync Calendar Now'}</span>
            </button>
          </div>

          {syncFeedback && (
            <div
              className={`p-4 rounded-xl text-xs flex items-center gap-3 ${
                syncFeedback.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              }`}
            >
              {syncFeedback.success ? (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <span>{syncFeedback.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {calendarTerms.map((term) => (
              <div
                key={term.termId}
                id={`admin-cal-card-${term.termId}`}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-base text-zinc-900 dark:text-zinc-100">{term.termId}</span>
                    <span className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300 font-medium">
                      {term.cycleType} Cycle
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        term.syncStatus === 'ok'
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      Sync: {term.syncStatus || 'ok'}
                    </span>
                    {term.source && (
                      <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {term.source}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-zinc-400">
                    {term.lastScrapedAt ? `Updated: ${new Date(term.lastScrapedAt).toLocaleDateString()}` : 'Verified'}
                  </div>
                </div>

                {/* Dates display & edit button */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-400 block text-[10px]">Start Date</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatDateString(term.startDate)}</span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-400 block text-[10px]">Quiz 1 Exam</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatDateString(term.quiz1Date)}</span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-400 block text-[10px]">Quiz 2 Exam</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatDateString(term.quiz2Date)}</span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-400 block text-[10px]">End Term Exam</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatDateString(term.endTermDate)}</span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 sm:col-span-2">
                    <span className="text-zinc-400 block text-[10px]">OPPE 1 Window</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatDateString(term.oppe1Window?.start)} &rarr; {formatDateString(term.oppe1Window?.end)}
                    </span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 sm:col-span-2">
                    <span className="text-zinc-400 block text-[10px]">OPPE 2 Window</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatDateString(term.oppe2Window?.start)} &rarr; {formatDateString(term.oppe2Window?.end)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    id={`edit-cal-dates-btn-${term.termId}`}
                    onClick={() => setEditingCalendarTerm({ ...term })}
                    className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    Edit Dates Manually
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CATALOG COURSE */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {editingCourseId ? 'Edit Course Catalog Entry' : 'Add New Course to Catalog'}
              </h3>
              <button
                onClick={() => setIsCourseModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Official Course Name
                </label>
                <input
                  type="text"
                  required
                  value={courseFormName}
                  onChange={(e) => setCourseFormName(e.target.value)}
                  placeholder="e.g. Machine Learning Practice"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">
                    Level
                  </label>
                  <select
                    value={courseFormLevel}
                    onChange={(e) => setCourseFormLevel(e.target.value as UserLevel)}
                    className="w-full px-3 py-2 text-xs border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  >
                    {USER_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Assessment Type
                  </label>
                  <select
                    value={courseFormAssessmentType}
                    onChange={(e) =>
                      setCourseFormAssessmentType(e.target.value as AssessmentType)
                    }
                    className="w-full px-3 py-2 text-xs border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="exam">Exam Based</option>
                    <option value="project">Project Based</option>
                  </select>
                </div>
              </div>

              {/* Components */}
              {courseFormAssessmentType === 'exam' ? (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl space-y-3">
                  <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Exam Components</div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-zinc-800 dark:text-zinc-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={examQuiz1}
                        onChange={(e) => setExamQuiz1(e.target.checked)}
                        className="rounded"
                      />
                      <span>Quiz 1</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={examQuiz2}
                        onChange={(e) => setExamQuiz2(e.target.checked)}
                        className="rounded"
                      />
                      <span>Quiz 2</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={examEndTerm}
                        onChange={(e) => setExamEndTerm(e.target.checked)}
                        className="rounded"
                      />
                      <span>End Term</span>
                    </label>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                      OPPE Programming Exams Count (0, 1, or 2)
                    </label>
                    <select
                      value={examOppeCount}
                      onChange={(e) =>
                        setExamOppeCount(parseInt(e.target.value, 10) as 0 | 1 | 2)
                      }
                      className="px-3 py-1.5 text-xs border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 w-32"
                    >
                      <option value={0}>0 OPPEs</option>
                      <option value={1}>1 OPPE</option>
                      <option value={2}>2 OPPEs</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl space-y-2 text-xs">
                  <div className="font-semibold text-zinc-700 dark:text-zinc-200">Project Components</div>
                  <label className="flex items-center gap-2 cursor-pointer pt-1 text-zinc-800 dark:text-zinc-200">
                    <input
                      type="checkbox"
                      checked={projectHasViva}
                      onChange={(e) => setProjectHasViva(e.target.checked)}
                      className="rounded"
                    />
                    <span>Includes Viva Voce Examination</span>
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCourseModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white rounded-lg shadow-2xs"
                >
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT CALENDAR DATES */}
      {editingCalendarTerm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Edit Dates: {editingCalendarTerm.termId} ({editingCalendarTerm.cycleType})
              </h3>
              <button
                onClick={() => setEditingCalendarTerm(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCalendarTerm} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Start Date (YYYY-MM-DD)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCalendarTerm.startDate}
                    onChange={(e) =>
                      setEditingCalendarTerm({
                        ...editingCalendarTerm,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    End Term Date (YYYY-MM-DD)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCalendarTerm.endTermDate}
                    onChange={(e) =>
                      setEditingCalendarTerm({
                        ...editingCalendarTerm,
                        endTermDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Quiz 1 Date
                  </label>
                  <input
                    type="text"
                    value={editingCalendarTerm.quiz1Date || ''}
                    onChange={(e) =>
                      setEditingCalendarTerm({
                        ...editingCalendarTerm,
                        quiz1Date: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Quiz 2 Date
                  </label>
                  <input
                    type="text"
                    value={editingCalendarTerm.quiz2Date || ''}
                    onChange={(e) =>
                      setEditingCalendarTerm({
                        ...editingCalendarTerm,
                        quiz2Date: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    OPPE 1 Start
                  </label>
                  <input
                    type="text"
                    value={editingCalendarTerm.oppe1Window?.start || ''}
                    onChange={(e) =>
                      setEditingCalendarTerm({
                        ...editingCalendarTerm,
                        oppe1Window: {
                          start: e.target.value,
                          end: editingCalendarTerm.oppe1Window?.end || '',
                        },
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    OPPE 1 End
                  </label>
                  <input
                    type="text"
                    value={editingCalendarTerm.oppe1Window?.end || ''}
                    onChange={(e) =>
                      setEditingCalendarTerm({
                        ...editingCalendarTerm,
                        oppe1Window: {
                          start: editingCalendarTerm.oppe1Window?.start || '',
                          end: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingCalendarTerm(null)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white rounded-lg shadow-2xs"
                >
                  Update Term Dates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
