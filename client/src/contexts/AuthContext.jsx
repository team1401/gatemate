import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('gatemate_token');
    if (token) {
      api.me().then(data => setUser(data.user)).catch(() => {
        localStorage.removeItem('gatemate_token');
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    localStorage.setItem('gatemate_token', data.token);
    setUser(data.user);
  };

  const register = async (email, password, name) => {
    // Registration does not sign in; the account must be verified via the emailed link first
    return api.register(email, password, name);
  };

  const logout = () => {
    localStorage.removeItem('gatemate_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
