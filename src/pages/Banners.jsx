import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Modal, Form } from 'react-bootstrap';
import api from '../services/api';
import { toast } from 'react-toastify';

const Banners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [form, setForm] = useState({ imageUrl: '', link: '', isActive: true, order: 0 });

  const fetchBanners = async () => {
    try {
      const { data } = await api.get('/admin/banners');
      setBanners(data);
    } catch (err) { toast.error('Failed to load banners'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBanners(); }, []);

  const handleOpenModal = (banner = null) => {
    if (banner) {
      setEditingBanner(banner);
      setForm({ imageUrl: banner.imageUrl, link: banner.link, isActive: banner.isActive, order: banner.order });
    } else {
      setEditingBanner(null);
      setForm({ imageUrl: '', link: '', isActive: true, order: 0 });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingBanner) {
        await api.put(`/admin/banners/${editingBanner._id}`, form);
        toast.success('Banner updated');
      } else {
        await api.post('/admin/banners', form);
        toast.success('Banner created');
      }
      setShowModal(false);
      fetchBanners();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this banner?')) {
      await api.delete(`/admin/banners/${id}`);
      toast.success('Banner deleted');
      fetchBanners();
    }
  };

  return (
    <Container fluid>
      <Row className="mb-3">
        <Col><h4>📢 Banners</h4></Col>
        <Col xs="auto"><Button variant="primary" onClick={() => handleOpenModal()}>+ Add Banner</Button></Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body>
          <Table striped hover responsive>
            <thead><tr><th>Image</th><th>Link</th><th>Status</th><th>Order</th><th>Actions</th></tr></thead>
            <tbody>
              {banners.map(b => (
                <tr key={b._id}>
                  <td><img src={b.imageUrl} alt="" height="40" /></td>
                  <td>{b.link || '—'}</td>
                  <td><Badge bg={b.isActive ? 'success' : 'secondary'}>{b.isActive ? 'Active' : 'Inactive'}</Badge></td>
                  <td>{b.order}</td>
                  <td>
                    <Button size="sm" variant="outline-primary" className="me-1" onClick={() => handleOpenModal(b)}>Edit</Button>
                    <Button size="sm" variant="outline-danger" onClick={() => handleDelete(b._id)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton><Modal.Title>{editingBanner ? 'Edit Banner' : 'Add Banner'}</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Image URL *</Form.Label>
              <Form.Control value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Link (optional)</Form.Label>
              <Form.Control value={form.link} onChange={e => setForm({...form, link: e.target.value})} />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Order</Form.Label>
                  <Form.Control type="number" value={form.order} onChange={e => setForm({...form, order: parseInt(e.target.value)})} />
                </Form.Group>
              </Col>
              <Col md={6} className="d-flex align-items-center">
                <Form.Check type="switch" label="Active" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">{editingBanner ? 'Update' : 'Create'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default Banners;