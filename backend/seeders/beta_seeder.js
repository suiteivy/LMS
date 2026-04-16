const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedBetaInstitution() {
    console.log("🚀 Starting Beta Seeding for Beta Partner Academy...");

    // 1. Create/Get Institution
    const { data: instCheck } = await supabase.from("institutions").select("id").eq("name", "Beta Partner Academy").single();
    let instId;
    if (instCheck) {
        instId = instCheck.id;
        console.log(`✅ Institution Found: ${instId}`);
    } else {
        const { data: inst, error: instErr } = await supabase
            .from("institutions")
            .insert([{ 
                name: "Beta Partner Academy", 
                location: "Tech District, Nairobi",
                phone: "+254 700 888 999",
                email: "contact@beta-academy.test",
                type: "secondary",
                subscription_plan: "beta",
                subscription_status: "active",
                addon_finance: true,
                addon_library: true,
                addon_attendance: true,
                addon_diary: true,
                addon_messaging: true,
                email_domain: "beta-academy.test"
            }])
            .select()
            .single();
        if (instErr) throw instErr;
        instId = inst.id;
        console.log(`✅ Institution Created: ${instId}`);
    }

    // Helper to create users
    const createBetaUser = async (email, password, fullName, role) => {
        try {
            const { data: uCheck } = await supabase.from("users").select("id").eq("email", email).single();
            if (uCheck) {
                // Ensure institution_id and status are correct
                await supabase.from("users").update({ institution_id: instId, status: 'approved' }).eq("id", uCheck.id);
                return uCheck.id;
            }

            const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true
            });

            if (authErr && !authErr.message.includes("already registered")) throw authErr;

            const uid = authData?.user?.id || (await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })).data.users.find(u => u.email === email)?.id;

            await supabase.from("users").upsert([{
                id: uid,
                email,
                full_name: fullName,
                role,
                institution_id: instId,
                status: 'approved'
            }]);
            return uid;
        } catch (e) {
            console.error(`❌ Error seeding user ${email}:`, e.message);
            return null;
        }
    };

    const password = "CloudoraBeta2026!";

    // 2. Administrators
    const adminId = await createBetaUser("admin@beta-academy.test", password, "Main Administrator", "admin");

    // 3. Teachers
    const teacherData = [
        { email: "teacher@beta-academy.test", name: "Sarah Lead", position: "headteacher", dept: "Administration" },
        { email: "teacher2@beta-academy.test", name: "Wilson Math", position: "deputy_headteacher", dept: "Mathematics" },
        { email: "teacher3@beta-academy.test", name: "Emma Science", position: "teacher", dept: "Science" }
    ];
    const teacherIdsByEmail = {};
    for (const t of teacherData) {
        const uid = await createBetaUser(t.email, password, t.name, "teacher");
        if (uid) {
            const { data: teacher } = await supabase.from("teachers").select("id").eq("user_id", uid).single();
            if (teacher) {
                teacherIdsByEmail[t.email] = teacher.id;
                await supabase.from("teachers").update({ 
                    department: t.dept,
                    position: t.position
                }).eq("id", teacher.id);
            }
        }
    }

    // 4. Classes (Using 'Form' as per credentials)
    const classData = [
        { name: "Form 1 Alpha", level: 1, stream: "Alpha", teacher: "teacher@beta-academy.test" },
        { name: "Form 2 Alpha", level: 2, stream: "Alpha", teacher: "teacher2@beta-academy.test" },
        { name: "Form 3 Alpha", level: 3, stream: "Alpha", teacher: "teacher3@beta-academy.test" }
    ];
    const classIdsByName = {};
    for (const c of classData) {
        const { data: check } = await supabase.from("classes").select("id").eq("institution_id", instId).eq("display_name", c.name).single();
        const t_id = teacherIdsByEmail[c.teacher];
        if (check) {
            classIdsByName[c.name] = check.id;
            await supabase.from("classes").update({ teacher_id: t_id }).eq("id", check.id);
        } else {
            const { data: cls } = await supabase.from("classes").insert({ 
                form_level: c.level, 
                stream: c.stream, 
                display_name: c.name, 
                institution_id: instId,
                teacher_id: t_id
            }).select().single();
            if (cls) classIdsByName[c.name] = cls.id;
        }
    }

    // 5. Subjects
    const subjectData = [
        { title: "Mathematics", class: "Form 1 Alpha", teacher: "teacher2@beta-academy.test", fee: 2000 },
        { title: "Physics", class: "Form 1 Alpha", teacher: "teacher3@beta-academy.test", fee: 1500 },
        { title: "Advanced Math", class: "Form 2 Alpha", teacher: "teacher2@beta-academy.test", fee: 2500 },
        { title: "Biology", class: "Form 2 Alpha", teacher: "teacher3@beta-academy.test", fee: 1800 }
    ];
    for (const s of subjectData) {
        const t_id = teacherIdsByEmail[s.teacher];
        const c_id = classIdsByName[s.class];
        
        const { data: check } = await supabase.from("subjects")
            .select("id")
            .eq("institution_id", instId)
            .eq("title", s.title)
            .eq("class_id", c_id)
            .maybeSingle();

        if (!check) {
            await supabase.from("subjects").insert([{
                title: s.title,
                institution_id: instId,
                class_id: c_id,
                teacher_id: t_id,
                fee_amount: s.fee
            }]);
        } else {
            await supabase.from("subjects").update({ teacher_id: t_id }).eq("id", check.id);
        }
    }

    // 6. Students
    const studentData = [
        { email: "student1@beta-academy.test", name: "Alpha Zulu", class: "Form 1 Alpha" },
        { email: "student2@beta-academy.test", name: "Omega Prime", class: "Form 1 Alpha" },
        { email: "stu3@beta-academy.test", name: "James Bond", class: "Form 2 Alpha" },
        { email: "stu4@beta-academy.test", name: "Peter Parker", class: "Form 2 Alpha" },
        { email: "stu5@beta-academy.test", name: "Bruce Wayne", class: "Form 3 Alpha" },
        { email: "stu6@beta-academy.test", name: "Diana Prince", class: "Form 3 Alpha" }
    ];

    for (const s of studentData) {
        const uid = await createBetaUser(s.email, password, s.name, "student");
        if (uid) {
            const { data: student } = await supabase.from("students").select("id").eq("user_id", uid).single();
            const c_id = classIdsByName[s.class];
            if (student && c_id) {
                // Enrollment in class
                await supabase.from("class_enrollments").upsert([{
                    student_id: student.id,
                    class_id: c_id,
                    institution_id: instId
                }], { onConflict: 'student_id,class_id' });
            }
        }
    }

    console.log("✅ Beta Seeding Completed Successfully.");
}

seedBetaInstitution().catch(e => console.error("🔥 Seeder crashed:", e));
