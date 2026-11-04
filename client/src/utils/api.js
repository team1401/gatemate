const BASE = '/api';

function getToken() {
  return localStorage.getItem('gatemate_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email, password, name) => request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
  resetPassword: (email) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email }) }),
  confirmPasswordReset: (token, newPassword) => request('/auth/reset-password/confirm', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),
  me: () => request('/auth/me'),
  stats: () => request('/users/stats'),
  lookupFlight: (flight_number, flight_date, dep_airport) => request('/trips/lookup', { method: 'POST', body: JSON.stringify({ flight_number, flight_date, dep_airport }) }),
  createTrip: (name, flights) => request('/trips', { method: 'POST', body: JSON.stringify({ name, flights }) }),
  getTrips: () => request('/trips'),
  deleteTrip: (id) => request(`/trips/${id}`, { method: 'DELETE' }),
  getOverlaps: () => request('/overlaps'),
  getUsers: () => request('/users'),
  getMyFlights: () => request('/users/flights/mine'),
  getPendingTrips: () => request('/trips/pending'),
  acceptPendingTrip: (id) => request(`/trips/pending/${id}/accept`, { method: 'POST' }),
  rejectPendingTrip: (id) => request(`/trips/pending/${id}/reject`, { method: 'POST' }),
  getConfig: () => request('/config'),
  getEmails: () => request('/users/emails'),
  addEmail: (email) => request('/users/emails', { method: 'POST', body: JSON.stringify({ email }) }),
  removeEmail: (id) => request(`/users/emails/${id}`, { method: 'DELETE' }),
  dismissOnboarding: () => request('/users/onboarding', { method: 'PUT' }),
};
