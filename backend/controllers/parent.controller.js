const supabase = require("../utils/supabaseClient.js");
const { buildClassLabel } = require('../utils/classLabel');
const { resolveActiveTerm } = require('../utils/resolveActiveTerm');
const { getStudentCurrentClassEnrollment } = require('../utils/studentClassEnrollment');

const normalizeText = (value) => {
    if (typeof value !== 'string') return '';
    return value.trim().toLowerCase();
};

const isAnnualTermSelection = (termName) => {
    const normalized = normalizeText(termName);
    return !normalized || normalized === 'annual';
};

const isFeeStructureActiveForTerm = (feeStructure, activeTerm) => {
    if (!activeTerm) return false;

    const requestedYearName = normalizeText(feeStructure?.academic_year);
    const activeYearName = normalizeText(activeTerm?.academic_years?.name);
    const yearMatches = !requestedYearName || (activeYearName && requestedYearName === activeYearName);
    if (!yearMatches) return false;

    if (isAnnualTermSelection(feeStructure?.term)) {
        return true;
    }

    const requestedTermName = normalizeText(feeStructure?.term);
    const activeTermName = normalizeText(activeTerm?.name);
    return !!requestedTermName && !!activeTermName && requestedTermName === activeTermName;
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
        const studentLevel = Number.isFinite(gradeLevel) ? gradeLevel : formLevel;
        return Number.isFinite(from) && Number.isFinite(to) && Number.isFinite(studentLevel) && studentLevel >= from && studentLevel <= to;
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
 * Helper to verify Parent-Student relationship
 */
async function verifyParentStudentLink(userId, studentId) {
    // 1. Get Parent ID from userId
    const { data: parent } = await supabase.from('parents').select('id').eq('user_id', userId).single();
    if (!parent) return { error: "Parent profile not found", status: 404 };

    // 2. Check if student is linked
    const { data: link, error } = await supabase
        .from("parent_students")
        .select("id")
        .eq("parent_id", parent.id)
        .eq("student_id", studentId)
        .maybeSingle();

    if (error || !link) {
        return { error: "Access denied: Student not linked to this parent", status: 403 };
    }

    return { parentId: parent.id, authorized: true };
}

/**
 * Get Students linked to this Parent
 */
exports.getLinkedStudents = async (req, res) => {
    try {
        const { userId } = req;

        // 1. Get Parent ID
        const { data: parent } = await supabase.from('parents').select('id').eq('user_id', userId).single();
        if (!parent) return res.status(404).json({ error: "Parent profile not found" });

        // 2. Get Students with class info
        const { data: students, error } = await supabase
            .from("parent_students")
            .select(`
                student:students(
                    id, 
                    grade_level, 
                    form_level,
                    institution_id,
                    users(first_name, last_name, full_name, avatar_url, email)
                )
            `)
            .eq("parent_id", parent.id);

        if (error) throw error;

        const enrichedStudents = await Promise.all((students || []).map(async (s) => {
            const student = s.student;
            const enrollment = await getStudentCurrentClassEnrollment(student?.id, student?.institution_id || null);

            let classData = null;
            if (enrollment?.class_id) {
                const { data: klass } = await supabase
                    .from('classes')
                    .select('id, grade_level, form_level, stream')
                    .eq('id', enrollment.class_id)
                    .maybeSingle();
                classData = klass;
            }

            return {
                ...student,
                class_id: classData?.id || null,
                class_name: buildClassLabel(classData) || 'Unassigned',
            };
        }));

        res.json(enrichedStudents);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get Academic Data for a Student (Parent View)
 */
exports.getStudentAcademicData = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { userId } = req;

        const auth = await verifyParentStudentLink(userId, studentId);
        if (auth.error) return res.status(auth.status).json({ error: auth.error });

        const { data: studentRecord } = await supabase
            .from('students')
            .select('user_id')
            .eq('id', studentId)
            .single();

        if (!studentRecord) return res.status(404).json({ error: "Student not found" });

        const studentUUID = studentRecord.user_id;
        // Fetch Grades
        const { data: grades } = await supabase
            .from("grades")
            .select("*, subject:subjects(title)")
            .eq("student_id", studentUUID);

        // Fetch recent assignment submissions
        const { data: submissions } = await supabase
            .from("submissions")
            .select("*, assignment:assignments(title, subject:subjects(title))")
            .eq("student_id", studentId)
            .order("submitted_at", { ascending: false });

        res.json({ grades: grades || [], submissions: submissions || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get Attendance for a Student (Parent View)
 */
exports.getStudentAttendance = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { userId } = req;

        const auth = await verifyParentStudentLink(userId, studentId);
        if (auth.error) return res.status(auth.status).json({ error: auth.error });

        const { data, error } = await supabase
            .from("attendance")
            .select("*, subject:subjects(title)")
            .eq("student_id", studentId)
            .order("date", { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get Finance Data for a Student (Parent View)
 */
exports.getStudentFinance = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { userId } = req;

        const auth = await verifyParentStudentLink(userId, studentId);
        if (auth.error) return res.status(auth.status).json({ error: auth.error });

        // 1. Get student profile
        const { data: student } = await supabase
            .from('students')
            .select('id, user_id, institution_id, fee_balance, grade_level, form_level')
            .eq('id', studentId)
            .single();

        if (!student) return res.status(404).json({ error: "Student not found" });

        // 2. Get fee structures and resolve active/applicable rows using the same active-term strategy as admin finance
        const activeTerm = await resolveActiveTerm(student.institution_id);

        const { data: feeStructureRows } = await supabase
            .from('fee_structures')
            .select('*')
            .eq('institution_id', student.institution_id)
            .order('created_at', { ascending: false });

        const feeStructures = (feeStructureRows || [])
            .filter((row) => !!row.is_active)
            .filter((row) => isFeeStructureActiveForTerm(row, activeTerm))
            .filter((row) => isFeeStructureApplicableToStudent(row, student))
            .map((row) => ({ ...row, is_active: true }));

        const hasActiveReleasedStructures = feeStructures.length > 0;
        const totalFees = hasActiveReleasedStructures
            ? (feeStructures || []).reduce((sum, fee) => sum + Number(fee.amount || 0), 0)
            : 0;

        // 3. Get payment history from payments table
        const { data: paymentRows } = await supabase
            .from('payments')
            .select("*")
            .eq('student_id', studentId)
            .order('payment_date', { ascending: false });

        const paidAmount = hasActiveReleasedStructures
            ? (paymentRows || [])
                .filter((p) => p.status === 'completed')
                .reduce((sum, p) => sum + Number(p.amount || 0), 0)
            : 0;

        const pendingAmount = hasActiveReleasedStructures
            ? (paymentRows || [])
                .filter((p) => p.status === 'pending')
                .reduce((sum, p) => sum + Number(p.amount || 0), 0)
            : 0;

        // Prefer derived balance from active fee structures; fallback to stored student fee balance when no structures exist
        const derivedBalance = Math.max(totalFees - paidAmount, 0);
        const balance = hasActiveReleasedStructures ? derivedBalance : 0;

        const enrichedTransactions = (paymentRows || []).map((p) => ({
            id: p.id,
            type: p.payment_method || 'payment',
            description: p.reference_number || 'Fee payment',
            date: p.payment_date || p.created_at,
            amount: Number(p.amount || 0),
            status: p.status,
            reference_number: p.reference_number,
            direction: p.status === 'completed' ? 'inflow' : 'outflow',
        }));

        const paidPercentage = totalFees > 0
            ? Math.min(100, Math.round((paidAmount / totalFees) * 100))
            : 0;

        res.json({
            balance,
            total_fees: totalFees,
            paid_amount: paidAmount,
            pending_amount: pendingAmount,
            paid_percentage: paidPercentage,
            fee_structures: feeStructures || [],
            transactions: enrichedTransactions,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/** Get approved bursaries for a specific student (Parent) */
exports.getStudentBursaries = async (req, res) => {
    try {
        const { userId, institution_id } = req;
        const { studentId } = req.params;

        // Verify parent-student relationship
        const link = await verifyParentStudentLink(userId, studentId);
        if (!link.authorized) {
            return res.status(link.status).json({ error: link.error });
        }

        const { data, error } = await supabase
            .from("bursary_applications")
            .select(`
                id, status, applied_at,
                bursary:bursaries (
                    id, title, description, amount, deadline, status
                )
            `)
            .eq("student_id", studentId)
            .eq("institution_id", institution_id)
            .eq("status", "approved")
            .order("applied_at", { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get announcements for a linked student (Parent View)
 */
exports.getStudentAnnouncements = async (req, res) => {
    try {
        const { userId, institution_id } = req;
        const { studentId } = req.params;

        const auth = await verifyParentStudentLink(userId, studentId);
        if (auth.error) return res.status(auth.status).json({ error: auth.error });

        await purgeExpiredAnnouncementsAndNotifications(institution_id);

        const { data: enrollments } = await supabase
            .from('enrollments')
            .select('subject_id')
            .eq('student_id', studentId)
            .eq('status', 'enrolled');

        const directSubjectIds = enrollments?.map(e => e.subject_id).filter(Boolean) || [];

        const { data: classEnrollments } = await supabase
            .from('class_enrollments')
            .select('class_id')
            .eq('student_id', studentId);

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
        console.error("Get student announcements (parent) error:", err);
        res.status(500).json({ error: err.message });
    }
};


/**
 * Update a linked student's profile (Parent or Admin)
 */
exports.updateLinkedStudentProfile = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { userId } = req;

        // Verify parent-student link
        const auth = await verifyParentStudentLink(userId, studentId);
        if (auth.error) return res.status(auth.status).json({ error: auth.error });

        const { first_name, last_name, gender, date_of_birth, address, phone } = req.body;

        // Get student's user_id from the students table
        const { data: student, error: fetchErr } = await supabase
            .from('students')
            .select('user_id')
            .eq('id', studentId)
            .single();

        if (fetchErr || !student) {
            return res.status(404).json({ error: "Student record not found" });
        }

        // Build update payload - only include fields that were sent
        const updates = {};
        if (first_name !== undefined) updates.first_name = first_name.trim();
        if (last_name !== undefined) updates.last_name = last_name.trim();
        if (gender !== undefined) updates.gender = gender;
        if (date_of_birth !== undefined) updates.date_of_birth = date_of_birth;
        if (address !== undefined) updates.address = address;
        if (phone !== undefined) updates.phone = phone;

        // Compute full_name if name parts are provided
        if (updates.first_name || updates.last_name) {
            const fn = updates.first_name || '';
            const ln = updates.last_name || '';
            updates.full_name = (fn + ' ' + ln).trim();
        }

        updates.updated_at = new Date().toISOString();

        const { error: updateErr } = await supabase
            .from('users')
            .update(updates)
            .eq('id', student.user_id);

        if (updateErr) throw updateErr;

        res.json({ message: "Student profile updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
