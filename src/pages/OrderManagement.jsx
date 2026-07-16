import React, { useState, useEffect } from 'react';
import {
  Container, Row, Col, Card, Table, Button, Badge,
  Modal, Form, Spinner,
} from 'react-bootstrap';
import api from '../services/api';
import { toast } from 'react-toastify';

const statusColors = {
  pending: 'secondary',
  confirmed: 'info',
  packing: 'primary',
  ready_for_pickup: 'warning',
  out_for_delivery: 'orange',
  delivered: 'success',
  cancelled: 'danger',
  disputed: 'dark',
};

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [riders, setRiders] = useState([]);
  const [assignRiderId, setAssignRiderId] = useState('');
  const [settlingAll, setSettlingAll] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const { data } = await api.get(`/admin/orders${params}`);
      setOrders(data);
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchRiders = async () => {
    try {
      const { data } = await api.get('/admin/riders');
      setRiders(data);
    } catch (error) {
      console.log('Could not fetch riders');
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchRiders();
  }, [statusFilter]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/admin/orders/${orderId}`, { status: newStatus });
      toast.success(`Order ${newStatus}`);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Update failed');
    }
  };

  const assignRider = async () => {
    if (!assignRiderId) return;
    try {
      await api.put(`/orders/${selectedOrder._id}/assign`, { riderId: assignRiderId });
      toast.success('Rider assigned');
      setShowModal(false);
      fetchOrders();
    } catch (error) {
      toast.error('Assignment failed');
    }
  };

  const openDetailModal = (order) => {
    setSelectedOrder(order);
    setAssignRiderId(order.rider?._id || '');
    setShowModal(true);
  };

  // Bulk Settlement
  const settleAllCOD = async () => {
    if (!window.confirm('Mark ALL unsettled COD orders (all riders) as settled?')) return;
    setSettlingAll(true);
    try {
      const { data } = await api.put('/admin/orders/settle-all', {});
      toast.success(data.message);
      fetchOrders();
    } catch (error) {
      const msg = error.response?.data?.message || 'Bulk settlement failed';
      toast.error(msg);
    } finally {
      setSettlingAll(false);
    }
  };

  // Pay wholesaler group
  const markGroupPaid = async (orderId, groupIndex) => {
    try {
      await api.put(`/admin/orders/${orderId}/pay-wholesaler-group`, { groupIndex });
      toast.success('Wholesaler marked as paid');
      setShowModal(false);
      fetchOrders();
    } catch (error) {
      toast.error('Failed to mark wholesaler as paid');
    }
  };

  return (
    <Container fluid>
      <Row className="mb-3 align-items-center">
        <Col>
          <h4>📦 Order Management</h4>
        </Col>
        <Col md={3}>
          <Form.Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Orders</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="packing">Packing</option>
            <option value="ready_for_pickup">Ready for Pickup</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </Form.Select>
        </Col>
        <Col md="auto">
          <Button
            variant="success"
            onClick={settleAllCOD}
            disabled={settlingAll}
          >
            {settlingAll ? <Spinner size="sm" animation="border" /> : '💵 Settle All COD'}
          </Button>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body>
          {loading ? (
            <div className="text-center py-4">Loading orders...</div>
          ) : (
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Wholesaler(s)</th>
                  <th>Rider</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={8} className="text-center">No orders found</td></tr>
                ) : (
                  orders.map(order => (
                    <tr key={order._id}>
                      <td><small>#{order._id?.slice(-6)}</small></td>
                      <td>{order.customer?.name || 'N/A'}</td>
                      <td>
                        {order.wholesalerGroups?.length > 0
                          ? order.wholesalerGroups.map(g => g.storeName || g.wholesaler?.name).join(', ')
                          : (order.wholesaler?.storeName || order.wholesaler?.name || 'N/A')}
                      </td>
                      <td>{order.rider?.name || 'Unassigned'}</td>
                      <td>Rs. {order.payment?.amount || 0}</td>
                      <td>
                        <Badge bg={statusColors[order.status] || 'secondary'}>
                          {order.status?.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td><small>{new Date(order.createdAt).toLocaleDateString()}</small></td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-1"
                          onClick={() => openDetailModal(order)}
                        >
                          View
                        </Button>
                        {order.status === 'pending' && (
                          <>
                            <Button
                              variant="success"
                              size="sm"
                              className="me-1"
                              onClick={() => updateStatus(order._id, 'confirmed')}
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => updateStatus(order._id, 'cancelled')}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                        {order.status === 'out_for_delivery' && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => updateStatus(order._id, 'delivered')}
                          >
                            Mark Delivered
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Order Detail Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Order #{selectedOrder?._id?.slice(-6)}</Modal.Title>
        </Modal.Header>
        {selectedOrder && (
          <Modal.Body>
  <Row className="mb-3">
    <Col md={6}>
      <strong>Customer:</strong> {selectedOrder.customer?.name}<br />
      <strong>Phone:</strong> {selectedOrder.customer?.phone}<br />
      <strong>Status:</strong>{' '}
      <Badge bg={statusColors[selectedOrder.status]}>
        {selectedOrder.status?.replace(/_/g, ' ')}
      </Badge>
    </Col>
    <Col md={6}>
      <strong>Rider:</strong> {selectedOrder.rider?.name || 'Unassigned'}<br />
      <strong>Amount:</strong> Rs. {selectedOrder.payment?.amount}
    </Col>
  </Row>

  {/* ---- Wholesaler Info (New or Old) ---- */}
  {selectedOrder.wholesalerGroups?.length > 0 ? (
    <>
      <h6>🛍️ Pickup Stops</h6>
      {selectedOrder.wholesalerGroups.map((group, idx) => (
        <div key={idx} className="p-2 mb-2 border rounded">
          <Row className="align-items-center">
            <Col md={4}>
              <strong>{group.storeName || group.wholesaler?.name || 'Wholesaler'}</strong>
            </Col>
            <Col md={3}>
              <Badge bg={group.status === 'ready_for_pickup' ? 'success' : 'warning'}>
                {group.status}
              </Badge>
              {group.paid && <Badge bg="info" className="ms-1">Paid</Badge>}
            </Col>
            <Col md={5}>
              {!group.paid && (
                <Button
                  variant="warning"
                  size="sm"
                  onClick={() => markGroupPaid(selectedOrder._id, idx)}
                >
                  Mark Paid
                </Button>
              )}
            </Col>
          </Row>
          <Table size="sm" className="mt-2">
            <thead><tr><th>Product</th><th>Qty</th><th>Price</th></tr></thead>
            <tbody>
              {group.items?.map((item, i) => (
                <tr key={i}>
                  <td>{item.product?.name || 'Product'}</td>
                  <td>{item.quantity}</td>
                  <td>Rs. {item.price}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      ))}
    </>
  ) : (
    /* Old single‑wholesaler order */
    <>
      <Row className="mb-2">
        <Col md={6}>
          <strong>Wholesaler:</strong>{' '}
          {selectedOrder.wholesaler?.storeName || selectedOrder.wholesaler?.name || 'N/A'}
        </Col>
      </Row>
      <h6>Items</h6>
      <Table size="sm">
        <thead><tr><th>Product</th><th>Qty</th><th>Price</th></tr></thead>
        <tbody>
          {selectedOrder.items?.map((item, i) => (
            <tr key={i}>
              <td>{item.product?.name || 'Product'}</td>
              <td>{item.quantity}</td>
              <td>Rs. {item.price}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  )}

  <h6 className="mt-3">Timeline</h6>
  {selectedOrder.timeline?.map((t, i) => (
    <div key={i} className="mb-1">
      <small>
        {new Date(t.timestamp).toLocaleString()} – {t.status} {t.note && `(${t.note})`}
      </small>
    </div>
  ))}

  <h6 className="mt-3">Assign Rider</h6>
  <Row className="align-items-end">
    <Col md={8}>
      <Form.Select
        value={assignRiderId}
        onChange={(e) => setAssignRiderId(e.target.value)}
      >
        <option value="">Select Rider</option>
        {riders.map(r => (
          <option key={r._id} value={r._id}>
            {r.name} ({r.vehicle?.type || 'Vehicle'})
          </option>
        ))}
      </Form.Select>
    </Col>
    <Col md={4}>
      <Button variant="primary" onClick={assignRider}>
        Assign
      </Button>
    </Col>
  </Row>
</Modal.Body>
        )}
      </Modal>
    </Container>
  );
};

export default OrderManagement;