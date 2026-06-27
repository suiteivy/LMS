const supabase = require("../utils/supabaseClient.js");
const { buildClassLabel } = require('../utils/classLabel');
const { getStudentCurrentClassEnrollment } = require('../utils/studentClassEnrollment');
const { resolveActiveTerm } = require('../utils/resolveActiveTerm');

const normalizeText = (value) => {
    if (typeof value !== 'string') return '';
    return value.trim().toLowerCase();
};

const isAnnualTermSelection = (termName, termId) => {
    if (termId) return false;
    const normalized = normalizeText(termName);
    return !normalized || normalized === 'annual';
};

const isFeeStructureActiveForTerm = (feeStructure, activeTerm) => {
    if (!activeTerm) return false;

    const activeYearId = activeTerm.academic_year_id;
    const activeYearName = normalizeText(activeTerm.academic_years?.name);
    const requestedYearId = feeStructure?.academic_year_id;
    const requestedYearName = normalizeText(feeStructure?.academic_year);
    const hasYearSelection = !!requestedYearId || !!requestedYearName;

    const yearMatches =
        !hasYearSelection ||
        ((!!requestedYearId && !!activeYearId && requestedYearId === activeYearId) ||
            (!!requestedYearName && !!activeYearName && requestedYearName === activeYearName));

    if (!yearMatches) return false;

    if (isAnnualTermSelection(feeStructure?.term, feeStructure?.term_id)) {
        return true;
    }

    const requestedTermName = normalizeText(feeStructure?.term);
    const activeTermName = normalizeText(activeTerm?.name);

    return (
        (!!feeStructure?.term_id && feeStructure.term_id === activeTerm.id) ||
        (!!requestedTermName && !!activeTermName && requestedTermName === activeTermName)
    );
};

const isFeeStructureApplicableToStudent = (feeStructure, student) => {
    const scope = normalizeText(feeStructure?.level_scope) || 'all';
    const gradeLevel = Number(student?.grade_level);
    const formLevel = Number(student?.form_level);

    if (scope === 'all') return true;

    if (scope === 'grade') {
        const target = Number(feeStructure?.level_value);
        return Number.isFinite(target) && Number.isFinite(gradeLevel) && target === gradeLevel;
    }

    if (scope === 'form') {
        const target = Number(feeStructure?.level_value);
        return Number.isFinite(target) && Number.isFinite(formLevel) && target === formLevel;
    }

    if (scope === 'range') {
        const from = Number(feeStructure?.level_from);
        const to = Number(feeStructure?.level_to);
        const candidate = Number.isFinite(gradeLevel) ? gradeLevel : formLevel;
        return Number.isFinite(from) && Number.isFinite(to) && Number.isFinite(candidate) && candidate >= from && candidate <= to;
    }

    return true;
};

async function purgeExpiredAnnouncementsAndNotifications(institutionId) {
    const nowIso = new Date().toISOString();

    await supabase
        .from('announcements')
        .delete()
        .eq('institution_id', institutionId)
        .lt('expires_at', nowIso);

    await supabase
        .from('notifications')
        .delete()
        .eq('institution_id', institutionId)
        .lt('expires_at', nowIso);
}

/**
 * Get Authenticated Student's Finance Data
 */
exports.getMyFinance = async (req, res) => {
    try {
        const { userId } = req; // From authMiddleware

        // 1. Get student profile linked to this user
        const { data: student } = await supabase
            .from('students')
            .select('id, fee_balance, institution_id, grade_level, form_level')
            .eq('user_id', userId)
            .eq('institution_id', req.institution_id)
            .single();

        if (!student) return res.status(404).json({ error: "Student profile not found" });

        // 2. Get active, released fee structures for current term/year only
        const activeTerm = await resolveActiveTerm(student.institution_id);

        const { data: feeStructureRows } = await supabase
            .from('fee_structures')
            .select('*')
            .eq('institution_id', student.institution_id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        const feeStructures = (feeStructureRows || [])
            .filter((row) => isFeeStructureActiveForTerm(row, activeTerm))
            .filter((row) => isFeeStructureApplicableToStudent(row, student));

        const hasActiveReleasedStructures = feeStructures.length > 0;

        // 3. Get transactions
        const { data: transactions } = await supabase
            .from("financial_transactions")
            .select("*")
            .eq("user_id", userId)
            .eq("institution_id", req.institution_id)
            .order("date", { ascending: false });

        // Calculate paid and total
        const paidAmount = hasActiveReleasedStructures
            ? (transactions
                ?.filter(t => t.type === 'fee_payment' && t.status === 'completed')
                .reduce((sum, t) => sum + Number(t.amount), 0) || 0)
            : 0;

        const totalFees = hasActiveReleasedStructures
            ? (feeStructures || []).reduce((sum, fee) => sum + Number(fee.amount || 0), 0)
            : 0;

        const balance = hasActiveReleasedStructures
            ? Math.max(totalFees - paidAmount, 0)
            : 0;

        const pendingAmount = 0;
        const paidPercentage = totalFees > 0
            ? Math.min(100, Math.round((paidAmount / totalFees) * 100))
            : 0;

        res.json({
            balance,
            total_fees: totalFees,
            paid_amount: paidAmount,
            pending_amount: pendingAmount,
            paid_percentage: paidPercentage,
            fee_structures: feeStructures,
            transactions
        });
    } catch (err) {
        console.error("Get my finance error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get Authenticated Student's Timetable
 */
exports.getMyTimetable = async (req, res) => {
    try {
        const { userId, institution_id } = req;

        // 1. Get student's internal ID
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (studentError || !student) {
            return res.status(404).json({ error: "Student profile not found" });
        }

        // 2. Get student's class_id from enrollments
        const enrollment = await getStudentCurrentClassEnrollment(student.id, institution_id);

        if (!enrollment) {
            return res.status(404).json({ error: "Student not assigned to a class" });
        }

        // 3. Fetch timetable for that class
        const { data, error } = await supabase
            .from("timetables")
            .select(`
                id, day_of_week, start_time, end_time, room_number,
                subjects ( title, teacher_id, teachers(users(first_name, last_name, full_name)) )
            `)
            .eq("class_id", enrollment.class_id)
            .eq("institution_id", institution_id)
            .order("start_time", { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("Get my timetable error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get Announcements for authenticated student
 * Fetches announcements from subjects/classes the student is enrolled in
 */
exports.getMyAnnouncements = async (req, res) => {
    try {
        const { userId, institution_id } = req;

        await purgeExpiredAnnouncementsAndNotifications(institution_id);

        // 1. Get student profile
        const { data: student } = await supabase
            .from('students')
            .select('id, class_id')
            .eq('user_id', userId)
            .single();

        if (!student) return res.status(404).json({ error: "Student profile not found" });

        // 2. Get subject IDs from direct enrollments (only active enrollments)
        const { data: enrollments } = await supabase
            .from('enrollments')
            .select('subject_id')
            .eq('student_id', student.id)
            .eq('status', 'enrolled');

        const directSubjectIds = enrollments?.map(e => e.subject_id).filter(Boolean) || [];

        // 2b. Get subject IDs from class enrollment -> subjects.class_id
        const { data: classEnrollments } = await supabase
            .from('class_enrollments')
            .select('class_id')
            .eq('student_id', student.id);

        const classIds = classEnrollments?.map(e => e.class_id).filter(Boolean) || [];

        let classSubjectIds = [];
        if (classIds.length > 0) {
            const { data: subjectsByClass } = await supabase
                .from('subjects')
                .select('id')
                .in('class_id', classIds)
                .eq('institution_id', institution_id);
            classSubjectIds = subjectsByClass?.map(s => s.id).filter(Boolean) || [];
        }

        const subjectIds = [...new Set([...directSubjectIds, ...classSubjectIds])];

        // 3. Fetch announcements for those subjects or general announcements (subject_id is null)
        let query = supabase
            .from('announcements')
            .select(`
                id, title, description:message, created_at, updated_at,
                subjects ( id, title, teacher_id, teachers(users(first_name, last_name, full_name)) )
            `)
            .eq('institution_id', institution_id)
            .order('created_at', { ascending: false });

        if (subjectIds.length > 0) {
            query = query.or(`subject_id.is.null,subject_id.in.(${subjectIds.map(id => `"${id}"`).join(',')})`);
        } else {
            query = query.is('subject_id', null);
        }

        const { data, error } = await query;
        if (error) throw error;

        res.json(data || []);
    } catch (err) {
        console.error("Get my announcements error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * List all students in the institution (for teachers/admins)
 */
exports.listStudents = async (req, res) => {
    try {
        const { userId, userRole, institution_id } = req;

        let allowedStudentIds = null;

        if (userRole === 'teacher') {
            const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
            if (!teacher) return res.status(404).json({ error: "Teacher profile not found" });

            // A. Students in classes where this teacher is Class Teacher
            const { data: ctClasses } = await supabase
                .from('classes')
                .select('id')
                .eq('teacher_id', teacher.id);
            
            const ctClassIds = (ctClasses || []).map(c => c.id);
            let ctStudentIds = [];
            if (ctClassIds.length > 0) {
                const { data: ctEnrollments } = await supabase
                    .from('class_enrollments')
                    .select('student_id')
                    .in('class_id', ctClassIds)
                    .eq('status', 'enrolled');
                ctStudentIds = (ctEnrollments || []).map(e => e.student_id);
            }

            // B. Students enrolled in subjects where this teacher is primary or assistant
            const { data: primarySubjects } = await supabase
                .from('subjects')
                .select('id')
                .eq('teacher_id', teacher.id);
            const primarySubjectIds = (primarySubjects || []).map(s => s.id);

            const { data: assocSubjects } = await supabase
                .from('subject_teachers')
                .select('subject_id')
                .eq('teacher_id', teacher.id);
            const assocSubjectIds = (assocSubjects || []).map(s => s.subject_id);

            const subjectIds = [...new Set([...primarySubjectIds, ...assocSubjectIds])];

            let stStudentIds = [];
            if (subjectIds.length > 0) {
                const { data: stEnrollments } = await supabase
                    .from('enrollments')
                    .select('student_id')
                    .in('subject_id', subjectIds)
                    .eq('status', 'enrolled');
                stStudentIds = (stEnrollments || []).map(e => e.student_id);
            }

            allowedStudentIds = [...new Set([...ctStudentIds, ...stStudentIds])];
        }

        let query = supabase
            .from('students')
            .select(`
                id,
                grade_level,
                form_level,
                users (
                    first_name,
                    last_name,
                    full_name,
                    avatar_url
                )
            `)
            .eq('institution_id', institution_id);

        if (userRole === 'teacher') {
            if (allowedStudentIds && allowedStudentIds.length > 0) {
                query = query.in('id', allowedStudentIds);
            } else {
                return res.json([]);
            }
        }

        const { data, error } = await query.order('id');

        if (error) throw error;

        const students = data || [];
        const studentIds = students.map((s) => s.id).filter(Boolean);

        let classMap = new Map();
        if (studentIds.length > 0) {
            const { data: classRows, error: classRowsError } = await supabase
                .from('class_enrollments')
                .select('student_id, class_id, enrolled_at, class:classes(id, grade_level, form_level, stream)')
                .in('student_id', studentIds)
                .order('enrolled_at', { ascending: false });

            if (classRowsError) throw classRowsError;

            for (const row of classRows || []) {
                if (!classMap.has(row.student_id)) {
                    classMap.set(row.student_id, {
                        class_id: row.class_id,
                        class_name: buildClassLabel(row.class),
                    });
                }
            }
        }

        const enriched = students.map((student) => ({
            ...student,
            class_id: classMap.get(student.id)?.class_id || null,
            class_name: classMap.get(student.id)?.class_name || 'Unassigned',
        }));

        res.json(enriched);
    } catch (err) {
        console.error("List students error:", err);
        res.status(500).json({ error: err.message });
    }
};
