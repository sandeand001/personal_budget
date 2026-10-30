import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateAllStreamDeductions, calculateMonthlyTakeHome } from '../src/lib/taxEngine.js';

const stream = {
  id: 'salary', name: 'Salary', grossAmount: 5000, takeHomeAmount: 3500,
  frequency: 'monthly', isTaxable: true, type: 'w2',
};
const input = {
  incomeStreams: [stream], streamResults: calculateAllStreamDeductions([stream]).streams,
  isSimpleMode: false, month: 10, year: 2026,
};

test('spending money starts with estimated take-home, not gross wages', () => {
  assert.equal(calculateMonthlyTakeHome(input), 4199.17);
});

test('simple mode does not deduct taxes from an already-net paycheck', () => {
  assert.equal(calculateMonthlyTakeHome({ ...input, isSimpleMode: true }), 3500);
});

test('paystub deductions are subtracted once from actual gross income', () => {
  const manual = { ...stream, manualDeductions: {
    enabled: true, federalTax: 500, fica: 382.50, retirement: 100,
  } };
  assert.equal(calculateMonthlyTakeHome({
    ...input, incomeStreams: [manual], streamResults: calculateAllStreamDeductions([manual]).streams,
    incomeLog: { incomeBasis: 'gross', total: 6000, entries: [{ id: 'salary', actual: 6000 }] },
  }), 5017.50);
});

test('locked take-home actuals are not taxed again when the display mode changes', () => {
  assert.equal(calculateMonthlyTakeHome({
    ...input, incomeLog: { incomeBasis: 'take_home', total: 3700 },
  }), 3700);
});

test('new income locks preserve their net snapshot even after tax settings change', () => {
  assert.equal(calculateMonthlyTakeHome({
    ...input, incomeLog: { incomeBasis: 'gross', total: 6000, netTotal: 4800 },
  }), 4800);
});

test('a zero actual gross payment does not incur scheduled paystub deductions', () => {
  const manual = { ...stream, manualDeductions: { enabled: true, federalTax: 500 } };
  assert.equal(calculateMonthlyTakeHome({
    ...input, incomeStreams: [manual], streamResults: calculateAllStreamDeductions([manual]).streams,
    incomeLog: { incomeBasis: 'gross', total: 0, entries: [{ id: 'salary', actual: 0 }] },
  }), 0);
});
