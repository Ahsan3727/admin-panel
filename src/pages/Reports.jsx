import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Reports = () => {
  const [salesData, setSalesData] = useState([]);
  const [riderPerf, setRiderPerf] = useState([]);

  useEffect(() => {
    api.get('/admin/reports/sales').then(res => setSalesData(res.data.data || [])).catch(() => {});
    api.get('/admin/reports/rider-performance').then(res => setRiderPerf(res.data.data || [])).catch(() => {});
  }, []);

  return (
    <div>
      <h2>Reports & Analytics</h2>
      <div style={{ marginTop:24 }}>
        <h3>Sales Report</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="revenue" fill="#4CAF50" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ marginTop:24 }}>
        <h3>Rider Performance</h3>
        <table style={{ width:'100%', borderCollapse:'collapse', marginTop:8 }}>
          <thead><tr style={{ background:'#f1f5f9' }}><th>Rider</th><th>On-Time %</th><th>Rating</th><th>Earnings</th></tr></thead>
          <tbody>
            {riderPerf.map(r => (
              <tr key={r._id} style={{ borderBottom:'1px solid #e2e8f0' }}>
                <td>{r.name}</td><td>{r.onTime}%</td><td>{r.rating}</td><td>₹{r.earnings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;
