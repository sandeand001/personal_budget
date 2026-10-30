import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDebtEntries, calcLoanGroupPayoff, calcPayoff, calculateLoanGroupPayment, calculateLoanPayment,
} from '../src/lib/debt.js';

test('regular mortgage payments account for monthly interest', () => {
  const result = calculateLoanPayment({ balance: 344266.62, annualRate: 6, regularPayment: 2500 });
  assert.equal(result.interest, 1721.33);
  assert.equal(result.balanceAfter, 343487.95);
  assert.equal(result.balanceReduction, 778.67);
});

test('principal-only payments reduce principal dollar for dollar, without another month of interest', () => {
  const result = calculateLoanPayment({ balance: 344266.62, annualRate: 6, principalOnlyPayment: 4000 });
  assert.equal(result.interest, 0);
  assert.equal(result.balanceAfter, 340266.62);
});

test('regular and extra-principal payments accrue interest only once', () => {
  const result = calculateLoanPayment({
    balance: 344266.62, annualRate: 6, regularPayment: 2500, principalOnlyPayment: 4000,
  });
  assert.equal(result.interest, 1721.33);
  assert.equal(result.balanceAfter, 339487.95);
});

test('multiple months with multiple principal-only payments do not omit interest', () => {
  let balance = 344266.62;
  for (let month = 1; month <= 6; month++) {
    balance = calculateLoanPayment({
      balance, annualRate: 6, regularPayment: 2500, principalOnlyPayment: [2, 5].includes(month) ? 4000 : 0,
    }).balanceAfter;
  }
  assert.equal(balance, 331435.22);
});

test('lender interest can override the monthly estimate, including zero', () => {
  assert.equal(calculateLoanPayment({
    balance: 1000, annualRate: 12, regularPayment: 100, interestOverride: 8.22,
  }).balanceAfter, 908.22);
  assert.equal(calculateLoanPayment({
    balance: 1000, annualRate: 12, regularPayment: 100, interestOverride: 0,
  }).balanceAfter, 900);
});

test('overpayments cannot make a loan balance negative', () => {
  const result = calculateLoanPayment({ balance: 100, annualRate: 12, regularPayment: 200 });
  assert.equal(result.balanceAfter, 0);
  assert.equal(result.unappliedPayment, 99);
  assert.equal(result.balanceReduction, 100);
});

test('uncovered interest increases the estimated balance rather than silently disappearing', () => {
  const result = calculateLoanPayment({ balance: 1000, annualRate: 12, regularPayment: 5 });
  assert.equal(result.balanceAfter, 1005);
  assert.equal(result.balanceReduction, -5);
});

test('loan groups accrue at each sub-loan rate, conserving cents', () => {
  const result = calculateLoanGroupPayment({
    subLoans: [
      { id: 'a', balance: 1000, interestRate: 12 },
      { id: 'b', balance: 1000, interestRate: 6 },
    ],
    regularPayment: 100, principalOnlyPayment: 200,
  });
  assert.equal(result.interest, 15);
  assert.equal(result.balanceAfter, 1715);
  assert.equal(Math.round(result.loanPayments.reduce((sum, loan) => sum + loan.balanceAfter, 0) * 100), 171500);
});

test('a group overpayment clears all sub-loans and records unapplied money', () => {
  const result = calculateLoanGroupPayment({
    subLoans: [
      { id: 'a', balance: 10, interestRate: 0 },
      { id: 'b', balance: 10, interestRate: 120 },
    ],
    regularPayment: 20.50,
  });
  assert.equal(result.balanceAfter, 0.50);
  const paidOff = calculateLoanGroupPayment({
    subLoans: [{ id: 'a', balance: 0.01, interestRate: 0 }, { id: 'b', balance: 0.02, interestRate: 0 }],
    principalOnlyPayment: 100,
  });
  assert.equal(paidOff.balanceAfter, 0);
  assert.equal(paidOff.unappliedPayment, 99.97);
});

test('group payoff uses changing sub-loan balances instead of a fixed weighted interest rate', () => {
  assert.deepEqual(calcLoanGroupPayoff([
    { id: 'a', balance: 500, interestRate: 12 },
    { id: 'b', balance: 500, interestRate: 0 },
  ], 600), { months: 2, totalInterest: 7.05 });
});

test('payoff edge cases and invalid inputs are explicit', () => {
  assert.deepEqual(calcPayoff(1000, 0, 0), { months: Infinity, totalInterest: 0 });
  assert.deepEqual(calcPayoff(1000, 12, 2000), { months: 1, totalInterest: 10 });
  assert.throws(() => calcPayoff(1000, -1, 100), /non-negative/);
  assert.throws(() => calculateLoanPayment({ balance: 1000, annualRate: NaN, regularPayment: 100 }), /non-negative/);
  assert.deepEqual(calcPayoff(0.01, 0.000001, 0.01), { months: 1, totalInterest: 0 });
  assert.deepEqual(calcPayoff(0.07, 0, 0.01), { months: 7, totalInterest: 0 });
});

test('payoff agrees with an independent cent-rounded amortization schedule', () => {
  for (const principal of [0.01, 100, 1000, 344266.62]) {
    for (const rate of [0, 0.000001, 3.5, 6, 12, 29.99]) {
      for (const factor of [0.02, 0.1, 0.6, 2]) {
        const payment = Math.max(1, Math.round((principal * rate / 1200 + principal * factor) * 100));
        let balance = Math.round(principal * 100);
        let interest = 0;
        let months = 0;
        while (balance > 0) {
          const charge = Math.round(balance * rate / 1200);
          interest += charge;
          balance = Math.max(0, balance + charge - payment);
          months++;
        }
        assert.deepEqual(calcPayoff(principal, rate, payment / 100), { months, totalInterest: interest / 100 });
      }
    }
  }
});

test('linked debt payments use edited actuals and exclude escrow while preserving principal-only flags', () => {
  const entries = buildDebtEntries({
    fixedExpenses: [{
      id: 'mortgage-expense', name: 'Mortgage', amount: 3000, escrowAmount: 500,
      frequency: 'monthly', linkedDebtId: 'loan', linkedDebtType: 'debt',
    }],
    variableExpenses: [{
      id: 'extra', name: 'Extra', amount: 5000, frequency: 'monthly',
      linkedDebtId: 'loan', linkedDebtType: 'debt', principalOnly: true,
    }],
    fixedEntries: [{ id: 'mortgage-expense', actual: 2800 }],
    varEntries: [{ id: 'extra', actual: 4000 }],
    debts: [{ id: 'loan', name: 'Loan', balance: 344266.62, interestRate: 6 }], loanGroups: [],
    month: 10, year: 2026,
  });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].regularPayment, 2300);
  assert.equal(entries[0].principalOnlyPayment, 4000);
  assert.equal(entries[0].payment, 6300);
  assert.equal(entries[0].balanceAfter, 339687.95);
});
