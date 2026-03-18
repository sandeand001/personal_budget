import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { HouseholdProvider } from './contexts/HouseholdContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <HouseholdProvider>
          <App />
        </HouseholdProvider>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
