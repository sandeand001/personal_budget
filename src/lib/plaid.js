import { auth } from '../firebase';

// Cloud Functions base URL — update after first deploy
// For local dev with emulator, use: http://127.0.0.1:5001/personal-budget-3bfe4/us-central1
const FUNCTIONS_BASE = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-personal-budget-3bfe4.cloudfunctions.net';

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function callFunction(name, body = {}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FUNCTIONS_BASE}/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

/** Get a Plaid Link token to launch the Link widget */
export function createLinkToken(products = ['transactions']) {
  return callFunction('createLinkToken', { products });
}

/** Exchange the public_token after Link completes */
export function exchangePublicToken(publicToken, metadata) {
  return callFunction('exchangePublicToken', { public_token: publicToken, metadata });
}

/** Refresh balances for all linked accounts */
export function fetchBalances() {
  return callFunction('getBalances');
}

/** Fetch investment holdings */
export function fetchInvestmentHoldings() {
  return callFunction('getInvestmentHoldings');
}

/** Get all linked institutions */
export function fetchLinkedItems() {
  return callFunction('getLinkedItems');
}

/** Unlink an institution */
export function unlinkItem(itemId) {
  return callFunction('unlinkItem', { item_id: itemId });
}
