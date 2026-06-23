const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ORPHANED_IDS = [
    '425630c7-4fbb-4442-b7c4-72d88ec10812',
    '5e38c949-5786-47fe-a983-7297e55d1b25',
    '19ded77a-c49d-4fd9-9f07-8d4a71944dca',
    'b7c3cbd8-3bd7-460e-a8af-755d30e6e782'
];

async function cleanupOrphans() {
    console.log('=== Cleaning Up Orphaned Submissions ===\n');
    console.log(`Submissions to delete: ${ORPHANED_IDS.length}`);
    for (const id of ORPHANED_IDS) {
        console.log(`  - ${id}`);
    }

    const { data, error } = await supabase
        .from('submissions')
        .delete()
        .in('id', ORPHANED_IDS)
        .select();

    if (error) {
        console.error('\nError deleting orphaned submissions:', error.message);
        return;
    }

    console.log(`\nSuccessfully deleted ${data.length} orphaned submissions.`);
}

cleanupOrphans().catch(console.error);
