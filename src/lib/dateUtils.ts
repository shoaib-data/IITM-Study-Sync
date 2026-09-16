export interface TermWeekInfo {
  weekNumber: number; // 1 to 12
  isUpcoming: boolean;
  isCompleted: boolean;
  daysUntilStart: number;
  daysIntoTerm: number;
  displayText: string;
}

/**
 * Calculates current term week live from calendar start date.
 * Formula: floor((today - calendar.startDate)/7) + 1, capped at 12.
 */
export function calculateTermWeek(startDateStr?: string): TermWeekInfo {
  if (!startDateStr) {
    return {
      weekNumber: 1,
      isUpcoming: false,
      isCompleted: false,
      daysUntilStart: 0,
      daysIntoTerm: 0,
      displayText: 'Week 1 of 12',
    };
  }

  // Parse YYYY-MM-DD
  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysUntil = Math.abs(diffDays);
    return {
      weekNumber: 1,
      isUpcoming: true,
      isCompleted: false,
      daysUntilStart: daysUntil,
      daysIntoTerm: 0,
      displayText: `Starts in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`,
    };
  }

  const rawWeek = Math.floor(diffDays / 7) + 1;

  if (rawWeek > 12) {
    return {
      weekNumber: 12,
      isUpcoming: false,
      isCompleted: true,
      daysUntilStart: 0,
      daysIntoTerm: diffDays,
      displayText: 'Term Completed (Week 12/12)',
    };
  }

  const boundedWeek = Math.max(1, Math.min(12, rawWeek));
  return {
    weekNumber: boundedWeek,
    isUpcoming: false,
    isCompleted: false,
    daysUntilStart: 0,
    daysIntoTerm: diffDays,
    displayText: `Week ${boundedWeek} of 12`,
  };
}

export function formatDateString(dateStr?: string): string {
  if (!dateStr) return 'TBA';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
