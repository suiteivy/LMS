import test from 'node:test';
import assert from 'node:assert/strict';

// Test our implementation logic directly to verify all mathematical and rule invariants
import {
  formatDateISO,
  parseDateISO,
  getCalendarWeekBounds,
  calculateWeeksForTerm,
  calculateWeeksForYear,
  calculatePacingSummary
} from '../utils/academicWeekEngine.ts';

test('getCalendarWeekBounds calculates Monday-start correctly by default', () => {
  const wednesday = new Date(2026, 0, 7); // Jan 7, 2026 (Wednesday)
  const bounds = getCalendarWeekBounds(wednesday, 1);
  
  assert.equal(formatDateISO(bounds.weekStart), '2026-01-05'); // Monday
  assert.equal(formatDateISO(bounds.workWeekEnd), '2026-01-09'); // Friday
  assert.equal(formatDateISO(bounds.weekEnd), '2026-01-11'); // Sunday
});

test('getCalendarWeekBounds calculates Sunday-start when configured', () => {
  const wednesday = new Date(2026, 0, 7); // Jan 7, 2026 (Wednesday)
  const bounds = getCalendarWeekBounds(wednesday, 0);
  
  assert.equal(formatDateISO(bounds.weekStart), '2026-01-04'); // Sunday
  assert.equal(formatDateISO(bounds.workWeekEnd), '2026-01-08'); // Thursday
  assert.equal(formatDateISO(bounds.weekEnd), '2026-01-10'); // Saturday
});

test('calculateWeeksForTerm expands multi-day events across all days', () => {
  const term = {
    id: 'term-1',
    name: 'Term 1',
    start_date: '2026-01-05', // Monday
    end_date: '2026-01-23'    // Friday (3 full weeks)
  };

  // 3-day multi-day break spanning Wednesday Jan 7 to Friday Jan 9
  const events = [
    {
      title: 'Midterm Break',
      start_date: '2026-01-07',
      end_date: '2026-01-09',
      cancel_classes: true,
      event_type: 'break'
    }
  ];

  const weeks = calculateWeeksForTerm(term, events, 1);
  assert.equal(weeks.length, 3);

  // Week 1 has Jan 5 (Mon), Jan 6 (Tue) instructional; Jan 7, 8, 9 cancelled
  const week1 = weeks[0];
  assert.equal(week1.instructionalDays, 2);
  assert.equal(week1.status, 'partial');
  assert.equal(week1.badgeText, '2d — Midterm Break');
  assert.equal(week1.isCountedForPacing, false);
  assert.equal(week1.pacingWeight, 2 / 5);

  // Week 2 has all 5 days instructional
  const week2 = weeks[1];
  assert.equal(week2.instructionalDays, 5);
  assert.equal(week2.status, 'normal');
  assert.equal(week2.badgeText, '5 days');
  assert.equal(week2.isCountedForPacing, true);
  assert.equal(week2.pacingWeight, 1.0);
});

test('calculatePacingSummary distinguishes display from pacing math', () => {
  const term = {
    id: 'term-1',
    name: 'Term 1',
    start_date: '2026-01-05',
    end_date: '2026-01-23'
  };

  // Single-day holiday on Wednesday Jan 14
  const events = [
    {
      title: 'National Holiday',
      start_date: '2026-01-14',
      end_date: '2026-01-14',
      cancel_classes: true
    }
  ];

  const weeks = calculateWeeksForTerm(term, events, 1);
  assert.equal(weeks.length, 3);

  // Week 1: 5 days
  // Week 2: 4 days (Holiday)
  // Week 3: 5 days
  const summary = calculatePacingSummary(weeks, 4); // 4 periods per week
  assert.equal(summary.totalInstructionalWeeks, 3); // All 3 weeks shown
  assert.equal(summary.fullWeeksCount, 2);
  assert.equal(summary.partialWeeksCount, 1);
  assert.equal(summary.totalInstructionalDays, 14);
  assert.equal(summary.effectivePacingWeeks, 2.8); // 1.0 + 0.8 + 1.0 = 2.8
  assert.equal(summary.targetLessons, 11); // round(2.8 * 4) = 11 lessons target
});
