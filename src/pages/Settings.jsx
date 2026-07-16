import React, { useState } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const Settings = () => {
  const [appName, setAppName] = useState('Groxo');
  const [commission, setCommission] = useState(10);

  const saveGeneral = async () => {
    try {
      await api.put('/admin/settings/general', { appName });
      toast.success('Settings saved');
    } catch (err) { toast.error('Save failed'); }
  };

  const saveCommission = async () => {
    try {
      await api.put('/admin/settings/commission', { commission });
      toast.success('Commission updated');
    } catch (err) { toast.error('Update failed'); }
  };

  return (
    <div>
      <h2>System Settings</h2>
      <div style={{ background:'#fff', padding:20, borderRadius:8, marginTop:16 }}>
        <h3>General</h3>
        <label>App Name</label>
        <input value={appName} onChange={e => setAppName(e.target.value)} style={{ width:'100%', padding:8, marginBottom:12 }} />
        <button onClick={saveGeneral} style={{ background:'#4CAF50', color:'#fff', border:'none', padding:'8px 16px', borderRadius:4 }}>Save</button>
      </div>
      <div style={{ background:'#fff', padding:20, borderRadius:8, marginTop:16 }}>
        <h3>Commission Settings</h3>
        <label>Commission %</label>
        <input type="number" value={commission} onChange={e => setCommission(e.target.value)} style={{ width:'100%', padding:8, marginBottom:12 }} />
        <button onClick={saveCommission} style={{ background:'#4CAF50', color:'#fff', border:'none', padding:'8px 16px', borderRadius:4 }}>Save</button>
      </div>
    </div>
  );
};

export default Settings;
