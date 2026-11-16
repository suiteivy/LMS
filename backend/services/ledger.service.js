// backend/services/ledger.service.js
const supabase = require('../utils/supabaseClient.js');

class LedgerService {
  /**
   * Record a charge entry on the student ledger.
   */
  static async recordCharge({
    institutionId,
    studentId,
    feeTypeId,
    billId,
    billItemId,
    amount,
    description,
    recordedBy
  }) {
    const numAmount = Math.abs(Number(amount) || 0);
    if (numAmount <= 0) return null;

    const { data: latestEntry } = await supabase
      .from('ledger_entries')
      .select('running_balance')
      .eq('institution_id', institutionId)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousBalance = Number(latestEntry?.running_balance) || 0;
    const newBalance = previousBalance + numAmount;

    const { data, error } = await supabase
      .from('ledger_entries')
      .insert([{
        institution_id: institutionId,
        student_id: studentId,
        entry_type: 'charge',
        amount: numAmount,
        running_balance: newBalance,
        fee_type_id: feeTypeId || null,
        bill_id: billId || null,
        bill_item_id: billItemId || null,
        description: description || 'Fee charge',
        recorded_by: recordedBy || null,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Record a payment allocation entry on the student ledger.
   */
  static async recordPaymentAllocation({
    institutionId,
    studentId,
    paymentId,
    allocationId,
    receiptId,
    amount,
    referenceNumber,
    description,
    recordedBy
  }) {
    const numAmount = Math.abs(Number(amount) || 0);
    if (numAmount <= 0) return null;

    const { data: latestEntry } = await supabase
      .from('ledger_entries')
      .select('running_balance')
      .eq('institution_id', institutionId)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousBalance = Number(latestEntry?.running_balance) || 0;
    const newBalance = previousBalance - numAmount;

    const { data, error } = await supabase
      .from('ledger_entries')
      .insert([{
        institution_id: institutionId,
        student_id: studentId,
        entry_type: 'payment',
        amount: -numAmount,
        running_balance: newBalance,
        payment_id: paymentId,
        allocation_id: allocationId || null,
        receipt_id: receiptId || null,
        reference_number: referenceNumber || null,
        description: description || 'Payment received',
        recorded_by: recordedBy || null,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Record a reversal entry on the student ledger (undoes a confirmed payment).
   */
  static async recordReversal({
    institutionId,
    studentId,
    paymentId,
    receiptId,
    amount,
    reason,
    authorizedBy
  }) {
    const numAmount = Math.abs(Number(amount) || 0);
    if (numAmount <= 0) return null;

    const { data: latestEntry } = await supabase
      .from('ledger_entries')
      .select('running_balance')
      .eq('institution_id', institutionId)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousBalance = Number(latestEntry?.running_balance) || 0;
    const newBalance = previousBalance + numAmount;

    const { data, error } = await supabase
      .from('ledger_entries')
      .insert([{
        institution_id: institutionId,
        student_id: studentId,
        entry_type: 'reversal',
        amount: numAmount,
        running_balance: newBalance,
        payment_id: paymentId,
        receipt_id: receiptId || null,
        description: `Payment reversed: ${reason || 'Correction'}`,
        recorded_by: authorizedBy || null,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get student financial summary computed strictly from the ledger and allocations.
   */
  static async getStudentSummary(studentId, institutionId) {
    const { data, error } = await supabase.rpc('get_student_finance_summary', {
      p_student_id: String(studentId),
      p_institution_id: institutionId
    });

    if (error) {
      console.error('[LedgerService] get_student_finance_summary RPC error:', error);
      // Fallback query directly from tables
      const { data: entries } = await supabase
        .from('ledger_entries')
        .select('entry_type, amount')
        .eq('student_id', studentId)
        .eq('institution_id', institutionId);

      let total_billed = 0;
      let total_paid = 0;

      (entries || []).forEach(e => {
        const val = Number(e.amount) || 0;
        if (e.entry_type === 'charge' || (e.entry_type === 'reversal' && val > 0)) {
          total_billed += val;
        } else if (e.entry_type === 'payment' || val < 0) {
          total_paid += Math.abs(val);
        }
      });

      const balance_due = Math.max(0, total_billed - total_paid);
      return {
        student_id: studentId,
        total_billed,
        total_paid,
        pending_amount: 0,
        flagged_amount: 0,
        credit_amount: 0,
        balance_due,
      };
    }

    return data;
  }

  /**
   * Get combined finance summary for a parent across all linked students.
   */
  static async getFamilySummary(linkedStudentIds = [], institutionId) {
    if (!linkedStudentIds.length) {
      return {
        total_balance: 0,
        total_billed: 0,
        total_paid: 0,
        total_pending: 0,
        total_credit: 0,
        children: []
      };
    }

    const summaries = await Promise.all(
      linkedStudentIds.map(id => this.getStudentSummary(id, institutionId))
    );

    let total_balance = 0;
    let total_billed = 0;
    let total_paid = 0;
    let total_pending = 0;
    let total_credit = 0;

    summaries.forEach(s => {
      total_balance += Number(s.balance_due || 0);
      total_billed += Number(s.total_billed || 0);
      total_paid += Number(s.total_paid || 0);
      total_pending += Number(s.pending_amount || 0);
      total_credit += Number(s.credit_amount || 0);
    });

    return {
      total_balance,
      total_billed,
      total_paid,
      total_pending,
      total_credit,
      children: summaries
    };
  }
}

module.exports = LedgerService;
