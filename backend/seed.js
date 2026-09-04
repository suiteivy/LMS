require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { assertStrongSeedPassword } = require('./utils/seedPasswordPolicy.js');

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const rawSeedPassword = process.env.SEED_DEFAULT_PASSWORD || 'K3ny@Sch00l#2026!Str0ng';
const DEFAULT_SEED_PASSWORD = assertStrongSeedPassword(rawSeedPassword, 'SEED_DEFAULT_PASSWORD');

// ── FIXED TEMPLATE & INSTITUTION IDS ──────────────────────────────────────────
const INSTITUTION_ID           = 'b5bd788c-8297-4a96-b8b3-157814504fba'; // Cloudora School
const PRIMARY_TEACHER_USER_ID  = 'a9270c4b-0f35-4d3b-87b8-4dc3da990587';
const PRIMARY_TEACHER_ID       = 'TCH-MOMENTUM-001';
const PRIMARY_STUDENT_USER_ID  = 'c6306d7b-ad5e-4f5b-8118-47fcd462bd25';
const PRIMARY_STUDENT_ID       = PRIMARY_STUDENT_USER_ID;
const PRIMARY_PARENT_USER_ID   = '5392d979-e70a-4017-a340-502ea5706d41';
const PRIMARY_PARENT_ID        = PRIMARY_PARENT_USER_ID;
const PRIMARY_ADMIN_USER_ID    = 'b14cbc73-e3bf-4c0f-962a-b754a5979a84';
const PRIMARY_ADMIN_ID         = 'ADM-MOMENTUM-001';

// Classes
const CLASS_F3_NORTH           = '417561a5-48c5-4c45-b736-97d49e74bd35'; // Form 3 Simba (North)
const CLASS_F3_SOUTH           = 'dfe26cde-0bdc-4c14-98f2-093a71199a26'; // Form 3 Chui (South)
const CLASS_F2_EAST            = 'c1000000-0000-4000-8000-000000000001'; // Form 2 Ndovu
const CLASS_F2_WEST            = 'c1000000-0000-4000-8000-000000000002'; // Form 2 Kifaru
const CLASS_F1_ALPHA           = 'c1000000-0000-4000-8000-000000000003'; // Form 1 Alpha
const CLASS_F1_BETA            = 'c1000000-0000-4000-8000-000000000004'; // Form 1 Beta

// Core Subjects (valid hex UUIDs)
const SUBJ_MATH                = 'a9aca035-bf32-4876-85ec-ea0b7bc972fb'; // Mathematics
const SUBJ_ENG                 = 'db224c36-093b-4d92-9bed-61b720a991c8'; // English
const SUBJ_KISW                = '51000000-0000-4000-8000-000000000001'; // Kiswahili
const SUBJ_BIO                 = '51000000-0000-4000-8000-000000000002'; // Biology
const SUBJ_CHEM                = '51000000-0000-4000-8000-000000000003'; // Chemistry
const SUBJ_PHY                 = '51000000-0000-4000-8000-000000000004'; // Physics
const SUBJ_HIST                = '51000000-0000-4000-8000-000000000005'; // History & Government
const SUBJ_GEO                 = '51000000-0000-4000-8000-000000000006'; // Geography
const SUBJ_AGRI                = '51000000-0000-4000-8000-000000000007'; // Agriculture
const SUBJ_BST                 = '51000000-0000-4000-8000-000000000008'; // Business Studies

// Academic Structure IDs (valid hex UUIDs)
const ACADEMIC_YEAR_2026_ID    = '20260000-0000-4000-8000-000000000001';
const TERM_1_ID                = '10000000-0000-4000-8000-000000000001';
const TERM_2_ID                = '10000000-0000-4000-8000-000000000002';
const TERM_3_ID                = '10000000-0000-4000-8000-000000000003';

// Assessment Types (valid hex UUIDs)
const AT_CAT1                  = 'a1000000-0000-4000-8000-000000000001'; // Opener CAT 1
const AT_MIDTERM               = 'a1000000-0000-4000-8000-000000000002'; // Midterm Exam
const AT_CAT2                  = 'a1000000-0000-4000-8000-000000000003'; // Progress CAT 2
const AT_ENDTERM               = 'a1000000-0000-4000-8000-000000000004'; // End of Term Exam

// Currency & Fee Structures
const CURRENCY_ID              = 'c9dce365-d7b2-4cd4-83d8-676fc9e3704a';
const FEE_STRUCTURE_ID         = 'f3be7c5a-2cb3-4b68-b765-cb3f5a2f5f1a';

// ── AUTHENTIC KENYAN DIRECTORY ────────────────────────────────────────────────
const TEACHERS = [
    { id: PRIMARY_TEACHER_ID, userId: PRIMARY_TEACHER_USER_ID, name: 'Sarah Chemutai', email: 'teacher@cloudora.demo', dept: 'Mathematics & English', pos: 'class_teacher', qualification: 'B.Ed Science' },
    { id: 'TCH-DEMO-002', userId: 'a9270000-0000-4000-8000-000000000002', name: 'David Kiprop', email: 'david.kiprop@cloudora.demo', dept: 'Mathematics', pos: 'head_of_department', qualification: 'M.Ed Curriculum' },
    { id: 'TCH-DEMO-003', userId: 'a9270000-0000-4000-8000-000000000003', name: 'Grace Wambui', email: 'grace.wambui@cloudora.demo', dept: 'Languages', pos: 'head_of_department', qualification: 'B.Ed Arts' },
    { id: 'TCH-DEMO-004', userId: 'a9270000-0000-4000-8000-000000000004', name: 'Brian Ochieng', email: 'brian.ochieng@cloudora.demo', dept: 'Sciences', pos: 'head_of_department', qualification: 'B.Sc Chemistry' },
    { id: 'TCH-DEMO-005', userId: 'a9270000-0000-4000-8000-000000000005', name: 'Mary Atieno', email: 'mary.atieno@cloudora.demo', dept: 'Kiswahili', pos: 'teacher', qualification: 'Dip. Ed' },
    { id: 'TCH-DEMO-006', userId: 'a9270000-0000-4000-8000-000000000006', name: 'Samuel Ndung\'u', email: 'samuel.ndungu@cloudora.demo', dept: 'Physics & ICT', pos: 'teacher', qualification: 'B.Sc Computer Science' },
    { id: 'TCH-DEMO-007', userId: 'a9270000-0000-4000-8000-000000000007', name: 'Faith Cherono', email: 'faith.cherono@cloudora.demo', dept: 'Humanities', pos: 'teacher', qualification: 'B.Ed Arts' },
    { id: 'TCH-DEMO-008', userId: 'a9270000-0000-4000-8000-000000000008', name: 'Joseph Mwangi', email: 'joseph.mwangi@cloudora.demo', dept: 'Agriculture & Biology', pos: 'teacher', qualification: 'B.Sc Agriculture' },
    { id: 'TCH-DEMO-009', userId: 'a9270000-0000-4000-8000-000000000009', name: 'Mercy Akinyi', email: 'mercy.akinyi@cloudora.demo', dept: 'Business Studies', pos: 'teacher', qualification: 'B.Ed Business' },
    { id: 'TCH-DEMO-010', userId: 'a9270000-0000-4000-8000-000000000010', name: 'Daniel Mutua', email: 'daniel.mutua@cloudora.demo', dept: 'Humanities', pos: 'teacher', qualification: 'B.A Education' },
];

const STUDENTS = [
    { id: PRIMARY_STUDENT_ID, userId: PRIMARY_STUDENT_USER_ID, name: 'Kelson Otieno', email: 'student@cloudora.demo', classId: CLASS_F3_NORTH, formLevel: 3, gender: 'male', parentUserId: PRIMARY_PARENT_USER_ID, parentId: PRIMARY_PARENT_ID, parentName: 'James Mwangi', relation: 'Father', parentOcc: 'Senior Accountant' },
    { id: 'c6300000-0000-4000-8000-000000000002', userId: 'c6300000-0000-4000-8000-000000000002', name: 'Amina Hassan', email: 'amina.hassan@cloudora.demo', classId: CLASS_F3_NORTH, formLevel: 3, gender: 'female', parentUserId: 'a5390000-0000-4000-8000-000000000002', parentId: 'a5390000-0000-4000-8000-000000000002', parentName: 'Fatima Abdi', relation: 'Mother', parentOcc: 'Civil Servant' },
    { id: 'c6300000-0000-4000-8000-000000000003', userId: 'c6300000-0000-4000-8000-000000000003', name: 'Kevin Koech', email: 'kevin.koech@cloudora.demo', classId: CLASS_F3_NORTH, formLevel: 3, gender: 'male', parentUserId: 'a5390000-0000-4000-8000-000000000003', parentId: 'a5390000-0000-4000-8000-000000000003', parentName: 'Peter Koech', relation: 'Father', parentOcc: 'Commercial Farmer' },
    { id: 'c6300000-0000-4000-8000-000000000004', userId: 'c6300000-0000-4000-8000-000000000004', name: 'Joy Muthoni', email: 'joy.muthoni@cloudora.demo', classId: CLASS_F3_NORTH, formLevel: 3, gender: 'female', parentUserId: 'a5390000-0000-4000-8000-000000000004', parentId: 'a5390000-0000-4000-8000-000000000004', parentName: 'Ann Muthoni', relation: 'Mother', parentOcc: 'Business Executive' },
    { id: 'c6300000-0000-4000-8000-000000000005', userId: 'c6300000-0000-4000-8000-000000000005', name: 'Victor Wanyama', email: 'victor.wanyama@cloudora.demo', classId: CLASS_F3_NORTH, formLevel: 3, gender: 'male', parentUserId: 'a5390000-0000-4000-8000-000000000005', parentId: 'a5390000-0000-4000-8000-000000000005', parentName: 'George Wanyama', relation: 'Father', parentOcc: 'Civil Engineer' },
    { id: 'c6300000-0000-4000-8000-000000000006', userId: 'c6300000-0000-4000-8000-000000000006', name: 'Stacy Chebet', email: 'stacy.chebet@cloudora.demo', classId: CLASS_F3_SOUTH, formLevel: 3, gender: 'female', parentUserId: 'a5390000-0000-4000-8000-000000000006', parentId: 'a5390000-0000-4000-8000-000000000006', parentName: 'Beatrice Chebet', relation: 'Mother', parentOcc: 'Senior Nurse' },
    { id: 'c6300000-0000-4000-8000-000000000007', userId: 'c6300000-0000-4000-8000-000000000007', name: 'Dennis Kipruto', email: 'dennis.kipruto@cloudora.demo', classId: CLASS_F3_SOUTH, formLevel: 3, gender: 'male', parentUserId: 'a5390000-0000-4000-8000-000000000007', parentId: 'a5390000-0000-4000-8000-000000000007', parentName: 'Moses Kipruto', relation: 'Father', parentOcc: 'Lecturer' },
    { id: 'c6300000-0000-4000-8000-000000000008', userId: 'c6300000-0000-4000-8000-000000000008', name: 'Sharon Njeri', email: 'sharon.njeri@cloudora.demo', classId: CLASS_F3_SOUTH, formLevel: 3, gender: 'female', parentUserId: 'a5390000-0000-4000-8000-000000000008', parentId: 'a5390000-0000-4000-8000-000000000008', parentName: 'Esther Njeri', relation: 'Mother', parentOcc: 'Pharmacist' },
    { id: 'c6300000-0000-4000-8000-000000000009', userId: 'c6300000-0000-4000-8000-000000000009', name: 'Collins Barasa', email: 'collins.barasa@cloudora.demo', classId: CLASS_F2_EAST, formLevel: 2, gender: 'male', parentUserId: 'a5390000-0000-4000-8000-000000000009', parentId: 'a5390000-0000-4000-8000-000000000009', parentName: 'Wilfred Barasa', relation: 'Father', parentOcc: 'Architect' },
    { id: 'c6300000-0000-4000-8000-000000000010', userId: 'c6300000-0000-4000-8000-000000000010', name: 'Faith Makena', email: 'faith.makena@cloudora.demo', classId: CLASS_F2_EAST, formLevel: 2, gender: 'female', parentUserId: 'a5390000-0000-4000-8000-000000000010', parentId: 'a5390000-0000-4000-8000-000000000010', parentName: 'Catherine Makena', relation: 'Mother', parentOcc: 'Bank Manager' },
    { id: 'c6300000-0000-4000-8000-000000000011', userId: 'c6300000-0000-4000-8000-000000000011', name: 'Ian Karanja', email: 'ian.karanja@cloudora.demo', classId: CLASS_F1_ALPHA, formLevel: 1, gender: 'male', parentUserId: 'a5390000-0000-4000-8000-000000000011', parentId: 'a5390000-0000-4000-8000-000000000011', parentName: 'Patrick Karanja', relation: 'Father', parentOcc: 'Attorney' },
    { id: 'c6300000-0000-4000-8000-000000000012', userId: 'c6300000-0000-4000-8000-000000000012', name: 'Brenda Awuor', email: 'brenda.awuor@cloudora.demo', classId: CLASS_F1_BETA, formLevel: 1, gender: 'female', parentUserId: 'a5390000-0000-4000-8000-000000000012', parentId: 'a5390000-0000-4000-8000-000000000012', parentName: 'Lydia Awuor', relation: 'Mother', parentOcc: 'Journalist' },
];

// Helper to chunk arrays for supabase batch inserts
async function batchInsert(table, records, chunkSize = 100) {
    for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const { error } = await supabase.from(table).insert(chunk);
        if (error) {
            console.error(`Error inserting into ${table} [batch ${i}]:`, error.message);
            throw error;
        }
    }
}

// ── 1. CORE ENTITIES SEEDING ──────────────────────────────────────────────────
async function seedCore() {
    console.log('--- 1. Upserting Institution & Subscriptions ---');
    await supabase.from('institutions').upsert({
        id: INSTITUTION_ID,
        name: 'Cloudora School',
        currency_id: CURRENCY_ID,
        subscription_status: 'active',
        subscription_plan: 'pro',
        addon_bursary: true,
        addon_diary: true,
        addon_library: true,
        addon_messaging: true,
    });

    console.log('--- 2. Upserting Academic Calendar (Years & Terms) ---');
    const { error: ayErr } = await supabase.from('academic_years').upsert([
        {
            id: ACADEMIC_YEAR_2026_ID,
            name: '2026 Academic Year',
            start_date: '2026-01-05',
            end_date: '2026-11-27',
            is_current: true,
            institution_id: INSTITUTION_ID
        }
    ]);
    if (ayErr) { console.error('Academic year upsert error:', ayErr); throw ayErr; }

    const { error: tmErr } = await supabase.from('terms').upsert([
        {
            id: TERM_1_ID,
            academic_year_id: ACADEMIC_YEAR_2026_ID,
            name: 'Term 1',
            start_date: '2026-01-05',
            end_date: '2026-04-03',
            is_current: false,
            institution_id: INSTITUTION_ID
        },
        {
            id: TERM_2_ID,
            academic_year_id: ACADEMIC_YEAR_2026_ID,
            name: 'Term 2',
            start_date: '2026-05-04',
            end_date: '2026-08-07',
            is_current: false,
            institution_id: INSTITUTION_ID
        },
        {
            id: TERM_3_ID,
            academic_year_id: ACADEMIC_YEAR_2026_ID,
            name: 'Term 3',
            start_date: '2026-08-31',
            end_date: '2026-11-27',
            is_current: true,
            institution_id: INSTITUTION_ID
        }
    ]);
    if (tmErr) { console.error('Terms upsert error:', tmErr); throw tmErr; }

    console.log('--- 3. Upserting Grading Scales & Assessment Types ---');
    const gradingScales = [
        { name: 'KCSE Standard Scale', min_score: 80, max_score: 100, letter_grade: 'A', gpa_points: 12, description: 'Excellent', is_active: true, institution_id: INSTITUTION_ID },
        { name: 'KCSE Standard Scale', min_score: 75, max_score: 79.99, letter_grade: 'A-', gpa_points: 11, description: 'Very Good', is_active: true, institution_id: INSTITUTION_ID },
        { name: 'KCSE Standard Scale', min_score: 70, max_score: 74.99, letter_grade: 'B+', gpa_points: 10, description: 'Good', is_active: true, institution_id: INSTITUTION_ID },
        { name: 'KCSE Standard Scale', min_score: 65, max_score: 69.99, letter_grade: 'B', gpa_points: 9, description: 'Fairly Good', is_active: true, institution_id: INSTITUTION_ID },
        { name: 'KCSE Standard Scale', min_score: 60, max_score: 64.99, letter_grade: 'B-', gpa_points: 8, description: 'Above Average', is_active: true, institution_id: INSTITUTION_ID },
        { name: 'KCSE Standard Scale', min_score: 55, max_score: 59.99, letter_grade: 'C+', gpa_points: 7, description: 'Average', is_active: true, institution_id: INSTITUTION_ID },
        { name: 'KCSE Standard Scale', min_score: 50, max_score: 54.99, letter_grade: 'C', gpa_points: 6, description: 'Fair', is_active: true, institution_id: INSTITUTION_ID },
        { name: 'KCSE Standard Scale', min_score: 45, max_score: 49.99, letter_grade: 'C-', gpa_points: 5, description: 'Below Average', is_active: true, institution_id: INSTITUTION_ID },
        { name: 'KCSE Standard Scale', min_score: 40, max_score: 44.99, letter_grade: 'D+', gpa_points: 4, description: 'Weak', is_active: true, institution_id: INSTITUTION_ID },
        { name: 'KCSE Standard Scale', min_score: 35, max_score: 39.99, letter_grade: 'D', gpa_points: 3, description: 'Poor', is_active: true, institution_id: INSTITUTION_ID },
        { name: 'KCSE Standard Scale', min_score: 30, max_score: 34.99, letter_grade: 'D-', gpa_points: 2, description: 'Very Poor', is_active: true, institution_id: INSTITUTION_ID },
        { name: 'KCSE Standard Scale', min_score: 0, max_score: 29.99, letter_grade: 'E', gpa_points: 1, description: 'Fail', is_active: true, institution_id: INSTITUTION_ID },
    ];
    await supabase.from('grading_scales').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('grading_scales').insert(gradingScales);

    const { error: atErr } = await supabase.from('assessment_types').upsert([
        { id: AT_CAT1, name: 'Opener Assessment (CAT 1)', code: 'CAT-1', category: 'continuous_assessment', default_weight: 15, display_order: 1, is_active: true, institution_id: INSTITUTION_ID },
        { id: AT_MIDTERM, name: 'Midterm Examination', code: 'MID-TERM', category: 'examination', default_weight: 30, display_order: 2, is_active: true, institution_id: INSTITUTION_ID },
        { id: AT_CAT2, name: 'Continuous Assessment 2', code: 'CAT-2', category: 'continuous_assessment', default_weight: 15, display_order: 3, is_active: true, institution_id: INSTITUTION_ID },
        { id: AT_ENDTERM, name: 'End of Term Exam', code: 'END-TERM', category: 'examination', default_weight: 40, display_order: 4, is_active: true, institution_id: INSTITUTION_ID },
    ]);
    if (atErr) { console.error('Assessment types upsert error:', atErr); throw atErr; }

    console.log('--- 4. Ensuring Auth & Public Users ---');
    // Ensure Admin
    await supabase.auth.admin.createUser({ id: PRIMARY_ADMIN_USER_ID, email: 'admin@cloudora.demo', password: DEFAULT_SEED_PASSWORD, email_confirm: true }).catch(() => {});
    await supabase.from('users').upsert({ id: PRIMARY_ADMIN_USER_ID, full_name: 'Dr. Joseph Karanja', email: 'admin@cloudora.demo', role: 'admin', institution_id: INSTITUTION_ID, status: 'approved', is_demo: true });
    await supabase.from('admins').upsert({ id: PRIMARY_ADMIN_ID, user_id: PRIMARY_ADMIN_USER_ID, institution_id: INSTITUTION_ID, is_main: true });

    // Teachers
    for (const t of TEACHERS) {
        await supabase.auth.admin.createUser({ id: t.userId, email: t.email, password: DEFAULT_SEED_PASSWORD, email_confirm: true }).catch(() => {});
        const { error: uErr } = await supabase.from('users').upsert({ id: t.userId, full_name: t.name, email: t.email, role: 'teacher', institution_id: INSTITUTION_ID, status: 'approved', is_demo: true });
        if (uErr) { console.error(`User upsert failed for teacher ${t.email}:`, uErr); throw uErr; }
        const { error: tErr } = await supabase.from('teachers').upsert({
            id: t.id,
            user_id: t.userId,
            institution_id: INSTITUTION_ID,
            department: t.dept,
            position: t.pos,
            qualification: t.qualification
        }, { onConflict: 'user_id' });
        if (tErr) { console.error(`Teacher upsert failed for ${t.id}:`, tErr); throw tErr; }
    }

    // Classes (Single teacher assignment per unique constraint classes_teacher_id_key)
    console.log('--- 5. Upserting Classes & Streams ---');
    await supabase.from('classes').upsert([
        { id: CLASS_F3_NORTH, class_type: 'Form', form_level: 3, stream: 'North (Simba)', institution_id: INSTITUTION_ID, teacher_id: PRIMARY_TEACHER_ID },
        { id: CLASS_F3_SOUTH, class_type: 'Form', form_level: 3, stream: 'South (Chui)',  institution_id: INSTITUTION_ID, teacher_id: 'TCH-DEMO-003' },
        { id: CLASS_F2_EAST,  class_type: 'Form', form_level: 2, stream: 'East (Ndovu)',  institution_id: INSTITUTION_ID, teacher_id: 'TCH-DEMO-002' },
        { id: CLASS_F2_WEST,  class_type: 'Form', form_level: 2, stream: 'West (Kifaru)', institution_id: INSTITUTION_ID, teacher_id: 'TCH-DEMO-004' },
        { id: CLASS_F1_ALPHA, class_type: 'Form', form_level: 1, stream: 'Alpha',         institution_id: INSTITUTION_ID, teacher_id: 'TCH-DEMO-005' },
        { id: CLASS_F1_BETA,  class_type: 'Form', form_level: 1, stream: 'Beta',          institution_id: INSTITUTION_ID, teacher_id: 'TCH-DEMO-006' },
    ]);

    // Subjects
    console.log('--- 6. Upserting Kenyan Subjects ---');
    const { error: subErr } = await supabase.from('subjects').upsert([
        { id: SUBJ_MATH, title: 'Mathematics',          class_id: CLASS_F3_NORTH, teacher_id: PRIMARY_TEACHER_ID, institution_id: INSTITUTION_ID, fee_amount: 0 },
        { id: SUBJ_ENG,  title: 'English Language',     class_id: CLASS_F3_NORTH, teacher_id: 'TCH-DEMO-003',     institution_id: INSTITUTION_ID, fee_amount: 0 },
        { id: SUBJ_KISW, title: 'Kiswahili & Fasihi',   class_id: CLASS_F3_NORTH, teacher_id: 'TCH-DEMO-005',     institution_id: INSTITUTION_ID, fee_amount: 0 },
        { id: SUBJ_BIO,  title: 'Biology',              class_id: CLASS_F3_NORTH, teacher_id: 'TCH-DEMO-004',     institution_id: INSTITUTION_ID, fee_amount: 0 },
        { id: SUBJ_CHEM, title: 'Chemistry',            class_id: CLASS_F3_NORTH, teacher_id: 'TCH-DEMO-004',     institution_id: INSTITUTION_ID, fee_amount: 0 },
        { id: SUBJ_PHY,  title: 'Physics',              class_id: CLASS_F3_NORTH, teacher_id: 'TCH-DEMO-006',     institution_id: INSTITUTION_ID, fee_amount: 0 },
        { id: SUBJ_HIST, title: 'History & Government', class_id: CLASS_F3_SOUTH, teacher_id: 'TCH-DEMO-007',     institution_id: INSTITUTION_ID, fee_amount: 0 },
        { id: SUBJ_GEO,  title: 'Geography',            class_id: CLASS_F3_SOUTH, teacher_id: 'TCH-DEMO-007',     institution_id: INSTITUTION_ID, fee_amount: 0 },
        { id: SUBJ_AGRI, title: 'Agriculture',          class_id: CLASS_F3_NORTH, teacher_id: 'TCH-DEMO-008',     institution_id: INSTITUTION_ID, fee_amount: 0 },
        { id: SUBJ_BST,  title: 'Business Studies',     class_id: CLASS_F3_NORTH, teacher_id: 'TCH-DEMO-009',     institution_id: INSTITUTION_ID, fee_amount: 0 },
    ]);
    if (subErr) {
        console.error('Subjects upsert error:', subErr);
        throw subErr;
    }

    // Parents & Students
    console.log('--- 7. Ensuring Students, Parents, and Links ---');
    for (const s of STUDENTS) {
        // Parent auth & profile
        await supabase.auth.admin.createUser({ id: s.parentUserId, email: `parent.${s.name.toLowerCase().replace(/\s+/g, '.')}@cloudora.demo`, password: DEFAULT_SEED_PASSWORD, email_confirm: true }).catch(() => {});
        const { error: puErr } = await supabase.from('users').upsert({ id: s.parentUserId, full_name: s.parentName, email: `parent.${s.name.toLowerCase().replace(/\s+/g, '.')}@cloudora.demo`, role: 'parent', institution_id: INSTITUTION_ID, status: 'approved', is_demo: true });
        if (puErr) { console.error(`Parent user error (${s.parentName}):`, puErr); throw puErr; }
        const { error: prErr } = await supabase.from('parents').upsert({ id: s.parentId, user_id: s.parentUserId, institution_id: INSTITUTION_ID, occupation: s.parentOcc }, { onConflict: 'user_id' });
        if (prErr) { console.error(`Parent profile error (${s.parentId}):`, prErr); throw prErr; }

        // Student auth & profile
        await supabase.auth.admin.createUser({ id: s.userId, email: s.email, password: DEFAULT_SEED_PASSWORD, email_confirm: true }).catch(() => {});
        const { error: suErr } = await supabase.from('users').upsert({ id: s.userId, full_name: s.name, email: s.email, role: 'student', institution_id: INSTITUTION_ID, status: 'approved', is_demo: true });
        if (suErr) { console.error(`Student user error (${s.name}):`, suErr); throw suErr; }
        const { error: stErr } = await supabase.from('students').upsert({
            id: s.id,
            user_id: s.userId,
            institution_id: INSTITUTION_ID,
            class_id: s.classId,
            form_level: s.formLevel,
            academic_year: '2026'
        }, { onConflict: 'user_id' });
        if (stErr) { console.error(`Student profile error (${s.name}):`, stErr); throw stErr; }

        // Link parent to student
        const { error: psErr } = await supabase.from('parent_students').upsert({
            parent_id: s.parentId,
            student_id: s.id,
            relationship: s.relation,
            institution_id: INSTITUTION_ID
        }, { onConflict: 'parent_id,student_id' });
        if (psErr) { console.error(`Parent-student link error (${s.name}):`, psErr); throw psErr; }
    }

    // Enrollments
    console.log('--- 8. Upserting Student Subject Enrollments ---');
    const f3Subjects = [SUBJ_MATH, SUBJ_ENG, SUBJ_KISW, SUBJ_BIO, SUBJ_CHEM, SUBJ_PHY, SUBJ_HIST, SUBJ_GEO, SUBJ_AGRI, SUBJ_BST];
    const enrollmentRecords = [];
    for (const s of STUDENTS) {
        // Enroll all F3 students in standard package
        for (const subId of f3Subjects) {
            enrollmentRecords.push({
                student_id: s.id,
                subject_id: subId,
                class_id: s.classId,
                institution_id: INSTITUTION_ID,
                status: 'enrolled',
                enrollment_date: '2026-01-06'
            });
        }
    }
    // Delete existing enrollments for institution to avoid duplication
    await supabase.from('enrollments').delete().eq('institution_id', INSTITUTION_ID);
    await batchInsert('enrollments', enrollmentRecords);

    // Fee Structures
    console.log('--- 9. Fee Structures ---');
    await supabase.from('fee_structures').upsert([
        { id: FEE_STRUCTURE_ID, title: 'Form 3 Term 1 Tuition & Boarding', amount: 48500, academic_year: '2026', term: 'Term 1', is_active: true, institution_id: INSTITUTION_ID },
        { id: 'f3be7c5a-0000-4000-8000-000000000002', title: 'Form 2 Term 1 Tuition & Boarding', amount: 46000, academic_year: '2026', term: 'Term 1', is_active: true, institution_id: INSTITUTION_ID },
        { id: 'f3be7c5a-0000-4000-8000-000000000003', title: 'Form 1 Term 1 Admission & Tuition', amount: 52000, academic_year: '2026', term: 'Term 1', is_active: true, institution_id: INSTITUTION_ID },
        { id: 'f3be7c5a-0000-4000-8000-000000000004', title: 'School Bus Transportation - Zone A', amount: 12000, academic_year: '2026', term: 'Term 1', is_active: true, institution_id: INSTITUTION_ID },
        { id: 'f3be7c5a-0000-4000-8000-000000000005', title: 'ICT & Science Lab Practical Levy', amount: 4500, academic_year: '2026', term: 'Term 1', is_active: true, institution_id: INSTITUTION_ID },
    ]);
}

// ── 2. CHILD / TRANSACTIONAL DATA ─────────────────────────────────────────────
async function seedWorkflows() {
    console.log('\n--- 10. Seeding Timetable Schedules ---');
    await supabase.from('timetables').delete().eq('institution_id', INSTITUTION_ID);
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periods = [
        { start: '08:00', end: '08:45', room: 'Room 3A', subj: SUBJ_MATH },
        { start: '08:45', end: '09:30', room: 'Room 3A', subj: SUBJ_ENG },
        { start: '09:45', end: '10:30', room: 'Science Lab 1', subj: SUBJ_BIO },
        { start: '10:30', end: '11:15', room: 'Science Lab 2', subj: SUBJ_CHEM },
        { start: '11:30', end: '12:15', room: 'Room 3A', subj: SUBJ_KISW },
        { start: '12:15', end: '13:00', room: 'Physics Lab', subj: SUBJ_PHY },
        { start: '14:00', end: '14:45', room: 'Room 3A', subj: SUBJ_HIST },
        { start: '14:45', end: '15:30', room: 'Computer Lab', subj: SUBJ_BST },
    ];
    const timetableRecords = [];
    for (const day of days) {
        for (const p of periods) {
            timetableRecords.push({
                institution_id: INSTITUTION_ID,
                class_id: CLASS_F3_NORTH,
                subject_id: p.subj,
                day_of_week: day,
                start_time: p.start,
                end_time: p.end,
                room_number: p.room
            });
        }
    }
    await batchInsert('timetables', timetableRecords);

    console.log('--- 11. Seeding Assignments & Submissions ---');
    await supabase.from('submissions').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('assignments').delete().eq('institution_id', INSTITUTION_ID);

    const assignments = [
        { id: 'a5970000-0000-4000-8000-000000000001', title: 'Quadratic Equations & Roots Assignment', desc: 'Solve exercises 4.2 to 4.5 in KLB Secondary Mathematics Book 3.', due: '2026-02-14T17:00:00Z', subj: SUBJ_MATH, classId: CLASS_F3_NORTH, teacher: PRIMARY_TEACHER_ID, points: 50, weight: 10, released: true },
        { id: 'a5970000-0000-4000-8000-000000000002', title: 'Literary Critique: Blossoms of the Savannah', desc: 'Discuss thematic elements of female circumcision and cultural alienation in Ole Kulet\'s text.', due: '2026-02-18T17:00:00Z', subj: SUBJ_ENG, classId: CLASS_F3_NORTH, teacher: 'TCH-DEMO-003', points: 100, weight: 15, released: true },
        { id: 'a5970000-0000-4000-8000-000000000003', title: 'Insha: Athari za Utandawazi Barani Afrika', desc: 'Andika insha isiyopungua maneno 400 kueleza jinsi utandawazi unavyoathiri utamaduni wa Kiafrika.', due: '2026-02-22T17:00:00Z', subj: SUBJ_KISW, classId: CLASS_F3_NORTH, teacher: 'TCH-DEMO-005', points: 40, weight: 10, released: true },
        { id: 'a5970000-0000-4000-8000-000000000004', title: 'Ecology Field Report: Ecosystem Sampling', desc: 'Submit findings from the pond quadrat sampling exercise conducted last Friday.', due: '2026-02-28T17:00:00Z', subj: SUBJ_BIO, classId: CLASS_F3_NORTH, teacher: 'TCH-DEMO-004', points: 50, weight: 10, released: false },
        { id: 'a5970000-0000-4000-8000-000000000005', title: 'Gas Laws & Stoichiometric Calculations', desc: 'Complete Boyle\'s and Charles\' law problem sets 1 through 15.', due: '2026-03-05T17:00:00Z', subj: SUBJ_CHEM, classId: CLASS_F3_NORTH, teacher: 'TCH-DEMO-004', points: 60, weight: 10, released: false },
        { id: 'a5970000-0000-4000-8000-000000000006', title: 'Refraction & Snell\'s Law Lab Report', desc: 'Calculate refractive indices using glass blocks and tracing pins data.', due: '2026-03-12T17:00:00Z', subj: SUBJ_PHY, classId: CLASS_F3_NORTH, teacher: 'TCH-DEMO-006', points: 50, weight: 10, released: false },
        { id: 'a5970000-0000-4000-8000-000000000007', title: 'Constitutional Development in Kenya (1963-2010)', desc: 'Highlight the key constitutional amendment milestones leading up to the 2010 dispensation.', due: '2026-03-18T17:00:00Z', subj: SUBJ_HIST, classId: CLASS_F3_SOUTH, teacher: 'TCH-DEMO-007', points: 80, weight: 15, released: false },
        { id: 'a5970000-0000-4000-8000-000000000008', title: 'Soil Conservation & Terracing Practicum', desc: 'Document bench terraces and grass strip designs for slope runoff control.', due: '2026-03-22T17:00:00Z', subj: SUBJ_AGRI, classId: CLASS_F3_NORTH, teacher: 'TCH-DEMO-008', points: 40, weight: 10, released: false },
    ];

    for (const a of assignments) {
        await supabase.from('assignments').upsert({
            id: a.id,
            title: a.title,
            description: a.desc,
            due_date: a.due,
            status: 'active',
            subject_id: a.subj,
            class_id: a.classId,
            teacher_id: a.teacher,
            institution_id: INSTITUTION_ID,
            total_points: a.points,
            weight: a.weight,
            term: 'Term 1',
            grades_released: a.released,
            is_published: true
        });
    }

    // Diverse Submissions
    const submissionRecords = [];
    const feedbackList = [
        'Exemplary execution! Clear derivation of formulas and step-by-step reasoning.',
        'Good attempt. Pay closer attention to units and algebraic sign conventions.',
        'Well formulated thesis. Argument is sustained effectively throughout the paragraphs.',
        'Late submission accepted with slight penalty. Solid comprehension demonstrated.',
        'Needs revision on the quadratic formula discriminant calculation.'
    ];

    for (const s of STUDENTS.slice(0, 8)) { // Focus on F3 class members
        // Assignment 1 (Math)
        submissionRecords.push({
            id: crypto.randomUUID(),
            student_id: s.id,
            assignment_id: assignments[0].id,
            subject_id: SUBJ_MATH,
            class_id: CLASS_F3_NORTH,
            institution_id: INSTITUTION_ID,
            status: 'graded',
            grade: s.id === PRIMARY_STUDENT_ID ? 48 : (s.gender === 'female' ? 44 : 39),
            feedback: feedbackList[0],
            submitted_at: '2026-02-13T14:30:00Z',
            content: 'Completed exercises 4.2 through 4.5. All equations verified using quadratic factoring.'
        });

        // Assignment 2 (English)
        submissionRecords.push({
            id: crypto.randomUUID(),
            student_id: s.id,
            assignment_id: assignments[1].id,
            subject_id: SUBJ_ENG,
            class_id: CLASS_F3_NORTH,
            institution_id: INSTITUTION_ID,
            status: s.id === 'c6300000-0000-4000-8000-000000000005' ? 'late' : 'graded',
            grade: s.id === 'c6300000-0000-4000-8000-000000000005' ? null : 88,
            feedback: s.id === 'c6300000-0000-4000-8000-000000000005' ? 'Awaiting teacher review' : feedbackList[2],
            submitted_at: '2026-02-18T19:45:00Z',
            content: 'Essay on cultural conflict in Blossoms of the Savannah submitted in standard format.'
        });

        // Assignment 3 (Kiswahili)
        submissionRecords.push({
            id: crypto.randomUUID(),
            student_id: s.id,
            assignment_id: assignments[2].id,
            subject_id: SUBJ_KISW,
            class_id: CLASS_F3_NORTH,
            institution_id: INSTITUTION_ID,
            status: 'submitted',
            grade: null,
            feedback: null,
            submitted_at: '2026-02-21T11:20:00Z',
            content: 'Insha kuhusu utandawazi na tamaduni za kiasili Kenya.'
        });
    }
    await batchInsert('submissions', submissionRecords);

    console.log('--- 12. Seeding Exams, Exam Results, and Gradebook Entries ---');
    await supabase.from('exam_results').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('grade_entries').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('exams').delete().eq('institution_id', INSTITUTION_ID);

    const exams = [
        { id: 'e8a30000-0000-4000-8000-000000000001', title: 'Mathematics Midterm Examination', subj: SUBJ_MATH, classId: CLASS_F3_NORTH, teacher: PRIMARY_TEACHER_ID, weight: 30, date: '2026-02-25' },
        { id: 'e8a30000-0000-4000-8000-000000000002', title: 'English Literature Midterm Examination', subj: SUBJ_ENG, classId: CLASS_F3_NORTH, teacher: 'TCH-DEMO-003', weight: 30, date: '2026-02-26' },
        { id: 'e8a30000-0000-4000-8000-000000000003', title: 'Kiswahili Karatasi ya 1 & 2', subj: SUBJ_KISW, classId: CLASS_F3_NORTH, teacher: 'TCH-DEMO-005', weight: 30, date: '2026-02-27' },
        { id: 'e8a30000-0000-4000-8000-000000000004', title: 'Biology Theory & Practical Midterm', subj: SUBJ_BIO, classId: CLASS_F3_NORTH, teacher: 'TCH-DEMO-004', weight: 30, date: '2026-03-01' },
        { id: 'e8a30000-0000-4000-8000-000000000005', title: 'Chemistry Volumetric Analysis Exam', subj: SUBJ_CHEM, classId: CLASS_F3_NORTH, teacher: 'TCH-DEMO-004', weight: 30, date: '2026-03-02' },
        { id: 'e8a30000-0000-4000-8000-000000000006', title: 'Physics Mechanics & Optics Midterm', subj: SUBJ_PHY, classId: CLASS_F3_NORTH, teacher: 'TCH-DEMO-006', weight: 30, date: '2026-03-03' },
    ];

    for (const e of exams) {
        await supabase.from('exams').upsert({
            id: e.id,
            title: e.title,
            description: 'Midterm standard assessment per term schedule',
            date: e.date,
            max_score: 100,
            subject_id: e.subj,
            class_id: e.classId,
            teacher_id: e.teacher,
            institution_id: INSTITUTION_ID,
            weight: e.weight,
            term: 'Term 1',
            is_published: true
        });
    }

    const examResults = [];
    const gradeEntries = [];
    for (const e of exams) {
        for (const s of STUDENTS.slice(0, 8)) {
            let score = 72;
            if (s.id === PRIMARY_STUDENT_ID) score = 88;
            else if (s.name === 'Joy Muthoni') score = 94;
            else if (s.name === 'Kevin Koech') score = 58;
            else if (s.name === 'Victor Wanyama') score = 64;

            examResults.push({
                student_id: s.id,
                exam_id: e.id,
                institution_id: INSTITUTION_ID,
                score,
                graded_by: e.teacher,
                feedback: score >= 80 ? 'Distinction' : (score >= 65 ? 'Credit' : 'Pass')
            });

            // Corresponding Grade Entry in Gradebook
            gradeEntries.push({
                student_id: s.id,
                subject_id: e.subj,
                class_id: CLASS_F3_NORTH,
                term_id: TERM_1_ID,
                assessment_type_id: AT_MIDTERM,
                score,
                max_score: 100,
                percentage: score,
                weight_applied: 30,
                weighted_score: (score * 0.3).toFixed(1),
                feedback: score >= 80 ? 'Mastery of concepts' : 'Satisfactory progress',
                graded_by: e.teacher,
                source: 'exam',
                status: 'final',
                institution_id: INSTITUTION_ID
            });
        }
    }
    await batchInsert('exam_results', examResults);
    await batchInsert('grade_entries', gradeEntries);

    console.log('--- 13. Seeding Generated Report Cards ---');
    await supabase.from('report_cards').delete().eq('institution_id', INSTITUTION_ID);
    const reportCards = STUDENTS.slice(0, 8).map((s, idx) => ({
        student_id: s.id,
        class_id: CLASS_F3_NORTH,
        term_id: TERM_1_ID,
        academic_year_id: ACADEMIC_YEAR_2026_ID,
        total_weighted_score: 720 - (idx * 25),
        average_percentage: (85.5 - (idx * 3.1)).toFixed(1),
        gpa: (3.90 - (idx * 0.15)).toFixed(2),
        letter_grade: idx === 0 ? 'A' : (idx < 3 ? 'A-' : (idx < 6 ? 'B+' : 'B')),
        rank_in_class: idx + 1,
        total_students_in_class: 38,
        attendance_count: 52 - (idx % 3),
        total_school_days: 54,
        teacher_remarks: idx === 0 ? 'Outstanding academic caliber and discipline throughout the term.' : 'Commendable diligence shown across all subjects.',
        admin_remarks: 'Promising trajectory. Recommended for academic honors.',
        status: 'published',
        released_at: '2026-03-01T08:00:00Z',
        released_by: PRIMARY_ADMIN_USER_ID,
        institution_id: INSTITUTION_ID
    }));
    await batchInsert('report_cards', reportCards);

    console.log('--- 14. Seeding Attendance History (Past 25 School Days) ---');
    await supabase.from('attendance').delete().eq('institution_id', INSTITUTION_ID);
    const attendanceRecords = [];
    const pastDays = Array.from({ length: 25 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (i + 1));
        return d.toISOString().split('T')[0];
    });

    for (const date of pastDays) {
        for (const s of STUDENTS.slice(0, 8)) {
            const isLate = s.name === 'Victor Wanyama' && Math.random() > 0.6;
            const isAbsent = s.name === 'Kevin Koech' && Math.random() > 0.85;
            const status = isAbsent ? 'absent' : (isLate ? 'late' : 'present');

            attendanceRecords.push({
                student_id: s.id,
                class_id: CLASS_F3_NORTH,
                subject_id: SUBJ_MATH,
                institution_id: INSTITUTION_ID,
                date,
                status,
                notes: isLate ? 'Arrived during assembly' : (isAbsent ? 'Medical excuse submitted' : null)
            });
        }
    }
    await batchInsert('attendance', attendanceRecords);

    console.log('--- 15. Seeding Library Catalog & Active Circulation ---');
    await supabase.from('borrowed_books').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('books').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('library_config').delete().eq('institution_id', INSTITUTION_ID);

    await supabase.from('library_config').insert({
        institution_id: INSTITUTION_ID,
        min_fee_percent_for_borrow: 0.4,
        default_borrow_limit: 4,
        active: true
    });

    const books = [
        { id: 'b1000000-0000-4000-8000-000000000001', title: 'Blossoms of the Savannah', author: 'Henry Ole Kulet', isbn: '978-9966-25-832-1', category: 'Set Books', total_quantity: 45, available_quantity: 38, publisher: 'Longhorn Publishers', publication_year: 2017, call_number: '823 KUL', language: 'English', shelf_location: 'Shelf B-2' },
        { id: 'b1000000-0000-4000-8000-000000000002', title: 'A Doll\'s House', author: 'Henrik Ibsen', isbn: '978-9966-10-112-4', category: 'Set Books', total_quantity: 50, available_quantity: 42, publisher: 'East African Educational Publishers', publication_year: 2018, call_number: '839 IBS', language: 'English', shelf_location: 'Shelf B-3' },
        { id: 'b1000000-0000-4000-8000-000000000003', title: 'Chozi la Heri', author: 'Assumpta K. Matei', isbn: '978-9966-01-229-3', category: 'Fasihi', total_quantity: 40, available_quantity: 31, publisher: 'One Planet Publishing', publication_year: 2018, call_number: '896 MAT', language: 'Kiswahili', shelf_location: 'Shelf F-1' },
        { id: 'b1000000-0000-4000-8000-000000000004', title: 'KLB Secondary Mathematics Form 3', author: 'Kenya Literature Bureau', isbn: '978-9966-44-633-8', category: 'Textbooks', total_quantity: 60, available_quantity: 52, publisher: 'KLB Kenya', publication_year: 2021, call_number: '510 KLB', language: 'English', shelf_location: 'Shelf M-4' },
        { id: 'b1000000-0000-4000-8000-000000000005', title: 'Certificate Chemistry Book 3', author: 'T. D. Patel & A. S. R. Ndugu', isbn: '978-9966-22-441-2', category: 'Textbooks', total_quantity: 35, available_quantity: 29, publisher: 'Oxford University Press EA', publication_year: 2020, call_number: '540 PAT', language: 'English', shelf_location: 'Shelf C-1' },
        { id: 'b1000000-0000-4000-8000-000000000006', title: 'Longhorn Secondary Physics Form 3', author: 'F. K. Mungai & D. K. Gitonga', isbn: '978-9966-36-512-9', category: 'Textbooks', total_quantity: 30, available_quantity: 25, publisher: 'Longhorn Publishers', publication_year: 2022, call_number: '530 MUN', language: 'English', shelf_location: 'Shelf P-2' },
        { id: 'b1000000-0000-4000-8000-000000000007', title: 'Kigogo: Tamthilia ya Kisasa', author: 'Pauline Kea Kyovi', isbn: '978-9966-01-199-9', category: 'Fasihi', total_quantity: 25, available_quantity: 19, publisher: 'Storymoja Africa', publication_year: 2019, call_number: '896 KEA', language: 'Kiswahili', shelf_location: 'Shelf F-2' },
        { id: 'b1000000-0000-4000-8000-000000000008', title: 'Top Mark KCSE Revision Biology', author: 'A. B. Oduor', isbn: '978-9966-44-889-9', category: 'Revision', total_quantity: 20, available_quantity: 14, publisher: 'KLB Kenya', publication_year: 2023, call_number: '570 ODU', language: 'English', shelf_location: 'Shelf R-3' },
    ];

    for (const b of books) {
        await supabase.from('books').upsert({ ...b, institution_id: INSTITUTION_ID });
    }

    const borrowed = [
        { book_id: books[0].id, student_id: PRIMARY_STUDENT_ID, borrowed_at: '2026-02-10T10:00:00Z', due_date: '2026-02-24', status: 'borrowed', notes: 'Active loan' },
        { book_id: books[3].id, student_id: PRIMARY_STUDENT_ID, borrowed_at: '2026-01-15T09:00:00Z', due_date: '2026-01-29', returned_at: '2026-01-28T14:00:00Z', status: 'returned', notes: 'Returned in good condition' },
        { book_id: books[1].id, student_id: 'c6300000-0000-4000-8000-000000000002', borrowed_at: '2026-02-12T11:00:00Z', due_date: '2026-02-26', status: 'borrowed', notes: 'Active loan' },
        { book_id: books[2].id, student_id: 'c6300000-0000-4000-8000-000000000003', borrowed_at: '2026-02-01T08:30:00Z', due_date: '2026-02-15', status: 'overdue', notes: 'Reminder sent to student' },
        { book_id: books[4].id, student_id: 'c6300000-0000-4000-8000-000000000004', borrowed_at: '2026-02-14T15:00:00Z', due_date: '2026-02-28', status: 'borrowed', notes: 'Active loan' },
        { book_id: books[5].id, student_id: 'c6300000-0000-4000-8000-000000000005', borrowed_at: '2026-01-20T12:00:00Z', due_date: '2026-02-03', returned_at: '2026-02-02T16:00:00Z', status: 'returned', notes: 'Returned on time' },
        { book_id: books[6].id, student_id: 'c6300000-0000-4000-8000-000000000006', borrowed_at: '2026-02-18T10:30:00Z', due_date: '2026-03-04', status: 'borrowed', notes: 'Active loan' },
        { book_id: books[7].id, student_id: 'c6300000-0000-4000-8000-000000000007', borrowed_at: '2026-01-25T14:15:00Z', due_date: '2026-02-08', status: 'overdue', notes: 'Second notice issued' },
    ];
    for (const item of borrowed) {
        await supabase.from('borrowed_books').insert({ ...item, institution_id: INSTITUTION_ID });
    }

    console.log('--- 16. Seeding Bursaries & Bursary Applications ---');
    await supabase.from('bursary_applications').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('bursaries').delete().eq('institution_id', INSTITUTION_ID);

    const bursaries = [
        { id: 'bb000000-0000-4000-8000-000000000001', title: 'Equity Wings to Fly Secondary Scholarship', description: 'Comprehensive bursary funding tuition and boarding for top performers from vulnerable backgrounds.', amount: 48500, deadline: '2026-03-31', requirements: 'Form 3 report card above 75%, parent income verification', status: 'open' },
        { id: 'bb000000-0000-4000-8000-000000000002', title: 'National Government CDF Bursary Scheme', description: 'Constituency Development Fund support for continuing high school students.', amount: 20000, deadline: '2026-04-15', requirements: 'Voter card from constituency, chief recommendation letter', status: 'open' },
        { id: 'bb000000-0000-4000-8000-000000000003', title: 'Cloudora Academic Merit Award', description: 'Institutional grant rewarding top 3 students in each academic level.', amount: 25000, deadline: '2026-03-15', requirements: 'Minimum mean grade of A- in previous academic year', status: 'open' },
    ];
    for (const b of bursaries) {
        await supabase.from('bursaries').upsert({ ...b, institution_id: INSTITUTION_ID });
    }

    const bursaryApps = [
        { bursary_id: bursaries[0].id, student_id: PRIMARY_STUDENT_ID, justification: 'Demonstrated consistent A- average; single-income family needing tuition support.', status: 'approved', applied_at: '2026-01-18T10:00:00Z', reviewed_at: '2026-01-25T14:00:00Z', reviewed_by: PRIMARY_ADMIN_USER_ID, amount_awarded: '48500', notes: 'Full scholarship awarded based on academic distinction.' },
        { bursary_id: bursaries[1].id, student_id: 'c6300000-0000-4000-8000-000000000002', justification: 'Seeking partial bursary to offset boarding fee deficit.', status: 'pending', applied_at: '2026-02-05T09:00:00Z', reviewed_at: null, reviewed_by: null, amount_awarded: null, notes: 'Awaiting constituency committee vetting' },
        { bursary_id: bursaries[2].id, student_id: 'c6300000-0000-4000-8000-000000000004', justification: 'Ranked #1 in Form 3 Simba stream with 88% aggregate.', status: 'approved', applied_at: '2026-01-20T11:30:00Z', reviewed_at: '2026-01-28T16:00:00Z', reviewed_by: PRIMARY_ADMIN_USER_ID, amount_awarded: '25000', notes: 'Merit scholarship credited directly to student fee ledger.' },
        { bursary_id: bursaries[1].id, student_id: 'c6300000-0000-4000-8000-000000000005', justification: 'Sports captain applying for leadership co-curricular grant.', status: 'rejected', applied_at: '2026-01-22T14:10:00Z', reviewed_at: '2026-02-01T10:00:00Z', reviewed_by: PRIMARY_ADMIN_USER_ID, amount_awarded: '0', notes: 'CDF scheme strictly prioritizes academic hardship over athletics.' },
        { bursary_id: bursaries[0].id, student_id: 'c6300000-0000-4000-8000-000000000006', justification: 'Applicant lost guardian in December 2025.', status: 'pending', applied_at: '2026-02-10T12:00:00Z', reviewed_at: null, reviewed_by: null, amount_awarded: null, notes: 'Documents under social welfare verification' },
        { bursary_id: bursaries[1].id, student_id: 'c6300000-0000-4000-8000-000000000007', justification: 'Family has 3 siblings currently enrolled in secondary school.', status: 'pending', applied_at: '2026-02-14T15:30:00Z', reviewed_at: null, reviewed_by: null, amount_awarded: null, notes: 'Pending ward bursary committee sign-off' },
    ];
    for (const app of bursaryApps) {
        await supabase.from('bursary_applications').insert({ ...app, institution_id: INSTITUTION_ID });
    }

    console.log('--- 17. Seeding Institutional Funds & Department Allocations ---');
    await supabase.from('fund_allocations').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('funds').delete().eq('institution_id', INSTITUTION_ID);

    const funds = [
        { id: 'ff000000-0000-4000-8000-000000000001', name: 'Science & Laboratory Modernization Fund', description: 'Procurement of advanced optical microscopes and reagent chemicals for biology and chemistry.', total_amount: 1500000, allocated_amount: 850000 },
        { id: 'ff000000-0000-4000-8000-000000000002', name: 'School Infrastructure & Solar Expansion', description: 'Installation of 20kW grid-tied solar photovoltaic system to power computer laboratories.', total_amount: 3200000, allocated_amount: 2800000 },
        { id: 'ff000000-0000-4000-8000-000000000003', name: 'Library & Digital Content Acquisition', description: 'Procurement of updated CBC curriculum guides, e-readers, and set book editions.', total_amount: 600000, allocated_amount: 450000 },
        { id: 'ff000000-0000-4000-8000-000000000004', name: 'Co-Curricular & Sports Development', description: 'Pitch maintenance, athletics track marking, rugby gear, and drama festival travel costs.', total_amount: 900000, allocated_amount: 620000 },
    ];
    for (const f of funds) {
        await supabase.from('funds').upsert({ ...f, institution_id: INSTITUTION_ID });
    }

    const allocations = [
        { fund_id: funds[0].id, title: 'Chemistry Lab Glassware & Titration Burettes', description: '50 units of Pyrex glassware and titration apparatus.', amount: 350000, category: 'Laboratory Equipment', status: 'approved' },
        { fund_id: funds[0].id, title: 'Biology Specimen Preservatives & Slides', description: 'Histology prepared slides and dissection kits.', amount: 200000, category: 'Consumables', status: 'spent' },
        { fund_id: funds[1].id, title: 'Lithium Iron Phosphate Battery Bank (Phase 1)', description: 'Solar energy storage rack for server and computer labs.', amount: 1800000, category: 'Capital Expenditure', status: 'spent' },
        { fund_id: funds[2].id, title: '2026 KCSE Literature Set Book Batch', description: '100 copies of Blossoms of the Savannah and A Doll\'s House.', amount: 250000, category: 'Learning Materials', status: 'spent' },
        { fund_id: funds[3].id, title: 'Regional Drama Festival Registration & Transport', description: 'School bus fuel and festival delegate fees for drama troupe.', amount: 280000, category: 'Co-Curricular', status: 'approved' },
        { fund_id: funds[0].id, title: 'Compound Light Microscopes (10 units)', description: 'Olympus student compound optical microscopes for biology practical exams.', amount: 300000, category: 'Laboratory Equipment', status: 'planned' },
        { fund_id: funds[1].id, title: 'Inverter Upgrade & Surge Protection', description: 'Pure sine wave industrial inverter replacement.', amount: 500000, category: 'Capital Expenditure', status: 'planned' },
        { fund_id: funds[3].id, title: 'National Rugby 7s Kit & Ball Replacements', description: 'Jerseys, boots, and Gilbert match balls for championship.', amount: 150000, category: 'Co-Curricular', status: 'approved' }
    ];
    for (const alloc of allocations) {
        const { error: alErr } = await supabase.from('fund_allocations').insert({ ...alloc, institution_id: INSTITUTION_ID });
        if (alErr) throw alErr;
    }

    console.log('--- 18. Seeding Payments & Financial Transactions ---');
    await supabase.from('payments').delete().eq('institution_id', INSTITUTION_ID);
    const payments = [
        { student_id: PRIMARY_STUDENT_ID, fee_structure_id: FEE_STRUCTURE_ID, amount: 48500, status: 'completed', payment_method: 'mobile_money', reference_number: 'QKB7492H10', is_evidence_confirmed: true, admin_notes: 'M-Pesa Paybill payment verified' },
        { student_id: 'c6300000-0000-4000-8000-000000000002', fee_structure_id: FEE_STRUCTURE_ID, amount: 30000, status: 'completed', payment_method: 'bank_transfer', reference_number: 'KCB-TR-994820', is_evidence_confirmed: true, admin_notes: 'KCB Bank deposit slip confirmed' },
        { student_id: 'c6300000-0000-4000-8000-000000000003', fee_structure_id: FEE_STRUCTURE_ID, amount: 25000, status: 'completed', payment_method: 'mobile_money', reference_number: 'RLM9283K94', is_evidence_confirmed: true, admin_notes: 'Installment 1 received' },
        { student_id: 'c6300000-0000-4000-8000-000000000004', fee_structure_id: FEE_STRUCTURE_ID, amount: 48500, status: 'completed', payment_method: 'bank_transfer', reference_number: 'EQT-7749201', is_evidence_confirmed: true, admin_notes: 'Equity Bank full payment' },
        { student_id: 'c6300000-0000-4000-8000-000000000005', fee_structure_id: FEE_STRUCTURE_ID, amount: 20000, status: 'pending', payment_method: 'mobile_money', reference_number: 'SDA482019M', is_evidence_confirmed: false, admin_notes: 'Awaiting bank clearance statement' },
        { student_id: 'c6300000-0000-4000-8000-000000000006', fee_structure_id: FEE_STRUCTURE_ID, amount: 48500, status: 'completed', payment_method: 'mobile_money', reference_number: 'TXN8491028', is_evidence_confirmed: true, admin_notes: 'Cleared full term balance' },
        { student_id: 'c6300000-0000-4000-8000-000000000007', fee_structure_id: FEE_STRUCTURE_ID, amount: 15000, status: 'completed', payment_method: 'cash', reference_number: 'CSH-REC-0412', is_evidence_confirmed: true, admin_notes: 'Bursar cash receipt issued' },
        { student_id: 'c6300000-0000-4000-8000-000000000008', fee_structure_id: FEE_STRUCTURE_ID, amount: 35000, status: 'completed', payment_method: 'mobile_money', reference_number: 'MP-8839201K', is_evidence_confirmed: true, admin_notes: 'M-Pesa payment confirmed' },
    ];
    for (const p of payments) {
        await supabase.from('payments').insert({
            ...p,
            institution_id: INSTITUTION_ID,
            payment_date: new Date(Date.now() - Math.floor(Math.random() * 20 * 86400000)).toISOString()
        });
    }

    console.log('--- 19. Seeding Promotion Cycles & Decisions ---');
    await supabase.from('promotion_decisions').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('promotion_cycles').delete().eq('institution_id', INSTITUTION_ID);

    const cycleId = '9c000000-0000-4000-8000-000000000001';
    const { error: pcErr } = await supabase.from('promotion_cycles').insert({
        id: cycleId,
        name: '2025 Form 2 to Form 3 Progression Cycle',
        term_id: TERM_1_ID,
        from_class_id: CLASS_F2_EAST,
        to_class_id: CLASS_F3_NORTH,
        min_average_percentage: 50.0,
        min_attendance_percentage: 75.0,
        status: 'completed',
        institution_id: INSTITUTION_ID,
        executed_at: '2026-01-04T10:00:00Z',
        created_by: PRIMARY_ADMIN_USER_ID,
        executed_by: PRIMARY_ADMIN_USER_ID
    });
    if (pcErr) {
        console.error('Promotion cycle error:', pcErr);
        throw pcErr;
    }

    const promotionDecisions = STUDENTS.slice(0, 8).map(s => ({
        cycle_id: cycleId,
        student_id: s.id,
        from_class_id: CLASS_F2_EAST,
        to_class_id: CLASS_F3_NORTH,
        term_id: TERM_1_ID,
        average_percentage: 76.5,
        attendance_percentage: 94.0,
        eligible: true,
        status: 'promoted',
        reason: 'Surpassed minimum academic baseline of 50% and attendance threshold.',
        promoted_at: '2026-01-04T10:05:00Z',
        promoted_by: PRIMARY_ADMIN_USER_ID,
        institution_id: INSTITUTION_ID
    }));
    await batchInsert('promotion_decisions', promotionDecisions);

    console.log('--- 20. Seeding Direct Messaging Conversations & Threads ---');
    await supabase.from('messages').delete().eq('institution_id', INSTITUTION_ID);
    const { data: convs } = await supabase.from('conversations').select('id').eq('institution_id', INSTITUTION_ID);
    if (convs && convs.length > 0) {
        const convIds = convs.map(c => c.id);
        await supabase.from('conversation_participants').delete().in('conversation_id', convIds);
    }
    await supabase.from('conversations').delete().eq('institution_id', INSTITUTION_ID);

    // Thread 1: Teacher (Sarah) <-> Parent (James Mwangi)
    const conv1Id = 'cc000000-0000-4000-8000-000000000001';
    const { error: c1Err } = await supabase.from('conversations').insert({ id: conv1Id, type: 'DIRECT', institution_id: INSTITUTION_ID, direct_key: `${PRIMARY_TEACHER_USER_ID}_${PRIMARY_PARENT_USER_ID}`, last_message_at: '2026-02-28T16:30:00Z' });
    if (c1Err) throw c1Err;
    const { error: cp1Err } = await supabase.from('conversation_participants').insert([
        { conversation_id: conv1Id, user_id: PRIMARY_TEACHER_USER_ID },
        { conversation_id: conv1Id, user_id: PRIMARY_PARENT_USER_ID, last_read_at: '2026-02-28T16:35:00Z' }
    ]);
    if (cp1Err) throw cp1Err;

    const conv1Messages = [
        { sender_id: PRIMARY_TEACHER_USER_ID, receiver_id: PRIMARY_PARENT_USER_ID, subject: 'Kelson\'s Mathematics Progress', content: 'Good afternoon Mr. Mwangi. Kelson scored 88% in his recent Algebra assessment. He demonstrates exceptional grasp of algebraic factoring.', is_read: true, created_at: '2026-02-28T14:00:00Z' },
        { sender_id: PRIMARY_PARENT_USER_ID, receiver_id: PRIMARY_TEACHER_USER_ID, subject: 'RE: Kelson\'s Mathematics Progress', content: 'Thank you Madam Sarah for the update! We are very proud of his consistency. Are there advanced competition problems you would recommend for him?', is_read: true, created_at: '2026-02-28T14:45:00Z' },
        { sender_id: PRIMARY_TEACHER_USER_ID, receiver_id: PRIMARY_PARENT_USER_ID, subject: 'Math Olympiad Preparation', content: 'Yes! I have enrolled him in the Kenya Mathematics Olympiad training session starting this Saturday morning.', is_read: true, created_at: '2026-02-28T15:20:00Z' },
        { sender_id: PRIMARY_PARENT_USER_ID, receiver_id: PRIMARY_TEACHER_USER_ID, subject: 'RE: Math Olympiad Preparation', content: 'Wonderful. I will ensure he is in school by 8:00 AM on Saturday. Thank you for your mentorship.', is_read: false, created_at: '2026-02-28T16:30:00Z' }
    ];
    for (const m of conv1Messages) {
        const { error: mErr } = await supabase.from('messages').insert({ ...m, conversation_id: conv1Id, institution_id: INSTITUTION_ID });
        if (mErr) throw mErr;
    }

    // Thread 2: Student (Kelson) <-> Teacher (Sarah)
    const conv2Id = 'cc000000-0000-4000-8000-000000000002';
    const { error: c2Err } = await supabase.from('conversations').insert({ id: conv2Id, type: 'DIRECT', institution_id: INSTITUTION_ID, direct_key: `${PRIMARY_STUDENT_USER_ID}_${PRIMARY_TEACHER_USER_ID}`, last_message_at: '2026-03-01T10:15:00Z' });
    if (c2Err) throw c2Err;
    const { error: cp2Err } = await supabase.from('conversation_participants').insert([
        { conversation_id: conv2Id, user_id: PRIMARY_STUDENT_USER_ID },
        { conversation_id: conv2Id, user_id: PRIMARY_TEACHER_USER_ID, last_read_at: '2026-03-01T10:20:00Z' }
    ]);
    if (cp2Err) throw cp2Err;

    const conv2Messages = [
        { sender_id: PRIMARY_STUDENT_USER_ID, receiver_id: PRIMARY_TEACHER_USER_ID, subject: 'Question on Question 8 (Homework)', content: 'Good morning Teacher Sarah. On problem 8, should we solve by completing the square or using the quadratic formula?', is_read: true, created_at: '2026-03-01T09:30:00Z' },
        { sender_id: PRIMARY_TEACHER_USER_ID, receiver_id: PRIMARY_STUDENT_USER_ID, subject: 'RE: Question on Question 8', content: 'Good question Kelson. You can use either method, but completing the square helps you clearly identify the vertex form coordinates.', is_read: true, created_at: '2026-03-01T10:15:00Z' }
    ];
    for (const m of conv2Messages) {
        const { error: mErr } = await supabase.from('messages').insert({ ...m, conversation_id: conv2Id, institution_id: INSTITUTION_ID });
        if (mErr) throw mErr;
    }

    // Thread 3: Admin (Dr. Joseph) <-> Teacher (Sarah)
    const conv3Id = 'cc000000-0000-4000-8000-000000000003';
    const { error: c3Err } = await supabase.from('conversations').insert({ id: conv3Id, type: 'DIRECT', institution_id: INSTITUTION_ID, direct_key: `${PRIMARY_ADMIN_USER_ID}_${PRIMARY_TEACHER_USER_ID}`, last_message_at: '2026-03-02T08:30:00Z' });
    if (c3Err) throw c3Err;
    const { error: cp3Err } = await supabase.from('conversation_participants').insert([
        { conversation_id: conv3Id, user_id: PRIMARY_ADMIN_USER_ID },
        { conversation_id: conv3Id, user_id: PRIMARY_TEACHER_USER_ID }
    ]);
    if (cp3Err) throw cp3Err;

    const conv3Messages = [
        { sender_id: PRIMARY_ADMIN_USER_ID, receiver_id: PRIMARY_TEACHER_USER_ID, subject: 'Term 1 Midterm Mark Entry Deadline', content: 'Dear Sarah, please ensure all Form 3 mathematics scores are submitted in the gradebook portal by 5:00 PM Wednesday for report card generation.', is_read: false, created_at: '2026-03-02T08:30:00Z' }
    ];
    for (const m of conv3Messages) {
        const { error: mErr } = await supabase.from('messages').insert({ ...m, conversation_id: conv3Id, institution_id: INSTITUTION_ID });
        if (mErr) throw mErr;
    }

    console.log('--- 21. Seeding School Announcements & Diary Entries ---');
    await supabase.from('announcements').delete().eq('institution_id', INSTITUTION_ID);
    const announcements = [
        { teacher_id: PRIMARY_TEACHER_ID, subject_id: SUBJ_MATH, title: 'National Mathematics Contest Registration', message: 'Registration for the annual Mang\'u High National Mathematics Contest is now open for Forms 2, 3, and 4.' },
        { teacher_id: PRIMARY_TEACHER_ID, subject_id: SUBJ_ENG, title: 'Set Book Theater Performance This Friday', message: 'A visiting theater troupe will perform Blossoms of the Savannah in the Multi-Purpose Hall on Friday from 2:00 PM.' },
        { teacher_id: PRIMARY_TEACHER_ID, subject_id: null, title: 'Term 1 Mid-Term Break Schedule', message: 'School will break for midterm on Thursday, 26th February at 12:30 PM. Students are expected back on Monday, 2nd March by 4:00 PM.' },
        { teacher_id: PRIMARY_TEACHER_ID, subject_id: null, title: 'Annual Inter-House Athletics Championship', message: 'Inter-house field events and track heats commence next Tuesday. Simba, Chui, Ndovu, and Kifaru houses are ready.' },
        { teacher_id: PRIMARY_TEACHER_ID, subject_id: null, title: 'Parent-Teacher Academic Consultation Day', message: 'All parents and guardians of Form 3 students are invited to meet subject teachers on Saturday, 14th March.' },
        { teacher_id: PRIMARY_TEACHER_ID, subject_id: SUBJ_BIO, title: 'Biology Field Excursion to Karura Forest', message: 'Form 3 ecological studies fieldwork trip takes place on Wednesday. Ensure consent slips are returned.' },
        { teacher_id: PRIMARY_TEACHER_ID, subject_id: null, title: 'Fee Payment Deadline for Term 1 Balance', message: 'Parents with outstanding school fee balances are kindly requested to clear via Paybill 247247 before midterm.' },
        { teacher_id: PRIMARY_TEACHER_ID, subject_id: SUBJ_CHEM, title: 'Safety Gear Mandatory for Organic Chemistry Labs', message: 'All students must possess approved safety goggles and white lab coats before entering Science Lab 2.' }
    ];
    for (const a of announcements) {
        const { error: aErr } = await supabase.from('announcements').insert({ ...a, institution_id: INSTITUTION_ID });
        if (aErr) throw aErr;
    }

    await supabase.from('diary_entries').delete().eq('institution_id', INSTITUTION_ID);
    const diary = [
        { class_id: CLASS_F3_NORTH, title: 'Derivation of Quadratic Formula Lesson', content: 'Guided learners through completing the square to derive x = [-b ± sqrt(b² - 4ac)] / 2a. Learners actively participated in worked examples.', entry_date: '2026-02-23' },
        { class_id: CLASS_F3_NORTH, title: 'Character Analysis: Resian & Taiyo in Blossoms', content: 'Detailed textual comparison between the two sisters\' resilience in the face of archaic patriarchal pressures.', entry_date: '2026-02-24' },
        { class_id: CLASS_F3_NORTH, title: 'Volumetric Titration: Acid-Base Indicators', content: 'Learners standardized 0.1M NaOH against hydrochloric acid using phenolphthalein indicator. End-points were sharp.', entry_date: '2026-02-25' },
        { class_id: CLASS_F3_NORTH, title: 'Cell Division: Mitosis Stages Observation', content: 'Microscopic examination of root tip squash slides. Observed prophase, metaphase, and anaphase chromosomes.', entry_date: '2026-02-26' },
        { class_id: CLASS_F3_NORTH, title: 'Uchambuzi wa Mandhari katika Chozi la Heri', content: 'Tulijadili mandhari ya msitu wa Macheo na jinsi yalivyochangia mateso ya wahusika.', entry_date: '2026-02-27' },
        { class_id: CLASS_F3_NORTH, title: 'Snell\'s Law of Refraction Lab Experiment', content: 'Class graphed sin(i) against sin(r) for crown glass blocks. Average refractive index obtained was 1.51.', entry_date: '2026-02-28' },
        { class_id: CLASS_F3_NORTH, title: 'Introduction to Multi-Party Politics in Kenya', content: 'Discussed Section 2A repeal in 1991 and subsequent democratic expansion up to the 2002 elections.', entry_date: '2026-03-01' },
        { class_id: CLASS_F3_NORTH, title: 'Agroforestry Nursery Seedbed Preparation', content: 'Students prepared raised nursery beds for Grevillea robusta and Calliandra seedlings on the school demonstration plot.', entry_date: '2026-03-02' }
    ];
    for (const d of diary) {
        const { error: dErr } = await supabase.from('diary_entries').insert({ ...d, teacher_id: PRIMARY_TEACHER_ID, status: 'approved', is_signed: true, institution_id: INSTITUTION_ID });
        if (dErr) throw dErr;
    }

    console.log('--- 22. Seeding Academic Learning Resources ---');
    await supabase.from('resources').delete().eq('institution_id', INSTITUTION_ID);
    const resources = [
        { subject_id: SUBJ_MATH, teacher_id: PRIMARY_TEACHER_ID, title: 'Form 3 Quadratic Equations Comprehensive Formula Sheet', url: 'https://example.com/resources/math-quadratics.pdf', type: 'pdf', size: '1.4 MB', status: 'approved' },
        { subject_id: SUBJ_ENG, teacher_id: 'TCH-DEMO-003', title: 'Blossoms of the Savannah Chapter-by-Chapter Study Guide', url: 'https://example.com/resources/blossoms-guide.pdf', type: 'pdf', size: '2.8 MB', status: 'approved' },
        { subject_id: SUBJ_KISW, teacher_id: 'TCH-DEMO-005', title: 'Mwongozo Kamili wa Chozi la Heri na Maswali ya Marudio', url: 'https://example.com/resources/chozi-mwongozo.pdf', type: 'pdf', size: '3.1 MB', status: 'approved' },
        { subject_id: SUBJ_BIO, teacher_id: 'TCH-DEMO-004', title: 'Secondary Ecology Field Sampling Lab Manual', url: 'https://example.com/resources/ecology-manual.pdf', type: 'pdf', size: '4.2 MB', status: 'approved' },
        { subject_id: SUBJ_CHEM, teacher_id: 'TCH-DEMO-004', title: 'Volumetric Analysis Calculation Templates & Worked Solutions', url: 'https://example.com/resources/chem-titration.pdf', type: 'pdf', size: '1.8 MB', status: 'approved' },
        { subject_id: SUBJ_PHY, teacher_id: 'TCH-DEMO-006', title: 'Geometrical Optics & Wave Motion Illustrated Slides', url: 'https://example.com/resources/physics-optics.pdf', type: 'pdf', size: '5.5 MB', status: 'approved' },
        { subject_id: SUBJ_HIST, teacher_id: 'TCH-DEMO-007', title: 'Devolution and Governance in Kenya Revision Notes', url: 'https://example.com/resources/history-devolution.pdf', type: 'pdf', size: '2.1 MB', status: 'approved' },
        { subject_id: SUBJ_AGRI, teacher_id: 'TCH-DEMO-008', title: 'Soil Fertility & Organic Composting Practical Manual', url: 'https://example.com/resources/agri-composting.pdf', type: 'pdf', size: '2.9 MB', status: 'approved' }
    ];
    for (const r of resources) {
        const { error: rErr } = await supabase.from('resources').insert({ ...r, institution_id: INSTITUTION_ID });
        if (rErr) throw rErr;
    }

    console.log('--- 23. Seeding Realistic In-App Notifications ---');
    await supabase.from('notifications').delete().eq('institution_id', INSTITUTION_ID);
    const notifications = [
        { user_id: PRIMARY_TEACHER_USER_ID, title: 'New Submission from Kelson Otieno', message: 'Kelson Otieno submitted Quadratic Equations & Roots Assignment.', type: 'info', created_at: '2026-02-13T14:35:00Z' },
        { user_id: PRIMARY_TEACHER_USER_ID, title: 'Parent Message Received', message: 'James Mwangi replied to Kelson\'s Mathematics Progress inquiry.', type: 'info', created_at: '2026-02-28T14:46:00Z' },
        { user_id: PRIMARY_TEACHER_USER_ID, title: 'Report Cards Ready for Verification', message: 'Form 3 North Simba Term 1 preliminary rankings generated.', type: 'success', created_at: '2026-03-01T08:15:00Z' },
        { user_id: PRIMARY_STUDENT_USER_ID, title: 'Assignment Graded: Mathematics', message: 'Your Quadratic Equations assignment was marked: 48/50 (Distinction).', type: 'success', created_at: '2026-02-14T09:00:00Z' },
        { user_id: PRIMARY_STUDENT_USER_ID, title: 'Library Book Reminder', message: 'Blossoms of the Savannah is due in 3 days. Return to avoid fines.', type: 'warning', created_at: '2026-02-21T08:00:00Z' },
        { user_id: PRIMARY_STUDENT_USER_ID, title: 'Bursary Award Confirmed', message: 'Congratulations! Your Equity Wings to Fly scholarship has been approved.', type: 'success', created_at: '2026-01-25T14:05:00Z' },
        { user_id: PRIMARY_PARENT_USER_ID, title: 'Fee Payment Received', message: 'Received KES 48,500 via M-Pesa Ref QKB7492H10 for Kelson Otieno.', type: 'success', created_at: '2026-02-15T11:20:00Z' },
        { user_id: PRIMARY_PARENT_USER_ID, title: 'Term 1 Midterm Report Released', message: 'Kelson\'s Term 1 report card is now available for download.', type: 'info', created_at: '2026-03-01T09:00:00Z' },
        { user_id: PRIMARY_ADMIN_USER_ID, title: 'Bursary Applications Pending', message: '3 new bursary funding applications require bursary committee vetting.', type: 'info', created_at: '2026-02-15T10:00:00Z' },
        { user_id: PRIMARY_ADMIN_USER_ID, title: 'Monthly Revenue Reconciliation', message: 'Fee collection reached 87.5% of projected Term 1 target.', type: 'success', created_at: '2026-03-01T12:00:00Z' }
    ];
    for (const n of notifications) {
        const { error: nErr } = await supabase.from('notifications').insert({ ...n, institution_id: INSTITUTION_ID, is_read: false, data: {} });
        if (nErr) throw nErr;
    }
}

// ── MAIN EXECUTION ────────────────────────────────────────────────────────────
async function run() {
    console.log('===============================================================');
    console.log('🌱 STARTING COMPREHENSIVE CLOUDORA DEMO SEED (PHASE 3)');
    console.log('===============================================================\n');

    try {
        await seedCore();
        await seedWorkflows();
        console.log('\n===============================================================');
        console.log('✅ ALL DEMO MODULES FULLY SEEDED WITH ZERO EMPTY SECTIONS!');
        console.log('===============================================================');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ SEED SCRIPT FAILED:', err);
        process.exit(1);
    }
}

run();
