import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';

export default function MyTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTrips = () => {
    setLoading(true);
    api.getTrips()
      .then(data => setTrips(data.trips))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTrips(); }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete trip "${name}"?`)) return;
    try {
      await api.deleteTrip(id);
      loadTrips();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading trips...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">My Trips</h1>
          <p className="text-slate-500 text-sm mt-1">{trips.length} trip{trips.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/add-trip" className="bg-amber text-navy font-semibold text-sm px-4 py-2 rounded hover:bg-amber/90 transition-colors">
          + Add Trip
        </Link>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3 mb-4">{error}</div>}

      {trips.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
          <div className="text-4xl mb-3">🧳</div>
          <h3 className="font-semibold text-navy mb-1">No trips yet</h3>
          <p className="text-slate-500 text-sm mb-4">Add your upcoming flights to get started.</p>
          <Link to="/add-trip" className="inline-block bg-navy text-white font-medium text-sm px-5 py-2.5 rounded hover:bg-navy/90 transition-colors">
            Add Your First Trip
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map(trip => (
            <div key={trip.id} className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-navy">{trip.name || 'Untitled Trip'}</h3>
                  <span className="text-xs text-slate-400">{trip.flights.length} flight{trip.flights.length !== 1 ? 's' : ''}</span>
                </div>
                <button onClick={() => handleDelete(trip.id, trip.name)}
                  className="text-red-400 hover:text-red-600 text-sm font-medium">Delete</button>
              </div>

              <div className="space-y-2">
                {trip.flights.map(f => (
                  <div key={f.id} className="flex items-center gap-3 bg-cream rounded p-2">
                    <span className="font-bold text-sm text-navy w-16">{f.flight_number}</span>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="gate-badge text-xs px-1.5 py-0.5">{f.departure_airport}</span>
                      <span className="text-xs text-slate-400">{formatTime(f.departure_time)}</span>
                      <span className="text-slate-300">→</span>
                      <span className="gate-badge text-xs px-1.5 py-0.5">{f.arrival_airport}</span>
                      <span className="text-xs text-slate-400">{formatTime(f.arrival_time)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
