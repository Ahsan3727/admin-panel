import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [type, setType] = useState('');

  useEffect(() => {
    api.get(`/admin/transactions?type=${type}`).then(res => setTransactions(res.data.transactions || [])).catch(() => {});
  }, [type]);

  const handleWithdrawal = async (txnId, action) => {
    try {
      await api.put(`/admin/transactions/${txnId}`, { action });
      toast.success(`Withdrawal ${action}ed`);
      setTransactions(prev => prev.filter(t => t._id !== txnId));
    } catch (err) {
      toast.error('Action failed');
    }
  };

  return (
    <div>
      <h2>Transactions & Money Flow</h2>
      <select value={type} onChange={e => setType(e.target.value)} style={{ padding:8, borderRadius:6, marginBottom:16 }}>
        <option value="">All</option>
        <option value="payment">Payments</option>
        <option value="withdrawal">Withdrawals</option>
      </select>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead><tr style={{ background:'#f1f5f9' }}><th>ID</th><th>User</th><th>Amount</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {transactions.map(txn => (
            <tr key={txn._id} style={{ borderBottom:'1px solid #e2e8f0' }}>
              <td>{txn._id?.slice(-6)}</td>
              <td>{txn.user?.name || 'N/A'}</td>
              <td>₹{txn.amount}</td>
              <td>{txn.type}</td>
              <td>{txn.status}</td>
              <td>
                {txn.type === 'withdrawal' && txn.status === 'pending' && (
                  <>
                    <button onClick={() => handleWithdrawal(txn._id, 'approve')} style={{ background:'#4CAF50', color:'#fff', border:'none', padding:'4px 8px', borderRadius:4, marginRight:4 }}>Approve</button>
                    <button onClick={() => handleWithdrawal(txn._id, 'reject')} style={{ background:'#f44336', color:'#fff', border:'none', padding:'4px 8px', borderRadius:4 }}>Reject</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Transactions;
