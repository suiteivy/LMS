/**
 * Reveal Coverage Audit Script
 * Verifies that all target components across the Landing Page and Demo Modules page
 * are integrated into the central Reveal animation system.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Required component checks for each page
const AUDIT_TARGETS = [
  {
    page: 'Landing Page: Navigation & Header',
    file: 'frontend/components/landing/FuturisticNav.tsx',
    checks: [
      { id: 'Nav Light Intro Reveal', pattern: /<Reveal\s+variant="wrapper"/ },
    ],
  },
  {
    page: 'Landing Page: Hero Console',
    file: 'frontend/components/landing/HeroConsole.tsx',
    checks: [
      { id: 'Hero Telemetry Pill', pattern: /<Reveal\s+variant="cta"\s+delay=\{0\}/ },
      { id: 'Monumental Headline', pattern: /<Reveal\s+variant="headline"\s+delay=\{150\}/ },
      { id: 'Hero Subtitle', pattern: /<Reveal\s+variant="sentences"\s+delay=\{300\}/ },
      { id: 'Hero CTAs / DemoButton', pattern: /<Reveal\s+variant="cta"\s+delay=\{450\}/ },
      { id: 'Proof Metrics Strip', pattern: /<Reveal\s+variant="list"\s+delay=\{600\}/ },
      { id: 'Interactive HUD Console', pattern: /<Reveal[^>]*variant="image"/ },
    ],
  },
  {
    page: 'Landing Page: Bento Features Matrix',
    file: 'frontend/components/landing/BentoFeatures.tsx',
    checks: [
      { id: 'Bento Header', pattern: /<Reveal\s+variant="headline"/ },
      { id: 'Bento Filter Tabs', pattern: /<Reveal\s+variant="list"/ },
      { id: 'Bento Card 1 (Admissions & Records)', pattern: /<Reveal[^>]*variant="cards"[^>]*staggerIndex=\{0\}/ },
      { id: 'Bento Card 2 (Attendance)', pattern: /<Reveal[^>]*variant="cards"[^>]*staggerIndex=\{1\}/ },
      { id: 'Bento Card 3 (AI Grading)', pattern: /<Reveal[^>]*variant="cards"[^>]*staggerIndex=\{2\}/ },
      { id: 'Bento Card 4 (Communication)', pattern: /<Reveal[^>]*variant="cards"[^>]*staggerIndex=\{3\}/ },
      { id: 'Bento Card 5 (Fee Management)', pattern: /<Reveal[^>]*variant="cards"[^>]*staggerIndex=\{4\}/ },
      { id: 'Bento Card 6 (Analytics)', pattern: /<Reveal[^>]*variant="cards"[^>]*staggerIndex=\{5\}/ },
    ],
  },
  {
    page: 'Landing Page: Telemetry & Infrastructure Strip',
    file: 'frontend/components/landing/TelemetryStrip.tsx',
    checks: [
      { id: 'Telemetry Header', pattern: /<Reveal\s+variant="headline"/ },
      { id: 'CountUp Metrics', pattern: /<CountUp/ },
      { id: 'Stat Metric Cards (4 Live Telemetry Nodes)', pattern: /<Reveal[^>]*variant="cards"[^>]*staggerIndex=\{idx\}/ },
      { id: 'Security Pillars Stagger (4 Pillars)', pattern: /<Reveal[^>]*variant="cards"[^>]*staggerIndex=\{idx\}/ },
    ],
  },
  {
    page: 'Landing Page: Pricing & Add-ons',
    file: 'frontend/components/landing/FuturisticPricing.tsx',
    checks: [
      { id: 'Pricing Header & Switcher', pattern: /<Reveal\s+variant="headline"/ },
      { id: 'Pricing Plan Cards (3 Tiers)', pattern: /<Reveal[^>]*variant="cards"[^>]*staggerIndex=\{i\}/ },
      { id: 'Custom Enterprise Architecture Card', pattern: /<Reveal\s+variant="cards"[^>]*style=\{\{\s*width:\s*'100%'\s*\}\}/ },
      { id: 'Interactive Demo Sandbox Card', pattern: /<Reveal\s+variant="cards"[^>]*style=\{\{\s*width:\s*'100%'\s*\}\}/ },
      { id: 'Modular Addons Matrix Header & Grid', pattern: /<Reveal\s+variant="headline"/ },
    ],
  },
  {
    page: 'Landing Page: Hyper-Connect & Socials',
    file: 'frontend/components/landing/FuturisticContact.tsx',
    checks: [
      { id: 'Connect Header', pattern: /<Reveal\s+variant="headline"/ },
      { id: 'Connect 5-Tile Social Grid', pattern: /<Reveal[^>]*variant="cards"[^>]*staggerIndex=\{i\}/ },
      { id: 'Global Operations HUD', pattern: /<Reveal\s+variant="wrapper"/ },
      { id: 'Footer Social Links & Copy', pattern: /<Reveal\s+variant="wrapper"/ },
    ],
  },
  {
    page: 'Demo Modules: Console & Persona Selection',
    file: 'frontend/app/(auth)/demo.tsx',
    checks: [
      { id: 'Demo Header & Nav', pattern: /<Reveal\s+variant="headline"/ },
      { id: 'Persona Cards Stagger (4 Roles)', pattern: /<Reveal\s+variant="cards"\s+staggerIndex=\{index\}/ },
      { id: 'What to Expect Telemetry Card', pattern: /<Reveal\s+variant="wrapper"/ },
    ],
  },
  {
    page: 'Demo Modules: Feedback Top Notice',
    file: 'frontend/components/landing/DemoFeedbackTopNotice.tsx',
    checks: [
      { id: 'Feedback Top Banner', pattern: /<Reveal\s+variant="cta"/ },
    ],
  },
  {
    page: 'Demo Modules: Feedback Section & Form',
    file: 'frontend/components/landing/DemoFeedbackSection.tsx',
    checks: [
      { id: 'Feedback Section Outer Wrapper', pattern: /<Reveal\s+variant="wrapper"/ },
      { id: 'Feedback Section Header', pattern: /<Reveal\s+variant="headline"/ },
      { id: 'Star Rating Field', pattern: /<Reveal\s+variant="cards"\s+staggerIndex=\{0\}/ },
      { id: 'Module Chips Field', pattern: /<Reveal\s+variant="cards"\s+staggerIndex=\{1\}/ },
      { id: 'Role Selector Field', pattern: /<Reveal\s+variant="cards"\s+staggerIndex=\{2\}/ },
      { id: 'Feedback Comments Textareas', pattern: /<Reveal\s+variant="sentences"\s+staggerIndex=\{3\}/ },
      { id: 'Contact Permission Inputs', pattern: /<Reveal\s+variant="cards"\s+staggerIndex=\{4\}/ },
      { id: 'Submit & Skip Actions', pattern: /<Reveal\s+variant="cta"\s+staggerIndex=\{5\}/ },
    ],
  },
];

console.log('══════════════════════════════════════════════════════════════');
console.log('🔍 REVEAL ANIMATION COVERAGE AUDIT');
console.log('══════════════════════════════════════════════════════════════\n');

let totalChecks = 0;
let passedChecks = 0;
const failures = [];

for (const target of AUDIT_TARGETS) {
  const fullPath = path.join(ROOT_DIR, target.file);
  console.log(`\x1b[36m📁 [${target.page}]\x1b[0m -> ${target.file}`);

  if (!fs.existsSync(fullPath)) {
    console.error(`  \x1b[31m❌ File not found: ${target.file}\x1b[0m`);
    failures.push({ target: target.page, check: 'File existence', file: target.file });
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');

  for (const check of target.checks) {
    totalChecks++;
    const passed = check.pattern.test(content);
    if (passed) {
      passedChecks++;
      console.log(`  \x1b[32m✔\x1b[0m ${check.id}`);
    } else {
      console.log(`  \x1b[31m✖\x1b[0m ${check.id} (MISSING REVEAL WRAPPER)`);
      failures.push({ target: target.page, check: check.id, file: target.file });
    }
  }
  console.log('');
}

console.log('══════════════════════════════════════════════════════════════');
const coveragePercent = Math.round((passedChecks / totalChecks) * 100);
console.log(`Summary: ${passedChecks} / ${totalChecks} checks passed (${coveragePercent}% coverage)`);
console.log('══════════════════════════════════════════════════════════════\n');

if (failures.length > 0) {
  console.error(`\x1b[31m❌ Reveal coverage incomplete: ${failures.length} component(s) missing Reveal wrappers.\x1b[0m`);
  process.exit(1);
} else {
  console.log('\x1b[32m✅ 100% Reveal Coverage across Landing Page and Demo Modules Page!\x1b[0m');
  process.exit(0);
}
