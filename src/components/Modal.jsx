import React from 'react';

/**
 * Shared slide-up modal — used for every add/edit/detail dialog
 * across the app instead of react-bootstrap's <Modal>.
 *
 * Usage:
 *   <Modal isOpen={open} onClose={() => setOpen(false)} title="Edit user" footer={<>...</>}>
 *     ...form fields...
 *   </Modal>
 */
const Modal = ({ isOpen, onClose, title, footer, children }) => {
  return (
    <>
      <div className={`gx-scrim ${isOpen ? 'show' : ''}`} onClick={onClose} />
      <div className={`gx-modal ${isOpen ? 'show' : ''}`} aria-hidden={!isOpen}>
        <div className="gx-modal-head">
          <h3>{title}</h3>
          <button className="gx-modal-close" onClick={onClose} aria-label="Close">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M1 1l13 13M14 1L1 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="gx-modal-body">{children}</div>
        {footer && <div className="gx-modal-foot">{footer}</div>}
      </div>
    </>
  );
};

export default Modal;
