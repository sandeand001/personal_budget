import { useState, useMemo } from 'react';
import { Wallet, Plus, Trash2, Pencil, X, ChevronDown, ChevronRight, ShoppingCart, Info, Calendar, BarChart3, Lock } from 'lucide-react';
import { useBudgetProfiles, useBudgetTransactions, useIncomeStreams, useExpenses, useFixedExpenses, useMonthlyIncomeLog } from '../hooks/useFirestore';
import { FREQUENCIES, MONTH_NAMES, MONTH_NAMES_FULL, getAmountForMonth, toMonthly, toAnnual, formatCurrency, formatCurrencyShort } from '../lib/financial';
import { usePrivacy } from '../contexts/PrivacyContext';
import { useAppMode } from '../contexts/AppModeContext';
import { cn } from '../lib/utils';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const DEFAULT_CATEGORIES = [
  'Food & Groceries',
  'Dining Out',
  'Clothing',
  'Entertainment',
  'Gas & Transportation',
  'Personal Care',
  'Subscriptions',
  'Household',
  'Other',
];

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316'];

// ─── Profile Modal ───

function ProfileModal({ onClose, onSave, initial }) {
  const [form, setForm] = useState(initial || {
    name: '',
    totalBudget: '',
    frequency: 'monthly',
    includeInSpendingSplit: true,
    categories: DEFAULT_CATEGORIES.map((c) => ({ name: c, allocated: '' })),
  });

  function addCategory() {
    setForm({ ...form, categories: [...form.categories, { name: '', allocated: '' }] });
  }

  function updateCategory(i, field, val) {
    const cats = [...form.categories];
    cats[i] = { ...cats[i], [field]: val };
    setForm({ ...form, categories: cats });
  }

  function removeCategory(i) {
    setForm({ ...form, categories: form.categories.filter((_, idx) => idx !== i) });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const totalBudget = parseFloat(form.totalBudget) || 0;
    const categories = form.categories
      .filter((c) => c.name.trim())
      .map((c) => ({ name: c.name.trim(), allocated: parseFloat(c.allocated) || 0 }));
    onSave({ name: form.name, totalBudget, frequency: form.frequency, includeInSpendingSplit: form.includeInSpendingSplit !== false, categories });
    onClose();
  }

  const allocatedTotal = form.categories.reduce((s, c) => s + (parseFloat(c.allocated) || 0), 0);
  const budget = parseFloat(form.totalBudget) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {initial ? 'Edit Profile' : 'New Budget Profile'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profile Name</label>
            <input type="text" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., My Budget, Wife's Budget"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Budget ($)</label>
              <input type="number" required min="0" step="0.01" value={form.totalBudget}
                onChange={(e) => setForm({ ...form, totalBudget: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frequency</label>
              <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          {/* Spending Money Split */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={form.includeInSpendingSplit !== false}
                onChange={(e) => setForm({ ...form, includeInSpendingSplit: e.target.checked })} className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-300 peer-checked:bg-emerald-500 rounded-full peer-focus:ring-2 peer-focus:ring-emerald-300 transition after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Include in spending money split
            </span>
          </div>

          {/* Categories */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Categories ({form.categories.length})
              </label>
              <span className={cn('text-xs font-medium', allocatedTotal > budget ? 'text-red-500' : 'text-gray-500')}>
                {formatCurrency(allocatedTotal)} / {formatCurrency(budget)} allocated
              </span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {form.categories.map((cat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" value={cat.name}
                    onChange={(e) => updateCategory(i, 'name', e.target.value)}
                    placeholder="Category name"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                  <input type="number" min="0" step="0.01" value={cat.allocated}
                    onChange={(e) => updateCategory(i, 'allocated', e.target.value)}
                    placeholder="$0"
                    className="w-24 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                  <button type="button" onClick={() => removeCategory(i)} className="p-1 text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addCategory}
              className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Category
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
            <button type="submit"
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition">
              {initial ? 'Save Changes' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Transaction Modal ───

function TransactionModal({ onClose, onSave, categories }) {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: categories[0]?.name || '',
    date: new Date().toISOString().slice(0, 10),
  });

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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Log Purchase</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <input type="text" required value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g., Walmart groceries"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input type="date" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
              {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
            <button type="submit"
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition">Log Purchase</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Profile Card (collapsible) ───

function ProfileCard({ profile, onEdit, onDelete }) {
  const { transactions, loading, addTransaction, removeTransaction } = useBudgetTransactions(profile.id);
  const [expanded, setExpanded] = useState(false);
  const [txnModal, setTxnModal] = useState(false);

  const spent = useMemo(() => {
    const byCategory = {};
    (profile.categories || []).forEach((c) => { byCategory[c.name] = 0; });
    transactions.forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] || 0) + (t.amount || 0);
    });
    return byCategory;
  }, [transactions, profile.categories]);

  const totalSpent = Object.values(spent).reduce((s, v) => s + v, 0);
  const remaining = (profile.totalBudget || 0) - totalSpent;

  const pieData = (profile.categories || [])
    .map((c) => ({ name: c.name, value: spent[c.name] || 0 }))
    .filter((d) => d.value > 0);

  const barData = (profile.categories || []).map((c) => ({
    name: c.name.length > 10 ? c.name.slice(0, 10) + '…' : c.name,
    Budget: c.allocated || 0,
    Spent: spent[c.name] || 0,
  }));

  const freqLabel = FREQUENCIES.find((f) => f.value === profile.frequency)?.label || profile.frequency;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{profile.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{freqLabel} · {formatCurrency(profile.totalBudget)} budget</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className={cn('text-lg font-bold', remaining >= 0 ? 'text-emerald-600' : 'text-red-600')}>
              {formatCurrency(remaining)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">remaining</p>
          </div>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => onEdit(profile)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
              <Pencil className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={() => onDelete(profile)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-200 dark:border-gray-700 pt-4 space-y-5">
          {/* Category breakdown */}
          <div className="space-y-2">
            {(profile.categories || []).map((cat) => {
              const s = spent[cat.name] || 0;
              const alloc = cat.allocated || 0;
              const pct = alloc > 0 ? Math.min((s / alloc) * 100, 100) : (s > 0 ? 100 : 0);
              const over = s > alloc && alloc > 0;
              return (
                <div key={cat.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300">{cat.name}</span>
                    <span className={cn('font-medium', over ? 'text-red-600' : 'text-gray-700 dark:text-gray-300')}>
                      {formatCurrency(s)} / {formatCurrency(alloc)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', over ? 'bg-red-500' : 'bg-emerald-500')}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts */}
          {transactions.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Spending by Category</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Budget vs Spent</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="Budget" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Spent" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Log transaction + Recent transactions */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Recent Purchases ({transactions.length})
            </h4>
            <button onClick={() => setTxnModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition">
              <ShoppingCart className="w-3.5 h-3.5" /> Log Purchase
            </button>
          </div>

          {transactions.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No purchases logged yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Date</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Description</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Category</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 20).map((t) => (
                    <tr key={t.id} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{t.date}</td>
                      <td className="px-3 py-2 text-gray-900 dark:text-white">{t.description}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {t.category}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(t.amount)}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeTransaction(t.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {txnModal && (
            <TransactionModal
              categories={profile.categories || []}
              onClose={() => setTxnModal(false)}
              onSave={addTransaction}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Annual Overview ───

function AnnualOverview() {
  const { streams } = useIncomeStreams();
  const { expenses } = useExpenses();
  const { expenses: fixedExpensesList } = useFixedExpenses();
  const { logs } = useMonthlyIncomeLog();
  const { isSimpleMode } = useAppMode();
  const currentYear = new Date().getFullYear();

  const monthlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const yearMonth = `${currentYear}-${String(month).padStart(2, '0')}`;
      const locked = logs[yearMonth];

      const income = locked
        ? locked.total
        : streams.reduce(
            (sum, s) => sum + getAmountForMonth(s.amount, s.frequency, s.applicableMonths, month),
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

  // Items that only occur in certain months
  const irregularIncome = streams.filter((s) => ['quarterly', 'bimonthly', 'annual'].includes(s.frequency));
  const irregularFixed = fixedExpensesList.filter((e) => ['quarterly', 'bimonthly', 'annual'].includes(e.frequency));
  const irregularExpenses = expenses.filter((e) => ['quarterly', 'bimonthly', 'annual'].includes(e.frequency));

  return (
    <div className="space-y-6">
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
                <span>{formatCurrency(s.amount)} in {(s.applicableMonths || []).map((m) => MONTH_NAMES[m - 1]).join(', ')}</span>
              </div>
            ))}
            {irregularFixed.map((e) => (
              <div key={e.id} className="flex justify-between">
                <span>− {e.name} (fixed, {FREQUENCIES.find((f) => f.value === e.frequency)?.label})</span>
                <span>{formatCurrency(e.amount)} in {(e.applicableMonths || []).map((m) => MONTH_NAMES[m - 1]).join(', ')}</span>
              </div>
            ))}
            {irregularExpenses.map((e) => (
              <div key={e.id} className="flex justify-between">
                <span>− {e.name} ({FREQUENCIES.find((f) => f.value === e.frequency)?.label})</span>
                <span>{formatCurrency(e.amount)} in {(e.applicableMonths || []).map((m) => MONTH_NAMES[m - 1]).join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Budget Page ───

export default function Budget() {
  const { profiles, loading, addProfile, updateProfile, removeProfile } = useBudgetProfiles();
  usePrivacy();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [tab, setTab] = useState('profiles');

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-7 h-7 text-emerald-600" /> Personal Budget
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Track spending and view your annual financial calendar.
          </p>
        </div>
        {tab === 'profiles' && (
          <button onClick={() => { setEditItem(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition">
            <Plus className="w-4 h-4" /> New Profile
          </button>
        )}
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        <button onClick={() => setTab('profiles')}
          className={cn('flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition',
            tab === 'profiles' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700')}>
          <Wallet className="w-4 h-4" /> Budget Profiles
        </button>
        <button onClick={() => setTab('annual')}
          className={cn('flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition',
            tab === 'annual' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700')}>
          <BarChart3 className="w-4 h-4" /> Annual Overview
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'annual' ? (
        <AnnualOverview />
      ) : (
        <>
          {/* Info Banner */}
          <details className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <summary className="cursor-pointer text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <Info className="w-4 h-4" /> How to use this page
            </summary>
            <div className="mt-3 text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <p>Create a budget profile for each person (e.g., yours and your partner's).</p>
              <p>Set a total budget, frequency, and subdivide into categories.</p>
              <p>Log purchases manually — the app tracks your running totals.</p>
              <p>Switch to the <strong>Annual Overview</strong> tab to see a month-by-month breakdown of income vs expenses, including quarterly and annual items.</p>
            </div>
          </details>

      {/* Profiles */}
      {profiles.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Wallet className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No budget profiles yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Click "New Profile" to create your first budget</p>
        </div>
      ) : (
        <div className="space-y-4">
          {profiles.map((p) => (
            <ProfileCard
              key={p.id}
              profile={p}
              onEdit={(pr) => {
                setEditItem({
                  ...pr,
                  totalBudget: pr.totalBudget?.toString() || '',
                  includeInSpendingSplit: pr.includeInSpendingSplit !== false,
                  categories: (pr.categories || []).map((c) => ({
                    name: c.name,
                    allocated: c.allocated?.toString() || '',
                  })),
                });
                setModalOpen(true);
              }}
              onDelete={setDeleteItem}
            />
          ))}
        </div>
      )}
        </>
      )}

      {/* Modals */}
      {modalOpen && (
        <ProfileModal
          initial={editItem}
          onClose={() => { setModalOpen(false); setEditItem(null); }}
          onSave={(data) => editItem ? updateProfile(editItem.id, data) : addProfile(data)}
        />
      )}
      {deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Profile</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Remove <strong>{deleteItem.name}</strong> and all its transactions? This can't be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteItem(null)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
              <button onClick={() => { removeProfile(deleteItem.id); setDeleteItem(null); }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
