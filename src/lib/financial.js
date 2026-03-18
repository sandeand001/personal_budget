/**
 * Frequency normalization — converts any amount + frequency
 * into monthly and annual equivalents.
 */

export const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly', periodsPerYear: 52 },
  { value: 'biweekly', label: 'Bi-weekly (every 2 weeks)', periodsPerYear: 26 },
  { value: 'semimonthly', label: 'Semi-monthly (twice/month)', periodsPerYear: 24 },
  { value: 'monthly', label: 'Monthly', periodsPerYear: 12 },
  { value: 'annual', label: 'Annual', periodsPerYear: 1 },
];

export function getPeriodsPerYear(frequency) {
  const f = FREQUENCIES.find((f) => f.value === frequency);
  return f ? f.periodsPerYear : 12;
}

export function toAnnual(amount, frequency) {
  return amount * getPeriodsPerYear(frequency);
}

export function toMonthly(amount, frequency) {
  return toAnnual(amount, frequency) / 12;
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatCurrencyShort(value) {
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return formatCurrency(value);
}
