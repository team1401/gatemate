import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import HelpModal from './HelpModal';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showHelp, setShowHelp] = useState(false);

  const nav = [
    { to: '/', label: 'Dashboard', icon: '◈' },
    { to: '/add-trip', label: 'Add Trip', icon: '✈' },
    { to: '/trips', label: 'My Trips', icon: '☰' },
    { to: '/profile', label: 'Profile', icon: '👤' },
    ...(user?.is_admin ? [{ to: '/admin', label: 'Admin', icon: '⚙' }] : []),
  ];

  return (
    <div className="min-h-screen bg-cream">
      {/* Header - airport signage style */}
      <header className="bg-navy text-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="bg-green-600 text-white font-extrabold text-xl px-3 py-1 rounded">GATE</span>
            <span className="font-bold text-xl tracking-tight">Mate</span>
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowHelp(true)}
              className="w-6 h-6 rounded-full bg-amber/20 text-amber hover:bg-amber/30 transition-colors flex items-center justify-center text-sm font-bold"
              title="How GateMate works"
            >
              ?
            </button>
            <span className="text-sm text-slate-300 hidden sm:block">{user?.name}</span>
            <button onClick={logout} className="text-sm text-slate-400 hover:text-white transition-colors">Sign Out</button>
          </div>
        </div>
        {/* Nav */}
        <nav className="max-w-5xl mx-auto px-4 flex gap-1 pb-1">
          {nav.map(n => (
            <Link
              key={n.to}
              to={n.to}
              className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                location.pathname === n.to
                  ? 'bg-cream text-navy'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="mr-1.5">{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Help Modal */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
