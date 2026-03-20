import { useState, useMemo } from 'react';
import { Plane, Plus, Trash2, Pencil, X, ChevronDown, ChevronRight, Target, Check, DollarSign, Info } from 'lucide-react';
import { useVacations, useVacationExpenses, useVacationContributions } from '../hooks/useFirestore';
import { formatCurrency } from '../lib/financial';
import { usePrivacy } from '../contexts/PrivacyContext';
import { cn } from '../lib/utils';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

const EXPENSE_CATEGORIES = [
  'Airfare',
  'Hotel / Lodging',
  'Car Rental',
  'Food & Dining',
  'Activities',
  'Shopping',
  'Travel Insurance',
  'Other',
];

const DEFAULT_SAVINGS_CATEGORIES = [
  'Airfare',
  'Hotels',
  'Spending Money',
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

// ─── Vacation Modal ───

function VacationModal({ onClose, onSave, initial }) {
  const [form, setForm] = useState(() => {
    if (initial) return initial;
    return {
      name: '',
      destination: '',
      startDate: '',
      endDate: '',
      savingsGoal: '',
      savingsCategories: DEFAULT_SAVINGS_CATEGORIES.map((c) => ({ name: c, goal: '' })),
    };
  });

  // Migrate legacy vacations without categories
  const categories = form.savingsCategories || [];

  function addSavingsCategory() {
    setForm({ ...form, savingsCategories: [...categories, { name: '', goal: '' }] });
  }

  function updateSavingsCategory(i, field, val) {
    const cats = [...categories];
    cats[i] = { ...cats[i], [field]: val };
    setForm({ ...form, savingsCategories: cats });
  }

  function removeSavingsCategory(i) {
    setForm({ ...form, savingsCategories: categories.filter((_, idx) => idx !== i) });
  }

  const totalFromCategories = categories.reduce((s, c) => s + (parseFloat(c.goal) || 0), 0);

  function handleSubmit(e) {
    e.preventDefault();
    const savingsCategories = categories
      .filter((c) => c.name.trim())
      .map((c) => ({ name: c.name.trim(), goal: parseFloat(c.goal) || 0 }));
    const savingsGoal = savingsCategories.reduce((s, c) => s + c.goal, 0);
    onSave({ ...form, savingsGoal, savingsCategories });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {initial ? 'Edit Vacation' : 'Plan a Trip'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trip Name</label>
            <input type="text" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Hawaii 2025"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destination</label>
            <input type="text" value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              placeholder="e.g., Maui, Hawaii"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <input type="date" value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
              <input type="date" value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
          </div>

          {/* Savings Goal Categories */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Savings Goals</label>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Total: {formatCurrency(totalFromCategories)}
              </span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {categories.map((cat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" value={cat.name}
                    onChange={(e) => updateSavingsCategory(i, 'name', e.target.value)}
                    placeholder="e.g., Airfare, Hotels"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                  <input type="number" min="0" step="0.01" value={cat.goal}
                    onChange={(e) => updateSavingsCategory(i, 'goal', e.target.value)}
                    placeholder="$0"
                    className="w-24 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                  <button type="button" onClick={() => removeSavingsCategory(i)} className="p-1 text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addSavingsCategory}
              className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Category
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
            <button type="submit"
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition">
              {initial ? 'Save Changes' : 'Create Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Expense Modal ───

function ExpenseModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: '',
    amount: '',
    category: EXPENSE_CATEGORIES[0],
    isPaid: false,
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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Expense</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <input type="text" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Round-trip flights"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={form.isPaid} onChange={(e) => setForm({ ...form, isPaid: e.target.checked })} className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-300 peer-checked:bg-emerald-500 rounded-full peer-focus:ring-2 peer-focus:ring-emerald-300 transition after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
            <span className="text-sm text-gray-700 dark:text-gray-300">{form.isPaid ? 'Already paid' : 'Not yet paid'}</span>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
            <button type="submit"
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition">Add Expense</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Contribution Modal ───

function ContributionModal({ onClose, onSave, savingsCategories = [] }) {
  const categoryNames = savingsCategories.filter((c) => c.name).map((c) => c.name);
  const [form, setForm] = useState({
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    note: '',
    category: categoryNames[0] || '',
  });

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ ...form, amount: parseFloat(form.amount) || 0 });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Log Contribution</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount ($)</label>
              <input type="number" required min="0" step="0.01" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
            </div>
            {categoryNames.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  {categoryNames.map((c) => <option key={c} value={c}>{c}</option>)}
                  <option value="">General</option>
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
            <input type="date" value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note (optional)</label>
            <input type="text" value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="e.g., Tax refund portion"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
            <button type="submit"
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition">Log Contribution</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Vacation Card ───

function VacationCard({ vacation, onEdit, onDelete }) {
  const { expenses, loading: expLoading, addExpense, updateExpense, removeExpense } = useVacationExpenses(vacation.id);
  const { contributions, loading: conLoading, addContribution, removeContribution } = useVacationContributions(vacation.id);
  const [expanded, setExpanded] = useState(false);
  const [expModal, setExpModal] = useState(false);
  const [conModal, setConModal] = useState(false);

  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + (e.amount || 0), 0), [expenses]);
  const paidExpenses = useMemo(() => expenses.filter((e) => e.isPaid).reduce((s, e) => s + (e.amount || 0), 0), [expenses]);
  const totalContributions = useMemo(() => contributions.reduce((s, c) => s + (c.amount || 0), 0), [contributions]);
  const savingsGoal = vacation.savingsGoal || 0;
  const savingsCategories = vacation.savingsCategories || [];
  const savingsPct = savingsGoal > 0 ? Math.min((totalContributions / savingsGoal) * 100, 100) : 0;

  const daysUntil = useMemo(() => {
    if (!vacation.startDate) return null;
    const diff = Math.ceil((new Date(vacation.startDate) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  }, [vacation.startDate]);

  const pieData = useMemo(() => {
    const byCategory = {};
    expenses.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + (e.amount || 0);
    });
    return Object.entries(byCategory).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{vacation.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {vacation.destination || 'No destination'}
              {vacation.startDate && ` · ${vacation.startDate}`}
              {daysUntil != null && daysUntil > 0 && ` (${daysUntil} days away)`}
              {daysUntil != null && daysUntil <= 0 && daysUntil >= -30 && ' (happening now!)'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-lg font-bold text-blue-600">{formatCurrency(totalExpenses)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">total planned</p>
          </div>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => onEdit(vacation)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
              <Pencil className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={() => onDelete(vacation)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-200 dark:border-gray-700 pt-4 space-y-5">
          {/* Savings Progress */}
          {savingsGoal > 0 && (
            <div className="space-y-3">
              {/* Overall progress */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Target className="w-4 h-4 text-emerald-600" /> Total Savings Goal
                  </span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {formatCurrency(totalContributions)} / {formatCurrency(savingsGoal)}
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${savingsPct}%` }} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{Math.round(savingsPct)}% saved</p>
              </div>
              {/* Per-category progress */}
              {savingsCategories.length > 0 && (
                <div className="space-y-2">
                  {savingsCategories.map((cat) => {
                    const catContributions = contributions
                      .filter((c) => c.category === cat.name)
                      .reduce((s, c) => s + (c.amount || 0), 0);
                    const catPct = cat.goal > 0 ? Math.min((catContributions / cat.goal) * 100, 100) : 0;
                    return (
                      <div key={cat.name}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-gray-600 dark:text-gray-400">{cat.name}</span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {formatCurrency(catContributions)} / {formatCurrency(cat.goal)}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${catPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Expenses */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Expenses ({expenses.length})
              </h4>
              <button onClick={() => setExpModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition">
                <Plus className="w-3.5 h-3.5" /> Add Expense
              </button>
            </div>

            {expenses.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">No expenses added yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Item</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Category</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Paid</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="px-3 py-2 text-gray-900 dark:text-white">{exp.name}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            {exp.category}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(exp.amount)}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => updateExpense(exp.id, { isPaid: !exp.isPaid })}
                            className={cn(
                              'w-6 h-6 rounded-full border-2 flex items-center justify-center transition',
                              exp.isPaid
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400'
                            )}
                          >
                            {exp.isPaid && <Check className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          <button onClick={() => removeExpense(exp.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {expenses.length > 0 && (
              <div className="flex justify-between text-sm mt-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">
                  Paid: {formatCurrency(paidExpenses)} · Unpaid: {formatCurrency(totalExpenses - paidExpenses)}
                </span>
              </div>
            )}
          </div>

          {/* Contributions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Savings Contributions ({contributions.length})
              </h4>
              <button onClick={() => setConModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition">
                <DollarSign className="w-3.5 h-3.5" /> Log Contribution
              </button>
            </div>

            {contributions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">No contributions yet</p>
            ) : (
              <div className="space-y-1">
                {contributions.slice(0, 10).map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(c.amount)}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{c.date}</span>
                      {c.category && <span className="text-xs text-blue-500 dark:text-blue-400 ml-2">{c.category}</span>}
                      {c.note && <span className="text-xs text-gray-400 ml-2">{c.note}</span>}
                    </div>
                    <button onClick={() => removeContribution(c.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chart */}
          {pieData.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expenses by Category</h4>
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
          )}

          {/* Modals */}
          {expModal && <ExpenseModal onClose={() => setExpModal(false)} onSave={addExpense} />}
          {conModal && <ContributionModal onClose={() => setConModal(false)} onSave={addContribution} savingsCategories={savingsCategories} />}
        </div>
      )}
    </div>
  );
}

// ─── Main Vacations Page ───

export default function Vacations() {
  const { vacations, loading, addVacation, updateVacation, removeVacation } = useVacations();
  usePrivacy();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

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
            <Plane className="w-7 h-7 text-blue-500" /> Vacation Planning
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Plan trips, track expenses, and save towards your goals.
          </p>
        </div>
        <button onClick={() => { setEditItem(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition">
          <Plus className="w-4 h-4" /> Plan a Trip
        </button>
      </div>

      {/* Info */}
      <details className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <summary className="cursor-pointer text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <Info className="w-4 h-4" /> How to use this page
        </summary>
        <div className="mt-3 text-sm text-blue-700 dark:text-blue-400 space-y-1">
          <p>Create a vacation plan and add expected expenses (airfare, hotel, etc.).</p>
          <p>Mark items as paid or unpaid to track progress.</p>
          <p>Set a savings goal and log contributions — the app tracks your progress.</p>
        </div>
      </details>

      {/* Vacation Cards */}
      {vacations.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Plane className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No vacations planned yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Click "Plan a Trip" to start planning</p>
        </div>
      ) : (
        <div className="space-y-4">
          {vacations.map((v) => (
            <VacationCard
              key={v.id}
              vacation={v}
              onEdit={(vac) => {
                setEditItem({
                  ...vac,
                  savingsGoal: vac.savingsGoal?.toString() || '',
                  savingsCategories: (vac.savingsCategories || []).map((c) => ({ ...c, goal: c.goal?.toString() || '' })),
                });
                setModalOpen(true);
              }}
              onDelete={setDeleteItem}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {modalOpen && (
        <VacationModal
          initial={editItem}
          onClose={() => { setModalOpen(false); setEditItem(null); }}
          onSave={(data) => editItem ? updateVacation(editItem.id, data) : addVacation(data)}
        />
      )}
      {deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Vacation</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Remove <strong>{deleteItem.name}</strong> and all its data? This can't be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteItem(null)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
              <button onClick={() => { removeVacation(deleteItem.id); setDeleteItem(null); }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
