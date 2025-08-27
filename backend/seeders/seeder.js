// // seed.js
// require("dotenv").config();
// const { faker } = require("@faker-js/faker");
// const { createClient } = require("@supabase/supabase-js");

// const supabase = createClient(
//   process.env.SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY
// );

// async function seed() {
//   // 1. Institutions
//   const { data: institution, error: instError } = await supabase
//     .from("institutions")
//     .insert([{ name: "Greenfield Academy", location: "Nairobi, Kenya" }])
//     .select()
//     .single();

//   if (instError) return console.error("❌ Institution Error", instError);

//   const institution_id = institution.id;
//   console.log("✅ Seeded institution:", institution.name);

//   // 2. Users
//   const users = ["admin", "teacher", "student"].map((role) => ({
//     id: faker.string.uuid(),
//     full_name: faker.person.fullName(),
//     email: `${role}@example.com`,
//     role,
//     institution_id,
//   }));

//   await supabase.from("users").insert(users);
//   console.log("✅ Seeded users: admin, teacher, student");

//   const teacher = users.find((u) => u.role === "teacher");
//   const student = users.find((u) => u.role === "student");

//   // 3. Courses
//   const courseList = [...Array(3)].map(() => ({
//     title: faker.word.words(3),
//     description: faker.lorem.sentences(2),
//     teacher_id: teacher.id,
//     institution_id,
//   }));

//   const { data: courses, error: courseError } = await supabase
//     .from("courses")
//     .insert(courseList)
//     .select();

//   if (courseError) return console.error("❌ Courses Error", courseError);
//   console.log(`✅ Seeded ${courses.length} courses`);

//   // 4. Assignments
//   for (let course of courses) {
//     await supabase.from("assignments").insert([
//       {
//         title: faker.hacker.verb() + " " + faker.word.words(2),
//         description: faker.lorem.paragraph(),
//         due_date: faker.date.soon({ days: 10 }),
//         course_id: course.id,
//       },
//     ]);
//   }
//   console.log("✅ Seeded assignments for each course");

//   // 5. Lessons
//   for (let course of courses) {
//     await supabase.from("lessons").insert([
//       {
//         title: "Introduction to " + course.title,
//         content: faker.lorem.paragraphs(2),
//         scheduled_at: faker.date.soon({ days: 5 }),
//         course_id: course.id,
//       },
//     ]);
//   }
//   console.log("✅ Seeded lessons");

//   // 6. Grades
//   for (let course of courses) {
//     await supabase.from("grades").insert([
//       {
//         student_id: student.id,
//         course_id: course.id,
//         total_grade: faker.number.float({ min: 60, max: 95 }),
//         feedback: faker.lorem.sentence(),
//         graded_by: teacher.id,
//       },
//     ]);
//   }
//   console.log("✅ Seeded grades for student");

//   // 7. Submissions
//   const { data: assignments } = await supabase.from("assignments").select("id");
//   for (let assignment of assignments) {
//     await supabase.from("submissions").insert([
//       {
//         assignment_id: assignment.id,
//         student_id: student.id,
//         file_url: faker.internet.url(),
//         graded: true,
//         grade: faker.number.float({ min: 60, max: 100 }),
//         feedback: faker.lorem.sentence(),
//       },
//     ]);
//   }
//   console.log("✅ Seeded submissions");

//   // 8. Attendance
//   for (let course of courses) {
//     await supabase.from("attendance").insert([
//       {
//         user_id: student.id,
//         course_id: course.id,
//         login_date: faker.date.recent(),
//         session_start: faker.date.recent(),
//         session_end: faker.date.recent(),
//         marked_by: teacher.id,
//         type: "manual",
//       },
//     ]);
//   }
//   console.log("✅ Seeded attendance");
// }

// seed();

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const usersToSeed = [
  {
    email: "admin@greenfield.com",
    password: "admin123",
    full_name: "Greenfield Admin",
    role: "admin",
    institution: "Greenfield Academy",
    location: "Nairobi, Kenya",
  },
  {
    email: "teacher1@greenfield.com",
    password: "teach123",
    full_name: "John Doe",
    role: "teacher",
    institution: "Greenfield Academy",
    location: "Nairobi, Kenya",
  },
  {
    email: "student1@greenfield.com",
    password: "stud123",
    full_name: "Alice Smith",
    role: "student",
    institution: "Greenfield Academy",
    location: "Nairobi, Kenya",
  },
];

const coursesToSeed = [
  {
    title: "Introduction to Mathematics",
    description: "Basic concepts in Algebra and Geometry",
    teacher_email: "teacher1@greenfield.com",
    institution_name: "Greenfield Academy",
  },
  {
    title: "English Literature",
    description: "Study of classic English literary works",
    teacher_email: "teacher1@greenfield.com",
    institution_name: "Greenfield Academy",
  },
];

const seed = async () => {
  console.log("🚀 Seeding started...");

  // Step 1: Seed institutions
  const institutions = {};
  for (const user of usersToSeed) {
    const { data, error } = await supabase
      .from("institutions")
      .upsert([{ name: user.institution, location: user.location }])
      .select()
      .single();

    if (error) {
      console.error(
        `❌ Error inserting institution '${user.institution}':`,
        error.message
      );
    } else {
      institutions[user.institution] = data.id;
      console.log(`✅ Seeded institution: ${user.institution}`);
    }
  }

  // Step 2: Seed users (auth + users table)
  const userMap = {};
  for (const user of usersToSeed) {
    try {
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
        });

      if (authError && !authError.message.includes("already registered")) {
        throw authError;
      }

      const uid =
        authData?.user?.id ||
        (
          await supabase.auth.admin.listUsers({ page: 1, perPage: 100 })
        ).data.users.find((u) => u.email === user.email)?.id;

      if (!uid) throw new Error(`Failed to resolve user ID for ${user.email}`);

      const { error: profileError } = await supabase.from("users").upsert(
        [
          {
            id: uid,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            institution_id: institutions[user.institution],
          },
        ],
        { onConflict: "id" }
      );

      if (profileError) throw profileError;

      userMap[user.email] = uid;
      console.log(`✅ Seeded user: ${user.email}`);
    } catch (e) {
      console.error(`❌ Failed to seed user '${user.email}':`, e.message);
    }
  }

  // Step 3: Seed courses
  for (const course of coursesToSeed) {
    const teacher_id = userMap[course.teacher_email];
    const institution_id = institutions[course.institution_name];

    if (!teacher_id || !institution_id) {
      console.warn(
        `⚠️ Skipping course '${course.title}' due to missing teacher or institution`
      );
      continue;
    }

    const { error } = await supabase.from("courses").insert([
      {
        title: course.title,
        description: course.description,
        teacher_id,
        institution_id,
      },
    ]);

    if (error) {
      console.error(
        `❌ Failed to seed course '${course.title}':`,
        error.message
      );
    } else {
      console.log(`📘 Seeded course: ${course.title}`);
    }
  }

  console.log("🌱 Seeding complete.");
};

seed();
