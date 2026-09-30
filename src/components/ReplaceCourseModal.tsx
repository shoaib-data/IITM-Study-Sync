import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSaveStatus } from '../context/SaveStatusContext';
import { subscribeCourseCatalog, replaceUserCourse } from '../lib/firestoreService';
import { CourseCatalogItem, UserCourse, UserLevel } from '../types';
import { USER_LEVELS } from '../lib/constants';
import { X, Search, ArrowLeftRight, Check, AlertCircle, BookOpen } from 'lucide-react';

interface ReplaceCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseToReplace: UserCourse | null;
  activeTermId: string;
  enrolledCourseIds: string[];
}

export const ReplaceCourseModal: React.FC<ReplaceCourseModalProps> = ({
  isOpen,
  onClose,
  courseToReplace,
  activeTermId,
  enrolledCourseIds,
}) => {
  const { currentUser, userProfile } = useAuth();
  const { triggerSaving, triggerSaved, triggerError } = useSaveStatus();

  const [catalog, setCatalog] = useState<CourseCatalogItem[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<UserLevel>(
    courseToReplace?.level || userProfile?.level || 'Foundation'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<CourseCatalogItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (courseToReplace?.level) {
      setSelectedLevel(courseToReplace.level);
    } else if (userProfile?.level) {
      setSelectedLevel(userProfile.level);
    }
    setSelectedCandidate(null);
    setSearchQuery('');
  }, [courseToReplace, userProfile?.level, isOpen]);

  useEffect(() => {
    const unsub = subscribeCourseCatalog(setCatalog);
    return () => unsub();
  }, []);

  // Filter catalog items
  const filteredCourses = useMemo(() => {
    return catalog.filter((item) => {
      const matchesLevel = selectedLevel === 'Degree' ? true : item.level === selectedLevel;
      const matchesQuery = item.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesLevel && matchesQuery;
    });
  }, [catalog, selectedLevel, searchQuery]);

  if (!isOpen || !courseToReplace) return null;

  const handleConfirmReplacement = async () => {
    if (!currentUser || !selectedCandidate) return;
    setIsSubmitting(true);
    triggerSaving();
    try {
      await replaceUserCourse(
        currentUser.uid,
        activeTermId,
        courseToReplace.id,
        selectedCandidate,
        courseToReplace.color
      );
      triggerSaved();
      onClose();
    } catch (err) {
      triggerError('Failed to replace course');
      console.error('Error replacing course:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="replace-modal-title"
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-850/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 id="replace-modal-title" className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Replace Course
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Replace <span className="font-semibold text-zinc-800 dark:text-zinc-200">{courseToReplace.name}</span> with another course
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

        {/* Informational Callout */}
        <div className="bg-amber-50/70 dark:bg-amber-950/30 px-5 py-3 border-b border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            Dropping <strong className="font-semibold">{courseToReplace.name}</strong> will defer it from this active term (it can be taken in a future term). The replacement course will start fresh with its own clean weekly progress grid from Week 1.
          </div>
        </div>

        {/* Filters: Level & Search */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 space-y-3">
          {/* Level Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {USER_LEVELS.map((lvl) => {
              const isSelected = selectedLevel === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    setSelectedLevel(lvl);
                    setSelectedCandidate(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-2xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {lvl}
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${selectedLevel} courses...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-500"
            />
          </div>
        </div>

        {/* Catalog List */}
        <div className="p-5 overflow-y-auto space-y-2 flex-1">
          {filteredCourses.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-400">
              No matching courses found in the catalog.
            </div>
          ) : (
            filteredCourses.map((item) => {
              const isAlreadyEnrolled =
                enrolledCourseIds.includes(item.id) && item.id !== courseToReplace.courseId;
              const isCurrentCourse = item.id === courseToReplace.courseId;
              const isSelected = selectedCandidate?.id === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (isAlreadyEnrolled || isCurrentCourse) return;
                    setSelectedCandidate(item);
                  }}
                  className={`p-3.5 rounded-xl border transition-all text-left flex items-center justify-between gap-3 ${
                    isAlreadyEnrolled || isCurrentCourse
                      ? 'opacity-50 cursor-not-allowed bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800'
                      : isSelected
                      ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50/80 dark:bg-zinc-800/70 shadow-2xs ring-1 ring-zinc-900 dark:ring-zinc-100 cursor-pointer'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 cursor-pointer'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                        {item.level}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        {item.assessmentType === 'project' ? 'Project' : 'Exam'}
                      </span>
                      {isCurrentCourse && (
                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          (Current Course)
                        </span>
                      )}
                      {isAlreadyEnrolled && (
                        <span className="text-[10px] font-medium text-zinc-500">
                          (Already Enrolled)
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                      {item.name}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border border-zinc-300 dark:border-zinc-700" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850/60 flex items-center justify-between gap-3">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {selectedCandidate ? (
              <span>
                New course: <strong className="text-zinc-900 dark:text-zinc-100">{selectedCandidate.name}</strong>
              </span>
            ) : (
              <span>Select a replacement course above</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedCandidate || isSubmitting}
              onClick={handleConfirmReplacement}
              className="px-4 py-1.5 text-xs font-medium text-white dark:text-zinc-900 bg-zinc-900 dark:bg-white rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Replacing...' : 'Confirm Replace'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
