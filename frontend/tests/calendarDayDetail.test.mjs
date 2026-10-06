import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isDayOfWeekMatch,
  getLocalDateString,
  isEventOnDate,
  getEventDateRange,
  getDayCancellationInfo,
  filterAndSortTimetable
} from '../utils/calendarDayDetailUtils.ts';

test('isDayOfWeekMatch matches day names case-insensitively', () => {
  // Oct 5, 2026 is a Monday
  const monday = new Date(2026, 9, 5);
  assert.equal(isDayOfWeekMatch('Monday', monday), true);
  assert.equal(isDayOfWeekMatch('monday', monday), true);
  assert.equal(isDayOfWeekMatch('MONDAY', monday), true);
  assert.equal(isDayOfWeekMatch('Tuesday', monday), false);
});

test('isDayOfWeekMatch matches day numbers (both 1-7 ISO and 0-6 JS)', () => {
  // Oct 5, 2026 is a Monday (JS day 1, ISO day 1)
  const monday = new Date(2026, 9, 5);
  assert.equal(isDayOfWeekMatch(1, monday), true);
  assert.equal(isDayOfWeekMatch(2, monday), false);

  // Oct 11, 2026 is a Sunday (JS day 0, ISO day 7)
  const sunday = new Date(2026, 9, 11);
  assert.equal(isDayOfWeekMatch(0, sunday), true);
  assert.equal(isDayOfWeekMatch(7, sunday), true);
  assert.equal(isDayOfWeekMatch(1, sunday), false);
});

test('isEventOnDate handles single-day and multi-day events', () => {
  const singleDayEvent = {
    id: 'ev-1',
    event_date: '2026-10-05',
    title: 'Science Fair'
  };

  assert.equal(isEventOnDate(singleDayEvent, '2026-10-05'), true);
  assert.equal(isEventOnDate(singleDayEvent, '2026-10-06'), false);

  const multiDayEvent = {
    id: 'ev-2',
    event_date: '2026-10-07',
    start_date: '2026-10-07',
    end_date: '2026-10-10',
    title: 'Midterm Break'
  };

  assert.equal(isEventOnDate(multiDayEvent, '2026-10-06'), false);
  assert.equal(isEventOnDate(multiDayEvent, '2026-10-07'), true); // start
  assert.equal(isEventOnDate(multiDayEvent, '2026-10-08'), true); // middle
  assert.equal(isEventOnDate(multiDayEvent, '2026-10-09'), true); // middle
  assert.equal(isEventOnDate(multiDayEvent, '2026-10-10'), true); // end
  assert.equal(isEventOnDate(multiDayEvent, '2026-10-11'), false);
});

test('getEventDateRange expands all days in range', () => {
  const multiDayEvent = {
    id: 'ev-2',
    event_date: '2026-10-07',
    start_date: '2026-10-07',
    end_date: '2026-10-09',
    title: 'Annual Sports Camp'
  };

  const dates = getEventDateRange(multiDayEvent);
  assert.deepEqual(dates, ['2026-10-07', '2026-10-08', '2026-10-09']);
});

test('getDayCancellationInfo detects event class cancellation', () => {
  const normalEvent = {
    id: 'ev-1',
    event_date: '2026-10-05',
    title: 'Math Olympiad',
    cancel_classes: false
  };

  const res1 = getDayCancellationInfo('2026-10-05', [normalEvent], []);
  assert.equal(res1.isCancelled, false);

  const cancellingEvent = {
    id: 'ev-2',
    event_date: '2026-10-05',
    title: 'Staff Planning Day',
    cancel_classes: true
  };

  const res2 = getDayCancellationInfo('2026-10-05', [normalEvent, cancellingEvent], []);
  assert.equal(res2.isCancelled, true);
  assert.equal(res2.reason, 'Staff Planning Day');
  assert.equal(res2.source, 'event');
});

test('getDayCancellationInfo detects national holiday decision cancellation', () => {
  const holiday = {
    id: 'hol-1',
    event_date: '2026-10-10',
    title: 'Utamaduni Day',
    is_national_holiday: true,
    decision: 'cancel_classes',
    cancel_classes: false
  };

  const res = getDayCancellationInfo('2026-10-10', [holiday], []);
  assert.equal(res.isCancelled, true);
  assert.equal(res.reason, 'Utamaduni Day');
  assert.equal(res.source, 'holiday');
});

test('getDayCancellationInfo detects cancelled dates info record', () => {
  const cancelledDates = [
    {
      id: 'c-1',
      event_date: '2026-10-20',
      title: 'Emergency Weather Closure'
    }
  ];

  const res = getDayCancellationInfo('2026-10-20', [], cancelledDates);
  assert.equal(res.isCancelled, true);
  assert.equal(res.reason, 'Emergency Weather Closure');
  assert.equal(res.source, 'admin_override');
});

test('filterAndSortTimetable filters by day of week and sorts chronologically', () => {
  // Oct 5, 2026 is a Monday
  const monday = new Date(2026, 9, 5);

  const entries = [
    { id: '1', day_of_week: 'Tuesday', start_time: '08:00', end_time: '09:00', subjects: { title: 'Physics' } },
    { id: '2', day_of_week: 'Monday', start_time: '11:00', end_time: '12:00', subjects: { title: 'English' } },
    { id: '3', day_of_week: 'Monday', start_time: '08:30', end_time: '09:30', subjects: { title: 'Mathematics' } },
    { id: '4', day_of_week: 'Wednesday', start_time: '08:00', end_time: '09:00', subjects: { title: 'History' } },
    { id: '5', day_of_week: 'Monday', start_time: '14:00', end_time: '15:00', subjects: { title: 'Chemistry' } }
  ];

  const mondayEntries = filterAndSortTimetable(entries, monday);
  assert.equal(mondayEntries.length, 3);
  assert.equal(mondayEntries[0].id, '3'); // 08:30
  assert.equal(mondayEntries[1].id, '2'); // 11:00
  assert.equal(mondayEntries[2].id, '5'); // 14:00
});
