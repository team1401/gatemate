import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const BASE = '/api';
function getToken() { return localStorage.getItem('gatemate_token'); }
async function adminReq(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
        <p className="text-navy mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">Confirm</button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ title, fields, values, onSave, onCancel }) {
  const [form, setForm] = useState(values);
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl w-full">
        <h3 className="text-lg font-bold text-navy mb-4">{title}</h3>
        {fields.map(f => (
          <div key={f.key} className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
            {f.type === 'toggle' ? (
              <button
                onClick={() => setForm(p => ({ ...p, [f.key]: !p[f.key] }))}
                className={`px-3 py-1 rounded text-sm font-medium ${form[f.key] ? 'bg-amber text-navy' : 'bg-gray-200 text-gray-600'}`}
              >{form[f.key] ? 'Yes' : 'No'}</button>
            ) : (
              <input
                type={f.type || 'text'}
                value={form[f.key] || ''}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            )}
          </div>
        ))}
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onCancel} className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
          <button onClick={() => onSave(form)} className="px-4 py-2 text-sm bg-navy text-white rounded hover:bg-navy/90">Save</button>
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [editing, setEditing] = useState(null);
  const load = () => adminReq('/admin/users').then(d => setUsers(d.users));
  useEffect(() => { load(); }, []);

  const deleteUser = (id) => {
    setConfirm({ message: 'Delete this user and all their data?', action: () => adminReq(`/admin/users/${id}`, { method: 'DELETE' }).then(load).finally(() => setConfirm(null)) });
  };

  const saveUser = (id, data) => {
    adminReq(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(load).then(() => setEditing(null));
  };

  const toggleAdmin = (u) => {
    adminReq(`/admin/users/${u.id}`, { method: 'PUT', body: JSON.stringify({ is_admin: !u.is_admin }) }).then(load);
  };

  return (
    <div>
      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} onConfirm={confirm.action} />}
      {editing && <EditModal title="Edit User" fields={[
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
      ]} values={editing} onCancel={() => setEditing(null)} onSave={(d) => saveUser(editing.id, d)} />}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-navy text-white">
            <th className="px-3 py-2 text-left">ID</th>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-left hidden sm:table-cell">Email</th>
            <th className="px-3 py-2 text-left">Admin</th>
            <th className="px-3 py-2 text-left hidden md:table-cell">Joined</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b hover:bg-amber/10">
                <td className="px-3 py-2">{u.id}</td>
                <td className="px-3 py-2 font-medium">{u.name}</td>
                <td className="px-3 py-2 hidden sm:table-cell text-gray-600">{u.email}</td>
                <td className="px-3 py-2">
                  <button onClick={() => toggleAdmin(u)} className={`px-2 py-0.5 rounded text-xs font-bold ${u.is_admin ? 'bg-amber text-navy' : 'bg-gray-200 text-gray-500'}`}>
                    {u.is_admin ? '✓ Admin' : 'User'}
                  </button>
                </td>
                <td className="px-3 py-2 hidden md:table-cell text-gray-500">{u.created_at?.split('T')[0]}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => setEditing(u)} className="text-navy hover:text-amber mr-2 text-xs font-medium">Edit</button>
                  <button onClick={() => deleteUser(u.id)} className="text-red-600 hover:text-red-800 text-xs font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TripsTab() {
  const [trips, setTrips] = useState([]);
  const [users, setUsers] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [editing, setEditing] = useState(null);
  const load = () => {
    adminReq('/admin/trips').then(d => setTrips(d.trips));
    adminReq('/admin/users').then(d => setUsers(d.users));
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} onConfirm={confirm.action} />}
      {editing && <EditModal title="Edit Trip" fields={[
        { key: 'name', label: 'Trip Name' },
        { key: 'user_id', label: 'User ID' },
      ]} values={editing} onCancel={() => setEditing(null)} onSave={(d) => {
        adminReq(`/admin/trips/${editing.id}`, { method: 'PUT', body: JSON.stringify(d) }).then(load).then(() => setEditing(null));
      }} />}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-navy text-white">
            <th className="px-3 py-2 text-left">ID</th>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-left">User</th>
            <th className="px-3 py-2 text-left hidden sm:table-cell">Flights</th>
            <th className="px-3 py-2 text-left hidden md:table-cell">Created</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr></thead>
          <tbody>
            {trips.map(t => (
              <tr key={t.id} className="border-b hover:bg-amber/10">
                <td className="px-3 py-2">{t.id}</td>
                <td className="px-3 py-2 font-medium">{t.name}</td>
                <td className="px-3 py-2">{t.user_name}</td>
                <td className="px-3 py-2 hidden sm:table-cell">{t.flights?.length || 0}</td>
                <td className="px-3 py-2 hidden md:table-cell text-gray-500">{t.created_at?.split('T')[0]}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => setEditing(t)} className="text-navy hover:text-amber mr-2 text-xs font-medium">Edit</button>
                  <button onClick={() => setConfirm({ message: 'Delete this trip?', action: () => adminReq(`/admin/trips/${t.id}`, { method: 'DELETE' }).then(load).finally(() => setConfirm(null)) })} className="text-red-600 hover:text-red-800 text-xs font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FlightsTab() {
  const [flights, setFlights] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [editing, setEditing] = useState(null);
  const load = () => adminReq('/admin/flights').then(d => setFlights(d.flights));
  useEffect(() => { load(); }, []);

  return (
    <div>
      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} onConfirm={confirm.action} />}
      {editing && <EditModal title="Edit Flight" fields={[
        { key: 'flight_number', label: 'Flight Number' },
        { key: 'departure_airport', label: 'From (IATA)' },
        { key: 'arrival_airport', label: 'To (IATA)' },
        { key: 'flight_date', label: 'Date' },
        { key: 'departure_time', label: 'Departure Time' },
        { key: 'arrival_time', label: 'Arrival Time' },
      ]} values={editing} onCancel={() => setEditing(null)} onSave={(d) => {
        adminReq(`/admin/flights/${editing.id}`, { method: 'PUT', body: JSON.stringify(d) }).then(load).then(() => setEditing(null));
      }} />}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-navy text-white">
            <th className="px-3 py-2 text-left">Flight</th>
            <th className="px-3 py-2 text-left">Route</th>
            <th className="px-3 py-2 text-left hidden sm:table-cell">Date</th>
            <th className="px-3 py-2 text-left hidden md:table-cell">User</th>
            <th className="px-3 py-2 text-left hidden md:table-cell">Trip</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr></thead>
          <tbody>
            {flights.map(f => (
              <tr key={f.id} className="border-b hover:bg-amber/10">
                <td className="px-3 py-2 font-mono font-medium">{f.flight_number}</td>
                <td className="px-3 py-2">{f.departure_airport} → {f.arrival_airport}</td>
                <td className="px-3 py-2 hidden sm:table-cell">{f.flight_date}</td>
                <td className="px-3 py-2 hidden md:table-cell">{f.user_name}</td>
                <td className="px-3 py-2 hidden md:table-cell">{f.trip_name}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => setEditing(f)} className="text-navy hover:text-amber mr-2 text-xs font-medium">Edit</button>
                  <button onClick={() => setConfirm({ message: 'Delete this flight?', action: () => adminReq(`/admin/flights/${f.id}`, { method: 'DELETE' }).then(load).finally(() => setConfirm(null)) })} className="text-red-600 hover:text-red-800 text-xs font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsTab() {
  const [domains, setDomains] = useState([]);
  const [newDomain, setNewDomain] = useState('');
  const load = () => adminReq('/admin/settings').then(d => setDomains(d.settings?.allowed_domains || []));
  useEffect(() => { load(); }, []);

  const save = (newList) => {
    adminReq('/admin/settings', { method: 'PUT', body: JSON.stringify({ key: 'allowed_domains', value: newList }) }).then(load);
  };

  const addDomain = () => {
    if (!newDomain.trim()) return;
    const d = newDomain.trim().toLowerCase();
    if (!domains.includes(d)) save([...domains, d]);
    setNewDomain('');
  };

  const removeDomain = (d) => save(domains.filter(x => x !== d));

  return (
    <div className="max-w-lg">
      <h3 className="font-bold text-navy mb-2">Allowed Email Domains</h3>
      <p className="text-sm text-gray-500 mb-4">Users can only register with these email domains. Leave empty to allow all domains.</p>
      <div className="flex gap-2 mb-4">
        <input
          value={newDomain}
          onChange={e => setNewDomain(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addDomain()}
          placeholder="e.g. company.com"
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
        <button onClick={addDomain} className="bg-navy text-white px-4 py-2 rounded text-sm font-medium hover:bg-navy/90">Add</button>
      </div>
      <div className="space-y-2">
        {domains.length === 0 && <p className="text-sm text-gray-400 italic">No restrictions — open registration</p>}
        {domains.map(d => (
          <div key={d} className="flex items-center justify-between bg-white border rounded px-3 py-2">
            <span className="text-sm font-mono">{d}</span>
            <button onClick={() => removeDomain(d)} className="text-red-600 hover:text-red-800 text-xs font-medium">Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('users');

  if (!user?.is_admin) return <Navigate to="/" />;

  const tabs = [
    { id: 'users', label: 'Users', icon: '👤' },
    { id: 'trips', label: 'Trips', icon: '🧳' },
    { id: 'flights', label: 'Flights', icon: '✈️' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-4">Admin Panel</h1>
      <div className="flex gap-1 mb-6 border-b">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-amber text-navy' : 'border-transparent text-gray-400 hover:text-navy'
            }`}
          >
            <span className="mr-1">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>
      {tab === 'users' && <UsersTab />}
      {tab === 'trips' && <TripsTab />}
      {tab === 'flights' && <FlightsTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}
