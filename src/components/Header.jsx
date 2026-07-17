import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Mobile app bar: hamburger (opens the drawer) — title/eyebrow — avatar (→ settings).
 * Replaces the old react-bootstrap <Navbar>.
 */
const Header = ({ title, eyebrow, onMenuClick }) => {
  const navigate = useNavigate();
  const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');
  const initial = (adminInfo.name || 'A').charAt(0).toUpperCase();

  return (
    <header className="gx-appbar">
      <button className="gx-icon-btn" onClick={onMenuClick} aria-label="Open menu">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      <div className="gx-appbar-title">
        <span className="gx-eyebrow">{eyebrow || 'Groxo'}</span>
        <h1>{title}</h1>
      </div>

      <button
        className="gx-icon-btn gx-avatar-btn"
        onClick={() => navigate('/settings')}
        aria-label="Admin profile"
      >
        {initial}
      </button>
    </header>
  );
};

export default Header;
