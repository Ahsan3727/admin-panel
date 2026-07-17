import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// Kept temporarily: pages not yet converted to the new design still use
// react-bootstrap components. Safe to keep — none of our new `gx-` classes
// collide with Bootstrap's names. Remove this once every page is done.
import 'bootstrap/dist/css/bootstrap.min.css';

// Layout Components
import Sidebar from './components/Sidebar';       // side drawer
import Header from './components/Header';         // app bar
import BottomTabBar from './components/BottomTabBar';
import MoreSheet from './components/MoreSheet';

// Nav config
import { getPageMeta } from './config/navigation';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import HubMap from './pages/HubMap';
import OrderManagement from './pages/OrderManagement';
import ProductApprovals from './pages/ProductApprovals';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import SupportTickets from './pages/SupportTickets';
import Banners from './pages/Banners';
import ProductCatalog from './pages/ProductCatalog';

// --------------------------------------------------------------------
// ProtectedRoute – must be defined BEFORE any component that uses it
// --------------------------------------------------------------------
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// --------------------------------------------------------------------
// Main App Layout — mobile app shell: app bar, drawer, bottom tab bar,
// "more" sheet. Replaces the old permanent-sidebar desktop layout.
// --------------------------------------------------------------------
const AppLayout = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminInfo');
    navigate('/login');
  };

  const { title, eyebrow } = getPageMeta(location.pathname);

  return (
    <div className="gx-app-shell">
      <Header
        title={title}
        eyebrow={eyebrow}
        onMenuClick={() => setDrawerOpen(true)}
      />

      <main className="gx-view">{children}</main>

      <BottomTabBar
        currentPath={location.pathname}
        moreOpen={moreOpen}
        onMoreClick={() => setMoreOpen((v) => !v)}
      />

      <Sidebar
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLogout={handleLogout}
        currentPath={location.pathname}
      />

      <MoreSheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  );
};

// --------------------------------------------------------------------
// Main App Component
// --------------------------------------------------------------------
function App() {
  return (
    <>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes with the mobile app shell */}
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout><Dashboard /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <AppLayout><Dashboard /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute>
            <AppLayout><UserManagement /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/map" element={
          <ProtectedRoute>
            <AppLayout><HubMap /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/orders" element={
          <ProtectedRoute>
            <AppLayout><OrderManagement /></AppLayout>
          </ProtectedRoute>
        } />
        {/* Products now hosts Approvals + Catalog as tabs on one screen
            (see ProductApprovals.jsx when we get to that page's turn) */}
        <Route path="/products" element={
          <ProtectedRoute>
            <AppLayout><ProductApprovals /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/products-catalog" element={
          <ProtectedRoute>
            <AppLayout><ProductCatalog /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/transactions" element={
          <ProtectedRoute>
            <AppLayout><Transactions /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute>
            <AppLayout><Reports /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <AppLayout><Settings /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/tickets" element={
          <ProtectedRoute>
            <AppLayout><SupportTickets /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/banners" element={
          <ProtectedRoute>
            <AppLayout><Banners /></AppLayout>
          </ProtectedRoute>
        } />

        {/* Catch all – redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastContainer
        position="bottom-center"
        autoClose={2200}
        hideProgressBar
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable={false}
        pauseOnHover
        closeButton={false}
      />
    </>
  );
}

export default App;
