const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

function walk(dir, ext = ['.ts', '.tsx', '.js']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (['node_modules', '.expo', '.git', '.vscode', '.idea', 'dist'].includes(file)) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(walk(fullPath, ext));
    } else if (ext.some(e => file.endsWith(e))) {
      results.push(fullPath);
    }
  }
  return results;
}

let hasFailures = false;

console.log('══════════════════════════════════════════════════════════════');
console.log('🔍 AUTOMATED AUDIT GUARD: UI COMPLETENESS & STANDARDS');
console.log('══════════════════════════════════════════════════════════════\n');

// 1. Guard against empty / dead onPress handlers
const frontendFiles = walk(path.join(FRONTEND_DIR, 'app'), ['.tsx']).concat(walk(path.join(FRONTEND_DIR, 'components'), ['.tsx']));
const emptyOnPressHits = [];

for (const f of frontendFiles) {
  const rel = path.relative(ROOT_DIR, f).replace(/\\/g, '/');
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // Check for empty handler: onPress={() => {}} without comments or arguments
    if (/onPress\s*=\s*\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/.test(line)) {
      emptyOnPressHits.push({ file: rel, line: idx + 1, text: line.trim() });
    }
  });
}

if (emptyOnPressHits.length > 0) {
  console.log(`❌ FAILED: ${emptyOnPressHits.length} empty onPress handlers found:`);
  emptyOnPressHits.forEach(h => console.log(`   - ${h.file}:${h.line} -> ${h.text}`));
  hasFailures = true;
} else {
  console.log('✔ Guard 1: Zero empty onPress handlers detected.');
}

// 2. Guard against legacy UI identifier labels in JSX
const legacyLabelHits = [];
for (const f of frontendFiles) {
  const rel = path.relative(ROOT_DIR, f).replace(/\\/g, '/');
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    if (/(?:>|'|")\s*(?:Student\s*ID|Reg(?:istration)?\s*No|Staff\s*ID|Parent\s*ID)\s*(?:<|'|")/i.test(line)) {
      if (!line.includes('student_id') && !line.includes('staff_id') && !line.includes('parent_id') && !line.includes('//') && !line.includes('admission_number') && !line.includes('staff_number')) {
        legacyLabelHits.push({ file: rel, line: idx + 1, text: line.trim() });
      }
    }
  });
}

if (legacyLabelHits.length > 0) {
  console.log(`❌ FAILED: ${legacyLabelHits.length} legacy identifier label occurrences found:`);
  legacyLabelHits.forEach(h => console.log(`   - ${h.file}:${h.line} -> ${h.text}`));
  hasFailures = true;
} else {
  console.log('✔ Guard 2: Zero legacy ID labels (Student ID, Reg No) in UI components.');
}

// 3. Route vs Layout catalog check
const adminLayoutContent = fs.readFileSync(path.join(FRONTEND_DIR, 'app/(admin)/_layout.tsx'), 'utf8');
const adminAppDir = path.join(FRONTEND_DIR, 'app/(admin)');
const adminRoutes = walk(adminAppDir, ['.tsx'])
  .filter(f => !path.basename(f).startsWith('_') && !f.includes('+not-found') && !f.endsWith('.native.tsx'))
  .map(f => {
    let rel = path.relative(adminAppDir, f).replace(/\\/g, '/').replace(/\.tsx$/, '');
    return rel;
  });

const missingFromCatalog = adminRoutes.filter(r => !adminLayoutContent.includes(`"${r}"`));
if (missingFromCatalog.length > 0) {
  console.log(`❌ FAILED: ${missingFromCatalog.length} admin routes missing from ALL_ADMIN_ROUTES catalog:`);
  missingFromCatalog.forEach(r => console.log(`   - ${r}`));
  hasFailures = true;
} else {
  console.log(`✔ Guard 3: All ${adminRoutes.length} admin routes explicitly cataloged in _layout.tsx.`);
}

console.log('\n══════════════════════════════════════════════════════════════');
if (hasFailures) {
  console.log('❌ Audit checks failed! Please fix the reported items.');
  process.exit(1);
} else {
  console.log('✅ ALL UI COMPLETENESS GUARDS PASSED (100% CLEAN)');
  process.exit(0);
}
