/**
 * Domain Compliance Check Script
 * Asserts that no occurrences of the legacy domains (cloudora.live, cloudoralms.live)
 * remain in the active source tree.
 */

const fs = require('fs');
const path = require('path');

const FORBIDDEN_STRINGS = [
  'cloudora.live',
  'cloudoralms.live',
  'support@cloudora.live',
];

const IGNORE_DIRS = [
  'node_modules',
  '.git',
  '.expo',
  'dist',
  '.system_generated',
  '.gemini',
];

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.sql'];

let violations = [];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.includes(entry.name)) continue;
      scanDir(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (!EXTENSIONS.includes(ext)) continue;
      if (entry.name === 'package-lock.json') continue;

      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        for (const forbidden of FORBIDDEN_STRINGS) {
          if (line.toLowerCase().includes(forbidden.toLowerCase())) {
            // Exclude this script itself
            if (fullPath.includes('check-domain-compliance.js')) continue;

            violations.push({
              file: fullPath,
              line: index + 1,
              match: forbidden,
              snippet: line.trim(),
            });
          }
        }
      });
    }
  }
}

console.log('🔍 Scanning repository for legacy domain occurrences...');
const rootDir = path.resolve(__dirname, '..');
scanDir(path.join(rootDir, 'frontend'));
scanDir(path.join(rootDir, 'backend'));
scanDir(path.join(rootDir, 'supabase'));

if (violations.length > 0) {
  console.error(`\n❌ Found ${violations.length} legacy domain violation(s):`);
  violations.forEach((v) => {
    console.error(`  - ${v.file}:${v.line} [${v.match}] -> ${v.snippet}`);
  });
  process.exit(1);
} else {
  console.log('✅ Clean! Zero occurrences of legacy domain strings found.');
  process.exit(0);
}
