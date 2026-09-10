const DEFAULT_LOCALE = 'en-US';

const normalizeAmount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeCurrency = (currency = {}) => {
  const code = String(currency.code || 'KES').toUpperCase();
  const fallbackSymbol = code === 'KES' ? 'KSh' : code === 'USD' ? '$' : code;
  const symbol = String(currency.symbol || fallbackSymbol);
  const decimalPlaces = Number.isInteger(currency.decimal_places)
    ? currency.decimal_places
    : 2;

  return {
    code,
    symbol,
    decimal_places: decimalPlaces,
  };
};

const formatCurrencyAmount = (amount, currency, locale = DEFAULT_LOCALE) => {
  const normalizedCurrency = normalizeCurrency(currency);
  const numericAmount = normalizeAmount(amount);

  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: normalizedCurrency.decimal_places,
    maximumFractionDigits: normalizedCurrency.decimal_places,
  });

  return `${normalizedCurrency.symbol} ${formatter.format(numericAmount)}`;
};

module.exports = {
  normalizeCurrency,
  formatCurrencyAmount,
};
