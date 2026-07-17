import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('admin@groxo.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (localStorage.getItem('adminToken')) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/admin/login', { email, password });
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminInfo', JSON.stringify({
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
      }));
      toast.success('Login successful!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gx-app-shell">
      <div className="gx-view-full">
        <div className="gx-login-wrap">
          <div className="gx-login-logo">🌿</div>
          <h2 className="gx-login-title">Groxo Admin</h2>
          <p className="gx-login-sub">Sign in to manage your hub</p>

          {error && <div className="gx-login-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="gx-field" style={{ marginTop: 20 }}>
              <label htmlFor="loginEmail">Email address</label>
              <input
                id="loginEmail"
                type="email"
                placeholder="admin@groxo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="gx-field">
              <label htmlFor="loginPassword">Password</label>
              <input
                id="loginPassword"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className="gx-field">
              <button type="submit" className="gx-btn gx-btn-primary gx-btn-block" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
          </form>

          <p className="gx-login-hint">Default: admin@groxo.com / admin123</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
