// controllers/attendance.controller.js
const supabase = require("../utils/supabaseClient.js");
const { createNotificationInternal } = require("./notification.controller.js");
const { authorizeTeacherForSubject } = require("../middleware/resolveTeacher.js");
const { recomputeDailyHoursForInstitutionDate } = require('../services/dailyHours.service.js');
const { parsePagination, paginatedResponse } = require("../utils/pagination.js");

const isMissingColumnError = (error, columnName) => {
    if (!error) return false;
    const code = String(error.code || "");
    const message = String(error.message || "").toLowerCase();
    const normalizedColumn = String(columnName || "").toLowerCase();
    return code === '42703' && message.includes(normalizedColumn);
};

const fetchSubjectClassLinkSource = async (subjectId, institutionId) => {
    const { data: subjectWithMetadata, error: subjectWithMetadataError } = await supabase
        .from('subjects')
        .select('class_id, metadata')
        .eq('id', subjectId)
        .eq('institution_id', institutionId)
        .single();

    if (!subjectWithMetadataError) {
        return subjectWithMetadata;
    }

    // Backward compatibility: some deployments do not have subjects.metadata yet.
    if (subjectWithMetadataError.code !== '42703') {
        throw subjectWithMetadataError;
    }

    const { data: fallbackSubject, error: fallbackSubjectError } = await supabase
        .from('subjects')
        .select('class_id')
        .eq('id', subjectId)
        .eq('institution_id', institutionId)
        .single();

    if (fallbackSubjectError) {
        throw fallbackSubjectError;
    }

    return { class_id: fallbackSubject?.class_id || null, metadata: null };
};

const getSubjectLinkedClassIds = async (subjectId, institutionId) => {
    const classIds = new Set();

    const subjectRow = await fetchSubjectClassLinkSource(subjectId, institutionId);

    if (subjectRow?.class_id) classIds.add(subjectRow.class_id);
    if (Array.isArray(subjectRow?.metadata?.class_ids)) {
        subjectRow.metadata.class_ids.filter(Boolean).forEach((id) => classIds.add(id));
    }

    let linkRows = [];
    const { data: scopedLinkRows, error: linkErr } = await supabase
        .from('subject_classes')
        .select('class_id')
        .eq('subject_id', subjectId)
        .eq('institution_id', institutionId);

    if (!linkErr) {
        linkRows = scopedLinkRows || [];
    } else if (linkErr.code === '42P01') {
        linkRows = [];
    } else if (linkErr.code === '42703') {
        const { data: fallbackLinkRows, error: fallbackLinkErr } = await supabase
            .from('subject_classes')
            .select('class_id')
            .eq('subject_id', subjectId);

        if (fallbackLinkErr && fallbackLinkErr.code !== '42P01') throw fallbackLinkErr;
        linkRows = fallbackLinkRows || [];
    } else {
        throw linkErr;
    }

    (linkRows || []).forEach((row) => {
        if (row.class_id) classIds.add(row.class_id);
    });

    const candidateClassIds = Array.from(classIds);
    if (candidateClassIds.length === 0) return [];

    const { data: scopedClasses, error: scopedClassesError } = await supabase
        .from('classes')
        .select('id')
        .eq('institution_id', institutionId)
        .in('id', candidateClassIds);

    if (scopedClassesError) throw scopedClassesError;

    return (scopedClasses || []).map((row) => String(row.id));
};

/**
 * Get Student Attendance for a class/subject on a date
 */

async function checkAttendanceDeadlineLock(institutionId, dateStr, userRole) {
    if (userRole === 'admin' || userRole === 'master_admin') {
        return { isLocked: false }; // Admin is explicitly exempt per specifications
    }

    try {
        const { data: terms, error } = await supabase
            .from('terms')
            .select('id, name, end_date, attendance_deadline, locked_at')
            .eq('institution_id', institutionId)
            .lte('start_date', dateStr)
            .gte('end_date', dateStr);

        if (error || !terms || terms.length === 0) {
            return { isLocked: false };
        }

        const term = terms[0];
        if (term.locked_at) {
            return { isLocked: true, reason: `Attendance is locked for ${term.name}.` };
        }

        if (term.attendance_deadline) {
            let deadlineDate;
            if (term.attendance_deadline.includes('-')) {
                deadlineDate = new Date(term.attendance_deadline);
            } else {
                deadlineDate = new Date(`${term.end_date}T${term.attendance_deadline}:00`);
            }
            if (!isNaN(deadlineDate.getTime()) && new Date() > deadlineDate) {
                return { 
                    isLocked: true, 
                    reason: `Attendance updates for ${term.name} locked on ${deadlineDate.toLocaleString()}. Contact Admin for exemptions.` 
                };
            }
        }
    } catch (e) {
        console.error('[checkAttendanceDeadlineLock] error:', e);
    }
    return { isLocked: false };
}

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

        // 1. Get student IDs enrolled directly to this subject (via enrollments).
        // Avoid deep relational select here for compatibility with deployments where
        // PostgREST relation metadata may not resolve consistently.
        let directEnrollmentRows;
        {
            let directQuery = supabase
                .from('enrollments')
                .select('student_id')
                .eq('subject_id', subject_id)
                .eq('status', 'enrolled')
                .eq('institution_id', institution_id);

            let directResult = await directQuery;
            if (directResult.error && isMissingColumnError(directResult.error, 'institution_id')) {
                // Legacy schema fallback. Final student rows are still institution-scoped below.
                directResult = await supabase
                    .from('enrollments')
                    .select('student_id')
                    .eq('subject_id', subject_id)
                    .eq('status', 'enrolled');
            }

            if (directResult.error) throw directResult.error;
            directEnrollmentRows = directResult.data || [];
        }

        // Also get students enrolled via class_enrollments (class → subject links)
        let classEnrolledStudents = [];
        const linkedClassIds = await getSubjectLinkedClassIds(subject_id, institution_id);
        const normalizedLinkedClassIds = linkedClassIds.map((id) => String(id));
        if (_class_id && !normalizedLinkedClassIds.includes(String(_class_id))) {
            return res.status(400).json({ error: "Class is not linked to this subject" });
        }
        const classIdsToCheck = _class_id ? [String(_class_id)] : normalizedLinkedClassIds;

        if (classIdsToCheck.length > 0) {
            let classEnrollResult = await supabase
                .from('class_enrollments')
                .select('student_id')
                .eq('institution_id', institution_id)
                .in('class_id', classIdsToCheck);

            if (classEnrollResult.error && isMissingColumnError(classEnrollResult.error, 'institution_id')) {
                // Legacy schema fallback. Final student rows are still institution-scoped below.
                classEnrollResult = await supabase
                    .from('class_enrollments')
                    .select('student_id')
                    .in('class_id', classIdsToCheck);
            }

            if (classEnrollResult.error) throw classEnrollResult.error;
            classEnrolledStudents = (classEnrollResult.data || []).map((e) => e.student_id);
        }

        // Merge student IDs from both enrollment sources
        const enrollmentStudentIds = new Set(
            (directEnrollmentRows || []).map((row) => row.student_id).filter(Boolean)
        );
        (classEnrolledStudents || []).forEach((id) => {
            if (id) enrollmentStudentIds.add(id);
        });

        // 1b. Resolve student profile rows for the merged student set.
        let allStudents = [];
        const mergedStudentIds = Array.from(enrollmentStudentIds);
        if (mergedStudentIds.length > 0) {
            const { data: studentRows, error: studentError } = await supabase
                .from('students')
                .select('id, users!inner(first_name, last_name, full_name, avatar_url)')
                .eq('institution_id', institution_id)
                .in('id', mergedStudentIds);

            if (studentError) throw studentError;
            allStudents = studentRows || [];
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
        const attendanceByStudentId = new Map((attendance || []).map((record) => [record.student_id, record]));
        const result = allStudents.map(s => {
            const record = attendanceByStudentId.get(s.id);
            return {
                student_id: s.id,
                student_display_id: s.id,
                name: s.users.full_name,
                first_name: s.users.first_name,
                last_name: s.users.last_name,
                avatar_url: s.users.avatar_url,
                status: record ? record.status : "pending",
                actual_start_time: record?.actual_start_time || null,
                actual_end_time: record?.actual_end_time || null,
                id: record ? record.id : null,
                notes: record ? record.notes : ""
            };
        });

        const { page, limit, from, to } = parsePagination(req.query, { defaultLimit: 50 });
        const pagedResult = result.slice(from, to + 1);
        res.json(paginatedResponse(pagedResult, result.length, page, limit));
    } catch (err) {
        console.error("[Attendance] getStudentAttendance error:", {
            message: err?.message,
            code: err?.code,
            details: err?.details,
            hint: err?.hint,
            stack: err?.stack,
        });
        res.status(500).json({ error: err.message });
    }
};

/**
 * Mark Student Attendance
 */

/**
 * Mark Student Attendance (with deadline lock & actual class times)
 */
exports.markStudentAttendance = async (req, res) => {
    try {
        const { student_id, subject_id, class_id, date, status, notes, actual_start_time, actual_end_time } = req.body;
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

        // 1. Enforce admin-set attendance deadline lock (Admin exempt)
        const lockStatus = await checkAttendanceDeadlineLock(institution_id, markDate, userRole);
        if (lockStatus.isLocked) {
            return res.status(403).json({ error: lockStatus.reason });
        }

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

        // Upsert with actual class times
        const upsertPayload = {
            student_id,
            subject_id,
            class_id: targetClassId,
            date: markDate,
            status,
            notes,
            institution_id
        };

        if (actual_start_time) upsertPayload.actual_start_time = actual_start_time;
        if (actual_end_time) upsertPayload.actual_end_time = actual_end_time;

        const { data, error } = await supabase
            .from("attendance")
            .upsert(upsertPayload, { onConflict: "student_id, subject_id, date" })
            .select();

        if (error) throw error;

        // Real-time Notification for Parents on Absence
        if (status === 'absent') {
            const [{ data: student }, { data: parentRelations }] = await Promise.all([
                supabase
                    .from('students')
                    .select('users(full_name)')
                    .eq('id', student_id)
                    .eq('institution_id', institution_id)
                    .single(),
                supabase
                    .from('parent_students')
                    .select('parent_id, parents(user_id)')
                    .eq('student_id', student_id)
                    .eq('institution_id', institution_id),
            ]);

            if (parentRelations && parentRelations.length > 0) {
                const studentName = student?.users?.full_name || 'Your child';
                await Promise.all(
                    parentRelations
                        .filter(r => r.parents?.user_id)
                        .map(relation =>
                            createNotificationInternal({
                                userId: relation.parents.user_id,
                                title: 'Attendance Alert',
                                message: `${studentName} was marked ABSENT today (${markDate}).`,
                                type: 'warning',
                                data: { student_id, date: markDate, type: 'attendance_absence' }
                            })
                        )
                );
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
 * Bulk Mark Student Attendance
 */
exports.bulkMarkStudentAttendance = async (req, res) => {
    try {
        const { subject_id, class_id, date, records, actual_start_time, actual_end_time } = req.body;
        const { userId, userRole, institution_id } = req;

        if (userRole === 'teacher') {
            const result = await authorizeTeacherForSubject(userId, subject_id, res);
            if (!result) return;
        } else if (!['admin', 'bursary'].includes(userRole)) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        if (!subject_id || !Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ error: "subject_id and non-empty records required" });
        }

        const markDate = date || new Date().toISOString().split('T')[0];

        // Check deadline lock
        const lockStatus = await checkAttendanceDeadlineLock(institution_id, markDate, userRole);
        if (lockStatus.isLocked) {
            return res.status(403).json({ error: lockStatus.reason });
        }

        let targetClassId = class_id;
        if (!targetClassId) {
            const linkedClassIds = await getSubjectLinkedClassIds(subject_id, institution_id);
            targetClassId = linkedClassIds[0] || null;
        }

        const upsertRows = records.map(r => ({
            student_id: r.student_id,
            subject_id,
            class_id: targetClassId,
            date: markDate,
            status: r.status || 'present',
            notes: r.notes || null,
            actual_start_time: actual_start_time || null,
            actual_end_time: actual_end_time || null,
            institution_id
        }));

        const { data, error } = await supabase
            .from("attendance")
            .upsert(upsertRows, { onConflict: "student_id, subject_id, date" })
            .select();

        if (error) throw error;

        // Recompute daily hours
        try {
            const studentIds = records.map(r => r.student_id);
            await recomputeDailyHoursForInstitutionDate({
                institution_id,
                date: markDate,
                student_ids: studentIds,
            });
        } catch (hoursError) {
            console.error('[Attendance] daily hours recompute failed:', hoursError?.message || hoursError);
        }

        res.json({ message: "Attendance saved successfully", count: data?.length || 0, data });
    } catch (err) {
        console.error("bulkMarkStudentAttendance error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Teacher Presence Self Check-in (Synced to Admin side in real time)
 */
exports.selfMarkTeacherPresence = async (req, res) => {
    try {
        const { date, status = 'present', notes } = req.body;
        const { userId, userRole, institution_id } = req;

        if (userRole !== 'teacher') {
            return res.status(403).json({ error: "Only teachers can mark self presence" });
        }

        const { data: teacher, error: tErr } = await supabase
            .from('teachers')
            .select('id')
            .eq('user_id', userId)
            .eq('institution_id', institution_id)
            .single();

        if (tErr || !teacher) {
            return res.status(404).json({ error: "Teacher profile not found" });
        }

        const markDate = date || new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from("teacher_attendance")
            .upsert({
                teacher_id: teacher.id,
                date: markDate,
                status,
                notes: notes || "Teacher presence self check-in",
                institution_id
            }, { onConflict: "teacher_id, date" })
            .select();

        if (error) throw error;

        try {
            await recomputeDailyHoursForInstitutionDate({
                institution_id,
                date: markDate,
                teacher_ids: [teacher.id],
            });
        } catch (hoursError) {
            console.error('[Attendance] teacher daily hours recompute failed:', hoursError?.message || hoursError);
        }

        res.json({ message: "Presence marked successfully", attendance: data[0] });
    } catch (err) {
        console.error("selfMarkTeacherPresence error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Attendance Retention & Purge Policy (Prunes daily records older than 2 years)
 */
exports.cleanupOldAttendanceRecords = async (req, res) => {
    try {
        const { userRole, institution_id } = req;
        if (userRole !== 'admin' && userRole !== 'master_admin') {
            return res.status(403).json({ error: "Admin only" });
        }

        const cutoffDate = new Date();
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 2);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];

        const { data: sData, error: sErr } = await supabase
            .from('attendance')
            .delete()
            .eq('institution_id', institution_id)
            .lt('date', cutoffStr)
            .select('id');

        if (sErr) throw sErr;

        const { data: tData, error: tErr } = await supabase
            .from('teacher_attendance')
            .delete()
            .eq('institution_id', institution_id)
            .lt('date', cutoffStr)
            .select('id');

        if (tErr) throw tErr;

        res.json({
            message: `Retention cleanup complete. Daily records older than 2 years removed.`,
            student_records_purged: sData?.length || 0,
            teacher_records_purged: tData?.length || 0,
            cutoff_date: cutoffStr
        });
    } catch (err) {
        console.error("cleanupOldAttendanceRecords error:", err);
        res.status(500).json({ error: err.message });
    }
};


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

        const { page, limit, from, to } = parsePagination(req.query, { defaultLimit: 50 });
        const pagedResult = result.slice(from, to + 1);
        res.json(paginatedResponse(pagedResult, result.length, page, limit));
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
