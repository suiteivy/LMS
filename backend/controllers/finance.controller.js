const supabase = require("../utils/supabaseClient");

/** Student: Get fee status */
exports.getStudentFees = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { institution_id } = req;

        const { data, error } = await supabase
            .from("payments")
            .select("*")
            .eq("student_id", studentId)
            .eq("institution_id", institution_id)
            .order("payment_date", { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/** Admin: Record student payment */
exports.recordPayment = async (req, res) => {
    try {
        const { student_id, amount, payment_method, reference_number, notes } = req.body;
        const { institution_id } = req;

        if (req.userRole !== "admin") {
            return res.status(403).json({ error: "Only admins can record payments" });
        }

        const { data, error } = await supabase.from("payments").insert([
            {
                student_id,
                amount,
                payment_method,
                reference_number,
                notes,
                institution_id,
                status: 'completed',
                payment_date: new Date().toISOString()
            },
        ]).select().single();

        if (error) throw error;
        res.status(201).json({ message: "Payment recorded successfully", payment: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/** Teacher: Get earnings/payouts */
exports.getTeacherPayouts = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const { institution_id } = req;

        const { data, error } = await supabase
            .from("teacher_payouts")
            .select("*")
            .eq("teacher_id", teacherId)
            .eq("institution_id", institution_id)
            .order("period_start", { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/** Admin: Process teacher payout */
exports.processPayout = async (req, res) => {
    try {
        const { payoutId } = req.params;
        const { institution_id } = req;

        if (req.userRole !== "admin") {
            return res.status(403).json({ error: "Only admins can process payouts" });
        }

        const { data, error } = await supabase
            .from("teacher_payouts")
            .update({
                status: 'paid',
                payment_date: new Date().toISOString()
            })
            .eq("id", payoutId)
            .eq("institution_id", institution_id)
            .select()
            .single();

        if (error) throw error;
        res.json({ message: "Payout processed successfully", payout: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/** Manage Fee Structures */
exports.getFeeStructures = async (req, res) => {
    try {
        const { institution_id } = req;
        const { data, error } = await supabase
            .from("fee_structures")
            .select("*")
            .eq("institution_id", institution_id)
            .order("created_at", { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateFeeStructure = async (req, res) => {
    try {
        const { id, level, term, amount, description } = req.body;
        const { institution_id } = req;

        if (req.userRole !== "admin") {
            return res.status(403).json({ error: "Admin only" });
        }

        let result;
        if (id) {
            result = await supabase
                .from("fee_structures")
                .update({ level, term, amount, description })
                .eq("id", id)
                .eq("institution_id", institution_id)
                .select()
                .single();
        } else {
            result = await supabase
                .from("fee_structures")
                .insert([{ level, term, amount, description, institution_id }])
                .select()
                .single();
        }

        if (result.error) throw result.error;
        res.json({ message: "Fee structure updated", data: result.data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
