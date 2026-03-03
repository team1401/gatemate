import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

export default function AddTrip() {
  const navigate = useNavigate();
  const [tripName, setTripName] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [flightDate, setFlightDate] = useState('');
  const [flights, setFlights] = useState([]);
  const [lookupResult, setLookupResult] = useState(null);
  const [routeOptions, setRouteOptions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [scheduleWarning, setScheduleWarning] = useState('');

  const handleLookup = async (e, depAirport) => {
    if (e) e.preventDefault();
    if (!flightNumber || !flightDate) return;
    setError('');
    setLoading(true);
    setLookupResult(null);
    setRouteOptions(null);
    setScheduleWarning('');
    try {
      const data = await api.lookupFlight(flightNumber, flightDate, depAirport || undefined);
      if (data.multiple) {
        setRouteOptions(data.options);
      } else {
        setLookupResult(data.flight);
        if (data.warning) setScheduleWarning(data.warning);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectRoute = (option) => {
    // Use the selected option directly — no need to re-lookup
    setRouteOptions(null);
    setLookupResult(option);
  };

  const addFlight = () => {
    if (!lookupResult) return;
    setFlights([...flights, lookupResult]);
    setLookupResult(null);
    setFlightNumber('');
    setFlightDate('');
    setScheduleWarning('');
  };

  const removeFlight = (index) => {
    setFlights(flights.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (flights.length === 0) return;
    setSaving(true);
    setError('');
    try {
      const result = await api.createTrip(tripName || 'Untitled Trip', flights);
      if (result.new_overlaps > 0) {
        alert(`Trip saved! ${result.new_overlaps} new overlap(s) found! 🎉`);
      }
      navigate('/trips');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '—';
    // Handle "YYYY-MM-DD HH:MM" format
    const timePart = timeStr.includes(' ') ? timeStr.split(' ')[1] : timeStr;
    const [h, m] = timePart.split(':').map(Number);
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-1">Add Trip</h1>
      <p className="text-slate-500 text-sm mb-6">Look up real flights and add them to a trip</p>

      {/* Trip name */}
      <label className="block mb-4">
        <span className="text-sm font-medium text-slate-600">Trip Name (optional)</span>
        <input type="text" value={tripName} onChange={e => setTripName(e.target.value)}
          placeholder="e.g. DC Client Visit"
          className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber focus:border-amber" />
      </label>

      {/* Flight lookup */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
        <h3 className="font-semibold text-navy mb-3">Look Up Flight</h3>
        <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
          <label className="flex-1">
            <span className="text-xs font-medium text-slate-500">Flight Number</span>
            <input type="text" value={flightNumber} onChange={e => setFlightNumber(e.target.value)}
              placeholder="UA1234" required
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber focus:border-amber" />
          </label>
          <label className="flex-1">
            <span className="text-xs font-medium text-slate-500">Date</span>
            <input type="date" value={flightDate} onChange={e => setFlightDate(e.target.value)} required
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber focus:border-amber" />
          </label>
          <div className="flex items-end">
            <button type="submit" disabled={loading}
              className="bg-navy text-white font-medium text-sm px-5 py-2.5 rounded hover:bg-navy/90 transition-colors disabled:opacity-50 w-full sm:w-auto">
              {loading ? 'Looking up...' : 'Look Up'}
            </button>
          </div>
        </form>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3 mt-3">{error}</div>}

        {scheduleWarning && (
          <div className="bg-amber-50 border border-amber-300 text-amber-800 text-sm rounded p-3 mt-3">
            ⚠️ {scheduleWarning}
          </div>
        )}

        {/* Multiple route options — user picks the correct leg */}
        {routeOptions && (
          <div className="mt-4">
            <p className="text-sm font-medium text-navy mb-2">This flight number has multiple legs. Which one is yours?</p>
            <div className="space-y-2">
              {routeOptions.map((opt, i) => (
                <button key={i} onClick={() => selectRoute(opt)}
                  className="w-full bg-cream rounded-lg p-4 border border-amber/30 hover:border-amber hover:shadow-md transition-all text-left">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="gate-badge">{opt.departure_airport}</div>
                      <div className="text-xs text-slate-500 mt-1">{formatTime(opt.departure_time)}</div>
                    </div>
                    <div className="flex-1 border-t border-dashed border-slate-300 relative">
                      <span className="absolute left-1/2 -translate-x-1/2 -top-2 text-xs text-slate-400">✈</span>
                    </div>
                    <div className="text-center">
                      <div className="gate-badge">{opt.arrival_airport}</div>
                      <div className="text-xs text-slate-500 mt-1">{formatTime(opt.arrival_time)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Single lookup result */}
        {lookupResult && (
          <div className="mt-4 bg-cream rounded-lg p-4 border border-amber/30">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-navy">{lookupResult.flight_number}</span>
              <span className="text-xs text-slate-500">{lookupResult.airline_name}</span>
            </div>
            <div className="flex items-center gap-4 mb-3">
              <div className="text-center">
                <div className="gate-badge">{lookupResult.departure_airport}</div>
                <div className="text-xs text-slate-500 mt-1">{formatTime(lookupResult.departure_time)}</div>
              </div>
              <div className="flex-1 border-t border-dashed border-slate-300 relative">
                <span className="absolute left-1/2 -translate-x-1/2 -top-2 text-xs text-slate-400">✈</span>
              </div>
              <div className="text-center">
                <div className="gate-badge">{lookupResult.arrival_airport}</div>
                <div className="text-xs text-slate-500 mt-1">{formatTime(lookupResult.arrival_time)}</div>
              </div>
            </div>
            <button onClick={addFlight}
              className="w-full bg-success text-white font-medium text-sm py-2 rounded hover:bg-success/90 transition-colors">
              ✓ Add This Flight
            </button>
          </div>
        )}
      </div>

      {/* Added flights */}
      {flights.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold text-navy mb-2">Flights in this trip ({flights.length})</h3>
          <div className="space-y-2">
            {flights.map((f, i) => (
              <div key={i} className="bg-white rounded-lg border border-slate-200 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-navy">{f.flight_number}</span>
                  <span className="text-sm text-slate-500">{f.departure_airport} → {f.arrival_airport}</span>
                  <span className="text-xs text-slate-400">{f.flight_date}</span>
                </div>
                <button onClick={() => removeFlight(i)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save */}
      <button onClick={handleSave} disabled={flights.length === 0 || saving}
        className="w-full bg-amber text-navy font-bold py-3 rounded-lg hover:bg-amber/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
        {saving ? 'Saving...' : `Save Trip (${flights.length} flight${flights.length !== 1 ? 's' : ''})`}
      </button>
    </div>
  );
}
