import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';

const Settings = () => {
  const [appName, setAppName] = useState('Groxo');
  const [commission, setCommission] = useState(10);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');

  useEffect(() => {
    api.get('/admin/settings')
      .then(({ data }) => {
        if (data.appName !== undefined) setAppName(data.appName);
        if (data.commission !== undefined) setCommission(data.commission);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveGeneral = async () => {
    try {
      const { data } = await api.put('/admin/settings/general', { appName });
      if (data.appName !== undefined) setAppName(data.appName);
      toast.success('Settings saved');
    } catch (err) {
      toast.error('Save failed');
    }
  };

  const saveCommission = async () => {
    try {
      const { data } = await api.put('/admin/settings/commission', { commission });
      if (data.commission !== undefined) setCommission(data.commission);
      toast.success('Commission updated');
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminInfo');
    navigate('/login');
  };

  return (
    <>
      <div className="gx-section-title gx-mt-0">General</div>
      <div className="gx-card gx-card-pad">
        <div className="gx-field gx-mt-0">
          <label>App name</label>
          <input value={appName} disabled={loading} onChange={(e) => setAppName(e.target.value)} />
        </div>
        <button className="gx-btn gx-btn-primary" style={{ marginTop: 14 }} disabled={loading} onClick={saveGeneral}>Save</button>
      </div>

      <div className="gx-section-title">Commission</div>
      <div className="gx-card gx-card-pad">
        <div className="gx-field gx-mt-0">
          <label>Commission %</label>
          <input type="number" value={commission} disabled={loading} onChange={(e) => setCommission(e.target.value)} />
        </div>
        <button className="gx-btn gx-btn-primary" style={{ marginTop: 14 }} disabled={loading} onClick={saveCommission}>Save</button>
      </div>

      <div className="gx-section-title">Account</div>
      <div className="gx-card gx-card-pad">
        <div className="gx-row-item">
          <div className="gx-row-body">
            <div className="gx-row-title">Signed in as</div>
            <div className="gx-row-sub">{adminInfo.email || 'admin@groxo.com'}</div>
          </div>
        </div>
        <button className="gx-btn gx-btn-danger-outline gx-btn-block" style={{ marginTop: 6 }} onClick={handleLogout}>Log out</button>
      </div>
    </>
  );
};

export default Settings;
