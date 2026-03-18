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
import { useAuth } from '../contexts/AuthContext';

// ─── Income Streams ───

export function useIncomeStreams() {
  const { user } = useAuth();
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'income'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setStreams(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  async function addStream(data) {
    return addDoc(collection(db, 'users', user.uid, 'income'), {
      ...data,
      createdAt: serverTimestamp(),
    });
  }

  async function updateStream(id, data) {
    return updateDoc(doc(db, 'users', user.uid, 'income', id), data);
  }

  async function removeStream(id) {
    return deleteDoc(doc(db, 'users', user.uid, 'income', id));
  }

  return { streams, loading, addStream, updateStream, removeStream };
}

// ─── Tax Profile ───

export function useTaxProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'settings', 'taxProfile');
    const unsub = onSnapshot(ref, (snap) => {
      setProfile(snap.exists() ? snap.data() : null);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  async function saveTaxProfile(data) {
    return setDoc(doc(db, 'users', user.uid, 'settings', 'taxProfile'), data, { merge: true });
  }

  return { profile, loading, saveTaxProfile };
}

// ─── Retirement (401k) ───

export function useRetirement() {
  const { user } = useAuth();
  const [retirement, setRetirement] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'settings', 'retirement');
    const unsub = onSnapshot(ref, (snap) => {
      setRetirement(snap.exists() ? snap.data() : null);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  async function saveRetirement(data) {
    return setDoc(doc(db, 'users', user.uid, 'settings', 'retirement'), data, { merge: true });
  }

  return { retirement, loading, saveRetirement };
}

// ─── Variable Expenses ───

export function useExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'expenses'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  async function addExpense(data) {
    return addDoc(collection(db, 'users', user.uid, 'expenses'), {
      ...data,
      createdAt: serverTimestamp(),
    });
  }

  async function updateExpense(id, data) {
    return updateDoc(doc(db, 'users', user.uid, 'expenses', id), data);
  }

  async function removeExpense(id) {
    return deleteDoc(doc(db, 'users', user.uid, 'expenses', id));
  }

  return { expenses, loading, addExpense, updateExpense, removeExpense };
}
