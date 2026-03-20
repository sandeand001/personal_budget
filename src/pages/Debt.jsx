import { useState, useMemo } from 'react';
import { Landmark, Plus, Trash2, Pencil, X, TrendingDown, ChevronDown, ChevronRight, GraduationCap, Lock, Unlock, Info, ToggleLeft, ToggleRight } from 'lucide-react';
import { useDebts, useLoanGroups, useFixedExpenses, useExpenses, useMonthlyDebtLog } from '../hooks/useFirestore';
import { formatCurrency, formatCurrencyShort, FREQUENCIES, toMonthly, toAnnual, getAmountForMonth, MONTH_NAMES_FULL } from '../lib/financial';
import { usePrivacy } from '../contexts/PrivacyContext';
import { useAppMode } from '../contexts/AppModeContext';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const DEBT_TYPES = [
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'auto', label: 'Auto Loan' },
  { value: 'student', label: 'Student Loan' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'personal', label: 'Personal Loan' },
  { value: 'medical', label: 'Medical Debt' },
  { value: 'other', label: 'Other' },
];

const SUB_LOAN_TYPES = [
  { value: 'subsidized', label: 'Subsidized' },
  { value: 'unsubsidized', label: 'Unsubsidized' },
  { value: 'other', label: 'Other' },
];

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#10b981'];

function DebtModal({ onClose, onSave, initial }) {
  const [form, setForm] = useState(initial || {
    name: '',
    type: 'credit_card',
    balance: '',
    interestRate: '',
    minimumPayment: '',
    paymentFrequency: 'monthly',
  });

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      ...form,
      balance: parseFloat(form.balance) || 0,
      interestRate: parseFloat(form.interestRate) || 0,
      minimumPayment: parseFloat(form.minimumPayment) || 0,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {initial ? 'Edit Debt' : 'Add Debt'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              type="text" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Chase Visa, Car Loan"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                {DEBT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Balance ($)</label>
              <input
                type="number" required min="0" step="0.01" value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Interest Rate (%)</label>
              <input
                type="number" required min="0" step="0.01" value={form.interestRate}
                onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min. Payment ($)</label>
              <input
                type="number" required min="0" step="0.01" value={form.minimumPayment}
                onChange={(e) => setForm({ ...form, minimumPayment: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Frequency</label>
            <select value={form.paymentFrequency} onChange={(e) => setForm({ ...form, paymentFrequency: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
              {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition">
              {initial ? 'Save Changes' : 'Add Debt'}
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Remove <strong>{name}</strong>? This can't be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Loan Group Modal ── */

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function LoanGroupModal({ onClose, onSave, initial }) {
  const [form, setForm] = useState(initial || {
    name: '',
    servicer: '',
    minimumPayment: '',
    paymentFrequency: 'monthly',
    subLoans: [{ id: genId(), name: '', balance: '', interestRate: '', type: 'unsubsidized' }],
  });

  function addSubLoan() {
    setForm({ ...form, subLoans: [...form.subLoans, { id: genId(), name: '', balance: '', interestRate: '', type: 'unsubsidized' }] });
  }

  function updateSubLoan(idx, key, value) {
    const updated = form.subLoans.map((sl, i) => i === idx ? { ...sl, [key]: value } : sl);
    setForm({ ...form, subLoans: updated });
  }

  function removeSubLoan(idx) {
    if (form.subLoans.length <= 1) return;
    setForm({ ...form, subLoans: form.subLoans.filter((_, i) => i !== idx) });
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      name: form.name,
      servicer: form.servicer,
      minimumPayment: parseFloat(form.minimumPayment) || 0,
      paymentFrequency: form.paymentFrequency,
      subLoans: form.subLoans.map((sl) => ({
        id: sl.id || genId(),
        name: sl.name,
        balance: parseFloat(sl.balance) || 0,
        interestRate: parseFloat(sl.interestRate) || 0,
        type: sl.type,
      })),
    });
    onClose();
  }

  const totalBalance = form.subLoans.reduce((s, sl) => s + (parseFloat(sl.balance) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-blue-500" />
          {initial ? 'Edit Loan Group' : 'Add Loan Group'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Group-level fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group Name</label>
              <input type="text" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Federal Student Loans"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Servicer</label>
              <input type="text" value={form.servicer}
                onChange={(e) => setForm({ ...form, servicer: e.target.value })}
                placeholder="e.g., MOHELA, Nelnet"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shared Min. Payment ($)</label>
              <input type="number" required min="0" step="0.01" value={form.minimumPayment}
                onChange={(e) => setForm({ ...form, minimumPayment: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Frequency</label>
              <select value={form.paymentFrequency} onChange={(e) => setForm({ ...form, paymentFrequency: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          {/* Sub-loans */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Sub-Loans ({form.subLoans.length})
                {totalBalance > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    Total: {formatCurrency(totalBalance)}
                  </span>
                )}
              </h3>
              <button type="button" onClick={addSubLoan}
                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                <Plus className="w-3.5 h-3.5" /> Add Sub-Loan
              </button>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {form.subLoans.map((sl, idx) => (
                <div key={sl.id || idx} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 relative">
                  {form.subLoans.length > 1 && (
                    <button type="button" onClick={() => removeSubLoan(idx)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Name</label>
                      <input type="text" required value={sl.name}
                        onChange={(e) => updateSubLoan(idx, 'name', e.target.value)}
                        placeholder="e.g., Direct Sub Loan 1"
                        className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-1 focus:ring-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Balance ($)</label>
                      <input type="number" required min="0" step="0.01" value={sl.balance}
                        onChange={(e) => updateSubLoan(idx, 'balance', e.target.value)}
                        placeholder="0.00"
                        className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-1 focus:ring-emerald-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Rate (%)</label>
                        <input type="number" required min="0" step="0.01" value={sl.interestRate}
                          onChange={(e) => updateSubLoan(idx, 'interestRate', e.target.value)}
                          placeholder="0.00"
                          className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-1 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Type</label>
                        <select value={sl.type} onChange={(e) => updateSubLoan(idx, 'type', e.target.value)}
                          className="w-full px-1 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs outline-none">
                          {SUB_LOAN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition">
              {initial ? 'Save Changes' : 'Add Loan Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Loan Group Card ── */

function LoanGroupCard({ group, onEdit, onDelete, linkedCount = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const subLoans = group.subLoans || [];
  const totalBalance = subLoans.reduce((s, sl) => s + (sl.balance || 0), 0);
  const weightedRate = totalBalance > 0
    ? subLoans.reduce((s, sl) => s + (sl.balance || 0) * (sl.interestRate || 0), 0) / totalBalance
    : 0;
  const monthlyPmt = toMonthly(group.minimumPayment || 0, group.paymentFrequency || 'monthly');

  // Distribute payment proportionally by balance
  const distributions = subLoans.map((sl) => {
    const share = totalBalance > 0 ? (sl.balance || 0) / totalBalance : 0;
    return { ...sl, share, payment: monthlyPmt * share };
  });

  const payoff = calcPayoff(totalBalance, weightedRate, monthlyPmt);
  const payoffText = isFinite(payoff.months)
    ? payoff.months < 12 ? `${payoff.months} mo` : `${Math.round(payoff.months / 12 * 10) / 10} yr`
    : '∞';

  const activeLoans = subLoans.filter((sl) => (sl.balance || 0) > 0).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition"
        onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          {expanded
            ? <ChevronDown className="w-5 h-5 text-gray-400" />
            : <ChevronRight className="w-5 h-5 text-gray-400" />}
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-500" />
              <span className="font-semibold text-gray-900 dark:text-white">{group.name}</span>
              {group.servicer && (
                <span className="text-xs text-gray-500 dark:text-gray-400">({group.servicer})</span>
              )}
              {linkedCount > 0 && (
                <span className="text-xs text-blue-500 dark:text-blue-400">{linkedCount} linked</span>
              )}
            </div>
            <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              <span>{activeLoans} of {subLoans.length} active loans</span>
              <span>Wtd. Rate: {weightedRate.toFixed(2)}%</span>
              <span>Payoff: {payoffText}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-bold text-red-600">{formatCurrency(totalBalance)}</p>
            <p className="text-xs text-gray-500">{formatCurrency(monthlyPmt)}/mo</p>
          </div>
          <div className="flex gap-1">
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
              <Pencil className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded sub-loans */}
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Sub-Loan</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Type</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Balance</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Rate</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Share</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Est. Payment</th>
              </tr>
            </thead>
            <tbody>
              {distributions.map((sl) => {
                const typeLabel = SUB_LOAN_TYPES.find((t) => t.value === sl.type)?.label || sl.type;
                return (
                  <tr key={sl.id} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{sl.name}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        sl.type === 'subsidized'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : sl.type === 'unsubsidized'
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {typeLabel}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-red-600 font-medium">{formatCurrency(sl.balance)}</td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{sl.interestRate}%</td>
                    <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-400">{(sl.share * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(sl.payment)}/mo</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <td colSpan={2} className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300">Totals</td>
                <td className="px-4 py-2 text-right text-sm font-bold text-red-600">{formatCurrency(totalBalance)}</td>
                <td className="px-4 py-2 text-right text-xs text-gray-500">{weightedRate.toFixed(2)}%</td>
                <td className="px-4 py-2 text-right text-xs text-gray-500">100%</td>
                <td className="px-4 py-2 text-right text-sm font-bold text-gray-700 dark:text-gray-300">{formatCurrency(monthlyPmt)}/mo</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

/** Calculate months to payoff and total interest for a debt */
function calcPayoff(balance, annualRate, monthlyPayment) {
  if (monthlyPayment <= 0 || balance <= 0) return { months: Infinity, totalInterest: 0 };
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) {
    return { months: Math.ceil(balance / monthlyPayment), totalInterest: 0 };
  }
  // Minimum payment must cover interest
  const monthlyInterest = balance * monthlyRate;
  if (monthlyPayment <= monthlyInterest) return { months: Infinity, totalInterest: Infinity };

  const months = Math.ceil(
    -Math.log(1 - (balance * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate)
  );
  const totalPaid = monthlyPayment * months;
  return { months, totalInterest: totalPaid - balance };
}

/** Debt Lock-In Modal */
function DebtLockInModal({ debts, loanGroups, linkedExpenses, currentMonth, lockedData, onClose, onLock }) {
  // Build entries for each debt that has linked expenses
  const [entries, setEntries] = useState(() => {
    if (lockedData?.entries) return lockedData.entries;

    const rows = [];
    debts.forEach((d) => {
      const linked = linkedExpenses.filter((e) => e.linkedDebtId === d.id && e.linkedDebtType === 'debt');
      if (linked.length === 0) return;
      const totalPayment = linked.reduce((s, e) => s + getAmountForMonth(e.amount, e.frequency, e.applicableMonths, currentMonth), 0);
      rows.push({
        debtId: d.id,
        debtType: 'debt',
        name: d.name,
        currentBalance: d.balance,
        payment: totalPayment,
        linkedItems: linked.map((e) => ({ id: e.id, name: e.name, amount: getAmountForMonth(e.amount, e.frequency, e.applicableMonths, currentMonth) })),
      });
    });
    loanGroups.forEach((g) => {
      const linked = linkedExpenses.filter((e) => e.linkedDebtId === g.id && e.linkedDebtType === 'loanGroup');
      if (linked.length === 0) return;
      const totalPayment = linked.reduce((s, e) => s + getAmountForMonth(e.amount, e.frequency, e.applicableMonths, currentMonth), 0);
      rows.push({
        debtId: g.id,
        debtType: 'loanGroup',
        name: g.name,
        currentBalance: (g.subLoans || []).reduce((s, sl) => s + (sl.balance || 0), 0),
        payment: totalPayment,
        linkedItems: linked.map((e) => ({ id: e.id, name: e.name, amount: getAmountForMonth(e.amount, e.frequency, e.applicableMonths, currentMonth) })),
      });
    });
    return rows;
  });

  function updatePayment(idx, val) {
    const updated = [...entries];
    updated[idx] = { ...updated[idx], payment: parseFloat(val) || 0 };
    setEntries(updated);
  }

  const totalPayments = entries.reduce((s, e) => s + e.payment, 0);

  if (entries.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Linked Expenses</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            No expenses are linked to any debts. Link expenses to debts on the Expenses page first.
          </p>
          <button onClick={onClose}
            className="w-full py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Lock In {MONTH_NAMES_FULL[currentMonth - 1]} Debt Payments
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Review payment amounts, then lock in to apply them to your debt balances.
        </p>

        <div className="space-y-4">
          {entries.map((entry, idx) => (
            <div key={entry.debtId} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{entry.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Current balance: {formatCurrency(entry.currentBalance)}
                  </p>
                </div>
              </div>
              {/* Linked expense breakdown */}
              <div className="space-y-1 mb-3">
                {entry.linkedItems.map((li) => (
                  <div key={li.id} className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{li.name}</span>
                    <span>{formatCurrency(li.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">Total Payment:</label>
                <input type="number" min="0" step="0.01" value={entry.payment}
                  onChange={(e) => updatePayment(idx, e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-right" />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                New balance: {formatCurrency(Math.max(0, entry.currentBalance - entry.payment))}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Total Payments</span>
            <span className="text-lg font-bold text-emerald-600">{formatCurrency(totalPayments)}</span>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              Cancel
            </button>
            <button onClick={() => onLock(entries)}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" /> Lock In & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Debt() {
  const { debts, loading, addDebt, updateDebt, removeDebt } = useDebts();
  const { loanGroups, loading: groupsLoading, addLoanGroup, updateLoanGroup, removeLoanGroup } = useLoanGroups();
  const { expenses: fixedExpensesList } = useFixedExpenses();
  const { expenses: variableExpensesList } = useExpenses();
  const { logs: debtLogs, lockMonth: lockDebtMonth, unlockMonth: unlockDebtMonth } = useMonthlyDebtLog();
  usePrivacy();
  const { isSimpleMode, toggleMode } = useAppMode();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [deleteGroup, setDeleteGroup] = useState(null);
  const [showLockModal, setShowLockModal] = useState(false);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const yearMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const lockedDebtData = debtLogs[yearMonth];
  const isDebtLocked = !!lockedDebtData;

  // All expenses linked to debts
  const linkedExpenses = useMemo(() => {
    return [...fixedExpensesList, ...variableExpensesList].filter((e) => e.linkedDebtId);
  }, [fixedExpensesList, variableExpensesList]);

  // Count linked expenses per debt for display
  const linkedCountByDebt = useMemo(() => {
    const counts = {};
    linkedExpenses.forEach((e) => {
      const key = e.linkedDebtId;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [linkedExpenses]);

  const summary = useMemo(() => {
    let totalBalance = 0;
    let totalMonthlyPayment = 0;
    let totalInterest = 0;

    debts.forEach((d) => {
      totalBalance += d.balance || 0;
      const monthlyPmt = toMonthly(d.minimumPayment || 0, d.paymentFrequency || 'monthly');
      totalMonthlyPayment += monthlyPmt;
      const payoff = calcPayoff(d.balance, d.interestRate, monthlyPmt);
      if (isFinite(payoff.totalInterest)) totalInterest += payoff.totalInterest;
    });

    // Include loan groups
    loanGroups.forEach((g) => {
      const subLoans = g.subLoans || [];
      const groupBalance = subLoans.reduce((s, sl) => s + (sl.balance || 0), 0);
      totalBalance += groupBalance;
      const monthlyPmt = toMonthly(g.minimumPayment || 0, g.paymentFrequency || 'monthly');
      totalMonthlyPayment += monthlyPmt;
      const weightedRate = groupBalance > 0
        ? subLoans.reduce((s, sl) => s + (sl.balance || 0) * (sl.interestRate || 0), 0) / groupBalance
        : 0;
      const payoff = calcPayoff(groupBalance, weightedRate, monthlyPmt);
      if (isFinite(payoff.totalInterest)) totalInterest += payoff.totalInterest;
    });

    return { totalBalance, totalMonthlyPayment, totalInterest };
  }, [debts, loanGroups]);

  // Pie chart data by type
  const pieData = useMemo(() => {
    const byType = {};
    debts.forEach((d) => {
      const label = DEBT_TYPES.find((t) => t.value === d.type)?.label || d.type;
      byType[label] = (byType[label] || 0) + (d.balance || 0);
    });
    loanGroups.forEach((g) => {
      const label = 'Loan Group';
      const groupBalance = (g.subLoans || []).reduce((s, sl) => s + (sl.balance || 0), 0);
      byType[label] = (byType[label] || 0) + groupBalance;
    });
    return Object.entries(byType).map(([name, value]) => ({ name, value }));
  }, [debts, loanGroups]);

  // Bar chart data — individual debts + loan groups
  const barData = useMemo(() => {
    const rows = debts.map((d) => {
      const monthlyPmt = toMonthly(d.minimumPayment || 0, d.paymentFrequency || 'monthly');
      const payoff = calcPayoff(d.balance, d.interestRate, monthlyPmt);
      return {
        name: d.name.length > 12 ? d.name.slice(0, 12) + '…' : d.name,
        Balance: d.balance,
        Interest: isFinite(payoff.totalInterest) ? Math.round(payoff.totalInterest) : 0,
      };
    });
    loanGroups.forEach((g) => {
      const subLoans = g.subLoans || [];
      const groupBalance = subLoans.reduce((s, sl) => s + (sl.balance || 0), 0);
      const weightedRate = groupBalance > 0
        ? subLoans.reduce((s, sl) => s + (sl.balance || 0) * (sl.interestRate || 0), 0) / groupBalance
        : 0;
      const monthlyPmt = toMonthly(g.minimumPayment || 0, g.paymentFrequency || 'monthly');
      const payoff = calcPayoff(groupBalance, weightedRate, monthlyPmt);
      rows.push({
        name: g.name.length > 12 ? g.name.slice(0, 12) + '…' : g.name,
        Balance: groupBalance,
        Interest: isFinite(payoff.totalInterest) ? Math.round(payoff.totalInterest) : 0,
      });
    });
    return rows;
  }, [debts, loanGroups]);

  const hasAny = debts.length > 0 || loanGroups.length > 0;

  // Total linked expense payments for this month
  const totalLinkedPayments = useMemo(() => {
    return linkedExpenses.reduce((s, e) => s + getAmountForMonth(e.amount, e.frequency, e.applicableMonths, currentMonth), 0);
  }, [linkedExpenses, currentMonth]);

  async function handleLockDebts(entries) {
    // Apply payments: reduce debt balances
    for (const entry of entries) {
      if (entry.payment <= 0) continue;
      if (entry.debtType === 'debt') {
        const debt = debts.find((d) => d.id === entry.debtId);
        if (debt) {
          const newBalance = Math.max(0, (debt.balance || 0) - entry.payment);
          await updateDebt(entry.debtId, { balance: newBalance });
        }
      } else if (entry.debtType === 'loanGroup') {
        const group = loanGroups.find((g) => g.id === entry.debtId);
        if (group) {
          const subLoans = group.subLoans || [];
          const totalBal = subLoans.reduce((s, sl) => s + (sl.balance || 0), 0);
          // Distribute payment proportionally by balance
          const updatedSubLoans = subLoans.map((sl) => {
            const share = totalBal > 0 ? (sl.balance || 0) / totalBal : 0;
            const subPayment = entry.payment * share;
            return { ...sl, balance: Math.max(0, (sl.balance || 0) - subPayment) };
          });
          await updateLoanGroup(entry.debtId, { subLoans: updatedSubLoans });
        }
      }
    }
    // Save the log
    await lockDebtMonth(yearMonth, { entries, totalPayments: entries.reduce((s, e) => s + e.payment, 0) });
    setShowLockModal(false);
  }

  async function handleUnlockDebts() {
    if (!lockedDebtData?.entries) return;
    // Reverse: add payments back to balances
    for (const entry of lockedDebtData.entries) {
      if (entry.payment <= 0) continue;
      if (entry.debtType === 'debt') {
        const debt = debts.find((d) => d.id === entry.debtId);
        if (debt) {
          await updateDebt(entry.debtId, { balance: (debt.balance || 0) + entry.payment });
        }
      } else if (entry.debtType === 'loanGroup') {
        const group = loanGroups.find((g) => g.id === entry.debtId);
        if (group) {
          const subLoans = group.subLoans || [];
          // Reverse proportional distribution using original balances in entry
          const originalTotal = entry.currentBalance || 0;
          const updatedSubLoans = subLoans.map((sl) => {
            const currentSubTotal = subLoans.reduce((s, x) => s + (x.balance || 0), 0);
            const restoredTotal = currentSubTotal + entry.payment;
            // We need to add back proportionally. Since we distributed proportionally by balance when subtracting,
            // we'll add back based on current share of the restored total. But since sub-loan ratios are preserved,
            // this is the best we can do.
            const share = restoredTotal > 0 ? (sl.balance || 0) / currentSubTotal : 0;
            const addBack = entry.payment * share;
            return { ...sl, balance: (sl.balance || 0) + addBack };
          });
          await updateLoanGroup(entry.debtId, { subLoans: updatedSubLoans });
        }
      }
    }
    await unlockDebtMonth(yearMonth);
  }

  if (loading || groupsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Landmark className="w-7 h-7 text-red-500" /> Loan &amp; Debt Repayment
        </h1>
        <div className="flex gap-2">
          <button onClick={() => { setEditGroup(null); setGroupModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
            <GraduationCap className="w-4 h-4" /> Add Loan Group
          </button>
          <button onClick={() => { setEditItem(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition">
            <Plus className="w-4 h-4" /> Add Debt
          </button>
        </div>
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

      {/* Summary Cards */}
      {hasAny && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Balance</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalBalance)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Payments</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(summary.totalMonthlyPayment)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Est. Total Interest</p>
            <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{formatCurrency(summary.totalInterest)}</p>
          </div>
        </div>
      )}

      {/* Debt Lock-In Card */}
      {hasAny && linkedExpenses.length > 0 && (
        <div className={`rounded-xl p-5 text-white ${isDebtLocked ? 'bg-gradient-to-r from-blue-600 to-indigo-700' : 'bg-gradient-to-r from-orange-500 to-rose-600'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isDebtLocked ? <Lock className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
                <h2 className="text-sm font-medium text-white/80">{MONTH_NAMES_FULL[currentMonth - 1]} {currentYear} Payments</h2>
              </div>
              {isDebtLocked ? (
                <>
                  <p className="text-3xl font-bold">{formatCurrency(lockedDebtData.totalPayments)}</p>
                  <p className="text-sm text-white/70 mt-1">
                    Payments locked — applied to {lockedDebtData.entries?.length || 0} debt(s)
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold">{formatCurrency(totalLinkedPayments)}</p>
                  <p className="text-sm text-white/70 mt-1">
                    {linkedExpenses.length} linked expense{linkedExpenses.length !== 1 ? 's' : ''} ready to apply
                  </p>
                </>
              )}
            </div>
            <div>
              {isDebtLocked ? (
                <button onClick={handleUnlockDebts}
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
          {isDebtLocked && lockedDebtData.entries && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <div className="flex flex-wrap gap-3">
                {lockedDebtData.entries.map((entry) => (
                  <span key={entry.debtId} className="text-sm">{entry.name}: {formatCurrency(entry.payment)}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loan Groups */}
      {loanGroups.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-500" /> Loan Groups
          </h2>
          {loanGroups.map((g) => (
            <LoanGroupCard key={g.id} group={g}
              linkedCount={linkedCountByDebt[g.id] || 0}
              onEdit={() => { setEditGroup(g); setGroupModalOpen(true); }}
              onDelete={() => setDeleteGroup(g)} />
          ))}
        </div>
      )}

      {/* Individual Debts Table / Empty State */}
      {debts.length === 0 && loanGroups.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Landmark className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">No debts yet. Add a single debt or a loan group above.</p>
        </div>
      ) : debts.length > 0 && (
        <div>
          {loanGroups.length > 0 && (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Individual Debts</h2>
          )}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Type</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Balance</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Rate</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Payment</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Payoff</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {debts.map((d) => {
                    const monthlyPmt = toMonthly(d.minimumPayment || 0, d.paymentFrequency || 'monthly');
                    const payoff = calcPayoff(d.balance, d.interestRate, monthlyPmt);
                    const typeLabel = DEBT_TYPES.find((t) => t.value === d.type)?.label || d.type;
                    const payoffText = isFinite(payoff.months)
                      ? payoff.months < 12
                        ? `${payoff.months} mo`
                        : `${Math.round(payoff.months / 12 * 10) / 10} yr`
                      : '∞';
                    return (
                      <tr key={d.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {d.name}
                          {linkedCountByDebt[d.id] && (
                            <span className="ml-2 text-xs text-blue-500 dark:text-blue-400">
                              {linkedCountByDebt[d.id]} linked
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {typeLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-red-600 font-medium">{formatCurrency(d.balance)}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{d.interestRate}%</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(monthlyPmt)}/mo</td>
                        <td className="px-4 py-3 text-right">
                          <span className={payoff.months === Infinity ? 'text-red-500 font-medium' : 'text-gray-700 dark:text-gray-300'}>
                            {payoffText}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => { setEditItem(d); setModalOpen(true); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                              <Pencil className="w-4 h-4 text-gray-400" />
                            </button>
                            <button onClick={() => setDeleteItem(d)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                              <Trash2 className="w-4 h-4 text-red-400" />
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
        </div>
      )}

      {/* Charts */}
      {hasAny && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Debt by Type Pie */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Balance by Type</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Balance + Interest Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Balance vs Est. Interest</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="Balance" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Interest" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Payoff Strategy Info */}
      {(debts.length + loanGroups.length) >= 2 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300 flex gap-3">
          <TrendingDown className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong>Payoff Tip:</strong> The <em>avalanche method</em> (pay extra toward highest-interest debt first) saves the most money.
            The <em>snowball method</em> (pay off smallest balance first) gives faster wins for motivation.
          </div>
        </div>
      )}

      {/* Modals */}
      {modalOpen && (
        <DebtModal
          initial={editItem}
          onClose={() => { setModalOpen(false); setEditItem(null); }}
          onSave={(data) => editItem ? updateDebt(editItem.id, data) : addDebt(data)}
        />
      )}
      {groupModalOpen && (
        <LoanGroupModal
          initial={editGroup}
          onClose={() => { setGroupModalOpen(false); setEditGroup(null); }}
          onSave={(data) => editGroup ? updateLoanGroup(editGroup.id, data) : addLoanGroup(data)}
        />
      )}
      {deleteItem && (
        <ConfirmDelete
          name={deleteItem.name}
          onClose={() => setDeleteItem(null)}
          onConfirm={() => { removeDebt(deleteItem.id); setDeleteItem(null); }}
        />
      )}
      {deleteGroup && (
        <ConfirmDelete
          name={deleteGroup.name}
          onClose={() => setDeleteGroup(null)}
          onConfirm={() => { removeLoanGroup(deleteGroup.id); setDeleteGroup(null); }}
        />
      )}
      {showLockModal && (
        <DebtLockInModal
          debts={debts}
          loanGroups={loanGroups}
          linkedExpenses={linkedExpenses}
          currentMonth={currentMonth}
          lockedData={lockedDebtData}
          onClose={() => setShowLockModal(false)}
          onLock={handleLockDebts}
        />
      )}
    </div>
  );
}
