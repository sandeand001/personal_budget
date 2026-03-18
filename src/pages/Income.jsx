import { DollarSign, Plus, Trash2, Edit2, Info } from 'lucide-react';

export default function Income() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Income</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your income streams and track total gross income.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition">
          <Plus className="w-4 h-4" />
          Add Income
        </button>
      </div>

      {/* How to use */}
      <details className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <summary className="cursor-pointer text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <Info className="w-4 h-4" />
          How to use this page
        </summary>
        <div className="mt-3 text-sm text-blue-700 dark:text-blue-400 space-y-1">
          <p>Add each source of income — salary, side jobs, rental income, VA disability, etc.</p>
          <p>Set the frequency (weekly, bi-weekly, semi-monthly, monthly, or annual) and whether it's taxable.</p>
          <p>Your totals are automatically calculated and shown on the Dashboard.</p>
        </div>
      </details>

      {/* Empty state */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <DollarSign className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No income streams yet</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Click "Add Income" to get started
        </p>
      </div>
    </div>
  );
}
