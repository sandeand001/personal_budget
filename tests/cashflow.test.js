import assert from 'node:assert/strict';
import test from 'node:test';
import { allocateMoney, buildMonthlyOverview, getLockedExpenseSummary, getSpendingSummary, roundCurrency } from '../src/lib/financial.js';

test('even allocations conserve every cent', () => {
  assert.deepEqual(allocateMoney(100, [1, 1, 1]), [33.34, 33.33, 33.33]);
  assert.deepEqual(allocateMoney(0.01, [1, 1, 1]), [0.01, 0, 0]);
  assert.deepEqual(allocateMoney(0, [0, 0]), [0, 0]);
});

test('weighted allocations conserve money across varied balances', () => {
  for (let cents = 1; cents <= 1000; cents++) {
    const amounts = allocateMoney(cents / 100, [0, 1, 3, 7, 11]);
    assert.equal(Math.round(amounts.reduce((sum, amount) => sum + amount, 0) * 100), cents);
    assert.equal(amounts[0], 0);
  }
  assert.throws(() => allocateMoney(1, [0, 0]), /positive weight/);
  assert.throws(() => allocateMoney(-1, [1]), /non-negative/);
});

test('rounding treats positive and negative half-cents symmetrically', () => {
  assert.equal(roundCurrency(1.005), 1.01);
  assert.equal(roundCurrency(-1.005), -1.01);
  assert.throws(() => roundCurrency(Infinity), /finite/);
  assert.throws(() => roundCurrency(1e20), /cent precision/);
  assert.equal(Object.is(roundCurrency(-0.001), -0), false);
});

const spendingInput = {
  income: 5000, useBalance: false, balanceAmount: 0,
  fixedEntries: [{ id: 'rent', actual: 1000, alreadyPaid: true }],
  varEntries: [{ id: 'food', actual: 200 }],
  profiles: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }],
};

test('an enabled zero-dollar bank balance does not fall back to income', () => {
  const result = getSpendingSummary({ ...spendingInput, useBalance: true });
  assert.equal(result.startingAmount, 0);
  assert.equal(result.totalExpenses, 200);
  assert.equal(result.spendingMoney, 0);
  assert.deepEqual(result.profileAmounts.map((p) => p.amount), [0, 0, 0]);
});

test('already-paid expenses are excluded only when starting with the current bank balance', () => {
  assert.equal(getSpendingSummary(spendingInput).totalExpenses, 1200);
  assert.equal(getSpendingSummary({ ...spendingInput, useBalance: true }).totalExpenses, 200);
});

test('custom budget splits cannot create money', () => {
  const result = getSpendingSummary({ ...spendingInput, splitOverrides: { a: 3801, b: 0, c: 0 } });
  assert.match(result.allocationError, /exceed/);
  const negative = getSpendingSummary({ ...spendingInput, splitOverrides: { a: -1 } });
  assert.match(negative.allocationError, /negative/);
});

test('annual overview uses actual locked expenses, including already-paid bills', () => {
  const result = buildMonthlyOverview({
    year: 2026, isSimpleMode: true,
    streams: [{ takeHomeAmount: 1000, grossAmount: 2000, frequency: 'monthly' }],
    fixedExpenses: [{ amount: 300, frequency: 'monthly' }, { amount: 999, frequency: 'monthly', isOptional: true, disabled: true }],
    expenses: [{ amount: 100, frequency: 'monthly' }],
    incomeLogs: { '2026-01': { total: 1100 } },
    expenseLogs: { '2026-01': {
      fixedEntries: [{ actual: 350, alreadyPaid: true }], varEntries: [{ actual: 150 }],
      totalExpenses: 150, useBalance: true,
    } },
  });
  assert.equal(result[0].income, 1100);
  assert.equal(result[0].expenses, 500);
  assert.equal(result[0].net, 600);
  assert.equal(result[1].income, 1000);
  assert.equal(result[1].expenses, 400);
});

test('locked spending breakdown uses recorded actuals and budget allocations, not current forecasts', () => {
  const result = getLockedExpenseSummary({
    startingAmount: 10082, useBalance: false, balanceAmount: null,
    fixedEntries: [{ actual: 2800 }], varEntries: [{ actual: 4000 }],
    profileAmounts: { a: 1094, b: 1094, c: 1094 },
  }, [{ id: 'a', name: 'A', includeInSpendingSplit: false }]);
  assert.equal(result.fixedTotal, 2800);
  assert.equal(result.totalExpenses, 6800);
  assert.equal(result.spendingMoney, 3282);
  assert.deepEqual(result.profileAmounts.map((profile) => profile.amount), [1094, 1094, 1094]);
});

test('locked bank-balance cash flow retains its already-paid exclusions', () => {
  const result = getLockedExpenseSummary({
    startingAmount: 2000, useBalance: true, balanceAmount: 2000,
    fixedEntries: [{ actual: 1000, alreadyPaid: true }], varEntries: [{ actual: 500 }],
    profileAmounts: { a: 1500 },
  }, [{ id: 'a', name: 'A' }]);
  assert.equal(result.totalExpenses, 500);
  assert.equal(result.spendingMoney, 1500);
});
