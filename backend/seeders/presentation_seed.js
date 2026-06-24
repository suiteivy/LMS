const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedLMSPresentation() {
    console.log("🚀 Starting LMS Presentation Seeding...");

    // 1. Get Beta Partner Academy ID
    const { data: inst } = await supabase.from("institutions").select("id").eq("name", "Beta Partner Academy").single();
    if (!inst) {
        console.error("❌ Beta Partner Academy not found. Run beta_seeder.js first.");
        return;
    }
    const instId = inst.id;

    // 2. Seed Library Books
    console.log("📚 Seeding Library...");
    const books = [
        { title: "Advanced Mathematics", author: "Dr. Euler", isbn: "978-0123456789", category: "Mathematics", total_quantity: 10, available_quantity: 10, institution_id: instId },
        { title: "Modern Physics", author: "Albert Einstein", isbn: "978-0123456788", category: "Science", total_quantity: 5, available_quantity: 5, institution_id: instId },
        { title: "English Literature: Classics", author: "William Shakespeare", isbn: "978-0123456787", category: "Literature", total_quantity: 15, available_quantity: 15, institution_id: instId },
        { title: "Introduction to Biology", author: "Charles Darwin", isbn: "978-0123456786", category: "Science", total_quantity: 8, available_quantity: 8, institution_id: instId }
    ];
    await supabase.from("books").upsert(books, { onConflict: 'isbn' });

    // 3. Seed Fee Structures
    console.log("💰 Seeding Finance...");
    const feeStructures = [
        { title: "Tuition Fee - Term 1", amount: 25000, academic_year: "2026", term: "Term 1", institution_id: instId },
        { title: "Library Fee", amount: 2000, academic_year: "2026", term: "Term 1", institution_id: instId },
        { title: "Activity Fee", amount: 3000, academic_year: "2026", term: "Term 1", institution_id: instId }
    ];
    await supabase.from("fee_structures").upsert(feeStructures, { onConflict: 'title,institution_id' });

    // 4. Seed Bursaries
    await supabase.from("bursaries").upsert([
        { title: "Excellence Scholarship", amount: 15000, description: "For top performing students", institution_id: instId, status: 'open' },
        { title: "Need-based Support", amount: 10000, description: "Financial aid for students in need", institution_id: instId, status: 'open' }
    ]);

    // 5. Seed Announcements
    console.log("📢 Seeding Communication...");
    await supabase.from("announcements").insert([
        { title: "Welcome to 2026 Academic Year", message: "We are excited to welcome all students back to Beta Partner Academy.", institution_id: instId },
        { title: "Science Fair Next Week", message: "Don't forget to prepare your projects for the annual Science Fair.", institution_id: instId }
    ]);

    // 6. Seed Timetable (Example for Form 1 Alpha)
    console.log("📅 Seeding Timetable...");
    const { data: cls } = await supabase.from("classes").select("id").eq("display_name", "Form 1 Alpha").single();
    if (cls) {
        const { data: sub } = await supabase.from("subjects").select("id").eq("class_id", cls.id).limit(1);
        if (sub && sub[0]) {
            await supabase.from("timetables").insert([
                { class_id: cls.id, subject_id: sub[0].id, day_of_week: 'Monday', start_time: '08:00', end_time: '09:00', room_number: 'Room 101', institution_id: instId },
                { class_id: cls.id, subject_id: sub[0].id, day_of_week: 'Wednesday', start_time: '10:00', end_time: '11:00', room_number: 'Lab A', institution_id: instId }
            ]);
        }
    }

    console.log("✅ LMS Presentation Seed Completed.");
}

seedLMSPresentation().catch(e => console.error("🔥 LMS Seeder crashed:", e));
