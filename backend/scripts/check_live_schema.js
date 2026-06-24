require('dotenv').config();

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
    const res = await fetch(`${URL}/rest/v1/`, {
        headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Accept': 'application/json' }
    });
    const spec = await res.json();

    // Get constraint info for classes and parent_students
    const tables = ['classes', 'parent_students', 'subjects', 'students'];
    for (const t of tables) {
        const def = spec.definitions?.[t];
        console.log(`\n=== ${t} required fields ===`);
        console.log('required:', def?.required);
        console.log('properties:', Object.keys(def?.properties || {}));
    }
}

main().catch(console.error);
