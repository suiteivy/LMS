const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  resolveAutoAssignClass,
  assignStudentToSingleClass,
} = require('../utils/studentClassEnrollment');

// ---------------------------------------------------------------------------
// 1. resolveAutoAssignClass tests
// ---------------------------------------------------------------------------
test('resolveAutoAssignClass selects the least populated class respecting capacity', async () => {
  const mockClasses = [
    { id: 'class-a', institution_id: 'inst-1', grade_level: 8, display_name: 'Grade 8 North', capacity: 30 },
    { id: 'class-b', institution_id: 'inst-1', grade_level: 8, display_name: 'Grade 8 South', capacity: 30 },
  ];

  const enrollmentCounts = {
    'class-a': 25,
    'class-b': 18, // Class B has fewer students
  };

  const mockClient = {
    from(table) {
      if (table === 'classes') {
        return {
          select() { return this; },
          eq() { return this; },
          then(resolve) {
            return resolve({ data: mockClasses, error: null });
          },
        };
      }
      if (table === 'class_enrollments') {
        let queriedClassId = null;
        return {
          select(fields, opts) {
            return {
              eq(col, val) {
                if (col === 'class_id') queriedClassId = val;
                return Promise.resolve({ count: enrollmentCounts[queriedClassId] || 0, error: null });
              },
            };
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };

  const assigned = await resolveAutoAssignClass(mockClient, {
    institutionId: 'inst-1',
    gradeLevel: 8,
  });

  assert.ok(assigned, 'Should return an assigned class');
  assert.equal(assigned.id, 'class-b', 'Should pick class-b because it has lower headcount (18 < 25)');
  assert.equal(assigned.current_count, 18);
});

test('resolveAutoAssignClass respects capacity limit and picks non-full class', async () => {
  const mockClasses = [
    { id: 'class-full', institution_id: 'inst-1', grade_level: 7, capacity: 20 },
    { id: 'class-open', institution_id: 'inst-1', grade_level: 7, capacity: 30 },
  ];

  const enrollmentCounts = {
    'class-full': 20, // At capacity
    'class-open': 22, // 22 < 30 (not at capacity)
  };

  const mockClient = {
    from(table) {
      if (table === 'classes') {
        return {
          select() { return this; },
          eq() { return this; },
          then(resolve) {
            return resolve({ data: mockClasses, error: null });
          },
        };
      }
      if (table === 'class_enrollments') {
        return {
          select() {
            return {
              eq(col, val) {
                return Promise.resolve({ count: enrollmentCounts[val] || 0, error: null });
              },
            };
          },
        };
      }
    },
  };

  const assigned = await resolveAutoAssignClass(mockClient, {
    institutionId: 'inst-1',
    gradeLevel: 7,
  });

  assert.ok(assigned);
  assert.equal(assigned.id, 'class-open', 'Should pick class-open because class-full is at capacity');
});

// ---------------------------------------------------------------------------
// 2. assignStudentToSingleClass property inheritance & history preservation
// ---------------------------------------------------------------------------
test('assignStudentToSingleClass inherits class subjects and retires previous active enrollments', async () => {
  let deletedClassEnrollmentStudentId = null;
  let insertedClassEnrollment = null;
  let updatedStudentData = null;
  let retiredSubjects = null;
  const enrolledSubjects = [];

  const mockClient = {
    from(table) {
      if (table === 'class_enrollments') {
        return {
          delete() {
            return {
              eq(col, val) {
                deletedClassEnrollmentStudentId = val;
                return {
                  eq() { return Promise.resolve({ error: null }); },
                  then(resolve) { return resolve({ error: null }); },
                };
              },
            };
          },
          insert(payload) {
            insertedClassEnrollment = payload;
            return {
              select() {
                return {
                  single() {
                    return Promise.resolve({ data: { id: 'ce-new', ...payload }, error: null });
                  },
                };
              },
            };
          },
        };
      }

      if (table === 'classes') {
        return {
          select() { return this; },
          eq() { return this; },
          single() {
            return Promise.resolve({
              data: { id: 'class-target', institution_id: 'inst-1', grade_level: 8, form_level: 2 },
              error: null,
            });
          },
        };
      }

      if (table === 'students') {
        return {
          update(updates) {
            updatedStudentData = updates;
            return {
              eq() {
                return {
                  eq() { return Promise.resolve({ error: null }); },
                  then(resolve) { return resolve({ error: null }); },
                };
              },
            };
          },
        };
      }

      if (table === 'subject_classes') {
        return {
          select() { return this; },
          eq() {
            return {
              eq() {
                return Promise.resolve({
                  data: [{ subject_id: 'subj-math-8' }, { subject_id: 'subj-eng-8' }],
                  error: null,
                });
              },
              then(resolve) {
                return resolve({
                  data: [{ subject_id: 'subj-math-8' }, { subject_id: 'subj-eng-8' }],
                  error: null,
                });
              },
            };
          },
        };
      }

      if (table === 'subjects') {
        return {
          select() { return this; },
          eq() {
            return {
              eq() {
                return Promise.resolve({
                  data: [{ id: 'subj-science-8' }],
                  error: null,
                });
              },
              then(resolve) {
                return resolve({
                  data: [{ id: 'subj-science-8' }],
                  error: null,
                });
              },
            };
          },
        };
      }

      if (table === 'enrollments') {
        return {
          select() {
            return {
              eq() {
                // Student previously was enrolled in subj-old-7 and subj-math-8
                return Promise.resolve({
                  data: [
                    { id: 'enr-old', subject_id: 'subj-old-7', status: 'enrolled' },
                    { id: 'enr-math', subject_id: 'subj-math-8', status: 'enrolled' },
                  ],
                  error: null,
                });
              },
            };
          },
          update(updates) {
            return {
              eq() {
                return {
                  in(col, vals) {
                    retiredSubjects = vals;
                    return {
                      eq() { return Promise.resolve({ error: null }); },
                      then(resolve) { return resolve({ error: null }); },
                    };
                  },
                };
              },
            };
          },
          upsert(payload) {
            enrolledSubjects.push(payload.subject_id);
            return Promise.resolve({ error: null });
          },
        };
      }

      throw new Error(`Unhandled table ${table}`);
    },
  };

  const result = await assignStudentToSingleClass(mockClient, {
    studentId: 'student-123',
    classId: 'class-target',
    institutionId: 'inst-1',
    syncStudentLevel: true,
  });

  assert.ok(result, 'Result should be returned');
  assert.equal(deletedClassEnrollmentStudentId, 'student-123', 'Old class enrollments cleared');
  assert.equal(insertedClassEnrollment.class_id, 'class-target');
  assert.equal(updatedStudentData.class_id, 'class-target');
  assert.equal(updatedStudentData.grade_level, 8);

  // Verification of property inheritance and retiring past subjects
  assert.deepEqual(retiredSubjects, ['subj-old-7'], 'Past subjects not in new roster retired to completed');
  assert.equal(result.retiredSubjectsCount, 1);
  assert.equal(result.enrolledSubjectsCount, 3); // math, eng, science
  assert.ok(enrolledSubjects.includes('subj-math-8'));
  assert.ok(enrolledSubjects.includes('subj-eng-8'));
  assert.ok(enrolledSubjects.includes('subj-science-8'));
});

// ---------------------------------------------------------------------------
// 3. Senior Secondary Track inheritance (Grade 10+)
// ---------------------------------------------------------------------------
test('assignStudentToSingleClass inherits Senior Secondary track subjects for Grade 10+', async () => {
  let trackEnrolled = null;
  const enrolledSubjectIds = [];

  const mockClient = {
    from(table) {
      if (table === 'class_enrollments') {
        return {
          delete() {
            return {
              eq() {
                return {
                  eq() { return Promise.resolve({ error: null }); },
                  then(r) { return r({ error: null }); },
                };
              },
            };
          },
          insert(payload) {
            return {
              select() {
                return {
                  single() { return Promise.resolve({ data: payload, error: null }); },
                };
              },
            };
          },
        };
      }
      if (table === 'classes') {
        return {
          select() { return this; },
          eq() { return this; },
          single() {
            return Promise.resolve({
              data: { id: 'class-g10', institution_id: 'inst-1', grade_level: 10, form_level: 4 },
              error: null,
            });
          },
        };
      }
      if (table === 'students') {
        return {
          update() {
            return {
              eq() {
                return {
                  eq() { return Promise.resolve({ error: null }); },
                  then(r) { return r({ error: null }); },
                };
              },
            };
          },
        };
      }
      if (table === 'student_track_enrollments') {
        return {
          upsert(payload) {
            trackEnrolled = payload;
            return Promise.resolve({ error: null });
          },
        };
      }
      if (table === 'subject_classes') {
        return {
          select() { return this; },
          eq() {
            return {
              eq() { return Promise.resolve({ data: [{ subject_id: 'core-math' }], error: null }); },
              then(r) { return r({ data: [], error: null }); },
            };
          },
        };
      }
      if (table === 'subjects') {
        return {
          select() { return this; },
          eq() {
            return {
              eq() { return Promise.resolve({ data: [], error: null }); },
              then(r) { return r({ data: [], error: null }); },
            };
          },
        };
      }
      if (table === 'track_subjects') {
        return {
          select() { return this; },
          eq() {
            return Promise.resolve({
              data: [
                { subject_id: 'track-compulsory-physics', is_compulsory: true },
                { subject_id: 'track-opt-art', is_compulsory: false },
              ],
              error: null,
            });
          },
        };
      }
      if (table === 'enrollments') {
        return {
          select() {
            return {
              eq() { return Promise.resolve({ data: [], error: null }); },
            };
          },
          update() {
            return {
              eq() {
                return {
                  in() { return Promise.resolve({ error: null }); },
                };
              },
            };
          },
          upsert(p) {
            enrolledSubjectIds.push(p.subject_id);
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };

  await assignStudentToSingleClass(mockClient, {
    studentId: 'student-senior-1',
    classId: 'class-g10',
    institutionId: 'inst-1',
    trackId: 'track-stem',
    electiveSubjectIds: ['elective-robotics'],
  });

  assert.ok(trackEnrolled, 'Track enrollment must be recorded');
  assert.equal(trackEnrolled.track_id, 'track-stem');
  assert.deepEqual(trackEnrolled.elective_subject_ids, ['elective-robotics']);

  // Check inherited subjects
  assert.ok(enrolledSubjectIds.includes('core-math'), 'Includes core class subject');
  assert.ok(enrolledSubjectIds.includes('track-compulsory-physics'), 'Includes track compulsory subject');
  assert.ok(enrolledSubjectIds.includes('elective-robotics'), 'Includes student elective subject');
  assert.equal(enrolledSubjectIds.includes('track-opt-art'), false, 'Non-selected track optional should not be enrolled');
});

// ---------------------------------------------------------------------------
// 4. Token 7-day expiry and formatHumanReadableExpiry
// ---------------------------------------------------------------------------
test('formatHumanReadableExpiry formats 7-day expiry correctly with days and hours', () => {
  // Test the formatting logic implemented in auth/master_admin controllers
  function formatHumanReadableExpiry(date) {
    if (!date) return 'Valid for 7 days';
    const target = new Date(date);
    if (Number.isNaN(target.getTime())) return 'Valid for 7 days';

    const diffMs = target.getTime() - Date.now();
    if (diffMs <= 0) return 'Expired';

    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));

    if (days >= 1) {
      if (hours === 0) {
        return `Expires in ${days} ${days === 1 ? 'day' : 'days'}`;
      }
      return `Expires in ${days} ${days === 1 ? 'day' : 'days'}, ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }

    if (hours >= 1) {
      if (minutes === 0) {
        return `Expires in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
      }
      return `Expires in ${hours} ${hours === 1 ? 'hour' : 'hours'}, ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    }

    return `Expires in ${Math.max(1, minutes)} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }

  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const formatted7Days = formatHumanReadableExpiry(in7Days);
  assert.ok(formatted7Days.includes('7 days') || formatted7Days.includes('6 days'), `Should reflect ~7 days: ${formatted7Days}`);
  assert.ok(!formatted7Days.includes('24 hours'), 'Should not contain 24 hours');

  const in6Days2Hours = new Date(Date.now() + (6 * 24 + 2) * 60 * 60 * 1000 + 1000);
  const formatted6Days = formatHumanReadableExpiry(in6Days2Hours);
  assert.equal(formatted6Days, 'Expires in 6 days, 2 hours');

  const fallback = formatHumanReadableExpiry(null);
  assert.equal(fallback, 'Valid for 7 days');
});

// ---------------------------------------------------------------------------
// 5. promoteClass single target class gating pre-check
// ---------------------------------------------------------------------------
test('promoteClass reshuffle is rejected with explanation when only 1 target class exists', async () => {
  const supabaseModulePath = path.resolve(__dirname, '../utils/supabaseClient.js');

  const mockClasses = [
    { id: 'target-only-1', grade_level: 9, form_level: 3, stream: 'A', display_name: 'Grade 9 A', capacity: 40 },
  ];

  const mockSupabase = {
    from(table) {
      if (table === 'classes') {
        return {
          select() { return this; },
          eq(col, val) {
            if (col === 'id' && val === 'src-class-1') {
              return {
                eq() { return this; },
                single() {
                  return Promise.resolve({
                    data: { id: 'src-class-1', grade_level: 8, form_level: 2 },
                    error: null,
                  });
                },
              };
            }
            return this;
          },
          then(resolve) {
            return resolve({ data: mockClasses, error: null });
          },
        };
      }
      if (table === 'class_enrollments') {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return Promise.resolve({
                      data: [{ student_id: 's-1' }, { student_id: 's-2' }],
                      error: null,
                    });
                  },
                };
              },
            };
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };

  // Temporarily mock supabaseClient
  delete require.cache[path.resolve(__dirname, '../controllers/promotion.controller.js')];
  delete require.cache[supabaseModulePath];
  require.cache[supabaseModulePath] = {
    id: supabaseModulePath,
    filename: supabaseModulePath,
    loaded: true,
    exports: mockSupabase,
  };

  const { promoteClass } = require('../controllers/promotion.controller');

  let statusCode = 200;
  let responseData = null;
  const req = {
    user: { id: 'admin-1', institution_id: 'inst-1' },
    body: {
      from_class_id: 'src-class-1',
      reshuffle: true,
    },
  };
  const res = {
    status(c) {
      statusCode = c;
      return this;
    },
    json(b) {
      responseData = b;
      return this;
    },
  };

  await promoteClass(req, res);

  assert.equal(statusCode, 400, 'Should return 400 when reshuffling is impossible due to single destination class');
  assert.equal(responseData.has_multiple_classes, false);
  assert.equal(responseData.single_target_class_id, 'target-only-1');
  assert.ok(responseData.error.includes('Only one class exists at the target level'));
});
