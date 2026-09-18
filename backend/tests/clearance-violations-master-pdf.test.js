const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const clearanceControllerPath = path.resolve(__dirname, '../controllers/clearance.controller.js');
const violationsControllerPath = path.resolve(__dirname, '../controllers/violations.controller.js');
const masterRecordControllerPath = path.resolve(__dirname, '../controllers/masterRecord.controller.js');
const pdfCompilerServicePath = path.resolve(__dirname, '../services/pdfCompiler.service.js');
const supabaseClientPath = path.resolve(__dirname, '../utils/supabaseClient.js');

function createRes() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(key, val) {
      this.headers[key.toLowerCase()] = val;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
  };
}

function createSupabaseMock(resolver) {
  return {
    from(table) {
      const state = {
        table,
        filters: [],
        orders: [],
      };

      const builder = {
        select(columns, options) {
          state.select = { columns, options };
          return this;
        },
        order(column, options) {
          state.orders.push({ column, options });
          return this;
        },
        eq(column, value) {
          state.filters.push({ op: 'eq', column, value });
          return this;
        },
        in(column, values) {
          state.filters.push({ op: 'in', column, values });
          return this;
        },
        neq(column, value) {
          state.filters.push({ op: 'neq', column, value });
          return this;
        },
        gte(column, value) {
          state.filters.push({ op: 'gte', column, value });
          return this;
        },
        lte(column, value) {
          state.filters.push({ op: 'lte', column, value });
          return this;
        },
        is(column, value) {
          state.filters.push({ op: 'is', column, value });
          return this;
        },
        limit(count) {
          state.limit = count;
          return this;
        },
        maybeSingle() {
          state.maybeSingle = true;
          return Promise.resolve(resolver(state));
        },
        single() {
          state.single = true;
          return Promise.resolve(resolver(state));
        },
        then(resolve, reject) {
          return Promise.resolve(resolver(state)).then(resolve, reject);
        },
        insert(data) {
          state.insert = data;
          return {
            select() {
              return {
                single() {
                  return Promise.resolve(resolver(state));
                },
                then(resolve, reject) {
                  return Promise.resolve(resolver(state)).then(resolve, reject);
                }
              };
            },
            then(resolve, reject) {
              return Promise.resolve(resolver(state)).then(resolve, reject);
            }
          };
        },
        update(data) {
          state.update = data;
          return {
            eq(col, val) {
              state.filters.push({ op: 'eq', column: col, value: val });
              return {
                select() {
                  return {
                    single() {
                      return Promise.resolve(resolver(state));
                    },
                    then(resolve, reject) {
                      return Promise.resolve(resolver(state)).then(resolve, reject);
                    }
                  };
                },
                then(resolve, reject) {
                  return Promise.resolve(resolver(state)).then(resolve, reject);
                }
              };
            },
            then(resolve, reject) {
              return Promise.resolve(resolver(state)).then(resolve, reject);
            }
          };
        },
      };

      return builder;
    },
  };
}

// ---------------------------------------------------------------------------
// 1. Clearance Tests
// ---------------------------------------------------------------------------
test('Clearance: Graduating reason blocked for student not in highest level', async () => {
  const originalSupabase = require(supabaseClientPath);

  const mockSupabase = createSupabaseMock((state) => {
    if (state.table === 'users') {
      return {
        data: { id: 'student-u-1', full_name: 'Student One', role: 'student', institution_id: 'inst-1' },
        error: null,
      };
    }
    if (state.table === 'students') {
      return {
        data: {
          id: 'student-rec-1',
          user_id: 'student-u-1',
          grade_level: 'Grade 7',
          class: { id: 'c-1', display_name: 'Grade 7 West', is_final_level: false },
        },
        error: null,
      };
    }
    return { data: [], error: null };
  });

  require.cache[supabaseClientPath] = { exports: mockSupabase };
  delete require.cache[clearanceControllerPath];
  const clearanceController = require(clearanceControllerPath);

  const req = {
    body: {
      user_ids: ['student-u-1'],
      reason_category: 'graduation',
    },
    institution_id: 'inst-1',
    user: { id: 'admin-1', role: 'admin' },
  };
  const res = createRes();

  await clearanceController.checkEligibility(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.eligible, false);
  assert.equal(res.body?.results?.[0]?.valid, false);
  assert.match(res.body?.results?.[0]?.error, /designated final\/graduating level/i);

  require.cache[supabaseClientPath] = { exports: originalSupabase };
  delete require.cache[clearanceControllerPath];
});

test('Clearance: Prevents concurrent clearance if one is already active', async () => {
  const originalSupabase = require(supabaseClientPath);

  const mockSupabase = createSupabaseMock((state) => {
    if (state.table === 'users') {
      return {
        data: { id: 'student-u-1', full_name: 'Jane Doe', role: 'student', institution_id: 'inst-1' },
        error: null,
      };
    }
    if (state.table === 'clearance_processes') {
      return {
        data: { id: 'active-clearance-99', status: 'in_progress', initiated_by: 'admin' },
        error: null,
      };
    }
    return { data: null, error: null };
  });

  require.cache[supabaseClientPath] = { exports: mockSupabase };
  delete require.cache[clearanceControllerPath];
  const clearanceController = require(clearanceControllerPath);

  const req = {
    body: {
      user_ids: ['student-u-1'],
      reason_category: 'withdrawal',
    },
    institution_id: 'inst-1',
    user: { id: 'admin-1', role: 'admin' },
  };
  const res = createRes();

  await clearanceController.initiateClearance(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body?.error, /active clearance process is already in progress/i);

  require.cache[supabaseClientPath] = { exports: originalSupabase };
  delete require.cache[clearanceControllerPath];
});

// ---------------------------------------------------------------------------
// 2. Student Violations Tests
// ---------------------------------------------------------------------------
test('Violations: Recording infraction with expulsion auto-expels student and deactivates user', async () => {
  const originalSupabase = require(supabaseClientPath);
  let studentUpdate = null;
  let userUpdate = null;
  let createdViolation = null;

  const mockSupabase = createSupabaseMock((state) => {
    if (state.table === 'students') {
      if (state.update) {
        studentUpdate = state.update;
        return { data: { id: 'stud-1', ...state.update }, error: null };
      }
      return {
        data: { id: 'stud-1', user_id: 'user-stud-1', admission_number: 'ADM-001' },
        error: null,
      };
    }
    if (state.table === 'student_violations') {
      if (state.insert) {
        createdViolation = state.insert;
        return { data: { id: 'viol-1', ...state.insert }, error: null };
      }
    }
    if (state.table === 'users') {
      if (state.update) {
        userUpdate = state.update;
        return { data: { id: 'user-stud-1', ...state.update }, error: null };
      }
    }
    return { data: null, error: null };
  });

  require.cache[supabaseClientPath] = { exports: mockSupabase };
  delete require.cache[violationsControllerPath];
  const violationsController = require(violationsControllerPath);

  const req = {
    body: {
      student_id: 'stud-1',
      title: 'Critical Property Vandalism',
      description: 'Intentionally destroyed institutional lab assets.',
      severity: 'critical',
      action_taken: 'expulsion',
      action_details: { reason: 'Gross misconduct' },
    },
    user: { id: 'admin-actor-1', role: 'admin', institution_id: 'inst-1' },
  };
  const res = createRes();

  await violationsController.createViolation(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body?.success, true);
  assert.equal(createdViolation?.action_taken, 'expulsion');
  assert.equal(studentUpdate?.enrollment_status, 'expelled');
  assert.equal(userUpdate?.is_active, false);

  require.cache[supabaseClientPath] = { exports: originalSupabase };
  delete require.cache[violationsControllerPath];
});

test('Violations: Resolving infraction marks status as resolved with audit note', async () => {
  const originalSupabase = require(supabaseClientPath);
  let updatedViolation = null;

  const mockSupabase = createSupabaseMock((state) => {
    if (state.table === 'student_violations') {
      if (state.update) {
        updatedViolation = state.update;
        return { data: { id: 'viol-123', ...state.update }, error: null };
      }
      return {
        data: { id: 'viol-123', status: 'active', student_id: 'stud-1' },
        error: null,
      };
    }
    return { data: null, error: null };
  });

  require.cache[supabaseClientPath] = { exports: mockSupabase };
  delete require.cache[violationsControllerPath];
  const violationsController = require(violationsControllerPath);

  const req = {
    params: { id: 'viol-123' },
    body: {
      resolution_notes: 'Community service completed and counseling session attended.',
    },
    user: { id: 'admin-actor-1', role: 'admin', institution_id: 'inst-1' },
  };
  const res = createRes();

  await violationsController.resolveViolation(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.success, true);
  assert.equal(updatedViolation?.status, 'resolved');
  assert.equal(updatedViolation?.resolved_by, 'admin-actor-1');
  assert.match(updatedViolation?.resolution_notes, /counseling session attended/i);

  require.cache[supabaseClientPath] = { exports: originalSupabase };
  delete require.cache[violationsControllerPath];
});

// ---------------------------------------------------------------------------
// 3. Master Record Role-Scoping Tests
// ---------------------------------------------------------------------------
test('Master Record: Admin role receives complete aggregate dossier', async () => {
  const originalSupabase = require(supabaseClientPath);

  const mockSupabase = createSupabaseMock((state) => {
    if (state.table === 'users') {
      return {
        data: {
          id: 'target-student-user',
          institution_id: 'inst-1',
          first_name: 'John',
          last_name: 'Doe',
          full_name: 'John Doe',
          role: 'student',
          is_active: true,
        },
        error: null,
      };
    }
    if (state.table === 'students') {
      return {
        data: {
          id: 'target-student-rec',
          user_id: 'target-student-user',
          class_id: 'class-1',
          admission_number: 'ADM-101',
          fee_balance: 450.00,
          classes: { id: 'class-1', name: 'Form 4 Blue', grade_level: 'Form 4' },
        },
        error: null,
      };
    }
    if (state.table === 'attendance') {
      return {
        data: [{ id: 'att-1', status: 'present' }],
        count: 1,
        error: null,
      };
    }
    if (state.table === 'student_violations') {
      return {
        data: [{ id: 'viol-1', severity: 'minor' }],
        error: null,
      };
    }
    if (state.table === 'clearance_processes') {
      return {
        data: [{ id: 'clr-1', status: 'completed' }],
        error: null,
      };
    }
    if (state.table === 'parent_student_links') {
      return {
        data: [{ id: 'ps-1', relationship: 'Mother', parent: { full_name: 'Jane Doe' } }],
        error: null,
      };
    }
    return { data: [], error: null };
  });

  require.cache[supabaseClientPath] = { exports: mockSupabase };
  delete require.cache[masterRecordControllerPath];
  const masterRecordController = require(masterRecordControllerPath);

  const req = {
    params: { id: 'target-student-user' },
    user: { id: 'admin-1', role: 'admin', institution_id: 'inst-1' },
  };
  const res = createRes();

  await masterRecordController.getMasterRecord(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.success, true);
  assert.equal(res.body?.data?.access_level, 'admin');
  assert.equal(res.body?.data?.finance?.fee_balance, 450.00);
  assert.equal(res.body?.data?.guardians?.length, 1);
  assert.equal(res.body?.data?.disciplinary?.length, 1);

  require.cache[supabaseClientPath] = { exports: originalSupabase };
  delete require.cache[masterRecordControllerPath];
});

test('Master Record: Subject Teacher is restricted from fee balance and guardians', async () => {
  const originalSupabase = require(supabaseClientPath);

  const mockSupabase = createSupabaseMock((state) => {
    if (state.table === 'users') {
      return {
        data: {
          id: 'target-student-user',
          institution_id: 'inst-1',
          first_name: 'John',
          last_name: 'Doe',
          full_name: 'John Doe',
          role: 'student',
          is_active: true,
        },
        error: null,
      };
    }
    if (state.table === 'teachers') {
      return {
        data: { id: 'teacher-rec-1' },
        error: null,
      };
    }
    if (state.table === 'students') {
      return {
        data: {
          id: 'target-student-rec',
          user_id: 'target-student-user',
          class_id: 'class-other',
          admission_number: 'ADM-101',
          fee_balance: 999.00,
          classes: { id: 'class-other', name: 'Form 2 Red', grade_level: 'Form 2' },
        },
        error: null,
      };
    }
    if (state.table === 'classes') {
      // class_teacher_id does NOT match this teacher
      return {
        data: { id: 'class-other', class_teacher_id: 'other-teacher-id' },
        error: null,
      };
    }
    if (state.table === 'subject_teachers') {
      // teaches this student
      return {
        data: [{ subject_id: 'sub-math' }],
        error: null,
      };
    }
    if (state.table === 'attendance') {
      return {
        data: [{ id: 'att-1', status: 'present' }],
        count: 1,
        error: null,
      };
    }
    return { data: [], error: null };
  });

  require.cache[supabaseClientPath] = { exports: mockSupabase };
  delete require.cache[masterRecordControllerPath];
  const masterRecordController = require(masterRecordControllerPath);

  const req = {
    params: { id: 'target-student-user' },
    user: { id: 'teacher-user-1', role: 'teacher', institution_id: 'inst-1' },
  };
  const res = createRes();

  await masterRecordController.getMasterRecord(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.success, true);
  assert.equal(res.body?.data?.access_level, 'subject_teacher');
  // Strict role boundaries: Subject Teacher cannot see finance or guardians
  assert.equal(res.body?.data?.finance, null);
  assert.deepEqual(res.body?.data?.guardians, []);
  assert.deepEqual(res.body?.data?.disciplinary, []);

  require.cache[supabaseClientPath] = { exports: originalSupabase };
  delete require.cache[masterRecordControllerPath];
});

// ---------------------------------------------------------------------------
// 4. Institutional Summary PDF Endpoint Test
// ---------------------------------------------------------------------------
test('PDF: Institutional Summary PDF endpoint invokes vector ReportLab compilation', async () => {
  const originalSupabase = require(supabaseClientPath);
  const originalPdfCompiler = require(pdfCompilerServicePath);
  let compiledPayload = null;

  const mockSupabase = createSupabaseMock((state) => {
    if (state.table === 'users') {
      return {
        data: {
          id: 'user-stud-1',
          full_name: 'Grace Hopper',
          email: 'grace@school.edu',
          role: 'student',
          created_at: '2025-01-01',
          phone: '+254700000000',
        },
        error: null,
      };
    }
    if (state.table === 'institutions') {
      return {
        data: {
          name: 'Pinnacle High Academy',
          address: 'Nairobi, Kenya',
          email: 'admin@pinnacle.edu',
          phone: '+254711111111',
        },
        error: null,
      };
    }
    if (state.table === 'students') {
      return {
        data: {
          id: 'stud-1',
          admission_number: 'ADM-555',
          enrollment_status: 'active',
          classes: { name: 'Grade 10 West', grade_level: 'Grade 10' },
        },
        error: null,
      };
    }
    if (state.table === 'student_violations') {
      return { count: 0, error: null };
    }
    if (state.table === 'clearance_processes') {
      return { data: null, error: null };
    }
    return { data: null, error: null };
  });

  const mockPdfCompiler = {
    compile: async (documentType, data) => {
      compiledPayload = { documentType, data };
      return Buffer.from('%PDF-1.4 mock institutional summary vector PDF content');
    },
    compileVectorPdf: async (params) => {
      compiledPayload = params;
      return Buffer.from('%PDF-1.4 mock institutional summary vector PDF content');
    },
    compilePdfBuffer: async (params) => {
      compiledPayload = params;
      return Buffer.from('%PDF-1.4 mock institutional summary vector PDF content');
    }
  };

  require.cache[supabaseClientPath] = { exports: mockSupabase };
  require.cache[pdfCompilerServicePath] = { exports: mockPdfCompiler };
  delete require.cache[masterRecordControllerPath];
  const masterRecordController = require(masterRecordControllerPath);

  const req = {
    params: { id: 'user-stud-1' },
    user: { id: 'admin-1', role: 'admin', institution_id: 'inst-1' },
  };
  const res = createRes();

  await masterRecordController.getInstitutionalSummaryPdf(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['content-type'], 'application/pdf');
  assert.equal(compiledPayload?.documentType, 'institutional_summary');
  assert.equal(compiledPayload?.data?.full_name, 'Grace Hopper');
  assert.equal(compiledPayload?.data?.institution_name, 'Pinnacle High Academy');

  require.cache[supabaseClientPath] = { exports: originalSupabase };
  require.cache[pdfCompilerServicePath] = { exports: originalPdfCompiler };
  delete require.cache[masterRecordControllerPath];
});

