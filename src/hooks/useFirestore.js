import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useHousehold } from '../contexts/HouseholdContext';

// ─── Income Streams ───

export function useIncomeStreams() {
  const { householdId } = useHousehold();
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) return;
    const q = query(
      collection(db, 'households', householdId, 'income'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setStreams(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [householdId]);

  async function addStream(data) {
    return addDoc(collection(db, 'households', householdId, 'income'), {
      ...data,
      createdAt: serverTimestamp(),
    });
  }

  async function updateStream(id, data) {
    return updateDoc(doc(db, 'households', householdId, 'income', id), data);
  }

  async function removeStream(id) {
    return deleteDoc(doc(db, 'households', householdId, 'income', id));
  }

  return { streams, loading, addStream, updateStream, removeStream };
}

// ─── Tax Profile ───

export function useTaxProfile() {
  const { householdId } = useHousehold();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) return;
    const ref = doc(db, 'households', householdId, 'settings', 'taxProfile');
    const unsub = onSnapshot(ref, (snap) => {
      setProfile(snap.exists() ? snap.data() : null);
      setLoading(false);
    });
    return unsub;
  }, [householdId]);

  async function saveTaxProfile(data) {
    return setDoc(doc(db, 'households', householdId, 'settings', 'taxProfile'), data, { merge: true });
  }

  return { profile, loading, saveTaxProfile };
}

// ─── Retirement (401k) ───

export function useRetirement() {
  const { householdId } = useHousehold();
  const [retirement, setRetirement] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) return;
    const ref = doc(db, 'households', householdId, 'settings', 'retirement');
    const unsub = onSnapshot(ref, (snap) => {
      setRetirement(snap.exists() ? snap.data() : null);
      setLoading(false);
    });
    return unsub;
  }, [householdId]);

  async function saveRetirement(data) {
    return setDoc(doc(db, 'households', householdId, 'settings', 'retirement'), data, { merge: true });
  }

  return { retirement, loading, saveRetirement };
}

// ─── Variable Expenses ───

export function useExpenses() {
  const { householdId } = useHousehold();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) return;
    const q = query(
      collection(db, 'households', householdId, 'expenses'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [householdId]);

  async function addExpense(data) {
    return addDoc(collection(db, 'households', householdId, 'expenses'), {
      ...data,
      createdAt: serverTimestamp(),
    });
  }

  async function updateExpense(id, data) {
    return updateDoc(doc(db, 'households', householdId, 'expenses', id), data);
  }

  async function removeExpense(id) {
    return deleteDoc(doc(db, 'households', householdId, 'expenses', id));
  }

  return { expenses, loading, addExpense, updateExpense, removeExpense };
}

// ─── Budget Profiles ───

export function useBudgetProfiles() {
  const { householdId } = useHousehold();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) return;
    const q = query(
      collection(db, 'households', householdId, 'budgetProfiles'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setProfiles(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [householdId]);

  async function addProfile(data) {
    return addDoc(collection(db, 'households', householdId, 'budgetProfiles'), {
      ...data,
      createdAt: serverTimestamp(),
    });
  }

  async function updateProfile(id, data) {
    return updateDoc(doc(db, 'households', householdId, 'budgetProfiles', id), data);
  }

  async function removeProfile(id) {
    return deleteDoc(doc(db, 'households', householdId, 'budgetProfiles', id));
  }

  return { profiles, loading, addProfile, updateProfile, removeProfile };
}

// ─── Budget Transactions ───

export function useBudgetTransactions(profileId) {
  const { householdId } = useHousehold();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId || !profileId) { setLoading(false); return; }
    const q = query(
      collection(db, 'households', householdId, 'budgetProfiles', profileId, 'transactions'),
      orderBy('date', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [householdId, profileId]);

  async function addTransaction(data) {
    return addDoc(collection(db, 'households', householdId, 'budgetProfiles', profileId, 'transactions'), {
      ...data,
      createdAt: serverTimestamp(),
    });
  }

  async function updateTransaction(id, data) {
    return updateDoc(doc(db, 'households', householdId, 'budgetProfiles', profileId, 'transactions', id), data);
  }

  async function removeTransaction(id) {
    return deleteDoc(doc(db, 'households', householdId, 'budgetProfiles', profileId, 'transactions', id));
  }

  return { transactions, loading, addTransaction, updateTransaction, removeTransaction };
}

// ─── Budget Remaining (across all profiles) ───

export function useBudgetRemaining(profiles) {
  const { householdId } = useHousehold();
  const [spentByProfile, setSpentByProfile] = useState({});

  useEffect(() => {
    if (!householdId || !profiles.length) return;
    const unsubs = profiles.map((p) => {
      const q = query(
        collection(db, 'households', householdId, 'budgetProfiles', p.id, 'transactions')
      );
      return onSnapshot(q, (snap) => {
        const total = snap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);
        setSpentByProfile((prev) => ({ ...prev, [p.id]: total }));
      });
    });
    return () => unsubs.forEach((u) => u());
  }, [householdId, profiles.map((p) => p.id).join(',')]);

  const totalRemaining = profiles.reduce(
    (s, p) => s + (p.totalBudget || 0) - (spentByProfile[p.id] || 0),
    0
  );

  return totalRemaining;
}

// ─── Vacations ───

export function useVacations() {
  const { householdId } = useHousehold();
  const [vacations, setVacations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) return;
    const q = query(
      collection(db, 'households', householdId, 'vacations'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setVacations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [householdId]);

  async function addVacation(data) {
    return addDoc(collection(db, 'households', householdId, 'vacations'), {
      ...data,
      createdAt: serverTimestamp(),
    });
  }

  async function updateVacation(id, data) {
    return updateDoc(doc(db, 'households', householdId, 'vacations', id), data);
  }

  async function removeVacation(id) {
    return deleteDoc(doc(db, 'households', householdId, 'vacations', id));
  }

  return { vacations, loading, addVacation, updateVacation, removeVacation };
}

// ─── Vacation Expenses ───

export function useVacationExpenses(vacationId) {
  const { householdId } = useHousehold();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId || !vacationId) { setLoading(false); return; }
    const q = query(
      collection(db, 'households', householdId, 'vacations', vacationId, 'expenses'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [householdId, vacationId]);

  async function addExpense(data) {
    return addDoc(collection(db, 'households', householdId, 'vacations', vacationId, 'expenses'), {
      ...data,
      createdAt: serverTimestamp(),
    });
  }

  async function updateExpense(id, data) {
    return updateDoc(doc(db, 'households', householdId, 'vacations', vacationId, 'expenses', id), data);
  }

  async function removeExpense(id) {
    return deleteDoc(doc(db, 'households', householdId, 'vacations', vacationId, 'expenses', id));
  }

  return { expenses, loading, addExpense, updateExpense, removeExpense };
}

// ─── Vacation Contributions ───

export function useVacationContributions(vacationId) {
  const { householdId } = useHousehold();
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId || !vacationId) { setLoading(false); return; }
    const q = query(
      collection(db, 'households', householdId, 'vacations', vacationId, 'contributions'),
      orderBy('date', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setContributions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [householdId, vacationId]);

  async function addContribution(data) {
    return addDoc(collection(db, 'households', householdId, 'vacations', vacationId, 'contributions'), {
      ...data,
      createdAt: serverTimestamp(),
    });
  }

  async function removeContribution(id) {
    return deleteDoc(doc(db, 'households', householdId, 'vacations', vacationId, 'contributions', id));
  }

  return { contributions, loading, addContribution, removeContribution };
}

// ─── Debts ───

export function useDebts() {
  const { householdId } = useHousehold();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) return;
    const q = query(
      collection(db, 'households', householdId, 'debts'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setDebts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [householdId]);

  async function addDebt(data) {
    return addDoc(collection(db, 'households', householdId, 'debts'), {
      ...data,
      createdAt: serverTimestamp(),
    });
  }

  async function updateDebt(id, data) {
    return updateDoc(doc(db, 'households', householdId, 'debts', id), data);
  }

  async function removeDebt(id) {
    return deleteDoc(doc(db, 'households', householdId, 'debts', id));
  }

  return { debts, loading, addDebt, updateDebt, removeDebt };
}

// ─── Loan Groups (grouped student loans etc.) ───

export function useLoanGroups() {
  const { householdId } = useHousehold();
  const [loanGroups, setLoanGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) return;
    const q = query(
      collection(db, 'households', householdId, 'loanGroups'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setLoanGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [householdId]);

  async function addLoanGroup(data) {
    return addDoc(collection(db, 'households', householdId, 'loanGroups'), {
      ...data,
      createdAt: serverTimestamp(),
    });
  }

  async function updateLoanGroup(id, data) {
    return updateDoc(doc(db, 'households', householdId, 'loanGroups', id), data);
  }

  async function removeLoanGroup(id) {
    return deleteDoc(doc(db, 'households', householdId, 'loanGroups', id));
  }

  return { loanGroups, loading: loading, addLoanGroup, updateLoanGroup, removeLoanGroup };
}

// ─── Monthly Income Log ───
// Stores locked-in actual income per month (keyed by "YYYY-MM")

export function useMonthlyIncomeLog() {
  const { householdId } = useHousehold();
  const [logs, setLogs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) return;
    const unsub = onSnapshot(
      collection(db, 'households', householdId, 'monthlyIncomeLogs'),
      (snap) => {
        const data = {};
        snap.docs.forEach((d) => { data[d.id] = d.data(); });
        setLogs(data);
        setLoading(false);
      }
    );
    return unsub;
  }, [householdId]);

  async function lockMonth(yearMonth, entries, total) {
    return setDoc(
      doc(db, 'households', householdId, 'monthlyIncomeLogs', yearMonth),
      { entries, total, lockedAt: serverTimestamp() }
    );
  }

  async function unlockMonth(yearMonth) {
    return deleteDoc(doc(db, 'households', householdId, 'monthlyIncomeLogs', yearMonth));
  }

  return { logs, loading, lockMonth, unlockMonth };
}

// ─── Fixed Expenses ───

export function useFixedExpenses() {
  const { householdId } = useHousehold();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) return;
    const q = query(
      collection(db, 'households', householdId, 'fixedExpenses'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [householdId]);

  async function addExpense(data) {
    return addDoc(collection(db, 'households', householdId, 'fixedExpenses'), {
      ...data,
      createdAt: serverTimestamp(),
    });
  }

  async function updateExpense(id, data) {
    return updateDoc(doc(db, 'households', householdId, 'fixedExpenses', id), data);
  }

  async function removeExpense(id) {
    return deleteDoc(doc(db, 'households', householdId, 'fixedExpenses', id));
  }

  return { expenses, loading, addExpense, updateExpense, removeExpense };
}

// ─── Monthly Expense Lock-In Log ───
// Stores locked-in expense data per month (keyed by "YYYY-MM")

export function useMonthlyExpenseLog() {
  const { householdId } = useHousehold();
  const [logs, setLogs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) return;
    const unsub = onSnapshot(
      collection(db, 'households', householdId, 'monthlyExpenseLogs'),
      (snap) => {
        const data = {};
        snap.docs.forEach((d) => { data[d.id] = d.data(); });
        setLogs(data);
        setLoading(false);
      }
    );
    return unsub;
  }, [householdId]);

  async function lockMonth(yearMonth, payload) {
    return setDoc(
      doc(db, 'households', householdId, 'monthlyExpenseLogs', yearMonth),
      { ...payload, lockedAt: serverTimestamp() }
    );
  }

  async function unlockMonth(yearMonth) {
    return deleteDoc(doc(db, 'households', householdId, 'monthlyExpenseLogs', yearMonth));
  }

  return { logs, loading, lockMonth, unlockMonth };
}

// ─── Monthly Debt Log ───
// Stores locked-in debt payments per month (keyed by "YYYY-MM")

export function useMonthlyDebtLog() {
  const { householdId } = useHousehold();
  const [logs, setLogs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) return;
    const unsub = onSnapshot(
      collection(db, 'households', householdId, 'monthlyDebtLogs'),
      (snap) => {
        const data = {};
        snap.docs.forEach((d) => { data[d.id] = d.data(); });
        setLogs(data);
        setLoading(false);
      }
    );
    return unsub;
  }, [householdId]);

  async function lockMonth(yearMonth, payload) {
    return setDoc(
      doc(db, 'households', householdId, 'monthlyDebtLogs', yearMonth),
      { ...payload, lockedAt: serverTimestamp() }
    );
  }

  async function unlockMonth(yearMonth) {
    return deleteDoc(doc(db, 'households', householdId, 'monthlyDebtLogs', yearMonth));
  }

  return { logs, loading, lockMonth, unlockMonth };
}

// ─── Current Balance (optional override) ───

export function useCurrentBalance() {
  const { householdId } = useHousehold();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) return;
    const ref = doc(db, 'households', householdId, 'settings', 'currentBalance');
    const unsub = onSnapshot(ref, (snap) => {
      setBalance(snap.exists() ? snap.data() : null);
      setLoading(false);
    });
    return unsub;
  }, [householdId]);

  async function saveBalance(data) {
    return setDoc(doc(db, 'households', householdId, 'settings', 'currentBalance'), data, { merge: true });
  }

  return { balance, loading, saveBalance };
}
