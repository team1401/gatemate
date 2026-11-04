import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.confirmPasswordReset(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="bg-green-600 text-white font-extrabold text-lg px-3 py-1 rounded">GATE</span>
            <span className="font-bold text-3xl tracking-tight text-white">Mate</span>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-navy mb-4">Choose a New Password</h2>

          {!token ? (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3 mb-4">Invalid or expired reset link</div>
          ) : done ? (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded p-3 mb-4">Your password has been reset. You can now sign in.</div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3 mb-4">{error}</div>}

              <label className="block mb-3">
                <span className="text-sm font-medium text-slate-600">New Password</span>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} maxLength={128}
                  className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber focus:border-amber" />
                <span className="text-xs text-slate-400 mt-1">Min 6 characters</span>
              </label>

              <label className="block mb-4">
                <span className="text-sm font-medium text-slate-600">Confirm Password</span>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} maxLength={128}
                  className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber focus:border-amber" />
              </label>

              <button type="submit" disabled={loading}
                className="w-full bg-navy text-white font-semibold py-2.5 rounded hover:bg-navy/90 transition-colors disabled:opacity-50">
                {loading ? 'Saving...' : 'Reset Password'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-slate-500 mt-3">
            <Link to="/login" className="text-amber font-medium hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
