import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';

// Layout Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';

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
import Banners from './pages/Banners';   // ✅ newly added
import ProductCatalog from './pages/ProductCatalog';

// Services
import api from './services/api';

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
// Main App Layout (sidebar + header)
// --------------------------------------------------------------------
const AppLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminInfo');
    navigate('/login');
  };

  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/': return 'Dashboard';
      case '/dashboard': return 'Dashboard';
      case '/users': return 'User Management';
      case '/map': return 'Hub Map';
      case '/orders': return 'Order Management';
      case '/products': return 'Product Approvals';
      case '/transactions': return 'Transactions';
      case '/reports': return 'Reports';
      case '/settings': return 'Settings';
      case '/tickets': return 'Support Tickets';
      case '/banners': return 'Banners';         // ✅ new title
      default: return 'Groxo Admin';
    }
  };

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onLogout={handleLogout}
        currentPath={location.pathname}
      />
      <div
        className="flex-grow-1 d-flex flex-column"
        style={{ marginLeft: sidebarOpen ? '250px' : '0', transition: 'margin-left 0.3s' }}
      >
        <Header title={getPageTitle()} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-grow-1 p-4" style={{ backgroundColor: '#f8f9fa' }}>
          {children}
        </main>
      </div>
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

        {/* Protected routes with layout */}
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
        <Route path="/products" element={
          <ProtectedRoute>
            <AppLayout><ProductApprovals /></AppLayout>
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
        <Route path="/products-catalog" element={<ProductCatalog />} />

        {/* Catch all – redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </>
  );
}

export default App;