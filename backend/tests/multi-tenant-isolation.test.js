const test = require('node:test');
const assert = require('node:assert/strict');
const supabase = require('../utils/supabaseClient.js');
const {
  runWithTenantContext,
  getTenantContext,
  runWithBypassTenantScope,
} = require('../utils/tenantContext.js');
const { generateStoragePath } = require('../services/upload.service.js');
const { runDataRetentionCleanup } = require('../services/dataRetention.service.js');

const INSTITUTION_A = '11111111-1111-4111-8111-111111111111';
const INSTITUTION_B = '22222222-2222-4222-8222-222222222222';
const STUDENT_B_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const REPORT_CARD_B_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const INVOICE_B_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const RESOURCE_B_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

test('Multi-Tenancy 1: Student records isolation on direct ID lookup', async () => {
  await runWithTenantContext({ institution_id: INSTITUTION_A, userRole: 'admin' }, async () => {
    // Attempt to lookup Student B directly by primary key ID
    const query = supabase
      .from('students')
      .select('id, user_id, status')
      .eq('id', STUDENT_B_ID);

    // Verify URL contains enforced institution_id of Tenant A
    const url = new URL(query.url.toString());
    assert.equal(url.searchParams.get('institution_id'), `eq.${INSTITUTION_A}`);
    assert.equal(url.searchParams.get('id'), `eq.${STUDENT_B_ID}`);

    // Execute query: should return empty (0 matching records because student B is in institution B)
    const { data, error } = await query;
    assert.equal(error, null);
    assert.deepEqual(data, []);
  });
});

test('Multi-Tenancy 2: Student mutation isolation (prevent updating or deleting other tenant)', async () => {
  await runWithTenantContext({ institution_id: INSTITUTION_A, userRole: 'admin' }, async () => {
    // Attempt cross-tenant update on Student B
    const updateQuery = supabase
      .from('students')
      .update({ admission_number: 'HACKED-999' })
      .eq('id', STUDENT_B_ID);

    const updateUrl = new URL(updateQuery.url.toString());
    assert.equal(updateUrl.searchParams.get('institution_id'), `eq.${INSTITUTION_A}`);
    assert.equal(updateUrl.searchParams.get('id'), `eq.${STUDENT_B_ID}`);

    // Attempt cross-tenant delete on Student B
    const deleteQuery = supabase
      .from('students')
      .delete()
      .eq('id', STUDENT_B_ID);

    const deleteUrl = new URL(deleteQuery.url.toString());
    assert.equal(deleteUrl.searchParams.get('institution_id'), `eq.${INSTITUTION_A}`);
    assert.equal(deleteUrl.searchParams.get('id'), `eq.${STUDENT_B_ID}`);
  });
});

test('Multi-Tenancy 3: Grades & Report cards isolation (including child report_card_items)', async () => {
  await runWithTenantContext({ institution_id: INSTITUTION_A, userRole: 'teacher' }, async () => {
    // Query report cards
    const reportQuery = supabase
      .from('report_cards')
      .select('*')
      .eq('id', REPORT_CARD_B_ID);

    assert.equal(reportQuery.url.searchParams.get('institution_id'), `eq.${INSTITUTION_A}`);

    // Query newly migrated child table report_card_items
    const itemsQuery = supabase
      .from('report_card_items')
      .select('*')
      .eq('report_card_id', REPORT_CARD_B_ID);

    assert.equal(itemsQuery.url.searchParams.get('institution_id'), `eq.${INSTITUTION_A}`);

    // Query grade_entries
    const gradeQuery = supabase
      .from('grade_entries')
      .select('*')
      .eq('student_id', STUDENT_B_ID);

    assert.equal(gradeQuery.url.searchParams.get('institution_id'), `eq.${INSTITUTION_A}`);
  });
});

test('Multi-Tenancy 4: Attendance & Timetable isolation across tenants', async () => {
  await runWithTenantContext({ institution_id: INSTITUTION_A, userRole: 'admin' }, async () => {
    // Attendance query
    const attQuery = supabase
      .from('attendance')
      .select('*')
      .eq('student_id', STUDENT_B_ID);

    assert.equal(attQuery.url.searchParams.get('institution_id'), `eq.${INSTITUTION_A}`);

    // Teacher attendance query
    const teachAttQuery = supabase
      .from('teacher_attendance')
      .select('*');

    assert.equal(teachAttQuery.url.searchParams.get('institution_id'), `eq.${INSTITUTION_A}`);

    // Timetables query
    const timetableQuery = supabase
      .from('timetables')
      .select('*');

    assert.equal(timetableQuery.url.searchParams.get('institution_id'), `eq.${INSTITUTION_A}`);
  });
});

test('Multi-Tenancy 5: Financial records & invoices isolation', async () => {
  await runWithTenantContext({ institution_id: INSTITUTION_A, userRole: 'bursar' }, async () => {
    // Student fee invoice query
    const invQuery = supabase
      .from('student_fee_invoices')
      .select('*')
      .eq('id', INVOICE_B_ID);

    assert.equal(invQuery.url.searchParams.get('institution_id'), `eq.${INSTITUTION_A}`);

    // Financial transactions query
    const txQuery = supabase
      .from('financial_transactions')
      .select('*');

    assert.equal(txQuery.url.searchParams.get('institution_id'), `eq.${INSTITUTION_A}`);

    // Payments query
    const payQuery = supabase
      .from('payments')
      .select('*');

    assert.equal(payQuery.url.searchParams.get('institution_id'), `eq.${INSTITUTION_A}`);
  });
});

test('Multi-Tenancy 6: Resource Vault & Storage isolation', async () => {
  await runWithTenantContext({ institution_id: INSTITUTION_A, userRole: 'teacher' }, async () => {
    // Resources query
    const resQuery = supabase
      .from('resources')
      .select('*')
      .eq('id', RESOURCE_B_ID);

    assert.equal(resQuery.url.searchParams.get('institution_id'), `eq.${INSTITUTION_A}`);

    // Storage path generation strictly prefixes with institution_id
    const storagePath = generateStoragePath({
      institutionId: INSTITUTION_A,
      category: 'resources',
      fileName: 'exam_review.pdf'
    });

    assert.ok(storagePath.startsWith(`${INSTITUTION_A}/resources/`), `Expected storage path to begin with ${INSTITUTION_A}`);
    assert.ok(!storagePath.includes(INSTITUTION_B));
  });
});

test('Multi-Tenancy 7: Parameter tampering & spoofing defenses', async () => {
  await runWithTenantContext({ institution_id: INSTITUTION_A, userRole: 'admin' }, async () => {
    // 1. Attempt to spoof institution_id via .eq() filter
    const spoofFilter = supabase
      .from('classes')
      .select('*')
      .eq('institution_id', INSTITUTION_B); // Hacker attempts to filter for Institution B

    // Proxy must neutralize the attempt and keep Institution A enforced
    assert.equal(spoofFilter.url.searchParams.get('institution_id'), `eq.${INSTITUTION_A}`);

    // 2. Attempt to spoof institution_id in insert payload
    const insertPayload = {
      name: 'Malicious Class',
      institution_id: INSTITUTION_B // Attempt to inject record into Institution B
    };

    supabase.from('classes').insert(insertPayload);
    // Payload must be rewritten to authenticated tenant
    assert.equal(insertPayload.institution_id, INSTITUTION_A);

    // 3. Attempt to reassign institution_id in update payload
    const updatePayload = {
      name: 'Renamed Class',
      institution_id: INSTITUTION_B // Attempt to reassign to Institution B
    };

    const updateAttempt = supabase.from('classes').update(updatePayload).eq('id', 'class-123');
    assert.equal(updatePayload.institution_id, INSTITUTION_A);
    assert.equal(updateAttempt.url.searchParams.get('institution_id'), `eq.${INSTITUTION_A}`);

    // 4. Attempt to query institutions table across tenants
    const instQuery = supabase
      .from('institutions')
      .select('*')
      .eq('id', INSTITUTION_B);

    assert.equal(instQuery.url.searchParams.get('id'), `eq.${INSTITUTION_A}`);
  });
});

test('Multi-Tenancy 8: Master Admin isolation vs school operational endpoints', async () => {
  const reportsController = require('../controllers/reports.controller.js');

  // Master Admin attempting to fetch school-level reports without specifying an institution
  const req = {
    user: { id: 'master-1', role: 'master_admin', institution_id: null },
    query: {},
  };
  let statusCode = null;
  let responseBody = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    }
  };

  await reportsController.getReports(req, res);
  assert.equal(statusCode, 400);
  assert.equal(responseBody.message, 'Institution ID is required for school-level academic reports');
});

test('Multi-Tenancy 9: Background job per-institution tenant isolation', async () => {
  // Test runDataRetentionCleanup with explicit institution ID
  const result = await runDataRetentionCleanup(INSTITUTION_A);
  assert.ok(typeof result.student_attendance_purged === 'number');
  assert.ok(typeof result.academic_reports_archived === 'number');
});
