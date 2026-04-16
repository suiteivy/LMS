const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_PASSWORD = "CloudoraBeta2026!";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const INSTITUTION_NAME = "Beta Partner Academy";
const INSTITUTION_ID = "5c543f07-75d7-4ed5-941f-295ef0274700";

async function seed() {
  console.log('--- Seeding Beta Partner Academy (Extensive) ---');

  try {
    // 1. Ensure Institution exists with correct ID
    console.log('Ensuring Institution...');
    const { data: inst, error: instErr } = await supabase
      .from('institutions')
      .upsert({
        id: INSTITUTION_ID,
        name: INSTITUTION_NAME,
        location: "Tech District, Nairobi",
        phone: "+254 711 000 000",
        email: "contact@beta-academy.test",
        subscription_plan: 'beta',
        subscription_status: 'active',
        addon_messaging: true,
        addon_library: true,
        addon_finance: true,
        addon_attendance: true,
        addon_analytics: true,
        addon_bursary: true,
        addon_diary: true,
        category_id: 'ef0056a3-3e0c-4e31-b6c7-119873196624', // Secondary
        email_domain: 'beta-academy.test'
      })
      .select().single();
    if (instErr) throw instErr;

    // 1.5 Clean existing institutional data (excluding users/auth to save time)
    console.log('Cleaning existing academic/finance records...');
    const purgeTables = [
        'borrowed_books', 'class_enrollments', 'parent_students', 'attendance', 
        'payments', 'financial_transactions', 'classes', 'books'
    ];
    for (const table of purgeTables) {
        await supabase.from(table).delete().eq('institution_id', INSTITUTION_ID);
    }

    // 2. Helper to wait for trigger-based profile creation
    async function waitForRoleRecord(table, userId, maxRetries = 10) {
        for (let i = 0; i < maxRetries; i++) {
            const { data, error } = await supabase.from(table).select('id').eq('user_id', userId).maybeSingle();
            if (data && data.id) return data.id;
            console.log(`Waiting for ${table} record for ${userId} (Attempt ${i+1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        throw new Error(`Timeout waiting for ${table} record for user ${userId}`);
    }

    // 3. Helper for Auth + Profile
    const createFullUser = async (email, fullName, role, metadata = {}) => {
      console.log(`Creating ${role}: ${email}`);
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });
      
      let uid = authUser?.user?.id;
      if (!uid) {
         const { data: existing, error: fetchErr } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
         if (existing) {
           uid = existing.id;
         } else {
           throw authErr || fetchErr;
         }
      }

      await supabase.from('users').upsert({
        id: uid,
        email,
        full_name: fullName,
        first_name: fullName.split(' ')[0],
        last_name: fullName.split(' ').slice(1).join(' '),
        role,
        institution_id: INSTITUTION_ID,
        ...metadata
      });

      const roleTableMap = {
        'admin': 'admins',
        'teacher': 'teachers',
        'student': 'students',
        'parent': 'parents'
      };

      const customId = await waitForRoleRecord(roleTableMap[role], uid);
      return { uid, customId };
    };

    // 4. Create Key Personas
    const admin = await createFullUser('admin@beta-academy.test', 'John Principal', 'admin');
    await supabase.from('admins').update({ is_main: true }).eq('user_id', admin.uid);

    const teachers = [
      await createFullUser('teacher@beta-academy.test', 'Sarah Lead', 'teacher'),
      await createFullUser('teacher2@beta-academy.test', 'Wilson Math', 'teacher'),
      await createFullUser('teacher3@beta-academy.test', 'Emma Science', 'teacher')
    ];

    // 5. Classes & Enrollment
    console.log('Setting up Classes...');
    const levels = [1, 2, 3];
    const classIds = [];
    for (const level of levels) {
      const { data: cls, error: clsErr } = await supabase.from('classes').insert({
        display_name: `Form ${level} Alpha`,
        institution_id: INSTITUTION_ID,
        teacher_id: teachers[level-1].customId,
        form_level: level,
        stream: "Alpha"
      }).select().single();
      if (clsErr) throw clsErr;
      classIds.push(cls.id);
    }

    // 5. Students & Parents (Extensive)
    console.log('Creating Students and Parents...');
    const students = [
      { email: 'student1@beta-academy.test', name: 'Alpha Zulu', classIdx: 0 },
      { email: 'student2@beta-academy.test', name: 'Omega Prime', classIdx: 0 },
      { email: 'stu3@beta-academy.test', name: 'James Bond', classIdx: 1 },
      { email: 'stu4@beta-academy.test', name: 'Peter Parker', classIdx: 1 },
      { email: 'stu5@beta-academy.test', name: 'Bruce Wayne', classIdx: 2 },
      { email: 'stu6@beta-academy.test', name: 'Diana Prince', classIdx: 2 }
    ];

    const studentCustomIds = [];
    for (const s of students) {
        const student = await createFullUser(s.email, s.name, 'student');
        studentCustomIds.push(student.customId);
        await supabase.from('class_enrollments').insert({ 
          student_id: student.customId, 
          class_id: classIds[s.classIdx], 
          institution_id: INSTITUTION_ID 
        });
    }

    // Parents
    for (let i = 0; i < 3; i++) {
        const parent = await createFullUser(`parent${i+1}@beta-academy.test`, `Parent User ${i+1}`, 'parent');
        // Link to matching student
        await supabase.from('parent_students').insert({ 
          parent_id: parent.customId, 
          student_id: studentCustomIds[i], 
          institution_id: INSTITUTION_ID 
        });
    }

    // 6. Attendance (Realistic)
    console.log('Seeding Attendance...');
    const statuses = ['present', 'present', 'present', 'absent', 'late'];
    const today = new Date();
    for (let d = 0; d < 14; d++) {
        const date = new Date();
        date.setDate(today.getDate() - d);
        if (date.getDay() === 0 || date.getDay() === 6) continue; // Skip weekends
        
        for (const sid of studentCustomIds) {
            await supabase.from('attendance').insert({
                student_id: sid,
                institution_id: INSTITUTION_ID,
                date: date.toISOString().split('T')[0],
                status: statuses[Math.floor(Math.random() * statuses.length)],
                recorded_by: (await supabase.from('teachers').select('id').limit(1).single()).data.id
            });
        }
    }

    // 7. Finance (Payments & Proofs)
    console.log('Seeding Finance...');
    for (let i = 0; i < studentCustomIds.length; i++) {
        const sid = studentCustomIds[i];
        // One confirmed payment
        await supabase.from('payments').insert({
            student_id: sid,
            institution_id: INSTITUTION_ID,
            amount: 5000 + (i * 100),
            period_name: "Term 1 2026",
            status: 'confirmed',
            payment_method: 'bank_transfer',
            transaction_ref: `BANK-TX-${sid.slice(0,4)}`,
            date: '2026-02-15'
        });

        // One pending payment for Student 1
        if (i === 0) {
            await supabase.from('payments').insert({
                student_id: sid,
                institution_id: INSTITUTION_ID,
                amount: 7500,
                period_name: "Term 1 2026",
                status: 'pending',
                is_evidence_confirmed: false,
                payment_method: 'mpesa',
                transaction_ref: 'MPESA-XYZ-999',
                proof_url: 'https://placeholder.com/receipt.jpg',
                admin_notes: 'Please verify the transaction ID in M-Pesa portal.',
                date: new Date().toISOString().split('T')[0]
            });
        }
    }

    // 8. Library (Books & Borrowing)
    console.log('Seeding Library...');
    const books = [
        { title: 'Advanced Mathematics', isbn: '978-01', author: 'Dr. Calculus' },
        { title: 'Biology for Form 1', isbn: '978-02', author: 'Gene Editor' },
        { title: 'The Great Gatsby', isbn: '978-03', author: 'F. Scott' },
        { title: 'Physics Principles', isbn: '978-04', author: 'Isaac N.' }
    ];
    for (const b of books) {
        const { data: book, error: bookErr } = await supabase.from('books').insert({
            ...b,
            institution_id: INSTITUTION_ID,
            available_quantity: 5,
            total_quantity: 10
        }).select().single();

        if (bookErr) {
            console.error(`Error seeding book ${b.title}:`, bookErr);
            continue;
        }

        // One active borrow for each book
        for (let i = 0; i < 2; i++) {
            await supabase.from('borrowed_books').insert({
                book_id: book.id,
                student_id: studentCustomIds[i],
                institution_id: INSTITUTION_ID,
                borrowed_at: new Date(Date.now() - (86400000 * 3)).toISOString(),
                due_date: new Date(Date.now() + (86400000 * 7)).toISOString(),
                status: 'borrowed'
            });
        }
    }

    console.log('--- Seeding Completed Successfully ---');
  } catch (err) {
    console.error('SEEDING FAILED:', err);
  }
}

seed();
