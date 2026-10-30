import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FREQUENCIES, getAmountForMonth, getAnnualBonus, getStreamMonthTotal, toAnnual,
} from '../src/lib/financial.js';
import { calcPayoff } from '../src/lib/debt.js';
import { calculateStreamDeductions } from '../src/lib/taxEngine.js';

const sumMonths = (callback) => Array.from({ length: 12 }, (_, i) => callback(i + 1))
  .reduce((sum, value) => sum + value, 0);
const cents = (value) => Math.round(value * 100);

for (const year of [2024, 2026]) {
  for (const { value: frequency } of FREQUENCIES) {
    test(`${frequency}: monthly estimates conserve the annual total in ${year}`, () => {
      const monthly = sumMonths((month) => getAmountForMonth(123.45, frequency, [], month, year));
      assert.equal(cents(monthly), cents(toAnnual(123.45, frequency)));
    });
  }
}

test('annual totals honor the selected irregular-payment months', () => {
  assert.equal(toAnnual(100, 'quarterly', [2, 8]), 200);
  assert.equal(toAnnual(100, 'annual', [3, 10]), 200);
});

for (const frequency of ['weekly', 'biweekly', 'semimonthly', 'monthly', 'quarterly']) {
  test(`${frequency}: annual per-check bonuses equal their monthly projections`, () => {
    const stream = {
      grossAmount: 1000, frequency, applicableMonths: [3, 6, 9, 12],
      bonusEnabled: true, bonuses: [{ amount: 500, months: [3, 12] }],
    };
    const monthlyBonuses = sumMonths((month) =>
      getStreamMonthTotal(stream, false, month, 2026)
      - getAmountForMonth(stream.grossAmount, frequency, stream.applicableMonths, month, 2026));
    assert.equal(cents(getAnnualBonus(stream, 2026)), cents(monthlyBonuses));
  });
}

test('payoff charges only the final partial installment', () => {
  assert.deepEqual(calcPayoff(1000, 12, 600), { months: 2, totalInterest: 14.10 });
});

test('an already-paid loan has zero months and zero future interest', () => {
  assert.deepEqual(calcPayoff(0, 6, 500), { months: 0, totalInterest: 0 });
});

test('payments that do not cover interest do not produce a finite payoff', () => {
  assert.deepEqual(calcPayoff(1000, 12, 10), { months: Infinity, totalInterest: Infinity });
});

test('zero-rate payoff has no interest, including the final partial installment', () => {
  assert.deepEqual(calcPayoff(1000, 0, 600), { months: 2, totalInterest: 0 });
});

const taxableStream = {
  id: 'salary', name: 'Salary', grossAmount: 5000,
  frequency: 'monthly', periodsPerYear: 12, isTaxable: true, type: 'w2',
};

test('extra monthly withholding reduces calculated take-home pay', () => {
  const normal = calculateStreamDeductions(taxableStream, {}, {});
  const extra = calculateStreamDeductions(taxableStream, {}, { extraWithholding: 100 });
  assert.equal(cents(normal.netAnnual - extra.netAnnual), 120000);
  assert.equal(cents(extra.totalDeductions - normal.totalDeductions), 120000);
});

test('paystub federal withholding already includes any extra withholding', () => {
  const manual = { enabled: true, federalTax: 500, stateTax: 0, fica: 382.50, retirement: 100 };
  const result = calculateStreamDeductions(
    { ...taxableStream, manualDeductions: manual }, {}, { extraWithholding: 100 },
  );
  assert.equal(result.netAnnual, 48210);
});

test('tax annualization uses actual selected payment months', () => {
  const result = calculateStreamDeductions({
    ...taxableStream, grossAmount: 1000, frequency: 'quarterly',
    applicableMonths: [3, 9], periodsPerYear: 4, isTaxable: false,
  });
  assert.equal(result.grossAnnual, 2000);
});
