import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StickyNote as StickyNoteType, UserCourse } from '../types';
import { saveUserStickyNote } from '../lib/firestoreService';
import { useSaveStatus } from '../context/SaveStatusContext';
import { StickyNote, Pin, RotateCcw } from 'lucide-react';

interface StickyNotesSectionProps {
  uid: string;
  termId?: string;
  courses: UserCourse[];
  stickyNotes: StickyNoteType[];
}

interface StickyNoteCardProps {
  uid: string;
  noteId: string;
  title: string;
  subtitle?: string;
  isGeneral: boolean;
  courseId?: string;
  termId?: string;
  accentColor: string;
  remoteContent: string;
  remoteUpdatedAt?: string;
}

const MAX_NOTE_LENGTH = 5000;
const AUTOSAVE_DELAY_MS = 700;

function formatLastUpdatedIST(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

const StickyNoteCard: React.FC<StickyNoteCardProps> = ({
  uid,
  noteId,
  title,
  subtitle,
  isGeneral,
  courseId,
  termId,
  accentColor,
  remoteContent,
  remoteUpdatedAt,
}) => {
  const { triggerSaving, triggerSaved, triggerError } = useSaveStatus();

  const [draft, setDraft] = useState<string>(remoteContent);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isPendingSave, setIsPendingSave] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);
  const latestDraftRef = useRef(remoteContent);
  const metaRef = useRef({ uid, noteId, title, isGeneral, courseId, termId, accentColor });

  useEffect(() => {
    metaRef.current = { uid, noteId, title, isGeneral, courseId, termId, accentColor };
  }, [uid, noteId, title, isGeneral, courseId, termId, accentColor]);

  // Reset dirty state if term changes for subject notes
  useEffect(() => {
    if (!isGeneral) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      isDirtyRef.current = false;
      setIsPendingSave(false);
      setConfirmingClear(false);
      setDraft(remoteContent);
      latestDraftRef.current = remoteContent;
    }
  }, [termId, isGeneral]);

  // Sync remote snapshot changes when user is not mid-edit
  useEffect(() => {
    if (!isDirtyRef.current) {
      setDraft(remoteContent);
      latestDraftRef.current = remoteContent;
    }
  }, [remoteContent]);

  const persistNote = useCallback(
    async (nextContent: string) => {
      const m = metaRef.current;
      const clamped = nextContent.slice(0, MAX_NOTE_LENGTH);
      triggerSaving();
      try {
        await saveUserStickyNote(m.uid, m.noteId, {
          title: m.title,
          content: clamped,
          isGeneral: m.isGeneral,
          courseId: m.courseId,
          termId: m.isGeneral ? undefined : m.termId,
          color: m.accentColor,
          updatedAt: new Date().toISOString(),
        });
        isDirtyRef.current = false;
        setIsPendingSave(false);
        triggerSaved();
      } catch (err) {
        console.error('Failed to save sticky note:', err);
        triggerError('Failed to save sticky note');
        setIsPendingSave(false);
      }
    },
    [triggerSaving, triggerSaved, triggerError]
  );

  // Flush pending edits on unmount so navigating away never loses typed notes
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (isDirtyRef.current) {
        const m = metaRef.current;
        const clamped = latestDraftRef.current.slice(0, MAX_NOTE_LENGTH);
        void saveUserStickyNote(m.uid, m.noteId, {
          title: m.title,
          content: clamped,
          isGeneral: m.isGeneral,
          courseId: m.courseId,
          termId: m.isGeneral ? undefined : m.termId,
          color: m.accentColor,
          updatedAt: new Date().toISOString(),
        }).catch((err) => {
          console.error('Failed to flush sticky note on unmount:', err);
        });
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.slice(0, MAX_NOTE_LENGTH);
    setDraft(val);
    latestDraftRef.current = val;
    isDirtyRef.current = true;
    setIsPendingSave(true);

    if (confirmingClear) {
      setConfirmingClear(false);
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void persistNote(latestDraftRef.current);
    }, AUTOSAVE_DELAY_MS);
  };

  const handleBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (isDirtyRef.current) {
      void persistNote(latestDraftRef.current);
    }
  };

  const handleConfirmClear = async () => {
    if (isClearing) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setIsClearing(true);
    setDraft('');
    latestDraftRef.current = '';
    isDirtyRef.current = false;
    setIsPendingSave(false);
    try {
      await persistNote('');
    } finally {
      setIsClearing(false);
      setConfirmingClear(false);
    }
  };

  const formattedUpdated = formatLastUpdatedIST(remoteUpdatedAt);

  return (
    <div
      id={`sticky-note-card-${noteId}`}
      className={`bg-white dark:bg-zinc-900 border rounded-xl shadow-xs overflow-hidden flex flex-col transition-colors ${
        isGeneral
          ? 'border-amber-200/90 dark:border-amber-500/30 hover:border-amber-300 dark:hover:border-amber-500/50'
          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
      }`}
    >
      {/* Colored Top Accent Bar */}
      <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: accentColor }} />

      {/* Card Header */}
      <div className="px-4 pt-3.5 pb-2.5 flex items-start justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1.5">
            {isGeneral && (
              <Pin className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
            )}
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {title}
            </h3>
          </div>

          {isGeneral ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60">
              Persistent across terms
            </span>
          ) : (
            subtitle && (
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 truncate">
                {subtitle}
              </div>
            )
          )}
        </div>

        {/* Clear / Reset Action with Inline Two-Step Confirmation */}
        <div className="shrink-0 flex items-center">
          {confirmingClear ? (
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 mr-0.5">
                Clear?
              </span>
              <button
                type="button"
                onClick={handleConfirmClear}
                disabled={isClearing}
                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isClearing ? '...' : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingClear(false)}
                disabled={isClearing}
                className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingClear(true)}
              disabled={draft.length === 0}
              title={draft.length === 0 ? 'Note is already empty' : 'Clear note'}
              aria-label={`Clear ${title} sticky note`}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Auto-saving Note Textarea */}
      <div className="px-4 py-3 flex-1 flex flex-col">
        <textarea
          value={draft}
          onChange={handleChange}
          onBlur={handleBlur}
          maxLength={MAX_NOTE_LENGTH}
          rows={5}
          aria-label={`${title} sticky note`}
          placeholder={
            isGeneral
              ? 'Write long-term reminders, useful links, or general study notes that stay across every term...'
              : `Jot down key topics, formulas, or quick reminders for ${title}...`
          }
          className="w-full flex-1 min-h-[130px] resize-y bg-transparent text-xs sm:text-sm text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 leading-relaxed focus:outline-hidden"
        />
      </div>

      {/* Footer: Last Updated & Character Count */}
      <div className="px-4 py-2.5 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/30 flex items-center justify-between gap-2 text-[11px] text-zinc-400 dark:text-zinc-500">
        <span className="truncate">
          {isPendingSave
            ? 'Saving changes...'
            : formattedUpdated && draft.length > 0
              ? `Updated ${formattedUpdated}`
              : draft.length > 0
                ? 'Saved'
                : 'Empty note'}
        </span>
        <span className="font-mono shrink-0 tabular-nums">
          {draft.length.toLocaleString()} / {MAX_NOTE_LENGTH.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export const StickyNotesSection: React.FC<StickyNotesSectionProps> = ({
  uid,
  termId,
  courses,
  stickyNotes,
}) => {
  const notesMap = new Map<string, StickyNoteType>();
  stickyNotes.forEach((n) => {
    notesMap.set(n.id, n);
  });

  const generalNote = notesMap.get('general');

  return (
    <section id="planner-sticky-notes-section" className="space-y-4 pt-2">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
            <StickyNote className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Sticky Notes
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Auto-saving scratchpads for each active course (cleared on new term) plus a permanent General pad.
            </p>
          </div>
        </div>
      </div>

      {/* Responsive 2-column / 3-column Sticky Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Permanent Non-Course General Card */}
        <StickyNoteCard
          key="general"
          uid={uid}
          noteId="general"
          title="General / Scratchpad"
          isGeneral={true}
          accentColor="#f59e0b"
          remoteContent={generalNote?.content || ''}
          remoteUpdatedAt={generalNote?.updatedAt}
        />

        {/* Dynamic Course Sticky Note Cards */}
        {courses.map((course) => {
          const existing = notesMap.get(course.courseId);
          return (
            <StickyNoteCard
              key={course.courseId}
              uid={uid}
              noteId={course.courseId}
              title={course.name}
              subtitle={course.level}
              isGeneral={false}
              courseId={course.courseId}
              termId={termId}
              accentColor={course.color || '#6366f1'}
              remoteContent={existing?.content || ''}
              remoteUpdatedAt={existing?.updatedAt}
            />
          );
        })}
      </div>
    </section>
  );
};
