import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SECONDARY_ROUTES } from '../config/navigation';

/**
 * Fixed bottom tab bar: Dashboard / Orders / Products (center FAB) / Users / More.
 * "More" opens the bottom sheet instead of navigating directly.
 */
const BottomTabBar = ({ currentPath, onMoreClick, moreOpen }) => {
  const navigate = useNavigate();
  const isMoreActive = moreOpen || SECONDARY_ROUTES.includes(currentPath);

  const isActive = (path) => currentPath === path;

  return (
    <nav className="gx-tabbar">
      <button
        className={`gx-tab ${isActive('/dashboard') ? 'active' : ''}`}
        onClick={() => navigate('/dashboard')}
      >
        <svg viewBox="0 0 24 24" fill="none"><path d="M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z" fill="currentColor" /></svg>
        <span>Home</span>
      </button>

      <button
        className={`gx-tab ${isActive('/orders') ? 'active' : ''}`}
        onClick={() => navigate('/orders')}
      >
        <svg viewBox="0 0 24 24" fill="none"><path d="M4 8l8-4 8 4-8 4-8-4zm0 0v8l8 4m0-8v8m0-8l8-4v8l-8 4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" /></svg>
        <span>Orders</span>
      </button>

      <button
        className={`gx-tab gx-tab-center ${isActive('/products-catalog') ? 'active' : ''}`}
        onClick={() => navigate('/products-catalog')}
      >
        <span className="gx-tab-fab">
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        </span>
        <span>Catalog</span>
      </button>

      <button
        className={`gx-tab ${isActive('/users') ? 'active' : ''}`}
        onClick={() => navigate('/users')}
      >
        <svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" /><path d="M3.5 20c.7-3.4 3-5.4 5.5-5.4s4.8 2 5.5 5.4M16 9.2c1.4.3 2.5 1.5 2.8 3M15 4.3c1.9.3 3.4 1.9 3.6 3.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
        <span>Users</span>
      </button>

      <button
        className={`gx-tab ${isMoreActive ? 'active' : ''}`}
        onClick={onMoreClick}
      >
        <svg viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="19" cy="12" r="1.6" fill="currentColor" /></svg>
        <span>More</span>
      </button>
    </nav>
  );
};

export default BottomTabBar;