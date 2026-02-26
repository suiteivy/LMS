const supabase = require("../utils/supabaseClient");

/**
 * Get Authenticated Student's Finance Data
 */
exports.getMyFinance = async (req, res) => {
    try {
        const { userId } = req; // From authMiddleware

        // 1. Get student profile linked to this user
        const { data: student } = await supabase
            .from('students')
            .select('id, fee_balance')
            .eq('user_id', userId)
            .eq('institution_id', req.institution_id)
            .single();

        if (!student) return res.status(404).json({ error: "Student profile not found" });

        // 2. Get transactions
        const { data: transactions } = await supabase
            .from("financial_transactions")
            .select("*")
            .eq("user_id", userId)
            .eq("institution_id", req.institution_id)
            .order("date", { ascending: false });

        // Calculate paid and total
        const paidAmount = transactions
            ?.filter(t => t.type === 'fee_payment' && t.status === 'completed')
            .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        const totalFees = Number(student.fee_balance || 0) + paidAmount;

        res.json({
            balance: student.fee_balance,
            total_fees: totalFees,
            paid_amount: paidAmount,
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
        const { data: enrollment, error: enrollError } = await supabase
            .from('class_enrollments')
            .select('class_id')
            .eq('student_id', student.id)
            .maybeSingle();

        if (enrollError || !enrollment) {
            return res.status(404).json({ error: "Student not assigned to a class" });
        }

        // 3. Fetch timetable for that class
        const { data, error } = await supabase
            .from("timetables")
            .select(`
                id, day_of_week, start_time, end_time, room_number,
                subjects ( title, teacher_id, teachers(users(full_name)) )
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

        // 1. Get student profile
        const { data: student } = await supabase
            .from('students')
            .select('id, class_id')
            .eq('user_id', userId)
            .single();

        if (!student) return res.status(404).json({ error: "Student profile not found" });

        // 2. Get subject IDs from enrollments
        const { data: enrollments } = await supabase
            .from('enrollments')
            .select('subject_id')
            .eq('student_id', student.id);

        const subjectIds = enrollments?.map(e => e.subject_id).filter(Boolean) || [];

        // 3. Fetch announcements (resources of type 'announcement') for those subjects
        let query = supabase
            .from('resources')
            .select(`
                id, title, description, created_at, updated_at,
                subjects ( id, title, teacher_id, teachers(users(full_name)) )
            `)
            .eq('type', 'announcement')
            .eq('institution_id', institution_id)
            .order('created_at', { ascending: false });

        if (subjectIds.length > 0) {
            query = query.in('subject_id', subjectIds);
        } else {
            // No enrollments, return empty
            return res.json([]);
        }

        const { data, error } = await query;
        if (error) throw error;

        res.json(data || []);
    } catch (err) {
        console.error("Get my announcements error:", err);
        res.status(500).json({ error: err.message });
    }
};
