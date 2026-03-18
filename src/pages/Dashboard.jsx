import {
  LayoutDashboard,
  DollarSign,
  Receipt,
  Wallet,
  Plane,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function SummaryCard({ title, value, subtitle, icon: Icon, color, to }) {
  return (
    <Link
      to={to}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition group"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(' ')[0] || 'there';

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {firstName} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Here's your financial overview at a glance.
        </p>
      </div>

      {/* Quick Start - collapsible */}
      <details className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <summary className="cursor-pointer text-sm font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Getting started? Click here for a quick guide
        </summary>
        <div className="mt-3 text-sm text-emerald-700 dark:text-emerald-400 space-y-2">
          <p>1. <strong>Income</strong> — Add your income streams (salary, side jobs, VA disability, etc.)</p>
          <p>2. <strong>Expenses</strong> — Set up your tax profile and add recurring expenses</p>
          <p>3. <strong>Budget</strong> — Create a spending budget and track your purchases</p>
          <p>4. <strong>Vacations</strong> — Plan trips, track costs, and set savings goals</p>
          <p>This dashboard will automatically populate as you add data!</p>
        </div>
      </details>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Income"
          value="$0.00"
          subtitle="No income streams yet"
          icon={DollarSign}
          color="bg-emerald-500"
          to="/income"
        />
        <SummaryCard
          title="Net Income"
          value="$0.00"
          subtitle="After deductions"
          icon={TrendingUp}
          color="bg-blue-500"
          to="/expenses"
        />
        <SummaryCard
          title="Budget Remaining"
          value="$0.00"
          subtitle="No budget set"
          icon={Wallet}
          color="bg-purple-500"
          to="/budget"
        />
        <SummaryCard
          title="Est. Tax Refund"
          value="$0.00"
          subtitle="Set up tax profile"
          icon={Receipt}
          color="bg-amber-500"
          to="/expenses"
        />
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h2>
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent transactions</p>
            <p className="text-xs mt-1">Start by adding income or budget entries</p>
          </div>
        </div>

        {/* Vacation Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Vacation Goals
          </h2>
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <Plane className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No vacations planned</p>
            <Link to="/vacations" className="text-xs text-emerald-600 hover:underline mt-1 inline-block">
              Plan your first trip →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
