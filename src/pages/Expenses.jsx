import { useState, useMemo } from 'react';
import { Receipt, Plus, Trash2, Pencil, Info, Calculator, X, Settings, ChevronDown, ChevronUp, Lock, Unlock, DollarSign, Banknote } from 'lucide-react';
import { useIncomeStreams, useRetirement, useExpenses, useFixedExpenses, useMonthlyIncomeLog, useMonthlyExpenseLog, useCurrentBalance, useBudgetProfiles, useTaxProfile } from '../hooks/useFirestore';
import { FREQUENCIES, NEEDS_MONTH_PICKER, MONTH_NAMES, MONTH_NAMES_FULL, defaultMonthsForFrequency, getAmountForMonth, toAnnual, toMonthly, formatCurrency, formatCurrencyShort, getPeriodsPerYear } from '../lib/financial';
import { usePrivacy } from '../contexts/PrivacyContext';
import { calculateAllStreamDeductions, FILING_STATUSES, STATES } from '../lib/taxEngine';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAppMode } from '../contexts/AppModeContext';
import { cn } from '../lib/utils';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899', '#84cc16'];

// ─── Tax Profile Section ───

function TaxProfileForm({ taxProfile, onSave }) {
  const [form, setForm] = useState(taxProfile || {
    filingStatus: 'single',
    state: 'TX',
    dependents: 0,
    w4Allowances: 0,
    extraWithholding: 0,
    manualDeductions: { enabled: false, federalTax: '', stateTax: '', fica: '', retirement: '', other: '' },
  });
  const [open, setOpen] = useState(!taxProfile);

  function handleSave() {
    onSave({
      filingStatus: form.filingStatus,
      state: form.state,
      dependents: parseInt(form.dependents) || 0,
      w4Allowances: parseInt(form.w4Allowances) || 0,
      extraWithholding: parseFloat(form.extraWithholding) || 0,
      manualDeductions: form.manualDeductions?.enabled ? {
        enabled: true,
        federalTax: parseFloat(form.manualDeductions.federalTax) || 0,
        stateTax: parseFloat(form.manualDeductions.stateTax) || 0,
        fica: parseFloat(form.manualDeductions.fica) || 0,
        retirement: parseFloat(form.manualDeductions.retirement) || 0,
        other: parseFloat(form.manualDeductions.other) || 0,
      } : { enabled: false },
    });
    setOpen(false);
  }

  function updateManual(field, value) {
    setForm({ ...form, manualDeductions: { ...form.manualDeductions, [field]: value } });
  }

  const stateName = STATES.find((s) => s.code === form.state)?.name || form.state;
  const filingLabel = FILING_STATUSES.find((f) => f.value === form.filingStatus)?.label || form.filingStatus;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left">
        <div className="flex items-center gap-3">
          <Calculator className="w-5 h-5 text-gray-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Tax Profile &amp; W-4</h3>
            {taxProfile && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {filingLabel} &middot; {stateName}
                {(taxProfile.dependents || 0) > 0 && ` · ${taxProfile.dependents} dependent${taxProfile.dependents !== 1 ? 's' : ''}`}
                {(taxProfile.w4Allowances || 0) > 0 && ` · ${taxProfile.w4Allowances} W-4 allowance${taxProfile.w4Allowances !== 1 ? 's' : ''}`}
                {taxProfile.manualDeductions?.enabled && ' · Using paystub deductions'}
              </p>
            )}
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700 pt-4 space-y-4">
          {/* Filing & State */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filing Status</label>
              <select value={form.filingStatus} onChange={(e) => setForm({ ...form, filingStatus: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                {FILING_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
              <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Dependents & W-4 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dependents (actual)</label>
              <input type="number" min="0" value={form.dependents || 0}
                onChange={(e) => setForm({ ...form, dependents: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              <p className="text-xs text-gray-400 mt-1">Children / qualifying dependents for tax credits</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">W-4 Allowances Claimed</label>
              <input type="number" min="0" value={form.w4Allowances || 0}
                onChange={(e) => setForm({ ...form, w4Allowances: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              <p className="text-xs text-gray-400 mt-1">Number claimed on your W-4 form</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Extra Withholding ($/mo)</label>
              <input type="number" min="0" step="0.01" value={form.extraWithholding || 0}
                onChange={(e) => setForm({ ...form, extraWithholding: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              <p className="text-xs text-gray-400 mt-1">Additional tax withheld per month</p>
            </div>
          </div>

          {/* Manual Deductions Toggle */}
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={form.manualDeductions?.enabled || false}
                  onChange={(e) => setForm({ ...form, manualDeductions: { ...form.manualDeductions, enabled: e.target.checked } })}
                  className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-300 peer-checked:bg-blue-500 rounded-full peer-focus:ring-2 peer-focus:ring-blue-300 transition after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
              </label>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enter paystub deductions manually</span>
                <p className="text-xs text-gray-400">Use exact amounts from your pay stub instead of auto-calculating</p>
              </div>
            </div>
            {form.manualDeductions?.enabled && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Federal Tax (per check)</label>
                  <input type="number" min="0" step="0.01" value={form.manualDeductions.federalTax || ''}
                    onChange={(e) => updateManual('federalTax', e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">State Tax (per check)</label>
                  <input type="number" min="0" step="0.01" value={form.manualDeductions.stateTax || ''}
                    onChange={(e) => updateManual('stateTax', e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">FICA / SS+Medicare (per check)</label>
                  <input type="number" min="0" step="0.01" value={form.manualDeductions.fica || ''}
                    onChange={(e) => updateManual('fica', e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">401(k) / Retirement (per check)</label>
                  <input type="number" min="0" step="0.01" value={form.manualDeductions.retirement || ''}
                    onChange={(e) => updateManual('retirement', e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Other Deductions (per check)</label>
                  <input type="number" min="0" step="0.01" value={form.manualDeductions.other || ''}
                    onChange={(e) => updateManual('other', e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                </div>
              </div>
            )}
          </div>

          <button onClick={handleSave}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition">
            Save Tax Profile
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Retirement Section ───

function RetirementForm({ retirement, onSave }) {
  const [form, setForm] = useState(retirement || {
    traditionalPct: 0,
    rothPct: 0,
    employerMatchPct: 0,
  });
  const [open, setOpen] = useState(!retirement);

  function handleSave() {
    onSave({
      traditionalPct: parseFloat(form.traditionalPct) || 0,
      rothPct: parseFloat(form.rothPct) || 0,
      employerMatchPct: parseFloat(form.employerMatchPct) || 0,
    });
    setOpen(false);
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-gray-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">401(k) / Retirement</h3>
            {retirement && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Traditional: {retirement.traditionalPct}% &middot; Roth: {retirement.rothPct}% &middot; Employer Match: {retirement.employerMatchPct}%
              </p>
            )}
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700 pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Traditional 401(k) %</label>
              <input type="number" min="0" max="100" step="0.5" value={form.traditionalPct}
                onChange={(e) => setForm({ ...form, traditionalPct: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Roth 401(k) %</label>
              <input type="number" min="0" max="100" step="0.5" value={form.rothPct}
                onChange={(e) => setForm({ ...form, rothPct: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employer Match %</label>
              <input type="number" min="0" max="100" step="0.5" value={form.employerMatchPct}
                onChange={(e) => setForm({ ...form, employerMatchPct: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
          </div>
          <button onClick={handleSave}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition">
            Save Retirement Settings
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Expense Modal (shared for fixed & variable) ───

function ExpenseModal({ onClose, onSave, initial, title }) {
  const [form, setForm] = useState(initial || {
    name: '',
    amount: '',
    frequency: 'monthly',
    applicableMonths: [],
  });

  function handleFrequencyChange(freq) {
    const needsPicker = NEEDS_MONTH_PICKER.includes(freq);
    setForm({
      ...form,
      frequency: freq,
      applicableMonths: needsPicker ? defaultMonthsForFrequency(freq) : [],
    });
  }

  function toggleMonth(m) {
    const months = form.applicableMonths || [];
    setForm({
      ...form,
      applicableMonths: months.includes(m)
        ? months.filter((x) => x !== m)
        : [...months, m].sort((a, b) => a - b),
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ ...form, amount: parseFloat(form.amount) || 0 });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title || (initial ? 'Edit Expense' : 'Add Expense')}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input type="text" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Rent, Car Payment, Netflix"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount ($)</label>
              <input type="number" required min="0" step="0.01" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frequency</label>
              <select value={form.frequency} onChange={(e) => handleFrequencyChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>
          {NEEDS_MONTH_PICKER.includes(form.frequency) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Which months does this occur?</label>
              <div className="grid grid-cols-4 gap-1.5">
                {MONTH_NAMES.map((name, i) => {
                  const month = i + 1;
                  const selected = (form.applicableMonths || []).includes(month);
                  return (
                    <button key={month} type="button" onClick={() => toggleMonth(month)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium transition ${selected ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 ring-1 ring-emerald-300 dark:ring-emerald-700' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
            <button type="submit" className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition">
              {initial ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDelete({ name, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Expense</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Are you sure you want to delete <strong>{name}</strong>?
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Expense Lock-In Modal ───

function ExpenseLockInModal({ fixedExpenses, variableExpenses, income, currentBalance, currentMonth, lockedData, optedProfiles, onClose, onLock }) {
  const [fixedEntries, setFixedEntries] = useState(() => {
    if (lockedData?.fixedEntries) return lockedData.fixedEntries;
    return fixedExpenses.map((e) => ({
      id: e.id,
      name: e.name,
      estimated: getAmountForMonth(e.amount, e.frequency, e.applicableMonths, currentMonth),
      actual: getAmountForMonth(e.amount, e.frequency, e.applicableMonths, currentMonth),
    }));
  });
  const [varEntries, setVarEntries] = useState(() => {
    if (lockedData?.varEntries) return lockedData.varEntries;
    return variableExpenses.map((e) => ({
      id: e.id,
      name: e.name,
      estimated: getAmountForMonth(e.amount, e.frequency, e.applicableMonths, currentMonth),
      actual: getAmountForMonth(e.amount, e.frequency, e.applicableMonths, currentMonth),
    }));
  });
  const [useBalance, setUseBalance] = useState(lockedData?.useBalance ?? (currentBalance?.enabled || false));
  const [balanceAmount, setBalanceAmount] = useState(lockedData?.balanceAmount ?? (currentBalance?.amount || 0));
  const [splitOverrides, setSplitOverrides] = useState(() => {
    if (lockedData?.splitOverrides) return lockedData.splitOverrides;
    return null; // null = even split
  });

  const fixedTotal = fixedEntries.reduce((s, e) => s + (parseFloat(e.actual) || 0), 0);
  const varTotal = varEntries.reduce((s, e) => s + (parseFloat(e.actual) || 0), 0);
  const totalExpenses = fixedTotal + varTotal;
  const startingAmount = useBalance ? balanceAmount : income;
  const spendingMoney = Math.max(0, startingAmount - totalExpenses);
  const perPerson = optedProfiles.length > 0 ? spendingMoney / optedProfiles.length : spendingMoney;

  // Build per-profile amounts
  const profileAmounts = optedProfiles.map((p) => {
    if (splitOverrides && splitOverrides[p.id] !== undefined) {
      return { id: p.id, name: p.name, amount: splitOverrides[p.id] };
    }
    return { id: p.id, name: p.name, amount: perPerson };
  });

  function updateSplit(id, val) {
    const overrides = { ...(splitOverrides || {}) };
    overrides[id] = parseFloat(val) || 0;
    setSplitOverrides(overrides);
  }

  function resetToEvenSplit() {
    setSplitOverrides(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Lock In {MONTH_NAMES_FULL[currentMonth - 1]} Expenses
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Adjust amounts to match actuals, then lock in to distribute spending money.
        </p>

        {/* Income Source Toggle */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={useBalance} onChange={(e) => setUseBalance(e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-300 peer-checked:bg-blue-500 rounded-full peer-focus:ring-2 peer-focus:ring-blue-300 transition after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
            <span className="text-sm text-gray-700 dark:text-gray-300">Use bank balance instead of income</span>
          </div>
          {useBalance && (
            <input type="number" min="0" step="0.01" value={balanceAmount}
              onChange={(e) => setBalanceAmount(parseFloat(e.target.value) || 0)}
              placeholder="Current bank balance"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          )}
          {!useBalance && (
            <p className="text-xs text-gray-500">Starting from income: {formatCurrency(income)}</p>
          )}
        </div>

        {/* Fixed Expenses */}
        {fixedEntries.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Fixed Expenses</h3>
            <div className="space-y-2">
              {fixedEntries.map((entry, i) => (
                <div key={entry.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{entry.name}</p>
                    <p className="text-xs text-gray-400">Est: {formatCurrency(entry.estimated)}</p>
                  </div>
                  <input type="number" min="0" step="0.01" value={entry.actual}
                    onChange={(e) => { const u = [...fixedEntries]; u[i] = { ...u[i], actual: parseFloat(e.target.value) || 0 }; setFixedEntries(u); }}
                    className="w-28 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-right" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Variable Expenses */}
        {varEntries.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Variable Expenses</h3>
            <div className="space-y-2">
              {varEntries.map((entry, i) => (
                <div key={entry.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{entry.name}</p>
                    <p className="text-xs text-gray-400">Est: {formatCurrency(entry.estimated)}</p>
                  </div>
                  <input type="number" min="0" step="0.01" value={entry.actual}
                    onChange={(e) => { const u = [...varEntries]; u[i] = { ...u[i], actual: parseFloat(e.target.value) || 0 }; setVarEntries(u); }}
                    className="w-28 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-right" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spending Money Split */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Starting Amount</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(startingAmount)}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</span>
            <span className="text-sm font-medium text-red-500">-{formatCurrency(totalExpenses)}</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Spending Money</span>
            <span className={cn('text-lg font-bold', spendingMoney > 0 ? 'text-emerald-600' : 'text-red-500')}>{formatCurrency(spendingMoney)}</span>
          </div>

          {optedProfiles.length > 0 ? (
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Per Person</h4>
                {splitOverrides && (
                  <button onClick={resetToEvenSplit} className="text-xs text-blue-600 hover:text-blue-700">Reset to even split</button>
                )}
              </div>
              {profileAmounts.map((pa) => (
                <div key={pa.id} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{pa.name}</span>
                  <input type="number" min="0" step="0.01" value={splitOverrides ? (splitOverrides[pa.id] ?? perPerson) : perPerson.toFixed(2)}
                    onChange={(e) => updateSplit(pa.id, e.target.value)}
                    className="w-28 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-right" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">No budget profiles are opted into spending money split. Edit a profile to enable it.</p>
          )}

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
            <button onClick={() => {
              const finalAmounts = {};
              profileAmounts.forEach((pa) => {
                finalAmounts[pa.id] = splitOverrides && splitOverrides[pa.id] !== undefined ? splitOverrides[pa.id] : perPerson;
              });
              onLock({
                fixedEntries,
                varEntries,
                fixedTotal,
                varTotal,
                totalExpenses,
                startingAmount,
                spendingMoney,
                useBalance,
                balanceAmount: useBalance ? balanceAmount : null,
                splitOverrides: splitOverrides || null,
                profileAmounts: finalAmounts,
              });
            }}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" /> Lock In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Expenses Page ───

export default function Expenses() {
  const { isSimpleMode } = useAppMode();
  usePrivacy();
  const { streams } = useIncomeStreams();
  const { retirement, saveRetirement } = useRetirement();
  const { profile: taxProfile, saveTaxProfile } = useTaxProfile();
  const { expenses, addExpense, updateExpense, removeExpense } = useExpenses();
  const { expenses: fixedExpensesList, addExpense: addFixed, updateExpense: updateFixed, removeExpense: removeFixed } = useFixedExpenses();
  const { logs: incomeLogs } = useMonthlyIncomeLog();
  const { logs: expenseLogs, lockMonth: lockExpenseMonth, unlockMonth: unlockExpenseMonth } = useMonthlyExpenseLog();
  const { balance: currentBalance, saveBalance } = useCurrentBalance();
  const { profiles: budgetProfiles, updateProfile: updateBudgetProfile } = useBudgetProfiles();
  const [showModal, setShowModal] = useState(false);
  const [showFixedModal, setShowFixedModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editingFixed, setEditingFixed] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deletingFixed, setDeletingFixed] = useState(null);
  const [showLockModal, setShowLockModal] = useState(false);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const yearMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const lockedExpenseData = expenseLogs[yearMonth];
  const isExpenseLocked = !!lockedExpenseData;

  // Income for this month (use locked income if available)
  const lockedIncomeData = incomeLogs[yearMonth];
  const thisMonthIncome = lockedIncomeData
    ? lockedIncomeData.total
    : streams.reduce((sum, s) => sum + getAmountForMonth(s.amount, s.frequency, s.applicableMonths, currentMonth), 0);

  // Budget profiles opted into spending money split
  const optedProfiles = budgetProfiles.filter((p) => p.includeInSpendingSplit !== false);

  // Prepare income streams with periodsPerYear for tax engine
  const preparedStreams = streams.map((s) => ({
    ...s,
    periodsPerYear: getPeriodsPerYear(s.frequency),
  }));

  // Per-stream tax calculations
  const streamDeductions = useMemo(() => calculateAllStreamDeductions(
    preparedStreams,
    retirement || {},
    taxProfile || {},
  ), [preparedStreams, retirement, taxProfile]);

  // Backwards-compatible deductions object for charts and totals
  const deductions = useMemo(() => {
    const t = streamDeductions.totals;
    return {
      totalGrossAnnual: t.totalGrossAnnual,
      totalTaxableAnnual: streamDeductions.streams.filter(s => s.isTaxable).reduce((a, s) => a + s.grossAnnual, 0),
      federalTaxAfterCredits: t.totalFederalTax,
      stateTax: t.totalStateTax,
      totalFICA: t.totalFICA,
      k401: { total: t.totalK401 },
      totalDeductions: t.totalDeductions,
      netAnnual: t.totalNet,
      extraWithholdingAnnual: t.totalExtraWithholding,
    };
  }, [streamDeductions]);

  // Fixed expenses totals (monthly)
  const totalFixedMonthly = fixedExpensesList.reduce((sum, e) => sum + toMonthly(e.amount, e.frequency), 0);
  const totalFixedThisMonth = fixedExpensesList.reduce((sum, e) => sum + getAmountForMonth(e.amount, e.frequency, e.applicableMonths, currentMonth), 0);

  // Variable expenses totals (monthly)
  const totalVariableMonthly = expenses.reduce((sum, e) => sum + toMonthly(e.amount, e.frequency), 0);
  const totalVariableAnnual = expenses.reduce((sum, e) => sum + toAnnual(e.amount, e.frequency), 0);
  const totalVariableThisMonth = expenses.reduce((sum, e) => sum + getAmountForMonth(e.amount, e.frequency, e.applicableMonths, currentMonth), 0);

  const totalFixedAnnual = fixedExpensesList.reduce((sum, e) => sum + toAnnual(e.amount, e.frequency), 0);
  const totalAllExpensesMonthly = totalFixedMonthly + totalVariableMonthly;
  const totalAllExpensesThisMonth = totalFixedThisMonth + totalVariableThisMonth;

  const netAfterAll = deductions.netAnnual - totalVariableAnnual - totalFixedAnnual;

  // Spending money (estimated, not locked)
  const startingAmount = (currentBalance?.enabled && currentBalance?.amount) ? currentBalance.amount : thisMonthIncome;
  const estimatedSpendingMoney = startingAmount - totalAllExpensesThisMonth;
  const spendingPerPerson = optedProfiles.length > 0 ? estimatedSpendingMoney / optedProfiles.length : estimatedSpendingMoney;

  // Chart data
  const deductionPieData = [
    { name: 'Federal Tax', value: deductions.federalTaxAfterCredits },
    { name: 'State Tax', value: deductions.stateTax },
    { name: 'Social Security & Medicare', value: deductions.totalFICA },
    { name: '401(k)', value: deductions.k401.total },
    { name: 'Fixed Expenses', value: totalFixedAnnual },
    { name: 'Variable Expenses', value: totalVariableAnnual },
  ].filter((d) => d.value > 0);

  const summaryBarData = [
    { name: 'Gross', amount: deductions.totalGrossAnnual },
    { name: 'Tax+FICA', amount: -(deductions.federalTaxAfterCredits + deductions.stateTax + deductions.totalFICA) },
    { name: '401(k)', amount: -deductions.k401.total },
    { name: 'Fixed', amount: -totalFixedAnnual },
    { name: 'Variable', amount: -totalVariableAnnual },
    { name: 'Net', amount: netAfterAll },
  ];

  function handleSaveExpense(data) {
    if (editing) {
      updateExpense(editing.id, data);
    } else {
      addExpense(data);
    }
    setEditing(null);
  }

  function handleSaveFixed(data) {
    if (editingFixed) {
      updateFixed(editingFixed.id, data);
    } else {
      addFixed(data);
    }
    setEditingFixed(null);
  }

  function handleDeleteExpense() {
    removeExpense(deleting.id);
    setDeleting(null);
  }

  function handleDeleteFixed() {
    removeFixed(deletingFixed.id);
    setDeletingFixed(null);
  }

  async function handleLockExpenses(payload) {
    await lockExpenseMonth(yearMonth, payload);
    // Add spending money to each opted-in budget profile
    if (payload.profileAmounts) {
      for (const [profileId, amount] of Object.entries(payload.profileAmounts)) {
        const profile = budgetProfiles.find((p) => p.id === profileId);
        if (profile) {
          await updateBudgetProfile(profileId, {
            totalBudget: (profile.totalBudget || 0) + amount,
          });
        }
      }
    }
    setShowLockModal(false);
  }

  async function handleUnlockExpenses() {
    // Reverse the spending money addition
    if (lockedExpenseData?.profileAmounts) {
      for (const [profileId, amount] of Object.entries(lockedExpenseData.profileAmounts)) {
        const profile = budgetProfiles.find((p) => p.id === profileId);
        if (profile) {
          await updateBudgetProfile(profileId, {
            totalBudget: Math.max(0, (profile.totalBudget || 0) - amount),
          });
        }
      }
    }
    await unlockExpenseMonth(yearMonth);
  }

  const freqLabel = (f) => FREQUENCIES.find((x) => x.value === f)?.label || f;
  const refundAmount = deductions.extraWithholdingAnnual;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isSimpleMode ? 'Expenses' : 'Expenses & Deductions'}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{isSimpleMode ? 'Track expenses against your take-home pay.' : 'Set up your tax profile, calculate deductions from gross income, and track expenses.'}</p>
        </div>
      </div>

      {/* This Month Lock-In Card */}
      <div className={`rounded-xl p-5 text-white ${isExpenseLocked ? 'bg-gradient-to-r from-blue-600 to-indigo-700' : 'bg-gradient-to-r from-orange-500 to-rose-600'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isExpenseLocked ? <Lock className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
              <h2 className="text-sm font-medium text-white/80">{MONTH_NAMES_FULL[currentMonth - 1]} {currentYear}</h2>
            </div>
            {isExpenseLocked ? (
              <>
                <p className="text-3xl font-bold">{formatCurrency(lockedExpenseData.spendingMoney)}</p>
                <p className="text-sm text-white/70 mt-1">Spending money locked — distributed to {Object.keys(lockedExpenseData.profileAmounts || {}).length} profile(s)</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold">{formatCurrency(Math.max(0, estimatedSpendingMoney))}</p>
                <p className="text-sm text-white/70 mt-1">
                  Estimated spending money ({formatCurrency(startingAmount)} income − {formatCurrency(totalAllExpensesThisMonth)} expenses)
                </p>
              </>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {isExpenseLocked ? (
              <button onClick={handleUnlockExpenses}
                className="flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition">
                <Unlock className="w-4 h-4" /> Unlock
              </button>
            ) : (
              <button onClick={() => setShowLockModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition">
                <Lock className="w-4 h-4" /> Lock In
              </button>
            )}
          </div>
        </div>
        {/* Per-person display */}
        {!isExpenseLocked && optedProfiles.length > 0 && estimatedSpendingMoney > 0 && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <p className="text-xs text-white/70 mb-1">Estimated per person (even split):</p>
            <div className="flex flex-wrap gap-3">
              {optedProfiles.map((p) => (
                <span key={p.id} className="text-sm font-medium">{p.name}: {formatCurrency(spendingPerPerson)}</span>
              ))}
            </div>
          </div>
        )}
        {isExpenseLocked && lockedExpenseData.profileAmounts && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <p className="text-xs text-white/70 mb-1">Distributed to budgets:</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(lockedExpenseData.profileAmounts).map(([id, amt]) => {
                const bp = budgetProfiles.find((p) => p.id === id);
                return <span key={id} className="text-sm font-medium">{bp?.name || 'Profile'}: {formatCurrency(amt)}</span>;
              })}
            </div>
          </div>
        )}
      </div>

      {/* Optional Current Balance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3 mb-2">
          <Banknote className="w-5 h-5 text-gray-400" />
          <div className="flex items-center gap-3 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Bank Account Balance (Optional)</h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={currentBalance?.enabled || false}
                onChange={(e) => saveBalance({ ...currentBalance, enabled: e.target.checked })} className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-300 peer-checked:bg-blue-500 rounded-full peer-focus:ring-2 peer-focus:ring-blue-300 transition after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
        </div>
        {currentBalance?.enabled && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">$</span>
            <input type="number" min="0" step="0.01" value={currentBalance?.amount || ''}
              onChange={(e) => saveBalance({ ...currentBalance, amount: parseFloat(e.target.value) || 0 })}
              placeholder="Enter current balance"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
        )}
        <p className="text-xs text-gray-400 mt-1">When enabled, spending money is calculated from this balance instead of income streams.</p>
      </div>

      {/* How to use */}
      <details className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <summary className="cursor-pointer text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <Info className="w-4 h-4" /> How to use this page
        </summary>
        <div className="mt-3 text-sm text-blue-700 dark:text-blue-400 space-y-1">
          {isSimpleMode ? (
            <>
              <p><strong>Fixed expenses</strong> are predictable bills (rent, mortgage, car payment, insurance).</p>
              <p><strong>Variable expenses</strong> are things like savings transfers, credit card payments, extra debt payments.</p>
              <p>Your <strong>spending money</strong> = income − fixed − variable expenses, split among opted-in budget profiles.</p>
              <p>Click <strong>Lock In</strong> to finalize for the month and distribute spending money to your budgets.</p>
            </>
          ) : (
            <>
              <p>Set up your tax profile and 401(k) to auto-calculate deductions.</p>
              <p><strong>Fixed expenses</strong> are predictable recurring bills. <strong>Variable expenses</strong> are flexible payments.</p>
              <p>Lock in expenses to distribute spending money to budget profiles.</p>
            </>
          )}
        </div>
      </details>

      {!isSimpleMode && (
        <>
          {/* Tax Refund / Owed Card */}
          <div className={`rounded-xl p-5 text-white ${refundAmount > 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : refundAmount < 0 ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-gray-500 to-gray-600'}`}>
            <div className="flex items-center gap-3 mb-2">
              <Calculator className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Projected Tax Refund / Amount Owed</h2>
            </div>
            {taxProfile ? (
              <>
                <p className="text-3xl font-bold">
                  {refundAmount >= 0 ? '+' : ''}{formatCurrency(refundAmount)}
                </p>
                <p className="text-white/80 text-sm mt-1">
                  {refundAmount > 0 ? 'Estimated refund from extra withholding' : refundAmount < 0 ? 'Estimated amount owed' : 'On track — no extra withholding'}
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold">$0.00</p>
                <p className="text-white/80 text-sm mt-1">Set up your tax profile below to see estimates</p>
              </>
            )}
          </div>

          {/* Tax Profile */}
          <TaxProfileForm taxProfile={taxProfile} onSave={saveTaxProfile} />

          {/* Retirement Settings */}
          <RetirementForm retirement={retirement} onSave={saveRetirement} />

          {/* Per-Stream Tax Breakdown */}
          {streamDeductions.streams.filter(s => s.isTaxable).length > 0 && (
            <div className="space-y-3">
              {streamDeductions.streams.filter(s => s.isTaxable).map((sr) => (
                <div key={sr.streamId} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{sr.streamName}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {sr.isManual ? 'Using paystub deductions' : `${FILING_STATUSES.find(f => f.value === sr.filingStatus)?.label} · ${sr.stateName}`}
                        {sr.dependents > 0 && ` · ${sr.dependents} dependent${sr.dependents !== 1 ? 's' : ''}`}
                        {sr.bonusAnnual > 0 && ` · Includes ${formatCurrency(sr.bonusAnnual)}/yr bonus`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-600">{formatCurrency(sr.netAnnual / 12)}<span className="text-xs text-gray-400">/mo</span></p>
                      <p className="text-xs text-gray-400">net after deductions</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Gross Annual {sr.bonusAnnual > 0 ? `(${formatCurrency(sr.baseAnnual)} + ${formatCurrency(sr.bonusAnnual)} bonus)` : ''}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(sr.grossAnnual)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Federal Tax</span>
                      <span className="font-medium text-red-500">-{formatCurrency(sr.federalTaxAfterCredits)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">State Tax ({sr.stateName})</span>
                      <span className="font-medium text-red-500">-{formatCurrency(sr.stateTax)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">FICA</span>
                      <span className="font-medium text-red-500">-{formatCurrency(sr.totalFICA)}</span>
                    </div>
                    {sr.k401.total > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">401(k)</span>
                        <span className="font-medium text-red-500">-{formatCurrency(sr.k401.total)}</span>
                      </div>
                    )}
                    <hr className="border-gray-100 dark:border-gray-700" />
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-gray-900 dark:text-white">Net Annual</span>
                      <span className="text-emerald-600">{formatCurrency(sr.netAnnual)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Aggregate Deductions Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Total Deductions Summary (Annual)</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total Gross Income</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(deductions.totalGrossAnnual)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total Federal Tax</span>
                <span className="font-medium text-red-500">-{formatCurrency(deductions.federalTaxAfterCredits)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total State Tax</span>
                <span className="font-medium text-red-500">-{formatCurrency(deductions.stateTax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total FICA</span>
                <span className="font-medium text-red-500">-{formatCurrency(deductions.totalFICA)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total 401(k)</span>
                <span className="font-medium text-red-500">-{formatCurrency(deductions.k401.total)}</span>
              </div>
              <hr className="border-gray-100 dark:border-gray-700" />
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-gray-900 dark:text-white">Total Deductions</span>
                <span className="text-red-500">-{formatCurrency(deductions.totalDeductions)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-gray-900 dark:text-white">Net After Deductions</span>
                <span className="text-emerald-600">{formatCurrency(deductions.netAnnual)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ Fixed Expenses ═══ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Fixed Expenses</h3>
            <p className="text-xs text-gray-400 mt-0.5">Predictable recurring bills (rent, mortgage, insurance, etc.)</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{formatCurrency(totalFixedMonthly)}/mo</span>
            <button onClick={() => { setEditingFixed(null); setShowFixedModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>
        {fixedExpensesList.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No fixed expenses yet. Add your recurring bills above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Frequency</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">This Month</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {fixedExpensesList.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{e.name}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{freqLabel(e.frequency)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(getAmountForMonth(e.amount, e.frequency, e.applicableMonths, currentMonth))}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditingFixed(e); setShowFixedModal(true); }}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeletingFixed(e)}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-700/50 font-semibold">
                  <td className="px-4 py-3 text-gray-900 dark:text-white" colSpan={3}>Total Fixed</td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(totalFixedThisMonth)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ═══ Variable Expenses ═══ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Variable Expenses</h3>
            <p className="text-xs text-gray-400 mt-0.5">Savings, credit card payments, extra debt payments, etc.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{formatCurrency(totalVariableMonthly)}/mo</span>
            <button onClick={() => { setEditing(null); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>
        {expenses.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No variable expenses yet. Click "Add" above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Frequency</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">This Month</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{e.name}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{freqLabel(e.frequency)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(getAmountForMonth(e.amount, e.frequency, e.applicableMonths, currentMonth))}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditing(e); setShowModal(true); }}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleting(e)}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-700/50 font-semibold">
                  <td className="px-4 py-3 text-gray-900 dark:text-white" colSpan={3}>Total Variable</td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(totalVariableThisMonth)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ═══ Spending Money Summary ═══ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-600" /> Spending Money Breakdown — {MONTH_NAMES_FULL[currentMonth - 1]}
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">{currentBalance?.enabled ? 'Bank Balance' : 'Income This Month'}</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(startingAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Fixed Expenses</span>
            <span className="font-medium text-red-500">-{formatCurrency(totalFixedThisMonth)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Variable Expenses</span>
            <span className="font-medium text-red-500">-{formatCurrency(totalVariableThisMonth)}</span>
          </div>
          <hr className="border-gray-200 dark:border-gray-700" />
          <div className="flex justify-between">
            <span className="font-semibold text-gray-900 dark:text-white">Spending Money</span>
            <span className={cn('text-xl font-bold', estimatedSpendingMoney >= 0 ? 'text-emerald-600' : 'text-red-500')}>{formatCurrency(estimatedSpendingMoney)}</span>
          </div>
          {optedProfiles.length > 0 && estimatedSpendingMoney > 0 && (
            <>
              <hr className="border-gray-200 dark:border-gray-700" />
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Per Person (even split among {optedProfiles.length} profile{optedProfiles.length > 1 ? 's' : ''})</p>
              {optedProfiles.map((p) => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{p.name}</span>
                  <span className="font-medium text-emerald-600">{formatCurrency(spendingPerPerson)}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Net Income Summary */}
      {isSimpleMode ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Fixed Expenses</p>
            <p className="text-2xl font-bold text-red-500 mt-1">{formatCurrency(totalFixedAnnual)}</p>
            <p className="text-xs text-gray-400 mt-1">{formatCurrency(totalFixedMonthly)}/mo</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Variable Expenses</p>
            <p className="text-2xl font-bold text-red-500 mt-1">{formatCurrency(totalVariableAnnual)}</p>
            <p className="text-xs text-gray-400 mt-1">{formatCurrency(totalVariableMonthly)}/mo</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Disposable Income</p>
            {(() => {
              const totalTakeHomeMonthly = streams.reduce((sum, s) => sum + toMonthly(s.amount, s.frequency), 0);
              const disposable = totalTakeHomeMonthly - totalAllExpensesMonthly;
              return (
                <>
                  <p className={`text-2xl font-bold mt-1 ${disposable >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(disposable)}</p>
                  <p className="text-xs text-gray-400 mt-1">Take-home pay minus all expenses (monthly)</p>
                </>
              );
            })()}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Gross Annual Income</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(deductions.totalGrossAnnual)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Net After Deductions</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(deductions.netAnnual)}</p>
            <p className="text-xs text-gray-400 mt-1">{formatCurrency(deductions.netAnnual / 12)}/mo</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Disposable Income</p>
            <p className={`text-2xl font-bold mt-1 ${netAfterAll >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(netAfterAll)}</p>
            <p className="text-xs text-gray-400 mt-1">{formatCurrency(netAfterAll / 12)}/mo (net minus all expenses)</p>
          </div>
        </div>
      )}

      {/* Charts */}
      {isSimpleMode ? (
        (fixedExpensesList.length > 0 || expenses.length > 0) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Expense Breakdown (Monthly)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={[
                    ...fixedExpensesList.map((e) => ({ name: `${e.name} (fixed)`, value: toMonthly(e.amount, e.frequency) })),
                    ...expenses.map((e) => ({ name: e.name, value: toMonthly(e.amount, e.frequency) })),
                  ]}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={3} dataKey="value">
                  {[...fixedExpensesList, ...expenses].map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )
      ) : (
        deductions.totalGrossAnnual > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Deduction Breakdown (Annual)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={deductionPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={3} dataKey="value">
                    {deductionPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Income Waterfall (Annual)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={summaryBarData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrencyShort(v)} />
                  <Tooltip formatter={(v) => formatCurrency(Math.abs(v))} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {summaryBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.amount >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      )}

      {/* Disclaimer */}
      {!isSimpleMode && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center italic">
          Tax calculations are estimates for informational purposes only. This is not tax advice. Consult a tax professional for accurate calculations.
        </p>
      )}

      {/* Modals */}
      {showModal && (
        <ExpenseModal
          title={editing ? 'Edit Variable Expense' : 'Add Variable Expense'}
          initial={editing ? { name: editing.name, amount: editing.amount, frequency: editing.frequency, applicableMonths: editing.applicableMonths || [] } : null}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={handleSaveExpense}
        />
      )}
      {showFixedModal && (
        <ExpenseModal
          title={editingFixed ? 'Edit Fixed Expense' : 'Add Fixed Expense'}
          initial={editingFixed ? { name: editingFixed.name, amount: editingFixed.amount, frequency: editingFixed.frequency, applicableMonths: editingFixed.applicableMonths || [] } : null}
          onClose={() => { setShowFixedModal(false); setEditingFixed(null); }}
          onSave={handleSaveFixed}
        />
      )}
      {deleting && (
        <ConfirmDelete name={deleting.name} onClose={() => setDeleting(null)} onConfirm={handleDeleteExpense} />
      )}
      {deletingFixed && (
        <ConfirmDelete name={deletingFixed.name} onClose={() => setDeletingFixed(null)} onConfirm={handleDeleteFixed} />
      )}
      {showLockModal && (
        <ExpenseLockInModal
          fixedExpenses={fixedExpensesList}
          variableExpenses={expenses}
          income={thisMonthIncome}
          currentBalance={currentBalance}
          currentMonth={currentMonth}
          lockedData={lockedExpenseData}
          optedProfiles={optedProfiles}
          onClose={() => setShowLockModal(false)}
          onLock={handleLockExpenses}
        />
      )}
    </div>
  );
}