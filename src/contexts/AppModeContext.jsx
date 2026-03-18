import { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useHousehold } from './HouseholdContext';

const AppModeContext = createContext();

export function useAppMode() {
  return useContext(AppModeContext);
}

export function AppModeProvider({ children }) {
  const { householdId } = useHousehold();
  const [isSimpleMode, setIsSimpleMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) { setLoading(false); return; }
    const ref = doc(db, 'households', householdId, 'settings', 'appMode');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setIsSimpleMode(snap.data().isSimpleMode ?? false);
      }
      setLoading(false);
    });
    return unsub;
  }, [householdId]);

  async function toggleMode() {
    if (!householdId) return;
    const newVal = !isSimpleMode;
    setIsSimpleMode(newVal);
    await setDoc(
      doc(db, 'households', householdId, 'settings', 'appMode'),
      { isSimpleMode: newVal },
      { merge: true }
    );
  }

  return (
    <AppModeContext.Provider value={{ isSimpleMode, toggleMode, loading }}>
      {children}
    </AppModeContext.Provider>
  );
}
