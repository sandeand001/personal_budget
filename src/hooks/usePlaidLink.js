import { useState, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { createLinkToken, exchangePublicToken } from '../lib/plaid';

/**
 * Hook to manage Plaid Link flow.
 * @param {Object} options
 * @param {string[]} options.products - Plaid products: 'transactions', 'investments', 'liabilities'
 * @param {function} options.onSuccess - Called after successful link with { itemId, accounts }
 * @param {function} options.onError - Called on error
 */
export function usePlaidLinkFlow({ products = ['transactions'], onSuccess, onError } = {}) {
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateToken = useCallback(async () => {
    setLoading(true);
    try {
      const { link_token } = await createLinkToken(products);
      setLinkToken(link_token);
    } catch (err) {
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [products, onError]);

  const handleSuccess = useCallback(async (publicToken, metadata) => {
    setLoading(true);
    try {
      const result = await exchangePublicToken(publicToken, metadata);
      onSuccess?.(result);
    } catch (err) {
      onError?.(err);
    } finally {
      setLoading(false);
      setLinkToken(null);
    }
  }, [onSuccess, onError]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: () => setLinkToken(null),
  });

  return {
    open,
    ready: ready && !!linkToken,
    loading,
    generateToken,
  };
}
