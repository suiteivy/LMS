const supabase = require("../utils/supabaseClient");

// POST /fees/payment
exports.recordFeePayment = async (req, res) => {
  try {
    const { amount, course_id } = req.body;
    const studentId = req.user.id;

    if (!amount || !course_id) {
      return res.status(400).json({ error: "Missing amount or course_id" });
    }

    const { error } = await supabase
      .from("fees")
      .insert([{ student_id: studentId, amount_paid: amount, course_id }]);

    if (error) throw error;
    res.json({ message: "Payment recorded successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /fees/:studentId
exports.getStudentFeeStatus = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (req.userRole === "student" && req.user.id !== studentId) {
      return res
        .status(403)
        .json({ error: "Cannot view another student’s fees" });
    }

    const { data, error } = await supabase
      .from("fees")
      .select("*")
      .eq("student_id", studentId);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /teacher/earnings/:teacherId
exports.getTeacherEarnings = async (req, res) => {
  try {
    const { teacherId } = req.params;

    if (req.userRole === "teacher" && req.user.id !== teacherId) {
      return res
        .status(403)
        .json({ error: "Cannot view another teacher’s earnings" });
    }

    const { data, error } = await supabase
      .from("teacher_payments")
      .select("*")
      .eq("teacher_id", teacherId);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /teacher/pay
exports.recordTeacherPayment = async (req, res) => {
  try {
    const { teacher_id, amount } = req.body;

    const { error } = await supabase
      .from("teacher_payments")
      .insert([{ teacher_id, amount_paid: amount }]);

    if (error) throw error;
    res.json({ message: "Teacher payment recorded successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
