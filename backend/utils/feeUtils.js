const supabase = require('../utils/supabaseClient');

async function hasPaidAtLeastHalf(studentId, subjectId) {
  // Get subject fee
  const { data: subject, error: subjectError } = await supabase
    .from('subjects')
    .select('fee_amount')
    .eq('id', subjectId)
    .single();

  if (subjectError) throw subjectError;

  // Get student's user_id from students table
  const { data: student, error: stuError } = await supabase
    .from('students')
    .select('user_id')
    .eq('id', studentId)
    .single();

  if (stuError || !student) throw new Error("Student profile not found for fee check");

  // Sum payments from financial_transactions
  const { data: transactions, error: feeError } = await supabase
    .from('financial_transactions')
    .select('amount')
    .eq('user_id', student.user_id)
    .eq('type', 'fee_payment')
    .eq('direction', 'inflow');

  if (feeError) throw feeError;

  const totalPaid = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const threshold = (subject.fee_amount || 0) * 0.5;

  return totalPaid >= threshold;
}

module.exports = { hasPaidAtLeastHalf };
