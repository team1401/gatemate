import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const requested = useRef(false);

  useEffect(() => {
    // Tokens are single-use; guard against StrictMode double-invoking the effect
    if (requested.current) return;
    requested.current = true;
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('This verification link is invalid or has expired.');
      return;
    }
    api.verifyEmail(token)
      .then(data => { setResult(data); setStatus('success'); })
      .catch(err => { setStatus('error'); setMessage(err.message); });
  }, [searchParams]);

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
          <h2 className="text-lg font-semibold text-navy mb-2">Email Verification</h2>
          {status === 'verifying' && <p className="text-sm text-slate-600">Verifying...</p>}
          {status === 'error' && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3 mb-4">{message}</div>}
          {status === 'success' && (
            <p className="text-sm text-slate-600 mb-4">
              <strong>{result.email}</strong> is verified.
              {result.is_primary ? ' Your account is active — you can sign in now.' : ' Flight emails from this address will now be matched to the account.'}
            </p>
          )}
          {status !== 'verifying' && (
            <Link to={user ? '/profile' : '/login'} className="block text-center w-full bg-navy text-white font-semibold py-2.5 rounded hover:bg-navy/90 transition-colors">
              {user ? 'Back to Profile' : 'Go to Sign In'}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
