import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const STATUS_PILL = {
  pending: 'accent', confirmed: 'info', packing: 'info',
  ready_for_pickup: 'accent', out_for_delivery: 'accent',
  delivered: 'primary', cancelled: 'danger', disputed: 'danger',
};

const Dashboard = () => {
  const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');
  const [stats, setStats] = useState({ totalUsers: 0, totalOrders: 0, totalRevenue: 0 });
  const [activeOrders, setActiveOrders] = useState(0);
  const [activeRiders, setActiveRiders] = useState(0);
  const [pendingProducts, setPendingProducts] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [recentOrders, setRecentOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // "Live hub status" used to fetch once on mount with no polling and no
  // manual refresh — so "live" was aspirational. This now polls on an
  // interval and can be triggered manually too.
  const loadDashboard = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      // Primary stats — required for the KPI grid. This carries
      // `activeOrders` and `recentOrders`, so the dashboard doesn't need to
      // pull the entire order collection just to derive a count and a
      // top-4 list (that used to happen via a separate `/admin/orders` call).
      const dashboardPromise = api.get('/admin/dashboard').then(({ data }) => {
        setStats(data);
        setActiveOrders(data.activeOrders ?? 0);
        setRecentOrders(data.recentOrders ?? []);
      }).catch(() => {});

      // Supplementary data for the rest of the strip. Each call reuses the
      // same endpoint its own page already relies on, and fails silently
      // so a missing endpoint never breaks the dashboard.
      const ridersPromise = api.get('/admin/riders')
        .then(({ data }) => setActiveRiders(data.filter((r) => r.isActive).length))
        .catch(() => {});
      // /admin/products/pending returns { products, total, page, pages }
      // (paginated) rather than a bare array — use `total` for the KPI so
      // it reflects the true count, not just however many fit on one page.
      const productsPromise = api.get('/admin/products/pending')
        .then(({ data }) => setPendingProducts(data.total ?? 0))
        .catch(() => {});
      const ticketsPromise = api.get('/admin/tickets')
        .then(({ data }) => setOpenTickets((data.tickets || []).filter((t) => t.status === 'open').length))
        .catch(() => {});

      await Promise.all([dashboardPromise, ridersPromise, productsPromise, ticketsPromise]);
      setLastUpdated(new Date());
    } finally {
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(() => loadDashboard(), 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [loadDashboard]);

  return (
    <>
      <div className="gx-pulse-strip">
        <div className="gx-pulse-row" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="gx-pulse-dot" />
            <span className="gx-pulse-label">Live hub status</span>
          </div>
          <button
            className="gx-pulse-refresh"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            aria-label="Refresh"
            title={lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : 'Refresh'}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={refreshing ? { animation: 'gx-spin 0.8s linear infinite' } : undefined}>
              <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3.5H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="gx-pulse-metrics">
          <div className="gx-pulse-metric"><b>{activeOrders}</b><span>Active orders</span></div>
          <div className="gx-pulse-metric"><b>{activeRiders}</b><span>Riders active</span></div>
          <div className="gx-pulse-metric"><b>{pendingProducts}</b><span>Awaiting approval</span></div>
          <div className="gx-pulse-metric"><b>{openTickets}</b><span>Open tickets</span></div>
        </div>
      </div>

      <div className="gx-section-title">Overview</div>
      <div className="gx-kpi-grid">
        <Link to="/users" className="gx-kpi-card">
          <div className="gx-kpi-top"><span className="gx-kpi-icon" style={{ background: 'var(--primary-tint)' }}>👥</span></div>
          <div className="gx-kpi-value">{stats.totalUsers ?? '—'}</div>
          <div className="gx-kpi-label">Total users</div>
        </Link>
        <Link to="/orders" className="gx-kpi-card">
          <div className="gx-kpi-top"><span className="gx-kpi-icon" style={{ background: 'var(--info-tint)' }}>📦</span></div>
          <div className="gx-kpi-value">{stats.totalOrders ?? '—'}</div>
          <div className="gx-kpi-label">Total orders</div>
        </Link>
        <Link to="/transactions" className="gx-kpi-card">
          <div className="gx-kpi-top"><span className="gx-kpi-icon" style={{ background: 'var(--accent-tint)' }}>💰</span></div>
          <div className="gx-kpi-value">Rs. {(stats.totalRevenue ?? 0).toLocaleString()}</div>
          <div className="gx-kpi-label">Revenue</div>
        </Link>
        <Link to="/products" className="gx-kpi-card">
          <div className="gx-kpi-top"><span className="gx-kpi-icon" style={{ background: 'var(--danger-tint)' }}>🛍️</span></div>
          <div className="gx-kpi-value">{pendingProducts}</div>
          <div className="gx-kpi-label">Pending products</div>
        </Link>
      </div>

      <div className="gx-section-title">Quick actions</div>
      <div className="gx-qa-row">
        <Link to="/users" className="gx-qa-chip"><span className="gx-qa-ico" style={{ background: 'var(--primary-tint)' }}>➕</span>Add user</Link>
        <Link to="/products" className="gx-qa-chip"><span className="gx-qa-ico" style={{ background: 'var(--accent-tint)' }}>🛍️</span>Approve</Link>
        <Link to="/orders" className="gx-qa-chip"><span className="gx-qa-ico" style={{ background: 'var(--info-tint)' }}>📦</span>Orders</Link>
        <Link to="/banners" className="gx-qa-chip"><span className="gx-qa-ico" style={{ background: 'var(--danger-tint)' }}>📢</span>Banner</Link>
        <Link to="/map" className="gx-qa-chip"><span className="gx-qa-ico" style={{ background: 'var(--bg-sunk)' }}>📍</span>Hub map</Link>
      </div>

      <div className="gx-section-title">
        Recent orders
        <Link to="/orders" className="gx-see-all">See all</Link>
      </div>
      <div className="gx-card gx-card-pad">
        {recentOrders.length === 0 ? (
          <p className="gx-muted" style={{ textAlign: 'center', fontSize: 13, margin: 0 }}>
            Welcome back, {adminInfo.name || 'Admin'} — no recent orders yet.
          </p>
        ) : (
          recentOrders.map((o) => (
            <div className="gx-row-item" key={o._id}>
              <div className="gx-row-avatar">{o.customer?.name?.charAt(0)?.toUpperCase() || '?'}</div>
              <div className="gx-row-body">
                <div className="gx-row-title">{o.customer?.name || 'N/A'}</div>
                <div className="gx-row-sub gx-mono">{o.orderNumber || `#${o._id?.slice(-6)}`} · {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ''}</div>
              </div>
              <div className="gx-row-end">
                <div className="gx-row-amount">Rs. {o.payment?.amount || 0}</div>
                <div style={{ marginTop: 4 }}>
                  <span className={`gx-pill gx-pill-${STATUS_PILL[o.status] || 'muted'}`}><span className="gx-pill-dot" />{o.status?.replace(/_/g, ' ')}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
};

export default Dashboard;