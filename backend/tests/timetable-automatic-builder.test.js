const test = require('node:test');
const assert = require('node:assert/strict');
const { solveTimetable, runPythonSolver, runJsFallbackSolver } = require('../services/timetableSolver.service');
const { checkConflicts } = require('../controllers/timetable.controller');
const supabase = require('../utils/supabaseClient');

test('Timetable Automatic Builder - Solvers & Conflict Engine', async (t) => {
  await t.test('runJsFallbackSolver generates valid non-conflicting schedule', () => {
    const input = {
      days: ['Monday', 'Tuesday', 'Wednesday'],
      periods: [
        { period_number: 1, start_time: '08:00', end_time: '08:45', is_break: false },
        { period_number: 2, start_time: '08:45', end_time: '09:30', is_break: false },
        { period_number: 3, start_time: '09:30', end_time: '10:00', is_break: true }
      ],
      classes: [
        { id: 'c1', name: 'Grade 4 East' },
        { id: 'c2', name: 'Grade 4 West' }
      ],
      teachers: [
        { id: 't1', name: 'Teacher Alice' },
        { id: 't2', name: 'Teacher Bob' }
      ],
      subject_requirements: [
        { class_id: 'c1', subject_id: 's1', subject_name: 'Math', periods_per_week: 2, eligible_teachers: ['t1'], max_per_day: 1 },
        { class_id: 'c2', subject_id: 's2', subject_name: 'Science', periods_per_week: 2, eligible_teachers: ['t2'], max_per_day: 1 }
      ]
    };

    const res = runJsFallbackSolver(input);
    assert.equal(res.success, true);
    assert.equal(res.entries.length, 4);

    // Verify room_number represents class identity
    const c1Entries = res.entries.filter(e => e.class_id === 'c1');
    assert.equal(c1Entries.length, 2);
    assert.equal(c1Entries[0].room_number, 'Grade 4 East');

    // Verify no teacher double booking
    for (let i = 0; i < res.entries.length; i++) {
      for (let j = i + 1; j < res.entries.length; j++) {
        const e1 = res.entries[i];
        const e2 = res.entries[j];
        if (e1.day_of_week === e2.day_of_week && e1.period_number === e2.period_number) {
          assert.notEqual(e1.teacher_id, e2.teacher_id, 'Teachers cannot double book');
          assert.notEqual(e1.class_id, e2.class_id, 'Classes cannot double book');
        }
      }
    }
  });

  await t.test('Python MILP solver schedules multiple subjects across distinct teachers and classes', async () => {
    const input = {
      days: ['Monday', 'Tuesday'],
      periods: [
        { period_number: 1, start_time: '08:00', end_time: '08:45', is_break: false },
        { period_number: 2, start_time: '08:45', end_time: '09:30', is_break: false }
      ],
      classes: [
        { id: 'c_senior_a', name: 'Grade 10 STEM A' },
        { id: 'c_senior_b', name: 'Grade 10 Arts B' }
      ],
      teachers: [
        { id: 't_phys', name: 'Physics Teacher' },
        { id: 't_art', name: 'Arts Teacher' }
      ],
      subject_requirements: [
        {
          class_id: 'c_senior_a',
          subject_id: 's_phys',
          subject_name: 'Physics',
          category: 'Sciences',
          periods_per_week: 2,
          eligible_teachers: ['t_phys'],
          allow_double: false,
          max_per_day: 1
        },
        {
          class_id: 'c_senior_b',
          subject_id: 's_art',
          subject_name: 'Fine Art',
          category: 'Creative Arts',
          periods_per_week: 2,
          eligible_teachers: ['t_art'],
          allow_double: false,
          max_per_day: 1
        }
      ],
      senior_secondary_tracks: []
    };

    const res = await solveTimetable(input);
    assert.equal(res.success, true);
    assert.equal(res.entries.length, 4);

    const physEntries = res.entries.filter(e => e.subject_id === 's_phys');
    const artEntries = res.entries.filter(e => e.subject_id === 's_art');
    assert.equal(physEntries.length, 2);
    assert.equal(artEntries.length, 2);

    for (const pe of physEntries) {
      assert.equal(pe.teacher_id, 't_phys');
      assert.equal(pe.class_id, 'c_senior_a');
    }
    for (const ae of artEntries) {
      assert.equal(ae.teacher_id, 't_art');
      assert.equal(ae.class_id, 'c_senior_b');
    }
  });

  await t.test('PuLP/JS Solver returns structured diagnostics when constraints are infeasible', async () => {
    // 5 periods requested for class, but only 2 slots total available
    const infeasibleInput = {
      days: ['Monday'],
      periods: [
        { period_number: 1, start_time: '08:00', end_time: '08:45', is_break: false },
        { period_number: 2, start_time: '08:45', end_time: '09:30', is_break: false }
      ],
      classes: [{ id: 'c1', name: 'Grade 4 East' }],
      teachers: [{ id: 't1', name: 'Teacher Alice' }],
      subject_requirements: [
        { class_id: 'c1', subject_id: 's1', subject_name: 'Math', periods_per_week: 5, eligible_teachers: ['t1'] }
      ]
    };

    const res = await solveTimetable(infeasibleInput);
    assert.equal(res.success, false);
    assert.ok(res.diagnostics && res.diagnostics.length > 0);
    assert.match(res.diagnostics[0], /requires 5 periods/i);
  });

  await t.test('Room collision logic is removed - room_number represents class label', async () => {
    // Stub supabase.from('timetables')
    const originalFrom = supabase.from;
    try {
      supabase.from = (table) => {
        if (table === 'timetables') {
          const fakeResult = {
            data: [
              {
                id: 'existing-1',
                class_id: 'class-A',
                subject_id: 'sub-1',
                teacher_id: 'teacher-1',
                start_time: '08:00:00',
                end_time: '08:45:00',
                room_number: 'Grade 4 East'
              }
            ]
          };
          const chain = {
            then: (resolve) => resolve(fakeResult),
            neq: () => Promise.resolve(fakeResult)
          };
          return {
            select: () => ({
              eq: () => ({
                eq: () => chain
              })
            })
          };
        }
        return originalFrom.call(supabase, table);
      };

      // An entry for a DIFFERENT class, DIFFERENT teacher, but with the same room_number string
      // Under the old bug, this would trigger "Room Grade 4 East is already booked".
      // Under the new requirement, room collision is removed because room_number is the class's identity!
      const issues = await checkConflicts(
        {
          class_id: 'class-B',
          subject_id: 'sub-2',
          teacher_id: 'teacher-2',
          day_of_week: 'Monday',
          start_time: '08:00',
          end_time: '08:45'
        },
        'inst-123'
      );

      assert.equal(issues.length, 0, 'No conflict should be triggered for room sharing');

      // However, if the SAME teacher teaches class-B at the same time:
      const teacherClashIssues = await checkConflicts(
        {
          class_id: 'class-B',
          subject_id: 'sub-2',
          teacher_id: 'teacher-1', // same teacher!
          day_of_week: 'Monday',
          start_time: '08:00',
          end_time: '08:45'
        },
        'inst-123'
      );

      assert.equal(teacherClashIssues.length, 1);
      assert.match(teacherClashIssues[0], /assigned teacher is already teaching another class/i);
    } finally {
      supabase.from = originalFrom;
    }
  });

  await t.test('getTimetableReadiness detects unmet prerequisites when no classes exist', async () => {
    const { getTimetableReadiness } = require('../controllers/timetable.controller');
    const originalFrom = supabase.from;
    try {
      supabase.from = (table) => {
        const chain = {
          then: (resolve) => resolve({ data: [], error: null }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          single: () => Promise.resolve({ data: null, error: null })
        };
        return {
          select: () => ({
            eq: () => chain
          })
        };
      };

      let responseBody = null;
      let statusCode = 200;
      const mockReq = { institution_id: 'inst-test-123' };
      const mockRes = {
        status: (code) => { statusCode = code; return mockRes; },
        json: (data) => { responseBody = data; return mockRes; }
      };

      await getTimetableReadiness(mockReq, mockRes);
      assert.equal(statusCode, 200);
      assert.equal(responseBody.ready, false);
      assert.ok(responseBody.unmet_prerequisites.length > 0);
      const classCheck = responseBody.checks.find(c => c.key === 'classes');
      assert.equal(classCheck.passed, false);
    } finally {
      supabase.from = originalFrom;
    }
  });

  await t.test('getTimetableConfig returns sensible defaults when none saved yet', async () => {
    const { getTimetableConfig } = require('../controllers/timetable.controller');
    const originalFrom = supabase.from;
    try {
      supabase.from = (table) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null })
          })
        })
      });

      let responseBody = null;
      const mockReq = { institution_id: 'inst-test-123' };
      const mockRes = {
        status: () => mockRes,
        json: (data) => { responseBody = data; return mockRes; }
      };

      await getTimetableConfig(mockReq, mockRes);
      assert.ok(responseBody);
      assert.equal(responseBody.institution_id, 'inst-test-123');
      assert.ok(Array.isArray(responseBody.days));
      assert.ok(responseBody.days.includes('Monday'));
      assert.ok(Array.isArray(responseBody.periods));
      assert.equal(responseBody.periods.length, 10);
    } finally {
      supabase.from = originalFrom;
    }
  });
});
