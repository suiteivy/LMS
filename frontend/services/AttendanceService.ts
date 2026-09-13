import { supabase } from "@/libs/supabase";

export interface AttendanceRecord {
    id?: string;
    student_id: string;
    class_id: string;
    subject_id?: string;
    date: string;
    status: "present" | "absent" | "late" | "excused";
    notes?: string;
}

export const AttendanceService = {
    async getStudentAttendance(studentId: string) {
        const { data, error } = await supabase
            .from("attendance")
            .select(`
                *,
                subject:subjects(title)
            `)
            .eq("student_id", studentId)
            .order("date", { ascending: false });

        if (error) throw error;
        return data;
    },

    async markAttendance(records: AttendanceRecord[]) {
        const { data, error } = await supabase
            .from("attendance")
            .upsert(records as any, { onConflict: "student_id,subject_id,date" })
            .select();

        if (error) throw error;
        return data;
    },

    async getClassAttendanceHistory(classId: string) {
        const { data, error } = await supabase
            .from("attendance")
            .select(`
                date,
                status,
                student:students(
                    id,
                    user:users(full_name, avatar_url)
                )
            `)
            .eq("class_id", classId)
            .order("date", { ascending: false });

        if (error) throw error;
        return data;
    },

    async getTeacherAttendance(date: string, institutionId: string) {
        if (!institutionId) throw new Error("institutionId is required for security");
        const { data, error } = await supabase
            .from("teacher_attendance")
            .select(`
                *,
                teacher:teachers(
                    id,
                    user:users(full_name, avatar_url)
                )
            `)
            .eq("date", date)
            .eq("institution_id", institutionId);

        if (error) throw error;
        return data;
    },

    async getInstitutionAttendanceStats(date: string, institutionId: string) {
        if (!institutionId) throw new Error("institutionId is required for security");
        const { data, error } = await supabase
            .from("attendance")
            .select(`
                id,
                student_id,
                class_id,
                status,
                class:classes(id, display_name, name, grade_level, cbc_band)
            `)
            .eq("date", date)
            .eq("institution_id", institutionId);

        if (error) throw error;
        return data;
    },

    async getClassStudentsWithAttendance(classId: string, date: string, institutionId: string) {
        if (!institutionId || !classId) return [];

        // 1. Fetch all students in the class
        const { data: students, error: studentError } = await supabase
            .from("students")
            .select(`
                id,
                class_id,
                user:users(id, full_name, email, avatar_url)
            `)
            .eq("class_id", classId)
            .eq("institution_id", institutionId);

        if (studentError) throw studentError;

        // 2. Fetch existing attendance records for this class & date
        const { data: records, error: attError } = await supabase
            .from("attendance")
            .select("id, student_id, status, notes")
            .eq("class_id", classId)
            .eq("date", date)
            .eq("institution_id", institutionId);

        if (attError) throw attError;

        const recordMap = new Map((records || []).map((r) => [r.student_id, r]));

        return (students || []).map((s: any) => {
            const att = recordMap.get(s.id);
            return {
                student_id: s.id,
                name: s.user?.full_name || "Unknown Student",
                email: s.user?.email || "",
                avatar_url: s.user?.avatar_url || null,
                status: (att?.status || "unmarked") as "present" | "absent" | "late" | "excused" | "unmarked",
                attendance_id: att?.id || null,
                notes: att?.notes || "",
            };
        });
    },

    async adminMarkStudentAttendance(payload: {
        student_id: string;
        class_id: string;
        date: string;
        status: "present" | "absent" | "late" | "excused";
        institution_id: string;
        notes?: string;
    }) {
        const { data: existing } = await supabase
            .from("attendance")
            .select("id")
            .eq("student_id", payload.student_id)
            .eq("class_id", payload.class_id)
            .eq("date", payload.date)
            .maybeSingle();

        if (existing?.id) {
            const { data, error } = await supabase
                .from("attendance")
                .update({
                    status: payload.status,
                    notes: payload.notes || null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", existing.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase
                .from("attendance")
                .insert([{
                    student_id: payload.student_id,
                    class_id: payload.class_id,
                    date: payload.date,
                    status: payload.status,
                    notes: payload.notes || null,
                    institution_id: payload.institution_id,
                }])
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    async adminBulkMarkAttendance(payload: {
        class_id: string;
        date: string;
        institution_id: string;
        records: { student_id: string; status: "present" | "absent" | "late" | "excused"; notes?: string }[];
    }) {
        const promises = payload.records.map((r) =>
            this.adminMarkStudentAttendance({
                student_id: r.student_id,
                class_id: payload.class_id,
                date: payload.date,
                status: r.status,
                institution_id: payload.institution_id,
                notes: r.notes,
            })
        );
        return Promise.all(promises);
    }
};
