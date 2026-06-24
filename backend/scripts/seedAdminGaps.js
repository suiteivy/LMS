const https = require('https');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
let supabaseUrl = '';
let serviceKey = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key === 'EXPO_PUBLIC_SUPABASE_URL') supabaseUrl = val;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') serviceKey = val;
    }
  }
} catch (e) {
  console.error("Error reading .env:", e.message);
  process.exit(1);
}

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase configuration in .env.");
  process.exit(1);
}

const institutionId = 'b5bd788c-8297-4a96-b8b3-157814504fba';

function dbRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const urlStr = `${supabaseUrl}/rest/v1/${path}`;
    const options = {
      method: method,
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(urlStr, options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${responseBody}`));
        } else {
          try {
            resolve(JSON.parse(responseBody));
          } catch (e) {
            resolve(responseBody);
          }
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function getCount(table, queryParams = '') {
  const urlStr = `${supabaseUrl}/rest/v1/${table}?${queryParams}&limit=0`;
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'count=exact'
      }
    };
    const req = https.request(urlStr, options, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        const contentRange = res.headers['content-range'];
        if (contentRange) {
          const match = contentRange.match(/\/(\d+)$/);
          if (match) {
            resolve(parseInt(match[1]));
            return;
          }
        }
        resolve(0);
      });
    });
    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function run() {
  console.log("====================================================");
  console.log("CLOUDORA LMS ADMIN DATA SEEDING");
  console.log(`Target Institution: ${institutionId}`);
  console.log("====================================================");

  // 1. Fetch dependencies from target institution
  console.log("Fetching existing records...");
  const students = await dbRequest('GET', `students?select=*,users:user_id!inner(institution_id,status)&users.institution_id=eq.${institutionId}`);
  const teachers = await dbRequest('GET', `teachers?select=*,users:user_id!inner(institution_id)&users.institution_id=eq.${institutionId}`);
  const classes = await dbRequest('GET', `classes?institution_id=eq.${institutionId}`);
  const subjects = await dbRequest('GET', `subjects?institution_id=eq.${institutionId}`);
  const books = await dbRequest('GET', `books?institution_id=eq.${institutionId}`);
  const bursaries = await dbRequest('GET', `bursaries?institution_id=eq.${institutionId}`);
  const admins = await dbRequest('GET', `admins?select=*,users:user_id!inner(institution_id)&users.institution_id=eq.${institutionId}`);
  const fees = await dbRequest('GET', `fees?select=*`); // View containing fee payment metrics

  console.log(`Found: ${students.length} students, ${teachers.length} teachers, ${classes.length} classes, ${subjects.length} subjects, ${books.length} books, ${bursaries.length} bursaries, ${admins.length} admins.`);

  if (students.length === 0 || teachers.length === 0 || admins.length === 0) {
    console.error("Missing core roles (students, teachers, admins) to link records. Seeding aborted.");
    process.exit(1);
  }

  const adminId = admins[0].id;
  const adminUserId = admins[0].user_id;

  // ---------------------------------------------------------
  // CATEGORY 1: classes / subjects
  // ---------------------------------------------------------
  console.log("\n--- Checking Classes & Subjects ---");
  const classCount = await getCount('classes', `institution_id=eq.${institutionId}`);
  const subjectCount = await getCount('subjects', `institution_id=eq.${institutionId}`);
  
  let seededClasses = [...classes];
  let seededSubjects = [...subjects];

  if (classCount < 4) {
    console.log(`Currently ${classCount} classes. Seeding new classes...`);
    const newClassesData = [
      {
        grade_level: 7,
        stream: 'A',
        display_name: 'Grade 7 Stream A',
        capacity: 40,
        institution_id: institutionId,
        teacher_id: teachers[0].id
      },
      {
        grade_level: 8,
        stream: 'A',
        display_name: 'Grade 8 Stream A',
        capacity: 40,
        institution_id: institutionId,
        teacher_id: teachers[1 % teachers.length].id
      }
    ];
    const inserted = await dbRequest('POST', 'classes', newClassesData);
    console.log(`Seeded ${inserted.length} classes.`);
    seededClasses = [...seededClasses, ...inserted];
  } else {
    console.log("Classes adequate (>= 4). Skipping.");
  }

  if (subjectCount < 4) {
    console.log(`Currently ${subjectCount} subjects. Seeding new subjects...`);
    // Need at least one class to map subjects
    const class1Id = seededClasses[0].id;
    const class2Id = seededClasses[1 % seededClasses.length].id;

    const newSubjectsData = [
      {
        title: 'Mathematics',
        description: 'Standard Grade Mathematics',
        teacher_id: teachers[0].id,
        class_id: class1Id,
        institution_id: institutionId,
        fee_amount: 1500.00,
        category: 'Science',
        level: 'Standard'
      },
      {
        title: 'English Language',
        description: 'Grammar and Literature',
        teacher_id: teachers[1 % teachers.length].id,
        class_id: class2Id,
        institution_id: institutionId,
        fee_amount: 1200.00,
        category: 'Languages',
        level: 'Standard'
      }
    ];
    const inserted = await dbRequest('POST', 'subjects', newSubjectsData);
    console.log(`Seeded ${inserted.length} subjects.`);
    seededSubjects = [...seededSubjects, ...inserted];
  } else {
    console.log("Subjects adequate (>= 4). Skipping.");
  }

  // ---------------------------------------------------------
  // CATEGORY 2: timetables
  // ---------------------------------------------------------
  console.log("\n--- Checking Timetables ---");
  const timetableCount = await getCount('timetables', `select=*,classes!inner(institution_id)&classes.institution_id=eq.${institutionId}`);
  if (timetableCount === 0) {
    console.log("Seeding timetable lessons...");
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periods = [
      { start: '08:00:00', end: '09:00:00' },
      { start: '09:00:00', end: '10:00:00' },
      { start: '10:30:00', end: '11:30:00' },
      { start: '11:30:00', end: '12:30:00' },
      { start: '14:00:00', end: '15:00:00' }
    ];

    const timetableData = [];
    // Seed timetable entries for the first 2 classes and subjects
    for (let cIdx = 0; cIdx < Math.min(seededClasses.length, 2); cIdx++) {
      const cls = seededClasses[cIdx];
      // Find subjects for this class or map seeded subjects
      const classSubjects = seededSubjects.filter(s => s.class_id === cls.id);
      const subList = classSubjects.length > 0 ? classSubjects : seededSubjects;

      for (let dIdx = 0; dIdx < days.length; dIdx++) {
        const day = days[dIdx];
        for (let pIdx = 0; pIdx < Math.min(periods.length, subList.length); pIdx++) {
          const sub = subList[pIdx];
          const period = periods[pIdx];
          timetableData.push({
            class_id: cls.id,
            subject_id: sub.id,
            day_of_week: day,
            start_time: period.start,
            end_time: period.end,
            room_number: `Room ${101 + cIdx * 10 + pIdx}`,
            institution_id: institutionId
          });
        }
      }
    }

    const inserted = await dbRequest('POST', 'timetables', timetableData);
    console.log(`Seeded ${inserted.length} timetable entries.`);
  } else {
    console.log(`Timetables already has ${timetableCount} entries. Skipping.`);
  }

  // ---------------------------------------------------------
  // CATEGORY 3: funds / fund_allocations
  // ---------------------------------------------------------
  console.log("\n--- Checking Funds & Allocations ---");
  const fundsCount = await getCount('funds', `institution_id=eq.${institutionId}`);
  if (fundsCount === 0) {
    console.log("Seeding funds and allocations...");
    const newFunds = [
      {
        name: 'Infrastructure & Building Fund',
        description: 'Capital development fund for classroom and lab construction',
        total_amount: 5000000.00,
        allocated_amount: 3200000.00,
        institution_id: institutionId
      },
      {
        name: 'Sports & Extra-Curricular Fund',
        description: 'Purchasing sports kits, field upkeep, and tournament expenses',
        total_amount: 750000.00,
        allocated_amount: 450000.00,
        institution_id: institutionId
      },
      {
        name: 'Internal Examinations Fund',
        description: 'Printing papers, exam booklets, and mock testing logistics',
        total_amount: 300000.00,
        allocated_amount: 120000.00,
        institution_id: institutionId
      }
    ];

    const insertedFunds = await dbRequest('POST', 'funds', newFunds);
    console.log(`Seeded ${insertedFunds.length} funds.`);

    const allocations = [
      {
        fund_id: insertedFunds[0].id,
        title: 'Science Lab Modernization Phase 1',
        description: 'New gas taps, sinks, and chemical storage installation',
        amount: 2000000.00,
        category: 'Construction',
        status: 'spent',
        institution_id: institutionId
      },
      {
        fund_id: insertedFunds[0].id,
        title: 'Grade 8 Stream B Building Block',
        description: 'Laying bricks and foundation work for Class 8 extension',
        amount: 1200000.00,
        category: 'Construction',
        status: 'approved',
        institution_id: institutionId
      },
      {
        fund_id: insertedFunds[1].id,
        title: 'Inter-School Athletics Transport',
        description: 'Bus hiring for provincial athletic meet',
        amount: 150000.00,
        category: 'Sports',
        status: 'spent',
        institution_id: institutionId
      },
      {
        fund_id: insertedFunds[1].id,
        title: 'New Soccer Balls and Goalposts Nets',
        description: 'Standard size 5 footballs and weather-resistant nets',
        amount: 300000.00,
        category: 'Equipment',
        status: 'planned',
        institution_id: institutionId
      },
      {
        fund_id: insertedFunds[2].id,
        title: 'Term 1 Main Exam Booklet Printing',
        description: 'Bulk printing of answer books',
        amount: 120000.00,
        category: 'Examinations',
        status: 'spent',
        institution_id: institutionId
      }
    ];

    const insertedAllocations = await dbRequest('POST', 'fund_allocations', allocations);
    console.log(`Seeded ${insertedAllocations.length} fund allocations.`);
  } else {
    console.log(`Funds already has ${fundsCount} rows. Skipping.`);
  }

  // ---------------------------------------------------------
  // CATEGORY 4: borrowed_books
  // ---------------------------------------------------------
  console.log("\n--- Checking Borrowed Books ---");
  const borrowCount = await getCount('borrowed_books', `institution_id=eq.${institutionId}`);
  if (borrowCount === 0 && books.length > 0) {
    console.log("Seeding borrowed books...");
    // Find students whose fees are paid up or have no fee requirements to satisfy trigged validation
    // If the fees view is empty, any student works.
    const approvedStudentIds = students
      .filter(s => s.users?.status === 'approved')
      .map(s => s.id);

    // Let's filter students based on their fees payment status in fees view to avoid trigger failure
    let eligibleStudentIds = [];
    if (fees && fees.length > 0) {
      eligibleStudentIds = students
        .filter(s => {
          const studentFee = fees.find(f => f.student_id === s.id);
          if (!studentFee) return true; // No fee structures = 100% paid
          const total = Number(studentFee.total_fee || 0);
          const paid = Number(studentFee.amount_paid || 0);
          return total === 0 || (paid / total) >= 0.5;
        })
        .map(s => s.id);
    }

    const targetStudents = eligibleStudentIds.length > 0 ? eligibleStudentIds : approvedStudentIds;

    if (targetStudents.length === 0) {
      console.warn("No eligible approved students with sufficient fee clearance found for library triggers. Using default approved list.");
    }

    const studentToUse = targetStudents[0] || approvedStudentIds[0];
    const secondStudentToUse = targetStudents[1] || approvedStudentIds[1] || studentToUse;

    // Dates
    const today = new Date();
    const returnDate1 = new Date();
    returnDate1.setDate(today.getDate() - 10);
    const dueDate1 = new Date();
    dueDate1.setDate(today.getDate() + 4);

    const borrowData = [
      {
        book_id: books[0].id,
        student_id: studentToUse,
        borrowed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        due_date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        status: 'borrowed',
        institution_id: institutionId
      },
      {
        book_id: books[1 % books.length].id,
        student_id: secondStudentToUse,
        borrowed_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        due_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        returned_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'returned',
        institution_id: institutionId
      },
      {
        book_id: books[2 % books.length].id,
        student_id: studentToUse,
        borrowed_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
        due_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        status: 'overdue',
        institution_id: institutionId
      }
    ];

    try {
      const inserted = await dbRequest('POST', 'borrowed_books', borrowData);
      console.log(`Seeded ${inserted.length} borrowed book loans.`);
    } catch (e) {
      console.error("Trigger or DB error inserting borrowed books:", e.message);
    }
  } else {
    console.log(`Borrowed books already has ${borrowCount} entries. Skipping.`);
  }

  // ---------------------------------------------------------
  // CATEGORY 5: bursary_applications
  // ---------------------------------------------------------
  console.log("\n--- Checking Bursary Applications ---");
  const bursaryAppsCount = await getCount('bursary_applications', `select=*,bursary:bursaries!inner(institution_id)&bursary.institution_id=eq.${institutionId}`);
  if (bursaryAppsCount === 0 && bursaries.length > 0) {
    console.log("Seeding bursary applications...");
    const appData = [
      {
        bursary_id: bursaries[0].id,
        student_id: students[0].id,
        justification: 'Total orphan raised by elderly grandmother. Unable to afford second-term school activity fee.',
        status: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        institution_id: institutionId
      },
      {
        bursary_id: bursaries[1 % bursaries.length].id,
        student_id: students[1 % students.length].id,
        justification: 'Single parent lost business due to market fire. Current household income is insufficient.',
        status: 'pending',
        institution_id: institutionId
      },
      {
        bursary_id: bursaries[2 % bursaries.length].id,
        student_id: students[2 % students.length].id,
        justification: 'Family experiencing heavy medical bills from chronic illness.',
        status: 'rejected',
        reviewed_by: adminId,
        reviewed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        institution_id: institutionId
      }
    ];

    const inserted = await dbRequest('POST', 'bursary_applications', appData);
    console.log(`Seeded ${inserted.length} bursary applications.`);
  } else {
    console.log(`Bursary applications already has ${bursaryAppsCount} entries. Skipping.`);
  }

  // ---------------------------------------------------------
  // CATEGORY 6: teacher_attendance
  // ---------------------------------------------------------
  console.log("\n--- Checking Teacher Attendance ---");
  const teachAttCount = await getCount('teacher_attendance', `select=*,teachers!inner(users!inner(institution_id))&teachers.users.institution_id=eq.${institutionId}`);
  if (teachAttCount === 0) {
    console.log("Seeding 14 days of teacher attendance...");
    const records = [];
    
    // Last 14 days, skip weekends
    const today = new Date();
    let daysProcessed = 0;
    let dayOffset = 1;

    while (daysProcessed < 14) {
      const targetDate = new Date();
      targetDate.setDate(today.getDate() - dayOffset);
      dayOffset++;

      const dayOfWeek = targetDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip Sat/Sun

      const dateStr = targetDate.toISOString().split('T')[0];

      for (let tIdx = 0; tIdx < teachers.length; tIdx++) {
        const teacher = teachers[tIdx];
        
        // Randomize present (90%), late (7%), absent (3%)
        const rand = Math.random();
        let status = 'present';
        let checkIn = null;
        let checkOut = null;
        let notes = '';

        if (rand < 0.90) {
          status = 'present';
          checkIn = new Date(`${dateStr}T07:45:00Z`).toISOString();
          checkOut = new Date(`${dateStr}T16:00:00Z`).toISOString();
        } else if (rand < 0.97) {
          status = 'late';
          checkIn = new Date(`${dateStr}T08:25:00Z`).toISOString();
          checkOut = new Date(`${dateStr}T16:00:00Z`).toISOString();
          notes = 'Delayed by heavy morning traffic.';
        } else {
          status = 'absent';
          notes = 'Reported sick leave.';
        }

        records.push({
          teacher_id: teacher.id,
          date: dateStr,
          status: status,
          check_in_time: checkIn,
          check_out_time: checkOut,
          notes: notes,
          institution_id: institutionId
        });
      }
      daysProcessed++;
    }

    const inserted = await dbRequest('POST', 'teacher_attendance', records);
    console.log(`Seeded ${inserted.length} teacher attendance logs.`);
  } else {
    console.log(`Teacher attendance already has ${teachAttCount} records. Skipping.`);
  }

  // ---------------------------------------------------------
  // CATEGORY 7: support_tickets / ticket_messages
  // ---------------------------------------------------------
  console.log("\n--- Checking Support Tickets ---");
  const ticketsCount = await getCount('support_tickets', `institution_id=eq.${institutionId}`);
  if (ticketsCount === 0) {
    console.log("Seeding support tickets and ticket messages...");
    const sampleTickets = [
      {
        user_id: students[0].user_id,
        institution_id: institutionId,
        subject: 'Cannot access Mathematics materials',
        description: 'Whenever I try to download the Term 1 algebra notes, the screen freezes.',
        category: 'Academic Portal',
        status: 'open',
        priority: 'high'
      },
      {
        user_id: teachers[0].user_id,
        institution_id: institutionId,
        subject: 'Smartboard login credentials expired',
        description: 'My classroom display in Room 102 prompts that credentials expired.',
        category: 'Classroom Tech',
        status: 'in_progress',
        priority: 'normal',
        assigned_to_id: adminUserId
      },
      {
        user_id: students[1 % students.length].user_id,
        institution_id: institutionId,
        subject: 'Double billing on activity fees',
        description: 'My invoice shows the sports fee twice. Please look into this.',
        category: 'Billing',
        status: 'resolved',
        priority: 'high',
        assigned_to_id: adminUserId,
        resolved_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    const insertedTickets = await dbRequest('POST', 'support_tickets', sampleTickets);
    console.log(`Seeded ${insertedTickets.length} support tickets.`);

    const messages = [
      {
        ticket_id: insertedTickets[0].id,
        sender_id: students[0].user_id,
        message: 'I have tried clearing my cache and restarting the app, but it still does not load.'
      },
      {
        ticket_id: insertedTickets[1].id,
        sender_id: teachers[0].user_id,
        message: 'Class starts in 30 minutes. Let me know if you can reset it remotely.'
      },
      {
        ticket_id: insertedTickets[1].id,
        sender_id: adminUserId,
        message: 'Working on it now. Resetting the Active Directory lease for Room 102.'
      },
      {
        ticket_id: insertedTickets[2].id,
        sender_id: adminUserId,
        message: 'The double invoice has been corrected. Your credit balance has been updated.'
      },
      {
        ticket_id: insertedTickets[2].id,
        sender_id: students[1 % students.length].user_id,
        message: 'Confirmed on my portal. Thank you!'
      }
    ];

    const insertedMessages = await dbRequest('POST', 'ticket_messages', messages);
    console.log(`Seeded ${insertedMessages.length} ticket messages.`);
  } else {
    console.log(`Support tickets already has ${ticketsCount} rows. Skipping.`);
  }

  console.log("\n====================================================");
  console.log("SEEDING OPERATION COMPLETED SUCCESSFULLY");
  console.log("====================================================");
}

run().catch(e => {
  console.error("An error occurred during seeding:", e);
});
