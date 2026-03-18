import { Plane, Plus, Info, Target } from 'lucide-react';

export default function Vacations() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vacation Planning</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Plan trips, track expenses, and save towards your goals.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition">
          <Plus className="w-4 h-4" />
          Plan a Trip
        </button>
      </div>

      {/* How to use */}
      <details className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <summary className="cursor-pointer text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <Info className="w-4 h-4" />
          How to use this page
        </summary>
        <div className="mt-3 text-sm text-blue-700 dark:text-blue-400 space-y-1">
          <p>Create a vacation plan and add expected expenses (airfare, hotel, etc.).</p>
          <p>Mark items as paid or unpaid to track progress.</p>
          <p>Set a savings goal and log contributions — the app will project when you'll hit your target.</p>
          <p>Plan multiple vacations at the same time!</p>
        </div>
      </details>

      {/* Empty state */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Plane className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No vacations planned yet</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Click "Plan a Trip" to start planning your next adventure
        </p>
      </div>
    </div>
  );
}
