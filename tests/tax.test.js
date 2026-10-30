import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculate401k, calculateAllDeductions, calculateAllStreamDeductions,
  calculateChildTaxCredit, calculateFederalTax, calculateFICA, calculateStreamDeductions,
} from '../src/lib/taxEngine.js';

const bracketCases = [
  ['single', 16100, [[12400, 1240], [50400, 5800], [105700, 17966], [201775, 41024], [256225, 58448], [640600, 192979.25]]],
  ['married_jointly', 32200, [[24800, 2480], [100800, 11600], [211400, 35932], [403550, 82048], [512450, 116896], [768700, 206583.50]]],
  ['married_separately', 16100, [[12400, 1240], [50400, 5800], [105700, 17966], [201775, 41024], [256225, 58448], [384350, 103291.75]]],
  ['head_of_household', 24150, [[17700, 1770], [67450, 7740], [105700, 16155], [201750, 39207], [256200, 56631], [640600, 191171]]],
];

for (const [status, deduction, brackets] of bracketCases) {
  test(`2026 federal tax matches IRS threshold examples for ${status}`, () => {
    assert.equal(calculateFederalTax(deduction, status), 0);
    for (const [taxableIncome, expected] of brackets) {
      assert.equal(calculateFederalTax(taxableIncome + deduction, status), expected);
    }
    const [top, tax] = brackets.at(-1);
    assert.equal(calculateFederalTax(top + deduction + 100, status), tax + 37);
  });
}

test('2026 Social Security wage cap is $184,500', () => {
  assert.equal(calculateFICA(200000, true).socialSecurity, 11439);
  assert.equal(calculateFICA(300000, true).socialSecurity, 11439);
});

test('self-employment income below the filing threshold has no SE tax', () => {
  assert.equal(calculateFICA(300, false).total, 0);
});

test('self-employment includes additional Medicare but does not deduct half of that additional tax', () => {
  const result = calculateFICA(300000, false);
  const earnings = 300000 * 0.9235;
  const ss = 184500 * 0.124;
  const basicMedicare = earnings * 0.029;
  const additional = (earnings - 200000) * 0.009;
  assert.equal(result.total, Math.round((ss + basicMedicare + additional) * 100) / 100);
  assert.equal(result.deductibleHalf, Math.round((ss + basicMedicare) / 2 * 100) / 100);
});

test('combined W-2 and SE income do not each receive a separate Social Security wage cap', () => {
  const result = calculateAllDeductions({
    incomeStreams: [
      { amount: 200000, periodsPerYear: 1, type: 'w2', isTaxable: true },
      { amount: 10000, periodsPerYear: 1, type: '1099', isTaxable: true },
    ],
  });
  assert.equal(result.fica1099.socialSecurity, 0);
});

test('traditional and Roth 401(k) contributions share the 2026 elective-deferral limit', () => {
  const result = calculate401k(200000, 10, 10);
  assert.equal(result.total, 24500);
  assert.equal(result.traditional, 12250);
  assert.equal(result.roth, 12250);
});

test('child tax credit is capped by tax and phased out at high income', () => {
  assert.equal(calculateChildTaxCredit(1, 10000, 100000, 'single'), 2200);
  assert.equal(calculateChildTaxCredit(1, 10000, 200001, 'single'), 2150);
  assert.equal(calculateChildTaxCredit(1, 10000, 244000, 'single'), 0);
  assert.equal(calculateChildTaxCredit(2, 1000, 100000, 'married_jointly'), 1000);
});

test('household tax settings override obsolete stream tax-profile fields', () => {
  const stream = { id: 'a', amount: 5000, frequency: 'monthly', isTaxable: true, taxProfile: { state: 'CA' } };
  assert.equal(calculateStreamDeductions(stream, {}, { state: 'TX' }).stateTax, 0);
});

test('aggregates conserve gross minus deductions equals net, without combining taxpayers', () => {
  const result = calculateAllStreamDeductions([
    { id: 'a', amount: 5000, frequency: 'monthly', isTaxable: true },
    { id: 'b', amount: 2500, frequency: 'monthly', isTaxable: true },
  ], {}, { extraWithholding: 100 });
  assert.equal(Math.round((result.totals.totalGrossAnnual - result.totals.totalDeductions) * 100),
    Math.round(result.totals.totalNet * 100));
  assert.equal(result.streams.length, 2);
  assert.equal(result.totals.totalExtraWithholding, 1200);
});
