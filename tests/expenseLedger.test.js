import assert from 'node:assert/strict';
import test from 'node:test';
import { recordExpenseLock, reverseExpenseLock } from '../src/lib/expenseLedger.js';

const ref = (collection, id) => `${collection}:${id}`;
const basePayload = {
  fixedEntries: [{ id: 'mortgage', actual: 2500 }], varEntries: [{ id: 'extra', actual: 4000 }],
  startingAmount: 6600, useBalance: false, balanceAmount: null,
  profileAmounts: { a: 33.34, b: 33.33, c: 33.33 },
  debtEntries: [{
    debtId: 'loan', debtType: 'debt', name: 'Mortgage',
    regularPayment: 2500, principalOnlyPayment: 4000, payment: 6500,
  }],
};

function ledger() {
  const store = new Map([
    ['debts:loan', { balance: 344266.62, interestRate: 6 }],
    ['budgetProfiles:a', { totalBudget: 10 }], ['budgetProfiles:b', { totalBudget: 0 }],
    ['budgetProfiles:c', { totalBudget: 0 }],
  ]);
  return {
    store,
    async run(action, options = {}) {
      const pending = new Map();
      let writing = false;
      const transaction = {
        async get(key) {
          assert.equal(writing, false, 'Firestore transactions require all reads before writes');
          return { exists: () => store.has(key), data: () => structuredClone(store.get(key)) };
        },
        update(key, data) {
          writing = true;
          assert.ok(store.has(key));
          pending.set(key, { ...structuredClone(store.get(key)), ...structuredClone(data) });
        },
        set(key, data) { writing = true; pending.set(key, structuredClone(data)); },
        delete(key) { writing = true; pending.set(key, null); },
      };
      await action(transaction, { ref, yearMonth: '2026-10', payload: structuredClone(basePayload), lockedAt: 'test', ...options });
      for (const [key, value] of pending) {
        if (value === null) store.delete(key);
        else store.set(key, value);
      }
    },
  };
}

test('locking a month atomically records interest, principal, and exact budget credits', async () => {
  const db = ledger();
  await db.run(recordExpenseLock);
  assert.equal(db.store.get('debts:loan').balance, 339487.95);
  assert.equal(db.store.get('budgetProfiles:a').totalBudget, 43.34);
  assert.equal(db.store.get('budgetProfiles:b').totalBudget, 33.33);
  const log = db.store.get('monthlyExpenseLogs:2026-10');
  assert.equal(log.debtEntries[0].interest, 1721.33);
  assert.equal(log.debtEntries[0].balanceBefore, 344266.62);
  assert.equal(log.debtEntries[0].balanceAfter, 339487.95);
  assert.equal(log.accountingVersion, 2);
});

test('a repeated month lock cannot deduct payments or distribute budgets twice', async () => {
  const db = ledger();
  await db.run(recordExpenseLock);
  const before = structuredClone(db.store);
  await assert.rejects(() => db.run(recordExpenseLock), /already locked/);
  assert.deepEqual(db.store, before);
});

test('unlock precisely reverses a new lock and relocking produces the same result', async () => {
  const db = ledger();
  await db.run(recordExpenseLock);
  await db.run(reverseExpenseLock);
  assert.equal(db.store.get('debts:loan').balance, 344266.62);
  assert.equal(db.store.get('budgetProfiles:a').totalBudget, 10);
  assert.equal(db.store.has('monthlyExpenseLogs:2026-10'), false);
  await db.run(recordExpenseLock);
  assert.equal(db.store.get('debts:loan').balance, 339487.95);
});

test('loan group payoff can be reversed even when every sub-loan was paid off', async () => {
  const db = ledger();
  db.store.set('loanGroups:group', {
    subLoans: [{ id: 'x', balance: 10, interestRate: 12 }, { id: 'y', balance: 20, interestRate: 0 }],
  });
  const payload = { ...basePayload, debtEntries: [{
    debtId: 'group', debtType: 'loanGroup', name: 'Group',
    regularPayment: 100, principalOnlyPayment: 0, payment: 100,
  }] };
  await db.run(recordExpenseLock, { payload });
  assert.deepEqual(db.store.get('loanGroups:group').subLoans.map((loan) => loan.balance), [0, 0]);
  await db.run(reverseExpenseLock);
  assert.deepEqual(db.store.get('loanGroups:group').subLoans.map((loan) => loan.balance), [10, 20]);
});

test('legacy single-debt overpayment reverses only the original principal balance', async () => {
  const db = ledger();
  db.store.set('debts:loan', { balance: 0, interestRate: 6 });
  db.store.set('monthlyExpenseLogs:2026-10', {
    debtEntries: [{ debtId: 'loan', debtType: 'debt', name: 'Loan', currentBalance: 100, payment: 200 }],
  });
  await db.run(reverseExpenseLock);
  assert.equal(db.store.get('debts:loan').balance, 100);
});

test('missing loan-group history is rejected instead of guessing balances', async () => {
  const db = ledger();
  db.store.set('loanGroups:group', { subLoans: [{ id: 'x', balance: 0, interestRate: 12 }] });
  db.store.set('monthlyExpenseLogs:2026-10', {
    debtEntries: [{ debtId: 'group', debtType: 'loanGroup', name: 'Group', currentBalance: 100, payment: 100 }],
  });
  const before = structuredClone(db.store);
  await assert.rejects(() => db.run(reverseExpenseLock), /no per-loan history/);
  assert.deepEqual(db.store, before);
});

test('historical payments cannot be reversed over a more recent loan payment', async () => {
  const db = ledger();
  await db.run(recordExpenseLock);
  await db.run(recordExpenseLock, { yearMonth: '2026-11' });
  const before = structuredClone(db.store);
  await assert.rejects(() => db.run(reverseExpenseLock), /later loan-payment months first/);
  assert.deepEqual(db.store, before);
  await db.run(reverseExpenseLock, { yearMonth: '2026-11' });
  await db.run(reverseExpenseLock);
  assert.equal(db.store.get('debts:loan').balance, 344266.62);
});

test('a reconciled lender balance is not overwritten by unlocking an old payment', async () => {
  const db = ledger();
  await db.run(recordExpenseLock);
  db.store.set('debts:loan', { ...db.store.get('debts:loan'), balance: 340266.62 });
  await assert.rejects(() => db.run(reverseExpenseLock), /balance changed/);
  assert.equal(db.store.get('debts:loan').balance, 340266.62);
});

test('oversubscribed spending splits cannot mint budget money', async () => {
  const db = ledger();
  const before = structuredClone(db.store);
  await assert.rejects(() => db.run(recordExpenseLock, {
    payload: { ...basePayload, profileAmounts: { a: 1000 } },
  }), /exceed/);
  assert.deepEqual(db.store, before);
});

test('removing a monthly credit does not silently clamp a manually depleted budget', async () => {
  const db = ledger();
  await db.run(recordExpenseLock);
  db.store.set('budgetProfiles:a', { totalBudget: 0 });
  await db.run(reverseExpenseLock);
  assert.equal(db.store.get('budgetProfiles:a').totalBudget, -33.34);
});

test('a deleted linked account prevents all partial financial updates', async () => {
  const db = ledger();
  db.store.delete('debts:loan');
  const before = structuredClone(db.store);
  await assert.rejects(() => db.run(recordExpenseLock), /deleted/);
  assert.deepEqual(db.store, before);
});
