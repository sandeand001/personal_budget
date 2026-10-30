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

export function roundCurrency(value) {
  if (!Number.isFinite(value)) throw new TypeError('Money amounts must be finite numbers.');
  const cents = Math.round((Math.abs(value) + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(cents)) throw new RangeError('Money amount exceeds the supported cent precision.');
  return cents === 0 ? 0 : Math.sign(value) * cents / 100;
}

/** Largest-remainder allocation keeps every cent, including uneven splits. */
export function allocateMoney(amount, weights) {
  if (!Number.isFinite(amount) || amount < 0 || weights.some((w) => !Number.isFinite(w) || w < 0)) {
    throw new RangeError('Allocations require non-negative amounts and weights.');
  }
  if (weights.length === 0) return [];
  const cents = Math.round(roundCurrency(amount) * 100);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (cents === 0) return weights.map(() => 0);
  if (totalWeight === 0) throw new RangeError('A positive allocation needs a positive weight.');
  const shares = weights.map((weight) => cents * weight / totalWeight);
  const allocated = shares.map(Math.floor);
  let remainder = cents - allocated.reduce((sum, value) => sum + value, 0);
  const order = shares.map((share, index) => ({ index, fraction: share - allocated[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of order) {
    if (remainder-- <= 0) break;
    allocated[index]++;
  }
  return allocated.map((value) => value / 100);
}

export function getPeriodsPerYear(frequency, applicableMonths) {
  if (NEEDS_MONTH_PICKER.includes(frequency) && applicableMonths?.length > 0) {
    return new Set(applicableMonths).size;
  }
  const f = FREQUENCIES.find((f) => f.value === frequency);
  return f ? f.periodsPerYear : 12;
}

export function toAnnual(amount, frequency, applicableMonths) {
  return roundCurrency(amount * getPeriodsPerYear(frequency, applicableMonths));
}

export function toMonthly(amount, frequency, applicableMonths) {
  return toAnnual(amount, frequency, applicableMonths) / 12;
}

/**
 * Get a monthly estimate (1-indexed).
 * Weekly/biweekly annual totals are spread by calendar days, not payday dates.
 * Cumulative rounding ensures the twelve months conserve the annual total.
 * For semimonthly/monthly, returns the exact per-month amount.
 * For quarterly/bimonthly/annual, returns the full payment amount
 * only in the applicable months, 0 otherwise.
 */
export function getAmountForMonth(amount, frequency, applicableMonths, month, year) {
  if (NEEDS_MONTH_PICKER.includes(frequency)) {
    const months = applicableMonths && applicableMonths.length > 0
      ? applicableMonths
      : defaultMonthsForFrequency(frequency);
    return months.includes(month) ? roundCurrency(amount) : 0;
  }

  if (frequency === 'semimonthly') return roundCurrency(amount * 2);
  if (frequency === 'monthly') return roundCurrency(amount);

  if (frequency === 'weekly' || frequency === 'biweekly') {
    const y = year ?? new Date().getFullYear();
    const start = Date.UTC(y, 0, 1);
    const daysInYear = (Date.UTC(y + 1, 0, 1) - start) / 86400000;
    const before = (Date.UTC(y, month - 1, 1) - start) / 86400000;
    const through = (Date.UTC(y, month, 1) - start) / 86400000;
    const annual = toAnnual(amount, frequency);
    return roundCurrency(roundCurrency(annual * through / daysInYear) - roundCurrency(annual * before / daysInYear));
  }

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

/**
 * Returns the correct per-paycheck amount for an income stream based on mode.
 * Simple mode → takeHomeAmount, Detailed mode → grossAmount.
 * Falls back to legacy 'amount' field for simple mode (pre-migration data).
 * Falls back to 0 if the field hasn't been entered yet.
 */
export function getStreamAmount(stream, isSimpleMode) {
  if (isSimpleMode) {
    return stream.takeHomeAmount ?? stream.amount ?? 0;
  }
  return stream.grossAmount ?? 0;
}

/**
 * Get the total bonus amount for a specific month across all bonuses on a stream.
 * Supports both the new multi-bonus model (bonuses[]) and legacy single-bonus fields.
 */
export function getBonusForMonth(stream, month) {
  if (!stream.bonusEnabled) return 0;
  // New multi-bonus model
  if (Array.isArray(stream.bonuses) && stream.bonuses.length > 0) {
    let total = 0;
    for (const b of stream.bonuses) {
      const amt = parseFloat(b.amount) || 0;
      if (amt > 0 && Array.isArray(b.months) && b.months.includes(month)) {
        total += amt;
      }
    }
    return total;
  }
  // Legacy single-bonus fallback
  if (!stream.bonusAmount) return 0;
  const bonusMonths = stream.bonusMonths || [];
  if (bonusMonths.length === 0) return 0;
  return bonusMonths.includes(month) ? (parseFloat(stream.bonusAmount) || 0) : 0;
}

/**
 * Get total annual bonus for a stream across all bonus entries.
 */
export function getAnnualBonus(stream, year) {
  return roundCurrency(Array.from({ length: 12 }, (_, i) =>
    getAmountForMonth(getBonusForMonth(stream, i + 1), stream.frequency || 'monthly', stream.applicableMonths, i + 1, year)
  ).reduce((sum, amount) => sum + amount, 0));
}

export function getStreamAnnualTotal(stream, isSimpleMode, year) {
  return roundCurrency(
    toAnnual(getStreamAmount(stream, isSimpleMode), stream.frequency, stream.applicableMonths)
    + getAnnualBonus(stream, year)
  );
}

/**
 * Get total income for a stream in a specific month (base + bonus if applicable).
 */
export function getStreamMonthTotal(stream, isSimpleMode, month, year) {
  const base = getStreamAmount(stream, isSimpleMode);
  const baseForMonth = getAmountForMonth(base, stream.frequency, stream.applicableMonths, month, year);
  // Add bonus for applicable months in both modes
  const bonus = getBonusForMonth(stream, month);
  const bonusForMonth = bonus > 0 ? getAmountForMonth(bonus, stream.frequency, stream.applicableMonths, month, year) : 0;
  return roundCurrency(baseForMonth + bonusForMonth);
}

export function getSpendingSummary({ income, useBalance, balanceAmount, fixedEntries, varEntries, profiles, splitOverrides }) {
  const sumActuals = (entries) => roundCurrency(entries.reduce((sum, e) => sum + (Number(e.actual) || 0), 0));
  const fixedTotal = sumActuals(fixedEntries);
  const varTotal = sumActuals(varEntries);
  const alreadyPaidTotal = useBalance ? sumActuals(fixedEntries.filter((e) => e.alreadyPaid)) : 0;
  const totalExpenses = roundCurrency(fixedTotal + varTotal - alreadyPaidTotal);
  const startingAmount = roundCurrency(useBalance ? balanceAmount : income);
  const spendingMoney = Math.max(0, roundCurrency(startingAmount - totalExpenses));
  const evenAmounts = allocateMoney(spendingMoney, profiles.map(() => 1));
  const profileAmounts = profiles.map((profile, i) => ({
    id: profile.id, name: profile.name,
    amount: roundCurrency(splitOverrides?.[profile.id] ?? evenAmounts[i]),
  }));
  const distributed = roundCurrency(profileAmounts.reduce((sum, profile) => sum + profile.amount, 0));
  return {
    fixedTotal, varTotal, alreadyPaidTotal, totalExpenses, startingAmount, spendingMoney, profileAmounts,
    allocationError: profileAmounts.some((p) => p.amount < 0) || distributed > spendingMoney
      ? 'Budget allocations cannot be negative or exceed the available spending money.'
      : null,
  };
}

export function getLockedExpenseSummary(log, profiles) {
  const recordedProfiles = Object.keys(log.profileAmounts || {}).map((id) => ({
    id, name: profiles.find((profile) => profile.id === id)?.name || 'Profile',
  }));
  return getSpendingSummary({
    income: log.startingAmount, useBalance: log.useBalance, balanceAmount: log.balanceAmount,
    fixedEntries: log.fixedEntries, varEntries: log.varEntries,
    profiles: recordedProfiles, splitOverrides: log.profileAmounts,
  });
}

export function buildMonthlyOverview({ streams, expenses, fixedExpenses, incomeLogs, expenseLogs, year, isSimpleMode }) {
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const incomeLog = incomeLogs[key];
    const expenseLog = expenseLogs[key];
    const sumExpenses = (items) => roundCurrency(items.reduce((sum, item) =>
      sum + getAmountForMonth(item.amount, item.frequency, item.applicableMonths, month, year), 0));
    const fixed = expenseLog
      ? roundCurrency(expenseLog.fixedEntries.reduce((sum, entry) => sum + Number(entry.actual), 0))
      : sumExpenses(fixedExpenses.filter((e) => !(e.isOptional && e.disabled)));
    const variable = expenseLog
      ? roundCurrency(expenseLog.varEntries.reduce((sum, entry) => sum + Number(entry.actual), 0))
      : sumExpenses(expenses);
    const income = incomeLog ? (isSimpleMode ? (incomeLog.netTotal ?? incomeLog.total) : incomeLog.total) : roundCurrency(streams.reduce((sum, stream) =>
      sum + getStreamMonthTotal(stream, isSimpleMode, month, year), 0));
    return {
      month, name: MONTH_NAMES[i], fullName: MONTH_NAMES_FULL[i],
      income, fixedExpenses: fixed, variableExpenses: variable,
      expenses: roundCurrency(fixed + variable), net: roundCurrency(income - fixed - variable),
      isLocked: !!incomeLog, expensesLocked: !!expenseLog,
    };
  });
}

export function getBudgetSummary(profile, transactions) {
  const spent = Object.create(null);
  const categories = profile.categories || [];
  categories.forEach((category) => { spent[category.name] = 0; });
  transactions.forEach((transaction) => {
    spent[transaction.category] = roundCurrency((spent[transaction.category] || 0) + (transaction.amount || 0));
  });
  const totalSpent = roundCurrency(Object.values(spent).reduce((sum, amount) => sum + amount, 0));
  return {
    spent, totalSpent, remaining: roundCurrency((profile.totalBudget || 0) - totalSpent),
    pieData: Object.entries(spent).filter(([, value]) => value > 0).map(([name, value]) => ({ name, value })),
    barData: Object.keys(spent).map((name) => ({
      name: name.length > 10 ? name.slice(0, 10) + '...' : name,
      Budget: categories.find((category) => category.name === name)?.allocated || 0,
      Spent: spent[name],
    })),
  };
}

export function getSavingsCategories(vacation) {
  if (vacation.savingsCategories?.length > 0) return vacation.savingsCategories;
  return vacation.savingsGoal > 0 ? [{ name: 'General', goal: vacation.savingsGoal }] : [];
}

export function getVacationTotals(vacation, expenses, contributions) {
  const totalExpenses = roundCurrency(expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0));
  const paidExpenses = roundCurrency(expenses.filter((expense) => expense.isPaid).reduce((sum, expense) => sum + (expense.amount || 0), 0));
  const totalContributions = roundCurrency(contributions.reduce((sum, contribution) => sum + (contribution.amount || 0), 0));
  return {
    totalExpenses, paidExpenses, totalContributions,
    savingsPct: vacation.savingsGoal > 0 ? Math.min(totalContributions / vacation.savingsGoal * 100, 100) : 0,
  };
}
