export type CurrencyFormatInput =
  | string
  | {
      code?: string;
      symbol?: string;
      decimal_places?: number;
    };

const resolveCurrencyMeta = (currency?: CurrencyFormatInput) => {
  if (!currency) {
    return { code: 'KES', symbol: 'KSh', decimal_places: 2 };
  }

  if (typeof currency === 'string') {
    const code = currency.toUpperCase();
    if (code === 'KES') return { code: 'KES', symbol: 'KSh', decimal_places: 2 };
    if (code === 'USD') return { code: 'USD', symbol: '$', decimal_places: 2 };
    return { code, symbol: code, decimal_places: 2 };
  }

  return {
    code: String(currency.code || 'KES').toUpperCase(),
    symbol: String(currency.symbol || 'KSh'),
    decimal_places: Number.isInteger(currency.decimal_places) ? currency.decimal_places : 2,
  };
};

export const formatCurrency = (
  amount: number | string,
  currency?: CurrencyFormatInput,
  locale = 'en-US',
) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const normalizedAmount = Number.isFinite(numericAmount) ? numericAmount : 0;
  const meta = resolveCurrencyMeta(currency);

  const formattedVal = new Intl.NumberFormat(locale, {
    minimumFractionDigits: meta.decimal_places,
    maximumFractionDigits: meta.decimal_places,
  }).format(normalizedAmount);

  return `${meta.symbol} ${formattedVal}`;
};
