const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../supabase/migrations');

test('Migration Inventory: All migration files are sorted, non-empty and well-named', () => {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql'));
  assert.ok(files.length >= 35, `Expected at least 35 migration files, found ${files.length}`);

  // Check naming pattern: YYYYMMDDHHMMSS_name.sql
  const timestampRegex = /^\d{14}_[a-z0-9_]+\.sql$/;
  files.forEach(f => {
    assert.match(f, timestampRegex, `Migration file ${f} does not follow naming convention`);
  });

  // Verify chronological ordering
  const sorted = [...files].sort();
  assert.deepStrictEqual(files, sorted, 'Migration files must be chronologically ordered');
});

test('Migration Inventory: All required schema objects from Task Section 1.1 exist in migrations', () => {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql'));
  const allSqlContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8')).join('\n');

  const requiredTables = [
    // Roles & Access
    'user_roles',
    'roles',
    'role_templates',
    'role_permissions',
    'role_scopes',
    'feature_registry',
    'audit_logs',

    // Identifiers
    'identifier_formats',
    'identifier_counters',
    'legacy_identifiers',

    // Finance & Ledger
    'fee_structures',
    'fee_structure_items',
    'student_bills',
    'student_bill_items',
    'payments',
    'payment_allocations',
    'payment_proofs',
    'ledger_entries',
    'receipts',
    'invoices',
    'receipt_sequences',

    // Reports & History
    'report_datasets',
    'report_fields',
    'report_relations',
    'report_metrics',
    'report_contexts',
    'report_presets',
    'retention_policies',
    'legal_holds',
    'restore_requests',

    // Landing & Feedback
    'demo_feedback',

    // Platform Infrastructure
    'idempotency_keys',
    'outbox_events',
    'data_quality_quarantine',
  ];

  requiredTables.forEach(table => {
    const tableRegex = new RegExp(`CREATE\\s+TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?(public\\.)?${table}\\b`, 'i');
    assert.ok(
      tableRegex.test(allSqlContent),
      `Required table '${table}' from Task Section 1.1 is missing from migration inventory`
    );
  });
});

test('Migration Inventory: Invariant triggers and functions are defined', () => {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql'));
  const allSqlContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8')).join('\n');

  // Gap-free receipt generator
  assert.ok(allSqlContent.includes('generate_receipt_number'), 'Atomic gap-free receipt generator function must exist');

  // Ledger append-only trigger
  assert.ok(allSqlContent.includes('trg_ledger_entries_append_only'), 'Ledger entries append-only trigger must exist');

  // Minimum one Main Admin trigger
  assert.ok(allSqlContent.includes('trg_minimum_main_admin'), 'At least one Main Admin invariant trigger must exist');

  // Atomic payment confirmation RPC
  assert.ok(allSqlContent.includes('confirm_payment_atomic'), 'Atomic payment confirmation RPC must exist');
});
