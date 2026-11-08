import React from 'react';
import { UserTask } from '../types';
import { CheckCircle2, ChevronRight, ArrowRight } from 'lucide-react';

interface TodayTasksCardProps {
  tasks: UserTask[];
  onToggleTask: (task: UserTask) => void;
  onNavigateToPlanner?: () => void;
  className?: string;
}

export const TodayTasksCard: React.FC<TodayTasksCardProps> = ({
  tasks,
  onToggleTask,
  onNavigateToPlanner,
  className = '',
}) => {
  // If there are no tasks for today, do not render the card at all (no empty state, no placeholder).
  if (!tasks || tasks.length === 0) {
    return null;
  }

  // Done tasks are struck through and moved to the bottom.
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.done !== b.done) {
      return a.done ? 1 : -1;
    }
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });

  const doneCount = tasks.filter((t) => t.done).length;
  const displayedTasks = sortedTasks.slice(0, 5);
  const remainingCount = sortedTasks.length - 5;

  return (
    <div
      id="todays-tasks-card"
      className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-3.5 ${className}`}
    >
      {/* Header: "Today's tasks" with progress count such as "1 of 3 done", and small "Open planner" link */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-zinc-700 dark:text-zinc-300" />
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            Today&apos;s tasks
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal shrink-0">
            ({doneCount} of {tasks.length} done)
          </span>
        </div>

        {onNavigateToPlanner && (
          <button
            type="button"
            onClick={onNavigateToPlanner}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 inline-flex items-center gap-0.5 hover:underline cursor-pointer shrink-0"
          >
            <span>Open planner</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-2.5 divide-y divide-zinc-100 dark:divide-zinc-800/80">
        {displayedTasks.map((task, idx) => (
          <div
            key={task.id}
            className={`flex items-start gap-2.5 ${idx > 0 ? 'pt-2.5' : ''}`}
          >
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => onToggleTask(task)}
              className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-700 cursor-pointer shrink-0"
              aria-label={`Mark task "${task.title}" as ${task.done ? 'undone' : 'done'}`}
            />

            <div className="min-w-0 flex-1 flex items-start justify-between gap-2">
              <span
                className={`text-xs sm:text-sm font-medium leading-snug break-words ${
                  task.done
                    ? 'line-through text-zinc-400 dark:text-zinc-500'
                    : 'text-zinc-900 dark:text-zinc-100'
                }`}
              >
                {task.title}
              </span>

              {task.courseName && (
                <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 truncate max-w-[120px]">
                  {task.courseName}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Show at most 5 tasks, with a "+N more" link to the Planner page if there are more */}
      {remainingCount > 0 && onNavigateToPlanner && (
        <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onNavigateToPlanner}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 inline-flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>+{remainingCount} more in Planner</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
