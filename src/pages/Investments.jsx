import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, RefreshCw, Link2, Unlink, AlertCircle, Building2, ChevronDown, ChevronRight } from 'lucide-react';
import { fetchInvestmentHoldings, fetchLinkedItems } from '../lib/plaid';
import { usePlaidLinkFlow } from '../hooks/usePlaidLink';
import { formatCurrency } from '../lib/financial';
import { usePrivacy } from '../contexts/PrivacyContext';

const ACCOUNT_TYPE_LABELS = {
  '401k': '401(k)',
  '401a': '401(a)',
  '403b': '403(b)',
  ira: 'IRA',
  'roth 401k': 'Roth 401(k)',
  roth: 'Roth IRA',
  brokerage: 'Brokerage',
  'mutual fund': 'Mutual Fund',
  pension: 'Pension',
  'profit sharing plan': 'Profit Sharing',
  trust: 'Trust',
  hsa: 'HSA',
  ugma: 'UGMA',
  utma: 'UTMA',
};

export default function Investments() {
  usePrivacy();
  const [holdings, setHoldings] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [linkedItems, setLinkedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [expandedAccounts, setExpandedAccounts] = useState({});

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [holdingsData, itemsData] = await Promise.all([
        fetchInvestmentHoldings(),
        fetchLinkedItems(),
      ]);
      setHoldings(holdingsData.holdings || []);
      setAccounts(holdingsData.accounts || []);
      setLinkedItems((itemsData.items || []).filter(i => i.products?.includes('investments')));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const { open, ready, loading: linkLoading, generateToken } = usePlaidLinkFlow({
    products: ['investments'],
    onSuccess: () => loadData(),
    onError: (err) => setError(err.message),
  });

  // Group holdings by account
  const holdingsByAccount = {};
  for (const h of holdings) {
    if (!holdingsByAccount[h.accountId]) holdingsByAccount[h.accountId] = [];
    holdingsByAccount[h.accountId].push(h);
  }

  // Total portfolio value
  const totalValue = accounts.reduce((sum, a) => sum + (a.balanceCurrent || 0), 0);

  // Group accounts by institution
  const byInstitution = {};
  for (const acct of accounts) {
    const inst = acct.institutionName || 'Unknown';
    if (!byInstitution[inst]) byInstitution[inst] = [];
    byInstitution[inst].push(acct);
  }

  function toggleAccount(accountId) {
    setExpandedAccounts(prev => ({ ...prev, [accountId]: !prev[accountId] }));
  }

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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-7 h-7 text-blue-500" /> Investments
        </h1>
        <div className="flex gap-2">
          {accounts.length > 0 && (
            <button onClick={handleRefresh} disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
          )}
          <button onClick={async () => { await generateToken(); }}
            disabled={linkLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
            <Link2 className="w-4 h-4" /> Link Investment Account
          </button>
        </div>
      </div>

      {/* Open Plaid Link when ready */}
      {ready && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-blue-700 dark:text-blue-300">Plaid Link is ready. Click to connect your investment account.</p>
          <button onClick={open} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
            Connect Now
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* No accounts yet */}
      {accounts.length === 0 && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <TrendingUp className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No Investment Accounts Linked</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Link accounts from Fidelity, Northwestern Mutual, Morgan Stanley, Acorns, and more to see your portfolio here.
          </p>
          <button onClick={async () => { await generateToken(); }}
            disabled={linkLoading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
            <Link2 className="w-4 h-4 inline mr-2" /> Link Your First Account
          </button>
        </div>
      )}

      {/* Portfolio Total */}
      {accounts.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-5 text-white">
          <p className="text-sm text-white/80 mb-1">Total Portfolio Value</p>
          <p className="text-3xl font-bold">{formatCurrency(totalValue)}</p>
          <p className="text-sm text-white/70 mt-1">{accounts.length} account{accounts.length !== 1 ? 's' : ''} across {Object.keys(byInstitution).length} institution{Object.keys(byInstitution).length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Accounts by Institution */}
      {Object.entries(byInstitution).map(([instName, instAccounts]) => {
        const instTotal = instAccounts.reduce((s, a) => s + (a.balanceCurrent || 0), 0);
        return (
          <div key={instName} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-blue-500" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{instName}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{instAccounts.length} account{instAccounts.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(instTotal)}</p>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {instAccounts.map(acct => {
                const acctHoldings = holdingsByAccount[acct.account_id] || [];
                const isExpanded = expandedAccounts[acct.account_id];
                const subtypeLabel = ACCOUNT_TYPE_LABELS[acct.subtype] || acct.subtype || acct.type;

                return (
                  <div key={acct.account_id}>
                    <button onClick={() => toggleAccount(acct.account_id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition text-left">
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{acct.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{subtypeLabel} {acct.mask ? `····${acct.mask}` : ''}</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(acct.balanceCurrent || 0)}</p>
                    </button>

                    {/* Holdings detail */}
                    {isExpanded && acctHoldings.length > 0 && (
                      <div className="px-4 pb-3">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                              <th className="text-left py-1.5 font-medium">Holding</th>
                              <th className="text-right py-1.5 font-medium">Shares</th>
                              <th className="text-right py-1.5 font-medium">Price</th>
                              <th className="text-right py-1.5 font-medium">Value</th>
                              <th className="text-right py-1.5 font-medium">Cost Basis</th>
                              <th className="text-right py-1.5 font-medium">Gain/Loss</th>
                            </tr>
                          </thead>
                          <tbody>
                            {acctHoldings.sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0)).map((h, i) => {
                              const gain = (h.currentValue || 0) - (h.costBasis || 0);
                              const gainPct = h.costBasis ? ((gain / h.costBasis) * 100) : 0;
                              return (
                                <tr key={i} className="border-b border-gray-50 dark:border-gray-700/50">
                                  <td className="py-1.5">
                                    <p className="font-medium text-gray-900 dark:text-white">{h.ticker || h.name}</p>
                                    {h.ticker && <p className="text-xs text-gray-400">{h.name}</p>}
                                  </td>
                                  <td className="text-right text-gray-700 dark:text-gray-300">{h.quantity?.toFixed(h.quantity % 1 ? 4 : 0)}</td>
                                  <td className="text-right text-gray-700 dark:text-gray-300">{formatCurrency(h.price || 0)}</td>
                                  <td className="text-right font-medium text-gray-900 dark:text-white">{formatCurrency(h.currentValue || 0)}</td>
                                  <td className="text-right text-gray-500">{h.costBasis ? formatCurrency(h.costBasis) : '—'}</td>
                                  <td className={`text-right font-medium ${gain >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {h.costBasis ? `${gain >= 0 ? '+' : ''}${formatCurrency(gain)} (${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(1)}%)` : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {isExpanded && acctHoldings.length === 0 && (
                      <p className="px-4 pb-3 text-xs text-gray-400">No individual holdings data available</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Linked Items */}
      {linkedItems.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Linked Investment Institutions</h3>
          <div className="space-y-2">
            {linkedItems.map(item => (
              <div key={item.itemId} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.institutionName}</span>
                  {item.status === 'login_required' && (
                    <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-2 py-0.5 rounded-full">Re-auth needed</span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{item.accounts?.length || 0} account{(item.accounts?.length || 0) !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
