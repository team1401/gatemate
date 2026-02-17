import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';

export default function Profile() {
  const { user } = useAuth();
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.getEmails()
      .then(data => setEmails(data.emails))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAdding(true);
    setError('');
    try {
      const added = await api.addEmail(newEmail.trim());
      setEmails(prev => [...prev, added]);
      setNewEmail('');
    } catch (err) {
      setError(err.message);
    }
    setAdding(false);
  };

  const handleRemove = async (id) => {
    try {
      await api.removeEmail(id);
      setEmails(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-navy mb-1">Profile</h1>
      <p className="text-slate-500 text-sm mb-6">Manage your account and email addresses</p>

      {/* User Info */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-navy text-white flex items-center justify-center font-bold text-lg">
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="font-semibold text-navy">{user?.name}</div>
            <div className="text-sm text-slate-500">{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Email Addresses */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="font-semibold text-navy mb-1">Email Addresses</h2>
        <p className="text-xs text-slate-500 mb-4">
          Add personal email addresses you might forward flight confirmations from.
          We'll match emails from any of these addresses to your account.
        </p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-2 mb-3">{error}</div>}

        {loading ? (
          <p className="text-slate-400 text-sm py-4 text-center">Loading...</p>
        ) : (
          <div className="space-y-2 mb-4">
            {emails.map(e => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-navy truncate">{e.email}</span>
                  {e.is_primary && (
                    <span className="shrink-0 text-xs bg-amber/20 text-amber-700 font-medium px-2 py-0.5 rounded">Primary</span>
                  )}
                </div>
                {!e.is_primary && (
                  <button
                    onClick={() => handleRemove(e.id)}
                    className="shrink-0 text-slate-400 hover:text-red-500 text-lg ml-2"
                    title="Remove"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="personal@gmail.com"
            className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber/50 focus:border-amber"
          />
          <button
            type="submit"
            disabled={adding || !newEmail.trim()}
            className="bg-navy text-white text-sm font-medium px-4 py-2 rounded hover:bg-navy/90 disabled:opacity-50 shrink-0"
          >
            {adding ? 'Adding...' : 'Add'}
          </button>
        </form>
      </div>
    </div>
  );
}
