import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { HouseholdProvider } from './contexts/HouseholdContext'
import { AppModeProvider } from './contexts/AppModeContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <HouseholdProvider>
          <AppModeProvider>
            <App />
          </AppModeProvider>
        </HouseholdProvider>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
