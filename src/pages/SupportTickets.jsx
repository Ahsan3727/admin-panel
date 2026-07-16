import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const SupportTickets = () => {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    api.get('/admin/tickets').then(res => setTickets(res.data.tickets || [])).catch(() => {});
  }, []);

  const resolveTicket = async (id) => {
    try {
      await api.put(`/admin/tickets/${id}`, { status: 'resolved' });
      toast.success('Ticket resolved');
      setTickets(prev => prev.filter(t => t._id !== id));
    } catch (err) { toast.error('Failed to resolve'); }
  };

  return (
    <div>
      <h2>Support Tickets</h2>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead><tr style={{ background:'#f1f5f9' }}><th>Subject</th><th>From</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {tickets.map(ticket => (
            <tr key={ticket._id} style={{ borderBottom:'1px solid #e2e8f0' }}>
              <td>{ticket.subject}</td>
              <td>{ticket.user?.name || 'N/A'}</td>
              <td>{ticket.status}</td>
              <td>
                {ticket.status === 'open' && <button onClick={() => resolveTicket(ticket._id)} style={{ background:'#4CAF50', color:'#fff', border:'none', padding:'4px 8px', borderRadius:4 }}>Resolve</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SupportTickets;
