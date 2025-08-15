const supabase = require('../utils/supabaseClient');

async function hasPaidAtLeastHalf(studentId, courseId) {
  // Get course fee
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('fee_amount') 
    .eq('id', courseId)
    .single();

  if (courseError) throw courseError;

  // Sum student's payments
  const { data: payments, error: feeError } = await supabase
    .from('fees')
    .select('amount_paid')
    .eq('student_id', studentId);

  if (feeError) throw feeError;

  const totalPaid = payments.reduce((sum, fee) => sum + fee.amount_paid, 0);
  const threshold = course.fee_amount * 0.5;

  return totalPaid >= threshold;
}

module.exports = { hasPaidAtLeastHalf };
