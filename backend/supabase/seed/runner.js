/**
 * LMS Canonical Seeder Suite Runner
 * Location: backend/supabase/seed/runner.js
 * 
 * Usage:
 *   node backend/supabase/seed/runner.js [profile] [flags]
 * 
 * Profiles:
 *   core           Runs backend/supabase/seed/core/*.sql (Safe for all environments including production)
 *   core+bootstrap Runs core/*.sql + bootstrap/bootstrap_admin.js
 *   core+demo      Runs core/*.sql + demo/*.sql (Blocked in production without --force-production-demo)
 *   all            Runs core, bootstrap, demo, and dev
 * 
 * Flags:
 *   --force-production-demo  Explicit override required to seed demo data into production
 * 
 * Rules:
 *   - Idempotent and deterministic
 *   - Zero secrets logged
 *   - Sourced from environment variables
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { bootstrapAdmin } = require('./bootstrap/bootstrap_admin');

const PROFILE_CORE = 'core';
const PROFILE_CORE_BOOTSTRAP = 'core+bootstrap';
const PROFILE_CORE_DEMO = 'core+demo';
const PROFILE_ALL = 'all';

async function run() {
  const args = process.argv.slice(2);
  const profile = (args[0] || process.env.SEED_PROFILE || PROFILE_CORE).toLowerCase();
  const allowProdDemo = args.includes('--force-production-demo');

  const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
  const isProduction = nodeEnv === 'production';

  console.log('====================================================');
  console.log(`[Seed Runner] Starting LMS Seeder Suite`);
  console.log(`[Seed Runner] Target Profile: ${profile}`);
  console.log(`[Seed Runner] Environment:    ${nodeEnv}`);
  console.log('====================================================');

  // Safety Gate: Block demo data on production unless explicitly forced
  if (isProduction && (profile === PROFILE_CORE_DEMO || profile === PROFILE_ALL) && !allowProdDemo) {
    console.error('[Seed Runner] SAFETY ERROR: Refusing to apply demo/dev seed data to a PRODUCTION environment.');
    console.error('[Seed Runner] To override deliberately, pass flag: --force-production-demo');
    process.exit(1);
  }

  // Database Connection
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
  let pool;

  if (dbUrl) {
    pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  } else {
    // Fallback: check if we have direct host credentials or if supabase-js should be used
    console.log('[Seed Runner] Direct DATABASE_URL not set, checking standard local/supabase pool parameters...');
    pool = new Pool({
      host: process.env.PGHOST || '127.0.0.1',
      port: process.env.PGPORT || 54322,
      database: process.env.PGDATABASE || 'postgres',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres'
    });
  }

  async function executeSqlFile(filePath) {
    const filename = path.basename(filePath);
    process.stdout.write(`  -> Executing ${filename}... `);
    const sql = fs.readFileSync(filePath, 'utf-8');
    try {
      await pool.query(sql);
      console.log('SUCCESS');
    } catch (err) {
      console.log('FAILED');
      console.error(`     Error in ${filename}:`, err.message);
      throw err;
    }
  }

  try {
    // Test DB connection
    const testRes = await pool.query('SELECT 1 as connected');
    if (!testRes.rows.length) {
      throw new Error('Database ping failed');
    }
    console.log('[Seed Runner] Database connection verified.');

    // 1. CORE SEEDS (01 through 09)
    console.log('\n[Seed Runner] Running Core Seeds...');
    const coreDir = path.join(__dirname, 'core');
    const coreFiles = fs.readdirSync(coreDir).filter(f => f.endsWith('.sql')).sort();
    for (const file of coreFiles) {
      await executeSqlFile(path.join(coreDir, file));
    }

    // 2. BOOTSTRAP (Admin creation)
    if (profile === PROFILE_CORE_BOOTSTRAP || profile === PROFILE_ALL) {
      console.log('\n[Seed Runner] Running Platform Admin Bootstrap...');
      await bootstrapAdmin();
    }

    // 3. DEMO SEEDS (01 through 06)
    if (profile === PROFILE_CORE_DEMO || profile === PROFILE_ALL) {
      console.log('\n[Seed Runner] Running Demo Academy Seeds...');
      const demoDir = path.join(__dirname, 'demo');
      const demoFiles = fs.readdirSync(demoDir).filter(f => f.endsWith('.sql')).sort();
      for (const file of demoFiles) {
        await executeSqlFile(path.join(demoDir, file));
      }
    }

    // 4. DEV SEEDS
    if (profile === PROFILE_ALL) {
      console.log('\n[Seed Runner] Running Dev Fixtures...');
      const devDir = path.join(__dirname, 'dev');
      const devFiles = fs.readdirSync(devDir).filter(f => f.endsWith('.sql')).sort();
      for (const file of devFiles) {
        await executeSqlFile(path.join(devDir, file));
      }
    }

    console.log('\n====================================================');
    console.log(`[Seed Runner] All seed operations for profile "${profile}" completed successfully!`);
    console.log('====================================================');
  } catch (err) {
    console.error('\n[Seed Runner] Seeding aborted due to error:', err.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
