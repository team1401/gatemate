import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import HelpModal from '../components/HelpModal';

// Converts an ISO timestamp to a 0–100% position within a 24h day, anchored to midnight of the reference date
function timeToPercent(isoStr, refDate) {
  if (!isoStr || !refDate) return null;
  const t = new Date(isoStr);
  const midnight = new Date(refDate);
  midnight.setHours(0, 0, 0, 0);
  const msInDay = 24 * 60 * 60 * 1000;
  return Math.min(100, Math.max(0, ((t - midnight) / msInDay) * 100));
}

function OverlapTimeline({ myStart, myEnd, otherStart, otherEnd, overlapStart, overlapEnd, otherName }) {
  // Use overlapStart's date as the anchor for the 24h timeline
  const refDate = overlapStart || myStart || otherStart;
  if (!refDate) return null;

  const aSP = timeToPercent(myStart, refDate);
  const aEP = timeToPercent(myEnd, refDate);
  const bSP = timeToPercent(otherStart, refDate);
  const bEP = timeToPercent(otherEnd, refDate);
  const oSP = timeToPercent(overlapStart, refDate);
  const oEP = timeToPercent(overlapEnd, refDate);

  // Colors: blue for you, orange for other, violet for overlap
  const colorA = '#60a5fa';   // blue-400
  const colorB = '#fb923c';   // orange-400
  const colorO = '#a78bfa';   // violet-400

  // Build connected segments: [first person solo] [together] [last person solo]
  // All segments should be touching with no gaps
  const segments = [];

  if (aSP !== null && aEP !== null && bSP !== null && bEP !== null && oSP !== null && oEP !== null) {
    // Who arrives first?
    const earliestStart = Math.min(aSP, bSP);
    const latestEnd = Math.max(aEP, bEP);

    // Before overlap: whoever arrives first has solo time
    if (oSP > earliestStart) {
      const isYouFirst = aSP <= bSP;
      segments.push({
        left: earliestStart,
        width: oSP - earliestStart,
        color: isYouFirst ? colorA : colorB,
        label: isYouFirst ? 'You' : (otherName || 'Other'),
      });
    }

    // Overlap segment (together)
    if (oEP > oSP) {
      segments.push({
        left: oSP,
        width: oEP - oSP,
        color: colorO,
        label: 'Together',
      });
    }

    // After overlap: whoever leaves last has solo time
    if (latestEnd > oEP) {
      const isYouLast = aEP >= bEP;
      segments.push({
        left: oEP,
        width: latestEnd - oEP,
        color: isYouLast ? colorA : colorB,
        label: isYouLast ? 'You' : (otherName || 'Other'),
      });
    }
  }

  return (
    <div className="mt-4">
      {/* Time axis labels */}
      <div className="flex justify-between text-xs text-slate-400 mb-1 select-none">
        {['12AM', '6AM', '12PM', '6PM', '12AM'].map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>

      {/* Timeline bar */}
      <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
        {/* Tick marks at 25%, 50%, 75% */}
        {[25, 50, 75].map(pct => (
          <div key={pct} className="absolute inset-y-0 w-px bg-white/60 z-10" style={{ left: `${pct}%` }} />
        ))}

        {/* Connected segments */}
        {segments.map((seg, i) => (
          <div
            key={i}
            className="absolute inset-y-0"
            style={{ left: `${seg.left}%`, width: `${Math.max(seg.width, 0.5)}%`, backgroundColor: seg.color }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: colorA }} />
          <span className="text-xs text-slate-500">You</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: colorB }} />
          <span className="text-xs text-slate-500">{otherName || 'Other'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: colorO }} />
          <span className="text-xs text-slate-500">Together</span>
        </div>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-navy">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigate = useNavigate();
  const bumpsRef = useRef(null);
  const [overlaps, setOverlaps] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUsers, setShowUsers] = useState(false);
  const [showFlights, setShowFlights] = useState(false);
  const [users, setUsers] = useState([]);
  const [flights, setFlights] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [pendingTrips, setPendingTrips] = useState([]);
  const [appConfig, setAppConfig] = useState(null);
  const [pendingLoading, setPendingLoading] = useState({});

  useEffect(() => {
    if (user && !user.onboarding_seen) setShowOnboarding(true);
  }, [user]);

  const dismissOnboarding = async () => {
    setShowOnboarding(false);
    try {
      await api.dismissOnboarding();
      setUser(prev => ({ ...prev, onboarding_seen: 1 }));
    } catch (e) {}
  };

  useEffect(() => {
    Promise.all([api.getOverlaps(), api.stats(), api.getPendingTrips(), api.getConfig()])
      .then(([oData, sData, pData, cData]) => {
        setOverlaps(oData.overlaps);
        setStats(sData);
        setPendingTrips(pData.pending_trips || []);
        setAppConfig(cData);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleAccept = async (id) => {
    setPendingLoading(p => ({ ...p, [id]: 'accepting' }));
    try {
      await api.acceptPendingTrip(id);
      setPendingTrips(prev => prev.filter(t => t.id !== id));
      // Refresh stats
      const sData = await api.stats();
      setStats(sData);
      const oData = await api.getOverlaps();
      setOverlaps(oData.overlaps);
    } catch (err) { setError(err.message); }
    setPendingLoading(p => ({ ...p, [id]: null }));
  };

  const handleReject = async (id) => {
    setPendingLoading(p => ({ ...p, [id]: 'rejecting' }));
    try {
      await api.rejectPendingTrip(id);
      setPendingTrips(prev => prev.filter(t => t.id !== id));
    } catch (err) { setError(err.message); }
    setPendingLoading(p => ({ ...p, [id]: null }));
  };

  const openUsers = async () => {
    setShowUsers(true);
    setModalLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data.users);
    } catch (err) { setError(err.message); }
    setModalLoading(false);
  };

  const openFlights = async () => {
    setShowFlights(true);
    setModalLoading(true);
    try {
      const data = await api.getMyFlights();
      setFlights(data.flights);
    } catch (err) { setError(err.message); }
    setModalLoading(false);
  };

  const cardActions = {
    'Team Members': openUsers,
    'My Trips': () => navigate('/trips'),
    'My Flights': openFlights,
    'Upcoming Bumps': () => bumpsRef.current?.scrollIntoView({ behavior: 'smooth' }),
  };

  const formatTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatDuration = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading dashboard...</div>;

  return (
    <div>
      {showOnboarding && <HelpModal onClose={dismissOnboarding} autoShowMode={true} />}
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-slate-500 text-sm mt-1">Your layover overlap feed</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Team Members', value: stats.userCount, icon: '👥' },
            { label: 'My Trips', value: stats.tripCount, icon: '🧳' },
            { label: 'My Flights', value: stats.flightCount, icon: '✈️' },
            { label: 'Upcoming Bumps', value: stats.overlapCount, icon: '🤝' },
          ].map(s => (
            <div
              key={s.label}
              onClick={cardActions[s.label]}
              className="bg-white rounded-lg p-4 border border-slate-200 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-amber/50 active:scale-[0.98]"
            >
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold text-navy">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Email Forwarding Banner */}
      {appConfig && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-xl">📧</span>
            <div>
              {appConfig.email_enabled ? (
                <>
                  <p className="text-sm font-medium text-blue-900">Forward your flight confirmations to:</p>
                  <p className="text-blue-700 font-bold">{appConfig.gatemate_email}</p>
                  <p className="text-xs text-blue-600 mt-1">We'll automatically extract your flights and create trips for you to confirm.</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-blue-900">Email forwarding coming soon</p>
                  <p className="text-xs text-blue-600 mt-1">Soon you'll be able to forward flight confirmations to automatically create trips.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pending Trips */}
      {pendingTrips.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-navy mb-3">📨 Pending Trips from Email</h2>
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-3">
            <div className="flex items-start gap-2">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold text-yellow-900 text-sm">Security Notice</p>
                <p className="text-yellow-800 text-xs mt-1">
                  Always verify these flights came from your actual email address. Email spoofing is possible.
                  Only accept trips you actually forwarded.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {pendingTrips.map(pt => (
              <div key={pt.id} className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-navy">{pt.trip_name || 'Forwarded Trip'}</h3>
                  <span className="text-xs text-slate-400">{new Date(pt.created_at).toLocaleDateString()}</span>
                </div>
                <div className="space-y-1 mb-3">
                  {pt.extracted_flights.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm bg-white rounded px-3 py-1.5 border border-amber-200">
                      <span className="font-mono font-semibold text-navy">{f.flight_number}</span>
                      <span className="text-slate-400">•</span>
                      <span>{f.departure_airport} → {f.arrival_airport}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">{f.date}</span>
                      {f.departure_time && <span className="text-slate-400 text-xs">{f.departure_time}–{f.arrival_time}</span>}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(pt.id)}
                    disabled={!!pendingLoading[pt.id]}
                    className="bg-green-600 text-white text-sm font-medium px-4 py-1.5 rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {pendingLoading[pt.id] === 'accepting' ? 'Adding...' : '✓ Confirm Trip'}
                  </button>
                  <button
                    onClick={() => handleReject(pt.id)}
                    disabled={!!pendingLoading[pt.id]}
                    className="bg-slate-200 text-slate-700 text-sm font-medium px-4 py-1.5 rounded hover:bg-slate-300 disabled:opacity-50"
                  >
                    {pendingLoading[pt.id] === 'rejecting' ? 'Removing...' : '✗ Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3 mb-4">{error}</div>}

      {/* Overlaps */}
      <div ref={bumpsRef} className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy">Upcoming Bumps</h2>
        <Link to="/add-trip" className="bg-amber text-navy font-semibold text-sm px-4 py-2 rounded hover:bg-amber/90 transition-colors">
          + Add Trip
        </Link>
      </div>

      {overlaps.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
          <div className="text-4xl mb-3">✈️</div>
          <h3 className="font-semibold text-navy mb-1">No overlaps yet</h3>
          <p className="text-slate-500 text-sm mb-4">Add your upcoming flights to find teammates at the same airports.</p>
          <Link to="/add-trip" className="inline-block bg-navy text-white font-medium text-sm px-5 py-2.5 rounded hover:bg-navy/90 transition-colors">
            Add Your First Trip
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {overlaps.map(o => (
            <div key={o.id} className="bg-white rounded-lg border border-amber/30 p-4 overlap-glow">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="gate-badge">{o.airport}</span>
                    <span className="text-sm text-slate-500">{o.airport_name}</span>
                  </div>
                  <p className="text-navy font-medium">
                    You and <span className="font-bold">{o.other_user.name}</span> will both be here
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {formatTime(o.overlap_start)} → {formatTime(o.overlap_end)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="bg-amber/10 text-amber font-bold text-sm px-2 py-1 rounded">
                    {formatDuration(o.overlap_minutes)}
                  </div>
                </div>
              </div>
              <OverlapTimeline
                myStart={o.my_layover_start}
                myEnd={o.my_layover_end}
                otherStart={o.other_layover_start}
                otherEnd={o.other_layover_end}
                overlapStart={o.overlap_start}
                overlapEnd={o.overlap_end}
                otherName={o.other_user?.name?.split(' ')[0]}
              />
            </div>
          ))}
        </div>
      )}

      {/* Team Members Modal */}
      {showUsers && (
        <Modal title="👥 Team Members" onClose={() => setShowUsers(false)}>
          {modalLoading ? <p className="text-slate-500 text-center py-4">Loading...</p> : (
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <div className="w-9 h-9 rounded-full bg-navy text-white flex items-center justify-center font-semibold text-sm">
                    {u.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="font-medium text-navy text-sm">{u.name}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </div>
                </div>
              ))}
              {users.length === 0 && <p className="text-slate-500 text-center py-4">No team members yet.</p>}
            </div>
          )}
        </Modal>
      )}

      {/* My Flights Modal */}
      {showFlights && (
        <Modal title="✈️ My Flights" onClose={() => setShowFlights(false)}>
          {modalLoading ? <p className="text-slate-500 text-center py-4">Loading...</p> : (
            <div className="space-y-2">
              {flights.map(f => (
                <div key={f.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-navy text-sm">{f.flight_number}</span>
                    <span className="text-xs text-slate-400">{f.trip_name}</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    {f.departure_airport} → {f.arrival_airport}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {formatTime(f.departure_time)} → {formatTime(f.arrival_time)}
                  </div>
                </div>
              ))}
              {flights.length === 0 && <p className="text-slate-500 text-center py-4">No flights yet. Add a trip to get started!</p>}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
