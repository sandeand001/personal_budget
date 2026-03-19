/**
 * Frequency normalization — converts any amount + frequency
 * into monthly and annual equivalents.
 */

export const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly', periodsPerYear: 52 },
  { value: 'biweekly', label: 'Bi-weekly (every 2 weeks)', periodsPerYear: 26 },
  { value: 'semimonthly', label: 'Semi-monthly (twice/month)', periodsPerYear: 24 },
  { value: 'monthly', label: 'Monthly', periodsPerYear: 12 },
  { value: 'bimonthly', label: 'Every other month', periodsPerYear: 6 },
  { value: 'quarterly', label: 'Quarterly', periodsPerYear: 4 },
  { value: 'annual', label: 'Annual', periodsPerYear: 1 },
];

/** Frequencies that need a month picker to specify which months they occur */
export const NEEDS_MONTH_PICKER = ['quarterly', 'bimonthly', 'annual'];

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Default applicable months for a given frequency (1-indexed) */
export function defaultMonthsForFrequency(frequency) {
  switch (frequency) {
    case 'quarterly': return [1, 4, 7, 10];
    case 'bimonthly': return [1, 3, 5, 7, 9, 11];
    case 'annual': return [1];
    default: return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  }
}

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

/**
 * Get the actual amount for a specific month (1-indexed).
 * For weekly/biweekly, calculates based on actual days in that month
 * so the value correctly reflects longer/shorter months.
 * For semimonthly/monthly, returns the exact per-month amount.
 * For quarterly/bimonthly/annual, returns the full payment amount
 * only in the applicable months, 0 otherwise.
 */
export function getAmountForMonth(amount, frequency, applicableMonths, month, year) {
  if (NEEDS_MONTH_PICKER.includes(frequency)) {
    const months = applicableMonths && applicableMonths.length > 0
      ? applicableMonths
      : defaultMonthsForFrequency(frequency);
    return months.includes(month) ? amount : 0;
  }

  if (frequency === 'semimonthly') return amount * 2;
  if (frequency === 'monthly') return amount;

  // For weekly/biweekly, use actual days in the target month
  const y = year || new Date().getFullYear();
  const daysInMonth = new Date(y, month, 0).getDate();
  if (frequency === 'weekly') return amount * (daysInMonth / 7);
  if (frequency === 'biweekly') return amount * (daysInMonth / 14);

  return toMonthly(amount, frequency);
}

// ─── Privacy Mode ───
let _privacyMode = false;

export function setPrivacyMode(on) { _privacyMode = !!on; }
export function getPrivacyMode() { return _privacyMode; }

export function formatCurrency(value) {
  if (_privacyMode) return '$•••••';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatCurrencyShort(value) {
  if (_privacyMode) return '$•••••';
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
