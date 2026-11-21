const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SCHEMA_FILE = path.resolve(__dirname, '../supabase/schema.sql');
const SEED_DIR = path.resolve(__dirname, '../supabase/seed');

test('Schema Verification: Canonical schema.sql exists, is non-empty and well-structured', () => {
  assert.ok(fs.existsSync(SCHEMA_FILE), 'Canonical schema.sql must exist at backend/supabase/schema.sql');
  const stat = fs.statSync(SCHEMA_FILE);
  assert.ok(stat.size > 50000, `Expected canonical schema.sql to be >50KB, found ${stat.size} bytes`);

  const content = fs.readFileSync(SCHEMA_FILE, 'utf8');
  assert.ok(content.includes('-- LMS CANONICAL PRODUCTION DATABASE SCHEMA'), 'Header must indicate canonical baseline');
  assert.ok(content.includes('-- SUPABASE-SPECIFIC'), 'Portability section must be present');
});

test('Schema Verification: All required schema objects from Task Section 1.1 exist in canonical schema.sql', () => {
  const schemaContent = fs.readFileSync(SCHEMA_FILE, 'utf8');

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
      tableRegex.test(schemaContent),
      `Required table '${table}' is missing from canonical schema.sql`
    );
  });
});

test('Schema Verification: Invariant triggers and functions are defined in canonical schema.sql', () => {
  const schemaContent = fs.readFileSync(SCHEMA_FILE, 'utf8');

  // Gap-free receipt generator
  assert.ok(schemaContent.includes('generate_receipt_number'), 'Atomic gap-free receipt generator function must exist');

  // Ledger append-only trigger
  assert.ok(
    schemaContent.includes('trg_guard_ledger_immutability') || schemaContent.includes('trg_ledger_entries_append_only'),
    'Ledger entries append-only trigger must exist'
  );

  // Minimum one Main Admin trigger
  assert.ok(
    schemaContent.includes('check_main_admin_invariants') || schemaContent.includes('trg_admins_main_admin_guard'),
    'At least one Main Admin invariant trigger must exist'
  );

  // Institutional bootstrap routine
  assert.ok(schemaContent.includes('bootstrap_institution'), 'Institutional bootstrap procedure must exist');

  // Identifier sequencing
  assert.ok(schemaContent.includes('fn_assign_next_identifier'), 'Identifier sequencing procedure must exist');
});

test('Seeder Suite Verification: Modular seeds exist for core, bootstrap, demo and dev', () => {
  assert.ok(fs.existsSync(path.join(SEED_DIR, 'core')), 'Core seeds directory must exist');
  assert.ok(fs.existsSync(path.join(SEED_DIR, 'bootstrap', 'bootstrap_admin.js')), 'Bootstrap admin script must exist');
  assert.ok(fs.existsSync(path.join(SEED_DIR, 'demo')), 'Demo seeds directory must exist');
  assert.ok(fs.existsSync(path.join(SEED_DIR, 'dev')), 'Dev seeds directory must exist');
  assert.ok(fs.existsSync(path.join(SEED_DIR, 'runner.js')), 'Seed runner must exist');
});
