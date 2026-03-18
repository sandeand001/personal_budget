import { useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Wallet,
  Receipt,
  Plane,
  Landmark,
  AlertCircle,
  Info,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppMode } from '../contexts/AppModeContext';
import { useIncomeStreams, useTaxProfile, useRetirement, useExpenses, useFixedExpenses, useBudgetProfiles, useVacations, useDebts } from '../hooks/useFirestore';
import { FREQUENCIES, toAnnual, toMonthly, formatCurrency, getPeriodsPerYear } from '../lib/financial';
import { usePrivacy } from '../contexts/PrivacyContext';
import { calculateAllDeductions } from '../lib/taxEngine';
import { cn } from '../lib/utils';

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
  const { isSimpleMode, toggleMode } = useAppMode();
  usePrivacy();
  const firstName = user?.displayName?.split(' ')[0] || 'there';

  const { streams } = useIncomeStreams();
  const { profile: taxProfile } = useTaxProfile();
  const { retirement } = useRetirement();
  const { expenses: variableExpenses } = useExpenses();
  const { expenses: fixedExpenses } = useFixedExpenses();
  const { profiles: budgetProfiles } = useBudgetProfiles();
  const { vacations } = useVacations();
  const { debts } = useDebts();

  // Income totals
  const totalGrossMonthly = useMemo(
    () => streams.reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0),
    [streams]
  );
  const totalGrossAnnual = totalGrossMonthly * 12;

  // Tax deductions
  const deductions = useMemo(() => {
    const preparedStreams = streams.map((s) => ({
      ...s,
      periodsPerYear: getPeriodsPerYear(s.frequency),
    }));
    return calculateAllDeductions({
      incomeStreams: preparedStreams,
      taxProfile: taxProfile || {},
      retirement: retirement || {},
    });
  }, [streams, taxProfile, retirement]);

  const variableAnnual = useMemo(
    () => variableExpenses.reduce((s, e) => s + toAnnual(e.amount, e.frequency), 0),
    [variableExpenses]
  );

  const fixedAnnual = useMemo(
    () => fixedExpenses.reduce((s, e) => s + toAnnual(e.amount, e.frequency), 0),
    [fixedExpenses]
  );

  const totalExpensesAnnual = variableAnnual + fixedAnnual;
  const allExpenses = [...fixedExpenses, ...variableExpenses];

  const netAnnual = deductions.netAnnual - totalExpensesAnnual;

  // Refund / owed
  const refundOwed = deductions.refundOrOwed || 0;

  // Budget remaining (sum across all profiles — not perfect without transactions but shows budget total)
  const totalBudgetMonthly = useMemo(
    () => budgetProfiles.reduce((s, p) => s + (p.totalBudget || 0), 0),
    [budgetProfiles]
  );

  // Debt total
  const totalDebt = useMemo(
    () => debts.reduce((s, d) => s + (d.balance || 0), 0),
    [debts]
  );

  // Vacation with highest savings progress
  const nextVacation = vacations.length > 0 ? vacations[0] : null;

  const freqLabel = (f) => {
    switch (f) {
      case 'weekly': return '/wk';
      case 'biweekly': return '/2wk';
      case 'semimonthly': return '/2×mo';
      case 'monthly': return '/mo';
      case 'bimonthly': return '/2mo';
      case 'quarterly': return '/qtr';
      case 'annual': return '/yr';
      default: return '/mo';
    }
  };

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

      {/* Mode Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMode}
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
          >
            {isSimpleMode
              ? <ToggleLeft className="w-8 h-8 text-gray-400" />
              : <ToggleRight className="w-8 h-8 text-emerald-500" />}
            <span className="font-medium text-sm">
              {isSimpleMode ? 'Simple Mode' : 'Detailed Mode'}
            </span>
          </button>
          <details className="inline">
            <summary className="cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <Info className="w-4 h-4 inline" />
            </summary>
            <div className="absolute mt-2 z-20 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-lg text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p><strong>Detailed Mode</strong> (default) gives you the full picture: gross income, W-2/1099 classification, tax brackets, FICA, 401(k) deductions, and a projected tax refund/owed estimate.</p>
              <p><strong>Simple Mode</strong> is for people who just want to enter the take-home pay they actually receive (net income). Tax calculations, 401(k), and paycheck deductions are all skipped. The Expenses page only shows bills you pay yourself — no tax or retirement sections.</p>
              <p className="italic text-xs">Tip: You can switch between modes at any time. Your data is preserved — switching modes only changes what the app shows you.</p>
            </div>
          </details>
        </div>
      </div>

      {/* Quick Start */}
      {streams.length === 0 && (
        <details className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4" open>
          <summary className="cursor-pointer text-sm font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Getting started? Click here for a quick guide
          </summary>
          <div className="mt-3 text-sm text-emerald-700 dark:text-emerald-400 space-y-2">
            {isSimpleMode ? (
              <>
                <p>1. <strong>Income</strong> — Enter your take-home (net) pay from each source</p>
                <p>2. <strong>Expenses</strong> — Add the bills and expenses you actually pay</p>
                <p>3. <strong>Budget</strong> — Create a spending budget and track your purchases</p>
                <p>4. <strong>Vacations</strong> — Plan trips, track costs, and set savings goals</p>
                <p>5. <strong>Debt</strong> — Track loans and plan repayment strategies</p>
              </>
            ) : (
              <>
                <p>1. <strong>Income</strong> — Add your income streams (salary, side jobs, VA disability, etc.)</p>
                <p>2. <strong>Expenses</strong> — Set up your tax profile and add recurring expenses</p>
                <p>3. <strong>Budget</strong> — Create a spending budget and track your purchases</p>
                <p>4. <strong>Vacations</strong> — Plan trips, track costs, and set savings goals</p>
                <p>5. <strong>Debt</strong> — Track loans and plan repayment strategies</p>
                <p>6. <strong>Settings</strong> — Invite household members to share your data</p>
              </>
            )}
          </div>
        </details>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isSimpleMode ? (
          <SummaryCard
            title="Take-Home Income"
            value={formatCurrency(totalGrossMonthly)}
            subtitle={streams.length > 0 ? `${streams.length} source${streams.length !== 1 ? 's' : ''} · ${formatCurrency(totalGrossAnnual)}/yr` : 'No income entered yet'}
            icon={DollarSign}
            color="bg-emerald-500"
            to="/income"
          />
        ) : (
          <>
            <SummaryCard
              title="Gross Income"
              value={formatCurrency(totalGrossMonthly)}
              subtitle={streams.length > 0 ? `${streams.length} stream${streams.length !== 1 ? 's' : ''} · ${formatCurrency(totalGrossAnnual)}/yr` : 'No income streams yet'}
              icon={DollarSign}
              color="bg-emerald-500"
              to="/income"
            />
            <SummaryCard
              title="Net Income"
              value={formatCurrency(netAnnual / 12)}
              subtitle={`After taxes, 401k & expenses · ${formatCurrency(netAnnual)}/yr`}
              icon={TrendingUp}
              color="bg-blue-500"
              to="/expenses"
            />
            <SummaryCard
              title={refundOwed >= 0 ? 'Est. Tax Refund' : 'Est. Tax Owed'}
              value={formatCurrency(Math.abs(refundOwed))}
              subtitle={refundOwed >= 0 ? 'Projected refund' : 'Projected amount owed'}
              icon={Receipt}
              color={refundOwed >= 0 ? 'bg-emerald-600' : 'bg-red-500'}
              to="/expenses"
            />
          </>
        )}
        <SummaryCard
          title="Expenses"
          value={formatCurrency(totalExpensesAnnual / 12)}
          subtitle={allExpenses.length > 0 ? `${fixedExpenses.length} fixed · ${variableExpenses.length} variable · ${formatCurrency(totalExpensesAnnual)}/yr` : 'No expenses yet'}
          icon={Receipt}
          color="bg-amber-500"
          to="/expenses"
        />
        <SummaryCard
          title="Budget Total"
          value={formatCurrency(totalBudgetMonthly)}
          subtitle={budgetProfiles.length > 0 ? `${budgetProfiles.length} profile${budgetProfiles.length !== 1 ? 's' : ''}` : 'No budget set'}
          icon={Wallet}
          color="bg-purple-500"
          to="/budget"
        />
        <SummaryCard
          title="Total Debt"
          value={formatCurrency(totalDebt)}
          subtitle={debts.length > 0 ? `${debts.length} account${debts.length !== 1 ? 's' : ''}` : 'No debts tracked'}
          icon={Landmark}
          color="bg-red-500"
          to="/debt"
        />
        <SummaryCard
          title="Vacations"
          value={vacations.length.toString()}
          subtitle={nextVacation ? `Next: ${nextVacation.name}` : 'No trips planned'}
          icon={Plane}
          color="bg-sky-500"
          to="/vacations"
        />
      </div>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{isSimpleMode ? 'Income Sources' : 'Income Streams'}</h2>
          {streams.length === 0 ? (
            <div className="text-center py-6 text-gray-400 dark:text-gray-500">
              <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No income {isSimpleMode ? 'sources' : 'streams'} yet</p>
              <Link to="/income" className="text-xs text-emerald-600 hover:underline mt-1 inline-block">Add your first income →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {streams.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {!isSimpleMode && (
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold uppercase',
                        s.type === 'w2' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                      )}>{s.type}</span>
                    )}
                    <span className="text-sm text-gray-900 dark:text-white">{s.name}</span>
                    {!isSimpleMode && !s.isTaxable && <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">non-taxable</span>}
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatCurrency(s.amount)}{freqLabel(s.frequency)}</span>
                </div>
              ))}
              {streams.length > 5 && (
                <Link to="/income" className="block text-center text-xs text-emerald-600 hover:underline py-1">
                  View all {streams.length} {isSimpleMode ? 'sources' : 'streams'} →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Expenses Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Expenses</h2>
          {allExpenses.length === 0 ? (
            <div className="text-center py-6 text-gray-400 dark:text-gray-500">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No expenses yet</p>
              <Link to="/expenses" className="text-xs text-emerald-600 hover:underline mt-1 inline-block">Add your first expense →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {fixedExpenses.slice(0, 3).map((e) => (
                <div key={e.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">Fixed</span>
                    <span className="text-sm text-gray-900 dark:text-white">{e.name}</span>
                  </div>
                  <span className="text-sm font-medium text-red-500">{formatCurrency(e.amount)}{freqLabel(e.frequency)}</span>
                </div>
              ))}
              {variableExpenses.slice(0, 3).map((e) => (
                <div key={e.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">Var</span>
                    <span className="text-sm text-gray-900 dark:text-white">{e.name}</span>
                  </div>
                  <span className="text-sm font-medium text-red-500">{formatCurrency(e.amount)}{freqLabel(e.frequency)}</span>
                </div>
              ))}
              {allExpenses.length > 6 && (
                <Link to="/expenses" className="block text-center text-xs text-emerald-600 hover:underline py-1">
                  View all {allExpenses.length} expenses →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Debt Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Debt Overview</h2>
          {debts.length === 0 ? (
            <div className="text-center py-6 text-gray-400 dark:text-gray-500">
              <Landmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No debts tracked</p>
              <Link to="/debt" className="text-xs text-emerald-600 hover:underline mt-1 inline-block">Add your first debt →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {debts.slice(0, 5).map((d) => (
                <div key={d.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-sm text-gray-900 dark:text-white">{d.name}</span>
                  <span className="text-sm font-medium text-red-600">{formatCurrency(d.balance)}</span>
                </div>
              ))}
              {debts.length > 5 && (
                <Link to="/debt" className="block text-center text-xs text-emerald-600 hover:underline py-1">
                  View all {debts.length} debts →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
