import React, { useState, useEffect } from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../services/api';

const Dashboard = () => {
  const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const { data } = await api.get('/admin/dashboard');
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers || '--',
      icon: '👥',
      color: '#4e73df',
      link: '/users'
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders || '--',
      icon: '📦',
      color: '#1cc88a',
      link: '/orders'
    },
    {
      title: 'Revenue',
      value: stats.totalRevenue ? `₹${stats.totalRevenue}` : '--',
      icon: '💰',
      color: '#f6c23e',
      link: '/transactions'
    },
  ];

  return (
    <div>
      <div className="mb-4">
        <h2 className="fw-bold">Dashboard</h2>
        <p className="text-muted">Welcome back, {adminInfo.name || 'Admin'}! Here's what's happening today.</p>
      </div>

      <Row>
        {statCards.map((card, index) => (
          <Col md={4} key={index} className="mb-3">
            <Link to={card.link} className="text-decoration-none">
              <Card 
                className="shadow-sm h-100 border-0" 
                style={{ 
                  borderLeft: `4px solid ${card.color}`,
                  transition: 'transform 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <p className="text-muted mb-1">{card.title}</p>
                      <h3 className="fw-bold mb-0">{card.value}</h3>
                    </div>
                    <span style={{ fontSize: '2rem' }}>{card.icon}</span>
                  </div>
                </Card.Body>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>

      {/* Quick Actions */}
      <Card className="shadow-sm mt-4 border-0">
        <Card.Body>
          <h5 className="fw-bold mb-3">Quick Actions</h5>
          <div className="d-flex gap-3">
            <Link to="/users" className="btn btn-primary">
              👥 Manage Users
            </Link>
            <Link to="/users" className="btn btn-success">
              ➕ Add New User
            </Link>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Dashboard;