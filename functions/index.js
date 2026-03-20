import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import { defineSecret } from 'firebase-functions/params';

// ─── Firebase Init ───
initializeApp();
const db = getFirestore();

// ─── Secrets (set via: firebase functions:secrets:set PLAID_CLIENT_ID, etc.) ───
const PLAID_CLIENT_ID = defineSecret('PLAID_CLIENT_ID');
const PLAID_SECRET = defineSecret('PLAID_SECRET');
const PLAID_ENV = defineSecret('PLAID_ENV'); // 'sandbox', 'development', or 'production'

// ─── Helper: verify Firebase Auth token ───
async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  const idToken = authHeader.split('Bearer ')[1];
  const decoded = await getAuth().verifyIdToken(idToken);
  return decoded;
}

// ─── Helper: get user's householdId ───
async function getHouseholdId(uid) {
  const profileSnap = await db.doc(`userProfiles/${uid}`).get();
  if (!profileSnap.exists || !profileSnap.data().householdId) {
    throw new Error('No household found for user');
  }
  return profileSnap.data().householdId;
}

// ─── Helper: build Plaid client ───
function getPlaidClient() {
  const envMap = {
    sandbox: PlaidEnvironments.sandbox,
    development: PlaidEnvironments.development,
    production: PlaidEnvironments.production,
  };
  const configuration = new Configuration({
    basePath: envMap[PLAID_ENV.value()] || PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID.value(),
        'PLAID-SECRET': PLAID_SECRET.value(),
      },
    },
  });
  return new PlaidApi(configuration);
}

// ─── Helper: CORS wrapper ───
function handleCors(req, res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
// 1. CREATE LINK TOKEN — Frontend calls this to launch Plaid Link
// ═══════════════════════════════════════════════════════════════
export const createLinkToken = onRequest(
  { secrets: [PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV], cors: true },
  async (req, res) => {
    if (handleCors(req, res)) return;
    try {
      const user = await verifyAuth(req);
      const plaid = getPlaidClient();

      const { products = ['transactions'] } = req.body || {};

      // Map product strings to Plaid Products enum
      const productMap = {
        transactions: Products.Transactions,
        investments: Products.Investments,
        liabilities: Products.Liabilities,
      };
      const plaidProducts = products.map(p => productMap[p] || Products.Transactions);

      const response = await plaid.linkTokenCreate({
        user: { client_user_id: user.uid },
        client_name: 'Personal Budget',
        products: plaidProducts,
        country_codes: [CountryCode.Us],
        language: 'en',
      });

      res.json({ link_token: response.data.link_token });
    } catch (err) {
      console.error('createLinkToken error:', err.message);
      res.status(err.message === 'Unauthorized' ? 401 : 500).json({ error: err.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// 2. EXCHANGE PUBLIC TOKEN — After user completes Plaid Link
// ═══════════════════════════════════════════════════════════════
export const exchangePublicToken = onRequest(
  { secrets: [PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV], cors: true },
  async (req, res) => {
    if (handleCors(req, res)) return;
    try {
      const user = await verifyAuth(req);
      const householdId = await getHouseholdId(user.uid);
      const plaid = getPlaidClient();

      const { public_token, metadata } = req.body;
      if (!public_token) {
        return res.status(400).json({ error: 'Missing public_token' });
      }

      // Exchange for permanent access_token
      const exchangeResponse = await plaid.itemPublicTokenExchange({
        public_token,
      });

      const { access_token, item_id } = exchangeResponse.data;

      // Fetch account details
      const accountsResponse = await plaid.accountsGet({ access_token });
      const accounts = accountsResponse.data.accounts.map(a => ({
        account_id: a.account_id,
        name: a.name,
        officialName: a.official_name,
        type: a.type,
        subtype: a.subtype,
        mask: a.mask, // last 4 digits
        balanceCurrent: a.balances.current,
        balanceAvailable: a.balances.available,
        balanceLimit: a.balances.limit,
        currency: a.balances.iso_currency_code,
      }));

      // Store linked item in Firestore
      const itemRef = db.doc(`households/${householdId}/plaidItems/${item_id}`);
      await itemRef.set({
        itemId: item_id,
        accessToken: access_token, // In production, encrypt this
        institutionId: metadata?.institution?.institution_id || null,
        institutionName: metadata?.institution?.name || 'Unknown',
        accounts,
        products: metadata?.products || [],
        linkedBy: user.uid,
        linkedAt: FieldValue.serverTimestamp(),
        lastSynced: FieldValue.serverTimestamp(),
        status: 'active',
      });

      res.json({ success: true, item_id, accounts });
    } catch (err) {
      console.error('exchangePublicToken error:', err.message);
      res.status(err.message === 'Unauthorized' ? 401 : 500).json({ error: err.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// 3. GET BALANCES — Refresh balances for all linked accounts
// ═══════════════════════════════════════════════════════════════
export const getBalances = onRequest(
  { secrets: [PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV], cors: true },
  async (req, res) => {
    if (handleCors(req, res)) return;
    try {
      const user = await verifyAuth(req);
      const householdId = await getHouseholdId(user.uid);
      const plaid = getPlaidClient();

      // Get all linked items
      const itemsSnap = await db.collection(`households/${householdId}/plaidItems`).where('status', '==', 'active').get();
      if (itemsSnap.empty) {
        return res.json({ accounts: [] });
      }

      const allAccounts = [];
      for (const itemDoc of itemsSnap.docs) {
        const item = itemDoc.data();
        try {
          const balanceResponse = await plaid.accountsBalanceGet({
            access_token: item.accessToken,
          });

          const accounts = balanceResponse.data.accounts.map(a => ({
            account_id: a.account_id,
            name: a.name,
            officialName: a.official_name,
            type: a.type,
            subtype: a.subtype,
            mask: a.mask,
            balanceCurrent: a.balances.current,
            balanceAvailable: a.balances.available,
            balanceLimit: a.balances.limit,
            currency: a.balances.iso_currency_code,
            institutionName: item.institutionName,
            itemId: item.itemId,
          }));

          // Update stored accounts
          await itemDoc.ref.update({
            accounts,
            lastSynced: FieldValue.serverTimestamp(),
          });

          allAccounts.push(...accounts);
        } catch (plaidErr) {
          // If item needs re-auth, mark it
          if (plaidErr.response?.data?.error_code === 'ITEM_LOGIN_REQUIRED') {
            await itemDoc.ref.update({ status: 'login_required' });
          }
          console.error(`Balance fetch failed for item ${item.itemId}:`, plaidErr.message);
        }
      }

      res.json({ accounts: allAccounts });
    } catch (err) {
      console.error('getBalances error:', err.message);
      res.status(err.message === 'Unauthorized' ? 401 : 500).json({ error: err.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// 4. GET INVESTMENT HOLDINGS — Fetch investment portfolio data
// ═══════════════════════════════════════════════════════════════
export const getInvestmentHoldings = onRequest(
  { secrets: [PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV], cors: true },
  async (req, res) => {
    if (handleCors(req, res)) return;
    try {
      const user = await verifyAuth(req);
      const householdId = await getHouseholdId(user.uid);
      const plaid = getPlaidClient();

      // Get investment-linked items
      const itemsSnap = await db.collection(`households/${householdId}/plaidItems`).where('status', '==', 'active').get();

      const holdings = [];
      const securities = [];
      const investmentAccounts = [];

      for (const itemDoc of itemsSnap.docs) {
        const item = itemDoc.data();
        if (!item.products?.includes('investments')) continue;

        try {
          const holdingsResponse = await plaid.investmentsHoldingsGet({
            access_token: item.accessToken,
          });

          const data = holdingsResponse.data;

          // Map securities for lookup
          const secMap = {};
          for (const sec of data.securities) {
            secMap[sec.security_id] = sec;
            securities.push({
              securityId: sec.security_id,
              name: sec.name,
              ticker: sec.ticker_symbol,
              type: sec.type,
              closePrice: sec.close_price,
              closePriceAsOf: sec.close_price_as_of,
            });
          }

          for (const h of data.holdings) {
            const sec = secMap[h.security_id] || {};
            holdings.push({
              accountId: h.account_id,
              securityId: h.security_id,
              name: sec.name || 'Unknown',
              ticker: sec.ticker_symbol || '',
              type: sec.type || '',
              quantity: h.quantity,
              costBasis: h.cost_basis,
              currentValue: h.institution_value,
              price: h.institution_price,
              priceAsOf: h.institution_price_as_of,
              institutionName: item.institutionName,
            });
          }

          for (const acct of data.accounts) {
            investmentAccounts.push({
              account_id: acct.account_id,
              name: acct.name,
              officialName: acct.official_name,
              type: acct.type,
              subtype: acct.subtype,
              mask: acct.mask,
              balanceCurrent: acct.balances.current,
              institutionName: item.institutionName,
              itemId: item.itemId,
            });
          }

          // Store holdings snapshot
          await db.doc(`households/${householdId}/investmentSnapshots/latest`).set({
            holdings,
            securities,
            accounts: investmentAccounts,
            updatedAt: FieldValue.serverTimestamp(),
          });

        } catch (plaidErr) {
          if (plaidErr.response?.data?.error_code === 'ITEM_LOGIN_REQUIRED') {
            await itemDoc.ref.update({ status: 'login_required' });
          }
          console.error(`Holdings fetch failed for item ${item.itemId}:`, plaidErr.message);
        }
      }

      res.json({ holdings, securities, accounts: investmentAccounts });
    } catch (err) {
      console.error('getInvestmentHoldings error:', err.message);
      res.status(err.message === 'Unauthorized' ? 401 : 500).json({ error: err.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// 5. UNLINK ACCOUNT — Remove a linked institution
// ═══════════════════════════════════════════════════════════════
export const unlinkItem = onRequest(
  { secrets: [PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV], cors: true },
  async (req, res) => {
    if (handleCors(req, res)) return;
    try {
      const user = await verifyAuth(req);
      const householdId = await getHouseholdId(user.uid);
      const plaid = getPlaidClient();

      const { item_id } = req.body;
      if (!item_id) {
        return res.status(400).json({ error: 'Missing item_id' });
      }

      const itemRef = db.doc(`households/${householdId}/plaidItems/${item_id}`);
      const itemSnap = await itemRef.get();
      if (!itemSnap.exists) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Revoke access at Plaid
      try {
        await plaid.itemRemove({ access_token: itemSnap.data().accessToken });
      } catch (e) {
        // Ignore if already removed at Plaid
      }

      // Delete from Firestore
      await itemRef.delete();

      res.json({ success: true });
    } catch (err) {
      console.error('unlinkItem error:', err.message);
      res.status(err.message === 'Unauthorized' ? 401 : 500).json({ error: err.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// 6. GET LINKED ITEMS — List all linked institutions for household
// ═══════════════════════════════════════════════════════════════
export const getLinkedItems = onRequest(
  { secrets: [PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV], cors: true },
  async (req, res) => {
    if (handleCors(req, res)) return;
    try {
      const user = await verifyAuth(req);
      const householdId = await getHouseholdId(user.uid);

      const itemsSnap = await db.collection(`households/${householdId}/plaidItems`).get();
      const items = itemsSnap.docs.map(d => {
        const data = d.data();
        return {
          itemId: data.itemId,
          institutionName: data.institutionName,
          accounts: data.accounts,
          products: data.products,
          status: data.status,
          lastSynced: data.lastSynced,
          linkedAt: data.linkedAt,
        };
      });

      res.json({ items });
    } catch (err) {
      console.error('getLinkedItems error:', err.message);
      res.status(err.message === 'Unauthorized' ? 401 : 500).json({ error: err.message });
    }
  }
);
