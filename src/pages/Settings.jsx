import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';

const Settings = () => {
  const [appName, setAppName] = useState('Groxo');
  const [commission, setCommission] = useState(10);
  const navigate = useNavigate();
  const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');

  const saveGeneral = async () => {
    try {
      await api.put('/admin/settings/general', { appName });
      toast.success('Settings saved');
    } catch (err) {
      toast.error('Save failed');
    }
  };

  const saveCommission = async () => {
    try {
      await api.put('/admin/settings/commission', { commission });
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
          <input value={appName} onChange={(e) => setAppName(e.target.value)} />
        </div>
        <button className="gx-btn gx-btn-primary" style={{ marginTop: 14 }} onClick={saveGeneral}>Save</button>
      </div>

      <div className="gx-section-title">Commission</div>
      <div className="gx-card gx-card-pad">
        <div className="gx-field gx-mt-0">
          <label>Commission %</label>
          <input type="number" value={commission} onChange={(e) => setCommission(e.target.value)} />
        </div>
        <button className="gx-btn gx-btn-primary" style={{ marginTop: 14 }} onClick={saveCommission}>Save</button>
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
