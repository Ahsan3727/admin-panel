import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    // Primary stats — required for the KPI grid.
    api.get('/admin/dashboard').then(({ data }) => setStats(data)).catch(() => {});

    // Supplementary data for the "live hub status" strip + recent orders list.
    // Each call reuses the same endpoint its own page already relies on, and
    // fails silently so a missing endpoint never breaks the dashboard.
    api.get('/admin/orders').then(({ data }) => {
      setActiveOrders(data.filter((o) => ['confirmed', 'packing', 'out_for_delivery'].includes(o.status)).length);
      setRecentOrders(
        [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4)
      );
    }).catch(() => {});

    api.get('/admin/riders').then(({ data }) => setActiveRiders(data.filter((r) => r.isActive).length)).catch(() => {});
    api.get('/admin/products/pending').then(({ data }) => setPendingProducts(data.length)).catch(() => {});
    api.get('/admin/tickets').then(({ data }) => setOpenTickets((data.tickets || []).filter((t) => t.status === 'open').length)).catch(() => {});
  }, []);

  return (
    <>
      <div className="gx-pulse-strip">
        <div className="gx-pulse-row">
          <span className="gx-pulse-dot" />
          <span className="gx-pulse-label">Live hub status</span>
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
                <div className="gx-row-sub gx-mono">#{o._id?.slice(-6)} · {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ''}</div>
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
