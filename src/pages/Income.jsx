import { useState } from 'react';
import { DollarSign, Plus, Trash2, Pencil, Info, X } from 'lucide-react';
import { useIncomeStreams } from '../hooks/useFirestore';
import { useAppMode } from '../contexts/AppModeContext';
import { FREQUENCIES, NEEDS_MONTH_PICKER, MONTH_NAMES, defaultMonthsForFrequency, toMonthly, toAnnual, formatCurrency, formatCurrencyShort } from '../lib/financial';
import { usePrivacy } from '../contexts/PrivacyContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const INCOME_TYPES = [
  { value: 'w2', label: 'W-2 Employee' },
  { value: '1099', label: '1099 / Self-Employed' },
];

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

function IncomeModal({ onClose, onSave, initial, isSimpleMode }) {
  const [form, setForm] = useState(initial || {
    name: '',
    type: 'w2',
    amount: '',
    frequency: 'monthly',
    isTaxable: true,
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
          {initial ? 'Edit Income' : (isSimpleMode ? 'Add Take-Home Income' : 'Add Income Stream')}
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isSimpleMode ? 'Take-Home Amount ($)' : 'Amount ($)'}</label>
              <input
                type="number" required min="0" step="0.01" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
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
                <input type="checkbox" checked={form.isTaxable} onChange={(e) => setForm({ ...form, isTaxable: e.target.checked })} className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-300 peer-checked:bg-emerald-500 rounded-full peer-focus:ring-2 peer-focus:ring-emerald-300 transition after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
              </label>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {form.isTaxable ? 'Taxable income' : 'Non-taxable (e.g., VA disability)'}
              </span>
            </div>
          )}
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

export default function Income() {
  const { streams, loading, addStream, updateStream, removeStream } = useIncomeStreams();
  const { isSimpleMode } = useAppMode();
  usePrivacy();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const totalMonthly = streams.reduce((sum, s) => sum + toMonthly(s.amount, s.frequency), 0);
  const totalAnnual = streams.reduce((sum, s) => sum + toAnnual(s.amount, s.frequency), 0);
  const taxableAnnual = streams.filter((s) => s.isTaxable).reduce((sum, s) => sum + toAnnual(s.amount, s.frequency), 0);
  const nonTaxableAnnual = totalAnnual - taxableAnnual;

  const pieData = streams.map((s) => ({
    name: s.name,
    value: toMonthly(s.amount, s.frequency),
  }));

  const barData = [
    { name: 'Taxable', monthly: taxableAnnual / 12 },
    { name: 'Non-taxable', monthly: nonTaxableAnnual / 12 },
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Income</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{isSimpleMode ? 'Enter your take-home pay from each source.' : 'Manage your income streams and track total gross income.'}</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition">
          <Plus className="w-4 h-4" /> Add Income
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
              <p>Add each source of take-home income — the amount you actually receive after taxes and deductions.</p>
              <p>This is typically the net pay shown on your paycheck or bank deposit.</p>
              <p>Set the frequency (weekly, bi-weekly, semi-monthly, monthly, or annual).</p>
              <p className="italic">Tip: Switch to Detailed Mode on the Dashboard for gross income tracking with tax calculations.</p>
            </>
          ) : (
            <>
              <p>Add each source of income — salary, side jobs, rental income, VA disability, etc.</p>
              <p>Set the frequency (weekly, bi-weekly, semi-monthly, monthly, or annual) and whether it's taxable.</p>
              <p>Your totals are automatically calculated and shown on the Dashboard.</p>
            </>
          )}
        </div>
      </details>

      {/* Summary Cards */}
      <div className={`grid grid-cols-1 ${isSimpleMode ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-4`}>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">{isSimpleMode ? 'Total Take-Home (Monthly)' : 'Total Gross (Monthly)'}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(totalMonthly)}</p>
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
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Take-Home (Annual)</p>
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
                    <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Frequency</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Monthly</th>
                    {!isSimpleMode && <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Taxable</th>}
                    <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {streams.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.name}</td>
                      {!isSimpleMode && (
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${s.type === 'w2' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                            {s.type === 'w2' ? 'W-2' : '1099'}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(s.amount)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{freqLabel(s.frequency)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(toMonthly(s.amount, s.frequency))}</td>
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
                  ))}
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
          initial={editing ? { name: editing.name, type: editing.type, amount: editing.amount, frequency: editing.frequency, isTaxable: editing.isTaxable, applicableMonths: editing.applicableMonths || [] } : null}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
      {deleting && (
        <ConfirmDelete name={deleting.name} onClose={() => setDeleting(null)} onConfirm={handleDelete} />
      )}
    </div>
  );
}
