import { useState, useMemo } from 'react';
import { DollarSign, Plus, Trash2, Pencil, Info, X, Lock, Unlock, Check, ToggleLeft, ToggleRight } from 'lucide-react';
import { useIncomeStreams, useMonthlyIncomeLog } from '../hooks/useFirestore';
import { useAppMode } from '../contexts/AppModeContext';
import { FREQUENCIES, NEEDS_MONTH_PICKER, MONTH_NAMES, MONTH_NAMES_FULL, defaultMonthsForFrequency, getAmountForMonth, toAnnual, formatCurrency, formatCurrencyShort, getStreamAmount, getStreamMonthTotal, getBonusForMonth } from '../lib/financial';
import { usePrivacy } from '../contexts/PrivacyContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const INCOME_TYPES = [
  { value: 'w2', label: 'W-2 Employee' },
  { value: '1099', label: '1099 / Self-Employed' },
];

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

function IncomeModal({ onClose, onSave, initial, isSimpleMode }) {
  const [form, setForm] = useState(() => {
    const defaults = {
      name: '',
      type: 'w2',
      takeHomeAmount: '',
      grossAmount: '',
      frequency: 'monthly',
      isTaxable: true,
      applicableMonths: [],
      bonusEnabled: false,
      bonusAmount: '',
      bonusMonths: [],
      manualDeductions: { enabled: false },
    };
    if (!initial) return defaults;
    // Migrate legacy 'amount' field
    const migrated = { ...defaults, ...initial };
    if (initial.amount !== undefined && !initial.takeHomeAmount && !initial.grossAmount) {
      migrated.takeHomeAmount = initial.amount;
      migrated.grossAmount = '';
    }
    // Migrate legacy bonusAmount to new model
    if (initial.bonusAmount && !initial.bonusEnabled) {
      migrated.bonusEnabled = true;
      migrated.bonusAmount = initial.bonusAmount;
      migrated.bonusMonths = initial.bonusMonths || [];
    }
    return migrated;
  });

  const currentAmount = isSimpleMode ? form.takeHomeAmount : form.grossAmount;

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

  function toggleBonusMonth(m) {
    const months = form.bonusMonths || [];
    setForm({
      ...form,
      bonusMonths: months.includes(m)
        ? months.filter((x) => x !== m)
        : [...months, m].sort((a, b) => a - b),
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const parsed = parseFloat(currentAmount) || 0;
    const data = {
      ...form,
      // Always store both fields — set only the active one
      takeHomeAmount: isSimpleMode ? parsed : (parseFloat(form.takeHomeAmount) || 0),
      grossAmount: isSimpleMode ? (parseFloat(form.grossAmount) || 0) : parsed,
      // Keep legacy `amount` in sync for backwards compat with lock-in etc.
      amount: parsed,
      bonusEnabled: form.bonusEnabled || false,
      bonusAmount: form.bonusEnabled ? (parseFloat(form.bonusAmount) || 0) : 0,
      bonusMonths: form.bonusEnabled ? (form.bonusMonths || []) : [],
      manualDeductions: form.isTaxable && form.manualDeductions?.enabled
        ? { ...(form.manualDeductions || {}), enabled: true }
        : { enabled: false },
    };
    onSave(data);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {initial ? 'Edit Income' : (isSimpleMode ? 'Add Take-Home Pay' : 'Add Gross Income')}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              type="text" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={isSimpleMode ? 'e.g., My Paycheck, Side Job' : 'e.g., Primary Salary, Freelance, VA Disability'}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            />
          </div>
          <div className={isSimpleMode ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-2 gap-3'}>
            {!isSimpleMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  {INCOME_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isSimpleMode ? 'Take-Home Amount ($)' : 'Gross Amount ($)'}</label>
              <input
                type="number" required min="0" step="0.01" value={currentAmount}
                onChange={(e) => setForm({ ...form, [isSimpleMode ? 'takeHomeAmount' : 'grossAmount']: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frequency</label>
            <select value={form.frequency} onChange={(e) => handleFrequencyChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
              {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
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
          {!isSimpleMode && (
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={form.isTaxable} onChange={(e) => setForm({ ...form, isTaxable: e.target.checked, ...(e.target.checked ? {} : { manualDeductions: { enabled: false } }) })} className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-300 peer-checked:bg-emerald-500 rounded-full peer-focus:ring-2 peer-focus:ring-emerald-300 transition after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
              </label>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {form.isTaxable ? 'Taxable income' : 'Non-taxable (e.g., VA disability)'}
              </span>
            </div>
          )}
          {!isSimpleMode && form.isTaxable && (
            <div className="flex items-center gap-3 pl-1">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={form.manualDeductions?.enabled || false}
                  onChange={(e) => setForm({ ...form, manualDeductions: { ...(form.manualDeductions || {}), enabled: e.target.checked } })}
                  className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-300 peer-checked:bg-blue-500 rounded-full peer-focus:ring-2 peer-focus:ring-blue-300 transition after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
              </label>
              <div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Allow manual deductions</span>
                <p className="text-xs text-gray-400">Enter exact amounts from your pay stub on the Expenses page</p>
              </div>
            </div>
          )}
          {/* Bonus */}
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={form.bonusEnabled || false}
                    onChange={(e) => setForm({ ...form, bonusEnabled: e.target.checked })}
                    className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-300 peer-checked:bg-amber-500 rounded-full peer-focus:ring-2 peer-focus:ring-amber-300 transition after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Includes bonuses</span>
                  <p className="text-xs text-gray-400">Bonus is added to your regular paycheck in selected months</p>
                </div>
              </div>
              {form.bonusEnabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bonus Amount Per Check ($)</label>
                    <input
                      type="number" min="0" step="0.01" value={form.bonusAmount}
                      onChange={(e) => setForm({ ...form, bonusAmount: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">Extra amount added to your regular check during bonus months</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bonus Months</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {MONTH_NAMES.map((name, i) => {
                        const month = i + 1;
                        const selected = (form.bonusMonths || []).includes(month);
                        return (
                          <button key={month} type="button" onClick={() => toggleBonusMonth(month)}
                            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition ${selected ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 ring-1 ring-amber-300 dark:ring-amber-700' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                            {name}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Select months when you expect bonus pay on your check</p>
                  </div>
                </>
              )}
            </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition">
              {initial ? 'Save Changes' : (isSimpleMode ? 'Add Income' : 'Add Income')}
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Income Stream</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Are you sure you want to delete <strong>{name}</strong>? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Lock-In Modal ───

function LockInModal({ streams, currentMonth, lockedData, onClose, onLock, isSimpleMode, actualAmounts }) {
  const [entries, setEntries] = useState(() => {
    if (lockedData?.entries) {
      return lockedData.entries;
    }
    return streams.map((s) => ({
      id: s.id,
      name: s.name,
      estimated: getStreamMonthTotal(s, isSimpleMode, currentMonth),
      actual: actualAmounts[s.id] ?? getStreamMonthTotal(s, isSimpleMode, currentMonth),
    }));
  });

  const total = entries.reduce((sum, e) => sum + (parseFloat(e.actual) || 0), 0);

  function updateActual(i, val) {
    const updated = [...entries];
    updated[i] = { ...updated[i], actual: parseFloat(val) || 0 };
    setEntries(updated);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Lock In {MONTH_NAMES_FULL[currentMonth - 1]} Income
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Adjust amounts to match your actual paychecks this month, then lock it in.
        </p>

        <div className="space-y-3">
          {entries.map((entry, i) => (
            <div key={entry.id} className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{entry.name}</p>
                <p className="text-xs text-gray-400">Estimated: {formatCurrency(entry.estimated)}</p>
              </div>
              <div className="w-36">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={entry.actual}
                  onChange={(e) => updateActual(i, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-right focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Total</span>
            <span className="text-lg font-bold text-emerald-600">{formatCurrency(total)}</span>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              Cancel
            </button>
            <button onClick={() => onLock(entries, total)}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" /> Lock In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Income() {
  const { streams, loading, addStream, updateStream, removeStream } = useIncomeStreams();
  const { logs, lockMonth, unlockMonth } = useMonthlyIncomeLog();
  const { isSimpleMode, toggleMode } = useAppMode();
  usePrivacy();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [showLockModal, setShowLockModal] = useState(false);
  const [actualAmounts, setActualAmounts] = useState({});

  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  const currentYear = now.getFullYear();
  const yearMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const lockedData = logs[yearMonth];
  const isLocked = !!lockedData;

  // This Month calculation — uses mode-aware getStreamMonthTotal
  const thisMonthEstimated = useMemo(() =>
    streams.reduce((sum, s) => sum + getStreamMonthTotal(s, isSimpleMode, currentMonth, currentYear), 0),
    [streams, currentMonth, currentYear, isSimpleMode]
  );

  const thisMonthActualTotal = useMemo(() => {
    if (isLocked) return lockedData.total;
    const hasActuals = Object.keys(actualAmounts).length > 0;
    if (!hasActuals) return null;
    return streams.reduce((sum, s) => {
      const actual = actualAmounts[s.id];
      return sum + (actual !== undefined ? actual : getStreamMonthTotal(s, isSimpleMode, currentMonth, currentYear));
    }, 0);
  }, [streams, currentMonth, currentYear, isSimpleMode, isLocked, lockedData, actualAmounts]);

  const totalAnnual = streams.reduce((sum, s) => sum + toAnnual(getStreamAmount(s, isSimpleMode), s.frequency), 0);
  const taxableAnnual = streams.filter((s) => s.isTaxable).reduce((sum, s) => sum + toAnnual(getStreamAmount(s, isSimpleMode), s.frequency), 0);
  const nonTaxableAnnual = totalAnnual - taxableAnnual;

  const taxableThisMonth = streams.filter((s) => s.isTaxable).reduce((sum, s) => sum + getStreamMonthTotal(s, isSimpleMode, currentMonth, currentYear), 0);
  const nonTaxableThisMonth = thisMonthEstimated - taxableThisMonth;

  const pieData = streams.map((s) => ({
    name: s.name,
    value: getStreamMonthTotal(s, isSimpleMode, currentMonth, currentYear),
  }));

  const barData = [
    { name: 'Taxable', monthly: taxableThisMonth },
    { name: 'Non-taxable', monthly: nonTaxableThisMonth },
  ];

  function handleSave(data) {
    if (editing) {
      updateStream(editing.id, data);
    } else {
      addStream(data);
    }
    setEditing(null);
  }

  function handleDelete() {
    removeStream(deleting.id);
    setDeleting(null);
  }

  const freqLabel = (f) => FREQUENCIES.find((x) => x.value === f)?.label || f;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isSimpleMode ? 'Take-Home Pay' : 'Gross Income'}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{isSimpleMode ? 'Enter the amount you actually receive after taxes and deductions.' : 'Enter your pre-tax gross income. Deductions are calculated on the Expenses page.'}</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition">
          <Plus className="w-4 h-4" /> Add Income
        </button>
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
              <p><strong>Detailed Mode</strong> (default) gives you the full picture: gross income, tax profile with W-4 settings, auto-calculated or manual paystub deductions, FICA, 401(k), and a projected tax refund/owed estimate.</p>
              <p><strong>Simple Mode</strong> is for people who just want to enter the take-home pay they actually receive (net income). Tax calculations, 401(k), and paycheck deductions are all skipped. The Expenses page only shows bills you pay yourself — no tax or retirement sections.</p>
              <p className="italic text-xs">Tip: You can switch between modes at any time. Your data is preserved — switching modes only changes what the app shows you.</p>
            </div>
          </details>
        </div>
      </div>

      {/* This Month Card */}
      <div className={`rounded-xl p-5 text-white ${isLocked ? 'bg-gradient-to-r from-blue-600 to-indigo-700' : 'bg-gradient-to-r from-emerald-500 to-teal-600'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isLocked ? <Lock className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
              <h2 className="text-sm font-medium text-white/80">{MONTH_NAMES_FULL[currentMonth - 1]} {currentYear} Income</h2>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(isLocked ? lockedData.total : thisMonthEstimated)}</p>
            <p className="text-sm text-white/70 mt-1">
              {isLocked ? 'Locked in — actual amounts recorded' : 'Projected from your income streams'}
            </p>
            {!isLocked && thisMonthActualTotal !== null && (
              <p className="text-sm text-white/90 mt-1">Actual entered: {formatCurrency(thisMonthActualTotal)}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {isLocked ? (
              <button onClick={() => unlockMonth(yearMonth)}
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
      </div>

      {/* How to use */}
      <details className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <summary className="cursor-pointer text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <Info className="w-4 h-4" /> How to use this page
        </summary>
        <div className="mt-3 text-sm text-blue-700 dark:text-blue-400 space-y-1">
          {isSimpleMode ? (
            <>
              <p>Add each source of take-home income — the amount you actually receive after taxes and deductions.</p>
              <p>This is typically the net pay shown on your paycheck or bank deposit.</p>
              <p>Set the frequency (weekly, bi-weekly, semi-monthly, monthly, or annual).</p>
              <p className="italic">Tip: Switch to Detailed Mode on the Dashboard for gross income tracking with tax calculations.</p>
            </>
          ) : (
            <>
              <p>Add each source of gross (pre-tax) income — salary, side jobs, rental income, VA disability, etc.</p>
              <p>Set the frequency and whether it's taxable. Mark non-taxable income (like VA disability) as non-taxable.</p>
              <p>Tax deductions and withholding are configured on the <strong>Expenses &amp; Deductions</strong> page.</p>
            </>
          )}
        </div>
      </details>

      {/* Summary Cards */}
      <div className={`grid grid-cols-1 ${isSimpleMode ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-4`}>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">{isSimpleMode ? `${MONTH_NAMES_FULL[currentMonth - 1]} Take-Home (Projected)` : `${MONTH_NAMES_FULL[currentMonth - 1]} Gross Income (Projected)`}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(thisMonthEstimated)}</p>
          <p className="text-xs text-gray-400 mt-1">{formatCurrency(totalAnnual)} / year</p>
        </div>
        {!isSimpleMode && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Taxable Income (Annual)</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(taxableAnnual)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Non-Taxable (Annual)</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(nonTaxableAnnual)}</p>
            </div>
          </>
        )}
        {isSimpleMode && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Annual Take-Home</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalAnnual)}</p>
          </div>
        )}
      </div>

      {streams.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <DollarSign className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No income streams yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Click "Add Income" to get started</p>
        </div>
      ) : (
        <>
          {/* Income Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
                    {!isSimpleMode && <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Type</th>}
                    <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{isSimpleMode ? 'Take-Home' : 'Gross'}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Frequency</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Projected This Mo</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actual This Mo</th>
                    {!isSimpleMode && <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Taxable</th>}
                    <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {streams.map((s) => {
                    const amt = getStreamAmount(s, isSimpleMode);
                    const projected = getStreamMonthTotal(s, isSimpleMode, currentMonth, currentYear);
                    return (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {s.name}
                        {!isSimpleMode && s.bonusEnabled && s.bonusAmount > 0 && (
                          <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">+{formatCurrency(s.bonusAmount)} bonus</span>
                        )}
                        {amt === 0 && (
                          <span className="ml-2 text-xs text-red-400">({isSimpleMode ? 'gross only' : 'take-home only'})</span>
                        )}
                      </td>
                      {!isSimpleMode && (
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${s.type === 'w2' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                            {s.type === 'w2' ? 'W-2' : '1099'}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(amt)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{freqLabel(s.frequency)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(projected)}</td>
                      <td className="px-4 py-3 text-right">
                        {isLocked ? (
                          <span className="font-medium text-blue-600">{formatCurrency(lockedData.entries?.find(e => e.id === s.id)?.actual ?? projected)}</span>
                        ) : (
                          <input
                            type="number" min="0" step="0.01"
                            value={actualAmounts[s.id] ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setActualAmounts(prev => {
                                if (val === '') {
                                  const next = { ...prev };
                                  delete next[s.id];
                                  return next;
                                }
                                return { ...prev, [s.id]: parseFloat(val) || 0 };
                              });
                            }}
                            placeholder={formatCurrency(projected).replace('$', '')}
                            className="w-28 px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-right focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        )}
                      </td>
                      {!isSimpleMode && (
                        <td className="px-4 py-3 text-center">
                          {s.isTaxable ? (
                            <span className="text-emerald-500 text-xs font-medium">Yes</span>
                          ) : (
                            <span className="text-gray-400 text-xs font-medium">No</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditing(s); setShowModal(true); }}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleting(s)}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600 transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Income Breakdown</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {!isSimpleMode && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Taxable vs Non-Taxable (Monthly)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrencyShort(v)} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Bar dataKey="monthly" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      {showModal && (
        <IncomeModal
          isSimpleMode={isSimpleMode}
          initial={editing ? {
            name: editing.name, type: editing.type,
            takeHomeAmount: editing.takeHomeAmount ?? editing.amount ?? '',
            grossAmount: editing.grossAmount ?? '',
            frequency: editing.frequency,
            isTaxable: editing.isTaxable,
            applicableMonths: editing.applicableMonths || [],
            bonusEnabled: editing.bonusEnabled || false,
            bonusAmount: editing.bonusAmount || '',
            bonusMonths: editing.bonusMonths || [],
            manualDeductions: editing.manualDeductions || { enabled: false },
          } : null}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
      {deleting && (
        <ConfirmDelete name={deleting.name} onClose={() => setDeleting(null)} onConfirm={handleDelete} />
      )}
      {showLockModal && (
        <LockInModal
          streams={streams}
          currentMonth={currentMonth}
          lockedData={lockedData}
          isSimpleMode={isSimpleMode}
          actualAmounts={actualAmounts}
          onClose={() => setShowLockModal(false)}
          onLock={(entries, total) => { lockMonth(yearMonth, entries, total); setShowLockModal(false); }}
        />
      )}
    </div>
  );
}
