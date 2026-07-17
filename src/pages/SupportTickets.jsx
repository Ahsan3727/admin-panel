import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';

const STATUS_PILL = { open: 'accent', resolved: 'primary' };

const SupportTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const loadTickets = () => {
    api.get('/admin/tickets')
      .then((res) => setTickets(res.data.tickets || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const resolveTicket = async (id) => {
    try {
      await api.put(`/admin/tickets/${id}`, { status: 'resolved' });
      toast.success('Ticket resolved');
      setTickets((prev) => prev.filter((t) => t._id !== id));
      setShowModal(false);
    } catch (err) {
      toast.error('Failed to resolve');
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
      <div className="gx-section-title gx-mt-0">{loading ? 'Loading…' : `${openCount} open tickets`}</div>

      {!loading && tickets.length === 0 && (
        <div className="gx-empty">
          <div className="gx-glyph">🎫</div>
          <h4>No support tickets</h4>
          <p>You're all caught up.</p>
        </div>
      )}

      {tickets.map((t) => (
        <div className="gx-stack-card" key={t._id} onClick={() => openDetail(t)} style={{ cursor: 'pointer' }}>
          <div className="gx-stack-head">
            <h4 style={{ flex: 1 }}>{t.subject}</h4>
            <span className={`gx-pill gx-pill-${STATUS_PILL[t.status] || 'muted'}`}><span className="gx-pill-dot" />{t.status}</span>
          </div>
          <div className="gx-row-sub" style={{ marginTop: 6 }}>From {t.user?.name || 'N/A'}</div>
          {t.message && (
            <div className="gx-row-sub" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{t.message}</div>
          )}
          <div className="gx-stack-actions">
            <button className="gx-btn gx-btn-outline gx-btn-sm" onClick={(e) => { e.stopPropagation(); openDetail(t); }}>
              {t.replies?.length ? `View / Reply (${t.replies.length})` : 'View / Reply'}
            </button>
            {t.status === 'open' && (
              <button className="gx-btn gx-btn-primary gx-btn-sm" onClick={(e) => { e.stopPropagation(); resolveTicket(t._id); }}>Mark resolved</button>
            )}
          </div>
        </div>
      ))}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedTicket?.subject || 'Ticket'}
        footer={
          <>
            <button className="gx-btn gx-btn-outline" onClick={() => setShowModal(false)}>Close</button>
            {selectedTicket?.status === 'open' && (
              <button className="gx-btn gx-btn-primary" onClick={() => resolveTicket(selectedTicket._id)}>Mark resolved</button>
            )}
          </>
        }
      >
        {selectedTicket && (
          <>
            <div className="gx-stack-meta gx-mt-0">
              <div>From<b>{selectedTicket.user?.name || 'N/A'}</b></div>
              <div>Status<b>{selectedTicket.status}</b></div>
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
