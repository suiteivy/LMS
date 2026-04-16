const process = require("node:process");
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('Running progress and approval migration on:', supabaseUrl);

    const migrationSql = `
-- Add progress tracking to subjects
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0;

-- Add signature and status tracking to diary entries
ALTER TABLE public.diary_entries ADD COLUMN IF NOT EXISTS is_signed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.diary_entries ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Add status tracking to resources
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));
    `;

    try {
        const { data, error } = await supabase.rpc('execute_sql_internal', { sql_query: migrationSql });

        if (error) {
            console.error('Error applying migration via RPC:', error);
            process.exit(1);
        }

        console.log('Migration successfully applied!', data);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

runMigration();
