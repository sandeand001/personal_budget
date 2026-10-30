import assert from 'node:assert/strict';
import test from 'node:test';
import { getBudgetSummary, getSavingsCategories, getVacationTotals } from '../src/lib/financial.js';

test('budget balances include transactions in removed categories and show them in charts', () => {
  const result = getBudgetSummary({
    totalBudget: 100, categories: [{ name: 'Food', allocated: 100 }],
  }, [{ category: 'Removed category', amount: 25 }, { category: 'Food', amount: 10 }]);
  assert.equal(result.totalSpent, 35);
  assert.equal(result.remaining, 65);
  assert.equal(result.pieData.reduce((sum, item) => sum + item.value, 0), 35);
  assert.equal(result.spent['Removed category'], 25);
});

test('budget overspending remains visible as a negative balance', () => {
  const result = getBudgetSummary({ totalBudget: 10, categories: [] }, [{ category: 'Other', amount: 12.34 }]);
  assert.equal(result.remaining, -2.34);
});

test('vacation totals distinguish planned costs, paid costs, and savings contributions', () => {
  const result = getVacationTotals({ savingsGoal: 1000 }, [
    { amount: 300, isPaid: true }, { amount: 200, isPaid: false },
  ], [{ amount: 250 }, { amount: 100 }]);
  assert.deepEqual(result, { totalExpenses: 500, paidExpenses: 300, totalContributions: 350, savingsPct: 35 });
});

test('legacy vacation goals survive editing without savings categories', () => {
  const categories = getSavingsCategories({ savingsGoal: 2500 });
  assert.deepEqual(categories, [{ name: 'General', goal: 2500 }]);
  assert.equal(categories.reduce((sum, category) => sum + category.goal, 0), 2500);
  assert.deepEqual(getSavingsCategories({ savingsGoal: 0, savingsCategories: [] }), []);
});
