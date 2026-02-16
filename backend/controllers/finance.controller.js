// controllers/finance.controller.js
const supabase = require("../utils/supabaseClient");

/**
 * Create a new Fund
 */
exports.createFund = async (req, res) => {
    try {
        const { userRole, institution_id } = req;
        if (userRole !== "admin") return res.status(403).json({ error: "Admin only" });

        const { name, description, total_amount } = req.body;
        if (!name) return res.status(400).json({ error: "Fund name is required" });

        const { data, error } = await supabase
            .from("funds")
            .insert([{ name, description, total_amount: total_amount || 0, institution_id }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error("Create fund error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * List all funds
 */
exports.getFunds = async (req, res) => {
    try {
        const { institution_id } = req;
        const { data, error } = await supabase
            .from("funds")
            .select("*")
            .eq("institution_id", institution_id)
            .order("created_at", { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("Get funds error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Create an Allocation from a Fund
 */
exports.createAllocation = async (req, res) => {
    try {
        const { userRole, institution_id } = req;
        if (userRole !== "admin") return res.status(403).json({ error: "Admin only" });

        const { fund_id, title, description, amount, category, status } = req.body;
        if (!fund_id || !title || !amount) {
            return res.status(400).json({ error: "fund_id, title, and amount are required" });
        }

        // 1. Check fund balance (logic check)
        const { data: fund } = await supabase.from('funds').select('total_amount, allocated_amount').eq('id', fund_id).single();
        if (!fund) return res.status(404).json({ error: "Fund not found" });

        // Simple check: current allocated + new amount <= total? 
        // Or is 'allocated_amount' a stored sum? 
        // We should allow over-allocation with a warning, or block it. 
        // For now, let's just insert. We can add a trigger to update 'allocated_amount' in funds table.
        // Ideally, we sum up allocations to show 'used'.

        const { data, error } = await supabase
            .from("fund_allocations")
            .insert([{
                fund_id,
                title,
                description,
                amount,
                category,
                status: status || 'planned'
            }])
            .select()
            .single();

        if (error) throw error;

        // Manually update parent fund allocated amount
        // (Concurrency issue potential, but acceptable for this scale)
        const newAllocated = Number(fund.allocated_amount || 0) + Number(amount);
        await supabase.from('funds').update({ allocated_amount: newAllocated }).eq('id', fund_id);

        res.status(201).json(data);
    } catch (err) {
        console.error("Create allocation error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * List allocations for a fund
 */
exports.getAllocations = async (req, res) => {
    try {
        const { fund_id } = req.params;
        const { data, error } = await supabase
            .from("fund_allocations")
            .select("*")
            .eq("fund_id", fund_id)
            .order("allocation_date", { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("Get allocations error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get Financial Transactions (Unified)
 */
exports.getTransactions = async (req, res) => {
    try {
        const { institution_id, userRole, userId } = req;
        const { type, distinct_user_id } = req.query; // optional filters

        let query = supabase
            .from("financial_transactions")
            .select("*, users(full_name, avatar_url, role, students(id), teachers(id))")
            .eq("institution_id", institution_id)
            .order("date", { ascending: false });

        if (userRole !== "admin") {
            // Non-admins can only see their own transactions
            query = query.eq("user_id", userId);
        } else if (distinct_user_id) {
            // Admin filtering by specific user
            query = query.eq("user_id", distinct_user_id);
        }

        if (type) {
            query = query.eq("type", type);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("Get transactions error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Process Transaction (e.g. payout)
 */
exports.processTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const { userRole, institution_id } = req;

        if (userRole !== 'admin') return res.status(403).json({ error: "Admin only" });

        const { data, error } = await supabase
            .from("financial_transactions")
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("institution_id", institution_id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("Process transaction error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Record a generic transaction (Admin)
 */
exports.createTransaction = async (req, res) => {
    try {
        const { institution_id, userRole } = req;
        if (userRole !== "admin") return res.status(403).json({ error: "Admin only" });

        const { user_id, type, direction, amount, date, method, status, reference_id, meta } = req.body;

        const { data, error } = await supabase
            .from("financial_transactions")
            .insert([{
                institution_id,
                user_id,
                type,
                direction,
                amount,
                date: date || new Date(),
                method,
                status: status || 'completed',
                reference_id,
                meta
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error("Create transaction error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Record Fee Payment (Specific helper)
 */
exports.recordFeePayment = async (req, res) => {
    try {
        const { institution_id, userRole } = req;
        // Admin records payment, OR student initiates generic payment? 
        // Usually admin/bursar records it.
        if (userRole !== "admin") return res.status(403).json({ error: "Admin only" });

        const { student_id, amount, method, reference_number, notes } = req.body;

        // Verify student exists and get user_id
        const { data: student } = await supabase.from('students').select('user_id').eq('id', student_id).single();
        if (!student) return res.status(404).json({ error: "Student not found" });

        const { data, error } = await supabase
            .from("financial_transactions")
            .insert([{
                institution_id,
                user_id: student.user_id,
                type: 'fee_payment',
                direction: 'inflow',
                amount,
                method,
                meta: { notes, reference_number }
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get Fee Structures (Mapped from Subjects)
 */
exports.getFeeStructures = async (req, res) => {
    try {
        const { institution_id } = req;
        const { data: subjects, error } = await supabase
            .from("subjects")
            .select("id, title, fee_amount, fee_config")
            .eq("institution_id", institution_id);

        if (error) throw error;

        // Map to FeeStructure interface
        const structures = subjects.map(sub => ({
            id: sub.id, // Use subject ID as structure ID
            Subject_id: sub.id,
            Subject_name: sub.title,
            base_fee: Number(sub.fee_amount || 0),
            registration_fee: sub.fee_config?.registration_fee || 0,
            material_fee: sub.fee_config?.material_fee || 0,
            teacher_rate: sub.fee_config?.teacher_rate || 0,
            bursary_percentage: sub.fee_config?.bursary_percentage || 0,
            effective_date: sub.fee_config?.effective_date || new Date().toISOString(),
            is_active: true // default
        }));

        res.json(structures);
    } catch (err) {
        console.error("Get fee structures error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update Fee Structure (Updates Subject)
 */
exports.updateFeeStructure = async (req, res) => {
    try {
        const { userRole, institution_id } = req;
        if (userRole !== 'admin') return res.status(403).json({ error: "Admin only" });

        const { id, base_fee, registration_fee, material_fee, teacher_rate, bursary_percentage, effective_date } = req.body;
        // id is structure ID (which is subject ID)

        // Update fee_amount and fee_config
        const updatePayload = {
            fee_amount: Number(base_fee),
            fee_config: {
                registration_fee,
                material_fee,
                teacher_rate,
                bursary_percentage,
                effective_date
            }
        };

        const { data, error } = await supabase
            .from("subjects")
            .update(updatePayload)
            .eq("id", id)
            .eq("institution_id", institution_id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("Update fee structure error:", err);
        res.status(500).json({ error: err.message });
    }
};
