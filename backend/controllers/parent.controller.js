const supabase = require("../utils/supabaseClient");

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

        // 2. Get Students with grade_level from students table
        const { data: students, error } = await supabase
            .from("parent_students")
            .select("student:students(id, grade_level, users(full_name, avatar_url, email))")
            .eq("parent_id", parent.id);


        if (error) throw error;
        res.json(students.map(s => s.student));
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

        const {data: studentRecord} = await supabase
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

        res.json({ grades:grades || [], submissions:submissions || [] });
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

        // 1. Get student profile with balance
        const { data: student } = await supabase
            .from('students')
            .select('user_id, fee_balance')
            .eq('id', studentId)
            .single();

        if (!student) return res.status(404).json({ error: "Student not found" });

        // 2. Get transactions
        const { data: transactions } = await supabase
            .from("financial_transactions")
            .select("*")
            .eq("user_id", student.user_id)
            .order("date", { ascending: false });

        // Calculate paid and total (simplified)
        const paidAmount = transactions
            ?.filter(t => t.type === 'fee_payment' && t.status === 'completed')
            .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        // total = paid + balance
        const totalFees = Number(student.fee_balance || 0) + paidAmount;

        // Add direction field for frontend display
        const enrichedTransactions = (transactions || []).map(t => ({
            ...t,
            direction: (t.type === 'fee_payment' && t.status === 'completed') ? 'inflow' : 'outflow'
        }));

        res.json({
            balance: student.fee_balance,
            total_fees: totalFees,
            paid_amount: paidAmount,
            transactions: enrichedTransactions
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
