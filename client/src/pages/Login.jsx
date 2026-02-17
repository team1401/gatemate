import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
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
          <p className="text-slate-400 text-sm">Find your team at the terminal</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-navy mb-4">Sign In</h2>
          
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3 mb-4">{error}</div>}

          <label className="block mb-3">
            <span className="text-sm font-medium text-slate-600">Email</span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber focus:border-amber" />
          </label>

          <label className="block mb-4">
            <span className="text-sm font-medium text-slate-600">Password</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber focus:border-amber" />
          </label>

          <button type="submit" disabled={loading}
            className="w-full bg-navy text-white font-semibold py-2.5 rounded hover:bg-navy/90 transition-colors disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-center text-sm text-slate-500 mt-4">
            No account? <Link to="/register" className="text-amber font-medium hover:underline">Register</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
