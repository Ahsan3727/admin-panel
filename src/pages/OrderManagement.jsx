import React, { useState, useEffect, useRef } from 'react';
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [riders, setRiders] = useState([]);
  const [assignRiderId, setAssignRiderId] = useState('');
  const [assigningRider, setAssigningRider] = useState(false);
  const [settlingAll, setSettlingAll] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  // Server-side pagination — `orders` accumulates as more pages load,
  // same "load more" pattern used on the product catalog page.
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const filterDebounceRef = useRef(null);

  // Cancellation-reason modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchOrders = async (targetPage = 1, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const { data } = await api.get('/admin/orders', {
        params: {
          status: statusFilter || undefined,
          search: search.trim() || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page: targetPage,
          limit: 20,
        },
      });
      setOrders((prev) => (append ? [...prev, ...data.orders] : data.orders));
      setPage(data.page);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) fetchOrders(page + 1, true);
  };

  const fetchRiders = async () => {
    try {
      const { data } = await api.get('/admin/riders');
      setRiders(data);
    } catch (error) {
      console.log('Could not fetch riders');
    }
  };

  useEffect(() => { fetchRiders(); }, []);

  // Refetch from page 1 whenever any filter changes, debounced so typing in
  // the search box doesn't fire a request per keystroke.
  useEffect(() => {
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = setTimeout(() => {
      fetchOrders(1, false);
    }, 350);
    return () => clearTimeout(filterDebounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, search, startDate, endDate]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/admin/orders/${orderId}`, { status: newStatus });
      toast.success(`Order ${newStatus}`);
      fetchOrders(1, false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Update failed');
    }
  };

  const assignRider = async () => {
    if (!assignRiderId || !selectedOrder) return;
    setAssigningRider(true);
    try {
      // Admin-namespaced route — guarded by protectAdmin like every other
      // action on this page (previously called /api/orders/:id/assign,
      // which had no /admin prefix and only worked because `protect`
      // doesn't check role).
      await api.put(`/admin/orders/${selectedOrder._id}/assign`, { riderId: assignRiderId });
      toast.success('Rider assigned');
      setShowModal(false);
      fetchOrders(1, false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Assignment failed');
    } finally {
      setAssigningRider(false);
    }
  };

  const openDetailModal = (order) => {
    setSelectedOrder(order);
    setAssignRiderId(order.rider?._id || '');
    setShowModal(true);
  };

  const downloadInvoice = async () => {
    if (!selectedOrder) return;
    setDownloadingInvoice(true);
    try {
      const response = await api.get(`/admin/orders/${selectedOrder._id}/invoice`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${selectedOrder.orderNumber || selectedOrder._id.slice(-6)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download invoice');
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const settleAllCOD = async () => {
    if (!window.confirm('Mark ALL unsettled COD orders (all riders) as settled?')) return;
    setSettlingAll(true);
    try {
      const { data } = await api.put('/admin/orders/settle-all', {});
      toast.success(data.message);
      fetchOrders(1, false);
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
      fetchOrders(1, false);
    } catch (error) {
      toast.error('Failed to mark wholesaler as paid');
    }
  };

  // ---------- Cancellation (with reason capture) ----------
  const openCancelModal = (orderId) => {
    setCancelTargetId(orderId);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!cancelTargetId) return;
    setCancelling(true);
    try {
      await api.put(`/admin/orders/${cancelTargetId}`, {
        status: 'cancelled',
        reason: cancelReason.trim() || undefined,
      });
      toast.success('Order cancelled');
      setShowCancelModal(false);
      fetchOrders(1, false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Cancellation failed');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <div className="gx-searchbar">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth="1.6" /><path d="M14 14l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        <input placeholder="Search by customer name, phone or order number…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="gx-field-row" style={{ marginBottom: 10 }}>
        <div className="gx-field gx-mt-0">
          <label>From</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} max={endDate || undefined} />
        </div>
        <div className="gx-field gx-mt-0">
          <label>To</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || undefined} />
        </div>
      </div>

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

      <div className="gx-section-title">
        {loading ? 'Loading…' : `${total} order${total === 1 ? '' : 's'}${orders.length < total ? ` (${orders.length} loaded)` : ''}`}
      </div>

      {!loading && orders.length === 0 && (
        <div className="gx-empty">
          <div className="gx-glyph">📦</div>
          <h4>No orders found</h4>
          <p>Try a different search term, date range or status filter.</p>
        </div>
      )}

      {orders.map((o) => (
        <div className="gx-stack-card" key={o._id}>
          <div className="gx-stack-head">
            <div>
              <h4>{o.customer?.name || 'N/A'}</h4>
              <div className="gx-row-sub gx-mono">{o.orderNumber || `#${o._id?.slice(-6)}`}</div>
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
                <button className="gx-btn gx-btn-danger-outline gx-btn-sm" onClick={() => openCancelModal(o._id)}>Cancel</button>
              </>
            )}
            {o.status === 'out_for_delivery' && (
              <button className="gx-btn gx-btn-primary gx-btn-sm" onClick={() => updateStatus(o._id, 'delivered')}>Mark delivered</button>
            )}
          </div>
        </div>
      ))}

      {!loading && page < totalPages && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0' }}>
          <button className="gx-btn gx-btn-outline" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : `Load more (${total - orders.length} remaining)`}
          </button>
        </div>
      )}

      {/* ---------- Order detail / assign rider modal ---------- */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Order ${selectedOrder?.orderNumber || `#${selectedOrder?._id?.slice(-6) || ''}`}`}
        footer={
          <>
            <button className="gx-btn gx-btn-outline" onClick={() => setShowModal(false)}>Close</button>
            <button className="gx-btn gx-btn-outline" onClick={downloadInvoice} disabled={downloadingInvoice}>
              {downloadingInvoice ? 'Preparing…' : '🧾 Invoice'}
            </button>
            <button className="gx-btn gx-btn-primary" onClick={assignRider} disabled={assigningRider || !assignRiderId}>
              {assigningRider ? 'Assigning…' : 'Assign rider'}
            </button>
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

            {selectedOrder.status === 'cancelled' && selectedOrder.cancellationReason && (
              <div className="gx-card gx-card-pad" style={{ marginTop: 10, background: 'var(--danger-tint)' }}>
                <div className="gx-row-sub" style={{ color: 'var(--danger)', fontWeight: 700, marginBottom: 4 }}>Cancellation reason</div>
                <div style={{ fontSize: 13 }}>{selectedOrder.cancellationReason}</div>
              </div>
            )}

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

      {/* ---------- Cancellation reason modal ---------- */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel order"
        footer={
          <>
            <button className="gx-btn gx-btn-outline" onClick={() => setShowCancelModal(false)}>Back</button>
            <button className="gx-btn gx-btn-danger-outline" onClick={confirmCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Confirm cancellation'}
            </button>
          </>
        }
      >
        <p className="gx-row-sub" style={{ marginBottom: 10 }}>
          This marks the order as cancelled and notifies the customer. Adding a reason helps support and the wholesaler understand what happened.
        </p>
        <div className="gx-field gx-mt-0">
          <label>Reason (optional)</label>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Customer requested cancellation, item out of stock, duplicate order…"
          />
        </div>
      </Modal>
    </>
  );
};

export default OrderManagement;
