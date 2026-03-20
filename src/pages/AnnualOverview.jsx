import { useMemo } from 'react';
import { CalendarRange, Lock, Calendar } from 'lucide-react';
import { useIncomeStreams, useExpenses, useFixedExpenses, useMonthlyIncomeLog } from '../hooks/useFirestore';
import { FREQUENCIES, MONTH_NAMES, MONTH_NAMES_FULL, getAmountForMonth, formatCurrency, formatCurrencyShort, getStreamAmount, getStreamMonthTotal } from '../lib/financial';
import { usePrivacy } from '../contexts/PrivacyContext';
import { useAppMode } from '../contexts/AppModeContext';
import { cn } from '../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';

export default function AnnualOverview() {
  const { streams } = useIncomeStreams();
  const { expenses } = useExpenses();
  const { expenses: fixedExpensesList } = useFixedExpenses();
  const { logs } = useMonthlyIncomeLog();
  const { isSimpleMode } = useAppMode();
  usePrivacy();
  const currentYear = new Date().getFullYear();

  const monthlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const yearMonth = `${currentYear}-${String(month).padStart(2, '0')}`;
      const locked = logs[yearMonth];

      const income = locked
        ? locked.total
        : streams.reduce(
            (sum, s) => sum + getStreamMonthTotal(s, isSimpleMode, month),
            0
          );
      const fixedExp = fixedExpensesList.filter((e) => !(e.isOptional && e.disabled)).reduce(
        (sum, e) => sum + getAmountForMonth(e.amount, e.frequency, e.applicableMonths, month),
        0
      );
      const varExp = expenses.reduce(
        (sum, e) => sum + getAmountForMonth(e.amount, e.frequency, e.applicableMonths, month),
        0
      );
      return {
        month,
        name: MONTH_NAMES[i],
        fullName: MONTH_NAMES_FULL[i],
        income,
        expenses: fixedExp + varExp,
        fixedExpenses: fixedExp,
        variableExpenses: varExp,
        net: income - fixedExp - varExp,
        isLocked: !!locked,
      };
    });
  }, [streams, expenses, fixedExpensesList, logs, currentYear]);

  const annualIncome = monthlyData.reduce((s, m) => s + m.income, 0);
  const annualExpenses = monthlyData.reduce((s, m) => s + m.expenses, 0);
  const annualNet = annualIncome - annualExpenses;

  const irregularIncome = streams.filter((s) => ['quarterly', 'bimonthly', 'annual'].includes(s.frequency));
  const irregularFixed = fixedExpensesList.filter((e) => ['quarterly', 'bimonthly', 'annual'].includes(e.frequency));
  const irregularExpenses = expenses.filter((e) => ['quarterly', 'bimonthly', 'annual'].includes(e.frequency));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CalendarRange className="w-7 h-7 text-emerald-600" /> Annual Overview — {currentYear}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Month-by-month breakdown of income vs expenses for the full year.
        </p>
      </div>

      {/* Annual Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">{isSimpleMode ? 'Annual Take-Home' : 'Annual Income'}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(annualIncome)}</p>
          <p className="text-xs text-gray-400 mt-1">avg {formatCurrency(annualIncome / 12)}/mo</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Annual Expenses</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{formatCurrency(annualExpenses)}</p>
          <p className="text-xs text-gray-400 mt-1">avg {formatCurrency(annualExpenses / 12)}/mo</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Annual Net</p>
          <p className={`text-2xl font-bold mt-1 ${annualNet >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(annualNet)}</p>
          <p className="text-xs text-gray-400 mt-1">avg {formatCurrency(annualNet / 12)}/mo</p>
        </div>
      </div>

      {/* Month-by-Month Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Month-by-Month Overview</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrencyShort(v)} />
            <Tooltip formatter={(v) => formatCurrency(v)} />
            <Legend />
            <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Month-by-Month Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Monthly Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Month</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Income</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Expenses</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {monthlyData.map((m) => (
                <tr key={m.month} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    <span className="flex items-center gap-1.5">
                      {m.fullName}
                      {m.isLocked && <Lock className="w-3 h-3 text-blue-500" title="Income locked in" />}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(m.income)}</td>
                  <td className="px-4 py-3 text-right text-red-500">{formatCurrency(m.expenses)}</td>
                  <td className={cn('px-4 py-3 text-right font-medium', m.net >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {formatCurrency(m.net)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 dark:bg-gray-700/50 font-semibold">
                <td className="px-4 py-3 text-gray-900 dark:text-white">Total</td>
                <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(annualIncome)}</td>
                <td className="px-4 py-3 text-right text-red-500">{formatCurrency(annualExpenses)}</td>
                <td className={cn('px-4 py-3 text-right', annualNet >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                  {formatCurrency(annualNet)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Irregular Items Callout */}
      {(irregularIncome.length > 0 || irregularFixed.length > 0 || irregularExpenses.length > 0) && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Non-Monthly Items
          </h4>
          <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
            These items only occur in specific months and cause the variations in the chart above.
          </p>
          <div className="space-y-1.5 text-sm text-amber-700 dark:text-amber-400">
            {irregularIncome.map((s) => (
              <div key={s.id} className="flex justify-between">
                <span>+ {s.name} ({FREQUENCIES.find((f) => f.value === s.frequency)?.label})</span>
                <span>{formatCurrency(getStreamAmount(s, isSimpleMode))} in {(s.applicableMonths || []).map((m) => MONTH_NAMES[m - 1]).join(', ')}</span>
              </div>
            ))}
            {irregularFixed.map((e) => (
              <div key={e.id} className="flex justify-between">
                <span>- {e.name} (fixed, {FREQUENCIES.find((f) => f.value === e.frequency)?.label})</span>
                <span>{formatCurrency(e.amount)} in {(e.applicableMonths || []).map((m) => MONTH_NAMES[m - 1]).join(', ')}</span>
              </div>
            ))}
            {irregularExpenses.map((e) => (
              <div key={e.id} className="flex justify-between">
                <span>- {e.name} ({FREQUENCIES.find((f) => f.value === e.frequency)?.label})</span>
                <span>{formatCurrency(e.amount)} in {(e.applicableMonths || []).map((m) => MONTH_NAMES[m - 1]).join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
