const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runAudit() {
    console.log("🔍 Starting Comprehensive Teacher assignment & Role Audit...\n");

    const { data: institutions, error: instErr } = await supabase.from("institutions").select("id, name");
    if (instErr) throw instErr;

    for (const inst of institutions) {
        console.log(`--- Institution: ${inst.name} (${inst.id}) ---`);

        // 1. Audit Teachers and Roles
        const { data: teachers, error: tErr } = await supabase
            .from("teachers")
            .select(`
                id, position, department,
                user:users(full_name, email)
            `)
            .eq("institution_id", inst.id);
        
        if (tErr) console.error("Error fetching teachers:", tErr);
        console.log(`✅ Total Teachers: ${teachers?.length || 0}`);
        
        const rolesCount = {};
        (teachers || []).forEach(t => {
            rolesCount[t.position] = (rolesCount[t.position] || 0) + 1;
        });
        console.log("📊 Role Distribution:", rolesCount);

        // 2. Audit Class Teachers
        const { data: classes, error: cErr } = await supabase
            .from("classes")
            .select("id, display_name, teacher_id")
            .eq("institution_id", inst.id);
        
        if (cErr) console.error("Error fetching classes:", cErr);
        const classesWithoutTeacher = (classes || []).filter(c => !c.teacher_id);
        console.log(`✅ Total Classes: ${classes?.length || 0}`);
        if (classesWithoutTeacher.length > 0) {
            console.log(`ℹ️ Classes without an assigned Class Teacher: ${classesWithoutTeacher.map(c => c.display_name).join(", ")}`);
        } else {
            console.log("✨ All classes have a Class Teacher assigned.");
        }

        // 3. Audit Subject Assignments
        const { data: subjects, error: sErr } = await supabase
            .from("subjects")
            .select("id, title, teacher_id, class_id, classes(display_name)")
            .eq("institution_id", inst.id);
        
        if (sErr) console.error("Error fetching subjects:", sErr);
        const subjectsWithoutTeacher = (subjects || []).filter(s => !s.teacher_id);
        console.log(`✅ Total Subjects: ${subjects?.length || 0}`);
        if (subjectsWithoutTeacher.length > 0) {
            console.log(`⚠️ Subjects WITHOUT Teacher: ${subjectsWithoutTeacher.map(s => `${s.title} (${s.classes?.display_name || 'No Class'})`).join(", ")}`);
        } else {
            console.log("✨ All subjects have a Teacher assigned.");
        }

        // 4. Verify linkages
        // (Check if assigned teacher_id actually belongs to the same institution)
        const invalidAssignments = (subjects || []).filter(s => {
            if (!s.teacher_id) return false;
            const teacher = teachers.find(t => t.id === s.teacher_id);
            return !teacher;
        });
        if (invalidAssignments.length > 0) {
            console.log(`❌ INVALID Linkages found: ${invalidAssignments.length} subjects have teachers from different institutions or deleted records.`);
        }

        console.log("\n");
    }

    console.log("🏁 Audit Completed.");
}

runAudit().catch(e => console.error("Audit failed:", e));
