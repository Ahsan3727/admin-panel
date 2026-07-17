import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Reports = () => {
  const [salesData, setSalesData] = useState([]);
  const [riderPerf, setRiderPerf] = useState([]);

  useEffect(() => {
    api.get('/admin/reports/sales').then((res) => setSalesData(res.data.data || [])).catch(() => {});
    api.get('/admin/reports/rider-performance').then((res) => setRiderPerf(res.data.data || [])).catch(() => {});
  }, []);

  const max = Math.max(1, ...salesData.map((d) => d.revenue || 0));

  return (
    <>
      <div className="gx-section-title gx-mt-0">Sales this week</div>
      <div className="gx-card gx-card-pad">
        {salesData.length === 0 ? (
          <div className="gx-empty" style={{ padding: '20px 0' }}>
            <div className="gx-glyph">📈</div>
            <h4>No sales data yet</h4>
          </div>
        ) : (
          <div className="gx-bars">
            {salesData.map((d, i) => (
              <div className="gx-bar-col" key={i}>
                <div className="gx-bar" style={{ height: `${((d.revenue || 0) / max * 100).toFixed(0)}%` }} />
                <span>{d.period}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="gx-section-title">Rider performance</div>
      {riderPerf.length === 0 ? (
        <div className="gx-empty">
          <div className="gx-glyph">🛵</div>
          <h4>No rider data yet</h4>
        </div>
      ) : (
        riderPerf.map((r) => (
          <div className="gx-stack-card" key={r._id}>
            <div className="gx-stack-head">
              <h4>{r.name}</h4>
              <span className="gx-pill gx-pill-accent"><span className="gx-pill-dot" />{r.rating != null ? `${r.rating} ★` : 'Not rated yet'}</span>
            </div>
            <div className="gx-stack-meta">
              <div>On-time<b>{r.onTime}%</b></div>
              <div>Earnings<b>Rs. {(r.earnings || 0).toLocaleString()}</b></div>
            </div>
          </div>
        ))
      )}
    </>
  );
};

export default Reports;
