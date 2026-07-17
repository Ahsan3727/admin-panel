import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const TABS = [
  { value: '', label: 'All' },
  { value: 'payment', label: 'Payments' },
  { value: 'withdrawal', label: 'Withdrawals' },
];

const STATUS_PILL = { pending: 'accent', completed: 'primary', approved: 'primary', rejected: 'danger' };

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/transactions?type=${type}`)
      .then((res) => setTransactions(res.data.transactions || []))
      .catch(() => toast.error('Failed to load transactions'))
      .finally(() => setLoading(false));
  }, [type]);

  const handleWithdrawal = async (txnId, action) => {
    try {
      await api.put(`/admin/transactions/${txnId}`, { action });
      toast.success(`Withdrawal ${action}ed`);
      setTransactions((prev) => prev.filter((t) => t._id !== txnId));
    } catch (err) {
      toast.error('Action failed');
    }
  };

  return (
    <>
      <div className="gx-segmented">
        {TABS.map((t) => (
          <button key={t.value} className={type === t.value ? 'active' : ''} onClick={() => setType(t.value)}>{t.label}</button>
        ))}
      </div>

      <div className="gx-section-title">{loading ? 'Loading…' : `${transactions.length} transactions`}</div>

      {!loading && transactions.length === 0 && (
        <div className="gx-empty">
          <div className="gx-glyph">💰</div>
          <h4>No transactions found</h4>
          <p>Try a different filter.</p>
        </div>
      )}

      {transactions.map((t) => (
        <React.Fragment key={t._id}>
          <div className="gx-row-item">
            <div
              className="gx-row-avatar"
              style={{
                background: t.type === 'payment' ? 'var(--primary-tint)' : 'var(--accent-tint)',
                color: t.type === 'payment' ? 'var(--primary-dark)' : '#8A5410',
              }}
            >
              {t.type === 'payment' ? '💳' : '🏦'}
            </div>
            <div className="gx-row-body">
              <div className="gx-row-title">{t.user?.name || 'N/A'}</div>
              <div className="gx-row-sub gx-mono">#{t._id?.slice(-6)} · {t.type}</div>
            </div>
            <div className="gx-row-end">
              <div className="gx-row-amount">Rs. {t.amount}</div>
              <div style={{ marginTop: 4 }}>
                <span className={`gx-pill gx-pill-${STATUS_PILL[t.status] || 'muted'}`}><span className="gx-pill-dot" />{t.status}</span>
              </div>
            </div>
          </div>
          {t.type === 'withdrawal' && t.status === 'pending' && (
            <div className="gx-stack-actions" style={{ margin: '-4px 0 8px 54px' }}>
              <button className="gx-btn gx-btn-primary gx-btn-sm" onClick={() => handleWithdrawal(t._id, 'approve')}>Approve</button>
              <button className="gx-btn gx-btn-danger-outline gx-btn-sm" onClick={() => handleWithdrawal(t._id, 'reject')}>Reject</button>
            </div>
          )}
        </React.Fragment>
      ))}
    </>
  );
};

export default Transactions;
