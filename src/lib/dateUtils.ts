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

/**
 * Returns today's date in Asia/Kolkata timezone formatted as YYYY-MM-DD.
 */
export function getTodayIST(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Calculates whole calendar days between two YYYY-MM-DD date strings
 * (targetDate - fromDate), comparing dates only, ignoring time of day.
 */
export function getCalendarDaysDiff(fromDateStr?: string, targetDateStr?: string): number {
  if (!fromDateStr || !targetDateStr) return 0;
  const parts1 = fromDateStr.split('-').map(Number);
  const parts2 = targetDateStr.split('-').map(Number);
  if (parts1.length < 3 || parts2.length < 3) return 0;
  const [y1, m1, d1] = parts1;
  const [y2, m2, d2] = parts2;
  if (isNaN(y1) || isNaN(m1) || isNaN(d1) || isNaN(y2) || isNaN(m2) || isNaN(d2)) {
    return 0;
  }
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Formats a YYYY-MM-DD date string as a short date (e.g. "Nov 15").
 */
export function formatShortExamDate(dateStr?: string): string {
  if (!dateStr) return 'TBA';
  try {
    const parts = dateStr.split('-').map(Number);
    if (parts.length < 3) return dateStr;
    const [y, m, d] = parts;
    if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Computes milliseconds until the next midnight in Asia/Kolkata.
 */
export function getMsUntilNextMidnightIST(): number {
  const now = new Date();
  const todayISTStr = getTodayIST();
  const [y, m, d] = todayISTStr.split('-').map(Number);
  // Next midnight in Asia/Kolkata (UTC+5:30) is:
  // Date.UTC(y, m - 1, d + 1, 0, 0, 0) - (5.5 * 60 * 60 * 1000)
  const nextMidnightISTMs = Date.UTC(y, m - 1, d + 1, 0, 0, 0) - 5.5 * 60 * 60 * 1000;
  const diff = nextMidnightISTMs - now.getTime();
  return Math.max(1000, diff + 500); // 500ms safety buffer
}

