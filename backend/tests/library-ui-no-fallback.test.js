const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const componentPath = path.resolve(__dirname, '../../frontend/components/admin/library/LibraryAction.tsx');

test('admin library UI does not contain hardcoded demo datasets', () => {
  const source = fs.readFileSync(componentPath, 'utf8');

  assert.equal(source.includes('DEMO_BOOKS'), false, 'DEMO_BOOKS constant must not exist');
  assert.equal(source.includes('DEMO_BORROWED'), false, 'DEMO_BORROWED constant must not exist');
});

test('admin library UI does not fallback to synthetic data when API returns empty', () => {
  const source = fs.readFileSync(componentPath, 'utf8');

  assert.equal(
    /setBooks\(\s*transformed\.length\s*>\s*0\s*\?\s*transformed\s*:/.test(source),
    false,
    'setBooks must not use transformed.length ? transformed : fallback pattern'
  );

  assert.equal(
    /setBorrowedBooks\(\s*transformed\.length\s*>\s*0\s*\?\s*transformed\s*:/.test(source),
    false,
    'setBorrowedBooks must not use transformed.length ? transformed : fallback pattern'
  );
});
