import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSaveStatus } from '../context/SaveStatusContext';
import { dropUserCourse } from '../lib/firestoreService';
import { UserCourse } from '../types';
import { MoreVertical, ArrowLeftRight, Trash2, AlertTriangle, X } from 'lucide-react';

interface CourseActionMenuProps {
  course: UserCourse;
  termId: string;
  onOpenReplaceModal: (course: UserCourse) => void;
}

export const CourseActionMenu: React.FC<CourseActionMenuProps> = ({
  course,
  termId,
  onOpenReplaceModal,
}) => {
  const { currentUser } = useAuth();
  const { triggerSaving, triggerSaved, triggerError } = useSaveStatus();

  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmDrop, setShowConfirmDrop] = useState(false);
  const [isDropping, setIsDropping] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleConfirmDrop = async () => {
    if (!currentUser) return;
    setIsDropping(true);
    triggerSaving();
    try {
      await dropUserCourse(currentUser.uid, termId, course.id);
      triggerSaved();
      setShowConfirmDrop(false);
    } catch (err) {
      triggerError('Failed to drop course');
      console.error('Error dropping course:', err);
    } finally {
      setIsDropping(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* 3-dots trigger button */}
      <button
        id={`course-menu-btn-${course.id}`}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        title="Course actions"
        aria-label="Course actions"
        className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-hidden"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className="absolute right-0 z-30 mt-1 w-44 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg py-1 text-xs animate-in fade-in zoom-in-95 duration-100 focus:outline-hidden"
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            id={`course-action-replace-${course.id}`}
            onClick={() => {
              setIsOpen(false);
              onOpenReplaceModal(course);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors text-left font-medium"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>Replace Course</span>
          </button>

          <button
            type="button"
            role="menuitem"
            id={`course-action-drop-${course.id}`}
            onClick={() => {
              setIsOpen(false);
              setShowConfirmDrop(true);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Drop Course</span>
          </button>
        </div>
      )}

      {/* Drop Course Confirmation Dialog */}
      {showConfirmDrop && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-left"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Drop Course?
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Are you sure you want to drop <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{course.name}</strong> from this term?
                </p>
              </div>
            </div>

            <div className="text-xs bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
              This course will be removed from your active term grid completely. You can re-enroll in it during any future term with a fresh 12-week checklist.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowConfirmDrop(false)}
                disabled={isDropping}
                className="px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDrop}
                disabled={isDropping}
                id="confirm-drop-btn"
                className="px-4 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
              >
                {isDropping ? 'Dropping...' : 'Drop Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
