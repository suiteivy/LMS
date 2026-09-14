/**
 * Academic Week Calculation Engine
 * 
 * Single source of truth for deriving instructional weeks from:
 * - Active academic year start/end dates
 * - Configured terms (academic periods)
 * - Non-instructional calendar events (holidays, school breaks, class cancellations)
 * 
 * Used by Coverage Planner, Record of Work, and Lesson Plan week selection.
 */

export interface CalendarEventItem {
  id?: string;
  event_date: string; // YYYY-MM-DD
  title: string;
  cancel_classes?: boolean;
  event_type?: string;
  description?: string | null;
  start_date?: string;
  end_date?: string;
  name?: string;
}

export interface AcademicTermItem {
  id: string;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  term_number?: number;
  is_current?: boolean;
  academic_year_id?: string;
}

export interface AcademicYearItem {
  id: string;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  is_current?: boolean;
  terms?: AcademicTermItem[];
}

export interface InstructionalWeek {
  id: string; // Stable identifier: e.g. "termId_w1" or "w1_2026-01-05"
  weekNumber: number; // 1-based sequential week index within term
  weekNumberInYear?: number;
  termId: string;
  termName: string;
  startDate: string; // YYYY-MM-DD (Monday or term start)
  endDate: string; // YYYY-MM-DD (Friday or term end)
  fullWeekStart: string; // YYYY-MM-DD (Calendar week start)
  fullWeekEnd: string; // YYYY-MM-DD (Calendar week end)
  status: 'normal' | 'partial' | 'non_instructional';
  instructionalDays: number; // Scheduled teaching days (usually out of 5)
  totalPossibleDays: number; // Typically 5 weekdays (Mon-Fri)
  pacingWeight: number; // Proportional instructional weight (e.g., 0.6 for 3d, 1.0 for 5d)
  isCountedForPacing: boolean; // Excluded from full-week pacing math when partial or break
  events: Array<{ date: string; title: string }>;
  label: string; // e.g. "Week 1 (Jan 5 – Jan 9)"
  badgeText: string; // e.g. "5 days", "3d — Holiday", "Break / Recess"
  isBreak?: boolean;
  isPartial?: boolean;
  holidayReasons?: string[];
}

/**
 * Format a Date to YYYY-MM-DD string in local/UTC date-safe representation.
 */
export function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string to a Date set to local midnight.
 */
export function parseDateISO(str: string): Date | null {
  if (!str) return null;
  const parts = str.split('T')[0].split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m, d, 0, 0, 0, 0);
}

/**
 * Given a date, get the week bounds according to the configured weekStartDay.
 * Default is Monday (1). Sunday is 0.
 */
export function getCalendarWeekBounds(
  date: Date,
  weekStartDay: number = 1
): {
  weekStart: Date;
  workWeekEnd: Date;
  weekEnd: Date;
  monday: Date;
  friday: Date;
  sunday: Date;
} {
  const day = date.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const diff = (day - weekStartDay + 7) % 7;
  
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - diff);
  weekStart.setHours(0, 0, 0, 0);

  // 5-day instructional window (weekStart + 4 days)
  const workWeekEnd = new Date(weekStart);
  workWeekEnd.setDate(weekStart.getDate() + 4);
  workWeekEnd.setHours(23, 59, 59, 999);

  // Full 7-day cycle end (weekStart + 6 days)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return {
    weekStart,
    workWeekEnd,
    weekEnd,
    monday: weekStart,
    friday: workWeekEnd,
    sunday: weekEnd
  };
}

/**
 * Format date for display: "Jan 5"
 */
function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Derive instructional weeks for a specific term.
 * - Multi-day events are expanded across their full date span.
 * - Week start day is institution-configurable (default 1 = Monday).
 * - Partial weeks display clearly ("3d — Holiday") but are weighted accurately for pacing math.
 */
export function calculateWeeksForTerm(
  term: AcademicTermItem,
  events: CalendarEventItem[] = [],
  weekStartDay: number = 1
): InstructionalWeek[] {
  const termStart = parseDateISO(term.start_date);
  const termEnd = parseDateISO(term.end_date);

  if (!termStart || !termEnd || termStart > termEnd) {
    return [];
  }

  // Build a lookup map for cancelled dates / holidays, expanding multi-day ranges
  const holidayMap = new Map<string, string>();
  for (const ev of events) {
    if (ev.cancel_classes || ev.event_type === 'holiday' || ev.event_type === 'break') {
      const title = ev.title || ev.name || 'Holiday';
      const startDateStr = ev.start_date || ev.event_date;
      const endDateStr = ev.end_date || ev.start_date || ev.event_date;

      if (startDateStr) {
        const start = parseDateISO(startDateStr);
        const end = endDateStr ? parseDateISO(endDateStr) : start;
        if (start && end) {
          const cur = new Date(start);
          while (cur <= end) {
            holidayMap.set(formatDateISO(cur), title);
            cur.setDate(cur.getDate() + 1);
          }
        } else if (startDateStr) {
          holidayMap.set(startDateStr, title);
        }
      }
    }
  }

  const weeks: InstructionalWeek[] = [];
  let currentStart = getCalendarWeekBounds(termStart, weekStartDay).weekStart;
  let weekNumber = 1;

  while (currentStart <= termEnd) {
    const currentEndInstructional = new Date(currentStart);
    currentEndInstructional.setDate(currentStart.getDate() + 4);

    const currentCycleEnd = new Date(currentStart);
    currentCycleEnd.setDate(currentStart.getDate() + 6);

    // Effective start and end within term
    const effectiveStart = currentStart < termStart ? termStart : currentStart;
    const effectiveEnd = currentEndInstructional > termEnd ? termEnd : currentEndInstructional;

    // Check 5 weekdays for instructional days
    let instructionalCount = 0;
    let totalWeekdaysInTerm = 0;
    const weekEvents: Array<{ date: string; title: string }> = [];

    for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
      const cursor = new Date(currentStart);
      cursor.setDate(currentStart.getDate() + dayOffset);
      const cursorStr = formatDateISO(cursor);

      // Check if this weekday falls within term boundaries
      if (cursor >= termStart && cursor <= termEnd) {
        totalWeekdaysInTerm++;
        if (holidayMap.has(cursorStr)) {
          weekEvents.push({
            date: cursorStr,
            title: holidayMap.get(cursorStr) || 'Holiday'
          });
        } else {
          instructionalCount++;
        }
      }
    }

    // Determine status & display badge
    let status: 'normal' | 'partial' | 'non_instructional' = 'normal';
    let badgeText = `${instructionalCount} days`;

    if (instructionalCount === 0 && totalWeekdaysInTerm > 0) {
      status = 'non_instructional';
      badgeText = 'Break / Recess';
    } else if (instructionalCount < 5 || weekEvents.length > 0) {
      status = 'partial';
      if (weekEvents.length > 0) {
        const uniqueTitles = Array.from(new Set(weekEvents.map(e => e.title))).join(', ');
        badgeText = `${instructionalCount}d — ${uniqueTitles}`;
      } else {
        badgeText = `${instructionalCount}d — Short Week`;
      }
    } else {
      badgeText = '5 days';
    }

    // Pacing calculations:
    // Full weeks get 1.0 weight; partial weeks get proportional weight (e.g. 3d = 0.6)
    // Partial weeks are excluded from full-week pacing count (isCountedForPacing = false)
    const pacingWeight = totalWeekdaysInTerm > 0 ? instructionalCount / 5 : 0;
    const isCountedForPacing = status === 'normal' && instructionalCount >= 5;

    const startLabel = formatShortDate(effectiveStart);
    const endLabel = formatShortDate(effectiveEnd);
    const label = `Week ${weekNumber} (${startLabel} – ${endLabel})`;

    const isBreak = status === 'non_instructional';
    const isPartial = status === 'partial';
    const holidayReasons = Array.from(new Set(weekEvents.map(e => e.title)));

    weeks.push({
      id: `${term.id}_w${weekNumber}`,
      weekNumber,
      termId: term.id,
      termName: term.name,
      startDate: formatDateISO(effectiveStart),
      endDate: formatDateISO(effectiveEnd),
      fullWeekStart: formatDateISO(currentStart),
      fullWeekEnd: formatDateISO(currentCycleEnd),
      status,
      instructionalDays: instructionalCount,
      totalPossibleDays: totalWeekdaysInTerm,
      pacingWeight,
      isCountedForPacing,
      events: weekEvents,
      label,
      badgeText,
      isBreak,
      isPartial,
      holidayReasons
    });

    // Advance to next week start
    const nextStart = new Date(currentStart);
    nextStart.setDate(currentStart.getDate() + 7);
    currentStart = nextStart;
    weekNumber++;
  }

  return weeks;
}

/**
 * Derive all instructional weeks across all terms of an academic year.
 */
export function calculateWeeksForYear(
  terms: AcademicTermItem[],
  events: CalendarEventItem[] = [],
  weekStartDay: number = 1
): InstructionalWeek[] {
  if (!terms || terms.length === 0) {
    return [];
  }

  // Sort terms by start date
  const sortedTerms = [...terms].sort((a, b) => {
    return (a.start_date || '').localeCompare(b.start_date || '');
  });

  const allWeeks: InstructionalWeek[] = [];
  let yearWeekIndex = 1;

  for (const term of sortedTerms) {
    const termWeeks = calculateWeeksForTerm(term, events, weekStartDay);
    for (const w of termWeeks) {
      allWeeks.push({
        ...w,
        weekNumberInYear: yearWeekIndex++
      });
    }
  }

  return allWeeks;
}

/**
 * Find which instructional week contains a specific date.
 */
export function findWeekForDate(
  dateStr: string,
  weeks: InstructionalWeek[]
): InstructionalWeek | null {
  if (!dateStr || !weeks || weeks.length === 0) return null;
  const targetDate = parseDateISO(dateStr);
  if (!targetDate) return null;

  for (const w of weeks) {
    const start = parseDateISO(w.fullWeekStart);
    const end = parseDateISO(w.fullWeekEnd);
    if (start && end && targetDate >= start && targetDate <= end) {
      return w;
    }
  }

  return null;
}

/**
 * Create fallback weeks for demo / offline contexts.
 */
export function createDefaultFallbackWeeks(count: number = 14): InstructionalWeek[] {
  return Array.from({ length: count }, (_, i) => {
    const num = i + 1;
    return {
      id: `fallback_w${num}`,
      weekNumber: num,
      weekNumberInYear: num,
      termId: 'default_term',
      termName: 'Term 1',
      startDate: '',
      endDate: '',
      fullWeekStart: '',
      fullWeekEnd: '',
      status: 'normal' as const,
      instructionalDays: 5,
      totalPossibleDays: 5,
      pacingWeight: 1.0,
      isCountedForPacing: true,
      events: [],
      label: `Week ${num}`,
      badgeText: '5 days',
      isBreak: false,
      isPartial: false,
      holidayReasons: []
    };
  });
}

export interface PacingSummary {
  totalInstructionalWeeks: number;
  fullWeeksCount: number;
  partialWeeksCount: number;
  breakWeeksCount: number;
  totalInstructionalDays: number;
  effectivePacingWeeks: number; // Sum of pacingWeight
  targetLessons: number; // effectivePacingWeeks * periodsPerWeek
}

/**
 * Pacing math summary helper.
 * Partial weeks are accounted for with proportional instructional weight
 * rather than counting as full 5-day instructional weeks.
 */
export function calculatePacingSummary(
  weeks: InstructionalWeek[],
  periodsPerWeek: number = 4
): PacingSummary {
  let fullWeeksCount = 0;
  let partialWeeksCount = 0;
  let breakWeeksCount = 0;
  let totalInstructionalDays = 0;
  let effectivePacingWeeks = 0;

  for (const w of weeks) {
    if (w.status === 'non_instructional') {
      breakWeeksCount++;
    } else if (w.status === 'partial') {
      partialWeeksCount++;
      totalInstructionalDays += w.instructionalDays;
      effectivePacingWeeks += w.pacingWeight;
    } else {
      fullWeeksCount++;
      totalInstructionalDays += w.instructionalDays;
      effectivePacingWeeks += 1.0;
    }
  }

  return {
    totalInstructionalWeeks: fullWeeksCount + partialWeeksCount,
    fullWeeksCount,
    partialWeeksCount,
    breakWeeksCount,
    totalInstructionalDays,
    effectivePacingWeeks: Math.round(effectivePacingWeeks * 10) / 10,
    targetLessons: Math.round(effectivePacingWeeks * periodsPerWeek)
  };
}

