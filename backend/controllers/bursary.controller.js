const supabase = require('../utils/supabaseClient');

// POST /fees/payment
async function recordFeePayment(req, res) {
  try {
    const { amount } = req.body;
    const studentId = req.user.id;

    const { error } = await supabase
      .from('fees')
      .insert([{ student_id: studentId, amount_paid: amount }]);

    if (error) throw error;
    res.json({ message: 'Payment recorded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /fees/:studentId
async function getStudentFeeStatus(req, res) {
  try {
    const { studentId } = req.params;

    // Students can only view their own fee status unless admin
    if (req.userRole === 'student' && req.user.id !== studentId) {
      return res.status(403).json({ error: 'Cannot view another student’s fees' });
    }

    const { data, error } = await supabase
      .from('fees')
      .select('*')
      .eq('student_id', studentId);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /teacher/earnings/:teacherId
async function getTeacherEarnings(req, res) {
  try {
    const { teacherId } = req.params;

    // Teachers can only view their own earnings
    if (req.userRole === 'teacher' && req.user.id !== teacherId) {
      return res.status(403).json({ error: 'Cannot view another teacher’s earnings' });
    }

    const { data, error } = await supabase
      .from('teacher_payments')
      .select('*')
      .eq('teacher_id', teacherId);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /teacher/pay
async function recordTeacherPayment(req, res) {
  try {
    const { teacher_id, amount } = req.body;

    const { error } = await supabase
      .from('teacher_payments')
      .insert([{ teacher_id, amount_paid: amount }]);

    if (error) throw error;
    res.json({ message: 'Teacher payment recorded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  recordFeePayment,
  getStudentFeeStatus,
  getTeacherEarnings,
  recordTeacherPayment
};
