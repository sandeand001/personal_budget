import { getSpendingSummary, roundCurrency } from './financial.js';
import { calculateLoanGroupPayment, calculateLoanPayment } from './debt.js';

function validateMonth(yearMonth) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) throw new Error('Choose a valid expense month.');
}

function debtCollection(entry) {
  if (entry.debtType === 'debt') return 'debts';
  if (entry.debtType === 'loanGroup') return 'loanGroups';
  throw new Error('The linked debt type is invalid.');
}

async function readAccounts(transaction, ref, debtEntries, profileAmounts) {
  const keys = debtEntries.map((entry) => `${debtCollection(entry)}:${entry.debtId}`);
  if (new Set(keys).size !== keys.length) throw new Error('A loan cannot be applied twice in the same month.');
  const debtRefs = debtEntries.map((entry) => ref(debtCollection(entry), entry.debtId));
  const profileRefs = Object.keys(profileAmounts).map((id) => ref('budgetProfiles', id));
  const snapshots = await Promise.all([...debtRefs, ...profileRefs].map((target) => transaction.get(target)));
  if (snapshots.some((snapshot) => !snapshot.exists())) {
    throw new Error('A linked loan or budget profile was deleted. Review the month before continuing.');
  }
  return {
    debtRefs, profileRefs,
    debts: snapshots.slice(0, debtRefs.length).map((snapshot) => snapshot.data()),
    profiles: snapshots.slice(debtRefs.length).map((snapshot, i) => ({
      ...snapshot.data(), id: Object.keys(profileAmounts)[i],
    })),
  };
}

function validateActuals(payload) {
  for (const entry of [...payload.fixedEntries, ...payload.varEntries]) {
    if (!Number.isFinite(Number(entry.actual)) || Number(entry.actual) < 0) {
      throw new Error('Actual expenses must be non-negative numbers.');
    }
  }
}

export async function recordExpenseLock(transaction, { ref, yearMonth, payload, lockedAt }) {
  validateMonth(yearMonth);
  validateActuals(payload);
  const logRef = ref('monthlyExpenseLogs', yearMonth);
  if ((await transaction.get(logRef)).exists()) {
    throw new Error('This month is already locked. Unlock it before applying payments again.');
  }
  const entries = payload.debtEntries || [];
  const accounts = await readAccounts(transaction, ref, entries, payload.profileAmounts || {});
  const summary = getSpendingSummary({
    income: payload.startingAmount, useBalance: payload.useBalance, balanceAmount: payload.balanceAmount,
    fixedEntries: payload.fixedEntries, varEntries: payload.varEntries,
    profiles: accounts.profiles, splitOverrides: payload.profileAmounts,
  });
  if (summary.allocationError) throw new Error(summary.allocationError);
  const appliedEntries = entries.map((entry, i) => {
    const account = accounts.debts[i];
    if (account.lastExpensePaymentMonth && account.lastExpensePaymentMonth >= yearMonth) {
      throw new Error(`${entry.name}: lock loan payments in chronological order.`);
    }
    const input = {
      regularPayment: entry.regularPayment,
      principalOnlyPayment: entry.principalOnlyPayment,
      ...(entry.interestOverride != null ? { interestOverride: entry.interestOverride } : {}),
    };
    const result = entry.debtType === 'debt'
      ? calculateLoanPayment({ ...input, balance: account.balance || 0, annualRate: account.interestRate || 0 })
      : calculateLoanGroupPayment({ ...input, subLoans: account.subLoans || [] });
    return {
      ...entry, ...result, currentBalance: result.balanceBefore,
      previousPaymentMonth: account.lastExpensePaymentMonth || null,
    };
  });
  // All reads and validation precede writes; Firestore commits the whole month atomically.
  appliedEntries.forEach((entry, i) => {
    const update = entry.debtType === 'debt'
      ? { balance: entry.balanceAfter }
      : { subLoans: accounts.debts[i].subLoans.map((loan) => ({
        ...loan, balance: entry.loanPayments.find((payment) => payment.id === loan.id).balanceAfter,
      })) };
    transaction.update(accounts.debtRefs[i], { ...update, lastExpensePaymentMonth: yearMonth });
  });
  summary.profileAmounts.forEach((profile, i) => {
    transaction.update(accounts.profileRefs[i], {
      totalBudget: roundCurrency((accounts.profiles[i].totalBudget || 0) + profile.amount),
    });
  });
  const profileAmounts = Object.fromEntries(summary.profileAmounts.map((profile) => [profile.id, profile.amount]));
  transaction.set(logRef, {
    ...payload, ...summary, profileAmounts, debtEntries: appliedEntries,
    accountingVersion: 2, lockedAt,
  });
}

export async function reverseExpenseLock(transaction, { ref, yearMonth }) {
  validateMonth(yearMonth);
  const logRef = ref('monthlyExpenseLogs', yearMonth);
  const logSnapshot = await transaction.get(logRef);
  if (!logSnapshot.exists()) throw new Error('This month is not locked.');
  const log = logSnapshot.data();
  const entries = (log.debtEntries || []).filter((entry) => entry.payment > 0);
  const accounts = await readAccounts(transaction, ref, entries, log.profileAmounts || {});
  const updates = entries.map((entry, i) => {
    const account = accounts.debts[i];
    if (account.lastExpensePaymentMonth && account.lastExpensePaymentMonth !== yearMonth) {
      throw new Error(`${entry.name}: unlock later loan-payment months first.`);
    }
    const previousPaymentMonth = entry.previousPaymentMonth || null;
    if (entry.debtType === 'debt') {
      const before = entry.balanceBefore ?? entry.currentBalance;
      const after = entry.balanceAfter ?? Math.max(0, roundCurrency(before - entry.payment));
      if (!Number.isFinite(before) || roundCurrency(account.balance || 0) !== after) {
        throw new Error(`${entry.name}: the balance changed after lock-in. Reconcile it with the lender before changing this historical lock.`);
      }
      return { balance: before, lastExpensePaymentMonth: previousPaymentMonth };
    }
    if (!entry.loanPayments) {
      throw new Error(`${entry.name}: this older lock has no per-loan history, so it cannot be safely reversed. Reconcile the sub-loan balances with the lender.`);
    }
    const loans = account.subLoans || [];
    if (loans.length !== entry.loanPayments.length || loans.some((loan) => {
      const payment = entry.loanPayments.find((item) => item.id === loan.id);
      return !payment || roundCurrency(loan.balance || 0) !== payment.balanceAfter;
    })) {
      throw new Error(`${entry.name}: sub-loan balances changed after lock-in. Reconcile them with the lender before changing this historical lock.`);
    }
    return {
      subLoans: loans.map((loan) => ({
        ...loan, balance: entry.loanPayments.find((payment) => payment.id === loan.id).balanceBefore,
      })),
      lastExpensePaymentMonth: previousPaymentMonth,
    };
  });
  updates.forEach((update, i) => transaction.update(accounts.debtRefs[i], update));
  Object.entries(log.profileAmounts || {}).forEach(([, amount], i) => {
    transaction.update(accounts.profileRefs[i], {
      totalBudget: roundCurrency((accounts.profiles[i].totalBudget || 0) - amount),
    });
  });
  transaction.delete(logRef);
}
