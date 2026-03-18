import { useState, useMemo } from 'react';
import { Receipt, Plus, Trash2, Pencil, Info, Calculator, X, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useIncomeStreams, useTaxProfile, useRetirement, useExpenses } from '../hooks/useFirestore';
import { FREQUENCIES, NEEDS_MONTH_PICKER, MONTH_NAMES, defaultMonthsForFrequency, toAnnual, toMonthly, formatCurrency, getPeriodsPerYear } from '../lib/financial';
import { calculateAllDeductions, STATES, FILING_STATUSES } from '../lib/taxEngine';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAppMode } from '../contexts/AppModeContext';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899', '#84cc16'];

// ─── Tax Profile Section ───

function TaxProfileForm({ profile, onSave }) {
  const [form, setForm] = useState(profile || {
    filingStatus: 'single',
    state: 'TX',
    dependents: 0,
    extraWithholding: 0,
  });
  const [open, setOpen] = useState(!profile);

  function handleSave() {
    onSave({
      ...form,
      dependents: parseInt(form.dependents) || 0,
      extraWithholding: parseFloat(form.extraWithholding) || 0,
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
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Tax Profile</h3>
            {profile && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {FILING_STATUSES.find(f => f.value === profile.filingStatus)?.label} &middot; {STATES.find(s => s.code === profile.state)?.name} &middot; {profile.dependents} dependent{profile.dependents !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700 pt-4 space-y-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dependents (children)</label>
              <input type="number" min="0" value={form.dependents}
                onChange={(e) => setForm({ ...form, dependents: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Extra Withholding ($/mo)</label>
              <input type="number" min="0" step="0.01" value={form.extraWithholding}
                onChange={(e) => setForm({ ...form, extraWithholding: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
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

// ─── Expense Modal ───

function ExpenseModal({ onClose, onSave, initial }) {
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
          {initial ? 'Edit Expense' : 'Add Expense'}
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

// ─── Main Expenses Page ───

export default function Expenses() {
  const { isSimpleMode } = useAppMode();
  const { streams } = useIncomeStreams();
  const { profile, saveTaxProfile } = useTaxProfile();
  const { retirement, saveRetirement } = useRetirement();
  const { expenses, addExpense, updateExpense, removeExpense } = useExpenses();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // Prepare income streams with periodsPerYear for tax engine
  const preparedStreams = streams.map((s) => ({
    ...s,
    periodsPerYear: getPeriodsPerYear(s.frequency),
  }));

  const deductions = useMemo(() => calculateAllDeductions({
    incomeStreams: preparedStreams,
    taxProfile: profile || {},
    retirement: retirement || {},
  }), [preparedStreams, profile, retirement]);

  // Variable expenses totals (monthly)
  const totalVariableMonthly = expenses.reduce((sum, e) => sum + toMonthly(e.amount, e.frequency), 0);
  const totalVariableAnnual = expenses.reduce((sum, e) => sum + toAnnual(e.amount, e.frequency), 0);

  const netAfterAll = deductions.netAnnual - totalVariableAnnual;

  // Chart data
  const deductionPieData = [
    { name: 'Federal Tax', value: deductions.federalTaxAfterCredits },
    { name: `State Tax (${deductions.stateName})`, value: deductions.stateTax },
    { name: 'Social Security & Medicare', value: deductions.totalFICA },
    { name: '401(k)', value: deductions.k401.total },
    { name: 'Variable Expenses', value: totalVariableAnnual },
  ].filter((d) => d.value > 0);

  const summaryBarData = [
    { name: 'Gross', amount: deductions.totalGrossAnnual },
    { name: 'Tax+FICA', amount: -(deductions.federalTaxAfterCredits + deductions.stateTax + deductions.totalFICA) },
    { name: '401(k)', amount: -deductions.k401.total },
    { name: 'Expenses', amount: -totalVariableAnnual },
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

  function handleDeleteExpense() {
    removeExpense(deleting.id);
    setDeleting(null);
  }

  const freqLabel = (f) => FREQUENCIES.find((x) => x.value === f)?.label || f;
  const refundAmount = deductions.extraWithholdingAnnual;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isSimpleMode ? 'Expenses' : 'Expenses & Deductions'}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{isSimpleMode ? 'Track the bills and expenses you pay each month.' : 'Calculate deductions, track expenses, and see your net income.'}</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition">
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* How to use */}
      <details className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <summary className="cursor-pointer text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <Info className="w-4 h-4" /> How to use this page
        </summary>
        <div className="mt-3 text-sm text-blue-700 dark:text-blue-400 space-y-1">
          {isSimpleMode ? (
            <>
              <p>Add the bills and expenses you pay each month (rent, car payment, utilities, subscriptions, etc.).</p>
              <p>Your disposable income is calculated as your take-home pay minus these expenses.</p>
              <p className="italic">Tip: Switch to Detailed mode on the Dashboard to track taxes, retirement contributions, and more.</p>
            </>
          ) : (
            <>
              <p>Set up your tax profile (filing status, state, dependents) to auto-calculate withholdings.</p>
              <p>Configure 401(k) contributions (traditional and/or Roth).</p>
              <p>Add variable expenses like rent, car payment, utilities, subscriptions, etc.</p>
              <p className="italic">Warning: Tax calculations are estimates only, not tax advice.</p>
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
            {profile ? (
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
                <p className="text-white/80 text-sm mt-1">Set up your tax profile to see your estimate</p>
              </>
            )}
          </div>

          {/* Tax Profile & Retirement Settings */}
          <div className="space-y-3">
            <TaxProfileForm profile={profile} onSave={saveTaxProfile} />
            <RetirementForm retirement={retirement} onSave={saveRetirement} />
          </div>

          {/* Auto-Calculated Deductions Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Auto-Calculated Deductions (Annual)</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total Taxable Income</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(deductions.totalTaxableAnnual)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Standard Deduction</span>
                <span className="font-medium text-red-500">-{formatCurrency(deductions.standardDeduction)}</span>
              </div>
              <hr className="border-gray-100 dark:border-gray-700" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Federal Income Tax</span>
                <span className="font-medium text-red-500">-{formatCurrency(deductions.federalTax)}</span>
              </div>
              {deductions.childCredit > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 pl-4">Child Tax Credit ({(profile?.dependents || 0)} child{(profile?.dependents || 0) !== 1 ? 'ren' : ''})</span>
                  <span className="font-medium text-emerald-500">+{formatCurrency(deductions.childCredit)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Federal Tax After Credits</span>
                <span className="font-medium text-red-500">-{formatCurrency(deductions.federalTaxAfterCredits)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">State Tax ({deductions.stateName})</span>
                <span className="font-medium text-red-500">-{formatCurrency(deductions.stateTax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">FICA (Social Security + Medicare)</span>
                <span className="font-medium text-red-500">-{formatCurrency(deductions.totalFICA)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">401(k) Traditional</span>
                <span className="font-medium text-red-500">-{formatCurrency(deductions.k401.traditional)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">401(k) Roth</span>
                <span className="font-medium text-red-500">-{formatCurrency(deductions.k401.roth)}</span>
              </div>
              <hr className="border-gray-100 dark:border-gray-700" />
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-gray-900 dark:text-white">Total Auto Deductions</span>
                <span className="text-red-500">-{formatCurrency(deductions.totalDeductions)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Variable Expenses */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">Variable Expenses</h3>
          <span className="text-sm text-gray-500">{formatCurrency(totalVariableMonthly)}/mo</span>
        </div>
        {expenses.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No variable expenses added yet. Click "Add Expense" above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Frequency</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Monthly</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{e.name}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{freqLabel(e.frequency)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(toMonthly(e.amount, e.frequency))}</td>
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
            </table>
          </div>
        )}
      </div>

      {/* Net Income Summary */}
      {isSimpleMode ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Expenses</p>
            <p className="text-2xl font-bold text-red-500 mt-1">{formatCurrency(totalVariableAnnual)}</p>
            <p className="text-xs text-gray-400 mt-1">{formatCurrency(totalVariableMonthly)}/mo</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Disposable Income</p>
            {(() => {
              const totalIncomeMonthly = streams.reduce((sum, s) => sum + toMonthly(s.amount, s.frequency), 0);
              const disposable = totalIncomeMonthly - totalVariableMonthly;
              return (
                <>
                  <p className={`text-2xl font-bold mt-1 ${disposable >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(disposable)}</p>
                  <p className="text-xs text-gray-400 mt-1">Take-home income minus expenses (monthly)</p>
                </>
              );
            })()}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Gross Annual</p>
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
            <p className="text-xs text-gray-400 mt-1">{formatCurrency(netAfterAll / 12)}/mo (after all expenses)</p>
          </div>
        </div>
      )}

      {/* Charts */}
      {isSimpleMode ? (
        expenses.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Expense Breakdown (Monthly)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={expenses.map((e) => ({ name: e.name, value: toMonthly(e.amount, e.frequency) }))}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={3} dataKey="value">
                  {expenses.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
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
          initial={editing ? { name: editing.name, amount: editing.amount, frequency: editing.frequency, applicableMonths: editing.applicableMonths || [] } : null}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={handleSaveExpense}
        />
      )}
      {deleting && (
        <ConfirmDelete name={deleting.name} onClose={() => setDeleting(null)} onConfirm={handleDeleteExpense} />
      )}
    </div>
  );
}