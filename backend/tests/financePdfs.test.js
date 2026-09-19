const test = require('node:test');
const assert = require('node:assert/strict');
const { compilePdfBuffer } = require('../services/pdfCompiler.service.js');

test('Vector PDF: compilePdfBuffer compiles fee_invoice into valid PDF buffer', async () => {
  const invoiceData = {
    institution_name: "Greenwood Academy",
    currency: { code: "KES", symbol: "KSh" },
    invoice: {
      invoice_number: "INV-2026-ADM042-101",
      issue_date: "2026-09-15",
      due_date: "2026-10-15",
      status: "partial",
      gross_amount: 45000,
      discount_amount: 5000,
      net_amount: 40000,
      paid_amount: 15000,
      balance_due: 25000,
      notes: "Pay via M-Pesa Paybill 123456 or Equity Bank. Retain receipt for bursary reconciliation.",
      itemized_breakdown: [
        { name: "Tuition Fee", category: "Academic", amount: 30000, discount: 5000, net_amount: 25000 },
        { name: "Boarding & Meals", category: "Welfare", amount: 12000, discount: 0, net_amount: 12000 },
        { name: "Activity & Sports", category: "Extracurricular", amount: 3000, discount: 0, net_amount: 3000 }
      ]
    },
    student: {
      full_name: "Jane Wanjiku",
      admission_number: "ADM-2026-042",
      class_name: "Grade 10 Blue",
      academic_year: "2026",
      term: "Term 2"
    }
  };

  const buffer = await compilePdfBuffer({
    document_type: 'fee_invoice',
    data: invoiceData
  });

  assert.ok(Buffer.isBuffer(buffer), "Expected buffer output");
  assert.ok(buffer.length > 2000, `Expected PDF buffer > 2KB, got ${buffer.length}`);
  // Check PDF header
  const header = buffer.subarray(0, 5).toString('ascii');
  assert.equal(header, "%PDF-", "Buffer must have valid PDF header");
});

test('Vector PDF: compilePdfBuffer compiles payment_receipt into valid PDF buffer', async () => {
  const receiptData = {
    institution_name: "Greenwood Academy",
    currency: { code: "KES", symbol: "KSh" },
    receipt: {
      receipt_number: "REC-2026-09-0891",
      payment_date: "2026-09-18",
      payment_method: "mpesa",
      reference_number: "QWE789RTY2",
      amount: 15000,
      status: "completed",
      fee_structure_title: "Term 2 Tuition & Boarding",
      previous_balance: 40000,
      running_balance: 25000,
      recorded_by: "Bursar Jane M.",
      notes: "M-Pesa payment received and reconciled successfully."
    },
    student: {
      full_name: "Jane Wanjiku",
      admission_number: "ADM-2026-042",
      class_name: "Grade 10 Blue",
      academic_year: "2026",
      term: "Term 2"
    }
  };

  const buffer = await compilePdfBuffer({
    document_type: 'payment_receipt',
    data: receiptData
  });

  assert.ok(Buffer.isBuffer(buffer), "Expected buffer output");
  assert.ok(buffer.length > 2000, `Expected PDF buffer > 2KB, got ${buffer.length}`);
  // Check PDF header
  const header = buffer.subarray(0, 5).toString('ascii');
  assert.equal(header, "%PDF-", "Buffer must have valid PDF header");
});
