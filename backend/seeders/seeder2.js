// import { createClient } from "@supabase/supabase-js";
// import dotenv from "dotenv";

// dotenv.config();

// const supabase = createClient(
//   process.env.SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY
// );

// const usersToSeed = [
//   {
//     email: "admin@greenfield.com",
//     password: "admin123",
//     full_name: "Greenfield Admin",
//     role: "admin",
//     institution: "Greenfield Academy",
//     location: "Nairobi, Kenya",
//   },
//   {
//     email: "teacher1@greenfield.com",
//     password: "teach123",
//     full_name: "John Doe",
//     role: "teacher",
//     institution: "Greenfield Academy",
//     location: "Nairobi, Kenya",
//   },
//   {
//     email: "student1@greenfield.com",
//     password: "stud123",
//     full_name: "Alice Smith",
//     role: "student",
//     institution: "Greenfield Academy",
//     location: "Nairobi, Kenya",
//   },
// ];

// const coursesToSeed = [
//   {
//     title: "Introduction to Mathematics",
//     description: "Basic concepts in Algebra and Geometry",
//     teacher_email: "teacher1@greenfield.com",
//     institution_name: "Greenfield Academy",
//   },
//   {
//     title: "English Literature",
//     description: "Study of classic English literary works",
//     teacher_email: "teacher1@greenfield.com",
//     institution_name: "Greenfield Academy",
//   },
// ];

// const booksToSeed = [
//   {
//     title: "Clean Code",
//     author: "Robert C. Martin",
//     isbn: "9780132350884",
//     total_quantity: 5,
//   },
//   {
//     title: "The Pragmatic Programmer",
//     author: "Andrew Hunt, David Thomas",
//     isbn: "9780201616224",
//     total_quantity: 3,
//   },
//   {
//     title: "Introduction to Algorithms",
//     author: "Thomas H. Cormen",
//     isbn: "9780262033848",
//     total_quantity: 2,
//   },
// ];

// const seed = async () => {
//   console.log("🚀 Seeding started...");

//   // Step 1: Seed institutions
//   const institutions = {};
//   for (const user of usersToSeed) {
//     const { data, error } = await supabase
//       .from("institutions")
//       .upsert([{ name: user.institution, location: user.location }])
//       .select()
//       .single();

//     if (error) {
//       console.error(
//         `❌ Error inserting institution '${user.institution}':`,
//         error.message
//       );
//     } else {
//       institutions[user.institution] = data.id;
//       console.log(`✅ Seeded institution: ${user.institution}`);
//     }
//   }

//   // Step 2: Seed users
//   const userMap = {};
//   for (const user of usersToSeed) {
//     try {
//       const { data: authData, error: authError } =
//         await supabase.auth.admin.createUser({
//           email: user.email,
//           password: user.password,
//           email_confirm: true,
//         });

//       if (authError && !authError.message.includes("already registered")) {
//         throw authError;
//       }

//       const uid =
//         authData?.user?.id ||
//         (
//           await supabase.auth.admin.listUsers({ page: 1, perPage: 100 })
//         ).data.users.find((u) => u.email === user.email)?.id;

//       if (!uid) throw new Error(`Failed to resolve user ID for ${user.email}`);

//       const { error: profileError } = await supabase.from("users").upsert(
//         [
//           {
//             id: uid,
//             email: user.email,
//             full_name: user.full_name,
//             role: user.role,
//             institution_id: institutions[user.institution],
//           },
//         ],
//         { onConflict: "id" }
//       );

//       if (profileError) throw profileError;

//       userMap[user.email] = uid;
//       console.log(`✅ Seeded user: ${user.email}`);
//     } catch (e) {
//       console.error(`❌ Failed to seed user '${user.email}':`, e.message);
//     }
//   }

//   // Step 3: Seed courses
//   for (const course of coursesToSeed) {
//     const teacher_id = userMap[course.teacher_email];
//     const institution_id = institutions[course.institution_name];

//     if (!teacher_id || !institution_id) {
//       console.warn(
//         `⚠️ Skipping course '${course.title}' due to missing teacher or institution`
//       );
//       continue;
//     }

//     const { error } = await supabase.from("courses").insert([
//       {
//         title: course.title,
//         description: course.description,
//         teacher_id,
//         institution_id,
//       },
//     ]);

//     if (error) {
//       console.error(
//         `❌ Failed to seed course '${course.title}':`,
//         error.message
//       );
//     } else {
//       console.log(`📘 Seeded course: ${course.title}`);
//     }
//   }

//   // Step 4: Seed library books
//   const institution_id = institutions["Greenfield Academy"];
//   for (const book of booksToSeed) {
//     const { error } = await supabase.from("books").insert([
//       {
//         title: book.title,
//         author: book.author,
//         isbn: book.isbn,
//         total_quantity: book.total_quantity,
//         available_quantity: book.total_quantity,
//         institution_id,
//       },
//     ]);

//     if (error) {
//       console.error(`❌ Failed to seed book '${book.title}':`, error.message);
//     } else {
//       console.log(`📚 Seeded book: ${book.title}`);
//     }
//   }

//   // Step 5: Seed a borrowed book example
//   const studentId = userMap["student1@greenfield.com"];
//   const { data: firstBook } = await supabase
//     .from("books")
//     .select("id")
//     .limit(1)
//     .single();

//   if (studentId && firstBook) {
//     const { error } = await supabase.from("borrowed_books").insert([
//       {
//         book_id: firstBook.id,
//         user_id: studentId,
//         due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
//       },
//     ]);

//     if (error) {
//       console.error("❌ Failed to seed borrowed book:", error.message);
//     } else {
//       console.log("📖 Seeded borrowed book record");
//     }
//   }

//   console.log("🌱 Seeding complete.");
// };

// seed();


import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seed() {
  console.log("🚀 Seeding started...");

  // ---- Institutions ----
  const institutions = [{ name: "Greenfield Academy" }];

  for (const inst of institutions) {
    let { data, error } = await supabase
      .from("institutions")
      .select("id")
      .eq("name", inst.name)
      .single();

    if (data) {
      console.log(`✅ Institution exists: ${inst.name}`);
      inst.id = data.id;
    } else {
      let { data: inserted, error: insertError } = await supabase
        .from("institutions")
        .insert(inst)
        .select()
        .single();

      if (insertError) {
        console.error(
          `❌ Failed to insert institution '${inst.name}':`,
          insertError.message
        );
      } else {
        console.log(`✅ Seeded institution: ${inst.name}`);
        inst.id = inserted.id;
      }
    }
  }

  // ---- Users ----
  const users = [
    {
      email: "admin@greenfield.com",
      role: "admin",
      institution_id: institutions[0].id,
    },
    {
      email: "teacher1@greenfield.com",
      role: "teacher",
      institution_id: institutions[0].id,
    },
    {
      email: "student1@greenfield.com",
      role: "student",
      institution_id: institutions[0].id,
    },
  ];

  for (const user of users) {
    let { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", user.email)
      .single();

    if (data) {
      console.log(`✅ User exists: ${user.email}`);
      user.id = data.id;
    } else {
      let { data: inserted, error: insertError } = await supabase
        .from("users")
        .insert(user)
        .select()
        .single();

      if (insertError) {
        console.error(
          `❌ Failed to seed user '${user.email}':`,
          insertError.message
        );
      } else {
        console.log(`✅ Seeded user: ${user.email}`);
        user.id = inserted.id;
      }
    }
  }

  // ---- Courses ----
  const courses = [
    {
      title: "Introduction to Mathematics",
      teacher_email: "teacher1@greenfield.com",
    },
    { title: "English Literature", teacher_email: "teacher1@greenfield.com" },
  ];

  for (const course of courses) {
    const teacher = users.find((u) => u.email === course.teacher_email);
    if (!teacher) {
      console.warn(
        `⚠️ Skipping course '${course.title}' due to missing teacher`
      );
      continue;
    }

    let { data, error } = await supabase
      .from("courses")
      .select("id")
      .eq("title", course.title)
      .single();

    if (data) {
      console.log(`✅ Course exists: ${course.title}`);
    } else {
      let { error: insertError } = await supabase
        .from("courses")
        .insert({
          title: course.title,
          teacher_id: teacher.id,
          institution_id: institutions[0].id,
        });

      if (insertError) {
        console.error(
          `❌ Failed to seed course '${course.title}':`,
          insertError.message
        );
      } else {
        console.log(`📘 Seeded course: ${course.title}`);
      }
    }
  }

  // ---- Books ----
  const books = [
    { title: "Clean Code" },
    { title: "The Pragmatic Programmer" },
    { title: "Introduction to Algorithms" },
  ];

  for (const book of books) {
    let { data, error } = await supabase
      .from("books")
      .select("id")
      .eq("title", book.title)
      .single();

    if (data) {
      console.log(`✅ Book exists: ${book.title}`);
    } else {
      let { error: insertError } = await supabase.from("books").insert(book);

      if (insertError) {
        console.error(
          `❌ Failed to seed book '${book.title}':`,
          insertError.message
        );
      } else {
        console.log(`📚 Seeded book: ${book.title}`);
      }
    }
  }

  console.log("🌱 Seeding complete.");
}

seed();
