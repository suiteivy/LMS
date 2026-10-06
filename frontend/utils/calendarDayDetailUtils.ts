import type { CalendarEvent, CancelledDateInfo } from '../services/CalendarService';
import type { TimetableEntry } from '../services/TimetableService';

/**
 * Normalizes and checks if a timetable entry's day_of_week matches a target date.
 * Supports string names ('Monday', 'monday') and numbers (1-7 or 0-6).
 */
export function isDayOfWeekMatch(entryDay: any, targetDate: Date): boolean {
  if (entryDay === undefined || entryDay === null) return false;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetDayName = dayNames[targetDate.getDay()].toLowerCase();

  if (typeof entryDay === 'string') {
    return entryDay.trim().toLowerCase() === targetDayName;
  }

  if (typeof entryDay === 'number') {
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday (standard JS)
    // or 1 = Monday, ..., 7 = Sunday (ISO 8601)
    const dayIndex0 = targetDate.getDay();
    const dayIndex1 = targetDate.getDay() === 0 ? 7 : targetDate.getDay();
    return entryDay === dayIndex0 || entryDay === dayIndex1;
  }

  return false;
}

/**
 * Returns YYYY-MM-DD from a Date object using local time.
 */
export function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks whether an event occurs on a specific date (YYYY-MM-DD).
 * Handles single-day events (event_date) and multi-day events (start_date to end_date).
 */
export function isEventOnDate(event: CalendarEvent, dateStr: string): boolean {
  const start = event.start_date || event.event_date;
  const end = event.end_date || event.start_date || event.event_date;

  if (!start) return false;
  if (!end || start === end) {
    return start === dateStr;
  }

  return dateStr >= start && dateStr <= end;
}

/**
 * Returns all dates (YYYY-MM-DD) spanned by an event, capped to 90 days.
 */
export function getEventDateRange(event: CalendarEvent): string[] {
  const start = event.start_date || event.event_date;
  const end = event.end_date || event.start_date || event.event_date;

  if (!start) return [];
  if (!end || start === end) return [start];

  const dates: string[] = [];
  const curr = new Date(`${start}T00:00:00`);
  const stop = new Date(`${end}T00:00:00`);

  if (Number.isNaN(curr.getTime()) || Number.isNaN(stop.getTime()) || curr > stop) {
    return [start];
  }

  let count = 0;
  while (curr <= stop && count < 90) {
    dates.push(getLocalDateString(curr));
    curr.setDate(curr.getDate() + 1);
    count++;
  }

  return dates.length > 0 ? dates : [start];
}

export interface DayCancellationResult {
  isCancelled: boolean;
  reason: string;
  source: 'event' | 'holiday' | 'admin_override' | null;
}

/**
 * Determines if classes on a specific date are cancelled via:
 * 1. Calendar event with cancel_classes: true
 * 2. National holiday with decision === 'cancel_classes'
 * 3. Cancelled date info record from CalendarAPI
 */
export function getDayCancellationInfo(
  dateStr: string,
  dayEvents: CalendarEvent[],
  cancelledDates: CancelledDateInfo[] = []
): DayCancellationResult {
  // 1. Calendar event with cancel_classes === true
  const eventCancel = dayEvents.find(e => Boolean(e.cancel_classes));
  if (eventCancel) {
    return {
      isCancelled: true,
      reason: eventCancel.title || 'Scheduled School Event',
      source: eventCancel.is_national_holiday ? 'holiday' : 'event',
    };
  }

  // 2. National holiday with decision === 'cancel_classes'
  const holidayCancel = dayEvents.find(
    e => e.is_national_holiday && e.decision === 'cancel_classes'
  );
  if (holidayCancel) {
    return {
      isCancelled: true,
      reason: holidayCancel.title || 'National Holiday',
      source: 'holiday',
    };
  }

  // 3. Cancelled dates record
  const cancelledRecord = cancelledDates.find(c => c.event_date === dateStr);
  if (cancelledRecord) {
    return {
      isCancelled: true,
      reason: cancelledRecord.title || 'Classes Suspended',
      source: 'admin_override',
    };
  }

  return {
    isCancelled: false,
    reason: '',
    source: null,
  };
}

/**
 * Filters a list of timetable entries for a target date and sorts them by start_time.
 */
export function filterAndSortTimetable(
  entries: TimetableEntry[],
  targetDate: Date
): TimetableEntry[] {
  if (!entries || !Array.isArray(entries)) return [];

  return entries
    .filter(entry => isDayOfWeekMatch(entry.day_of_week, targetDate))
    .sort((a, b) => {
      const timeA = a.start_time || '';
      const timeB = b.start_time || '';
      return timeA.localeCompare(timeB);
    });
}
