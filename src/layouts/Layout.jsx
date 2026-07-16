import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../context/AuthContext';
import {
  FaTachometerAlt, FaUsers, FaShoppingCart, FaBoxOpen,
  FaMoneyBillWave, FaChartBar, FaCog, FaHeadset, FaMapMarkedAlt
} from 'react-icons/fa';
import './Layout.css';

const Layout = () => {
  const { admin, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="admin-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Groxo Admin</h2>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard"><FaTachometerAlt /> <span>Dashboard</span></NavLink>
          <NavLink to="/hub-map"><FaMapMarkedAlt /> <span>Hub Map</span></NavLink>
          <NavLink to="/users"><FaUsers /> <span>Users</span></NavLink>
          <NavLink to="/orders"><FaShoppingCart /> <span>Orders</span></NavLink>
          <NavLink to="/products"><FaBoxOpen /> <span>Products</span></NavLink>
          <NavLink to="/transactions"><FaMoneyBillWave /> <span>Transactions</span></NavLink>
          <NavLink to="/reports"><FaChartBar /> <span>Reports</span></NavLink>
          <NavLink to="/settings"><FaCog /> <span>Settings</span></NavLink>
          <NavLink to="/support"><FaHeadset /> <span>Support</span></NavLink>
        </nav>
        <div className="sidebar-footer">
          <span>{admin?.name || 'Admin'}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </aside>
      <main className="main-content">
        <header className="top-header">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <h1>Admin Panel</h1>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
