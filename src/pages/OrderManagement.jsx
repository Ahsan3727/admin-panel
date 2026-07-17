import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';

const STATUS_TABS = ['', 'pending', 'confirmed', 'packing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled'];

const STATUS_PILL = {
  pending: 'accent', confirmed: 'info', packing: 'info',
  ready_for_pickup: 'accent', out_for_delivery: 'accent',
  delivered: 'primary', cancelled: 'danger', disputed: 'danger',
};

const StatusPill = ({ status }) => (
  <span className={`gx-pill gx-pill-${STATUS_PILL[status] || 'muted'}`}>
    <span className="gx-pill-dot" />{(status || '').replace(/_/g, ' ')}
  </span>
);

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [riders, setRiders] = useState([]);
  const [assignRiderId, setAssignRiderId] = useState('');
  const [settlingAll, setSettlingAll] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const { data } = await api.get(`/admin/orders${params}`);
      setOrders(data);
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchRiders = async () => {
    try {
      const { data } = await api.get('/admin/riders');
      setRiders(data);
    } catch (error) {
      console.log('Could not fetch riders');
    }
  };

  useEffect(() => { fetchOrders(); fetchRiders(); }, [statusFilter]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/admin/orders/${orderId}`, { status: newStatus });
      toast.success(`Order ${newStatus}`);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Update failed');
    }
  };

  const assignRider = async () => {
    if (!assignRiderId) return;
    try {
      await api.put(`/orders/${selectedOrder._id}/assign`, { riderId: assignRiderId });
      toast.success('Rider assigned');
      setShowModal(false);
      fetchOrders();
    } catch (error) {
      toast.error('Assignment failed');
    }
  };

  const openDetailModal = (order) => {
    setSelectedOrder(order);
    setAssignRiderId(order.rider?._id || '');
    setShowModal(true);
  };

  const settleAllCOD = async () => {
    if (!window.confirm('Mark ALL unsettled COD orders (all riders) as settled?')) return;
    setSettlingAll(true);
    try {
      const { data } = await api.put('/admin/orders/settle-all', {});
      toast.success(data.message);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Bulk settlement failed');
    } finally {
      setSettlingAll(false);
    }
  };

  const markGroupPaid = async (orderId, groupIndex) => {
    try {
      await api.put(`/admin/orders/${orderId}/pay-wholesaler-group`, { groupIndex });
      toast.success('Wholesaler marked as paid');
      // Keep the modal in sync without a full refetch/close
      setSelectedOrder((prev) => {
        if (!prev) return prev;
        const groups = prev.wholesalerGroups?.map((g, i) => (i === groupIndex ? { ...g, paid: true } : g));
        return { ...prev, wholesalerGroups: groups };
      });
      fetchOrders();
    } catch (error) {
      toast.error('Failed to mark wholesaler as paid');
    }
  };

  return (
    <>
      <div className="gx-chip-scroll">
        {STATUS_TABS.map((s) => (
          <div key={s || 'all'} className={`gx-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
            {s === '' ? 'All' : s.replace(/_/g, ' ')}
          </div>
        ))}
      </div>

      <button className="gx-btn gx-btn-primary gx-btn-block" style={{ marginTop: 12 }} onClick={settleAllCOD} disabled={settlingAll}>
        {settlingAll ? 'Settling…' : '💵 Settle all COD payouts'}
      </button>

      <div className="gx-section-title">{loading ? 'Loading…' : `${orders.length} orders`}</div>

      {!loading && orders.length === 0 && (
        <div className="gx-empty">
          <div className="gx-glyph">📦</div>
          <h4>No orders found</h4>
          <p>Try a different status filter.</p>
        </div>
      )}

      {orders.map((o) => (
        <div className="gx-stack-card" key={o._id}>
          <div className="gx-stack-head">
            <div>
              <h4>{o.customer?.name || 'N/A'}</h4>
              <div className="gx-row-sub gx-mono">#{o._id?.slice(-6)}</div>
            </div>
            <StatusPill status={o.status} />
          </div>
          <div className="gx-stack-meta">
            <div>Amount<b>Rs. {o.payment?.amount || 0}</b></div>
            <div>Rider<b>{o.rider?.name || 'Unassigned'}</b></div>
            <div>Date<b>{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</b></div>
          </div>
          <div className="gx-stack-actions">
            <button className="gx-btn gx-btn-outline gx-btn-sm" onClick={() => openDetailModal(o)}>View details</button>
            {o.status === 'pending' && (
              <>
                <button className="gx-btn gx-btn-primary gx-btn-sm" onClick={() => updateStatus(o._id, 'confirmed')}>Confirm</button>
                <button className="gx-btn gx-btn-danger-outline gx-btn-sm" onClick={() => updateStatus(o._id, 'cancelled')}>Cancel</button>
              </>
            )}
            {o.status === 'out_for_delivery' && (
              <button className="gx-btn gx-btn-primary gx-btn-sm" onClick={() => updateStatus(o._id, 'delivered')}>Mark delivered</button>
            )}
          </div>
        </div>
      ))}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Order #${selectedOrder?._id?.slice(-6) || ''}`}
        footer={
          <>
            <button className="gx-btn gx-btn-outline" onClick={() => setShowModal(false)}>Close</button>
            <button className="gx-btn gx-btn-primary" onClick={assignRider}>Assign rider</button>
          </>
        }
      >
        {selectedOrder && (
          <>
            <div className="gx-stack-meta gx-mt-0">
              <div>Customer<b>{selectedOrder.customer?.name}</b></div>
              <div>Phone<b>{selectedOrder.customer?.phone}</b></div>
              <div>Status<b>{selectedOrder.status?.replace(/_/g, ' ')}</b></div>
              <div>Amount<b>Rs. {selectedOrder.payment?.amount}</b></div>
            </div>

            <div className="gx-section-title">Pickup stops</div>
            {selectedOrder.wholesalerGroups?.length > 0 ? (
              selectedOrder.wholesalerGroups.map((g, idx) => (
                <div className="gx-stack-card" key={idx}>
                  <div className="gx-stack-head">
                    <h4>{g.storeName || g.wholesaler?.name || 'Wholesaler'}</h4>
                    {g.paid ? <span className="gx-pill gx-pill-primary"><span className="gx-pill-dot" />Paid</span> : <StatusPill status={g.status} />}
                  </div>
                  {g.items?.map((item, i) => (
                    <div className="gx-row-item" key={i} style={{ padding: '8px 0' }}>
                      <div className="gx-row-body"><div className="gx-row-title">{item.product?.name || 'Product'} × {item.quantity}</div></div>
                      <div className="gx-row-amount">Rs. {item.price}</div>
                    </div>
                  ))}
                  {!g.paid && (
                    <div className="gx-stack-actions">
                      <button className="gx-btn gx-btn-accent gx-btn-sm" onClick={() => markGroupPaid(selectedOrder._id, idx)}>Mark wholesaler paid</button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="gx-stack-card">
                <div className="gx-row-sub" style={{ marginBottom: 8 }}>
                  {selectedOrder.wholesaler?.storeName || selectedOrder.wholesaler?.name || 'N/A'}
                </div>
                {selectedOrder.items?.map((item, i) => (
                  <div className="gx-row-item" key={i} style={{ padding: '8px 0' }}>
                    <div className="gx-row-body"><div className="gx-row-title">{item.product?.name || 'Product'} × {item.quantity}</div></div>
                    <div className="gx-row-amount">Rs. {item.price}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="gx-section-title">Timeline</div>
            {selectedOrder.timeline?.map((t, i) => (
              <div className="gx-row-sub" style={{ marginBottom: 6 }} key={i}>
                {new Date(t.timestamp).toLocaleString()} — {t.status}{t.note ? ` (${t.note})` : ''}
              </div>
            ))}

            <div className="gx-section-title">Assign rider</div>
            <div className="gx-field gx-mt-0">
              <select value={assignRiderId} onChange={(e) => setAssignRiderId(e.target.value)}>
                <option value="">Select rider</option>
                {riders.map((r) => (
                  <option key={r._id} value={r._id}>{r.name} ({r.vehicle?.type || 'Vehicle'})</option>
                ))}
              </select>
            </div>
          </>
        )}
      </Modal>
    </>
  );
};

export default OrderManagement;
