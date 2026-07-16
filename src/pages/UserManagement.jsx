import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Modal, Form } from 'react-bootstrap';
import api from '../services/api';
import { toast } from 'react-toastify';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', role: 'customer', isActive: true,
    address: { street: '', city: '', state: '', zip: '' },
    vehicle: { type: '', plateNumber: '', color: '' },
    storeName: '', businessLicense: ''
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = roleFilter !== 'all' ? { role: roleFilter } : {};
      const { data } = await api.get('/admin/users', { params });
      setUsers(data);
    } catch (err) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setForm(prev => ({ ...prev, address: { ...prev.address, [field]: value } }));
    } else if (name.startsWith('vehicle.')) {
      const field = name.split('.')[1];
      setForm(prev => ({ ...prev, vehicle: { ...prev.vehicle, [field]: value } }));
    } else if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const resetForm = () => {
    setForm({
      name: '', email: '', phone: '', password: '', role: 'customer', isActive: true,
      address: { street: '', city: '', state: '', zip: '' },
      vehicle: { type: '', plateNumber: '', color: '' },
      storeName: '', businessLicense: ''
    });
  };

  const openCreateModal = () => {
    setEditingUser(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      role: user.role || 'customer',
      isActive: user.isActive !== undefined ? user.isActive : true,
      address: user.address || { street: '', city: '', state: '', zip: '' },
      vehicle: user.vehicle || { type: '', plateNumber: '', color: '' },
      storeName: user.storeName || '',
      businessLicense: user.businessLicense || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (editingUser) {
        if (!payload.password) delete payload.password;
        await api.put(`/admin/users/${editingUser._id}`, payload);
        toast.success('User updated');
      } else {
        await api.post('/admin/users', payload);
        toast.success('User created');
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user permanently?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const roleBadge = (role) => {
    const colors = { customer: 'primary', rider: 'success', wholesaler: 'warning', admin: 'danger' };
    return <Badge bg={colors[role] || 'secondary'}>{role}</Badge>;
  };

  return (
    <Container fluid>
      <Row className="mb-3 align-items-center">
        <Col>
          <h4>User Management</h4>
        </Col>
        <Col xs="auto">
          <Button variant="primary" onClick={openCreateModal}>+ Add User</Button>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <Row className="mb-3">
            <Col md={3}>
              <Form.Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="all">All Roles</option>
                <option value="customer">Customers</option>
                <option value="rider">Riders</option>
                <option value="wholesaler">Wholesalers</option>
              </Form.Select>
            </Col>
          </Row>

          {loading ? (
            <div className="text-center py-4">Loading users...</div>
          ) : (
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={6} className="text-center">No users found</td></tr>
                ) : (
                  users.map(user => (
                    <tr key={user._id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.phone}</td>
                      <td>{roleBadge(user.role)}</td>
                      <td>
                        <Badge bg={user.isActive ? 'success' : 'secondary'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>
                        <Button variant="outline-primary" size="sm" className="me-1" onClick={() => openEditModal(user)}>Edit</Button>
                        <Button variant="outline-danger" size="sm" onClick={() => handleDelete(user._id)}>Delete</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{editingUser ? 'Edit User' : 'Add New User'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Name *</Form.Label>
                  <Form.Control name="name" value={form.name} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control name="email" type="email" value={form.email} onChange={handleChange} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone *</Form.Label>
                  <Form.Control name="phone" value={form.phone} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Password {editingUser ? '(leave blank to keep)' : '*'}</Form.Label>
                  <Form.Control name="password" type="password" value={form.password} onChange={handleChange} required={!editingUser} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Role</Form.Label>
                  <Form.Select name="role" value={form.role} onChange={handleChange}>
                    <option value="customer">Customer</option>
                    <option value="rider">Rider</option>
                    <option value="wholesaler">Wholesaler</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6} className="d-flex align-items-center">
                <Form.Check type="switch" label="Active" name="isActive" checked={form.isActive} onChange={handleChange} />
              </Col>
            </Row>

            {form.role === 'customer' && (
              <>
                <h6>Customer Address</h6>
                <Row>
                  <Col md={6}><Form.Group className="mb-3"><Form.Label>Street</Form.Label><Form.Control name="address.street" value={form.address.street} onChange={handleChange} /></Form.Group></Col>
                  <Col md={6}><Form.Group className="mb-3"><Form.Label>City</Form.Label><Form.Control name="address.city" value={form.address.city} onChange={handleChange} /></Form.Group></Col>
                </Row>
                <Row>
                  <Col md={6}><Form.Group className="mb-3"><Form.Label>State</Form.Label><Form.Control name="address.state" value={form.address.state} onChange={handleChange} /></Form.Group></Col>
                  <Col md={6}><Form.Group className="mb-3"><Form.Label>ZIP</Form.Label><Form.Control name="address.zip" value={form.address.zip} onChange={handleChange} /></Form.Group></Col>
                </Row>
              </>
            )}

            {form.role === 'rider' && (
              <>
                <h6>Vehicle Details</h6>
                <Row>
                  <Col md={4}><Form.Group className="mb-3"><Form.Label>Type</Form.Label><Form.Control name="vehicle.type" value={form.vehicle.type} onChange={handleChange} /></Form.Group></Col>
                  <Col md={4}><Form.Group className="mb-3"><Form.Label>Plate Number</Form.Label><Form.Control name="vehicle.plateNumber" value={form.vehicle.plateNumber} onChange={handleChange} /></Form.Group></Col>
                  <Col md={4}><Form.Group className="mb-3"><Form.Label>Color</Form.Label><Form.Control name="vehicle.color" value={form.vehicle.color} onChange={handleChange} /></Form.Group></Col>
                </Row>
              </>
            )}

            {form.role === 'wholesaler' && (
              <>
                <h6>Business Details</h6>
                <Row>
                  <Col md={6}><Form.Group className="mb-3"><Form.Label>Store Name</Form.Label><Form.Control name="storeName" value={form.storeName} onChange={handleChange} /></Form.Group></Col>
                  <Col md={6}><Form.Group className="mb-3"><Form.Label>Business License</Form.Label><Form.Control name="businessLicense" value={form.businessLicense} onChange={handleChange} /></Form.Group></Col>
                </Row>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">{editingUser ? 'Save Changes' : 'Create User'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default UserManagement;