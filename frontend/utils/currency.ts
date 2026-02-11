export const formatCurrency = (amount: number | string) => {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(numericAmount)) return '$0.00';

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD', // Or change to 'KES', 'NGN' etc based on requirements. Defaulting to USD for now.
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numericAmount);
};
