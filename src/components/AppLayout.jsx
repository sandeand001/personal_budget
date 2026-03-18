import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  DollarSign,
  Receipt,
  Wallet,
  Plane,
  Landmark,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { usePrivacy } from '../contexts/PrivacyContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/income', label: 'Income', icon: DollarSign },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/budget', label: 'Budget', icon: Wallet },
  { to: '/vacations', label: 'Vacations', icon: Plane },
  { to: '/debt', label: 'Debt', icon: Landmark },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isPrivate, togglePrivacy } = usePrivacy();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Nav - Desktop */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-gray-900 dark:text-white hidden sm:block">
                Personal Budget
              </span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition',
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700'
                    )
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* User + Privacy + Logout */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePrivacy}
                title={isPrivate ? 'Show values' : 'Hide values'}
                className={cn(
                  'p-2 rounded-lg transition',
                  isPrivate
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700'
                )}
              >
                {isPrivate ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4" />
                {user?.displayName || user?.email}
              </div>
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline">Logout</span>
              </button>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 pb-3">
            <nav className="px-4 pt-2 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition',
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                    )
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              ))}
              <button
                onClick={togglePrivacy}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition',
                  isPrivate
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                )}
              >
                {isPrivate ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                {isPrivate ? 'Show Values' : 'Hide Values'}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 w-full transition"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
