const process = require("node:process");
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpcs() {
    const queries = [
        { name: 'execute_sql', params: { query: 'SELECT 1;' } },
        { name: 'execute_sql_internal', params: { sql_query: 'SELECT 1;' } },
        { name: 'run_sql', params: { sql: 'SELECT 1;' } },
        { name: 'exec_sql', params: { sql: 'SELECT 1;' } }
    ];

    for (const q of queries) {
        try {
            const { data, error } = await supabase.rpc(q.name, q.params);
            if (error) {
                console.log(`RPC ${q.name} returned error:`, error.message);
            } else {
                console.log(`✅ RPC ${q.name} worked! Output:`, data);
            }
        } catch (err) {
            console.log(`RPC ${q.name} threw:`, err.message);
        }
    }
}

testRpcs();
