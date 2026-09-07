const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const UNIVERSAL_PASSWORD = process.env.BETA_TEST_PASSWORD || 'CloudoraBeta2026!';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const INSTITUTION_ID = '5c543f07-75d7-4ed5-941f-295ef0274700';

function formatIsoDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function seedBetaShowcaseData() {
  console.log('================================================================');
  console.log('🚀 SEEDING COMPREHENSIVE SHOWCASE DATA FOR BETA PARTNER ACADEMY');
  console.log(`🏢 Institution ID: ${INSTITUTION_ID}`);
  console.log('================================================================\n');

  try {
    // ----------------------------------------------------------------
    // 1. VERIFY & CONFIGURE INSTITUTION
    // ----------------------------------------------------------------
    console.log('📦 1. Verifying Institution Configuration...');
    const { data: inst, error: instErr } = await supabase
      .from('institutions')
      .update({
        name: 'Beta Partner Academy',
        location: 'Tech District, Nairobi',
        phone: '+254 711 000 000',
        email: 'contact@beta-academy.test',
        subscription_plan: 'beta',
        subscription_status: 'active',
        addon_library: true,
        addon_messaging: true,
        addon_bursary: true,
        addon_diary: true,
        email_domain: 'beta-academy.test',
        custom_student_limit: 100
      })
      .eq('id', INSTITUTION_ID)
      .select()
      .single();

    if (instErr) throw instErr;
    console.log(`   ✅ Institution verified with all addons enabled: ${inst.name}\n`);

    // ----------------------------------------------------------------
    // 2. ACADEMIC YEARS & TERMS
    // ----------------------------------------------------------------
    console.log('📅 2. Setting Up Academic Years and Terms...');
    await supabase.from('academic_years').update({ is_current: false }).eq('institution_id', INSTITUTION_ID);
    await supabase.from('terms').update({ is_current: false }).eq('institution_id', INSTITUTION_ID);

    const { data: existingYear } = await supabase
      .from('academic_years')
      .select('id')
      .eq('institution_id', INSTITUTION_ID)
      .eq('name', '2026-2027')
      .maybeSingle();

    let currentYearId;
    if (existingYear) {
      currentYearId = existingYear.id;
      await supabase.from('academic_years').update({
        start_date: '2026-08-25',
        end_date: '2027-06-30',
        is_current: true
      }).eq('id', currentYearId);
    } else {
      const { data: newYear, error: yearErr } = await supabase.from('academic_years').insert({
        institution_id: INSTITUTION_ID,
        name: '2026-2027',
        start_date: '2026-08-25',
        end_date: '2027-06-30',
        is_current: true
      }).select().single();
      if (yearErr) throw yearErr;
      currentYearId = newYear.id;
    }

    const termsData = [
      { name: 'Term 1', start_date: '2026-08-25', end_date: '2026-12-18', is_current: true },
      { name: 'Term 2', start_date: '2027-01-05', end_date: '2027-04-09', is_current: false },
      { name: 'Term 3', start_date: '2027-04-26', end_date: '2027-07-23', is_current: false }
    ];

    let currentTermId;
    const termMap = {};
    for (const t of termsData) {
      const { data: existingTerm } = await supabase
        .from('terms')
        .select('id')
        .eq('institution_id', INSTITUTION_ID)
        .eq('academic_year_id', currentYearId)
        .eq('name', t.name)
        .maybeSingle();

      if (existingTerm) {
        termMap[t.name] = existingTerm.id;
        await supabase.from('terms').update({
          start_date: t.start_date,
          end_date: t.end_date,
          is_current: t.is_current
        }).eq('id', existingTerm.id);
      } else {
        const { data: newTerm, error: termErr } = await supabase.from('terms').insert({
          institution_id: INSTITUTION_ID,
          academic_year_id: currentYearId,
          name: t.name,
          start_date: t.start_date,
          end_date: t.end_date,
          is_current: t.is_current
        }).select().single();
        if (termErr) throw termErr;
        termMap[t.name] = newTerm.id;
      }
      if (t.is_current) currentTermId = termMap[t.name];
    }
    console.log(`   ✅ Current Academic Year: 2026-2027 (${currentYearId})`);
    console.log(`   ✅ Current Active Term: Term 1 (${currentTermId})\n`);

    // ----------------------------------------------------------------
    // 3. RETRIEVE & ENHANCE EXISTING PERSONAS
    // ----------------------------------------------------------------
    console.log('👥 3. Enhancing Existing Users & Profiles...');
    const { data: users, error: usersErr } = await supabase
      .from('users')
      .select('*')
      .eq('institution_id', INSTITUTION_ID);
    if (usersErr) throw usersErr;

    for (const u of users) {
      const isStudent = u.role === 'student';
      await supabase.from('users').update({
        status: 'approved',
        must_change_password: false,
        requires_security_questions_setup: false,
        phone: u.phone || (isStudent ? '+254 722 100 ' + Math.floor(100 + Math.random() * 900) : '+254 720 555 ' + Math.floor(100 + Math.random() * 900)),
        address: u.address || 'Tech District, Nairobi, Kenya',
        gender: u.gender || (u.full_name.includes('Sarah') || u.full_name.includes('Emma') || u.full_name.includes('Diana') ? 'female' : 'male'),
        date_of_birth: u.date_of_birth || (isStudent ? '2010-05-14' : '1985-08-20')
      }).eq('id', u.id);

      try {
        await supabase.auth.admin.updateUserById(u.id, { password: UNIVERSAL_PASSWORD });
      } catch (authE) {}
    }

    const { data: adminRecord } = await supabase.from('admins').select('id, user_id').eq('institution_id', INSTITUTION_ID).limit(1).single();
    const { data: teacherRecords } = await supabase.from('teachers').select('id, user_id, users(email, full_name)').eq('institution_id', INSTITUTION_ID);
    const teacherSarah = teacherRecords.find(t => t.users?.email === 'teacher@beta-academy.test');
    const teacherWilson = teacherRecords.find(t => t.users?.email === 'teacher2@beta-academy.test');
    const teacherEmma = teacherRecords.find(t => t.users?.email === 'teacher3@beta-academy.test');

    console.log(`   ✅ Confirmed and secured ${users.length} existing user profiles.`);
    console.log(`   🧑‍🏫 Teacher Sarah Lead: ${teacherSarah?.id}`);
    console.log(`   🧑‍🏫 Teacher Wilson Math: ${teacherWilson?.id}`);
    console.log(`   🧑‍🏫 Teacher Emma Science: ${teacherEmma?.id}\n`);

    // ----------------------------------------------------------------
    // 4. CLASSES & TEACHER ASSIGNMENTS
    // ----------------------------------------------------------------
    console.log('🏫 4. Configuring Classes and Class Teachers...');
    const classConfigs = [
      { name: 'Form 1 Alpha', level: 1, stream: 'Alpha', teacherId: teacherSarah?.id },
      { name: 'Form 2 Alpha', level: 2, stream: 'Alpha', teacherId: teacherWilson?.id },
      { name: 'Form 3 Alpha', level: 3, stream: 'Alpha', teacherId: teacherEmma?.id },
      { name: 'Form 4 Alpha', level: 4, stream: 'Alpha', teacherId: teacherSarah?.id }
    ];

    const classMap = {};
    for (const c of classConfigs) {
      const { data: existingClass } = await supabase
        .from('classes')
        .select('id')
        .eq('institution_id', INSTITUTION_ID)
        .eq('display_name', c.name)
        .maybeSingle();

      if (existingClass) {
        classMap[c.name] = existingClass.id;
        await supabase.from('classes').update({
          form_level: c.level,
          stream: c.stream,
          teacher_id: c.teacherId,
          is_active: true
        }).eq('id', existingClass.id);
      } else {
        const { data: newClass, error: clsErr } = await supabase.from('classes').insert({
          institution_id: INSTITUTION_ID,
          display_name: c.name,
          form_level: c.level,
          stream: c.stream,
          teacher_id: c.teacherId
        }).select().single();
        if (clsErr) throw clsErr;
        classMap[c.name] = newClass.id;
      }
      console.log(`   ✅ ${c.name} (Form ${c.level}) -> Teacher: ${c.teacherId}`);
    }
    console.log('');

    // ----------------------------------------------------------------
    // 5. STUDENTS LINKAGE & ROSTERS
    // ----------------------------------------------------------------
    console.log('🎓 5. Aligning Student Enrollments and Details...');
    const { data: studentsList } = await supabase
      .from('students')
      .select('id, user_id, users(email, full_name)')
      .eq('institution_id', INSTITUTION_ID);

    const studentClassAssignments = {
      'student1@beta-academy.test': { class: 'Form 1 Alpha', level: 1, feeBal: 0 },
      'student2@beta-academy.test': { class: 'Form 1 Alpha', level: 1, feeBal: 5000 },
      'student.betatest@beta-academy.test': { class: 'Form 1 Alpha', level: 1, feeBal: 0 },
      'stu3@beta-academy.test': { class: 'Form 2 Alpha', level: 2, feeBal: 12000 },
      'stu4@beta-academy.test': { class: 'Form 2 Alpha', level: 2, feeBal: 0 },
      'stu5@beta-academy.test': { class: 'Form 3 Alpha', level: 3, feeBal: 8500 },
      'stu6@beta-academy.test': { class: 'Form 3 Alpha', level: 3, feeBal: 0 }
    };

    const studentIdsByEmail = {};
    for (const s of studentsList) {
      const email = s.users?.email;
      studentIdsByEmail[email] = s.id;
      const assignment = studentClassAssignments[email] || { class: 'Form 1 Alpha', level: 1, feeBal: 0 };
      const classId = classMap[assignment.class];

      await supabase.from('students').update({
        class_id: classId,
        form_level: assignment.level,
        academic_year: '2026-2027',
        admission_date: '2026-01-10',
        fee_balance: assignment.feeBal,
        parent_contact: '+254 711 ' + Math.floor(100000 + Math.random() * 900000),
        emergency_contact_name: 'Guardian ' + (s.users?.full_name?.split(' ')[1] || 'Parent'),
        emergency_contact_phone: '+254 733 ' + Math.floor(100000 + Math.random() * 900000)
      }).eq('id', s.id);

      if (classId) {
        const { data: existingEnrollment } = await supabase
          .from('class_enrollments')
          .select('id')
          .eq('student_id', s.id)
          .maybeSingle();

        if (existingEnrollment) {
          await supabase.from('class_enrollments').update({
            class_id: classId,
            institution_id: INSTITUTION_ID
          }).eq('id', existingEnrollment.id);
        } else {
          await supabase.from('class_enrollments').insert({
            student_id: s.id,
            class_id: classId,
            institution_id: INSTITUTION_ID,
            enrolled_at: '2026-01-10T08:00:00Z'
          });
        }
      }
      console.log(`   ✅ Enrolled ${s.users?.full_name} (${email}) in ${assignment.class}`);
    }
    console.log('');

    // ----------------------------------------------------------------
    // 6. PARENT LINKAGES (parent_students)
    // ----------------------------------------------------------------
    console.log('👨‍👩‍👧 6. Linking Parents to Students...');
    const { data: parentRecords } = await supabase
      .from('parents')
      .select('id, user_id, users(email)')
      .eq('institution_id', INSTITUTION_ID);

    const parentMap = {};
    parentRecords.forEach(p => { parentMap[p.users?.email] = p.id; });

    const parentLinks = [
      { parentEmail: 'parent1@beta-academy.test', studentEmail: 'student1@beta-academy.test', rel: 'Mother' },
      { parentEmail: 'parent2@beta-academy.test', studentEmail: 'student2@beta-academy.test', rel: 'Father' },
      { parentEmail: 'parent3@beta-academy.test', studentEmail: 'stu3@beta-academy.test', rel: 'Father' },
      { parentEmail: 'parent@beta-academy.test', studentEmail: 'stu4@beta-academy.test', rel: 'Guardian' },
      { parentEmail: 'parent.st1@gmail.com', studentEmail: 'stu5@beta-academy.test', rel: 'Father' }
    ];

    for (const link of parentLinks) {
      const pId = parentMap[link.parentEmail];
      const sId = studentIdsByEmail[link.studentEmail];
      if (pId && sId) {
        const { data: existingPs } = await supabase
          .from('parent_students')
          .select('id')
          .eq('parent_id', pId)
          .eq('student_id', sId)
          .maybeSingle();

        if (!existingPs) {
          await supabase.from('parent_students').insert({
            parent_id: pId,
            student_id: sId,
            relationship: link.rel,
            institution_id: INSTITUTION_ID
          });
        }
      }
    }
    console.log(`   ✅ Linked parents to respective students.\n`);

    // ----------------------------------------------------------------
    // 7. SUBJECTS & SUBJECT TEACHERS
    // ----------------------------------------------------------------
    console.log('📚 7. Seeding Curriculum Subjects & Subject Teachers...');
    const subjectsToSeed = [
      { title: 'Mathematics', class: 'Form 1 Alpha', teacherId: teacherWilson?.id, fee: 2000 },
      { title: 'English Language', class: 'Form 1 Alpha', teacherId: teacherSarah?.id, fee: 1500 },
      { title: 'Physics', class: 'Form 1 Alpha', teacherId: teacherEmma?.id, fee: 2000 },
      { title: 'Chemistry', class: 'Form 1 Alpha', teacherId: teacherEmma?.id, fee: 2000 },
      { title: 'Biology', class: 'Form 1 Alpha', teacherId: teacherEmma?.id, fee: 1800 },
      { title: 'History & Government', class: 'Form 1 Alpha', teacherId: teacherSarah?.id, fee: 1000 },
      { title: 'Computer Studies', class: 'Form 1 Alpha', teacherId: teacherSarah?.id, fee: 2500 },

      { title: 'Mathematics', class: 'Form 2 Alpha', teacherId: teacherWilson?.id, fee: 2200 },
      { title: 'English Language', class: 'Form 2 Alpha', teacherId: teacherSarah?.id, fee: 1600 },
      { title: 'Biology', class: 'Form 2 Alpha', teacherId: teacherEmma?.id, fee: 2000 },
      { title: 'Physics', class: 'Form 2 Alpha', teacherId: teacherEmma?.id, fee: 2200 },
      { title: 'Chemistry', class: 'Form 2 Alpha', teacherId: teacherEmma?.id, fee: 2200 },
      { title: 'Business Studies', class: 'Form 2 Alpha', teacherId: teacherWilson?.id, fee: 1800 },

      { title: 'Advanced Mathematics', class: 'Form 3 Alpha', teacherId: teacherWilson?.id, fee: 2500 },
      { title: 'English Literature', class: 'Form 3 Alpha', teacherId: teacherSarah?.id, fee: 2000 },
      { title: 'Physics', class: 'Form 3 Alpha', teacherId: teacherEmma?.id, fee: 2500 },
      { title: 'Chemistry', class: 'Form 3 Alpha', teacherId: teacherEmma?.id, fee: 2500 },
      { title: 'Biology', class: 'Form 3 Alpha', teacherId: teacherEmma?.id, fee: 2200 },
      { title: 'Computer Science', class: 'Form 3 Alpha', teacherId: teacherEmma?.id, fee: 3000 }
    ];

    const subjectMap = {};
    for (const s of subjectsToSeed) {
      const classId = classMap[s.class];
      if (!classId) continue;

      const { data: existingSub } = await supabase
        .from('subjects')
        .select('id')
        .eq('institution_id', INSTITUTION_ID)
        .eq('class_id', classId)
        .eq('title', s.title)
        .maybeSingle();

      let subId;
      if (existingSub) {
        subId = existingSub.id;
        await supabase.from('subjects').update({
          teacher_id: s.teacherId,
          fee_amount: s.fee
        }).eq('id', subId);
      } else {
        const { data: newSub, error: sErr } = await supabase.from('subjects').insert({
          title: s.title,
          class_id: classId,
          teacher_id: s.teacherId,
          institution_id: INSTITUTION_ID,
          fee_amount: s.fee
        }).select().single();
        if (sErr) throw sErr;
        subId = newSub.id;
      }
      subjectMap[`${s.class}_${s.title}`] = subId;

      if (s.teacherId) {
        const { data: existingSt } = await supabase
          .from('subject_teachers')
          .select('id')
          .eq('subject_id', subId)
          .eq('teacher_id', s.teacherId)
          .maybeSingle();

        if (!existingSt) {
          await supabase.from('subject_teachers').insert({
            subject_id: subId,
            teacher_id: s.teacherId,
            institution_id: INSTITUTION_ID
          });
        }
      }
    }
    console.log(`   ✅ Seeded ${subjectsToSeed.length} curriculum subjects.\n`);

    // ----------------------------------------------------------------
    // 8. ATTENDANCE (30 DAYS INCLUDING TODAY)
    // ----------------------------------------------------------------
    console.log('📊 8. Seeding 30-Day Attendance Logs (Students & Teachers)...');
    const today = new Date();
    const statuses = ['present', 'present', 'present', 'present', 'present', 'present', 'late', 'absent'];

    await supabase.from('attendance').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('teacher_attendance').delete().eq('institution_id', INSTITUTION_ID);

    const attendanceRecords = [];
    const teacherAttendanceRecords = [];
    const allTeachers = [teacherSarah?.id, teacherWilson?.id, teacherEmma?.id].filter(Boolean);

    // Get primary subject per class
    const primarySubjectByClass = {
      [classMap['Form 1 Alpha']]: subjectMap['Form 1 Alpha_Mathematics'],
      [classMap['Form 2 Alpha']]: subjectMap['Form 2 Alpha_Mathematics'],
      [classMap['Form 3 Alpha']]: subjectMap['Form 3 Alpha_Advanced Mathematics'],
      [classMap['Form 4 Alpha']]: subjectMap['Form 1 Alpha_Mathematics']
    };

    for (let dayOffset = 0; dayOffset <= 30; dayOffset++) {
      const d = new Date();
      d.setDate(today.getDate() - dayOffset);
      if (d.getDay() === 0 || d.getDay() === 6) continue;

      const dateStr = formatIsoDate(d);

      for (const st of studentsList) {
        const isToday = dayOffset === 0;
        const status = isToday
          ? (Math.random() < 0.85 ? 'present' : (Math.random() < 0.7 ? 'late' : 'absent'))
          : statuses[Math.floor(Math.random() * statuses.length)];

        const cId = st.class_id || classMap['Form 1 Alpha'];
        const sId = primarySubjectByClass[cId] || subjectMap['Form 1 Alpha_Mathematics'];

        attendanceRecords.push({
          student_id: st.id,
          institution_id: INSTITUTION_ID,
          class_id: cId,
          subject_id: sId,
          date: dateStr,
          status,
          notes: status === 'late' ? 'Traffic delay' : status === 'absent' ? 'Reported flu' : 'On time',
          recorded_at: new Date().toISOString()
        });
      }

      for (const tid of allTeachers) {
        teacherAttendanceRecords.push({
          teacher_id: tid,
          institution_id: INSTITUTION_ID,
          date: dateStr,
          status: 'present',
          check_in_time: `${dateStr}T07:45:00Z`,
          check_out_time: `${dateStr}T16:30:00Z`,
          notes: 'Standard shift'
        });
      }
    }

    for (let i = 0; i < attendanceRecords.length; i += 50) {
      const { error: attErr } = await supabase.from('attendance').insert(attendanceRecords.slice(i, i + 50));
      if (attErr) console.error('Attendance batch insert error:', attErr.message);
    }
    for (let i = 0; i < teacherAttendanceRecords.length; i += 50) {
      const { error: tAttErr } = await supabase.from('teacher_attendance').insert(teacherAttendanceRecords.slice(i, i + 50));
      if (tAttErr) console.error('Teacher attendance batch error:', tAttErr.message);
    }
    console.log(`   ✅ Seeded ${attendanceRecords.length} student attendance logs across 30 school days.`);
    console.log(`   ✅ Seeded ${teacherAttendanceRecords.length} teacher daily attendance logs.`);
    console.log(`   ✅ Confirmed today (${formatIsoDate(today)}) attendance is fully logged.\n`);

    // ----------------------------------------------------------------
    // 9. TIMETABLES (WEEKLY SCHEDULE)
    // ----------------------------------------------------------------
    console.log('⏰ 9. Seeding Comprehensive Weekly Timetables...');
    await supabase.from('timetables').delete().eq('institution_id', INSTITUTION_ID);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periods = [
      { start: '08:00', end: '08:45' },
      { start: '08:50', end: '09:35' },
      { start: '09:55', end: '10:40' },
      { start: '10:45', end: '11:30' },
      { start: '11:50', end: '12:35' },
      { start: '14:00', end: '14:45' }
    ];

    const timetableEntries = [];
    const f1Subs = [
      subjectMap['Form 1 Alpha_Mathematics'],
      subjectMap['Form 1 Alpha_English Language'],
      subjectMap['Form 1 Alpha_Physics'],
      subjectMap['Form 1 Alpha_Chemistry'],
      subjectMap['Form 1 Alpha_Biology'],
      subjectMap['Form 1 Alpha_Computer Studies']
    ].filter(Boolean);

    const f2Subs = [
      subjectMap['Form 2 Alpha_Mathematics'],
      subjectMap['Form 2 Alpha_English Language'],
      subjectMap['Form 2 Alpha_Physics'],
      subjectMap['Form 2 Alpha_Chemistry'],
      subjectMap['Form 2 Alpha_Biology'],
      subjectMap['Form 2 Alpha_Business Studies']
    ].filter(Boolean);

    const f3Subs = [
      subjectMap['Form 3 Alpha_Advanced Mathematics'],
      subjectMap['Form 3 Alpha_English Literature'],
      subjectMap['Form 3 Alpha_Physics'],
      subjectMap['Form 3 Alpha_Chemistry'],
      subjectMap['Form 3 Alpha_Biology'],
      subjectMap['Form 3 Alpha_Computer Science']
    ].filter(Boolean);

    for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
      const day = days[dayIdx];
      for (let pIdx = 0; pIdx < periods.length; pIdx++) {
        const p = periods[pIdx];

        if (f1Subs.length > 0) {
          timetableEntries.push({
            institution_id: INSTITUTION_ID,
            class_id: classMap['Form 1 Alpha'],
            subject_id: f1Subs[(dayIdx + pIdx) % f1Subs.length],
            day_of_week: day,
            start_time: p.start,
            end_time: p.end,
            room_number: pIdx === 2 ? 'Science Lab 1' : 'Room 101'
          });
        }

        if (f2Subs.length > 0) {
          timetableEntries.push({
            institution_id: INSTITUTION_ID,
            class_id: classMap['Form 2 Alpha'],
            subject_id: f2Subs[(dayIdx + pIdx + 1) % f2Subs.length],
            day_of_week: day,
            start_time: p.start,
            end_time: p.end,
            room_number: pIdx === 2 ? 'Science Lab 2' : 'Room 201'
          });
        }

        if (f3Subs.length > 0) {
          timetableEntries.push({
            institution_id: INSTITUTION_ID,
            class_id: classMap['Form 3 Alpha'],
            subject_id: f3Subs[(dayIdx + pIdx + 2) % f3Subs.length],
            day_of_week: day,
            start_time: p.start,
            end_time: p.end,
            room_number: pIdx === 4 ? 'Computer Lab A' : 'Room 301'
          });
        }
      }
    }

    const { error: ttErr } = await supabase.from('timetables').insert(timetableEntries);
    if (ttErr) console.error('Timetable insert error:', ttErr.message);
    else console.log(`   ✅ Seeded ${timetableEntries.length} timetable periods.\n`);

    // ----------------------------------------------------------------
    // 10. ASSIGNMENTS, SUBMISSIONS, GRADES & GRADE ENTRIES
    // ----------------------------------------------------------------
    console.log('📝 10. Seeding Assignments, Submissions and Grades...');
    await supabase.from('submissions').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('assignments').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('grades').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('grade_entries').delete().eq('institution_id', INSTITUTION_ID);

    const { data: assessmentTypes } = await supabase.from('assessment_types').select('id, code, name').eq('institution_id', INSTITUTION_ID);
    const asgType = assessmentTypes?.find(at => at.code === 'ASG') || assessmentTypes?.[0];

    const assignmentsData = [
      {
        title: 'Algebraic Linear Equations - Problem Set 1',
        desc: 'Solve questions 1 through 20 on page 48. Show all algebraic working.',
        subjectId: subjectMap['Form 1 Alpha_Mathematics'],
        classId: classMap['Form 1 Alpha'],
        teacherId: teacherWilson?.id,
        teacherUserId: teacherWilson?.user_id,
        totalPoints: 100,
        dueDaysAgo: 4
      },
      {
        title: 'Measurement of Density & Pressure Lab Report',
        desc: 'Formal report on density measurements of irregular solids.',
        subjectId: subjectMap['Form 1 Alpha_Physics'],
        classId: classMap['Form 1 Alpha'],
        teacherId: teacherEmma?.id,
        teacherUserId: teacherEmma?.user_id,
        totalPoints: 50,
        dueDaysAgo: 2
      },
      {
        title: 'Comparative Analysis of Digestive Systems',
        desc: 'Compare human digestive tract with ruminants.',
        subjectId: subjectMap['Form 2 Alpha_Biology'],
        classId: classMap['Form 2 Alpha'],
        teacherId: teacherEmma?.id,
        teacherUserId: teacherEmma?.user_id,
        totalPoints: 50,
        dueDaysAgo: 1
      },
      {
        title: 'Stoichiometry & The Mole Concept',
        desc: 'Calculate empirical formulas and molar concentrations.',
        subjectId: subjectMap['Form 3 Alpha_Chemistry'],
        classId: classMap['Form 3 Alpha'],
        teacherId: teacherEmma?.id,
        teacherUserId: teacherEmma?.user_id,
        totalPoints: 100,
        dueDaysAgo: 3
      }
    ];

    for (const a of assignmentsData) {
      if (!a.subjectId) continue;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - a.dueDaysAgo);

      const { data: newAssign, error: aErr } = await supabase.from('assignments').insert({
        institution_id: INSTITUTION_ID,
        title: a.title,
        description: a.desc,
        subject_id: a.subjectId,
        class_id: a.classId,
        teacher_id: a.teacherId,
        total_points: a.totalPoints,
        due_date: formatIsoDate(dueDate),
        status: 'published',
        is_published: true,
        term: 'Term 1'
      }).select().single();

      if (aErr) {
        console.error('Assignment error:', aErr.message);
        continue;
      }

      const { data: enrolledStudents } = await supabase
        .from('students')
        .select('id, user_id')
        .eq('class_id', a.classId);

      for (const st of (enrolledStudents || [])) {
        const isGraded = Math.random() < 0.75;
        const score = isGraded ? Math.floor(a.totalPoints * (0.72 + Math.random() * 0.25)) : null;

        await supabase.from('submissions').insert({
          institution_id: INSTITUTION_ID,
          assignment_id: newAssign.id,
          student_id: st.id,
          class_id: a.classId,
          subject_id: a.subjectId,
          status: isGraded ? 'graded' : 'pending',
          graded: isGraded,
          grade: score,
          feedback: isGraded ? 'Great analytical approach and clear steps.' : null,
          content: 'Here is my submission with all worked solutions attached.',
          submitted_at: new Date(dueDate.getTime() - 86400000).toISOString()
        });

        if (isGraded && a.teacherUserId) {
          await supabase.from('grades').insert({
            institution_id: INSTITUTION_ID,
            student_id: st.user_id,
            subject_id: a.subjectId,
            total_grade: score,
            feedback: 'Consistent demonstration of topic mastery.',
            graded_by: a.teacherUserId
          });

          if (asgType) {
            await supabase.from('grade_entries').insert({
              institution_id: INSTITUTION_ID,
              student_id: st.id,
              subject_id: a.subjectId,
              class_id: a.classId,
              term_id: currentTermId,
              assessment_type_id: asgType.id,
              score,
              max_score: a.totalPoints,
              percentage: Math.round((score / a.totalPoints) * 100),
              status: 'final',
              graded_by: a.teacherId,
              source: 'assignment',
              source_id: newAssign.id
            });
          }
        }
      }
    }
    console.log(`   ✅ Seeded assignments, submissions, grades and final grade entries.\n`);

    // ----------------------------------------------------------------
    // 11. EXAMS, EXAM RESULTS & REPORT CARDS
    // ----------------------------------------------------------------
    console.log('🏆 11. Seeding Exams, Exam Results and Official Report Cards...');
    await supabase.from('report_card_items').delete();
    await supabase.from('report_cards').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('exam_results').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('exams').delete().eq('institution_id', INSTITUTION_ID);

    const examsData = [
      {
        title: 'Term 1 Mid-Term Examination 2026 - Mathematics',
        desc: 'Evaluates core mathematical concepts.',
        subjectId: subjectMap['Form 1 Alpha_Mathematics'],
        classId: classMap['Form 1 Alpha'],
        teacherId: teacherWilson?.id,
        maxScore: 100,
        weight: 30
      },
      {
        title: 'Term 1 Mid-Term Examination 2026 - Physics',
        desc: 'Covers kinematics, dynamics and pressure.',
        subjectId: subjectMap['Form 1 Alpha_Physics'],
        classId: classMap['Form 1 Alpha'],
        teacherId: teacherEmma?.id,
        maxScore: 100,
        weight: 30
      },
      {
        title: 'Term 1 Mid-Term Examination 2026 - Biology',
        desc: 'Cell structures and physiology.',
        subjectId: subjectMap['Form 2 Alpha_Biology'],
        classId: classMap['Form 2 Alpha'],
        teacherId: teacherEmma?.id,
        maxScore: 100,
        weight: 30
      },
      {
        title: 'Term 1 Mid-Term Examination 2026 - Chemistry',
        desc: 'Periodic trends and mole concepts.',
        subjectId: subjectMap['Form 3 Alpha_Chemistry'],
        classId: classMap['Form 3 Alpha'],
        teacherId: teacherEmma?.id,
        maxScore: 100,
        weight: 30
      }
    ];

    for (const ex of examsData) {
      if (!ex.subjectId) continue;
      const { data: newExam, error: exErr } = await supabase.from('exams').insert({
        institution_id: INSTITUTION_ID,
        title: ex.title,
        description: ex.desc,
        subject_id: ex.subjectId,
        class_id: ex.classId,
        teacher_id: ex.teacherId,
        max_score: ex.maxScore,
        weight: ex.weight,
        term: 'Term 1',
        is_published: true,
        date: '2026-09-01'
      }).select().single();

      if (exErr) {
        console.error('Exam creation error:', exErr.message);
        continue;
      }

      const { data: studentsInClass } = await supabase.from('students').select('id').eq('class_id', ex.classId);
      for (const st of (studentsInClass || [])) {
        const score = Math.floor(75 + Math.random() * 21);
        await supabase.from('exam_results').insert({
          institution_id: INSTITUTION_ID,
          exam_id: newExam.id,
          student_id: st.id,
          score,
          feedback: 'Solid performance demonstrating comprehensive preparation.',
          graded_by: ex.teacherId
        });
      }
    }

    for (const st of studentsList) {
      const gpa = Number((3.4 + Math.random() * 0.5).toFixed(2));
      const avgPct = Math.floor(78 + Math.random() * 18);
      const letterGrade = avgPct >= 85 ? 'A' : avgPct >= 80 ? 'A-' : 'B+';

      const { data: rc, error: rcErr } = await supabase.from('report_cards').insert({
        institution_id: INSTITUTION_ID,
        student_id: st.id,
        class_id: st.class_id || classMap['Form 1 Alpha'],
        academic_year_id: currentYearId,
        term_id: currentTermId,
        total_weighted_score: avgPct,
        average_percentage: avgPct,
        gpa,
        letter_grade: letterGrade,
        rank_in_class: Math.floor(1 + Math.random() * 3),
        total_students_in_class: 4,
        attendance_count: 29,
        total_school_days: 30,
        teacher_remarks: 'An exemplary student who participates actively and completes assignments with diligence.',
        admin_remarks: 'Outstanding effort this term. Recommended for academic honors.',
        status: 'released',
        released_at: new Date().toISOString()
      }).select().single();

      if (rc && !rcErr) {
        const subjectsForReport = [
          { name: 'Mathematics', score: avgPct + 1 },
          { name: 'English Language', score: avgPct - 1 },
          { name: 'Physics', score: avgPct + 3 },
          { name: 'Biology', score: avgPct }
        ];

        for (const subItem of subjectsForReport) {
          await supabase.from('report_card_items').insert({
            report_card_id: rc.id,
            subject_name: subItem.name,
            total_score: subItem.score,
            average_percentage: subItem.score,
            letter_grade: subItem.score >= 80 ? 'A' : 'B+',
            gpa_points: 4.0,
            class_average: 79.0,
            rank_in_subject: 1,
            teacher_remarks: 'Consistently high standard of academic engagement.'
          });
        }
      }
    }
    console.log(`   ✅ Seeded exams, student results, and official multi-subject report cards.\n`);

    // ----------------------------------------------------------------
    // 12. FINANCE: FEE STRUCTURES, PAYMENTS & REVENUE LEDGER
    // ----------------------------------------------------------------
    console.log('💰 12. Seeding Finance Structures, Payments and Revenue Ledger...');
    await supabase.from('fee_structures').delete().eq('institution_id', INSTITUTION_ID);

    const feeStructuresData = [
      { title: 'Form 1 Tuition Fee - Term 1 2026', amount: 35000, level_value: 1, scope: 'form' },
      { title: 'Form 2 Tuition Fee - Term 1 2026', amount: 38000, level_value: 2, scope: 'form' },
      { title: 'Form 3 Tuition Fee - Term 1 2026', amount: 42000, level_value: 3, scope: 'form' },
      { title: 'Science Laboratory & Practical Fee', amount: 5000, level_value: null, scope: 'all' },
      { title: 'Library & Digital Resource Fee', amount: 2500, level_value: null, scope: 'all' },
      { title: 'Activity & Sports Levy', amount: 3000, level_value: null, scope: 'all' }
    ];

    const feeStructureIds = [];
    for (const fs of feeStructuresData) {
      const { data: newFs, error: fsErr } = await supabase.from('fee_structures').insert({
        institution_id: INSTITUTION_ID,
        title: fs.title,
        amount: fs.amount,
        academic_year: '2026-2027',
        academic_year_id: currentYearId,
        term: 'Term 1',
        term_id: currentTermId,
        is_active: true,
        released_at: new Date().toISOString(),
        level_scope: fs.scope,
        level_value: fs.level_value
      }).select().single();
      if (fsErr) console.error('Fee structure error:', fsErr.message);
      else if (newFs) feeStructureIds.push(newFs.id);
    }

    await supabase.from('payments').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('financial_transactions').delete().eq('institution_id', INSTITUTION_ID);

    const paymentRecords = [];
    const transactionRecords = [];

    // Confirmed fee payments across the last 7 days (to power Revenue Overview graph)
    const recentDaysAmounts = [
      { dayOffset: 0, amount: 25000, ref: 'TX-MOBILE-TODAY1', method: 'mobile_money' },
      { dayOffset: 0, amount: 15000, ref: 'TX-BANK-TODAY2', method: 'bank_transfer' },
      { dayOffset: 1, amount: 38000, ref: 'TX-BANK-YEST1', method: 'bank_transfer' },
      { dayOffset: 2, amount: 42000, ref: 'TX-MOBILE-DAY2', method: 'mobile_money' },
      { dayOffset: 3, amount: 35000, ref: 'TX-BANK-DAY3', method: 'bank_transfer' },
      { dayOffset: 4, amount: 20000, ref: 'TX-MOBILE-DAY4', method: 'mobile_money' },
      { dayOffset: 5, amount: 45000, ref: 'TX-BANK-DAY5', method: 'bank_transfer' },
      { dayOffset: 6, amount: 30000, ref: 'TX-MOBILE-DAY6', method: 'mobile_money' },
      { dayOffset: 12, amount: 35000, ref: 'TX-BANK-W2A', method: 'bank_transfer' },
      { dayOffset: 15, amount: 38000, ref: 'TX-BANK-W2B', method: 'bank_transfer' },
      { dayOffset: 20, amount: 42000, ref: 'TX-BANK-W3', method: 'bank_transfer' }
    ];

    for (let i = 0; i < recentDaysAmounts.length; i++) {
      const item = recentDaysAmounts[i];
      const student = studentsList[i % studentsList.length];
      const pDate = new Date();
      pDate.setDate(today.getDate() - item.dayOffset);
      const dateStr = formatIsoDate(pDate);

      paymentRecords.push({
        institution_id: INSTITUTION_ID,
        student_id: student.id,
        fee_structure_id: feeStructureIds[0] || null,
        amount: item.amount,
        payment_method: item.method,
        reference_number: item.ref,
        payment_date: pDate.toISOString(),
        status: 'completed',
        is_evidence_confirmed: true,
        admin_notes: 'Tuition & Academic Fees - Term 1 2026',
        created_at: pDate.toISOString()
      });

      transactionRecords.push({
        institution_id: INSTITUTION_ID,
        user_id: student.user_id,
        type: 'fee_payment',
        direction: 'inflow',
        amount: item.amount,
        date: dateStr,
        method: item.method,
        status: 'completed',
        reference_id: item.ref,
        meta: { student_name: student.users?.full_name, term: 'Term 1 2026' },
        created_at: pDate.toISOString()
      });
    }

    // Pending payment evidence for student1 (Alpha Zulu) as per Beta_test_credentials.md
    const student1 = studentsList.find(s => s.users?.email === 'student1@beta-academy.test') || studentsList[0];
    paymentRecords.push({
      institution_id: INSTITUTION_ID,
      student_id: student1.id,
      amount: 12500,
      payment_method: 'mobile_money',
      reference_number: 'MPESA-Q789XYZ26',
      payment_date: new Date().toISOString(),
      status: 'pending',
      is_evidence_confirmed: false,
      proof_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800',
      admin_notes: 'Please verify the transaction code on the M-Pesa portal for Alpha Zulu.',
      created_at: new Date().toISOString()
    });

    // Realistic Outflows / Revenue Deductions
    const deductions = [
      { amount: 18500, reason: 'Science Laboratory Chemical Reagents & Glassware', target: 'Lab Supplies Ltd', daysAgo: 1 },
      { amount: 24000, reason: 'High-Speed Dedicated Campus Fiber Internet Subscription', target: 'Safaricom Business', daysAgo: 3 },
      { amount: 15000, reason: 'Term 1 Inter-House Athletics Medals & Sports Gear', target: 'Nairobi Sports World', daysAgo: 5 },
      { amount: 32000, reason: 'Procurement of New Secondary Curriculum Reference Textbooks', target: 'Text Book Centre Ltd', daysAgo: 6 }
    ];

    for (const d of deductions) {
      const txDate = new Date();
      txDate.setDate(today.getDate() - d.daysAgo);
      transactionRecords.push({
        institution_id: INSTITUTION_ID,
        type: 'revenue_deduction',
        direction: 'outflow',
        amount: d.amount,
        date: formatIsoDate(txDate),
        method: 'bank_transfer',
        status: 'completed',
        reference_id: `EXP-TX-${Math.floor(1000 + Math.random() * 9000)}`,
        meta: { reason: d.reason, target: d.target },
        target_label: d.target,
        recorded_by_label: 'Finance Office',
        created_at: txDate.toISOString()
      });
    }

    const { error: pErr } = await supabase.from('payments').insert(paymentRecords);
    if (pErr) console.error('Payments insert error:', pErr.message);

    const { error: txErr } = await supabase.from('financial_transactions').insert(transactionRecords);
    if (txErr) console.error('Transactions insert error:', txErr.message);

    console.log(`   ✅ Seeded ${paymentRecords.length} payments (including 1 pending M-Pesa proof for Alpha Zulu).`);
    console.log(`   ✅ Seeded ${transactionRecords.length} general ledger inflow and outflow transactions.\n`);

    // ----------------------------------------------------------------
    // 13. FUNDS, ALLOCATIONS, BURSARIES & APPLICATIONS
    // ----------------------------------------------------------------
    console.log('🏛️ 13. Seeding Institutional Funds and Bursary Programs...');
    await supabase.from('fund_allocations').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('funds').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('bursary_applications').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('bursaries').delete().eq('institution_id', INSTITUTION_ID);

    const fundsData = [
      { name: 'General Academic Operations Fund', desc: 'Core funding for classroom resources and operations', total: 1200000, alloc: 650000 },
      { name: 'STEM & Science Laboratory Modernization Fund', desc: 'Equipment and consumables for physics, chemistry, biology labs', total: 450000, alloc: 280000 },
      { name: 'Sports & Extracurricular Excellence Fund', desc: 'Athletics, football, music and drama festival sponsorships', total: 250000, alloc: 140000 },
      { name: 'Beta Merit & Talent Scholarship Endowment', desc: 'Need-based and academic excellence scholarships', total: 600000, alloc: 350000 }
    ];

    const createdFunds = [];
    for (const f of fundsData) {
      const { data: newFund } = await supabase.from('funds').insert({
        institution_id: INSTITUTION_ID,
        name: f.name,
        description: f.desc,
        total_amount: f.total,
        allocated_amount: f.alloc
      }).select().single();
      if (newFund) createdFunds.push(newFund);
    }

    if (createdFunds.length > 0) {
      const allocations = [
        { fund_id: createdFunds[0].id, title: 'Classroom Projector Upgrades', amount: 150000, cat: 'infrastructure' },
        { fund_id: createdFunds[0].id, title: 'Term 1 Exam Printing & Stationery', amount: 80000, cat: 'supplies' },
        { fund_id: createdFunds[1].id, title: 'Digital Microscopes for Biology Lab', amount: 120000, cat: 'equipment' },
        { fund_id: createdFunds[1].id, title: 'Chemical Reagents for Term 1 Practical Exams', amount: 65000, cat: 'supplies' },
        { fund_id: createdFunds[2].id, title: 'Football & Volleyball Kits', amount: 45000, cat: 'sports' },
        { fund_id: createdFunds[3].id, title: 'Term 1 Merit Scholarship Bursary Allocations', amount: 200000, cat: 'scholarship' }
      ];

      for (const a of allocations) {
        await supabase.from('fund_allocations').insert({
          institution_id: INSTITUTION_ID,
          fund_id: a.fund_id,
          title: a.title,
          description: 'Approved departmental budget allocation for academic year 2026-2027.',
          amount: a.amount,
          category: a.cat,
          allocation_date: '2026-08-28',
          status: 'approved'
        });
      }
    }

    const bursariesData = [
      { title: 'Presidential STEM Excellence Bursary', desc: 'Full tuition sponsorship for students demonstrating outstanding mathematics and sciences aptitude.', amount: 35000 },
      { title: 'Beta Community Need-Based Grant', desc: 'Direct financial assistance for deserving students facing hardship.', amount: 25000 },
      { title: 'Young Tech Innovators Award', desc: 'Scholarship grant for students with innovative computing and robotics projects.', amount: 30000 },
      { title: 'Athletics & Leadership Scholarship', desc: 'Granted to student council members and regional athletics champions.', amount: 20000 }
    ];

    const createdBursaries = [];
    for (const b of bursariesData) {
      const { data: newBursary } = await supabase.from('bursaries').insert({
        institution_id: INSTITUTION_ID,
        title: b.title,
        description: b.desc,
        amount: b.amount,
        deadline: '2026-10-31',
        requirements: 'Minimum B+ average grade, leadership involvement, and submission of personal essay.',
        status: 'open'
      }).select().single();
      if (newBursary) createdBursaries.push(newBursary);
    }

    if (createdBursaries.length > 0 && studentsList.length > 0) {
      const bApps = [
        {
          bursary_id: createdBursaries[0].id,
          student_id: studentsList[0].id,
          justification: 'Consistent straight A student in Mathematics and Physics aiming to pursue Aerospace Engineering.',
          status: 'approved',
          amount_awarded: 35000,
          notes: 'Awarded based on exemplary CAT 1 results and robotics club leadership.',
          reviewed_by: adminRecord?.id || null
        },
        {
          bursary_id: createdBursaries[1].id,
          student_id: studentsList[1].id,
          justification: 'Application for need-based tuition subsidy to cover Term 1 remaining balance.',
          status: 'pending',
          amount_awarded: null,
          notes: 'Documents submitted for committee review on Friday.',
          reviewed_by: null
        },
        {
          bursary_id: createdBursaries[2].id,
          student_id: studentsList[2].id,
          justification: 'Developed an automated school garden watering sensor for the science congress.',
          status: 'approved',
          amount_awarded: 25000,
          notes: 'Commended for practical innovation and STEM leadership.',
          reviewed_by: adminRecord?.id || null
        }
      ];

      for (const app of bApps) {
        await supabase.from('bursary_applications').insert({
          institution_id: INSTITUTION_ID,
          bursary_id: app.bursary_id,
          student_id: app.student_id,
          justification: app.justification,
          status: app.status,
          amount_awarded: app.amount_awarded,
          notes: app.notes,
          reviewed_by: app.reviewed_by,
          applied_at: '2026-08-30T10:00:00Z',
          reviewed_at: app.status === 'approved' ? '2026-09-02T14:00:00Z' : null
        });
      }
    }
    console.log(`   ✅ Seeded ${createdFunds.length} funds, 6 allocations, 4 bursaries and 3 student applications.\n`);

    // ----------------------------------------------------------------
    // 14. LIBRARY: BOOKS, BORROWING & CONFIG
    // ----------------------------------------------------------------
    console.log('📖 14. Seeding Library Books, Borrowing History and Config...');
    await supabase.from('borrowed_books').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('books').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('library_config').delete().eq('institution_id', INSTITUTION_ID);

    await supabase.from('library_config').insert({
      institution_id: INSTITUTION_ID,
      default_borrow_limit: 3,
      min_fee_percent_for_borrow: 0.50,
      active: true,
      effective_from: '2026-01-01T00:00:00Z'
    });

    const booksData = [
      { title: 'Advanced Mathematics for Secondary Schools', author: 'Dr. Leonard Euler', isbn: '978-012345001', category: 'Mathematics', qty: 15, shelf: 'MATH-A1' },
      { title: 'Principles of Modern Physics (4th Edition)', author: 'Prof. Albert Einstein', isbn: '978-012345002', category: 'Science', qty: 12, shelf: 'SCI-P1' },
      { title: 'Cellular Biology & Genetics', author: 'Dr. Charles Darwin', isbn: '978-012345003', category: 'Science', qty: 14, shelf: 'SCI-B1' },
      { title: 'Inorganic and Physical Chemistry for Schools', author: 'Marie Curie & D. Mendeleev', isbn: '978-012345004', category: 'Science', qty: 10, shelf: 'SCI-C1' },
      { title: 'The River Between', author: 'Ngũgĩ wa Thiong\'o', isbn: '978-012345005', category: 'Literature', qty: 25, shelf: 'LIT-AF1' },
      { title: 'Things Fall Apart', author: 'Chinua Achebe', isbn: '978-012345006', category: 'Literature', qty: 20, shelf: 'LIT-AF2' },
      { title: 'Blossoms of the Savannah', author: 'Henry Ole Kulet', isbn: '978-012345007', category: 'Literature', qty: 18, shelf: 'LIT-AF3' },
      { title: 'Computer Systems Architecture & Python Coding', author: 'Ada Lovelace & C. Babbage', isbn: '978-012345008', category: 'Technology', qty: 10, shelf: 'TECH-01' },
      { title: 'Comprehensive East African and World History', author: 'Prof. Bethwell Ogot', isbn: '978-012345009', category: 'Humanities', qty: 12, shelf: 'HIST-01' },
      { title: 'Physical and Human Geography for Form 1-4', author: 'Dr. Rachel Mapmaker', isbn: '978-012345010', category: 'Humanities', qty: 15, shelf: 'GEOG-01' },
      { title: 'Business Studies & Financial Principles', author: 'Warren Buffet & B. Graham', isbn: '978-012345011', category: 'Business', qty: 10, shelf: 'BUS-01' },
      { title: 'Kamusi ya Kiswahili Sanifu (Toleo la Nne)', author: 'TUKI - Chuo Kikuu DSM', isbn: '978-012345012', category: 'Languages', qty: 16, shelf: 'KISW-01' }
    ];

    const createdBooks = [];
    for (const b of booksData) {
      const { data: newBook } = await supabase.from('books').insert({
        institution_id: INSTITUTION_ID,
        title: b.title,
        author: b.author,
        isbn: b.isbn,
        category: b.category,
        total_quantity: b.qty,
        available_quantity: b.qty - 2,
        shelf_location: b.shelf,
        publisher: 'East African Educational Publishers',
        publication_year: 2025,
        language: 'English',
        edition: 'Revised Edition 2026'
      }).select().single();
      if (newBook) createdBooks.push(newBook);
    }

    if (createdBooks.length > 0 && studentsList.length > 0) {
      const borrows = [
        { bookIdx: 0, studentIdx: 0, daysAgo: 5, status: 'borrowed' },
        { bookIdx: 1, studentIdx: 1, daysAgo: 3, status: 'borrowed' },
        { bookIdx: 4, studentIdx: 2, daysAgo: 18, status: 'overdue' },
        { bookIdx: 7, studentIdx: 3, daysAgo: 12, status: 'returned' },
        { bookIdx: 8, studentIdx: 4, daysAgo: 2, status: 'borrowed' }
      ];

      for (const br of borrows) {
        const book = createdBooks[br.bookIdx];
        const student = studentsList[br.studentIdx];
        const borrowDate = new Date();
        borrowDate.setDate(today.getDate() - br.daysAgo);
        const dueDate = new Date(borrowDate);
        dueDate.setDate(dueDate.getDate() + 14);

        await supabase.from('borrowed_books').insert({
          institution_id: INSTITUTION_ID,
          book_id: book.id,
          student_id: student.id,
          borrowed_at: borrowDate.toISOString(),
          due_date: dueDate.toISOString(),
          returned_at: br.status === 'returned' ? new Date().toISOString() : null,
          status: br.status,
          notes: br.status === 'overdue' ? 'Reminder email sent to student' : 'Standard 14-day checkout'
        });
      }
    }
    console.log(`   ✅ Seeded ${createdBooks.length} catalogue books, active borrows and library config.\n`);

    // ----------------------------------------------------------------
    // 15. COMMUNICATION: ANNOUNCEMENTS, MESSAGES & DIARY
    // ----------------------------------------------------------------
    console.log('📢 15. Seeding Announcements, Direct Messages and Class Diary...');
    await supabase.from('announcements').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('diary_entries').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('messages').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('conversations').delete().eq('institution_id', INSTITUTION_ID);

    const announcementsData = [
      {
        title: 'Official Commencement of the 2026/2027 Academic Year',
        message: 'A warm welcome to all students, parents, and educators. Term 1 classes, laboratory sessions, and extracurricular clubs are officially in session.',
        teacherId: teacherSarah?.id
      },
      {
        title: 'Annual STEM & Robotics Exhibition Registration',
        message: 'Students interested in entering projects for the Nairobi Regional Science & Robotics Expo should register with Ms. Emma Science before Friday.',
        teacherId: teacherEmma?.id
      },
      {
        title: 'Term 1 Inter-House Athletics & Track Championships',
        message: 'Inter-house track heats begin next Tuesday afternoon. All house captains must submit their relay and field event rosters by Monday.',
        teacherId: teacherWilson?.id
      },
      {
        title: 'Parent-Teacher Academic Consultative Forum',
        message: 'The Mid-Term Parent-Teacher Consultation Day is scheduled for the end of the month. Individual appointment slots will open on the parent portal.',
        teacherId: teacherSarah?.id
      }
    ];

    for (const ann of announcementsData) {
      await supabase.from('announcements').insert({
        institution_id: INSTITUTION_ID,
        title: ann.title,
        message: ann.message,
        teacher_id: ann.teacherId,
        created_at: new Date().toISOString()
      });
    }

    const diaryEntriesData = [
      {
        class: 'Form 1 Alpha',
        teacherId: teacherSarah?.id,
        title: 'Form 1 Alpha Daily Briefing - Mathematics & Physics',
        content: 'Covered Linear Equations (Chapter 3) in Math. Homework: Exercise 3.2 Q1-10. Completed density lab practical in Physics.',
        daysAgo: 0,
        signed: true
      },
      {
        class: 'Form 1 Alpha',
        teacherId: teacherWilson?.id,
        title: 'Geometry & Geometrical Sets Reminder',
        content: 'Please ensure every student has a complete geometrical set and graph paper for tomorrow\'s constructions lesson.',
        daysAgo: 1,
        signed: true
      },
      {
        class: 'Form 2 Alpha',
        teacherId: teacherWilson?.id,
        title: 'Quadratic Functions & Mid-Term Exam Prep',
        content: 'Factorization methods reviewed. Additional practice problems provided for home study over the weekend.',
        daysAgo: 2,
        signed: false
      },
      {
        class: 'Form 3 Alpha',
        teacherId: teacherEmma?.id,
        title: 'Chemistry Organic Reactions Lab Follow-up',
        content: 'Students submitted lab observations for alkane combustion experiments. Revision questions due Monday.',
        daysAgo: 3,
        signed: true
      }
    ];

    for (const d of diaryEntriesData) {
      const classId = classMap[d.class];
      const entryDate = new Date();
      entryDate.setDate(today.getDate() - d.daysAgo);

      await supabase.from('diary_entries').insert({
        institution_id: INSTITUTION_ID,
        class_id: classId,
        teacher_id: d.teacherId,
        title: d.title,
        content: d.content,
        entry_date: formatIsoDate(entryDate),
        is_signed: d.signed,
        status: 'approved'
      });
    }

    // Direct Messages & Conversations (Type must be DIRECT)
    const adminUser = users.find(u => u.role === 'admin');
    const teacher1User = users.find(u => u.email === 'teacher@beta-academy.test');

    if (adminUser && teacher1User) {
      const { data: conv } = await supabase.from('conversations').insert({
        institution_id: INSTITUTION_ID,
        type: 'DIRECT',
        last_message_at: new Date().toISOString()
      }).select().single();

      if (conv) {
        await supabase.from('conversation_participants').insert([
          { conversation_id: conv.id, user_id: adminUser.id },
          { conversation_id: conv.id, user_id: teacher1User.id }
        ]);

        await supabase.from('messages').insert([
          {
            institution_id: INSTITUTION_ID,
            conversation_id: conv.id,
            sender_id: adminUser.id,
            receiver_id: teacher1User.id,
            subject: 'Term 1 Curriculum Coordination',
            content: 'Hello Sarah, please ensure all Form 1 course schemes of work and practical lab timetables are aligned by Wednesday.',
            is_read: true
          },
          {
            institution_id: INSTITUTION_ID,
            conversation_id: conv.id,
            sender_id: teacher1User.id,
            receiver_id: adminUser.id,
            subject: 'Re: Term 1 Curriculum Coordination',
            content: 'Good morning Principal. All schemes for Form 1 Alpha have been verified and practical dates are booked with the lab technicians.',
            is_read: true
          }
        ]);
      }
    }
    console.log(`   ✅ Seeded announcements, direct messages, and daily class diary logs.\n`);

    // ----------------------------------------------------------------
    // 16. LEARNING RESOURCES & LESSONS
    // ----------------------------------------------------------------
    console.log('📑 16. Seeding Learning Resources and Scheduled Lessons...');
    await supabase.from('resources').delete().eq('institution_id', INSTITUTION_ID);
    await supabase.from('lessons').delete().eq('institution_id', INSTITUTION_ID);

    const resourcesData = [
      {
        title: 'Form 1 Mathematics - Comprehensive Algebra Revision Guide.pdf',
        subjectId: subjectMap['Form 1 Alpha_Mathematics'],
        teacherId: teacherWilson?.id,
        type: 'pdf',
        size: '2.4 MB'
      },
      {
        title: 'KCSE Physics Practical Manual & Apparatus Setup.pdf',
        subjectId: subjectMap['Form 1 Alpha_Physics'],
        teacherId: teacherEmma?.id,
        type: 'pdf',
        size: '4.1 MB'
      },
      {
        title: 'Cell Physiology & Plant Transport Slides.pdf',
        subjectId: subjectMap['Form 2 Alpha_Biology'],
        teacherId: teacherEmma?.id,
        type: 'pdf',
        size: '5.8 MB'
      },
      {
        title: 'Organic Chemistry Reactions Summary Chart.pdf',
        subjectId: subjectMap['Form 3 Alpha_Chemistry'],
        teacherId: teacherEmma?.id,
        type: 'pdf',
        size: '1.9 MB'
      },
      {
        title: 'The River Between - Themes and Character Notes.pdf',
        subjectId: subjectMap['Form 3 Alpha_English Literature'],
        teacherId: teacherSarah?.id,
        type: 'pdf',
        size: '1.2 MB'
      }
    ];

    for (const r of resourcesData) {
      if (!r.subjectId) continue;
      await supabase.from('resources').insert({
        institution_id: INSTITUTION_ID,
        title: r.title,
        subject_id: r.subjectId,
        teacher_id: r.teacherId,
        type: r.type,
        size: r.size,
        url: 'https://cloudora.test/resources/' + encodeURIComponent(r.title),
        status: 'approved'
      });
    }

    const lessonsData = [
      { title: 'Linear Equations in One Unknown', subjectId: subjectMap['Form 1 Alpha_Mathematics'], duration: '45 mins', type: 'reading' },
      { title: 'Density of Irregular Objects', subjectId: subjectMap['Form 1 Alpha_Physics'], duration: '45 mins', type: 'reading' },
      { title: 'Enzymes and Digestion Kinetics', subjectId: subjectMap['Form 2 Alpha_Biology'], duration: '90 mins', type: 'video' },
      { title: 'Molar Concentrations and Titration', subjectId: subjectMap['Form 3 Alpha_Chemistry'], duration: '90 mins', type: 'reading' }
    ];

    for (const l of lessonsData) {
      if (!l.subjectId) continue;
      await supabase.from('lessons').insert({
        institution_id: INSTITUTION_ID,
        subject_id: l.subjectId,
        title: l.title,
        duration: l.duration,
        content: 'Detailed lesson presentation notes with worked examples and exercise links.',
        scheduled_at: new Date().toISOString(),
        type: l.type,
        is_locked: false
      });
    }
    console.log(`   ✅ Seeded 5 official course resources and 4 scheduled lessons.\n`);

    console.log('================================================================');
    console.log('🎉 BETA PARTNER ACADEMY SHOWCASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('================================================================');

  } catch (err) {
    console.error('\n❌ SEEDING FAILED WITH ERROR:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  seedBetaShowcaseData();
}

module.exports = { seedBetaShowcaseData };
