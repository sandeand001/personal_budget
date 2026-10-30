import { allocateMoney, getAmountForMonth, roundCurrency } from './financial.js';

function requireNonNegative(value, name) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be a non-negative number.`);
}

/** Monthly amortization estimate with cent-rounded interest and a partial final installment. */
export function calcPayoff(balance, annualRate, monthlyPayment) {
  requireNonNegative(balance, 'Balance');
  requireNonNegative(annualRate, 'Annual interest rate');
  requireNonNegative(monthlyPayment, 'Payment');
  balance = roundCurrency(balance);
  monthlyPayment = roundCurrency(monthlyPayment);
  if (balance === 0) return { months: 0, totalInterest: 0 };
  const firstInterest = roundCurrency(balance * annualRate / 1200);
  if (monthlyPayment === 0) return { months: Infinity, totalInterest: firstInterest > 0 ? Infinity : 0 };
  if (firstInterest === 0) return { months: Math.ceil(Math.round(balance * 100) / Math.round(monthlyPayment * 100)), totalInterest: 0 };
  let months = 0;
  let totalInterest = 0;
  while (balance > 0) {
    const result = calculateLoanPayment({ balance, annualRate, regularPayment: monthlyPayment });
    if (result.balanceAfter >= balance) return { months: Infinity, totalInterest: Infinity };
    totalInterest = roundCurrency(totalInterest + result.interest);
    balance = result.balanceAfter;
    months++;
  }
  return { months, totalInterest };
}

export function calculateLoanPayment({ balance, annualRate, regularPayment = 0, principalOnlyPayment = 0, interestOverride }) {
  for (const [name, value] of Object.entries({ balance, annualRate, regularPayment, principalOnlyPayment })) {
    requireNonNegative(value, name);
  }
  if (interestOverride != null) requireNonNegative(interestOverride, 'Interest');
  const interest = balance > 0
    ? roundCurrency(interestOverride ?? (regularPayment > 0 ? balance * annualRate / 1200 : 0))
    : 0;
  const payment = roundCurrency(regularPayment + principalOnlyPayment);
  const balanceAfter = Math.max(0, roundCurrency(balance + interest - payment));
  return {
    balanceBefore: roundCurrency(balance), balanceAfter, interest, payment,
    balanceReduction: roundCurrency(balance - balanceAfter),
    unappliedPayment: Math.max(0, roundCurrency(payment - balance - interest)),
  };
}

function allocateCapped(amount, capacities, weights) {
  const allocated = capacities.map(() => 0);
  let remaining = Math.min(roundCurrency(amount), roundCurrency(capacities.reduce((sum, value) => sum + value, 0)));
  while (remaining > 0) {
    const activeWeights = weights.map((weight, i) => allocated[i] < capacities[i] ? weight : 0);
    const shares = allocateMoney(remaining, activeWeights.some((w) => w > 0)
      ? activeWeights : capacities.map((cap, i) => roundCurrency(cap - allocated[i])));
    shares.forEach((share, i) => {
      const applied = Math.min(share, roundCurrency(capacities[i] - allocated[i]));
      allocated[i] = roundCurrency(allocated[i] + applied);
      remaining = roundCurrency(remaining - applied);
    });
  }
  return allocated;
}

export function calculateLoanGroupPayment({ subLoans, regularPayment = 0, principalOnlyPayment = 0, interestOverride }) {
  requireNonNegative(regularPayment, 'Regular payment');
  requireNonNegative(principalOnlyPayment, 'Principal-only payment');
  const balances = subLoans.map((loan) => {
    requireNonNegative(loan.balance || 0, 'Loan balance');
    requireNonNegative(loan.interestRate || 0, 'Loan interest rate');
    return roundCurrency(loan.balance || 0);
  });
  if (interestOverride != null) requireNonNegative(interestOverride, 'Interest');
  const totalBalance = roundCurrency(balances.reduce((sum, value) => sum + value, 0));
  const interestAmounts = interestOverride != null && totalBalance > 0
    ? allocateMoney(interestOverride, balances)
    : subLoans.map((loan, i) => regularPayment > 0 ? roundCurrency(balances[i] * (loan.interestRate || 0) / 1200) : 0);
  const amountsOwed = balances.map((balance, i) => roundCurrency(balance + interestAmounts[i]));
  const regularAmounts = allocateCapped(regularPayment, amountsOwed, balances);
  const afterRegular = amountsOwed.map((owed, i) => roundCurrency(owed - regularAmounts[i]));
  const principalAmounts = allocateCapped(principalOnlyPayment, afterRegular, afterRegular);
  const loanPayments = subLoans.map((loan, i) => ({
    id: loan.id, balanceBefore: balances[i],
    balanceAfter: roundCurrency(afterRegular[i] - principalAmounts[i]), interest: interestAmounts[i],
  }));
  const interest = roundCurrency(interestAmounts.reduce((sum, value) => sum + value, 0));
  const balanceAfter = roundCurrency(loanPayments.reduce((sum, loan) => sum + loan.balanceAfter, 0));
  const payment = roundCurrency(regularPayment + principalOnlyPayment);
  return {
    balanceBefore: totalBalance, balanceAfter, interest, payment, loanPayments,
    balanceReduction: roundCurrency(totalBalance - balanceAfter),
    unappliedPayment: Math.max(0, roundCurrency(payment - totalBalance - interest)),
  };
}

export function calcLoanGroupPayoff(subLoans, monthlyPayment) {
  requireNonNegative(monthlyPayment, 'Payment');
  let loans = subLoans.map((loan) => ({ ...loan }));
  let balance = roundCurrency(loans.reduce((sum, loan) => sum + (loan.balance || 0), 0));
  if (balance === 0) return { months: 0, totalInterest: 0 };
  if (loans.every((loan) => !loan.interestRate)) return calcPayoff(balance, 0, monthlyPayment);
  if (monthlyPayment === 0) return { months: Infinity, totalInterest: Infinity };
  let months = 0;
  let totalInterest = 0;
  while (balance > 0) {
    const result = calculateLoanGroupPayment({ subLoans: loans, regularPayment: monthlyPayment });
    if (result.balanceAfter >= balance) return { months: Infinity, totalInterest: Infinity };
    totalInterest = roundCurrency(totalInterest + result.interest);
    loans = loans.map((loan, i) => ({ ...loan, balance: result.loanPayments[i].balanceAfter }));
    balance = result.balanceAfter;
    months++;
  }
  return { months, totalInterest };
}

export function buildDebtEntries({ fixedExpenses, variableExpenses, fixedEntries, varEntries, debts, loanGroups, month, year, interestOverrides = {} }) {
  const items = [
    ...fixedExpenses.map((expense) => ({ expense, actual: fixedEntries.find((entry) => entry.id === expense.id)?.actual })),
    ...variableExpenses.map((expense) => ({ expense, actual: varEntries.find((entry) => entry.id === expense.id)?.actual })),
  ];
  return [
    ...debts.map((debt) => ({ debt, debtType: 'debt' })),
    ...loanGroups.map((debt) => ({ debt, debtType: 'loanGroup' })),
  ].flatMap(({ debt, debtType }) => {
    const linkedItems = items.filter(({ expense, actual }) =>
      expense.linkedDebtId === debt.id && expense.linkedDebtType === debtType && actual != null
    ).map(({ expense, actual }) => {
      const amount = Number(actual);
      requireNonNegative(amount, `${expense.name} payment`);
      const scheduledEscrow = expense.escrowAmount
        ? getAmountForMonth(expense.escrowAmount, expense.frequency, expense.applicableMonths, month, year)
        : 0;
      if (amount > 0 && scheduledEscrow > amount) {
        throw new RangeError(`${expense.name}: escrow/fees exceed the actual payment.`);
      }
      return {
        id: expense.id, name: expense.name, amount: roundCurrency(amount),
        escrowAmount: amount > 0 ? scheduledEscrow : 0,
        principalOnly: expense.principalOnly === true,
      };
    });
    if (linkedItems.length === 0) return [];
    const sumPayments = (principalOnly) => roundCurrency(linkedItems.filter((item) => item.principalOnly === principalOnly)
      .reduce((sum, item) => sum + item.amount - item.escrowAmount, 0));
    const regularPayment = sumPayments(false);
    const principalOnlyPayment = sumPayments(true);
    if (regularPayment + principalOnlyPayment === 0) return [];
    const interestOverride = interestOverrides[`${debtType}:${debt.id}`];
    const input = {
      regularPayment, principalOnlyPayment,
      ...(interestOverride !== undefined && interestOverride !== '' ? { interestOverride: Number(interestOverride) } : {}),
    };
    const result = debtType === 'debt'
      ? calculateLoanPayment({ ...input, balance: debt.balance || 0, annualRate: debt.interestRate || 0 })
      : calculateLoanGroupPayment({ ...input, subLoans: debt.subLoans || [] });
    return [{
      debtId: debt.id, debtType, name: debt.name, currentBalance: result.balanceBefore,
      ...input, ...result, linkedItems,
    }];
  });
}
