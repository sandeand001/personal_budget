import { createContext, useContext, useState, useEffect } from 'react';
import { setPrivacyMode } from '../lib/financial';

const PrivacyContext = createContext();

export function usePrivacy() {
  return useContext(PrivacyContext);
}

export function PrivacyProvider({ children }) {
  const [isPrivate, setIsPrivate] = useState(() => {
    try { return localStorage.getItem('privacyMode') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    setPrivacyMode(isPrivate);
    try { localStorage.setItem('privacyMode', isPrivate); } catch {}
  }, [isPrivate]);

  // Sync on mount
  useEffect(() => { setPrivacyMode(isPrivate); }, []);

  function togglePrivacy() {
    setIsPrivate((prev) => !prev);
  }

  return (
    <PrivacyContext.Provider value={{ isPrivate, togglePrivacy }}>
      {children}
    </PrivacyContext.Provider>
  );
}
