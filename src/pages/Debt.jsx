import { useState, useMemo } from 'react';
import { Landmark, Plus, Trash2, Pencil, X, TrendingDown } from 'lucide-react';
import { useDebts } from '../hooks/useFirestore';
import { formatCurrency, FREQUENCIES, toMonthly, toAnnual } from '../lib/financial';
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Debt</h3>
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

export default function Debt() {
  const { debts, loading, addDebt, updateDebt, removeDebt } = useDebts();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

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

    return { totalBalance, totalMonthlyPayment, totalInterest };
  }, [debts]);

  // Pie chart data by type
  const pieData = useMemo(() => {
    const byType = {};
    debts.forEach((d) => {
      const label = DEBT_TYPES.find((t) => t.value === d.type)?.label || d.type;
      byType[label] = (byType[label] || 0) + (d.balance || 0);
    });
    return Object.entries(byType).map(([name, value]) => ({ name, value }));
  }, [debts]);

  // Bar chart data — individual debts
  const barData = useMemo(() => {
    return debts.map((d) => {
      const monthlyPmt = toMonthly(d.minimumPayment || 0, d.paymentFrequency || 'monthly');
      const payoff = calcPayoff(d.balance, d.interestRate, monthlyPmt);
      return {
        name: d.name.length > 12 ? d.name.slice(0, 12) + '…' : d.name,
        Balance: d.balance,
        Interest: isFinite(payoff.totalInterest) ? Math.round(payoff.totalInterest) : 0,
      };
    });
  }, [debts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Landmark className="w-7 h-7 text-red-500" /> Loan &amp; Debt Repayment
        </h1>
        <button onClick={() => { setEditItem(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition">
          <Plus className="w-4 h-4" /> Add Debt
        </button>
      </div>

      {/* Summary Cards */}
      {debts.length > 0 && (
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

      {/* Debts Table / Empty State */}
      {debts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Landmark className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">No debts yet. Add your first one above.</p>
        </div>
      ) : (
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
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{d.name}</td>
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
      )}

      {/* Charts */}
      {debts.length > 0 && (
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
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
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
      {debts.length >= 2 && (
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
      {deleteItem && (
        <ConfirmDelete
          name={deleteItem.name}
          onClose={() => setDeleteItem(null)}
          onConfirm={() => { removeDebt(deleteItem.id); setDeleteItem(null); }}
        />
      )}
    </div>
  );
}
