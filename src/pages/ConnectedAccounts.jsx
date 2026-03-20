import { useState, useEffect, useCallback } from 'react';
import { Link2, Unlink, RefreshCw, AlertCircle, Building2, CreditCard, Wallet, TrendingUp, Landmark, CheckCircle } from 'lucide-react';
import { fetchLinkedItems, fetchBalances, unlinkItem } from '../lib/plaid';
import { usePlaidLinkFlow } from '../hooks/usePlaidLink';
import { formatCurrency } from '../lib/financial';
import { usePrivacy } from '../contexts/PrivacyContext';

const TYPE_ICONS = {
  depository: Wallet,
  credit: CreditCard,
  investment: TrendingUp,
  loan: Landmark,
};

const STATUS_BADGES = {
  active: { label: 'Connected', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  login_required: { label: 'Re-auth Needed', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
};

export default function ConnectedAccounts() {
  usePrivacy();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [unlinking, setUnlinking] = useState(null);
  const [confirmUnlink, setConfirmUnlink] = useState(null);

  const loadItems = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchLinkedItems();
      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  async function handleRefreshBalances() {
    setRefreshing(true);
    try {
      await fetchBalances();
      await loadItems();
    } catch (err) {
      setError(err.message);
    }
    setRefreshing(false);
  }

  async function handleUnlink(itemId) {
    setUnlinking(itemId);
    try {
      await unlinkItem(itemId);
      setItems(prev => prev.filter(i => i.itemId !== itemId));
      setConfirmUnlink(null);
    } catch (err) {
      setError(err.message);
    }
    setUnlinking(null);
  }

  // Link bank (transactions/liabilities)
  const bankLink = usePlaidLinkFlow({
    products: ['transactions'],
    onSuccess: () => loadItems(),
    onError: (err) => setError(err.message),
  });

  // Link investment account
  const investLink = usePlaidLinkFlow({
    products: ['investments'],
    onSuccess: () => loadItems(),
    onError: (err) => setError(err.message),
  });

  const totalAccounts = items.reduce((sum, i) => sum + (i.accounts?.length || 0), 0);

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Link2 className="w-7 h-7 text-indigo-500" /> Connected Accounts
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {totalAccounts > 0 ? `${totalAccounts} account${totalAccounts !== 1 ? 's' : ''} across ${items.length} institution${items.length !== 1 ? 's' : ''}` : 'Link your bank or investment accounts'}
          </p>
        </div>
        <div className="flex gap-2">
          {items.length > 0 && (
            <button onClick={handleRefreshBalances} disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh All
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Plaid Link ready banners */}
      {bankLink.ready && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-blue-700 dark:text-blue-300">Plaid Link is ready. Click to connect your bank account.</p>
          <button onClick={bankLink.open} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
            Connect
          </button>
        </div>
      )}
      {investLink.ready && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-indigo-700 dark:text-indigo-300">Plaid Link is ready. Click to connect your investment account.</p>
          <button onClick={investLink.open} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition">
            Connect
          </button>
        </div>
      )}

      {/* Link New Account Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button onClick={async () => { await bankLink.generateToken(); }}
          disabled={bankLink.loading}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 text-left hover:border-blue-300 dark:hover:border-blue-700 transition group disabled:opacity-50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">Link Bank / Credit Card</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Connect checking, savings, or credit card accounts to track balances and transactions</p>
        </button>

        <button onClick={async () => { await investLink.generateToken(); }}
          disabled={investLink.loading}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 text-left hover:border-indigo-300 dark:hover:border-indigo-700 transition group disabled:opacity-50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">Link Investment Account</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Connect Fidelity, Northwestern Mutual, Morgan Stanley, Acorns, and more</p>
        </button>
      </div>

      {/* Linked Institutions */}
      {items.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Linked Institutions</h2>
          {items.map(item => {
            const statusBadge = STATUS_BADGES[item.status] || STATUS_BADGES.active;
            return (
              <div key={item.itemId} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{item.institutionName}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge.className}`}>{statusBadge.label}</span>
                        <span className="text-xs text-gray-400">{item.products?.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setConfirmUnlink(item.itemId)}
                    className="text-red-400 hover:text-red-600 transition p-2">
                    <Unlink className="w-4 h-4" />
                  </button>
                </div>

                {/* Accounts List */}
                <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {(item.accounts || []).map(acct => {
                    const Icon = TYPE_ICONS[acct.type] || Wallet;
                    return (
                      <div key={acct.account_id} className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{acct.name}</p>
                            <p className="text-xs text-gray-400">{acct.subtype} {acct.mask ? `····${acct.mask}` : ''}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(acct.balanceCurrent || 0)}</p>
                          {acct.balanceAvailable != null && acct.balanceAvailable !== acct.balanceCurrent && (
                            <p className="text-xs text-gray-400">{formatCurrency(acct.balanceAvailable)} available</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Unlink Modal */}
      {confirmUnlink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Unlink Institution</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              This will disconnect <strong>{items.find(i => i.itemId === confirmUnlink)?.institutionName}</strong> and remove all synced data. You can re-link at any time.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmUnlink(null)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                Cancel
              </button>
              <button onClick={() => handleUnlink(confirmUnlink)} disabled={unlinking === confirmUnlink}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
                {unlinking === confirmUnlink ? 'Unlinking...' : 'Unlink'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
