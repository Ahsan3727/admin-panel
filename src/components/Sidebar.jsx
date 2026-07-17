import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NAV_ITEMS } from '../config/navigation';

/**
 * Off-canvas nav drawer — replaces the old permanent 250px sidebar.
 * Opened from the hamburger button in the app bar (Header.jsx).
 */
const Sidebar = ({ isOpen, onClose, onLogout, currentPath }) => {
  const navigate = useNavigate();

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const go = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      <div className={`gx-scrim ${isOpen ? 'show' : ''}`} onClick={onClose} />
      <aside className={`gx-drawer ${isOpen ? 'show' : ''}`} aria-hidden={!isOpen}>
        <div className="gx-drawer-head">
          <div className="gx-brand-mark">🌿</div>
          <div>
            <div className="gx-brand-name">Groxo Admin</div>
            <div className="gx-brand-sub">Hub Management</div>
          </div>
        </div>

        <nav className="gx-drawer-list">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              className={`gx-drawer-item ${currentPath === item.path ? 'active' : ''}`}
              onClick={() => go(item.path)}
            >
              <span className="gx-di-ico">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <button className="gx-drawer-logout" onClick={onLogout}>
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
            <path d="M9 5H6a1.5 1.5 0 00-1.5 1.5v11A1.5 1.5 0 006 19h3M16 15l4-4-4-4M20 11H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Log out
        </button>
      </aside>
    </>
  );
};

export default Sidebar;
