import React from 'react';
import { Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ isOpen, onToggle, onLogout }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const menuItems = [
    { path: '/banners', icon: '📢', label: 'Banners' },
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/users', icon: '👥', label: 'User Management' },
    { path: '/map', icon: '📍', label: 'Hub Map' },
    { path: '/orders', icon: '📦', label: 'Orders' },
    { path: '/products-catalog', icon: '📦', label: 'Product Catalog' },
    { path: '/products', icon: '🛍️', label: 'Products' },
    { path: '/transactions', icon: '💰', label: 'Transactions' },
    { path: '/reports', icon: '📈', label: 'Reports' },
    { path: '/settings', icon: '⚙️', label: 'Settings' },
    { path: '/tickets', icon: '🎫', label: 'Support Tickets' },

  ];

  if (!isOpen) return null;

  return (
    <div 
      className="bg-dark text-white position-fixed h-100" 
      style={{ 
        width: '250px', 
        top: 0, 
        left: 0, 
        overflowY: 'auto',
        zIndex: 1000,
        transition: 'transform 0.3s ease',
      }}
    >
      {/* Brand */}
      <div className="p-3 text-center border-bottom border-secondary">
        <h4 className="mb-0">🏪 Groxo Admin</h4>
        <small className="text-muted">Management Panel</small>
      </div>

      {/* Navigation */}
      <Nav className="flex-column p-3">
        {menuItems.map((item) => (
          <Nav.Link
            key={item.path}
            as={Link}
            to={item.path}
            className={`text-white mb-1 rounded ${
              currentPath === item.path || currentPath.startsWith(item.path + '/') 
                ? 'bg-primary' 
                : ''
            }`}
            style={{ 
              padding: '10px 15px', 
              transition: 'all 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              if (currentPath !== item.path && !currentPath.startsWith(item.path + '/')) {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (currentPath !== item.path && !currentPath.startsWith(item.path + '/')) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span className="me-2">{item.icon}</span>
            {item.label}
            {currentPath === item.path && (
              <span 
                className="ms-auto" 
                style={{ fontSize: '8px', color: '#fff' }}
              >
                ●
              </span>
            )}
          </Nav.Link>
        ))}
      </Nav>

      {/* Logout Button */}
      <div className="position-absolute bottom-0 w-100 p-3 border-top border-secondary">
        <button 
          className="btn btn-outline-light w-100"
          onClick={onLogout}
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;