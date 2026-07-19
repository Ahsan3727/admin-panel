import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_PILL = { open: 'accent', in_progress: 'info', resolved: 'primary', closed: 'muted' };
const STATUS_LABEL = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved', closed: 'Closed' };

const SupportTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const debounceRef = useRef(null);

  const loadTickets = (statusArg, searchArg) => {
    setLoading(true);
    const params = {};
    if (statusArg) params.status = statusArg;
    if (searchArg.trim()) params.search = searchArg.trim();
    api.get('/admin/tickets', { params })
      .then((res) => setTickets(res.data.tickets || []))
      .catch(() => toast.error('Failed to load tickets'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTickets(statusFilter, search);
  }, [statusFilter]);

  useEffect(() => {
    // Staff list for the "Assign to" picker — admin role only. No page/limit
    // passed, so this gets the plain (non-paginated) array shape from
    // GET /admin/users.
    api.get('/admin/users', { params: { role: 'admin' } })
      .then((res) => setStaff(res.data || []))
      .catch(() => {});
  }, []);

  const handleSearchChange = (value) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadTickets(statusFilter, value), 400);
  };

  const updateTicket = async (id, payload) => {
    setUpdating(true);
    try {
      const { data } = await api.put(`/admin/tickets/${id}`, payload);
      setTickets((prev) => prev.map((t) => (t._id === data._id ? data : t)));
      if (selectedTicket?._id === data._id) setSelectedTicket(data);
      toast.success('Ticket updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const openDetail = (ticket) => {
    setSelectedTicket(ticket);
    setReplyText('');
    setShowModal(true);
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setSending(true);
    try {
      const { data } = await api.post(`/admin/tickets/${selectedTicket._id}/reply`, { message: replyText.trim() });
      setSelectedTicket(data);
      setTickets((prev) => prev.map((t) => (t._id === data._id ? data : t)));
      setReplyText('');
      toast.success('Reply sent');
    } catch (err) {
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const openCount = tickets.filter((t) => t.status === 'open').length;

  return (
    <>
      <div className="gx-searchbar gx-mt-0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth="1.6" /><path d="M14 14l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        <input placeholder="Search by subject or customer…" value={search} onChange={(e) => handleSearchChange(e.target.value)} />
      </div>

      <div className="gx-chip-scroll">
        {STATUS_TABS.map((s) => (
          <div key={s.value} className={`gx-chip ${statusFilter === s.value ? 'active' : ''}`} onClick={() => setStatusFilter(s.value)}>
            {s.label}
          </div>
        ))}
      </div>

      <div className="gx-section-title">{loading ? 'Loading…' : `${openCount} open · ${tickets.length} shown`}</div>

      {!loading && tickets.length === 0 && (
        <div className="gx-empty">
          <div className="gx-glyph">🎫</div>
          <h4>No support tickets</h4>
          <p>Try a different status filter or search term.</p>
        </div>
      )}

      {tickets.map((t) => (
        <div className="gx-stack-card" key={t._id} onClick={() => openDetail(t)} style={{ cursor: 'pointer' }}>
          <div className="gx-stack-head">
            <h4 style={{ flex: 1 }}>{t.subject}</h4>
            <span className={`gx-pill gx-pill-${STATUS_PILL[t.status] || 'muted'}`}><span className="gx-pill-dot" />{STATUS_LABEL[t.status] || t.status}</span>
          </div>
          <div className="gx-row-sub" style={{ marginTop: 6 }}>From {t.user?.name || 'N/A'}</div>
          {t.assignedTo && <div className="gx-row-sub">Assigned to {t.assignedTo.name}</div>}
          {t.message && (
            <div className="gx-row-sub" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{t.message}</div>
          )}
          <div className="gx-stack-actions">
            <button className="gx-btn gx-btn-outline gx-btn-sm" onClick={(e) => { e.stopPropagation(); openDetail(t); }}>
              {t.replies?.length ? `View / Reply (${t.replies.length})` : 'View / Reply'}
            </button>
          </div>
        </div>
      ))}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedTicket?.subject || 'Ticket'}
        footer={
          <button className="gx-btn gx-btn-outline gx-btn-block" onClick={() => setShowModal(false)}>Close</button>
        }
      >
        {selectedTicket && (
          <>
            <div className="gx-stack-meta gx-mt-0">
              <div>From<b>{selectedTicket.user?.name || 'N/A'}</b></div>
              <div>Status<b>{STATUS_LABEL[selectedTicket.status] || selectedTicket.status}</b></div>
            </div>

            <div className="gx-field-row">
              <div className="gx-field gx-mt-0">
                <label>Status</label>
                <select
                  value={selectedTicket.status}
                  disabled={updating}
                  onChange={(e) => updateTicket(selectedTicket._id, { status: e.target.value })}
                >
                  {STATUS_TABS.filter((s) => s.value).map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="gx-field gx-mt-0">
                <label>Assign to</label>
                <select
                  value={selectedTicket.assignedTo?._id || ''}
                  disabled={updating}
                  onChange={(e) => updateTicket(selectedTicket._id, { assignedTo: e.target.value || null })}
                >
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="gx-section-title">Message</div>
            <div className="gx-card gx-card-pad" style={{ whiteSpace: 'pre-wrap', fontSize: 13.5 }}>
              {selectedTicket.message || 'No message provided.'}
            </div>

            <div className="gx-section-title">Replies</div>
            {(!selectedTicket.replies || selectedTicket.replies.length === 0) ? (
              <p className="gx-muted" style={{ fontSize: 13 }}>No replies yet.</p>
            ) : (
              selectedTicket.replies.map((r, i) => (
                <div className="gx-stack-card" key={r._id || i}>
                  <div className="gx-row-sub"><b>{r.sender?.name || 'Admin'}</b> · {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</div>
                  <div style={{ marginTop: 6, fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{r.message}</div>
                </div>
              ))
            )}

            <div className="gx-section-title">Send a reply</div>
            <div className="gx-field gx-mt-0">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply…"
                rows={3}
              />
            </div>
            <button
              className="gx-btn gx-btn-primary"
              style={{ marginTop: 10 }}
              disabled={sending || !replyText.trim()}
              onClick={sendReply}
            >
              {sending ? 'Sending…' : 'Send reply'}
            </button>
          </>
        )}
      </Modal>
    </>
  );
};

export default SupportTickets;
