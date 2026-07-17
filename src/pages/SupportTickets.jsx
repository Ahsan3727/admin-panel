import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const STATUS_PILL = { open: 'accent', resolved: 'primary' };

const SupportTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/tickets')
      .then((res) => setTickets(res.data.tickets || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const resolveTicket = async (id) => {
    try {
      await api.put(`/admin/tickets/${id}`, { status: 'resolved' });
      toast.success('Ticket resolved');
      setTickets((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      toast.error('Failed to resolve');
    }
  };

  const openCount = tickets.filter((t) => t.status === 'open').length;

  return (
    <>
      <div className="gx-section-title gx-mt-0">{loading ? 'Loading…' : `${openCount} open tickets`}</div>

      {!loading && tickets.length === 0 && (
        <div className="gx-empty">
          <div className="gx-glyph">🎫</div>
          <h4>No support tickets</h4>
          <p>You're all caught up.</p>
        </div>
      )}

      {tickets.map((t) => (
        <div className="gx-stack-card" key={t._id}>
          <div className="gx-stack-head">
            <h4 style={{ flex: 1 }}>{t.subject}</h4>
            <span className={`gx-pill gx-pill-${STATUS_PILL[t.status] || 'muted'}`}><span className="gx-pill-dot" />{t.status}</span>
          </div>
          <div className="gx-row-sub" style={{ marginTop: 6 }}>From {t.user?.name || 'N/A'}</div>
          {t.status === 'open' && (
            <div className="gx-stack-actions">
              <button className="gx-btn gx-btn-primary gx-btn-sm" onClick={() => resolveTicket(t._id)}>Mark resolved</button>
            </div>
          )}
        </div>
      ))}
    </>
  );
};

export default SupportTickets;
