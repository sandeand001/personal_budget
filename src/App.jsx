import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Income from './pages/Income';
import Expenses from './pages/Expenses';
import SpendingMoney from './pages/SpendingMoney';
import AnnualOverview from './pages/AnnualOverview';
import Vacations from './pages/Vacations';
import Debt from './pages/Debt';
import Investments from './pages/Investments';
import ConnectedAccounts from './pages/ConnectedAccounts';
import HouseholdSettings from './pages/HouseholdSettings';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/income" element={<Income />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/spending" element={<SpendingMoney />} />
        <Route path="/annual" element={<AnnualOverview />} />
        <Route path="/vacations" element={<Vacations />} />
        <Route path="/debt" element={<Debt />} />
        <Route path="/investments" element={<Investments />} />
        <Route path="/accounts" element={<ConnectedAccounts />} />
        <Route path="/settings" element={<HouseholdSettings />} />
      </Route>
    </Routes>
  );
}
