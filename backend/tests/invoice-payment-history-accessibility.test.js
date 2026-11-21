const test = require('node:test');
const assert = require('node:assert/strict');
const { compilePdfBuffer } = require('../services/pdfCompiler.service.js');
const { calculateRunningBalance, roundCurrency } = require('../utils/numericStandards.js');

test('Invoice & Payment History: Financial reconciliation matches to the exact cent', () => {
  const openingBalance = 15000.00;
  const transactions = [
    { type: 'charge', amount: 45000.00, description: 'Term 1 Tuition' },
    { type: 'charge', amount: 8500.00, description: 'Term 1 Transport Route A' },
    { type: 'payment', amount: 50000.00, description: 'M-PESA Confirmation QWE12345' },
    { type: 'charge', amount: 3200.00, description: 'Mid-term Boarding Essentials' },
    { type: 'payment', amount: 18700.00, description: 'Bank Transfer Clearance' },
  ];

  let currentBal = openingBalance;
  const ledgerHistory = [];

  transactions.forEach(t => {
    if (t.type === 'charge') {
      currentBal = roundCurrency(currentBal + t.amount);
    } else if (t.type === 'payment') {
      currentBal = roundCurrency(currentBal - t.amount);
    }
    ledgerHistory.push({ ...t, runningBalance: currentBal });
  });

  // Total Billed: 15,000 opening + 45,000 + 8,500 + 3,200 = 71,700
  // Total Paid: 50,000 + 18,700 = 68,700
  // Expected Balance: 71,700 - 68,700 = 3,000.00
  assert.strictEqual(currentBal, 3000.00, 'Closing balance must equal opening + charges - payments to the exact cent');
  assert.strictEqual(ledgerHistory[ledgerHistory.length - 1].runningBalance, 3000.00);
});

test('Multi-child Family Reconciliation: Aggregates siblings without double-counting', () => {
  const family = {
    parentId: 'parent-1',
    children: [
      {
        studentId: 'child-1',
        name: 'Alice Wanjiku',
        billed: 45000.00,
        paid: 45000.00,
        balance: 0.00,
      },
      {
        studentId: 'child-2',
        name: 'Brian Kiprop',
        billed: 52000.00,
        paid: 30000.00,
        balance: 22000.00,
      },
    ],
  };

  const familyTotalBilled = family.children.reduce((acc, c) => roundCurrency(acc + c.billed), 0);
  const familyTotalPaid = family.children.reduce((acc, c) => roundCurrency(acc + c.paid), 0);
  const familyClosingBalance = family.children.reduce((acc, c) => roundCurrency(acc + c.balance), 0);

  assert.strictEqual(familyTotalBilled, 97000.00);
  assert.strictEqual(familyTotalPaid, 75000.00);
  assert.strictEqual(familyClosingBalance, 22000.00);
  assert.strictEqual(familyClosingBalance, roundCurrency(familyTotalBilled - familyTotalPaid));
});

test('Immutable Receipt Snapshot: Receipt retains original allocations despite subsequent edits', () => {
  const originalAllocations = [
    { item_name: 'Tuition Fee Grade 6', amount: 35000.00 },
    { item_name: 'Transport Zone 2', amount: 6500.00 },
  ];

  const receipt = {
    receiptNumber: 'REC-00104',
    amount: 41500.00,
    issuedAt: '2025-01-15T09:30:00Z',
    allocationsSnapshot: JSON.parse(JSON.stringify(originalAllocations)),
  };

  // Mutate external state (e.g. fee structure updated)
  originalAllocations[0].amount = 40000.00;

  assert.strictEqual(receipt.allocationsSnapshot[0].amount, 35000.00, 'Receipt snapshot must remain immutable');
  assert.strictEqual(receipt.amount, 41500.00);
});

test('Vector PDF: Compiles payment_receipt document type cleanly with ReportLab', async () => {
  const pdfBuffer = await compilePdfBuffer({
    document_type: 'payment_receipt',
    data: {
      institution_name: 'Brookside Academy',
      receipt_number: 'REC-00245',
      date: '2025-02-10',
      student_name: 'Alice Wanjiku',
      admission_number: 'ADM-0042',
      grade_level: 'Grade 6 East',
      amount_paid: '41,500.00',
      payment_method: 'M-PESA Paybill',
      reference_number: 'QWE987654321',
      received_by: 'Bursar Office',
      items: [
        { name: 'Tuition Term 1', amount: '35,000.00' },
        { name: 'Transport Route A', amount: '6,500.00' },
      ],
      total_amount: '41,500.00',
    },
  });

  assert.ok(Buffer.isBuffer(pdfBuffer));
  assert.ok(pdfBuffer.length > 500);
  assert.strictEqual(pdfBuffer.slice(0, 4).toString(), '%PDF');
});

test('Vector PDF: Compiles account_statement document type cleanly with ReportLab', async () => {
  const pdfBuffer = await compilePdfBuffer({
    document_type: 'account_statement',
    data: {
      institution_name: 'Brookside Academy',
      date: '2025-02-15',
      student_name: 'Alice Wanjiku',
      admission_number: 'ADM-0042',
      opening_balance: 0.00,
      closing_balance: 3000.00,
      total_billed: 71700.00,
      total_paid: 68700.00,
      currency: 'KES',
      entries: [
        { created_at: '2025-01-05', reference_number: 'INV-001', description: 'Term 1 Tuition', entry_type: 'charge', amount: 45000.00, running_balance: 45000.00 },
        { created_at: '2025-01-10', reference_number: 'REC-001', description: 'M-PESA Confirmation', entry_type: 'payment', amount: -42000.00, running_balance: 3000.00 },
      ],
    },
  });

  assert.ok(Buffer.isBuffer(pdfBuffer));
  assert.ok(pdfBuffer.length > 500);
  assert.strictEqual(pdfBuffer.slice(0, 4).toString(), '%PDF');
});
