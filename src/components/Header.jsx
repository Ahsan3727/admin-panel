import React from 'react';
import { Navbar, Container } from 'react-bootstrap';

const Header = ({ title, onToggleSidebar }) => {
  const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');

  return (
    <Navbar bg="white" className="shadow-sm border-bottom" sticky="top">
      <Container fluid>
        <div className="d-flex align-items-center">
          <button 
            className="btn btn-outline-secondary me-3"
            onClick={onToggleSidebar}
          >
            ☰
          </button>
          <h5 className="mb-0">{title}</h5>
        </div>
        
        <div className="d-flex align-items-center">
          <span className="me-3 text-muted">
            👤 {adminInfo.name || 'Admin'}
          </span>
          <div 
            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
            style={{ width: '40px', height: '40px' }}
          >
            {(adminInfo.name || 'A').charAt(0).toUpperCase()}
          </div>
        </div>
      </Container>
    </Navbar>
  );
};

export default Header;