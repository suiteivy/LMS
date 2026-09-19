const test = require('node:test');
const assert = require('node:assert/strict');
const {
  roundDecimal,
  roundCurrency,
  roundPercentage,
  roundGpa,
  formatCurrencyAmount,
  formatNumber,
  calculateRunningBalance,
} = require('../utils/numericStandards.js');

test('Universal Numeric Standard: eliminates floating-point drift', () => {
  // 0.1 + 0.2 is famously 0.30000000000000004 in IEEE 754
  const sum = 0.1 + 0.2;
  assert.equal(roundCurrency(sum), 0.3);
  assert.equal(formatCurrencyAmount(sum, { symbol: 'KSh' }), 'KSh 0.30');
});

test('Universal Numeric Standard: prevents scientific notation artifacts', () => {
  // B1 failure mode: raw unrounded figures like 6.233333333333333e01
  const rawScientific = 6.233333333333333e01;
  assert.equal(roundDecimal(rawScientific, 2), 62.33);
  assert.equal(formatNumber(rawScientific, 2), '62.33');
});

test('Universal Numeric Standard: guards against negative zero', () => {
  const negZero = -0.0000001;
  assert.equal(roundCurrency(negZero), 0);
  assert.equal(Object.is(roundCurrency(negZero), -0), false);
});

test('Universal Numeric Standard: calculates running balance accurately', () => {
  const previousBalance = 15000.75;
  const payment = 5000.25;
  const running = calculateRunningBalance(previousBalance, payment);
  assert.equal(running, 10000.50);
  assert.equal(formatCurrencyAmount(running, { code: 'KES', symbol: 'KSh' }), 'KSh 10,000.50');
});

test('Universal Numeric Standard: GPA and percentages rounded cleanly', () => {
  const rawGpa = 3.6666666666666665;
  assert.equal(roundGpa(rawGpa), 3.67);

  const rawPercent = 83.33333333333334;
  assert.equal(roundPercentage(rawPercent, 1), 83.3);
  assert.equal(roundPercentage(rawPercent, 2), 83.33);
});
