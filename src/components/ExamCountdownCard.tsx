import React, { useState, useEffect } from 'react';
import { CalendarTerm } from '../types';
import {
  getTodayIST,
  getCalendarDaysDiff,
  formatShortExamDate,
  getMsUntilNextMidnightIST,
} from '../lib/dateUtils';
import { Clock } from 'lucide-react';

interface ExamCountdownCardProps {
  calendar?: CalendarTerm | null;
  className?: string;
}

interface ExamMilestoneConfig {
  id: string;
  name: string;
  targetDate?: string;
  previousMilestoneDate?: string;
}

export const ExamCountdownCard: React.FC<ExamCountdownCardProps> = ({ calendar, className = '' }) => {
  const [todayIST, setTodayIST] = useState<string>(() => getTodayIST());

  useEffect(() => {
    let timerId: NodeJS.Timeout;

    const scheduleNextMidnight = () => {
      const ms = getMsUntilNextMidnightIST();
      timerId = setTimeout(() => {
        setTodayIST(getTodayIST());
        scheduleNextMidnight();
      }, ms);
    };

    scheduleNextMidnight();

    const handleSync = () => {
      const current = getTodayIST();
      setTodayIST((prev) => (prev !== current ? current : prev));
    };

    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);

    return () => {
      clearTimeout(timerId);
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
    };
  }, []);

  const milestones: ExamMilestoneConfig[] = [
    {
      id: 'quiz1',
      name: 'Quiz 1',
      targetDate: calendar?.quiz1Date,
      previousMilestoneDate: calendar?.startDate,
    },
    {
      id: 'quiz2',
      name: 'Quiz 2',
      targetDate: calendar?.quiz2Date,
      previousMilestoneDate: calendar?.quiz1Date,
    },
    {
      id: 'endTerm',
      name: 'End term',
      targetDate: calendar?.endTermDate,
      previousMilestoneDate: calendar?.quiz2Date,
    },
  ];

  return (
    <div
      id="exam-countdown-card"
      className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Exam countdown
          </h2>
        </div>
        <span className="text-[11px] font-medium text-zinc-400">
          IST
        </span>
      </div>

      <div className="space-y-4 divide-y divide-zinc-100 dark:divide-zinc-800/80">
        {milestones.map((milestone, idx) => {
          const hasDate = !!milestone.targetDate;
          const daysRemaining = hasDate
            ? getCalendarDaysDiff(todayIST, milestone.targetDate)
            : 0;
          const totalDaysInSpan =
            hasDate && milestone.previousMilestoneDate
              ? getCalendarDaysDiff(milestone.previousMilestoneDate, milestone.targetDate)
              : 0;

          const isCompleted = hasDate && daysRemaining < 0;
          const isExamDay = hasDate && daysRemaining === 0;
          const isUrgent = hasDate && !isCompleted && daysRemaining <= 10;

          // Progress bar fill: days remaining divided by total days in span, clamped between 0 and 100%
          let fillPercentage = 0;
          if (hasDate && !isCompleted) {
            if (totalDaysInSpan > 0) {
              const rawRatio = (daysRemaining / totalDaysInSpan) * 100;
              fillPercentage = Math.min(100, Math.max(0, rawRatio));
            } else {
              fillPercentage = isExamDay ? 0 : 100;
            }
          }

          // Label calculation:
          let labelText = 'TBA';
          if (!hasDate) {
            labelText = 'Dates TBA';
          } else if (isCompleted) {
            labelText = 'Completed';
          } else if (isExamDay) {
            labelText = 'Today';
          } else if (daysRemaining === 1) {
            labelText = '1 day remaining';
          } else {
            labelText = `${daysRemaining} days remaining`;
          }

          const shortDate = formatShortExamDate(milestone.targetDate);

          return (
            <div
              key={milestone.id}
              className={`space-y-2 ${idx > 0 ? 'pt-3.5' : ''} ${
                isCompleted ? 'opacity-60' : ''
              }`}
            >
              {/* Row Header: Exam name on left, short date on right */}
              <div className="flex items-center justify-between text-sm">
                <span
                  className={`font-semibold ${
                    isCompleted
                      ? 'text-zinc-400 dark:text-zinc-500'
                      : 'text-zinc-900 dark:text-zinc-100'
                  }`}
                >
                  {milestone.name}
                </span>
                <span
                  className={`text-xs ${
                    isCompleted
                      ? 'text-zinc-400 dark:text-zinc-500'
                      : 'text-zinc-500 dark:text-zinc-400 font-medium'
                  }`}
                >
                  {shortDate}
                </span>
              </div>

              {/* Label below it */}
              <div className="flex items-center justify-between text-xs">
                <span
                  className={
                    isCompleted
                      ? 'text-zinc-400 dark:text-zinc-500 font-medium'
                      : isUrgent
                      ? 'text-red-600 dark:text-red-400 font-medium'
                      : 'text-emerald-600 dark:text-emerald-400 font-medium'
                  }
                >
                  {labelText}
                </span>
              </div>

              {/* Horizontal progress bar that shrinks as the exam gets closer */}
              {!isCompleted && hasDate && (
                <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isUrgent
                        ? 'bg-red-500 dark:bg-red-500'
                        : 'bg-emerald-500 dark:bg-emerald-400'
                    }`}
                    style={{ width: `${fillPercentage}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
