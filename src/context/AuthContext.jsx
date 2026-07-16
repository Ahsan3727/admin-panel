import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      api.get('/admin/me')
        .then(res => setAdmin(res.data.admin))
        .catch(() => localStorage.removeItem('adminToken'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/admin/login', { email, password });
    localStorage.setItem('adminToken', res.data.token);
    setAdmin(res.data.admin);
    toast.success('Welcome back!');
    navigate('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setAdmin(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ admin, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAdminAuth = () => useContext(AuthContext);
