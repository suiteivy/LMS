const test = require('node:test');
const assert = require('node:assert/strict');
const configCache = require('../utils/configCache.js');

test('ConfigCache Invalidation Wiring: specific and wildcard invalidation works correctly', () => {
  configCache.clear();

  const inst1 = 'inst-uuid-1';
  const inst2 = 'inst-uuid-2';

  // Populate cache entries across both institutions and global
  configCache.set(`${inst1}:institution_details`, { id: inst1, name: 'School 1' }, 300);
  configCache.set(`${inst1}:settings:general`, { theme: 'dark' }, 300);
  configCache.set(`${inst1}:grading_scales:all`, [{ grade: 'A' }, { grade: 'B' }], 300);
  configCache.set(`${inst1}:terms:all`, [{ id: 't1', name: 'Term 1' }], 300);
  configCache.set(`${inst1}:active_term`, { id: 't1' }, 300);

  configCache.set(`${inst2}:institution_details`, { id: inst2, name: 'School 2' }, 300);
  configCache.set(`${inst2}:grading_scales:all`, [{ grade: 'A+' }], 300);
  configCache.set(`${inst2}:terms:all`, [{ id: 't2', name: 'Term 2' }], 300);

  configCache.set('global:currencies', [{ code: 'USD' }, { code: 'KES' }], 300);

  // Verify all are readable
  assert.equal(configCache.get(`${inst1}:institution_details`).name, 'School 1');
  assert.equal(configCache.get(`${inst1}:grading_scales:all`).length, 2);
  assert.equal(configCache.get(`${inst1}:terms:all`).length, 1);
  assert.equal(configCache.get(`${inst1}:active_term`).id, 't1');
  assert.equal(configCache.get('global:currencies').length, 2);

  // 1. Invalidate terms for inst1
  configCache.invalidateTerms(inst1);
  assert.equal(configCache.get(`${inst1}:terms:all`), null);
  assert.equal(configCache.get(`${inst1}:active_term`), null);
  // inst1 institution_details and inst2 terms should remain intact
  assert.ok(configCache.get(`${inst1}:institution_details`));
  assert.ok(configCache.get(`${inst2}:terms:all`));

  // 2. Invalidate grading scales for inst1
  configCache.invalidateGradingScales(inst1);
  assert.equal(configCache.get(`${inst1}:grading_scales:all`), null);
  assert.ok(configCache.get(`${inst2}:grading_scales:all`));

  // 3. Invalidate currencies globally
  configCache.invalidateCurrencies();
  assert.equal(configCache.get('global:currencies'), null);

  // 4. Invalidate whole institution inst1
  configCache.invalidateInstitution(inst1);
  assert.equal(configCache.get(`${inst1}:institution_details`), null);
  assert.equal(configCache.get(`${inst1}:settings:general`), null);

  // inst2 data should still remain completely unaffected
  assert.equal(configCache.get(`${inst2}:institution_details`).name, 'School 2');
  assert.equal(configCache.get(`${inst2}:grading_scales:all`).length, 1);
  assert.equal(configCache.get(`${inst2}:terms:all`).length, 1);
});

test('ConfigCache Invalidation Wiring: subjects and class domain levels invalidation works correctly', () => {
  configCache.clear();

  const inst1 = 'inst-uuid-1';
  const inst2 = 'inst-uuid-2';

  configCache.set(`${inst1}:subjects:1:20:all`, { data: [{ id: 's1', title: 'Math' }] }, 300);
  configCache.set(`${inst1}:subjects:1:20:lvl-1`, { data: [{ id: 's1', title: 'Math' }] }, 300);
  configCache.set(`${inst1}:class_domain_options`, { levels: [{ id: 'l1', name: 'Grade 1' }] }, 300);
  configCache.set(`${inst1}:academic_years:all`, [{ id: 'ay1', name: '2026' }], 300);

  configCache.set(`${inst2}:subjects:1:20:all`, { data: [{ id: 's2', title: 'Science' }] }, 300);
  configCache.set(`${inst2}:class_domain_options`, { levels: [{ id: 'l2', name: 'Form 1' }] }, 300);

  // 1. Invalidate subjects for inst1
  configCache.invalidateSubjects(inst1);
  assert.equal(configCache.get(`${inst1}:subjects:1:20:all`), null);
  assert.equal(configCache.get(`${inst1}:subjects:1:20:lvl-1`), null);
  // inst2 subjects and inst1 class_domain_options remain
  assert.ok(configCache.get(`${inst2}:subjects:1:20:all`));
  assert.ok(configCache.get(`${inst1}:class_domain_options`));

  // 2. Invalidate class domain for inst1
  configCache.invalidateClassDomain(inst1);
  assert.equal(configCache.get(`${inst1}:class_domain_options`), null);
  assert.ok(configCache.get(`${inst2}:class_domain_options`));

  // 3. Invalidate terms/academic years for inst1
  configCache.invalidateTerms(inst1);
  assert.equal(configCache.get(`${inst1}:academic_years:all`), null);
});

test('ConfigCache Invalidation Wiring: TTL expiry behavior', async () => {
  configCache.clear();
  // Set with 0.05 second TTL (50ms)
  configCache.set('temporary:key', { data: 'ephemeral' }, 0.05);
  assert.deepEqual(configCache.get('temporary:key'), { data: 'ephemeral' });

  // Wait 70ms
  await new Promise((resolve) => setTimeout(resolve, 70));

  // Should have expired and returned null
  assert.equal(configCache.get('temporary:key'), null);
});

