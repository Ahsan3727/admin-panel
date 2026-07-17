import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MORE_ITEMS } from '../config/navigation';

/**
 * Bottom sheet triggered by the "More" tab — quick access to the
 * routes that don't fit directly on the tab bar.
 */
const MoreSheet = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const go = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      <div className={`gx-scrim ${isOpen ? 'show' : ''}`} onClick={onClose} />
      <div className={`gx-sheet ${isOpen ? 'show' : ''}`} aria-hidden={!isOpen}>
        <div className="gx-sheet-grabber" />
        <div className="gx-sheet-title">More tools</div>
        <div className="gx-sheet-grid">
          {MORE_ITEMS.map((item) => (
            <button key={item.path} className="gx-sheet-item" onClick={() => go(item.path)}>
              <span className="gx-si-ico" style={{ background: 'var(--primary-tint)' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default MoreSheet;
