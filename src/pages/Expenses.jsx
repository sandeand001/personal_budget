import { Receipt, Plus, Info, Calculator } from 'lucide-react';

export default function Expenses() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses & Deductions</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Calculate deductions, track expenses, and see your net income.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition">
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      {/* How to use */}
      <details className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <summary className="cursor-pointer text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <Info className="w-4 h-4" />
          How to use this page
        </summary>
        <div className="mt-3 text-sm text-blue-700 dark:text-blue-400 space-y-1">
          <p>Set up your tax profile (filing status, state, dependents) to auto-calculate withholdings.</p>
          <p>Configure 401(k) contributions (traditional and/or Roth).</p>
          <p>Add variable expenses like rent, car payment, utilities, subscriptions, etc.</p>
          <p className="italic">⚠️ Tax calculations are estimates only — not tax advice.</p>
        </div>
      </details>

      {/* Tax Refund Estimate Card */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Calculator className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Projected Tax Refund / Amount Owed</h2>
        </div>
        <p className="text-3xl font-bold">$0.00</p>
        <p className="text-emerald-100 text-sm mt-1">Set up your tax profile to see your estimate</p>
      </div>

      {/* Empty state */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Receipt className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No expenses configured yet</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Set up your tax profile and add expenses to get started
        </p>
      </div>
    </div>
  );
}
