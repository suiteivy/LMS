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
            .single();

        if (!student) return res.status(404).json({ error: "Student profile not found" });

        // 2. Get transactions
        const { data: transactions } = await supabase
            .from("financial_transactions")
            .select("*")
            .eq("user_id", userId)
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

        // 1. Get student's class_id
        const { data: student } = await supabase
            .from('students')
            .select('class_id')
            .eq('user_id', userId)
            .single();

        if (!student || !student.class_id) {
            return res.status(404).json({ error: "Student not assigned to a class" });
        }

        // 2. Fetch timetable for that class
        // Reusing the logic/query structure from timetable.controller.js for consistency
        const { data, error } = await supabase
            .from("timetables")
            .select(`
                id, day_of_week, start_time, end_time, room_number,
                subjects ( title, teacher_id, teachers(users(full_name)) )
            `)
            .eq("class_id", student.class_id)
            .eq("institution_id", institution_id)
            .order("start_time", { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("Get my timetable error:", err);
        res.status(500).json({ error: err.message });
    }
};
