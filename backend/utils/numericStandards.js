/**
 * Universal Numeric Correctness & Precision Standard
 * 
 * Enforces strict rounding and formatting discipline across all financial and academic calculations:
 * - Eliminates IEEE 754 floating-point drift (e.g., 0.1 + 0.2 = 0.30000000000000004)
 * - Prevents raw unrounded/scientific-notation artifacts (e.g., 6.23333333333...E01 -> 62.33)
 * - Guards against negative zero (-0.00)
 * - Formats currency and percentages consistently with institution locale/symbol.
 */

const DEFAULT_LOCALE = 'en-US';

/**
 * Accurately rounds a numeric value to a specified number of decimal places using half-up rounding.
 * Avoids floating-point drift and scientific notation quirks.
 * 
 * @param {number|string} value - The numeric value or string
 * @param {number} decimals - Number of decimal places (default 2)
 * @returns {number} - Cleanly rounded finite number
 */
function roundDecimal(value, decimals = 2) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;

  // Use exponential notation trick to prevent Math.round float inaccuracy
  const factor = Math.pow(10, decimals);
  const rounded = Math.round((parsed + Number.EPSILON) * factor) / factor;

  // Guard against JavaScript -0
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Universal currency rounding to exactly 2 decimal places.
 * 
 * @param {number|string} amount
 * @returns {number}
 */
function roundCurrency(amount) {
  return roundDecimal(amount, 2);
}

/**
 * Universal percentage rounding to 1 or 2 decimal places.
 * 
 * @param {number|string} percent
 * @param {number} decimals
 * @returns {number}
 */
function roundPercentage(percent, decimals = 1) {
  return roundDecimal(percent, decimals);
}

/**
 * Universal GPA / points rounding to 2 decimal places.
 * 
 * @param {number|string} gpa
 * @returns {number}
 */
function roundGpa(gpa) {
  return roundDecimal(gpa, 2);
}

/**
 * Normalizes currency configuration metadata.
 * 
 * @param {object} currency
 * @returns {{ code: string, symbol: string, decimal_places: number }}
 */
function normalizeCurrency(currency = {}) {
  const code = String(currency.code || 'KES').toUpperCase();
  const fallbackSymbol = code === 'KES' ? 'KSh' : code === 'USD' ? '$' : code === 'EUR' ? '€' : code;
  const symbol = String(currency.symbol || fallbackSymbol);
  const decimalPlaces = Number.isInteger(currency.decimal_places)
    ? currency.decimal_places
    : 2;

  return {
    code,
    symbol,
    decimal_places: decimalPlaces,
  };
}

/**
 * Formats a currency amount into a clean, human-readable string with proper symbol and thousand separators.
 * Guarantees no raw floating-point output or scientific notation.
 * 
 * @param {number|string} amount
 * @param {object} currency
 * @param {string} locale
 * @returns {string} - e.g. "KSh 15,000.00"
 */
function formatCurrencyAmount(amount, currency = {}, locale = DEFAULT_LOCALE) {
  const normalized = normalizeCurrency(currency);
  const numeric = roundDecimal(amount, normalized.decimal_places);

  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: normalized.decimal_places,
    maximumFractionDigits: normalized.decimal_places,
    useGrouping: true,
  });

  return `${normalized.symbol} ${formatter.format(numeric)}`;
}

/**
 * Formats an amount with thousand separators without symbol.
 * 
 * @param {number|string} amount
 * @param {number} decimals
 * @param {string} locale
 * @returns {string} - e.g. "15,000.00"
 */
function formatNumber(amount, decimals = 2, locale = DEFAULT_LOCALE) {
  const numeric = roundDecimal(amount, decimals);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  }).format(numeric);
}

/**
 * Safely calculates running balance after applying a charge or payment.
 * 
 * @param {number} previousBalance
 * @param {number} amountPaidOrCharged - Positive reduces balance (if payment), negative increases
 * @returns {number}
 */
function calculateRunningBalance(previousBalance, amountPaid) {
  return roundCurrency(roundCurrency(previousBalance) - roundCurrency(amountPaid));
}

module.exports = {
  roundDecimal,
  roundCurrency,
  roundPercentage,
  roundGpa,
  normalizeCurrency,
  formatCurrencyAmount,
  formatNumber,
  calculateRunningBalance,
};
