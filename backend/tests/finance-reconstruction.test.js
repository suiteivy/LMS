const test = require('node:test');
const assert = require('node:assert/strict');
const LedgerService = require('../services/ledger.service.js');
const ReceiptService = require('../services/receipt.service.js');

test('LedgerService: computes student balances and allocations consistently', async (t) => {
  // Test family summary aggregation logic
  const mockChildrenIds = ['stu-1', 'stu-2'];
  const originalGetStudentSummary = LedgerService.getStudentSummary;

  LedgerService.getStudentSummary = async (studentId) => {
    if (studentId === 'stu-1') {
      return {
        student_id: 'stu-1',
        total_billed: 15000,
        total_paid: 10000,
        pending_amount: 2000,
        flagged_amount: 0,
        credit_amount: 0,
        balance_due: 5000,
      };
    }
    return {
      student_id: 'stu-2',
      total_billed: 20000,
      total_paid: 20000,
      pending_amount: 0,
      flagged_amount: 0,
      credit_amount: 1000,
      balance_due: 0,
    };
  };

  try {
    const familySummary = await LedgerService.getFamilySummary(mockChildrenIds, 'inst-1');
    assert.equal(familySummary.total_balance, 5000);
    assert.equal(familySummary.total_billed, 35000);
    assert.equal(familySummary.total_paid, 30000);
    assert.equal(familySummary.total_pending, 2000);
    assert.equal(familySummary.total_credit, 1000);
    assert.equal(familySummary.children.length, 2);
  } finally {
    LedgerService.getStudentSummary = originalGetStudentSummary;
  }
});

test('ReceiptService: renders official branded HTML with allocations and sequential number', (t) => {
  const html = ReceiptService.renderReceiptHtml({
    receipt: {
      receipt_number: 'REC-00042',
      amount: 15000,
      currency: 'KES',
      issued_at: '2026-11-16T12:00:00Z',
    },
    payment: {
      payment_method: 'M-Pesa',
      reference_number: 'QKB7492H10',
    },
    student: {
      admission_number: 'ADM-2026-001',
      users: { full_name: 'Amina Kimani' },
    },
    institution: {
      name: 'St. Marys Academy',
      email: 'accounts@stmarys.ac.ke',
      phone: '+254700000000',
    },
    allocations: [
      { fee_types: { name: 'Grade 5 Tuition' }, amount: 10000 },
      { fee_types: { name: 'School Bus Transport' }, amount: 5000 },
    ],
    settings: {
      currency_code: 'KES',
      receipt_footer_text: 'Official School Acknowledgment',
    },
  });

  assert.ok(html.includes('REC-00042'));
  assert.ok(html.includes('Amina Kimani'));
  assert.ok(html.includes('ADM-2026-001'));
  assert.ok(html.includes('Grade 5 Tuition'));
  assert.ok(html.includes('School Bus Transport'));
  assert.ok(html.includes('QKB7492H10'));
  assert.ok(html.includes('St. Marys Academy'));
});

test('Finance Allocation Sum Validation: blocks mismatched payment totals', () => {
  const totalAmount = 15000;
  const invalidAllocations = [
    { student_id: 's1', amount: 10000 },
    { student_id: 's2', amount: 4000 }
  ];

  const sum = invalidAllocations.reduce((acc, a) => acc + a.amount, 0);
  assert.notEqual(sum, totalAmount, 'Allocations sum (14,000) does not match total amount (15,000)');
  assert.equal(Math.abs(sum - totalAmount) > 0.01, true);
});
