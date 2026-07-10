// controllers/attendance.controller.js
const supabase = require("../utils/supabaseClient.js");
const { createNotificationInternal } = require("./notification.controller.js");
const { authorizeTeacherForSubject } = require("../middleware/resolveTeacher.js");
const { recomputeDailyHoursForInstitutionDate } = require('../services/dailyHours.service.js');

const getSubjectLinkedClassIds = async (subjectId, institutionId) => {
    const classIds = new Set();

    const { data: subjectRow, error: subjectErr } = await supabase
        .from('subjects')
        .select('class_id, metadata')
        .eq('id', subjectId)
        .eq('institution_id', institutionId)
        .single();

    if (subjectErr) throw subjectErr;

    if (subjectRow?.class_id) classIds.add(subjectRow.class_id);
    if (Array.isArray(subjectRow?.metadata?.class_ids)) {
        subjectRow.metadata.class_ids.filter(Boolean).forEach((id) => classIds.add(id));
    }

    const { data: linkRows, error: linkErr } = await supabase
        .from('subject_classes')
        .select('class_id')
        .eq('subject_id', subjectId)
        .eq('institution_id', institutionId);

    if (linkErr && linkErr.code !== '42P01') throw linkErr;

    (linkRows || []).forEach((row) => {
        if (row.class_id) classIds.add(row.class_id);
    });

    return Array.from(classIds);
};

/**
 * Get Student Attendance for a class/subject on a date
 */
exports.getStudentAttendance = async (req, res) => {
    try {
        const { date, subject_id, class_id: _class_id } = req.query;
        const { userId, userRole, institution_id } = req;
        
        if (!date || !subject_id) return res.status(400).json({ error: "Date and Subject ID required" });

        // Authorization: If teacher, verify they teach this subject
        if (userRole === 'teacher') {
            const result = await authorizeTeacherForSubject(userId, subject_id, res);
            if (!result) return;
        } else if (!['admin', 'bursary'].includes(userRole)) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        // 1. Get all students enrolled in this subject (via enrollments)
        const { data: enrollments, error: eError } = await supabase
            .from("students")
            .select("id, users!inner(first_name, last_name, full_name, avatar_url), enrollments!inner(subject_id)")
            .eq("institution_id", institution_id)
            .eq("enrollments.subject_id", subject_id);

        if (eError) throw eError;

        // Also get students enrolled via class_enrollments (class → subject links)
        let classEnrolledStudents = [];
        const linkedClassIds = await getSubjectLinkedClassIds(subject_id, institution_id);
        if (_class_id && !linkedClassIds.includes(String(_class_id))) {
            return res.status(400).json({ error: "Class is not linked to this subject" });
        }
        const classIdsToCheck = _class_id ? [String(_class_id)] : linkedClassIds;

        if (classIdsToCheck.length > 0) {
            const { data: classEnrolls } = await supabase
                .from('class_enrollments')
                .select('student_id')
                .eq('institution_id', institution_id)
                .in('class_id', classIdsToCheck);
            classEnrolledStudents = (classEnrolls || []).map(e => e.student_id);
        }

        // Merge student IDs from both enrollment sources
        const enrollmentStudentIds = new Set((enrollments || []).map(s => s.id));
        (classEnrolledStudents || []).forEach(id => enrollmentStudentIds.add(id));

        // Fetch student details for class-enrolled students not already in enrollments
        let allStudents = [...(enrollments || [])];
        const newIds = [...enrollmentStudentIds].filter(id => !allStudents.find(s => s.id === id));
        if (newIds.length > 0) {
            const { data: extraStudents } = await supabase
                .from('students')
                .select('id, users!inner(first_name, last_name, full_name, avatar_url)')
                .in('id', newIds);
            if (extraStudents) allStudents = [...allStudents, ...extraStudents];
        }

        // 2. Get attendance records for date and subject
        const { data: attendance, error: aError } = await supabase
            .from("attendance")
            .select("*")
            .eq("date", date)
            .eq("subject_id", subject_id)
            .eq("institution_id", institution_id);

        if (aError) throw aError;

        // Merge logic — use unified student list
        const result = allStudents.map(s => {
            const record = attendance?.find(a => a.student_id === s.id);
            return {
                student_id: s.id,
                student_display_id: s.id,
                name: s.users.full_name,
                first_name: s.users.first_name,
                last_name: s.users.last_name,
                avatar_url: s.users.avatar_url,
                status: record ? record.status : "pending",
                id: record ? record.id : null,
                notes: record ? record.notes : ""
            };
        });

        res.json(result);
    } catch (err) {
        console.error("[Attendance] getStudentAttendance error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Mark Student Attendance
 */
exports.markStudentAttendance = async (req, res) => {
    try {
        const { student_id, subject_id, class_id, date, status, notes } = req.body;
        const { userId, userRole, institution_id } = req;

        if (userRole === 'teacher') {
            const result = await authorizeTeacherForSubject(userId, subject_id, res);
            if (!result) return;
        } else if (!['admin', 'bursary'].includes(userRole)) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        if (!student_id || !subject_id || !status) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const markDate = date || new Date().toISOString().split('T')[0];

        const { data: studentRow, error: studentErr } = await supabase
            .from('students')
            .select('id')
            .eq('id', student_id)
            .eq('institution_id', institution_id)
            .single();
        if (studentErr || !studentRow) {
            return res.status(400).json({ error: 'Invalid student for institution' });
        }

        const { data: subjectRow, error: subjectErr } = await supabase
            .from('subjects')
            .select('id')
            .eq('id', subject_id)
            .eq('institution_id', institution_id)
            .single();
        if (subjectErr || !subjectRow) {
            return res.status(400).json({ error: 'Invalid subject for institution' });
        }

        const linkedClassIds = await getSubjectLinkedClassIds(subject_id, institution_id);
        const enrollmentChecks = [
            supabase
                .from('enrollments')
                .select('id')
                .eq('student_id', student_id)
                .eq('subject_id', subject_id)
                .eq('institution_id', institution_id)
                .eq('status', 'enrolled')
                .maybeSingle(),
        ];

        if (linkedClassIds.length > 0) {
            enrollmentChecks.push(
                supabase
                    .from('class_enrollments')
                    .select('id')
                    .eq('student_id', student_id)
                    .eq('institution_id', institution_id)
                    .in('class_id', linkedClassIds)
                    .maybeSingle()
            );
        }

        const enrollmentResults = await Promise.all(enrollmentChecks);
        const hasValidEnrollment = enrollmentResults.some((result) => !!result.data);
        if (!hasValidEnrollment) {
            return res.status(403).json({ error: 'Student is not enrolled for this subject' });
        }

        let targetClassId = class_id;
        if (!targetClassId) {
            const linkedClassIds = await getSubjectLinkedClassIds(subject_id, institution_id);
            targetClassId = linkedClassIds[0] || null;
        }

        // Upsert
        const { data, error } = await supabase
            .from("attendance")
            .upsert({
                student_id,
                subject_id,
                class_id: targetClassId,
                date: markDate,
                status,
                notes,
                institution_id
            }, { onConflict: "student_id, subject_id, date" })
            .select();

        if (error) throw error;

        // Real-time Notification for Parents on Absence
        if (status === 'absent') {
            // Find student's name
            const { data: student } = await supabase
                .from('students')
                .select('users(full_name)')
                .eq('id', student_id)
                .eq('institution_id', institution_id)
                .single();

            // Find all parents linked to this student
            const { data: parentRelations } = await supabase
                .from('parent_students')
                .select('parent_id, parents(user_id)')
                .eq('student_id', student_id)
                .eq('institution_id', institution_id);

            if (parentRelations && parentRelations.length > 0) {
                const studentName = student?.users?.full_name || 'Your child';
                for (const relation of parentRelations) {
                    if (relation.parents && relation.parents.user_id) {
                        await createNotificationInternal({
                            userId: relation.parents.user_id,
                            title: 'Attendance Alert',
                            message: `${studentName} was marked ABSENT today (${markDate}).`,
                            type: 'warning',
                            data: { student_id, date: markDate, type: 'attendance_absence' }
                        });
                    }
                }
            }
        }

        try {
            await recomputeDailyHoursForInstitutionDate({
                institution_id,
                date: markDate,
                student_ids: [student_id],
            });
        } catch (hoursError) {
            console.error('[Attendance] student daily hours recompute failed:', hoursError?.message || hoursError);
        }

        res.json(data[0]);
    } catch (err) {
        console.error("[Attendance] markStudentAttendance error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get Teacher Attendance for a date
 */
exports.getTeacherAttendance = async (req, res) => {
    try {
        const { date } = req.query;
        const { userRole, institution_id } = req;

        if (userRole !== 'admin') {
            return res.status(403).json({ error: "Unauthorized" });
        }

        if (!date) return res.status(400).json({ error: "Date required" });

        const weekday = new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' });

        // 1. Resolve teachers scheduled for this weekday only.
        //    Teachers with no timetable-linked subject must not appear.
        const { data: timetableRows, error: ttError } = await supabase
            .from("timetables")
            .select("subject_id")
            .eq("institution_id", institution_id)
            .eq("day_of_week", weekday);

        if (ttError && ttError.code !== "42P01") {
            throw ttError;
        }

        let teachers = [];
        const hasTimetableRows = !ttError && (timetableRows || []).length > 0;

        if (hasTimetableRows) {
            const subjectIds = Array.from(new Set((timetableRows || []).map((r) => r.subject_id).filter(Boolean)));

            const { data: subjects, error: subjectsError } = await supabase
                .from("subjects")
                .select("id, teacher_id")
                .in("id", subjectIds)
                .eq("institution_id", institution_id);
            if (subjectsError) throw subjectsError;

            const { data: subjectTeachers, error: stError } = await supabase
                .from("subject_teachers")
                .select("subject_id, teacher_id")
                .in("subject_id", subjectIds)
                .eq("institution_id", institution_id);
            if (stError && stError.code !== "42P01") throw stError;

            const teacherIds = new Set();
            (subjects || []).forEach((s) => { if (s.teacher_id) teacherIds.add(s.teacher_id); });
            (subjectTeachers || []).forEach((st) => { if (st.teacher_id) teacherIds.add(st.teacher_id); });

            const teacherIdList = Array.from(teacherIds);
            if (teacherIdList.length > 0) {
                const { data: scheduledTeachers, error: tError } = await supabase
                    .from("teachers")
                    .select("id, users!inner(first_name, last_name, full_name, avatar_url)")
                    .eq("institution_id", institution_id)
                    .in("id", teacherIdList);
                if (tError) throw tError;
                teachers = scheduledTeachers || [];
            }
        }

        // No fallback to all teachers by design.
        // If no timetable rows exist for the weekday, return an empty attendance list.

        // 2. Get attendance records for date
        const { data: attendance, error: aError } = await supabase
            .from("teacher_attendance")
            .select("*")
            .eq("date", date)
            .eq("institution_id", institution_id);

        if (aError) throw aError;

        // Merge logic
        const result = teachers.map(t => {
            const record = attendance?.find(a => a.teacher_id === t.id);
            return {
                teacher_id: t.id,
                name: t.users.full_name,
                first_name: t.users.first_name,
                last_name: t.users.last_name,
                avatar_url: t.users.avatar_url,
                status: record ? record.status : "pending",
                id: record ? record.id : null,
                notes: record ? record.notes : ""
            };
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.markTeacherAttendance = async (req, res) => {
    try {
        const { teacher_id, date, status, notes } = req.body;
        const { institution_id, userRole } = req;

        if (userRole !== 'admin') {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { data: teacherRow, error: teacherErr } = await supabase
            .from('teachers')
            .select('id')
            .eq('id', teacher_id)
            .eq('institution_id', institution_id)
            .single();

        if (teacherErr || !teacherRow) {
            return res.status(400).json({ error: 'Invalid teacher for institution' });
        }

        const markDate = date || new Date().toISOString().split('T')[0];

        // Upsert
        const { data, error } = await supabase
            .from("teacher_attendance")
            .upsert({ teacher_id, date: markDate, status, notes, institution_id }, { onConflict: "teacher_id, date" })
            .select();

        if (error) throw error;

        try {
            await recomputeDailyHoursForInstitutionDate({
                institution_id,
                date: markDate,
                teacher_ids: [teacher_id],
            });
        } catch (hoursError) {
            console.error('[Attendance] teacher daily hours recompute failed:', hoursError?.message || hoursError);
        }

        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
