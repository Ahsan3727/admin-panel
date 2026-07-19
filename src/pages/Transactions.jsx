import React, { useState, useEffect, useRef } from 'react';
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
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const debounceRef = useRef(null);

  const fetchTransactions = (typeArg, searchArg) => {
    setLoading(true);
    const params = {};
    if (typeArg) params.type = typeArg;
    if (searchArg.trim()) params.search = searchArg.trim();
    api.get('/admin/transactions', { params })
      .then((res) => setTransactions(res.data.transactions || []))
      .catch(() => toast.error('Failed to load transactions'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTransactions(type, search); }, [type]);

  const handleSearchChange = (value) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchTransactions(type, value), 400);
  };

  const handleWithdrawal = async (txnId, action) => {
    try {
      await api.put(`/admin/transactions/${txnId}`, { action });
      toast.success(`Withdrawal ${action}ed`);
      setTransactions((prev) => prev.filter((t) => t._id !== txnId));
    } catch (err) {
      toast.error('Action failed');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (type) params.type = type;
      if (search.trim()) params.search = search.trim();
      const res = await api.get('/admin/transactions/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="gx-searchbar gx-mt-0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth="1.6" /><path d="M14 14l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        <input placeholder="Search by user name or email…" value={search} onChange={(e) => handleSearchChange(e.target.value)} />
      </div>

      <div className="gx-flex-between" style={{ marginTop: 12 }}>
        <div className="gx-segmented" style={{ flex: 1, marginRight: 10 }}>
          {TABS.map((t) => (
            <button key={t.value} className={type === t.value ? 'active' : ''} onClick={() => setType(t.value)}>{t.label}</button>
          ))}
        </div>
        <button className="gx-btn gx-btn-outline gx-btn-sm" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting…' : '⬇ CSV'}
        </button>
      </div>

      <div className="gx-section-title">{loading ? 'Loading…' : `${transactions.length} transactions`}</div>

      {!loading && transactions.length === 0 && (
        <div className="gx-empty">
          <div className="gx-glyph">💰</div>
          <h4>No transactions found</h4>
          <p>Try a different filter or search term.</p>
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
              <div className="gx-row-sub">{t.createdAt ? new Date(t.createdAt).toLocaleString() : '—'}</div>
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
