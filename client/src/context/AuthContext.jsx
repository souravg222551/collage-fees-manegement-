import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../api/services';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    try {
      const { data } = await authApi.me();
      setAdmin(data.data);
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = async (email, password) => {
    const { data } = await authApi.login({ email, password });
    if (data.data.token) localStorage.setItem('cfm_token', data.data.token);
    setAdmin(data.data.admin);
    return data.data.admin;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('cfm_token');
      setAdmin(null);
    }
  };

  return (
    <AuthContext.Provider value={{ admin, setAdmin, loading, login, logout, refresh: loadMe }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
