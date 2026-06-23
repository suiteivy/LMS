const test = require('node:test');
const assert = require('node:assert/strict');

const { buildPromotionDecisions } = require('../services/promotionEligibility.service.js');

test('buildPromotionDecisions marks eligible and retained students correctly', () => {
  const enrollments = [
    {
      student_id: 'stu-1',
      students: { users: { full_name: 'Alice One' } },
    },
    {
      student_id: 'stu-2',
      students: { users: { full_name: 'Bob Two' } },
    },
  ];

  const reportCards = [
    {
      id: 'rc-1',
      student_id: 'stu-1',
      average_percentage: 72,
      attendance_count: 18,
      total_school_days: 20,
      status: 'published',
    },
    {
      id: 'rc-2',
      student_id: 'stu-2',
      average_percentage: 44,
      attendance_count: 20,
      total_school_days: 20,
      status: 'published',
    },
  ];

  const cycleConfig = {
    min_average_percentage: 50,
    min_attendance_percentage: 80,
  };

  const decisions = buildPromotionDecisions({ enrollments, reportCards, cycleConfig });
  assert.equal(decisions.length, 2);

  const alice = decisions.find((d) => d.student_id === 'stu-1');
  const bob = decisions.find((d) => d.student_id === 'stu-2');

  assert.equal(alice.eligible, true);
  assert.equal(alice.status, 'pending');
  assert.equal(bob.eligible, false);
  assert.equal(bob.status, 'retained');
  assert.match(bob.reason, /below minimum/i);
});

test('buildPromotionDecisions retains student when report card is missing', () => {
  const decisions = buildPromotionDecisions({
    enrollments: [{ student_id: 'stu-3', students: { users: { full_name: 'No Card' } } }],
    reportCards: [],
    cycleConfig: { min_average_percentage: 50, min_attendance_percentage: 0 },
  });

  assert.equal(decisions[0].eligible, false);
  assert.equal(decisions[0].status, 'retained');
  assert.match(decisions[0].reason, /missing report card/i);
});
