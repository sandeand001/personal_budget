import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { HouseholdProvider } from './contexts/HouseholdContext'
import { AppModeProvider } from './contexts/AppModeContext'
import { PrivacyProvider } from './contexts/PrivacyContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <HouseholdProvider>
          <AppModeProvider>
            <PrivacyProvider>
              <App />
            </PrivacyProvider>
          </AppModeProvider>
        </HouseholdProvider>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/personal_budget/sw.js').catch(() => {});
  });
}
