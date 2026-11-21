const test = require('node:test');
const assert = require('node:assert/strict');

const dataCatalogService = require('../services/dataCatalog.service.js');
const queryCompilerService = require('../services/queryCompiler.service.js');
const { compilePdfBuffer } = require('../services/pdfCompiler.service.js');

test('Data Catalog: Scopes allowed datasets by section context', async () => {
  // Finance context should allow fees_ledger and students, but NOT results
  const financeCatalog = await dataCatalogService.getCatalogForContext({
    institutionId: '11111111-1111-1111-1111-111111111111',
    userRole: 'teacher',
    permissions: ['finance:view'],
    sectionContext: 'finance',
  });

  const datasetCodes = financeCatalog.datasets.map(d => d.code);
  assert.ok(datasetCodes.includes('fees_ledger'), 'fees_ledger should be present in finance context');
  assert.ok(!datasetCodes.includes('results'), 'results should NOT be present in finance context without permission');
});

test('Data Catalog: Prevents indirect data leaks (blocks filtering or sorting by hidden fields)', async () => {
  // Attempting to query with a hidden or unpermitted field
  const validation = await dataCatalogService.validateQuerySpec({
    spec: {
      dataset: 'students',
      columns: ['full_name'],
      filters: [{ field: 'date_of_birth', operator: 'eq', value: '2010-01-01' }], // sensitive field without sensitive_data:view permission
    },
    userRole: 'teacher',
    permissions: ['students:view'],
    sectionContext: 'students',
    institutionId: '11111111-1111-1111-1111-111111111111',
  });

  assert.strictEqual(validation.isValid, false, 'Should reject filter on sensitive/hidden field');
  assert.ok(validation.errors.some(e => e.includes('not available for filtering')), 'Should produce generic unavailable error rather than leaking existence');
});

test('Query Compiler: Mandatory institution_id binding & parameterization', () => {
  const spec = {
    dataset: 'students',
    columns: ['full_name', 'admission_number', 'status'],
    filters: [{ field: 'status', operator: 'eq', value: 'active' }],
    orderBy: [{ field: 'full_name', direction: 'ASC' }],
  };

  const compiled = queryCompilerService.compile(spec, 'inst-uuid-1234');
  assert.ok(compiled.sql.includes('t.institution_id = $1'), 'SQL must enforce institution_id as $1');
  assert.strictEqual(compiled.params[0], 'inst-uuid-1234');
  assert.strictEqual(compiled.params[1], 'active');
  assert.ok(compiled.countSql.includes('COUNT(*)'), 'Count SQL generated');
});

test('Query Compiler: Period selection supports multi-year combining and ranges', () => {
  const spec = {
    dataset: 'fees_ledger',
    columns: ['item_name', 'amount_due'],
    period: {
      type: 'multi',
      years: ['2013', '2016'],
    },
  };

  const compiled = queryCompilerService.compile(spec, 'inst-uuid-1234');
  assert.ok(compiled.params.includes('2013'));
  assert.ok(compiled.params.includes('2016'));
  assert.ok(compiled.filterSummary.includes('Years: 2013, 2016'));
});

test('Query Compiler: Logic modifier "only_transport" compiles NOT EXISTS clause', () => {
  const spec = {
    dataset: 'fees_ledger',
    columns: ['item_name', 'amount_paid'],
    logicModifier: 'only_transport',
  };

  const compiled = queryCompilerService.compile(spec, 'inst-uuid-1234');
  assert.ok(compiled.sql.includes('transport'), 'Must filter by transport');
  assert.ok(compiled.sql.includes('NOT EXISTS'), 'Must verify student has no payments for non-transport items');
  assert.ok(compiled.filterSummary.includes('Transport ONLY'));
});

test('PDF Compiler: Compiles custom_report_summary document type', async () => {
  const pdfBuffer = await compilePdfBuffer({
    document_type: 'custom_report_summary',
    data: {
      institution_name: 'Test Academy',
      title: 'TRANSPORT ONLY PAYERS SUMMARY',
      section_context: 'finance',
      period_summary: 'Term 2, 2025',
      generated_by: 'bursar@testacademy.ac.ke',
      filter_summary: 'Students who paid for transport and have no payment for any other fee item',
      control_totals: { total_rows: 2, preview_rows: 2 },
      columns: [
        { key: 'student_name', label: 'STUDENT NAME' },
        { key: 'amount_paid', label: 'AMOUNT PAID' },
      ],
      rows: [
        { student_name: 'Alice Wanjiku', amount_paid: 'KES 4,500' },
        { student_name: 'Brian Kiprop', amount_paid: 'KES 4,500' },
      ],
    },
  });

  assert.ok(Buffer.isBuffer(pdfBuffer));
  assert.ok(pdfBuffer.length > 500);
  assert.strictEqual(pdfBuffer.slice(0, 4).toString(), '%PDF');
});

test('PDF Compiler: Compiles records_dossier document type', async () => {
  const pdfBuffer = await compilePdfBuffer({
    document_type: 'records_dossier',
    data: {
      institution_name: 'Test Academy',
      person_type: 'student',
      person_name: 'Alice Wanjiku',
      identifier: 'ADM-2024-001',
      upi: 'UPI-KEN-998822',
      status: 'active',
      generated_by: 'registrar@testacademy.ac.ke',
      justification_reason: 'Annual Ministry Education Audit',
      excluded_sections: [{ section: 'finance', reason: 'Not included due to your role permissions' }],
      academic_records: [
        { academic_year: '2024', term: 'Term 1', subject: 'Mathematics', score: '88', grade: 'EE' },
      ],
      financial_summary: null,
      documents_issued: [
        { title: 'Certificate of Primary Enrollment', date: '2024-01-10' },
      ],
    },
  });

  assert.ok(Buffer.isBuffer(pdfBuffer));
  assert.ok(pdfBuffer.length > 500);
  assert.strictEqual(pdfBuffer.slice(0, 4).toString(), '%PDF');
});
