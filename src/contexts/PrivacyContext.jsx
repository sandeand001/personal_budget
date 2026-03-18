import { createContext, useContext, useState } from 'react';
import { setPrivacyMode } from '../lib/financial';

const PrivacyContext = createContext();

export function usePrivacy() {
  return useContext(PrivacyContext);
}

export function PrivacyProvider({ children }) {
  const [isPrivate, setIsPrivate] = useState(() => {
    const stored = (() => { try { return localStorage.getItem('privacyMode') === 'true'; } catch { return false; } })();
    setPrivacyMode(stored);
    return stored;
  });

  function togglePrivacy() {
    setIsPrivate((prev) => {
      const next = !prev;
      setPrivacyMode(next);
      try { localStorage.setItem('privacyMode', next); } catch {}
      return next;
    });
  }

  return (
    <PrivacyContext.Provider value={{ isPrivate, togglePrivacy }}>
      {children}
    </PrivacyContext.Provider>
  );
}
