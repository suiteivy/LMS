// backend/services/receipt.service.js
const supabase = require('../utils/supabaseClient.js');

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

class ReceiptService {
  /**
   * Issue an official sequential receipt for a confirmed payment.
   */
  static async issueOfficialReceipt({
    institutionId,
    paymentId,
    studentId,
    amount,
    currency = 'KES',
    issuedBy,
    allocations = []
  }) {
    // Generate sequential gap-free receipt number atomically
    const { data: receiptNumber, error: seqError } = await supabase.rpc('generate_receipt_number', {
      p_institution_id: institutionId
    });

    if (seqError) {
      console.error('[ReceiptService] generate_receipt_number error:', seqError);
      throw new Error(`Failed to generate receipt sequence: ${seqError.message}`);
    }

    const receiptNum = receiptNumber || `REC-${Date.now().toString().slice(-6)}`;

    const { data: receipt, error: insertError } = await supabase
      .from('receipts')
      .insert([{
        institution_id: institutionId,
        receipt_number: receiptNum,
        payment_id: paymentId,
        student_id: studentId || null,
        amount: Number(amount) || 0,
        currency: currency || 'KES',
        status: 'valid',
        issued_at: new Date().toISOString(),
        issued_by: issuedBy || null,
        metadata: {
          allocations_snapshot: allocations,
        }
      }])
      .select()
      .single();

    if (insertError) {
      console.error('[ReceiptService] receipts insert error:', insertError);
      throw insertError;
    }

    return receipt;
  }

  /**
   * Render Branded Official Receipt HTML.
   */
  static renderReceiptHtml({
    receipt,
    payment,
    student,
    institution,
    allocations = [],
    settings = {}
  }) {
    const currency = receipt?.currency || settings?.currency_code || 'KES';
    const formattedAmount = `${currency} ${Number(receipt?.amount || payment?.amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

    const studentName = student?.users?.full_name || 
      `${student?.users?.first_name || ''} ${student?.users?.last_name || ''}`.trim() ||
      'Student';
    const admissionNo = student?.admission_number || student?.id || 'N/A';

    const allocationRows = (allocations || []).map(a => {
      const itemTitle = a.fee_types?.name || a.fee_types?.title || a.notes || 'School Fee Allocation';
      const itemAmt = `${currency} ${Number(a.amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
      return `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #374151;">${escapeHtml(itemTitle)}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #111827;">${escapeHtml(itemAmt)}</td>
        </tr>
      `;
    }).join('');

    const footerText = settings?.receipt_footer_text || 'This is an official computer-generated receipt issued by the school administration.';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Official Receipt - ${escapeHtml(receipt?.receipt_number || '')}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 32px; background: #fff; color: #1f2937; }
    .receipt-container { max-width: 680px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #FF6900; padding-bottom: 20px; margin-bottom: 24px; }
    .school-name { font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -0.5px; }
    .school-meta { font-size: 12px; color: #6b7280; margin-top: 4px; line-height: 1.4; }
    .receipt-badge { background: #fff7ed; border: 1px solid #fed7aa; padding: 8px 16px; border-radius: 12px; text-align: right; }
    .receipt-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #c2410c; }
    .receipt-number { font-size: 18px; font-weight: 800; color: #111827; margin-top: 2px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; background: #f9fafb; padding: 16px; border-radius: 12px; }
    .grid-item label { display: block; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 2px; }
    .grid-item span { font-size: 14px; font-weight: 700; color: #111827; }
    .table-container { margin: 24px 0; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f9fafb; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
    .total-row { background: #fff7ed; font-weight: 800; }
    .total-row td { padding: 14px 12px; font-size: 16px; color: #c2410c; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px dashed #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div>
        <div class="school-name">${escapeHtml(institution?.name || 'School Administration')}</div>
        <div class="school-meta">
          ${institution?.email ? escapeHtml(institution.email) + ' • ' : ''}
          ${institution?.phone ? escapeHtml(institution.phone) : ''}<br>
          Official Payment Acknowledgment
        </div>
      </div>
      <div class="receipt-badge">
        <div class="receipt-title">Official Receipt</div>
        <div class="receipt-number">${escapeHtml(receipt?.receipt_number || '')}</div>
      </div>
    </div>

    <div class="grid">
      <div class="grid-item">
        <label>Student Name</label>
        <span>${escapeHtml(studentName)}</span>
      </div>
      <div class="grid-item">
        <label>Admission / Ref</label>
        <span>${escapeHtml(admissionNo)}</span>
      </div>
      <div class="grid-item">
        <label>Payment Date</label>
        <span>${receipt?.issued_at ? new Date(receipt.issued_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</span>
      </div>
      <div class="grid-item">
        <label>Payment Method & Ref</label>
        <span>${escapeHtml(payment?.payment_method || 'Standard')} · ${escapeHtml(payment?.reference_number || 'N/A')}</span>
      </div>
    </div>

    <div class="section-title">Payment Allocation Breakdown</div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: right;">Amount Paid</th>
          </tr>
        </thead>
        <tbody>
          ${allocationRows || '<tr><td colspan="2" style="padding: 12px; text-align: center; color: #9ca3af;">General School Fees</td></tr>'}
          <tr class="total-row">
            <td>Total Confirmed Received</td>
            <td style="text-align: right;">${escapeHtml(formattedAmount)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      ${escapeHtml(footerText)}<br>
      Status: <strong>OFFICIALLY CONFIRMED</strong> • Generated on ${new Date().toISOString()}
    </div>
  </div>
</body>
</html>`;
  }
}

module.exports = ReceiptService;
