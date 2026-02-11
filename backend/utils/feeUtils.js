const supabase = require('../utils/supabaseClient');

async function hasPaidAtLeastHalf(studentId, subjectId) {
  // Get subject fee
  const { data: subject, error: subjectError } = await supabase
    .from('subjects')
    .select('fee_amount')
    .eq('id', subjectId)
    .single();

  if (subjectError) throw subjectError;

  // Sum student's payments
  const { data: payments, error: feeError } = await supabase
    .from('fees')
    .select('amount_paid')
    .eq('student_id', studentId);

  if (feeError) throw feeError;

  const totalPaid = payments.reduce((sum, fee) => sum + fee.amount_paid, 0);
  const threshold = subject.fee_amount * 0.5;

  return totalPaid >= threshold;
}

module.exports = { hasPaidAtLeastHalf };
