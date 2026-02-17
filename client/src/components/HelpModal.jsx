import React from 'react';
import { Link } from 'react-router-dom';

export default function HelpModal({ onClose, autoShowMode = false }) {
  return (
    <div className="fixed inset-0 bg-navy/90 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-cream rounded-2xl max-w-md w-full shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-navy p-6 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="bg-green-600 text-white font-extrabold text-sm px-2 py-0.5 rounded">GATE</span>
            <span className="font-bold text-2xl text-white tracking-tight">Mate</span>
          </div>
          <h1 className="text-xl font-bold text-white">
            {autoShowMode ? 'Welcome aboard! ✈️' : 'How GateMate Works'}
          </h1>
          <p className="text-slate-300 text-sm mt-1">Find your teammates at the airport</p>
        </div>

        <div className="p-6 space-y-5">
          {/* How it works */}
          <div>
            <h2 className="font-semibold text-navy text-sm mb-3 uppercase tracking-wide">How it works</h2>
            <div className="space-y-3">
              {[
                { step: '1', text: 'Add your upcoming flights by looking up flight numbers, or forward your booking confirmation emails to flights@gatemate.app' },
                { step: '2', text: "We'll automatically detect when you and a teammate have overlapping layovers" },
                { step: '3', text: 'Get notified of upcoming bumps — grab coffee, share a ride, or just say hi!' },
              ].map(s => (
                <div key={s.step} className="flex gap-3">
                  <span className="shrink-0 w-7 h-7 rounded bg-amber text-navy font-bold text-sm flex items-center justify-center">{s.step}</span>
                  <p className="text-sm text-slate-700 leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Setup */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h2 className="font-semibold text-navy text-sm mb-2">Quick Setup</h2>
            <div className="space-y-2">
              <Link to="/profile" onClick={onClose} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                <span>📧</span> Add a personal email for forwarded confirmations
              </Link>
              <Link to="/add-trip" onClick={onClose} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                <span>✈️</span> Add your first trip
              </Link>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-amber text-navy font-bold py-3 rounded-lg hover:bg-amber/90 transition-colors text-sm"
          >
            {autoShowMode ? "Got it, let's go! 🚀" : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
