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
            .upsert(records, { onConflict: "student_id,class_id,date" })
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

    async getTeacherAttendance(date: string) {
        const { data, error } = await supabase
            .from("teacher_attendance")
            .select(`
                *,
                teacher:teachers(
                    id,
                    user:users(full_name, avatar_url)
                )
            `)
            .eq("date", date);

        if (error) throw error;
        return data;
    },

    async getInstitutionAttendanceStats(date: string) {
        const { data, error } = await supabase
            .from("attendance")
            .select(`
                status,
                class:classes(name, grade_level, form_level)
            `)
            .eq("date", date);

        if (error) throw error;
        return data;
    }
};
